// DashboardMetrics.jsx - Updated to show user-specific data with clickable detail popup

import { useState, useEffect, useContext } from "react"
import { UsersIcon, PhoneCallIcon, FileTextIcon, ShoppingCartIcon, TrendingUpIcon } from "../Icons"
import { AuthContext } from "../../context/AuthContext"
import { mockApi } from "../../services/mockApi"
import MetricDetailModal from "./MetricDetailModal"
import { ExternalLink } from "lucide-react"

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })

function DashboardMetrics({ filters }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext)
  const [metrics, setMetrics] = useState({
    totalLeads: "0",
    pendingFollowups: "0",
    quotationsSent: "0",
    quotationsTotalAmount: 0,
    ordersReceived: "0",
    advanceReceivedCount: "0",
    totalAdvanceReceived: 0,
    items: {
      totalLeads: [],
      pendingFollowups: [],
      quotationsSent: [],
      ordersReceived: [],
      advanceReceived: []
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeModalKey, setActiveModalKey] = useState(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true)
        const data = await mockApi.fetchDashboardMetrics(currentUser, isAdmin, filters)
        setMetrics(data)
      } catch (error) {
        console.error("Error fetching metrics:", error)
        setError(error.message)
        setMetrics({
          totalLeads: "124",
          pendingFollowups: "38",
          quotationsSent: "56",
          quotationsTotalAmount: 0,
          ordersReceived: "27",
          advanceReceivedCount: "0",
          totalAdvanceReceived: 0,
          items: {
            totalLeads: [],
            pendingFollowups: [],
            quotationsSent: [],
            ordersReceived: [],
            advanceReceived: []
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [currentUser, isAdmin, filters])

  const itemsMap = metrics.items || {}
  const activeItems = activeModalKey ? (itemsMap[activeModalKey] || []) : []
  const activeTotalAmount =
    activeModalKey === "quotationsSent"
      ? metrics.quotationsTotalAmount
      : activeModalKey === "advanceReceived"
      ? metrics.totalAdvanceReceived
      : 0

  return (
    <div className="space-y-8">
      {/* Lead to Order Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          {isAdmin() && <p className="text-green-600 font-semibold text-xs sm:text-sm">Admin View: Showing all data</p>}
          <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium ml-auto">
            Tip: Click any card to view detailed list
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-6 mb-6">
          <MetricCard
            title="Total Leads"
            value={isLoading ? "Loading..." : metrics.totalLeads}
            icon={<UsersIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-sky-500 to-blue-600"
            onClick={() => setActiveModalKey("totalLeads")}
          />

          <MetricCard
            title="Follow Up Pending"
            value={isLoading ? "Loading..." : metrics.pendingFollowups}
            icon={<PhoneCallIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-blue-500 to-blue-600"
            onClick={() => setActiveModalKey("pendingFollowups")}
          />

          <MetricCard
            title="Quotations Sent"
            value={isLoading ? "Loading..." : metrics.quotationsSent}
            subtitle={!isLoading && `Total: ₹${formatCurrency(metrics.quotationsTotalAmount)}`}
            icon={<FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-emerald-500 to-green-600"
            onClick={() => setActiveModalKey("quotationsSent")}
          />

          <MetricCard
            title="Orders Received"
            value={isLoading ? "Loading..." : metrics.ordersReceived}
            icon={<ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-sky-500 to-blue-600"
            onClick={() => setActiveModalKey("ordersReceived")}
          />

          <MetricCard
            title="Advance Received"
            value={isLoading ? "Loading..." : metrics.advanceReceivedCount}
            subtitle={!isLoading && `Total: ₹${formatCurrency(metrics.totalAdvanceReceived)}`}
            icon={<TrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-fuchsia-500 to-purple-600"
            onClick={() => setActiveModalKey("advanceReceived")}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <MetricDetailModal
        isOpen={!!activeModalKey}
        onClose={() => setActiveModalKey(null)}
        metricKey={activeModalKey}
        items={activeItems}
        totalAmount={activeTotalAmount}
      />
    </div>
  )
}

function MetricCard({ title, value, subtitle, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-900 rounded-2xl shadow-xs hover:shadow-md border border-gray-150 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 active:scale-95"
    >
      <div className={`h-1.5 bg-gradient-to-r ${color}`} />
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 truncate flex items-center gap-1">
              <span>{title}</span>
              <ExternalLink size={10} className="text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 tracking-tight truncate">{value}</h3>
          </div>
          <div className={`p-2 rounded-xl bg-gradient-to-r ${color} text-white shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>{icon}</div>
        </div>
        {subtitle && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800/80">
            <span className="text-gray-500 dark:text-slate-400 text-[10px] sm:text-xs truncate block">{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardMetrics

