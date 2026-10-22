import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { fetchAllPendingSummary } from "../services/pendingSummary";
import { fetchStageAccess } from "../services/pendingSummary/stageAccess";
import { getUserAllowedDivisions, isDivisionAllowed, isAdminOrSuperAdmin, isAdministrator } from "../utils/roleUtils";

export const PENDING_SUMMARY_QUERY_KEY = ["pending-summary"];

async function fetchPendingSummaryData() {
  const [systems, access] = await Promise.all([
    fetchAllPendingSummary({ scope: "all" }),
    fetchStageAccess().catch((err) => {
      console.error("Error loading stage access:", err);
      return {};
    }),
  ]);
  return { systems: Array.isArray(systems) ? systems : [], access: access || {} };
}

export function usePendingSummary() {
  const queryClient = useQueryClient();
  const allowedDivisions = useMemo(() => getUserAllowedDivisions(), []);

  const query = useQuery({
    queryKey: PENDING_SUMMARY_QUERY_KEY,
    queryFn: fetchPendingSummaryData,
    staleTime: 90 * 1000, // 90 seconds
    refetchInterval: 2 * 60 * 1000, // 2 minutes background refetch
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    let timeoutId = null;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: PENDING_SUMMARY_QUERY_KEY });
      }, 300);
    };

    const events = [
      "purchase-updated",
      "purchase-return-updated",
      "leads-updated",
      "purchase-payment-count-updated",
    ];

    events.forEach((e) => window.addEventListener(e, handleUpdate));
    return () => {
      clearTimeout(timeoutId);
      events.forEach((e) => window.removeEventListener(e, handleUpdate));
    };
  }, [queryClient]);

  const systems = query.data?.systems || [];
  const access = query.data?.access || {};

  // Precompute totals and per-stage counts for each system, respecting division permissions and user scoping
  const systemCounts = useMemo(() => {
    const rawUsername = localStorage.getItem("user-name") || "";
    const rawRole = localStorage.getItem("role") || "user";
    const currentUsername = rawUsername.trim().toLowerCase();
    const currentUserRole = rawRole.trim().toLowerCase();
    const isSuperAdmin = isAdministrator(currentUserRole, currentUsername);
    const isFullAdmin = isAdminOrSuperAdmin(currentUserRole, currentUsername);
    const isHOD = currentUserRole === "hod";

    const clean = (str) => String(str || "").replace(/\s+/g, "").toLowerCase();
    const targetUsername = clean(currentUsername);

    const parsePerson = (item) => {
      const rawVal =
        item?.person ||
        item?.raw?.name ||
        item?.raw?.user_name ||
        item?.raw?.doer ||
        item?.raw?.assigned_person ||
        item?.raw?.doer_name ||
        "";
      if (!rawVal) return "";
      if (typeof rawVal === "object") {
        return clean(rawVal.name || rawVal.user_name || rawVal.given_by || "");
      }
      if (typeof rawVal === "string" && rawVal.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(rawVal);
          return clean(parsed.name || parsed.user_name || parsed.given_by || rawVal);
        } catch {
          return clean(rawVal);
        }
      }
      return clean(rawVal);
    };

    const map = {};
    systems.forEach((s) => {
      const stages = {};
      let systemTotal = 0;
      let systemDelayed = 0;

      (s.stages || []).forEach((st) => {
        let items = Array.isArray(st.items) ? st.items : [];

        // 1. Division filtering (if restricted to specific divisions)
        if (allowedDivisions && allowedDivisions.length > 0 && items.length > 0) {
          items = items.filter((i) => isDivisionAllowed(i.division, allowedDivisions));
        }

        // 2. Personal Task scoping for Checklist & Delegation
        // When a standard user / HOD is logged in, their Checklist & Delegation badges must strictly
        // reflect tasks assigned to them, rather than the entire company backlog.
        // Only SuperAdmin retains the full, company-wide count across all tasks.
        if (s.key === "checklist") {
          if (st.key === "task" || st.key === "delegation") {
            if (!isSuperAdmin) {
              if (targetUsername) {
                items = items.filter((i) => parsePerson(i) === targetUsername);
              } else {
                items = [];
              }
            }
          } else if (st.key === "approval") {
            // Standard users do not have approval workflows
            if (!isFullAdmin && !isHOD) {
              items = [];
            }
          }
        }

        const count = items.length;
        const delayed = items.filter((i) => i.isOverdue).length;

        stages[st.key] = count;
        systemTotal += count;
        systemDelayed += delayed;
      });

      // For Checklist & Delegation, top-level total reflects actionable items for the user's role
      if (s.key === "checklist") {
        if (!isSuperAdmin && !isHOD) {
          systemTotal = (stages.task || 0) + (stages.delegation || 0);
        } else {
          systemTotal = (stages.task || 0) + (stages.delegation || 0) + (stages.approval || 0);
        }
      }

      map[s.key] = {
        total: systemTotal,
        delayed: systemDelayed,
        stages,
        error: s.error,
      };
    });
    return map;
  }, [systems, allowedDivisions, query.data]);

  return {
    ...query,
    systems,
    access,
    systemCounts,
    data: systems,
  };
}
