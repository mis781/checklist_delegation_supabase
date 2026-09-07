import {
  fmtDateTime,
  placeholderPreviewUrl,
  logisticsRequired
} from "../../data/dummyPurchaseReturns";
import { Check, X, Clock, Paperclip } from "lucide-react";

export default function WorkflowTimeline({ record }) {
  if (!record) return null;

  // Build step list dynamically based on record's lifecycle & approval actionType
  const steps = [];

  // 1. Initial Request
  steps.push({
    name: "Return Request Created",
    done: true,
    data: record.activity && record.activity[0]
  });

  // Rejection check
  if (record.rejected) {
    steps.push({
      name: "Purchase Return Rejected",
      done: true,
      rejected: true,
      data: record.activity.find((a) => a.action === "Purchase Return Rejected")
    });
    return renderTimeline(steps);
  }

  // 2. Approval
  steps.push({
    name: "Approved",
    done: Boolean(record.approval),
    data: record.activity.find((a) => a.action === "Purchase Return Approved")
  });

  if (!record.approval) {
    return renderTimeline(steps);
  }

  // Action Type Branching
  if (record.approval.actionType === "No Return No Debit Note") {
    steps.push({
      name: "Closed - No Return, No Debit Note",
      done: true,
      data: record.activity.find(
        (a) => a.action === "Closed - No Return, No Debit Note"
      )
    });
    return renderTimeline(steps);
  }

  if (record.approval.actionType === "Replace") {
    if (logisticsRequired(record)) {
      steps.push({
        name: "Logistics Arranged",
        done: Boolean(record.logistics),
        data: record.activity?.find((a) => a.action === "Logistics Arranged")
      });
    }
    steps.push({
      name: "Material Returned / Replaced From Plant",
      done: Boolean(record.dispatch),
      data: record.activity?.find((a) => a.action === "Material Returned From Plant")
    });
    steps.push({
      name: "Completed",
      done: Boolean(record.dispatch),
      data: null
    });
    return renderTimeline(steps);
  }

  // Regular flows (Credit Note required)
  steps.push({
    name: "Ask Party For Credit Note",
    done: Boolean(record.creditNote),
    data: record.activity?.find((a) => a.action === "Party Asked For Credit Note")
  });

  if (logisticsRequired(record)) {
    steps.push({
      name: "Logistics Arranged",
      done: Boolean(record.logistics),
      data: record.activity?.find((a) => a.action === "Logistics Arranged")
    });
  }

  steps.push({
    name: "Debit Note Issued & Inform",
    done: Boolean(record.debitNote),
    data: record.activity?.find(
      (a) => a.action === "Debit Note Issued & Supplier Informed"
    )
  });

  if (record.approval.actionType === "Return Material and Debit Note") {
    steps.push({
      name: "Material Returned From Plant",
      done: Boolean(record.dispatch),
      data: record.activity?.find((a) => a.action === "Material Returned From Plant")
    });
    steps.push({
      name: "Completed",
      done: Boolean(record.dispatch),
      data: null
    });
  } else {
    // Make Debit Note (direct)
    steps.push({
      name: "Completed",
      done: Boolean(record.debitNote),
      data: null
    });
  }

  return renderTimeline(steps);
}

function renderTimeline(steps) {
  let firstPendingEncountered = false;

  return (
    <ul className="relative space-y-6 before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {steps.map((s, idx) => {
        let isDone = s.done;
        let isCurrent = false;
        let isRejected = s.rejected;

        if (isDone) {
          // step finished
        } else if (!firstPendingEncountered) {
          isCurrent = true;
          firstPendingEncountered = true;
        }

        return (
          <li key={idx} className="relative flex items-start gap-3.5 text-xs">
            {/* Step Icon */}
            <div
              className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-white font-bold text-xs shadow-sm flex-shrink-0 ${
                isRejected
                  ? "bg-rose-600 ring-4 ring-rose-100 dark:ring-rose-950"
                  : isDone
                  ? "bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950"
                  : isCurrent
                  ? "bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-950 animate-pulse"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500 ring-4 ring-white dark:ring-slate-900"
              }`}
            >
              {isRejected ? (
                <X className="w-3.5 h-3.5" />
              ) : isDone ? (
                <Check className="w-3.5 h-3.5" />
              ) : isCurrent ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>

            {/* Step Description */}
            <div className="flex-1 pt-0.5 space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {s.name}
                </span>
                {s.data && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {fmtDateTime(s.data.datetime)}
                  </span>
                )}
              </div>

              {s.data ? (
                <>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    By <strong className="text-slate-700 dark:text-slate-300">{s.data.by}</strong>
                  </div>
                  {s.data.remarks && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{s.data.remarks}"
                    </div>
                  )}
                  {s.data.attachment && (
                    <a
                      href={placeholderPreviewUrl(s.data.attachment)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span>{s.data.attachment}</span>
                    </a>
                  )}
                </>
              ) : isCurrent ? (
                <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  Awaiting operational action
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">Upcoming stage</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
