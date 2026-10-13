import { useState, useEffect } from "react";
import { X, Mail, MessageCircle, Send, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { documentsApi } from "../../services/docsLocalStorage";
import { fetchInboxConversations } from "../../../whatsappDash/services/whatsappApi";
import { sendDocsSubscriptionNotification } from "../../../../services/whatsappService";

export default function ShareModal({ isOpen, onClose, document, onShared }) {
  // "email" | "whatsapp"
  const [activeTab, setActiveTab] = useState("email");

  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    subject: "",
    message: "",
  });
  const [sharing, setSharing] = useState(false);

  // WhatsApp state
  const [inboxContacts, setInboxContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContactOption, setSelectedContactOption] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [sharingWa, setSharingWa] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInboxContacts();
    }
  }, [isOpen]);

  const loadInboxContacts = async () => {
    try {
      setLoadingContacts(true);
      const rows = await fetchInboxConversations();
      const map = new Map();
      (rows || []).forEach((row) => {
        const rawPhone = row.raw_phone_number || row.phone_number;
        if (!rawPhone) return;
        const phoneStr = String(rawPhone).trim();
        const cleanPhone = phoneStr.replace(/^\+/, "");
        if (!cleanPhone) return;
        if (!map.has(cleanPhone)) {
          const name =
            row.display_name ||
            row.external_contact_name ||
            (phoneStr.startsWith("+") ? phoneStr : `+${phoneStr}`);
          map.set(cleanPhone, {
            id: row.conversation_id || cleanPhone,
            name,
            phone: cleanPhone,
            displayPhone: phoneStr.startsWith("+") ? phoneStr : `+${phoneStr}`,
          });
        }
      });
      const contactList = Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setInboxContacts(contactList);
    } catch (err) {
      console.error("Failed to load WhatsApp contacts:", err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (document) {
      const docTitle = document.documentName || "Document";
      setFormData({
        recipientName: "",
        recipientEmail: "",
        subject: `Sharing Document: ${docTitle}`,
        message: `Please find attached the document: ${docTitle}`,
      });
      setSelectedContactOption("");
      setCustomPhone("");
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

  // ── Email Submit ──────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
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

  // ── WhatsApp Direct Send ──────────────────────────────────────────────────
  const handleWhatsAppShare = async (e) => {
    if (e) e.preventDefault();
    let targetPhone = "";
    let recipientName = "";

    if (selectedContactOption === "new") {
      targetPhone = customPhone.trim();
      recipientName = "New Contact";
    } else if (selectedContactOption) {
      targetPhone = selectedContactOption;
      const found = inboxContacts.find((c) => c.phone === selectedContactOption);
      recipientName = found ? found.name : selectedContactOption;
    }

    if (!targetPhone) {
      toast.error("Please select a contact or enter a mobile number");
      return;
    }

    const digitsOnly = targetPhone.replace(/\D/g, "");
    if (digitsOnly.length < 7) {
      toast.error("Please enter a valid mobile number");
      return;
    }

    try {
      setSharingWa(true);

      const fileUrl =
        document.fileUrl ||
        (Array.isArray(document.attachments) && document.attachments[0]?.url) ||
        "";
      const fileName =
        document.fileName ||
        (Array.isArray(document.attachments) && document.attachments[0]?.name) ||
        `${document.documentName || "Document"}.pdf`;

      // Dispatch Meta WhatsApp template with document as header
      await sendDocsSubscriptionNotification({
        phoneNumber: digitsOnly,
        recipientName: recipientName || "User",
        documentTitle: document.documentName || "Document",
        fileUrl,
        fileName,
      });

      await documentsApi.recordShare({
        documentId: document.id,
        documentName: document.documentName,
        docSn: document.sn,
        recipientName: recipientName,
        recipientPhone: targetPhone,
        recipientEmail: "",
        subject: `Document Share: ${document.documentName}`,
        message: `Document dispatched via WhatsApp template (docs_subscription_dispatch)`,
        purpose: "WhatsApp Document Share",
        notes: `Direct WhatsApp dispatch to ${targetPhone} with document header`,
        shareMethod: "WhatsApp",
      });

      toast.success(`Document sent via WhatsApp to ${targetPhone}!`);
      if (onShared) onShared();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to dispatch WhatsApp document");
    } finally {
      setSharingWa(false);
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
                Share Document
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a sharing method
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

        {/* Tabs */}
        <div className="px-6 pb-3 flex gap-2">
          <button
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "email"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-green-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </button>
        </div>

        {/* ── EMAIL FORM ── */}
        {activeTab === "email" && (
          <form onSubmit={handleEmailSubmit} className="px-6 pb-6 space-y-4 text-xs">
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
                {sharing ? "Sharing..." : "Share via Email"}
              </button>
            </div>
          </form>
        )}

        {/* ── WHATSAPP FORM ── */}
        {activeTab === "whatsapp" && (
          <form onSubmit={handleWhatsAppShare} className="px-6 pb-6 space-y-4 text-xs">
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

            {/* Mobile Number Dropdown */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
                Mobile Number
              </label>
              <select
                value={selectedContactOption}
                onChange={(e) => {
                  setSelectedContactOption(e.target.value);
                  if (e.target.value !== "new") setCustomPhone("");
                }}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              >
                <option value="">
                  {loadingContacts
                    ? "Loading inbox contacts..."
                    : "-- Choose a contact or enter new number --"}
                </option>
                <option value="new">+ New Contact (Enter mobile number)</option>
                {inboxContacts.length > 0 && (
                  <optgroup label="WhatsApp Chat Inbox Contacts">
                    {inboxContacts.map((c) => (
                      <option key={c.phone} value={c.phone}>
                        {c.name} ({c.displayPhone})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Custom Phone Number Input (when 'new' selected) */}
            {selectedContactOption === "new" && (
              <div className="animate-in fade-in duration-150">
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs">
                  Enter Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="e.g. 9876543210 or +919876543210"
                    autoFocus
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Info Notice about Meta Templates */}
            <div className="p-3 bg-green-50/70 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40 rounded-xl text-[11px] text-green-800 dark:text-green-300 flex items-start gap-2">
              <span className="text-base select-none shrink-0 leading-none mt-0.5">ℹ️</span>
              <p className="leading-relaxed">
                The document will be dispatched directly to the recipient using Meta-approved WhatsApp templates.
              </p>
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
                disabled={
                  sharingWa ||
                  !selectedContactOption ||
                  (selectedContactOption === "new" && !customPhone.trim())
                }
                className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-full text-xs transition-colors shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sharingWa ? "Sending..." : "Send via WhatsApp"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
