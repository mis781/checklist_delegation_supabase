import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  CreditCard,
  Coins,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  documentsApi,
  subscriptionsApi,
  loansApi,
  DOCS_DATA_CHANGED_EVENT,
} from "../services/docsLocalStorage";
import {
  formatDate,
  formatCurrency,
  isExpiringSoon,
  isOverdue,
} from "../utils/dateFormatter";

const DOC_STATUS_COLORS = {
  Active: "#2563eb",   // Blue
  Expiring: "#f97316", // Orange
  Expired: "#ef4444",  // Red
};

const SUB_STATUS_COLORS = {
  Paid: "#2563eb",      // Blue
  Pending: "#f59e0b",   // Amber
  Approved: "#8b5cf6",  // Purple
  Rejected: "#ef4444",  // Red
};

const LOAN_STATUS_COLORS = {
  Active: "#10b981",    // Emerald
  Closed: "#3b82f6",    // Blue
  Foreclosed: "#f97316",// Orange
};

export default function DocsDashboard() {
  const [documents, setDocuments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [docs, subs, lns, rens, pays] = await Promise.all([
        documentsApi.list(),
        subscriptionsApi.list(),
        loansApi.list(),
        documentsApi.listRenewals(),
        subscriptionsApi.listPayments(),
      ]);
      setDocuments(docs || []);
      setSubscriptions(subs || []);
      setLoans(lns || []);
      setRenewals(rens || []);
      setPayments(pays || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const handleDataChange = () => loadAllData();
    window.addEventListener(DOCS_DATA_CHANGED_EVENT, handleDataChange);
    return () => window.removeEventListener(DOCS_DATA_CHANGED_EVENT, handleDataChange);
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    const expiringDocs = documents.filter(
      (d) => d.needsRenewal === "Yes" && d.renewalDate && (isExpiringSoon(d.renewalDate, 30) || isOverdue(d.renewalDate))
    );

    const pendingApprovals = subscriptions.filter((s) => s.status === "Pending");
    
    // Monthly estimated spend from subscriptions
    const monthlySpend = subscriptions.reduce((sum, s) => {
      const price = Number(s.price) || 0;
      if (s.frequency === "Monthly") return sum + price;
      if (s.frequency === "Quarterly") return sum + price / 3;
      if (s.frequency === "Half-Yearly") return sum + price / 6;
      if (s.frequency === "Yearly") return sum + price / 12;
      return sum + price;
    }, 0);

    const nocCompleted = loans.filter((l) => l.collectNocStatus === "Yes");

    return {
      totalDocs: documents.length,
      renewalsPendingCount: expiringDocs.length,
      totalSubs: subscriptions.length,
      monthlySpend,
      pendingApprovalsCount: pendingApprovals.length,
      totalLoans: loans.length,
      nocCompletedCount: nocCompleted.length,
    };
  }, [documents, subscriptions, loans]);

  // Documents by renewal status chart data
  const docChartData = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;

    documents.forEach((d) => {
      if (d.needsRenewal !== "Yes" || !d.renewalDate) {
        active += 1;
      } else if (isOverdue(d.renewalDate)) {
        expired += 1;
      } else if (isExpiringSoon(d.renewalDate, 30)) {
        expiring += 1;
      } else {
        active += 1;
      }
    });

    const total = active + expiring + expired;
    if (total === 0) return { data: [{ name: "None", value: 1, color: "#e2e8f0" }], total: 0, isEmpty: true };

    const result = [];
    if (active > 0) result.push({ name: "Active", value: active, color: DOC_STATUS_COLORS.Active });
    if (expiring > 0) result.push({ name: "Expiring", value: expiring, color: DOC_STATUS_COLORS.Expiring });
    if (expired > 0) result.push({ name: "Expired", value: expired, color: DOC_STATUS_COLORS.Expired });

    return { data: result, total, isEmpty: false };
  }, [documents]);

  // Subscriptions by status chart data
  const subChartData = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    subscriptions.forEach((s) => {
      if (s.status === "Paid") paid += 1;
      else if (s.status === "Pending") pending += 1;
      else if (s.status === "Approved") approved += 1;
      else if (s.status === "Rejected") rejected += 1;
      else paid += 1;
    });

    const total = paid + pending + approved + rejected;
    if (total === 0) return { data: [{ name: "None", value: 1, color: "#e2e8f0" }], total: 0, isEmpty: true };

    const result = [];
    if (paid > 0) result.push({ name: "Paid", value: paid, color: SUB_STATUS_COLORS.Paid });
    if (pending > 0) result.push({ name: "Pending", value: pending, color: SUB_STATUS_COLORS.Pending });
    if (approved > 0) result.push({ name: "Approved", value: approved, color: SUB_STATUS_COLORS.Approved });
    if (rejected > 0) result.push({ name: "Rejected", value: rejected, color: SUB_STATUS_COLORS.Rejected });

    return { data: result, total, isEmpty: false };
  }, [subscriptions]);

  // Loans by status chart data
  const loanChartData = useMemo(() => {
    let active = 0;
    let closed = 0;
    let foreclosed = 0;

    loans.forEach((l) => {
      if (l.foreclosureStatus === "Settled") foreclosed += 1;
      else if (l.status === "Closed" || l.collectNocStatus === "Yes") closed += 1;
      else active += 1;
    });

    const total = active + closed + foreclosed;
    if (total === 0) return { data: [{ name: "None", value: 1, color: "#e2e8f0" }], total: 0, isEmpty: true };

    const result = [];
    if (active > 0) result.push({ name: "Active", value: active, color: LOAN_STATUS_COLORS.Active });
    if (closed > 0) result.push({ name: "Closed", value: closed, color: LOAN_STATUS_COLORS.Closed });
    if (foreclosed > 0) result.push({ name: "Foreclosed", value: foreclosed, color: LOAN_STATUS_COLORS.Foreclosed });

    return { data: result, total, isEmpty: false };
  }, [loans]);

  // Recent Activity Timeline list
  const recentActivities = useMemo(() => {
    const list = [];

    // Documents added
    documents.forEach((d) => {
      list.push({
        id: `doc_${d.id}`,
        type: "Document Added",
        title: `New document '${d.documentName}' added under ${d.companyName || d.category}`,
        date: d.createdAt ? formatDate(d.createdAt) : "25/08/2026",
        timestamp: d.createdAt ? new Date(d.createdAt).getTime() : 0,
        iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
      });
    });

    // Renewals
    renewals.forEach((r) => {
      list.push({
        id: `ren_${r.id}`,
        type: "Document Renewed",
        title: `Document '${r.documentName}' renewed until ${formatDate(r.newRenewalDate)}`,
        date: r.renewedAt ? formatDate(r.renewedAt) : "25/08/2026",
        timestamp: r.renewedAt ? new Date(r.renewedAt).getTime() : 0,
        iconColor: "text-orange-600 bg-orange-50 dark:bg-orange-950/50",
      });
    });

    // Subscriptions
    subscriptions.forEach((s) => {
      list.push({
        id: `sub_${s.id}`,
        type: "Subscription Added",
        title: `Subscription '${s.subscriptionName}' registered for ${s.subscriberName}`,
        date: s.createdAt ? formatDate(s.createdAt) : "25/08/2026",
        timestamp: s.createdAt ? new Date(s.createdAt).getTime() : 0,
        iconColor: "text-purple-600 bg-purple-50 dark:bg-purple-950/50",
      });
    });

    // Payments
    payments.forEach((p) => {
      list.push({
        id: `pay_${p.id}`,
        type: "Payment Recorded",
        title: `Payment of ${formatCurrency(p.amountPaid)} recorded for '${p.subscriptionName}'`,
        date: p.paymentDate ? formatDate(p.paymentDate) : "25/08/2026",
        timestamp: p.createdAt ? new Date(p.createdAt).getTime() : 0,
        iconColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
  }, [documents, renewals, subscriptions, payments]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Card */}
      <div className="bg-card border border-border-primary rounded-xl p-4 shadow-xs flex items-center gap-3.5">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-text-primary">
              Document & Subscription Manager
            </h1>
          </div>
          <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
            <span>Platform</span>
            <span>›</span>
            <span>Doc & Subscription</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: RESOURCE OVERVIEW */}
      <div>
        <h2 className="text-[11px] font-bold text-text-muted tracking-wider uppercase mb-2.5">
          RESOURCE OVERVIEW
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Documents */}
          <Link
            to="/dashboard/docs/all"
            className="bg-card border border-border-primary rounded-xl p-4 shadow-xs hover:border-blue-400 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-text-muted tracking-wider uppercase block">
                TOTAL DOCUMENTS
              </span>
              <span className="text-2xl font-bold text-text-primary mt-1.5 block">
                {metrics.totalDocs}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                All stored & tracked records
              </span>
            </div>
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <FileText className="h-6 w-6" />
            </div>
          </Link>

          {/* Card 2: Total Subscriptions */}
          <Link
            to="/dashboard/docs/subscription/all"
            className="bg-card border border-border-primary rounded-xl p-4 shadow-xs hover:border-purple-400 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-text-muted tracking-wider uppercase block">
                TOTAL SUBSCRIPTIONS
              </span>
              <span className="text-2xl font-bold text-text-primary mt-1.5 block">
                {metrics.totalSubs}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                ₹{Math.round(metrics.monthlySpend).toLocaleString("en-IN")} / mo estimated spend
              </span>
            </div>
            <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
          </Link>

          {/* Card 3: Total Loans */}
          <Link
            to="/dashboard/docs/loan/all"
            className="bg-card border border-border-primary rounded-xl p-4 shadow-xs hover:border-emerald-400 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-text-muted tracking-wider uppercase block">
                TOTAL LOANS
              </span>
              <span className="text-2xl font-bold text-text-primary mt-1.5 block">
                {metrics.totalLoans}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                Active bank finance records
              </span>
            </div>
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <Coins className="h-6 w-6" />
            </div>
          </Link>
        </div>
      </div>

      {/* SECTION 2: ACTION ITEMS & COMPLIANCE STATUS */}
      <div>
        <h2 className="text-[11px] font-bold text-text-muted tracking-wider uppercase mb-2.5">
          ACTION ITEMS & COMPLIANCE STATUS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Renewals Pending */}
          <Link
            to="/dashboard/docs/renewal"
            className="bg-card border border-border-primary rounded-xl p-4 shadow-xs hover:border-orange-400 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-text-muted tracking-wider uppercase block">
                RENEWALS PENDING
              </span>
              <span className="text-2xl font-bold text-text-primary mt-1.5 block">
                {metrics.renewalsPendingCount}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                Documents requiring renewal
              </span>
            </div>
            <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <RotateCcw className="h-6 w-6" />
            </div>
          </Link>

          {/* Card 2: Pending Approvals */}
          <Link
            to="/dashboard/docs/subscription/approval"
            className="bg-card border border-border-primary rounded-xl p-4 shadow-xs hover:border-indigo-400 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-text-muted tracking-wider uppercase block">
                PENDING APPROVALS
              </span>
              <span className="text-2xl font-bold text-text-primary mt-1.5 block">
                {metrics.pendingApprovalsCount}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                Subscriptions waiting for approval
              </span>
            </div>
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </Link>

          {/* Card 3: NOC Completed */}
          <Link
            to="/dashboard/docs/loan/noc"
            className="bg-card border border-border-primary rounded-xl p-4 shadow-xs hover:border-teal-400 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-text-muted tracking-wider uppercase block">
                NOC COMPLETED
              </span>
              <span className="text-2xl font-bold text-text-primary mt-1.5 block">
                {metrics.nocCompletedCount}
              </span>
              <span className="text-xs text-text-muted mt-0.5 block">
                Loans with NOC safely received
              </span>
            </div>
            <div className="w-12 h-12 bg-teal-500 text-white rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </Link>
        </div>
      </div>

      {/* SECTION 3: THREE DONUT CHARTS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Chart 1: Subscriptions */}
        <div className="bg-card border border-border-primary rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Subscriptions</h3>
            <p className="text-xs text-text-muted">By current status</p>
          </div>

          <div className="relative h-44 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subChartData.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={subChartData.isEmpty ? 0 : 2}
                >
                  {subChartData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [subChartData.isEmpty ? 0 : val, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-text-primary">
                {subChartData.total}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-text-muted font-medium pt-2 border-t border-border-secondary">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-blue-600 inline-block" />
              <span>Paid</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-amber-500 inline-block" />
              <span>Pending</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-purple-500 inline-block" />
              <span>Approved</span>
            </span>
          </div>
        </div>

        {/* Chart 2: Documents */}
        <div className="bg-card border border-border-primary rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Documents</h3>
            <p className="text-xs text-text-muted">By renewal status</p>
          </div>

          <div className="relative h-44 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={docChartData.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={docChartData.isEmpty ? 0 : 2}
                >
                  {docChartData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [docChartData.isEmpty ? 0 : val, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-text-primary">
                {docChartData.total}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-text-muted font-medium pt-2 border-t border-border-secondary">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-blue-600 inline-block" />
              <span>Active</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-orange-500 inline-block" />
              <span>Expiring</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-red-500 inline-block" />
              <span>Expired</span>
            </span>
          </div>
        </div>

        {/* Chart 3: Loans */}
        <div className="bg-card border border-border-primary rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Loans</h3>
            <p className="text-xs text-text-muted">By closure & active status</p>
          </div>

          <div className="relative h-44 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loanChartData.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={loanChartData.isEmpty ? 0 : 2}
                >
                  {loanChartData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [loanChartData.isEmpty ? 0 : val, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-text-primary">
                {loanChartData.total}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-text-muted font-medium pt-2 border-t border-border-secondary">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-emerald-500 inline-block" />
              <span>Active</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-blue-600 inline-block" />
              <span>Closed</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-orange-500 inline-block" />
              <span>Foreclosed</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 4: RECENT ACTIVITY TIMELINE */}
      <div className="bg-card border border-border-primary rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-border-secondary">
          <div className="p-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-md">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Recent Activity Timeline</h3>
        </div>

        <div className="divide-y divide-border-secondary">
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No recent activity logs yet.
            </div>
          ) : (
            recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between gap-3 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${act.iconColor}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-text-primary text-xs block truncate">
                      {act.type}
                    </span>
                    <span className="text-[11px] text-text-muted block truncate">
                      {act.title}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-text-muted font-mono flex-shrink-0">
                  {act.date}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
