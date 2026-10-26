import { useState } from "react";
import {
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  MASTERS,
  inv,
  prod,
  money,
  qty,
  qf,
  num,
  fdate,
  creditBasis,
  returnValue,
  initials,
  sumItems
} from "../constants/orderReturnData";

export default function OrderReturnInlineDetails({ record, onOpenInvoice }) {
  const [openSections, setOpenSections] = useState({
    inv: true,
    s1: true,
    s2: true,
    s3: true,
    s4: true,
    s5: true,
    s6: true
  });

  if (!record) return null;

  const toggle = (sec) => setOpenSections((p) => ({ ...p, [sec]: !p[sec] }));

  const done = (k) => k < record.stage || (k === 2 && record.status === "Rejected") || record.status === "Completed";
  const invs = [...new Set((record.items || []).map((i) => i.invoiceNo))];
  const basis = creditBasis(record);
  const totalVal = returnValue(record);

  return (
    <div className="space-y-3.5 text-xs">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Complete details</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-900">
            {record.no}
          </span>
        </h3>
      </div>

      {/* ── Section ₹: Invoice and original dispatch ───────────────────── */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggle("inv")}
          className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[11px] font-bold">
              ₹
            </span>
            <span>Invoice and original dispatch</span>
          </div>
          {openSections.inv ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.inv && (
          <div className="p-4 space-y-3">
            {invs.map((no) => {
              const iv = inv(no);
              const items = (record.items || []).filter((i) => i.invoiceNo === no);
              const amt = (iv.items || []).reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0);
              const gst = (iv.items || []).reduce((s, it) => {
                const pr = prod(it.productId);
                return s + (it.qty || 0) * (it.price || 0) * ((pr.gst || 0) / 100);
              }, 0);
              const dispatches = [...new Set(items.map((i) => i.dispatchNo).filter(Boolean))];

              return (
                <div key={no} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
                      {no}
                    </span>
                    {onOpenInvoice && (
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(no)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                      >
                        View invoice copy
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Invoice date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(iv.date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Invoice amount</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{money(amt + gst)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Taxable value</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{money(amt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">GST</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{money(gst)}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <span className="text-slate-400 block">Products returned</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {items.map((i) => prod(i.productId).name).join(", ") || "—"}
                      </span>
                    </div>
                  </div>

                  {dispatches.map((dn) => {
                    const d = (MASTERS.dispatches && MASTERS.dispatches[dn]) || {};
                    return (
                      <div key={dn} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <div>
                          <span className="text-slate-400 block">Dispatch no.</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{dn}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Dispatch date</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(d.date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Vehicle no.</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{d.vehicle || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Transporter</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{d.transporter || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Driver</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{d.driver || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">LR no.</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{d.lr || "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 1: Return request ──────────────────────────────────── */}
      {done(1) && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggle("s1")}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              <span>Return request</span>
            </div>
            {openSections.s1 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.s1 && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block">Return no.</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{record.no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Request date</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(record.date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Raised by</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{record.createdBy || "Anita Verma"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Transport type</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{record.transportType || "Ex-Factory"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Return value</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{money(totalVal)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Remarks</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{record.remarks || "—"}</span>
                </div>
              </div>

              {/* Line cards */}
              <div className="space-y-2">
                {(record.items || []).map((i, idx) => {
                  const pr = prod(i.productId);
                  return (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials(pr.name)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{pr.name}</span>
                          <span className="text-[11px] text-slate-400">{i.invoiceNo}, {i.dispatchNo} · Reason: {i.reason || record.reason || "—"}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                        {qty(i.reqQty, pr.uom)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 2: Approval ────────────────────────────────────────── */}
      {done(2) && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggle("s2")}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                2
              </span>
              <span>Approval</span>
            </div>
            {openSections.s2 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.s2 && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Decision</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{record.approval?.status || record.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Decided by</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.approval?.by || "Suresh Patel"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(record.approval?.date || record.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Approved qty</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {qf.format(sumItems(record, (i) => i.apprQty || 0))} of {qf.format(sumItems(record, (i) => i.reqQty))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Approved value</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{money(basis.cap)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Remarks</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.approval?.remarks || record.approval?.reason || "—"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Debit note ──────────────────────────────────────── */}
      {done(3) && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggle("s3")}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                3
              </span>
              <span>Debit note</span>
            </div>
            {openSections.s3 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.s3 && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Debit note no.</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{record.debit?.number || "Not Needed"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(record.debit?.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Amount</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.debit?.amount ? money(record.debit.amount) : "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tax</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.debit?.tax ? money(record.debit.tax) : "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {record.debit?.amount ? money(num(record.debit.amount) + num(record.debit.tax)) : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Recorded by</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.debit?.submittedBy || "Neha Gupta"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 4: Return vehicle and bilty ─────────────────────────── */}
      {done(4) && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggle("s4")}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                4
              </span>
              <span>Return vehicle and bilty</span>
            </div>
            {openSections.s4 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.s4 && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Transport type</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.transportType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Vehicle no.</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{record.transport?.vehicle || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Transporter / Driver</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.transport?.name || record.transport?.driver || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Expected delivery</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(record.transport?.expected)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Bilty no.</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.transport?.biltyNo || "No bilty"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{record.transport?.status || "—"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 5: Material receipt and QC ─────────────────────────── */}
      {(done(5) || (record.receipts && record.receipts.length > 0)) && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggle("s5")}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                5
              </span>
              <span>Material receipt and QC</span>
            </div>
            {openSections.s5 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.s5 && (
            <div className="p-4 space-y-2 text-xs">
              {(record.receipts || []).map((rc, rIdx) => (
                <div key={rIdx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">GRN</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{rc.grn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Received date</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(rc.date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">QC status</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{rc.qcStatus || "Passed"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Stock reference</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{rc.postRef || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Section 6: Credit note ─────────────────────────────────────── */}
      {(done(6) || record.credit?.status === "Issued") && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggle("s6")}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                6
              </span>
              <span>Credit note</span>
            </div>
            {openSections.s6 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.s6 && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Credit note no.</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{record.credit?.number || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{fdate(record.credit?.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Amount</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.credit?.amount ? money(record.credit.amount) : "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tax</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.credit?.tax ? money(record.credit.tax) : "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {record.credit?.amount ? money(num(record.credit.amount) + num(record.credit.tax)) : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Issued by</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{record.credit?.issuedBy || "Neha Gupta"}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
