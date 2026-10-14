import supabase from "../../SupabaseClient";
import { fetchPendingApprovals } from "../../redux/api/delegationApi";
import { fetchPendingMaintenanceApprovals } from "../../redux/api/maintenanceApi";
import { fetchPendingRepairApprovals } from "../../redux/api/repairApi";
import { fetchPendingEAApprovals } from "../../redux/api/eaApi";
import { fetchPendingChecklistApprovals } from "../../redux/api/quickTaskApi";
import { isAdminOrSuperAdmin, getUserAllowedDepartments } from "../../utils/roleUtils";
import { fetchAllRows, makeItem } from "./helpers";

async function getReportingUsers(username) {
  const { data: reports } = await supabase
    .from("users")
    .select("user_name")
    .eq("reported_by", username);
  return [username, ...(reports?.map((r) => r.user_name) || [])];
}

// Resolves the sidebar's role scoping (admin = all, HOD = departments/reportees, user = self)
// into a sync filter, so the query can be rebuilt for every page of results
async function resolveRoleScope({ scope, username, role }, nameMatch = "eq") {
  const none = (q) => q;
  if (scope === "all") return none;
  if (isAdminOrSuperAdmin(role, username)) return none;
  if (role === "hod") {
    const allowedDepartments = getUserAllowedDepartments({ role, username });
    if (allowedDepartments && allowedDepartments.length > 0) {
      return (q) => q.in("department", allowedDepartments);
    }
    if (username) {
      const reportingUsers = await getReportingUsers(username);
      return (q) => q.in("name", reportingUsers);
    }
    return none;
  }
  if (role === "user" && username) {
    return nameMatch === "ilike"
      ? (q) => q.ilike("name", username)
      : (q) => q.eq("name", username);
  }
  return none;
}

