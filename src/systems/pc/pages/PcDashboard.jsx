import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  RefreshCw,
  ClipboardList,
  AlertTriangle,
  Layers,
  UserX,
  Search,
  Download,
  Loader2,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "../../checklist/components/layout/AdminLayout";
import { fetchAllPendingSummary } from "../../../services/pendingSummary";
import { fetchStageAccess, accessFor } from "../../../services/pendingSummary/stageAccess";
import { DOCS_DATA_CHANGED_EVENT } from "../../docs/services/docsSupabaseApi";

const AUTO_REFRESH_MS = 2 * 60 * 1000;
const NOT_ASSIGNED = "__not_assigned__";
const MAX_NAMES = 3;

// Compact list of user names: first few as chips, the rest as "+N" (full list in the tooltip)
function NameList({ names, tone, empty = "—" }) {
  if (!names || names.length === 0) return <span className="text-xs text-gray-400">{empty}</span>;
  const shown = names.slice(0, MAX_NAMES);
  const rest = names.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1" title={names.join(", ")}>
      {shown.map((n) => (
        <span key={n} className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${tone}`}>
          {n}
        </span>
      ))}
      {rest > 0 && <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-500">+{rest}</span>}
    </div>
  );
}

export default function PcDashboard() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState([]);
  const [access, setAccess] = useState({});
  const [accessError, setAccessError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Filters start from the query string so "Back" from a stage page keeps them
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [systemFilter, setSystemFilter] = useState(() => searchParams.get("system") || "all");
  const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get("department") || "all");
  const [personFilter, setPersonFilter] = useState(() => searchParams.get("person") || "all");
  const [overdueOnly, setOverdueOnly] = useState(() => searchParams.get("overdue") === "1");
  const [stageFilter, setStageFilter] = useState("all"); // "systemKey:stageKey"
  const [responsibleFilter, setResponsibleFilter] = useState("all"); // MIS user name or NOT_ASSIGNED

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [data, accessMap] = await Promise.all([
        fetchAllPendingSummary({ scope: "all" }),
        fetchStageAccess().catch((err) => {
          console.error("Error loading stage access:", err);
          setAccessError("Could not load user access for stages.");
          return null;
        }),
      ]);
      setSystems(data);
      if (accessMap) {
        setAccess(accessMap);
        setAccessError("");
      }
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), AUTO_REFRESH_MS);
    const events = ["purchase-return-updated", "leads-updated", DOCS_DATA_CHANGED_EVENT];
    const onChange = () => load();
    events.forEach((e) => window.addEventListener(e, onChange));
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, onChange));
    };
    // O2D's DATA_CHANGED_EVENT is not a trigger: fetchO2DPending's own hydration fires it, which would loop
  }, [load]);

  // Filter options come from the unfiltered data
  const { departments, persons } = useMemo(() => {
    const deps = new Set();
    const pers = new Set();
    systems.forEach((s) =>
      s.stages.forEach((st) =>
        st.items.forEach((i) => {
          if (i.department) deps.add(i.department);
          if (i.person) pers.add(i.person);
        }),
      ),
    );
    return {
      departments: [...deps].sort((a, b) => a.localeCompare(b)),
      persons: [...pers].sort((a, b) => a.localeCompare(b)),
    };
  }, [systems]);

  // Stage options follow the system filter; labels include the system when several systems are listed
  const stageOptions = useMemo(
    () =>
      systems
        .filter((s) => systemFilter === "all" || s.key === systemFilter)
        .flatMap((s) =>
          s.stages.map((st) => ({
            value: `${s.key}:${st.key}`,
            label: systemFilter === "all" ? `${s.label} › ${st.label}` : st.label,
          })),
        ),
    [systems, systemFilter],
  );

  const responsibleOptions = useMemo(() => {
    const names = new Set();
    systems.forEach((s) => s.stages.forEach((st) => accessFor(access, st.pageId).mis.forEach((n) => names.add(n))));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [systems, access]);

  // One row per stage that has pending tasks; counts reflect the department / assignee / overdue filters.
  // Stages that failed to load stay visible so an error isn't mistaken for "nothing pending".
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const out = [];
    systems
      .filter((s) => systemFilter === "all" || s.key === systemFilter)
      .forEach((s) =>
        s.stages.forEach((st) => {
          if (stageFilter !== "all" && stageFilter !== `${s.key}:${st.key}`) return;
          const items = st.items.filter((i) => {
            if (departmentFilter !== "all" && i.department !== departmentFilter) return false;
            if (personFilter !== "all" && i.person !== personFilter) return false;
            if (overdueOnly && !i.isOverdue) return false;
            return true;
          });
          const holders = accessFor(access, st.pageId);
          const row = {
            systemKey: s.key,
            systemLabel: s.label,
            stageKey: st.key,
            stageLabel: st.label,
            error: s.error || st.error,
            responsible: holders.mis,
            viewAccess: holders.read,
            editAccess: holders.write,
            pending: items.length,
            delayed: items.filter((i) => i.isOverdue).length,
          };
          if (row.pending === 0 && !row.error) return;
          if (responsibleFilter === NOT_ASSIGNED && row.responsible.length > 0) return;
          if (responsibleFilter !== "all" && responsibleFilter !== NOT_ASSIGNED && !row.responsible.includes(responsibleFilter)) return;
          if (term) {
            const hay = [row.systemLabel, row.stageLabel, ...row.responsible, ...row.viewAccess, ...row.editAccess]
              .join(" ")
              .toLowerCase();
            if (!hay.includes(term)) return;
          }
          out.push(row);
        }),
      );
    return out;
  }, [systems, access, search, systemFilter, stageFilter, responsibleFilter, departmentFilter, personFilter, overdueOnly]);

  const kpis = useMemo(
    () => ({
      total: rows.reduce((a, r) => a + r.pending, 0),
      delayed: rows.reduce((a, r) => a + r.delayed, 0),
      stagesWithDelay: rows.filter((r) => r.delayed > 0).length,
      unassigned: rows.filter((r) => r.pending > 0 && r.responsible.length === 0).length,
    }),
    [rows],
  );

  // Stage pages open with the same item filters that are set here
  const stageQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (systemFilter !== "all") q.set("system", systemFilter);
    if (departmentFilter !== "all") q.set("department", departmentFilter);
    if (personFilter !== "all") q.set("person", personFilter);
    if (overdueOnly) q.set("overdue", "1");
    const str = q.toString();
    return str ? `?${str}` : "";
  }, [systemFilter, departmentFilter, personFilter, overdueOnly]);
  const openStage = (r) => navigate(`/dashboard/pc/${r.systemKey}/${r.stageKey}${stageQuery}`);

  const exportTable = () => {
    const data = rows.map((r) => ({
      System: r.systemLabel,
      Stage: r.stageLabel,
      "Responsible (MIS)": r.responsible.join(", "),
      "View Access": r.viewAccess.join(", "),
      "Edit Access": r.editAccess.join(", "),
      "Total Pending": r.pending,
      "Delayed Pending": r.delayed,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "PC Pending");
    XLSX.writeFile(wb, `PC_Pending_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const selectClass =
    "px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer min-w-0";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 theme-transition">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                <ClipboardList size={26} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                PC <span className="text-blue-600 dark:text-blue-400">Dashboard</span>
              </h1>
            </div>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              Pending work at every stage of every system, across all departments. Click a row to see its tasks.
              {lastRefreshed && <> Last refreshed {lastRefreshed.toLocaleTimeString("en-IN")}.</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportTable}
              disabled={loading || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => load(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {accessError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-sm px-4 py-3">
            {accessError}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Pending", value: kpis.total, icon: Layers, tone: "text-blue-600 dark:text-blue-400" },
            { label: "Delayed Pending", value: kpis.delayed, icon: AlertTriangle, tone: "text-red-600 dark:text-red-400" },
            { label: "Stages With Delay", value: kpis.stagesWithDelay, icon: ClipboardList, tone: "text-gray-700 dark:text-slate-200" },
            { label: "Pending Stages Without Responsible", value: kpis.unassigned, icon: UserX, tone: "text-amber-600 dark:text-amber-400" },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{k.label}</p>
                <k.icon size={18} className={`shrink-0 ${k.tone}`} />
              </div>
              <p className={`text-3xl font-black mt-1 ${k.tone}`}>{loading ? "…" : k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search system, stage or person…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <select
            value={systemFilter}
            onChange={(e) => {
              setSystemFilter(e.target.value);
              if (e.target.value !== "all" && !stageFilter.startsWith(`${e.target.value}:`)) setStageFilter("all");
            }}
            className={selectClass}
          >
            <option value="all">All Systems</option>
            {systems.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={selectClass}>
            <option value="all">All Stages</option>
            {stageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)} className={selectClass}>
            <option value="all">All Responsible (MIS)</option>
            <option value={NOT_ASSIGNED}>Not assigned</option>
            {responsibleOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={selectClass}>
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className={selectClass}>
            <option value="all">All Assignees</option>
            {persons.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300 px-2">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Delayed only
          </label>
        </div>

        {/* Stage table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 dark:text-slate-400 gap-2">
            <Loader2 className="animate-spin" size={20} /> Loading pending work from all systems…
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">System</th>
                    <th className="px-4 py-3 text-left">Stage</th>
                    <th className="px-4 py-3 text-left">Responsible (MIS)</th>
                    <th className="px-4 py-3 text-left">View Access</th>
                    <th className="px-4 py-3 text-left">Edit Access</th>
                    <th className="px-4 py-3 text-right">Total Pending</th>
                    <th className="px-4 py-3 text-right">Delayed</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-slate-400">
                        No pending tasks in any stage for the current filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => {
                      const firstOfSystem = idx === 0 || rows[idx - 1].systemKey !== r.systemKey;
                      return (
                        <tr
                          key={`${r.systemKey}-${r.stageKey}`}
                          onClick={() => openStage(r)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openStage(r);
                          }}
                          tabIndex={0}
                          title={`Open ${r.stageLabel} tasks`}
                          className={`cursor-pointer hover:bg-blue-50/60 dark:hover:bg-slate-800/50 focus:outline-none focus:bg-blue-50 dark:focus:bg-slate-800 align-top ${
                            firstOfSystem && idx > 0 ? "border-t-2 border-gray-200 dark:border-slate-700" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                            {firstOfSystem ? r.systemLabel : <span className="text-gray-300 dark:text-slate-600">″</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-800 dark:text-slate-200 whitespace-nowrap">{r.stageLabel}</td>
                          <td className="px-4 py-3">
                            <NameList
                              names={r.responsible}
                              empty="Not assigned"
                              tone="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <NameList names={r.viewAccess} tone="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" />
                          </td>
                          <td className="px-4 py-3">
                            <NameList names={r.editAccess} tone="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{r.error ? "!" : r.pending}</td>
                          <td className={`px-4 py-3 text-right font-bold ${r.delayed > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                            {r.error ? "!" : r.delayed}
                          </td>
                          <td className="px-2 py-3 text-gray-300 dark:text-slate-600">
                            <ChevronRight size={16} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 dark:border-slate-800">
              Access comes from each user&apos;s page permissions in Global Settings. Administrators (and users with access to all pages) can
              open every stage and are not listed. &quot;!&quot; means that stage failed to load.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
