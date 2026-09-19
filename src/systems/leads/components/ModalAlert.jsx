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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X size={16} />
        </button>

        <div className={`w-12 h-12 rounded-full ${bg} ring-8 ${ring} flex items-center justify-center mx-auto mb-4`}>
          <Icon className={color} size={24} />
        </div>

        <h3 className="text-center text-base font-bold text-gray-800">{title}</h3>
        {message && <p className="text-center text-sm text-gray-500 mt-1.5">{message}</p>}

        <div className="mt-6 flex gap-2">
          {type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm?.()}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
