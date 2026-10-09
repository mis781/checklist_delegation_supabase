// src/systems/inventory/components/PhysicalStockModal.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import {
  X,
  ClipboardList,
  Plus,
  Trash2,
  Save,
  Send,
  Building2,
  MapPin,
  Calendar,
  User,
  Loader2,
  CheckCircle2,
  Layers,
  FileText,
  RotateCcw,
} from "lucide-react";
import { submitPhysicalStockCount } from "../../../redux/slice/inventorySlice";
import { useMagicToast } from "../../../context/MagicToastContext";
import { isScrapItem } from "../utils/scrapUtils";

// Helper: Extract Draft ID from record remarks
export const extractDraftId = (record) => {
  if (!record) return null;
  const match =
    (record.remarks || "").match(/\[Draft #([^\]]+)\]/) ||
    (record.remarks || "").match(/\[(DRAFT-[^\]]+)\]/);
  return match ? match[1] : null;
};

// Helper: Strip draft prefix from remarks
export const cleanRemarkText = (remark) => {
  if (!remark) return "";
  return remark
    .replace(/\[Draft #[^\]]+\]\s*/g, "")
    .replace(/\[DRAFT-[^\]]+\]\s*/g, "")
    .trim();
};

// Robust Searchable Select with Fixed Viewport Positioning (eliminates all clipping inside tables)
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  disabled = false,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({});
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const normalizedOptions = useMemo(() => {
    return (options || [])
      .filter(Boolean)
      .map((opt) => {
        if (typeof opt === "string" || typeof opt === "number") {
          return { label: String(opt), value: String(opt) };
        }
        if (opt && typeof opt === "object") {
          const label = String(opt.label ?? opt.name ?? opt.value ?? "");
          const val = String(opt.value ?? opt.sku ?? opt.label ?? "");
          return { label, value: val, ...opt };
        }
        return null;
      })
      .filter((opt) => opt && opt.label);
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((o) => o.value === value);
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (o) =>
        (o.label || "").toLowerCase().includes(q) ||
        (o.sku || "").toLowerCase().includes(q) ||
        (o.name || "").toLowerCase().includes(q) ||
        (o.subLabel || "").toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Calculate fixed floating position relative to the button
  useEffect(() => {
    if (!isOpen) return;

    const computePos = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const menuHeight = 240;
      const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

      const top = openUp ? undefined : rect.bottom + 4;
      const bottom = openUp ? viewportHeight - rect.top + 4 : undefined;
      const width = Math.max(rect.width, 340);
      const left = Math.min(rect.left, window.innerWidth - width - 16);

      setDropdownPosition({
        position: "fixed",
        top: top !== undefined ? `${top}px` : "auto",
        bottom: bottom !== undefined ? `${bottom}px` : "auto",
        left: `${Math.max(12, left)}px`,
        width: `${width}px`,
        zIndex: 99999,
      });
    };

    computePos();
    window.addEventListener("scroll", computePos, true);
    window.addEventListener("resize", computePos);

    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", computePos, true);
      window.removeEventListener("resize", computePos);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery("");
          }
        }}
        className={`w-full ${
          compact ? "px-3 py-1.5 text-xs rounded-lg" : "px-3.5 py-2 text-xs rounded-xl"
        } border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-white flex items-center justify-between focus:ring-2 focus:ring-teal-500 transition-all ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 hover:border-teal-500/50"
        }`}
      >
        <span
          className={
            selectedOption
              ? "font-medium truncate text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-slate-500 truncate"
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0 ml-1.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Render via Portal so it never clips regardless of table overflow */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={dropdownPosition}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up border-teal-500/30"
          >
            <div className="p-2 border-b border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/70">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to filter..."
                className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="overflow-y-auto max-h-56 p-1.5 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-gray-400 dark:text-slate-500 text-center">
                  No matching materials found
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value, opt);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 text-xs rounded-xl cursor-pointer transition-colors ${
                      opt.value === value
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
                        : "text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col truncate">
                        <span className="font-bold text-gray-900 dark:text-white truncate">
                          {opt.label}
                        </span>
                        {opt.subLabel && opt.subLabel !== opt.label && (
                          <span className="text-[11px] text-gray-400 dark:text-slate-400 truncate">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {opt.category && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded shrink-0">
                          {opt.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function PhysicalStockModal({
  isOpen,
  onClose,
  activeUser,
  prefill = null,
  draftId = null,
}) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();

  const {
    materials = [],
    transactions = [],
    locations = [],
    divisions = [],
    materialTypes = [],
    recycles = [],
    physicalStocks = [],
    masterMaterials = [],
  } = useSelector((state) => state.inventory);

  const { transfers: allTransfers = [] } = useSelector(
    (state) => state.transfers || {}
  );

  // Master Material map for fast metadata lookup
  const masterMaterialMap = useMemo(() => {
    const map = {};
    (masterMaterials || []).forEach((m) => {
      if (m.id) map[m.id] = m;
      if (m.sku) map[m.sku] = m;
    });
    return map;
  }, [masterMaterials]);

  // Master materials by SKU
  const masterMaterialBySkuMap = useMemo(() => {
    const map = {};
    (masterMaterials || []).forEach((m) => {
      if (m.sku) map[m.sku] = m;
    });
    return map;
  }, [masterMaterials]);

  // Materials by SKU
  const materialsBySkuMap = useMemo(() => {
    const map = {};
    (materials || []).forEach((m) => {
      if (m.sku) map[m.sku] = m;
    });
    return map;
  }, [materials]);

  // Live closing stock map per SKU & division
  const currentClosingStocks = useMemo(() => {
    const txnBySkuDiv = {};
    materials.forEach((m) => {
      const key = `${m.sku}__${m.division || ""}`;
      txnBySkuDiv[key] = { totalIn: 0, totalOut: 0 };
    });

    transactions.forEach((t) => {
      const qty = Number(t.qty) || 0;
      const key = `${t.sku}__${t.firm || ""}`;
      if (!txnBySkuDiv[key]) {
        txnBySkuDiv[key] = { totalIn: 0, totalOut: 0 };
      }
      if (t.type === "IN" || t.type === "Job Card") {
        txnBySkuDiv[key].totalIn += qty;
      } else {
        txnBySkuDiv[key].totalOut += qty;
      }
    });

    const completedRecycles = (recycles || []).filter(
      (r) => (r.status || "").toLowerCase() === "completed"
    );

    const stockMap = {};
    materials.forEach((m) => {
      const key = `${m.sku}__${m.division || ""}`;
      const skuTxn = txnBySkuDiv[key] || { totalIn: 0, totalOut: 0 };

      const transferInQty = (allTransfers || [])
        .filter(
          (t) =>
            t.status === "Approved" &&
            t.skuCode === m.sku &&
            t.toDivision === m.division
        )
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

      const transferOutQty = (allTransfers || [])
        .filter(
          (t) =>
            t.status === "Approved" &&
            t.skuCode === m.sku &&
            t.fromDivision === m.division
        )
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

      const recycleQty = completedRecycles
        .filter((r) => {
          const rSku = (r.material_sku || "").trim().toLowerCase();
          const mSku = (m.sku || "").trim().toLowerCase();
          const rName = (r.material_name || "").trim().toLowerCase();
          const mName = (m.name || "").trim().toLowerCase();
          const matchesSkuOrName = rSku ? rSku === mSku : rName && rName === mName;
          if (!matchesSkuOrName) return false;
          if (r.firm && m.division) {
            return (
              r.firm.trim().toLowerCase() === m.division.trim().toLowerCase()
            );
          }
          return true;
        })
        .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

      const isScrap = isScrapItem(m);
      const openingStock = Number(m.opening) || 0;
      const totalIn = skuTxn.totalIn + transferInQty;
      const totalOut = skuTxn.totalOut + transferOutQty;
      stockMap[key] = isScrap
        ? openingStock + totalIn - totalOut + recycleQty
        : openingStock + totalIn - totalOut - recycleQty;
      if (stockMap[m.sku] === undefined) {
        stockMap[m.sku] = stockMap[key];
      }
    });

    return stockMap;
  }, [materials, transactions, allTransfers, recycles]);

  // Existing saved drafts from database
  const availableDrafts = useMemo(() => {
    const draftsMap = {};
    (physicalStocks || []).forEach((p) => {
      if ((p.status || "").toLowerCase() === "draft") {
        const dId = extractDraftId(p) || `DRAFT-${p.id}`;
        if (!draftsMap[dId]) {
          draftsMap[dId] = {
            draftId: dId,
            location: p.location || "",
            division: p.division || "",
            materialType: (p.materialType || p.material_type || "RM").toUpperCase(),
            countedBy: p.countedBy || "",
            countedDate: p.countedDate || p.createdAt || "",
            items: [],
          };
        }
        draftsMap[dId].items.push(p);
      }
    });
    return Object.values(draftsMap);
  }, [physicalStocks]);

  // 1st Row Form State: Header Fields
  const [formLocation, setFormLocation] = useState("");
  const [formDivision, setFormDivision] = useState("");
  const [formMaterialType, setFormMaterialType] = useState("RM");
  const [formCountedBy, setFormCountedBy] = useState("");
  const [formCountedDate, setFormCountedDate] = useState("");
  const [formRemarks, setFormRemarks] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState("");

  // Tabular Rows State
  const [rows, setRows] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered material types: Only Raw Material and Finished Goods
  const filteredMaterialTypes = useMemo(() => {
    const allowed = ["RM", "FG"];
    const found = (materialTypes || []).filter((mt) =>
      allowed.includes((mt.type_code || mt.typeCode || "").toUpperCase())
    );
    if (found.length > 0) return found;
    return [
      { type_code: "RM", type_name: "Raw Material" },
      { type_code: "FG", type_name: "Finished Goods" },
    ];
  }, [materialTypes]);

  // Materials available for the selected Material Type & Division
  const availableMaterials = useMemo(() => {
    return materials.filter((m) => {
      const typeMatch =
        !formMaterialType ||
        (m.materialType || m.material_type || "RM").toUpperCase() ===
          formMaterialType.toUpperCase();
      const divMatch =
        !formDivision ||
        formDivision === "ALL" ||
        !m.division ||
        m.division === "ALL" ||
        m.division === formDivision;
      return typeMatch && divMatch;
    });
  }, [materials, formMaterialType, formDivision]);

  // SKU Options for row dropdown
  const skuOptions = useMemo(() => {
    return availableMaterials.map((m) => ({
      value: m.sku,
      label: m.sku,
      subLabel: m.name,
      sku: m.sku,
      name: m.name,
      unit: m.unit,
      category:
        m.category ||
        materialsBySkuMap[m.sku]?.category ||
        masterMaterialBySkuMap[m.sku]?.category ||
        (formMaterialType === "FG" ? "Finished Goods" : "Raw Material"),
      location: m.location,
      division: m.division,
      materialType: (m.materialType || m.material_type || "RM").toUpperCase(),
    }));
  }, [
    availableMaterials,
    materialsBySkuMap,
    masterMaterialBySkuMap,
    formMaterialType,
  ]);

  // Material Name Options for row dropdown
  const materialNameOptions = useMemo(() => {
    return availableMaterials.map((m) => ({
      value: m.sku,
      label: m.name,
      subLabel: m.sku,
      sku: m.sku,
      name: m.name,
      unit: m.unit,
      category:
        m.category ||
        materialsBySkuMap[m.sku]?.category ||
        masterMaterialBySkuMap[m.sku]?.category ||
        (formMaterialType === "FG" ? "Finished Goods" : "Raw Material"),
      location: m.location,
      division: m.division,
      materialType: (m.materialType || m.material_type || "RM").toUpperCase(),
    }));
  }, [
    availableMaterials,
    materialsBySkuMap,
    masterMaterialBySkuMap,
    formMaterialType,
  ]);

  // Create empty row template
  const createEmptyRow = () => ({
    tempId: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    id: null,
    sku: "",
    name: "",
    category: "",
    unit: "",
    systemStock: 0,
    physicalQty: "",
    differenceQty: null,
    remarks: "",
  });

  // Load a draft by draftId
  const loadDraft = (dId) => {
    const foundDraft = availableDrafts.find((d) => d.draftId === dId);
    if (!foundDraft) return;

    setCurrentDraftId(foundDraft.draftId);
    setFormLocation(foundDraft.location || locations[0]?.location || "");
    setFormDivision(foundDraft.division || divisions[0]?.name || "");
    setFormMaterialType((foundDraft.materialType || "RM").toUpperCase());
    setFormCountedBy(foundDraft.countedBy || activeUser?.name || "Admin");

    if (foundDraft.countedDate) {
      try {
        const dt = new Date(foundDraft.countedDate);
        const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setFormCountedDate(iso);
      } catch {
        setFormCountedDate(foundDraft.countedDate.slice(0, 16));
      }
    }

    // Find first item with existing remarks to populate common remarks
    const firstWithRemark = foundDraft.items.find(
      (i) => i.remarks && cleanRemarkText(i.remarks)
    );
    setFormRemarks(firstWithRemark ? cleanRemarkText(firstWithRemark.remarks) : "");

    const loadedRows = foundDraft.items.map((item) => {
      const sysStock =
        item.systemStock !== undefined
          ? item.systemStock
          : currentClosingStocks[`${item.sku}__${foundDraft.division || ""}`] ??
            currentClosingStocks[item.sku] ??
            0;
      const phyQty = item.physicalQty !== undefined ? String(item.physicalQty) : "";
      const diff =
        phyQty !== "" && !isNaN(Number(phyQty))
          ? Number(phyQty) - Number(sysStock)
          : null;

      const cat =
        materialsBySkuMap[item.sku]?.category ||
        masterMaterialBySkuMap[item.sku]?.category ||
        item.category ||
        (foundDraft.materialType === "FG" ? "Finished Goods" : "Raw Material");

      return {
        tempId: `item_${item.id}`,
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: cat,
        unit: item.unit || "KG",
        systemStock: Number(sysStock) || 0,
        physicalQty: phyQty,
        differenceQty: diff,
        remarks: cleanRemarkText(item.remarks || item.reviewRemarks || ""),
      };
    });

    setRows(loadedRows.length > 0 ? loadedRows : [createEmptyRow()]);
    setDeletedIds([]);
  };

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormCountedDate(localIso);
      setFormCountedBy(activeUser?.name || "Admin");
      setDeletedIds([]);

      // If a specific draftId was passed as prop
      if (draftId) {
        loadDraft(draftId);
        return;
      }

      // If prefill item was passed
      if (prefill) {
        const autoDraftId = `DRAFT-${Date.now().toString().slice(-6)}`;
        setCurrentDraftId(autoDraftId);
        setFormLocation(prefill.location || locations[0]?.location || "");
        setFormDivision(prefill.division || divisions[0]?.name || "");
        setFormMaterialType((prefill.materialType || "RM").toUpperCase());
        setFormRemarks(cleanRemarkText(prefill.remarks || ""));

        const sysStock =
          prefill.systemStock !== undefined
            ? prefill.systemStock
            : currentClosingStocks[`${prefill.sku}__${prefill.division || ""}`] ??
              currentClosingStocks[prefill.sku] ??
              0;

        const cat =
          prefill.category ||
          materialsBySkuMap[prefill.sku]?.category ||
          masterMaterialBySkuMap[prefill.sku]?.category ||
          (prefill.materialType === "FG" ? "Finished Goods" : "Raw Material");

        setRows([
          {
            tempId: `row_prefill_${Date.now()}`,
            id: null,
            sku: prefill.sku || "",
            name: prefill.name || "",
            category: cat,
            unit: prefill.unit || "KG",
            systemStock: Number(sysStock) || 0,
            physicalQty: "",
            differenceQty: null,
            remarks: "",
          },
        ]);
        return;
      }

      // Brand new entry session
      const autoDraftId = `DRAFT-${Date.now().toString().slice(-6)}`;
      setCurrentDraftId(autoDraftId);
      setFormLocation(locations[0]?.location || activeUser?.location || "");
      setFormDivision(divisions[0]?.name || "");
      setFormMaterialType("RM");
      setFormRemarks("");
      setRows([createEmptyRow()]);
    }
  }, [
    isOpen,
    prefill,
    draftId,
    activeUser,
    locations,
    divisions,
    currentClosingStocks,
    materialsBySkuMap,
    masterMaterialBySkuMap,
  ]);

  // When formDivision changes, update system stock for all selected rows
  const handleDivisionChange = (newDivision) => {
    setFormDivision(newDivision);
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (!r.sku) return r;
        const key = `${r.sku}__${newDivision || ""}`;
        const newSys = currentClosingStocks[key] ?? currentClosingStocks[r.sku] ?? 0;
        const diff =
          r.physicalQty !== "" && !isNaN(Number(r.physicalQty))
            ? Number(r.physicalQty) - Number(newSys)
            : null;
        return {
          ...r,
          systemStock: newSys,
          differenceQty: diff,
        };
      })
    );
  };

  // Row update: Select SKU
  const handleRowSkuChange = (rowIndex, selectedSku, opt) => {
    const matched =
      opt ||
      availableMaterials.find((m) => m.sku === selectedSku) ||
      materials.find((m) => m.sku === selectedSku);

    setRows((prev) => {
      const next = [...prev];
      const row = next[rowIndex];
      if (!row) return prev;

      if (!matched) {
        next[rowIndex] = {
          ...row,
          sku: selectedSku,
          name: "",
          category: "",
          unit: "",
          systemStock: 0,
          differenceQty: null,
        };
        return next;
      }

      const sysStock =
        currentClosingStocks[`${matched.sku}__${formDivision || ""}`] ??
        currentClosingStocks[matched.sku] ??
        0;

      const cat =
        matched.category ||
        materialsBySkuMap[matched.sku]?.category ||
        masterMaterialBySkuMap[matched.sku]?.category ||
        (formMaterialType === "FG" ? "Finished Goods" : "Raw Material");

      const diff =
        row.physicalQty !== "" && !isNaN(Number(row.physicalQty))
          ? Number(row.physicalQty) - Number(sysStock)
          : null;

      next[rowIndex] = {
        ...row,
        sku: matched.sku,
        name: matched.name || row.name,
        category: cat,
        unit: matched.unit || "KG",
        systemStock: Number(sysStock) || 0,
        differenceQty: diff,
      };
      return next;
    });
  };

  // Row update: Physical Qty
  const handleRowPhysicalQtyChange = (rowIndex, val) => {
    setRows((prev) => {
      const next = [...prev];
      const row = next[rowIndex];
      if (!row) return prev;

      const diff =
        val !== "" && !isNaN(Number(val))
          ? Number(val) - Number(row.systemStock || 0)
          : null;

      next[rowIndex] = {
        ...row,
        physicalQty: val,
        differenceQty: diff,
      };
      return next;
    });
  };

  // Row operation: Add new blank row
  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  // Row operation: Remove row
  const handleRemoveRow = (rowIndex) => {
    setRows((prev) => {
      const rowToRemove = prev[rowIndex];
      if (rowToRemove && rowToRemove.id) {
        setDeletedIds((d) => [...d, rowToRemove.id]);
      }
      const updated = prev.filter((_, idx) => idx !== rowIndex);
      return updated.length > 0 ? updated : [createEmptyRow()];
    });
  };

  // Populate all materials for the selected firm & material type
  const handlePopulateAllMaterials = () => {
    if (availableMaterials.length === 0) {
      showToast("No materials found for the selected Material Type & Firm.", "warning");
      return;
    }

    const existingSkus = new Set(rows.map((r) => r.sku).filter(Boolean));
    const newItems = availableMaterials
      .filter((m) => !existingSkus.has(m.sku))
      .map((m) => {
        const sysStock =
          currentClosingStocks[`${m.sku}__${formDivision || ""}`] ??
          currentClosingStocks[m.sku] ??
          0;
        const cat =
          m.category ||
          materialsBySkuMap[m.sku]?.category ||
          masterMaterialBySkuMap[m.sku]?.category ||
          (formMaterialType === "FG" ? "Finished Goods" : "Raw Material");

        return {
          tempId: `populated_${m.sku}_${Date.now()}`,
          id: null,
          sku: m.sku,
          name: m.name,
          category: cat,
          unit: m.unit || "KG",
          systemStock: Number(sysStock) || 0,
          physicalQty: "",
          differenceQty: null,
          remarks: "",
        };
      });

    // Keep existing rows that have SKU, append new ones
    const populated = [...rows.filter((r) => r.sku), ...newItems];
    setRows(populated.length > 0 ? populated : [createEmptyRow()]);
    showToast(`Added ${newItems.length} materials to the count sheet.`, "info");
  };

  // Summary statistics
  const summary = useMemo(() => {
    const validRows = rows.filter((r) => r.sku);
    const count = validRows.length;
    const totalSys = validRows.reduce((acc, r) => acc + (Number(r.systemStock) || 0), 0);
    const totalPhy = validRows.reduce(
      (acc, r) =>
        acc + (r.physicalQty !== "" && !isNaN(Number(r.physicalQty)) ? Number(r.physicalQty) : 0),
      0
    );
    const totalDiff = validRows.reduce(
      (acc, r) => acc + (r.differenceQty !== null ? Number(r.differenceQty) : 0),
      0
    );
    return { count, totalSys, totalPhy, totalDiff };
  }, [rows]);

  // Main Save or Submit Handler
  const handleSaveAction = async (statusMode) => {
    const isDraft = statusMode === "Draft";

    // Validate rows
    const filledRows = rows.filter((r) => r.sku && r.sku.trim() !== "");

    if (filledRows.length === 0) {
      showToast("Please select at least one material/SKU to save.", "warning");
      return;
    }

    if (!isDraft) {
      const missingCounts = filledRows.filter(
        (r) => r.physicalQty === "" || isNaN(Number(r.physicalQty))
      );
      if (missingCounts.length > 0) {
        showToast(
          `Please enter Physical Stock Qty for ${missingCounts[0].sku || "all items"} before submitting.`,
          "warning"
        );
        return;
      }
    }

    setIsSubmitting(true);
    const batchDraftTag = currentDraftId || `DRAFT-${Date.now().toString().slice(-6)}`;

    try {
      const payload = filledRows.map((r) => {
        const phyQty =
          r.physicalQty !== "" && !isNaN(Number(r.physicalQty))
            ? Number(r.physicalQty)
            : Number(r.systemStock) || 0;
        const diffQty = phyQty - Number(r.systemStock || 0);

        const cleanRemark = cleanRemarkText(formRemarks || r.remarks || "");
        const taggedRemark = cleanRemark
          ? `[Draft #${batchDraftTag}] ${cleanRemark}`.trim()
          : `[Draft #${batchDraftTag}]`.trim();

        return {
          id: r.id || undefined,
          sku: r.sku,
          name: r.name || r.sku,
          materialType: formMaterialType || "RM",
          division: formDivision || "ALL",
          location: formLocation || "",
          unit: r.unit || "KG",
          systemStock: Number(r.systemStock) || 0,
          physicalQty: phyQty,
          differenceQty: diffQty,
          countedBy: formCountedBy || activeUser?.name || "Admin",
          countedDate: formCountedDate
            ? new Date(formCountedDate).toISOString()
            : new Date().toISOString(),
          remarks: taggedRemark,
          status: isDraft ? "Draft" : "Pending",
        };
      });

      await dispatch(
        submitPhysicalStockCount({
          physicalData: payload,
          currentUser: activeUser?.name || "Admin",
          deletedIds,
        })
      ).unwrap();

      if (isDraft) {
        showToast(
          `Draft #${batchDraftTag} saved with ${payload.length} item${
            payload.length === 1 ? "" : "s"
          }! You can continue filling items later.`,
          "success"
        );
      } else {
        showToast(
          `Physical count #${batchDraftTag} (${payload.length} items) submitted for Admin approval!`,
          "success"
        );
      }

      onClose();
    } catch (err) {
      console.error("Physical stock save/submit error:", err);
      showToast(`Action failed: ${err.message || err}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    /* Centered Modal: Proportioned to cover ~80-85% of the viewport with balanced margins around it */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-7 bg-slate-900/60 backdrop-blur-xs overflow-hidden animate-fade-in select-none">
      <div className="relative w-full max-w-7xl h-[84vh] max-h-[880px] min-h-[560px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200/90 dark:border-slate-800 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 lg:px-8 py-3.5 border-b border-gray-200 dark:border-slate-800 bg-linear-to-r from-teal-500/10 via-emerald-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Record Physical Stock Count
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <FileText size={12} />
                  {currentDraftId || "New Session"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Tabular entry sheet: Enter physical stock counts, save as draft to continue later, or submit for Admin approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Existing drafts selector if any */}
            {availableDrafts.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                  Resume Draft:
                </span>
                <select
                  value={currentDraftId}
                  onChange={(e) => {
                    if (e.target.value === "NEW") {
                      const autoDraftId = `DRAFT-${Date.now().toString().slice(-6)}`;
                      setCurrentDraftId(autoDraftId);
                      setRows([createEmptyRow()]);
                    } else {
                      loadDraft(e.target.value);
                    }
                  }}
                  className="px-3 py-1.5 text-xs border border-teal-300 dark:border-teal-700 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold cursor-pointer focus:outline-hidden"
                >
                  <option value="NEW">+ Start New Draft</option>
                  {availableDrafts.map((d) => (
                    <option key={d.draftId} value={d.draftId}>
                      {d.draftId} ({d.items.length} items • {d.division || "ALL"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              title="Close Count Sheet"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 1st ROW: Common Session / Header Fields spanning full width */}
        <div className="px-6 lg:px-8 py-3 bg-gray-50/90 dark:bg-slate-950/80 border-b border-gray-200 dark:border-slate-800 shrink-0 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Storage Location */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin size={12} className="text-teal-500" />
                STORAGE LOCATION
              </label>
              <select
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                <option value="">Select Location</option>
                {locations.map((l) => (
                  <option key={l.location || l} value={l.location || l}>
                    {l.location || l}
                  </option>
                ))}
              </select>
            </div>

            {/* Firm / Division */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 size={12} className="text-teal-500" />
                FIRM / DIVISION
              </label>
              <select
                value={formDivision}
                onChange={(e) => handleDivisionChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                <option value="">All Firms</option>
                {divisions.map((d) => (
                  <option key={d.name || d} value={d.name || d}>
                    {d.name || d}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Type */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Layers size={12} className="text-teal-500" />
                MATERIAL TYPE *
              </label>
              <select
                value={formMaterialType}
                onChange={(e) => setFormMaterialType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                {filteredMaterialTypes.map((mt) => (
                  <option key={mt.type_code} value={mt.type_code}>
                    {mt.type_name} ({mt.type_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Counted By */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User size={12} className="text-teal-500" />
                COUNTED BY
              </label>
              <input
                type="text"
                value={formCountedBy}
                onChange={(e) => setFormCountedBy(e.target.value)}
                placeholder="Auditor / User name"
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Count Date & Time */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-teal-500" />
                COUNT DATE &amp; TIME
              </label>
              <input
                type="datetime-local"
                value={formCountedDate}
                onChange={(e) => setFormCountedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* MAIN BODY: Full-dimension scrollable table container */}
        <div className="flex-1 flex flex-col min-h-0 px-6 lg:px-8 py-4 overflow-hidden">
          <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col bg-white dark:bg-slate-900">
            {/* Scrollable Table Area */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-slate-300 font-bold border-b border-gray-200 dark:border-slate-800 select-none shadow-2xs">
                  <tr>
                    <th className="w-12 px-3 py-3.5 text-center whitespace-nowrap">#</th>
                    <th className="px-4 py-3.5 w-[280px] min-w-[220px] whitespace-nowrap">SKU *</th>
                    <th className="px-4 py-3.5 min-w-[240px] whitespace-nowrap">
                      SUB-CATEGORY (MATERIAL NAME)
                    </th>
                    <th className="px-4 py-3.5 w-[160px] min-w-[130px] whitespace-nowrap">CATEGORY</th>
                    <th className="px-4 py-3.5 text-right w-[160px] min-w-[130px] whitespace-nowrap">
                      CURRENT STOCK QTY
                    </th>
                    <th className="px-4 py-3.5 text-right w-[180px] min-w-[150px] whitespace-nowrap">
                      PHYSICAL STOCK QTY *
                    </th>
                    <th className="px-4 py-3.5 text-right w-[160px] min-w-[130px] whitespace-nowrap">
                      DIFFERENCE
                    </th>
                    <th className="w-12 px-2 py-3.5 text-center whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {rows.map((row, idx) => {
                    const diff = row.differenceQty;
                    return (
                      <tr
                        key={row.tempId || row.id || idx}
                        className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Index */}
                        <td className="px-3 py-3 text-center text-gray-400 font-mono text-xs">
                          {idx + 1}
                        </td>

                        {/* SKU Searchable Select */}
                        <td className="px-4 py-3">
                          <SearchableSelect
                            value={row.sku}
                            onChange={(sku, opt) => handleRowSkuChange(idx, sku, opt)}
                            options={skuOptions}
                            placeholder="Select / search SKU..."
                          />
                        </td>

                        {/* Material Name / Sub-category */}
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                          {row.name ? (
                            <span title={row.name} className="truncate block max-w-[300px]">
                              {row.name}
                            </span>
                          ) : (
                            <SearchableSelect
                              value={row.sku}
                              onChange={(sku, opt) => handleRowSkuChange(idx, sku, opt)}
                              options={materialNameOptions}
                              placeholder="Or select material name..."
                            />
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.category ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                              {row.category}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-700">—</span>
                          )}
                        </td>

                        {/* Current Stock Qty (System) */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                          {row.sku ? (
                            <span className="text-sm">
                              {Number(row.systemStock).toLocaleString()}{" "}
                              <span className="text-xs font-normal text-gray-400">
                                {row.unit || "KG"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-700">—</span>
                          )}
                        </td>

                        {/* Physical Stock Qty Input */}
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={row.physicalQty}
                            onChange={(e) => handleRowPhysicalQtyChange(idx, e.target.value)}
                            // placeholder="Counted qty"
                            className="w-full px-3 py-1.5 text-right text-xs font-black text-teal-700 dark:text-teal-300 border border-gray-200 dark:border-slate-800 rounded-xl bg-teal-50/40 dark:bg-teal-950/30 focus:ring-2 focus:ring-teal-500 focus:outline-hidden shadow-2xs"
                          />
                        </td>

                        {/* Difference Pill */}
                        <td className="px-4 py-3 text-right font-black whitespace-nowrap">
                          {diff !== null ? (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                diff > 0
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : diff < 0
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                  : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff} {row.unit || ""}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-700">—</span>
                          )}
                        </td>

                        {/* Action: Remove */}
                        <td className="px-2 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            title="Remove Row"
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-gray-50/80 dark:bg-slate-950/70 border-t border-gray-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 hover:border-teal-500 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 shadow-2xs hover:text-teal-600 cursor-pointer transition-all active:scale-95"
                >
                  <Plus size={15} className="text-teal-600" />
                  <span>Add Row</span>
                </button>

                <button
                  type="button"
                  onClick={handlePopulateAllMaterials}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-200 shadow-2xs hover:text-indigo-600 cursor-pointer transition-all active:scale-95"
                >
                  <Layers size={14} className="text-indigo-500" />
                  <span>
                    Populate All {formMaterialType === "FG" ? "FG" : "RM"}{" "}
                    {formDivision ? `(${formDivision})` : ""}
                  </span>
                </button>

                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows([createEmptyRow()])}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Table</span>
                  </button>
                )}
              </div>

              {/* Summary Stats Strip */}
              <div className="flex items-center gap-6 text-xs font-bold text-gray-600 dark:text-slate-400 flex-wrap">
                <div>
                  Items:{" "}
                  <span className="text-gray-900 dark:text-white font-black text-sm">
                    {summary.count}
                  </span>
                </div>
                <div>
                  System Stock:{" "}
                  <span className="text-gray-900 dark:text-white font-bold text-sm">
                    {summary.totalSys.toLocaleString()}
                  </span>
                </div>
                <div>
                  Physical Count:{" "}
                  <span className="text-teal-600 dark:text-teal-400 font-black text-sm">
                    {summary.totalPhy.toLocaleString()}
                  </span>
                </div>
                <div>
                  Net Variance:{" "}
                  <span
                    className={`font-black text-sm ${
                      summary.totalDiff > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : summary.totalDiff < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-500"
                    }`}
                  >
                    {summary.totalDiff > 0
                      ? `+${summary.totalDiff.toLocaleString()}`
                      : summary.totalDiff.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Single Common Remark input placed below the table */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-6 py-2.5 bg-gray-50/70 dark:bg-slate-950/60 border-t border-gray-200 dark:border-slate-800 shrink-0">
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <FileText size={12} className="text-teal-500" />
                REMARKS / OBSERVATION NOTE:
              </label>
              <input
                type="text"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Enter common observation note / remarks for this count sheet (applied to all items in this draft)..."
                className="flex-1 px-3.5 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden placeholder:text-gray-400 dark:placeholder:text-slate-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 lg:px-8 py-3.5 border-t border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <CheckCircle2 size={16} className="text-teal-500 shrink-0" />
            <span>
              <strong>Save</strong> preserves entries as a draft.{" "}
              <strong>Save &amp; Submit</strong> sends the draft for Admin approval.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {/* SAVE: Saves the entry as draft */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveAction("Draft")}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>Save</span>
            </button>

            {/* SAVE & SUBMIT: Submits the entries */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveAction("Pending")}
              className="flex items-center gap-2 px-7 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>Save &amp; Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
