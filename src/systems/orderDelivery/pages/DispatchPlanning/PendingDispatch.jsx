import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, CheckSquare, Eye, Info, X } from 'lucide-react';
import DataTable from '../../components/DataTable';
import FormDispatch from './FormDispatch';
import InfoPopover from '../../components/InfoPopover';
import { getDeliveryHistory, getDispatchHistory, getDispatchQtyForDeliveryApproverId } from '../../utils/storageManager';
import { formatDate, isPdfDataUrl } from '../../utils/helpers';
import TatStageBadge from '../../components/TatStageBadge';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';

export default function PendingDispatch({ data, filters, refresh }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [tatRules, setTatRules] = useState([]);

  const handleImageView = (imgUrl, e) => {
    e.stopPropagation();
    if (imgUrl) setViewImage(imgUrl);
  };

  useEffect(() => {
    fetchMasterTatRulesForO2D().then(setTatRules);
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filters.division && item.division !== filters.division) return false;
      if (filters.partyName && item.partyName !== filters.partyName) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          item.orderId?.toLowerCase().includes(q) ||
          item.poNumber?.toLowerCase().includes(q) ||
          item.partyName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, filters]);

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const handleAction = (item, e) => {
    e.stopPropagation();
    setSelectedOrder(item);
    setShowForm(true);
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[80px]" },
    { label: "Order ID", className: "sticky left-[80px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number", "GST Number", "Responsible Person Name", 
    "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type", "Total Product", "Total PO Value", 
    "Total Qty", "Dispatch Qty", "Cancel Qty", "Pending Qty",
    "Advance Payment", "Advance Amount", "Remarks",
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderCard = (order) => {
    const isExpanded = expandedRows.has(order.orderId);
    const tatStatus = getTatStatusForOrder(order, "Dispatch Planning", tatRules, { isCompleted: false });

    const allHistory = getDeliveryHistory() || [];
    const allDispatch = getDispatchHistory() || [];
    const innerItemsAll = allHistory
      .filter(h => h.orderId === order.orderId && h.stockStatus === 'In Stock')
      .map(h => {
        const availableQty = parseFloat(h.approveQty) || parseFloat(h.qty) || 0;
        const dispatchedQty = getDispatchQtyForDeliveryApproverId(allDispatch, h.deliveryApproverId, 'dispatchQty');
        const canceledQty = getDispatchQtyForDeliveryApproverId(allDispatch, h.deliveryApproverId, 'cancelQty');
        return { ...h, _availableQty: availableQty, _dispatchedQty: dispatchedQty, cancelQty: canceledQty, _pendingQty: availableQty - dispatchedQty - canceledQty };
      });

    const innerItemsByProduct = new Map();
    innerItemsAll.filter(h => h._pendingQty > 0).forEach(h => {
      const existing = innerItemsByProduct.get(h.productNumber);
      if (existing) {
        existing._availableQty += h._availableQty;
        existing._dispatchedQty += h._dispatchedQty;
        existing.cancelQty += h.cancelQty;
        existing._pendingQty += h._pendingQty;
      } else {
        innerItemsByProduct.set(h.productNumber, { ...h });
      }
    });
    const innerItems = Array.from(innerItemsByProduct.values());

    const totalQty = innerItemsAll.reduce((sum, h) => sum + h._availableQty, 0);
    const dispatchQty = innerItemsAll.reduce((sum, h) => sum + h._dispatchedQty, 0);
    const cancelQty = innerItemsAll.reduce((sum, h) => sum + (h.cancelQty || 0), 0);
    const pendingQty = totalQty - dispatchQty - cancelQty;

    return (
      <div key={order.orderId} className="bg-white rounded-xl border border-indigo-100 shadow-sm p-3.5 space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md text-xs tracking-wide">
              {order.orderId}
            </span>
            {order.division && (
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {order.division}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md">
            ₹{(Number(order.totalPOValue ?? order.totalPoValue) || 0).toFixed(2)}
          </span>
        </div>

        {/* Party Info */}
        <div className="border-b border-gray-100 pb-2">
          <h4 className="text-sm font-bold text-gray-900 leading-snug">{order.partyName}</h4>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
            {(order.partyNumber || order.partyPhone) && (
              <span>📞 {order.partyNumber || order.partyPhone}</span>
            )}
            {(order.gstNumber || order.partyGst) && (
              <span>GST: <span className="font-mono">{order.gstNumber || order.partyGst}</span></span>
            )}
          </div>
        </div>

        {/* 2-Column Key Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">PO Number</span>
            <span className="font-medium text-gray-800">{order.poNumber || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">PO Date</span>
            <span className="font-medium text-gray-800">{formatDate(order.poDate)}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Exp. Delivery</span>
            <span className="font-medium text-indigo-600">{formatDate(order.expectedDeliveryDate)}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Responsible</span>
            <span className="font-medium text-gray-800 truncate block">{order.responsiblePerson || order.responsiblePersonName || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Transport Type</span>
            <span className="font-medium text-gray-700">{order.transportingType || order.transportType || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Advance</span>
            <span className={`font-semibold ${order.advancePayment === 'Yes' ? 'text-emerald-600' : 'text-gray-500'}`}>
              {order.advancePayment === 'Yes' ? `Yes (₹${order.advanceAmount || 0})` : 'No'}
            </span>
          </div>
        </div>

        {/* Quantity Breakdown Pills */}
        <div className="grid grid-cols-4 gap-1 text-center bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/60 text-[10px]">
          <div>
            <span className="text-[8px] text-gray-500 block uppercase font-semibold">Total</span>
            <span className="font-bold text-gray-800">{totalQty}</span>
          </div>
          <div>
            <span className="text-[8px] text-emerald-600 block uppercase font-semibold">Dispatched</span>
            <span className="font-bold text-emerald-600">{dispatchQty}</span>
          </div>
          <div>
            <span className="text-[8px] text-red-500 block uppercase font-semibold">Canceled</span>
            <span className="font-bold text-red-500">{cancelQty}</span>
          </div>
          <div>
            <span className="text-[8px] text-amber-600 block uppercase font-semibold">Pending</span>
            <span className="font-bold text-amber-600">{pendingQty}</span>
          </div>
        </div>

        {/* TAT SLA & Stage Status */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-[10px] text-gray-500">
            <span className="text-[9px] uppercase text-gray-400 block font-semibold">Planned Due</span>
            <span className="font-mono font-medium text-gray-700">{tatStatus.dueAt ? formatDate(tatStatus.dueAt) : '—'}</span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <TatStageBadge tatStatus={tatStatus} isCompleted={false} />
          </div>
        </div>

        {/* Validation Remarks if any */}
        {order.validationChecklist?.remarks && (
          <div className="text-[11px] bg-amber-50/70 border border-amber-200/60 p-2 rounded-md text-amber-900">
            <span className="font-bold text-[10px] uppercase block text-amber-700">Remarks:</span>
            {order.validationChecklist.remarks}
          </div>
        )}

        {/* Expandable Product List Accordion */}
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => toggleRow(order.orderId)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 py-1 hover:text-indigo-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {innerItems.length}
              </span>
              Pending Dispatch Items
            </span>
            <span className="text-[11px] text-indigo-600 flex items-center gap-1">
              {isExpanded ? <>Hide <ChevronUp size={14} /></> : <>View Products <ChevronDown size={14} /></>}
            </span>
          </button>

          {isExpanded && (
            <div className="space-y-2 mt-2 pt-2 border-t border-dashed border-gray-200">
              {innerItems.map((prod, idx) => (
                <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 text-[11px] space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-gray-900">{prod.productName}</span>
                    <span className="font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                      {prod.productNumber}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-gray-600 text-[10px] pt-1">
                    <div>
                      <span className="text-gray-400 block">Available Qty</span>
                      <span className="font-semibold text-gray-800">{prod._availableQty} {prod.uom}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Dispatched</span>
                      <span className="font-semibold text-emerald-600">{prod._dispatchedQty}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block">Pending</span>
                      <span className="font-bold text-amber-600">{prod._pendingQty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Actions & Media Viewers */}
        <div className="flex items-center gap-2 pt-1">
          {order.poImage && (
            <button
              onClick={(e) => handleImageView(order.poImage, e)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye size={14} className="text-indigo-600" /> View PO
            </button>
          )}
          <button
            onClick={(e) => handleAction(order, e)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200"
          >
            <CheckSquare size={14} /> Action
          </button>
        </div>
      </div>
    );
  };

  const renderRow = (order) => {
    const isExpanded = expandedRows.has(order.orderId);

    // Inner table logic: Show Delivery History items for this order that are 'In Stock'
    // (i.e. have already cleared Check & Validation + Check For Delivery for this order),
    // annotated with how much of each has actually been dispatched so far. A delivery can
    // be dispatched across multiple PARTIAL transactions, so we sum every dispatch record
    // against it rather than treating any single dispatch as "fully done".
    const allHistory = getDeliveryHistory() || [];
    const allDispatch = getDispatchHistory() || [];
    const innerItemsAll = allHistory
      .filter(h => h.orderId === order.orderId && h.stockStatus === 'In Stock')
      .map(h => {
        const availableQty = parseFloat(h.approveQty) || parseFloat(h.qty) || 0;
        const dispatchedQty = getDispatchQtyForDeliveryApproverId(allDispatch, h.deliveryApproverId, 'dispatchQty');
        const canceledQty = getDispatchQtyForDeliveryApproverId(allDispatch, h.deliveryApproverId, 'cancelQty');
        return { ...h, _availableQty: availableQty, _dispatchedQty: dispatchedQty, cancelQty: canceledQty, _pendingQty: availableQty - dispatchedQty - canceledQty };
      });

    // A partial dispatch must NOT remove a product line from the pending list —
    // it only drops off once its own pending qty reaches zero.
    //
    // A product can also have more than one delivery-history record here —
    // e.g. part of it was approved In Stock directly during Check for Delivery,
    // and the rest arrived In Stock later via Production. Merge those into ONE
    // row per Product Number with quantities summed, instead of showing the
    // same product split across duplicate lines.
    const innerItemsByProduct = new Map();
    innerItemsAll.filter(h => h._pendingQty > 0).forEach(h => {
      const existing = innerItemsByProduct.get(h.productNumber);
      if (existing) {
        existing._availableQty += h._availableQty;
        existing._dispatchedQty += h._dispatchedQty;
        existing.cancelQty += h.cancelQty;
        existing._pendingQty += h._pendingQty;
      } else {
        innerItemsByProduct.set(h.productNumber, { ...h });
      }
    });
    const innerItems = Array.from(innerItemsByProduct.values());

    // Aggregation Math — based on what has actually reached the dispatch-ready pool,
    // not the full originally-ordered PO quantity (items still earlier in the pipeline
    // aren't "pending dispatch" yet, they're pending an earlier stage).
    const totalQty = innerItemsAll.reduce((sum, h) => sum + h._availableQty, 0);
    const dispatchQty = innerItemsAll.reduce((sum, h) => sum + h._dispatchedQty, 0);
    const cancelQty = innerItemsAll.reduce((sum, h) => sum + (h.cancelQty || 0), 0);
    const pendingQty = totalQty - dispatchQty - cancelQty;

    return (
      <React.Fragment key={order.orderId}>
        <tr
          onClick={() => toggleRow(order.orderId)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-3 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleAction(order, e)}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-2 py-1.5 rounded text-[11px] font-bold transition-colors flex items-center gap-1 w-full justify-center shadow-sm"
            >
              <CheckSquare size={14} /> Action
            </button>
          </td>

          <td className="px-3 py-3 whitespace-nowrap sticky left-[80px] z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
            <div className="flex items-center gap-2">
              <button className="text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <span className="text-xs text-indigo-600 font-bold">{order.orderId}</span>
            </div>
          </td>

          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.division}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-gray-700 whitespace-nowrap">{order.poNumber}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{formatDate(order.poDate)}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-800 font-medium whitespace-nowrap">{order.partyName}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.partyNumber || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.gstNumber || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.responsiblePerson || order.responsiblePersonName || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-indigo-600 whitespace-nowrap">{formatDate(order.expectedDeliveryDate)}</td>
          {(() => {
            const tatStatus = getTatStatusForOrder(order, "Dispatch Planning", tatRules, { isCompleted: false });
            return (
              <>
                <td className="px-3 py-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap">
                  {tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}
                </td>
                <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <TatStageBadge tatStatus={tatStatus} isCompleted={false} />
                </td>
              </>
            );
          })()}
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.transportingType || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap bg-indigo-50/50">{order.items?.length || 0}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-emerald-600 whitespace-nowrap">₹{order.totalPOValue?.toFixed(2) || '0'}</td>
          
          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-700 whitespace-nowrap bg-gray-50">{totalQty}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-emerald-600 whitespace-nowrap bg-emerald-50/30">{dispatchQty}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-red-500 whitespace-nowrap bg-red-50/30">{cancelQty}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-orange-600 whitespace-nowrap bg-orange-50/30">{pendingQty}</td>

          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.advancePayment || 'No'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-emerald-600 whitespace-nowrap">{order.advanceAmount ? `₹${order.advanceAmount}` : '-'}</td>
          <td className="px-3 py-3 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {order.validationChecklist?.remarks ? (
              <InfoPopover items={[order.validationChecklist.remarks]} title="Remarks">
                <span className="text-[11px] text-indigo-600 flex items-center gap-1 cursor-help hover:text-indigo-800 font-bold">
                  <Info size={12} /> View
                </span>
              </InfoPopover>
            ) : <span className="text-gray-300">-</span>}
          </td>
          
          <td className="px-3 py-3 whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50 text-center" onClick={(e) => e.stopPropagation()}>
            {order.poImage ? (
              <button onClick={(e) => { e.stopPropagation(); /* image view logic */ }} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <Eye size={16} />
              </button>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan="20" className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100 text-[10px] text-indigo-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center">Product Number</th>
                        <th className="px-4 py-3 font-bold">Product Name</th>
                        <th className="px-4 py-3 font-bold text-center">Total Qty</th>
                        <th className="px-4 py-3 font-bold text-center text-emerald-600">Total Dispatch Qty</th>
                        <th className="px-4 py-3 font-bold text-center text-orange-600">Total Pending Qty</th>
                        <th className="px-4 py-3 font-bold text-center text-red-500">Total Cancel Qty</th>
                        <th className="px-4 py-3 font-bold text-center">UOM</th>
                        <th className="px-4 py-3 font-bold text-right">Price/Rate</th>
                        <th className="px-4 py-3 font-bold text-right">Total Price</th>
                        <th className="px-4 py-3 font-bold text-right">GST %</th>
                        <th className="px-4 py-3 font-bold text-right">GST Value</th>
                        <th className="px-4 py-3 font-bold text-right text-indigo-600">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {innerItems.map((hist, idx) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === hist.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === hist.productNumber ||
                        p.productName === hist.productName
                      );
                      
                      const totalQty = hist._availableQty || 0;
                      const dispatchQty = hist._dispatchedQty || 0;
                      const pendingQty = hist._pendingQty || 0;
                      const cancelQty = hist.cancelQty || 0;

                      const rate = parseFloat(hist.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      const basic = pendingQty * rate;
                      const gstPerc = parseFloat(hist._isCustom ? (hist.gstPercent || '0') : (originalProduct?.gstPercent || hist.gstPercent || order.globalGstPercent || '0'));
                      const gstValue = basic * (gstPerc / 100);

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] text-indigo-600 font-bold text-center">{hist.productNumber}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-800 font-medium">{hist.productName}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center bg-gray-50 font-bold">{totalQty}</td>
                            <td className="px-4 py-3 text-[11px] text-emerald-600 text-center bg-emerald-50/30 font-bold">{dispatchQty}</td>
                            <td className="px-4 py-3 text-[11px] text-orange-600 text-center bg-orange-50/30 font-bold">{pendingQty}</td>
                            <td className="px-4 py-3 text-[11px] text-red-500 text-center bg-red-50/30 font-bold">{cancelQty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{hist.uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{basic.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-indigo-600 text-right font-bold">₹{(basic + gstValue).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <DataTable
        tableKey="o2d_dispatch_pending"
        headers={tableHeaders}
        data={paginatedData}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="2000px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        totalResults={filteredData.length}
      />

      {showForm && selectedOrder && (
        <FormDispatch 
          order={selectedOrder}
          onClose={() => {
            setShowForm(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedOrder(null);
            refresh();
          }}
        />
      )}

      {/* Image Modal */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setViewImage(null)}>
          <div className="bg-white rounded-xl p-2 max-w-4xl max-h-[90vh] overflow-auto relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg p-2 transition-colors">
              <X size={20} />
            </button>
            {isPdfDataUrl(viewImage) ? (
              <iframe src={viewImage} title="PDF Preview" className="w-full h-[80vh] rounded-lg bg-white" />
            ) : (
              <img src={viewImage} alt="PO Document" className="block w-full h-auto rounded-lg object-contain max-h-[85vh]" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
