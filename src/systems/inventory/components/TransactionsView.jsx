// src/systems/inventory/components/TransactionsView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  BarChart2,
  X,
  Boxes,
  Calendar,
  Building2,
  Check,
  Package
} from 'lucide-react';
import Papa from 'papaparse';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { saveSettings } from '../../../redux/slice/inventorySlice';

export default function TransactionsView({ activeUser }) {
  const dispatch = useDispatch();

  // Download CSV template
  const handleDownloadTemplate = () => {
    const isJobCard = activeTab === 'JOB CARD';
    const headers = isJobCard
      ? [
          [
            'Txn ID',
            'Date',
            'Batch Number',
            'SKU Code',
            'Material Name',
            'Firm',
            'Quantity',
            'No. of Batches',
            'Remaining Batches',
            'Remaining Material',
            'Operator',
          ],
          [
            'JC-1001',
            '2026-08-01',
            'BATCH-01',
            'FG-201',
            'Door frame 78',
            'Division 1',
            100,
            5,
            5,
            100,
            'John Operator',
          ],
        ]
      : [
          [
            'Transaction ID',
            'Date',
            'SKU Code',
            'Material Name',
            'Firm',
            'Quantity',
            'Transaction Type',
            'Reference Number',
            'Remarks',
            'Operator',
          ],
          [
            'TXN-1001',
            '2026-08-01',
            'RM-101',
            'Resin PVC',
            'Division 1',
            50,
            'IN',
            'PO-501',
            'Stock Arrival',
            'John Operator',
          ],
        ];
    const csv = Papa.unparse(headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      isJobCard ? 'Job_Cards_Template.csv' : 'Stock_Transactions_Template.csv'
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { materials, transactions, settings, locations = [], divisions = [], jobCardBatches = [] } = useSelector(
    (state) => state.inventory
  );

  const isViewer = activeUser.role === 'Viewer';

  // Active Tab: 'ALL' | 'IN' | 'OUT' | 'JOB CARD'
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Row selection & Stats modal state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState(-1);

  // Clear selections when tab or filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, search, firmFilter, fromDate, toDate]);

  // Correlate jobCardBatches with parent transaction data (date, firm, user)
  const correlatedJobCardBatches = useMemo(() => {
    const parentMap = new Map();
    transactions.forEach((t) => {
      parentMap.set(t.id, t);
    });

    return (jobCardBatches || []).map((batch) => {
      const parent = parentMap.get(batch.transaction_id) || {};
      return {
        id: batch.id,
        transactionId: batch.transaction_id,
        batchNumber: batch.batch_number,
        sku: batch.sku,
        materialName: batch.material_name,
        qty: Number(batch.qty) || 0,
        numBatches: batch.num_batches || '—',
        remainingBatches: batch.remaining_batches || '—',
        remainingMaterial: batch.remaining_material || '—',
        date: parent.date || (batch.created_at ? batch.created_at.slice(0, 10) : '—'),
        firm: parent.firm || '—',
        user: parent.user || '—',
        ref: parent.ref || '—',
        remarks: parent.remarks || '—',
        type: 'Job Card',
      };
    });
  }, [jobCardBatches, transactions]);

  // Filter rows based on activeTab, search, firm, and date filters
  const filteredRows = useMemo(() => {
    if (activeTab === 'JOB CARD') {
      let rows = correlatedJobCardBatches.slice();

      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((r) =>
          r.transactionId.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.materialName.toLowerCase().includes(q) ||
          (r.user || '').toLowerCase().includes(q)
        );
      }
      if (firmFilter) {
        rows = rows.filter((r) => r.firm === firmFilter);
      }
      if (fromDate) {
        rows = rows.filter((r) => r.date >= fromDate);
      }
      if (toDate) {
        rows = rows.filter((r) => r.date <= toDate);
      }

      return rows.sort((a, b) => {
        let va = a[sortKey] ?? a.date, vb = b[sortKey] ?? b.date;
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return -1 * sortDir;
        if (va > vb) return 1 * sortDir;
        return 0;
      });
    }

    // ALL, IN, and OUT tabs
    let rows = activeTab === 'ALL'
      ? transactions.slice()
      : transactions.filter((t) => t.type === activeTab);

    if (activeUser.location) {
      const locationSkus = new Set(materials.filter((m) => m.location === activeUser.location).map((m) => m.sku));
      rows = rows.filter((t) => locationSkus.has(t.sku));
    }

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.ref || '').toLowerCase().includes(q) ||
        (r.user || '').toLowerCase().includes(q)
      );
    }
    if (firmFilter) {
      rows = rows.filter((r) => r.firm === firmFilter);
    }
    if (fromDate) {
      rows = rows.filter((r) => r.date >= fromDate);
    }
    if (toDate) {
      rows = rows.filter((r) => r.date <= toDate);
    }

    return rows.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }, [activeTab, correlatedJobCardBatches, transactions, search, firmFilter, fromDate, toDate, sortKey, sortDir, materials, activeUser]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    const currentViewIds = filteredRows.map((r) => r.id);
    const allSelected = currentViewIds.length > 0 && currentViewIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentViewIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentViewIds])));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Compute Statistics for selected items
  const selectedStats = useMemo(() => {
    if (selectedIds.length === 0) return null;

    const selectedSet = new Set(selectedIds);
    const items = filteredRows.filter((r) => selectedSet.has(r.id));

    const totalCount = items.length;
    const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    // Type Breakdown
    const typeMap = {};
    items.forEach((item) => {
      const type = item.type || (item.batchNumber ? 'Job Card' : 'Standard');
      if (!typeMap[type]) typeMap[type] = { count: 0, qty: 0 };
      typeMap[type].count += 1;
      typeMap[type].qty += Number(item.qty) || 0;
    });

    // Material Aggregation
    const matMap = {};
    items.forEach((item) => {
      const name = item.materialName || item.name || item.sku;
      const sku = item.sku || 'N/A';
      if (!matMap[name]) matMap[name] = { sku, name, count: 0, qty: 0 };
      matMap[name].count += 1;
      matMap[name].qty += Number(item.qty) || 0;
    });
    const materialSummary = Object.values(matMap).sort((a, b) => b.qty - a.qty);

    // Firm Distribution
    const firmMap = {};
    items.forEach((item) => {
      const firm = item.firm || 'Unspecified';
      if (!firmMap[firm]) firmMap[firm] = { count: 0, qty: 0 };
      firmMap[firm].count += 1;
      firmMap[firm].qty += Number(item.qty) || 0;
    });
    const firmSummary = Object.entries(firmMap).map(([firm, data]) => ({ firm, ...data }));

    // Date Range
    const dates = items.map((i) => i.date).filter(Boolean).sort();
    const minDate = dates[0] || '—';
    const maxDate = dates[dates.length - 1] || '—';

    return {
      totalCount,
      totalQty,
      typeMap,
      materialSummary,
      firmSummary,
      minDate,
      maxDate,
      items,
    };
  }, [selectedIds, filteredRows]);

  // Pagination details
  const pageSize = settings?.pageSize?.txn || 6;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    dispatch(
      saveSettings({
        settings: {
          ...settings,
          pageSize: {
            ...settings?.pageSize,
            txn: newSize,
          },
        },
        currentUser: activeUser.name,
      })
    );
    setCurrentPage(1);
  };

  // Handle sort request
  const requestSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => -prev);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
    setCurrentPage(1);
  };

  // Export CSV
  const handleExport = () => {
    let exportData = [];
    const rowsToExport = selectedIds.length > 0
      ? filteredRows.filter((r) => selectedIds.includes(r.id))
      : filteredRows;

    if (activeTab === 'JOB CARD') {
      exportData = rowsToExport.map((b) => ({
        'Txn ID': b.transactionId,
        'Date': b.date,
        'Batch Number': b.batchNumber,
        'SKU Code': b.sku,
        'Material Name': b.materialName,
        'Firm': b.firm,
        'Quantity': b.qty,
        'No. of Batches': b.numBatches,
        'Remaining Batches': b.remainingBatches,
        'Remaining Material': b.remainingMaterial,
        'Operator': b.user,
      }));
    } else {
      exportData = rowsToExport.map((t) => ({
        'Transaction ID': t.id,
        'Date': t.date,
        'SKU Code': t.sku,
        'Material Name': t.name,
        'Firm': t.firm || '',
        'Quantity': t.qty,
        'Transaction Type': t.type,
        'Reference Number': t.ref || '',
        'Remarks': t.remarks || '',
        'Operator': t.user || '',
      }));
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Stock_Transactions_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
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
          {/* Switcher Header Tabs */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-950 rounded-2xl border border-gray-200 dark:border-slate-800">
            {['ALL', 'IN', 'OUT', 'JOB CARD'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px] w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Txn ID, SKU, material, reference, user..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <select
            value={firmFilter}
            onChange={(e) => {
              setFirmFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 lg:flex-initial min-w-[130px]"
          >
            <option value="">All Firms</option>
            {divisions.map((d) => (
              <option key={d.id || d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Top Right Action Button: View Statistics */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setIsStatsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all animate-in fade-in zoom-in duration-200"
            >
              <BarChart2 size={16} />
              <span>View Statistics ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-all cursor-pointer flex-1 lg:flex-initial justify-center text-center ${
              showFilters
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-350 hover:border-indigo-500 hover:text-indigo-660'
            }`}
          >
            <SlidersHorizontal size={16} />
            Date Filter
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-350 bg-white dark:bg-slate-900 cursor-pointer flex-1 lg:flex-initial justify-center text-center"
          >
            <Download size={16} />
            Template
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

      {/* Expanded Date Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-955/40 border border-dashed border-gray-200 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-950 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-955 dark:text-white"
            />
          </div>
          <div className="flex w-full">
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-xl cursor-pointer justify-center text-center flex items-center"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Grid Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto">
          {activeTab === 'JOB CARD' ? (
            /* JOB CARD Batches Table */
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-955 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                  <th className="w-10 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredRows.length > 0 &&
                        filteredRows.every((r) => selectedIds.includes(r.id))
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('transactionId')}>
                    Txn ID
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('date')}>
                    Date
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('batchNumber')}>
                    Batch #
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('sku')}>
                    SKU
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('materialName')}>
                    Material Name
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('firm')}>
                    Firm
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('qty')}>
                    Quantity
                  </th>
                  <th className="px-5 py-4">No. of Batches</th>
                  <th className="px-5 py-4">Remaining Batches</th>
                  <th className="px-5 py-4">Remaining Material</th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('user')}>
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-gray-400">
                      No Job Card batch records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isChecked = selectedIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
                            : 'hover:bg-gray-50/50 dark:hover:bg-slate-850/20'
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(row.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-white">{row.transactionId}</td>
                        <td className="px-5 py-4 whitespace-nowrap">{row.date}</td>
                        <td className="px-5 py-4 font-bold text-indigo-600 dark:text-indigo-400">#{row.batchNumber}</td>
                        <td className="px-5 py-4 font-mono font-bold text-gray-800 dark:text-slate-200">{row.sku}</td>
                        <td className="px-5 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.materialName}</td>
                        <td className="px-5 py-4 font-semibold text-gray-800 dark:text-slate-200">{row.firm || '—'}</td>
                        <td className="px-5 py-4 font-black text-sm">{row.qty.toLocaleString()}</td>
                        <td className="px-5 py-4 text-gray-600 dark:text-slate-400">{row.numBatches}</td>
                        <td className="px-5 py-4 text-gray-600 dark:text-slate-400">{row.remainingBatches}</td>
                        <td className="px-5 py-4 text-gray-600 dark:text-slate-400">{row.remainingMaterial}</td>
                        <td className="px-5 py-4 font-semibold whitespace-nowrap">{row.user || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ALL / IN / OUT Standard Transactions Table */
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-955 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                  <th className="w-10 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredRows.length > 0 &&
                        filteredRows.every((r) => selectedIds.includes(r.id))
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('id')}>
                    Txn ID
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('date')}>
                    Date
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('sku')}>
                    SKU
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('name')}>
                    Material Name
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('firm')}>
                    Firm
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('qty')}>
                    Quantity
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('type')}>
                    Type
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('ref')}>
                    Reference #
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('user')}>
                    User
                  </th>
                  <th className="px-5 py-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-gray-400">
                      No stock movements recorded.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((t) => {
                    const isChecked = selectedIds.includes(t.id);
                    return (
                      <tr
                        key={t.id}
                        className={`transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
                            : 'hover:bg-gray-50/50 dark:hover:bg-slate-850/20'
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(t.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-white">{t.id}</td>
                        <td className="px-5 py-4 whitespace-nowrap">{t.date}</td>
                        <td className="px-5 py-4 font-mono font-bold text-gray-800 dark:text-slate-200">{t.sku}</td>
                        <td className="px-5 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{t.name}</td>
                        <td className="px-5 py-4 font-semibold text-gray-800 dark:text-slate-200">{t.firm || '—'}</td>
                        <td className="px-5 py-4 font-black text-sm">{t.qty.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          {t.type === 'Job Card' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-850 dark:bg-indigo-950/65 dark:text-indigo-400">
                              <Layers size={12} className="text-indigo-600" />
                              Job Card
                            </span>
                          ) : t.type === 'IN' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-850 dark:bg-teal-950/65 dark:text-teal-400">
                              <ArrowDownLeft size={12} className="text-teal-600" />
                              IN (Receive)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-850 dark:bg-rose-955/65 dark:text-rose-400">
                              <ArrowUpRight size={12} className="text-rose-600" />
                              OUT (Issue)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono whitespace-nowrap">{t.ref || '—'}</td>
                        <td className="px-5 py-4 font-semibold whitespace-nowrap">{t.user || '—'}</td>
                        <td className="px-5 py-4 max-w-[200px] truncate" title={t.remarks}>
                          {t.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Card-based layout for mobile and tablet screens */}
        <div className="lg:hidden divide-y divide-gray-100 dark:divide-slate-800/60">
          {paginatedRows.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No records found.</div>
          ) : activeTab === 'JOB CARD' ? (
            paginatedRows.map((row) => {
              const isChecked = selectedIds.includes(row.id);
              return (
                <div
                  key={row.id}
                  className={`p-5 space-y-3 transition-colors ${
                    isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectRow(row.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">{row.transactionId}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{row.date}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-850 dark:bg-indigo-950/65 dark:text-indigo-400">
                      Batch #{row.batchNumber}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Material Name:</span>
                      <span className="font-bold text-gray-900 dark:text-white text-right">{row.materialName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SKU:</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{row.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Firm:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{row.firm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quantity:</span>
                      <span className="font-black text-gray-900 dark:text-white text-sm">{row.qty.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Operator:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{row.user}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            paginatedRows.map((t) => {
              const isChecked = selectedIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={`p-5 space-y-3 transition-colors ${
                    isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectRow(t.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">{t.id}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{t.date}</span>
                      </div>
                    </div>
                    <div>
                      {t.type === 'Job Card' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-850 dark:bg-indigo-950/65 dark:text-indigo-400">
                          <Layers size={11} className="text-indigo-600" />
                          Job Card
                        </span>
                      ) : t.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-850 dark:bg-teal-950/65 dark:text-teal-400">
                          <ArrowDownLeft size={11} className="text-teal-600" />
                          IN (Receive)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-850 dark:bg-rose-950/65 dark:text-rose-400">
                          <ArrowUpRight size={11} className="text-rose-600" />
                          OUT (Issue)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Material Name:</span>
                      <span className="font-bold text-gray-900 dark:text-white text-right">{t.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SKU:</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{t.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quantity:</span>
                      <span className="font-black text-gray-900 dark:text-white text-sm">{t.qty.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-550 dark:text-slate-400">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div>
              Showing {filteredRows.length === 0 ? 0 : Math.min(filteredRows.length, (currentPage - 1) * pageSize + 1)}–
              {Math.min(filteredRows.length, currentPage * pageSize)} of {filteredRows.length} records
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-gray-400 tracking-wider">Rows per page:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="px-2 py-0.5 border border-gray-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-355 cursor-pointer focus:ring-1 focus:ring-indigo-500 font-normal"
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
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
          )}
        </div>
      </div>

      {/* POPUP MODAL: Selected Items Statistics */}
      {isStatsModalOpen && selectedStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4 bg-gray-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Selected Items Statistics
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Summary metrics for {selectedStats.totalCount} selected transaction record(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Top Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                    Total Records
                  </span>
                  <span className="text-2xl font-black text-indigo-900 dark:text-indigo-100">
                    {selectedStats.totalCount}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                    Total Quantity
                  </span>
                  <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                    {selectedStats.totalQty.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-1">
                    Distinct SKUs
                  </span>
                  <span className="text-2xl font-black text-sky-900 dark:text-sky-100">
                    {selectedStats.materialSummary.length}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
                    Date Range
                  </span>
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-100 block">
                    {selectedStats.minDate === selectedStats.maxDate
                      ? selectedStats.minDate
                      : `${selectedStats.minDate} → ${selectedStats.maxDate}`}
                  </span>
                </div>
              </div>

              {/* Type Breakdown Badges */}
              <div className="bg-gray-50 dark:bg-slate-955/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                  Movement Type Breakdown
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {Object.entries(selectedStats.typeMap).map(([type, data]) => (
                    <div
                      key={type}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs"
                    >
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {type}:
                      </span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {data.count} items ({data.qty.toLocaleString()} units)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart Visualizations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart 1: Quantity by Material */}
                <div className="bg-gray-50 dark:bg-slate-955/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                    Material Quantity Volume
                  </span>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={selectedStats.materialSummary.slice(0, 6).map((m) => ({
                          name: m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name,
                          fullName: m.name,
                          qty: m.qty,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          formatter={(val) => [val.toLocaleString() + ' units', 'Quantity']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                          {selectedStats.materialSummary.slice(0, 6).map((entry, index) => {
                            const colors = ['#6366f1', '#0d9488', '#a855f7', '#eab308', '#ef4444', '#3b82f6'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Quantity by Movement Type */}
                <div className="bg-gray-50 dark:bg-slate-955/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                    Volume by Movement Type
                  </span>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(selectedStats.typeMap).map(([type, data]) => ({
                          type,
                          qty: data.qty,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          formatter={(val) => [val.toLocaleString() + ' units', 'Quantity']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                          {Object.entries(selectedStats.typeMap).map(([type], index) => {
                            const typeColors = {
                              IN: '#0d9488',
                              OUT: '#e11d48',
                              'Job Card': '#8b5cf6',
                            };
                            return <Cell key={`cell-type-${index}`} fill={typeColors[type] || '#6366f1'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Material Breakdown Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                  Material Quantities Summary
                </span>
                <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-955 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase">
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Material Name</th>
                        <th className="px-4 py-3 text-center">Txn Count</th>
                        <th className="px-4 py-3 text-right">Total Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {selectedStats.materialSummary.map((m) => (
                        <tr key={m.sku + m.name} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/20">
                          <td className="px-4 py-2.5 font-mono font-bold text-gray-900 dark:text-white">
                            {m.sku}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white">
                            {m.name}
                          </td>
                          <td className="px-4 py-2.5 text-center font-medium text-gray-600 dark:text-slate-400">
                            {m.count}
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                            {m.qty.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Firm Distribution */}
              {selectedStats.firmSummary.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                    Firm Distribution
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedStats.firmSummary.map((f) => (
                      <div
                        key={f.firm}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-955 border border-gray-200 dark:border-slate-800 text-xs"
                      >
                        <span className="font-bold text-gray-800 dark:text-slate-200">
                          {f.firm}
                        </span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          {f.count} items ({f.qty.toLocaleString()} units)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-gray-150 dark:border-slate-800 px-6 py-3 bg-gray-50/50 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="px-5 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
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
