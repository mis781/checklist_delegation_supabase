import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Eye, X,
  RotateCcw, ChevronDown, ChevronUp, FileText, Download, Info, Check
} from 'lucide-react';
import { getReceivedOrders, getDivisions } from '../../utils/storageManager';
import { isPdfDataUrl, formatDate } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import InfoPopover from '../../components/InfoPopover';
import SearchableDropdown from '../../components/SearchableDropdown';

export default function ReceivedOrder() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [orders, setOrders] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Filters State
  const [filters, setFilters] = useState({
    searchQuery: '',
    division: '',
    partyName: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setOrders(getReceivedOrders());
    setDivisions(getDivisions() || []);
  }, []);

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '', division: '', partyName: ''
    });
    setCurrentPage(1);
  };

  const handleImageView = (base64, e) => {
    e.stopPropagation();
    setSelectedImage(base64);
    setShowImageModal(true);
  };

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredOrders = orders.filter(item => {
    if (filters.division && item.division !== filters.division) return false;
    if (filters.partyName && item.partyName !== filters.partyName) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return (
        item.orderId.toLowerCase().includes(q) ||
        item.poNumber.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q) ||
        (item.gstNumber && item.gstNumber.toLowerCase().includes(q))
      );
    }
    return true;
  }).reverse();

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    "", "Order ID", "Division", "PO-Number", "PO Date", "Party Name", "Party Number",
    "GST Number", "Responsible Person Name", "Expected Delivery Date", "Delivery Address", "Transporting Type",
    "Payment Terms", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount",
    "Remarks", "PO Image"
  ];

  const renderRow = (item) => {
    const isExpanded = expandedRows.has(item.id);
    return (
      <React.Fragment key={item.id}>
        <tr 
          onClick={() => toggleRow(item.id)}
          className={`hover:bg-indigo-50/50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-indigo-50/30' : ''}`}
        >
          <td className="px-4 py-3 text-center w-8">
            <button className="text-gray-400 hover:text-indigo-600 transition-colors">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </td>
          <td className="px-4 py-3 text-center text-xs text-indigo-600 font-bold whitespace-nowrap">{item.orderId}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.division}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap">{item.poNumber}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{formatDate(item.poDate)}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap font-medium">{item.partyName}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.partyNumber || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.gstNumber || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.responsiblePerson || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{formatDate(item.expectedDeliveryDate)}</td>
          <td className="px-4 py-3 text-left text-[11px] text-gray-600 max-w-[200px] truncate" title={item.deliveryAddress}>{item.deliveryAddress || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.transportingType || '-'}</td>
          <td className="px-4 py-3 text-center whitespace-nowrap">
            {item.paymentTerm ? (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 uppercase">{item.paymentTerm}</span>
            ) : <span className="text-gray-300 text-[11px]">-</span>}
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap bg-indigo-50/50 font-bold rounded-lg my-1 block mx-2">
            {item.items?.length || 0}
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-emerald-600 font-bold whitespace-nowrap">₹{item.totalPOValue?.toFixed(2)}</td>
          <td className="px-4 py-3 text-center whitespace-nowrap">
            <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${item.advancePayment === 'Yes' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
              {item.advancePayment}
            </span>
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-emerald-600 whitespace-nowrap">
            {item.advancePayment === 'Yes' && item.advanceAmount ? `₹${item.advanceAmount}` : '-'}
          </td>
          <td className="px-4 py-3 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {item.remarks ? (
              <InfoPopover items={[item.remarks]} title="Remarks">
                <span className="text-[11px] text-gray-500 flex items-center gap-1 cursor-help hover:text-indigo-600">
                  <Info size={12} /> View
                </span>
              </InfoPopover>
            ) : <span className="text-gray-300">-</span>}
          </td>
          <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {item.poImage ? (
              <button onClick={(e) => handleImageView(item.poImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full">
                <Eye size={16} />
              </button>
            ) : <span className="text-gray-300">-</span>}
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={18} className="p-0 border-b border-gray-200">
              <div className="bg-slate-50/50 p-4 border-l-4 border-indigo-500 shadow-inner animate-in slide-in-from-top-2 duration-200">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Product Details</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-2 font-medium">Product Number</th>
                        <th className="px-4 py-2 font-medium">Product Name</th>
                        <th className="px-4 py-2 font-medium text-right">Qty</th>
                        <th className="px-4 py-2 font-medium">UOM</th>
                        <th className="px-4 py-2 font-medium text-right">Price/Rate</th>
                        <th className="px-4 py-2 font-medium text-right">Total Price</th>
                        <th className="px-4 py-2 font-medium text-right">GST %</th>
                        <th className="px-4 py-2 font-medium text-right">GST Value</th>
                        <th className="px-4 py-2 font-medium text-right text-indigo-600">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {item.items?.map((prod, idx) => {
                        const basic = (parseFloat(prod.qty) || 0) * (parseFloat(prod.priceRate) || 0);
                        const gstPerc = parseFloat(prod.gstPercent || item.globalGstPercent || '0');
                        const gstValue = basic * (gstPerc / 100);
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-2 text-[11px] font-medium text-indigo-600">{item.orderId}-{String(idx + 1).padStart(2, '0')}</td>
                            <td className="px-4 py-2 text-[11px] font-bold text-gray-800">{prod.productName}</td>
                            <td className="px-4 py-2 text-[11px] text-right font-medium text-gray-600">{prod.qty}</td>
                            <td className="px-4 py-2 text-[10px] font-medium"><span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{prod.uom}</span></td>
                            <td className="px-4 py-2 text-[11px] text-right font-medium text-gray-600">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right text-[11px] font-medium text-gray-600">₹{basic.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right text-[11px] font-bold text-gray-700">{gstPerc}%</td>
                            <td className="px-4 py-2 text-right text-[11px] font-medium text-gray-600">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right text-[11px] font-black text-indigo-600">₹{parseFloat(prod.totalValue || 0).toFixed(2)}</td>
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

  const renderCard = (item) => {
    const isExpanded = expandedRows.has(item.id);
    return (
      <div key={item.id} className="bg-white rounded-lg border border-indigo-50 shadow-sm overflow-hidden">
        <div 
          className="p-3 space-y-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => toggleRow(item.id)}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] text-indigo-500 uppercase tracking-widest">{item.orderId}</span>
              <h4 className="text-sm text-gray-900 font-bold uppercase mt-0.5">{item.partyName}</h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[8px] uppercase bg-emerald-100 text-emerald-600 font-bold shadow-sm">
              ₹{item.totalPOValue?.toFixed(2)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[8px]">PO Number</p>
              <p className="text-gray-700 truncate">{item.poNumber}</p>
            </div>
            <div>
              <span className="text-gray-400 block uppercase text-[9px]">Products</span>
              <span className="text-indigo-600 font-bold">{item.items?.length || 0} Items</span>
            </div>
          </div>

          {item.deliveryAddress && (
            <div className="text-[10px]">
              <p className="text-gray-400 uppercase tracking-tighter text-[8px]">Delivery Address</p>
              <p className="text-gray-700 truncate">{item.deliveryAddress}</p>
            </div>
          )}

          {item.paymentTerm && (
            <div className="text-[10px]">
              <p className="text-gray-400 uppercase tracking-tighter text-[8px]">Payment Terms</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-100 uppercase">{item.paymentTerm}</span>
            </div>
          )}

          <div className="flex justify-center pt-1 border-t border-gray-50">
             <span className="text-[10px] text-gray-400 flex items-center gap-1">
               {isExpanded ? <><ChevronUp size={12}/> Hide Products</> : <><ChevronDown size={12}/> View Products</>}
             </span>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-slate-50 border-t border-indigo-100 p-2 space-y-2">
             {item.items?.map((prod, idx) => (
               <div key={idx} className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                 <div className="flex justify-between border-b border-gray-50 pb-1 mb-1">
                   <span className="text-[10px] font-bold text-gray-700">{prod.productName}</span>
                   <span className="text-[10px] text-indigo-600 font-bold">₹{prod.totalValue?.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-[9px] text-gray-500">
                   <span>Qty: {prod.qty} {prod.uom}</span>
                   <span>Rate: ₹{prod.priceRate} (+{prod.gstPercent || 0}% GST)</span>
                 </div>
               </div>
             ))}
             {item.poImage && (
              <button 
                onClick={(e) => handleImageView(item.poImage, e)}
                className="w-full bg-indigo-50 text-indigo-600 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-2 font-bold"
              >
                <Eye size={14} /> View PO Image
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full px-2 sm:px-0">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>
            <button
               onClick={() => setShowMobileFilters(!showMobileFilters)}
               className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={14} />
            </button>
            <button
              onClick={handleClearFilters}
              className="lg:hidden flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg h-[32px] w-[32px] flex-shrink-0 shadow-sm"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row gap-2 w-full lg:w-auto lg:flex-[8]`}>
             <div className="flex-1 min-w-0 lg:min-w-[150px]">
               <SearchableDropdown
                 options={divisions.map(d => ({ value: d.name, label: d.name }))}
                 value={filters.division}
                 onChange={(val) => { setFilters({ ...filters, division: val }); setCurrentPage(1); }}
                 placeholder="All Divisions"
                 className="h-[32px] md:h-[38px]"
               />
             </div>

             <button
              onClick={handleClearFilters}
              className="hidden lg:flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded lg:rounded-lg w-[38px] h-[38px] hover:bg-gray-100 shadow-sm"
              title="Clear Filters"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <DataTable
          headers={tableHeaders}
          data={paginatedOrders}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="1600px"
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          totalResults={filteredOrders.length}
        />
      </div>

      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-2 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors z-10 border border-gray-200"
            >
              <X size={20} />
            </button>
            <div className="overflow-auto max-h-[85vh] rounded-xl">
              {isPdfDataUrl(selectedImage) ? (
                <iframe src={selectedImage} title="PDF Preview" className="w-full h-[80vh] rounded-xl bg-white" />
              ) : selectedImage.startsWith('data:image/') ? (
                <img src={selectedImage} alt="Attachment" className="w-full h-auto" />
              ) : (
                <div className="p-10 text-center">
                  <FileText size={48} className="mx-auto text-indigo-200 mb-4" />
                  <p className="text-gray-600">Document Preview Not Available</p>
                  <a href={selectedImage} download className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg">Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
