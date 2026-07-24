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
// Reads/writes — Bulk contacts (CSV-imported address book for bulk sends)
// ---------------------------------------------------------------------------

/**
 * Fetch persisted bulk-import contacts for the New Chat "Bulk Import" tab.
 * Returns an array of { id, raw_phone_number, phone_number, display_name,
 * batch_label, created_at }.
 */
export async function fetchBulkContacts(query = "") {
  let req = supabase
    .from("whatsapp_bulk_contacts")
    .select("id, raw_phone_number, phone_number, display_name, batch_label, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (query && query.trim()) {
    const q = query.trim();
    req = req.or(`display_name.ilike.%${q}%,raw_phone_number.ilike.%${q}%`);
  }

  const { data, error } = await req;
  if (error) throw error;
  return data || [];
}

/**
 * Upsert CSV-imported rows into whatsapp_bulk_contacts. Conflicts on the
 * normalized phone_number (set by a DB trigger) so re-importing the same
 * numbers in a different format updates the existing row instead of
 * duplicating it. Returns the upserted rows.
 */
export async function upsertBulkContacts(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("whatsapp_bulk_contacts")
    .upsert(rows, { onConflict: "phone_number" })
    .select("id, raw_phone_number, phone_number, display_name, batch_label, created_at");
  if (error) throw error;
  return data || [];
}

export async function deleteBulkContacts(ids) {
  if (!ids.length) return;
  const { error } = await supabase
    .from("whatsapp_bulk_contacts")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}

export async function updateBulkContact(id, updates) {
  const { data, error } = await supabase
    .from("whatsapp_bulk_contacts")
    .update(updates)
    .eq("id", id)
    .select("id, raw_phone_number, phone_number, display_name, batch_label, created_at")
    .single();
  if (error) throw error;
  return data;
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

/**
 * Send an interactive poll (list message) to a conversation.
 * The poll is stored as message_type='poll' with metadata.poll_data containing
 * the question, options (with zeroed vote counts), and allow_multiple flag.
 */
export async function sendPollMessage({
  conversationId,
  pollQuestion,
  pollOptions,
  allowMultipleAnswers = false,
}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      conversationId,
      type: "poll",
      pollQuestion,
      pollOptions,
      allowMultipleAnswers,
    },
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
// Reads/Writes — Contacts & Forwarding
// ---------------------------------------------------------------------------

export async function fetchContacts() {
  const { data, error } = await supabase
    .from("whatsapp_contacts_metadata")
    .select("id, phone_number, raw_phone_number, display_name, created_at, meta_session_expires_at")
    .is("deleted_at", null)
    .order("display_name", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function sendMessageToContact(contactId, messagePayload) {
  // 1. Resolve conversationId for this contact
  const { data: convData, error: convError } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("whatsapp_contact_id", contactId)
    .maybeSingle();

  if (convError) throw convError;

  let conversationId;
  if (convData) {
    conversationId = convData.id;
  } else {
    const { data: contactData, error: contactError } = await supabase
      .from("whatsapp_contacts_metadata")
      .select("raw_phone_number, display_name")
      .eq("id", contactId)
      .single();
    if (contactError) throw contactError;

    const { data: newConvId, error: rpcError } = await supabase.rpc(
      "fn_get_or_create_conversation",
      {
        p_raw_phone: contactData.raw_phone_number,
        p_display_name: contactData.display_name,
      }
    );
    if (rpcError) throw rpcError;
    conversationId = newConvId;
  }

  // 2. Determine type and content from messagePayload
  const isMedia = messagePayload.message_type === "media" || messagePayload.message_type === "audio";
  let sentMessage;

  if (isMedia) {
    sentMessage = await sendMediaMessage({
      conversationId,
      mediaUrl: messagePayload.media_url,
      mimeType: messagePayload.mime_type,
      fileName: messagePayload.metadata?.fileName || messagePayload.body || "file",
    });
  } else {
    sentMessage = await sendTextMessage({
      conversationId,
      text: messagePayload.body,
    });
  }

  // 3. Mark the message as forwarded in the database
  if (sentMessage && sentMessage.id) {
    const { error: updateError } = await supabase
      .from("whatsapp_messages")
      .update({ is_forwarded: true })
      .eq("id", sentMessage.id);
    if (updateError) {
      console.error("Failed to mark message as forwarded in DB:", updateError);
    }
  }

  return sentMessage;
}

export async function executeForwarding(selectedContactIds, selectedMessageIds) {
  if (!selectedContactIds.length || !selectedMessageIds.length) {
    return { successCount: 0, failedContacts: [] };
  }

  // 1. Fetch full payload details of the selected messages, chronologically ordered
  const { data: messages, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .in("id", selectedMessageIds)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!messages || !messages.length) {
    return { successCount: 0, failedContacts: [] };
  }

  const failedContacts = [];
  let successCount = 0;

  // Fetch all contact details so we can report failed contacts with name/number
  const { data: contactDetails, error: contactErr } = await supabase
    .from("whatsapp_contacts_metadata")
    .select("id, display_name, phone_number, raw_phone_number")
    .in("id", selectedContactIds);
  
  if (contactErr) throw contactErr;

  const contactsMap = {};
  (contactDetails || []).forEach((c) => {
    contactsMap[c.id] = c;
  });

  // 2. Map over selectedContactIds and send messages sequentially
  for (const contactId of selectedContactIds) {
    const contact = contactsMap[contactId] || { id: contactId, display_name: "Unknown", phone_number: "" };
    let contactFailed = false;

    for (const msg of messages) {
      try {
        await sendMessageToContact(contactId, msg);
        // Add a small delay to make sure they do not overlap in delivery
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`Failed to send message to contact ${contactId}:`, err);
        contactFailed = true;
        break; // skip remaining messages for this contact since session is likely inactive
      }
    }

    if (contactFailed) {
      failedContacts.push({
        id: contact.id,
        displayName: contact.display_name || contact.raw_phone_number || "Unknown Contact",
        phoneNumber: contact.raw_phone_number ? `+${contact.raw_phone_number}` : contact.phone_number,
      });
    } else {
      successCount++;
    }
  }

  return { successCount, failedContacts };
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

export function subscribeToContacts(onChange) {
  const channel = supabase
    .channel("whatsapp-contacts-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "whatsapp_contacts_metadata" },
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
