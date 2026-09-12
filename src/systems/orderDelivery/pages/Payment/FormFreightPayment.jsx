import React, { useState } from 'react';
import { X, CheckCircle, Upload, Truck, Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { compressImageFile, validateAttachmentFile, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_MB, formatDateForInput } from '../../utils/helpers';

export default function FormFreightPayment({ agencyData, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    amountPaid: agencyData.pendingAmount || '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    remarks: '',
    lrNumber: agencyData.lrNumber || '',
    lrCopy: agencyData.lrCopy || null,
  });

  const [errors, setErrors] = useState({});

  if (!agencyData) return null;

  // Bilty wasn't captured back at the Vehicle Logistic step — let the user fill it in here.
  const biltyMissing = !agencyData.lrNumber || !agencyData.lrCopy;

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amountPaid) newErrors.amountPaid = 'Amount is required';
    if (parseFloat(formData.amountPaid) <= 0) newErrors.amountPaid = 'Amount must be greater than 0';
    if (parseFloat(formData.amountPaid) > agencyData.pendingAmount) {
      newErrors.amountPaid = 'Amount cannot exceed the pending freight';
    }
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (!formData.paymentMode) newErrors.paymentMode = 'Payment mode is required';
    if (!formData.referenceNo) newErrors.referenceNo = 'Reference No / UTR is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Freight Payment</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Process transporter payment for PO: {agencyData.poNumber}</p>
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
          {/* Agency Details Grid */}
          <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Order ID</p>
                <p className="text-sm font-bold text-indigo-600">{agencyData.orderId}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Transporter Name</p>
                <p className="text-sm font-semibold text-gray-900">{agencyData.transportAgency || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Bilty Number</p>
                <p className="text-sm font-semibold text-gray-900">{agencyData.lrNumber || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Total Expected</p>
                <p className="text-sm font-bold text-gray-700">₹{agencyData.totalFreightExpected?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Freight Paid</p>
                <p className="text-sm font-bold text-emerald-600">₹{(agencyData.totalFreightPaid || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mb-1">Pending Freight</p>
                <p className="text-sm font-bold text-red-600 bg-red-50 inline-block px-2 py-0.5 rounded">₹{(agencyData.pendingAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Truck size={16} className="text-amber-500" />
                Payment Details
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Amount Paid <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountPaid: e.target.value }))}
                    className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium ${errors.amountPaid ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
                    placeholder="Enter amount"
                  />
                </div>
                {errors.amountPaid && <p className="text-[10px] text-red-500 mt-1">{errors.amountPaid}</p>}
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formatDateForInput(formData.paymentDate)}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium ${errors.paymentDate ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
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
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-gray-700"
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
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium ${errors.referenceNo ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
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

          {/* Bilty Details — only shown when missing from Vehicle Logistic */}
          {biltyMissing && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Truck size={16} className="text-amber-500" />
                  Bilty Details <span className="text-gray-400 font-normal normal-case text-xs">(Optional — missing from Vehicle Logistic)</span>
                </h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Bilty Number
                  </label>
                  <input
                    type="text"
                    value={formData.lrNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, lrNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                    placeholder="Enter Bilty Number"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Bilty Copy Upload
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                      <Upload size={16} className="text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Upload Bilty Copy</span>
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
                          setFormData(prev => ({ ...prev, lrCopy: compressed }));
                        }}
                      />
                    </label>
                    {formData.lrCopy && (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={14} /> Uploaded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg font-bold text-sm bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-200 transition-all flex items-center gap-2"
          >
            <CheckCircle size={18} />
            Process Payment
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
