import { Layers, X, ArrowRight } from "lucide-react";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";

export default function BulkActionBar({ moduleKey, onTriggerBulkAction }) {
  const { selection, clearSelection } = usePurchaseReturn();

  if (selection.moduleKey !== moduleKey || selection.ids.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs font-medium animate-in slide-in-from-top-2 duration-150">
      <div className="flex items-center gap-2">
        <span className="p-1 bg-blue-600 text-white rounded-md">
          <Layers className="w-3.5 h-3.5" />
        </span>
        <span>
          <strong className="font-bold">{selection.ids.length}</strong> record
          {selection.ids.length > 1 ? "s" : ""} selected &middot; Bill No:{" "}
          <strong className="font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {selection.billNumber || "-"}
          </strong>{" "}
          <span className="text-blue-700/70 dark:text-blue-300/70 text-[11px]">
            (same vendor group)
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={clearSelection}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-white dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>

        <button
          type="button"
          onClick={() => onTriggerBulkAction(selection.ids)}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <span>Bulk Action for Selected</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
