// src/systems/inventory/components/BatchDetailHistoryView.jsx
import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  FileText,
  Trash2,
} from "lucide-react";
import BatchDetailModal from "./BatchDetailModal";
import { generateBatchDetailPdfHtml } from "./batchDetailPdfTemplate";
import { useMagicToast } from "../../../context/MagicToastContext";
import {
  fetchBatchDetailForms,
  deleteBatchDetailForm,
} from "../services/batchDetailApi";

export default function BatchDetailHistoryView({ activeUser }) {
  const { showToast } = useMagicToast();

  const {
    categories: categoriesFromDb = [],
    masterMaterials = [],
  } = useSelector((state) => state.inventory || {});

  // State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load from Supabase
  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await fetchBatchDetailForms();
      setRecords(
        data.map((f) => ({
          id: f.id,
          formNo: f.form_no,
          date: f.production_date,
          createdAt: f.created_at,
          shift: f.shift || "",
          sheetDetails: f.sheet_details || {},
          items: (f.batch_detail_items || []).map((it) => ({
            category: it.category_name,
            productName: it.material_name,
            sku: it.sku || "",
            quantity: it.qty,
          })),
        }))
      );
    } catch (err) {
      console.error("Failed to load batch detail forms:", err);
      showToast("Failed to load batch detail records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Delete form record
  const handleDelete = async (record) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Batch Detail Form #${record.formNo}? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteBatchDetailForm(record.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      showToast(`Batch Detail #${record.formNo} deleted successfully.`, "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete record.", "error");
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const recDate = rec.date ? rec.date.slice(0, 10) : "";
      if (fromDate && recDate < fromDate) return false;
      if (toDate && recDate > toDate) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesFormNo = (rec.formNo || "").toLowerCase().includes(q);
        const matchesItem = (rec.items || []).some(
          (it) =>
            (it.category || "").toLowerCase().includes(q) ||
            (it.productName || "").toLowerCase().includes(q) ||
            (it.sku || "").toLowerCase().includes(q)
        );
        if (!matchesFormNo && !matchesItem) return false;
      }

      return true;
    });
  }, [records, search, fromDate, toDate]);

  // KPI stats
  const stats = useMemo(
    () => ({
      totalForms: filteredRecords.length,
      totalItems: filteredRecords.reduce(
        (s, r) => s + (r.items || []).length,
        0
      ),
      totalQty: filteredRecords.reduce(
        (s, r) =>
          s +
          (r.items || []).reduce(
            (q, it) => q + (Number(it.quantity) || 0),
            0
          ),
        0
      ),
    }),
    [filteredRecords]
  );

  // Generate and print PDF
  const handlePrintPdf = (record) => {
    if (!record) return;
    const printHtml = generateBatchDetailPdfHtml(record, { isPreview: false });
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast(
        "Pop-up blocked. Please allow pop-ups to download PDF.",
        "warning"
      );
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
                Track, audit, and download PDF sheets for finished goods
                production batches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadRecords}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
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
        <div className="grid grid-cols-3 gap-3 mt-6">
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
              Total Items
            </span>
            <div className="text-xl font-black text-violet-700 dark:text-violet-300 mt-1">
              {stats.totalItems.toLocaleString()}
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
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Form No, Product, Category, SKU..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-gray-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                From:
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-gray-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                To:
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              />
            </div>
            {(search || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
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
                <th className="px-6 py-3.5">Form No</th>
                <th className="px-6 py-3.5">Production Date</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-violet-500"
                      />
                      <span className="text-xs text-gray-400">
                        Loading batch detail records...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-14 text-center">
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
                          : "No records match your filter criteria. Try adjusting your search or date filter."}
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
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="group hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Form No */}
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 px-2.5 py-1 rounded-lg border border-violet-100 dark:border-violet-900/40">
                        {rec.formNo}
                      </span>
                    </td>

                    {/* Production Date */}
                    <td className="px-6 py-4 font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                      {rec.date
                        ? new Date(rec.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintPdf(rec)}
                          title="Download / Print PDF"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <FileText size={13} />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec)}
                          title="Delete form"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Detail Modal */}
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
