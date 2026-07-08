export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDayLabel(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function parseTemplateBody(bodyText, variables) {
  let output = bodyText;
  variables.forEach((val, idx) => {
    const token = `{{${idx + 1}}}`;
    output = output.split(token).join(val && val.trim() ? val : token);
  });
  return output;
}

export function extractTemplateVariables(bodyText) {
  const matches = bodyText.match(/{{\d+}}/g) || [];
  const unique = [...new Set(matches)];
  return unique.sort(
    (a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")),
  );
}

export function isMetaSessionActive(expiresAtIso, nowIso = new Date().toISOString()) {
  if (!expiresAtIso) return false;
  return new Date(expiresAtIso).getTime() > new Date(nowIso).getTime();
}

export function lastMessagePreview(message) {
  if (!message) return "";
  switch (message.type) {
    case "IMAGE":
      return "📷 Photo";
    case "VIDEO":
      return "🎥 Video";
    case "DOCUMENT":
      return `📄 ${message.body}`;
    case "TEMPLATE":
      return message.body;
    default:
      return message.body;
  }
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// ---------------------------------------------------------------------------
// DB <-> UI shape mapping (public.vw_whatsapp_chat_inbox / whatsapp_messages)
// ---------------------------------------------------------------------------

const AVATAR_PALETTE = [
  "from-blue-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-slate-500 to-slate-700",
];

export function avatarColorForId(id) {
  if (!id) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// Forces a real download of a Supabase Storage / Meta media link.
// The `download` attribute on an <a> is silently ignored by browsers for
// cross-origin URLs (which is what every media_url here is, relative to the
// app's own origin) — it just opens the file in a new tab instead. Fetching
// the file as a blob and downloading that same-origin object URL sidesteps
// this and forces an actual save-to-disk.
export async function handleDownload(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error("Download failed, falling back to opening the file:", err);
    window.open(url, "_blank");
  }
}

export function fileTypeFromMime(mimeType) {
  if (!mimeType) return "FILE";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("document")) return "DOCX";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "ZIP";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLSX";
  return "FILE";
}

export function mapDbMessageType(dbType, mimeType) {
  switch (dbType) {
    case "template":
      return "TEMPLATE";
    case "media": {
      if (mimeType?.startsWith("image/")) return "IMAGE";
      if (mimeType?.startsWith("video/")) return "VIDEO";
      return "DOCUMENT";
    }
    case "text_reply":
    case "button_reply":
    case "text":
    default:
      return "TEXT";
  }
}

export function mapDbStatus(dbStatus) {
  if (!dbStatus) return "SENT";
  const upper = dbStatus.toUpperCase();
  return ["SENT", "DELIVERED", "READ"].includes(upper) ? upper : null; // 'failed' -> no ticks
}

export function mapDbMessageToUi(m) {
  const type = mapDbMessageType(m.message_type, m.mime_type);
  return {
    id: m.id,
    direction: m.direction,
    timestamp: m.created_at,
    type,
    body: m.body,
    mediaUrl: m.media_url,
    fileType: type === "DOCUMENT" ? fileTypeFromMime(m.mime_type) : undefined,
    status: m.direction === "OUTBOUND" ? mapDbStatus(m.latest_status) : undefined,
    reactions: [], // no reactions table yet — reaction UI is local-only for now
    replyToMessageId: m.parent_message_id || undefined,
    isForwarded: !!m.is_forwarded,
    templateId: m.template_id || undefined,
    // Snapshot written by whatsapp-send at send time for 'template' messages —
    // see whatsapp_messages.metadata comment in whatsapp_schema.sql.
    templateHeader: m.metadata?.header || undefined,
    templateFooter: m.metadata?.footer || undefined,
    templateButtons: m.metadata?.buttons || undefined,
  };
}

export function mapDbConversationToUi(row) {
  const customerName =
    row.display_name || row.external_contact_name || row.raw_phone_number || "Unknown Contact";

  const syntheticLastMessage = row.last_message_id
    ? {
      id: row.last_message_id,
      direction: row.last_message_direction,
      timestamp: row.last_message_at,
      type: mapDbMessageType(row.last_message_type, row.last_message_mime_type),
      body: row.last_message_text,
      isForwarded: row.last_message_is_forwarded,
    }
    : null;

  return {
    chatId: row.conversation_id,
    customerName,
    phoneNumber: row.raw_phone_number ? `+${row.raw_phone_number}` : row.phone_number,
    avatarColor: avatarColorForId(row.conversation_id),
    isGroup: false,
    tags: [],
    metaSessionExpiresAt: row.meta_session_expires_at,
    unreadCount: row.unread_count || 0,
    awaitingReply: row.last_message_direction === "INBOUND",
    messages: syntheticLastMessage ? [syntheticLastMessage] : [],
  };
}
