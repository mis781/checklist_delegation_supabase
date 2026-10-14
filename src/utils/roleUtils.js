import { getReadablePageIds } from "./pagePermissionUtils";

/**
 * Role & Permission Utilities for Nutech Master System
 * Supports standard roles (Admin, HOD, User) and Super Admin roles (Administrator, Superadmin)
 */

export const SUPER_ADMIN_ROLES = [
  "administrator",
  "administtrator",
  "superadmin",
  "super admin",
];

export const ADMIN_ROLES = [
  ...SUPER_ADMIN_ROLES,
  "admin",
];

/**
 * Checks if the given role or username qualifies as an unrestricted Administrator / Superadmin.
 * Only ADMINISTRATOR / SUPERADMIN has full automatic bypass.
 * Standard "admin", "HOD", and "user" roles follow granular page_access permissions.
 * @param {string} [role] - User's role from DB / localStorage / activeUser
 * @param {string} [username] - User's username / identifier
 * @returns {boolean} true if user has unrestricted full access
 */
export function isAdministrator(role, username) {
  const r = String(role || "").trim().toLowerCase();
  const u = String(username || "").trim().toLowerCase();

  // If role is explicitly an unrestricted superadmin / administrator variant
  if (SUPER_ADMIN_ROLES.includes(r)) {
    return true;
  }

  // If username is an explicit superadmin account
  if (
    u === "superadmin" ||
    u === "administrator" ||
    u === "administtrator"
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if current user from localStorage / activeUser has unrestricted full access
 */
export function checkCurrentUserIsAdmin(activeUser) {
  const role = activeUser?.role || localStorage.getItem("role") || localStorage.getItem("sp_simulated_role") || "";
  const username = activeUser?.user_name || activeUser?.name || localStorage.getItem("user-name") || "";
  return isAdministrator(role, username);
}

/**
 * Validates whether a user has permission to access a specific page ID.
 * @param {string} pageId - Target page ID (e.g. 'inventory_stock', 'checklist_dashboard')
 * @param {string} [role] - User's role
 * @param {string} [username] - User's username
 * @param {string} [pageAccessString] - Comma-separated allowed pages string from DB/localStorage
 * @returns {boolean}
 */
export function hasPageAccess(pageId, role, username, pageAccessString) {
  if (isAdministrator(role, username)) return true;

  const rawAccess = pageAccessString !== undefined
    ? pageAccessString
    : (localStorage.getItem("page_access") || "");

  if (!rawAccess || typeof rawAccess !== "string") return false;

  // Read permission is enough to access a page (legacy and .read/.write/.mis tokens)
  const allowed = getReadablePageIds(rawAccess);
  if (allowed === "all") return true;

  return allowed.includes(pageId);
}

export function isAdminOrSuperAdmin(role, username) {
  const r = String(role || "").trim().toLowerCase();
  const u = String(username || "").trim().toLowerCase();
  if (ADMIN_ROLES.includes(r) || isAdministrator(r, u)) {
    return true;
  }
  return false;
}

export function isHOD(role) {
  return String(role || "").trim().toLowerCase() === "hod";
}

/**
 * Resolves the allowed departments for a user.
 * - Returns null if the user is an unrestricted Super Admin or Admin (meaning all departments are allowed).
 * - Otherwise, returns an array of allowed department names (e.g. ['Accounts', 'Finance']) for HOD / scoped roles.
 * @param {object} [user] - Optional user object with role, username, user_access, department
 * @returns {string[] | null} Array of department names, or null for unrestricted
 */
export function getUserAllowedDepartments(user) {
  const role = user?.role || localStorage.getItem("role") || localStorage.getItem("sp_simulated_role") || "";
  const username = user?.user_name || user?.name || localStorage.getItem("user-name") || "";

  // Administrators and Admins have system-wide data visibility across all departments
  if (isAdminOrSuperAdmin(role, username)) {
    return null;
  }

  const userAccess = user?.user_access || localStorage.getItem("user_access") || "";
  const department = user?.department || localStorage.getItem("department") || localStorage.getItem("sp_simulated_dept") || "";

  if (userAccess && userAccess.trim().toLowerCase() === "all") {
    return null;
  }

  const deptSource = (userAccess && userAccess.trim()) ? userAccess : department;
  if (!deptSource || !deptSource.trim()) {
    return [];
  }

  return deptSource
    .split(",")
    .map((d) => d.trim().replace(/^\(+|\)+$/g, "").trim())
    .filter(Boolean);
}

export const ALL_DIVISIONS = [
  "Nutech Composites",
  "NuTech Pipes",
  "Protech Max"
];

/**
 * Normalizes a division string for consistent matching
 */
export function normalizeDivisionName(div) {
  if (!div) return "";
  const s = String(div).trim().toLowerCase();
  if (s.includes("pipe")) return "NuTech Pipes";
  if (s.includes("composite")) return "Nutech Composites";
  if (s.includes("protech")) return "Protech Max";
  return String(div).trim();
}

/**
 * Resolves the allowed divisions for a user.
 * Returns null if user has universal access to ALL divisions.
 * Returns string[] of allowed division names if restricted (e.g. ['NuTech Pipes', 'Protech Max']).
 * @param {object} [user] - Optional user object with division, role, user_name
 * @returns {string[] | null}
 */
export function getUserAllowedDivisions(user) {
  const rawDivision =
    user?.division !== undefined
      ? user.division
      : (localStorage.getItem("division") || localStorage.getItem("sp_simulated_div") || "");

  if (!rawDivision || typeof rawDivision !== "string") {
    const role = user?.role || localStorage.getItem("role") || "";
    const username = user?.user_name || user?.name || localStorage.getItem("user-name") || "";
    if (isAdministrator(role, username)) {
      return null; // Unrestricted superadmin with no division restriction set
    }
    return null;
  }

  const trimmed = rawDivision.trim();
  if (!trimmed || trimmed.toLowerCase() === "all" || trimmed.toLowerCase() === "management") {
    return null;
  }

  const splitDivs = trimmed
    .split(",")
    .map((d) => normalizeDivisionName(d))
    .filter(Boolean);

  // If user has all 3 divisions selected, return all or null
  const uniqueNormalized = Array.from(new Set(splitDivs));
  if (uniqueNormalized.length >= ALL_DIVISIONS.length) {
    const allPresent = ALL_DIVISIONS.every((d) => uniqueNormalized.includes(d));
    if (allPresent) {
      return null; // Full unrestricted access to all 3 divisions
    }
  }

  return uniqueNormalized.length > 0 ? uniqueNormalized : null;
}

/**
 * Checks if a given division/firm is allowed according to allowedDivisions array.
 * @param {string} itemDivision - Division of the data record / item
 * @param {string[] | null} allowedDivisions - Output of getUserAllowedDivisions
 * @returns {boolean}
 */
export function isDivisionAllowed(itemDivision, allowedDivisions) {
  if (!allowedDivisions || !Array.isArray(allowedDivisions) || allowedDivisions.length === 0) {
    return true; // No restrictions
  }
  if (!itemDivision) {
    // If record has no division specified, don't block it
    return true;
  }

  const normItem = normalizeDivisionName(itemDivision);
  return allowedDivisions.includes(normItem);
}

