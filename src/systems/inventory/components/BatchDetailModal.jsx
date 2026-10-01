// src/systems/inventory/components/BatchDetailModal.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  X,
  Plus,
  Layers,
  Calendar,
  CheckCircle2,
  Hash,
  Scale,
  Eye,
  Search,
  Loader2,
} from "lucide-react";
import { generateBatchDetailPdfHtml } from "./batchDetailPdfTemplate";
import { useMagicToast } from "../../../context/MagicToastContext";
import {
  saveBatchDetailForm,
  createRmMaterial,
} from "../services/batchDetailApi";
import { fetchInventoryData } from "../../../redux/slice/inventorySlice";

const EMPTY_SHEET = {
  productName: "",
  totalBatches: "",
  materialConsumption: "",
  mixtureTemp: "",
  coolingTemp: "",
  remarks: "",
  balanceCompounding: "",
  returnPanelScrap: "",
};

const SHEET_FIELDS = [
  { key: "productName", label: "Product Name" },
  { key: "totalBatches", label: "Total Batches" },
  { key: "materialConsumption", label: "Total Material Consumption" },
  { key: "mixtureTemp", label: "Mixture Temperature" },
  { key: "coolingTemp", label: "Cooling Temperature" },
  { key: "balanceCompounding", label: "Balance Compounding (Batch)" },
  { key: "returnPanelScrap", label: "Return Panel Scrap" },
];

const GROUP_COLORS = [
  "#fed7aa", "#fae8ff", "#bfdbfe", "#bbf7d0", "#fef9c3",
  "#ffe4e6", "#bae6fd", "#e9d5ff", "#d9f99d", "#e2e8f0",
];

const inputCls =
  "w-full px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";

