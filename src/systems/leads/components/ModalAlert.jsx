import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

const CONFIG = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-100' },
  confirm: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-100' },
};

/**
 * Shared success / error / confirm popup used across the Master pages.
 * For type "confirm", Confirm triggers onConfirm() directly (it's the
 * caller's job to close/replace the alert, e.g. by showing a follow-up
 * success alert) — Cancel just closes the dialog.
 */
export default function ModalAlert({ isOpen, type = 'success', title, message, onConfirm, onClose }) {
  if (!isOpen) return null;

  const { icon: Icon, color, bg, ring } = CONFIG[type] || CONFIG.success;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0D1730] border border-gray-100 dark:border-[#1E2D52] rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>

        <div className={`w-12 h-12 rounded-full ${bg} ring-8 ${ring} flex items-center justify-center mx-auto mb-4`}>
          <Icon className={color} size={24} />
        </div>

        <h3 className="text-center text-base font-bold text-gray-900 dark:text-[#EAF0FF]">{title}</h3>
        {message && <p className="text-center text-sm text-gray-500 dark:text-[#A9B8DB] mt-1.5">{message}</p>}

        <div className="mt-6 flex gap-2">
          {type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#1E2D52] text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#142142] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm?.()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition shadow-sm"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
