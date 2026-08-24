// src/redux/api/transferApi.js
import supabase from "../../SupabaseClient";

// Helper: map DB snake_case row to UI camelCase object
export const mapDBTransferToUI = (t) => ({
  id: t.id,
  fromDivision: t.from_division,
  toDivision: t.to_division,
  skuCode: t.sku_code,
  skuName: t.sku_name,
  unit: t.unit || "",
  quantity: Number(t.quantity) || 0,
  availableQty: Number(t.available_qty) || 0,
  transferDate: t.transfer_date,
  operatorName: t.operator_name,
  remarks: t.remarks || "",
  status: t.status || "Pending",
  submittedAt: t.submitted_at,
  approvedAt: t.approved_at,
  approverName: t.approver_name,
});

// Helper: map UI payload to DB snake_case object
export const mapUITransferToDB = (t) => ({
  from_division: t.fromDivision,
  to_division: t.toDivision,
  sku_code: t.skuCode,
  sku_name: t.skuName,
  quantity: Number(t.quantity),
  available_qty: Number(t.availableQty || 0),
  transfer_date: t.transferDate,
  operator_name: t.operatorName,
  remarks: t.remarks || null,
  status: "Pending",
  submitted_at: new Date().toISOString(),
});

// Fetch all transfer records
export const fetchTransfersApi = async () => {
  try {
    const { data, error } = await supabase
      .from("inventory_internal_transfer")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return { data: (data || []).map(mapDBTransferToUI), error: null };
  } catch (err) {
    console.error("Error fetching internal transfers from Supabase:", err);
    return { data: null, error: err.message };
  }
};

// Submit a new transfer request
export const submitTransferApi = async (payload) => {
  try {
    const dbPayload = mapUITransferToDB(payload);
    const { data, error } = await supabase
      .from("inventory_internal_transfer")
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw error;
    return { data: mapDBTransferToUI(data), error: null };
  } catch (err) {
    console.error("Error submitting transfer to Supabase:", err);
    return { data: null, error: err.message };
  }
};

// Helper: Apply transfer quantities directly to inventory_materials table (transferred_qty)
const applyApprovedTransferToMaterials = async (trf) => {
  const skuCode = trf.sku_code;
  const fromDiv = trf.from_division;
  const toDiv = trf.to_division;
  const qty = Number(trf.quantity) || 0;

  if (!skuCode || !fromDiv || !toDiv || qty <= 0) return;

  // 1. Fetch FROM division material row for metadata if needed
  const { data: fromMat } = await supabase
    .from("inventory_materials")
    .select("*")
    .eq("sku", skuCode)
    .eq("division", fromDiv)
    .maybeSingle();

  // Note: FROM division opening is NOT modified; transfer OUT is calculated dynamically from approved transfers.

  // 2. Fetch TO division material row
  const { data: toMat } = await supabase
    .from("inventory_materials")
    .select("*")
    .eq("sku", skuCode)
    .eq("division", toDiv)
    .maybeSingle();

  if (toMat) {
    // If row already exists in TO division, accumulate transferred_qty; leave opening unchanged!
    const newTransferredQty = (Number(toMat.transferred_qty) || 0) + qty;
    await supabase
      .from("inventory_materials")
      .update({
        transferred_division: fromDiv,
        transferred_qty: newTransferredQty,
        transfer_date: trf.transfer_date || new Date().toISOString().slice(0, 10),
        transfer_id: trf.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", toMat.id);
  } else {
    // If row does not exist in TO division, insert new row with opening = 0 and transferred_qty = qty
    const newMaterial = {
      sku: skuCode,
      name: trf.sku_name || fromMat?.name || "Transferred Material",
      category: fromMat?.category || "Raw Material",
      sub_category: fromMat?.sub_category || null,
      material_type: fromMat?.material_type || "RM",
      unit: trf.unit || fromMat?.unit || "PCS",
      location: fromMat?.location || null,
      division: toDiv,
      opening: 0, // Opening stock is 0; transferred qty goes into Total IN
      adc: Number(fromMat?.adc) || 0,
      lead_time: Number(fromMat?.lead_time) || 0,
      safety_factor: Number(fromMat?.safety_factor) || 0,
      moq: Number(fromMat?.moq) || 0,
      supplier_name: fromMat?.supplier_name || null,
      supplier_code: fromMat?.supplier_code || null,
      status: "Active",
      transferred_division: fromDiv,
      transferred_qty: qty,
      transfer_date: trf.transfer_date || new Date().toISOString().slice(0, 10),
      transfer_id: trf.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await supabase.from("inventory_materials").insert(newMaterial);
  }
};

// Approve a transfer request
export const approveTransferApi = async (id, approverName) => {
  try {
    const updateData = {
      status: "Approved",
      approved_at: new Date().toISOString(),
      approver_name: approverName || "Admin",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("inventory_internal_transfer")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Apply stock adjustments directly in inventory_materials
    if (data) {
      await applyApprovedTransferToMaterials(data);
    }

    return { data: mapDBTransferToUI(data), error: null };
  } catch (err) {
    console.error("Error approving transfer in Supabase:", err);
    return { data: null, error: err.message };
  }
};

// Reject a transfer request
export const rejectTransferApi = async (id, approverName) => {
  try {
    const updateData = {
      status: "Rejected",
      approved_at: new Date().toISOString(),
      approver_name: approverName || "Admin",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("inventory_internal_transfer")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { data: mapDBTransferToUI(data), error: null };
  } catch (err) {
    console.error("Error rejecting transfer in Supabase:", err);
    return { data: null, error: err.message };
  }
};
