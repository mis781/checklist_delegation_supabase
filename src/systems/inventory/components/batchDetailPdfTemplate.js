/**
 * Batch Detail PDF
 * Draws the "NUTECH COMPOSITE - BATCH DETAIL" factory sheet on true A4 pages
 * (210 x 297 mm) with jsPDF, so the paper size never depends on the browser's
 * print dialog. The raw-material list is grouped by material name (name cell
 * spans its SKU rows); QTY and the right-hand blocks are left blank to write in.
 */
import { jsPDF } from "jspdf";

const PAGE_H = 297;
const MARGIN = 6;

// Column widths (mm) -> 198 total
const COLS = { sno: 10, cat: 38, sku: 58, qty: 18, rlabel: 40, rvalue: 34 };
const X = {};
{
  let x = MARGIN;
  Object.entries(COLS).forEach(([k, w]) => {
    X[k] = x;
    x += w;
  });
}
const RIGHT_X = X.rlabel;
const RIGHT_W = COLS.rlabel + COLS.rvalue;
const TABLE_W = Object.values(COLS).reduce((a, b) => a + b, 0);

const BANNER_H = 8;
const DATE_H = 6.5;
const HEAD_H = 6.5;
const ROW_H = 5.8;
const TOTAL_H = 6.5;
const ROWS_PER_PAGE = Math.floor(
  (PAGE_H - 2 * MARGIN - BANNER_H - DATE_H - HEAD_H - TOTAL_H) / ROW_H
); // 44

const GROUP_COLORS = [
  "#fed7aa", "#fae8ff", "#bfdbfe", "#bbf7d0", "#fef9c3",
  "#ffe4e6", "#bae6fd", "#e9d5ff", "#d9f99d", "#e2e8f0",
];

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const formatDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB");
};

// Draw one bordered cell with (optionally wrapped, vertically centred) text
function cell(doc, x, y, w, h, text, o = {}) {
  const { fill, align = "center", size = 6.5, color = "#000000", bold = true, pad = 1.2 } = o;
  if (fill) doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, fill ? "FD" : "S");
  if (!text) return;

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(...hexToRgb(color));

  // Shrink the font until the wrapped text fits the cell
  let fs = size;
  let lines;
  for (;;) {
    doc.setFontSize(fs);
    lines = doc.splitTextToSize(String(text), w - 2 * pad);
    const lh = fs * 0.3528 * 1.15; // pt -> mm * line spacing
    if (lines.length * lh <= h - 0.6 || fs <= 4) break;
    fs -= 0.25;
  }
  const lh = fs * 0.3528 * 1.15;
  const blockH = lines.length * lh;
  let ty = y + (h - blockH) / 2 + fs * 0.3528 * 0.85;
  const tx = align === "center" ? x + w / 2 : align === "right" ? x + w - pad : x + pad;
  lines.forEach((ln) => {
    doc.text(ln, tx, ty, { align });
    ty += lh;
  });
}

// Banner, date line and column heads at the top of every page
function drawHeader(doc, dateStr) {
  let y = MARGIN;
  cell(doc, MARGIN, y, TABLE_W, BANNER_H, "NUTECH COMPOSITE- BATCH DETAIL", {
    fill: "#4a0e2e", color: "#ffffff", size: 11,
  });
  y += BANNER_H;
  cell(doc, MARGIN, y, X.rlabel - MARGIN, DATE_H, `DATE : ${dateStr}`, { align: "left", size: 8 });
  cell(doc, RIGHT_X, y, RIGHT_W, DATE_H, "SHIFT- DAY / NIGHT", { align: "left", size: 8 });
  y += DATE_H;
  cell(doc, X.sno, y, COLS.sno, HEAD_H, "S.NO", { fill: "#86efac", color: "#0284c7", size: 7 });
  cell(doc, X.cat, y, COLS.cat, HEAD_H, "SUB- CATEGORY NAME", { fill: "#86efac", size: 7 });
  cell(doc, X.sku, y, COLS.sku, HEAD_H, "SKU CODE", { fill: "#86efac", size: 7 });
  cell(doc, X.qty, y, COLS.qty, HEAD_H, "QTY.", { fill: "#004b87", color: "#ffffff", size: 7 });
  return y + HEAD_H;
}

