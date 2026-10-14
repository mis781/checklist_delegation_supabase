// Turns any raw pending record into labelled, display-ready fields for the detail view

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const URL_RE = /^https?:\/\//i;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;

export function humanizeKey(key) {
  return String(key)
    .replace(/^_+/, "")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object" && !(v instanceof Date)) return Object.keys(v).length === 0;
  return false;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/**
 * Classifies a value for rendering:
 *  text | date | url | image | bool | list (primitive array) | table (object array) | object
 */
export function describeValue(value) {
  if (value instanceof Date) return { kind: "date", value };
  if (typeof value === "boolean") return { kind: "text", value: value ? "Yes" : "No" };
  if (typeof value === "number") return { kind: "text", value: value.toLocaleString("en-IN") };
  if (typeof value === "string") {
    const v = value.trim();
    if (URL_RE.test(v)) return { kind: IMAGE_RE.test(v) ? "image" : "url", value: v };
    if (ISO_DATE.test(v)) return { kind: "date", value: v };
    if ((v.startsWith("[") || v.startsWith("{")) && v.length > 1) {
      try {
        return describeValue(JSON.parse(v));
      } catch {
        /* not JSON, show as text */
      }
    }
    return { kind: "text", value: v };
  }
  if (Array.isArray(value)) {
    if (value.every((x) => x === null || typeof x !== "object")) {
      return { kind: "list", value: value.filter((x) => !isEmptyValue(x)) };
    }
    return { kind: "table", value: value.filter((x) => x && typeof x === "object") };
  }
  if (value && typeof value === "object") return { kind: "object", value };
  return { kind: "text", value: String(value) };
}

/**
 * Splits a record into simple fields (shown as a grid) and nested sections
 * (arrays of objects / objects, shown as their own tables).
 */
export function splitRecord(record) {
  const fields = [];
  const sections = [];
  Object.entries(record || {}).forEach(([key, value]) => {
    if (isEmptyValue(value)) return;
    const d = describeValue(value);
    if (d.kind === "table" || d.kind === "object") {
      sections.push({ key, label: humanizeKey(key), ...d });
    } else {
      fields.push({ key, label: humanizeKey(key), ...d });
    }
  });
  return { fields, sections };
}

// Column set for an array of objects, skipping columns that are empty on every row
export function tableColumns(rows) {
  const cols = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((k) => {
      if (!cols.includes(k)) cols.push(k);
    });
  });
  return cols.filter((c) => rows.some((r) => !isEmptyValue(r?.[c])));
}

export function plainText(value) {
  const d = describeValue(value);
  if (d.kind === "date") return formatDateTime(d.value);
  if (d.kind === "list") return d.value.join(", ");
  if (d.kind === "table") return `${d.value.length} record(s)`;
  if (d.kind === "object") return JSON.stringify(d.value);
  return String(d.value ?? "");
}
