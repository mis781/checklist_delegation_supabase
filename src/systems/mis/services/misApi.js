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
  try {
    let query = supabase
      .from("mis_commitments")
      .select("*")
      .order("date_start", { ascending: false });

    if (startDate) {
      query = query.gte("date_start", startDate);
    }
    if (endDate) {
      query = query.lte("date_end", endDate);
    }
    if (userName && userName !== "all") {
      query = query.eq("user_name", userName);
    }
    if (department && department !== "all") {
      query = query.eq("department", department);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("fetchCommitmentHistory error:", error);
      return [];
    }

    let records = data || [];

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

    return records;
  } catch (err) {
    console.error("fetchCommitmentHistory unexpected error:", err);
    return [];
  }
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
      actual_work_done: Number(record.actual_work_done) || 0,
      percent_done: Number(record.percent_done) || 0,
      percent_done_on_time: Number(record.percent_done_on_time) || 0,
      percent_not_done: Number(record.percent_not_done) || 0,
      percent_not_done_on_time: Number(record.percent_not_done_on_time) || 0,
      total_work_done: Number(record.total_work_done) || 0,
      pending: Number(record.pending) || 0,
      all_pending: Number(record.all_pending) || 0,
      score: record.score || "Positive (+)",
      commitment: record.commitment || "",
      status: record.status || "pending",
      remarks: record.remarks || "",
      recorded_by: record.recorded_by || localStorage.getItem("user-name") || "Admin",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("mis_commitments")
      .upsert(payload, { onConflict: "user_name,date_start,date_end,period_type" })
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("saveMisCommitment error:", err);
    return { data: null, error: err };
  }
}

/**
 * Bulk save snapshots of current review period commitments
 */
export async function saveBulkCommitments(records = []) {
  if (!records.length) return { success: true, count: 0 };
  try {
    const payload = records.map((r) => ({
      period_type: r.period_type || "weekly",
      date_start: r.date_start,
      date_end: r.date_end,
      user_name: r.user_name,
      company: r.company || "botivate",
      department: r.department || "General",
      designation: r.designation || "Employee",
      target: Number(r.target) || 0,
      actual_work_done: Number(r.actualWorkDone ?? r.actual_work_done) || 0,
      percent_done: Number(r.percentDone ?? r.percent_done) || 0,
      percent_done_on_time: Number(r.percentDoneOnTime ?? r.percent_done_on_time) || 0,
      percent_not_done: Number(r.plannedPercentNotDone ?? r.percent_not_done) || 0,
      percent_not_done_on_time: Number(r.plannedPercentNotDoneOnTime ?? r.percent_not_done_on_time) || 0,
      total_work_done: Number(r.totalWorkDone ?? r.total_work_done) || 0,
      pending: Number(r.pending) || 0,
      all_pending: Number(r.allPending ?? r.all_pending) || 0,
      score: r.score || "Positive (+)",
      commitment: r.commitment || "",
      status: r.status || "pending",
      recorded_by: localStorage.getItem("user-name") || "Admin",
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("mis_commitments")
      .upsert(payload, { onConflict: "user_name,date_start,date_end,period_type" });

    if (error) throw error;
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
    const [checklistRes, delegationRes, maintenanceRes, repairRes, currentCommitmentsRes, prevCommitmentsRes] =
      await Promise.allSettled([
        fetchAllRows(() => supabase.from("checklist").select("*")),
        fetchAllRows(() => supabase.from("delegation").select("*")),
        fetchAllRows(() => supabase.from("maintenance").select("*")),
        fetchAllRows(() => supabase.from("repair").select("*")),
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

    const checklistTasks = checklistRes.status === "fulfilled" && Array.isArray(checklistRes.value) ? checklistRes.value : [];
    const delegationTasks = delegationRes.status === "fulfilled" && Array.isArray(delegationRes.value) ? delegationRes.value : [];
    const maintenanceTasks = maintenanceRes.status === "fulfilled" && Array.isArray(maintenanceRes.value) ? maintenanceRes.value : [];
    const repairTasks = repairRes.status === "fulfilled" && Array.isArray(repairRes.value) ? repairRes.value : [];

    const currentCommitments =
      currentCommitmentsRes.status === "fulfilled" && currentCommitmentsRes.value?.data
        ? currentCommitmentsRes.value.data
        : [];
    const prevCommitments =
      prevCommitmentsRes.status === "fulfilled" && prevCommitmentsRes.value?.data
        ? prevCommitmentsRes.value.data
        : [];

    console.log("MIS Aggregation Engine Raw Tasks Count:", {
      checklist: checklistTasks.length,
      delegation: delegationTasks.length,
      maintenance: maintenanceTasks.length,
      repair: repairTasks.length,
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
    ];

    // Helper: determine if task is completed
    const isCompleted = (t) => {
      if (t.submission_date) return true;
      const statusLower = String(t.status || "").toLowerCase().trim();
      if (
        statusLower === "yes" ||
        statusLower === "done" ||
        statusLower.includes("done") ||
        statusLower.includes("completed") ||
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

      // Tasks assigned to this user across all 4 systems
      const userTasks = allTasks.filter((t) => {
        const assignedName = (t.name || t.doer_name || t.doer || t.filled_by || t.user_name || "").trim().toLowerCase();
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

      // Lifetime total work done ever
      const totalWorkDone = userTasks.filter(isCompleted).length;

      // Cumulative backlog (All Pending till today across entire history)
      const allPending = userTasks.filter((t) => {
        if (isCompleted(t)) return false;
        const pDate = parseDateSafe(t.planned_date || t.task_start_date || t.created_at);
        if (!pDate) return true;
        const pMs = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate()).getTime();
        return pMs <= todayEndMs;
      }).length;

      // Last week commitment data
      const lastCommitment = prevCommitmentMap.get(uLower);
      const currentCommitment = currentCommitmentMap.get(uLower);

      const plannedPercentNotDone = lastCommitment?.percent_not_done ?? 0;
      const plannedPercentNotDoneOnTime = lastCommitment?.percent_not_done_on_time ?? 0;
      const commitmentText = currentCommitment?.commitment || lastCommitment?.commitment || "";

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
        pending: pendingPeriod > 0 ? pendingPeriod : 0,
        allPending,
        score: scoreCategory,
        // Last week commitment fields
        plannedPercentNotDone: Math.round(plannedPercentNotDone),
        plannedPercentNotDoneOnTime: Math.round(plannedPercentNotDoneOnTime),
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
