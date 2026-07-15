import { X, Phone, Tag, FileImage, FileText, Clock } from "lucide-react";
import { getInitials, isMetaSessionActive } from "../utils/chatUtils";

export default function ProfileDrawer({ conversation, onClose }) {
  const mediaMessages = conversation.messages.filter(
    (m) => m.type === "IMAGE" || m.type === "VIDEO",
  );
  const docMessages = conversation.messages.filter((m) => m.type === "DOCUMENT");
  const sessionActive = isMetaSessionActive(conversation.metaSessionExpiresAt);

  return (
    <div className="fixed inset-y-0 right-0 z-[120] flex h-full w-full sm:w-[320px] flex-shrink-0 flex-col border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 md:relative md:inset-auto md:z-auto">
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 dark:border-slate-800 px-4">
        <h3 className="text-sm font-black text-gray-900 dark:text-white">CRM Profile</h3>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-3 h-20 w-20 rounded-full bg-gradient-to-tr ${conversation.avatarColor} flex items-center justify-center text-white text-2xl font-bold shadow-md`}
          >
            {getInitials(conversation.customerName)}
          </div>
          <p className="text-base font-black text-gray-900 dark:text-white">
            {conversation.customerName}
          </p>
          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
            <Phone size={11} /> {conversation.phoneNumber}
          </p>
        </div>

        <Section title="CRM Tags" icon={Tag}>
          <div className="flex flex-wrap gap-1.5">
            {conversation.tags.length ? (
              conversation.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No tags assigned</span>
            )}
          </div>
        </Section>

        <Section title="Meta Session" icon={Clock}>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              sessionActive
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
            }`}
          >
            {sessionActive ? "Active" : "Expired"}
          </span>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
            {new Date(conversation.metaSessionExpiresAt).toLocaleString()}
          </p>
        </Section>

        <Section title={`Shared Media (${mediaMessages.length})`} icon={FileImage}>
          {mediaMessages.length ? (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaMessages.map((m) => (
                <div key={m.id} className="aspect-square overflow-hidden rounded-lg">
                  <img src={m.mediaUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No media shared yet</p>
          )}
        </Section>

        <Section title={`Documents (${docMessages.length})`} icon={FileText}>
          {docMessages.length ? (
            <div className="space-y-1.5">
              {docMessages.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-slate-800 px-2.5 py-2"
                >
                  <FileText size={14} className="text-rose-500" />
                  <span className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                    {m.body}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No documents shared yet</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
        <Icon size={12} /> {title}
      </p>
      {children}
    </div>
  );
}
