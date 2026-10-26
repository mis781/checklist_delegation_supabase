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
  Info,
  Eye
} from "lucide-react";
import toast from "react-hot-toast";
import {
  MASTERS,
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
  returnValue,
  initials,
  sumItems,
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
    currentUser,
    canStage
  } = useOrderReturn();

  const record = useMemo(() => {
    return returns.find((r) => r.id === returnId) || null;
  }, [returns, returnId]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

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

  const isClosed = ["Rejected", "Cancelled", "Completed"].includes(record.status);
  const isStage2Editable = !isClosed && record.status !== "On Hold" && record.stage === 2 && (canStage ? canStage(2) : true);

  // Decision Support for Stage 2
  const decisionSupportData = () => {
    const custId = record.customerId || record.customer_id;
    const cObj = cust(custId);
    const others = returns.filter((x) => x.id !== record.id && (x.customerId || x.customer_id) === custId && x.status !== "Draft");
    const rej = others.filter((x) => x.status === "Rejected").length;
    const appr = others.filter((x) => ["Approved", "Partially Approved"].includes(x.approval?.status)).length;
    const recent = others.filter((x) => {
      const d = daysBetween(x.date, record.date);
      return d >= 0 && d <= 90;
    }).length;
    const credit = others
      .filter((x) => x.credit?.status === "Issued")
      .reduce((s, x) => s + num(x.credit?.amount || 0), 0);
    const invValue = MASTERS.invoices
      .filter((i) => i.customerId === custId)
      .reduce((s, i) => s + (i.items || []).reduce((a, it) => a + (it.qty || 0) * (it.price || 0), 0), 0);

    const flags = [];
    let totalVal = 0;
    let totalGst = 0;

    const lines = (record.items || []).map((i) => {
      const it = invItem(i.invoiceNo, i.productId);
      const p = prod(i.productId);
      const prev = round(committedQty(returns, i.invoiceNo, i.productId, record.id));
      const pct = it.qty ? Math.round(((prev + i.reqQty) / it.qty) * 100) : 0;
      const d = daysBetween(i.invoiceDate, record.date);
      const price = it.price || i.price || p.price || 0;
      const v = round((i.reqQty || 0) * price, 2);
      totalVal += v;
      totalGst += (v * (p.gst || 0)) / 100;

      if (d > RETURN_DAYS) {
        flags.push(`${p.name}: invoice is ${d} days old, beyond the ${RETURN_DAYS}-day return window.`);
      }
      if (!(i.attachments || []).length) {
        flags.push(`${p.name}: no photo or document attached.`);
      }
      if (pct >= 50) {
        flags.push(`${p.name}: ${pct}% of the invoiced quantity would come back.`);
      }
      return { i, it, p, prev, pct, d, v, price };
    });

    if (recent) {
      flags.push(`${cObj.name} raised ${recent} other return${recent > 1 ? "s" : ""} in the 90 days before this one.`);
    }
    if (rej) {
      flags.push(`${rej} earlier return${rej > 1 ? "s were" : " was"} rejected for this customer.`);
    }

    const invs = new Set((record.items || []).map((i) => i.invoiceNo));
    const same = others.filter((x) => (x.items || []).some((i) => invs.has(i.invoiceNo)));

    return { cObj, others, rej, appr, recent, credit, invValue, flags, totalVal, totalGst, lines, same };
  };

  const handleQtyChange = (itemKey, rawVal) => {
    const val = rawVal === "" ? "" : num(rawVal);
    const updated = { ...approvedQtys, [itemKey]: val };
    setApprovedQtys(updated);

    const allZero = (record.items || []).every((i) => {
      const k = i.key || i.item_key;
      const v = updated[k] != null ? updated[k] : i.reqQty;
      return num(v) <= 0;
    });
    const anyPartial = (record.items || []).some((i) => {
      const k = i.key || i.item_key;
      const v = updated[k] != null ? updated[k] : i.reqQty;
      return num(v) < i.reqQty;
    });

    if (allZero) {
      setApprovalDecision("Rejected");
    } else if (anyPartial) {
      setApprovalDecision("Partially Approved");
    } else {
      setApprovalDecision("Approved");
    }
  };

  const handleDecisionChange = (dec) => {
    setApprovalDecision(dec);
    if (dec === "Approved") {
      const allFull = {};
      (record.items || []).forEach((i) => {
        allFull[i.key || i.item_key] = i.reqQty;
      });
      setApprovedQtys(allFull);
    } else if (dec === "Rejected") {
      const allZero = {};
      (record.items || []).forEach((i) => {
        allZero[i.key || i.item_key] = 0;
      });
      setApprovedQtys(allZero);
    }
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col rounded-2xl max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Stage 0{stageNum}: {stageTitle}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {record.no} · {record.customer_name || cust(record.customerId || record.customer_id).name}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Progress & Summary Chips (Matches demo UI .dr-sum) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
            {/* Stage Progress Dots 1..6 */}
            <div className="flex items-center w-full px-2" aria-label="Stage progress">
              {STAGES.map((stName, idx) => {
                const k = idx + 1;
                const isStop = record.status === "Rejected" && k === 2;
                const isDone = isStop ? false : k < record.stage || record.stage > 6;
                const isCur = k === record.stage;
                const isMe = k === stageNum;
                return (
                  <React.Fragment key={k}>
                    {idx > 0 && (
                      <div className={`flex-1 h-0.5 mx-1.5 ${k <= record.stage ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                    )}
                    <div
                      title={`Stage ${k}: ${stName}`}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                        isStop
                          ? "bg-rose-600 text-white"
                          : isDone
                          ? "bg-emerald-600 text-white"
                          : isCur
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      } ${isMe && !isCur ? "ring-2 ring-indigo-500" : ""}`}
                    >
                      {k}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs border ${
                  record.status === "Completed" || record.status === "Approved"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : record.status === "Rejected" || record.status === "Cancelled"
                    ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                    : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                }`}
              >
                {record.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                {(record.items || []).length} product{(record.items || []).length > 1 ? "s" : ""}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                {money(returnValue(record))}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                {record.transportType}
              </span>
            </div>

            {record.status === "On Hold" && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold">
                On hold: {record.holdReason || "Return placed on hold"}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* STAGE 2: APPROVAL VIEW */}
          {/* ============================================================ */}
          {stageNum === 2 && (
            <div className="space-y-5">
              {/* Lock Warning if stage is not editable */}
              {!isStage2Editable && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                  {isClosed
                    ? `This return is ${record.status.toLowerCase()}. Details are read-only.`
                    : record.status === "On Hold"
                    ? `On hold: ${record.holdReason || "Paused"}. Resume it to make changes.`
                    : record.stage < 2
                    ? `This stage opens after ${STAGES[record.stage - 1]} is complete.`
                    : `Only ${STAGE_OWNER[2]} or Management can edit this stage.`}
                </div>
              )}

              {/* Decision Support Intelligence Box */}
              {(() => {
                const ds = decisionSupportData();
                return (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Info className="w-4 h-4 text-indigo-500" />
                      <span>Decision Support Intelligence</span>
                    </div>

                    {/* 4 Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {/* 1. Return Value */}
                      <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Return value</span>
                        <b className="font-bold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">
                          {money(ds.totalVal)}
                        </b>
                        <small className="text-[11px] text-slate-400 block mt-0.5">
                          + GST {money(ds.totalGst)}
                        </small>
                      </div>

                      {/* 2. Customer's Past Returns */}
                      <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Customer’s past returns</span>
                        <b className="font-bold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">
                          {ds.others.length}
                        </b>
                        <small className="text-[11px] text-slate-400 block mt-0.5">
                          {ds.appr} approved, {ds.rej} rejected
                        </small>
                      </div>

                      {/* 3. Credit Notes So Far */}
                      <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Credit notes so far</span>
                        <b className="font-bold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">
                          {money(ds.credit)}
                        </b>
                        <small className="text-[11px] text-slate-400 block mt-0.5">
                          Invoiced {money(ds.invValue)}
                        </small>
                      </div>

                      {/* 4. Freight Terms */}
                      <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-slate-400 text-[11px] block">Freight terms</span>
                        <b className="font-bold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">
                          {record.transportType}
                        </b>
                        <small className="text-[11px] text-slate-400 block mt-0.5 truncate" title={TT_HINT[record.transportType]}>
                          {TT_HINT[record.transportType] || ""}
                        </small>
                      </div>
                    </div>

                    {/* Caution Flags / Warning Signs */}
                    {ds.flags.length > 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-100 space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-100">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Check before deciding:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800 dark:text-amber-200">
                          {ds.flags.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span><b>No warning signs.</b> Within the return window, evidence attached and a normal quantity.</span>
                      </div>
                    )}

                    {/* Product Line Breakdown Cards (.lines) */}
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ds.lines.map(({ i, it, p, prev, pct, d, v, price }) => (
                          <div
                            key={i.key || i.item_key}
                            className="p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5 shadow-2xs"
                          >
                            {/* Line Header */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-extrabold text-xs shrink-0">
                                {initials(p.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <b className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                  {p.name}
                                </b>
                                <small className="text-[11px] text-slate-400 block">
                                  {i.invoiceNo}, {d} days after invoice
                                </small>
                              </div>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shrink-0">
                                {i.reason || "—"}
                              </span>
                            </div>

                            {/* 6-cell Meta Grid */}
                            <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-[11px]">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Requested</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{qty(i.reqQty, p.uom)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Invoiced</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{qty(it.qty, p.uom)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Earlier returns</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{qty(prev, p.uom)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Rate</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{money(price)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Value</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{money(v)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Total returned</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{pct}% of invoice</span>
                              </div>
                            </div>

                            {/* Note */}
                            {i.note && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/30 p-2 rounded-md">
                                Note: {i.note}
                              </p>
                            )}

                            {/* Photos and documents */}
                            <div className="space-y-1">
                              <span className="text-[11px] text-slate-400 block font-medium">Photos and documents</span>
                              {(i.attachments || []).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {(i.attachments || []).map((att, attIdx) => (
                                    <button
                                      key={attIdx}
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                      <span className="max-w-[120px] truncate">{att.name}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No attachments</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Same Invoice earlier returns */}
                      {ds.same.length > 0 && (
                        <p className="text-xs text-slate-500 italic mt-2">
                          Earlier returns on the same invoice:{" "}
                          {ds.same.map((x) => `${x.no} (${x.status})`).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Form Decision: Editable vs Read-only */}
              {isStage2Editable ? (
                <div className="p-4 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Your Decision
                  </h3>

                  {/* 3-column Grid matching Order Return (1).html */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Approval status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={approvalDecision}
                        onChange={(e) => handleDecisionChange(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden font-bold"
                      >
                        <option value="Approved">Approved</option>
                        <option value="Partially Approved">Partially Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Approver
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={currentUser?.name || "Anita Verma"}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 cursor-not-allowed font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Date
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={fdate(today())}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>

                  {/* Quantities Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-3">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3 text-right">Requested</th>
                          <th className="py-2.5 px-3 text-right">Approved qty</th>
                          <th className="py-2.5 px-3 text-right">Rejected</th>
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
                                <span className="font-bold block text-slate-900 dark:text-slate-100">{pr.name}</span>
                                <span className="text-[11px] text-slate-400">{i.invoiceNo}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                                {qty(i.reqQty, pr.uom)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  max={i.reqQty}
                                  step="any"
                                  disabled={approvalDecision === "Rejected"}
                                  value={currAppr}
                                  onChange={(e) => handleQtyChange(k, e.target.value)}
                                  aria-label={`Approved quantity for ${pr.name}`}
                                  className="w-24 text-right text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-500">
                                {qty(rej, pr.uom)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-400 italic -mt-1">
                    Lower a quantity to approve only part of it.
                  </p>

                  {/* Remarks Box (shown if not Approved) */}
                  {approvalDecision !== "Approved" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Remarks <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={approvalRemarks}
                        onChange={(e) => setApprovalRemarks(e.target.value)}
                        placeholder={
                          approvalDecision === "Rejected"
                            ? "Why is this return rejected?"
                            : "Why is only part approved?"
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Read-only Decision View when already decided */
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Status</span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs border mt-0.5 ${
                          record.approval?.status === "Approved"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : record.approval?.status === "Rejected"
                            ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {record.approval?.status || record.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Decided by</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {record.approval?.by || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {fdate(record.approval?.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Approved Value</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block mt-0.5">
                        {money(creditBasis(record).cap)}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <span className="text-slate-400 block text-[11px]">Remarks</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                        {record.approval?.reason || record.approval?.remarks || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-3">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Invoice</th>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3 text-right">Requested</th>
                          <th className="py-2.5 px-3 text-right">Approved</th>
                          <th className="py-2.5 px-3 text-right">Rejected</th>
                          <th className="py-2.5 px-3 text-right">UOM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(record.items || []).map((i) => {
                          const pr = prod(i.productId);
                          return (
                            <tr key={i.key || i.item_key}>
                              <td className="py-2 px-3 font-mono">{i.invoiceNo}</td>
                              <td className="py-2 px-3 font-semibold">{pr.name}</td>
                              <td className="py-2 px-3 text-right font-medium">{qf.format(i.reqQty)}</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {i.apprQty != null ? qf.format(i.apprQty) : "—"}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-rose-500">
                                {i.rejQty != null ? qf.format(i.rejQty) : "—"}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-400">{pr.uom}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

          {stageNum === 2 && isStage2Editable && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleStage2Submit}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
            >
              Submit decision
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

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                {previewAttachment.name}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden min-h-[180px]">
              {previewAttachment.url && (previewAttachment.url.startsWith("data:image") || previewAttachment.url.startsWith("http") || previewAttachment.type?.includes("image")) ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[60vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <FileText className="w-12 h-12 text-indigo-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {previewAttachment.name}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
