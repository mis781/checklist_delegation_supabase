import React, { useState, useEffect } from "react";
import { X, Calendar, User, Save, CheckCircle, AlertTriangle } from "lucide-react";

export default function RecordCommitmentModal({
  isOpen,
  onClose,
  onSave,
  userRow,
  startDate,
  endDate,
  periodType = "weekly",
  usersList = [],
}) {
  const [currentRow, setCurrentRow] = useState(userRow || {});
  const [commitmentText, setCommitmentText] = useState("");
  const [status, setStatus] = useState("pending");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRow) {
      setCurrentRow(userRow);
      setCommitmentText(userRow.commitment || "");
      setStatus(userRow.status || "pending");
      setRemarks(userRow.remarks || "");
    }
  }, [userRow]);

  if (!isOpen || !currentRow) return null;

  const handleUserChange = (selectedUsername) => {
    const found = (usersList || []).find((u) => u.user_name === selectedUsername);
    if (found) {
      setCurrentRow((prev) => ({
        ...prev,
        user_name: found.user_name,
        department: found.department || prev.department || "General",
        designation: found.designation || prev.designation || "Employee",
        company: found.company || prev.company || "botivate",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...currentRow,
        date_start: startDate,
        date_end: endDate,
        period_type: periodType,
        commitment: commitmentText,
        status,
        remarks,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save commitment:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Record Weekly Review Commitment
            </h3>
            {usersList && usersList.length > 0 ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Person:</span>
                <select
                  value={currentRow.user_name || ""}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  {usersList.map((u) => (
                    <option key={u.id || u.user_name} value={u.user_name}>
                      {u.user_name} ({u.department || "General"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Person: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentRow.user_name}</span> ({currentRow.department})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block">Period Target:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{currentRow.target ?? 0} tasks</span>
            </div>
            <div>
              <span className="text-slate-400 block">Current Pending:</span>
              <span className="font-bold text-amber-600">{currentRow.pending ?? 0} tasks</span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Work Done:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{currentRow.actualWorkDone ?? currentRow.actual_work_done ?? 0} tasks</span>
            </div>
            <div>
              <span className="text-slate-400 block">All Pending (Backlog):</span>
              <span className="font-bold text-rose-600">{currentRow.allPending ?? currentRow.all_pending ?? 0} tasks</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Commitment Note / Action Plan
            </label>
            <textarea
              rows={3}
              value={commitmentText}
              onChange={(e) => setCommitmentText(e.target.value)}
              placeholder="e.g., Will clear 12 backlog tasks and achieve 100% on-time checklist compliance by Thursday..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Commitment Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="pending">Pending</option>
                <option value="achieved">Achieved</option>
                <option value="partially_achieved">Partially Achieved</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supervisor Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional review notes..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Commitment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
