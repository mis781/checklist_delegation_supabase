/**
 * Universal Date and Timezone Utilities for Purchase System
 * Aligns date parsing and formatting with the user's device timezone.
 */

/**
 * Format any ISO timestamp or date string into DD-MM-YYYY in device timezone.
 * Handles:
 *  - "2026-08-27T00:00:00+00:00" -> "27-08-2026"
 *  - "2026-08-26T10:40:08.839Z" -> "26-08-2026"
 *  - "2026-08-27" -> "27-08-2026"
 *  - null / undefined / "-" -> "—"
 */
export function formatDateDash(val) {
  if (!val || val === "-" || val === "—" || val === "null" || val === "undefined") {
    return "—";
  }

  try {
    // If it's pure YYYY-MM-DD
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-");
      return `${d}-${m}-${y}`;
    }

    const d = new Date(val);
    if (isNaN(d.getTime())) {
      // Fallback: extract date components directly from string
      if (typeof val === "string" && val.includes("-")) {
        const datePart = val.split("T")[0];
        const parts = datePart.split("-");
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return String(val);
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(val || "—");
  }
}

/**
 * Format any ISO timestamp into DD-MM-YYYY HH:mm in device timezone.
 */
export function formatDateTime(val) {
  if (!val || val === "-" || val === "—" || val === "null" || val === "undefined") {
    return "—";
  }

  try {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      return formatDateDash(val);
    }

    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return formatDateDash(val);
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHour = String(hours).padStart(2, "0");

    return `${day}-${month}-${year} ${formattedHour}:${mins} ${ampm}`;
  } catch {
    return formatDateDash(val);
  }
}

/**
 * Format delivery lead time which might be an ISO timestamp, a date string, or free text (e.g. "7 Days").
 */
export function formatLeadTime(val) {
  if (!val || val === "-" || val === "—" || val === "null" || val === "undefined") {
    return "—";
  }
  const str = String(val).trim();

  // If it's an ISO timestamp or date
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return formatDateTime(str);
  }
  return str;
}

/**
 * Format date for input[type="date"] (YYYY-MM-DD)
 */
export function formatForDateInput(val) {
  if (!val) return "";
  try {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

/**
 * Convert user-picked date (YYYY-MM-DD) or current timestamp to full ISO timestamp string,
 * preserving the exact device date and current time.
 */
export function toLocalIsoTimestamp(val) {
  if (!val) return new Date().toISOString();
  try {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-").map(Number);
      const now = new Date();
      const local = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      return local.toISOString();
    }
    // If it's a date string with midnight (e.g. T00:00:00) without explicit time
    if (typeof val === "string" && (val.endsWith("T00:00:00") || val.endsWith("T00:00:00.000Z") || val.endsWith("T00:00:00+00:00"))) {
      const datePart = val.split("T")[0];
      const [y, m, d] = datePart.split("-").map(Number);
      const now = new Date();
      const local = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      return local.toISOString();
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
