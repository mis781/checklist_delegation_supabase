import supabase from "../../../SupabaseClient";
import { toLocalIsoTimestamp } from "../utils/dateUtils";
import { fetchMasterApprovers } from "./purchaseMasterApi";

// In-flight request caching for workflow join query
let inFlightWorkflowPromise = null;
let cachedWorkflowData = null;
const CACHE_TTL_MS = 1200;

export function invalidateIndentWorkflowCache() {
  cachedWorkflowData = null;
  inFlightWorkflowPromise = null;
}

export function isMissingColumnError(error) {
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    /column .* does not exist/i.test(error?.message || "")
  );
}

/**
 * Fetch all indent workflow rows (Stages 1-6) by joining normalized tables.
 * Returns data in the FlatIndentRow structure for fast table rendering.
 */
export async function fetchIndentWorkflow(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedWorkflowData && now - cachedWorkflowData.timestamp < CACHE_TTL_MS) {
    return cachedWorkflowData.data;
  }
  if (!forceRefresh && inFlightWorkflowPromise) {
    return inFlightWorkflowPromise;
  }

  inFlightWorkflowPromise = (async () => {
    try {
      const [indentsRes, approvalRes, quotationRes, avRes, poRes, delRes] = await Promise.all([
        supabase.from("indents").select("*").order("created_at", { ascending: true }),
        supabase.from("indent_approvals").select("*"),
        supabase.from("quotation_submissions").select("*").order("created_at", { ascending: true }),
        supabase.from("approved_vendors").select("*"),
        supabase.from("purchase_orders").select("indent_id, po_number, status, vendor_name, unit_rate, total_amount, po_date, id"),
        supabase.from("indent_delegations").select("*"),
      ]);

      if (indentsRes.error) throw indentsRes.error;
      const indents = indentsRes.data || [];
      if (indents.length === 0) {
        cachedWorkflowData = { data: [], timestamp: Date.now() };
        return [];
      }

      const approvals = approvalRes.data || [];
      const quotations = quotationRes.data || [];
      const approvedVendors = avRes.data || [];
      const purchaseOrders = poRes.data || [];
      const delegations = delRes.data || [];

      // Build lookup maps
      const approvalMap = new Map();
      approvals.forEach((a) => {
        const list = approvalMap.get(a.indent_id) || [];
        list.push(a);
        approvalMap.set(a.indent_id, list);
      });

      const delMap = new Map();
      delegations.forEach((d) => {
        const list = delMap.get(d.indent_id) || [];
        const name = d.approver_name || d.approver_username;
        if (name && !list.includes(name)) list.push(name);
        delMap.set(d.indent_id, list);
      });

      const quotationMap = new Map();
      quotations.forEach((q) => {
        const list = quotationMap.get(q.indent_id) || [];
        list.push(q);
        quotationMap.set(q.indent_id, list);
      });

      const avMap = new Map();
      approvedVendors.forEach((av) => {
        avMap.set(av.indent_id, av);
      });

      const poMap = new Map();
      purchaseOrders.forEach((po) => {
        if (po.indent_id) poMap.set(po.indent_id, po);
      });

      const rows = indents.map((ind, index) => {
        const indApprovals = approvalMap.get(ind.id) || [];
        const latestApproval = indApprovals[indApprovals.length - 1];
        const indQuotes = quotationMap.get(ind.id) || [];
        const av = avMap.get(ind.id);
        const po = poMap.get(ind.id);
        const delegatedTo = (delMap.get(ind.id) || []).join(", ");

        const q1 = indQuotes[0];
        const q2 = indQuotes[1];
        const q3 = indQuotes[2];

        const quotationIds = {};
        if (q1?.id) quotationIds["1"] = q1.id;
        if (q2?.id) quotationIds["2"] = q2.id;
        if (q3?.id) quotationIds["3"] = q3.id;

        const totalApprovedQty = indApprovals
          .filter((a) => a.approval_status === "approved")
          .reduce((acc, a) => acc + Number(a.approved_qty || 0), 0);

        const isRegularVendor = latestApproval?.vendor_type === "regular";

        return {
          id: ind.id,
          originalIndex: index + 1,
          status: ind.status || "Pending Approval",
          data: {
            createdAt: ind.created_at || "",
            indentNumber: ind.indent_number || "",
            createdBy: ind.created_by || "",
            category: ind.category || "",
            itemName: ind.item_name || "",
            quantity: String(ind.quantity || ""),
            warehouseLocation: ind.warehouse_location || "",
            itemCode: ind.item_code || "",
            leadTime: ind.required_date || "",
            deliveryLocation: ind.delivery_location || "",
            specifications: ind.specifications || "",
            urgency: ind.urgency || "Medium",
            delegatedTo: delegatedTo || "",

            // Stage 3: Approval
            plan1: ind.created_at || "",
            actual1: latestApproval?.approved_at || "",
            delay: "",
            approvedQty: latestApproval ? String(latestApproval.approved_qty || "") : "",
            vendorType: latestApproval?.vendor_type || "",
            approvalStatus: latestApproval?.approval_status || "",
            approverUsername: latestApproval?.approver_username || "",
            remarks: latestApproval?.remarks || "",
            rejectionReason: latestApproval?.rejection_reason || "",
            attachment: ind.attachment_url || "",

            // Stage 4: Quotations
            vendor1Name: q1?.vendor_name || (isRegularVendor && av ? av.vendor_name : ""),
            vendor1Rate: q1 ? String(q1.quoted_rate || "") : (isRegularVendor && av ? String(av.final_agreed_rate || "") : ""),
            vendor1Terms: q1?.payment_terms || "",
            vendor1Delivery: q1?.delivery_terms || "",
            vendor1Approved: q1?.is_selected ? "true" : (isRegularVendor ? "true" : ""),
            vendor1Remarks: q1?.remarks || "",
            vendor1Gst: q1 ? String(q1.gst_percent || q1.tax_percent || "") : "",
            vendor1TransportType: q1?.transport_type || "",
            vendor1PdfUrl: q1?.quotation_pdf_url || q1?.quotation_file_url || "",

            vendor2Name: q2?.vendor_name || "",
            vendor2Rate: q2 ? String(q2.quoted_rate || "") : "",
            vendor2Terms: q2?.payment_terms || "",
            vendor2Delivery: q2?.delivery_terms || "",
            vendor2Approved: q2?.is_selected ? "true" : "",
            vendor2Remarks: q2?.remarks || "",
            vendor2Gst: q2 ? String(q2.gst_percent || q2.tax_percent || "") : "",
            vendor2TransportType: q2?.transport_type || "",
            vendor2PdfUrl: q2?.quotation_pdf_url || q2?.quotation_file_url || "",

            vendor3Name: q3?.vendor_name || "",
            vendor3Rate: q3 ? String(q3.quoted_rate || "") : "",
            vendor3Terms: q3?.payment_terms || "",
            vendor3Delivery: q3?.delivery_terms || "",
            vendor3Approved: q3?.is_selected ? "true" : "",
            vendor3Remarks: q3?.remarks || "",
            vendor3Gst: q3 ? String(q3.gst_percent || q3.tax_percent || "") : "",
            vendor3TransportType: q3?.transport_type || "",
            vendor3PdfUrl: q3?.quotation_pdf_url || q3?.quotation_file_url || "",

            // Stage 5: Approved Vendor
            selectedVendor: av ? (av.selected_quotation_id === q1?.id ? "1" : av.selected_quotation_id === q2?.id ? "2" : av.selected_quotation_id === q3?.id ? "3" : "1") : "",
            selectedVendorName: av?.vendor_name || "",
            finalAgreedRate: av ? String(av.final_agreed_rate || "") : "",
            finalApprovedBy: av?.approved_by || "",
            negotiationRemarks: av?.approval_remarks || "",

            // Stage 6: PO
            poNumber: po?.po_number || "",
            poStatus: po?.status || "",
            poId: po?.id || "",
            poDate: po?.po_date || "",
            poUnitRate: po ? String(po.unit_rate || "") : "",
            poTotalAmount: po ? String(po.total_amount || "") : "",

            // Summary metrics
            indentQty: String(ind.quantity || ""),
            totalApprovedQty: String(totalApprovedQty),
            uom: ind.uom || "NOS",
          },
          _quotationIds: quotationIds,
          _approvalId: latestApproval?.id,
          _approvedVendorId: av?.id,
          _poId: po?.id,
        };
      });

      cachedWorkflowData = { data: rows, timestamp: Date.now() };
      return rows;
    } catch (err) {
      console.error("fetchIndentWorkflow error:", err);
      throw err;
    } finally {
      inFlightWorkflowPromise = null;
    }
  })();

  return inFlightWorkflowPromise;
}

