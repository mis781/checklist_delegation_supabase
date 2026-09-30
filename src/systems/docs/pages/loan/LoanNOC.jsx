import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  Coins,
  History,
  X,
  FileText,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { loansApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import { formatCurrency } from "../../utils/dateFormatter";

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

export default function LoanNOC() {
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'collected'
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // NOC Collection Modal State
  const [collectingLoan, setCollectingLoan] = useState(null);
  const [nocNumber, setNocNumber] = useState("");
  const [nocDate, setNocDate] = useState(new Date().toISOString().split("T")[0]);
  const [nocRemarks, setNocRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const data = await loansApi.list();
      setLoans(data || []);
    } catch (err) {
      console.error("Error loading NOC loan records:", err);
      toast.error("Failed to load NOC records");
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

  const pendingNocList = useMemo(() => {
    return loans
      .filter((l) => l.collectNocStatus !== "Yes")
      .filter((l) => {
        const q = searchQuery.toLowerCase();
        const snText = l.sn ? `ln-${l.sn}` : "";
        return (
          !q ||
          l.loanName?.toLowerCase().includes(q) ||
          l.bankName?.toLowerCase().includes(q) ||
          l.collateralDocument?.toLowerCase().includes(q) ||
          l.remarks?.toLowerCase().includes(q) ||
          l.accountNumber?.toLowerCase().includes(q) ||
          snText.includes(q)
        );
      });
  }, [loans, searchQuery]);

  const collectedNocList = useMemo(() => {
    return loans
      .filter((l) => l.collectNocStatus === "Yes")
      .filter((l) => {
        const q = searchQuery.toLowerCase();
        const snText = l.sn ? `ln-${l.sn}` : "";
        return (
          !q ||
          l.loanName?.toLowerCase().includes(q) ||
          l.bankName?.toLowerCase().includes(q) ||
          l.nocNumber?.toLowerCase().includes(q) ||
          l.collateralDocument?.toLowerCase().includes(q) ||
          l.nocRemarks?.toLowerCase().includes(q) ||
          snText.includes(q)
        );
      });
  }, [loans, searchQuery]);

  const handleOpenCollectModal = (loan) => {
    setCollectingLoan(loan);
    setNocNumber("");
    setNocDate(new Date().toISOString().split("T")[0]);
    setNocRemarks("");
  };

  const handleConfirmCollect = async (e) => {
    e.preventDefault();
    if (!collectingLoan) return;
    if (!nocNumber.trim()) {
      toast.error("Please enter the Bank NOC certificate / reference number");
      return;
    }

    try {
      setSaving(true);
      await loansApi.collectNoc(collectingLoan.id, {
        nocNumber,
        nocDate,
        remarks: nocRemarks,
      });

      toast.success(`NOC recorded for "${collectingLoan.loanName}"! Loan charge satisfied.`);
      setCollectingLoan(null);
      loadLoans();
    } catch (err) {
      console.error(err);
      toast.error("Failed to record NOC");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Document &amp; Subscription Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Platform <span className="text-slate-400 mx-1">›</span> Bank NOC Desk
            </p>
          </div>
        </div>

        <button
          onClick={loadLoans}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Refresh desk"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Main Desk Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Bank NOC &amp; Charge Satisfaction Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track collection of No Objection Certificates and removal of bank hypothecation / ROC charges
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "pending"
                    ? "Search loans awaiting NOC..."
                    : "Search collected NOCs by bank, ref..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Tab Pill Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "pending"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Awaiting NOC ({pendingNocList.length})
              </button>
              <button
                onClick={() => setActiveTab("collected")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "collected"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Collected NOC Archive ({collectedNocList.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Awaiting NOC Table */}
        {activeTab === "pending" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-28">ACTION</th>
                  <th className="px-4 py-3">SERIAL NO.</th>
                  <th className="px-4 py-3">LOAN NAME</th>
                  <th className="px-4 py-3">LENDING BANK</th>
                  <th className="px-4 py-3">LOAN AMOUNT</th>
                  <th className="px-4 py-3">LOAN START DATE</th>
                  <th className="px-4 py-3">LOAN END DATE</th>
                  <th className="px-4 py-3">CLOSURE REQUEST DATE</th>
                  <th className="px-4 py-3 text-center">DOCUMENT STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>Loading NOC checklist...</span>
                      </div>
                    </td>
                  </tr>
                ) : pendingNocList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          All loan facilities have NOC certificates collected
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          All satisfied charges have been archived.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingNocList.map((loan, index) => {
                    const serialNo = loan.sn
                      ? `LN-${String(loan.sn).padStart(3, "0")}`
                      : `LN-${String(index + 1).padStart(3, "0")}`;

                    const closureDate =
                      loan.foreclosureStatus === "Settled" || loan.status === "Closed"
                        ? loan.updatedAt || loan.startDate
                        : loan.foreclosureStatus === "Requested"
                        ? loan.updatedAt
                        : "-";

                    return (
                      <tr
                        key={loan.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Action - Leftmost */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleOpenCollectModal(loan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Collect NOC</span>
                          </button>
                        </td>

                        {/* Serial No. */}

                        {/* Serial No. */}
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {serialNo}
                        </td>

                        {/* Loan Name */}
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Coins className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{loan.loanName}</span>
                          </div>
                        </td>

                        {/* Lending Bank */}
                        <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {loan.bankName}
                        </td>

                        {/* Loan Amount */}
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(loan.loanAmount)}
                        </td>

                        {/* Loan Start Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(loan.startDate)}
                        </td>

                        {/* Loan End Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(loan.endDate || loan.maturityDate)}
                        </td>

                        {/* Closure Request Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(closureDate)}
                        </td>

                        {/* Document Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            <span>NOC Pending</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Collected NOC Archive */}
        {activeTab === "collected" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">SERIAL NO.</th>
                  <th className="px-4 py-3">LOAN NAME</th>
                  <th className="px-4 py-3">LENDING BANK</th>
                  <th className="px-4 py-3">LOAN START DATE</th>
                  <th className="px-4 py-3">LOAN END DATE</th>
                  <th className="px-4 py-3">NOC CERTIFICATE NO.</th>
                  <th className="px-4 py-3">COLLECTION DATE</th>
                  <th className="px-4 py-3 text-center">DOCUMENT STATUS</th>
                  <th className="px-4 py-3">RECORDED BY</th>
                  <th className="px-4 py-3">REMARKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>Loading NOC archive...</span>
                      </div>
                    </td>
                  </tr>
                ) : collectedNocList.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="h-8 w-8 text-slate-400/50" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No collected NOCs in archive
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Discharged loans with confirmed NOC certificates will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  collectedNocList.map((loan, index) => {
                    const serialNo = loan.sn
                      ? `LN-${String(loan.sn).padStart(3, "0")}`
                      : `LN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={loan.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
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

                        {/* Lending Bank */}
                        <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {loan.bankName}
                        </td>

                        {/* Loan Start Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(loan.startDate)}
                        </td>

                        {/* Loan End Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(loan.endDate || loan.maturityDate)}
                        </td>

                        {/* NOC Certificate No */}
                        <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {loan.nocNumber || "-"}
                        </td>

                        {/* Collection Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDateDDMMYYYY(loan.nocDate)}
                        </td>

                        {/* Document Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>NOC Received &amp; Cleared</span>
                          </span>
                        </td>

                        {/* Recorded By */}
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {loan.nocCollectedBy || "Admin"}
                        </td>

                        {/* Remarks */}
                        <td
                          className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate"
                          title={loan.nocRemarks}
                        >
                          {loan.nocRemarks || "Charge satisfied"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect NOC Modal */}
      {collectingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Bank NOC Clearance
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    {collectingLoan.loanName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCollectingLoan(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Loan Info Summary Card */}
            <div className="px-6 pt-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bank / Inst.</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {collectingLoan.bankName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Loan Amount</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                    {formatCurrency(collectingLoan.loanAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Loan Start Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 block">
                    {formatDateDDMMYYYY(collectingLoan.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Loan End Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 block">
                    {formatDateDDMMYYYY(collectingLoan.endDate || collectingLoan.maturityDate)}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmCollect} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Bank NOC Certificate / Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nocNumber}
                  onChange={(e) => setNocNumber(e.target.value)}
                  placeholder="e.g. NOC/HDFC/2026/88129"
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  NOC Issue / Receipt Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={nocDate}
                  onChange={(e) => setNocDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  ROC Satisfaction &amp; Handover Remarks
                </label>
                <textarea
                  value={nocRemarks}
                  onChange={(e) => setNocRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Original property deeds retrieved from bank branch. ROC Form CHG-4 filed."
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCollectingLoan(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{saving ? "Recording..." : "Save NOC Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
