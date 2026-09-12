import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, Edit, FileText, Clock, Building2, ListOrdered
} from 'lucide-react';
import { 
  getTermsConditions, saveTermsConditions, getCompanies 
} from '../../utils/storageManager';
import SearchableDropdown from '../../components/SearchableDropdown';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';

export default function TermsCondition({ searchQuery, triggerAdd }) {
  const [terms, setTerms] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const [alertConfig, setAlertConfig] = useState({ 
    isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} 
  });

  const [formData, setFormData] = useState({
    companyName: '',
    content: ''
  });

  const headers = [
    'Actions', 'Timestamp', 'Serial No', 'Terms No', 'Company Name', 'Terms & Condition'
  ];

  useEffect(() => {
    setTerms(getTermsConditions());
    setCompanies(getCompanies());
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) {
      handleAdd();
    }
  }, [triggerAdd]);

  const handleAdd = () => {
    setEditingId(null);
    const allCompanies = getCompanies();
    setFormData({ 
      companyName: allCompanies.length === 1 ? allCompanies[0].name : '', 
      content: '' 
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ companyName: item.companyName, content: item.content });
    setShowModal(true);
  };

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleDelete = (id) => {
    showAlert('confirm', 'Are you sure?', 'This action will permanently delete this term.', () => {
      const updated = terms.filter(t => t.id !== id);
      saveTermsConditions(updated);
      setTerms(updated);
      showAlert('success', 'Deleted!', 'The term has been successfully removed.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.companyName || !formData.content) {
      showAlert('error', 'Error', 'Please fill all required fields.');
      return;
    }

    if (editingId) {
      const updated = terms.map(t => t.id === editingId ? { ...t, ...formData } : t);
      saveTermsConditions(updated);
      setTerms(updated);
      showAlert('success', 'Updated!', 'Term updated successfully.');
    } else {
      const allTerms = getTermsConditions();
      
      // Check if this company already has a TC number
      const existingCompanyTerm = allTerms.find(t => t.companyName === formData.companyName);
      let tcNo = '';
      
      if (existingCompanyTerm) {
        tcNo = existingCompanyTerm.tcNo;
      } else {
        // Find highest TC number and increment
        const tcNumbers = allTerms.map(t => parseInt(t.tcNo.split('-')[1]) || 0);
        const maxTc = Math.max(0, ...tcNumbers);
        tcNo = `TC-${String(maxTc + 1).padStart(3, '0')}`;
      }

      const companyTermsCount = allTerms.filter(t => t.companyName === formData.companyName).length;
      
      const newTerm = {
        id: `TC-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tcNo: tcNo,
        termsNo: companyTermsCount + 1,
        companyName: formData.companyName,
        content: formData.content
      };

      const updated = [newTerm, ...allTerms];
      saveTermsConditions(updated);
      setTerms(updated);
      showAlert('success', 'Created!', 'New term added successfully.');
    }
    setShowModal(false);
  };

  const filteredTerms = useMemo(() => {
    return terms.filter(t => {
      const q = searchQuery?.toLowerCase() || '';
      return (
        t.companyName.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.tcNo.toLowerCase().includes(q)
      );
    });
  }, [terms, searchQuery]);

  const sortedTerms = useMemo(() => [...filteredTerms].reverse(), [filteredTerms]);
  const totalPages = Math.ceil(sortedTerms.length / itemsPerPage);
  const paginatedTerms = sortedTerms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      <td className="px-3 py-2.5 text-indigo-700 whitespace-nowrap">{item.tcNo}</td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-sm">#{item.termsNo}</td>
      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{item.companyName}</td>
      <td className="px-3 py-2.5 text-gray-600 text-left min-w-[300px]">
        <div className="line-clamp-1 hover:line-clamp-none transition-all cursor-help" title={item.content}>
          {item.content}
        </div>
      </td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-3">
      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
        <div className="flex flex-col">
          <span className="text-[9px] text-indigo-600 uppercase tracking-widest">{item.tcNo}</span>
          <h3 className="text-[13px] text-gray-900 mt-0.5">{item.companyName}</h3>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => handleEdit(item)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Edit size={14}/></button>
          <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={14}/></button>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Term Content</p>
        <p className="text-[11px] text-gray-700 leading-relaxed italic">"{item.content}"</p>
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-gray-50">
        <span className="text-[9px] text-gray-400">Terms No: #{item.termsNo}</span>
        <span className="text-[9px] text-gray-400">{formatTimestamp(item.timestamp)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <DataTable 
        headers={headers} 
        data={paginatedTerms}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="1000px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalResults={filteredTerms.length}
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
        title={editingId ? 'Edit Terms & Condition' : 'Add Terms & Condition'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Save'}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
              <Building2 size={12} /> Company Name
            </label>
            <SearchableDropdown
              options={companies.map(c => ({ value: c.name, label: c.name }))}
              value={formData.companyName}
              onChange={(val) => setFormData(prev => ({ ...prev, companyName: val }))}
              placeholder="Select Company"
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
              <FileText size={12} /> Terms & Condition Content
            </label>
            <textarea 
              rows="4"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter terms and conditions here..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none h-[120px]"
            />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