/**
 * Stage 1: Create Indent
 */
export async function createIndent(payload) {
  const safePayload = {
    ...payload,
    required_date: payload.required_date ? toLocalIsoTimestamp(payload.required_date) : null,
    planned_date: payload.planned_date ? toLocalIsoTimestamp(payload.planned_date) : null,
    created_at: payload.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("indents")
    .insert([safePayload])
    .select()
    .single();

  if (error) throw error;
  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage 2: Delegate Indent to Approvers
 */
export async function delegateIndent(indentId, approverUsernames, delegatedBy = "") {
  // Delete existing delegations for this indent then re-insert
  await supabase.from("indent_delegations").delete().eq("indent_id", indentId);

  if (!approverUsernames || approverUsernames.length === 0) {
    invalidateIndentWorkflowCache();
    return true;
  }

  const rows = approverUsernames.map((u) => ({
    indent_id: indentId,
    approver_username: typeof u === "string" ? u : u.username || u.name,
    approver_name: typeof u === "string" ? u : u.name || u.username,
    delegated_by: delegatedBy,
  }));

  const { error } = await supabase.from("indent_delegations").insert(rows);
  if (error) throw error;
  invalidateIndentWorkflowCache();
  return true;
}

/**
 * Stage 3: Approve / Reject Indent
 */
export async function approveIndent({ indentId, approverUsername, approvalStatus, approvedQty, vendorType, rejectionReason, remarks }) {
  const { data, error } = await supabase
    .from("indent_approvals")
    .insert([{
      indent_id: indentId,
      approver_username: approverUsername,
      approval_status: approvalStatus,
      approved_qty: Number(approvedQty || 0),
      vendor_type: vendorType || "regular",
      rejection_reason: rejectionReason || null,
      remarks: remarks || null,
      approved_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;

  // Update indent status
  const newStatus = approvalStatus === "approved" ? "Approved" : "Rejected";
  await supabase.from("indents").update({ status: newStatus }).eq("id", indentId);

  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage 4: Submit Quotation (Single or Vendor Portal)
 */
export async function submitQuotation(payload) {
  const safePayload = {
    indent_id: payload.indent_id,
    vendor_name: payload.vendor_name,
    quoted_rate: payload.quoted_rate != null ? Number(payload.quoted_rate) : 0,
    gst_percent: payload.gst_percent != null ? Number(payload.gst_percent) : 18,
    delivery_terms: payload.delivery_terms || "",
    payment_terms: payload.payment_terms || "",
    transport_type: payload.transport_type || "",
    quotation_pdf_url: payload.quotation_pdf_url || null,
    remarks: payload.remarks || "",
    is_selected: payload.is_selected === true,
  };

  const { data, error } = await supabase
    .from("quotation_submissions")
    .insert([safePayload])
    .select()
    .single();

  if (error) throw error;
  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage 5: Select Approved Vendor
 */
export async function selectApprovedVendor({ indentId, selectedQuotationId, vendorName, vendorType, finalAgreedRate, approvalRemarks, approvedBy }) {
  // Mark is_selected in quotation_submissions
  if (selectedQuotationId) {
    await supabase.from("quotation_submissions").update({ is_selected: false }).eq("indent_id", indentId);
    await supabase.from("quotation_submissions").update({ is_selected: true }).eq("id", selectedQuotationId);
  }

  // Clean up any previous approved vendor record for this indent
  try {
    await supabase.from("approved_vendors").delete().eq("indent_id", indentId);
  } catch (delErr) {
    console.warn("Clean up existing approved vendor warning:", delErr);
  }

  const { data, error } = await supabase
    .from("approved_vendors")
    .insert([{
      indent_id: indentId,
      selected_quotation_id: selectedQuotationId || null,
      vendor_name: vendorName,
      vendor_type: vendorType || "regular",
      final_agreed_rate: Number(finalAgreedRate || 0),
      approval_remarks: approvalRemarks || null,
      approved_by: approvedBy || null,
      approved_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage 6: Create Purchase Order (PO Entry)
 */
export async function createPurchaseOrder(payload) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  // Update Indent status to 'PO Issued'
  if (payload.indent_id) {
    await supabase.from("indents").update({ status: "PO Issued" }).eq("id", payload.indent_id);
  }

  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Generate next sequence numbers (IND-001, PO-001, GRN-001, RET-001)
 */
export async function generateSequence(prefix, table, column) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return `${prefix}-001`;
    }

    let maxNum = 0;
    const regex = new RegExp(`^${prefix}-(\\d+)`, "i");
    data.forEach((row) => {
      const val = row[column];
      if (val) {
        const match = String(val).match(regex);
        if (match && match[1]) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
    });

    const next = maxNum + 1;
    return `${prefix}-${String(next).padStart(3, "0")}`;
  } catch (e) {
    return `${prefix}-001`;
  }
}

/**
 * Stage 8: Record Material Lifting & Bilty
 */
export async function recordMaterialLifting(indentId, payload) {
  const dispatchTs = payload.dispatch_date ? toLocalIsoTimestamp(payload.dispatch_date) : new Date().toISOString();
  const arrivalTs = payload.expected_arrival_date ? toLocalIsoTimestamp(payload.expected_arrival_date) : null;

  const { data, error } = await supabase
    .from("vendor_liftings")
    .upsert([{
      indent_id: indentId,
      transporter_name: payload.transporter_name,
      vehicle_number: payload.vehicle_number,
      driver_phone: payload.driver_phone,
      bilty_number: payload.bilty_number,
      bilty_url: payload.bilty_url,
      dispatch_date: dispatchTs,
      expected_arrival_date: arrivalTs,
      remarks: payload.remarks,
      lifted_by: payload.lifted_by,
      status: "Dispatched",
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;

  // Also create initial entry in transporter_followups
  try {
    await supabase.from("transporter_followups").upsert([{
      indent_id: indentId,
      transporter_name: payload.transporter_name,
      vehicle_number: payload.vehicle_number,
      driver_phone: payload.driver_phone,
      bilty_number: payload.bilty_number,
      bilty_url: payload.bilty_url,
      dispatch_date: dispatchTs,
      expected_arrival_date: arrivalTs,
      current_location: "Dispatched from Supplier Hub",
      status: "In Transit",
      updated_at: new Date().toISOString(),
    }]);
  } catch (tErr) {
    console.warn("Transporter follow-up sync:", tErr);
  }

  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage 9: Update Transporter Transit Checkpoint
 */
export async function updateTransporterFollowUp(indentId, payload) {
  const { data, error } = await supabase
    .from("transporter_followups")
    .upsert([{
      indent_id: indentId,
      current_location: payload.current_location,
      status: payload.transit_status,
      expected_arrival_date: payload.revised_eta ? toLocalIsoTimestamp(payload.revised_eta) : undefined,
      delay_reason: payload.delay_reason || null,
      remarks: payload.remarks || null,
      updated_by: payload.updated_by,
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage 10: Record Gate Inward & Quality Inspection (GRN)
 */
export async function recordMaterialReceipt(indentId, payload) {
  const nextGrn = await generateSequence("GRN", "material_receipts", "grn_number");
  const rcptTs = payload.receipt_date ? toLocalIsoTimestamp(payload.receipt_date) : new Date().toISOString();
  const challanTs = payload.challan_date ? toLocalIsoTimestamp(payload.challan_date) : null;

  const { data, error } = await supabase
    .from("material_receipts")
    .insert([{
      indent_id: indentId,
      grn_number: nextGrn,
      receipt_date: rcptTs,
      challan_number: payload.challan_number,
      challan_date: challanTs,
      received_quantity: payload.received_quantity,
      accepted_quantity: payload.accepted_quantity,
      shortage_quantity: payload.shortage_quantity || 0,
      rejected_quantity: payload.rejected_quantity || 0,
      gross_weight_kg: payload.gross_weight_kg || 0,
      tare_weight_kg: payload.tare_weight_kg || 0,
      storage_location: payload.storage_location,
      remarks: payload.remarks,
      inspected_by: payload.inspected_by,
      status: "Received",
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;

  // Auto-Sync with IMS Stock Transactions (INWARD)
  if (payload.accepted_quantity > 0) {
    try {
      const txnId = `TXN-${Date.now().toString().slice(-6)}`;
      await supabase.from("inventory_transactions").insert([{
        id: txnId,
        date: rcptTs,
        sku: "RM-INWARD",
        name: "Purchased Material",
        material_type: "RM",
        qty: payload.accepted_quantity,
        scraps: Number(payload.rejected_quantity || 0),
        type: "INWARD",
        ref: nextGrn,
        remarks: `Auto-posted from Purchase GRN #${nextGrn} (Challan #${payload.challan_number})`,
        user_name: payload.inspected_by || "Gate Storekeeper",
        receiving_date: rcptTs,
      }]);
    } catch (stockSyncErr) {
      console.warn("Stock ledger auto-sync warning:", stockSyncErr);
    }
  }

  // Update Indent status
  await supabase.from("indents").update({ status: "Received" }).eq("id", indentId);
  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage 11: Record Tally ERP Billing Voucher
 */
export async function recordTallyBilling(indentId, payload) {
  const invTs = payload.invoice_date ? toLocalIsoTimestamp(payload.invoice_date) : new Date().toISOString();
  try {
    const { data, error } = await supabase
      .from("tally_billing")
      .insert([{
        po_id: payload.po_id || payload.poId || indentId,
        vendor_invoice_number: payload.invoice_number || payload.vendor_invoice_number || "",
        invoice_date: invTs,
        invoice_amount: payload.invoice_amount || payload.total_bill_amount || 0,
        accountant_name: payload.billed_by || payload.accountant_name || "",
        verification_status: payload.status || "Verified",
        tally_voucher_number: payload.tally_voucher_number || null,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from("indents").update({ status: "Completed" }).eq("id", indentId);
    invalidateIndentWorkflowCache();
    return data;
  } catch (err) {
    if (err?.code === "PGRST204" || err?.message?.includes("column")) {
      const { data: fbData, error: fbError } = await supabase
        .from("tally_billing")
        .insert([{
          po_id: payload.po_id || payload.poId || indentId,
          vendor_invoice_number: payload.invoice_number || payload.vendor_invoice_number || "",
          invoice_date: invTs,
          invoice_amount: payload.invoice_amount || payload.total_bill_amount || 0,
          accountant_name: payload.billed_by || payload.accountant_name || "",
          verification_status: "Verified",
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (fbError) throw fbError;
      await supabase.from("indents").update({ status: "Completed" }).eq("id", indentId);
      invalidateIndentWorkflowCache();
      return fbData;
    }
    throw err;
  }
}

/**
 * Stage 12: Cancel Requisition / Order
 */
export async function cancelOrder(indentId, payload) {
  const { data, error } = await supabase
    .from("order_cancellations")
    .insert([{
      indent_id: indentId,
      cancellation_reason: payload.cancellation_reason,
      refund_amount: payload.refund_amount || 0,
      debit_note_number: payload.debit_note_number || null,
      remarks: payload.remarks,
      cancelled_by: payload.cancelled_by,
      cancellation_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;

  await supabase.from("indents").update({ status: "Cancelled" }).eq("id", indentId);
  invalidateIndentWorkflowCache();
  return data;
}

/**
 * Stage Cancel: Cancel active records at any specific stage and restrict further progress
 */
export async function stageCancelRecords({ stageName, records, reason, remarks, cancelledBy }) {
  const nowIso = new Date().toISOString();
  const insertRows = (records || []).map((r) => ({
    indent_id: r.indent_id || r.indentId || r.id,
    po_id: r.po_id || r.poId || null,
    cancelled_by: stageName || "Stage Cancel",
    cancellation_reason: reason || "Stage Cancelled",
    remarks: remarks || `Cancelled at ${stageName || "Stage"}`,
    financial_impact: Number(r.quantity || r.qty || r.remainingQty || 0),
    status: "Stage Cancelled",
    cancellation_date: nowIso,
    created_at: nowIso,
  }));

  if (insertRows.length === 0) return [];

  const { data, error } = await supabase
    .from("order_cancellations")
    .insert(insertRows)
    .select();

  if (error) {
    console.warn("order_cancellations insert note:", error);
  }

  const indentIds = Array.from(new Set(records.map((r) => r.indent_id || r.indentId || r.id).filter(Boolean)));
  const poIds = Array.from(new Set(records.map((r) => r.po_id || r.poId).filter(Boolean)));

  if (indentIds.length > 0) {
    try {
      await supabase.from("indents").update({ status: "Stage Cancelled" }).in("id", indentIds);
    } catch (e) {
      console.warn("indents stage cancel update note:", e);
    }
  }
  if (poIds.length > 0) {
    try {
      await supabase.from("purchase_orders").update({ status: "Stage Cancelled" }).in("id", poIds);
    } catch (e) {
      console.warn("purchase_orders stage cancel update note:", e);
    }
  }

  invalidateIndentWorkflowCache();
  return data || [];
}

/**
 * =====================================================================
 * SIDEBAR PENDING BADGE COUNTS (Stage 2 to Stage 11)
 * =====================================================================
 */
export async function fetchPurchaseSidebarBadgeCounts() {
  try {
    const [
      indentsRes,
      delRes,
      appRes,
      quotationRes,
      avRes,
      poRes,
      paymentsRes,
      liftingsRes,
      followupsRes,
      receiptsRes,
      billingsRes,
      cancelsRes,
    ] = await Promise.allSettled([
      supabase.from("indents").select("id, status"),
      supabase.from("indent_delegations").select("id, indent_id"),
      supabase.from("indent_approvals").select("id, indent_id, vendor_type"),
      supabase.from("quotation_submissions").select("id, indent_id"),
      supabase.from("approved_vendors").select("id, indent_id, vendor_name, vendor_type"),
      supabase.from("purchase_orders").select("id, po_number, indent_id, status, quantity, unit_rate, total_amount, advance_amount, payment_type"),
      supabase.from("vendor_payments").select("id, po_id, amount, payment_type"),
      supabase.from("vendor_liftings").select("id, po_id, lifting_qty, actual_lifting_date"),
      supabase.from("transporter_followups").select("id, po_id, lifting_id, status"),
      supabase.from("material_receipts").select("id, po_id, grn_number, accepted_quantity, received_quantity"),
      supabase.from("tally_billing").select("id, po_id, verification_status"),
      supabase.from("order_cancellations").select("id, indent_id"),
    ]);

    const indents = indentsRes.status === "fulfilled" && indentsRes.value.data ? indentsRes.value.data : [];
    const delegations = delRes.status === "fulfilled" && delRes.value.data ? delRes.value.data : [];
    const approvals = appRes.status === "fulfilled" && appRes.value.data ? appRes.value.data : [];
    const quotations = quotationRes.status === "fulfilled" && quotationRes.value.data ? quotationRes.value.data : [];
    const approvedVendors = avRes.status === "fulfilled" && avRes.value.data ? avRes.value.data : [];
    const purchaseOrders = poRes.status === "fulfilled" && poRes.value.data ? poRes.value.data : [];
    const payments = paymentsRes.status === "fulfilled" && paymentsRes.value.data ? paymentsRes.value.data : [];
    const liftings = liftingsRes.status === "fulfilled" && liftingsRes.value.data ? liftingsRes.value.data : [];
    const followups = followupsRes.status === "fulfilled" && followupsRes.value.data ? followupsRes.value.data : [];
    const receipts = receiptsRes.status === "fulfilled" && receiptsRes.value.data ? receiptsRes.value.data : [];
    const billings = billingsRes.status === "fulfilled" && billingsRes.value.data ? billingsRes.value.data : [];
    const cancels = cancelsRes.status === "fulfilled" && cancelsRes.value.data ? cancelsRes.value.data : [];

    // 1. Delegate Approvers: active indents with NO delegation
    const delegateApproval = indents.filter((r) => {
      const status = String(r.status || "").toLowerCase();
      if (status === "approved" || status === "rejected" || status === "po issued" || status === "completed" || status === "cancelled") return false;
      return !delegations.some((d) => d.indent_id === r.id);
    }).length;

    // 2. Indent Approval: indents delegated but not yet approved / rejected
    const indentApproval = indents.filter((r) => {
      const status = String(r.status || "").toLowerCase();
      const isPendingStatus = status !== "approved" && status !== "rejected" && status !== "po issued" && status !== "completed" && status !== "cancelled";
      return isPendingStatus && delegations.some((d) => d.indent_id === r.id);
    }).length;

    // 3. Quotations: approved indents (new vendor) with 0 quotes
    const quotation = indents.filter((r) => {
      const status = String(r.status || "").toLowerCase();
      const app = approvals.find((a) => a.indent_id === r.id);
      const vType = String(app?.vendor_type || r.vendor_type || "").toLowerCase();
      const isNewVendor = vType === "new vendor" || vType === "new";
      const hasQuotes = quotations.some((q) => q.indent_id === r.id);
      return status === "approved" && !hasQuotes && isNewVendor;
    }).length;

    // 4. Approved Vendor: indents with quotes but no approved vendor chosen yet
    const approvedVendor = indents.filter((r) => {
      const hasQuotes = quotations.some((q) => q.indent_id === r.id);
      const hasSelectedVendor = approvedVendors.some((av) => av.indent_id === r.id);
      return hasQuotes && !hasSelectedVendor;
    }).length;

    // 5. Make PO: indents with approved regular vendor (direct) or approved new vendor without PO issued
    const poEntry = indents.filter((r) => {
      const status = String(r.status || "").toLowerCase();
      const av = approvedVendors.find((a) => a.indent_id === r.id);
      const app = approvals.find((a) => a.indent_id === r.id);
      const hasVendor = !!av?.vendor_name;
      const hasPo = purchaseOrders.some((po) => po.indent_id === r.id);
      const vType = String(app?.vendor_type || av?.vendor_type || "").toLowerCase();
      const isNewVendor = vType === "new vendor" || vType === "new";

      const isPendingRegularVendor = !isNewVendor && status === "approved" && !hasPo;
      const isPendingNewVendor = hasVendor && !hasPo && status !== "po issued" && status !== "cancelled";

      return (isPendingRegularVendor || isPendingNewVendor) && status !== "po issued" && status !== "cancelled";
    }).length;

    // 6. Payment: POs where advance payment is still pending
    const payment = purchaseOrders.filter((po) => {
      const advPayments = payments.filter(
        (p) => (p.po_id === po.id || p.po_id === po.po_number) && (p.payment_type === "Advance" || p.payment_type === "PI")
      );
      const totalAdvancePaid = advPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalVal = Number(po.total_amount || (po.quantity * (po.unit_rate || 500)));
      const targetAdvance = Number(po.advance_amount != null ? po.advance_amount : totalVal * 0.3);
      const isSettled = totalAdvancePaid >= targetAdvance && targetAdvance > 0;
      return !isSettled;
    }).length;

    // 7. Follow-up / Lifting: POs where advance is cleared AND lifting quantity is still pending
    const followUpVendor = purchaseOrders.filter((po) => {
      // Advance Payment Gating (must be cleared to be in Follow-up pending)
      const poPayTypeLower = String(po.payment_type || "").toLowerCase();
      const requiresAdvanceDecision =
        !poPayTypeLower.includes("no advance") &&
        !poPayTypeLower.includes("on dispatch");
      const advPayments = payments.filter(
        (p) => (p.po_id === po.id || p.po_id === po.po_number) && (p.payment_type === "Advance" || p.payment_type === "PI")
      );
      const totalAdvancePaid = advPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalVal = Number(po.total_amount || (po.quantity * (po.unit_rate || 500)));
      const targetAdvance = Number(po.advance_amount != null ? po.advance_amount : totalVal * 0.3);
      const isAdvCleared =
        !requiresAdvanceDecision ||
        targetAdvance <= 0 ||
        totalAdvancePaid >= targetAdvance - 0.01;

      if (!isAdvCleared) return false;

      const poLiftings = liftings.filter((l) => l.po_id === po.id || l.po_id === po.po_number);
      const totalLifted = poLiftings.reduce((sum, l) => sum + Number(l.lifting_qty || 0), 0);
      const totalCancelled = cancels
        .filter((c) => c.indent_id === po.indent_id || c.po_id === po.id || c.po_id === po.po_number)
        .reduce((sum, c) => sum + Number(c.cancelled_qty || c.quantity || (c.refund_amount ? 1 : 0) || 0), 0);
      const totalQty = Number(po.quantity || 0);
      const isComplete = (totalLifted + totalCancelled >= totalQty) && totalQty > 0;
      return !isComplete;
    }).length;

    // 8. Transporter Follow-Up: Dispatched liftings where transit is not yet completed/delivered
    const dispatchedLiftings = liftings.filter((l) => {
      const d = l.actual_lifting_date;
      return d && String(d).trim() !== "" && String(d).trim() !== "-";
    });

    const transporterFollowUp = dispatchedLiftings.filter((lift) => {
      const liftFollowups = followups.filter((t) => t.lifting_id === lift.id || t.po_id === lift.po_id);
      const isDelivered = liftFollowups.some((t) =>
        ["received", "delivered", "completed", "complete"].includes(String(t.status || "").toLowerCase())
      );
      return !isDelivered;
    }).length;

    // 9. Material Received (GRN): Dispatched liftings that have NOT been GRN received
    const materialReceived = dispatchedLiftings.filter((lift) => {
      const hasReceipt = receipts.some(
        (r) =>
          r.po_id === lift.po_id ||
          (r.grn_number && String(r.grn_number).includes(String(lift.id).substring(0, 8)))
      );
      return !hasReceipt;
    }).length;

    // 10. Tally Billing: Receipts that belong to known POs and are not yet marked as Verified
    const tallyBilling = receipts.filter((r) => {
      const poExists = purchaseOrders.some((po) => po.id === r.po_id || po.po_number === r.po_id);
      if (!poExists) return false;
      const billing = billings.find((b) => b.receipt_id === r.id || b.po_id === r.po_id);
      return billing?.verification_status !== "Verified";
    }).length;

    return {
      delegateApproval,
      indentApproval,
      quotation,
      approvedVendor,
      poEntry,
      payment,
      followUpVendor,
      transporterFollowUp,
      materialReceived,
      tallyBilling,
      total:
        delegateApproval +
        indentApproval +
        quotation +
        approvedVendor +
        poEntry +
        payment +
        followUpVendor +
        transporterFollowUp +
        materialReceived +
        tallyBilling,
    };
  } catch (err) {
    console.error("fetchPurchaseSidebarBadgeCounts error:", err);
    return {
      delegateApproval: 0,
      indentApproval: 0,
      quotation: 0,
      approvedVendor: 0,
      poEntry: 0,
      payment: 0,
      followUpVendor: 0,
      transporterFollowUp: 0,
      materialReceived: 0,
      tallyBilling: 0,
      total: 0,
    };
  }
}

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(str));
}

/**
 * Helper to fetch all approvers & delegatees (names + contact phone numbers) for given indent IDs or records.
 */
export async function getApproversForIndents(recordsOrIds = []) {
  if (!recordsOrIds || recordsOrIds.length === 0) return [];
  try {
    const rawItems = Array.isArray(recordsOrIds) ? recordsOrIds : [recordsOrIds];

    const uuidSet = new Set();
    const indentNumSet = new Set();
    const candidateNames = new Set();

    rawItems.forEach((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const str = String(item).trim();
        if (isUUID(str)) uuidSet.add(str);
        else if (str) indentNumSet.add(str);
      } else if (item && typeof item === "object") {
        if (item.id && isUUID(item.id)) uuidSet.add(String(item.id));
        if (item.indent_id && isUUID(item.indent_id)) uuidSet.add(String(item.indent_id));
        if (item.indent_number) indentNumSet.add(String(item.indent_number));
        if (item.indentNumber) indentNumSet.add(String(item.indentNumber));

        if (item.approver_name) candidateNames.add(String(item.approver_name));
        if (item.approver_username) candidateNames.add(String(item.approver_username));
        if (item.approver) candidateNames.add(String(item.approver));
        if (item.delegated_to) candidateNames.add(String(item.delegated_to));
        if (item.created_by) candidateNames.add(String(item.created_by));
      }
    });

    const indentNums = Array.from(indentNumSet);

    // If we have indent numbers but need UUIDs, fetch indents by indent_number
    if (indentNums.length > 0) {
      try {
        const { data: matchedIndents } = await supabase
          .from("indents")
          .select("id, indent_number, approver_name, created_by")
          .in("indent_number", indentNums);

        if (matchedIndents && Array.isArray(matchedIndents)) {
          matchedIndents.forEach((ind) => {
            if (ind.id && isUUID(ind.id)) uuidSet.add(ind.id);
            if (ind.approver_name) candidateNames.add(ind.approver_name);
            if (ind.created_by) candidateNames.add(ind.created_by);
          });
        }
      } catch (e) {
        console.warn("Indent number lookup error:", e);
      }
    }

    const finalUuids = Array.from(uuidSet);

    const [masterApprovers, appRes, delRes, userRes] = await Promise.allSettled([
      fetchMasterApprovers(),
      finalUuids.length > 0
        ? supabase.from("indent_approvals").select("*").in("indent_id", finalUuids)
        : Promise.resolve({ data: [] }),
      finalUuids.length > 0
        ? supabase.from("indent_delegations").select("*").in("indent_id", finalUuids)
        : Promise.resolve({ data: [] }),
      supabase.from("users").select("*"),
    ]);

    const masterApps = masterApprovers.status === "fulfilled" && masterApprovers.value ? masterApprovers.value : [];
    const approvals = appRes.status === "fulfilled" && appRes.value?.data ? appRes.value.data : [];
    const delegations = delRes.status === "fulfilled" && delRes.value?.data ? delRes.value.data : [];
    const users = userRes.status === "fulfilled" && userRes.value?.data ? userRes.value.data : [];

    if (Array.isArray(approvals)) {
      approvals.forEach((a) => {
        if (a.approver_name) candidateNames.add(String(a.approver_name));
        if (a.approver_username) candidateNames.add(String(a.approver_username));
      });
    }

    if (Array.isArray(delegations)) {
      delegations.forEach((d) => {
        if (d.approver_name) candidateNames.add(String(d.approver_name));
        if (d.approver_username) candidateNames.add(String(d.approver_username));
      });
    }

    // Build unified user contact map
    const userMap = new Map();
    if (Array.isArray(users)) {
      users.forEach((u) => {
        const contact =
          u.number ||
          u.phone ||
          u.mobile ||
          u.contact ||
          u.phone_number ||
          u.mobile_number ||
          u.contact_number ||
          "";
        const cleanDigits = String(contact).replace(/\D/g, "");
        if (cleanDigits.length >= 10) {
          const entry = { name: u.name || u.user_name || "Approver", phone: cleanDigits };
          if (u.id) userMap.set(String(u.id), entry);
          if (u.name) userMap.set(String(u.name).toLowerCase().trim(), entry);
          if (u.user_name) userMap.set(String(u.user_name).toLowerCase().trim(), entry);
        }
      });
    }

    if (Array.isArray(masterApps)) {
      masterApps.forEach((ma) => {
        let phone = "";
        if (ma.phone || ma.contact || ma.mobile) {
          phone = String(ma.phone || ma.contact || ma.mobile).replace(/\D/g, "");
        }
        if (!phone && ma.user_id && userMap.has(String(ma.user_id))) {
          phone = userMap.get(String(ma.user_id)).phone;
        }
        if (!phone && ma.approver_name && userMap.has(String(ma.approver_name).toLowerCase().trim())) {
          phone = userMap.get(String(ma.approver_name).toLowerCase().trim()).phone;
        }
        if (phone && phone.length >= 10) {
          const entry = { name: ma.approver_name || ma.name || "Approver", phone };
          if (ma.approver_name) userMap.set(String(ma.approver_name).toLowerCase().trim(), entry);
          if (ma.name) userMap.set(String(ma.name).toLowerCase().trim(), entry);
          if (ma.username) userMap.set(String(ma.username).toLowerCase().trim(), entry);
          if (ma.user_id) userMap.set(String(ma.user_id), entry);
        }
      });
    }

    const resultApprovers = new Map();

    candidateNames.forEach((raw) => {
      const trimmed = String(raw || "").trim();
      const lower = trimmed.toLowerCase();
      if (!lower || lower === "hod" || lower === "admin") return;

      if (userMap.has(lower)) {
        const found = userMap.get(lower);
        resultApprovers.set(found.phone, found);
        return;
      }

      // Check if phone digits are embedded in the string e.g. "test-user ( 📞 7000206500)"
      const embedded = trimmed.replace(/\D/g, "");
      if (embedded.length >= 10) {
        const clean = embedded.slice(-10);
        resultApprovers.set(clean, { name: trimmed.split("(")[0].trim() || trimmed, phone: clean });
        return;
      }

      // Substring search in userMap keys
      for (const [key, val] of userMap.entries()) {
        if (key && (key.includes(lower) || lower.includes(key))) {
          resultApprovers.set(val.phone, val);
          return;
        }
      }
    });

    return Array.from(resultApprovers.values());
  } catch (err) {
    console.warn("getApproversForIndents exception:", err);
    return [];
  }
}

