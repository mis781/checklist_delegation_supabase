import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { getCompanies, saveCompanies, saveCompany } from '../../utils/storageManager';
import { generateId } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';
import InfoPopover from '../../components/InfoPopover';

export default function Company({ searchQuery, triggerAdd }) {
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    name: '', gst: '', pan: '', email: '', phone: '', responsiblePerson: '',
    address: '', billingAddress: '', destinationAddress: ''
  });

  const headers = [
    'Actions', 'Timestamp', 'VN-NO', 'Company Name', 'Company GST', 'Company PAN', 
    'Company Email', 'Company Phone', 'Responsible Person', 
    'Address', 'Billing', 'Destination'
  ];

  useEffect(() => {
    setCompanies(getCompanies());
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) handleAdd();
  }, [triggerAdd]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.vnNo?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.gst?.toLowerCase().includes(q)
      );
    });
  }, [companies, searchQuery]);

  const sortedCompanies = useMemo(() => [...filteredCompanies].reverse(), [filteredCompanies]);
  const totalPages = Math.ceil(sortedCompanies.length / itemsPerPage);
  const paginatedCompanies = sortedCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ name: '', gst: '', pan: '', email: '', phone: '', responsiblePerson: '', address: '', billingAddress: '', destinationAddress: '' });
    setShowModal(true);
  };

  const handleEdit = (company) => {
    setEditingId(company.id);
    setFormData({ ...company });
    setShowModal(true);
  };

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleDelete = (id) => {
    showAlert('confirm', 'Delete Company?', 'Are you sure you want to remove this company from the records?', () => {
      const updated = companies.filter(c => c.id !== id);
      saveCompanies(updated);
      setCompanies(updated);
      showAlert('success', 'Deleted!', 'The company record has been removed successfully.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      const updated = companies.map(c => c.id === editingId ? { ...c, ...formData } : c);
      saveCompanies(updated);
      setCompanies(updated);
      showAlert('success', 'Updated!', 'Company information has been updated.');
    } else {
      const newCompany = {
        ...formData,
        id: generateId(),
        timestamp: new Date().toISOString(),
        vnNo: `CN-${String(companies.length + 1).padStart(3, '0')}`
      };
      saveCompany(newCompany);
      setCompanies([...companies, newCompany]);
      showAlert('success', 'Saved!', 'New company has been successfully registered.');
    }
    setShowModal(false);
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const renderRow = (item) => (
    <tr key={item.id} className="hover:bg-gray-50 transition-colors text-center text-sm">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-800"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatTimestamp(item.timestamp)}</td>
      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{item.vnNo}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-bold">{item.name}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap uppercase">{item.gst}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap uppercase">{item.pan}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.email}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.phone}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.responsiblePerson}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        <InfoPopover items={[item.address]} title="Company Address">
          <span className="truncate max-w-[100px] block cursor-help italic">"{item.address}"</span>
        </InfoPopover>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        <InfoPopover items={[item.billingAddress]} title="Billing Address">
          <span className="truncate max-w-[100px] block cursor-help italic">"{item.billingAddress}"</span>
        </InfoPopover>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        <InfoPopover items={[item.destinationAddress]} title="Dest. Address">
          <span className="truncate max-w-[100px] block cursor-help italic">"{item.destinationAddress}"</span>
        </InfoPopover>
      </td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <div className="flex flex-col"><span className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">{item.vnNo}</span><h3 className="text-base font-medium text-gray-700 mt-1">{item.name}</h3></div>
        <div className="flex gap-2">
          <button onClick={() => handleEdit(item)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Edit size={16}/></button>
          <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-y-3 text-[11px]">
        <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-2">
          <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">GST</p><p className="text-xs font-bold text-gray-800 uppercase">{item.gst}</p></div>
          <div className="space-y-1 text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">PAN</p><p className="text-xs font-bold text-gray-800 uppercase">{item.pan}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-2">
          <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Email</p><p className="text-xs font-bold text-gray-800 truncate">{item.email}</p></div>
          <div className="space-y-1 text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Phone</p><p className="text-xs font-bold text-gray-800">{item.phone}</p></div>
        </div>
        <div className="space-y-1 border-b border-gray-50 pb-2"><p className="text-[10px] text-gray-400 font-bold uppercase">Responsible Person</p><p className="text-xs font-bold text-gray-800">{item.responsiblePerson}</p></div>
        <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2 rounded-lg">
          <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Company Address</p><p className="text-xs text-gray-700 leading-tight italic">"{item.address}"</p></div>
          <div className="space-y-1 border-t border-gray-200 pt-1 mt-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Billing Address</p><p className="text-xs text-gray-700 leading-tight italic">"{item.billingAddress}"</p></div>
          <div className="space-y-1 border-t border-gray-200 pt-1 mt-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Destination Address</p><p className="text-xs text-gray-700 leading-tight italic">"{item.destinationAddress}"</p></div>
        </div>
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-gray-50"><span className="text-[10px] text-gray-400 font-medium">{formatTimestamp(item.timestamp)}</span></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <DataTable 
        headers={headers} 
        data={paginatedCompanies}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="1200px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalResults={filteredCompanies.length}
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
        title={editingId ? 'Edit Company' : 'New Company Setup'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Save'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Company Name *</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">GST Number *</label>
            <input required type="text" value={formData.gst} onChange={(e) => setFormData({...formData, gst: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] uppercase h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">PAN Number *</label>
            <input required type="text" value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] uppercase h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Email Address *</label>
            <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Phone Number *</label>
            <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Responsible Person *</label>
            <input required type="text" value={formData.responsiblePerson} onChange={(e) => setFormData({...formData, responsiblePerson: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
        </div>
        <div className="space-y-1 pt-1.5 border-t border-gray-50"><label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Company Address *</label><textarea required rows="1" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px]" /></div>
        <div className="space-y-1 pt-1.5 border-t border-gray-50"><label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Billing Address *</label><textarea required rows="1" value={formData.billingAddress} onChange={(e) => setFormData({...formData, billingAddress: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px]" /></div>
        <div className="space-y-1 pt-1.5 border-t border-gray-50"><label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Destination Address *</label><textarea required rows="1" value={formData.destinationAddress} onChange={(e) => setFormData({...formData, destinationAddress: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px]" /></div>
      </ModalForm>
    </div>
  );
}
