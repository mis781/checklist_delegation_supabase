import React, { useState, useMemo, useCallback } from "react";
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Upload,
  Download,
  Paperclip,
  Image as ImageIcon,
  FileText,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";

import { formatDateDash, formatDateTime, toLocalIsoTimestamp } from "../utils/dateUtils";

const safeNum = (v) => parseFloat(String(v || "0").replace(/,/g, "")) || 0;

const fmtCurrency = (raw) => {
  if (!raw || raw === "0" || raw === 0) return "-";
  const n = safeNum(raw);
  return isNaN(n)
    ? String(raw)
    : `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Generate next sequential GRN number from DB */
const generateGRN = async () => {
  const { data } = await supabase
    .from("material_receipts")
    .select("grn_number")
    .order("created_at", { ascending: false })
    .limit(10);

  let nextNum = 1;
  if (data && data.length > 0) {
    for (const row of data) {
      const base = String(row.grn_number || "").split("_")[0]; // strip _liftNo suffix
      const match = base.match(/GRN-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n >= nextNum) nextNum = n + 1;
      }
    }
  }
  return `GRN-${String(nextNum).padStart(3, "0")}`;
};

/** Upload a File to Supabase Storage — returns public URL or object URL as fallback */
const uploadToStorage = async (file) => {
  if (!file) return "";
  try {
    const path = `material-images/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("material-images")
      .upload(path, file);
    if (error) {
      console.warn("Storage upload error:", error.message);
      return URL.createObjectURL(file);
    }
    const { data } = supabase.storage
      .from("material-images")
      .getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("Upload exception:", err);
    return URL.createObjectURL(file);
  }
};

const RECEIVED_STATUSES = ["received", "delivered", "completed", "complete"];
const isTransporterDone = (t) =>
  !!t && RECEIVED_STATUSES.includes(String(t.status || "").toLowerCase());

// ─────────────────────────────────────────────────────────────────────────────

