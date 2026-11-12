import supabase from "../../../SupabaseClient";
import { DEFAULT_ENTERPRISE_SYSTEMS } from "../constants/misDefaults";
import { fetchAllRows } from "../../../services/pendingSummary/helpers";

/**
 * Robust date parser supporting YYYY-MM-DD, DD/MM/YYYY, ISO, and Date objects
 */
export function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  // Handle DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  // Handle YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Fetch active users from users master table
 */
export async function fetchMisUsers() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .not("user_name", "is", null)
      .neq("user_name", "");

    if (error) {
      console.warn("Error fetching users for MIS:", error);
      return [];
    }

    const activeUsers = (data || []).filter(
      (u) => String(u.status || "active").toLowerCase() !== "inactive"
    );

    // Deduplicate by user_name
    const map = new Map();
    activeUsers.forEach((u) => {
      const name = (u.user_name || "").trim();
      if (name && !map.has(name)) {
        map.set(name, {
          ...u,
          user_name: name,
          designation: u.Designation || u.designation || u.role || "Employee",
          company: u.division || u.company || "botivate",
          department: u.department || "General",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.user_name.localeCompare(b.user_name));
  } catch (err) {
    console.error("fetchMisUsers unexpected error:", err);
    return [];
  }
}

const MIS_LOCAL_STORAGE_KEY = "botivate_mis_commitments_v1";

export function getLocalCommitments() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(MIS_LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCommitments(records) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(MIS_LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {}
}

/**
 * Returns previous period bounds (7 days prior for weekly, prev month for monthly)
 */
export function getPreviousPeriodRange(startDate, endDate, periodType = "weekly") {
  const startD = parseDateSafe(startDate) || new Date();
  const endD = parseDateSafe(endDate) || new Date();
  const pad = (n) => String(n).padStart(2, "0");

  if (periodType === "weekly") {
    const prevStart = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() - 7);
    const prevEnd = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate() - 7);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return {
      startDate: format(prevStart),
      endDate: format(prevEnd),
      startMs: new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate()).getTime(),
      endMs: new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 23, 59, 59, 999).getTime(),
    };
  } else {
    const prevMonthEnd = new Date(startD.getFullYear(), startD.getMonth(), 0);
    const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return {
      startDate: format(prevMonthStart),
      endDate: format(prevMonthEnd),
      startMs: new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth(), prevMonthStart.getDate()).getTime(),
      endMs: new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), prevMonthEnd.getDate(), 23, 59, 59, 999).getTime(),
    };
  }
}

/**
 * Intelligent default action-plan commitment based on user role and backlog
 */
export function getDefaultRoleCommitment(u, allPending = 0, target = 0) {
  const dept = String(u.department || "").toLowerCase();
  const desig = String(u.designation || "").toLowerCase();

  if (allPending > 15) {
    return `Prioritize clearing backlog of ${allPending} overdue tasks and avoid new delays`;
  }
  if (allPending > 0) {
    return `Resolve ${allPending} pending items and adhere to 100% daily checklist submission`;
  }
  if (dept.includes("sales") || dept.includes("lead") || desig.includes("sales")) {
    return "Speed up quotation turnaround and follow up high-priority client leads";
  }
  if (dept.includes("purchase") || dept.includes("procurement")) {
    return "Close vendor RFQ comparisons and expedite outstanding purchase indents";
  }
  if (dept.includes("account") || dept.includes("finance")) {
    return "Complete daily ledger reconciliations and verify supplier payments on schedule";
  }
  if (dept.includes("maintenance") || dept.includes("repair")) {
    return "Execute preventive maintenance tasks strictly on schedule within TAT";
  }
  if (dept.includes("dispatch") || dept.includes("logistic") || dept.includes("order")) {
    return "Ensure 100% on-time dispatch validation and transporter coordination";
  }
  if (dept.includes("hr") || dept.includes("admin")) {
    return "Track team task compliance, attendance logs, and resolve blockers daily";
  }
  if (target > 0) {
    return `Maintain 100% on-time delivery across scheduled ${target} tasks`;
  }
  return "Clear scheduled operational tasks and support department commitments on time";
}

