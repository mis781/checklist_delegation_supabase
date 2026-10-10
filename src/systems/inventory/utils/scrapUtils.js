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

/**
 * Normalizes text for case-insensitive token and substring matching (ilike equivalent).
 */
export const normalizeText = (text) => {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Resolves the category or specific product descriptor for a material/FG record.
 */
export const getMaterialCategory = (item, lookupMap = {}) => {
  if (!item) return "";
  const sku = item.sku || item.material_sku;
  const name = item.name || item.material_name;

  const found = (sku && lookupMap[sku]) || (name && lookupMap[name]) || item;

  const cat = String(found.category || item.category || "").trim();
  const subCat = String(
    found.subCategory || found.sub_category || item.subCategory || item.sub_category || ""
  ).trim();
  const itemName = String(found.name || item.name || item.material_name || "").trim();

  const isGeneric = !cat || /^(finished\s*goods|raw\s*material|fg|rm)$/i.test(cat);
  if (!isGeneric) return cat;
  if (subCat && !/^(finished\s*goods|raw\s*material|fg|rm)$/i.test(subCat)) return subCat;
  return itemName;
};

/**
 * Matches a Scrap Raw Material candidate against an FG rejection record.
 * Implements case-insensitive (ilike) category-to-scrap mapping:
 * - Door frame category FG weight -> DOOR FRAME SCRAP
 * - Panel category FG weight -> PVC PANEL SCRAP / PANEL SCRAP
 * - Board category FG weight -> BOARD SCRAP
 * - Pipe category FG weight -> PVC PIPE SCRAP
 * - OPVC category FG weight -> OPVC SCRAP
 *
 * @param {Object} scrapMaterial - Raw Material scrap candidate
 * @param {Object} fgRecord - The completed rejection record
 * @param {string} fgCategory - Category of the Finished Good
 * @returns {boolean}
 */
export const matchScrapMaterialForFg = (scrapMaterial, fgRecord, fgCategory = "") => {
  if (!scrapMaterial || !fgRecord) return false;
  if (!isScrapItem(scrapMaterial)) return false;

  // 1. Division / Firm isolation
  const scrapDiv = String(scrapMaterial.division || "").trim().toLowerCase();
  const recordFirm = String(fgRecord.firm || "").trim().toLowerCase();
  if (scrapDiv && recordFirm && scrapDiv !== recordFirm) {
    return false;
  }

  // 2. Normalize FG category tokens
  const resolvedCategory = fgCategory || fgRecord.category || "";
  const normFgCat = normalizeText(resolvedCategory);
  if (!normFgCat) return false;

  const fgWords = normFgCat
    .split(" ")
    .filter((w) => w && !["finished", "goods", "fg"].includes(w));

  if (fgWords.length === 0) return false;

  // 3. Normalize Scrap Material tokens
  const normScrapSku = normalizeText(scrapMaterial.sku || "");
  const normScrapName = normalizeText(scrapMaterial.name || "");
  const scrapText = `${normScrapSku} ${normScrapName}`;

  // Domain-specific keyword matches:
  if (
    normFgCat.includes("door frame") ||
    (fgWords.includes("door") && fgWords.includes("frame"))
  ) {
    return (
      scrapText.includes("door frame") ||
      (scrapText.includes("door") && scrapText.includes("frame"))
    );
  }

  if (normFgCat.includes("panel") || fgWords.includes("panel")) {
    return scrapText.includes("panel");
  }

  if (normFgCat.includes("board") || fgWords.includes("board")) {
    return scrapText.includes("board");
  }

  if (normFgCat.includes("pipe") || fgWords.includes("pipe")) {
    return scrapText.includes("pipe");
  }

  if (normFgCat.includes("opvc") || fgWords.includes("opvc")) {
    return scrapText.includes("opvc");
  }

  // Generic fallback: check if meaningful words of FG category appear in scrapText
  const meaningfulWords = fgWords.filter((w) => !["pvc", "material", "raw"].includes(w));
  if (meaningfulWords.length > 0) {
    return meaningfulWords.some((w) => scrapText.includes(w));
  }

  return false;
};

/**
 * Calculates the net rejection/recycle impact for a material row.
 *
 * @param {Object} material - The material row being rendered
 * @param {Array} completedRecycles - Array of completed recycle records (status === 'completed')
 * @param {Object} fgLookupMap - Map of SKU/Name to FG or material metadata
 * @returns {{ directRecycleQty: number, fgScrapWeightAdded: number, netRecycleQty: number, isScrap: boolean }}
 */
export const calculateMaterialRecycleImpact = (
  material,
  completedRecycles = [],
  fgLookupMap = {}
) => {
  if (!material) {
    return {
      directRecycleQty: 0,
      fgScrapWeightAdded: 0,
      netRecycleQty: 0,
      isScrap: false,
    };
  }

  const isScrap = isScrapItem(material);
  const mSku = String(material.sku || "").trim().toLowerCase();
  const mName = String(material.name || "").trim().toLowerCase();
  const mDiv = String(material.division || "").trim().toLowerCase();

  // 1. Direct Rejection Quantity (for this exact SKU/Name and division)
  const directRecycleQty = (completedRecycles || [])
    .filter((r) => {
      const rSku = String(r.material_sku || "").trim().toLowerCase();
      const rName = String(r.material_name || "").trim().toLowerCase();
      const matchesSkuOrName = rSku ? rSku === mSku : rName && rName === mName;
      if (!matchesSkuOrName) return false;
      if (r.firm && mDiv) {
        return String(r.firm).trim().toLowerCase() === mDiv;
      }
      return true;
    })
    .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  // 2. FG Scrap Weight Added (only for Scrap Raw Materials)
  let fgScrapWeightAdded = 0;
  if (isScrap) {
    fgScrapWeightAdded = (completedRecycles || [])
      .filter((r) => {
        // Must be a Finished Good rejection record with weight > 0
        const isFg = String(r.recycle_type || "").toLowerCase().includes("finish");
        if (!isFg) return false;
        const weight = Number(r.weight) || 0;
        if (weight <= 0) return false;

        const fgCat = getMaterialCategory(r, fgLookupMap);
        return matchScrapMaterialForFg(material, r, fgCat);
      })
      .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  }

  // Net quantity to display in UI columns:
  const netRecycleQty = isScrap
    ? directRecycleQty + fgScrapWeightAdded
    : directRecycleQty;

  return {
    directRecycleQty,
    fgScrapWeightAdded,
    netRecycleQty,
    isScrap,
  };
};
