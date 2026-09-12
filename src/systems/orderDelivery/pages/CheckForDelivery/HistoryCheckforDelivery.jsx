import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/DataTable';
import { ChevronDown, ChevronUp, Eye, Info } from 'lucide-react';
import InfoPopover from '../../components/InfoPopover';
import { getReceivedOrders } from '../../utils/storageManager';
import { formatDate } from '../../utils/helpers';
import TatStageBadge from '../../components/TatStageBadge';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';

export default function HistoryCheckforDelivery({ data, filters, refresh }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [tatRules, setTatRules] = useState([]);

  useEffect(() => {
    fetchMasterTatRulesForO2D().then(setTatRules);
  }, []);

  // Data passed here is `historyItems` (flat array of delivery history entries).
  // We need to group them by order to display them exactly like the Pending tab.
  const historyOrders = useMemo(() => {
    const orders = getReceivedOrders() || [];
    // Find all unique orderIds in the history
    const historyOrderIds = [...new Set(data.map(h => h.orderId))];
    
    // Get the full order objects for those IDs
    return historyOrderIds.map(id => orders.find(o => o.orderId === id)).filter(Boolean);
  }, [data]);

  const filteredData = useMemo(() => {
    return historyOrders.filter(item => {
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
  }, [historyOrders, filters]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const tableHeaders = [
    { label: "Order ID", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number",
    "GST Number", "Responsible Person Name", "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type",
    "GST%", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount", "Remarks", 
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderRow = (item) => {
    const isExpanded = expandedRows.has(item.id);
    const orderHistory = data.filter(h => h.orderId === item.orderId);

    return (
      <React.Fragment key={item.id}>
        <tr
          onClick={() => toggleRow(item.id)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <button className="text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <span className="text-xs text-indigo-600 font-bold">{item.orderId}</span>
            </div>
          </td>

          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.division}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap">{item.poNumber}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{formatDate(item.poDate)}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap font-medium">{item.partyName}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.partyNumber || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.gstNumber || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.responsiblePerson || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{formatDate(item.expectedDeliveryDate)}</td>
          {(() => {
            const tatStatus = getTatStatusForOrder(item, "Stock Verification", tatRules, { isCompleted: true });
            return (
              <>
                <td className="px-4 py-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap">
                  {tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <TatStageBadge tatStatus={tatStatus} isCompleted={true} />
                </td>
              </>
            );
          })()}
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.transportingType || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.globalGstPercent || '0'}%</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap">
            <span className="bg-indigo-50 font-bold rounded-lg px-2 py-1">{item.items?.length || 0}</span>
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-emerald-600 font-bold whitespace-nowrap">₹{item.totalPOValue?.toFixed(2)}</td>
          <td className="px-4 py-3 text-center whitespace-nowrap">
            <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${item.advancePayment === 'Yes' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
              {item.advancePayment}
            </span>
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-emerald-600 whitespace-nowrap">
            {item.advancePayment === 'Yes' && item.advanceAmount ? `₹${item.advanceAmount}` : '-'}
          </td>
          <td className="px-4 py-3 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {item.validationChecklist?.remarks ? (
              <InfoPopover items={[item.validationChecklist.remarks]} title="Remarks">
                <span className="text-[11px] text-indigo-600 flex items-center gap-1 cursor-help hover:text-indigo-800 font-bold">
                  <Info size={12} /> View
                </span>
              </InfoPopover>
            ) : <span className="text-gray-300">-</span>}
          </td>
          <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
            {item.poImage ? (
              <button onClick={(e) => { e.stopPropagation(); /* image view logic */ }} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <Eye size={16} />
              </button>
            ) : <span className="text-gray-300">-</span>}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan={17} className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100 text-[10px] text-indigo-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center whitespace-nowrap">Product Number</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Product Name</th>
                        <th className="px-4 py-3 font-bold text-center whitespace-nowrap">Qty</th>
                        <th className="px-4 py-3 font-bold text-center whitespace-nowrap">UOM</th>
                        <th className="px-4 py-3 font-bold text-right whitespace-nowrap">Price/Rate</th>
                        <th className="px-4 py-3 font-bold text-right whitespace-nowrap">Total Price</th>
                        <th className="px-4 py-3 font-bold text-right whitespace-nowrap">GST %</th>
                        <th className="px-4 py-3 font-bold text-right whitespace-nowrap">GST Value</th>
                        <th className="px-4 py-3 font-bold text-right text-indigo-600 whitespace-nowrap">Grand Total</th>
                        <th className="px-4 py-3 font-bold text-center whitespace-nowrap">Stock Status</th>
                        <th className="px-4 py-3 font-bold text-center whitespace-nowrap">Approve Qty</th>
                        <th className="px-4 py-3 font-bold text-center whitespace-nowrap">Production Qty</th>
                        <th className="px-4 py-3 font-bold text-center whitespace-nowrap">Batch No.</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orderHistory.map((hist, idx) => {
                        const originalProduct = item.items?.find(p => `${item.orderId}-${String(item.items.indexOf(p) + 1).padStart(2, '0')}` === hist.productNumber);
                        const basic = (parseFloat(hist.qty) || 0) * (parseFloat(hist.priceRate) || 0);
                        const gstPerc = parseFloat(originalProduct?.gstPercent || item.globalGstPercent || '0');
                        const gstValue = basic * (gstPerc / 100);
                        const grandTotal = basic + gstValue;

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] text-indigo-600 font-bold text-center whitespace-nowrap">{hist.productNumber}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-800 font-medium whitespace-nowrap">{hist.productName}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center whitespace-nowrap">{hist.qty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center whitespace-nowrap"><span className="bg-gray-100 px-2 py-0.5 rounded">{hist.uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium whitespace-nowrap">₹{parseFloat(hist.priceRate || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium whitespace-nowrap">₹{basic.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right whitespace-nowrap">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium whitespace-nowrap">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-indigo-600 text-right font-bold whitespace-nowrap">₹{grandTotal.toFixed(2)}</td>
                            
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hist.stockStatus === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 
                                hist.stockStatus === 'No Stock' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {hist.stockStatus || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-[11px] font-bold text-emerald-600 whitespace-nowrap">{hist.approveQty || '-'}</td>
                            <td className="px-4 py-3 text-center text-[11px] font-bold text-amber-600 whitespace-nowrap">{hist.productionQty || '-'}</td>
                            <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{hist.batchNo || '-'}</td>
                            <td className="px-4 py-3 text-left whitespace-nowrap text-[11px] text-gray-600 max-w-[150px] truncate" title={hist.remarks}>{hist.remarks || '-'}</td>
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

  const renderCard = (item) => (
    <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-bold text-indigo-600 text-sm">{item.orderId}</span>
        <span className="text-[10px] text-gray-500">{formatDate(item.poDate)}</span>
      </div>
      <div className="text-xs text-gray-700 font-medium">{item.partyName}</div>
    </div>
  );

  return (
    <DataTable
      headers={tableHeaders}
      data={paginatedData}
      renderRow={renderRow}
      renderCard={renderCard}
      minWidth="1700px"
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={itemsPerPage}
      onPageChange={setCurrentPage}
      onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
      totalResults={filteredData.length}
    />
  );
}
