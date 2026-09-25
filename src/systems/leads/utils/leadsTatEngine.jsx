import { fetchMasterTatRules } from "../../purchase/services/purchaseMasterApi";

export const LEADS_STAGE_KEYS = {
  FOLLOWUP_TRACKER: "Followup Tracker",
  PENDING_QUOTATION: "Pending Quotation",
  QUOTATION_TRACKER: "Quotation Tracker",
};

export const DEFAULT_LEADS_TAT_RULES = [
  {
    system_name: "Leads System",
    stage_name: "Followup Tracker",
    time_value: 24,
    unit: "hr",
    description: "Time to complete first or scheduled follow-up call",
  },
  {
    system_name: "Leads System",
    stage_name: "Pending Quotation",
    time_value: 48,
    unit: "hr",
    description: "Time to prepare and issue quotation after enquiry confirmation",
  },
  {
    system_name: "Leads System",
    stage_name: "Quotation Tracker",
    time_value: 48,
    unit: "hr",
    description: "Time to follow up on quotation and record order decision",
  },
];

export const OFFICE_HOURS = {
  START_HOUR: 10, // 10:00 AM
  END_HOUR: 18,   // 6:00 PM (18:00)
  DAILY_WORK_MINUTES: 8 * 60, // 480 minutes (8 working hours/day)
};

/**
 * Converts SLA value and unit to minutes.
 * When unit is 'day', it corresponds to 1 working day (8 working hours = 480 minutes).
 * When unit is 'hr', it corresponds to working hours (e.g., 24hr = 3 working days).
 */
export function slaToMinutes(timeValue, unit = "hr") {
  const val = parseFloat(timeValue);
  if (isNaN(val) || val <= 0) return 24 * 60;
  const u = String(unit).toLowerCase().trim();
  if (u === "day" || u === "days") {
    return Math.round(val * OFFICE_HOURS.DAILY_WORK_MINUTES);
  }
  if (u === "min" || u === "minutes" || u === "m") {
    return Math.round(val);
  }
  return Math.round(val * 60);
}

/**
 * Parses various date formats (ISO string, DD/MM/YYYY, DD-MM-YYYY, with or without time) into a valid Date object.
 */
export function parseLeadDate(dateStr, timeStr = "") {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  const raw = String(dateStr).trim();
  if (!raw) return null;

  // Check if standard ISO format e.g. "2026-09-21T10:30:00"
  if (raw.includes("T") || (raw.includes("-") && raw.length > 10)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }

  // Check if DD/MM/YYYY or DD-MM-YYYY
  const parts = raw.split(/[/ -]/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);

    // If year is first e.g. YYYY-MM-DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }

    let hours = 10;
    let minutes = 0;

    // Check if time is included in dateStr or timeStr
    if (timeStr) {
      const timeParts = String(timeStr).trim().split(":");
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
      }
    } else if (raw.includes(":") && raw.includes(" ")) {
      const timePortion = raw.split(" ")[1];
      const timeParts = timePortion.split(":");
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
      }
    }

    const parsed = new Date(year, month, day, hours, minutes, 0);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats a Date object to DD/MM/YYYY hh:mm AM/PM.
 */
export function formatPlannedDateTime(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, "0");

  return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Adds office/working hours duration in minutes to a start date.
 * Working window: 10:00 AM to 6:00 PM (8 hours/day).
 * Sundays (day 0) are non-working days and are skipped.
 * Outside office hours, snaps/advances to the next 10:00 AM working window.
 */
export function addOfficeHours(startDate, slaMinutes, workStartHour = OFFICE_HOURS.START_HOUR, workEndHour = OFFICE_HOURS.END_HOUR) {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;

  let cur = new Date(d.getTime());

  // Advance past Sunday if start date falls on Sunday
  while (cur.getDay() === 0) {
    cur.setDate(cur.getDate() + 1);
    cur.setHours(workStartHour, 0, 0, 0);
  }

  const curHours = cur.getHours();
  const curMinutes = cur.getMinutes();
  const timeInMins = curHours * 60 + curMinutes;
  const startWindowMins = workStartHour * 60;
  const endWindowMins = workEndHour * 60;

  // Snap to working window
  if (timeInMins < startWindowMins) {
    cur.setHours(workStartHour, 0, 0, 0);
  } else if (timeInMins >= endWindowMins) {
    cur.setDate(cur.getDate() + 1);
    cur.setHours(workStartHour, 0, 0, 0);
    while (cur.getDay() === 0) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
    }
  }

  let remaining = Math.max(0, Number(slaMinutes) || 0);
  let safetyLoop = 0;

  while (remaining > 0 && safetyLoop < 1000) {
    safetyLoop++;

    if (cur.getDay() === 0) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
      continue;
    }

    const endOfDay = new Date(cur.getTime());
    endOfDay.setHours(workEndHour, 0, 0, 0);

    const availableToday = Math.max(0, Math.floor((endOfDay.getTime() - cur.getTime()) / (60 * 1000)));

    if (availableToday <= 0) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
      continue;
    }

    if (remaining <= availableToday) {
      cur = new Date(cur.getTime() + remaining * 60 * 1000);
      remaining = 0;
      break;
    } else {
      remaining -= availableToday;
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
    }
  }

  while (cur.getDay() === 0) {
    cur.setDate(cur.getDate() + 1);
    cur.setHours(workStartHour, 0, 0, 0);
  }

  return cur;
}

