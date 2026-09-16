import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DragScrollTable from "./DragScrollTable";
import ColumnToggleDropdown from "./ColumnToggleDropdown";

/**
 * DataTable Component
 * Standardized table with Desktop Table View, Column Toggling, and Mobile Card View.
 * Includes integrated pagination footer.
 */
const DataTable = ({
  headers = [],
  data = [],
  renderRow,
  renderCard,
  minWidth = "1000px",
  tableKey,
  showColumnToggle = true,
  toolbarExtra,
  // Pagination Props
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  totalResults,
}) => {
  // Derive localStorage storage key for column visibility preferences
  const storageKey = useMemo(() => {
    if (tableKey) return `o2d_cols_${tableKey}`;
    if (typeof window !== "undefined") {
      return `o2d_cols_${window.location.pathname.replace(/\//g, "_")}`;
    }
    return "o2d_cols_default";
  }, [tableKey]);

  // Hidden column keys
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Keep state in sync if storageKey changes (e.g. activeTab changes)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setHiddenColumns(parsed);
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    setHiddenColumns([]);
  }, [storageKey]);

  // Column toggle handlers
  const handleToggleColumn = useCallback(
    (colKey) => {
      setHiddenColumns((prev) => {
        let updated;
        if (prev.includes(colKey)) {
          updated = prev.filter((k) => k !== colKey);
        } else {
          updated = [...prev, colKey];
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [storageKey]
  );

  const handleShowAll = useCallback(() => {
    setHiddenColumns([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleReset = useCallback(() => {
    setHiddenColumns([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Column definitions & visibility map
  const columnConfigs = useMemo(() => {
    return headers.map((header, idx) => {
      const label =
        typeof header === "object"
          ? header.label || header.name || header.key || ""
          : header;
      const key =
        typeof header === "object" ? header.key || header.label || String(idx) : header;
      const isPinned =
        !label ||
        label.trim() === "" ||
        label.toLowerCase() === "action" ||
        (typeof header === "object" && header.toggleable === false);

      const isVisible = isPinned || !hiddenColumns.includes(key);

      return {
        originalIndex: idx,
        header,
        label,
        key,
        className: typeof header === "object" && header.className ? header.className : "",
        isPinned,
        isVisible,
      };
    });
  }, [headers, hiddenColumns]);

  const visibleHeaders = useMemo(() => {
    return columnConfigs.filter((c) => c.isVisible);
  }, [columnConfigs]);

  const visibleIndices = useMemo(() => {
    return columnConfigs.map((c) => c.isVisible);
  }, [columnConfigs]);

  const visibleColumnCount = visibleHeaders.length;

  // Filter rendered rows to match visible columns and update sub-row colSpan
  const filterRowElement = useCallback(
    (element) => {
      if (!React.isValidElement(element)) return element;

      // Handle React.Fragment
      if (element.type === React.Fragment) {
        const children = React.Children.map(element.props.children, (child) =>
          filterRowElement(child)
        );
        return React.cloneElement(element, {}, children);
      }

      // Handle <tr>
      if (element.type === "tr") {
        const rawChildren = React.Children.toArray(element.props.children);

        // Check if this is an expanded sub-row with a single colSpan <td>
        if (
          rawChildren.length === 1 &&
          rawChildren[0]?.props &&
          (rawChildren[0].props.colSpan !== undefined ||
            rawChildren[0].props.colspan !== undefined)
        ) {
          const subTd = rawChildren[0];
          return React.cloneElement(element, {}, [
            React.cloneElement(subTd, {
              key: subTd.key || "expanded-td",
              colSpan: visibleColumnCount,
            }),
          ]);
        }

        // Standard row with <td> elements matching the headers length
        if (rawChildren.length === headers.length) {
          const filteredCells = rawChildren.filter((_, idx) => visibleIndices[idx]);
          return React.cloneElement(element, {}, filteredCells);
        }

        return element;
      }

      return element;
    },
    [headers.length, visibleColumnCount, visibleIndices]
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Mobile Card View (Hidden on Desktop) */}
      <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50 scrollbar-hide">
        {data.length > 0 ? (
          data.map((item, index) => renderCard(item, index))
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-100 shadow-sm text-xs font-medium">
            No records found.
          </div>
        )}
      </div>

      {/* Desktop Table View (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Top Controls Bar: Column Toggler & Summary */}
        {showColumnToggle && headers.length > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 border-b border-gray-200/90 text-xs shrink-0 select-none">
            <div className="flex items-center gap-2 text-gray-500 text-[11px] font-medium">
              {toolbarExtra ? (
                toolbarExtra
              ) : (
                <span>
                  Showing <strong className="text-gray-800">{data.length}</strong>{" "}
                  {data.length === 1 ? "record" : "records"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ColumnToggleDropdown
                columns={headers}
                hiddenColumns={hiddenColumns}
                onToggleColumn={handleToggleColumn}
                onShowAll={handleShowAll}
                onReset={handleReset}
              />
            </div>
          </div>
        )}

        <DragScrollTable className="w-full flex-1 min-h-0">
          <table className={`w-full relative border-collapse ${minWidth}`}>
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {visibleHeaders.map((col, index) => (
                  <th
                    key={col.key || index}
                    className={`px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap uppercase tracking-wider ${col.className}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((item, index) => {
                const rowEl = renderRow(item, index, {
                  visibleHeaders,
                  visibleIndices,
                  hiddenColumns,
                });
                return hiddenColumns.length > 0 ? filterRowElement(rowEl) : rowEl;
              })}
            </tbody>
          </table>
        </DragScrollTable>
      </div>

      {/* Footer - Unified for both views */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4 rounded-b-lg">
        {/* Left Side: Row Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-medium text-xs md:text-sm shadow-sm"
          >
            {[10, 15, 20, 50, 100].map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
          <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap font-medium hidden sm:inline">
            {totalResults > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
          </span>
        </div>

        {/* Right Side: Pagination Controls */}
        <div className="flex items-center gap-2 md:gap-4 text-gray-700">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <div className="flex items-center text-xs md:text-sm font-semibold text-gray-600">
            {currentPage} / {totalPages || 1}
          </div>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
