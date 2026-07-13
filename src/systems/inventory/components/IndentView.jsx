// src/systems/inventory/components/IndentView.jsx
import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  X,
  FileText,
  CheckCircle,
  Clock
} from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import { updateIndentStatus } from '../../../redux/slice/inventorySlice';

export default function IndentView({ activeUser }) {
  const dispatch = useDispatch();
  const { indents, settings, divisions = [] } = useSelector((state) => state.inventory);

  const isViewer = activeUser.role === 'Viewer';

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [supplier, setSupplier] = useState('');

  // Modal State
  const [selectedIndentNo, setSelectedIndentNo] = useState(null);

  // Sorting & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('indentNo');
  const [sortDir, setSortDir] = useState(-1); // latest first

  // Select indent details
  const activeIndent = useMemo(() => {
    return indents.find(i => i.indentNo === selectedIndentNo);
  }, [indents, selectedIndentNo]);

  // Filter indents
  const filteredIndents = useMemo(() => {
    let rows = indents.slice();

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.indentNo.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      rows = rows.filter(r => r.status === statusFilter);
    }
    if (fromDate) {
      rows = rows.filter(r => r.date >= fromDate);
    }
    if (toDate) {
      rows = rows.filter(r => r.date <= toDate);
    }
    if (supplier) {
      rows = rows.filter(r => (r.supplierName || '').toLowerCase().includes(supplier.toLowerCase()));
    }
    if (firmFilter) {
      rows = rows.filter(r => r.firm === firmFilter);
    }

    // Sort
    return rows.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }, [indents, search, statusFilter, firmFilter, fromDate, toDate, supplier, sortKey, sortDir]);

  // Pagination details
  const pageSize = settings?.pageSize?.txn || 6;
  const totalPages = Math.max(1, Math.ceil(filteredIndents.length / pageSize));
  const paginatedIndents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIndents.slice(start, start + pageSize);
  }, [filteredIndents, currentPage, pageSize]);

  const requestSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => -prev);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
    setCurrentPage(1);
  };

  // Toggle Approved / Pending
  const handleToggleStatus = () => {
    if (!activeIndent) return;
    const newStatus = activeIndent.status === 'Approved' ? 'Pending' : 'Approved';
    dispatch(updateIndentStatus({
      indentNo: activeIndent.indentNo,
      status: newStatus,
      currentUser: activeUser.name
    }));
  };

  // Download PDF
  const handleDownloadPdf = () => {
    if (!activeIndent) return;
    const r = activeIndent;
    const doc = new jsPDF();

    // Premium styling headers
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo theme color
    doc.text('IMS — Material Indent', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('System Generated PDF · Date: ' + new Date().toLocaleString(), 14, 29);

    doc.setDrawColor(227, 225, 245);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(12);
    doc.setTextColor(20);

    const lines = [
      ['Indent Number', r.indentNo],
      ['Date Generated', r.date],
      ['Firm', r.firm || '—'],
      ['Requested By', r.requestedBy],
      ['Requester Department', r.department],
      ['SKU Code / Material ID', r.sku],
      ['Material Description', r.name],
      ['Current Closing Stock', r.currentStock.toLocaleString()],
      ['Reorder Quantity Shortage', r.reorderQty.toLocaleString()],
      ['Assigned Supplier', r.supplierName],
      ['Current Indent Status', r.status]
    ];

    let y = 48;
    lines.forEach(([k, v]) => {
      doc.setFont(undefined, 'bold');
      doc.text(k + ':', 14, y);
      doc.setFont(undefined, 'normal');
      doc.text(String(v), 70, y);
      y += 10;
    });

    doc.save(`${r.indentNo}.pdf`);
  };

  // Export CSV
  const handleExport = () => {
    const exportData = filteredIndents.map(r => ({
      'Indent No': r.indentNo,
      'Date': r.date,
      'Requested By': r.requestedBy,
      'Department': r.department,
      'Firm': r.firm || '',
      'SKU Code': r.sku,
      'Material Name': r.name,
      'Current Stock': r.currentStock,
      'Reorder Qty': r.reorderQty,
      'Supplier': r.supplierName,
      'Status': r.status
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Purchase_Indents_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search indent no, SKU, requester..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 lg:flex-initial min-w-[130px]"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={firmFilter}
            onChange={(e) => { setFirmFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 lg:flex-initial min-w-[130px]"
          >
            <option value="">All Firms</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-all cursor-pointer flex-1 lg:flex-initial justify-center text-center ${
              showFilters
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-350 hover:border-indigo-500 hover:text-indigo-600'
            }`}
          >
            <SlidersHorizontal size={16} />
            More Filters
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-355 bg-white dark:bg-slate-900 cursor-pointer flex-1 lg:flex-initial justify-center text-center"
          >
            <FileSpreadsheet size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-slate-955/40 border border-dashed border-gray-200 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-3.5 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-950 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-3.5 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-955 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => { setSupplier(e.target.value); setCurrentPage(1); }}
              placeholder="e.g. Tata Steel"
              className="w-full px-3.5 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-950 dark:text-white"
            />
          </div>
          <div className="flex w-full">
            <button
              onClick={() => { setFromDate(''); setToDate(''); setSupplier(''); }}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-xl cursor-pointer justify-center text-center flex items-center"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Grid Indent Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                <th className="px-5 py-4 w-24">Actions</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('indentNo')}>Indent No</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('date')}>Date</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('requestedBy')}>Requested By</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('department')}>Department</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('firm')}>Firm</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('sku')}>SKU</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('name')}>Material</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('currentStock')}>Current Stock</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('reorderQty')}>Reorder Qty</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('supplierName')}>Supplier</th>
                <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('status')}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
              {paginatedIndents.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-gray-400">No purchase indents found.</td>
                </tr>
              ) : (
                paginatedIndents.map(r => (
                  <tr key={r.indentNo} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/20">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedIndentNo(r.indentNo)}
                        className="px-3 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-800 dark:text-slate-200 rounded-lg cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-white">{r.indentNo}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{r.date}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{r.requestedBy}</td>
                    <td className="px-5 py-4">{r.department}</td>
                    <td className="px-5 py-4 font-semibold text-gray-800 dark:text-slate-200">{r.firm || '—'}</td>
                    <td className="px-5 py-4 font-mono">{r.sku}</td>
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{r.name}</td>
                    <td className="px-5 py-4">{r.currentStock.toLocaleString()}</td>
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">{r.reorderQty.toLocaleString()}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{r.supplierName}</td>
                    <td className="px-5 py-4">
                      {r.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450">
                          <CheckCircle size={10} className="text-emerald-500" />
                          Approved
                        </span>
                      ) : r.status === 'Rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-450">
                          <X size={10} className="text-red-500" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-450">
                          <Clock size={10} className="text-amber-500" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card-based layout for mobile and tablet screens */}
        <div className="lg:hidden divide-y divide-gray-100 dark:divide-slate-800/60">
          {paginatedIndents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No purchase indents found.</div>
          ) : (
            paginatedIndents.map(r => (
              <div key={r.indentNo} className="p-5 space-y-3 hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">{r.indentNo}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{r.date}</span>
                  </div>
                  <div>
                    {r.status === 'Approved' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450">
                        <CheckCircle size={10} className="text-emerald-500" />
                        Approved
                      </span>
                    ) : r.status === 'Rejected' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-450">
                        <X size={10} className="text-red-500" />
                        Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-450">
                        <Clock size={10} className="text-amber-500" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Material Name:</span>
                    <span className="font-bold text-gray-900 dark:text-white text-right">{r.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">SKU:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{r.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Firm / Supplier:</span>
                    <span className="font-semibold text-gray-850 dark:text-slate-200 text-right">{r.firm || '—'} / {r.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Stock / Reorder Qty:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{r.currentStock.toLocaleString()} / {r.reorderQty.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requested By:</span>
                    <span className="font-semibold text-gray-850 dark:text-slate-350">{r.requestedBy} ({r.department})</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-dashed border-gray-150 dark:border-slate-800/40">
                  <button
                    onClick={() => setSelectedIndentNo(r.indentNo)}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-gray-150 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-800 dark:text-slate-200 rounded-lg cursor-pointer text-center justify-center flex items-center transition-colors"
                  >
                    View Indent Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-550 dark:text-slate-400">
            <div>
              Showing {Math.min(filteredIndents.length, (currentPage - 1) * pageSize + 1)}–
              {Math.min(filteredIndents.length, currentPage * pageSize)} of {filteredIndents.length} indents
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-7 h-7 rounded-lg transition-colors cursor-pointer flex items-center justify-center border text-[11px] ${
                    currentPage === idx + 1
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-650 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-850'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* INDENT DETAIL MODAL */}
      {selectedIndentNo && activeIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Indent Detail
              </h3>
              <button
                onClick={() => setSelectedIndentNo(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Indent Number</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.indentNo}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Date</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.date}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Requested By</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.requestedBy}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Department</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.department}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Firm</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.firm || '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">SKU Code</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.sku}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Material Name</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm truncate" title={activeIndent.name}>
                    {activeIndent.name}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Current Stock</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.currentStock.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Reorder Quantity</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.reorderQty.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Supplier Name</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.supplierName}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-black text-gray-450 dark:text-slate-500 uppercase tracking-wider">Status</label>
                  <div className="px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
                    {activeIndent.status}
                  </div>
                </div>
              </div>

              {/* Status change actions */}
              {!isViewer && (
                <div className="pt-2 flex gap-2">
                  {activeIndent.status !== 'Approved' && (
                    <button
                      onClick={() => dispatch(updateIndentStatus({ indentNo: activeIndent.indentNo, status: 'Approved', currentUser: activeUser.name }))}
                      className="px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 rounded-xl text-xs font-bold transition-all hover:bg-emerald-100 cursor-pointer"
                    >
                      ✓ Mark as Approved
                    </button>
                  )}
                  {activeIndent.status !== 'Rejected' && (
                    <button
                      onClick={() => dispatch(updateIndentStatus({ indentNo: activeIndent.indentNo, status: 'Rejected', currentUser: activeUser.name }))}
                      className="px-4 py-2 border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-450 rounded-xl text-xs font-bold transition-all hover:bg-red-100 cursor-pointer"
                    >
                      ✕ Mark as Rejected
                    </button>
                  )}
                  {activeIndent.status !== 'Pending' && (
                    <button
                      onClick={() => dispatch(updateIndentStatus({ indentNo: activeIndent.indentNo, status: 'Pending', currentUser: activeUser.name }))}
                      className="px-4 py-2 border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450 rounded-xl text-xs font-bold transition-all hover:bg-amber-100 cursor-pointer"
                    >
                      ↩ Reset to Pending
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-gray-150 dark:border-slate-800 px-6 py-4 bg-gray-50 dark:bg-slate-950 rounded-b-3xl">
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 hover:border-indigo-500 dark:border-slate-800 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-350 hover:bg-gray-50 cursor-pointer"
              >
                <span>↓</span> Download PDF
              </button>
              <button
                onClick={() => setSelectedIndentNo(null)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
