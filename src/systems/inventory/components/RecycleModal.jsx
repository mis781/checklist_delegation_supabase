import React, { useState, useEffect, useRef } from "react";
import { X, Upload, FileText, CheckCircle2, Loader2, Paperclip, ExternalLink } from "lucide-react";
import { fetchRecycleApi, saveRecycleApi, updateRecycleStatusApi } from "../../../redux/api/inventoryApi";

// Internal CustomSelect component to ensure consistent dark/light styling and overflow behavior
function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  required = false,
  className = "",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions = (options || [])
    .filter(Boolean)
    .map((opt) => {
      if (typeof opt === "string" || typeof opt === "number") {
        return { label: String(opt), value: String(opt) };
      }
      if (opt && typeof opt === "object") {
        const label = String(opt.label ?? opt.value ?? "");
        const value = String(opt.value ?? opt.label ?? "");
        return { label, value };
      }
      return null;
    })
    .filter((opt) => opt && opt.label);

  const filteredOptions = normalizedOptions.filter((opt) =>
    (opt.label || "").toLowerCase().includes((searchQuery || "").toLowerCase()),
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {required && (
        <input
          tabIndex={-1}
          value={value || ""}
          onChange={() => {}}
          required
          className="opacity-0 absolute inset-0 w-full h-full pointer-events-none -z-10"
        />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm text-left focus:ring-2 focus:ring-indigo-500 transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900"
        }`}
      >
        <span className={selectedOption ? "font-medium" : "text-gray-400 dark:text-slate-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
          {normalizedOptions.length > 5 && (
            <div className="p-2 border-b border-gray-150 dark:border-slate-800">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-950 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`px-3.5 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    opt.value === value
                      ? "bg-indigo-600 text-white font-medium"
                      : "text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300"
                  }`}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-3.5 py-2 text-xs text-gray-400 dark:text-slate-500 text-center">
                No matching options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecycleModal({
  isOpen,
  onClose,
  activeUser,
  materials = [],
  finishedGoodsNames = [],
  divisions = [],
}) {
  const [activeTab, setActiveTab] = useState("form"); // 'form' | 'list'

  // Form state
  const [recycleType, setRecycleType] = useState("Raw Material");
  const [firm, setFirm] = useState("");
  const [selectedMaterialVal, setSelectedMaterialVal] = useState("");
  const [quantity, setQuantity] = useState("");
  const [damageType, setDamageType] = useState("Expiry");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState(activeUser?.name || "");
  const [attachmentFile, setAttachmentFile] = useState(null);

  // List state
  const [recycleList, setRecycleList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Reset form when modal opens or activeUser changes
  useEffect(() => {
    if (isOpen) {
      setApprovedBy(activeUser?.name || "");
      if (activeTab === "list") {
        loadRecycleList();
      }
    }
  }, [isOpen, activeUser]);

  // Load list when switching to list tab
  useEffect(() => {
    if (isOpen && activeTab === "list") {
      loadRecycleList();
    }
  }, [activeTab]);

  const loadRecycleList = async () => {
    setIsLoadingList(true);
    setSelectedIds([]);
    const res = await fetchRecycleApi();
    if (res.data) {
      setRecycleList(res.data);
    }
    setIsLoadingList(false);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === recycleList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recycleList.map((r) => r.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleMarkComplete = async (idsToComplete) => {
    if (!idsToComplete || idsToComplete.length === 0) return;
    setIsUpdatingStatus(true);
    const res = await updateRecycleStatusApi(idsToComplete, "completed", activeUser?.name);
    setIsUpdatingStatus(false);
    if (res.error) {
      alert(`Failed to mark completed: ${res.error}`);
    } else {
      setSelectedIds((prev) => prev.filter((id) => !idsToComplete.includes(id)));
      loadRecycleList();
    }
  };

  const handleRecycleTypeChange = (val) => {
    setRecycleType(val);
    setSelectedMaterialVal(""); // clear selected material when switching type
  };

  const resetForm = () => {
    setRecycleType("Raw Material");
    setFirm("");
    setSelectedMaterialVal("");
    setQuantity("");
    setDamageType("Expiry");
    setDate(new Date().toISOString().slice(0, 10));
    setReason("");
    setApprovedBy(activeUser?.name || "");
    setAttachmentFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!recycleType) {
      alert("Please select a Recycle Type.");
      return;
    }
    if (!selectedMaterialVal) {
      alert("Please select a Material.");
      return;
    }
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      alert("Please enter a valid quantity greater than zero.");
      return;
    }
    if (!damageType) {
      alert("Please select a Damage Type.");
      return;
    }
    if (!date) {
      alert("Please select a Date.");
      return;
    }

    setIsSubmitting(true);

    let materialName = "";
    let materialSku = selectedMaterialVal;

    if (recycleType === "Raw Material") {
      const mat = materials.find((m) => m.sku === selectedMaterialVal || m.name === selectedMaterialVal);
      if (mat) {
        materialName = mat.name || mat.sku;
        materialSku = mat.sku || selectedMaterialVal;
      } else {
        materialName = selectedMaterialVal;
        materialSku = selectedMaterialVal;
      }
    } else {
      const mat = materials.find((m) => m.sku === selectedMaterialVal || m.name === selectedMaterialVal);
      if (mat) {
        materialName = mat.name || mat.sku;
        materialSku = mat.sku || selectedMaterialVal;
      } else {
        const fg = (finishedGoodsNames || []).find((f) =>
          typeof f === "object"
            ? f.sku === selectedMaterialVal || f.name === selectedMaterialVal
            : f === selectedMaterialVal
        );
        if (fg) {
          materialName = typeof fg === "object" ? fg.name : fg;
          materialSku = typeof fg === "object" && fg.sku ? fg.sku : selectedMaterialVal;
        } else {
          materialName = selectedMaterialVal;
          materialSku = selectedMaterialVal;
        }
      }
    }

    const payload = {
      recycleType,
      firm: firm || activeUser?.division || null,
      materialName,
      materialSku,
      quantity: qtyNum,
      damageType,
      date,
      reason: reason.trim(),
      approvedBy: approvedBy.trim() || activeUser?.name || "Admin",
    };

    const res = await saveRecycleApi(payload, attachmentFile, activeUser?.name);
    setIsSubmitting(false);

    if (res.error) {
      alert(`Failed to save Recycle record: ${res.error}`);
    } else {
      alert("Recycle record created successfully!");
      resetForm();
      setActiveTab("list");
    }
  };

  if (!isOpen) return null;

  // Derive firm options
  const firmOptions = [
    ...new Set([
      ...divisions,
      ...(activeUser?.division ? [activeUser.division] : []),
      ...materials.map((m) => m.division).filter(Boolean),
    ]),
  ];

  // Derive material SKU options based on Recycle Type
  let materialOptions = [];
  if (recycleType === "Raw Material") {
    materialOptions = (materials || [])
      .filter((m) => m && (m.sku || m.name))
      .filter((m) => m.materialType === "RM" || m.material_type === "RM" || m.category === "Raw Material" || (!m.material_type && !m.materialType))
      .map((m) => {
        const skuStr = m.sku || m.name || "";
        const labelStr = m.sku ? (m.name && m.name !== m.sku ? `${m.sku} — ${m.name}` : m.sku) : m.name;
        return {
          label: labelStr,
          value: skuStr,
        };
      });
  } else {
    // Finished Goods SKUs from materials list and finishedGoodsNames
    const seen = new Set();
    const fgOptionsList = [];

    // 1. From materials array (FG materials)
    (materials || [])
      .filter((m) => m && (m.materialType === "FG" || m.material_type === "FG" || (m.category && m.category.toLowerCase() !== "raw material")))
      .forEach((m) => {
        const skuStr = m.sku || m.name || "";
        if (skuStr && !seen.has(skuStr)) {
          seen.add(skuStr);
          const labelStr = m.sku ? (m.name && m.name !== m.sku ? `${m.sku} — ${m.name}` : m.sku) : m.name;
          fgOptionsList.push({ label: labelStr, value: skuStr });
        }
      });

    // 2. From finishedGoodsNames list
    (finishedGoodsNames || [])
      .filter(Boolean)
      .forEach((fg) => {
        const skuStr = typeof fg === "object" ? (fg.sku || fg.name) : fg;
        const nameStr = typeof fg === "object" ? fg.name : fg;
        if (skuStr && !seen.has(skuStr)) {
          seen.add(skuStr);
          const labelStr = (typeof fg === "object" && fg.sku) ? (fg.name && fg.name !== fg.sku ? `${fg.sku} — ${fg.name}` : fg.sku) : nameStr;
          fgOptionsList.push({ label: labelStr, value: skuStr });
        }
      });

    materialOptions = fgOptionsList;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header with Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4 bg-gray-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Recycle
            </h3>

            {/* Switcher Header Tabs */}
            <div className="flex items-center p-1 bg-gray-200 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "form"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Recycle Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "list"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Recycle List
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "form" ? (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* 1. Recycle Type (Full width - 2 cols) */}
              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Recycle Type *
                </label>
                <CustomSelect
                  required
                  value={recycleType}
                  onChange={handleRecycleTypeChange}
                  options={[
                    { label: "Raw Material", value: "Raw Material" },
                    { label: "Finished Good", value: "Finished Good" },
                  ]}
                  placeholder="Select Recycle Type..."
                />
              </div>

              {/* 2. Firm (Full width - 2 cols) */}
              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Firm
                </label>
                <CustomSelect
                  value={firm}
                  onChange={(val) => setFirm(val)}
                  options={firmOptions}
                  placeholder="Select firm..."
                />
              </div>

              {/* 3. Material SKU (Full width - 2 cols) */}
              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Material SKU * ({recycleType === "Raw Material" ? "Raw Material" : "Finished Goods"})
                </label>
                <CustomSelect
                  required
                  value={selectedMaterialVal}
                  onChange={(val) => setSelectedMaterialVal(val)}
                  options={materialOptions}
                  placeholder={`Select ${recycleType === "Raw Material" ? "Raw Material" : "Finished Good"} SKU...`}
                />
              </div>

              {/* 4. Quantity (1 col) */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0.0001"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 5. Date (1 col) */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 6. Damage Type (Full width - 2 cols) */}
              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Damage Type *
                </label>
                <CustomSelect
                  required
                  value={damageType}
                  onChange={(val) => setDamageType(val)}
                  options={[
                    { label: "Expiry", value: "Expiry" },
                    { label: "Damage", value: "Damage" },
                    { label: "Theft", value: "Theft" },
                  ]}
                  placeholder="Select Damage Type..."
                />
              </div>

              {/* 7. Approved By (Full width - 2 cols) */}
              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Approved By *
                </label>
                <input
                  type="text"
                  required
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Enter approver name..."
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 8. Reason (Full width - 2 cols) */}
              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Reason
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for recycling..."
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 9. Attachments (Full width - 2 cols) */}
              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Attachments
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-xs font-bold text-gray-700 dark:text-slate-300 hover:border-indigo-500 cursor-pointer">
                    <Paperclip size={14} />
                    <span>Choose File</span>
                    <input
                      type="file"
                      onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {attachmentFile ? (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-xs">
                      {attachmentFile.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      No file chosen
                    </span>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving...
                    </>
                  ) : (
                    "Submit Recycle Record"
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: Recycle List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Pending Recycle Records ({recycleList.length})
                </span>
                <div className="flex items-center gap-3">
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleMarkComplete(selectedIds)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Completed ({selectedIds.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={loadRecycleList}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Refresh List
                  </button>
                </div>
              </div>

              {isLoadingList ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Loading records...
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase">
                        <th className="w-10 px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={recycleList.length > 0 && selectedIds.length === recycleList.length}
                            onChange={handleToggleSelectAll}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3">Recycle Type</th>
                        <th className="px-4 py-3">Firm</th>
                        <th className="px-4 py-3">Material SKU</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Damage Type</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Approved By</th>
                        <th className="px-4 py-3">Attachment</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {recycleList.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center py-10 text-sm text-gray-400 dark:text-slate-500">
                            No pending recycle records found. Create one using the Recycle Form.
                          </td>
                        </tr>
                      ) : (
                        recycleList.map((row) => {
                          const isChecked = selectedIds.includes(row.id);
                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                isChecked
                                  ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                                  : "hover:bg-gray-50 dark:hover:bg-slate-955/50"
                              }`}
                            >
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSelectRow(row.id)}
                                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                {row.recycle_type}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                                {row.firm || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                  {row.material_sku || row.material_name}
                                </span>
                                {row.material_name && row.material_name !== row.material_sku && (
                                  <span className="text-gray-500 dark:text-slate-400 text-xs ml-1.5 font-normal">
                                    ({row.material_name})
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-bold text-rose-600 dark:text-rose-400">
                                {Number(row.quantity).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                                  {row.damage_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                                {row.date}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-slate-400 max-w-[160px] truncate">
                                {row.reason || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-900 dark:text-white">
                                {row.approved_by || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {row.attachment_url ? (
                                  <a
                                    href={row.attachment_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                                  >
                                    <ExternalLink size={12} />
                                    View
                                  </a>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  title="Mark as Completed"
                                  disabled={isUpdatingStatus}
                                  onClick={() => handleMarkComplete([row.id])}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded-lg cursor-pointer transition-colors"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
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
          )}
        </div>
      </div>
    </div>
  );
}
