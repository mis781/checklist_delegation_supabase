import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  Edit,
  Trash2,
  Plus,
  Minus,
  Paperclip,
  Check,
  X,
  PhoneOutgoing,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
} from "lucide-react"
import {
  getCompanies,
  saveCompanies,
  saveCompany,
  getNOBs,
  getDivisions,
  getCompanyConversionMap,
  getCompanyStageMap,
} from "../utils/storageManager"
import { fileToBase64 } from "../utils/helpers"
import DataTable from "../components/DataTable"
import ModalAlert from "../components/ModalAlert"
import ModalForm from "../components/ModalForm"
import InfoPopover from "../components/InfoPopover"

const emptyContact = () => ({ name: "", designation: "", number: "" })

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
]

const emptyFormData = () => ({
  name: "",
  gst: "",
  email: "",
  phone: "",
  address: "",
  state: "",
  city: "",
  nob: "",
  division: "",
  status: "",
  contactPersons: [emptyContact()],
  proof: "",
})

export default function Contacts() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [conversionMap, setConversionMap] = useState(() => new Set())
  const [stageMap, setStageMap] = useState(() => ({}))
  const [activeTab, setActiveTab] = useState("converted") // "converted" | "unconverted"
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("")
  const [selectedStateFilter, setSelectedStateFilter] = useState("")
  const [selectedNobFilter, setSelectedNobFilter] = useState("")
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState("")
  const [nobOptions, setNobOptions] = useState([])
  const [divisionOptions, setDivisionOptions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
    onConfirm: () => {},
  })

  const [formData, setFormData] = useState(emptyFormData())

  const headers = [
    "Actions",
    "Status",
    activeTab === "unconverted" ? "Cancellation Stage" : "Stage",
    "Timestamp",
    "VN-NO",
    "Company Name",
    "Company GST",
    "Company Email",
    "Phone Number",
    "State",
    "City",
    "NOB",
    "Division",
    "Contact Person",
    "Proof",
    "Address",
  ]

  const refreshData = () => {
    const loaded = getCompanies()
    setCompanies(loaded)
    setConversionMap(getCompanyConversionMap())
    setStageMap(getCompanyStageMap())
  }

  useEffect(() => {
    refreshData()
    setNobOptions(getNOBs().map((n) => n.name).filter(Boolean))
    setDivisionOptions(getDivisions().map((d) => d.name).filter(Boolean))
  }, [])

  const isCompanyConverted = useCallback((company) => {
    if (company.status === "Converted") return true
    if (company.status === "Unconverted") return false
    return conversionMap.has((company.name || "").trim().toLowerCase())
  }, [conversionMap])

  // All companies annotated with conversion status & stage details
  const annotatedCompanies = useMemo(() => {
    return companies.map((c) => {
      const cKey = (c.name || "").trim().toLowerCase()
      const stageInfo = stageMap[cKey] || {
        stage: "Direct Contact",
        subStage: "No Enquiry Logged",
        reason: "Registered contact with no leads created yet",
      }
      return {
        ...c,
        isConverted: isCompanyConverted(c),
        stageDetails: stageInfo,
      }
    })
  }, [companies, isCompanyConverted, stageMap])

  const convertedCompanies = useMemo(() => {
    return annotatedCompanies.filter((c) => c.isConverted)
  }, [annotatedCompanies])

  const unconvertedCompanies = useMemo(() => {
    return annotatedCompanies.filter((c) => !c.isConverted)
  }, [annotatedCompanies])

  const tabCompanies = activeTab === "converted" ? convertedCompanies : unconvertedCompanies

  const companyOptions = useMemo(() => {
    return Array.from(new Set(tabCompanies.map((c) => c.name).filter(Boolean))).sort()
  }, [tabCompanies])

  const stateOptions = useMemo(() => {
    const fromData = Array.from(new Set(tabCompanies.map((c) => c.state).filter(Boolean))).sort()
    return fromData.length > 0 ? fromData : INDIAN_STATES
  }, [tabCompanies])

  const filteredCompanies = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase()
    return tabCompanies.filter((c) => {
      if (selectedCompanyFilter && c.name !== selectedCompanyFilter) return false
      if (selectedStateFilter && c.state !== selectedStateFilter) return false
      if (selectedNobFilter && c.nob !== selectedNobFilter) return false
      if (selectedDivisionFilter && c.division !== selectedDivisionFilter) return false

      if (!q) return true
      return (
        c.name?.toLowerCase().includes(q) ||
        c.vnNo?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.gst?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.division?.toLowerCase().includes(q) ||
        c.nob?.toLowerCase().includes(q) ||
        c.contactPersons?.some((p) => p.name?.toLowerCase().includes(q))
      )
    })
  }, [
    tabCompanies,
    searchQuery,
    selectedCompanyFilter,
    selectedStateFilter,
    selectedNobFilter,
    selectedDivisionFilter,
  ])

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedCompanyFilter) ||
    Boolean(selectedStateFilter) ||
    Boolean(selectedNobFilter) ||
    Boolean(selectedDivisionFilter)

  const handleResetFilters = () => {
    setSearchQuery("")
    setSelectedCompanyFilter("")
    setSelectedStateFilter("")
    setSelectedNobFilter("")
    setSelectedDivisionFilter("")
    setCurrentPage(1)
  }

  const sortedCompanies = useMemo(
    () => [...filteredCompanies].reverse(),
    [filteredCompanies]
  )
  const totalPages = Math.ceil(sortedCompanies.length / itemsPerPage) || 1
  const paginatedCompanies = sortedCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleAdd = () => {
    setEditingId(null)
    setFormData(emptyFormData())
    setShowModal(true)
  }

  const handleEdit = (company) => {
    setEditingId(company.id)
    setFormData({
      ...emptyFormData(),
      ...company,
      status: company.status || "",
      contactPersons:
        company.contactPersons && company.contactPersons.length > 0
          ? company.contactPersons
          : [emptyContact()],
    })
    setShowModal(true)
  }

  const handleContactChange = (index, field, value) => {
    const updated = [...formData.contactPersons]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, contactPersons: updated })
  }

  const handleAddContactPerson = () =>
    setFormData({
      ...formData,
      contactPersons: [...formData.contactPersons, emptyContact()],
    })

  const handleRemoveContactPerson = (index) => {
    const updated = formData.contactPersons.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      contactPersons: updated.length > 0 ? updated : [emptyContact()],
    })
  }

  const handleProofChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showAlert("error", "File Too Large", "Please upload an image smaller than 2MB.")
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setFormData({ ...formData, proof: base64 })
    } catch {
      showAlert("error", "Upload Failed", "Could not read the selected file. Please try again.")
    }
  }

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm })
  }

  const handleDelete = (id) => {
    showAlert(
      "confirm",
      "Delete Contact?",
      "Are you sure you want to remove this contact from records?",
      () => {
        const updated = companies.filter((c) => c.id !== id)
        saveCompanies(updated)
        refreshData()
        showAlert("success", "Deleted!", "The contact record has been removed successfully.")
      }
    )
  }

  const handleEnquiry = (company) => {
    navigate("/dashboard/leads/followup-tracker/new", {
      state: { companyContext: company },
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanContacts = formData.contactPersons.filter(
      (p) => p.name.trim() || p.designation.trim() || p.number.trim()
    )
    const finalData = {
      ...formData,
      contactPersons: cleanContacts.length > 0 ? cleanContacts : [emptyContact()],
    }

    if (editingId) {
      const updated = companies.map((c) =>
        c.id === editingId ? { ...c, ...finalData } : c
      )
      saveCompanies(updated)
      refreshData()
      showAlert("success", "Updated!", "Contact information has been updated.")
    } else {
      const existingCompany = companies.find(
        (c) => (c.name || "").trim().toLowerCase() === formData.name.trim().toLowerCase()
      )
      if (existingCompany) {
        saveCompany(finalData)
        refreshData()
        showAlert(
          "success",
          "Contact Merged!",
          `"${formData.name.trim()}" is already registered (${existingCompany.vnNo}). Its details and contact persons have been merged into the existing record.`
        )
      } else {
        saveCompany(finalData)
        refreshData()
        showAlert("success", "Saved!", "New contact has been successfully registered.")
      }
    }
    setShowModal(false)
  }

  const formatTimestamp = (isoString) => {
    if (!isoString) return "-"
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
      date.getSeconds()
    ).padStart(2, "0")}`
  }

  const contactSummaryItems = (contactPersons) =>
    (contactPersons || [])
      .filter((p) => p.name || p.designation || p.number)
      .map(
        (p) => `${p.name || "-"} | ${p.designation || "-"} | ${p.number || "-"}`
      )

  const renderStageBadge = (item) => {
    const stageDetails = item.stageDetails || {
      stage: item.isConverted ? "Converted" : "Direct Contact",
      subStage: item.isConverted ? "Order Received" : "No Enquiry Logged",
      reason: "",
    }

    const popoverItems = [
      stageDetails.stage ? `Stage: ${stageDetails.stage}` : null,
      stageDetails.subStage ? `Status: ${stageDetails.subStage}` : null,
      stageDetails.reason ? `Reason / Note: ${stageDetails.reason}` : null,
      stageDetails.leadNo ? `Lead No: ${stageDetails.leadNo}` : null,
      stageDetails.quotationNo ? `Quote No: ${stageDetails.quotationNo}` : null,
    ].filter(Boolean)

    if (item.isConverted) {
      return (
        <InfoPopover items={popoverItems} title="Stage Details">
          <div className="inline-flex flex-col items-center justify-center cursor-help">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {stageDetails.stage || "Converted"}
            </span>
            {stageDetails.subStage && stageDetails.subStage !== stageDetails.stage && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-medium mt-0.5">
                {stageDetails.subStage}
              </span>
            )}
          </div>
        </InfoPopover>
      )
    }

    // Unconverted stages styling
    const stageName = stageDetails.stage || "Direct Contact"
    const subStageName = stageDetails.subStage || ""

    let badgeTheme = {
      container: "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400",
      subtext: "text-slate-500 dark:text-slate-400",
    }

    if (stageName.includes("Quotation")) {
      badgeTheme = {
        container: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        dot: "bg-rose-500",
        subtext: "text-rose-600 dark:text-rose-400 font-medium",
      }
    } else if (stageName.includes("Follow-up")) {
      badgeTheme = {
        container: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        dot: "bg-amber-500",
        subtext: "text-amber-700 dark:text-amber-400 font-medium",
      }
    } else if (stageName.includes("Initial Lead")) {
      badgeTheme = {
        container: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        dot: "bg-sky-500",
        subtext: "text-sky-600 dark:text-sky-400 font-medium",
      }
    }

    return (
      <InfoPopover items={popoverItems} title="Cancellation / Stage Details">
        <div className="inline-flex flex-col items-center justify-center cursor-help max-w-[160px]">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${badgeTheme.container}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeTheme.dot}`}></span>
            <span className="truncate">{stageName}</span>
          </span>
          {subStageName && (
            <span className={`text-[10px] mt-0.5 truncate max-w-[150px] ${badgeTheme.subtext}`}>
              {subStageName}
            </span>
          )}
          {stageDetails.reason && (
            <span className="text-[9px] text-gray-400 dark:text-slate-500 truncate max-w-[140px] italic">
              "{stageDetails.reason}"
            </span>
          )}
        </div>
      </InfoPopover>
    )
  }

  const renderRow = (item) => {
    const contacts = item.contactPersons || []
    const primaryContact = contacts[0]
    return (
      <tr
        key={item.id}
        className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors text-center text-xs text-gray-700 dark:text-slate-300"
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleEnquiry(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            >
              <PhoneOutgoing size={12} /> Enquiry
            </button>
            <button
              type="button"
              onClick={() => handleEdit(item)}
              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
              title="Edit Contact"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Delete Contact"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {item.isConverted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Converted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Unconverted
            </span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {renderStageBadge(item)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-slate-400 font-mono text-[11px]">
          {formatTimestamp(item.timestamp)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900 dark:text-white">
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
            {item.vnNo || "-"}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900 dark:text-white text-left">
          {item.name || "-"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap uppercase font-mono text-gray-600 dark:text-slate-400">
          {item.gst || "-"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">
          {item.email || "-"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">
          {item.phone || "-"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">
          {item.state || "-"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">
          {item.city || "-"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {item.nob ? (
            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium">
              {item.nob}
            </span>
          ) : (
            "-"
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {item.division ? (
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-900/50">
              {item.division}
            </span>
          ) : (
            "-"
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <InfoPopover items={contactSummaryItems(contacts)} title="Contact Persons">
            <div className="flex flex-col items-center cursor-help">
              <span className="font-semibold text-gray-800 dark:text-slate-200">
                {primaryContact?.name || "-"}
              </span>
              {primaryContact?.designation && (
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {primaryContact.designation}
                </span>
              )}
              {contacts.length > 1 && (
                <span className="mt-0.5 px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[9px] font-black rounded border border-amber-200 dark:border-amber-800">
                  +{contacts.length - 1} more
                </span>
              )}
            </div>
          </InfoPopover>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {item.proof ? (
            <a href={item.proof} target="_blank" rel="noopener noreferrer" className="inline-block">
              <img
                src={item.proof}
                alt="Proof"
                className="w-8 h-8 object-cover rounded-lg border border-gray-200 dark:border-slate-700 mx-auto hover:scale-125 transition-transform"
              />
            </a>
          ) : (
            <span className="text-gray-300 dark:text-slate-600">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap text-left">
          {item.address ? (
            <InfoPopover items={[item.address]} title="Company Address">
              <span className="truncate max-w-[120px] block cursor-help italic text-[11px]">
                "{item.address}"
              </span>
            </InfoPopover>
          ) : (
            "-"
          )}
        </td>
      </tr>
    )
  }

  const renderCard = (item) => {
    const contacts = item.contactPersons || []
    return (
      <div
        key={item.id}
        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs space-y-3 text-xs"
      >
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                {item.vnNo}
              </span>
              {item.isConverted ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Converted
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Unconverted
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {item.name}
            </h3>
            {item.gst && (
              <p className="text-[10px] font-mono text-gray-400 uppercase mt-0.5">
                GST: {item.gst}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleEnquiry(item)}
              className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100"
              title="Raise Enquiry"
            >
              <PhoneOutgoing size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(item)}
              className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100"
              title="Edit Contact"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100"
              title="Delete Contact"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Stage / Cancellation Stage info */}
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400">
              {item.isConverted ? "Stage" : "Cancellation Stage"}
            </span>
            <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">
              {item.stageDetails?.stage || (item.isConverted ? "Converted" : "Direct Contact")}
            </span>
          </div>
          {item.stageDetails?.subStage && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Status</span>
              <span className={`font-semibold ${item.isConverted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {item.stageDetails.subStage}
              </span>
            </div>
          )}
          {item.stageDetails?.reason && (
            <div className="text-[10px] text-gray-500 dark:text-slate-400 italic pt-1 border-t border-gray-200/60 dark:border-slate-700/60">
              Reason: "{item.stageDetails.reason}"
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-gray-400 text-[10px] block uppercase">Phone</span>
            <span className="text-gray-800 dark:text-slate-200 font-medium">{item.phone || "-"}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] block uppercase">Email</span>
            <span className="text-gray-800 dark:text-slate-200 font-medium truncate block">{item.email || "-"}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] block uppercase">Location</span>
            <span className="text-gray-800 dark:text-slate-200">{item.city ? `${item.city}, ${item.state}` : item.state || "-"}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] block uppercase">Division / NOB</span>
            <span className="text-gray-800 dark:text-slate-200">{item.division || item.nob || "-"}</span>
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-gray-500 dark:text-slate-400">
              Contact: <strong>{contacts[0]?.name || "-"}</strong> ({contacts[0]?.designation || "Contact"})
            </span>
            {contacts.length > 1 && (
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded">
                +{contacts.length - 1} more
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Users size={22} />
            </div>
            Contacts
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Manage company contacts, addresses, GST, and communication details
          </p>
        </div>
      </div>

      {/* Tab Selector & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-gray-200/60 dark:border-slate-700/60 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("converted")
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "converted"
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-slate-700"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
            }`}
          >
            <CheckCircle2 size={15} className={activeTab === "converted" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"} />
            <span>Converted Clients</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "converted"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-gray-200/80 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {convertedCompanies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("unconverted")
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "unconverted"
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-slate-700"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
            }`}
          >
            <Clock size={15} className={activeTab === "unconverted" ? "text-amber-600 dark:text-amber-400" : "text-gray-400"} />
            <span>Unconverted Clients</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "unconverted"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-gray-200/80 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {unconvertedCompanies.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {activeTab === "converted" ? "Converted Clients" : "Unconverted Clients"}
            </h2>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
            {/* Search Input */}
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search clients..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white h-[34px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter by Company */}
            <select
              value={selectedCompanyFilter}
              onChange={(e) => {
                setSelectedCompanyFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[34px] cursor-pointer"
            >
              <option value="">All Companies</option>
              {companyOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Filter by State */}
            <select
              value={selectedStateFilter}
              onChange={(e) => {
                setSelectedStateFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[34px] cursor-pointer"
            >
              <option value="">All States</option>
              {stateOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Filter by Relevance / NOB */}
            <select
              value={selectedNobFilter}
              onChange={(e) => {
                setSelectedNobFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[34px] cursor-pointer"
            >
              <option value="">All Relevance</option>
              {nobOptions.map((nob) => (
                <option key={nob} value={nob}>
                  {nob}
                </option>
              ))}
            </select>

            {/* Clear Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer h-[34px]"
                title="Reset all filters"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          headers={headers}
          data={paginatedCompanies}
          renderRow={renderRow}
          renderCard={renderCard}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalResults={filteredCompanies.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Modal Alert (Confirmations & Notifications) */}
      <ModalAlert
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={() => {
          alertConfig.onConfirm()
          setAlertConfig((prev) => ({ ...prev, isOpen: false }))
        }}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal Form: Add Contact / New Contact Setup */}
      <ModalForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        title={editingId ? "Edit Contact Details" : "New Contact Setup"}
        description={
          editingId
            ? "Update company and contact information"
            : "Register a new company and contact details in the system"
        }
        submitText={editingId ? "Update Contact" : "Save Contact"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              Full Name (Company Name) *
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Acme Industries Pvt Ltd"
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              Company GST *
            </label>
            <input
              required
              type="text"
              value={formData.gst}
              onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
              placeholder="e.g. 27ABCDE1234F1Z5"
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs uppercase h-[34px]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              Company Email Address *
            </label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="info@company.com"
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              Phone Number *
            </label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              State *
            </label>
            <select
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              City *
            </label>
            <input
              required
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Mumbai"
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              NOB
            </label>
            <select
              value={formData.nob}
              onChange={(e) => setFormData({ ...formData, nob: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            >
              <option value="">Select NOB</option>
              {nobOptions.map((nob) => (
                <option key={nob} value={nob}>
                  {nob}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              Division
            </label>
            <select
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            >
              <option value="">Select Division</option>
              {divisionOptions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              Client Category / Status
            </label>
            <select
              value={formData.status || ""}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
            >
              <option value="">Auto (Based on Leads & Follow-ups)</option>
              <option value="Converted">Converted (Lead Completed / Interested / Order Received)</option>
              <option value="Unconverted">Unconverted (Not Interested / Order Not Received)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1 pt-1.5 border-t border-gray-100 dark:border-slate-800">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
            Company Address *
          </label>
          <textarea
            required
            rows="2"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Complete postal address..."
            className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] md:text-[12px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-tight">
              Contact Person Details
            </label>
            <button
              type="button"
              onClick={handleAddContactPerson}
              className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors uppercase tracking-wider"
            >
              <Plus size={12} /> Add Contact Person
            </button>
          </div>
          <div className="space-y-2">
            {formData.contactPersons.map((contact, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-gray-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700"
              >
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => handleContactChange(index, "name", e.target.value)}
                  placeholder="Contact Person Name"
                  required={index === 0}
                  className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs h-[32px]"
                />
                <input
                  type="text"
                  value={contact.designation}
                  onChange={(e) =>
                    handleContactChange(index, "designation", e.target.value)
                  }
                  placeholder="Designation (e.g. Manager)"
                  required={index === 0}
                  className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs h-[32px]"
                />
                <div className="flex gap-2 items-center">
                  <input
                    type="tel"
                    value={contact.number}
                    onChange={(e) =>
                      handleContactChange(index, "number", e.target.value)
                    }
                    placeholder="Contact Number"
                    required={index === 0}
                    className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs h-[32px]"
                  />
                  {formData.contactPersons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContactPerson(index)}
                      className="text-rose-400 hover:text-rose-600 p-1 transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-800">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 dark:text-slate-300 uppercase tracking-tight">
            Proof (Image Upload)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer group">
              <div
                className={`flex items-center justify-center gap-2 border border-dashed rounded-lg h-[34px] transition-all ${
                  formData.proof
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-600 dark:text-emerald-400"
                    : "bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-400 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
                }`}
              >
                {formData.proof ? <Check size={14} /> : <Paperclip size={14} />}
                <span className="text-xs uppercase tracking-wider font-medium">
                  {formData.proof ? "Image Attached" : "Browse Image"}
                </span>
              </div>
              <input
                type="file"
                onChange={handleProofChange}
                className="hidden"
                accept="image/*"
              />
            </label>
            {formData.proof && (
              <div className="flex items-center gap-1.5">
                <img
                  src={formData.proof}
                  alt="Proof preview"
                  className="w-[34px] h-[34px] object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, proof: "" })}
                  className="w-[34px] h-[34px] flex items-center justify-center text-gray-400 hover:text-rose-500 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors flex-shrink-0 cursor-pointer"
                  title="Remove proof"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </ModalForm>
    </div>
  )
}
