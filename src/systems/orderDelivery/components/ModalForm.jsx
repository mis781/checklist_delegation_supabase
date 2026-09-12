import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileEdit } from 'lucide-react';

/**
 * ModalForm Component
 * Renders via React Portal over the entire application layout.
 * Styled matching the Image 2 popup modal design:
 * - Full-screen backdrop blur overlay (fixed inset-0)
 * - Rounded-2xl card with shadow-2xl
 * - Header with icon badge, title, optional subtitle, and close (X) button
 * - Scrollable body with custom padding
 * - Clean rounded-xl Cancel & Submit action buttons in footer
 */
const ModalForm = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon = FileEdit,
  children,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  maxWidth = 'max-w-5xl',
  maxHeight = '90vh',
  zIndex = 'z-[100]',
  extraFooterAction = null,
  formId = 'modal-form',
  loading = false,
  submitIcon = null,
  submitBtnColor = 'bg-emerald-600 hover:bg-emerald-700 text-white',
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center ${zIndex} p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-200`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 my-auto`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Image 2 */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-100 bg-indigo-50/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              {Icon && <Icon size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">{title}</h2>
              {subtitle && (
                <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          className="flex-1 overflow-y-auto bg-white min-h-0 p-4 md:p-6"
          style={{
            msOverflowStyle: 'auto',
            scrollbarWidth: 'thin'
          }}
        >
          <form id={formId} onSubmit={onSubmit} className="space-y-4 text-left">
            {children}
          </form>
        </div>

        {/* Standardized Footer Actions matching Image 2 */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
          {extraFooterAction}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl ${submitBtnColor} font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50`}
          >
            {submitIcon}
            {submitText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalForm;
