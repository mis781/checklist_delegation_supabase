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
  Package,
  Edit3,
  Trash2,
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
import {
  saveSettings,
  updateTransaction,
  deleteTransaction,
} from '../../../redux/slice/inventorySlice';
import { useMagicToast } from '../../../context/MagicToastContext';

export default function TransactionsView({ activeUser }) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();

  const [editingTxn, setEditingTxn] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    date: '',
    sku: '',
    name: '',
    firm: '',
    qty: 0,
    type: 'IN',
    ref: '',
    user: '',
    remarks: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenEditModal = (t) => {
    setEditingTxn(t);
    setEditFormData({
      id: t.id,
      date: t.date || new Date().toISOString().slice(0, 10),
      sku: t.sku || '',
      name: t.name || '',
      firm: t.firm || '',
      qty: t.qty || 0,
      type: t.type || 'IN',
      ref: t.ref || '',
      user: t.user || activeUser?.name || 'Admin',
      remarks: t.remarks || '',
      materialType: t.materialType || 'RM',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.sku || !editFormData.qty || editFormData.qty <= 0) {
      showToast('Please provide valid SKU and Quantity.', 'error');
      return;
    }
    setIsUpdating(true);
    const result = await dispatch(
      updateTransaction({
        transaction: editFormData,
        currentUser: activeUser?.name || 'Admin',
      })
    );
    setIsUpdating(false);
    if (updateTransaction.fulfilled.match(result)) {
      showToast(`Transaction ${editFormData.id} updated successfully!`, 'success');
      setEditingTxn(null);
    } else {
      showToast(result.payload || 'Failed to update transaction.', 'error');
    }
  };

  const handleDeleteTxn = async (t) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete transaction ${t.id} (${t.sku})?`
    );
    if (!confirmDelete) return;

    const result = await dispatch(
      deleteTransaction({ id: t.id, currentUser: activeUser?.name || 'Admin' })
    );
    if (deleteTransaction.fulfilled.match(result)) {
      showToast(`Transaction ${t.id} deleted successfully!`, 'success');
    } else {
      showToast(result.payload || 'Failed to delete transaction.', 'error');
    }
  };

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

  const {
    materials,
    transactions,
    settings,
    locations = [],
    divisions = [],
    jobCardBatches = [],
    materialNames = [],
    categories = [],
  } = useSelector((state) => state.inventory);

  const isViewer = activeUser.role === 'Viewer';
  const isAdmin =
    activeUser?.role === 'Admin' ||
    activeUser?.role === 'Superadmin' ||
    (localStorage.getItem('role') || '').toLowerCase() === 'admin' ||
    (localStorage.getItem('role') || '').toLowerCase() === 'superadmin';

  // Fast materials lookup map by SKU and by Name
  const materialsMap = useMemo(() => {
    const map = new Map();
    (materials || []).forEach((m) => {
      if (m.sku) map.set(m.sku.trim().toLowerCase(), m);
      if (m.name) map.set(m.name.trim().toLowerCase(), m);
    });
    return map;
  }, [materials]);

  // Helpers to resolve metadata for any transaction or batch
  const getMaterialType = (item, mat) => {
    if (item?.materialType) return item.materialType.toUpperCase();
    if (item?.material_type) return item.material_type.toUpperCase();
    if (mat?.materialType) return mat.materialType.toUpperCase();
    if (mat?.material_type) return mat.material_type.toUpperCase();
    if (mat?.category && mat.category.toLowerCase() !== 'raw material') return 'FG';
    if (item?.fgSku || item?.isJobCard) return 'FG';
    return 'RM';
  };

  const getCategory = (item, mat) => {
    if (item?.fgCategory && item.fgCategory !== '—' && item.fgCategory.trim()) return item.fgCategory;
    if (mat?.category && mat.category.trim()) return mat.category;
    const matType = getMaterialType(item, mat);
    return matType === 'FG' ? 'Finished Goods' : 'Raw Material';
  };

  const getFirm = (item, mat) => {
    if (item?.firm && item.firm !== '—' && item.firm.trim()) return item.firm;
    if (mat?.division && mat.division.trim()) return mat.division;
    return '—';
  };

  // Active Tab: 'ALL' | 'IN' | 'OUT' | 'JOB CARD'
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
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
  }, [activeTab, search, firmFilter, materialTypeFilter, categoryFilter, materialFilter, fromDate, toDate]);

  // Correlate jobCardBatches with parent transaction data (date, firm, user)
  const correlatedJobCardBatches = useMemo(() => {
    const parentMap = new Map();
    transactions.forEach((t) => {
      parentMap.set(t.id, t);
    });

    return (jobCardBatches || []).map((batch) => {
      const parent = parentMap.get(batch.transaction_id) || {};
      const mat = materialsMap.get((batch.sku || '').trim().toLowerCase()) ||
                  materialsMap.get((batch.material_name || '').trim().toLowerCase());
      const mType = getMaterialType(parent, mat);
      const cat = getCategory(parent, mat);
      const firm = parent.firm || mat?.division || '—';

      return {
        id: batch.id,
        transactionId: batch.transaction_id,
        batchNumber: batch.batch_number,
        sku: batch.sku,
        materialName: batch.material_name,
        materialType: mType,
        category: cat,
        qty: Number(batch.qty) || 0,
        numBatches: batch.num_batches || '—',
        remainingBatches: batch.remaining_batches || '—',
        remainingMaterial: batch.remaining_material || '—',
        date: parent.date || (batch.created_at ? batch.created_at.slice(0, 10) : '—'),
        firm: firm,
        user: parent.user || '—',
        ref: parent.ref || '—',
        remarks: parent.remarks || '—',
        type: 'Job Card',
      };
    });
  }, [jobCardBatches, transactions, materialsMap]);

  // Unique firms list
  const uniqueFirms = useMemo(() => {
    const firmSet = new Set();
    (divisions || []).forEach((d) => {
      const name = typeof d === 'string' ? d : d?.name;
      if (name) firmSet.add(name);
    });
    (materials || []).forEach((m) => {
      if (m.division) firmSet.add(m.division);
    });
    (transactions || []).forEach((t) => {
      if (t.firm && t.firm !== '—') firmSet.add(t.firm);
    });
    (correlatedJobCardBatches || []).forEach((b) => {
      if (b.firm && b.firm !== '—') firmSet.add(b.firm);
    });
    return Array.from(firmSet).sort((a, b) => a.localeCompare(b));
  }, [divisions, materials, transactions, correlatedJobCardBatches]);

  // Unique categories list based on materialTypeFilter and firmFilter
  const uniqueCategories = useMemo(() => {
    const catSet = new Set();

    // From DB categories
    (categories || []).forEach((c) => {
      const name = typeof c === 'string' ? c : c?.name;
      const catDiv = typeof c === 'object' ? c?.division : null;
      const catType = typeof c === 'object' ? c?.materialType : 'ALL';
      if (materialTypeFilter && catType && catType !== 'ALL' && catType !== materialTypeFilter) return;
      if (firmFilter && catDiv && catDiv !== firmFilter) return;
      if (name) catSet.add(name);
    });

    // From Materials master
    (materials || []).forEach((m) => {
      const mType = getMaterialType(null, m);
      if (materialTypeFilter && mType !== materialTypeFilter) return;
      if (firmFilter && m.division && m.division !== firmFilter) return;
      if (m.category) catSet.add(m.category);
    });

    // From Transactions
    (transactions || []).forEach((t) => {
      const mat = materialsMap.get((t.sku || '').trim().toLowerCase()) ||
                  materialsMap.get((t.name || '').trim().toLowerCase());
      const mType = getMaterialType(t, mat);
      const firm = getFirm(t, mat);
      const cat = getCategory(t, mat);
      if (materialTypeFilter && mType !== materialTypeFilter) return;
      if (firmFilter && firm && firm !== '—' && firm !== firmFilter) return;
      if (cat && cat !== '—') catSet.add(cat);
    });

    // From Job Card Batches
    (correlatedJobCardBatches || []).forEach((b) => {
      if (materialTypeFilter && b.materialType !== materialTypeFilter) return;
      if (firmFilter && b.firm && b.firm !== '—' && b.firm !== firmFilter) return;
      if (b.category && b.category !== '—') catSet.add(b.category);
    });

    return Array.from(catSet).sort((a, b) => a.localeCompare(b));
  }, [categories, materials, transactions, correlatedJobCardBatches, materialTypeFilter, firmFilter, materialsMap]);

  // Auto-reset categoryFilter if no longer valid under active filters
  useEffect(() => {
    if (categoryFilter && !uniqueCategories.includes(categoryFilter)) {
      setCategoryFilter('');
    }
  }, [uniqueCategories, categoryFilter]);

  // Unique Materials dropdown options showing both SKU from Finished Goods as well as Raw Material
  const materialDropdownOptions = useMemo(() => {
    const itemMap = new Map();

    // Helper to register an option
    const registerOption = (rawSku, rawName, mType, category, firm) => {
      if (materialTypeFilter && mType !== materialTypeFilter) return;
      if (firmFilter && firm && firm !== '—' && firm !== firmFilter) return;
      if (categoryFilter && category && category.toLowerCase() !== categoryFilter.toLowerCase()) return;

      const sku = (rawSku || '').trim();
      const name = (rawName || '').trim() || sku;
      if (!name && !sku) return;

      const key = (sku || name).toLowerCase();
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          sku,
          name,
          materialType: mType,
          category,
          firm,
          label: sku && name && sku !== name ? `${name} (${sku})` : (name || sku),
        });
      }
    };

    // 1. Scan transactions involved in stock movements
    (transactions || []).forEach((t) => {
      const mat = materialsMap.get((t.sku || '').trim().toLowerCase()) ||
                  materialsMap.get((t.name || '').trim().toLowerCase());
      const mType = getMaterialType(t, mat);
      const cat = getCategory(t, mat);
      const firm = getFirm(t, mat);
      registerOption(t.sku, t.name || mat?.name, mType, cat, firm);

      // If transaction has an associated Finished Goods SKU
      if (t.fgSku && t.fgSku.trim()) {
        const fgMat = materialsMap.get(t.fgSku.trim().toLowerCase());
        registerOption(t.fgSku, fgMat?.name || t.fgSku, 'FG', t.fgCategory || fgMat?.category || 'Finished Goods', firm);
      }
    });

    // 2. Scan Job Card batches
    (correlatedJobCardBatches || []).forEach((b) => {
      const mat = materialsMap.get((b.sku || '').trim().toLowerCase()) ||
                  materialsMap.get((b.materialName || '').trim().toLowerCase());
      const mType = getMaterialType(b, mat);
      const cat = getCategory(b, mat);
      registerOption(b.sku, b.materialName || mat?.name, mType, cat, b.firm);
    });

    // 3. Scan Materials Master
    (materials || []).forEach((m) => {
      const mType = getMaterialType(null, m);
      registerOption(m.sku, m.name, mType, m.category || (mType === 'FG' ? 'Finished Goods' : 'Raw Material'), m.division);
    });

    return Array.from(itemMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [transactions, correlatedJobCardBatches, materials, materialsMap, materialTypeFilter, firmFilter, categoryFilter]);

  // Auto-reset materialFilter if no longer valid under active filters
  useEffect(() => {
    if (materialFilter) {
      const exists = materialDropdownOptions.some(
        (opt) => opt.sku.toLowerCase() === materialFilter.toLowerCase() ||
                 opt.name.toLowerCase() === materialFilter.toLowerCase() ||
                 opt.label.toLowerCase() === materialFilter.toLowerCase()
      );
      if (!exists) {
        setMaterialFilter('');
      }
    }
  }, [materialDropdownOptions, materialFilter]);

  // Filter rows based on activeTab, search, firm, materialType, category, material, and date filters
  const filteredRows = useMemo(() => {
    if (activeTab === 'JOB CARD') {
      let rows = correlatedJobCardBatches.slice();

      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((r) =>
          (r.transactionId || '').toLowerCase().includes(q) ||
          (r.sku || '').toLowerCase().includes(q) ||
          (r.materialName || '').toLowerCase().includes(q) ||
          (r.materialType || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.firm || '').toLowerCase().includes(q) ||
          (r.user || '').toLowerCase().includes(q) ||
          (r.ref || '').toLowerCase().includes(q) ||
          (r.remarks || '').toLowerCase().includes(q)
        );
      }
      if (firmFilter) {
        rows = rows.filter((r) => r.firm === firmFilter);
      }
      if (materialTypeFilter) {
        rows = rows.filter((r) => r.materialType === materialTypeFilter);
      }
      if (categoryFilter) {
        rows = rows.filter((r) => (r.category || '').toLowerCase() === categoryFilter.toLowerCase());
      }
      if (materialFilter) {
        const mf = materialFilter.toLowerCase();
        rows = rows.filter((r) =>
          (r.sku || '').toLowerCase() === mf ||
          (r.materialName || '').toLowerCase() === mf
        );
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
    let rows = (activeTab === 'ALL'
      ? transactions.slice()
      : transactions.filter((t) => t.type === activeTab)
    ).map((t) => {
      const mat = materialsMap.get((t.sku || '').trim().toLowerCase()) ||
                  materialsMap.get((t.name || '').trim().toLowerCase());
      const mType = getMaterialType(t, mat);
      const cat = getCategory(t, mat);
      const resolvedFirm = getFirm(t, mat);
      const resolvedName = t.name || mat?.name || t.sku;

      return {
        ...t,
        materialType: mType,
        category: cat,
        firm: resolvedFirm,
        materialName: resolvedName,
      };
    });

    if (activeUser.location) {
      const locationSkus = new Set(materials.filter((m) => m.location === activeUser.location).map((m) => m.sku));
      rows = rows.filter((t) => locationSkus.has(t.sku));
    }

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.id || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.materialName || r.name || '').toLowerCase().includes(q) ||
        (r.materialType || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.firm || '').toLowerCase().includes(q) ||
        (r.fgSku || '').toLowerCase().includes(q) ||
        (r.ref || '').toLowerCase().includes(q) ||
        (r.user || '').toLowerCase().includes(q) ||
        (r.remarks || '').toLowerCase().includes(q)
      );
    }
    if (firmFilter) {
      rows = rows.filter((r) => r.firm === firmFilter);
    }
    if (materialTypeFilter) {
      rows = rows.filter((r) => r.materialType === materialTypeFilter);
    }
    if (categoryFilter) {
      rows = rows.filter((r) => (r.category || '').toLowerCase() === categoryFilter.toLowerCase());
    }
    if (materialFilter) {
      const mf = materialFilter.toLowerCase();
      rows = rows.filter((r) =>
        (r.sku || '').toLowerCase() === mf ||
        (r.materialName || r.name || '').toLowerCase() === mf ||
        (r.fgSku || '').toLowerCase() === mf
      );
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
  }, [activeTab, correlatedJobCardBatches, transactions, materialsMap, search, firmFilter, materialTypeFilter, categoryFilter, materialFilter, fromDate, toDate, sortKey, sortDir, materials, activeUser]);

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

    // Material Type Breakdown (RM vs FG)
    const matTypeMap = { RM: { count: 0, qty: 0 }, FG: { count: 0, qty: 0 } };
    items.forEach((item) => {
      const mType = item.materialType === 'FG' ? 'FG' : 'RM';
      matTypeMap[mType].count += 1;
      matTypeMap[mType].qty += Number(item.qty) || 0;
    });

    // Category Breakdown
    const categoryMap = {};
    items.forEach((item) => {
      const cat = item.category || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, qty: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].qty += Number(item.qty) || 0;
    });
    const categorySummary = Object.entries(categoryMap).map(([category, data]) => ({ category, ...data }));

    // Material Aggregation
    const matMap = {};
    items.forEach((item) => {
      const name = item.materialName || item.name || item.sku;
      const sku = item.sku || 'N/A';
      const mType = item.materialType || 'RM';
      const cat = item.category || '—';
      if (!matMap[name]) matMap[name] = { sku, name, materialType: mType, category: cat, count: 0, qty: 0 };
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
      matTypeMap,
      categorySummary,
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
        'Firm': b.firm || '',
        'Material Type': b.materialType === 'FG' ? 'Finished Goods (FG)' : 'Raw Material (RM)',
        'Category': b.category || '',
        'Material Name': b.materialName,
        'SKU Code': b.sku,
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
        'Firm': t.firm || '',
        'Material Type': t.materialType === 'FG' ? 'Finished Goods (FG)' : 'Raw Material (RM)',
        'Category': t.category || '',
        'Material Name': t.materialName || t.name,
        'SKU Code': t.sku,
        'FG SKU Code': t.fgSku || '',
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
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs">
        {/* Top Row: Switcher Tabs, Search & Action Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Tabs + Search */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 flex-1">
            {/* Switcher Header Tabs */}
            <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-950 rounded-2xl border border-gray-200 dark:border-slate-800 shrink-0">
              {['ALL', 'IN', 'OUT', 'JOB CARD'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px] w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={17} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Txn ID, SKU, material, category, firm, ref, user..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all animate-in fade-in zoom-in duration-200"
              >
                <BarChart2 size={16} />
                <span>View Stats ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-sm font-bold transition-all cursor-pointer ${
                showFilters || fromDate || toDate
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                  : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-350 hover:border-indigo-500 hover:text-indigo-600'
              }`}
            >
              <Calendar size={16} />
              <span>Date Filter</span>
              {(fromDate || toDate) && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 ml-0.5"></span>
              )}
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-355 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-850 cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
            <SlidersHorizontal size={14} className="text-gray-400" />
            <span>Filters:</span>
          </div>

          {/* Firm Filter */}
          <select
            value={firmFilter}
            onChange={(e) => {
              setFirmFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 sm:flex-initial min-w-[130px]"
          >
            <option value="">All Firms</option>
            {uniqueFirms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Material Type Filter */}
          <select
            value={materialTypeFilter}
            onChange={(e) => {
              setMaterialTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 sm:flex-initial min-w-[145px]"
          >
            <option value="">All Material Types</option>
            <option value="RM">Raw Material (RM)</option>
            <option value="FG">Finished Goods (FG)</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 sm:flex-initial min-w-[140px] max-w-[200px]"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Material Filter (showing SKU from FG as well as RM) */}
          <select
            value={materialFilter}
            onChange={(e) => {
              setMaterialFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 sm:flex-initial min-w-[180px] max-w-[260px]"
          >
            <option value="">All Materials</option>
            {materialDropdownOptions.map((opt) => (
              <option key={opt.sku || opt.name} value={opt.sku || opt.name}>
                {opt.label} [{opt.materialType}]
              </option>
            ))}
          </select>

          {/* Active Filter Clear Button */}
          {(firmFilter || materialTypeFilter || categoryFilter || materialFilter || search || fromDate || toDate) && (
            <button
              onClick={() => {
                setSearch('');
                setFirmFilter('');
                setMaterialTypeFilter('');
                setCategoryFilter('');
                setMaterialFilter('');
                setFromDate('');
                setToDate('');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl transition-all cursor-pointer ml-auto"
            >
              <X size={14} />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Date Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-955/40 border border-dashed border-gray-200 dark:border-slate-800 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-955 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-955 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end gap-2 w-full">
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-xl cursor-pointer justify-center text-center flex items-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
            >
              Clear Dates
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
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('transactionId')}>
                    Txn ID
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('date')}>
                    Date
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('batchNumber')}>
                    Batch #
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('firm')}>
                    Firm
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('materialType')}>
                    Type
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('category')}>
                    Category
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('materialName')}>
                    Material Name
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('sku')}>
                    SKU
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('qty')}>
                    Quantity
                  </th>
                  <th className="px-4 py-4">No. of Batches</th>
                  <th className="px-4 py-4">Remaining Batches</th>
                  <th className="px-4 py-4">Remaining Material</th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('user')}>
                    User
                  </th>
                  {isAdmin && <th className="px-4 py-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 15 : 14} className="text-center py-10 text-gray-400">
                      No Job Card batch records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isChecked = selectedIds.includes(row.id);
                    const isFG = row.materialType === 'FG';
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
                        <td className="px-4 py-4 font-mono font-bold text-gray-900 dark:text-white">{row.transactionId}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{row.date}</td>
                        <td className="px-4 py-4 font-bold text-indigo-600 dark:text-indigo-400">#{row.batchNumber}</td>
                        <td className="px-4 py-4 font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">{row.firm || '—'}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              isFG
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                            }`}
                          >
                            {isFG ? 'FG' : 'RM'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-700 dark:text-slate-300 whitespace-nowrap">{row.category || '—'}</td>
                        <td className="px-4 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.materialName}</td>
                        <td className="px-4 py-4 font-mono font-bold text-gray-800 dark:text-slate-200 whitespace-nowrap">{row.sku}</td>
                        <td className="px-4 py-4 font-black text-sm">{row.qty.toLocaleString()}</td>
                        <td className="px-4 py-4 text-gray-600 dark:text-slate-400">{row.numBatches}</td>
                        <td className="px-4 py-4 text-gray-600 dark:text-slate-400">{row.remainingBatches}</td>
                        <td className="px-4 py-4 text-gray-600 dark:text-slate-400">{row.remainingMaterial}</td>
                        <td className="px-4 py-4 font-semibold whitespace-nowrap">{row.user || '—'}</td>
                        {isAdmin && (
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenEditModal({
                                    id: row.transactionId,
                                    date: row.date,
                                    sku: row.sku,
                                    name: row.materialName,
                                    firm: row.firm,
                                    qty: row.qty,
                                    type: 'Job Card',
                                    ref: row.ref,
                                    user: row.user,
                                    remarks: row.remarks,
                                    materialType: row.materialType,
                                  })
                                }
                                title="Edit Transaction"
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTxn({ id: row.transactionId, sku: row.sku })}
                                title="Delete Transaction"
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
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
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('id')}>
                    Txn ID
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('date')}>
                    Date
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('firm')}>
                    Firm
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('materialType')}>
                    Type
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('category')}>
                    Category
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('materialName')}>
                    Material Name
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('sku')}>
                    SKU
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('qty')}>
                    Quantity
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('type')}>
                    Movement
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('ref')}>
                    Reference #
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-indigo-500" onClick={() => requestSort('user')}>
                    User
                  </th>
                  <th className="px-4 py-4">Remarks</th>
                  {isAdmin && <th className="px-4 py-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 14 : 13} className="text-center py-10 text-gray-400">
                      No stock movements recorded.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((t) => {
                    const isChecked = selectedIds.includes(t.id);
                    const isFG = t.materialType === 'FG';
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
                        <td className="px-4 py-4 font-mono font-bold text-gray-900 dark:text-white">{t.id}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{t.date}</td>
                        <td className="px-4 py-4 font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">{t.firm || '—'}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              isFG
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                            }`}
                          >
                            {isFG ? 'FG' : 'RM'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-700 dark:text-slate-300 whitespace-nowrap">{t.category || '—'}</td>
                        <td className="px-4 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{t.materialName || t.name}</td>
                        <td className="px-4 py-4 font-mono font-bold text-gray-800 dark:text-slate-200 whitespace-nowrap">
                          <div>{t.sku}</div>
                          {t.fgSku && t.fgSku !== t.sku && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                              FG: {t.fgSku}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 font-black text-sm">{t.qty.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {t.type === 'Job Card' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-850 dark:bg-indigo-950/65 dark:text-indigo-400">
                              <Layers size={12} className="text-indigo-600" />
                              Job Card
                            </span>
                          ) : t.type === 'IN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-850 dark:bg-teal-950/65 dark:text-teal-400">
                              <ArrowDownLeft size={12} className="text-teal-600" />
                              IN (Receive)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-850 dark:bg-rose-955/65 dark:text-rose-400">
                              <ArrowUpRight size={12} className="text-rose-600" />
                              OUT (Issue)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-mono whitespace-nowrap">{t.ref || '—'}</td>
                        <td className="px-4 py-4 font-semibold whitespace-nowrap">{t.user || '—'}</td>
                        <td className="px-4 py-4 max-w-[180px] truncate" title={t.remarks}>
                          {t.remarks || '—'}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(t)}
                                title="Edit Transaction"
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTxn(t)}
                                title="Delete Transaction"
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
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
              const isFG = row.materialType === 'FG';
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
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isFG
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                        }`}
                      >
                        {isFG ? 'FG' : 'RM'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-850 dark:bg-indigo-950/65 dark:text-indigo-400">
                        Batch #{row.batchNumber}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Firm:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{row.firm || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{row.category || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Material Name:</span>
                      <span className="font-bold text-gray-900 dark:text-white text-right">{row.materialName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SKU:</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{row.sku}</span>
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
              const isFG = t.materialType === 'FG';
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
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isFG
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                        }`}
                      >
                        {isFG ? 'FG' : 'RM'}
                      </span>
                      {t.type === 'Job Card' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-850 dark:bg-indigo-950/65 dark:text-indigo-400">
                          <Layers size={11} className="text-indigo-600" />
                          Job Card
                        </span>
                      ) : t.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-850 dark:bg-teal-950/65 dark:text-teal-400">
                          <ArrowDownLeft size={11} className="text-teal-600" />
                          IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-850 dark:bg-rose-950/65 dark:text-rose-400">
                          <ArrowUpRight size={11} className="text-rose-600" />
                          OUT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Firm:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{t.firm || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{t.category || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Material Name:</span>
                      <span className="font-bold text-gray-900 dark:text-white text-right">{t.materialName || t.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SKU:</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-slate-200">
                        {t.sku} {t.fgSku && t.fgSku !== t.sku ? `(FG: ${t.fgSku})` : ''}
                      </span>
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

              {/* Material Type & Movement Breakdown Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Material Type Breakdown */}
                <div className="bg-gray-50 dark:bg-slate-955/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                    Material Type Breakdown
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        RM
                      </span>
                      <span className="text-xs font-black text-gray-900 dark:text-white">
                        {selectedStats.matTypeMap?.RM?.count || 0} items ({(selectedStats.matTypeMap?.RM?.qty || 0).toLocaleString()} units)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        FG
                      </span>
                      <span className="text-xs font-black text-gray-900 dark:text-white">
                        {selectedStats.matTypeMap?.FG?.count || 0} items ({(selectedStats.matTypeMap?.FG?.qty || 0).toLocaleString()} units)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Movement Type Breakdown */}
                <div className="bg-gray-50 dark:bg-slate-955/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                    Movement Type Breakdown
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(selectedStats.typeMap).map(([type, data]) => (
                      <div
                        key={type}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs text-xs"
                      >
                        <span className="font-bold text-gray-900 dark:text-white">{type}:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          {data.count} ({data.qty.toLocaleString()})
                        </span>
                      </div>
                    ))}
                  </div>
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

      {/* Edit Transaction Modal */}
      {editingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Edit Stock Transaction
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                    ID: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{editFormData.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTxn(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Transaction Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Transaction Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Transaction Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Transaction Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="IN">IN (Receive Stock)</option>
                    <option value="OUT">OUT (Issue Stock)</option>
                    <option value="Job Card">Job Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Firm */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Firm / Division
                  </label>
                  <select
                    value={editFormData.firm}
                    onChange={(e) => setEditFormData({ ...editFormData, firm: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Select Firm...</option>
                    {uniqueFirms.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editFormData.qty}
                    onChange={(e) => setEditFormData({ ...editFormData, qty: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SKU Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    SKU Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.sku}
                    onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Material Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reference Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Reference # (PO/WO/GRN)
                  </label>
                  <input
                    type="text"
                    value={editFormData.ref}
                    onChange={(e) => setEditFormData({ ...editFormData, ref: e.target.value })}
                    placeholder="e.g. PO-1002"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Operator Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Operator / User
                  </label>
                  <input
                    type="text"
                    value={editFormData.user}
                    onChange={(e) => setEditFormData({ ...editFormData, user: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  placeholder="Notes about this edit..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTxn(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-850 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60 transition-all"
                >
                  {isUpdating ? "Saving..." : "Update Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