export default function MaterialReceivedView() {
  const { showToast } = useMagicToast();
  const {
    indents,
    purchaseOrders,
    vendorLiftings,
    transporterFollowups,
    materialReceipts,
    vendorPayments,
    getIndentNumber,
    getLiftNumber,
    refreshData,
  } = usePurchaseWorkflow();

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  // Single-record form
  const [grnForm, setGrnForm] = useState({
    receivedQty: "",
    receivedItemImage: null,
    damageReceived: "no",
    damagedQty: "",
    damageReason: "",
    damageImage: null,
    remarks: "",
  });

  // ─── Row Building ───────────────────────────────────────────────────────────

  const sheetRecords = useMemo(() => {
    const rows = [];

    // Build lookup maps
    const posByIndentId = new Map();
    purchaseOrders.forEach((po) => {
      if (!po.indent_id) return;
      const list = posByIndentId.get(po.indent_id) || [];
      list.push(po);
      posByIndentId.set(po.indent_id, list);
    });

    const liftingsByPo = new Map();
    vendorLiftings.forEach((l) => {
      if (!l.po_id) return;
      const list = liftingsByPo.get(l.po_id) || [];
      list.push(l);
      liftingsByPo.set(l.po_id, list);
    });

    // Latest TF per po_id (fallback) and per lifting_id (preferred)
    const tfByPo = new Map();
    const tfByLifting = new Map();
    transporterFollowups.forEach((t) => {
      const existing = tfByPo.get(t.po_id);
      if (
        !existing ||
        new Date(t.updated_at || 0) > new Date(existing.updated_at || 0)
      ) {
        tfByPo.set(t.po_id, t);
      }
      if (t.lifting_id) {
        const existingL = tfByLifting.get(t.lifting_id);
        if (
          !existingL ||
          new Date(t.updated_at || 0) > new Date(existingL.updated_at || 0)
        ) {
          tfByLifting.set(t.lifting_id, t);
        }
      }
    });

    const receiptsByPo = new Map();
    materialReceipts.forEach((r) => {
      if (!r.po_id) return;
      const list = receiptsByPo.get(r.po_id) || [];
      list.push(r);
      receiptsByPo.set(r.po_id, list);
    });

    const paymentsByPo = new Map();
    vendorPayments.forEach((p) => {
      const pid = p.po_id || p.purchase_orders?.id;
      if (!pid) return;
      const list = paymentsByPo.get(pid) || [];
      list.push(p);
      paymentsByPo.set(pid, list);
    });

    // Iterate indents → POs
    const sourceIndents = indents.length > 0 ? indents : [];
    const allPOs = purchaseOrders;

    // If no indents loaded yet, fall back to iterating POs directly
    const processedPoIds = new Set();

    for (const indent of sourceIndents) {
      const indentPOs = posByIndentId.get(indent.id) || [];

      for (const po of indentPOs) {
        processedPoIds.add(po.id);
        _buildRowsForPO(
          po,
          indent,
          rows,
          liftingsByPo,
          tfByPo,
          tfByLifting,
          receiptsByPo,
          paymentsByPo,
          getIndentNumber,
          getLiftNumber,
        );
      }
    }

    // Also process POs not linked to any indent in state
    for (const po of allPOs) {
      if (processedPoIds.has(po.id)) continue;
      _buildRowsForPO(
        po,
        null,
        rows,
        liftingsByPo,
        tfByPo,
        tfByLifting,
        receiptsByPo,
        paymentsByPo,
        getIndentNumber,
        getLiftNumber,
      );
    }

    return rows;
  }, [
    indents,
    purchaseOrders,
    vendorLiftings,
    transporterFollowups,
    materialReceipts,
    vendorPayments,
    getIndentNumber,
    getLiftNumber,
  ]);

  const pendingList = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return sheetRecords.filter((r) => {
      if (r.status !== "pending") return false;
      if (!lower) return true;
      const d = r.data;
      return (
        String(d.indentNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.liftNo || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vendorName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.itemName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.poNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.transporterName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vehicleNo || "")
          .toLowerCase()
          .includes(lower)
      );
    });
  }, [sheetRecords, searchTerm]);

  const historyList = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return sheetRecords.filter((r) => {
      if (r.status !== "completed") return false;
      if (!lower) return true;
      const d = r.data;
      return (
        String(d.indentNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.liftNo || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vendorName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.itemName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.poNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.transporterName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vehicleNo || "")
          .toLowerCase()
          .includes(lower)
      );
    });
  }, [sheetRecords, searchTerm]);

  // Record map for fast lookup
  const recordMap = useMemo(
    () => new Map(sheetRecords.map((r) => [r.id, r])),
    [sheetRecords],
  );

  // Pagination
  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage, pageSize]);

  // ─── Checkbox / Bulk Selection ──────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState([]);

  const getSamePORecordIds = useCallback(
    (recordId) => {
      const rec = recordMap.get(recordId);
      if (!rec) return [recordId];
      const poNum = String(rec.data?.poNumber || "").trim();
      if (!poNum || poNum === "-") return [recordId];
      return sheetRecords
        .filter(
          (r) =>
            r.status === "pending" &&
            String(r.data?.poNumber || "").trim() === poNum,
        )
        .map((r) => r.id);
    },
    [sheetRecords, recordMap],
  );

  const checkVendorPOMatch = useCallback(
    (ids) => {
      if (ids.length === 0) return false;
      const first = recordMap.get(ids[0]);
      if (!first) return false;
      const v = first.data.vendorName;
      const p = first.data.poNumber;
      for (let i = 1; i < ids.length; i++) {
        const r = recordMap.get(ids[i]);
        if (!r || r.data.vendorName !== v || r.data.poNumber !== p)
          return false;
      }
      return true;
    },
    [recordMap],
  );

  const toggleSelect = useCallback(
    (recordId, checked) => {
      const groupIds = getSamePORecordIds(recordId);
      setSelectedIds((prev) => {
        const groupSet = new Set(groupIds);
        if (checked) return Array.from(new Set([...prev, ...groupIds]));
        return prev.filter((id) => !groupSet.has(id));
      });
    },
    [getSamePORecordIds],
  );

  // ─── Open Modal ─────────────────────────────────────────────────────────────

  const openModal = useCallback(
    (recordId) => {
      const rec = recordMap.get(recordId);
      if (!rec) {
        showToast("Record not found. Please refresh.", "error");
        return;
      }

      const groupIds = getSamePORecordIds(recordId);
      if (groupIds.length > 1) {
        // Auto-bulk mode
        setSelectedIds(groupIds);
        setIsBulkMode(true);
        setBulkItems(
          groupIds.map((id) => {
            const r = recordMap.get(id);
            return {
              recordId: id,
              indentNumber: r?.data?.indentNumber || "",
              liftNumber: r?.data?.liftNo || "",
              itemName: r?.data?.itemName || "",
              receivedQty: "",
              receivedItemImage: null,
              damageReceived: "no",
              damagedQty: "",
              damageReason: "",
              damageImage: null,
            };
          }),
        );
        setModalOpen(true);
        return;
      }

      // Single mode
      setSelectedIds([]);
      setIsBulkMode(false);
      setSelectedRecordId(recordId);
      setGrnForm({
        receivedQty: String(rec.data.liftingQty || rec.data.poQty || ""),
        receivedItemImage: null,
        damageReceived: "no",
        damagedQty: "",
        damageReason: "",
        damageImage: null,
        remarks: "",
      });
      setModalOpen(true);
    },
    [recordMap, getSamePORecordIds, showToast],
  );

  const openBulkModal = useCallback(() => {
    if (selectedIds.length === 0) return;
    const expanded = new Set();
    selectedIds.forEach((id) =>
      getSamePORecordIds(id).forEach((gid) => expanded.add(gid)),
    );
    const ids = Array.from(expanded);
    if (ids.length > 1 && !checkVendorPOMatch(ids)) {
      showToast(
        "All selected items must have the same Vendor and PO Number.",
        "error",
      );
      return;
    }
    setSelectedIds(ids);
    setIsBulkMode(true);
    setBulkItems(
      ids.map((id) => {
        const r = recordMap.get(id);
        return {
          recordId: id,
          indentNumber: r?.data?.indentNumber || "",
          liftNumber: r?.data?.liftNo || "",
          itemName: r?.data?.itemName || "",
          receivedQty: "",
          receivedItemImage: null,
          damageReceived: "no",
          damagedQty: "",
          damageReason: "",
          damageImage: null,
        };
      }),
    );
    setModalOpen(true);
  }, [
    selectedIds,
    getSamePORecordIds,
    checkVendorPOMatch,
    recordMap,
    showToast,
  ]);

  // ─── Submit (Single) ────────────────────────────────────────────────────────

  const handleSubmitGrn = useCallback(
    async (e) => {
      e.preventDefault();
      if (!selectedRecordId) return;
      const rec = recordMap.get(selectedRecordId);
      if (!rec) return;
      setIsSubmitting(true);
      try {
        const receivedQty = safeNum(grnForm.receivedQty);
        const isDamaged = grnForm.damageReceived === "yes";
        const damagedQty = isDamaged ? safeNum(grnForm.damagedQty) : 0;
        const availableQty = safeNum(rec.data.liftingQty || rec.data.poQty);

        if (receivedQty > availableQty && availableQty > 0) {
          showToast(
            `Cannot receive ${receivedQty} — Dispatch Qty is ${availableQty}`,
            "error",
          );
          return;
        }
        if (damagedQty > receivedQty) {
          showToast("Damaged qty cannot exceed received qty", "error");
          return;
        }

        const imageUrl =
          grnForm.receivedItemImage instanceof File
            ? await uploadToStorage(grnForm.receivedItemImage)
            : "";

        const damageImageUrl =
          grnForm.damageImage instanceof File
            ? await uploadToStorage(grnForm.damageImage)
            : "";

        const baseGrn = await generateGRN();
        const grnNumber = baseGrn;

        const nowIso = new Date().toISOString();
        const { error: insertError } = await supabase
          .from("material_receipts")
          .insert({
            grn_number: grnNumber,
            po_id: rec.data._poId,
            received_date: nowIso,
            received_quantity: receivedQty,
            accepted_quantity: isDamaged
              ? Math.max(0, receivedQty - damagedQty)
              : receivedQty,
            rejected_quantity: damagedQty,
            received_item_image_url: imageUrl || null,
            bilty_invoice_image_url: null,
            received_by: "Store Incharge",
            status: isDamaged && damagedQty > 0 ? "QC Failed" : "QC Passed",
          });
        if (insertError) throw insertError;

        showToast(
          `GRN ${grnNumber} issued! Order moved to Tally Billing.`,
          "success",
        );
        setModalOpen(false);
        await refreshData(true);
      } catch (err) {
        console.error("GRN Error:", err);
        showToast(`GRN failed: ${err.message}`, "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedRecordId, recordMap, grnForm, showToast, refreshData],
  );

  // ─── Submit (Bulk) ──────────────────────────────────────────────────────────

  const handleBulkSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        for (const item of bulkItems) {
          const rec = recordMap.get(item.recordId);
          if (!rec) continue;

          const receivedQty = safeNum(item.receivedQty);
          const isDamaged = item.damageReceived === "yes";
          const damagedQty = isDamaged ? safeNum(item.damagedQty) : 0;
          const availableQty = safeNum(rec.data.liftingQty || rec.data.poQty);

          if (receivedQty > availableQty && availableQty > 0) {
            showToast(
              `Cannot receive ${receivedQty} for ${item.indentNumber} — Dispatch Qty is ${availableQty}`,
              "error",
            );
            setIsSubmitting(false);
            return;
          }
          if (damagedQty > receivedQty) {
            showToast(
              `Damaged qty exceeds received qty for ${item.indentNumber}`,
              "error",
            );
            setIsSubmitting(false);
            return;
          }

          const itemImgUrl =
            item.receivedItemImage instanceof File
              ? await uploadToStorage(item.receivedItemImage)
              : "";
          const damageImgUrl =
            item.damageImage instanceof File
              ? await uploadToStorage(item.damageImage)
              : "";

          const baseGrn = await generateGRN();
          const grnNumber = baseGrn;
          const bulkNowIso = new Date().toISOString();

          const { error: insertError } = await supabase
            .from("material_receipts")
            .insert({
              grn_number: grnNumber,
              po_id: rec.data._poId,
              received_date: bulkNowIso,
              received_quantity: receivedQty,
              accepted_quantity: isDamaged
                ? Math.max(0, receivedQty - damagedQty)
                : receivedQty,
              rejected_quantity: damagedQty,
              received_item_image_url: itemImgUrl || null,
              bilty_invoice_image_url: null,
              received_by: null,
              status: isDamaged && damagedQty > 0 ? "QC Failed" : "QC Passed",
            });
          if (insertError) throw insertError;
        }

        showToast("Bulk receipt recorded successfully!", "success");
        setModalOpen(false);
        setSelectedIds([]);
        setIsBulkMode(false);
        await refreshData(true);
      } catch (err) {
        console.error("Bulk GRN Error:", err);
        showToast(`Bulk submit failed: ${err.message}`, "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [bulkItems, recordMap, showToast, refreshData],
  );

  // ─── Derived values for the open single modal ───────────────────────────────
  const activeRec = selectedRecordId ? recordMap.get(selectedRecordId) : null;
  const singleLiftQty = safeNum(
    activeRec?.data?.liftingQty || activeRec?.data?.poQty,
  );
  const singleReceivedQty = safeNum(grnForm.receivedQty);
  const singleDiff = singleLiftQty - singleReceivedQty;
  const singlePoBalance = Math.max(
    0,
    safeNum(activeRec?.data?.remainingPOBalance) - singleReceivedQty,
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 10 : Material Received / Quality Inspection & GRN
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect arrived consignments at warehouse, record accepted vs
                rejected items, and issue Goods Receipt Notes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk Record button */}
            {activeTab === "pending" && selectedIds.length > 1 && (
              <button
                type="button"
                onClick={openBulkModal}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                Bulk Record ({selectedIds.length})
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refreshData(true)}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent, PO, Vendor, Item..."
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

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {[
              {
                key: "pending",
                label: `Pending Warehouse Inspection (${pendingList.length})`,
              },
              {
                key: "history",
                label: `Issued GRN Register (${historyList.length})`,
              },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setSelectedIds([]);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              {activeTab === "pending" ? (
                <tr>
                  <th className="p-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        pendingList.length > 0 &&
                        pendingList.every((r) => selectedIds.includes(r.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedIds(pendingList.map((r) => r.id));
                        else setSelectedIds([]);
                      }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 text-center">Actions</th>
                  <th className="p-3">Indent No.</th>
                  <th className="p-3">Unit Tracking No.</th>
                  <th className="p-3">Warehouse</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3 text-right">PO Qty</th>
                  <th className="p-3 text-right">Dispatch Qty</th>
                  <th className="p-3 text-right">Rec. So Far</th>
                  <th className="p-3 text-right">Pending Bal.</th>
                  <th className="p-3 text-center">Planned</th>
                  <th className="p-3 text-center">Next Follow-Up</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Transporter</th>
                  <th className="p-3">Vehicle No</th>
                  <th className="p-3">Contact No</th>
                  <th className="p-3 text-center">Dispatch Date</th>
                  <th className="p-3 text-right">Freight Amt</th>
                  <th className="p-3 text-right">Advance Amt</th>
                  <th className="p-3 text-center">Payment Date</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-center">Bilty Copy</th>
                  <th className="p-3 text-center">PO Copy</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-3">Indent No.</th>
                  <th className="p-3">Unit Tracking No.</th>
                  <th className="p-3">Warehouse</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3 text-right">PO Qty</th>
                  <th className="p-3 text-center">Actual (Received)</th>
                  <th className="p-3 text-right">Dispatch Qty</th>
                  <th className="p-3 text-right">Rec. So Far</th>
                  <th className="p-3 text-right">Pending Bal.</th>
                  <th className="p-3 text-center">Planned</th>
                  <th className="p-3 text-center">Next Follow-Up</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Transporter</th>
                  <th className="p-3">Vehicle No</th>
                  <th className="p-3">Contact No</th>
                  <th className="p-3 text-center">Dispatch Date</th>
                  <th className="p-3 text-right">Freight Amt</th>
                  <th className="p-3 text-right">Advance Amt</th>
                  <th className="p-3 text-center">Payment Date</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-center">Bilty Copy</th>
                  <th className="p-3 text-center">PO Copy</th>
                  <th className="p-3">Receipt Lift No.</th>
                  <th className="p-3 text-right">Received Qty</th>
                  <th className="p-3 text-center">Invoice Date</th>
                  <th className="p-3">Invoice No.</th>
                  <th className="p-3 text-center">Extra Freight</th>
                  <th className="p-3 text-center">Item Image</th>
                  <th className="p-3 text-center">Bill Attach</th>
                  <th className="p-3 text-right">Damaged Qty</th>
                  <th className="p-3">Damage Reason</th>
                  <th className="p-3 text-center">Damage Image</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={35} className="p-8 text-center text-slate-400">
                    No{" "}
                    {activeTab === "pending"
                      ? "pending consignments"
                      : "issued GRN history"}{" "}
                    found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const d = row.data;
                  const isSelected = selectedIds.includes(row.id);

                  if (activeTab === "pending") {
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"}`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              toggleSelect(row.id, e.target.checked)
                            }
                            className="w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        {/* Action */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => openModal(row.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Record Receipt
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {d.indentNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                          {d.liftNo}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {d.warehouse || "-"}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {d.vendorName}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {d.itemName}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {d.poNumber}
                        </td>
                        <td className="p-3 text-right font-bold">{d.poQty}</td>
                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {d.liftingQty}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.totalReceivedSoFar}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {d.remainingPOBalance}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.planned6) || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.nextFollowUpDate) || "-"}
                        </td>
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                          title={d.remarks}
                        >
                          {d.remarks || "-"}
                        </td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          {d.transporterName || "-"}
                        </td>
                        <td className="p-3 font-mono uppercase font-bold">
                          {d.vehicleNo || "-"}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {d.contactNo || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.dispatchDate) || "-"}
                        </td>
                        <td className="p-3 text-right">{d.freightAmount}</td>
                        <td className="p-3 text-right">{d.advanceAmount}</td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.paymentDate) || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {d.paymentStatus || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {d.biltyCopy ? (
                            <a
                              href={d.biltyCopy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 text-xs text-green-600 hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {d.poCopy ? (
                            <a
                              href={d.poCopy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  } else {
                    // History row
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {d.indentNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                          {d.liftNo}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {d.warehouse || "-"}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {d.vendorName}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {d.itemName}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {d.poNumber}
                        </td>
                        <td className="p-3 text-right font-bold">{d.poQty}</td>
                        <td className="p-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDateTime(d.actual6) || "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {d.liftingQty}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.totalReceivedSoFar}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {d.remainingPOBalance}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.planned6) || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.nextFollowUpDate) || "-"}
                        </td>
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                          title={d.remarks}
                        >
                          {d.remarks || "-"}
                        </td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          {d.transporterName || "-"}
                        </td>
                        <td className="p-3 font-mono uppercase font-bold">
                          {d.vehicleNo || "-"}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {d.contactNo || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.dispatchDate) || "-"}
                        </td>
                        <td className="p-3 text-right">{d.freightAmount}</td>
                        <td className="p-3 text-right">{d.advanceAmount}</td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.paymentDate) || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {d.paymentStatus || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {d.biltyCopy ? (
                            <a
                              href={d.biltyCopy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 text-xs text-green-600 hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {d.poCopy ? (
                            <a
                              href={d.poCopy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {d.receiptLiftNumber || d.liftNo || "-"}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {d.receivedQty || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {formatDateDash(d.actual6) || "-"}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {d.invoiceNumber || "-"}
                        </td>
                        <td className="p-3 text-center text-slate-500">
                          {d.extraFreight || "-"}
                        </td>
                        <td className="p-3 text-center">
                          {d.receivedItemImage ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage(d.receivedItemImage)
                              }
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {d.billAttachment ? (
                            <a
                              href={d.billAttachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 cursor-pointer inline-block"
                            >
                              <Paperclip className="w-3.5 h-3.5 mx-auto" />
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          {d.damagedQty || "0"}
                        </td>
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                          title={d.damageReason}
                        >
                          {d.damageReason || "-"}
                        </td>
                        <td className="p-3 text-center">
                          {d.damageImage ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(d.damageImage)}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages} ({currentList.length} items)
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

      {/* ── MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[94vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-blue-600 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-2xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {isBulkMode
                      ? "Bulk Material Receipt"
                      : "Record Material Receipt"}
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {isBulkMode
                      ? `Reconcile quantities for ${bulkItems.length} item${bulkItems.length !== 1 ? "s" : ""}.`
                      : "Reconcile quantity, record image, and report damage if any."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── BULK FORM ── */}
            {isBulkMode ? (
              <form
                onSubmit={handleBulkSubmit}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <ClipboardList className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Items List ({bulkItems.length})
                    </h4>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="p-3 text-left font-bold text-slate-600 dark:text-slate-300">
                            Item Details
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-24">
                            Lift Qty
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-28">
                            Received Qty *
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-24">
                            Difference
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-32">
                            Item Image
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">
                            Damage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bulkItems.map((item, idx) => {
                          const rec = recordMap.get(item.recordId);
                          const liftQty = safeNum(
                            rec?.data?.liftingQty || rec?.data?.poQty,
                          );
                          const recvQty = safeNum(item.receivedQty);
                          const diff = liftQty - recvQty;
                          return (
                            <tr
                              key={item.recordId}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            >
                              <td className="p-3 align-top">
                                <div className="font-bold text-slate-800 dark:text-white">
                                  Ind: {item.indentNumber}
                                </div>
                                <div className="text-slate-500 font-medium">
                                  Lift: {item.liftNumber}
                                </div>
                                <div
                                  className="text-slate-400 truncate max-w-[150px]"
                                  title={item.itemName}
                                >
                                  {item.itemName}
                                </div>
                              </td>
                              <td className="p-3 align-top text-center">
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 font-bold text-slate-700 dark:text-slate-200">
                                  {liftQty || "-"}
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                <input
                                  type="number"
                                  value={item.receivedQty}
                                  onChange={(e) => {
                                    const next = [...bulkItems];
                                    next[idx] = {
                                      ...next[idx],
                                      receivedQty: e.target.value,
                                    };
                                    setBulkItems(next);
                                  }}
                                  required
                                  min="0"
                                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-3 align-top text-center">
                                <div
                                  className={`rounded-lg px-2 py-1.5 font-bold ${diff === 0 ? "bg-emerald-50 text-emerald-700" : diff > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}
                                >
                                  {recvQty ? diff.toFixed(2) : "-"}
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                {!item.receivedItemImage ? (
                                  <label className="flex items-center justify-center h-8 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors px-2 text-slate-500 bg-white dark:bg-slate-800 dark:border-slate-600">
                                    <Upload className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                    <span className="text-[10px] font-semibold">
                                      Upload
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const next = [...bulkItems];
                                        next[idx] = {
                                          ...next[idx],
                                          receivedItemImage:
                                            e.target.files?.[0] || null,
                                        };
                                        setBulkItems(next);
                                      }}
                                    />
                                  </label>
                                ) : (
                                  <div className="flex items-center justify-between gap-1 p-1 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600">
                                    <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[60px]">
                                      {item.receivedItemImage.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...bulkItems];
                                        next[idx] = {
                                          ...next[idx],
                                          receivedItemImage: null,
                                        };
                                        setBulkItems(next);
                                      }}
                                      className="text-slate-400 hover:text-red-600 p-0.5 rounded"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 align-top">
                                <div className="space-y-2 min-w-[240px]">
                                  <select
                                    value={item.damageReceived || "no"}
                                    onChange={(e) => {
                                      const next = [...bulkItems];
                                      next[idx] = {
                                        ...next[idx],
                                        damageReceived: e.target.value,
                                      };
                                      setBulkItems(next);
                                    }}
                                    className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.damageReceived === "yes" ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
                                  >
                                    <option value="no">No Damage</option>
                                    <option value="yes">Damaged</option>
                                  </select>
                                  {item.damageReceived === "yes" && (
                                    <div className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                                            Damaged Qty
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={item.damagedQty}
                                            onChange={(e) => {
                                              const next = [...bulkItems];
                                              next[idx] = {
                                                ...next[idx],
                                                damagedQty: e.target.value,
                                              };
                                              setBulkItems(next);
                                            }}
                                            className="w-full px-2 py-1 text-xs rounded border border-rose-200 bg-white dark:bg-slate-800 dark:border-rose-800 focus:outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                                            Reason
                                          </label>
                                          <input
                                            type="text"
                                            value={item.damageReason}
                                            onChange={(e) => {
                                              const next = [...bulkItems];
                                              next[idx] = {
                                                ...next[idx],
                                                damageReason: e.target.value,
                                              };
                                              setBulkItems(next);
                                            }}
                                            className="w-full px-2 py-1 text-xs rounded border border-rose-200 bg-white dark:bg-slate-800 dark:border-rose-800 focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                                          Damage Photo
                                        </label>
                                        {!item.damageImage ? (
                                          <label className="flex items-center justify-center h-7 border border-dashed border-rose-300 rounded-lg cursor-pointer hover:bg-rose-50 transition-colors px-2 text-rose-600 bg-white dark:bg-slate-800 dark:border-rose-800">
                                            <Upload className="w-3 h-3 mr-1" />
                                            <span className="text-[10px] font-semibold">
                                              Upload
                                            </span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const next = [...bulkItems];
                                                next[idx] = {
                                                  ...next[idx],
                                                  damageImage:
                                                    e.target.files?.[0] || null,
                                                };
                                                setBulkItems(next);
                                              }}
                                            />
                                          </label>
                                        ) : (
                                          <div className="flex items-center justify-between gap-1 p-1 bg-white border border-rose-200 rounded-lg dark:bg-slate-800">
                                            <span className="text-[9px] truncate max-w-[150px] text-rose-900 dark:text-rose-300">
                                              {item.damageImage.name}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = [...bulkItems];
                                                next[idx] = {
                                                  ...next[idx],
                                                  damageImage: null,
                                                };
                                                setBulkItems(next);
                                              }}
                                              className="text-rose-400 hover:text-red-600 p-0.5 rounded"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bulk Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !bulkItems.every((it) => it.receivedQty)
                    }
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record All Receipts</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── SINGLE FORM ── */
              <form
                onSubmit={handleSubmitGrn}
                className="p-6 space-y-5 overflow-y-auto"
              >
                {/* Item header */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Item Name
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {activeRec?.data?.itemName || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Unit Tracking No.
                    </div>
                    <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {activeRec?.data?.liftNo || "-"}
                    </div>
                  </div>
                </div>

                {/* Qty Reconciliation */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        Quantity Reconciliation
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      PO Balance After:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {singlePoBalance.toFixed(0)}
                      </strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        PO Total Ordered
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        {activeRec?.data?.poQty || "-"}
                      </div>
                    </div>
                    <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-2xl bg-blue-50/20 dark:bg-blue-950/20">
                      <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                        Dispatch (Batch)
                      </div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {activeRec?.data?.liftingQty || "-"}
                      </div>
                    </div>
                    <div className="p-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                        Received Qty <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={grnForm.receivedQty}
                        onChange={(e) =>
                          setGrnForm({
                            ...grnForm,
                            receivedQty: e.target.value,
                          })
                        }
                        className="w-full text-xl font-bold text-slate-900 dark:text-white bg-transparent outline-none mt-0.5"
                      />
                    </div>
                    <div className="p-4 border border-emerald-200 dark:border-emerald-800 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/20">
                      <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                        Batch Difference
                      </div>
                      <div
                        className={`text-xl font-bold mt-1 ${singleDiff === 0 ? "text-emerald-700" : "text-amber-600"}`}
                      >
                        {grnForm.receivedQty ? singleDiff.toFixed(2) : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Damage Report */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                      Damage Report
                    </h4>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-36 space-y-1.5 shrink-0">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                        Damage Received?
                      </label>
                      <select
                        value={grnForm.damageReceived}
                        onChange={(e) =>
                          setGrnForm({
                            ...grnForm,
                            damageReceived: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    {grnForm.damageReceived === "yes" && (
                      <>
                        <div className="w-full sm:w-28 space-y-1.5 shrink-0">
                          <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                            Damaged Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={grnForm.damagedQty}
                            onChange={(e) =>
                              setGrnForm({
                                ...grnForm,
                                damagedQty: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                            Damage Reason
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Damaged in transit"
                            value={grnForm.damageReason}
                            onChange={(e) =>
                              setGrnForm({
                                ...grnForm,
                                damageReason: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {grnForm.damageReceived === "yes" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                        Damage Image
                      </label>
                      <label className="border-2 border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/20 hover:bg-rose-50/40 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {grnForm.damageImage
                            ? grnForm.damageImage.name
                            : "Upload damage photo"}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) =>
                            setGrnForm({
                              ...grnForm,
                              damageImage: e.target.files?.[0] || null,
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Image & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Received Item Image
                    </label>
                    <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white dark:bg-slate-900 min-h-[110px]">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {grnForm.receivedItemImage
                          ? grnForm.receivedItemImage.name
                          : "Drop image or click"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG (max 5MB)
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) =>
                          setGrnForm({
                            ...grnForm,
                            receivedItemImage: e.target.files?.[0] || null,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Remarks
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Add any internal receiving notes..."
                      value={grnForm.remarks}
                      onChange={(e) =>
                        setGrnForm({ ...grnForm, remarks: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[110px]"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !grnForm.receivedQty}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record Receipt</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-sm mb-3">Consignment Photo</h4>
            <img
              src={previewImage}
              alt="Consignment"
              className="w-full h-auto rounded-2xl object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row building helper (extracted for readability) ──────────────────────────

function _buildRowsForPO(
  po,
  indent,
  rows,
  liftingsByPo,
  tfByPo,
  tfByLifting,
  receiptsByPo,
  paymentsByPo,
  getIndentNumber,
  getLiftNumber,
) {
  const poLiftings = (liftingsByPo.get(po.id) || []).filter(
    (l) =>
      safeNum(l.lifting_qty || l.quantity) > 0 ||
      l.actual_lifting_date ||
      ["complete", "completed", "in-transit", "intransit", "dispatched", "received"].includes(
        String(l.lifting_status || "").toLowerCase(),
      ),
  );
  const poReceipts = receiptsByPo.get(po.id) || [];
  const transporterFallback = tfByPo.get(po.id);
  const poPayments = paymentsByPo.get(po.id) || [];

  const freightPayment = poPayments.find(
    (p) =>
      String(p.payment_type || "")
        .toLowerCase()
        .includes("freight") || p.paid_by === "Freight",
  );
  const advancePayment = poPayments.find(
    (p) =>
      String(p.payment_type || "")
        .toLowerCase()
        .includes("advance") || p.paid_by === "Advance",
  );

  const totalPOQty = safeNum(
    po.quantity || indent?.quantity || indent?.data?.quantity || 0,
  );
  const totalReceivedSoFar = poReceipts.reduce(
    (sum, r) => sum + safeNum(r.received_quantity),
    0,
  );
  const remainingPOBalance = Math.max(0, totalPOQty - totalReceivedSoFar);

  const getFormattedFreight = (t, l) => {
    const raw =
      freightPayment?.amount ||
      t?.freight_amount ||
      t?.freight_amt ||
      l?.freight_amount ||
      "";
    return fmtCurrency(raw);
  };
  const getFormattedAdv = () =>
    fmtCurrency(advancePayment?.amount || po.advance_amount || "");
  const getFormattedPayDate = () => {
    const d = poPayments[0]?.payment_date || poPayments[0]?.created_at;
    return d ? d : "";
  };
  const getPayStatus = () => {
    if (poPayments.length > 0) return poPayments[0]?.status || "Paid";
    if (advancePayment) return advancePayment.status || "Paid";
    if (freightPayment) return freightPayment.status || "Paid";
    return "-";
  };
  const getPoCopy = () =>
    po.po_copy_url || po.po_pdf_url || po.po_file_url || "";

  // Derive indent number (from PO's normalized indent_number or via getIndentNumber)
  const indentNumber =
    po.indent_number ||
    po.indentNumber ||
    (getIndentNumber ? getIndentNumber(po.indent_id) : null) ||
    indent?.indent_number ||
    indent?.indentNumber ||
    "-";

  const warehouse =
    po.delivery_location ||
    indent?.warehouse_location ||
    indent?.warehouseLocation ||
    indent?.data?.warehouseLocation ||
    "-";

  const itemName =
    po.item_name || indent?.item_name || indent?.data?.itemName || "-";

  const vendorName =
    po.vendor_name ||
    po.selected_vendor_name ||
    indent?.selected_vendor_name ||
    indent?.data?.selectedVendorName ||
    "-";

  if (poLiftings.length === 0) {
    // No liftings yet — gate on transporter received status
    const transporter = transporterFallback;
    const receipt =
      poReceipts.find((r) => safeNum(r.received_quantity) > 0) || null;
    const isTfReceived = isTransporterDone(transporter);
    const status = receipt
      ? "completed"
      : isTfReceived
        ? "pending"
        : "not_ready";

    const compositeId = `${indentNumber}_${po.po_number || po.id}`;
    rows.push({
      id: compositeId,
      status,
      data: {
        indentNumber,
        liftNo: po.po_number || "-",
        warehouse,
        vendorName,
        itemName,
        poNumber: po.po_number || "-",
        poQty: String(totalPOQty),
        liftingQty: String(totalPOQty),
        totalReceivedSoFar: String(totalReceivedSoFar),
        remainingPOBalance: String(remainingPOBalance),
        planned6: "",
        actual6: receipt?.received_date || "",
        nextFollowUpDate: "",
        remarks: "",
        transporterName: transporter?.transporter_name || "-",
        vehicleNo: transporter?.vehicle_number || "-",
        contactNo: "",
        dispatchDate: transporter?.dispatch_date || "",
        freightAmount: getFormattedFreight(transporter, null),
        advanceAmount: getFormattedAdv(),
        paymentDate: getFormattedPayDate(),
        paymentStatus: getPayStatus(),
        biltyCopy:
          transporter?.bilty_copy_url || receipt?.bilty_invoice_image_url || "",
        poCopy: getPoCopy(),
        receivedQty: receipt ? String(receipt.received_quantity || "") : "",
        invoiceNumber: "",
        extraFreight: "",
        receivedItemImage: receipt?.received_item_image_url || "",
        billAttachment: receipt?.invoice_copy_url || "",
        damagedQty: receipt ? String(receipt.rejected_quantity || "0") : "0",
        damageReason: "",
        damageImage: "",
        receiptLiftNumber: "",
        _poId: po.id,
      },
    });
  } else {
    const usedReceiptIds = new Set();
    for (const lifting of poLiftings) {
      const liftTrackingNo = getLiftNumber
        ? getLiftNumber(lifting.id)
        : `LIFT-2026-001`;
      const compositeId = `${indentNumber}_${lifting.id}`;
      const liftQty = safeNum(lifting.quantity || lifting.lifting_qty);
      const transporter = tfByLifting.get(lifting.id) || transporterFallback;

      const receipt =
        poReceipts.find(
          (r) =>
            !usedReceiptIds.has(r.id) &&
            (String(r.grn_number || "").includes(liftTrackingNo) ||
              (liftQty > 0 &&
                Math.abs(safeNum(r.received_quantity) - liftQty) < 0.01)),
        ) || null;
      if (receipt) usedReceiptIds.add(receipt.id);

      const isTfReceived = isTransporterDone(transporter);
      let status = "not_ready";
      if (receipt) status = "completed";
      else if (isTfReceived) status = "pending";

      rows.push({
        id: compositeId,
        status,
        data: {
          indentNumber,
          liftNo: liftTrackingNo,
          warehouse,
          vendorName,
          itemName,
          poNumber: po.po_number || "-",
          poQty: String(totalPOQty),
          liftingQty: String(lifting.lifting_qty || liftQty || totalPOQty),
          totalReceivedSoFar: String(totalReceivedSoFar),
          remainingPOBalance: String(remainingPOBalance),
          planned6: lifting.expected_lifting_date || "",
          actual6: receipt?.received_date || "",
          nextFollowUpDate: lifting.followup_date || "",
          remarks: lifting.remarks || "",
          transporterName: transporter?.transporter_name || "-",
          vehicleNo:
            lifting.vehicle_number || transporter?.vehicle_number || "-",
          contactNo: lifting.driver_contact || "",
          dispatchDate: transporter?.dispatch_date || "",
          freightAmount: getFormattedFreight(transporter, lifting),
          advanceAmount: getFormattedAdv(),
          paymentDate: getFormattedPayDate(),
          paymentStatus: getPayStatus(),
          biltyCopy:
            transporter?.bilty_copy_url ||
            receipt?.bilty_invoice_image_url ||
            "",
          poCopy: getPoCopy(),
          receivedQty: receipt ? String(receipt.received_quantity || "") : "",
          invoiceNumber: "",
          extraFreight: "",
          receivedItemImage: receipt?.received_item_image_url || "",
          billAttachment: receipt?.invoice_copy_url || "",
          damagedQty: receipt ? String(receipt.rejected_quantity || "0") : "0",
          damageReason: "",
          damageImage: "",
          receiptLiftNumber: liftTrackingNo,
          _poId: po.id,
        },
      });
    }
  }
}
