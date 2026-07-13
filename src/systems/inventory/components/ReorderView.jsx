// src/systems/inventory/components/ReorderView.jsx
import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Search,
  CheckSquare,
  Square,
  FileSpreadsheet,
  X,
  ClipboardList,
  ChevronDown
} from 'lucide-react';
import { createIndents } from '../../../redux/slice/inventorySlice';

export default function ReorderView({ activeUser, onTabChange }) {
  const dispatch = useDispatch();
  const { materials, transactions, users, locations = [], indents = [], divisions = [] } = useSelector((state) => state.inventory);

  const isViewer = activeUser.role === 'Viewer';

  // State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [firmFilter, setFirmFilter] = useState('');
  const [selectedSkus, setSelectedSkus] = useState(new Set());

  // Indent Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reqName, setReqName] = useState(activeUser.name);
  const [reqLocation, setReqLocation] = useState(activeUser.location || '');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Filter users with permission to inventory system
  const inventoryUsers = useMemo(() => {
    return users.filter(u => {
      if (u.role === 'Admin' || u.role === 'Superadmin') return true;
      if (u.pages === 'all') return true;
      if (Array.isArray(u.pages)) {
        return u.pages.some(page => page.startsWith('inventory_') || page === 'stock');
      }
      return false;
    });
  }, [users]);

  // Filtered requester name dropdown suggestions
  const filteredUserSuggestions = useMemo(() => {
    return inventoryUsers.filter(u => u.name.toLowerCase().includes(reqName.toLowerCase()));
  }, [inventoryUsers, reqName]);

  // Categories list
  const categories = useMemo(() => {
    return [...new Set(materials.map(m => m.category))].filter(Boolean);
  }, [materials]);

  // Derived stock closing values & status bands
  const criticalItems = useMemo(() => {
    // 1. Calculate stock balances per SKU
    const matClosing = {};
    materials.forEach(m => {
      matClosing[m.sku] = Number(m.opening) || 0;
    });

    transactions.forEach(t => {
      if (matClosing[t.sku] !== undefined) {
        if (t.type === 'IN') {
          matClosing[t.sku] += Number(t.qty) || 0;
        } else {
          matClosing[t.sku] -= Number(t.qty) || 0;
        }
      }
    });

    // 2. Map and filter items under reorder thresholds
    const list = [];
    materials.forEach(m => {
      // Check if there is already an active (Pending or Approved) indent for this SKU
      const hasPendingIndent = indents.some(i => i.sku === m.sku && (i.status === 'Pending' || i.status === 'Approved'));
      if (hasPendingIndent) return;

      const closingStock = matClosing[m.sku] || 0;
      const safetyStock = (Number(m.adc) || 0) * (Number(m.safetyFactor) || 0);
      const reorderLevel = ((Number(m.adc) || 0) * (Number(m.leadTime) || 0)) + safetyStock;
      const maxLevel = reorderLevel + (Number(m.moq) || 0);

      // Reorder criteria
      if (m.status === 'Active' && closingStock <= reorderLevel) {
        const reorderQty = Math.max(0, maxLevel - closingStock);
        list.push({
          ...m,
          closingStock,
          safetyStock,
          reorderLevel,
          maxLevel,
          reorderQty
        });
      }
    });

    return list;
  }, [materials, transactions, indents]);

  // Filter reorder items
  const filteredItems = useMemo(() => {
    let rows = activeUser.location
      ? criticalItems.filter(m => m.location === activeUser.location)
      : criticalItems;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    }
    if (category) {
      rows = rows.filter(r => r.category === category);
    }
    if (firmFilter) {
      rows = rows.filter(r => r.division === firmFilter);
    }
    return rows;
  }, [criticalItems, search, category, firmFilter, activeUser]);

  // Toggle select checkbox for a SKU
  const toggleSelect = (sku) => {
    setSelectedSkus(prev => {
      const copy = new Set(prev);
      if (copy.has(sku)) {
        copy.delete(sku);
      } else {
        copy.add(sku);
      }
      return copy;
    });
  };

  // Toggle select all
  const toggleSelectAll = (checked) => {
    if (checked) {
      const skus = filteredItems.map(item => item.sku);
      setSelectedSkus(new Set(skus));
    } else {
      setSelectedSkus(new Set());
    }
  };

  const isAllSelected = filteredItems.length > 0 && selectedSkus.size === filteredItems.length;

  // Selected items list to review
  const selectedItemsToReview = useMemo(() => {
    return criticalItems.filter(item => selectedSkus.has(item.sku));
  }, [criticalItems, selectedSkus]);

  // Trigger generator action
  const handleOpenReviewModal = () => {
    if (selectedSkus.size === 0) return;
    setReqName(activeUser.name);
    setReqLocation(activeUser.location || '');
    setIsModalOpen(true);
  };

  // Handle select requester dropdown
  const handleUserSelect = (name) => {
    const selected = users.find(u => u.name === name);
    if (selected) {
      setReqName(selected.name);
      setReqLocation(selected.location || '');
    } else {
      setReqName(name);
    }
  };

  // Dispatch indentation event
  const handleConfirmIndents = () => {
    if (selectedItemsToReview.length === 0) return;
    dispatch(createIndents({
      items: selectedItemsToReview,
      requestedBy: reqName || 'Unknown',
      department: reqLocation || 'General',
      currentUser: activeUser.name
    }));

    setSelectedSkus(new Set());
    setIsModalOpen(false);
    
    // Redirect to Indents list tab
    if (onTabChange) {
      onTabChange('indent');
    }
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or material name needing reorder..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 lg:flex-initial min-w-[130px]"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={firmFilter}
            onChange={(e) => { setFirmFilter(e.target.value); setSelectedSkus(new Set()); }}
            className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer flex-1 lg:flex-initial min-w-[130px]"
          >
            <option value="">All Firms</option>
            {divisions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        {/* Actions */}
        {!isViewer && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleOpenReviewModal}
              disabled={selectedSkus.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-95 transition-all flex-1 lg:flex-initial justify-center text-center"
            >
              Generate Indent ({selectedSkus.size})
            </button>
          </div>
        )}
      </div>

      {/* Grid List */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-955 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                {!isViewer && (
                  <th className="px-5 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-4.5 h-4.5 rounded-md border-gray-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-5 py-4">SKU Code</th>
                <th className="px-5 py-4">Material Name</th>
                <th className="px-5 py-4">Firm</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Sub Category</th>
                <th className="px-5 py-4">MOQ</th>
                <th className="px-5 py-4">Max Level</th>
                <th className="px-5 py-4">Closing Stock</th>
                <th className="px-5 py-4">Reorder Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-emerald-600 dark:text-emerald-450 font-bold">
                    🎉 Excellent! No materials currently require reorder.
                  </td>
                </tr>
              ) : (
                filteredItems.map(row => (
                  <tr key={row.sku} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/20">
                    {!isViewer && (
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedSkus.has(row.sku)}
                          onChange={() => toggleSelect(row.sku)}
                          className="w-4.5 h-4.5 rounded-md border-gray-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-white">{row.sku}</td>
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
                    <td className="px-5 py-4 text-gray-850 dark:text-slate-200 font-semibold">{row.division || '—'}</td>
                    <td className="px-5 py-4 text-gray-650 dark:text-slate-350">{row.category}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-slate-450">{row.subCategory || '—'}</td>
                    <td className="px-5 py-4">{row.moq.toLocaleString()}</td>
                    <td className="px-5 py-4">{row.maxLevel.toLocaleString()}</td>
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">{row.closingStock.toLocaleString()}</td>
                    <td className="px-5 py-4 font-black text-rose-600 dark:text-rose-455 text-base">
                      {row.reorderQty.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet "Select All" Bar */}
        {!isViewer && filteredItems.length > 0 && (
          <div className="lg:hidden flex items-center gap-2 px-5 py-3.5 bg-gray-50 dark:bg-slate-950/40 border-b border-gray-150 dark:border-slate-800/40 text-xs font-bold text-gray-500 dark:text-slate-400">
            <input
              type="checkbox"
              id="mobile-select-all"
              checked={isAllSelected}
              onChange={(e) => toggleSelectAll(e.target.checked)}
              className="w-4.5 h-4.5 rounded-md border-gray-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="mobile-select-all" className="cursor-pointer">Select All items for Indent</label>
          </div>
        )}

        {/* Card-based layout for mobile and tablet screens */}
        <div className="lg:hidden divide-y divide-gray-100 dark:divide-slate-800/60">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-emerald-600 dark:text-emerald-450 font-bold">
              🎉 Excellent! No materials currently require reorder.
            </div>
          ) : (
            filteredItems.map(row => (
              <div key={row.sku} className="p-5 space-y-3 hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-colors">
                <div className="flex items-start gap-3">
                  {!isViewer && (
                    <input
                      type="checkbox"
                      checked={selectedSkus.has(row.sku)}
                      onChange={() => toggleSelect(row.sku)}
                      className="w-5 h-5 rounded-md border-gray-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500 cursor-pointer mt-1"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate text-base">{row.name}</h4>
                    <p className="font-mono text-xs font-bold text-indigo-650 dark:text-indigo-400 mt-0.5">{row.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Reorder Qty</span>
                    <span className="font-black text-rose-600 dark:text-rose-455 text-base">{row.reorderQty.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-xs pt-2.5 border-t border-dashed border-gray-150 dark:border-slate-800/40">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Firm</span>
                    <span className="text-gray-800 dark:text-slate-200 font-semibold">{row.division || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Category</span>
                    <span className="text-gray-700 dark:text-slate-350 font-bold">{row.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Sub Category</span>
                    <span className="text-gray-700 dark:text-slate-350 font-bold">{row.subCategory || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Closing Stock</span>
                    <span className="text-gray-900 dark:text-white font-bold">{row.closingStock.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">MOQ</span>
                    <span className="text-gray-700 dark:text-slate-350">{row.moq.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Max Level</span>
                    <span className="text-gray-700 dark:text-slate-350">{row.maxLevel.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* INDENT COMPILATION REVIEW MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="text-indigo-500" size={20} />
                <span>Review &amp; Generate Purchase Indents</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Requester fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeUser.role === 'Admin' || activeUser.role === 'Superadmin' ? (
                  <>
                    <div className="flex flex-col gap-1.5 sm:col-span-2 relative text-left">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Requester Name *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={reqName}
                          onChange={(e) => {
                            setReqName(e.target.value);
                            setShowUserDropdown(true);
                          }}
                          onFocus={() => setShowUserDropdown(true)}
                          onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                          placeholder="e.g. Priya Sharma"
                          className="w-full px-3.5 py-2 pr-10 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          tabIndex="-1"
                          onClick={() => setShowUserDropdown(!showUserDropdown)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                          <ChevronDown size={16} className={`transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {showUserDropdown && filteredUserSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-slate-850">
                          {filteredUserSuggestions.map((u) => (
                            <div
                              key={u.name}
                              onMouseDown={() => {
                                setReqName(u.name);
                                setReqLocation(u.location || '');
                                setShowUserDropdown(false);
                              }}
                              className="px-4 py-2 text-sm text-left text-gray-700 dark:text-slate-350 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/45 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                            >
                              {u.name} ({u.role})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Location *</label>
                      <select
                        required
                        value={reqLocation}
                        onChange={(e) => setReqLocation(e.target.value)}
                        className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">— Select Location —</option>
                        {locations.map((l) => (
                          <option key={l.location} value={l.location}>{l.location}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Requested By</label>
                      <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 text-sm font-bold text-gray-900 dark:text-white">
                        {activeUser.name}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</label>
                      <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 text-sm font-bold text-gray-900 dark:text-white">
                        {activeUser.location || 'No Location'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Items Preview Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Requisition Items ({selectedItemsToReview.length})</h4>
                <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 text-gray-505 dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-800">
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Material Name</th>
                        <th className="px-4 py-3">Firm</th>
                        <th className="px-4 py-3">Current Stock</th>
                        <th className="px-4 py-3">Reorder Quantity</th>
                        <th className="px-4 py-3">Supplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-gray-750 dark:text-slate-350">
                      {selectedItemsToReview.map(item => (
                        <tr key={item.sku}>
                          <td className="px-4 py-3 font-mono font-bold">{item.sku}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{item.name}</td>
                          <td className="px-4 py-3 font-semibold text-gray-850 dark:text-slate-300">{item.division || '—'}</td>
                          <td className="px-4 py-3">{item.closingStock.toLocaleString()}</td>
                          <td className="px-4 py-3 text-rose-600 dark:text-rose-450 font-black">{item.reorderQty.toLocaleString()}</td>
                          <td className="px-4 py-3">{item.supplierName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-150 dark:border-slate-800 px-6 py-4 bg-gray-50 dark:bg-slate-950 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-sm font-bold bg-white dark:bg-slate-900 text-gray-750 dark:text-slate-300 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmIndents}
                className="px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                Create Indent(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
