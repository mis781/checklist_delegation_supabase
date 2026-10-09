/**
 * scrapUtils.js
 * Utility helpers for identifying and handling SCRAP inventory materials and records.
 */

/**
 * Determines whether a material, finished good, or rejection record represents a SCRAP item.
 * Checks SKU code, Material Name, Category, Sub-Category, and Material Type.
 *
 * @param {Object|string} item - Material object, rejection record, or SKU/name string
 * @returns {boolean}
 */
export const isScrapItem = (item) => {
  if (!item) return false;

  // Direct string check (e.g. SKU or Name passed directly)
  if (typeof item === "string") {
    const s = item.trim();
    return /\bSCRAP\b/i.test(s) || s.toUpperCase().includes("SCRAP");
  }

  const name = String(item.name || item.material_name || "").trim();
  const sku = String(item.sku || item.material_sku || "").trim();
  const category = String(item.category || "").trim();
  const subCategory = String(item.subCategory || item.sub_category || "").trim();
  const materialType = String(
    item.materialType || item.material_type || item.type || ""
  ).trim();

  return (
    name.toUpperCase() === "SCRAP" ||
    /\bSCRAP\b/i.test(name) ||
    name.toUpperCase().includes("SCRAP") ||
    /\bSCRAP\b/i.test(sku) ||
    sku.toUpperCase().includes("SCRAP") ||
    category.toUpperCase() === "SCRAP" ||
    /\bSCRAP\b/i.test(category) ||
    subCategory.toUpperCase() === "SCRAP" ||
    /\bSCRAP\b/i.test(subCategory) ||
    materialType.toUpperCase() === "SCRAP"
  );
};
