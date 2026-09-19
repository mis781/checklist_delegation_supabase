

"use client"

import { useState, useEffect, useContext } from "react"
import { AuthContext } from "../../context/AuthContext" // Import AuthContext
import { mockApi } from "../../services/mockApi"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// Fallback data in case of errors
const fallbackLeadData = [
  { month: "Jan", leads: 45, quotations: 30, orders: 12 },
  { month: "Feb", leads: 52, quotations: 35, orders: 15 },
  { month: "Mar", leads: 48, quotations: 32, orders: 14 },
  { month: "Apr", leads: 70, quotations: 45, orders: 20 },
  { month: "May", leads: 65, quotations: 40, orders: 18 },
  { month: "Jun", leads: 58, quotations: 38, orders: 16 },
]

const fallbackConversionData = [
  { name: "Leads", value: 124, color: "#0284c7" },
  { name: "Quotations", value: 82, color: "#0ea5e9" },
  { name: "Advance Received", value: 56, color: "#38bdf8" },
  { name: "Orders", value: 27, color: "#7dd3fc" },
]

const fallbackSourceData = [
  { name: "Indiamart", value: 45, color: "#0369a1" },
  { name: "Justdial", value: 28, color: "#0ea5e9" },
  { name: "Social Media", value: 20, color: "#38bdf8" },
  { name: "Website", value: 15, color: "#7dd3fc" },
  { name: "Referrals", value: 12, color: "#bae6fd" },
]

function DashboardCharts({ filters }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext) // Get user info and admin function
  const [activeTab, setActiveTab] = useState("overview")
  const [leadData, setLeadData] = useState(fallbackLeadData)
  const [conversionData, setConversionData] = useState(fallbackConversionData)
  const [sourceData, setSourceData] = useState(fallbackSourceData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        const { leadData, conversionData, sourceData } = await mockApi.fetchDashboardAppCharts(currentUser, isAdmin, filters);

        setLeadData(leadData || []);
        setConversionData(conversionData || []);
        setSourceData(sourceData || []);

      } catch (error) {
        console.error("Error fetching chart data:", error)
        setError(error.message)
        // Fallback to demo data is already handled since we initialized state with it
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentUser, isAdmin, filters])



  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Sales Analytics ( Lead To Order )</h3>
        {/* Display admin view indicator similar to FollowUp page */}
        {isAdmin() && <p className="text-green-600 font-semibold">Admin View: Showing all data</p>}
      </div>

      <div className="mb-4">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${activeTab === "overview" ? "bg-sky-500 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("conversion")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "conversion" ? "bg-sky-500 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
          >
            Conversion
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${activeTab === "sources" ? "bg-sky-500 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
          >
            Lead Sources
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-slate-500">Loading chart data...</p>
        </div>
      ) : error ? (
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-red-500">Error loading data. Using fallback data.</p>
        </div>
      ) : (
        <div className="h-[350px]">
          {activeTab === "overview" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" name="Leads" fill="#0ea5e9" />
                <Bar dataKey="quotations" name="Quotations" fill="#38bdf8" />
                <Bar dataKey="orders" name="Orders" fill="#0284c7" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeTab === "conversion" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              <div className="h-full w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={conversionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {conversionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col justify-center overflow-y-auto max-h-[350px]">
                <h4 className="text-lg font-medium mb-4">Conversion Funnel</h4>
                <div className="space-y-4">
                  {conversionData.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{
                            width: `${(item.value / (conversionData[0].value || 1)) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "sources" && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardCharts
