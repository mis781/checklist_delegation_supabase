import React from "react";
import { X, FileText, Building2, Calendar, Phone, Hash } from "lucide-react";
import { MASTERS, inv, cust, prod, money, qty, fdate } from "../constants/orderReturnData";

export default function InvoiceModal({ invoiceNo, onClose }) {
  if (!invoiceNo) return null;
  const iv = inv(invoiceNo);
  const c = cust(iv.customerId);
  const s = MASTERS.seller;

  let subtotal = 0;
  let totalGst = 0;

  const rows = (iv.items || []).map((it, idx) => {
    const p = prod(it.productId);
    const amount = (it.qty || 0) * (it.price || 0);
    const gstRate = p.gst || 18;
    const gstAmount = (amount * gstRate) / 100;
    subtotal += amount;
    totalGst += gstAmount;

    return {
      idx: idx + 1,
      product: p.name,
      dispatchNo: it.dispatchNo,
      qty: it.qty,
      uom: p.uom,
      price: it.price,
      amount,
      gstRate,
      gstAmount
    };
  });

  const grandTotal = subtotal + totalGst;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Tax Invoice Copy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Master Record from ERP Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seller & Invoice Details */}
          <div className="flex flex-wrap justify-between gap-4 pb-4 border-b-2 border-slate-800 dark:border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Seller / Consignor</span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{s.name}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-0.5">{s.address}</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                GSTIN: <span className="font-mono">{s.gstin}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md">
                Original Tax Invoice
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">{invoiceNo}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Date: {fdate(iv.date)}</div>
            </div>
          </div>

          {/* Bill To */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Billed To (Customer)
            </span>
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mt-0.5">{c.address}</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div>
                  <span className="text-slate-500">Code:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">{c.code}</span>
                </div>
                <div>
                  <span className="text-slate-500">GSTIN:</span> <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{c.gstin}</span>
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span> <span className="text-slate-700 dark:text-slate-300">{c.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3">Logistics Dispatch</th>
                  <th className="py-2.5 px-3 text-right">Invoiced Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Taxable Amt (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {rows.map((row) => (
                  <tr key={row.idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-slate-400">{row.idx}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{row.product}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{row.dispatchNo}</td>
                    <td className="py-3 px-3 text-right font-medium">{qty(row.qty, row.uom)}</td>
                    <td className="py-3 px-3 text-right">{money(row.price)}</td>
                    <td className="py-3 px-3 text-right font-bold">{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between py-1">
                <span>Total Taxable Value</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>CGST (9%)</span>
                <span>{money(totalGst / 2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>SGST (9%)</span>
                <span>{money(totalGst / 2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-900 dark:border-slate-100 text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Invoice Total (INR)</span>
                <span>{money(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Close Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
