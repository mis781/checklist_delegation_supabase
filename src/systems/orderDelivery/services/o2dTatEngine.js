/**
 * Order-to-Delivery (O2D) System TAT (Turn Around Time) & SLA Management Engine
 * Centralized deterministic TAT calculation and state timeline compiler for Order Management.
 */
import supabase from "../../../SupabaseClient";

export const O2D_STAGE_KEYS = {
  RECEIVED_ORDER: "Received Order",
  CHECK_VALIDATION: "Check & Validation",
  STOCK_VERIFICATION: "Stock Verification",
  PRODUCTION_PLANNING: "Production Planning",
  DISPATCH_PLANNING: "Dispatch Planning",
  PACKAGING: "Packaging",
  VEHICLE_LOGISTIC: "Vehicle Logistic",
  MAKE_CHALLAN: "Make Challan",
  MAKE_INVOICE: "Make Invoice",
  CONFIRM_DELIVERY: "Confirm Delivery",
  PAYMENTS: "Payments",
};

export const WORKFLOW_O2D_STAGES_CONFIG = [
  {
    stageKey: "received_order",
    stageNumber: 1,
    stageName: O2D_STAGE_KEYS.RECEIVED_ORDER,
    displayName: "Stage 01: Received Order",
    shortName: "PO Entry",
    defaultSlaValue: 4,
    defaultSlaUnit: "hr",
    description: "PO received, logged into system and sent for verification",
  },
  {
    stageKey: "check_validation",
    stageNumber: 2,
    stageName: O2D_STAGE_KEYS.CHECK_VALIDATION,
    displayName: "Stage 02: Check & Validation",
    shortName: "Validation",
    defaultSlaValue: 4,
    defaultSlaUnit: "hr",
    description: "Item specifications, rates, and party terms verified",
  },
  {
    stageKey: "stock_verification",
    stageNumber: 3,
    stageName: O2D_STAGE_KEYS.STOCK_VERIFICATION,
    displayName: "Stage 03: Stock Verification",
    shortName: "Stock Check",
    defaultSlaValue: 8,
    defaultSlaUnit: "hr",
    description: "Inventory checked for order line items to approve or route to production",
  },
  {
    stageKey: "production_planning",
    stageNumber: 4,
    stageName: O2D_STAGE_KEYS.PRODUCTION_PLANNING,
    displayName: "Stage 04: Production Planning",
    shortName: "Production",
    defaultSlaValue: 48,
    defaultSlaUnit: "hr",
    description: "Manufacture shortage quantities and produce finished goods",
  },
  {
    stageKey: "dispatch_planning",
    stageNumber: 5,
    stageName: O2D_STAGE_KEYS.DISPATCH_PLANNING,
    displayName: "Stage 05: Dispatch Planning",
    shortName: "Dispatch",
    defaultSlaValue: 12,
    defaultSlaUnit: "hr",
    description: "Schedule ready quantities and allocate dispatch lots",
  },
  {
    stageKey: "packaging",
    stageNumber: 6,
    stageName: O2D_STAGE_KEYS.PACKAGING,
    displayName: "Stage 06: Packaging",
    shortName: "Packaging",
    defaultSlaValue: 8,
    defaultSlaUnit: "hr",
    description: "Quality packaging and barcode labeling before vehicle loading",
  },
  {
    stageKey: "vehicle_logistic",
    stageNumber: 7,
    stageName: O2D_STAGE_KEYS.VEHICLE_LOGISTIC,
    displayName: "Stage 07: Vehicle Logistic",
    shortName: "Logistics",
    defaultSlaValue: 12,
    defaultSlaUnit: "hr",
    description: "Transporter booking, vehicle placement, and driver assignment",
  },
  {
    stageKey: "make_challan",
    stageNumber: 8,
    stageName: O2D_STAGE_KEYS.MAKE_CHALLAN,
    displayName: "Stage 08: Make Challan",
    shortName: "Delivery Challan",
    defaultSlaValue: 4,
    defaultSlaUnit: "hr",
    description: "Formal delivery challan generation with transport details",
  },
  {
    stageKey: "make_invoice",
    stageNumber: 9,
    stageName: O2D_STAGE_KEYS.MAKE_INVOICE,
    displayName: "Stage 09: Make Invoice",
    shortName: "Invoice",
    defaultSlaValue: 4,
    defaultSlaUnit: "hr",
    description: "Tax invoice generation with HSN, GST, and total value breakdown",
  },
  {
    stageKey: "confirm_delivery",
    stageNumber: 10,
    stageName: O2D_STAGE_KEYS.CONFIRM_DELIVERY,
    displayName: "Stage 10: Confirm Delivery",
    shortName: "Delivery POD",
    defaultSlaValue: 48,
    defaultSlaUnit: "hr",
    description: "Shipment delivered to customer site and POD acknowledgement confirmed",
  },
  {
    stageKey: "payments",
    stageNumber: 11,
    stageName: O2D_STAGE_KEYS.PAYMENTS,
    displayName: "Stage 11: Payments",
    shortName: "Payment",
    defaultSlaValue: 24,
    defaultSlaUnit: "hr",
    description: "Advance, freight, and customer invoice payment settlement",
  },
];

