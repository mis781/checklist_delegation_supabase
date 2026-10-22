import React, { useState, useMemo } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import {
  STAGES,
  STAGE_HELP,
  cust,
  prod,
  inv,
  money,
  qty,
  qf,
  fdate,
  fmsSteps,
  dur,
  returnValue,
  creditBasis,
  reasonsOf
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";

export default function OrderReturnStageView({
  stageNum,
  onOpenNewRequest,
  onOpenStageAction,
  onOpenDetails
}) {
  const { visibleReturns, canStage } = useOrderReturn();

  const [activeSubTab, setActiveSubTab] = useState("waiting");
  const [expandedDetailsRows, setExpandedDetailsRows] = useState(new Set());

  const openReturns = (r) => !["Rejected", "Cancelled", "Completed"].includes(r.status);

  // Group returns for this stage into Waiting vs Done
  const waitingList = useMemo(() => {
    if (stageNum === 1) {
      return visibleReturns.filter((r) => r.status === "Draft");
    }
    return visibleReturns.filter((r) => r.stage === stageNum && openReturns(r));
  }, [visibleReturns, stageNum]);

  const doneList = useMemo(() => {
    if (stageNum === 1) {
      return visibleReturns.filter((r) => r.status !== "Draft");
    }
    return visibleReturns.filter((r) => r.stage > stageNum || (stageNum === 2 && r.status === "Rejected"));
  }, [visibleReturns, stageNum]);

  const currentList = activeSubTab === "waiting" ? waitingList : doneList;

  // Sorting descending by updatedAt or date
  const sortedList = useMemo(() => {
    return [...currentList].sort((a, b) => {
      const da = a.updatedAt || a.updated_at || a.date;
      const db = b.updatedAt || b.updated_at || b.date;
      return String(db).localeCompare(String(da));
    });
  }, [currentList]);

  const stageTitle = STAGES[stageNum - 1] || `Stage ${stageNum}`;
  const stageHelp = STAGE_HELP[stageNum] || "";

  const toggleRowDetails = (id) => {
    setExpandedDetailsRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStageStatus = (r) => {
    switch (stageNum) {
      case 1:
        return r.status;
      case 2:
        return r.approval?.status || "Pending";
      case 3:
        return r.debit?.status || "Pending";
      case 4:
        return r.transport?.status || "Not Arranged";
      case 5:
        return r.receipts?.length
          ? `QC ${r.receipts[0].qcStatus}, ${r.receipts.some((x) => x.posted) ? "Posted" : "Unposted"}`
          : "Awaiting Arrival";
      case 6:
        return r.credit?.status || "Pending";
      default:
        return r.status;
    }
  };

  const getKeyDetail = (r) => {
    const d = r.debit || {};
    const t = r.transport || {};
    const b = creditBasis(r);

    if (stageNum <= 2) {
      return reasonsOf(r).join(", ") || r.reason || "Standard Return";
    }
    if (stageNum === 3) {
      return `Approved: ${money(b.cap)}`;
    }
    if (stageNum === 4) {
      return d.number ? `DN: ${d.number} (${money(d.amount)})` : "Debit Note Pending";
    }
    if (stageNum === 5) {
      return t.vehicle
        ? `${t.vehicle}${t.driver ? `, ${t.driver}` : ""}${t.biltyNo ? ` · Bilty ${t.biltyNo}` : ""}`
        : "Transport in progress";
    }
    if (stageNum === 6) {
      return (r.receipts || []).length
        ? `GRN: ${(r.receipts || []).map((x) => x.grn).join(", ")}`
        : "Awaiting Receipt";
    }
    return "—";
  };

  const getTatBadge = (r) => {
    if (r.status === "Draft") return null;
    const steps = fmsSteps(r);
    const s = steps[stageNum - 1];
    if (!s) return null;

    if (s.state === "ok") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> On Time
        </span>
      );
    }
    if (s.state === "late") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          Late {dur(s.delay)}
        </span>
      );
    }
    if (s.state === "overdue") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
          <AlertTriangle className="w-3 h-3" /> Overdue {dur(Date.now() - s.planned)}
        </span>
      );
    }
    if (s.state === "due") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3" /> Due in {dur(s.planned - Date.now())}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
            {stageNum}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{stageTitle}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">{stageHelp}</p>
          </div>
        </div>

        {stageNum === 1 && canStage(1) && (
          <button
            onClick={onOpenNewRequest}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> New Return Request
          </button>
        )}
      </div>

      {/* Segmented Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSubTab("waiting")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "waiting"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {stageNum === 1 ? "Drafts" : "Waiting for Action"} ({waitingList.length})
        </button>
        <button
          onClick={() => setActiveSubTab("done")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "done"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {stageNum === 1 ? "Submitted" : "Completed / Forwarded"} ({doneList.length})
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-xs">
        {sortedList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {activeSubTab === "waiting" ? (stageNum === 1 ? "No drafts found" : "No pending returns in this stage") : "No completed returns here yet"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeSubTab === "waiting"
                ? stageNum === 1
                  ? "Click “New Return Request” above to raise a return."
                  : "Returns will appear here as soon as previous workflow stage deliverables are met."
                : "Processed returns will be listed here with completed audit timestamps."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 w-32">Actions</th>
                  <th className="py-3 px-4">Return No.</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Sales Invoices</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Key Details</th>
                  <th className="py-3 px-4 text-right">Value (₹)</th>
                  <th className="py-3 px-4">Stage Status</th>
                  <th className="py-3 px-4">SLA TAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedList.map((r) => {
                  const cObj = cust(r.customerId || r.customer_id);
                  const isExpanded = expandedDetailsRows.has(r.id);
                  const canAct = activeSubTab === "waiting" && canStage(stageNum) && r.status !== "On Hold";

                  return (
                    <React.Fragment key={r.id}>
                      <tr className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isExpanded ? "bg-indigo-50/20 dark:bg-indigo-950/20" : ""
                      }`}>
                        {/* Action Buttons */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {canAct ? (
                              <button
                                onClick={() => {
                                  if (stageNum === 1 && r.status === "Draft") {
                                    onOpenNewRequest && onOpenNewRequest(r);
                                  } else {
                                    onOpenStageAction && onOpenStageAction(r.id, stageNum);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shrink-0"
                              >
                                {stageNum === 1 ? "Continue" : "Open Form"}
                              </button>
                            ) : (
                              <button
                                onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                              >
                                View
                              </button>
                            )}

                            {r.status !== "Draft" && (
                              <button
                                onClick={() => toggleRowDetails(r.id)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                                title={isExpanded ? "Collapse preview" : "Expand preview"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Return No & Date */}
                        <td className="py-3 px-4">
                          <span className="font-bold font-mono text-slate-900 dark:text-slate-100 block">
                            {r.no}
                          </span>
                          <span className="text-[11px] text-slate-400">{fdate(r.date)}</span>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            {cObj.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{cObj.code}</span>
                        </td>

                        {/* Invoices */}
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {[...new Set((r.items || []).map((i) => i.invoiceNo))].map((no) => (
                            <span key={no} className="block text-[11px]">
                              {no}
                            </span>
                          ))}
                        </td>

                        {/* Products list */}
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                          {(r.items || []).map((i) => prod(i.productId).name).join(", ") || "—"}
                        </td>

                        {/* Key Details */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                          {getKeyDetail(r)}
                        </td>

                        {/* Value */}
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {money(returnValue(r))}
                        </td>

                        {/* Stage Status */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {getStageStatus(r)}
                          </span>
                        </td>

                        {/* SLA TAT */}
                        <td className="py-3 px-4">{getTatBadge(r) || "—"}</td>
                      </tr>

                      {/* Expandable Preview Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                          <td colSpan={9} className="p-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                  Items Summary on Return {r.no}
                                </span>
                                <button
                                  onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  Open Complete Audit Log <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {(r.items || []).map((i, iIdx) => {
                                  const pr = prod(i.productId);
                                  return (
                                    <div
                                      key={iIdx}
                                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                                    >
                                      <div className="flex justify-between font-bold">
                                        <span>{pr.name}</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">
                                          {qty(i.reqQty, pr.uom)}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        Inv: {i.invoiceNo} · Reason: {i.reason || "—"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
