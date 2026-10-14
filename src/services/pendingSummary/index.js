import { PENDING_SYSTEMS } from "./stageRegistry";
import { fetchChecklistPending } from "./checklistPending";
import { fetchInventoryPending } from "./inventoryPending";
import { fetchPurchasePending } from "./purchasePending";
import { fetchO2DPending } from "./o2dPending";
import { fetchPurchaseReturnPending, fetchDocsPending, fetchLeadsPending } from "./otherPending";
import { getStoredUserCtx } from "./helpers";

export { PENDING_SYSTEMS, countsFromItems } from "./stageRegistry";
export { formatAge } from "./helpers";

const FETCHERS = {
  checklist: (ctx) => fetchChecklistPending(ctx),
  inventory: () => fetchInventoryPending(),
  purchase: () => fetchPurchasePending(),
  purchaseReturn: () => fetchPurchaseReturnPending(),
  o2d: () => fetchO2DPending(),
  leads: (ctx) => fetchLeadsPending(ctx),
  docs: () => fetchDocsPending(),
};

function buildSystem(def, itemsByStage, error) {
  const stages = def.stages.map((stage, index) => {
    const items = itemsByStage?.[stage.key];
    const list = Array.isArray(items) ? items : [];
    const ages = list.map((i) => i.ageMins).filter((a) => a !== null);
    return {
      ...stage,
      order: index + 1,
      items: list,
      pending: list.length,
      overdue: list.filter((i) => i.isOverdue).length,
      oldestAgeMins: ages.length ? Math.max(...ages) : null,
      // null means this one stage failed to load (e.g. a single checklist sub-query)
      error: itemsByStage && items === null ? "Failed to load" : null,
    };
  });
  return {
    key: def.key,
    label: def.label,
    stages,
    total: stages.reduce((s, st) => s + st.pending, 0),
    overdue: stages.reduce((s, st) => s + st.overdue, 0),
    error: error ? error.message || String(error) : null,
  };
}

/**
 * Loads every system's pending items for the PC Dashboard.
 * scope "all" ignores the viewer's role/department so the coordinator sees everything.
 */
export async function fetchAllPendingSummary({ scope = "all" } = {}) {
  const ctx = { scope, ...getStoredUserCtx() };
  const results = await Promise.allSettled(PENDING_SYSTEMS.map((def) => FETCHERS[def.key](ctx)));
  return PENDING_SYSTEMS.map((def, i) => {
    const r = results[i];
    if (r.status === "fulfilled") return buildSystem(def, r.value, null);
    console.error(`PC Dashboard: failed to load ${def.label}:`, r.reason);
    return buildSystem(def, null, r.reason);
  });
}

/**
 * Loads a single system (used by the PC stage page so it doesn't fetch all systems).
 */
export async function fetchSystemPending(systemKey, { scope = "all" } = {}) {
  const def = PENDING_SYSTEMS.find((s) => s.key === systemKey);
  if (!def) return null;
  const ctx = { scope, ...getStoredUserCtx() };
  try {
    return buildSystem(def, await FETCHERS[def.key](ctx), null);
  } catch (err) {
    console.error(`PC Dashboard: failed to load ${def.label}:`, err);
    return buildSystem(def, null, err);
  }
}
