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

  const renderCard = (order) => (
    <div key={order.orderId} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-bold text-indigo-600 text-sm">{order.orderId}</span>
        <span className="text-[10px] text-gray-500">{formatDate(order.poDate)}</span>
      </div>
      <div className="text-xs text-gray-700 font-medium">{order.partyName}</div>
      <button
        onClick={() => toggleRow(order.orderId)}
        className="mt-2 bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded text-xs font-bold transition-colors w-full flex items-center justify-center gap-1"
      >
        <Eye size={14} /> View Details
      </button>
    </div>
  );

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
