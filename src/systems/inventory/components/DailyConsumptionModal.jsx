import React, { useState, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  X,
  Search,
  FileSpreadsheet,
  Layers,
  Flame,
  Activity,
  Calendar,
  Box,
  TrendingDown,
  PackageCheck,
  MapPin,
  Tag
} from "lucide-react";
import Papa from "papaparse";

export default function DailyConsumptionModal({ isOpen, onClose }) {
  const {
    transactions = [],
    materials = [],
    jobCardBatches = [],
    divisions = [],
    finishedGoodsNames = []
  } = useSelector((state) => state.inventory);

  const [activeTab, setActiveTab] = useState("ledger"); // 'ledger' | 'rm_to_fg'
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState(""); // '' | 'RM' | 'FG'
  const [productFilter, setProductFilter] = useState("");
  const [fgFilter, setFgFilter] = useState("");
  const [destFilter, setDestFilter] = useState("");
  const [firmFilter, setFirmFilter] = useState("");

  // Helper to determine material type (RM or FG)
  const getMaterialType = useCallback((item) => {
    if (!item) return "RM";
    if (item.materialType === "FG" || item.material_type === "FG") return "FG";
    if (item.materialType === "RM" || item.material_type === "RM") return "RM";
    const match = materials.find((m) => m.sku === item.sku || m.name === item.name);
    if (match) {
      if (match.materialType === "FG" || match.material_type === "FG") return "FG";
      if (match.category && match.category.toLowerCase() !== "raw material") return "FG";
    }
    if (item.category && item.category.toLowerCase() !== "raw material") return "FG";
    return "RM";
  }, [materials]);

  // Helper to get unit for a SKU
  const getMaterialUnit = useCallback((sku) => {
    if (!sku) return "";
    const m = materials.find((mat) => mat.sku === sku);
    return m?.unit || "";
  }, [materials]);

  // Helper to get Finished Good name by SKU
  const getFgNameBySku = useCallback((sku) => {
    if (!sku) return "";
    const fg = (finishedGoodsNames || []).find((f) => f.sku === sku);
    if (fg?.name) return fg.name;
    const m = (materials || []).find((mat) => mat.sku === sku);
    return m?.name || sku;
  }, [finishedGoodsNames, materials]);

  // 1. Build Consolidated Consumed Records (Ledger)
  const consumedRecords = useMemo(() => {
    const list = [];

    transactions.forEach((txn) => {
      const isOut =
        txn.type === "OUT" ||
        String(txn.type || "").toUpperCase() === "OUT" ||
        txn.isJobCard;

      if (!isOut) return;

      const destinationVal = txn.destination || txn.partyName || "";

      // Check if this transaction has associated job card batches (Raw Materials consumed for a Finished Good)
      const relatedBatches = jobCardBatches.filter(
        (b) => b.transaction_id === txn.id
      );

      if (relatedBatches.length > 0) {
        // Explode into individual Raw Material consumption records mapped to the Finished Good
        const targetFgName = txn.name || getFgNameBySku(txn.sku || txn.fgSku) || "Finished Good";
        const targetFgSku = txn.sku || txn.fgSku || "";

        relatedBatches.forEach((batch) => {
          list.push({
            id: `${txn.id}-b${batch.batch_number}-${batch.sku}`,
            txnId: txn.id,
            date: txn.date,
            materialSku: batch.sku,
            materialName: batch.material_name || batch.sku,
            materialType: "RM",
            qty: Number(batch.qty) || 0,
            unit: getMaterialUnit(batch.sku),
            ref: txn.ref || txn.jobCardId || `Job Card #${batch.batch_number}`,
            usedForFgSku: targetFgSku,
            usedForFgName: targetFgName,
            isUsedForFg: true,
            destination: destinationVal,
            user: txn.user || "",
            firm: txn.firm || "",
            remarks: txn.remarks || `Job Card Consumption (Batch ${batch.batch_number})`,
            batchNumber: batch.batch_number,
            isJobCard: true
          });
        });
      } else {
        // Standard OUT transaction (can be RM direct issue or FG dispatch)
        const type = txn.materialType || getMaterialType(txn);
        let targetFgName = "";
        let targetFgSku = "";
        let isUsedForFg = false;

        if (type === "RM") {
          if (txn.fgSku) {
            targetFgSku = txn.fgSku;
            targetFgName = getFgNameBySku(txn.fgSku);
            isUsedForFg = true;
          }
        }

        list.push({
          id: txn.id,
          txnId: txn.id,
          date: txn.date,
          materialSku: txn.sku,
          materialName: txn.name,
          materialType: type,
          qty: Number(txn.qty) || 0,
          unit: getMaterialUnit(txn.sku),
          ref: txn.ref || "",
          usedForFgSku: targetFgSku,
          usedForFgName: targetFgName,
          isUsedForFg: isUsedForFg,
          destination: destinationVal,
          user: txn.user || "",
          firm: txn.firm || "",
          remarks: txn.remarks || "",
          batchNumber: null,
          isJobCard: !!txn.isJobCard
        });
      }
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [transactions, jobCardBatches, getMaterialUnit, getMaterialType, getFgNameBySku]);

  // 2. Build RM ➔ FG Usage Analysis Matrix
  const rmToFgAnalysis = useMemo(() => {
    const fgMap = {};

    consumedRecords.forEach((rec) => {
      // Only group records where Raw Materials were used for an actual Finished Good
      if (rec.materialType !== "RM" || !rec.isUsedForFg || !rec.usedForFgName) return;

      const fgKey = rec.usedForFgName;
      if (!fgMap[fgKey]) {
        fgMap[fgKey] = {
          fgName: rec.usedForFgName,
          fgSku: rec.usedForFgSku || "—",
          totalRMQty: 0,
          uniqueRMs: new Set(),
          jobCardRefs: new Set(),
          rawMaterials: {},
          lastDate: rec.date,
          firms: new Set()
        };
      }

      const fgObj = fgMap[fgKey];
      fgObj.totalRMQty += rec.qty;
      fgObj.uniqueRMs.add(rec.materialName);
      if (rec.ref) fgObj.jobCardRefs.add(rec.ref);
      if (rec.firm) fgObj.firms.add(rec.firm);
      if (!fgObj.lastDate || new Date(rec.date) > new Date(fgObj.lastDate)) {
        fgObj.lastDate = rec.date;
      }

      // Track individual RM quantities used for this FG
      const rmKey = rec.materialSku || rec.materialName;
      if (!fgObj.rawMaterials[rmKey]) {
        fgObj.rawMaterials[rmKey] = {
          sku: rec.materialSku,
          name: rec.materialName,
          qty: 0,
          unit: rec.unit,
          entriesCount: 0
        };
      }
      fgObj.rawMaterials[rmKey].qty += rec.qty;
      fgObj.rawMaterials[rmKey].entriesCount += 1;
    });

    return Object.values(fgMap).map((fg) => ({
      ...fg,
      uniqueRMsCount: fg.uniqueRMs.size,
      jobCardsCount: fg.jobCardRefs.size,
      rawMaterialsList: Object.values(fg.rawMaterials)
    }));
  }, [consumedRecords]);

  // Dropdown Options
  const uniqueMaterialTypes = [
    { label: "All Material Types", value: "" },
    { label: "Raw Material (RM)", value: "RM" },
    { label: "Finished Goods (FG)", value: "FG" }
  ];

  // Dynamic Products List based on Material Type Filter
  const uniqueProducts = useMemo(() => {
    let items = consumedRecords;
    if (materialTypeFilter) {
      items = items.filter((r) => r.materialType === materialTypeFilter);
    }
    const names = items.map((r) => r.materialName).filter(Boolean);
    return [...new Set(names)].sort();
  }, [consumedRecords, materialTypeFilter]);

  // Only Finished Goods that are actually present in transactions (either as outward FG item or target FG for RM)
  const uniqueTargetFGs = useMemo(() => {
    const list = new Set();
    consumedRecords.forEach((r) => {
      // 1. Finished Good outward dispatch transaction
      if (r.materialType === "FG" && r.materialName) {
        list.add(r.materialName);
      }
      // 2. Raw Material consumed for a target Finished Good
      if (r.isUsedForFg && r.usedForFgName) {
        list.add(r.usedForFgName);
      }
    });
    return [...list].sort();
  }, [consumedRecords]);

  // Destinations List (e.g. ARANG, MAHASAMUND, party sites)
  const uniqueDestinations = useMemo(() => {
    const list = consumedRecords.map((r) => r.destination).filter(Boolean);
    return [...new Set(list)].sort();
  }, [consumedRecords]);

  // Firms List
  const uniqueFirms = useMemo(() => {
    const divNames = (divisions || [])
      .map((d) => (typeof d === "string" ? d : d.name))
      .filter(Boolean);
    const txnFirms = consumedRecords.map((r) => r.firm).filter(Boolean);
    return [...new Set([...divNames, ...txnFirms])].sort();
  }, [divisions, consumedRecords]);

  // Filtered Consumed Records
  const filteredRecords = useMemo(() => {
    return consumedRecords.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          (r.materialName || "").toLowerCase().includes(q) ||
          (r.materialSku || "").toLowerCase().includes(q) ||
          (r.usedForFgName || "").toLowerCase().includes(q) ||
          (r.usedForFgSku || "").toLowerCase().includes(q) ||
          (r.destination || "").toLowerCase().includes(q) ||
          (r.ref || "").toLowerCase().includes(q) ||
          (r.user || "").toLowerCase().includes(q) ||
          (r.remarks || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (materialTypeFilter && r.materialType !== materialTypeFilter) return false;
      if (productFilter && r.materialName !== productFilter) return false;
      if (fgFilter) {
        const isDirectFgMatch = r.materialType === "FG" && r.materialName === fgFilter;
        const isTargetFgMatch = r.isUsedForFg && r.usedForFgName === fgFilter;
        if (!isDirectFgMatch && !isTargetFgMatch) return false;
      }
      if (destFilter && r.destination !== destFilter) return false;
      if (firmFilter && r.firm !== firmFilter) return false;
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;

      return true;
    });
  }, [
    consumedRecords,
    search,
    materialTypeFilter,
    productFilter,
    fgFilter,
    destFilter,
    firmFilter,
    fromDate,
    toDate
  ]);

  // Filtered RM ➔ FG Analysis
  const filteredRmToFg = useMemo(() => {
    return rmToFgAnalysis.filter((fg) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesFg =
          (fg.fgName || "").toLowerCase().includes(q) ||
          (fg.fgSku || "").toLowerCase().includes(q);
        const matchesRm = fg.rawMaterialsList.some(
          (rm) =>
            (rm.name || "").toLowerCase().includes(q) ||
            (rm.sku || "").toLowerCase().includes(q)
        );
        if (!matchesFg && !matchesRm) return false;
      }

      if (fgFilter && fg.fgName !== fgFilter) return false;
      if (productFilter && !fg.rawMaterialsList.some((rm) => rm.name === productFilter))
        return false;
      if (firmFilter && !Array.from(fg.firms).includes(firmFilter)) return false;

      return true;
    });
  }, [rmToFgAnalysis, search, fgFilter, productFilter, firmFilter]);

  // Summary Metrics Breakdown
  const totalConsumedQty = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  }, [filteredRecords]);

  const rmBreakdown = useMemo(() => {
    const rmRecords = filteredRecords.filter((r) => r.materialType === "RM");
    const qty = rmRecords.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
    const distinctNames = new Set(rmRecords.map((r) => r.materialName)).size;
    return { count: rmRecords.length, qty, distinctNames };
  }, [filteredRecords]);

  const fgBreakdown = useMemo(() => {
    const fgRecords = filteredRecords.filter((r) => r.materialType === "FG");
    const qty = fgRecords.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
    const distinctNames = new Set(fgRecords.map((r) => r.materialName)).size;
    return { count: fgRecords.length, qty, distinctNames };
  }, [filteredRecords]);

  // Export to CSV
  const handleExportCSV = () => {
    if (activeTab === "ledger") {
      const exportData = filteredRecords.map((r) => ({
        "Date": r.date || "",
        "Material Name": r.materialName || "",
        "SKU Code": r.materialSku || "",
        "Material Type": r.materialType || "RM",
        "Consumed / Outward Qty": r.qty || 0,
        "Unit": r.unit || "",
        "Target Finished Good": r.isUsedForFg
          ? (r.usedForFgSku ? `${r.usedForFgName} (${r.usedForFgSku})` : r.usedForFgName)
          : (r.materialType === "FG" ? "Finished Good Dispatch" : "Direct / General Issue"),
        "Destination / Party": r.destination ? String(r.destination).trim() : "",
        "Reference / Job Card": r.ref ? String(r.ref).trim() : "",
        "Firm": r.firm ? String(r.firm).trim() : "",
        "Posted By": r.user ? String(r.user).trim() : "",
        "Remarks": r.remarks ? String(r.remarks).trim() : ""
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Daily_Consumption_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const exportData = [];
      filteredRmToFg.forEach((fg) => {
        fg.rawMaterialsList.forEach((rm) => {
          exportData.push({
            "Finished Good Name": fg.fgName || "",
            "Finished Good SKU": fg.fgSku && fg.fgSku !== "—" ? fg.fgSku : "",
            "Raw Material Name": rm.name || "",
            "Raw Material SKU": rm.sku || "",
            "Total Consumed Qty": rm.qty || 0,
            "Unit": rm.unit || "",
            "Entries Count": rm.entriesCount || 0,
            "Last Activity Date": fg.lastDate || ""
          });
        });
      });

      const csv = Papa.unparse(exportData);
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `RM_to_FG_Usage_Analysis_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-xs">
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-6xl shadow-2xl animate-scale-up flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:via-transparent">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
              <Flame size={20} className="animate-pulse sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">
                  Daily Consumption & Usage Report
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                  IMS Production
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-550 dark:text-slate-400 mt-0.5 truncate">
                Track consumed raw materials, finished goods dispatches, and RM-to-FG production usage.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0 ml-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 bg-gray-50/50 dark:bg-slate-955/40">
          
          {/* Top Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider truncate">
                  Total Outward Qty
                </span>
                <TrendingDown size={16} className="text-rose-500 shrink-0 sm:w-[18px] sm:h-[18px]" />
              </div>
              <span className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white block truncate">
                {totalConsumedQty.toLocaleString()}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">
                {filteredRecords.length} transaction{filteredRecords.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider truncate">
                  Raw Material (RM)
                </span>
                <Box size={16} className="text-blue-500 shrink-0 sm:w-[18px] sm:h-[18px]" />
              </div>
              <span className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 block truncate">
                {rmBreakdown.qty.toLocaleString()}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">
                {rmBreakdown.distinctNames} distinct items
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider truncate">
                  Finished Goods (FG)
                </span>
                <PackageCheck size={16} className="text-purple-500 shrink-0 sm:w-[18px] sm:h-[18px]" />
              </div>
              <span className="text-lg sm:text-2xl font-black text-purple-600 dark:text-purple-400 block truncate">
                {fgBreakdown.qty.toLocaleString()}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">
                {fgBreakdown.distinctNames} distinct dispatches
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider truncate">
                  RM ➔ FG Production
                </span>
                <Activity size={16} className="text-amber-500 shrink-0 sm:w-[18px] sm:h-[18px]" />
              </div>
              <span className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 block truncate">
                {rmToFgAnalysis.length}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 block mt-0.5 truncate">
                Active FG mappings
              </span>
            </div>
          </div>

          {/* Tab Selection & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("ledger")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === "ledger"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50"
                }`}
              >
                <Layers size={14} />
                <span>Consumption Ledger ({filteredRecords.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("rm_to_fg")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === "rm_to_fg"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50"
                }`}
              >
                <Box size={14} />
                <span>RM ➔ FG Usage ({filteredRmToFg.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 hover:border-amber-500 hover:text-amber-600 cursor-pointer shadow-2xs transition-all w-full sm:w-auto"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Search & Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 shadow-xs">
            
            {/* Top Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-2.5">
              
              {/* Search Bar */}
              <div className="relative sm:col-span-2 lg:col-span-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search item, SKU, FG, destination, user..."
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              {/* 1. Material Type Filter */}
              <div className="sm:col-span-1 lg:col-span-2">
                <select
                  value={materialTypeFilter}
                  onChange={(e) => {
                    setMaterialTypeFilter(e.target.value);
                    setProductFilter("");
                  }}
                  className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-xs font-semibold text-gray-900 dark:text-white cursor-pointer"
                >
                  {uniqueMaterialTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Consumed Item / Product Filter */}
              <div className="sm:col-span-1 lg:col-span-2">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-xs text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">All Products</option>
                  {uniqueProducts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Target Finished Good Filter */}
              <div className="sm:col-span-1 lg:col-span-2">
                <select
                  value={fgFilter}
                  onChange={(e) => setFgFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-xs text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">All Finished Goods</option>
                  {uniqueTargetFGs.map((fg) => (
                    <option key={fg} value={fg}>
                      {fg}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Destination / Party Filter */}
              <div className="sm:col-span-1 lg:col-span-2">
                <select
                  value={destFilter}
                  onChange={(e) => setDestFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-xs text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">All Destinations</option>
                  {uniqueDestinations.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom Row: Firm & Date Range */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-800/60">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                
                {/* 5. Firm Filter */}
                <select
                  value={firmFilter}
                  onChange={(e) => setFirmFilter(e.target.value)}
                  className="px-2.5 py-1 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-xs text-gray-900 dark:text-white cursor-pointer min-w-[120px]"
                >
                  <option value="">All Firms</option>
                  {uniqueFirms.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                {/* Date Range */}
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-transparent text-[11px] sm:text-xs text-gray-900 dark:text-white outline-hidden cursor-pointer"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-transparent text-[11px] sm:text-xs text-gray-900 dark:text-white outline-hidden cursor-pointer"
                  />
                </div>
              </div>

              {(search || materialTypeFilter || productFilter || fgFilter || destFilter || firmFilter || fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setMaterialTypeFilter("");
                    setProductFilter("");
                    setFgFilter("");
                    setDestFilter("");
                    setFirmFilter("");
                    setFromDate("");
                    setToDate("");
                  }}
                  className="px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg hover:bg-amber-100 cursor-pointer self-end sm:self-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: CONSUMPTION LEDGER */}
          {activeTab === "ledger" && (
            <div className="space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <Flame size={28} className="mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    No consumption or outward records found.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try adjusting your search or filter options above.
                  </p>
                </div>
              ) : (
                <>
                  {/* MOBILE CARD VIEW (block md:hidden) */}
                  <div className="block md:hidden space-y-2.5">
                    {filteredRecords.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2.5"
                      >
                        {/* Header: Date + Item + Badge + Qty */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-medium text-gray-450 block">
                              {r.date}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                {r.materialName}
                              </span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                                  r.materialType === "FG"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                                }`}
                              >
                                {r.materialType || "RM"}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-450 block mt-0.5">
                              {r.materialSku}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                              -{r.qty.toLocaleString()} {r.unit}
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-gray-100 dark:border-slate-800/80">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">
                              Target Finished Good
                            </span>
                            {r.isUsedForFg && r.usedForFgName ? (
                              <span className="font-semibold text-gray-900 dark:text-white block truncate">
                                {r.usedForFgName}
                              </span>
                            ) : r.materialType === "FG" ? (
                              <span className="text-purple-600 font-medium">FG Dispatch</span>
                            ) : (
                              <span className="text-gray-400 italic">Direct Issue</span>
                            )}
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">
                              Destination / Party
                            </span>
                            {r.destination ? (
                              <span className="flex items-center gap-1 font-medium text-gray-800 dark:text-slate-200 truncate">
                                <MapPin size={11} className="text-amber-500 shrink-0" />
                                <span className="truncate">{r.destination}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">
                              Ref / Job Card
                            </span>
                            <span className="font-mono font-medium text-gray-700 dark:text-slate-300 truncate block">
                              {r.ref || "—"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block">
                              Firm / Posted By
                            </span>
                            <span className="text-gray-700 dark:text-slate-300 truncate block">
                              {r.firm || r.user || "—"}
                            </span>
                          </div>
                        </div>

                        {r.remarks && (
                          <div className="text-[10px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-950 p-2 rounded-lg truncate">
                            <span className="font-bold text-gray-600 dark:text-slate-300">Note: </span>
                            {r.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP & TABLET TABLE VIEW (hidden md:block) */}
                  <div className="hidden md:block bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                            <th className="px-4 py-3.5">Date</th>
                            <th className="px-4 py-3.5">Material / Item</th>
                            <th className="px-4 py-3.5">SKU Code</th>
                            <th className="px-4 py-3.5 text-right">Outward Qty</th>
                            <th className="px-4 py-3.5">Target Finished Good</th>
                            <th className="px-4 py-3.5">Destination / Party</th>
                            <th className="px-4 py-3.5">Ref / Job Card</th>
                            <th className="px-4 py-3.5">Firm</th>
                            <th className="px-4 py-3.5">Done By</th>
                            <th className="px-4 py-3.5">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-gray-700 dark:text-slate-300">
                          {filteredRecords.map((r) => (
                            <tr
                              key={r.id}
                              className="hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-colors"
                            >
                              <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-gray-900 dark:text-white">
                                {r.date}
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>{r.materialName}</span>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      r.materialType === "FG"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                                    }`}
                                  >
                                    {r.materialType || "RM"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-600 dark:text-slate-400">
                                {r.materialSku}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                -{r.qty.toLocaleString()} {r.unit}
                              </td>
                              
                              <td className="px-4 py-3 whitespace-nowrap">
                                {r.isUsedForFg && r.usedForFgName ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {r.usedForFgName}
                                    </span>
                                    {r.usedForFgSku && (
                                      <span className="font-mono text-[10px] text-gray-400">
                                        ({r.usedForFgSku})
                                      </span>
                                    )}
                                  </div>
                                ) : r.materialType === "FG" ? (
                                  <span className="text-purple-650 dark:text-purple-400 font-medium">
                                    FG Dispatch
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">Direct Issue</span>
                                )}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                {r.destination ? (
                                  <div className="flex items-center gap-1 text-gray-800 dark:text-slate-200">
                                    <MapPin size={13} className="text-amber-500 shrink-0" />
                                    <span>{r.destination}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3 font-mono font-semibold text-gray-800 dark:text-slate-300 whitespace-nowrap">
                                {r.ref || "—"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700 dark:text-slate-300">
                                {r.firm || "—"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-400">
                                {r.user || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-500 dark:text-slate-400 max-w-[180px] truncate" title={r.remarks}>
                                {r.remarks || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: RM TO FG USAGE ANALYSIS MATRIX */}
          {activeTab === "rm_to_fg" && (
            <div className="space-y-3.5 sm:space-y-4">
              {filteredRmToFg.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <Box size={28} className="mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                    No Raw Material to Finished Good consumption records found.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    This analysis automatically populates when Job Cards consume Raw Materials to produce Finished Goods.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:gap-4">
                  {filteredRmToFg.map((fg, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-3.5 hover:border-amber-400/60 transition-all"
                    >
                      {/* FG Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5 pb-2.5 sm:pb-3 border-b border-gray-150 dark:border-slate-800">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black text-[11px] sm:text-xs shrink-0">
                            FG
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                                {fg.fgName}
                              </h4>
                              {fg.fgSku && fg.fgSku !== "—" && (
                                <span className="font-mono text-[10px] sm:text-xs text-gray-400 shrink-0">
                                  ({fg.fgSku})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                              <span>Last Production: <strong className="text-gray-700 dark:text-slate-300">{fg.lastDate || "—"}</strong></span>
                              {fg.firms.size > 0 && (
                                <span>Firms: <strong className="text-gray-700 dark:text-slate-300">{Array.from(fg.firms).join(", ")}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center sm:text-right">
                          <div className="px-2.5 sm:px-3 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-left sm:text-right w-full sm:w-auto">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                              Total RM Consumed
                            </span>
                            <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                              {fg.totalRMQty.toLocaleString()} units
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Consumed Raw Materials Grid for this FG */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider">
                          <span>Raw Materials Used ({fg.rawMaterialsList.length}):</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                          {fg.rawMaterialsList.map((rm, rmIdx) => (
                            <div
                              key={rmIdx}
                              className="p-2.5 sm:p-3 bg-gray-50 dark:bg-slate-955/60 border border-gray-200/80 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-2"
                            >
                              <div className="truncate min-w-0">
                                <span className="font-bold text-gray-900 dark:text-white text-xs block truncate" title={rm.name}>
                                  {rm.name}
                                </span>
                                <span className="font-mono text-[10px] text-gray-400 block truncate">
                                  {rm.sku || "—"}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-rose-600 dark:text-rose-400 text-xs block">
                                  {rm.qty.toLocaleString()} {rm.unit}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 block">
                                  {rm.entriesCount} issue{rm.entriesCount > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-150 dark:border-slate-800 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-white dark:bg-slate-900">
          <span className="text-[11px] sm:text-xs text-gray-400 font-medium text-center sm:text-left">
            Showing {filteredRecords.length} records ({totalConsumedQty.toLocaleString()} total units outward)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-gray-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

