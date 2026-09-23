import React from 'react';
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
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth }}>
          <thead className="bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-200/80 dark:border-slate-800">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {isLoading ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-16 text-center text-xs font-semibold text-gray-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map(renderRow)
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-xs font-semibold text-gray-400 dark:text-slate-500">
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
          <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-xs font-semibold text-gray-400 dark:text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading records...</span>
          </div>
        ) : data.length > 0 ? (
          data.map(renderCard)
        ) : (
          <div className="px-4 py-12 text-center text-xs font-semibold text-gray-400 dark:text-slate-500">No records found</div>
        )}
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-slate-800 px-5 py-3 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
          <span>Rows per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {[10, 15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">
          {totalResults === 0 ? '0 results' : `${startIndex}–${endIndex} of ${totalResults}`}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 px-2">
            Page {totalResults === 0 ? 0 : currentPage} of {safeTotalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
            disabled={currentPage >= safeTotalPages}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
