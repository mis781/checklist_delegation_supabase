import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Truck, Calendar } from 'lucide-react';
import { saveDispatchTransaction, getDeliveryHistory, getDispatchHistory, getDispatchQtyForDeliveryApproverId } from '../../utils/storageManager';
import { formatDate, formatDateForInput } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function FormDispatch({ order, onClose, onSuccess }) {
  const [items, setItems] = useState(() => {
    // Get all 'In Stock' deliveries for this order, with their own dispatched/
    // canceled/pending qty worked out first.
    const allHistory = getDeliveryHistory() || [];
    const allDispatch = getDispatchHistory() || [];
    const orderDeliveries = allHistory
      .filter(h => h.orderId === order.orderId && h.stockStatus === 'In Stock')
      .map(delivery => {
        const dispatchedQty = getDispatchQtyForDeliveryApproverId(allDispatch, delivery.deliveryApproverId, 'dispatchQty');
        const canceledQty = getDispatchQtyForDeliveryApproverId(allDispatch, delivery.deliveryApproverId, 'cancelQty');
        const totalQty = parseFloat(delivery.approveQty) || parseFloat(delivery.qty) || 0;
        const pendingQty = totalQty - dispatchedQty - canceledQty;
        return { ...delivery, totalQty, dispatchedQty, canceledQty, pendingQty };
      })
      // Already fully dispatched/canceled — nothing left on this record.
      .filter(delivery => delivery.pendingQty > 0);

    // A product can have more than one delivery-history record here — e.g.
    // part of it was approved In Stock directly, and the rest arrived In
    // Stock later via Production. Merge those into ONE row per Product
    // Number with quantities summed, so the same product isn't offered as two
    // separate rows to dispatch. `_sources` keeps each underlying record's own
    // remaining capacity so Save can still split the entered qty back across
    // the real delivery records (each dispatch transaction stays tied to one
    // deliveryApproverId, same as every other stage expects).
    const byProduct = new Map();
    orderDeliveries.forEach(delivery => {
      const existing = byProduct.get(delivery.productNumber);
      if (existing) {
        existing.totalQty += delivery.totalQty;
        existing.dispatchedQty += delivery.dispatchedQty;
        existing.canceledQty += delivery.canceledQty;
        existing.pendingQty += delivery.pendingQty;
        existing._sources.push({ deliveryApproverId: delivery.deliveryApproverId, pendingQty: delivery.pendingQty });
      } else {
        byProduct.set(delivery.productNumber, {
          ...delivery,
          _sources: [{ deliveryApproverId: delivery.deliveryApproverId, pendingQty: delivery.pendingQty }]
        });
      }
    });

    return Array.from(byProduct.values()).map(item => {
      const originalProduct = order.items?.find(p => 
        p.productNumber === item.productNumber ||
        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
        p.productName === item.productName
      );
      return {
        ...item,
        priceRate: parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0,
        gstPercent: originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0',
        dispatchQty: item.pendingQty,
        cancelQty: '',
        _selected: false,
        dispatchDate: new Date().toISOString().split('T')[0],
        dispatchType: 'Fully Dispatch',
        dispatchRemarks: ''
      };
    });
  });

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSelectAll = (checked) => {
    const newItems = items.map(item => ({ ...item, _selected: checked }));
    setItems(newItems);
  };

  // A row on screen can represent more than one underlying delivery-history
  // record (merged by Product Number — see the `items` initializer). This
  // still saves as ONE dispatch record (one dispatchId) — a single physical
  // dispatch action — with a `sources` breakdown of how the entered qty maps
  // back to each real record's own capacity, filling each one in order.
  // Every later stage (Packaging, Vehicle Logistic, Make Challan, Make
  // Invoice, Confirm Delivery) keys off dispatchId, so this is what keeps a
  // single dispatch action from re-appearing as duplicate rows downstream.
  const buildDispatchRecord = (item) => {
    const dQty = parseFloat(item.dispatchQty) || 0;
    const cQty = parseFloat(item.cancelQty) || 0;
    const capacities = item._sources.map(s => ({ ...s, remaining: s.pendingQty }));

    const allocate = (amount) => {
      const perSource = new Map();
      let left = amount;
      for (const cap of capacities) {
        if (left <= 0) break;
        const take = Math.min(cap.remaining, left);
        if (take > 0) {
          perSource.set(cap.deliveryApproverId, take);
          cap.remaining -= take;
          left -= take;
        }
      }
      return perSource;
    };

    const dispatchBySource = allocate(dQty);
    const cancelBySource = allocate(cQty);
    const sources = item._sources.map(s => ({
      deliveryApproverId: s.deliveryApproverId,
      dispatchQty: dispatchBySource.get(s.deliveryApproverId) || 0,
      cancelQty: cancelBySource.get(s.deliveryApproverId) || 0
    })).filter(s => s.dispatchQty > 0 || s.cancelQty > 0);

    const { _sources, _selected, ...rest } = item;
    const originalProduct = order.items?.find(p => 
      p.productNumber === item.productNumber ||
      `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
      p.productName === item.productName
    );
    const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
    const gst = parseFloat(originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0');
    return {
      ...rest,
      priceRate: rate,
      gstPercent: gst,
      deliveryApproverId: sources[0]?.deliveryApproverId,
      sources
    };
  };

  const handleSave = () => {
    const selectedItems = items.filter(i => i._selected);
    if (selectedItems.length === 0) {
      return toast.error('Please select at least one item to dispatch');
    }

    // Validate selected items
    for (const item of selectedItems) {
      if (!item.dispatchDate) {
        return toast.error(`Please select a dispatch date for ${item.productName}`);
      }

      const dQty = parseFloat(item.dispatchQty) || 0;
      const cQty = parseFloat(item.cancelQty) || 0;

      if (dQty < 0 || cQty < 0) {
        return toast.error(`Negative quantities are not allowed for ${item.productName}`);
      }
      if (dQty === 0 && cQty === 0) {
        return toast.error(`Please enter Dispatch or Cancel Qty for ${item.productName}`);
      }
      if ((dQty + cQty) > parseFloat(item.pendingQty)) {
        return toast.error(`Total of Dispatch and Cancel Qty cannot exceed Pending Qty for ${item.productName}`);
      }
    }

    const transactionItems = selectedItems.map(buildDispatchRecord);
    saveDispatchTransaction(transactionItems);
    toast.success('Items successfully dispatched!');
    if (onSuccess) onSuccess();
  };

  const allSelected = items.length > 0 && items.every(i => i._selected);

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
              <Truck size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Plan Dispatch</h2>
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
            <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Select Items for Dispatch</h3>
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
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Product Number</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Product Name</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Total Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatched Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Pending Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">UOM</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Price/Rate</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Total Price</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST %</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST Value</th>
                    <th className="px-3 py-3 font-bold text-right text-indigo-600 whitespace-nowrap">Grand Total</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatch Date</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatched Type</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatch Qty</th>
                    <th className="px-3 py-3 font-bold text-center text-red-500 whitespace-nowrap">Cancel Qty</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap w-[15%]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((prod, idx) => {
                    const originalProduct = order.items?.find(p => 
                      p.productNumber === prod.productNumber ||
                      `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === prod.productNumber ||
                      p.productName === prod.productName
                    );
                    const qty = parseFloat(prod.dispatchQty) || 0; // compute totals based on dispatch qty being planned
                    const rate = parseFloat(prod.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                    const basic = qty * rate;
                    const gstPerc = parseFloat(originalProduct?.gstPercent || prod.gstPercent || order.globalGstPercent || '0');
                    const gstValue = basic * (gstPerc / 100);
                    const grandTotal = basic + gstValue;

                    return (
                      <tr key={idx} className={`hover:bg-indigo-50/30 transition-colors ${prod._selected ? 'bg-indigo-50/10' : ''}`}>
                        <td className="px-3 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={prod._selected}
                            onChange={(e) => handleItemChange(idx, '_selected', e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                        <td className="px-3 py-3 text-[11px] text-indigo-600 font-bold text-center align-middle">{prod.productNumber}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-800 font-medium align-middle">{prod.productName}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-center font-bold bg-gray-50 align-middle">{prod.totalQty}</td>
                        <td className="px-3 py-3 text-[11px] text-emerald-600 text-center font-bold align-middle">{prod.dispatchedQty}</td>
                        <td className="px-3 py-3 text-[11px] text-orange-600 text-center font-bold bg-orange-50/30 align-middle">{prod.pendingQty}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-500 text-center align-middle"><span className="bg-gray-100 px-2 py-0.5 rounded">{prod.uom}</span></td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right font-medium align-middle">₹{rate.toFixed(2)}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right font-medium align-middle">₹{basic.toFixed(2)}</td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right align-middle">{gstPerc}%</td>
                        <td className="px-3 py-3 text-[11px] text-gray-700 text-right font-medium align-middle">₹{gstValue.toFixed(2)}</td>
                        <td className="px-3 py-3 text-[11px] text-indigo-600 text-right font-bold align-middle">₹{grandTotal.toFixed(2)}</td>

                        <td className="px-3 py-2 align-middle">
                          <div className="relative">
                            <input
                              type="date"
                              disabled={!prod._selected}
                              className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-indigo-500 ${prod._selected ? 'border-gray-300 bg-white' : 'border-transparent bg-transparent text-gray-400'}`}
                              value={formatDateForInput(prod.dispatchDate)}
                              onChange={(e) => handleItemChange(idx, 'dispatchDate', e.target.value)}
                            />
                          </div>
                        </td>

                        <td className="px-3 py-2 align-middle">
                          <select
                            disabled={!prod._selected}
                            className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white ${prod._selected ? 'border-gray-300 text-gray-800 font-medium' : 'border-transparent bg-transparent text-gray-400'}`}
                            value={prod.dispatchType || (parseFloat(prod.dispatchQty) < prod.pendingQty ? 'Partially Dispatch' : 'Fully Dispatch')}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newItems = [...items];
                              newItems[idx].dispatchType = val;
                              if (val === 'Fully Dispatch') {
                                newItems[idx].dispatchQty = prod.pendingQty;
                                newItems[idx].cancelQty = '';
                              }
                              setItems(newItems);
                            }}
                          >
                            <option value="Partially Dispatch">Partially Dispatch</option>
                            <option value="Fully Dispatch">Fully Dispatch</option>
                          </select>
                        </td>

                        <td className="px-3 py-2 align-middle">
                          <input
                            type="number"
                            disabled={!prod._selected}
                            max={prod.pendingQty}
                            className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-indigo-500 text-center ${prod._selected ? 'border-gray-300 bg-white text-indigo-700 font-bold' : 'border-transparent bg-transparent text-gray-400'}`}
                            placeholder="Qty"
                            value={prod.dispatchQty}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numVal = parseFloat(val) || 0;
                              const newItems = [...items];
                              newItems[idx].dispatchQty = val;
                              if (numVal < newItems[idx].pendingQty) {
                                newItems[idx].dispatchType = 'Partially Dispatch';
                              } else if (numVal === newItems[idx].pendingQty) {
                                newItems[idx].dispatchType = 'Fully Dispatch';
                              }
                              setItems(newItems);
                            }}
                          />
                        </td>

                        <td className="px-3 py-2 align-middle">
                          <input
                            type="number"
                            disabled={!prod._selected}
                            className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-red-500 text-center ${prod._selected ? 'border-gray-300 bg-white text-red-600 font-bold' : 'border-transparent bg-transparent text-gray-400'}`}
                            placeholder="Qty"
                            value={prod.cancelQty}
                            onChange={(e) => handleItemChange(idx, 'cancelQty', e.target.value)}
                          />
                        </td>

                        <td className="px-3 py-2 align-middle">
                          <input
                            type="text"
                            disabled={!prod._selected}
                            className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-indigo-500 ${prod._selected ? 'border-gray-300 bg-white' : 'border-transparent bg-transparent text-gray-400 placeholder-transparent'}`}
                            placeholder="Remarks..."
                            value={prod.dispatchRemarks}
                            onChange={(e) => handleItemChange(idx, 'dispatchRemarks', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="17" className="px-3 py-8 text-center text-gray-400 text-sm">
                        No pending items available to dispatch for this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            <CheckCircle size={16} /> Save Dispatch
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
