import { useState, useEffect, useMemo, useContext } from "react"
import { Link } from "react-router-dom"
import {
  TrendingUp,
  RotateCcw,
  Users,
  PhoneCall,
  FileText,
  ShoppingCart,
  Calendar,
  Clock,
  AlertCircle,
  ArrowRight,
  Building2,
  User,
  CheckCircle2,
  Sparkles,
  Phone,
  Plus,
  Sunrise,
  Sun,
  Sunset,
  Eye,
  ShieldCheck,
  ExternalLink
} from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import DashboardMetrics from "../components/dashboard/DashboardMetrics"
import LeadsSummary from "../components/dashboard/LeadsSummary"
import DashboardCharts from "../components/dashboard/DashboardCharts"
import { getLeadReceiverNames, getCompanies, getSubmittedLeads } from "../utils/storageManager"
import { fetchMasterSalespersons, fetchLiveDivisions } from "../services/leadApi"
import { mockApi } from "../services/mockApi"
import MetricDetailModal from "../components/dashboard/MetricDetailModal"

// Helper: Time-of-day greeting
function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: "Good morning", icon: Sunrise, color: "text-amber-500" }
  if (hour < 17) return { text: "Good afternoon", icon: Sun, color: "text-amber-500" }
  return { text: "Good evening", icon: Sunset, color: "text-indigo-400" }
}

