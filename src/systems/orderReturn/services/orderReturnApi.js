import { supabase } from "../../../SupabaseClient.js";
import {
  clone,
  nowISO,
  today,
  round,
  num,
  qf,
  prod,
  invItem,
  creditBasis,
  committedQty,
  newReturnNo,
  newGRN,
  itemTotals,
  diffFields,
  sumItems,
  generateDemoSeedData,
  DEST_WH
} from "../constants/orderReturnData.js";

const LOCAL_STORAGE_KEY = "botivate.orderReturn.v2";

// Cache in localStorage
export function getLocalCache() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to parse local Order Return cache:", err);
  }
  return null;
}

export function setLocalCache(returns, movements) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ returns, movements }));
  } catch (err) {
    console.warn("Failed to set local Order Return cache:", err);
  }
}

// ----------------------------------------------------------------------
// DATA FETCHING (SUPABASE WITH FALLBACK)
// ----------------------------------------------------------------------

export async function fetchOrderReturns() {
  // Always prepare comprehensive hardcoded demo dataset
  const baseSeeded = generateDemoSeedData();
  const cached = getLocalCache();

  // If local cache has demo returns, use cached versions (preserves user actions in session)
  const cachedMap = {};
  if (cached && Array.isArray(cached.returns)) {
    cached.returns.forEach((cr) => {
      cachedMap[cr.id] = cr;
    });
  }

  const effectiveDemoReturns = baseSeeded.returns.map((dr) => cachedMap[dr.id] || dr);
  const effectiveDemoMovements =
    cached && cached.movements && cached.movements.length > 0
      ? cached.movements
      : baseSeeded.movements;

  let realReturns = [];
  let realMoves = [];

  try {
    // 1. Check if there are real user-created returns in Supabase
    const [retRes, itemsRes, receiptsRes, movesRes] = await Promise.all([
      supabase.from("order_returns").select("*").order("created_at", { ascending: false }),
      supabase.from("order_return_items").select("*"),
      supabase.from("order_return_receipts").select("*"),
      supabase.from("order_return_stock_movements").select("*").order("created_at", { ascending: false })
    ]);

    if (!retRes.error && Array.isArray(retRes.data)) {
      // Exclude any demo IDs from Supabase query if any existed
      const filteredRetData = retRes.data.filter((r) => !String(r.id).startsWith("demo"));

      const itemsByRet = {};
      (itemsRes.data || []).forEach((it) => {
        if (!itemsByRet[it.return_id]) itemsByRet[it.return_id] = [];
        itemsByRet[it.return_id].push({
          key: it.item_key,
          item_key: it.item_key,
          invoiceNo: it.invoice_no,
          invoice_no: it.invoice_no,
          invoiceDate: it.invoice_date,
          invoice_date: it.invoice_date,
          dispatchNo: it.dispatch_no,
          dispatch_no: it.dispatch_no,
          productId: it.product_id,
          product_id: it.product_id,
          product_name: it.product_name,
          category: it.category,
          sub_category: it.sub_category,
          uom: it.uom,
          price: it.price,
          invQty: it.inv_qty,
          inv_qty: it.inv_qty,
          reqQty: it.req_qty,
          req_qty: it.req_qty,
          apprQty: it.appr_qty,
          appr_qty: it.appr_qty,
          rejQty: it.rej_qty,
          rej_qty: it.rej_qty,
          reason: it.reason,
          note: it.note,
          attachments: it.attachments || []
        });
      });

      const receiptsByRet = {};
      (receiptsRes.data || []).forEach((rc) => {
        if (!receiptsByRet[rc.return_id]) receiptsByRet[rc.return_id] = [];
        receiptsByRet[rc.return_id].push({
          id: rc.id,
          grn: rc.grn,
          date: rc.date,
          qcStatus: rc.qc_status,
          remarks: rc.remarks,
          exceptionReason: rc.exception_reason,
          posted: rc.posted,
          postRef: rc.post_ref,
          invStatus: rc.inv_status,
          postedBy: rc.posted_by,
          postedAt: rc.posted_at,
          by: rc.by_user,
          attachments: rc.attachments || [],
          rcvAttachments: rc.rcv_attachments || [],
          lines: rc.lines || []
        });
      });

      realReturns = filteredRetData.map((r) => ({
        ...r,
        no: r.return_no,
        customerId: r.customer_id,
        transportType: r.transport_type,
        createdBy: r.created_by,
        receiptClosed: r.receipt_closed,
        prevStatus: r.prev_status || r.prevStatus,
        holdReason: r.hold_reason || r.holdReason,
        cancelReason: r.cancel_reason || r.cancelReason,
        items: itemsByRet[r.id] || [],
        receipts: receiptsByRet[r.id] || []
      }));

      realMoves = (movesRes.data || [])
        .filter((m) => !String(m.return_id).startsWith("demo"))
        .map((m) => ({
          ...m,
          returnNo: m.return_no,
          returnId: m.return_id,
          productId: m.product_id,
          stockType: m.stock_type,
          by: m.by_user,
          invoiceNo: m.invoice_no
        }));
    }
  } catch (err) {
    console.warn("Supabase fetch notice, using hardcoded demo dataset:", err);
  }

  // Combine real returns + complete hardcoded demo dataset
  const combinedReturns = [...realReturns];
  for (const dr of effectiveDemoReturns) {
    if (!combinedReturns.some((x) => x.id === dr.id)) {
      combinedReturns.push(dr);
    }
  }

  const combinedMoves = [...realMoves];
  for (const dm of effectiveDemoMovements) {
    if (!combinedMoves.some((x) => x.id === dm.id)) {
      combinedMoves.push(dm);
    }
  }

  setLocalCache(combinedReturns, combinedMoves);
  return { returns: combinedReturns, movements: combinedMoves, source: "hardcoded_demo_merged" };
}

