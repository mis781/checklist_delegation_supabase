import { useState, useMemo } from "react";
import {
  Truck,
  Search,
  Loader2,
  X,
  MapPin,
  CheckCircle,
  RefreshCw,
  History,
  Clock,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import TatStageBadge from "./TatStageBadge";
import CircularProcessingLoader from "./CircularProcessingLoader";

import {
  formatDateDash,
  formatDateTime,
  toLocalIsoTimestamp,
  resolvePlannedDate,
} from "../utils/dateUtils";
import { addOfficeHours, resolveTatRule } from "../services/purchaseTatEngine";

function computeFollowUpPlannedDate(baseDate, rules, stageName = "Transporter Follow-Up") {
  if (!baseDate) return null;
  const rule = resolveTatRule(stageName, rules);
  const slaMinutes = rule ? rule.duration_minutes : 72 * 60;
  const d = addOfficeHours(baseDate, slaMinutes);
  return d ? d.toISOString() : null;
}

// ─── helpers ───────────────────────────────────────────────────────────────

const formatDate = (val) => {
  if (!val || val === "-" || val === "—" || val === "null" || val === "undefined") return "-";
  const formatted = formatDateDash(val);
  return formatted === "—" ? "-" : formatted;
};

const pickLatest = (arr) => {
  if (!arr || arr.length === 0) return null;
  return [...arr].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0).getTime() -
      new Date(a.updated_at || a.created_at || 0).getTime(),
  )[0];
};

const safeStr = (v) =>
  v === null || v === undefined || String(v).trim() === "" ? "-" : String(v);

// ───────────────────────────────────────────────────────────────────────────

