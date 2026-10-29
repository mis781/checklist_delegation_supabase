import Skeleton from "./Skeleton";

/**
 * Data table skeleton matching the app's table primitive:
 * Sticky header with light blue tint, subtle row dividers, tabular rows, rounded-2xl container.
 */
export default function SkeletonTable({
  rows = 5,
  columns = 5,
  hasHeader = true,
  hasPagination = true,
  className = "",
  ...props
}) {
  const colCount = typeof columns === "number" ? columns : columns.length;

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`w-full overflow-hidden rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] shadow-sm ${className}`}
      {...props}
    >
      <span className="sr-only">Loading table data...</span>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {hasHeader && (
            <thead>
              <tr className="bg-[#F0F5FF] dark:bg-[#142142] border-b border-[#E3EAF8] dark:border-[#1E2D52]">
                {Array.from({ length: colCount }).map((_, i) => (
                  <th key={i} className="px-4 py-3.5">
                    <Skeleton className="h-4 w-3/4 rounded-md" srText="" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-[#E3EAF8] dark:divide-[#1E2D52]">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                {Array.from({ length: colCount }).map((_, cIdx) => (
                  <td key={cIdx} className="px-4 py-3.5">
                    <Skeleton
                      className="h-4 rounded-md"
                      style={{
                        width: cIdx === 0 ? "80%" : cIdx === colCount - 1 ? "45%" : "60%",
                      }}
                      srText=""
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3EAF8] dark:border-[#1E2D52] bg-slate-50/50 dark:bg-[#0A1226]/50">
          <Skeleton className="h-4 w-28 rounded-md" srText="" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl" srText="" />
            <Skeleton className="h-8 w-8 rounded-xl" srText="" />
            <Skeleton className="h-8 w-8 rounded-xl" srText="" />
          </div>
        </div>
      )}
    </div>
  );
}
