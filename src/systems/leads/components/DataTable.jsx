import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Generic table shell used by Leads pages.
 * Renders a horizontally scrollable table on md+ screens and a stacked card list on
 * mobile, plus a shared pagination footer.
 */
export default function DataTable({
  headers,
  data,
  renderRow,
  renderCard,
  minWidth = '600px',
  currentPage,
  totalPages,
  itemsPerPage,
  totalResults,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false,
}) {
  const safeTotalPages = totalPages || 1;
  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalResults);

  return (
    <div className="flex flex-col w-full">
      {/* Desktop / tablet table view */}
      <div className="hidden md:block w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-250 dark:scrollbar-thumb-slate-700">
        <table className="w-full text-left" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 bg-blue-50/80 dark:bg-[#142142] border-b border-[#E3EAF8] dark:border-[#1E2D52] backdrop-blur-xs">
            <tr>
              {headers.map((header, index) => {
                const label = typeof header === 'object' && header !== null && 'label' in header ? header.label : header;
                const align = typeof header === 'object' && header !== null && header.align ? header.align : 'left';
                return (
                  <th
                    key={index}
                    className={`px-3.5 py-3 text-[11px] font-extrabold text-[#0B1B3F] dark:text-[#EAF0FF] uppercase tracking-wider whitespace-nowrap ${
                      align === 'center' ? 'text-center' : align === 'right' ? 'text-right tabular-nums' : 'text-left'
                    }`}
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3EAF8] dark:divide-[#1E2D52] bg-white dark:bg-[#0D1730]">
            {isLoading ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-16 text-center text-xs font-semibold text-gray-400 dark:text-[#6F82AC]">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, idx) => {
                const row = renderRow(item, idx);
                return row;
              })
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-xs font-semibold text-gray-400 dark:text-[#6F82AC]">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden p-3 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-xs font-semibold text-gray-400 dark:text-[#6F82AC]">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading records...</span>
          </div>
        ) : data.length > 0 ? (
          data.map(renderCard)
        ) : (
          <div className="px-4 py-12 text-center text-xs font-semibold text-gray-400 dark:text-[#6F82AC]">No records found</div>
        )}
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E3EAF8] dark:border-[#1E2D52] px-5 py-3 bg-white dark:bg-[#0D1730]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#4A5B80] dark:text-[#A9B8DB]">
          <span>Rows per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-[#E3EAF8] dark:border-[#1E2D52] bg-white dark:bg-[#142142] text-[#0B1B3F] dark:text-[#EAF0FF] rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {[10, 15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-[#4A5B80] dark:text-[#A9B8DB] tabular-nums">
          {totalResults === 0 ? '0 results' : `${startIndex}–${endIndex} of ${totalResults}`}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-xl border border-[#E3EAF8] dark:border-[#1E2D52] text-blue-600 dark:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-[#142142] transition shadow-2xs"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-[#0B1B3F] dark:text-[#EAF0FF] px-2 tabular-nums">
            Page {totalResults === 0 ? 0 : currentPage} of {safeTotalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
            disabled={currentPage >= safeTotalPages}
            className="p-1.5 rounded-xl border border-[#E3EAF8] dark:border-[#1E2D52] text-blue-600 dark:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-[#142142] transition shadow-2xs"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
