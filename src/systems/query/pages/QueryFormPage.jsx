import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Send,
  User,
  FileQuestion,
  CheckCircle2,
  ArrowRight,
  ListFilter,
  Shield,
  Loader2,
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import { getAuthorizedSystemsForUser } from "../constants/systemsConfig";
import { createQueryTicket } from "../services/queryApi";

export default function QueryFormPage() {
  const { showToast } = useMagicToast();

  const currentUsername = localStorage.getItem("user-name") || "User";
  const currentUserRole = (localStorage.getItem("role") || "user").toUpperCase();
  const currentUserEmail =
    localStorage.getItem("email_id") ||
    localStorage.getItem("email") ||
    "";

  // Authorized systems list based on logged-in user permissions
  const [authorizedSystems, setAuthorizedSystems] = useState([]);
  const [availableStages, setAvailableStages] = useState([]);

  // Form State
  const [selectedSystemKey, setSelectedSystemKey] = useState("");
  const [selectedStageName, setSelectedStageName] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [expectedSolution, setExpectedSolution] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Today's date in YYYY-MM-DD for min date attribute
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const systems = getAuthorizedSystemsForUser();
    setAuthorizedSystems(systems);

    if (systems.length > 0) {
      setSelectedSystemKey(systems[0].key);
      const stages = systems[0].stages || [];
      setAvailableStages(stages);
      if (stages.length > 0) {
        setSelectedStageName(stages[0].name);
      }
    }
  }, []);

  const handleSystemChange = (e) => {
    const systemKey = e.target.value;
    setSelectedSystemKey(systemKey);

    const foundSystem = authorizedSystems.find((s) => s.key === systemKey);
    const stages = foundSystem ? foundSystem.stages : [];
    setAvailableStages(stages);

    if (stages.length > 0) {
      setSelectedStageName(stages[0].name);
    } else {
      setSelectedStageName("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSystemKey) {
      showToast("Please select a system", "error");
      return;
    }
    if (!selectedStageName) {
      showToast("Please select a stage / page", "error");
      return;
    }
    if (!problemDescription.trim()) {
      showToast("Please enter a problem description", "error");
      return;
    }
    if (!expectedSolution.trim()) {
      showToast("Please enter the expected solution", "error");
      return;
    }
    if (!expectedCompletionDate) {
      showToast("Please pick an expected completion date", "error");
      return;
    }

    const currentSystem = authorizedSystems.find((s) => s.key === selectedSystemKey);
    const currentStage = availableStages.find((st) => st.name === selectedStageName);

    setIsSubmitting(true);

    const payload = {
      reported_by: currentUsername,
      reporter_email: currentUserEmail,
      system_name: currentSystem?.name || selectedSystemKey,
      system_key: selectedSystemKey,
      stage: selectedStageName,
      stage_id: currentStage?.id || null,
      problem_description: problemDescription.trim(),
      expected_solution: expectedSolution.trim(),
      expected_completion_date: expectedCompletionDate,
    };

    const { data, error } = await createQueryTicket(payload);

    setIsSubmitting(false);

    if (error) {
      showToast(error.message || "Failed to submit ticket. Please try again.", "error");
      return;
    }

    setSubmittedTicket(data);
    showToast(`Ticket ${data.ticket_no || "submitted"} successfully!`, "success");

    // Reset editable fields
    setProblemDescription("");
    setExpectedSolution("");
    setExpectedCompletionDate("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-6 lg:p-8">
      {/* Top Banner / Breadcrumb */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <HelpCircle className="h-4 w-4" />
            <span>Query Management System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Raise a System Query
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Submit a problem report or enhancement request for modules within your clearance.
          </p>
        </div>

        <Link
          to="/dashboard/query/tracker"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-xs transition-colors"
        >
          <ListFilter className="h-4 w-4 text-blue-500" />
          <span>View Query Tracker</span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>

      {/* Success Modal / Banner if ticket was just created */}
      {submittedTicket && (
        <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base">
                Ticket Created: <span className="font-mono underline">{submittedTicket.ticket_no}</span>
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                Your query for <span className="font-semibold">{submittedTicket.system_name} ({submittedTicket.stage})</span> has been logged and is pending review.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setSubmittedTicket(null)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              Dismiss
            </button>
            <Link
              to="/dashboard/query/tracker"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              Go to Tracker &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Card Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileQuestion className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Ticket Information Form
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fill in the details below to raise your issue.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            <span>Role: {currentUserRole}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Reported By (Pre-filled, Read-Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                1. Reported By <span className="text-slate-400 font-normal">(Auto-filled)</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentUsername}
                  className="w-full pl-10 pr-24 py-2.5 text-sm font-medium bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-not-allowed select-none"
                />
                <span className="absolute right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Logged In
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Your authenticated username is locked for audit integrity.
              </p>
            </div>

            {/* 2. System Name (Dropdown, filtered by user permissions) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                2. System Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedSystemKey}
                  onChange={handleSystemChange}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs font-medium cursor-pointer"
                >
                  {authorizedSystems.length === 0 ? (
                    <option value="" disabled>No authorized systems available</option>
                  ) : (
                    authorizedSystems.map((sys) => (
                      <option key={sys.key} value={sys.key}>
                        {sys.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Only displaying modules enabled for your user clearance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 3. Stage / Page (Dropdown, dynamically filtered) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                3. Stage / System Page <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedStageName}
                  onChange={(e) => setSelectedStageName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs font-medium cursor-pointer"
                >
                  {availableStages.length === 0 ? (
                    <option value="" disabled>No stages available</option>
                  ) : (
                    availableStages.map((stage) => (
                      <option key={stage.id} value={stage.name}>
                        {stage.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                The specific workflow stage or screen where the issue occurs.
              </p>
            </div>

            {/* 6. Expected Completion Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                6. Expected Completion Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  min={todayStr}
                  required
                  value={expectedCompletionDate}
                  onChange={(e) => setExpectedCompletionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Target deadline by which you expect this resolution.
              </p>
            </div>
          </div>

          {/* 4. Problem Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                4. Problem Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {problemDescription.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Provide a detailed description of the problem, error message observed, or behavior that needs attention..."
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs leading-relaxed resize-y"
            />
          </div>

          {/* 5. Expected Solution */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                5. Expected Solution <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {expectedSolution.length} characters
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={expectedSolution}
              onChange={(e) => setExpectedSolution(e.target.value)}
              placeholder="What is the expected resolution or corrective action you would like to see?"
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs leading-relaxed resize-y"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setProblemDescription("");
                setExpectedSolution("");
                setExpectedCompletionDate("");
              }}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Query Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
