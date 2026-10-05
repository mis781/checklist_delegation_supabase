/**
 * Batch Detail PDF Generator & Data Formatter
 * Generates the "NUTECH COMPOSITE - BATCH DETAIL" factory sheet on true A4 pages
 * (210 x 297 mm) with jsPDF, exactly matching D:\Botivate\nutech\master-system\public\batch-detail-format.pdf.
 *
 * Rules:
 * 1. Only raw materials with opening stock > 0 are included.
 * 2. Sub-Category Name column = Material Name.
 * 3. Products sharing the same material name are grouped together with a merged category cell.
 * 4. Exact factory layout, coloring, right-hand write-in blocks, and TOTAL row.
 */
import { jsPDF } from "jspdf";

export const PAGE_H = 297;
export const PAGE_W = 210;
export const MARGIN = 6;

// Column widths in mm -> Total 198 mm (fits 210 mm A4 with 6 mm margins on each side)
export const COLS = { sno: 10, cat: 38, sku: 58, qty: 18, rlabel: 40, rvalue: 34 };
export const X = {};
{
  let x = MARGIN;
  Object.entries(COLS).forEach(([k, w]) => {
    X[k] = x;
    x += w;
  });
}
export const RIGHT_X = X.rlabel;
export const RIGHT_W = COLS.rlabel + COLS.rvalue;
export const TABLE_W = Object.values(COLS).reduce((a, b) => a + b, 0);

export const BANNER_H = 8;
export const DATE_H = 6.5;
export const HEAD_H = 6.5;
export const ROW_H = 5.6;
export const TOTAL_H = 6.5;

export const ROWS_PER_PAGE = Math.floor(
  (PAGE_H - 2 * MARGIN - BANNER_H - DATE_H - HEAD_H - TOTAL_H) / ROW_H
); // 45 rows

// Canonical factory order matching public/batch-detail-format.pdf
export const CANONICAL_ORDER = [
  "RESIN",
  "CALCIUM",
  "STABILIZER",
  "PROCESSING AID",
  "WAX",
  "FOAMING",
  "SA",
  "CALCIUM STREATE",
  "HG-60",
  "CPE",
  "TIO2",
  "BLISTER",
  "PULVIZER",
  "COLOUR PIGMENT",
  "GLUE",
  "GOLDEN PATTI",
  "PVC FILM- 12 INCH",
  "PVC FILM- 10 INCH",
  "COMPOUND",
  "SCRAP",
  "GRINDED",
];

// Exact colors extracted from public/batch-detail-format.pdf
export const KNOWN_COLORS = {
  RESIN: "#f9cb9c",
  CALCIUM: "#ead1dc",
  STABILIZER: "#c9daf8",
  "PROCESSING AID": "#b6d7a8",
  WAX: "#fff2cc",
  FOAMING: "#e6b8af",
  SA: "#ead1dc",
  "CALCIUM STREATE": "#ead1dc",
  "HG-60": "#ead1dc",
  "HG- 60": "#ead1dc",
  CPE: "#ead1dc",
  TIO2: "#ead1dc",
  BLISTER: "#a9d08e",
  PULVIZER: "#ffe699",
  "COLOUR PIGMENT": "#49f1e7",
  GLUE: "#cfe2f3",
  "GOLDEN PATTI": "#a9d08e",
  "PVC FILM- 12 INCH": "#c5dfb4",
  "PVC FILM-12 INCH": "#c5dfb4",
  "PVC FILM- 10 INCH": "#a9d08e",
  "PVC FILM-10 INCH": "#a9d08e",
  COMPOUND: "#8eb8d0",
  SCRAP: "#ead1dc",
  GRINDED: "#cff99c",
};

export const FALLBACK_PALETTE = [
  "#f9cb9c", "#ead1dc", "#c9daf8", "#b6d7a8", "#fff2cc",
  "#e6b8af", "#a9d08e", "#ffe699", "#49f1e7", "#cfe2f3",
  "#c5dfb4", "#8eb8d0", "#cff99c", "#fed7aa", "#fae8ff",
];

