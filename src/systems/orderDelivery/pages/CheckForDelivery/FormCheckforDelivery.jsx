import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Package } from 'lucide-react';
import { saveDeliveryTransaction, getDeliveryHistory, getCheckedProductNumbers, getIMSStock } from '../../utils/storageManager';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function FormCheckforDelivery({ order, onClose, onSuccess }) {
  const [items, setItems] = useState(() => {
    const history = getDeliveryHistory() || [];
    const checkedProductNumbers = getCheckedProductNumbers(order);
    return order.items?.map((item, idx) => {
      const productNumber = `${order.orderId}-${String(idx + 1).padStart(2, '0')}`;
      const prodHist = history.filter(h => h.orderId === order.orderId && h.productNumber === productNumber);

      const hasNoStock = prodHist.some(h => h.stockStatus === 'No Stock');
      const itemApproveQty = prodHist.reduce((sum, h) => sum + (parseFloat(h.approveQty) || 0), 0);
      const itemPendingQty = (parseFloat(item.qty) || 0) - itemApproveQty;
      const notYetValidated = !checkedProductNumbers.includes(productNumber);

      // Live IMS stock suggests a starting Approve Qty — if it can't cover the
      // full pending qty, Approve Qty comes up short of Qty right away and the
      // Production Qty column picks up the difference automatically.
      const availableStock = getIMSStock(item.productName) ?? 0;
      const suggestedApproveQty = Math.max(0, Math.min(availableStock, itemPendingQty));

      return {
        ...item,
        productNumber,
        availableStock,
        stockStatus: suggestedApproveQty > 0 ? 'In Stock' : 'No Stock', // 'In Stock' | 'No Stock'
        approveQty: suggestedApproveQty > 0 ? String(suggestedApproveQty) : '',
        batchNo: '',
        remarks: '',
        _approvedQty: itemApproveQty,
        _pendingQty: itemPendingQty,
        _isCompleted: hasNoStock || itemPendingQty <= 0 || notYetValidated
      };
    }).filter(item => !item._isCompleted) || [];
  });

  // Row selection — lets the user act on only some products this round and leave
  // the rest pending for a later pass, instead of being forced to fill every row
  // in the modal before anything can be saved. All rows start selected to match
  // the previous "process everything shown" behavior.
  const [selected, setSelected] = useState(() => new Set(items.map(i => i.productNumber)));
  const allSelected = items.length > 0 && items.every(i => selected.has(i.productNumber));

  // A product's Production Qty is whatever's left of its pending qty once
  // Approve Qty is accounted for — live, so it updates as the qty is edited.
  // It's 0 (hidden) once Approve Qty catches up to Qty, or if nothing's entered
  // yet doesn't apply (stays at full pending qty until Approve Qty is typed).
  const getProductionQty = (item) => {
    const approveQty = parseFloat(item.approveQty) || 0;
    return Math.max(0, (item._pendingQty || 0) - approveQty);
  };
  const productionSplitCount = items.filter(i => getProductionQty(i) > 0).length;

  const toggleSelect = (productNumber) => {
    const next = new Set(selected);
    if (next.has(productNumber)) next.delete(productNumber);
    else next.add(productNumber);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.productNumber)));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'stockStatus') {
      if (value === 'No Stock') {
        newItems[index].approveQty = '';
        newItems[index].batchNo = '';
      } else if (value === 'In Stock') {
        // Clear batch number to allow manual input
        newItems[index].batchNo = '';
        // Prefill quantity with Pending Qty
        newItems[index].approveQty = newItems[index]._pendingQty || '';
      }
    }
    setItems(newItems);
  };

  const handleSave = () => {
    const itemsToSave = items.filter(item => selected.has(item.productNumber));
    if (itemsToSave.length === 0) {
      return toast.error('Select at least one product row to save.');
    }

    // Validate only the selected rows — unselected rows stay pending untouched
    for (let i = 0; i < itemsToSave.length; i++) {
      const item = itemsToSave[i];
      if (!item.stockStatus) {
        return toast.error(`Please select Stock Status for ${item.productName}`);
      }
      if (item.stockStatus === 'In Stock') {
        if (!item.approveQty || parseFloat(item.approveQty) <= 0) {
          return toast.error(`Please enter valid Approve Qty for ${item.productName}`);
        }
      }
    }

    // Attach order context to each delivered item. An "In Stock" row whose
    // Approve Qty falls short of Qty also gets a matching "No Stock" row for
    // the shortfall, so that portion flows straight into Production Planning
    // in the same save — no separate action needed.
    //
    // `qty` always stays the order line's original total — the same value on
    // every delivery record for this product, so it reads consistently
    // wherever a product's history is listed. `productionQty` is the separate,
    // explicit field carrying how much of THIS record actually needs producing
    // (Production Planning reads it, falling back to `qty` for older records
    // saved before this field existed).
    const deliveryItems = [];
    itemsToSave.forEach(({ _approvedQty, _pendingQty, ...item }) => {
      const context = {
        orderId: order.orderId,
        dbOrderId: order.dbId || order.id,
        orderItemId: item.id || item.orderItemId,
        division: order.division,
        poNumber: order.poNumber,
        poDate: order.poDate,
        partyName: order.partyName,
        expectedDeliveryDate: order.expectedDeliveryDate,
      };

      if (item.stockStatus === 'No Stock') {
        // Whole remaining pending qty on this line needs producing.
        deliveryItems.push({ ...item, ...context, productionQty: _pendingQty });
        return;
      }

      // In Stock
      deliveryItems.push({ ...item, ...context });

      const productionQty = Math.max(0, (_pendingQty || 0) - (parseFloat(item.approveQty) || 0));
      if (productionQty > 0) {
        deliveryItems.push({
          ...item,
          ...context,
          stockStatus: 'No Stock',
          approveQty: '',
          productionQty,
          batchNo: '',
          remarks: `Auto-routed to Production — shortfall of ${productionQty} ${item.uom || ''}`
        });
      }
    });

    saveDeliveryTransaction(deliveryItems);
    const anySplit = itemsToSave.some(item => item.stockStatus === 'In Stock' && getProductionQty(item) > 0);
    toast.success(
      anySplit
        ? 'Delivery Check Saved! Approved qty sent to Dispatch Planning, the shortfall to Production Planning.'
        : itemsToSave.length < items.length
          ? `${itemsToSave.length} item(s) saved. Remaining items stay pending.`
          : 'Delivery Check Saved!'
    );
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
              <Package size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Stock Verification</h2>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
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
                <p className="text-[10px] text-gray-500 font-medium">Expected Delivery Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(order.expectedDeliveryDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Responsible Person Name</p>
                <p className="text-sm font-bold text-gray-900">{order.responsiblePerson || '-'}</p>
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Delivery Items</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {selected.size}/{items.length} selected
              </span>
            </div>

            {productionSplitCount > 0 && (
              <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-2 rounded-lg">
                <Package size={14} className="shrink-0" />
                {productionSplitCount} product{productionSplitCount > 1 ? 's' : ''} short of full Approve Qty — the shortfall will be sent to Production Planning on save.
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1450px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-3 font-bold text-center w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        checked={allSelected}
                        disabled={items.length === 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Product Number</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Product Name</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">UOM</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">IMS Stock</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Price/Rate</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Total Price</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST %</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST Value</th>
                    <th className="px-3 py-3 font-bold text-right text-indigo-600 whitespace-nowrap">Grand Total</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Stock Status</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Approve Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Production Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Batch No.</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((prod, idx) => {
                    const basic = (parseFloat(prod.qty) || 0) * (parseFloat(prod.priceRate) || 0);
                    const gstPerc = parseFloat(prod.gstPercent || order.globalGstPercent || '0');
                    const gstValue = basic * (gstPerc / 100);
                    const grandTotal = basic + gstValue;

                    const isSelected = selected.has(prod.productNumber);
                    const productionQty = getProductionQty(prod);

                    return (
                      <tr key={prod.productNumber} className={`hover:bg-gray-50/50 ${isSelected ? '' : 'opacity-50'}`}>
                        <td className="px-3 py-3 text-center align-top">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={isSelected}
                            onChange={() => toggleSelect(prod.productNumber)}
                          />
                        </td>
                        <td className="px-3 py-3 text-xs text-indigo-600 font-bold align-top text-center">{prod.productNumber}</td>
                        <td className="px-3 py-3 text-xs text-gray-800 font-medium align-top">{prod.productName}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-center align-top font-bold bg-gray-50">{prod.qty}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 text-center align-top"><span className="bg-gray-100 px-2 py-0.5 rounded">{prod.uom}</span></td>
                        <td className="px-3 py-3 text-xs text-center align-top font-bold">{prod.availableStock}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top font-medium">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top font-medium">₹{basic.toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top">{gstPerc}%</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top font-medium">₹{gstValue.toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs text-indigo-600 text-right align-top font-bold">₹{grandTotal.toFixed(2)}</td>

                        {/* Input fields */}
                        <td className="px-3 py-2 align-top">
                          <select
                            className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                            value={prod.stockStatus}
                            onChange={(e) => handleItemChange(idx, 'stockStatus', e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="In Stock">In Stock</option>
                            <option value="No Stock">No Stock</option>
                          </select>
                        </td>

                        <td className="px-3 py-2 align-top">
                          {prod.stockStatus === 'In Stock' ? (
                            <input
                              type="number"
                              className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500 text-center"
                              placeholder="Qty"
                              value={prod.approveQty}
                              onChange={(e) => handleItemChange(idx, 'approveQty', e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-300 text-xs text-center block py-1.5">-</span>
                          )}
                        </td>

                        {/* Production Qty — shows only while Approve Qty falls short of Qty */}
                        <td className="px-3 py-2 align-top text-center">
                          {productionQty > 0 ? (
                            <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-bold">
                              {productionQty}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-3 py-2 align-top">
                          {prod.stockStatus === 'In Stock' ? (
                            <input
                              type="text"
                              className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500 text-center"
                              placeholder="Batch"
                              value={prod.batchNo}
                              onChange={(e) => handleItemChange(idx, 'batchNo', e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-300 text-xs text-center block py-1.5">-</span>
                          )}
                        </td>

                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500"
                            placeholder="Remarks..."
                            value={prod.remarks}
                            onChange={(e) => handleItemChange(idx, 'remarks', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
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
            disabled={selected.size === 0}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
          >
            <CheckCircle size={16} /> Save Delivery
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
