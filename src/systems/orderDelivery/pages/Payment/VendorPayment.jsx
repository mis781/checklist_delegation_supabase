import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RotateCcw, CreditCard } from 'lucide-react';
import { getReceivedOrders, getPaymentHistory, getDivisions, getInvoiceHistory, getConfirmDeliveryHistory } from '../../utils/storageManager';
import PendingVendor from './PendingVendor';
import HistoryVendor from './HistoryVendor';
import BatchVendorPayment from './BatchVendorPayment';
import { TabSwitcher } from '../../components/StandardButtons';
import SearchableDropdown from '../../components/SearchableDropdown';

export default function VendorPayment() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showBatchPayment, setShowBatchPayment] = useState(false);

  const [filters, setFilters] = useState({
    searchQuery: '',
    division: '',
  });

  const [orders, setOrders] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [confirmHistory, setConfirmHistory] = useState([]);

  const loadData = () => {
    setOrders(getReceivedOrders() || []);
    setDivisions(getDivisions() || []);
    setPaymentHistory(getPaymentHistory() || []);
    setInvoiceHistory(getInvoiceHistory() || []);
    setConfirmHistory(getConfirmDeliveryHistory() || []);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const pendingVendorOrders = useMemo(() => {
    return orders.map(order => {
      const orderInvoices = invoiceHistory.filter(inv => inv.orderId === order.orderId);
      
      const uniqueInvoices = [];
      const seen = new Set();
      let invoiceDate = '-';
      let invoiceNumber = '-';
      let invoiceImage = null;

      for (const inv of orderInvoices) {
        if (inv.invoiceNumber && !seen.has(inv.invoiceNumber)) {
          seen.add(inv.invoiceNumber);
          uniqueInvoices.push(parseFloat(inv.invoiceAmount || 0));
          invoiceDate = inv.invoiceDate || invoiceDate;
          invoiceNumber = inv.invoiceNumber || invoiceNumber;
          invoiceImage = inv.invoiceImage || invoiceImage;
        }
      }
      const totalInvoicedValue = uniqueInvoices.reduce((sum, val) => sum + val, 0);

      // A product line confirmed with a delivery Shortage wasn't actually received
      // in full — deduct that shorted qty's value (qty × rate) from what's owed to
      // the vendor, whether the payable amount came from the invoice or fell back
      // to the raw PO value.
      const shortageValue = orderInvoices.reduce((sum, inv) => {
        const cd = confirmHistory.find(ch => ch.dispatchId === inv.dispatchId);
        if (cd?.shortage === 'Yes') {
          const originalProduct = order.items?.find(p => 
            p.productNumber === (inv.productNumber || cd.productNumber) ||
            p.productName === (inv.productName || cd.productName)
          );
          const rate = parseFloat(inv.priceRate || cd.priceRate || originalProduct?.priceRate || originalProduct?.price_rate || 0);
          return sum + (parseFloat(cd.shortageQty) || 0) * rate;
        }
        return sum;
      }, 0);

      // If an invoice exists, use invoiced value. Otherwise fallback to original PO value.
      const grossPOValue = totalInvoicedValue > 0 ? totalInvoicedValue : parseFloat(order.totalPOValue || 0);
      const effectivePOValue = Math.max(0, grossPOValue - shortageValue);

      return { ...order, orderInvoices, grossPOValue, effectivePOValue, shortageValue, invoiceDate, invoiceNumber, invoiceImage };
    }).filter(order => {
      // Vendor Payment only becomes payable once the order has actually reached the
      // customer — i.e. every invoiced item is confirmed 'Delivered'. An order with no
      // invoice yet, or with any item still short of that, isn't ready for Vendor Payment.
      const orderFullyDelivered = order.orderInvoices.length > 0 && order.orderInvoices.every(invoiceItem => {
        const cd = confirmHistory.find(ch => ch.dispatchId === invoiceItem.dispatchId);
        return cd && cd.deliveryStatus === 'Delivered';
      });
      if (!orderFullyDelivered) return false;

      const vendorPayments = paymentHistory.filter(
        p => p.orderId === order.orderId && p.paymentType === 'Vendor'
      );
      const totalVendorPaid = vendorPayments.reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);

      const remainingBalance = order.effectivePOValue - totalVendorPaid;

      return remainingBalance > 0;
    }).map(order => {
      const advancePayments = paymentHistory.filter(p => p.orderId === order.orderId && p.paymentType === 'Advance');
      const vendorPayments = paymentHistory.filter(p => p.orderId === order.orderId && p.paymentType === 'Vendor');
      
      const totalAdvancePaid = advancePayments.reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
      const totalVendorPaid = vendorPayments.reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
      const pending = order.effectivePOValue - totalVendorPaid;

      return {
        ...order,
        totalAdvancePaid,
        totalVendorPaid,
        pendingAmount: pending
      };
    });
  }, [orders, paymentHistory, invoiceHistory, confirmHistory]);

  const historyVendorPayments = useMemo(() => {
    const vendors = paymentHistory.filter(p => p.paymentType === 'Vendor');
    return vendors.filter(p => orders.some(o => o.orderId === p.orderId)).map(payment => {
      const order = orders.find(o => o.orderId === payment.orderId) || {};
      const orderInvoices = invoiceHistory.filter(inv => inv.orderId === payment.orderId);
      const latestInvoice = orderInvoices[orderInvoices.length - 1] || {};

      return {
        ...payment,
        partyName: order.partyName || '-',
        division: order.division || '-',
        poNumber: order.poNumber || '-',
        expectedDeliveryDate: order.expectedDeliveryDate || '-',
        poImage: order.poImage || null,
        invoiceNumber: latestInvoice.invoiceNumber || '-',
        invoiceDate: latestInvoice.invoiceDate || '-',
        invoiceAmount: latestInvoice.invoiceAmount || null,
        invoiceImage: latestInvoice.invoiceImage || null
      };
    }).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }, [orders, paymentHistory, invoiceHistory]);

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
            { id: 'pending', label: 'Pending', count: pendingVendorOrders.length },
            { id: 'history', label: 'History', count: historyVendorPayments.length }
          ]}
        />

        <button
          onClick={() => setShowBatchPayment(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm shrink-0 h-[32px] md:h-[38px]"
        >
          <CreditCard size={16} /> Payment
        </button>

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
          <PendingVendor
            data={pendingVendorOrders} 
            filters={filters} 
            onSuccess={loadData}
          />
        ) : (
          <HistoryVendor 
            data={historyVendorPayments} 
            filters={filters} 
          />
        )}
      </div>

      {showBatchPayment && (
        <BatchVendorPayment
          pendingOrders={pendingVendorOrders}
          onClose={() => setShowBatchPayment(false)}
          onSuccess={() => {
            setShowBatchPayment(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
