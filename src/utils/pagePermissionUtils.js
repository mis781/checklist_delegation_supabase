/**
 * Granular Page Permission engine (Read / Write / MIS).
 *
 * Single source of truth for parsing, serializing and querying `users.page_access`.
 *
 * Storage format (comma separated):
 *   - New tokens:    `${pageId}.read`, `${pageId}.write`, `${pageId}.mis`
 *   - Legacy tokens: `${pageId}` (no suffix) = full access (read + write),
 *     so existing users keep working until an admin re-saves them
 *   - `all`:         unrestricted access to every page
 *
 * MIS = the user is responsible for that page's pending tasks (shown as "Responsible"
 * on the PC Dashboard). It only applies to pages with a pending section and is never
 * granted implicitly (not by Write, legacy tokens or `all`).
 *
 * Administrators / superadmins (isAdministrator) bypass all restrictions.
 */
import { useEffect, useMemo, useState } from "react";
import { isAdministrator, normalizeDivisionName } from "./roleUtils";

export const PERMISSIONS = {
  READ: "read",
  WRITE: "write",
  MIS: "mis",
};

const SUFFIXES = Object.values(PERMISSIONS);

// Fired whenever the logged-in user's page_access in localStorage changes
export const PAGE_ACCESS_CHANGED_EVENT = "page-access-changed";

const NO_ACCESS = Object.freeze({ read: false, write: false, mis: false });
const FULL_ACCESS = Object.freeze({ read: true, write: true, mis: false });

/**
 * Parses a raw page_access string.
 * @returns {{ all: boolean, map: Record<string, {read: boolean, write: boolean, mis: boolean}> }}
 */
export function parsePageAccess(rawPageAccess) {
  const raw = typeof rawPageAccess === "string" ? rawPageAccess.trim() : "";
  const map = {};
  if (!raw) return { all: false, map };

  const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.includes("all")) return { all: true, map };

  tokens.forEach((token) => {
    const dot = token.lastIndexOf(".");
    const suffix = dot > 0 ? token.slice(dot + 1).toLowerCase() : "";
    if (dot > 0 && SUFFIXES.includes(suffix)) {
      const pageId = token.slice(0, dot);
      const entry = map[pageId] || { read: false, write: false, mis: false };
      entry[suffix] = true;
      map[pageId] = entry;
    } else {
      // Legacy token without a permission suffix = full access (MIS is never implicit)
      map[token] = { ...FULL_ACCESS, mis: !!map[token]?.mis };
    }
  });

  // Write and MIS both imply Read (a page you act on / are responsible for is a page you can see)
  Object.values(map).forEach((entry) => {
    if (entry.write || entry.mis) entry.read = true;
  });

  return { all: false, map };
}

/**
 * Serializes a permission map back to the page_access string (new token format).
 * Pages without Read are dropped.
 */
export function serializePageAccess(map) {
  const tokens = [];
  Object.entries(map || {}).forEach(([pageId, entry]) => {
    if (!entry || !(entry.read || entry.write || entry.mis)) return;
    tokens.push(`${pageId}.read`);
    if (entry.write) tokens.push(`${pageId}.write`);
    if (entry.mis) tokens.push(`${pageId}.mis`);
  });
  return tokens.join(",");
}

/**
 * Plain list of page IDs the user can at least read: the shape every existing
 * `allowedPages.includes(pageId)` check expects. Returns "all" for unrestricted access.
 */
export function getReadablePageIds(rawPageAccess) {
  const { all, map } = parsePageAccess(rawPageAccess);
  if (all) return "all";
  return Object.keys(map).filter((id) => map[id].read);
}

/**
 * Applies the admin-UI cascade rules to one page's permissions.
 *  - Write on  -> Read + Write (MIS unchanged: responsibility is assigned explicitly)
 *  - Write off -> Read stays (downgrade to read-only), MIS unchanged
 *  - Read off  -> everything off (no access)
 *  - MIS on    -> also needs Read
 */
export function applyPermissionChange(entry, permission, checked) {
  const current = { ...NO_ACCESS, ...(entry || {}) };
  if (permission === PERMISSIONS.WRITE) {
    return checked ? { ...current, read: true, write: true } : { ...current, write: false };
  }
  if (permission === PERMISSIONS.READ) {
    return checked ? { ...current, read: true } : { ...NO_ACCESS };
  }
  if (permission === PERMISSIONS.MIS) {
    return checked ? { ...current, read: true, mis: true } : { ...current, mis: false };
  }
  return current;
}

/** Human label for a page's access (MIS responsibility is shown separately) */
export function getAccessLevel(entry) {
  if (!entry || !entry.read) return "No Access";
  if (entry.write) return "Full Access";
  return "Read Only";
}

