// src/systems/inventory/components/PhysicalStockModal.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Layers,
  Building2,
  MapPin,
  Calendar,
  User,
  Loader2,
  ShieldCheck,
  Check,
} from "lucide-react";
import { submitPhysicalStockCount } from "../../../redux/slice/inventorySlice";
import { useMagicToast } from "../../../context/MagicToastContext";

// Searchable custom dropdown
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
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions = useMemo(() => {
    return (options || [])
      .filter(Boolean)
      .map((opt) => {
        if (typeof opt === "string" || typeof opt === "number") {
          return { label: String(opt), value: String(opt) };
        }
        if (opt && typeof opt === "object") {
          const label = String(opt.label ?? opt.name ?? opt.value ?? "");
          const value = String(opt.value ?? opt.sku ?? opt.label ?? "");
          return { label, value, ...opt };
        }
        return null;
      })
      .filter((opt) => opt && opt.label);
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((o) => o.value === value);
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter((o) =>
      (o.label || "").toLowerCase().includes(q) ||
      (o.sku || "").toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  return (
    <div ref={containerRef} className={`relative text-left ${className}`}>
      {required && (
        <input
          type="text"
          value={value || ""}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="opacity-0 absolute inset-0 w-full h-full pointer-events-none -z-10"
        />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery("");
          }
        }}
        className={`w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50/70 dark:bg-slate-950/70 text-sm text-gray-900 dark:text-white flex items-center justify-between focus:ring-2 focus:ring-teal-500 transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100/80 dark:hover:bg-slate-900"
        }`}
      >
        <span
          className={
            selectedOption
              ? "font-medium truncate text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-slate-500 truncate"
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0 ml-2 transition-transform duration-200 ${
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
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-hidden z-50 flex flex-col animate-scale-up">
          {normalizedOptions.length > 5 && (
            <div className="p-2 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-48 p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-2 text-xs text-gray-400 dark:text-slate-500 text-center">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value, opt);
                    setIsOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                    opt.value === value
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
                      : "text-gray-750 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt.label}</span>
                    {opt.subLabel && (
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PhysicalStockModal({
  isOpen,
  onClose,
  activeUser,
  prefill = null,
}) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();

  const {
    materials = [],
    transactions = [],
    locations = [],
    divisions = [],
    materialTypes = [],
  } = useSelector((state) => state.inventory);

  const { transfers: allTransfers = [] } = useSelector(
    (state) => state.transfers || {}
  );

  // Form State
  const [formLocation, setFormLocation] = useState("");
  const [formDivision, setFormDivision] = useState("");
  const [formMaterialType, setFormMaterialType] = useState("RM");
  const [formSku, setFormSku] = useState("");
  const [formMaterialName, setFormMaterialName] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formSystemStock, setFormSystemStock] = useState(0);
  const [formPhysicalQty, setFormPhysicalQty] = useState("");
  const [formCountedBy, setFormCountedBy] = useState("");
  const [formCountedDate, setFormCountedDate] = useState("");
  const [formRemarks, setFormRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate live closing stock map per SKU & division
  const currentClosingStocks = useMemo(() => {
    const txnBySkuDiv = {};
    materials.forEach((m) => {
      const key = `${m.sku}__${m.division || ""}`;
      txnBySkuDiv[key] = { totalIn: 0, totalOut: 0 };
    });

    transactions.forEach((t) => {
      const qty = Number(t.qty) || 0;
      const key = `${t.sku}__${t.firm || ""}`;
      if (!txnBySkuDiv[key]) {
        txnBySkuDiv[key] = { totalIn: 0, totalOut: 0 };
      }
      if (t.type === "IN" || t.type === "Job Card") {
        txnBySkuDiv[key].totalIn += qty;
      } else {
        txnBySkuDiv[key].totalOut += qty;
      }
    });

    const stockMap = {};
    materials.forEach((m) => {
      const key = `${m.sku}__${m.division || ""}`;
      const skuTxn = txnBySkuDiv[key] || { totalIn: 0, totalOut: 0 };

      const transferInQty = (allTransfers || [])
        .filter(
          (t) =>
            t.status === "Approved" &&
            t.skuCode === m.sku &&
            t.toDivision === m.division
        )
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

      const transferOutQty = (allTransfers || [])
        .filter(
          (t) =>
            t.status === "Approved" &&
            t.skuCode === m.sku &&
            t.fromDivision === m.division
        )
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

      const openingStock = Number(m.opening) || 0;
      const totalIn = skuTxn.totalIn + transferInQty;
      const totalOut = skuTxn.totalOut + transferOutQty;
      stockMap[key] = openingStock + totalIn - totalOut;
      if (stockMap[m.sku] === undefined) {
        stockMap[m.sku] = stockMap[key];
      }
    });

    return stockMap;
  }, [materials, transactions, allTransfers]);

  // Set initial form state or prefill when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormCountedDate(localIso);
      setFormCountedBy(activeUser?.name || "Admin");

      if (prefill) {
        setFormLocation(prefill.location || "");
        setFormDivision(prefill.division || "");
        setFormMaterialType((prefill.materialType || "RM").toUpperCase());
        setFormSku(prefill.sku || "");
        setFormMaterialName(prefill.name || "");
        setFormUnit(prefill.unit || "");
        setFormSystemStock(
          prefill.systemStock !== undefined
            ? prefill.systemStock
            : (currentClosingStocks[`${prefill.sku}__${prefill.division || ""}`] ??
               currentClosingStocks[prefill.sku] ??
               0)
        );
        setFormPhysicalQty("");
        setFormRemarks("");
      } else {
        setFormLocation(locations[0]?.location || activeUser?.location || "");
        setFormDivision(divisions[0]?.name || "");
        setFormMaterialType("RM");
        setFormSku("");
        setFormMaterialName("");
        setFormUnit("");
        setFormSystemStock(0);
        setFormPhysicalQty("");
        setFormRemarks("");
      }
    }
  }, [isOpen, prefill, activeUser, locations, divisions, currentClosingStocks]);

  // Filter materials available for the selected division/location and material type
  const availableMaterials = useMemo(() => {
    return materials.filter((m) => {
      const typeMatch =
        !formMaterialType ||
        (m.materialType || m.material_type || "RM").toUpperCase() ===
          formMaterialType.toUpperCase();
      const divMatch =
        !formDivision ||
        formDivision === "ALL" ||
        !m.division ||
        m.division === "ALL" ||
        m.division === formDivision;
      return typeMatch && divMatch;
    });
  }, [materials, formMaterialType, formDivision]);

  // SKU Options for CustomSelect
  const skuOptions = useMemo(() => {
    return availableMaterials.map((m) => ({
      value: m.sku,
      label: `${m.sku} — ${m.name}`,
      sku: m.sku,
      name: m.name,
      unit: m.unit,
      location: m.location,
      division: m.division,
      materialType: (m.materialType || m.material_type || "RM").toUpperCase(),
    }));
  }, [availableMaterials]);

  // Material Name Options for CustomSelect
  const materialNameOptions = useMemo(() => {
    return availableMaterials.map((m) => ({
      value: m.sku,
      label: m.name,
      subLabel: m.sku,
      sku: m.sku,
      name: m.name,
      unit: m.unit,
      location: m.location,
      division: m.division,
      materialType: (m.materialType || m.material_type || "RM").toUpperCase(),
    }));
  }, [availableMaterials]);

  // Handle SKU selection
  const handleSelectSku = (selectedSku, opt) => {
    setFormSku(selectedSku);
    const matched =
      opt || materials.find((m) => m.sku === selectedSku && (!formDivision || m.division === formDivision)) ||
      materials.find((m) => m.sku === selectedSku);

    if (matched) {
      setFormMaterialName(matched.name || "");
      setFormUnit(matched.unit || "");
      if (matched.location && !formLocation) setFormLocation(matched.location);
      if (matched.division && !formDivision) setFormDivision(matched.division);

      const sysStock =
        currentClosingStocks[`${matched.sku}__${matched.division || ""}`] ??
        currentClosingStocks[matched.sku] ??
        0;
      setFormSystemStock(sysStock);
    }
  };

  // Handle Material Name selection
  const handleSelectMaterialName = (selectedSku, opt) => {
    handleSelectSku(selectedSku, opt);
  };

  // Recalculate system stock if SKU, division, or location changes
  useEffect(() => {
    if (formSku) {
      const key = `${formSku}__${formDivision || ""}`;
      const stock = currentClosingStocks[key] ?? currentClosingStocks[formSku] ?? 0;
      setFormSystemStock(stock);
    }
  }, [formSku, formDivision, currentClosingStocks]);

  // Computed Variance
  const variance = useMemo(() => {
    if (formPhysicalQty === "" || formPhysicalQty === null || isNaN(Number(formPhysicalQty))) {
      return null;
    }
    return Number(formPhysicalQty) - Number(formSystemStock);
  }, [formPhysicalQty, formSystemStock]);

  // Count submission handler
  const handleSubmitCount = async (e) => {
    e.preventDefault();

    if (!formSku) {
      showToast("Please select a SKU / Material.", "warning");
      return;
    }
    if (formPhysicalQty === "" || isNaN(Number(formPhysicalQty))) {
      showToast("Please enter a valid physical quantity.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sku: formSku,
        name: formMaterialName || formSku,
        materialType: formMaterialType || "RM",
        division: formDivision || "ALL",
        location: formLocation || "",
        unit: formUnit || "",
        systemStock: Number(formSystemStock) || 0,
        physicalQty: Number(formPhysicalQty) || 0,
        differenceQty: Number(variance || 0),
        countedBy: formCountedBy || activeUser?.name || "Admin",
        countedDate: formCountedDate ? new Date(formCountedDate).toISOString() : new Date().toISOString(),
        remarks: formRemarks || "",
        status: "Pending",
      };

      await dispatch(
        submitPhysicalStockCount({
          physicalData: payload,
          currentUser: activeUser?.name || "Admin",
        })
      ).unwrap();

      showToast("Physical stock count submitted for review successfully!", "success");
      onClose();
    } catch (err) {
      console.error("Physical stock submission failed:", err);
      showToast(`Submission failed: ${err.message || err}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-150 dark:border-slate-800 bg-linear-to-r from-teal-500/10 via-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <ClipboardList size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Record Physical Stock Count
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Verify actual stock in storage and submit variance for review.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Count Entry Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmitCount} className="space-y-6">
            {/* Location, Firm & Material Type selection */}
            <div className="bg-gray-50/70 dark:bg-slate-950/60 p-4.5 rounded-2xl border border-gray-200 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-teal-500" />
                  Storage Location
                </label>
                <CustomSelect
                  value={formLocation}
                  onChange={(val) => setFormLocation(val)}
                  options={locations.map((l) => l.location || l)}
                  placeholder="Select Location"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 size={13} className="text-teal-500" />
                  Firm / Division
                </label>
                <CustomSelect
                  value={formDivision}
                  onChange={(val) => setFormDivision(val)}
                  options={divisions.map((d) => d.name || d)}
                  placeholder="All Firms"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers size={13} className="text-teal-500" />
                  Material Type *
                </label>
                <CustomSelect
                  value={formMaterialType}
                  onChange={(val) => {
                    setFormMaterialType(val);
                    setFormSku("");
                    setFormMaterialName("");
                  }}
                  options={(materialTypes || []).map((mt) => ({
                    value: mt.type_code || mt.typeCode,
                    label: `${mt.type_name || mt.typeName} (${mt.type_code || mt.typeCode})`,
                  }))}
                  placeholder="Select Type"
                  required
                />
              </div>
            </div>

            {/* SKU & Material Name selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                  SKU Code *
                </label>
                <CustomSelect
                  value={formSku}
                  onChange={handleSelectSku}
                  options={skuOptions}
                  placeholder="Select or Search SKU..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                  Material Name
                </label>
                <CustomSelect
                  value={formSku}
                  onChange={handleSelectMaterialName}
                  options={materialNameOptions}
                  placeholder="Select or Search Material Name..."
                />
              </div>
            </div>

            {/* Stock Comparison: System Qty, Physical Qty, Variance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* System Stock (Read-only) */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                  <span className="text-xs font-bold uppercase tracking-wider">System Quantity</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/80 font-bold">
                    Book Stock
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-gray-900 dark:text-white">
                    {Number(formSystemStock).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-gray-500 dark:text-slate-400">
                      {formUnit}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Current closing stock in IMS
                  </p>
                </div>
              </div>

              {/* Physical Stock Input */}
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-teal-700 dark:text-teal-300">
                  <span className="text-xs font-bold uppercase tracking-wider">Physical Quantity *</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/80 font-bold">
                    Actual Count
                  </span>
                </div>
                <div className="mt-2">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formPhysicalQty}
                      onChange={(e) => setFormPhysicalQty(e.target.value)}
                      placeholder="Enter counted qty"
                      className="w-full px-3.5 py-2 border-2 border-teal-400/80 dark:border-teal-600 rounded-xl bg-white dark:bg-slate-900 text-lg font-black text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    />
                    {formUnit && (
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">
                        {formUnit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Variance Display */}
              <div
                className={`p-4 rounded-2xl border flex flex-col justify-between ${
                  variance === null
                    ? "bg-gray-50 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800"
                    : variance === 0
                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
                    : variance > 0
                    ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                    Stock Variance
                  </span>
                  {variance !== null && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        variance === 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-300"
                          : variance > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/80 dark:text-rose-300"
                      }`}
                    >
                      {variance > 0 ? (
                        <>
                          <TrendingUp size={11} /> Surplus
                        </>
                      ) : variance < 0 ? (
                        <>
                          <TrendingDown size={11} /> Shortage
                        </>
                      ) : (
                        <>
                          <Check size={11} /> Match
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <div
                    className={`text-2xl font-black ${
                      variance === null
                        ? "text-gray-400"
                        : variance > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : variance < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {variance !== null ? `${variance > 0 ? "+" : ""}${variance.toLocaleString()}` : "—"}{" "}
                    <span className="text-xs font-normal text-gray-500 dark:text-slate-400">
                      {formUnit}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {variance === null
                      ? "Enter physical count above"
                      : "Physical Qty - System Qty"}
                  </p>
                </div>
              </div>
            </div>

            {/* Counted By, Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-teal-500" />
                  Counted By
                </label>
                <input
                  type="text"
                  value={formCountedBy}
                  onChange={(e) => setFormCountedBy(e.target.value)}
                  placeholder="Store employee name"
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50/70 dark:bg-slate-950/70 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-teal-500" />
                  Count Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={formCountedDate}
                  onChange={(e) => setFormCountedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50/70 dark:bg-slate-950/70 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                Remarks / Observation
              </label>
              <textarea
                rows="2"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Optional observation (e.g. Weighing scale batch #2, damaged pack found, etc.)"
                className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50/70 dark:bg-slate-950/70 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Approval Workflow:</strong> Submitted physical counts are saved with status{" "}
                <span className="font-bold underline">Pending</span> and do NOT directly overwrite official stock.
                An authorized manager reviews and approves the variance from the dedicated Physical Stock Review page.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formSku || formPhysicalQty === ""}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ClipboardList size={16} />
                    Submit Count for Review
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
