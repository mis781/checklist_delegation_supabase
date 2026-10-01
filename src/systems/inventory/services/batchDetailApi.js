// src/systems/inventory/services/batchDetailApi.js
import { supabase } from "../../../SupabaseClient";

const isMissingColumn = (err) =>
  err && (err.code === "42703" || err.code === "PGRST204" || /column/i.test(err.message || ""));

/**
 * Fetch all batch detail forms with their items, ordered by production_date desc.
 */
export async function fetchBatchDetailForms() {
  let { data, error } = await supabase
    .from("batch_detail_forms")
    .select(`
      id,
      form_no,
      production_date,
      created_at,
      shift,
      sheet_details,
      batch_detail_items (
        id,
        category_id,
        category_name,
        material_id,
        material_name,
        sku,
        qty
      )
    `)
    .order("production_date", { ascending: false });

  // shift / sheet_details columns may not be migrated yet -> fall back
  if (error && isMissingColumn(error)) {
    ({ data, error } = await supabase
      .from("batch_detail_forms")
      .select(`id, form_no, production_date, created_at,
        batch_detail_items (id, category_id, category_name, material_id, material_name, sku, qty)`)
      .order("production_date", { ascending: false }));
  }

  if (error) throw error;
  return data || [];
}

/**
 * Save a new batch detail form along with its line items.
 *
 * @param {{ formNo: string, productionDate: string, items: Array }} params
 */
export async function saveBatchDetailForm({ formNo, productionDate, shift, sheetDetails, items }) {
  // 1. Insert the form header (extras need database/batch_detail_sheet_fields.sql)
  const base = { form_no: formNo, production_date: productionDate };
  let { data: formData, error: formError } = await supabase
    .from("batch_detail_forms")
    .insert({ ...base, shift: shift || null, sheet_details: sheetDetails || null })
    .select("id, form_no")
    .single();

  if (formError && isMissingColumn(formError)) {
    console.warn("batch_detail_forms is missing shift/sheet_details columns; saving without them.");
    ({ data: formData, error: formError } = await supabase
      .from("batch_detail_forms")
      .insert(base)
      .select("id, form_no")
      .single());
  }

  if (formError) throw formError;

  const formId = formData.id;

  // 2. Build and insert item rows
  const itemRows = items.map((it) => ({
    form_id: formId,
    form_no: formNo,
    category_id: it.categoryId ?? null,
    category_name: it.category,
    material_id: it.materialId,
    material_name: it.productName,
    sku: it.sku || null,
    qty: Number(it.quantity) || 0,
  }));

  const { error: itemsError } = await supabase
    .from("batch_detail_items")
    .insert(itemRows);

  if (itemsError) throw itemsError;

  return formData;
}

/**
 * Delete a batch detail form (cascades to items via DB FK constraint).
 */
export async function deleteBatchDetailForm(formId) {
  const { error } = await supabase
    .from("batch_detail_forms")
    .delete()
    .eq("id", formId);

  if (error) throw error;
}

/**
 * Create a new Raw Material product (name + SKU) in inventory_master_material.
 */
export async function createRmMaterial({ name, sku }) {
  const cleanName = String(name || "").trim();
  const cleanSku = String(sku || "").trim();
  if (!cleanName) throw new Error("Product name is required");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("inventory_master_material")
    .insert({
      sku: cleanSku || null,
      name: cleanName,
      material_type: "RM",
      category: "Raw Material",
      division: null,
      status: "Active",
      created_at: now,
      updated_at: now,
    })
    .select("id, sku, name")
    .single();
  if (error) throw error;
  return data;
}
