import React, { useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  X,
  Search,
  Building2,
  User,
  Phone,
  ArrowRight,
  Calendar,
  IndianRupee,
  FileSpreadsheet,
  Users,
  PhoneCall,
  FileText,
  ShoppingCart,
  TrendingUp
} from "lucide-react"

const formatCurrency = (val) =>
  Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (dateStr) => {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  } catch {
    return dateStr
  }
}

const MODAL_CONFIGS = {
  totalLeads: {
    title: "Total Leads",
    subtitle: "All inquiries and prospects assigned to your current filter scope",
    icon: Users,
    color: "from-sky-500 to-blue-600",
    badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
  },
  pendingFollowups: {
    title: "Follow Up Pending",
    subtitle: "Leads with pending status awaiting customer interaction or update",
    icon: PhoneCall,
    color: "from-blue-500 to-indigo-600",
    badgeBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
  },
  quotationsSent: {
    title: "Quotations Sent",
    subtitle: "Proposals and quotes sent to customers with values",
    icon: FileText,
    color: "from-emerald-500 to-green-600",
    badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
    showAmount: true
  },
  ordersReceived: {
    title: "Orders Received",
    subtitle: "Converted accounts and won sales orders",
    icon: ShoppingCart,
    color: "from-sky-500 to-blue-600",
    badgeBg: "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300"
  },
  advanceReceived: {
    title: "Advance Received",
    subtitle: "Advances and token payments recorded from clients",
    icon: TrendingUp,
    color: "from-fuchsia-500 to-purple-600",
    badgeBg: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/80 dark:text-fuchsia-300",
    showAmount: true
  }
}

export default function MetricDetailModal({
  isOpen,
  onClose,
  metricKey,
  items = [],
  totalAmount = 0
}) {
  const [searchTerm, setSearchTerm] = useState("")

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  const config = MODAL_CONFIGS[metricKey] || {
    title: "Metric Details",
    subtitle: "Detailed list of items",
    icon: Users,
    color: "from-blue-500 to-indigo-600",
    badgeBg: "bg-blue-100 text-blue-700"
  }
  const IconComponent = config.icon

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items
    const q = searchTerm.toLowerCase().trim()
    return items.filter((item) => {
      const matchCompany = item.companyName && item.companyName.toLowerCase().includes(q)
      const matchLeadNo = item.leadNo && String(item.leadNo).toLowerCase().includes(q)
      const matchQuoteNo = item.quotationNo && String(item.quotationNo).toLowerCase().includes(q)
      const matchPerson = item.personName && item.personName.toLowerCase().includes(q)
      const matchContact = item.contactPerson && item.contactPerson.toLowerCase().includes(q)
      const matchPhone = item.phoneNumber && String(item.phoneNumber).includes(q)
      const matchSales = item.salesPerson && item.salesPerson.toLowerCase().includes(q)
      const matchDivision = item.division && item.division.toLowerCase().includes(q)
      const matchStatus = item.status && item.status.toLowerCase().includes(q)
      return (
        matchCompany ||
        matchLeadNo ||
        matchQuoteNo ||
        matchPerson ||
        matchContact ||
        matchPhone ||
        matchSales ||
        matchDivision ||
        matchStatus
      )
    })
  }, [items, searchTerm])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className={`h-2 bg-gradient-to-r ${config.color}`} />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${config.color} text-white shadow-sm shrink-0`}>
              <IconComponent size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {config.title}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${config.badgeBg}`}>
                  {items.length} {items.length === 1 ? "Item" : "Items"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
                {config.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config.showAmount && totalAmount > 0 && (
              <div className="text-right px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Total Value</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  ₹{formatCurrency(totalAmount)}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search Filter Strip */}
        <div className="px-5 sm:px-6 py-3 border-b border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by company, lead #, quote #, contact, rep..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500 font-medium">
            Showing {filteredItems.length} of {items.length} records
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {filteredItems.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-gray-400 mb-3">
                <Search size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">No Records Found</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? "No matching records found for your search term. Try a different query."
                  : "There are no records recorded under this category for the current filter criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-left text-xs text-gray-600 dark:text-slate-300">
                <thead className="bg-gray-50/80 dark:bg-slate-800/80 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Lead / Quote No</th>
                    <th className="px-4 py-3">Company & Contact</th>
                    <th className="px-4 py-3">Sales Person</th>
                    <th className="px-4 py-3">Division</th>
                    <th className="px-4 py-3">Date</th>
                    {config.showAmount ? (
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                    ) : (
                      <th className="px-4 py-3">Status</th>
                    )}
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredItems.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Lead/Quote No */}
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{item.quotationNo || item.leadNo || "-"}</span>
                          {item.type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 uppercase">
                              {item.type}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company & Contact */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Building2 size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={item.companyName}>
                            {item.companyName || "Unknown Company"}
                          </span>
                        </div>
                        {(item.personName || item.contactPerson) && (
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <User size={11} className="text-gray-400 shrink-0" />
                            <span>{item.personName || item.contactPerson}</span>
                            {item.phoneNumber && (
                              <a
                                href={`tel:${item.phoneNumber}`}
                                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline ml-1 inline-flex items-center gap-0.5"
                              >
                                <Phone size={10} />
                                {item.phoneNumber}
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Sales Person */}
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">
                        {item.salesPerson || item.owner || "-"}
                      </td>

                      {/* Division */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                          {item.division || "-"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>

                      {/* Amount or Status */}
                      {config.showAmount ? (
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{formatCurrency(item.amount)}
                        </td>
                      ) : (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            {item.status || "Active"}
                          </span>
                        </td>
                      )}

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {item.link ? (
                          <Link to={item.link} onClick={onClose}>
                            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/80 transition-all cursor-pointer">
                              Open
                              <ArrowRight size={13} />
                            </button>
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
          <div>
            Click <strong>Open</strong> to view or proceed with that specific record.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
