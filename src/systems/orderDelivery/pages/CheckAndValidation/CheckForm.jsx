import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, ArrowRightCircle, Eye, Upload, FileText, AlertTriangle } from 'lucide-react';
import {
  updateReceivedOrder, getCheckedProductNumbers, getReceivedOrders,
  getPaymentHistory, getInvoiceHistory, getConfirmDeliveryHistory, getLogisticHistory
} from '../../utils/storageManager';
import { compressImageFile, validateAttachmentFile, isPdfDataUrl, ATTACHMENT_ACCEPT, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function CheckForm({ order, onClose, onSuccess, isReadOnly = false }) {
  // Party's outstanding balance across ALL their orders — this one included —
  // same math as the Advance / Vendor / Freight Pending tabs, aggregated per
  // party so the validator can see this party's full payment exposure,
  // combining past orders with whatever this current PO still owes.
  const partyPendingBalance = useMemo(() => {
    const allOrders = getReceivedOrders() || [];
    const paymentHistory = getPaymentHistory() || [];
    const invoiceHistory = getInvoiceHistory() || [];
    const confirmHistory = getConfirmDeliveryHistory() || [];
    const logisticRecords = getLogisticHistory() || [];

    const partyOrders = allOrders.filter(o => o.partyName === order.partyName);

    let advance = 0;
    partyOrders.forEach(o => {
      if (o.advancePayment !== 'Yes') return;
      const paid = paymentHistory
        .filter(p => p.orderId === o.orderId && p.paymentType === 'Advance')
        .reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
      const required = parseFloat(o.advanceAmount || 0);
      if (paid < required) advance += (required - paid);
    });

    let vendor = 0;
    partyOrders.forEach(o => {
      const orderInvoices = invoiceHistory.filter(inv => inv.orderId === o.orderId);
      const seen = new Set();
      const uniqueAmounts = [];
      orderInvoices.forEach(inv => {
        if (inv.invoiceNumber && !seen.has(inv.invoiceNumber)) {
          seen.add(inv.invoiceNumber);
          uniqueAmounts.push(parseFloat(inv.invoiceAmount || 0));
        }
      });
      const totalInvoicedValue = uniqueAmounts.reduce((sum, v) => sum + v, 0);
      const effectivePOValue = totalInvoicedValue > 0 ? totalInvoicedValue : parseFloat(o.totalPOValue || 0);

      const orderFullyDelivered = orderInvoices.length > 0 && orderInvoices.every(invoiceItem => {
        const cd = confirmHistory.find(ch => ch.dispatchId === invoiceItem.dispatchId);
        return cd && cd.deliveryStatus === 'Delivered';
      });
      if (!orderFullyDelivered) return;

      const vendorPaid = paymentHistory
        .filter(p => p.orderId === o.orderId && p.paymentType === 'Vendor')
        .reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);

      const remaining = effectivePOValue - vendorPaid;
      if (remaining > 0) vendor += remaining;
    });

    let freight = 0;
    const partyOrderIds = new Set(partyOrders.map(o => o.orderId));
    const seenFreightOrders = new Set();
    logisticRecords.forEach(record => {
      if (!partyOrderIds.has(record.orderId) || seenFreightOrders.has(record.orderId)) return;
      seenFreightOrders.add(record.orderId);
      const itemsForOrder = logisticRecords.filter(r => r.orderId === record.orderId);
      const totalFreightExpected = itemsForOrder.reduce((sum, r) => sum + parseFloat(r.transporterAmount || 0), 0);
      const totalFreightPaid = paymentHistory
        .filter(p => p.orderId === record.orderId && p.paymentType === 'Freight')
        .reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
      const pending = totalFreightExpected - totalFreightPaid;
      if (totalFreightExpected > 0 && pending > 0) freight += pending;
    });

    return { advance, vendor, freight };
  }, [order.partyName, order.orderId]);

  const allSavedConditionsChecked = order.validationChecklist?.catalogPricing &&
    order.validationChecklist?.gstCompliance &&
    order.validationChecklist?.transportationType &&
    order.validationChecklist?.paymentTerms;

  // In History (isReadOnly), always show saved checklist.
  // In Pending, only prefill if the saved checklist is partially filled.
  // If it's fully filled, it means a previous product was just validated, so start fresh for remaining products.
  const shouldPrefill = isReadOnly || (order.validationChecklist && !allSavedConditionsChecked);

  const [checklist, setChecklist] = useState({
    catalogPricing: shouldPrefill ? (order.validationChecklist?.catalogPricing || false) : false,
    gstCompliance: shouldPrefill ? (order.validationChecklist?.gstCompliance || false) : false,
    transportationType: shouldPrefill ? (order.validationChecklist?.transportationType || false) : false,
    paymentTerms: shouldPrefill ? (order.validationChecklist?.paymentTerms || false) : false,
    remarks: shouldPrefill ? (order.validationChecklist?.remarks || '') : ''
  });

  const [poImage, setPoImage] = useState(order.poImage || '');
  const [showImageModal, setShowImageModal] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeError = validateAttachmentFile(file);
    if (sizeError) return toast.error(sizeError);
    try {
      const base64 = await compressImageFile(file);
      setPoImage(base64);
      toast.success('PO file replaced. Click Save to confirm.');
    } catch {
      toast.error('Error reading file');
    }
  };

  // Product numbers that have already been moved on to Check For Delivery in a previous pass
  const movedProductNumbers = new Set(getCheckedProductNumbers(order));

  const productItems = (order.items || []).map((prod, idx) => ({
    ...prod,
    productNumber: `${order.orderId}-${String(idx + 1).padStart(2, '0')}`
  }));

  // Nothing is pre-selected by default — the user picks which pending product(s)
  // they're actually validating right now (auto-selecting everything would show
  // every remaining product re-checked, not just the one originally chosen).
  // Exception: if they'd already picked specific products on an earlier visit and
  // saved with the checklist still incomplete, restore exactly that selection —
  // same "prefill while incomplete" rule the checklist boxes themselves follow.
  const [selected, setSelected] = useState(() => {
    if (!shouldPrefill) return new Set();
    const savedSelection = order.validationChecklist?.selectedProducts || [];
    return new Set(savedSelection.filter(pn => !movedProductNumbers.has(pn)));
  });

  const pendingItems = productItems.filter(p => !movedProductNumbers.has(p.productNumber));
  const allPendingSelected = pendingItems.length > 0 && pendingItems.every(p => selected.has(p.productNumber));

  const toggleSelect = (productNumber) => {
    if (isReadOnly || movedProductNumbers.has(productNumber)) return;
    const next = new Set(selected);
    if (next.has(productNumber)) next.delete(productNumber);
    else next.add(productNumber);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (isReadOnly) return;
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingItems.map(p => p.productNumber)));
    }
  };

  const allConditionsChecked = checklist.catalogPricing && checklist.gstCompliance && checklist.transportationType && checklist.paymentTerms;

  const handleSave = () => {
    const selectedList = Array.from(selected);

    if (!allConditionsChecked) {
      // If they haven't checked all boxes, save checklist progress anyway, but don't
      // move products. Remember which products they'd already picked too, so
      // reopening this order shows the same selection instead of starting blank.
      const updatedOrder = {
        ...order,
        poImage,
        validationChecklist: { ...checklist, selectedProducts: selectedList }
      };
      updateReceivedOrder(updatedOrder);
      toast.success('Checklist progress saved. All 3 conditions must be met to move products.');
      if (onSuccess) onSuccess();
      return;
    }

    if (selectedList.length === 0) {
      // Just save checklist progress
      const updatedOrder = {
        ...order,
        poImage,
        validationChecklist: checklist
      };
      updateReceivedOrder(updatedOrder);
      toast.success('Validation checklist progress saved.');
      if (onSuccess) onSuccess();
      return;
    }

    const checkedProductNumbers = Array.from(new Set([...movedProductNumbers, ...selectedList]));
    const isFullyChecked = checkedProductNumbers.length === productItems.length;

    const updatedOrder = {
      ...order,
      poImage,
      isChecked: isFullyChecked,
      checkedProductNumbers,
      validationChecklist: checklist,
      validatedAt: new Date().toISOString()
    };

    updateReceivedOrder(updatedOrder);
    toast.success(
      isFullyChecked
        ? 'Validation Checklist Saved! Order moved to Check For Delivery.'
        : `${selectedList.length} item(s) moved to Check For Delivery. Remaining items stay pending validation.`
    );
    if (onSuccess) onSuccess();
  };

  return createPortal(
    <>
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
                <h2 className="text-base font-bold text-gray-900 leading-tight">Check & Validation</h2>
                <p className="text-[11px] text-gray-500 font-medium leading-tight">Order: {order.orderId}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

            {/* Summary Grid */}
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Order Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
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
                  <p className="text-[10px] text-gray-500 font-medium">Payment Terms</p>
                  <p className="text-sm font-bold text-gray-900">{order.paymentTerm || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">GST Number</p>
                  <p className="text-sm font-bold text-gray-900">{order.gstNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Advance Status</p>
                  <p className="text-sm font-bold text-gray-900">{order.advancePayment}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Transporter Type</p>
                  <p className="text-sm font-bold text-gray-900">{order.transportingType || '-'}</p>
                </div>
              </div>

              {/* PO Attachment */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => poImage && setShowImageModal(true)}
                    className="w-14 h-14 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center shrink-0 disabled:cursor-default"
                    disabled={!poImage}
                  >
                    {poImage ? (
                      isPdfDataUrl(poImage) ? (
                        <FileText size={22} className="text-indigo-400" />
                      ) : (
                        <img src={poImage} alt="PO Attachment" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <FileText size={22} className="text-gray-300" />
                    )}
                  </button>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">PO Image / File</p>
                    {poImage ? (
                      <button type="button" onClick={() => setShowImageModal(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <Eye size={14} /> View Attachment
                      </button>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No file attached</p>
                    )}
                  </div>
                </div>
                {!isReadOnly && (
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-indigo-300 rounded-lg text-indigo-600 text-xs font-bold cursor-pointer hover:bg-indigo-50 transition-colors shrink-0">
                    <Upload size={14} /> {poImage ? 'Change File' : 'Upload File'}
                    <input type="file" className="hidden" accept={ATTACHMENT_ACCEPT} onChange={handleFileChange} />
                  </label>
                )}
              </div>
            </div>

            {/* Party's Pending Balance — across this party's other orders */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
              <h3 className="text-[10px] uppercase font-bold text-amber-600 mb-3 tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} /> {order.partyName}'s Pending Balance (All Orders)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Pending Advance</p>
                  <p className={`text-sm font-bold ${partyPendingBalance.advance > 0 ? 'text-red-600' : 'text-gray-900'}`}>₹{partyPendingBalance.advance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Pending Vendor</p>
                  <p className={`text-sm font-bold ${partyPendingBalance.vendor > 0 ? 'text-red-600' : 'text-gray-900'}`}>₹{partyPendingBalance.vendor.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Pending Freight</p>
                  <p className={`text-sm font-bold ${partyPendingBalance.freight > 0 ? 'text-red-600' : 'text-gray-900'}`}>₹{partyPendingBalance.freight.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Product Details Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Product Details</h3>
                {!isReadOnly && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {movedProductNumbers.size}/{productItems.length} already moved
                  </span>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                      {!isReadOnly && (
                        <th className="px-4 py-3 font-bold text-center w-10">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={allPendingSelected}
                            disabled={pendingItems.length === 0}
                            onChange={toggleSelectAll}
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 font-bold">Product Number</th>
                      <th className="px-4 py-3 font-bold">Product Name</th>
                      <th className="px-4 py-3 font-bold text-center">Qty</th>
                      <th className="px-4 py-3 font-bold text-center">UOM</th>
                      <th className="px-4 py-3 font-bold text-right">Price/Rate</th>
                      <th className="px-4 py-3 font-bold text-right">Total Price</th>
                      <th className="px-4 py-3 font-bold text-right">GST %</th>
                      <th className="px-4 py-3 font-bold text-right">GST Value</th>
                      <th className="px-4 py-3 font-bold text-right text-indigo-600">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Live view only shows what's still pending — already-moved products are
                        tracked by the badge above, not re-shown here. Read-only history view
                        (viewing a completed record) still shows every product. */}
                    {productItems.filter(p => isReadOnly ? (order.checkedProductNumbers || []).includes(p.productNumber) : !movedProductNumbers.has(p.productNumber)).map((prod, idx) => {
                      const basic = (parseFloat(prod.qty) || 0) * (parseFloat(prod.priceRate) || 0);
                      const gstPerc = parseFloat(prod.gstPercent || order.globalGstPercent || '0');
                      const gstValue = basic * (gstPerc / 100);
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          {!isReadOnly && (
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                checked={selected.has(prod.productNumber)}
                                onChange={() => toggleSelect(prod.productNumber)}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 text-xs text-indigo-600 font-bold">{prod.productNumber}</td>
                          <td className="px-4 py-3 text-xs text-gray-800 font-medium">{prod.productName}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center">{prod.qty}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 text-center">{prod.uom}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">₹{basic.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">{gstPerc}%</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">₹{gstValue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-indigo-600 text-right font-bold">₹{parseFloat(prod.totalValue || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {/* Financial Summary Rows */}
                    <tr className="bg-gray-50/50 border-t-2 border-gray-200">
                      <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-xs font-bold text-gray-600 text-right">Total PO Value:</td>
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-900 text-right">₹{order.totalPOValue?.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-xs font-bold text-gray-600 text-right">Advance Payment:</td>
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-900 text-right">{order.advancePayment}</td>
                    </tr>
                    {order.advancePayment === 'Yes' && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-xs font-bold text-gray-600 text-right">Advance Amount:</td>
                        <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-900 text-right">₹{order.advanceAmount}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Technical & Commercial Validation Checklist</h3>
              <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist.catalogPricing ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={checklist.catalogPricing}
                    onChange={(e) => !isReadOnly && setChecklist({ ...checklist, catalogPricing: e.target.checked })}
                    disabled={isReadOnly}
                  />
                  <span className={`text-sm font-medium ${checklist.catalogPricing ? 'text-indigo-900' : 'text-gray-700'}`}>Catalog Pricing Compliance</span>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist.gstCompliance ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={checklist.gstCompliance}
                    onChange={(e) => !isReadOnly && setChecklist({ ...checklist, gstCompliance: e.target.checked })}
                    disabled={isReadOnly}
                  />
                  <span className={`text-sm font-medium ${checklist.gstCompliance ? 'text-indigo-900' : 'text-gray-700'}`}>GST Tax Compliance</span>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist.transportationType ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={checklist.transportationType}
                    onChange={(e) => !isReadOnly && setChecklist({ ...checklist, transportationType: e.target.checked })}
                    disabled={isReadOnly}
                  />
                  <span className={`text-sm font-medium ${checklist.transportationType ? 'text-indigo-900' : 'text-gray-700'}`}>Transportation Type Validated</span>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist.paymentTerms ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={checklist.paymentTerms}
                    onChange={(e) => !isReadOnly && setChecklist({ ...checklist, paymentTerms: e.target.checked })}
                    disabled={isReadOnly}
                  />
                  <span className={`text-sm font-medium ${checklist.paymentTerms ? 'text-indigo-900' : 'text-gray-700'}`}>Payment Terms Compliance</span>
                </label>

                {/* Remarks Field */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Remarks</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                    rows="3"
                    placeholder="Enter your validation remarks..."
                    value={checklist.remarks}
                    onChange={(e) => !isReadOnly && setChecklist({ ...checklist, remarks: e.target.value })}
                    disabled={isReadOnly}
                  />
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
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm ${(selected.size > 0 && allConditionsChecked) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                <ArrowRightCircle size={16} />
                {(selected.size > 0 && allConditionsChecked) ? 'Save' : 'Save Checklist Progress'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-2 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors z-10 border border-gray-200"
            >
              <X size={20} />
            </button>
            <div className="overflow-auto max-h-[85vh] rounded-xl">
              {isPdfDataUrl(poImage) ? (
                <iframe src={poImage} title="PDF Preview" className="w-full h-[80vh] rounded-xl bg-white" />
              ) : poImage.startsWith('data:image/') ? (
                <img src={poImage} alt="PO Attachment" className="w-full h-auto" />
              ) : (
                <div className="p-10 text-center">
                  <FileText size={48} className="mx-auto text-indigo-200 mb-4" />
                  <p className="text-gray-600">Document Preview Not Available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
