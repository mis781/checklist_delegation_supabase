import React, { useState, useMemo } from "react";
import {
  X,
  Clock,
  User,
  PauseCircle,
  PlayCircle,
  XCircle,
  FileText,
  Truck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileCheck2,
  Package,
  Layers
} from "lucide-react";
import toast from "react-hot-toast";
import {
  STAGES,
  STAGE_OWNER,
  cust,
  prod,
  inv,
  invItem,
  money,
  qty,
  qf,
  fdate,
  fdt,
  creditBasis,
  itemTotals,
  returnValue,
  reasonsOf,
  initials
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";
import InvoiceModal from "./InvoiceModal";

export default function OrderReturnDetailsDrawer({ open, returnId, onClose }) {
  const { returns, holdReturn, resumeReturn, cancelReturn } = useOrderReturn();

  const record = useMemo(() => {
    return returns.find((r) => r.id === returnId) || null;
  }, [returns, returnId]);

  const [activeInvoiceModal, setActiveInvoiceModal] = useState(null);
  const [openSections, setOpenSections] = useState({
    inv: true,
    s1: true,
    s2: true,
    s3: true,
    s4: true,
    s5: true,
    s6: true,
    hist: true
  });

  const toggleSection = (k) => {
    setOpenSections((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handleHoldPrompt = () => {
    const reason = window.prompt("Enter reason to put this return on hold:");
    if (reason && reason.trim()) {
      holdReturn(record.id, reason.trim());
    }
  };

  const handleResumePrompt = () => {
    if (window.confirm("Resume this return from hold?")) {
      resumeReturn(record.id);
    }
  };

  const handleCancelPrompt = () => {
    const reason = window.prompt(
      "Are you sure you want to cancel this return? Enter cancellation reason:"
    );
    if (reason && reason.trim()) {
      cancelReturn(record.id, reason.trim());
    }
  };

  if (!open || !record) return null;

  const c = cust(record.customerId || record.customer_id);
  const basis = creditBasis(record);
  const invoicesList = [...new Set((record.items || []).map((i) => i.invoiceNo))];
  const isClosed = ["Completed", "Rejected", "Cancelled"].includes(record.status);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
        <div
          className="w-full max-w-5xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col rounded-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {record.no}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      record.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : record.status === "Rejected" || record.status === "Cancelled"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : record.status === "On Hold"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.name} ({c.code}) · Raised on {fdate(record.date)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Progress Dots & Chips */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800/80 space-y-3">
            {/* Stage Dots */}
            <div className="flex items-center justify-between relative px-2">
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
              {STAGES.map((sName, sIdx) => {
                const sNum = sIdx + 1;
                const isDone = record.stage > sNum || record.status === "Completed";
                const isCur = record.stage === sNum && !isClosed;
                const isStop = record.status === "Rejected" && sNum === 2;

                return (
                  <div key={sNum} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCur
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60"
                          : isStop
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {sNum}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">
                      Stage {sNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chips bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300">
                📦 {record.items.length} Products
              </span>
              <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300">
                💰 {money(returnValue(record))}
              </span>
              <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300">
                🚛 {record.transportType}
              </span>
              {record.holdReason && (
                <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-semibold rounded-lg text-amber-700 dark:text-amber-300">
                  ⚠️ On Hold: {record.holdReason}
                </span>
              )}
            </div>
          </div>

          {/* Action Toolbar (Hold, Resume, Cancel) */}
          {!isClosed && (
            <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 text-xs">
              {record.status === "On Hold" ? (
                <button
                  type="button"
                  onClick={handleResumePrompt}
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-semibold"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Resume Return
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleHoldPrompt}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-semibold"
                >
                  <PauseCircle className="w-3.5 h-3.5" /> Put on Hold
                </button>
              )}

              <button
                type="button"
                onClick={handleCancelPrompt}
                className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 flex items-center gap-1.5 font-semibold"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Return
              </button>
            </div>
          )}

          {/* Body Sections (Accordion) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Invoice & Original Dispatch Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
              <button
                onClick={() => toggleSection("inv")}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px]">
                    ₹
                  </span>
                  <span>Invoice & Original Dispatch Information</span>
                </div>
                {openSections.inv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {openSections.inv && (
                <div className="p-4 space-y-3">
                  {invoicesList.map((no) => {
                    const iv = inv(no);
                    const itemsOnThisInv = record.items.filter((i) => i.invoiceNo === no);
                    return (
                      <div
                        key={no}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {no} · {fdate(iv.date)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveInvoiceModal(no)}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Invoice Copy
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Products returned on this invoice:{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {itemsOnThisInv.map((i) => prod(i.productId).name).join(", ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stage 1 Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
              <button
                onClick={() => toggleSection("s1")}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Stage 01: Return Request Items</span>
                </div>
                {openSections.s1 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {openSections.s1 && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Raised By</span>
                      <span className="font-semibold">{record.createdBy || "Requester"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Request Date</span>
                      <span className="font-semibold">{fdate(record.date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Transport Terms</span>
                      <span className="font-semibold">{record.transportType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Return Value</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {money(returnValue(record))}
                      </span>
                    </div>
                  </div>

                  {/* Items List Cards */}
                  <div className="space-y-2">
                    {record.items.map((i, idx) => {
                      const pr = prod(i.productId);
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1.5"
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-900 dark:text-slate-100">{pr.name}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {qty(i.reqQty, pr.uom)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                            <span>Inv: {i.invoiceNo}</span>
                            <span>Reason: <span className="font-semibold text-slate-700 dark:text-slate-300">{i.reason || "—"}</span></span>
                            {i.note && <span>Note: {i.note}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Stage 2 Section */}
            {record.approval && record.approval.status !== "Pending" && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
                <button
                  onClick={() => toggleSection("s2")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Stage 02: Approval Decision</span>
                  </div>
                  {openSections.s2 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.s2 && (
                  <div className="p-4 space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Decision</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {record.approval.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Decided By</span>
                        <span className="font-semibold">{record.approval.by || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Approval Date</span>
                        <span className="font-semibold">{fdate(record.approval.date)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Approved Cap</span>
                        <span className="font-bold">{money(basis.cap)}</span>
                      </div>
                    </div>
                    {record.approval.remarks && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                        Remarks: {record.approval.remarks}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stage 3 Section */}
            {record.debit && record.debit.status && record.debit.status !== "Pending" && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
                <button
                  onClick={() => toggleSection("s3")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>Stage 03: Customer Debit Note</span>
                  </div>
                  {openSections.s3 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.s3 && (
                  <div className="p-4 space-y-2 text-xs">
                    {record.debit.required === "No" ? (
                      <p className="text-slate-500">
                        Debit note not required: {record.debit.notReqReason || "Waived"}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-slate-400 text-[11px] block">DN Number</span>
                          <span className="font-mono font-bold">{record.debit.number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">DN Date</span>
                          <span className="font-semibold">{fdate(record.debit.date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Amount</span>
                          <span className="font-bold">{money(record.debit.amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Tax</span>
                          <span>{money(record.debit.tax)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stage 4 Section */}
            {record.transport && record.transport.status && record.transport.status !== "Not Arranged" && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
                <button
                  onClick={() => toggleSection("s4")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px]">
                      4
                    </span>
                    <span>Stage 04: Vehicle & Logistics Details</span>
                  </div>
                  {openSections.s4 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.s4 && (
                  <div className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Vehicle No.</span>
                        <span className="font-mono font-bold uppercase">{record.transport.vehicle || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Transporter</span>
                        <span className="font-semibold">{record.transport.name || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Driver / Mobile</span>
                        <span>{record.transport.driver || "—"} ({record.transport.mobile || "—"})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Bilty No.</span>
                        <span className="font-mono">{record.transport.biltyNo || "No Bilty"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 5 Section */}
            {(record.receipts || []).length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
                <button
                  onClick={() => toggleSection("s5")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px]">
                      5
                    </span>
                    <span>Stage 05: Material Receipts (GRN) & QC</span>
                  </div>
                  {openSections.s5 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.s5 && (
                  <div className="p-4 space-y-2.5 text-xs">
                    {record.receipts.map((rc, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1"
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">{rc.grn}</span>
                          <span className="font-semibold text-emerald-600">QC {rc.qcStatus}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Received on {fdate(rc.date)} by {rc.by} · Post Ref: {rc.postRef || "Pending"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stage 6 Section */}
            {record.credit && record.credit.status && record.credit.status !== "Pending" && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
                <button
                  onClick={() => toggleSection("s6")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px]">
                      6
                    </span>
                    <span>Stage 06: Credit Note</span>
                  </div>
                  {openSections.s6 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.s6 && (
                  <div className="p-4 space-y-2 text-xs">
                    {record.credit.status === "Not Required" ? (
                      <p className="text-slate-500">
                        Closed without credit note: {record.credit.notReqReason || "Waived"}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-slate-400 text-[11px] block">CN Number</span>
                          <span className="font-mono font-bold">{record.credit.number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Date</span>
                          <span className="font-semibold">{fdate(record.credit.date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Amount</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {money(record.credit.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Issued By</span>
                          <span>{record.credit.issuedBy || "Accounts"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800/40">
              <button
                onClick={() => toggleSection("hist")}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Activity Log & Audit Trail</span>
                </div>
                {openSections.hist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {openSections.hist && (
                <div className="p-4 space-y-3">
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {(record.history || []).map((h, hIdx) => (
                      <div key={hIdx} className="relative text-xs space-y-0.5">
                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {h.action}
                          </span>
                          <span className="text-[11px] text-slate-400">{fdt(h.at)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          by <span className="font-semibold text-slate-700 dark:text-slate-300">{h.by}</span> ({h.role})
                          {h.detail ? ` · ${h.detail}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal Popup */}
      {activeInvoiceModal && (
        <InvoiceModal
          invoiceNo={activeInvoiceModal}
          onClose={() => setActiveInvoiceModal(null)}
        />
      )}
    </>
  );
}
