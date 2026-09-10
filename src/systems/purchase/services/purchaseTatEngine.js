/**
 * Purchase System TAT (Turn Around Time) & SLA Management Engine
 * Centralized deterministic TAT calculation, state transition logic, and timeline compiler.
 */

export const PURCHASE_STAGE_KEYS = {
  CREATE_INDENT: "Create Indent",
  DELEGATE_APPROVER: "Delegate Approver",
  INDENT_APPROVAL: "Indent Approval",
  QUOTATION_SUBMISSION: "Quotation Submission",
  APPROVED_VENDOR: "Approved Vendor",
  MAKE_PO: "Make PO",
  PAYMENT: "Payment",
  FOLLOWUP_LIFTING: "Follow UP / Lifting",
  TRANSPORTER_FOLLOWUP: "Transporter Follow-Up",
  MATERIAL_RECEIVED: "Material Received (GRN)",
  TALLY_BILLING: "Tally Billing",
  ORDER_CANCEL: "Order Cancel",
};

export const WORKFLOW_STAGES_CONFIG = [
  {
    stageKey: "create_indent",
    stageNumber: 1,
    section_name: PURCHASE_STAGE_KEYS.CREATE_INDENT,
    displayName: "Stage 1 : Create Indent",
    shortName: "Create Indent",
    ownerRole: "Indent Creator",
    defaultSlaValue: 4,
    defaultSlaUnit: "hr",
    description: "Requisition drafted and submitted into system",
  },
  {
    stageKey: "delegate_approver",
    stageNumber: 2,
    section_name: PURCHASE_STAGE_KEYS.DELEGATE_APPROVER,
    displayName: "Stage 2 : Delegate Approvers",
    shortName: "Delegate Approvers",
    ownerRole: "Purchase Coordinator / Admin",
    defaultSlaValue: 4,
    defaultSlaUnit: "hr",
    description: "Assign pending purchase indents to one or more approvers before technical and commercial approval",
  },
  {
    stageKey: "indent_approval",
    stageNumber: 3,
    section_name: PURCHASE_STAGE_KEYS.INDENT_APPROVAL,
    displayName: "Stage 3 : Indent Approval",
    shortName: "Indent Approval",
    ownerRole: "Approver / HOD",
    defaultSlaValue: 24,
    defaultSlaUnit: "hr",
    description: "Technical & commercial clearance by designated authority",
  },
  {
    stageKey: "quotation_submission",
    stageNumber: 4,
    section_name: PURCHASE_STAGE_KEYS.QUOTATION_SUBMISSION,
    displayName: "Stage 4 : Quotation Submission",
    shortName: "Quotations / RFQ",
    ownerRole: "Purchase Officer / Vendor",
    defaultSlaValue: 48,
    defaultSlaUnit: "hr",
    description: "Multi-vendor quote comparison and RFQ turnaround",
  },
  {
    stageKey: "approved_vendor",
    stageNumber: 5,
    section_name: PURCHASE_STAGE_KEYS.APPROVED_VENDOR,
    displayName: "Stage 5 : Approved Vendor",
    shortName: "Vendor Sanction",
    ownerRole: "Purchase Authority / HOD",
    defaultSlaValue: 12,
    defaultSlaUnit: "hr",
    description: "Selection of best commercial quote and sanctioning",
  },
  {
    stageKey: "make_po",
    stageNumber: 6,
    section_name: PURCHASE_STAGE_KEYS.MAKE_PO,
    displayName: "Stage 6 : Make PO",
    shortName: "PO Entry & Issue",
    ownerRole: "Purchase Dept / PO Maker",
    defaultSlaValue: 12,
    defaultSlaUnit: "hr",
    description: "Formal Purchase Order release and vendor acknowledgement",
  },
  {
    stageKey: "payment",
    stageNumber: 7,
    section_name: PURCHASE_STAGE_KEYS.PAYMENT,
    displayName: "Stage 7 : Payment",
    shortName: "Advance / Payment",
    ownerRole: "Accounts / Finance Dept",
    defaultSlaValue: 24,
    defaultSlaUnit: "hr",
    description: "Advance or dispatch payment clearance",
  },
  {
    stageKey: "followup_lifting",
    stageNumber: 8,
    section_name: PURCHASE_STAGE_KEYS.FOLLOWUP_LIFTING,
    displayName: "Stage 8 : Follow-up / Lifting",
    shortName: "Supplier Lifting",
    ownerRole: "Logistics / Follow-Up Team",
    defaultSlaValue: 48,
    defaultSlaUnit: "hr",
    description: "Material ready at supplier premises and vehicle placement",
  },
  {
    stageKey: "transporter_followup",
    stageNumber: 9,
    section_name: PURCHASE_STAGE_KEYS.TRANSPORTER_FOLLOWUP,
    displayName: "Stage 9 : Transporter Follow-Up",
    shortName: "Highway Logistics",
    ownerRole: "Logistics / Transporter",
    defaultSlaValue: 72,
    defaultSlaUnit: "hr",
    description: "In-transit tracking from supplier plant to company gate",
  },
  {
    stageKey: "material_received",
    stageNumber: 10,
    section_name: PURCHASE_STAGE_KEYS.MATERIAL_RECEIVED,
    displayName: "Stage 10 : Material Received (GRN)",
    shortName: "Store Gate & GRN",
    ownerRole: "Store Incharge / QC",
    defaultSlaValue: 8,
    defaultSlaUnit: "hr",
    description: "Physical consignment inspection and inward GRN entry",
  },
  {
    stageKey: "tally_billing",
    stageNumber: 11,
    section_name: PURCHASE_STAGE_KEYS.TALLY_BILLING,
    displayName: "Stage 11 : Tally Billing",
    shortName: "Tally ERP Posting",
    ownerRole: "Accounts / Billing Incharge",
    defaultSlaValue: 24,
    defaultSlaUnit: "hr",
    description: "Supplier bill verification and ERP voucher booking",
  },
  {
    stageKey: "order_cancel",
    stageNumber: 12,
    section_name: PURCHASE_STAGE_KEYS.ORDER_CANCEL,
    displayName: "Stage 12 : Order Cancel",
    shortName: "Order Cancellation",
    ownerRole: "Purchase Admin",
    defaultSlaValue: 4,
    defaultSlaUnit: "hr",
    description: "Cancellation audit log and financial recovery",
  },
];

