import StatusBadge from "../common/StatusBadge";
import WorkflowTimeline from "./WorkflowTimeline";
import {
  fmtDate,
  inr,
  overallStatus,
  currentStage,
  totalReturnQty,
  totalReturnValue,
  placeholderPreviewUrl,
  logisticsRequired,
  skipsCreditNote
} from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { ArrowLeft, ExternalLink, Calendar } from "lucide-react";

export default function ReturnDetailsView({ returnId, onBack }) {
  const { records } = usePurchaseReturn();
  const r = records.find((x) => x.id === returnId);

  if (!r) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Purchase return record not found.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  const status = overallStatus(r);
  const stage = currentStage(r);

  const renderField = (label, value, emptyPlaceholder = "Not available") => {
    const isEmpty = value == null || value === "";
    return (
      <div className="space-y-0.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span
          className={`block text-xs font-semibold ${
            isEmpty
              ? "text-slate-400 font-normal italic"
              : "text-slate-800 dark:text-slate-200"
          }`}
        >
          {isEmpty ? emptyPlaceholder : value}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {r.returnNumber || r.id}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {r.supplier}
            </span>
            <span>&middot;</span>
            <span>{r.company}</span>
            <span>&middot;</span>
            <span>{r.division}</span>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Requested {fmtDate(r.requestDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={status} className="text-xs px-3 py-1" />
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: 7 Detailed Sections (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          {/* 1. Basic Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Basic Information
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField("Return Number", r.returnNumber)}
              {renderField("Return Date", r.approval ? fmtDate(r.approval.approvalDate) : null)}
              {renderField("Company", r.company)}
              {renderField("Division", r.division)}
              {renderField("Supplier", r.supplier)}
              {renderField("PO Number", r.poNumber)}
              {renderField("Indent Number", r.indentNumber || (r.items && r.items.map((i) => i.indentNumber || i.sku).filter(Boolean).join(", ")) || "-")}
              {renderField("Bill Number", r.billNumber)}
              <div className="space-y-0.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Bill Image Scan
                </span>
                {r.billImage && String(r.billImage).trim() && r.billImage !== "null" ? (
                  <a
                    href={r.billImagePreview || placeholderPreviewUrl(r.billImage)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>{r.billImage}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">Not Uploaded</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Product Details Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              2. Product Line Items &amp; QC Findings
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Indent No.</th>
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Purch Qty</th>
                    <th className="py-2.5 px-3 text-right">Damage Qty</th>
                    <th className="py-2.5 px-3 text-right">Returned Qty</th>
                    <th className="py-2.5 px-3 text-center">Pending Qty</th>
                    <th className="py-2.5 px-3">Damage Reason</th>
                    <th className="py-2.5 px-3 text-right">Return Value</th>
                    <th className="py-2.5 px-3 text-center">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {r.items.map((it) => (
                    <tr key={it.itemCode} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {it.indentNumber || it.sku || "-"}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">
                        {it.itemCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {it.itemName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{it.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {it.purchaseQty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {it.damageQty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                        {r.approval ? it.returnQty : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {it.pendingQty > 0 ? (
                          <span className="font-bold text-amber-600">{it.pendingQty}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{it.reason}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {inr(it.returnValue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {it.damageImageUrl ? (
                          <a
                            href={it.damageImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Approval Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              3. Purchase Return Approval Decision
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField(
                "Action Type",
                r.approval ? r.approval.actionType : null,
                r.rejected ? "Request rejected" : "Pending approval"
              )}
              {renderField("Transport Paid By", r.approval ? r.approval.transportPaidBy : null)}
              {renderField("Approved By", r.approval ? r.approval.approvedBy : null)}
              {renderField("Approval Date", r.approval ? fmtDate(r.approval.approvalDate) : null)}
              <div className="sm:col-span-2">
                {renderField(
                  "Remarks / Notes",
                  r.approval
                    ? r.approval.remarks
                    : r.rejected
                    ? `${r.rejected.reason} — ${r.rejected.remarks}`
                    : null
                )}
              </div>
            </div>
          </div>

          {/* 4. Credit Note Request */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              4. Credit Note Request to Party
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField(
                "Requested By",
                r.creditNote ? r.creditNote.askedBy : null,
                r.approval && skipsCreditNote(r.approval.actionType)
                  ? "Not applicable (Skipped)"
                  : "Pending party request"
              )}
              {renderField("Request Date", r.creditNote ? fmtDate(r.creditNote.askedDate) : null)}
              <div className="space-y-0.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Attachment Document
                </span>
                {r.creditNote && r.creditNote.attachmentName ? (
                  <a
                    href={r.creditNote.attachmentUrl || placeholderPreviewUrl(r.creditNote.attachmentName)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span>{r.creditNote.attachmentName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">No attachment</span>
                )}
              </div>
              <div className="sm:col-span-3">
                {renderField("Communication Remarks", r.creditNote ? r.creditNote.remarks : null)}
              </div>
            </div>
          </div>

          {/* 5. Logistics Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              5. Logistics &amp; Transport Coordination
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField(
                "Transporter Name",
                r.logistics ? r.logistics.transporterName : null,
                r.approval && !logisticsRequired(r)
                  ? "Not applicable (No physical movement)"
                  : "Pending arrangement"
              )}
              {renderField("Vehicle Number", r.logistics ? r.logistics.vehicleNumber : null)}
              {renderField("Driver Name", r.logistics ? r.logistics.driverName : null)}
              {renderField("Driver Mobile", r.logistics ? r.logistics.driverMobile : null)}
              {renderField("Bilty Status", r.logistics ? r.logistics.biltyAvailable : null)}
              {renderField("Bilty Number", r.logistics ? r.logistics.biltyNumber : null)}
              <div className="space-y-0.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Bilty Copy
                </span>
                {r.logistics && r.logistics.biltyCopyName ? (
                  <a
                    href={r.logistics.biltyCopyUrl || placeholderPreviewUrl(r.logistics.biltyCopyName)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span>{r.logistics.biltyCopyName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not applicable</span>
                )}
              </div>
              {renderField(
                "Transporting Amount",
                r.logistics ? inr(r.logistics.transportingAmount) : null
              )}
              {renderField("Expected Return Date", r.logistics ? fmtDate(r.logistics.transportDate) : null)}
              <div className="sm:col-span-3">
                {renderField("Logistics Remarks", r.logistics ? r.logistics.remarks : null)}
              </div>
            </div>
          </div>

          {/* 6. Debit Note Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              6. Debit Note Accounting &amp; Notification
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField(
                "Debit Note Number",
                r.debitNote ? r.debitNote.number : null,
                r.approval && (r.approval.actionType === "No Return No Debit Note" || r.approval.actionType === "Replace")
                  ? "Not applicable"
                  : "Pending issuance"
              )}
              {renderField("Debit Note Date", r.debitNote ? fmtDate(r.debitNote.date) : null)}
              {renderField("Debit Note Amount", r.debitNote ? inr(r.debitNote.amount) : null)}
              <div className="space-y-0.5 sm:col-span-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Debit Note Scan Image
                </span>
                {r.debitNote && r.debitNote.imageName ? (
                  <a
                    href={r.debitNote.imageUrl || placeholderPreviewUrl(r.debitNote.imageName)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span>{r.debitNote.imageName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not uploaded</span>
                )}
              </div>
              <div className="sm:col-span-3">
                {renderField("Remarks", r.debitNote ? r.debitNote.remarks : null)}
              </div>
            </div>
          </div>

          {/* 7. Material Dispatch Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              7. Final Plant Dispatch &amp; Gate Exit
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField(
                "Dispatched Qty",
                r.dispatch ? r.dispatch.actualQty : null,
                r.approval && r.approval.actionType !== "Return Material and Debit Note" && r.approval.actionType !== "Replace"
                  ? "Not applicable (No movement)"
                  : "Pending plant dispatch"
              )}
              {renderField(
                "Dispatched Date",
                r.dispatch ? fmtDate(r.dispatch.dispatchedDate) : null
              )}
              {renderField("Dispatched By", r.dispatch ? r.dispatch.dispatchedBy : null)}
              <div className="space-y-0.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Loaded Material Photo
                </span>
                {r.dispatch && r.dispatch.photoName ? (
                  <a
                    href={r.dispatch.photoUrl || placeholderPreviewUrl(r.dispatch.photoName)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span>{r.dispatch.photoName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not uploaded</span>
                )}
              </div>
              <div className="space-y-0.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Gate Pass Scan
                </span>
                {r.dispatch && r.dispatch.attachmentName ? (
                  <a
                    href={r.dispatch.attachmentUrl || placeholderPreviewUrl(r.dispatch.attachmentName)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span>{r.dispatch.attachmentName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not uploaded</span>
                )}
              </div>
              <div className="sm:col-span-3">
                {renderField("Dispatch Remarks", r.dispatch ? r.dispatch.remarks : null)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Timeline & Summary Card (1 span) */}
        <div className="space-y-4">
          {/* Quick Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Quick Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500">Total Return Qty:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {totalReturnQty(r)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500">Total Return Value:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {inr(totalReturnValue(r))}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500">Current Stage:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {stage}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Overall Status:</span>
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          {/* Workflow Timeline Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Return Workflow Timeline
            </h4>
            <WorkflowTimeline record={r} />
          </div>
        </div>
      </div>
    </div>
  );
}
