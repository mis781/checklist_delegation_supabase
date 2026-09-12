import React, { useState, useMemo } from 'react';
import { X, CheckCircle, Upload, CreditCard, Users } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { savePaymentTransaction } from '../../utils/storageManager';
import { compressImageFile, validateAttachmentFile, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_MB, formatDate, formatDateForInput } from '../../utils/helpers';
import SearchableDropdown from '../../components/SearchableDropdown';

// Pay one or many pending orders for a single party in one go — select the party,
// check which of their orders to pay (each with its own amount), then fill the
// payment details (date, mode, reference, receipt, etc.) once for the whole batch.
export default function BatchVendorPayment({ pendingOrders, onClose, onSuccess }) {
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [amounts, setAmounts] = useState({});
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    remarks: '',
  });
  const [errors, setErrors] = useState({});

  const partyOptions = useMemo(() =>
    [...new Set(pendingOrders.map(o => o.partyName).filter(Boolean))].sort().map(p => ({ value: p, label: p }))
  , [pendingOrders]);

  const partyRows = useMemo(() =>
    selectedParty ? pendingOrders.filter(o => o.partyName === selectedParty) : []
  , [pendingOrders, selectedParty]);

  const allRowsSelected = partyRows.length > 0 && partyRows.every(r => selectedOrderIds.has(r.orderId));

  const handleSelectParty = (party) => {
    setSelectedParty(party);
    setSelectedOrderIds(new Set());
    setAmounts({});
  };

  const toggleRow = (row) => {
    const next = new Set(selectedOrderIds);
    if (next.has(row.orderId)) {
      next.delete(row.orderId);
    } else {
      next.add(row.orderId);
      // Default to the full pending amount — user can still edit it down
      setAmounts(prev => ({ ...prev, [row.orderId]: prev[row.orderId] ?? String(row.pendingAmount || 0) }));
    }
    setSelectedOrderIds(next);
  };

  const toggleSelectAll = () => {
    if (allRowsSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(partyRows.map(r => r.orderId)));
      setAmounts(prev => {
        const next = { ...prev };
        partyRows.forEach(r => { next[r.orderId] = next[r.orderId] ?? String(r.pendingAmount || 0); });
        return next;
      });
    }
  };

  const setAmount = (orderId, value) => {
    setAmounts(prev => ({ ...prev, [orderId]: value }));
  };

  const selectedRows = partyRows.filter(r => selectedOrderIds.has(r.orderId));

  const validateForm = () => {
    const newErrors = {};
    if (!selectedParty) newErrors.party = 'Select a party name';
    if (selectedRows.length === 0) newErrors.rows = 'Select at least one order to pay';

    selectedRows.forEach(row => {
      const amt = parseFloat(amounts[row.orderId]);
      if (!amounts[row.orderId] || isNaN(amt) || amt <= 0) {
        newErrors[`amount_${row.orderId}`] = 'Enter a valid amount';
      } else if (amt > row.pendingAmount) {
        newErrors[`amount_${row.orderId}`] = 'Exceeds pending value';
      }
    });

    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (!formData.paymentMode) newErrors.paymentMode = 'Payment mode is required';
    if (!formData.referenceNo) newErrors.referenceNo = 'Reference No / UTR is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Tag every record from this submission with the same batchId so History can
    // show them together as one bulk payment, even though each order still gets
    // its own payment record underneath.
    const batchId = selectedRows.length > 1 ? `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined;

    const records = selectedRows.map(row => ({
      orderId: row.orderId,
      paymentType: 'Vendor',
      amountPaid: amounts[row.orderId],
      paymentDate: formData.paymentDate,
      paymentMode: formData.paymentMode,
      referenceNo: formData.referenceNo,
      remarks: formData.remarks,
      receiptImage: formData.receiptImage,
      batchId,
    }));

    savePaymentTransaction(records);
    toast.success(`Vendor payment recorded for ${records.length} order${records.length > 1 ? 's' : ''}!`);
    if (onSuccess) onSuccess();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Vendor Payment</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Pay one or more pending orders for a party in a single payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {/* Party Selection */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Select Party Name <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 max-w-sm">
              <Users size={16} className="text-gray-400 shrink-0" />
              <SearchableDropdown
                options={partyOptions}
                value={selectedParty}
                onChange={handleSelectParty}
                placeholder="Select a party..."
                className="h-[38px] flex-1"
              />
            </div>
            {errors.party && <p className="text-[10px] text-red-500 mt-1">{errors.party}</p>}
          </div>

          {selectedParty && (
            <div>
              {partyRows.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
                  No pending vendor payments for {selectedParty}.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                        <th className="px-3 py-3 font-bold text-center w-10">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={allRowsSelected}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-3 py-3 font-bold text-center">Order ID</th>
                        <th className="px-3 py-3 font-bold text-center">Division</th>
                        <th className="px-3 py-3 font-bold text-center">PO Number</th>
                        <th className="px-3 py-3 font-bold text-center">Party Name</th>
                        <th className="px-3 py-3 font-bold text-center">Date of Delivery</th>
                        <th className="px-3 py-3 font-bold text-right">Invoice (Pending) Value</th>
                        <th className="px-3 py-3 font-bold text-center w-40">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {partyRows.map(row => {
                        const isSelected = selectedOrderIds.has(row.orderId);
                        const amountError = errors[`amount_${row.orderId}`];
                        return (
                          <tr key={row.orderId} className={`hover:bg-gray-50/50 ${isSelected ? 'bg-emerald-50/20' : ''}`}>
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                checked={isSelected}
                                onChange={() => toggleRow(row)}
                              />
                            </td>
                            <td className="px-3 py-3 text-xs font-bold text-indigo-600 text-center whitespace-nowrap">{row.orderId}</td>
                            <td className="px-3 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{row.division}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 text-center whitespace-nowrap">{row.poNumber}</td>
                            <td className="px-3 py-3 text-xs text-gray-800 font-medium text-center whitespace-nowrap">{row.partyName}</td>
                            <td className="px-3 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{formatDate(row.expectedDeliveryDate)}</td>
                            <td className="px-3 py-3 text-xs font-bold text-red-600 text-right whitespace-nowrap">₹{(row.pendingAmount || 0).toFixed(2)}</td>
                            <td className="px-3 py-3 text-center">
                              <input
                                type="number"
                                disabled={!isSelected}
                                value={isSelected ? (amounts[row.orderId] ?? '') : ''}
                                onChange={(e) => setAmount(row.orderId, e.target.value)}
                                className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium disabled:bg-gray-100 disabled:text-gray-400 ${amountError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
                                placeholder="0.00"
                              />
                              {amountError && <p className="text-[9px] text-red-500 mt-0.5">{amountError}</p>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {errors.rows && <p className="text-[10px] text-red-500 mt-1">{errors.rows}</p>}
            </div>
          )}

          {/* Shared Payment Details — filled once, applied to every selected row */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-500" />
                Payment Details <span className="text-gray-400 font-normal normal-case text-xs">(applies to every selected order)</span>
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formatDateForInput(formData.paymentDate)}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium ${errors.paymentDate ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
                />
                {errors.paymentDate && <p className="text-[10px] text-red-500 mt-1">{errors.paymentDate}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMode: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-gray-700"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Reference No / UTR <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, referenceNo: e.target.value }))}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium ${errors.referenceNo ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
                  placeholder="e.g., UTR123456789"
                />
                {errors.referenceNo && <p className="text-[10px] text-red-500 mt-1">{errors.referenceNo}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium resize-none"
                  placeholder="Any additional notes..."
                ></textarea>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Payment Receipt <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                    <Upload size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Upload Receipt</span>
                    <input
                      type="file"
                      className="hidden"
                      accept={ATTACHMENT_ACCEPT}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const sizeError = validateAttachmentFile(file);
                        if (sizeError) {
                          toast.error(sizeError);
                          return;
                        }
                        const compressed = await compressImageFile(file);
                        setFormData(prev => ({ ...prev, receiptImage: compressed }));
                      }}
                    />
                  </label>
                  {formData.receiptImage && (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={14} /> Uploaded
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">Image or PDF, max {MAX_ATTACHMENT_SIZE_MB}MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-500">
            {selectedRows.length > 0 ? `${selectedRows.length} order(s) selected` : ''}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedRows.length === 0}
              className="px-6 py-2 rounded-lg font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
            >
              <CheckCircle size={18} />
              Process Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
