// Shared helpers for the cross-system pending summary (PC Dashboard + sidebar badges)

// Supabase caps a single select at the project's max-rows setting, so page through big tables
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

// First non-empty value among the given keys
export function pick(obj, keys) {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

export function toDate(value) {
  if (!value) return null;
  // Several systems format dates as dd/mm/yyyy, which Date() would read as mm/dd
  const dmy = typeof value === "string" && value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Normalized pending item used by the PC Dashboard tables.
 * `raw` keeps the full source record so the detail view can show every field.
 */
export function makeItem({
  id,
  ref,
  title,
  subtitle = "",
  person = "",
  department = "",
  division = "",
  plannedAt = null,
  createdAt = null,
  amount = null,
  tag = "",
  raw,
  related = null,
}) {
  const planned = toDate(plannedAt);
  const created = toDate(createdAt);
  const now = Date.now();
  const ageFrom = planned || created;
  const rawDiv =
    division ||
    raw?.division ||
    raw?.firm ||
    raw?.firm_name ||
    raw?.fromDivision ||
    raw?.from_division ||
    raw?.transferredDivision ||
    raw?.transferred_division ||
    raw?.toDivision ||
    raw?.to_division ||
    raw?.warehouse_location ||
    "";
  const finalDivision = Array.isArray(rawDiv) ? rawDiv.join(", ") : String(rawDiv || "").trim();

  return {
    id: String(id ?? ref ?? Math.random()),
    ref: ref ? String(ref) : "",
    title: title ? String(title) : "",
    subtitle: subtitle ? String(subtitle) : "",
    person: person ? String(person) : "",
    department: department ? String(department) : "",
    division: finalDivision,
    plannedAt: planned ? planned.toISOString() : null,
    createdAt: created ? created.toISOString() : null,
    isOverdue: !!planned && planned.getTime() < now,
    ageMins: ageFrom ? Math.max(0, Math.round((now - ageFrom.getTime()) / 60000)) : null,
    amount: amount === null || amount === undefined || amount === "" || isNaN(Number(amount)) ? null : Number(amount),
    tag,
    raw,
    related,
  };
}

export function formatAge(mins) {
  if (mins === null || mins === undefined) return "-";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

// Reads the logged-in user context the same way the rest of the app does
export function getStoredUserCtx() {
  return {
    username: localStorage.getItem("user-name") || "",
    role: (localStorage.getItem("role") || "user").toLowerCase(),
  };
}