// ----------------------------------------------------------------------
// DATA PERSISTENCE (LOCAL CACHE + OPTIONAL REAL SUPABASE SYNC)
// ----------------------------------------------------------------------

export async function persistOrderReturn(record, newMoves = []) {
  record.updatedAt = nowISO();
  record.updated_at = record.updatedAt;

  // 1. Update local cache immediately for snappy UI
  const cached = getLocalCache() || { returns: [], movements: [] };
  const idx = cached.returns.findIndex((x) => x.id === record.id);
  if (idx >= 0) cached.returns[idx] = clone(record);
  else cached.returns.push(clone(record));

  for (const m of newMoves) {
    if (!cached.movements.some((x) => x.id === m.id)) {
      cached.movements.unshift(m);
    }
  }
  setLocalCache(cached.returns, cached.movements);

  // 2. DO NOT write hardcoded demo records to Supabase to keep DB completely clean
  if (record.id && String(record.id).startsWith("demo")) {
    return true;
  }

  // 3. Sync real records to Supabase
  try {
    const supabasePayload = {
      id: record.id,
      return_no: record.no || record.return_no,
      date: record.date,
      customer_id: record.customerId || record.customer_id,
      customer_name: record.customer_name,
      customer_code: record.customer_code,
      customer_address: record.customer_address,
      customer_phone: record.customer_phone,
      customer_gstin: record.customer_gstin,
      transport_type: record.transportType || record.transport_type,
      reason: record.reason,
      remarks: record.remarks,
      stage: record.stage,
      status: record.status,
      prev_status: record.prevStatus,
      hold_reason: record.holdReason,
      cancel_reason: record.cancelReason,
      created_by: record.createdBy || record.created_by,
      company: record.company,
      approval: record.approval,
      debit: record.debit,
      transport: record.transport,
      receipt_closed: record.receiptClosed || record.receipt_closed || false,
      credit: record.credit,
      attachments: record.attachments,
      history: record.history,
      updated_at: new Date().toISOString()
    };

    const { error: retErr } = await supabase.from("order_returns").upsert(supabasePayload);
    if (!retErr) {
      // Upsert items
      if (record.items && record.items.length > 0) {
        const itemRows = record.items.map((i) => ({
          id: `${record.id}-${i.key || i.item_key}`,
          return_id: record.id,
          return_no: record.no,
          item_key: i.key || i.item_key,
          invoice_no: i.invoiceNo || i.invoice_no,
          invoice_date: i.invoiceDate || i.invoice_date,
          dispatch_no: i.dispatchNo || i.dispatch_no,
          product_id: i.productId || i.product_id,
          product_name: i.product_name || prod(i.productId).name,
          category: i.category,
          sub_category: i.sub_category || i.subCat,
          uom: i.uom,
          price: i.price,
          inv_qty: i.invQty ?? i.inv_qty,
          req_qty: i.reqQty ?? i.req_qty,
          appr_qty: i.apprQty ?? i.appr_qty,
          rej_qty: i.rejQty ?? i.rej_qty,
          reason: i.reason,
          note: i.note,
          attachments: i.attachments || []
        }));
        await supabase.from("order_return_items").upsert(itemRows);
      }

      // Upsert receipts
      if (record.receipts && record.receipts.length > 0) {
        const receiptRows = record.receipts.map((rc) => ({
          id: rc.id || `${record.id}-${rc.grn}`,
          return_id: record.id,
          return_no: record.no,
          grn: rc.grn,
          date: rc.date,
          qc_status: rc.qcStatus,
          remarks: rc.remarks,
          exception_reason: rc.exceptionReason,
          posted: rc.posted,
          post_ref: rc.postRef,
          inv_status: rc.invStatus,
          posted_by: rc.postedBy,
          posted_at: rc.postedAt,
          by_user: rc.by,
          attachments: rc.attachments || [],
          rcv_attachments: rc.rcvAttachments || [],
          lines: rc.lines || []
        }));
        await supabase.from("order_return_receipts").upsert(receiptRows);
      }

      // Insert new movements
      if (newMoves.length > 0) {
        const moveRows = newMoves.map((m) => ({
          id: m.id,
          grn: m.grn,
          return_no: m.returnNo || m.return_no,
          return_id: m.returnId || m.return_id,
          product_id: m.productId || m.product_id,
          product: m.product,
          uom: m.uom,
          qty: m.qty,
          stock_type: m.stockType || m.stock_type,
          warehouse: m.warehouse,
          movement: m.movement,
          ref: m.ref,
          invoice_no: m.invoiceNo || m.invoice_no,
          by_user: m.by || m.by_user,
          date: m.date
        }));
        await supabase.from("order_return_stock_movements").upsert(moveRows);
      }
    }
  } catch (err) {
    console.warn("Could not sync to Supabase table (saved locally):", err);
  }

  return true;
}