/**
 * Who holds which permission on each page, for the PC Dashboard.
 * Administrators and `all` users have access everywhere and are not listed per page.
 * @param {Array<{user_name: string, page_access: string, role?: string, status?: string, division?: string}>} users
 * @returns {Record<string, { mis: string[], read: string[], write: string[], misByDivision: Record<string, string[]>, globalMis: string[] }>}
 *   read = view-only users (Read without Write), write = users with Write, mis = responsible users
 */
export function getPageAccessHolders(users = []) {
  const holders = {};
  users.forEach((u) => {
    if (String(u.status || "active").toLowerCase() === "inactive") return;
    if (isAdministrator(u.role, u.user_name)) return;
    const { all, map } = parsePageAccess(u.page_access || "");
    if (all) return;

    // Parse user's assigned divisions
    const rawDiv = typeof u.division === "string" ? u.division.trim() : "";
    let userDivisions = [];
    let isGlobalDivision = false;

    if (!rawDiv || rawDiv.toLowerCase() === "all" || rawDiv.toLowerCase() === "management") {
      isGlobalDivision = true;
    } else {
      userDivisions = Array.from(
        new Set(
          rawDiv
            .split(",")
            .map((d) => normalizeDivisionName(d))
            .filter(Boolean)
        )
      );
      if (userDivisions.length === 0) {
        isGlobalDivision = true;
      }
    }

    Object.entries(map).forEach(([pageId, entry]) => {
      const h = (holders[pageId] ||= {
        mis: [],
        read: [],
        write: [],
        misByDivision: {},
        globalMis: [],
      });
      if (entry.mis) {
        if (!h.mis.includes(u.user_name)) {
          h.mis.push(u.user_name);
        }
        if (isGlobalDivision) {
          if (!h.globalMis.includes(u.user_name)) {
            h.globalMis.push(u.user_name);
          }
        } else {
          userDivisions.forEach((divName) => {
            h.misByDivision[divName] ||= [];
            if (!h.misByDivision[divName].includes(u.user_name)) {
              h.misByDivision[divName].push(u.user_name);
            }
          });
        }
      }
      if (entry.write) {
        if (!h.write.includes(u.user_name)) {
          h.write.push(u.user_name);
        }
      } else if (entry.read) {
        if (!h.read.includes(u.user_name)) {
          h.read.push(u.user_name);
        }
      }
    });
  });
  return holders;
}

/**
 * Permission state for one page.
 * @param {string} pageId
 * @param {{ role?: string, username?: string, pageAccess?: string }} [user] defaults to localStorage
 */
export function getPagePermissions(pageId, user = {}) {
  const role = user.role ?? (localStorage.getItem("role") || "");
  const username = user.username ?? (localStorage.getItem("user-name") || "");
  const pageAccess = user.pageAccess ?? (localStorage.getItem("page_access") || "");

  const { all, map } = parsePageAccess(pageAccess);
  const isSuperAdmin = isAdministrator(role, username) || all;
  const entry = isSuperAdmin ? FULL_ACCESS : map[pageId] || NO_ACCESS;

  return {
    canRead: entry.read,
    canWrite: entry.write,
    canMIS: entry.mis,
    isReadOnly: entry.read && !entry.write,
    isSuperAdmin,
  };
}

export function hasPagePermission(pageId, permission = PERMISSIONS.READ, user) {
  const p = getPagePermissions(pageId, user);
  if (permission === PERMISSIONS.WRITE) return p.canWrite;
  if (permission === PERMISSIONS.MIS) return p.canMIS;
  return p.canRead;
}

/** Writes the logged-in user's page_access and notifies mounted usePagePermission hooks */
export function setStoredPageAccess(value) {
  localStorage.setItem("page_access", value || "");
  window.dispatchEvent(new Event(PAGE_ACCESS_CHANGED_EVENT));
}

/**
 * React hook: permissions of the logged-in user for a page.
 * Re-evaluates when page_access changes (profile sync, settings save, other tabs).
 */
export function usePagePermission(pageId) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(PAGE_ACCESS_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(PAGE_ACCESS_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- version forces a re-read of localStorage
  return useMemo(() => getPagePermissions(pageId), [pageId, version]);
}

export const READ_ONLY_TOOLTIP = "Read-only access: action disabled";

/** Standard props for an action button in read-only mode */
export function getReadOnlyButtonProps(canWrite, options = {}) {
  return {
    disabled: !canWrite || !!options.disabled,
    title: !canWrite ? options.tooltip || READ_ONLY_TOOLTIP : options.title,
    className: !canWrite ? "opacity-50 cursor-not-allowed" : "",
  };
}
