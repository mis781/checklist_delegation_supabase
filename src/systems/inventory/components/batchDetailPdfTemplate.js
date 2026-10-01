/**
 * Batch Detail PDF Template Generator
 * Generates exact Excel/Factory-standard PDF format for NUTECH COMPOSITE - BATCH DETAIL
 * Features:
 * - Wine/burgundy title banner
 * - Dynamic category grouping for Finished Goods Production Items
 * - Pastel category row-span styling matching official spreadsheet
 * - Right-column write-in blocks (Product name, Total batches, Consumption, Mixture Temp, Cooling Temp, Remark, Balance Compounding, Return Panel Scrap)
 * - Standalone preview & print compatibility
 */

const NAME_GROUP_COLORS = [
  "#fed7aa", "#fae8ff", "#bfdbfe", "#bbf7d0", "#fef9c3",
  "#ffe4e6", "#bae6fd", "#e9d5ff", "#d9f99d", "#e2e8f0",
];

const CATEGORY_COLORS = {
  RESIN: "#fed7aa", // Peach
  CALCIUM: "#fae8ff", // Soft Lavender
  STABILIZER: "#bfdbfe", // Soft Sky Blue
  "PROCESSING AID": "#bbf7d0", // Light Mint/Green
  PROCESSING: "#bbf7d0",
  WAX: "#fef9c3", // Pale Cream/Yellow
  FOAMING: "#ffe4e6", // Light Rose/Pink
  SA: "#f1f5f9", // Pale Slate/Gray
  COMPOUND: "#bae6fd", // Light Cyan/Blue
  SCRAP: "#e9d5ff", // Soft Lilac/Purple
  GRINDED: "#d9f99d", // Light Lime Green
};

export const getCategoryColor = (catName) => {
  const norm = (catName || "").toUpperCase().trim();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (norm.includes(key)) return color;
  }
  const pastels = [
    "#fed7aa",
    "#fae8ff",
    "#bfdbfe",
    "#bbf7d0",
    "#fef9c3",
    "#ffe4e6",
    "#bae6fd",
    "#e9d5ff",
    "#d9f99d",
    "#e2e8f0",
  ];
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  return pastels[Math.abs(hash) % pastels.length];
};

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  try {
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-GB");
  } catch {
    return dateStr;
  }
};

