/**
 * Purchase Return System TAT (Turn Around Time) & SLA Management Engine
 * Centralized deterministic TAT calculation and state timeline compiler for Purchase Return.
 */

export const PURCHASE_RETURN_STAGE_KEYS = {
  RETURN_APPROVAL: "Return Approval",
  ASK_CREDIT_NOTE: "Ask Credit Note",
  ARRANGE_LOGISTICS: "Arrange Logistics",
  ISSUE_DEBIT_NOTE: "Issue Debit Note",
  RETURN_FROM_PLANT: "Return From Plant",
};

export const WORKFLOW_RETURN_STAGES_CONFIG = [
  {
    stageKey: "approval",
    stageNumber: 1,
    stageName: PURCHASE_RETURN_STAGE_KEYS.RETURN_APPROVAL,
    displayName: "Stage 01: Return Approval",
    shortName: "Approval",
    ownerRole: "Return Approver / HOD",
    description: "Verify damaged material and authorize return action type",
  },
  {
    stageKey: "credit",
    stageNumber: 2,
    stageName: PURCHASE_RETURN_STAGE_KEYS.ASK_CREDIT_NOTE,
    displayName: "Stage 02: Ask Credit Note",
    shortName: "Credit Note",
    ownerRole: "Accounts / Purchase Officer",
    description: "Request credit note from vendor prior to dispatch / settlement",
  },
  {
    stageKey: "logistics",
    stageNumber: 3,
    stageName: PURCHASE_RETURN_STAGE_KEYS.ARRANGE_LOGISTICS,
    displayName: "Stage 03: Arrange Logistics",
    shortName: "Logistics",
    ownerRole: "Logistics Coordinator",
    description: "Coordinate transporter, vehicle placement and bilty receipt",
  },
  {
    stageKey: "debitNote",
    stageNumber: 4,
    stageName: PURCHASE_RETURN_STAGE_KEYS.ISSUE_DEBIT_NOTE,
    displayName: "Stage 04: Issue Debit Note",
    shortName: "Debit Note",
    ownerRole: "Accounts / Finance Dept",
    description: "Issue debit note and notify supplier accounts",
  },
  {
    stageKey: "plantReturn",
    stageNumber: 5,
    stageName: PURCHASE_RETURN_STAGE_KEYS.RETURN_FROM_PLANT,
    displayName: "Stage 05: Return From Plant",
    shortName: "Return From Plant",
    ownerRole: "Store Incharge / Gate Security",
    description: "Physical gate dispatch verification with loading proof",
  },
];

export const TAT_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  ON_TRACK: "ON_TRACK",
  DELAY: "DELAY",
  BREACHED: "DELAY",
  AT_RISK: "ON_TRACK",
  WITHIN_SLA: "ON_TRACK",
  COMPLETED: "ON_TRACK",
};

export const OFFICE_HOURS = {
  START_HOUR: 10,
  END_HOUR: 18,
  DAILY_WORK_MINUTES: 8 * 60,
};

/**
 * Converts SLA completion time and time unit into duration in minutes.
 */
export function convertToMinutes(timeValue, unit = "hr") {
  const val = Number(timeValue) || 0;
  const u = String(unit || "hr").toLowerCase().trim();

  if (u.startsWith("sec")) {
    return Math.max(1, Math.round(val / 60));
  }
  if (u.startsWith("min")) {
    return val;
  }
  if (u.startsWith("hr") || u.startsWith("hour")) {
    return val * 60;
  }
  if (u.startsWith("day")) {
    return val * 24 * 60;
  }
  return val * 60;
}

/**
 * Formats duration in minutes into human-readable string (e.g., "2d 4h", "5h 30m", "45m")
 */