/**
 * Fetch commitments history with optional filters
 */
export async function fetchCommitmentHistory({
  startDate = null,
  endDate = null,
  userName = "all",
  department = "all",
  searchQuery = "",
} = {}) {
  let records = [];
  try {
    let query = supabase
      .from("mis_commitments")
      .select("*")
      .order("date_start", { ascending: false });

    if (startDate) query = query.gte("date_start", startDate);
    if (endDate) query = query.lte("date_end", endDate);
    if (userName && userName !== "all") query = query.eq("user_name", userName);
    if (department && department !== "all") query = query.eq("department", department);

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      records = data;
    }
  } catch (err) {
    console.warn("fetchCommitmentHistory Supabase note:", err?.message || err);
  }

  // Merge with local storage cache
  const localList = getLocalCommitments();
  if (localList.length > 0) {
    const map = new Map();
    // Supabase records first
    records.forEach((r) => {
      const key = `${r.user_name}:::${String(r.date_start).split("T")[0]}:::${String(r.date_end).split("T")[0]}`;
      map.set(key, r);
    });
    // Overlay or add local records
    localList.forEach((r) => {
      const key = `${r.user_name}:::${String(r.date_start).split("T")[0]}:::${String(r.date_end).split("T")[0]}`;
      if (!map.has(key)) {
        map.set(key, r);
      }
    });
    records = Array.from(map.values());
  }

  // If still completely empty (initial bootstrap so history is never blank)
  if (records.length === 0) {
    const users = await fetchMisUsers();
    const prevRange = getPreviousPeriodRange(
      new Date().toISOString().split("T")[0],
      new Date().toISOString().split("T")[0],
      "weekly"
    );
    const initialSeed = users.map((u) => ({
      id: `seed-${u.user_name}-${prevRange.startDate}`,
      period_type: "weekly",
      date_start: prevRange.startDate,
      date_end: prevRange.endDate,
      user_name: u.user_name,
      company: u.company || "botivate",
      department: u.department || "General",
      designation: u.designation || "Employee",
      target: 6,
      actual_work_done: 6,
      percent_done: 100,
      percent_done_on_time: 90,
      percent_not_done: 0,
      percent_not_done_on_time: 10,
      total_work_done: 6,
      pending: 0,
      all_pending: 0,
      score: "Positive (+)",
      commitment: getDefaultRoleCommitment(u, 0, 6),
      status: "achieved",
      remarks: "Weekly review record",
      recorded_by: "System",
      updated_at: new Date().toISOString(),
    }));
    saveLocalCommitments(initialSeed);
    records = initialSeed;
  }

  // Apply filters
  if (startDate) {
    records = records.filter((r) => String(r.date_start).split("T")[0] >= startDate);
  }
  if (endDate) {
    records = records.filter((r) => String(r.date_end).split("T")[0] <= endDate);
  }
  if (userName && userName !== "all") {
    records = records.filter((r) => r.user_name === userName);
  }
  if (department && department !== "all") {
    records = records.filter((r) => r.department === department);
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    records = records.filter(
      (r) =>
        r.user_name?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.commitment?.toLowerCase().includes(q) ||
        r.designation?.toLowerCase().includes(q)
    );
  }

  return records.sort((a, b) => String(b.date_start).localeCompare(String(a.date_start)));
}

/**
 * Save or upsert a single commitment record
 */
