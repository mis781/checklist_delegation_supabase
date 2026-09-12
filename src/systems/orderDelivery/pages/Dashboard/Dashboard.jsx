import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Package, TrendingUp, Users, ShoppingBag, RotateCcw,
  Calendar, CheckCircle2, Clock, Receipt, FileText, IndianRupee, Truck, ShieldCheck, Factory, Banknote, MapPin
} from 'lucide-react';
import {
  getReceivedOrders, getDivisions, getDeliveryHistory, getDispatchHistory,
  getPackagingHistory, getLogisticHistory, getCallanHistory, getInvoiceHistory,
  getConfirmDeliveryHistory, getPaymentHistory, getAgencyHistory, getDispatchQtyForDeliveryApproverId
} from '../../utils/storageManager';
import { formatDate } from '../../utils/helpers';
import SearchableDropdown from '../../components/SearchableDropdown';

const inr = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const StatTile = ({ icon: Icon, label, value, tone = 'indigo', subtitle }) => {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-100 text-gray-600'
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-center relative overflow-hidden group">
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-black text-gray-900 truncate">{value}</p>
            {subtitle && <span className="text-[10px] text-gray-400 font-medium truncate">{subtitle}</span>}
          </div>
        </div>
      </div>
      <div className={`absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 ${tones[tone].split(' ')[1]}`}>
        <Icon size={80} />
      </div>
    </div>
  );
};

