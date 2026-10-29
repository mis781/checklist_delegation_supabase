import { XCircle, Save } from 'lucide-react';

/**
 * TabSwitcher Component - Standardized Tabs for Pending/History
 */
export const TabSwitcher = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex gap-2 w-full lg:w-auto flex-shrink-0 border-b lg:border-none border-gray-100 dark:border-slate-800 pb-2 lg:pb-0 mb-1 lg:mb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-1.5 px-4 transition text-[11px] md:text-sm rounded-xl whitespace-nowrap capitalize flex items-center justify-center gap-2 ${
            activeTab === tab.id 
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold shadow-2xs' 
              : 'text-gray-500 dark:text-slate-400 hover:bg-blue-50/50 dark:hover:bg-slate-800'
          }`}
        >
          {tab.icon && <tab.icon size={14} className={activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />}
          {tab.label} ({tab.count || 0})
        </button>
      ))}
    </div>
  );
};

/**
 * FormActionButtons Component - Standardized Save/Cancel Buttons
 */
export const FormActionButtons = ({ 
  onCancel, 
  onSubmit, 
  cancelText = 'Cancel', 
  submitText = 'Save Changes',
  loading = false,
  className = "",
  formId = null,
  extraButton = null
}) => {
  return (
    <div className={`flex gap-3 items-center ${className}`}>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-2 md:px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
      >
        <XCircle size={18} className="block md:hidden" />
        <span className="hidden md:block">{cancelText}</span>
      </button>

      {extraButton && (
        <div className="flex-1 flex w-full justify-center">
          {extraButton}
        </div>
      )}

      <button
        type={onSubmit ? "button" : "submit"}
        form={formId}
        onClick={onSubmit}
        disabled={loading}
        className="flex-[1.5] bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-bold py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="hidden md:block">Processing...</span>
          </>
        ) : (
          <>
            <Save size={18} className="block md:hidden" />
            <span className="hidden md:block">{submitText}</span>
          </>
        )}
      </button>
    </div>
  );
};

