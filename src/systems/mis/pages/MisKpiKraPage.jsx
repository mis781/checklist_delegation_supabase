import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  Briefcase,
  Activity,
  Award,
  Users,
  MessageSquare,
  User,
  ChevronRight,
  Download,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import {
  fetchUserKpiKra,
  fetchSystemsResources,
  fetchMisUsers,
  saveUserKpiKra,
} from "../services/misApi";
import { exportKpiKraPdf } from "../services/misPdfExport";
import SuccessGuidesModal from "../components/SuccessGuidesModal";
import { useMagicToast } from "../../../context/MagicToastContext";
import { isAdminOrSuperAdmin } from "../../../utils/roleUtils";

export default function MisKpiKraPage() {
  const { showToast } = useMagicToast();

  const loggedInUser = localStorage.getItem("user-name") || "";
  const role = localStorage.getItem("role") || "";
  const isUserAdmin = isAdminOrSuperAdmin(role, loggedInUser);

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(loggedInUser || "");
  const [kpiData, setKpiData] = useState(null);
  const [systemsResources, setSystemsResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guide modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideInitialTab, setGuideInitialTab] = useState("works");

  // Edit mode for admins
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Load user directory
  useEffect(() => {
    fetchMisUsers().then((res) => {
      setAllUsers(res);
      if (res.length > 0) {
        const matchesLoggedIn = res.some(
          (u) => (u.user_name || "").toLowerCase() === (selectedUser || "").toLowerCase()
        );
        if (!selectedUser || !matchesLoggedIn) {
          setSelectedUser(res[0].user_name);
        }
      }
    });
  }, []);

  // Fetch KPI/KRA data and systems resources
  const loadKpiDetails = async (uname) => {
    if (!uname) return;
    try {
      setLoading(true);
      const [kpiRes, sysRes] = await Promise.all([
        fetchUserKpiKra(uname),
        fetchSystemsResources(),
      ]);
      setKpiData(kpiRes);
      setEditFormData(kpiRes || {});
      setSystemsResources(sysRes);
    } catch (err) {
      console.error("Error loading KPI details:", err);
      showToast?.("Error loading KPI/KRA dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      loadKpiDetails(selectedUser);
    }
  }, [selectedUser]);

  // Export PDF
  const handleExportPdf = () => {
    if (!kpiData) return;
    exportKpiKraPdf({ kpiData, systemsResources });
    showToast?.("KPI & KRA PDF report downloaded", "success");
  };

  // Open Guide modal
  const openGuide = (tab) => {
    setGuideInitialTab(tab);
    setIsGuideOpen(true);
  };

  // Save edited KPI/KRA
  const handleSaveKpi = async (e) => {
    e.preventDefault();
    const res = await saveUserKpiKra(editFormData);
    if (res.error) {
      showToast?.("Failed to update KPI/KRA", "error");
    } else {
      showToast?.("KPI & KRA profile updated successfully", "success");
      setIsEditing(false);
      loadKpiDetails(selectedUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              KPI & KRA Dashboard
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Role-specific performance metrics & resources
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* User selector for Admin */}
          {allUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-transparent border-none p-0 focus:outline-none cursor-pointer font-bold text-slate-800 dark:text-slate-200 capitalize"
              >
                {allUsers.map((u) => (
                  <option key={u.id || u.user_name} value={u.user_name}>
                    {u.user_name} ({u.designation})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isUserAdmin && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {isEditing ? "Cancel Edit" : "Configure KRA"}
            </button>
          )}

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500" />
          Loading role-specific performance metrics...
        </div>
      ) : isEditing ? (
        /* Edit Mode Form for Admins */
        <form onSubmit={handleSaveKpi} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            Configure KRA Profile for {selectedUser}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Official Designation
              </label>
              <input
                type="text"
                value={editFormData.official_designation || ""}
                onChange={(e) => setEditFormData({ ...editFormData, official_designation: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Target Task Velocity (Daily Tasks)
              </label>
              <input
                type="number"
                step="0.5"
                value={editFormData.task_velocity || 0}
                onChange={(e) => setEditFormData({ ...editFormData, task_velocity: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Primary Role & Core Objectives
              </label>
              <textarea
                rows={2}
                value={editFormData.primary_role || ""}
                onChange={(e) => setEditFormData({ ...editFormData, primary_role: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Methodology Protocol
              </label>
              <input
                type="text"
                value={editFormData.methodology || ""}
                onChange={(e) => setEditFormData({ ...editFormData, methodology: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Key Reporting Person
              </label>
              <input
                type="text"
                value={editFormData.key_reporting_person || ""}
                onChange={(e) => setEditFormData({ ...editFormData, key_reporting_person: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Save Configuration
            </button>
          </div>
        </form>
      ) : (
        /* Regular Dashboard View Matching Screenshot 4 */
        <div className="space-y-6">
          {/* Top 3 Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Official Designation */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Official Designation
                  </h3>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    PRIMARY ROLE
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {kpiData?.primary_role || "No role description available"}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Task Velocity */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Task Velocity
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {kpiData?.task_velocity || 0}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {kpiData?.task_velocity_unit || "daily tasks"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, ((kpiData?.task_velocity || 0) / 10) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Success Guides */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Success Guides
                  </h3>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => openGuide("works")}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all text-left"
                  >
                    <span>How Scoring Works</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => openGuide("better")}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all text-left"
                  >
                    <span>How To Score Better</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Middle 2 Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 4: Collaborative Network */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Collaborative Network
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {kpiData?.collaborative_team?.length
                    ? kpiData.collaborative_team.join(", ")
                    : "No team data available"}
                </p>
              </div>
            </div>

            {/* Card 5: Communication Protocol */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Communication Protocol
                  </h3>
                </div>

                <div className="p-4 rounded-xl bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 block mb-0.5">
                      METHODOLOGY
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {kpiData?.methodology || "Protocol not defined"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-cyan-100/60 dark:border-cyan-900/40">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        KEY REPORTING PERSON
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                        {kpiData?.key_reporting_person || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card: Systems & Resources (Enterprise Tools Architecture) */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Systems & Resources
                </h3>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                ENTERPRISE TOOLS ARCHITECTURE
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">PLATFORM</th>
                    <th className="py-2.5 px-3">OBJECTIVE</th>
                    <th className="py-2.5 px-3">CONTEXT / DESCRIPTION</th>
                    <th className="py-2.5 px-3 text-right">ACCESS POINT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {systemsResources.map((s, idx) => (
                    <tr
                      key={s.id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {s.platform}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[220px]">
                        {s.objective}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-[320px]">
                        {s.context_description}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={s.access_point}
                          className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                        >
                          <span>Open Tool</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Success Guides Modal */}
      <SuccessGuidesModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        initialTab={guideInitialTab}
      />
    </div>
  );
}
