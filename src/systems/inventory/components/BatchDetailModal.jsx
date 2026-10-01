// src/systems/inventory/components/BatchDetailModal.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Layers,
  Calendar,
  CheckCircle2,
  Hash,
  Boxes,
  Scale,
  ChevronDown,
  Search,
  Check,
  Eye,
} from "lucide-react";
import { generateBatchDetailPdfHtml } from "./batchDetailPdfTemplate";
import { useMagicToast } from "../../../context/MagicToastContext";
import { saveBatchDetailForm } from "../services/batchDetailApi";

// Searchable Custom Select Component for Row Dropdowns
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
  className = "",
  error = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions = useMemo(() => {
    return (options || [])
      .filter(Boolean)
      .map((opt) => {
        if (typeof opt === "string" || typeof opt === "number") {
          return { label: String(opt), value: String(opt) };
        }
        if (opt && typeof opt === "object") {
          const label = String(opt.label ?? opt.name ?? opt.value ?? "");
          const val = String(opt.value ?? opt.sku ?? opt.name ?? "");
          return { label, value: val, ...opt };
        }
        return null;
      })
      .filter((opt) => opt && opt.label);
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sku && opt.sku.toLowerCase().includes(q))
    );
  }, [normalizedOptions, query]);

  const selected = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value || opt.label === value);
  }, [normalizedOptions, value]);

  return (
    <div ref={containerRef} className={`relative text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setQuery("");
          }
        }}
        className={`w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs ${
          error
            ? "border-rose-400 dark:border-rose-700 bg-rose-50/20"
            : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`truncate font-medium ${
            selected
              ? "text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-slate-500"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 shrink-0 ml-1.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col min-w-[220px] max-h-56 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/70">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-40 p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 dark:text-slate-500 text-center">
                No results found
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = selected && (selected.value === opt.value || selected.label === opt.label);
                return (
                  <button
                    key={`${opt.value}-${i}`}
                    type="button"
                    onClick={() => {
                      onChange(opt.value, opt);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-bold"
                        : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={12} className="text-violet-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BatchDetailModal({
  isOpen,
  onClose,
  activeUser,
  categories = [],
  masterMaterials = [],
  onSaved,
}) {
  const { showToast } = useMagicToast();

  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  // Form Header States
  const [date, setDate] = useState(getTodayStr());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: compute next Form No
  const computeNextFormNo = useCallback((selectedDate) => {
    const targetDate = selectedDate || getTodayStr();
    const cleanDate = targetDate.replace(/-/g, "");
    const prefix = `BD-${cleanDate}-`;
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem("inventory_batch_details") || "[]");
    } catch {
      existing = [];
    }
    const todayForms = (existing || []).filter(
      (f) => f && f.formNo && f.formNo.startsWith(prefix)
    );
    let maxSeq = 0;
    todayForms.forEach((f) => {
      const parts = f.formNo.split("-");
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(4, "0");
    return `${prefix}${nextSeq}`;
  }, []);

  const [formNoPreview, setFormNoPreview] = useState("");

  // Items State (multi-row: only category, productName, sku, quantity)
  const createEmptyRow = () => ({
    id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    category: "",
    categoryId: null,
    productName: "",
    materialId: null,
    sku: "",
    quantity: "",
  });

  const [items, setItems] = useState([createEmptyRow()]);

  // Update form number preview whenever date changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormNoPreview(computeNextFormNo(date));
    }
  }, [isOpen, date, computeNextFormNo]);

  // Reset modal state upon opening
  useEffect(() => {
    if (isOpen) {
      setDate(getTodayStr());
      setItems([createEmptyRow()]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // 1. Filtered Finished Goods Categories (Dropdown list)
  const fgCategories = useMemo(() => {
    const catSet = new Set();

    const isExcludedCat = (name) => {
      if (!name) return true;
      const lower = String(name).trim().toLowerCase();
      return (
        lower === "raw material" ||
        lower === "finished goods" ||
        lower === "finished good"
      );
    };

    // From Redux categories table
    (categories || []).forEach((c) => {
      const mType = (
        typeof c === "string"
          ? ""
          : c?.materialType || c?.material_type || ""
      ).toUpperCase();
      const catName = typeof c === "string" ? c : c?.name;
      if (
        (mType === "FG" || mType === "FINISHED GOODS" || !mType) &&
        catName &&
        !isExcludedCat(catName)
      ) {
        catSet.add(catName.trim());
      }
    });

    // Also extract categories from masterMaterials where materialType is FG
    (masterMaterials || []).forEach((m) => {
      const mType = (m.materialType || m.material_type || "").toUpperCase();
      if (mType === "FG" && m.category && !isExcludedCat(m.category)) {
        catSet.add(m.category.trim());
      }
    });

    const list = Array.from(catSet)
      .filter((name) => !isExcludedCat(name))
      .sort();
    return list.map((name) => ({ label: name, value: name }));
  }, [categories, masterMaterials]);

  // 2. Helper to get products for a specific category
  const getProductsForCategory = (catName) => {
    if (!catName) return [];
    const prodMap = new Map();

    (masterMaterials || []).forEach((m) => {
      const mType = (m.materialType || m.material_type || "").toUpperCase();
      const itemCat = (m.category || "").trim().toLowerCase();
      const targetCat = catName.trim().toLowerCase();

      // Check category match and Finished Goods type
      if (itemCat === targetCat && (mType === "FG" || !mType)) {
        const prodName = (m.name || m.subCategory || m.sku || "").trim();
        const sku = (m.sku || "").trim();
        if (prodName) {
          if (!prodMap.has(prodName) || !prodMap.get(prodName).sku) {
            prodMap.set(prodName, {
              label: prodName,
              value: prodName,
              materialId: m.id,
              sku: sku,
              unit: m.unit || "PCS",
            });
          }
        }
      }
    });

    return Array.from(prodMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  };

  // Row update handlers for Finished Goods Items
  const handleRowChange = (rowId, field, val, optionObj) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (field === "category") {
          // Find category id from categories list
          const catObj = (categories || []).find(
            (c) => (c.name || c) === val
          );
          return {
            ...row,
            category: val,
            categoryId: catObj?.id ?? null,
            productName: "",
            materialId: null,
            sku: "",
          };
        }

        if (field === "productName") {
          // Product changed -> autofill SKU and materialId
          const prods = getProductsForCategory(row.category);
          const found = prods.find((p) => p.value === val);
          return {
            ...row,
            productName: val,
            materialId: found?.materialId ?? null,
            sku: found ? found.sku : "",
          };
        }

        return {
          ...row,
          [field]: val,
        };
      })
    );
  };

  const handleAddRow = () => {
    setItems((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId) => {
    if (items.length <= 1) {
      showToast("At least one product item is required.", "warning");
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Summary Computations
  const totals = useMemo(() => {
    let totalQty = 0;

    items.forEach((it) => {
      totalQty += Number(it.quantity) || 0;
    });

    return { totalQty, totalItems: items.length };
  }, [items]);

  // Open PDF template preview in new tab based on currently filled materials
  const handlePreviewPdf = () => {
    const previewRecord = {
      formNo: formNoPreview || computeNextFormNo(date),
      date: date,
      createdBy: activeUser?.name || "Admin",
      items: items.map((it, idx) => ({
        sno: idx + 1,
        category: it.category,
        productName: it.productName,
        sku: it.sku || "",
        quantity: it.quantity ? Number(it.quantity) : "",
      })),
      totalQuantity: totals.totalQty,
    };

    const previewHtml = generateBatchDetailPdfHtml(previewRecord, { isPreview: true });
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      showToast("Pop-up blocked. Please allow pop-ups to preview PDF.", "warning");
      return;
    }
    previewWindow.document.open();
    previewWindow.document.write(previewHtml);
    previewWindow.document.close();
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date) {
      showToast("Please select a date.", "warning");
      return;
    }

    // Validate item rows
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.category) {
        showToast(`Product Item #${i + 1}: Please select a Category.`, "warning");
        return;
      }
      if (!row.productName) {
        showToast(`Product Item #${i + 1}: Please select a Sub Category.`, "warning");
        return;
      }
      if (!row.quantity || Number(row.quantity) <= 0) {
        showToast(`Product Item #${i + 1}: Please enter a valid Quantity.`, "warning");
        return;
      }
      if (!row.materialId) {
        showToast(`Product Item #${i + 1}: Could not resolve material ID. Please re-select Sub Category.`, "warning");
        return;
      }
      if (!row.categoryId) {
        showToast(`Product Item #${i + 1}: Could not resolve category ID. Please re-select Category.`, "warning");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const generatedFormNo = formNoPreview || computeNextFormNo(date);

      await saveBatchDetailForm({
        formNo: generatedFormNo,
        productionDate: new Date(date).toISOString(),
        items: items.map((it) => ({
          categoryId: it.categoryId,
          category: it.category,
          materialId: it.materialId,
          productName: it.productName,
          sku: it.sku || null,
          quantity: Number(it.quantity) || 0,
        })),
      });

      showToast(`Batch Detail Form #${generatedFormNo} saved successfully!`, "success");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save batch detail:", err);
      showToast(
        err?.message
          ? `Save failed: ${err.message}`
          : "Failed to save batch detail. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl shadow-inner">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Add Batch Detail Form
                </h2>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-bold rounded-lg tracking-wider backdrop-blur-md">
                  {formNoPreview || "BD-XXXX"}
                </span>
              </div>
              <p className="text-xs text-violet-100 font-medium mt-0.5">
                Record finished goods production items and quantities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Form Meta Section: Date, Form No (Shift removed) */}
            <div className="bg-gray-50/70 dark:bg-slate-950/70 p-4.5 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Form No Display */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Hash size={13} className="text-violet-500" />
                  Form Number
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 text-xs font-mono font-bold text-violet-700 dark:text-violet-300 select-all">
                  {formNoPreview || "Auto-generating..."}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-violet-500" />
                  Production Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Finished Goods Production Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-lg">
                    <Boxes size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Finished Goods Production Items ({items.length})
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      Select finished goods category, sub category, and quantity produced
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Plus size={14} />
                  <span>Add Product Item</span>
                </button>
              </div>

              {/* Items Card List */}
              <div className="space-y-3">
                {items.map((row, index) => {
                  const productOptions = getProductsForCategory(row.category);

                  return (
                    <div
                      key={row.id}
                      className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-violet-300 dark:hover:border-violet-900/60 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-violet-600 text-white font-black text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
                            {row.productName || "New Product Item"}
                          </span>
                          {row.sku && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-[11px] font-mono text-gray-600 dark:text-slate-400">
                              {row.sku}
                            </span>
                          )}
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Row Inputs Grid: Category, Sub Category, SKU Code (Auto), Quantity */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* 1. Category */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                            Category *
                          </label>
                          <SearchableSelect
                            value={row.category}
                            onChange={(val) => handleRowChange(row.id, "category", val)}
                            options={fgCategories}
                            placeholder="Select Category"
                            error={!row.category}
                          />
                        </div>

                        {/* 2. Sub Category (internally productName) */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                            Sub Category *
                          </label>
                          <SearchableSelect
                            value={row.productName}
                            onChange={(val) => handleRowChange(row.id, "productName", val)}
                            options={productOptions}
                            placeholder={
                              row.category
                                ? productOptions.length > 0
                                  ? "Select Sub Category"
                                  : "No sub categories in category"
                                : "Select category first"
                            }
                            disabled={!row.category}
                            error={!row.productName && !!row.category}
                          />
                        </div>

                        {/* 3. SKU Code (Autofilled & Read-only) */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                            SKU Code (Auto)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={row.sku || ""}
                            placeholder="Auto-filled SKU"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-100/70 dark:bg-slate-950 text-xs font-mono text-gray-600 dark:text-slate-400 cursor-not-allowed select-all"
                          />
                        </div>

                        {/* 4. Quantity */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.id, "quantity", e.target.value)}
                            placeholder="e.g. 150"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Row Add */}
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-700/60 rounded-2xl text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 flex items-center justify-center gap-2 transition-all cursor-pointer bg-gray-50/50 dark:bg-slate-950/30"
              >
                <Plus size={15} />
                <span>+ Add Another Product Item</span>
              </button>
            </div>

            {/* Totals Summary Bar */}
            <div className="p-4 rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-150 dark:border-violet-900/40 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-bold text-violet-900 dark:text-violet-200 flex items-center gap-2">
                <Scale size={16} className="text-violet-600" />
                Form Summary:
              </span>
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-slate-400">Total Items: </span>
                  <span className="font-black text-gray-900 dark:text-white">
                    {items.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400">Total Quantity: </span>
                  <span className="font-black text-violet-700 dark:text-violet-300">
                    {totals.totalQty.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-400 dark:text-slate-500">
              * Required fields: Category, Sub Category, Quantity
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePreviewPdf}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Preview PDF template with entered materials in new tab"
              >
                <Eye size={15} />
                <span>Preview PDF</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-violet-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                <span>{isSubmitting ? "Saving..." : "Save Batch Detail"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