/**
 * Calculates office working hours duration in minutes between two dates.
 * Working window: 10:00 AM to 6:00 PM (8 hours/day).
 * Sundays are skipped.
 */
export function calculateOfficeHoursDuration(startDate, endDate, workStartHour = OFFICE_HOURS.START_HOUR, workEndHour = OFFICE_HOURS.END_HOUR) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start >= end) return 0;

  let totalWorkingMinutes = 0;
  const cur = new Date(start.getTime());

  let safetyLoop = 0;
  while (cur < end && safetyLoop < 5000) {
    safetyLoop++;
    if (cur.getDay() === 0) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
      continue;
    }

    const dayStart = new Date(cur.getTime());
    dayStart.setHours(workStartHour, 0, 0, 0);

    const dayEnd = new Date(cur.getTime());
    dayEnd.setHours(workEndHour, 0, 0, 0);

    if (cur < dayStart) {
      cur.setTime(dayStart.getTime());
    }

    if (cur >= dayEnd) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
      continue;
    }

    const windowEnd = end < dayEnd ? end : dayEnd;
    const diffMs = windowEnd.getTime() - cur.getTime();
    if (diffMs > 0) {
      totalWorkingMinutes += Math.floor(diffMs / (60 * 1000));
    }

    cur.setTime(windowEnd.getTime());
    if (cur >= dayEnd) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
    }
  }

  return Math.max(0, totalWorkingMinutes);
}

/**
 * Formats overdue duration into a concise delay string e.g. "+4h 20m", "+2d 3h".
 * Days are based on working days (1 day = 8 working hours).
 */
export function formatDelayDuration(diffMs, workingMins = null) {
  const totalMins = workingMins !== null ? workingMins : Math.floor(diffMs / (60 * 1000));
  if (totalMins <= 0) return "0m";

  const workDayMins = OFFICE_HOURS.DAILY_WORK_MINUTES || 480;
  const days = Math.floor(totalMins / workDayMins);
  const hours = Math.floor((totalMins % workDayMins) / 60);
  const mins = totalMins % 60;

  if (days > 0) {
    return hours > 0 ? `+${days}d ${hours}h` : `+${days}d`;
  }
  if (hours > 0) {
    return mins > 0 ? `+${hours}h ${mins}m` : `+${hours}h`;
  }
  return `+${mins}m`;
}

/**
 * Formats remaining duration before deadline e.g. "In 5h 30m", "In 2d".
 * Days are based on working days (1 day = 8 working hours).
 */
export function formatRemainingDuration(diffMs, workingMins = null) {
  const totalMins = workingMins !== null ? workingMins : Math.floor(diffMs / (60 * 1000));
  if (totalMins <= 0) return "Due Now";

  const workDayMins = OFFICE_HOURS.DAILY_WORK_MINUTES || 480;
  const days = Math.floor(totalMins / workDayMins);
  const hours = Math.floor((totalMins % workDayMins) / 60);
  const mins = totalMins % 60;

  if (days > 0) {
    return hours > 0 ? `In ${days}d ${hours}h` : `In ${days}d`;
  }
  if (hours > 0) {
    return mins > 0 ? `In ${hours}h ${mins}m` : `In ${hours}h`;
  }
  return `In ${mins}m`;
}

/**
 * Fetches TAT rules for Leads System from database / master cache.
 */
