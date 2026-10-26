import React, { useState, useMemo } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package
} from "lucide-react";
import {
  STAGES,
  STAGE_HELP,
  cust,
  prod,
  inv,
  money,
  fdate,
  fmsSteps,
  dur,
  returnValue,
  creditBasis,
  reasonsOf
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";
import ReturnRequestViewModal from "./ReturnRequestViewModal";
import OrderReturnInlineDetails from "./OrderReturnInlineDetails";
import InvoiceModal from "./InvoiceModal";

export default function OrderReturnStageView({
  stageNum,
  onOpenNewRequest,
  onOpenStageAction,
  onOpenDetails
}) {
  const { visibleReturns, canStage } = useOrderReturn();

  const [activeSubTab, setActiveSubTab] = useState("waiting");
  const [expandedDetailsRows, setExpandedDetailsRows] = useState(new Set());
  const [viewModalRecord, setViewModalRecord] = useState(null);
  const [activeInvoiceNo, setActiveInvoiceNo] = useState(null);

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
          <CheckCircle2 className="w-3 h-3" /> On time
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
    if (s.state === "hold") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          On hold
        </span>
      );
    }
    if (s.state === "cancel") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Cancelled
        </span>
      );
    }
    return null;
  };

  const handleViewRecord = (r) => {
    // If viewing stage 1 return request, open the exact Stage 1 Return Request popup modal
    if (stageNum === 1) {
      setViewModalRecord(r);
    } else {
      // For other stages, if openStageAction is available
      if (onOpenStageAction) {
        onOpenStageAction(r.id, stageNum);
      } else {
        setViewModalRecord(r);
      }
    }
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
            <Plus className="w-4 h-4" /> New return request
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
          {stageNum === 1 ? "Drafts" : "Waiting"} ({waitingList.length})
        </button>
        <button
          onClick={() => setActiveSubTab("done")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "done"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {stageNum === 1 ? "Submitted" : "Done"} ({doneList.length})
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-xs">
        {sortedList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {activeSubTab === "waiting" ? (stageNum === 1 ? "No drafts" : "Nothing waiting here") : "Nothing here yet"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeSubTab === "waiting"
                ? stageNum === 1
                  ? "Use “New return request” above to start one."
                  : "Returns appear here when the previous stage is finished."
                : "Processed returns will appear here with completed audit timestamps."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              {/* Table Columns matching Order Return (1).html exact names & count */}
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Action</th>
                  <th className="py-3 px-4 whitespace-nowrap">Return no.</th>
                  <th className="py-3 px-4 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Invoice</th>
                  <th className="py-3 px-4 whitespace-nowrap">Products</th>
                  <th className="py-3 px-4 whitespace-nowrap">Key details</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Value</th>
                  <th className="py-3 px-4 whitespace-nowrap">Stage status</th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    {activeSubTab === "waiting" ? "Time (TAT)" : "Finished"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedList.map((r) => {
                  const cObj = cust(r.customerId || r.customer_id);
                  const isExpanded = expandedDetailsRows.has(r.id);
                  const canAct = activeSubTab === "waiting" && canStage(stageNum) && r.status !== "On Hold";
                  const uniqueInvoices = [...new Set((r.items || []).map((i) => i.invoiceNo))];

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isExpanded ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        {/* 1. Action: View + Details buttons */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {canAct ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (stageNum === 1 && r.status === "Draft") {
                                    onOpenNewRequest && onOpenNewRequest(r);
                                  } else {
                                    onOpenStageAction && onOpenStageAction(r.id, stageNum);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shrink-0"
                              >
                                {stageNum === 1 ? "Continue" : "Open form"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewRecord(r)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0"
                              >
                                View
                              </button>
                            )}

                            {/* Details Button (toggles complete details) */}
                            {r.status !== "Draft" && (
                              <button
                                type="button"
                                onClick={() => toggleRowDetails(r.id)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors shrink-0 ${
                                  isExpanded
                                    ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900"
                                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {isExpanded ? "Hide details" : "Details"}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 2. Return no. + request date */}
                        <td className="py-3 px-4">
                          <b className="font-bold font-mono text-slate-900 dark:text-slate-100 block">
                            {r.no}
                          </b>
                          <small className="text-[11px] text-slate-400 block">{fdate(r.date)}</small>
                        </td>

                        {/* 3. Customer */}
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-900 dark:text-slate-100 block">
                            {cObj.name || "—"}
                          </span>
                        </td>

                        {/* 4. Invoice + invoice date */}
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {uniqueInvoices.map((no) => (
                            <div key={no} className="mb-1 last:mb-0">
                              <button
                                type="button"
                                onClick={() => setActiveInvoiceNo(no)}
                                className="block text-[11px] font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 hover:underline"
                                title="Click to view invoice copy"
                              >
                                {no}
                              </button>
                              <small className="text-[10px] text-slate-400 block">{fdate(inv(no).date)}</small>
                            </div>
                          ))}
                        </td>

                        {/* 5. Products */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs" style={{ whiteSpace: "normal", minWidth: 170 }}>
                          {(r.items || []).map((i) => prod(i.productId).name).join(", ") || "—"}
                        </td>

                        {/* 6. Key details */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-xs" style={{ whiteSpace: "normal", minWidth: 180 }}>
                          {getKeyDetail(r)}
                        </td>

                        {/* 7. Value */}
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {money(returnValue(r))}
                        </td>

                        {/* 8. Stage status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${
                              getStageStatus(r) === "Completed" || getStageStatus(r) === "Approved" || getStageStatus(r) === "Passed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : getStageStatus(r) === "Rejected" || getStageStatus(r) === "Failed" || getStageStatus(r) === "Cancelled"
                                ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {getStageStatus(r)}
                          </span>
                        </td>

                        {/* 9. Finished / Time (TAT) */}
                        <td className="py-3 px-4 whitespace-nowrap">{getTatBadge(r) || "—"}</td>
                      </tr>

                      {/* Expandable Complete Details Row (shown when Details button is clicked) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                          <td colSpan={9} className="p-4 sm:p-5 border-t border-b border-dashed border-slate-200 dark:border-slate-700">
                            <OrderReturnInlineDetails
                              record={r}
                              onOpenInvoice={(invNo) => setActiveInvoiceNo(invNo)}
                            />
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

      {/* Return Request View Modal (matches Order Return (1).html Stage 1 Popup Modal) */}
      <ReturnRequestViewModal
        open={!!viewModalRecord}
        record={viewModalRecord}
        onClose={() => setViewModalRecord(null)}
        onOpenInvoice={(invNo) => setActiveInvoiceNo(invNo)}
      />

      {/* Tax Invoice Copy Modal */}
      <InvoiceModal
        invoiceNo={activeInvoiceNo}
        onClose={() => setActiveInvoiceNo(null)}
      />
    </div>
  );
}
