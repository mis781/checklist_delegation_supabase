import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, CheckCircle, ShieldCheck, Upload, Trash2, FileText } from 'lucide-react';
import { saveConfirmDeliveryTransaction, getInvoiceHistory, getConfirmDeliveryHistory } from '../../utils/storageManager';
import { compressImageFile, validateAttachmentFile, isPdfDataUrl, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_MB, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function FormDelivery({ order, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    status: '',
    remarks: ''
  });

  const [imagePreview, setImagePreview] = useState(null);

  // Get pending items for this order
  const allInvoice = getInvoiceHistory() || [];
  const allConfirm = getConfirmDeliveryHistory() || [];
  const orderInvoices = allInvoice.filter(ih => ih.orderId === order.orderId);

  // Matched by dispatchId — each dispatch transaction, including partial ones, is independent
  const initialPendingItems = orderInvoices.filter(invoiceItem => {
    const confirmRecord = allConfirm.find(ch => ch.dispatchId === invoiceItem.dispatchId);
    return !confirmRecord || confirmRecord.deliveryStatus !== 'Delivered';
  }).map(item => {
    // Carry over a per-product Shortage/Remarks entry from an earlier 'In
    // Transit' pass on this same dispatch, so re-opening the form doesn't
    // lose what was already recorded for it.
    const existing = allConfirm.find(ch => ch.dispatchId === item.dispatchId);
    return {
      ...item,
      _selected: false,
      shortage: existing?.shortage || 'No',
      shortageQty: existing?.shortageQty || '',
      productRemarks: existing?.productRemarks || ''
    };
  });

  const [pendingItems, setPendingItems] = useState(initialPendingItems);

  const handleItemChange = (index, field, value) => {
    const newItems = [...pendingItems];
    newItems[index][field] = value;
    setPendingItems(newItems);
  };

  const handleSelectAll = (checked) => {
    const newItems = pendingItems.map(item => ({ ...item, _selected: checked }));
    setPendingItems(newItems);
  };

  const allSelected = pendingItems.length > 0 && pendingItems.every(i => i._selected);

  const latestInvoice = orderInvoices[orderInvoices.length - 1] || {};

  // Prefill if there's an existing 'In Transit' record
  useEffect(() => {
    if (pendingItems.length > 0) {
      const existing = allConfirm.find(ch => ch.dispatchId === pendingItems[0].dispatchId);
      if (existing) {
        setFormData({
          status: existing.deliveryStatus || '',
          remarks: existing.deliveryRemarks || ''
        });
        setImagePreview(existing.deliveryImage || null);
      }
    }
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sizeError = validateAttachmentFile(file);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }
    try {
      // Downscale before storing — localStorage's total quota is only ~5-10MB,
      // so a raw phone photo can blow the whole app's quota by itself.
      const compressed = await compressImageFile(file);
      setImagePreview(compressed);
    } catch {
      toast.error('Error reading file');
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.status) {
      toast.error('Please select a Status');
      return;
    }

    const selectedItems = pendingItems.filter(i => i._selected);
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to update');
      return;
    }

    for (const item of selectedItems) {
      if (item.shortage === 'Yes' && (!item.shortageQty || parseFloat(item.shortageQty) <= 0)) {
        toast.error(`Please enter a valid Shortage Qty for ${item.productName}`);
        return;
      }
    }

    const transactionData = selectedItems.map(item => {
      const originalProduct = order.items?.find(p => 
        p.productNumber === item.productNumber ||
        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
        p.productName === item.productName
      );
      const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
      const gst = parseFloat(item._isCustom ? (item.gstPercent || '0') : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'));
      return {
        ...item,
        priceRate: rate,
        gstPercent: gst,
        deliveryStatus: formData.status,
        deliveryRemarks: formData.remarks,
        deliveryImage: formData.status === 'Delivered' ? imagePreview : null,
        shortage: item.shortage || 'No',
        shortageQty: item.shortage === 'Yes' ? item.shortageQty : ''
      };
    });

    saveConfirmDeliveryTransaction(transactionData);
    toast.success(`Delivery status updated to ${formData.status}!`);
    onSuccess();
  };

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] p-2 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-100 bg-indigo-50/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <ShieldCheck size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Confirm Delivery</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">Update Delivery Status for Order: {order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <form id="confirmDeliveryForm" onSubmit={handleSubmit} className="space-y-6">

            {/* Read-Only Order Info */}
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
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Transporter Name</p>
                  <p className="text-sm font-bold text-gray-900">{latestInvoice.transportAgency || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Vehicle Plate Number</p>
                  <p className="text-sm font-bold text-gray-900">{latestInvoice.vehicleNo || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Driver Full Name</p>
                  <p className="text-sm font-bold text-gray-900">{latestInvoice.driverName || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Driver Contact Number</p>
                  <p className="text-sm font-bold text-gray-900">{latestInvoice.driverMobile || '-'}</p>
                </div>
              </div>
            </div>

            {/* Input Form Section */}
            <div>
              <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Delivery Status</h3>
              <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Status <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Status</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Remarks</label>
                    <input
                      type="text"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Any notes..."
                    />
                  </div>
                </div>

                {/* Attachment Upload — only when marking as Delivered */}
                {formData.status === 'Delivered' && (
                  <div className="mt-4">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Delivery Attachment <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                    {!imagePreview ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group relative">
                        <input
                          type="file"
                          accept={ATTACHMENT_ACCEPT}
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="text-gray-400 group-hover:text-indigo-500 mb-2" size={24} />
                        <p className="text-sm font-medium text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400 mt-1">Image or PDF (max {MAX_ATTACHMENT_SIZE_MB}MB)</p>
                      </div>
                    ) : (
                      <div className="relative border rounded-lg overflow-hidden bg-gray-50 inline-block">
                        {isPdfDataUrl(imagePreview) ? (
                          <div className="h-32 w-40 flex flex-col items-center justify-center gap-1 bg-red-50">
                            <FileText size={28} className="text-red-500" />
                            <span className="text-[10px] font-medium text-gray-600">PDF Attached</span>
                          </div>
                        ) : (
                          <img src={imagePreview} alt="Preview" className="h-32 w-auto object-contain" />
                        )}
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Products Table */}
            <div>
              <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Product Details</h3>
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
                      <th className="px-3 py-3 font-bold text-center whitespace-nowrap text-red-500">Shortage</th>
                      <th className="px-3 py-3 font-bold text-center whitespace-nowrap text-red-500">Shortage Qty</th>
                      <th className="px-3 py-3 font-bold whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingItems.map((item, idx) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === item.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
                        p.productName === item.productName
                      );
                      const qty = item.totalQty || item.approveQty || item.qty || 0;
                      const dispatchQty = parseFloat(item.dispatchQty) || 0;
                      const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      const gstPerc = parseFloat(item._isCustom ? (item.gstPercent || '0') : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'));
                      const totalValue = rate * dispatchQty;
                      const gstValue = totalValue * (gstPerc / 100);
                      const grandTotal = totalValue + gstValue;
                      return (
                        <tr key={idx} className={`hover:bg-gray-50/50 ${item._selected ? 'bg-indigo-50/10' : ''}`}>
                          <td className="px-3 py-3 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={item._selected}
                              onChange={(e) => handleItemChange(idx, '_selected', e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                            />
                          </td>
                          <td className="px-3 py-3 text-xs font-bold text-indigo-600 text-center">{item.dispatchId || '-'}</td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-700 text-center">{item.productNumber}</td>
                          <td className="px-3 py-3 text-xs text-gray-800">{item.productName}</td>
                          {/* <td className="px-3 py-3 text-xs font-bold text-gray-800 text-center bg-gray-50">{qty}</td> */}
                          <td className="px-3 py-3 text-xs text-gray-500 text-center">{item.uom}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-right">₹{rate.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-right">{gstPerc}%</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-center">{formatDate(item.dispatchDate || item.dispatchTimestamp || item.timestamp)}</td>
                          <td className="px-3 py-3 text-xs font-bold text-emerald-600 text-center bg-emerald-50/30">{dispatchQty}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-right">₹{totalValue.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-right">₹{gstValue.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs font-bold text-indigo-600 text-right">₹{grandTotal.toFixed(2)}</td>
                          <td className="px-3 py-2 align-middle">
                            <select
                              disabled={!item._selected}
                              value={item.shortage}
                              onChange={(e) => handleItemChange(idx, 'shortage', e.target.value)}
                              className={`w-full text-xs font-medium px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500
                                ${!item._selected ? 'border-transparent bg-transparent text-gray-400' :
                                  item.shortage === 'Yes' ? 'border-red-300 bg-red-50 text-red-700' :
                                    'border-gray-300 bg-white text-gray-700'}`}
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {item.shortage === 'Yes' ? (
                              <input
                                type="number"
                                disabled={!item._selected}
                                className={`w-full text-xs border rounded p-1.5 focus:outline-none focus:border-indigo-500 text-center ${item._selected ? 'border-gray-300 bg-white text-red-600 font-bold' : 'border-transparent bg-transparent text-gray-400'}`}
                                placeholder="Qty"
                                value={item.shortageQty}
                                onChange={(e) => handleItemChange(idx, 'shortageQty', e.target.value)}
                              />
                            ) : (
                              <span className="text-gray-300 text-xs text-center block py-1.5">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="text"
                              disabled={!item._selected}
                              className={`w-full text-[11px] border rounded p-1.5 focus:outline-none focus:border-indigo-500 ${item._selected ? 'border-gray-300 bg-white' : 'border-transparent bg-transparent text-gray-400 placeholder-transparent'}`}
                              placeholder="Product remark..."
                              value={item.productRemarks}
                              onChange={(e) => handleItemChange(idx, 'productRemarks', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="confirmDeliveryForm"
            disabled={pendingItems.filter(i => i._selected).length === 0}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle size={16} /> Update Status
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
