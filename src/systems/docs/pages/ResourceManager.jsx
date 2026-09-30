import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  CreditCard,
  Plus,
  Search,
  Layers,
  Building2,
  Trash2,
  Edit2,
  Share2,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Paperclip,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  documentsApi,
  subscriptionsApi,
  DOCS_DATA_CHANGED_EVENT,
} from "../services/docsLocalStorage";
import {
  formatDate,
  formatCurrency,
  isExpiringSoon,
  isOverdue,
  getDaysUntil,
} from "../utils/dateFormatter";
import AddDocumentModal from "./document/AddDocumentModal";
import EditDocumentModal from "./document/EditDocumentModal";
import ShareModal from "./document/ShareModal";
import AddSubscriptionModal from "./subscription/AddSubscriptionModal";

export default function ResourceManager() {
  const [activeTab, setActiveTab] = useState("subscriptions"); // 'documents' | 'subscriptions'
  
  // Data State
  const [documents, setDocuments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocCategory, setSelectedDocCategory] = useState("All");
  const [selectedSubFrequency, setSelectedSubFrequency] = useState("All");

  // Modal State
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [sharingDoc, setSharingDoc] = useState(null);
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);

  // Load All Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [docsData, subsData] = await Promise.all([
        documentsApi.list(),
        subscriptionsApi.list(),
      ]);
      setDocuments(docsData || []);
      setSubscriptions(subsData || []);
    } catch (err) {
      console.error("Error loading resources:", err);
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDataChange = () => loadData();
    window.addEventListener(DOCS_DATA_CHANGED_EVENT, handleDataChange);
    return () => window.removeEventListener(DOCS_DATA_CHANGED_EVENT, handleDataChange);
  }, []);

  // Filtered Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        sub.subscriptionName?.toLowerCase().includes(q) ||
        sub.serviceName?.toLowerCase().includes(q) ||
        sub.subscriberName?.toLowerCase().includes(q) ||
        sub.companyName?.toLowerCase().includes(q) ||
        sub.purpose?.toLowerCase().includes(q);

      const matchesFreq =
        selectedSubFrequency === "All" || sub.frequency === selectedSubFrequency;

      return matchesSearch && matchesFreq;
    });
  }, [subscriptions, searchQuery, selectedSubFrequency]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        doc.documentName?.toLowerCase().includes(q) ||
        doc.personName?.toLowerCase().includes(q) ||
        doc.documentType?.toLowerCase().includes(q) ||
        doc.category?.toLowerCase().includes(q) ||
        doc.companyName?.toLowerCase().includes(q) ||
        doc.fileName?.toLowerCase().includes(q) ||
        doc.remarks?.toLowerCase().includes(q);

      const matchesCategory =
        selectedDocCategory === "All" || doc.category === selectedDocCategory;

      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedDocCategory]);

  // Handle Document Delete
  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete document "${doc.documentName}"?`)) {
      return;
    }
    try {
      await documentsApi.remove(doc.id);
      toast.success("Document deleted successfully");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-800/50">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Document & Subscription Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Platform <span className="text-slate-400 mx-1">›</span> Doc & Subscription
            </p>
          </div>
        </div>
      </div>

      {/* 2. Wide Tab Bar Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs">
        <div className="grid grid-cols-2 gap-1.5">
          {/* Documents Tab */}
          <button
            onClick={() => {
              setActiveTab("documents");
              setSearchQuery("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "documents"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Documents Management</span>
          </button>

          {/* Subscriptions Tab */}
          <button
            onClick={() => {
              setActiveTab("subscriptions");
              setSearchQuery("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "subscriptions"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Subscriptions Management</span>
          </button>
        </div>
      </div>

      {/* 3. Main Data Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Card Header with Search, Filter & Action Button */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {activeTab === "subscriptions" ? "All Subscriptions" : "All Documents"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeTab === "subscriptions"
                ? "Track software, services, and cloud recurring costs"
                : "Securely store, organize, and monitor statutory certificates, licenses, and contracts"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 lg:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "subscriptions"
                    ? "Search subscriptions..."
                    : "Search documents..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Filter Dropdown */}
            {activeTab === "subscriptions" ? (
              <select
                value={selectedSubFrequency}
                onChange={(e) => setSelectedSubFrequency(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              >
                <option value="All">All Frequencies</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Yearly">Yearly</option>
              </select>
            ) : (
              <select
                value={selectedDocCategory}
                onChange={(e) => setSelectedDocCategory(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              >
                <option value="All">All Categories</option>
                <option value="Company">Company</option>
                <option value="Director">Director</option>
                <option value="Personal">Personal</option>
              </select>
            )}

            {/* Primary Action Button */}
            {activeTab === "subscriptions" ? (
              <button
                onClick={() => setIsAddSubModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subscription</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAddDocModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Document</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Subscriptions Table */}
        {activeTab === "subscriptions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-12">SERIAL NO</th>
                  <th className="px-4 py-3">REQUESTED DATE</th>
                  <th className="px-4 py-3">COMPANY NAME</th>
                  <th className="px-4 py-3">SUBSCRIBER</th>
                  <th className="px-4 py-3">SUBSCRIPTION</th>
                  <th className="px-4 py-3">PRICE</th>
                  <th className="px-4 py-3">FREQUENCY</th>
                  <th className="px-4 py-3">PURPOSE</th>
                  <th className="px-4 py-3">START DATE</th>
                  <th className="px-4 py-3">END DATE</th>
                  <th className="px-4 py-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400 italic">
                      Loading subscriptions...
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400 italic">
                      No subscriptions found.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub, index) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(sub.requestedDate || sub.createdAt)}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {sub.companyName}
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {sub.subscriberName}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {sub.subscriptionName}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(sub.price)}
                      </td>

                      <td className="px-4 py-3 uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {sub.frequency}
                      </td>

                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {sub.purpose || "-"}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(sub.requestedDate || sub.createdAt)}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(sub.renewalDate)}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            sub.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                              : sub.status === "Approved"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50"
                              : sub.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Documents Table */}
        {activeTab === "documents" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-12">SERIAL NO</th>
                  <th className="px-4 py-3">DOCUMENT NAME</th>
                  <th className="px-4 py-3">DOCUMENT TYPE</th>
                  <th className="px-4 py-3">CATEGORY</th>
                  <th className="px-4 py-3">COMPANY NAME</th>
                  <th className="px-4 py-3">RENEWAL / EXPIRY</th>
                  <th className="px-4 py-3">ATTACHMENT</th>
                  <th className="px-4 py-3 text-center">STATUS</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400 italic">
                      Loading documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400 italic">
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc, index) => {
                    const hasRenewal = doc.needsRenewal === "Yes" && doc.renewalDate;
                    const daysLeft = hasRenewal ? getDaysUntil(doc.renewalDate) : null;
                    const overdue = hasRenewal ? isOverdue(doc.renewalDate) : false;
                    const expiring = hasRenewal ? isExpiringSoon(doc.renewalDate, 30) : false;

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>{doc.documentName}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {doc.documentType}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {doc.category}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{doc.companyName}</div>
                            {doc.personName && (
                              <span className="text-[11px] text-slate-400 block">
                                {doc.personName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {hasRenewal ? formatDate(doc.renewalDate) : "Permanent"}
                        </td>

                        <td className="px-4 py-3">
                          {doc.attachments && doc.attachments.length > 1 ? (
                            <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                              <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                              <span
                                className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2 py-0.5 rounded-full text-[10px]"
                                title={doc.attachments.map((a) => a.name).join("\n")}
                              >
                                {doc.attachments.length} files
                              </span>
                            </div>
                          ) : doc.fileName ? (
                            <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[130px]" title={doc.fileName}>
                                {doc.fileName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No file</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {hasRenewal ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                overdue
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                                  : expiring
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                              }`}
                            >
                              {overdue ? (
                                <>
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Overdue</span>
                                </>
                              ) : expiring ? (
                                <>
                                  <Clock className="h-3 w-3" />
                                  <span>Expiring Soon</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Active</span>
                                </>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                              Permanent
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSharingDoc(doc)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                              title="Share document"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingDoc(doc)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Edit document"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      {/* Modals */}
      <AddDocumentModal
        isOpen={isAddDocModalOpen}
        onClose={() => setIsAddDocModalOpen(false)}
        onCreated={loadData}
      />

      <EditDocumentModal
        isOpen={Boolean(editingDoc)}
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onUpdated={loadData}
      />

      <ShareModal
        isOpen={Boolean(sharingDoc)}
        document={sharingDoc}
        onClose={() => setSharingDoc(null)}
        onShared={loadData}
      />

      <AddSubscriptionModal
        isOpen={isAddSubModalOpen}
        onClose={() => setIsAddSubModalOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
}
