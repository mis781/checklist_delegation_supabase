import { useState, useEffect, useContext, useMemo } from "react"
import { Wallet, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Eye, MapPin, Search, X } from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import LeadAttachmentUpload from "../components/LeadAttachmentUpload"
import LocationPermissionModal from "../../../components/LocationPermissionModal"
import DataTable from "../components/DataTable"
import { SearchIcon } from "../components/Icons"
import nutechLogo from "../../../assets/nutech-logo.png"
import { buildQuotationPdf } from "./Quotation"
import {
  fetchLeadsTatRules,
  calculateLeadsTat,
  LEADS_STAGE_KEYS,
  TatDelayBadge,
  parseLeadDate,
  getLeadDateCategory,
} from "../utils/leadsTatEngine"

const fadeIn = "animate-in fade-in duration-300"
const slideIn = "animate-in slide-in-from-right duration-300"

const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
const labelClass = "block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1"

const INTERACTION_TYPES = ["Call", "Email", "Meeting / Visit", "WhatsApp", "Other"]

const initialFormData = {
  leadNo: "",
  attachment: "",
  attachmentName: "",
  attachmentLocation: null,
  interactionType: "Call",
  customerSaid: "",
  status: "",
  nextFollowup: "",
  remarks: "",
  advancePayment: "No",
  advanceAmount: "",
  poNumber: "",
  poDate: "",
  expectedDeliveryDate: "",
  gstNumber: "",
  poCopy: "",
  poCopyName: "",
  poCopyLocation: null,
  nextFollowupDate: "",
  reason: "",
}

