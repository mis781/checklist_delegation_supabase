// src/systems/inventory/components/TransferRequestView.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Send,
  CheckCircle,
  XCircle,
  Search,
  CheckCircle2,
  PlusCircle,
  UserCheck,
  Building2,
  Calendar,
  MapPin,
  FileText,
  Boxes,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { submitTransfer } from "../../../redux/slice/transferSlice";
import { useMagicToast } from "../../../context/MagicToastContext";

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    return options.find((o) => o.value === value) || (value ? { label: value, value } : null);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    const matches = options.filter(
      (o) =>
        (o.label || "").toLowerCase().includes(q) ||
        (o.subLabel || "").toLowerCase().includes(q) ||
        (o.value || "").toLowerCase().includes(q)
    );

    const exactMatch = options.some(
      (o) => (o.value || "").toLowerCase() === q || (o.label || "").toLowerCase() === q
    );
    if (!exactMatch && allowCustomInput && searchQuery.trim()) {
      return [
        {
          value: searchQuery.trim(),
          label: `+ Custom Location: "${searchQuery.trim()}"`,
          subLabel: "Press to select custom entered location",
        },
        ...matches,
      ];
    }

    return matches;
  }, [options, searchQuery, allowCustomInput]);

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
                placeholder="Search or type custom value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-gray-50 dark:divide-slate-850">
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
                      onChange(opt.value);
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
  const showToast = useMagicToast();

  const { materials = [], divisions = [], locations = [], transactions = [] } =
    useSelector((state) => state.inventory);
  const { transfers = [] } = useSelector((state) => state.transfers || { transfers: [] });

  // Logged-in user name
  const currentUserName =
    activeUser?.name || localStorage.getItem("user-name") || "Guest Operator";

  // Standardize Division Names
  const normalizedDivisions = useMemo(() => {
    if (!divisions || divisions.length === 0) {
      return ["Division 1", "Division 2", "Division 3", "NUTECH PIPES", "NUTECH COMPOSITES"];
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
    fromLocation: "",
    toLocation: "",
    operatorName: currentUserName,
    remarks: "",
    newSkuCode: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // Filter materials based on selected From Division
  const availableSkus = useMemo(() => {
    if (!formData.fromDivision) return materials;
    return materials.filter((m) => {
      if (!m.division) return true;
      return m.division.toLowerCase() === formData.fromDivision.toLowerCase();
    });
  }, [materials, formData.fromDivision]);

  // Formatted SKU options for SearchableSelect
  const skuSelectOptions = useMemo(() => {
    return availableSkus.map((mat) => ({
      value: mat.sku,
      label: `${mat.sku} — ${mat.name}`,
      subLabel: `Category: ${mat.category || "Item"} | Division: ${mat.division || "Default"}`,
    }));
  }, [availableSkus]);

  // Division select options
  const fromDivisionOptions = useMemo(() => {
    return normalizedDivisions.map((div) => ({
      value: div,
      label: div,
    }));
  }, [normalizedDivisions]);

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

    return Math.max(0, qty);
  }, [selectedMaterial, transactions]);

  // Division-wise Location Options for SearchableSelect
  const fromLocationOptions = useMemo(() => {
    const map = new Map();

    locations.forEach((loc) => {
      const name = typeof loc === "string" ? loc : loc.location;
      const div = typeof loc === "string" ? "" : loc.division;
      if (!name) return;

      if (
        !formData.fromDivision ||
        !div ||
        div.toLowerCase() === formData.fromDivision.toLowerCase()
      ) {
        if (!map.has(name)) {
          map.set(name, {
            value: name,
            label: name,
            subLabel: div
              ? `Division: ${div}`
              : formData.fromDivision
              ? `Division: ${formData.fromDivision}`
              : "Warehouse Location",
          });
        }
      }
    });

    materials.forEach((m) => {
      if (!m.location) return;
      if (
        !formData.fromDivision ||
        (m.division && m.division.toLowerCase() === formData.fromDivision.toLowerCase())
      ) {
        if (!map.has(m.location)) {
          map.set(m.location, {
            value: m.location,
            label: m.location,
            subLabel: m.division
              ? `Division: ${m.division}`
              : formData.fromDivision
              ? `Division: ${formData.fromDivision}`
              : "Material Location",
          });
        }
      }
    });

    return Array.from(map.values());
  }, [locations, materials, formData.fromDivision]);

  const toLocationOptions = useMemo(() => {
    const map = new Map();

    locations.forEach((loc) => {
      const name = typeof loc === "string" ? loc : loc.location;
      const div = typeof loc === "string" ? "" : loc.division;
      if (!name) return;

      if (
        !formData.toDivision ||
        !div ||
        div.toLowerCase() === formData.toDivision.toLowerCase()
      ) {
        if (!map.has(name)) {
          map.set(name, {
            value: name,
            label: name,
            subLabel: div
              ? `Division: ${div}`
              : formData.toDivision
              ? `Division: ${formData.toDivision}`
              : "Destination Location",
          });
        }
      }
    });

    materials.forEach((m) => {
      if (!m.location) return;
      if (
        !formData.toDivision ||
        (m.division && m.division.toLowerCase() === formData.toDivision.toLowerCase())
      ) {
        if (!map.has(m.location)) {
          map.set(m.location, {
            value: m.location,
            label: m.location,
            subLabel: m.division
              ? `Division: ${m.division}`
              : formData.toDivision
              ? `Division: ${formData.toDivision}`
              : "Material Location",
          });
        }
      }
    });

    return Array.from(map.values());
  }, [locations, materials, formData.toDivision]);

  // Validate unique new SKU code
  const isNewSkuDuplicate = useMemo(() => {
    if (!formData.newSkuCode.trim()) return false;
    const code = formData.newSkuCode.trim().toLowerCase();
    const existsInMaterials = materials.some((m) => m.sku.toLowerCase() === code);
    const existsInTransfers = transfers.some(
      (t) => t.newSkuCode && t.newSkuCode.toLowerCase() === code
    );
    return existsInMaterials || existsInTransfers;
  }, [formData.newSkuCode, materials, transfers]);

  // Handle Form Change
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "fromDivision") {
        next.skuCode = "";
        next.fromLocation = "";
        next.quantity = 1;
      }
      if (field === "toDivision") {
        next.toLocation = "";
      }
      return next;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
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
    if (!formData.fromLocation) errors.fromLocation = "From Location is required";
    if (!formData.toLocation) errors.toLocation = "To Location is required";
    if (!formData.newSkuCode.trim()) {
      errors.newSkuCode = "New SKU Code is required";
    } else if (isNewSkuDuplicate) {
      errors.newSkuCode = "This SKU Code already exists. Enter a unique SKU code.";
    }

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
      quantity: Number(formData.quantity),
      availableQty: calculatedAvailableQty,
      transferDate: formData.transferDate,
      fromLocation: formData.fromLocation,
      toLocation: formData.toLocation,
      operatorName: currentUserName,
      remarks: formData.remarks,
      newSkuCode: formData.newSkuCode.trim(),
    };

    dispatch(submitTransfer(payload));
    showToast("Material transfer request submitted successfully!", "success");

    setFormData({
      fromDivision: "",
      toDivision: "",
      skuCode: "",
      quantity: 1,
      transferDate: new Date().toISOString().slice(0, 10),
      fromLocation: "",
      toLocation: "",
      operatorName: currentUserName,
      remarks: "",
      newSkuCode: "",
    });
    setFormErrors({});

    if (onNavigate) {
      onNavigate("transfer-approval");
    }
  };

  return (
    <div className="space-y-6">
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
                onChange={(val) => handleInputChange("skuCode", val)}
                options={skuSelectOptions}
                placeholder={
                  formData.fromDivision
                    ? `Select SKU from ${formData.fromDivision}...`
                    : "Select SKU Code..."
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
                className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border ${
                  formErrors.quantity ? "border-rose-500" : "border-gray-200 dark:border-slate-800"
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
                className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border ${
                  formErrors.transferDate ? "border-rose-500" : "border-gray-200 dark:border-slate-800"
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

          {/* From Location and To Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* From Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-500" />
                <span>From Location</span>
                <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.fromLocation}
                onChange={(val) => handleInputChange("fromLocation", val)}
                options={fromLocationOptions}
                placeholder={
                  formData.fromDivision
                    ? `Select location in ${formData.fromDivision}...`
                    : "Select From Location..."
                }
                error={!!formErrors.fromLocation}
                allowCustomInput={true}
              />
              {formErrors.fromLocation && (
                <p className="text-[11px] font-bold text-rose-500">{formErrors.fromLocation}</p>
              )}
            </div>

            {/* To Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin size={14} className="text-indigo-500" />
                <span>To Location</span>
                <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.toLocation}
                onChange={(val) => handleInputChange("toLocation", val)}
                options={toLocationOptions}
                placeholder={
                  formData.toDivision
                    ? `Select location in ${formData.toDivision}...`
                    : "Select To Location..."
                }
                error={!!formErrors.toLocation}
                allowCustomInput={true}
              />
              {formErrors.toLocation && (
                <p className="text-[11px] font-bold text-rose-500">{formErrors.toLocation}</p>
              )}
            </div>
          </div>

          {/* New SKU Code for Transfer Item */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>New SKU for Transfer Item</span>
                <span className="text-rose-500">*</span>
              </span>
              {formData.newSkuCode.trim() && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isNewSkuDuplicate
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  {isNewSkuDuplicate ? (
                    <>
                      <XCircle size={11} /> Duplicate SKU Code
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={11} /> Unique SKU Available
                    </>
                  )}
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.newSkuCode}
              onChange={(e) => handleInputChange("newSkuCode", e.target.value)}
              placeholder="e.g. SKU-1001-D2 (Created with entered transfer quantity)"
              className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border ${
                formErrors.newSkuCode || isNewSkuDuplicate
                  ? "border-rose-500"
                  : "border-gray-200 dark:border-slate-800"
              } rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none`}
            />
            {formErrors.newSkuCode && (
              <p className="text-[11px] font-bold text-rose-500">{formErrors.newSkuCode}</p>
            )}
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
                  fromLocation: "",
                  toLocation: "",
                  operatorName: currentUserName,
                  remarks: "",
                  newSkuCode: "",
                })
              }
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-850 cursor-pointer"
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
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
