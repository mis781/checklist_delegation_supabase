import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Eye, X } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { getDispatchHistory } from '../../utils/storageManager';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import TatStageBadge from '../../components/TatStageBadge';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';

export default function HistoryDispatch({ data, filters }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewImage, setViewImage] = useState(null);
  const [tatRules, setTatRules] = useState([]);

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

  const handleImageView = (imgUrl, e) => {
    e.stopPropagation();
    setViewImage(imgUrl);
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "View", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[60px]" },
    { label: "Order ID", className: "sticky left-[60px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number", "GST Number", "Responsible Person Name",
    "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type", "Total Product", "Total PO Value",
    "Total Qty", "Dispatch Qty", "Cancel Qty",
    "Advance Payment", "Advance Amount",
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderCard = (order) => {
    const isExpanded = expandedRows.has(order.orderId);
    const tatStatus = getTatStatusForOrder(order, "Dispatch Planning", tatRules, { isCompleted: true });

    const allDispatch = getDispatchHistory() || [];
    const orderDispatchItems = allDispatch.filter(d => d.orderId === order.orderId);

    const totalQty = orderDispatchItems.reduce((sum, h) => sum + (parseFloat(h.totalQty) || parseFloat(h.qty) || 0), 0);
    const dispatchQty = orderDispatchItems.reduce((sum, h) => sum + (parseFloat(h.dispatchQty) || parseFloat(h.qty) || 0), 0);
    const cancelQty = orderDispatchItems.reduce((sum, h) => sum + (parseFloat(h.cancelQty) || 0), 0);

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
        <div className="grid grid-cols-3 gap-1 text-center bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/60 text-[10px]">
          <div>
            <span className="text-[8px] text-gray-500 block uppercase font-semibold">Total Qty</span>
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
        </div>

        {/* TAT SLA & Stage Status */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-[10px] text-gray-500">
            <span className="text-[9px] uppercase text-gray-400 block font-semibold">Planned Due</span>
            <span className="font-mono font-medium text-gray-700">{tatStatus.dueAt ? formatDate(tatStatus.dueAt) : '—'}</span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <TatStageBadge tatStatus={tatStatus} isCompleted={true} />
          </div>
        </div>

        {/* Expandable Product List Accordion */}
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => toggleRow(order.orderId)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 py-1 hover:text-indigo-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {orderDispatchItems.length}
              </span>
              Dispatched Transactions
            </span>
            <span className="text-[11px] text-indigo-600 flex items-center gap-1">
              {isExpanded ? <>Hide <ChevronUp size={14} /></> : <>View Details <ChevronDown size={14} /></>}
            </span>
          </button>

          {isExpanded && (
            <div className="space-y-2 mt-2 pt-2 border-t border-dashed border-gray-200">
              {orderDispatchItems.map((hist, idx) => (
                <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 text-[11px] space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-gray-900">{hist.productName}</span>
                    <span className="font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                      {hist.productNumber || hist.dispatchId}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-gray-600 text-[10px] pt-1">
                    <div>
                      <span className="text-gray-400 block">Total Qty</span>
                      <span className="font-semibold text-gray-800">{hist.totalQty || hist.qty} {hist.uom}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Dispatch Qty</span>
                      <span className="font-bold text-emerald-600">{hist.dispatchQty || hist.qty}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block">Cancel Qty</span>
                      <span className="font-bold text-red-500">{hist.cancelQty || 0}</span>
                    </div>
                  </div>
                  {hist.remarks && (
                    <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-200/60">
                      <span className="font-semibold text-gray-600">Note:</span> {hist.remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Actions & Media Viewers */}
        {order.poImage && (
          <div className="pt-1">
            <button
              onClick={(e) => handleImageView(order.poImage, e)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye size={14} className="text-indigo-600" /> View PO Image
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderRow = (order) => {
    const isExpanded = expandedRows.has(order.orderId);

    // Get all dispatched items for this order
    const allDispatch = getDispatchHistory() || [];
    const orderDispatchItems = allDispatch.filter(d => d.orderId === order.orderId);

    // Aggregation Math
    const totalQty = orderDispatchItems.reduce((sum, h) => sum + (parseFloat(h.totalQty) || parseFloat(h.qty) || 0), 0);
    const dispatchQty = orderDispatchItems.reduce((sum, h) => sum + (parseFloat(h.dispatchQty) || parseFloat(h.qty) || 0), 0);
    const cancelQty = orderDispatchItems.reduce((sum, h) => sum + (parseFloat(h.cancelQty) || 0), 0);

    return (
      <React.Fragment key={order.orderId}>
        <tr
          onClick={() => toggleRow(order.orderId)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-3 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50 text-center">
            <button className="text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none flex justify-center w-full">
              {isExpanded ? <ChevronUp size={20} /> : <Eye size={18} />}
            </button>
          </td>

          <td className="px-3 py-3 whitespace-nowrap sticky left-[60px] z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
            <span className="text-xs text-indigo-600 font-bold">{order.orderId}</span>
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
            const tatStatus = getTatStatusForOrder(order, "Dispatch Planning", tatRules, { isCompleted: true });
            return (
              <>
                <td className="px-3 py-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap">
                  {tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}
                </td>
                <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <TatStageBadge tatStatus={tatStatus} isCompleted={true} />
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

          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.advancePayment || 'No'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-emerald-600 whitespace-nowrap">{order.advanceAmount ? `₹${order.advanceAmount}` : '-'}</td>

          <td className="px-3 py-3 whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50 text-center" onClick={(e) => e.stopPropagation()}>
            {order.poImage ? (
              <button onClick={(e) => handleImageView(order.poImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <Eye size={16} />
              </button>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan="16" className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100 text-[10px] text-indigo-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center">Dispatch ID</th>
                        <th className="px-4 py-3 font-bold text-center">Product Number</th>
                        <th className="px-4 py-3 font-bold">Product Name</th>
                        <th className="px-4 py-3 font-bold text-center">Total Qty</th>
                        <th className="px-4 py-3 font-bold text-center text-emerald-600">Dispatch Qty</th>
                        <th className="px-4 py-3 font-bold text-center text-red-500">Cancel Qty</th>
                        <th className="px-4 py-3 font-bold text-center">UOM</th>
                        <th className="px-4 py-3 font-bold text-right">Price/Rate</th>
                        <th className="px-4 py-3 font-bold text-right">GST %</th>
                        <th className="px-4 py-3 font-bold text-center">Dispatch Date</th>
                        <th className="px-4 py-3 font-bold text-center">Dispatched Type</th>
                        <th className="px-4 py-3 font-bold text-right">Total Value</th>
                        <th className="px-4 py-3 font-bold text-right">GST Value</th>
                        <th className="px-4 py-3 font-bold text-right text-indigo-600">Grand Total</th>
                        <th className="px-4 py-3 font-bold">Dispatch Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orderDispatchItems.map((hist, idx) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === hist.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === hist.productNumber ||
                        p.productName === hist.productName
                      );
                      const qty = parseFloat(hist.qty) || 0;
                      const dispatchQty = parseFloat(hist.dispatchQty) || qty; // fallback to original qty if it was old data
                      const cancelQty = parseFloat(hist.cancelQty) || 0;
                      const rate = parseFloat(hist.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      const gstPerc = parseFloat(hist._isCustom ? (hist.gstPercent || '0') : (originalProduct?.gstPercent || hist.gstPercent || order.globalGstPercent || '0'));
                      const totalValue = rate * dispatchQty;
                      const gstValue = totalValue * (gstPerc / 100);
                      const grandTotal = totalValue + gstValue;

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] text-indigo-600 font-bold text-center">{hist.dispatchId || '-'}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 font-bold text-center">{hist.productNumber}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-800 font-medium">{hist.productName}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center bg-gray-50 font-bold">{hist.totalQty || qty}</td>
                            <td className="px-4 py-3 text-[11px] text-emerald-600 text-center font-bold bg-emerald-50/30">{dispatchQty}</td>
                            <td className="px-4 py-3 text-[11px] text-red-500 text-center font-bold bg-red-50/30">{cancelQty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{hist.uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center font-bold">{formatDate(hist.dispatchDate)}</td>
                            <td className="px-4 py-3 text-[11px] text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${(hist.dispatchType === 'Partially Dispatch' || (hist.totalQty && dispatchQty < hist.totalQty)) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {hist.dispatchType || (hist.totalQty && dispatchQty < hist.totalQty ? 'Partially Dispatch' : 'Fully Dispatch')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{totalValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-indigo-600 text-right font-bold">₹{grandTotal.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-600 max-w-[150px] truncate" title={hist.dispatchRemarks}>{hist.dispatchRemarks || '-'}</td>
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
        tableKey="o2d_dispatch_history"
        headers={tableHeaders}
        data={paginatedData}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="1750px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        totalResults={filteredData.length}
      />

      {/* Image Modal */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setViewImage(null)}>
          <div className="bg-white p-2 rounded-xl relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-4 -right-4 bg-white text-gray-600 rounded-full p-2 shadow-lg hover:bg-gray-50">
              <X size={20} />
            </button>
            {isPdfDataUrl(viewImage) ? (
              <iframe src={viewImage} title="PDF Preview" className="w-full h-[80vh] rounded-lg bg-white" />
            ) : (
              <img src={viewImage} alt="PO Document" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