export default function BatchDetailModal({
  isOpen,
  onClose,
  activeUser,
  categories = [],
  masterMaterials = [],
  onSaved,
}) {
  const { showToast } = useMagicToast();
  const dispatch = useDispatch();

  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(getTodayStr());
  const [sheet, setSheet] = useState(EMPTY_SHEET);
  const [quantities, setQuantities] = useState({}); // materialId -> qty string
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formNoPreview, setFormNoPreview] = useState("");

  // Inline "+" add states
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "" });
  const [isCreating, setIsCreating] = useState(false);

  const computeNextFormNo = useCallback((selectedDate) => {
    const cleanDate = (selectedDate || getTodayStr()).replace(/-/g, "");
    const prefix = `BD-${cleanDate}-`;
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem("inventory_batch_details") || "[]");
    } catch {
      existing = [];
    }
    let maxSeq = 0;
    (existing || [])
      .filter((f) => f && f.formNo && f.formNo.startsWith(prefix))
      .forEach((f) => {
        const parts = f.formNo.split("-");
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      });
    return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
  }, []);

  useEffect(() => {
    if (isOpen) setFormNoPreview(computeNextFormNo(date));
  }, [isOpen, date, computeNextFormNo]);

  useEffect(() => {
    if (isOpen) {
      setDate(getTodayStr());
      setSheet(EMPTY_SHEET);
      setQuantities({});
      setSearch("");
      setAddingProduct(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Raw materials list: product + SKU only (no category)
  const products = useMemo(() => {
    const seen = new Set();
    const out = [];
    (masterMaterials || []).forEach((m) => {
      const mType = (m.materialType || m.material_type || "RM").toUpperCase();
      if (mType !== "RM") return;
      const name = (m.name || m.sku || "").trim();
      if (!name || seen.has(m.id)) return;
      seen.add(m.id);
      const catName = (m.category || "Raw Material").trim();
      const cat = (categories || []).find(
        (c) => String(c?.name ?? c).trim().toLowerCase() === catName.toLowerCase()
      );
      out.push({
        materialId: m.id,
        productName: name,
        sku: (m.sku || "").trim(),
        category: catName,
        categoryId: cat?.id ?? null,
      });
    });
    return out.sort((a, b) => Number(a.materialId) - Number(b.materialId));
  }, [categories, masterMaterials]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  // Group rows by product name (like the factory sheet): name cell spans its SKUs
  const productGroups = useMemo(() => {
    const map = new Map();
    visibleProducts.forEach((p) => {
      const key = p.productName.toLowerCase();
      if (!map.has(key)) map.set(key, { name: p.productName, items: [] });
      map.get(key).items.push(p);
    });
    let sno = 0;
    return Array.from(map.values()).map((g, gi) => ({
      ...g,
      color: GROUP_COLORS[gi % GROUP_COLORS.length],
      startSno: (sno += g.items.length) - g.items.length,
    }));
  }, [visibleProducts]);

  const filledItems = useMemo(
    () =>
      products
        .map((p) => ({ ...p, quantity: Number(quantities[p.materialId]) }))
        .filter((p) => p.quantity > 0),
    [products, quantities]
  );

  const totalQty = useMemo(
    () => filledItems.reduce((s, it) => s + it.quantity, 0),
    [filledItems]
  );

  const setQty = (materialId, val) =>
    setQuantities((prev) => ({ ...prev, [materialId]: val }));

  const refreshMasterData = async () => {
    try {
      await dispatch(fetchInventoryData()).unwrap();
    } catch (err) {
      console.warn("Could not refresh inventory data:", err);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      showToast("Enter a product name.", "warning");
      return;
    }
    setIsCreating(true);
    try {
      await createRmMaterial({ name: newProduct.name, sku: newProduct.sku });
      await refreshMasterData();
      showToast(`"${newProduct.name.trim()}" added.`, "success");
      setNewProduct({ name: "", sku: "" });
      setAddingProduct(false);
    } catch (err) {
      showToast(`Could not add product: ${err?.message || "unknown error"}`, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const buildSheetDetails = () =>
    Object.fromEntries(
      Object.entries(sheet).map(([k, v]) => [k, String(v ?? "").trim()])
    );

  const handlePreviewPdf = () => {
    const previewRecord = {
      formNo: formNoPreview || computeNextFormNo(date),
      date,
      sheetDetails: buildSheetDetails(),
      createdBy: activeUser?.name || "Admin",
      items: filledItems.map((it, idx) => ({
        sno: idx + 1,
        category: it.category,
        productName: it.productName,
        sku: it.sku || "",
        quantity: it.quantity,
      })),
      totalQuantity: totalQty,
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date) {
      showToast("Please select a date.", "warning");
      return;
    }
    if (filledItems.length === 0) {
      showToast("Enter a quantity for at least one SKU.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const generatedFormNo = formNoPreview || computeNextFormNo(date);

      await saveBatchDetailForm({
        formNo: generatedFormNo,
        productionDate: new Date(date).toISOString(),
        sheetDetails: buildSheetDetails(),
        items: filledItems.map((it) => ({
          categoryId: it.categoryId,
          category: it.category,
          materialId: it.materialId,
          productName: it.productName,
          sku: it.sku || null,
          quantity: it.quantity,
        })),
      });

      showToast(`Batch Detail Form #${generatedFormNo} saved successfully!`, "success");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save batch detail:", err);
      showToast(
        err?.message ? `Save failed: ${err.message}` : "Failed to save batch detail. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl shadow-inner">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black tracking-tight text-white">
                  NUTECH COMPOSITE - Batch Detail
                </h2>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-bold rounded-lg tracking-wider backdrop-blur-md">
                  {formNoPreview || "BD-XXXX"}
                </span>
              </div>
              <p className="text-xs text-violet-100 font-medium mt-0.5">
                Enter produced quantity against each SKU, as in the factory sheet
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Date / Form No */}
            <div className="bg-gray-50/70 dark:bg-slate-950/70 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Hash size={13} className="text-violet-500" />
                  Form Number
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 text-xs font-mono font-bold text-violet-700 dark:text-violet-300 select-all">
                  {formNoPreview || "Auto-generating..."}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-violet-500" />
                  Date *
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

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-5 items-start">
              {/* LEFT: SKU sheet */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search product / SKU..."
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddingProduct((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                    title="Add a new product and SKU"
                  >
                    <Plus size={14} />
                    <span>Add Product / SKU</span>
                  </button>
                </div>

                {addingProduct && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20">
                    <input
                      type="text"
                      autoFocus
                      value={newProduct.name}
                      onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Product name (e.g. PVC RESIN-KPP)"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateProduct();
                        }
                      }}
                      placeholder="SKU code"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      disabled={isCreating}
                      onClick={handleCreateProduct}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {isCreating ? <Loader2 size={14} className="animate-spin" /> : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingProduct(false)}
                      className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="border border-gray-300 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="w-12 px-2 py-2 bg-green-300 text-sky-700 font-black border border-gray-400/60">S.NO</th>
                        <th className="w-44 px-2 py-2 bg-green-300 text-black font-black border border-gray-400/60">PRODUCT NAME</th>
                        <th className="px-2 py-2 bg-green-300 text-black font-black border border-gray-400/60">SKU CODE</th>
                        <th className="w-28 px-2 py-2 bg-[#004b87] text-white font-black border border-gray-400/60">QTY.</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-slate-100">
                      {visibleProducts.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400">
                            No raw materials found. Use "Add Product / SKU" to create one.
                          </td>
                        </tr>
                      )}
                      {productGroups.map((g) =>
                        g.items.map((p, i) => (
                          <tr key={p.materialId}>
                            <td className="border border-gray-300 dark:border-slate-700 px-2 py-1 text-center font-bold">
                              {g.startSno + i + 1}
                            </td>
                            {i === 0 && (
                              <td
                                rowSpan={g.items.length}
                                style={{ backgroundColor: g.color }}
                                className="border border-gray-300 dark:border-slate-700 px-3 py-1 text-center align-middle font-extrabold uppercase text-black"
                              >
                                {g.name}
                              </td>
                            )}
                            <td className="border border-gray-300 dark:border-slate-700 px-3 py-1 font-bold uppercase">
                              {p.sku || p.productName}
                            </td>
                            <td className="border border-gray-300 dark:border-slate-700 p-0">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={quantities[p.materialId] ?? ""}
                                onChange={(e) => setQty(p.materialId, e.target.value)}
                                className="w-full px-2 py-1.5 text-right font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none focus:bg-violet-50 dark:focus:bg-violet-950/30"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-slate-950">
                        <td colSpan={3} className="px-3 py-2 text-right font-black border border-gray-300 dark:border-slate-700">
                          TOTAL -
                        </td>
                        <td className="px-3 py-2 text-right font-black text-violet-700 dark:text-violet-300 border border-gray-300 dark:border-slate-700">
                          {totalQty.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* RIGHT: sheet fields */}
              <div className="space-y-3 lg:sticky lg:top-0">
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  {SHEET_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1 uppercase">
                        {f.label}
                      </label>
                      <input
                        type="text"
                        value={sheet[f.key]}
                        onChange={(e) => setSheet((p) => ({ ...p, [f.key]: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1 uppercase">
                      Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={sheet.remarks}
                      onChange={(e) => setSheet((p) => ({ ...p, remarks: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-150 dark:border-violet-900/40 space-y-2">
                  <span className="text-xs font-bold text-violet-900 dark:text-violet-200 flex items-center gap-2">
                    <Scale size={16} className="text-violet-600" />
                    Form Summary
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-slate-400">SKUs filled</span>
                    <span className="font-black text-gray-900 dark:text-white">{filledItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-slate-400">Total Quantity</span>
                    <span className="font-black text-violet-700 dark:text-violet-300">{totalQty.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0 gap-3 flex-wrap">
            <span className="text-xs text-gray-400 dark:text-slate-500">
              Only SKUs with a quantity are saved
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
                title="Preview PDF template in new tab"
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

