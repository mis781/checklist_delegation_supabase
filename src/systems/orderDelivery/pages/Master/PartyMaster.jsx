import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Edit, Trash2 } from 'lucide-react';
import { getVendors, saveVendors, saveVendor } from '../../utils/storageManager';
import { generateId } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';

export default function PartyMaster({ searchQuery, triggerAdd }) {
  const [parties, setParties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    name: '', gst: '', email: '', phone: '', address: '', locationLink: '', responsiblePerson: ''
  });

  const headers = [
    'Actions', 'Timestamp', 'VN-NO', 'Party Name', 'Party GST', 'Party Email',
    'Party Phone NO.', 'Responsible Person Name', 'Party Address',
    'Party Location Link'
  ];

  useEffect(() => {
    setParties(getVendors());
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) handleAdd();
  }, [triggerAdd]);

  const filteredParties = useMemo(() => {
    return parties.filter(v => {
      const q = searchQuery.toLowerCase();
      return (
        v.name?.toLowerCase().includes(q) ||
        v.vnNo?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.gst?.toLowerCase().includes(q)
      );
    });
  }, [parties, searchQuery]);

  const sortedParties = useMemo(() => [...filteredParties].reverse(), [filteredParties]);
  const totalPages = Math.ceil(sortedParties.length / itemsPerPage);
  const paginatedParties = sortedParties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ name: '', gst: '', email: '', phone: '', address: '', locationLink: '', responsiblePerson: '' });
    setShowModal(true);
  };

  const handleEdit = (party) => {
    setEditingId(party.id);
    setFormData({ ...party });
    setShowModal(true);
  };

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleDelete = (id) => {
    showAlert('confirm', 'Are you sure?', 'This action will permanently delete the party from your records.', () => {
      const updated = parties.filter(v => v.id !== id);
      saveVendors(updated);
      setParties(updated);
      showAlert('success', 'Deleted!', 'The party has been successfully removed.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = { ...formData };

    if (editingId) {
      const updated = parties.map(v => v.id === editingId ? { ...v, ...finalData } : v);
      saveVendors(updated);
      setParties(updated);
      showAlert('success', 'Updated!', 'Party details saved successfully.');
    } else {
      const newParty = {
        ...finalData,
        id: generateId(),
        timestamp: new Date().toISOString(),
        vnNo: `VN-${String(parties.length + 1).padStart(3, '0')}`
      };
      saveVendor(newParty);
      setParties([...parties, newParty]);
      showAlert('success', 'Created!', 'New party added successfully.');
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
        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100"><p className="text-[8px] text-gray-400 font-bold uppercase">Address</p><p className="text-[10px] text-gray-700 leading-snug italic">"{item.address}"</p></div>
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-gray-50"><span className="text-[9px] text-gray-400 font-bold">{formatTimestamp(item.timestamp)}</span><a href={item.locationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 font-bold text-[9px] bg-sky-50 px-2 py-1 rounded-full"><MapPin size={10}/> View Map</a></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <DataTable
        headers={headers}
        data={paginatedParties}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="1100px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalResults={filteredParties.length}
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
        title={editingId ? 'Edit Party' : 'New Party Registration'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Register'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Party Name *</label>
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
