import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { CheckCircle, FileImage, X, Eye, CreditCard } from 'lucide-react';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import { getTatStatusForOrder, fetchMasterTatRulesForO2D } from '../../services/o2dTatEngine';
import TatStageBadge from '../../components/TatStageBadge';

export default function HistoryVendor({ data, filters }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [viewImage, setViewImage] = useState(null);
  const [viewPayment, setViewPayment] = useState(null);
  const [tatRules, setTatRules] = useState([]);

  useEffect(() => {
    fetchMasterTatRulesForO2D().then(setTatRules);
  }, []);

  const handleImageView = (imgUrl, e) => {
    e.stopPropagation();
    if (imgUrl) setViewImage(imgUrl);
  };

  const handleViewPayment = (payment, e) => {
    e.stopPropagation();
    setViewPayment(payment);
  };

  // A bulk payment (made via the "Payment" button, multiple orders at once) shares a
  // batchId across its records. A single-order payment has no batchId — it's just
  // itself. Either way this resolves to "every order paid together in that action".
  const groupForView = viewPayment
    ? (viewPayment.batchId ? data.filter(p => p.batchId === viewPayment.batchId) : [viewPayment])
    : [];
  const groupTotalPaid = groupForView.reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);

  const filteredData = data.filter(item => {
    if (filters.division && item.division !== filters.division) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return (
        item.orderId?.toLowerCase().includes(q) ||
        item.poNumber?.toLowerCase().includes(q) ||
        item.partyName?.toLowerCase().includes(q) ||
        item.referenceNo?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "View", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[70px]" },
    { label: "Payment ID", className: "sticky left-[70px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Order ID", "Division", "PO Number", "Party Name", "Date of Delivery", "Planned Date", "Delay", "Invoice Value", "Payment Date", "Amount Paid", "Payment Mode", "Ref / UTR No", "Remarks", "Status", "Invoice Number", "Invoice Date", "PO Copy", "Invoice Copy",
    { label: "Receipt", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderCard = (payment) => (
    <div key={payment.id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-indigo-600 text-sm">{payment.orderId}</span>
        <span className="text-xs text-gray-500">{formatDate(payment.paymentDate)}</span>
      </div>
      <div className="text-sm text-gray-700 font-medium mb-3">{payment.partyName}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Paid</span>
          <span className="text-xs font-bold text-emerald-600">₹{payment.amountPaid}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Mode</span>
          <span className="text-xs font-bold text-gray-700">{payment.paymentMode}</span>
        </div>
      </div>
    </div>
  );

  const renderRow = (payment) => {
    const tatStatus = getTatStatusForOrder(payment, "Payments", tatRules, { isCompleted: true });
    return (
      <tr key={payment.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
        <td className="px-3 py-3 text-center whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => handleViewPayment(payment, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none" title="View payment details">
            <CreditCard size={16} />
          </button>
        </td>
        <td className="px-4 py-3 whitespace-nowrap sticky left-[70px] z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white">
          <span className="text-[11px] font-bold text-gray-500">{payment.id?.substring(0, 12)}</span>
        </td>
        <td className="px-4 py-3 text-xs text-center font-bold text-indigo-600 whitespace-nowrap">{payment.orderId}</td>
        <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{payment.division}</td>
        <td className="px-4 py-3 text-xs text-center text-gray-700 font-medium whitespace-nowrap">{payment.poNumber}</td>
        <td className="px-4 py-3 text-xs text-center text-gray-800 font-medium whitespace-nowrap">{payment.partyName}</td>
        <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{formatDate(payment.expectedDeliveryDate)}</td>
        <td className="px-4 py-3 text-center text-[11px] font-mono text-slate-600 whitespace-nowrap">
          {tatStatus.dueAt ? formatDate(tatStatus.dueAt) : "—"}
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <TatStageBadge tatStatus={tatStatus} isCompleted={true} />
        </td>
        <td className="px-4 py-3 text-xs text-center font-bold text-gray-700 whitespace-nowrap">{payment.invoiceAmount ? `₹${parseFloat(payment.invoiceAmount).toFixed(2)}` : '-'}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 font-bold whitespace-nowrap">{formatDate(payment.paymentDate)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-emerald-600 whitespace-nowrap bg-emerald-50/50">₹{payment.amountPaid}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{payment.paymentMode}</td>
      <td className="px-4 py-3 text-xs text-center font-medium text-gray-700 whitespace-nowrap">{payment.referenceNo}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-500 whitespace-nowrap truncate max-w-[200px]" title={payment.remarks}>{payment.remarks || '-'}</td>
      <td className="px-4 py-3 text-xs text-center whitespace-nowrap">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
          <CheckCircle size={12} /> Success
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-center text-gray-700 whitespace-nowrap">{payment.invoiceNumber || '-'}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{formatDate(payment.invoiceDate)}</td>
      <td className="px-3 py-3 text-center whitespace-nowrap bg-white" onClick={(e) => e.stopPropagation()}>
        {payment.poImage ? (
          <button onClick={(e) => handleImageView(payment.poImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
            <Eye size={16} />
          </button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-3 py-3 text-center whitespace-nowrap bg-white" onClick={(e) => e.stopPropagation()}>
        {payment.invoiceImage ? (
          <button onClick={(e) => handleImageView(payment.invoiceImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
            <Eye size={16} />
          </button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-3 py-3 text-center whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
        {payment.receiptImage ? (
          <button onClick={(e) => handleImageView(payment.receiptImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
            <FileImage size={16} />
          </button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
    </tr>
    );
  };

  return (
    <>
      <DataTable
      headers={tableHeaders}
      data={paginatedData}
      renderRow={renderRow}
      renderCard={renderCard}
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={itemsPerPage}
      onPageChange={setCurrentPage}
      onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
      totalResults={filteredData.length}
      minWidth="1080px"
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

      {/* Payment Details Modal — works the same for a single payment or a bulk payment */}
      {viewPayment && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setViewPayment(null)}>
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {groupForView.length > 1 ? 'Bulk Payment Details' : 'Payment Details'}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {groupForView.length > 1
                      ? `${groupForView.length} orders paid together on ${formatDate(viewPayment.paymentDate)}`
                      : `Order: ${viewPayment.orderId}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewPayment(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Shared Payment Details */}
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Payment Date</p>
                    <p className="text-sm font-bold text-gray-900">{formatDate(viewPayment.paymentDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Payment Mode</p>
                    <p className="text-sm font-semibold text-gray-900">{viewPayment.paymentMode}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Ref / UTR No</p>
                    <p className="text-sm font-semibold text-gray-900">{viewPayment.referenceNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 mb-1">Total Amount Paid</p>
                    <p className="text-sm font-bold text-emerald-600">₹{groupTotalPaid.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Remarks</p>
                    <p className="text-sm font-semibold text-gray-900">{viewPayment.remarks || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Receipt</p>
                    {viewPayment.receiptImage ? (
                      <button onClick={(e) => handleImageView(viewPayment.receiptImage, e)} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1">
                        <FileImage size={14} /> View
                      </button>
                    ) : (
                      <p className="text-sm text-gray-400">-</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Orders Paid — a single row for a single payment, or every order in the bulk payment */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3 font-bold text-center">Order ID</th>
                      <th className="px-3 py-3 font-bold text-center">Division</th>
                      <th className="px-3 py-3 font-bold text-center">PO Number</th>
                      <th className="px-3 py-3 font-bold text-center">Party Name</th>
                      <th className="px-3 py-3 font-bold text-center">Date of Delivery</th>
                      <th className="px-3 py-3 font-bold text-right">Invoice Value</th>
                      <th className="px-3 py-3 font-bold text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {groupForView.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-3 text-xs font-bold text-indigo-600 text-center whitespace-nowrap">{p.orderId}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{p.division}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-center whitespace-nowrap">{p.poNumber}</td>
                        <td className="px-3 py-3 text-xs text-gray-800 font-medium text-center whitespace-nowrap">{p.partyName}</td>
                        <td className="px-3 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{formatDate(p.expectedDeliveryDate)}</td>
                        <td className="px-3 py-3 text-xs font-bold text-gray-700 text-right whitespace-nowrap">{p.invoiceAmount ? `₹${parseFloat(p.invoiceAmount).toFixed(2)}` : '-'}</td>
                        <td className="px-3 py-3 text-xs font-bold text-emerald-600 text-right whitespace-nowrap">₹{parseFloat(p.amountPaid || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end">
              <button
                onClick={() => setViewPayment(null)}
                className="px-6 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
