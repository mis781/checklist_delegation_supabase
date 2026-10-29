import Skeleton from "./Skeleton";

/**
 * Chart skeleton matching dashboard and analytics graphs.
 */
export default function SkeletonChart({
  height = "320px",
  hasHeader = true,
  className = "",
  ...props
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] p-5 shadow-sm flex flex-col justify-between ${className}`}
      style={{ minHeight: height }}
      {...props}
    >
      <span className="sr-only">Loading chart...</span>
      {hasHeader && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E3EAF8]/60 dark:border-[#1E2D52]/60">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40 rounded-lg" srText="" />
            <Skeleton className="h-3.5 w-24 rounded-md" srText="" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" srText="" />
        </div>
      )}
      {/* Visual bars placeholder */}
      <div className="flex-1 flex items-end gap-3 pt-6 px-2 pb-2">
        {[40, 75, 55, 90, 60, 80, 45, 95, 70, 85, 50, 65].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <Skeleton
              className="w-full rounded-t-lg"
              style={{ height: `${h}%` }}
              srText=""
            />
            <Skeleton className="h-2.5 w-full max-w-[24px] rounded-sm" srText="" />
          </div>
        ))}
      </div>
    </div>
  );
}