export const TAT_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  ON_TRACK: "ON_TRACK",
  DELAY: "DELAY",
  BREACHED: "DELAY", // Backward compatibility alias
  AT_RISK: "ON_TRACK", // Backward compatibility alias
  WITHIN_SLA: "ON_TRACK", // Backward compatibility alias
  COMPLETED: "ON_TRACK", // Backward compatibility alias
};

export const OFFICE_HOURS = {
  START_HOUR: 10, // 10:00 AM
  END_HOUR: 18,   // 6:00 PM (18:00)
  DAILY_WORK_MINUTES: 8 * 60, // 480 minutes (8 working hours/day)
};

/**
 * Converts SLA completion time and time unit into duration in minutes.
 * Supports units: 'sec', 'min', 'minute', 'hr', 'hour', 'day'
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
  // Default to hours if unrecognized
  return val * 60;
}

/**
 * Formats duration in minutes into clean human-readable text (e.g. "2d 4h", "5h 30m", "45m")
 */
export function formatDurationMinutes(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "—";
  const absMinutes = Math.abs(Math.round(minutes));

  if (absMinutes < 1) return "< 1m";
  if (absMinutes < 60) return `${absMinutes}m`;

  const workDayMins = OFFICE_HOURS.DAILY_WORK_MINUTES || 480;
  const days = Math.floor(absMinutes / workDayMins);
  const hours = Math.floor((absMinutes % workDayMins) / 60);
  const mins = absMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}m`);

  return parts.length > 0 ? parts.join(" ") : `${hours}h`;
}

/**
 * Calculates due date based on office hours (10:00 AM to 6:00 PM).
 * If a task starts outside office hours, it starts from next available 10:00 AM.
 * If working time exceeds 6:00 PM on any day, remaining duration shifts to 10:00 AM next day.
 */
export function addOfficeHours(startDate, slaMinutes, workStartHour = OFFICE_HOURS.START_HOUR, workEndHour = OFFICE_HOURS.END_HOUR) {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;

  let cur = new Date(d.getTime());
  const curHours = cur.getHours();
  const curMinutes = cur.getMinutes();
  const timeInMins = curHours * 60 + curMinutes;
  const startWindowMins = workStartHour * 60;
  const endWindowMins = workEndHour * 60;

  // If before 10:00 AM, snap to 10:00 AM today
  if (timeInMins < startWindowMins) {
    cur.setHours(workStartHour, 0, 0, 0);
  }
  // If at or after 6:00 PM, shift to 10:00 AM next day
  else if (timeInMins >= endWindowMins) {
    cur.setDate(cur.getDate() + 1);
    cur.setHours(workStartHour, 0, 0, 0);
  }

  let remaining = Math.max(0, Number(slaMinutes) || 0);

  while (remaining > 0) {
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

  return cur;
}

/**
 * Calculates total working minutes between two dates within the office hours window (10:00 AM to 6:00 PM).
 */
export function calculateOfficeHoursDuration(fromDate, toDate, workStartHour = OFFICE_HOURS.START_HOUR, workEndHour = OFFICE_HOURS.END_HOUR) {
  if (!fromDate || !toDate) return 0;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  if (end.getTime() < start.getTime()) {
    return -calculateOfficeHoursDuration(end, start, workStartHour, workEndHour);
  }
  if (end.getTime() === start.getTime()) return 0;

  let cur = new Date(start.getTime());
  const startWindowMins = workStartHour * 60;
  const endWindowMins = workEndHour * 60;

  // Snap current start if outside working window
  const curMins = cur.getHours() * 60 + cur.getMinutes();
  if (curMins < startWindowMins) {
    cur.setHours(workStartHour, 0, 0, 0);
  } else if (curMins >= endWindowMins) {
    cur.setDate(cur.getDate() + 1);
    cur.setHours(workStartHour, 0, 0, 0);
  }

  if (cur.getTime() >= end.getTime()) return 0;

  let totalWorkingMinutes = 0;

  while (cur.getTime() < end.getTime()) {
    const endOfDay = new Date(cur.getTime());
    endOfDay.setHours(workEndHour, 0, 0, 0);

    if (end.getTime() <= endOfDay.getTime()) {
      if (end.getTime() > cur.getTime()) {
        totalWorkingMinutes += Math.round((end.getTime() - cur.getTime()) / (60 * 1000));
      }
      break;
    } else {
      if (endOfDay.getTime() > cur.getTime()) {
        totalWorkingMinutes += Math.round((endOfDay.getTime() - cur.getTime()) / (60 * 1000));
      }
      cur.setDate(cur.getDate() + 1);
      cur.setHours(workStartHour, 0, 0, 0);
    }
  }

  return Math.max(0, totalWorkingMinutes);
}

// In-memory cache for resolved TAT rules to prevent redundant linear searches
const tatRuleResolutionCache = new Map();

/**
 * Resolves active TAT rule for a given section_name from master_tat_rules list.
 */
export function resolveTatRule(sectionName, rulesList = []) {
  if (!sectionName) return null;
  const cleanSec = sectionName.trim().toLowerCase();
  const cacheKey = `${cleanSec}_${rulesList ? rulesList.length : 0}`;
  if (tatRuleResolutionCache.has(cacheKey)) {
    return tatRuleResolutionCache.get(cacheKey);
  }

  const matched = (rulesList || []).find((r) => {
    if (r.is_active === false) return false;
    const sys = String(r.system_name || "").toLowerCase();
    const sec = String(r.section_name || r.stage_name || "").toLowerCase();
    const isSysMatch =
      sys.includes("purchase") || sys.includes("fms") || sys === "";
    return isSysMatch && (sec === cleanSec || cleanSec.includes(sec) || sec.includes(cleanSec));
  });

  let result = null;
  if (matched) {
    const timeValue = Number(matched.completion_time || matched.time_value || 24);
    const unit = matched.time_unit || matched.unit || "hr";
    result = {
      section_name: sectionName,
      time_value: timeValue,
      unit: unit,
      duration_minutes: convertToMinutes(timeValue, unit),
      description: matched.description || "",
    };
  } else {
    // Fallback to default configuration
    const defConfig = WORKFLOW_STAGES_CONFIG.find(
      (c) =>
        c.section_name.toLowerCase() === cleanSec ||
        c.shortName.toLowerCase() === cleanSec ||
        cleanSec.includes(c.section_name.toLowerCase())
    );

    if (defConfig) {
      result = {
        section_name: defConfig.section_name,
        time_value: defConfig.defaultSlaValue,
        unit: defConfig.defaultSlaUnit,
        duration_minutes: convertToMinutes(defConfig.defaultSlaValue, defConfig.defaultSlaUnit),
        description: defConfig.description,
      };
    } else {
      result = {
        section_name: sectionName,
        time_value: 24,
        unit: "hr",
        duration_minutes: 24 * 60,
        description: "Default SLA",
      };
    }
  }

  tatRuleResolutionCache.set(cacheKey, result);
  return result;
}

/**
 * Calculate live TAT status for an individual stage event with Office Hours logic (10 AM to 6 PM)
 */
export function calculateStageTat({
  stageName,
  startTime,
  endTime = null,
  isCompleted = false,
  rulesList = [],
}) {
  const rule = resolveTatRule(stageName, rulesList);
  const slaMinutes = rule ? rule.duration_minutes : 24 * 60;
  const targetFormatted = formatDurationMinutes(slaMinutes);

  if (!startTime) {
    return {
      stageName,
      status: TAT_STATUS.NOT_STARTED,
      isCompleted: false,
      isActive: false,
      startedAt: null,
      dueAt: null,
      completedAt: null,
      slaMinutes,
      targetDurationFormatted: targetFormatted,
      actualMinutes: null,
      actualDurationFormatted: "—",
      remainingMinutes: null,
      remainingFormatted: "—",
      overdueFormatted: "—",
      rule,
    };
  }

  const startDate = new Date(startTime);
  if (isNaN(startDate.getTime())) {
    return {
      stageName,
      status: TAT_STATUS.NOT_STARTED,
      isCompleted: false,
      isActive: false,
      startedAt: null,
      dueAt: null,
      completedAt: null,
      slaMinutes,
      targetDurationFormatted: targetFormatted,
      actualMinutes: null,
      actualDurationFormatted: "—",
      remainingMinutes: null,
      remainingFormatted: "—",
      overdueFormatted: "—",
      rule,
    };
  }

  // Calculate Due Date based on 10 AM to 6 PM office hours
  const dueDate = addOfficeHours(startDate, slaMinutes);
  const dueMs = dueDate.getTime();

  if (isCompleted && endTime) {
    const endDate = new Date(endTime);
    const endMs = endDate.getTime();
    const actualWorkMinutes = calculateOfficeHoursDuration(startDate, endDate);
    const actualFormatted = formatDurationMinutes(actualWorkMinutes);
    const isDelayed = endMs > dueMs;
    const overdueMinutes = isDelayed ? calculateOfficeHoursDuration(dueDate, endDate) : 0;

    return {
      stageName,
      status: isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK,
      isCompleted: true,
      isActive: false,
      startedAt: startDate.toISOString(),
      dueAt: dueDate.toISOString(),
      completedAt: endDate.toISOString(),
      slaMinutes,
      targetDurationFormatted: targetFormatted,
      actualMinutes: actualWorkMinutes,
      actualDurationFormatted: actualFormatted,
      remainingMinutes: 0,
      remainingFormatted: "Completed",
      overdueMinutes,
      overdueFormatted: isDelayed ? `${formatDurationMinutes(overdueMinutes)} overdue` : "—",
      rule,
    };
  }

  // Active Running Stage
  const now = new Date();
  const nowMs = now.getTime();
  const isDelayed = nowMs > dueMs;

  const actualWorkMinutes = calculateOfficeHoursDuration(startDate, now);
  const remainingWorkMinutes = isDelayed ? 0 : calculateOfficeHoursDuration(now, dueDate);
  const overdueWorkMinutes = isDelayed ? calculateOfficeHoursDuration(dueDate, now) : 0;

  const status = isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;

  return {
    stageName,
    status,
    isCompleted: false,
    isActive: true,
    startedAt: startDate.toISOString(),
    dueAt: dueDate.toISOString(),
    completedAt: null,
    slaMinutes,
    targetDurationFormatted: targetFormatted,
    actualMinutes: actualWorkMinutes,
    actualDurationFormatted: formatDurationMinutes(actualWorkMinutes),
    remainingMinutes: remainingWorkMinutes,
    remainingFormatted:
      remainingWorkMinutes > 0
        ? `${formatDurationMinutes(remainingWorkMinutes)} left`
        : isDelayed
        ? `${formatDurationMinutes(overdueWorkMinutes)} overdue`
        : "0m left",
    overdueMinutes: overdueWorkMinutes,
    overdueFormatted: overdueWorkMinutes > 0 ? `${formatDurationMinutes(overdueWorkMinutes)} overdue` : "—",
    rule,
  };
}

/**
 * Pre-indexes all relational workflow entities into Map lookups for O(1) matching.
 * Drastically accelerates compileTransactionTatTimeline across large datasets.
 */
export function buildTatEntityLookupIndex({
  purchaseOrders = [],
  approvals = [],
  quotations = [],
  approvedVendors = [],
  vendorPayments = [],
  vendorLiftings = [],
  transporterFollowups = [],
  materialReceipts = [],
  tallyBillings = [],
  orderCancellations = [],
} = {}) {
  const approvalsByIndent = new Map();
  for (const a of approvals || []) {
    if (a.indent_id && !approvalsByIndent.has(a.indent_id)) {
      approvalsByIndent.set(a.indent_id, a);
    }
  }

  const quotesByIndent = new Map();
  for (const q of quotations || []) {
    if (q.indent_id) {
      let arr = quotesByIndent.get(q.indent_id);
      if (!arr) {
        arr = [];
        quotesByIndent.set(q.indent_id, arr);
      }
      arr.push(q);
    }
  }

  const avByIndent = new Map();
  for (const av of approvedVendors || []) {
    if (av.indent_id && !avByIndent.has(av.indent_id)) {
      avByIndent.set(av.indent_id, av);
    }
  }

  const poByIndentId = new Map();
  const poByIndentNum = new Map();
  const poById = new Map();
  for (const po of purchaseOrders || []) {
    if (po.id && !poById.has(po.id)) poById.set(po.id, po);
    if (po.indent_id && !poByIndentId.has(po.indent_id)) poByIndentId.set(po.indent_id, po);
    if (po.indent_number && !poByIndentNum.has(po.indent_number)) poByIndentNum.set(po.indent_number, po);
  }

  const paymentsByPoId = new Map();
  const paymentsByPoNum = new Map();
  for (const p of vendorPayments || []) {
    if (p.po_id && !paymentsByPoId.has(p.po_id)) paymentsByPoId.set(p.po_id, p);
    const poNum = p.purchase_orders?.po_number;
    if (poNum && !paymentsByPoNum.has(poNum)) paymentsByPoNum.set(poNum, p);
  }

  const liftingsByPoId = new Map();
  const liftingsByPoNum = new Map();
  const liftingsByIndentId = new Map();
  for (const l of vendorLiftings || []) {
    if (l.po_id) {
      let arr = liftingsByPoId.get(l.po_id);
      if (!arr) {
        arr = [];
        liftingsByPoId.set(l.po_id, arr);
      }
      arr.push(l);
    }
    const poNum = l.purchase_orders?.po_number;
    if (poNum) {
      let arr = liftingsByPoNum.get(poNum);
      if (!arr) {
        arr = [];
        liftingsByPoNum.set(poNum, arr);
      }
      arr.push(l);
    }
    if (l.indent_id) {
      let arr = liftingsByIndentId.get(l.indent_id);
      if (!arr) {
        arr = [];
        liftingsByIndentId.set(l.indent_id, arr);
      }
      arr.push(l);
    }
  }
  // Sort liftings descending by date once during indexing
  const sortLiftings = (a, b) =>
    new Date(b.updated_at || b.created_at || b.followup_date || 0) -
    new Date(a.updated_at || a.created_at || a.followup_date || 0);
  liftingsByPoId.forEach((arr) => arr.sort(sortLiftings));
  liftingsByPoNum.forEach((arr) => arr.sort(sortLiftings));
  liftingsByIndentId.forEach((arr) => arr.sort(sortLiftings));

  const tfsByPoId = new Map();
  const tfsByPoNum = new Map();
  const tfsByLiftingId = new Map();
  const tfsByIndentId = new Map();
  for (const tf of transporterFollowups || []) {
    if (tf.po_id) {
      let arr = tfsByPoId.get(tf.po_id);
      if (!arr) {
        arr = [];
        tfsByPoId.set(tf.po_id, arr);
      }
      arr.push(tf);
    }
    const poNum = tf.purchase_orders?.po_number;
    if (poNum) {
      let arr = tfsByPoNum.get(poNum);
      if (!arr) {
        arr = [];
        tfsByPoNum.set(poNum, arr);
      }
      arr.push(tf);
    }
    if (tf.lifting_id) {
      let arr = tfsByLiftingId.get(tf.lifting_id);
      if (!arr) {
        arr = [];
        tfsByLiftingId.set(tf.lifting_id, arr);
      }
      arr.push(tf);
    }
    if (tf.indent_id) {
      let arr = tfsByIndentId.get(tf.indent_id);
      if (!arr) {
        arr = [];
        tfsByIndentId.set(tf.indent_id, arr);
      }
      arr.push(tf);
    }
  }
  // Sort tfs descending by date once during indexing
  const sortTfs = (a, b) =>
    new Date(b.updated_at || b.created_at || 0) -
    new Date(a.updated_at || a.created_at || 0);
  tfsByPoId.forEach((arr) => arr.sort(sortTfs));
  tfsByPoNum.forEach((arr) => arr.sort(sortTfs));
  tfsByLiftingId.forEach((arr) => arr.sort(sortTfs));
  tfsByIndentId.forEach((arr) => arr.sort(sortTfs));

  const grnByPoId = new Map();
  const grnByPoNum = new Map();
  const grnByIndentId = new Map();
  for (const r of materialReceipts || []) {
    if (r.po_id && !grnByPoId.has(r.po_id)) grnByPoId.set(r.po_id, r);
    const poNum = r.purchase_orders?.po_number;
    if (poNum && !grnByPoNum.has(poNum)) grnByPoNum.set(poNum, r);
    if (r.indent_id && !grnByIndentId.has(r.indent_id)) grnByIndentId.set(r.indent_id, r);
  }

  const tallyByPoId = new Map();
  const tallyByPoNum = new Map();
  for (const tb of tallyBillings || []) {
    if (tb.po_id && !tallyByPoId.has(tb.po_id)) tallyByPoId.set(tb.po_id, tb);
    const poNum = tb.purchase_orders?.po_number;
    if (poNum && !tallyByPoNum.has(poNum)) tallyByPoNum.set(poNum, tb);
  }

  const cancelByIndentId = new Map();
  const cancelByPoId = new Map();
  for (const c of orderCancellations || []) {
    if (c.indent_id && !cancelByIndentId.has(c.indent_id)) cancelByIndentId.set(c.indent_id, c);
    if (c.po_id && !cancelByPoId.has(c.po_id)) cancelByPoId.set(c.po_id, c);
  }

  return {
    approvalsByIndent,
    quotesByIndent,
    avByIndent,
    poByIndentId,
    poByIndentNum,
    poById,
    paymentsByPoId,
    paymentsByPoNum,
    liftingsByPoId,
    liftingsByPoNum,
    liftingsByIndentId,
    tfsByPoId,
    tfsByPoNum,
    tfsByLiftingId,
    tfsByIndentId,
    grnByPoId,
    grnByPoNum,
    grnByIndentId,
    tallyByPoId,
    tallyByPoNum,
    cancelByIndentId,
    cancelByPoId,
  };
}

/**
 * Compiles the complete stage-by-stage TAT timeline for any Purchase transaction (Indent / PO).
 */
export function compileTransactionTatTimeline({
  indent,
  purchaseOrders = [],
  approvals = [],
  quotations = [],
  approvedVendors = [],
  vendorPayments = [],
  vendorLiftings = [],
  transporterFollowups = [],
  materialReceipts = [],
  tallyBillings = [],
  orderCancellations = [],
  rulesList = [],
  lookupIndex = null,
}) {
  if (!indent) return null;

  const indentId = indent.id;
  const indentNum = indent.indent_number || indent.indentNumber || "-";

  // Match related entity rows using O(1) lookupIndex if available, else linear search
  const matchingApproval = lookupIndex
    ? lookupIndex.approvalsByIndent.get(indentId) || null
    : (approvals || []).find((a) => a.indent_id === indentId);

  const matchingQuotes = lookupIndex
    ? (lookupIndex.quotesByIndent.get(indentId) || indent.quotation_submissions || [])
    : (quotations || []).find((q) => q.indent_id === indentId)
    ? (quotations || []).filter((q) => q.indent_id === indentId)
    : indent.quotation_submissions || [];

  const matchingAv = lookupIndex
    ? (lookupIndex.avByIndent.get(indentId) ||
       indent.approved_vendor ||
       (indent.approved_vendors && indent.approved_vendors[0]) ||
       null)
    : (approvedVendors || []).find((a) => a.indent_id === indentId) ||
      indent.approved_vendor ||
      (indent.approved_vendors && indent.approved_vendors[0]) ||
      null;

  const matchingPO = lookupIndex
    ? (lookupIndex.poByIndentId.get(indentId) || lookupIndex.poByIndentNum.get(indentNum) || null)
    : (purchaseOrders || []).find(
        (p) => p.indent_id === indentId || p.indent_number === indentNum
      );
  const poId = matchingPO?.id;
  const poNum = matchingPO?.po_number;

  const matchingPayment = lookupIndex
    ? ((poId && lookupIndex.paymentsByPoId.get(poId)) || (poNum && lookupIndex.paymentsByPoNum.get(poNum)) || null)
    : (vendorPayments || []).find(
        (p) => (poId && p.po_id === poId) || (poNum && p.purchase_orders?.po_number === poNum)
      );

  let allPoLiftings = [];
  if (lookupIndex) {
    if (poId && lookupIndex.liftingsByPoId.has(poId)) {
      allPoLiftings = lookupIndex.liftingsByPoId.get(poId);
    } else if (poNum && lookupIndex.liftingsByPoNum.has(poNum)) {
      allPoLiftings = lookupIndex.liftingsByPoNum.get(poNum);
    } else if (indentId && lookupIndex.liftingsByIndentId.has(indentId)) {
      allPoLiftings = lookupIndex.liftingsByIndentId.get(indentId);
    }
  } else {
    allPoLiftings = (vendorLiftings || [])
      .filter(
        (l) =>
          (poId && l.po_id === poId) ||
          (poNum && l.purchase_orders?.po_number === poNum) ||
          (indentId && l.indent_id === indentId)
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || b.followup_date || 0) -
          new Date(a.updated_at || a.created_at || a.followup_date || 0)
      );
  }
  const matchingLifting = allPoLiftings[0] || null;

  let allPoTfs = [];
  if (lookupIndex) {
    if (poId && lookupIndex.tfsByPoId.has(poId)) {
      allPoTfs = lookupIndex.tfsByPoId.get(poId);
    } else if (poNum && lookupIndex.tfsByPoNum.has(poNum)) {
      allPoTfs = lookupIndex.tfsByPoNum.get(poNum);
    } else if (matchingLifting && lookupIndex.tfsByLiftingId.has(matchingLifting.id)) {
      allPoTfs = lookupIndex.tfsByLiftingId.get(matchingLifting.id);
    } else if (indentId && lookupIndex.tfsByIndentId.has(indentId)) {
      allPoTfs = lookupIndex.tfsByIndentId.get(indentId);
    }
  } else {
    allPoTfs = (transporterFollowups || [])
      .filter(
        (t) =>
          (poId && t.po_id === poId) ||
          (poNum && t.purchase_orders?.po_number === poNum) ||
          (matchingLifting && t.lifting_id === matchingLifting.id) ||
          (indentId && t.indent_id === indentId)
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0)
      );
  }
  const matchingTf = allPoTfs[0] || null;

  const matchingGrn = lookupIndex
    ? ((poId && lookupIndex.grnByPoId.get(poId)) || (poNum && lookupIndex.grnByPoNum.get(poNum)) || (indentId && lookupIndex.grnByIndentId.get(indentId)) || null)
    : (materialReceipts || []).find(
        (r) => (poId && r.po_id === poId) || (poNum && r.purchase_orders?.po_number === poNum) || (indentId && r.indent_id === indentId)
      );

  const matchingTally = lookupIndex
    ? ((poId && lookupIndex.tallyByPoId.get(poId)) || (poNum && lookupIndex.tallyByPoNum.get(poNum)) || null)
    : (tallyBillings || []).find(
        (tb) => (poId && tb.po_id === poId) || (poNum && tb.purchase_orders?.po_number === poNum)
      );

  const matchingCancel = lookupIndex
    ? (lookupIndex.cancelByIndentId.get(indentId) || (poId && lookupIndex.cancelByPoId.get(poId)) || null)
    : (orderCancellations || []).find(
        (c) => c.indent_id === indentId || (poId && c.po_id === poId)
      );

  // Workflow Stage Timestamps
  const indentCreatedAt = indent.created_at || indent.createdAt || null;
  const indentApprovedAt =
    matchingApproval?.approved_at ||
    matchingApproval?.created_at ||
    indent.approved_at ||
    (indent.status === "Approved" ? indent.updated_at : null);

  const quotationReceivedAt =
    matchingQuotes.length > 0
      ? matchingQuotes.reduce((earliest, q) => {
          const qDate = new Date(q.created_at || q.submission_date || 0);
          return !earliest || qDate < earliest ? qDate : earliest;
        }, null)?.toISOString()
      : null;

  const isNewVendor = String(indent.vendor_type || matchingApproval?.vendor_type || "").toLowerCase().includes("new");

  const vendorApprovedAt =
    matchingAv?.approved_at ||
    matchingAv?.created_at ||
    (!isNewVendor ? indentApprovedAt : null) ||
    (matchingPO ? matchingPO.created_at : null);

  const poIssuedAt = matchingPO?.po_date || matchingPO?.created_at || null;

  const paymentClearedAt =
    matchingPayment?.payment_date ||
    matchingPayment?.created_at ||
    (matchingPayment?.status === "Completed" ? matchingPayment.created_at : null);

  const materialLiftedAt =
    matchingLifting?.actual_lifting_date ||
    (matchingLifting?.lifting_status === "Completed" ? matchingLifting.updated_at : null);

  const transporterDeliveredAt =
    matchingTf?.status === "Received"
      ? matchingTf.updated_at || matchingTf.expected_arrival_date
      : null;

  const grnRecordedAt =
    matchingGrn?.received_date ||
    matchingGrn?.created_at ||
    (matchingGrn ? matchingGrn.created_at : null);

  const tallyPostedAt =
    matchingTally?.invoice_date ||
    matchingTally?.tally_entry_date ||
    matchingTally?.created_at ||
    null;

  const cancelledAt = matchingCancel?.cancellation_date || matchingCancel?.created_at || null;

  const stagesTimeline = [];

  // 1. Stage 1: Create Indent
  const s1Start = indentCreatedAt ? new Date(new Date(indentCreatedAt).getTime() - 2 * 3600 * 1000).toISOString() : null;
  const s1Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.CREATE_INDENT,
    startTime: s1Start || indentCreatedAt,
    endTime: indentCreatedAt,
    isCompleted: !!indentCreatedAt,
    rulesList,
  });
  stagesTimeline.push({
    ...s1Tat,
    stageKey: "create_indent",
    stageNumber: 1,
    displayName: "Stage 1 : Create Indent",
    ownerRole: "Indent Creator",
    details: `Created by ${indent.created_by || "User"} (${indent.warehouse_location || "Store"})`,
  });

  // 1b. Stage 2: Delegate Approver
  const isDelegated = !!indent.approver_name || !!matchingApproval || indent.status === "Approved" || indent.status === "PO Issued" || indent.status === "Completed";
  const s2Start = indentCreatedAt;
  const s2End = indent.delegated_at || matchingApproval?.created_at || (isDelegated ? (indent.updated_at || indentCreatedAt) : null);
  const s2Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.DELEGATE_APPROVER,
    startTime: s2Start,
    endTime: isDelegated ? s2End : null,
    isCompleted: isDelegated,
    rulesList,
  });
  stagesTimeline.push({
    ...s2Tat,
    stageKey: "delegate_approver",
    stageNumber: 2,
    displayName: "Stage 2 : Delegate Approvers",
    ownerRole: "Purchase Coordinator / Admin",
    details: indent.approver_name ? `Delegated to ${indent.approver_name}` : "Pending approver assignment",
  });

  // 2. Stage 3: Indent Approval
  const s3Start = indentCreatedAt;
  const s3End = indentApprovedAt;
  const isS3Done = !!indentApprovedAt || indent.status === "Approved" || indent.status === "PO Issued" || indent.status === "Completed";
  const isS3Active = !isS3Done && (indent.status === "Pending Approval" || !indent.status);
  const s3Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.INDENT_APPROVAL,
    startTime: isS3Active || isS3Done ? s3Start : null,
    endTime: s3End,
    isCompleted: isS3Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s3Tat,
    stageKey: "indent_approval",
    stageNumber: 3,
    displayName: "Stage 3 : Indent Approval",
    ownerRole: "Approver / HOD",
    details: matchingApproval?.approver_username
      ? `Reviewed by ${matchingApproval.approver_username} - ${matchingApproval.approval_status || "Approved"}`
      : indent.approver_name
      ? `Assigned to ${indent.approver_name}`
      : "Pending HOD technical clearance",
  });

  // 3. Stage 4: Quotation Submission (Only if New Vendor or Quotations required)
  const s4Start = indentApprovedAt;
  const s4End = quotationReceivedAt || (matchingAv ? matchingAv.created_at : null);
  const isS4Done = !isNewVendor || !!quotationReceivedAt || matchingQuotes.length > 0 || !!matchingAv || !!matchingPO;
  const isS4Active = isS3Done && !isS4Done && isNewVendor;
  const s4Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.QUOTATION_SUBMISSION,
    startTime: (isS4Active || isS4Done) && s4Start ? s4Start : null,
    endTime: s4End,
    isCompleted: isS4Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s4Tat,
    stageKey: "quotation_submission",
    stageNumber: 4,
    displayName: "Stage 4 : Quotation Submission",
    ownerRole: "Purchase Officer / Vendor",
    details: matchingQuotes.length > 0
      ? `${matchingQuotes.length} quotes submitted`
      : !isNewVendor
      ? "Regular vendor rate applied (Bypassed RFQ)"
      : "Awaiting vendor commercial bids",
  });

  // 4. Stage 5: Approved Vendor
  const isS5Done = !isNewVendor || !!matchingAv || !!matchingPO;
  const s5Start = quotationReceivedAt || indentApprovedAt;
  const s5End = vendorApprovedAt || (matchingPO ? matchingPO.created_at : null);
  const isS5Active = isS3Done && !isS5Done && isNewVendor && isS4Done;
  const s5Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.APPROVED_VENDOR,
    startTime: (isS5Active || isS5Done) && s5Start ? s5Start : null,
    endTime: s5End,
    isCompleted: isS5Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s5Tat,
    stageKey: "approved_vendor",
    stageNumber: 5,
    displayName: "Stage 5 : Approved Vendor",
    ownerRole: "Purchase Authority / HOD",
    details: matchingAv?.vendor_name
      ? `Sanctioned: ${matchingAv.vendor_name} @ ₹${matchingAv.final_agreed_rate || 0}`
      : indent.selected_vendor_name
      ? `Selected: ${indent.selected_vendor_name}`
      : !isNewVendor
      ? "Regular vendor applied"
      : "Pending management vendor sanction",
  });

  // 5. Stage 6: Make PO
  const s6Start = vendorApprovedAt || indentApprovedAt || indentCreatedAt;
  const s6End = poIssuedAt;
  const isS6Done = !!matchingPO;
  const isS6Active = isS3Done && !isS6Done && (isS5Done || !isNewVendor);
  const s6Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.MAKE_PO,
    startTime: (isS6Active || isS6Done) && s6Start ? s6Start : null,
    endTime: s6End,
    isCompleted: isS6Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s6Tat,
    stageKey: "make_po",
    stageNumber: 6,
    displayName: "Stage 6 : Make PO",
    ownerRole: "Purchase Dept / PO Maker",
    details: matchingPO
      ? `PO #${matchingPO.po_number} issued to ${matchingPO.vendor_name}`
      : "Drafting Purchase Order",
  });

  // 6. Stage 7: Payment
  const s7Start = poIssuedAt;
  const s7End = paymentClearedAt;
  const isS7Done = !!matchingPayment && (matchingPayment.status === "Completed" || Number(matchingPayment.amount) > 0);
  const isS7Active = isS6Done && !isS7Done;
  const s7Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.PAYMENT,
    startTime: (isS7Active || isS7Done) && s7Start ? s7Start : null,
    endTime: s7End,
    isCompleted: isS7Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s7Tat,
    stageKey: "payment",
    stageNumber: 7,
    displayName: "Stage 7 : Payment",
    ownerRole: "Accounts / Finance Dept",
    details: matchingPayment
      ? `Payment processed: ₹${matchingPayment.amount || 0} (${matchingPayment.payment_type || "Advance"})`
      : matchingPO?.payment_type === "Advance"
      ? "Pending advance release"
      : "Credit terms (Post GRN billing)",
  });

  // 7. Stage 8: Follow-up / Lifting
  const isPoAdvYes =
    String(matchingPO?.advance_payment || matchingPO?.advancePayment || "").trim().toLowerCase() === "yes" ||
    Number(matchingPO?.advance_amount || 0) > 0 ||
    (String(matchingPO?.payment_type || "").toLowerCase().includes("advance") &&
      !String(matchingPO?.payment_type || "").toLowerCase().includes("no advance"));

  const stage8BaseDate = isPoAdvYes
    ? (paymentClearedAt || poIssuedAt)
    : (vendorApprovedAt || poIssuedAt);

  const s8Start =
    matchingLifting?.updated_at ||
    matchingLifting?.last_followup_date ||
    matchingLifting?.followup_date ||
    matchingLifting?.created_at ||
    stage8BaseDate;
  const s8End = materialLiftedAt;
  const isS8Done =
    !!(matchingLifting?.actual_lifting_date) ||
    matchingLifting?.lifting_status === "Completed";
  const isS8Active = isS6Done && !isS8Done;
  const s8Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.FOLLOWUP_LIFTING,
    startTime: (isS8Active || isS8Done) && s8Start ? s8Start : null,
    endTime: s8End,
    isCompleted: isS8Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s8Tat,
    stageKey: "followup_lifting",
    stageNumber: 8,
    displayName: "Stage 8 : Follow-up / Lifting",
    ownerRole: "Logistics / Follow-Up Team",
    details: matchingLifting?.vehicle_number
      ? `Vehicle: ${matchingLifting.vehicle_number} | Qty: ${matchingLifting.lifting_qty || 0}`
      : matchingLifting?.expected_lifting_date
      ? `Exp. Lifting: ${matchingLifting.expected_lifting_date.split("T")[0]}`
      : "Coordination with vendor for dispatch",
  });

  // 8. Stage 9: Transporter Follow-Up
  const s9Start =
    matchingTf?.updated_at ||
    matchingTf?.dispatch_date ||
    matchingTf?.created_at ||
    materialLiftedAt ||
    matchingLifting?.actual_lifting_date;
  const s9End = transporterDeliveredAt;
  const isS9Done =
    matchingTf?.status === "Received" ||
    matchingTf?.status === "Delivered" ||
    matchingTf?.status === "Completed" ||
    !!matchingGrn;
  const isS9Active = (isS8Done || !!matchingTf) && !isS9Done;
  const s9Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.TRANSPORTER_FOLLOWUP,
    startTime: (isS9Active || isS9Done) && s9Start ? s9Start : null,
    endTime: s9End,
    isCompleted: isS9Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s9Tat,
    stageKey: "transporter_followup",
    stageNumber: 9,
    displayName: "Stage 9 : Transporter Follow-Up",
    ownerRole: "Logistics / Transporter",
    details: matchingTf
      ? `Transporter: ${matchingTf.transporter_name || "-"} | Status: ${matchingTf.status || "In Transit"}`
      : "Highway transit tracking",
  });

  // 9. Stage 10: Material Received (GRN)
  const s10Start = transporterDeliveredAt || materialLiftedAt || poIssuedAt;
  const s10End = grnRecordedAt;
  const isS10Done = !!matchingGrn;
  const isS10Active = (isS9Done || isS8Done) && !isS10Done;
  const s10Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.MATERIAL_RECEIVED,
    startTime: (isS10Active || isS10Done) && s10Start ? s10Start : null,
    endTime: s10End,
    isCompleted: isS10Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s10Tat,
    stageKey: "material_received",
    stageNumber: 10,
    displayName: "Stage 10 : Material Received (GRN)",
    ownerRole: "Store Incharge / QC",
    details: matchingGrn
      ? `GRN #${matchingGrn.grn_number} | Accepted: ${matchingGrn.accepted_quantity || matchingGrn.received_quantity || 0} ${indent.uom || "NOS"}`
      : "Gate inward & physical QC inspection",
  });

  // 10. Stage 11: Tally Billing
  const s11Start = grnRecordedAt;
  const s11End = tallyPostedAt;
  const isS11Done = !!matchingTally;
  const isS11Active = isS10Done && !isS11Done;
  const s11Tat = calculateStageTat({
    stageName: PURCHASE_STAGE_KEYS.TALLY_BILLING,
    startTime: (isS11Active || isS11Done) && s11Start ? s11Start : null,
    endTime: s11End,
    isCompleted: isS11Done,
    rulesList,
  });
  stagesTimeline.push({
    ...s11Tat,
    stageKey: "tally_billing",
    stageNumber: 11,
    displayName: "Stage 11 : Tally Billing",
    ownerRole: "Accounts / Billing Incharge",
    details: matchingTally
      ? `Invoice: ${matchingTally.vendor_invoice_number} | Voucher: ${matchingTally.tally_voucher_number || "-"}`
      : "ERP Purchase voucher posting",
  });

  // If order cancelled
  if (matchingCancel || indent.status === "Cancelled" || indent.status === "Stage Cancelled") {
    const cancelTat = calculateStageTat({
      stageName: PURCHASE_STAGE_KEYS.ORDER_CANCEL,
      startTime: indentCreatedAt,
      endTime: cancelledAt,
      isCompleted: true,
      rulesList,
    });
    stagesTimeline.push({
      ...cancelTat,
      stageKey: "order_cancel",
      stageNumber: 12,
      displayName: "Stage 12 : Order Cancel",
      ownerRole: "Purchase Admin",
      details: `Cancelled: ${matchingCancel?.cancellation_reason || indent.rejection_reason || "Workflow stopped"}`,
    });
  }

  // Aggregate overall transaction metrics
  const activeStage = stagesTimeline.find((s) => s.isActive) || stagesTimeline.filter((s) => s.isCompleted).pop() || stagesTimeline[0];
  const hasDelayed = stagesTimeline.some((s) => s.status === TAT_STATUS.DELAY || s.status === "DELAY" || s.status === "BREACHED");
  const isFullyComplete = isS11Done;

  const totalSlaMinutes = stagesTimeline.reduce((sum, s) => sum + (s.startedAt ? s.slaMinutes : 0), 0);
  const totalActualMinutes = stagesTimeline.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

  const overallStatus = hasDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;

  return {
    indentId,
    indentNumber: indentNum,
    itemName: indent.item_name || "-",
    poNumber: poNum || "-",
    vendorName: matchingPO?.vendor_name || matchingAv?.vendor_name || indent.selected_vendor_name || "-",
    stages: stagesTimeline,
    activeStage,
    overallStatus,
    hasBreached: hasDelayed,
    hasDelayed,
    isFullyComplete,
    totalSlaMinutes,
    totalSlaFormatted: formatDurationMinutes(totalSlaMinutes),
    totalActualMinutes,
    totalActualFormatted: formatDurationMinutes(totalActualMinutes),
  };
}