// ----------------------------------------------------------------------
// WORKFLOW LOGIC ENGINE (STAGES 1 - 6)
// ----------------------------------------------------------------------

export function addHist(r, action, detail, ctx) {
  r.history = r.history || [];
  r.history.push({
    at: nowISO(),
    by: ctx?.by || "User",
    role: ctx?.role || "Staff",
    action,
    detail: detail || ""
  });
}

// STAGE 1: Request Validation & Submission
export function validateRequest(r, returns) {
  const e = [];
  if (!r.customerId && !r.customer_id) e.push("Select a customer.");
  if (!r.date) e.push("Enter the request date.");
  if (!r.items || !r.items.length) e.push("Select at least one invoice line to return.");

  const seen = new Set();
  (r.items || []).forEach((i) => {
    const k = i.key || `${i.invoiceNo}|${i.productId}`;
    if (seen.has(k)) e.push(`${prod(i.productId).name} on ${i.invoiceNo} is selected twice.`);
    seen.add(k);

    if (!i.reason) e.push(`Choose a return reason for ${prod(i.productId).name}.`);
    if (i.reason === "Other" && !i.note?.trim()) {
      e.push(`Add a note explaining “Other” for ${prod(i.productId).name}.`);
    }

    const it = invItem(i.invoiceNo, i.productId);
    const bal = round((it.qty || 0) - committedQty(returns, i.invoiceNo, i.productId, r.id));
    if (!(i.reqQty > 0)) {
      e.push(`Enter a return quantity above zero for ${prod(i.productId).name}.`);
    } else if (i.reqQty > bal) {
      e.push(
        `${prod(i.productId).name} on ${i.invoiceNo}: return quantity ${qf.format(
          i.reqQty
        )} is more than the returnable balance of ${qf.format(bal)}.`
      );
    }
  });

  return e;
}

