import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, FileImage, Eye } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { getLogisticHistory } from '../../utils/storageManager';
import { isPdfDataUrl, formatDate, formatDateTime } from '../../utils/helpers';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';
import TatStageBadge from '../../components/TatStageBadge';

const TWO_LEG_TRANSPORT_TYPE = 'Ex Factory Transpoter Office';

export default function Historylogistic({ data, filters }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewImage, setViewImage] = useState(null);
  const [viewLogistic, setViewLogistic] = useState(null);
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

  const handleViewLogistic = (order, latest, e) => {
    e.stopPropagation();
    setViewLogistic({ order, latest });
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Order ID", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[110px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number", "GST Number", "Responsible Person Name",
    "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount",
    "Transport Name", "Vehicle Plate Number", "Driver Full Name", "Driver Mobile Contact", "Bilty Status", "Bilty Number",
    "Transporter Amount", "Logistic Details",
    { label: "Bilty Copy", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
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
    const tatStatus = getTatStatusForOrder(order, "Vehicle Logistic", tatRules, { isCompleted: true });

    // Get all packaged items for this order that have logistic completed
    const allLogistic = getLogisticHistory() || [];
    const orderLogisticItems = allLogistic.filter(lh => lh.orderId === order.orderId);

    if (orderLogisticItems.length === 0) return null;

    const totalProductCount = orderLogisticItems.length;

    // Logistic details are consistent for this order's logistic entry (take the latest one)
    const latest = orderLogisticItems[orderLogisticItems.length - 1] || {};
    const transportAgency = latest.transportAgency || '-';
    const vehicleNo = latest.vehicleNo || '-';
    const driverName = latest.driverName || '-';
    const driverMobile = latest.driverMobile || '-';
    const lrNumber = latest.lrNumber || '-';
    const transporterAmount = latest.transporterAmount;
    const biltyStatus = latest.biltyStatus || '-';
    const lrCopy = latest.lrCopy;

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

          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap">{transportAgency}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{vehicleNo}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{driverName}</td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{driverMobile}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap">{biltyStatus}</td>
          <td className="px-3 py-3 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap">{biltyStatus === 'Yes' ? lrNumber : '-'}</td>
          <td className="px-3 py-3 text-center text-[11px] font-medium text-emerald-600 whitespace-nowrap">{biltyStatus === 'Yes' && transporterAmount ? `₹${transporterAmount}` : '-'}</td>

          <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => handleViewLogistic(order, latest, e)} className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 mx-auto text-[11px] font-bold">
              <Eye size={14} /> View
            </button>
          </td>

          <td className="px-3 py-3 text-center whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
            {biltyStatus === 'Yes' && lrCopy ? (
              <button onClick={(e) => handleImageView(lrCopy, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <FileImage size={16} />
              </button>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan="26" className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1100px]">
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orderLogisticItems.map((item, idx) => {
                        const originalProduct = order.items?.find(p => p.productNumber === item.productNumber || `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber);
                        const uom = item.uom || originalProduct?.uom || 'NOS';
                        const dispatchQty = parseFloat(item.dispatchQty) || 0;
                        const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || 0;
                        const gstPerc = parseFloat(originalProduct?.gstPercent || order.globalGstPercent || '0');
                        const totalValue = rate * dispatchQty;
                        const gstValue = totalValue * (gstPerc / 100);
                        const grandTotal = totalValue + gstValue;
                        const dispatchDate = item.dispatchDate || (item.dispatchTimestamp ? item.dispatchTimestamp.split('T')[0] : (item.timestamp ? item.timestamp.split('T')[0] : '')) || '-';

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] font-bold text-indigo-600 text-center">{item.dispatchId || '-'}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-indigo-600 text-center">{item.productNumber}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-800">{item.productName}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center">{formatDate(dispatchDate)}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-emerald-600 text-center">{dispatchQty}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-700 text-right">₹{totalValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-700 text-right">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-indigo-600 text-right">₹{grandTotal.toFixed(2)}</td>
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
        minWidth="2400px"
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

      {/* Logistic Details Modal — full form input, both legs for a two-leg order */}
      {viewLogistic && (() => {
        const { order, latest } = viewLogistic;
        const cleanType = (order.transportingType || '').toLowerCase().replace(/[^a-z]/g, '');
        const isTwoLeg = cleanType.includes('transpoter') || cleanType.includes('transporter') || cleanType.includes('office');
        return (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setViewLogistic(null)}>
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Logistic Details</h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Order: {order.orderId}</p>
                </div>
                <button onClick={() => setViewLogistic(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">
                    {isTwoLeg ? 'Logistic Detail 1' : 'Logistic Details'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium">Transport Name</p>
                      <p className="text-sm font-bold text-gray-900">{latest.transportAgency || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium">Vehicle Plate Number</p>
                      <p className="text-sm font-bold text-gray-900">{latest.vehicleNo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium">Driver Full Name</p>
                      <p className="text-sm font-bold text-gray-900">{latest.driverName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium">Driver Mobile Contact</p>
                      <p className="text-sm font-bold text-gray-900">{latest.driverMobile || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium">Bilty Status</p>
                      <p className="text-sm font-bold text-gray-900">{latest.biltyStatus || '-'}</p>
                    </div>
                    {latest.biltyStatus === 'Yes' && (
                      <>
                        <div>
                          <p className="text-[10px] text-gray-500 font-medium">Bilty Number</p>
                          <p className="text-sm font-bold text-gray-900">{latest.lrNumber || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-medium">Transporter Amount</p>
                          <p className="text-sm font-bold text-emerald-600">{latest.transporterAmount ? `₹${latest.transporterAmount}` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-medium">Bilty Copy</p>
                          {latest.lrCopy ? (
                            <button onClick={(e) => handleImageView(latest.lrCopy, e)} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1">
                              <FileImage size={14} /> View
                            </button>
                          ) : (
                            <p className="text-sm text-gray-400">-</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isTwoLeg && (
                  <div>
                    <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Logistic Detail 2</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">Transport Name</p>
                        <p className="text-sm font-bold text-gray-900">{latest.transportAgency2 || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">Vehicle Plate Number</p>
                        <p className="text-sm font-bold text-gray-900">{latest.vehicleNo2 || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">Driver Full Name</p>
                        <p className="text-sm font-bold text-gray-900">{latest.driverName2 || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">Driver Mobile Contact</p>
                        <p className="text-sm font-bold text-gray-900">{latest.driverMobile2 || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {latest.logisticRemarks && (
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Remarks</p>
                    <p className="text-sm text-gray-700 bg-slate-50 p-3 rounded-lg border border-gray-100">{latest.logisticRemarks}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end">
                <button
                  onClick={() => setViewLogistic(null)}
                  className="px-6 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
