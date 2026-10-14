import { Link } from "react-router-dom";
import { X, ExternalLink, AlertTriangle, Clock } from "lucide-react";
import {
  splitRecord,
  describeValue,
  formatDateTime,
  humanizeKey,
  tableColumns,
  plainText,
  isEmptyValue,
} from "../utils/recordFields";
import { formatAge } from "../../../services/pendingSummary";

function FieldValue({ d }) {
  if (d.kind === "date") return <span>{formatDateTime(d.value)}</span>;
  if (d.kind === "image")
    return (
      <a href={d.value} target="_blank" rel="noreferrer" className="block">
        <img src={d.value} alt="" className="max-h-28 rounded-lg border border-gray-200 dark:border-slate-700" />
      </a>
    );
  if (d.kind === "url")
    return (
      <a href={d.value} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline break-all">
        Open link
      </a>
    );
  if (d.kind === "list") return <span>{d.value.join(", ")}</span>;
  return <span className="whitespace-pre-wrap break-words">{d.value}</span>;
}

function FieldGrid({ fields }) {
  if (fields.length === 0) return <p className="text-sm text-gray-400">No fields.</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
      {fields.map((f) => (
        <div key={f.key} className="min-w-0">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">{f.label}</dt>
          <dd className="text-sm text-gray-900 dark:text-slate-100">
            <FieldValue d={f} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RecordsTable({ rows }) {
  const cols = tableColumns(rows);
  if (rows.length === 0) return <p className="text-sm text-gray-400">No records.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-slate-800/60">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">
                {humanizeKey(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 text-gray-800 dark:text-slate-200 whitespace-nowrap max-w-xs truncate" title={plainText(r[c])}>
                  {isEmptyValue(r[c]) ? "-" : plainText(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, value }) {
  const d = describeValue(value);
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-gray-700 dark:text-slate-200">{title}</h4>
      {d.kind === "table" ? (
        <RecordsTable rows={d.value} />
      ) : d.kind === "object" ? (
        <FieldGrid fields={splitRecord(d.value).fields} />
      ) : (
        <FieldValue d={d} />
      )}
    </div>
  );
}

export default function PendingDetailModal({ system, stage, item, onClose, responsible = [] }) {
  const { fields, sections } = splitRecord(item.raw);
  const related = Object.entries(item.related || {}).filter(([, v]) => !isEmptyValue(v));

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center bg-black/50 p-2 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {system.label} · {stage.label}
            </p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white break-words">
              {item.ref && <span className="text-gray-400 mr-2">#{item.ref}</span>}
              {item.title || "Pending item"}
            </h3>
            {item.subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{item.subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Pending status summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ["Responsible (MIS)", responsible.length ? responsible.join(", ") : "Not assigned"],
              ["Assigned To", item.person || "-"],
              ["Department / Division", item.department || "-"],
              ["Planned / Due", item.plannedAt ? formatDateTime(item.plannedAt) : "-"],
              ["Created", item.createdAt ? formatDateTime(item.createdAt) : "-"],
              ["Delay Days", formatAge(item.ageMins)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {item.isOverdue ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs font-bold">
                <AlertTriangle size={12} /> Overdue
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold">
                <Clock size={12} /> Pending
              </span>
            )}
            {item.tag && (
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold">
                {item.tag}
              </span>
            )}
            {item.amount !== null && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                ₹ {item.amount.toLocaleString("en-IN")}
              </span>
            )}
            <div className="flex-1" />
            <Link
              to={stage.route}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <ExternalLink size={16} /> Open {stage.label}
            </Link>
          </div>

          {/* Complete record detail */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-700 dark:text-slate-200">Complete Task Detail</h4>
            <div className="rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
              <FieldGrid fields={fields} />
            </div>
          </div>

          {sections.map((s) => (
            <Section key={s.key} title={s.label} value={s.value} />
          ))}

          {related.map(([label, value]) => (
            <Section key={label} title={label} value={value} />
          ))}

        </div>
      </div>
    </div>
  );
}
