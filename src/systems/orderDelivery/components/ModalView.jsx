import { createPortal } from 'react-dom';
import { X, Eye } from 'lucide-react';

const ModalView = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  zIndex = 'z-[100]'
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center ${zIndex} p-2 sm:p-6 animate-in fade-in duration-200 overflow-y-auto`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-[#0D1730] rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-[#1E2D52] my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-100 dark:border-[#1E2D52] bg-blue-50/50 dark:bg-[#142142]/60 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Eye size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-[#EAF0FF] leading-tight">{title}</h2>
              {subtitle && <p className="text-[11px] text-gray-500 dark:text-[#A9B8DB] font-medium leading-tight mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-blue-100 dark:hover:bg-[#142142] rounded-lg text-blue-400 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-white dark:bg-[#0D1730]">
          {children}
        </div>

        {/* Footer Action */}
        <div className="flex items-center justify-end p-4 border-t border-gray-100 dark:border-[#1E2D52] bg-gray-50/50 dark:bg-[#142142]/50 rounded-b-2xl shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-[#1E2D52] text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-100 dark:hover:bg-[#142142] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalView;