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
        className={`bg-white dark:bg-[#0D1730] w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-gray-100 dark:border-[#1E2D52]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-[#1E2D52] flex-shrink-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-[#EAF0FF] truncate min-w-0 flex-1">{title}</h2>
          <button type="button" onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-3">
            {children}
          </div>

          <div className="flex items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 border-t border-gray-100 dark:border-[#1E2D52] flex-shrink-0 bg-gray-50/50 dark:bg-[#142142]/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#1E2D52] text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-[#142142] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 active:scale-95 transition-all"
            >
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
