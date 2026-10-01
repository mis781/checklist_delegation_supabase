// src/systems/inventory/components/BatchDetailHistoryView.jsx
import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Layers,
  Search,
  Download,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  Printer,
  X,
  ChevronDown,
  ChevronRight,
  User,
} from "lucide-react";
import BatchDetailModal from "./BatchDetailModal";
import { useMagicToast } from "../../../context/MagicToastContext";

export default function BatchDetailHistoryView({ activeUser }) {
  const { showToast } = useMagicToast();

  const {
    categories: categoriesFromDb = [],
    masterMaterials = [],
  } = useSelector((state) => state.inventory || {});

  // State
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);

  // Load from localStorage
  const loadRecords = () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("inventory_batch_details") || "[]"
      );
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Error reading inventory_batch_details from localStorage:", err);
      setRecords([]);
    }
  };

  useEffect(() => {
    loadRecords();

    // Listen for updates from modal
    const handleUpdate = () => {
      loadRecords();
    };
    window.addEventListener("inventory_batch_details_updated", handleUpdate);
    return () => {
      window.removeEventListener("inventory_batch_details_updated", handleUpdate);
    };
  }, []);

  // Delete form record
  const handleDelete = (formNo) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Batch Detail Form #${formNo}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const updated = records.filter((r) => r.formNo !== formNo && r.id !== formNo);
      localStorage.setItem("inventory_batch_details", JSON.stringify(updated));
      setRecords(updated);
      showToast(`Batch Detail #${formNo} deleted successfully.`, "info");
      if (previewRecord && (previewRecord.formNo === formNo || previewRecord.id === formNo)) {
        setPreviewRecord(null);
      }
    } catch {
      showToast("Failed to delete record.", "error");
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Shift filter
      if (shiftFilter && rec.shift !== shiftFilter) return false;

      // Date range filter
      if (fromDate && rec.date < fromDate) return false;
      if (toDate && rec.date > toDate) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesFormNo = (rec.formNo || "").toLowerCase().includes(q);
        const matchesCreatedBy = (rec.createdBy || "").toLowerCase().includes(q);
        const matchesRemarks = (rec.remarks || "").toLowerCase().includes(q);
        const matchesItem = (rec.items || []).some(
          (it) =>
            (it.category || "").toLowerCase().includes(q) ||
            (it.productName || "").toLowerCase().includes(q) ||
            (it.sku || "").toLowerCase().includes(q)
        );

        if (!matchesFormNo && !matchesCreatedBy && !matchesRemarks && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [records, search, shiftFilter, fromDate, toDate]);

  // Overall KPIs
  const stats = useMemo(() => {
    let totalForms = filteredRecords.length;
    let totalQty = 0;
    let totalBatches = 0;
    let totalConsumption = 0;

    filteredRecords.forEach((r) => {
      (r.items || []).forEach((it) => {
        totalQty += Number(it.quantity) || 0;
        totalBatches += Number(it.totalBatches) || 0;
        totalConsumption += Number(it.totalMaterialConsumption) || 0;
      });
    });

    return { totalForms, totalQty, totalBatches, totalConsumption };
  }, [filteredRecords]);

  // Generate and Print Clean PDF
  // Generate and Print Clean, Executive-Grade Production Report PDF
  const handlePrintPdf = (record) => {
    if (!record) return;

    const items = record.items || [];
    let sumQty = 0;
    let sumBatches = 0;
    let sumConsumption = 0;
    let sumBalComp = 0;
    let hasNumericBalComp = false;
    let sumScrap = 0;
    let hasNumericScrap = false;

    const balCompItems = [];
    const scrapItems = [];

    items.forEach((it) => {
      sumQty += Number(it.quantity) || 0;
      sumBatches += Number(it.totalBatches) || 0;
      sumConsumption += Number(it.totalMaterialConsumption) || 0;

      const rawBal = String(it.balanceCompounding || "").trim();
      if (rawBal && rawBal !== "0") {
        balCompItems.push(rawBal);
        const num = parseFloat(rawBal);
        if (!isNaN(num)) {
          sumBalComp += num;
          hasNumericBalComp = true;
        }
      }

      const rawScrap = String(it.returnPanelScrap || "").trim();
      if (rawScrap && rawScrap !== "0") {
        scrapItems.push(rawScrap);
        const num = parseFloat(rawScrap);
        if (!isNaN(num)) {
          sumScrap += num;
          hasNumericScrap = true;
        }
      }
    });

    // Subtitle / categories summary
    const distinctCats = Array.from(new Set(items.map((it) => it.category).filter(Boolean)));
    const categoriesTag = distinctCats.length > 0 ? distinctCats.join(" • ") : "FINISHED GOODS PRODUCTION";

    // Format formatted date
    let formattedDate = record.date;
    try {
      const [y, m, d] = record.date.split("-");
      if (y && m && d) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIdx = parseInt(m, 10) - 1;
        formattedDate = `${d} ${monthNames[monthIdx] || m} ${y}`;
      }
    } catch {
      formattedDate = record.date;
    }

    const shiftLabel = (record.shift || "Day").toUpperCase();
    const isDay = shiftLabel === "DAY";

    // Build Table Rows HTML
    const tableRowsHtml = items
      .map((it, idx) => {
        const rowQty = Number(it.quantity) || 0;
        const rowBatches = Number(it.totalBatches) || 0;
        const rowCons = Number(it.totalMaterialConsumption) || 0;
        const rowBal = it.balanceCompounding && String(it.balanceCompounding).trim() !== "0" ? it.balanceCompounding : "—";
        const rowScrap = it.returnPanelScrap && String(it.returnPanelScrap).trim() !== "0" ? it.returnPanelScrap : "—";

        return `
        <tr style="background-color: ${idx % 2 === 1 ? '#fbfcfe' : '#ffffff'};">
          <td style="text-align: center; font-weight: 700; color: #64748b; padding: 10px 8px; border-bottom: 1px solid #edf2f7; width: 38px;">
            ${idx + 1}
          </td>
          <td style="text-align: left; padding: 10px 12px; border-bottom: 1px solid #edf2f7;">
            <div style="font-weight: 700; color: #0f172a; font-size: 12.5px; line-height: 1.3;">
              ${it.productName || "—"}
            </div>
            <div style="margin-top: 3px;">
              <span style="display: inline-block; font-size: 10px; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.3px; text-transform: uppercase;">
                ${it.category || "General FG"}
              </span>
            </div>
          </td>
          <td style="text-align: left; padding: 10px 10px; border-bottom: 1px solid #edf2f7;">
            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 11px; font-weight: 600; color: #334155; background: #f1f5f9; padding: 3px 7px; border-radius: 4px; display: inline-block;">
              ${it.sku || "—"}
            </span>
          </td>
          <td style="text-align: right; font-weight: 800; color: #0f172a; padding: 10px 10px; border-bottom: 1px solid #edf2f7; font-size: 12.5px;">
            ${rowQty.toLocaleString()}
          </td>
          <td style="text-align: right; font-weight: 600; color: #334155; padding: 10px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px;">
            ${rowBatches > 0 ? rowBatches.toLocaleString() : "—"}
          </td>
          <td style="text-align: right; font-weight: 600; color: #334155; padding: 10px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px;">
            ${rowCons > 0 ? rowCons.toLocaleString() : "—"}
          </td>
          <td style="text-align: center; color: #475569; padding: 10px 10px; border-bottom: 1px solid #edf2f7; font-size: 11.5px; font-weight: 500;">
            ${rowBal}
          </td>
          <td style="text-align: center; color: #475569; padding: 10px 10px; border-bottom: 1px solid #edf2f7; font-size: 11.5px; font-weight: 500;">
            ${rowScrap}
          </td>
        </tr>`;
      })
      .join("");

    // Compounding & Scrap formatted summaries
    const totalBalDisplay = hasNumericBalComp ? `${sumBalComp.toLocaleString()} kg` : balCompItems.join(", ") || "—";
    const totalScrapDisplay = hasNumericScrap ? `${sumScrap.toLocaleString()} kg` : scrapItems.join(", ") || "—";

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Batch Detail — ${record.formNo}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 12mm 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 12px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .report-card {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
            }

            /* Header Section */
            .header-wrap {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .brand-block h1 {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              margin: 0 0 3px 0;
              letter-spacing: -0.3px;
              text-transform: uppercase;
            }
            .brand-block .division-tag {
              font-size: 11px;
              font-weight: 700;
              color: #4338ca;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .brand-block .report-title {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
              margin-top: 5px;
            }
            .brand-block .cat-badge {
              font-size: 10.5px;
              color: #64748b;
              margin-top: 2px;
              font-weight: 500;
            }

            .meta-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 14px;
              text-align: right;
              min-width: 220px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              padding: 2.5px 0;
              font-size: 11px;
            }
            .meta-label {
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.3px;
            }
            .meta-val {
              color: #0f172a;
              font-weight: 800;
            }
            .form-badge {
              font-family: 'SFMono-Regular', Consolas, monospace;
              color: #4338ca;
              font-size: 12px;
              font-weight: 800;
            }
            .shift-pill {
              display: inline-block;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 8px;
              border-radius: 9999px;
              background: ${isDay ? '#fef3c7' : '#e0e7ff'};
              color: ${isDay ? '#92400e' : '#3730a3'};
              border: 1px solid ${isDay ? '#fde68a' : '#c7d2fe'};
            }

            /* Metric Cards Strip */
            .metrics-strip {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 18px;
            }
            .metric-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 9px 12px;
              background: #f8fafc;
            }
            .metric-card.primary {
              background: #f5f3ff;
              border-color: #ddd6fe;
            }
            .metric-title {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              margin-bottom: 2px;
            }
            .metric-card.primary .metric-title {
              color: #6d28d9;
            }
            .metric-number {
              font-size: 18px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1.2;
            }
            .metric-card.primary .metric-number {
              color: #4338ca;
            }
            .metric-sub {
              font-size: 9.5px;
              font-weight: 600;
              color: #64748b;
              margin-top: 1px;
            }

            /* Table Section */
            .table-wrap {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11.5px;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-size: 10.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              padding: 9px 10px;
              border-bottom: 1.5px solid #cbd5e1;
            }
            tfoot tr td {
              background: #f8fafc;
              border-top: 2px solid #0f172a;
              padding: 10px 10px;
              font-weight: 800;
              font-size: 12px;
            }

            /* Remarks Box */
            .remarks-wrap {
              background: #fafafa;
              border: 1px solid #e2e8f0;
              border-left: 4px solid #4338ca;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 24px;
            }
            .remarks-label {
              font-size: 10.5px;
              font-weight: 800;
              color: #334155;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              margin-bottom: 3px;
            }
            .remarks-text {
              font-size: 11.5px;
              color: #1e293b;
              font-style: italic;
              line-height: 1.4;
            }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .report-card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report-card">
            <!-- Header -->
            <div class="header-wrap">
              <div class="brand-block">
                <h1>NUTECH COMPOSITES PVT. LTD.</h1>
                <div class="division-tag">Extrusion & Finished Goods Manufacturing Unit</div>
                <div class="report-title">DAILY BATCH DETAIL & MATERIAL CONSUMPTION REPORT</div>
                <div class="cat-badge">Categories: <strong>${categoriesTag}</strong></div>
              </div>

              <!-- Metadata Card -->
              <div class="meta-box">
                <div class="meta-row">
                  <span class="meta-label">Form Number:</span>
                  <span class="meta-val form-badge">${record.formNo}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Date:</span>
                  <span class="meta-val">${formattedDate}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Shift:</span>
                  <span class="shift-pill">${isDay ? "☀️ DAY SHIFT" : "🌙 NIGHT SHIFT"}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Created By:</span>
                  <span class="meta-val">${record.createdBy || "Admin"}</span>
                </div>
              </div>
            </div>

            <!-- KPI Summary Tiles Strip -->
            <div class="metrics-strip">
              <div class="metric-card primary">
                <div class="metric-title">Total Output Qty</div>
                <div class="metric-number">${sumQty.toLocaleString()}</div>
                <div class="metric-sub">Finished Units (PCS)</div>
              </div>

              <div class="metric-card">
                <div class="metric-title">Batches Completed</div>
                <div class="metric-number">${sumBatches.toLocaleString()}</div>
                <div class="metric-sub">Production Runs</div>
              </div>

              <div class="metric-card">
                <div class="metric-title">Material Consumed</div>
                <div class="metric-number">${sumConsumption.toLocaleString()}</div>
                <div class="metric-sub">Total Raw Material</div>
              </div>

              <div class="metric-card">
                <div class="metric-title">Bal. Compound / Scrap</div>
                <div class="metric-number" style="font-size: 13.5px; font-weight: 800; margin-top: 3px;">
                  Bal: ${totalBalDisplay}
                </div>
                <div class="metric-sub">Scrap: ${totalScrapDisplay}</div>
              </div>
            </div>

            <!-- Detailed Production Table -->
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width: 38px; text-align: center;">#</th>
                    <th style="text-align: left;">Product & Category</th>
                    <th style="text-align: left; width: 140px;">SKU Code</th>
                    <th style="text-align: right; width: 75px;">Qty (PCS)</th>
                    <th style="text-align: right; width: 65px;">Batches</th>
                    <th style="text-align: right; width: 85px;">Consumption</th>
                    <th style="text-align: center; width: 95px;">Bal. Comp.</th>
                    <th style="text-align: center; width: 90px;">Return Scrap</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="text-align: right; color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
                      Total Production Aggregates:
                    </td>
                    <td style="text-align: right; color: #4338ca; font-size: 13px;">
                      ${sumQty.toLocaleString()}
                    </td>
                    <td style="text-align: right; color: #0f172a;">
                      ${sumBatches.toLocaleString()}
                    </td>
                    <td style="text-align: right; color: #0f172a;">
                      ${sumConsumption.toLocaleString()}
                    </td>
                    <td style="text-align: center; color: #475569; font-size: 11px;">
                      ${totalBalDisplay}
                    </td>
                    <td style="text-align: center; color: #475569; font-size: 11px;">
                      ${totalScrapDisplay}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Remarks & Supervisor Observations -->
            <div class="remarks-wrap">
              <div class="remarks-label">Production Remarks & Quality Observations</div>
              <div class="remarks-text">
                ${record.remarks && record.remarks.trim() ? record.remarks : "Standard production run completed with standard quality tolerances and parameters."}
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocked. Please allow pop-ups to download PDF.", "warning");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-2xl shadow-xs">
              <Layers size={26} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Batch Detail History
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Track, audit, and download PDF sheets for finished goods production batches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadRecords}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Refresh records"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-violet-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Batch Detail</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-950 border border-gray-200/70 dark:border-slate-800/70">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Forms
            </span>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
              {stats.totalForms}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-150 dark:border-violet-900/40">
            <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Total Batches
            </span>
            <div className="text-xl font-black text-violet-700 dark:text-violet-300 mt-1">
              {stats.totalBatches.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Production Qty
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {stats.totalQty.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/40">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Total Consumption
            </span>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
              {stats.totalConsumption.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Form No, Product, Category, SKU, remarks..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs"
            />
          </div>

          {/* Shift & Date Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-2xs"
            >
              <option value="">All Shifts</option>
              <option value="Day">☀️ Day Shift</option>
              <option value="Night">🌙 Night Shift</option>
            </select>

            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-gray-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-gray-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              />
            </div>

            {(search || shiftFilter || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setShiftFilter("");
                  setFromDate("");
                  setToDate("");
                }}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                <th className="px-4 py-3.5 w-10 text-center"></th>
                <th className="px-4 py-3.5">Form No</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Shift</th>
                <th className="px-4 py-3.5">Products / Categories</th>
                <th className="px-4 py-3.5 text-right">Items</th>
                <th className="px-4 py-3.5 text-right">Total Batches</th>
                <th className="px-4 py-3.5 text-right">Total Qty</th>
                <th className="px-4 py-3.5 text-right">Material Cons.</th>
                <th className="px-4 py-3.5">Created By</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-2xl text-violet-500">
                        <Layers size={28} />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        No Batch Detail Forms Found
                      </h4>
                      <p className="text-xs text-gray-400 max-w-sm">
                        {records.length === 0
                          ? "No batch forms have been created yet. Click 'Add Batch Detail' to create your first production batch record."
                          : "No records match your filter criteria. Try adjusting your search or shift filter."}
                      </p>
                      {records.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          + Create First Form
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const items = rec.items || [];
                  const formQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                  const formBatches = items.reduce(
                    (s, it) => s + (Number(it.totalBatches) || 0),
                    0
                  );
                  const formCons = items.reduce(
                    (s, it) => s + (Number(it.totalMaterialConsumption) || 0),
                    0
                  );
                  const isExpanded = expandedRowId === rec.formNo;

                  return (
                    <tr
                      key={rec.formNo}
                      className="group hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Expand Toggle */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRowId(isExpanded ? null : rec.formNo)
                          }
                          className="p-1 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors cursor-pointer"
                          title="Expand rows"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>

                      {/* Form No */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 rounded-lg border border-violet-100 dark:border-violet-900/40">
                          {rec.formNo}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                        {rec.date}
                      </td>

                      {/* Shift */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.shift === "Day"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                          }`}
                        >
                          {rec.shift === "Day" ? "☀️ Day" : "🌙 Night"}
                        </span>
                      </td>

                      {/* Products / Categories Preview */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="truncate font-semibold text-gray-900 dark:text-white">
                          {items.map((it) => it.productName).filter(Boolean).slice(0, 2).join(", ")}
                          {items.length > 2 && (
                            <span className="text-gray-400 font-normal"> +{items.length - 2} more</span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-gray-400 dark:text-slate-500">
                          {Array.from(new Set(items.map((it) => it.category).filter(Boolean))).join(", ") || "Finished Goods"}
                        </div>
                      </td>

                      {/* Item count */}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-700 dark:text-slate-300">
                        {items.length}
                      </td>

                      {/* Total Batches */}
                      <td className="px-4 py-3.5 text-right font-bold text-violet-600 dark:text-violet-400">
                        {formBatches.toLocaleString()}
                      </td>

                      {/* Total Qty */}
                      <td className="px-4 py-3.5 text-right font-black text-gray-900 dark:text-white">
                        {formQty.toLocaleString()}
                      </td>

                      {/* Material Consumption */}
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-700 dark:text-slate-300">
                        {formCons.toLocaleString()}
                      </td>

                      {/* Created By */}
                      <td className="px-4 py-3.5 text-gray-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-gray-400" />
                          <span>{rec.createdBy || "Admin"}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(rec)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View full form details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintPdf(rec)}
                            className="p-1.5 rounded-lg text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors cursor-pointer"
                            title="Download / Print PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.formNo)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete form"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Table Row Overlay / Details for Selected Row */}
      {expandedRowId && (
        <div className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-900/60 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          {(() => {
            const current = records.find((r) => r.formNo === expandedRowId);
            if (!current) return null;
            return (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 px-3 py-1 rounded-xl border border-violet-200 dark:border-violet-800">
                      {current.formNo}
                    </span>
                    <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                      Production Date: {current.date} | Shift: {current.shift}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintPdf(current)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedRowId(null)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Sub-table of items */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-2.5 w-10 text-center">#</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Product Name</th>
                        <th className="px-4 py-2.5">SKU Code</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5 text-right">Batches</th>
                        <th className="px-4 py-2.5 text-right">Consumption</th>
                        <th className="px-4 py-2.5">Bal. Compounding</th>
                        <th className="px-4 py-2.5">Return Scrap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {(current.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2 text-center font-bold text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium text-gray-700 dark:text-slate-300">
                            {it.category}
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-900 dark:text-white">
                            {it.productName}
                          </td>
                          <td className="px-4 py-2 font-mono text-gray-500 text-[11px]">
                            {it.sku || "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-black text-violet-700 dark:text-violet-300">
                            {(Number(it.quantity) || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {(Number(it.totalBatches) || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {(Number(it.totalMaterialConsumption) || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-slate-400">
                            {it.balanceCompounding || "—"}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-slate-400">
                            {it.returnPanelScrap || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Remarks display */}
                {current.remarks && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-150 dark:border-slate-800 text-xs">
                    <span className="font-bold text-gray-500 mr-2">Remarks:</span>
                    <span className="text-gray-800 dark:text-slate-200">{current.remarks}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Detail / View Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Batch Detail — {previewRecord.formNo}
                  </h3>
                  <p className="text-xs text-violet-100">
                    Production Date: {previewRecord.date} | Shift: {previewRecord.shift}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintPdf(previewRecord)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Download / Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Date</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">{previewRecord.date}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Shift</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">{previewRecord.shift}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Created By</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">{previewRecord.createdBy || "Admin"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Created At</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {previewRecord.createdAt ? new Date(previewRecord.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Items Breakdown ({(previewRecord.items || []).length})
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="px-3 py-2 text-center">#</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Batches</th>
                        <th className="px-3 py-2 text-right">Consumption</th>
                        <th className="px-3 py-2">Bal. Comp.</th>
                        <th className="px-3 py-2">Scrap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {(previewRecord.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 text-center text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{it.category}</td>
                          <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{it.productName}</td>
                          <td className="px-3 py-2 font-mono text-gray-400 text-[10px]">{it.sku || "—"}</td>
                          <td className="px-3 py-2 text-right font-black text-violet-600 dark:text-violet-400">
                            {(Number(it.quantity) || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {(Number(it.totalBatches) || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {(Number(it.totalMaterialConsumption) || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{it.balanceCompounding || "—"}</td>
                          <td className="px-3 py-2 text-gray-500">{it.returnPanelScrap || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {previewRecord.remarks && (
                <div className="p-3 bg-violet-50/50 dark:bg-violet-950/20 rounded-xl border border-violet-150 dark:border-violet-900/30">
                  <div className="font-bold text-violet-800 dark:text-violet-300 mb-1">Remarks:</div>
                  <div className="text-gray-700 dark:text-slate-300">{previewRecord.remarks}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Detail Modal for creating new batch records */}
      <BatchDetailModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        activeUser={activeUser}
        categories={categoriesFromDb}
        masterMaterials={masterMaterials}
        onSaved={() => loadRecords()}
      />
    </div>
  );
}
