import React from "react";
import { X, Check } from "lucide-react";
import {
  STAGES,
  cust,
  prod,
  inv,
  money,
  qty,
  qf,
  fdate,
  returnValue,
  reasonsOf,
  initials
} from "../constants/orderReturnData";

export default function ReturnRequestViewModal({ open, record, onClose, onOpenInvoice }) {
  if (!open || !record) return null;

  const cObj = cust(record.customerId || record.customer_id);
  const totalVal = returnValue(record);
  const reasonsList = reasonsOf(record);
  const mainReason = reasonsList.join(", ") || record.reason || "—";
  const items = record.items || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col rounded-3xl max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Stage 1: Return Request
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {record.no}, {cObj.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Progress Stepper & Chips Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 space-y-4">
            {/* 6-step Progress Nodes */}
            <div className="flex items-center justify-between relative px-3 sm:px-6">
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
              {STAGES.map((sName, idx) => {
                const sNum = idx + 1;
                const isCurrent = record.stage === sNum && !["Completed", "Rejected", "Cancelled"].includes(record.status);
                const isRejected = record.status === "Rejected" && sNum === 2;
                const isPassed = record.stage > sNum || record.status === "Completed";

                let circleClass = "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700";

                if (sNum === 1) {
                  circleClass = "border-2 border-emerald-500 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs";
                } else if (isRejected) {
                  circleClass = "bg-rose-600 text-white font-bold";
                } else if (isPassed) {
                  circleClass = "bg-emerald-600 text-white font-bold";
                } else if (isCurrent) {
                  circleClass = "bg-blue-600 text-white font-bold shadow-sm";
                }

                return (
                  <div key={sNum} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${circleClass}`}
                    >
                      {sNum === 1 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">1</span>
                      ) : isPassed ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        sNum
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chips Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  record.status === "Pending Approval" || record.status === "Pending"
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : record.status === "Approved" || record.status === "Completed"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : record.status === "Rejected" || record.status === "Cancelled"
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                }`}
              >
                {record.status}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {items.length} product{items.length > 1 ? "s" : ""}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {money(totalVal)}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {record.transportType || "Ex-Factory"}
              </span>
            </div>
          </div>

          {/* Main Return Request Detail Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 space-y-6">
            {/* 4-column Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Return no.</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {record.no}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Request date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {fdate(record.date)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Reasons</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {mainReason}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Created by</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {record.createdBy || "Anita Verma"}
                </span>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 pt-1">
                <span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Remarks</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                  {record.remarks || "—"}
                </span>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Invoice</th>
                    <th className="py-3 px-4">Inv. date</th>
                    <th className="py-3 px-4">Logistics no.</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Invoice qty</th>
                    <th className="py-3 px-4 text-right">Requested</th>
                    <th className="py-3 px-4">UOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((it, idx) => {
                    const pr = prod(it.productId);
                    const iv = inv(it.invoiceNo);
                    const invDate = it.invoiceDate || iv.date;
                    const catStr = `${pr.category || "Structural Steel"} / ${pr.sub || "Purlins"}`;

                    return (
                      <tr key={it.key || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                          {onOpenInvoice ? (
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(it.invoiceNo)}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                            >
                              {it.invoiceNo}
                            </button>
                          ) : (
                            it.invoiceNo
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {fdate(invDate)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {it.dispatchNo || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 min-w-[180px]">
                          {pr.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {catStr}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          {qf.format(it.invQty || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {qf.format(it.reqQty || 0)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">
                          {pr.uom || "Nos"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reason and Evidence by Product */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Reason and evidence by product
              </h3>

              <div className="space-y-3">
                {items.map((it, idx) => {
                  const pr = prod(it.productId);
                  const prInitials = initials(pr.name) || "PR";
                  const itemAttachments = it.attachments || [];

                  return (
                    <div
                      key={it.key || idx}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {prInitials}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                              {pr.name}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {it.invoiceNo}, {it.dispatchNo}
                            </span>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shrink-0">
                          {qty(it.reqQty || 0, pr.uom)}
                        </span>
                      </div>

                      {/* Reason & Note */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 font-medium block mb-1">
                            Reason
                          </span>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                            {it.reason || record.reason || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 font-medium block mb-1">
                            Note
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {it.note || record.remarks || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Photos & Documents */}
                      <div className="text-xs pt-1">
                        <span className="text-slate-400 dark:text-slate-500 font-medium block mb-1.5">
                          Photos and documents
                        </span>
                        {itemAttachments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {itemAttachments.map((att, aIdx) => (
                              <div
                                key={aIdx}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                              >
                                <span>📄</span>
                                <span className="max-w-[160px] truncate">{att.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">
                            No attachments.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other Attachments if any */}
            {(record.attachments?.request || []).length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Other Attachments
                </h4>
                <div className="flex flex-wrap gap-2">
                  {record.attachments.request.map((att, aIdx) => (
                    <div
                      key={aIdx}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                    >
                      <span>📎</span>
                      <span>{att.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
