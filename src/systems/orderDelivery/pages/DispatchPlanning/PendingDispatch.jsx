import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, CheckSquare, Eye, Info } from 'lucide-react';
import DataTable from '../../components/DataTable';
import FormDispatch from './FormDispatch';
import InfoPopover from '../../components/InfoPopover';
import { getDeliveryHistory, getDispatchHistory, getDispatchQtyForDeliveryApproverId } from '../../utils/storageManager';
import { formatDate } from '../../utils/helpers';
import TatStageBadge from '../../components/TatStageBadge';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';

export default function PendingDispatch({ data, filters, refresh }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  const renderCard = (order) => (
    <div key={order.orderId} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-bold text-indigo-600 text-sm">{order.orderId}</span>
        <span className="text-[10px] text-gray-500">{formatDate(order.poDate)}</span>
      </div>
      <div className="text-xs text-gray-700 font-medium">{order.partyName}</div>
      <button
        onClick={(e) => handleAction(order, e)}
        className="mt-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded text-xs font-bold transition-colors w-full flex items-center justify-center gap-1"
      >
        <CheckSquare size={14} /> Action
      </button>
    </div>
  );

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
    </>
  );
}