export const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

export const formatDate = (d) => {
  if (!d) d = new Date();
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB");
};

export const normKey = (k) =>
  String(k || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export const getCategoryRank = (k) => {
  const nk = normKey(k);
  for (let idx = 0; idx < CANONICAL_ORDER.length; idx++) {
    if (normKey(CANONICAL_ORDER[idx]) === nk) return idx;
  }
  return 999;
};

export const getCategoryColor = (name, fallbackIndex = 0) => {
  const upper = String(name || "").trim().toUpperCase();
  if (KNOWN_COLORS[upper]) return KNOWN_COLORS[upper];
  const nk = normKey(upper);
  for (const [k, c] of Object.entries(KNOWN_COLORS)) {
    if (normKey(k) === nk) return c;
  }
  return FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
};

/**
 * Prepares and groups raw materials for Batch Detail factory sheet display & PDF.
 * Filters strictly to RM items where opening stock > 0, groups by material name,
 * and sorts according to the canonical factory order.
 */
export function prepareBatchDetailData(materials = []) {
  // 1. Filter only Raw Material items with opening > 0
  const valid = (materials || []).filter((m) => {
    const isRm =
      !m.materialType ||
      m.materialType === "RM" ||
      m.material_type === "RM" ||
      (m.category && m.category.toLowerCase().includes("raw"));
    const op = Number(m.opening ?? m.opening_stock ?? m.openingStock ?? 0);
    return isRm && op > 0;
  });

  // 2. Group by material name / sub-category name
  const groupMap = new Map();
  valid.forEach((m) => {
    const rawName = String(m.name || m.sub_category || m.subCategory || m.sku || "").trim();
    if (!rawName) return;
    const key = normKey(rawName);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        name: rawName,
        rank: getCategoryRank(rawName),
        items: [],
      });
    }
    const sku = String(m.sku || m.name || "").trim();
    const opening = Number(m.opening ?? m.opening_stock ?? m.openingStock ?? 0);
    const unit = m.unit || "KG";
    groupMap.get(key).items.push({
      sku,
      opening,
      unit,
      raw: m,
    });
  });

  // 3. Sort groups in canonical factory order
  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.name.localeCompare(b.name);
  });

  // 4. Assign colors
  let colorCounter = 0;
  sortedGroups.forEach((g) => {
    g.color = getCategoryColor(g.name, colorCounter);
    if (!KNOWN_COLORS[g.name.toUpperCase()]) {
      colorCounter++;
    }
  });

  // 5. Flatten rows with span indices [start, end)
  const rows = [];
  sortedGroups.forEach((g) => {
    const start = rows.length;
    g.items.forEach((item) => {
      rows.push({
        sno: rows.length + 1,
        sku: item.sku,
        name: g.name,
        opening: item.opening,
        unit: item.unit,
        start,
        end: start + g.items.length,
        color: g.color,
        isFirstInGroup: rows.length === start,
        groupItemCount: g.items.length,
        raw: item.raw,
      });
    });
  });

  const totalRawCount = rows.length;
  const pages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));

  // No empty padding rows at the bottom - only include active raw materials with opening > 0
  const displayRows = [...rows];

  // Right-hand write-in blocks over row ranges [start, end)
  const topBlocks = [
    { label: "Product Name", color: "#cfe2f3", start: 0, end: 5 },
    { label: "Total batches", color: "#d5a6bd", start: 5, end: 9 },
    { label: "Total material\nconsumption", color: "#fce5cd", start: 9, end: 14 },
    { label: "Mixture Tempreture", color: "#e6b8af", start: 14, end: 19 },
    { label: "Cooling Tempreture", color: "#d9e0f1", start: 19, end: 24 },
  ];

  const blocks = [];
  if (totalRawCount <= 24) {
    topBlocks.forEach((b) => {
      if (b.start < totalRawCount) {
        blocks.push({
          ...b,
          end: Math.min(b.end, totalRawCount),
        });
      }
    });
  } else {
    blocks.push(...topBlocks);
    const bottomSpan = totalRawCount >= 34 ? 10 : totalRawCount - 24;
    const balenceSpan = Math.floor(bottomSpan / 2);
    const scrapSpan = bottomSpan - balenceSpan;
    const remarksEnd = totalRawCount - bottomSpan;

    if (remarksEnd > 24) {
      blocks.push({
        label: "Remarks",
        color: "#c5dfb4",
        start: 24,
        end: remarksEnd,
      });
    }

    if (balenceSpan > 0) {
      blocks.push({
        label: "BALENCE\nCOMPOUNDING -",
        color: "#bcd6ed",
        start: remarksEnd,
        end: remarksEnd + balenceSpan,
        batch: true,
      });
    }

    if (scrapSpan > 0) {
      blocks.push({
        label: "RETURN PANEL\nSCRAP -",
        color: "#bcd6ed",
        start: remarksEnd + balenceSpan,
        end: totalRawCount,
      });
    }
  }

  return {
    groups: sortedGroups,
    rows: displayRows,
    activeRowsCount: totalRawCount,
    pages,
    totalSlots: totalRawCount,
    rowsPerPage: ROWS_PER_PAGE,
    blocks,
  };
}

