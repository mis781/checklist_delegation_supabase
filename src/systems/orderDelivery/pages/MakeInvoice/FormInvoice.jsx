import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Save, FileImage, Trash2, CheckCircle, FileText } from 'lucide-react';
import { saveInvoiceTransaction, getCallanHistory, getInvoiceHistory, getLogisticHistory, getTransporterAgencies } from '../../utils/storageManager';
import { compressImageFile, validateAttachmentFile, isPdfDataUrl, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_MB, formatDate, formatDateForInput } from '../../utils/helpers';
import toast from 'react-hot-toast';

// Computes the same Grand Total shown in the products table (Price * Dispatch Qty, plus GST)
const calculateGrandTotal = (order, item) => {
  const originalProduct = order.items?.find(p => 
    p.productNumber === item.productNumber ||
    `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
    p.productName === item.productName
  );
  const dispatchQty = parseFloat(item.dispatchQty) || 0;
  const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
  // For custom items (_isCustom), gstPercent is stored directly on the item record
  const gstPerc = parseFloat(item._isCustom
    ? (item.gstPercent || '0')
    : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'));
  const totalValue = rate * dispatchQty;
  const gstValue = totalValue * (gstPerc / 100);
  return totalValue + gstValue;
};

export default function FormInvoice({ order, onClose, onSuccess }) {
  // Get pending items for this order (in Callan but not Invoice)
  const allCallan = getCallanHistory() || [];
  const allInvoice = getInvoiceHistory() || [];
  const orderCallans = allCallan.filter(ch => ch.orderId === order.orderId);

  // Matched by dispatchId — each dispatch transaction, including partial ones, is independent
  const initialPendingItems = orderCallans.filter(callanItem => {
    return !allInvoice.some(ih => ih.dispatchId === callanItem.dispatchId);
  }).map(item => ({ ...item, _selected: true }));

  const [items, setItems] = useState(initialPendingItems);

  // Pre-fill Invoice Amount with the sum of the Grand Totals shown in the products table
  const suggestedInvoiceAmount = items
    .filter(i => i._selected)
    .reduce((sum, item) => sum + calculateGrandTotal(order, item), 0)
    .toFixed(2);

  // Pre-fill transport/vehicle/driver details from this order's Vehicle Logistic entry
  const allLogistic = getLogisticHistory() || [];
  const orderLogisticItems = allLogistic.filter(lh => lh.orderId === order.orderId);
  const initialLogistic = orderLogisticItems[orderLogisticItems.length - 1] || {};

  const [agencies] = useState(() => getTransporterAgencies() || []);

  const [formData, setFormData] = useState({
    transportAgency: initialLogistic.transportAgency || '',
    vehicleNo: initialLogistic.vehicleNo || '',
    driverName: initialLogistic.driverName || '',
    driverMobile: initialLogistic.driverMobile || '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceAmount: suggestedInvoiceAmount,
    invoiceRemarks: ''
  });

  const handleToggleItem = (dispatchId) => {
    setItems(prev => {
      const next = prev.map(item => item.dispatchId === dispatchId ? { ...item, _selected: !item._selected } : item);
      const newTotal = next.filter(i => i._selected).reduce((sum, item) => sum + calculateGrandTotal(order, item), 0).toFixed(2);
      setFormData(f => ({ ...f, invoiceAmount: newTotal }));
      return next;
    });
  };

  const [imagePreview, setImagePreview] = useState(null);

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
    if (!formData.invoiceNumber || !formData.invoiceDate || !formData.invoiceAmount) {
      toast.error('Please fill Invoice Number, Date and Amount');
      return;
    }

    const selectedItems = items.filter(i => i._selected);
    if (selectedItems.length === 0) {
      toast.error('Please select at least one product to invoice');
      return;
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
        transportAgency: formData.transportAgency,
        vehicleNo: formData.vehicleNo,
        driverName: formData.driverName,
        driverMobile: formData.driverMobile,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        invoiceAmount: formData.invoiceAmount,
        invoiceRemarks: formData.invoiceRemarks,
        invoiceImage: imagePreview
      };
    });

    saveInvoiceTransaction(transactionData);
    toast.success('Invoice details saved successfully!');
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
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Make Invoice</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">Order: {order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <form id="invoiceForm" onSubmit={handleSubmit} className="space-y-6">

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
              </div>
            </div>

            {/* Products Table */}
            <div>
              <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Products To Invoice</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Action</th>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === item.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
                        p.productName === item.productName
                      );
                      const qty = item.totalQty || item.approveQty || item.qty || 0;
                      const dispatchQty = parseFloat(item.dispatchQty) || 0;
                      const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      // For custom items (_isCustom), gstPercent is stored directly on the item record
                      const gstPerc = parseFloat(item._isCustom
                        ? (item.gstPercent || '0')
                        : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'));
                      const totalValue = rate * dispatchQty;
                      const gstValue = totalValue * (gstPerc / 100);
                      const grandTotal = totalValue + gstValue;
                      return (
                        <tr key={idx} className={`hover:bg-gray-50/50 ${!item._selected ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={item._selected}
                              onChange={() => handleToggleItem(item.dispatchId)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Input Form Section */}
            <div>
              <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Invoice Details</h3>
              <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Transport Name</label>
                    <select
                      value={formData.transportAgency}
                      onChange={(e) => setFormData({ ...formData, transportAgency: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Transport</option>
                      {agencies.map(agency => (
                        <option key={agency.id} value={agency.name}>{agency.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Vehicle Plate Number</label>
                    <input
                      type="text"
                      value={formData.vehicleNo}
                      onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Vehicle No"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Driver Full Name</label>
                    <input
                      type="text"
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Driver Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Driver Mobile Contact</label>
                    <input
                      type="text"
                      value={formData.driverMobile}
                      onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Driver Mobile"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Invoice Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter Invoice No."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Invoice Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={formatDateForInput(formData.invoiceDate)}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Invoice Amount <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.invoiceAmount}
                      onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Total Amount"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Remarks</label>
                    <input
                      type="text"
                      value={formData.invoiceRemarks}
                      onChange={(e) => setFormData({ ...formData, invoiceRemarks: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Any notes..."
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div className="mt-4">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Invoice Copy Upload <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
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
            form="invoiceForm"
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <CheckCircle size={16} /> Generate Invoice
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
