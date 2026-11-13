/**
 * Shared TAT (Turn Around Time) calendar engine.
 *
 * Calculates SLA due dates that respect a working calendar (office hours,
 * weekly off days and holidays). Used by the TAT settings screen (live preview)
 * and by every system's TAT engine (Purchase, Purchase Return, Order Management, Leads).
 *
 * A rule is "advanced" when it carries a `tat_type`. Rules without one keep using each
 * system's original calculation, so existing data keeps working.
 */
import supabase from "../SupabaseClient";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
export const TAT_TYPES = [
  {
    id: "hin",
    legacyId: "hours",
    label: "TAT in Hours (Timestamp inside the Working Hours)",
    short: "TAT in Hours (inside)",
    unit: "hr",
    description: "Counts office hours only",
  },
  {
    id: "hout",
    legacyId: "hours_outside",
    label: "TAT in Hours (Timestamp outside the Working Hours)",
    short: "TAT in Hours (outside)",
    unit: "hr",
    description: "Night or early entry counts from the next office opening",
  },
  {
    id: "min_in",
    legacyId: "minutes",
    label: "TAT in Minutes (Timestamp inside the Working Hours)",
    short: "TAT in Minutes (inside)",
    unit: "min",
    description: "Short tasks, office minutes only",
  },
  {
    id: "min_out",
    legacyId: "minutes_outside",
    label: "TAT in Minutes (Timestamp outside the Working Hours)",
    short: "TAT in Minutes (outside)",
    unit: "min",
    description: "Night or early entry counts from the next office opening",
  },
  {
    id: "days",
    legacyId: "days",
    label: "TAT in days",
    short: "TAT in days",
    unit: "day",
    description: "N working days ahead, off days and holidays skipped",
  },
  {
    id: "t_minus_x",
    legacyId: "tx",
    label: "T-x Formula",
    short: "T-x Formula",
    unit: "day",
    description: "x minutes, hours or days before or after a final date (T)",
  },
  {
    id: "specific_time",
    legacyId: "spec",
    label: "Specific Time",
    short: "Specific Time",
    unit: "day",
    description: "A fixed clock time, e.g. 5:00 PM",
  },
];

export const getTatType = (id) =>
  TAT_TYPES.find((t) => t.id === id || t.legacyId === id) || null;

export const TAT_PRESETS = {
  hin: [1, 2, 4, 8, 16],
  hout: [1, 2, 4, 8, 16],
  hours: [1, 2, 4, 8, 16],
  min_in: [15, 30, 45, 60, 90, 120],
  min_out: [15, 30, 45, 60, 90, 120],
  minutes: [15, 30, 45, 60, 90, 120],
  days: [1, 2, 3, 5, 7],
  t_minus_x: [0, 1, 2, 3, 5],
  tx: [0, 1, 2, 3, 5],
  specific_time: ["11:00", "13:00", "17:00", "18:00"],
  spec: ["11:00", "13:00", "17:00", "18:00"],
};

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/* ------------------------------------------------------------------ */
/* Calendar config (office hours, weekly offs, holidays)              */
/* ------------------------------------------------------------------ */
export const DEFAULT_CALENDAR = {
  work_start: "10:00",
  work_end: "18:00",
  off_days: [0],
  holidays: [],
};

let activeCalendar = { ...DEFAULT_CALENDAR };
let calendarPromise = null;

const normalizeCalendar = (row = {}) => ({
  work_start: row.work_start || DEFAULT_CALENDAR.work_start,
  work_end: row.work_end || DEFAULT_CALENDAR.work_end,
  off_days: Array.isArray(row.off_days) ? row.off_days.map(Number) : DEFAULT_CALENDAR.off_days,
  holidays: Array.isArray(row.holidays) ? row.holidays.filter(Boolean) : [],
});

export const getTatCalendar = () => activeCalendar;
export const setTatCalendar = (row) => {
  activeCalendar = normalizeCalendar(row);
  return activeCalendar;
};

/** Loads all holidays directly from the central Checklist holidays table ("holidays") */
export async function fetchChecklistHolidays() {
  try {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("holiday_date", { ascending: true });
    if (!error && Array.isArray(data)) return data;
  } catch (err) {
    console.warn("[tatCalendar] Could not fetch checklist holidays:", err);
  }
  return [];
}

