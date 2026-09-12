import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Edit, Trash2, X } from 'lucide-react';
import { getVendors, saveVendors, saveVendor, getPaymentTermsMaster } from '../../utils/storageManager';
import { generateId } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';
import InfoPopover from '../../components/InfoPopover';
import SearchableDropdown from '../../components/SearchableDropdown';

export default function Vendor({ searchQuery, triggerAdd }) {
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [paymentTermOptions, setPaymentTermOptions] = useState([]);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    name: '', gst: '', email: '', phone: '', address: '', locationLink: '', responsiblePerson: '',
    paymentTerms: []
  });

  const headers = [
    'Actions', 'Timestamp', 'VN-NO', 'Vendor Name', 'Vendor GST', 'Vendor Email', 
    'Vendor Phone NO.', 'Responsible Person Name', 'Payment Terms', 'Vendor Address', 
    'Vendor Location Link'
  ];

  useEffect(() => {
    setVendors(getVendors());
    setPaymentTermOptions(getPaymentTermsMaster());
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) handleAdd();
  }, [triggerAdd]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const q = searchQuery.toLowerCase();
      return (
        v.name?.toLowerCase().includes(q) ||
        v.vnNo?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.gst?.toLowerCase().includes(q) ||
        v.paymentTerms?.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [vendors, searchQuery]);

  const sortedVendors = useMemo(() => [...filteredVendors].reverse(), [filteredVendors]);
  const totalPages = Math.ceil(sortedVendors.length / itemsPerPage);
  const paginatedVendors = sortedVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ name: '', gst: '', email: '', phone: '', address: '', locationLink: '', responsiblePerson: '', paymentTerms: [] });
    setShowModal(true);
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor.id);
    setFormData({ ...vendor, paymentTerms: vendor.paymentTerms || [] });
    setShowModal(true);
  };

  const handleAddTerm = (term) => {
    if (!term || formData.paymentTerms.includes(term)) return;
    setFormData({ ...formData, paymentTerms: [...formData.paymentTerms, term] });
  };
  const handleRemoveTerm = (index) => {
    setFormData({ ...formData, paymentTerms: formData.paymentTerms.filter((_, i) => i !== index) });
  };

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleDelete = (id) => {
    showAlert('confirm', 'Are you sure?', 'This action will permanently delete the vendor from your records.', () => {
      const updated = vendors.filter(v => v.id !== id);
      saveVendors(updated);
      setVendors(updated);
      showAlert('success', 'Deleted!', 'The vendor has been successfully removed.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanTerms = formData.paymentTerms.filter(t => t.trim() !== '');
    const finalData = { ...formData, paymentTerms: cleanTerms };

    if (editingId) {
      const updated = vendors.map(v => v.id === editingId ? { ...v, ...finalData } : v);
      saveVendors(updated);
      setVendors(updated);
      showAlert('success', 'Updated!', 'Vendor details saved successfully.');
    } else {
      const newVendor = {
        ...finalData,
        id: generateId(),
        timestamp: new Date().toISOString(),
        vnNo: `VN-${String(vendors.length + 1).padStart(3, '0')}`
      };
      saveVendor(newVendor);
      setVendors([...vendors, newVendor]);
      showAlert('success', 'Created!', 'New vendor added successfully.');
    }
    setShowModal(false);
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const renderRow = (item) => (
    <tr key={item.id} className="hover:bg-gray-50 transition-colors text-center text-[11px] md:text-sm">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-800"><Edit size={14}/></button>
          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
        </div>
      </td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{formatTimestamp(item.timestamp)}</td>
      <td className="px-3 py-2.5 text-gray-900 font-bold whitespace-nowrap">{item.vnNo}</td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{item.name}</td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap uppercase font-medium">{item.gst}</td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{item.email}</td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{item.phone}</td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap font-medium">{item.responsiblePerson}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <InfoPopover items={item.paymentTerms} title="Complete Payment Terms">
          <div className="flex justify-center items-center gap-1">
            {item.paymentTerms?.[0] && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] md:text-[10px] font-bold rounded border border-indigo-100 uppercase">
                {item.paymentTerms[0]}
              </span>
            )}
            {item.paymentTerms?.length > 1 && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded border border-amber-200">
                +{item.paymentTerms.length - 1}
              </span>
            )}
          </div>
        </InfoPopover>
      </td>
      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap truncate max-w-[120px]">{item.address}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <a href={item.locationLink} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 flex items-center justify-center gap-1 font-bold text-[10px]"><MapPin size={12}/> MAP</a>
      </td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-3">
      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
        <div className="flex flex-col"><span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{item.vnNo}</span><h3 className="text-[13px] font-bold text-gray-900 mt-0.5">{item.name}</h3></div>
        <div className="flex gap-1.5">
          <button onClick={() => handleEdit(item)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Edit size={14}/></button>
          <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={14}/></button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-y-3 text-[10px]">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5"><p className="text-[8px] text-gray-400 font-bold uppercase">GST</p><p className="text-[11px] font-bold text-gray-800 uppercase">{item.gst}</p></div>
          <div className="space-y-0.5 text-right"><p className="text-[8px] text-gray-400 font-bold uppercase">Phone</p><p className="text-[11px] font-bold text-gray-800">{item.phone}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5"><p className="text-[8px] text-gray-400 font-bold uppercase">Responsible Person</p><p className="text-[11px] font-bold text-gray-800">{item.responsiblePerson}</p></div>
          <div className="space-y-0.5 text-right"><p className="text-[8px] text-gray-400 font-bold uppercase">Email</p><p className="text-[11px] font-bold text-gray-800 truncate max-w-[100px] ml-auto">{item.email}</p></div>
        </div>
        <div className="space-y-1.5"><p className="text-[8px] text-gray-400 font-bold uppercase">Payment Terms</p><div className="flex flex-wrap gap-1">{item.paymentTerms?.map((term, i) => (<span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md border border-indigo-100 uppercase">{term}</span>))}</div></div>
        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100"><p className="text-[8px] text-gray-400 font-bold uppercase">Address</p><p className="text-[10px] text-gray-700 leading-snug italic">"{item.address}"</p></div>
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-gray-50"><span className="text-[9px] text-gray-400 font-bold">{formatTimestamp(item.timestamp)}</span><a href={item.locationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 font-bold text-[9px] bg-sky-50 px-2 py-1 rounded-full"><MapPin size={10}/> View Map</a></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <DataTable 
        headers={headers} 
        data={paginatedVendors}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="1100px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalResults={filteredVendors.length}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
      />

      <ModalAlert 
        {...alertConfig} 
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} 
      />

      <ModalForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Vendor' : 'New Vendor Registration'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Register'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Vendor Name *</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">GST Number *</label>
            <input required type="text" value={formData.gst} onChange={(e) => setFormData({...formData, gst: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] uppercase h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Email Address *</label>
            <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Phone Number *</label>
            <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-gray-50">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Payment Terms</label>
          {formData.paymentTerms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {formData.paymentTerms.map((term, index) => (
                <span key={index} className="flex items-center gap-1 pl-2 pr-1 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 uppercase">
                  {term}
                  <button type="button" onClick={() => handleRemoveTerm(index)} className="text-indigo-400 hover:text-red-500 transition-colors">
                    <X size={12}/>
                  </button>
                </span>
              ))}
            </div>
          )}
          <SearchableDropdown
            options={paymentTermOptions.filter(t => !formData.paymentTerms.includes(t.name)).map(t => ({ value: t.name, label: t.name }))}
            value=""
            onChange={handleAddTerm}
            placeholder="+ Add Payment Term"
            className="h-[30px] md:h-[34px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-gray-50">
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Responsible Person *</label>
            <input required type="text" value={formData.responsiblePerson} onChange={(e) => setFormData({...formData, responsiblePerson: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Location Link</label>
            <input type="url" value={formData.locationLink} onChange={(e) => setFormData({...formData, locationLink: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
        </div>
        <div className="space-y-1 pt-1.5 border-t border-gray-50">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Full Address *</label>
          <textarea required rows="1" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px]" />
        </div>
      </ModalForm>
    </div>
  );
}
