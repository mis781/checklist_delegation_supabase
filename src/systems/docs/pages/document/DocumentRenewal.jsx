import { useState, useEffect, useMemo, useRef } from "react";
import {
  RotateCcw,
  Calendar,
  FileText,
  Search,
  RefreshCw,
  X,
  Upload,
  Download,
  Paperclip,
  CheckCircle2,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { documentsApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";

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

// Clean format label like "PDF (.pdf)" -> "PDF"
const cleanDocType = (typeStr) => {
  if (!typeStr) return "PDF";
  return typeStr.split(" ")[0].toUpperCase();
};

export default function DocumentRenewal() {
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'history'
  const [documents, setDocuments] = useState([]);
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");

  // Renew Action Modal
  const [renewingDoc, setRenewingDoc] = useState(null);
  const [renewNextPeriod, setRenewNextPeriod] = useState(true);
  const [nextRenewalDate, setNextRenewalDate] = useState("");
  const [newDocumentFile, setNewDocumentFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Preview / View File Modal
  const [previewDoc, setPreviewDoc] = useState(null);

  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, history] = await Promise.all([
        documentsApi.list(),
        documentsApi.listRenewals(),
      ]);
      setDocuments(docs || []);
      setRenewalHistory(history || []);
    } catch (err) {
      console.error("Error loading renewals:", err);
      toast.error("Failed to load renewal records");
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

  // Unique categories and companies
  const categories = useMemo(() => {
    const set = new Set(documents.map((d) => d.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [documents]);

  const companies = useMemo(() => {
    const set = new Set(documents.map((d) => d.companyName).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [documents]);

  // Filter documents that need renewal
  const renewableDocs = useMemo(() => {
    return documents
      .filter((d) => d.needsRenewal === "Yes")
      .filter((d) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          d.documentName?.toLowerCase().includes(q) ||
          d.personName?.toLowerCase().includes(q) ||
          d.companyName?.toLowerCase().includes(q) ||
          d.documentType?.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q);

        const matchesCat = selectedCategory === "All" || d.category === selectedCategory;
        const matchesCo = selectedCompany === "All" || d.companyName === selectedCompany;

        return matchesSearch && matchesCat && matchesCo;
      })
      .sort((a, b) => {
        if (!a.renewalDate) return 1;
        if (!b.renewalDate) return -1;
        return new Date(a.renewalDate) - new Date(b.renewalDate);
      });
  }, [documents, searchQuery, selectedCategory, selectedCompany]);

  // Filter renewal history
  const filteredHistory = useMemo(() => {
    return renewalHistory.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.documentName?.toLowerCase().includes(q) ||
        item.personName?.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q) ||
        item.receiptNumber?.toLowerCase().includes(q) ||
        item.renewedBy?.toLowerCase().includes(q);

      const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchesCo = selectedCompany === "All" || item.companyName === selectedCompany;

      return matchesSearch && matchesCat && matchesCo;
    });
  }, [renewalHistory, searchQuery, selectedCategory, selectedCompany]);

  const handleOpenRenewModal = (doc) => {
    setRenewingDoc(doc);
    setRenewNextPeriod(true);
    // Suggest default new renewal date (1 year from current renewal date)
    if (doc.renewalDate) {
      const d = new Date(doc.renewalDate);
      d.setFullYear(d.getFullYear() + 1);
      setNextRenewalDate(d.toISOString().split("T")[0]);
    } else {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setNextRenewalDate(d.toISOString().split("T")[0]);
    }
    setNewDocumentFile(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewDocumentFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
  };

  const handleConfirmRenewal = async (e) => {
    e.preventDefault();
    if (renewNextPeriod && !nextRenewalDate) {
      toast.error("Please enter the next renewal date");
      return;
    }

    try {
      setSaving(true);
      await documentsApi.recordRenewal(renewingDoc.id, {
        newRenewalDate: renewNextPeriod ? nextRenewalDate : null,
        needsRenewal: renewNextPeriod ? "Yes" : "No",
        renewNextPeriod,
        fileName: newDocumentFile ? newDocumentFile.name : undefined,
        attachments: newDocumentFile
          ? [{ name: newDocumentFile.name, size: newDocumentFile.size, type: newDocumentFile.type }]
          : undefined,
      });
      toast.success(`Renewal recorded for "${renewingDoc.documentName}"!`);
      setRenewingDoc(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to record renewal");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFile = (fileName) => {
    toast.success(`Downloading ${fileName || "document.pdf"}...`);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800/50">
            <RotateCcw className="h-5 w-5" />
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
      </div>

      {/* 2. Main Section Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub-Header / Control Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Document Renewals
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage upcoming and historical document renewals
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>

            {/* Company Filter */}
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {companies.map((co) => (
                <option key={co} value={co}>
                  {co === "All" ? "All Companies" : co}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* Tab Pill Switcher (Pending / History) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "pending"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pending ({renewableDocs.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                History ({filteredHistory.length})
              </button>
            </div>
          </div>
        </div>

        {/* 3. Pending Table */}
        {activeTab === "pending" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-28">ACTION</th>
                  <th className="px-4 py-3">SERIAL NO</th>
                  <th className="px-4 py-3">DOCUMENT NAME</th>
                  <th className="px-4 py-3">DOCUMENT TYPE</th>
                  <th className="px-4 py-3">CATEGORY</th>
                  <th className="px-4 py-3">NAME</th>
                  <th className="px-4 py-3">ENTRY DATE</th>
                  <th className="px-4 py-3">RENEWAL</th>
                  <th className="px-4 py-3 text-center">FILE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span>Loading pending renewals...</span>
                      </div>
                    </td>
                  </tr>
                ) : renewableDocs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No documents currently pending renewal
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          All tracked document lifecycles are up to date.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  renewableDocs.map((doc, index) => {
                    const serialNo = doc.sn
                      ? `SN-${String(doc.sn).padStart(3, "0")}`
                      : `SN-${String(index + 1).padStart(3, "0")}`;

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Action: Renewal Button */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleOpenRenewModal(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Renewal</span>
                          </button>
                        </td>

                        {/* Serial No */}
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {serialNo}
                        </td>

                        {/* Document Name */}
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {doc.documentName}
                          </span>
                        </td>

                        {/* Document Type */}
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                          {cleanDocType(doc.documentType)}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                            {doc.category || "Company"}
                          </span>
                        </td>

                        {/* Name (Person Name / Entity Name) */}
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100 uppercase whitespace-nowrap">
                          {doc.personName || doc.companyName || "-"}
                        </td>

                        {/* Entry Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(doc.issueDate || doc.createdAt)}
                        </td>

                        {/* Renewal Date */}
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {formatDateDDMMYYYY(doc.renewalDate)}
                        </td>

                        {/* File (View) */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-[11px] hover:underline cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. History Table */}
        {activeTab === "history" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">SERIAL NO</th>
                  <th className="px-4 py-3">DOCUMENT NAME</th>
                  <th className="px-4 py-3">DOCUMENT TYPE</th>
                  <th className="px-4 py-3">CATEGORY</th>
                  <th className="px-4 py-3">NAME</th>
                  <th className="px-4 py-3">PREVIOUS EXPIRY</th>
                  <th className="px-4 py-3">NEW EXPIRY DATE</th>
                  <th className="px-4 py-3">RENEWED BY &amp; DATE</th>
                  <th className="px-4 py-3 text-center">FILE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      Loading renewal history...
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          No renewal history recorded yet
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.sn ? `SN-${String(item.sn).padStart(3, "0")}` : `SN-${String(index + 1).padStart(3, "0")}`}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {item.documentName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        {cleanDocType(item.documentType)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                          {item.category || "Company"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100 uppercase whitespace-nowrap">
                        {item.personName || item.companyName || "-"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDateDDMMYYYY(item.previousRenewalDate)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatDateDDMMYYYY(item.newRenewalDate)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-900 dark:text-slate-100 block">
                          {item.renewedBy}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateDDMMYYYY(item.renewedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {item.fileName ? (
                          <button
                            onClick={() => handleDownloadFile(item.fileName)}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-[11px] hover:underline cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Process Document Renewal Modal (Matching Screenshot) */}
      {renewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between bg-white dark:bg-slate-900 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Process Document Renewal
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Extend lifecycle and attach revised agreement
                </p>
              </div>
              <button
                onClick={() => setRenewingDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmRenewal} className="p-6 space-y-4 text-xs">
              {/* 1. Document Info Container */}
              <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                    DOCUMENT
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    {renewingDoc.documentName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                      SERIAL NO
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {renewingDoc.sn ? `SN-${String(renewingDoc.sn).padStart(3, "0")}` : "SN-001"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                      NAME
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase truncate block">
                      {renewingDoc.personName || renewingDoc.companyName || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Renew Next Period? Toggle Switch */}
              <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    Renew Next Period?
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Keep tracking future expiry date
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRenewNextPeriod(!renewNextPeriod)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    renewNextPeriod ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  role="switch"
                  aria-checked={renewNextPeriod}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      renewNextPeriod ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 3. Next Renewal Date Input */}
              {renewNextPeriod && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Next Renewal Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={nextRenewalDate}
                      onChange={(e) => setNextRenewalDate(e.target.value)}
                      required={renewNextPeriod}
                      className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* 4. New Document File Upload */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  New Document File
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {newDocumentFile ? (
                  <div className="flex items-center justify-between p-3 border border-blue-200 dark:border-blue-800/80 rounded-xl bg-blue-50/60 dark:bg-blue-950/40">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                          {newDocumentFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {(newDocumentFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewDocumentFile(null)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium">Upload New Document Version</span>
                  </button>
                )}
              </div>

              {/* 5. Footer Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRenewingDoc(null)}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center text-xs"
                >
                  <span>{saving ? "Saving..." : "Save Renewal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Preview Attachments Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {previewDoc.documentName}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {previewDoc.category} • {previewDoc.documentType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Attached Files &amp; Documents
              </p>

              {previewDoc.attachments && previewDoc.attachments.length > 0 ? (
                <div className="space-y-2">
                  {previewDoc.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/60 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Paperclip className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {att.name}
                          </p>
                          {att.size && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              {(att.size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(att.name)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : previewDoc.fileName ? (
                <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {previewDoc.fileName}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(previewDoc.fileName)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <FileText className="h-6 w-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium">No files attached to this document</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Owner / Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                    {previewDoc.personName || previewDoc.companyName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Renewal Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateDDMMYYYY(previewDoc.renewalDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
