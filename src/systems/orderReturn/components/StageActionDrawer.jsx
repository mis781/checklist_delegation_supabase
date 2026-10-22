import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Truck,
  PackageCheck,
  Receipt,
  FileCheck2,
  Upload,
  Calendar,
  Building,
  ArrowRight,
  ShieldAlert,
  Info
} from "lucide-react";
import toast from "react-hot-toast";
import {
  STAGES,
  STAGE_OWNER,
  TT_HINT,
  TT_MODE,
  DEST_WH,
  SUBCATS,
  RETURN_DAYS,
  cust,
  prod,
  inv,
  invItem,
  money,
  qty,
  qf,
  round,
  num,
  fdate,
  daysBetween,
  committedQty,
  creditBasis,
  itemTotals,
  today
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";

export default function StageActionDrawer({ open, returnId, stageNum, onClose }) {
  const {
    returns,
    approveReturn,
    saveDebitNote,
    saveTransport,
    saveReceipt,
    postStock,
    closeReceiptStage,
    saveCreditNote,
    currentUser
  } = useOrderReturn();

  const record = useMemo(() => {
    return returns.find((r) => r.id === returnId) || null;
  }, [returns, returnId]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stage 2 state
  const [approvalDecision, setApprovalDecision] = useState("Approved");
  const [approvedQtys, setApprovedQtys] = useState({});
  const [approvalRemarks, setApprovalRemarks] = useState("");

  // Stage 3 state
  const [debitReq, setDebitReq] = useState("Yes");
  const [debitNo, setDebitNo] = useState("");
  const [debitDate, setDebitDate] = useState(today());
  const [debitAmt, setDebitAmt] = useState("");
  const [debitTax, setDebitTax] = useState("");
  const [debitNotReqReason, setDebitNotReqReason] = useState("");
  const [debitRemarks, setDebitRemarks] = useState("");

  // Stage 4 state
  const [tName, setTName] = useState("");
  const [tVeh, setTVeh] = useState("");
  const [tDrv, setTDrv] = useState("");
  const [tMob, setTMob] = useState("");
  const [tDate, setTDate] = useState(today());
  const [tOffice, setTOffice] = useState("");
  const [uName, setUName] = useState("");
  const [uVeh, setUVeh] = useState("");
  const [uDrv, setUDrv] = useState("");
  const [uMob, setUMob] = useState("");
  const [uDate, setUDate] = useState(today());
  const [tExp, setTExp] = useState("");
  const [tCost, setTCost] = useState("");
  const [tBiltyReq, setTBiltyReq] = useState("No");
  const [tBilty, setTBilty] = useState("");
  const [tRem, setTRem] = useState("");

  // Stage 5 state
  const [gDate, setGDate] = useState(today());
  const [gQc, setGQc] = useState("Passed");
  const [gRem, setGRem] = useState("");
  const [receiptLines, setReceiptLines] = useState({});
  const [shortWhy, setShortWhy] = useState("");

  // Stage 6 state
  const [cReq, setCReq] = useState("Yes");
  const [cNo, setCNo] = useState("");
  const [cDate, setCDate] = useState(today());
  const [cAmt, setCAmt] = useState("");
  const [cTax, setCTax] = useState("");
  const [cNotReqReason, setCNotReqReason] = useState("");
  const [cRem, setCRem] = useState("");

  // Populate state on open
  useEffect(() => {
    if (!record || !open) return;

    if (stageNum === 2) {
      setApprovalDecision("Approved");
      const initQ = {};
      (record.items || []).forEach((i) => {
        initQ[i.key || i.item_key] = i.apprQty != null ? i.apprQty : i.reqQty;
      });
      setApprovedQtys(initQ);
      setApprovalRemarks("");
    } else if (stageNum === 3) {
      const d = record.debit || {};
      const cap = creditBasis(record).cap;
      setDebitReq(d.required || "Yes");
      setDebitNo(d.number || "");
      setDebitDate(d.date || today());
      setDebitAmt(d.amount !== "" && d.amount != null ? d.amount : cap ? String(cap) : "");
      setDebitTax(d.tax !== "" && d.tax != null ? d.tax : cap ? String(round(cap * 0.18, 2)) : "");
      setDebitNotReqReason(d.notReqReason || "");
      setDebitRemarks(d.remarks || "");
    } else if (stageNum === 4) {
      const t = record.transport || {};
      const l2 = t.leg2 || {};
      setTName(t.name || "");
      setTVeh(t.vehicle || "");
      setTDrv(t.driver || "");
      setTMob(t.mobile || "");
      setTDate(t.pickup || today());
      setTOffice(t.office || "");
      setUName(l2.name || "");
      setUVeh(l2.vehicle || "");
      setUDrv(l2.driver || "");
      setUMob(l2.mobile || "");
      setUDate(l2.date || today());
      setTExp(t.expected || "");
      setTCost(t.cost || "");
      setTBiltyReq(t.biltyReq || "No");
      setTBilty(t.biltyNo || "");
      setTRem(t.remarks || "");
    } else if (stageNum === 5) {
      setGDate(today());
      setGQc("Passed");
      setGRem("");
      setShortWhy("");
      const initialLines = {};
      (record.items || []).forEach((i) => {
        const k = i.key || i.item_key;
        const pr = prod(i.productId);
        const bal = Math.max(0, round((i.apprQty || 0) - itemTotals(record, i).recv));
        initialLines[k] = {
          recv: bal,
          dest: pr.stockType,
          sub: pr.sub
        };
      });
      setReceiptLines(initialLines);
    } else if (stageNum === 6) {
      const c = record.credit || {};
      const b = creditBasis(record);
      setCReq(c.required || "Yes");
      setCNo(c.number || "");
      setCDate(c.date || today());
      setCAmt(c.amount !== "" && c.amount != null ? c.amount : b ? String(b.base) : "");
      setCTax(c.tax !== "" && c.tax != null ? c.tax : b ? String(b.tax) : "");
      setCNotReqReason(c.notReqReason || "");
      setCRem(c.remarks || "");
    }
  }, [record, open, stageNum]);

  if (!open || !record) return null;

  const stageTitle = STAGES[stageNum - 1] || "Stage Action";
  const basis = creditBasis(record);

  // Decision Support for Stage 2
  const decisionSupportData = () => {
    const custId = record.customerId || record.customer_id;
    const pastReturns = returns.filter((x) => x.id !== record.id && (x.customerId || x.customer_id) === custId && x.status !== "Draft");
    const rejectedPast = pastReturns.filter((x) => x.status === "Rejected").length;
    const approvedPast = pastReturns.filter((x) => ["Approved", "Partially Approved"].includes(x.approval?.status)).length;
    const flags = [];

    (record.items || []).forEach((i) => {
      const p = prod(i.productId);
      const it = invItem(i.invoiceNo, i.productId);
      const d = daysBetween(i.invoiceDate, record.date);
      if (d > RETURN_DAYS) {
        flags.push(`${p.name}: Invoice is ${d} days old (> 45-day window).`);
      }
      if (!(i.attachments || []).length) {
        flags.push(`${p.name}: No photos attached.`);
      }
    });

    if (rejectedPast > 0) {
      flags.push(`Caution: Customer had ${rejectedPast} previously rejected return(s).`);
    }

    return { pastReturns, rejectedPast, approvedPast, flags };
  };

  // Handlers
  const handleStage2Submit = async () => {
    if (approvalDecision !== "Approved" && !approvalRemarks.trim()) {
      toast.error("Remarks are required when a return is rejected or partially approved");
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await approveReturn(record.id, {
        decision: approvalDecision,
        qtys: approvedQtys,
        reason: approvalRemarks,
        remarks: approvalRemarks
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStage3Submit = async () => {
    if (debitReq === "Yes" && (!debitNo.trim() || !debitAmt || num(debitAmt) <= 0)) {
      toast.error("Please enter a valid debit note number and amount");
      return;
    }
    if (debitReq === "No" && !debitNotReqReason.trim()) {
      toast.error("Please provide a reason why debit note is not required");
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await saveDebitNote(record.id, {
        required: debitReq,
        status: debitReq === "Yes" ? "Received" : "Not Required",
        number: debitNo,
        date: debitDate,
        amount: debitAmt,
        tax: debitTax,
        notReqReason: debitNotReqReason,
        remarks: debitRemarks
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStage4Submit = async () => {
    if (tBiltyReq === "Yes" && !tBilty.trim()) {
      toast.error("Bilty number is required when Bilty is marked Yes");
      return;
    }
    setIsSubmitting(true);
    try {
      const mode = TT_MODE[record.transportType] || "Company Vehicle";
      const payload = {
        mode,
        status: "In Transit",
        name: tName,
        vehicle: tVeh.toUpperCase(),
        driver: tDrv,
        mobile: tMob,
        pickup: tDate,
        office: tOffice,
        leg2:
          mode === "Two-leg"
            ? {
                name: uName,
                vehicle: uVeh.toUpperCase(),
                driver: uDrv,
                mobile: uMob,
                date: uDate
              }
            : null,
        expected: tExp,
        cost: tCost,
        biltyReq: tBiltyReq,
        biltyNo: tBiltyReq === "Yes" ? tBilty : "",
        remarks: tRem
      };
      const ok = await saveTransport(record.id, payload);
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStage5ReceiptSubmit = async () => {
    const lines = Object.entries(receiptLines).map(([key, val]) => {
      const recv = round(num(val.recv));
      const dest = val.dest;
      const isOk = dest !== "Scrap" && dest !== "Reject";
      return {
        key,
        item_key: key,
        recv,
        accept: isOk ? recv : 0,
        reject: dest === "Reject" ? recv : 0,
        scrap: dest === "Scrap" ? recv : 0,
        condition: isOk ? "Good" : dest === "Scrap" ? "Damaged" : "Defective",
        stockType: isOk ? dest : "FG",
        warehouse: isOk ? DEST_WH[dest] : dest === "Scrap" ? "Scrap Yard" : "",
        subCat: val.sub
      };
    });

    if (!lines.some((l) => l.recv > 0)) {
      toast.error("Please enter received quantity for at least one item");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await saveReceipt(record.id, {
        date: gDate,
        qcStatus: gQc,
        remarks: gRem,
        lines
      });
      if (ok) {
        // Reset form for next receipt
        setGRem("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStage5Close = async () => {
    setIsSubmitting(true);
    try {
      const ok = await closeReceiptStage(record.id, shortWhy);
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStage6Submit = async () => {
    if (cReq === "Yes" && (!cNo.trim() || !cAmt || num(cAmt) <= 0)) {
      toast.error("Please enter a valid credit note number and amount");
      return;
    }
    if (cReq === "No" && !cNotReqReason.trim()) {
      toast.error("Please provide a reason why credit note is not required");
      return;
    }
    if (cReq === "Yes" && num(cAmt) > basis.cap + 0.01) {
      toast.error(`Credit note amount cannot exceed approved cap of ${money(basis.cap)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await saveCreditNote(record.id, {
        required: cReq,
        status: cReq === "Yes" ? "Issued" : "Not Required",
        number: cNo,
        date: cDate,
        amount: cAmt,
        tax: cTax,
        notReqReason: cNotReqReason,
        remarks: cRem
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Stage 0{stageNum}: {stageTitle}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {record.no} · {record.customer_name || cust(record.customerId).name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ============================================================ */}
          {/* STAGE 2: APPROVAL VIEW */}
          {/* ============================================================ */}
          {stageNum === 2 && (
            <div className="space-y-5">
              {/* Decision Support Box */}
              {(() => {
                const ds = decisionSupportData();
                return (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Info className="w-4 h-4 text-indigo-500" />
                      <span>Decision Support Intelligence</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Requested Value</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {money(basis.cap)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Past Returns</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {ds.pastReturns.length}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Approved Past</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {ds.approvedPast}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Freight Terms</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {record.transportType}
                        </span>
                      </div>
                    </div>

                    {ds.flags.length > 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-100">
                          <AlertTriangle className="w-3.5 h-3.5" /> Checks & Caution Flags:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                          {ds.flags.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        No warning signs. Request is inside the return window with standard quantities.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Form Decision */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Approval Decision <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={approvalDecision}
                    onChange={(e) => {
                      const d = e.target.value;
                      setApprovalDecision(d);
                      if (d === "Approved") {
                        const allFull = {};
                        (record.items || []).forEach((i) => (allFull[i.key || i.item_key] = i.reqQty));
                        setApprovedQtys(allFull);
                      } else if (d === "Rejected") {
                        const allZero = {};
                        (record.items || []).forEach((i) => (allZero[i.key || i.item_key] = 0));
                        setApprovedQtys(allZero);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden font-bold"
                  >
                    <option value="Approved">Approved (Full Quantity)</option>
                    <option value="Partially Approved">Partially Approved (Adjusted Quantities)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Quantities Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Requested</th>
                        <th className="py-2.5 px-3 text-right">Approved Qty</th>
                        <th className="py-2.5 px-3 text-right">Rejected Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(record.items || []).map((i) => {
                        const k = i.key || i.item_key;
                        const pr = prod(i.productId);
                        const currAppr = approvedQtys[k] != null ? approvedQtys[k] : i.reqQty;
                        const rej = round(i.reqQty - currAppr);
                        return (
                          <tr key={k}>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold block">{pr.name}</span>
                              <span className="text-[11px] text-slate-400">Inv: {i.invoiceNo}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">{qty(i.reqQty, pr.uom)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={i.reqQty}
                                step="any"
                                disabled={approvalDecision === "Rejected"}
                                value={currAppr}
                                onChange={(e) => {
                                  const val = num(e.target.value);
                                  setApprovedQtys((p) => ({ ...p, [k]: val }));
                                }}
                                className="w-24 text-right text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-500 font-semibold">
                              {qty(rej, pr.uom)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {approvalDecision !== "Approved" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Decision Remarks & Justification <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      placeholder="Why is this return rejected or partially approved?..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 3: DEBIT NOTE VIEW */}
          {/* ============================================================ */}
          {stageNum === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-100 flex items-center justify-between">
                <span>Total Approved Return Value:</span>
                <span className="font-extrabold text-sm">{money(basis.cap)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Is Debit Note Required from Customer?
                </label>
                <select
                  value={debitReq}
                  onChange={(e) => setDebitReq(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                >
                  <option value="Yes">Yes, customer debit note required</option>
                  <option value="No">No, debit note not required for this return</option>
                </select>
              </div>

              {debitReq === "Yes" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Debit Note Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={debitNo}
                      onChange={(e) => setDebitNo(e.target.value)}
                      placeholder="e.g. DN/C1001/201"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Debit Note Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={debitDate}
                      onChange={(e) => setDebitDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Debit Note Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={debitAmt}
                      onChange={(e) => setDebitAmt(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tax Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={debitTax}
                      onChange={(e) => setDebitTax(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={debitRemarks}
                      onChange={(e) => setDebitRemarks(e.target.value)}
                      placeholder="Optional notes from accounts..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason Debit Note Not Required <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={debitNotReqReason}
                    onChange={(e) => setDebitNotReqReason(e.target.value)}
                    placeholder="Provide justification..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 4: VEHICLE & LOGISTICS */}
          {/* ============================================================ */}
          {stageNum === 4 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl text-xs space-y-1">
                <span className="font-bold text-violet-900 dark:text-violet-100">
                  Freight Terms: {record.transportType}
                </span>
                <p className="text-violet-700 dark:text-violet-300 text-[11px]">
                  {TT_HINT[record.transportType]}
                </p>
              </div>

              {/* Legs */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Leg 1: {record.transportType === "FOR" ? "Customer Vehicle" : "Primary Transport"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Transporter Name</label>
                      <input
                        type="text"
                        value={tName}
                        onChange={(e) => setTName(e.target.value)}
                        placeholder="e.g. Own fleet or VRL Logistics"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">
                        Vehicle Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tVeh}
                        onChange={(e) => setTVeh(e.target.value)}
                        placeholder="CG04 AB 1234"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Driver Name</label>
                      <input
                        type="text"
                        value={tDrv}
                        onChange={(e) => setTDrv(e.target.value)}
                        placeholder="Driver full name"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Driver Mobile</label>
                      <input
                        type="tel"
                        value={tMob}
                        onChange={(e) => setTMob(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Pickup / Dispatch Date</label>
                      <input
                        type="date"
                        value={tDate}
                        onChange={(e) => setTDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    {record.transportType === "Ex-Factory at transport office" && (
                      <div>
                        <label className="block font-semibold mb-1">Transport Office Hub</label>
                        <input
                          type="text"
                          value={tOffice}
                          onChange={(e) => setTOffice(e.target.value)}
                          placeholder="e.g. VRL Logistics, Bhilai"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {record.transportType === "Ex-Factory at transport office" && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Leg 2: Factory Pickup from Transport Office
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold mb-1">Our Transporter</label>
                        <input
                          type="text"
                          value={uName}
                          onChange={(e) => setUName(e.target.value)}
                          placeholder="e.g. Own fleet"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Our Vehicle Number</label>
                        <input
                          type="text"
                          value={uVeh}
                          onChange={(e) => setUVeh(e.target.value)}
                          placeholder="CG04 MK 2231"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Pickup Date from Office</label>
                        <input
                          type="date"
                          value={uDate}
                          onChange={(e) => setUDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Logistics Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Expected Arrival Date</label>
                    <input
                      type="date"
                      value={tExp}
                      onChange={(e) => setTExp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Transport Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tCost}
                      onChange={(e) => setTCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Bilty Required?</label>
                    <select
                      value={tBiltyReq}
                      onChange={(e) => setTBiltyReq(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  {tBiltyReq === "Yes" && (
                    <div>
                      <label className="block font-semibold mb-1">
                        Bilty Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tBilty}
                        onChange={(e) => setTBilty(e.target.value)}
                        placeholder="e.g. BLT/26/410"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">Logistics Remarks</label>
                    <input
                      type="text"
                      value={tRem}
                      onChange={(e) => setTRem(e.target.value)}
                      placeholder="Any tracking notes..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 5: MATERIAL RECEIPT & QC */}
          {/* ============================================================ */}
          {stageNum === 5 && (
            <div className="space-y-5">
              {/* Existing Receipts List */}
              {(record.receipts || []).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recorded Material Receipts (GRNs)
                  </h4>
                  {(record.receipts || []).map((rc, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2"
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {rc.grn} · {fdate(rc.date)}
                        </span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-semibold ${
                            rc.qcStatus === "Passed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            QC {rc.qcStatus}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {rc.invStatus}
                          </span>
                        </div>
                      </div>

                      {/* Receipt lines breakdown */}
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        {(rc.lines || []).map((l, lIdx) => {
                          const it = (record.items || []).find((i) => (i.key || i.item_key) === (l.key || l.item_key));
                          const pr = prod(it?.productId);
                          return (
                            <div key={lIdx} className="flex justify-between py-0.5">
                              <span>{pr.name}</span>
                              <span className="font-semibold">
                                {qty(l.recv, pr.uom)} (Accepted: {qty(l.accept, pr.uom)}, Scrap: {qty(l.scrap, pr.uom)})
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {!rc.posted && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => postStock(record.id, rc.grn)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                          >
                            Post Stock to ERP
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New Receipt Form */}
              <div className="p-4 border border-dashed border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Record Material Inward & QC
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Received Date</label>
                    <input
                      type="date"
                      value={gDate}
                      onChange={(e) => setGDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">QC Inspection Status</label>
                    <select
                      value={gQc}
                      onChange={(e) => setGQc(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="Passed">Passed (Accepted to Stock)</option>
                      <option value="Partially Passed">Partially Passed</option>
                      <option value="Failed">Failed (Moved to Scrap/Reject)</option>
                    </select>
                  </div>
                </div>

                {/* Items received allocation */}
                <div className="space-y-2 text-xs">
                  {(record.items || []).map((i) => {
                    const k = i.key || i.item_key;
                    const pr = prod(i.productId);
                    const bal = Math.max(0, round((i.apprQty || 0) - itemTotals(record, i).recv));
                    const lineState = receiptLines[k] || { recv: bal, dest: pr.stockType, sub: pr.sub };

                    return (
                      <div
                        key={k}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span>{pr.name}</span>
                          <span className="text-slate-400">Bal: {qty(bal, pr.uom)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">Received Qty</span>
                            <input
                              type="number"
                              min="0"
                              max={bal}
                              step="any"
                              value={lineState.recv || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setReceiptLines((p) => ({
                                  ...p,
                                  [k]: { ...p[k], recv: v }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">Stock Allocation</span>
                            <select
                              value={lineState.dest || pr.stockType}
                              onChange={(e) => {
                                const v = e.target.value;
                                setReceiptLines((p) => ({
                                  ...p,
                                  [k]: { ...p[k], dest: v }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                            >
                              <option value="FG">FG (FG Yard)</option>
                              <option value="Semi-FG">Semi-FG (Semi-FG Bay)</option>
                              <option value="Raw Material">Raw Material (RM Store)</option>
                              <option value="Scrap">Scrap (Scrap Yard)</option>
                              <option value="Reject">Reject (Non-Stock)</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">Sub-Category</span>
                            <select
                              value={lineState.sub || pr.sub}
                              onChange={(e) => {
                                const v = e.target.value;
                                setReceiptLines((p) => ({
                                  ...p,
                                  [k]: { ...p[k], sub: v }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                            >
                              {SUBCATS.map((sc) => (
                                <option key={sc} value={sc}>
                                  {sc}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">QC Remarks</label>
                  <input
                    type="text"
                    value={gRem}
                    onChange={(e) => setGRem(e.target.value)}
                    placeholder="Inspection findings..."
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleStage5ReceiptSubmit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
                  >
                    Save GRN Receipt
                  </button>
                </div>
              </div>

              {/* Close Stage 5 short-close option */}
              {(record.receipts || []).length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Ready to close Material Receipt stage?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ensure all recorded receipts have their stock posted. If closing short, please specify reason.
                  </p>
                  <input
                    type="text"
                    value={shortWhy}
                    onChange={(e) => setShortWhy(e.target.value)}
                    placeholder="Short-close reason (if less than approved arrived)..."
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleStage5Close}
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs hover:opacity-90"
                    >
                      Close Receipt & Send to Accounts
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 6: ISSUE CREDIT NOTE */}
          {/* ============================================================ */}
          {stageNum === 6 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">Accepted Value</span>
                  <span className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100">
                    {money(basis.base)}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">GST on Accepted</span>
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                    {money(basis.tax)}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">Max Allowed Cap</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {money(basis.cap)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Is Credit Note Required?
                </label>
                <select
                  value={cReq}
                  onChange={(e) => setCReq(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Yes">Yes, issue credit note</option>
                  <option value="No">No, close without credit note</option>
                </select>
              </div>

              {cReq === "Yes" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Credit Note Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cNo}
                      onChange={(e) => setCNo(e.target.value)}
                      placeholder="e.g. CN/26-27/101"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Credit Note Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={cDate}
                      onChange={(e) => setCDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Credit Note Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      max={basis.cap}
                      value={cAmt}
                      onChange={(e) => setCAmt(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tax Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cTax}
                      onChange={(e) => setCTax(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={cRem}
                      onChange={(e) => setCRem(e.target.value)}
                      placeholder="Optional credit note remarks..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason Credit Note Not Issued <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={cNotReqReason}
                    onChange={(e) => setCNotReqReason(e.target.value)}
                    placeholder="Provide justification..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>

          {stageNum === 2 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleStage2Submit}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              Submit Approval Decision
            </button>
          )}

          {stageNum === 3 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleStage3Submit}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              Save & Send to Logistics
            </button>
          )}

          {stageNum === 4 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleStage4Submit}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              Dispatch & Send to Store
            </button>
          )}

          {stageNum === 6 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleStage6Submit}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              Issue Credit Note & Complete Return
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
