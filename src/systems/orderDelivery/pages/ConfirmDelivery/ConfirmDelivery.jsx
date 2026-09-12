import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { getReceivedOrders, getInvoiceHistory, getConfirmDeliveryHistory, DATA_CHANGED_EVENT } from '../../utils/storageManager';
import PendingDelivery from './PendingDelivery';
import HistoryDelivery from './HistoryDelivery';
import SearchableDropdown from '../../components/SearchableDropdown';
import { TabSwitcher } from '../../components/StandardButtons';

export default function ConfirmDelivery() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    searchQuery: '',
    division: '',
    partyName: ''
  });

  const loadData = () => {
    const allOrders = getReceivedOrders() || [];
    setOrders(allOrders);
  };

  useEffect(() => {
    loadData();

    const handleDataChanged = () => {
      loadData();
    };
    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);

    const interval = setInterval(loadData, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    };
  }, []);

  const handleClearFilters = () =>
    setFilters({ searchQuery: '', division: '', partyName: '' });

  const pendingDeliveries = useMemo(() => {
    const allInvoice = getInvoiceHistory() || [];
    const allConfirm = getConfirmDeliveryHistory() || [];
    return orders.filter(order => {
      const orderInvoices = allInvoice.filter(ih => ih.orderId === order.orderId);
      if (orderInvoices.length === 0) return false;
      // Matched by dispatchId — each dispatch transaction, including partial ones, is independent
      return orderInvoices.some(invoiceItem => {
        const cd = allConfirm.find(ch => ch.dispatchId === invoiceItem.dispatchId);
        return !cd || cd.deliveryStatus !== 'Delivered';
      });
    });
  }, [orders]);

  const historyDeliveries = useMemo(() => {
    const allConfirm = getConfirmDeliveryHistory() || [];
    return orders.filter(order => allConfirm.some(ch => ch.orderId === order.orderId && ch.deliveryStatus === 'Delivered'));
  }, [orders]);

  const divisionOptions = useMemo(() => 
    [...new Set(orders.map(o => o.division).filter(Boolean))].map(d => ({ value: d, label: d }))
  , [orders]);

  const partyOptions = useMemo(() => 
    [...new Set(orders.map(o => o.partyName).filter(Boolean))].sort().map(p => ({ value: p, label: p }))
  , [orders]);

  return (
    <div className="p-0 sm:p-1 md:p-3 space-y-2 md:space-y-3 flex flex-col h-full min-h-0">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 w-full pb-2 border-b border-gray-100 px-2 md:px-0">
        
        <TabSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { id: 'pending', label: 'Pending', count: pendingDeliveries.length },
            { id: 'history', label: 'History', count: historyDeliveries.length }
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
          <PendingDelivery 
            data={orders} 
            filters={filters} 
            onSuccess={loadData}
          />
        ) : (
          <HistoryDelivery 
            data={orders} 
            filters={filters} 
          />
        )}
      </div>
    </div>
  );
}