export function formatDurationMinutes(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "—";
  const absMin = Math.abs(Math.round(minutes));
  if (absMin === 0) return "0m";

  const days = Math.floor(absMin / (24 * 60));
  const remainingAfterDays = absMin % (24 * 60);
  const hours = Math.floor(remainingAfterDays / 60);
  const mins = remainingAfterDays % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}m`);

  return parts.length > 0 ? parts.join(" ") : `${mins}m`;
}

/**
 * Calculates office working hours duration in minutes between two dates.
 */
export function calculateOfficeHoursDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start >= end) return 0;

  let totalWorkingMinutes = 0;
  const current = new Date(start);

  while (current < end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0) {
      current.setDate(current.getDate() + 1);
      current.setHours(OFFICE_HOURS.START_HOUR, 0, 0, 0);
      continue;
    }

    const dayStart = new Date(current);
    dayStart.setHours(OFFICE_HOURS.START_HOUR, 0, 0, 0);

    const dayEnd = new Date(current);
    dayEnd.setHours(OFFICE_HOURS.END_HOUR, 0, 0, 0);

    if (current < dayStart) {
      current.setTime(dayStart.getTime());
    }

    if (current >= dayEnd) {
      current.setDate(current.getDate() + 1);
      current.setHours(OFFICE_HOURS.START_HOUR, 0, 0, 0);
      continue;
    }

    const windowEnd = end < dayEnd ? end : dayEnd;
    const diffMs = windowEnd.getTime() - current.getTime();
    if (diffMs > 0) {
      totalWorkingMinutes += Math.floor(diffMs / 60000);
    }

    current.setTime(windowEnd.getTime());
    if (current >= dayEnd) {
      current.setDate(current.getDate() + 1);
      current.setHours(OFFICE_HOURS.START_HOUR, 0, 0, 0);
    }
  }

  return Math.max(0, totalWorkingMinutes);
}

/**
 * Adds calendar duration in minutes to a start date.
 */
export function addCalendarHours(startDate, durationMinutes) {
  if (!startDate || !durationMinutes) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + durationMinutes * 60000);
}

/**
 * Resolves active TAT rule for a given stage name in Purchase Return System from master_tat_rules list.
 */
export function resolveReturnTatRule(stageName, rulesList = []) {
  if (!stageName) return null;
  const cleanSec = stageName.trim().toLowerCase();

  const matched = (rulesList || []).find((r) => {
    if (r.is_active === false) return false;
    const sys = String(r.system_name || r.system || "").toLowerCase();
    const sec = String(r.section_name || r.stage_name || r.stage || "").toLowerCase();
    const isSysMatch = sys.includes("return") || sys === "purchase return system";
    return isSysMatch && (sec === cleanSec || cleanSec.includes(sec) || sec.includes(cleanSec));
  });

  if (matched) {
    const timeValue = Number(matched.completion_time ?? matched.time_value ?? 0);
    if (timeValue <= 0) return null;
    const unit = matched.time_unit || matched.unit || "hr";
    return {
      system_name: matched.system_name || "Purchase Return",
      stage_name: stageName,
      time_value: timeValue,
      unit: unit,
      duration_minutes: convertToMinutes(timeValue, unit),
      description: matched.description || "",
    };
  }

  return null;
}

/**
 * Compiles end-to-end TAT timeline for a Purchase Return record.
 */
export function compileReturnTatTimeline(record, rulesList = []) {
  if (!record) return null;

  const reqDate = record.requestDate
    ? new Date(record.requestDate)
    : record.created_at
    ? new Date(record.created_at)
    : null;

  const appDate = record.approval?.approvalDate
    ? new Date(record.approval.approvalDate)
    : record.rejected?.date
    ? new Date(record.rejected.date)
    : null;

  const cnDate = record.creditNote?.askedDate
    ? new Date(record.creditNote.askedDate)
    : null;

  const logDate = record.logistics?.arrangedDate
    ? new Date(record.logistics.arrangedDate)
    : null;

  const dnRow = record.debitNote || (record.debitNotes && record.debitNotes[0]);
  const dnDate = dnRow?.issuedDate ? new Date(dnRow.issuedDate) : null;

  const dispDate = record.dispatch?.dispatchedDate
    ? new Date(record.dispatch.dispatchedDate)
    : null;

  const now = new Date();

  const isApproved = Boolean(record.approval);
  const isRejected = Boolean(record.rejected);
  const actionType = record.approval?.actionType || record.action_type || "";

  const stages = WORKFLOW_RETURN_STAGES_CONFIG.map((cfg) => {
    let startedAt = null;
    let completedAt = null;
    let isCompleted = false;
    let isActive = false;

    switch (cfg.stageKey) {
      case "approval":
        startedAt = reqDate;
        completedAt = appDate;
        isCompleted = isApproved || isRejected;
        isActive = !isCompleted;
        break;

      case "credit":
        startedAt = isApproved ? appDate : null;
        completedAt = cnDate;
        isCompleted = Boolean(cnDate);
        isActive =
          isApproved &&
          !isCompleted &&
          actionType !== "Replace" &&
          actionType !== "No Return No Debit Note";
        break;

      case "logistics":
        startedAt =
          actionType === "Replace" ? appDate : cnDate || (isApproved ? appDate : null);
        completedAt = logDate;
        isCompleted = Boolean(logDate);
        isActive =
          isApproved &&
          !isCompleted &&
          (actionType === "Replace" || Boolean(cnDate));
        break;

      case "debitNote":
        startedAt = logDate || cnDate || (isApproved ? appDate : null);
        completedAt = dnDate;
        isCompleted = Boolean(dnDate);
        isActive =
          isApproved &&
          !isCompleted &&
          actionType !== "Replace" &&
          actionType !== "No Return No Debit Note";
        break;

      case "plantReturn":
        startedAt = dnDate || logDate || (isApproved ? appDate : null);
        completedAt = dispDate;
        isCompleted = Boolean(dispDate);
        isActive =
          isApproved &&
          !isCompleted &&
          (Boolean(dnDate) || actionType === "Replace");
        break;

      default:
        break;
    }

    const rule = resolveReturnTatRule(cfg.stageName, rulesList);
    const slaMinutes = rule ? rule.duration_minutes : null;

    let dueAt = null;
    if (startedAt && slaMinutes) {
      dueAt = addCalendarHours(startedAt, slaMinutes);
    }

    let status = TAT_STATUS.NOT_STARTED;
    let remainingFormatted = "";
    let overdueFormatted = "";

    if (dueAt && !isNaN(dueAt.getTime())) {
      if (isCompleted) {
        if (completedAt && !isNaN(completedAt.getTime())) {
          const isDelayed = completedAt.getTime() > dueAt.getTime();
          status = isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;
          if (isDelayed) {
            const overMins = calculateOfficeHoursDuration(dueAt, completedAt);
            overdueFormatted = `${formatDurationMinutes(overMins)} overdue`;
          } else {
            remainingFormatted = "Completed";
          }
        } else {
          status = TAT_STATUS.ON_TRACK;
          remainingFormatted = "Completed";
        }
      } else if (isActive) {
        const isDelayed = now.getTime() > dueAt.getTime();
        status = isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;
        if (isDelayed) {
          const overMins = calculateOfficeHoursDuration(dueAt, now);
          overdueFormatted = `${formatDurationMinutes(overMins)} overdue`;
        } else {
          const remMins = calculateOfficeHoursDuration(now, dueAt);
          remainingFormatted = `${formatDurationMinutes(remMins)} left`;
        }
      } else {
        status = TAT_STATUS.NOT_STARTED;
      }
    }

    return {
      stageKey: cfg.stageKey,
      stageNumber: cfg.stageNumber,
      stageName: cfg.stageName,
      displayName: cfg.displayName,
      shortName: cfg.shortName,
      rule,
      startedAt: startedAt ? startedAt.toISOString() : null,
      completedAt: completedAt ? completedAt.toISOString() : null,
      dueAt: dueAt ? dueAt.toISOString() : null,
      slaMinutes,
      isCompleted,
      isActive,
      status,
      remainingFormatted,
      overdueFormatted,
    };
  });

  const activeStage = stages.find((s) => s.isActive) || stages[0];

  return {
    returnId: record.id,
    returnNumber: record.returnNumber || record.return_number,
    stages,
    activeStage,
  };
}

/**
 * Returns TAT status for a specific return record and stage name.
 */
export function getTatStatusForReturn(recordOrId, stageName, records = [], rulesList = []) {
  if (!recordOrId) return null;

  const record =
    typeof recordOrId === "object"
      ? recordOrId
      : (records || []).find((r) => r.id === recordOrId);

  if (!record) return null;

  const timeline = compileReturnTatTimeline(record, rulesList);
  if (!timeline) return null;

  if (!stageName) return timeline.activeStage || null;

  const cleanName = stageName.trim().toLowerCase();
  const stageMatch = timeline.stages.find(
    (s) =>
      s.stageName.toLowerCase() === cleanName ||
      s.displayName?.toLowerCase().includes(cleanName) ||
      cleanName.includes(s.stageName.toLowerCase()) ||
      s.stageKey.toLowerCase() === cleanName
  );

  return stageMatch || null;
}
