import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Coins,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Percent,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { loansApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import { formatCurrency } from "../../utils/dateFormatter";
import AddLoanModal from "./AddLoanModal";

// Helper for DD/MM/YYYY formatting
const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export default function AllLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedBank, setSelectedBank] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const data = await loansApi.list();
      setLoans(data || []);
    } catch (err) {
      console.error("Error loading loans:", err);
      toast.error("Failed to load loan portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
    const handleChange = () => loadLoans();
    window.addEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
  }, []);

  const handleDelete = async (loan) => {
    if (!window.confirm(`Are you sure you want to delete loan "${loan.loanName}"?`)) {
      return;
    }
    try {
      await loansApi.remove(loan.id);
      toast.success("Loan facility deleted successfully");
      loadLoans();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete loan");
    }
  };

  const banks = useMemo(() => {
    const set = new Set(loans.map((l) => l.bankName).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [loans]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const q = searchQuery.toLowerCase();
      const snText = loan.sn ? `ln-${loan.sn}` : "";
      const matchesSearch =
        !q ||
        loan.loanName?.toLowerCase().includes(q) ||
        loan.bankName?.toLowerCase().includes(q) ||
        loan.collateralDocument?.toLowerCase().includes(q) ||
        loan.remarks?.toLowerCase().includes(q) ||
        loan.fileName?.toLowerCase().includes(q) ||
        loan.accountNumber?.toLowerCase().includes(q) ||
        snText.includes(q);

      const matchesStatus = selectedStatus === "All" || loan.status === selectedStatus;
      const matchesBank = selectedBank === "All" || loan.bankName === selectedBank;

      return matchesSearch && matchesStatus && matchesBank;
    });
  }, [loans, searchQuery, selectedStatus, selectedBank]);

  const stats = useMemo(() => {
    const active = loans.filter((l) => l.status === "Active");
    const totalSanctioned = loans.reduce(
      (sum, l) => sum + (Number(l.loanAmount) || 0),
      0
    );
    const totalOutstanding = active.reduce(
      (sum, l) => sum + (Number(l.outstandingAmount) || 0),
      0
    );
    const totalMonthlyEmi = active.reduce(
      (sum, l) => sum + (Number(l.emiAmount) || 0),
      0
    );

    return {
      totalLoans: loans.length,
      activeCount: active.length,
      closedCount: loans.length - active.length,
      totalSanctioned,
      totalOutstanding,
      totalMonthlyEmi,
    };
  }, [loans]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Document &amp; Subscription Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Platform <span className="text-slate-400 mx-1">›</span> Commercial Loans
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLoans}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Bank Loan</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Total Outstanding Debt
          </span>
          <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 mt-1 block font-mono">
            {formatCurrency(stats.totalOutstanding)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Monthly EMI Outflow
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 block font-mono">
            {formatCurrency(stats.totalMonthlyEmi)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Active Facilities
          </span>
          <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {stats.activeCount} Active
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Closed Loans
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1 block">
            {stats.closedCount} Settled
          </span>
        </div>
      </div>

      {/* 3. Main Card Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Commercial Loans &amp; Liabilities
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track active corporate term loans, machinery financing, EMIs, and NOC closures
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search loan name, bank, collateral..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="All">All Loan Statuses</option>
              <option value="Active">Active Facilities</option>
              <option value="Closed">Closed / Settled</option>
            </select>

            {/* Bank Filter */}
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All Banks" : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* High-Contrast Table with All Requested Columns */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 text-center whitespace-nowrap min-w-[200px]">ACTIONS</th>
                <th className="px-4 py-3">SERIAL NO.</th>
                <th className="px-4 py-3">LOAN NAME</th>
                <th className="px-4 py-3">BANK NAME</th>
                <th className="px-4 py-3">AMOUNT</th>
                <th className="px-4 py-3">EMI</th>
                <th className="px-4 py-3">LOAN START DATE</th>
                <th className="px-4 py-3">LOAN END DATE</th>
                <th className="px-4 py-3">COLLATERAL DOCUMENT</th>
                <th className="px-4 py-3 text-center">FILE</th>
                <th className="px-4 py-3">REMARKS</th>
                <th className="px-4 py-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="12" className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                      <span>Loading loan accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Coins className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        No commercial loans found
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Click "+ Add Bank Loan" to record bank borrowings and asset loans.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, index) => {
                  const serialNo = loan.sn
                    ? `LN-${String(loan.sn).padStart(3, "0")}`
                    : `LN-${String(index + 1).padStart(3, "0")}`;

                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Actions - Leftmost */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {loan.status === "Active" ? (
                            <Link
                              to="/dashboard/docs/loan/foreclosure"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 font-semibold rounded-lg text-[11px] transition-colors border border-amber-200 dark:border-amber-800/80 shadow-2xs"
                              title="Request Loan Foreclosure"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              <span>Foreclose</span>
                            </Link>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium rounded-lg text-[11px] border border-slate-200/60 dark:border-slate-700/60 opacity-60"
                              title="Loan already closed"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span>Settled</span>
                            </span>
                          )}
                          <Link
                            to="/dashboard/docs/loan/noc"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 font-semibold rounded-lg text-[11px] transition-colors border border-indigo-200 dark:border-indigo-800/80 shadow-2xs"
                            title="View NOC Document Status"
                          >
                            <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            <span>NOC</span>
                          </Link>
                          <button
                            onClick={() => handleDelete(loan)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 dark:text-slate-500 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                            title="Delete Loan Facility"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Serial No. */}
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {serialNo}
                      </td>

                      {/* Loan Name */}
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <Coins className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{loan.loanName}</span>
                        </div>
                      </td>

                      {/* Bank Name */}
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {loan.bankName}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(loan.loanAmount)}
                      </td>

                      {/* EMI */}
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {loan.emiAmount ? formatCurrency(loan.emiAmount) : "-"}
                      </td>

                      {/* Loan Start Date */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateDDMMYYYY(loan.startDate)}
                      </td>

                      {/* Loan End Date */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateDDMMYYYY(loan.endDate || loan.maturityDate)}
                      </td>

                      {/* Collateral Document */}
                      <td
                        className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate font-medium"
                        title={loan.collateralDocument}
                      >
                        {loan.collateralDocument || "-"}
                      </td>

                      {/* File */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {loan.fileName ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 cursor-pointer hover:bg-blue-100 transition-colors"
                            title={loan.fileName}
                          >
                            <FileText className="h-3 w-3 text-blue-500" />
                            <span className="truncate max-w-[90px]">{loan.fileName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td
                        className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate"
                        title={loan.remarks}
                      >
                        {loan.remarks || "-"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            loan.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {loan.status === "Active" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          <span>{loan.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddLoanModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={loadLoans}
      />
    </div>
  );
}