// Draw one bordered cell with auto-scaled, vertically centered text
function drawCell(doc, x, y, w, h, text, o = {}) {
  const {
    fill,
    align = "center",
    size = 6.5,
    color = "#000000",
    bold = true,
    pad = 1.2,
  } = o;
  if (fill) doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, fill ? "FD" : "S");
  if (!text) return;

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(...hexToRgb(color));

  let fs = size;
  let lines;
  for (;;) {
    doc.setFontSize(fs);
    lines = doc.splitTextToSize(String(text), w - 2 * pad);
    const lh = fs * 0.3528 * 1.15;
    if (lines.length * lh <= h - 0.4 || fs <= 3.5) break;
    fs -= 0.25;
  }
  const lh = fs * 0.3528 * 1.15;
  const blockH = lines.length * lh;
  let ty = y + (h - blockH) / 2 + fs * 0.3528 * 0.85;
  const tx =
    align === "center"
      ? x + w / 2
      : align === "right"
      ? x + w - pad
      : x + pad;

  lines.forEach((ln) => {
    doc.text(ln, tx, ty, { align });
    ty += lh;
  });
}

function drawPageHeader(doc, dateStr) {
  let y = MARGIN;
  // Banner
  drawCell(doc, MARGIN, y, TABLE_W, BANNER_H, "NUTECH COMPOSITE- BATCH DETAIL", {
    fill: "#4c1130",
    color: "#ffffff",
    size: 11,
    bold: true,
  });
  y += BANNER_H;

  // Date and Shift line
  drawCell(doc, MARGIN, y, X.rlabel - MARGIN, DATE_H, `DATE : ${dateStr}`, {
    align: "left",
    size: 8,
    pad: 2,
    bold: true,
  });
  drawCell(doc, RIGHT_X, y, RIGHT_W, DATE_H, "SHIFT- DAY / NIGHT", {
    align: "left",
    size: 8,
    pad: 2,
    bold: true,
  });
  y += DATE_H;

  // Column Headers
  drawCell(doc, X.sno, y, COLS.sno, HEAD_H, "S.NO", {
    fill: "#a9d08e",
    color: "#0b5394",
    size: 7,
    bold: true,
  });
  drawCell(doc, X.cat, y, COLS.cat, HEAD_H, "SUB- CATEGORY NAME", {
    fill: "#a9d08e",
    size: 7,
    bold: true,
  });
  drawCell(doc, X.sku, y, COLS.sku, HEAD_H, "SKU CODE", {
    fill: "#a9d08e",
    size: 7,
    bold: true,
  });
  drawCell(doc, X.qty, y, COLS.qty, HEAD_H, "QTY.", {
    fill: "#0b5394",
    color: "#ffffff",
    size: 7,
    bold: true,
  });

  return y + HEAD_H;
}

