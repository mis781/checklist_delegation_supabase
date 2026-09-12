import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/DataTable';
import { ChevronDown, ChevronUp, Eye, Info, ClipboardList, CheckSquare } from 'lucide-react';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import InfoPopover from '../../components/InfoPopover';
import CheckForm from './CheckForm';
import TatStageBadge from '../../components/TatStageBadge';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';

export default function CheckHistory({ data, filters, refresh }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCheckForm, setShowCheckForm] = useState(false);
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
          item.partyName?.toLowerCase().includes(q) ||
          (item.gstNumber && item.gstNumber.toLowerCase().includes(q))
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

  const handleImageView = (base64, e) => {
    e.stopPropagation();
    setSelectedImage(base64);
    setShowImageModal(true);
  };

  const handleViewChecklist = (item, e) => {
    e.stopPropagation();
    setSelectedOrder(item);
    setShowCheckForm(true);
  };

  const tableHeaders = [
    { label: "View Checklist", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    { label: "Order ID", className: "sticky left-[120px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number",
    "GST Number", "Responsible Person Name", "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type",
    "GST%", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount", "Remarks", 
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderRow = (item) => {
    const isExpanded = expandedRows.has(item.id);
    return (
      <React.Fragment key={item.id}>
        <tr
          onClick={() => toggleRow(item.id)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          {/* Action Column */}
          <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleViewChecklist(item, e)}
              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 w-full justify-center"
            >
              <ClipboardList size={14} /> View
            </button>
          </td>

          {/* Order ID Column */}
          <td className="px-4 py-3 whitespace-nowrap sticky left-[120px] z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
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
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.partyNumber || item.partyPhone || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.gstNumber || item.partyGst || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.responsiblePerson || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{formatDate(item.expectedDeliveryDate)}</td>
          {(() => {
            const tatStatus = getTatStatusForOrder(item, "Check & Validation", tatRules, { isCompleted: true });
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
            <span className="bg-indigo-50 font-bold rounded-lg px-2 py-1">{item.checkedProductNumbers?.length || 0}</span>
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-emerald-600 font-bold whitespace-nowrap">₹{(Number(item.totalPOValue ?? item.totalPoValue) || 0).toFixed(2)}</td>
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
              <InfoPopover items={[item.validationChecklist.remarks]} title="Validation Remarks">
                <span className="text-[11px] text-indigo-600 flex items-center gap-1 cursor-help hover:text-indigo-800 font-bold">
                  <Info size={12} /> View
                </span>
              </InfoPopover>
            ) : <span className="text-gray-300">-</span>}
          </td>
          <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
            {item.poImage ? (
              <button onClick={(e) => handleImageView(item.poImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <Eye size={16} />
              </button>
            ) : <span className="text-gray-300">-</span>}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan={17} className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
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
                      {item.items?.map((prod, idx) => ({
                        ...prod,
                        productNumber: `${item.orderId}-${String(idx + 1).padStart(2, '0')}`,
                        originalIndex: idx
                      }))
                      .filter(prod => item.checkedProductNumbers?.includes(prod.productNumber))
                      .map((prod) => {
                        const basic = (parseFloat(prod.qty) || 0) * (parseFloat(prod.priceRate) || 0);
                        const gstPerc = parseFloat(prod.gstPercent || item.globalGstPercent || '0');
                        const gstValue = basic * (gstPerc / 100);
                        return (
                          <tr key={prod.originalIndex} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] text-indigo-600 font-bold text-center">
                              <CheckSquare size={12} className="inline mr-1 text-emerald-500" />
                              {prod.productNumber}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-800 font-medium">{prod.productName}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center">{prod.qty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{prod.uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{basic.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-indigo-600 text-right font-bold">₹{parseFloat(prod.totalValue || 0).toFixed(2)}</td>
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
      <button
        onClick={(e) => handleViewChecklist(item, e)}
        className="mt-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded text-xs font-bold transition-colors w-full flex items-center justify-center gap-1"
      >
        <ClipboardList size={14} /> View Checklist
      </button>
    </div>
  );

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

      {showCheckForm && selectedOrder && (
        <CheckForm 
          order={selectedOrder}
          onClose={() => {
            setShowCheckForm(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowCheckForm(false);
            setSelectedOrder(null);
            refresh();
          }}
          isReadOnly={true}
        />
      )}
      
      {/* Basic image modal identical to PO page */}
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
