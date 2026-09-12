import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { getReceivedOrders, getDivisions, getPersons, getPackagingHistory, getLogisticHistory, getCallanHistory, DATA_CHANGED_EVENT } from '../../utils/storageManager';
import PendingCallan from './PendingCallan';
import HistoryCallan from './HistoryCallan';
import SearchableDropdown from '../../components/SearchableDropdown';
import { TabSwitcher } from '../../components/StandardButtons';

export default function MakeCallan() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    searchQuery: '',
    division: '',
    partyName: ''
  });

  const [receivedOrders, setReceivedOrders] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [persons, setPersons] = useState([]);
  const [pendingCallans, setPendingCallans] = useState([]);
  const [historyCallans, setHistoryCallans] = useState([]);

  useEffect(() => {
    loadData();

    const handleDataChanged = () => {
      loadData();
    };
    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);

    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    };
  }, [activeTab]);

  const loadData = () => {
    const orders = getReceivedOrders() || [];
    const packagingHistory = getPackagingHistory() || [];
    const logisticHistory = getLogisticHistory() || [];
    const callanHistory = getCallanHistory() || [];

    setReceivedOrders(orders);
    setDivisions(getDivisions() || []);
    setPersons(getPersons() || []);

    // Compute Pending Callans
    const pendingList = orders.filter(order => {
      // Find items in packaging history
      const orderPackaged = packagingHistory.filter(ph => ph.orderId === order.orderId && ph.packagingStatus === 'Yes');
      if (orderPackaged.length === 0) return false;

      // Find items in Vehicle Logistic history
      const orderLogistic = logisticHistory.filter(lh => lh.orderId === order.orderId);

      // A packaged item is ready for Callan if:
      // 1. It went through Vehicle Logistic (matched by dispatchId)
      // OR
      // 2. The order's Transporting Type is 'FOR' (goes directly to Challan, skipping Vehicle Logistic)
      const cleanType = (order.transportingType || '').toLowerCase().replace(/[^a-z]/g, '');
      const isFOR = cleanType === 'for';

      const itemsReadyForCallan = orderPackaged.filter(packageItem => {
        const inLogistic = orderLogistic.some(lh => lh.dispatchId === packageItem.dispatchId);
        return inLogistic || isFOR;
      });

      if (itemsReadyForCallan.length === 0) return false;

      // Ensure at least one ready item is NOT yet in Callan history
      return itemsReadyForCallan.some(readyItem => {
        return !callanHistory.some(ch => ch.dispatchId === readyItem.dispatchId);
      });
    });

    // Compute History Callans
    const historyList = orders.filter(order => {
      return callanHistory.some(ch => ch.orderId === order.orderId);
    });

    setPendingCallans(pendingList);
    setHistoryCallans(historyList);
  };

  const handleClearFilters = () =>
    setFilters({ searchQuery: '', division: '', partyName: '' });

  const divisionOptions = useMemo(() =>
    divisions.map(d => ({ value: d.name, label: d.name }))
  , [divisions]);

  const partyOptions = useMemo(() =>
    [...new Set(receivedOrders.map(o => o.partyName).filter(Boolean))].sort().map(p => ({ value: p, label: p }))
  , [receivedOrders]);

  return (
    <div className="p-0 sm:p-1 md:p-3 space-y-2 md:space-y-3 flex flex-col h-full min-h-0">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 w-full pb-2 border-b border-gray-100 px-2 md:px-0">
        
        <TabSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { id: 'pending', label: 'Pending', count: pendingCallans.length },
            { id: 'history', label: 'History', count: historyCallans.length }
          ]}
        />

        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center flex-1">
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input type="text" placeholder="Search Orders..." value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>
            <button onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-gray-300 text-gray-600'}`}>
              <Filter size={14} />
            </button>
            <button onClick={handleClearFilters}
              className="lg:hidden flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg h-[32px] w-[32px] flex-shrink-0">
              <RotateCcw size={14} />
            </button>
          </div>

          <div className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row lg:flex-nowrap gap-2 w-full lg:w-auto lg:flex-[8] items-center`}>
            <div className="flex flex-row gap-2 w-full lg:w-auto lg:contents">
              <div className="flex-1 min-w-0 lg:min-w-[120px]">
                <SearchableDropdown options={divisionOptions} value={filters.division}
                  onChange={(val) => setFilters({ ...filters, division: val })}
                  placeholder="All Divisions" className="h-[32px] md:h-[38px]" />
              </div>
              <div className="flex-1 min-w-0 lg:min-w-[150px]">
                <SearchableDropdown options={partyOptions} value={filters.partyName}
                  onChange={(val) => setFilters({ ...filters, partyName: val })}
                  placeholder="All Parties" className="h-[32px] md:h-[38px]" />
              </div>
            </div>
            <button onClick={handleClearFilters}
              className="hidden lg:flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded w-[38px] h-[38px] hover:bg-gray-100 shadow-sm">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {activeTab === 'pending' ? (
          <PendingCallan 
            data={pendingCallans} 
            filters={filters} 
            onSuccess={loadData}
          />
        ) : (
          <HistoryCallan 
            data={historyCallans} 
            filters={filters}
            refresh={loadData}
          />
        )}
      </div>
    </div>
  );
}