export const TAT_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  ON_TRACK: "ON_TRACK",
  DELAY: "DELAY",
  BREACHED: "DELAY",
  COMPLETED: "COMPLETED",
};

export const OFFICE_HOURS = {
  START_HOUR: 10,
  END_HOUR: 18,
  DAILY_WORK_MINUTES: 8 * 60,
};

/**
 * Converts SLA completion time and time unit into duration in minutes.
 */
export function slaToMinutes(completionTime, timeUnit = "hr") {
  const val = parseFloat(completionTime);
  if (isNaN(val) || val <= 0) return 24 * 60;
  const unit = String(timeUnit).toLowerCase().trim();
  if (unit === "day" || unit === "days") {
    return Math.round(val * OFFICE_HOURS.DAILY_WORK_MINUTES);
  }
  if (unit === "min" || unit === "minutes" || unit === "m") {
    return Math.round(val);
  }
  return Math.round(val * 60);
}

/**
 * Computes business/office hours duration in minutes between two timestamps.
 */
export function calculateOfficeHoursDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

  // Use standard elapsed minutes for continuous production/logistics
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (60 * 1000)));
}

/**
 * Adds SLA minutes to a start date to compute the target due date.
 */
export function addSlaToDate(startDate, slaMinutes) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  return new Date(start.getTime() + slaMinutes * 60 * 1000);
}

/**
 * Formats duration in minutes into a human-readable string (e.g. "2h 30m", "1d 4h").
 */
export function formatDurationMinutes(minutes) {
  const mins = Math.max(0, Math.round(minutes || 0));
  if (mins === 0) return "0m";
  const days = Math.floor(mins / (24 * 60));
  const hours = Math.floor((mins % (24 * 60)) / 60);
  const remMins = mins % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }
  return `${remMins}m`;
}

/**
 * Resolves active TAT rule for a given stage name from master_tat_rules list.
 */
export function resolveActiveTatRule(stageName, rulesList = []) {
  if (!stageName) return null;
  const cleanTarget = String(stageName).trim().toLowerCase();

  const matched = (rulesList || []).find((r) => {
    const isSysMatch =
      !r.system_name ||
      r.system_name.toLowerCase().includes("order") ||
      r.system_name.toLowerCase().includes("o2d");
    if (!isSysMatch) return false;
    const name = String(r.stage_name || r.section_name || r.stage || "").trim().toLowerCase();
    return name === cleanTarget;
  });

  if (matched) {
    return {
      stageName,
      timeValue: parseFloat(matched.completion_time ?? matched.time_value ?? 24),
      timeUnit: matched.time_unit || matched.unit || "hr",
      description: matched.description || "",
      isCustom: true,
    };
  }

  const defaultCfg = WORKFLOW_O2D_STAGES_CONFIG.find(
    (cfg) => cfg.stageName.toLowerCase() === cleanTarget || cfg.shortName.toLowerCase() === cleanTarget
  );

  if (defaultCfg) {
    return {
      stageName: defaultCfg.stageName,
      timeValue: defaultCfg.defaultSlaValue,
      timeUnit: defaultCfg.defaultSlaUnit,
      description: defaultCfg.description,
      isCustom: false,
    };
  }

  return {
    stageName,
    timeValue: 24,
    timeUnit: "hr",
    description: "Default SLA",
    isCustom: false,
  };
}

/**
 * Core TAT status calculation for any record in an O2D stage.
 * @param {Object} record - The order, dispatch, delivery, or check record
 * @param {String} stageName - The name of the current O2D stage
 * @param {Array} rulesList - Active master_tat_rules
 * @param {Object} options - Override timestamps (startedAt, completedAt, isCompleted)
 */
