import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Download,
  Eye,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  AlertTriangle,
  UserCheck,
  PencilLine,
} from "lucide-react";
import AdminLayout from "../../checklist/components/layout/AdminLayout";
import { fetchSystemPending, formatAge } from "../../../services/pendingSummary";
import { fetchStageAccess, accessFor } from "../../../services/pendingSummary/stageAccess";
import { formatDateTime } from "../utils/recordFields";
import PendingDetailModal from "../components/PendingDetailModal";

const PAGE_SIZE = 50;
const COLLAPSED_NAMES = 6;

// Name chips for an access list; long lists collapse behind "+N more"
function AccessNames({ names, chipClass, emptyText }) {
  const [expanded, setExpanded] = useState(false);
  if (!names.length) return <p className="text-sm text-gray-400 dark:text-slate-500">{emptyText}</p>;
  const shown = expanded ? names : names.slice(0, COLLAPSED_NAMES);
  const hidden = names.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((n) => (
        <span key={n} className={`px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap ${chipClass}`}>
          {n}
        </span>
      ))}
      {(hidden > 0 || expanded) && names.length > COLLAPSED_NAMES && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-2 py-0.5 rounded-md text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}

function AccessCard({ icon: Icon, title, count, tone, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${tone}`}>
          <Icon size={14} /> {title}
        </p>
        <span className="text-xs font-bold text-gray-400">{count}</span>
      </div>
      {children}
    </div>
  );
}

export default function PcStagePage() {
  const { systemKey, stageKey } = useParams();
  // Filters start from whatever was set on the PC Dashboard (passed in the query string)
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const departmentFilter = searchParams.get("department") || "all";
  const personFilter = searchParams.get("person") || "all";
  const divisionFilter = searchParams.get("division") || "all";
  const overdueOnly = searchParams.get("overdue") === "1";

  const setFilter = (key, value, emptyValue = "") => {
    const next = new URLSearchParams(searchParams);
    if (value === emptyValue || value === false) next.delete(key);
    else next.set(key, value === true ? "1" : value);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const [system, setSystem] = useState(null);
  const [access, setAccess] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const [detailItem, setDetailItem] = useState(null);

  const load = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const [data, accessMap] = await Promise.all([
          fetchSystemPending(systemKey),
          fetchStageAccess().catch((err) => {
            console.error("Error loading stage access:", err);
            return {};
          }),
        ]);
        setSystem(data);
        setAccess(accessMap);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [systemKey],
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Reset paging when switching stage
  useEffect(() => {
    setPage(1);
  }, [stageKey]);

  // Esc closes the detail modal
  useEffect(() => {
    if (!detailItem) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setDetailItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailItem]);

  const stage = system?.stages.find((st) => st.key === stageKey) || null;
  // From users' page permissions: MIS = responsible, Read only = view access, Write = edit access
  const stageAccess = accessFor(access, stage?.pageId);
  const responsible = stageAccess.mis;

  const { departments, persons, divisions } = useMemo(() => {
    const deps = new Set();
    const pers = new Set();
    const divs = new Set();
    (stage?.items || []).forEach((i) => {
      if (i.department) deps.add(i.department);
      if (i.person) pers.add(i.person);
      if (i.division) {
        String(i.division)
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
          .forEach((d) => divs.add(d));
      }
    });
    return {
      departments: [...deps].sort((a, b) => a.localeCompare(b)),
      persons: [...pers].sort((a, b) => a.localeCompare(b)),
      divisions: [...divs].sort((a, b) => a.localeCompare(b)),
    };
  }, [stage]);

  const items = useMemo(() => {
    if (!stage) return [];
    const term = search.trim().toLowerCase();
    return stage.items
      .filter((i) => {
        if (divisionFilter !== "all") {
          const itemDivs = (i.division || "").split(",").map((d) => d.trim().toLowerCase());
          if (!itemDivs.includes(divisionFilter.toLowerCase())) return false;
        }
        if (departmentFilter !== "all" && i.department !== departmentFilter) return false;
        if (personFilter !== "all" && i.person !== personFilter) return false;
        if (overdueOnly && !i.isOverdue) return false;
        if (term) {
          const hay = `${i.ref} ${i.title} ${i.subtitle} ${i.person} ${i.department} ${i.division || ""} ${i.tag}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue) || (b.ageMins ?? -1) - (a.ageMins ?? -1));
  }, [stage, search, divisionFilter, departmentFilter, personFilter, overdueOnly]);

  const overdueCount = items.filter((i) => i.isOverdue).length;
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const exportStage = () => {
    const rows = items.map((i) => {
      return {
        Reference: i.ref,
        Title: i.title,
        Details: i.subtitle,
        Type: i.tag,
        "Responsible (MIS)": responsible.join(", "),
        "Assigned To": i.person,
        Department: i.department,
        Division: i.division || "",
        "Planned / Due": i.plannedAt ? formatDateTime(i.plannedAt) : "",
        Created: i.createdAt ? formatDateTime(i.createdAt) : "",
        "Delay Days": formatAge(i.ageMins),
        Overdue: i.isOverdue ? "Yes" : "No",
        Amount: i.amount ?? "",
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), stage.label.slice(0, 31));
    XLSX.writeFile(wb, `PC_${system.label}_${stage.label}.xlsx`.replace(/[^\w.-]+/g, "_"));
  };

  const selectClass =
    "px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm cursor-pointer min-w-0";
  const btnClass =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-5 theme-transition">
        {/* Header: back link, title, actions */}
        <div className="space-y-3">
          <Link
            to={`/dashboard/pc${query}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={16} /> Back to PC Dashboard
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {system?.label || "PC Dashboard"}
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {stage?.label || (loading ? "Loading…" : "Stage not found")}
              </h1>
            </div>
            {stage && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button onClick={exportStage} disabled={items.length === 0} className={btnClass}>
                  <Download size={16} /> Export
                </button>
                <Link to={stage.route} className={btnClass} title={`Open ${stage.label} page`}>
                  <ExternalLink size={16} /> Open page
                </Link>
                <button
                  onClick={() => load(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
                >
                  <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {stage && (
          <>
            {/* Counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <Layers size={14} className="text-blue-600 dark:text-blue-400" /> Pending
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{items.length}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <AlertTriangle size={14} className="text-red-600 dark:text-red-400" /> Delayed
                </p>
                <p className={`text-2xl font-black mt-1 ${overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                  {overdueCount}
                </p>
              </div>
            </div>

            {/* Who owns / can see / can act on this stage (from page permissions in Global Settings) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AccessCard icon={UserCheck} title="Responsible (MIS)" count={responsible.length} tone="text-violet-700 dark:text-violet-300">
                {responsible.length ? (
                  <AccessNames
                    names={responsible}
                    chipClass="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                    emptyText=""
                  />
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Not assigned. Tick <b>MIS</b> for this page on a user in Global Settings.
                  </p>
                )}
              </AccessCard>
              <AccessCard icon={Eye} title="View access" count={stageAccess.read.length} tone="text-amber-700 dark:text-amber-300">
                <AccessNames
                  names={stageAccess.read}
                  chipClass="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                  emptyText="No view-only users"
                />
              </AccessCard>
              <AccessCard icon={PencilLine} title="Edit access" count={stageAccess.write.length} tone="text-emerald-700 dark:text-emerald-300">
                <AccessNames
                  names={stageAccess.write}
                  chipClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                  emptyText="No users with edit access"
                />
              </AccessCard>
            </div>
          </>
        )}

        {/* Other stages of the same system */}
        {system && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {system.stages.map((st) => {
              const active = st.key === stageKey;
              return (
                <Link
                  key={st.key}
                  to={`/dashboard/pc/${systemKey}/${st.key}${query}`}
                  className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap ${
                    active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {st.label}{" "}
                  <span className={active ? "text-blue-100" : st.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}>
                    {st.error ? "!" : st.pending}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Filters */}
        {stage && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setFilter("q", e.target.value)}
                placeholder={`Search in ${stage.label}…`}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm"
              />
            </div>
            {divisions.length > 0 && (
              <select value={divisionFilter} onChange={(e) => setFilter("division", e.target.value, "all")} className={selectClass}>
                <option value="all">All Divisions</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
            <select value={departmentFilter} onChange={(e) => setFilter("department", e.target.value, "all")} className={selectClass}>
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select value={personFilter} onChange={(e) => setFilter("person", e.target.value, "all")} className={selectClass}>
              <option value="all">All Assignees</option>
              {persons.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300 px-2">
              <input type="checkbox" checked={overdueOnly} onChange={(e) => setFilter("overdue", e.target.checked)} /> Overdue only
            </label>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 dark:text-slate-400 gap-2">
            <Loader2 className="animate-spin" size={20} /> Loading pending tasks…
          </div>
        ) : !stage ? (
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-gray-500 dark:text-slate-400">
            This stage doesn't exist. <Link to="/dashboard/pc" className="text-blue-600 dark:text-blue-400 font-semibold">Go back to the PC Dashboard</Link>.
          </div>
        ) : stage.error || system.error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-sm text-red-700 dark:text-red-300">
            Could not load this stage: {system.error || stage.error}. Try Refresh.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-gray-500 dark:text-slate-400">
            {stage.pending === 0 ? "Nothing pending at this stage." : "No tasks match the current filters."}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Ref</th>
                    <th className="px-3 py-2 text-left">Task / Party</th>
                    <th className="px-3 py-2 text-left">Responsible (MIS)</th>
                    <th className="px-3 py-2 text-left">Assigned To</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-left">Division</th>
                    <th className="px-3 py-2 text-left">Planned / Due</th>
                    <th className="px-3 py-2 text-left">Delay Days</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {pageItems.map((i) => {
                    return (
                      <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 align-top">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">{i.ref || "-"}</td>
                        <td className="px-3 py-2 min-w-[240px]">
                          <button onClick={() => setDetailItem(i)} className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{i.title || "-"}</p>
                            {i.subtitle && <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">{i.subtitle}</p>}
                            {i.tag && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                                {i.tag}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">
                          {responsible.length > 0 ? (
                            <span className="font-semibold text-violet-700 dark:text-violet-300">{responsible.join(", ")}</span>
                          ) : (
                            <span className="text-xs text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{i.person || "-"}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{i.department || "-"}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300 min-w-[120px]">
                          {i.division ? (
                            i.division.includes(",") ? (
                              <div className="flex flex-wrap gap-1">
                                {i.division
                                  .split(",")
                                  .map((d) => d.trim())
                                  .filter(Boolean)
                                  .map((d) => (
                                    <span
                                      key={d}
                                      className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                                    >
                                      {d}
                                    </span>
                                  ))}
                              </div>
                            ) : (
                              <span>{i.division}</span>
                            )
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={i.isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-700 dark:text-slate-300"}>
                            {i.plannedAt ? formatDateTime(i.plannedAt) : "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-slate-300">{formatAge(i.ageMins)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => setDetailItem(i)}
                            title="View complete detail"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
                          >
                            <Eye size={16} />
                          </button>
                          <Link
                            to={stage.route}
                            title={`Open ${stage.label} page`}
                            className="inline-flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
                          >
                            <ExternalLink size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, items.length)} of {items.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2">
                    Page {currentPage} of {pageCount}
                  </span>
                  <button
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === pageCount}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {detailItem && stage && (
        <PendingDetailModal
          system={system}
          stage={stage}
          item={detailItem}
          onClose={() => setDetailItem(null)}
          responsible={responsible}
        />
      )}
    </AdminLayout>
  );
}
