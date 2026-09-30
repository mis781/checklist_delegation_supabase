import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  CreditCard,
  Building2,
  RefreshCw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { subscriptionsApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import { formatCurrency, formatDateTime } from "../../utils/dateFormatter";

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

export default function SubscriptionApproval() {
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'history'
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Approval / Rejection Modal State
  const [actionTarget, setActionTarget] = useState(null); // { sub, action: 'Approve' | 'Reject' }
  const [actionRemarks, setActionRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionsApi.list();
      setSubscriptions(data || []);
    } catch (err) {
      console.error("Error loading subscriptions for approval:", err);
      toast.error("Failed to load approval queue");
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

  const pendingList = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === "Pending")
      .filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          !q ||
          s.subscriptionName?.toLowerCase().includes(q) ||
          s.serviceName?.toLowerCase().includes(q) ||
          s.subscriberName?.toLowerCase().includes(q) ||
          s.companyName?.toLowerCase().includes(q) ||
          s.purpose?.toLowerCase().includes(q)
        );
      });
  }, [subscriptions, searchQuery]);

  const historyList = useMemo(() => {
    return subscriptions
      .filter((s) => s.status !== "Pending")
      .filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          !q ||
          s.subscriptionName?.toLowerCase().includes(q) ||
          s.serviceName?.toLowerCase().includes(q) ||
          s.subscriberName?.toLowerCase().includes(q) ||
          s.companyName?.toLowerCase().includes(q) ||
          s.purpose?.toLowerCase().includes(q)
        );
      });
  }, [subscriptions, searchQuery]);

  const handleOpenActionModal = (sub, action) => {
    setActionTarget({ sub, action });
    setActionRemarks("");
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!actionTarget) return;

    try {
      setSubmitting(true);
      const isApprove = actionTarget.action === "Approve";
      await subscriptionsApi.approve(actionTarget.sub.id, {
        status: isApprove ? "Approved" : "Rejected",
        approvedBy: localStorage.getItem("user-name") || "Management",
        remarks: actionRemarks,
      });

      toast.success(
        `Subscription "${actionTarget.sub.subscriptionName}" has been ${isApprove ? "Approved" : "Rejected"}!`
      );
      setActionTarget(null);
      loadSubscriptions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to process approval action");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
            <CheckCircle2 className="h-5 w-5" />
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
          onClick={loadSubscriptions}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Refresh queue"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Main Card with Tabs & Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Subscription Approval Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review and authorize SaaS license requests, renewals, and budget commitments
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
                    ? "Search pending approval requests..."
                    : "Search approval decision history..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                Pending Requests ({pendingList.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Decision History ({historyList.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Pending Requests Table */}
        {activeTab === "pending" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-36">REVIEW ACTIONS</th>
                  <th className="px-4 py-3">SERIAL NO</th>
                  <th className="px-4 py-3">COMPANY</th>
                  <th className="px-4 py-3">SUBSCRIBER</th>
                  <th className="px-4 py-3">SUBSCRIPTION</th>
                  <th className="px-4 py-3">COST</th>
                  <th className="px-4 py-3">BILLING CYCLE</th>
                  <th className="px-4 py-3">PURPOSE</th>
                  <th className="px-4 py-3">REQUEST DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                        <span>Loading pending approvals...</span>
                      </div>
                    </td>
                  </tr>
                ) : pendingList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No pending subscription requests
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          All new software &amp; service subscriptions have been processed.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingList.map((sub, index) => {
                    const serialNo = sub.sn
                      ? `SN-${String(sub.sn).padStart(3, "0")}`
                      : `SN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Review Actions */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenActionModal(sub, "Approve")}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(sub, "Reject")}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 font-semibold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
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

                        {/* Subscription */}
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

                        {/* Request Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(sub.requestedDate || sub.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Decision History Table */}
        {activeTab === "history" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">SERIAL NO</th>
                  <th className="px-4 py-3">COMPANY</th>
                  <th className="px-4 py-3">SUBSCRIBER</th>
                  <th className="px-4 py-3">SUBSCRIPTION</th>
                  <th className="px-4 py-3">COST</th>
                  <th className="px-4 py-3">BILLING CYCLE</th>
                  <th className="px-4 py-3">DECISION STATUS</th>
                  <th className="px-4 py-3">AUTHORIZED BY &amp; DATE</th>
                  <th className="px-4 py-3">REMARKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      Loading history...
                    </td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No decision history logged yet
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  historyList.map((sub, index) => {
                    const serialNo = sub.sn
                      ? `SN-${String(sub.sn).padStart(3, "0")}`
                      : `SN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Serial No */}
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {serialNo}
                        </td>

                        <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {sub.companyName}
                        </td>

                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {sub.subscriberName}
                        </td>

                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                          {sub.subscriptionName}
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(sub.price)}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {sub.frequency}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              sub.status === "Approved" || sub.status === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/50 dark:text-rose-400"
                            }`}
                          >
                            {sub.status === "Approved" || sub.status === "Paid" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            <span>{sub.status}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-slate-900 dark:text-slate-100 block">
                            {sub.approvedBy || "Admin"}
                          </span>
                          {sub.approvedAt && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDateTime(sub.approvedAt)}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                          {sub.approvalRemarks || "-"}
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

      {/* Decision Modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    actionTarget.action === "Approve"
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50"
                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50"
                  }`}
                >
                  {actionTarget.action === "Approve" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {actionTarget.action === "Approve" ? "Approve Subscription" : "Reject Subscription"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    {actionTarget.sub.subscriptionName} ({formatCurrency(actionTarget.sub.price)} / {actionTarget.sub.frequency})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionTarget(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Subscriber Dept:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{actionTarget.sub.subscriberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Company Entity:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{actionTarget.sub.companyName}</span>
                </div>
                {actionTarget.sub.purpose && (
                  <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700/60">
                    <em>"{actionTarget.sub.purpose}"</em>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  {actionTarget.action === "Approve" ? "Approval Notes / Budget Code" : "Reason for Rejection"}
                </label>
                <textarea
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  rows={2}
                  required={actionTarget.action === "Reject"}
                  placeholder={
                    actionTarget.action === "Approve"
                      ? "e.g. Approved under IT operational budget 2026-27"
                      : "e.g. Budget exceeded / Duplicate tool exists in company"
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActionTarget(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                    actionTarget.action === "Approve" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {actionTarget.action === "Approve" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {submitting
                      ? "Processing..."
                      : actionTarget.action === "Approve"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