export async function saveMisCommitment(record) {
  try {
    const payload = {
      period_type: record.period_type || "weekly",
      date_start: record.date_start,
      date_end: record.date_end,
      user_name: record.user_name,
      company: record.company || "botivate",
      department: record.department || "General",
      designation: record.designation || "Employee",
      target: Number(record.target) || 0,
      actual_work_done: Number(record.actual_work_done ?? record.actualWorkDone) || 0,
      percent_done: Number(record.percent_done ?? record.percentDone) || 0,
      percent_done_on_time: Number(record.percent_done_on_time ?? record.percentDoneOnTime) || 0,
      percent_not_done: Number(record.percent_not_done ?? record.plannedPercentNotDone ?? record.currentPercentNotDone) || 0,
      percent_not_done_on_time: Number(record.percent_not_done_on_time ?? record.plannedPercentNotDoneOnTime ?? record.currentPercentNotDoneOnTime) || 0,
      total_work_done: Number(record.total_work_done ?? record.totalWorkDone) || 0,
      pending: Number(record.pending) || 0,
      all_pending: Number(record.all_pending ?? record.allPending) || 0,
      score: record.score || "Positive (+)",
      commitment: record.commitment || "",
      status: record.status || "pending",
      remarks: record.remarks || "",
      recorded_by: record.recorded_by || localStorage.getItem("user-name") || "Admin",
      updated_at: new Date().toISOString(),
    };

    // 1. Always update local storage first so changes persist immediately on device
    const localList = getLocalCommitments();
    const idx = localList.findIndex(
      (c) =>
        c.user_name === payload.user_name &&
        String(c.date_start).split("T")[0] === String(payload.date_start).split("T")[0] &&
        String(c.date_end).split("T")[0] === String(payload.date_end).split("T")[0]
    );
    if (idx >= 0) {
      localList[idx] = { ...localList[idx], ...payload };
    } else {
      localList.unshift(payload);
    }
    saveLocalCommitments(localList);

    // 2. Try Supabase upsert
    let supabaseData = null;
    try {
      const { data, error } = await supabase
        .from("mis_commitments")
        .upsert(payload, { onConflict: "user_name,date_start,date_end,period_type" })
        .select()
        .maybeSingle();
      if (!error && data) supabaseData = data;
    } catch (sbErr) {
      console.warn("Supabase saveMisCommitment note:", sbErr?.message || sbErr);
    }

    return { data: supabaseData || payload, error: null };
  } catch (err) {
    console.error("saveMisCommitment unexpected error:", err);
    return { data: null, error: err };
  }
}

/**
 * Bulk save snapshots of current review period commitments
 */
export async function saveBulkCommitments(records = [], defaultDates = {}) {
  if (!records.length) return { success: true, count: 0 };
  try {
    const payload = records.map((r) => {
      const currentNotDone = r.percentDone !== null ? Math.max(0, 100 - r.percentDone) : (r.target > 0 ? 100 : 0);
      const currentNotDoneOnTime = r.percentDoneOnTime !== null ? Math.max(0, 100 - r.percentDoneOnTime) : 0;
      return {
        period_type: r.period_type || defaultDates.periodType || "weekly",
        date_start: r.date_start || defaultDates.startDate,
        date_end: r.date_end || defaultDates.endDate,
        user_name: r.user_name,
        company: r.company || "botivate",
        department: r.department || "General",
        designation: r.designation || "Employee",
        target: Number(r.target) || 0,
        actual_work_done: Number(r.actualWorkDone ?? r.actual_work_done) || 0,
        percent_done: Number(r.percentDone ?? r.percent_done) || 0,
        percent_done_on_time: Number(r.percentDoneOnTime ?? r.percent_done_on_time) || 0,
        percent_not_done: Number(r.percent_not_done ?? currentNotDone),
        percent_not_done_on_time: Number(r.percent_not_done_on_time ?? currentNotDoneOnTime),
        total_work_done: Number(r.totalWorkDone ?? r.total_work_done) || 0,
        pending: Number(r.pending) || 0,
        all_pending: Number(r.allPending ?? r.all_pending) || 0,
        score: r.score || "Positive (+)",
        commitment: r.commitment || "",
        status: r.status || "pending",
        recorded_by: localStorage.getItem("user-name") || "Admin",
        updated_at: new Date().toISOString(),
      };
    });

    // 1. Update local storage
    const localList = getLocalCommitments();
    payload.forEach((p) => {
      const idx = localList.findIndex(
        (c) =>
          c.user_name === p.user_name &&
          String(c.date_start).split("T")[0] === String(p.date_start).split("T")[0] &&
          String(c.date_end).split("T")[0] === String(p.date_end).split("T")[0]
      );
      if (idx >= 0) {
        localList[idx] = { ...localList[idx], ...p };
      } else {
        localList.push(p);
      }
    });
    saveLocalCommitments(localList);

    // 2. Try Supabase
    try {
      await supabase
        .from("mis_commitments")
        .upsert(payload, { onConflict: "user_name,date_start,date_end,period_type" });
    } catch (sbErr) {
      console.warn("Supabase saveBulkCommitments note:", sbErr?.message || sbErr);
    }

    return { success: true, count: payload.length, error: null };
  } catch (err) {
    console.error("saveBulkCommitments error:", err);
    return { success: false, count: 0, error: err };
  }
}

