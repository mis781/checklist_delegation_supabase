import supabase from "../../SupabaseClient";
import { getPageAccessHolders } from "../../utils/pagePermissionUtils";

const EMPTY = Object.freeze({ mis: [], read: [], write: [] });

/**
 * Responsible (MIS), view-only (Read) and edit (Write) users per page,
 * from each user's users.page_access tokens.
 * @returns {Promise<Record<string, { mis: string[], read: string[], write: string[] }>>}
 */
export async function fetchStageAccess() {
  const { data, error } = await supabase.from("users").select("user_name, page_access, role, status");
  if (error) throw error;
  return getPageAccessHolders(data || []);
}

export const accessFor = (accessMap, pageId) => (accessMap && accessMap[pageId]) || EMPTY;
