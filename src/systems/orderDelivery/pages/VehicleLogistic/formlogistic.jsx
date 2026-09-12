import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Truck, UploadCloud } from 'lucide-react';
import { saveLogisticTransaction, getPackagingHistory, getLogisticHistory, getTransporterAgencies, saveTransporterAgency } from '../../utils/storageManager';
import { compressImageFile, validateAttachmentFile, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_MB, generateId, formatDate } from '../../utils/helpers';
import SearchableDropdown from '../../components/SearchableDropdown';
import toast from 'react-hot-toast';

// "Ex Factory Transpoter Office" means the shipment changes hands twice — once
// out of the factory, again onward from the transporter's office — so it needs
// two independent sets of vehicle/driver/transport details. Every other
// Transporting Type keeps the existing single-leg flow exactly as it was.
const isTwoLegTransportType = (type) => {
  const clean = (type || '').toLowerCase().replace(/[^a-z]/g, '');
  return clean.includes('transpoter') || clean.includes('transporter') || clean.includes('office');
};

export default function Formlogistic({ order, onClose, onSuccess }) {
  const [agencies, setAgencies] = useState(() => getTransporterAgencies() || []);
  const isTwoLeg = isTwoLegTransportType(order.transportingType);

  // Leg 1 fields — apply to every selected product row in this save action
  const [transportAgency, setTransportAgency] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [transporterAmount, setTransporterAmount] = useState('');
  const [lrCopy, setLrCopy] = useState(null);
  const [biltyStatus, setBiltyStatus] = useState('Select');
  const [remarks, setRemarks] = useState('');

  // Leg 2 fields — only collected/used when isTwoLeg
  const [transportAgency2, setTransportAgency2] = useState('');
  const [vehicleNo2, setVehicleNo2] = useState('');
  const [driverName2, setDriverName2] = useState('');
  const [driverMobile2, setDriverMobile2] = useState('');

  const [items, setItems] = useState(() => {
    // Get all packaged items for this order
    const allPackaging = getPackagingHistory() || [];
    const orderPackaged = allPackaging.filter(ph => ph.orderId === order.orderId && ph.packagingStatus === 'Yes');

    // Check logistic history — matched by dispatchId, since each dispatch
    // transaction (including partial ones) is handled independently
    const allLogistic = getLogisticHistory() || [];

    return orderPackaged
      .filter(packageItem => !allLogistic.some(lh => lh.dispatchId === packageItem.dispatchId))
      .map(item => ({ ...item, _selected: false }));
  });

  const handleAgencyChange = (agencyName) => {
    setTransportAgency(agencyName);
  };

  // "Add New" on either leg's Transport Name dropdown: no popup — just drops the
  // typed name into the field. Vehicle/Driver/Mobile are already collected right
  // there in the form, so the new agency gets registered to master on Save.
  const handleAddNewAgency = (typedName) => setTransportAgency(typedName || '');
  const handleAddNewAgency2 = (typedName) => setTransportAgency2(typedName || '');

  const registerAgencyIfNew = (name, vehicleNoVal, driverNameVal, mobileVal) => {
    if (!name) return;
    const existing = getTransporterAgencies();
    if (existing.some(a => a.name === name)) return;
    const newAgency = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      taNo: `TA-${String(existing.length + 1).padStart(3, '0')}`,
      name,
      vehicleNo: vehicleNoVal,
      driverName: driverNameVal,
      mobile: mobileVal
    };
    saveTransporterAgency(newAgency);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSelectAll = (checked) => {
    setItems(items.map(item => ({ ...item, _selected: checked })));
  };

  const allSelected = items.length > 0 && items.every(i => i._selected);

  const handleLrCopyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sizeError = validateAttachmentFile(file);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      setLrCopy(compressed);
    } catch {
      toast.error('Error reading file');
    }
  };



  const handleSave = () => {
    const selectedItems = items.filter(i => i._selected);
    if (selectedItems.length === 0) {
      return toast.error('Please select at least one item');
    }
    if (!transportAgency) {
      return toast.error(isTwoLeg ? 'Please select Transport Name for Logistic Detail 1' : 'Please select Transport Name');
    }
    if (biltyStatus === 'Select') {
      return toast.error('Please select Bilty Status');
    }
    if (biltyStatus === 'Yes' && !lrNumber.trim()) {
      return toast.error('Please enter Bilty Number');
    }
    if (isTwoLeg && !transportAgency2) {
      return toast.error('Please select Transport Name for Logistic Detail 2');
    }

    // Register any newly-typed transport name(s) into Transporter Agency master
    registerAgencyIfNew(transportAgency, vehicleNo, driverName, driverMobile);
    if (isTwoLeg) registerAgencyIfNew(transportAgency2, vehicleNo2, driverName2, driverMobile2);
    setAgencies(getTransporterAgencies());

    const itemsToSave = selectedItems.map(item => ({
      ...item,
      transportAgency,
      vehicleNo,
      driverName,
      driverMobile,
      lrNumber: biltyStatus === 'Yes' ? lrNumber : '',
      transporterAmount: biltyStatus === 'Yes' ? transporterAmount : '',
      lrCopy: biltyStatus === 'Yes' ? lrCopy : null,
      biltyStatus,
      logisticRemarks: remarks,
      ...(isTwoLeg ? {
        transportAgency2,
        vehicleNo2,
        driverName2,
        driverMobile2
      } : {})
    }));

    saveLogisticTransaction(itemsToSave);
    toast.success('Vehicle Logistic Details Saved Successfully!');
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
              <Truck size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Vehicle Logistic Entry</h2>
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
              Packaged Items for Logistics ({items.length})
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="py-8 text-center text-sm text-gray-400">
                        No pending items for logistics.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const originalProduct = order.items?.find(p => p.productNumber === item.productNumber || `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber);
                      const uom = item.uom || originalProduct?.uom || 'NOS';
                      const dispatchQty = parseFloat(item.dispatchQty) || 0;
                      const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || 0;
                      const gstPerc = parseFloat(originalProduct?.gstPercent || order.globalGstPercent || '0');
                      const totalValue = rate * dispatchQty;
                      const gstValue = totalValue * (gstPerc / 100);
                      const grandTotal = totalValue + gstValue;
                      const dispatchDate = item.dispatchDate || (item.dispatchTimestamp ? item.dispatchTimestamp.split('T')[0] : (item.timestamp ? item.timestamp.split('T')[0] : '')) || '-';

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
                          <td className="px-3 py-3 text-xs text-gray-500 text-center align-middle"><span className="bg-gray-100 px-2 py-0.5 rounded">{uom}</span></td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-800 text-right align-middle">₹{rate.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-right align-middle">{gstPerc}%</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-center align-middle">{formatDate(dispatchDate)}</td>
                          <td className="px-3 py-3 text-xs font-bold text-emerald-600 text-center align-middle bg-emerald-50/30">{dispatchQty}</td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-800 text-right align-middle">₹{totalValue.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs font-medium text-gray-800 text-right align-middle">₹{gstValue.toFixed(2)}</td>
                          <td className="px-3 py-3 text-xs font-bold text-indigo-600 text-right align-middle">₹{grandTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Logistic Inputs — common to all selected product rows */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">
              {isTwoLeg ? 'Logistic Detail 1' : 'Logistic Details'}
            </h3>
            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Transport Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Transport Name <span className="text-red-500">*</span></label>
                  <SearchableDropdown
                    options={agencies.map(a => ({ value: a.name, label: a.name }))}
                    value={transportAgency}
                    onChange={handleAgencyChange}
                    onAdd={handleAddNewAgency}
                    placeholder="Select Transport"
                    className="h-[38px] text-sm"
                  />
                </div>

                {/* Vehicle Plate Number */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Vehicle Plate Number</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. MH-12-AB-1234"
                    className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                  />
                </div>

                {/* Driver Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Driver Full Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver Name"
                    className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                  />
                </div>

                {/* Driver Mobile Contact */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Driver Mobile Contact</label>
                  <input
                    type="text"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    placeholder="Mobile Number"
                    className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                  />
                </div>



                {/* Bilty Status */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Bilty Status <span className="text-red-500">*</span></label>
                  <select
                    value={biltyStatus}
                    onChange={(e) => setBiltyStatus(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                  >
                    <option value="Select">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {biltyStatus === 'Yes' && (
                  <>
                    {/* Bilty Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Bilty Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={lrNumber}
                        onChange={(e) => setLrNumber(e.target.value)}
                        placeholder="Bilty Number"
                        className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                      />
                    </div>

                    {/* Transporter Amount */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Transporter Amount (₹)</label>
                      <input
                        type="number"
                        value={transporterAmount}
                        onChange={(e) => setTransporterAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                      />
                    </div>

                    {/* Bilty Copy Upload */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Bilty Copy Upload <span className="text-gray-400 font-normal normal-case">(Optional, Image or PDF, max {MAX_ATTACHMENT_SIZE_MB}MB)</span></label>
                      <div className="relative">
                        <input
                          type="file"
                          accept={ATTACHMENT_ACCEPT}
                          onChange={handleLrCopyUpload}
                          className="hidden"
                          id="lr-copy-upload"
                        />
                        <label
                          htmlFor="lr-copy-upload"
                          className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <UploadCloud size={18} className={lrCopy ? "text-emerald-500" : "text-gray-400"} />
                          <span className={`text-sm font-medium ${lrCopy ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {lrCopy ? 'Bilty Copy Uploaded' : 'Upload Bilty Copy'}
                          </span>
                        </label>
                        {lrCopy && (
                          <button
                            onClick={(e) => { e.preventDefault(); setLrCopy(null); }}
                            className="absolute right-2 top-2 text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Logistic Detail 2 — second leg, only for Ex Factory Transpoter Office */}
          {isTwoLeg && (
            <div>
              <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Logistic Detail 2</h3>
              <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Transport Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Transport Name <span className="text-red-500">*</span></label>
                    <SearchableDropdown
                      options={agencies.map(a => ({ value: a.name, label: a.name }))}
                      value={transportAgency2}
                      onChange={setTransportAgency2}
                      onAdd={handleAddNewAgency2}
                      placeholder="Select Transport"
                      className="h-[38px] text-sm"
                    />
                  </div>

                  {/* Vehicle Plate Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Vehicle Plate Number</label>
                    <input
                      type="text"
                      value={vehicleNo2}
                      onChange={(e) => setVehicleNo2(e.target.value)}
                      placeholder="e.g. MH-12-AB-1234"
                      className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                    />
                  </div>

                  {/* Driver Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Driver Full Name</label>
                    <input
                      type="text"
                      value={driverName2}
                      onChange={(e) => setDriverName2(e.target.value)}
                      placeholder="Driver Name"
                      className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                    />
                  </div>

                  {/* Driver Mobile Contact */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Driver Mobile Contact</label>
                    <input
                      type="text"
                      value={driverMobile2}
                      onChange={(e) => setDriverMobile2(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Remarks — outside the items table */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Enter remarks..."
              className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
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
            <CheckCircle size={16} /> Save Logistics
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