/**
 * Generate the complete multi-page Batch Detail jsPDF document
 * @param {Array} materials Raw materials list
 * @param {{ date?: Date|string }} options
 * @returns {jsPDF}
 */
export function generateBatchDetailPdf(materials = [], options = {}) {
  const { rows, pages, blocks } = prepareBatchDetailData(materials);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const dateStr = formatDate(options.date || new Date());

  for (let p = 0; p < pages; p++) {
    if (p > 0) doc.addPage("a4", "portrait");
    const top = drawPageHeader(doc, dateStr);
    const from = p * ROWS_PER_PAGE;
    const to = Math.min(from + ROWS_PER_PAGE, rows.length);

    // Left side: S.NO, SKU, QTY
    for (let i = from; i < to; i++) {
      const y = top + (i - from) * ROW_H;
      const r = rows[i];
      drawCell(doc, X.sno, y, COLS.sno, ROW_H, String(i + 1), {
        size: 6.5,
        bold: false,
      });
      drawCell(doc, X.sku, y, COLS.sku, ROW_H, r.sku, {
        fill: r.color,
        align: "left",
        size: 6.5,
        bold: false,
        pad: 1.5,
      });
      drawCell(doc, X.qty, y, COLS.qty, ROW_H, "", {});
    }

    // Category cells: span across matching group rows within the current page
    let i = from;
    while (i < to) {
      const r = rows[i];
      const spanEnd = Math.min(r.end, to);
      const y = top + (i - from) * ROW_H;
      const spanH = (spanEnd - i) * ROW_H;
      drawCell(doc, X.cat, y, COLS.cat, spanH, r.name, {
        fill: r.color,
        size: 7,
        bold: true,
        pad: 1.2,
      });
      i = spanEnd;
    }

    // Right-hand blocks
    blocks.forEach((b) => {
      const s = Math.max(b.start, from);
      const e = Math.min(b.end, to);
      if (e <= s) return;
      const y = top + (s - from) * ROW_H;
      const h = (e - s) * ROW_H;
      drawCell(doc, RIGHT_X, y, COLS.rlabel, h, s === b.start ? b.label : "", {
        fill: b.color,
        size: 7,
        bold: true,
        pad: 1.5,
      });
      drawCell(doc, X.rvalue, y, COLS.rvalue, h, "", {});
      if (b.batch && s === b.start) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(29, 78, 216);
        doc.text("Batch", X.rvalue + COLS.rvalue - 3, y + h / 2 + 1, {
          align: "right",
        });
      }
    });

    // Total row on the final page
    if (p === pages - 1) {
      const pageRowCount = to - from;
      const y = top + pageRowCount * ROW_H;
      drawCell(
        doc,
        X.sno,
        y,
        COLS.sno + COLS.cat + COLS.sku,
        TOTAL_H,
        "TOTAL -",
        {
          align: "right",
          size: 8,
          pad: 3,
          bold: true,
        }
      );
      drawCell(doc, X.qty, y, COLS.qty, TOTAL_H, "", {});
      drawCell(doc, RIGHT_X, y, RIGHT_W, TOTAL_H, "", {});
    }
  }

  return doc;
}

/**
 * Generate and trigger direct browser download of the Batch Detail PDF
 */
export function downloadBatchDetailPdf(materials = [], options = {}) {
  const doc = generateBatchDetailPdf(materials, options);
  const dt = options.date instanceof Date ? options.date : new Date();
  const dateSuffix = dt.toISOString().slice(0, 10);
  const fileName = `Batch_Detail_Format_${dateSuffix}.pdf`;
  doc.save(fileName);
}

/**
 * Opens the generated Batch Detail PDF in a new browser tab for direct viewing and downloading
 */
export function openBatchDetailPdfInNewTab(materials = [], options = {}) {
  const doc = generateBatchDetailPdf(materials, options);
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const newTab = window.open(blobUrl, "_blank");
  if (!newTab) {
    // If pop-up blocked by browser, fallback to direct download
    downloadBatchDetailPdf(materials, options);
  }
}