function QuotationTracker() {
  const { currentUser, isAdmin, isSalesPerson, showNotification } = useContext(AuthContext)
  const isUserSalesPerson = isSalesPerson || (!isAdmin())

  const [activeTab, setActiveTab] = useState("pending")
  const [pendingEntries, setPendingEntries] = useState([])
  const [historyEntries, setHistoryEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Filters — shared across Pending and History
  const [companyFilter, setCompanyFilter] = useState("all")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState(isUserSalesPerson && currentUser?.username ? currentUser.username : "all")
  const [nobFilter, setNobFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)

  useEffect(() => {
    if (isUserSalesPerson && currentUser?.username) {
      setPersonFilter(currentUser.username)
    }
  }, [isUserSalesPerson, currentUser])

  // Column visibility
  const [pendingVisibleColumns, setPendingVisibleColumns] = useState({
    leadNo: true,
    companyName: true,
    salesPersonName: true,
    nob: true,
    plannedDate: true,
    delay: true,
    followUpCount: true,
    status: true,
    division: true,
    date: true,
    freightType: true,
    paymentTerms: true,
    totalAmount: true,
    advancePayment: true,
    advanceAmount: true,
    nextFollowup: true,
    quotation: true,
  })
  const [tatRules, setTatRules] = useState([])
  const [historyVisibleColumns, setHistoryVisibleColumns] = useState({
    updated: true,
    leadNo: true,
    companyName: true,
    salesPersonName: true,
    nob: true,
    followUpCount: true,
    status: true,
    division: true,
    paymentTerms: true,
    customerSaid: true,
    poNumber: true,
    advanceAmount: true,
    remarks: true,
    quotation: true,
  })

  const pendingColumnOptions = [
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "salesPersonName", label: "Sales Person Name" },
    { key: "nob", label: "NOB" },
    { key: "plannedDate", label: "Planned Date" },
    { key: "delay", label: "Delay" },
    { key: "followUpCount", label: "No. of Follow-ups" },
    { key: "status", label: "Status" },
    { key: "division", label: "Division" },
    { key: "date", label: "Date" },
    { key: "freightType", label: "Freight Type" },
    { key: "paymentTerms", label: "Payment Terms" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "advancePayment", label: "Advance Payment" },
    { key: "advanceAmount", label: "Advance Amount" },
    { key: "nextFollowup", label: "Next Followup" },
    { key: "quotation", label: "Quotation" },
  ]

  const historyColumnOptions = [
    { key: "updated", label: "Updated" },
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "salesPersonName", label: "Sales Person Name" },
    { key: "nob", label: "NOB" },
    { key: "followUpCount", label: "No. of Follow-ups" },
    { key: "status", label: "Status" },
    { key: "division", label: "Division" },
    { key: "paymentTerms", label: "Payment Terms" },
    { key: "customerSaid", label: "What Did Customer Said" },
    { key: "poNumber", label: "PO Number" },
    { key: "advanceAmount", label: "Advance Amount" },
    { key: "remarks", label: "Remarks / Reason" },
    { key: "quotation", label: "Quotation" },
  ]

  const handlePendingColumnToggle = (columnKey) => {
    setPendingVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  const handlePendingSelectAll = () => {
    const allSelected = Object.values(pendingVisibleColumns).every(Boolean)
    setPendingVisibleColumns(Object.fromEntries(Object.keys(pendingVisibleColumns).map((key) => [key, !allSelected])))
  }

  const handleHistoryColumnToggle = (columnKey) => {
    setHistoryVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  const handleHistorySelectAll = () => {
    const allSelected = Object.values(historyVisibleColumns).every(Boolean)
    setHistoryVisibleColumns(Object.fromEntries(Object.keys(historyVisibleColumns).map((key) => [key, !allSelected])))
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnDropdown && !event.target.closest(".relative")) {
        setShowColumnDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showColumnDropdown])

  // Quotation Update Form State
  const [showPopup, setShowPopup] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // View Details Modal State
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedViewEntry, setSelectedViewEntry] = useState(null)

  // Helper function to format date for popup display
  const formatPopupDate = (dateValue) => {
    if (!dateValue) return "-"
    try {
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }
      return dateValue
    } catch {
      return dateValue
    }
  }

  // Helper function to resolve exact payment terms
  const getExactPaymentTerms = (entry) => {
    if (!entry) return "-"
    const pt = entry.paymentTerms || entry.quotationData?.paymentTerms || entry.quotationData?.payment_terms || ""
    const customPt = entry.customPaymentTerms || entry.quotationData?.customPaymentTerms || entry.quotationData?.custom_payment_terms || ""
    if (pt === "Custom") return customPt || "Custom"
    return pt || customPt || "-"
  }

  // Helper to compute items financial summary
  const computeItemsSummary = (items) => {
    const basePrice = (items || []).reduce((sum, item) => sum + (Number(item.qty || item.quantity || 0) * Number(item.rate || 0)), 0)
    const discountAmount = (items || []).reduce((sum, item) => {
      const base = Number(item.qty || item.quantity || 0) * Number(item.rate || 0)
      return sum + (base * (Number(item.discountPercent || item.discount_percent || 0) / 100))
    }, 0)
    const taxableAmount = basePrice - discountAmount
    const gstAmount = (items || []).reduce((sum, item) => {
      const base = Number(item.qty || item.quantity || 0) * Number(item.rate || 0)
      const itemDisc = base * (Number(item.discountPercent || item.discount_percent || 0) / 100)
      const gstRate = Number(item.gst ?? item.gst_percent ?? 18)
      return sum + ((base - itemDisc) * (gstRate / 100))
    }, 0)
    const grandTotal = Number((taxableAmount + gstAmount).toFixed(2))
    return {
      basePrice: Number(basePrice.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    }
  }

  const [logoDataUri, setLogoDataUri] = useState("")

  useEffect(() => {
    fetch(nutechLogo)
      .then((res) => res.blob())
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }))
      .then(setLogoDataUri)
      .catch((error) => console.error("Error loading logo for PDF:", error))
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const data = await mockApi.fetchAdvancePayments(currentUser, isAdmin)
      setPendingEntries(data.pending || [])
      setHistoryEntries(data.history || [])
    } catch (error) {
      console.error("Error fetching quotation tracker data:", error)
      setPendingEntries([])
      setHistoryEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchLeadsTatRules().then((rules) => {
      if (rules && rules.length > 0) setTatRules(rules)
    })

    const handleLeadsUpdated = () => {
      fetchData()
      fetchLeadsTatRules().then((rules) => {
        if (rules && rules.length > 0) setTatRules(rules)
      })
    }
    window.addEventListener("leads-updated", handleLeadsUpdated)
    return () => window.removeEventListener("leads-updated", handleLeadsUpdated)
  }, [])

  const handleViewQuotation = (entry) => {
    if (!entry?.quotationData) {
      showNotification("Quotation details are not available to view PDF.", "error")
      return
    }
    try {
      const doc = buildQuotationPdf(entry.quotationData, logoDataUri)
      const blob = doc.output("blob")
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, "_blank")
    } catch (error) {
      console.error("Error opening quotation PDF:", error)
      showNotification("Failed to open PDF", "error")
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    setCompanyFilter("all")
    setDivisionFilter("all")
    setPersonFilter(isUserSalesPerson && currentUser?.username ? currentUser.username : "all")
    setNobFilter("all")
    setDateFilter("all")
    setFilterType("all")
  }, [activeTab, isUserSalesPerson, currentUser])

  const openPopup = (entry) => {
    setSelectedEntry(entry)
    const quoteNo = (entry.quotationNo || "").toLowerCase()
    const leadNo = (entry.leadNo || "").toLowerCase()
    const latestUpdate = (entry.allHistory && entry.allHistory[0]) || historyEntries.find(h => 
      (quoteNo && (h.quotationNo || "").toLowerCase() === quoteNo) || 
      (leadNo && (h.leadNo || "").toLowerCase() === leadNo)
    )

    const attachmentUrl = entry.attachment || latestUpdate?.attachment || latestUpdate?.attachment_url || entry.quotationData?.attachment || ""
    const rawName = entry.attachmentName || latestUpdate?.attachmentName || (attachmentUrl ? decodeURIComponent(attachmentUrl.split("/").pop().split("?")[0]) : "")
    const attachmentName = rawName || (attachmentUrl ? "Previous Attachment" : "")

    setFormData({
      leadNo: entry.leadNo || "",
      attachment: attachmentUrl,
      attachmentName: attachmentName,
      attachmentLocation: entry.attachmentLocation || latestUpdate?.attachmentLocation || entry.quotationData?.attachmentLocation || null,
      interactionType: entry.interactionType || latestUpdate?.interactionType || "Call",
      customerSaid: entry.customerSaid || entry.customerFeedback || latestUpdate?.customerSaid || "",
      status: entry.status || latestUpdate?.status || "",
      nextFollowup: entry.nextFollowup || latestUpdate?.nextFollowup || "",
      remarks: entry.remarks || latestUpdate?.remarks || "",
      advancePayment: entry.advancePayment === "Yes" ? "Yes" : "No",
      advanceAmount: entry.advanceAmount || "",
      poNumber: "",
      poDate: entry.poDate || "",
      expectedDeliveryDate: entry.expectedDeliveryDate || "",
      gstNumber: entry.gstNumber || latestUpdate?.gstNumber || "",
      poCopy: entry.poCopy || latestUpdate?.poCopy || "",
      poCopyName: entry.poCopyName || latestUpdate?.poCopyName || "",
      poCopyLocation: entry.poCopyLocation || latestUpdate?.poCopyLocation || null,
      nextFollowupDate: entry.nextFollowupDate || entry.nextFollowup || latestUpdate?.nextFollowup || "",
      reason: entry.reason || latestUpdate?.reason || "",
    })
    setShowPopup(true)
  }

  const closePopup = () => {
    setShowPopup(false)
    setSelectedEntry(null)
    setFormData(initialFormData)
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEntry) return
    if (!formData.status) {
      showNotification("Please select a status for this quotation update", "error")
      return
    }

    if (formData.status === "Order Received") {
      if (!formData.poNumber || !formData.poNumber.trim()) {
        showNotification("Please enter a PO Number", "error")
        return
      }
      if (!formData.poDate) {
        showNotification("Please select a PO Date", "error")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const followUpDate = formData.nextFollowup || formData.nextFollowupDate || ""
      const payload = {
        ...formData,
        poNumber: formData.poNumber ? formData.poNumber.trim() : "",
        nextFollowup: followUpDate,
        nextFollowupDate: followUpDate,
        salesPerson: currentUser?.username || "",
        updatedBy: currentUser?.username || "",
      }

      const result = await mockApi.submitAdvancePaymentUpdate(selectedEntry.quotationNo, payload)

      if (result.success) {
        if (result.orderCreated) {
          showNotification(`Order Received recorded. PO "${payload.poNumber}" created in Order Management.`, "success")
        } else {
          showNotification("Quotation update recorded successfully", "success")
        }
        window.dispatchEvent(new CustomEvent("leads-updated"))
        closePopup()
        await fetchData()
      } else {
        showNotification("Error updating quotation: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      showNotification("Error updating quotation: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStatusBadge = (status) => {
    switch (status) {
      case "Negotiation":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">Negotiation</span>
      case "Awaiting Payment":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Awaiting Payment</span>
      case "Order Received":
      case "Sent to Order":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Order Received</span>
      case "Order Not Received":
      case "Not Sent to Order":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Order Not Received</span>
      case "Hold":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">On Hold</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Pending Review</span>
    }
  }

  const getEntrySalesPerson = (entry) => {
    return (
      entry.receiverName ||
      entry.salesPerson ||
      entry.salesPersonName ||
      entry.assignedUser ||
      entry.assignedTo ||
      entry.preparedBy ||
      entry.quotationData?.preparedBy ||
      entry.quotationData?.receiverName ||
      entry.quotationData?.salespersonName ||
      entry.quotationData?.assignedUser ||
      entry.personName ||
      ""
    )
  }

  const getEntryNob = (entry) => {
    return (
      entry.nob ||
      entry.quotationData?.nob ||
      entry.projectName ||
      entry.quotationData?.projectName ||
      ""
    )
  }
  const hasQuotationFollowup = (entry) => {
    return !!(
      (entry.status && entry.status !== "Pending Review") ||
      entry.nextFollowup ||
      entry.nextFollowupDate ||
      entry.customerSaid ||
      entry.customerFeedback ||
      entry.remarks ||
      entry.reason ||
      (entry.followUpCount && entry.followUpCount > 0)
    )
  }

  const getEntryDateCategory = (entry) => {
    return getLeadDateCategory(entry, LEADS_STAGE_KEYS.QUOTATION_TRACKER, tatRules)
  }

  const calculateDateFilterCounts = () => {
    const counts = {
      today: 0,
      overdue: 0,
      upcoming: 0,
    }

    pendingEntries.forEach((entry) => {
      const cat = getEntryDateCategory(entry)
      if (cat === "today") counts.today++
      else if (cat === "overdue") counts.overdue++
      else if (cat === "upcoming") counts.upcoming++
    })

    return counts
  }

  const dateFilterCounts = calculateDateFilterCounts()

  // Group history entries by lead number (or quotation number) so each lead is represented by its latest update
  const groupedHistoryEntries = useMemo(() => {
    const groups = {}
    const order = []

    ;(historyEntries || []).forEach((item) => {
      // Group by leadNo (or quotationNo if leadNo missing)
      const leadKey = (item.leadNo || item.quotationNo || `id-${item.id || Math.random()}`).trim()
      if (!groups[leadKey]) {
        groups[leadKey] = []
        order.push(leadKey)
      }
      groups[leadKey].push(item)
    })

    return order.map((key) => {
      const allItems = groups[key]
      // allItems is sorted newest-first (first item is the latest update)
      const latest = allItems[0]
      const remaining = allItems.slice(1)
      return {
        ...latest,
        followUpCount: allItems.length,
        allFollowUps: allItems,
        allHistory: allItems,
        remainingFollowUps: remaining,
      }
    })
  }, [historyEntries])

  const matchesSearch = (entry) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    const allItems = entry.allHistory || [entry]
    return (
      (entry.quotationNo && entry.quotationNo.toLowerCase().includes(q)) ||
      (entry.companyName && entry.companyName.toLowerCase().includes(q)) ||
      (entry.division && entry.division.toLowerCase().includes(q)) ||
      (entry.leadNo && entry.leadNo.toLowerCase().includes(q)) ||
      (getEntryNob(entry) && getEntryNob(entry).toLowerCase().includes(q)) ||
      (getEntrySalesPerson(entry) && getEntrySalesPerson(entry).toLowerCase().includes(q)) ||
      (getExactPaymentTerms(entry) && getExactPaymentTerms(entry).toLowerCase().includes(q)) ||
      (entry.customerSaid && entry.customerSaid.toLowerCase().includes(q)) ||
      (entry.remarks && entry.remarks.toLowerCase().includes(q)) ||
      (entry.poNumber && entry.poNumber.toLowerCase().includes(q)) ||
      allItems.some(
        (item) =>
          (item.customerSaid && item.customerSaid.toLowerCase().includes(q)) ||
          (item.remarks && item.remarks.toLowerCase().includes(q)) ||
          (item.reason && item.reason.toLowerCase().includes(q)) ||
          (item.poNumber && item.poNumber.toLowerCase().includes(q))
      )
    )
  }

  const matchesCompanyFilter = (entry) => companyFilter === "all" || (entry.companyName || entry.consigneeName) === companyFilter
  const matchesDivisionFilter = (entry) => divisionFilter === "all" || (entry.division || entry.consigneeDivision) === divisionFilter
  const matchesPersonFilter = (entry) => personFilter === "all" || getEntrySalesPerson(entry) === personFilter
  const matchesNobFilter = (entry) => nobFilter === "all" || getEntryNob(entry) === nobFilter

  const matchesDateFilter = (entry) => {
    if (dateFilter === "all") return true

    if (activeTab === "pending") {
      const cat = getEntryDateCategory(entry)
      return cat === dateFilter
    } else {
      const dateVal = entry.updatedAt || entry.date || entry.createdAt
      if (!dateVal) return false
      const parsed = parseLeadDate(dateVal)
      if (!parsed || isNaN(parsed.getTime())) return true
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (dateFilter === "today") {
        return parsed >= today && parsed < tomorrow
      } else if (dateFilter === "older" || dateFilter === "overdue") {
        return parsed < today
      }
      return true
    }
  }

  const matchesStageFilter = (entry) => {
    if (filterType === "all") return true
    if (activeTab === "pending") {
      const isFollowup = hasQuotationFollowup(entry)
      if (filterType === "first") return !isFollowup
      if (filterType === "multi") return isFollowup
      return true
    } else {
      if (filterType === "first") {
        return !entry.status || entry.status === "Pending Review"
      } else if (filterType === "multi") {
        return entry.status !== "Pending Review" && !!entry.status
      }
      return true
    }
  }

  const filteredPending = pendingEntries.filter(
    (e) =>
      matchesSearch(e) &&
      matchesCompanyFilter(e) &&
      matchesDivisionFilter(e) &&
      matchesPersonFilter(e) &&
      matchesNobFilter(e) &&
      matchesDateFilter(e) &&
      matchesStageFilter(e)
  )

  const filteredHistory = groupedHistoryEntries.filter(
    (e) =>
      matchesSearch(e) &&
      matchesCompanyFilter(e) &&
      matchesDivisionFilter(e) &&
      matchesPersonFilter(e) &&
      matchesNobFilter(e) &&
      matchesDateFilter(e) &&
      matchesStageFilter(e)
  )

  const pendingTotalPages = Math.ceil(filteredPending.length / itemsPerPage)
  const paginatedPending = filteredPending.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const historyTotalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const pendingHeaders = [
    "Actions", "Quotation No.",
    ...pendingColumnOptions.filter((opt) => pendingVisibleColumns[opt.key]).map((opt) => opt.label)
  ]

  const renderPendingRow = (entry, index) => {
    const tatInfo = calculateLeadsTat(entry, LEADS_STAGE_KEYS.QUOTATION_TRACKER, tatRules)

    return (
      <tr key={`${entry.quotationNo}-${index}`} className="hover:bg-slate-50 transition-colors">
        <td className="sticky left-0 z-10 bg-white px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium border-r border-gray-200">
          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => {
                setSelectedViewEntry(entry)
                setShowViewModal(true)
              }}
              className="w-full sm:w-auto px-2 sm:px-3 py-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-md transition-colors whitespace-nowrap"
            >
              View
            </button>
            <button
              onClick={() => openPopup(entry)}
              className="w-full sm:w-auto px-2.5 sm:px-3 py-1 text-xs font-medium border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md transition-colors whitespace-nowrap"
            >
              Update
            </button>
          </div>
        </td>
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{entry.quotationNo}</td>
        {pendingVisibleColumns.leadNo && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.leadNo || "-"}</td>
        )}
        {pendingVisibleColumns.companyName && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-700 font-medium">
            <div className="max-w-[140px] sm:max-w-[180px] truncate" title={entry.companyName}>{entry.companyName}</div>
          </td>
        )}
        {pendingVisibleColumns.salesPersonName && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[120px] sm:max-w-[150px] truncate" title={getEntrySalesPerson(entry)}>{getEntrySalesPerson(entry) || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.nob && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={getEntryNob(entry)}>{getEntryNob(entry) || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.plannedDate && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-700 whitespace-nowrap font-medium">
            {tatInfo.plannedFormatted || "-"}
          </td>
        )}
        {pendingVisibleColumns.delay && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm whitespace-nowrap">
            <TatDelayBadge tat={tatInfo} />
          </td>
        )}
        {pendingVisibleColumns.followUpCount && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-center whitespace-nowrap">
            <span
              className="inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
              title={`Completed ${entry.followUpCount || 0} follow-up(s)`}
            >
              {entry.followUpCount || 0}
            </span>
          </td>
        )}
        {pendingVisibleColumns.status && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
            {renderStatusBadge(entry.status)}
          </td>
        )}
        {pendingVisibleColumns.division && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={entry.division}>{entry.division || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.date && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.date || "-"}</td>
        )}
        {pendingVisibleColumns.freightType && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.freightType || "-"}</td>
        )}
        {pendingVisibleColumns.paymentTerms && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-600">
            <div className="max-w-[120px] sm:max-w-[160px] truncate" title={getExactPaymentTerms(entry)}>
              {getExactPaymentTerms(entry)}
            </div>
          </td>
        )}
        {pendingVisibleColumns.totalAmount && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
            ₹{Number(entry.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        )}
        {pendingVisibleColumns.advancePayment && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.advancePayment || "No"}</td>
        )}
        {pendingVisibleColumns.advanceAmount && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
            {entry.advanceAmount ? `₹${Number(entry.advanceAmount).toLocaleString("en-IN")}` : "-"}
          </td>
        )}
        {pendingVisibleColumns.nextFollowup && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
            {formatPopupDate(entry.nextFollowup || entry.nextFollowupDate)}
          </td>
        )}
        {pendingVisibleColumns.quotation && (
          <td className="px-3 sm:px-4 py-3 sm:py-4">
            <button
              onClick={() => handleViewQuotation(entry)}
              className="inline-flex items-center px-2.5 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md whitespace-nowrap"
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View PDF
            </button>
          </td>
        )}
      </tr>
    )
  }

  const renderPendingCard = (entry, index) => {
    const tatInfo = calculateLeadsTat(entry, LEADS_STAGE_KEYS.QUOTATION_TRACKER, tatRules)

    return (
      <div key={index} className="bg-white dark:bg-slate-850 rounded-2xl shadow-xs border border-gray-150 dark:border-slate-750 p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                {entry.quotationNo}
              </span>
              {renderStatusBadge(entry.status)}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{entry.companyName}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Lead {entry.leadNo || "-"} • {entry.division || "-"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Sales Person</p>
            <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{getEntrySalesPerson(entry) || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">NOB</p>
            <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{getEntryNob(entry) || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Follow-ups</p>
            <p className="font-black text-blue-600 dark:text-blue-400">{entry.followUpCount || 0}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Total Amount</p>
            <p className="font-bold text-gray-900 dark:text-white">₹{Number(entry.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Payment Terms</p>
            <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{getExactPaymentTerms(entry)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Advance Payment</p>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{entry.advancePayment || "No"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Next Followup</p>
            <p className="font-semibold text-amber-600 dark:text-amber-400 truncate">{entry.nextFollowup || entry.nextFollowupDate || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Date</p>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{entry.date || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Planned Date</p>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{tatInfo.plannedFormatted || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-400">Delay / TAT</p>
            <div className="mt-0.5"><TatDelayBadge tat={tatInfo} /></div>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-slate-750 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedViewEntry(entry)
              setShowViewModal(true)
            }}
            className="flex-1 h-10 flex items-center justify-center px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer shadow-2xs transition-colors"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => openPopup(entry)}
            className="flex-1 h-10 flex items-center justify-center px-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 cursor-pointer shadow-2xs transition-colors"
          >
            Update Status
          </button>
          <button
            type="button"
            onClick={() => handleViewQuotation(entry)}
            className="w-10 h-10 flex items-center justify-center border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer shadow-2xs shrink-0 transition-colors"
            title="View Quotation PDF"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const historyHeaders = [
    "Quotation No.",
    ...historyColumnOptions.filter((opt) => historyVisibleColumns[opt.key]).map((opt) => opt.label)
  ]

  const formatHistoryDate = (isoString) => {
    if (!isoString) return "-"
    try {
      const date = new Date(isoString)
      return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
    } catch {
      return "-"
    }
  }

  const renderHistoryRow = (entry, index) => (
    <tr key={`${entry.quotationNo}-${index}`} className="hover:bg-slate-50 transition-colors">
      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{entry.quotationNo}</td>
      {historyVisibleColumns.updated && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{formatHistoryDate(entry.updatedAt)}</td>
      )}
      {historyVisibleColumns.leadNo && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.leadNo || "-"}</td>
      )}
      {historyVisibleColumns.companyName && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-700 font-medium">
          <div className="max-w-[140px] sm:max-w-[180px] truncate" title={entry.companyName}>{entry.companyName}</div>
        </td>
      )}
      {historyVisibleColumns.salesPersonName && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[120px] sm:max-w-[150px] truncate" title={getEntrySalesPerson(entry)}>{getEntrySalesPerson(entry) || "-"}</div>
        </td>
      )}
      {historyVisibleColumns.nob && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[100px] sm:max-w-[120px] truncate" title={getEntryNob(entry)}>{getEntryNob(entry) || "-"}</div>
        </td>
      )}
      {historyVisibleColumns.followUpCount && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-center whitespace-nowrap">
          <span
            className="inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
            title={`Completed ${entry.followUpCount || 0} follow-up(s)`}
          >
            {entry.followUpCount || 0}
          </span>
        </td>
      )}
      {historyVisibleColumns.status && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
          {renderStatusBadge(entry.status)}
        </td>
      )}
      {historyVisibleColumns.division && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[100px] sm:max-w-[120px] truncate" title={entry.division}>{entry.division || "-"}</div>
        </td>
      )}
      {historyVisibleColumns.paymentTerms && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-600">
          <div className="max-w-[120px] sm:max-w-[160px] truncate" title={getExactPaymentTerms(entry)}>
            {getExactPaymentTerms(entry)}
          </div>
        </td>
      )}
      {historyVisibleColumns.customerSaid && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-700">
          <div className="max-w-[160px] sm:max-w-[220px] truncate" title={entry.customerSaid || entry.customerFeedback || "-"}>
            {entry.customerSaid || entry.customerFeedback || "-"}
          </div>
        </td>
      )}
      {historyVisibleColumns.poNumber && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-700 font-medium whitespace-nowrap">{entry.poNumber || "-"}</td>
      )}
      {historyVisibleColumns.advanceAmount && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
          {entry.advanceAmount ? `₹${Number(entry.advanceAmount).toLocaleString("en-IN")}` : "-"}
        </td>
      )}
      {historyVisibleColumns.remarks && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[180px] sm:max-w-[240px] truncate" title={entry.remarks || entry.reason || entry.customerSaid || (entry.nextFollowup ? `Next Followup: ${entry.nextFollowup}` : "")}>
            {entry.remarks || entry.reason || entry.customerSaid || (entry.nextFollowup ? `Next Followup: ${entry.nextFollowup}` : "-")}
          </div>
        </td>
      )}
      {historyVisibleColumns.quotation && (
        <td className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedViewEntry(entry)
                setShowViewModal(true)
              }}
              className="px-2.5 sm:px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-md transition-colors whitespace-nowrap"
            >
              View
            </button>
            <button
              onClick={() => handleViewQuotation(entry)}
              className="inline-flex items-center px-2.5 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md whitespace-nowrap"
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View PDF
            </button>
          </div>
        </td>
      )}
    </tr>
  )

  const renderHistoryCard = (entry, index) => (
    <div key={index} className="bg-white dark:bg-slate-850 rounded-2xl shadow-xs border border-gray-150 dark:border-slate-750 p-4 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-400 block mb-0.5">{formatHistoryDate(entry.updatedAt)}</span>
          <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{entry.companyName}</h3>
          <p className="text-xs text-sky-600 dark:text-sky-400 font-bold">{entry.quotationNo}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Lead {entry.leadNo || "-"}</p>
        </div>
        {renderStatusBadge(entry.status)}
      </div>
      <div className="grid grid-cols-2 gap-2.5 text-xs text-gray-600 dark:text-slate-400">
        <div>
          <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">Sales Person</span>
          <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{getEntrySalesPerson(entry) || "-"}</p>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">NOB</span>
          <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{getEntryNob(entry) || "-"}</p>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">Follow-ups</span>
          <p className="font-black text-blue-600 dark:text-blue-400">{entry.followUpCount || 0}</p>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">Division</span>
          <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{entry.division || "-"}</p>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">Payment Terms</span>
          <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{getExactPaymentTerms(entry)}</p>
        </div>
        {entry.poNumber && (
          <div>
            <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">PO Number</span>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{entry.poNumber}</p>
          </div>
        )}
        {entry.advanceAmount && (
          <div>
            <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">Advance Amount</span>
            <p className="font-semibold text-gray-800 dark:text-slate-200">₹{Number(entry.advanceAmount).toLocaleString("en-IN")}</p>
          </div>
        )}
        <div className="col-span-2">
          <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-400">Remarks / Reason / Feedback</span>
          <p className="text-xs text-gray-700 dark:text-slate-300 truncate">{entry.remarks || entry.reason || entry.customerSaid || (entry.nextFollowup ? `Next Followup: ${entry.nextFollowup}` : "-")}</p>
        </div>
      </div>
      <div className="pt-2 border-t border-gray-100 dark:border-slate-750 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedViewEntry(entry)
            setShowViewModal(true)
          }}
          className="flex-1 h-10 flex items-center justify-center px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer shadow-2xs transition-colors"
        >
          View Details
        </button>
        <button
          type="button"
          onClick={() => handleViewQuotation(entry)}
          className="w-10 h-10 flex items-center justify-center border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer shadow-2xs shrink-0 transition-colors"
          title="View Quotation PDF"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Wallet size={22} />
            </div>
            Quotation Tracker
            {pendingEntries.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-xs">
                {pendingEntries.length} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Track quotations, record customer updates, and manage order conversion status
          </p>
        </div>
      </div>

      {/* Filters & Tabs Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
        {/* Top Tier: Tabs + Search + Column Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          {/* Tab Navigation */}
          <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Clock size={14} className={activeTab === "pending" ? "text-blue-600 dark:text-blue-400" : "text-gray-400"} />
              <span>Pending</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "pending"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {pendingEntries.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <CheckCircle2 size={14} className={activeTab === "history" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"} />
              <span>History</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "history"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {groupedHistoryEntries.length}
              </span>
            </button>
          </div>

          {/* Search & Column Selector Controls */}
          <div className="flex items-center gap-2.5 flex-1 md:flex-initial justify-end">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search quotation, company, lead..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 h-[36px]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Column Selection Dropdown */}
            {(() => {
              const isPendingTab = activeTab === "pending"
              const activeColumnOptions = isPendingTab ? pendingColumnOptions : historyColumnOptions
              const activeVisibleColumns = isPendingTab ? pendingVisibleColumns : historyVisibleColumns
              const activeColumnToggle = isPendingTab ? handlePendingColumnToggle : handleHistoryColumnToggle
              const activeSelectAll = isPendingTab ? handlePendingSelectAll : handleHistorySelectAll

              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    className="px-3 py-2 text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between gap-2 h-[36px] whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                  >
                    <span>Select Columns</span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showColumnDropdown ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showColumnDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto p-2">
                      <div className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <input
                          type="checkbox"
                          id="select-all-adv"
                          checked={Object.values(activeVisibleColumns).every(Boolean)}
                          onChange={activeSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded cursor-pointer"
                        />
                        <label htmlFor="select-all-adv" className="ml-2.5 text-xs font-bold text-gray-900 dark:text-white cursor-pointer select-none">
                          All Columns
                        </label>
                      </div>

                      <hr className="my-1.5 border-gray-100 dark:border-slate-800" />

                      <div className="space-y-0.5">
                        {activeColumnOptions.map((option) => (
                          <div key={option.key} className="flex items-center p-1.5 px-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              id={`adv-column-${option.key}`}
                              checked={activeVisibleColumns[option.key]}
                              onChange={() => activeColumnToggle(option.key)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded cursor-pointer"
                            />
                            <label
                              htmlFor={`adv-column-${option.key}`}
                              className="ml-2.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer flex-1 select-none"
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Bottom Tier: Filter Dropdowns Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          {(() => {
            const filterSource = activeTab === "pending" ? pendingEntries : groupedHistoryEntries
            return (
              <>
                {/* Company Name Filter */}
                <div className="flex-1 min-w-[130px] sm:flex-initial sm:w-36">
                  <select
                    value={companyFilter}
                    onChange={(e) => {
                      setCompanyFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All Companies</option>
                    {Array.from(new Set(filterSource.map((item) => item.companyName || item.consigneeName)))
                      .filter(Boolean)
                      .map((company) => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                  </select>
                </div>

                {/* Division Filter */}
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  <select
                    value={divisionFilter}
                    onChange={(e) => {
                      setDivisionFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All Divisions</option>
                    {Array.from(new Set(filterSource.map((item) => item.division || item.consigneeDivision)))
                      .filter(Boolean)
                      .map((division) => (
                        <option key={division} value={division}>{division}</option>
                      ))}
                  </select>
                </div>

                {/* Sales Person Name Filter */}
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  {(!isAdmin() && isUserSalesPerson) ? (
                    <div className="w-full px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 font-semibold h-[36px] flex items-center justify-between cursor-not-allowed select-none">
                      <span className="truncate">{currentUser?.username || personFilter}</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-1">Auto</span>
                    </div>
                  ) : (
                    <select
                      value={personFilter}
                      onChange={(e) => {
                        setPersonFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                    >
                      <option value="all">All Persons</option>
                      {personFilter && personFilter !== "all" && (
                        <option value={personFilter}>{personFilter}</option>
                      )}
                      {Array.from(new Set(filterSource.map((item) => getEntrySalesPerson(item))))
                        .filter(Boolean)
                        .filter(p => p !== personFilter)
                        .map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))}
                    </select>
                  )}
                </div>

                {/* NOB Filter */}
                <div className="flex-1 min-w-[110px] sm:flex-initial sm:w-28">
                  <select
                    value={nobFilter}
                    onChange={(e) => {
                      setNobFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All NOB</option>
                    {Array.from(new Set(filterSource.map((item) => getEntryNob(item))))
                      .filter(Boolean)
                      .map((nob) => (
                        <option key={nob} value={nob}>{nob}</option>
                      ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All Dates</option>
                    {activeTab === "pending" ? (
                      <>
                        <option value="today">Today ({dateFilterCounts.today})</option>
                        <option value="overdue">Overdue ({dateFilterCounts.overdue})</option>
                        <option value="upcoming">Upcoming ({dateFilterCounts.upcoming})</option>
                      </>
                    ) : (
                      <>
                        <option value="today">Today's Updates</option>
                        <option value="older">Older Updates</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Followup Stage Filter Dropdown */}
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All Stages</option>
                    <option value="first">First Followup</option>
                    <option value="multi">Expected</option>
                  </select>
                </div>

                {/* Reset Filters button if any active */}
                {(companyFilter !== "all" || divisionFilter !== "all" || personFilter !== "all" || nobFilter !== "all" || dateFilter !== "all" || filterType !== "all" || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyFilter("all")
                      setDivisionFilter("all")
                      setPersonFilter(isUserSalesPerson && currentUser?.username ? currentUser.username : "all")
                      setNobFilter("all")
                      setDateFilter("all")
                      setFilterType("all")
                      setSearchTerm("")
                      setCurrentPage(1)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer whitespace-nowrap h-[36px] flex items-center gap-1"
                  >
                    <X size={13} /> Reset Filters
                  </button>
                )}
              </>
            )
          })()}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-4">Loading quotation tracker data...</p>
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <div className="w-full">
                <DataTable
                  headers={pendingHeaders}
                  data={paginatedPending}
                  renderRow={renderPendingRow}
                  renderCard={renderPendingCard}
                  minWidth="1200px"
                  currentPage={currentPage}
                  totalPages={pendingTotalPages}
                  itemsPerPage={itemsPerPage}
                  totalResults={filteredPending.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                />
              </div>
            )}

            {activeTab === "history" && (
              <div className="w-full">
                <DataTable
                  headers={historyHeaders}
                  data={paginatedHistory}
                  renderRow={renderHistoryRow}
                  renderCard={renderHistoryCard}
                  minWidth="1200px"
                  currentPage={currentPage}
                  totalPages={historyTotalPages}
                  itemsPerPage={itemsPerPage}
                  totalResults={filteredHistory.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Quotation Update Modal Form */}
      {showPopup && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 ${fadeIn}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={closePopup}></div>
          <div className={`relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 ${slideIn}`}>
            
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-slate-800 px-3.5 sm:px-5 py-3 sm:py-4 flex justify-between items-center gap-2.5 sm:gap-4 flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate block">
                    Quotation Update: {selectedEntry?.quotationNo}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 truncate block mt-0.5">
                    Record customer response and update quotation progress
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePopup}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 focus:outline-none p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-6 space-y-5">
                
                {/* 1. Quotation Detail Summary at the Top */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Quotation Detail
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950 px-2.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                      {selectedEntry?.quotationNo}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 dark:text-slate-400 block">Company Name</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200 truncate block" title={selectedEntry?.companyName}>
                        {selectedEntry?.companyName || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-400 block">Division</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200 truncate block">
                        {selectedEntry?.division || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-400 block">Quotation Date</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200 block">
                        {selectedEntry?.date || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-400 block">Freight Type</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200 block">
                        {selectedEntry?.freightType || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-400 block">Total Amount</span>
                      <span className="font-bold text-gray-900 dark:text-white block text-sm">
                        ₹{Number(selectedEntry?.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-400 block">Advance Payment</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200 block">
                        {selectedEntry?.advancePayment === "Yes" ? `Yes (₹${Number(selectedEntry.advanceAmount || 0).toLocaleString("en-IN")})` : "No"}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                      <span className="text-gray-400 dark:text-slate-400 block mb-1">Quotation Copy</span>
                      <button
                        type="button"
                        onClick={() => handleViewQuotation(selectedEntry)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded-md transition-colors shadow-xs cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Quotation Copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Base Fields: Lead No., Attachment, Interaction Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Lead Number</label>
                    <input
                      type="text"
                      value={formData.leadNo}
                      readOnly
                      className={`${inputClass} bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 cursor-not-allowed`}
                      placeholder="Lead Number"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Interaction Type</label>
                    <select
                      value={formData.interactionType}
                      onChange={(e) => handleFieldChange("interactionType", e.target.value)}
                      className={inputClass}
                    >
                      {INTERACTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <LeadAttachmentUpload
                      id="quotation-form-attachment"
                      label="Attachment"
                      value={formData.attachment}
                      locationValue={formData.attachmentLocation}
                      fileName={formData.attachmentName}
                      onChange={(base64, locationMeta, name) => {
                        setFormData((prev) => ({
                          ...prev,
                          attachment: base64,
                          attachmentName: name || prev.attachmentName || "Attachment",
                          attachmentLocation: locationMeta
                        }))
                      }}
                      onClear={() => {
                        setFormData((prev) => ({
                          ...prev,
                          attachment: "",
                          attachmentName: "",
                          attachmentLocation: null
                        }))
                      }}
                      onRequestLocationModal={() => setShowLocationModal(true)}
                      buttonText="Choose file..."
                    />
                  </div>
                </div>

                {/* 3. What did customer said */}
                <div>
                  <label className={labelClass}>What did customer said?</label>
                  <textarea
                    rows={2}
                    value={formData.customerSaid}
                    onChange={(e) => handleFieldChange("customerSaid", e.target.value)}
                    className={inputClass}
                    placeholder="Enter customer feedback or summary of discussion..."
                  />
                </div>

                {/* 4. Status Section (Radio Options) */}
                <div className="space-y-2">
                  <label className={labelClass}>Status <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    
                    {/* Negotiation */}
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.status === "Negotiation"
                          ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs"
                          : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Negotiation"
                        checked={formData.status === "Negotiation"}
                        onChange={() => handleFieldChange("status", "Negotiation")}
                        className="sr-only"
                      />
                      <Clock size={16} className={`mb-1 ${formData.status === "Negotiation" ? "text-indigo-600" : "text-gray-400"}`} />
                      <span className="text-xs text-center">Negotiation</span>
                    </label>

                    {/* Order Received */}
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.status === "Order Received"
                          ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs"
                          : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Order Received"
                        checked={formData.status === "Order Received"}
                        onChange={() => handleFieldChange("status", "Order Received")}
                        className="sr-only"
                      />
                      <CheckCircle2 size={16} className={`mb-1 ${formData.status === "Order Received" ? "text-emerald-600" : "text-gray-400"}`} />
                      <span className="text-xs text-center">Order Received</span>
                    </label>

                    {/* Awaiting Payment */}
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.status === "Awaiting Payment"
                          ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold shadow-xs"
                          : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Awaiting Payment"
                        checked={formData.status === "Awaiting Payment"}
                        onChange={() => handleFieldChange("status", "Awaiting Payment")}
                        className="sr-only"
                      />
                      <AlertCircle size={16} className={`mb-1 ${formData.status === "Awaiting Payment" ? "text-amber-600" : "text-gray-400"}`} />
                      <span className="text-xs text-center">Awaiting Payment</span>
                    </label>

                    {/* Order Not Received */}
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.status === "Order Not Received"
                          ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold shadow-xs"
                          : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="Order Not Received"
                        checked={formData.status === "Order Not Received"}
                        onChange={() => handleFieldChange("status", "Order Not Received")}
                        className="sr-only"
                      />
                      <XCircle size={16} className={`mb-1 ${formData.status === "Order Not Received" ? "text-rose-600" : "text-gray-400"}`} />
                      <span className="text-xs text-center">Order Not Received</span>
                    </label>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {formData.status === "Negotiation" && "• Quotation remains active in Pending for follow-up."}
                    {formData.status === "Awaiting Payment" && "• Quotation remains in Pending until payment is received."}
                    {formData.status === "Order Received" && "• Quotation converts to order and moves into History."}
                    {formData.status === "Order Not Received" && "• Quotation closes out and moves into History."}
                    {!formData.status && "• Select a status to reveal its specific details."}
                  </p>
                </div>

                {/* 5. Conditional Dynamic Sections based on Status */}

                {/* Status: Negotiation */}
                {formData.status === "Negotiation" && (
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                      Negotiation Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Next Followup <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={formData.nextFollowup}
                          onChange={(e) => handleFieldChange("nextFollowup", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Remarks</label>
                        <textarea
                          rows={2}
                          value={formData.remarks}
                          onChange={(e) => handleFieldChange("remarks", e.target.value)}
                          className={inputClass}
                          placeholder="Enter negotiation remarks..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Status: Order Received */}
                {formData.status === "Order Received" && (
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4">
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                      Order Received Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* Advance Payment - Read-only if Yes in quotation, hidden if not selected */}
                      {selectedEntry?.advancePayment === "Yes" && (
                        <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                          <label className={labelClass}>Advance Payment</label>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Yes
                            </span>
                            {selectedEntry?.advanceAmount && (
                              <div className="flex-1 max-w-xs">
                                <input
                                  type="text"
                                  value={`₹${Number(selectedEntry.advanceAmount).toLocaleString("en-IN")}`}
                                  readOnly
                                  className={`${inputClass} bg-gray-50 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 font-bold cursor-not-allowed`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* PO Number */}
                      <div>
                        <label className={labelClass}>PO Number <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.poNumber}
                          onChange={(e) => handleFieldChange("poNumber", e.target.value)}
                          className={inputClass}
                          placeholder="Enter PO number"
                        />
                      </div>

                      {/* PO Date */}
                      <div>
                        <label className={labelClass}>PO Date <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={formData.poDate}
                          onChange={(e) => handleFieldChange("poDate", e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      {/* Expected Delivery Date */}
                      <div>
                        <label className={labelClass}>Expected Delivery Date</label>
                        <input
                          type="date"
                          value={formData.expectedDeliveryDate}
                          onChange={(e) => handleFieldChange("expectedDeliveryDate", e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      {/* GST Number */}
                      <div>
                        <label className={labelClass}>GST Number</label>
                        <input
                          type="text"
                          value={formData.gstNumber}
                          onChange={(e) => handleFieldChange("gstNumber", e.target.value)}
                          className={inputClass}
                          placeholder="Enter GST number"
                        />
                      </div>

                      {/* PO Copy */}
                      <div className="sm:col-span-2">
                        <LeadAttachmentUpload
                          id="quotation-form-po-copy"
                          label="PO Copy"
                          value={formData.poCopy}
                          fileName={formData.poCopyName}
                          captureLocation={false}
                          onChange={(base64, _locationMeta, name) => {
                            setFormData((prev) => ({
                              ...prev,
                              poCopy: base64,
                              poCopyName: name || prev.poCopyName || "PO Copy",
                              poCopyLocation: null
                            }))
                          }}
                          onClear={() => {
                            setFormData((prev) => ({
                              ...prev,
                              poCopy: "",
                              poCopyName: "",
                              poCopyLocation: null
                            }))
                          }}
                          buttonText="Upload PO copy (PDF, Image)..."
                        />
                      </div>

                      {/* Remarks */}
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className={labelClass}>Remarks</label>
                        <textarea
                          rows={2}
                          value={formData.remarks}
                          onChange={(e) => handleFieldChange("remarks", e.target.value)}
                          className={inputClass}
                          placeholder="Enter order remarks..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Status: Awaiting Payment */}
                {formData.status === "Awaiting Payment" && (
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-4">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                      Awaiting Payment Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Next Followup Date <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={formData.nextFollowupDate}
                          onChange={(e) => handleFieldChange("nextFollowupDate", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Remarks</label>
                        <textarea
                          rows={2}
                          value={formData.remarks}
                          onChange={(e) => handleFieldChange("remarks", e.target.value)}
                          className={inputClass}
                          placeholder="Enter payment followup remarks..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Status: Order Not Received */}
                {formData.status === "Order Not Received" && (
                  <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-4">
                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                      Order Not Received Details
                    </h4>
                    <div>
                      <label className={labelClass}>Reason <span className="text-red-500">*</span></label>
                      <textarea
                        rows={3}
                        value={formData.reason}
                        onChange={(e) => handleFieldChange("reason", e.target.value)}
                        className={inputClass}
                        placeholder="State reason why order was not received (e.g., Price high, Competitor selected, Project cancelled)..."
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={closePopup}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.status}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium text-sm rounded-md transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive View Details Popup Modal */}
      {showViewModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 ${fadeIn}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowViewModal(false)}></div>
          <div
            className={`relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 ${slideIn}`}
          >
            {/* Modal Header */}
            <div className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-gray-200 dark:border-slate-800 px-3.5 sm:px-6 py-3 sm:py-5 flex justify-between items-center gap-2.5 sm:gap-4 flex-shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate block">
                    Quotation Details: {selectedViewEntry?.quotationNo || selectedViewEntry?.leadNo}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 truncate block mt-0.5">
                    Lead No: {selectedViewEntry?.leadNo || "-"} • Division: {selectedViewEntry?.division || "-"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-6">
                
                {/* Quotation & Status Summary */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Quotation Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Quotation Number</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white break-words">{selectedViewEntry?.quotationNo}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Lead Number</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white break-words">{selectedViewEntry?.leadNo || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Quotation Date</p>
                      <p className="text-base text-gray-900 dark:text-white">{formatPopupDate(selectedViewEntry?.quotationDate || selectedViewEntry?.date || selectedViewEntry?.quotationData?.quotationDate || selectedViewEntry?.quotationData?.date || selectedViewEntry?.quotationData?.quotation_at || selectedViewEntry?.quotationData?.created_at || selectedViewEntry?.createdAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Status</p>
                      <div>{renderStatusBadge(selectedViewEntry?.status)}</div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Planned Date</p>
                      <p className="text-base font-medium text-gray-900 dark:text-white">
                        {calculateLeadsTat(selectedViewEntry, LEADS_STAGE_KEYS.QUOTATION_TRACKER, tatRules).plannedFormatted || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Delay / TAT Status</p>
                      <div>
                        <TatDelayBadge tat={calculateLeadsTat(selectedViewEntry, LEADS_STAGE_KEYS.QUOTATION_TRACKER, tatRules)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Amount</p>
                      <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                        ₹{Number(selectedViewEntry?.grandTotal || selectedViewEntry?.quotationData?.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Advance Payment</p>
                      <p className="text-base text-gray-900 dark:text-white font-medium">
                        {selectedViewEntry?.advancePayment || "No"}
                        {selectedViewEntry?.advanceAmount ? ` (₹${Number(selectedViewEntry.advanceAmount).toLocaleString("en-IN")})` : ""}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Next Followup</p>
                      <p className="text-base text-gray-900 dark:text-white">{selectedViewEntry?.nextFollowup || selectedViewEntry?.nextFollowupDate || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Company & Contact Details */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Company & Contact Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Company Name</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white break-words">{selectedViewEntry?.companyName || selectedViewEntry?.quotationData?.companyName || selectedViewEntry?.quotationData?.consignee_name || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Contact Person</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">
                        {selectedViewEntry?.contactPerson || selectedViewEntry?.contactName || selectedViewEntry?.personName || selectedViewEntry?.quotationData?.contactName || selectedViewEntry?.quotationData?.contactPerson || selectedViewEntry?.quotationData?.contact_name || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Phone Number</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">
                        {selectedViewEntry?.phoneNumber || selectedViewEntry?.contactNo || selectedViewEntry?.contactNumber || selectedViewEntry?.phone || selectedViewEntry?.quotationData?.contactNo || selectedViewEntry?.quotationData?.phoneNumber || selectedViewEntry?.quotationData?.contact_no || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Email Address</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">
                        {selectedViewEntry?.email || selectedViewEntry?.emailAddress || selectedViewEntry?.quotationData?.email || selectedViewEntry?.quotationData?.emailAddress || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Division</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">{selectedViewEntry?.division || selectedViewEntry?.consigneeDivision || selectedViewEntry?.quotationData?.division || selectedViewEntry?.quotationData?.consignee_division || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Nature of Business</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">{selectedViewEntry?.nob || selectedViewEntry?.quotationData?.nob || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">State</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">{selectedViewEntry?.state || selectedViewEntry?.quotationData?.state || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">City / Location</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">{selectedViewEntry?.city || selectedViewEntry?.quotationData?.city || "-"}</p>
                    </div>
                  </div>
                  {(selectedViewEntry?.billingAddress || selectedViewEntry?.quotationData?.billingAddress || selectedViewEntry?.address) && (
                    <div className="space-y-1 pt-2">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Billing Address</p>
                      <p className="text-base text-gray-800 dark:text-slate-200 break-words italic">
                        "{selectedViewEntry?.billingAddress || selectedViewEntry?.quotationData?.billingAddress || selectedViewEntry?.address}"
                      </p>
                    </div>
                  )}
                  {(selectedViewEntry?.shippingAddress || selectedViewEntry?.quotationData?.shippingAddress) && (
                    <div className="space-y-1 pt-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Shipping Address</p>
                      <p className="text-base text-gray-800 dark:text-slate-200 break-words italic">
                        "{selectedViewEntry?.shippingAddress || selectedViewEntry?.quotationData?.shippingAddress}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Commercial & Terms */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Commercial & Terms</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Freight Type</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">{selectedViewEntry?.freightType || selectedViewEntry?.quotationData?.freightType || selectedViewEntry?.quotationData?.freight_type || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Payment Terms</p>
                      <p className="text-base text-gray-900 dark:text-white break-words">
                        {getExactPaymentTerms(selectedViewEntry)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quotation Items & Products Table (if available) */}
                {((selectedViewEntry?.quotationData?.items && selectedViewEntry.quotationData.items.length > 0) || (selectedViewEntry?.items && selectedViewEntry.items.length > 0)) && (
                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        Quotation Items ({(selectedViewEntry.quotationData?.items || selectedViewEntry.items).length})
                      </h4>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-xs sm:text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300 font-semibold">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Item Name / Description</th>
                            <th className="px-3 py-2 text-left">HSN/SAC</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-center">UOM</th>
                            <th className="px-3 py-2 text-right">Rate (₹)</th>
                            <th className="px-3 py-2 text-right">Disc %</th>
                            <th className="px-3 py-2 text-right">GST %</th>
                            <th className="px-3 py-2 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {(selectedViewEntry.quotationData?.items || selectedViewEntry.items).map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                              <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                              <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{item.item || item.item_name || item.name || "-"}</td>
                              <td className="px-3 py-2 text-gray-500">{item.hsn || item.hsn_code || "-"}</td>
                              <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{item.qty || item.quantity || 1}</td>
                              <td className="px-3 py-2 text-center text-gray-700 dark:text-slate-300">{item.uom || item.unit || "-"}</td>
                              <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">₹{Number(item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{Number(item.discountPercent || item.discount_percent || 0)}%</td>
                              <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{Number(item.gst ?? item.gst_percent ?? 18)}%</td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                                ₹{Number(item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Summary */}
                    {(() => {
                      const summary = computeItemsSummary(selectedViewEntry.quotationData?.items || selectedViewEntry.items)
                      return (
                        <div className="flex justify-end pt-2">
                          <div className="w-full sm:w-72 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-1.5 text-xs sm:text-sm">
                            <div className="flex justify-between text-gray-600 dark:text-slate-400">
                              <span>Base Amount:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                ₹{Number(summary.basePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {summary.discountAmount > 0 && (
                              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                <span>Discount:</span>
                                <span className="font-medium">
                                  - ₹{Number(summary.discountAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            {summary.discountAmount > 0 && (
                              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                                <span>Taxable Amount:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  ₹{Number(summary.taxableAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-gray-600 dark:text-slate-400">
                              <span>GST Amount:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                + ₹{Number(summary.gstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-slate-700 font-bold text-sm text-gray-900 dark:text-white">
                              <span>Grand Total:</span>
                              <span className="text-sky-600 dark:text-sky-400">
                                ₹{Number(summary.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Customer Interaction & Remarks / Reason */}
                {(selectedViewEntry?.customerSaid || selectedViewEntry?.customerFeedback || selectedViewEntry?.remarks || selectedViewEntry?.reason) && (
                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Feedback & Remarks</h4>
                    
                    {selectedViewEntry?.interactionType && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Interaction Type</p>
                        <p className="text-base text-gray-900 dark:text-white">{selectedViewEntry.interactionType}</p>
                      </div>
                    )}

                    {(selectedViewEntry?.customerSaid || selectedViewEntry?.customerFeedback) && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">What Did Customer Said</p>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-md">
                          <p className="text-sm text-gray-800 dark:text-slate-200 break-words">
                            {selectedViewEntry.customerSaid || selectedViewEntry.customerFeedback}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedViewEntry?.reason && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Order Not Received Reason</p>
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-md">
                          <p className="text-sm text-rose-800 dark:text-rose-200 break-words">
                            {selectedViewEntry.reason}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedViewEntry?.remarks && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Remarks</p>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-md">
                          <p className="text-sm text-gray-800 dark:text-slate-200 break-words">
                            {selectedViewEntry.remarks}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Follow-up & Action History Timeline */}
                {(() => {
                  const currentQuoteNo = selectedViewEntry?.quotationNo?.toLowerCase() || ""
                  const currentLeadNo = (selectedViewEntry?.leadNo || "").toLowerCase()
                  const quoteHistory = selectedViewEntry?.allHistory || historyEntries.filter((h) => {
                    const hQuote = (h.quotationNo || "").toLowerCase()
                    const hLead = (h.leadNo || "").toLowerCase()
                    return (currentQuoteNo && hQuote === currentQuoteNo) || (currentLeadNo && hLead && hLead === currentLeadNo)
                  })

                  return (
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                          Action & Follow-up History
                        </h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {quoteHistory.length} {quoteHistory.length === 1 ? "Action" : "Actions"}
                        </span>
                      </div>
                      {quoteHistory.length > 0 ? (
                        <div className="space-y-3">
                          {quoteHistory.map((historyItem, idx) => (
                            <div key={idx} className="p-4 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 shadow-xs relative">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2.5 gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-md w-fit">
                                    {formatHistoryDate(historyItem.updatedAt)}
                                  </div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    Action #{quoteHistory.length - idx}
                                  </span>
                                </div>
                                <div>
                                  {renderStatusBadge(historyItem.status)}
                                </div>
                              </div>
                              <div className="space-y-1.5 mt-2 text-xs sm:text-sm">
                                {historyItem.interactionType && (
                                  <div className="text-gray-700 dark:text-slate-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">Interaction: </span>
                                    {historyItem.interactionType}
                                  </div>
                                )}
                                {(historyItem.customerSaid || historyItem.customerFeedback) && (
                                  <div className="text-gray-700 dark:text-slate-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">What Customer Said: </span>
                                    {historyItem.customerSaid || historyItem.customerFeedback}
                                  </div>
                                )}
                                {historyItem.nextFollowup && (
                                  <div className="text-gray-700 dark:text-slate-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">Next Follow-up: </span>
                                    {historyItem.nextFollowup}
                                  </div>
                                )}
                                {historyItem.poNumber && (
                                  <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    <span className="font-semibold text-gray-900 dark:text-white">PO Number: </span>
                                    {historyItem.poNumber} {historyItem.poDate && `(Date: ${historyItem.poDate})`}
                                  </div>
                                )}
                                {historyItem.reason && (
                                  <div className="text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200/60 dark:border-rose-900/50">
                                    <span className="font-semibold text-rose-900 dark:text-rose-200">Reason: </span>
                                    {historyItem.reason}
                                  </div>
                                )}
                                {historyItem.remarks && (
                                  <div className="text-gray-700 dark:text-slate-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">Remarks: </span>
                                    {historyItem.remarks}
                                  </div>
                                )}
                                {historyItem.attachment && (
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <span className="font-semibold text-gray-900 dark:text-white">Attachment: </span>
                                    <a
                                      href={historyItem.attachment}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                                    >
                                      <FileText size={13} /> {historyItem.attachmentName || "View Attachment"}
                                    </a>
                                    {historyItem.attachmentLocation && (
                                      <a
                                        href={`https://www.google.com/maps?q=${historyItem.attachmentLocation.latitude},${historyItem.attachmentLocation.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
                                      >
                                        <MapPin size={11} className="text-emerald-600 dark:text-emerald-400" />
                                        {historyItem.attachmentLocation.address || "GPS Location"}
                                      </a>
                                    )}
                                  </div>
                                )}
                                {historyItem.poCopy && (
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">PO Copy: </span>
                                    <a
                                      href={historyItem.poCopy}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                    >
                                      <FileText size={13} /> {historyItem.poCopyName || "View PO Copy"}
                                    </a>
                                    {historyItem.poCopyLocation && (
                                      <a
                                        href={`https://www.google.com/maps?q=${historyItem.poCopyLocation.latitude},${historyItem.poCopyLocation.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
                                      >
                                        <MapPin size={11} className="text-emerald-600 dark:text-emerald-400" />
                                        {historyItem.poCopyLocation.address || "GPS Location"}
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-center text-xs text-gray-500 dark:text-slate-400">
                          No previous action history recorded yet for this quotation.
                        </div>
                      )}
                    </div>
                  )
                })()}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleViewQuotation(selectedViewEntry)}
                className="w-full sm:w-auto px-4 py-2 border border-sky-200 dark:border-sky-800 rounded-md text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="h-4 w-4" /> View Quotation Copy
              </button>
              {(!selectedViewEntry?.status || selectedViewEntry?.status === "Hold" || selectedViewEntry?.status === "Negotiation" || selectedViewEntry?.status === "Awaiting Payment" || selectedViewEntry?.status === "Pending Review") && (
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false)
                    openPopup(selectedViewEntry)
                  }}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium text-sm rounded-md transition-colors shadow-sm"
                >
                  Update Status
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </div>
  )
}

export default QuotationTracker

