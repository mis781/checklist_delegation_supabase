/**
 * Role & Permission Utilities for Nutech Master System
 * Supports standard roles and Super Admin roles (Admin, Superadmin, Administrator, Administtrator, etc.)
 */

export const ADMIN_ROLES = [
  "admin",
  "superadmin",
  "super admin",
  "administrator",
  "administtrator",
];

/**
 * Checks if the given role or username qualifies as an unrestricted Administrator / Superadmin.
 * @param {string} [role] - User's role from DB / localStorage / activeUser
 * @param {string} [username] - User's username / identifier
 * @returns {boolean} true if user has unrestricted full access
 */
export function isAdministrator(role, username) {
  const r = String(role || "").trim().toLowerCase();
  const u = String(username || "").trim().toLowerCase();

  // If role is explicitly any admin variant
  if (
    r === "admin" ||
    r === "superadmin" ||
    r === "super admin" ||
    r === "administrator" ||
    r === "administtrator"
  ) {
    return true;
  }

  // If username is an admin account
  if (
    u === "admin" ||
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
