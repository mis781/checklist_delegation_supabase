import React, { useState, useEffect, useMemo } from "react";
import {
  UserCog,
  Search,
  Send,
  UserPlus,
  X,
  ClipboardList,
  History,
  FileText,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { fetchMasterApprovers, fetchMasterWarehouses } from "../services/purchaseMasterApi";
import TatStageBadge from "./TatStageBadge";
import { formatDateTime } from "../utils/dateUtils";

export default function DelegateApprovalView() {
  const { showToast } = useMagicToast();
  const { indents, delegations, delegateIndent, refreshData, getTatStatusForIndent } = usePurchaseWorkflow();

  // Data states
  const [approverOptions, setApproverOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
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

  // Filter & Search states
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");

  // Selection states
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState("");

  // Assignment Modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogRecords, setDialogRecords] = useState([]);
  const [dialogApprover, setDialogApprover] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadData = async () => {
    setLoading(true);
    try {
      if (refreshData) await refreshData();

      const [apps, whs] = await Promise.all([
        fetchMasterApprovers(),
        fetchMasterWarehouses(),
      ]);

      setApproverOptions(apps || []);
      setWarehouseOptions(whs || []);
    } catch (err) {
      console.error("Error loading delegate approval data:", err);
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
      .filter((r) => divisionFilter === "all" || r.warehouse_location === divisionFilter)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indent_number && r.indent_number.toLowerCase().includes(s)) ||
          (r.item_name && r.item_name.toLowerCase().includes(s)) ||
          (r.created_by && r.created_by.toLowerCase().includes(s))
        );
      })
      .filter((r) => (delegationsByIndent[r.id] || []).length === 0);
  }, [indents, searchTerm, divisionFilter, delegationsByIndent]);

  const historyList = useMemo(() => {
    return indents
      .filter((r) => divisionFilter === "all" || r.warehouse_location === divisionFilter)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indent_number && r.indent_number.toLowerCase().includes(s)) ||
          (r.item_name && r.item_name.toLowerCase().includes(s)) ||
          (r.created_by && r.created_by.toLowerCase().includes(s))
        );
      })
      .filter((r) => (delegationsByIndent[r.id] || []).length > 0);
  }, [indents, searchTerm, divisionFilter, delegationsByIndent]);

  // Current Paginated Data
  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  // Checkbox Selection
  const toggleRecord = (id) => {
    setSelectedRecords((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selectedRecords.length === pendingList.length) setSelectedRecords([]);
    else setSelectedRecords(pendingList.map((r) => r.id));
  };

  // Open Delegate Dialog
  const openSingleDelegate = (rec) => {
    setDialogRecords([rec]);
    const existing = delegationsByIndent[rec.id] || [];
    setDialogApprover(
      (typeof existing[0] === "string" ? existing[0] : existing[0]?.name || existing[0]?.approver_name) ||
        selectedApprover ||
        ""
    );
    setDialogOpen(true);
  };

  const openBulkDelegate = () => {
    if (selectedRecords.length === 0) {
      if (showToast) showToast("Please select at least one indent", "warning");
      return;
    }
    const selected = indents.filter((r) => selectedRecords.includes(r.id));
    setDialogRecords(selected);
    setDialogApprover(selectedApprover || "");
    setDialogOpen(true);
  };

  // Save Delegation
  const handleSaveDelegation = async () => {
    if (dialogRecords.length === 0 || !dialogApprover) {
      if (showToast) showToast("Please select an approver", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetIds = dialogRecords.map((r) => r.id);
      await delegateIndent(targetIds, dialogApprover);

      if (showToast)
        showToast(
          `Successfully assigned ${dialogRecords.length} indent(s) to ${dialogApprover}!`,
          "success"
        );

      setDialogOpen(false);
      setDialogRecords([]);
      setDialogApprover("");
      setSelectedRecords([]);
    } catch (err) {
      console.error("Delegation error:", err);
      if (showToast) showToast(`Delegation failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 2 : Delegate for Approval
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Assign pending purchase indents to one or more approvers before technical and commercial approval.
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

      {/* 2. Main Content Card with Dual Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          {/* Dual Tabs */}
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
              <span>Delegated History ({historyList.length})</span>
            </button>
          </div>

          {/* Bulk Delegate Controls (Visible only on Pending Tab) */}
          {activeTab === "pending" && (
            <div className="flex items-center gap-2.5">
              <select
                value={selectedApprover}
                onChange={(e) => setSelectedApprover(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
              >
                <option value="">Select approver...</option>
                {approverOptions.map((app) => {
                  const name = typeof app === "string" ? app : app.name || app.username || app.approver_name;
                  const phone = typeof app === "object" ? (app.phone || app.contact || app.mobile) : null;
                  const label = phone ? `${name} (📞 ${phone})` : name;
                  return (
                    <option key={name} value={name}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={openBulkDelegate}
                disabled={selectedRecords.length === 0 || isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Delegate Selected ({selectedRecords.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                {activeTab === "pending" && (
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={pendingList.length > 0 && selectedRecords.length === pendingList.length}
                      onChange={toggleAll}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </th>
                )}
                {activeTab === "pending" && <th className="p-3 text-center">Action</th>}
                <th className="p-3">Indent #</th>
                <th className="p-3">Created By</th>
                <th className="p-3">Category</th>
                <th className="p-3">Material Name</th>
                <th className="p-3 text-center">Quantity</th>
                <th className="p-3 text-center">UOM</th>
                <th className="p-3">Division</th>
                <th className="p-3 text-center">Attachment</th>
                <th className="p-3">Delegated To</th>
                <th className="p-3 text-center font-mono">Planned Date</th>
                <th className="p-3 text-center">Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === "pending" ? 13 : 11} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading indents...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "pending" ? 13 : 11} className="p-8 text-center text-slate-400">
                    No {activeTab === "pending" ? "pending indents to delegate" : "delegated indents found"}.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const isSelected = selectedRecords.includes(row.id);
                  const delegations = delegationsByIndent[row.id] || [];

                  return (
                    <tr
                      key={row.id}
                      onClick={() => activeTab === "pending" && toggleRecord(row.id)}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {activeTab === "pending" && (
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecord(row.id)}
                            className="rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                      )}

                      {activeTab === "pending" && (
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openSingleDelegate(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Delegate</span>
                          </button>
                        </td>
                      )}

                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.indent_number}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold">
                        {row.created_by || "—"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {row.category || "—"}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {row.item_name}
                      </td>
                      <td className="p-3 text-center font-black">
                        {row.quantity}
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-500">
                        {row.uom || "NOS"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {row.warehouse_location || "—"}
                      </td>
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
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {delegations.length === 0 ? (
                          <span className="text-slate-400 text-xs">Not delegated</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {delegations.map((d, idx) => {
                              const displayName =
                                typeof d === "string"
                                  ? d
                                  : d.approver_name || d.name || d.approver_username || "Approver";
                              const matchedApp = (approverOptions || []).find(
                                (a) => (a.name || a.username || a.approver_name) === displayName
                              );
                              const phone = matchedApp?.phone || matchedApp?.contact || matchedApp?.mobile;
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                                >
                                  <span>{displayName}</span>
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
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {formatDateTime(row.planned_date)}
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <TatStageBadge
                          tatStatus={getTatStatusForIndent(row.id, "Delegate Approval")}
                          indentId={row.id}
                          isCompleted={activeTab === "history"}
                        />
                      </td>
                    </tr>
                  );
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

      {/* 5. Delegation Dialog Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Delegate Requisition
                </h3>
                <p className="text-xs text-slate-500">
                  Assigning {dialogRecords.length} indent(s) to an approver
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                {dialogRecords.map((r) => (
                  <div key={r.id} className="flex justify-between items-center py-1">
                    <span className="font-mono font-bold text-blue-600">{r.indent_number}</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[180px]">
                      {r.item_name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Select Approver <span className="text-red-500">*</span>
                </label>
                <select
                  value={dialogApprover}
                  onChange={(e) => setDialogApprover(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose an approver...</option>
                  {approverOptions.map((app) => {
                    const name = typeof app === "string" ? app : app.name || app.username || app.approver_name;
                    const phone = typeof app === "object" ? (app.phone || app.contact || app.mobile) : null;
                    const label = phone ? `${name} (📞 ${phone})` : name;
                    return (
                      <option key={name} value={name}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDelegation}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm Delegation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
