// src/systems/inventory/components/TransferApprovalView.jsx
import { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  ListFilter,
  CheckCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  approveTransfer,
  rejectTransfer,
  approveMultipleTransfers,
  rejectMultipleTransfers,
  fetchTransfers,
} from "../../../redux/slice/transferSlice";
import { useMagicToast } from "../../../context/MagicToastContext";
import { getUserAllowedDivisions, isDivisionAllowed } from "../../../utils/roleUtils";
import { usePagePermission, READ_ONLY_TOOLTIP } from "../../../utils/pagePermissionUtils";
import ReadOnlyBanner from "../../../components/ReadOnlyBanner";

export default function TransferApprovalView({ activeUser }) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();
  const { isReadOnly, canWrite } = usePagePermission("inventory_transfer_approval");

  const { materials = [], divisions = [] } = useSelector((state) => state.inventory);
  const { transfers = [] } = useSelector(
    (state) => state.transfers || { transfers: [] }
  );

  const [tableTab, setTableTab] = useState("pending"); // 'pending' or 'history'
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFromDiv, setFilterFromDiv] = useState("all");
  const [filterToDiv, setFilterToDiv] = useState("all");

  // Multi-selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(null); // 'approve' | 'reject' | null
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Logged-in user name
  const currentUserName =
    activeUser?.name || localStorage.getItem("user-name") || "Guest Operator";

  const allowedDivisions = useMemo(() => {
    return getUserAllowedDivisions(activeUser);
  }, [activeUser]);

  // Standardize Division Names
  const normalizedDivisions = useMemo(() => {
    const defaultList = [
      "Nutech Composites",
      "NuTech Pipes",
      "Protech Max",
    ];
    let list = (!divisions || divisions.length === 0)
      ? defaultList
      : divisions.map((d) => (typeof d === "string" ? d : d.name)).filter(Boolean);

    if (allowedDivisions && allowedDivisions.length > 0) {
      list = list.filter((div) => isDivisionAllowed(div, allowedDivisions));
    }
    return list;
  }, [divisions, allowedDivisions]);

  // Filter transfers for Approval Table
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Tab filter
      if (tableTab === "pending" && t.status !== "Pending") return false;
      if (tableTab === "history" && t.status === "Pending") return false;

      // User allowed division restriction
      if (allowedDivisions && allowedDivisions.length > 0) {
        const fromAllowed = isDivisionAllowed(t.fromDivision, allowedDivisions);
        const toAllowed = isDivisionAllowed(t.toDivision, allowedDivisions);
        if (!fromAllowed && !toAllowed) return false;
      }

      // Division filters
      if (filterFromDiv !== "all" && t.fromDivision !== filterFromDiv)
        return false;
      if (filterToDiv !== "all" && t.toDivision !== filterToDiv) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = (t.id || "").toLowerCase().includes(q);
        const matchSku = (t.skuCode || "").toLowerCase().includes(q);
        const matchNewSku = (t.newSkuCode || "").toLowerCase().includes(q);
        const matchName = (t.skuName || "").toLowerCase().includes(q);
        const matchOperator = (t.operatorName || "").toLowerCase().includes(q);
        const matchFromDiv = (t.fromDivision || "").toLowerCase().includes(q);
        const matchToDiv = (t.toDivision || "").toLowerCase().includes(q);

        if (
          !matchId &&
          !matchSku &&
          !matchNewSku &&
          !matchName &&
          !matchOperator &&
          !matchFromDiv &&
          !matchToDiv
        ) {
          return false;
        }
      }

      return true;
    });
  }, [transfers, tableTab, filterFromDiv, filterToDiv, searchTerm, allowedDivisions]);

  // Multi-selection helpers
  const allVisibleSelected = useMemo(() => {
    if (filteredTransfers.length === 0) return false;
    return filteredTransfers.every((t) => selectedIds.includes(t.id));
  }, [filteredTransfers, selectedIds]);

  const someVisibleSelected = useMemo(() => {
    return (
      filteredTransfers.some((t) => selectedIds.includes(t.id)) &&
      !allVisibleSelected
    );
  }, [filteredTransfers, selectedIds, allVisibleSelected]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIdSet = new Set(filteredTransfers.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
    } else {
      const visibleIds = filteredTransfers.map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleTabChange = (newTab) => {
    setTableTab(newTab);
    setSelectedIds([]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await dispatch(fetchTransfers());
    setIsRefreshing(false);
  };

  // Single Action Handlers
  const handleApprove = async (id) => {
    if (!canWrite) return;
    const res = await dispatch(approveTransfer({ id, approverName: currentUserName }));
    if (approveTransfer.fulfilled.match(res)) {
      showToast(`Transfer request ${id} approved!`, "success");
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    } else {
      showToast(res.payload || `Failed to approve transfer request ${id}`, "error");
    }
  };

  const handleReject = async (id) => {
    if (!canWrite) return;
    const res = await dispatch(rejectTransfer({ id, approverName: currentUserName }));
    if (rejectTransfer.fulfilled.match(res)) {
      showToast(`Transfer request ${id} rejected.`, "info");
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    } else {
      showToast(res.payload || `Failed to reject transfer request ${id}`, "error");
    }
  };

  // Bulk Action Handlers
  const handleBulkApprove = async () => {
    if (!canWrite || selectedIds.length === 0 || isProcessingBulk) return;
    const count = selectedIds.length;
    setIsProcessingBulk("approve");

    try {
      const res = await dispatch(
        approveMultipleTransfers({
          ids: selectedIds,
          approverName: currentUserName,
        })
      );

      if (approveMultipleTransfers.fulfilled.match(res)) {
        showToast(
          `Successfully approved ${count} transfer request${count > 1 ? "s" : ""}!`,
          "success"
        );
        setSelectedIds([]);
      } else {
        showToast(
          res.payload || "Failed to approve selected transfers",
          "error"
        );
      }
    } catch (err) {
      showToast(err.message || "Error processing multiple approvals", "error");
    } finally {
      setIsProcessingBulk(null);
    }
  };

  const handleBulkReject = async () => {
    if (!canWrite || selectedIds.length === 0 || isProcessingBulk) return;
    const count = selectedIds.length;
    setIsProcessingBulk("reject");

    try {
      const res = await dispatch(
        rejectMultipleTransfers({
          ids: selectedIds,
          approverName: currentUserName,
        })
      );

      if (rejectMultipleTransfers.fulfilled.match(res)) {
        showToast(
          `Successfully rejected ${count} transfer request${count > 1 ? "s" : ""}.`,
          "info"
        );
        setSelectedIds([]);
      } else {
        showToast(
          res.payload || "Failed to reject selected transfers",
          "error"
        );
      }
    } catch (err) {
      showToast(err.message || "Error processing multiple rejections", "error");
    } finally {
      setIsProcessingBulk(null);
    }
  };

  return (
    <div className="space-y-4">
      {isReadOnly && <ReadOnlyBanner className="mb-3" />}

      {/* Sub-tabs & Filter Controls Container */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Row 1: Sub-tabs & Quick Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl w-full sm:w-auto sm:flex sm:items-center overflow-hidden">
            <button
              onClick={() => handleTabChange("pending")}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-w-0 ${
                tableTab === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Clock size={13} className="shrink-0" />
              <span className="truncate">Pending Approvals</span>
              <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] shrink-0 font-extrabold">
                {transfers.filter((t) => t.status === "Pending").length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("history")}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-w-0 ${
                tableTab === "history"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <ListFilter size={13} className="shrink-0" />
              <span className="truncate">Transfer History</span>
              <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] shrink-0 font-extrabold">
                {transfers.filter((t) => t.status !== "Pending").length}
              </span>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh transfer records"
              className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100 bg-gray-50 hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
            </button>

            <div className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
              Showing {filteredTransfers.length} records
            </div>
          </div>
        </div>

        {/* Row 2: Search Bar + Division Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search ID, SKU, division, operator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* From Division Filter */}
          <div className="w-full">
            <select
              value={filterFromDiv}
              onChange={(e) => setFilterFromDiv(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">From: All Divisions</option>
              {normalizedDivisions.map((div) => (
                <option key={`ff-${div}`} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* To Division Filter */}
          <div className="w-full">
            <select
              value={filterToDiv}
              onChange={(e) => setFilterToDiv(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">To: All Divisions</option>
              {normalizedDivisions.map((div) => (
                <option key={`tf-${div}`} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Multiple Selection Action Toolbar (Pending Approvals Tab) */}
      {tableTab === "pending" && selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/50 dark:via-slate-900 dark:to-blue-950/40 border-2 border-emerald-500/30 dark:border-emerald-500/30 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-2xs">
              {selectedIds.length}
            </span>
            <div className="text-xs font-bold text-gray-800 dark:text-slate-200">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                {selectedIds.length}
              </span>{" "}
              {selectedIds.length === 1 ? "entry" : "entries"} selected for approval
            </div>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white underline cursor-pointer"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Multiple Approve Button */}
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={!canWrite || isProcessingBulk}
              title={
                !canWrite
                  ? READ_ONLY_TOOLTIP
                  : `Approve ${selectedIds.length} selected transfer requests simultaneously`
              }
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs hover:shadow-emerald-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingBulk === "approve" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCheck size={15} />
              )}
              <span>Approve Selected ({selectedIds.length})</span>
            </button>

            {/* Multiple Reject Button */}
            <button
              type="button"
              onClick={handleBulkReject}
              disabled={!canWrite || isProcessingBulk}
              title={
                !canWrite
                  ? READ_ONLY_TOOLTIP
                  : `Reject ${selectedIds.length} selected transfer requests simultaneously`
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs hover:shadow-rose-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingBulk === "reject" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={15} />
              )}
              <span>Reject Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Transfers Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-950/80 border-b border-gray-200 dark:border-slate-800 text-[11px] font-black uppercase text-gray-500 dark:text-slate-400 tracking-wider">
                {/* Select All Checkbox (Pending Tab only) */}
                {tableTab === "pending" && (
                  <th className="px-4 py-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      title={allVisibleSelected ? "Deselect all visible" : "Select all visible"}
                      className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                  </th>
                )}

                <th className="px-4 py-3.5 whitespace-nowrap">Transfer ID</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  From / To Division
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  SKU &amp; Sub Category
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">Qty</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Transfer Date</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Operator</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Remarks</th>

                {/* History Additional Columns */}
                {tableTab === "history" && (
                  <>
                    <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Approver</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Timestamp</th>
                  </>
                )}

                {/* Pending Action Column */}
                {tableTab === "pending" && (
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-850 text-xs font-medium text-gray-800 dark:text-slate-200">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableTab === "history" ? 10 : 9}
                    className="px-4 py-12 text-center text-gray-400 dark:text-slate-500 font-bold"
                  >
                    No transfer records found under current view &amp; filters.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const mat = materials.find((m) => m.sku === item.skuCode);
                  const unitStr = item.unit || mat?.unit || "PCS";

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                          : "hover:bg-gray-50/60 dark:hover:bg-slate-850/40"
                      }`}
                    >
                      {/* Checkbox column for pending tab */}
                      {tableTab === "pending" && (
                        <td className="px-4 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                        </td>
                      )}

                      {/* Transfer ID */}
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* From / To Division */}
                      <td className="px-4 py-3.5 min-w-[130px]">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {item.fromDivision}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
                          <span>➔ {item.toDivision}</span>
                        </div>
                      </td>

                      {/* SKU & Material Name */}
                      <td className="px-4 py-3.5 min-w-[150px]">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {item.skuCode}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[160px]">
                          {item.skuName}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3.5 font-black text-gray-900 dark:text-white whitespace-nowrap">
                        {item.quantity}{" "}
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                          {unitStr}
                        </span>
                      </td>

                      {/* Transfer Date */}
                      <td className="px-4 py-3.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                        {item.transferDate}
                      </td>

                      {/* Operator Name */}
                      <td className="px-4 py-3.5 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                        {item.operatorName}
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-3.5 text-gray-500 truncate max-w-[160px]">
                        {item.remarks || "—"}
                      </td>

                      {/* HISTORY COLUMNS */}
                      {tableTab === "history" && (
                        <>
                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {item.status === "Approved" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md text-[10px] font-black uppercase">
                                <CheckCircle size={10} /> Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-md text-[10px] font-black uppercase">
                                <XCircle size={10} /> Rejected
                              </span>
                            )}
                          </td>

                          {/* Approver Name */}
                          <td className="px-4 py-3.5 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                            {item.approverName || "System Admin"}
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-3.5 text-[11px] text-gray-500 whitespace-nowrap">
                            {item.approvedAt
                              ? new Date(item.approvedAt).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                        </>
                      )}

                      {/* PENDING ACTIONS */}
                      {tableTab === "pending" && (
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={!canWrite || isProcessingBulk}
                              title={!canWrite ? READ_ONLY_TOOLTIP : "Approve Transfer"}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              disabled={!canWrite || isProcessingBulk}
                              title={!canWrite ? READ_ONLY_TOOLTIP : "Reject Transfer"}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
