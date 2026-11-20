import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

/**
 * SearchableSupplierSelect
 * A searchable dropdown component for supplier selection in PO creation/revision.
 * Supports multi-token search over Vendor Name, City, State, Contact Person, and Phone.
 */
export default function SearchableSupplierSelect({
  vendors = [],
  value = "",
  onChange,
  disabled = false,
  placeholder = "-- Select Supplier (Optional) --",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize list of vendor objects
  const vendorList = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    const seen = new Set();
    const result = [];
    for (const v of vendors) {
      if (!v) continue;
      const vName =
        typeof v === "string"
          ? v.trim()
          : (v.vendor_name || v.name || "").trim();
      if (!vName || seen.has(vName.toLowerCase())) continue;
      seen.add(vName.toLowerCase());
      result.push({
        raw: v,
        name: vName,
        city: v.city && v.city !== "-" ? String(v.city).trim() : "",
        state: v.state && v.state !== "-" ? String(v.state).trim() : "",
        phone:
          v.phone && v.phone !== "-"
            ? String(v.phone).trim()
            : v.phone1 && v.phone1 !== "-"
              ? String(v.phone1).trim()
              : "",
        contact:
          v.contact_person && v.contact_person !== "-"
            ? String(v.contact_person).trim()
            : v.contact_person_1 && v.contact_person_1 !== "-"
              ? String(v.contact_person_1).trim()
              : "",
      });
    }
    return result;
  }, [vendors]);

  // Selected vendor display
  const selectedVendor = useMemo(() => {
    if (!value) return null;
    const cleanVal = String(value).trim().toLowerCase();
    return (
      vendorList.find((v) => v.name.toLowerCase() === cleanVal) || {
        name: value,
      }
    );
  }, [value, vendorList]);

  // Search tokens
  const searchTokens = useMemo(() => {
    const trimmed = (searchTerm || "").trim().toLowerCase();
    return trimmed.length > 0 ? trimmed.split(/\s+/) : [];
  }, [searchTerm]);

  // Filtered vendor list
  const filteredVendors = useMemo(() => {
    if (searchTokens.length === 0) return vendorList;
    return vendorList.filter((item) => {
      const searchBlob = `${item.name} ${item.city} ${item.state} ${item.contact} ${item.phone}`.toLowerCase();
      return searchTokens.every((token) => searchBlob.includes(token));
    });
  }, [vendorList, searchTokens]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(filteredVendors.length > 0 ? 0 : -1);
  }, [filteredVendors]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`,
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
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

  const handleSelect = (vendorName) => {
    if (onChange) onChange(vendorName);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredVendors.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredVendors.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredVendors.length) {
        handleSelect(filteredVendors[highlightedIndex].name);
      }
    }
  };

  return (
    <div
      className={`relative ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold flex items-center justify-between text-left transition-all ${
          disabled
            ? "opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-700 text-slate-500"
            : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-white"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-white"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={`truncate flex-1 ${
            !selectedVendor?.name
              ? "text-slate-400 dark:text-slate-500 font-normal"
              : ""
          }`}
        >
          {selectedVendor?.name || placeholder}
        </span>

        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {selectedVendor?.name && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect("");
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              title="Clear selection"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-blue-500" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-72 animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search supplier by name, city, phone..."
                className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>
                {filteredVendors.length} supplier
                {filteredVendors.length === 1 ? "" : "s"} found
              </span>
              {value && (
                <button
                  type="button"
                  onClick={() => handleSelect("")}
                  className="text-red-500 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Vendors List */}
          <div
            ref={listRef}
            className="overflow-y-auto max-h-56 py-1 divide-y divide-slate-50 dark:divide-slate-800/50"
          >
            {/* Optional / Unset choice */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer ${
                !value
                  ? "bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 italic"
              }`}
            >
              <span>-- Select Supplier (Optional) --</span>
              {!value && (
                <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
            </button>

            {filteredVendors.length > 0 ? (
              filteredVendors.map((item, idx) => {
                const isSelected =
                  selectedVendor?.name?.toLowerCase() ===
                  item.name.toLowerCase();
                const isHighlighted = idx === highlightedIndex;
                const locSub = [item.city, item.state]
                  .filter(Boolean)
                  .join(", ");
                const extraSub = [locSub, item.contact, item.phone]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <button
                    key={`vendor-opt-${item.name}-${idx}`}
                    data-index={idx}
                    type="button"
                    onClick={() => handleSelect(item.name)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold"
                        : isHighlighted
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate">
                        {item.name}
                      </div>
                      {extraSub && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {extraSub}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No suppliers match &ldquo;
                  <span className="font-semibold">{searchTerm}</span>&rdquo;
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
