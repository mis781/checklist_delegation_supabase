import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  MessageSquarePlus,
  Search,
  User,
  Phone,
  ChevronLeft,
  Send,
  Loader2,
  Hash,
  Image,
  Video,
  FileText,
  Paperclip,
} from "lucide-react";
import { extractTemplateVariables, parseTemplateBody } from "../utils/chatUtils";
import { fetchUsers, uploadWhatsappMedia } from "../services/whatsappApi";

const CATEGORY_COLOR = {
  MARKETING: "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900",
  UTILITY: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  AUTHENTICATION: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
};

const HEADER_MEDIA_ICON = { IMAGE: Image, VIDEO: Video, DOCUMENT: FileText };
const MEDIA_HEADER_TYPES = ["IMAGE", "VIDEO", "DOCUMENT"];

// ─── Step indicator ────────────────────────────────────────────────────────
function StepDot({ step, current }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-200 ${
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-emerald-600 text-white ring-4 ring-emerald-500/20"
            : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
        }`}
      >
        {done ? "✓" : step}
      </div>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────
/**
 * NewChatModal — 2-step wizard
 *
 * Step 1: Select / type a contact (public.users picker or manual phone entry)
 * Step 2: Pick an approved template and fill in variable values
 *
 * Props:
 *  templates  – array of { id, elementName, category, language, bodyText,
 *               headerType, headerText, footerText, buttons }
 *  users      – array of { id, user_name, number }
 *  isSending  – boolean controlled by parent
 *  onClose()  – close the modal without sending
 *  onSend({ contacts, templateElementName, templateLanguage, variables, headerMediaUrl, headerFileName })
 */
export default function NewChatModal({ templates, isSending, onClose, onSend }) {
  // ── Step state ────────────────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1 = contact, 2 = template

  // ── Contact step — server-side search ─────────────────────────────────
  const [contactMode, setContactMode] = useState("picker"); // 'picker' | 'manual'
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);  // true after first fetch
  const [selectedUsers, setSelectedUsers] = useState([]); // [{ id, user_name, number }]
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const debounceRef = useRef(null);

  // ── Template step ─────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({});
  const [templateSearch, setTemplateSearch] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState(null);
  const [headerFileName, setHeaderFileName] = useState(null);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);

  // Server-side search — fires on mount (empty query = all users with phones)
  // and whenever userSearch changes, debounced 300 ms.
  const runSearch = useCallback(async (query) => {
    console.log("[NewChatModal] runSearch triggered, query:", JSON.stringify(query));
    setIsSearching(true);
    try {
      const rows = await fetchUsers(query);
      console.log("[NewChatModal] fetchUsers returned", rows.length, "row(s):", rows);
      setSearchResults(rows);
      setHasSearched(true);
    } catch (err) {
      console.error("[NewChatModal] User search failed:", err);
      setSearchResults([]);
      setHasSearched(true); // show empty-state instead of staying on Loading
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-load when picker mode mounts
  useEffect(() => {
    if (contactMode === "picker") {
      runSearch("");
    }
  }, [contactMode, runSearch]);

  // Debounced re-search on query change
  useEffect(() => {
    if (contactMode !== "picker") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(userSearch), 300);
    return () => clearTimeout(debounceRef.current);
  }, [userSearch, contactMode, runSearch]);

  // ── Template filtering (client-side — small list) ─────────────────────
  const filteredTemplates = templates.filter((t) =>
    t.elementName.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const variableTokens = selectedTemplate
    ? extractTemplateVariables(selectedTemplate.bodyText)
    : [];

  const previewText = selectedTemplate
    ? parseTemplateBody(
        selectedTemplate.bodyText,
        variableTokens.map((t) => variables[t] || ""),
      )
    : "";

  // Resolved contacts for the send call — an array so picker mode can
  // target multiple recipients at once; manual mode always yields at most one.
  const resolvedContacts =
    contactMode === "picker"
      ? selectedUsers.map((u) => ({ phoneNumber: String(u.number), displayName: u.user_name }))
      : manualPhone.trim()
      ? [{ phoneNumber: manualPhone.trim(), displayName: manualName.trim() || undefined }]
      : [];

  // Highlight matched portion of a string
  const highlight = (text, query) => {
    if (!query || !text) return text != null ? String(text) : "";
    const str = String(text);
    const idx = str.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return str;
    return (
      <>
        {str.slice(0, idx)}
        <mark className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded px-0.5">
          {str.slice(idx, idx + query.length)}
        </mark>
        {str.slice(idx + query.length)}
      </>
    );
  };

  // Step 1 valid?
  const step1Valid =
    contactMode === "picker"
      ? selectedUsers.length > 0
      : manualPhone.trim().length >= 7;

  const needsHeaderMedia = selectedTemplate && MEDIA_HEADER_TYPES.includes(selectedTemplate.headerType);

  // Step 2 valid?
  const step2Valid =
    selectedTemplate !== null &&
    variableTokens.every((t) => variables[t] && variables[t].trim()) &&
    (!needsHeaderMedia || !!headerMediaUrl);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleToggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleModeSwitch = (mode) => {
    setContactMode(mode);
    setSelectedUsers([]);
    setUserSearch("");
    setSearchResults([]);
    setHasSearched(false);
    setManualPhone("");
    setManualName("");
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setVariables({});
    setTemplateSearch("");
    setHeaderMediaUrl(null);
    setHeaderFileName(null);
  };

  const handleHeaderFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingHeader(true);
    try {
      const publicUrl = await uploadWhatsappMedia(file, "whatsapp_header");
      setHeaderMediaUrl(publicUrl);
      setHeaderFileName(file.name);
    } catch (err) {
      console.error("Failed to upload header media:", err);
    } finally {
      setIsUploadingHeader(false);
    }
  };

  const handleSend = () => {
    if (!step1Valid || !step2Valid || isSending) return;
    onSend({
      contacts: resolvedContacts,
      templateElementName: selectedTemplate.elementName,
      templateLanguage: selectedTemplate.language,
      variables: variableTokens.map((t) => variables[t]),
      headerMediaUrl: headerMediaUrl || undefined,
      headerFileName: headerFileName || undefined,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-800"
        style={{ animation: "fadeSlideUp 0.18s ease-out" }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <MessageSquarePlus size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                New Chat
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500">
                {step === 1 ? "Step 1 — Choose contact" : "Step 2 — Select template"}
              </p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mr-2">
            <StepDot step={1} current={step} />
            <div className="h-px w-4 bg-gray-200 dark:bg-slate-700" />
            <StepDot step={2} current={step} />
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="max-h-[70vh] overflow-y-auto">
          {/* ─────────────── STEP 1 — CONTACT ──────────────────────── */}
          {step === 1 && (
            <div className="p-5 space-y-4">
              {/* Mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleModeSwitch("picker")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    contactMode === "picker"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-emerald-400"
                  }`}
                >
                  <User size={13} />
                  Existing User
                </button>
                <button
                  onClick={() => handleModeSwitch("manual")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    contactMode === "manual"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-emerald-400"
                  }`}
                >
                  <Hash size={13} />
                  Manual Number
                </button>
              </div>

              {/* ── Picker mode ── */}
              {contactMode === "picker" && (
                <div className="space-y-3">
                  {/* Search input */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      Search Users
                    </label>
                    <div className="relative">
                      {isSearching ? (
                        <Loader2
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin"
                        />
                      ) : (
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      )}
                      <input
                        autoFocus
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Type name or phone number…"
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-slate-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      />
                      {userSearch && (
                        <button
                          onClick={() => setUserSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Always-visible inline results list */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {isSearching && searchResults.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-400">
                        <Loader2 size={13} className="animate-spin text-emerald-500" />
                        Searching…
                      </div>
                    ) : !hasSearched ? (
                      <div className="py-6 text-center text-xs text-gray-400">Loading…</div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 text-center space-y-1">
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                          No users found{userSearch ? ` for "${userSearch}"` : ""}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Try the Manual Number tab instead.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                        {searchResults.map((u) => {
                          const isSelected = selectedUsers.some((s) => s.id === u.id);
                          return (
                            <button
                              key={u.id}
                              onClick={() => handleToggleUser(u)}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                isSelected
                                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                                  : "hover:bg-gray-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div
                                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-600"
                                    : "border-gray-300 dark:border-slate-600"
                                }`}
                              >
                                {isSelected && (
                                  <span className="text-[9px] font-black text-white leading-none">✓</span>
                                )}
                              </div>
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-[10px] font-black text-white shadow-sm">
                                {(u.user_name || "?").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                                  {highlight(u.user_name, userSearch)}
                                </p>
                                <p className="truncate text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone size={8} />
                                  {highlight(u.number, userSearch)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected user chips */}
                  {selectedUsers.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
                        {selectedUsers.length} contact{selectedUsers.length > 1 ? "s" : ""} selected
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1.5">
                        {selectedUsers.map((su) => (
                          <div
                            key={su.id}
                            className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2"
                          >
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-[9px] font-black text-white">
                              {(su.user_name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                {su.user_name}
                              </p>
                              <p className="truncate text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Phone size={9} />
                                {su.number}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveUser(su.id)}
                              className="rounded-full p-0.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Manual mode ── */}
              {contactMode === "manual" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="tel"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-slate-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-400">
                      Include country code (e.g. 91 for India). The number will
                      be normalised automatically.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      Display Name <span className="text-gray-300">(optional)</span>
                    </label>
                    <div className="relative">
                      <User
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Contact's display name"
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-slate-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Info callout */}
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-3.5 py-2.5">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  ⚡ <strong>Template required</strong> — Meta only allows
                  outbound messages to new contacts via pre-approved templates.
                  You'll choose one on the next step.
                </p>
              </div>
            </div>
          )}

          {/* ─────────────── STEP 2 — TEMPLATE ─────────────────────── */}
          {step === 2 && (
            <div className="p-5 space-y-4">
              {selectedTemplate ? (
                // Variable fill view
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white">
                        {selectedTemplate.elementName}
                      </p>
                      <span
                        className={`mt-0.5 inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${
                          CATEGORY_COLOR[selectedTemplate.category]
                        }`}
                      >
                        {selectedTemplate.category}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <ChevronLeft size={13} />
                      Change
                    </button>
                  </div>

                  {/* Live preview */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3.5 space-y-1.5">
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Live Preview
                    </p>
                    {selectedTemplate.headerType === "TEXT" && selectedTemplate.headerText && (
                      <p className="text-sm font-black text-gray-800 dark:text-slate-200">
                        {selectedTemplate.headerText}
                      </p>
                    )}
                    {needsHeaderMedia && (
                      <p className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-slate-400">
                        {(() => {
                          const Icon = HEADER_MEDIA_ICON[selectedTemplate.headerType];
                          return Icon ? <Icon size={12} /> : null;
                        })()}
                        {selectedTemplate.headerType} header
                      </p>
                    )}
                    <p className="text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {previewText}
                    </p>
                    {selectedTemplate.footerText && (
                      <p className="text-xs text-gray-400">{selectedTemplate.footerText}</p>
                    )}
                    {selectedTemplate.buttons?.length > 0 && (
                      <div className="mt-1.5 space-y-1 border-t border-gray-200 dark:border-slate-800 pt-1">
                        {selectedTemplate.buttons.map((btn, idx) => (
                          <p key={idx} className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {btn.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Header media upload (required for IMAGE/VIDEO/DOCUMENT headers) */}
                  {needsHeaderMedia && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
                        Header {selectedTemplate.headerType.toLowerCase()} <span className="text-red-400">*</span>
                      </label>
                      {headerMediaUrl ? (
                        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
                          <Paperclip size={13} className="flex-shrink-0 text-emerald-600" />
                          <span className="flex-1 truncate text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            {headerFileName}
                          </span>
                          <button
                            onClick={() => { setHeaderMediaUrl(null); setHeaderFileName(null); }}
                            className="text-emerald-500 hover:text-emerald-700"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 py-3 text-xs font-bold text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                          {isUploadingHeader ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Uploading…
                            </>
                          ) : (
                            <>
                              <Paperclip size={14} /> Choose {selectedTemplate.headerType.toLowerCase()} file
                            </>
                          )}
                          <input
                            type="file"
                            accept={
                              selectedTemplate.headerType === "IMAGE" ? "image/*"
                                : selectedTemplate.headerType === "VIDEO" ? "video/*"
                                : undefined
                            }
                            className="hidden"
                            disabled={isUploadingHeader}
                            onChange={handleHeaderFileChange}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Variable inputs */}
                  {variableTokens.length > 0 ? (
                    <div className="space-y-3">
                      {variableTokens.map((token) => (
                        <div key={token}>
                          <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Variable {token}
                          </label>
                          <input
                            value={variables[token] || ""}
                            onChange={(e) =>
                              setVariables((v) => ({ ...v, [token]: e.target.value }))
                            }
                            placeholder={`Value for ${token}`}
                            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      This template has no dynamic variables.
                    </p>
                  )}
                </div>
              ) : (
                // Template list view
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="Search templates…"
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-slate-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                  </div>

                  {filteredTemplates.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
                      No approved templates found.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => handleSelectTemplate(tpl)}
                          className="w-full rounded-xl border border-gray-200 dark:border-slate-800 p-3.5 text-left hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all"
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white truncate">
                              {HEADER_MEDIA_ICON[tpl.headerType] &&
                                (() => {
                                  const Icon = HEADER_MEDIA_ICON[tpl.headerType];
                                  return <Icon size={13} className="flex-shrink-0 text-gray-400" />;
                                })()}
                              {tpl.elementName}
                            </span>
                            <span
                              className={`flex-shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide ${
                                CATEGORY_COLOR[tpl.category]
                              }`}
                            >
                              {tpl.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                            {tpl.bodyText}
                          </p>
                          {tpl.buttons?.length > 0 && (
                            <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {tpl.buttons.length} button{tpl.buttons.length > 1 ? "s" : ""}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 border-t border-gray-100 dark:border-slate-800 px-5 py-3.5">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next — Choose Template
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={isSending}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <button
                disabled={!step2Valid || isSending}
                onClick={handleSend}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Template
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
