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
  if (rawAccess.trim() === "all") return true;

  const allowed = rawAccess.split(",").map((p) => p.trim()).filter(Boolean);
  if (allowed.includes("all")) return true;

  return allowed.includes(pageId);
}

/**
 * Resolves the allowed departments for a user.
 * - Returns null if the user is an unrestricted Super Admin or user_access is 'all' (meaning all departments are allowed).
 * - Otherwise, returns an array of allowed department names (e.g. ['Accounts', 'Finance']).
 * @param {object} [user] - Optional user object with role, username, user_access, department
 * @returns {string[] | null} Array of department names, or null for unrestricted
 */
export function getUserAllowedDepartments(user) {
  const role = user?.role || localStorage.getItem("role") || localStorage.getItem("sp_simulated_role") || "";
  const username = user?.user_name || user?.name || localStorage.getItem("user-name") || "";

  if (isAdministrator(role, username)) {
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