export function applySubmit(r, returns, ctx) {
  const e = validateRequest(r, returns);
  if (e.length) return { ok: false, errors: e };

  r = clone(r);
  if (!r.no) r.no = newReturnNo(returns, r.date);
  r.return_no = r.no;
  r.createdBy = r.createdBy || ctx.by;
  r.created_by = r.createdBy;
  r.stage = 2;
  r.status = "Pending Approval";
  r.approval.status = "Pending";

  addHist(r, "Submitted for approval", `${r.items.length} line(s), ${sumItems(r, (i) => i.reqQty)} units requested`, ctx);
  return { ok: true, r };
}

// STAGE 2: Approval
export function applyApproval(r, { decision, qtys, reason, remarks }, ctx) {
  const e = [];
  r = clone(r);
  if (r.stage !== 2) e.push("This return is not waiting for approval.");
  if (!["Approved", "Partially Approved", "Rejected"].includes(decision)) e.push("Choose a decision.");
  if (decision !== "Approved" && !reason?.trim() && !remarks?.trim()) {
    e.push("Add remarks. They’re required when a return is rejected or only partly approved.");
  }

  const lines = (r.items || []).map((i) => {
    const k = i.key || i.item_key;
    let a = decision === "Approved" ? i.reqQty : decision === "Rejected" ? 0 : num(qtys?.[k]);
    if (a < 0) e.push(`${prod(i.productId).name}: approved quantity can’t be negative.`);
    if (a > i.reqQty) {
      e.push(`${prod(i.productId).name}: approved quantity ${qf.format(a)} is more than the requested ${qf.format(i.reqQty)}.`);
    }
    return a;
  });

  if (decision === "Partially Approved") {
    const tot = lines.reduce((s, a) => s + a, 0);
    const req = sumItems(r, (i) => i.reqQty);
    if (tot <= 0) e.push("A partial approval needs at least one line with an approved quantity. Use Reject instead.");
    else if (tot >= req) e.push("All quantities are fully approved. Choose Approved instead.");
  }

  if (e.length) return { ok: false, errors: e };

  if (r.approval?.status && r.approval.status !== "Pending") {
    r.approval.history = r.approval.history || [];
    r.approval.history.push({ ...r.approval, history: undefined });
  }

  r.items.forEach((i, k) => {
    i.apprQty = round(lines[k]);
    i.appr_qty = i.apprQty;
    i.rejQty = round(i.reqQty - lines[k]);
    i.rej_qty = i.rejQty;
  });

  r.approval = {
    ...r.approval,
    status: decision,
    by: ctx.by,
    date: today(),
    at: nowISO(),
    reason: reason || remarks || "",
    remarks: remarks || reason || ""
  };

  if (decision === "Rejected") {
    r.status = "Rejected";
  } else {
    r.status = decision;
    r.stage = 3;
  }

  addHist(
    r,
    decision,
    `Approved ${sumItems(r, (i) => i.apprQty)} of ${sumItems(r, (i) => i.reqQty)}${reason ? " · " + reason : ""}`,
    ctx
  );
  return { ok: true, r };
}

