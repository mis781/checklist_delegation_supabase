// ============================================================================
// DOCS & SUBSCRIPTIONS SYSTEM - DATABASE SERVICE LAYER
// Connected directly to live Supabase Postgres tables.
// Hardcoded mock values removed.
// ============================================================================

export * from "./docsSupabaseApi";
export {
  DOCS_DATA_CHANGED_EVENT,
  documentsApi,
  subscriptionsApi,
  loansApi,
  fetchDocsSidebarBadgeCounts,
  uploadDocFile,
} from "./docsSupabaseApi";
