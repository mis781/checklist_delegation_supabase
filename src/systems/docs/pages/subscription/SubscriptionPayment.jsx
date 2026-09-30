import { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  CheckCircle2,
  Clock,
  Search,
  CreditCard,
  Building2,
  User,
  History,
  Receipt,
  X,
  Send,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { subscriptionsApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import { formatCurrency } from "../../utils/dateFormatter";

// Helper for DD/MM/YYYY formatting
const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const PAYMENT_MODES = [
  "Corporate Credit Card",
  "Net Banking / NEFT",
  "RTGS",
  "UPI / Auto-Debit",
  "Cheque / DD",
  "Debit Card",
];

export default function SubscriptionPayment() {
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'history'
  const [subscriptions, setSubscriptions] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Payment Recording Modal State
  const [payingSub, setPayingSub] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("Corporate Credit Card");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subs, history] = await Promise.all([
        subscriptionsApi.list(),
        subscriptionsApi.listPayments(),
      ]);
      setSubscriptions(subs || []);
      setPaymentHistory(history || []);
    } catch (err) {
      console.error("Error loading payment data:", err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleChange = () => loadData();
    window.addEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
  }, []);

  const pendingPayments = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === "Approved")
      .filter((s) => {
        const q = searchQuery.toLowerCase();
        const snText = s.sn ? `sn-${s.sn}` : "";
        return (
          !q ||
          s.subscriptionName?.toLowerCase().includes(q) ||
          s.serviceName?.toLowerCase().includes(q) ||
          s.subscriberName?.toLowerCase().includes(q) ||
          s.companyName?.toLowerCase().includes(q) ||
          s.frequency?.toLowerCase().includes(q) ||
          snText.includes(q)
        );
      });
  }, [subscriptions, searchQuery]);

  const filteredHistory = useMemo(() => {
    return paymentHistory.filter((item) => {
      const q = searchQuery.toLowerCase();
      const snText = item.subSn ? `sn-${item.subSn}` : item.sn ? `sn-${item.sn}` : "";
      return (
        !q ||
        item.subscriptionName?.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q) ||
        item.subscriberName?.toLowerCase().includes(q) ||
        item.transactionRef?.toLowerCase().includes(q) ||
        item.paymentMode?.toLowerCase().includes(q) ||
        item.recordedBy?.toLowerCase().includes(q) ||
        snText.includes(q)
      );
    });
  }, [paymentHistory, searchQuery]);

  const handleOpenPayModal = (sub) => {
    setPayingSub(sub);
    setPaymentAmount(sub.price || "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("Corporate Credit Card");
    setTransactionRef("");
    setPaymentRemarks("");
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payingSub) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    try {
      setSaving(true);
      await subscriptionsApi.pay(payingSub.id, {
        amountPaid: Number(paymentAmount),
        paymentDate,
        paymentMode,
        transactionRef,
        remarks: paymentRemarks,
      });

      toast.success(
        `Payment of ${formatCurrency(paymentAmount)} recorded for "${payingSub.subscriptionName}"!`
      );
      setPayingSub(null);
      loadData();
    } catch (err) {
      console.error("Error recording payment:", err);
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Document &amp; Subscription Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Platform <span className="text-slate-400 mx-1">›</span> Doc &amp; Subscription
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Refresh payment desk"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Main Desk Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Subscription Payment Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Disburse approved software invoices, capture UTR references, and log expenditure
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "pending"
                    ? "Search approved services..."
                    : "Search payment logs by service, UTR..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Tab Pill Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "pending"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Awaiting Payment ({pendingPayments.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Payment Log ({filteredHistory.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Awaiting Payment Table */}
        {activeTab === "pending" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-28">ACTION</th>
                  <th className="px-4 py-3">SUBSCRIPTION NO.</th>
                  <th className="px-4 py-3">COMPANY</th>
                  <th className="px-4 py-3">SUBSCRIBER</th>
                  <th className="px-4 py-3">SUBSCRIPTION</th>
                  <th className="px-4 py-3">AMOUNT DUE</th>
                  <th className="px-4 py-3">BILLING CYCLE</th>
                  <th className="px-4 py-3">APPROVED ON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span>Loading payment queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No pending approved payments
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          All approved subscription invoices have been settled.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingPayments.map((sub, index) => {
                    const subNo = sub.sn
                      ? `SN-${String(sub.sn).padStart(3, "0")}`
                      : `SN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Action */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleOpenPayModal(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            <span>Record Payment</span>
                          </button>
                        </td>

                        {/* Subscription No */}
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {subNo}
                        </td>

                        {/* Company */}
                        <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {sub.companyName}
                        </td>

                        {/* Subscriber */}
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {sub.subscriberName}
                        </td>

                        {/* Subscription */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {sub.subscriptionName}
                            </span>
                          </div>
                        </td>

                        {/* Amount Due */}
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(sub.price)}
                        </td>

                        {/* Billing Cycle */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {sub.frequency}
                          </span>
                        </td>

                        {/* Approved On */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {formatDateDDMMYYYY(sub.approvedAt || sub.updatedAt || sub.requestedDate)}
                          </span>
                          {sub.approvedBy && (
                            <span className="block text-[10px] text-slate-400">
                              by {sub.approvedBy}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Payment Log Table */}
        {activeTab === "history" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">SUBSCRIPTION NO.</th>
                  <th className="px-4 py-3">COMPANY</th>
                  <th className="px-4 py-3">SUBSCRIBER</th>
                  <th className="px-4 py-3">SUBSCRIPTION</th>
                  <th className="px-4 py-3">AMOUNT PAID</th>
                  <th className="px-4 py-3">BILLING CYCLE</th>
                  <th className="px-4 py-3">PAYMENT MODE</th>
                  <th className="px-4 py-3">TXN / UTR REFERENCE</th>
                  <th className="px-4 py-3">PAYMENT DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span>Loading payment logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="h-8 w-8 text-slate-400/50" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No payment transactions recorded yet
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Transactions will appear here after recording payments.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item, index) => {
                    const subNo = item.subSn
                      ? `SN-${String(item.subSn).padStart(3, "0")}`
                      : item.sn
                      ? `SN-${String(item.sn).padStart(3, "0")}`
                      : "-";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Subscription No */}
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {subNo}
                        </td>

                        {/* Company */}
                        <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {item.companyName}
                        </td>

                        {/* Subscriber */}
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.subscriberName || "-"}
                        </td>

                        {/* Subscription */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {item.subscriptionName}
                            </span>
                          </div>
                        </td>

                        {/* Amount Paid */}
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(item.amountPaid)}
                        </td>

                        {/* Billing Cycle */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.frequency || "Monthly"}
                          </span>
                        </td>

                        {/* Payment Mode */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {item.paymentMode}
                          </span>
                        </td>

                        {/* Txn / UTR Reference */}
                        <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                          {item.transactionRef || "-"}
                        </td>

                        {/* Payment Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDateDDMMYYYY(item.paymentDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Entry Modal */}
      {payingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/50">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Subscription Payment
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    {payingSub.subscriptionName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayingSub(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Info Summary Card */}
            <div className="px-6 pt-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Subscription</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {payingSub.subscriptionName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Subscriber</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                    {payingSub.subscriberName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Company</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                    {payingSub.companyName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Approved Cost</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                    {formatCurrency(payingSub.price)} ({payingSub.frequency})
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Amount Paid (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. TXN-HDFC-991823 / UTR-001928"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Payment Remarks
                </label>
                <textarea
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Auto-debited from primary operating account"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingSub(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>{saving ? "Recording..." : "Record Payment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
