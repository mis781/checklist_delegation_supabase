import { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Eye, CheckCircle, FileImage, X } from 'lucide-react';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';

export default function HistoryAdvance({ data, filters }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [viewImage, setViewImage] = useState(null);

  const handleImageView = (imgUrl, e) => {
    e.stopPropagation();
    if (imgUrl) setViewImage(imgUrl);
  };

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
    { label: "Payment ID", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Order ID", "Party Name", "Payment Date", "Amount Paid", "Payment Mode", "Ref / UTR No", "Remarks", "Status", "PO Image",
    { label: "Receipt", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderCard = (payment) => (
    <div key={payment.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
      {/* Header Badges */}
      <div className="flex justify-between items-start border-b border-gray-100 pb-2">
        <div>
          <span className="font-bold text-indigo-600 text-sm">{payment.orderId}</span>
          <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
            Success
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-emerald-600">₹{payment.amountPaid}</span>
          <div className="text-[10px] text-gray-400">Paid Amount</div>
        </div>
      </div>

      {/* Party Details */}
      <div className="bg-slate-50/70 rounded-lg p-2.5">
        <div className="text-xs font-bold text-gray-800">{payment.partyName}</div>
      </div>

      {/* 2-Column Info Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-gray-400 block text-[10px]">Payment Date</span>
          <span className="font-medium text-gray-700">{formatDate(payment.paymentDate)}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Payment Mode</span>
          <span className="font-semibold text-gray-800">{payment.paymentMode || '-'}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Ref / UTR No</span>
          <span className="font-mono text-gray-700">{payment.referenceNo || '-'}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Payment ID</span>
          <span className="font-mono text-gray-500 text-[10px]">{payment.id?.substring(0, 12)}</span>
        </div>
      </div>

      {payment.remarks && payment.remarks !== '-' && (
        <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700">
          <span className="font-semibold">Remarks:</span> {payment.remarks}
        </div>
      )}

      {/* Attachments Bar */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {payment.poImage && (
          <button
            onClick={(e) => handleImageView(payment.poImage, e)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Eye size={14} /> PO Copy
          </button>
        )}
        {payment.receiptImage && (
          <button
            onClick={(e) => handleImageView(payment.receiptImage, e)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileImage size={14} /> Receipt
          </button>
        )}
      </div>
    </div>
  );

  const renderRow = (payment) => (
    <tr key={payment.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white">
        <span className="text-[11px] font-bold text-gray-500">{payment.id?.substring(0, 12)}</span>
      </td>
      <td className="px-4 py-3 text-xs text-center font-bold text-indigo-600 whitespace-nowrap">{payment.orderId}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-800 font-medium whitespace-nowrap">{payment.partyName}</td>
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
      <td className="px-3 py-3 text-center whitespace-nowrap bg-white" onClick={(e) => e.stopPropagation()}>
        {payment.poImage ? (
          <button onClick={(e) => handleImageView(payment.poImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
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

  return (
    <>
      <DataTable
        tableKey="o2d_pay_advance_history"
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
      minWidth="1000px"
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
