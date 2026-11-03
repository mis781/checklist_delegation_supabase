import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, Package } from "lucide-react";

/**
 * SearchableItemSelect
 * Provides a type-to-search input / combobox for purchase requisition item selection.
 * Supports multi-token search over SKU / Item Code, Name, and UOM.
 */
export default function SearchableItemSelect({
  items = [],
  value = "",
  selectedCode = "",
  onChange,
  disabled = false,
  disabledPlaceholder = "Select item...",
  placeholder = "Type to search or select item...",
  getAvailableStock,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [openUp, setOpenUp] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find the selected item object from items list
  const selectedItem = useMemo(() => {
    if (!value && !selectedCode) return null;
    return (
      items.find(
        (i) =>
          (selectedCode && (i.item_code === selectedCode || i.sku === selectedCode)) ||
          (value && (i.item_name === value || i.name === value || i.item_code === value || i.sku === value))
      ) || null
    );
  }, [items, value, selectedCode]);

  // Formatted display label for currently selected item
  const selectedDisplayLabel = useMemo(() => {
    if (!selectedItem) return value || "";
    const name = selectedItem.item_name || selectedItem.name || "";
    const code = selectedItem.item_code || selectedItem.sku || "";
    if (code && name && code.toLowerCase().trim() !== name.toLowerCase().trim()) {
      return `${code} - ${name}`;
    }
    return code || name;
  }, [selectedItem, value]);

  // Tokenize search query for multi-word out-of-order matching
  const searchTokens = useMemo(() => {
    const trimmed = (searchInput || "").trim().toLowerCase();
    return trimmed.length > 0 ? trimmed.split(/\s+/) : [];
  }, [searchInput]);

  // Filter items based on typed search tokens
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    if (!isTyping || searchTokens.length === 0) return items;

    return items.filter((item) => {
      const nameStr = String(item.item_name || item.name || "").toLowerCase();
      const codeStr = String(item.item_code || item.sku || "").toLowerCase();
      const uomStr = String(item.uom || "").toLowerCase();
      const combined = `${codeStr} ${nameStr} ${uomStr}`;

      return searchTokens.every((token) => combined.includes(token));
    });
  }, [items, isTyping, searchTokens]);

  // Reset highlight index when filtered items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown on outside click or tap
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchInput("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, []);

  // Determine if dropdown should open upward based on viewport clearance
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [isOpen]);

  const handleSelect = (item) => {
    const name = item.item_name || item.name || "";
    const code = item.item_code || item.sku || "";
    const optionVal = code || name;
    if (onChange) {
      onChange(optionVal, item);
    }
    setIsOpen(false);
    setIsTyping(false);
    setSearchInput("");
  };

  const handleSelectCustom = (customText) => {
    if (onChange) {
      onChange(customText.trim(), null);
    }
    setIsOpen(false);
    setIsTyping(false);
    setSearchInput("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange("", null);
    }
    setSearchInput("");
    setIsTyping(false);
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredItems.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredItems.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen) {
        if (filteredItems.length > 0 && filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        } else if (searchInput.trim()) {
          handleSelectCustom(searchInput.trim());
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setIsTyping(false);
      setSearchInput("");
    } else if (e.key === "Tab") {
      setIsOpen(false);
      setIsTyping(false);
      setSearchInput("");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? "z-40" : "z-10"}`}
    >
      {/* Search Input Box */}
      <div
        className={`w-full flex items-center bg-white dark:bg-slate-800 border rounded-xl transition-all shadow-xs ${
          disabled
            ? "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        <div className="pl-3 pr-1 text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none">
          <Search size={14} />
        </div>

        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck="false"
          disabled={disabled}
          value={isTyping ? searchInput : selectedDisplayLabel}
          placeholder={disabled ? disabledPlaceholder : placeholder}
          onChange={(e) => {
            if (disabled) return;
            setIsTyping(true);
            setSearchInput(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={(e) => {
            if (disabled) return;
            setIsOpen(true);
            e.target.select();
          }}
          onClick={() => {
            if (!disabled && !isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full py-2 px-1.5 bg-transparent text-xs font-semibold focus:outline-hidden ${
            disabled
              ? "text-slate-400 cursor-not-allowed"
              : "text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 cursor-text"
          }`}
        />

        {/* Clear & Dropdown Toggle Actions */}
        <div className="flex items-center pr-2 gap-0.5 shrink-0">
          {!disabled && (searchInput || selectedDisplayLabel) && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (disabled) return;
              if (isOpen) {
                setIsOpen(false);
                setIsTyping(false);
                setSearchInput("");
              } else {
                setIsOpen(true);
                if (inputRef.current) inputRef.current.focus();
              }
            }}
            className={`p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform ${
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && !disabled && (
        <div
          className={`absolute left-0 right-0 ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[280px]`}
        >
          {/* Header Status Bar */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>
              {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"} available
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {isTyping ? "Filtering live" : "Type to search"}
            </span>
          </div>

          {/* Items List */}
          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/50"
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => {
                const name = item.item_name || item.name || "";
                const code = item.item_code || item.sku || "";
                const isSelected =
                  (selectedCode && (code === selectedCode)) ||
                  (value && (name === value || code === value));
                const isHighlighted = idx === highlightedIndex;

                const availStock = getAvailableStock ? getAvailableStock(code, name) : null;

                return (
                  <div
                    key={code ? `item-${code}-${idx}` : `item-${name}-${idx}`}
                    data-index={idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 text-xs cursor-pointer rounded-lg flex items-center justify-between gap-2 transition-colors ${
                      isHighlighted
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                        : isSelected
                        ? "bg-blue-50/60 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {code && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shrink-0">
                            {code}
                          </span>
                        )}
                        <span className="font-semibold truncate text-slate-800 dark:text-slate-100">
                          {name || code}
                        </span>
                      </div>
                      {availStock !== null && availStock !== undefined && Number(availStock) > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <Package size={10} />
                          <span>
                            Closing Stock: {Number(availStock).toFixed(2)} {item.uom || "NOS"}
                          </span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No matching items found {searchInput ? `for "${searchInput}"` : ""}
                </p>
                {searchInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelectCustom(searchInput.trim())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                  >
                    <span>Use &ldquo;{searchInput.trim()}&rdquo; as custom item</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