// STAGE 3: Debit Note
export function applyDebit(r, d, ctx) {
  const e = [];
  r = clone(r);
  if (r.stage < 3) e.push("Approve the return before recording the debit note.");

  if (d.required === "No") {
    if (!d.notReqReason?.trim()) e.push("Enter why a debit note isn’t required.");
    d.status = "Not Required";
  } else {
    if (d.status === "Not Required") e.push("Set “Debit note required?” to No to mark it Not Required.");
    if (d.status === "Received") {
      if (!d.number?.trim()) e.push("Enter the debit note number.");
      if (!d.date) e.push("Enter the debit note date.");
      if (!(num(d.amount) > 0)) e.push("Enter a debit note amount above zero.");
    }
  }

  if (e.length) return { ok: false, errors: e };

  const labels = {
    required: "Required",
    status: "Status",
    number: "Number",
    date: "Date",
    amount: "Amount",
    tax: "Tax",
    notReqReason: "Reason",
    remarks: "Remarks"
  };
  const changes = diffFields(r.debit, d, labels);
  r.debit = {
    ...r.debit,
    ...d,
    amount: d.amount === "" ? "" : num(d.amount),
    tax: d.tax === "" ? "" : num(d.tax),
    submittedBy: ctx.by,
    updatedAt: nowISO()
  };

  let moved = false;
  if (r.stage === 3 && ["Received", "Not Required"].includes(r.debit.status)) {
    r.stage = 4;
    r.status = "In Progress";
    moved = true;
  }

  addHist(r, moved ? "Debit note completed" : "Debit note updated", changes || "No field changes", ctx);
  return { ok: true, r, moved };
}

// STAGE 4: Vehicle Arrangement & Transport
export function applyTransport(r, t, ctx) {
  const e = [];
  r = clone(r);
  if (r.stage < 4) e.push("Finish the debit note stage before arranging the vehicle.");
  if (!t.mode) e.push("Choose a transport mode.");

  const active = ["Arranged", "In Transit", "Delivered"].includes(t.status);
  if (active) {
    const badMob = (m) => m && !/^[+\d][\d\s-]{7,15}$/.test(m.trim());
    const two = t.mode === "Two-leg";
    if (t.mode === "Customer Arranged" || two) {
      if (!t.vehicle?.trim()) e.push(two ? "Leg 1: enter the customer’s vehicle number." : "Enter the vehicle number the customer is sending.");
    } else {
      if (!t.name?.trim()) e.push("Enter the transport name.");
      if (!t.vehicle?.trim()) e.push("Enter the vehicle number.");
      if (!t.driver?.trim()) e.push("Enter the driver name.");
    }

    if (badMob(t.mobile)) e.push("Enter a valid driver mobile number.");
    if (!t.pickup) e.push(two ? "Leg 1: enter the drop date at the transport office." : "Enter the pickup / dispatch date.");

    if (two) {
      const l = t.leg2 || {};
      if (!t.office?.trim()) e.push("Leg 1: enter the transport office name.");
      if (!l.name?.trim()) e.push("Leg 2: enter the transport name.");
      if (!l.vehicle?.trim()) e.push("Leg 2: enter our vehicle number.");
      if (!l.driver?.trim()) e.push("Leg 2: enter the driver name.");
      if (badMob(l.mobile)) e.push("Leg 2: enter a valid driver mobile number.");
      if (!l.date) e.push("Leg 2: enter the pickup date from the office.");
      else if (t.pickup && l.date < t.pickup) e.push("Leg 2 pickup can’t be before the leg 1 drop date.");
    }
  }

  if (t.biltyReq === "Yes" && !t.biltyNo?.trim()) {
    e.push("Enter the bilty number. It’s required when bilty is set to Yes.");
  }
  if (t.expected && t.pickup && t.expected < t.pickup) {
    e.push("Expected delivery date can’t be before the pickup date.");
  }
  if (t.cost !== "" && num(t.cost) < 0) {
    e.push("Transport cost can’t be negative.");
  }

  if (e.length) return { ok: false, errors: e };

  const labels = {
    mode: "Mode",
    name: "Transporter",
    vehicle: "Vehicle",
    driver: "Driver",
    mobile: "Mobile",
    pickup: "Pickup",
    expected: "Expected",
    cost: "Cost",
    biltyReq: "Bilty required",
    biltyNo: "Bilty no.",
    status: "Status",
    remarks: "Remarks"
  };
  const changes = diffFields(r.transport, t, labels);
  r.transport = {
    ...r.transport,
    ...t,
    cost: t.cost === "" ? "" : num(t.cost),
    updatedBy: ctx.by,
    updatedAt: nowISO()
  };

  let moved = false;
  if (r.stage === 4 && ["In Transit", "Delivered"].includes(t.status)) {
    r.stage = 5;
    moved = true;
  }

  addHist(r, moved ? "Vehicle dispatched" : "Transport updated", changes || "No field changes", ctx);
  return { ok: true, r, moved };
}

