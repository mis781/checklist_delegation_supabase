import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, FileText, Upload, Plus, Trash2 } from 'lucide-react';
import { saveCallanTransaction, getPackagingHistory, getLogisticHistory, getCallanHistory, getDispatchHistory, getMasterItems, getUOMs } from '../../utils/storageManager';
import { compressImageFile, validateAttachmentFile, ATTACHMENT_ACCEPT, generateId, formatDate, formatDateForInput } from '../../utils/helpers';
import SearchableDropdown from '../../components/SearchableDropdown';
import toast from 'react-hot-toast';

export default function FormCallan({ order, onClose, onSuccess }) {
  const [callanNo, setCallanNo] = useState('');
  const [callanRemarks, setCallanRemarks] = useState('');
  const [callanImagePreview, setCallanImagePreview] = useState(null);
  const [masterItems, setMasterItems] = useState([]);
  const [uoms, setUoms] = useState([]);

  useEffect(() => {
    setMasterItems(getMasterItems() || []);
    setUoms(getUOMs() || []);
  }, []);

  const [items, setItems] = useState(() => {
    const packagingHistory = getPackagingHistory() || [];
    const logisticHistory = getLogisticHistory() || [];
    const callanHistory = getCallanHistory() || [];

    const cleanType = (order.transportingType || '').toLowerCase().replace(/[^a-z]/g, '');
    const isFOR = cleanType === 'for';

    const orderPackaged = packagingHistory.filter(ph => ph.orderId === order.orderId && ph.packagingStatus === 'Yes');

    const itemsReadyForCallan = orderPackaged.filter(packageItem => {
      const inLogistic = logisticHistory.some(lh => lh.dispatchId === packageItem.dispatchId);
      return inLogistic || isFOR;
    });

    return itemsReadyForCallan.filter(readyItem => {
      return !callanHistory.some(ch => ch.dispatchId === readyItem.dispatchId);
    }).map(item => {
      const originalProduct = order.items?.find(p => 
        p.productNumber === item.productNumber ||
        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
        p.productName === item.productName
      );
      return {
        ...item,
        dispatchQty: item.dispatchQty !== undefined ? item.dispatchQty : item.qty,
        priceRate: parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0,
        gstPercent: item._isCustom ? (item.gstPercent || '0') : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'),
        _selected: false
      };
    });
  });

  const getNextDispatchId = (currentItems) => {
    const dispatchHistory = getDispatchHistory() || [];
    const allIds = [
      ...dispatchHistory.map(h => h.dispatchId),
      ...(currentItems || []).map(i => i.dispatchId)
    ].filter(id => id && typeof id === 'string' && id.startsWith('DS-'));

    let maxDS = 0;
    allIds.forEach(id => {
      const num = parseInt(id.replace('DS-', ''), 10);
      if (!isNaN(num) && num > maxDS) {
        maxDS = num;
      }
    });

    return `DS-${String(maxDS + 1).padStart(3, '0')}`;
  };

  const getNextProductNumber = (orderId, currentItems) => {
    const callanHistory = getCallanHistory() || [];
    const dispatchHistory = getDispatchHistory() || [];
    const packagingHistory = getPackagingHistory() || [];

    const prefix = `${orderId}-CUST-`;
    const allProductNumbers = [
      ...callanHistory.filter(h => h.orderId === orderId).map(h => h.productNumber),
      ...dispatchHistory.filter(h => h.orderId === orderId).map(h => h.productNumber),
      ...packagingHistory.filter(h => h.orderId === orderId).map(h => h.productNumber),
      ...(currentItems || []).map(i => i.productNumber)
    ].filter(pn => pn && typeof pn === 'string' && pn.startsWith(prefix));

    let maxCust = 0;
    allProductNumbers.forEach(pn => {
      const numStr = pn.replace(prefix, '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxCust) {
        maxCust = num;
      }
    });

    return `${prefix}${String(maxCust + 1).padStart(2, '0')}`;
  };

  const handleAddItem = () => {
    const nextDsId = getNextDispatchId(items);
    const newProductNumber = getNextProductNumber(order.orderId, items);
    const newItem = {
      // Order-level identifiers — required so history lookups by orderId work
      orderId: order.orderId,
      division: order.division,
      partyName: order.partyName,
      partyNumber: order.partyNumber || '',
      poNumber: order.poNumber,
      poDate: order.poDate,
      gstNumber: order.gstNumber || '',
      transportingType: order.transportingType || '',
      expectedDeliveryDate: order.expectedDeliveryDate || '',
      responsiblePerson: order.responsiblePerson || order.responsiblePersonName || '',
      // Item-level fields
      dispatchId: nextDsId,
      productNumber: newProductNumber,
      productName: '',
      qty: 1,
      dispatchQty: 1,
      uom: uoms[0]?.name || 'NOS',
      priceRate: 0,
      gstPercent: '0',
      dispatchDate: new Date().toISOString().split('T')[0],
      _selected: true,
      _isCustom: true
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSelectAll = (checked) => {
    const newItems = items.map(item => ({ ...item, _selected: checked }));
    setItems(newItems);
  };

  const allSelected = items.length > 0 && items.every(i => i._selected);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sizeError = validateAttachmentFile(file);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      setCallanImagePreview(compressed);
    } catch {
      toast.error('Error reading file');
    }
  };

  const handleSave = () => {
    const selectedItems = items.filter(i => i._selected);
    if (selectedItems.length === 0) {
      return toast.error('Please select at least one item for the Challan');
    }

    if (!callanNo.trim()) {
      return toast.error('Please enter the Challan No');
    }

    for (const item of selectedItems) {
      if (!item.productName || !item.productName.trim()) {
        return toast.error('Please enter a Product Name for all selected items');
      }
      const dQty = parseFloat(item.dispatchQty);
      if (isNaN(dQty) || dQty <= 0) {
        return toast.error(`Please enter a valid Dispatch Qty for ${item.productName}`);
      }
    }

    const payload = selectedItems.map(item => {
      const originalProduct = order.items?.find(p => 
        p.productNumber === item.productNumber ||
        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
        p.productName === item.productName
      );
      const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
      const gst = parseFloat(item._isCustom ? (item.gstPercent || '0') : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'));
      return {
        ...item,
        dispatchQty: parseFloat(item.dispatchQty),
        priceRate: rate,
        gstPercent: gst,
        callanNo,
        callanRemarks,
        callanImage: callanImagePreview
      };
    });

    saveCallanTransaction(payload);
    toast.success('Challan generated successfully!');
    if (onSuccess) onSuccess();
  };

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] p-2 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-6xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-100 bg-indigo-50/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Generate Challan</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">Order: {order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Order Summary Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Order Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-6">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Order ID</p>
                <p className="text-sm font-bold text-gray-900">{order.orderId}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Division</p>
                <p className="text-sm font-bold text-gray-900">{order.division}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">PO Number</p>
                <p className="text-sm font-bold text-gray-900">{order.poNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">PO Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(order.poDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Party Name</p>
                <p className="text-sm font-bold text-gray-900">{order.partyName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Party Number</p>
                <p className="text-sm font-bold text-gray-900">{order.partyNumber || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">GST Number</p>
                <p className="text-sm font-bold text-gray-900">{order.gstNumber || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Responsible Person</p>
                <p className="text-sm font-bold text-gray-900">{order.responsiblePerson || order.responsiblePersonName || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Expected Delivery Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(order.expectedDeliveryDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Transporting Type</p>
                <p className="text-sm font-bold text-gray-900">{order.transportingType || '-'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Challan Items ({items.length})</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200 shadow-sm"
              >
                <Plus size={14} /> Add Product
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-3 font-bold w-[5%] whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatch ID</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Product Number</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Product Name</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">UOM</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Price/Rate</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST %</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatch Date</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatch Qty</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Total Value</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST Value</th>
                    <th className="px-3 py-3 font-bold text-right text-indigo-600 whitespace-nowrap">Grand Total</th>
                    <th className="px-2 py-3 font-bold text-center w-[40px] whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((prod, idx) => {
                    const originalProduct = order.items?.find(p => 
                      p.productNumber === prod.productNumber ||
                      `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === prod.productNumber ||
                      p.productName === prod.productName
                    );
                    const qty = parseFloat(prod.qty) || 0;
                    const dispatchQty = prod.dispatchQty !== undefined && prod.dispatchQty !== '' ? parseFloat(prod.dispatchQty) || 0 : qty;
                    const rate = parseFloat(prod.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                    const gstPerc = parseFloat(prod._isCustom ? (prod.gstPercent || '0') : (originalProduct?.gstPercent || prod.gstPercent || order.globalGstPercent || '0'));

                    const totalValue = dispatchQty * rate;
                    const gstValue = totalValue * (gstPerc / 100);
                    const grandTotal = totalValue + gstValue;

                    return (
                      <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${prod._selected ? 'bg-indigo-50/10' : ''} relative z-10`}>
                        <td className="px-3 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={prod._selected}
                            onChange={(e) => handleItemChange(idx, '_selected', e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                        <td className="px-3 py-3 text-[11px] text-indigo-600 font-bold text-center align-middle">{prod.dispatchId || '-'}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 font-bold text-center align-middle">{prod.productNumber}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-800 font-medium align-middle">
                          {prod._isCustom ? (
                            <SearchableDropdown
                              options={masterItems.map(m => {
                                const label = m.sku && m.sku.trim() !== m.name.trim() ? `${m.name} (${m.sku.trim()})` : m.name;
                                return { value: label, label, rawName: m.name, sku: m.sku };
                              })}
                              value={prod.productName}
                              dropDirection="down"
                              onChange={(val) => {
                                const master = masterItems.find(m => {
                                  const full = m.sku && m.sku.trim() !== m.name.trim() ? `${m.name} (${m.sku.trim()})` : m.name;
                                  return m.name === val || full === val;
                                });
                                const newItems = [...items];
                                newItems[idx].productName = val;
                                if (master) {
                                  newItems[idx].uom = master.uom || newItems[idx].uom || 'NOS';
                                  newItems[idx].priceRate = parseFloat(master.price || master.rate || 0) || newItems[idx].priceRate || 0;
                                  newItems[idx].gstPercent = master.gstPercent || newItems[idx].gstPercent || '0';
                                }
                                setItems(newItems);
                              }}
                              onAdd={(val) => {
                                const newItems = [...items];
                                newItems[idx].productName = val;
                                setItems(newItems);
                              }}
                              placeholder="Select / Type Product"
                              className="h-[32px] text-xs min-w-[200px]"
                            />
                          ) : (
                            prod.productName
                          )}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-gray-500 text-center align-middle">
                          {prod._isCustom ? (
                            <select
                              value={prod.uom}
                              onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                              className="border border-gray-300 rounded p-1 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                            >
                              {uoms.map(u => (
                                <option key={u.id || u.name} value={u.name}>{u.name}</option>
                              ))}
                              {!uoms.some(u => u.name === prod.uom) && <option value={prod.uom}>{prod.uom}</option>}
                            </select>
                          ) : (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{prod.uom}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right font-medium align-middle">
                          {prod._isCustom ? (
                            <input
                              type="number"
                              value={prod.priceRate}
                              onChange={(e) => handleItemChange(idx, 'priceRate', e.target.value)}
                              className="w-20 text-[11px] border border-gray-300 rounded p-1 text-right focus:outline-none focus:border-indigo-500 font-medium"
                              placeholder="0"
                            />
                          ) : (
                            `₹${rate.toFixed(2)}`
                          )}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right align-middle">
                          {prod._isCustom ? (
                            <input
                              type="number"
                              value={prod.gstPercent}
                              onChange={(e) => handleItemChange(idx, 'gstPercent', e.target.value)}
                              className="w-14 text-[11px] border border-gray-300 rounded p-1 text-right focus:outline-none focus:border-indigo-500"
                              placeholder="0"
                            />
                          ) : (
                            `${gstPerc}%`
                          )}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-center font-bold align-middle">{formatDate(prod.dispatchDate || prod.dispatchTimestamp || prod.timestamp)}</td>
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="number"
                            disabled={!prod._selected}
                            className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-indigo-500 text-center ${prod._selected ? 'border-gray-300 bg-white text-emerald-600 font-bold' : 'border-transparent bg-transparent text-gray-400'}`}
                            placeholder="Qty"
                            value={prod.dispatchQty ?? ''}
                            onChange={(e) => handleItemChange(idx, 'dispatchQty', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right font-medium align-middle">₹{totalValue.toFixed(2)}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right font-medium align-middle">₹{gstValue.toFixed(2)}</td>
                        <td className="px-3 py-3 text-[11px] text-indigo-600 text-right font-bold align-middle">₹{grandTotal.toFixed(2)}</td>
                        <td className="px-2 py-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Remove product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="13" className="px-3 py-8 text-center text-gray-400 text-sm">
                        No pending items available for Challan. Click "+ Add Product" to add a new item.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Challan Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-indigo-100 shadow-sm">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Challan No *</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                placeholder="Enter Challan No"
                value={callanNo}
                onChange={(e) => setCallanNo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Challan Attachment</label>
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2.5 text-center flex items-center justify-center gap-2 group-hover:border-indigo-500 group-hover:bg-indigo-50 transition-all">
                  <Upload size={16} className="text-gray-400 group-hover:text-indigo-600" />
                  <span className="text-xs text-gray-500 group-hover:text-indigo-600 font-medium">
                    {callanImagePreview ? 'Change File' : 'Upload File'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Remarks</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                placeholder="Any remarks..."
                value={callanRemarks}
                onChange={(e) => setCallanRemarks(e.target.value)}
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={items.filter(i => i._selected).length === 0}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle size={16} /> Save Challan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
