import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { CheckCircle, FileImage, X } from 'lucide-react';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';

export default function HistoryFreight({ data, filters }) {
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
        item.transportAgency?.toLowerCase().includes(q) ||
        item.referenceNo?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Payment ID", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Order ID", "Party Name", "Transporter Name", "Bilty Number", "Bilty Copy", "Payment Date", "Amount Paid", "Payment Mode", "Ref / UTR No", "Remarks", "Status",
    { label: "Receipt", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderCard = (payment) => (
    <div key={payment.id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-indigo-600 text-sm">{payment.orderId}</span>
        <span className="text-xs text-gray-500">{formatDate(payment.paymentDate)}</span>
      </div>
      <div className="text-sm text-gray-700 font-medium mb-1">{payment.partyName}</div>
      <div className="text-xs font-bold text-amber-600 mb-3">{payment.transportAgency}</div>
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

  const renderRow = (payment) => (
    <tr key={payment.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white">
        <span className="text-[11px] font-bold text-gray-500">{payment.id?.substring(0, 12)}</span>
      </td>
      <td className="px-4 py-3 text-xs text-center font-bold text-indigo-600 whitespace-nowrap">{payment.orderId}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-800 font-medium whitespace-nowrap">{payment.partyName}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-700 font-bold whitespace-nowrap">{payment.transportAgency}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-indigo-600 whitespace-nowrap">{payment.lrNumber && payment.lrNumber !== '-' ? payment.lrNumber : '-'}</td>
      <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {payment.lrCopy ? (
          <button onClick={(e) => handleImageView(payment.lrCopy, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
            <FileImage size={16} />
          </button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
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
      minWidth="1100px"
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
