// src/systems/inventory/services/batchDetailApi.js
import { supabase } from "../../../SupabaseClient";

/**
 * Fetch all batch detail forms with their items, ordered by production_date desc.
 */
export async function fetchBatchDetailForms() {
  const { data, error } = await supabase
    .from("batch_detail_forms")
    .select(`
      id,
      form_no,
      production_date,
      created_at,
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

  if (error) throw error;
  return data || [];
}

/**
 * Save a new batch detail form along with its line items.
 *
 * @param {{ formNo: string, productionDate: string, items: Array }} params
 */
export async function saveBatchDetailForm({ formNo, productionDate, items }) {
  // 1. Insert the form header
  const { data: formData, error: formError } = await supabase
    .from("batch_detail_forms")
    .insert({ form_no: formNo, production_date: productionDate })
    .select("id, form_no")
    .single();

  if (formError) throw formError;

  const formId = formData.id;

  // 2. Build and insert item rows
  const itemRows = items.map((it) => ({
    form_id: formId,
    form_no: formNo,
    category_id: it.categoryId,
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
