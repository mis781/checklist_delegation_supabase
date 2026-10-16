import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ListFilter,
  PlusCircle,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit2,
  Calendar,
  User,
  RefreshCw,
  X,
  FileText,
  Eye,
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePagePermission } from "../../../utils/pagePermissionUtils";
import { isAdministrator } from "../../../utils/roleUtils";
import {
  fetchUserQueries,
  fetchAllQueries,
  updateQueryStatus,
} from "../services/queryApi";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60" },
  { value: "In Progress", label: "In Progress", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60" },
  { value: "Resolved", label: "Resolved", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60" },
  { value: "Closed", label: "Closed", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700" },
  { value: "Rejected", label: "Rejected", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60" },
];

function formatDateTimeDisplay(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatDateOnly(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function QueryTrackerPage() {
  const { showToast } = useMagicToast();

  const currentUsername = localStorage.getItem("user-name") || "User";
  const currentUserRole = localStorage.getItem("role") || "user";

  // Permission evaluation for editing status
  const { canWrite, isSuperAdmin } = usePagePermission("query_tracker");
  const canEditStatus = Boolean(
    isSuperAdmin || canWrite || isAdministrator(currentUserRole, currentUsername)
  );

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Filters
  const [viewScope, setViewScope] = useState("my"); // "my" or "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [systemFilter, setSystemFilter] = useState("ALL");

  // Detail Modal
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    let res;
    if (viewScope === "all" && canEditStatus) {
      res = await fetchAllQueries();
    } else {
      res = await fetchUserQueries(currentUsername);
    }

    if (res.error) {
      showToast(res.error.message || "Failed to load query tickets", "error");
    } else {
      setTickets(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewScope]);

  const handleStatusChange = async (ticketId, newStatus) => {
    if (!canEditStatus) {
      showToast("Access Denied: You do not have permission to edit ticket status", "error");
      return;
    }

    setUpdatingId(ticketId);
    const { error } = await updateQueryStatus(ticketId, newStatus, currentUsername);
    setUpdatingId(null);

    if (error) {
      showToast(error.message || "Failed to update status", "error");
    } else {
      showToast(`Ticket status updated to ${newStatus}`, "success");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus, updated_by: currentUsername } : t))
      );
      if (selectedTicketForDetail?.id === ticketId) {
        setSelectedTicketForDetail((prev) => ({ ...prev, status: newStatus, updated_by: currentUsername }));
      }
    }
  };

  // Unique systems in the current ticket set for filtering
  const distinctSystems = useMemo(() => {
    const list = Array.from(new Set(tickets.map((t) => t.system_name).filter(Boolean)));
    list.sort();
    return list;
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (systemFilter !== "ALL" && t.system_name !== systemFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const ticketNo = (t.ticket_no || "").toLowerCase();
        const system = (t.system_name || "").toLowerCase();
        const stage = (t.stage || "").toLowerCase();
        const problem = (t.problem_description || "").toLowerCase();
        const reporter = (t.reported_by || "").toLowerCase();

        return (
          ticketNo.includes(query) ||
          system.includes(query) ||
          stage.includes(query) ||
          problem.includes(query) ||
          reporter.includes(query)
        );
      }

      return true;
    });
  }, [tickets, statusFilter, systemFilter, searchQuery]);

  // Counts for metric cards
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === "Pending").length;
    const inProgress = tickets.filter((t) => t.status === "In Progress").length;
    const resolved = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
    return { total, pending, inProgress, resolved };
  }, [tickets]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <ListFilter className="h-4 w-4" />
            <span>Query Management System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Query & Ticket Tracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor raised queries, track completion milestones, and inspect resolution statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadTickets}
            disabled={loading}
            title="Refresh ticket list"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-xs transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <Link
            to="/dashboard/query/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Raise New Query</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Total Queries
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
              Pending
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.pending}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
              In Progress
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.inProgress}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Resolved / Closed
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.resolved}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Filter and Control Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by ticket no, system, stage, or problem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Scope & Select Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Scope Toggle (Visible if user has edit/admin permission) */}
            {canEditStatus && (
              <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-750 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewScope("my")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewScope === "my"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  My Tickets
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewScope === "all"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Tickets (Admin)
                </button>
              </div>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Status: {opt.label}
                </option>
              ))}
            </select>

            {/* System Filter */}
            {distinctSystems.length > 0 && (
              <select
                value={systemFilter}
                onChange={(e) => setSystemFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
              >
                <option value="ALL">System: All</option>
                {distinctSystems.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Permission Info Note */}
        <div className="px-5 py-2 bg-slate-100/60 dark:bg-slate-850/40 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            {canEditStatus ? (
              <>
                <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Status Editing Enabled:
                </span>
                <span>You have authorized clearance to modify ticket statuses.</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Read-Only Status:
                </span>
                <span>Status changes are restricted to authorized reviewers.</span>
              </>
            )}
          </div>
          <span className="font-mono text-[11px]">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3 px-4">Ticket No</th>
                <th className="py-3 px-4">Reported Date</th>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">System Name</th>
                <th className="py-3 px-4">Stage / Page</th>
                <th className="py-3 px-4 max-w-[220px]">Problem Description</th>
                <th className="py-3 px-4 max-w-[200px]">Expected Solution</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-3 text-center">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span>Loading query tickets from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        No query tickets found
                      </p>
                      <p className="text-xs text-slate-400">
                        {searchQuery || statusFilter !== "ALL" || systemFilter !== "ALL"
                          ? "Try clearing your filters or search query."
                          : "You have not raised any query tickets yet."}
                      </p>
                      <Link
                        to="/dashboard/query/new"
                        className="mt-2 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Raise a Query Now
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((row) => {
                  const statusOpt =
                    STATUS_OPTIONS.find((s) => s.value === row.status) || STATUS_OPTIONS[0];

                  // Overdue check
                  const isPastDue =
                    row.expected_completion_date &&
                    new Date(row.expected_completion_date) < new Date(new Date().toDateString()) &&
                    row.status !== "Resolved" &&
                    row.status !== "Closed";

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors group"
                    >
                      {/* Ticket No */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60">
                          {row.ticket_no}
                        </span>
                      </td>

                      {/* Reported Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatDateTimeDisplay(row.reported_date || row.created_at)}
                      </td>

                      {/* Reported By */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{row.reported_by}</span>
                        </div>
                      </td>

                      {/* System Name */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {row.system_name}
                      </td>

                      {/* Stage */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                          {row.stage}
                        </span>
                      </td>

                      {/* Problem Description */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <p
                          title={row.problem_description}
                          className="truncate text-slate-700 dark:text-slate-300 leading-snug cursor-pointer hover:text-blue-600"
                          onClick={() => setSelectedTicketForDetail(row)}
                        >
                          {row.problem_description}
                        </p>
                      </td>

                      {/* Expected Solution */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <p
                          title={row.expected_solution}
                          className="truncate text-slate-600 dark:text-slate-400 leading-snug cursor-pointer hover:text-blue-600"
                          onClick={() => setSelectedTicketForDetail(row)}
                        >
                          {row.expected_solution}
                        </p>
                      </td>

                      {/* Expected Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span className={isPastDue ? "font-bold text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}>
                            {formatDateOnly(row.expected_completion_date)}
                          </span>
                          {isPastDue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Column (Editable ONLY if user has write/admin clearance) */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {canEditStatus ? (
                          <div className="relative inline-block">
                            <select
                              value={row.status}
                              disabled={updatingId === row.id}
                              onChange={(e) => handleStatusChange(row.id, e.target.value)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all ${statusOpt.color} ${
                                updatingId === row.id ? "opacity-50 cursor-wait" : ""
                              }`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span
                            title="Status is read-only. Modification requires edit access."
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-default ${statusOpt.color}`}
                          >
                            <Lock className="h-3 w-3 opacity-60" />
                            <span>{row.status}</span>
                          </span>
                        )}
                      </td>

                      {/* View Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketForDetail(row)}
                          title="View Full Ticket Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicketForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  {selectedTicketForDetail.ticket_no}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Ticket Overview
                </span>
              </div>
              <button
                onClick={() => setSelectedTicketForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/60">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-0.5">
                    Reported By
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTicketForDetail.reported_by}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-0.5">
                    Reported Date
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDateTimeDisplay(selectedTicketForDetail.reported_date || selectedTicketForDetail.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-0.5">
                    Target Completion
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDateOnly(selectedTicketForDetail.expected_completion_date)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-0.5">
                    System Name
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTicketForDetail.system_name}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-0.5">
                    Stage / Page
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTicketForDetail.stage}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-0.5">
                    Current Status
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTicketForDetail.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Problem Description
                </span>
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicketForDetail.problem_description}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Expected Solution
                </span>
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicketForDetail.expected_solution}
                </div>
              </div>

              {canEditStatus && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Update Ticket Status
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleStatusChange(selectedTicketForDetail.id, opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedTicketForDetail.status === opt.value
                            ? `${opt.color} ring-2 ring-blue-500`
                            : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/80 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTicketForDetail(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
