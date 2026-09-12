import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, PackageSearch, ImagePlus, FileText } from 'lucide-react';
import { savePackagingTransaction, getDispatchHistory, getPackagingHistory } from '../../utils/storageManager';
import { compressImageFile, validateAttachmentFile, isPdfDataUrl, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_MB, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function FormPackaging({ order, onClose, onSuccess }) {
  const [remarks, setRemarks] = useState('');
  const [packagingImage, setPackagingImage] = useState(null);

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
      setPackagingImage(compressed);
    } catch {
      toast.error('Error reading file');
    }
  };

  const [items, setItems] = useState(() => {
    // Get all dispatched items for this order
    const allDispatch = getDispatchHistory() || [];
    const orderDispatches = allDispatch.filter(d => d.orderId === order.orderId);

    // Check packaging history
    const allPackaging = getPackagingHistory() || [];

    // Filter to only items that do not have Packaging = 'Yes'
    const pendingItems = orderDispatches.filter(dispatchItem => {
      return !allPackaging.some(ph => ph.dispatchId === dispatchItem.dispatchId && ph.packagingStatus === 'Yes');
    });

    return pendingItems.map(item => {
      const originalProduct = order.items?.find(p => 
        p.productNumber === item.productNumber ||
        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
        p.productName === item.productName
      );
      // If it was previously marked as 'No', keep that state, otherwise default to 'Yes'
      const prevAction = allPackaging.filter(ph => ph.dispatchId === item.dispatchId).pop();
      return {
        ...item,
        priceRate: parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0,
        gstPercent: originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0',
        packagingStatus: prevAction ? prevAction.packagingStatus : 'Yes',
        productRemarks: '',
        _selected: false
      };
    });
  });

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSelectAll = (checked) => {
    setItems(items.map(item => ({ ...item, _selected: checked })));
  };

  const allSelected = items.length > 0 && items.every(i => i._selected);

  const handleSave = () => {
    const selectedItems = items.filter(i => i._selected);
    if (selectedItems.length === 0) {
      return toast.error('Please select at least one item');
    }

    for (const item of selectedItems) {
      if (!item.packagingStatus || item.packagingStatus === 'Select') {
        return toast.error(`Please choose Yes/No for ${item.productName}`);
      }
    }

    const itemsToSave = selectedItems.map(item => {
      const originalProduct = order.items?.find(p => 
        p.productNumber === item.productNumber ||
        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
        p.productName === item.productName
      );
      return {
        ...item,
        priceRate: parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0,
        gstPercent: originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0',
        packagingRemarks: remarks,
        packagingImage: packagingImage
      };
    });

    savePackagingTransaction(itemsToSave);
    toast.success('Packaging Status Saved Successfully!');
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
              <PackageSearch size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Packaging Planning</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">Order: {order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Order Details Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Order Summary</h3>
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
                <p className="text-[10px] text-gray-500 font-medium">Responsible Person Name</p>
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
            <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">
              Pending Items for Packaging ({items.length})
            </h3>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1300px]">
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
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">DispatchID</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Product Number</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Product Name</th>
                    {/* <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Qty</th> */}
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">UOM</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Price/Rate</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST %</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatch Date</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Dispatch Qty</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Total Value</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST Value</th>
                    <th className="px-3 py-3 font-bold text-right text-indigo-600 whitespace-nowrap">Grand Total</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Packaging</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="py-8 text-center text-sm text-gray-400">
                        No pending items for packaging.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === item.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
                        p.productName === item.productName
                      );
                      const qty = item.totalQty || item.approveQty || item.qty || 0;
                      const dispatchQty = parseFloat(item.dispatchQty) || 0;
                      const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      const gstPerc = parseFloat(originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0');
                      const totalValue = rate * dispatchQty;
                      const gstValue = totalValue * (gstPerc / 100);
                      const grandTotal = totalValue + gstValue;

                      return (
                        <tr key={index} className={`hover:bg-indigo-50/30 transition-colors ${item._selected ? 'bg-indigo-50/10' : ''}`}>
                          <td className="px-3 py-3 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={item._selected}
                              onChange={(e) => handleItemChange(index, '_selected', e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                            />
                          </td>
                          <td className="px-3 py-3 text-xs font-bold text-indigo-600 text-center align-middle">{item.dispatchId || '-'}</td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-700 text-center align-middle">{item.productNumber}</td>
                          <td className="px-3 py-3 text-xs text-gray-800 align-middle">{item.productName}</td>
                          {/* <td className="px-3 py-3 text-xs font-bold text-gray-800 text-center align-middle bg-gray-50">{qty}</td> */}
                          <td className="px-3 py-3 text-xs text-gray-500 text-center align-middle"><span className="bg-gray-100 px-2 py-0.5 rounded">{item.uom}</span></td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-800 text-right align-middle">₹{rate.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-right align-middle">{gstPerc}%</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-center align-middle">{formatDate(item.dispatchDate)}</td>
                          <td className="px-3 py-3 text-xs font-bold text-emerald-600 text-center align-middle bg-emerald-50/30">{dispatchQty}</td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-800 text-right align-middle">₹{totalValue.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-800 text-right align-middle">₹{gstValue.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs font-bold text-indigo-600 text-right align-middle">₹{grandTotal.toFixed(2)}</td>
                          <td className="px-3 py-2 align-middle">
                            <select
                              disabled={!item._selected}
                              value={item.packagingStatus}
                              onChange={(e) => handleItemChange(index, 'packagingStatus', e.target.value)}
                              className={`w-full text-xs font-medium px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500
                                ${!item._selected ? 'border-transparent bg-transparent text-gray-400' :
                                  item.packagingStatus === 'Yes' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                                    item.packagingStatus === 'No' ? 'border-red-300 bg-red-50 text-red-700' :
                                      'border-gray-300 bg-white text-gray-700'}`}
                            >
                              <option value="Select">Select</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="text"
                              disabled={!item._selected}
                              className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-indigo-500 ${item._selected ? 'border-gray-300 bg-white' : 'border-transparent bg-transparent text-gray-400 placeholder-transparent'}`}
                              placeholder="Product remark..."
                              value={item.productRemarks}
                              onChange={(e) => handleItemChange(index, 'productRemarks', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks and Image (order-level, outside the items table) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Global Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                placeholder="Enter packaging remarks..."
                className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Packaging Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center h-[106px] hover:bg-gray-50 transition-colors relative">
                {packagingImage ? (
                  <>
                    {isPdfDataUrl(packagingImage) ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <FileText size={24} className="text-red-500" />
                        <span className="text-[10px] font-medium text-gray-600">PDF Attached</span>
                      </div>
                    ) : (
                      <img src={packagingImage} alt="Packaging" className="max-h-full max-w-full object-contain rounded" />
                    )}
                    <button
                      onClick={() => setPackagingImage(null)}
                      className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-gray-600 hover:text-red-600 shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <ImagePlus size={24} className="text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500 font-medium">Click to upload image or PDF</span>
                    <span className="text-[10px] text-gray-400">Max {MAX_ATTACHMENT_SIZE_MB}MB</span>
                    <input
                      type="file"
                      accept={ATTACHMENT_ACCEPT}
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </>
                )}
              </div>
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
            <CheckCircle size={16} /> Save Packaging
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
