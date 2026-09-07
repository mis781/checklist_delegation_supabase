import { useMemo } from "react";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { Filter, X } from "lucide-react";

export default function FilterBar({ viewKey }) {
  const {
    records,
    filters,
    updateFilter,
    clearFilters,
    companyOptions,
    divisionOptions,
    getDivisionsForCompany,
    getCompaniesForDivision
  } = usePurchaseReturn();
  const f = filters[viewKey] || { company: "", division: "", bill: "" };

  const hasActiveFilters = Boolean(f.company || f.division || f.bill);

  // Contextual options
  const availableCompanies = f.division && getCompaniesForDivision
    ? getCompaniesForDivision(f.division)
    : companyOptions;

  const availableDivisions = f.company && getDivisionsForCompany
    ? getDivisionsForCompany(f.company)
    : divisionOptions;

  // Dynamic Bill Numbers extracted from records (filtered by selected Company/Division)
  const availableBillNumbers = useMemo(() => {
    let list = records || [];
    if (f.company) {
      list = list.filter((r) => r.company === f.company);
    }
    if (f.division) {
      list = list.filter((r) => r.division === f.division);
    }
    const bills = list
      .map((r) => r.billNumber || r.bill_number)
      .filter(Boolean)
      .map((b) => String(b).trim());
    return Array.from(new Set(bills)).sort((a, b) => a.localeCompare(b));
  }, [records, f.company, f.division]);

  const handleCompanyChange = (e) => {
    const nextComp = e.target.value;
    updateFilter(viewKey, "company", nextComp);
    if (nextComp && f.division && getDivisionsForCompany) {
      const allowed = getDivisionsForCompany(nextComp);
      if (!allowed.includes(f.division)) {
        updateFilter(viewKey, "division", "");
      }
    }
  };

  const handleDivisionChange = (e) => {
    const nextDiv = e.target.value;
    updateFilter(viewKey, "division", nextDiv);
    if (nextDiv && f.company && getCompaniesForDivision) {
      const allowed = getCompaniesForDivision(nextDiv);
      if (!allowed.includes(f.company)) {
        updateFilter(viewKey, "company", "");
      }
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/80 transition-colors">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold mr-1">
        <Filter className="w-3.5 h-3.5" />
        <span>FILTERS</span>
      </div>

      {/* Company Name */}
      <div className="flex flex-col min-w-[140px] flex-1 sm:flex-initial">
        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">
          Company Name
        </label>
        <select
          value={f.company}
          onChange={handleCompanyChange}
          className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">All Companies</option>
          {(availableCompanies || []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Division */}
      <div className="flex flex-col min-w-[130px] flex-1 sm:flex-initial">
        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">
          Division
        </label>
        <select
          value={f.division}
          onChange={handleDivisionChange}
          className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">All Divisions</option>
          {(availableDivisions || []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Bill Number */}
      <div className="flex flex-col min-w-[150px] flex-1 sm:flex-initial">
        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">
          Bill Number
        </label>
        <select
          value={f.bill}
          onChange={(e) => updateFilter(viewKey, "bill", e.target.value)}
          className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">All Bill Numbers</option>
          {(availableBillNumbers || []).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={() => clearFilters(viewKey)}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-rose-500" />
          Clear Filters
        </button>
      )}
    </div>
  );
}
