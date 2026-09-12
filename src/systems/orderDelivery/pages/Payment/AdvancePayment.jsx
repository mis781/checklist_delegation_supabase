import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { getReceivedOrders, getPaymentHistory, getDivisions } from '../../utils/storageManager';
import PendingAdvance from './PendingAdvance';
import HistoryAdvance from './HistoryAdvance';
import { TabSwitcher } from '../../components/StandardButtons';
import SearchableDropdown from '../../components/SearchableDropdown';

export default function AdvancePayment() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState({
    searchQuery: '',
    division: '',
  });

  const [orders, setOrders] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  const loadData = () => {
    setOrders(getReceivedOrders() || []);
    setDivisions(getDivisions() || []);
    setPaymentHistory(getPaymentHistory() || []);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const pendingAdvanceOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.advancePayment !== 'Yes') return false;
      
      const advancePaymentsForOrder = paymentHistory.filter(
        p => p.orderId === order.orderId && p.paymentType === 'Advance'
      );
      
      const totalPaid = advancePaymentsForOrder.reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
      const requiredAdvance = parseFloat(order.advanceAmount || 0);
      
      return totalPaid < requiredAdvance; // Only show if not fully paid
    }).map(order => {
      const advancePaymentsForOrder = paymentHistory.filter(p => p.orderId === order.orderId && p.paymentType === 'Advance');
      const totalPaid = advancePaymentsForOrder.reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
      const requiredAdvance = parseFloat(order.advanceAmount || 0);
      return {
        ...order,
        totalPaid,
        pendingAmount: requiredAdvance - totalPaid
      };
    });
  }, [orders, paymentHistory]);

  const historyAdvancePayments = useMemo(() => {
    // Return all advance payment transactions
    const advances = paymentHistory.filter(p => p.paymentType === 'Advance');
    // Map with order details
    return advances.filter(p => orders.some(o => o.orderId === p.orderId)).map(payment => {
      const order = orders.find(o => o.orderId === payment.orderId) || {};
      return {
        ...payment,
        partyName: order.partyName || '-',
        division: order.division || '-',
        poNumber: order.poNumber || '-',
        poImage: order.poImage || null
      };
    }).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }, [orders, paymentHistory]);

  const handleClearFilters = () => setFilters({ searchQuery: '', division: '' });

  const divisionOptions = useMemo(() =>
    divisions.map(d => ({ value: d.name, label: d.name }))
  , [divisions]);

  return (
    <div className="p-0 sm:p-1 md:p-3 space-y-2 md:space-y-3 flex flex-col h-full min-h-0">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 w-full pb-2 border-b border-gray-100 px-2 md:px-0">
        
        <TabSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { id: 'pending', label: 'Pending', count: pendingAdvanceOrders.length },
            { id: 'history', label: 'History', count: historyAdvancePayments.length }
          ]}
        />

        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center flex-1">
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input type="text" placeholder="Search..." value={filters.searchQuery}
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
          <PendingAdvance
            data={pendingAdvanceOrders} 
            filters={filters} 
            onSuccess={loadData}
          />
        ) : (
          <HistoryAdvance 
            data={historyAdvancePayments} 
            filters={filters} 
          />
        )}
      </div>
    </div>
  );
}
