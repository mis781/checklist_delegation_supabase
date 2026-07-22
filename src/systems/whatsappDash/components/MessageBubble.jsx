import { useState, useRef } from "react";
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
  Pause,
  Maximize2,
  SmilePlus,
  CornerUpLeft,
  ExternalLink,
  Phone,
  Copy,
  MessageCircleReply,
  MapPin,
  Navigation,
  User,
  Save,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import {
  formatTime,
  QUICK_REACTIONS,
  handleDownload,
} from "../utils/chatUtils";

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
  onPreviewVideo,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionDrawerOpen, setReactionDrawerOpen] = useState(false);
  const [openDownward, setOpenDownward] = useState(false);
  const triggerRef = useRef(null);

  const handleMenuClick = () => {
    if (!menuOpen) {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // Drop downward if the button is within 250px of the top viewport edge (collides with sticky header)
        if (rect.top < 250) {
          setOpenDownward(true);
        } else {
          setOpenDownward(false);
        }
      }
    }
    setMenuOpen((v) => !v);
  };

  const longPressTimer = useRef(null);
  const isLongPressTriggered = useRef(false);
  const touchStartCoords = useRef({ x: 0, y: 0 });

  const startPress = (e) => {
    if (isMultiSelectMode) return;
    if (e.type === "mousedown" && e.button !== 0) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStartCoords.current = { x: clientX, y: clientY };
    isLongPressTriggered.current = false;

    longPressTimer.current = setTimeout(() => {
      onToggleSelect(message.id, true);
      isLongPressTriggered.current = true;
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const endPress = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isMultiSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect(message.id);
    } else if (isLongPressTriggered.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const movePress = (e) => {
    if (!longPressTimer.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const diffX = Math.abs(clientX - touchStartCoords.current.x);
    const diffY = Math.abs(clientY - touchStartCoords.current.y);

    if (diffX > 10 || diffY > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

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
      style={isSelected ? { backgroundColor: "rgba(0, 168, 132, 0.12)" } : undefined}
      className={`group flex w-full gap-2 px-2 py-1 transition-colors duration-200 ${isOutbound ? "flex-row-reverse" : "flex-row"} ${
        highlighted ? "animate-pulse" : ""
      }`}
    >
      {isMultiSelectMode && (
        <button
          onClick={() => onToggleSelect(message.id)}
          className="flex-shrink-0 self-center flex items-center justify-center h-12 w-12 cursor-pointer active:scale-90 transition-transform"
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

      <div className={`flex max-w-[80%] md:max-w-[65%] min-w-0 flex-col ${bubbleAlign}`}>
        {!isOutbound && message.senderName && (
          <span className="mb-0.5 ml-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {message.senderName}
          </span>
        )}

        <div
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onTouchMove={movePress}
          onClick={(e) => {
            if (isMultiSelectMode) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className={`relative rounded-2xl px-3 py-2 shadow-sm ${bubbleColor} ${
            isOutbound ? "rounded-tr-md" : "rounded-tl-md"
          } ${highlighted ? "ring-2 ring-amber-400" : ""} ${isMultiSelectMode ? "cursor-pointer select-none" : ""}`}
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
                ref={triggerRef}
                onClick={handleMenuClick}
                className="h-7 w-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow flex items-center justify-center text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <div
                  className={`absolute z-20 w-40 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 ${
                    openDownward ? "top-full mt-1.5" : "bottom-full mb-1.5"
                  } ${isOutbound ? "right-0" : "left-0"}`}
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
              className={`mb-1.5 flex w-full min-w-0 flex-col overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-left text-xs transition-colors ${
                isOutbound
                  ? "bg-black/15 hover:bg-black/25 text-white"
                  : "bg-gray-100/80 hover:bg-gray-200/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 text-gray-800 dark:text-slate-200"
              } ${
                parentMessage.direction === "OUTBOUND"
                  ? "border-emerald-500 dark:border-emerald-400"
                  : "border-sky-500 dark:border-sky-400"
              }`}
            >
              <span
                className={`font-black text-[11px] mb-0.5 ${
                  parentMessage.direction === "OUTBOUND"
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-sky-500 dark:text-sky-400"
                }`}
              >
                {parentMessage.direction === "OUTBOUND" ? "You" : "Customer"}
              </span>
              <span className="line-clamp-2 w-full block text-xs whitespace-pre-wrap break-words opacity-80">
                {parentMessage.body}
              </span>
            </button>
          )}

          <MessageBody message={message} onPreviewImage={onPreviewImage} onPreviewVideo={onPreviewVideo} />

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
              className="absolute -bottom-3 right-2 flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 shadow-sm z-10"
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

  const buttonClass =
    "w-full bg-black/5 hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center py-2.5 flex-1";

  if (button.type === "URL" && button.url) {
    return (
      <a
        href={button.url}
        target="_blank"
        rel="noreferrer"
        className={buttonClass}
      >
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

// ---------------------------------------------------------------------------
// VideoMessage — inline playback with play-overlay, fullscreen, and download
// ---------------------------------------------------------------------------
function VideoMessage({ message, onPreviewVideo }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = (e) => {
    e.stopPropagation();
    setPlaying(true);
    videoRef.current?.play().catch(() => {});
  };

  const handleVideoClick = (e) => {
    // If already playing, toggle pause on click (native UX)
    if (playing) return;
    handlePlay(e);
  };

  return (
    <div className="space-y-1">
      <div
        className="group/vid relative aspect-video w-64 max-w-full overflow-hidden rounded-lg bg-black cursor-pointer"
        onClick={handleVideoClick}
      >
        {/* Actual video element — preload=metadata gives a first-frame thumbnail */}
        <video
          ref={videoRef}
          src={message.mediaUrl}
          preload="metadata"
          controls={playing}
          playsInline
          className="h-full w-full object-cover"
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />

        {/* Play overlay — fades out once playing */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
            <div
              onClick={handlePlay}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            >
              <Play size={20} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}

        {/* Top-right controls — fullscreen + download (visible on hover) */}
        <div
          className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 group-hover/vid:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onPreviewVideo?.(message.mediaUrl, message.body || "Video")}
            title="Fullscreen"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={() => handleDownload(message.mediaUrl, message.body || "whatsapp-video.mp4")}
            title="Download"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <Download size={13} />
          </button>
        </div>
      </div>
      {message.body && <p className="text-sm leading-snug">{message.body}</p>}
    </div>
  );
}

function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const onTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime || 0);
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
  };

  const onAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const toggleSpeed = () => {
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatAudioTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 w-72 max-w-full text-current">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
      />

      <button
        onClick={togglePlay}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-current transition-colors cursor-pointer"
      >
        {isPlaying ? (
          <Pause size={16} className="fill-current" />
        ) : (
          <Play size={16} className="fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-current/20"
        />
        <div className="flex justify-between items-center mt-1 text-[10px] opacity-75">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>

      <button
        onClick={toggleSpeed}
        className="px-2 py-0.5 rounded-md text-[10px] font-black border border-current/30 hover:bg-white/15 transition-colors cursor-pointer select-none"
      >
        {playbackRate}x
      </button>
    </div>
  );
}

function LocationMessage({ message }) {
  const loc = message.metadata?.location || {};
  const { latitude, longitude, name, address } = loc;

  let googleMapsUrl = "";
  let parsedLat = latitude;
  let parsedLng = longitude;

  if (latitude != null && longitude != null) {
    googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  } else if (message.body) {
    const match = message.body.match(/https:\/\/maps\.google\.com\S+/);
    if (match) {
      googleMapsUrl = match[0];
      const qMatch = googleMapsUrl.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) {
        parsedLat = parseFloat(qMatch[1]);
        parsedLng = parseFloat(qMatch[2]);
      }
    }
  }

  return (
    <div className="w-64 max-w-full space-y-2.5">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-emerald-50 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 flex items-center justify-center">
        <MapPin className="text-emerald-600 dark:text-emerald-400 h-10 w-10 animate-bounce" />
        {parsedLat != null && parsedLng != null && (
          <span className="absolute bottom-1 right-2 text-[9px] font-mono opacity-70 bg-black/10 dark:bg-black/35 px-1.5 py-0.5 rounded text-current">
            {parsedLat?.toFixed(4)}, {parsedLng?.toFixed(4)}
          </span>
        )}
      </div>

      <div className="space-y-1 text-left text-current">
        {name && <h4 className="text-sm font-extrabold leading-tight">{name}</h4>}
        {address && <p className="text-xs leading-snug opacity-85">{address}</p>}
        {!name && !address && parsedLat != null && (
          <p className="text-xs italic opacity-75 font-mono">
            Lat: {parsedLat}, Lng: {parsedLng}
          </p>
        )}
      </div>

      {googleMapsUrl ? (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-bold rounded-lg border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
        >
          <Navigation size={13} className="rotate-45" /> Open in Google Maps ↗
        </a>
      ) : null}
    </div>
  );
}

function ContactMessage({ message }) {
  const contacts = message.metadata?.contacts || [];
  let name = "Unknown Contact";
  let phone = "";
  let org = "";

  if (contacts.length > 0) {
    const contact = contacts[0];
    name = contact.name?.formatted_name || 
      [contact.name?.first_name, contact.name?.last_name].filter(Boolean).join(" ") || 
      "Unknown Contact";
    phone = contact.phones?.[0]?.phone || contact.phones?.[0]?.wa_id || "";
    org = contact.org?.company || "";
  } else if (message.body) {
    const match = message.body.match(/Contact Card:\s*(.+?)(?:\s*\(([^)]+)\))?$/);
    if (match) {
      name = match[1] || "Contact Card";
      phone = match[2] || "";
    } else {
      name = message.body;
    }
  }

  const handleCopyNumber = (e) => {
    e.stopPropagation();
    if (phone) {
      navigator.clipboard.writeText(phone);
    }
  };

  return (
    <div className="w-64 max-w-full border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900/40 overflow-hidden shadow-sm text-gray-800 dark:text-slate-200">
      <div className="p-3.5 flex items-center gap-3 border-b border-gray-200 dark:border-slate-700/50">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <h4 className="text-sm font-black truncate">{name}</h4>
          {org && <p className="text-[11px] opacity-75 truncate">{org}</p>}
          {phone && <p className="text-[11px] opacity-60 truncate font-mono">{phone}</p>}
        </div>
      </div>

      <div className="flex divide-x divide-gray-200 dark:divide-slate-700/50">
        <button
          onClick={handleCopyNumber}
          disabled={!phone}
          className="flex-1 py-2 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Copy size={13} className="text-emerald-500" /> Copy Number
        </button>
      </div>
    </div>
  );
}

function StickerMessage({ message }) {
  if (message.mediaUrl) {
    return (
      <div className="w-36 h-36 max-w-full p-1 flex items-center justify-center">
        <img
          src={message.mediaUrl}
          alt="Sticker"
          className="max-h-full max-w-full object-contain hover:scale-105 transition-transform"
        />
      </div>
    );
  }
  return <p className="text-sm font-medium italic opacity-80">[Sticker]</p>;
}

function UnsupportedMessage({ message }) {
  return (
    <div className="w-64 max-w-full rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-3 text-left space-y-1.5">
      <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-tight">
            {message.body || "⚠️ Received unsupported format"}
          </p>
          <p className="text-[11px] mt-1 text-amber-700/80 dark:text-amber-400/80 leading-normal">
            Ask customer to send details as plain text or standard photo.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBody({ message, onPreviewImage, onPreviewVideo }) {
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
    return <VideoMessage message={message} onPreviewVideo={onPreviewVideo} />;
  }

  if (message.type === "AUDIO") {
    if (message.mediaUrl) {
      return (
        <div className="py-1">
          <audio controls src={message.mediaUrl} className="w-64 max-w-full rounded-lg" />
        </div>
      );
    }
    return <AudioPlayer src={message.mediaUrl} />;
  }

  if (message.type === "LOCATION") {
    return <LocationMessage message={message} />;
  }

  if (message.type === "CONTACT") {
    return <ContactMessage message={message} />;
  }

  if (message.type === "STICKER") {
    return <StickerMessage message={message} />;
  }

  if (message.type === "UNSUPPORTED") {
    return <UnsupportedMessage message={message} />;
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
        <div className="min-w-0 flex-1 text-left">
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
      <div className="space-y-1.5 text-left">
        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider opacity-75">
          <CornerUpLeft size={10} className="rotate-180" />
          Template Message
        </p>

        {header?.type === "IMAGE" && header.mediaUrl && (
          <div className="aspect-video w-64 max-w-full overflow-hidden rounded-lg">
            <img
              src={header.mediaUrl}
              alt="header"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {header?.type === "VIDEO" && header.mediaUrl && (
          <div className="relative aspect-video w-64 max-w-full overflow-hidden rounded-lg bg-black">
            <video
              src={header.mediaUrl}
              className="h-full w-full object-cover"
              controls
            />
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
            <p className="min-w-0 flex-1 truncate text-xs font-bold text-left">
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
    <p className="text-sm leading-snug whitespace-pre-wrap">
      {message.body || "⚠️ Unsupported message format (or content empty)"}
    </p>
  );
}