export default function TransporterFollowUpView() {
  const { showToast } = useMagicToast();
  const {
    indents,
    purchaseOrders,
    vendorLiftings,
    transporterFollowups,
    getTatStatusForIndent,
    getIndentNumber,
    getLiftNumber,
    tatRules,
    refreshData,
    loading,
    isRefreshing: contextRefreshing,
    isBackgroundStreaming,
  } = usePurchaseWorkflow();

  // ── UI state ──
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // ── Modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [currentShipment, setCurrentShipment] = useState(null);
  const [followupForm, setFollowupForm] = useState({
    status: "",
    expectedDelivery: "",
    nextFollowupDate: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Follow-Up History Modal state ──
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryShipment, setSelectedHistoryShipment] = useState(null);

  const handleOpenHistoryModal = (row) => {
    setSelectedHistoryShipment(row);
    setHistoryModalOpen(true);
  };

  // ── CORE DATA MODEL ──────────────────────────────────────────────────────
  // One UI row per vendor_lifting that has been dispatched (actual_lifting_date set).
  // Status (pending/history) is derived from the LATEST transporter_followup for that lifting.
  const allRows = useMemo(() => {
    const tfByLifting = new Map();
    const tfByPo = new Map();

    (transporterFollowups || []).forEach((tf) => {
      if (tf.lifting_id) {
        const list = tfByLifting.get(tf.lifting_id) || [];
        list.push(tf);
        tfByLifting.set(tf.lifting_id, list);
      }
      if (tf.po_id) {
        const list = tfByPo.get(tf.po_id) || [];
        list.push(tf);
        tfByPo.set(tf.po_id, list);
      }
    });

    // Only show liftings that have been physically dispatched (actual_lifting_date is set)
    const dispatchedLiftings = (vendorLiftings || []).filter((l) => {
      const d = l.actual_lifting_date;
      return d && String(d).trim() !== "" && String(d).trim() !== "-";
    });

    return dispatchedLiftings.map((lift) => {
      const po = (purchaseOrders || []).find((p) => p.id === lift.po_id);
      const rawIndentId = po?.indent_id || lift.indent_id;
      const indent =
        (indents || []).find((i) => i.id === rawIndentId) ||
        (indents || []).find((i) => i.indent_number === po?.indent_number);
      const uom =
        po?.uom ||
        po?.unit ||
        indent?.uom ||
        indent?.unit ||
        lift?.uom ||
        lift?.unit ||
        "";

      // Prefer liftings-linked followups; fall back to PO-only linked legacy entries
      const liftFollowups = tfByLifting.get(lift.id) || [];
      const legacyPoFollowups = (tfByPo.get(lift.po_id) || []).filter(
        (t) => !t.lifting_id && t.transporter_name !== "Follow-up",
      );
      const candidates =
        liftFollowups.length > 0 ? liftFollowups : legacyPoFollowups;

      // Sort all candidates chronologically
      const sortedFollowups = [...candidates].sort(
        (a, b) =>
          new Date(a.updated_at || a.created_at || 0).getTime() -
          new Date(b.updated_at || b.created_at || 0).getTime(),
      );

      // Filter follow-ups actually performed in Stage 9 (Transporter Follow-Up)
      const stage9Followups = sortedFollowups.filter((t, idx) => {
        if (t.transport_rate === "STAGE_9_FOLLOWUP") return true;
        const st = String(t.status || "").toLowerCase().trim();
        if (st === "intransit" || st === "received") return true;
        if (sortedFollowups.length > 1 && idx > 0) return true;
        return false;
      });

      const hasStage9Followup = stage9Followups.length > 0;
      const latestStage9TF = hasStage9Followup
        ? stage9Followups[stage9Followups.length - 1]
        : null;
      const latestTF = pickLatest(candidates);

      const totalFollowUps = stage9Followups.length;

      const isDelivered =
        !!latestTF &&
        ["received", "delivered", "completed", "complete"].includes(
          String(latestTF.status || "").toLowerCase(),
        );

      // Indent number resolution
      const indentNumber =
        indent?.indent_number ||
        indent?.indentNumber ||
        po?.indent_number ||
        po?.indentNumber ||
        (getIndentNumber ? getIndentNumber(rawIndentId) : null) ||
        "-";

      // Freight amount — prefer lifting record, fall back to latest TF
      const freightRaw =
        lift.freight_amount !== null &&
        lift.freight_amount !== undefined &&
        String(lift.freight_amount).trim() !== ""
          ? lift.freight_amount
          : (latestTF?.freight_amount ?? "");
      const freightAmt =
        freightRaw !== "" && freightRaw !== null && freightRaw !== undefined
          ? `₹${Number(freightRaw).toLocaleString()}`
          : "—";

      const rawLiftingQty = lift.lifting_qty || po?.quantity || "-";
      const liftingQty =
        rawLiftingQty !== "-" ? `${rawLiftingQty} ${uom}`.trim() : "-";

      // ─── STAGE 9 FOLLOW-UP COLUMNS ───
      // When a lift arrives in this transport follow up stage and no follow-up has been submitted from here:
      // Expected delivery, last follow-up, next follow-up, and remarks MUST be empty ("-").
      // When user submits follow-up from here, they are updated and displayed in both pending and history!
      const expectedDeliveryDate = hasStage9Followup
        ? (latestStage9TF?.expected_arrival_date || "-")
        : "-";

      const lastFollowUpDate = hasStage9Followup
        ? (latestStage9TF?.updated_at || latestStage9TF?.created_at || "-")
        : "-";

      const nextFollowupDate = hasStage9Followup
        ? (lift.next_followup_date || lift.followup_date || latestStage9TF?.expected_arrival_date || "-")
        : "-";

      const remarks = hasStage9Followup
        ? safeStr(latestStage9TF?.current_location || latestStage9TF?.remarks || lift.remarks)
        : "-";

      return {
        // Stable ID per lifting (not per followup row)
        id: lift.id,
        _liftingId: lift.id,
        _poId: lift.po_id,
        indentId: rawIndentId,

        indentNumber,
        itemName: safeStr(po?.item_name || indent?.item_name),
        liftNo: getLiftNumber
          ? getLiftNumber(lift.id)
          : `LIFT-${String(lift.id).substring(0, 8).toUpperCase()}`,
        vendorName: safeStr(po?.vendor_name || indent?.selected_vendor_name),
        poNumber: safeStr(po?.po_number),
        liftingQty,

        transportType:
          latestTF?.transport_type ||
          po?.transport_type ||
          lift.transport_type ||
          "-",
        transporterName:
          latestTF?.transporter_name || lift.contact_person || "-",
        vehicleNo: safeStr(lift.vehicle_number || latestTF?.vehicle_number),
        contactNo: safeStr(lift.driver_contact || latestTF?.driver_contact),
        freightAmt,

        lrNo: safeStr(latestTF?.bilty_number),
        lrCopy: latestTF?.bilty_copy_url || null,

        expectedDeliveryDate,
        plannedDate:
          resolvePlannedDate(
            getTatStatusForIndent(rawIndentId, "Transporter Follow-Up"),
            computeFollowUpPlannedDate(
              latestTF?.updated_at ||
                latestTF?.created_at ||
                lift?.updated_at ||
                lift?.created_at ||
                lift?.actual_lifting_date ||
                po?.po_date ||
                po?.created_at,
              tatRules,
              "Transporter Follow-Up",
            ) ||
              po?.planned_date ||
              indent?.planned_date ||
              indent?.required_date ||
              po?.delivery_date ||
              lift.expected_lifting_date ||
              null,
          ),
        actualDate: lift.actual_lifting_date || "-",
        lastFollowUpDate,
        nextFollowupDate,
        remarks,
        totalFollowUps,
        allFollowups: stage9Followups.length > 0 ? stage9Followups : sortedFollowups,
        hasStage9Followup,

        isDelivered,

        // Raw objects for reference
        po,
        lift,
        latestTF,
      };
    });
  }, [
    vendorLiftings,
    transporterFollowups,
    purchaseOrders,
    indents,
    getIndentNumber,
    getLiftNumber,
    tatRules,
    getTatStatusForIndent,
  ]);

  // ── Pending / History lists ──────────────────────────────────────────────
  const pendingList = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return allRows
      .filter((r) => !r.isDelivered)
      .filter((r) => {
        if (!s) return true;
        return (
          String(r.indentNumber).toLowerCase().includes(s) ||
          String(r.itemName).toLowerCase().includes(s) ||
          String(r.vendorName).toLowerCase().includes(s) ||
          String(r.poNumber).toLowerCase().includes(s) ||
          String(r.liftNo).toLowerCase().includes(s) ||
          String(r.transporterName).toLowerCase().includes(s) ||
          String(r.vehicleNo).toLowerCase().includes(s)
        );
      });
  }, [allRows, searchTerm]);

  const historyList = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return allRows.filter((r) => {
      if (!s) return true;
      return (
        String(r.indentNumber).toLowerCase().includes(s) ||
        String(r.itemName).toLowerCase().includes(s) ||
        String(r.vendorName).toLowerCase().includes(s) ||
        String(r.poNumber).toLowerCase().includes(s) ||
        String(r.liftNo).toLowerCase().includes(s) ||
        String(r.transporterName).toLowerCase().includes(s) ||
        String(r.vehicleNo).toLowerCase().includes(s)
      );
    });
  }, [allRows, searchTerm]);

  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  // ── Open Modal ───────────────────────────────────────────────────────────
  const handleOpenFollowupModal = (row) => {
    setCurrentShipment(row);
    const toDateInputVal = (val) => {
      if (!val || val === "-" || val === "—") return "";
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    const expDateStr =
      row.latestTF?.expected_arrival_date ||
      row.lift?.expected_lifting_date ||
      row.lift?.next_followup_date ||
      row.lift?.expected_delivery_date ||
      (row.expectedDeliveryDate && row.expectedDeliveryDate !== "-"
        ? row.expectedDeliveryDate
        : "") ||
      row.po?.delivery_date ||
      "";

    setFollowupForm({
      status: "Intransit",
      expectedDelivery: toDateInputVal(expDateStr),
      nextFollowupDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      remarks: "",
    });
    setModalOpen(true);
  };

  // ── Submit Follow-Up ─────────────────────────────────────────────────────
  const handleSubmitFollowup = async (e) => {
    e.preventDefault();

    // Validation
    if (!followupForm.status) {
      showToast("Status is required", "error");
      return;
    }
    if (followupForm.status === "Intransit") {
      if (!followupForm.nextFollowupDate) {
        showToast(
          "Next Follow-Up date is required when status is Intransit",
          "error",
        );
        return;
      }
      if (!followupForm.expectedDelivery) {
        showToast(
          "Expected Delivery date is required when status is Intransit",
          "error",
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const isReceived = followupForm.status === "Received";

      const expectedArrivalIso = toLocalIsoTimestamp(followupForm.expectedDelivery, false);
      const nextFollowupIso = toLocalIsoTimestamp(followupForm.nextFollowupDate, false);

      // 1. INSERT new transporter_followups row (one per follow-up event)
      //    — always linked to the lifting_id so future joins work correctly
      const freightNumeric =
        currentShipment.freightAmt !== "—"
          ? parseFloat(
              String(currentShipment.freightAmt).replace(/[₹,]/g, ""),
            ) || null
          : null;

      const { error: tfError } = await supabase
        .from("transporter_followups")
        .insert({
          po_id: currentShipment._poId,
          lifting_id: currentShipment._liftingId,
          transporter_name:
            currentShipment.transporterName !== "-"
              ? currentShipment.transporterName
              : "",
          vehicle_number:
            currentShipment.vehicleNo !== "-" ? currentShipment.vehicleNo : "",
          bilty_number:
            currentShipment.lrNo !== "-" ? currentShipment.lrNo : null,
          transport_type:
            currentShipment.transportType !== "-"
              ? currentShipment.transportType
              : null,
          freight_amount: freightNumeric,
          status: followupForm.status,
          expected_arrival_date: expectedArrivalIso,
          dispatch_date: isReceived ? now : null,
          current_location: followupForm.remarks || "In-Transit Follow-Up",
          transport_rate: "STAGE_9_FOLLOWUP",
          created_at: now,
          updated_at: now,
        });

      if (tfError) throw tfError;

      // 2. UPDATE vendor_liftings with latest follow-up metadata
      const liftUpdate = {
        followup_date: nextFollowupIso || now,
        next_followup_date: nextFollowupIso || now,
        expected_lifting_date: expectedArrivalIso,
        remarks: followupForm.remarks || "",
        updated_at: now,
      };

      if (isReceived) {
        // Mark lifting as fully received/delivered — this moves it to "history"
        liftUpdate.actual_lifting_date = now;
        liftUpdate.lifting_status = "Complete";
      } else {
        liftUpdate.lifting_status = "Intransit";
      }

      const { error: liftError } = await supabase
        .from("vendor_liftings")
        .update(liftUpdate)
        .eq("id", currentShipment._liftingId);

      if (liftError) throw liftError;

      showToast(
        isReceived
          ? `Vehicle ${currentShipment.vehicleNo} arrived at factory gate! Sent for QC & GRN.`
          : `Transit follow-up logged for vehicle ${currentShipment.vehicleNo}.`,
        "success",
      );

      setModalOpen(false);

      // Refresh context state so pending → history transition is reflected immediately
      if (refreshData) await refreshData(true);
    } catch (err) {
      console.error("Transporter follow-up error:", err);
      showToast(`Update failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Manual Refresh ───────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshData) await refreshData(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 9 : Transporter Follow-Up &amp; Live In-Transit Tracking
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Monitor highway freight movements, log driver transit updates,
                and register vehicle gate arrivals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-40"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>

            {isBackgroundStreaming && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 rounded-xl text-blue-600 dark:text-blue-400 text-[11px] font-medium animate-pulse shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span className="hidden sm:inline">Syncing live batches...</span>
              </div>
            )}

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent, Item, PO, Vehicle..."
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
      </div>

      {/* 2. Tab Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
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
              In-Transit Highway Shipments ({loading || contextRefreshing || isRefreshing ? "..." : pendingList.length})
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
              Shipment History ({loading || contextRefreshing || isRefreshing ? "..." : historyList.length})
            </button>
          </div>
        </div>

        {/* 3. Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                {activeTab === "pending" && (
                  <th className="p-3 text-center">Actions</th>
                )}
                {activeTab === "history" && (
                  <th className="p-3 text-center">Status</th>
                )}
                <th className="p-3">Indent No</th>
                <th className="p-3">Item Name</th>
                <th className="p-3 text-center">Expected Delivery</th>
                <th className="p-3 text-center font-mono">Planned Date</th>
                <th className="p-3 text-center">Delay</th>
                {activeTab === "history" && (
                  <th className="p-3 text-center">Actual Delivery Date</th>
                )}
                <th className="p-3 text-center">Total Follow-Ups</th>
                <th className="p-3 text-center">Last Follow-Up</th>
                <th className="p-3 text-center">Next Follow-Up</th>
                <th className="p-3">Remarks</th>
                <th className="p-3">Unit Tracking No.</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">PO Number</th>
                <th className="p-3 text-center">Dispatch Qty</th>
                <th className="p-3">Transport Type</th>
                <th className="p-3">Transporter Name</th>
                <th className="p-3 text-right">Freight Amt</th>
                <th className="p-3 font-mono">Vehicle No</th>
                <th className="p-3 font-mono">Contact Number</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading || contextRefreshing || isRefreshing || (isBackgroundStreaming && paginatedData.length === 0) ? (
                <tr>
                  <td colSpan={22} className="p-12 text-center">
                    <CircularProcessingLoader
                      message="Loading & tracking shipments..."
                      subMessage="Fetching real-time highway freight movements and gate arrivals"
                    />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={22} className="p-8 text-center text-slate-400">
                    {activeTab === "pending"
                      ? "No in-transit shipments found. Liftings with an actual dispatch date will appear here."
                      : "No shipment records found."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Actions */}
                    {activeTab === "pending" && (
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenFollowupModal(row)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Process</span>
                        </button>
                      </td>
                    )}

                    {/* Status (History Tab) */}
                    {activeTab === "history" && (
                      <td className="p-3 text-center">
                        {row.isDelivered ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Delivered
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            In-Transit
                          </span>
                        )}
                      </td>
                    )}

                    {/* Indent No */}
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.indentNumber}
                    </td>

                    {/* Item Name */}
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {row.itemName}
                    </td>

                    {/* Expected Delivery Date */}
                    <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatDate(row.expectedDeliveryDate)}
                    </td>

                    {/* Planned Date */}
                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                      {formatDate(row.plannedDate)}
                    </td>

                    {/* Delay */}
                    <td
                      className="p-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TatStageBadge
                        tatStatus={getTatStatusForIndent(
                          row.indentId || row.id,
                          "Transporter Follow-Up",
                        )}
                        indentId={row.indentId || row.id}
                        isCompleted={activeTab === "history"}
                      />
                    </td>

                    {/* History: Actual Delivery Date */}
                    {activeTab === "history" && (
                      <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.isDelivered
                          ? formatDate(
                              row.latestTF?.updated_at || row.actualDate,
                            )
                          : "—"}
                      </td>
                    )}

                    {/* Total Follow-Ups (Clickable to View History) */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryModal(row)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-all cursor-pointer shadow-2xs group"
                        title="Click to view all follow-up events & checkpoint logs"
                      >
                        <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform" />
                        <span>{row.totalFollowUps || (row.allFollowups ? row.allFollowups.length : 0)}</span>
                        <span className="text-[10px] text-blue-500 font-medium underline">Details</span>
                      </button>
                    </td>

                    {/* Last Follow-Up Date */}
                    <td className="p-3 text-center font-mono text-slate-500">
                      {formatDate(row.lastFollowUpDate)}
                    </td>

                    {/* Next Follow-Up Date */}
                    <td className="p-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {formatDate(row.nextFollowupDate)}
                    </td>

                    {/* Remarks */}
                    <td
                      className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                      title={row.remarks}
                    >
                      {row.remarks}
                    </td>

                    {/* Unit Tracking No. (first 8 chars of lifting ID) */}
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {row.liftNo}
                    </td>

                    {/* Supplier */}
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {row.vendorName}
                    </td>

                    {/* PO Number */}
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {row.poNumber}
                    </td>

                    {/* Dispatch Qty */}
                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {row.liftingQty}
                    </td>

                    {/* Transport Type */}
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {row.transportType}
                    </td>

                    {/* Transporter Name */}
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {row.transporterName}
                    </td>

                    {/* Freight Amt */}
                    <td className="p-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      {row.freightAmt}
                    </td>

                    {/* Vehicle No */}
                    <td className="p-3 font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                      {row.vehicleNo}
                    </td>

                    {/* Contact Number */}
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      {row.contactNo}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Showing page {currentPage} of {totalPages} ({currentList.length}{" "}
              items)
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Transporter Follow-Up Modal */}
      {modalOpen && currentShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Transport Follow-Up
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Log an in-transit update or mark as received
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFollowup} className="p-6 space-y-6">
              {/* Shipment Summary */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Indent Number
                  </div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    {currentShipment.indentNumber}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Transport Type
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {currentShipment.transportType}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Transporter Name
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {currentShipment.transporterName}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Vehicle Number
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                    {currentShipment.vehicleNo}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Contact Number
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                    {currentShipment.contactNo}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Unit Tracking No.
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                    {currentShipment.liftNo}
                  </div>
                </div>
              </div>

              {/* Update Status Section */}
              <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Update Status
                </span>

                {/* Status Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={followupForm.status}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="" disabled>
                      — Select Status —
                    </option>
                    <option value="Intransit">Intransit</option>
                    <option value="Received">Received (Gate Arrival)</option>
                  </select>
                </div>

                {/* Conditional fields for Intransit */}
                {followupForm.status === "Intransit" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                        Next Follow-Up Date{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={followupForm.nextFollowupDate}
                        onChange={(e) =>
                          setFollowupForm({
                            ...followupForm,
                            nextFollowupDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                        Expected Delivery{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={followupForm.expectedDelivery}
                        onChange={(e) =>
                          setFollowupForm({
                            ...followupForm,
                            expectedDelivery: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Received confirmation message */}
                {followupForm.status === "Received" && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      This will mark the shipment as delivered and move it to
                      history. The lifting will proceed to Material Received.
                    </p>
                  </div>
                )}

                {/* Remarks */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter transport remarks..."
                    value={followupForm.remarks}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        remarks: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !followupForm.status}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Submit Follow-Up</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Follow-Up Checkpoint History Modal */}
      {historyModalOpen && selectedHistoryShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Transporter Follow-Up History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Indent: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedHistoryShipment.indentNumber}</span> · PO: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedHistoryShipment.poNumber}</span> · Item: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedHistoryShipment.itemName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryModalOpen(false);
                  setSelectedHistoryShipment(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shipment Snapshot Banner */}
            <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Supplier</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{selectedHistoryShipment.vendorName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Transporter</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{selectedHistoryShipment.transporterName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Vehicle No</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">{selectedHistoryShipment.vehicleNo}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Current Status</span>
                {selectedHistoryShipment.isDelivered ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Delivered
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    In-Transit
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body: Timeline of checkpoints */}
            <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
              {(!selectedHistoryShipment.allFollowups || selectedHistoryShipment.allFollowups.length === 0) ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Truck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium">
                    No follow-up checkpoints recorded yet for this shipment.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Use the &quot;Process&quot; button in the In-Transit tab to log live movement updates.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {selectedHistoryShipment.allFollowups.map((item, idx) => {
                    const stLower = String(item.status || "").toLowerCase();
                    const isRec = stLower.includes("received") || stLower.includes("delivered");
                    const isArranged = stLower.includes("arranged");

                    let badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800";
                    let dotColor = "bg-amber-500";
                    if (isRec) {
                      badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
                      dotColor = "bg-emerald-500";
                    } else if (isArranged) {
                      badgeColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800";
                      dotColor = "bg-blue-500";
                    }

                    return (
                      <div key={item.id || idx} className="relative group">
                        {/* Timeline Bullet */}
                        <div
                          className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${dotColor} shadow-xs`}
                        />

                        {/* Event Card */}
                        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                #{idx + 1}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}
                              >
                                {item.status || "Follow-Up Logged"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatDateTime(item.updated_at || item.created_at)}</span>
                            </div>
                          </div>

                          {/* Event Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-700/50">
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                Transporter &amp; Vehicle
                              </span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">
                                {item.transporter_name || selectedHistoryShipment.transporterName || "—"} 
                                {item.vehicle_number ? ` (${item.vehicle_number})` : ""}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                Expected Arrival (ETA)
                              </span>
                              <span className="text-blue-600 dark:text-blue-400 font-mono font-semibold">
                                {item.expected_arrival_date ? formatDate(item.expected_arrival_date) : "—"}
                              </span>
                            </div>

                            {item.current_location && (
                              <div className="sm:col-span-2">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                  Checkpoint Location
                                </span>
                                <span className="text-slate-800 dark:text-slate-200 font-medium">
                                  {item.current_location}
                                </span>
                              </div>
                            )}

                            {item.freight_amount != null && Number(item.freight_amount) > 0 && (
                              <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                  Freight Amount
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                  ₹{Number(item.freight_amount).toLocaleString()}
                                </span>
                              </div>
                            )}

                            {item.bilty_number && (
                              <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                  Bilty / LR Number
                                </span>
                                <span className="font-mono text-slate-800 dark:text-slate-200">
                                  {item.bilty_number}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Remarks */}
                          {item.remarks && (
                            <div className="pt-1.5 text-xs text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="font-bold text-slate-700 dark:text-slate-300 mr-1">Remarks:</span>
                              {item.remarks}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => {
                  setHistoryModalOpen(false);
                  setSelectedHistoryShipment(null);
                }}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