// Salesperson Dashboard View Component
function SalesPersonView({ targetSalesPerson, isPreviewMode }) {
  const { currentUser, isAdmin } = useContext(AuthContext)
  const [metrics, setMetrics] = useState({
    totalLeads: "0",
    pendingFollowups: "0",
    quotationsSent: "0",
    ordersReceived: "0",
    quotationsTotalAmount: 0,
    items: {
      totalLeads: [],
      pendingFollowups: [],
      quotationsSent: [],
      ordersReceived: []
    }
  })
  const [activeModalKey, setActiveModalKey] = useState(null)
  const [summaryData, setSummaryData] = useState({
    overdue: [],
    today: [],
    next7days: [],
    counts: { overdue: 0, today: 0, next7days: 0, total: 0 }
  })
  const [isLoading, setIsLoading] = useState(true)

  const greeting = useMemo(() => getTimeGreeting(), [])
  const GreetingIcon = greeting.icon

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }, [])

  // Filters locked to the salesperson
  const spFilters = useMemo(() => ({
    salesPerson: targetSalesPerson,
    division: "All",
    dateFrom: "",
    dateTo: ""
  }), [targetSalesPerson])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setIsLoading(true)
        // Fetch both metrics and summary in parallel
        const [metricRes, summaryRes] = await Promise.all([
          mockApi.fetchDashboardMetrics(
            { username: targetSalesPerson, userType: "user" },
            () => false, // evaluate as non-admin so data scopes strictly to salesperson
            spFilters
          ),
          mockApi.fetchLeadsSummary(
            { username: targetSalesPerson, userType: "user" },
            () => false, // evaluate as non-admin
            spFilters
          )
        ])

        if (isMounted) {
          if (metricRes) {
            setMetrics({
              totalLeads: metricRes.totalLeads ?? "0",
              pendingFollowups: metricRes.pendingFollowups ?? "0",
              quotationsSent: metricRes.quotationsSent ?? "0",
              ordersReceived: metricRes.ordersReceived ?? "0",
              quotationsTotalAmount: metricRes.quotationsTotalAmount ?? 0,
              items: metricRes.items || {
                totalLeads: [],
                pendingFollowups: [],
                quotationsSent: [],
                ordersReceived: []
              }
            })
          }
          if (summaryRes) {
            setSummaryData(summaryRes)
          }
        }
      } catch (err) {
        console.error("Error loading salesperson dashboard data:", err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [targetSalesPerson, spFilters])

  const counts = summaryData.counts || { overdue: 0, today: 0, next7days: 0, total: 0 }

  return (
    <div className="w-full space-y-6">
      {/* 1. Greeting & Quick Action Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 text-white p-6 md:p-8 shadow-md">
        <div className="absolute -right-8 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-36 h-36 rounded-full bg-sky-300/15 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold tracking-wide uppercase">
              <GreetingIcon size={16} className={greeting.color} />
              <span>{greeting.text}</span>
              <span className="text-white/40">•</span>
              <span>{todayFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Hello, {targetSalesPerson || currentUser?.username || "Sales Partner"}
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm font-medium max-w-xl">
              Here is your priority lead schedule and follow-up agenda for today. Stay on top of your customer pipeline.
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to="/dashboard/leads/new-lead">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-sm hover:bg-blue-50 transition-all cursor-pointer">
                <Plus size={16} />
                New Lead
              </button>
            </Link>
            <Link to="/dashboard/leads/followup-tracker">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer">
                <PhoneCall size={15} />
                Follow-up Tracker
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Priority Overdue Alert Strip (Shown only if overdue > 0) */}
      {counts.overdue > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0 mt-0.5 sm:mt-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                Attention Needed: You have {counts.overdue} overdue follow-up{counts.overdue > 1 ? "s" : ""}!
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-medium">
                These leads passed their scheduled date without an update. Follow up now to keep customer interest warm.
              </p>
            </div>
          </div>
          <a
            href="#overdue-section"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 transition-all cursor-pointer shadow-xs"
          >
            Review Overdue ({counts.overdue})
            <ArrowRight size={13} />
          </a>
        </div>
      )}

      {/* 3. My Quick Stats (4 Simple Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Leads */}
        <div
          onClick={() => setActiveModalKey("totalLeads")}
          className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-gray-150 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 active:scale-95"
        >
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>My Leads</span>
              <ExternalLink size={10} className="text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
              {isLoading ? "..." : metrics.totalLeads}
            </h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Click to view list</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
            <Users size={22} />
          </div>
        </div>

        {/* Pending Follow-ups */}
        <div
          onClick={() => setActiveModalKey("pendingFollowups")}
          className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-gray-150 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 active:scale-95"
        >
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>Pending Calls</span>
              <ExternalLink size={10} className="text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {isLoading ? "..." : metrics.pendingFollowups}
            </h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Click to view list</span>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
            <PhoneCall size={22} />
          </div>
        </div>

        {/* Quotations Sent */}
        <div
          onClick={() => setActiveModalKey("quotationsSent")}
          className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-gray-150 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 active:scale-95"
        >
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>Quotations Sent</span>
              <ExternalLink size={10} className="text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? "..." : metrics.quotationsSent}
            </h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Click to view list</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <FileText size={22} />
          </div>
        </div>

        {/* Orders Received */}
        <div
          onClick={() => setActiveModalKey("ordersReceived")}
          className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-gray-150 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 active:scale-95"
        >
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>Orders Won</span>
              <ExternalLink size={10} className="text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {isLoading ? "..." : metrics.ordersReceived}
            </h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Click to view list</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
            <ShoppingCart size={22} />
          </div>
        </div>
      </div>

      {/* 4. Today's Agenda (Primary Focus) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                Today's Follow-up Agenda
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  {counts.today}
                </span>
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                Leads scheduled to be contacted today ({todayFormatted})
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/leads/followup-tracker"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Tracker <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-10 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            <p className="text-xs text-gray-400 mt-2">Loading today's agenda...</p>
          </div>
        ) : summaryData.today.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-gray-50/60 dark:bg-slate-800/40 border border-dashed border-gray-200 dark:border-slate-800">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
            <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">No Follow-ups Due Today!</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              You are completely caught up with today's scheduled follow-ups. You can check upcoming leads below or reach out to new prospects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summaryData.today.map((item, idx) => (
              <LeadAgendaCard key={item.id || idx} item={item} badgeColor="blue" />
            ))}
          </div>
        )}
      </div>

      {/* 5. Overdue Follow-ups Section (Action Required) */}
      {summaryData.overdue.length > 0 && (
        <div id="overdue-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-950/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <AlertCircle size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  Overdue Follow-ups
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                    {counts.overdue}
                  </span>
                </h2>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
                  Past due scheduled calls — action needed immediately
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summaryData.overdue.map((item, idx) => (
              <LeadAgendaCard key={item.id || idx} item={item} badgeColor="rose" isOverdue />
            ))}
          </div>
        </div>
      )}

      {/* 6. Upcoming Leads (Next 7 Days Preview - max 6 cards) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                Upcoming Follow-ups (Next 7 Days)
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  {counts.next7days}
                </span>
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                Scheduled upcoming interactions for this week
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/leads/followup-tracker"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
          >
            All Upcoming <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-gray-400">Loading upcoming leads...</div>
        ) : summaryData.next7days.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            No upcoming leads scheduled in the next 7 days.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summaryData.next7days.slice(0, 6).map((item, idx) => (
                <LeadAgendaCard key={item.id || idx} item={item} badgeColor="emerald" />
              ))}
            </div>
            {summaryData.next7days.length > 6 && (
              <div className="pt-2 text-center">
                <Link
                  to="/dashboard/leads/followup-tracker"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  +{summaryData.next7days.length - 6} more leads scheduled this week. Open Followup Tracker
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal for Salesperson Cards */}
      <MetricDetailModal
        isOpen={!!activeModalKey}
        onClose={() => setActiveModalKey(null)}
        metricKey={activeModalKey}
        items={metrics.items?.[activeModalKey] || []}
        totalAmount={activeModalKey === "quotationsSent" ? metrics.quotationsTotalAmount : 0}
      />
    </div>
  )
}

