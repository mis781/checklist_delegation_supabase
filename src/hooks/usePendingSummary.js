import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { fetchAllPendingSummary } from "../services/pendingSummary";
import { fetchStageAccess } from "../services/pendingSummary/stageAccess";
import { getUserAllowedDivisions, isDivisionAllowed } from "../utils/roleUtils";

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

  // Precompute totals and per-stage counts for each system, respecting division permissions
  const systemCounts = useMemo(() => {
    const map = {};
    systems.forEach((s) => {
      const stages = {};
      let systemTotal = 0;
      let systemDelayed = 0;

      (s.stages || []).forEach((st) => {
        let count = st.pending || 0;
        let delayed = st.overdue || 0;

        if (allowedDivisions && allowedDivisions.length > 0 && Array.isArray(st.items)) {
          const filtered = st.items.filter((i) => isDivisionAllowed(i.division, allowedDivisions));
          count = filtered.length;
          delayed = filtered.filter((i) => i.isOverdue).length;
        }

        stages[st.key] = count;
        systemTotal += count;
        systemDelayed += delayed;
      });

      map[s.key] = {
        total: systemTotal,
        delayed: systemDelayed,
        stages,
        error: s.error,
      };
    });
    return map;
  }, [systems, allowedDivisions]);

  return {
    ...query,
    systems,
    access,
    systemCounts,
    data: systems,
  };
}
