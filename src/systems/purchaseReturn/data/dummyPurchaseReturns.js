// Data constants and seed engine for Purchase Return Management System (ReturnTrack)

export const COMPANIES = [
  "Nutech Composites",
  "NuTech Pipes",
  "Protech Max"
];

export const DIVISIONS = [
  "Nutech Division A - Bhilai Unit",
  "Nutech Division B - Bilaspur Central Store",
  "Nutech Plant 1 - Raipur Factory Gate 2"
];

export const TRANSPORT_PAID_BY = [
  "F.O.R.",
  "Ex-Factory",
  "Ex-Factory at transport"
];

export const LOGISTICS_REQUIRED_TERMS = [
  "Ex-Factory",
  "Ex-Factory at transport"
];

export const SUPPLIERS = [
  "Shivam Traders",
  "National Steel Corp",
  "Anand Enterprises",
  "Krishna Metals Pvt Ltd",
  "Balaji Polymers",
  "Sunrise Industrial Supplies",
  "Om Sai Traders",
  "Ganesh Engineering Works"
];

export const REASONS = [
  "Material Damaged in Transit",
  "Quality Not as per Specification",
  "Wrong Item Delivered",
  "Excess Quantity Received",
  "Rejected in QC Inspection",
  "Dimensional Mismatch",
  "Rusted / Corroded Material"
];

export const UNITS = ["KG", "NOS", "MT", "BOX", "LTR"];

export const USERS = [
  "S. Mehta",
  "R. Kulkarni",
  "A. Verma",
  "P. Deshmukh",
  "N. Joshi"
];

export const ACTION_TYPES = [
  "Make Debit Note",
  "Return Material and Debit Note",
  "No Return No Debit Note",
  "Replace"
];

export const ACCESS_PAGES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "approval", label: "Purchase Return Approval" },
  { key: "credit", label: "Ask Party For Credit Note" },
  { key: "logistics", label: "Arrange Logistics" },
  { key: "debitNote", label: "Issue Debit Note & Inform" },
  { key: "plantReturn", label: "Return From Plant" },
  { key: "settings", label: "Settings" }
];

export const INITIAL_USERS = [
  {
    id: "u1",
    name: "S. Mehta",
    username: "smehta",
    role: "Administrator",
    access: {
      dashboard: "edit",
      approval: "edit",
      credit: "edit",
      logistics: "edit",
      debitNote: "edit",
      plantReturn: "edit",
      settings: "edit"
    }
  },
  {
    id: "u2",
    name: "R. Kulkarni",
    username: "rkulkarni",
    role: "Logistics Executive",
    access: {
      dashboard: "view",
      approval: "none",
      credit: "none",
      logistics: "edit",
      debitNote: "view",
      plantReturn: "view",
      settings: "none"
    }
  },
  {
    id: "u3",
    name: "A. Verma",
    username: "averma",
    role: "Approval Reviewer",
    access: {
      dashboard: "view",
      approval: "view",
      credit: "edit",
      logistics: "none",
      debitNote: "none",
      plantReturn: "none",
      settings: "none"
    }
  }
];

export function pad(n, l) {
  return String(n).padStart(l, "0");
}

export function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function todayISO() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1, 2) +
    "-" +
    pad(d.getDate(), 2)
  );
}

