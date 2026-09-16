import { useState, useMemo, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronUp, FilePenLine, X, FileImage } from 'lucide-react';
import DataTable from '../../components/DataTable';
import FormDelivery from './FormDelivery';
import { getInvoiceHistory, getConfirmDeliveryHistory, getLogisticHistory } from '../../utils/storageManager';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';
import TatStageBadge from '../../components/TatStageBadge';

export default function PendingDelivery({ data, filters, onSuccess }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
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

  const handleAction = (order, e) => {
    e.stopPropagation();
    setSelectedOrder(order);
  };

  const handleImageView = (imgUrl, e) => {
    e.stopPropagation();
    if (imgUrl) setViewImage(imgUrl);
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[100px] text-center" },
    { label: "Order ID", className: "sticky left-[100px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[110px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number", "GST Number", "Responsible Person Name",
    "Expected Delivery Date", "Planned Date", "Delay", "Transporting Type", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount",
    "Transporter Name", "Vehicle Number", "Driver Name", "Driver Number",
    "Invoice Number", "Invoice Date", "Invoice Amount", "In-Transit Exp. Date", "Remarks",
    { label: "Invoice Copy", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[100px]" }
  ];

  const renderCard = (order) => {
    const isExpanded = expandedRows.has(order.orderId);
    const tatStatus = getTatStatusForOrder(order, "Confirm Delivery", tatRules, { isCompleted: false });

    const allInvoice = getInvoiceHistory() || [];
    const allConfirm = getConfirmDeliveryHistory() || [];

    const orderInvoices = allInvoice.filter(ih => ih.orderId === order.orderId);
    const pendingItems = orderInvoices.filter(invoiceItem => {
      const confirmRecord = allConfirm.find(ch => ch.dispatchId === invoiceItem.dispatchId);
      return !confirmRecord || confirmRecord.deliveryStatus !== 'Delivered';
    });

    if (pendingItems.length === 0) return null;

    const totalProductCount = pendingItems.length;
    const invoiceNo = orderInvoices.length > 0 ? (orderInvoices[0]?.invoiceNumber || '-') : '-';
    const invoiceDate = orderInvoices.length > 0 ? (orderInvoices[0]?.invoiceDate || '-') : '-';
    const invoiceAmount = orderInvoices.length > 0 ? (orderInvoices[0]?.invoiceAmount || '0') : '0';
    const latestConfirm = allConfirm.find(ch => ch.dispatchId === pendingItems[0]?.dispatchId);
    const remarks = latestConfirm?.deliveryRemarks || orderInvoices[0]?.invoiceRemarks || '-';
    const invoiceImage = orderInvoices.length > 0 ? orderInvoices[0]?.invoiceImage : null;

    const allLogistic = getLogisticHistory() || [];
    const logisticRecord = allLogistic.find(lh =>
      pendingItems.some(pi => pi.dispatchId === lh.dispatchId)
    ) || allLogistic.find(lh => lh.orderId === order.orderId) || {};

    return (
      <div key={order.orderId} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
        {/* Header Badges */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
          <div>
            <span className="font-bold text-indigo-600 text-sm">{order.orderId}</span>
            {order.division && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">
                {order.division}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-green-600">₹{invoiceAmount}</span>
            <div className="text-[10px] text-gray-400">Inv Val</div>
          </div>
        </div>

        {/* Party Details */}
        <div className="bg-slate-50/70 rounded-lg p-2.5">
          <div className="text-xs font-bold text-gray-800">{order.partyName}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
            {order.partyNumber && (
              <span>📞 <a href={`tel:${order.partyNumber}`} className="text-indigo-600 hover:underline">{order.partyNumber}</a></span>
            )}
            {order.gstNumber && <span>GST: <span className="font-mono text-gray-700">{order.gstNumber}</span></span>}
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-gray-400 block text-[10px]">PO Number</span>
            <span className="font-medium text-gray-700">{order.poNumber || '-'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">PO Date</span>
            <span className="font-medium text-gray-700">{formatDate(order.poDate)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Invoice No</span>
            <span className="font-bold text-indigo-700">{invoiceNo}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Invoice Date</span>
            <span className="font-medium text-gray-800">{formatDate(invoiceDate)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Transporter</span>
            <span className="font-semibold text-gray-800">{logisticRecord.transportAgency || '-'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Vehicle No</span>
            <span className="font-semibold text-gray-800">{logisticRecord.vehicleNo || '-'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Driver</span>
            <span className="font-medium text-gray-700">{logisticRecord.driverName || '-'} {logisticRecord.driverMobile ? `(${logisticRecord.driverMobile})` : ''}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Exp. Delivery</span>
            <span className="font-medium text-indigo-600">
              {formatDate(latestConfirm?.inTransitExpectedDeliveryDate || latestConfirm?.expectedDeliveryDate || order.expectedDeliveryDate)}
            </span>
          </div>
          {latestConfirm?.deliveryStatus === 'In Transit' && (latestConfirm?.inTransitExpectedDeliveryDate || latestConfirm?.expectedDeliveryDate) && (
            <div>
              <span className="text-gray-400 block text-[10px]">In-Transit Exp. Date</span>
              <span className="font-bold text-amber-600">{formatDate(latestConfirm.inTransitExpectedDeliveryDate || latestConfirm.expectedDeliveryDate)}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400 block text-[10px]">Planned Due Date</span>
            <span className="font-medium text-slate-700">{tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">TAT SLA</span>
            <TatStageBadge tatStatus={tatStatus} isCompleted={false} />
          </div>
        </div>

        {remarks && remarks !== '-' && (
          <div className="text-[11px] bg-amber-50/60 border border-amber-100 rounded-lg p-2 text-amber-900">
            {latestConfirm && latestConfirm.deliveryStatus === 'In Transit' && (
              <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[10px] mr-1">In Transit</span>
            )}
            <span className="font-semibold">Remarks:</span> {remarks}
          </div>
        )}

        {/* Expandable Line Items Accordion */}
        <div className="border-t border-gray-100 pt-2">
          <button
            onClick={() => toggleRow(order.orderId)}
            className="flex items-center justify-between w-full text-xs font-bold text-gray-700 hover:text-indigo-600 py-1"
          >
            <span>Items to Deliver ({totalProductCount})</span>
            <span className="flex items-center gap-1 text-[11px] text-indigo-600">
              {isExpanded ? 'Hide' : 'View'} Details
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
              {pendingItems.map((item, idx) => {
                const originalProduct = order.items?.find(p => 
                  p.productNumber === item.productNumber ||
                  `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
                  p.productName === item.productName
                );
                const dispatchQty = parseFloat(item.dispatchQty) || 0;
                const rate = parseFloat(item.priceRate) || parseFloat(originalProduct?.priceRate) || parseFloat(originalProduct?.price_rate) || 0;
                const gstPerc = parseFloat(item._isCustom ? (item.gstPercent || '0') : (originalProduct?.gstPercent || item.gstPercent || order.globalGstPercent || '0'));
                const totalValue = rate * dispatchQty;
                const gstValue = totalValue * (gstPerc / 100);
                const grandTotal = totalValue + gstValue;

                return (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                    <div className="flex justify-between items-start font-bold">
                      <span className="text-gray-800">{item.productName}</span>
                      <span className="text-indigo-600 font-mono text-[10px]">{item.dispatchId || item.productNumber}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1.5 text-[11px] text-gray-600">
                      <div>Dispatch Qty: <span className="font-bold text-emerald-600">{dispatchQty} {item.uom}</span></div>
                      <div>Rate: <span className="font-semibold text-gray-700">₹{rate.toFixed(2)}</span> ({gstPerc}% GST)</div>
                      <div>Base Val: <span className="font-semibold text-gray-700">₹{totalValue.toFixed(2)}</span></div>
                      <div>Grand Total: <span className="font-bold text-indigo-600">₹{grandTotal.toFixed(2)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action and Attachments Bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {order.poCopy && (
            <button
              onClick={(e) => handleImageView(order.poCopy, e)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileImage size={14} /> PO Copy
            </button>
          )}
          {invoiceImage && (
            <button
              onClick={(e) => handleImageView(invoiceImage, e)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileImage size={14} /> Invoice Copy
            </button>
          )}
          <button
            onClick={(e) => handleAction(order, e)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <FilePenLine size={14} /> Confirm
          </button>
        </div>
      </div>
    );
  };

  const renderRow = (order) => {
    const isExpanded = expandedRows.has(order.orderId);
    const tatStatus = getTatStatusForOrder(order, "Confirm Delivery", tatRules, { isCompleted: false });

    // Pending items: Present in Invoice but NOT 'Delivered' in Confirm Delivery History
    const allInvoice = getInvoiceHistory() || [];
    const allConfirm = getConfirmDeliveryHistory() || [];

    const orderInvoices = allInvoice.filter(ih => ih.orderId === order.orderId);

    // Matched by dispatchId — each dispatch transaction, including partial ones, is independent
    const pendingItems = orderInvoices.filter(invoiceItem => {
      const confirmRecord = allConfirm.find(ch => ch.dispatchId === invoiceItem.dispatchId);
      // It's pending if it has no confirm record, or if the confirm record is not 'Delivered'
      return !confirmRecord || confirmRecord.deliveryStatus !== 'Delivered';
    });

    if (pendingItems.length === 0) return null;

    const totalProductCount = pendingItems.length;

    // Use values from Invoice History
    const invoiceNo = orderInvoices.length > 0 ? (orderInvoices[0]?.invoiceNumber || '-') : '-';
    const invoiceDate = orderInvoices.length > 0 ? (orderInvoices[0]?.invoiceDate || '-') : '-';
    const invoiceAmount = orderInvoices.length > 0 ? (orderInvoices[0]?.invoiceAmount || '0') : '0';
    // If it has a confirm record with 'In Transit', show its remarks
    const latestConfirm = allConfirm.find(ch => ch.dispatchId === pendingItems[0]?.dispatchId);
    const remarks = latestConfirm?.deliveryRemarks || orderInvoices[0]?.invoiceRemarks || '-';
    const invoiceImage = orderInvoices.length > 0 ? orderInvoices[0]?.invoiceImage : null;

    const allLogistic = getLogisticHistory() || [];
    // Get the logistic record for this order (we can use the first pending item's dispatch ID if available, or just the orderId)
    const logisticRecord = allLogistic.find(lh =>
      pendingItems.some(pi => pi.dispatchId === lh.dispatchId)
    ) || allLogistic.find(lh => lh.orderId === order.orderId) || {};

    return (
      <Fragment key={order.orderId}>
        <tr
          onClick={() => toggleRow(order.orderId)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-3 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50 text-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleAction(order, e)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all w-full"
            >
              <FilePenLine size={14} />
              Action
            </button>
          </td>

          <td className="px-3 py-3 whitespace-nowrap sticky left-[100px] z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
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
          <td className="px-3 py-3 text-center text-[11px] font-medium text-indigo-600 whitespace-nowrap">
            {formatDate(latestConfirm?.inTransitExpectedDeliveryDate || latestConfirm?.expectedDeliveryDate || order.expectedDeliveryDate)}
          </td>
          <td className="px-3 py-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap">
            {tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}
          </td>
          <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <TatStageBadge tatStatus={tatStatus} isCompleted={false} />
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
          <td className="px-3 py-3 text-center text-[11px] font-medium text-indigo-600 whitespace-nowrap">
            {latestConfirm?.deliveryStatus === 'In Transit' && (latestConfirm?.inTransitExpectedDeliveryDate || latestConfirm?.expectedDeliveryDate)
              ? formatDate(latestConfirm.inTransitExpectedDeliveryDate || latestConfirm.expectedDeliveryDate)
              : '-'}
          </td>
          <td className="px-3 py-3 text-center text-[11px] text-gray-600 max-w-[200px] truncate" title={remarks}>
            {latestConfirm && latestConfirm.deliveryStatus === 'In Transit' && <span className="text-yellow-600 font-bold mr-1">[In Transit]</span>}
            {remarks}
          </td>

          <td className="px-3 py-3 whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50 text-center" onClick={(e) => e.stopPropagation()}>
            {invoiceImage ? (
              <button onClick={(e) => handleImageView(invoiceImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <FileImage size={16} />
              </button>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan="27" className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingItems.map((item, idx) => {
                      const originalProduct = order.items?.find(p => 
                        p.productNumber === item.productNumber ||
                        `${order.orderId}-${String(order.items.indexOf(p) + 1).padStart(2, '0')}` === item.productNumber ||
                        p.productName === item.productName
                      );
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
      </Fragment>
    );
  };

  return (
    <>
      <DataTable
        tableKey="o2d_confirm_pending"
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

      {/* Action Modal */}
      {selectedOrder && (
        <FormDelivery
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => {
            setSelectedOrder(null);
            if (onSuccess) onSuccess();
          }}
        />
      )}

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