export function generateBatchDetailPdfHtml(record = {}, options = {}) {
  const isPreview = !!options.isPreview;
  const items = Array.isArray(record.items) ? record.items : [];
  const formattedDate = formatDateDisplay(record.date);

  // Filter items that have at least category or productName or quantity
  // Only render items with qty > 0; others are saved to DB but hidden from PDF
  const validItems = items.filter(
    (it) => it && Number(it.quantity) > 0
  );

  // Calculate total quantity
  const totalQty = validItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );

  // Minimum row count so right-side handwritten boxes have ample height
  const MIN_ROWS = 16;
  const totalItemCount = validItems.length;
  const padRowsCount = Math.max(0, MIN_ROWS - totalItemCount);

  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const sd = record.sheetDetails || {};
  const shiftLabel = String(record.shift || "").toUpperCase();
  const shiftHtml = `SHIFT- <span class="${shiftLabel === "DAY" ? "shift-on" : ""}">DAY</span> / <span class="${shiftLabel === "NIGHT" ? "shift-on" : ""}">NIGHT</span>`;

  // Group rows by product name; the name cell spans all of its SKU rows
  const nameGroups = [];
  const nameMap = new Map();
  validItems.forEach((it) => {
    const name = (it.productName || it.sku || "").trim();
    const key = name.toLowerCase();
    if (!nameMap.has(key)) {
      const g = { name, items: [] };
      nameMap.set(key, g);
      nameGroups.push(g);
    }
    nameMap.get(key).items.push(it);
  });

  // Build Left Table rows HTML (S.NO / Product Name (grouped) / SKU / Qty)
  let tableRowsHtml = "";
  let sno = 0;
  nameGroups.forEach((group, gi) => {
    const bg = NAME_GROUP_COLORS[gi % NAME_GROUP_COLORS.length];
    group.items.forEach((item, idx) => {
      sno++;
      tableRowsHtml += `
        <tr>
          <td class="cell-sno">${sno}</td>
          ${
            idx === 0
              ? `<td class="cell-cat" rowspan="${group.items.length}" style="background-color: ${bg};">${esc(group.name)}</td>`
              : ""
          }
          <td class="cell-sku">${esc(item.sku || item.productName)}</td>
          <td class="cell-qty">${Number(item.quantity).toLocaleString()}</td>
        </tr>
      `;
    });
  });

  for (let p = 0; p < padRowsCount; p++) {
    tableRowsHtml += `
      <tr class="empty-row">
        <td class="cell-sno">${sno + p + 1}</td>
        <td class="cell-sku"></td>
        <td class="cell-sku"></td>
        <td class="cell-qty"></td>
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NUTECH COMPOSITE - BATCH DETAIL ${record.formNo ? `(${record.formNo})` : ""}</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: Arial, Helvetica, "Segoe UI", sans-serif;
        background-color: #f1f5f9;
        color: #000;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Preview Top Toolbar (Screen only) */
      .preview-toolbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        background: #1e1b4b;
        color: #fff;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }

      .preview-toolbar .title-area {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        font-weight: 600;
      }

      .preview-toolbar .badge {
        background: #4338ca;
        color: #e0e7ff;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-family: monospace;
      }

      .preview-toolbar .btn-group {
        display: flex;
        gap: 10px;
      }

      .preview-toolbar button {
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        padding: 7px 16px;
        border-radius: 8px;
        border: none;
        transition: all 0.15s ease;
      }

      .btn-print {
        background: #4f46e5;
        color: #fff;
      }
      .btn-print:hover { background: #4338ca; }

      .btn-close {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .btn-close:hover { background: rgba(255, 255, 255, 0.25); }

      /* Printable Page Wrapper */
      .page-wrap {
        width: 100%;
        max-width: 900px;
        margin: 20px auto;
        padding: 0;
        background: #fff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      /* Sheet Root Container */
      .sheet-container {
        width: 100%;
        border: 2px solid #000;
        background: #fff;
      }

      /* 1. Main Burgundy Banner */
      .banner {
        background-color: #4A0E2E;
        color: #ffffff;
        text-align: center;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        padding: 8px 10px;
        border-bottom: 2px solid #000;
      }

      /* 2. Date & Shift Sub-bar */
      .sub-bar {
        display: flex;
        border-bottom: 2px solid #000;
        font-size: 12px;
        font-weight: 700;
        background: #ffffff;
      }

      .sub-bar .date-box {
        width: 63%;
        padding: 6px 12px;
        border-right: 2px solid #000;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .sub-bar .date-box span {
        font-weight: 800;
        color: #000;
      }

      .sub-bar .shift-box {
        width: 37%;
        padding: 6px 12px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        letter-spacing: 0.5px;
      }

      /* 3. Main Grid (Left Table + Right Sidebar) */
      .body-grid {
        display: flex;
        align-items: stretch;
        width: 100%;
        background: #fff;
      }

      /* Left Table Column */
      .left-table-col {
        width: 63%;
        border-right: 2px solid #000;
        display: flex;
        flex-direction: column;
      }

      .left-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      /* Header cells */
      .left-table thead th {
        border: 1.5px solid #000;
        padding: 6px 4px;
        font-size: 11px;
        font-weight: 900;
        text-align: center;
        vertical-align: middle;
      }

      .th-sno {
        width: 44px;
        background-color: #86efac;
        color: #0284c7;
      }

      .th-cat {
        width: 145px;
        background-color: #86efac;
        color: #000000;
      }

      .th-sku {
        background-color: #86efac;
        color: #000000;
      }

      .th-qty {
        width: 75px;
        background-color: #004b87;
        color: #ffffff;
      }

      /* Body cells — all get full solid border */
      .left-table tbody td {
        border: 1.5px solid #000;
        font-size: 11px;
        padding: 4px 6px;
        height: 26px;
        vertical-align: middle;
      }

      .cell-sno {
        text-align: center;
        font-weight: 700;
        color: #000;
        background: #fff;
        border: 1.5px solid #000 !important;
      }

      .cell-cat {
        text-align: center;
        font-weight: 800;
        color: #000;
        text-transform: uppercase;
        vertical-align: middle;
        border: 1.5px solid #000 !important;
      }

      .cell-sku {
        text-align: left;
        font-weight: 700;
        color: #000;
        text-transform: uppercase;
        padding-left: 8px !important;
        background: #fff;
        border: 1.5px solid #000 !important;
      }

      .cell-qty {
        text-align: right;
        font-weight: 800;
        color: #000;
        padding-right: 8px !important;
        background: #fff;
        border: 1.5px solid #000 !important;
      }

      .shift-on { text-decoration: underline; background: #fde68a; padding: 0 4px; }

      .empty-row td {
        background: #fff;
      }

      /* Left Table Footer (TOTAL -) */
      .left-table tfoot td {
        border: 1.5px solid #000;
        font-size: 12px;
        font-weight: 900;
        padding: 6px 8px;
        background: #fff;
      }

      .total-label {
        text-align: right;
        letter-spacing: 1px;
        padding-right: 12px !important;
        border: 1.5px solid #000 !important;
      }

      .total-qty {
        text-align: right;
        color: #000;
        padding-right: 8px !important;
        border: 1.5px solid #000 !important;
      }

      /* Right Write-in Column */
      .right-panel-col {
        width: 37%;
        display: flex;
        flex-direction: column;
        background: #fff;
      }

      .right-block {
        display: flex;
        flex: 1;
        min-height: 52px;
        border-bottom: 1.5px solid #000;
      }

      .right-block:last-child {
        border-bottom: none;
      }

      .block-label {
        width: 48%;
        border-right: 1.5px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 11px;
        font-weight: 800;
        padding: 6px 4px;
        color: #000;
        line-height: 1.25;
        text-transform: uppercase;
      }

      .block-box {
        width: 52%;
        background-color: #ffffff;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Pastel background colors matching template */
      .bg-prod-name  { background-color: #cbd5e1; }
      .bg-batches    { background-color: #d8b4e2; }
      .bg-consumption{ background-color: #fed7aa; }
      .bg-mix-temp   { background-color: #fecaca; }
      .bg-cool-temp  { background-color: #c7d2fe; }
      .bg-remark     { background-color: #fef3c7; }
      .bg-balance    { background-color: #bfdbfe; }
      .bg-scrap      { background-color: #bfdbfe; }

      .batch-badge {
        position: absolute;
        right: 10px;
        color: #1d4ed8;
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.5px;
      }

      /* Print Optimizations */
      @media print {
        body { background: #fff !important; }

        .no-print { display: none !important; }

        .page-wrap {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        .sheet-container { border: 2px solid #000 !important; }

        .left-table thead th,
        .left-table tbody td,
        .left-table tfoot td {
          border: 1.5px solid #000 !important;
        }

        .right-block { border-bottom: 1.5px solid #000 !important; }
        .block-label { border-right: 1.5px solid #000 !important; }
        .left-table-col { border-right: 2px solid #000 !important; }
        .sub-bar { border-bottom: 2px solid #000 !important; }
        .sub-bar .date-box { border-right: 2px solid #000 !important; }

        @page {
          size: A4 portrait;
          margin: 6mm;
        }
      }
    </style>
  </head>
  <body>
    <!-- Screen Preview Bar (Hides in Print) -->
    <div class="preview-toolbar no-print">
      <div class="title-area">
        <span>Batch Detail PDF Template Preview</span>
        ${record.formNo ? `<span class="badge">Form: ${record.formNo}</span>` : ""}
      </div>
      <div class="btn-group">
        <button type="button" class="btn-print" onclick="window.print()">
          Print / Save PDF
        </button>
        <button type="button" class="btn-close" onclick="window.close()">
          Close
        </button>
      </div>
    </div>

    <!-- Main Printable Page -->
    <div class="page-wrap">
      <div class="sheet-container">
        <!-- Banner -->
        <div class="banner">NUTECH COMPOSITE- BATCH DETAIL</div>

        <!-- Date & Shift Row -->
        <div class="sub-bar">
          <div class="date-box">
            DATE : <span>${formattedDate || ""}</span>
          </div>
          <div class="shift-box">
            ${shiftHtml}
          </div>
        </div>

        <!-- Main Body Grid -->
        <div class="body-grid">
          <!-- Left Table (Items) -->
          <div class="left-table-col">
            <table class="left-table">
              <thead>
                <tr>
                  <th class="th-sno">S.NO</th>
                  <th class="th-cat">PRODUCT NAME</th>
                  <th class="th-sku">SKU CODE</th>
                  <th class="th-qty">QTY.</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total-label">TOTAL -</td>
                  <td class="total-qty">${totalQty > 0 ? totalQty.toLocaleString() : ""}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Right Write-in Blocks Panel -->
          <div class="right-panel-col">
            <!-- 1. Product Name -->
            <div class="right-block">
              <div class="block-label bg-prod-name">Product Name</div>
              <div class="block-box">${esc(sd.productName)}</div>
            </div>

            <!-- 2. Total batches -->
            <div class="right-block">
              <div class="block-label bg-batches">Total batches</div>
              <div class="block-box">${esc(sd.totalBatches)}</div>
            </div>

            <!-- 3. Total material consumption -->
            <div class="right-block">
              <div class="block-label bg-consumption">Total material consumption</div>
              <div class="block-box">${esc(sd.materialConsumption)}</div>
            </div>

            <!-- 4. Mixture Tempreture -->
            <div class="right-block">
              <div class="block-label bg-mix-temp">Mixture Tempreture</div>
              <div class="block-box">${esc(sd.mixtureTemp)}</div>
            </div>

            <!-- 5. Cooling Tempreture -->
            <div class="right-block">
              <div class="block-label bg-cool-temp">Cooling Tempreture</div>
              <div class="block-box">${esc(sd.coolingTemp)}</div>
            </div>

            <!-- 6. Remark -->
            <div class="right-block">
              <div class="block-label bg-remark">Remark</div>
              <div class="block-box">${esc(sd.remarks)}</div>
            </div>

            <!-- 7. BALENCE COMPOUNDING - -->
            <div class="right-block">
              <div class="block-label bg-balance">BALENCE COMPOUNDING -</div>
              <div class="block-box">
                <span>${esc(sd.balanceCompounding)}</span><span class="batch-badge">Batch</span>
              </div>
            </div>

            <!-- 8. RETURN PANEL SCRAP - -->
            <div class="right-block">
              <div class="block-label bg-scrap">RETURN PANEL SCRAP -</div>
              <div class="block-box">${esc(sd.returnPanelScrap)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${
      !isPreview
        ? `<script>
      window.onload = function() {
        window.print();
      };
    </script>`
        : ""
    }
  </body>
</html>`;
}
