import { useState, useContext, useEffect, useRef, useMemo } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import {
  PhoneCall,
  ArrowLeft,
  Trash2 as Trash2Icon,
  BookmarkCheck,
  ChevronDown,
  Search,
  Check,
  Plus,
  X,
  Boxes,
} from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import { getUOMs, getCreditDays, getCreditLimits, getFollowUpDraft } from "../utils/storageManager"
import LeadAttachmentUpload from "../components/LeadAttachmentUpload"
import LocationPermissionModal from "../../../components/LocationPermissionModal"
import supabase from "../../../SupabaseClient"

function ItemNameCombobox({
  value,
  onChange,
  onSelectOption,
  options = [],
  placeholder = "Select or search Finished Goods...",
  required = false,
  id,
  isOpen = false,
  onToggle,
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [openUp, setOpenUp] = useState(false)
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  const handleToggle = (open) => {
    if (onToggle) onToggle(open)
  }

  // Extract unique categories for quick filter chips
  const categories = useMemo(() => {
    const cats = new Set()
    options.forEach((opt) => {
      if (opt.category && String(opt.category).trim()) {
        cats.add(String(opt.category).trim())
      }
    })
    return ["All", ...Array.from(cats).sort()]
  }, [options])

  // Smart flip direction based on viewport clearance
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = 360
      if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
        setOpenUp(true)
      } else {
        setOpenUp(false)
      }
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleToggle(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleToggle(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    let list = options
    if (selectedCategory !== "All") {
      list = list.filter(
        (opt) => String(opt.category || "").toLowerCase() === selectedCategory.toLowerCase()
      )
    }
    const q = (searchTerm || "").toLowerCase().trim()
    if (!q) return list
    const tokens = q.split(/\s+/).filter(Boolean)
    return list.filter((opt) => {
      const nameStr = String(opt.name || "").toLowerCase()
      const skuStr = String(opt.sku || "").toLowerCase()
      const catStr = String(opt.category || "").toLowerCase()
      const subCatStr = String(opt.sub_category || "").toLowerCase()
      const hsnStr = String(opt.hsn_code || opt.hsn || "").toLowerCase()
      const combined = `${nameStr} ${skuStr} ${catStr} ${subCatStr} ${hsnStr}`
      return tokens.every((t) => combined.includes(t))
    })
  }, [options, searchTerm, selectedCategory])

  const handleSelect = (fg) => {
    onSelectOption(fg)
    handleToggle(false)
    setSearchTerm("")
  }

  const handleSelectCustom = () => {
    if (searchTerm.trim()) {
      onChange(searchTerm.trim())
      handleToggle(false)
      setSearchTerm("")
    }
  }

  // Highlight matching search tokens
  const highlightMatch = (text, query) => {
    if (!text || !query.trim()) return text
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const parts = String(text).split(new RegExp(`(${escaped})`, "gi"))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.trim().toLowerCase() ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Input */}
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setSearchTerm(e.target.value)
            if (!isOpen) handleToggle(true)
          }}
          onFocus={() => {
            setSearchTerm(value || "")
            handleToggle(true)
          }}
          className="w-full pl-3 pr-14 py-2 text-xs border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-white placeholder:text-gray-400 font-medium transition-all shadow-2xs"
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
                setSearchTerm("")
                onSelectOption(null)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const next = !isOpen
              handleToggle(next)
              if (next) setSearchTerm(value || "")
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
            tabIndex={-1}
            title="Toggle dropdown"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            openUp ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 z-[1000] w-[min(calc(100vw-36px),540px)] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col`}
          style={{ maxHeight: "380px" }}
        >
          {/* Header with Search & Counter */}
          <div className="p-3 bg-gray-50/95 dark:bg-slate-800/95 border-b border-gray-150 dark:border-slate-700/80 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={13} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, SKU, category or HSN..."
                  className="w-full pl-7 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shrink-0">
                {filtered.length} {filtered.length === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Quick Category Chips */}
            {categories.length > 2 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer border ${
                      selectedCategory === cat
                        ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                        : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List of Finished Goods */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-slate-800/60 p-1.5 max-h-64">
            {searchTerm.trim() && !filtered.some((f) => (f.name || "").toLowerCase() === searchTerm.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={handleSelectCustom}
                className="w-full text-left p-2.5 mb-1.5 rounded-xl bg-sky-50/90 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/80 border border-sky-200 dark:border-sky-800/70 text-sky-900 dark:text-sky-200 transition-colors flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-sky-200/70 dark:bg-sky-800 text-sky-700 dark:text-sky-200">
                    <Plus size={13} />
                  </div>
                  <span className="text-xs font-semibold truncate">
                    Use custom item: <span className="font-bold underline">"{searchTerm.trim()}"</span>
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 tracking-wider shrink-0 bg-sky-100 dark:bg-sky-900/80 px-2 py-0.5 rounded-md border border-sky-300/60 dark:border-sky-700/60">
                  Custom
                </span>
              </button>
            )}

            {filtered.length > 0 ? (
              filtered.map((fg) => {
                const isSelected = value && value.trim().toLowerCase() === (fg.name || "").trim().toLowerCase()
                return (
                  <button
                    key={fg.id ? `fg-${fg.id}` : `fg-${fg.sku || ""}-${fg.name}`}
                    type="button"
                    onClick={() => handleSelect(fg)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer border-l-3 ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950 text-sky-900 dark:text-sky-200 font-semibold border-l-sky-500 border-y border-r border-sky-200 dark:border-sky-800 shadow-2xs"
                        : "bg-white dark:bg-slate-900 hover:bg-sky-50/80 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 border-l-transparent hover:border-l-sky-400"
                    }`}
                  >
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                          {highlightMatch(fg.name, searchTerm)}
                        </span>
                        {isSelected && (
                          <div className="flex items-center gap-0.5 text-sky-600 dark:text-sky-400 text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 px-1.5 py-0.2 rounded-md shrink-0">
                            <Check size={11} /> Selected
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
                        {fg.sku && (
                          <span className="font-mono font-bold text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-200/70 dark:border-indigo-800/50">
                            SKU: {highlightMatch(fg.sku, searchTerm)}
                          </span>
                        )}
                        {fg.category && (
                          <span className="text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-medium border border-gray-200/60 dark:border-slate-700/60">
                            {fg.category}
                          </span>
                        )}
                        {fg.sub_category && fg.sub_category !== fg.category && (
                          <span className="text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded text-[10px]">
                            {fg.sub_category}
                          </span>
                        )}
                        {fg.division && fg.division !== "ALL" && (
                          <span className="text-gray-400 dark:text-slate-500 text-[10px]">
                            • {fg.division}
                          </span>
                        )}
                      </div>
                    </div>

                    {(fg.hsn_code || fg.hsn) && (
                      <div className="shrink-0 flex flex-col items-end pt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-[10.5px] font-mono font-bold text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
                          HSN: {highlightMatch(fg.hsn_code || fg.hsn, searchTerm)}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="p-6 text-center flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500 text-xs">
                <Boxes size={28} className="text-gray-300 dark:text-slate-600" />
                <p className="font-medium">No matching Finished Goods found.</p>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={handleSelectCustom}
                    className="mt-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    Use "{searchTerm.trim()}" as custom item
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NewFollowUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const companyContext = location.state?.companyContext
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get("leadId")
  const leadNo = searchParams.get("leadNo")
  const { currentUser, showNotification } = useContext(AuthContext)
  const [customerFeedbackOptions, setCustomerFeedbackOptions] = useState([
    "Interested",
    "Not Interested",
    "Asked for Quotation",
    "Callback Later"
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const [enquiryStatus, setEnquiryStatus] = useState("")
  const [isCustomFeedback, setIsCustomFeedback] = useState(false)
  const [finishedGoods, setFinishedGoods] = useState([])
  const [activeComboboxId, setActiveComboboxId] = useState(null)
  const [items, setItems] = useState([{ id: "item-init-1", name: "", sku: "", uom: "", quantity: "", hsn: "" }])

  const addItem = () => {
    const MAX_ITEMS = 300
    setItems((prev) => {
      if (prev.length >= MAX_ITEMS) return prev
      const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      return [...prev, { id: uniqueId, name: "", sku: "", uom: "", quantity: "", hsn: "" }]
    })
  }

  const removeItem = (id) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === "name") {
          const match = finishedGoods.find(
            (fg) =>
              (fg.name || "").toLowerCase().trim() === (value || "").toLowerCase().trim() ||
              (fg.sku && fg.sku.toLowerCase().trim() === (value || "").toLowerCase().trim())
          )
          if (match) {
            if (match.hsn_code && !item.hsn) {
              updated.hsn = match.hsn_code
            }
            if (match.sku && !item.sku) {
              updated.sku = match.sku
            }
          }
        }
        return updated
      })
    )
  }

  const handleSelectFinishedGood = (itemId, fg) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        if (!fg) return { ...item, name: "", sku: "", hsn: "" }
        return {
          ...item,
          name: fg.name || "",
          sku: fg.sku || "",
          hsn: fg.hsn_code || fg.hsn || item.hsn || "",
        }
      })
    )
  }

  const [formData, setFormData] = useState({
    leadNo: "",
    nextAction: "",
    nextCallDate: "",
    nextCallTime: "",
    customerFeedback: "",
    notInterestedReason: "",
    interaction: "",
    billingAddress: "",
    shippingAddress: "",
    freightType: "",
    gst: "",
    creditAccess: "",
    creditDays: "",
    creditLimit: "",
    attachment: "", // New attachment uploaded for this follow-up call
    attachmentLocation: null, // Captured GPS metadata (coords, address, timestamp)
  })
  const [showLocationModal, setShowLocationModal] = useState(false)

  // Pre-filled from the lead's original details once fetched
  const [enquiryState, setEnquiryState] = useState("")
  const [nob, setNob] = useState("")
  const [city, setCity] = useState("")
  const [division, setDivision] = useState("")

  // New state for dropdown options
  const [productCategories, setProductCategories] = useState([]) // New state for product categories
  const [nobOptions, setNobOptions] = useState([])
  const [uomOptions, setUomOptions] = useState([])
  const [creditDaysOptions, setCreditDaysOptions] = useState([])
  const [creditLimitOptions, setCreditLimitOptions] = useState([])

  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchDropdowns()

      if (data) {
        setProductCategories(["Product 1", "Product 2", "Product 3"])
        setNobOptions(data.nobs || [])
        setCustomerFeedbackOptions(["Interested", "Not Interested", "Asked for Quotation", "Callback Later"])
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
      setProductCategories(["Product 1", "Product 2", "Product 3"])
      setNobOptions(["NOB 1", "NOB 2", "NOB 3"])
    }

    // UOM, Credit Days & Credit Limit are managed from the Master module
    try {
      setUomOptions(getUOMs().map(item => item.name))
      setCreditDaysOptions(getCreditDays().map(item => item.name))
      setCreditLimitOptions(getCreditLimits().map(item => item.name))
    } catch (error) {
      console.error("Error loading master dropdown data:", error)
    }

    // Fetch live Finished Goods from Inventory Master Materials
    try {
      const { data, error } = await supabase
        .from("inventory_master_material")
        .select("id, name, sku, category, sub_category, division, hsn_code, status")
        .eq("material_type", "FG")
        .order("name", { ascending: true })

      if (!error && Array.isArray(data)) {
        const activeGoods = data.filter((m) => (m.status || "Active").toLowerCase() !== "inactive")
        setFinishedGoods(activeGoods.length > 0 ? activeGoods : data)
      }
    } catch (err) {
      console.error("Error loading finished goods for quotation items:", err)
    }
  }

  const applyDraft = (draft, targetLeadNo) => {
    if (!draft) return
    setHasDraft(true)
    setDraftSavedAt(draft.savedAt || null)

    setFormData((prev) => ({
      ...prev,
      ...(draft.formData || {}),
      customerFeedback: draft.customerFeedback ?? draft.formData?.customerFeedback ?? prev.customerFeedback,
      notInterestedReason: draft.notInterestedReason ?? draft.formData?.notInterestedReason ?? prev.notInterestedReason,
      interaction: draft.interaction ?? draft.formData?.interaction ?? prev.interaction,
      nextAction: draft.nextAction ?? draft.formData?.nextAction ?? prev.nextAction,
      nextCallDate: draft.nextCallDate ?? draft.formData?.nextCallDate ?? prev.nextCallDate,
      nextCallTime: draft.nextCallTime ?? draft.formData?.nextCallTime ?? prev.nextCallTime,
      billingAddress: draft.billingAddress ?? draft.formData?.billingAddress ?? prev.billingAddress,
      shippingAddress: draft.shippingAddress ?? draft.formData?.shippingAddress ?? prev.shippingAddress,
      freightType: draft.freightType ?? draft.formData?.freightType ?? prev.freightType,
      gst: draft.gst ?? draft.formData?.gst ?? prev.gst,
      creditAccess: draft.creditAccess ?? draft.formData?.creditAccess ?? prev.creditAccess,
      creditDays: draft.creditDays ?? draft.formData?.creditDays ?? prev.creditDays,
      creditLimit: draft.creditLimit ?? draft.formData?.creditLimit ?? prev.creditLimit,
      attachment: draft.attachment ?? draft.formData?.attachment ?? prev.attachment,
      attachmentLocation: draft.attachmentLocation ?? draft.formData?.attachmentLocation ?? prev.attachmentLocation,
      leadNo: targetLeadNo || prev.leadNo,
    }))

    if (draft.customerFeedback) {
      if (customerFeedbackOptions.includes(draft.customerFeedback)) {
        setIsCustomFeedback(false)
      } else {
        setIsCustomFeedback(true)
      }
    }

    if (draft.enquiryStatus !== undefined && draft.enquiryStatus !== null) {
      setEnquiryStatus(draft.enquiryStatus)
    }
    if (draft.enquiryState) setEnquiryState(draft.enquiryState)
    if (draft.nob) setNob(draft.nob)
    if (draft.city) setCity(draft.city)
    if (draft.division) setDivision(draft.division)

    if (Array.isArray(draft.items) && draft.items.length > 0) {
      const sanitized = draft.items.map((item, idx) => ({
        id: item.id || `item-draft-${idx}-${Date.now()}`,
        name: item.name || "",
        sku: item.sku || "",
        uom: item.uom || "",
        quantity: item.quantity || "",
        hsn: item.hsn || "",
      }))
      setItems(sanitized)
    }
  }

  const handleDiscardDraft = async () => {
    const targetLeadNo = formData.leadNo || leadNo
    if (window.confirm("Are you sure you want to discard this draft? Saved draft changes will be cleared.")) {
      if (targetLeadNo) {
        await mockApi.clearFollowUpDraft(targetLeadNo)
      }
      setHasDraft(false)
      setDraftSavedAt(null)
      showNotification("Draft discarded", "info")
      window.dispatchEvent(new CustomEvent("leads-updated"))
      navigate("/dashboard/leads/followup-tracker")
    }
  }

  useEffect(() => {
    // Fetch dropdown data when component mounts
    fetchDropdownData()

    if (companyContext) {
      // Pre-fill fields from the company context (Enquiry flow)
      if (companyContext.state) setEnquiryState(companyContext.state)
      if (companyContext.nob) setNob(companyContext.nob)
      if (companyContext.city) setCity(companyContext.city)
      if (companyContext.division) setDivision(companyContext.division)
      if (companyContext.address) {
        setFormData((prevData) => ({
          ...prevData,
          billingAddress: companyContext.address,
          shippingAddress: companyContext.address,
        }))
      }
      if (companyContext.gst) {
        setFormData((prevData) => ({
          ...prevData,
          gst: companyContext.gst,
        }))
      }

      // Generate a preview lead number for this new Enquiry lead so the user
      // sees a real-looking LD-xxx value while filling the form.
      mockApi.generateLeadNumber().then((previewNo) => {
        setFormData((prevData) => ({
          ...prevData,
          leadNo: previewNo,
        }))
        const localDraft = getFollowUpDraft(previewNo)
        if (localDraft) {
          applyDraft(localDraft, previewNo)
        }
        mockApi.getFollowUpDraft(previewNo).then((dbDraft) => {
          if (dbDraft) applyDraft(dbDraft, previewNo)
        }).catch((err) => console.warn("Error checking draft from DB:", err))
      }).catch((error) => {
        console.error("Error previewing lead number:", error)
      })
    } else if (leadNo) {
      // Prepopulate lead number if available
      setFormData((prevData) => ({
        ...prevData,
        leadNo: leadNo,
      }))

      const localDraft = getFollowUpDraft(leadNo)
      if (localDraft) {
        applyDraft(localDraft, leadNo)
      }

      mockApi.getFollowUpDraft(leadNo).then((dbDraft) => {
        const draft = dbDraft || localDraft
        if (dbDraft) applyDraft(dbDraft, leadNo)

        // Pre-fill Enquiry for State / NOB / City / Division from the lead's original details
        mockApi.fetchLeadByNumber(leadNo).then((result) => {
          if (result.success && result.lead) {
            if (!draft || !draft.enquiryState) {
              if (result.lead.state) setEnquiryState(result.lead.state)
            }
            if (!draft || !draft.nob) {
              if (result.lead.nob) setNob(result.lead.nob)
            }
            if (!draft || !draft.city) {
              if (result.lead.city) setCity(result.lead.city)
            }
            if (!draft || !draft.division) {
              if (result.lead.division) setDivision(result.lead.division)
            }
          }
        }).catch((error) => {
          console.error("Error fetching lead details for pre-fill:", error)
        })
      }).catch((err) => {
        console.warn("Error fetching draft from DB:", err)
      })
    }
  }, [leadNo])

  const handleSaveDraft = async () => {
    if (companyContext && formData.leadNo === "Generating...") {
      showNotification("Still generating the lead number, please wait a moment.", "error")
      return
    }

    const finalLeadNo = formData.leadNo || leadNo
    if (!finalLeadNo) {
      showNotification("Cannot save draft: Lead number is missing.", "error")
      return
    }

    setIsSavingDraft(true)
    try {
      const effectiveDraftStatus = enquiryStatus || ""

      const draftData = {
        leadNo: finalLeadNo,
        formData,
        customerFeedback: formData.customerFeedback,
        notInterestedReason: formData.notInterestedReason || "",
        interaction: formData.interaction,
        nextAction: formData.nextAction,
        nextCallDate: formData.nextCallDate,
        nextCallTime: formData.nextCallTime,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        freightType: formData.freightType,
        gst: formData.gst,
        creditAccess: formData.creditAccess,
        creditDays: formData.creditDays,
        creditLimit: formData.creditLimit,
        attachment: formData.attachment,
        attachmentLocation: formData.attachmentLocation || null,
        enquiryStatus: effectiveDraftStatus,
        enquiryState,
        nob,
        city,
        division,
        items,
        companyContext: companyContext || null
      }

      await mockApi.saveFollowUpDraft(finalLeadNo, draftData)
      showNotification("Follow-up saved as draft. Lead remains in Pending list.", "success")
      window.dispatchEvent(new CustomEvent("leads-updated"))
      navigate("/dashboard/leads/followup-tracker")
    } catch (error) {
      console.error("Error saving draft:", error)
      showNotification("Error saving draft: " + error.message, "error")
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleCustomerFeedbackChange = (e) => {
    const feedback = typeof e === "string" ? e : e.target.value
    setFormData((prevData) => ({
      ...prevData,
      customerFeedback: feedback,
    }))
    // Decoupled: do NOT auto-select or change enquiryStatus!
  }

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }))
  }

  // The combined "Next Call Date & Time" input splits back into the
  // separate nextCallDate/nextCallTime fields the rest of the form (and the
  // saved history record) already uses.
  const handleNextCallDateTimeChange = (e) => {
    const [date, time] = e.target.value.split("T")
    setFormData((prevData) => ({
      ...prevData,
      nextCallDate: date || "",
      nextCallTime: time || "",
    }))
  }

  const calculateTotalQuantity = () => {
    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0
      return total + quantity
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Its Lead No. is only a preview until now (see the companyContext
    // effect above) — if that preview call is still in flight, make the
    // user wait for it instead of submitting against a placeholder.
    if (companyContext && formData.leadNo === "Generating...") {
      showNotification("Still generating the lead number, please wait a moment.", "error")
      return
    }

    setIsSubmitting(true)

    try {
      let finalLeadNo = formData.leadNo;

      if (companyContext) {
        // The enquiry lead itself is only created now, on Submit — not when
        // the form opened — using the same number already previewed above,
        // so the lead doesn't get raised (and its number doesn't get
        // consumed) if the user navigates away without submitting.
        const leadResult = await mockApi.createEnquiryLead(companyContext, currentUser?.username, finalLeadNo);
        if (leadResult.success) {
          finalLeadNo = leadResult.leadNumber;
        } else {
          throw new Error("Failed to create enquiry lead.");
        }
      }

      const currentDate = new Date()
      const formattedDate = formatDate(currentDate)

      if (!enquiryStatus) {
        showNotification("Please select an Enquiry Received Status (Make Quotation, Expected, or Not Interested).", "error")
        setIsSubmitting(false)
        return
      }

      const effectiveEnquiryStatus = enquiryStatus

      // Prepare base row data (columns A-E)
      const rowData = [
        formattedDate, // A: Current date
        finalLeadNo, // B: Lead Number
        formData.customerFeedback, // C: Customer feedback
        "", // D: (Lead Status removed)
        effectiveEnquiryStatus, // E: Enquiry Status
      ]

      // Handle different scenarios
      if (effectiveEnquiryStatus === "expected") {
        // Explicitly add columns F-K as empty (6 empty columns)
        rowData.push("", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "")

        // Then add columns V, W, X
        rowData.push(
          formData.nextAction, // V: Next action
          formData.nextCallDate, // W: Next call date
          formData.nextCallTime, // X: Next call time
        )
      }
      else if (effectiveEnquiryStatus === "yes") {
        // Add columns F-K
        rowData.push(
          formattedDate, // F: Enquiry Received Date (Order Received Date field removed — uses today's date)
          enquiryState, // G: Enquiry for State
          nob, // H: Project Name (NOB)
          "", // I: (Enquiry Type removed)
          "", // J: (Enquiry Approach removed)
          "", // K: Project Value (empty)
        )

        // Handle first 5 items (columns L-U)
        const first5Items = items.slice(0, 5)

        // Add first 5 items in pairs (name, quantity)
        first5Items.forEach((item) => {
          rowData.push(item.name || "") // Product category
          rowData.push(item.quantity || "0") // Quantity (0 if null/empty)
        })

        // If less than 5 items, fill remaining slots with empty values
        const remainingSlots = 5 - first5Items.length
        for (let i = 0; i < remainingSlots; i++) {
          rowData.push("", "0") // Empty name and 0 quantity
        }

        // Pad to reach column AB (index 27)
        while (rowData.length < 27) {
          rowData.push("")
        }

        // Column AB (index 27): (Leads Tracking Status removed)
        rowData.push("")

        // Handle items 6 and onwards as JSON in column AC (index 28)
        if (items.length > 5) {
          const additionalItems = items.slice(5).map(item => ({
            name: item.name || "",
            quantity: item.quantity || "0",
            hsn: item.hsn || "",
            sku: item.sku || "",
            uom: item.uom || "",
          }))
          rowData.push(JSON.stringify(additionalItems)) // Column AC
        } else {
          rowData.push("") // Empty if no additional items
        }

        // Add total quantity in column AD (index 29)
        rowData.push(calculateTotalQuantity().toString())

      } else if (effectiveEnquiryStatus === "not-interested") {
        // Pad columns F-K and then V-X with empty values
        rowData.push("", "", "", "", "", "", "", "", "")
      }

      console.log("Row Data to be submitted:", rowData)

      // Send the data
      const result = await mockApi.submitFollowUp({
        ...formData,
        nextCallDateTime: formData.nextCallDate ? (formData.nextCallTime ? `${formData.nextCallDate}T${formData.nextCallTime}` : formData.nextCallDate) : "",
        leadNo: finalLeadNo,
        enquiryStatus: effectiveEnquiryStatus,
        notInterestedReason: formData.notInterestedReason || "",
        enquiryState,
        nob,
        city,
        division,
        items,
        attachment: formData.attachment,
        attachmentLocation: formData.attachmentLocation || null,
        rowData // Keeping raw rowData for structure if needed by mockApi later, or better yet pass structured data
      })

      if (result.success) {
        showNotification("Follow-up recorded successfully", "success")
        window.dispatchEvent(new CustomEvent("leads-updated"))
        navigate("/dashboard/leads/followup-tracker")
      } else {
        showNotification("Error recording follow-up: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      showNotification("Error submitting form: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <PhoneCall size={22} />
            </div>
            Record Follow-Up Call
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Log customer interaction feedback, next call schedule, and quotation request items
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={14} /> Back to Followup Tracker
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800 shadow-sm">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-slate-800 rounded-t-3xl bg-white dark:bg-slate-900">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Follow-Up Form Details</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Record details of the follow-up call
            {leadId && <span className="font-bold text-blue-600 dark:text-blue-400"> for Lead #{leadId}</span>}
          </p>
        </div>

        {hasDraft && (
          <div className="mx-6 md:mx-8 mt-6 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                <BookmarkCheck size={16} />
              </div>
              <div className="text-xs">
                <strong className="font-bold">Draft Restored:</strong> You are currently editing saved draft data
                {draftSavedAt && (
                  <span className="text-amber-700/80 dark:text-amber-400/80 ml-1">
                    (saved on {new Date(draftSavedAt).toLocaleString()})
                  </span>
                )}
                .
              </div>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 underline cursor-pointer self-end sm:self-auto"
            >
              Discard Draft
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <label htmlFor="leadNo" className="block text-sm font-medium text-gray-700">
                Lead No.
              </label>
              <input
                id="leadNo"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${companyContext ? "bg-gray-100 text-gray-500" : ""}`}
                placeholder="LD-001"
                value={formData.leadNo}
                onChange={handleChange}
                required
                readOnly={!!companyContext}
              />
            </div>

            <div className="space-y-2">
              <LeadAttachmentUpload
                id="followup-attachment"
                label="Attachment"
                value={formData.attachment}
                locationValue={formData.attachmentLocation}
                onChange={(base64, locationMeta) => {
                  setFormData((prevData) => ({
                    ...prevData,
                    attachment: base64,
                    attachmentLocation: locationMeta
                  }))
                }}
                onClear={() => {
                  setFormData((prevData) => ({
                    ...prevData,
                    attachment: "",
                    attachmentLocation: null
                  }))
                }}
                onRequestLocationModal={() => setShowLocationModal(true)}
                buttonText="Browse file"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="customerFeedback" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                What did the customer say?
              </label>
              <select
                id="customerFeedback"
                value={isCustomFeedback ? "__other__" : formData.customerFeedback}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setIsCustomFeedback(true)
                    setFormData((prev) => ({ ...prev, customerFeedback: "" }))
                  } else {
                    setIsCustomFeedback(false)
                    handleCustomerFeedbackChange(e)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                required={!isCustomFeedback}
              >
                <option value="">Select customer feedback</option>
                {customerFeedbackOptions.map((feedback, index) => (
                  <option key={index} value={feedback}>{feedback}</option>
                ))}
                <option value="__other__">✏️ Type Manually / Other...</option>
              </select>

              {isCustomFeedback && (
                <div className="pt-1 space-y-1">
                  <input
                    type="text"
                    id="customFeedbackInput"
                    value={formData.customerFeedback}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, customerFeedback: e.target.value }))
                    }}
                    placeholder="Enter what the customer said..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                    required
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">
                    Type custom feedback above or choose a preset option from the dropdown anytime.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="interaction" className="block text-sm font-medium text-gray-700">
                Interaction
              </label>
              <select
                id="interaction"
                value={formData.interaction}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select interaction type</option>
                <option value="Call">Call</option>
                <option value="WP">WP</option>
                <option value="Visit">Visit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Enquiry Received Status</label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="yes"
                    name="enquiryStatus"
                    value="yes"
                    checked={enquiryStatus === "yes"}
                    onChange={() => setEnquiryStatus("yes")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="yes" className="text-sm text-gray-700 dark:text-slate-300">
                    Make Quotation
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="expected"
                    name="enquiryStatus"
                    value="expected"
                    checked={enquiryStatus === "expected"}
                    onChange={() => setEnquiryStatus("expected")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="expected" className="text-sm text-gray-700 dark:text-slate-300">
                    Expected
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="not-interested"
                    name="enquiryStatus"
                    value="not-interested"
                    checked={enquiryStatus === "not-interested"}
                    onChange={() => setEnquiryStatus("not-interested")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="not-interested" className="text-sm text-gray-700 dark:text-slate-300">
                    Not Interested
                  </label>
                </div>
              </div>
            </div>

            {enquiryStatus === "expected" && (
              <div className="space-y-4 border p-4 rounded-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
                <div className="space-y-2">
                  <label htmlFor="nextAction" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Next Action
                  </label>
                  <input
                    id="nextAction"
                    value={formData.nextAction}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    placeholder="Enter next action"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="nextCallDateTime" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Next Call Date & Time
                  </label>
                  <input
                    id="nextCallDateTime"
                    type="datetime-local"
                    value={formData.nextCallDate && formData.nextCallTime ? `${formData.nextCallDate}T${formData.nextCallTime}` : ""}
                    onChange={handleNextCallDateTimeChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    required
                  />
                </div>
              </div>
            )}

            {enquiryStatus === "yes" && (
              <div className="space-y-4 border p-4 rounded-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Quotation Items</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Specify products and quantities requested for this quotation</p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    disabled={items.length >= 300}
                  >
                    + Add Item ({items.length}/300)
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => {
                    const isComboboxActive = activeComboboxId === item.id
                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3.5 rounded-xl border transition-all relative ${
                          isComboboxActive
                            ? "bg-white dark:bg-slate-800 border-sky-300 dark:border-sky-600 shadow-md ring-1 ring-sky-400/30"
                            : "bg-gray-50/70 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/60"
                        }`}
                        style={{ zIndex: isComboboxActive ? 1000 : 1 }}
                      >
                        <div className="md:col-span-4 space-y-1">
                          <label htmlFor={`itemName-${item.id}`} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                            Item Name {index + 1}
                          </label>
                          <ItemNameCombobox
                            id={`itemName-${item.id}`}
                            value={item.name}
                            onChange={(val) => updateItem(item.id, "name", val)}
                            onSelectOption={(fg) => handleSelectFinishedGood(item.id, fg)}
                            options={finishedGoods}
                            placeholder="Select or type item name"
                            required
                            isOpen={isComboboxActive}
                            onToggle={(open) => setActiveComboboxId(open ? item.id : null)}
                          />
                        </div>
                      <div className="md:col-span-2 space-y-1">
                        <label htmlFor={`hsn-${item.id}`} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                          HSN Code
                        </label>
                        <input
                          id={`hsn-${item.id}`}
                          value={item.hsn || ""}
                          onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-gray-900 dark:text-white placeholder:text-gray-400"
                          placeholder="HSN Code"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label htmlFor={`uom-${item.id}`} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                          UOM
                        </label>
                        <select
                          id={`uom-${item.id}`}
                          value={item.uom}
                          onChange={(e) => updateItem(item.id, "uom", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          required
                        >
                          <option value="">Select UOM</option>
                          {uomOptions.map((uom, i) => (
                            <option key={i} value={uom}>
                              {uom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label htmlFor={`quantity-${item.id}`} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                          Quantity
                        </label>
                        <input
                          id={`quantity-${item.id}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Qty"
                          min="1"
                          required
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-center pb-1">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}

            {enquiryStatus === "not-interested" && (
              <div className="space-y-4 border p-4 rounded-xl bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 shadow-2xs animate-in fade-in duration-200">
                <div className="space-y-2">
                  <label htmlFor="notInterestedReason" className="block text-sm font-semibold text-gray-800 dark:text-slate-200">
                    Reason for Not Interested <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="notInterestedReason"
                    rows={3}
                    value={formData.notInterestedReason || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm placeholder:text-gray-400"
                    placeholder="Enter reason why the customer is not interested (e.g. Price too high, Purchased from competitor, Project postponed, No current requirement, etc.)"
                    required
                  />
                </div>
              </div>
            )}
          </div>
          <div className="p-6 md:p-8 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 rounded-b-3xl">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isSavingDraft}
                className="inline-flex items-center gap-2 px-5 py-3 border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold text-xs uppercase tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <BookmarkCheck size={16} />
                {isSavingDraft ? "Saving Draft..." : "Save Draft"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSavingDraft}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Saving Follow-Up..." : "Submit Follow-Up"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </div>
  )
}

export default NewFollowUp
