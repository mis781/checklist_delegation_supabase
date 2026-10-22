import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
  Layers,
  Search,
  FileSpreadsheet,
  Package,
  Calendar,
  Warehouse,
  ArrowDownRight
} from "lucide-react";
import { fdate, qty } from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";

export default function OrderReturnStockView() {
  const { movements } = useOrderReturn();
  const [filterQuery, setFilterQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredMovements = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return movements.filter((m) => {
      const matchQ =
        !q ||
        (m.ref || "").toLowerCase().includes(q) ||
        (m.returnNo || "").toLowerCase().includes(q) ||
        (m.product || "").toLowerCase().includes(q) ||
        (m.warehouse || "").toLowerCase().includes(q) ||
        (m.grn || "").toLowerCase().includes(q);

      const matchType =
        typeFilter === "all" ||
        (typeFilter === "scrap" ? m.stockType === "Scrap" : m.stockType !== "Scrap");

      return matchQ && matchType;
    });
  }, [movements, filterQuery, typeFilter]);

  const handleExportExcel = () => {
    try {
      const rows = filteredMovements.map((m) => ({
        "Posting Ref": m.ref || "—",
        "GRN": m.grn,
        "Return No": m.returnNo,
        "Date": m.date,
        "Product": m.product,
        "Quantity": m.qty,
        "UOM": m.uom,
        "Stock Type": m.stockType,
        "Destination Warehouse": m.warehouse,
        "Movement Nature": m.movement,
        "Invoice No": m.invoiceNo || "—",
        "Posted By": m.by || "—"
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Return Stock Movements");
      XLSX.writeFile(wb, `Order_Return_Stock_Movements_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Stock register exported successfully!");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Return Stock & Scrap Movements Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Official ERP audit ledger of salable finished goods receipts, raw materials, and scrap postings.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all flex items-center gap-2 shadow-xs shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Export Stock Ledger
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by posting ref (SA-), GRN, product, or warehouse..."
            className="w-full text-xs bg-transparent border-none focus:outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Filter Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="all">All Movements</option>
            <option value="stock">Salable Stock Only (FG/Semi-FG/RM)</option>
            <option value="scrap">Scrap Yard Postings Only</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-xs">
        {filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No stock movements found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Posting Ref</th>
                  <th className="py-3 px-4">GRN Ref</th>
                  <th className="py-3 px-4">Return No.</th>
                  <th className="py-3 px-4">Posting Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Stock Type</th>
                  <th className="py-3 px-4">Destination Warehouse</th>
                  <th className="py-3 px-4">Movement Nature</th>
                  <th className="py-3 px-4">Posted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMovements.map((m) => {
                  const isScrap = m.stockType === "Scrap";
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {m.ref || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {m.grn}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {m.returnNo}
                      </td>
                      <td className="py-3 px-4">{fdate(m.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {m.product}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100">
                        {qty(m.qty, m.uom)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            isScrap
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {m.stockType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {m.warehouse}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {m.movement}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {m.by || "Store / QC"}
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