export function getTatStatusForOrder(record, stageName, rulesList = [], options = {}) {
  if (!record) {
    return {
      status: TAT_STATUS.NOT_STARTED,
      dueAt: null,
      startedAt: null,
      completedAt: null,
      isCompleted: false,
      remainingFormatted: "",
      overdueFormatted: "",
    };
  }

  const rule = resolveActiveTatRule(stageName, rulesList);
  const slaMins = slaToMinutes(rule.timeValue, rule.timeUnit);

  // 1. Determine Started At
  let startedAt = options.startedAt;
  if (!startedAt) {
    startedAt =
      record.startedAt ||
      record.stageStartedAt ||
      record.dispatchTimestamp ||
      record.packagingTimestamp ||
      record.produced_at ||
      record.validated_at ||
      record.checkedAt ||
      record.created_at ||
      record.timestamp ||
      record.poDate ||
      null;
  }

  // 2. Determine Completed At & isCompleted
  let completedAt = options.completedAt || record.completedAt || null;
  let isCompleted = options.isCompleted !== undefined ? options.isCompleted : false;

  if (options.isCompleted === undefined) {
    if (stageName === O2D_STAGE_KEYS.RECEIVED_ORDER) {
      isCompleted = Boolean(record.isCompleted || record.pendingQty === 0);
    } else if (stageName === O2D_STAGE_KEYS.CHECK_VALIDATION) {
      isCompleted = Boolean(record.isChecked || record.is_checked);
      if (isCompleted && !completedAt) completedAt = record.checkedAt || record.updated_at;
    } else if (stageName === O2D_STAGE_KEYS.STOCK_VERIFICATION) {
      isCompleted = Boolean(record.stockStatus || record.approveQty || record.isCompleted);
    } else if (stageName === O2D_STAGE_KEYS.PRODUCTION_PLANNING) {
      isCompleted = Boolean(record.produced || record.isProduced);
      if (isCompleted && !completedAt) completedAt = record.produced_at;
    } else if (stageName === O2D_STAGE_KEYS.DISPATCH_PLANNING) {
      isCompleted = Boolean(record.dispatchId || record.dispatchQty || record.isCompleted);
    } else if (stageName === O2D_STAGE_KEYS.PACKAGING) {
      isCompleted = record.packagingStatus === "Yes";
      if (isCompleted && !completedAt) completedAt = record.packagingTimestamp;
    } else if (stageName === O2D_STAGE_KEYS.VEHICLE_LOGISTIC) {
      isCompleted = Boolean(record.logisticId || record.transporterName || record.isCompleted);
    } else if (stageName === O2D_STAGE_KEYS.MAKE_CHALLAN) {
      isCompleted = Boolean(record.callanNumber || record.challanNumber || record.isCompleted);
    } else if (stageName === O2D_STAGE_KEYS.MAKE_INVOICE) {
      isCompleted = Boolean(record.invoiceNumber || record.isCompleted);
    } else if (stageName === O2D_STAGE_KEYS.CONFIRM_DELIVERY) {
      isCompleted = record.deliveryStatus === "Delivered";
      if (isCompleted && !completedAt) completedAt = record.deliveryDate || record.deliveryTimestamp;
    } else if (stageName === O2D_STAGE_KEYS.PAYMENTS) {
      isCompleted = Boolean(record.paymentType || record.amountPaid || record.isCompleted);
    }
  }

  // 3. Compute Due At
  const dueAt = startedAt ? addSlaToDate(startedAt, slaMins) : null;
  const now = new Date();

  let status = TAT_STATUS.ON_TRACK;
  let remainingFormatted = "";
  let overdueFormatted = "";

  if (dueAt && !isNaN(dueAt.getTime())) {
    if (isCompleted) {
      const finishTime = completedAt ? new Date(completedAt) : now;
      if (!isNaN(finishTime.getTime()) && finishTime.getTime() > dueAt.getTime()) {
        status = TAT_STATUS.DELAY;
        const overMins = Math.floor((finishTime.getTime() - dueAt.getTime()) / (60 * 1000));
        overdueFormatted = `${formatDurationMinutes(overMins)} overdue`;
      } else {
        status = TAT_STATUS.ON_TRACK;
        remainingFormatted = "Completed";
      }
    } else {
      if (now.getTime() > dueAt.getTime()) {
        status = TAT_STATUS.DELAY;
        const overMins = Math.floor((now.getTime() - dueAt.getTime()) / (60 * 1000));
        overdueFormatted = `${formatDurationMinutes(overMins)} overdue`;
      } else {
        status = TAT_STATUS.ON_TRACK;
        const remMins = Math.floor((dueAt.getTime() - now.getTime()) / (60 * 1000));
        remainingFormatted = `${formatDurationMinutes(remMins)} left`;
      }
    }
  } else {
    status = isCompleted ? TAT_STATUS.ON_TRACK : TAT_STATUS.NOT_STARTED;
    if (isCompleted) remainingFormatted = "Completed";
  }

  return {
    status,
    dueAt: dueAt ? dueAt.toISOString() : null,
    startedAt: startedAt ? new Date(startedAt).toISOString() : null,
    completedAt: completedAt ? new Date(completedAt).toISOString() : null,
    isCompleted,
    remainingFormatted,
    overdueFormatted,
    rule,
  };
}

/**
 * Loads TAT rules for Order Management from Supabase `master_tat_rules`.
 */
export async function fetchMasterTatRulesForO2D() {
  try {
    const { data, error } = await supabase
      .from("master_tat_rules")
      .select("*")
      .or("system_name.eq.Order Management,system_name.eq.Order to Delivery,system_name.eq.O2D System");
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("[o2dTatEngine] Could not load DB TAT rules, using defaults:", err);
    return [];
  }
}
