import { useState, useEffect, useContext, useMemo, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  X,
  Send,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Eye,
  RefreshCw,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import { buildQuotationPdf } from "./Quotation"
import nutechLogo from "../../../assets/nutech-logo.png"
import DataTable from "../components/DataTable"

export default function QuotationApproval() {
  const auth = useContext(AuthContext) || {}
  const currentUser = auth.currentUser
  const isAdmin = typeof auth.isAdmin === "function" ? auth.isAdmin() : !!auth.isAdmin

  const [activeTab, setActiveTab] = useState("pending") // "pending" | "approved" | "rejected"
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState({
    all: [],
    pending: [],
    approved: [],
    rejected: [],
    counts: { total: 0, pending: 0, approved: 0, rejected: 0 }
  })

  // Filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [salesPersonFilter, setSalesPersonFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Notification / Toast state
  const [notification, setNotification] = useState(null)
  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  // Modals state
  const [approveModalItem, setApproveModalItem] = useState(null)
  const [approvePhone, setApprovePhone] = useState("")
  const [approveRemarks, setApproveRemarks] = useState("")
  const [sendWhatsAppCheckbox, setSendWhatsAppCheckbox] = useState(true)
  const [isApproving, setIsApproving] = useState(false)

  const [rejectModalItem, setRejectModalItem] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [isRejecting, setIsRejecting] = useState(false)

  const [logoDataUri, setLogoDataUri] = useState("")

  // Load logo for PDF generation
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
      .catch((error) => console.error("Error loading logo for PDF in QuotationApproval:", error))
  }, [])

  // Load data
  const loadApprovals = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setIsLoading(true)
      const res = await mockApi.fetchQuotationApprovals(currentUser, isAdmin)
      setData(res)
    } catch (err) {
      console.error("Error loading quotation approvals:", err)
      showNotification("Error loading quotation approvals", "error")
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, isAdmin, showNotification])

  useEffect(() => {
    loadApprovals(true)
    const handleLeadsUpdated = () => loadApprovals(false)
    window.addEventListener("leads-updated", handleLeadsUpdated)
    return () => window.removeEventListener("leads-updated", handleLeadsUpdated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Division filter list
  const availableDivisions = useMemo(() => {
    const set = new Set()
    data.all.forEach(q => {
      if (q.division) set.add(q.division)
      if (q.consigneeDivision) set.add(q.consigneeDivision)
    })
    return Array.from(set).filter(Boolean).sort()
  }, [data.all])

  // Salespersons list
  const availableSalespersons = useMemo(() => {
    const set = new Set()
    data.all.forEach(q => {
      if (q.salesPerson) set.add(q.salesPerson)
      if (q.preparedBy) set.add(q.preparedBy)
    })
    return Array.from(set).filter(Boolean).sort()
  }, [data.all])

  // Filter current list
  const currentList = useMemo(() => {
    if (activeTab === "approved") return data.approved
    if (activeTab === "rejected") return data.rejected
    return data.pending
  }, [activeTab, data])

  const filteredList = useMemo(() => {
    return currentList.filter(item => {
      const qNum = (item.quotationNo || item.poNumber || "").toLowerCase()
      const lNum = (item.leadNo || "").toLowerCase()
      const comp = (item.consigneeName || item.companyName || "").toLowerCase()
      const contact = (item.contactName || item.contactPerson || "").toLowerCase()
      const phone = (item.contactNo || item.phoneNumber || "").toLowerCase()
      const sp = (item.salesPerson || item.preparedBy || "").toLowerCase()
      const search = searchTerm.toLowerCase().trim()

      const matchesSearch = !search ||
        qNum.includes(search) ||
        lNum.includes(search) ||
        comp.includes(search) ||
        contact.includes(search) ||
        phone.includes(search) ||
        sp.includes(search)

      const itemDiv = item.division || item.consigneeDivision || ""
      const matchesDivision = divisionFilter === "all" || itemDiv === divisionFilter

      const itemSp = item.salesPerson || item.preparedBy || ""
      const matchesSalesPerson = salesPersonFilter === "all" || itemSp === salesPersonFilter

      let matchesDate = true
      if (fromDate || toDate) {
        const itemDateStr = item.quotationDate || item.savedAt || item.createdAt
        if (itemDateStr) {
          const itemTime = new Date(itemDateStr.split("T")[0]).getTime()
          if (fromDate) {
            const fTime = new Date(fromDate).getTime()
            if (itemTime < fTime) matchesDate = false
          }
          if (toDate) {
            const tTime = new Date(toDate).getTime()
            if (itemTime > tTime) matchesDate = false
          }
        }
      }

      return matchesSearch && matchesDivision && matchesSalesPerson && matchesDate
    })
  }, [currentList, searchTerm, divisionFilter, salesPersonFilter, fromDate, toDate])

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredList.slice(start, start + itemsPerPage)
  }, [filteredList, currentPage, itemsPerPage])

  // Actions
  const handleOpenApprove = (item) => {
    setApproveModalItem(item)
    setApprovePhone(item.contactNo || item.phoneNumber || "")
    setApproveRemarks("")
    setSendWhatsAppCheckbox(true)
  }

  const handleConfirmApprove = async () => {
    if (!approveModalItem) return
    setIsApproving(true)
    try {
      const res = await mockApi.approveQuotation({
        quotationNo: approveModalItem.quotationNo,
        approvedBy: currentUser?.username || "Admin",
        remarks: approveRemarks,
        sendWhatsApp: sendWhatsAppCheckbox,
        recipientPhone: approvePhone,
        recipientName: approveModalItem.consigneeName || approveModalItem.contactName || "Customer",
      })

      if (res.success) {
        if (sendWhatsAppCheckbox && res.whatsappResult?.sent) {
          showNotification(
            `Quotation ${approveModalItem.quotationNo} approved! WhatsApp message dispatched to +${res.whatsappResult.phone}.`,
            "success"
          )
        } else if (sendWhatsAppCheckbox && !res.whatsappResult?.sent) {
          showNotification(
            `Quotation approved, but WhatsApp could not be sent: ${res.whatsappResult?.error || "Check phone format"}`,
            "error"
          )
        } else {
          showNotification(`Quotation ${approveModalItem.quotationNo} approved successfully!`, "success")
        }
        setApproveModalItem(null)
        await loadApprovals(false)
      }
    } catch (err) {
      console.error("Error approving quotation:", err)
      showNotification(`Failed to approve quotation: ${err.message}`, "error")
    } finally {
      setIsApproving(false)
    }
  }

  const handleOpenReject = (item) => {
    setRejectModalItem(item)
    setRejectReason("")
  }

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return
    if (!rejectReason.trim()) {
      showNotification("Please provide a reason for rejection", "error")
      return
    }

    setIsRejecting(true)
    try {
      const res = await mockApi.rejectQuotation({
        quotationNo: rejectModalItem.quotationNo,
        rejectedBy: currentUser?.username || "Admin",
        reason: rejectReason.trim(),
      })

      if (res.success) {
        showNotification(`Quotation ${rejectModalItem.quotationNo} has been rejected.`, "info")
        setRejectModalItem(null)
        await loadApprovals(false)
      }
    } catch (err) {
      console.error("Error rejecting quotation:", err)
      showNotification(`Failed to reject quotation: ${err.message}`, "error")
    } finally {
      setIsRejecting(false)
    }
  }

  const handleResendWhatsApp = async (item) => {
    const phone = item.approval?.whatsappPhone || item.contactNo || item.phoneNumber
    if (!phone) {
      showNotification("No phone number available for this quotation", "error")
      return
    }

    try {
      const res = await mockApi.resendQuotationWhatsApp({
        quotationNo: item.quotationNo,
        recipientPhone: phone,
        recipientName: item.consigneeName || item.contactName || "Customer",
      })
      if (res.whatsappResult?.sent) {
        showNotification(`WhatsApp notification dispatched to +${res.whatsappResult.phone} for ${item.quotationNo}!`, "success")
      } else {
        showNotification(`Failed to send WhatsApp: ${res.whatsappResult?.error || "Error"}`, "error")
      }
      await loadApprovals(false)
    } catch (err) {
      console.error("Error resending WhatsApp:", err)
      showNotification(`Failed to send WhatsApp: ${err.message}`, "error")
    }
  }

  const handleViewPdf = (item) => {
    if (item.pdfUrl) {
      window.open(item.pdfUrl, "_blank")
      return
    }
    // Generate dynamically if needed
    try {
      const doc = buildQuotationPdf(item, logoDataUri)
      const blob = doc.output("blob")
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, "_blank")
    } catch (err) {
      console.error("Error generating quotation PDF:", err)
      showNotification("Could not preview PDF document", "error")
    }
  }

  const getDirectWaLink = (item) => {
    const phone = item.approval?.whatsappPhone || item.contactNo || item.phoneNumber || ""
    const party = item.consigneeName || item.contactName || "Customer"
    return mockApi.getDirectWhatsAppUrl({
      phoneNumber: phone,
      partyName: party,
      quotationNumber: item.quotationNo,
      quotationDate: item.quotationDate || item.savedAt,
      grandTotal: item.grandTotal,
      pdfUrl: item.pdfUrl || "",
    })
  }

  const tableHeaders = [
    "Action",
    "Quotation No.",
    "Date",
    "Party / Consignee",
    "Contact Person",
    "Phone / WhatsApp",
    "Division",
    "Grand Total",
    "Approval Status",
    "WhatsApp Status",
    "Prepared By",
  ]

  const renderApprovalRow = (item, index) => {
    const isPending = (item.approvalStatus || "").toLowerCase() === "pending"
    const isApproved = (item.approvalStatus || "").toLowerCase() === "approved"
    const isRejected = (item.approvalStatus || "").toLowerCase() === "rejected"
    const waPhone = item.approval?.whatsappPhone || item.contactNo || item.phoneNumber || "-"
    const directWaLink = getDirectWaLink(item)

    return (
      <tr key={`${item.quotationNo}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
        {/* Sticky Action Column */}
        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 sm:px-4 py-3 sm:py-4 text-xs font-medium border-r border-gray-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1.5 flex-wrap min-w-[140px]">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenApprove(item)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Approve quotation & send WhatsApp to party"
                >
                  <MessageSquare size={12} />
                  <span>Approve & Send</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenReject(item)}
                  className="px-2 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Reject quotation"
                >
                  <XCircle size={12} />
                  <span>Reject</span>
                </button>
              </>
            )}

            {isApproved && (
              <>
                <button
                  type="button"
                  onClick={() => handleResendWhatsApp(item)}
                  className="px-2 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Resend WhatsApp to party"
                >
                  <RefreshCw size={12} />
                  <span>Resend WA</span>
                </button>
                {directWaLink && (
                  <a
                    href={directWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                    title="Open chat in WhatsApp Web/App"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </>
            )}

            {isRejected && (
              <button
                type="button"
                onClick={() => handleOpenApprove(item)}
                className="px-2 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                title="Re-approve quotation"
              >
                <ShieldCheck size={12} />
                <span>Re-Approve</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleViewPdf(item)}
              className="p-1.5 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-colors"
              title="View Quotation PDF"
            >
              <Eye size={13} />
            </button>
          </div>
        </td>

        {/* Quotation No */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span>{item.quotationNo || item.poNumber}</span>
            {item.revisionNumber > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                R{item.revisionNumber}
              </span>
            )}
          </div>
          {item.leadNo && (
            <p className="text-[10px] text-gray-400 font-medium">Lead: {item.leadNo}</p>
          )}
        </td>

        {/* Date */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap">
          {item.quotationDate || (item.savedAt ? item.savedAt.split("T")[0] : "-")}
        </td>

        {/* Party Name */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs font-semibold text-gray-900 dark:text-white">
          <div className="max-w-[180px] truncate" title={item.consigneeName || item.companyName}>
            {item.consigneeName || item.companyName || "-"}
          </div>
        </td>

        {/* Contact Person */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs text-gray-600 dark:text-slate-300">
          <div className="max-w-[130px] truncate" title={item.contactName || item.contactPerson}>
            {item.contactName || item.contactPerson || "-"}
          </div>
        </td>

        {/* Phone */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap">
          {waPhone !== "-" ? (
            <a href={`tel:${waPhone}`} className="hover:underline text-blue-600 dark:text-blue-400 font-medium">
              {waPhone}
            </a>
          ) : "-"}
        </td>

        {/* Division */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
          {item.division || item.consigneeDivision || "-"}
        </td>

        {/* Grand Total */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs font-black text-gray-900 dark:text-white whitespace-nowrap">
          ₹{Number(item.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>

        {/* Approval Status Badge */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
          {isApproved ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <CheckCircle2 size={11} /> Approved
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800" title={item.approval?.reason || ""}>
              <XCircle size={11} /> Rejected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              <Clock size={11} /> Pending Approval
            </span>
          )}
        </td>

        {/* WhatsApp Status Badge */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
          {isApproved ? (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Send size={10} /> Dispatched
              </span>
              {item.approval?.whatsappSentAt && (
                <span className="text-[10px] text-gray-400">
                  {new Date(item.approval.whatsappSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
              Awaiting Approval
            </span>
          )}
        </td>

        {/* Prepared / Sales */}
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs text-gray-500 whitespace-nowrap">
          {item.preparedBy || item.salesPerson || "-"}
        </td>
      </tr>
    )
  }

  const renderApprovalCard = (item, index) => {
    const isPending = (item.approvalStatus || "").toLowerCase() === "pending"
    const isApproved = (item.approvalStatus || "").toLowerCase() === "approved"
    const isRejected = (item.approvalStatus || "").toLowerCase() === "rejected"
    const waPhone = item.approval?.whatsappPhone || item.contactNo || item.phoneNumber || "-"
    const directWaLink = getDirectWaLink(item)

    return (
      <div key={`card-${item.quotationNo}-${index}`} className="bg-white dark:bg-slate-850 rounded-2xl shadow-xs border border-gray-150 dark:border-slate-800 p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {item.quotationNo}
              </span>
              {isApproved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 size={10} /> Approved
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300">
                  <XCircle size={10} /> Rejected
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300">
                  <Clock size={10} /> Pending
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{item.consigneeName || item.companyName}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.contactName || item.contactPerson} {waPhone !== "-" && `• ${waPhone}`}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400">Total</p>
            <p className="text-sm font-black text-gray-900 dark:text-white">
              ₹{Number(item.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-medium text-gray-400">Division</p>
            <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{item.division || item.consigneeDivision || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400">WhatsApp Delivery</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
              {isApproved ? "Dispatched to party" : "Awaiting Approval"}
            </p>
          </div>
          {isRejected && item.approval?.reason && (
            <div className="col-span-2 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-800/60">
              <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300">Rejection Reason:</p>
              <p className="text-xs text-rose-700 dark:text-rose-200">{item.approval.reason}</p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-slate-750 flex items-center gap-2">
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => handleOpenApprove(item)}
                className="flex-1 h-9 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>Approve & Send</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenReject(item)}
                className="h-9 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <XCircle size={13} />
                <span>Reject</span>
              </button>
            </>
          )}

          {isApproved && (
            <>
              <button
                type="button"
                onClick={() => handleResendWhatsApp(item)}
                className="flex-1 h-9 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Resend WhatsApp</span>
              </button>
              {directWaLink && (
                <a
                  href={directWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-all flex items-center justify-center gap-1"
                >
                  <ExternalLink size={13} />
                  <span>WA Web</span>
                </a>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => handleViewPdf(item)}
            className="h-9 px-3 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 border border-gray-200 dark:border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Eye size={13} />
            <span>PDF</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Visual Notification Alert */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-bold border shadow-xs animate-in fade-in duration-200 ${
          notification.type === "error"
            ? "bg-rose-50 dark:bg-rose-950/70 border-rose-200 text-rose-800 dark:text-rose-200"
            : notification.type === "info"
            ? "bg-blue-50 dark:bg-blue-950/70 border-blue-200 text-blue-800 dark:text-blue-200"
            : "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 text-emerald-800 dark:text-emerald-200"
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{notification.message}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckSquare size={22} />
            </div>
            Quotation Approval
            {data.counts.pending > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                {data.counts.pending} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Review and approve quotations before dispatch. Only approved quotations are sent to the party via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/leads/pending-quotation"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs cursor-pointer h-[38px] whitespace-nowrap"
          >
            <FileText size={14} />
            <span>Create Quotation</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Quotations</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">{data.counts.total}</p>
          <p className="text-[11px] text-gray-500 mt-1">Generated by sales team</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Approval</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{data.counts.pending}</p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1">Awaiting dispatch approval</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved & Sent</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{data.counts.approved}</p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">Delivered via WhatsApp</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rejected</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <XCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{data.counts.rejected}</p>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1">Returned for revision</p>
        </div>
      </div>

      {/* Main Table & Filter Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
        {/* Tabs and Search row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          {/* Tabs */}
          <div className="grid grid-cols-3 sm:inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Clock size={14} className={activeTab === "pending" ? "text-amber-600" : "text-gray-400"} />
              <span>Pending</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "pending"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}>
                {data.counts.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("approved"); setCurrentPage(1); }}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "approved"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <CheckCircle2 size={14} className={activeTab === "approved" ? "text-emerald-600" : "text-gray-400"} />
              <span>Approved</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "approved"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}>
                {data.counts.approved}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("rejected"); setCurrentPage(1); }}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "rejected"
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <XCircle size={14} className={activeTab === "rejected" ? "text-rose-600" : "text-gray-400"} />
              <span>Rejected</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "rejected"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}>
                {data.counts.rejected}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search quotation, lead, company, contact, salesperson..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white h-[36px]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[130px] sm:flex-initial sm:w-44">
            <select
              value={divisionFilter}
              onChange={(e) => { setDivisionFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
            >
              <option value="all">All Divisions</option>
              {availableDivisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[130px] sm:flex-initial sm:w-44">
            <select
              value={salesPersonFilter}
              onChange={(e) => { setSalesPersonFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
            >
              <option value="all">All Salespersons</option>
              {availableSalespersons.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 border border-gray-200 dark:border-slate-750 rounded-xl h-[36px]">
            <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-750 rounded-lg text-xs px-2 py-0.5 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 h-[26px]"
            />
            <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-750 rounded-lg text-xs px-2 py-0.5 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 h-[26px]"
            />
          </div>

          {(searchTerm || divisionFilter !== "all" || salesPersonFilter !== "all" || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("")
                setDivisionFilter("all")
                setSalesPersonFilter("all")
                setFromDate("")
                setToDate("")
                setCurrentPage(1)
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors h-[36px] cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Content Table / Cards */}
        {isLoading && data.all.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-4">Loading quotations for approval...</p>
          </div>
        ) : (
          <div className="w-full">
            <DataTable
              headers={tableHeaders}
              data={paginatedList}
              renderRow={renderApprovalRow}
              renderCard={renderApprovalCard}
              minWidth="1800px"
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalResults={filteredList.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>

      {/* APPROVE & SEND WHATSAPP MODAL */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-6 py-5 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Approve Quotation & Send WhatsApp
                  </h3>
                  <p className="text-xs text-white/80">Only approved messages are dispatched to the party</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Summary Banner */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex justify-between items-center gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {approveModalItem.consigneeName || approveModalItem.companyName}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Quotation: <span className="font-bold">{approveModalItem.quotationNo}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Amount</p>
                  <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                    ₹{Number(approveModalItem.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Recipient Party Phone Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Party WhatsApp Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={approvePhone}
                    onChange={(e) => setApprovePhone(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-12 pr-4 py-2.5 border border-gray-200 dark:border-slate-750 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  The approved quotation notification will be delivered to this WhatsApp number.
                </p>
              </div>

              {/* WhatsApp Message Preview Bubble */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  WhatsApp Notification Preview
                </label>
                <div className="bg-[#eef8f2] dark:bg-slate-800/80 border border-emerald-200/60 dark:border-slate-700 rounded-2xl p-4 text-xs font-medium text-gray-800 dark:text-slate-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/40 dark:border-slate-700 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>📄 Quotation Notification</span>
                    <span className="text-[10px] text-gray-400">Template: quotation_notification</span>
                  </div>
                  <p>Dear *{approveModalItem.consigneeName || approveModalItem.contactName || "Customer"}*,</p>
                  <p>We are pleased to share our quotation details:</p>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl space-y-1 text-xs border border-emerald-100 dark:border-slate-800 font-mono">
                    <p>🔹 *Quotation Number*: {approveModalItem.quotationNo}</p>
                    <p>📅 *Quotation Date*: {approveModalItem.quotationDate || "Today"}</p>
                    <p>💰 *Grand Total*: ₹{Number(approveModalItem.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    📎 Quotation PDF document attached
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-slate-300">
                    Best Regards,<br /><strong>Nutech Pipes World</strong>
                  </p>
                </div>
              </div>

              {/* WhatsApp Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="sendWhatsAppCheck"
                  checked={sendWhatsAppCheckbox}
                  onChange={(e) => setSendWhatsAppCheckbox(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <label htmlFor="sendWhatsAppCheck" className="text-xs font-bold text-gray-800 dark:text-slate-200 cursor-pointer">
                  Send WhatsApp message to party immediately upon approval
                  <span className="block text-[11px] font-normal text-gray-400">
                    Dispatches the quotation PDF and summary directly to the client
                  </span>
                </label>
              </div>

              {/* Excel Sheet Buttons */}
              <div className="flex flex-col xs:flex-row gap-2">
                <button
                  type="button"
                  disabled={!approveModalItem.rqExcelFileUrl}
                  onClick={() => approveModalItem.rqExcelFileUrl && window.open(approveModalItem.rqExcelFileUrl, "_blank")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed
                    text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 enabled:cursor-pointer"
                  title={approveModalItem.rqExcelFileUrl ? "View Request Quotation Excel" : "No Request Quotation Excel attached"}
                >
                  <FileSpreadsheet size={14} />
                  View Request Quotation Excel
                </button>
                <button
                  type="button"
                  disabled={!approveModalItem.cqExcelFileUrl}
                  onClick={() => approveModalItem.cqExcelFileUrl && window.open(approveModalItem.cqExcelFileUrl, "_blank")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed
                    text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 enabled:cursor-pointer"
                  title={approveModalItem.cqExcelFileUrl ? "View Create Quotation Excel" : "No Create Quotation Excel attached"}
                >
                  <FileSpreadsheet size={14} />
                  View Create Quotation Excel
                </button>
              </div>

              {/* Optional Approval Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Approval Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  placeholder="e.g. Special 5% discount approved by Director"
                  className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-750 rounded-xl bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-850 border-t border-gray-150 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                disabled={isApproving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isApproving || (sendWhatsAppCheckbox && (!approvePhone || approvePhone.length < 10))}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isApproving ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Approving & Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>{sendWhatsAppCheckbox ? "Approve & Send via WhatsApp" : "Approve Only"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-6 py-5 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <XCircle size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Reject Quotation</h3>
                  <p className="text-xs text-white/80">{rejectModalItem.quotationNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-gray-600 dark:text-slate-300">
                Rejecting this quotation will prevent any WhatsApp messages from being sent to the party. The quotation will be archived in the Rejected tab for salesperson review.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5 mb-2">
                  {[
                    "Discount exceeds authorized limit",
                    "Incorrect payment terms or credit days",
                    "Missing mandatory line item specifications",
                    "Pricing requires revision for custom freight",
                    "Party credit hold / verification needed"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      className="block w-full text-left px-2.5 py-1.5 text-xs text-gray-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-gray-150 dark:border-slate-800 transition-colors"
                    >
                      • {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter specific reason for rejecting this quotation..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-750 rounded-xl bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-850 border-t border-gray-150 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                disabled={isRejecting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
