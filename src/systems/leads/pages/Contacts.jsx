import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  Edit,
  Trash2,
  Plus,
  Minus,
  X,
  PhoneOutgoing,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react"
import {
  getCompanies,
  saveCompanies,
  saveCompany,
  getNOBs,
  getDivisions,
  getCompanyConversionMap,
  getCompanyStageMap,
  saveCompanyConversionAndStageMap,
} from "../utils/storageManager"
import {
  fetchCompanies as fetchLiveCompanies,
  saveCompany as saveLiveCompany,
  deleteCompany as deleteLiveCompany,
  fetchLiveCompanyConversionAndStageMap,
} from "../services/leadApi"
import DataTable from "../components/DataTable"
import ModalAlert from "../components/ModalAlert"
import ModalForm from "../components/ModalForm"
import InfoPopover from "../components/InfoPopover"
import LeadAttachmentUpload from "../components/LeadAttachmentUpload"
import LocationPermissionModal from "../../../components/LocationPermissionModal"
import { getCitiesForState, INDIAN_STATES } from "../data/indianStatesAndCities"

const emptyContact = () => ({ name: "", designation: "", number: "" })

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
  proofLocation: null,
})

export default function Contacts() {
  const navigate = useNavigate()
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState(() => getCompanies())
  const [conversionMap, setConversionMap] = useState(() => getCompanyConversionMap())
  const [stageMap, setStageMap] = useState(() => getCompanyStageMap())
  const [activeTab, setActiveTab] = useState("converted") // "converted" | "unconverted"
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("")
  const [selectedStateFilter, setSelectedStateFilter] = useState("")
  const [selectedCityFilter, setSelectedCityFilter] = useState("")
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
  const [isOtherCity, setIsOtherCity] = useState(false)
  const [customCity, setCustomCity] = useState("")

  const modalCityOptions = useMemo(() => {
    return getCitiesForState(formData.state)
  }, [formData.state])

  const headers = useMemo(() => [
    { label: "Actions", align: "center" },
    { label: "Status", align: "center" },
    { label: activeTab === "unconverted" ? "Cancellation Stage" : "Stage", align: "center" },
    { label: "Timestamp", align: "center" },
    { label: "VN-NO", align: "center" },
    { label: "Company Name", align: "left" },
    { label: "Company GST", align: "center" },
    { label: "Company Email", align: "left" },
    { label: "Phone Number", align: "center" },
    { label: "State", align: "center" },
    { label: "City", align: "center" },
    { label: "NOB", align: "center" },
    { label: "Division", align: "center" },
    { label: "Contact Person", align: "center" },
    { label: "Proof", align: "center" },
    { label: "Address", align: "left" },
  ], [activeTab])

  const refreshData = async () => {
    try {
      const [liveCompaniesResult, liveConversionResult] = await Promise.allSettled([
        fetchLiveCompanies(),
        fetchLiveCompanyConversionAndStageMap(),
      ])

      let nextCompanies = getCompanies()
      if (liveCompaniesResult.status === "fulfilled" && liveCompaniesResult.value?.length > 0) {
        nextCompanies = liveCompaniesResult.value
        saveCompanies(nextCompanies)
      }
      setCompanies(nextCompanies)

      if (liveConversionResult.status === "fulfilled" && liveConversionResult.value) {
        const { conversionSet: liveConversion, stageMap: liveStage } = liveConversionResult.value
        setConversionMap(liveConversion)
        setStageMap(liveStage)
        saveCompanyConversionAndStageMap(liveConversion, liveStage)
      } else {
        const localConversion = getCompanyConversionMap()
        const localStage = getCompanyStageMap()
        setConversionMap(localConversion)
        setStageMap(localStage)
      }
    } catch (err) {
      console.warn("Could not refresh contacts data:", err)
      setCompanies(getCompanies())
      setConversionMap(getCompanyConversionMap())
      setStageMap(getCompanyStageMap())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
    setNobOptions(getNOBs().map((n) => n.name).filter(Boolean))
    setDivisionOptions(getDivisions().map((d) => d.name).filter(Boolean))

    const handleUpdates = () => {
      refreshData()
    }

    window.addEventListener("companies-updated", handleUpdates)
    window.addEventListener("leads-updated", handleUpdates)

    return () => {
      window.removeEventListener("companies-updated", handleUpdates)
      window.removeEventListener("leads-updated", handleUpdates)
    }
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
        timestamp: c.timestamp || c.createdAt || c.created_at || null,
      }
      const latestTimestamp = stageInfo.timestamp || c.timestamp || c.createdAt || c.created_at || null
      return {
        ...c,
        isConverted: isCompanyConverted(c),
        stageDetails: stageInfo,
        latestTimestamp,
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

  const cityOptions = useMemo(() => {
    return Array.from(new Set(tabCompanies.map((c) => c.city).filter(Boolean))).sort()
  }, [tabCompanies])

  const availableDivisions = useMemo(() => {
    const fromTab = tabCompanies.map((c) => c.division).filter(Boolean)
    const combined = Array.from(new Set([...divisionOptions, ...fromTab]))
    return combined.sort()
  }, [divisionOptions, tabCompanies])

  const filteredCompanies = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase()
    return tabCompanies.filter((c) => {
      if (selectedCompanyFilter && c.name !== selectedCompanyFilter) return false
      if (selectedStateFilter && c.state !== selectedStateFilter) return false
      if (selectedCityFilter && c.city !== selectedCityFilter) return false
      if (selectedDivisionFilter && c.division !== selectedDivisionFilter) return false
      if (selectedNobFilter && c.nob !== selectedNobFilter) return false

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
    selectedCityFilter,
    selectedDivisionFilter,
    selectedNobFilter,
  ])

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedCompanyFilter) ||
    Boolean(selectedStateFilter) ||
    Boolean(selectedCityFilter) ||
    Boolean(selectedDivisionFilter) ||
    Boolean(selectedNobFilter)

  const handleResetFilters = () => {
    setSearchQuery("")
    setSelectedCompanyFilter("")
    setSelectedStateFilter("")
    setSelectedCityFilter("")
    setSelectedDivisionFilter("")
    setSelectedNobFilter("")
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
    setIsOtherCity(false)
    setCustomCity("")
    setShowModal(true)
  }

  const handleEdit = (company) => {
    setEditingId(company.id)
    const availableCities = getCitiesForState(company.state || "")
    const isCustom = company.city && !availableCities.includes(company.city)
    setIsOtherCity(Boolean(isCustom))
    setCustomCity(isCustom ? company.city : "")
    setFormData({
      ...emptyFormData(),
      ...company,
      status: company.status || "",
      proof: company.proof || "",
      proofLocation: company.proofLocation || null,
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

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm })
  }

  const handleDelete = (id) => {
    showAlert(
      "confirm",
      "Delete Contact?",
      "Are you sure you want to remove this contact from records?",
      async () => {
        try {
          await deleteLiveCompany(id)
        } catch (err) {
          console.warn("Could not delete from Supabase:", err)
        }
        const updated = companies.filter((c) => c.id !== id)
        saveCompanies(updated)
        await refreshData()
        showAlert("success", "Deleted!", "The contact record has been removed successfully.")
      }
    )
  }

  const handleEnquiry = (company) => {
    navigate("/dashboard/leads/followup-tracker/new", {
      state: { companyContext: company },
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cleanContacts = formData.contactPersons.filter(
      (p) => p.name.trim() || p.designation.trim() || p.number.trim()
    )
    const finalData = {
      ...formData,
      contactPersons: cleanContacts.length > 0 ? cleanContacts : [emptyContact()],
    }

    try {
      await saveLiveCompany(finalData)
    } catch (err) {
      console.warn("Could not save to Supabase:", err)
    }

    if (editingId) {
      const updated = companies.map((c) =>
        c.id === editingId ? { ...c, ...finalData } : c
      )
      saveCompanies(updated)
      await refreshData()
      showAlert("success", "Updated!", "Contact information has been updated.")
    } else {
      const existingCompany = companies.find(
        (c) => (c.name || "").trim().toLowerCase() === formData.name.trim().toLowerCase()
      )
      saveCompany(finalData)
      await refreshData()
      if (existingCompany) {
        showAlert(
          "success",
          "Contact Merged!",
          `"${formData.name.trim()}" is already registered (${existingCompany.vnNo}). Its details and contact persons have been merged into the existing record.`
        )
      } else {
        showAlert("success", "Saved!", "New contact has been successfully registered.")
      }
    }
    setShowModal(false)
    setIsOtherCity(false)
    setCustomCity("")
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

    if (
      subStageName.toLowerCase().includes("not interested") ||
      stageName.toLowerCase().includes("not interested")
    ) {
      badgeTheme = {
        container: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        dot: "bg-rose-500",
        subtext: "text-rose-600 dark:text-rose-400 font-semibold",
      }
    } else if (stageName.includes("Quotation")) {
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
        className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors text-xs text-gray-700 dark:text-slate-300"
      >
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
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
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
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
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
          {renderStageBadge(item)}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center text-gray-500 dark:text-slate-400 font-mono text-[11px]">
          {formatTimestamp(item.latestTimestamp || item.stageDetails?.timestamp || item.timestamp || item.created_at || item.createdAt)}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center font-bold text-gray-900 dark:text-white">
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
            {item.vnNo || "-"}
          </span>
        </td>
        <td className="px-3.5 py-2.5 text-left font-bold text-gray-900 dark:text-white">
          <div className="max-w-[160px] xl:max-w-[220px] 2xl:max-w-none truncate" title={item.name}>
            {item.name || "-"}
          </div>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center uppercase font-mono text-[11px] text-gray-600 dark:text-slate-400">
          {item.gst || "-"}
        </td>
        <td className="px-3.5 py-2.5 text-left text-gray-600 dark:text-slate-300">
          <div className="max-w-[150px] xl:max-w-[200px] truncate" title={item.email}>
            {item.email || "-"}
          </div>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center text-gray-600 dark:text-slate-300 font-mono text-[11px]">
          {item.phone || "-"}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center text-gray-600 dark:text-slate-300">
          {item.state || "-"}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center text-gray-600 dark:text-slate-300">
          {item.city || "-"}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
          {item.nob ? (
            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium">
              {item.nob}
            </span>
          ) : (
            "-"
          )}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
          {item.division ? (
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-900/50">
              {item.division}
            </span>
          ) : (
            "-"
          )}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
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
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
          {item.proof ? (
            <div className="flex items-center justify-center gap-1.5">
              <a href={item.proof} target="_blank" rel="noopener noreferrer" className="inline-block">
                <img
                  src={item.proof}
                  alt="Proof"
                  className="w-8 h-8 object-cover rounded-lg border border-gray-200 dark:border-slate-700 mx-auto hover:scale-125 transition-transform"
                />
              </a>
              {item.proofLocation && typeof item.proofLocation.latitude === "number" && (
                <a
                  href={`https://www.google.com/maps?q=${item.proofLocation.latitude},${item.proofLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                  title={`Location: ${item.proofLocation.address || `${item.proofLocation.latitude}, ${item.proofLocation.longitude}`}`}
                >
                  <MapPin size={14} />
                </a>
              )}
            </div>
          ) : (
            <span className="text-gray-300 dark:text-slate-600">-</span>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-gray-500 dark:text-slate-400 text-left">
          {item.address ? (
            <InfoPopover items={[item.address]} title="Company Address">
              <span className="truncate max-w-[130px] xl:max-w-[180px] block cursor-help italic text-[11px]" title={item.address}>
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
          <div className="flex items-center gap-1.5 shrink-0">
            {item.phone && (
              <a
                href={`tel:${item.phone}`}
                className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 flex items-center justify-center transition-colors border border-emerald-200/50 dark:border-emerald-800/50"
                title={`Call ${item.phone}`}
              >
                <PhoneOutgoing size={14} />
              </a>
            )}
            <button
              type="button"
              onClick={() => handleEnquiry(item)}
              className="w-8 h-8 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-200/50 dark:border-blue-800/50 cursor-pointer"
              title="Raise Enquiry"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(item)}
              className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
              title="Edit Contact"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="w-8 h-8 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 flex items-center justify-center transition-colors border border-rose-200/50 dark:border-rose-800/50 cursor-pointer"
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
    <div className="w-full space-y-5 p-3 sm:p-4 md:p-6 theme-transition min-h-screen">
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

      {/* Tab Selector, Filters & Actions Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-gray-200/60 dark:border-slate-700/60 shadow-2xs shrink-0">
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

        {/* Filters & Actions in Top Row (Circled Area) */}
        <div className="flex flex-wrap items-center gap-2 flex-1 xl:justify-end">
          {/* Search Input */}
          <div className="relative min-w-[170px] max-w-[220px] flex-1">
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
              className="w-full pl-9 pr-7 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white h-[36px] shadow-2xs"
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
            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[36px] cursor-pointer shadow-2xs"
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
            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[36px] cursor-pointer shadow-2xs"
          >
            <option value="">All States</option>
            {stateOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Filter by City */}
          <select
            value={selectedCityFilter}
            onChange={(e) => {
              setSelectedCityFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[36px] cursor-pointer shadow-2xs"
          >
            <option value="">All Cities</option>
            {cityOptions.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>

          {/* Filter by Division */}
          <select
            value={selectedDivisionFilter}
            onChange={(e) => {
              setSelectedDivisionFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[36px] cursor-pointer shadow-2xs"
          >
            <option value="">All Divisions</option>
            {availableDivisions.map((div) => (
              <option key={div} value={div}>
                {div}
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
            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-[36px] cursor-pointer shadow-2xs"
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
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer h-[36px] shadow-2xs"
              title="Reset all filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}

          {/* Add Contact Button */}
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer h-[36px] shrink-0"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs overflow-hidden w-full">
        {/* Table Header */}
        <div className="px-4 py-3.5 sm:px-6 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {activeTab === "converted" ? "Converted Clients" : "Unconverted Clients"}
            </h2>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? "record" : "records"}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          headers={headers}
          data={paginatedCompanies}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="100%"
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalResults={filteredCompanies.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val)
            setCurrentPage(1)
          }}
          isLoading={isLoading}
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
        onClose={() => {
          setShowModal(false)
          setIsOtherCity(false)
          setCustomCity("")
        }}
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
              onChange={(e) => {
                const newState = e.target.value
                const newCities = getCitiesForState(newState)
                setFormData((prev) => ({
                  ...prev,
                  state: newState,
                  city: newCities.includes(prev.city) ? prev.city : "",
                }))
                setIsOtherCity(false)
                setCustomCity("")
              }}
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
            <select
              required={!isOtherCity}
              disabled={!formData.state}
              value={isOtherCity ? "Other" : formData.city}
              onChange={(e) => {
                const val = e.target.value
                if (val === "Other") {
                  setIsOtherCity(true)
                  setCustomCity("")
                  setFormData((prev) => ({ ...prev, city: "" }))
                } else {
                  setIsOtherCity(false)
                  setCustomCity("")
                  setFormData((prev) => ({ ...prev, city: val }))
                }
              }}
              className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px] disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">{formData.state ? "Select City" : "Select state first"}</option>
              {formData.city && !isOtherCity && !modalCityOptions.includes(formData.city) && (
                <option value={formData.city}>{formData.city}</option>
              )}
              {modalCityOptions.map((city, index) => (
                <option key={index} value={city}>
                  {city}
                </option>
              ))}
              {formData.state && <option value="Other">Other (Enter Manually)</option>}
            </select>

            {isOtherCity && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Enter City Name</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtherCity(false)
                      setCustomCity("")
                      setFormData((prev) => ({ ...prev, city: "" }))
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    ← Select from list
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={customCity}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomCity(val)
                    setFormData((prev) => ({ ...prev, city: val }))
                  }}
                  placeholder="Type city name"
                  className="w-full border border-blue-400 dark:border-blue-500 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-[34px]"
                />
              </div>
            )}
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
              <option value="Converted">Converted (Order Received)</option>
              <option value="Unconverted">Unconverted (Not Interested / In Progress)</option>
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

        <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
          <LeadAttachmentUpload
            id="contact-proof-upload"
            label="Proof (Image Upload)"
            value={formData.proof}
            locationValue={formData.proofLocation}
            onChange={(base64, locationMeta) => {
              setFormData((prev) => ({
                ...prev,
                proof: base64,
                proofLocation: locationMeta
              }))
            }}
            onClear={() => {
              setFormData((prev) => ({
                ...prev,
                proof: "",
                proofLocation: null
              }))
            }}
            onRequestLocationModal={() => setShowLocationModal(true)}
            buttonText="Browse Image"
            accept="image/*"
          />
        </div>
      </ModalForm>

      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </div>
  )
}
