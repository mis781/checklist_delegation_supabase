import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Check } from "lucide-react";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";

export default function ColumnToggleDropdown({ tableKey, columns }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { getColVis, setColVisKey } = usePurchaseReturn();

  const vis = getColVis(tableKey, columns);
  const toggleable = columns.filter((c) => c.toggleable !== false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns</span>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-xl shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50 mb-1">
            Toggle Columns
          </div>
          <div className="space-y-0.5">
            {toggleable.map((c) => {
              const isChecked = vis[c.key] !== false;
              return (
                <label
                  key={c.key}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setColVisKey(tableKey, c.key, e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span className="flex-1 truncate">{c.label}</span>
                  {isChecked && <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
