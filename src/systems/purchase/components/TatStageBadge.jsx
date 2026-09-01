import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertOctagon,
  MinusCircle,
} from "lucide-react";
import {
  TAT_STATUS,
  formatDurationMinutes,
  calculateOfficeHoursDuration,
} from "../services/purchaseTatEngine";

export default function TatStageBadge({
  tatStatus,
  status,
  remainingFormatted,
  overdueFormatted,
  actualFormatted,
  targetFormatted,
  isCompleted,
  indentId,
  onClick,
  size = "sm",
  className = "",
  showDetails = true,
}) {
  // Live ticker to update countdown timer in real-time
  const [, setTicker] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => (t + 1) % 100000);
    }, 2000); // Ticks every 2 seconds for live updates
    return () => clearInterval(timer);
  }, []);

  // Extract date objects if available
  const dueAt = tatStatus?.dueAt ? new Date(tatStatus.dueAt) : null;
  const startedAt = tatStatus?.startedAt ? new Date(tatStatus.startedAt) : null;
  const completedAt = tatStatus?.completedAt ? new Date(tatStatus.completedAt) : null;
  const isDone = tatStatus?.isCompleted ?? isCompleted ?? Boolean(completedAt);

  // Dynamic live countdown calculation
  let liveStatus = tatStatus?.status || status || (isDone ? TAT_STATUS.ON_TRACK : TAT_STATUS.ON_TRACK);
  let liveRemaining = tatStatus?.remainingFormatted || remainingFormatted || "";
  let liveOverdue = tatStatus?.overdueFormatted || overdueFormatted || "";

  if (dueAt && !isNaN(dueAt.getTime())) {
    const now = new Date();
    if (isDone && completedAt && !isNaN(completedAt.getTime())) {
      const isDelayed = completedAt.getTime() > dueAt.getTime();
      liveStatus = isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;
      if (isDelayed) {
        const overMins = calculateOfficeHoursDuration(dueAt, completedAt);
        liveOverdue = `${formatDurationMinutes(overMins)} overdue`;
      } else {
        liveRemaining = "Completed";
      }
    } else if (!isDone) {
      const isDelayed = now.getTime() > dueAt.getTime();
      liveStatus = isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;
      if (isDelayed) {
        const overMins = calculateOfficeHoursDuration(dueAt, now);
        liveOverdue = `${formatDurationMinutes(overMins)} overdue`;
        liveRemaining = "";
      } else {
        const remMins = calculateOfficeHoursDuration(now, dueAt);
        liveRemaining = `${formatDurationMinutes(remMins)} left`;
        liveOverdue = "";
      }
    }
  }

  // Map any status strictly to ON_TRACK or DELAY
  const isDelay =
    liveStatus === TAT_STATUS.DELAY ||
    liveStatus === "DELAY" ||
    liveStatus === "BREACHED" ||
    liveStatus === "DELAYED";

  const isNotStarted =
    !startedAt &&
    (liveStatus === TAT_STATUS.NOT_STARTED || liveStatus === "NOT_STARTED") &&
    !tatStatus?.isActive;

  // Custom click handler if passed (modal popup disabled)
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    }
    // Modal opening commented out as per requirement
    // if (indentId && openTatModal) {
    //   openTatModal(indentId);
    // }
  };

  const isClickable = Boolean(onClick);

  // Strictly only ON TRACK and DELAY styles
  let badgeConfig = {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    icon: <MinusCircle className="w-3 h-3 text-slate-400" />,
    label: "NOT STARTED",
    subtext: "",
  };

  if (isNotStarted) {
    badgeConfig = {
      bg: "bg-slate-100 dark:bg-slate-800/80",
      text: "text-slate-600 dark:text-slate-400",
      border: "border-slate-200 dark:border-slate-700",
      icon: <Clock className="w-3 h-3 text-slate-400 shrink-0" />,
      label: "NOT STARTED",
      subtext: "",
    };
  } else if (isDelay) {
    badgeConfig = {
      bg: "bg-rose-50 dark:bg-rose-950/60",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-800/80",
      icon: <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />,
      label: "DELAY",
      subtext: liveOverdue && liveOverdue !== "—"
        ? `(${liveOverdue.replace("Overdue by ", "").replace(" overdue", " overdue")})`
        : "",
    };
  } else {
    // ON TRACK
    const cleanSubtext = liveRemaining
      ? liveRemaining.replace(" remaining", " left")
      : "";
    badgeConfig = {
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800/60",
      icon: <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      label: "ON TRACK",
      subtext: cleanSubtext ? `(${cleanSubtext})` : "",
    };
  }

  const sizeClasses =
    size === "lg"
      ? "px-3 py-1.5 text-xs gap-2"
      : size === "md"
      ? "px-2.5 py-1 text-[11px] gap-1.5"
      : "px-2 py-0.5 text-[10px] gap-1";

  const Component = isClickable ? "button" : "div";

  return (
    <Component
      type={isClickable ? "button" : undefined}
      onClick={isClickable ? handleClick : undefined}
      className={`inline-flex items-center font-bold tracking-tight rounded-full border transition-all select-none ${badgeConfig.bg} ${badgeConfig.text} ${badgeConfig.border} ${sizeClasses} ${
        isClickable ? "cursor-pointer active:scale-95 shadow-2xs" : ""
      } ${className}`}
    >
      {badgeConfig.icon}
      <span className="font-extrabold uppercase">{badgeConfig.label}</span>
      {showDetails && badgeConfig.subtext && (
        <span className="font-medium opacity-90">{badgeConfig.subtext}</span>
      )}
    </Component>
  );
}
