import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Plus, Minus } from 'lucide-react';
import { getUOMs, saveUOMs, saveUOM } from '../../utils/storageManager';
import { generateId } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';

export default function UOM({ searchQuery, triggerAdd }) {
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });

  const [entries, setEntries] = useState([{ name: '' }]);

  const headers = ['Actions', 'Timestamp', 'UOM-NO', 'UOM'];

  useEffect(() => {
    setData(getUOMs());
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) handleAdd();
  }, [triggerAdd]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const q = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.uomNo?.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery]);

  const sortedData = useMemo(() => [...filteredData].reverse(), [filteredData]);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = () => {
    setEditingId(null);
    setEntries([{ name: '' }]);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEntries([{ name: item.name }]);
    setShowModal(true);
  };

  const handleAddRow = () => setEntries([...entries, { name: '' }]);
  const handleRemoveRow = (index) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };
  const handleEntryChange = (index, value) => {
    const updated = [...entries];
    updated[index].name = value;
    setEntries(updated);
  };

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleDelete = (id) => {
    showAlert('confirm', 'Delete UOM?', 'Are you sure you want to delete this Unit of Measure?', () => {
      const updated = data.filter(i => i.id !== id);
      saveUOMs(updated);
      setData(updated);
      showAlert('success', 'Deleted!', 'The UOM has been removed successfully.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validEntries = entries.filter(e => e.name.trim() !== '');
    
    if (validEntries.length === 0) {
      showAlert('error', 'Error', 'Please provide at least one unit name.');
      return;
    }

    if (editingId) {
      const updated = data.map(i => i.id === editingId ? { ...i, name: validEntries[0].name } : i);
      saveUOMs(updated);
      setData(updated);
      showAlert('success', 'Updated!', 'Unit of Measure has been updated.');
    } else {
      const newItems = validEntries.map((entry, index) => ({
        id: generateId() + index,
        name: entry.name,
        timestamp: new Date().toISOString(),
        uomNo: `UOM-${String(data.length + index + 1).padStart(3, '0')}`
      }));
      
      const updatedData = [...data, ...newItems];
      saveUOMs(updatedData);
      setData(updatedData);
      showAlert('success', 'Success!', `${newItems.length} unit(s) added successfully.`);
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
      <td className="px-4 py-3 text-gray-900 font-bold whitespace-nowrap">{item.uomNo}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap uppercase font-medium">{item.name}</td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 relative">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <div><span className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">{item.uomNo}</span><h3 className="text-sm font-medium text-gray-700 mt-1 uppercase">{item.name}</h3></div>
        <div className="flex gap-2">
          <button onClick={() => handleEdit(item)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Edit size={16}/></button>
          <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
        </div>
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
        minWidth="500px"
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
        title={editingId ? 'Edit UOM' : 'Register Units (UOM)'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Save All'}
      >
        <div className="space-y-2">
          {!editingId && (
            <div className="flex justify-between items-center pb-1 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entry List</span>
            </div>
          )}
          
          <div className="space-y-1.5">
            {entries.map((entry, index) => (
              <div key={index} className="flex gap-2 items-center group">
                <div className="flex-1 space-y-1">
                  {index === 0 && <label className="block text-[10px] font-medium text-gray-700 uppercase tracking-tight">Unit Name *</label>}
                  <input 
                    required 
                    type="text" 
                    value={entry.name} 
                    onChange={(e) => handleEntryChange(index, e.target.value)} 
                    className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px] uppercase" 
                    placeholder="e.g. PCS, KG, METER..." 
                  />
                </div>
                {!editingId && entries.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveRow(index)}
                    className="mt-auto mb-1 text-red-400 hover:text-red-600 transition-colors p-1"
                  >
                    <Minus size={16}/>
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
                <Plus size={14}/> Add
              </button>
            </div>
          )}
        </div>
      </ModalForm>
    </div>
  );
}