/**
 * Calculates macro system-level TAT metrics and stage performance compliance
 */
export function computeSystemTatMetrics({
  indents = [],
  purchaseOrders = [],
  approvals = [],
  quotations = [],
  approvedVendors = [],
  vendorPayments = [],
  vendorLiftings = [],
  transporterFollowups = [],
  materialReceipts = [],
  tallyBillings = [],
  orderCancellations = [],
  rulesList = [],
  lookupIndex = null,
}) {
  const activeLookupIndex =
    lookupIndex ||
    buildTatEntityLookupIndex({
      purchaseOrders,
      approvals,
      quotations,
      approvedVendors,
      vendorPayments,
      vendorLiftings,
      transporterFollowups,
      materialReceipts,
      tallyBillings,
      orderCancellations,
    });

  const allTimelines = (indents || []).map((indent) =>
    compileTransactionTatTimeline({
      indent,
      purchaseOrders,
      approvals,
      quotations,
      approvedVendors,
      vendorPayments,
      vendorLiftings,
      transporterFollowups,
      materialReceipts,
      tallyBillings,
      orderCancellations,
      rulesList,
      lookupIndex: activeLookupIndex,
    })
  ).filter(Boolean);

  let totalActive = 0;
  let onTrackCount = 0;
  let atRiskCount = 0;
  let breachedCount = 0;
  let withinSlaCount = 0;

  // Stage-wise aggregation
  const stageStats = {};
  WORKFLOW_STAGES_CONFIG.forEach((c) => {
    stageStats[c.section_name] = {
      section_name: c.section_name,
      displayName: c.displayName,
      shortName: c.shortName,
      ownerRole: c.ownerRole,
      totalCount: 0,
      withinSlaCount: 0,
      breachedCount: 0,
      atRiskCount: 0,
      onTrackCount: 0,
      complianceRate: 100,
    };
  });

  allTimelines.forEach((tl) => {
    if (tl.isFullyComplete) {
      if (tl.hasBreached) breachedCount++;
      else withinSlaCount++;
    } else {
      totalActive++;
      if (tl.overallStatus === TAT_STATUS.BREACHED) breachedCount++;
      else if (tl.overallStatus === TAT_STATUS.AT_RISK) atRiskCount++;
      else onTrackCount++;
    }

    tl.stages.forEach((stg) => {
      if (!stg.startedAt) return;
      const stat = stageStats[stg.stageName];
      if (!stat) return;

      stat.totalCount++;
      if (stg.status === TAT_STATUS.WITHIN_SLA) stat.withinSlaCount++;
      else if (stg.status === TAT_STATUS.BREACHED) stat.breachedCount++;
      else if (stg.status === TAT_STATUS.AT_RISK) stat.atRiskCount++;
      else stat.onTrackCount++;
    });
  });

  Object.values(stageStats).forEach((s) => {
    const evaluated = s.withinSlaCount + s.breachedCount + s.onTrackCount + s.atRiskCount;
    s.complianceRate =
      evaluated > 0 ? Math.round(((s.withinSlaCount + s.onTrackCount) / evaluated) * 100) : 100;
  });

  const totalEvaluated = withinSlaCount + breachedCount + onTrackCount + atRiskCount;
  const overallComplianceRate =
    totalEvaluated > 0 ? Math.round(((withinSlaCount + onTrackCount) / totalEvaluated) * 100) : 100;

  return {
    totalTransactions: allTimelines.length,
    totalActive,
    onTrackCount,
    atRiskCount,
    breachedCount,
    withinSlaCount,
    overallComplianceRate,
    stageStats: Object.values(stageStats),
    timelinesMap: new Map(allTimelines.map((t) => [t.indentId, t])),
  };
}
