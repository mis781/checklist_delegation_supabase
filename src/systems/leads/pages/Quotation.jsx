import { useState, useEffect, useContext, useMemo } from "react"
import { FileText } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import { getNOBs, getCompanies, getSubmittedLeads, getFollowUpHistory } from "../utils/storageManager"
import { getPaymentTermsMaster } from "../../orderDelivery/utils/storageManager"
import { fetchMasterTransportTypes } from "../../purchase/services/purchaseMasterApi"
import { PlusIcon, TrashIcon, DownloadIcon, SaveIcon, EyeIcon, RefreshCwIcon, SearchIcon } from "../components/Icons"
import nutechLogo from "../../../assets/nutech-logo.png"
import {
  fetchLeadsTatRules,
  calculateLeadsTat,
  LEADS_STAGE_KEYS,
  TatDelayBadge,
} from "../utils/leadsTatEngine"

const FIRM_NAME = "Nutech"
const FIRM_ADDRESS = "Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Raipur, Chattisgarh, India, Raipur, Chattisgarh 493111, IN"
const GST_SLABS = [0, 5, 12, 18, 28]
const cardClass = "bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-6 shadow-xs"
const labelClass = "block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
const inputClass = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs font-semibold transition-all shadow-2xs"
const readOnlyInputClass = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/60 text-xs font-semibold text-gray-600 dark:text-slate-400"

const todayISO = () => new Date().toISOString().split("T")[0]

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return "-"
  const parts = isoDate.split("-")
  if (parts.length !== 3) return isoDate
  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

const makeInitialTerms = () => [
  { id: `term-${Date.now()}-1`, description: "" }
]

// Accepts either the current array shape or an older saved quotation's
// {validity, paymentTerms, ...} object shape, and returns plain description
// strings either way.
const normalizeTermDescriptions = (terms) => {
  if (Array.isArray(terms)) {
    return terms.map((t) => (typeof t === "string" ? t : t.description || "")).filter(Boolean)
  }
  if (terms && typeof terms === "object") {
    return Object.values(terms).filter(Boolean)
  }
  return []
}

const computeItemTotal = (qty, rate, gst, discountPercent = 0) => {
  const base = Number(qty || 0) * Number(rate || 0)
  const itemDiscount = base * (Number(discountPercent || 0) / 100)
  const afterDiscount = base - itemDiscount
  const gstAmount = afterDiscount * (Number(gst || 0) / 100)
  return Number((afterDiscount + gstAmount).toFixed(2))
}

// Full calculation breakdown behind the Items & Quantities footer/PDF/preview
// — Base Price (pre-tax) + GST, less any overall Discount, = Grand Total.
const computeSummary = (items) => {
  const basePrice = (items || []).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0)
  const discountAmount = (items || []).reduce((sum, item) => {
    const base = Number(item.qty || 0) * Number(item.rate || 0)
    return sum + (base * (Number(item.discountPercent || 0) / 100))
  }, 0)
  const itemsTotal = (items || []).reduce((sum, item) => sum + Number(item.total || 0), 0)
  const gstAmount = itemsTotal - (basePrice - discountAmount)
  const grandTotal = itemsTotal
  return { basePrice, gstAmount, discountAmount, grandTotal }
}

// Revision numbering: a quotation's "base" number is whatever comes before
// a trailing "-R<n>" suffix. Revising always looks at every saved record
// sharing that base and picks the next number after the highest one found,
// so it advances correctly for that lead's quotation regardless of which
// past revision was selected as the starting point.
const getBaseQuotationNumber = (poNumber) => (poNumber || "").replace(/-R\d+$/i, "")

const getNextRevisionNumber = (poNumber, history) => {
  const base = getBaseQuotationNumber(poNumber)
  if (!base) return 1
  let maxRevision = 0
  ;(history || []).forEach((record) => {
    const recordNo = record.poNumber || record.quotationNo || ""
    if (getBaseQuotationNumber(recordNo) === base) {
      const match = recordNo.match(/-R(\d+)$/i)
      if (match) {
        const rev = parseInt(match[1], 10)
        if (rev > maxRevision) maxRevision = rev
      }
    }
  })
  return maxRevision + 1
}

const makeEmptyItem = (id) => ({
  id,
  item: "",
  qty: 1,
  rate: 0,
  discountPercent: 0,
  hsn: "",
  gst: 18,
  total: 0,
})

const DEFAULT_NOBS = ["Manufacturing", "Trading", "Service", "Retail", "OEM", "Contractor"]
const DEFAULT_FREIGHT_TYPES = ["Ex-Factory", "Ex-Factory + Transport", "F.O.R."]

const makeInitialFormData = () => ({
  leadNo: "",
  companyName: "",
  nob: "",
  division: "",
  poNumber: "",
  poDate: todayISO(),
  billingAddress: "",
  shippingAddress: "",
  state: "",
  city: "",
  contactName: "",
  contactNo: "",
  gst: "",
  quotationDate: todayISO(),
  freightType: "",
  paymentTerms: "",
  customPaymentTerms: "",
  advancePayment: "No",
  advanceAmount: "",
  discount: "",
  discountPercent: "",
})

// Real pixel size of Nutechlogo.png — used to keep the embedded PDF image
// at the correct aspect ratio (it's a wide wordmark, not a square icon).
export const LOGO_ASPECT_RATIO = 3001 / 925

