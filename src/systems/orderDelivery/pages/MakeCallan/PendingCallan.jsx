import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckSquare, Eye, Upload, X } from 'lucide-react';
import DataTable from '../../components/DataTable';
import FormCallan from './FormCallan';
import { getPackagingHistory, getLogisticHistory, getCallanHistory } from '../../utils/storageManager';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';
import TatStageBadge from '../../components/TatStageBadge';

export default function PendingCallan({ data, filters, onSuccess }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  const handleAction = (item, e) => {
    e.stopPropagation();
    setSelectedOrder(item);
    setShowForm(true);
  };

  const handleImageView = (imgUrl, e) => {
    e.stopPropagation();
    setViewImage(imgUrl);
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[80px]" },
    { label: "Order ID", className: "sticky left-[80px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[110px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number", "GST Number", "Responsible Person Name",
    "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type", "Total Product", "Total PO Value",
    "Advance Payment", "Advance Amount",
    "Transport Agency", "Vehicle Plate Number", "Driver Full Name", "Driver Mobile Contact", "Lorry Receipt",
    { label: "LR Copy Upload *", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[100px]" }
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
    const tatStatus = getTatStatusForOrder(order, "Make Challan", tatRules, { isCompleted: false });

    // Get Logistic details if available
    const logisticHistory = getLogisticHistory() || [];
    const orderLogistic = logisticHistory.find(lh => lh.orderId === order.orderId);

    // Get Pending Callan Items
    const packagingHistory = getPackagingHistory() || [];
    const callanHistory = getCallanHistory() || [];
    const cleanType = (order.transportingType || '').toLowerCase().replace(/[^a-z]/g, '');
    const isFOR = cleanType === 'for';

    const orderPackaged = packagingHistory.filter(ph => ph.orderId === order.orderId && ph.packagingStatus === 'Yes');

    // Items that are either 'FOR' (direct to Challan) or exist in Vehicle Logistic
    const itemsReadyForCallan = orderPackaged.filter(packageItem => {
      const inLogistic = logisticHistory.some(lh => lh.dispatchId === packageItem.dispatchId);
      return inLogistic || isFOR;
    });

    // Filter out items already in Callan
    const pendingItems = itemsReadyForCallan.filter(readyItem => {
      return !callanHistory.some(ch => ch.dispatchId === readyItem.dispatchId);
    });

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
          <td className="px-3 py-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap">
            {tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}
          </td>
          <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <TatStageBadge tatStatus={tatStatus} isCompleted={false} />
          </td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.transportingType || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap bg-indigo-50/50">{order.items?.length || 0}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-emerald-600 whitespace-nowrap">₹{order.totalPOValue?.toFixed(2) || '0'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.advancePayment || 'No'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-emerald-600 whitespace-nowrap">{order.advanceAmount ? `₹${order.advanceAmount}` : '-'}</td>

          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{orderLogistic?.transportAgency || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-gray-700 whitespace-nowrap">{orderLogistic?.vehicleNo || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{orderLogistic?.driverName || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{orderLogistic?.driverMobile || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{orderLogistic?.lrNumber || '-'}</td>

          <td className="px-3 py-3 whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50 text-center" onClick={(e) => e.stopPropagation()}>
            {orderLogistic?.lrCopy ? (
              <button onClick={(e) => handleImageView(orderLogistic.lrCopy, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <Eye size={16} />
              </button>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan="23" className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100 text-[10px] text-indigo-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center">Dispatch ID</th>
                        <th className="px-4 py-3 font-bold text-center">Product Number</th>
                        <th className="px-4 py-3 font-bold">Product Name</th>
                        {/* <th className="px-4 py-3 font-bold text-center">Qty</th> */}
                        <th className="px-4 py-3 font-bold text-center">UOM</th>
                        <th className="px-4 py-3 font-bold text-right">Price/Rate</th>
                        <th className="px-4 py-3 font-bold text-right">GST %</th>
                        <th className="px-4 py-3 font-bold text-center">Dispatch Date</th>
                        <th className="px-4 py-3 font-bold text-center">Dispatch Qty</th>
                        <th className="px-4 py-3 font-bold text-right">Total Value</th>
                        <th className="px-4 py-3 font-bold text-right">GST Value</th>
                        <th className="px-4 py-3 font-bold text-right text-indigo-600">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingItems.map((hist, idx) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === hist.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === hist.productNumber ||
                        p.productName === hist.productName
                      );
                      const qty = parseFloat(hist.qty) || 0;
                      const dispatchQty = parseFloat(hist.dispatchQty) || qty;
                      const rate = parseFloat(hist.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      const gstPerc = parseFloat(hist._isCustom ? (hist.gstPercent || '0') : (originalProduct?.gstPercent || hist.gstPercent || order.globalGstPercent || '0'));

                      // Computations based on Dispatch Qty
                      const totalValue = dispatchQty * rate;
                      const gstValue = totalValue * (gstPerc / 100);
                      const grandTotal = totalValue + gstValue;

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] text-indigo-600 font-bold text-center">{hist.dispatchId || '-'}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 font-bold text-center">{hist.productNumber}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-800 font-medium">{hist.productName}</td>
                            {/* <td className="px-4 py-3 text-[11px] text-gray-500 text-center">{qty}</td> */}
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{hist.uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center font-bold">{formatDate(hist.dispatchDate || hist.dispatchTimestamp || hist.timestamp)}</td>
                            <td className="px-4 py-3 text-[11px] text-emerald-600 text-center font-bold bg-emerald-50/30">{dispatchQty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{totalValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-indigo-600 text-right font-bold">₹{grandTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {pendingItems.length === 0 && (
                        <tr>
                          <td colSpan="12" className="px-4 py-8 text-center text-gray-400 text-sm">
                            No items ready for Challan.
                          </td>
                        </tr>
                      )}
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
        minWidth="2200px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        totalResults={filteredData.length}
      />

      {showForm && selectedOrder && (
        <FormCallan
          order={selectedOrder}
          onClose={() => {
            setShowForm(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedOrder(null);
            onSuccess();
          }}
        />
      )}

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
              <img src={viewImage} alt="Document" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
