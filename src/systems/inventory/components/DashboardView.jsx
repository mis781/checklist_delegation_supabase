// src/systems/inventory/components/DashboardView.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  Boxes,
  TrendingDown,
  AlertTriangle,
  FileText,
  Layers,
  ArrowUpRight,
  TrendingUp,
  ClipboardCheck,
  Search,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Package,
  Calendar,
  ArrowRightLeft,
} from "lucide-react";
import Papa from "papaparse";

const COLORS = [
  "#6366f1",
  "#a855f7",
  "#0d9488",
  "#d97706",
  "#0ea5e9",
  "#e11d48",
  "#a21caf",
];
const BAND_COLORS = {
  "Excess Stock": "#a855f7",
  "Normal Stock": "#22c55e",
  "66.33% Stock": "#eab308",
  "Below 33%": "#ef4444",
};

export default function DashboardView({ activeUser, onTabChange }) {
  const { materials, transactions, indents, divisions = [] } = useSelector(
    (state) => state.inventory,
  );
  const { transfers: allTransfers = [] } = useSelector(
    (state) => state.transfers || {},
  );

  const [firmFilter, setFirmFilter] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("all");

  const [activeModal, setActiveModal] = useState(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPage, setModalPage] = useState(1);

  const handleApplyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === "last_30") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      setFromDate(past30);
      setToDate(todayStr);
    }
  };

  const handleClearDateFilter = () => {
    setDatePreset("all");
    setFromDate("");
    setToDate("");
  };

  const existingMaterialFirms = useMemo(() => {
    return [...new Set(materials.map((m) => m.division))].filter(Boolean);
  }, [materials]);

  const firms = useMemo(() => {
    const divNames = (divisions || [])
      .map((d) => (typeof d === "string" ? d : d.name))
      .filter(Boolean);
    return [...new Set([...divNames, ...existingMaterialFirms])].filter(Boolean).sort();
  }, [divisions, existingMaterialFirms]);

  // Helper calculations
  // Helper calculations
  const calculatedData = useMemo(() => {
    // 1. Per-SKU transaction totals
    const txnBySku = {};
    materials.forEach((m) => {
      txnBySku[m.sku] = { totalIn: 0, totalOut: 0, closing: Number(m.opening) || 0 };
    });

    transactions.forEach((t) => {
      if (!txnBySku[t.sku]) return;
      if (!toDate || (t.date && t.date <= toDate)) {
        const qty = Number(t.qty) || 0;
        if (t.type === "IN" || t.type === "Job Card") {
          txnBySku[t.sku].totalIn += qty;
          txnBySku[t.sku].closing += qty;
        } else {
          txnBySku[t.sku].totalOut += qty;
          txnBySku[t.sku].closing -= qty;
        }
      }
    });

    // 2. Transfer deltas per (SKU, division)
    const transferDeltas = {};
    (allTransfers || [])
      .filter((t) => t.status === "Approved")
      .forEach((trf) => {
        const sku = trf.skuCode;
        const qty = Number(trf.quantity) || 0;
        const trfDate = trf.transferDate || (trf.approvedAt ? trf.approvedAt.slice(0, 10) : "");
        if (toDate && trfDate && trfDate > toDate) return;

        if (!transferDeltas[sku]) transferDeltas[sku] = {};

        // FROM division
        if (trf.fromDivision) {
          if (!transferDeltas[sku][trf.fromDivision]) {
            transferDeltas[sku][trf.fromDivision] = { transferOut: 0, transferIn: 0 };
          }
          transferDeltas[sku][trf.fromDivision].transferOut += qty;
        }

        // TO division
        if (trf.toDivision) {
          if (!transferDeltas[sku][trf.toDivision]) {
            transferDeltas[sku][trf.toDivision] = { transferOut: 0, transferIn: 0 };
          }
          transferDeltas[sku][trf.toDivision].transferIn += qty;
        }
      });

    // 3. Build complete material list (native + synthesized virtual rows for receiving divisions)
    const fullMaterials = materials.map((m) => {
      const skuTxn = txnBySku[m.sku] || { totalIn: 0, totalOut: 0, closing: Number(m.opening) || 0 };
      const delta = (transferDeltas[m.sku] || {})[m.division] || { transferOut: 0, transferIn: 0 };

      const closingStock = skuTxn.closing - delta.transferOut + delta.transferIn;
      const totalIn = skuTxn.totalIn + delta.transferIn;
      const totalOut = skuTxn.totalOut + delta.transferOut;

      const safetyStock = (Number(m.adc) || 0) * (Number(m.safetyFactor) || 0);
      const reorderLevel = (Number(m.adc) || 0) * (Number(m.leadTime) || 0) + safetyStock;
      const maxLevel = reorderLevel + (Number(m.moq) || 0);

      let band = "Normal Stock";
      if (maxLevel > 0) {
        const pct = (closingStock / maxLevel) * 100;
        if (pct > 100) band = "Excess Stock";
        else if (pct >= 66.33) band = "Normal Stock";
        else if (pct >= 33) band = "66.33% Stock";
        else band = "Below 33%";
      }

      return {
        ...m,
        closingStock,
        safetyStock,
        reorderLevel,
        maxLevel,
        totalIn,
        totalOut,
        transferIn: delta.transferIn,
        transferOut: delta.transferOut,
        band,
      };
    });

    // Synthesize virtual rows for TO divisions without an explicit material master record
    const existingKeys = new Set(materials.map((m) => `${m.sku}__${m.division}`));
    (allTransfers || [])
      .filter((t) => t.status === "Approved")
      .forEach((trf) => {
        const key = `${trf.skuCode}__${trf.toDivision}`;
        if (existingKeys.has(key)) return;

        const sourceMat = materials.find((m) => m.sku === trf.skuCode);
        if (!sourceMat) return;

        const virtualKey = `virtual__${trf.skuCode}__${trf.toDivision}`;
        const existingVirtual = fullMaterials.find((r) => r._virtualKey === virtualKey);
        const qty = Number(trf.quantity) || 0;

        if (existingVirtual) {
          existingVirtual.transferIn += qty;
          existingVirtual.totalIn += qty;
          existingVirtual.closingStock += qty;
          return;
        }

        const safetyStock = (Number(sourceMat.adc) || 0) * (Number(sourceMat.safetyFactor) || 0);
        const reorderLevel = (Number(sourceMat.adc) || 0) * (Number(sourceMat.leadTime) || 0) + safetyStock;
        const maxLevel = reorderLevel + (Number(sourceMat.moq) || 0);

        let band = "Normal Stock";
        if (maxLevel > 0) {
          const pct = (qty / maxLevel) * 100;
          if (pct > 100) band = "Excess Stock";
          else if (pct >= 66.33) band = "Normal Stock";
          else if (pct >= 33) band = "66.33% Stock";
          else band = "Below 33%";
        }

        fullMaterials.push({
          ...sourceMat,
          division: trf.toDivision,
          opening: 0,
          closingStock: qty,
          safetyStock,
          reorderLevel,
          maxLevel,
          totalIn: qty,
          totalOut: 0,
          transferIn: qty,
          transferOut: 0,
          band,
          _virtualKey: virtualKey,
          isTransferRow: true,
        });
        existingKeys.add(key);
      });

    // 4. Visible materials based on location, firm, and material type filters
    let visibleMats = activeUser.location
      ? fullMaterials.filter((m) => m.location === activeUser.location)
      : fullMaterials;

    if (firmFilter) {
      visibleMats = visibleMats.filter((m) => m.division === firmFilter);
    }

    if (materialTypeFilter) {
      visibleMats = visibleMats.filter((m) => {
        const matType = (
          m.materialType ||
          m.material_type ||
          (m.category && m.category.toLowerCase() !== "raw material" ? "FG" : "RM")
        ).toUpperCase();
        return matType === materialTypeFilter;
      });
    }

    const visibleSkus = new Set(visibleMats.map((m) => m.sku));

    // 5. Transactions filtered by SKUs, location/firm, and date range
    let visibleTxns = transactions.filter((t) => visibleSkus.has(t.sku));
    if (fromDate) {
      visibleTxns = visibleTxns.filter((t) => t.date && t.date >= fromDate);
    }
    if (toDate) {
      visibleTxns = visibleTxns.filter((t) => t.date && t.date <= toDate);
    }

    // 6. Transfers filtered by firm and date range
    let visibleTransfers = (allTransfers || []).filter((trf) => {
      if (firmFilter && trf.fromDivision !== firmFilter && trf.toDivision !== firmFilter) {
        return false;
      }
      const tDate = trf.transferDate || (trf.submittedAt ? trf.submittedAt.slice(0, 10) : "");
      if (fromDate && tDate && tDate < fromDate) return false;
      if (toDate && tDate && tDate > toDate) return false;
      return true;
    });

    // 7. Indents filtered by SKUs and date range
    let visibleIndents = indents.filter((i) => visibleSkus.has(i.sku));
    if (fromDate) {
      visibleIndents = visibleIndents.filter((i) => i.date && i.date >= fromDate);
    }
    if (toDate) {
      visibleIndents = visibleIndents.filter((i) => i.date && i.date <= toDate);
    }

    // 8. KPIs
    const totalSKUs = visibleMats.length;
    const totalQty = visibleMats.reduce((sum, m) => sum + m.closingStock, 0);
    const excessCount = visibleMats.filter((m) => m.band === "Excess Stock").length;
    const lowCount = visibleMats.filter((m) => m.band === "66.33% Stock").length;
    const criticalCount = visibleMats.filter((m) => m.band === "Below 33%").length;
    const activeIndents = visibleIndents.filter((i) => i.status === "Approved").length;
    const pendingIndents = visibleIndents.filter((i) => i.status === "Pending").length;

    // Transfer KPIs
    const approvedTransfersCount = visibleTransfers.filter((t) => t.status === "Approved").length;
    const pendingTransfersCount = visibleTransfers.filter((t) => t.status === "Pending").length;
    const totalTransferredQty = visibleTransfers
      .filter((t) => t.status === "Approved")
      .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

    // 9. Charts - Category wise closing stock
    const catMap = {};
    visibleMats.forEach((m) => {
      catMap[m.category] = (catMap[m.category] || 0) + m.closingStock;
    });
    const categoryData = Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
    }));

    // 10. Charts - Inward vs Outward by month (combining Transactions & Transfers)
    const monthMap = {};
    visibleTxns.forEach((t) => {
      const month = (t.date || "").slice(0, 7); // YYYY-MM
      if (!month) return;
      if (!monthMap[month]) monthMap[month] = { month, Inward: 0, Outward: 0 };
      if (t.type === "IN" || t.type === "Job Card") {
        monthMap[month].Inward = parseFloat((monthMap[month].Inward + (Number(t.qty) || 0)).toFixed(2));
      } else {
        monthMap[month].Outward = parseFloat((monthMap[month].Outward + (Number(t.qty) || 0)).toFixed(2));
      }
    });

    // Add transfer movements into monthly chart
    visibleTransfers
      .filter((trf) => trf.status === "Approved")
      .forEach((trf) => {
        const tDate = trf.transferDate || (trf.submittedAt ? trf.submittedAt.slice(0, 10) : "");
        const month = tDate.slice(0, 7);
        if (!month) return;
        if (!monthMap[month]) monthMap[month] = { month, Inward: 0, Outward: 0 };
        const qty = Number(trf.quantity) || 0;

        if (firmFilter) {
          if (trf.toDivision === firmFilter) {
            monthMap[month].Inward = parseFloat((monthMap[month].Inward + qty).toFixed(2));
          }
          if (trf.fromDivision === firmFilter) {
            monthMap[month].Outward = parseFloat((monthMap[month].Outward + qty).toFixed(2));
          }
        } else {
          // Global view: count transfer as Movement
          monthMap[month].Inward = parseFloat((monthMap[month].Inward + qty).toFixed(2));
          monthMap[month].Outward = parseFloat((monthMap[month].Outward + qty).toFixed(2));
        }
      });

    const inOutData = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // 11. Charts - Top 5 Consumption (Outward Qty)
    const consMap = {};
    visibleTxns
      .filter((t) => t.type === "OUT")
      .forEach((t) => {
        consMap[t.name] = (consMap[t.name] || 0) + Number(t.qty);
      });
    visibleTransfers
      .filter((trf) => trf.status === "Approved")
      .forEach((trf) => {
        if (!firmFilter || trf.fromDivision === firmFilter) {
          consMap[trf.skuName] = (consMap[trf.skuName] || 0) + Number(trf.quantity);
        }
      });
    const consumptionData = Object.entries(consMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 12. Charts - Stock Band Distribution
    const bandMap = {
      "Excess Stock": 0,
      "Normal Stock": 0,
      "66.33% Stock": 0,
      "Below 33%": 0,
    };
    visibleMats.forEach((m) => {
      bandMap[m.band] = (bandMap[m.band] || 0) + 1;
    });
    const bandData = Object.entries(bandMap).map(([name, count]) => ({
      name,
      count,
      fill: BAND_COLORS[name],
    }));

    return {
      kpis: {
        totalSKUs,
        totalQty,
        excessCount,
        lowCount,
        criticalCount,
        activeIndents,
        pendingIndents,
        approvedTransfersCount,
        pendingTransfersCount,
        totalTransferredQty,
      },
      visibleMats,
      visibleSkus,
      visibleIndents,
      visibleTransfers,
      categoryData,
      inOutData,
      consumptionData,
      bandData,
    };
  }, [materials, transactions, indents, allTransfers, activeUser, firmFilter, materialTypeFilter, fromDate, toDate]);

  const {
    kpis,
    visibleMats,
    visibleIndents,
    visibleTransfers,
    categoryData,
    inOutData,
    consumptionData,
    bandData,
  } = calculatedData;

  const kpiCards = [
    {
      id: "totalSKUs",
      title: "Total SKU",
      value: kpis.totalSKUs,
      sub: `${materials.filter((m) => m.status === "Active").length} active SKUs`,
      icon: Layers,
      color: "from-blue-500 to-indigo-600",
      textColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      id: "totalQty",
      title: "Total Inventory Qty",
      value: kpis.totalQty.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
      sub: "Items in all storage areas",
      icon: Boxes,
      color: "from-sky-400 to-blue-500",
      textColor: "text-sky-500 dark:text-sky-400",
    },
    {
      id: "excess",
      title: "Excess Stock Items",
      value: kpis.excessCount,
      sub: "Holding above Max levels",
      icon: ArrowUpRight,
      color: "from-blue-500 to-pink-600",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      id: "low",
      title: "Low Stock (66.33%)",
      value: kpis.lowCount,
      sub: "Approaching reorder level",
      icon: TrendingDown,
      color: "from-amber-400 to-orange-500",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "critical",
      title: "Critical (Below 33%)",
      value: kpis.criticalCount,
      sub: "Immediate reorder needed",
      icon: AlertTriangle,
      color: "from-rose-500 to-red-600",
      textColor: "text-rose-600 dark:text-rose-400",
    },
    {
      id: "activeIndents",
      title: "Active Indents",
      value: kpis.activeIndents,
      sub: "Approved indents",
      icon: ClipboardCheck,
      color: "from-violet-500 to-purple-600",
      textColor: "text-violet-600 dark:text-violet-400",
    },
    {
      id: "pendingIndents",
      title: "Pending Indents",
      value: kpis.pendingIndents,
      sub: "Awaiting completion",
      icon: FileText,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  // Modal dataset calculations
  const modalRawItems = useMemo(() => {
    if (!activeModal) return [];
    switch (activeModal.id) {
      case "totalSKUs":
        return visibleMats;
      case "totalQty":
        return [...visibleMats].sort((a, b) => b.closingStock - a.closingStock);
      case "excess":
        return visibleMats.filter((m) => m.band === "Excess Stock");
      case "low":
        return visibleMats.filter((m) => m.band === "66.33% Stock");
      case "critical":
        return visibleMats.filter((m) => m.band === "Below 33%");
      case "activeIndents":
        return visibleIndents.filter((i) => i.status === "Approved");
      case "pendingIndents":
        return visibleIndents.filter((i) => i.status === "Pending");
      default:
        return [];
    }
  }, [activeModal, visibleMats, visibleIndents]);

  const isIndentModal =
    activeModal?.id === "activeIndents" || activeModal?.id === "pendingIndents";

  const modalFilteredItems = useMemo(() => {
    if (!modalSearch.trim()) return modalRawItems;
    const q = modalSearch.toLowerCase().trim();
    if (isIndentModal) {
      return modalRawItems.filter(
        (i) =>
          (i.indentNo || "").toLowerCase().includes(q) ||
          (i.sku || "").toLowerCase().includes(q) ||
          (i.name || "").toLowerCase().includes(q) ||
          (i.requestedBy || "").toLowerCase().includes(q) ||
          (i.department || "").toLowerCase().includes(q) ||
          (i.supplierName || "").toLowerCase().includes(q) ||
          (i.firm || "").toLowerCase().includes(q)
      );
    }
    return modalRawItems.filter(
      (m) =>
        (m.sku || "").toLowerCase().includes(q) ||
        (m.name || "").toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q) ||
        (m.division || "").toLowerCase().includes(q) ||
        (m.location || "").toLowerCase().includes(q) ||
        (m.band || "").toLowerCase().includes(q)
    );
  }, [modalRawItems, modalSearch, isIndentModal]);

  const MODAL_PAGE_SIZE = 8;
  const modalTotalPages = Math.max(
    1,
    Math.ceil(modalFilteredItems.length / MODAL_PAGE_SIZE)
  );
  const modalPaginatedItems = useMemo(() => {
    const start = (modalPage - 1) * MODAL_PAGE_SIZE;
    return modalFilteredItems.slice(start, start + MODAL_PAGE_SIZE);
  }, [modalFilteredItems, modalPage]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveModal(null);
      }
    };
    if (activeModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal]);

  const handleExportModalCSV = () => {
    if (!activeModal || modalFilteredItems.length === 0) return;
    let exportData = [];
    if (isIndentModal) {
      exportData = modalFilteredItems.map((i) => ({
        "Indent No": i.indentNo,
        Date: i.date,
        "SKU Code": i.sku,
        "Material Name": i.name,
        Firm: i.firm || "",
        Department: i.department || "",
        "Requested By": i.requestedBy || "",
        "Current Stock": i.currentStock || 0,
        "Reorder Qty": i.reorderQty || 0,
        Supplier: i.supplierName || "",
        Status: i.status || "",
      }));
    } else {
      exportData = modalFilteredItems.map((m) => ({
        "SKU Code": m.sku,
        "Material Name": m.name,
        Category: m.category || "",
        Firm: m.division || "",
        "Storage Location": m.location || "",
        Unit: m.unit || "",
        "Opening Stock": m.opening || 0,
        "Closing Stock": m.closingStock || 0,
        "Safety Stock": m.safetyStock || 0,
        "Reorder Level": m.reorderLevel || 0,
        "Max Level": m.maxLevel || 0,
        "Stock Band": m.band || "",
        Status: m.status || "Active",
      }));
    }
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${activeModal.title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBandBadgeClass = (band) => {
    switch (band) {
      case "Excess Stock":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "Normal Stock":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "66.33% Stock":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Below 33%":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 border-gray-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar (Firm + Date Filters) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs">
        {/* Left: Firm & Material Type Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Firm Filter:
            </span>
            <select
              value={firmFilter}
              onChange={(e) => setFirmFilter(e.target.value)}
              className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[160px]"
            >
              <option value="">All Firms</option>
              {firms.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={materialTypeFilter}
              onChange={(e) => setMaterialTypeFilter(e.target.value)}
              className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[170px]"
            >
              <option value="">All Material Types</option>
              <option value="RM">Raw Material (RM)</option>
              <option value="FG">Finished Goods (FG)</option>
            </select>
          </div>
        </div>

        {/* Right: Date Range Filter with Presets */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mr-1">
            <Calendar size={15} className="text-indigo-500" />
            <span>Date Filter:</span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-950 p-1 rounded-xl border border-gray-200 dark:border-slate-800">
            {[
              { label: "All Time", value: "all" },
              { label: "Today", value: "today" },
              { label: "This Month", value: "this_month" },
              { label: "Last 30D", value: "last_30" },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleApplyDatePreset(p.value)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  datePreset === p.value
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* From & To Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] font-bold text-gray-400">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="bg-transparent text-xs text-gray-900 dark:text-white font-medium focus:outline-hidden cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] font-bold text-gray-400">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="bg-transparent text-xs text-gray-900 dark:text-white font-medium focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {(fromDate || toDate || datePreset !== "all") && (
            <button
              type="button"
              onClick={handleClearDateFilter}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Reset date filter"
            >
              <X size={14} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {kpiCards.map((c, i) => (
          <div
            key={i}
            onClick={() => {
              setActiveModal({
                id: c.id,
                title: c.title,
                sub: c.sub,
                icon: c.icon,
                color: c.color,
                textColor: c.textColor,
                value: c.value,
              });
              setModalSearch("");
              setModalPage(1);
            }}
            title="Click to view list of items"
            className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-lg hover:border-indigo-400/70 dark:hover:border-indigo-500/70 transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {c.title}
              </span>
              <div
                className={`p-1.5 rounded-lg bg-gray-50 dark:bg-slate-950 ${c.textColor} group-hover:scale-110 transition-transform`}
              >
                <c.icon size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {c.value}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 truncate flex items-center justify-between">
              <span className="truncate">{c.sub}</span>
              <span className="text-[10px] font-bold text-indigo-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                View →
              </span>
            </div>
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${c.color}`}
            />
          </div>
        ))}
      </div>

      {/* Details Popup Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-150 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/70 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs ${activeModal.textColor}`}
                >
                  <activeModal.icon size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                      {activeModal.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {modalFilteredItems.length} {isIndentModal ? "Indents" : "SKUs"}
                    </span>
                    {firmFilter && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-150 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                        Firm: {firmFilter}
                      </span>
                    )}
                    {(fromDate || toDate) && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        📅 {fromDate || "Earliest"} → {toDate || "Latest"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {activeModal.sub} · Showing items matching current firm/location/date filters
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportModalCSV}
                  disabled={modalFilteredItems.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileSpreadsheet size={15} />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-150 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Search Toolbar */}
            <div className="p-3.5 border-b border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                  placeholder={
                    isIndentModal
                      ? "Search by Indent No, SKU, Material Name, Requester, Supplier..."
                      : "Search by SKU, Material Name, Category, Firm, Location..."
                  }
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearch("");
                      setModalPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {modalFilteredItems.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-gray-400 mb-3">
                    <Package size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                    No items found
                  </h4>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {modalSearch
                      ? "No records matched your search query."
                      : "There are currently no records for this card filter."}
                  </p>
                </div>
              ) : isIndentModal ? (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Indent No</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">SKU / Material Name</th>
                        <th className="py-3 px-4">Firm</th>
                        <th className="py-3 px-4">Requested By</th>
                        <th className="py-3 px-4 text-right">Current Stock</th>
                        <th className="py-3 px-4 text-right">Reorder Qty</th>
                        <th className="py-3 px-4">Supplier</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                      {modalPaginatedItems.map((item, idx) => (
                        <tr
                          key={item.indentNo || idx}
                          className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {item.indentNo}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                            {item.date || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="font-mono text-[10px] text-gray-400 dark:text-slate-500">
                              {item.sku}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                            {item.firm || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-800 dark:text-slate-200">
                              {item.requestedBy || "—"}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {item.department || "—"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-gray-700 dark:text-slate-300">
                            {(item.currentStock || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {(item.reorderQty || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                            {item.supplierName || "—"}
                          </td>
                          <td className="py-3 px-4">
                            {item.status === "Approved" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={12} />
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <Clock size={12} />
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">SKU Code</th>
                        <th className="py-3 px-4">Material Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Firm</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4 text-right">Closing Stock</th>
                        <th className="py-3 px-4 text-right">Safety Stock</th>
                        <th className="py-3 px-4 text-right">
                          {activeModal.id === "excess" ? "Max Level" : "Reorder Level"}
                        </th>
                        <th className="py-3 px-4">Stock Band</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                      {modalPaginatedItems.map((mat) => (
                        <tr
                          key={mat.sku}
                          className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {mat.sku}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {mat.name}
                            </div>
                            {mat.subCategory && (
                              <div className="text-[10px] text-gray-400">
                                {mat.subCategory}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                            {mat.category || "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                            {mat.division || "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                            {mat.location || "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-black text-gray-900 dark:text-white">
                              {(mat.closingStock || 0).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-1">
                              {mat.unit || ""}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-600 dark:text-slate-300">
                            {(mat.safetyStock || 0).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-gray-700 dark:text-slate-300">
                            {activeModal.id === "excess"
                              ? (mat.maxLevel || 0).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })
                              : (mat.reorderLevel || 0).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getBandBadgeClass(
                                mat.band,
                              )}`}
                            >
                              {mat.band || "Normal Stock"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer / Pagination */}
            {modalTotalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/50 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400">
                <div>
                  Showing {Math.min(modalFilteredItems.length, (modalPage - 1) * MODAL_PAGE_SIZE + 1)}–
                  {Math.min(modalFilteredItems.length, modalPage * MODAL_PAGE_SIZE)} of{" "}
                  {modalFilteredItems.length} items
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={modalPage <= 1}
                    onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 font-bold text-gray-800 dark:text-slate-200">
                    {modalPage} / {modalTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={modalPage >= modalTotalPages}
                    onClick={() => setModalPage((p) => Math.min(modalTotalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category distribution */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm w-full min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            Category-wise Stock Volume
          </h3>
          <div className="h-64 flex items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="text-gray-400 text-xs">
                No stock data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Inward vs Outward */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm w-full min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
            Stock Movements (Inward vs Outward)
          </h3>
          <div className="h-64">
            {inOutData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                No transactions recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={inOutData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: "10px" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: "10px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [
                      parseFloat(value).toFixed(2),
                      undefined,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  <Bar dataKey="Inward" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outward" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Consumption */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm w-full min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" />
            Monthly Consumption (Top 5 Materials)
          </h3>
          <div className="h-64">
            {consumptionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                No consumption recorded (OUT transactions)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consumptionData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: "10px" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: "9px", fontWeight: "bold" }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="qty"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Stock band distribution */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm w-full min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Stock Band Distribution (SKU Counts)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bandData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "10px" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  style={{ fontSize: "10px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                  {bandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Internal Material Transfers Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-indigo-500" />
            Internal Material Transfers (IN / OUT Movement Details)
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {visibleTransfers.length} Transfers
            </span>
          </div>
        </div>

        {visibleTransfers.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            No internal material transfers recorded for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Transfer ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">SKU / Material Name</th>
                  <th className="py-3 px-4">From Division</th>
                  <th className="py-3 px-4">To Division</th>
                  <th className="py-3 px-4 text-right">Transferred Qty</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Operator / Remarks</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {visibleTransfers.map((trf) => {
                  const qty = Number(trf.quantity) || 0;
                  const isOut = firmFilter && trf.fromDivision === firmFilter;
                  const isIn = firmFilter && trf.toDivision === firmFilter;

                  return (
                    <tr
                      key={trf.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {trf.id}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {trf.transferDate || (trf.submittedAt ? trf.submittedAt.slice(0, 10) : "—")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {trf.skuName}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400 dark:text-slate-500">
                          {trf.skuCode}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-slate-300">
                        {trf.fromDivision}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-slate-300">
                        {trf.toDivision}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                        {qty.toLocaleString()} {trf.unit || ""}
                      </td>
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            ↗ Transfer OUT
                          </span>
                        ) : isIn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                            ↙ Transfer IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            ⇄ Internal Transfer
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-800 dark:text-slate-200 font-medium">
                          {trf.operatorName || "—"}
                        </div>
                        {trf.remarks && (
                          <div className="text-[10px] text-gray-400 italic">
                            {trf.remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {trf.status === "Approved" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={12} />
                            Approved
                          </span>
                        ) : trf.status === "Pending" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock size={12} />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <X size={12} />
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
