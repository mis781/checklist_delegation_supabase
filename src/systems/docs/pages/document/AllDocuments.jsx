import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Mail,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Download,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { documentsApi, DOCS_DATA_CHANGED_EVENT } from "../../services/docsLocalStorage";
import AddDocumentModal from "./AddDocumentModal";
import EditDocumentModal from "./EditDocumentModal";
import ShareModal from "./ShareModal";

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

export default function AllDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedRenewalFilter, setSelectedRenewalFilter] = useState("All");

  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [sharingDoc, setSharingDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsApi.list();
      setDocuments(data || []);
    } catch (err) {
      console.error("Error loading documents:", err);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    const handleChange = () => loadDocuments();
    window.addEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(DOCS_DATA_CHANGED_EVENT, handleChange);
  }, []);

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.documentName}"?`)) {
      return;
    }
    try {
      await documentsApi.remove(doc.id);
      toast.success("Document deleted successfully");
      loadDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  // Unique categories and companies for filter dropdowns
  const categories = useMemo(() => {
    const set = new Set(documents.map((d) => d.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [documents]);

  const companies = useMemo(() => {
    const set = new Set(documents.map((d) => d.companyName).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [documents]);

  // Filtered documents
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

      const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
      const matchesCompany = selectedCompany === "All" || doc.companyName === selectedCompany;

      let matchesRenewal = true;
      if (selectedRenewalFilter === "NeedsRenewal") {
        matchesRenewal = doc.needsRenewal === "Yes";
      } else if (selectedRenewalFilter === "Permanent") {
        matchesRenewal = doc.needsRenewal !== "Yes";
      } else if (selectedRenewalFilter === "ExpiringSoon") {
        if (doc.needsRenewal === "Yes" && doc.renewalDate) {
          const target = new Date(doc.renewalDate);
          const today = new Date();
          const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
          matchesRenewal = diffDays >= 0 && diffDays <= 30;
        } else {
          matchesRenewal = false;
        }
      } else if (selectedRenewalFilter === "Overdue") {
        if (doc.needsRenewal === "Yes" && doc.renewalDate) {
          const target = new Date(doc.renewalDate);
          const today = new Date();
          matchesRenewal = target < today;
        } else {
          matchesRenewal = false;
        }
      }

      return matchesSearch && matchesCategory && matchesCompany && matchesRenewal;
    });
  }, [documents, searchQuery, selectedCategory, selectedCompany, selectedRenewalFilter]);

  // Handle selection toggles
  const isAllSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((doc) => selectedIds.includes(doc.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDocuments.map((d) => d.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleViewFile = (doc) => {
    setPreviewDoc(doc);
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
            <FileText className="h-5 w-5" />
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

      {/* 2. Main Section / Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Sub Header / Control Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Document Vault
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage compliance contracts, licenses &amp; certificates
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

            {/* Renewal Status Filter */}
            <select
              value={selectedRenewalFilter}
              onChange={(e) => setSelectedRenewalFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Renewal Statuses</option>
              <option value="ExpiringSoon">Expiring Soon (≤ 30 Days)</option>
              <option value="Overdue">Overdue for Renewal</option>
              <option value="NeedsRenewal">Requires Renewal</option>
              <option value="Permanent">Permanent / No Renewal</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadDocuments}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* Add Document Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Document</span>
            </button>
          </div>
        </div>

        {/* 3. High-Contrast Table matching reference */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-center w-14">SHARE</th>
                <th className="px-3 py-3 text-center w-20">ACTION</th>
                <th className="px-4 py-3">SERIAL NO</th>
                <th className="px-4 py-3">DOCUMENT NAME</th>
                <th className="px-4 py-3">DOCUMENT TYPE</th>
                <th className="px-4 py-3">CATEGORY</th>
                <th className="px-4 py-3">COMPANY</th>
                <th className="px-4 py-3">NAME</th>
                <th className="px-4 py-3 text-center">RENEWAL</th>
                <th className="px-4 py-3">RENEWAL DATE</th>
                <th className="px-4 py-3 text-center">FILE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="12" className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span>Loading document vault...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">No documents found</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Try adjusting your filters or click "+ Add Document" to register one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc, index) => {
                  const serialNo = doc.sn
                    ? `SN-${String(doc.sn).padStart(3, "0")}`
                    : `SN-${String(index + 1).padStart(3, "0")}`;
                  const isSelected = selectedIds.includes(doc.id);
                  const isRenewal = doc.needsRenewal === "Yes";

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(doc.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Share Icon */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={() => setSharingDoc(doc)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Share via Email"
                        >
                          <Mail className="h-3.5 w-3.5 mx-auto" />
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingDoc(doc)}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition-colors cursor-pointer"
                            title="Edit Document"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-1 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Serial No */}
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {serialNo}
                      </td>

                      {/* Document Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {doc.documentName}
                          </span>
                        </div>
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

                      {/* Company */}
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {doc.companyName || "-"}
                      </td>

                      {/* Name (Person Name / Holder Name) */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {doc.personName || "-"}
                      </td>

                      {/* Renewal */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {isRenewal ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            No
                          </span>
                        )}
                      </td>

                      {/* Renewal Date */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {isRenewal && doc.renewalDate ? formatDateDDMMYYYY(doc.renewalDate) : "-"}
                      </td>

                      {/* File (View) */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleViewFile(doc)}
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
      </div>

      {/* Preview Attachments Modal */}
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

              {/* Document Summary Info */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Company</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {previewDoc.companyName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Name / Person</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {previewDoc.personName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Renewal Status</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {previewDoc.needsRenewal === "Yes" ? `Yes (${formatDateDDMMYYYY(previewDoc.renewalDate)})` : "Permanent (No)"}
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

      {/* Modals */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={loadDocuments}
      />
      <EditDocumentModal
        isOpen={!!editingDoc}
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onUpdated={loadDocuments}
      />
      <ShareModal
        isOpen={!!sharingDoc}
        document={sharingDoc}
        onClose={() => setSharingDoc(null)}
        onShared={loadDocuments}
      />
    </div>
  );
}
