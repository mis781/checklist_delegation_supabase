import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Search,
  Send,
  UserCheck,
  ClipboardList,
  History,
  FileText,
  Loader2,
  ExternalLink,
  X,
  Filter,
  Layers,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { fetchMasterApprovers, fetchMasterWarehouses } from "../services/purchaseMasterApi";
import { formatDateDash, formatDateTime, toLocalIsoTimestamp } from "../utils/dateUtils";

const formatDateDisplay = (dateVal) => formatDateTime(dateVal);

export default function IndentApprovalView() {
  const { showToast } = useMagicToast();
  const { indents, delegations, approvals, approveIndent, rejectIndent, refreshData } = usePurchaseWorkflow();

  // Data states
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [masterApprovers, setMasterApprovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group delegations by indent id
  const delegationsByIndent = useMemo(() => {
    const map = {};
    (delegations || []).forEach((d) => {
      const id = d.indent_id;
      if (!map[id]) map[id] = [];
      map[id].push(d.approver_name || d.approver_username);
    });
    return map;
  }, [delegations]);

  // Map approver names to contact numbers
  const approverContactMap = useMemo(() => {
    const map = new Map();
    (masterApprovers || []).forEach((a) => {
      const contact = a.phone || a.contact || a.mobile || "";
      if (contact) {
        if (a.name) map.set(a.name.toLowerCase().trim(), contact);
        if (a.username) map.set(a.username.toLowerCase().trim(), contact);
        if (a.approver_name) map.set(a.approver_name.toLowerCase().trim(), contact);
      }
    });
    return map;
  }, [masterApprovers]);

  // Group approvals by indent id
  const approvalsByIndent = useMemo(() => {
    const map = {};
    (approvals || []).forEach((a) => {
      const id = a.indent_id;
      if (id) {
        const existing = map[id];
        if (!existing || new Date(a.approved_at || a.created_at || 0) > new Date(existing.approved_at || existing.created_at || 0)) {
          map[id] = a;
        }
      }
    });
    return map;
  }, [approvals]);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [approverFilter, setApproverFilter] = useState("all");

  // Selection states
  const [selectedRecords, setSelectedRecords] = useState([]);

  // Bulk Approval Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lineItemsData, setLineItemsData] = useState({});
  const [approvalRemarks, setApprovalRemarks] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadData = async () => {
    setLoading(true);
    try {
      if (refreshData) await refreshData();
      const [whs, apps] = await Promise.all([
        fetchMasterWarehouses(),
        fetchMasterApprovers(),
      ]);
      setWarehouseOptions(whs || []);
      setMasterApprovers(apps || []);
    } catch (err) {
      console.error("Error loading approval data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Lists
  const pendingList = useMemo(() => {
    return indents
      .filter((r) => {
        const status = String(r.status || "").toLowerCase();
        return (
          status !== "approved" &&
          status !== "rejected" &&
          status !== "po issued" &&
          status !== "completed" &&
          status !== "cancelled" &&
          status !== "stage cancelled"
        );
      })
      .filter((r) => divisionFilter === "all" || r.warehouse_location === divisionFilter)
      .filter((r) => {
        if (approverFilter === "all") return true;
        const dels = delegationsByIndent[r.id] || [];
        return dels.includes(approverFilter);
      })
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indent_number && r.indent_number.toLowerCase().includes(s)) ||
          (r.item_name && r.item_name.toLowerCase().includes(s)) ||
          (r.created_by && r.created_by.toLowerCase().includes(s))
        );
      });
  }, [indents, searchTerm, divisionFilter, approverFilter, delegationsByIndent]);

  const historyList = useMemo(() => {
    return indents
      .filter((r) => {
        const status = String(r.status || "").toLowerCase();
        return status === "approved" || status === "rejected" || status === "po issued" || status === "completed";
      })
      .filter((r) => divisionFilter === "all" || r.warehouse_location === divisionFilter)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indent_number && r.indent_number.toLowerCase().includes(s)) ||
          (r.item_name && r.item_name.toLowerCase().includes(s)) ||
          (r.created_by && r.created_by.toLowerCase().includes(s))
        );
      });
  }, [indents, searchTerm, divisionFilter]);

  // Distinct Approver names for sub-tabs
  const approverTabs = useMemo(() => {
    const names = new Set();
    pendingList.forEach((r) => {
      (delegationsByIndent[r.id] || []).forEach((n) => names.add(n));
    });
    return Array.from(names).sort();
  }, [pendingList, delegationsByIndent]);

  // Current Paginated Data
  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  // Selection
  const toggleRecord = (id) => {
    setSelectedRecords((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selectedRecords.length === pendingList.length) setSelectedRecords([]);
    else setSelectedRecords(pendingList.map((r) => r.id));
  };

  // Open Bulk Approval Modal
  const openApprovalModal = () => {
    if (selectedRecords.length === 0) {
      if (showToast) showToast("Please select at least one indent to approve", "warning");
      return;
    }

    const initial = {};
    selectedRecords.forEach((id) => {
      const item = indents.find((r) => r.id === id);
      initial[id] = {
        approvedQty: String(item?.quantity || 1),
        status: "approved",
        vendorType: "regular",
      };
    });
    setLineItemsData(initial);
    setApprovalRemarks("");
    setIsModalOpen(true);
  };

  const updateLineItem = (id, field, value) => {
    setLineItemsData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  // Submit Approval Decisions
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const recordsToProcess = selectedRecords
      .map((id) => indents.find((r) => r.id === id))
      .filter(Boolean);

    if (recordsToProcess.length === 0) return;

    setIsSubmitting(true);
    try {
      for (const record of recordsToProcess) {
        const itemLine = lineItemsData[record.id] || {
          approvedQty: record.quantity,
          status: "approved",
          vendorType: "regular",
        };

        const isApprove = itemLine.status === "approved";
        const finalApprovedQty = isApprove ? Number(itemLine.approvedQty || record.quantity) : 0;

        const loggedInUser = localStorage.getItem("user-name") || localStorage.getItem("username") || "";
        const delegatedApprovers = delegationsByIndent[record.id] || [];
        const approverName =
          (approverFilter && approverFilter !== "all" ? approverFilter : "") ||
          loggedInUser ||
          delegatedApprovers[0] ||
          record.approver_name ||
          record.approver_username ||
          "Approver";

        await approveIndent(record.id, {
          approverUsername: approverName,
          approver_username: approverName,
          approver_name: approverName,
          approvedQty: finalApprovedQty,
          vendorType: itemLine.vendorType,
          remarks: approvalRemarks,
          isApproved: isApprove,
        });
      }

      if (showToast)
        showToast(`Successfully processed ${recordsToProcess.length} indent approval(s)!`, "success");

      setIsModalOpen(false);
      setSelectedRecords([]);
      setLineItemsData({});
    } catch (err) {
      console.error("Error processing approvals:", err);
      if (showToast) showToast(`Approval failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItems = useMemo(() => {
    return indents.filter((r) => selectedRecords.includes(r.id));
  }, [indents, selectedRecords]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 3 : Indent Approval
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Review material requirements, verify stock feasibility, adjust approved quantities, and sanction requisitions.
              </p>
            </div>
          </div>

          {/* Search & Division Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent #, item, created by..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-44 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Divisions</option>
              {warehouseOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        {/* Top Controls: Dual Tabs + Bulk Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setSelectedRecords([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Pending ({pendingList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setSelectedRecords([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Completed ({historyList.length})</span>
            </button>
          </div>

          {/* Submit Approval Action Button */}
          {activeTab === "pending" && selectedRecords.length > 0 && (
            <button
              type="button"
              onClick={openApprovalModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Approval ({selectedRecords.length})</span>
            </button>
          )}
        </div>

        {/* Approver Sub-Tabs (Chips) */}
        {activeTab === "pending" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
              Delegated To:
            </span>
            <button
              type="button"
              onClick={() => {
                setApproverFilter("all");
                setCurrentPage(1);
              }}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                approverFilter === "all"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              All ({pendingList.length})
            </button>
            {approverTabs.map((name) => {
              const count = pendingList.filter((r) => (delegationsByIndent[r.id] || []).includes(name)).length;
              const phone = approverContactMap.get(String(name).toLowerCase().trim());
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setApproverFilter(name);
                    setCurrentPage(1);
                  }}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                    approverFilter === name
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span>{name}</span>
                  {phone && (
                    <span className={`text-[10px] font-semibold ${approverFilter === name ? "text-blue-100" : "text-blue-600 dark:text-blue-400"}`}>
                      (📞 {phone})
                    </span>
                  )}
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    approverFilter === name ? "bg-blue-800/60 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Approval Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              {activeTab === "pending" ? (
                /* Pending Tab: 11 Requested Columns + Checkbox */
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={pendingList.length > 0 && selectedRecords.length === pendingList.length}
                      onChange={toggleAll}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Indent</th>
                  <th className="p-3">Created By</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Indent Qty</th>
                  <th className="p-3">Warehouse</th>
                  <th className="p-3">Item Code</th>
                  <th className="p-3 text-center">Attachment</th>
                  <th className="p-3 text-center">Expected Date of Raw Material Delivery</th>
                  <th className="p-3">Delegated To</th>
                  <th className="p-3 text-center font-mono">Planned Date</th>
                </tr>
              ) : (
                /* History Tab: Exact 14 Requested Columns */
                <tr>
                  <th className="p-3">Indent</th>
                  <th className="p-3">Created By</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Indent Qty</th>
                  <th className="p-3">Warehouse</th>
                  <th className="p-3">Item Code</th>
                  <th className="p-3 text-center">Attachment</th>
                  <th className="p-3 text-center">Expected Date of Raw Material Delivery</th>
                  <th className="p-3">Delegated To</th>
                  <th className="p-3 text-center font-mono">Planned Date</th>
                  <th className="p-3 text-center font-mono">Actual</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Remarks</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === "pending" ? 12 : 14} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading indents...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "pending" ? 12 : 14} className="p-8 text-center text-slate-400">
                    No {activeTab === "pending" ? "pending indents for approval" : "completed approval records found"}.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const isSelected = selectedRecords.includes(row.id);
                  const delegations = delegationsByIndent[row.id] || [];

                  if (activeTab === "pending") {
                    return (
                      <tr
                        key={row.id}
                        onClick={() => toggleRecord(row.id)}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {/* 0. Select Checkbox */}
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecord(row.id)}
                            className="rounded text-blue-600 cursor-pointer"
                          />
                        </td>

                        {/* 1. Indent */}
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.indent_number}
                        </td>

                        {/* 2. Created By */}
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">
                          {row.created_by || "—"}
                        </td>

                        {/* 3. Category */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {row.category || "—"}
                          </span>
                        </td>

                        {/* 4. Item */}
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {row.item_name}
                        </td>

                        {/* 5. Indent Qty */}
                        <td className="p-3 text-center font-black text-slate-800 dark:text-slate-200">
                          {row.quantity} {row.uom || "NOS"}
                        </td>

                        {/* 6. Warehouse */}
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {row.warehouse_location || "—"}
                        </td>

                        {/* 8. Item Code */}
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {row.item_code || row.itemCode || "—"}
                        </td>

                        {/* 9. Attachment */}
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {row.attachment_url ? (
                            <a
                              href={row.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* 10. Expected Date of Raw Material Delivery */}
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateDisplay(
                            row.required_date || row.lead_time || row.expected_delivery_date || row.expectedDate
                          )}
                        </td>

                        {/* 11. Delegated To */}
                        <td className="p-3">
                          {delegations.length === 0 ? (
                            <span className="text-slate-400 text-xs">Unassigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {delegations.map((delName, dIdx) => {
                                const phone = approverContactMap.get(String(delName).toLowerCase().trim());
                                return (
                                  <span
                                    key={dIdx}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200"
                                  >
                                    <span>{delName}</span>
                                    {phone && (
                                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                                        (📞 {phone})
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* 12. Planned Date */}
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateDisplay(
                            row.planned_date || row.required_date || row.lead_time || row.created_at
                          )}
                        </td>
                      </tr>
                    );
                  } else {
                    /* History Tab Row (Exact 15 Columns) */
                    const isStageCancelled =
                      String(row.status || "").toLowerCase() === "stage cancelled" ||
                      String(row.status || "").toLowerCase() === "cancelled";

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isStageCancelled
                            ? "bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-rose-500"
                            : ""
                        }`}
                      >
                        {/* 1. Indent */}
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.indent_number}
                        </td>

                        {/* 2. Created By */}
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">
                          {row.created_by || "—"}
                        </td>

                        {/* 3. Category */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {row.category || "—"}
                          </span>
                        </td>

                        {/* 4. Item */}
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {row.item_name}
                        </td>

                        {/* 5. Indent Qty */}
                        <td className="p-3 text-center font-black text-slate-800 dark:text-slate-200">
                          {row.quantity} {row.uom || "NOS"}
                        </td>

                        {/* 6. Warehouse */}
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {row.warehouse_location || "—"}
                        </td>

                        {/* 8. Item Code */}
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {row.item_code || row.itemCode || "—"}
                        </td>

                        {/* 9. Attachment */}
                        <td className="p-3 text-center">
                          {row.attachment_url ? (
                            <a
                              href={row.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* 10. Expected Date of Raw Material Delivery */}
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateDash(
                            row.required_date || row.lead_time || row.expected_delivery_date || row.expectedDate
                          )}
                        </td>

                        {/* 11. Delegated To */}
                        <td className="p-3">
                          {delegations.length === 0 ? (
                            <span className="text-slate-400 text-xs">Unassigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {delegations.map((delName, dIdx) => {
                                const phone = approverContactMap.get(String(delName).toLowerCase().trim());
                                return (
                                  <span
                                    key={dIdx}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200"
                                  >
                                    <span>{delName}</span>
                                    {phone && (
                                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                                        (📞 {phone})
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* 12. Planned Date */}
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateDisplay(
                            row.planned_date || row.required_date || row.lead_time || row.created_at
                          )}
                        </td>

                        {/* 13. Actual */}
                        <td className="p-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDateTime(
                            approvalsByIndent[row.id]?.approved_at ||
                            approvalsByIndent[row.id]?.created_at ||
                            row.approved_at ||
                            row.actual_date ||
                            row.updated_at
                          )}
                        </td>

                        {/* 14. Status */}
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isStageCancelled
                                ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/60 dark:text-rose-200"
                                : String(row.status).toLowerCase() === "approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : String(row.status).toLowerCase() === "rejected"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isStageCancelled ? "Stage Cancel" : (row.status || "Approved")}
                          </span>
                        </td>

                        {/* 15. Remarks */}
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 italic text-xs max-w-[200px] truncate"
                          title={row.approval_remarks || row.remarks || "—"}
                        >
                          {row.approval_remarks || row.remarks || "—"}
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Controls */}
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

      {/* 5. Bulk Review & Approval Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Bulk Indent Approval Review
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and sanction {selectedItems.length} selected requisition(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-6 overflow-y-auto text-xs">
              {/* Selected Items Review Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Line Item Approvals
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedItems.length} items to update
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Indent #</th>
                        <th className="p-3">Material Name</th>
                        <th className="p-3 text-center">Req. Qty</th>
                        <th className="p-3 text-center w-28">Approve Qty</th>
                        <th className="p-3 text-center w-40">Decision</th>
                        <th className="p-3 text-center w-36">Vendor Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedItems.map((item) => {
                        const line = lineItemsData[item.id] || {
                          approvedQty: String(item.quantity),
                          status: "approved",
                          vendorType: "regular",
                        };

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-blue-600">{item.indent_number}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{item.item_name}</td>
                            <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                              {item.quantity} {item.uom}
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={line.approvedQty}
                                onChange={(e) => updateLineItem(item.id, "approvedQty", e.target.value)}
                                className="w-20 px-2 py-1 text-center font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => updateLineItem(item.id, "status", "approved")}
                                  className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                                    line.status === "approved"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-emerald-600"
                                  }`}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateLineItem(item.id, "status", "rejected")}
                                  className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                                    line.status === "rejected"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-rose-600"
                                  }`}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={line.vendorType}
                                onChange={(e) => updateLineItem(item.id, "vendorType", e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-xs"
                              >
                                <option value="regular">Regular Vendor</option>
                                <option value="new vendor">New Vendor</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Approval / Rejection Audit Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter notes or justifications for approval..."
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-semibold cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