// Compact, high-clarity Card for Salesperson
function LeadAgendaCard({ item, badgeColor = "blue", isOverdue = false }) {
  const badgeClasses = {
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
  }

  return (
    <div className={`rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between gap-3 ${
      isOverdue
        ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-300"
        : "bg-gray-50/40 dark:bg-slate-800/40 border-gray-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
    }`}>
      {/* Top Header: Company Name & Type Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-gray-400 shrink-0" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate" title={item.companyName}>
              {item.companyName}
            </h4>
          </div>
          {item.personName && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 truncate">
              <User size={12} className="text-gray-400 shrink-0" />
              <span className="truncate">{item.personName}</span>
              {item.phoneNumber && (
                <a
                  href={`tel:${item.phoneNumber}`}
                  className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold hover:underline ml-1"
                >
                  <Phone size={10} />
                  {item.phoneNumber}
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClasses[badgeColor]}`}>
            {isOverdue ? (
              <>
                <AlertCircle size={10} />
                {Math.abs(item.daysDiff) === 0 ? "Overdue" : `${Math.abs(item.daysDiff)}d overdue`}
              </>
            ) : item.category === "today" ? (
              <>
                <Clock size={10} />
                Today
              </>
            ) : (
              <>
                <Calendar size={10} />
                {item.daysDiff ? `In ${item.daysDiff}d` : "Upcoming"}
              </>
            )}
          </span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">
            {item.leadNo} ({item.type === "followup" ? "Lead" : "Quote"})
          </span>
        </div>
      </div>

      {/* Middle: Next Action / Customer Remarks */}
      {item.nextAction && (
        <div className="rounded-lg bg-white dark:bg-slate-900/80 border border-gray-150 dark:border-slate-800/80 px-2.5 py-1.5 text-xs text-gray-600 dark:text-slate-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 block">
            Next Action / Remarks
          </span>
          <p className="line-clamp-2 text-[11px] mt-0.5 font-medium">
            {item.nextAction}
          </p>
        </div>
      )}

      {/* Bottom Row: Status Badge & Follow Up Button */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-150/60 dark:border-slate-800/60 mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-semibold">
            {item.status || "Pending"}
          </span>
          {item.division && item.division !== "-" && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500 hidden sm:inline">
              Div: {item.division}
            </span>
          )}
        </div>

        <Link to={item.link}>
          <button className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            isOverdue
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}>
            Follow Up
            <ArrowRight size={13} />
          </button>
        </Link>
      </div>
    </div>
  )
}

