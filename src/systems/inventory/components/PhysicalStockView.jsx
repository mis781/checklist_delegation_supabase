import { useState, useMemo, useEffect, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CheckCircle2,
  History,
  Search,
  Loader2,
  Check,
  X,
  FileSpreadsheet,
  Plus,
  Filter,
  Edit3,
  Send,
  FileText,
  Layers,
  ChevronDown,
  ChevronRight,
  Boxes,
} from "lucide-react";
import Papa from "papaparse";
import {
  reviewPhysicalStock,
  bulkReviewPhysicalStock,
  submitPhysicalStockCount,
} from "../../../redux/slice/inventorySlice";
import { useMagicToast } from "../../../context/MagicToastContext";
import PhysicalStockModal, {
  extractDraftId,
  cleanRemarkText,
} from "./PhysicalStockModal";

export default function PhysicalStockView({ activeUser }) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();

  const {
    materials = [],
    physicalStocks = [],
    divisions = [],
    materialTypes = [],
    masterMaterials = [],
  } = useSelector((state) => state.inventory);

  const masterMaterialMap = useMemo(() => {
    const map = {};
    (masterMaterials || []).forEach((m) => {
      if (m.id) map[m.id] = m;
    });
    return map;
  }, [masterMaterials]);

  const masterMaterialBySkuMap = useMemo(() => {
    const map = {};
    (masterMaterials || []).forEach((m) => {
      if (m.sku) map[m.sku] = m;
    });
    return map;
  }, [masterMaterials]);

  const materialsBySkuMap = useMemo(() => {
    const map = {};
    (materials || []).forEach((m) => {
      if (m.sku) map[m.sku] = m;
    });
    return map;
  }, [materials]);

  // Only show Raw Material and Finished Goods
  const filteredMaterialTypes = useMemo(() => {
    const allowed = ["RM", "FG"];
    const found = (materialTypes || []).filter((mt) =>
      allowed.includes((mt.type_code || mt.typeCode || "").toUpperCase()),
    );
    if (found.length > 0) {
      return found.map((mt) => ({
        code: (mt.type_code || mt.typeCode).toUpperCase(),
        name: mt.type_name || mt.typeName,
      }));
    }
    return [
      { code: "RM", name: "Raw Material" },
      { code: "FG", name: "Finished Goods" },
    ];
  }, [materialTypes]);

  const [activeTab, setActiveTab] = useState("review"); // 'review' | 'history'
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalPrefill, setRecordModalPrefill] = useState(null);
  const [editDraftId, setEditDraftId] = useState(null);

  // Review section states
  const [reviewFilterStatus, setReviewFilterStatus] = useState("Pending"); // 'Pending' | 'Drafts' | 'Approved' | 'Rejected' | 'All'
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewDivisionFilter, setReviewDivisionFilter] = useState("");
  const [reviewTypeFilter, setReviewTypeFilter] = useState("ALL");
  const [reviewSortKey, setReviewSortKey] = useState("countedDate");
  const [reviewSortDir, setReviewSortDir] = useState(-1); // -1 = desc, 1 = asc
  const [reviewPage, setReviewPage] = useState(1);
  const reviewPageSize = 10;
  const [reviewRemarksMap, setReviewRemarksMap] = useState({});
  const [isReviewProcessing, setIsReviewProcessing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  // Multi-select state
  const [selectedReviewIds, setSelectedReviewIds] = useState(new Set());
  const [bulkRemarks, setBulkRemarks] = useState("");

  // Expanded draft groups for accordion UI
  const [expandedDraftIds, setExpandedDraftIds] = useState(new Set());

  const toggleDraftExpand = (draftId) => {
    setExpandedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) {
        next.delete(draftId);
      } else {
        next.add(draftId);
      }
      return next;
    });
  };

  // Pending items grouped by draft ID for 1-click draft approval
  const draftPendingItems = useMemo(() => {
    const map = {};
    (physicalStocks || []).forEach((p) => {
      if ((p.status || "").toLowerCase() === "pending") {
        const dId = extractDraftId(p);
        if (dId) {
          if (!map[dId]) map[dId] = [];
          map[dId].push(p);
        }
      }
    });
    return map;
  }, [physicalStocks]);

  // Reset multi-selection when filters, page, or tab change
  useEffect(() => {
    setSelectedReviewIds(new Set());
  }, [
    reviewFilterStatus,
    reviewSearch,
    reviewDivisionFilter,
    reviewTypeFilter,
    reviewPage,
    activeTab,
  ]);

  const requestReviewSort = (key) => {
    if (reviewSortKey === key) {
      setReviewSortDir((prev) => -prev);
    } else {
      setReviewSortKey(key);
      setReviewSortDir(1);
    }
    setReviewPage(1);
  };

  // History section states
  const [historySearch, setHistorySearch] = useState("");
  const [historyDivisionFilter, setHistoryDivisionFilter] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [historySortKey, setHistorySortKey] = useState("countedDate");
  const [historySortDir, setHistorySortDir] = useState(-1); // -1 = desc, 1 = asc
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  // Stats (drafts and pending counts used in tabs & filters)
  const stats = useMemo(() => {
    const drafts = physicalStocks.filter(
      (p) => (p.status || "").toLowerCase() === "draft",
    ).length;
    const pending = physicalStocks.filter(
      (p) => (p.status || "").toLowerCase() === "pending",
    ).length;
    const approved = physicalStocks.filter(
      (p) => (p.status || "").toLowerCase() === "approved",
    ).length;
    const rejected = physicalStocks.filter(
      (p) => (p.status || "").toLowerCase() === "rejected",
    ).length;
    return { drafts, pending, approved, rejected };
  }, [physicalStocks]);

  // Filtered review records
  const filteredReviewRecords = useMemo(() => {
    return (physicalStocks || []).filter((p) => {
      const pStatus = (p.status || "").toLowerCase();
      let matchStatus = true;
      if (reviewFilterStatus === "Drafts") {
        matchStatus = pStatus === "draft";
      } else if (reviewFilterStatus !== "All") {
        matchStatus = pStatus === reviewFilterStatus.toLowerCase();
      }

      const q = reviewSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.countedBy || "").toLowerCase().includes(q);

      const matchDiv =
        !reviewDivisionFilter ||
        reviewDivisionFilter === "ALL" ||
        p.division === reviewDivisionFilter;

      const pType = (
        p.materialType ||
        p.material_type ||
        (p.masterMaterialId &&
          masterMaterialMap[p.masterMaterialId]?.materialType) ||
        (p.masterMaterialId &&
          masterMaterialMap[p.masterMaterialId]?.material_type) ||
        "RM"
      ).toUpperCase();

      const matchType =
        reviewTypeFilter === "ALL" || pType === reviewTypeFilter.toUpperCase();

      return matchStatus && matchSearch && matchDiv && matchType;
    });
  }, [
    physicalStocks,
    reviewFilterStatus,
    reviewSearch,
    reviewDivisionFilter,
    reviewTypeFilter,
    masterMaterialMap,
  ]);

  // Sorted & Paginated Review Records
  const sortedReviewRecords = useMemo(() => {
    const records = filteredReviewRecords.slice();
    return records.sort((a, b) => {
      let va = a[reviewSortKey],
        vb = b[reviewSortKey];
      if (reviewSortKey === "category") {
        const getCat = (rec) => {
          const mType = (
            rec.materialType ||
            rec.material_type ||
            masterMaterialMap[rec.masterMaterialId]?.materialType ||
            "RM"
          ).toUpperCase();
          return (
            materialsBySkuMap[rec.sku]?.category ||
            (rec.masterMaterialId &&
              masterMaterialMap[rec.masterMaterialId]?.category) ||
            masterMaterialBySkuMap[rec.sku]?.category ||
            rec.category ||
            (mType === "FG" ? "Finished Goods" : "Raw Material")
          ).toLowerCase();
        };
        va = getCat(a);
        vb = getCat(b);
      } else if (
        reviewSortKey === "countedDate" ||
        reviewSortKey === "reviewedAt" ||
        reviewSortKey === "createdAt"
      ) {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      } else if (typeof va === "string") {
        va = va.toLowerCase();
        vb = (vb || "").toLowerCase();
      }
      if (va < vb) return -1 * reviewSortDir;
      if (va > vb) return 1 * reviewSortDir;
      return 0;
    });
  }, [
    filteredReviewRecords,
    reviewSortKey,
    reviewSortDir,
    materialsBySkuMap,
    masterMaterialMap,
    masterMaterialBySkuMap,
  ]);

  // Group records by draftId for accordion display
  const groupedReviewItems = useMemo(() => {
    const result = [];
    const seenDraftIds = new Set();
    const draftGroupsMap = {};

    for (const record of sortedReviewRecords) {
      const dId = extractDraftId(record);
      if (dId) {
        if (!draftGroupsMap[dId]) draftGroupsMap[dId] = [];
        draftGroupsMap[dId].push(record);
      }
    }

    for (const record of sortedReviewRecords) {
      const dId = extractDraftId(record);
      if (dId) {
        if (!seenDraftIds.has(dId)) {
          seenDraftIds.add(dId);
          result.push({ type: "group", draftId: dId, items: draftGroupsMap[dId] });
        }
      } else {
        result.push({ type: "single", record });
      }
    }

    return result;
  }, [sortedReviewRecords]);

  const paginatedGroupedItems = useMemo(() => {
    const start = (reviewPage - 1) * reviewPageSize;
    return groupedReviewItems.slice(start, start + reviewPageSize);
  }, [groupedReviewItems, reviewPage, reviewPageSize]);

  // Selectable pending records on current page (extracted from grouped items)
  const selectablePageRecords = useMemo(() => {
    const records = [];
    paginatedGroupedItems.forEach((item) => {
      if (item.type === "group") {
        item.items.forEach((r) => {
          if ((r.status || "").toLowerCase() === "pending") records.push(r);
        });
      } else if ((item.record.status || "").toLowerCase() === "pending") {
        records.push(item.record);
      }
    });
    return records;
  }, [paginatedGroupedItems]);

  const isAllPageSelected =
    selectablePageRecords.length > 0 &&
    selectablePageRecords.every((r) => selectedReviewIds.has(r.id));

  const isSomePageSelected =
    selectablePageRecords.some((r) => selectedReviewIds.has(r.id)) &&
    !isAllPageSelected;

  const handleToggleSelectRow = (id) => {
    setSelectedReviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedReviewIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        selectablePageRecords.forEach((r) => next.delete(r.id));
      } else {
        selectablePageRecords.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const totalReviewPages = Math.max(
    1,
    Math.ceil(groupedReviewItems.length / reviewPageSize),
  );

  // Filtered history records
  const filteredHistoryRecords = useMemo(() => {
    const records = (physicalStocks || []).filter((p) => {
      const q = historySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.countedBy || "").toLowerCase().includes(q) ||
        (p.reviewedBy || "").toLowerCase().includes(q);

      const matchDiv =
        !historyDivisionFilter ||
        historyDivisionFilter === "ALL" ||
        p.division === historyDivisionFilter;

      const matchStatus =
        historyStatusFilter === "ALL" ||
        (p.status || "").toLowerCase() === historyStatusFilter.toLowerCase();

      const pType = (
        p.materialType ||
        p.material_type ||
        (p.masterMaterialId &&
          masterMaterialMap[p.masterMaterialId]?.materialType) ||
        (p.masterMaterialId &&
          masterMaterialMap[p.masterMaterialId]?.material_type) ||
        "RM"
      ).toUpperCase();

      const matchType =
        historyTypeFilter === "ALL" ||
        pType === historyTypeFilter.toUpperCase();

      return matchSearch && matchDiv && matchStatus && matchType;
    });

    // Sort
    return records.sort((a, b) => {
      let va = a[historySortKey],
        vb = b[historySortKey];
      if (
        historySortKey === "countedDate" ||
        historySortKey === "reviewedAt" ||
        historySortKey === "createdAt"
      ) {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      } else if (typeof va === "string") {
        va = va.toLowerCase();
        vb = (vb || "").toLowerCase();
      }
      if (va < vb) return -1 * historySortDir;
      if (va > vb) return 1 * historySortDir;
      return 0;
    });
  }, [
    physicalStocks,
    historySearch,
    historyDivisionFilter,
    historyStatusFilter,
    historyTypeFilter,
    historySortKey,
    historySortDir,
    masterMaterialMap,
  ]);

  // Paginated History Records
  const paginatedHistoryRecords = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistoryRecords.slice(start, start + historyPageSize);
  }, [filteredHistoryRecords, historyPage, historyPageSize]);

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(filteredHistoryRecords.length / historyPageSize),
  );

  // Review approval / rejection action handler
  const handleReviewAction = async (recordId, status) => {
    const reviewRemarks = reviewRemarksMap[recordId] || "";
    const shouldAdjustStock = status === "Approved";

    setIsReviewProcessing(true);
    setReviewingId(recordId);

    try {
      await dispatch(
        reviewPhysicalStock({
          id: recordId,
          status,
          reviewRemarks,
          shouldAdjustStock,
          currentUser: activeUser?.name || "Admin",
        }),
      ).unwrap();

      showToast(
        `Physical stock count #${recordId} ${status.toLowerCase()} successfully!${
          status === "Approved" ? " Official inventory stock updated." : ""
        }`,
        "success",
      );
      setSelectedReviewIds((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    } catch (err) {
      console.error("Review action failed:", err);
      showToast(`Review action failed: ${err.message || err}`, "error");
    } finally {
      setIsReviewProcessing(false);
      setReviewingId(null);
    }
  };

  // Bulk review action handler (supports customIds for approving whole draft batches)
  const handleBulkReviewAction = async (status, customIds = null) => {
    const idsToReview = customIds || Array.from(selectedReviewIds);
    if (idsToReview.length === 0) return;

    const shouldAdjustStock = status === "Approved";

    setIsReviewProcessing(true);
    try {
      const items = idsToReview.map((id) => ({
        id,
        status,
        reviewRemarks: reviewRemarksMap[id] || bulkRemarks || "",
        shouldAdjustStock,
      }));

      await dispatch(
        bulkReviewPhysicalStock({
          items,
          currentUser: activeUser?.name || "Admin",
        }),
      ).unwrap();

      showToast(
        `${idsToReview.length} physical stock count${
          idsToReview.length === 1 ? "" : "s"
        } ${status.toLowerCase()} successfully!${
          status === "Approved" ? " Official inventory stock updated." : ""
        }`,
        "success",
      );

      setSelectedReviewIds((prev) => {
        const next = new Set(prev);
        idsToReview.forEach((id) => next.delete(id));
        return next;
      });
      if (!customIds) {
        setBulkRemarks("");
      }
    } catch (err) {
      console.error("Bulk review action failed:", err);
      showToast(`Bulk review failed: ${err.message || err}`, "error");
    } finally {
      setIsReviewProcessing(false);
    }
  };

  // Submit draft handler (moves all items of that draft from Draft to Pending)
  const handleSubmitDraft = async (dId) => {
    const draftItems = (physicalStocks || []).filter(
      (p) =>
        (p.status || "").toLowerCase() === "draft" &&
        (extractDraftId(p) === dId || (!extractDraftId(p) && String(p.id) === String(dId))),
    );
    if (draftItems.length === 0) return;

    setIsReviewProcessing(true);
    try {
      const payload = draftItems.map((p) => ({
        ...p,
        status: "Pending",
      }));
      await dispatch(
        submitPhysicalStockCount({
          physicalData: payload,
          currentUser: activeUser?.name || "Admin",
        }),
      ).unwrap();
      showToast(
        `Draft #${dId} (${draftItems.length} items) submitted for Admin approval!`,
        "success",
      );
    } catch (err) {
      console.error("Submit draft failed:", err);
      showToast(`Submit draft failed: ${err.message || err}`, "error");
    } finally {
      setIsReviewProcessing(false);
    }
  };

  // Approve entire draft handler (approves all items in that draft)
  const handleApproveDraft = async (dId) => {
    const draftItems = draftPendingItems[dId] || [];
    if (draftItems.length === 0) return;
    await handleBulkReviewAction("Approved", draftItems.map((i) => i.id));
  };

  // Export History CSV
  const handleExportHistoryCSV = () => {
    const exportData = filteredHistoryRecords.map((r) => {
      const matType = (
        r.materialType ||
        r.material_type ||
        (r.masterMaterialId &&
          masterMaterialMap[r.masterMaterialId]?.materialType) ||
        (r.masterMaterialId &&
          masterMaterialMap[r.masterMaterialId]?.material_type) ||
        "RM"
      ).toUpperCase();
      const itemCategory =
        materialsBySkuMap[r.sku]?.category ||
        (r.masterMaterialId &&
          masterMaterialMap[r.masterMaterialId]?.category) ||
        masterMaterialBySkuMap[r.sku]?.category ||
        r.category ||
        (matType === "FG" ? "Finished Goods" : "Raw Material");

      return {
        "COUNT ID": r.id,
        DATE: r.countedDate ? new Date(r.countedDate).toLocaleString() : "",
        SKU: r.sku,
        "SUB-CATEGORY(MATERIAL NAME)": r.name,
        CATEGORY: itemCategory,
        FIRM: r.division || "",
        LOCATION: r.location || "",
        UNIT: r.unit || "",
        "CURRENT STOCK QTY": r.systemStock ?? 0,
        "PHYSICAL STOCK QTY": r.physicalQty ?? 0,
        DIFFERENCE: r.differenceQty ?? 0,
        "COUNTED BY": r.countedBy || "",
        STATUS: r.status || "Pending",
        "REVIEWED BY": r.reviewedBy || "",
        "REVIEWED DATE": r.reviewedAt
          ? new Date(r.reviewedAt).toLocaleString()
          : "",
        REMARK: r.reviewRemarks || r.remarks || "",
        "Stock Adjusted": r.isStockAdjusted ? "Yes" : "No",
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Physical_Stock_Variance_Audit_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requestHistorySort = (key) => {
    if (historySortKey === key) {
      setHistorySortDir((prev) => -prev);
    } else {
      setHistorySortKey(key);
      setHistorySortDir(1);
    }
    setHistoryPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Main Tabs Navigation Bar & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("review")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "review"
                ? "bg-teal-600 text-white shadow-md shadow-teal-500/20 active:scale-95"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            <CheckCircle2 size={16} />
            <span>Variance Review &amp; Approval</span>
            {stats.pending > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-400 text-gray-900 rounded-full">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-teal-600 text-white shadow-md shadow-teal-500/20 active:scale-95"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            <History size={16} />
            <span>Count History &amp; Audit Trail</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportHistoryCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setRecordModalPrefill(null);
              setIsRecordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Record Physical Count</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: VARIANCE REVIEW & APPROVAL */}
      {activeTab === "review" && (
        <div className="space-y-4">
          {/* Sub-toolbar: Status filter, Search, Firm filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-600 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={14} /> Filter Status:
              </span>
              {["Pending", "Drafts", "Approved", "Rejected", "All"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setReviewFilterStatus(st);
                    setReviewPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    reviewFilterStatus === st
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{st}</span>
                  {st === "Pending" && stats.pending > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-gray-900 font-bold">
                      {stats.pending}
                    </span>
                  )}
                  {st === "Drafts" && stats.drafts > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                      {stats.drafts}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-1 max-w-2xl justify-end">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  size={14}
                  className="absolute left-3 top-2.5 text-gray-400"
                />
                <input
                  type="text"
                  value={reviewSearch}
                  onChange={(e) => {
                    setReviewSearch(e.target.value);
                    setReviewPage(1);
                  }}
                  placeholder="Search SKU, material, or counter..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={reviewDivisionFilter}
                onChange={(e) => {
                  setReviewDivisionFilter(e.target.value);
                  setReviewPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="">All Firms</option>
                {divisions.map((d) => (
                  <option key={d.name || d} value={d.name || d}>
                    {d.name || d}
                  </option>
                ))}
              </select>

              <select
                value={reviewTypeFilter}
                onChange={(e) => {
                  setReviewTypeFilter(e.target.value);
                  setReviewPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {filteredMaterialTypes.map((mt) => (
                  <option key={mt.code} value={mt.code}>
                    {mt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Action Bar (Visible when rows selected) */}
          {selectedReviewIds.size > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-teal-500/10 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 p-3.5 rounded-2xl shadow-xs transition-all">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-2xs">
                  {selectedReviewIds.size} Selected
                </span>
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Ready for batch review
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedReviewIds(new Set())}
                  className="text-xs text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer ml-1"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                <input
                  type="text"
                  value={bulkRemarks}
                  onChange={(e) => setBulkRemarks(e.target.value)}
                  placeholder="Bulk reviewer remarks (optional)..."
                  className="px-3 py-1.5 text-xs border border-teal-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-w-[200px]"
                />
                <button
                  type="button"
                  disabled={isReviewProcessing}
                  onClick={() => handleBulkReviewAction("Approved")}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="Approve and submit all selected counts"
                >
                  {isReviewProcessing ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Approve Selected ({selectedReviewIds.size})</span>
                </button>
                <button
                  type="button"
                  disabled={isReviewProcessing}
                  onClick={() => handleBulkReviewAction("Rejected")}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="Reject all selected counts"
                >
                  {isReviewProcessing ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <X size={14} />
                  )}
                  <span>Reject Selected ({selectedReviewIds.size})</span>
                </button>
              </div>
            </div>
          )}

          {/* Review Table */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 dark:bg-slate-950 text-gray-600 dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-800 select-none">
                  <tr>
                    <th className="w-10 px-3 py-3.5 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomePageSelected;
                        }}
                        onChange={handleToggleSelectAll}
                        title={
                          isAllPageSelected
                            ? "Deselect all pending on page"
                            : "Select all pending on page"
                        }
                        className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer align-middle"
                      />
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600 whitespace-nowrap"
                      onClick={() => requestReviewSort("countedDate")}
                    >
                      DATE
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600 whitespace-nowrap"
                      onClick={() => requestReviewSort("sku")}
                    >
                      SKU
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600 whitespace-nowrap"
                      onClick={() => requestReviewSort("name")}
                    >
                      SUB-CATEGORY (MATERIAL NAME)
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600 whitespace-nowrap"
                      onClick={() => requestReviewSort("category")}
                    >
                      CATEGORY
                    </th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600 whitespace-nowrap"
                      onClick={() => requestReviewSort("systemStock")}
                    >
                      CURRENT STOCK QTY
                    </th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600 whitespace-nowrap"
                      onClick={() => requestReviewSort("physicalQty")}
                    >
                      PHYSICAL STOCK QTY
                    </th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600 whitespace-nowrap"
                      onClick={() => requestReviewSort("differenceQty")}
                    >
                      DIFFERENCE
                    </th>
                    <th className="px-4 py-3.5 min-w-[220px] whitespace-nowrap">
                      REMARK
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {paginatedGroupedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-16 text-gray-400"
                      >
                        <CheckCircle2
                          size={40}
                          className="mx-auto text-teal-500 mb-2 opacity-80"
                        />
                        <div className="font-bold text-gray-800 dark:text-slate-200">
                          No Physical Stock Records Found
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          There are no physical count records matching the
                          status filter "{reviewFilterStatus}".
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedGroupedItems.map((displayItem) => {
                      /* ── DRAFT GROUP (Expandable like TransactionsView) ── */
                      if (displayItem.type === "group") {
                        const { draftId, items } = displayItem;
                        const isExpanded = expandedDraftIds.has(draftId);
                        const groupStatus = (items[0]?.status || "").toLowerCase();
                        const isDraftGroup = groupStatus === "draft";
                        const isPendingGroup = groupStatus === "pending";
                        const isApprovedGroup = groupStatus === "approved";
                        const isRejectedGroup = groupStatus === "rejected";
                        const firstDate = items[0]?.countedDate;
                        const groupRemarksText = cleanRemarkText(items[0]?.remarks || "");
                        const allPendingInGroup = items.filter(
                          (r) => (r.status || "").toLowerCase() === "pending",
                        );
                        const allGroupSelected =
                          allPendingInGroup.length > 0 &&
                          allPendingInGroup.every((r) => selectedReviewIds.has(r.id));
                        const someGroupSelected =
                          allPendingInGroup.some((r) => selectedReviewIds.has(r.id)) &&
                          !allGroupSelected;

                        const totalSys = items.reduce(
                          (sum, r) => sum + Number(r.systemStock || 0),
                          0,
                        );
                        const totalPhy = items.reduce(
                          (sum, r) => sum + Number(r.physicalQty || 0),
                          0,
                        );
                        const totalDiff = items.reduce(
                          (sum, r) => sum + Number(r.differenceQty || 0),
                          0,
                        );
                        const commonUnit = items[0]?.unit || "";

                        return (
                          <Fragment key={`group-${draftId}`}>
                            {/* ── Main Group Summary Row (9 cols aligned with table header) ── */}
                            <tr
                              className={`transition-colors select-none ${
                                isDraftGroup
                                  ? "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30"
                                  : isPendingGroup
                                  ? "bg-teal-50/30 dark:bg-teal-950/15 hover:bg-teal-50/60 dark:hover:bg-teal-950/25"
                                  : isExpanded
                                  ? "bg-slate-50/80 dark:bg-slate-800/40 font-semibold"
                                  : "hover:bg-gray-50/70 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              {/* 1. Checkbox */}
                              <td
                                className="w-10 px-3 py-3.5 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isPendingGroup ? (
                                  <input
                                    type="checkbox"
                                    checked={allGroupSelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = someGroupSelected;
                                    }}
                                    onChange={() => {
                                      setSelectedReviewIds((prev) => {
                                        const next = new Set(prev);
                                        if (allGroupSelected) {
                                          allPendingInGroup.forEach((r) => next.delete(r.id));
                                        } else {
                                          allPendingInGroup.forEach((r) => next.add(r.id));
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer align-middle"
                                  />
                                ) : isDraftGroup ? (
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"
                                    title="Draft batch"
                                  />
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-700 select-none">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* 2. DATE */}
                              <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 font-mono text-xs">
                                {firstDate ? new Date(firstDate).toLocaleDateString() : "—"}
                              </td>

                              {/* 3. SKU / Draft ID with Expand Toggle */}
                              <td className="px-4 py-3.5 font-mono font-bold whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleDraftExpand(draftId)}
                                    className="p-1 rounded-lg text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={isExpanded ? "Collapse Draft Items" : "Expand Draft Items"}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown size={16} className="text-teal-600 dark:text-teal-400" />
                                    ) : (
                                      <ChevronRight size={16} />
                                    )}
                                  </button>
                                  <span className="text-teal-700 dark:text-teal-300">
                                    #{draftId}
                                  </span>
                                </div>
                              </td>

                              {/* 4. SUB-CATEGORY (MATERIAL NAME) */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => toggleDraftExpand(draftId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/70 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 cursor-pointer transition-colors"
                                >
                                  <Boxes size={13} className="text-teal-600 dark:text-teal-400" />
                                  <span>{items.length} Materials Breakdown</span>
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                              </td>

                              {/* 5. CATEGORY */}
                              <td className="px-4 py-3.5 whitespace-nowrap text-gray-700 dark:text-slate-300 font-medium">
                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                  Draft Batch
                                </span>
                              </td>

                              {/* 6. CURRENT STOCK QTY */}
                              <td className="px-4 py-3.5 text-right font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                                {totalSys.toLocaleString()} {commonUnit}
                              </td>

                              {/* 7. PHYSICAL STOCK QTY */}
                              <td className="px-4 py-3.5 text-right font-black text-teal-600 dark:text-teal-400 whitespace-nowrap">
                                {totalPhy.toLocaleString()} {commonUnit}
                              </td>

                              {/* 8. DIFFERENCE */}
                              <td className="px-4 py-3.5 text-right font-black whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                    totalDiff > 0
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                      : totalDiff < 0
                                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                      : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {totalDiff > 0 ? `+${totalDiff.toLocaleString()}` : totalDiff.toLocaleString()}{" "}
                                  {commonUnit}
                                </span>
                              </td>

                              {/* 9. REMARK / ACTIONS */}
                              <td className="px-4 py-3.5">
                                {isDraftGroup ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditDraftId(draftId);
                                        setIsRecordModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                      title="Resume filling more items in this draft"
                                    >
                                      <Edit3 size={12} />
                                      <span>Resume</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isReviewProcessing}
                                      onClick={() => handleSubmitDraft(draftId)}
                                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                                      title="Submit this draft for Admin approval"
                                    >
                                      <Send size={12} />
                                      <span>Submit</span>
                                    </button>
                                    {groupRemarksText && (
                                      <span
                                        className="text-[11px] text-gray-400 italic max-w-[150px] truncate"
                                        title={groupRemarksText}
                                      >
                                        &ldquo;{groupRemarksText}&rdquo;
                                      </span>
                                    )}
                                  </div>
                                ) : isPendingGroup ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      disabled={isReviewProcessing}
                                      onClick={() => handleApproveDraft(draftId)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                                      title="Approve all items in this draft automatically"
                                    >
                                      <Check size={12} />
                                      <span>Approve Draft ({items.length})</span>
                                    </button>
                                    {groupRemarksText && (
                                      <span
                                        className="text-[11px] text-gray-400 italic max-w-[150px] truncate"
                                        title={groupRemarksText}
                                      >
                                        &ldquo;{groupRemarksText}&rdquo;
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          isApprovedGroup
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                            : isRejectedGroup
                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                            : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                                        }`}
                                      >
                                        {items[0]?.status}
                                      </span>
                                      <span className="font-semibold text-gray-800 dark:text-slate-200">
                                        {items[0]?.reviewedBy || "Admin"}
                                      </span>
                                    </div>
                                    {groupRemarksText && (
                                      <div
                                        className="text-[11px] text-gray-400 italic truncate max-w-[200px]"
                                        title={groupRemarksText}
                                      >
                                        &ldquo;{groupRemarksText}&rdquo;
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>

                            {/* ── Sub-row Table (like TransactionsView renderJobCardSubRow) ── */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 dark:bg-slate-950/70 border-b border-teal-100 dark:border-teal-950/60 animate-fade-in">
                                <td colSpan="9" className="p-3 sm:p-4">
                                  <div className="p-4 rounded-2xl border border-teal-200/80 dark:border-teal-900/50 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                                    {/* Header info banner */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-150 dark:border-slate-800">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-200/60 dark:border-teal-800/40">
                                          <Boxes size={18} />
                                        </div>
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                                              Draft #{draftId}
                                            </span>
                                            <span className="font-bold text-xs text-gray-900 dark:text-white">
                                              {items.length} Materials Breakdown
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                isDraftGroup
                                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                                  : isPendingGroup
                                                  ? "bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                                                  : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                                              }`}
                                            >
                                              {isDraftGroup
                                                ? "Draft"
                                                : isPendingGroup
                                                ? "Pending Review"
                                                : items[0]?.status}
                                            </span>
                                          </div>
                                          {groupRemarksText && (
                                            <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                                              Observation / Remarks:{" "}
                                              <strong className="text-gray-800 dark:text-slate-200 italic">
                                                &ldquo;{groupRemarksText}&rdquo;
                                              </strong>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {isDraftGroup && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditDraftId(draftId);
                                                setIsRecordModalOpen(true);
                                              }}
                                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                              title="Resume filling more items in this draft"
                                            >
                                              <Edit3 size={12} />
                                              <span>Resume Draft</span>
                                            </button>
                                            <button
                                              type="button"
                                              disabled={isReviewProcessing}
                                              onClick={() => handleSubmitDraft(draftId)}
                                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                                              title="Submit this draft for Admin approval"
                                            >
                                              <Send size={12} />
                                              <span>Submit Draft</span>
                                            </button>
                                          </>
                                        )}
                                        {isPendingGroup && items.length > 1 && (
                                          <button
                                            type="button"
                                            disabled={isReviewProcessing}
                                            onClick={() => handleApproveDraft(draftId)}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                                            title="Approve all items in this draft"
                                          >
                                            <Check size={12} />
                                            <span>Approve Entire Draft ({items.length})</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Nested Tabular List */}
                                    <div className="overflow-x-auto rounded-xl border border-gray-200/80 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-950/40">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="bg-gray-100/90 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="w-10 px-3 py-2 text-center">#</th>
                                            <th className="px-3 py-2 font-mono">SKU</th>
                                            <th className="px-3 py-2">SUB-CATEGORY (MATERIAL NAME)</th>
                                            <th className="px-3 py-2">CATEGORY</th>
                                            <th className="px-3 py-2 text-right">CURRENT STOCK QTY</th>
                                            <th className="px-3 py-2 text-right">PHYSICAL STOCK QTY</th>
                                            <th className="px-3 py-2 text-right">DIFFERENCE</th>
                                            <th className="px-3 py-2 min-w-[180px]">REMARK / ACTION</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/60 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
                                          {items.map((record, itemIdx) => {
                                            const isPending = (record.status || "").toLowerCase() === "pending";
                                            const isApproved = (record.status || "").toLowerCase() === "approved";
                                            const isRejected = (record.status || "").toLowerCase() === "rejected";
                                            const isSelected = selectedReviewIds.has(record.id);
                                            const isCurrentProcessing =
                                              isReviewProcessing &&
                                              (reviewingId === record.id || isSelected);
                                            const diff = Number(record.differenceQty || 0);
                                            const matType = (
                                              record.materialType ||
                                              record.material_type ||
                                              (record.masterMaterialId &&
                                                masterMaterialMap[record.masterMaterialId]?.materialType) ||
                                              (record.masterMaterialId &&
                                                masterMaterialMap[record.masterMaterialId]?.material_type) ||
                                              "RM"
                                            ).toUpperCase();
                                            const displayName =
                                              (record.masterMaterialId &&
                                                masterMaterialMap[record.masterMaterialId]?.name) ||
                                              record.name;
                                            const itemCategory =
                                              materialsBySkuMap[record.sku]?.category ||
                                              (record.masterMaterialId &&
                                                masterMaterialMap[record.masterMaterialId]?.category) ||
                                              masterMaterialBySkuMap[record.sku]?.category ||
                                              record.category ||
                                              (matType === "FG" ? "Finished Goods" : "Raw Material");

                                            return (
                                              <tr
                                                key={record.id}
                                                className={`hover:bg-teal-50/40 dark:hover:bg-slate-800/40 transition-colors ${
                                                  isSelected ? "bg-teal-500/10 dark:bg-teal-950/30" : ""
                                                }`}
                                              >
                                                <td className="px-3 py-2 text-center text-gray-400 font-mono">
                                                  {isPending ? (
                                                    <input
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={() => handleToggleSelectRow(record.id)}
                                                      className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer align-middle"
                                                    />
                                                  ) : (
                                                    <span>{itemIdx + 1}</span>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                                  {record.sku}
                                                </td>
                                                <td className="px-3 py-2 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                  {displayName}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                                    {itemCategory}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                                                  {Number(record.systemStock).toLocaleString()} {record.unit}
                                                </td>
                                                <td className="px-3 py-2 text-right font-black text-teal-600 dark:text-teal-400 whitespace-nowrap">
                                                  {Number(record.physicalQty).toLocaleString()} {record.unit}
                                                </td>
                                                <td className="px-3 py-2 text-right font-black whitespace-nowrap">
                                                  <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                                      diff > 0
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                        : diff < 0
                                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                                        : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                                                    }`}
                                                  >
                                                    {diff > 0 ? `+${diff}` : diff} {record.unit}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                  {isPending ? (
                                                    <div className="flex items-center gap-1.5">
                                                      <input
                                                        type="text"
                                                        value={reviewRemarksMap[record.id] || ""}
                                                        onChange={(e) =>
                                                          setReviewRemarksMap((prev) => ({
                                                            ...prev,
                                                            [record.id]: e.target.value,
                                                          }))
                                                        }
                                                        placeholder="Reviewer remarks..."
                                                        className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 min-w-[110px]"
                                                      />
                                                      <button
                                                        type="button"
                                                        disabled={isCurrentProcessing}
                                                        onClick={() => handleReviewAction(record.id, "Approved")}
                                                        title="Approve Variance"
                                                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                                                      >
                                                        {isCurrentProcessing ? (
                                                          <Loader2 size={13} className="animate-spin" />
                                                        ) : (
                                                          <Check size={13} />
                                                        )}
                                                      </button>
                                                      <button
                                                        type="button"
                                                        disabled={isCurrentProcessing}
                                                        onClick={() => handleReviewAction(record.id, "Rejected")}
                                                        title="Reject Variance"
                                                        className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                                                      >
                                                        {isCurrentProcessing ? (
                                                          <Loader2 size={13} className="animate-spin" />
                                                        ) : (
                                                          <X size={13} />
                                                        )}
                                                      </button>
                                                    </div>
                                                  ) : isDraftGroup ? (
                                                    <span className="text-xs text-amber-500 font-semibold italic">
                                                      Draft
                                                    </span>
                                                  ) : (
                                                    <div className="text-xs text-gray-500 space-y-0.5">
                                                      <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span
                                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            isApproved
                                                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300"
                                                              : isRejected
                                                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300"
                                                              : "bg-gray-100 text-gray-600 dark:bg-slate-800"
                                                          }`}
                                                        >
                                                          {record.status}
                                                        </span>
                                                        <span className="font-semibold text-gray-800 dark:text-slate-200">
                                                          {record.reviewedBy || "Admin"}
                                                        </span>
                                                      </div>
                                                      {(record.reviewRemarks || record.remarks) && (
                                                        <div
                                                          className="text-[11px] text-gray-400 italic truncate max-w-[200px]"
                                                          title={cleanRemarkText(record.reviewRemarks || record.remarks)}
                                                        >
                                                          &ldquo;{cleanRemarkText(record.reviewRemarks || record.remarks)}&rdquo;
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      }

                      /* ── SINGLE ITEM (no draft group) ── */
                      const record = displayItem.record;
                      const isDraft =
                        (record.status || "").toLowerCase() === "draft";
                      const isPending =
                        (record.status || "").toLowerCase() === "pending";
                      const isApproved =
                        (record.status || "").toLowerCase() === "approved";
                      const isRejected =
                        (record.status || "").toLowerCase() === "rejected";
                      const isSelected = selectedReviewIds.has(record.id);
                      const isCurrentProcessing =
                        isReviewProcessing &&
                        (reviewingId === record.id || isSelected);
                      const recDraftId = extractDraftId(record);
                      const draftItemsCount = recDraftId
                        ? draftPendingItems[recDraftId]?.length || 0
                        : 0;
                      const diff = Number(record.differenceQty || 0);
                      const matType = (
                        record.materialType ||
                        record.material_type ||
                        (record.masterMaterialId &&
                          masterMaterialMap[record.masterMaterialId]
                            ?.materialType) ||
                        (record.masterMaterialId &&
                          masterMaterialMap[record.masterMaterialId]
                            ?.material_type) ||
                        "RM"
                      ).toUpperCase();
                      const displayName =
                        (record.masterMaterialId &&
                          masterMaterialMap[record.masterMaterialId]?.name) ||
                        record.name;
                      const itemCategory =
                        materialsBySkuMap[record.sku]?.category ||
                        (record.masterMaterialId &&
                          masterMaterialMap[record.masterMaterialId]
                            ?.category) ||
                        masterMaterialBySkuMap[record.sku]?.category ||
                        record.category ||
                        (matType === "FG" ? "Finished Goods" : "Raw Material");

                      return (
                        <tr
                          key={record.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-teal-500/10 dark:bg-teal-950/30 hover:bg-teal-500/15"
                              : isDraft
                                ? "bg-amber-50/20 dark:bg-amber-950/20 hover:bg-amber-50/40 dark:hover:bg-amber-950/30"
                                : isPending
                                  ? "bg-teal-50/15 dark:bg-teal-950/10 hover:bg-teal-50/30 dark:hover:bg-teal-950/20"
                                  : "hover:bg-gray-50/70 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <td
                            className="w-10 px-3 py-3 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isPending ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  handleToggleSelectRow(record.id)
                                }
                                className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer align-middle"
                              />
                            ) : isDraft ? (
                              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title="Draft entry" />
                            ) : (
                              <span className="text-gray-300 dark:text-slate-700 select-none">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">
                            {record.countedDate
                              ? new Date(
                                  record.countedDate,
                                ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{record.sku}</span>
                              {recDraftId && (
                                <span className="text-[10px] font-sans font-semibold text-teal-600 dark:text-teal-400">
                                  #{recDraftId}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {displayName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-slate-300 font-medium">
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                              {itemCategory}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                            {Number(record.systemStock).toLocaleString()}{" "}
                            {record.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-teal-600 dark:text-teal-400 whitespace-nowrap">
                            {Number(record.physicalQty).toLocaleString()}{" "}
                            {record.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-black whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                diff > 0
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : diff < 0
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                    : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff} {record.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isDraft ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditDraftId(recDraftId || `DRAFT-${record.id}`);
                                    setIsRecordModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                  title="Resume filling more items in this draft"
                                >
                                  <Edit3 size={12} />
                                  <span>Resume Draft</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isReviewProcessing}
                                  onClick={() =>
                                    handleSubmitDraft(recDraftId || `DRAFT-${record.id}`)
                                  }
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                                  title="Submit this draft for Admin approval"
                                >
                                  <Send size={12} />
                                  <span>Submit</span>
                                </button>
                                {record.remarks && (
                                  <span className="text-[11px] text-gray-400 italic max-w-[150px] truncate" title={record.remarks}>
                                    {cleanRemarkText(record.remarks)}
                                  </span>
                                )}
                              </div>
                            ) : isPending ? (
                              <div className="space-y-1.5 min-w-[220px]">
                                {recDraftId && draftItemsCount > 1 && (
                                  <div className="flex items-center justify-between gap-1 text-[11px]">
                                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                                      Draft #{recDraftId}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={isCurrentProcessing}
                                      onClick={() => handleApproveDraft(recDraftId)}
                                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                      title="Approve all items entered on this draft automatically"
                                    >
                                      <Check size={11} />
                                      Approve Entire Draft ({draftItemsCount})
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={reviewRemarksMap[record.id] || ""}
                                    onChange={(e) =>
                                      setReviewRemarksMap((prev) => ({
                                        ...prev,
                                        [record.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Reviewer remarks..."
                                    className="w-full px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                  />
                                  <button
                                    type="button"
                                    disabled={isCurrentProcessing}
                                    onClick={() =>
                                      handleReviewAction(record.id, "Approved")
                                    }
                                    title="Approve Variance"
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                                  >
                                    {isCurrentProcessing ? (
                                      <Loader2
                                        size={13}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Check size={13} />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isCurrentProcessing}
                                    onClick={() =>
                                      handleReviewAction(record.id, "Rejected")
                                    }
                                    title="Reject Variance"
                                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                                  >
                                    {isCurrentProcessing ? (
                                      <Loader2
                                        size={13}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <X size={13} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      isApproved
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                        : isRejected
                                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                          : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                  >
                                    {record.status}
                                  </span>
                                  <span className="font-semibold text-gray-800 dark:text-slate-200">
                                    {record.reviewedBy || "Admin"}
                                  </span>
                                  {record.isStockAdjusted && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded">
                                      Adjusted
                                    </span>
                                  )}
                                </div>
                                {(record.reviewRemarks || record.remarks) && (
                                  <div
                                    className="text-[11px] text-gray-400 italic truncate max-w-[200px]"
                                    title={
                                      cleanRemarkText(record.reviewRemarks || record.remarks)
                                    }
                                  >
                                    &ldquo;
                                    {cleanRemarkText(record.reviewRemarks || record.remarks)}
                                    &rdquo;
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {groupedReviewItems.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-500 dark:text-slate-400">
                <div>
                  Showing page <strong>{reviewPage}</strong> of{" "}
                  <strong>{totalReviewPages}</strong> ({groupedReviewItems.length} entries
                  {" · "}{sortedReviewRecords.length} total items)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={reviewPage <= 1}
                    onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={reviewPage >= totalReviewPages}
                    onClick={() =>
                      setReviewPage((p) => Math.min(totalReviewPages, p + 1))
                    }
                    className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: COUNT HISTORY & AUDIT TRAIL */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap flex-1 max-w-2xl">
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  size={14}
                  className="absolute left-3 top-2.5 text-gray-400"
                />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search SKU, material, employee, or reviewer..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={historyDivisionFilter}
                onChange={(e) => {
                  setHistoryDivisionFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="">All Firms</option>
                {divisions.map((d) => (
                  <option key={d.name || d} value={d.name || d}>
                    {d.name || d}
                  </option>
                ))}
              </select>

              <select
                value={historyStatusFilter}
                onChange={(e) => {
                  setHistoryStatusFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={historyTypeFilter}
                onChange={(e) => {
                  setHistoryTypeFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {filteredMaterialTypes.map((mt) => (
                  <option key={mt.code} value={mt.code}>
                    {mt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-500 dark:text-slate-400">
              Showing <strong>{filteredHistoryRecords.length}</strong> count
              record(s)
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 dark:bg-slate-950 text-gray-600 dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-800 select-none">
                  <tr>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("countedDate")}
                    >
                      Count Date
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("sku")}
                    >
                      SKU Code
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("name")}
                    >
                      Material Name
                    </th>
                    <th
                      className="px-4 py-3.5 cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("division")}
                    >
                      Firm
                    </th>
                    <th className="px-4 py-3.5">Type</th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("systemStock")}
                    >
                      System Qty
                    </th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("physicalQty")}
                    >
                      Physical Qty
                    </th>
                    <th
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-teal-600"
                      onClick={() => requestHistorySort("differenceQty")}
                    >
                      Variance
                    </th>
                    <th className="px-4 py-3.5">Counted By</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5">Reviewed By &amp; Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {paginatedHistoryRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan="11"
                        className="text-center py-12 text-gray-400"
                      >
                        No physical stock count records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistoryRecords.map((r) => {
                      const diff = Number(r.differenceQty || 0);
                      const isApproved =
                        (r.status || "").toLowerCase() === "approved";
                      const isRejected =
                        (r.status || "").toLowerCase() === "rejected";

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">
                            {r.countedDate
                              ? new Date(r.countedDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {r.sku}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {r.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                            {r.division || "ALL"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {r.materialType || "RM"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-slate-300">
                            {Number(r.systemStock).toLocaleString()} {r.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                            {Number(r.physicalQty).toLocaleString()} {r.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-black">
                            <span
                              className={
                                diff > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : diff < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-gray-500"
                              }
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                            {r.countedBy || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                  : isRejected
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                              }`}
                            >
                              {r.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.reviewedBy ? (
                              <div>
                                <span className="font-semibold text-gray-800 dark:text-slate-200">
                                  {r.reviewedBy}
                                </span>
                                {r.isStockAdjusted && (
                                  <span className="ml-1 text-[10px] text-indigo-500 font-bold">
                                    (Adjusted)
                                  </span>
                                )}
                                {r.reviewRemarks && (
                                  <div className="text-[11px] text-gray-400 italic">
                                    &ldquo;{r.reviewRemarks}&rdquo;
                                  </div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-500 dark:text-slate-400">
              <div>
                Showing page <strong>{historyPage}</strong> of{" "}
                <strong>{totalHistoryPages}</strong> (
                {filteredHistoryRecords.length} records)
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() =>
                    setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))
                  }
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Physical Count Modal */}
      <PhysicalStockModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setRecordModalPrefill(null);
          setEditDraftId(null);
        }}
        activeUser={activeUser}
        prefill={recordModalPrefill}
        draftId={editDraftId}
      />
    </div>
  );
}
