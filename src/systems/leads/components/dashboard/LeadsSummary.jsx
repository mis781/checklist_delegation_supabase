import React, { useState, useEffect, useContext, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle,
  Calendar,
  Clock,
  Search,
  ArrowRight,
  User,
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { AuthContext } from "../../context/AuthContext"
import { mockApi } from "../../services/mockApi"

function LeadsSummary({ filters }) {
  const { currentUser, isAdmin } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState("overdue") // 'overdue', 'today', 'next7days', 'all'
  const [summaryData, setSummaryData] = useState({
    overdue: [],
    today: [],
    next7days: [],
    all: [],
    counts: { overdue: 0, today: 0, next7days: 0, total: 0 }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setIsLoading(true)
        const data = await mockApi.fetchLeadsSummary(currentUser, isAdmin, filters)
        setSummaryData(data)
      } catch (err) {
        console.error("Error loading leads summary:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSummary()
  }, [currentUser, isAdmin, filters])

  // Determine current active list based on activeTab
  const currentList = useMemo(() => {
    let list = []
    if (activeTab === "overdue") list = summaryData.overdue || []
    else if (activeTab === "today") list = summaryData.today || []
    else if (activeTab === "next7days") list = summaryData.next7days || []
    else list = summaryData.all || []

    if (!searchTerm.trim()) return list

    const q = searchTerm.toLowerCase().trim()
    return list.filter(item =>
      (item.companyName && item.companyName.toLowerCase().includes(q)) ||
      (item.leadNo && item.leadNo.toLowerCase().includes(q)) ||
      (item.salesPerson && item.salesPerson.toLowerCase().includes(q)) ||
      (item.personName && item.personName.toLowerCase().includes(q)) ||
      (item.phoneNumber && item.phoneNumber.includes(q))
    )
  }, [activeTab, summaryData, searchTerm])

  const counts = summaryData.counts || { overdue: 0, today: 0, next7days: 0, total: 0 }

  const formatScheduledBadge = (item) => {
    if (item.category === "overdue") {
      const days = Math.abs(item.daysDiff)
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertCircle size={12} />
          {days === 0 ? "Overdue" : `${days} day${days > 1 ? "s" : ""} overdue`}
        </span>
      )
    }
    if (item.category === "today") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Clock size={12} />
          Today
        </span>
      )
    }
    if (item.category === "next7days") {
      const days = item.daysDiff
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Calendar size={12} />
          In {days} day{days > 1 ? "s" : ""}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
        Scheduled
      </span>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 md:p-6 shadow-xs space-y-6">
      {/* Header Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-blue-600 dark:text-blue-400" />
            Leads Summary & Schedules
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
            Track pending follow-ups & customer activities across Overdue, Today, and Next 7 Days
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Search summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Summary Interactive Cards / Quick Tabs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Overdue Card */}
        <div
          onClick={() => setActiveTab("overdue")}
          className={`cursor-pointer transition-all duration-200 rounded-2xl p-2.5 sm:p-4 border ${
            activeTab === "overdue"
              ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-sm ring-2 ring-rose-500/20"
              : "bg-white dark:bg-slate-800/60 border-gray-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900 hover:bg-rose-50/30"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1 sm:gap-1.5 truncate">
                <AlertCircle size={13} className="shrink-0" />
                <span className="truncate">Overdue</span>
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black text-rose-700 dark:text-rose-300 mt-1">
                {isLoading ? "..." : counts.overdue}
              </div>
            </div>
            {counts.overdue > 0 && (
              <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-rose-500"></span>
              </span>
            )}
          </div>
          <p className="hidden sm:block text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-2">
            Action needed
          </p>
        </div>

        {/* Today Card */}
        <div
          onClick={() => setActiveTab("today")}
          className={`cursor-pointer transition-all duration-200 rounded-2xl p-2.5 sm:p-4 border ${
            activeTab === "today"
              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm ring-2 ring-blue-500/20"
              : "bg-white dark:bg-slate-800/60 border-gray-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50/30"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1 sm:gap-1.5 truncate">
                <Clock size={13} className="shrink-0" />
                <span className="truncate">Today</span>
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black text-blue-700 dark:text-blue-300 mt-1">
                {isLoading ? "..." : counts.today}
              </div>
            </div>
          </div>
          <p className="hidden sm:block text-[11px] text-blue-600/80 dark:text-blue-400/80 font-medium mt-2">
            Scheduled today
          </p>
        </div>

        {/* Next 7 Days Card */}
        <div
          onClick={() => setActiveTab("next7days")}
          className={`cursor-pointer transition-all duration-200 rounded-2xl p-2.5 sm:p-4 border ${
            activeTab === "next7days"
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-800/60 border-gray-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 hover:bg-emerald-50/30"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 sm:gap-1.5 truncate">
                <Calendar size={13} className="shrink-0" />
                <span className="truncate">Next 7d</span>
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {isLoading ? "..." : counts.next7days}
              </div>
            </div>
          </div>
          <p className="hidden sm:block text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-2">
            Upcoming
          </p>
        </div>
      </div>

      {/* Tab Navigation Filter Pills */}
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overdue")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "overdue"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
          }`}
        >
          Overdue ({counts.overdue})
        </button>
        <button
          onClick={() => setActiveTab("today")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "today"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
          }`}
        >
          Today ({counts.today})
        </button>
        <button
          onClick={() => setActiveTab("next7days")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "next7days"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
          }`}
        >
          Next 7 Days ({counts.next7days})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "all"
              ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
          }`}
        >
          All Active ({counts.total})
        </button>
      </div>

      {/* Content Table / List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl bg-gray-50/50 dark:bg-slate-800/30 border border-dashed border-gray-200 dark:border-slate-800">
          <CheckCircle2 className="mx-auto text-emerald-500 dark:text-emerald-400 mb-2" size={32} />
          <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">
            {activeTab === "overdue"
              ? "No Overdue Leads!"
              : activeTab === "today"
              ? "No Leads Scheduled for Today"
              : activeTab === "next7days"
              ? "No Leads Scheduled for Next 7 Days"
              : "No Active Scheduled Leads Found"}
          </h4>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {activeTab === "overdue"
              ? "Great job! All customer follow-ups are up to date."
              : "Check back later or view all active leads in the Followup Tracker."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-gray-600 dark:text-slate-300">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Lead / Quote No</th>
                <th className="px-4 py-3">Company & Contact</th>
                <th className="px-4 py-3">Sales Person</th>
                <th className="px-4 py-3">Stage / Status</th>
                <th className="px-4 py-3">Schedule Date</th>
                <th className="px-4 py-3">Next Action / Remarks</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {currentList.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{item.leadNo}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                        {item.type === "followup" ? "Lead" : "Quote"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                      <Building2 size={13} className="text-gray-400" />
                      {item.companyName}
                    </div>
                    {item.personName && (
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <User size={11} className="text-gray-400" />
                        {item.personName} {item.phoneNumber && `(${item.phoneNumber})`}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-slate-200">
                    <div>{item.salesPerson}</div>
                    {item.division && item.division !== "-" && (
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                        Div: {item.division}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {formatScheduledBadge(item)}
                    {item.scheduledDate && (
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                        {item.scheduledDate}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-600 dark:text-slate-400" title={item.nextAction}>
                    {item.nextAction || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={item.link}>
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/80 transition-all cursor-pointer">
                        Follow Up
                        <ArrowRight size={13} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LeadsSummary
