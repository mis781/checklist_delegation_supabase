import { useMemo, useState } from "react";
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
import { usePendingSummary } from "../../../hooks/usePendingSummary";
import { accessFor } from "../../../services/pendingSummary/stageAccess";
import { getUserAllowedDivisions, isDivisionAllowed, normalizeDivisionName } from "../../../utils/roleUtils";

const NOT_ASSIGNED = "__not_assigned__";
const MAX_NAMES = 3;

// Compact list of user names: chips, optionally showing all names upfront
function NameList({ names, tone, empty = "—", showAll = false }) {
  if (!names || names.length === 0) return <span className="text-xs text-gray-400">{empty}</span>;
  const shown = showAll ? names : names.slice(0, MAX_NAMES);
  const rest = showAll ? 0 : names.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1 max-w-xs md:max-w-sm" title={names.join(", ")}>
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
  const allowedDivisions = useMemo(() => getUserAllowedDivisions(), []);

  const {
    systems,
    access,
    error,
    isLoading: loading,
    isFetching: refreshing,
    dataUpdatedAt,
    refetch,
  } = usePendingSummary();

  const accessError = error ? (error.message || "Could not load pending summary.") : "";
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // Filters start from the query string so "Back" from a stage page keeps them
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [systemFilter, setSystemFilter] = useState(() => searchParams.get("system") || "all");
  const [divisionFilter, setDivisionFilter] = useState(() => searchParams.get("division") || "all");
  const [departmentFilter, setDepartmentFilter] = useState(() => searchParams.get("department") || "all");
  const [personFilter, setPersonFilter] = useState(() => searchParams.get("person") || "all");
  const [overdueOnly, setOverdueOnly] = useState(() => searchParams.get("overdue") === "1");
  const [stageFilter, setStageFilter] = useState("all"); // "systemKey:stageKey"
  const [responsibleFilter, setResponsibleFilter] = useState("all"); // MIS user name or NOT_ASSIGNED

  // Filter options come from data filtered by user's allowed divisions
  const { departments, persons, divisions } = useMemo(() => {
    const deps = new Set();
    const pers = new Set();
    const divs = new Set();
    systems.forEach((s) =>
      s.stages.forEach((st) =>
        st.items.forEach((i) => {
          if (allowedDivisions && allowedDivisions.length > 0 && !isDivisionAllowed(i.division, allowedDivisions)) {
            return;
          }
          if (i.department) deps.add(i.department);
          if (i.person) pers.add(i.person);
          if (i.division) {
            String(i.division)
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean)
              .forEach((d) => {
                const norm = normalizeDivisionName(d) || d;
                if (!allowedDivisions || isDivisionAllowed(norm, allowedDivisions)) {
                  divs.add(norm);
                }
              });
          }
        }),
      ),
    );
    if (allowedDivisions && allowedDivisions.length > 0) {
      allowedDivisions.forEach((d) => divs.add(d));
    }
    return {
      departments: [...deps].sort((a, b) => a.localeCompare(b)),
      persons: [...pers].sort((a, b) => a.localeCompare(b)),
      divisions: [...divs].sort((a, b) => a.localeCompare(b)),
    };
  }, [systems, allowedDivisions]);

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

  // One row per stage that has pending tasks; counts reflect the division / department / assignee / overdue filters and allowed divisions.
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
            // 1. Division access boundary
            if (allowedDivisions && allowedDivisions.length > 0 && !isDivisionAllowed(i.division, allowedDivisions)) {
              return false;
            }
            // 2. Division filter dropdown
            if (divisionFilter !== "all") {
              const itemDivs = (i.division || "")
                .split(",")
                .map((d) => normalizeDivisionName(d.trim()).toLowerCase());
              const target = normalizeDivisionName(divisionFilter).toLowerCase();
              if (!itemDivs.includes(target) && !itemDivs.includes(divisionFilter.toLowerCase())) {
                return false;
              }
            }
            if (departmentFilter !== "all" && i.department !== departmentFilter) return false;
            if (personFilter !== "all" && i.person !== personFilter) return false;
            if (overdueOnly && !i.isOverdue) return false;
            return true;
          });

          const rowDivisions = Array.from(
            new Set(
              items.flatMap((i) =>
                i.division
                  ? String(i.division)
                      .split(",")
                      .map((d) => normalizeDivisionName(d.trim()) || d.trim())
                      .filter(Boolean)
                  : []
              )
            )
          ).sort((a, b) => a.localeCompare(b));

          const holders = accessFor(access, st.pageId);
          const misByDiv = holders.misByDivision || {};
          const globalMis = holders.globalMis || [];

          // Build division-to-responsible pairings
          let divisionResponsiblePairs = [];
          if (rowDivisions.length > 0) {
            divisionResponsiblePairs = rowDivisions.map((divName) => {
              const divResp = Array.from(
                new Set([...(misByDiv[divName] || []), ...globalMis])
              );
              return {
                division: divName,
                responsible: divResp,
              };
            });
          } else {
            // Stage items have no division specified or general
            divisionResponsiblePairs = [
              {
                division: null,
                responsible: holders.mis || [],
              },
            ];
          }

          const row = {
            systemKey: s.key,
            systemLabel: s.label,
            stageKey: st.key,
            stageLabel: st.label,
            error: s.error || st.error,
            divisions: rowDivisions,
            divisionResponsiblePairs,
            responsible: holders.mis,
            viewAccess: holders.read,
            editAccess: holders.write,
            pending: items.length,
            delayed: items.filter((i) => i.isOverdue).length,
          };
          if (row.pending === 0 && !row.error) return;

          const hasUnassignedDivision =
            row.divisionResponsiblePairs.length === 0
              ? row.responsible.length === 0
              : row.divisionResponsiblePairs.some((p) => p.responsible.length === 0);

          if (responsibleFilter === NOT_ASSIGNED && !hasUnassignedDivision) return;
          if (responsibleFilter !== "all" && responsibleFilter !== NOT_ASSIGNED) {
            const matchesPerson =
              row.divisionResponsiblePairs.some((p) => p.responsible.includes(responsibleFilter)) ||
              row.responsible.includes(responsibleFilter);
            if (!matchesPerson) return;
          }

          if (term) {
            const allPairResponsible = row.divisionResponsiblePairs.flatMap((p) => p.responsible);
            const allPairDivisions = row.divisionResponsiblePairs.map((p) => p.division).filter(Boolean);
            const hay = [
              row.systemLabel,
              row.stageLabel,
              ...row.divisions,
              ...allPairDivisions,
              ...row.responsible,
              ...allPairResponsible,
              ...row.viewAccess,
              ...row.editAccess,
            ]
              .join(" ")
              .toLowerCase();
            if (!hay.includes(term)) return;
          }
          out.push(row);
        }),
      );
    return out;
  }, [systems, access, search, systemFilter, stageFilter, divisionFilter, responsibleFilter, departmentFilter, personFilter, overdueOnly, allowedDivisions]);

  const kpis = useMemo(
    () => ({
      total: rows.reduce((a, r) => a + r.pending, 0),
      delayed: rows.reduce((a, r) => a + r.delayed, 0),
      stagesWithDelay: rows.filter((r) => r.delayed > 0).length,
      unassigned: rows.filter(
        (r) =>
          r.pending > 0 &&
          (r.divisionResponsiblePairs.length === 0
            ? r.responsible.length === 0
            : r.divisionResponsiblePairs.some((p) => p.responsible.length === 0))
      ).length,
    }),
    [rows],
  );

  // Stage pages open with the same item filters that are set here
  const stageQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (systemFilter !== "all") q.set("system", systemFilter);
    if (divisionFilter !== "all") q.set("division", divisionFilter);
    if (departmentFilter !== "all") q.set("department", departmentFilter);
    if (personFilter !== "all") q.set("person", personFilter);
    if (overdueOnly) q.set("overdue", "1");
    const str = q.toString();
    return str ? `?${str}` : "";
  }, [systemFilter, divisionFilter, departmentFilter, personFilter, overdueOnly]);

  const openStage = (r) => navigate(`/dashboard/pc/${r.systemKey}/${r.stageKey}${stageQuery}`);

  const exportTable = () => {
    const data = rows.map((r) => ({
      System: r.systemLabel,
      Stage: r.stageLabel,
      "Division & Responsible":
        r.divisionResponsiblePairs.length > 0
          ? r.divisionResponsiblePairs
              .map((p) => `${p.division || "General"}: ${p.responsible.join(", ") || "Not assigned"}`)
              .join(" | ")
          : r.responsible.join(", ") || "Not assigned",
      Division: r.divisions.join(", ") || "—",
      "Responsible (MIS)": r.responsible.join(", ") || "Not assigned",
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
              Pending work at every stage of every system, across all departments. Click the arrow on any row to see its tasks.
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
              onClick={() => refetch()}
              disabled={refreshing}
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
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All Divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
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
                    <th className="px-4 py-3 text-left">Division &amp; Responsible</th>
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
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 align-top ${
                            firstOfSystem && idx > 0 ? "border-t-2 border-gray-200 dark:border-slate-700" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                            {firstOfSystem ? r.systemLabel : <span className="text-gray-300 dark:text-slate-600">″</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-800 dark:text-slate-200 whitespace-nowrap">{r.stageLabel}</td>
                          <td className="px-4 py-3 min-w-[240px]">
                            {r.divisionResponsiblePairs.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">Not assigned</span>
                            ) : (
                              <div className="space-y-1.5">
                                {r.divisionResponsiblePairs.map((pair, pIdx) => (
                                  <div key={pair.division || `div-${pIdx}`} className="flex flex-wrap items-center gap-1.5">
                                    {pair.division ? (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                                        {pair.division}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                    <span className="text-gray-400 dark:text-slate-500 text-xs font-bold">→</span>
                                    {pair.responsible.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {pair.responsible.map((name) => (
                                          <span
                                            key={name}
                                            className="px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60"
                                          >
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium italic">
                                        Not assigned
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <NameList names={r.viewAccess} tone="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" />
                          </td>
                          <td className="px-4 py-3">
                            <NameList names={r.editAccess} showAll tone="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{r.error ? "!" : r.pending}</td>
                          <td className={`px-4 py-3 text-right font-bold ${r.delayed > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                            {r.error ? "!" : r.delayed}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openStage(r)}
                              title={`Open ${r.stageLabel} tasks`}
                              aria-label={`Open ${r.stageLabel} tasks`}
                              className="inline-flex items-center justify-center p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              <ChevronRight size={18} />
                            </button>
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

