import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
  PlusCircle,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  fetchCommitmentHistory,
  fetchMisUsers,
  saveMisCommitment,
} from "../services/misApi";
import RecordCommitmentModal from "../components/RecordCommitmentModal";
import { useMagicToast } from "../../../context/MagicToastContext";
import { getDefaultWeekRange } from "../constants/misDefaults";

export default function MisHistoryCommitmentPage() {
  const { showToast } = useMagicToast();

  // Tabs: 'commitments' | 'rate_history'
  const [activeTab, setActiveTab] = useState("commitments");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [selectedNameFilter, setSelectedNameFilter] = useState("all");

  // Data states
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Modal for new commitment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  // Load all users
  useEffect(() => {
    fetchMisUsers().then((res) => setAllUsers(res));
  }, []);

  // Fetch commitment history records
  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchCommitmentHistory({
        userName: selectedNameFilter,
        searchQuery,
      });
      setRecords(data);
    } catch (err) {
      console.error("Error loading commitment history:", err);
      showToast?.("Failed to load commitment history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedNameFilter, searchQuery]);

  // Unique Dates for dropdown
  const uniqueDates = useMemo(() => {
    const dates = new Set();
    records.forEach((r) => {
      const s = String(r.date_start || "").split("T")[0];
      const e = String(r.date_end || "").split("T")[0];
      if (s && e) {
        dates.add(`${s} to ${e}`);
      }
    });
    return Array.from(dates);
  }, [records]);

  // Filtered by date dropdown
  const filteredRecords = useMemo(() => {
    if (selectedDateFilter === "all") return records;
    const [start, end] = selectedDateFilter.split(" to ");
    return records.filter((r) => {
      const s = String(r.date_start || "").split("T")[0];
      const e = String(r.date_end || "").split("T")[0];
      return s === start && e === end;
    });
  }, [records, selectedDateFilter]);

  // Unique persons count
  const uniquePersonsCount = useMemo(() => {
    const names = new Set(filteredRecords.map((r) => r.user_name));
    return names.size;
  }, [filteredRecords]);

  // Handle saving commitment
  const handleSaveCommitment = async (data) => {
    const res = await saveMisCommitment(data);
    if (res.error) {
      showToast?.("Failed to save commitment", "error");
    } else {
      showToast?.("Commitment recorded successfully", "success");
      loadHistory();
    }
  };

  // Open modal to add a new record
  const handleAddNewCommitment = () => {
    const defWeek = getDefaultWeekRange();
    setEditingRow({
      user_name: allUsers[0]?.user_name || "",
      department: allUsers[0]?.department || "General",
      designation: allUsers[0]?.designation || "Employee",
      target: 6,
      actualWorkDone: 0,
      pending: 6,
      allPending: 0,
      commitment: "",
      status: "pending",
      remarks: "",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit trail of employee weekly review commitments, targets, and actuals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge matching screenshot */}
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700">
            {filteredRecords.length} of {records.length} records
          </span>
          <button
            onClick={handleAddNewCommitment}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Record
          </button>
        </div>
      </div>

      {/* 2. Tabs Bar (Commitments | Rate History) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("commitments")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "commitments"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
          }`}
        >
          Commitments
        </button>
        <button
          onClick={() => setActiveTab("rate_history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "rate_history"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
          }`}
        >
          Rate History
        </button>
      </div>

      {/* 3. Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, department or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* All Dates select */}
          <select
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* All Names select */}
          <select
            value={selectedNameFilter}
            onChange={(e) => setSelectedNameFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Names</option>
            {allUsers.map((u) => (
              <option key={u.id || u.user_name} value={u.user_name}>
                {u.user_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            TOTAL RECORDS
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {filteredRecords.length}
          </div>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            UNIQUE PERSONS
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {uniquePersonsCount}
          </div>
        </div>
      </div>

      {/* 5. Commitment Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm">
          Commitment Records
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">S.NO</th>
                <th className="py-2.5 px-3">DATE START</th>
                <th className="py-2.5 px-3">DATE END</th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">DEPARTMENT</th>
                <th className="py-2.5 px-3 text-center">TARGET</th>
                <th className="py-2.5 px-3 text-center">SCORE</th>
                <th className="py-2.5 px-3 text-center">ACTUAL WORK DONE</th>
                <th className="py-2.5 px-3 text-center">% NOT DONE</th>
                <th className="py-2.5 px-3 text-center">ON TIME NOT DONE %</th>
                <th className="py-2.5 px-3 text-center">TOTAL WORK DONE</th>
                <th className="py-2.5 px-3 text-center">PENDING</th>
                <th className="py-2.5 px-3 text-center">ALL PENDING</th>
                <th className="py-2.5 px-4 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-extrabold">
                  COMMITMENT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                    Loading commitment history...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr
                    key={r.id || idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">{r.date_start}</td>
                    <td className="py-2.5 px-3">{r.date_end}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white capitalize">
                      {r.user_name}
                    </td>
                    <td className="py-2.5 px-3">{r.department}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {r.target}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {r.score || "Positive (+)"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {r.actual_work_done}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-rose-600">
                      {r.percent_not_done}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-amber-600">
                      {r.percent_not_done_on_time}%
                    </td>
                    <td className="py-2.5 px-3 text-center">{r.total_work_done}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-orange-600">
                      {r.pending}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                      {r.all_pending}
                    </td>
                    <td className="py-2.5 px-4 bg-rose-50/40 dark:bg-rose-950/10 font-medium text-slate-800 dark:text-slate-200">
                      {r.commitment || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to record commitment */}
      <RecordCommitmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCommitment}
        userRow={editingRow}
        startDate={editingRow?.date_start || getDefaultWeekRange().startDate}
        endDate={editingRow?.date_end || getDefaultWeekRange().endDate}
        periodType="weekly"
        usersList={allUsers}
      />
    </div>
  );
}