// STAGE 5: Material Receipt & QC Inspection
export function applyReceipt(r, rc, returns, ctx) {
  const e = [];
  r = clone(r);
  if (r.stage !== 5) e.push("Material can be received only once the vehicle is in transit or delivered.");
  if (!rc.date) e.push("Enter the actual received date.");
  if (!["Pending", "Passed", "Partially Passed", "Failed"].includes(rc.qcStatus)) e.push("Choose a QC status.");

  let rTot = 0, aTot = 0, bad = 0;
  (rc.lines || []).forEach((l) => {
    const it = (r.items || []).find((i) => (i.key || i.item_key) === (l.key || l.item_key));
    const p = prod(it?.productId);
    ["recv", "accept", "reject", "scrap"].forEach((k) => (l[k] = round(num(l[k]))));

    if ([l.recv, l.accept, l.reject, l.scrap].some((v) => v < 0)) {
      e.push(`${p.name}: quantities can’t be negative.`);
    }

    const already = it ? itemTotals(r, it).recv : 0;
    if (it && l.recv + already > it.apprQty && !rc.exceptionReason?.trim()) {
      e.push(`${p.name}: received ${qf.format(l.recv + already)} in total is more than approved ${qf.format(it.apprQty)}.`);
    }

    if (round(l.accept + l.reject + l.scrap) !== l.recv) {
      e.push(`${p.name}: accepted + rejected + scrap (${qf.format(round(l.accept + l.reject + l.scrap))}) must equal received (${qf.format(l.recv)}).`);
    }

    if (l.recv > 0 && !l.condition) e.push(`${p.name}: choose the material condition.`);
    if (l.accept > 0 && !l.stockType) e.push(`${p.name}: choose the stock type for accepted quantity.`);
    if (l.accept > 0 && !l.warehouse) e.push(`${p.name}: choose the warehouse for accepted quantity.`);
    if (l.accept > 0 && l.stockType === "Scrap") e.push(`${p.name}: put scrap in the Scrap column, not as accepted stock.`);

    rTot += l.recv;
    aTot += l.accept;
    bad += l.reject + l.scrap;
  });

  if (rTot <= 0) e.push("Enter a received quantity on at least one line.");
  if (rc.qcStatus === "Passed" && bad > 0) e.push("QC can’t be Passed when some quantity is rejected or scrapped. Use Partially Passed.");
  if (rc.qcStatus === "Failed" && aTot > 0) e.push("QC can’t be Failed when some quantity is accepted. Use Partially Passed.");
  if (rc.qcStatus === "Partially Passed" && (aTot <= 0 || bad <= 0)) e.push("Partially Passed needs both accepted and rejected/scrap quantities.");

  if (e.length) return { ok: false, errors: e };

  const grn = newGRN((returns || []).concat([r]), rc.date);
  r.receipts = r.receipts || [];
  r.receipts.push({
    ...rc,
    lines: rc.lines.filter((l) => l.recv > 0),
    grn,
    by: ctx.by,
    at: nowISO(),
    posted: false,
    invStatus: "Pending",
    attachments: rc.attachments || [],
    rcvAttachments: rc.rcvAttachments || []
  });

  if (!r.transport.actual) r.transport.actual = rc.date;
  if (r.transport.status !== "Delivered") r.transport.status = "Delivered";

  addHist(
    r,
    "Material received",
    `${grn}: received ${round(rTot)}, accepted ${round(aTot)}, QC ${rc.qcStatus}${rc.exceptionReason ? " · Exception: " + rc.exceptionReason : ""}`,
    ctx
  );
  return { ok: true, r, grn };
}

