import { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Search,
  Loader2,
  X,
  Truck,
  Banknote,
  IndianRupee,
  FileText,
  Receipt,
  Paperclip,
  Upload,
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { formatDateDash, formatDateTime, formatPaymentTerms, toLocalIsoTimestamp } from "../utils/dateUtils";
import { generateVendorQuotationPdf } from "../utils/quotationPdfGenerator";
import { generatePoPdf } from "../utils/poPdfGenerator";
import TatStageBadge from "./TatStageBadge";
import CircularProcessingLoader from "./CircularProcessingLoader";
import { addOfficeHours } from "../services/purchaseTatEngine";

export default function PaymentView() {
  const { showToast } = useMagicToast();
  const {
    purchaseOrders,
    vendorPayments,
    tallyBillings: tallyBills,
    transporterFollowups: transporterShipments,
    vendorLiftings,
    materialReceipts,
    completedReturns,
    disbursePayment,
    getIndentNumber,
    getLiftNumber,
    getTatStatusForIndent,
    loading,
    isRefreshing,
    isBackgroundStreaming,
  } = usePurchaseWorkflow();

  // 3 Sub-workflows: 'advance' | 'vendor' | 'freight'
  const [subWorkflow, setSubWorkflow] = useState("advance");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advance Payment Modal
  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [currentPO, setCurrentPO] = useState(null);
  const [advAttachment, setAdvAttachment] = useState(null);
  const [advAttachmentName, setAdvAttachmentName] = useState("");
  const [advForm, setAdvForm] = useState({
    amount: "",
    mode: "NEFT / RTGS",
    transactionId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    advanceDecision: "completed",
    remarks: "",
  });

  // Bulk Vendor Payment Modal State
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState("vendor"); // "vendor" | "invoices"
  const [selectedBulkVendor, setSelectedBulkVendor] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [bulkInvoices, setBulkInvoices] = useState({}); // { [id]: { selected: boolean, payAmount: string, originalPending: number } }
  const [bulkFormData, setBulkFormData] = useState({
    paymentMode: "RTGS / Bank Transfer",
    transactionId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    proof: null,
    proofName: "",
  });

  // Bulk Freight Payment Modal State
  const [freightBulkOpen, setFreightBulkOpen] = useState(false);
  const [freightBulkStep, setFreightBulkStep] = useState("transporter"); // "transporter" | "invoices"
  const [selectedBulkTransporter, setSelectedBulkTransporter] = useState("");
  const [transporterSearch, setTransporterSearch] = useState("");
  const [bulkFreightInvoices, setBulkFreightInvoices] = useState({}); // { [id]: { selected: boolean, payAmount: string, originalPending: number } }
  const [freightFormData, setFreightFormData] = useState({
    paymentMode: "RTGS / Bank Transfer",
    transactionId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentProof: null,
    proofName: "",
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 1. Advance Payments Joined Data (Only for POs where advance payment is YES / required)
  const advanceData = useMemo(() => {
    return (purchaseOrders || [])
      .filter((po) => {
        const advAmt = Number(po.advance_amount || po.advanceAmount || 0);
        const isAdvFlagYes = String(po.advance_payment || po.advancePayment || "").toLowerCase() === "yes";
        const isAdvFlagNo = String(po.advance_payment || po.advancePayment || "").toLowerCase() === "no";
        const payType = String(po.payment_type || po.paymentTerms || "").toLowerCase();

        // If explicitly "no", exclude from advance section
        if (isAdvFlagNo) return false;

        // Must have advancePayment === "yes" OR advance_amount > 0 OR payment terms indicating advance
        const hasAdvance =
          isAdvFlagYes ||
          advAmt > 0 ||
          (payType.includes("advance") && !payType.includes("no advance"));

        return hasAdvance;
      })
      .map((po) => {
        const advPayments = (vendorPayments || []).filter(
          (p) => (p.po_id === po.id || p.po_id === po.po_number) && (p.payment_type === "Advance" || p.payment_type === "PI")
        );
        const totalAdvancePaid = Math.round(advPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100) / 100;
        const totalVal = Math.round(Number(po.total_amount || (po.quantity * (po.unit_rate || 500))) * 100) / 100;
        
        let targetAdvance = Number(po.advance_amount != null ? po.advance_amount : (po.advanceAmount || 0));
        if (targetAdvance <= 0 && po.advance_percentage) {
          targetAdvance = totalVal * (Number(po.advance_percentage) / 100);
        }
        if (targetAdvance <= 0) {
          const match = String(po.payment_type || "").match(/(\d+)%\s*advance/i);
          if (match && match[1]) {
            targetAdvance = totalVal * (Number(match[1]) / 100);
          }
        }
        targetAdvance = Math.round(targetAdvance * 100) / 100;

        const pendingAdvance = Math.max(0, Math.round((targetAdvance - totalAdvancePaid) * 100) / 100);
        const isSettled = targetAdvance > 0 ? totalAdvancePaid >= targetAdvance - 0.01 : totalAdvancePaid > 0;
        const latestAdvPayment = advPayments[0];

        return {
          id: po.id,
          indentId: po.indent_id || null,
          indentNumber: po.indent_number || po.indentNumber || (getIndentNumber ? getIndentNumber(po.indent_id) : po.indent_id) || "-",
          itemDetails: po.item_name || "-",
          quantity: `${po.quantity || 0} ${po.uom || "NOS"}`,
          vendorName: po.vendor_name || "-",
          poNumber: po.po_number || "-",
          poValue: `₹${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          advanceAmt: `₹${targetAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          paidSoFar: `₹${totalAdvancePaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          pendingAmt: `₹${pendingAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          receiveAmount: `₹${totalAdvancePaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          rawTargetAdvance: targetAdvance,
          rawTotalPaid: totalAdvancePaid,
          rawPendingAdvance: pendingAdvance,
          paid: isSettled ? "Yes" : "No",
          paymentTerms: formatPaymentTerms(po.payment_type || "Advance"),
          remarks: latestAdvPayment?.remarks || "-",
          plannedDate: (() => {
            const poDate = po.po_date || po.created_at;
            const advTat = getTatStatusForIndent(po.indent_id || po.id, "Payment");
            return (
              advTat?.dueAt ||
              (poDate ? addOfficeHours(poDate, 24 * 60)?.toISOString() : null) ||
              po.delivery_date ||
              "-"
            );
          })(),
          actualPaymentDate: latestAdvPayment ? latestAdvPayment.payment_date || latestAdvPayment.created_at?.split("T")[0] : "—",
          paymentReference: latestAdvPayment?.transaction_utr || "—",
          attachment: !!latestAdvPayment?.payment_receipt_url,
          attachmentUrl: latestAdvPayment?.payment_receipt_url || latestAdvPayment?.voucher_url || latestAdvPayment?.attachment_url || null,
          poCopy: po.po_copy_url || po.po_pdf_url || null,
          isSettled,
          status: isSettled ? "completed" : "pending",
          po,
        };
      });
  }, [purchaseOrders, vendorPayments, getIndentNumber, getTatStatusForIndent]);

  const advancePending = useMemo(() => {
    return advanceData
      .filter((r) => !r.isSettled)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          r.poNumber.toLowerCase().includes(s) ||
          r.vendorName.toLowerCase().includes(s) ||
          r.itemDetails.toLowerCase().includes(s) ||
          r.indentNumber.toLowerCase().includes(s)
        );
      });
  }, [advanceData, searchTerm]);

  const advanceHistory = useMemo(() => {
    return advanceData
      .filter((r) => r.isSettled || r.rawTotalPaid > 0)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          r.poNumber.toLowerCase().includes(s) ||
          r.vendorName.toLowerCase().includes(s) ||
          r.itemDetails.toLowerCase().includes(s) ||
          r.indentNumber.toLowerCase().includes(s)
        );
      });
  }, [advanceData, searchTerm]);

  // 2. Vendor Invoice Payments Joined Data
  const vendorInvoiceData = useMemo(() => {
    return (tallyBills || []).map((bill) => {
      const po = (purchaseOrders || []).find((p) => p.id === bill.po_id || p.po_number === bill.po_id);
      const rcpt = (materialReceipts || []).find((r) => r.po_id === bill.po_id);
      const payments = (vendorPayments || []).filter(
        (p) => (p.po_id === bill.po_id || p.po_id === po?.id) && p.payment_type === "Vendor Payment"
      );
      const advPayments = (vendorPayments || []).filter(
        (p) => (p.po_id === bill.po_id || p.po_id === po?.id) && p.payment_type === "Advance"
      );

      const advDeducted = Math.round(advPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100) / 100;
      const totalPaid = Math.round(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100) / 100;
      const billAmount = Math.round(Number(bill.invoice_amount || po?.total_amount || 25000) * 100) / 100;

      // Cross-join completed purchase returns matching this bill / PO / Indent across all parameters
      const normalizeStr = (v) => (v ? String(v).trim().toLowerCase() : "");
      const extractIndentCode = (v) => {
        if (!v) return null;
        const m = String(v).match(/IND-\d{4}-\d+/i);
        return m ? m[0].toUpperCase() : null;
      };

      // 1. Candidate Indent Numbers for this bill / PO
      const billIndents = new Set();
      if (po?.indent_number) {
        billIndents.add(po.indent_number.trim().toUpperCase());
        const ext = extractIndentCode(po.indent_number);
        if (ext) billIndents.add(ext);
      }
      if (po?.indent_id) {
        const resolved = getIndentNumber(po.indent_id);
        if (resolved && resolved !== "-") {
          billIndents.add(resolved.trim().toUpperCase());
          const ext = extractIndentCode(resolved);
          if (ext) billIndents.add(ext);
        }
      }
      if (bill?.indent_id) {
        const resolved = getIndentNumber(bill.indent_id);
        if (resolved && resolved !== "-") {
          billIndents.add(resolved.trim().toUpperCase());
          const ext = extractIndentCode(resolved);
          if (ext) billIndents.add(ext);
        }
      }
      if (bill?.vendor_invoice_number) {
        const ext = extractIndentCode(bill.vendor_invoice_number);
        if (ext) billIndents.add(ext);
      }

      // 2. Candidate PO identifiers for this bill
      const billPOs = new Set();
      if (bill?.po_id) billPOs.add(String(bill.po_id).trim().toLowerCase());
      if (po?.id) billPOs.add(String(po.id).trim().toLowerCase());
      if (po?.po_number) billPOs.add(String(po.po_number).trim().toLowerCase());

      // 3. Candidate Invoice / Bill Numbers
      const billInvoiceNums = new Set();
      if (bill?.vendor_invoice_number) {
        const raw = normalizeStr(bill.vendor_invoice_number);
        billInvoiceNums.add(raw);
        billInvoiceNums.add(raw.replace(/^inv-/, ""));
      }
      if (bill?.bill_number) {
        const raw = normalizeStr(bill.bill_number);
        billInvoiceNums.add(raw);
        billInvoiceNums.add(raw.replace(/^inv-/, ""));
      }

      const getDebitNotesList = (r) => {
        if (!r) return [];
        if (Array.isArray(r.debit_notes)) return r.debit_notes;
        if (Array.isArray(r.debitNotes)) return r.debitNotes;
        if (r.debit_notes && typeof r.debit_notes === "object") return [r.debit_notes];
        if (r.debitNote && typeof r.debitNote === "object") return [r.debitNote];
        return [];
      };

      const getItemsList = (r) => {
        if (!r) return [];
        if (Array.isArray(r.items)) return r.items;
        if (r.items && typeof r.items === "object") return [r.items];
        return [];
      };

      const matchedReturns = (completedReturns || []).filter((r) => {
        // A. Match by PO ID or PO Number
        const retPoId = normalizeStr(r.po_id);
        const retPoNum = normalizeStr(r.po_number);
        if (retPoId && billPOs.has(retPoId)) return true;
        if (retPoNum && billPOs.has(retPoNum)) return true;

        // B. Match by Indent Number (header level or line item level)
        const retIndentHeader = r.indent_number ? r.indent_number.trim().toUpperCase() : null;
        if (retIndentHeader && (billIndents.has(retIndentHeader) || billIndents.has(extractIndentCode(retIndentHeader)))) return true;

        const itemIndentMatches = getItemsList(r).some((it) => {
          const itInd = it.indent_number ? it.indent_number.trim().toUpperCase() : null;
          const itSku = it.sku ? it.sku.trim().toUpperCase() : null;
          if (itInd && (billIndents.has(itInd) || billIndents.has(extractIndentCode(itInd)))) return true;
          if (itSku && (billIndents.has(itSku) || billIndents.has(extractIndentCode(itSku)))) return true;
          return false;
        });
        if (itemIndentMatches) return true;

        // C. Match by Bill / Invoice Number
        if (r.bill_number) {
          const retBillRaw = normalizeStr(r.bill_number);
          const retBillClean = retBillRaw.replace(/^inv-/, "");
          if (billInvoiceNums.has(retBillRaw) || billInvoiceNums.has(retBillClean)) {
            const billVendor = normalizeStr(bill.vendor_name || po?.vendor_name);
            const retVendor = normalizeStr(r.vendor_name || r.supplier);
            if (!billVendor || !retVendor || billVendor === retVendor || billVendor.includes(retVendor) || retVendor.includes(billVendor)) {
              return true;
            }
          }
        }

        return false;
      });

      const returnQty = Math.round(
        matchedReturns.reduce((sum, r) => {
          const items = getItemsList(r);
          const itemQty = items.reduce(
            (iSum, it) =>
              iSum + (Number(it.approved_qty) || Number(it.damage_qty) || 0),
            0
          );
          return sum + itemQty;
        }, 0) * 100
      ) / 100;

      const returnAmount = Math.round(
        matchedReturns.reduce((sum, r) => {
          const dnList = getDebitNotesList(r);
          const dnSum = dnList.reduce((dSum, dn) => dSum + Number(dn.amount || 0), 0);
          const items = getItemsList(r);
          const itemsVal = items.reduce(
            (iSum, it) =>
              iSum +
              (Number(it.return_value) ||
                (Number(it.approved_qty || it.damage_qty || 0) *
                  Number(it.unit_rate || 0))),
            0
          );
          const rVal = dnSum > 0 ? dnSum : (Number(r.total_damage_value) || itemsVal);
          return sum + rVal;
        }, 0) * 100
      ) / 100;

      const rawDebitNotes = matchedReturns.flatMap((r) => getDebitNotesList(r));
      const debitNotes = [];
      const seenDnKeys = new Set();

      rawDebitNotes.forEach((dn, idx) => {
        const num =
          dn.debit_note_number ||
          dn.number ||
          dn.debitNoteNumber ||
          (rawDebitNotes.length > 1 ? `DN-${idx + 1}` : "DN");
        const url =
          dn.document_url ||
          dn.imageUrl ||
          dn.attachment_url ||
          dn.document_name ||
          dn.imageName ||
          null;
        const key = dn.id ? String(dn.id) : `${num}_${url || ""}`;
        if (!seenDnKeys.has(key)) {
          seenDnKeys.add(key);
          debitNotes.push({
            id: dn.id || `${num}-${idx}`,
            number: num,
            label: num,
            url: url,
            name: dn.document_name || dn.imageName || num,
            amount: Number(dn.amount) || 0,
          });
        }
      });

      // Fallback: If return completed with items/damage value but no separate debit note row
      if (debitNotes.length === 0 && (returnAmount > 0 || returnQty > 0)) {
        matchedReturns.forEach((r, idx) => {
          const retNum = r.return_number || r.returnNumber;
          const url = r.bill_image_url || r.billImage || null;
          debitNotes.push({
            id: r.id || `ret-${idx}`,
            number: retNum || (matchedReturns.length > 1 ? `DN-${idx + 1}` : "DN"),
            label: retNum || (matchedReturns.length > 1 ? `DN-${idx + 1}` : "DN"),
            url: url,
            name: retNum || "Debit Note",
            amount: Number(r.total_damage_value) || 0,
          });
        });
      }

      const firstDebitNote = debitNotes[0] || null;
      const debitNoteUrl = firstDebitNote?.url || null;
      const debitNoteName = firstDebitNote?.name || null;

      // Net Pending Amount deducting Advance, Total Paid, and Return Amount
      const pendingAmount = Math.max(0, Math.round((billAmount - advDeducted - totalPaid - returnAmount) * 100) / 100);
      const isSettled = pendingAmount <= 1;
      const latestPayment = payments[0];

      return {
        id: bill.id,
        indentId: po?.indent_id || bill.indent_id || null,
        invoiceNumber: bill.vendor_invoice_number || (po?.indent_number ? `INV-${po.indent_number}` : (po?.indent_id ? `INV-${getIndentNumber(po.indent_id)}` : "-")),
        vendorName: bill.vendor_name || po?.vendor_name || "-",
        qty: `${po?.quantity || 0} ${po?.uom || "NOS"}`,
        totalBillValue: `₹${billAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        advancePaid: `₹${advDeducted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        returnQty: returnQty > 0 ? `${returnQty} ${po?.uom || "NOS"}` : "—",
        rawReturnQty: returnQty,
        returnAmount: returnAmount > 0 ? `₹${returnAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
        rawReturnAmount: returnAmount,
        debitNotes,
        debitNoteUrl,
        debitNoteName,
        hasDebitNote: debitNotes.length > 0 && debitNotes.some((dn) => !!dn.url),
        hasReturn: returnAmount > 0 || returnQty > 0,
        netPayable: `₹${pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        rawNetPayable: pendingAmount,
        pendingAmount: `₹${pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalPaidAmount: `₹${(advDeducted + totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        amountPaid: `₹${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        rawPendingAmount: pendingAmount,
        rawTotalBillValue: billAmount,
        rawBillAmount: billAmount,
        rawAdvancePaid: advDeducted,
        rawTotalPaidAmount: advDeducted + totalPaid,
        billingDate: bill.invoice_date || "-",
        plannedDate: (() => {
          const billStartDate = bill.invoice_date || bill.created_at || po?.created_at;
          let creditDays = 0;
          const payTypeStr = String(po?.payment_type || bill.payment_terms || "").trim();
          const daysMatch = payTypeStr.match(/(\d+)/);
          if (daysMatch && !payTypeStr.toLowerCase().includes("advance")) {
            creditDays = parseInt(daysMatch[1], 10);
          }

          let pDate = null;
          if (billStartDate) {
            const sDate = new Date(billStartDate);
            if (!isNaN(sDate.getTime())) {
              if (creditDays > 0) {
                const target = new Date(sDate.getTime());
                target.setDate(target.getDate() + creditDays);
                pDate = target.toISOString();
              } else {
                pDate = addOfficeHours(sDate, 24 * 60)?.toISOString();
              }
            }
          }
          if (!pDate) {
            const vTat = getTatStatusForIndent(po?.indent_id || bill.indent_id || po?.id, "Payment");
            pDate = vTat?.dueAt || bill.invoice_date || po?.delivery_date || new Date().toISOString();
          }
          return pDate;
        })(),
        paymentTerms: formatPaymentTerms(bill?.payment_terms || po?.payment_type || po?.payment_terms || "30 Days"),
        paymentDate: latestPayment ? latestPayment.payment_date || latestPayment.created_at?.split("T")[0] : "—",
        poNumber: po?.po_number || "-",
        invoiceCopy: !!bill.bill_copy_url,
        recQty: `${rcpt?.accepted_quantity || po?.quantity || 0} ${po?.uom || "NOS"}`,
        recItems: po?.item_name || "-",
        paymentMode: latestPayment?.payment_mode || "NEFT / RTGS",
        transactionId: latestPayment?.transaction_utr || "—",
        status: isSettled ? "Settled" : "Pending",
        proof: !!latestPayment?.payment_receipt_url,
        isSettled,
        bill,
        po,
      };
    });
  }, [tallyBills, purchaseOrders, vendorPayments, materialReceipts, completedReturns, getIndentNumber, getTatStatusForIndent]);

  const vendorPending = useMemo(() => {
    return vendorInvoiceData
      .filter((r) => !r.isSettled)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          r.invoiceNumber.toLowerCase().includes(s) ||
          r.vendorName.toLowerCase().includes(s) ||
          r.poNumber.toLowerCase().includes(s) ||
          (r.paymentTerms && r.paymentTerms.toLowerCase().includes(s))
        );
      });
  }, [vendorInvoiceData, searchTerm]);

  const vendorHistory = useMemo(() => {
    return vendorInvoiceData
      .filter((r) => r.isSettled || r.rawPendingAmount <= 1)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          r.invoiceNumber.toLowerCase().includes(s) ||
          r.vendorName.toLowerCase().includes(s) ||
          r.poNumber.toLowerCase().includes(s) ||
          (r.paymentTerms && r.paymentTerms.toLowerCase().includes(s))
        );
      });
  }, [vendorInvoiceData, searchTerm]);

  // 3. Freight Payments Joined Data
  const freightData = useMemo(() => {
    return (transporterShipments || []).map((tf) => {
      const po = (purchaseOrders || []).find((p) => p.id === tf.po_id || p.po_number === tf.po_id);
      const lift = (vendorLiftings || []).find((l) => l.id === tf.lifting_id || l.po_id === tf.po_id);
      const payments = (vendorPayments || []).filter(
        (p) => (p.po_id === tf.po_id || p.po_id === po?.id) && p.payment_type === "Freight Payment"
      );
      const totalPaid = Math.round(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100) / 100;
      const freightAmt = Math.round(Number(tf.freight_amount || lift?.total_freight || 4500) * 100) / 100;
      const pendingFreight = Math.max(0, Math.round((freightAmt - totalPaid) * 100) / 100);
      const isSettled = pendingFreight <= 1;
      const latestPayment = payments[0];

      return {
        id: tf.id,
        indentId: tf.indent_id || lift?.indent_id || po?.indent_id || null,
        unitTrackingNo: tf.bilty_number || lift?.lifting_number || lift?.liftNumber || (getLiftNumber ? getLiftNumber(lift?.id) : null) || "-",
        lrNumber: tf.bilty_number || lift?.lr_number || lift?.bilty_number || "-",
        transporterName: tf.transporter_name || lift?.contact_person || "-",
        qty: `${lift?.lifting_qty || po?.quantity || 0} ${po?.uom || lift?.uom || "Kgs"}`,
        freightAmt: `₹${freightAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pendingAmount: `₹${pendingFreight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        amountPaid: `₹${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        rawFreightAmt: freightAmt,
        rawPendingFreight: pendingFreight,
        vehicleNo: tf.vehicle_number || lift?.vehicle_number || "-",
        contactNo: tf.driver_contact || lift?.driver_contact || "-",
        plannedDate: (() => {
          const freightStartDate = tf.dispatch_date || tf.created_at || lift?.actual_lifting_date || lift?.expected_lifting_date;
          let pDate = null;
          if (tf.expected_arrival_date) {
            const arrDate = new Date(tf.expected_arrival_date);
            if (!isNaN(arrDate.getTime())) {
              pDate = arrDate.toISOString();
            }
          }
          if (!pDate && freightStartDate) {
            const sDate = new Date(freightStartDate);
            if (!isNaN(sDate.getTime())) {
              pDate = addOfficeHours(sDate, 72 * 60)?.toISOString();
            }
          }
          if (!pDate) {
            const fTat = getTatStatusForIndent(tf.indent_id || lift?.indent_id || po?.indent_id, "Payment");
            pDate = fTat?.dueAt || tf.expected_arrival_date || lift?.expected_lifting_date || new Date().toISOString();
          }
          return pDate;
        })(),
        paymentDate: latestPayment ? latestPayment.payment_date || latestPayment.created_at?.split("T")[0] : null,
        biltyCopy: !!(tf.bilty_copy_url || lift?.bilty_copy_url),
        paymentMode: latestPayment?.payment_mode || "Bank Transfer",
        transactionId: latestPayment?.transaction_utr || "-",
        status: isSettled ? "Paid" : "Pending",
        proof: true,
        isSettled,
        tf,
        po,
        lift,
      };
    });
  }, [transporterShipments, purchaseOrders, vendorLiftings, vendorPayments, getLiftNumber, getTatStatusForIndent]);

  const freightPending = useMemo(() => {
    return freightData
      .filter((r) => !r.isSettled)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          r.unitTrackingNo.toLowerCase().includes(s) ||
          r.lrNumber.toLowerCase().includes(s) ||
          r.transporterName.toLowerCase().includes(s) ||
          r.vehicleNo.toLowerCase().includes(s)
        );
      });
  }, [freightData, searchTerm]);

  const freightHistory = useMemo(() => {
    return freightData
      .filter((r) => r.isSettled || r.rawPendingFreight <= 1)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          r.unitTrackingNo.toLowerCase().includes(s) ||
          r.lrNumber.toLowerCase().includes(s) ||
          r.transporterName.toLowerCase().includes(s) ||
          r.vehicleNo.toLowerCase().includes(s)
        );
      });
  }, [freightData, searchTerm]);

  // Synchronize sidebar red badge with the exact sum of the 3 Payment Hub sections
  useEffect(() => {
    const totalPaymentCount =
      advanceData.filter((r) => !r.isSettled).length +
      vendorInvoiceData.filter((r) => !r.isSettled).length +
      freightData.filter((r) => !r.isSettled).length;

    window.dispatchEvent(
      new CustomEvent("purchase-payment-count-updated", {
        detail: { paymentCount: totalPaymentCount },
      }),
    );
  }, [advanceData, vendorInvoiceData, freightData]);

  // Active paginated data
  const getCurrentList = () => {
    if (subWorkflow === "advance") {
      return activeTab === "pending" ? advancePending : advanceHistory;
    } else if (subWorkflow === "vendor") {
      return activeTab === "pending" ? vendorPending : vendorHistory;
    } else {
      return activeTab === "pending" ? freightPending : freightHistory;
    }
  };

  const currentList = getCurrentList();
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  // Distinct Vendors with Pending Invoices
  const vendorsList = useMemo(() => {
    const list = new Set();
    vendorPending.forEach((r) => {
      if (r.vendorName && r.vendorName !== "-") list.add(r.vendorName);
    });
    return Array.from(list).sort();
  }, [vendorPending]);

  const filteredVendorsList = useMemo(() => {
    const term = vendorSearch.toLowerCase();
    return vendorsList.filter((v) => v.toLowerCase().includes(term));
  }, [vendorsList, vendorSearch]);

  const bulkTotalToPay = useMemo(() => {
    return Object.entries(bulkInvoices)
      .filter(([, info]) => info.selected)
      .reduce((sum, [, info]) => sum + (parseFloat(info.payAmount) || 0), 0);
  }, [bulkInvoices]);

  // Distinct Transporters with Pending Freight
  const transportersList = useMemo(() => {
    const list = new Set();
    freightPending.forEach((r) => {
      if (r.transporterName && r.transporterName !== "-") list.add(r.transporterName);
    });
    return Array.from(list).sort();
  }, [freightPending]);

  const filteredTransportersList = useMemo(() => {
    const term = transporterSearch.toLowerCase();
    return transportersList.filter((v) => v.toLowerCase().includes(term));
  }, [transportersList, transporterSearch]);

  const freightBulkTotalToPay = useMemo(() => {
    return Object.entries(bulkFreightInvoices)
      .filter(([, info]) => info.selected)
      .reduce((sum, [, info]) => sum + (parseFloat(info.payAmount) || 0), 0);
  }, [bulkFreightInvoices]);

  // 1. Advance Payment Handlers
  const handleViewPoCopy = async (row) => {
    const directUrl =
      (typeof row.poCopy === "string" && row.poCopy.startsWith("http") ? row.poCopy : null) ||
      row.po_copy_url ||
      row.po_pdf_url ||
      row.po?.po_copy_url ||
      row.po?.po_pdf_url ||
      row.po?.po_file_url ||
      row.po?.po_copy ||
      row.po?.attachment_url;

    if (directUrl && String(directUrl).startsWith("http")) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const matchedPo =
      row.po ||
      (purchaseOrders || []).find(
        (p) =>
          p.id === row.id ||
          p.id === row.po_id ||
          p.po_number === row.poNumber ||
          p.po_number === row.po_number
      ) ||
      row;

    try {
      if (showToast)
        showToast(
          `Opening PO ${row.poNumber || matchedPo.po_number || "Copy"}...`,
          "info"
        );
      await generatePoPdf(
        {
          ...matchedPo,
          poNumber:
            matchedPo.po_number ||
            matchedPo.poNumber ||
            row.poNumber ||
            "PO-2026-001",
          poDate:
            matchedPo.po_date ||
            matchedPo.created_at ||
            new Date().toISOString().split("T")[0],
          vendorName: matchedPo.vendor_name || row.vendorName || "Supplier",
          vendorAddress:
            matchedPo.vendor_address ||
            `${matchedPo.vendor_name || row.vendorName || "Supplier"} Industrial Complex`,
          vendorContact:
            matchedPo.vendor_contact || "Authorized Representative",
          vendorPhone:
            matchedPo.vendor_phone ||
            matchedPo.vendor_contact_no ||
            "9123456789",
          vendorEmail:
            matchedPo.vendor_email ||
            `sales@${(matchedPo.vendor_name || row.vendorName || "vendor").toLowerCase().replace(/\s+/g, "")}.com`,
          vendorGstin: matchedPo.vendor_gstin || "22AAAPL1234A1Z5",
          consigneeName:
            matchedPo.firm_name ||
            matchedPo.consigneeName ||
            "Nutech Pipes Pvt. Ltd.",
          billingName:
            matchedPo.firm_name ||
            matchedPo.consigneeName ||
            "Nutech Pipes Pvt. Ltd.",
          destinationName:
            matchedPo.delivery_location || "Plant",
          deliveryLocation:
            matchedPo.delivery_location || "Plant",
          quotationNumber:
            matchedPo.quotation_number || matchedPo.quotation_no || "-",
          quotationDate: matchedPo.quotation_date || "-",
          paymentTerms: matchedPo.payment_type
            ? `Advance Payment (${matchedPo.advance_percentage || 0}%)`
            : matchedPo.payment_terms || "30 Days Credit",
          advanceAmount: Number(matchedPo.advance_amount || 0),
          transportType: matchedPo.transport_type || "F.O.R. Destination",
          remarks: matchedPo.remarks || "",
          items:
            matchedPo.items && matchedPo.items.length > 0
              ? matchedPo.items
              : [
                  {
                    srNo: 1,
                    itemName: matchedPo.item_name || row.itemDetails || "Item",
                    quantity: matchedPo.quantity || 1,
                    uom: matchedPo.uom || "NOS",
                    rate: matchedPo.unit_rate || 0,
                    hsn: matchedPo.hsn || "7216",
                    amount: matchedPo.total_amount || 0,
                  },
                ],
          totalAmount: matchedPo.total_amount || 0,
        },
        { openWindow: true }
      );
    } catch (err) {
      console.error("Error generating PO PDF:", err);
      if (showToast) showToast("Failed to generate PO copy", "error");
    }
  };

  const handleOpenAdvModal = (po) => {
    setCurrentPO(po);
    const targetAdv = Number((po.rawTargetAdvance || 500).toFixed(2));
    const paid = Number((po.rawTotalPaid || 0).toFixed(2));
    const pending = Number((po.rawPendingAdvance != null ? po.rawPendingAdvance : Math.max(0, targetAdv - paid)).toFixed(2));
    const pendingVal = pending > 0 ? pending : targetAdv;
    setAdvForm({
      amount: pendingVal.toFixed(2),
      mode: "NEFT / RTGS",
      transactionId: "",
      paymentDate: new Date().toISOString().split("T")[0],
      advanceDecision: "completed",
      remarks: "",
    });
    setAdvAttachment(null);
    setAdvAttachmentName("");
    setAdvModalOpen(true);
  };

  const handleAdvAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdvAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => setAdvAttachment(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmitAdvPayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await disbursePayment({
        poId: currentPO.po?.id || currentPO.id,
        vendorName: currentPO.vendorName,
        paymentType: "Advance",
        amount: Number(advForm.amount),
        paymentMode: advForm.mode || "Bank Transfer",
        transactionUtr: advForm.transactionId || null,
        paymentDate: toLocalIsoTimestamp(advForm.paymentDate),
        remarks: advForm.remarks,
        voucherUrl: advAttachment || null,
        paymentStatus: advForm.advanceDecision === "completed" ? "Paid" : "Partially Paid",
      });

      if (showToast)
        showToast(
          `Advance payment of ₹${Number(advForm.amount).toLocaleString()} recorded for ${currentPO.vendorName}!`,
          "success"
        );

      setAdvModalOpen(false);
    } catch (err) {
      console.error("Advance payment error:", err);
      if (showToast) showToast(`Payment recording failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Bulk Vendor Payments Handlers
  const handleBulkOpen = (vendorName = "") => {
    setBulkFormData({
      paymentMode: "RTGS / Bank Transfer",
      transactionId: "",
      paymentDate: new Date().toISOString().split("T")[0],
      proof: null,
      proofName: "",
    });

    if (vendorName) {
      handleSelectVendor(vendorName);
    } else {
      setSelectedBulkVendor("");
      setVendorSearch("");
      setBulkInvoices({});
      setBulkStep("vendor");
    }
    setBulkOpen(true);
  };

  const handleSelectVendor = (vendorName) => {
    setSelectedBulkVendor(vendorName);
    const matched = vendorPending.filter((r) => r.vendorName === vendorName);
    const invoiceStates = {};
    matched.forEach((r) => {
      const pAmt = Number((r.rawPendingAmount || 0).toFixed(2));
      invoiceStates[r.id] = {
        selected: false,
        payAmount: pAmt.toFixed(2),
        originalPending: pAmt,
      };
    });
    setBulkInvoices(invoiceStates);
    setBulkStep("invoices");
  };

  const handleBulkProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBulkFormData((prev) => ({
        ...prev,
        proof: reader.result,
        proofName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const selectedIds = Object.entries(bulkInvoices)
      .filter(([, info]) => info.selected)
      .map(([id]) => id);

    if (selectedIds.length === 0) {
      if (showToast) showToast("Please select at least one invoice.", "warning");
      return;
    }
    if (!bulkFormData.paymentMode) {
      if (showToast) showToast("Please select payment mode.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        const rec = vendorPending.find((r) => r.id === id);
        if (!rec) continue;
        const payInfo = bulkInvoices[id];
        const payAmount = parseFloat(payInfo.payAmount) || 0;
        if (payAmount <= 0) continue;

        const remainingAfter = (rec.rawPendingAmount || 0) - payAmount;
        const paymentStatus = remainingAfter <= 1 ? "Paid" : "Partially Paid";

        await disbursePayment({
          poId: rec.po?.id || rec.poId || rec.id,
          vendorName: rec.vendorName || selectedBulkVendor,
          paymentType: "Vendor Payment",
          amount: payAmount,
          paymentMode: bulkFormData.paymentMode,
          transactionUtr: bulkFormData.transactionId || null,
          paymentDate: new Date(bulkFormData.paymentDate).toISOString(),
          voucherUrl: bulkFormData.proof || null,
          paymentStatus: paymentStatus,
          remarks: `Invoice: ${rec.invoiceNumber}`,
        });
        successCount++;
      }

      if (successCount > 0) {
        if (showToast) showToast(`Successfully processed ${successCount} invoice payment(s)!`, "success");
        setBulkOpen(false);
        setBulkInvoices({});
        setBulkStep("vendor");
      }
    } catch (err) {
      console.error("Bulk vendor payment error:", err);
      if (showToast) showToast(`Payment failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Bulk Freight Payments Handlers
  const handleFreightBulkOpen = (transporterName = "") => {
    setFreightFormData({
      paymentMode: "RTGS / Bank Transfer",
      transactionId: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentProof: null,
      proofName: "",
    });

    if (transporterName) {
      handleSelectTransporter(transporterName);
    } else {
      setSelectedBulkTransporter("");
      setTransporterSearch("");
      setBulkFreightInvoices({});
      setFreightBulkStep("transporter");
    }
    setFreightBulkOpen(true);
  };

  const handleSelectTransporter = (transporterName) => {
    setSelectedBulkTransporter(transporterName);
    const matched = freightPending.filter((r) => r.transporterName === transporterName);
    const invoiceStates = {};
    matched.forEach((r) => {
      const pAmt = Number((r.rawPendingFreight || 0).toFixed(2));
      invoiceStates[r.id] = {
        selected: false,
        payAmount: pAmt.toFixed(2),
        originalPending: pAmt,
      };
    });
    setBulkFreightInvoices(invoiceStates);
    setFreightBulkStep("invoices");
  };

  const handleFreightProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFreightFormData((prev) => ({
        ...prev,
        paymentProof: reader.result,
        proofName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFreightBulkSubmit = async (e) => {
    e.preventDefault();
    const selectedIds = Object.entries(bulkFreightInvoices)
      .filter(([, info]) => info.selected)
      .map(([id]) => id);

    if (selectedIds.length === 0) {
      if (showToast) showToast("Please select at least one freight entry.", "warning");
      return;
    }
    if (!freightFormData.paymentMode) {
      if (showToast) showToast("Please select payment mode.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        const rec = freightPending.find((r) => r.id === id);
        if (!rec) continue;
        const payInfo = bulkFreightInvoices[id];
        const payAmount = parseFloat(payInfo.payAmount) || 0;
        if (payAmount <= 0) continue;

        const remainingAfter = (rec.rawPendingFreight || 0) - payAmount;
        const paymentStatus = remainingAfter <= 1 ? "Paid" : "Partially Paid";

        await disbursePayment({
          poId: rec.po?.id || rec.po_id || rec.id,
          vendorName: rec.transporterName || selectedBulkTransporter,
          paymentType: "Freight Payment",
          amount: payAmount,
          paymentMode: freightFormData.paymentMode,
          transactionUtr: freightFormData.transactionId || null,
          paymentDate: new Date(freightFormData.paymentDate).toISOString(),
          voucherUrl: freightFormData.paymentProof || null,
          paymentStatus: paymentStatus,
          remarks: `LR No: ${rec.lrNumber || "-"} | Tracking: ${rec.unitTrackingNo || "-"}`,
        });
        successCount++;
      }

      if (successCount > 0) {
        if (showToast) showToast(`Successfully processed ${successCount} freight payment(s)!`, "success");
        setFreightBulkOpen(false);
        setBulkFreightInvoices({});
        setFreightBulkStep("transporter");
      }
    } catch (err) {
      console.error("Bulk freight payment error:", err);
      if (showToast) showToast(`Freight payment failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Direct File / PDF Open Handlers ──────────────────────────────────────────
  const handleOpenInvoiceCopy = async (row) => {
    try {
      const directUrl =
        row.bill?.tally_bill_copy_url ||
        row.bill?.bill_copy_url ||
        row.bill?.invoice_copy_url ||
        row.bill?.attachment_url ||
        row.bill?.invoice_pdf_url ||
        row.bill?.pdf_url ||
        row.receipt?.invoice_copy_url ||
        row.receipt?.bill_copy_url ||
        row.receipt?.bill_image_url ||
        row.po?.invoice_copy_url ||
        row.po?.po_copy_url ||
        row.po?.po_pdf_url;

      if (directUrl && String(directUrl).startsWith("http")) {
        window.open(directUrl, "_blank", "noopener,noreferrer");
        if (showToast) showToast(`Opening Invoice copy for ${row.invoiceNumber}...`, "info");
        return;
      }

      // If no uploaded URL, generate official Vendor Commercial Invoice PDF on-the-fly and open in a new tab
      const vendorName = row.vendorName || "Vendor";
      const quantity = parseFloat(row.qty) || row.po?.quantity || 1;
      const rawRate = Number(
        row.po?.unit_rate ||
        (row.rawBillAmount && quantity ? (row.rawBillAmount / quantity) : 75)
      );
      const uom = row.po?.uom || "NOS";

      await generateVendorQuotationPdf({
        vendor_name: vendorName,
        vendor_address: row.po?.vendor_address || `${vendorName}, Industrial Area`,
        vendor_contact: row.po?.vendor_contact || row.po?.supplier_contact || "-",
        vendor_email: row.po?.vendor_email || "-",
        vendor_gst: row.po?.vendor_gst || "-",
        companyName: "Nutech Global Ltd",
        indent_number: row.po?.indent_number || row.invoiceNumber,
        item_name: row.recItems || row.po?.item_name || "Material Item",
        quoted_rate: rawRate,
        quantity: quantity,
        uom: uom,
        gst_percent: 18,
        payment_terms: row.po?.payment_type || "30 days",
        delivery_terms: "7-10 days",
        transport_type: row.po?.transport_type || "F.O.R.",
        status: "Commercial Tax Invoice",
        submission_date: row.billingDate && row.billingDate !== "-" ? row.billingDate : new Date().toISOString().split("T")[0],
        remarks: `Commercial Tax Invoice: ${row.invoiceNumber} | PO: ${row.poNumber}`,
      });

      if (showToast) showToast(`Opening Invoice ${row.invoiceNumber} in a new tab...`, "info");
    } catch (err) {
      console.error("Error opening invoice copy:", err);
      if (showToast) showToast(`Failed to open invoice copy: ${err.message}`, "error");
    }
  };

  const handleOpenBiltyCopy = (row) => {
    const directUrl =
      row.biltyCopy ||
      row.bilty_url ||
      row.bilty_image_url ||
      row.attachment_url ||
      row.biltyAttachment ||
      row.lifting?.bilty_image_url ||
      row.shipment?.bilty_image_url;

    if (directUrl && String(directUrl).startsWith("http")) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      if (showToast) showToast(`Opening Bilty for ${row.unitTrackingNo || row.lrNumber}...`, "info");
    } else {
      if (showToast) showToast(`No bilty document uploaded for LR: ${row.lrNumber || row.unitTrackingNo}`, "info");
    }
  };

  const handleOpenPaymentProof = (row) => {
    const directUrl =
      row.proofUrl ||
      row.voucherUrl ||
      row.voucher_url ||
      row.payment_receipt_url ||
      row.attachment_url ||
      row.latestPayment?.payment_receipt_url ||
      row.latestPayment?.voucher_url;

    if (directUrl && String(directUrl).startsWith("http")) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      if (showToast) showToast("Opening payment proof / voucher in a new tab...", "info");
    } else {
      if (showToast) showToast("No payment proof attached", "info");
    }
  };

  const handleOpenDebitNoteDoc = (dn, invoiceNumber = "") => {
    const directUrl = dn?.url || dn?.document_url || dn?.imageUrl || dn?.attachment_url;
    const dnLabel = dn?.label || dn?.number || "Debit Note";
    if (
      directUrl &&
      (String(directUrl).startsWith("http://") ||
        String(directUrl).startsWith("https://") ||
        String(directUrl).startsWith("blob:") ||
        String(directUrl).startsWith("data:"))
    ) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      if (showToast) showToast(`Opening Debit Note ${dnLabel} for ${invoiceNumber}...`, "info");
      return;
    }
    if (directUrl) {
      const bucketUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}/storage/v1/object/public/maintenance/purchase-returns/debit-notes/${directUrl}`;
      window.open(bucketUrl, "_blank", "noopener,noreferrer");
      if (showToast) showToast(`Opening Debit Note ${dnLabel} for ${invoiceNumber}...`, "info");
      return;
    }
    if (showToast) showToast(`No document uploaded for Debit Note ${dnLabel}`, "info");
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 7 : Unified Payment Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage advance disbursements, vendor invoice settlements, and freight transport payments.
              </p>
            </div>
          </div>

          {/* Search Box & Continuity Stream Badge */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {isBackgroundStreaming && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold animate-pulse shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Syncing live batches...</span>
              </div>
            )}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, vendor, PO..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 3 Sub-Workflow Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setSubWorkflow("advance");
              setCurrentPage(1);
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              subWorkflow === "advance"
                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">1. Advance / PI Payments</div>
              <div className="text-[11px] text-slate-500">
                {loading || isRefreshing ? "..." : advancePending.length} pending requests
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubWorkflow("vendor");
              setCurrentPage(1);
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              subWorkflow === "vendor"
                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">2. Vendor Invoices</div>
              <div className="text-[11px] text-slate-500">
                {loading || isRefreshing ? "..." : vendorPending.length} pending bills
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubWorkflow("freight");
              setCurrentPage(1);
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              subWorkflow === "freight"
                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <div className="p-2 bg-purple-600 text-white rounded-xl">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">3. Freight Payments</div>
              <div className="text-[11px] text-slate-500">
                {loading || isRefreshing ? "..." : freightPending.length} pending bilty dues
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Main Content Card with Dual Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        {/* Dual Tabs & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Pending Queues ({loading || isRefreshing ? "..." : currentList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Payment History</span>
            </button>
          </div>

          {/* Process Payment Button for Vendor and Freight workflows */}
          {subWorkflow === "vendor" && activeTab === "pending" && (
            <button
              type="button"
              onClick={() => handleBulkOpen()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
            >
              <Banknote className="w-4 h-4" />
              <span>Process Payment</span>
            </button>
          )}
          {subWorkflow === "freight" && activeTab === "pending" && (
            <button
              type="button"
              onClick={() => handleFreightBulkOpen()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
            >
              <Banknote className="w-4 h-4" />
              <span>Process Payment</span>
            </button>
          )}
        </div>

        {/* 3. Tables with Exact Columns */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              {/* SUBWORKFLOW 1: ADVANCE PAYMENT */}
              {subWorkflow === "advance" && activeTab === "pending" && (
                <tr>
                  <th className="p-3 text-center">Action</th>
                  <th className="p-3 text-center">PO Copy</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3 text-right">PO Value</th>
                  <th className="p-3 text-right">Advance Amt</th>
                  <th className="p-3 text-right">Paid So Far</th>
                  <th className="p-3 text-right">Pending Amt</th>
                  <th className="p-3 text-center">Paid</th>
                  <th className="p-3">Payment Terms</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                </tr>
              )}
              {subWorkflow === "advance" && activeTab === "history" && (
                <tr>
                  <th className="p-3 text-center">PO Copy</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3 text-right">PO Value</th>
                  <th className="p-3 text-right">Advance Amt</th>
                  <th className="p-3 text-right">Receive Amount</th>
                  <th className="p-3 text-center">Paid</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                  <th className="p-3 text-center">Actual Payment Date</th>
                  <th className="p-3 font-mono">Payment Reference</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 text-center">Attachment</th>
                </tr>
              )}

              {/* SUBWORKFLOW 2: VENDOR PAYMENT */}
              {subWorkflow === "vendor" && activeTab === "pending" && (
                <tr>
                  <th className="p-3 text-center">Action</th>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3 text-center">Payment Terms</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total Bill Value</th>
                  <th className="p-3 text-right">Advance Paid</th>
                  <th className="p-3 text-center text-amber-700 dark:text-amber-400">Return Qty</th>
                  <th className="p-3 text-right text-amber-700 dark:text-amber-400">Return Amount</th>
                  <th className="p-3 text-center text-amber-700 dark:text-amber-400">Debit Note</th>
                  <th className="p-3 text-right text-rose-600 dark:text-rose-400">Pending Amount</th>
                  <th className="p-3 text-right">Total Paid Amount</th>
                  <th className="p-3 text-center">Billing Date</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3 text-center">Invoice Copy</th>
                  <th className="p-3 text-center">Rec. Qty</th>
                  <th className="p-3">Rec. Items</th>
                </tr>
              )}
              {subWorkflow === "vendor" && activeTab === "history" && (
                <tr>
                  <th className="p-3 text-center">Payment Date</th>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3 text-center">Payment Terms</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total Bill Value</th>
                  <th className="p-3 text-right">Advance Paid</th>
                  <th className="p-3 text-center text-amber-700 dark:text-amber-400">Return Qty</th>
                  <th className="p-3 text-right text-amber-700 dark:text-amber-400">Return Amount</th>
                  <th className="p-3 text-center text-amber-700 dark:text-amber-400">Debit Note</th>
                  <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">Amount Paid</th>
                  <th className="p-3 text-right">Total Paid Amount</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3 font-mono">Transaction ID</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                  <th className="p-3 text-center">Proof</th>
                </tr>
              )}

              {/* SUBWORKFLOW 3: FREIGHT PAYMENT */}
              {subWorkflow === "freight" && activeTab === "pending" && (
                <tr>
                  <th className="p-3 text-center">Action</th>
                  <th className="p-3">Unit Tracking No.</th>
                  <th className="p-3">LR No.</th>
                  <th className="p-3">Transporter</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Freight Amt</th>
                  <th className="p-3 text-right">Pending Amount</th>
                  <th className="p-3 font-mono">Vehicle No.</th>
                  <th className="p-3 font-mono">Contact</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                  <th className="p-3 text-center">Bilty</th>
                </tr>
              )}
              {subWorkflow === "freight" && activeTab === "history" && (
                <tr>
                  <th className="p-3 text-center">Payment Date</th>
                  <th className="p-3">Unit Tracking No.</th>
                  <th className="p-3">LR No.</th>
                  <th className="p-3">Transporter</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3 font-mono">Transaction ID</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                  <th className="p-3 text-center">Proof</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading || isRefreshing || (isBackgroundStreaming && paginatedData.length === 0) ? (
                <tr>
                  <td colSpan={20} className="p-12 text-center">
                    <CircularProcessingLoader
                      message="Loading & processing payment records..."
                      subMessage="Calculating disbursements, vendor bills, and freight dues"
                    />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={20} className="p-8 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  /* SUBWORKFLOW 1: ADVANCE PAYMENT */
                  if (subWorkflow === "advance") {
                    if (activeTab === "pending") {
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenAdvModal(row)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>Payment</span>
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            {row.poCopy || row.po?.po_copy_url || row.po?.po_pdf_url || (row.poNumber && row.poNumber !== "-") ? (
                              <button
                                type="button"
                                onClick={() => handleViewPoCopy(row)}
                                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
                                title="View PO Copy"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PO Copy</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.vendorName}</td>
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{row.poNumber}</td>
                          <td className="p-3 text-right font-semibold">{row.poValue}</td>
                          <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{row.advanceAmt}</td>
                          <td className="p-3 text-right font-medium text-slate-600">{row.paidSoFar}</td>
                          <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">{row.pendingAmt}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {row.paid}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{row.paymentTerms}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={row.remarks}>{row.remarks}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{formatDateDash(row.plannedDate)}</td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <TatStageBadge
                              startedAt={row.po?.po_date || row.po?.created_at}
                              dueAt={row.plannedDate}
                              isCompleted={false}
                              indentId={row.indentId || row.id}
                            />
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-center">
                            {row.poCopy || row.po?.po_copy_url || row.po?.po_pdf_url || (row.poNumber && row.poNumber !== "-") ? (
                              <button
                                type="button"
                                onClick={() => handleViewPoCopy(row)}
                                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
                                title="View PO Copy"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PO Copy</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.vendorName}</td>
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{row.poNumber}</td>
                          <td className="p-3 text-right font-semibold">{row.poValue}</td>
                          <td className="p-3 text-right font-bold">{row.advanceAmt}</td>
                          <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{row.receiveAmount}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Yes
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-500">{formatDateDash(row.plannedDate)}</td>
                          <td className="p-3 text-center">
                            <TatStageBadge
                              startedAt={row.po?.po_date || row.po?.created_at}
                              dueAt={row.plannedDate}
                              completedAt={row.actualPaymentDate || row.payment_date || row.created_at}
                              isCompleted={true}
                              indentId={row.indentId || row.id}
                            />
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatDateTime(row.actualPaymentDate || row.payment_date || row.created_at)}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.paymentReference}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={row.remarks}>{row.remarks}</td>
                          <td className="p-3 text-center">
                            {row.attachmentUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  window.open(row.attachmentUrl, "_blank", "noopener,noreferrer");
                                }}
                                className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-lg hover:bg-blue-100 cursor-pointer"
                                title="View Attachment"
                              >
                                <Paperclip className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (showToast) showToast("Opening payment voucher attachment...", "info");
                                }}
                                className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-lg hover:bg-blue-100 cursor-pointer"
                                title="View Attachment"
                              >
                                <Paperclip className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  }

                  /* SUBWORKFLOW 2: VENDOR PAYMENT */
                  if (subWorkflow === "vendor") {
                    if (activeTab === "pending") {
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleBulkOpen(row.vendorName)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Process</span>
                            </button>
                          </td>
                          <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{row.invoiceNumber}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.vendorName}</td>
                          <td className="p-3 text-center font-medium text-slate-700 dark:text-slate-300">{row.paymentTerms}</td>
                          <td className="p-3 text-center font-bold">{row.qty}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-white">{row.totalBillValue}</td>
                          <td className="p-3 text-right font-medium text-purple-600 dark:text-purple-400">{row.advancePaid}</td>
                          <td className={`p-3 text-center font-bold ${row.hasReturn ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                            {row.returnQty}
                          </td>
                          <td className={`p-3 text-right font-bold ${row.hasReturn ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                            {row.returnAmount}
                          </td>
                          <td className="p-3 text-center whitespace-normal min-w-[120px]">
                            {row.debitNotes && row.debitNotes.length > 0 ? (
                              <div className="inline-flex items-center flex-wrap justify-center gap-1.5">
                                {row.debitNotes.map((dn, idx) => (
                                  <span key={dn.id || idx} className="inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDebitNoteDoc(dn, row.invoiceNumber)}
                                      className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900 cursor-pointer transition-colors inline-flex items-center gap-1 text-[11px] font-mono font-bold hover:underline shadow-2xs"
                                      title={`View Debit Note ${dn.label || dn.number || ""} ${dn.amount > 0 ? `(₹${Number(dn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ""}`}
                                    >
                                      <Paperclip className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span>{dn.label || dn.number || "DN"}</span>
                                    </button>
                                    {idx < row.debitNotes.length - 1 && (
                                      <span className="text-slate-400 font-bold ml-1">,</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">{row.pendingAmount}</td>
                          <td className="p-3 text-right font-medium text-slate-600 dark:text-slate-300">{row.totalPaidAmount}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{formatDateDash(row.billingDate)}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{formatDateDash(row.plannedDate)}</td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <TatStageBadge
                              startedAt={row.bill?.invoice_date || row.bill?.created_at || row.po?.created_at}
                              dueAt={row.plannedDate}
                              isCompleted={false}
                              indentId={row.indentId || row.id}
                            />
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.poNumber}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceCopy(row)}
                              className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer transition-colors"
                              title="View Invoice Copy in new tab"
                            >
                              <FileText className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-600">{row.recQty}</td>
                          <td className="p-3 text-slate-800 dark:text-slate-200">{row.recItems}</td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatDateTime(row.paymentDate || row.payment_date || row.created_at)}</td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{row.invoiceNumber}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.vendorName}</td>
                          <td className="p-3 text-center font-medium text-slate-700 dark:text-slate-300">{row.paymentTerms}</td>
                          <td className="p-3 text-center font-bold">{row.qty}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-white">{row.totalBillValue}</td>
                          <td className="p-3 text-right font-medium text-purple-600 dark:text-purple-400">{row.advancePaid}</td>
                          <td className={`p-3 text-center font-bold ${row.hasReturn ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                            {row.returnQty}
                          </td>
                          <td className={`p-3 text-right font-bold ${row.hasReturn ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                            {row.returnAmount}
                          </td>
                          <td className="p-3 text-center whitespace-normal min-w-[120px]">
                            {row.debitNotes && row.debitNotes.length > 0 ? (
                              <div className="inline-flex items-center flex-wrap justify-center gap-1.5">
                                {row.debitNotes.map((dn, idx) => (
                                  <span key={dn.id || idx} className="inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDebitNoteDoc(dn, row.invoiceNumber)}
                                      className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900 cursor-pointer transition-colors inline-flex items-center gap-1 text-[11px] font-mono font-bold hover:underline shadow-2xs"
                                      title={`View Debit Note ${dn.label || dn.number || ""} ${dn.amount > 0 ? `(₹${Number(dn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ""}`}
                                    >
                                      <Paperclip className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span>{dn.label || dn.number || "DN"}</span>
                                    </button>
                                    {idx < row.debitNotes.length - 1 && (
                                      <span className="text-slate-400 font-bold ml-1">,</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">{row.amountPaid}</td>
                          <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">{row.totalPaidAmount}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{row.paymentMode}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.transactionId}</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-500">{formatDateDash(row.plannedDate)}</td>
                          <td className="p-3 text-center">
                            <TatStageBadge
                              startedAt={row.bill?.invoice_date || row.bill?.created_at || row.po?.created_at}
                              dueAt={row.plannedDate}
                              completedAt={row.paymentDate || row.payment_date || row.created_at}
                              isCompleted={true}
                              indentId={row.indentId || row.id}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentProof(row)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer transition-colors"
                              title="View Payment Proof in new tab"
                            >
                              <Paperclip className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  }

                  /* SUBWORKFLOW 3: FREIGHT PAYMENT */
                  if (subWorkflow === "freight") {
                    if (activeTab === "pending") {
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleFreightBulkOpen(row.transporterName)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Process</span>
                            </button>
                          </td>
                          <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{row.unitTrackingNo}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.lrNumber}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.transporterName}</td>
                          <td className="p-3 text-center font-bold">{row.qty}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-white">{row.freightAmt}</td>
                          <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">{row.pendingAmount}</td>
                          <td className="p-3 font-mono uppercase font-bold text-slate-700 dark:text-slate-300">{row.vehicleNo}</td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{row.contactNo}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{formatDateDash(row.plannedDate)}</td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <TatStageBadge
                              startedAt={row.tf?.dispatch_date || row.tf?.created_at || row.lift?.actual_lifting_date || row.tf?.expected_arrival_date}
                              dueAt={row.plannedDate}
                              isCompleted={false}
                              indentId={row.indentId || row.id}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenBiltyCopy(row)}
                              className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer transition-colors"
                              title="View Bilty in new tab"
                            >
                              <Paperclip className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatDateTime(row.paymentDate || row.payment_date || row.created_at)}</td>
                          <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{row.unitTrackingNo}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.lrNumber}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.transporterName}</td>
                          <td className="p-3 text-center font-bold">{row.qty}</td>
                          <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">{row.amountPaid}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{row.paymentMode}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.transactionId}</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-500">{formatDateDash(row.plannedDate)}</td>
                          <td className="p-3 text-center">
                            <TatStageBadge
                              startedAt={row.tf?.dispatch_date || row.tf?.created_at || row.lift?.actual_lifting_date || row.tf?.expected_arrival_date}
                              dueAt={row.plannedDate}
                              completedAt={row.paymentDate || row.payment_date || row.created_at}
                              isCompleted={true}
                              indentId={row.indentId || row.id}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentProof(row)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer transition-colors"
                              title="View Payment Proof in new tab"
                            >
                              <Paperclip className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Showing page {currentPage} of {totalPages} ({currentList.length} items)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Advance Payment Modal (Exact replica of Image 1) */}
      {advModalOpen && currentPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Record Advance Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Confirm payment of advance value for Indent {currentPO.indentNumber}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdvModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAdvPayment} className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* Advance Payment Summary Card */}
              <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Advance Payment Summary
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Advance due: <span className="font-bold text-slate-900 dark:text-white">₹ {Number(currentPO.rawTargetAdvance || 0).toFixed(2)}</span>
                    {" · "}Paid so far: <span className="font-bold text-slate-900 dark:text-white">₹ {Number(currentPO.rawTotalPaid || 0).toFixed(2)}</span>
                    {" · "}Pending: <span className="font-bold text-indigo-600 dark:text-indigo-400">₹ {Number(currentPO.rawPendingAdvance || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 self-start sm:self-center shadow-2xs">
                  Indent: {currentPO.indentNumber}
                </div>
              </div>

              {/* Pay Amount */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Pay Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={advForm.amount}
                  onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Prefilled with the pending amount — edit it to record a partial payment; the record stays in Pending until fully paid.
                </p>
              </div>

              {/* Payment Reference Number / Transaction ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Payment Reference Number / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-1002345"
                  value={advForm.transactionId}
                  onChange={(e) => setAdvForm({ ...advForm, transactionId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Payment Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={advForm.paymentDate}
                  onChange={(e) => setAdvForm({ ...advForm, paymentDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={advForm.advanceDecision}
                  onChange={(e) => setAdvForm({ ...advForm, advanceDecision: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="completed">Advance Payment Completed (Proceed to Next Stage)</option>
                  <option value="partial">Partial Payment (Stay in Pending)</option>
                </select>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  &quot;Advance Payment Completed&quot; moves this item to History &amp; clears it for Follow UP / Lifting. &quot;Partial Payment&quot; keeps it in Pending.
                </p>
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional notes about this advance payment..."
                  value={advForm.remarks}
                  onChange={(e) => setAdvForm({ ...advForm, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Attachment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Attachment
                </label>
                <label className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-dashed">
                  <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{advAttachmentName ? advAttachmentName : "Choose attachment..."}</span>
                  <input
                    type="file"
                    onChange={handleAdvAttachmentChange}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdvModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Payment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Bulk Vendor Payment Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Bulk Vendor Payment
                  </h3>
                  <p className="text-xs text-slate-500">
                    {bulkStep === "vendor"
                      ? "Select a vendor to process payments in batch."
                      : "Select a vendor and invoices to process payments in batch."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: Select Vendor */}
            {bulkStep === "vendor" && (
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search vendor name..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Vendors with Pending Invoices ({filteredVendorsList.length})
                  </label>
                  {filteredVendorsList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      No vendors with pending invoices found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredVendorsList.map((vendor) => {
                        const matchedBills = vendorPending.filter((r) => r.vendorName === vendor);
                        const totalPending = matchedBills.reduce((sum, r) => sum + (r.rawPendingAmount || 0), 0);
                        return (
                          <button
                            key={vendor}
                            type="button"
                            onClick={() => handleSelectVendor(vendor)}
                            className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl text-left transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                          >
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                              {vendor}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                              <span>{matchedBills.length} invoice(s)</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                ₹ {totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Invoices & Payment Form (Exact Replica of Image 1) */}
            {bulkStep === "invoices" && (
              <form onSubmit={handleBulkSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Vendor Heading */}
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Vendor: <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{selectedBulkVendor}</span>
                  </div>

                  {/* Invoices Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3 text-center w-12">Select</th>
                          <th className="p-3">Invoice No</th>
                          <th className="p-3">PO Number</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3 text-right">Advance</th>
                          <th className="p-3 text-right text-amber-700 dark:text-amber-400">Return Amt</th>
                          <th className="p-3 text-right">Total Paid Amount</th>
                          <th className="p-3 text-right">Net Pending</th>
                          <th className="p-3 text-right w-36">Paying Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {vendorPending
                          .filter((r) => r.vendorName === selectedBulkVendor)
                          .map((r) => {
                            const isSelected = !!bulkInvoices[r.id]?.selected;
                            const payVal = bulkInvoices[r.id]?.payAmount != null ? bulkInvoices[r.id]?.payAmount : "";
                            return (
                              <tr
                                key={r.id}
                                className={`transition-colors ${
                                  isSelected
                                    ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                                    : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                                }`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setBulkInvoices((prev) => ({
                                        ...prev,
                                        [r.id]: {
                                          ...prev[r.id],
                                          selected: checked,
                                          payAmount:
                                            checked && (!prev[r.id]?.payAmount || Number(prev[r.id]?.payAmount) === 0)
                                              ? String(r.rawPendingAmount || 0)
                                              : prev[r.id]?.payAmount || String(r.rawPendingAmount || 0),
                                        },
                                      }));
                                    }}
                                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{r.invoiceNumber}</td>
                                <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{r.poNumber}</td>
                                <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                                  ₹ {Number(r.rawTotalBillValue || r.rawBillAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-bold text-purple-600 dark:text-purple-400">
                                  ₹ {Number(r.rawAdvancePaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`p-3 text-right font-bold ${r.hasReturn ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                                  {r.returnAmount}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹ {Number(r.rawTotalPaidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                                  ₹ {Number(r.rawPendingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={r.rawPendingAmount || 0}
                                    disabled={!isSelected}
                                    value={payVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setBulkInvoices((prev) => ({
                                        ...prev,
                                        [r.id]: {
                                          ...prev[r.id],
                                          payAmount: val,
                                        },
                                      }));
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* 2-Column Bottom Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Left: Payment Mode, Transaction ID, Payment Date */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Payment Mode
                        </label>
                        <select
                          value={bulkFormData.paymentMode}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, paymentMode: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="RTGS / Bank Transfer">RTGS / Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Demand Draft">Demand Draft</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. TXN-1002345"
                          value={bulkFormData.transactionId}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, transactionId: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          required
                          value={bulkFormData.paymentDate}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, paymentDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Right: Upload Proof & TOTAL TO PAY */}
                    <div className="space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Upload Receipt / Proof
                        </label>
                        <label className="w-full px-4 py-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-dashed">
                          <Upload className="w-5 h-5 text-slate-400 shrink-0" />
                          <span>{bulkFormData.proofName ? bulkFormData.proofName : "Choose receipt copy..."}</span>
                          <input
                            type="file"
                            onChange={handleBulkProofChange}
                            className="hidden"
                            accept="image/*,.pdf"
                          />
                        </label>
                      </div>

                      {/* Total To Pay Card */}
                      <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          TOTAL TO PAY:
                        </span>
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹ {bulkTotalToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBulkStep("vendor")}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || bulkTotalToPay <= 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Submit Payment</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. Bulk Freight Payment Modal */}
      {freightBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Bulk Freight Payment
                  </h3>
                  <p className="text-xs text-slate-500">
                    {freightBulkStep === "transporter"
                      ? "Select a transporter to process payments in batch."
                      : "Select a transporter and freight entries to process payments in batch."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFreightBulkOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: Select Transporter */}
            {freightBulkStep === "transporter" && (
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search transporter name..."
                    value={transporterSearch}
                    onChange={(e) => setTransporterSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Transporters with Pending Freight ({filteredTransportersList.length})
                  </label>
                  {filteredTransportersList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      No transporters with pending freight found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredTransportersList.map((transporter) => {
                        const matchedFreights = freightPending.filter((r) => r.transporterName === transporter);
                        const totalPending = matchedFreights.reduce((sum, r) => sum + (r.rawPendingFreight || 0), 0);
                        return (
                          <button
                            key={transporter}
                            type="button"
                            onClick={() => handleSelectTransporter(transporter)}
                            className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl text-left transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                          >
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                              {transporter}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                              <span>{matchedFreights.length} freight entry(ies)</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                ₹ {totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Freight Entries & Payment Form (Exact Replica of Image 2) */}
            {freightBulkStep === "invoices" && (
              <form onSubmit={handleFreightBulkSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Transporter Heading */}
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Transporter: <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{selectedBulkTransporter}</span>
                  </div>

                  {/* Freight Entries Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3 text-center w-12">Select</th>
                          <th className="p-3">Unit Tracking No</th>
                          <th className="p-3">LR No</th>
                          <th className="p-3">PO Number</th>
                          <th className="p-3 text-right">Freight Amt</th>
                          <th className="p-3 text-right">Pending Amount</th>
                          <th className="p-3 text-right w-36">Paying Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {freightPending
                          .filter((r) => r.transporterName === selectedBulkTransporter)
                          .map((r) => {
                            const isSelected = !!bulkFreightInvoices[r.id]?.selected;
                            const payVal = bulkFreightInvoices[r.id]?.payAmount != null ? bulkFreightInvoices[r.id]?.payAmount : "";
                            return (
                              <tr
                                key={r.id}
                                className={`transition-colors ${
                                  isSelected
                                    ? "bg-purple-50/40 dark:bg-purple-950/20"
                                    : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                                }`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setBulkFreightInvoices((prev) => ({
                                        ...prev,
                                        [r.id]: {
                                          ...prev[r.id],
                                          selected: checked,
                                          payAmount:
                                            checked && (!prev[r.id]?.payAmount || Number(prev[r.id]?.payAmount) === 0)
                                              ? String(r.rawPendingFreight || 0)
                                              : prev[r.id]?.payAmount || String(r.rawPendingFreight || 0),
                                        },
                                      }));
                                    }}
                                    className="w-4 h-4 text-purple-600 rounded-sm border-slate-300 focus:ring-purple-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{r.unitTrackingNo}</td>
                                <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{r.lrNumber}</td>
                                <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{r.poNumber || r.po?.po_number || "-"}</td>
                                <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                                  ₹ {Number(r.rawFreightAmt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                  ₹ {Number(r.rawPendingFreight || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={r.rawPendingFreight || 0}
                                    disabled={!isSelected}
                                    value={payVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setBulkFreightInvoices((prev) => ({
                                        ...prev,
                                        [r.id]: {
                                          ...prev[r.id],
                                          payAmount: val,
                                        },
                                      }));
                                    }}
                                    className="w-32 px-2.5 py-1 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* 2-Column Bottom Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Left: Payment Mode, Transaction ID, Payment Date */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Payment Mode
                        </label>
                        <select
                          value={freightFormData.paymentMode}
                          onChange={(e) => setFreightFormData({ ...freightFormData, paymentMode: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="RTGS / Bank Transfer">RTGS / Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Demand Draft">Demand Draft</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. TXN-1002345"
                          value={freightFormData.transactionId}
                          onChange={(e) => setFreightFormData({ ...freightFormData, transactionId: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          required
                          value={freightFormData.paymentDate}
                          onChange={(e) => setFreightFormData({ ...freightFormData, paymentDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Right: Upload Proof & TOTAL TO PAY */}
                    <div className="space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Upload Bilty / Receipt Copy
                        </label>
                        <label className="w-full px-4 py-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-dashed">
                          <Upload className="w-5 h-5 text-slate-400 shrink-0" />
                          <span>{freightFormData.proofName ? freightFormData.proofName : "Choose receipt copy..."}</span>
                          <input
                            type="file"
                            onChange={handleFreightProofChange}
                            className="hidden"
                            accept="image/*,.pdf"
                          />
                        </label>
                      </div>

                      {/* Total To Pay Card */}
                      <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          TOTAL TO PAY:
                        </span>
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹ {freightBulkTotalToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFreightBulkStep("transporter")}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || freightBulkTotalToPay <= 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Submit Payment</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
