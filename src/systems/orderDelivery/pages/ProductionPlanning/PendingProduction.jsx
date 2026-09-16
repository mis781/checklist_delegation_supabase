import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/DataTable';
import { ChevronDown, ChevronUp, CheckSquare, Eye, Info } from 'lucide-react';
import InfoPopover from '../../components/InfoPopover';
import FormProduction from './FormProduction';
import { getDeliveryHistory } from '../../utils/storageManager';
import { formatDate, isPdfDataUrl, formatOrderGstPercent } from '../../utils/helpers';
import TatStageBadge from '../../components/TatStageBadge';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';

export default function PendingProduction({ data, filters, refresh }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tatRules, setTatRules] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

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

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[80px]" },
    { label: "Order ID", className: "sticky left-[80px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number",
    "GST Number", "Responsible Person Name", "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type",
    "GST%", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount", "Remarks", 
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderRow = (item) => {
    const isExpanded = expandedRows.has(item.id);
    const history = getDeliveryHistory() || [];
    const orderHistory = history.filter(h => h.orderId === item.orderId && h.stockStatus === 'No Stock' && !h.produced);

    return (
      <React.Fragment key={item.id}>
        <tr
          onClick={() => toggleRow(item.id)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleAction(item, e)}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 w-full justify-center"
            >
              <CheckSquare size={14} /> Action
            </button>
          </td>

          <td className="px-4 py-3 whitespace-nowrap sticky left-[80px] z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
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
            const tatStatus = getTatStatusForOrder(item, "Production Planning", tatRules, { isCompleted: false });
            return (
              <>
                <td className="px-4 py-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap">
                  {tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <TatStageBadge tatStatus={tatStatus} isCompleted={false} />
                </td>
              </>
            );
          })()}
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.transportingType || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{formatOrderGstPercent(item)}</td>
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
            {(() => {
              const remarksList = [
                item.validationChecklist?.remarks,
                item.validationRemarks,
                item.remarks,
                item.productionRemarks
              ].filter(Boolean);
              const allRemarks = Array.from(new Set(remarksList));
              if (allRemarks.length === 0) return <span className="text-gray-300">-</span>;
              return (
                <InfoPopover items={allRemarks} title="Remarks">
                  <span className="text-[11px] text-indigo-600 flex items-center gap-1 cursor-help hover:text-indigo-800 font-bold">
                    <Info size={12} /> View
                  </span>
                </InfoPopover>
              );
            })()}
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
            <td colSpan={18} className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100 text-[10px] text-indigo-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center">Product Number</th>
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
                    <tbody className="divide-y divide-gray-50">
                      {orderHistory.map((hist, idx) => {
                      const originalProduct = item.items?.find(p => 
                        p.productNumber === hist.productNumber ||
                        `${item.orderId}-${String(item.items.indexOf(p) + 1).padStart(2, '0')}` === hist.productNumber ||
                        p.productName === hist.productName
                      );
                      // `qty` on the record is always the order line's full original qty —
                      // only `productionQty` (falling back to `qty` for older records) is the
                      // actual amount pending production, so that's what belongs here.
                      const displayQty = hist.productionQty ?? hist.qty;
                      const priceRate = parseFloat(hist.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      const basic = (parseFloat(displayQty) || 0) * priceRate;
                      const gstPerc = parseFloat(hist._isCustom ? (hist.gstPercent || '0') : (originalProduct?.gstPercent || item.globalGstPercent || '0'));
                      const gstValue = basic * (gstPerc / 100);

                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-[11px] text-indigo-600 font-bold text-center">{hist.productNumber}</td>
                          <td className="px-4 py-3 text-[11px] text-gray-800 font-medium">{hist.productName}</td>
                          <td className="px-4 py-3 text-[11px] text-gray-700 text-center bg-gray-50 font-bold">{displayQty}</td>
                          <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{hist.uom}</span></td>
                          <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{priceRate.toFixed(2)}</td>
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

  const handleImageView = (base64, e) => {
    e?.stopPropagation();
    setSelectedImage(base64);
    setShowImageModal(true);
  };

  const renderCard = (item) => {
    const isExpanded = expandedRows.has(item.id);
    const tatStatus = getTatStatusForOrder(item, "Production Planning", tatRules, { isCompleted: false });
    const history = getDeliveryHistory() || [];
    const orderHistory = history.filter(h => h.orderId === item.orderId && h.stockStatus === 'No Stock' && !h.produced);

    return (
      <div key={item.id} className="bg-white rounded-xl border border-indigo-100 shadow-sm p-3.5 space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md text-xs tracking-wide">
              {item.orderId}
            </span>
            {item.division && (
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {item.division}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md">
            ₹{(Number(item.totalPOValue ?? item.totalPoValue) || 0).toFixed(2)}
          </span>
        </div>

        {/* Party Info */}
        <div className="border-b border-gray-100 pb-2">
          <h4 className="text-sm font-bold text-gray-900 leading-snug">{item.partyName}</h4>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
            {(item.partyNumber || item.partyPhone) && (
              <span>📞 {item.partyNumber || item.partyPhone}</span>
            )}
            {(item.gstNumber || item.partyGst) && (
              <span>GST: <span className="font-mono">{item.gstNumber || item.partyGst}</span></span>
            )}
          </div>
        </div>

        {/* 2-Column Key Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">PO Number</span>
            <span className="font-medium text-gray-800">{item.poNumber || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">PO Date</span>
            <span className="font-medium text-gray-800">{formatDate(item.poDate)}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Exp. Delivery</span>
            <span className="font-medium text-indigo-600">{formatDate(item.expectedDeliveryDate)}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Responsible</span>
            <span className="font-medium text-gray-800 truncate block">{item.responsiblePerson || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Transport Type</span>
            <span className="font-medium text-gray-700">{item.transportingType || item.transportType || '-'}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">Advance</span>
            <span className={`font-semibold ${item.advancePayment === 'Yes' ? 'text-emerald-600' : 'text-gray-500'}`}>
              {item.advancePayment === 'Yes' ? `Yes (₹${item.advanceAmount || 0})` : 'No'}
            </span>
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
        {item.validationChecklist?.remarks && (
          <div className="text-[11px] bg-amber-50/70 border border-amber-200/60 p-2 rounded-md text-amber-900">
            <span className="font-bold text-[10px] uppercase block text-amber-700">Remarks:</span>
            {item.validationChecklist.remarks}
          </div>
        )}

        {/* Expandable Product List Accordion */}
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => toggleRow(item.id)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 py-1 hover:text-indigo-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {orderHistory.length || item.items?.length || 0}
              </span>
              Production Items
            </span>
            <span className="text-[11px] text-indigo-600 flex items-center gap-1">
              {isExpanded ? <>Hide <ChevronUp size={14} /></> : <>View Products <ChevronDown size={14} /></>}
            </span>
          </button>

          {isExpanded && (
            <div className="space-y-2 mt-2 pt-2 border-t border-dashed border-gray-200">
              {(orderHistory.length > 0 ? orderHistory : item.items || []).map((prod, idx) => {
                const productNumber = prod.productNumber || `${item.orderId}-${String(idx + 1).padStart(2, '0')}`;
                const qty = prod.productionQty || prod.qty || '-';
                return (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 text-[11px] space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-gray-900">{prod.productName}</span>
                      <span className="font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                        {productNumber}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-gray-600 text-[10px] pt-1">
                      <div>
                        <span className="text-gray-400 block">Production Qty</span>
                        <span className="font-semibold text-amber-700">{qty} {prod.uom}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 block">Rate / Price</span>
                        <span className="font-semibold text-gray-800">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card Actions & Media Viewers */}
        <div className="flex items-center gap-2 pt-1">
          {item.poImage && (
            <button
              onClick={(e) => handleImageView(item.poImage, e)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye size={14} className="text-indigo-600" /> View PO
            </button>
          )}
          <button
            onClick={(e) => handleAction(item, e)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200"
          >
            <CheckSquare size={14} /> Action
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <DataTable
        tableKey="o2d_prod_pending"
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

      {showForm && selectedOrder && (
        <FormProduction 
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

      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-2 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="overflow-auto max-h-[85vh] rounded-xl">
              {isPdfDataUrl(selectedImage) ? (
                <iframe src={selectedImage} title="PDF Preview" className="w-full h-[80vh] rounded-xl bg-white" />
              ) : (
                <img src={selectedImage} alt="Attachment" className="w-full h-auto" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