// STAGE 5: Post Stock to Inventory
export function applyPosting(r, grn, movements, ctx) {
  r = clone(r);
  const rc = (r.receipts || []).find((x) => x.grn === grn);
  if (!rc) return { ok: false, errors: ["Receipt not found."] };
  if (rc.posted || (movements || []).some((m) => m.grn === grn)) {
    return { ok: false, errors: [`Stock for ${grn} is already posted. Duplicate posting is blocked.`] };
  }
  if (rc.qcStatus === "Pending") return { ok: false, errors: ["Finish QC before posting stock. QC status is still Pending."] };

  const moves = [];
  rc.lines.forEach((l, ix) => {
    const it = (r.items || []).find((i) => (i.key || i.item_key) === (l.key || l.item_key));
    const p = prod(it?.productId);
    const base = {
      grn,
      returnNo: r.no,
      returnId: r.id,
      productId: it?.productId,
      product: p.name,
      uom: p.uom,
      date: rc.date,
      by: ctx.by,
      at: nowISO(),
      invoiceNo: it?.invoiceNo
    };

    if (l.accept > 0) {
      moves.push({
        ...base,
        id: `${grn}-${ix}-A`,
        qty: l.accept,
        stockType: l.stockType,
        warehouse: l.warehouse || DEST_WH[l.stockType] || "FG Yard",
        movement: "Return receipt"
      });
    }
    if (l.scrap > 0) {
      moves.push({
        ...base,
        id: `${grn}-${ix}-S`,
        qty: l.scrap,
        stockType: "Scrap",
        warehouse: "Scrap Yard",
        movement: "Return to scrap"
      });
    }
  });

  rc.posted = true;
  rc.postedBy = ctx.by;
  rc.postedAt = nowISO();
  if (moves.length) {
    rc.invStatus = "Posted";
    rc.postRef = "SA-" + grn.slice(4);
    moves.forEach((m) => (m.ref = rc.postRef));
  } else {
    rc.invStatus = "Not Applicable";
  }

  addHist(
    r,
    "Stock posted",
    moves.length
      ? `${rc.postRef}: ${moves.map((m) => `${qf.format(m.qty)} ${m.uom} ${m.product} → ${m.stockType}, ${m.warehouse}`).join("; ")}`
      : `${grn}: nothing to post (all rejected)`,
    ctx
  );
  return { ok: true, r, moves };
}

// STAGE 5: Close Receipt & Move to Credit Note
export function applyCloseReceipt(r, shortReason, ctx) {
  r = clone(r);
  const e = [];
  if (r.stage !== 5) e.push("This return isn’t at the receipt stage.");
  if (!r.receipts?.length) e.push("Record at least one material receipt first.");
  if (r.receipts.some((x) => !x.posted)) e.push("Post stock for every receipt before closing.");

  const recv = round((r.items || []).reduce((s, i) => s + itemTotals(r, i).recv, 0));
  const appr = sumItems(r, (i) => i.apprQty);
  if (recv < appr && !shortReason?.trim()) {
    e.push(`Only ${qf.format(recv)} of ${qf.format(appr)} approved units have arrived. Enter a reason to close receipt short.`);
  }

  if (e.length) return { ok: false, errors: e };

  r.receiptClosed = true;
  r.stage = 6;
  r.credit.status = r.credit.status || "Pending";

  addHist(r, "Receipt & QC closed", recv < appr ? `Short-closed at ${recv}/${appr}: ${shortReason}` : `All ${recv} units received`, ctx);
  return { ok: true, r };
}

