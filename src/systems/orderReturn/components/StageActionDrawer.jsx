import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
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
  today,
  destText
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
  const [debitNo, setDebitNo] = useState("");
  const [debitDate, setDebitDate] = useState(today());
  const [debitAmt, setDebitAmt] = useState("");
  const [debitRemarks, setDebitRemarks] = useState("");
  const [debitAttachments, setDebitAttachments] = useState([]);

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
  const [veh1Attachments, setVeh1Attachments] = useState([]);
  const [veh2Attachments, setVeh2Attachments] = useState([]);
  const [transportAttachments, setTransportAttachments] = useState([]);

  // Stage 5 state
  const [gDate, setGDate] = useState(today());
  const [gQc, setGQc] = useState("Passed");
  const [gRem, setGRem] = useState("");
  const [receiptLines, setReceiptLines] = useState({});
  const [shortWhy, setShortWhy] = useState("");
  const [pendingRcvAtt, setPendingRcvAtt] = useState([]);
  const [pendingQcAtt, setPendingQcAtt] = useState([]);

  // Stage 6 state
  const [cReq, setCReq] = useState("Yes");
  const [cNo, setCNo] = useState("");
  const [cDate, setCDate] = useState(today());
  const [cAmt, setCAmt] = useState("");
  const [cTax, setCTax] = useState("");
  const [cNotReqReason, setCNotReqReason] = useState("");
  const [cRem, setCRem] = useState("");
  const [creditAttachments, setCreditAttachments] = useState([]);

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
      setDebitNo(d.number || "");
      setDebitDate(d.date || today());
      setDebitAmt(d.amount !== "" && d.amount != null ? d.amount : "");
      setDebitRemarks(d.remarks || "");
      setDebitAttachments(record.attachments?.debit || []);
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
      setVeh1Attachments(record.attachments?.veh1 || []);
      setVeh2Attachments(record.attachments?.veh2 || []);
      setTransportAttachments(record.attachments?.transport || []);
    } else if (stageNum === 5) {
      setGDate(today());
      setGQc("Passed");
      setGRem("");
      setShortWhy("");
      setPendingRcvAtt([]);
      setPendingQcAtt([]);
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
      setCreditAttachments(record.attachments?.credit || []);
    }
  }, [record, open, stageNum]);

  if (!open || !record) return null;

  const stageTitle = STAGES[stageNum - 1] || "Stage Action";
  const basis = creditBasis(record);

  const isClosed = ["Rejected", "Cancelled", "Completed"].includes(record.status);
  const isStage2Editable = !isClosed && record.status !== "On Hold" && record.stage === 2 && (canStage ? canStage(2) : true);
  const isStage4Editable = !isClosed && record.status !== "On Hold" && record.stage === 4 && (canStage ? canStage(4) : true);
  const isStage5Editable = !isClosed && record.status !== "On Hold" && record.stage === 5 && (canStage ? canStage(5) : true);
  const isStage6Editable = !isClosed && record.status !== "On Hold" && record.stage === 6 && (canStage ? canStage(6) : true);

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

  const handleDebitFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newAtts = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f)
    }));
    setDebitAttachments((prev) => [...prev, ...newAtts]);
  };

  const handleStage3Submit = async () => {
    if (!debitNo.trim()) {
      toast.error("Enter the debit note number");
      return;
    }
    if (!debitDate) {
      toast.error("Enter the debit note date");
      return;
    }
    if (!debitAmt || num(debitAmt) <= 0) {
      toast.error("Enter a debit note amount above zero");
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await saveDebitNote(record.id, {
        required: "Yes",
        status: "Received",
        number: debitNo,
        date: debitDate,
        amount: debitAmt,
        submittedBy: currentUser?.name || "Rakesh Sharma",
        remarks: debitRemarks,
        attachments: debitAttachments
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransportFileUpload = (e, targetKey) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newAtts = files.map((f) => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      url: URL.createObjectURL(f)
    }));
    if (targetKey === "veh1") {
      setVeh1Attachments((prev) => [...prev, ...newAtts]);
    } else if (targetKey === "veh2") {
      setVeh2Attachments((prev) => [...prev, ...newAtts]);
    } else if (targetKey === "transport") {
      setTransportAttachments((prev) => [...prev, ...newAtts]);
    }
    toast.success(`${files.length} file(s) added`);
    e.target.value = "";
  };

  const handleStage5FileUpload = (e, type) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newAtts = files.map((f) => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      url: URL.createObjectURL(f)
    }));
    if (type === "rcv") {
      setPendingRcvAtt((prev) => [...prev, ...newAtts]);
    } else {
      setPendingQcAtt((prev) => [...prev, ...newAtts]);
    }
    toast.success(`${files.length} file(s) added`);
    e.target.value = "";
  };

  const handleCreditFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newAtts = files.map((f) => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      url: URL.createObjectURL(f)
    }));
    setCreditAttachments((prev) => [...prev, ...newAtts]);
    toast.success(`${files.length} file(s) added`);
    e.target.value = "";
  };

  const handleStage4Submit = async () => {
    const mode = TT_MODE[record.transportType] || record.transport?.mode || "Company Vehicle";
    const two = mode === "Two-leg";
    const ca = mode === "Customer Arranged";
    const badMob = (m) => m && !/^[+\d][\d\s-]{7,15}$/.test(m.trim());

    if (ca || two) {
      if (!tVeh?.trim()) {
        toast.error(two ? "Leg 1: enter the customer’s vehicle number." : "Enter the vehicle number the customer is sending.");
        return;
      }
    } else {
      if (!tName?.trim()) {
        toast.error("Enter the transport name.");
        return;
      }
      if (!tVeh?.trim()) {
        toast.error("Enter the vehicle number.");
        return;
      }
      if (!tDrv?.trim()) {
        toast.error("Enter the driver name.");
        return;
      }
    }

    if (badMob(tMob)) {
      toast.error("Enter a valid driver mobile number.");
      return;
    }

    if (!tDate) {
      toast.error(two ? "Leg 1: enter the drop date at the transport office." : "Enter the pickup / dispatch date.");
      return;
    }

    if (two) {
      if (!tOffice?.trim()) {
        toast.error("Leg 1: enter the transport office name.");
        return;
      }
      if (!uName?.trim()) {
        toast.error("Leg 2: enter the transport name.");
        return;
      }
      if (!uVeh?.trim()) {
        toast.error("Leg 2: enter our vehicle number.");
        return;
      }
      if (!uDrv?.trim()) {
        toast.error("Leg 2: enter the driver name.");
        return;
      }
      if (badMob(uMob)) {
        toast.error("Leg 2: enter a valid driver mobile number.");
        return;
      }
      if (!uDate) {
        toast.error("Leg 2: enter the pickup date from the office.");
        return;
      }
      if (tDate && uDate < tDate) {
        toast.error("Leg 2 pickup can’t be before the leg 1 drop date.");
        return;
      }
    }

    if (tBiltyReq === "Yes" && !tBilty?.trim()) {
      toast.error("Enter the bilty number. It’s required when bilty is set to Yes.");
      return;
    }

    if (tExp && tDate && tExp < tDate) {
      toast.error("Expected delivery date can’t be before the pickup date.");
      return;
    }

    if (tCost !== "" && num(tCost) < 0) {
      toast.error("Transport cost can’t be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
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
          two
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
        remarks: tRem,
        veh1Attachments,
        veh2Attachments,
        transportAttachments
      };
      const ok = await saveTransport(record.id, payload);
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStage5ReceiptSubmit = async () => {
    const isFailed = gQc === "Failed";
    const lines = Object.entries(receiptLines).map(([key, val]) => {
      const it = (record.items || []).find((i) => (i.key || i.item_key) === key);
      const pr = prod(it?.productId);
      const recv = round(num(val.recv));
      const dest = val.dest || (isFailed ? "Scrap" : pr.stockType);
      const isOk = !isFailed && dest !== "Scrap" && dest !== "Reject";
      return {
        key,
        item_key: key,
        recv,
        accept: isOk ? recv : 0,
        reject: dest === "Reject" ? recv : 0,
        scrap: dest === "Scrap" ? recv : 0,
        condition: isOk ? "Good" : dest === "Scrap" ? "Damaged" : "Defective",
        stockType: isOk ? dest : pr.stockType,
        warehouse: isOk ? DEST_WH[dest] || "FG Yard" : dest === "Scrap" ? "Scrap Yard" : "",
        subCat: val.sub || pr.sub
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
        lines,
        rcvAttachments: pendingRcvAtt,
        attachments: pendingQcAtt
      });
      if (ok) {
        setGRem("");
        setPendingRcvAtt([]);
        setPendingQcAtt([]);
        toast.success("Receipt saved successfully");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStage5Close = async () => {
    if (record.receipts?.some((x) => !x.posted)) {
      toast.error("Post stock for every receipt before closing.");
      return;
    }
    const recv = round((record.items || []).reduce((s, i) => s + itemTotals(record, i).recv, 0));
    const appr = sumItems(record, (i) => i.apprQty || 0);
    if (recv < appr && !shortWhy.trim()) {
      toast.error("Some approved quantity hasn’t arrived. Enter a reason to close receipt short.");
      return;
    }
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
        remarks: cRem,
        creditAttachments
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
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{
                color:
                  stageNum === 1
                    ? "#1b2466"
                    : stageNum === 2
                    ? "#4338ca"
                    : stageNum === 3
                    ? "#6d28d9"
                    : stageNum === 4
                    ? "#0891b2"
                    : stageNum === 5
                    ? "#059669"
                    : "#b45309"
              }}
            >
              Stage {stageNum}: {stageTitle}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {record.no}, {record.customer_name || cust(record.customerId || record.customer_id).name}
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
                      <div className="flex-1 h-0.5 mx-1.5 bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div
                      title={`Stage ${k}: ${stName}`}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                        isStop
                          ? "bg-rose-600 text-white"
                          : isDone
                          ? "bg-emerald-600 text-white"
                          : isCur
                          ? "bg-blue-600 text-white shadow-[0_0_0_3px_#fff,0_0_0_5px_#2563eb] dark:shadow-[0_0_0_3px_#1e293b,0_0_0_5px_#3b82f6]"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      } ${isMe && !isCur ? "ring-2 ring-blue-500" : ""}`}
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
                    : record.status === "In Progress"
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
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
            <div className="p-5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4">
              {/* Row 1: 3 columns (Debit note number, Debit note date, Debit note amount) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Debit note number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={debitNo}
                    onChange={(e) => setDebitNo(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Debit note date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={debitDate}
                    onChange={(e) => setDebitDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Debit note amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={debitAmt}
                    onChange={(e) => setDebitAmt(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 2: Submitted by (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Submitted by
                </label>
                <input
                  type="text"
                  readOnly
                  value={record.debit?.submittedBy || currentUser?.name || "Rakesh Sharma"}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                />
              </div>

              {/* Row 3: Remarks (Textarea) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Remarks
                </label>
                <textarea
                  rows={3}
                  value={debitRemarks}
                  onChange={(e) => setDebitRemarks(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden resize-y min-h-[72px]"
                />
              </div>

              {/* Row 4: Debit note copy (Attachments) */}
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Debit note copy
                </h4>
                {(debitAttachments.length > 0 || (record.attachments?.debit || []).length > 0) ? (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {[...(record.attachments?.debit || []), ...debitAttachments].map((att, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="truncate max-w-[150px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No attachments.</p>
                )}
                <div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleDebitFileUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Button directly below form (as in reference dummy) */}
              {record.stage === 3 && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleStage3Submit}
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                  >
                    Save and send to logistics
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* ============================================================ */}
          {/* STAGE 4: VEHICLE & LOGISTICS */}
          {/* ============================================================ */}
          {stageNum === 4 && (() => {
            const mode = TT_MODE[record.transportType] || record.transport?.mode || "Company Vehicle";
            const two = mode === "Two-leg";
            const ca = mode === "Customer Arranged";

            return (
              <div className="space-y-4">
                {/* Lock Note if not editable */}
                {!isStage4Editable && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                    {isClosed
                      ? `This return is ${record.status.toLowerCase()}. Details are read-only.`
                      : record.status === "On Hold"
                      ? `On hold: ${record.holdReason || "Paused"}. Resume it to make changes.`
                      : record.stage < 4
                      ? `This stage opens after ${STAGES[record.stage - 1]} is complete.`
                      : `Only Logistics or Management can edit this stage.`}
                  </div>
                )}

                {/* Freight Terms Box (.tt-note) */}
                <div className="p-3.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl text-xs space-y-0.5">
                  <b className="font-bold text-cyan-800 dark:text-cyan-300 block text-xs">
                    {record.transportType}
                  </b>
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
                    {TT_HINT[record.transportType] || ""}
                  </span>
                </div>

                {/* Leg 1 Card */}
                <div className="border border-slate-200 dark:border-slate-700 border-l-4 border-l-cyan-600 rounded-2xl p-4 bg-white dark:bg-slate-800/60 space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </span>
                    <div>
                      <b className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                        {two ? "Customer’s vehicle" : ca ? "Customer’s vehicle" : "Our vehicle"}
                      </b>
                      <small className="text-slate-500 dark:text-slate-400 text-xs block">
                        {two
                          ? "Customer to the transport office"
                          : ca
                          ? "Customer sends the material to our factory"
                          : "From the customer to our factory, end to end"}
                      </small>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Name */}
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        {two || ca ? "Customer’s transporter" : "Transport name"}
                        {!two && !ca && <span className="text-rose-500"> *</span>}
                      </label>
                      <input
                        type="text"
                        value={tName}
                        onChange={(e) => setTName(e.target.value)}
                        readOnly={!isStage4Editable}
                        placeholder={two || ca ? "Transporter name (optional)" : "e.g. Own fleet or VRL Logistics"}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>

                    {/* Vehicle */}
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Vehicle number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tVeh}
                        onChange={(e) => setTVeh(e.target.value)}
                        readOnly={!isStage4Editable}
                        placeholder="CG04 AB 1234"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-hidden"
                      />
                    </div>

                    {/* Driver Name */}
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Driver name {!two && !ca && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={tDrv}
                        onChange={(e) => setTDrv(e.target.value)}
                        readOnly={!isStage4Editable}
                        placeholder="Driver full name"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>

                    {/* Driver Mobile */}
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Driver mobile
                      </label>
                      <input
                        type="tel"
                        value={tMob}
                        onChange={(e) => setTMob(e.target.value)}
                        readOnly={!isStage4Editable}
                        placeholder="+91 98765 43210"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        {two ? "Drop date at office" : ca ? "Dispatch date" : "Pickup date"}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={tDate}
                        onChange={(e) => setTDate(e.target.value)}
                        readOnly={!isStage4Editable}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>

                    {/* Extra office field if two-leg */}
                    {two && (
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Transport office <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={tOffice}
                          onChange={(e) => setTOffice(e.target.value)}
                          readOnly={!isStage4Editable}
                          placeholder="e.g. VRL Logistics, Bhilai"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>

                  {/* Leg 1 Attachments */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                      Vehicle photos and documents
                    </span>
                    {(veh1Attachments.length > 0 || (record.attachments?.veh1 || []).length > 0) ? (
                      <div className="flex flex-wrap gap-2 pb-1">
                        {[...(record.attachments?.veh1 || []), ...veh1Attachments].map((att, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewAttachment(att)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-600" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No attachments.</p>
                    )}
                    {isStage4Editable && (
                      <div>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => handleTransportFileUpload(e, "veh1")}
                          className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Leg 2 Card (Only if two-leg) */}
                {two && (
                  <div className="border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-600 rounded-2xl p-4 bg-white dark:bg-slate-800/60 space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        2
                      </span>
                      <div>
                        <b className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                          Our vehicle
                        </b>
                        <small className="text-slate-500 dark:text-slate-400 text-xs block">
                          Transport office to our factory
                        </small>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Transport name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={uName}
                          onChange={(e) => setUName(e.target.value)}
                          readOnly={!isStage4Editable}
                          placeholder="e.g. Own fleet"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Vehicle number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={uVeh}
                          onChange={(e) => setUVeh(e.target.value)}
                          readOnly={!isStage4Editable}
                          placeholder="CG04 MK 2231"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Driver name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={uDrv}
                          onChange={(e) => setUDrv(e.target.value)}
                          readOnly={!isStage4Editable}
                          placeholder="Driver full name"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Driver mobile
                        </label>
                        <input
                          type="tel"
                          value={uMob}
                          onChange={(e) => setUMob(e.target.value)}
                          readOnly={!isStage4Editable}
                          placeholder="+91 98765 43210"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Pickup date from office <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={uDate}
                          onChange={(e) => setUDate(e.target.value)}
                          readOnly={!isStage4Editable}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Leg 2 Attachments */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                        Vehicle photos and documents
                      </span>
                      {(veh2Attachments.length > 0 || (record.attachments?.veh2 || []).length > 0) ? (
                        <div className="flex flex-wrap gap-2 pb-1">
                          {[...(record.attachments?.veh2 || []), ...veh2Attachments].map((att, idx) => (
                            <div
                              key={idx}
                              onClick={() => setPreviewAttachment(att)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="truncate max-w-[150px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No attachments.</p>
                      )}
                      {isStage4Editable && (
                        <div>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => handleTransportFileUpload(e, "veh2")}
                            className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Logistics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs pt-1">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Expected delivery date
                    </label>
                    <input
                      type="date"
                      value={tExp}
                      onChange={(e) => setTExp(e.target.value)}
                      readOnly={!isStage4Editable}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Actual delivery date
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={record.transport?.actual ? fdate(record.transport.actual) : "Filled at material receipt"}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      {ca ? "Transport cost (if we pay)" : "Transport cost (₹)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tCost}
                      onChange={(e) => setTCost(e.target.value)}
                      readOnly={!isStage4Editable}
                      placeholder="0.00"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Bilty status
                    </label>
                    <select
                      value={tBiltyReq}
                      onChange={(e) => setTBiltyReq(e.target.value)}
                      disabled={!isStage4Editable}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    <small className="text-[11px] text-slate-400 block mt-1">
                      Choose Yes if a bilty is made for this load.
                    </small>
                  </div>
                </div>

                {/* Bilty Box (shown when tBiltyReq === "Yes") */}
                {tBiltyReq === "Yes" && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Bilty number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tBilty}
                        onChange={(e) => setTBilty(e.target.value)}
                        readOnly={!isStage4Editable}
                        placeholder="e.g. BLT/26/410"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Bilty copy
                      </h4>
                      {(transportAttachments.length > 0 || (record.attachments?.transport || []).length > 0) ? (
                        <div className="flex flex-wrap gap-2 pb-1">
                          {[...(record.attachments?.transport || []), ...transportAttachments].map((att, idx) => (
                            <div
                              key={idx}
                              onClick={() => setPreviewAttachment(att)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="truncate max-w-[150px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No attachments.</p>
                      )}
                      {isStage4Editable && (
                        <div>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => handleTransportFileUpload(e, "transport")}
                            className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={tRem}
                    onChange={(e) => setTRem(e.target.value)}
                    readOnly={!isStage4Editable}
                    placeholder="Any notes on vehicle, route or bilty..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden resize-y min-h-[72px]"
                  />
                </div>

                {/* Action Button inside form card */}
                {isStage4Editable && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleStage4Submit}
                      className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                    >
                      Dispatch and send to store
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ============================================================ */}
          {/* STAGE 5: MATERIAL RECEIPT & QC */}
          {/* ============================================================ */}
          {stageNum === 5 && (
            <div className="space-y-5">
              {!isStage5Editable && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                  {isClosed
                    ? `This return is ${record.status.toLowerCase()}. Details are read-only.`
                    : record.status === "On Hold"
                    ? `On hold: ${record.holdReason || "Paused"}. Resume it to make changes.`
                    : record.stage < 5
                    ? `This stage opens after ${STAGES[record.stage - 1]} is complete.`
                    : `Only Store / QC or Management can edit this stage.`}
                </div>
              )}

              {/* Items summary table (Matches itemsTable in Order Return (1).html) */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Invoice</th>
                        <th className="py-2.5 px-3">Inv. date</th>
                        <th className="py-2.5 px-3">Logistics no.</th>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Approved</th>
                        <th className="py-2.5 px-3 text-right">Received</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                        <th className="py-2.5 px-3">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {(record.items || []).map((i) => {
                        const pr = prod(i.productId);
                        const it = invItem(i.invoiceNo, i.productId);
                        const appr = i.apprQty ?? 0;
                        const rec = itemTotals(record, i).recv;
                        const bal = Math.max(0, round(appr - rec));
                        const invDate = i.invoiceDate || inv(i.invoiceNo).date;
                        const dispNo = i.dispatchNo || it.dispatchNo || "—";
                        return (
                          <tr key={i.key || i.item_key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{i.invoiceNo}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{fdate(invDate)}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{dispNo}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{pr.name}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{pr.category} / {pr.sub}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">{qf.format(appr)}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">{qf.format(rec)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">{qf.format(bal)}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{pr.uom}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Existing Receipts List */}
              {(record.receipts || []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Receipts
                  </h3>
                  {(record.receipts || []).map((rc, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs space-y-3"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <span className="text-slate-400 block text-[11px]">GRN</span>
                          <b className="text-slate-900 dark:text-slate-100 font-mono text-xs">{rc.grn}</b>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Received</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{fdate(rc.date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Received by</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{rc.by || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">QC status</span>
                          <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            rc.qcStatus === "Passed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}>
                            {rc.qcStatus}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Stock posting</span>
                          <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {rc.invStatus}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Stock reference</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{rc.postRef || "—"}</span>
                        </div>
                      </div>

                      {/* Receipt lines breakdown table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2 px-3">Product</th>
                              <th className="py-2 px-3 text-right">Received</th>
                              <th className="py-2 px-3">Goes to</th>
                              <th className="py-2 px-3">Sub-category</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(rc.lines || []).map((l, lIdx) => {
                              const it = (record.items || []).find((i) => (i.key || i.item_key) === (l.key || l.item_key));
                              const pr = prod(it?.productId);
                              return (
                                <tr key={lIdx}>
                                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{pr.name}</td>
                                  <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                    {qty(l.recv, pr.uom)}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{destText(l)}</td>
                                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{l.subCat || pr.sub}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {rc.remarks && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">QC remarks:</span> {rc.remarks}
                        </p>
                      )}

                      {/* Attachments preview */}
                      {(rc.rcvAttachments || []).length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 block mb-1">Received material photos</span>
                          <div className="flex flex-wrap gap-2">
                            {rc.rcvAttachments.map((att, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                <Eye className="w-3 h-3 text-indigo-500" />
                                <span className="max-w-[140px] truncate">{att.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {(rc.attachments || []).length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 block mb-1">QC report</span>
                          <div className="flex flex-wrap gap-2">
                            {rc.attachments.map((att, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                <FileText className="w-3 h-3 text-indigo-500" />
                                <span className="max-w-[140px] truncate">{att.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isStage5Editable && !rc.posted && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => postStock(record.id, rc.grn)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                          >
                            Post stock
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Record a receipt (Matches receiptForm in Order Return (1).html) */}
              {isStage5Editable && (record.items || []).some((i) => (i.apprQty || 0) - itemTotals(record, i).recv > 0) && (
                <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/60 space-y-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Record a receipt
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        GRN
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Generated on save"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-mono text-xs cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Received date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        max={today()}
                        value={gDate}
                        onChange={(e) => setGDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        QC status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={gQc}
                        onChange={(e) => {
                          const newQc = e.target.value;
                          setGQc(newQc);
                          const isFailed = newQc === "Failed";
                          setReceiptLines((prev) => {
                            const next = { ...prev };
                            Object.keys(next).forEach((k) => {
                              const it = (record.items || []).find((x) => (x.key || x.item_key) === k);
                              const pr = prod(it?.productId);
                              next[k] = {
                                ...next[k],
                                dest: isFailed ? "Scrap" : pr.stockType
                              };
                            });
                            return next;
                          });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                      >
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                      </select>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Passed goes into stock. Failed goes to scrap or is rejected.
                      </span>
                    </div>
                  </div>

                  {/* Items allocation table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3 text-right">Balance</th>
                          <th className="py-2.5 px-3">Received qty</th>
                          <th className="py-2.5 px-3">Goes to</th>
                          <th className="py-2.5 px-3">Sub-category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(record.items || [])
                          .filter((i) => (i.apprQty || 0) - itemTotals(record, i).recv > 0)
                          .map((i) => {
                            const k = i.key || i.item_key;
                            const pr = prod(i.productId);
                            const bal = Math.max(0, round((i.apprQty || 0) - itemTotals(record, i).recv));
                            const lineState = receiptLines[k] || { recv: bal, dest: gQc === "Failed" ? "Scrap" : pr.stockType, sub: pr.sub };
                            const destOpts = gQc === "Failed" ? ["Scrap", "Reject"] : ["FG", "Semi-FG", "Raw Material"];

                            return (
                              <tr key={k}>
                                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {pr.name} <span className="text-slate-400 font-normal ml-1">{pr.uom}</span>
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                  {qf.format(bal)}
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={bal}
                                    step="any"
                                    value={lineState.recv || ""}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setReceiptLines((prev) => ({
                                        ...prev,
                                        [k]: { ...prev[k], recv: v }
                                      }));
                                    }}
                                    className="w-24 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={lineState.dest || (gQc === "Failed" ? "Scrap" : pr.stockType)}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setReceiptLines((prev) => ({
                                        ...prev,
                                        [k]: { ...prev[k], dest: v }
                                      }));
                                    }}
                                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                                  >
                                    {destOpts.map((o) => (
                                      <option key={o} value={o}>
                                        {o === "Reject" ? "Reject (not taken in stock)" : o}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={lineState.sub || pr.sub}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setReceiptLines((prev) => ({
                                        ...prev,
                                        [k]: { ...prev[k], sub: v }
                                      }));
                                    }}
                                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                  >
                                    {SUBCATS.map((sc) => (
                                      <option key={sc} value={sc}>
                                        {sc}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Scrap goes to the Scrap Yard, separate from saleable stock. To split one product (part to stock, part to scrap), save two receipts.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      QC remarks
                    </label>
                    <textarea
                      rows={2}
                      value={gRem}
                      onChange={(e) => setGRem(e.target.value)}
                      placeholder="Inspection findings, deviations, or condition notes..."
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  {/* Received material photos upload */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Received material photos
                    </label>
                    {pendingRcvAtt.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {pendingRcvAtt.map((att, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="font-medium text-slate-700 dark:text-slate-300 hover:underline max-w-[140px] truncate"
                            >
                              {att.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingRcvAtt((prev) => prev.filter((_, idx) => idx !== aIdx))}
                              className="text-slate-400 hover:text-rose-500 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">No attachments.</span>
                    )}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleStage5FileUpload(e, "rcv")}
                      className="text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-700 file:text-xs file:font-semibold file:bg-slate-50 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-100 cursor-pointer block"
                    />
                  </div>

                  {/* QC report upload */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      QC report
                    </label>
                    {pendingQcAtt.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {pendingQcAtt.map((att, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="font-medium text-slate-700 dark:text-slate-300 hover:underline max-w-[140px] truncate"
                            >
                              {att.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingQcAtt((prev) => prev.filter((_, idx) => idx !== aIdx))}
                              className="text-slate-400 hover:text-rose-500 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">No attachments.</span>
                    )}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleStage5FileUpload(e, "qc")}
                      className="text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-700 file:text-xs file:font-semibold file:bg-slate-50 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-100 cursor-pointer block"
                    />
                  </div>

                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleStage5ReceiptSubmit}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                    >
                      Save receipt
                    </button>
                  </div>
                </div>
              )}

              {/* Reason for closing short */}
              {isStage5Editable &&
                (record.receipts || []).length > 0 &&
                (record.items || []).some((i) => itemTotals(record, i).recv < (i.apprQty || 0)) && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Reason for closing short
                    </label>
                    <textarea
                      rows={2}
                      value={shortWhy}
                      onChange={(e) => setShortWhy(e.target.value)}
                      placeholder="Some approved quantity hasn’t arrived. Say why you’re closing anyway."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      Needed only if you close before all approved quantity arrives.
                    </span>
                  </div>
                )}

              {/* Close receipt and send to accounts */}
              {isStage5Editable && (record.receipts || []).length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Post stock for every receipt first.
                  </span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleStage5Close}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                  >
                    Close receipt and send to accounts
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 6: ISSUE CREDIT NOTE */}
          {/* ============================================================ */}
          {stageNum === 6 && (
            <div className="space-y-4">
              {!isStage6Editable && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                  {isClosed
                    ? `This return is ${record.status.toLowerCase()}. Details are read-only.`
                    : record.status === "On Hold"
                    ? `On hold: ${record.holdReason || "Paused"}. Resume it to make changes.`
                    : record.stage < 6
                    ? `This stage opens after ${STAGES[record.stage - 1]} is complete.`
                    : `Only Accounts or Management can issue credit notes.`}
                </div>
              )}

              {record.credit?.status === "Not Required" && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                  Closed without a credit note: {record.credit?.notReqReason || "—"}
                </div>
              )}

              {basis && (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">
                      Value of accepted quantity
                    </span>
                    <b className="text-base text-emerald-900 dark:text-emerald-100 font-extrabold">
                      {money(basis.base)}
                    </b>
                  </div>
                  <div>
                    <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">
                      GST on it
                    </span>
                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      {money(basis.tax)}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">
                      Maximum allowed
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {money(basis.cap)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Credit note number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly={!isStage6Editable}
                    value={cNo}
                    onChange={(e) => setCNo(e.target.value)}
                    placeholder="e.g. CN/26-27/101"
                    className={`w-full text-xs px-3 py-2 rounded-xl border font-mono ${
                      !isStage6Editable
                        ? "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Credit note date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    readOnly={!isStage6Editable}
                    value={cDate}
                    onChange={(e) => setCDate(e.target.value)}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      !isStage6Editable
                        ? "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Credit note amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={basis?.cap}
                    readOnly={!isStage6Editable}
                    value={cAmt}
                    onChange={(e) => setCAmt(e.target.value)}
                    placeholder="0.00"
                    className={`w-full text-xs px-3 py-2 rounded-xl border font-mono ${
                      !isStage6Editable
                        ? "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tax amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    readOnly={!isStage6Editable}
                    value={cTax}
                    onChange={(e) => setCTax(e.target.value)}
                    placeholder="0.00"
                    className={`w-full text-xs px-3 py-2 rounded-xl border font-mono ${
                      !isStage6Editable
                        ? "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Linked invoice
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={[...new Set((record.items || []).map((i) => i.invoiceNo))].join(", ")}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Linked return
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={record.no}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Issued by
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={record.credit?.issuedBy || (isStage6Editable ? currentUser?.name || "Neha Gupta" : "")}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Remarks
                  </label>
                  <textarea
                    rows={2}
                    readOnly={!isStage6Editable}
                    value={cRem}
                    onChange={(e) => setCRem(e.target.value)}
                    placeholder="Optional remarks..."
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      !isStage6Editable
                        ? "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
              </div>

              {/* Credit note copy attachment */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Credit note copy
                </label>
                {creditAttachments.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {creditAttachments.map((att, aIdx) => (
                      <div
                        key={aIdx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(att)}
                          className="font-medium text-slate-700 dark:text-slate-300 hover:underline max-w-[140px] truncate"
                        >
                          {att.name}
                        </button>
                        {isStage6Editable && (
                          <button
                            type="button"
                            onClick={() => setCreditAttachments((prev) => prev.filter((_, idx) => idx !== aIdx))}
                            className="text-slate-400 hover:text-rose-500 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">No attachments.</span>
                )}
                {isStage6Editable && (
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleCreditFileUpload}
                    className="text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-700 file:text-xs file:font-semibold file:bg-slate-50 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-100 cursor-pointer block"
                  />
                )}
              </div>

              {/* Inline primary action button */}
              {isStage6Editable && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-start">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleStage6Submit}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                  >
                    Issue credit note
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        {stageNum !== 3 && stageNum !== 4 && stageNum !== 5 && stageNum !== 6 && (
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
          </div>
        )}
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
