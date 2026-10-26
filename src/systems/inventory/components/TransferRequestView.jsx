// src/systems/inventory/components/TransferRequestView.jsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Send,
  CheckCircle,
  Search,
  PlusCircle,
  UserCheck,
  Building2,
  Calendar,
  FileText,
  Boxes,
  ChevronDown,
} from "lucide-react";
import { submitTransfer } from "../../../redux/slice/transferSlice";
import { useMagicToast } from "../../../context/MagicToastContext";
import { getUserAllowedDivisions, isDivisionAllowed } from "../../../utils/roleUtils";
import { usePagePermission, READ_ONLY_TOOLTIP } from "../../../utils/pagePermissionUtils";
import ReadOnlyBanner from "../../../components/ReadOnlyBanner";

// Robust string normalization for search & paste
const normalizeSearchText = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[''""`]/g, '"')
    .replace(/[–—‑−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const stripSearchText = (str) => {
  if (!str) return "";
  return normalizeSearchText(str).replace(/[^a-z0-9]/g, "");
};

// Custom Searchable Select Dropdown Component
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  error = false,
  className = "",
  disabled = false,
  allowCustomInput = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll to top when search query changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  const selectedOption = useMemo(() => {
    return options.find((o) => o.value === value) || (value ? { label: value, value } : null);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const rawQuery = searchQuery || "";
    const qNorm = normalizeSearchText(rawQuery);
    const qStrip = stripSearchText(rawQuery);

    if (!qNorm) return options;

    const tokens = qNorm.split(" ").filter(Boolean);

    // Score each option to rank matches
    const scored = [];
    for (const opt of options) {
      const valNorm = normalizeSearchText(opt.value);
      const valStrip = stripSearchText(opt.value);
      const labelNorm = normalizeSearchText(opt.label);
      const labelStrip = stripSearchText(opt.label);
      const subLabelNorm = normalizeSearchText(opt.subLabel);

      let score = 0;

      // Exact match on SKU value or stripped SKU
      if (valNorm === qNorm || (qStrip.length >= 2 && valStrip === qStrip)) {
        score = 1000;
      } else if (labelNorm === qNorm || (qStrip.length >= 2 && labelStrip === qStrip)) {
        score = 900;
      } else if (valNorm.startsWith(qNorm) || (qStrip.length >= 2 && valStrip.startsWith(qStrip))) {
        score = 800;
      } else if (labelNorm.startsWith(qNorm) || (qStrip.length >= 2 && labelStrip.startsWith(qStrip))) {
        score = 700;
      } else if (valNorm.includes(qNorm) || (qStrip.length >= 2 && valStrip.includes(qStrip))) {
        score = 600;
      } else if (labelNorm.includes(qNorm) || (qStrip.length >= 2 && labelStrip.includes(qStrip))) {
        score = 500;
      } else if (subLabelNorm.includes(qNorm)) {
        score = 400;
      } else if (tokens.length > 1) {
        const full = `${valNorm} ${labelNorm} ${subLabelNorm}`;
        const allTokens = tokens.every((tok) => full.includes(tok));
        if (allTokens) {
          score = 300;
        }
      }

      if (score > 0) {
        scored.push({ opt, score });
      }
    }

    // Sort scored items highest score first
    scored.sort((a, b) => b.score - a.score);
    const matches = scored.map((s) => s.opt);

    const hasExact = matches.length > 0 && scored[0].score >= 900;
    if (!hasExact && allowCustomInput && qNorm) {
      return [
        {
          value: rawQuery.trim(),
          label: `+ Custom Location: "${rawQuery.trim()}"`,
          subLabel: "Press to select custom entered location",
        },
        ...matches,
      ];
    }

    return matches;
  }, [options, searchQuery, allowCustomInput]);

  const handlePaste = (e) => {
    const pasted = e.clipboardData ? e.clipboardData.getData("text") : "";
    if (pasted) {
      e.preventDefault();
      const cleaned = pasted
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      setSearchQuery(cleaned);
    }
  };

  return (
    <div ref={containerRef} className={`relative text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery("");
          }
        }}
        className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border ${
          error ? "border-rose-500" : "border-gray-200 dark:border-slate-800"
        } rounded-xl text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <span
          className={
            selectedOption
              ? "font-bold truncate text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-slate-500 truncate"
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-slate-800">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                autoFocus
                placeholder="Search or paste SKU / name..."
                value={searchQuery}
                onPaste={handlePaste}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto p-1 divide-y divide-gray-50 dark:divide-slate-850"
          >
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400 font-medium">
                No matching items found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(opt.value, opt);
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                    value === opt.value
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                      : opt.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-850"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate font-bold">{opt.label}</div>
                    {opt.subLabel && (
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                        {opt.subLabel}
                      </div>
                    )}
                  </div>
                  {value === opt.value && (
                    <CheckCircle size={13} className="text-blue-600 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransferRequestView({ activeUser, onNavigate }) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();
  const { isReadOnly, canWrite } = usePagePermission("inventory_transfer_request");

  const { materials = [], divisions = [], transactions = [] } =
    useSelector((state) => state.inventory);
  const { transfers = [] } = useSelector(
    (state) => state.transfers || { transfers: [], submitting: false }
  );

  // Logged-in user name
  const currentUserName =
    activeUser?.name || localStorage.getItem("user-name") || "Guest Operator";

  const allowedDivisions = useMemo(() => {
    return getUserAllowedDivisions(activeUser);
  }, [activeUser]);

  // Standardize Division Names
  const normalizedDivisions = useMemo(() => {
    if (!divisions || divisions.length === 0) {
      return [
        "Nutech Composites",
        "NuTech Pipes",
        "Protech Max",
      ];
    }
    return divisions.map((d) => (typeof d === "string" ? d : d.name)).filter(Boolean);
  }, [divisions]);

  // Form State
  const [formData, setFormData] = useState({
    fromDivision: "",
    toDivision: "",
    skuCode: "",
    quantity: 1,
    transferDate: new Date().toISOString().slice(0, 10),
    operatorName: currentUserName,
    remarks: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // Formatted SKU options for SearchableSelect (all materials searchable, prioritized by selected division)
  const skuSelectOptions = useMemo(() => {
    const fromDiv = (formData.fromDivision || "").toLowerCase();
    const sorted = [...materials].sort((a, b) => {
      if (!fromDiv) return 0;
      const aMatch = (a.division || "").toLowerCase() === fromDiv ? 1 : 0;
      const bMatch = (b.division || "").toLowerCase() === fromDiv ? 1 : 0;
      return bMatch - aMatch;
    });

    return sorted.map((mat) => ({
      value: mat.sku,
      label: `${mat.sku} — ${mat.name}`,
      subLabel: `Category: ${mat.category || "Item"} | Division: ${mat.division || "Default"}`,
      division: mat.division,
    }));
  }, [materials, formData.fromDivision]);

  // Division select options
  const fromDivisionOptions = useMemo(() => {
    let list = normalizedDivisions;
    if (allowedDivisions && allowedDivisions.length > 0) {
      list = list.filter((div) => isDivisionAllowed(div, allowedDivisions));
    }
    return list.map((div) => ({
      value: div,
      label: div,
    }));
  }, [normalizedDivisions, allowedDivisions]);

  const toDivisionOptions = useMemo(() => {
    return normalizedDivisions.map((div) => ({
      value: div,
      label: div === formData.fromDivision ? `${div} (Same as From Division)` : div,
      disabled: div === formData.fromDivision,
    }));
  }, [normalizedDivisions, formData.fromDivision]);

  // Selected Material Object
  const selectedMaterial = useMemo(() => {
    if (!formData.skuCode) return null;
    return materials.find((m) => m.sku === formData.skuCode);
  }, [materials, formData.skuCode]);

  // Calculate available quantity for selected SKU in From Division
  const calculatedAvailableQty = useMemo(() => {
    if (!selectedMaterial) return 0;

    let qty = Number(selectedMaterial.opening) || 0;
    transactions.forEach((t) => {
      if (t.sku === selectedMaterial.sku) {
        if (t.type === "IN") {
          qty += Number(t.qty) || 0;
        } else if (t.type === "OUT") {
          qty -= Number(t.qty) || 0;
        }
      }
    });

    // Account for Approved internal transfers for selected SKU & division
    transfers.forEach((trf) => {
      if (trf.status === "Approved" && trf.skuCode === selectedMaterial.sku) {
        if (formData.fromDivision && trf.fromDivision === formData.fromDivision) {
          qty -= Number(trf.quantity) || 0;
        }
        if (formData.fromDivision && trf.toDivision === formData.fromDivision) {
          qty += Number(trf.quantity) || 0;
        }
      }
    });

    return Math.max(0, qty);
  }, [selectedMaterial, transactions, transfers, formData.fromDivision]);

  // Handle Form Change
  const handleInputChange = (field, value, extraOpt) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "fromDivision") {
        next.skuCode = "";
        next.quantity = 1;
      } else if (field === "skuCode") {
        // If fromDivision is empty, or selected SKU is from another division, auto-set fromDivision
        const mat = materials.find((m) => m.sku === value) || (extraOpt?.division ? { division: extraOpt.division } : null);
        if (mat && mat.division && (!prev.fromDivision || prev.fromDivision.toLowerCase() !== mat.division.toLowerCase())) {
          next.fromDivision = mat.division;
          if (next.toDivision && next.toDivision.toLowerCase() === mat.division.toLowerCase()) {
            next.toDivision = "";
          }
        }
      }
      return next;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) return;
    const errors = {};

    if (!formData.fromDivision) errors.fromDivision = "From Division is required";
    if (!formData.toDivision) errors.toDivision = "To Division is required";
    if (formData.fromDivision && formData.toDivision && formData.fromDivision === formData.toDivision) {
      errors.toDivision = "To Division must be different from From Division";
    }
    if (!formData.skuCode) errors.skuCode = "SKU Code is required";
    if (!formData.quantity || formData.quantity < 1) {
      errors.quantity = "Minimum quantity is 1";
    } else if (formData.quantity > calculatedAvailableQty) {
      errors.quantity = `Maximum available quantity is ${calculatedAvailableQty}`;
    }
    if (!formData.transferDate) errors.transferDate = "Transfer Date is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("Please fix errors in the transfer form", "error");
      return;
    }

    const payload = {
      fromDivision: formData.fromDivision,
      toDivision: formData.toDivision,
      skuCode: formData.skuCode,
      skuName: selectedMaterial?.name || "Material Item",
      unit: selectedMaterial?.unit || "PCS",
      quantity: Number(formData.quantity),
      availableQty: calculatedAvailableQty,
      transferDate: formData.transferDate,
      operatorName: currentUserName,
      remarks: formData.remarks,
    };

    const actionResult = await dispatch(submitTransfer(payload));

    if (submitTransfer.fulfilled.match(actionResult)) {
      showToast("Material transfer request submitted successfully!", "success");

      setFormData({
        fromDivision: "",
        toDivision: "",
        skuCode: "",
        quantity: 1,
        transferDate: new Date().toISOString().slice(0, 10),
        operatorName: currentUserName,
        remarks: "",
      });
      setFormErrors({});

      if (onNavigate) {
        onNavigate("transfer-approval");
      }
    } else {
      showToast(actionResult.payload || "Failed to submit transfer request", "error");
    }
  };

  return (
    <div className="space-y-6">
      {isReadOnly && <ReadOnlyBanner className="mb-3" />}
      {/* Transfer Request Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-8 shadow-xs max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <PlusCircle size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              New Material Transfer Form
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Fill in details to send inventory between divisions
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Division Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* From Division */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-500" />
                <span>From Division</span>
                <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.fromDivision}
                onChange={(val) => handleInputChange("fromDivision", val)}
                options={fromDivisionOptions}
                placeholder="Select From Division..."
                error={!!formErrors.fromDivision}
              />
              {formErrors.fromDivision && (
                <p className="text-[11px] font-bold text-rose-500">{formErrors.fromDivision}</p>
              )}
            </div>

            {/* To Division */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-500" />
                <span>To Division</span>
                <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.toDivision}
                onChange={(val) => handleInputChange("toDivision", val)}
                options={toDivisionOptions}
                placeholder="Select To Division..."
                error={!!formErrors.toDivision}
              />
              {formErrors.toDivision && (
                <p className="text-[11px] font-bold text-rose-500">{formErrors.toDivision}</p>
              )}
            </div>
          </div>

          {/* SKU and Quantity Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SKU Code Searchable Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Boxes size={14} className="text-blue-500" />
                <span>SKU Code</span>
                <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.skuCode}
                onChange={(val, opt) => handleInputChange("skuCode", val, opt)}
                options={skuSelectOptions}
                placeholder={
                  formData.fromDivision
                    ? `Select or paste SKU from ${formData.fromDivision}...`
                    : "Select or paste SKU Code..."
                }
                error={!!formErrors.skuCode}
              />
              {formErrors.skuCode && (
                <p className="text-[11px] font-bold text-rose-500">{formErrors.skuCode}</p>
              )}
            </div>

            {/* Quantity Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Quantity</span>
                  <span className="text-rose-500">*</span>
                </label>
                {selectedMaterial && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                    Available: {calculatedAvailableQty} {selectedMaterial.unit || "PCS"}
                  </span>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={selectedMaterial ? calculatedAvailableQty : 99999}
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                placeholder="Enter quantity"
                className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border ${formErrors.quantity ? "border-rose-500" : "border-gray-200 dark:border-slate-800"
                  } rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
              {formErrors.quantity && (
                <p className="text-[11px] font-bold text-rose-500">{formErrors.quantity}</p>
              )}
            </div>
          </div>

          {/* Transfer Date and Operator Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Transfer Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-500" />
                <span>Transfer Date</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.transferDate}
                onChange={(e) => handleInputChange("transferDate", e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border ${formErrors.transferDate ? "border-rose-500" : "border-gray-200 dark:border-slate-800"
                  } rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
              {formErrors.transferDate && (
                <p className="text-[11px] font-bold text-rose-500">{formErrors.transferDate}</p>
              )}
            </div>

            {/* Operator Name (Prefilled & Read-Only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-500" />
                <span>Operator Name</span>
                <span className="text-xs font-normal text-gray-400">(Read only)</span>
              </label>
              <input
                type="text"
                readOnly
                value={formData.operatorName}
                className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Remarks (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText size={14} className="text-gray-500" />
              <span>Remarks</span>
              <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              placeholder="Add any specific notes or instructions for this transfer..."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  fromDivision: "",
                  toDivision: "",
                  skuCode: "",
                  quantity: 1,
                  transferDate: new Date().toISOString().slice(0, 10),
                  operatorName: currentUserName,
                  remarks: "",
                })
              }
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-850 cursor-pointer"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={!canWrite}
              title={!canWrite ? READ_ONLY_TOOLTIP : undefined}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={15} />
              <span>Submit Transfer Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