/**
 * @param {Array<{name: string, sku: string}>} materials Raw materials in display order
 * @param {{ date?: Date|string }} options
 * @returns {jsPDF}
 */
export function generateBatchDetailPdf(materials = [], options = {}) {
  // Group by name, keep first-appearance order
  const groups = [];
  const map = new Map();
  materials.forEach((m) => {
    const name = String(m.name || m.sku || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      const g = { name, skus: [] };
      map.set(key, g);
      groups.push(g);
    }
    map.get(key).skus.push(String(m.sku || m.name || "").trim());
  });

  // Flatten to global rows; each row knows its group span [start, end)
  const rows = [];
  groups.forEach((g, gi) => {
    const start = rows.length;
    g.skus.forEach((sku) => {
      rows.push({
        sku,
        name: g.name,
        start,
        end: start + g.skus.length,
        color: GROUP_COLORS[gi % GROUP_COLORS.length],
      });
    });
  });

  const pages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const total = pages * ROWS_PER_PAGE;
  while (rows.length < total) rows.push({ sku: "", name: "", start: rows.length, end: rows.length + 1, color: null });

  // Right-hand write-in blocks over global row ranges [start, end)
  const blocks = [
    ["PRODUCT NAME", "#cbd5e1"],
    ["TOTAL BATCHES", "#d8b4e2"],
    ["TOTAL MATERIAL CONSUMPTION", "#fed7aa"],
    ["MIXTURE TEMPRETURE", "#fecaca"],
    ["COOLING TEMPRETURE", "#c7d2fe"],
  ].map(([label, color], i) => ({ label, color, start: i * 5, end: i * 5 + 5 }));
  blocks.push({ label: "REMARKS", color: "#bbf7d0", start: 25, end: total - 10 });
  blocks.push({ label: "BALENCE COMPOUNDING -", color: "#bfdbfe", start: total - 10, end: total - 5, batch: true });
  blocks.push({ label: "RETURN PANEL SCRAP -", color: "#bfdbfe", start: total - 5, end: total });

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const dateStr = formatDate(options.date || new Date());

  for (let p = 0; p < pages; p++) {
    if (p > 0) doc.addPage("a4", "portrait");
    const top = drawHeader(doc, dateStr);
    const from = p * ROWS_PER_PAGE;
    const to = from + ROWS_PER_PAGE;

    // Left side
    for (let i = from; i < to; i++) {
      const y = top + (i - from) * ROW_H;
      const r = rows[i];
      cell(doc, X.sno, y, COLS.sno, ROW_H, String(i + 1), { size: 6.5 });
      cell(doc, X.sku, y, COLS.sku, ROW_H, r.sku, { align: "left", size: 6.5 });
      cell(doc, X.qty, y, COLS.qty, ROW_H, "", {});
    }
    // Category cells: one per group per page (continued groups repeat their name)
    let i = from;
    while (i < to) {
      const r = rows[i];
      const spanEnd = Math.min(r.end, to);
      const y = top + (i - from) * ROW_H;
      cell(doc, X.cat, y, COLS.cat, (spanEnd - i) * ROW_H, r.name, {
        fill: r.color, size: 7,
      });
      i = spanEnd;
    }

    // Right side blocks clipped to this page
    blocks.forEach((b) => {
      const s = Math.max(b.start, from);
      const e = Math.min(b.end, to);
      if (e <= s) return;
      const y = top + (s - from) * ROW_H;
      const h = (e - s) * ROW_H;
      cell(doc, RIGHT_X, y, COLS.rlabel, h, s === b.start ? b.label : "", { fill: b.color, size: 7 });
      cell(doc, X.rvalue, y, COLS.rvalue, h, "", {});
      if (b.batch && s === b.start) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(29, 78, 216);
        doc.text("Batch", X.rvalue + COLS.rvalue - 3, y + h / 2 + 1, { align: "right" });
      }
    });

    // Total row on the last page
    if (p === pages - 1) {
      const y = top + ROWS_PER_PAGE * ROW_H;
      cell(doc, X.sno, y, COLS.sno + COLS.cat + COLS.sku, TOTAL_H, "TOTAL -", { align: "right", size: 8, pad: 3 });
      cell(doc, X.qty, y, COLS.qty, TOTAL_H, "", {});
      cell(doc, RIGHT_X, y, RIGHT_W, TOTAL_H, "", {});
    }
  }

  return doc;
}
