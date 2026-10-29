import Skeleton from "./Skeleton";
import SkeletonAvatar from "./SkeletonAvatar";

/**
 * List skeleton for notifications, feeds, and activity items.
 */
export default function SkeletonList({
  items = 5,
  hasAvatar = true,
  className = "",
  ...props
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`divide-y divide-[#E3EAF8] dark:divide-[#1E2D52] rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      <span className="sr-only">Loading list...</span>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {hasAvatar && <SkeletonAvatar size="md" />}
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-1/3 rounded-md" srText="" />
              <Skeleton className="h-3 w-1/2 rounded-md" srText="" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" srText="" />
        </div>
      ))}
    </div>
  );
}
