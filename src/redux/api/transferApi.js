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
