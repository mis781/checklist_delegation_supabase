import React, { useState, useMemo } from "react";
import {
  XCircle,
  Search,
  Plus,
  Loader2,
  X,
  RefreshCw,
  AlertCircle,
  Check,
  Building,
  Ban,
  Layers,
  FileText,
  CreditCard,
  Truck,
  PackageCheck,
  Receipt,
  UserCheck,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { formatDateDash, formatDateTime } from "../utils/dateUtils";

const safeNum = (v) => parseFloat(String(v || "0").replace(/,/g, "")) || 0;

const fmtCurrency = (raw) => {
  if (!raw || raw === "0" || raw === 0) return "₹0.00";
  const n = safeNum(raw);
  return isNaN(n)
    ? String(raw)
    : `₹ ${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
};

export const PURCHASE_WORKFLOW_STAGES = [
  { id: "create_indent", label: "Stage 1 : Create Indent", stageName: "Create Indent", icon: FileText },
  { id: "delegate_approval", label: "Stage 2 : Delegate Approvers", stageName: "Delegate Approvers", icon: Layers },
  { id: "indent_approval", label: "Stage 3 : Indent Approval", stageName: "Indent Approval", icon: UserCheck },
  { id: "quotations", label: "Stage 4 : Quotations & RFQ", stageName: "Quotations", icon: FileText },
  { id: "approved_vendor", label: "Stage 5 : Approved Vendor", stageName: "Approved Vendor", icon: Building },
  { id: "make_po", label: "Stage 6 : Make Purchase Order", stageName: "Make PO", icon: FileText },
  { id: "advance_payment", label: "Stage 7 : Advance Payment", stageName: "Payment", icon: CreditCard },
  { id: "followup_lifting", label: "Stage 8 : Follow-up / Lifting", stageName: "Follow UP / Lifting", icon: Truck },
  { id: "transporter_followup", label: "Stage 9 : Transporter Follow-Up", stageName: "Transporter Follow-Up", icon: Truck },
  { id: "material_receipt", label: "Stage 10 : Material Received (GRN)", stageName: "Material Received (GRN)", icon: PackageCheck },
  { id: "tally_billing", label: "Stage 11 : Tally Billing", stageName: "Tally Billing", icon: Receipt },
];

export default function OrderCancelView() {
  const { showToast } = useMagicToast();
  const {
    indents,
    purchaseOrders,
    quotations,
    approvedVendors,
    vendorLiftings,
    transporterFollowups,
    materialReceipts,
    tallyBillings,
    orderCancellations,
    getIndentNumber,
    cancelOrder,
    stageCancelRecords,
    refreshData,
    loading,
  } = usePurchaseWorkflow();

  const FIXED_CANCEL_STAGE = "Follow UP / Lifting";

  // Main Tab: "order_cancel" (Existing Order Cancellation) vs "stage_cancel" (Stage Cancel Operations)
  const [activeMainTab, setActiveMainTab] = useState("order_cancel");

  // Search & Pagination for Order Cancel Logs
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // ─── Stage Cancel Specific States ──────────────────────────────────────────
  const [selectedStageKey, setSelectedStageKey] = useState("create_indent");
  const [stageSubTab, setStageSubTab] = useState("active_items"); // "active_items" | "cancelled_register"
  const [stageSearchTerm, setStageSearchTerm] = useState("");
  const [selectedStageRowIds, setSelectedStageRowIds] = useState([]);
  const [stageCancelModalOpen, setStageCancelModalOpen] = useState(false);
  const [stageCancelReason, setStageCancelReason] = useState("");
  const [stageCancelRemarks, setStageCancelRemarks] = useState("");
  const [isSubmittingStageCancel, setIsSubmittingStageCancel] = useState(false);
  const [stageCurrentPage, setStageCurrentPage] = useState(1);

  // ─── Existing Order Cancel Modal States ───────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndentFilter, setSelectedIndentFilter] = useState("");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("");
  const [selectedSearchRowIds, setSelectedSearchRowIds] = useState([]);
  const [cancelQuantities, setCancelQuantities] = useState({});
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Cancellable Items Pool (Follow UP / Lifting Pending Set) ────────────────
  const allPendingRows = useMemo(() => {
    const posByIndentId = new Map();
    (purchaseOrders || []).forEach((po) => {
      if (po.indent_id) {
        const list = posByIndentId.get(po.indent_id) || [];
        list.push(po);
        posByIndentId.set(po.indent_id, list);
      }
    });

    const liftedByPoId = new Map();
    (vendorLiftings || []).forEach((l) => {
      if (!l.po_id) return;
      const current = liftedByPoId.get(l.po_id) || 0;
      liftedByPoId.set(l.po_id, current + safeNum(l.lifting_qty || l.quantity));
    });

    const cancelledByPoId = new Map();
    (orderCancellations || []).forEach((c) => {
      if (!c.po_id) return;
      const current = cancelledByPoId.get(c.po_id) || 0;
      cancelledByPoId.set(
        c.po_id,
        current + safeNum(c.financial_impact || c.quantity)
      );
    });

    const results = [];
    const processedPoIds = new Set();

    const processPo = (po, indent) => {
      const poQty = safeNum(po.quantity || indent?.quantity || 0);
      const liftedQty = liftedByPoId.get(po.id) || 0;
      const cancelledQty = cancelledByPoId.get(po.id) || 0;
      const remainingQty = Math.max(0, poQty - (liftedQty + cancelledQty));

      if (remainingQty <= 0) return;

      const rate =
        poQty > 0
          ? (safeNum(po.unit_rate) || safeNum(po.total_amount)) / poQty
          : safeNum(po.unit_rate || 0);

      const indentNumber =
        po.indent_number ||
        po.indentNumber ||
        (getIndentNumber ? getIndentNumber(po.indent_id) : null) ||
        indent?.indent_number ||
        indent?.indentNumber ||
        "-";

      const vendorName =
        po.vendor_name ||
        po.selected_vendor_name ||
        indent?.selected_vendor_name ||
        indent?.data?.selectedVendorName ||
        "-";

      const itemName =
        po.item_name || indent?.item_name || indent?.data?.itemName || "-";

      results.push({
        id: `${indent?.id || po.indent_id || "ind"}__${po.id}`,
        indentId: indent?.id || po.indent_id,
        poId: po.id,
        indentNumber,
        vendorName,
        poNumber: po.po_number || "-",
        itemName,
        poQty,
        liftedQty,
        cancelledQty,
        remainingQty,
        rate,
        uom: po.uom || indent?.uom || "NOS",
      });
    };

    (indents || []).forEach((indent) => {
      const pos = posByIndentId.get(indent.id) || [];
      pos.forEach((po) => {
        processedPoIds.add(po.id);
        processPo(po, indent);
      });
    });

    (purchaseOrders || []).forEach((po) => {
      if (processedPoIds.has(po.id)) return;
      processPo(po, null);
    });

    return results;
  }, [
    indents,
    purchaseOrders,
    vendorLiftings,
    orderCancellations,
    getIndentNumber,
  ]);

  // Dropdown filter options for Order Cancel modal
  const indentNumberOptions = useMemo(
    () => Array.from(new Set(allPendingRows.map((r) => r.indentNumber))).sort(),
    [allPendingRows]
  );

  const vendorNameOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allPendingRows.map((r) => r.vendorName).filter((v) => v && v !== "-")
        )
      ).sort(),
    [allPendingRows]
  );

  const modalSearchResults = useMemo(() => {
    return allPendingRows.filter((r) => {
      if (selectedIndentFilter && r.indentNumber !== selectedIndentFilter)
        return false;
      if (selectedVendorFilter && r.vendorName !== selectedVendorFilter)
        return false;
      return true;
    });
  }, [allPendingRows, selectedIndentFilter, selectedVendorFilter]);

  // ─── Cancelled Orders Register (Logs Table) ─────────────────────────────────
  const cancelledOrdersList = useMemo(() => {
    const poById = new Map();
    (purchaseOrders || []).forEach((po) => poById.set(po.id, po));

    const indentById = new Map();
    (indents || []).forEach((ind) => indentById.set(ind.id, ind));

    const receiptMap = new Map();
    (materialReceipts || []).forEach((r) => {
      const pid = r.po_id;
      if (!pid) return;
      const current = receiptMap.get(pid) || {
        totalLiftedQty: 0,
        totalReceivedQty: 0,
      };
      receiptMap.set(pid, {
        totalLiftedQty:
          current.totalLiftedQty + safeNum(r.accepted_quantity || 0),
        totalReceivedQty:
          current.totalReceivedQty + safeNum(r.received_quantity || 0),
      });
    });

    const liftedMap = new Map();
    (vendorLiftings || []).forEach((l) => {
      if (!l.po_id) return;
      liftedMap.set(
        l.po_id,
        (liftedMap.get(l.po_id) || 0) + safeNum(l.lifting_qty || l.quantity)
      );
    });

    return (orderCancellations || []).map((cancel, index) => {
      const po = cancel.po_id ? poById.get(cancel.po_id) : null;
      const indent = cancel.indent_id
        ? indentById.get(cancel.indent_id)
        : po?.indent_id
        ? indentById.get(po.indent_id)
        : null;

      const recData = cancel.po_id ? receiptMap.get(cancel.po_id) : null;

      const poQty = safeNum(po?.quantity || indent?.quantity || 0);
      const cancelQty = safeNum(cancel.financial_impact || cancel.quantity || 0);
      const totalLiftedQty =
        (cancel.po_id ? liftedMap.get(cancel.po_id) : 0) ||
        recData?.totalLiftedQty ||
        0;
      const receivedQty = recData?.totalReceivedQty || 0;
      const pendingQty = Math.max(0, poQty - cancelQty - receivedQty);

      const rate =
        poQty > 0
          ? (safeNum(po?.unit_rate) || safeNum(po?.total_amount)) / poQty
          : safeNum(po?.unit_rate || 0);

      const amount = cancelQty * rate;

      const indentNo =
        po?.indent_number ||
        po?.indentNumber ||
        (getIndentNumber ? getIndentNumber(cancel.indent_id || po?.indent_id) : null) ||
        indent?.indent_number ||
        indent?.indentNumber ||
        "-";

      const supplierName =
        po?.vendor_name ||
        po?.selected_vendor_name ||
        indent?.selected_vendor_name ||
        indent?.data?.selectedVendorName ||
        "-";

      const itemName =
        po?.item_name || indent?.item_name || indent?.data?.itemName || "-";

      const isStageCancelled =
        String(cancel.status || "").toLowerCase() === "stage cancelled" ||
        String(cancel.cancelled_by || "").toLowerCase().includes("stage") ||
        (cancel.cancelled_by && cancel.cancelled_by !== FIXED_CANCEL_STAGE);

      return {
        id: cancel.id || `cancel-${index}`,
        timestamp: cancel.cancellation_date || cancel.created_at || "",
        plannedDate: indent?.planned_date || po?.delivery_date || "-",
        indentNo,
        poNumber: po?.po_number || "-",
        supplierName,
        itemName,
        cancelStage: cancel.cancelled_by || FIXED_CANCEL_STAGE,
        cancelReason: cancel.cancellation_reason || "Management Request",
        poQty,
        totalLiftedQty,
        receivedQty,
        cancelQty,
        pendingQty,
        rate,
        amount,
        isStageCancelled,
      };
    });
  }, [
    orderCancellations,
    purchaseOrders,
    indents,
    materialReceipts,
    vendorLiftings,
    getIndentNumber,
  ]);

  const filteredCancelledOrders = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (!s) return cancelledOrdersList;
    return cancelledOrdersList.filter(
      (order) =>
        String(order.indentNo || "").toLowerCase().includes(s) ||
        String(order.poNumber || "").toLowerCase().includes(s) ||
        String(order.supplierName || "").toLowerCase().includes(s) ||
        String(order.itemName || "").toLowerCase().includes(s) ||
        String(order.cancelStage || "").toLowerCase().includes(s) ||
        String(order.cancelReason || "").toLowerCase().includes(s) ||
        String(order.cancelQty || "").toLowerCase().includes(s)
    );
  }, [cancelledOrdersList, searchTerm]);

  const totalPages = Math.ceil(filteredCancelledOrders.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCancelledOrders.slice(start, start + pageSize);
  }, [filteredCancelledOrders, currentPage, pageSize]);

  // ─── STAGE CANCEL : Dynamic Active Items Pool per Selected Stage ───────────
  const activeStageRecords = useMemo(() => {
    const cancelledIndentIds = new Set(
      (orderCancellations || []).map((c) => c.indent_id).filter(Boolean)
    );
    const cancelledPoIds = new Set(
      (orderCancellations || []).map((c) => c.po_id).filter(Boolean)
    );

    const isRecordActive = (status, id, poId) => {
      const s = String(status || "").toLowerCase();
      if (s === "cancelled" || s === "stage cancelled") return false;
      if (id && cancelledIndentIds.has(id)) return false;
      if (poId && cancelledPoIds.has(poId)) return false;
      return true;
    };

    switch (selectedStageKey) {
      case "create_indent":
      case "delegate_approval":
      case "indent_approval": {
        return (indents || [])
          .filter((r) => {
            const s = String(r.status || "").toLowerCase();
            return isRecordActive(s, r.id) && s !== "approved" && s !== "rejected" && s !== "po issued" && s !== "completed";
          })
          .map((r) => ({
            id: r.id,
            indent_id: r.id,
            recordNumber: r.indent_number || `IND-${r.id}`,
            itemName: r.item_name || "-",
            quantity: r.quantity || 1,
            uom: r.uom || "NOS",
            partyName: r.created_by || r.department || "-",
            category: r.category || "General",
            date: r.created_at || r.required_date,
            status: r.status || "Pending",
          }));
      }

      case "quotations": {
        return (indents || [])
          .filter((r) => {
            const s = String(r.status || "").toLowerCase();
            return isRecordActive(s, r.id) && (s === "approved" || s === "quotation pending" || s === "rfq sent");
          })
          .map((r) => ({
            id: r.id,
            indent_id: r.id,
            recordNumber: r.indent_number || `IND-${r.id}`,
            itemName: r.item_name || "-",
            quantity: r.quantity || 1,
            uom: r.uom || "NOS",
            partyName: (quotations || []).filter((q) => q.indent_id === r.id).map((q) => q.vendor_name).join(", ") || "RFQ Open",
            category: r.category || "General",
            date: r.created_at,
            status: r.status || "In Quotation",
          }));
      }

      case "approved_vendor": {
        return (indents || [])
          .filter((r) => {
            const s = String(r.status || "").toLowerCase();
            const hasPo = (purchaseOrders || []).some((po) => po.indent_id === r.id);
            return isRecordActive(s, r.id) && !hasPo && (s === "approved" || s === "vendor selected");
          })
          .map((r) => {
            const av = (approvedVendors || []).find((a) => a.indent_id === r.id);
            return {
              id: r.id,
              indent_id: r.id,
              recordNumber: r.indent_number || `IND-${r.id}`,
              itemName: r.item_name || "-",
              quantity: r.quantity || 1,
              uom: r.uom || "NOS",
              partyName: av?.vendor_name || r.selected_vendor_name || "Pending Vendor Approval",
              category: r.category || "General",
              date: av?.selected_at || r.created_at,
              status: "Pending PO Creation",
            };
          });
      }

      case "make_po": {
        return (indents || [])
          .filter((r) => {
            const s = String(r.status || "").toLowerCase();
            const hasPo = (purchaseOrders || []).some((po) => po.indent_id === r.id);
            return isRecordActive(s, r.id) && !hasPo && (s === "approved" || r.selected_vendor_name);
          })
          .map((r) => ({
            id: r.id,
            indent_id: r.id,
            recordNumber: r.indent_number || `IND-${r.id}`,
            itemName: r.item_name || "-",
            quantity: r.quantity || 1,
            uom: r.uom || "NOS",
            partyName: r.selected_vendor_name || "Approved Vendor",
            category: r.category || "General",
            date: r.created_at,
            status: "Ready for PO",
          }));
      }

      case "advance_payment": {
        return (purchaseOrders || [])
          .filter((po) => {
            const s = String(po.status || "").toLowerCase();
            const isCancelled = !isRecordActive(s, po.indent_id, po.id);
            const adv = Number(po.advance_amount) || 0;
            return !isCancelled && adv > 0;
          })
          .map((po) => ({
            id: po.id,
            po_id: po.id,
            indent_id: po.indent_id,
            recordNumber: po.po_number || `PO-${po.id}`,
            itemName: po.item_name || "-",
            quantity: po.quantity || 1,
            uom: po.uom || "NOS",
            partyName: po.vendor_name || "-",
            category: "Advance ₹" + (po.advance_amount || 0),
            date: po.po_date || po.created_at,
            status: po.status || "Payment Pending",
          }));
      }

      case "followup_lifting": {
        return allPendingRows.map((r) => ({
          id: r.id,
          po_id: r.poId,
          indent_id: r.indentId,
          recordNumber: r.poNumber !== "-" ? r.poNumber : r.indentNumber,
          itemName: r.itemName,
          quantity: r.remainingQty,
          uom: r.uom || "NOS",
          partyName: r.vendorName,
          category: `Lifted: ${r.liftedQty}/${r.poQty}`,
          date: new Date().toISOString(),
          status: "Pending Lifting",
        }));
      }

      case "transporter_followup": {
        return (transporterFollowups || [])
          .filter((t) => {
            const s = String(t.status || "").toLowerCase();
            return isRecordActive(s, t.indent_id, t.po_id) && s !== "delivered" && s !== "received";
          })
          .map((t) => ({
            id: t.id,
            po_id: t.po_id,
            indent_id: t.indent_id,
            recordNumber: t.lr_number || `DISP-${t.id}`,
            itemName: t.item_name || "In-Transit Goods",
            quantity: t.quantity || 1,
            uom: t.uom || "NOS",
            partyName: t.transporter_name || t.driver_name || "Transporter",
            category: t.vehicle_number || "In-Transit",
            date: t.dispatch_date || t.created_at,
            status: t.status || "In-Transit",
          }));
      }

      case "material_receipt": {
        return (materialReceipts || [])
          .filter((m) => {
            const s = String(m.status || "").toLowerCase();
            return isRecordActive(s, m.indent_id, m.po_id) && s !== "verified" && s !== "billed";
          })
          .map((m) => ({
            id: m.id,
            po_id: m.po_id,
            indent_id: m.indent_id,
            recordNumber: m.grn_number || `GRN-${m.id}`,
            itemName: m.item_name || "-",
            quantity: m.accepted_quantity || m.received_quantity || 1,
            uom: m.uom || "NOS",
            partyName: m.vendor_name || "-",
            category: "Inspection Pending",
            date: m.received_date || m.created_at,
            status: m.status || "GRN Issued",
          }));
      }

      case "tally_billing": {
        return (tallyBillings || [])
          .filter((tb) => {
            const s = String(tb.verification_status || tb.status || "").toLowerCase();
            return isRecordActive(s, tb.indent_id, tb.po_id) && s !== "verified" && s !== "completed";
          })
          .map((tb) => ({
            id: tb.id,
            po_id: tb.po_id,
            indent_id: tb.indent_id,
            recordNumber: tb.invoice_number || `INV-${tb.id}`,
            itemName: tb.item_name || "Billed Items",
            quantity: tb.quantity || 1,
            uom: tb.uom || "NOS",
            partyName: tb.vendor_name || "-",
            category: "Invoice ₹" + (tb.total_amount || 0),
            date: tb.invoice_date || tb.created_at,
            status: tb.verification_status || "Pending Audit",
          }));
      }

      default:
        return [];
    }
  }, [
    selectedStageKey,
    indents,
    purchaseOrders,
    quotations,
    approvedVendors,
    transporterFollowups,
    materialReceipts,
    tallyBillings,
    orderCancellations,
    allPendingRows,
  ]);

  const filteredActiveStageRecords = useMemo(() => {
    const s = stageSearchTerm.toLowerCase();
    if (!s) return activeStageRecords;
    return activeStageRecords.filter(
      (r) =>
        String(r.recordNumber || "").toLowerCase().includes(s) ||
        String(r.itemName || "").toLowerCase().includes(s) ||
        String(r.partyName || "").toLowerCase().includes(s) ||
        String(r.category || "").toLowerCase().includes(s) ||
        String(r.status || "").toLowerCase().includes(s)
    );
  }, [activeStageRecords, stageSearchTerm]);

  // Stage Cancelled History List
  const stageCancelledRecordsList = useMemo(() => {
    return cancelledOrdersList.filter((c) => c.isStageCancelled || (c.cancelStage && c.cancelStage !== FIXED_CANCEL_STAGE));
  }, [cancelledOrdersList]);

  const filteredStageCancelledHistory = useMemo(() => {
    const s = stageSearchTerm.toLowerCase();
    if (!s) return stageCancelledRecordsList;
    return stageCancelledRecordsList.filter(
      (r) =>
        String(r.indentNo || "").toLowerCase().includes(s) ||
        String(r.poNumber || "").toLowerCase().includes(s) ||
        String(r.supplierName || "").toLowerCase().includes(s) ||
        String(r.itemName || "").toLowerCase().includes(s) ||
        String(r.cancelStage || "").toLowerCase().includes(s) ||
        String(r.cancelReason || "").toLowerCase().includes(s)
    );
  }, [stageCancelledRecordsList, stageSearchTerm]);

  const stageTotalPages = Math.ceil(
    (stageSubTab === "active_items" ? filteredActiveStageRecords.length : filteredStageCancelledHistory.length) / pageSize
  ) || 1;

  const paginatedStageData = useMemo(() => {
    const start = (stageCurrentPage - 1) * pageSize;
    const dataset = stageSubTab === "active_items" ? filteredActiveStageRecords : filteredStageCancelledHistory;
    return dataset.slice(start, start + pageSize);
  }, [filteredActiveStageRecords, filteredStageCancelledHistory, stageSubTab, stageCurrentPage, pageSize]);

  // ─── Stage Cancel Checkbox Handlers ────────────────────────────────────────
  const toggleStageRow = (id) => {
    setSelectedStageRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllStageRows = () => {
    if (selectedStageRowIds.length === filteredActiveStageRecords.length) {
      setSelectedStageRowIds([]);
    } else {
      setSelectedStageRowIds(filteredActiveStageRecords.map((r) => r.id));
    }
  };

  // ─── Submit Stage Cancel ───────────────────────────────────────────────────
  const handleOpenStageCancelModal = () => {
    if (selectedStageRowIds.length === 0) {
      showToast("Please select at least one record to cancel", "warning");
      return;
    }
    setStageCancelReason("Administrative Cancellation");
    setStageCancelRemarks("");
    setStageCancelModalOpen(true);
  };

  const handleConfirmStageCancel = async () => {
    if (!stageCancelReason.trim()) {
      showToast("Please provide a reason for stage cancellation", "warning");
      return;
    }

    const currentStageObj = PURCHASE_WORKFLOW_STAGES.find((s) => s.id === selectedStageKey);
    const stageName = currentStageObj?.stageName || "Stage Cancel";

    const targetRecords = filteredActiveStageRecords.filter((r) =>
      selectedStageRowIds.includes(r.id)
    );

    setIsSubmittingStageCancel(true);
    try {
      if (stageCancelRecords) {
        await stageCancelRecords({
          stageKey: selectedStageKey,
          stageName,
          records: targetRecords,
          reason: stageCancelReason.trim(),
          remarks: stageCancelRemarks.trim(),
          cancelledBy: stageName,
        });
      }

      showToast(
        `Successfully cancelled ${targetRecords.length} record(s) at ${stageName}!`,
        "success"
      );

      setStageCancelModalOpen(false);
      setSelectedStageRowIds([]);
      setStageCancelReason("");
      setStageCancelRemarks("");
      await refreshData(true);
    } catch (err) {
      console.error("Error executing stage cancel:", err);
      showToast(`Stage cancel error: ${err.message}`, "error");
    } finally {
      setIsSubmittingStageCancel(false);
    }
  };

  // ─── Submit Order Cancel (Modal 1: PO / Lifting Level) ────────────────────
  const handleOpenCancelModal = () => {
    setSelectedIndentFilter("");
    setSelectedVendorFilter("");
    setSelectedSearchRowIds([]);
    setCancelQuantities({});
    setCancelReason("");
    setModalOpen(true);
  };

  const toggleSearchRow = (id) => {
    setSelectedSearchRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCancelQtyChange = (id, val) => {
    setCancelQuantities((prev) => ({ ...prev, [id]: val }));
  };

  const handleConfirmOrderCancel = async () => {
    if (selectedSearchRowIds.length === 0) {
      showToast("Please select at least one record to cancel", "warning");
      return;
    }
    if (!cancelReason.trim()) {
      showToast("Please enter a cancellation reason", "warning");
      return;
    }

    const selectedRows = allPendingRows.filter((r) =>
      selectedSearchRowIds.includes(r.id)
    );

    setIsSubmitting(true);
    try {
      for (const row of selectedRows) {
        const rowQty = Number(cancelQuantities[row.id] ?? row.remainingQty);
        await cancelOrder({
          po_id: row.poId,
          indent_id: row.indentId,
          cancelled_by: FIXED_CANCEL_STAGE,
          cancellation_reason: cancelReason.trim(),
          financial_impact: rowQty,
        });
      }

      showToast(
        `Successfully cancelled ${selectedRows.length} order(s)!`,
        "success"
      );

      setModalOpen(false);
      setSelectedSearchRowIds([]);
      setCancelQuantities({});
      setCancelReason("");
      await refreshData(true);
    } catch (err) {
      console.error("Error submitting cancellation:", err);
      showToast(`Error cancelling order: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Main Dual-Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-rose-600 rounded-2xl text-white shadow-md shadow-rose-500/20">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 12 : Order & Stage Cancellation Audit
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Revoke purchase orders, halt stage-level workflows, and maintain real-time cancellation compliance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refreshData(true)}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
              title="Refresh All Purchase Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dual Main Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("order_cancel");
              setCurrentPage(1);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === "order_cancel"
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Order Cancellation Logs ({cancelledOrdersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab("stage_cancel");
              setStageCurrentPage(1);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === "stage_cancel"
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Stage Cancel Operations ({stageCancelledRecordsList.length})</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: ORDER CANCELLATION LOGS                                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeMainTab === "order_cancel" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-600 rounded-full" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Order Cancellation Logs ({filteredCancelledOrders.length} Records)
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cancelled orders..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenCancelModal}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cancel Order</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="p-3">Cancelled At</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3">Indent No.</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Cancel Stage</th>
                  <th className="p-3">Cancel Reason</th>
                  <th className="p-3 text-center">PO Qty</th>
                  <th className="p-3 text-center">Total Lifted Qty</th>
                  <th className="p-3 text-center">Received Qty</th>
                  <th className="p-3 text-center">Cancelled Qty</th>
                  <th className="p-3 text-center">Pending Qty</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="p-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-600" />
                      Loading cancellation records...
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="p-8 text-center text-slate-400">
                      No cancelled orders found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        row.isStageCancelled
                          ? "bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-rose-500"
                          : ""
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {formatDateTime(row.timestamp)}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {formatDateDash(row.plannedDate)}
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                        {row.indentNo}
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        {row.poNumber}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {row.supplierName}
                      </td>
                      <td
                        className="p-3 text-slate-800 dark:text-slate-200 max-w-[200px] truncate"
                        title={row.itemName}
                      >
                        {row.itemName}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {row.cancelStage}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {row.cancelReason}
                        </span>
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {row.poQty}
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {row.totalLiftedQty}
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {row.receivedQty}
                      </td>
                      <td className="p-3 text-center font-black text-rose-600 dark:text-rose-400">
                        {row.cancelQty}
                      </td>
                      <td className="p-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                        {row.pendingQty}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {fmtCurrency(row.rate)}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {fmtCurrency(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Showing page {currentPage} of {totalPages} ({filteredCancelledOrders.length} items)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Prev
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
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: STAGE CANCEL OPERATIONS                                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeMainTab === "stage_cancel" && (
        <div className="space-y-6">
          {/* Stage Selector Dropdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Select Workflow Stage for Cancellation
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Choose a stage from the dropdown to view active records and halt further processing
                </p>
              </div>

              <div className="w-full sm:w-80">
                <div className="relative">
                  <select
                    value={selectedStageKey}
                    onChange={(e) => {
                      setSelectedStageKey(e.target.value);
                      setSelectedStageRowIds([]);
                      setStageCurrentPage(1);
                    }}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-900/60 focus:border-rose-500 dark:focus:border-rose-500 rounded-2xl text-xs font-black text-slate-900 dark:text-white cursor-pointer shadow-xs focus:outline-hidden transition-all"
                  >
                    {PURCHASE_WORKFLOW_STAGES.map((stg) => (
                      <option key={stg.id} value={stg.id} className="py-2 font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                        {stg.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-rose-600 dark:text-rose-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Stage Active Records Table & Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              {/* Sub-Tabs: Active Items vs Stage Cancelled History */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setStageSubTab("active_items");
                    setStageCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    stageSubTab === "active_items"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span>Active in {PURCHASE_WORKFLOW_STAGES.find((s) => s.id === selectedStageKey)?.stageName} ({filteredActiveStageRecords.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStageSubTab("cancelled_register");
                    setStageCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    stageSubTab === "cancelled_register"
                      ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 text-rose-500" />
                  <span>Stage Cancelled History ({stageCancelledRecordsList.length})</span>
                </button>
              </div>

              {/* Action Buttons & Search */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={stageSearchTerm}
                    onChange={(e) => {
                      setStageSearchTerm(e.target.value);
                      setStageCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {stageSubTab === "active_items" && (
                  <button
                    type="button"
                    onClick={handleOpenStageCancelModal}
                    disabled={selectedStageRowIds.length === 0}
                    className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Cancel Selected ({selectedStageRowIds.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tab 1: Active Stage Records */}
            {stageSubTab === "active_items" && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredActiveStageRecords.length > 0 &&
                            selectedStageRowIds.length === filteredActiveStageRecords.length
                          }
                          onChange={toggleAllStageRows}
                          className="rounded text-rose-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">Reference / Document #</th>
                      <th className="p-3">Material / Item</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3">Party / Supplier / Creator</th>
                      <th className="p-3">Category / Details</th>
                      <th className="p-3 text-center">Stage Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-600" />
                          Loading active stage records...
                        </td>
                      </tr>
                    ) : paginatedStageData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No active actionable records found in{" "}
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            {PURCHASE_WORKFLOW_STAGES.find((s) => s.id === selectedStageKey)?.stageName}
                          </span>.
                        </td>
                      </tr>
                    ) : (
                      paginatedStageData.map((row) => {
                        const isSelected = selectedStageRowIds.includes(row.id);
                        return (
                          <tr
                            key={row.id}
                            onClick={() => toggleStageRow(row.id)}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                              isSelected ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStageRow(row.id)}
                                className="rounded text-rose-600 cursor-pointer"
                              />
                            </td>

                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {row.recordNumber}
                            </td>

                            <td className="p-3 font-bold text-slate-900 dark:text-white max-w-[220px] truncate">
                              {row.itemName}
                            </td>

                            <td className="p-3 text-center font-black text-slate-800 dark:text-slate-200">
                              {row.quantity} {row.uom}
                            </td>

                            <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">
                              {row.partyName}
                            </td>

                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {row.category}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {row.status}
                              </span>
                            </td>

                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStageRowIds([row.id]);
                                  setStageCancelReason("Stage Specific Rejection");
                                  setStageCancelRemarks("");
                                  setStageCancelModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-Tab 2: Stage Cancelled History Register */}
            {stageSubTab === "cancelled_register" && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Cancelled Date</th>
                      <th className="p-3">Stage Name</th>
                      <th className="p-3">Indent / PO #</th>
                      <th className="p-3">Material</th>
                      <th className="p-3">Supplier / Party</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3">Cancellation Reason</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedStageData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No stage-cancelled items recorded yet.
                        </td>
                      </tr>
                    ) : (
                      paginatedStageData.map((row) => (
                        <tr
                          key={row.id}
                          className="bg-rose-50/50 dark:bg-rose-950/20 border-l-4 border-rose-500 hover:bg-rose-50/80 transition-colors"
                        >
                          <td className="p-3 font-mono text-slate-500 text-[11px]">
                            {formatDateTime(row.timestamp)}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {row.cancelStage}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                            {row.indentNo !== "-" ? row.indentNo : row.poNumber}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                            {row.itemName}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">
                            {row.supplierName}
                          </td>
                          <td className="p-3 text-center font-black text-rose-600 dark:text-rose-400">
                            {row.cancelQty}
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-200">
                            <span className="px-2 py-0.5 bg-rose-100/80 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 rounded-md text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                              {row.cancelReason}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white shadow-xs">
                              Stage Cancel
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stage Pagination */}
            {stageTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Showing page {stageCurrentPage} of {stageTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={stageCurrentPage === 1}
                    onClick={() => setStageCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={stageCurrentPage === stageTotalPages}
                    onClick={() => setStageCurrentPage((p) => Math.min(stageTotalPages, p + 1))}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: STAGE CANCEL CONFIRMATION MODAL                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {stageCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50 dark:bg-rose-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-xl">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900 dark:text-rose-100">
                    Confirm Stage Cancellation
                  </h3>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                    Stage: {PURCHASE_WORKFLOW_STAGES.find((s) => s.id === selectedStageKey)?.label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStageCancelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  Cancelling these records will <strong>restrict them from further workflow stages</strong>. The rows will be marked with a red-tinted <strong>'Stage Cancel'</strong> status across system reports.
                </p>
              </div>

              {/* Selected Items summary */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Selected Records ({selectedStageRowIds.length})
                </label>
                <div className="max-h-32 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  {filteredActiveStageRecords
                    .filter((r) => selectedStageRowIds.includes(r.id))
                    .map((r) => (
                      <div key={r.id} className="flex justify-between items-center py-0.5">
                        <span className="font-mono font-bold text-rose-600">{r.recordNumber}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[200px]">
                          {r.itemName} ({r.quantity} {r.uom})
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Quick Reasons */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    "Administrative Cancellation",
                    "Specification Change",
                    "Vendor Unavailable",
                    "Commercial Disagreement",
                    "Duplicate Indent",
                    "Budgetary Halt",
                  ].map((rText) => (
                    <button
                      key={rText}
                      type="button"
                      onClick={() => setStageCancelReason(rText)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        stageCancelReason === rText
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {rText}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Enter or customize cancellation reason..."
                  value={stageCancelReason}
                  onChange={(e) => setStageCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Audit Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional internal audit explanation..."
                  value={stageCancelRemarks}
                  onChange={(e) => setStageCancelRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStageCancelModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStageCancel}
                  disabled={isSubmittingStageCancel}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingStageCancel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  <span>Confirm Stage Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: ORDER CANCELLATION MODAL (PO / Lifting Level)                 */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Cancel Purchase Order
                  </h3>
                  <p className="text-xs text-slate-500">
                    Stage: {FIXED_CANCEL_STAGE}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Filter by Indent Number
                  </label>
                  <select
                    value={selectedIndentFilter}
                    onChange={(e) => setSelectedIndentFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="">All Pending Indents</option>
                    {indentNumberOptions.map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Filter by Supplier / Vendor
                  </label>
                  <select
                    value={selectedVendorFilter}
                    onChange={(e) => setSelectedVendorFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="">All Vendors</option>
                    {vendorNameOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">Select</th>
                      <th className="p-3">Indent #</th>
                      <th className="p-3">PO #</th>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-center">PO Qty</th>
                      <th className="p-3 text-center">Lifted Qty</th>
                      <th className="p-3 text-center">Remaining</th>
                      <th className="p-3 text-center w-28">Cancel Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {modalSearchResults.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          No pending orders found to cancel.
                        </td>
                      </tr>
                    ) : (
                      modalSearchResults.map((row) => {
                        const isSelected = selectedSearchRowIds.includes(row.id);
                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              isSelected ? "bg-rose-50/40 dark:bg-rose-950/20" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSearchRow(row.id)}
                                className="rounded text-rose-600 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-rose-600">
                              {row.indentNumber}
                            </td>
                            <td className="p-3 font-mono">{row.poNumber}</td>
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                              {row.vendorName}
                            </td>
                            <td className="p-3">{row.itemName}</td>
                            <td className="p-3 text-center font-semibold">{row.poQty}</td>
                            <td className="p-3 text-center font-semibold">{row.liftedQty}</td>
                            <td className="p-3 text-center font-black text-amber-600">
                              {row.remainingQty}
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={1}
                                max={row.remainingQty}
                                value={cancelQuantities[row.id] ?? row.remainingQty}
                                onChange={(e) =>
                                  handleCancelQtyChange(row.id, e.target.value)
                                }
                                disabled={!isSelected}
                                className="w-20 px-2 py-1 text-center font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-40"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cancellation Reason */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 pb-1">
                  {[
                    "Vendor Unable to Supply",
                    "Quality Issues",
                    "Customer Request",
                    "Rate Disagreement",
                    "Excess Inventory",
                  ].map((rText) => (
                    <button
                      key={rText}
                      type="button"
                      onClick={() => setCancelReason(rText)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                        cancelReason === rText
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {rText}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Enter cancellation reason..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOrderCancel}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
