import React, { useState, useRef, useEffect } from 'react';

/**
 * Wraps a trigger element; clicking it reveals a small floating panel
 * listing extra info (e.g. all contact persons, full address). Closes
 * on outside click. Renders just the trigger if there's nothing to show.
 */
export default function InfoPopover({ items = [], title, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validItems = (items || []).filter(Boolean);
  if (validItems.length === 0) return children;

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{children}</div>
      {open && (
        <div className="absolute z-30 top-full mt-1.5 left-1/2 -translate-x-1/2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 p-3 text-left">
          {title && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{title}</p>}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {validItems.map((item, i) => (
              <p key={i} className="text-xs text-gray-700 leading-snug">{item}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
