import { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Banknote, Eye } from 'lucide-react';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import FormAdvancePayment from './FormAdvancePayment';
import { savePaymentTransaction } from '../../utils/storageManager';
import toast from 'react-hot-toast';

export default function PendingAdvance({ data, filters, onSuccess }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const handleImageView = (base64, e) => {
    e.stopPropagation();
    setSelectedImage(base64);
    setShowImageModal(true);
  };

  // Data is already filtered by active orders that have pending advance.
  // We just apply search filters
  const filteredData = data.filter(item => {
    if (filters.division && item.division !== filters.division) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return (
        item.orderId.toLowerCase().includes(q) ||
        item.poNumber.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q)
      );
    }
    return true;
  }).reverse();

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    { label: "Order ID", className: "sticky left-[120px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO Number", "PO Date", "Party Name", "Delivery Date", "Transport", "Total Product", 
    "PO Value", "Required Advance", "Paid Advance", 
    { label: "Pending Advance", className: "min-w-[140px]" },
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const handlePaymentSubmit = (formData) => {
    const paymentRecord = {
      orderId: selectedOrder.orderId,
      paymentType: 'Advance',
      amountPaid: formData.amountPaid,
      paymentDate: formData.paymentDate,
      paymentMode: formData.paymentMode,
      referenceNo: formData.referenceNo,
      remarks: formData.remarks,
      receiptImage: formData.receiptImage,
    };
    
    savePaymentTransaction([paymentRecord]);
    toast.success('Advance Payment recorded successfully!');
    setShowForm(false);
    setSelectedOrder(null);
    onSuccess();
  };

  const renderCard = (order) => (
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
          <span className="text-xs font-bold text-green-600">₹{order.totalPOValue?.toFixed(2) || '0.00'}</span>
          <div className="text-[10px] text-gray-400">PO Value</div>
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
          <span className="text-gray-400 block text-[10px]">Exp. Delivery</span>
          <span className="font-medium text-indigo-600">{formatDate(order.expectedDeliveryDate)}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Transport</span>
          <span className="font-medium text-gray-700">{order.transportingType || '-'}</span>
        </div>
        <div className="bg-amber-50/70 p-1.5 rounded border border-amber-100">
          <span className="text-amber-800 block text-[10px] font-semibold">Req. Advance</span>
          <span className="text-xs font-bold text-amber-700">₹{order.advanceAmount || '0'}</span>
        </div>
        <div className="bg-emerald-50/70 p-1.5 rounded border border-emerald-100">
          <span className="text-emerald-800 block text-[10px] font-semibold">Paid Advance</span>
          <span className="text-xs font-bold text-emerald-700">₹{(order.totalPaid || 0).toFixed(2)}</span>
        </div>
        <div className="col-span-2 bg-red-50/70 p-2 rounded border border-red-100 flex justify-between items-center">
          <span className="text-red-800 text-[11px] font-bold">Pending Advance:</span>
          <span className="text-xs font-bold text-red-600">₹{order.pendingAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Action and Attachments Bar */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {order.poImage && (
          <button
            onClick={(e) => handleImageView(order.poImage, e)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Eye size={14} /> PO Copy
          </button>
        )}
        <button
          onClick={() => {
            setSelectedOrder(order);
            setShowForm(true);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
        >
          <Banknote size={14} /> Pay Advance
        </button>
      </div>
    </div>
  );

  const renderRow = (order) => (
    <tr key={order.orderId} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white text-center">
        <button
          onClick={() => {
            setSelectedOrder(order);
            setShowForm(true);
          }}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full shadow-sm"
        >
          <Banknote size={14} /> Pay Advance
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap sticky left-[120px] z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white">
        <span className="text-xs font-bold text-indigo-600">{order.orderId}</span>
      </td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{order.division}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-700 font-medium whitespace-nowrap">{order.poNumber}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{formatDate(order.poDate)}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-800 font-medium whitespace-nowrap">{order.partyName}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{formatDate(order.expectedDeliveryDate)}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{order.transportingType}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-gray-800 whitespace-nowrap bg-gray-50">{order.items?.length || 0}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-emerald-600 whitespace-nowrap">₹{order.totalPOValue?.toFixed(2)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-amber-600 whitespace-nowrap bg-amber-50/50">₹{order.advanceAmount}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-indigo-600 whitespace-nowrap">₹{(order.totalPaid || 0).toFixed(2)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-red-600 whitespace-nowrap bg-red-50/50">₹{order.pendingAmount.toFixed(2)}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] bg-white">
        {order.poImage ? (
          <button onClick={(e) => handleImageView(order.poImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
            <Eye size={16} />
          </button>
        ) : <span className="text-gray-300">-</span>}
      </td>
    </tr>
  );

  return (
    <>
      <DataTable
        tableKey="o2d_pay_advance_pending"
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
        minWidth="1400px"
      />

      {showForm && selectedOrder && (
        <FormAdvancePayment 
          order={selectedOrder}
          onClose={() => {
            setShowForm(false);
            setSelectedOrder(null);
          }}
          onSubmit={handlePaymentSubmit}
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
