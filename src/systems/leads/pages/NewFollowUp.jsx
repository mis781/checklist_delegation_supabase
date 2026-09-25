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
  Building2,
  FileText,
} from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import { getUOMs, getCreditDays, getCreditLimits, getFollowUpDraft, getCompanies, saveCompanies } from "../utils/storageManager"
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

function CompanyCombobox({
  value,
  onChange,
  onSelectCompany,
  companies = [],
  placeholder = "Search or select company name...",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Sync typed search term with value if closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || "")
    }
  }, [value, isOpen])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredCompanies = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim()
    if (!term) return companies
    return companies.filter((c) => {
      const name = (c.name || "").toLowerCase()
      const city = (c.city || "").toLowerCase()
      const state = (c.state || "").toLowerCase()
      const contact = (c.salesPerson || "").toLowerCase()
      const leadNo = (c.existingLeadNo || "").toLowerCase()
      return (
        name.includes(term) ||
        city.includes(term) ||
        state.includes(term) ||
        contact.includes(term) ||
        leadNo.includes(term)
      )
    })
  }, [companies, searchTerm])

  const handleSelect = (company) => {
    setSearchTerm(company.name)
    onChange(company.name)
    onSelectCompany(company)
    setIsOpen(false)
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    onChange(val)
    if (!isOpen) setIsOpen(true)
    const exact = companies.find(
      (c) => c.name.toLowerCase().trim() === val.toLowerCase().trim()
    )
    if (exact) {
      onSelectCompany(exact)
    }
  }

  const handleClear = () => {
    setSearchTerm("")
    onChange("")
    onSelectCompany(null)
    if (inputRef.current) inputRef.current.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Building2
          size={16}
          className="absolute left-3 text-gray-400 dark:text-slate-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-9 pr-16 py-2.5 text-sm bg-white dark:bg-slate-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
            disabled
              ? "bg-gray-100 dark:bg-slate-800/50 text-gray-500 cursor-not-allowed border-gray-200 dark:border-slate-700"
              : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600"
          }`}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-md transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!disabled) setIsOpen((prev) => !prev)
            }}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-md transition-colors cursor-pointer"
            title="Toggle dropdown"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-64 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 flex items-center justify-between">
            <span>Companies ({filteredCompanies.length})</span>
            <span className="text-[10px] font-normal text-gray-400">Type to filter or click to select</span>
          </div>
          <div className="overflow-y-auto max-h-56 divide-y divide-gray-100 dark:divide-slate-700/50">
            {filteredCompanies.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 dark:text-slate-400">
                No companies found matching "{searchTerm}"
              </div>
            ) : (
              filteredCompanies.map((c) => {
                const isSelected = value && c.name.toLowerCase() === value.toLowerCase()
                return (
                  <button
                    key={c.id || c.name}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-semibold"
                        : "hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold text-gray-900 dark:text-white">
                          {c.name}
                        </span>
                        {c.existingLeadNo && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                            {c.existingLeadNo}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                        {c.city && <span>{c.city}</span>}
                        {c.state && <span>• {c.state}</span>}
                        {c.division && <span>• {c.division}</span>}
                        {c.nob && <span>• {c.nob}</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                  </button>
                )
              })
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

  // Company Name selection states (for combobox type + dropdown)
  const [companyName, setCompanyName] = useState(companyContext?.name || "")
  const [selectedCompany, setSelectedCompany] = useState(companyContext || null)
  const [companiesList, setCompaniesList] = useState([])

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

  const loadCompanies = async () => {
    try {
      let masterCompanies = []
      try {
        const live = await mockApi.fetchCompanies()
        if (live && live.length > 0) {
          masterCompanies = live
          saveCompanies(live)
        }
      } catch (e) {
        console.warn("Falling back to local company storage", e)
      }
      if (!masterCompanies || masterCompanies.length === 0) {
        masterCompanies = getCompanies() || []
      }

      // Also fetch active leads so if a company already has a lead, we know its leadNo
      let leadsMap = {}
      try {
        const { data: leadsData } = await supabase
          .from("leads")
          .select("id, lead_number, company_name, state, city, division, nob, address, gst, salesperson_name, assigned_to")
          .in("status", ["pending", "in_progress", "quotation_sent"])
        if (Array.isArray(leadsData)) {
          leadsData.forEach(ld => {
            if (ld.company_name) {
              const key = ld.company_name.toLowerCase().trim()
              if (!leadsMap[key]) {
                leadsMap[key] = ld
              }
            }
          })
        }
      } catch (err) {
        console.warn("Could not fetch active leads for company mapping", err)
      }

      // Merge companies
      const formatted = masterCompanies.map(c => {
        const trimmedName = (c.name || "").trim()
        const activeLead = leadsMap[trimmedName.toLowerCase()]
        return {
          id: c.id,
          name: trimmedName,
          state: c.state || activeLead?.state || "",
          city: c.city || activeLead?.city || "",
          division: c.division || activeLead?.division || "",
          nob: c.nob || activeLead?.nob || "",
          address: c.address || activeLead?.address || "",
          gst: c.gst || c.consignorGSTIN || activeLead?.gst || "",
          contactPersons: c.contactPersons || [],
          phone: c.phone || c.phoneNumber || c.contactPersons?.[0]?.number || "",
          salesPerson: c.contactPersons?.[0]?.name || c.salesPerson || activeLead?.salesperson_name || activeLead?.assigned_to || "",
          existingLeadNo: activeLead?.lead_number || null,
          leadId: activeLead?.id || null
        }
      }).filter(c => !!c.name)

      // Include active leads whose company may not be in Company Master yet
      const existingNames = new Set(formatted.map(c => c.name.toLowerCase()))
      Object.values(leadsMap).forEach(ld => {
        if (ld.company_name && !existingNames.has(ld.company_name.toLowerCase())) {
          formatted.push({
            id: ld.id,
            name: ld.company_name.trim(),
            state: ld.state || "",
            city: ld.city || "",
            division: ld.division || "",
            nob: ld.nob || "",
            address: ld.address || "",
            gst: ld.gst || "",
            contactPersons: [],
            phone: "",
            salesPerson: ld.salesperson_name || ld.assigned_to || "",
            existingLeadNo: ld.lead_number,
            leadId: ld.id
          })
          existingNames.add(ld.company_name.toLowerCase())
        }
      })

      formatted.sort((a, b) => a.name.localeCompare(b.name))
      setCompaniesList(formatted)
      return formatted
    } catch (err) {
      console.error("Error loading companies list for follow-up:", err)
      return []
    }
  }

  const handleSelectCompany = async (company) => {
    if (!company) {
      setSelectedCompany(null)
      setCompanyName("")
      setEnquiryState("")
      setNob("")
      setCity("")
      setDivision("")
      setFormData(prev => ({
        ...prev,
        leadNo: "",
        billingAddress: "",
        shippingAddress: "",
        gst: "",
      }))
      return
    }

    setSelectedCompany(company)
    setCompanyName(company.name)

    // Prefill company details immediately
    if (company.state) setEnquiryState(company.state)
    if (company.nob) setNob(company.nob)
    if (company.city) setCity(company.city)
    if (company.division) setDivision(company.division)

    setFormData(prev => ({
      ...prev,
      billingAddress: company.address || prev.billingAddress || "",
      shippingAddress: company.address || prev.shippingAddress || "",
      gst: company.gst || prev.gst || "",
    }))

    if (company.existingLeadNo) {
      setFormData(prev => ({
        ...prev,
        leadNo: company.existingLeadNo,
      }))
      const localDraft = getFollowUpDraft(company.existingLeadNo)
      if (localDraft) applyDraft(localDraft, company.existingLeadNo)
      mockApi.getFollowUpDraft(company.existingLeadNo).then(dbDraft => {
        if (dbDraft) applyDraft(dbDraft, company.existingLeadNo)
      }).catch(() => {})
    } else {
      try {
        setFormData(prev => ({ ...prev, leadNo: "Generating..." }))
        const previewNo = await mockApi.generateLeadNumber()
        setFormData(prev => ({ ...prev, leadNo: previewNo }))
        const localDraft = getFollowUpDraft(previewNo)
        if (localDraft) applyDraft(localDraft, previewNo)
        mockApi.getFollowUpDraft(previewNo).then(dbDraft => {
          if (dbDraft) applyDraft(dbDraft, previewNo)
        }).catch(() => {})
      } catch (err) {
        console.error("Error previewing lead number:", err)
      }
    }
  }

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

    if (draft.companyName) setCompanyName(draft.companyName)
    if (draft.selectedCompany) setSelectedCompany(draft.selectedCompany)

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
    // Fetch dropdown data and companies list when component mounts
    fetchDropdownData()
    loadCompanies().then((loaded) => {
      if (companyContext) {
        setCompanyName(companyContext.name || "")
        setSelectedCompany(companyContext)
      } else if (leadNo) {
        mockApi.fetchLeadByNumber(leadNo).then((result) => {
          if (result.success && result.lead) {
            const compName = result.lead.company_name || ""
            if (compName) {
              setCompanyName(compName)
              const found = loaded.find(c => c.name.toLowerCase() === compName.toLowerCase())
              if (found) {
                setSelectedCompany(found)
              } else {
                setSelectedCompany({
                  name: compName,
                  state: result.lead.state || "",
                  city: result.lead.city || "",
                  division: result.lead.division || "",
                  nob: result.lead.nob || "",
                  address: result.lead.address || "",
                  gst: result.lead.gst || "",
                  salesPerson: result.lead.salesperson_name || result.lead.assigned_to || "",
                  existingLeadNo: result.lead.lead_number,
                })
              }
            }
          }
        }).catch((e) => console.warn(e))
      }
    })

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
    if ((companyContext || selectedCompany) && formData.leadNo === "Generating...") {
      showNotification("Still generating the lead number, please wait a moment.", "error")
      return
    }

    const finalLeadNo = formData.leadNo || leadNo
    if (!finalLeadNo) {
      showNotification("Cannot save draft: Please select a company or lead number first.", "error")
      return
    }

    setIsSavingDraft(true)
    try {
      const effectiveDraftStatus = enquiryStatus || ""

      const draftData = {
        leadNo: finalLeadNo,
        companyName,
        selectedCompany,
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
        companyContext: companyContext || selectedCompany || null
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

    if ((companyContext || selectedCompany) && formData.leadNo === "Generating...") {
      showNotification("Still generating the lead number, please wait a moment.", "error")
      return
    }

    if (!formData.leadNo && !companyName) {
      showNotification("Please select a company first.", "error")
      return
    }

    setIsSubmitting(true)

    try {
      let finalLeadNo = formData.leadNo;

      const targetCompany = (selectedCompany && !selectedCompany.existingLeadNo)
        ? selectedCompany
        : (companyContext || (!selectedCompany && companyName ? {
            name: companyName,
            state: enquiryState,
            city: city,
            nob: nob,
            division: division,
            address: formData.billingAddress,
            gst: formData.gst
          } : null));

      if (targetCompany) {
        const leadResult = await mockApi.createEnquiryLead(targetCompany, currentUser?.username, finalLeadNo);
        if (leadResult.success) {
          finalLeadNo = leadResult.leadNumber;
        } else {
          throw new Error("Failed to create enquiry lead.");
        }
      }

      const currentDate = new Date()
      const formattedDate = formatDate(currentDate)

      if (!enquiryStatus) {
        showNotification("Please select an Enquiry Received Status (Make Quotation, Follow up Received, or Not Interested).", "error")
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

        // Items will be added on the Create Quotation form directly
        for (let i = 0; i < 5; i++) {
          rowData.push("", "0") // Empty name and 0 quantity
        }

        // Pad to reach column AB (index 27)
        while (rowData.length < 27) {
          rowData.push("")
        }

        // Column AB (index 27): (Leads Tracking Status removed)
        rowData.push("")
        rowData.push("") // Column AC
        rowData.push("0") // Column AD: Total quantity

      } else if (effectiveEnquiryStatus === "not-interested") {
        // Pad columns F-K and then V-X with empty values
        rowData.push("", "", "", "", "", "", "", "", "")
      }

      console.log("Row Data to be submitted:", rowData)

      const finalCompanyName = companyName || selectedCompany?.name || companyContext?.name || ""
      const finalContactPerson = selectedCompany?.contactPersons?.[0]?.name || selectedCompany?.salesPerson || ""
      const finalContactNumber = selectedCompany?.phone || selectedCompany?.contactPersons?.[0]?.number || ""

      // Send the data
      const result = await mockApi.submitFollowUp({
        ...formData,
        companyName: finalCompanyName,
        contactPerson: finalContactPerson,
        nextCallDateTime: formData.nextCallDate ? (formData.nextCallTime ? `${formData.nextCallDate}T${formData.nextCallTime}` : formData.nextCallDate) : "",
        leadNo: finalLeadNo,
        enquiryStatus: effectiveEnquiryStatus,
        notInterestedReason: formData.notInterestedReason || "",
        enquiryState,
        nob,
        city,
        division,
        items: [], // Quotation items are configured on the Quotation page itself
        salesPerson: currentUser?.username || "",
        assigned_to: currentUser?.username || "",
        receiverName: currentUser?.username || "",
        attachment: formData.attachment,
        attachmentLocation: formData.attachmentLocation || null,
        rowData
      })

      if (result.success) {
        window.dispatchEvent(new CustomEvent("leads-updated"))
        if (effectiveEnquiryStatus === "yes") {
          showNotification("Opening Create Quotation form...", "success")
          const leadPayload = {
            leadNo: finalLeadNo,
            companyName: finalCompanyName,
            nob: nob || selectedCompany?.nob || "",
            division: division || selectedCompany?.division || "",
            state: enquiryState || selectedCompany?.state || "",
            city: city || selectedCompany?.city || "",
            billingAddress: formData.billingAddress || selectedCompany?.address || "",
            shippingAddress: formData.shippingAddress || selectedCompany?.address || "",
            contactName: finalContactPerson,
            contactPerson: finalContactPerson,
            contactNo: finalContactNumber,
            contactNumber: finalContactNumber,
            gst: formData.gst || selectedCompany?.gst || "",
            freightType: formData.freightType || "",
            paymentTerms: formData.paymentTerms || "",
            customPaymentTerms: formData.customPaymentTerms || "",
            advanceAmount: formData.advanceAmount || "",
            items: []
          }
          navigate(`/dashboard/leads/quotation?leadNo=${encodeURIComponent(finalLeadNo)}&tab=create`, {
            state: { leadNo: finalLeadNo, openCreate: true, leadData: leadPayload }
          })
        } else {
          showNotification("Follow-up recorded successfully", "success")
          navigate("/dashboard/leads/followup-tracker")
        }
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

      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-gray-150 dark:border-slate-800 shadow-sm">
        <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100 dark:border-slate-800 rounded-t-2xl sm:rounded-t-3xl bg-white dark:bg-slate-900">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Follow-Up Form Details</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Record details of the follow-up call
            {leadId && <span className="font-bold text-blue-600 dark:text-blue-400"> for Lead #{leadId}</span>}
          </p>
        </div>

        {hasDraft && (
          <div className="mx-4 sm:mx-6 md:mx-8 mt-4 sm:mt-6 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
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
          <div className="p-4 sm:p-6 md:p-8 space-y-6">
            {/* Company Selection & Lead No. Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <CompanyCombobox
                  value={companyName}
                  onChange={(val) => setCompanyName(val)}
                  onSelectCompany={handleSelectCompany}
                  companies={companiesList}
                  placeholder="Type to search or select company..."
                  disabled={!!companyContext}
                />
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  Type company name or pick from dropdown to auto-fill details.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="leadNo" className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                  Lead No.
                </label>
                <input
                  id="leadNo"
                  className={`w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-200 font-mono text-sm`}
                  placeholder="Auto-assigned upon company select"
                  value={formData.leadNo}
                  onChange={handleChange}
                  required
                  readOnly
                />
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {selectedCompany?.existingLeadNo ? "Active lead linked with this company" : "Auto-generated lead number"}
                </p>
              </div>
            </div>

            {/* Prefilled Company Details Card */}
            {(selectedCompany || companyContext || enquiryState || nob || city || division || formData.gst) && (
              <div className="p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 rounded-xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-sky-100 dark:border-sky-900/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
                    <Building2 size={15} />
                    <span>Company Details (Auto-Prefilled)</span>
                  </div>
                  {companyName && (
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300 truncate max-w-xs">
                      {companyName}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400 font-medium">State</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate block">{enquiryState || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400 font-medium">City</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate block">{city || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400 font-medium">Division</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate block">{division || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400 font-medium">Nature of Business</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate block">{nob || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400 font-medium">GSTIN</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate block">{formData.gst || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400 font-medium">Contact Person</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate block">
                      {selectedCompany?.contactPersons?.[0]?.name || selectedCompany?.salesPerson || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                <option value="Email">Email</option>
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
                    Follow up Received
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
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-3 animate-in fade-in duration-200">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    Quotation Form Will Open Next
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400/90 leading-relaxed">
                    Clicking <strong>Make Quotation</strong> below will log this follow-up call and immediately open the Create Quotation form with prefilled firm details, where you can select and add quotation items, rates, and GST.
                  </p>
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
          <div className="p-4 sm:p-6 md:p-8 border-t border-gray-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-2xl sm:rounded-b-3xl">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto h-11 px-5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isSavingDraft}
                className="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 px-5 border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold text-xs uppercase tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <BookmarkCheck size={16} />
                {isSavingDraft ? "Saving Draft..." : "Save Draft"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSavingDraft}
                className="w-full sm:w-auto h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? (enquiryStatus === "yes" ? "Opening Quotation..." : "Saving Follow-Up...")
                  : (enquiryStatus === "expected" ? "Submit Follow-Up" : enquiryStatus === "not-interested" ? "Submit (Not Interested)" : "Make Quotation")}
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
