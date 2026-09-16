import { useState, useRef, useEffect, useMemo } from "react";
import { SlidersHorizontal, Check, Search, RotateCcw, Eye } from "lucide-react";

/**
 * ColumnToggleDropdown Component
 * Allows users to show/hide individual table columns with real-time feedback,
 * search filtering, "Select All", and "Reset" actions.
 */
export default function ColumnToggleDropdown({
  columns = [],
  hiddenColumns = [],
  onToggleColumn,
  onShowAll,
  onReset,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filter toggleable columns (ignore pinned/empty columns like expand chevrons)
  const toggleableColumns = useMemo(() => {
    return columns.filter((col) => {
      const label = typeof col === "object" ? col.label : col;
      if (!label || label.trim() === "") return false;
      if (typeof col === "object" && col.toggleable === false) return false;
      return true;
    });
  }, [columns]);

  // Search filter
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return toggleableColumns;
    const q = searchQuery.toLowerCase();
    return toggleableColumns.filter((col) => {
      const label = typeof col === "object" ? col.label : col;
      return label.toLowerCase().includes(q);
    });
  }, [toggleableColumns, searchQuery]);

  const totalToggleable = toggleableColumns.length;
  const visibleCount = toggleableColumns.filter((col) => {
    const key = typeof col === "object" ? (col.key || col.label) : col;
    return !hiddenColumns.includes(key);
  }).length;

  const hasHidden = hiddenColumns.length > 0;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all shadow-sm ${
          hasHidden
            ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        }`}
        title="Show/Hide Table Columns"
      >
        <SlidersHorizontal size={13} className={hasHidden ? "text-indigo-600" : "text-gray-500"} />
        <span>Columns</span>
        <span
          className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            hasHidden
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {visibleCount}/{totalToggleable}
        </span>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-1.5 w-64 max-h-[380px] flex flex-col rounded-xl shadow-2xl bg-white border border-gray-200 p-2 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 pb-2 mb-1">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Eye size={14} className="text-indigo-600" />
              Toggle Columns
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={onShowAll}
                className="text-indigo-600 hover:text-indigo-800 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-50 transition"
              >
                All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={onReset}
                className="text-gray-500 hover:text-gray-700 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 flex items-center gap-0.5 transition"
                title="Reset to default columns"
              >
                <RotateCcw size={10} /> Reset
              </button>
            </div>
          </div>

          {/* Search Input if > 6 columns */}
          {totalToggleable > 6 && (
            <div className="px-1 py-1 mb-1 relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Filter columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          )}

          {/* Scrollable Column Checkbox List */}
          <div className="overflow-y-auto max-h-56 divide-y divide-gray-50 space-y-0.5 pr-0.5">
            {filteredColumns.length > 0 ? (
              filteredColumns.map((col, idx) => {
                const label = typeof col === "object" ? col.label : col;
                const key = typeof col === "object" ? (col.key || col.label) : col;
                const isVisible = !hiddenColumns.includes(key);

                return (
                  <label
                    key={key || idx}
                    className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                      isVisible
                        ? "text-gray-800 hover:bg-indigo-50/60"
                        : "text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => onToggleColumn(key)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="flex-1 truncate font-medium">{label}</span>
                    {isVisible && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    )}
                  </label>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-gray-400">
                No matching columns
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