export async function fetchLeadsTatRules() {
  try {
    const allRules = await fetchMasterTatRules();
    const leadsRules = (allRules || []).filter(
      (r) =>
        r.system_name === "Leads System" ||
        r.system === "Leads System" ||
        (!r.system_name && Object.values(LEADS_STAGE_KEYS).includes(r.stage_name))
    );

    if (leadsRules && leadsRules.length > 0) {
      return leadsRules;
    }
  } catch (err) {
    console.warn("Could not load leads TAT rules:", err);
  }
  return DEFAULT_LEADS_TAT_RULES;
}

/**
 * Resolves active rule for a stage.
 */
export function resolveLeadsTatRule(stageKey, rulesList = []) {
  const cleanTarget = String(stageKey).trim().toLowerCase();
  const normalizedTarget = cleanTarget.replace(/[^a-z0-9]/g, "");

  const matched = (rulesList || []).find((r) => {
    const name = String(r.stage_name || r.section_name || r.stage || "").trim().toLowerCase();
    const normName = name.replace(/[^a-z0-9]/g, "");
    return name === cleanTarget || normName === normalizedTarget;
  });

  if (matched) {
    return {
      stageName: stageKey,
      timeValue: parseFloat(matched.completion_time ?? matched.time_value ?? 24),
      unit: matched.time_unit || matched.unit || "hr",
      description: matched.description || "",
    };
  }

  const def = DEFAULT_LEADS_TAT_RULES.find((d) => {
    const dName = d.stage_name.toLowerCase();
    return dName === cleanTarget || dName.replace(/[^a-z0-9]/g, "") === normalizedTarget;
  });

  return def || { stageName: stageKey, timeValue: 24, unit: "hr", description: "Default SLA" };
}

/**
 * Calculates Planned Date and Delay for any record across Followup Tracker, Pending Quotation, or Quotation Tracker.
 * 
 * Rules:
 * - Followup Tracker:
 *   If user scheduled a next follow-up call (nextCallDateTime, nextCallDate + nextCallTime),
 *   the Planned Date extends directly to that scheduled date-time!
 *   Otherwise: Planned Date = Base Date + SLA (default: 24h).
 * - Pending Quotation:
 *   Planned Date = Enquiry Date + SLA (default: 24h).
 * - Quotation Tracker:
 *   If nextFollowup / nextFollowupDate is scheduled, Planned Date extends to that date!
 *   Otherwise: Planned Date = Quotation Date + SLA (default: 48h).
 */
