import React, { useMemo } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  UserCheck,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  Building,
  Timer,
  ChevronRight,
} from "lucide-react";
import { TAT_STATUS, formatDurationMinutes } from "../services/purchaseTatEngine";
import { formatDateTime } from "../utils/dateUtils";

export default function TatTimelineModal({
  isOpen,
  onClose,
  timeline,
}) {
  if (!isOpen || !timeline) return null;

  const {
    indentNumber,
    itemName,
    poNumber,
    vendorName,
    stages = [],
    overallStatus,
    hasBreached,
    isFullyComplete,
    totalSlaFormatted,
    totalActualFormatted,
  } = timeline;

  const completedStagesCount = stages.filter((s) => s.isCompleted).length;
  const totalStagesCount = stages.length;
  const breachedStagesCount = stages.filter((s) => s.status === TAT_STATUS.BREACHED).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 1. Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-950/60">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-mono font-black text-xs">
                {indentNumber}
              </span>
              {poNumber && poNumber !== "-" && (
                <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 font-mono font-bold text-xs">
                  {poNumber}
                </span>
              )}
              {/* Overall SLA Badge */}
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 border ${
                  overallStatus === TAT_STATUS.BREACHED
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                    : overallStatus === TAT_STATUS.AT_RISK
                    ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 animate-pulse"
                    : isFullyComplete || overallStatus === TAT_STATUS.WITHIN_SLA
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                }`}
              >
                {overallStatus === TAT_STATUS.BREACHED ? (
                  <AlertOctagon className="w-3.5 h-3.5" />
                ) : overallStatus === TAT_STATUS.AT_RISK ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {overallStatus === TAT_STATUS.BREACHED
                    ? "SLA BREACHED"
                    : overallStatus === TAT_STATUS.AT_RISK
                    ? "SLA AT RISK"
                    : isFullyComplete
                    ? "COMPLETED WITHIN SLA"
                    : "RUNNING ON TRACK"}
                </span>
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{itemName}</span>
              {vendorName && vendorName !== "-" && (
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  • {vendorName}
                </span>
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Top Summary KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Target SLA
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
              {totalSlaFormatted || "—"}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Elapsed Time
            </span>
            <span className={`text-sm font-black mt-0.5 block ${
              hasBreached ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {totalActualFormatted || "—"}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Stages Progress
            </span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
              {completedStagesCount} / {totalStagesCount} Completed
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Breached Stages
            </span>
            <span className={`text-sm font-black mt-0.5 block ${
              breachedStagesCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {breachedStagesCount} {breachedStagesCount === 1 ? "Stage" : "Stages"}
            </span>
          </div>
        </div>

        {/* 3. Stepped Vertical Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 sm:ml-6 space-y-6">
            {stages.map((stage, idx) => {
              const isLast = idx === stages.length - 1;
              const isBreached = stage.status === TAT_STATUS.BREACHED;
              const isAtRisk = stage.status === TAT_STATUS.AT_RISK;
              const isWithinSla = stage.status === TAT_STATUS.WITHIN_SLA || (stage.isCompleted && !isBreached);
              const isActive = stage.isActive;
              const isPending = !stage.startedAt;

              // Step Circle Node
              let nodeColor = "bg-slate-200 border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700";
              let NodeIcon = Clock;

              if (isBreached) {
                nodeColor = "bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-500/30";
                NodeIcon = AlertOctagon;
              } else if (isAtRisk) {
                nodeColor = "bg-amber-500 border-amber-600 text-white animate-pulse shadow-md shadow-amber-500/30";
                NodeIcon = AlertTriangle;
              } else if (isWithinSla) {
                nodeColor = "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20";
                NodeIcon = CheckCircle2;
              } else if (isActive) {
                nodeColor = "bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-500/30 animate-pulse";
                NodeIcon = Timer;
              }

              return (
                <div key={stage.stageKey || idx} className="relative pl-6 sm:pl-8 group">
                  {/* Stepper Node */}
                  <div
                    className={`absolute -left-[17px] top-1.5 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${nodeColor}`}
                  >
                    <NodeIcon className="w-4 h-4" />
                  </div>

                  {/* Stage Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80 shadow-xs"
                        : isBreached
                        ? "bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                    }`}
                  >
                    {/* Top Row: Stage Name & Owner Badge & Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                            {stage.displayName || stage.stageName}
                          </h4>
                          {stage.ownerRole && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              {stage.ownerRole}
                            </span>
                          )}
                        </div>
                        {stage.details && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {stage.details}
                          </p>
                        )}
                      </div>

                      {/* SLA Status Pill */}
                      <div className="shrink-0">
                        {isPending ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold">
                            Not Started
                          </span>
                        ) : isBreached ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 text-[11px] font-extrabold flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                            <AlertOctagon className="w-3 h-3 text-rose-600" />
                            <span>BREACHED</span>
                          </span>
                        ) : isAtRisk ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[11px] font-extrabold flex items-center gap-1 border border-amber-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>AT RISK</span>
                          </span>
                        ) : isWithinSla ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[11px] font-extrabold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>WITHIN SLA</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 text-[11px] font-extrabold flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>ON TRACK</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics Grid for Stage */}
                    {stage.startedAt && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-medium">SLA Target</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                            {stage.targetDurationFormatted || "—"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium">
                            {stage.isCompleted ? "Actual Elapsed" : "Running Time"}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              isBreached
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {stage.actualDurationFormatted || "—"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium">Started At</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300">
                            {formatDateTime(stage.startedAt)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium">
                            {stage.isCompleted ? "Completed At" : "SLA Deadline"}
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              isBreached && !stage.isCompleted
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {formatDateTime(stage.completedAt || stage.dueAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Overdue Alert banner if breached */}
                    {isBreached && stage.overdueFormatted && stage.overdueFormatted !== "—" && (
                      <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Turnaround Target Exceeded</span>
                        </span>
                        <span className="font-mono">{stage.overdueFormatted}</span>
                      </div>
                    )}

                    {/* Live Remaining banner if active */}
                    {isActive && stage.remainingFormatted && (
                      <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Active Stage SLA Window</span>
                        </span>
                        <span className="font-mono">{stage.remainingFormatted}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Footer Bar */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            TAT Metrics computed deterministically based on Master SLA Rules.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
