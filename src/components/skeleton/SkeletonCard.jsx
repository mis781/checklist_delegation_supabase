import Skeleton from "./Skeleton";
import SkeletonText from "./SkeletonText";

/**
 * Standard card skeleton with rounded-2xl border.
 */
export default function SkeletonCard({
  className = "",
  hasHeader = true,
  lines = 3,
  children,
  ...props
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] p-5 shadow-sm space-y-4 ${className}`}
      {...props}
    >
      <span className="sr-only">Loading card...</span>
      {children ? (
        children
      ) : (
        <>
          {hasHeader && (
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAF8] dark:border-[#1E2D52]">
              <Skeleton className="h-5 w-1/3 rounded-lg" srText="" />
              <Skeleton className="h-4 w-16 rounded-md" srText="" />
            </div>
          )}
          <SkeletonText lines={lines} />
        </>
      )}
    </div>
  );
}
