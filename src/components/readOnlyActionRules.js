// Rules used by ReadOnlyGuard to decide which controls are data-changing actions

// Words that mark a control as a data-changing action
export const ACTION_RE =
  /\b(add|create|new|save|submit|approve|reject|delete|remove|edit|update|generate|regenerate|send|record|upload|import|process|confirm|mark|revise|post|transfer|renew|pay|issue|raise|book|dispatch|complete|allocate|schedule|verify|accept|restore|duplicate|clone|make|bulk action|initialize|resume|draft|delegate|extend|urgent|cancel)\b/i;
// Viewing / navigation words always stay usable, even when an action word also appears
export const ALLOW_RE =
  /\b(view|preview|export|download|print|pdf|filter|filters|search|refresh|reload|close|clear|back|columns|show|hide|expand|collapse|next|prev|previous|history|details|report|logout|sort)\b/i;
// Icon-only buttons (no text): lucide icon classes that mean an action
export const ACTION_ICON_RE = /lucide-(trash|trash-2|pencil|pen|square-pen|pen-square|edit|plus|circle-plus|plus-circle|save|send|upload|check-check|badge-check)\b/;

/** True when a control's label/title describes a data-changing action (viewing words win) */
export function isActionLabel(text) {
  if (!text) return false;
  // A bare "Cancel" closes a form/modal; "Cancel Order", "Cancel Selected" etc. are actions
  if (/^\s*cancel\s*$/i.test(text)) return false;
  if (ALLOW_RE.test(text)) return false;
  return ACTION_RE.test(text);
}