// Builds the quotation PDF from a flat data object shaped like the
// Send PO payload (see handleSendPo) — reused for both the initial save and
// regenerating a PDF for an already-saved History record. `logoDataUri` is
// the Nutech logo pre-loaded as a base64 data URI (jsPDF can't embed a
// plain asset URL directly) — falls back to the firm name as text if it
// hasn't loaded yet.
export const buildQuotationPdf = (data, logoDataUri) => {
  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = 210
  const margin = 12
  let y = 16

  // Firm Header (Centered)
  if (logoDataUri) {
    const logoWidth = 55
    const logoHeight = logoWidth / LOGO_ASPECT_RATIO
    doc.addImage(logoDataUri, "PNG", (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight)
    y += logoHeight + 6
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(14, 116, 144) // matches a sky/cyan theme, or just black
    doc.text(data.firmName || FIRM_NAME, pageWidth / 2, y, { align: "center" })
    y += 6
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  const addressLines = doc.splitTextToSize(FIRM_ADDRESS, pageWidth - margin * 2)
  addressLines.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: "center" })
    y += 4
  })
  y += 4

  // Divider
  doc.setDrawColor(220)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // Quotation Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(50, 50, 50)
  doc.text("QUOTATION", pageWidth / 2, y, { align: "center", renderingMode: "fill" })
  y += 8

  // Meta Info
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(`Quotation Number: ${data.poNumber || "-"}`, margin, y)
  doc.text(`Quotation Date: ${formatDisplayDate(data.quotationDate)}`, pageWidth - margin, y, { align: "right" })
  y += 5
  doc.text(`Lead No.: ${data.leadNo || "-"}`, margin, y)
  y += 8

  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 7

  doc.setFont("helvetica", "bold")
  doc.text("Company Details", margin, y)
  y += 5
  doc.setFont("helvetica", "normal")
  const companyLines = [
    `Company: ${data.companyName || "-"}`,
    `Division: ${data.division || "-"}`,
    `State: ${data.state || "-"}    City: ${data.city || "-"}`,
    `Contact: ${data.contactName || "-"} (${data.contactNo || "-"})`,
    `GST: ${data.gst || "-"}`,
    `Freight Payment: ${data.freightType || "-"}`,
  ]
  companyLines.forEach((line) => {
    doc.text(line, margin, y)
    y += 5
  })
  y += 3

  const halfWidth = (pageWidth - margin * 2) / 2 - 4
  doc.setFont("helvetica", "bold")
  doc.text("Billing Address", margin, y)
  doc.text("Shipping Address", margin + halfWidth + 8, y)
  y += 5
  doc.setFont("helvetica", "normal")
  const billingLines = doc.splitTextToSize(data.billingAddress || "-", halfWidth)
  const shippingLines = doc.splitTextToSize(data.shippingAddress || "-", halfWidth)
  billingLines.forEach((line, i) => doc.text(line, margin, y + i * 5))
  shippingLines.forEach((line, i) => doc.text(line, margin + halfWidth + 8, y + i * 5))
  y += Math.max(billingLines.length, shippingLines.length) * 5 + 6

  const itemRows = (data.items || []).map((item, index) => [
    index + 1,
    item.item,
    item.qty,
    Number(item.rate || 0).toFixed(2),
    `${item.discountPercent || 0}%`,
    item.hsn || "-",
    `${item.gst}%`,
    Number(item.total || 0).toFixed(2),
  ])

  autoTable(doc, {
    startY: y,
    head: [["S/N", "Item", "Qty", "Rate", "Disc %", "HSN", "GST%", "Total"]],
    body: itemRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: margin },
  })

  y = doc.lastAutoTable.finalY + 8
  const summary = computeSummary(data.items)
  doc.setFont("helvetica", "normal")
  doc.text(`Base Price: ${summary.basePrice.toFixed(2)}`, pageWidth - margin, y, { align: "right" })
  y += 5
  doc.text(`Discount: ${summary.discountAmount.toFixed(2)}`, pageWidth - margin, y, { align: "right" })
  y += 5
  doc.text(`GST: ${summary.gstAmount.toFixed(2)}`, pageWidth - margin, y, { align: "right" })
  y += 5
  doc.setFont("helvetica", "bold")
  doc.text(`Grand Total: ${summary.grandTotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" })
  y += 8

  doc.setFont("helvetica", "normal")
  const effectivePaymentTerms = data.paymentTerms === "Custom" ? (data.customPaymentTerms || "Custom") : (data.paymentTerms || "")
  const isPdfAdvance = effectivePaymentTerms.toLowerCase().includes("advance") || data.advancePayment === "Yes"
  const pdfAdvanceText = isPdfAdvance && Number(data.advanceAmount) > 0 ? `  (Advance Amount: ${Number(data.advanceAmount).toLocaleString("en-IN")})` : ""
  if (effectivePaymentTerms) {
    doc.text(`Payment Terms: ${effectivePaymentTerms}${pdfAdvanceText}`, margin, y)
    y += 8
  } else if (data.advancePayment) {
    doc.text(
      `Advance Payment: ${data.advancePayment || "No"}${data.advancePayment === "Yes" ? `  (Amount: ${data.advanceAmount || 0})` : ""}`,
      margin,
      y
    )
    y += 8
  }

  if (y > 250) {
    doc.addPage()
    y = 16
  }

  doc.setFont("helvetica", "bold")
  doc.text("Terms & Conditions", margin, y)
  y += 5
  doc.setFont("helvetica", "normal")
  normalizeTermDescriptions(data.terms).forEach((description) => {
    const wrapped = doc.splitTextToSize(`• ${description}`, pageWidth - margin * 2)
    wrapped.forEach((line) => {
      if (y > 285) {
        doc.addPage()
        y = 16
      }
      doc.text(line, margin, y)
      y += 5
    })
  })

  return doc
}

function Quotation() {
  const { showNotification } = useContext(AuthContext)

  const [activeTab, setActiveTab] = useState("pending")
  const [selectedRevisionSource, setSelectedRevisionSource] = useState("")

  const [callTrackerLeads, setCallTrackerLeads] = useState([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [tatRules, setTatRules] = useState([])
  const [nobOptions, setNobOptions] = useState(DEFAULT_NOBS)
  const [paymentTermsOptions, setPaymentTermsOptions] = useState([])
  const [freightTypes, setFreightTypes] = useState(DEFAULT_FREIGHT_TYPES)

  const [pendingSearch, setPendingSearch] = useState("")
  const [formData, setFormData] = useState(makeInitialFormData())
  const [items, setItems] = useState([makeEmptyItem(1)])
  const [terms, setTerms] = useState(makeInitialTerms)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [logoDataUri, setLogoDataUri] = useState("")

  const [historyList, setHistoryList] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historySearch, setHistorySearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const loadLeads = async () => {
    setIsLoadingLeads(true)
    try {
      const leads = await mockApi.fetchCallTrackerLeads()
      setCallTrackerLeads(leads)
    } catch (error) {
      console.error("Error fetching Followup Tracker leads:", error)
      setCallTrackerLeads([])
    } finally {
      setIsLoadingLeads(false)
    }
  }

  const loadNextPoNumber = async () => {
    try {
      const poNumber = await mockApi.getNextPoNumber()
      setFormData((prev) => ({ ...prev, poNumber }))
    } catch (error) {
      console.error("Error fetching next PO number:", error)
    }
  }

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const history = await mockApi.fetchQuotationHistory()
      setHistoryList(history)
    } catch (error) {
      console.error("Error fetching quotation history:", error)
      setHistoryList([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadLeads()
    loadNextPoNumber()
    loadHistory()

    // jsPDF can't embed a plain asset URL — pre-load the logo once as a
    // base64 data URI so the generated PDF can show the real image.
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

    try {
      const nobs = getNOBs().map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean)
      if (nobs.length > 0) {
        setNobOptions(Array.from(new Set([...DEFAULT_NOBS, ...nobs])))
      }
      const pts = getPaymentTermsMaster().map((item) => (typeof item === "string" ? item : item.name || item.term)).filter(Boolean)
      if (pts.length > 0) setPaymentTermsOptions(pts)
    } catch (err) {
      console.error("Error loading master dropdown options:", err)
    }

    // Fetch transport types from Global Settings -> Purchase -> Transport Types
    fetchMasterTransportTypes()
      .then((types) => {
        if (types && types.length > 0) {
          const names = types
            .filter((t) => t.is_active !== false)
            .map((t) => t.name || t.value)
            .filter(Boolean)
          if (names.length > 0) setFreightTypes(names)
        }
      })
      .catch((err) => console.warn("Error loading transport types:", err))

    // Fetch Leads TAT rules
    fetchLeadsTatRules().then((rules) => {
      if (rules && rules.length > 0) setTatRules(rules)
    })

    const handleLeadsUpdated = () => {
      loadLeads()
      loadHistory()
      fetchLeadsTatRules().then((rules) => {
        if (rules && rules.length > 0) setTatRules(rules)
      })
    }
    window.addEventListener("leads-updated", handleLeadsUpdated)
    return () => window.removeEventListener("leads-updated", handleLeadsUpdated)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [historySearch])

  const filteredPendingLeads = useMemo(() => {
    if (!pendingSearch.trim()) return callTrackerLeads
    const q = pendingSearch.toLowerCase()
    return callTrackerLeads.filter((lead) => {
      return (
        (lead.leadNo && lead.leadNo.toLowerCase().includes(q)) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(q)) ||
        (lead.city && lead.city.toLowerCase().includes(q))
      )
    })
  }, [callTrackerLeads, pendingSearch])

  // Select a pending lead from the queue or dropdown.
  // Pre-fills all lead, follow-up, and company master fields.
  const handleSelectPendingLead = (lead) => {
    if (!lead) return

    const companiesList = getCompanies()
    const submittedLeads = getSubmittedLeads()
    const followUps = getFollowUpHistory()

    const submittedMatch = submittedLeads.find((l) => l.leadNumber === lead.leadNo)
    const followUpMatch = [...followUps].reverse().find((h) => h.leadNo === lead.leadNo)
    const compName = lead.companyName || submittedMatch?.companyName || submittedMatch?.customerName || followUpMatch?.companyName || ""
    const companyMatch = companiesList.find(
      (c) =>
        (compName && (c.name || "").trim().toLowerCase() === compName.trim().toLowerCase()) ||
        c.vnNo === lead.leadNo ||
        c.name === lead.leadNo
    )

    const resolvedCompanyName = lead.companyName || compName || companyMatch?.name || ""
    const resolvedNob = lead.nob || submittedMatch?.nob || followUpMatch?.nob || companyMatch?.nob || ""
    const resolvedDivision = lead.division || submittedMatch?.division || followUpMatch?.division || companyMatch?.division || ""
    const resolvedState = lead.state || submittedMatch?.state || followUpMatch?.enquiryState || companyMatch?.state || ""
    const resolvedCity = lead.city || submittedMatch?.city || followUpMatch?.enquiryCity || companyMatch?.city || ""
    const resolvedGst = lead.gstin || lead.gst || submittedMatch?.gstin || submittedMatch?.gst || companyMatch?.gst || ""
    const resolvedBillingAddress = lead.billingAddress || lead.address || submittedMatch?.billingAddress || submittedMatch?.address || companyMatch?.address || ""
    const resolvedShippingAddress = lead.shippingAddress || lead.address || submittedMatch?.shippingAddress || submittedMatch?.address || companyMatch?.address || ""
    const resolvedContactName = lead.contactName || lead.contactPerson || submittedMatch?.contactPerson || submittedMatch?.contactName || followUpMatch?.personName || companyMatch?.contactPersons?.[0]?.name || companyMatch?.salesPerson || ""
    const resolvedContactNo = lead.contactNo || lead.contactNumber || lead.phone || submittedMatch?.contactNumber || submittedMatch?.phoneNumber || companyMatch?.contactPersons?.[0]?.number || companyMatch?.phone || ""
    const resolvedFreightType = lead.freightType || submittedMatch?.freightType || followUpMatch?.freightType || ""
    const resolvedPaymentTerms = lead.paymentTerms || submittedMatch?.paymentTerms || followUpMatch?.paymentTerms || ""
    const resolvedCustomPaymentTerms = lead.customPaymentTerms || submittedMatch?.customPaymentTerms || followUpMatch?.customPaymentTerms || ""
    const resolvedAdvanceAmount = lead.advanceAmount || submittedMatch?.advanceAmount || followUpMatch?.advanceAmount || ""

    setFormData((prev) => ({
      ...prev,
      leadNo: lead.leadNo || "",
      companyName: resolvedCompanyName || prev.companyName || "",
      nob: resolvedNob || prev.nob || "",
      division: resolvedDivision || prev.division || "",
      billingAddress: resolvedBillingAddress || prev.billingAddress || "",
      shippingAddress: resolvedShippingAddress || prev.shippingAddress || "",
      state: resolvedState || prev.state || "",
      city: resolvedCity || prev.city || "",
      contactName: resolvedContactName || prev.contactName || "",
      contactNo: resolvedContactNo || prev.contactNo || "",
      gst: resolvedGst || prev.gst || "",
      freightType: resolvedFreightType || prev.freightType || "",
      paymentTerms: resolvedPaymentTerms || prev.paymentTerms || "",
      customPaymentTerms: resolvedCustomPaymentTerms || prev.customPaymentTerms || "",
      advanceAmount: resolvedAdvanceAmount || prev.advanceAmount || "",
    }))

    const rawItems = Array.isArray(lead.items) && lead.items.length > 0
      ? lead.items
      : (submittedMatch?.items && submittedMatch.items.length > 0 ? submittedMatch.items : [])

    if (rawItems.length > 0) {
      setItems(
        rawItems.map((leadItem, index) => {
          const qty = Number(leadItem.quantity || leadItem.qty) || 1
          const gst = Number(leadItem.gst) || 18
          const rate = Number(leadItem.rate) || 0
          const discountPercent = Number(leadItem.discountPercent) || 0
          return {
            id: index + 1,
            item: leadItem.name || leadItem.item || "",
            qty,
            rate,
            discountPercent,
            hsn: leadItem.hsn || "",
            gst,
            total: computeItemTotal(qty, rate, gst, discountPercent),
          }
        })
      )
    } else {
      setItems([makeEmptyItem(1)])
    }

    setActiveTab("create")
  }

  const handleLeadChange = (e) => {
    const leadNo = e.target.value
    const lead = callTrackerLeads.find((l) => l.leadNo === leadNo)

    if (!lead) {
      setFormData((prev) => ({
        ...makeInitialFormData(),
        poNumber: prev.poNumber,
        poDate: prev.poDate,
        quotationDate: prev.quotationDate,
      }))
      setItems([makeEmptyItem(1)])
      return
    }

    handleSelectPendingLead(lead)
  }

  // Revise tab: pick any previously saved quotation and load its full data
  // into the same form for editing. Saving computes the next revision
  // number for that quotation's lineage rather than a fresh PO number.
  const handleReviseSelect = (quotationNo) => {
    setSelectedRevisionSource(quotationNo)

    const record = historyList.find((r) => (r.poNumber || r.quotationNo) === quotationNo)
    if (!record) return

    setFormData({
      ...makeInitialFormData(),
      leadNo: record.leadNo || "",
      companyName: record.companyName || "",
      nob: record.nob || "",
      division: record.division || "",
      poNumber: record.poNumber || record.quotationNo || "",
      poDate: record.poDate || todayISO(),
      billingAddress: record.billingAddress || "",
      shippingAddress: record.shippingAddress || "",
      state: record.state || "",
      city: record.city || "",
      contactName: record.contactName || "",
      contactNo: record.contactNo || "",
      gst: record.gst || "",
      quotationDate: todayISO(),
      freightType: record.freightType || "",
      paymentTerms: record.paymentTerms || (record.advancePayment === "Yes" ? "Advance" : ""),
      customPaymentTerms: record.customPaymentTerms || "",
      advancePayment: record.advancePayment || (record.paymentTerms?.toLowerCase().includes("advance") ? "Yes" : "No"),
      advanceAmount: record.advanceAmount || "",
    })

    setItems(
      Array.isArray(record.items) && record.items.length > 0
        ? record.items.map((it, index) => ({ ...it, id: index + 1 }))
        : [makeEmptyItem(1)]
    )

    setTerms(
      Array.isArray(record.terms) && record.terms.length > 0
        ? record.terms.map((t, index) => ({
          id: t.id || `revised-term-${index}`,
          description: typeof t === "string" ? t : t.description || "",
        }))
        : makeInitialTerms()
    )
  }

  const handleCompanyNameChange = (value) => {
    setFormData((prev) => {
      const updated = { ...prev, companyName: value }
      if (value) {
        const companyMatch = getCompanies().find(
          (c) => (c.name || "").trim().toLowerCase() === value.trim().toLowerCase()
        )
        if (companyMatch) {
          if (!updated.nob && companyMatch.nob) updated.nob = companyMatch.nob
          if (!updated.division && companyMatch.division) updated.division = companyMatch.division
          if (!updated.state && companyMatch.state) updated.state = companyMatch.state
          if (!updated.city && companyMatch.city) updated.city = companyMatch.city
          if (!updated.gst && companyMatch.gst) updated.gst = companyMatch.gst
          if (!updated.billingAddress && companyMatch.address) updated.billingAddress = companyMatch.address
          if (!updated.shippingAddress && companyMatch.address) updated.shippingAddress = companyMatch.address
          if (!updated.contactName && companyMatch.contactPersons?.[0]?.name) {
            updated.contactName = companyMatch.contactPersons[0].name
          }
          if (!updated.contactNo && companyMatch.contactPersons?.[0]?.number) {
            updated.contactNo = companyMatch.contactPersons[0].number
          }
        }
      }
      return updated
    })
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleTermChange = (id, value) => {
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, description: value } : t)))
  }

  // Lets the user add extra Terms & Conditions on this quotation alone
  // (on top of whatever's pulled from Master) — applies to both Create
  // Quotation and Revise, since they share this same form.
  const addTerm = () => {
    setTerms((prev) => [...prev, { id: `custom-term-${Date.now()}-${prev.length}`, description: "" }])
  }

  const removeTerm = (id) => {
    setTerms((prev) => prev.filter((t) => t.id !== id))
  }

  // ---- Items & Quantities ----
  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === "qty" || field === "rate" || field === "gst" || field === "discountPercent") {
          updated.total = computeItemTotal(updated.qty, updated.rate, updated.gst, updated.discountPercent)
        }
        return updated
      })
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, makeEmptyItem(Math.max(0, ...prev.map((i) => i.id)) + 1)])
  }

  const removeItem = (id) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }

  const summary = useMemo(
    () => computeSummary(items),
    [items]
  )
  const grandTotal = summary.grandTotal

  // Preview of the number a revision will actually be saved under, e.g.
  // "NTC/PO/25-26/001-R2" — recomputed live against the current History so
  // it's always the next number after whatever's already been saved.
  const revisionPreview = useMemo(() => {
    if (activeTab !== "revise" || !formData.poNumber) return null
    return `${getBaseQuotationNumber(formData.poNumber)}-R${getNextRevisionNumber(formData.poNumber, historyList)}`
  }, [activeTab, formData.poNumber, historyList])

  const handleReset = () => {
    setFormData(makeInitialFormData())
    setItems([makeEmptyItem(1)])
    setTerms(makeInitialTerms())
    setSelectedRevisionSource("")
    if (activeTab !== "revise") {
      loadNextPoNumber()
    }
  }

  const validate = () => {
    if (!formData.poNumber) return "The Quotation Number is still generating — please wait a moment and try again."
    if (!formData.leadNo) return "Please select a Lead No."
    if (!formData.companyName) return "Company Name is missing for the selected lead."
    const validItems = items.filter((i) => i.item.trim() && Number(i.qty) > 0)
    if (validItems.length === 0) return "Please add at least one item with a quantity."
    const isAdvance =
      formData.paymentTerms?.toLowerCase().includes("advance") ||
      (formData.paymentTerms === "Custom" && formData.customPaymentTerms?.toLowerCase().includes("advance")) ||
      formData.advancePayment === "Yes"
    if (isAdvance && !(Number(formData.advanceAmount) > 0)) {
      return "Please enter the advance amount."
    }
    if (formData.paymentTerms === "Custom" && !formData.customPaymentTerms?.trim()) {
      return "Please enter custom payment terms."
    }
    return null
  }

  const buildPayload = () => {
    const isAdvance =
      formData.paymentTerms?.toLowerCase().includes("advance") ||
      (formData.paymentTerms === "Custom" && formData.customPaymentTerms?.toLowerCase().includes("advance")) ||
      formData.advancePayment === "Yes"
    return {
      ...formData,
      advancePayment: isAdvance ? "Yes" : "No",
      advanceAmount: isAdvance ? formData.advanceAmount : "",
      firmName: FIRM_NAME,
      quotationNo: formData.poNumber, // keeps this record keyed the same way the rest of the app (Advance Payment/History) expects
      items,
      terms,
      grandTotal,
      // Mirrors of the consignee-prefixed fields other pages already read
      consigneeName: formData.companyName,
      consigneeDivision: formData.division,
      consigneeCity: formData.city,
      consigneeState: formData.state,
      consigneeContactName: formData.contactName,
      consigneeContactNo: formData.contactNo,
      consigneeGSTIN: formData.gst,
      date: formData.quotationDate,
    }
  }

  // Lets the user grab a PDF of what's currently in the form — same as
  // Preview, this is just a look at the draft and doesn't save or send
  // anything, so it intentionally skips the Send PO validation.
  const handleDownloadDraftPdf = () => {
    try {
      const doc = buildQuotationPdf(buildPayload(), logoDataUri)
      doc.save(`Quotation_${(formData.poNumber || "draft").replace(/\//g, "-")}.pdf`)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      showNotification("Failed to download PDF", "error")
    }
  }

  const handleGeneratePdf = (record) => {
    try {
      // Always rebuild from the record's own data with the current template
      // — a stored pdfDataUri snapshot (from whenever it was first saved)
      // could be stale against later template changes, e.g. removed fields.
      const doc = buildQuotationPdf(record, logoDataUri)
      doc.save(`Quotation_${(record.poNumber || record.quotationNo || "quotation").replace(/\//g, "-")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      showNotification("Failed to generate PDF", "error")
    }
  }

  const handleSendPo = async () => {
    const validationError = validate()
    if (validationError) {
      showNotification(validationError, "error")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = buildPayload()
      const doc = buildQuotationPdf(payload, logoDataUri)
      const pdfDataUri = doc.output("datauristring")

      // The mock upload endpoint always returns a placeholder URL — the real
      // PDF is kept as a data URI on the saved record itself so History's
      // "Generate PDF" works without depending on it.
      await mockApi.uploadFile(
        { name: `Quotation_${formData.poNumber}.pdf`, type: "application/pdf" },
        "pdf"
      )

      const result = await mockApi.saveQuotation({ ...payload, pdfDataUri })

      if (!result.success) {
        throw new Error(result.error || "Unknown error while saving")
      }

      showNotification(`Quotation ${formData.poNumber} saved successfully`, "success")
      window.dispatchEvent(new CustomEvent("leads-updated"))
      handleReset()
      await Promise.all([loadHistory(), loadLeads()]) // refresh so this lead drops out of the Lead No. picker
      setActiveTab("history")
    } catch (error) {
      console.error("Error saving quotation:", error)
      showNotification("Error saving quotation: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Revise tab's save: same validation/PDF/upload flow as Send PO, but
  // stores under the next revision number for this quotation's lineage
  // (e.g. "...-001" -> "...-001-R1" -> "...-001-R2") as a brand-new History
  // record, so every past revision stays intact and viewable.
  const handleSaveRevision = async () => {
    if (!selectedRevisionSource) {
      showNotification("Please select a quotation to revise.", "error")
      return
    }

    const validationError = validate()
    if (validationError) {
      showNotification(validationError, "error")
      return
    }

    setIsSubmitting(true)
    try {
      const revisedPoNumber = `${getBaseQuotationNumber(formData.poNumber)}-R${getNextRevisionNumber(formData.poNumber, historyList)}`
      const payload = { ...buildPayload(), poNumber: revisedPoNumber, quotationNo: revisedPoNumber }
      const doc = buildQuotationPdf(payload, logoDataUri)
      const pdfDataUri = doc.output("datauristring")

      await mockApi.uploadFile(
        { name: `Quotation_${revisedPoNumber}.pdf`, type: "application/pdf" },
        "pdf"
      )

      const result = await mockApi.saveQuotation({ ...payload, pdfDataUri })

      if (!result.success) {
        throw new Error(result.error || "Unknown error while saving")
      }

      showNotification(`Revision ${revisedPoNumber} saved successfully`, "success")
      window.dispatchEvent(new CustomEvent("leads-updated"))
      handleReset()
      await loadHistory()
      setActiveTab("history")
    } catch (error) {
      console.error("Error saving revision:", error)
      showNotification("Error saving revision: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Switching between Pending/Create/Revise/History
  const switchTab = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setSelectedRevisionSource("")
    if (tab === "create") {
      if (!formData.leadNo) {
        setFormData(makeInitialFormData())
        setItems([makeEmptyItem(1)])
        setTerms(makeInitialTerms())
        loadNextPoNumber()
      }
    } else if (tab === "revise") {
      setFormData(makeInitialFormData())
      setItems([makeEmptyItem(1)])
      setTerms(makeInitialTerms())
    } else if (tab === "pending") {
      loadLeads()
    }
  }

  const filteredHistory = historyList.filter((record) => {
    if (!historySearch) return true
    const q = historySearch.toLowerCase()
    return (
      (record.poNumber && record.poNumber.toLowerCase().includes(q)) ||
      (record.quotationNo && record.quotationNo.toLowerCase().includes(q)) ||
      (record.leadNo && record.leadNo.toLowerCase().includes(q)) ||
      (record.companyName && record.companyName.toLowerCase().includes(q))
    )
  })

  const historyTotalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const historyHeaders = [
    "Quotation Number", "Lead No.", "Company Name", "Division",
    "Quotation Date", "Payment Terms", "Grand Total", "Actions"
  ]

  const renderHistoryRow = (record, index) => (
    <tr key={`${record.poNumber || record.quotationNo}-${index}`} className="hover:bg-slate-50 transition-colors">
      <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{record.poNumber || record.quotationNo}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.leadNo || "-"}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500">
        <div className="max-w-[140px] truncate" title={record.companyName}>{record.companyName || "-"}</div>
      </td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500">{record.division || "-"}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDisplayDate(record.quotationDate)}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        {record.paymentTerms
          ? `${record.paymentTerms === "Custom" ? record.customPaymentTerms || "Custom" : record.paymentTerms}${record.advanceAmount ? ` (₹${Number(record.advanceAmount).toLocaleString("en-IN")})` : ""}`
          : (record.advancePayment === "Yes" ? `Advance (₹${record.advanceAmount || 0})` : "No Advance")}
      </td>
      <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
        {computeSummary(record.items).grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>
      <td className="px-3 sm:px-4 py-3">
        <button
          onClick={() => handleGeneratePdf(record)}
          className="inline-flex items-center px-2.5 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md whitespace-nowrap"
        >
          <DownloadIcon className="h-3.5 w-3.5 mr-1" /> Generate PDF
        </button>
      </td>
    </tr>
  )

  const renderHistoryCard = (record, index) => (
    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
            {record.poNumber || record.quotationNo}
          </span>
          <h3 className="font-bold text-gray-900 mt-1">{record.companyName || "-"}</h3>
          <p className="text-xs text-gray-500">Lead {record.leadNo || "-"} • {record.division || "-"}</p>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {computeSummary(record.items).grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div><span className="block text-xs text-gray-400">Quotation Date</span>{formatDisplayDate(record.quotationDate)}</div>
        <div className="col-span-2">
          <span className="block text-xs text-gray-400">Payment Terms</span>
          {record.paymentTerms
            ? `${record.paymentTerms === "Custom" ? record.customPaymentTerms || "Custom" : record.paymentTerms}${record.advanceAmount ? ` (₹${Number(record.advanceAmount).toLocaleString("en-IN")})` : ""}`
            : (record.advancePayment === "Yes" ? `Advance (${record.advanceAmount || 0})` : "-")}
        </div>
      </div>
      <button
        onClick={() => handleGeneratePdf(record)}
        className="w-full flex items-center justify-center px-4 py-2 border border-sky-600 rounded-md text-sm font-medium text-sky-600 bg-white hover:bg-sky-50"
      >
        <DownloadIcon className="h-4 w-4 mr-2" /> Generate PDF
      </button>
    </div>
  )

  const renderQuotationForm = () => (
    <div className="space-y-6">
      {/* PO / Quotation Details */}
      <div className={cardClass}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">PO & Quotation Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{activeTab === "revise" ? "Revised Quotation Number" : "Quotation Number"}</label>
            <input
              type="text"
              value={activeTab === "revise" ? (revisionPreview || "Select a quotation to revise") : (formData.poNumber || "Generating...")}
              readOnly
              className={readOnlyInputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quotation Date</label>
            <input
              type="date"
              value={formData.quotationDate}
              onChange={(e) => handleFieldChange("quotationDate", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Firm & Lead */}
      <div className={cardClass}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Firm & Lead Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === "revise" ? (
            <div>
              <label className={labelClass}>Select Quotation to Revise <span className="text-red-500">*</span></label>
              <select value={selectedRevisionSource} onChange={(e) => handleReviseSelect(e.target.value)} className={inputClass}>
                <option value="">
                  {isLoadingHistory ? "Loading quotations..." : "Select quotation..."}
                </option>
                {historyList.map((record) => {
                  const no = record.poNumber || record.quotationNo
                  return (
                    <option key={no} value={no}>
                      {no} — {record.companyName || "Unnamed"} (Lead {record.leadNo || "-"})
                    </option>
                  )
                })}
              </select>
              {!isLoadingHistory && historyList.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No saved quotations yet — create one first.
                </p>
              )}
              {revisionPreview && (
                <p className="text-xs text-sky-600 mt-1">Will save as: {revisionPreview}</p>
              )}
            </div>
          ) : (
            <div>
              <label className={labelClass}>Lead No. <span className="text-red-500">*</span></label>
              <select value={formData.leadNo} onChange={handleLeadChange} className={inputClass}>
                <option value="">
                  {isLoadingLeads ? "Loading leads..." : "Select Lead No."}
                </option>
                {callTrackerLeads.map((lead) => (
                  <option key={lead.leadNo} value={lead.leadNo}>
                    {lead.leadNo} — {lead.companyName || "Unnamed"}
                  </option>
                ))}
              </select>
              {!isLoadingLeads && callTrackerLeads.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No leads yet — mark a Followup Tracker entry as "Make Quotation" first.
                </p>
              )}
            </div>
          )}
          <div>
            <label className={labelClass}>Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              className={inputClass}
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className={labelClass}>NOB</label>
            <select
              value={formData.nob}
              onChange={(e) => handleFieldChange("nob", e.target.value)}
              className={inputClass}
            >
              <option value="">Select NOB</option>
              {nobOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              {formData.nob && !nobOptions.includes(formData.nob) && (
                <option value={formData.nob}>{formData.nob}</option>
              )}
            </select>
          </div>
          <div>
            <label className={labelClass}>Freight Type</label>
            <select
              value={formData.freightType}
              onChange={(e) => handleFieldChange("freightType", e.target.value)}
              className={inputClass}
            >
              <option value="">Select freight type</option>
              {freightTypes.map((ft) => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
              {formData.freightType && !freightTypes.includes(formData.freightType) && (
                <option value={formData.freightType}>{formData.freightType}</option>
              )}
            </select>
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              className={inputClass}
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className={labelClass}>Division</label>
            <input
              type="text"
              value={formData.division}
              onChange={(e) => handleFieldChange("division", e.target.value)}
              className={inputClass}
              placeholder="Enter division"
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleFieldChange("state", e.target.value)}
              className={inputClass}
              placeholder="Enter state"
            />
          </div>
          <div>
            <label className={labelClass}>GST Number</label>
            <input
              type="text"
              value={formData.gst}
              onChange={(e) => handleFieldChange("gst", e.target.value)}
              className={inputClass}
              placeholder="GST number"
            />
          </div>
          <div>
            <label className={labelClass}>Payment Terms</label>
            <select
              value={formData.paymentTerms}
              onChange={(e) => handleFieldChange("paymentTerms", e.target.value)}
              className={inputClass}
            >
              <option value="">Select payment terms</option>
              {paymentTermsOptions.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
              <option value="Custom">Custom</option>
              {formData.paymentTerms && formData.paymentTerms !== "Custom" && !paymentTermsOptions.includes(formData.paymentTerms) && (
                <option value={formData.paymentTerms}>{formData.paymentTerms}</option>
              )}
            </select>
          </div>
          {formData.paymentTerms === "Custom" && (
            <div>
              <label className={labelClass}>Custom Payment Terms <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.customPaymentTerms}
                onChange={(e) => handleFieldChange("customPaymentTerms", e.target.value)}
                className={inputClass}
                placeholder="Enter custom payment terms"
              />
            </div>
          )}
          {(formData.paymentTerms?.toLowerCase().includes("advance") ||
            (formData.paymentTerms === "Custom" && formData.customPaymentTerms?.toLowerCase().includes("advance"))) && (
            <div>
              <label className={labelClass}>Advance Amount <span className="text-red-500">*</span></label>
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
          <div>
            <label className={labelClass}>Contact Person</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleFieldChange("contactName", e.target.value)}
              className={inputClass}
              placeholder="Enter contact person"
            />
          </div>
          <div>
            <label className={labelClass}>Contact Number</label>
            <input
              type="text"
              value={formData.contactNo}
              onChange={(e) => handleFieldChange("contactNo", e.target.value)}
              className={inputClass}
              placeholder="Enter contact number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>Billing Address</label>
            <textarea
              value={formData.billingAddress}
              onChange={(e) => handleFieldChange("billingAddress", e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="Enter billing address"
            />
          </div>
          <div>
            <label className={labelClass}>Shipping Address</label>
            <textarea
              value={formData.shippingAddress}
              onChange={(e) => handleFieldChange("shippingAddress", e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="Enter shipping address"
            />
          </div>
        </div>
      </div>

      {/* Items & Quantities */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Items & Quantities</h3>
          <button
            onClick={addItem}
            className="inline-flex items-center px-3 py-1.5 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md"
          >
            <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "900px" }}>
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {["S/N", "Item", "Qty", "Rate", "Disc %", "HSN", "GST%", "Total", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-2 py-2 text-gray-500">{index + 1}</td>
                  <td className="px-2 py-2 min-w-[180px]">
                    <input
                      type="text"
                      value={item.item || ""}
                      readOnly
                      placeholder="Item name"
                      className={readOnlyInputClass}
                    />
                  </td>
                  <td className="px-2 py-2 w-20">
                    <input
                      type="number"
                      min="0"
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, "qty", e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2 w-28">
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2 w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      onChange={(e) => handleItemChange(item.id, "discountPercent", e.target.value)}
                      className={inputClass}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-2 w-28">
                    <input
                      type="text"
                      value={item.hsn}
                      onChange={(e) => handleItemChange(item.id, "hsn", e.target.value)}
                      className={inputClass}
                      placeholder="HSN"
                    />
                  </td>
                  <td className="px-2 py-2 w-24">
                    <select
                      value={item.gst}
                      onChange={(e) => handleItemChange(item.id, "gst", e.target.value)}
                      className={inputClass}
                    >
                      {GST_SLABS.map((slab) => (
                        <option key={slab} value={slab}>{slab}%</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 w-28 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {Number(item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Base Price</span>
              <span className="text-gray-900 dark:text-white">
                {summary.basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="text-gray-900 dark:text-white">
                {summary.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">GST</span>
              <span className="text-gray-900 dark:text-white">
                {summary.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
              <span className="text-sm text-gray-500">Grand Total</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {summary.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Terms & Conditions</h3>
          <button
            type="button"
            onClick={addTerm}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-sky-300 text-sky-700 rounded-md hover:bg-sky-50"
          >
            <PlusIcon className="h-4 w-4 mr-1" /> Add Term
          </button>
        </div>
        <div className="space-y-3">
          {terms.length === 0 ? (
            <p className="text-sm text-gray-400">No terms added yet. Click "Add Term" to add one.</p>
          ) : (
            terms.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={t.description}
                  onChange={(e) => handleTermChange(t.id, e.target.value)}
                  className={inputClass}
                  placeholder="Enter term description"
                />
                <button
                  type="button"
                  onClick={() => removeTerm(t.id)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove term"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pb-2">
        <button
          onClick={handleReset}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" /> Reset
        </button>
        <button
          onClick={handleDownloadDraftPdf}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <DownloadIcon className="h-4 w-4 mr-2" /> Download
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className="inline-flex items-center justify-center px-4 py-2 border border-sky-300 text-sky-700 rounded-md hover:bg-sky-50"
        >
          <EyeIcon className="h-4 w-4 mr-2" /> Preview
        </button>
        <button
          onClick={activeTab === "revise" ? handleSaveRevision : handleSendPo}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-md disabled:opacity-50"
        >
          <SaveIcon className="h-4 w-4 mr-2" />
          {isSubmitting ? "Saving..." : activeTab === "revise" ? "Save Revision" : "Send PO"}
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
              <FileText size={22} />
            </div>
            Pending Quotation
            {callTrackerLeads.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-xs">
                {callTrackerLeads.length} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Track pending quotations, generate official price quotations, revise existing drafts, and export stamped PDF documents
          </p>
        </div>
      </div>

      {/* Tabs & Firm Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => switchTab("pending")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Pending Quotation ({callTrackerLeads.length})
            </button>
            <button
              onClick={() => switchTab("create")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "create"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Create Quotation
            </button>
            <button
              onClick={() => switchTab("revise")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "revise"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Revise
            </button>
            <button
              onClick={() => switchTab("history")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              History ({historyList.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img src={nutechLogo} alt={FIRM_NAME} className="h-9 w-auto object-contain" />
            <div className="text-right hidden md:block">
              <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-wider uppercase block">
                Nutech Engineering
              </span>
              <span className="text-[10px] text-gray-400 truncate max-w-[280px] block">
                Raipur, Chhattisgarh
              </span>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "pending" ? (
        <div className="w-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="search"
                placeholder="Search Lead No. / Company / City..."
                className="pl-9 pr-4 py-2.5 w-full text-xs font-semibold border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                Total Pending: <strong className="text-gray-900 dark:text-white">{filteredPendingLeads.length}</strong>
              </span>
              <button
                type="button"
                onClick={loadLeads}
                disabled={isLoadingLeads}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="Refresh pending leads"
              >
                <RefreshCwIcon className={`h-3.5 w-3.5 ${isLoadingLeads ? "animate-spin text-blue-600" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs overflow-hidden">
            {isLoadingLeads ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-4">Loading pending quotations...</p>
              </div>
            ) : filteredPendingLeads.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-3">
                  <FileText size={24} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Pending Quotations</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {callTrackerLeads.length === 0
                    ? "No enquiries are currently waiting for quotation. Record follow-up calls and mark enquiries as 'Make Quotation' in Followup Tracker to populate this queue."
                    : "No pending quotations match your search."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Lead No.</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Company Name</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Planned Date</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Delay</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Location / Division</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Enquiry Items</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Enquiry Date</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredPendingLeads.map((lead) => {
                      const itemCount = Array.isArray(lead.items) ? lead.items.length : 0;
                      const tatInfo = calculateLeadsTat(lead, LEADS_STAGE_KEYS.PENDING_QUOTATION, tatRules);
                      return (
                        <tr
                          key={lead.leadNo}
                          className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                              {lead.leadNo}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-gray-900 dark:text-white text-sm">
                              {lead.companyName || "Unnamed"}
                            </div>
                            {lead.contactName && (
                              <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                {lead.contactName} {lead.contactNo ? `• ${lead.contactNo}` : ""}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-gray-700 dark:text-slate-300 whitespace-nowrap font-medium">
                            {tatInfo.plannedFormatted || "-"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <TatDelayBadge tat={tatInfo} />
                          </td>
                          <td className="px-4 py-3.5 text-gray-600 dark:text-slate-300">
                            <div>{lead.city || lead.state || "-"}</div>
                            {lead.division && (
                              <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-semibold">
                                {lead.division}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
                              {Array.isArray(lead.items) && lead.items.length > 0 ? (
                                lead.items.slice(0, 3).map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700"
                                  >
                                    {it.name || "Item"} ({it.quantity || 1} {it.uom || "NOS"})
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                              {itemCount > 3 && (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                  +{itemCount - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDisplayDate(lead.date || lead.quotationDate || lead.created_at?.split("T")[0])}
                          </td>
                          <td className="px-4 py-3.5 text-gray-700 dark:text-slate-300 whitespace-nowrap font-medium">
                            {tatInfo.plannedFormatted || "-"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <TatDelayBadge tat={tatInfo} />
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSelectPendingLead(lead)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer hover:shadow-md"
                            >
                              <span>Create Quotation</span>
                              <span className="text-xs">→</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (activeTab === "create" || activeTab === "revise") ? (
        <div className="w-full">
          {renderQuotationForm()}
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="relative w-full sm:w-96">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="search"
              placeholder="Search PO No. / Lead No. / Company..."
              className="pl-9 pr-4 py-2.5 w-full text-xs font-semibold border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs overflow-hidden">
            {isLoadingHistory ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-4">Loading quotation history...</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b p-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Quotation Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700 p-1">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5 text-sm">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden -mt-1">
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <img src={nutechLogo} alt={FIRM_NAME} className="h-14 w-auto object-contain" />
                  <p className="text-gray-500">{FIRM_ADDRESS}</p>
                </div>
                <div className="border-t border-gray-100 py-3 text-center">
                  <p className="text-sm font-bold tracking-[0.3em] text-gray-800 uppercase">Quotation</p>
                </div>
              </div>

              <div className="flex justify-between">
                <div>
                  <p className="text-gray-500">Lead No.: {formData.leadNo || "-"}</p>
                </div>
                <div className="text-right">
                  <p><span className="text-gray-500">Quotation Number:</span> <span className="font-medium">{formData.poNumber}</span></p>
                  <p><span className="text-gray-500">Quotation Date:</span> {formatDisplayDate(formData.quotationDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="font-semibold mb-1">Company Details</p>
                  <p>{formData.companyName || "-"} ({formData.division || "-"})</p>
                  <p>{formData.city || "-"}, {formData.state || "-"}</p>
                  <p>{formData.contactName || "-"} — {formData.contactNo || "-"}</p>
                  <p>GST: {formData.gst || "-"}</p>
                  <p>Freight Payment: {formData.freightType || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Billing Address</p>
                  <p className="whitespace-pre-wrap">{formData.billingAddress || "-"}</p>
                  <p className="font-semibold mt-2 mb-1">Shipping Address</p>
                  <p className="whitespace-pre-wrap">{formData.shippingAddress || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">Items & Quantities</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {["S/N", "Item", "Qty", "Rate", "Disc %", "HSN", "GST%", "Total"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left border-b border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="px-2 py-1.5">{index + 1}</td>
                          <td className="px-2 py-1.5">{item.item || "-"}</td>
                          <td className="px-2 py-1.5">{item.qty}</td>
                          <td className="px-2 py-1.5">{Number(item.rate || 0).toFixed(2)}</td>
                          <td className="px-2 py-1.5">{item.discountPercent || 0}%</td>
                          <td className="px-2 py-1.5">{item.hsn || "-"}</td>
                          <td className="px-2 py-1.5">{item.gst}%</td>
                          <td className="px-2 py-1.5 text-right">{Number(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col items-end gap-1 mt-2 text-sm">
                  <p><span className="text-gray-500">Base Price:</span> {summary.basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p><span className="text-gray-500">Discount:</span> {summary.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p><span className="text-gray-500">GST:</span> {summary.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p className="font-bold text-base">Grand Total: {summary.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-1">
                  Payment Terms: {formData.paymentTerms === "Custom" ? (formData.customPaymentTerms || "Custom") : (formData.paymentTerms || "-")}
                  {(formData.paymentTerms?.toLowerCase().includes("advance") || (formData.paymentTerms === "Custom" && formData.customPaymentTerms?.toLowerCase().includes("advance"))) &&
                    formData.advanceAmount && (Number(formData.advanceAmount) > 0) &&
                    ` (Advance Amount: ₹${Number(formData.advanceAmount).toLocaleString("en-IN")})`}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">Terms & Conditions</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {terms.map((t) => (
                    <li key={t.id}>{t.description || "-"}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t p-4 flex justify-end shrink-0">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quotation
