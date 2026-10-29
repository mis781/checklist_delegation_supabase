import Skeleton from "./Skeleton";

/**
 * Full application shell skeleton:
 * Deep navy sidebar, header bar, and layout-matched content placeholder.
 */
export default function SkeletonShell({ className = "", children }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`flex h-screen overflow-hidden bg-[#F5F8FF] dark:bg-[#070D1F] ${className}`}
    >
      <span className="sr-only">Loading application...</span>

      {/* Sidebar Skeleton (Deep Navy in both themes) */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-[#1E2D52] bg-[#0B1B3F] dark:bg-[#070D1F] p-3 space-y-4">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-2 py-2 border-b border-[#1E2D52] pb-3">
          <Skeleton className="h-8 w-8 rounded-full" srText="" />
          <Skeleton className="h-5 w-28 rounded-md" srText="" />
        </div>
        {/* Nav items */}
        <div className="space-y-2 flex-1 pt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <Skeleton className="h-4 w-4 rounded-md" srText="" />
              <Skeleton className="h-3.5 flex-1 rounded-md" srText="" />
            </div>
          ))}
        </div>
        {/* User footer */}
        <div className="border-t border-[#1E2D52] pt-3 flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-full" srText="" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-20 rounded-md" srText="" />
            <Skeleton className="h-2.5 w-24 rounded-md" srText="" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <header className="h-16 border-b border-[#E3EAF8] dark:border-[#1E2D52] bg-white/95 dark:bg-[#0D1730]/95 px-6 flex items-center justify-between">
          <Skeleton className="h-6 w-36 rounded-lg" srText="" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" srText="" />
            <Skeleton className="h-9 w-9 rounded-full" srText="" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {children || (
            <>
              {/* Metric tiles row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] p-4 flex items-center justify-between shadow-sm"
                  >
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-20 rounded-md" srText="" />
                      <Skeleton className="h-6 w-16 rounded-md" srText="" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-xl ml-4" srText="" />
                  </div>
                ))}
              </div>
              {/* Content table/card */}
              <div className="rounded-2xl border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#0D1730] p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-[#E3EAF8] dark:border-[#1E2D52]">
                  <Skeleton className="h-5 w-32 rounded-lg" srText="" />
                  <Skeleton className="h-9 w-28 rounded-xl" srText="" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 items-center py-2.5">
                    <Skeleton className="h-4 flex-1 rounded-md" srText="" />
                    <Skeleton className="h-4 w-24 rounded-md" srText="" />
                    <Skeleton className="h-4 w-16 rounded-md" srText="" />
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
