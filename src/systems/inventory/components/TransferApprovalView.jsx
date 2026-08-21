// src/systems/inventory/components/TransferApprovalView.jsx
import React, { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  ListFilter,
  UserCheck,
} from "lucide-react";
import {
  approveTransfer,
  rejectTransfer,
} from "../../../redux/slice/transferSlice";
import { useMagicToast } from "../../../context/MagicToastContext";

export default function TransferApprovalView({ activeUser }) {
  const dispatch = useDispatch();
  const showToast = useMagicToast();

  const { divisions = [] } = useSelector((state) => state.inventory);
  const { transfers = [] } = useSelector(
    (state) => state.transfers || { transfers: [] }
  );

  const [tableTab, setTableTab] = useState("pending"); // 'pending' or 'history'
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFromDiv, setFilterFromDiv] = useState("all");
  const [filterToDiv, setFilterToDiv] = useState("all");

  // Logged-in user name
  const currentUserName =
    activeUser?.name || localStorage.getItem("user-name") || "Guest Operator";

  // Standardize Division Names
  const normalizedDivisions = useMemo(() => {
    if (!divisions || divisions.length === 0) {
      return [
        "Division 1",
        "Division 2",
        "Division 3",
        "NUTECH PIPES",
        "NUTECH COMPOSITES",
      ];
    }
    return divisions
      .map((d) => (typeof d === "string" ? d : d.name))
      .filter(Boolean);
  }, [divisions]);

  // Filter transfers for Approval Table
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Tab filter
      if (tableTab === "pending" && t.status !== "Pending") return false;
      if (tableTab === "history" && t.status === "Pending") return false;

      // Division filters
      if (filterFromDiv !== "all" && t.fromDivision !== filterFromDiv)
        return false;
      if (filterToDiv !== "all" && t.toDivision !== filterToDiv) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = t.id.toLowerCase().includes(q);
        const matchSku = t.skuCode.toLowerCase().includes(q);
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
  }, [transfers, tableTab, filterFromDiv, filterToDiv, searchTerm]);

  // Action Handlers
  const handleApprove = (id) => {
    dispatch(approveTransfer({ id, approverName: currentUserName }));
    showToast(`Transfer request ${id} approved!`, "success");
  };

  const handleReject = (id) => {
    dispatch(rejectTransfer({ id, approverName: currentUserName }));
    showToast(`Transfer request ${id} rejected.`, "info");
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs & Filter Controls Container */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Row 1: Sub-tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl w-full sm:w-auto sm:flex sm:items-center overflow-hidden">
            <button
              onClick={() => setTableTab("pending")}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-w-0 ${
                tableTab === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Clock size={13} className="shrink-0" />
              <span className="truncate">Pending Approvals</span>
              <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] shrink-0">
                {transfers.filter((t) => t.status === "Pending").length}
              </span>
            </button>
            <button
              onClick={() => setTableTab("history")}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-w-0 ${
                tableTab === "history"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <ListFilter size={13} className="shrink-0" />
              <span className="truncate">Transfer History</span>
              <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] shrink-0">
                {transfers.filter((t) => t.status !== "Pending").length}
              </span>
            </button>
          </div>

          <div className="text-xs font-bold text-gray-400 dark:text-slate-500">
            Showing {filteredTransfers.length} records
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

      {/* Transfers Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-950/80 border-b border-gray-200 dark:border-slate-800 text-[11px] font-black uppercase text-gray-500 dark:text-slate-400 tracking-wider">
                <th className="px-4 py-3.5 whitespace-nowrap">Transfer ID</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  From / To Division
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  SKU &amp; Material
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">Qty</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Transfer Date</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  From / To Location
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">Operator</th>
                <th className="px-4 py-3.5 whitespace-nowrap">New SKU Code</th>
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
                    colSpan={tableTab === "history" ? 12 : 10}
                    className="px-4 py-12 text-center text-gray-400 dark:text-slate-500 font-bold"
                  >
                    No transfer records found under current view &amp; filters.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-slate-850/40 transition-colors"
                  >
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
                      {item.quantity}
                    </td>

                    {/* Transfer Date */}
                    <td className="px-4 py-3.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                      {item.transferDate}
                    </td>

                    {/* From / To Location */}
                    <td className="px-4 py-3.5 min-w-[130px]">
                      <div className="text-gray-700 dark:text-slate-300 font-medium">
                        {item.fromLocation}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        ➔ {item.toLocation}
                      </div>
                    </td>

                    {/* Operator Name */}
                    <td className="px-4 py-3.5 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                      {item.operatorName}
                    </td>

                    {/* New SKU Code */}
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {item.newSkuCode}
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
                            title="Approve Transfer"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <CheckCircle size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            title="Reject Transfer"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
