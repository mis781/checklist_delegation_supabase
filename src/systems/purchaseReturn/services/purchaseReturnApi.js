import { supabase } from "../../../SupabaseClient";
import {
  isLogisticsTerm,
  M1_PENDING,
  MC_PENDING,
  M2_PENDING,
  M3_PENDING,
  M4_PENDING
} from "../data/dummyPurchaseReturns";

/**
 * =====================================================================
 * DATA TRANSFORMER: Relational Supabase Schema -> Frontend Shape
 * =====================================================================
 */
export function transformDbRecordToFrontend(r) {
  const approvals = r.approvals || [];
  const rejection = approvals.find((a) => a.event_type === "rejection");
  const latestApproval = approvals
    .filter((a) => a.event_type === "initial_approval" || a.event_type === "top_up_approval")
    .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at))[0];

  const items = (r.items || []).map((i) => ({
    id: i.id,
    sku: i.sku || "",
    indentNumber: i.indent_number || i.sku || "",
    itemCode: i.item_code,
    itemName: i.item_name,
    unit: i.unit || "KG",
    purchaseQty: Number(i.purchase_qty) || 0,
    damageQty: Number(i.damage_qty) || 0,
    returnQty: Number(i.approved_qty) || 0,
    pendingQty: Math.max(0, (Number(i.damage_qty) || 0) - (Number(i.approved_qty) || 0)),
    reason: i.damage_reason || "",
    returnValue: Number(i.return_value) || 0,
    unitRate: Number(i.unit_rate) || 0,
    damageImageUrl: i.damage_image_url || null,
  }));

  const damageValue =
    Number(r.total_damage_value) ||
    items.reduce((s, it) => s + (it.returnValue || 0), 0);

  const approval =
    latestApproval || r.action_type
      ? {
          actionType: r.action_type || (latestApproval && latestApproval.action_type),
          transportPaidBy:
            r.transport_paid_by || (latestApproval && latestApproval.transport_paid_by),
          remarks: latestApproval?.remarks || "Approved after physical verification.",
          approvedBy: latestApproval?.performed_by || r.created_by || "Admin",
          approvalDate: latestApproval?.performed_at
            ? new Date(latestApproval.performed_at)
            : new Date(r.created_at),
        }
      : null;

  const rejected = rejection
    ? {
        reason: rejection.rejection_reason || "Rejected",
        remarks: rejection.remarks || "",
        by: rejection.performed_by || "Admin",
        date: new Date(rejection.performed_at),
      }
    : null;

  const creditNoteRow = Array.isArray(r.credit_notes)
    ? r.credit_notes[0]
    : (r.credit_notes || null);
  const creditNote = creditNoteRow
    ? {
        id: creditNoteRow.id,
        askedBy: creditNoteRow.asked_by,
        askedDate: new Date(creditNoteRow.asked_at),
        attachmentName: creditNoteRow.attachment_name,
        attachmentUrl: creditNoteRow.attachment_url,
        remarks: creditNoteRow.remarks || "",
        includedItemIds: creditNoteRow.included_item_ids || null,
      }
    : null;

  const logisticsRow = Array.isArray(r.logistics)
    ? r.logistics[0]
    : (r.logistics || null);
  const logistics = logisticsRow
    ? {
        id: logisticsRow.id,
        arrangedBy: logisticsRow.arranged_by,
        arrangedDate: new Date(logisticsRow.arranged_at),
        transporterName: logisticsRow.transporter_name,
        vehicleNumber: logisticsRow.vehicle_number,
        driverName: logisticsRow.driver_name || "",
        driverMobile: logisticsRow.driver_mobile || "",
        biltyAvailable: logisticsRow.bilty_available ? "Yes" : "No",
        biltyNumber: logisticsRow.bilty_number || "",
        biltyCopyName: logisticsRow.bilty_copy_name || null,
        biltyCopyUrl: logisticsRow.bilty_copy_url || null,
        transportingAmount: Number(logisticsRow.transporting_amount) || 0,
        transportDate: logisticsRow.expected_return_date || null,
        remarks: logisticsRow.remarks || "",
        includedItemIds: logisticsRow.included_item_ids || null,
      }
    : null;

  const debitNotesArray = Array.isArray(r.debit_notes)
    ? r.debit_notes.map((dn) => ({
        id: dn.id,
        issuedBy: dn.issued_by,
        issuedDate: dn.issued_at ? new Date(dn.issued_at) : null,
        number: dn.debit_note_number,
        date: dn.debit_note_date,
        amount: Number(dn.amount) || 0,
        imageName: dn.document_name || null,
        imageUrl: dn.document_url || null,
        remarks: dn.remarks || "",
        includedItemIds: dn.included_item_ids || null,
      }))
    : [];

  const debitNoteRow = Array.isArray(r.debit_notes)
    ? r.debit_notes[0]
    : (r.debit_notes || null);
  const debitNote = debitNoteRow
    ? {
        id: debitNoteRow.id,
        issuedBy: debitNoteRow.issued_by,
        issuedDate: debitNoteRow.issued_at ? new Date(debitNoteRow.issued_at) : new Date(),
        number: debitNoteRow.debit_note_number,
        date: debitNoteRow.debit_note_date,
        amount: Number(debitNoteRow.amount) || 0,
        imageName: debitNoteRow.document_name || null,
        imageUrl: debitNoteRow.document_url || null,
        remarks: debitNoteRow.remarks || "",
        includedItemIds: debitNoteRow.included_item_ids || null,
      }
    : null;

  const dispatchRow = Array.isArray(r.dispatches)
    ? r.dispatches[0]
    : (r.dispatches || null);
  const dispatch = dispatchRow
    ? {
        id: dispatchRow.id,
        dispatchedBy: dispatchRow.dispatched_by,
        dispatchedDate: new Date(dispatchRow.dispatched_at),
        actualQty: Number(dispatchRow.actual_qty) || 0,
        photoName: dispatchRow.loading_photo_name || null,
        photoUrl: dispatchRow.loading_photo_url || null,
        attachmentName: dispatchRow.gate_pass_name || null,
        attachmentUrl: dispatchRow.gate_pass_url || null,
        remarks: dispatchRow.remarks || "",
        includedItemIds: dispatchRow.included_item_ids || null,
      }
    : null;

  const activity = (r.activity || [])
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((act) => ({
      action: act.action,
      by: act.performed_by,
      datetime: new Date(act.created_at),
      remarks: act.remarks || "",
      attachment: act.attachment_name || act.attachment_url || null,
    }));

  const indentNumbers = Array.from(
    new Set(
      (r.items || [])
        .map((i) => i.indent_number || i.sku)
        .concat(r.indent_number ? [r.indent_number] : [])
        .filter(Boolean)
    )
  );
  const indentNumber = r.indent_number || indentNumbers.join(", ") || "";

  return {
    id: r.id,
    returnNumber: r.return_number,
    company: r.company,
    division: r.division,
    supplier: r.vendor_name,
    poNumber: r.po_number || "",
    indentNumber,
    billNumber: r.bill_number || "",
    billImage: r.bill_image_url || null,
    billImagePreview: r.bill_image_url || null,
    billDate: r.bill_date ? new Date(r.bill_date) : null,
    requestDate: r.request_date ? new Date(r.request_date) : new Date(r.created_at),
    currentStage: r.current_stage,
    overallStatus: r.overall_status,
    damageValue,
    transportPaidBy: r.transport_paid_by || approval?.transportPaidBy || null,
    items,
    approval,
    rejected,
    creditNote,
    logistics,
    debitNote,
    debitNotes: debitNotesArray.length > 0 ? debitNotesArray : (debitNote ? [debitNote] : []),
    dispatch,
    activity,
  };
}

/**
 * =====================================================================
 * READ: Fetch All Purchase Returns (with all sub-entities joined)
 * =====================================================================
 */
export async function fetchPurchaseReturns() {
  try {
    // Attempt PostgREST joined query first
    const { data, error } = await supabase
      .from("purchase_returns")
      .select(`
        *,
        items:purchase_return_items(*),
        approvals:pr_approvals(*),
        credit_notes:pr_credit_notes(*),
        logistics:pr_logistics(*),
        debit_notes:pr_debit_notes(*),
        dispatches:pr_dispatches(*),
        activity:pr_activity_log(*)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map(transformDbRecordToFrontend);
    }

    // Fallback: parallel query if foreign key relations are refreshing in cache
    const [
      retRes,
      itemsRes,
      appRes,
      cnRes,
      logRes,
      dnRes,
      dispRes,
      actRes
    ] = await Promise.all([
      supabase.from("purchase_returns").select("*").order("created_at", { ascending: false }),
      supabase.from("purchase_return_items").select("*"),
      supabase.from("pr_approvals").select("*"),
      supabase.from("pr_credit_notes").select("*"),
      supabase.from("pr_logistics").select("*"),
      supabase.from("pr_debit_notes").select("*"),
      supabase.from("pr_dispatches").select("*"),
      supabase.from("pr_activity_log").select("*")
    ]);

    if (retRes.error) throw retRes.error;

    const returns = retRes.data || [];
    const items = itemsRes.data || [];
    const approvals = appRes.data || [];
    const creditNotes = cnRes.data || [];
    const logistics = logRes.data || [];
    const debitNotes = dnRes.data || [];
    const dispatches = dispRes.data || [];
    const activities = actRes.data || [];

    const grouped = returns.map((r) => ({
      ...r,
      items: items.filter((i) => i.return_id === r.id),
      approvals: approvals.filter((a) => a.return_id === r.id),
      credit_notes: creditNotes.filter((c) => c.return_id === r.id),
      logistics: logistics.filter((l) => l.return_id === r.id),
      debit_notes: debitNotes.filter((d) => d.return_id === r.id),
      dispatches: dispatches.filter((dp) => dp.return_id === r.id),
      activity: activities.filter((act) => act.return_id === r.id)
    }));

    return grouped.map(transformDbRecordToFrontend);
  } catch (err) {
    console.error("fetchPurchaseReturns error:", err);
    throw err;
  }
}

/**
 * =====================================================================
 * SIDEBAR BADGE COUNTS: Aggregates pending count per stage for Sidebar
 * =====================================================================
 */
export async function fetchPurchaseReturnSidebarBadgeCounts() {
  try {
    const returns = await fetchPurchaseReturns();
    if (!returns || !Array.isArray(returns)) {
      return {
        approval: 0,
        credit: 0,
        logistics: 0,
        debitNote: 0,
        plantReturn: 0,
        total: 0,
      };
    }

    const approval = returns.filter(M1_PENDING).length;
    const credit = returns.filter(MC_PENDING).length;
    const logistics = returns.filter(M2_PENDING).length;
    const debitNote = returns.filter(M3_PENDING).length;
    const plantReturn = returns.filter(M4_PENDING).length;
    const total = approval + credit + logistics + debitNote + plantReturn;

    return {
      approval,
      credit,
      logistics,
      debitNote,
      plantReturn,
      total,
    };
  } catch (err) {
    console.error("fetchPurchaseReturnSidebarBadgeCounts error:", err);
    return {
      approval: 0,
      credit: 0,
      logistics: 0,
      debitNote: 0,
      plantReturn: 0,
      total: 0,
    };
  }
}

/**
 * =====================================================================
 * HELPER: Sequence number generator for PR-YYYY-NNNN
 * =====================================================================
 */
export async function getNextReturnNumber() {
  try {
    const { data, error } = await supabase.rpc("generate_return_number");
    if (!error && data) return data;
  } catch {
    // ignore
  }

  // Fallback if RPC is unavailable
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PR-${year}-${rand}`;
}

/**
 * =====================================================================
 * CREATE: Raise a New Purchase Return Request
 * =====================================================================
 */
export async function createPurchaseReturn(payload) {
  const {
    poId = null,
    materialReceiptId = null,
    tallyBillingId = null,
    vendorId = null,
    poNumber = "",
    vendorName = "",
    company = "",
    division = "",
    billNumber = "",
    billDate = null,
    billImageUrl = null,
    createdBy = "Admin",
    items = []
  } = payload;

  const returnNumber = payload.returnNumber || (await getNextReturnNumber());

  const totalDamageValue = items.reduce(
    (sum, item) => sum + (Number(item.returnValue) || (Number(item.damageQty || 0) * Number(item.unitRate || 0))),
    0
  );

  const resolvedIndentNumber =
    payload.indentNumber ||
    (items.map((i) => i.indentNumber).filter(Boolean)[0]) ||
    null;

  // 1. Insert header
  const headerPayload = {
    return_number: returnNumber,
    po_id: poId,
    material_receipt_id: materialReceiptId,
    tally_billing_id: tallyBillingId,
    vendor_id: vendorId,
    po_number: poNumber,
    indent_number: resolvedIndentNumber,
    vendor_name: vendorName,
    company: company || "Nutech",
    division: division || "Nutech Pipes",
    bill_number: billNumber,
    bill_date: billDate || null,
    bill_image_url: billImageUrl,
    current_stage: "Pending Approval",
    overall_status: "Pending Approval",
    total_damage_value: totalDamageValue,
    created_by: createdBy,
    request_date: new Date().toISOString()
  };

  let returnRow = null;
  const { data: insertedRow, error: returnError } = await supabase
    .from("purchase_returns")
    .insert([headerPayload])
    .select()
    .single();

  if (returnError) {
    if (returnError.message && returnError.message.includes("indent_number")) {
      const fallbackHeader = { ...headerPayload };
      delete fallbackHeader.indent_number;
      const { data: fbRow, error: fbErr } = await supabase
        .from("purchase_returns")
        .insert([fallbackHeader])
        .select()
        .single();
      if (fbErr) throw fbErr;
      returnRow = fbRow;
    } else {
      throw returnError;
    }
  } else {
    returnRow = insertedRow;
  }

  // 2. Insert line items
  if (items.length > 0) {
    const itemsPayload = await Promise.all(
      items.map(async (item, idx) => {
        let damageImgUrl = item.damageImageUrl || null;
        if (item.damageImageFile) {
          try {
            damageImgUrl = await uploadReturnFile(item.damageImageFile, "damage-items");
          } catch (uploadErr) {
            console.warn("Item attachment upload failed:", uploadErr);
          }
        }
        return {
          return_id: returnRow.id,
          indent_number: item.indentNumber || null,
          sku: item.sku || null,
          item_code: item.itemCode || `ITM-${idx + 1}`,
          item_name: item.itemName || "Material Item",
          unit: item.unit || "KG",
          purchase_qty: Number(item.purchaseQty) || 0,
          damage_qty: Number(item.damageQty) || 0,
          approved_qty: 0,
          unit_rate: Number(item.unitRate) || 0,
          return_value: Number(item.returnValue) || (Number(item.damageQty || 0) * Number(item.unitRate || 0)),
          damage_reason: item.damageReason || item.reason || "Material Damaged",
          damage_image_url: damageImgUrl,
          material_inspection_id: item.materialInspectionId || null
        };
      })
    );

    const { error: itemsError } = await supabase
      .from("purchase_return_items")
      .insert(itemsPayload);

    if (itemsError) {
      // If indent_number column is pending migration in DB, fallback gracefully without indent_number
      if (itemsError.message && itemsError.message.includes("indent_number")) {
        console.warn("indent_number column not found, inserting fallback itemsPayload");
        const fallbackPayload = itemsPayload.map((p) => {
          const copy = { ...p };
          delete copy.indent_number;
          return copy;
        });
        const { error: fallbackErr } = await supabase
          .from("purchase_return_items")
          .insert(fallbackPayload);
        if (fallbackErr) throw fallbackErr;
      } else {
        throw itemsError;
      }
    }
  }

  // 3. Insert audit log
  await supabase.from("pr_activity_log").insert([
    {
      return_id: returnRow.id,
      action: "Return Request Created",
      stage: "Pending Approval",
      performed_by: createdBy,
      remarks: `Return request ${returnNumber} raised with ${items.length} item(s). Total value: ₹${totalDamageValue.toLocaleString()}.`
    }
  ]);

  return returnRow;
}

/**
 * =====================================================================
 * STAGE 1: Approve Return (Initial or Multi-record)
 * =====================================================================
 */
export async function approveReturn({
  ids,
  actionType,
  transportPaidBy,
  remarks,
  itemEdits = {},
  userName = "Admin"
}) {
  const d = new Date().toISOString();

  for (const id of ids) {
    // 1. Fetch current items of this return
    const { data: curItems, error: fetchErr } = await supabase
      .from("purchase_return_items")
      .select("*")
      .eq("return_id", id);

    if (fetchErr) throw fetchErr;

    const edits = itemEdits[id] || {};
    let newTotalDamageValue = 0;
    let hasPendingRemaining = false;
    const itemDecisions = [];

    // 2. Update each item
    for (const item of curItems || []) {
      const isIncluded = edits.includedCodes
        ? edits.includedCodes.includes(item.item_code)
        : true;

      let approvedQty = item.approved_qty;
      let retVal = item.return_value;

      if (isIncluded) {
        approvedQty = Number(item.damage_qty) || 0;
        const itemEdit = edits.items ? edits.items[item.item_code] : null;
        if (itemEdit?.returnValue !== undefined && !isNaN(Number(itemEdit.returnValue)) && Number(itemEdit.returnValue) > 0) {
          retVal = Number(itemEdit.returnValue);
        } else {
          retVal = Number(item.return_value) || (approvedQty * (Number(item.unit_rate) || 0));
        }

        await supabase
          .from("purchase_return_items")
          .update({
            approved_qty: approvedQty,
            return_value: retVal
          })
          .eq("id", item.id);
      } else {
        // Excluded from approval
        hasPendingRemaining = true;
      }

      newTotalDamageValue += retVal;
      itemDecisions.push({
        item_id: item.id,
        item_code: item.item_code,
        approved_qty: approvedQty,
        return_value: retVal,
        included: isIncluded
      });
    }

    // 3. Determine next stage & status
    let nextStage = "Credit Note Pending";
    let nextStatus = "Credit Note Pending";

    if (actionType === "No Return No Debit Note") {
      nextStage = "Closed - No Action";
      nextStatus = "Closed - No Action";
    } else if (actionType === "Replace") {
      const isExFactory = isLogisticsTerm(transportPaidBy);
      nextStage = isExFactory ? "Logistics Pending" : "Return From Plant Pending";
      nextStatus = nextStage;
    } else if (hasPendingRemaining) {
      // Still has pending items to top-up
      nextStage = "Pending Approval";
      nextStatus = "Pending Approval";
    }

    // 4. Update purchase_returns header
    const { error: updateErr } = await supabase
      .from("purchase_returns")
      .update({
        action_type: actionType,
        transport_paid_by: transportPaidBy,
        current_stage: nextStage,
        overall_status: nextStatus,
        total_damage_value: newTotalDamageValue,
        updated_at: d
      })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // 5. Insert approval event
    const { error: appErr } = await supabase.from("pr_approvals").insert([
      {
        return_id: id,
        event_type: "initial_approval",
        action_type: actionType,
        transport_paid_by: transportPaidBy,
        remarks: remarks || "Approved after physical verification.",
        performed_by: userName,
        performed_at: d,
        item_decisions: itemDecisions
      }
    ]);

    if (appErr) throw appErr;

    // 6. Insert activity log
    const activities = [
      {
        return_id: id,
        action: "Purchase Return Approved",
        stage: nextStage,
        performed_by: userName,
        remarks: `${remarks || "Approved after physical verification."} Action: ${actionType}. Transport: ${transportPaidBy || "N/A"}.`
      }
    ];

    if (actionType === "No Return No Debit Note") {
      activities.push({
        return_id: id,
        action: "Closed - No Return, No Debit Note",
        stage: "Closed - No Action",
        performed_by: userName,
        remarks: "No further action required. Moved directly to History."
      });
    } else if (actionType === "Replace") {
      activities.push({
        return_id: id,
        action: "Replacement Approved",
        stage: "Logistics Pending",
        performed_by: userName,
        remarks: "Supplier will replace the material. Proceeding directly to Arrange Logistics."
      });
    }

    await supabase.from("pr_activity_log").insert(activities);
  }
}

/**
 * =====================================================================
 * STAGE 1b: Top-Up Approval (Approve additional pending quantity)
 * =====================================================================
 */
export async function topUpApproveReturn({ ids, topUpMap, remarks, userName = "Admin" }) {
  const d = new Date().toISOString();

  for (const id of ids) {
    const { data: items, error: fetchErr } = await supabase
      .from("purchase_return_items")
      .select("*")
      .eq("return_id", id);

    if (fetchErr) throw fetchErr;

    let anyChanged = false;
    let hasOpenBalance = false;
    const topUpDecisions = [];

    for (const item of items || []) {
      const key = `${id}::${item.item_code}`;
      const add = Number(topUpMap[key]) || 0;
      const pending = Number(item.damage_qty) - Number(item.approved_qty);

      let newApproved = Number(item.approved_qty);
      if (add > 0 && pending > 0) {
        const actualAdd = Math.min(add, pending);
        newApproved += actualAdd;
        anyChanged = true;

        await supabase
          .from("purchase_return_items")
          .update({ approved_qty: newApproved })
          .eq("id", item.id);
      }

      if (Number(item.damage_qty) - newApproved > 0) {
        hasOpenBalance = true;
      }

      topUpDecisions.push({
        item_id: item.id,
        item_code: item.item_code,
        added_qty: add,
        total_approved: newApproved
      });
    }

    if (anyChanged) {
      // If all balance is now approved, advance from Pending Approval to next stage
      const { data: retRow } = await supabase
        .from("purchase_returns")
        .select("action_type, current_stage")
        .eq("id", id)
        .single();

      let nextStage = retRow?.current_stage;
      if (!hasOpenBalance && retRow?.current_stage === "Pending Approval") {
        nextStage = retRow?.action_type === "Replace" ? "Logistics Pending" : "Credit Note Pending";
      }

      await supabase
        .from("purchase_returns")
        .update({
          current_stage: nextStage,
          overall_status: nextStage,
          updated_at: d
        })
        .eq("id", id);

      await supabase.from("pr_approvals").insert([
        {
          return_id: id,
          event_type: "top_up_approval",
          remarks: remarks || "Additional pending quantity approved.",
          performed_by: userName,
          performed_at: d,
          item_decisions: topUpDecisions
        }
      ]);

      await supabase.from("pr_activity_log").insert([
        {
          return_id: id,
          action: "Additional Return Quantity Approved",
          stage: nextStage,
          performed_by: userName,
          remarks: remarks || "Remaining pending quantity approved."
        }
      ]);
    }
  }
}

/**
 * =====================================================================
 * STAGE 1c: Reject Return
 * =====================================================================
 */
export async function rejectReturn({ id, reason, remarks, userName = "Admin" }) {
  const d = new Date().toISOString();

  // 1. Update header
  const { error: retErr } = await supabase
    .from("purchase_returns")
    .update({
      current_stage: "Rejected",
      overall_status: "Rejected",
      updated_at: d
    })
    .eq("id", id);

  if (retErr) throw retErr;

  // 2. Insert approval rejection
  await supabase.from("pr_approvals").insert([
    {
      return_id: id,
      event_type: "rejection",
      rejection_reason: reason,
      remarks: remarks || "",
      performed_by: userName,
      performed_at: d
    }
  ]);

  // 3. Insert activity log
  await supabase.from("pr_activity_log").insert([
    {
      return_id: id,
      action: "Purchase Return Rejected",
      stage: "Rejected",
      performed_by: userName,
      remarks: `${reason} — ${remarks || "No additional remarks"}`
    }
  ]);
}

// Configurable storage bucket for Purchase Returns.
// Uses existing active 'maintenance' bucket under 'purchase-returns/' namespace.
// If you create a dedicated 'purchase-returns' bucket in Supabase, switch this value to 'purchase-returns'.
export const PR_STORAGE_BUCKET = "maintenance";

/**
 * =====================================================================
 * FILE STORAGE UPLOAD HELPER
 * =====================================================================
 */
export async function uploadReturnFile(fileOrUrl, folder = "attachments") {
  if (!fileOrUrl) return null;

  const bucket = PR_STORAGE_BUCKET;
  const isDedicated = bucket === "purchase-returns";

  // If already a remote HTTP URL
  if (typeof fileOrUrl === "string") {
    if (fileOrUrl.startsWith("http://") || fileOrUrl.startsWith("https://")) {
      return fileOrUrl;
    }
    // If it's a data URL, convert to Blob and upload to Supabase storage
    if (fileOrUrl.startsWith("data:")) {
      try {
        const arr = fileOrUrl.split(",");
        const mimeMatch = arr[0].match(/:(.*?)(;|$)/);
        const mime = mimeMatch?.[1] || "application/octet-stream";
        let blob;
        if (arr[0].includes(";base64")) {
          const bstr = atob(arr[1] || "");
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          blob = new Blob([u8arr], { type: mime });
        } else {
          const text = decodeURIComponent(arr[1] || "");
          blob = new Blob([text], { type: mime });
        }
        const ext = mime.split("/")[1]?.split("+")?.[0]?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
        const cleanName = `${Date.now()}_file.${ext}`;
        const filePath = isDedicated
          ? `${folder}/${cleanName}`
          : `purchase-returns/${folder}/${cleanName}`;

        const { error, data } = await supabase.storage
          .from(bucket)
          .upload(filePath, blob, { contentType: mime, upsert: true });

        if (!error && data) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
          return pub?.publicUrl || fileOrUrl;
        }
      } catch (e) {
        console.warn("Error converting data url to storage upload:", e);
      }
    }
    return fileOrUrl;
  }

  // If it's a File or Blob object
  try {
    const cleanFileName = (fileOrUrl.name || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
    const subPath = `${Date.now()}_${cleanFileName}`;
    const filePath = isDedicated
      ? `${folder}/${subPath}`
      : `purchase-returns/${folder}/${subPath}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileOrUrl, {
        contentType: fileOrUrl.type || undefined,
        upsert: true
      });

    if (!uploadError && uploadData) {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return pub?.publicUrl || null;
    } else {
      console.warn("Storage upload warning:", uploadError?.message);
    }
  } catch (err) {
    console.warn("uploadReturnFile exception:", err);
  }

  return null;
}

/**
 * HELPER: Resolve array of item UUIDs for a return, filtering out any excluded item codes
 */
async function resolveIncludedItemIds(returnId, excludedCodes = []) {
  try {
    const { data: items } = await supabase
      .from("purchase_return_items")
      .select("id, item_code")
      .eq("return_id", returnId);
    if (!items || items.length === 0) return null;
    const excludedSet = new Set(excludedCodes || []);
    return items
      .filter((it) => !excludedSet.has(it.item_code))
      .map((it) => it.id);
  } catch {
    return null;
  }
}

/**
 * =====================================================================
 * STAGE 2: Submit Credit Note Request
 * =====================================================================
 */
export async function submitCreditNote({
  ids,
  attachmentName = null,
  attachmentUrl = null,
  attachmentFile = null,
  remarks = "",
  excludedCodesMap = {},
  userName = "Admin"
}) {
  const d = new Date().toISOString();

  // If file object or data URL is provided, upload to Supabase storage
  let finalUrl = attachmentUrl;
  if (attachmentFile) {
    console.log("☁️ [purchaseReturnApi] Uploading attachmentFile to storage...", attachmentFile.name);
    const uploaded = await uploadReturnFile(attachmentFile, "credit-notes");
    if (uploaded) {
      console.log("☁️ [purchaseReturnApi] Uploaded successfully, public URL:", uploaded);
      finalUrl = uploaded;
    }
  } else if (attachmentUrl && attachmentUrl.startsWith("data:")) {
    console.log("☁️ [purchaseReturnApi] Uploading base64 data to storage...");
    const uploaded = await uploadReturnFile(attachmentUrl, "credit-notes");
    if (uploaded) {
      console.log("☁️ [purchaseReturnApi] Uploaded successfully, public URL:", uploaded);
      finalUrl = uploaded;
    }
  }

  for (const id of ids) {
    const { data: retRow, error: retErr } = await supabase
      .from("purchase_returns")
      .select("action_type, transport_paid_by, return_number")
      .eq("id", id)
      .single();

    if (retErr) throw retErr;

    // Next stage: 'Ex-Factory' or 'Ex-Factory at transport' requires Logistics;
    // Otherwise skips logistics and goes directly to Debit Note Pending
    const isExFactory = isLogisticsTerm(retRow?.transport_paid_by);
    const nextStage = isExFactory
      ? "Logistics Pending"
      : "Debit Note Pending";

    console.log(`🔄 [purchaseReturnApi] Processing return: ${retRow?.return_number || id}`);
    console.log(`   Action Type: "${retRow?.action_type}", Transport Paid By: "${retRow?.transport_paid_by}"`);
    console.log(`   ➡️ Next Stage: "${nextStage}"`);

    const includedItemIds = await resolveIncludedItemIds(id, excludedCodesMap[id]);

    // 1. Insert or update pr_credit_notes
    const { error: cnErr } = await supabase.from("pr_credit_notes").upsert(
      [
        {
          return_id: id,
          asked_by: userName,
          asked_at: d,
          attachment_name: attachmentName,
          attachment_url: finalUrl,
          remarks: remarks || "Credit note request sent to supplier.",
          included_item_ids: includedItemIds
        }
      ],
      { onConflict: "return_id" }
    );

    if (cnErr) throw cnErr;
    console.log("   ✅ Saved to pr_credit_notes");

    // 2. Update purchase_returns stage
    await supabase
      .from("purchase_returns")
      .update({
        current_stage: nextStage,
        overall_status: nextStage,
        updated_at: d
      })
      .eq("id", id);
    console.log(`   ✅ purchase_returns stage updated to "${nextStage}"`);

    // 3. Activity log
    await supabase.from("pr_activity_log").insert([
      {
        return_id: id,
        action: "Party Asked For Credit Note",
        stage: nextStage,
        performed_by: userName,
        remarks: remarks || "Credit note request sent to supplier.",
        attachment_name: attachmentName,
        attachment_url: finalUrl
      }
    ]);
  }
}

/**
 * =====================================================================
 * STAGE 3: Arrange Logistics
 * =====================================================================
 */
export async function arrangeLogistics({
  ids,
  data,
  excludedCodesMap = {},
  userName = "Admin"
}) {
  const d = new Date().toISOString();

  let biltyUrl = data.biltyCopyUrl || null;
  if (data.biltyFile) {
    const uploaded = await uploadReturnFile(data.biltyFile, "bilty");
    if (uploaded) biltyUrl = uploaded;
  } else if (biltyUrl && biltyUrl.startsWith("data:")) {
    const uploaded = await uploadReturnFile(biltyUrl, "bilty");
    if (uploaded) biltyUrl = uploaded;
  }

  for (const id of ids) {
    const { data: retRow } = await supabase
      .from("purchase_returns")
      .select("action_type")
      .eq("id", id)
      .single();

    // If 'Replace', skips Debit Note and moves to 'Return From Plant Pending'.
    // Otherwise moves to 'Debit Note Pending'.
    const nextStage =
      retRow?.action_type === "Replace"
        ? "Return From Plant Pending"
        : "Debit Note Pending";

    const includedItemIds = await resolveIncludedItemIds(id, excludedCodesMap[id]);

    // 1. Upsert pr_logistics
    const { error: logErr } = await supabase.from("pr_logistics").upsert(
      [
        {
          return_id: id,
          transporter_name: data.transporterName || "Direct Carrier",
          vehicle_number: data.vehicleNumber || "N/A",
          driver_name: data.driverName || null,
          driver_mobile: data.driverMobile || null,
          bilty_available: data.biltyAvailable === "Yes",
          bilty_number: data.biltyNumber || null,
          bilty_copy_name: data.biltyCopyName || null,
          bilty_copy_url: biltyUrl,
          transporting_amount: Number(data.transportingAmount) || 0,
          expected_return_date: data.transportDate || null,
          remarks: data.remarks || "",
          arranged_by: userName,
          arranged_at: d,
          included_item_ids: includedItemIds
        }
      ],
      { onConflict: "return_id" }
    );

    if (logErr) throw logErr;

    // 2. Update purchase_returns header
    await supabase
      .from("purchase_returns")
      .update({
        current_stage: nextStage,
        overall_status: nextStage,
        updated_at: d
      })
      .eq("id", id);

    // 3. Activity log
    await supabase.from("pr_activity_log").insert([
      {
        return_id: id,
        action: "Logistics Arranged",
        stage: nextStage,
        performed_by: userName,
        remarks: `Transporter: ${data.transporterName}, Vehicle: ${data.vehicleNumber}.`,
        attachment_name: data.biltyCopyName || null,
        attachment_url: biltyUrl
      }
    ]);
  }
}

/**
 * =====================================================================
 * STAGE 4: Issue Debit Note
 * =====================================================================
 */
export async function issueDebitNote({
  ids,
  data,
  excludedCodesMap = {},
  userName = "Admin"
}) {
  const d = new Date().toISOString();

  let docUrl = data.imageUrl || null;
  if (data.imageFile) {
    const uploaded = await uploadReturnFile(data.imageFile, "debit-notes");
    if (uploaded) docUrl = uploaded;
  } else if (docUrl && docUrl.startsWith("data:")) {
    const uploaded = await uploadReturnFile(docUrl, "debit-notes");
    if (uploaded) docUrl = uploaded;
  }

  for (const id of ids) {
    const { data: retRow } = await supabase
      .from("purchase_returns")
      .select("action_type, total_damage_value")
      .eq("id", id)
      .single();

    // If 'Make Debit Note', this is the final step -> 'Completed'.
    // If 'Return Material and Debit Note', next step is 'Return From Plant Pending'.
    const nextStage =
      retRow?.action_type === "Make Debit Note"
        ? "Completed"
        : "Return From Plant Pending";

    const noteAmount =
      Number(data.amount) || Number(retRow?.total_damage_value) || 0;

    const includedItemIds = await resolveIncludedItemIds(id, excludedCodesMap[id]);

    // 1. Upsert pr_debit_notes
    const { error: dnErr } = await supabase.from("pr_debit_notes").upsert(
      [
        {
          return_id: id,
          debit_note_number: data.number || `DN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          debit_note_date: data.date || new Date().toISOString().split("T")[0],
          amount: noteAmount,
          document_name: data.imageName || null,
          document_url: docUrl,
          remarks: data.remarks || "",
          issued_by: userName,
          issued_at: d,
          included_item_ids: includedItemIds
        }
      ],
      { onConflict: "return_id" }
    );

    if (dnErr) throw dnErr;

    // 2. Update purchase_returns header
    await supabase
      .from("purchase_returns")
      .update({
        current_stage: nextStage,
        overall_status: nextStage,
        updated_at: d
      })
      .eq("id", id);

    // 3. Activity log
    await supabase.from("pr_activity_log").insert([
      {
        return_id: id,
        action: "Debit Note Issued & Supplier Informed",
        stage: nextStage,
        performed_by: userName,
        remarks: `Debit Note ${data.number || "issued"} for ₹${noteAmount.toLocaleString()} issued.`,
        attachment_name: data.imageName || null,
        attachment_url: docUrl
      }
    ]);
  }
}