export function fmtDateTime(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return (
    dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) +
    ", " +
    dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function inr(n) {
  if (n == null || isNaN(n)) return "-";
  return "\u20B9" + Number(n).toLocaleString("en-IN");
}

export function slug(s) {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function placeholderPreviewUrl(label) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="360">' +
    '<rect width="100%" height="100%" fill="#EEF1F6"/>' +
    '<rect x="24" y="24" width="472" height="312" rx="10" fill="#FFFFFF" stroke="#2A5CDB" stroke-width="2"/>' +
    '<circle cx="260" cy="140" r="34" fill="#E9EFFD"/>' +
    '<text x="260" y="150" font-family="sans-serif" font-size="28" text-anchor="middle" fill="#2A5CDB">&#128247;</text>' +
    '<text x="260" y="210" font-family="monospace" font-size="15" font-weight="700" text-anchor="middle" fill="#16202E">' +
    label +
    "</text>" +
    '<text x="260" y="234" font-family="sans-serif" font-size="11.5" text-anchor="middle" fill="#6B7488">Sample document preview (prototype placeholder)</text>' +
    "</svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Business predicates
export function isClosedActionType(actionType) {
  return actionType === "No Return No Debit Note";
}

export function skipsCreditNote(actionType) {
  return (
    actionType === "No Return No Debit Note" || actionType === "Replace"
  );
}

export function isLogisticsTerm(term) {
  if (!term) return false;
  const clean = String(term).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean === "exfactory" || clean === "exfactoryattransport";
}

export function getTransportPaidBy(r) {
  if (!r) return "";
  return (
    r.transportPaidBy ||
    r.approval?.transportPaidBy ||
    r.transport_paid_by ||
    ""
  );
}

export function logisticsRequired(r) {
  if (!r || r.rejected) return false;
  const actionType = r.approval?.actionType || r.action_type;
  if (isClosedActionType(actionType)) return false;

  const term = getTransportPaidBy(r);
  return isLogisticsTerm(term);
}

export function readyForLogistics(r) {
  if (!r || !r.approval) return false;
  if (skipsCreditNote(r.approval.actionType)) return true;
  return !!r.creditNote;
}

export function readyForDispatch(r) {
  if (!r || !r.approval) return false;
  if (r.approval.actionType === "Replace") {
    return logisticsRequired(r) ? !!r.logistics : true;
  }
  return !!r.debitNote;
}

export function overallStatus(r) {
  if (!r) return "Unknown";
  if (r.rejected) return "Rejected";
  if (!r.approval) return "Pending Approval";
  if (r.approval.actionType === "No Return No Debit Note")
    return "Closed - No Action";
  if (r.approval.actionType === "Replace") {
    if (logisticsRequired(r) && !r.logistics) return "Logistics Pending";
    if (!r.dispatch) return "Return From Plant Pending";
    return "Completed";
  }
  if (!r.creditNote) return "Credit Note Pending";
  if (logisticsRequired(r) && !r.logistics) return "Logistics Pending";
  if (!r.debitNote) return "Debit Note Pending";
  if (r.approval.actionType === "Make Debit Note") return "Completed";
  if (!r.dispatch) return "Return From Plant Pending";
  return "Completed";
}

export function currentStage(r) {
  if (!r) return "Unknown";
  if (r.rejected) return "Rejected / Closed";
  if (!r.approval) return "Purchase Return Approval";
  if (isClosedActionType(r.approval.actionType))
    return "Closed / No Further Stage";
  if (r.approval.actionType === "Replace") {
    if (logisticsRequired(r) && !r.logistics) return "Arrange Logistics";
    if (!r.dispatch) return "Return From Plant";
    return "Completed";
  }
  if (!r.creditNote) return "Ask Party For Credit Note";
  if (logisticsRequired(r) && !r.logistics) return "Arrange Logistics";
  if (!r.debitNote) return "Issue Debit Note & Inform";
  if (r.approval.actionType === "Make Debit Note") return "Completed";
  if (!r.dispatch) return "Return From Plant";
  return "Completed";
}

export function hasOpenPendingQty(r) {
  return r.items && r.items.some((i) => (i.pendingQty || 0) > 0);
}

export function totalReturnQty(r) {
  return (r.items || []).reduce((s, i) => s + (i.returnQty || 0), 0);
}

export function totalReturnValue(r) {
  return (r.items || []).reduce((s, i) => s + (i.returnValue || 0), 0);
}

// Visibility filters for stage tables
export const M1_PENDING = (r) =>
  !r.rejected && (!r.approval || hasOpenPendingQty(r));
export const M1_HISTORY = (r) =>
  !!r.rejected || (!!r.approval && !hasOpenPendingQty(r));

export const MC_PENDING = (r) =>
  r.approval &&
  !r.rejected &&
  !skipsCreditNote(r.approval.actionType) &&
  !r.creditNote;
export const MC_HISTORY = (r) =>
  r.approval && !skipsCreditNote(r.approval.actionType) && !!r.creditNote;

export const M2_PENDING = (r) =>
  r.approval &&
  !r.rejected &&
  logisticsRequired(r) &&
  readyForLogistics(r) &&
  !r.logistics;
export const M2_HISTORY = (r) =>
  r.approval && logisticsRequired(r) && !!r.logistics;

export const M3_PENDING = (r) =>
  r.approval &&
  !r.rejected &&
  (skipsCreditNote(r.approval.actionType) || !!r.creditNote) &&
  (!logisticsRequired(r) || !!r.logistics) &&
  !r.debitNote &&
  r.approval.actionType !== "Replace";
export const M3_HISTORY = (r) => r.approval && !!r.debitNote;

export const M4_PENDING = (r) =>
  r.approval &&
  !r.rejected &&
  r.approval.actionType !== "Make Debit Note" &&
  r.approval.actionType !== "No Return No Debit Note" &&
  readyForDispatch(r) &&
  !r.dispatch;
export const M4_HISTORY = (r) =>
  r.approval &&
  !r.rejected &&
  r.approval.actionType !== "Make Debit Note" &&
  r.approval.actionType !== "No Return No Debit Note" &&
  !!r.dispatch;

// Deprecated seed data generator (replaced by Supabase purchaseReturnApi)
export function generateSeedData() {
  return [];
}

/**
 * Helper to group return records by their Bill Number
 */
export function groupRecordsByBill(records = []) {
  const groups = [];
  const map = new Map();

  records.forEach((r) => {
    const rawBill = r.billNumber || r.bill_number;
    const billKey = rawBill ? String(rawBill).trim() : "Unbilled";
    if (!map.has(billKey)) {
      const g = {
        billKey,
        billNumber: rawBill ? String(rawBill).trim() : "Unbilled / No Bill No.",
        supplier: r.supplier || "",
        company: r.company || "",
        division: r.division || "",
        billDate: r.billDate || r.bill_date || null,
        billImage: r.billImage || r.bill_image || null,
        billImagePreview: r.billImagePreview || null,
        records: []
      };
      map.set(billKey, g);
      groups.push(g);
    }
    map.get(billKey).records.push(r);
  });

  return groups;
}



