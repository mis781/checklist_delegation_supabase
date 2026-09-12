import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/DataTable';
import { ChevronDown, ChevronUp, Eye, Info, CheckCircle } from 'lucide-react';
import InfoPopover from '../../components/InfoPopover';
import { getDeliveryHistory } from '../../utils/storageManager';
import { formatDate } from '../../utils/helpers';
import TatStageBadge from '../../components/TatStageBadge';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';

export default function HistoryProduction({ data, filters }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [tatRules, setTatRules] = useState([]);

  useEffect(() => {
    fetchMasterTatRulesForO2D().then(setTatRules);
  }, []);

  // Filter out the data to only include orders that have items marked as produced
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

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const tableHeaders = [
    { label: "View", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[60px]" },
    { label: "Order ID", className: "sticky left-[60px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number",
    "GST Number", "Responsible Person Name", "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type",
    "GST%", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount", "Remarks", 
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderRow = (item) => {
    const isExpanded = expandedRows.has(item.id);
    const history = getDeliveryHistory() || [];
    // Show only the products that were produced for this order
    const orderHistory = history.filter(h => h.orderId === item.orderId && h.produced);

    return (
      <React.Fragment key={item.id}>
        <tr
          onClick={() => toggleRow(item.id)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
            <button className="text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none flex justify-center w-full">
              {isExpanded ? <ChevronUp size={20} /> : <Eye size={18} />}
            </button>
          </td>

          <td className="px-4 py-3 whitespace-nowrap sticky left-[60px] z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
            <span className="text-xs text-indigo-600 font-bold">{item.orderId}</span>
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
            const tatStatus = getTatStatusForOrder(item, "Production Planning", tatRules, { isCompleted: true });
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
            <td colSpan={18} className="p-0 border-b border-emerald-50 bg-emerald-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[10px] text-emerald-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center">Product Number</th>
                        <th className="px-4 py-3 font-bold">Product Name</th>
                        <th className="px-4 py-3 font-bold text-center">Qty</th>
                        <th className="px-4 py-3 font-bold text-center">UOM</th>
                        <th className="px-4 py-3 font-bold text-right">Price/Rate</th>
                        <th className="px-4 py-3 font-bold text-right">Total Price</th>
                        <th className="px-4 py-3 font-bold text-right">GST %</th>
                        <th className="px-4 py-3 font-bold text-right">GST Value</th>
                        <th className="px-4 py-3 font-bold text-right text-emerald-600">Grand Total</th>
                        <th className="px-4 py-3 font-bold text-center">Status</th>
                        <th className="px-4 py-3 font-bold text-center">Available For Dispatch</th>
                        <th className="px-4 py-3 font-bold text-center">Batch No.</th>
                        <th className="px-4 py-3 font-bold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orderHistory.map((hist, idx) => {
                        const originalProduct = item.items?.find(p => p.productNumber === hist.productNumber || `${item.orderId}-${String(item.items.indexOf(p) + 1).padStart(2, '0')}` === hist.productNumber);
                        const priceRate = parseFloat(hist.priceRate) || parseFloat(originalProduct?.priceRate) || 0;
                        const basic = (parseFloat(hist.qty) || 0) * priceRate;
                        const gstPerc = parseFloat(originalProduct?.gstPercent || item.globalGstPercent || '0');
                        const gstValue = basic * (gstPerc / 100);

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] text-emerald-600 font-bold text-center">{hist.productNumber}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-800 font-medium">{hist.productName}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center bg-gray-50 font-bold">{hist.qty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{hist.uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{priceRate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{basic.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-emerald-600 text-right font-bold">₹{(basic + gstValue).toFixed(2)}</td>
                            
                            <td className="px-4 py-3 text-[11px] text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle size={10} /> Produced
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center font-bold">{hist.approveQty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center">{hist.batchNo || '-'}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-600 max-w-[150px] truncate" title={hist.remarks}>{hist.remarks || '-'}</td>
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
        <span className="font-bold text-emerald-600 text-sm">{item.orderId}</span>
        <span className="text-[10px] text-gray-500">{formatDate(item.poDate)}</span>
      </div>
      <div className="text-xs text-gray-700 font-medium">{item.partyName}</div>
      <button
        onClick={() => toggleRow(item.id)}
        className="mt-2 bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded text-xs font-bold transition-colors w-full flex items-center justify-center gap-1"
      >
        <Eye size={14} /> View Details
      </button>
    </div>
  );

  return (
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
  );
}
