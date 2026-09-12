import React, { useState } from 'react';
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
    <div key={order.orderId} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-indigo-600">{order.orderId}</span>
        <span className="text-xs text-gray-500">{formatDate(order.poDate)}</span>
      </div>
      <div className="text-sm text-gray-700 font-medium mb-3">{order.partyName}</div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Required</span>
          <span className="text-xs font-bold text-amber-600">₹{order.advanceAmount}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Pending</span>
          <span className="text-xs font-bold text-red-600">₹{order.pendingAmount.toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={() => {
          setSelectedOrder(order);
          setShowForm(true);
        }}
        className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
      >
        <Banknote size={16} /> Pay Advance
      </button>
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