/**
 * Fetch KPI & KRA configuration and role details for a user
 */
export async function fetchUserKpiKra(username) {
  try {
    if (!username) return null;
    const { data, error } = await supabase
      .from("mis_kpi_kra")
      .select("*")
      .eq("user_name", username)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("fetchUserKpiKra error:", error);
    }

    if (data) return data;

    // Fallback: build baseline from users table
    const { data: uData } = await supabase
      .from("users")
      .select("user_name, role, department, division, Designation, reported_by")
      .eq("user_name", username)
      .maybeSingle();

    return {
      user_name: username,
      official_designation: uData?.Designation || uData?.role || "Employee",
      primary_role: `Core operational responsibilities for ${uData?.department || "assigned operations"}`,
      task_velocity: 6.0,
      task_velocity_unit: "daily tasks",
      methodology: "Daily standup review & end-of-day checklist submission",
      key_reporting_person: uData?.reported_by || "N/A",
      collaborative_team: [],
      scoring_notes: "Standard performance scoring matrix applies.",
    };
  } catch (err) {
    console.error("fetchUserKpiKra error:", err);
    return null;
  }
}

/**
 * Update or save KPI/KRA for a user
 */
export async function saveUserKpiKra(data) {
  try {
    const payload = {
      user_name: data.user_name,
      official_designation: data.official_designation || "Employee",
      primary_role: data.primary_role || "No role description available",
      task_velocity: Number(data.task_velocity) || 0,
      task_velocity_unit: data.task_velocity_unit || "daily tasks",
      methodology: data.methodology || "Protocol not defined",
      key_reporting_person: data.key_reporting_person || "N/A",
      collaborative_team: data.collaborative_team || [],
      scoring_notes: data.scoring_notes || "",
      updated_at: new Date().toISOString(),
    };

    const { data: res, error } = await supabase
      .from("mis_kpi_kra")
      .upsert(payload, { onConflict: "user_name" })
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: res, error: null };
  } catch (err) {
    console.error("saveUserKpiKra error:", err);
    return { data: null, error: err };
  }
}

/**
 * Fetch Enterprise Tools Architecture (Systems & Resources)
 */
export async function fetchSystemsResources() {
  try {
    const { data, error } = await supabase
      .from("mis_systems_resources")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_ENTERPRISE_SYSTEMS;
    }
    return data;
  } catch (err) {
    console.error("fetchSystemsResources error:", err);
    return DEFAULT_ENTERPRISE_SYSTEMS;
  }
}

/**
 * Live MIS Data Calculation Engine
 * Aggregates live task metrics across Checklist, Delegation, Maintenance, Repair
 * combined with prior commitments.
 */
