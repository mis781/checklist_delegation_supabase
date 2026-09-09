import React, { useState, Fragment } from "react";
import FilterBar from "../common/FilterBar";
import ColumnToggleDropdown from "../common/ColumnToggleDropdown";
import StatusBadge from "../common/StatusBadge";
import CreateReturnModal from "../common/CreateReturnModal";
import {
  fmtDate,
  inr,
  overallStatus,
  currentStage,
  totalReturnQty,
  totalReturnValue,
  placeholderPreviewUrl,
  LOGISTICS_REQUIRED_TERMS
} from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn, groupRecordsByBill } from "../../context/PurchaseReturnContext";
import TatStageBadge from "../../../purchase/components/TatStageBadge";
import { formatDateTime } from "../../../purchase/utils/dateUtils";
import {
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  XCircle,
  ExternalLink,
  ChevronRight,
  PackagePlus,
  Loader2,
  FileText
} from "lucide-react";

const DASH_COLUMNS = [
  { key: "returnno", label: "Return Req. ID" },
  { key: "returndate", label: "Return Date" },
  { key: "company", label: "Company" },
  { key: "division", label: "Division" },
  { key: "supplier", label: "Supplier" },
  { key: "po", label: "PO No." },
  { key: "indentno", label: "Indent No." },
  { key: "bill", label: "Bill No." },
  { key: "billimage", label: "Bill Image" },
  { key: "qty", label: "Total Qty" },
  { key: "value", label: "Total Value" },
  { key: "planneddate", label: "Planned Date" },
  { key: "delay", label: "Delay" },
  { key: "actiontype", label: "Action Type" },
  { key: "tpb", label: "Transport Paid By" },
  { key: "transporter", label: "Transporter" },
  { key: "vehicle", label: "Vehicle No." },
  { key: "bilty", label: "Bilty No." },
  { key: "transportamt", label: "Transport Amt" },
  { key: "dn", label: "Debit Note No." },
  { key: "dnamt", label: "DN Amount" },
  { key: "stage", label: "Current Stage" },
  { key: "status", label: "Overall Status" },
  { key: "updated", label: "Last Updated" }
];

const CARD_DEFS = [
  { key: "total", label: "Total Returns", color: "blue", match: () => true },
  {
    key: "Pending Approval",
    label: "Pending Approval",
    color: "amber",
    match: (r) => overallStatus(r) === "Pending Approval"
  },
  {
    key: "Completed",
    label: "Completed Returns",
    color: "emerald",
    match: (r) => overallStatus(r) === "Completed"
  },
  {
    key: "Rejected",
    label: "Rejected Returns",
    color: "rose",
    match: (r) => overallStatus(r) === "Rejected"
  }
];

const PIPELINE_STAGES = [
  {
    key: "Pending Approval",
    label: "Pending Approval",
    color: "bg-amber-500 text-amber-600",
    match: (r) => overallStatus(r) === "Pending Approval"
  },
  {
    key: "Credit Note Pending",
    label: "Credit Note Pending",
    color: "bg-purple-500 text-purple-600",
    match: (r) => overallStatus(r) === "Credit Note Pending"
  },
  {
    key: "Logistics Pending",
    label: "Logistics Pending",
    color: "bg-violet-500 text-violet-600",
    match: (r) => overallStatus(r) === "Logistics Pending"
  },
  {
    key: "Debit Note Pending",
    label: "Debit Note Pending",
    color: "bg-sky-500 text-sky-600",
    match: (r) => overallStatus(r) === "Debit Note Pending"
  },
  {
    key: "Return From Plant Pending",
    label: "Return From Plant Pending",
    color: "bg-orange-500 text-orange-600",
    match: (r) => overallStatus(r) === "Return From Plant Pending"
  }
];