const SectionCard = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${className}`}>
    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2 shrink-0">
      {Icon && <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-600 border border-gray-100"><Icon size={14} /></div>}
      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-3">
      {children}
    </div>
  </div>
);

const MiniStat = ({ label, value, color = 'indigo' }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    <span className={`text-sm font-black text-${color}-600`}>{value}</span>
  </div>
);

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [packagingHistory, setPackagingHistory] = useState([]);
  const [logisticHistory, setLogisticHistory] = useState([]);
  const [callanHistory, setCallanHistory] = useState([]);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [confirmHistory, setConfirmHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [agencyHistory, setAgencyHistory] = useState([]);

  const [filters, setFilters] = useState({ division: '', partyName: '', fromDate: '', toDate: '' });

  const loadData = () => {
    setOrders(getReceivedOrders() || []);
    setDivisions(getDivisions() || []);
    setDeliveryHistory(getDeliveryHistory() || []);
    setDispatchHistory(getDispatchHistory() || []);
    setPackagingHistory(getPackagingHistory() || []);
    setLogisticHistory(getLogisticHistory() || []);
    setCallanHistory(getCallanHistory() || []);
    setInvoiceHistory(getInvoiceHistory() || []);
    setConfirmHistory(getConfirmDeliveryHistory() || []);
    setPaymentHistory(getPaymentHistory() || []);
    setAgencyHistory(getAgencyHistory() || []);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    window.addEventListener('focus', loadData);
    return () => { clearInterval(interval); window.removeEventListener('focus', loadData); };
  }, []);

  const handleClearFilters = () => setFilters({ division: '', partyName: '', fromDate: '', toDate: '' });

  const divisionOptions = useMemo(() => divisions.map(d => ({ value: d.name, label: d.name })), [divisions]);
  const partyOptions = useMemo(() => [...new Set(orders.map(o => o.partyName).filter(Boolean))].sort().map(p => ({ value: p, label: p })), [orders]);

  // Apply filters to core orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filters.division && order.division !== filters.division) return false;
      if (filters.partyName && order.partyName !== filters.partyName) return false;
      if (filters.fromDate && order.poDate < filters.fromDate) return false;
      if (filters.toDate && order.poDate > filters.toDate) return false;
      return true;
    });
  }, [orders, filters]);

  const filteredOrderIds = useMemo(() => new Set(filteredOrders.map(o => o.orderId)), [filteredOrders]);

  // Aggregations
  const stats = useMemo(() => {
    const s = {
      totalOrders: filteredOrders.length,
      totalPOValue: 0,
      
      // Validation & Check For Delivery
      pendingValidation: 0,
      validated: 0,
      pendingCheckForDelivery: 0,
      checkedForDelivery: 0,

      // Production
      pendingProduction: 0,
      produced: 0,

      // Dispatch & Packaging
      pendingDispatch: 0,
      dispatched: 0,
      pendingPackaging: 0,
      packaged: 0,

      // Logistics
      logisticsAssigned: 0,
      callansGenerated: 0,

      // Invoice & Delivery
      invoicesGenerated: 0,
      totalInvoicedValue: 0,
      delivered: 0,

      // Payments
      totalAdvanceRequired: 0,
      totalAdvancePaid: 0,
      totalVendorPaid: 0,
      totalFreightExpected: 0,
      totalFreightPaid: 0,
    };

    filteredOrders.forEach(order => {
      s.totalPOValue += parseFloat(order.totalPOValue) || 0;
      s.totalAdvanceRequired += parseFloat(order.advanceAmount) || 0;

      // Delivery history for this order
      const orderDeliv = deliveryHistory.filter(h => h.orderId === order.orderId);

      if (!order.isChecked) {
        s.pendingValidation++;
      } else {
        s.validated++;
        if (orderDeliv.length === 0) s.pendingCheckForDelivery++;
        else s.checkedForDelivery++;
      }
      
      // Production
      orderDeliv.forEach(deliv => {
        if (deliv.stockStatus === 'No Stock') {
          if (deliv.produced) s.produced++;
          else s.pendingProduction++;
        }
      });

      // Dispatch
      const orderDisp = dispatchHistory.filter(h => h.orderId === order.orderId);
      s.dispatched += orderDisp.length;

      // Un-dispatched in-stock items
      orderDeliv.forEach(deliv => {
        if (deliv.stockStatus === 'In Stock' || (deliv.stockStatus === 'No Stock' && deliv.produced)) {
          const dispatchedQty = getDispatchQtyForDeliveryApproverId(orderDisp, deliv.deliveryApproverId, 'dispatchQty')
            + getDispatchQtyForDeliveryApproverId(orderDisp, deliv.deliveryApproverId, 'cancelQty');
          const available = parseFloat(deliv.approveQty) || 0;
          if (available - dispatchedQty > 0) s.pendingDispatch++;
        }
      });

      // Packaging
      const orderPack = packagingHistory.filter(h => h.orderId === order.orderId);
      s.packaged += orderPack.length;
      
      orderDisp.forEach(disp => {
        const isPackaged = orderPack.some(p => p.dispatchId === disp.dispatchId && p.packagingStatus === 'Yes');
        if (!isPackaged) s.pendingPackaging++;
      });

      // Logistics & Callan
      const orderLog = logisticHistory.filter(h => h.orderId === order.orderId);
      s.logisticsAssigned += orderLog.length;

      const orderCal = callanHistory.filter(h => h.orderId === order.orderId);
      s.callansGenerated += orderCal.length;

      // Invoices
      const orderInv = invoiceHistory.filter(h => h.orderId === order.orderId);
      s.invoicesGenerated += orderInv.length;
      orderInv.forEach(inv => {
        s.totalInvoicedValue += parseFloat(inv.invoiceAmount) || 0;
      });

      // Delivered
      const orderDelivered = confirmHistory.filter(h => h.orderId === order.orderId && h.deliveryStatus === 'Delivered');
      s.delivered += orderDelivered.length;
    });

    // Payments specific
    paymentHistory.forEach(p => {
      if (!filteredOrderIds.has(p.orderId)) return;
      const amt = parseFloat(p.amountPaid) || 0;
      if (p.paymentType === 'Advance') s.totalAdvancePaid += amt;
      if (p.paymentType === 'Vendor') s.totalVendorPaid += amt;
      if (p.paymentType === 'Freight') s.totalFreightPaid += amt;
    });

    logisticHistory.forEach(a => {
      if (!filteredOrderIds.has(a.orderId)) return;
      s.totalFreightExpected += parseFloat(a.transporterAmount) || 0;
    });

    return s;
  }, [filteredOrders, deliveryHistory, dispatchHistory, packagingHistory, logisticHistory, callanHistory, invoiceHistory, confirmHistory, paymentHistory, agencyHistory, filteredOrderIds]);

  const pendingAdvance = Math.max(0, stats.totalAdvanceRequired - stats.totalAdvancePaid);
  const pendingVendor = Math.max(0, stats.totalPOValue - stats.totalAdvancePaid - stats.totalVendorPaid);
  const pendingFreight = Math.max(0, stats.totalFreightExpected - stats.totalFreightPaid);
  const totalPendingPayments = pendingAdvance + pendingVendor + pendingFreight;

  // Top 5 High Value Orders
  const topOrders = [...filteredOrders]
    .sort((a, b) => (parseFloat(b.totalPOValue) || 0) - (parseFloat(a.totalPOValue) || 0))
    .slice(0, 5);

  const topParties = useMemo(() => {
    const map = {};
    filteredOrders.forEach(order => {
      const key = order.partyName || 'Unknown';
      if (!map[key]) map[key] = { partyName: key, orderCount: 0, totalValue: 0 };
      map[key].orderCount += 1;
      map[key].totalValue += parseFloat(order.totalPOValue) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
  }, [filteredOrders]);

  const topProducts = useMemo(() => {
    const map = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.productName || 'Unknown';
        if (!map[key]) map[key] = { productName: key, uom: item.uom || '-', timesOrdered: 0, totalQty: 0, totalValue: 0 };
        map[key].timesOrdered += 1;
        map[key].totalQty += parseFloat(item.qty) || 0;
        map[key].totalValue += parseFloat(item.totalValue) || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
  }, [filteredOrders]);

  const scopedInvoices = useMemo(() =>
    invoiceHistory.filter(inv => filteredOrderIds.has(inv.orderId)).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate)).slice(0, 10)
  , [invoiceHistory, filteredOrderIds]);

  const scopedCallans = useMemo(() =>
    callanHistory.filter(c => filteredOrderIds.has(c.orderId)).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 10)
  , [callanHistory, filteredOrderIds]);

  const orderById = (orderId) => orders.find(o => o.orderId === orderId) || {};


  return (
    <div className="p-2 sm:p-3 md:p-6 space-y-4 md:space-y-6 h-full min-h-0 overflow-y-auto bg-slate-50/50 custom-scrollbar">
      
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight">Command Center</h1>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Global Operations Dashboard</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="w-full sm:w-40">
            <SearchableDropdown options={divisionOptions} value={filters.division}
              onChange={(val) => setFilters({ ...filters, division: val })}
              placeholder="All Divisions" className="h-[34px] text-xs" />
          </div>
          <div className="w-full sm:w-48">
            <SearchableDropdown options={partyOptions} value={filters.partyName}
              onChange={(val) => setFilters({ ...filters, partyName: val })}
              placeholder="All Parties" className="h-[34px] text-xs" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-32 relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-[11px] font-bold focus:outline-none focus:border-indigo-500 h-[34px]" />
            </div>
            <div className="flex-1 sm:w-32 relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-[11px] font-bold focus:outline-none focus:border-indigo-500 h-[34px]" />
            </div>
            <button onClick={handleClearFilters}
              className="flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg w-[34px] h-[34px] hover:bg-gray-200 transition-colors" title="Clear Filters">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatTile icon={ShoppingBag} label="Total Orders" value={stats.totalOrders} tone="indigo" />
        <StatTile icon={IndianRupee} label="Total PO Value" value={inr(stats.totalPOValue)} tone="emerald" />
        <StatTile icon={FileText} label="Total Invoiced" value={inr(stats.totalInvoicedValue)} tone="indigo" />
        <StatTile icon={Banknote} label="Pending Payments" value={inr(totalPendingPayments)} tone="red" subtitle="Advance + Vendor + Freight" />
      </div>

      {/* Order Pipeline Breakdown */}
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mt-6 mb-2 border-b border-gray-200 pb-2">Order Pipeline Breakdown</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Received Order</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100" title="Total">T: {stats.totalOrders}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{width: `100%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Check & Validation</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {stats.pendingValidation}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.validated}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (stats.pendingValidation / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Stock Verification</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {stats.pendingCheckForDelivery}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.checkedForDelivery}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (stats.pendingCheckForDelivery / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Production Planning</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {stats.pendingProduction}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.produced}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (stats.pendingProduction / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dispatch Planning</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {stats.pendingDispatch}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.dispatched}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (stats.pendingDispatch / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Packaging</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {stats.pendingPackaging}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.packaged}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (stats.pendingPackaging / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Vehicle Logistic</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {Math.max(0, stats.totalOrders - stats.logisticsAssigned)}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.logisticsAssigned}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (Math.max(0, stats.totalOrders - stats.logisticsAssigned) / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Make Challan</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {Math.max(0, stats.totalOrders - stats.callansGenerated)}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.callansGenerated}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (Math.max(0, stats.totalOrders - stats.callansGenerated) / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Make Invoice</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {Math.max(0, stats.totalOrders - stats.invoicesGenerated)}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.invoicesGenerated}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (Math.max(0, stats.totalOrders - stats.invoicesGenerated) / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Confirm Delivery</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Pending">P: {Math.max(0, stats.totalOrders - stats.delivered)}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Completed">C: {stats.delivered}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (Math.max(0, stats.totalOrders - stats.delivered) / (stats.totalOrders || 1)) * 100)}%`}}></div></div>
          </div>
          <div className="flex flex-col space-y-1 md:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Payments</span>
              <span className="text-sm font-black text-red-600">{inr(totalPendingPayments)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (totalPendingPayments / ((stats.totalPOValue + stats.totalFreightExpected) || 1)) * 100)}%`}}></div></div>
          </div>
        </div>
      </div>

      {/* Payments Hub */}
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mt-6 mb-2 border-b border-gray-200 pb-2">Payments Breakdown</h2>
      <div className="mb-6">
        <SectionCard title="Payments Hub" icon={Banknote} className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full content-start pt-2">
            
            <div className="flex flex-col space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Advance Payments</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-gray-500 font-medium">Total:</span>
                  <span className="font-bold text-gray-700">{inr(stats.totalAdvanceRequired)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-gray-500 font-medium">Paid:</span>
                  <span className="font-bold text-emerald-600">{inr(stats.totalAdvancePaid)}</span>
                </div>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs text-gray-600 font-medium">Pending:</span>
                <span className="text-sm font-black text-amber-600">{inr(pendingAdvance)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (stats.totalAdvancePaid / (stats.totalAdvanceRequired || 1)) * 100)}%`}}></div></div>
            </div>

            <div className="flex flex-col space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vendor Payments</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-gray-500 font-medium">Total:</span>
                  <span className="font-bold text-gray-700">{inr(stats.totalPOValue)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-gray-500 font-medium">Paid:</span>
                  <span className="font-bold text-emerald-600">{inr(stats.totalVendorPaid + stats.totalAdvancePaid)}</span>
                </div>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs text-gray-600 font-medium">Pending:</span>
                <span className="text-sm font-black text-red-600">{inr(pendingVendor)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{width: `${Math.min(100, ((stats.totalVendorPaid + stats.totalAdvancePaid) / (stats.totalPOValue || 1)) * 100)}%`}}></div></div>
            </div>

            <div className="flex flex-col space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Freight Payments</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-gray-500 font-medium">Total:</span>
                  <span className="font-bold text-gray-700">{inr(stats.totalFreightExpected)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-gray-500 font-medium">Paid:</span>
                  <span className="font-bold text-emerald-600">{inr(stats.totalFreightPaid)}</span>
                </div>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs text-gray-600 font-medium">Pending:</span>
                <span className="text-sm font-black text-indigo-600">{inr(pendingFreight)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (stats.totalFreightPaid / (stats.totalFreightExpected || 1)) * 100)}%`}}></div></div>
            </div>

          </div>
        </SectionCard>
      </div>

      {/* Highlights */}
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mt-6 mb-2 border-b border-gray-200 pb-2">Business Highlights</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6">
        <SectionCard title="Highest Value Orders" icon={TrendingUp} className="h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 font-bold">Order ID</th>
                <th className="px-3 py-2 font-bold">Party Name</th>
                <th className="px-3 py-2 font-bold text-center">Date</th>
                <th className="px-3 py-2 font-bold text-right">PO Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topOrders.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400 font-medium">No orders found</td></tr>
              ) : topOrders.map(order => (
                <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-[11px] font-bold text-indigo-600">{order.orderId}</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-gray-800">{order.partyName}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-500 text-center font-medium">{formatDate(order.poDate)}</td>
                  <td className="px-3 py-2 text-[11px] text-emerald-600 font-black text-right">{inr(order.totalPOValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Recent Payment Activity" icon={Banknote} className="h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 font-bold">Order ID</th>
                <th className="px-3 py-2 font-bold">Type</th>
                <th className="px-3 py-2 font-bold text-center">Date</th>
                <th className="px-3 py-2 font-bold text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentHistory.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400 font-medium">No recent payments</td></tr>
              ) : [...paymentHistory].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 5).map((pay, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-[11px] font-bold text-indigo-600">{pay.orderId}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">
                    <span className={`px-2 py-0.5 rounded uppercase tracking-wider ${
                      pay.paymentType === 'Advance' ? 'bg-amber-100 text-amber-700' :
                      pay.paymentType === 'Vendor' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {pay.paymentType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-500 text-center font-medium">{formatDate(pay.paymentDate)}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-900 font-black text-right">{inr(pay.amountPaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* Detailed Tables Feed */}
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mt-6 mb-2 border-b border-gray-200 pb-2">Detailed Reports</h2>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
        <SectionCard title="Top 10 Parties (by PO Value)" icon={Users} className="h-[360px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 font-bold">#</th>
                <th className="px-3 py-2 font-bold">Party Name</th>
                <th className="px-3 py-2 font-bold text-center">Orders</th>
                <th className="px-3 py-2 font-bold text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topParties.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400">No data</td></tr>
              ) : topParties.map((p, idx) => (
                <tr key={p.partyName} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 text-[11px] text-gray-400 font-bold">{idx + 1}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-800 font-bold">{p.partyName}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-600 text-center">{p.orderCount}</td>
                  <td className="px-3 py-2 text-[11px] text-emerald-600 font-black text-right">{inr(p.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Top 10 Products (by Value)" icon={Package} className="h-[360px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 font-bold">#</th>
                <th className="px-3 py-2 font-bold">Product Name</th>
                <th className="px-3 py-2 font-bold text-center">UOM</th>
                <th className="px-3 py-2 font-bold text-center">Qty</th>
                <th className="px-3 py-2 font-bold text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topProducts.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-400">No data</td></tr>
              ) : topProducts.map((p, idx) => (
                <tr key={p.productName} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 text-[11px] text-gray-400 font-bold">{idx + 1}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-800 font-bold">{p.productName}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-500 text-center font-medium">{p.uom}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-600 text-center font-bold">{p.totalQty}</td>
                  <td className="px-3 py-2 text-[11px] text-emerald-600 font-black text-right">{inr(p.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6">
        <SectionCard title="Recent Invoices" icon={FileText} className="h-[340px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 font-bold">Order ID</th>
                <th className="px-3 py-2 font-bold">Invoice No</th>
                <th className="px-3 py-2 font-bold text-center">Date</th>
                <th className="px-3 py-2 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scopedInvoices.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400">No invoices yet</td></tr>
              ) : scopedInvoices.map((inv, idx) => (
                <tr key={inv.id || idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 text-[11px] font-bold text-indigo-600 whitespace-nowrap">{inv.orderId}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-800 font-bold whitespace-nowrap">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-500 font-medium text-center whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-3 py-2 text-[11px] text-emerald-600 font-black text-right whitespace-nowrap">{inr(inv.invoiceAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Recent Challans" icon={Receipt} className="h-[340px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 font-bold">Order ID</th>
                <th className="px-3 py-2 font-bold">Challan No</th>
                <th className="px-3 py-2 font-bold">Party Name</th>
                <th className="px-3 py-2 font-bold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scopedCallans.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400">No challans yet</td></tr>
              ) : scopedCallans.map((c, idx) => (
                <tr key={c.id || idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 text-[11px] font-bold text-indigo-600 whitespace-nowrap">{c.orderId}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-800 font-bold whitespace-nowrap">{c.callanNo}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-700 whitespace-nowrap font-medium">{orderById(c.orderId).partyName || '-'}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-500 max-w-[200px] truncate" title={c.callanRemarks}>{c.callanRemarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

    </div>
  );
}
