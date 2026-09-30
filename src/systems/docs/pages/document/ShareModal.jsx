import { useState, useEffect } from "react";
import { X, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { documentsApi } from "../../services/docsLocalStorage";

export default function ShareModal({ isOpen, onClose, document, onShared }) {
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    subject: "",
    message: "",
  });
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (document) {
      const docTitle = document.documentName || "Document";
      setFormData({
        recipientName: "",
        recipientEmail: "",
        subject: `Sharing Document: ${docTitle}`,
        message: `Please find attached the document: ${docTitle}`,
      });
    }
  }, [document]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.recipientName.trim()) {
      toast.error("Please enter recipient name");
      return;
    }
    if (!formData.recipientEmail.trim()) {
      toast.error("Please enter recipient email");
      return;
    }

    try {
      setSharing(true);
      await documentsApi.recordShare({
        documentId: document.id,
        documentName: document.documentName,
        docSn: document.sn,
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        subject: formData.subject,
        message: formData.message,
        purpose: formData.subject,
        notes: formData.message,
        shareMethod: "Email",
      });
      toast.success(`Document shared with ${formData.recipientName}! Share logged.`);
      if (onShared) onShared();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to record document share");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-100/70 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Share via Email
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure direct document transmission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 text-xs">
          {/* Document Preview Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              DOCUMENT
            </label>
            <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 font-medium text-xs">
              <span className="text-base select-none">📄</span>
              <span className="truncate">{document.documentName}</span>
            </div>
          </div>

          {/* Recipient Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
              Recipient Name
            </label>
            <input
              type="text"
              name="recipientName"
              value={formData.recipientName}
              onChange={handleChange}
              placeholder="Enter recipient name"
              required
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
              Email Address
            </label>
            <input
              type="email"
              name="recipientEmail"
              value={formData.recipientEmail}
              onChange={handleChange}
              placeholder="recipient@example.com"
              required
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Enter subject"
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
              Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={3}
              placeholder="Enter message"
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-full font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sharing}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-full text-xs transition-colors shadow-xs cursor-pointer text-center"
            >
              {sharing ? "Sharing..." : "Share Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
