import supabase from "../../../SupabaseClient";

// ---------------------------------------------------------------------------
// Edge Function invocation helper
// ---------------------------------------------------------------------------

// supabase-js throws a generic FunctionsHttpError ("Edge Function returned a
// non-2xx status code") on 4xx/5xx responses, discarding the JSON body the
// function actually sent back. The real reason lives on `error.context`,
// the raw Response — read it so callers/toasts show the actual cause.
async function throwFunctionError(error) {
  let message = error.message;
  const response = error.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.clone().json();
      if (body?.error) message = body.error;
    } catch {
      // Body wasn't JSON — fall back to the generic message.
    }
  }
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchInboxConversations() {
  const { data, error } = await supabase
    .from("vw_whatsapp_chat_inbox")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const messages = data || [];
  const statuses = await fetchLatestStatuses(messages.map((m) => m.id));
  return messages.map((m) => ({ ...m, latest_status: statuses[m.id] || null }));
}

async function fetchLatestStatuses(messageIds) {
  if (!messageIds.length) return {};

  const { data, error } = await supabase
    .from("whatsapp_message_status_history")
    .select("message_id, status, changed_at")
    .in("message_id", messageIds)
    .order("changed_at", { ascending: true });

  if (error) throw error;

  const latest = {};
  (data || []).forEach((row) => {
    latest[row.message_id] = row.status; // later rows overwrite — ascending order
  });
  return latest;
}

export async function fetchApprovedTemplates() {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Reads — Users (for new-chat contact picker)
// ---------------------------------------------------------------------------

/**
 * Fetch users from public.users for the new-chat contact picker.
 * When `query` is provided, filters server-side with ILIKE on user_name and
 * number so only matching rows are returned — no full-table JS filter needed.
 * Returns an array of { id, user_name, number }.
 */
export async function fetchUsers(query = "") {
  console.log("[fetchUsers] called with query:", JSON.stringify(query));

  // `number` is BIGINT — only filter out NULLs; empty-string check is invalid for BIGINT.
  let req = supabase
    .from("users")
    .select("id, user_name, number")
    .not("number", "is", null)
    .order("user_name", { ascending: true })
    .limit(50);

  if (query && query.trim()) {
    const q = query.trim();
    const isNumeric = /^\d+$/.test(q);

    if (isNumeric) {
      // BIGINT column — use exact equality for numeric queries.
      // Also allow user_name ILIKE for names that happen to be all digits.
      console.log("[fetchUsers] numeric query — using eq on number OR ilike on user_name:", q);
      req = req.or(`user_name.ilike.%${q}%,number.eq.${q}`);
    } else {
      // Text query — ILIKE only on user_name (BIGINT columns don't support ILIKE).
      console.log("[fetchUsers] text query — applying ILIKE on user_name:", q);
      req = req.ilike("user_name", `%${q}%`);
    }
  } else {
    console.log("[fetchUsers] no query — fetching all users with a phone number");
  }

  const { data, error, status, statusText } = await req;

  console.log("[fetchUsers] Supabase response →", {
    status,
    statusText,
    rowCount: data?.length ?? null,
    error,
    firstRow: data?.[0] ?? null,
  });

  if (error) {
    console.error("[fetchUsers] ERROR from Supabase:", error);
    throw error;
  }

  const rows = data || [];
  console.log("[fetchUsers] returning", rows.length, "row(s)");
  return rows;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

// Shared by the media-message composer and the template header-media picker
// (IMAGE/VIDEO/DOCUMENT headers need a real public URL to hand to Meta).
export async function uploadWhatsappMedia(file, keyPrefix = "whatsapp") {
  const timestamp = Date.now();
  const fileName = `${keyPrefix}_${timestamp}_${file.name.replace(/\s+/g, "_")}`;

  const { error: uploadError } = await supabase.storage.from("whatsapp").upload(fileName, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from("whatsapp").getPublicUrl(fileName);
  return publicUrl;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function markConversationRead(conversationId) {
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);

  if (error) throw error;
}

export async function softDeleteMessages(messageIds) {
  const { error } = await supabase
    .from("whatsapp_messages")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", messageIds);

  if (error) throw error;
}

export async function syncTemplatesFromMeta() {
  const { data, error } = await supabase.functions.invoke("whatsapp-fetch-templates", {
    body: {},
  });
  if (error) await throwFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data; // { fetched, saved }
}

export async function sendTextMessage({ conversationId, text, replyToMessageId }) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { conversationId, type: "text", text, replyToMessageId },
  });
  if (error) await throwFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data.message;
}

export async function sendMediaMessage({ conversationId, mediaUrl, mimeType, fileName }) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { conversationId, type: "media", mediaUrl, mimeType, fileName },
  });
  if (error) await throwFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data.message;
}


export async function sendTemplateMessage({
  conversationId,
  templateElementName,
  templateLanguage,
  variables,
  headerMediaUrl,
  headerFileName,
}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      conversationId,
      type: "template",
      templateElementName,
      templateLanguage,
      variables,
      headerMediaUrl,
      headerFileName,
    },
  });
  if (error) await throwFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data.message;
}

/**
 * Initiate a first-contact outbound message to a brand-new (or existing)
 * WhatsApp contact using an approved template.
 *
 * The edge function calls fn_get_or_create_conversation() server-side so
 * this is safe to call even if the contact has never messaged before —
 * no duplicate conversations will be created.
 *
 * Returns { message, conversationId } on success so the caller can
 * immediately navigate to the new or existing thread.
 */
export async function initiateNewChat({
  phoneNumber,
  displayName,
  templateElementName,
  templateLanguage,
  variables = [],
  headerMediaUrl,
  headerFileName,
}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      phoneNumber,
      displayName,
      type: "template",
      templateElementName,
      templateLanguage,
      variables,
      headerMediaUrl,
      headerFileName,
    },
  });
  if (error) await throwFunctionError(error);
  if (data?.error) throw new Error(data.error);
  // Edge function now returns { success, message, conversationId }
  return { message: data.message, conversationId: data.conversationId };
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

export function subscribeToConversations(onChange) {
  const channel = supabase
    .channel("whatsapp-conversations-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "whatsapp_conversations" },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToMessages(conversationId, onEvent) {
  const channel = supabase
    .channel(`whatsapp-messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "whatsapp_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      onEvent,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToStatusHistory(onInsert) {
  // whatsapp_message_status_history has no conversation_id column to filter
  // on directly, so we listen globally and let the caller check whether the
  // affected message_id belongs to the conversation currently open.
  const channel = supabase
    .channel("whatsapp-status-history-feed")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "whatsapp_message_status_history" },
      onInsert,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
