import { useState } from "react";
import {
  MoreVertical,
  Reply,
  Forward,
  Star,
  CheckSquare,
  Trash2,
  Check,
  CheckCheck,
  FileText,
  FileArchive,
  Download,
  Play,
  SmilePlus,
  CornerUpLeft,
  ExternalLink,
  Phone,
  Copy,
  MessageCircleReply,
} from "lucide-react";
import { formatTime, QUICK_REACTIONS, handleDownload } from "../utils/chatUtils";

const FILE_ICON = {
  PDF: FileText,
  DOCX: FileText,
  ZIP: FileArchive,
};

function StatusTicks({ status }) {
  if (status === "SENT") return <Check size={14} className="text-white/70" />;
  if (status === "DELIVERED")
    return <CheckCheck size={14} className="text-white/70" />;
  if (status === "READ")
    return <CheckCheck size={14} className="text-sky-300" />;
  return null;
}

export default function MessageBubble({
  message,
  isOutbound,
  parentMessage,
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
  onReply,
  onForward,
  onStar,
  onDelete,
  onReact,
  onJumpToMessage,
  highlighted,
  onPreviewImage,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionDrawerOpen, setReactionDrawerOpen] = useState(false);

  const bubbleAlign = isOutbound ? "items-end" : "items-start";
  const bubbleColor = isOutbound
    ? "bg-emerald-600 text-white"
    : "bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-100 dark:border-slate-700";

  const handleAction = (fn) => {
    setMenuOpen(false);
    fn && fn(message);
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={`group flex w-full gap-2 px-2 ${isOutbound ? "flex-row-reverse" : "flex-row"} ${
        highlighted ? "animate-pulse" : ""
      }`}
    >
      {isMultiSelectMode && (
        <button
          onClick={() => onToggleSelect(message.id)}
          className="flex-shrink-0 self-center"
        >
          <div
            className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-emerald-600 border-emerald-600"
                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            }`}
          >
            {isSelected && (
              <Check size={13} className="text-white" strokeWidth={3} />
            )}
          </div>
        </button>
      )}

      <div className={`flex max-w-[80%] md:max-w-[65%] flex-col ${bubbleAlign}`}>
        {!isOutbound && message.senderName && (
          <span className="mb-0.5 ml-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {message.senderName}
          </span>
        )}

        <div
          className={`relative rounded-2xl px-3 py-2 shadow-sm ${bubbleColor} ${
            isOutbound ? "rounded-tr-md" : "rounded-tl-md"
          } ${highlighted ? "ring-2 ring-amber-400" : ""}`}
        >
          {/* Hover contextual actions menu */}
          <div
            className={`absolute top-1 ${isOutbound ? "-left-[72px]" : "-right-[72px]"} flex md:hidden md:group-hover:flex items-center gap-1.5`}
          >
            {/* Quick Reaction button */}
            <div className="relative">
              <button
                onClick={() => setReactionDrawerOpen((v) => !v)}
                className="h-7 w-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow flex items-center justify-center text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <SmilePlus size={13} />
              </button>
              {reactionDrawerOpen && (
                <div
                  className={`absolute z-30 bottom-full mb-1.5 flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 shadow-lg ${
                    isOutbound ? "left-0" : "right-0"
                  }`}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(message.id, emoji);
                        setReactionDrawerOpen(false);
                      }}
                      className="text-base hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Triple dot More Options button */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="h-7 w-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow flex items-center justify-center text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <div
                  className={`absolute z-20 bottom-full mb-1.5 w-40 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 ${
                    isOutbound ? "right-0" : "left-0"
                  }`}
                >
                  <MenuItem
                    icon={Reply}
                    label="Reply"
                    onClick={() => handleAction(onReply)}
                  />
                  <MenuItem
                    icon={Forward}
                    label="Forward"
                    onClick={() => handleAction(onForward)}
                  />
                  <MenuItem
                    icon={Star}
                    label="Star"
                    onClick={() => handleAction(onStar)}
                  />
                  <MenuItem
                    icon={CheckSquare}
                    label="Select"
                    onClick={() =>
                      handleAction(() => onToggleSelect(message.id, true))
                    }
                  />
                  <MenuItem
                    icon={Trash2}
                    label="Delete"
                    danger
                    onClick={() => handleAction(onDelete)}
                  />
                </div>
              )}
            </div>
          </div>

          {message.isForwarded && (
            <p className="mb-1 flex items-center gap-1 text-[11px] italic opacity-75">
              <Forward size={11} /> Forwarded
            </p>
          )}

          {parentMessage && (
            <button
              onClick={() => onJumpToMessage(parentMessage.id)}
              className={`mb-1.5 flex w-full flex-col rounded-lg border-l-4 px-2 py-1 text-left text-xs ${
                isOutbound
                  ? "border-white/50 bg-black/10"
                  : "border-emerald-500 bg-gray-50 dark:bg-slate-900/60"
              }`}
            >
              <span className="font-bold opacity-80">
                {parentMessage.direction === "OUTBOUND" ? "You" : "Customer"}
              </span>
              <span className="truncate opacity-70">{parentMessage.body}</span>
            </button>
          )}

          <MessageBody message={message} onPreviewImage={onPreviewImage} />

          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              isOutbound ? "text-white/70" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {isOutbound && <StatusTicks status={message.status} />}
          </div>

          {/* Reactions row */}
          {message.reactions && message.reactions.length > 0 && (
            <div
              className={`absolute -bottom-3 ${isOutbound ? "left-2" : "right-2"} flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 shadow-sm`}
            >
              {message.reactions.map((r) => (
                <span key={r.emoji} className="text-[11px] leading-none">
                  {r.emoji} {r.count > 1 ? r.count : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TEMPLATE_BUTTON_ICON = {
  URL: ExternalLink,
  PHONE_NUMBER: Phone,
  QUICK_REPLY: MessageCircleReply,
  COPY_CODE: Copy,
};

// Mirrors how Meta renders template BUTTONS — a divider-separated row
// beneath the body, matching the WhatsApp client's own template preview.
function TemplateButton({ button }) {
  const Icon = TEMPLATE_BUTTON_ICON[button.type] || ExternalLink;
  const content = (
    <span className="text-[14px] font-medium text-white/90 tracking-wide flex items-center justify-center gap-2">
      {button.text}
      <Icon size={14} stroke="currentColor" opacity="0.8" />
    </span>
  );

  const buttonClass = "w-full bg-black/5 hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center py-2.5 flex-1";

  if (button.type === "URL" && button.url) {
    return (
      <a href={button.url} target="_blank" rel="noreferrer" className={buttonClass}>
        {content}
      </a>
    );
  }
  if (button.type === "PHONE_NUMBER" && button.phone_number) {
    return (
      <a href={`tel:${button.phone_number}`} className={buttonClass}>
        {content}
      </a>
    );
  }
  return <div className={buttonClass}>{content}</div>;
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
        danger
          ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function MessageBody({ message, onPreviewImage }) {
  if (message.type === "IMAGE") {
    return (
      <div className="space-y-1">
        <div
          onClick={() => onPreviewImage?.(message.mediaUrl, message.body)}
          className="group/img relative aspect-video w-64 max-w-full cursor-pointer overflow-hidden rounded-lg"
        >
          <img
            src={message.mediaUrl}
            alt="attachment"
            className="h-full w-full object-cover transition-transform group-hover/img:scale-105"
          />
        </div>
        {message.body && <p className="text-sm leading-snug">{message.body}</p>}
      </div>
    );
  }

  if (message.type === "VIDEO") {
    return (
      <div className="space-y-1">
        <div className="relative aspect-video w-64 max-w-full overflow-hidden rounded-lg bg-black">
          <img
            src={message.mediaUrl}
            alt="video thumbnail"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
              <Play size={18} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {message.duration}
          </span>
        </div>
        {message.body && <p className="text-sm leading-snug">{message.body}</p>}
      </div>
    );
  }

  if (message.type === "DOCUMENT") {
    const Icon = FILE_ICON[message.fileType] || FileText;
    return (
      <div
        onClick={() => handleDownload(message.mediaUrl, message.body)}
        className="flex w-56 max-w-full cursor-pointer items-center gap-2.5 rounded-lg bg-black/5 dark:bg-white/5 p-2.5"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-500/90 text-white">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">{message.body}</p>
          <p className="text-[10px] opacity-70">
            {message.fileType} · {message.fileSize}
          </p>
        </div>
        <span className="flex-shrink-0 rounded-full p-1.5 hover:bg-black/10 dark:hover:bg-white/10">
          <Download size={14} />
        </span>
      </div>
    );
  }

  if (message.type === "TEMPLATE") {
    const header = message.templateHeader;
    return (
      <div className="space-y-1.5">
        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider opacity-75">
          <CornerUpLeft size={10} className="rotate-180" />
          Template Message
        </p>

        {header?.type === "IMAGE" && header.mediaUrl && (
          <div className="aspect-video w-64 max-w-full overflow-hidden rounded-lg">
            <img src={header.mediaUrl} alt="header" className="h-full w-full object-cover" />
          </div>
        )}

        {header?.type === "VIDEO" && header.mediaUrl && (
          <div className="relative aspect-video w-64 max-w-full overflow-hidden rounded-lg bg-black">
            <video src={header.mediaUrl} className="h-full w-full object-cover" controls />
          </div>
        )}

        {header?.type === "DOCUMENT" && header.mediaUrl && (
          <a
            href={header.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-56 max-w-full items-center gap-2.5 rounded-lg bg-black/5 dark:bg-white/5 p-2.5"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-500/90 text-white">
              <FileText size={18} />
            </div>
            <p className="min-w-0 flex-1 truncate text-xs font-bold">
              {header.fileName || "Document"}
            </p>
            <Download size={14} className="flex-shrink-0" />
          </a>
        )}

        {header?.type === "TEXT" && header.text && (
          <p className="text-sm font-black leading-snug">{header.text}</p>
        )}

        <p className="text-sm leading-snug whitespace-pre-wrap">
          {message.body}
        </p>

        {message.templateFooter && (
          <p className="text-xs opacity-60">{message.templateFooter}</p>
        )}

        {message.templateButtons && message.templateButtons.length > 0 && (
          <div className="-mx-3 -mb-2 mt-2 border-t border-white/10 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden rounded-b-[inherit]">
            {message.templateButtons.map((btn, idx) => (
              <TemplateButton key={idx} button={btn} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm leading-snug whitespace-pre-wrap">{message.body}</p>
  );
}