export default function DashboardView({ onOpenDetails }) {
  const {
    records,
    loading,
    canEdit,
    applyFilters,
    dashboardCardFilter,
    setDashboardCardFilter,
    getColVis,
    getTatStatusForReturn
  } = usePurchaseReturn();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter records
  const filteredBase = applyFilters(records, "dashboard");

  // Apply dashboard card filter if active
  const displayRows = React.useMemo(() => {
    if (!dashboardCardFilter) return filteredBase;
    const def =
      CARD_DEFS.find((c) => c.key === dashboardCardFilter) ||
      PIPELINE_STAGES.find((c) => c.key === dashboardCardFilter);
    return def ? filteredBase.filter(def.match) : filteredBase;
  }, [filteredBase, dashboardCardFilter]);

  const colVis = getColVis("dash", DASH_COLUMNS);

  // Financial aggregations
  const approvedOrLater = records.filter((r) => r.approval);
  const totalValApproved = approvedOrLater.reduce((s, r) => s + totalReturnValue(r), 0);
  const totalDebitAmount = records
    .filter((r) => r.debitNote)
    .reduce((s, r) => s + r.debitNote.amount, 0);
  const paidByUs = records
    .filter((r) => r.logistics && LOGISTICS_REQUIRED_TERMS.includes(r.approval?.transportPaidBy))
    .reduce((s, r) => s + Number(r.logistics.transportingAmount || 0), 0);

  // Pipeline counts
  const pipelineCounts = PIPELINE_STAGES.map((st) => ({
    ...st,
    count: filteredBase.filter(st.match).length
  }));
  const pipelineMax = Math.max(1, ...pipelineCounts.map((p) => p.count));

  const totalPending = records.filter((r) => {
    const s = overallStatus(r);
    return !["Completed", "Rejected", "Closed - No Action"].includes(s);
  }).length;
  const totalCompleted = records.filter((r) => overallStatus(r) === "Completed").length;

  // Monthly trend calculations
  const monthlyTrend = React.useMemo(() => {
    const months = ["Jun 2026", "Jul 2026", "Aug 2026"];
    const counts = [0, 0, 0];
    records.forEach((r) => {
      const m = new Date(r.requestDate).getMonth();
      if (m === 5) counts[0]++;
      else if (m === 6) counts[1]++;
      else if (m === 7) counts[2]++;
    });
    const maxVal = Math.max(1, ...counts);
    return months.map((label, idx) => ({
      label,
      value: counts[idx],
      heightPercent: Math.round((counts[idx] / maxVal) * 100)
    }));
  }, [records]);

  // Top reasons calculations
  const topReasons = React.useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      (r.items || []).forEach((i) => {
        counts[i.reason] = (counts[i.reason] || 0) + 1;
      });
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxVal = Math.max(1, ...sorted.map((s) => s[1]));
    return sorted.map(([label, value]) => ({
      label,
      value,
      widthPercent: Math.round((value / maxVal) * 100)
    }));
  }, [records]);

  // Comparison items
  const comparisonItems = React.useMemo(() => {
    const withApproval = records
      .filter(
        (r) =>
          r.approval &&
          r.approval.actionType !== "No Return No Debit Note" &&
          r.approval.actionType !== "Replace"
      )
      .slice(0, 4);

    const maxVal = Math.max(
      1,
      ...withApproval.flatMap((r) => [totalReturnValue(r), r.debitNote ? r.debitNote.amount : 0])
    );

    return withApproval.map((r) => {
      const retVal = totalReturnValue(r);
      const dnVal = r.debitNote ? r.debitNote.amount : 0;
      return {
        label: r.returnNumber,
        retVal,
        dnVal,
        retPercent: Math.round((retVal / maxVal) * 100),
        dnPercent: Math.round((dnVal / maxVal) * 100)
      };
    });
  }, [records]);

  return (
    <div className="space-y-6">
      {/* 4 Clickable KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARD_DEFS.map((c) => {
          const count = filteredBase.filter(c.match).length;
          const isActive = dashboardCardFilter === c.key;

          const colorStyles = {
            blue: "text-blue-600 dark:text-blue-400 border-l-blue-600",
            amber: "text-amber-600 dark:text-amber-400 border-l-amber-500",
            emerald: "text-emerald-600 dark:text-emerald-400 border-l-emerald-500",
            rose: "text-rose-600 dark:text-rose-400 border-l-rose-500"
          }[c.color];

          return (
            <div
              key={c.key}
              onClick={() =>
                setDashboardCardFilter(isActive ? null : c.key)
              }
              className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border cursor-pointer transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 border-l-4 ${colorStyles} ${
                isActive
                  ? "ring-2 ring-blue-500 border-blue-500"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>{c.label}</span>
                {c.color === "blue" && <TrendingUp className="w-4 h-4 opacity-70" />}
                {c.color === "amber" && <AlertTriangle className="w-4 h-4 opacity-70" />}
                {c.color === "emerald" && <FileCheck2 className="w-4 h-4 opacity-70" />}
                {c.color === "rose" && <XCircle className="w-4 h-4 opacity-70" />}
              </div>
              <div className="text-2xl font-extrabold font-mono mt-2 text-slate-900 dark:text-slate-100">
                {count}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>{c.key === "total" ? "All time records" : "Click to filter table"}</span>
                {isActive && (
                  <span className="font-semibold text-blue-600 text-[10px]">Active</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Pipeline Stage Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Pending Pipeline &mdash; Stage-wise Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Active volume distribution across the 5 reverse-logistics phases
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              <strong className="text-amber-600 font-mono font-bold text-sm">
                {totalPending}
              </strong>{" "}
              Pending
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              <strong className="text-emerald-600 font-mono font-bold text-sm">
                {totalCompleted}
              </strong>{" "}
              Completed
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {pipelineCounts.map((p) => {
            const isActive = dashboardCardFilter === p.key;
            return (
              <div
                key={p.key}
                onClick={() =>
                  setDashboardCardFilter(isActive ? null : p.key)
                }
                className={`flex items-center gap-3.5 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all ${
                  isActive ? "bg-blue-50/70 dark:bg-blue-900/20 ring-1 ring-blue-500" : ""
                }`}
              >
                <div className="w-48 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {p.label}
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    style={{ width: `${(p.count / pipelineMax) * 100}%` }}
                    className={`h-full rounded-full transition-all duration-500 min-w-[6px] ${p.color.split(" ")[0]}`}
                  />
                </div>
                <div className="w-8 text-right font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                  {p.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Return Value</span>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {inr(totalValApproved)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Debit Note Amount</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {inr(totalDebitAmount)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Transport Paid by Us</span>
          <div className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400 mt-1">
            {inr(paidByUs)}
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Monthly Return Volume Trend
          </h4>
          <div className="h-44 flex items-end justify-around gap-4 pt-4 px-2">
            {monthlyTrend.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono font-bold text-xs text-blue-600">
                  {m.value}
                </span>
                <div
                  style={{ height: `${m.heightPercent}%` }}
                  className="w-full max-w-[48px] bg-blue-600 hover:bg-blue-700 rounded-t-lg transition-all duration-300 min-h-[4px]"
                />
                <span className="text-[11px] font-medium text-slate-500 truncate w-full text-center">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Damage Reasons Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Top Damage &amp; Return Reasons
          </h4>
          <div className="space-y-2.5 pt-2">
            {topReasons.map((r) => (
              <div key={r.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                    {r.label}
                  </span>
                  <span className="font-mono font-bold text-amber-600">{r.value}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    style={{ width: `${r.widthPercent}%` }}
                    className="bg-amber-500 h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Value vs Debit Note Comparison */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Return Value vs. Debit Note Amount
          </h4>
          <div className="space-y-3.5 pt-1 overflow-y-auto max-h-44">
            {comparisonItems.map((item) => (
              <div key={item.label} className="space-y-1 text-xs">
                <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {item.label}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-14 text-[10px] text-slate-400">Value</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded h-2 overflow-hidden">
                    <div
                      style={{ width: `${item.retPercent}%` }}
                      className="bg-blue-600 h-full rounded"
                    />
                  </div>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 w-16 text-right">
                    {inr(item.retVal)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-14 text-[10px] text-slate-400">Debit</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded h-2 overflow-hidden">
                    <div
                      style={{ width: `${item.dnPercent}%` }}
                      className="bg-emerald-600 h-full rounded"
                    />
                  </div>
                  <span className="font-mono text-[11px] text-emerald-600 w-16 text-right">
                    {inr(item.dnVal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Master History & Details Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Return Details / History
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {displayRows.length} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit("dashboard") && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Create Return Request</span>
              </button>
            )}
            <ColumnToggleDropdown tableKey="dashboard" columns={DASH_COLUMNS} />
          </div>
        </div>

        <FilterBar viewKey="dashboard" />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-3 w-20">Action</th>
                {colVis.returnno && <th className="py-3 px-3">Return Req. ID</th>}
                {colVis.returndate && <th className="py-3 px-3">Return Date</th>}
                {colVis.company && <th className="py-3 px-3">Company</th>}
                {colVis.division && <th className="py-3 px-3">Division</th>}
                {colVis.supplier && <th className="py-3 px-3">Supplier</th>}
                {colVis.po && <th className="py-3 px-3">PO No.</th>}
                {colVis.indentno && <th className="py-3 px-3">Indent No.</th>}
                {colVis.bill && <th className="py-3 px-3">Bill No.</th>}
                {colVis.billimage && <th className="py-3 px-3">Bill Image</th>}
                {colVis.qty && <th className="py-3 px-3 text-right">Total Qty</th>}
                {colVis.value && <th className="py-3 px-3 text-right">Total Value</th>}
                {colVis.planneddate && <th className="py-3 px-3 text-center font-mono">Planned Date</th>}
                {colVis.delay && <th className="py-3 px-3 text-center">Delay</th>}
                {colVis.actiontype && <th className="py-3 px-3">Action Type</th>}
                {colVis.tpb && <th className="py-3 px-3">Transport Paid By</th>}
                {colVis.transporter && <th className="py-3 px-3">Transporter</th>}
                {colVis.vehicle && <th className="py-3 px-3">Vehicle No.</th>}
                {colVis.bilty && <th className="py-3 px-3">Bilty No.</th>}
                {colVis.transportamt && <th className="py-3 px-3 text-right">Transport Amt</th>}
                {colVis.dn && <th className="py-3 px-3">Debit Note No.</th>}
                {colVis.dnamt && <th className="py-3 px-3 text-right">DN Amount</th>}
                {colVis.stage && <th className="py-3 px-3">Current Stage</th>}
                {colVis.status && <th className="py-3 px-3">Overall Status</th>}
                {colVis.updated && <th className="py-3 px-3">Last Updated</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={25} className="py-12 text-center text-slate-400 text-xs font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading purchase returns from database...</span>
                    </div>
                  </td>
                </tr>
              ) : displayRows.length > 0 ? (
                groupRecordsByBill(displayRows).map((group) => {
                  const totalColCount =
                    1 + Object.values(colVis).filter(Boolean).length;
                  const groupTotalQty = group.records.reduce(
                    (s, r) => s + totalReturnQty(r),
                    0
                  );
                  const groupTotalVal = group.records.reduce(
                    (s, r) => s + totalReturnValue(r),
                    0
                  );

                  return (
                    <Fragment key={group.billKey}>
                      {/* Bill Group Header Banner */}
                      <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-t-2 border-b border-slate-200 dark:border-slate-700">
                        <td colSpan={totalColCount} className="py-2 px-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>Bill No:</span>
                                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-bold">
                                  {group.billNumber}
                                </span>
                              </div>
                              {group.supplier && (
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                                  &bull; {group.supplier}
                                </span>
                              )}
                              {group.company && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                                  ({group.company}
                                  {group.division && group.division !== group.company
                                    ? ` - ${group.division}`
                                    : ""}
                                  )
                                </span>
                              )}
                              {group.billDate && (
                                <span className="text-[11px] text-slate-400 hidden md:inline">
                                  &bull; Date: {fmtDate(group.billDate)}
                                </span>
                              )}
                              {group.billImage && (
                                <a
                                  href={
                                    group.billImagePreview || placeholderPreviewUrl(group.billImage)
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline ml-1 font-semibold"
                                >
                                  <span>Bill Copy</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]">
                                {group.records.length} Return Request
                                {group.records.length > 1 ? "s" : ""}
                              </span>
                              <span className="text-slate-600 dark:text-slate-400">
                                Qty: <strong className="text-slate-800 dark:text-slate-200 font-mono">{groupTotalQty}</strong>
                              </span>
                              <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                                Total: {inr(groupTotalVal)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Group Rows */}
                      {group.records.map((r) => {
                        const status = overallStatus(r);
                        const stage = currentStage(r);
                        const tatStatus = getTatStatusForReturn
                          ? getTatStatusForReturn(r.id)
                          : null;
                        const lastAct = r.activity && r.activity[r.activity.length - 1];

                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <span>Details</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>

                            {colVis.returnno && (
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                  className="hover:underline"
                                >
                                  {r.returnNumber}
                                </button>
                              </td>
                            )}
                            {colVis.returndate && (
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {r.approval ? fmtDate(r.approval.approvalDate) : "-"}
                              </td>
                            )}
                            {colVis.company && (
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {r.company}
                              </td>
                            )}
                            {colVis.division && (
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {r.division}
                              </td>
                            )}
                            {colVis.supplier && (
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {r.supplier}
                              </td>
                            )}
                            {colVis.po && (
                              <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                                {r.poNumber}
                              </td>
                            )}
                            {colVis.indentno && (
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.indentNumber ||
                                  (r.items && r.items.length > 0
                                    ? r.items
                                        .map((i) => i.indentNumber || i.sku)
                                        .filter(Boolean)
                                        .join(", ") || "-"
                                    : "-")}
                              </td>
                            )}
                            {colVis.bill && (
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.billNumber}
                              </td>
                            )}
                            {colVis.billimage && (
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <a
                                  href={r.billImagePreview || placeholderPreviewUrl(r.billImage)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                                >
                                  <span>{r.billImage}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </td>
                            )}
                            {colVis.qty && (
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                {totalReturnQty(r)}
                              </td>
                            )}
                            {colVis.value && (
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {inr(totalReturnValue(r))}
                              </td>
                            )}
                            {colVis.planneddate && (
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {tatStatus?.dueAt ? formatDateTime(tatStatus.dueAt) : "—"}
                              </td>
                            )}
                            {colVis.delay && (
                              <td
                                className="py-2.5 px-3 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {tatStatus?.dueAt ? (
                                  <TatStageBadge
                                    tatStatus={tatStatus}
                                    isCompleted={
                                      status === "Completed" ||
                                      status === "Rejected" ||
                                      status === "Closed - No Action"
                                    }
                                  />
                                ) : (
                                  <span className="text-slate-400 font-mono text-xs">—</span>
                                )}
                              </td>
                            )}
                            {colVis.actiontype && (
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.approval ? r.approval.actionType : "-"}
                              </td>
                            )}
                            {colVis.tpb && (
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {r.approval ? r.approval.transportPaidBy : "-"}
                              </td>
                            )}
                            {colVis.transporter && (
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.logistics ? r.logistics.transporterName : "-"}
                              </td>
                            )}
                            {colVis.vehicle && (
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {r.logistics ? r.logistics.vehicleNumber : "-"}
                              </td>
                            )}
                            {colVis.bilty && (
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {r.logistics ? r.logistics.biltyNumber || "-" : "-"}
                              </td>
                            )}
                            {colVis.transportamt && (
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.logistics ? inr(r.logistics.transportingAmount) : "-"}
                              </td>
                            )}
                            {colVis.dn && (
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.debitNote ? r.debitNote.number : "-"}
                              </td>
                            )}
                            {colVis.dnamt && (
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.debitNote ? inr(r.debitNote.amount) : "-"}
                              </td>
                            )}
                            {colVis.stage && (
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                                {stage}
                              </td>
                            )}
                            {colVis.status && (
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <StatusBadge status={status} />
                              </td>
                            )}
                            {colVis.updated && (
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {lastAct ? fmtDate(lastAct.datetime) : "-"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={25}
                    className="py-12 text-center text-slate-400 text-xs font-medium"
                  >
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Return Modal */}
      <CreateReturnModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
