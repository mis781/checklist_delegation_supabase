import { useState, useEffect } from "react";
import { X, Upload, FileText, Calendar, Building2, Tag, AlertCircle, Trash2, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { documentsApi } from "../../services/docsLocalStorage";

const DOCUMENT_TYPES = [
  "PDF (.pdf)",
  "Word (.docx, .doc)",
  "Excel (.xlsx, .xls)",
  "PowerPoint (.pptx, .ppt)",
  "Image (.jpg, .png, .jpeg)",
  "Text (.txt)",
  "CSV (.csv)",
  "ZIP / Archive (.zip, .rar)",
  "Other",
];

const CATEGORIES = [
  "Personal",
  "Company",
  "Director",
];

const COMPANIES = [
  "Nutech Engineering",
  "Nutech Systems Pvt Ltd",
  "Nutech Auto Components",
  "Nutech Industries",
];

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function EditDocumentModal({ isOpen, onClose, document, onUpdated }) {
  const [formData, setFormData] = useState({
    documentName: "",
    personName: "",
    documentType: "PDF (.pdf)",
    category: "Company",
    companyName: "Nutech Engineering",
    needsRenewal: "Yes",
    renewalDate: "",
    fileName: "",
    remarks: "",
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setFormData({
        documentName: document.documentName || "",
        personName: document.personName || document.holderName || document.name || "",
        documentType: document.documentType || "PDF (.pdf)",
        category: document.category || "Company",
        companyName: document.companyName || "Nutech Engineering",
        needsRenewal: document.needsRenewal === "Yes" ? "Yes" : "No",
        renewalDate: document.renewalDate || "",
        fileName: document.fileName || "",
        remarks: document.remarks || "",
      });

      if (document.attachments && Array.isArray(document.attachments)) {
        setAttachedFiles(document.attachments);
      } else if (document.fileName) {
        setAttachedFiles([{ name: document.fileName, size: 0 }]);
      } else {
        setAttachedFiles([]);
      }
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    if (newFiles.length === 0) return;

    if (attachedFiles.length + newFiles.length > 10) {
      toast.error("You can upload a maximum of 10 attachments");
      const allowedCount = 10 - attachedFiles.length;
      if (allowedCount > 0) {
        setAttachedFiles((prev) => [...prev, ...newFiles.slice(0, allowedCount)]);
      }
    } else {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const handleRemoveFile = (indexToRemove) => {
    setAttachedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.documentName.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    try {
      setSaving(true);
      await documentsApi.update(document.id, {
        ...formData,
        attachments: attachedFiles,
        fileName: attachedFiles.length > 0 ? attachedFiles.map((a) => a.name).join(", ") : formData.fileName || "document.pdf",
      });
      toast.success("Document updated successfully!");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Document Details</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Update compliance metadata, name & attachments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Document Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="documentName"
              value={formData.documentName}
              onChange={handleChange}
              placeholder="e.g. Factory License 2026-27"
              required
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Grid: Document Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                name="documentType"
                value={formData.documentType}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Company Name & Name Field */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Company / Entity <span className="text-red-500">*</span>
              </label>
              <select
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              >
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Name <span className="text-slate-400 font-normal">({formData.category === "Director" ? "Director Name" : formData.category === "Personal" ? "Person Name" : "Holder / Person Name"})</span>
              </label>
              <input
                type="text"
                name="personName"
                value={formData.personName}
                onChange={handleChange}
                placeholder="e.g. John Doe / Director Name"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Needs Renewal & Renewal Date */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Does this require periodic renewal?</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Track expiration and get reminder alerts</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="needsRenewal"
                    value="Yes"
                    checked={formData.needsRenewal === "Yes"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-200">Yes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="needsRenewal"
                    value="No"
                    checked={formData.needsRenewal === "No"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-200">No</span>
                </label>
              </div>
            </div>

            {formData.needsRenewal === "Yes" && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Renewal / Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="renewalDate"
                  value={formData.renewalDate}
                  onChange={handleChange}
                  required={formData.needsRenewal === "Yes"}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            )}
          </div>

          {/* Multiple File Attachments (Up to 10) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-200">
                Document Files / Attachments
              </label>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                attachedFiles.length >= 10
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}>
                {attachedFiles.length} / 10 files
              </span>
            </div>

            {/* Upload Area */}
            {attachedFiles.length < 10 && (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-3.5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                <input
                  type="file"
                  id="edit-doc-file-upload-multi"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv,.zip,.rar"
                />
                <label htmlFor="edit-doc-file-upload-multi" className="cursor-pointer flex flex-col items-center gap-1">
                  <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    <Upload className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Click to add files (Select up to 10 attachments)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT, ZIP (up to 25MB each)
                  </span>
                </label>
              </div>
            )}

            {/* List of Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate block max-w-[280px]">
                          {file.name}
                        </span>
                        {file.size > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatFileSize(file.size)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                      title="Remove attachment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Remarks / Notes
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional notes, reference numbers, or physical vault shelf location..."
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
