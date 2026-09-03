import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  AlertCircle,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  RefreshCw,
  Image as ImageIcon,
  Paperclip,
  Check,
  Building,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import TatStageBadge from "./TatStageBadge";

import {
  formatDateDash,
  formatDateTime,
  toLocalIsoTimestamp,
} from "../utils/dateUtils";

const safeNum = (v) => parseFloat(String(v || "0").replace(/,/g, "")) || 0;

const fmtCurrency = (raw) => {
  if (!raw || raw === "0" || raw === 0) return "-";
  const n = safeNum(raw);
  return isNaN(n)
    ? String(raw)
    : `₹ ${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
};

export default function TallyBillingView() {
  const { showToast } = useMagicToast();
  const {
    indents,
    purchaseOrders,
    materialReceipts,
    tallyBillings,
    vendorLiftings,
    getTatStatusForIndent,
    openTatModal,
    getIndentNumber,
    getLiftNumber,
    refreshData,
    loading,
  } = usePurchaseWorkflow();

  // Master lists
  const [accountantList, setAccountantList] = useState([
    "Anil Verma (Sr. Accounts)",
    "Pooja Sharma (Accounts Officer)",
    "Ramesh Kumar (Billing Desk)",
    "Chief Accountant",
  ]);

  // UI state
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal & Preview state
  const [modalOpen, setModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [bulkError, setBulkError] = useState(null);

  const [billForm, setBillForm] = useState({
    doneBy: "",
    submissionDate: new Date().toISOString().split("T")[0],
    remarks: "",
    checkedStatus: "",
  });

  // Fetch accountants from users table with fallback
  useEffect(() => {
    const fetchAccountants = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, user_name, role, department, status");

        if (!error && data && data.length > 0) {
          const names = data
            .filter(
              (u) =>
                u.status !== "Inactive" &&
                (u.department?.toLowerCase().includes("account") ||
                  u.role?.toLowerCase().includes("account") ||
                  u.role === "HOD" ||
                  u.role === "admin" ||
                  u.role === "ADMINISTRATOR" ||
                  u.role === "ADMINISTTRATOR"),
            )
            .map((u) => u.user_name)
            .filter(Boolean);

          if (names.length > 0) {
            setAccountantList(Array.from(new Set(names)));
          }
        }
      } catch (err) {
        console.warn("Failed to load accountants from users table:", err);
      }
    };
    fetchAccountants();
  }, []);

  // ─── Row Building ───────────────────────────────────────────────────────────

  const sheetRecords = useMemo(() => {
    const rows = [];

    // Lookup maps
    const posByIndentId = new Map();
    (purchaseOrders || []).forEach((po) => {
      if (!po.indent_id) return;
      const list = posByIndentId.get(po.indent_id) || [];
      list.push(po);
      posByIndentId.set(po.indent_id, list);
    });

    const receiptsByPo = new Map();
    (materialReceipts || []).forEach((r) => {
      if (!r.po_id) return;
      const list = receiptsByPo.get(r.po_id) || [];
      list.push(r);
      receiptsByPo.set(r.po_id, list);
    });

    const liftingsByPo = new Map();
    (vendorLiftings || []).forEach((l) => {
      if (!l.po_id) return;
      const list = liftingsByPo.get(l.po_id) || [];
      list.push(l);
      liftingsByPo.set(l.po_id, list);
    });

    const billingByPo = new Map();
    (tallyBillings || []).forEach((b) => {
      if (b.po_id && !billingByPo.has(b.po_id)) {
        billingByPo.set(b.po_id, b);
      }
    });

    const processedPoIds = new Set();

    const buildRowsForPO = (po, indent) => {
      const poReceipts = receiptsByPo.get(po.id) || [];
      // Stage 11 only applies once items have passed Stage 10 (Material Receipt)
      if (poReceipts.length === 0) return;

      const billing = billingByPo.get(po.id);
      const poLiftings = liftingsByPo.get(po.id) || [];

      const indentNumber =
        po.indent_number ||
        po.indentNumber ||
        (getIndentNumber ? getIndentNumber(po.indent_id) : null) ||
        indent?.indent_number ||
        indent?.indentNumber ||
        "-";

      const createdBy =
        po.created_by || indent?.created_by || indent?.data?.createdBy || "-";
      const category =
        po.category || indent?.category || indent?.data?.category || "-";
      const itemName =
        po.item_name || indent?.item_name || indent?.data?.itemName || "-";
      const warehouse =
        po.delivery_location ||
        indent?.warehouse_location ||
        indent?.warehouseLocation ||
        indent?.data?.warehouseLocation ||
        "-";
      const vendorName =
        po.vendor_name ||
        po.selected_vendor_name ||
        indent?.selected_vendor_name ||
        indent?.data?.selectedVendorName ||
        "-";
      const poNumber = po.po_number || "-";
      const poQty =
        po.quantity || indent?.quantity || indent?.data?.quantity || 0;
      const uom = po.uom || indent?.uom || indent?.data?.uom || "";

      const rawAmount = safeNum(po.total_amount || po.basic_value || 0);
      const basicValue = fmtCurrency(rawAmount);
      const totalWithTax = fmtCurrency(rawAmount);

      const poCopy =
        po.po_copy_url ||
        po.po_pdf_url ||
        po.po_file_url ||
        indent?.data?.poCopy ||
        "";

      poReceipts.forEach((receipt) => {
        const isChecked = billing?.verification_status === "Verified";
        const hasDoneBy = Boolean(
          billing?.accountant_name && billing.accountant_name !== "-",
        );
        const status = isChecked ? "completed" : "pending";

        // Unit Tracking Number: match lifting by GRN or lifting ID prefix
        const matchedLifting =
          poLiftings.find((l) =>
            String(receipt.grn_number || "").includes(
              String(l.id).substring(0, 8),
            ),
          ) || (poLiftings.length > 0 ? poLiftings[0] : null);

        const rawGrn =
          receipt.grn_number && receipt.grn_number !== "-"
            ? String(receipt.grn_number)
            : "-";
        const cleanGrn = rawGrn.includes("_") ? rawGrn.split("_")[0] : rawGrn;

        const unitTrackingNo =
          (matchedLifting?.id
            ? getLiftNumber
              ? getLiftNumber(matchedLifting.id)
              : `LIFT-${String(matchedLifting.id).substring(0, 8).toUpperCase()}`
            : matchedLifting?.lifting_number || null) ||
          (cleanGrn !== "-" ? cleanGrn : poNumber);

        const invoiceNumber =
          billing?.vendor_invoice_number ||
          (indentNumber !== "-" ? `INV-${indentNumber}` : `INV-${poNumber}`);

        const invoiceDate =
          billing?.invoice_date || receipt.received_date || "-";

        const recQtyVal =
          receipt.accepted_quantity !== undefined &&
          receipt.accepted_quantity !== null
            ? receipt.accepted_quantity
            : receipt.received_quantity || "";

        const compositeId = `${indentNumber}-${receipt.id}`;

        rows.push({
          id: compositeId,
          status,
          isVerified: isChecked,
          data: {
            indentNumber,
            createdBy,
            category,
            itemName,
            quantity: `${poQty} ${uom}`.trim(),
            warehouse,
            vendorName,
            poNumber,
            basicValue,
            totalWithTax,
            rawTotalWithTax: rawAmount,
            poCopy,
            unitTrackingNo,
            receivedQty: `${recQtyVal} ${uom}`.trim(),
            invoiceNumber,
            invoiceDate,
            srnNumber: cleanGrn,
            receivedItemImage: receipt.received_item_image_url || "",
            billAttachment:
              billing?.tally_bill_copy_url || receipt?.invoice_copy_url || "",
            plan8: po.delivery_date || "-",
            actual8:
              billing?.tally_entry_date ||
              billing?.created_at?.split("T")[0] ||
              "-",
            doneBy: billing?.accountant_name || "",
            doneDate: billing?.tally_entry_date || billing?.invoice_date || "-",
            billingStatus: isChecked ? "Verified" : "Pending",
            billingRemarks: billing?.remarks || "-",
            checkedStatus: isChecked ? "Yes" : hasDoneBy ? "No" : "",
            checkedByAcc: billing?.accountant_name || "-",
            _poId: po.id,
            _receiptId: receipt.id,
          },
        });
      });
    };

    // 1. Iterate indents
    (indents || []).forEach((indent) => {
      const indentPOs = posByIndentId.get(indent.id) || [];
      indentPOs.forEach((po) => {
        processedPoIds.add(po.id);
        buildRowsForPO(po, indent);
      });
    });

    // 2. Iterate standalone POs
    (purchaseOrders || []).forEach((po) => {
      if (processedPoIds.has(po.id)) return;
      buildRowsForPO(po, null);
    });

    return rows;
  }, [
    indents,
    purchaseOrders,
    materialReceipts,
    tallyBillings,
    vendorLiftings,
    getIndentNumber,
  ]);

  // Record map for fast lookup
  const recordMap = useMemo(
    () => new Map(sheetRecords.map((r) => [r.id, r])),
    [sheetRecords],
  );

  // ─── Filtered Lists ─────────────────────────────────────────────────────────

  const pendingList = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return sheetRecords.filter((r) => {
      if (r.status !== "pending") return false;
      const d = r.data;
      if (warehouseFilter !== "All" && d.warehouse !== warehouseFilter)
        return false;
      if (!lower) return true;
      return (
        String(d.indentNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.itemName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vendorName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.poNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.invoiceNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.srnNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.unitTrackingNo || "")
          .toLowerCase()
          .includes(lower)
      );
    });
  }, [sheetRecords, searchTerm, warehouseFilter]);

  const historyList = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return sheetRecords.filter((r) => {
      if (r.status !== "completed") return false;
      const d = r.data;
      if (warehouseFilter !== "All" && d.warehouse !== warehouseFilter)
        return false;
      if (!lower) return true;
      return (
        String(d.indentNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.itemName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vendorName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.poNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.invoiceNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.srnNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.unitTrackingNo || "")
          .toLowerCase()
          .includes(lower)
      );
    });
  }, [sheetRecords, searchTerm, warehouseFilter]);

  const availableWarehouses = useMemo(() => {
    const list = new Set();
    sheetRecords.forEach((r) => {
      const wh = r.data?.warehouse;
      if (wh && wh !== "-" && wh !== "—") {
        list.add(wh);
      }
    });
    (indents || []).forEach((i) => {
      const loc =
        i.warehouse_location || i.warehouseLocation || i.delivery_location;
      if (loc && loc !== "-" && loc !== "—") list.add(loc);
    });
    (purchaseOrders || []).forEach((p) => {
      const loc = p.delivery_location || p.warehouse_location;
      if (loc && loc !== "-" && loc !== "—") list.add(loc);
    });
    return Array.from(list).sort();
  }, [sheetRecords, indents, purchaseOrders]);

  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage, pageSize]);

  // ─── Selection Helpers ──────────────────────────────────────────────────────

  const toggleSelectRecord = (id) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedRecordIds.length === pendingList.length &&
      pendingList.length > 0
    ) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(pendingList.map((r) => r.id));
    }
  };

  // ─── Modal Open & Bulk Validation ───────────────────────────────────────────

  const handleOpenBillModal = (singleRow = null) => {
    const ids = singleRow ? [singleRow.id] : selectedRecordIds;
    if (ids.length === 0) return;

    setBulkError(null);
    const selectedRecords = ids.map((id) => recordMap.get(id)).filter(Boolean);
    if (selectedRecords.length === 0) return;

    // Validate Invoice Numbers consistency across selected items
    const firstInvoice = selectedRecords[0].data.invoiceNumber;
    const isConsistent = selectedRecords.every(
      (r) => r.data.invoiceNumber === firstInvoice,
    );

    if (!isConsistent && ids.length > 1) {
      setBulkError(
        "Selected items have different Invoice Numbers. Please process matching invoices together.",
      );
    }

    const firstRec = selectedRecords[0];
    const doneByExists = Boolean(
      firstRec.data.doneBy && firstRec.data.doneBy !== "-",
    );

    let status = "";
    if (firstRec.data.checkedStatus && firstRec.data.checkedStatus !== "-") {
      status = firstRec.data.checkedStatus;
    } else if (doneByExists) {
      status = "No";
    }

    setBillForm({
      doneBy: doneByExists
        ? firstRec.data.doneBy
        : accountantList[0] || "Chief Accountant",
      submissionDate: new Date().toISOString().split("T")[0],
      remarks:
        firstRec.data.billingRemarks && firstRec.data.billingRemarks !== "-"
          ? firstRec.data.billingRemarks
          : "",
      checkedStatus: status || "Yes",
    });

    setSelectedRecordIds(ids);
    setModalOpen(true);
  };

  // ─── Submit Billing (Direct Supabase Upsert) ────────────────────────────────

  const handleSubmitBilling = async (e) => {
    if (e) e.preventDefault();
    if (
      selectedRecordIds.length === 0 ||
      !billForm.doneBy ||
      !billForm.checkedStatus
    ) {
      showToast("Please fill all required fields.", "error");
      return;
    }
    if (bulkError) {
      showToast(bulkError, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedRecords = selectedRecordIds
        .map((id) => recordMap.get(id))
        .filter(Boolean);

      for (const rec of selectedRecords) {
        const poId = rec.data._poId;
        if (!poId) {
          console.warn(
            `Skipping billing for ${rec.data.indentNumber}: no PO ID found.`,
          );
          continue;
        }

        const { data: existingBilling, error: lookupErr } = await supabase
          .from("tally_billing")
          .select("id")
          .eq("po_id", poId)
          .limit(1);

        if (lookupErr) {
          throw new Error(
            `Lookup failed for ${rec.data.indentNumber}: ${lookupErr.message}`,
          );
        }

        const validInvoiceDate = toLocalIsoTimestamp(rec.data.invoiceDate);
        const validTallyDate = toLocalIsoTimestamp(billForm.submissionDate);

        const payload = {
          po_id: poId,
          vendor_invoice_number: rec.data.invoiceNumber || "",
          invoice_date: validInvoiceDate,
          invoice_amount: rec.data.rawTotalWithTax || 0,
          accountant_name: billForm.doneBy,
          verification_status:
            billForm.checkedStatus === "Yes" ? "Verified" : "Pending",
          tally_entry_date: validTallyDate,
          created_at: new Date().toISOString(),
        };

        if (existingBilling && existingBilling.length > 0) {
          const { error: updateErr } = await supabase
            .from("tally_billing")
            .update(payload)
            .eq("id", existingBilling[0].id);

          if (updateErr) {
            if (
              updateErr.message?.includes("column") ||
              updateErr.code === "PGRST204"
            ) {
              const fallbackPayload = {
                po_id: poId,
                vendor_invoice_number: rec.data.invoiceNumber || "",
                invoice_date: validInvoiceDate,
                invoice_amount: rec.data.rawTotalWithTax || 0,
                accountant_name: billForm.doneBy,
                verification_status:
                  billForm.checkedStatus === "Yes" ? "Verified" : "Pending",
              };
              const { error: fbErr } = await supabase
                .from("tally_billing")
                .update(fallbackPayload)
                .eq("id", existingBilling[0].id);
              if (fbErr)
                throw new Error(
                  `Update failed for ${rec.data.indentNumber}: ${fbErr.message}`,
                );
            } else {
              throw new Error(
                `Update failed for ${rec.data.indentNumber}: ${updateErr.message}`,
              );
            }
          }
        } else {
          const { error: insertErr } = await supabase
            .from("tally_billing")
            .insert(payload);

          if (insertErr) {
            if (
              insertErr.message?.includes("column") ||
              insertErr.code === "PGRST204"
            ) {
              const fallbackPayload = {
                po_id: poId,
                vendor_invoice_number: rec.data.invoiceNumber || "",
                invoice_date: validInvoiceDate,
                invoice_amount: rec.data.rawTotalWithTax || 0,
                accountant_name: billForm.doneBy,
                verification_status:
                  billForm.checkedStatus === "Yes" ? "Verified" : "Pending",
              };
              const { error: fbErr } = await supabase
                .from("tally_billing")
                .insert(fallbackPayload);
              if (fbErr)
                throw new Error(
                  `Insert failed for ${rec.data.indentNumber}: ${fbErr.message}`,
                );
            } else {
              throw new Error(
                `Insert failed for ${rec.data.indentNumber}: ${insertErr.message}`,
              );
            }
          }
        }
      }

      showToast(
        billForm.checkedStatus === "Yes"
          ? `Billing completed for ${selectedRecords.length} item(s)!`
          : `Billing saved as Pending for ${selectedRecords.length} item(s).`,
        "success",
      );

      setModalOpen(false);
      setSelectedRecordIds([]);
      await refreshData(true);
    } catch (err) {
      console.error("Billing submit error:", err);
      showToast(`Failed to record billing: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 11 : Tally Billing & Commercial Invoice Verification
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Audit supplier tax invoices against GRN receipts, perform
                commercial checks, and record Tally vouchers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk Action Trigger */}
            {activeTab === "pending" && selectedRecordIds.length >= 1 && (
              <button
                type="button"
                onClick={() => handleOpenBillModal()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                Billing ({selectedRecordIds.length})
              </button>
            )}

            {/* Warehouse / Division Filter */}
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">
                All Warehouses{" "}
                {availableWarehouses.length > 0
                  ? `(${availableWarehouses.length})`
                  : ""}
              </option>
              {availableWarehouses.map((wh) => (
                <option key={`wh-opt-${wh}`} value={wh}>
                  {wh}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refreshData(true)}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent, PO, Inv, Item..."
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

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        {/* Dual Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setSelectedRecordIds([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Pending Billing ({pendingList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setSelectedRecordIds([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Billing History ({historyList.length})</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                {activeTab === "pending" && (
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        pendingList.length > 0 &&
                        selectedRecordIds.length === pendingList.length
                      }
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 cursor-pointer rounded"
                    />
                  </th>
                )}
                {activeTab === "pending" && (
                  <th className="p-3 text-center">Action</th>
                )}
                <th className="p-3">Indent No.</th>
                <th className="p-3">Created By</th>
                <th className="p-3">Category</th>
                <th className="p-3">Item</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3">Warehouse</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">PO Number</th>
                <th className="p-3 text-right">Basic Value</th>
                <th className="p-3 text-right">Total w/Tax</th>
                <th className="p-3 text-center">PO Copy</th>
                <th className="p-3">Unit Tracking No.</th>
                <th className="p-3 text-center">Rec. Qty</th>
                <th className="p-3">Invoice No.</th>
                <th className="p-3 text-center">Invoice Date</th>
                <th className="p-3">SRN No.</th>
                <th className="p-3 text-center">Rec. Item Img</th>
                <th className="p-3 text-center">Bill Attach</th>
                <th className="p-3 text-center">Planned Date</th>
                <th className="p-3 text-center">Delay</th>
                {activeTab === "history" && (
                  <>
                    <th className="p-3 text-center">Actual</th>
                    <th className="p-3">Billing Done By</th>
                    <th className="p-3 text-center">Billing Date</th>
                    <th className="p-3 text-center">Billing Status</th>
                    <th className="p-3">Billing Remarks</th>
                    <th className="p-3 text-center">Checked</th>
                    <th className="p-3">Checked By</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={32} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading billing records...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={32} className="p-8 text-center text-slate-400">
                    No{" "}
                    {activeTab === "pending"
                      ? "pending items awaiting Tally billing verification"
                      : "verified billing history"}{" "}
                    found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const d = row.data;
                  const isSelected = selectedRecordIds.includes(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/20"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {activeTab === "pending" && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRecord(row.id)}
                            className="w-3.5 h-3.5 cursor-pointer rounded"
                          />
                        </td>
                      )}

                      {activeTab === "pending" && (
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenBillModal(row)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Process</span>
                          </button>
                        </td>
                      )}

                      {/* Indent No. */}
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {d.indentNumber}
                      </td>

                      {/* Created By */}
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {d.createdBy}
                      </td>

                      {/* Category */}
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {d.category}
                      </td>

                      {/* Item */}
                      <td className="p-3 font-medium text-slate-900 dark:text-white">
                        {d.itemName}
                      </td>

                      {/* Qty */}
                      <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {d.quantity}
                      </td>

                      {/* Warehouse */}
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {d.warehouse}
                      </td>

                      {/* Supplier */}
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {d.vendorName}
                      </td>

                      {/* PO Number */}
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {d.poNumber}
                      </td>

                      {/* Basic Value */}
                      <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {d.basicValue}
                      </td>

                      {/* Total w/Tax */}
                      <td className="p-3 text-right font-black text-blue-600 dark:text-blue-400">
                        {d.totalWithTax}
                      </td>

                      {/* PO Copy Link */}
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

                      {/* Unit Tracking No. */}
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        {d.unitTrackingNo}
                      </td>

                      {/* Rec. Qty */}
                      <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {d.receivedQty}
                      </td>

                      {/* Invoice No. */}
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {d.invoiceNumber}
                      </td>

                      {/* Invoice Date */}
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {formatDateDash(d.invoiceDate)}
                      </td>

                      {/* SRN No. */}
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {d.srnNumber}
                      </td>

                      {/* Rec. Item Img */}
                      <td className="p-3 text-center">
                        {d.receivedItemImage ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(d.receivedItemImage)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 cursor-pointer"
                            title="View Received Item Image"
                          >
                            <ImageIcon className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Bill Attach Link */}
                      <td className="p-3 text-center">
                        {d.billAttachment ? (
                          <a
                            href={d.billAttachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 cursor-pointer inline-block"
                            title="View Bill Attachment"
                          >
                            <Paperclip className="w-3.5 h-3.5 mx-auto" />
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Planned Date */}
                      <td className="p-3 text-center font-mono text-slate-500">
                        {formatDateDash(d.plan8)}
                      </td>

                      {/* Delay */}
                      <td
                        className="p-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TatStageBadge
                          tatStatus={getTatStatusForIndent(
                            d.indent_id || d.indentNumber || row.id,
                            "Tally Billing",
                          )}
                          indentId={d.indent_id || row.id}
                          isCompleted={activeTab === "history"}
                        />
                      </td>

                      {/* History Columns */}
                      {activeTab === "history" && (
                        <>
                          <td className="p-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatDateTime(
                              d.actual8 || d.doneDate || d.created_at,
                            )}
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-200">
                            {d.doneBy}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-500">
                            {formatDateDash(d.doneDate)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {d.billingStatus}
                            </span>
                          </td>
                          <td
                            className="p-3 text-slate-600 dark:text-slate-300 max-w-xs truncate"
                            title={d.billingRemarks}
                          >
                            {d.billingRemarks}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              {d.checkedStatus}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {d.checkedByAcc}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* ── Billing Process / Bulk Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Billing Verification
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Update billing for {selectedRecordIds.length} selected
                    item(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSubmitBilling}
              className="p-6 space-y-4 text-xs"
            >
              {bulkError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border border-rose-100">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Accountant (Done By) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Accountant (Done By) *
                </label>
                <select
                  required
                  value={billForm.doneBy}
                  onChange={(e) =>
                    setBillForm({ ...billForm, doneBy: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Accountant</option>
                  {accountantList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  {!accountantList.includes("Chief Accountant") && (
                    <option value="Chief Accountant">Chief Accountant</option>
                  )}
                </select>
              </div>

              {/* Billing Entry Date */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Billing Entry Date
                </label>
                <input
                  type="date"
                  required
                  value={billForm.submissionDate}
                  onChange={(e) =>
                    setBillForm({ ...billForm, submissionDate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Remarks
                </label>
                <input
                  type="text"
                  placeholder="Enter billing remarks..."
                  value={billForm.remarks}
                  onChange={(e) =>
                    setBillForm({ ...billForm, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Checked Status */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Checked by Accountant? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBillForm({ ...billForm, checkedStatus: "Yes" })
                    }
                    className={`h-10 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      billForm.checkedStatus === "Yes"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Yes, Verified
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBillForm({ ...billForm, checkedStatus: "No" })
                    }
                    className={`h-10 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      billForm.checkedStatus === "No"
                        ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    No, Pending
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !billForm.doneBy ||
                    !billForm.checkedStatus ||
                    Boolean(bulkError)
                  }
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Complete Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
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
              alt="Received Material"
              className="w-full h-auto rounded-2xl object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
