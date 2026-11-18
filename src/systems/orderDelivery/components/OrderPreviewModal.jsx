import React from "react";
import { X, Eye, CheckCircle2, Download, Package, ArrowLeft, Building2, MapPin, Phone, Calendar, UserCheck, ShieldCheck } from "lucide-react";
import { formatDate } from "../utils/helpers";

const inr = (val) => {
  const num = parseFloat(val) || 0;
  return "₹" + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function OrderPreviewModal({
  isOpen,
  onClose,
  formData,
  onConfirmSave,
  onDownloadPdf,
  isSaving = false,
}) {
  if (!isOpen || !formData) return null;

  const items = Array.isArray(formData.items) ? formData.items : [];
  let subtotal = 0;
  let totalGst = 0;

  items.forEach((item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.priceRate) || 0;
    const gstPercent = parseFloat(item.gstPercent) || 0;
    const taxable = qty * rate;
    const gstAmt = taxable * (gstPercent / 100);
    subtotal += taxable;
    totalGst += gstAmt;
  });

  const grandTotal = subtotal + totalGst;
  const advanceAmount = parseFloat(formData.advanceAmount) || 0;
  const balanceDue = Math.max(0, grandTotal - advanceAmount);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0D1730] border border-gray-200 dark:border-[#1E2D52] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 dark:border-[#1E2D52] bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white dark:bg-[#142142]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                  Proforma Invoice (PI) Preview
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {formData.poNumber || "PI-DRAFT"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Review all entries carefully before final submission
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-700 dark:text-slate-200">
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Customer Details */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-1 border-b border-gray-200/60 dark:border-slate-800">
                <Building2 size={14} /> Party / Customer Details
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-white">
                {formData.partyName || "—"}
              </div>
              {formData.partyNumber && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                  <Phone size={13} className="text-gray-400" />
                  <span>{formData.partyNumber}</span>
                </div>
              )}
              {formData.gstNumber && (
                <div className="text-xs text-gray-600 dark:text-slate-300">
                  <span className="font-semibold text-gray-500">GSTIN:</span>{" "}
                  <span className="font-mono font-medium">{formData.gstNumber}</span>
                </div>
              )}
              {formData.responsiblePerson && (
                <div className="text-xs text-gray-600 dark:text-slate-300">
                  <span className="font-semibold text-gray-500">Contact Person:</span>{" "}
                  <span>{formData.responsiblePerson}</span>
                </div>
              )}
              <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300 pt-1">
                <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                <span>{formData.deliveryAddress || "Address not specified"}</span>
              </div>
            </div>

            {/* PI & Dispatch Logistics */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-1 border-b border-gray-200/60 dark:border-slate-800">
                <Calendar size={14} /> PI & Order Logistics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">PI Date</span>
                  <span className="font-medium text-gray-800 dark:text-slate-200">{formatDate(formData.poDate)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Division</span>
                  <span className="font-medium text-gray-800 dark:text-slate-200">{formData.division || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Exp. Delivery Date</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{formatDate(formData.expectedDeliveryDate)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Transport Mode</span>
                  <span className="font-medium text-gray-800 dark:text-slate-200">{formData.transportingType || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Payment Terms</span>
                  <span className="font-medium text-gray-800 dark:text-slate-200">{formData.paymentTerm || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Order Received By</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <UserCheck size={12} /> {formData.orderReceivedBy || "—"}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Products Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300">
                <Package size={14} className="text-indigo-600" /> Products & Line Items ({items.length})
              </div>
            </div>

            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 font-bold text-center w-8">#</th>
                    <th className="py-2.5 px-3 font-bold">Product Description</th>
                    <th className="py-2.5 px-3 font-bold text-center">Qty</th>
                    <th className="py-2.5 px-3 font-bold text-center">UOM</th>
                    <th className="py-2.5 px-3 font-bold text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 font-bold text-center">GST</th>
                    <th className="py-2.5 px-3 font-bold text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">
                        {item.productName || "Unnamed Item"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {item.qty || "0"}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-500 font-medium">
                        {item.uom || "Pcs"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-700 dark:text-slate-300">
                        {inr(item.priceRate)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-500">
                        {item.gstPercent ? `${item.gstPercent}%` : "0%"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {inr(item.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Advance Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            
            {/* Remarks / Attachment note */}
            <div className="w-full sm:w-1/2 space-y-2">
              {formData.remarks && (
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
                  <span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Remarks</span>
                  <p className="text-gray-700 dark:text-slate-300 italic">{formData.remarks}</p>
                </div>
              )}
              {formData.poImage && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                  <ShieldCheck size={15} /> PI Attachment scan/document attached
                </div>
              )}
            </div>

            {/* Calculations Card */}
            <div className="w-full sm:w-1/2 bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-medium text-gray-800 dark:text-slate-200">{inr(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                <span>Total GST Amount:</span>
                <span className="font-mono font-medium text-gray-800 dark:text-slate-200">{inr(totalGst)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                <span className="font-bold text-sm text-gray-900 dark:text-white">Grand Total PI Value:</span>
                <span className="font-mono font-black text-base text-indigo-600 dark:text-indigo-400">{inr(grandTotal)}</span>
              </div>

              {formData.advancePayment === "Yes" && (
                <div className="border-t border-dashed border-gray-200 dark:border-slate-700 pt-2 space-y-1">
                  <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    <span>Advance Payment (Required):</span>
                    <span>{inr(advanceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                    <span>Balance Due:</span>
                    <span className="font-mono font-medium">{inr(balanceDue)}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-[#1E2D52] bg-gray-50/80 dark:bg-[#142142]/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-bold text-sm hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={16} /> Back to Edit
          </button>

          <div className="flex items-center gap-3">
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Download size={16} /> Download Draft PDF
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={onConfirmSave}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> {isSaving ? "Saving..." : "Confirm & Save Order"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
