// DashboardMetrics.jsx - Updated to show user-specific data

import { useState, useEffect, useContext } from "react"
import { UsersIcon, PhoneCallIcon, FileTextIcon, ShoppingCartIcon, TrendingUpIcon } from "../Icons"
import { AuthContext } from "../../context/AuthContext" // Import AuthContext

import { mockApi } from "../../services/mockApi"

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })

function DashboardMetrics({ filters }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext) // Get user info and admin function
  const [metrics, setMetrics] = useState({
    totalLeads: "0",
    pendingFollowups: "0",
    quotationsSent: "0",
    quotationsTotalAmount: 0,
    ordersReceived: "0",
    advanceReceivedCount: "0",
    totalAdvanceReceived: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true)

        const data = await mockApi.fetchDashboardMetrics(currentUser, isAdmin, filters)

        setMetrics(data)

      } catch (error) {
        console.error("Error fetching metrics:", error)
        setError(error.message)
        // Use fallback demo values
        setMetrics({
          totalLeads: "124",
          pendingFollowups: "38",
          quotationsSent: "56",
          quotationsTotalAmount: 0,
          ordersReceived: "27",
          advanceReceivedCount: "0",
          totalAdvanceReceived: 0
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [currentUser, isAdmin, filters]) // Add dependencies for user context

  return (
    <div className="space-y-8">
      {/* Lead to Order Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          {/* Display admin view indicator similar to FollowUp page */}
          {isAdmin() && <p className="text-green-600 font-semibold">Admin View: Showing all data</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-6 mb-6">
          <MetricCard
            title="Total Leads"
            value={isLoading ? "Loading..." : metrics.totalLeads}
            icon={<UsersIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-sky-500 to-blue-600"
          />

          <MetricCard
            title="Follow Up Pending"
            value={isLoading ? "Loading..." : metrics.pendingFollowups}
            icon={<PhoneCallIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-blue-500 to-blue-600"
          />

          <MetricCard
            title="Quotations Sent"
            value={isLoading ? "Loading..." : metrics.quotationsSent}
            subtitle={!isLoading && `Total: ₹${formatCurrency(metrics.quotationsTotalAmount)}`}
            icon={<FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-emerald-500 to-green-600"
          />

          <MetricCard
            title="Orders Received"
            value={isLoading ? "Loading..." : metrics.ordersReceived}
            icon={<ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-sky-500 to-blue-600"
          />

          <MetricCard
            title="Advance Received"
            value={isLoading ? "Loading..." : metrics.advanceReceivedCount}
            subtitle={!isLoading && `Total: ₹${formatCurrency(metrics.totalAdvanceReceived)}`}
            icon={<TrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
            color="from-fuchsia-500 to-purple-600"
          />
        </div>
      </div>


    </div>
  )
}

function MetricCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-150 dark:border-slate-800 overflow-hidden flex flex-col justify-between">
      <div className={`h-1.5 bg-gradient-to-r ${color}`} />
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 truncate">{title}</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 tracking-tight truncate">{value}</h3>
          </div>
          <div className={`p-2 rounded-xl bg-gradient-to-r ${color} text-white shrink-0 shadow-2xs`}>{icon}</div>
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
