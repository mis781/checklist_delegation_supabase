import supabase from "../../../SupabaseClient";
import { invalidateIndentWorkflowCache } from "./purchaseWorkflowApi";
import { toLocalIsoTimestamp } from "../utils/dateUtils";

/**
 * =====================================================================
 * STAGE 7: VENDOR PAYMENTS (Advance / Freight / Final)
 * =====================================================================
 */
export async function fetchPayments(poId = null) {
  let query = supabase.from("vendor_payments").select("*, purchase_orders(po_number, vendor_name, item_name, quantity, unit_rate, total_amount)").order("created_at", { ascending: false });
  if (poId) query = query.eq("po_id", poId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createVendorPayment(payload) {
  const safePayload = {
    ...payload,
    payment_date: toLocalIsoTimestamp(payload.payment_date || new Date()),
    created_at: payload.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("vendor_payments")
    .insert([safePayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * =====================================================================
 * STAGE 8: VENDOR LIFTINGS (Follow-up & Material Lifting)
 * =====================================================================
 */
export async function fetchLiftings(poId = null) {
  let query = supabase.from("vendor_liftings").select("*, purchase_orders(*)").order("updated_at", { ascending: false });
  if (poId) query = query.eq("po_id", poId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveVendorLifting(payload) {
  const safePayload = {
    ...payload,
    followup_date: toLocalIsoTimestamp(payload.last_followup_date || payload.followup_date || new Date()),
    last_followup_date: toLocalIsoTimestamp(payload.last_followup_date || payload.followup_date || new Date()),
    expected_lifting_date: payload.next_followup_date || payload.expected_lifting_date ? toLocalIsoTimestamp(payload.next_followup_date || payload.expected_lifting_date) : null,
    actual_lifting_date: payload.actual_lifting_date ? toLocalIsoTimestamp(payload.actual_lifting_date) : null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("vendor_liftings")
      .upsert([safePayload])
      .select()
      .single();

    if (!error) return data;
    throw error;
  } catch (err) {
    if (err?.code === "PGRST204" || err?.message?.includes("column")) {
      // Fallback: sanitize to core known standard columns
      const sanitized = {
        po_id: payload.po_id,
        contact_person: payload.contact_person || "",
        followup_date: safePayload.followup_date,
        expected_lifting_date: safePayload.expected_lifting_date,
        actual_lifting_date: safePayload.actual_lifting_date,
        vehicle_number: payload.vehicle_number || "",
        driver_contact: payload.driver_contact || "",
        lifting_qty: Number(payload.lifting_qty || 0),
        freight_amount: Number(payload.freight_amount || 0),
        transport_rate: payload.transport_rate || "",
        lifting_status: payload.lifting_status || "Follow-Up",
        remarks: payload.remarks || "",
        updated_at: new Date().toISOString(),
      };
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("vendor_liftings")
        .upsert([sanitized])
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      return fallbackData;
    }
    throw err;
  }
}

/**
 * =====================================================================
 * STAGE 8 & 9: TRANSPORTER FOLLOW-UP (In-Transit Logistics)
 * =====================================================================
 */
export async function fetchTransporterFollowups(poId = null) {
  let query = supabase.from("transporter_followups").select("*, purchase_orders(*)").order("updated_at", { ascending: false });
  if (poId) query = query.eq("po_id", poId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveTransporterFollowup(payload) {
  const safePayload = {
    ...payload,
    dispatch_date: payload.dispatch_date ? toLocalIsoTimestamp(payload.dispatch_date) : null,
    expected_arrival_date: payload.expected_arrival_date ? toLocalIsoTimestamp(payload.expected_arrival_date) : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("transporter_followups")
    .upsert([safePayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * =====================================================================
 * STAGE 10: MATERIAL RECEIPTS (Store Gate GRN)
 * =====================================================================
 */
export async function fetchMaterialReceipts() {
  const { data, error } = await supabase
    .from("material_receipts")
    .select("*, purchase_orders(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Record Material Receipt and optionally sync with inventory_transactions (INWARD)
 */
export async function createMaterialReceipt(payload, syncWithInventory = true) {
  const safePayload = {
    ...payload,
    receipt_date: toLocalIsoTimestamp(payload.receipt_date || payload.received_date || new Date()),
    received_date: toLocalIsoTimestamp(payload.received_date || payload.receipt_date || new Date()),
    challan_date: payload.challan_date ? toLocalIsoTimestamp(payload.challan_date) : null,
    created_at: payload.created_at || new Date().toISOString(),
  };

  const { data: receipt, error } = await supabase
    .from("material_receipts")
    .insert([safePayload])
    .select("*, purchase_orders(*)")
    .single();

  if (error) throw error;

  // Auto-Sync with IMS Stock Transactions
  if (syncWithInventory && receipt && receipt.accepted_quantity > 0) {
    try {
      const po = receipt.purchase_orders;
      const sku = po?.item_code || "GEN-ITEM";
      const itemName = po?.item_name || "Purchased Material";
      const acceptedQty = Number(receipt.accepted_quantity);

      const txnId = `TXN-${Date.now().toString().slice(-6)}`;
      const dbTxn = {
        id: txnId,
        date: receipt.received_date || receipt.receipt_date || new Date().toISOString(),
        sku: sku,
        name: itemName,
        material_type: "RM",
        qty: acceptedQty,
        scraps: Number(receipt.rejected_quantity || 0),
        type: "INWARD",
        ref: receipt.grn_number,
        remarks: `Auto-posted from Purchase GRN #${receipt.grn_number} (PO #${po?.po_number || "-"})`,
        user_name: receipt.received_by || "Store Officer",
        firm: po?.firm_name || null,
        party_name: po?.vendor_name || null,
        receiving_date: receipt.received_date || receipt.receipt_date || null,
        invoice_no: null,
        challan_no: null,
      };

      await supabase.from("inventory_transactions").insert([dbTxn]);
    } catch (stockSyncErr) {
      console.warn("Stock transaction auto-sync skipped/warn:", stockSyncErr);
    }
  }

  return receipt;
}

/**
 * =====================================================================
 * STAGE 10 SUB-FLOW: MATERIAL INSPECTIONS & STAGE CHECKPOINTS
 * =====================================================================
 */
export async function fetchMaterialInspections(receiptId = null) {
  let query = supabase.from("material_inspections").select("*").order("created_at", { ascending: false });
  if (receiptId) query = query.eq("material_receipt_id", receiptId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createMaterialInspection(payload) {
  const safePayload = {
    ...payload,
    created_at: payload.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("material_inspections")
    .insert([safePayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * =====================================================================
 * STAGE 10 RETURN FLOW: PURCHASE RETURNS & CREDIT NOTES
 * =====================================================================
 */
export async function fetchPurchaseReturns() {
  const { data, error } = await supabase
    .from("purchase_returns")
    .select("*, purchase_orders(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPurchaseReturn(payload) {
  const safePayload = {
    ...payload,
    created_at: payload.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("purchase_returns")
    .insert([safePayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * =====================================================================
 * STAGE 11: TALLY BILLING (Accounts Verification)
 * =====================================================================
 */
export async function fetchTallyBilling() {
  const { data, error } = await supabase
    .from("tally_billing")
    .select("*, purchase_orders(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTallyBilling(payload) {
  const safePayload = {
    ...payload,
    invoice_date: toLocalIsoTimestamp(payload.invoice_date || new Date()),
    tally_entry_date: payload.tally_entry_date ? toLocalIsoTimestamp(payload.tally_entry_date) : new Date().toISOString(),
    created_at: payload.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("tally_billing")
    .insert([safePayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * =====================================================================
 * STAGE 12: ORDER CANCELLATIONS
 * =====================================================================
 */
export async function fetchOrderCancellations() {
  const { data, error } = await supabase
    .from("order_cancellations")
    .select("*, indents(*), purchase_orders(*)")
    .order("cancellation_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function recordOrderCancellation(payload) {
  const safePayload = {
    ...payload,
    cancellation_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("order_cancellations")
    .insert([safePayload])
    .select()
    .single();

  if (error) throw error;

  // Update status in Indents or POs
  if (payload.indent_id) {
    await supabase.from("indents").update({ status: "Cancelled" }).eq("id", payload.indent_id);
  }
  if (payload.po_id) {
    await supabase.from("purchase_orders").update({ status: "Cancelled" }).eq("id", payload.po_id);
  }

  invalidateIndentWorkflowCache();
  return data;
}

/**
 * =====================================================================
 * DASHBOARD AGGREGATION & KPIS
 * =====================================================================
 */
export async function fetchDashboardSummary() {
  try {
    const [posRes, receiptsRes, paymentsRes, cancelRes, inTransitRes] = await Promise.all([
      supabase.from("purchase_orders").select("*"),
      supabase.from("material_receipts").select("*"),
      supabase.from("vendor_payments").select("*"),
      supabase.from("order_cancellations").select("*"),
      supabase.from("transporter_followups").select("*, purchase_orders(*)").neq("status", "Delivered"),
    ]);

    const pos = posRes.data || [];
    const receipts = receiptsRes.data || [];
    const payments = paymentsRes.data || [];
    const cancellations = cancelRes.data || [];
    const inTransit = inTransitRes.data || [];

    const totalPoCount = pos.length;
    const completedPoCount = pos.filter((p) => p.status === "Completed" || p.status === "Received").length;
    const totalPoValue = pos.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const totalPaymentsPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      totalPoCount,
      completedPoCount,
      totalPoValue,
      totalPaymentsPaid,
      inTransitCount: inTransit.length,
      cancellationCount: cancellations.length,
      pos,
      receipts,
      payments,
      inTransit,
    };
  } catch (err) {
    console.error("fetchDashboardSummary error:", err);
    return null;
  }
}
