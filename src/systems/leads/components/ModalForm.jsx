import React from 'react';
import { X } from 'lucide-react';

/**
 * Generic slide-up (mobile) / centered (desktop) modal shell used by
 * every Master page's Add/Edit form.
 */
export default function ModalForm({ isOpen, onClose, title, onSubmit, submitText = 'Save', maxWidth = 'max-w-md', children }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh] sm:max-h-[88vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-800">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-3">
            {children}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3.5 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition"
            >
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