// STAGE 6: Issue Credit Note
export function applyCredit(r, c, ctx) {
  const e = [];
  r = clone(r);
  if (r.stage !== 6) e.push("Close material receipt & QC before issuing the credit note.");

  const basis = creditBasis(r);
  if (c.required === "No") {
    if (!c.notReqReason?.trim()) e.push("Enter why a credit note isn’t required.");
    c.status = "Not Required";
  } else {
    if (c.status === "Not Required") e.push("Set “Credit note required?” to No to mark it Not Required.");
    if (c.status === "Issued") {
      if (!c.number?.trim()) e.push("Enter the credit note number.");
      if (!c.date) e.push("Enter the credit note date.");
      if (!(num(c.amount) > 0)) e.push("Enter a credit note amount above zero.");
      if (num(c.amount) > basis.cap + 0.01) {
        e.push(`Credit amount ${c.amount} is more than the approved value ${basis.cap}.`);
      }
    }
  }

  if (e.length) return { ok: false, errors: e };

  const labels = {
    required: "Required",
    status: "Status",
    number: "Number",
    date: "Date",
    amount: "Amount",
    tax: "Tax",
    adjReason: "Adjustment reason",
    notReqReason: "Reason",
    remarks: "Remarks"
  };
  const changes = diffFields(r.credit, c, labels);
  r.credit = {
    ...r.credit,
    ...c,
    amount: c.amount === "" ? "" : num(c.amount),
    tax: c.tax === "" ? "" : num(c.tax),
    suggested: basis.base,
    issuedBy: ctx.by,
    updatedAt: nowISO()
  };

  let moved = false;
  if (["Issued", "Not Required"].includes(r.credit.status)) {
    r.stage = 7;
    r.status = "Completed";
    r.completedAt = nowISO();
    moved = true;
  }

  addHist(
    r,
    moved ? (r.credit.status === "Issued" ? "Credit note issued" : "Closed without credit note") : "Credit note updated",
    changes || "No field changes",
    ctx
  );
  return { ok: true, r, moved };
}

// HOLD / RESUME / CANCEL
export function applyHold(r, reason, ctx) {
  r = clone(r);
  if (!reason?.trim()) return { ok: false, errors: ["Enter a reason for the hold."] };
  if (["Completed", "Cancelled", "Rejected"].includes(r.status)) {
    return { ok: false, errors: ["Closed returns can’t be put on hold."] };
  }
  r.prevStatus = r.status;
  r.status = "On Hold";
  r.holdReason = reason;
  addHist(r, "Put on hold", reason, ctx);
  return { ok: true, r };
}

export function applyResume(r, ctx) {
  r = clone(r);
  r.status = r.prevStatus || "In Progress";
  r.holdReason = "";
  addHist(r, "Resumed", "", ctx);
  return { ok: true, r };
}

export function applyCancel(r, reason, movements, ctx) {
  r = clone(r);
  const e = [];
  if (!reason?.trim()) e.push("Enter a cancellation reason.");
  if (r.status === "Completed") e.push("Completed returns can’t be cancelled. Use an authorised reversal.");
  if ((movements || []).some((m) => m.returnId === r.id)) {
    e.push("Stock is already posted for this return. Reverse the stock movement before cancelling.");
  }
  if (r.credit?.status === "Issued") e.push("A credit note is already issued. Reverse it in accounts before cancelling.");

  if (e.length) return { ok: false, errors: e };

  r.status = "Cancelled";
  r.cancelReason = reason;
  addHist(r, "Cancelled", reason, ctx);
  return { ok: true, r };
}