function Dashboard() {
  const { currentUser, isAdmin, isSalesPerson } = useContext(AuthContext)
  const [salesPersonOptions, setSalesPersonOptions] = useState([])
  const isActualAdmin = typeof isAdmin === "function" ? isAdmin() : !!isAdmin

  const isUserSalesPerson = isSalesPerson || (!isActualAdmin) || (
    currentUser?.username && salesPersonOptions.some(name => name?.toLowerCase() === currentUser.username.toLowerCase())
  )

  // View mode: Salesperson (action-focused) vs Admin Overview
  // Default to "salesperson" for salespeople, or "admin" for administrators
  const [viewMode, setViewMode] = useState(isUserSalesPerson ? "salesperson" : "admin")

  const [salesPerson, setSalesPerson] = useState(isUserSalesPerson && currentUser?.username ? currentUser.username : "All")
  const [division, setDivision] = useState("All")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [divisionOptions, setDivisionOptions] = useState([])

  useEffect(() => {
    if (isUserSalesPerson && currentUser?.username) {
      setSalesPerson(currentUser.username)
    }
  }, [isUserSalesPerson, currentUser])

  useEffect(() => {
    try {
      setSalesPersonOptions(getLeadReceiverNames().map(item => item.name))
    } catch (error) {
      console.error("Error loading sales person options:", error)
    }

    fetchMasterSalespersons().then(list => {
      if (list && list.length > 0) {
        setSalesPersonOptions(list.filter(s => s.is_active !== false).map(s => s.name))
      }
    }).catch(err => console.warn("Error fetching live salespersons:", err))

    fetchLiveDivisions().then(divs => {
      if (divs && divs.length > 0) {
        setDivisionOptions(divs)
      } else {
        const divisions = new Set()
        getCompanies().forEach(c => { if (c.division) divisions.add(c.division) })
        getSubmittedLeads().forEach(l => { if (l.division) divisions.add(l.division) })
        setDivisionOptions([...divisions].sort())
      }
    }).catch(err => console.warn("Error fetching live divisions:", err))
  }, [])

  const filters = useMemo(() => ({
    salesPerson,
    division,
    dateFrom,
    dateTo
  }), [salesPerson, division, dateFrom, dateTo])

  const handleReset = () => {
    setSalesPerson(isUserSalesPerson && currentUser?.username ? currentUser.username : "All")
    setDivision("All")
    setDateFrom("")
    setDateTo("")
  }

  // The active target salesperson for SalesPersonView
  // If admin is in Salesperson POV mode, they can preview specific salesperson or their own
  const targetSalesPersonName = useMemo(() => {
    if (isActualAdmin) {
      return (salesPerson && salesPerson !== "All") ? salesPerson : (currentUser?.username || "Sales Executive")
    }
    return currentUser?.username || salesPerson
  }, [isActualAdmin, salesPerson, currentUser])

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <TrendingUp size={22} />
            </div>
            {viewMode === "salesperson" ? "Sales Action Dashboard" : "Leads & CRM Overview"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            {viewMode === "salesperson"
              ? "Focus on your daily lead agenda, overdue follow-ups, and customer touches"
              : "Monitor sales inquiries, follow-up progress, quotations sent, and conversion metrics across all reps"}
          </p>
        </div>

        {/* View Switcher: Displayed for Admins to easily test and switch between Admin view and Salesperson POV */}
        {isActualAdmin && (
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-gray-200 dark:border-slate-700 shadow-2xs">
            <button
              onClick={() => setViewMode("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "admin"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck size={14} />
              Admin Overview
            </button>
            <button
              onClick={() => setViewMode("salesperson")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "salesperson"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Eye size={14} />
              Salesperson POV
            </button>
          </div>
        )}
      </div>

      {/* Render Mode: Salesperson POV vs Admin Overview */}
      {viewMode === "salesperson" ? (
        <div>
          {/* If an Admin is previewing the Salesperson POV, give them a handy salesperson selector to test any rep! */}
          {isActualAdmin && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold">
                <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                <span>Admin Previewing Salesperson POV:</span>
                <span className="font-bold underline">{targetSalesPersonName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-slate-400 font-medium">Switch Rep:</span>
                <select
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold text-gray-800 dark:text-slate-200 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">Select a Salesperson</option>
                  {salesPersonOptions.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <SalesPersonView
            targetSalesPerson={targetSalesPersonName}
            isPreviewMode={isActualAdmin}
          />
        </div>
      ) : (
        /* Full Admin Overview (Original Layout) */
        <div className="space-y-6">
          {/* Filters Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5 flex-1 min-w-[160px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Sales Person</span>
                  {isUserSalesPerson && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold normal-case">(Auto-filtered)</span>
                  )}
                </label>
                {(!isActualAdmin && isUserSalesPerson) ? (
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={currentUser?.username || salesPerson}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 cursor-not-allowed select-none shadow-2xs"
                  />
                ) : (
                  <select
                    value={salesPerson}
                    onChange={(e) => setSalesPerson(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="All">All Sales Persons</option>
                    {salesPerson && salesPerson !== "All" && !salesPersonOptions.includes(salesPerson) && (
                      <option value={salesPerson}>{salesPerson}</option>
                    )}
                    {salesPersonOptions.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-[160px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Division
                </label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer shadow-2xs"
                >
                  <option value="All">All Divisions</option>
                  {divisionOptions.map((name, index) => (
                    <option key={index} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                />
              </div>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <RotateCcw size={14} />
                Reset Filters
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <DashboardMetrics filters={filters} />

          {/* Leads Summary Section */}
          <LeadsSummary filters={filters} />

          {/* Charts Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-6 shadow-xs">
            <DashboardCharts filters={filters} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

