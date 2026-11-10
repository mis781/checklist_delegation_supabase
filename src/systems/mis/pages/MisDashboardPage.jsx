import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  Download,
  Calendar,
  Filter,
  Search,
  Trophy,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Edit3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  fetchLiveMisDashboardData,
  fetchMisUsers,
  saveMisCommitment,
  saveBulkCommitments,
} from "../services/misApi";
import {
  getDefaultWeekRange,
  getDefaultMonthRange,
  formatRangeDisplay,
} from "../constants/misDefaults";
import { exportMisDashboardPdf } from "../services/misPdfExport";
import RecordCommitmentModal from "../components/RecordCommitmentModal";
import { useMagicToast } from "../../../context/MagicToastContext";

// Custom Tooltip for Department Scores Chart matching reference UI
function DepartmentScoreTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[220px] animate-fadeIn">
        <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
          {data.department} <span className="text-slate-400 font-normal">/ {data.company} · {data.peopleCount} people</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Target:</span>
            <span className="font-bold text-slate-900 dark:text-white">{data.target}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Actual Work Done:</span>
            <span className="font-bold text-slate-900 dark:text-white">{data.actualWorkDone}</span>
          </div>
          <div className="flex justify-between text-blue-600 dark:text-blue-400">
            <span>% Done:</span>
            <span className="font-bold">{data.percentDone}%</span>
          </div>
          <div className="flex justify-between text-teal-600 dark:text-teal-400">
            <span>% Done On Time:</span>
            <span className="font-bold">{data.percentDoneOnTime}%</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Total Work Done:</span>
            <span className="font-bold text-slate-900 dark:text-white">{data.totalWorkDone}</span>
          </div>
          <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
            <span>Pending (Period):</span>
            <span>{data.pending}</span>
          </div>
          <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>All Pending (Backlog):</span>
            <span>{data.allPending}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function MisDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useMagicToast();

  // Period filter state
  const [periodType, setPeriodType] = useState("weekly"); // 'weekly' | 'monthly'
  const defaultDates = useMemo(() => getDefaultWeekRange(), []);
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);

  // Filters
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedDesignation, setSelectedDesignation] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpiCards, setKpiCards] = useState({
    totalEmployees: 0,
    totalTarget: 0,
    completed: 0,
    pendingPeriod: 0,
    allPending: 0,
    completionRate: 0,
    overallScore: "Positive (+)",
  });
  const [peopleRows, setPeopleRows] = useState([]);
  const [topBestPerformers, setTopBestPerformers] = useState([]);
  const [topPendingByUser, setTopPendingByUser] = useState([]);
  const [topWorstPerformers, setTopWorstPerformers] = useState([]);
  const [departmentScores, setDepartmentScores] = useState([]);

  // Modal state
  const [activeModalUser, setActiveModalUser] = useState(null);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);

  // Load user directory
  useEffect(() => {
    fetchMisUsers().then((res) => setAllUsers(res));
  }, []);

  // Handle Weekly / Monthly Toggle
  const handlePeriodToggle = (type) => {
    setPeriodType(type);
    if (type === "weekly") {
      const w = getDefaultWeekRange();
      setStartDate(w.startDate);
      setEndDate(w.endDate);
    } else {
      const m = getDefaultMonthRange();
      setStartDate(m.startDate);
      setEndDate(m.endDate);
    }
  };

  // Main Dashboard Data Fetch
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await fetchLiveMisDashboardData({
        startDate,
        endDate,
        periodType,
        selectedUser,
        department: selectedDept,
      });

      setKpiCards(data.kpiCards);
      setPeopleRows(data.peopleRows);
      setTopBestPerformers(data.topBestPerformers);
      setTopPendingByUser(data.topPendingByUser);
      setTopWorstPerformers(data.topWorstPerformers);
      setDepartmentScores(data.departmentScores);
    } catch (err) {
      console.error("Failed to load MIS dashboard:", err);
      showToast?.("Error fetching MIS dashboard data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [startDate, endDate, periodType, selectedUser, selectedDept]);

  // Designations list
  const designations = useMemo(() => {
    const set = new Set();
    peopleRows.forEach((r) => {
      if (r.designation) set.add(r.designation);
    });
    return Array.from(set).sort();
  }, [peopleRows]);

  // Filtered people table rows
  const filteredPeople = useMemo(() => {
    let rows = peopleRows;
    if (selectedDesignation !== "all") {
      rows = rows.filter((r) => r.designation === selectedDesignation);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.user_name.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.company.toLowerCase().includes(q) ||
          r.commitment.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [peopleRows, selectedDesignation, searchQuery]);

  // Save commitment from modal
  const handleSaveCommitment = async (updatedData) => {
    const res = await saveMisCommitment(updatedData);
    if (res.error) {
      showToast?.("Failed to save commitment", "error");
    } else {
      showToast?.("Commitment saved successfully", "success");
      loadDashboard();
    }
  };

  // Snapshot / Bulk save all current rows
  const handleSnapshotAll = async () => {
    try {
      setRefreshing(true);
      const res = await saveBulkCommitments(peopleRows);
      if (res.error) {
        showToast?.("Failed to record review commitments", "error");
      } else {
        showToast?.(`Recorded commitments snapshot for ${res.count} employees`, "success");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // Export PDF
  const handleExportPdf = () => {
    const rangeDisplay = formatRangeDisplay(startDate, endDate);
    exportMisDashboardPdf({
      kpiCards,
      peopleRows: filteredPeople,
      dateRangeDisplay: rangeDisplay,
      periodType: periodType === "weekly" ? "Weekly" : "Monthly",
    });
    showToast?.("MIS PDF Report downloaded", "success");
  };

  const dateRangeDisplay = formatRangeDisplay(startDate, endDate);

  // Score Badge Color styling
  const getScoreBadge = (score) => {
    if (score?.includes("Positive")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    }
    if (score?.includes("Average")) {
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    }
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>MIS - WEEKLY REVIEW</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {dateRangeDisplay} · {kpiCards.totalEmployees} people tracked
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Date Picker Range */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none p-0 focus:outline-none text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
            />
            <span className="text-slate-400 font-bold">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none p-0 focus:outline-none text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
            />
          </div>

          {/* Weekly / Monthly Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => handlePeriodToggle("weekly")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                periodType === "weekly"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => handlePeriodToggle("monthly")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                periodType === "monthly"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* User selector dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-transparent border-none p-0 focus:outline-none text-xs cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Users</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.user_name}>
                  {u.user_name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Score Pill */}
          <div
            className={`px-3 py-1 text-xs font-bold rounded-xl border flex items-center gap-1.5 ${getScoreBadge(
              kpiCards.overallScore
            )}`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Score: {kpiCards.overallScore}</span>
          </div>
        </div>

        {/* Right Action: Performance History */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard/mis/history_commitment")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 rounded-xl transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Performance history
          </button>
        </div>
      </div>

      {/* 3. Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Card 1: TOTAL EMPLOYEES */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-blue-500 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {kpiCards.totalEmployees}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-2">
            TOTAL EMPLOYEES
          </span>
        </div>

        {/* Card 2: TOTAL TARGET */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-indigo-500 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {kpiCards.totalTarget}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-2">
            TOTAL TARGET
          </span>
        </div>

        {/* Card 3: COMPLETED */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-emerald-500 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {kpiCards.completed}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-2">
            COMPLETED
          </span>
        </div>

        {/* Card 4: PENDING (PERIOD) */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-orange-500 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {kpiCards.pendingPeriod}
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-2">
            PENDING (PERIOD)
          </span>
        </div>

        {/* Card 5: ALL PENDING (TILL DATE) */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {kpiCards.allPending.toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-2">
            ALL PENDING (TILL DATE)
          </span>
        </div>

        {/* Card 6: COMPLETION RATE */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {kpiCards.completionRate}%
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2">
            <span>COMPLETION RATE</span>
            <span className="text-slate-400">{kpiCards.completed} / {kpiCards.totalTarget}</span>
          </div>
        </div>
      </div>

      {/* 4. List of People (Dual Header Table) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              List of People
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click a name to see their work, system by system
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Designations Filter */}
            <select
              value={selectedDesignation}
              onChange={(e) => setSelectedDesignation(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Designations</option>
              {designations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Snapshot Action */}
            <button
              onClick={handleSnapshotAll}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-all disabled:opacity-50"
              title="Save a snapshot of this review period's scores into database"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Snapshot Review
            </button>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            {/* Dual Group Headers */}
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                <th
                  colSpan={10}
                  className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800"
                >
                  THIS PERIOD
                </th>
                <th
                  colSpan={3}
                  className="py-2.5 px-4 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-extrabold"
                >
                  LAST WEEK - COMMITMENT
                </th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-8">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">DESIGNATION</th>
                <th className="py-2.5 px-3 text-center">TARGET</th>
                <th className="py-2.5 px-3 text-center">ACTUAL WORK DONE</th>
                <th className="py-2.5 px-3 text-center">% DONE</th>
                <th className="py-2.5 px-3 text-center">% DONE ON TIME</th>
                <th className="py-2.5 px-3 text-center">TOTAL WORK DONE</th>
                <th className="py-2.5 px-3 text-center">PENDING</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800">
                  ALL PENDING
                </th>
                <th className="py-2.5 px-3 text-center bg-amber-50/40 dark:bg-amber-950/10">
                  PLANNED % WORK NOT DONE
                </th>
                <th className="py-2.5 px-3 text-center bg-amber-50/40 dark:bg-amber-950/10">
                  PLANNED % WORK NOT DONE ON TIME
                </th>
                <th className="py-2.5 px-3 bg-amber-50/40 dark:bg-amber-950/10">
                  COMMITMENT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                    Calculating live MIS metrics across systems...
                  </td>
                </tr>
              ) : filteredPeople.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    No employee records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPeople.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {r.profile_image ? (
                          <img
                            src={r.profile_image}
                            alt={r.user_name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase">
                            {r.user_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white capitalize">
                            {r.user_name}
                          </div>
                          <div className="text-[10px] text-slate-400">{r.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {r.designation}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {r.target}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {r.actualWorkDone}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {r.percentDone !== null ? (
                        <span className={r.percentDone >= 80 ? "text-emerald-600" : r.percentDone >= 50 ? "text-amber-600" : "text-slate-500"}>
                          {r.percentDone}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {r.percentDoneOnTime !== null ? (
                        <span className={r.percentDoneOnTime >= 80 ? "text-teal-600" : "text-amber-600"}>
                          {r.percentDoneOnTime}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 font-semibold">
                      {r.totalWorkDone}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          r.pending === 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {r.pending}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                      {r.allPending}
                    </td>

                    {/* Last Week Commitment Group */}
                    <td className="py-2.5 px-3 text-center bg-amber-50/20 dark:bg-amber-950/5 text-slate-600 dark:text-slate-400">
                      {r.plannedPercentNotDone}%
                    </td>
                    <td className="py-2.5 px-3 text-center bg-amber-50/20 dark:bg-amber-950/5 text-slate-600 dark:text-slate-400">
                      {r.plannedPercentNotDoneOnTime}%
                    </td>
                    <td className="py-2.5 px-3 bg-amber-50/20 dark:bg-amber-950/5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {r.commitment || "No commitment"}
                        </span>
                        <button
                          onClick={() => {
                            setActiveModalUser(r);
                            setIsCommitmentModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit or record commitment"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Lower Analytics Section (Screenshot 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Top 5 Best Performers */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top 5 Best Performers
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                {dateRangeDisplay.split("-")[0]?.trim() || "Period"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">
              % Done, then on time, work done, pending
            </p>

            <div className="space-y-3">
              {topBestPerformers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No performer data</p>
              ) : (
                topBestPerformers.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {p.profile_image ? (
                        <img
                          src={p.profile_image}
                          alt={p.user_name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center uppercase">
                          {p.user_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 capitalize">
                          {p.user_name}
                        </div>
                        <div className="text-[10px] text-slate-400">{p.company}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {p.percentDone !== null ? `${p.percentDone}%` : "0%"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.actualWorkDone}/{p.target} done · {p.percentDoneOnTime || 0}% on time
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Pending Tasks by User */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pending Tasks by User
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                {dateRangeDisplay.split("-")[0]?.trim() || "Period"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">
              Pending in this period, out of their tasks
            </p>

            <div className="space-y-3">
              {topPendingByUser.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No pending tasks</p>
              ) : (
                topPendingByUser.map((p, idx) => {
                  const pct = p.target > 0 ? Math.min(100, Math.round((p.pending / p.target) * 100)) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              idx === 0
                                ? "bg-rose-500 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          {p.profile_image ? (
                            <img
                              src={p.profile_image}
                              alt={p.user_name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center uppercase">
                              {p.user_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 capitalize">
                              {p.user_name}
                            </div>
                            <div className="text-[10px] text-slate-400">{p.company}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400">
                            {p.pending > 0 ? p.pending : p.allPending}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            {p.pending > 0 ? `of ${p.target} tasks` : `backlog tasks`}
                          </span>
                        </div>
                      </div>
                      {/* Orange solid progress bar matching screenshot */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              p.target > 0
                                ? Math.min(100, Math.round((p.pending / p.target) * 100))
                                : p.allPending > 0
                                ? Math.min(100, Math.round((p.allPending / 10) * 100))
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Top 5 Worst Performers */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top 5 Worst Performers
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                {dateRangeDisplay.split("-")[0]?.trim() || "Period"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">
              Lowest % done first (reverse of best)
            </p>

            <div className="space-y-3">
              {topWorstPerformers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No data</p>
              ) : (
                topWorstPerformers.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0
                            ? "bg-rose-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {p.profile_image ? (
                        <img
                          src={p.profile_image}
                          alt={p.user_name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center uppercase">
                          {p.user_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 capitalize">
                          {p.user_name}
                        </div>
                        <div className="text-[10px] text-slate-400">{p.company}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                        {p.percentDone !== null ? `${p.percentDone}%` : "0%"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.actualWorkDone}/{p.target} done · {p.percentDoneOnTime || 0}% on time
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Department Scores Chart (Bottom of Screen 2) */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Department Scores
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {departmentScores.length} departments · {kpiCards.pendingPeriod} pending works · Score: {kpiCards.overallScore} · hover a column for details
              </p>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span className="text-slate-600 dark:text-slate-300">Total pending works</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-300">Work Done %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span className="text-slate-600 dark:text-slate-300">Done On Time %</span>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="w-full h-72">
          {departmentScores.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No department data available for chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentScores}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<DepartmentScoreTooltip />} />
                <Bar dataKey="pending" fill="#FB923C" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="percentDone" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="percentDoneOnTime" fill="#14B8A6" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Record / Edit Commitment Modal */}
      <RecordCommitmentModal
        isOpen={isCommitmentModalOpen}
        onClose={() => setIsCommitmentModalOpen(false)}
        onSave={handleSaveCommitment}
        userRow={activeModalUser}
        startDate={startDate}
        endDate={endDate}
        periodType={periodType}
      />
    </div>
  );
}
