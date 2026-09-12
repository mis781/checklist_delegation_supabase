import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Plus, Minus } from 'lucide-react';
import { getTransporterAgencies, saveTransporterAgencies } from '../../utils/storageManager';
import { generateId } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';

export default function TransporterAgency({ searchQuery, triggerAdd }) {
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });

  const initialEntry = { name: '', vehicleNo: '', driverName: '', mobile: '' };
  const [entries, setEntries] = useState([initialEntry]);

  const headers = ['Actions', 'Timestamp', 'TA-NO', 'Transport Agency', 'Vehicle Plate No.', 'Driver Full Name', 'Driver Mobile'];

  useEffect(() => {
    setData(getTransporterAgencies());
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) handleAdd();
  }, [triggerAdd]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const q = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.taNo?.toLowerCase().includes(q) ||
        item.vehicleNo?.toLowerCase().includes(q) ||
        item.driverName?.toLowerCase().includes(q) ||
        item.mobile?.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery]);

  const sortedData = useMemo(() => [...filteredData].reverse(), [filteredData]);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = () => {
    setEditingId(null);
    setEntries([initialEntry]);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEntries([{ name: item.name, vehicleNo: item.vehicleNo, driverName: item.driverName, mobile: item.mobile }]);
    setShowModal(true);
  };

  const handleAddRow = () => setEntries([...entries, initialEntry]);
  const handleRemoveRow = (index) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };
  const handleEntryChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleDelete = (id) => {
    showAlert('confirm', 'Delete Transporter Agency?', 'This action will remove the transporter agency from your records.', () => {
      const updated = data.filter(i => i.id !== id);
      saveTransporterAgencies(updated);
      setData(updated);
      showAlert('success', 'Deleted!', 'Transporter Agency has been removed successfully.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validEntries = entries.filter(e => e.name.trim() !== '');

    if (validEntries.length === 0) {
      showAlert('error', 'Error', 'Please provide at least one transport agency name.');
      return;
    }

    if (editingId) {
      const updated = data.map(i => i.id === editingId ? { ...i, ...validEntries[0] } : i);
      saveTransporterAgencies(updated);
      setData(updated);
      showAlert('success', 'Updated!', 'Transporter Agency details have been modified.');
    } else {
      const newItems = validEntries.map((entry, index) => ({
        id: generateId() + index,
        ...entry,
        timestamp: new Date().toISOString(),
        taNo: `TA-${String(data.length + index + 1).padStart(3, '0')}`
      }));

      const updatedData = [...data, ...newItems];
      saveTransporterAgencies(updatedData);
      setData(updatedData);
      showAlert('success', 'Success!', `${newItems.length} transporter agenc(ies) added successfully.`);
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
          <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-800 transition-colors"><Edit size={16}/></button>
          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16}/></button>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTimestamp(item.timestamp)}</td>
      <td className="px-4 py-3 text-gray-900 font-bold whitespace-nowrap">{item.taNo}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">{item.name}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.vehicleNo}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.driverName}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.mobile}</td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 relative">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <div><span className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">{item.taNo}</span><h3 className="text-sm font-medium text-gray-700 mt-1">{item.name}</h3></div>
        <div className="flex gap-2">
          <button onClick={() => handleEdit(item)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Edit size={16}/></button>
          <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
        </div>
      </div>
      <div className="space-y-1 py-1">
        <p className="text-xs text-gray-600"><span className="font-semibold text-gray-800">Vehicle:</span> {item.vehicleNo}</p>
        <p className="text-xs text-gray-600"><span className="font-semibold text-gray-800">Driver:</span> {item.driverName}</p>
        <p className="text-xs text-gray-600"><span className="font-semibold text-gray-800">Mobile:</span> {item.mobile}</p>
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-gray-50">
        <span className="text-[10px] text-gray-400 font-medium">{formatTimestamp(item.timestamp)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <DataTable
        headers={headers}
        data={paginatedData}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="1000px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalResults={filteredData.length}
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
        title={editingId ? 'Edit Transporter Agency' : 'Register Transporter Agencies'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Save All'}
        width="max-w-4xl"
      >
        <div className="space-y-4">
          {!editingId && (
            <div className="flex justify-between items-center pb-1 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entry List</span>
            </div>
          )}

          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-3 items-end group bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 space-y-1 w-full">
                  <label className="block text-[10px] font-medium text-gray-700 uppercase tracking-tight">Agency Name *</label>
                  <input
                    required
                    type="text"
                    value={entry.name}
                    onChange={(e) => handleEntryChange(index, 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-sm"
                    placeholder="Agency Name"
                  />
                </div>
                <div className="flex-1 space-y-1 w-full">
                  <label className="block text-[10px] font-medium text-gray-700 uppercase tracking-tight">Vehicle Plate No.</label>
                  <input
                    type="text"
                    value={entry.vehicleNo}
                    onChange={(e) => handleEntryChange(index, 'vehicleNo', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-sm"
                    placeholder="Vehicle No."
                  />
                </div>
                <div className="flex-1 space-y-1 w-full">
                  <label className="block text-[10px] font-medium text-gray-700 uppercase tracking-tight">Driver Full Name</label>
                  <input
                    type="text"
                    value={entry.driverName}
                    onChange={(e) => handleEntryChange(index, 'driverName', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-sm"
                    placeholder="Driver Name"
                  />
                </div>
                <div className="flex-1 space-y-1 w-full">
                  <label className="block text-[10px] font-medium text-gray-700 uppercase tracking-tight">Driver Mobile</label>
                  <input
                    type="text"
                    value={entry.mobile}
                    onChange={(e) => handleEntryChange(index, 'mobile', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-sm"
                    placeholder="Mobile No."
                  />
                </div>
                {!editingId && entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="mb-1 text-red-400 hover:text-red-600 transition-colors p-1 bg-white rounded shadow-sm border border-red-100"
                  >
                    <Minus size={18}/>
                  </button>
                )}
              </div>
            ))}
          </div>

          {!editingId && (
            <div className="pt-2 border-t border-gray-50 flex justify-end">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest"
              >
                <Plus size={14}/> Add Row
              </button>
            </div>
          )}
        </div>
      </ModalForm>
    </div>
  );
}
