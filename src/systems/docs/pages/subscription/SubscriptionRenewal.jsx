import { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  CreditCard,
  Building2,
  User,
  History,
  X,
  Calendar,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { subscriptionsApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import {
  formatCurrency,
  isExpiringSoon,
  isOverdue,
  getDaysUntil,
} from "../../utils/dateFormatter";

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

export default function SubscriptionRenewal() {
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'history'
  const [subscriptions, setSubscriptions] = useState([]);
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Renewal Action Modal State
  const [renewingSub, setRenewingSub] = useState(null);
  const [nextRenewalDate, setNextRenewalDate] = useState("");
  const [renewPrice, setRenewPrice] = useState("");
  const [renewRemarks, setRenewRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subs, history] = await Promise.all([
        subscriptionsApi.list(),
        subscriptionsApi.listRenewals(),
      ]);
      setSubscriptions(subs || []);
      setRenewalHistory(history || []);
    } catch (err) {
      console.error("Error loading renewal data:", err);
      toast.error("Failed to load subscription renewals");
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

  const upcomingRenewals = useMemo(() => {
    return subscriptions
      .filter((s) => s.status !== "Rejected")
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
      })
      .sort((a, b) => {
        if (!a.renewalDate) return 1;
        if (!b.renewalDate) return -1;
        return new Date(a.renewalDate) - new Date(b.renewalDate);
      });
  }, [subscriptions, searchQuery]);

  const filteredHistory = useMemo(() => {
    return renewalHistory.filter((item) => {
      const q = searchQuery.toLowerCase();
      const snText = item.subSn ? `sn-${item.subSn}` : item.sn ? `sn-${item.sn}` : "";
      return (
        !q ||
        item.subscriptionName?.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q) ||
        item.subscriberName?.toLowerCase().includes(q) ||
        item.renewedBy?.toLowerCase().includes(q) ||
        item.remarks?.toLowerCase().includes(q) ||
        snText.includes(q)
      );
    });
  }, [renewalHistory, searchQuery]);

  const handleOpenRenewModal = (sub) => {
    setRenewingSub(sub);
    setRenewPrice(sub.price || "");

    // Calculate default next renewal date based on frequency
    if (sub.renewalDate) {
      const d = new Date(sub.renewalDate);
      if (sub.frequency === "Monthly") d.setMonth(d.getMonth() + 1);
      else if (sub.frequency === "Quarterly") d.setMonth(d.getMonth() + 3);
      else if (sub.frequency === "Half-Yearly") d.setMonth(d.getMonth() + 6);
      else d.setFullYear(d.getFullYear() + 1);

      setNextRenewalDate(d.toISOString().split("T")[0]);
    } else {
      setNextRenewalDate("");
    }
    setRenewRemarks("");
  };

  const handleConfirmRenewal = async (e) => {
    e.preventDefault();
    if (!renewingSub) return;
    if (!nextRenewalDate) {
      toast.error("Please provide next renewal date");
      return;
    }

    try {
      setSaving(true);
      await subscriptionsApi.recordRenewal(renewingSub.id, {
        nextRenewalDate,
        price: Number(renewPrice) || renewingSub.price,
        remarks: renewRemarks,
      });

      toast.success(`Subscription cycle renewed for "${renewingSub.subscriptionName}"!`);
      setRenewingSub(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to record renewal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800/50">
            <RotateCcw className="h-5 w-5" />
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
          title="Refresh renewal desk"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Main Renewal Desk Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Subscription Cycles &amp; Renewals
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Prevent service interruptions by tracking upcoming recurring license renewals
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
                    ? "Search upcoming renewals..."
                    : "Search renewal logs..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                Upcoming Cycles ({upcomingRenewals.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Renewal Log ({filteredHistory.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Upcoming Renewals Table */}
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
                  <th className="px-4 py-3">CURRENT DUE DATE</th>
                  <th className="px-4 py-3">DAYS LEFT</th>
                  <th className="px-4 py-3">COST / CYCLE</th>
                  <th className="px-4 py-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                        <span>Loading renewal schedules...</span>
                      </div>
                    </td>
                  </tr>
                ) : upcomingRenewals.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No upcoming renewals
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          All subscription renewals are currently up to date.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  upcomingRenewals.map((sub, index) => {
                    const daysLeft = sub.renewalDate ? getDaysUntil(sub.renewalDate) : null;
                    const overdue = sub.renewalDate ? isOverdue(sub.renewalDate) : false;
                    const expiring = sub.renewalDate ? isExpiringSoon(sub.renewalDate, 30) : false;
                    const subNo = sub.sn
                      ? `SN-${String(sub.sn).padStart(3, "0")}`
                      : `SN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Action Column - Leftmost */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleOpenRenewModal(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Renew Cycle</span>
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
                            <CreditCard className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {sub.subscriptionName}
                            </span>
                          </div>
                        </td>

                        {/* Current Due Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDateDDMMYYYY(sub.renewalDate)}
                        </td>

                        {/* Days Left */}
                        <td className="px-4 py-3.5 font-mono font-semibold whitespace-nowrap text-xs">
                          {daysLeft !== null ? (
                            <span
                              className={
                                overdue
                                  ? "text-red-600 dark:text-red-400"
                                  : expiring
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft} days`}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Cost / Cycle */}
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(sub.price)}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            /{sub.frequency}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              overdue
                                ? "bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-950/50 dark:text-red-400"
                                : expiring
                                ? "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-400"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400"
                            }`}
                          >
                            {overdue ? "Overdue" : expiring ? "Due Soon" : "Active"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Renewal History Table */}
        {activeTab === "history" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">SUBSCRIPTION NO.</th>
                  <th className="px-4 py-3">COMPANY</th>
                  <th className="px-4 py-3">SUBSCRIBER</th>
                  <th className="px-4 py-3">SUBSCRIPTION</th>
                  <th className="px-4 py-3">PREVIOUS DUE DATE</th>
                  <th className="px-4 py-3">NEW CYCLE DUE DATE</th>
                  <th className="px-4 py-3">ADJUSTED COST</th>
                  <th className="px-4 py-3">RENEWED BY &amp; DATE</th>
                  <th className="px-4 py-3">REMARKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                        <span>Loading history...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="h-8 w-8 text-slate-400/50" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No subscription renewal logs recorded yet
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Renewed cycles will appear here.
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
                          {item.companyName || "-"}
                        </td>

                        {/* Subscriber */}
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.subscriberName || "-"}
                        </td>

                        {/* Subscription */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {item.subscriptionName}
                            </span>
                          </div>
                        </td>

                        {/* Previous Due Date */}
                        <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                          {formatDateDDMMYYYY(item.previousRenewalDate)}
                        </td>

                        {/* New Cycle Due Date */}
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-[11px]">
                          {formatDateDDMMYYYY(item.newRenewalDate)}
                        </td>

                        {/* Adjusted Cost */}
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {item.renewPrice ? formatCurrency(item.renewPrice) : "-"}
                        </td>

                        {/* Renewed By & Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-slate-900 dark:text-slate-100 font-medium">
                            {item.renewedBy}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatDateDDMMYYYY(item.renewedAt)}
                          </div>
                        </td>

                        {/* Remarks */}
                        <td
                          className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate"
                          title={item.remarks}
                        >
                          {item.remarks || "-"}
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

      {/* Renewal Modal */}
      {renewingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800/50">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Renew Subscription Cycle
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    {renewingSub.subscriptionName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenewingSub(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Summary Card */}
            <div className="px-6 pt-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Subscription</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {renewingSub.subscriptionName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Subscriber</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                    {renewingSub.subscriberName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Company</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                    {renewingSub.companyName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Expiry</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400 block">
                    {formatDateDDMMYYYY(renewingSub.renewalDate)}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmRenewal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Next Cycle Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={nextRenewalDate}
                  onChange={(e) => setNextRenewalDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Renewed Cycle Price (₹)
                </label>
                <input
                  type="number"
                  value={renewPrice}
                  onChange={(e) => setRenewPrice(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Renewal Remarks / Notes
                </label>
                <textarea
                  value={renewRemarks}
                  onChange={(e) => setRenewRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Plan renewed with 10% annual vendor discount"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRenewingSub(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{saving ? "Updating..." : "Confirm Next Cycle"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
