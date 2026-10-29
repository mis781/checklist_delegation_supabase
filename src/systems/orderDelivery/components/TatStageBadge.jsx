import { useState, useEffect } from "react";
import { Clock, AlertOctagon, CheckCircle2, MinusCircle } from "lucide-react";
import {
  TAT_STATUS,
  formatDurationMinutes,
} from "../services/o2dTatEngine";

export default function TatStageBadge({
  tatStatus,
  status,
  remainingFormatted,
  overdueFormatted,
  isCompleted,
  completedAt: completedAtProp,
  dueAt: dueAtProp,
  startedAt: startedAtProp,
  onClick,
  size = "sm",
  className = "",
  showDetails = true,
}) {
  const dueAt = dueAtProp
    ? new Date(dueAtProp)
    : tatStatus?.dueAt
    ? new Date(tatStatus.dueAt)
    : null;
  const startedAt = tatStatus?.startedAt
    ? new Date(tatStatus.startedAt)
    : startedAtProp
    ? new Date(startedAtProp)
    : null;
  const completedAt = tatStatus?.completedAt
    ? new Date(tatStatus.completedAt)
    : completedAtProp
    ? new Date(completedAtProp)
    : null;
  const isDone =
    isCompleted !== undefined ? isCompleted : (tatStatus?.isCompleted ?? Boolean(completedAt));

  // Live ticker to refresh countdown every 30s
  const [, setTicker] = useState(0);
  const dueAtTime = dueAt?.getTime() || null;

  useEffect(() => {
    if (isDone || !dueAtTime) return;
    const timer = setInterval(() => {
      setTicker((t) => (t + 1) % 100000);
    }, 30000);
    return () => clearInterval(timer);
  }, [isDone, dueAtTime]);

  let liveStatus = tatStatus?.status || status || (isDone ? TAT_STATUS.ON_TRACK : TAT_STATUS.ON_TRACK);
  let liveRemaining = tatStatus?.remainingFormatted || remainingFormatted || (isDone ? "Completed" : "");
  let liveOverdue = tatStatus?.overdueFormatted || overdueFormatted || "";

  if (dueAt && !isNaN(dueAt.getTime())) {
    const now = new Date();
    if (isDone) {
      if (completedAt && !isNaN(completedAt.getTime())) {
        const isDelayed = completedAt.getTime() > dueAt.getTime();
        liveStatus = isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;
        if (isDelayed) {
          const overMins = Math.floor((completedAt.getTime() - dueAt.getTime()) / (60 * 1000));
          liveOverdue = `${formatDurationMinutes(overMins)} overdue`;
          liveRemaining = "";
        } else {
          liveRemaining = "Completed";
          liveOverdue = "";
        }
      } else {
        liveRemaining = "Completed";
      }
    } else {
      const isDelayed = now.getTime() > dueAt.getTime();
      liveStatus = isDelayed ? TAT_STATUS.DELAY : TAT_STATUS.ON_TRACK;
      if (isDelayed) {
        const overMins = Math.floor((now.getTime() - dueAt.getTime()) / (60 * 1000));
        liveOverdue = `${formatDurationMinutes(overMins)} overdue`;
        liveRemaining = "";
      } else {
        const remMins = Math.floor((dueAt.getTime() - now.getTime()) / (60 * 1000));
        liveRemaining = `${formatDurationMinutes(remMins)} left`;
        liveOverdue = "";
      }
    }
  }

  const isDelay = liveStatus === TAT_STATUS.DELAY || liveStatus === "DELAY";
  const isNotStarted =
    !startedAt &&
    !dueAt &&
    (liveStatus === TAT_STATUS.NOT_STARTED || liveStatus === "NOT_STARTED");

  const badgeSizeClass =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5"
      : size === "md"
      ? "text-xs px-2.5 py-1"
      : "text-[11px] px-2 py-0.5";

  const iconSize = size === "xs" ? 11 : size === "md" ? 14 : 12;

  if (isNotStarted) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border bg-slate-50 dark:bg-[#142142] text-slate-400 dark:text-[#6F82AC] border-slate-200 dark:border-[#1E2D52] ${badgeSizeClass} ${className}`}
      >
        <MinusCircle size={iconSize} />
        <span>Pending Start</span>
      </span>
    );
  }

  if (isDone) {
    if (isDelay) {
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-full border bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 shadow-xs ${badgeSizeClass} ${className}`}
          title={`Completed with delay. ${liveOverdue}`}
        >
          <AlertOctagon size={iconSize} className="text-rose-600 dark:text-rose-400" />
          <span>Completed</span>
          {showDetails && liveOverdue && (
            <span className="text-[10px] text-rose-500 font-normal">({liveOverdue})</span>
          )}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 shadow-xs ${badgeSizeClass} ${className}`}
        title="Completed within target SLA"
      >
        <CheckCircle2 size={iconSize} className="text-emerald-600 dark:text-emerald-400" />
        <span>Completed</span>
      </span>
    );
  }

  if (isDelay) {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center gap-1 font-bold rounded-full border bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 shadow-xs animate-pulse ${badgeSizeClass} ${className}`}
        title={`Delayed past target SLA: ${dueAt ? dueAt.toLocaleString() : ""}`}
      >
        <AlertOctagon size={iconSize} className="text-red-600 dark:text-red-400" />
        <span>Delay</span>
        {showDetails && liveOverdue && (
          <span className="font-semibold text-red-600 dark:text-red-400">({liveOverdue})</span>
        )}
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 shadow-xs ${badgeSizeClass} ${className}`}
      title={`On Track. Due: ${dueAt ? dueAt.toLocaleString() : ""}`}
    >
      <Clock size={iconSize} className="text-emerald-600 dark:text-emerald-400" />
      <span>On Track</span>
      {showDetails && liveRemaining && (
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">({liveRemaining})</span>
      )}
    </span>
  );
}