/**
 * =====================================================================
 * STAGE 5: Confirm Plant Dispatch (Physical Gate Exit)
 * =====================================================================
 */
export async function confirmPlantDispatch({
  ids,
  data,
  excludedCodesMap = {},
  userName = "Admin"
}) {
  const d = new Date().toISOString();

  let photoUrl = data.photoUrl || null;
  if (data.photoFile) {
    const uploaded = await uploadReturnFile(data.photoFile, "dispatch-loading");
    if (uploaded) photoUrl = uploaded;
  } else if (photoUrl && photoUrl.startsWith("data:")) {
    const uploaded = await uploadReturnFile(photoUrl, "dispatch-loading");
    if (uploaded) photoUrl = uploaded;
  }

  let passUrl = data.attachmentUrl || null;
  if (data.attachmentFile) {
    const uploaded = await uploadReturnFile(data.attachmentFile, "dispatch-gatepass");
    if (uploaded) passUrl = uploaded;
  } else if (passUrl && passUrl.startsWith("data:")) {
    const uploaded = await uploadReturnFile(passUrl, "dispatch-gatepass");
    if (uploaded) passUrl = uploaded;
  }

  for (const id of ids) {
    const { data: retRow } = await supabase
      .from("purchase_returns")
      .select("*, items:purchase_return_items(*)")
      .eq("id", id)
      .single();

    // Determine actual dispatch quantity for this specific return request
    let dispatchQty = Number(data.actualQty) || 0;
    if (dispatchQty <= 0 && retRow?.items) {
      const excludedSet = new Set(excludedCodesMap[id] || []);
      const includedItems = retRow.items.filter((it) => !excludedSet.has(it.item_code));
      dispatchQty = includedItems.reduce(
        (sum, it) => sum + (Number(it.approved_qty) || Number(it.damage_qty) || 0),
        0
      );
    }
    if (dispatchQty <= 0) {
      dispatchQty = 1; // Fallback so check constraint actual_qty > 0 is satisfied
    }

    // 1. Record stock transaction in inventory ledger (optional/safe)
    let inventoryTxnId = null;
    try {
      const { data: txns } = await supabase
        .from("inventory_transactions")
        .select("id")
        .like("id", "TXN-%");
      let nextNum = 1;
      if (txns && txns.length > 0) {
        const nums = txns
          .map((t) => {
            const m = t.id?.match(/^TXN-(\d+)$/);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter((n) => n > 0);
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
      }
      const nextTxnId = "TXN-" + String(nextNum).padStart(5, "0");
      const firstItem = retRow?.items?.[0];

      const { data: txnRow } = await supabase
        .from("inventory_transactions")
        .insert([
          {
            id: nextTxnId,
            date: d.split("T")[0],
            sku: firstItem?.sku || firstItem?.item_code || "RETURN",
            name: firstItem?.item_name || "Purchase Return Material",
            material_type: "RM",
            qty: dispatchQty,
            type: "OUT",
            movement_type: "OUT",
            ref: retRow?.return_number || id,
            remarks: `Purchase return dispatch ${retRow?.return_number || ""}`,
            user_name: userName,
            firm: retRow?.company || null
          }
        ])
        .select()
        .single();

      if (txnRow) inventoryTxnId = txnRow.id;
    } catch {
      // Non-blocking if inventory_transactions constraints differ
    }

    const includedItemIds = await resolveIncludedItemIds(id, excludedCodesMap[id]);

    // 2. Upsert pr_dispatches
    const { error: dispErr } = await supabase.from("pr_dispatches").upsert(
      [
        {
          return_id: id,
          actual_qty: dispatchQty,
          loading_photo_name: data.photoName || null,
          loading_photo_url: photoUrl,
          gate_pass_name: data.attachmentName || null,
          gate_pass_url: passUrl,
          remarks: data.remarks || "",
          dispatched_by: userName,
          dispatched_at: d,
          inventory_txn_id: inventoryTxnId,
          included_item_ids: includedItemIds
        }
      ],
      { onConflict: "return_id" }
    );

    if (dispErr) throw dispErr;

    // 3. Update purchase_returns header to Completed
    await supabase
      .from("purchase_returns")
      .update({
        current_stage: "Completed",
        overall_status: "Completed",
        updated_at: d
      })
      .eq("id", id);

    // 4. Activity log
    await supabase.from("pr_activity_log").insert([
      {
        return_id: id,
        action: "Material Returned From Plant",
        stage: "Completed",
        performed_by: userName,
        remarks: `Dispatched qty ${dispatchQty} from plant gate. Marked Completed.`,
        attachment_name: data.photoName || data.attachmentName || null,
        attachment_url: data.photoUrl || data.attachmentUrl || null
      }
    ]);
  }
}

/**
 * =====================================================================
 * LOOKUP: Fetch Purchase Orders / Tally Bills to aid new Return creation
 * =====================================================================
 */
export async function fetchPurchaseOrdersForReturn() {
  try {
    // 1. Fetch material receipts with linked purchase_orders
    const { data: receipts, error: recError } = await supabase
      .from("material_receipts")
      .select(
        "id, grn_number, received_date, received_quantity, accepted_quantity, rejected_quantity, status, po_id, purchase_orders(id, po_number, vendor_name, firm_name, delivery_location, item_code, item_name, quantity, unit_rate, gst_percent, indent_id, created_at)"
      )
      .order("created_at", { ascending: false });

    // Fetch indents map to get indent_number
    const { data: indents } = await supabase
      .from("indents")
      .select("id, indent_number");
    const indentMap = new Map();
    (indents || []).forEach((ind) => {
      if (ind.id && ind.indent_number) {
        indentMap.set(ind.id, ind.indent_number);
      }
    });

    const receivedPoMap = new Map();
    if (!recError && receipts) {
      receipts.forEach((r) => {
        if (r.purchase_orders && !receivedPoMap.has(r.purchase_orders.id)) {
          const po = r.purchase_orders;
          const indentNumber = (po.indent_id && indentMap.get(po.indent_id)) || "";
          receivedPoMap.set(po.id, {
            id: po.id,
            receiptId: r.id,
            grnNumber: r.grn_number,
            receivedDate: r.received_date ? r.received_date.split("T")[0] : "",
            receivedQty: Number(r.received_quantity) || Number(po.quantity) || 0,
            acceptedQty: Number(r.accepted_quantity) || 0,
            rejectedQty: Number(r.rejected_quantity) || 0,
            receiptStatus: r.status,
            po_number: po.po_number,
            vendor_name: po.vendor_name,
            firm_name: po.firm_name,
            delivery_location: po.delivery_location,
            item_code: po.item_code,
            item_name: po.item_name,
            quantity: po.quantity,
            unit_rate: po.unit_rate,
            gst_percent: po.gst_percent || "",
            indent_number: indentNumber,
            isReceived: true,
          });
        }
      });
    }

    // 2. Also fetch any other purchase_orders (for complete lookup fallback)
    const { data: allPos } = await supabase
      .from("purchase_orders")
      .select("id, po_number, vendor_name, firm_name, delivery_location, item_code, item_name, quantity, unit_rate, gst_percent, indent_id")
      .order("created_at", { ascending: false })
      .limit(50);

    const result = [];
    receivedPoMap.forEach((v) => result.push(v));
    (allPos || []).forEach((po) => {
      if (!receivedPoMap.has(po.id)) {
        const indentNumber = (po.indent_id && indentMap.get(po.indent_id)) || "";
        result.push({
          ...po,
          receiptId: null,
          grnNumber: "",
          receivedDate: "",
          receivedQty: Number(po.quantity) || 0,
          acceptedQty: 0,
          rejectedQty: 0,
          receiptStatus: "",
          gst_percent: po.gst_percent || po.gst_rate || "",
          indent_number: indentNumber,
          isReceived: false,
        });
      }
    });

    return result;
  } catch (err) {
    console.warn("fetchPurchaseOrdersForReturn error:", err);
    return [];
  }
}

/**
 * =====================================================================
 * MASTER ADDRESSES & COMPANIES (Shared Global Master Settings)
 * =====================================================================
 */
export async function fetchMasterAddresses() {
  try {
    const { data, error } = await supabase
      .from("master_addresses")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("fetchMasterAddresses error:", err);
    return [];
  }
}

/**
 * Extracts company name from master_addresses record or name.
 * In master_addresses, 'name' has division and company/unit embedded:
 * e.g. "Nutech Composites - Nutech Division A - Bhilai Unit"
 * Company is the unit/company name: "Nutech Division A - Bhilai Unit"
 */
export function extractCompanyFromAddress(addressOrName) {
  if (!addressOrName) return "";
  const raw = typeof addressOrName === "string" ? addressOrName : (addressOrName.name || "");
  if (raw.includes(" - ")) {
    return raw.split(" - ").slice(1).join(" - ").trim();
  }
  return raw.trim();
}

/**
 * Extracts division from master_addresses record or name.
 * Division is the prefix entity: "Nutech Composites"
 */
export function extractDivisionFromAddress(addressOrName) {
  if (!addressOrName) return "";
  const raw = typeof addressOrName === "string" ? addressOrName : (addressOrName.name || "");
  if (raw.includes(" - ")) {
    return raw.split(" - ")[0].trim();
  }
  return raw.trim();
}

/**
 * Helper to fetch and extract unique companies and divisions from master_addresses
 */
export async function fetchCompanyAndDivisionOptions() {
  const addresses = await fetchMasterAddresses();
  const companies = Array.from(
    new Set(addresses.map((a) => extractCompanyFromAddress(a)).filter(Boolean))
  );
  const divisions = Array.from(
    new Set(addresses.map((a) => extractDivisionFromAddress(a)).filter(Boolean))
  );

  return {
    addresses,
    companies: companies.length > 0 ? companies : [
      "Nutech Division A - Bhilai Unit",
      "Nutech Division B - Bilaspur Central Store",
      "Nutech Plant 1 - Raipur Factory Gate 2"
    ],
    divisions: divisions.length > 0 ? divisions : [
      "Nutech Composites",
      "NuTech Pipes",
      "Protech Max"
    ]
  };
}

/**
 * =====================================================================
 * READ: Fetch Completed Purchase Returns with Items and Debit Notes
 * Used by Vendor Invoices Payment system to calculate Return Deductions.
 * =====================================================================
 */
export async function fetchCompletedPurchaseReturns(poIds = null) {
  try {
    const { data, error } = await supabase
      .from("purchase_returns")
      .select(`
        *,
        items:purchase_return_items(*),
        debit_notes:pr_debit_notes(*)
      `)
      .or("overall_status.ilike.Completed,current_stage.ilike.Completed,overall_status.eq.Completed,current_stage.eq.Completed");

    if (!error && data) {
      if (poIds && poIds.length > 0) {
        const poIdSet = new Set(poIds.map((id) => String(id).trim().toLowerCase()));
        return data.filter(
          (r) =>
            poIdSet.has(String(r.po_id || "").toLowerCase()) ||
            poIdSet.has(String(r.po_number || "").toLowerCase()) ||
            poIdSet.has(String(r.indent_number || "").toLowerCase()) ||
            poIdSet.has(String(r.bill_number || "").toLowerCase())
        );
      }
      return data;
    }

    // Fallback parallel queries
    const { data: retData, error: retErr } = await supabase
      .from("purchase_returns")
      .select("*")
      .or("overall_status.ilike.Completed,current_stage.ilike.Completed,overall_status.eq.Completed,current_stage.eq.Completed");

    if (retErr) throw retErr;
    if (!retData || retData.length === 0) return [];

    const returnIds = retData.map((r) => r.id);
    const [itemsRes, dnRes] = await Promise.all([
      supabase.from("purchase_return_items").select("*").in("return_id", returnIds),
      supabase.from("pr_debit_notes").select("*").in("return_id", returnIds),
    ]);

    const items = itemsRes.data || [];
    const debitNotes = dnRes.data || [];

    const mapped = retData.map((r) => ({
      ...r,
      items: items.filter((i) => i.return_id === r.id),
      debit_notes: debitNotes.filter((d) => d.return_id === r.id),
    }));

    if (poIds && poIds.length > 0) {
      const poIdSet = new Set(poIds.map((id) => String(id).trim().toLowerCase()));
      return mapped.filter(
        (r) =>
          poIdSet.has(String(r.po_id || "").toLowerCase()) ||
          poIdSet.has(String(r.po_number || "").toLowerCase()) ||
          poIdSet.has(String(r.indent_number || "").toLowerCase()) ||
          poIdSet.has(String(r.bill_number || "").toLowerCase())
      );
    }

    return mapped;
  } catch (err) {
    console.warn("fetchCompletedPurchaseReturns error:", err);
    return [];
  }
}

export const fetchCompletedReturnsByPoIds = fetchCompletedPurchaseReturns;


