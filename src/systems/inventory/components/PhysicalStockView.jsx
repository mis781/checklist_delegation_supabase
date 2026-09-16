// src/systems/inventory/components/PhysicalStockView.jsx
import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ClipboardList,
  CheckCircle2,
  History,
  TrendingUp,
  TrendingDown,
  Search,
  MapPin,
  Calendar,
  User,
  Clock,
  Loader2,
  Check,
  X,
  FileSpreadsheet,
  Plus,
  Filter,
} from "lucide-react";
import Papa from "papaparse";
import { reviewPhysicalStock } from "../../../redux/slice/inventorySlice";
import { useMagicToast } from "../../../context/MagicToastContext";
import PhysicalStockModal from "./PhysicalStockModal";

export default function PhysicalStockView({ activeUser }) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();

  const {
    physicalStocks = [],
    divisions = [],
    materialTypes = [],
  } = useSelector((state) => state.inventory);

  const [activeTab, setActiveTab] = useState("review"); // 'review' | 'history'
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalPrefill, setRecordModalPrefill] = useState(null);

  // Review section states
  const [reviewFilterStatus, setReviewFilterStatus] = useState("Pending"); // 'Pending' | 'Approved' | 'Rejected' | 'All'
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewDivisionFilter, setReviewDivisionFilter] = useState("");
  const [reviewRemarksMap, setReviewRemarksMap] = useState({});
  const [adjustStockMap, setAdjustStockMap] = useState({});
  const [isReviewProcessing, setIsReviewProcessing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  // History section states
  const [historySearch, setHistorySearch] = useState("");
  const [historyDivisionFilter, setHistoryDivisionFilter] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [historySortKey, setHistorySortKey] = useState("countedDate");
  const [historySortDir, setHistorySortDir] = useState(-1); // -1 = desc, 1 = asc
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  // Stats KPIs
  const stats = useMemo(() => {
    const total = physicalStocks.length;
    const pending = physicalStocks.filter(
      (p) => (p.status || "").toLowerCase() === "pending"
    ).length;
    const approved = physicalStocks.filter(
      (p) => (p.status || "").toLowerCase() === "approved"
    ).length;
    const rejected = physicalStocks.filter(
      (p) => (p.status || "").toLowerCase() === "rejected"
    ).length;
    const adjusted = physicalStocks.filter((p) => p.isStockAdjusted).length;

    let surplusTotal = 0;
    let shortageTotal = 0;
    physicalStocks.forEach((p) => {
      const diff = Number(p.differenceQty || 0);
      if (diff > 0) surplusTotal += diff;
      else if (diff < 0) shortageTotal += Math.abs(diff);
    });

    return { total, pending, approved, rejected, adjusted, surplusTotal, shortageTotal };
  }, [physicalStocks]);

  // Filtered review records
  const filteredReviewRecords = useMemo(() => {
    return (physicalStocks || []).filter((p) => {
      const matchStatus =
        reviewFilterStatus === "All" ||
        (p.status || "").toLowerCase() === reviewFilterStatus.toLowerCase();

      const q = reviewSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.countedBy || "").toLowerCase().includes(q);

      const matchDiv =
        !reviewDivisionFilter ||
        reviewDivisionFilter === "ALL" ||
        p.division === reviewDivisionFilter;

      return matchStatus && matchSearch && matchDiv;
    });
  }, [physicalStocks, reviewFilterStatus, reviewSearch, reviewDivisionFilter]);

  // Filtered history records
  const filteredHistoryRecords = useMemo(() => {
    const records = (physicalStocks || []).filter((p) => {
      const q = historySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.countedBy || "").toLowerCase().includes(q) ||
        (p.reviewedBy || "").toLowerCase().includes(q);

      const matchDiv =
        !historyDivisionFilter ||
        historyDivisionFilter === "ALL" ||
        p.division === historyDivisionFilter;

      const matchStatus =
        historyStatusFilter === "ALL" ||
        (p.status || "").toLowerCase() === historyStatusFilter.toLowerCase();

      const matchType =
        historyTypeFilter === "ALL" ||
        (p.materialType || p.material_type || "RM").toUpperCase() ===
          historyTypeFilter.toUpperCase();

      return matchSearch && matchDiv && matchStatus && matchType;
    });

    // Sort
    return records.sort((a, b) => {
      let va = a[historySortKey],
        vb = b[historySortKey];
      if (historySortKey === "countedDate" || historySortKey === "reviewedAt" || historySortKey === "createdAt") {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      } else if (typeof va === "string") {
        va = va.toLowerCase();
        vb = (vb || "").toLowerCase();
      }
      if (va < vb) return -1 * historySortDir;
      if (va > vb) return 1 * historySortDir;
      return 0;
    });
  }, [
    physicalStocks,
    historySearch,
    historyDivisionFilter,
    historyStatusFilter,
    historyTypeFilter,
    historySortKey,
    historySortDir,
  ]);

  // Paginated History Records
  const paginatedHistoryRecords = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistoryRecords.slice(start, start + historyPageSize);
  }, [filteredHistoryRecords, historyPage, historyPageSize]);

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(filteredHistoryRecords.length / historyPageSize)
  );

  // Review approval / rejection action handler
  const handleReviewAction = async (recordId, status) => {
    const reviewRemarks = reviewRemarksMap[recordId] || "";
    const shouldAdjustStock = adjustStockMap[recordId] ?? (status === "Approved");

    setIsReviewProcessing(true);
    setReviewingId(recordId);

    try {
      await dispatch(
        reviewPhysicalStock({
          id: recordId,
          status,
          reviewRemarks,
          shouldAdjustStock,
          currentUser: activeUser?.name || "Admin",
        })
      ).unwrap();

      showToast(
        `Physical stock count #${recordId} ${status.toLowerCase()} successfully!${
          shouldAdjustStock && status === "Approved" ? " Official inventory stock updated." : ""
        }`,
        "success"
      );
    } catch (err) {
      console.error("Review action failed:", err);
      showToast(`Review action failed: ${err.message || err}`, "error");
    } finally {
      setIsReviewProcessing(false);
      setReviewingId(null);
    }
  };

  // Export History CSV
  const handleExportHistoryCSV = () => {
    const exportData = filteredHistoryRecords.map((r) => ({
      "Count ID": r.id,
      "SKU Code": r.sku,
      "Material Name": r.name,
      "Material Type": r.materialType || "RM",
      Firm: r.division || "",
      Location: r.location || "",
      Unit: r.unit || "",
      "System Stock": r.systemStock ?? 0,
      "Physical Quantity": r.physicalQty ?? 0,
      Variance: r.differenceQty ?? 0,
      "Counted By": r.countedBy || "",
      "Counted Date": r.countedDate ? new Date(r.countedDate).toLocaleString() : "",
      Status: r.status || "Pending",
      "Reviewed By": r.reviewedBy || "",
      "Reviewed Date": r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : "",
      "Review Remarks": r.reviewRemarks || "",
      "Stock Adjusted": r.isStockAdjusted ? "Yes" : "No",
      Remarks: r.remarks || "",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Physical_Stock_Variance_Audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requestHistorySort = (key) => {
    if (historySortKey === key) {
      setHistorySortDir((prev) => -prev);
    } else {
      setHistorySortKey(key);
      setHistorySortDir(1);
    }
    setHistoryPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Counts */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Total Counts
            </span>
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {stats.total.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Historical physical stock counts
            </p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Reviews
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {stats.pending.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Awaiting manager decision
              </p>
            </div>
            {stats.pending > 0 && (
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full animate-pulse border border-amber-500/30">
                Action Required
              </span>
            )}
          </div>
        </div>

        {/* Approved & Adjusted */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Approved Counts
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.approved.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {stats.adjusted} stock adjustments posted
            </p>
          </div>
        </div>

        {/* Total Variances */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Variance Balance
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp size={13} /> Surplus: +{stats.surplusTotal.toLocaleString()}
              </div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                <TrendingDown size={13} /> Shortage: -{stats.shortageTotal.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("review")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "review"
                ? "bg-teal-600 text-white shadow-md shadow-teal-500/20 active:scale-95"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            <CheckCircle2 size={16} />
            <span>Variance Review &amp; Approval</span>
            {stats.pending > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-400 text-gray-900 rounded-full">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-teal-600 text-white shadow-md shadow-teal-500/20 active:scale-95"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            <History size={16} />
            <span>Count History &amp; Audit Trail</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportHistoryCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setRecordModalPrefill(null);
              setIsRecordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Record Physical Count</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: VARIANCE REVIEW & APPROVAL */}
      {activeTab === "review" && (
        <div className="space-y-4">
          {/* Sub-toolbar: Status filter, Search, Firm filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-600 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={14} /> Filter Status:
              </span>
              {["Pending", "Approved", "Rejected", "All"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setReviewFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    reviewFilterStatus === st
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {st} {st === "Pending" && stats.pending > 0 ? `(${stats.pending})` : ""}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-1 max-w-lg justify-end">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Search SKU, material, or counter..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={reviewDivisionFilter}
                onChange={(e) => setReviewDivisionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="">All Firms</option>
                {divisions.map((d) => (
                  <option key={d.name || d} value={d.name || d}>
                    {d.name || d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Review Cards Grid / List */}
          {filteredReviewRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-16 text-center shadow-sm">
              <CheckCircle2 size={40} className="mx-auto text-teal-500 mb-3 opacity-80" />
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                No Physical Stock Records Found
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                There are no physical count records matching the status filter "{reviewFilterStatus}".
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredReviewRecords.map((record) => {
                const isPending = (record.status || "").toLowerCase() === "pending";
                const isApproved = (record.status || "").toLowerCase() === "approved";
                const isRejected = (record.status || "").toLowerCase() === "rejected";
                const isCurrentProcessing = isReviewProcessing && reviewingId === record.id;
                const diff = Number(record.differenceQty || 0);

                return (
                  <div
                    key={record.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      isPending
                        ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-300/80 dark:border-amber-900/60 shadow-xs"
                        : isApproved
                        ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40"
                        : "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            {record.sku}
                          </span>
                          <span className="font-bold text-base text-gray-900 dark:text-white">
                            {record.name}
                          </span>
                          {record.division && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                              {record.division}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                            {record.materialType || "RM"}
                          </span>
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                              isApproved
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                : isRejected
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse"
                            }`}
                          >
                            {record.status || "Pending"}
                          </span>
                        </div>

                        {/* Quantities Comparison Grid */}
                        <div className="grid grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200 dark:border-slate-800 max-w-xl shadow-2xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
                              System Book Stock
                            </span>
                            <div className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">
                              {Number(record.systemStock).toLocaleString()} {record.unit}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400">
                              Physical Count
                            </span>
                            <div className="font-black text-sm text-teal-600 dark:text-teal-400 mt-0.5">
                              {Number(record.physicalQty).toLocaleString()} {record.unit}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">
                              Calculated Variance
                            </span>
                            <div
                              className={`font-black text-sm mt-0.5 ${
                                diff > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : diff < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff} {record.unit}
                            </div>
                          </div>
                        </div>

                        {/* Meta information */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User size={13} className="text-teal-500" /> Counted By:{" "}
                            <strong className="text-gray-700 dark:text-slate-300">
                              {record.countedBy || "N/A"}
                            </strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-teal-500" /> Date:{" "}
                            {record.countedDate
                              ? new Date(record.countedDate).toLocaleString()
                              : "N/A"}
                          </span>
                          {record.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={13} className="text-teal-500" /> Location:{" "}
                              {record.location}
                            </span>
                          )}
                          {record.remarks && (
                            <span className="italic text-gray-600 dark:text-slate-300">
                              Observation: &ldquo;{record.remarks}&rdquo;
                            </span>
                          )}
                        </div>

                        {/* Reviewed Info if Completed */}
                        {!isPending && (
                          <div className="text-xs bg-gray-100/80 dark:bg-slate-800/80 p-3 rounded-2xl text-gray-700 dark:text-slate-300 space-y-1 border border-gray-200/60 dark:border-slate-700/60">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span>
                                Reviewed By: <strong>{record.reviewedBy || "Admin"}</strong>
                              </span>
                              <span>
                                Reviewed Date:{" "}
                                {record.reviewedAt
                                  ? new Date(record.reviewedAt).toLocaleString()
                                  : "N/A"}
                              </span>
                              {record.isStockAdjusted && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  Official Inventory Adjusted
                                </span>
                              )}
                            </div>
                            {record.reviewRemarks && (
                              <div className="text-gray-600 dark:text-slate-300">
                                Manager Remarks: <em>{record.reviewRemarks}</em>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions for Pending */}
                      {isPending && (
                        <div className="flex flex-col gap-2.5 min-w-[280px] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                              Reviewer Remarks:
                            </label>
                            <input
                              type="text"
                              value={reviewRemarksMap[record.id] || ""}
                              onChange={(e) =>
                                setReviewRemarksMap((prev) => ({
                                  ...prev,
                                  [record.id]: e.target.value,
                                }))
                              }
                              placeholder="e.g. Physically verified, variance approved"
                              className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                            />
                          </div>

                          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={adjustStockMap[record.id] ?? true}
                              onChange={(e) =>
                                setAdjustStockMap((prev) => ({
                                  ...prev,
                                  [record.id]: e.target.checked,
                                }))
                              }
                              className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="font-semibold text-xs">
                              Update official inventory stock
                            </span>
                          </label>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isCurrentProcessing}
                              onClick={() => handleReviewAction(record.id, "Approved")}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              {isCurrentProcessing ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isCurrentProcessing}
                              onClick={() => handleReviewAction(record.id, "Rejected")}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              {isCurrentProcessing ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <X size={14} />
                              )}
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: COUNT HISTORY & AUDIT TRAIL */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap flex-1 max-w-2xl">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search SKU, material, employee, or reviewer..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={historyDivisionFilter}
                onChange={(e) => {
                  setHistoryDivisionFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="">All Firms</option>
                {divisions.map((d) => (
                  <option key={d.name || d} value={d.name || d}>
                    {d.name || d}
                  </option>
                ))}
              </select>

              <select
                value={historyStatusFilter}
                onChange={(e) => {
                  setHistoryStatusFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={historyTypeFilter}
                onChange={(e) => {
                  setHistoryTypeFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {(materialTypes || []).map((mt) => (
                  <option key={mt.type_code || mt.typeCode} value={mt.type_code || mt.typeCode}>
                    {mt.type_name || mt.typeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-500 dark:text-slate-400">
              Showing <strong>{filteredHistoryRecords.length}</strong> count record(s)
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 dark:bg-slate-950 text-gray-600 dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-800 select-none">
                  <tr>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("countedDate")}
                    >
                      Count Date
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("sku")}
                    >
                      SKU Code
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("name")}
                    >
                      Material Name
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("division")}
                    >
                      Firm
                    </th>
                    <th className="px-4 py-3.5">Type</th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("systemStock")}
                    >
                      System Qty
                    </th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("physicalQty")}
                    >
                      Physical Qty
                    </th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("differenceQty")}
                    >
                      Variance
                    </th>
                    <th className="px-4 py-3.5">Counted By</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5">Reviewed By &amp; Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {paginatedHistoryRecords.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-12 text-gray-400">
                        No physical stock count records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistoryRecords.map((r) => {
                      const diff = Number(r.differenceQty || 0);
                      const isApproved = (r.status || "").toLowerCase() === "approved";
                      const isRejected = (r.status || "").toLowerCase() === "rejected";

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">
                            {r.countedDate
                              ? new Date(r.countedDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {r.sku}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {r.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                            {r.division || "ALL"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {r.materialType || "RM"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-slate-300">
                            {Number(r.systemStock).toLocaleString()} {r.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                            {Number(r.physicalQty).toLocaleString()} {r.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-black">
                            <span
                              className={
                                diff > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : diff < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-gray-500"
                              }
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                            {r.countedBy || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                  : isRejected
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                              }`}
                            >
                              {r.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.reviewedBy ? (
                              <div>
                                <span className="font-semibold text-gray-800 dark:text-slate-200">
                                  {r.reviewedBy}
                                </span>
                                {r.isStockAdjusted && (
                                  <span className="ml-1 text-[10px] text-indigo-500 font-bold">
                                    (Adjusted)
                                  </span>
                                )}
                                {r.reviewRemarks && (
                                  <div className="text-[11px] text-gray-400 italic">
                                    &ldquo;{r.reviewRemarks}&rdquo;
                                  </div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-500 dark:text-slate-400">
              <div>
                Showing page <strong>{historyPage}</strong> of <strong>{totalHistoryPages}</strong> (
                {filteredHistoryRecords.length} records)
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Physical Count Modal */}
      <PhysicalStockModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setRecordModalPrefill(null);
        }}
        activeUser={activeUser}
        prefill={recordModalPrefill}
      />
    </div>
  );
}
