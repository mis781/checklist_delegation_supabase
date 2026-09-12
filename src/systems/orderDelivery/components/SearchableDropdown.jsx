import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus, X } from 'lucide-react';

/**
 * SearchableDropdown Component
 * A robust custom select component with live multi-token search functionality.
 * 
 * @param {Array} options - Array of { value, label, rawName, sku, id } objects.
 * @param {any} value - Currently selected value.
 * @param {Function} onChange - Callback function when an option is selected.
 * @param {Function} onAdd - Optional callback when adding a new item.
 * @param {string} placeholder - Text to show when no value is selected.
 * @param {string} className - Additional CSS classes for the container.
 * @param {string} dropDirection - Force dropdown direction ('up' | 'down').
 */
const SearchableDropdown = ({
  options = [],
  value,
  onChange,
  onAdd,
  placeholder = "Select option...",
  className = "",
  dropDirection
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openUp, setOpenUp] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Safe search tokens from search term
  const searchTokens = useMemo(() => {
    const trimmed = (searchTerm || '').trim().toLowerCase();
    return trimmed.length > 0 ? trimmed.split(/\s+/) : [];
  }, [searchTerm]);

  // Filter options based on multi-token matching across label, sku, rawName, and value, with deduplication
  const filteredOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];

    // Deduplicate options by unique value and label signature
    const uniqueOptions = [];
    const seen = new Set();
    for (const opt of options) {
      if (!opt) continue;
      const sig = `${opt.value ?? ''}:::${opt.label ?? ''}`.trim().toLowerCase();
      if (!sig || seen.has(sig)) continue;
      seen.add(sig);
      uniqueOptions.push(opt);
    }

    if (searchTokens.length === 0) return uniqueOptions;

    return uniqueOptions.filter((opt) => {
      const labelStr = String(opt.label || opt.name || opt.value || '').toLowerCase();
      const skuStr = String(opt.sku || '').toLowerCase();
      const rawNameStr = String(opt.rawName || '').toLowerCase();
      const valStr = String(opt.value || '').toLowerCase();
      const combined = `${labelStr} ${skuStr} ${rawNameStr} ${valStr}`;

      return searchTokens.every((token) => combined.includes(token));
    });
  }, [options, searchTokens]);

  // Reset scroll to top whenever the search term changes so top filtered results are visible
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [searchTerm]);

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    } else {
      // Focus search input when dropdown opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Find the label for the current value
  const selectedOption = useMemo(() => {
    if (!Array.isArray(options) || value === undefined || value === null || value === '') {
      return null;
    }
    return options.find(opt => 
      opt && (opt.value === value || opt.label === value || (opt.rawName && opt.rawName === value))
    );
  }, [options, value]);

  // Determine direction based on space
  useEffect(() => {
    if (dropDirection === 'down') {
      setOpenUp(false);
      return;
    }
    if (dropDirection === 'up') {
      setOpenUp(true);
      return;
    }
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 300; // Estimated max height
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [isOpen, dropDirection]);

  // Close dropdown when clicking/touching outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, []);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelectOption = (optVal) => {
    if (onChange) onChange(optVal);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0].value);
      } else if (onAdd && searchTerm.trim()) {
        onAdd(searchTerm.trim());
        setIsOpen(false);
        setSearchTerm("");
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selection Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full bg-white border border-gray-300 rounded px-2 py-1 flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-all h-[30px] md:h-[34px] shadow-sm group outline-none focus:ring-1 focus:ring-indigo-500/30 active:scale-[0.98]"
      >
        <span className={`text-[11px] md:text-[13px] truncate text-left ${selectedOption || value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : (value || placeholder)}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 shrink-0 transition-transform duration-200 group-hover:text-indigo-500 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute left-0 right-0 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-200 rounded-lg shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[200px]`}>
          {/* Search Box */}
          <div
            className="p-1.5 border-b border-gray-100 bg-gray-50 flex gap-1.5 items-center"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-2.5 text-gray-400 pointer-events-none" size={13} />
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                spellCheck="false"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-gray-200 rounded pl-8 pr-7 py-1 text-[11px] md:text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 shadow-inner"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-56 overflow-y-auto py-1 scrollbar-hide">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = value === opt.value || value === opt.label || (opt.rawName && value === opt.rawName);
                const uniqueKey = `sdrop-opt-${idx}-${opt.value || opt.label || ''}`;

                return (
                  <div
                    key={uniqueKey}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(opt.value);
                    }}
                    className={`px-3 py-1.5 text-[11px] md:text-[13px] cursor-pointer flex justify-between items-center hover:bg-indigo-50 transition-colors group ${
                      isSelected ? 'bg-indigo-50/70 text-indigo-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && (
                      <Check size={13} className="text-indigo-600 shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-[11px] text-center text-gray-400 italic font-medium">
                No matching results found
              </div>
            )}
          </div>

          {/* Always visible Add New at the bottom */}
          {onAdd && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd(searchTerm.trim());
                setIsOpen(false);
                setSearchTerm("");
              }}
              className="w-full border-t border-gray-100 px-3 py-2 text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 bg-white active:bg-indigo-100 font-semibold"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="text-[11px] uppercase tracking-wider">Add "{searchTerm || 'New'}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
