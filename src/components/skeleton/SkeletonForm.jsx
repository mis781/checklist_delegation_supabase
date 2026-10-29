import Skeleton from "./Skeleton";

/**
 * Form skeleton for modals and settings pages.
 * Inputs/buttons use rounded-xl.
 */
export default function SkeletonForm({
  fields = 4,
  columns = 2,
  className = "",
  ...props
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] p-6 shadow-sm space-y-6 ${className}`}
      {...props}
    >
      <span className="sr-only">Loading form...</span>
      <div className="pb-3 border-b border-[#E3EAF8] dark:border-[#1E2D52]">
        <Skeleton className="h-6 w-1/4 rounded-lg" srText="" />
        <Skeleton className="h-3.5 w-1/3 rounded-md mt-1.5" srText="" />
      </div>
      <div className={`grid grid-cols-1 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-5`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-md" srText="" />
            <Skeleton className="h-11 w-full rounded-xl" srText="" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Skeleton className="h-10 w-24 rounded-xl" srText="" />
        <Skeleton className="h-10 w-32 rounded-xl" srText="" />
      </div>
    </div>
  );
}
