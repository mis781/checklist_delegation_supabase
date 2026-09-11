import { Loader2 } from "lucide-react";

export default function CircularProcessingLoader({
  message = "Loading & processing records...",
  subMessage = "Syncing live workflow data",
  py = "py-16",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${py} gap-3 text-slate-500 dark:text-slate-400`}
    >
      <div className="relative flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-blue-600 dark:text-blue-400" />
        <div className="absolute inset-0 rounded-full blur-xs bg-blue-500/20 animate-pulse" />
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {message}
        </p>
        {subMessage && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
}
