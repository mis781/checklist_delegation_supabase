import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, FileImage } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { getConfirmDeliveryHistory, getLogisticHistory } from '../../utils/storageManager';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';
import TatStageBadge from '../../components/TatStageBadge';

export default function HistoryDelivery({ data, filters }) {
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
    if (imgUrl) setViewImage(imgUrl);
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Order ID", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[110px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number", "GST Number", "Responsible Person Name",
    "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount",
    "Transporter Name", "Vehicle Number", "Driver Name", "Driver Number",
    "Invoice Number", "Invoice Date", "Invoice Amount", "Status", "Remarks", "Invoice Copy",
    { label: "Delivery Attachment", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[100px]" }
  ];

  const renderCard = (order) => (
    <div key={order.orderId} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-bold text-indigo-600 text-sm">{order.orderId}</span>
        <span className="text-[10px] text-gray-500">{formatDate(order.poDate)}</span>
      </div>
      <div className="text-xs text-gray-700 font-medium">{order.partyName}</div>
    </div>
  );

  const renderRow = (order) => {
    const isExpanded = expandedRows.has(order.orderId);
    const tatStatus = getTatStatusForOrder(order, "Confirm Delivery", tatRules, { isCompleted: true });

    // Get all confirm delivery items for this order that have status 'Delivered'
    const allConfirm = getConfirmDeliveryHistory() || [];
    const orderConfirmItems = allConfirm.filter(ch => ch.orderId === order.orderId && ch.deliveryStatus === 'Delivered');

    if (orderConfirmItems.length === 0) return null;

    const totalProductCount = orderConfirmItems.length;

    // Information from the Confirm record (which carries over Invoice info)
    const invoiceNo = orderConfirmItems[0]?.invoiceNumber || '-';
    const invoiceDate = orderConfirmItems[0]?.invoiceDate || '-';
    const invoiceAmount = orderConfirmItems[0]?.invoiceAmount || '0';
    const status = orderConfirmItems[0]?.deliveryStatus || '-';
    const remarks = orderConfirmItems[0]?.deliveryRemarks || '-';
    const invoiceImage = orderConfirmItems[0]?.invoiceImage;
    const deliveryImage = orderConfirmItems[0]?.deliveryImage;

    const allLogistic = getLogisticHistory() || [];
    // Get the logistic record for this order (we can use the first confirm item's dispatch ID if available, or just the orderId)
    const logisticRecord = allLogistic.find(lh =>
      orderConfirmItems.some(ci => ci.dispatchId === lh.dispatchId)
    ) || allLogistic.find(lh => lh.orderId === order.orderId) || {};

    return (
      <React.Fragment key={order.orderId}>
        <tr
          onClick={() => toggleRow(order.orderId)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-3 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
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
            <TatStageBadge tatStatus={tatStatus} isCompleted={true} />
          </td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.transportingType || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap bg-gray-50/50">{totalProductCount}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-green-600 whitespace-nowrap">₹{order.totalPOValue || '0'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{order.advancePayment || 'No'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-green-600 whitespace-nowrap">₹{order.advanceAmount || '0'}</td>

          <td className="px-3 py-3 text-center text-[11px] text-gray-800 whitespace-nowrap">{logisticRecord.transportAgency || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-800 whitespace-nowrap">{logisticRecord.vehicleNo || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-800 whitespace-nowrap">{logisticRecord.driverName || '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-800 whitespace-nowrap">{logisticRecord.driverMobile || '-'}</td>

          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap">{invoiceNo}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-gray-800 whitespace-nowrap">{formatDate(invoiceDate)}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-green-600 whitespace-nowrap">₹{invoiceAmount}</td>

          <td className="px-3 py-3 text-center whitespace-nowrap">
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold">
              {status}
            </span>
          </td>

          <td className="px-3 py-3 text-center text-[11px] text-gray-600 max-w-[200px] truncate" title={remarks}>{remarks}</td>

          <td className="px-3 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
            {invoiceImage ? (
              <button onClick={(e) => handleImageView(invoiceImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <FileImage size={16} />
              </button>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>

          <td className="px-3 py-3 whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50 text-center" onClick={(e) => e.stopPropagation()}>
            {deliveryImage ? (
              <button onClick={(e) => handleImageView(deliveryImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <FileImage size={16} />
              </button>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan="28" className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="overflow-x-auto p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden min-w-[900px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100 text-[10px] text-indigo-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center">DispatchID</th>
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
                        <th className="px-4 py-3 font-bold text-center text-red-500">Shortage</th>
                        <th className="px-4 py-3 font-bold text-center text-red-500">Shortage Qty</th>
                        <th className="px-4 py-3 font-bold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orderConfirmItems.map((item, idx) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === item.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
                        p.productName === item.productName
                      );
                      const qty = item.totalQty || item.approveQty || item.qty || 0;
                      const dispatchQty = parseFloat(item.dispatchQty) || 0;
                      const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                      const gstPerc = parseFloat(item._isCustom ? (item.gstPercent || '0') : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'));
                      const totalValue = rate * dispatchQty;
                      const gstValue = totalValue * (gstPerc / 100);
                      const grandTotal = totalValue + gstValue;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] font-bold text-indigo-600 text-center">{item.dispatchId || '-'}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-indigo-600 text-center">{item.productNumber}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-800">{item.productName}</td>
                            {/* <td className="px-4 py-3 text-[11px] font-bold text-gray-700 text-center bg-gray-50/50">{qty}</td> */}
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center">{item.uom}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-700 text-right">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center">{formatDate(item.dispatchDate || item.dispatchTimestamp || item.timestamp)}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-emerald-600 text-center">{dispatchQty}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-700 text-right">₹{totalValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-700 text-right">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-indigo-600 text-right">₹{grandTotal.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${item.shortage === 'Yes' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {item.shortage || 'No'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] font-bold text-red-500 text-center">
                              {item.shortage === 'Yes' && item.shortageQty ? item.shortageQty : '-'}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-600 max-w-[200px] truncate" title={item.productRemarks}>
                              {item.productRemarks || '-'}
                            </td>
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
        minWidth="1800px"
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
          <div className="bg-white rounded-xl p-2 max-w-4xl max-h-[90vh] overflow-auto relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg p-2 transition-colors">
              <X size={20} />
            </button>
            {isPdfDataUrl(viewImage) ? (
              <iframe src={viewImage} title="PDF Preview" className="w-full h-[80vh] rounded-lg bg-white" />
            ) : (
              <img src={viewImage} alt="Document" className="block w-full h-auto rounded-lg object-contain max-h-[85vh]" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