/** Parses dates in standard ISO, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or milliseconds. */
export function parseCalendarDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(val).trim();
  if (!s) return null;

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso;
  return null;
}

/** Loads the working calendar once (cached). Pass force=true after saving. Never throws. */
export function loadTatCalendar(force = false) {
  if (calendarPromise && !force) return calendarPromise;
  calendarPromise = (async () => {
    try {
      // 1. Load office hours and weekly off days
      const { data, error } = await supabase
        .from("tat_working_calendar")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data) setTatCalendar(data);

      // 2. Automatically sync holidays directly from the Checklist system ("holidays" table)
      const checklistHolidays = await fetchChecklistHolidays();
      if (checklistHolidays && checklistHolidays.length > 0) {
        const checklistDates = checklistHolidays.map((h) => h.holiday_date).filter(Boolean);
        const combinedHolidays = Array.from(new Set([...(activeCalendar.holidays || []), ...checklistDates]));
        activeCalendar.holidays = combinedHolidays;
        activeCalendar.checklist_holidays = checklistHolidays;
      }
    } catch (err) {
      console.warn("[tatCalendar] Could not load working calendar, using defaults:", err);
    }
    return activeCalendar;
  })();
  return calendarPromise;
}

export async function saveTatCalendar(calendar) {
  const clean = normalizeCalendar(calendar);
  const { error } = await supabase
    .from("tat_working_calendar")
    .upsert({ id: 1, ...clean, updated_at: new Date().toISOString() });
  if (error) throw error;
  setTatCalendar(clean);
  calendarPromise = Promise.resolve(activeCalendar);
  return clean;
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                       */
/* ------------------------------------------------------------------ */
export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const minsOf = (d) => d.getHours() * 60 + d.getMinutes();
const dateOnly = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const atMin = (d, m) => new Date(dateOnly(d).getTime() + m * 60000);
const addDay = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const resolveCal = (calendar) => {
  const c = normalizeCalendar(calendar || activeCalendar);
  return { s: toMinutes(c.work_start), e: toMinutes(c.work_end), off: c.off_days, hol: c.holidays };
};

const isWork = (d, c) => !c.off.includes(d.getDay()) && !c.hol.includes(ymd(d));

function nextWorkDay(d, c) {
  let x = addDay(d, 1);
  let guard = 0;
  while (!isWork(x, c) && guard++ < 400) x = addDay(x, 1);
  return x;
}

/** Moves n working days forward (or backward when n < 0). Returns a date at 00:00. */
export function workdayAdd(d, n, c) {
  let x = dateOnly(d);
  let count = 0;
  const step = n < 0 ? -1 : 1;
  let guard = 0;
  while (count < Math.abs(n) && guard++ < 4000) {
    x = addDay(x, step);
    if (isWork(x, c)) count++;
  }
  return x;
}

/** Adds working minutes, consuming only office hours on working days. */
function addWorkingMinutes(start, minutes, c) {
  let cur = new Date(start);
  let remaining = Math.round(minutes);
  const log = [];

  if (!isWork(cur, c) || minsOf(cur) >= c.e) {
    cur = atMin(nextWorkDay(cur, c), c.s);
    log.push(`Entry was outside office hours. Counting starts at ${formatDateTime(cur)}.`);
  } else if (minsOf(cur) < c.s) {
    cur = atMin(cur, c.s);
    log.push(`Office had not opened yet. Counting starts at ${formatDateTime(cur)}.`);
  } else {
    log.push(`Entry is inside office hours. Counting starts at ${formatDateTime(cur)}.`);
  }

  let guard = 0;
  while (guard++ < 1000) {
    const available = c.e - minsOf(cur);
    if (remaining <= available) {
      const out = new Date(cur.getTime() + remaining * 60000);
      log.push(`${formatDay(cur)}: ${formatDuration(remaining)} counted. TAT complete.`);
      return { out, log };
    }
    if (available > 0) {
      log.push(`${formatDay(cur)}: ${formatDuration(available)} counted, ${formatDuration(remaining - available)} left.`);
    }
    remaining -= Math.max(available, 0);
    const nd = nextWorkDay(cur, c);
    const skipped = Math.round((dateOnly(nd).getTime() - dateOnly(addDay(cur, 1)).getTime()) / 864e5);
    if (skipped > 0) log.push(`Skipped ${skipped} off day(s) or holiday(s). Next working day is ${formatDay(nd)}.`);
    cur = atMin(nd, c.s);
  }
  return { out: cur, log };
}

/* ------------------------------------------------------------------ */
/* Formatting helpers (also used by the preview)                      */
/* ------------------------------------------------------------------ */
export function formatClock(totalMinutes) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mi = m % 60;
  return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function formatDay(d) {
  return `${DAY_NAMES_SHORT[d.getDay()]} ${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
}
export function formatDateTime(d, withTime = true) {
  return `${formatDay(d)} ${d.getFullYear()}${withTime ? `, ${formatClock(minsOf(d))}` : ""}`;
}
function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return ((h ? `${h} hr` : "") + (h && m ? " " : "") + (m ? `${m} min` : "")) || "0 min";
}

/* ------------------------------------------------------------------ */
/* Rule reading helpers                                               */
/* ------------------------------------------------------------------ */
const readType = (rule) => rule?.tat_type || rule?.tatType || null;
const readConfig = (rule) => {
  const cfg = rule?.tat_config ?? rule?.tatConfig;
  if (!cfg) return {};
  if (typeof cfg === "string") {
    try {
      return JSON.parse(cfg) || {};
    } catch {
      return {};
    }
  }
  return cfg;
};
const readValue = (rule) =>
  Number(rule?.time_value ?? rule?.timeValue ?? rule?.completion_time ?? 0);

/* ------------------------------------------------------------------ */
/* Column catalog: which "column" a rule can count from                */
/* ------------------------------------------------------------------ */
// base   : date columns on the record a rule can start counting from
// lead   : numeric (days) columns on the record, used with a base date for T-x
// target : date columns on the record that can be used directly as T
// actuals: the rule can also start from the completion time of an earlier stage
export const STAGE_DATE_FIELDS = [
  { value: "planned", label: "Planned date (due time)" },
  { value: "started", label: "Started / Entry date" },
  { value: "actual", label: "Actual completion date" },
];

const D = (key, label, ...fields) => ({ key, label, fields });
// Date fields on the record that belong to an earlier stage (used when a stage has no live stage timeline).
export const STAGE_RECORD_DATES = {
  "Purchase System": {
    "Create Indent": [D("created", "Indent created date", "indentCreatedAt", "created_at"), D("required", "Required by date", "required_by", "requiredBy", "required_date", "expected_date")],
    "Delegate Approver": [D("delegated", "Delegated date", "delegated_at")],
    "Indent Approval": [D("approved", "Approved date", "approved_at", "approvedAt")],
    "Make PO": [D("po", "PO date", "po_date", "poDate")],
    "Follow UP / Lifting": [D("lifting", "Lifting date", "actual_lifting_date")],
    "Transporter Follow-Up": [D("arrival", "Expected arrival date", "expected_arrival_date")],
    "Material Received (GRN)": [D("grn", "GRN received date", "received_date")],
    "Tally Billing": [D("invoice", "Invoice date", "invoice_date", "tally_entry_date")],
  },
  "Purchase Return": {
    "Return Approval": [D("request", "Return request date", "requestDate", "created_at"), D("approved", "Approved date", "approvedDate", "approved_at")],
    "Ask Credit Note": [D("cn", "Credit note date", "creditNoteDate", "cnDate")],
    "Arrange Logistics": [D("logistics", "Logistics date", "logisticsDate", "logDate")],
    "Issue Debit Note": [D("dn", "Debit note date", "debitNoteDate", "dnDate")],
  },
  "Order Management": {
    "Received Order": [D("po", "Order / PO date", "poDate", "po_date", "orderDate", "created_at"), D("expected", "Expected delivery date", "expectedDeliveryDate", "expected_delivery_date")],
    "Check & Validation": [D("checked", "Validated date", "checkedAt")],
    "Stock Verification": [D("stock", "Stock verified date", "stockVerifiedAt", "updated_at")],
    "Production Planning": [D("produced", "Produced date", "produced_at")],
    "Dispatch Planning": [D("dispatch", "Dispatch date", "dispatchTimestamp", "dispatchDate")],
    "Packaging": [D("packed", "Packaging date", "packagingTimestamp")],
    "Vehicle Logistic": [D("logistic", "Vehicle logistic date", "logisticDate", "logisticTimestamp")],
    "Make Challan": [D("challan", "Challan date", "challanDate", "callanDate")],
    "Make Invoice": [D("invoice", "Invoice date", "invoiceDate")],
    "Confirm Delivery": [D("delivered", "Delivery date", "deliveryDate", "deliveryTimestamp")],
  },
  "Leads System": {
    "Followup Tracker": [D("created", "Lead created date", "rawCreatedAt", "createdAtIso", "created_at"), D("nextcall", "Next call date", "nextCallDateTime", "nextCallDate")],
    "Pending Quotation": [D("mq", "Make quotation requested date", "makeQuotationAt", "enquiryStatusUpdatedAt"), D("lastfu", "Latest follow-up date", "latestFollowupDate"), D("nextcall", "Next call date", "nextCallDateTime", "nextCallDate")],
    "Quotation Tracker": [D("quote", "Quotation date", "quotationDateRaw", "quotation_at", "quotationDate"), D("nextfu", "Next follow-up date", "nextFollowupDateTime", "nextFollowupDate")],
  },
};

export const COLUMN_CATALOG = {
  "Purchase System": {
    actuals: true,
    base: [{ key: "created_at", label: "Indent Created Date", fields: ["indentCreatedAt", "created_at"] }],
    lead: [],
    target: [{ key: "required_by", label: "Required By Date", fields: ["required_by", "requiredBy", "required_date", "expected_date"] }],
  },
  "Purchase Return": {
    actuals: true,
    base: [{ key: "request_date", label: "Return Request Date", fields: ["requestDate", "created_at"] }],
    lead: [],
    target: [],
  },
  "Order Management": {
    actuals: false,
    base: [{ key: "order_date", label: "Order / PO Date", fields: ["poDate", "po_date", "orderDate", "created_at"] }],
    lead: [{ key: "lead_time", label: "Lead Time (days)", fields: ["leadTime", "lead_time"] }],
    target: [{ key: "expected_delivery", label: "Expected Delivery Date", fields: ["expectedDeliveryDate", "expected_delivery_date"] }],
  },
  "Leads System": {
    actuals: false,
    base: [{ key: "lead_created", label: "Lead Created Date", fields: ["rawCreatedAt", "created_at", "createdAt"] }],
    lead: [],
    target: [],
  },
};

const findColumn = (systemName, kind, key) =>
  (COLUMN_CATALOG[systemName]?.[kind] || []).find((c) => c.key === key) || null;

const readField = (record, fields = []) => {
  for (const f of fields) {
    const v = record?.[f];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

/**
 * Applies a rule's chosen base column. base_column is "default", "record:<key>" or "stage:<Stage Name>".
 * Falls back to the default start whenever the chosen column has no value on this record.
 */
function resolveBase(defaultStart, rule, ctx = {}) {
  const cfg = readConfig(rule);
  // Reference stage + its date field (planned / actual / started) takes priority.
  if (cfg.ref_stage && String(cfg.ref_field || "").startsWith("rec:")) {
    const sys0 = rule?.system_name || rule?.system || ctx.systemName;
    const stageKey = Object.keys(STAGE_RECORD_DATES[sys0] || {}).find((k) => k.toLowerCase() === String(cfg.ref_stage).trim().toLowerCase());
    const col = (STAGE_RECORD_DATES[sys0]?.[stageKey] || []).find((c) => c.key === cfg.ref_field.slice(4));
    const v = col ? readField(ctx.record, col.fields) : null;
    if (v) return v;
  } else if (cfg.ref_stage) {
    const d = ctx.stageDates?.[String(cfg.ref_stage).trim().toLowerCase()];
    const v = d?.[cfg.ref_field || "actual"] || (cfg.ref_field ? null : d?.actual);
    if (v) return v;
  }
  const base = cfg.base_column;
  if (!base || base === "default") return defaultStart;
  const sys = rule?.system_name || rule?.system || ctx.systemName;
  if (base.startsWith("stage_planned:")) {
    const stKey = base.slice(14).trim().toLowerCase();
    const planned = ctx.stageDates?.[stKey]?.planned;
    return planned || defaultStart;
  }
  if (base.startsWith("stage:")) {
    const stKey = base.slice(6).trim().toLowerCase();
    const done = ctx.completions?.[stKey] || ctx.stageDates?.[stKey]?.actual;
    return done || defaultStart;
  }
  if (base.startsWith("record:")) {
    const col = findColumn(sys, "base", base.slice(7));
    const v = col ? readField(ctx.record, col.fields) : null;
    return v || defaultStart;
  }
  return defaultStart;
}

/** True when the rule uses one of the advanced calendar-aware types. */
export const isAdvancedRule = (rule) => Boolean(getTatType(readType(rule)));

/**
 * Full calculation with an explanation log (used by the live preview).
 * Returns { out: Date, log: string[], withTime: boolean } or null when the rule is not advanced.
 */
export function explainTat(start, rule, options = {}) {
  const type = readType(rule);
  if (!getTatType(type) || !start) return null;
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return null;

  const c = resolveCal(options.calendar);
  const cfg = readConfig(rule);
  const value = readValue(rule);

  if (type === "hours" || type === "hin" || type === "hout") {
    const mins = Math.round(value * 60);
    const r = addWorkingMinutes(startDate, mins, c);
    return { out: r.out, log: r.log, withTime: true };
  }

  if (type === "minutes" || type === "min_in" || type === "min_out") {
    const mins = Math.round(value);
    const r = addWorkingMinutes(startDate, mins, c);
    return { out: r.out, log: r.log, withTime: true };
  }

  if (type === "days") {
    const n = Math.round(value);
    const out = new Date(workdayAdd(startDate, n, c).getTime() + minsOf(startDate) * 60000);
    const log = [`Start: ${formatDay(startDate)} (day 0)`];
    let x = dateOnly(startDate);
    let counted = 0;
    let guard = 0;
    while (counted < n && guard++ < 400) {
      x = addDay(x, 1);
      if (isWork(x, c)) {
        counted++;
        log.push(`${formatDay(x)} = day ${counted}`);
      } else {
        log.push(`${formatDay(x)}: off day or holiday, skipped`);
      }
    }
    return { out, log: log.length > 9 ? [log[0], "...", ...log.slice(-4)] : log, withTime: true };
  }

  if (type === "t_minus_x" || type === "tx") {
    const sign = Number(cfg.sign) === 1 ? 1 : -1;
    const x = Math.max(0, Math.round(cfg.x ?? value ?? 0));
    const sys = rule?.system_name || rule?.system || options.systemName;
    let leadDays = Number(cfg.lead_days || 0);
    let targetDateRaw = options.targetDate || null;
    if (!targetDateRaw && cfg.target_column) {
      if (cfg.target_column.startsWith("stage_planned:")) {
        const stKey = cfg.target_column.slice(14).trim().toLowerCase();
        targetDateRaw = options.stageDates?.[stKey]?.planned || null;
      } else if (cfg.target_column.startsWith("stage:")) {
        const stKey = cfg.target_column.slice(6).trim().toLowerCase();
        targetDateRaw = options.completions?.[stKey] || options.stageDates?.[stKey]?.actual || null;
      } else if (cfg.target_column.startsWith("rec:")) {
        const colKey = cfg.target_column.slice(4);
        const col = findColumn(sys, "target", colKey) || findColumn(sys, "base", colKey);
        targetDateRaw = col ? readField(options.record, col.fields) : null;
      } else {
        const col = findColumn(sys, "target", cfg.target_column);
        targetDateRaw = col ? readField(options.record, col.fields) : null;
      }
    }
    if (!targetDateRaw && cfg.ref_stage && cfg.ref_field) {
      if (String(cfg.ref_field).startsWith("rec:")) {
        const stageKey = Object.keys(STAGE_RECORD_DATES[sys] || {}).find((k) => k.toLowerCase() === String(cfg.ref_stage).trim().toLowerCase());
        const col = (STAGE_RECORD_DATES[sys]?.[stageKey] || []).find((c) => c.key === cfg.ref_field.slice(4));
        targetDateRaw = col ? readField(options.record, col.fields) : null;
      } else {
        const d = options.stageDates?.[String(cfg.ref_stage).trim().toLowerCase()];
        targetDateRaw = d?.[cfg.ref_field || "actual"] || null;
      }
    }
    if (cfg.t_mode === "lead" && cfg.lead_column) {
      const col = findColumn(sys, "lead", cfg.lead_column);
      const lv = col ? Number(readField(options.record, col.fields)) : NaN;
      if (!isNaN(lv)) leadDays = lv;
    }

    const parsedTarget = parseCalendarDate(targetDateRaw);
    let T;
    const log = [];
    if (parsedTarget) {
      T = dateOnly(parsedTarget);
      log.push(`T = Target date ${formatDay(T)}`);
    } else {
      T = cfg.working_days !== false
        ? workdayAdd(startDate, leadDays, c)
        : addDay(dateOnly(startDate), leadDays);
      log.push(`T = Start date ${formatDay(startDate)} + ${leadDays} lead day(s) = ${formatDay(T)}`);
    }

    const txUnit = String(cfg.unit || "Days").toLowerCase();
    let out;
    if (txUnit === "hours" || txUnit === "hr") {
      const mins = x * 60;
      if (sign < 0) {
        const daysBack = Math.ceil(x / Math.max(1, (c.e - c.s) / 60));
        const dayStart = workdayAdd(T, -daysBack, c);
        out = new Date(dayStart.getTime() + c.e * 60000);
      } else {
        out = addWorkingMinutes(new Date(dateOnly(T).getTime() + c.s * 60000), mins, c).out;
      }
      log.push(`${x} working hour(s) ${sign < 0 ? "before" : "after"} T = ${formatDateTime(out)}`);
    } else if (txUnit === "minutes" || txUnit === "min") {
      out = new Date(dateOnly(T).getTime() + (sign < 0 ? c.e : c.s) * 60000);
      log.push(`${x} minute(s) ${sign < 0 ? "before" : "after"} T`);
    } else {
      let outDateOnly;
      if (cfg.working_days !== false) {
        outDateOnly = workdayAdd(T, sign * x, c);
        log.push(`${x} working day(s) ${sign < 0 ? "before" : "after"} T (off days & holidays skipped) = ${formatDay(outDateOnly)}`);
      } else {
        outDateOnly = addDay(T, sign * x);
        log.push(`${x} calendar day(s) ${sign < 0 ? "before" : "after"} T = ${formatDay(outDateOnly)}`);
      }
      // Set planned due time to office end hours (c.e)
      out = new Date(dateOnly(outDateOnly).getTime() + c.e * 60000);
    }

    // Clamp guard: planned date cannot be in the past before the stage started
    if (out.getTime() < startDate.getTime()) {
      const minBase = isWork(startDate, c) ? dateOnly(startDate) : nextWorkDay(startDate, c);
      out = new Date(minBase.getTime() + c.e * 60000);
      log.push(`Adjusted due date to ${formatDateTime(out)} to prevent planned date occurring before stage start.`);
    }

    return { out, log, withTime: true };
  }

  // specific_time / spec
  const fixed = toMinutes(cfg.time || "17:00");
  const daysAfter = Number(cfg.days_after || 0);
  const d = dateOnly(startDate);
  const log = [];
  let base;
  if (!isWork(d, c)) {
    base = nextWorkDay(d, c);
    log.push(`${formatDay(d)} is an off day or holiday. Base day is ${formatDay(base)}.`);
  } else if (cfg.cutoff !== false && minsOf(startDate) > fixed) {
    base = nextWorkDay(d, c);
    log.push(`Entry at ${formatClock(minsOf(startDate))} is after the cut-off ${formatClock(fixed)}. Base day is ${formatDay(base)}.`);
  } else {
    base = d;
    log.push(`Base day is ${formatDay(d)}.`);
  }
  const day = workdayAdd(base, daysAfter, c);
  if (daysAfter) log.push(`+${daysAfter} working day(s) = ${formatDay(day)}`);
  log.push(`Fixed time ${formatClock(fixed)} applied.`);
  return { out: new Date(day.getTime() + fixed * 60000), log, withTime: true };
}

/**
 * Due date for an advanced rule, or null when the rule is not advanced
 * (so the calling engine falls back to its original calculation).
 */
export function computeAdvancedDueAt(start, rule, options = {}) {
  try {
    if (!start) return null;
    const base = resolveBase(start, rule, options);
    const baseDate = parseCalendarDate(base) || parseCalendarDate(start);
    if (!baseDate) return null;

    const c = resolveCal(options.calendar);

    if (!isAdvancedRule(rule)) {
      const v = readValue(rule);
      const unit = rule?.unit || rule?.time_unit || "hr";

      // If duration is specified, apply calendar-aware working hours & days so holidays/offs are never violated!
      if (v > 0) {
        if (unit === "day" || unit === "days") {
          const days = Math.round(v);
          const out = new Date(workdayAdd(baseDate, days, c).getTime() + minsOf(baseDate) * 60000);
          return out;
        } else {
          const mins = unit === "min" ? v : v * 60;
          const r = addWorkingMinutes(baseDate, mins, c);
          return r ? r.out : null;
        }
      }
      return null;
    }

    const r = explainTat(baseDate, rule, options);
    return r ? r.out : null;
  } catch (err) {
    console.warn("[tatCalendar] computeAdvancedDueAt failed, falling back:", err);
    return null;
  }
}

export const SYSTEM_STAGES_MAP = {
  "Purchase System": [
    "Delegate Approver",
    "Indent Approval",
    "Quotation Submission",
    "Approved Vendor",
    "Make PO",
    "Payment",
    "Follow UP / Lifting",
    "Transporter Follow-Up",
    "Material Received (GRN)",
    "Tally Billing",
  ],
  "Purchase Return": [
    "Return Approval",
    "Ask Credit Note",
    "Arrange Logistics",
    "Issue Debit Note",
    "Return From Plant",
  ],
  "Order Management": [
    "Check & Validation",
    "Stock Verification",
    "Production Planning",
    "Dispatch Planning",
    "Packaging",
    "Vehicle Logistic",
    "Make Challan",
    "Make Invoice",
    "Confirm Delivery",
    "Payments",
  ],
  "Leads System": [
    "Followup Tracker",
    "Pending Quotation",
    "Quotation Tracker",
  ],
};

export function getStageDefaultIndex(systemName, stageName) {
  const stages = SYSTEM_STAGES_MAP[systemName] || [];
  const idx = stages.findIndex(
    (s) => s.toLowerCase() === String(stageName || "").trim().toLowerCase()
  );
  return idx >= 0 ? idx : 999;
}

/** Human readable one-liner for a rule (table / badges). */
export function describeTatRule(rule) {
  const type = readType(rule);
  const cfg = readConfig(rule);
  const v = readValue(rule);
  switch (type) {
    case "hin":
    case "hours":
      return `${v} working hour${v === 1 ? "" : "s"}`;
    case "hout":
      return `${v} working hour${v === 1 ? "" : "s"} (outside)`;
    case "min_in":
    case "minutes":
      return `${v} working min${v === 1 ? "" : "s"}`;
    case "min_out":
      return `${v} working min${v === 1 ? "" : "s"} (outside)`;
    case "days":
      return `${v} working day${v === 1 ? "" : "s"}`;
    case "tx":
    case "t_minus_x": {
      const x = cfg.x ?? v;
      const unit = cfg.unit || "day";
      const sign = Number(cfg.sign) === 1 ? "+" : "-";
      const work = cfg.working_days === false ? "" : "working ";
      return `T ${sign} ${x} ${work}${unit}${x === 1 ? "" : "s"}`;
    }
    case "spec":
    case "specific_time":
      return `${formatClock(toMinutes(cfg.time || "17:00"))}${Number(cfg.days_after) ? `, +${cfg.days_after} working day(s)` : ""}${cfg.cutoff === false ? "" : ", cut-off"}`;
    default: {
      const unit = rule?.unit || rule?.time_unit || "hr";
      return `${v} ${unit}`;
    }
  }
}
