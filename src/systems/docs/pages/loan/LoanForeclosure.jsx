import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Coins,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  Plus,
  History,
  X,
  Send,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  FileText,
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

export default function LoanForeclosure() {
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'settled'
  const [loans, setLoans] = useState([]);
  const [foreclosures, setForeclosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New Foreclosure Request Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [foreclosureReason, setForeclosureReason] = useState("");
  const [foreclosureRemarks, setForeclosureRemarks] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);

  // Settle Modal
  const [settlingFc, setSettlingFc] = useState(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementRemarks, setSettlementRemarks] = useState("");
  const [submittingSettle, setSubmittingSettle] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lns, fcs] = await Promise.all([
        loansApi.list(),
        loansApi.listForeclosures(),
      ]);
      setLoans(lns || []);
      setForeclosures(fcs || []);
    } catch (err) {
      console.error("Error loading foreclosures:", err);
      toast.error("Failed to load loan foreclosures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleChange = () => loadData();
    window.addEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
  }, []);

  const activeLoansForRequest = useMemo(() => {
    return loans.filter((l) => l.status === "Active" && l.foreclosureStatus !== "Requested");
  }, [loans]);

  const getLoanDetails = (fc) => {
    const loan = loans.find((l) => l.id === fc.loanId);
    return {
      sn: loan?.sn || fc.sn,
      loanName: loan?.loanName || fc.loanName,
      bankName: loan?.bankName || fc.bankName,
      loanAmount: loan?.loanAmount || fc.loanAmount || fc.outstandingAmount,
      outstandingAmount:
        loan?.outstandingAmount !== undefined ? loan.outstandingAmount : fc.outstandingAmount,
      emiAmount: loan?.emiAmount || fc.emiAmount || 0,
      startDate: loan?.startDate || fc.startDate,
      endDate: loan?.endDate || loan?.maturityDate || fc.endDate,
      collateralDocument: loan?.collateralDocument || fc.collateralDocument || "-",
      remarks: fc.remarks || fc.reason || loan?.remarks || "-",
      fileName: loan?.fileName || fc.fileName || "",
    };
  };

  const pendingForeclosures = useMemo(() => {
    return foreclosures
      .filter((f) => f.status !== "Settled")
      .filter((f) => {
        const q = searchQuery.toLowerCase();
        const details = getLoanDetails(f);
        const snText = details.sn ? `ln-${details.sn}` : "";
        return (
          !q ||
          details.loanName?.toLowerCase().includes(q) ||
          details.bankName?.toLowerCase().includes(q) ||
          details.collateralDocument?.toLowerCase().includes(q) ||
          details.remarks?.toLowerCase().includes(q) ||
          f.reason?.toLowerCase().includes(q) ||
          snText.includes(q)
        );
      });
  }, [foreclosures, loans, searchQuery]);

  const settledForeclosures = useMemo(() => {
    return foreclosures
      .filter((f) => f.status === "Settled")
      .filter((f) => {
        const q = searchQuery.toLowerCase();
        const details = getLoanDetails(f);
        const snText = details.sn ? `ln-${details.sn}` : "";
        return (
          !q ||
          details.loanName?.toLowerCase().includes(q) ||
          details.bankName?.toLowerCase().includes(q) ||
          details.collateralDocument?.toLowerCase().includes(q) ||
          details.remarks?.toLowerCase().includes(q) ||
          f.settledRemarks?.toLowerCase().includes(q) ||
          snText.includes(q)
        );
      });
  }, [foreclosures, loans, searchQuery]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!selectedLoanId) {
      toast.error("Please select an active loan facility");
      return;
    }
    if (!foreclosureReason.trim()) {
      toast.error("Please provide reason for foreclosure");
      return;
    }

    try {
      setSubmittingReq(true);
      await loansApi.foreclosureRequest(selectedLoanId, {
        reason: foreclosureReason,
        remarks: foreclosureRemarks,
      });

      toast.success("Foreclosure request initiated successfully!");
      setIsRequestModalOpen(false);
      setSelectedLoanId("");
      setForeclosureReason("");
      setForeclosureRemarks("");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit foreclosure request");
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleOpenSettleModal = (fc) => {
    setSettlingFc(fc);
    setSettlementAmount(fc.outstandingAmount || "");
    setSettlementRemarks("");
  };

  const handleConfirmSettle = async (e) => {
    e.preventDefault();
    if (!settlingFc) return;

    try {
      setSubmittingSettle(true);
      await loansApi.foreclosureApproveOrSettle(settlingFc.id, {
        action: "settle",
        settlementAmount,
        remarks: settlementRemarks,
      });

      toast.success(
        `Loan "${settlingFc.loanName}" settled and marked Closed! Proceed to NOC collection.`
      );
      setSettlingFc(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to settle foreclosure");
    } finally {
      setSubmittingSettle(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-800/50">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Document &amp; Subscription Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Platform <span className="text-slate-400 mx-1">›</span> Loan Foreclosure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Request Foreclosure</span>
          </button>
        </div>
      </div>

      {/* 2. Main Desk Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Loan Foreclosure &amp; Early Pre-Closure
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Initiate early loan payoff requests, settle pending balances, and initiate NOC tracking
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search foreclosure records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                Pending Requests ({pendingForeclosures.length})
              </button>
              <button
                onClick={() => setActiveTab("settled")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "settled"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Settled Archive ({settledForeclosures.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Pending Foreclosure Requests */}
        {activeTab === "pending" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-28">ACTION</th>
                  <th className="px-4 py-3">SERIAL NO.</th>
                  <th className="px-4 py-3">LOAN NAME</th>
                  <th className="px-4 py-3">BANK NAME</th>
                  <th className="px-4 py-3">AMOUNT</th>
                  <th className="px-4 py-3">EMI</th>
                  <th className="px-4 py-3">LOAN START DATE</th>
                  <th className="px-4 py-3">LOAN END DATE</th>
                  <th className="px-4 py-3">PROVIDED DOCUMENT</th>
                  <th className="px-4 py-3">REMARKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                        <span>Loading foreclosure queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : pendingForeclosures.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No pending foreclosure requests
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          All loan facilities are operating normally or already settled.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingForeclosures.map((fc, index) => {
                    const details = getLoanDetails(fc);
                    const serialNo = details.sn
                      ? `LN-${String(details.sn).padStart(3, "0")}`
                      : `LN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={fc.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Action - Leftmost */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleOpenSettleModal(fc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Settle &amp; Close</span>
                          </button>
                        </td>

                        {/* Serial No. */}
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {serialNo}
                        </td>

                        {/* Loan Name */}
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>{details.loanName}</span>
                          </div>
                        </td>

                        {/* Bank Name */}
                        <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {details.bankName}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {formatCurrency(details.loanAmount)}
                          </span>
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block">
                            Bal: {formatCurrency(details.outstandingAmount)}
                          </span>
                        </td>

                        {/* EMI */}
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {details.emiAmount ? formatCurrency(details.emiAmount) : "-"}
                        </td>

                        {/* Loan Start Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(details.startDate)}
                        </td>

                        {/* Loan End Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(details.endDate)}
                        </td>

                        {/* Provided Document (Collateral) */}
                        <td
                          className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate font-medium"
                          title={details.collateralDocument}
                        >
                          {details.collateralDocument}
                        </td>

                        {/* Remarks */}
                        <td
                          className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate"
                          title={details.remarks}
                        >
                          {details.remarks}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Settled Archive */}
        {activeTab === "settled" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">SERIAL NO.</th>
                  <th className="px-4 py-3">LOAN NAME</th>
                  <th className="px-4 py-3">BANK NAME</th>
                  <th className="px-4 py-3">SANCTIONED AMOUNT</th>
                  <th className="px-4 py-3">SETTLEMENT PAID</th>
                  <th className="px-4 py-3">EMI</th>
                  <th className="px-4 py-3">LOAN START DATE</th>
                  <th className="px-4 py-3">LOAN END DATE</th>
                  <th className="px-4 py-3">SETTLED DATE</th>
                  <th className="px-4 py-3 text-center">STATUS</th>
                  <th className="px-4 py-3">REMARKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                        <span>Loading settled foreclosures...</span>
                      </div>
                    </td>
                  </tr>
                ) : settledForeclosures.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="h-8 w-8 text-slate-400/50" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No settled foreclosures in archive
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Foreclosed facilities will appear here once settled.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  settledForeclosures.map((fc, index) => {
                    const details = getLoanDetails(fc);
                    const serialNo = details.sn
                      ? `LN-${String(details.sn).padStart(3, "0")}`
                      : `LN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={fc.id}
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
                            <span>{details.loanName}</span>
                          </div>
                        </td>

                        {/* Bank Name */}
                        <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {details.bankName}
                        </td>

                        {/* Sanctioned Amount */}
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(details.loanAmount)}
                        </td>

                        {/* Settlement Paid */}
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(fc.settlementAmount || fc.outstandingAmount)}
                        </td>

                        {/* EMI */}
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {details.emiAmount ? formatCurrency(details.emiAmount) : "-"}
                        </td>

                        {/* Loan Start Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(details.startDate)}
                        </td>

                        {/* Loan End Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(details.endDate)}
                        </td>

                        {/* Settled Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDateDDMMYYYY(fc.settledDate)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Fully Settled</span>
                          </span>
                        </td>

                        {/* Remarks */}
                        <td
                          className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate"
                          title={fc.settledRemarks || details.remarks}
                        >
                          {fc.settledRemarks || details.remarks}
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

      {/* Request Foreclosure Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-800/50">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Request Early Loan Foreclosure
                </h2>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Select Active Loan Facility <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                >
                  <option value="">-- Choose Loan Account --</option>
                  {activeLoansForRequest.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loanName} ({l.bankName} - Bal: {formatCurrency(l.outstandingAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Reason for Early Foreclosure <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={foreclosureReason}
                  onChange={(e) => setForeclosureReason(e.target.value)}
                  placeholder="e.g. Asset sale proceeds / internal treasury prepayment"
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  value={foreclosureRemarks}
                  onChange={(e) => setForeclosureRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Awaiting final foreclosure calculation sheet from bank branch"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submittingReq ? "Submitting..." : "Submit Foreclosure Request"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Foreclosure Modal */}
      {settlingFc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Settle &amp; Close Loan Facility
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Record full payoff and mark loan as closed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettlingFc(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Loan info preview */}
            <div className="px-6 pt-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Facility:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {settlingFc.loanName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Bank:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {settlingFc.bankName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Outstanding Balance:</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(settlingFc.outstandingAmount)}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmSettle} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Final Settlement Amount Paid (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  required
                  min="0"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Settlement Notes / UTR / Reference
                </label>
                <textarea
                  value={settlementRemarks}
                  onChange={(e) => setSettlementRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Paid in full via RTGS Ref #HDFC-991823. NOC requested from branch."
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSettlingFc(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSettle}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{submittingSettle ? "Settling..." : "Confirm & Settle Loan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
