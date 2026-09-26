import { useState, useEffect, useContext, useMemo, useRef } from "react"
import { UserPlus, Plus, Trash2, Package, Search, X, ChevronDown, Check, Boxes } from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import {
  getLeadReceiverNames, saveLeadReceiverNames,
  getLeadSources, saveLeadSources,
  getNOBs, saveNOBs,
  getDivisions,
  getCompanies, saveCompany, saveCompanies,
  getUOMs, saveSubmittedLead
} from "../utils/storageManager"
import supabase from "../../../SupabaseClient"
import { generateId } from "../utils/helpers"
import LeadAttachmentUpload from "../components/LeadAttachmentUpload"
import LocationPermissionModal from "../../../components/LocationPermissionModal"
import { getCitiesForState, INDIAN_STATES } from "../data/indianStatesAndCities"

function ItemNameCombobox({
  value,
  onChange,
  onSelectOption,
  options = [],
  placeholder = "Search or enter product name...",
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
          className="w-full pl-3 pr-14 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 font-medium transition-all"
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
                  className="w-full pl-7 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400"
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
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
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
                className="w-full text-left p-2.5 mb-1.5 rounded-xl bg-blue-50/90 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800/70 text-blue-900 dark:text-blue-200 transition-colors flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-blue-200/70 dark:bg-blue-800 text-blue-700 dark:text-blue-200">
                    <Plus size={13} />
                  </div>
                  <span className="text-xs font-semibold truncate">
                    Use custom item: <span className="font-bold underline">"{searchTerm.trim()}"</span>
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider shrink-0 bg-blue-100 dark:bg-blue-900/80 px-2 py-0.5 rounded-md border border-blue-300/60 dark:border-blue-700/60">
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
                        ? "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-semibold border-l-blue-500 border-y border-r border-blue-200 dark:border-blue-800 shadow-2xs"
                        : "bg-white dark:bg-slate-900 hover:bg-blue-50/80 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 border-l-transparent hover:border-l-blue-400"
                    }`}
                  >
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                          {highlightMatch(fg.name, searchTerm)}
                        </span>
                        {isSelected && (
                          <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded-md shrink-0">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NewLead() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotification, currentUser, isAdmin, isSalesPerson } = useContext(AuthContext)
  const [receiverNames, setReceiverNames] = useState([])
  const isUserSalesPerson = isSalesPerson || (!isAdmin()) || (
    currentUser?.username && receiverNames.some(name => name?.toLowerCase() === currentUser.username.toLowerCase())
  )

  const [formData, setFormData] = useState({
    receiverName: currentUser?.username || "",
    salesType: "New Customer", // Internally set to New Customer only
    source: "",
    leadType: "", // New field (Incoming / Outgoing)
    companyName: "",
    phoneNumber: "",
    salespersonName: currentUser?.username || "",
    email: "",
    contactPersons: [{ name: "", designation: "", number: "" }], // New array for contact persons
    state: "", // New field
    city: "", // New field
    address: "", // New field
    nob: "", // New field for Nature of Business
    division: "", // New field for Division, auto-fills from Company Master
    notes: "",
    interaction: "", // New field: how this lead was interacted with (Call/Email/Visit)
    attachment: "", // New field: optional attachment, stored as base64
    attachmentLocation: null // Captured GPS metadata (coords, address, timestamp)
  })
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [leadSources, setLeadSources] = useState([])
  const [companyOptions, setCompanyOptions] = useState([]) // State for company dropdown
  const [companyDetailsMap, setCompanyDetailsMap] = useState({}) // State to store company details
  const [nextLeadNumber, setNextLeadNumber] = useState("")

  useEffect(() => {
    if (isUserSalesPerson && currentUser?.username) {
      setFormData(prev => ({
        ...prev,
        receiverName: currentUser.username,
        salespersonName: currentUser.username
      }))
    }
  }, [isUserSalesPerson, currentUser])

  const [designationOptions, setDesignationOptions] = useState([])
  const [nobOptions, setNobOptions] = useState([]) // New state for nature of business dropdown
  const [divisionOptions, setDivisionOptions] = useState([]) // New state for division dropdown
  const [stateOptions, setStateOptions] = useState(INDIAN_STATES)
  const [isOtherCity, setIsOtherCity] = useState(false)
  const [customCity, setCustomCity] = useState("")

  // Product / Enquiry items state
  const [finishedGoods, setFinishedGoods] = useState([])
  const [uomOptions, setUomOptions] = useState(["Nos", "Kg", "Mtr", "Pkt", "Set", "Bag", "Ltr", "Box", "Roll", "Pcs", "Sqft"])
  const [items, setItems] = useState([
    { id: "item-1", name: "", uom: "Nos", quantity: "", hsn: "", sku: "" }
  ])
  const [activeComboboxId, setActiveComboboxId] = useState(null)

  const addItem = () => {
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    setItems((prev) => [
      ...prev,
      { id: uniqueId, name: "", uom: "Nos", quantity: "", hsn: "", sku: "" }
    ])
  }

  const removeItem = (id) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        const updated = { ...it, [field]: value }
        if (field === "name") {
          const matched = finishedGoods.find(
            (fg) => (fg.name || "").toLowerCase().trim() === (value || "").toLowerCase().trim()
          )
          if (matched) {
            if (matched.hsn_code) updated.hsn = matched.hsn_code
            if (matched.sku) updated.sku = matched.sku
          }
        }
        return updated
      })
    )
  }

  useEffect(() => {
    const fetchFg = async () => {
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
        console.warn("Could not load finished goods for lead:", err)
      }
    }
    fetchFg()

    try {
      const uoms = getUOMs().map((u) => (typeof u === "string" ? u : u.name)).filter(Boolean)
      if (uoms && uoms.length > 0) setUomOptions(uoms)
    } catch (e) {
      console.warn("Error loading UOMs:", e)
    }
  }, [])

  const cityOptions = useMemo(() => {
    return getCitiesForState(formData.state)
  }, [formData.state])



  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Fetch dropdown data when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch dropdown values from DROPDOWNSHEET
        await fetchDropdownData()
        // Fetch company data for dropdown and auto-fill
        await fetchCompanyData()
      } catch (error) {
        console.error("Error during initial data fetch:", error)
      }
    }

    fetchInitialData()
  }, [])

  // Function to fetch dropdown data from DROPDOWNSHEET & live masters
  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchDropdowns()

      if (data) {
        setStateOptions(data.states || [])
        setDesignationOptions(data.designations || [])
        if (data.receivers && data.receivers.length > 0) {
          setReceiverNames(data.receivers)
        }
        if (data.sources && data.sources.length > 0) setLeadSources(data.sources.map(s => typeof s === "string" ? s : s.name))
        if (data.nobs && data.nobs.length > 0) setNobOptions(data.nobs.map(n => typeof n === "string" ? n : n.name))
        if (data.divisions && data.divisions.length > 0) setDivisionOptions(data.divisions.map(d => typeof d === "string" ? d : d.name))
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
    }

    try {
      setReceiverNames(prev => prev.length > 0 ? prev : getLeadReceiverNames().map(item => item.name))
      setLeadSources(prev => prev.length > 0 ? prev : getLeadSources().map(item => item.name))
      setNobOptions(prev => prev.length > 0 ? prev : getNOBs().map(item => item.name))
      setDivisionOptions(prev => prev.length > 0 ? prev : getDivisions().map(item => item.name))
    } catch (error) {
      console.error("Error loading master dropdown data:", error)
    }
  }

  // Function to fetch company data live from Supabase (with fallback to local cache).
  const fetchCompanyData = async () => {
    try {
      let masterCompanies = []
      try {
        const liveCompanies = await mockApi.fetchCompanies()
        if (liveCompanies && liveCompanies.length > 0) {
          masterCompanies = liveCompanies
          saveCompanies(liveCompanies)
        }
      } catch (liveErr) {
        console.warn("Could not fetch live companies, falling back to cache:", liveErr)
      }

      if (!masterCompanies || masterCompanies.length === 0) {
        masterCompanies = getCompanies()
      }

      if (masterCompanies && masterCompanies.length > 0) {
        const companyNames = []
        const detailsMap = {}

        masterCompanies.forEach(company => {
          if (!company.name) return
          const trimmedName = company.name.trim()
          if (!companyNames.includes(trimmedName)) {
            companyNames.push(trimmedName)
          }
          detailsMap[trimmedName] = {
            id: company.id,
            vnNo: company.vnNo,
            salesPerson: company.contactPersons?.[0]?.name || company.salesPerson || "",
            phoneNumber: company.phone || company.phoneNumber || company.contactPersons?.[0]?.number || "",
            email: company.email || "",
            division: company.division || "",
            state: company.state || "",
            city: company.city || "",
            address: company.address || "",
            nob: company.nob || "",
            gst: company.gst || company.consignorGSTIN || "",
            contactPersons: company.contactPersons || []
          }
        })

        setCompanyOptions(companyNames)
        setCompanyDetailsMap(detailsMap)
      }
    } catch (error) {
      console.error("Error fetching company data:", error)
      setCompanyOptions([])
      setCompanyDetailsMap({})
    }
  }

  const handleChange = (e) => {
    const { id, value } = e.target

    if (id === 'salesType') {
      setIsOtherCity(false)
      setCustomCity("")
      setFormData(prevData => ({
        ...prevData,
        salesType: value,
        companyName: "",
        phoneNumber: "",
        salespersonName: "",
        email: "",
        division: "",
        state: "",
        city: "",
        address: "",
        nob: "",
        contactPersons: [{ name: "", designation: "", number: "" }]
      }))

      if (value === 'Existing Customer') {
        fetchCompanyData()
      }
      return
    }

    if (id === 'state') {
      const nextCities = getCitiesForState(value)
      setIsOtherCity(false)
      setCustomCity("")
      setFormData(prevData => ({
        ...prevData,
        state: value,
        city: nextCities.includes(prevData.city) ? prevData.city : ""
      }))
      return
    }

    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }))

    // Auto-fill related fields if company is selected in Existing Customer mode
    if (id === 'companyName' && value) {
      const companyDetails = companyDetailsMap[value] || {}

      // Company Master's contact persons ({name, designation, number} each)
      // pre-fill the Contact Person Details section — capped at 3 to match
      // this form's own limit.
      const companyContacts = (companyDetails.contactPersons || [])
        .filter(p => p && (p.name || p.designation || p.number))
        .slice(0, 3)
        .map(p => ({ name: p.name || "", designation: p.designation || "", number: p.number || "" }))

      setIsOtherCity(false)
      setCustomCity("")
      setFormData(prevData => ({
        ...prevData,
        companyName: value,
        phoneNumber: companyDetails.phoneNumber || companyContacts[0]?.number || "",
        salespersonName: companyDetails.salesPerson || companyContacts[0]?.name || "",
        email: companyDetails.email || "",
        division: companyDetails.division || "",
        state: companyDetails.state || "",
        city: companyDetails.city || "",
        address: companyDetails.address || "",
        nob: companyDetails.nob || "",
        contactPersons: companyContacts.length > 0
          ? companyContacts
          : [{ name: "", designation: "", number: "" }]
      }))
    } else if (id === 'companyName' && !value) {
      // Company deselected — clear out everything that was auto-filled
      // from the previous selection instead of leaving it stale.
      setFormData(prevData => ({
        ...prevData,
        companyName: "",
        phoneNumber: "",
        salespersonName: "",
        email: "",
        division: "",
        state: "",
        city: "",
        address: "",
        nob: "",
        contactPersons: [{ name: "", designation: "", number: "" }]
      }))
    }
  }

  // Function to handle change in contact person fields
  const handleContactPersonChange = (index, field, value) => {
    const updatedContactPersons = [...formData.contactPersons]
    updatedContactPersons[index] = {
      ...updatedContactPersons[index],
      [field]: value
    }

    setFormData({
      ...formData,
      contactPersons: updatedContactPersons
    })
  }

  // Function to add a new contact person section (max 3)
  const addContactPerson = () => {
    if (formData.contactPersons.length < 3) {
      setFormData({
        ...formData,
        contactPersons: [...formData.contactPersons, { name: "", designation: "", number: "" }]
      })
    }
  }

  // Function to remove a contact person section
  const removeContactPerson = (index) => {
    const updatedContactPersons = [...formData.contactPersons]
    updatedContactPersons.splice(index, 1)

    setFormData({
      ...formData,
      contactPersons: updatedContactPersons
    })
  }

  const generateLeadNumber = async () => {
    try {
      const leadNumber = await mockApi.generateLeadNumber()
      return leadNumber
    } catch (error) {
      console.error("Error generating lead number:", error)
      return "LD-001" // Default if we can't determine
    }
  }


  // Lets the Sales Person Name / Lead Source / NOB fields accept a value
  // typed fresh (not just picked from the list) — on save, anything not
  // already in that Master list gets added there automatically, the same
  // way a "New Customer" company name registers itself in Company Master.
  const addValueToNameMaster = (value, getList, saveList, prefix, noField) => {
    const trimmed = (value || "").trim()
    if (!trimmed) return

    const list = getList()
    const alreadyExists = list.some(item => item.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (alreadyExists) return

    saveList([
      ...list,
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        [noField]: `${prefix}-${String(list.length + 1).padStart(3, '0')}`,
        name: trimmed
      }
    ])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Format current date as dd/mm/yyyy
      const formattedDate = formatDate(new Date())
      const effectiveSalesPerson = (isUserSalesPerson && currentUser?.username)
        ? currentUser.username
        : (formData.receiverName || formData.salespersonName);

      const validItems = items
        .filter((it) => it.name && it.name.trim())
        .map((it) => ({
          name: it.name.trim(),
          uom: it.uom || "Nos",
          quantity: it.quantity ? Number(it.quantity) : 1,
          hsn: it.hsn || "",
          sku: it.sku || ""
        }))

      const submissionData = {
        ...formData,
        receiverName: effectiveSalesPerson,
        salespersonName: effectiveSalesPerson,
        date: formattedDate,
        items: validItems
      }

      const result = await mockApi.submitLead(submissionData)

      if (result.success) {
        saveSubmittedLead({ ...submissionData, items: validItems, leadNumber: result.leadNumber })

        // Any freshly-typed Sales Person Name / Lead Source / NOB not
        // already in its Master list gets added there now.
        addValueToNameMaster(formData.receiverName, getLeadReceiverNames, saveLeadReceiverNames, "LRN", "lrnNo")
        addValueToNameMaster(formData.source, getLeadSources, saveLeadSources, "LS", "lsNo")
        addValueToNameMaster(formData.nob, getNOBs, saveNOBs, "NOB", "nobNo")
        await fetchDropdownData()

        // "New Customer" means this company is saved to Supabase leads_companies & Company Master
        if (formData.salesType === "New Customer" && formData.companyName.trim()) {
          const companyPayload = {
            name: formData.companyName.trim(),
            gst: "",
            email: formData.email || "",
            phone: formData.phoneNumber || "",
            address: formData.address || "",
            state: formData.state || "",
            city: formData.city || "",
            nob: formData.nob || "",
            division: formData.division || "",
            contactPersons: formData.contactPersons.filter(p => p.name || p.designation || p.number),
            proof: formData.attachment || ""
          }

          try {
            await mockApi.saveCompany(companyPayload)
          } catch (cErr) {
            console.warn("Could not save company to Supabase:", cErr)
          }
          saveCompany(companyPayload)

          // Refresh so the newly-registered company is immediately
          // available as a Company Name option on this form.
          await fetchCompanyData()
        }

        showNotification("Lead created successfully", "success")
        window.dispatchEvent(new CustomEvent("companies-updated"))
        window.dispatchEvent(new CustomEvent("leads-updated"))

        // Reset form
        setIsOtherCity(false)
        setCustomCity("")
        setItems([
          { id: "item-1", name: "", uom: "Nos", quantity: "", hsn: "", sku: "" }
        ])
        setFormData({
          receiverName: isUserSalesPerson && currentUser?.username ? currentUser.username : "",
          salesType: "New Customer",
          source: "",
          leadType: "",
          companyName: "",
          phoneNumber: "",
          salespersonName: isUserSalesPerson && currentUser?.username ? currentUser.username : "",
          email: "",
          contactPersons: [{ name: "", designation: "", number: "" }],
          state: "",
          city: "",
          address: "",
          nob: "",
          division: "",
          notes: "",
          interaction: "",
          attachment: "",
          attachmentLocation: null
        })
      } else {
        showNotification("Error creating lead: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      showNotification("Error submitting form: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <UserPlus size={22} />
            </div>
            New Lead
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Register incoming or outgoing sales inquiries and customer contact information
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-gray-150 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Lead Information Form</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Please provide accurate contact and inquiry details</p>
          {nextLeadNumber && (
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1.5">
              Next Lead Number: {nextLeadNumber}
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="receiverName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Sales Person Name <span className="text-rose-500">*</span></span>
                  {isUserSalesPerson && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">(Auto-Filled)</span>
                  )}
                </label>
                {(!isAdmin() && isUserSalesPerson) ? (
                  <input
                    type="text"
                    id="receiverName"
                    value={formData.receiverName || currentUser?.username || ""}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-semibold cursor-not-allowed select-none text-sm"
                  />
                ) : (
                  <select
                    id="receiverName"
                    value={formData.receiverName || (isUserSalesPerson ? (currentUser?.username || "") : "")}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select sales person name</option>
                    {(formData.receiverName || (isUserSalesPerson ? currentUser?.username : "")) &&
                      !receiverNames.includes(formData.receiverName || currentUser?.username) && (
                      <option value={formData.receiverName || currentUser?.username}>
                        {formData.receiverName || currentUser?.username}
                      </option>
                    )}
                    {receiverNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select interaction type</option>
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Visit">Visit</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                  Lead Source
                </label>
                <select
                  id="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select lead source</option>
                  {formData.source && !leadSources.includes(formData.source) && (
                    <option value={formData.source}>{formData.source}</option>
                  )}
                  {leadSources.map((source, index) => (
                    <option key={index} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="leadType" className="block text-sm font-medium text-gray-700">
                  Lead Type
                </label>
                <select
                  id="leadType"
                  value={formData.leadType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select lead type</option>
                  <option value="Incoming">Incoming</option>
                  <option value="Outgoing">Outgoing</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                {formData.salesType === "New Customer" ? (
                  <>
                    <input
                      id="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new company name"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      New company — will be added to Company Master on save.
                    </p>
                  </>
                ) : (
                  <select
                    id="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select company</option>
                    {companyOptions.map((company, index) => (
                      <option key={index} value={company}>{company}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="division" className="block text-sm font-medium text-gray-700">
                  Division
                </label>
                <select
                  id="division"
                  value={formData.division}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select division</option>
                  {divisionOptions.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="nob" className="block text-sm font-medium text-gray-700">
                  Nature of Business (NOB)
                </label>
                <select
                  id="nob"
                  value={formData.nob}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select nature of business</option>
                  {formData.nob && !nobOptions.includes(formData.nob) && (
                    <option value={formData.nob}>{formData.nob}</option>
                  )}
                  {nobOptions.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email will auto-fill"
                // readOnly={formData.companyName !== ""}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select state</option>
                  {stateOptions.map((state, index) => (
                    <option key={index} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <select
                  id="city"
                  value={isOtherCity ? "Other" : formData.city}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "Other") {
                      setIsOtherCity(true)
                      setCustomCity("")
                      setFormData(prev => ({ ...prev, city: "" }))
                    } else {
                      setIsOtherCity(false)
                      setCustomCity("")
                      handleChange(e)
                    }
                  }}
                  disabled={!formData.state}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">{formData.state ? "Select city" : "Select state first"}</option>
                  {formData.city && !isOtherCity && !cityOptions.includes(formData.city) && (
                    <option value={formData.city}>{formData.city}</option>
                  )}
                  {cityOptions.map((city, index) => (
                    <option key={index} value={city}>{city}</option>
                  ))}
                  {formData.state && <option value="Other">Other (Enter Manually)</option>}
                </select>

                {isOtherCity && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Enter City Name</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtherCity(false)
                          setCustomCity("")
                          setFormData(prev => ({ ...prev, city: "" }))
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        ← Select from list
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customCity}
                      onChange={(e) => {
                        const val = e.target.value
                        setCustomCity(val)
                        setFormData(prev => ({ ...prev, city: val }))
                      }}
                      placeholder="Type city name"
                      className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Address Field */}
            <div className="space-y-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter complete address"
                rows="2"
              // required
              />
            </div>

            {/* Contact Person Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Contact Person Details</h3>
                {formData.contactPersons.length < 3 && (
                  <button
                    type="button"
                    onClick={addContactPerson}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add Person
                  </button>
                )}
              </div>

              {formData.contactPersons.map((person, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Person {index + 1}</h4>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeContactPerson(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        value={person.name}
                        onChange={(e) => handleContactPersonChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contact name"
                      // required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Designation</label>
                      <select
                        value={person.designation}
                        onChange={(e) => handleContactPersonChange(index, 'designation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="">Select designation</option>
                        {person.designation && !designationOptions.includes(person.designation) && (
                          <option value={person.designation}>{person.designation}</option>
                        )}
                        {designationOptions.map((designation, idx) => (
                          <option key={idx} value={designation}>{designation}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        value={person.number}
                        onChange={(e) => handleContactPersonChange(index, 'number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contact number"
                      // required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Product / Enquiry Items Section */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                      Product / Enquiry Items
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Add products or finished goods, UOM and quantities for this lead
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-gray-50/60 dark:bg-slate-900/40 space-y-3 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 inline-flex items-center justify-center text-[11px] font-black">
                          {index + 1}
                        </span>
                        Item {index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Remove this item"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Product Name (6 cols) */}
                      <div className="sm:col-span-6 space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">
                          Product Name
                        </label>
                        <ItemNameCombobox
                          id={`item-name-${item.id}`}
                          value={item.name}
                          onChange={(val) => handleItemChange(item.id, "name", val)}
                          onSelectOption={(fg) => {
                            if (fg) {
                              setItems((prev) =>
                                prev.map((it) => {
                                  if (it.id !== item.id) return it
                                  return {
                                    ...it,
                                    name: fg.name || "",
                                    sku: fg.sku || "",
                                    hsn: fg.hsn_code || fg.hsn || it.hsn || "",
                                  }
                                })
                              )
                            } else {
                              handleItemChange(item.id, "name", "")
                            }
                          }}
                          options={finishedGoods}
                          placeholder="Search or enter product name..."
                          isOpen={activeComboboxId === item.id}
                          onToggle={(open) => setActiveComboboxId(open ? item.id : null)}
                        />
                      </div>

                      {/* UOM (3 cols) */}
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">
                          UOM
                        </label>
                        <select
                          value={item.uom}
                          onChange={(e) => handleItemChange(item.id, "uom", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white cursor-pointer"
                        >
                          <option value="">Select UOM</option>
                          {uomOptions.map((u, uIdx) => (
                            <option key={uIdx} value={u}>{u}</option>
                          ))}
                          {item.uom && !uomOptions.includes(item.uom) && (
                            <option value={item.uom}>{item.uom}</option>
                          )}
                        </select>
                      </div>

                      {/* Quantity (3 cols) */}
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                          placeholder="Enter quantity"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <input
                id="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any additional information"
              />
            </div>

            <div className="space-y-2">
              <LeadAttachmentUpload
                id="new-lead-attachment"
                label="Attachment"
                value={formData.attachment}
                locationValue={formData.attachmentLocation}
                onChange={(base64, locationMeta) => {
                  setFormData(prev => ({
                    ...prev,
                    attachment: base64,
                    attachmentLocation: locationMeta
                  }))
                }}
                onClear={() => {
                  setFormData(prev => ({
                    ...prev,
                    attachment: "",
                    attachmentLocation: null
                  }))
                }}
                onRequestLocationModal={() => setShowLocationModal(true)}
                buttonText="Browse file"
              />
            </div>
          </div>
          <div className="p-4 sm:p-6 md:p-8 border-t border-gray-100 dark:border-slate-800 flex justify-end bg-gray-50/50 dark:bg-slate-900/50">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? "Saving Lead..." : "Save Lead"}
            </button>
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

export default NewLead