export function calculateLeadsTat(record, stageKey, rulesList = []) {
  if (!record) {
    return {
      plannedDate: null,
      plannedFormatted: "-",
      delayFormatted: "-",
      isOverdue: false,
      isExtended: false,
      status: "ON_TRACK",
      slaText: "24h SLA",
      detailText: "",
    };
  }

  const rule = resolveLeadsTatRule(stageKey, rulesList);
  const slaMins = slaToMinutes(rule.timeValue, rule.unit);
  const slaText = `${rule.timeValue} ${rule.unit}`;

  let plannedDate = null;
  let isExtended = false;
  let detailText = "";

  if (stageKey === LEADS_STAGE_KEYS.FOLLOWUP_TRACKER) {
    // Check if next call date & time was scheduled in follow-up
    const nextCallDateRaw = record.nextCallDate || record.nextFollowupDate || "";
    const nextCallTimeRaw = record.nextCallTime || record.nextFollowupTime || "";
    const nextCallDateTimeRaw = record.nextCallDateTime || "";

    if (nextCallDateTimeRaw) {
      plannedDate = parseLeadDate(nextCallDateTimeRaw);
      isExtended = true;
      detailText = "Next Call Scheduled";
    } else if (nextCallDateRaw) {
      plannedDate = parseLeadDate(nextCallDateRaw, nextCallTimeRaw);
      isExtended = true;
      detailText = "Next Call Scheduled";
    }

    if (!plannedDate) {
      // Base date: lead creation date/timestamp
      const baseDate = parseLeadDate(record.timestamp || record.date || record.created_at || record.createdAt);
      if (baseDate) {
        plannedDate = addOfficeHours(baseDate, slaMins);
        detailText = `Initial Call SLA (${slaText})`;
      }
    }
  } else if (stageKey === LEADS_STAGE_KEYS.PENDING_QUOTATION) {
    // Planned Date = lead.created_at + Followup Tracker SLA + Pending Quotation SLA
    // This accumulates the full journey: Lead Created → Follow-up deadline → Quotation deadline
    const baseDate = parseLeadDate(
      record.date ||
      record.timestamp ||
      record.enquiryReceivedDate ||
      record.created_at ||
      record.savedAt
    );
    if (baseDate) {
      // Step 1: Add the Followup Tracker SLA to the lead's original creation date
      const followupRule = resolveLeadsTatRule(LEADS_STAGE_KEYS.FOLLOWUP_TRACKER, rulesList);
      const followupSlaMins = slaToMinutes(followupRule.timeValue, followupRule.unit);
      const followupDeadline = addOfficeHours(baseDate, followupSlaMins);

      // Step 2: Add the Pending Quotation SLA on top of the followup deadline
      plannedDate = addOfficeHours(followupDeadline, slaMins);
      detailText = `Quotation Prep SLA (Followup ${followupRule.timeValue}${followupRule.unit} + Quotation ${slaText})`;
    }
  } else if (stageKey === LEADS_STAGE_KEYS.QUOTATION_TRACKER) {
    // Check if follow-up date was scheduled
    const nextFollowupRaw = record.nextFollowupDate || record.nextFollowup || "";
    if (nextFollowupRaw) {
      plannedDate = parseLeadDate(nextFollowupRaw);
      if (plannedDate) {
        isExtended = true;
        detailText = "Follow-up Scheduled";
      }
    }

    if (!plannedDate) {
      const baseDate = parseLeadDate(
        record.date ||
        record.quotationDate ||
        record.poDate ||
        record.timestamp ||
        record.created_at
      );
      if (baseDate) {
        plannedDate = addOfficeHours(baseDate, slaMins);
        detailText = `Order Follow-up SLA (${slaText})`;
      }
    }
  }

  if (!plannedDate || isNaN(plannedDate.getTime())) {
    return {
      plannedDate: null,
      plannedFormatted: "-",
      delayFormatted: "-",
      isOverdue: false,
      isExtended: false,
      status: "ON_TRACK",
      slaText,
      detailText: "",
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - plannedDate.getTime();
  const isOverdue = diffMs > 0;

  let delayFormatted = "On Track";
  let remainingFormatted = "";

  if (isOverdue) {
    const overdueWorkMinutes = calculateOfficeHoursDuration(plannedDate, now);
    delayFormatted = formatDelayDuration(diffMs, overdueWorkMinutes);
  } else {
    delayFormatted = "On Track";
    const remainingWorkMinutes = calculateOfficeHoursDuration(now, plannedDate);
    remainingFormatted = formatRemainingDuration(Math.abs(diffMs), remainingWorkMinutes);
  }

  return {
    plannedDate,
    plannedFormatted: formatPlannedDateTime(plannedDate),
    delayFormatted,
    isOverdue,
    isExtended,
    status: isOverdue ? "DELAY" : "ON_TRACK",
    remainingFormatted: isOverdue ? "" : remainingFormatted,
    slaText,
    detailText,
  };
}

/**
 * Visual badge for rendering Delay / TAT status in tables and cards.
 */
export function TatDelayBadge({ tat, tatInfo }) {
  const t = tat || tatInfo;
  if (!t || !t.plannedDate) {
    return <span className="text-gray-400 dark:text-slate-500 font-mono text-xs">-</span>;
  }

  if (t.isOverdue) {
    return (
      <span
        title={`Planned: ${t.plannedFormatted} | Overdue by: ${t.delayFormatted.replace("+", "")}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-2xs whitespace-nowrap cursor-help"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
        <span>{t.delayFormatted} Delay</span>
      </span>
    );
  }

  return (
    <span
      title={`Planned: ${t.plannedFormatted} (${t.remainingFormatted || "On Schedule"})`}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs whitespace-nowrap cursor-help"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      <span>On Track</span>
      {t.remainingFormatted && (
        <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400/80">
          ({t.remainingFormatted})
        </span>
      )}
    </span>
  );
}

/**
 * Resolves the date category for a record: "today", "overdue", or "upcoming".
 * Guaranteed to produce mutually exclusive buckets matching the TAT deadline.
 */
export function getLeadDateCategory(record, stageKey, rulesList = []) {
  if (!record) return "upcoming";
  const tatInfo = calculateLeadsTat(record, stageKey, rulesList);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (tatInfo?.plannedDate) {
    const pDate = new Date(tatInfo.plannedDate);
    if (!isNaN(pDate.getTime())) {
      if (tatInfo.isOverdue || pDate < today) {
        return "overdue";
      }
      if (pDate >= today && pDate < tomorrow) {
        return "today";
      }
      if (pDate >= tomorrow) {
        return "upcoming";
      }
    }
  }

  return "upcoming";
}
