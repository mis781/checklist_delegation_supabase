import Skeleton from "./Skeleton";

/**
 * Metric / stat tile skeleton mirroring system dashboard metric cards.
 */
export default function SkeletonStatTile({ className = "", ...props }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] p-5 shadow-sm flex items-center justify-between min-h-[108px] ${className}`}
      {...props}
    >
      <span className="sr-only">Loading metrics...</span>
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3.5 w-24 rounded-md" srText="" />
        <Skeleton className="h-8 w-28 rounded-lg" srText="" />
        <Skeleton className="h-3 w-16 rounded-md" srText="" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0 ml-4" srText="" />
    </div>
  );
}