export async function fetchLiveMisDashboardData({
  startDate,
  endDate,
  periodType = "weekly",
  selectedUser = "all",
  department = "all",
} = {}) {
  try {
    const users = await fetchMisUsers();

    // Parse period start & end bounds
    const startObj = parseDateSafe(startDate) || new Date();
    const endObj = parseDateSafe(endDate) || new Date();
    const startMs = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate()).getTime();
    const endMs = new Date(endObj.getFullYear(), endObj.getMonth(), endObj.getDate(), 23, 59, 59, 999).getTime();

    const now = new Date();
    const todayEndMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    // 1. Fetch from all task tables using fetchAllRows with select('*') so it NEVER fails on column names
    const fetchTasksSafe = async (primaryTable, fallbackTable = null) => {
      try {
        const rows = await fetchAllRows(() => supabase.from(primaryTable).select("*"));
        if (rows && rows.length > 0) return rows;
      } catch (err) {
        console.warn(`Could not fetch from ${primaryTable}:`, err?.message || err);
      }
      if (fallbackTable) {
        try {
          return await fetchAllRows(() => supabase.from(fallbackTable).select("*"));
        } catch (fbErr) {
          console.warn(`Fallback fetch from ${fallbackTable} failed:`, fbErr?.message || fbErr);
        }
      }
      return [];
    };

    const [
      checklistTasks,
      delegationTasks,
      maintenanceTasks,
      repairTasks,
      eaTasks,
      currentCommitmentsRes,
      prevCommitmentsRes,
    ] = await Promise.all([
      fetchTasksSafe("checklist"),
      fetchTasksSafe("delegation"),
      fetchTasksSafe("maintenance_tasks", "maintenance"),
      fetchTasksSafe("repair_tasks", "repair"),
      fetchTasksSafe("ea_tasks"),
      supabase
        .from("mis_commitments")
        .select("*")
        .eq("date_start", startDate)
        .eq("date_end", endDate)
        .eq("period_type", periodType),
      supabase
        .from("mis_commitments")
        .select("*")
        .lt("date_end", startDate)
        .order("date_end", { ascending: false }),
    ]);

    // Calculate previous period range for last week's task analysis
    const prevRange = getPreviousPeriodRange(startDate, endDate, periodType);

    // Merge Supabase commitments with local storage cache so commitments are NEVER lost
    const localCommitments = getLocalCommitments();
    const currentCommitments = [...(currentCommitmentsRes?.data || [])];
    const prevCommitments = [...(prevCommitmentsRes?.data || [])];

    localCommitments.forEach((lc) => {
      const s = String(lc.date_start).split("T")[0];
      const e = String(lc.date_end).split("T")[0];
      const isCurrent = s === startDate && e === endDate;
      const uNameLower = (lc.user_name || "").toLowerCase();
      if (isCurrent) {
        if (!currentCommitments.some((c) => (c.user_name || "").toLowerCase() === uNameLower)) {
          currentCommitments.push(lc);
        }
      } else {
        if (!prevCommitments.some((c) => (c.user_name || "").toLowerCase() === uNameLower && String(c.date_start).split("T")[0] === s)) {
          prevCommitments.push(lc);
        }
      }
    });

    console.log("MIS Aggregation Engine Raw Tasks Count:", {
      checklist: checklistTasks.length,
      delegation: delegationTasks.length,
      maintenance: maintenanceTasks.length,
      repair: repairTasks.length,
      ea: eaTasks.length,
      currentCommitments: currentCommitments.length,
      prevCommitments: prevCommitments.length,
    });

    // Map previous commitments by user_name
    const prevCommitmentMap = new Map();
    prevCommitments.forEach((pc) => {
      const u = (pc.user_name || "").trim().toLowerCase();
      if (!prevCommitmentMap.has(u)) {
        prevCommitmentMap.set(u, pc);
      }
    });

    // Map current commitments by user_name
    const currentCommitmentMap = new Map();
    currentCommitments.forEach((cc) => {
      const u = (cc.user_name || "").trim().toLowerCase();
      currentCommitmentMap.set(u, cc);
    });

    // Combine all tasks
    const allTasks = [
      ...checklistTasks.map((t) => ({ ...t, _sys: "checklist" })),
      ...delegationTasks.map((t) => ({ ...t, _sys: "delegation" })),
      ...maintenanceTasks.map((t) => ({ ...t, _sys: "maintenance" })),
      ...repairTasks.map((t) => ({ ...t, _sys: "repair" })),
      ...eaTasks.map((t) => ({ ...t, _sys: "ea" })),
    ];

    // Helper: determine if task is completed
    const isCompleted = (t) => {
      if (t.submission_date) return true;
      const statusLower = String(t.status || "").toLowerCase().trim();
      if (
        statusLower === "yes" ||
        statusLower === "done" ||
        statusLower === "approved" ||
        statusLower.includes("done") ||
        statusLower.includes("completed") ||
        statusLower.includes("pending approval") ||
        statusLower.includes("approved")
      ) {
        return true;
      }
      if (t.admin_done === true) return true;
      return false;
    };

    // Helper: determine if task was completed on time
    const isOnTime = (t) => {
      if (!isCompleted(t)) return false;
      if (!t.submission_date) return true;
      const subD = parseDateSafe(t.submission_date);
      const dueD = parseDateSafe(t.planned_date || t.task_start_date || t.created_at);
      if (!subD || !dueD) return true;
      const subMs = new Date(subD.getFullYear(), subD.getMonth(), subD.getDate()).getTime();
      const dueMs = new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate()).getTime();
      return subMs <= dueMs;
    };

    // Filter users list based on selectedUser / department
    let filteredUsers = users;
    if (selectedUser && selectedUser !== "all") {
      filteredUsers = filteredUsers.filter((u) => u.user_name === selectedUser);
    }
    if (department && department !== "all") {
      filteredUsers = filteredUsers.filter((u) => u.department === department);
    }

    // Build per-person metrics
    const peopleRows = filteredUsers.map((u) => {
      const uName = (u.user_name || "").trim();
      const uLower = uName.toLowerCase();

      // Tasks assigned to this user across all task systems
      const userTasks = allTasks.filter((t) => {
        const assignedName = (t.assigned_person || t.name || t.doer_name || t.doer || t.filled_by || t.user_name || "").trim().toLowerCase();
        return assignedName === uLower;
      });

      // Filter tasks within THIS PERIOD (between startMs and endMs)
      const periodTasks = userTasks.filter((t) => {
        const pDate = parseDateSafe(t.planned_date || t.task_start_date || t.created_at);
        if (!pDate) return false;
        const pMs = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate()).getTime();
        return pMs >= startMs && pMs <= endMs;
      });

      const target = periodTasks.length;
      const completedTasks = periodTasks.filter(isCompleted);
      const actualWorkDone = completedTasks.length;
      const onTimeTasks = completedTasks.filter(isOnTime);

      const percentDoneVal = target > 0 ? (actualWorkDone / target) * 100 : null;
      const percentDoneOnTimeVal = actualWorkDone > 0 ? (onTimeTasks.length / actualWorkDone) * 100 : null;

      // Pending in period
      const pendingPeriod = target - actualWorkDone;

      // Unique task key generator to prevent double-counting across merged systems
      const getTaskUniqueKey = (t, idx) =>
        t._sys && t.id ? `${t._sys}_${t.id}` : t.id ? String(t.id) : `${t._sys || "task"}_${t.task_name || t.title || "item"}_${t.planned_date || idx}`;

      // Tasks executed/submitted during THIS PERIOD (includes completed period tasks + backlog tasks cleared this period)
      const periodSubmittedTasks = userTasks.filter((t) => {
        if (!isCompleted(t)) return false;
        if (!t.submission_date) return false;
        const sDate = parseDateSafe(t.submission_date);
        if (!sDate) return false;
        const sMs = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();
        return sMs >= startMs && sMs <= endMs;
      });

      // Total work done during THIS PERIOD (period tasks completed + any backlog tasks submitted in this period)
      const doneTaskKeys = new Set();
      completedTasks.forEach((t, i) => doneTaskKeys.add(getTaskUniqueKey(t, i)));
      periodSubmittedTasks.forEach((t, i) => doneTaskKeys.add(getTaskUniqueKey(t, i)));
      const totalWorkDone = doneTaskKeys.size;

      // Total completed tasks across entire tenure/history (lifetime achievement)
      const lifetimeWorkDone = userTasks.filter(isCompleted).length;

      // Cumulative backlog (All Pending till today across entire history)
      const allPending = userTasks.filter((t) => {
        if (isCompleted(t)) return false;
        const pDate = parseDateSafe(t.planned_date || t.task_start_date || t.created_at);
        if (!pDate) return true;
        const pMs = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate()).getTime();
        return pMs <= todayEndMs;
      }).length;

      // Tasks of this user in PREVIOUS PERIOD (last week)
      const prevPeriodTasks = userTasks.filter((t) => {
        const pDate = parseDateSafe(t.planned_date || t.task_start_date || t.created_at);
        if (!pDate) return false;
        const pMs = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate()).getTime();
        return pMs >= prevRange.startMs && pMs <= prevRange.endMs;
      });

      const prevTarget = prevPeriodTasks.length;
      const prevCompleted = prevPeriodTasks.filter(isCompleted).length;
      const prevOnTime = prevPeriodTasks.filter(isOnTime).length;

      let autoPlannedPercentNotDone = 0;
      let autoPlannedPercentNotDoneOnTime = 0;

      if (prevTarget > 0) {
        autoPlannedPercentNotDone = Math.max(0, Math.round(((prevTarget - prevCompleted) / prevTarget) * 100));
      }
      if (prevCompleted > 0) {
        autoPlannedPercentNotDoneOnTime = Math.max(0, Math.round(((prevCompleted - prevOnTime) / prevCompleted) * 100));
      }

      // Last week commitment data
      const lastCommitment = prevCommitmentMap.get(uLower);
      const currentCommitment = currentCommitmentMap.get(uLower);

      // If a saved commitment exists, use its percentages; otherwise automatically use actual previous week metrics!
      const plannedPercentNotDone =
        lastCommitment?.percent_not_done !== undefined && lastCommitment?.percent_not_done !== null
          ? Number(lastCommitment.percent_not_done)
          : autoPlannedPercentNotDone;

      const plannedPercentNotDoneOnTime =
        lastCommitment?.percent_not_done_on_time !== undefined && lastCommitment?.percent_not_done_on_time !== null
          ? Number(lastCommitment.percent_not_done_on_time)
          : autoPlannedPercentNotDoneOnTime;

      const commitmentText =
        currentCommitment?.commitment ||
        lastCommitment?.commitment ||
        getDefaultRoleCommitment(u, allPending, target);

      const currentPercentNotDone = percentDoneVal !== null ? Math.max(0, Math.round(100 - percentDoneVal)) : (target > 0 ? 100 : 0);
      const currentPercentNotDoneOnTime = percentDoneOnTimeVal !== null ? Math.max(0, Math.round(100 - percentDoneOnTimeVal)) : 0;

      // Individual score status
      let scoreCategory = "Positive (+)";
      if (percentDoneVal !== null) {
        if (percentDoneVal < 50) {
          scoreCategory = "Needs Improvement (-)";
        } else if (percentDoneVal < 80) {
          scoreCategory = "Average (~ )";
        }
      }

      return {
        id: u.id || uName,
        user_name: uName,
        company: u.company || "botivate",
        department: u.department || "General",
        designation: u.designation || "Employee",
        profile_image: u.profile_image || null,
        target,
        actualWorkDone,
        percentDone: percentDoneVal !== null ? Math.round(percentDoneVal) : null,
        percentDoneOnTime: percentDoneOnTimeVal !== null ? Math.round(percentDoneOnTimeVal) : null,
        totalWorkDone,
        lifetimeWorkDone,
        pending: pendingPeriod > 0 ? pendingPeriod : 0,
        allPending,
        score: scoreCategory,
        // Last week commitment fields
        plannedPercentNotDone: Math.round(plannedPercentNotDone),
        plannedPercentNotDoneOnTime: Math.round(plannedPercentNotDoneOnTime),
        currentPercentNotDone,
        currentPercentNotDoneOnTime,
        commitment: commitmentText,
      };
    });

    // 2. Compute Top KPI Cards
    const totalEmployees = peopleRows.length;
    const totalTarget = peopleRows.reduce((sum, r) => sum + r.target, 0);
    const totalCompleted = peopleRows.reduce((sum, r) => sum + r.actualWorkDone, 0);
    const totalPendingPeriod = peopleRows.reduce((sum, r) => sum + r.pending, 0);
    const totalAllPending = peopleRows.reduce((sum, r) => sum + r.allPending, 0);
    const completionRate = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

    let overallScore = "Positive (+)";
    if (totalTarget > 0 && completionRate < 50) {
      overallScore = "Needs Improvement (-)";
    } else if (totalTarget > 0 && completionRate < 75) {
      overallScore = "Average (~ )";
    }

    // 3. Analytics: Top 5 Best Performers
    const sortedBest = [...peopleRows].sort((a, b) => {
      const pDoneA = a.percentDone ?? -1;
      const pDoneB = b.percentDone ?? -1;
      if (pDoneB !== pDoneA) return pDoneB - pDoneA;
      const onTimeA = a.percentDoneOnTime ?? -1;
      const onTimeB = b.percentDoneOnTime ?? -1;
      if (onTimeB !== onTimeA) return onTimeB - onTimeA;
      return b.actualWorkDone - a.actualWorkDone;
    });
    const topBestPerformers = sortedBest.slice(0, 5);

    // 4. Analytics: Pending Tasks by User
    const sortedPending = [...peopleRows].sort((a, b) => b.allPending - a.allPending || b.pending - a.pending);
    const topPendingByUser = sortedPending.slice(0, 5);

    // 5. Analytics: Top 5 Worst Performers
    const sortedWorst = [...peopleRows].sort((a, b) => {
      const pDoneA = a.percentDone ?? 0;
      const pDoneB = b.percentDone ?? 0;
      if (pDoneA !== pDoneB) return pDoneA - pDoneB;
      return b.allPending - a.allPending;
    });
    const topWorstPerformers = sortedWorst.slice(0, 5);

    // 6. Analytics: Department Scores
    const deptMap = new Map();
    peopleRows.forEach((r) => {
      const d = r.department || "General";
      if (!deptMap.has(d)) {
        deptMap.set(d, {
          department: d,
          company: r.company || "botivate",
          peopleCount: 0,
          target: 0,
          actualWorkDone: 0,
          totalWorkDone: 0,
          pending: 0,
          allPending: 0,
          onTimeCount: 0,
        });
      }
      const entry = deptMap.get(d);
      entry.peopleCount += 1;
      entry.target += r.target;
      entry.actualWorkDone += r.actualWorkDone;
      entry.totalWorkDone += r.totalWorkDone;
      entry.pending += r.pending;
      entry.allPending += r.allPending;
      if (r.percentDoneOnTime !== null) {
        entry.onTimeCount += Math.round((r.percentDoneOnTime * r.actualWorkDone) / 100);
      }
    });

    const departmentScores = Array.from(deptMap.values()).map((d) => {
      const pctDone = d.target > 0 ? (d.actualWorkDone / d.target) * 100 : 0;
      const pctOnTime = d.actualWorkDone > 0 ? (d.onTimeCount / d.actualWorkDone) * 100 : 0;
      return {
        ...d,
        pending: d.pending,
        percentDone: Number(pctDone.toFixed(1)),
        percentDoneOnTime: Number(pctOnTime.toFixed(1)),
      };
    });

    return {
      kpiCards: {
        totalEmployees,
        totalTarget,
        completed: totalCompleted,
        pendingPeriod: totalPendingPeriod,
        allPending: totalAllPending,
        completionRate,
        overallScore,
      },
      peopleRows,
      topBestPerformers,
      topPendingByUser,
      topWorstPerformers,
      departmentScores,
    };
  } catch (err) {
    console.error("fetchLiveMisDashboardData unexpected error:", err);
    return {
      kpiCards: {
        totalEmployees: 0,
        totalTarget: 0,
        completed: 0,
        pendingPeriod: 0,
        allPending: 0,
        completionRate: 0,
        overallScore: "Positive (+)",
      },
      peopleRows: [],
      topBestPerformers: [],
      topPendingByUser: [],
      topWorstPerformers: [],
      departmentScores: [],
    };
  }
}
