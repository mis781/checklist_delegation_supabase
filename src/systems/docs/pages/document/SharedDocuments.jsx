import { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Search,
  Share2,
  FileText,
  Phone,
  RefreshCw,
  Send,
  MessageCircle,
  Link as LinkIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { documentsApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import { formatDateTime } from "../../utils/dateFormatter";

export default function SharedDocuments() {
  const [shares, setShares] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("All");

  const loadData = async () => {
    try {
      setLoading(true);
      const [sharesData, docsData] = await Promise.all([
        documentsApi.listShares(),
        documentsApi.list(),
      ]);
      setShares(sharesData || []);
      setDocuments(docsData || []);
    } catch (err) {
      console.error("Error loading shared documents log:", err);
      toast.error("Failed to load share history");
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

  const docMap = useMemo(() => {
    const map = {};
    documents.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [documents]);

  const filteredShares = useMemo(() => {
    return shares.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.documentName?.toLowerCase().includes(q) ||
        item.recipientName?.toLowerCase().includes(q) ||
        item.recipientEmail?.toLowerCase().includes(q) ||
        item.subject?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q) ||
        item.purpose?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.sharedBy?.toLowerCase().includes(q) ||
        item.shareNo?.toLowerCase().includes(q);

      const matchesMethod = selectedMethod === "All" || item.shareMethod === selectedMethod;
      return matchesSearch && matchesMethod;
    });
  }, [shares, searchQuery, selectedMethod]);

  const methodCounts = useMemo(() => {
    return {
      total: shares.length,
      email: shares.filter((s) => s.shareMethod === "Email").length,
      whatsapp: shares.filter((s) => s.shareMethod === "WhatsApp").length,
      link: shares.filter((s) => s.shareMethod === "Direct Link").length,
    };
  }, [shares]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800/50">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Document &amp; Subscription Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Platform <span className="text-slate-400 mx-1">›</span> Doc &amp; Subscription
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Refresh log"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Quick KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Total Shares
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block font-mono">
            {methodCounts.total}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Via Email
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block font-mono">
            {methodCounts.email}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Via WhatsApp
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
            {methodCounts.whatsapp}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Direct Links
          </span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 block font-mono">
            {methodCounts.link}
          </span>
        </div>
      </div>

      {/* 3. Main Card with Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Shared Documents Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive audit trail of internal &amp; external document transmissions and access
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by recipient, document, purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Share Methods</option>
              <option value="Email">Email Delivery</option>
              <option value="WhatsApp">WhatsApp Share</option>
              <option value="Direct Link">Secure Link</option>
              <option value="Physical Copy">Physical Hard Copy</option>
            </select>
          </div>
        </div>

        {/* High-Contrast Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">SHARE NO.</th>
                <th className="px-4 py-3">SERIAL NO</th>
                <th className="px-4 py-3">DOCUMENT</th>
                <th className="px-4 py-3">RECIPIENT DETAILS</th>
                <th className="px-4 py-3 text-center">METHOD</th>
                <th className="px-4 py-3">SUBJECT / MESSAGE</th>
                <th className="px-4 py-3">SHARED BY &amp; TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span>Loading transmission records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredShares.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Mail className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        No share logs found
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Documents shared from the Document Vault will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShares.map((item, index) => {
                  const matchingDoc = docMap[item.documentId];
                  const docSerialNo = item.docSn
                    ? `SN-${String(item.docSn).padStart(3, "0")}`
                    : matchingDoc?.sn
                    ? `SN-${String(matchingDoc.sn).padStart(3, "0")}`
                    : "SN-001";

                  const shareNo = item.shareNo
                    ? item.shareNo
                    : item.sn
                    ? `SH-${String(item.sn).padStart(3, "0")}`
                    : `SH-${String(index + 1).padStart(3, "0")}`;

                  const displaySubject = item.subject || item.purpose;
                  const displayMessage = item.message || item.notes;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Share No. */}
                      <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {shareNo}
                      </td>

                      {/* Serial No. */}
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {docSerialNo}
                      </td>

                      {/* Document Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {item.documentName}
                          </span>
                        </div>
                      </td>

                      {/* Recipient Details */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            {item.recipientName}
                          </span>
                          {item.recipientEmail && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{item.recipientEmail}</span>
                            </div>
                          )}
                          {item.recipientPhone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{item.recipientPhone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Share Method */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.shareMethod === "Email"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50"
                              : item.shareMethod === "WhatsApp"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50"
                              : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50"
                          }`}
                        >
                          {item.shareMethod}
                        </span>
                      </td>

                      {/* Subject / Message */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 max-w-xs">
                          {displaySubject && (
                            <span className="font-medium text-slate-900 dark:text-slate-100 block">
                              {displaySubject}
                            </span>
                          )}
                          {displayMessage && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic block">
                              {displayMessage}
                            </span>
                          )}
                          {!displaySubject && !displayMessage && (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Shared By & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.sharedBy || "Admin User"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatDateTime(item.sharedAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
