import { useState, useEffect, useMemo } from "react"
import { TrendingUp, RotateCcw } from "lucide-react"
import DashboardMetrics from "../components/dashboard/DashboardMetrics"
import DashboardCharts from "../components/dashboard/DashboardCharts"
import { getLeadReceiverNames, getCompanies, getSubmittedLeads } from "../utils/storageManager"
import { fmsData } from "../data/dummyData"

function Dashboard() {
  const [salesPerson, setSalesPerson] = useState("All")
  const [division, setDivision] = useState("All")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [salesPersonOptions, setSalesPersonOptions] = useState([])
  const [divisionOptions, setDivisionOptions] = useState([])

  useEffect(() => {
    try {
      setSalesPersonOptions(getLeadReceiverNames().map(item => item.name))
    } catch (error) {
      console.error("Error loading sales person options:", error)
    }

    try {
      const divisions = new Set()
      getCompanies().forEach(c => { if (c.division) divisions.add(c.division) })
      getSubmittedLeads().forEach(l => { if (l.division) divisions.add(l.division) })
      fmsData.forEach(row => { if (row.division) divisions.add(row.division) })
      setDivisionOptions([...divisions].sort())
    } catch (error) {
      console.error("Error loading division options:", error)
    }
  }, [])

  const filters = useMemo(() => ({
    salesPerson,
    division,
    dateFrom,
    dateTo
  }), [salesPerson, division, dateFrom, dateTo])

  const handleReset = () => {
    setSalesPerson("All")
    setDivision("All")
    setDateFrom("")
    setDateTo("")
  }

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <TrendingUp size={22} />
            </div>
            Leads & CRM Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Monitor sales inquiries, follow-up progress, quotations sent, and conversion metrics
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 min-w-[160px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Sales Person
            </label>
            <select
              value={salesPerson}
              onChange={(e) => setSalesPerson(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer shadow-2xs"
            >
              <option value="All">All Sales Persons</option>
              {salesPersonOptions.map((name, index) => (
                <option key={index} value={name}>{name}</option>
              ))}
            </select>
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

      {/* Charts Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-6 shadow-xs">
        <DashboardCharts filters={filters} />
      </div>
    </div>
  )
}

export default Dashboard
