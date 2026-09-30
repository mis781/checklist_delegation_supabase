import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Wallet,
  Building2,
  Trash2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { subscriptionsApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import { formatCurrency } from "../../utils/dateFormatter";
import AddSubscriptionModal from "./AddSubscriptionModal";

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

export default function AllSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedFrequency, setSelectedFrequency] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionsApi.list();
      setSubscriptions(data || []);
    } catch (err) {
      console.error("Error loading subscriptions:", err);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    const handleChange = () => loadSubscriptions();
    window.addEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
  }, []);

  const handleDelete = async (sub) => {
    if (!window.confirm(`Are you sure you want to delete subscription "${sub.subscriptionName}"?`)) {
      return;
    }
    try {
      await subscriptionsApi.remove(sub.id);
      toast.success("Subscription deleted successfully");
      loadSubscriptions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete subscription");
    }
  };

  const companies = useMemo(() => {
    const set = new Set(subscriptions.map((s) => s.companyName).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        sub.subscriptionName?.toLowerCase().includes(q) ||
        sub.serviceName?.toLowerCase().includes(q) ||
        sub.subscriberName?.toLowerCase().includes(q) ||
        sub.companyName?.toLowerCase().includes(q) ||
        sub.purpose?.toLowerCase().includes(q);

      const matchesStatus = selectedStatus === "All" || sub.status === selectedStatus;
      const matchesFreq = selectedFrequency === "All" || sub.frequency === selectedFrequency;
      const matchesCo = selectedCompany === "All" || sub.companyName === selectedCompany;

      return matchesSearch && matchesStatus && matchesFreq && matchesCo;
    });
  }, [subscriptions, searchQuery, selectedStatus, selectedFrequency, selectedCompany]);

  const stats = useMemo(() => {
    const totalSpend = subscriptions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const pending = subscriptions.filter((s) => s.status === "Pending").length;
    const paid = subscriptions.filter((s) => s.status === "Paid").length;
    const approved = subscriptions.filter((s) => s.status === "Approved").length;

    return { totalSpend, pending, paid, approved, total: subscriptions.length };
  }, [subscriptions]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800/50">
            <CreditCard className="h-5 w-5" />
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

        <div className="flex items-center gap-2">
          <button
            onClick={loadSubscriptions}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Total Spend
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block font-mono">
            {formatCurrency(stats.totalSpend)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Pending Approval
          </span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {stats.pending} Requests
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Approved &amp; Due
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {stats.approved}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Active &amp; Paid
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {stats.paid} Active
          </span>
        </div>
      </div>

      {/* 3. Main Card with Filter Bar & Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Subscriptions &amp; Recurring Services
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track software licenses, cloud computing charges, and periodic vendor commitments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search subscription, dept, purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved (Payment Due)</option>
              <option value="Paid">Paid / Active</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* Billing Cycle Filter */}
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="All">All Billing Cycles</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>

            {/* Company Filter */}
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              {companies.map((co) => (
                <option key={co} value={co}>
                  {co === "All" ? "All Companies" : co}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* High-Contrast Subscriptions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 text-center w-28">ACTIONS</th>
                <th className="px-4 py-3">SERIAL NO</th>
                <th className="px-4 py-3">COMPANY</th>
                <th className="px-4 py-3">SUBSCRIBER</th>
                <th className="px-4 py-3">SUBSCRIPTION</th>
                <th className="px-4 py-3">COST</th>
                <th className="px-4 py-3">BILLING CYCLE</th>
                <th className="px-4 py-3">PURPOSE</th>
                <th className="px-4 py-3">REQUESTED DATE</th>
                <th className="px-4 py-3">RENEWAL DATE</th>
                <th className="px-4 py-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="11" className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                      <span>Loading subscriptions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">No subscriptions found</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Click "+ Add Subscription" to register a new recurring service or software license.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub, index) => {
                  const serialNo = sub.sn
                    ? `SN-${String(sub.sn).padStart(3, "0")}`
                    : `SN-${String(index + 1).padStart(3, "0")}`;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {sub.status === "Pending" && (
                            <Link
                              to="/dashboard/docs/subscription/approval"
                              className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-semibold rounded-lg text-[11px] hover:bg-amber-100 transition-colors border border-amber-200/50"
                            >
                              Approve
                            </Link>
                          )}
                          {sub.status === "Approved" && (
                            <Link
                              to="/dashboard/docs/subscription/payment"
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold rounded-lg text-[11px] hover:bg-blue-100 transition-colors border border-blue-200/50"
                            >
                              Pay
                            </Link>
                          )}
                          {sub.status === "Paid" && (
                            <Link
                              to="/dashboard/docs/subscription/renewal"
                              className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold rounded-lg text-[11px] hover:bg-purple-100 transition-colors border border-purple-200/50"
                            >
                              Renew
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(sub)}
                            className="p-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                            title="Delete Subscription"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Serial No */}
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {serialNo}
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {sub.companyName}
                      </td>

                      {/* Subscriber */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {sub.subscriberName}
                      </td>

                      {/* Subscription Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {sub.subscriptionName}
                          </span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(sub.price)}
                      </td>

                      {/* Billing Cycle */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {sub.frequency}
                        </span>
                      </td>

                      {/* Purpose */}
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={sub.purpose}>
                        {sub.purpose || "-"}
                      </td>

                      {/* Requested Date */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateDDMMYYYY(sub.requestedDate || sub.createdAt)}
                      </td>

                      {/* Renewal Date */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateDDMMYYYY(sub.renewalDate)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {sub.status === "Pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            <span>Pending Approval</span>
                          </span>
                        )}
                        {sub.status === "Approved" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-400">
                            <Wallet className="h-3 w-3" />
                            <span>Payment Due</span>
                          </span>
                        )}
                        {sub.status === "Paid" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active &amp; Paid</span>
                          </span>
                        )}
                        {sub.status === "Rejected" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-950/50 dark:text-red-400">
                            <XCircle className="h-3 w-3" />
                            <span>Rejected</span>
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
      </div>

      <AddSubscriptionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={loadSubscriptions}
      />
    </div>
  );
}
