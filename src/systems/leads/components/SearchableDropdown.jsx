import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * Select-style dropdown with an inline search box for filtering options.
 * Used by Master.jsx as the tab switcher between master data types.
 */
export default function SearchableDropdown({ options = [], value, onChange, className = '', placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-white dark:bg-[#0D1730] border border-gray-300 dark:border-[#1E2D52] rounded-xl px-3 h-[34px] lg:h-[38px] text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:border-blue-500 dark:hover:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1.5 w-full min-w-[220px] bg-white dark:bg-[#0D1730] rounded-xl shadow-xl border border-gray-200 dark:border-[#1E2D52] overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-[#1E2D52] bg-gray-50/60 dark:bg-[#142142]/60 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white dark:bg-[#0D1730] text-gray-800 dark:text-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-xs focus:outline-none border border-gray-200 dark:border-[#1E2D52] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left hover:bg-blue-50 dark:hover:bg-blue-500/10 transition ${option.value === value ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/70 dark:bg-blue-500/15' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {option.label}
                  {option.value === value && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
