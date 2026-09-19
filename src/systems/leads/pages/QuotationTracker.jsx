import { useState, useEffect, useContext } from "react"
import { Wallet, Upload, CheckCircle2, Clock, XCircle, AlertCircle, FileText } from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import DataTable from "../components/DataTable"
import { SearchIcon, DownloadIcon } from "../components/Icons"
import nutechLogo from "../../../assets/nutech-logo.png"
import { buildQuotationPdf } from "./Quotation"

const fadeIn = "animate-in fade-in duration-300"
const slideIn = "animate-in slide-in-from-right duration-300"

const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
const labelClass = "block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1"

const INTERACTION_TYPES = ["Call", "Email", "Meeting / Visit", "WhatsApp", "Other"]

const initialFormData = {
  leadNo: "",
  attachmentName: "",
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
  poCopyName: "",
  nextFollowupDate: "",
  reason: "",
}

function QuotationTracker() {
  const { showNotification } = useContext(AuthContext)

  const [activeTab, setActiveTab] = useState("pending")
  const [pendingEntries, setPendingEntries] = useState([])
  const [historyEntries, setHistoryEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Company / Division filters — shared across Pending and History
  const [companyFilter, setCompanyFilter] = useState("all")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)

  // Column visibility
  const [pendingVisibleColumns, setPendingVisibleColumns] = useState({
    leadNo: true,
    companyName: true,
    division: true,
    date: true,
    freightType: true,
    totalAmount: true,
    advancePayment: true,
    advanceAmount: true,
    status: true,
    nextFollowup: true,
    quotation: true,
  })
  const [historyVisibleColumns, setHistoryVisibleColumns] = useState({
    updated: true,
    leadNo: true,
    companyName: true,
    division: true,
    status: true,
    poNumber: true,
    advanceAmount: true,
    remarks: true,
    quotation: true,
  })

  const pendingColumnOptions = [
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "division", label: "Division" },
    { key: "date", label: "Date" },
    { key: "freightType", label: "Freight Type" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "advancePayment", label: "Advance Payment" },
    { key: "advanceAmount", label: "Advance Amount" },
    { key: "status", label: "Status" },
    { key: "nextFollowup", label: "Next Followup" },
    { key: "quotation", label: "Quotation" },
  ]

  const historyColumnOptions = [
    { key: "updated", label: "Updated" },
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "division", label: "Division" },
    { key: "status", label: "Status" },
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
      const data = await mockApi.fetchAdvancePayments()
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
  }, [])

  const handleViewQuotation = (entry) => {
    if (!entry.quotationData) {
      showNotification("Quotation details are not available to generate PDF.", "error")
      return
    }
    try {
      const doc = buildQuotationPdf(entry.quotationData, logoDataUri)
      doc.save(`Quotation_${(entry.quotationNo || "quotation").replace(/\//g, "-")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      showNotification("Failed to generate PDF", "error")
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    setCompanyFilter("all")
    setDivisionFilter("all")
  }, [activeTab])

  const openPopup = (entry) => {
    setSelectedEntry(entry)
    setFormData({
      leadNo: entry.leadNo || "",
      attachmentName: entry.attachmentName || "",
      interactionType: entry.interactionType || "Call",
      customerSaid: entry.customerSaid || entry.customerFeedback || "",
      status: entry.status || "",
      nextFollowup: entry.nextFollowup || "",
      remarks: entry.remarks || "",
      advancePayment: entry.advancePayment === "Yes" ? "Yes" : "No",
      advanceAmount: entry.advanceAmount || "",
      poNumber: entry.poNumber || "",
      poDate: entry.poDate || "",
      expectedDeliveryDate: entry.expectedDeliveryDate || "",
      gstNumber: entry.gstNumber || entry.gstin || entry.gst || entry.quotationData?.gst || "",
      poCopyName: entry.poCopyName || "",
      nextFollowupDate: entry.nextFollowupDate || entry.nextFollowup || "",
      reason: entry.reason || "",
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

  const handleAttachmentUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, attachmentName: file.name }))
    }
  }

  const handlePoCopyUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, poCopyName: file.name }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEntry) return
    if (!formData.status) {
      showNotification("Please select a status for this quotation update", "error")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        nextFollowup: formData.status === "Negotiation" ? formData.nextFollowup : (formData.status === "Awaiting Payment" ? formData.nextFollowupDate : ""),
      }

      const result = await mockApi.submitAdvancePaymentUpdate(selectedEntry.quotationNo, payload)

      if (result.success) {
        showNotification("Quotation update recorded successfully", "success")
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

  const matchesSearch = (entry) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (entry.quotationNo && entry.quotationNo.toLowerCase().includes(q)) ||
      (entry.companyName && entry.companyName.toLowerCase().includes(q)) ||
      (entry.division && entry.division.toLowerCase().includes(q)) ||
      (entry.leadNo && entry.leadNo.toLowerCase().includes(q))
    )
  }

  const matchesCompanyFilter = (entry) => companyFilter === "all" || entry.companyName === companyFilter
  const matchesDivisionFilter = (entry) => divisionFilter === "all" || entry.division === divisionFilter

  const filteredPending = pendingEntries.filter((e) => matchesSearch(e) && matchesCompanyFilter(e) && matchesDivisionFilter(e))
  const filteredHistory = historyEntries.filter((e) => matchesSearch(e) && matchesCompanyFilter(e) && matchesDivisionFilter(e))

  const pendingTotalPages = Math.ceil(filteredPending.length / itemsPerPage)
  const paginatedPending = filteredPending.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const historyTotalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const pendingHeaders = [
    "Actions", "Quotation No.",
    ...pendingColumnOptions.filter((opt) => pendingVisibleColumns[opt.key]).map((opt) => opt.label)
  ]

  const renderPendingRow = (entry, index) => (
    <tr key={`${entry.quotationNo}-${index}`} className="hover:bg-slate-50 transition-colors">
      <td className="sticky left-0 z-10 bg-white px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium border-r border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => openPopup(entry)}
            className="px-2.5 sm:px-3 py-1 text-xs font-medium border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md transition-colors whitespace-nowrap"
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
      {pendingVisibleColumns.status && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
          {renderStatusBadge(entry.status)}
        </td>
      )}
      {pendingVisibleColumns.nextFollowup && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
          {entry.nextFollowup || entry.nextFollowupDate || "-"}
        </td>
      )}
      {pendingVisibleColumns.quotation && (
        <td className="px-3 sm:px-4 py-3 sm:py-4">
          <button
            onClick={() => handleViewQuotation(entry)}
            className="inline-flex items-center px-2.5 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md whitespace-nowrap"
          >
            <DownloadIcon className="h-3.5 w-3.5 mr-1" /> View PDF
          </button>
        </td>
      )}
    </tr>
  )

  const renderPendingCard = (entry, index) => (
    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
              {entry.quotationNo}
            </span>
            {renderStatusBadge(entry.status)}
          </div>
          <h3 className="font-bold text-gray-900 text-base">{entry.companyName}</h3>
          <p className="text-xs text-gray-500">Lead {entry.leadNo || "-"} • {entry.division || "-"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-400">Total Amount</p>
          <p className="font-semibold text-gray-900">₹{Number(entry.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-gray-400">Advance Payment</p>
          <p className="font-medium text-gray-700">{entry.advancePayment || "No"}</p>
        </div>
        <div>
          <p className="text-gray-400">Next Followup</p>
          <p className="font-medium text-gray-700">{entry.nextFollowup || entry.nextFollowupDate || "-"}</p>
        </div>
        <div>
          <p className="text-gray-400">Date</p>
          <p className="font-medium text-gray-700">{entry.date || "-"}</p>
        </div>
      </div>
      <div className="pt-2 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => openPopup(entry)}
          className="flex-1 py-1.5 border border-sky-600 rounded-md text-xs font-medium text-sky-600 bg-white hover:bg-sky-50 text-center"
        >
          Update Status
        </button>
        <button
          onClick={() => handleViewQuotation(entry)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )

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
      {historyVisibleColumns.division && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[100px] sm:max-w-[120px] truncate" title={entry.division}>{entry.division || "-"}</div>
        </td>
      )}
      {historyVisibleColumns.status && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
          {renderStatusBadge(entry.status)}
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
          <div className="max-w-[180px] sm:max-w-[240px] truncate" title={entry.remarks || entry.reason || ""}>
            {entry.remarks || entry.reason || "-"}
          </div>
        </td>
      )}
      {historyVisibleColumns.quotation && (
        <td className="px-3 sm:px-4 py-3 sm:py-4">
          <button
            onClick={() => handleViewQuotation(entry)}
            className="inline-flex items-center px-2.5 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md whitespace-nowrap"
          >
            <DownloadIcon className="h-3.5 w-3.5 mr-1" /> View PDF
          </button>
        </td>
      )}
    </tr>
  )

  const renderHistoryCard = (entry, index) => (
    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold text-gray-400">{formatHistoryDate(entry.updatedAt)}</span>
          <h3 className="font-bold text-gray-900 text-base">{entry.companyName}</h3>
          <p className="text-xs text-sky-600 font-medium">{entry.quotationNo}</p>
          <p className="text-xs text-gray-500">Lead {entry.leadNo || "-"}</p>
        </div>
        {renderStatusBadge(entry.status)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        {entry.poNumber && (
          <div>
            <span className="block text-gray-400">PO Number</span>
            <p className="font-medium text-gray-800">{entry.poNumber}</p>
          </div>
        )}
        {entry.advanceAmount && (
          <div>
            <span className="block text-gray-400">Advance Amount</span>
            <p className="font-medium text-gray-800">₹{Number(entry.advanceAmount).toLocaleString("en-IN")}</p>
          </div>
        )}
        <div className="col-span-2">
          <span className="block text-gray-400">Remarks / Reason</span>
          <p className="truncate">{entry.remarks || entry.reason || "-"}</p>
        </div>
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
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Track quotations, record customer updates, and manage order conversion status
          </p>
        </div>
      </div>

      {/* Filters & Tabs Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:justify-between lg:items-center">
          {/* Tab Navigation */}
          <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Pending ({pendingEntries.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              History ({historyEntries.length})
            </button>
          </div>

          {/* Filters Grid */}
          <div className="flex flex-wrap items-center gap-2.5">
            {(() => {
              const filterSource = activeTab === "pending" ? pendingEntries : historyEntries
              return (
                <>
                  {/* Company Name Filter */}
                  <div className="min-w-0">
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="all">All Companies</option>
                      {Array.from(new Set(filterSource.map((item) => item.companyName)))
                        .filter(Boolean)
                        .map((company) => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                    </select>
                  </div>

                  {/* Division Filter */}
                  <div className="min-w-0">
                    <select
                      value={divisionFilter}
                      onChange={(e) => setDivisionFilter(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="all">All Divisions</option>
                      {Array.from(new Set(filterSource.map((item) => item.division)))
                        .filter(Boolean)
                        .map((division) => (
                          <option key={division} value={division}>{division}</option>
                        ))}
                    </select>
                  </div>
                </>
              )
            })()}

            {/* Column Selection Dropdown */}
            {(() => {
              const isPendingTab = activeTab === "pending"
              const activeColumnOptions = isPendingTab ? pendingColumnOptions : historyColumnOptions
              const activeVisibleColumns = isPendingTab ? pendingVisibleColumns : historyVisibleColumns
              const activeColumnToggle = isPendingTab ? handlePendingColumnToggle : handleHistoryColumnToggle
              const activeSelectAll = isPendingTab ? handlePendingSelectAll : handleHistorySelectAll

              return (
                <div className="min-w-0 relative">
                  <button
                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white flex items-center justify-between gap-2"
                  >
                    <span>Select Columns</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showColumnDropdown ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showColumnDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="p-2">
                        <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            id="select-all-adv"
                            checked={Object.values(activeVisibleColumns).every(Boolean)}
                            onChange={activeSelectAll}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                          />
                          <label htmlFor="select-all-adv" className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                            All Columns
                          </label>
                        </div>

                        <hr className="my-2" />

                        {activeColumnOptions.map((option) => (
                          <div key={option.key} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              id={`adv-column-${option.key}`}
                              checked={activeVisibleColumns[option.key]}
                              onChange={() => activeColumnToggle(option.key)}
                              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`adv-column-${option.key}`}
                              className="ml-2 text-sm text-gray-700 cursor-pointer flex-1"
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

            <div className="relative w-full lg:w-auto lg:min-w-[250px]">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="search"
                placeholder="Search Quotation / Company / Lead..."
                className="pl-8 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
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
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 ${fadeIn}`}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePopup}></div>
          <div className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 ${slideIn}`}>
            
            {/* Modal Header */}
            <div className="border-b border-gray-200 dark:border-slate-800 p-4 sm:p-5 flex justify-between items-center flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Quotation Update: {selectedEntry?.quotationNo}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Record customer response and update quotation progress
                  </p>
                </div>
              </div>
              <button
                onClick={closePopup}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 focus:outline-none p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
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
                    <div>
                      <span className="text-gray-400 dark:text-slate-400 block">Freight Type</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200 block">
                        {selectedEntry?.freightType || "-"}
                      </span>
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
                      onChange={(e) => handleFieldChange("leadNo", e.target.value)}
                      className={inputClass}
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
                    <label className={labelClass}>Attachment</label>
                    <div className="relative">
                      <input
                        type="file"
                        id="form-attachment"
                        onChange={handleAttachmentUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="form-attachment"
                        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <span className="truncate text-xs">
                          {formData.attachmentName || "Choose file..."}
                        </span>
                        <Upload size={14} className="text-gray-400 flex-shrink-0 ml-1" />
                      </label>
                    </div>
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
                      
                      {/* Advance Payment */}
                      <div className="sm:col-span-2 lg:col-span-3 space-y-2">
                        <label className={labelClass}>Advance Payment</label>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="orderAdvancePayment"
                              checked={formData.advancePayment === "Yes"}
                              onChange={() => handleFieldChange("advancePayment", "Yes")}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="orderAdvancePayment"
                              checked={formData.advancePayment === "No"}
                              onChange={() => handleFieldChange("advancePayment", "No")}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">No</span>
                          </label>

                          {formData.advancePayment === "Yes" && (
                            <div className="flex-1 max-w-xs">
                              <input
                                type="number"
                                min="0"
                                value={formData.advanceAmount}
                                onChange={(e) => handleFieldChange("advanceAmount", e.target.value)}
                                className={inputClass}
                                placeholder="Enter advance amount"
                              />
                            </div>
                          )}
                        </div>
                      </div>

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
                        <label className={labelClass}>PO Copy</label>
                        <div className="relative">
                          <input
                            type="file"
                            id="form-po-copy"
                            onChange={handlePoCopyUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="form-po-copy"
                            className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
                            <span className="truncate text-xs">
                              {formData.poCopyName || "Upload PO copy (PDF, Image)..."}
                            </span>
                            <Upload size={14} className="text-gray-400 flex-shrink-0 ml-1" />
                          </label>
                        </div>
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
    </div>
  )
}

export default QuotationTracker