// Task (Checklist): today + overdue, deduplicated per task/person/day exactly like AllTasks.jsx
async function fetchTaskItems(ctx, countsOnly) {
  // IST end-of-today (DB dates stored in IST)
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const todayEndIST = nowIST.toISOString().split("T")[0] + "T23:59:59";

  // Match AllTasks.jsx past window: 1.5 years back
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  pastDate.setMonth(pastDate.getMonth() - 6);
  const pastDateStr = pastDate.toISOString().split("T")[0] + "T00:00:00";

  const scopeFilter = await resolveRoleScope(ctx);
  const data = await fetchAllRows(() =>
    scopeFilter(
      supabase
        .from("checklist")
        .select(countsOnly ? "task_id, task_description, name, planned_date, division" : "*")
        .is("submission_date", null)
        .is("status", null)
        .gte("planned_date", pastDateStr)
        .lte("planned_date", todayEndIST),
    ).order("planned_date", { ascending: true }),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const seen = new Set();
  const unique = data.filter((task) => {
    if (!task.planned_date) return false;
    const taskDay = new Date(task.planned_date);
    taskDay.setHours(0, 0, 0, 0);
    if (taskDay > today) return false;
    const key = `${task.division || ""}::${task.task_description || ""}::${task.name || ""}::${taskDay.toDateString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (countsOnly) return unique.length;

  return unique.map((t) =>
    makeItem({
      id: t.id ?? t.task_id,
      ref: t.task_id,
      title: t.task_description,
      subtitle: t.frequency ? `Frequency: ${t.frequency}` : "",
      person: t.name,
      department: t.department,
      plannedAt: t.planned_date,
      createdAt: t.task_start_date || t.created_at,
      raw: t,
    }),
  );
}

async function fetchDelegationItems(ctx, countsOnly) {
  const scopeFilter = await resolveRoleScope(ctx, "ilike");
  if (countsOnly) {
    const { count, error } = await scopeFilter(
      supabase
        .from("delegation")
        .select("*", { count: "exact", head: true })
        .or("submission_date.is.null,status.neq.done"),
    );
    if (error) throw error;
    return count || 0;
  }
  const data = await fetchAllRows(() =>
    scopeFilter(
      supabase
        .from("delegation")
        .select("*")
        .or("submission_date.is.null,status.neq.done"),
    ).order("planned_date", { ascending: true }),
  );
  return data.map((t) =>
    makeItem({
      id: t.id ?? t.task_id,
      ref: t.task_id,
      title: t.task_description,
      subtitle: t.given_by ? `Given by: ${t.given_by}` : "",
      person: t.name,
      department: t.department,
      plannedAt: t.planned_date,
      createdAt: t.task_start_date || t.created_at,
      raw: t,
    }),
  );
}

async function fetchApprovalItems({ scope, username, role }, countsOnly) {
  const isFullAdmin = isAdminOrSuperAdmin(role, username);
  if (scope !== "all" && !isFullAdmin && role !== "hod") return countsOnly ? 0 : [];

  const [delegations, maintenances, repairs, eas, checklists] = await Promise.all([
    fetchPendingApprovals(),
    fetchPendingMaintenanceApprovals(),
    fetchPendingRepairApprovals(),
    fetchPendingEAApprovals(),
    fetchPendingChecklistApprovals(),
  ]);

  const allTasks = [
    ...delegations.map((t) => ({ ...t, type: "delegation" })),
    ...maintenances.map((t) => ({ ...t, type: "maintenance" })),
    ...repairs.map((t) => ({ ...t, type: "repair" })),
    ...eas.map((t) => ({ ...t, type: "ea" })),
    ...checklists.map((t) => ({ ...t, type: "checklist" })),
  ];

  // Deduplicate data by ID
  const seenIds = new Set();
  let filtered = allTasks.filter((task) => {
    const baseId = task.task_id || task.original_task_id || task.id;
    if (!baseId || seenIds.has(baseId)) return false;
    seenIds.add(baseId);
    return true;
  });

  const doerOf = (task) => (task.doer_name || task.name || task.filled_by || "").toLowerCase();

  if (scope !== "all" && !isFullAdmin) {
    const current = (username || "").toLowerCase();
    // HOD/User cannot approve their own tasks
    filtered = filtered.filter((task) => doerOf(task) !== current);
    let reportingUsers = [];
    if (role === "hod") {
      const { data: reports } = await supabase
        .from("users")
        .select("user_name")
        .eq("reported_by", username);
      reportingUsers = (reports || []).map((r) => (r.user_name || "").toLowerCase());
    }
    filtered = filtered.filter((task) => reportingUsers.includes(doerOf(task)));
  }
  if (countsOnly) return filtered.length;

  return filtered.map((t) =>
    makeItem({
      id: `${t.type}-${t.task_id || t.original_task_id || t.id}`,
      ref: t.task_id || t.original_task_id || t.id,
      title: t.task_description || t.issue_description || t.description,
      subtitle: `Type: ${t.type}`,
      person: t.doer_name || t.name || t.filled_by,
      department: t.department,
      plannedAt: t.planned_date,
      createdAt: t.submission_date || t.created_at,
      tag: t.type,
      raw: t,
    }),
  );
}

/**
 * @param {{scope: "all"|"user", username: string, role: string}} ctx
 * @param {{countsOnly?: boolean}} opts countsOnly returns a number per stage (sidebar), else item arrays
 */
export async function fetchChecklistPending(ctx, { countsOnly = false } = {}) {
  const [task, delegation, approval] = await Promise.allSettled([
    fetchTaskItems(ctx, countsOnly),
    fetchDelegationItems(ctx, countsOnly),
    fetchApprovalItems(ctx, countsOnly),
  ]);
  const unwrap = (r, name) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`Error fetching checklist ${name} pending:`, r.reason);
    return null;
  };
  return {
    task: unwrap(task, "task"),
    delegation: unwrap(delegation, "delegation"),
    approval: unwrap(approval, "approval"),
  };
}
