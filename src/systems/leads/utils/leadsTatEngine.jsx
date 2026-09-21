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
    time_value: 24,
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

/**
 * Converts SLA value and unit to minutes.
 */
export function slaToMinutes(timeValue, unit = "hr") {
  const val = parseFloat(timeValue);
  if (isNaN(val) || val <= 0) return 24 * 60;
  const u = String(unit).toLowerCase().trim();
  if (u === "day" || u === "days") {
    return Math.round(val * 24 * 60);
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
 * Formats overdue duration in milliseconds into a concise delay string e.g. "+4h 20m", "+2d 3h".
 */
export function formatDelayDuration(diffMs) {
  if (diffMs <= 0) return "0m";
  const totalMins = Math.floor(diffMs / (60 * 1000));
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
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
 * Formats remaining duration in milliseconds before deadline e.g. "In 5h 30m", "In 2d".
 */
export function formatRemainingDuration(diffMs) {
  if (diffMs <= 0) return "Due Now";
  const totalMins = Math.floor(diffMs / (60 * 1000));
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
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
  const matched = (rulesList || []).find((r) => {
    const name = String(r.stage_name || r.section_name || r.stage || "").trim().toLowerCase();
    return name === cleanTarget;
  });

  if (matched) {
    return {
      stageName: stageKey,
      timeValue: parseFloat(matched.completion_time ?? matched.time_value ?? 24),
      unit: matched.time_unit || matched.unit || "hr",
      description: matched.description || "",
    };
  }

  const def = DEFAULT_LEADS_TAT_RULES.find(
    (d) => d.stage_name.toLowerCase() === cleanTarget
  );

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
        plannedDate = new Date(baseDate.getTime() + slaMins * 60 * 1000);
        detailText = `Initial Call SLA (${slaText})`;
      }
    }
  } else if (stageKey === LEADS_STAGE_KEYS.PENDING_QUOTATION) {
    // Base date: when enquiry was marked "Make Quotation"
    const baseDate = parseLeadDate(
      record.date ||
      record.timestamp ||
      record.enquiryReceivedDate ||
      record.created_at ||
      record.savedAt
    );
    if (baseDate) {
      plannedDate = new Date(baseDate.getTime() + slaMins * 60 * 1000);
      detailText = `Quotation Prep SLA (${slaText})`;
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
        plannedDate = new Date(baseDate.getTime() + slaMins * 60 * 1000);
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
  if (isOverdue) {
    delayFormatted = formatDelayDuration(diffMs);
  } else {
    delayFormatted = "On Track";
  }

  return {
    plannedDate,
    plannedFormatted: formatPlannedDateTime(plannedDate),
    delayFormatted,
    isOverdue,
    isExtended,
    status: isOverdue ? "DELAY" : "ON_TRACK",
    remainingFormatted: isOverdue ? "" : formatRemainingDuration(Math.abs(diffMs)),
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
