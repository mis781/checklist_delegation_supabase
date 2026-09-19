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
        className="w-full flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-lg lg:rounded px-3 h-[32px] lg:h-[38px] text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 transition"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 w-full min-w-[220px] bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-2 border-b border-gray-50 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-gray-50 rounded pl-7 pr-2 py-1.5 text-xs focus:outline-none border border-transparent focus:border-indigo-300"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left hover:bg-indigo-50 transition ${option.value === value ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-gray-700'}`}
                >
                  {option.label}
                  {option.value === value && <Check size={13} />}
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
