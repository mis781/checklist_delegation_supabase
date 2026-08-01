// src/systems/inventory/components/StockDashboardView.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Search,
  ChevronDown,
  X,
  History,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Download,
  Upload,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import Papa from "papaparse";
import RecycleModal from "./RecycleModal";
import {
  saveMaterial,
  deleteMaterial,
  saveSettings,
  saveList,
  postTransaction,
} from "../../../redux/slice/inventorySlice";

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
    return options.map((opt) =>
      typeof opt === "string" || typeof opt === "number"
        ? { label: String(opt), value: String(opt) }
        : opt
    );
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((o) => o.value === value);
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
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
        className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white flex items-center justify-between focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
      >
        <span className={selectedOption ? "font-medium truncate text-gray-900 dark:text-white" : "text-gray-400 dark:text-slate-500 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-56 overflow-hidden z-50 flex flex-col animate-scale-up">
          {normalizedOptions.length > 5 && (
            <div className="p-2 border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-44 p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-2 text-xs text-gray-400 dark:text-slate-500 text-center">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                    opt.value === value
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-gray-750 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/80"
                  }`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const BAND_STYLES = {
  "Excess Stock": {
    rowCls: "bg-blue-500/5 hover:bg-blue-500/10 border-l-4 border-l-blue-500",
    badgeCls:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300",
  },
  "Normal Stock": {
    rowCls:
      "bg-emerald-500/5 hover:bg-emerald-500/10 border-l-4 border-l-emerald-500",
    badgeCls:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
  },
  "66.33% Stock": {
    rowCls:
      "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500",
    badgeCls:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
  },
  "Below 33%": {
    rowCls: "bg-rose-500/5 hover:bg-rose-500/10 border-l-4 border-l-rose-500",
    badgeCls:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
  },
};

export default function StockDashboardView({ activeUser }) {
  const dispatch = useDispatch();
  const {
    materials,
    transactions,
    settings,
    units = [],
    locations = [],
    materialNames = [],
    finishedGoodsNames = [],
    divisions = [],
    categories: categoriesFromDb = [],
  } = useSelector((state) => state.inventory);


  const isViewer = activeUser.role === "Viewer";

  // States
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [firmFilter, setFirmFilter] = useState("");
  const [band, setBand] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");

  // Table Pagination / Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState("sku");
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc

  // Modal states
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    sku: "",
    type: "",
  });
  const [trendModal, setTrendModal] = useState({ isOpen: false, sku: "" });

  // Add Material Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [formMaterialType, setFormMaterialType] = useState("RM"); // 'RM' (Raw Material) or 'FG' (Finished Goods)
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDivision, setFormDivision] = useState("");
  const [formOpening, setFormOpening] = useState(0);
  const [formAdc, setFormAdc] = useState(0);
  const [formLeadTime, setFormLeadTime] = useState(0);
  const [formSafetyFactor, setFormSafetyFactor] = useState(0);
  const [formMoq, setFormMoq] = useState(0);
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formSupplierCode, setFormSupplierCode] = useState("");
  const [formStatus, setFormStatus] = useState("Active");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);

  // Post Transaction Modal States
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isRecycleModalOpen, setIsRecycleModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("");
  const [txnFormSku, setTxnFormSku] = useState("");
  const [txnFormQty, setTxnFormQty] = useState("");
  const [txnFormType, setTxnFormType] = useState("IN");
  const [txnFormRef, setTxnFormRef] = useState("");
  const [txnFormRemarks, setTxnFormRemarks] = useState("");
  const [txnFormDate, setTxnFormDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [txnFormLocation, setTxnFormLocation] = useState("");
  const [txnFormDivision, setTxnFormDivision] = useState("");

  // IN-specific states
  const [txnFormBillingDate, setTxnFormBillingDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [txnFormReceivingDate, setTxnFormReceivingDate] = useState(
    new Date().toISOString().slice(0, 16),
  );

  // Common & OUT-specific states
  const [txnFormPartyName, setTxnFormPartyName] = useState("");
  const [txnFormDestination, setTxnFormDestination] = useState("");
  const [txnFormChallanNo, setTxnFormChallanNo] = useState("");
  const [txnFormInvoiceNo, setTxnFormInvoiceNo] = useState("");
  const [txnFormVehicleNo, setTxnFormVehicleNo] = useState("");

  // OUT multi-row materials
  const [txnFormOutItems, setTxnFormOutItems] = useState([{ sku: "", qty: "" }]);

  // Job Card specific states
  const [txnFormFgCategory, setTxnFormFgCategory] = useState("");
  const [txnFormBatches, setTxnFormBatches] = useState([
    {
      materials: [{ sku: "", qty: "" }],
      numBatches: "",
      remainingBatches: "",
      remainingMaterial: "",
    },
  ]);

  const [txnFormFgName, setTxnFormFgName] = useState("");
  const [txnFormFgQty, setTxnFormFgQty] = useState("");
  const [txnFormScraps, setTxnFormScraps] = useState("");
  const [txnFormRawMaterials, setTxnFormRawMaterials] = useState([{ sku: "", qty: "" }]);

  const handleAddRawMaterialRow = () => {
    setTxnFormRawMaterials((prev) => [...prev, { sku: "", qty: "" }]);
  };

  const handleRemoveRawMaterialRow = (index) => {
    setTxnFormRawMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRawMaterialChange = (index, field, value) => {
    setTxnFormRawMaterials((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddOutItemRow = () => {
    setTxnFormOutItems((prev) => [...prev, { sku: "", qty: "" }]);
  };

  const handleRemoveOutItemRow = (index) => {
    setTxnFormOutItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOutItemChange = (index, field, value) => {
    setTxnFormOutItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Job Card batch handlers
  const handleAddBatch = () => {
    setTxnFormBatches((prev) => [
      ...prev,
      {
        materials: [{ sku: "", qty: "" }],
        numBatches: "",
        remainingBatches: "",
        remainingMaterial: "",
      },
    ]);
  };

  const handleRemoveBatch = (batchIndex) => {
    setTxnFormBatches((prev) => prev.filter((_, i) => i !== batchIndex));
  };

  const handleBatchFieldChange = (batchIndex, field, value) => {
    setTxnFormBatches((prev) =>
      prev.map((batch, i) =>
        i === batchIndex ? { ...batch, [field]: value } : batch,
      ),
    );
  };

  const handleAddBatchMaterial = (batchIndex) => {
    setTxnFormBatches((prev) =>
      prev.map((batch, i) =>
        i === batchIndex
          ? { ...batch, materials: [...batch.materials, { sku: "", qty: "" }] }
          : batch,
      ),
    );
  };

  const handleRemoveBatchMaterial = (batchIndex, matIndex) => {
    setTxnFormBatches((prev) =>
      prev.map((batch, i) =>
        i === batchIndex
          ? {
              ...batch,
              materials: batch.materials.filter((_, j) => j !== matIndex),
            }
          : batch,
      ),
    );
  };

  const handleBatchMaterialChange = (batchIndex, matIndex, field, value) => {
    setTxnFormBatches((prev) =>
      prev.map((batch, i) =>
        i === batchIndex
          ? {
              ...batch,
              materials: batch.materials.map((mat, j) =>
                j === matIndex ? { ...mat, [field]: value } : mat,
              ),
            }
          : batch,
      ),
    );
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      [
        "SKU Code",
        "Sub Category (Material Name)",
        "Category",
        "Unit",
        "Firm",
        "Storage Location",
        "Opening Stock",
        "Average Daily Consumption (ADC)",
        "Lead Time (Days)",
        "Safety Factor",
        "MOQ",
        "Supplier Name",
        "Supplier Code",
        "Material Status",
      ],
    ];
    const csv = Papa.unparse(headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Master_Data_Template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let added = 0;
          let updated = 0;
          results.data.forEach((row) => {
            const sku = String(row["SKU Code"] || "").trim();
            if (!sku) return;
            const nameVal = String(
              row["Sub Category (Material Name)"] ||
              row["Sub Category"] ||
              row["Material Name"] ||
              ""
            ).trim();
            const payload = {
              sku,
              name: nameVal,
              category: String(row["Category"] || "").trim(),
              subCategory: "",
              unit: String(row["Unit"] || "KG").trim(),
              division: String(row["Firm"] || "").trim(),
              location: String(row["Storage Location"] || "").trim(),
              opening: Number(row["Opening Stock"]) || 0,
              adc: Number(row["Average Daily Consumption (ADC)"] ?? row["ADC"]) || 0,
              leadTime: Number(row["Lead Time (Days)"] ?? row["Lead Time"]) || 0,
              safetyFactor: Number(row["Safety Factor"]) || 0,
              moq: Number(row["MOQ"]) || 0,
              supplierName: String(row["Supplier Name"] || "").trim(),
              supplierCode: String(row["Supplier Code"] || "").trim(),
              status:
                String(row["Material Status"] || "Active").trim() || "Active",
            };
            dispatch(
              saveMaterial({ material: payload, currentUser: activeUser.name }),
            );
            if (materials.some((m) => m.sku === sku)) updated++;
            else added++;
          });
          alert(`Import complete: ${added} added, ${updated} updated.`);
        } catch (err) {
          alert("Failed to parse file. Please verify CSV headers.");
        }
      },
    });
    e.target.value = "";
  };

  const handleAdd = () => {
    setModalMode("add");
    setFormMaterialType("RM");
    setFormSku("");
    setFormCategory("");
    setFormSubCategory("");
    setFormUnit(units[0] || "KG");
    setFormDivision("");
    setFormLocation(locations[0]?.location || "");
    setFormOpening(0);
    setFormAdc(0);
    setFormLeadTime(0);
    setFormSafetyFactor(0);
    setFormMoq(0);
    setFormSupplierName("");
    setFormSupplierCode("");
    setFormStatus("Active");
    setIsModalOpen(true);
  };

  const handleEdit = (sku) => {
    const item = materials.find((m) => m.sku === sku);
    if (!item) return;
    setModalMode("edit");
    const isFG = item.category === "Finished Goods" || (item.subCategory && item.subCategory !== item.category);
    setFormMaterialType(isFG ? "FG" : "RM");
    setFormSku(item.sku);
    setFormCategory(item.category || "");
    setFormSubCategory(item.name || item.subCategory || "");
    setFormUnit(item.unit);
    setFormLocation(item.location || "");
    setFormDivision(item.division || "");
    setFormOpening(item.opening || 0);
    setFormAdc(item.adc || 0);
    setFormLeadTime(item.leadTime || 0);
    setFormSafetyFactor(item.safetyFactor || 0);
    setFormMoq(item.moq || 0);
    setFormSupplierName(item.supplierName || "");
    setFormSupplierCode(item.supplierCode || "");
    setFormStatus(item.status || "Active");
    setIsModalOpen(true);
  };

  const handleDelete = (sku) => {
    if (
      window.confirm(
        `Are you sure you want to delete material ${sku}? This cannot be undone.`,
      )
    ) {
      dispatch(deleteMaterial({ sku, currentUser: activeUser.name }));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formSku || !formCategory || !formUnit || (formMaterialType === "FG" && !formSubCategory)) {
      alert("Please fill out all required fields marked with *");
      return;
    }

    if (
      modalMode === "add" &&
      materials.some(
        (m) => m.sku.toLowerCase() === formSku.trim().toLowerCase(),
      )
    ) {
      alert(`SKU ${formSku} already exists in master data!`);
      return;
    }

    const payload = {
      sku: formSku.trim(),
      materialType: formMaterialType,
      name: formMaterialType === "FG" ? formSubCategory.trim() : (formCategory.trim() || formSku.trim()),
      category: formCategory.trim(),
      subCategory: formMaterialType === "FG" ? formSubCategory.trim() : "",
      unit: formUnit,
      location: formLocation,
      division: formDivision,
      opening: Number(formOpening) || 0,
      adc: Number(formAdc) || 0,
      leadTime: Number(formLeadTime) || 0,
      safetyFactor: Number(formSafetyFactor) || 0,
      moq: Number(formMoq) || 0,
      supplierName: formSupplierName.trim(),
      supplierCode: formSupplierCode.trim(),
      status: formStatus,
    };

    dispatch(saveMaterial({ material: payload, currentUser: activeUser.name }));
    setIsModalOpen(false);
  };

  const handleAddNewUnitPrompt = () => {
    const val = prompt("Enter new Unit of Measurement (e.g. BAG, DRUM):");
    if (!val) return;
    const formatted = val.trim().toUpperCase();
    if (!formatted) return;
    if (units.includes(formatted)) {
      alert("Unit already exists.");
      return;
    }
    const updated = [...units, formatted];
    dispatch(
      saveList({ type: "units", list: updated, currentUser: activeUser.name }),
    );
    setFormUnit(formatted);
  };

  const handleAddNewCategoryPrompt = () => {
    const val = prompt("Enter new Category Name (e.g. Packaging, Spares):");
    if (!val) return;
    const formatted = val.trim();
    if (!formatted) return;
    if (!categories.includes(formatted)) {
      const updated = [...categories, formatted];
      dispatch(
        saveList({ type: "categories", list: updated, currentUser: activeUser.name }),
      );
    }
    setFormCategory(formatted);
  };

  const modalSafetyStock =
    (Number(formAdc) || 0) * (Number(formSafetyFactor) || 0);
  const modalReorderLevel =
    (Number(formAdc) || 0) * (Number(formLeadTime) || 0) + modalSafetyStock;
  const modalMaxLevel = modalReorderLevel + (Number(formMoq) || 0);

  // Derived closing stock per SKU (for OUT warning in transaction modal)
  const currentClosingStocks = useMemo(() => {
    const balances = {};
    materials.forEach((m) => {
      balances[m.sku] = Number(m.opening) || 0;
    });
    transactions.forEach((t) => {
      if (balances[t.sku] !== undefined) {
        balances[t.sku] +=
          t.type === "IN" ? Number(t.qty) || 0 : -(Number(t.qty) || 0);
      }
    });
    return balances;
  }, [materials, transactions]);

  const activeMaterials = useMemo(
    () => materials.filter((m) => m.status === "Active"),
    [materials],
  );

  const handleTxnSkuChange = (sku) => {
    setTxnFormSku(sku);
    const mat = materials.find((m) => m.sku === sku);
    setTxnFormLocation(mat ? mat.location || "" : "");
  };

  const handleOpenTxnModal = () => {
    setTxnFormSku("");
    setTxnFormQty("");
    setTxnFormType("IN");
    setTxnFormRef("");
    setTxnFormRemarks("");
    setTxnFormLocation("");
    setTxnFormDivision("");
    setTxnFormDate(new Date().toISOString().slice(0, 10));
    setTxnFormBillingDate(new Date().toISOString().slice(0, 16));
    setTxnFormReceivingDate(new Date().toISOString().slice(0, 16));
    setTxnFormPartyName("");
    setTxnFormDestination("");
    setTxnFormChallanNo("");
    setTxnFormInvoiceNo("");
    setTxnFormVehicleNo("");
    setTxnFormOutItems([{ sku: "", qty: "" }]);
    setTxnFormFgCategory("");
    setTxnFormBatches([
      {
        materials: [{ sku: "", qty: "" }],
        numBatches: "",
        remainingBatches: "",
        remainingMaterial: "",
      },
    ]);
    setTxnFormFgName("");
    setTxnFormFgQty("");
    setTxnFormScraps("");
    setTxnFormRawMaterials([{ sku: "", qty: "" }]);
    setIsTxnModalOpen(true);
  };

  const handlePostTransaction = async (e) => {
    e.preventDefault();

    if (!txnFormType) {
      alert("Please select a movement type.");
      return;
    }

    const isJobCard = txnFormType === "Job card";

    if (isJobCard) {
      if (!txnFormFgCategory) {
        alert("Please select a Finished Goods Category.");
        return;
      }
      if (!txnFormFgName.trim()) {
        alert("Please enter a Finished Goods name.");
        return;
      }
      const fgQty = Number(txnFormFgQty);
      if (!fgQty || fgQty <= 0) {
        alert("Please enter a valid Finished Goods quantity.");
        return;
      }
      const scraps = Number(txnFormScraps) || 0;
      if (txnFormScraps !== "" && (isNaN(scraps) || scraps < 0)) {
        alert("Please enter a valid Scraps quantity.");
        return;
      }

      // Collect & validate all raw materials across all batches
      const validatedItems = [];
      for (let bi = 0; bi < txnFormBatches.length; bi++) {
        const batch = txnFormBatches[bi];
        if (!batch.materials || batch.materials.length === 0) {
          alert(`Please add at least one material in Batch ${bi + 1}.`);
          return;
        }
        for (let mi = 0; mi < batch.materials.length; mi++) {
          const item = batch.materials[mi];
          if (!item.sku) {
            alert(`Please select a Material in Batch ${bi + 1}, row ${mi + 1}.`);
            return;
          }
          const qty = Number(item.qty);
          if (!qty || qty <= 0) {
            alert(`Please enter a valid quantity for Material in Batch ${bi + 1}, row ${mi + 1}.`);
            return;
          }

          const selectedMat = materials.find((m) => m.sku === item.sku);
          if (!selectedMat) {
            alert(`Invalid Material selected in Batch ${bi + 1}, row ${mi + 1}.`);
            return;
          }

          validatedItems.push({
            sku: item.sku,
            name: selectedMat.name,
            qty,
            material: selectedMat,
          });
        }
      }

      if (validatedItems.length === 0) {
        alert("Please add at least one material in Batch Details.");
        return;
      }

      // Check balance for OUT (raw materials consumed)
      for (const item of validatedItems) {
        const balance = currentClosingStocks[item.sku] || 0;
        if (item.qty > balance) {
          const proceed = window.confirm(
            `WARNING: Outward issue of raw material "${item.sku}" (${item.qty.toLocaleString()}) exceeds current closing stock of ${balance.toLocaleString()}.\n\nPost anyway?`,
          );
          if (!proceed) return;
        }
      }

      // Determine Finished Goods SKU
      let fgSku = "";
      const existingFg = materials.find(
        (m) => m.name.toLowerCase() === txnFormFgName.trim().toLowerCase(),
      );

      if (existingFg) {
        fgSku = existingFg.sku;
      } else {
        // Generate new SKU
        const skuNumbers = materials
          .map((m) => {
            const match = m.sku.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
          })
          .filter((n) => n > 0);
        const maxSkuNum =
          skuNumbers.length > 0 ? Math.max(...skuNumbers) : 1000;
        fgSku = `SKU-${maxSkuNum + 1}`;

        // Create new material in master first
        const newFgPayload = {
          sku: fgSku,
          name: txnFormFgName.trim(),
          category: txnFormFgCategory || "F G Material",
          unit: "PCS",
          location: txnFormLocation,
          division: txnFormDivision || activeUser.division || "",
          opening: 0,
          adc: 0,
          leadTime: 0,
          safetyFactor: 0,
          moq: 0,
          status: "Active",
        };

        try {
          await dispatch(
            saveMaterial({
              material: newFgPayload,
              currentUser: activeUser.name,
            }),
          ).unwrap();
        } catch (err) {
          alert(`Failed to save new Finished Goods material: ${err}`);
          return;
        }
      }

      // Now post the transactions sequentially to prevent sequence / PK collision
      try {
        // 1. Post OUT transactions for all raw materials sequentially
        for (const item of validatedItems) {
          await dispatch(
            postTransaction({
              transaction: {
                sku: item.sku,
                name: item.name,
                materialType: item.material ? (item.material.materialType || 'RM') : 'RM',
                qty: item.qty,
                type: "OUT",
                date: txnFormDate,
                ref: txnFormRef.trim(),
                remarks: txnFormRemarks.trim(),
                user: activeUser.name,
                firm: txnFormDivision || activeUser.division || "",
                isJobCard: true,
              },
              currentUser: activeUser.name,
            }),
          ).unwrap();
        }

        // Enrich batch materials with names from master before dispatch
        const enrichedBatches = txnFormBatches.map((batch) => ({
          ...batch,
          materials: (batch.materials || []).map((m) => {
            const mat = materials.find((item) => item.sku === m.sku);
            return {
              ...m,
              name: mat ? mat.name : m.sku,
            };
          }),
        }));

        // 2. Finished Goods IN transaction
        await dispatch(
          postTransaction({
            transaction: {
              sku: fgSku,
              name: txnFormFgName.trim(),
              materialType: 'FG',
              qty: fgQty,
              scraps: Number(txnFormScraps) || 0,
              type: "Job Card",
              date: txnFormDate,
              ref: txnFormRef.trim(),
              remarks: txnFormRemarks.trim(),
              user: activeUser.name,
              firm: txnFormDivision || activeUser.division || "",
              isJobCard: true,
              fgCategory: txnFormFgCategory,
              batches: enrichedBatches,
            },
            currentUser: activeUser.name,
          }),
        ).unwrap();
      } catch (err) {
        alert(`Failed to post Job Card transactions: ${err}`);
        return;
      }

      // Update location of raw materials if changed
      for (const item of validatedItems) {
        if (txnFormLocation && txnFormLocation !== item.material.location) {
          dispatch(
            saveMaterial({
              material: { ...item.material, location: txnFormLocation },
              currentUser: activeUser.name,
            }),
          );
        }
      }
    } else if (txnFormType === "IN") {
      // IN Transaction (Single SKU)
      if (!txnFormBillingDate) {
        alert("Please select a Billing Date.");
        return;
      }
      if (!txnFormReceivingDate) {
        alert("Please select a Receiving Date.");
        return;
      }
      if (!txnFormPartyName.trim()) {
        alert("Please enter Party Name.");
        return;
      }
      if (!txnFormSku) {
        alert("Please select a material SKU.");
        return;
      }
      const selectedMat = materials.find((m) => m.sku === txnFormSku);
      if (!selectedMat) {
        alert("Invalid material selection.");
        return;
      }
      const qty = Number(txnFormQty);
      if (!qty || qty <= 0) {
        alert("Please enter a valid quantity greater than zero.");
        return;
      }

      const receivingDateVal = txnFormReceivingDate
        ? txnFormReceivingDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      dispatch(
        postTransaction({
          transaction: {
            sku: txnFormSku,
            name: selectedMat.name,
            materialType: selectedMat.materialType || 'RM',
            qty,
            type: "IN",
            date: receivingDateVal,
            billingDate: txnFormBillingDate,
            receivingDate: txnFormReceivingDate,
            partyName: txnFormPartyName.trim(),
            ref: txnFormRef.trim(),
            remarks: txnFormRemarks.trim(),
            user: activeUser.name,
            firm: txnFormDivision || activeUser.division || "",
            isJobCard: false,
          },
          currentUser: activeUser.name,
        }),
      );

      if (txnFormLocation && txnFormLocation !== selectedMat.location) {
        dispatch(
          saveMaterial({
            material: { ...selectedMat, location: txnFormLocation },
            currentUser: activeUser.name,
          }),
        );
      }
    } else if (txnFormType === "OUT") {
      // OUT Transaction (Multi-Row SKU + Qty)
      if (!txnFormDate) {
        alert("Please select a Transaction Date.");
        return;
      }
      if (!txnFormPartyName.trim()) {
        alert("Please enter Party Name.");
        return;
      }
      if (!txnFormDestination.trim()) {
        alert("Please enter Destination.");
        return;
      }
      if (!txnFormChallanNo.trim()) {
        alert("Please enter Challan Number.");
        return;
      }
      if (!txnFormInvoiceNo.trim()) {
        alert("Please enter Invoice Number.");
        return;
      }

      if (txnFormOutItems.length === 0) {
        alert("Please add at least one material.");
        return;
      }

      const validatedOutItems = [];
      for (let i = 0; i < txnFormOutItems.length; i++) {
        const item = txnFormOutItems[i];
        if (!item.sku) {
          alert(`Please select a Material in row ${i + 1}.`);
          return;
        }
        const qty = Number(item.qty);
        if (!qty || qty <= 0) {
          alert(`Please enter a valid quantity for Material in row ${i + 1}.`);
          return;
        }

        const selectedMat = materials.find((m) => m.sku === item.sku);
        if (!selectedMat) {
          alert(`Invalid Material selected in row ${i + 1}.`);
          return;
        }

        validatedOutItems.push({
          sku: item.sku,
          name: selectedMat.name,
          qty,
          material: selectedMat,
        });
      }

      // Check stock balance for OUT
      for (const item of validatedOutItems) {
        const balance = currentClosingStocks[item.sku] || 0;
        if (item.qty > balance) {
          const proceed = window.confirm(
            `WARNING: Outward issue of "${item.sku}" (${item.qty.toLocaleString()}) exceeds current closing stock of ${balance.toLocaleString()}.\n\nPost anyway?`,
          );
          if (!proceed) return;
        }
      }

      // Post OUT transactions sequentially
      try {
        for (const item of validatedOutItems) {
          await dispatch(
            postTransaction({
              transaction: {
                sku: item.sku,
                name: item.name,
                materialType: item.material ? (item.material.materialType || 'RM') : 'RM',
                qty: item.qty,
                type: "OUT",
                date: txnFormDate,
                partyName: txnFormPartyName.trim(),
                destination: txnFormDestination.trim(),
                challanNo: txnFormChallanNo.trim(),
                invoiceNo: txnFormInvoiceNo.trim(),
                vehicleNo: txnFormVehicleNo.trim(),
                ref: txnFormRef.trim(),
                remarks: txnFormRemarks.trim(),
                user: activeUser.name,
                firm: txnFormDivision || activeUser.division || "",
                isJobCard: false,
              },
              currentUser: activeUser.name,
            }),
          ).unwrap();

          if (txnFormLocation && txnFormLocation !== item.material.location) {
            dispatch(
              saveMaterial({
                material: { ...item.material, location: txnFormLocation },
                currentUser: activeUser.name,
              }),
            );
          }
        }
      } catch (err) {
        alert(`Failed to post OUT transactions: ${err}`);
        return;
      }
    }
    setIsTxnModalOpen(false);
  };

  // Extract category names from DB table inventory_categories + existing materials
  const dbCategoryNames = useMemo(() => {
    return (categoriesFromDb || [])
      .map((c) => (typeof c === "string" ? c : c.name))
      .filter(Boolean);
  }, [categoriesFromDb]);

  const existingMaterialCategories = useMemo(() => {
    return [...new Set(materials.map((m) => m.category))].filter(Boolean);
  }, [materials]);

  const categories = useMemo(() => {
    return [
      ...new Set([
        ...dbCategoryNames,
        ...existingMaterialCategories,
        "Raw Material",
        "F G Material",
      ]),
    ].filter(Boolean);
  }, [dbCategoryNames, existingMaterialCategories]);

  // Get material names for dropdown filter
  const uniqueMaterialNames = useMemo(() => {
    return [...new Set(materials.map((m) => m.name))].filter(Boolean).sort();
  }, [materials]);

  // Extract unique firm / division list
  const existingMaterialFirms = useMemo(() => {
    return [...new Set(materials.map((m) => m.division))].filter(Boolean);
  }, [materials]);

  const firms = useMemo(() => {
    const divNames = (divisions || [])
      .map((d) => (typeof d === "string" ? d : d.name))
      .filter(Boolean);
    return [...new Set([...divNames, ...existingMaterialFirms])].filter(Boolean).sort();
  }, [divisions, existingMaterialFirms]);

  // Material names list
  const materialNamesSuggestions = useMemo(() => {
    const activeNames = materials.map((m) => m.name);
    return [...new Set([...materialNames, ...activeNames])].filter(Boolean);
  }, [materials, materialNames]);


  const filteredCategorySuggestions = useMemo(() => {
    const search = (formCategory || "").toLowerCase().trim();
    return categories.filter((c) =>
      c != null && c.toLowerCase().includes(search),
    );
  }, [categories, formCategory]);




  const subCategorySuggestions = useMemo(() => {
    const fgNames = (finishedGoodsNames || [])
      .map((fg) => (typeof fg === "string" ? fg : fg.name))
      .filter(Boolean);
    const activeSubCategories = (materials || [])
      .map((m) => m.subCategory)
      .filter(Boolean);
    return [...new Set([...fgNames, ...activeSubCategories])].sort();
  }, [finishedGoodsNames, materials]);

  const filteredSubCategorySuggestions = useMemo(() => {
    const search = (formSubCategory || "").toLowerCase().trim();
    return subCategorySuggestions.filter((sc) =>
      sc.toLowerCase().includes(search),
    );
  }, [subCategorySuggestions, formSubCategory]);

  // Material Movement Report Calculations
  const reportRows = useMemo(() => {
    const countsMap = {};
    (transactions || []).forEach((t) => {
      if (!t.sku) return;
      const skuKey = t.sku;
      if (!countsMap[skuKey]) {
        countsMap[skuKey] = { in: 0, out: 0, jobCard: 0 };
      }
      const type = (t.type || "").trim();
      if (type === "IN") {
        countsMap[skuKey].in += 1;
      } else if (type === "OUT") {
        countsMap[skuKey].out += 1;
      } else if (type === "Job Card" || type === "JOB CARD") {
        countsMap[skuKey].jobCard += 1;
      }
    });

    const finishedGoodsSet = new Set(
      (finishedGoodsNames || []).map((fg) =>
        (typeof fg === "string" ? fg : fg.sku || fg.name || "").toLowerCase()
      )
    );

    return (materials || []).map((m) => {
      const counts = countsMap[m.sku] || { in: 0, out: 0, jobCard: 0 };
      
      const isFinishedGood =
        m.materialType === "FG" ||
        m.material_type === "FG" ||
        finishedGoodsSet.has((m.sku || "").toLowerCase()) ||
        finishedGoodsSet.has((m.name || "").toLowerCase()) ||
        finishedGoodsSet.has((m.subCategory || "").toLowerCase());

      const displayType = isFinishedGood ? "Finished Goods" : "Raw Material";

      return {
        sku: m.sku,
        name: m.name,
        type: displayType,
        rawType: isFinishedGood ? "FG" : "RM",
        inCount: counts.in,
        outCount: counts.out,
        jobCardCount: counts.jobCard,
        totalTxns: counts.in + counts.out + counts.jobCard,
      };
    });
  }, [materials, transactions, finishedGoodsNames]);

  const filteredReportRows = useMemo(() => {
    let rows = reportRows;
    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
      );
    }
    if (reportTypeFilter) {
      rows = rows.filter((r) => r.rawType === reportTypeFilter);
    }
    return rows;
  }, [reportRows, reportSearch, reportTypeFilter]);

  const handleExportReportCSV = () => {
    const exportData = filteredReportRows.map((r) => ({
      "SKU Code": r.sku,
      "Material Name": r.name,
      "Type": r.type,
      "IN Transactions": r.inCount,
      "OUT Transactions": r.outCount,
      "Job Card Transactions": r.jobCardCount,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `IMS_Material_Movement_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derived stock table calculations
  const tableRows = useMemo(() => {
    // 1. Calculate stock balances per SKU
    const matClosing = {};
    const matIn = {};
    const matOut = {};

    materials.forEach((m) => {
      matClosing[m.sku] = Number(m.opening) || 0;
      matIn[m.sku] = 0;
      matOut[m.sku] = 0;
    });

    transactions.forEach((t) => {
      if (matClosing[t.sku] !== undefined) {
        const qty = Number(t.qty) || 0;
        if (t.type === "IN" || t.type === "Job Card") {
          matClosing[t.sku] += qty;
          matIn[t.sku] += qty;
        } else {
          matClosing[t.sku] -= qty;
          matOut[t.sku] += qty;
        }
      }
    });

    return materials.map((m) => {
      const closingStock = matClosing[m.sku] || 0;
      const safetyStock = (Number(m.adc) || 0) * (Number(m.safetyFactor) || 0);
      const reorderLevel =
        (Number(m.adc) || 0) * (Number(m.leadTime) || 0) + safetyStock;
      const maxLevel = reorderLevel + (Number(m.moq) || 0);

      // Determine stock band
      let bandName = "Normal Stock";
      if (maxLevel > 0) {
        const pct = (closingStock / maxLevel) * 100;
        if (pct > 100) bandName = "Excess Stock";
        else if (pct >= 66.33) bandName = "Normal Stock";
        else if (pct >= 33) bandName = "66.33% Stock";
        else bandName = "Below 33%";
      }

      return {
        ...m,
        closingStock,
        safetyStock,
        reorderLevel,
        maxLevel,
        totalIn: matIn[m.sku] || 0,
        totalOut: matOut[m.sku] || 0,
        band: bandName,
      };
    });
  }, [materials, transactions]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let rows = activeUser.location
      ? tableRows.filter((m) => m.location === activeUser.location)
      : tableRows;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
      );
    }
    if (category) {
      rows = rows.filter((r) => r.category === category);
    }
    if (firmFilter) {
      rows = rows.filter((r) => r.division === firmFilter);
    }
    if (materialFilter) {
      rows = rows.filter((r) => r.name === materialFilter);
    }
    if (band) {
      rows = rows.filter((r) => r.band === band);
    }
    // Sort
    return rows.sort((a, b) => {
      let va = a[sortKey],
        vb = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }, [
    tableRows,
    search,
    category,
    firmFilter,
    materialFilter,
    band,
    sortKey,
    sortDir,
    activeUser,
  ]);

  // Pagination details
  const pageSize = settings?.pageSize?.stock || 6;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    dispatch(
      saveSettings({
        settings: {
          ...settings,
          pageSize: {
            ...settings?.pageSize,
            stock: newSize,
          },
        },
        currentUser: activeUser.name,
      }),
    );
    setCurrentPage(1);
  };

  // Handle Sort
  const requestSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => -prev);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
    setCurrentPage(1);
  };

  // Export CSV
  const handleExport = () => {
    const exportData = filteredRows.map((r) => ({
      "SKU Code": r.sku,
      "Material Name": r.name,
      Category: r.category,
      "Sub Category": r.subCategory || "",
      Unit: r.unit || "",
      "Firm": r.division || "",
      "Storage Location": r.location || "",
      "Opening Stock": r.opening || 0,
      "Average Daily Consumption (ADC)": r.adc || 0,
      "Lead Time (Days)": r.leadTime || 0,
      "Safety Factor": r.safetyFactor || 0,
      "Safety Stock": r.safetyStock || 0,
      "Reorder Level": r.reorderLevel || 0,
      MOQ: r.moq || 0,
      "Max Level": r.maxLevel || 0,
      "Supplier Name": r.supplierName || "",
      "Supplier Code": r.supplierCode || "",
      "Material Status": r.status || "Active",
      "Total IN": r.totalIn || 0,
      "Total OUT": r.totalOut || 0,
      "Closing Stock": r.closingStock || 0,
      "Stock Band": r.band || "",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Transaction history modal content
  const historyData = useMemo(() => {
    if (!historyModal.isOpen) return [];
    return transactions
      .filter((t) => t.sku === historyModal.sku && t.type === historyModal.type)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, historyModal]);

  const targetMaterial = useMemo(() => {
    return materials.find(
      (m) => m.sku === (historyModal.sku || trendModal.sku),
    );
  }, [materials, historyModal, trendModal]);

  // Stock trend calculations
  const trendCalculations = useMemo(() => {
    if (!trendModal.isOpen || !targetMaterial)
      return { chartData: [], tableData: [], alert: null };

    const skuTxns = transactions
      .filter((t) => t.sku === trendModal.sku)
      .sort((a, b) => a.date.localeCompare(b.date));

    const safetyStock =
      (Number(targetMaterial.adc) || 0) *
      (Number(targetMaterial.safetyFactor) || 0);
    const reorderLevel =
      (Number(targetMaterial.adc) || 0) *
        (Number(targetMaterial.leadTime) || 0) +
      safetyStock;
    const maxLevel = reorderLevel + (Number(targetMaterial.moq) || 0);

    let running = Number(targetMaterial.opening) || 0;
    const chartData = [{ date: "Opening", closing: running }];
    const tableData = [
      {
        date: "Opening Balance",
        txn: "—",
        qty: "—",
        closing: running,
        ref: "—",
      },
    ];

    skuTxns.forEach((t) => {
      const qty = Number(t.qty) || 0;
      const isIn = t.type === "IN" || t.type === "Job Card";
      if (isIn) {
        running += qty;
      } else {
        running -= qty;
      }
      chartData.push({ date: t.date, closing: running });
      tableData.push({
        date: t.date,
        txn: t.type,
        qty: (isIn ? "+" : "-") + qty.toLocaleString(),
        closing: running,
        ref: t.ref || "—",
      });
    });

    const finalClosing = running;
    let alertType = "healthy";
    let alertMsg = `Stock level is healthy. Current band: ${stockBandOf(finalClosing, maxLevel)}`;

    if (finalClosing <= safetyStock) {
      alertType = "critical";
      alertMsg = `CRITICAL ALERT: Stock (${finalClosing.toLocaleString()}) is below Safety Stock (${safetyStock.toLocaleString()}). Immediate reorder required!`;
    } else if (finalClosing <= reorderLevel) {
      alertType = "warning";
      alertMsg = `Reorder Alert: Stock (${finalClosing.toLocaleString()}) is below Reorder Level (${reorderLevel.toLocaleString()}). Plan a restock soon.`;
    }

    return {
      chartData,
      tableData: tableData.reverse(),
      alert: { type: alertType, message: alertMsg },
      safetyStock,
      reorderLevel,
    };
  }, [targetMaterial, transactions, trendModal]);

  function stockBandOf(closing, maxLevel) {
    if (maxLevel <= 0) return "Normal Stock";
    const pct = (closing / maxLevel) * 100;
    if (pct > 100) return "Excess Stock";
    if (pct >= 66.33) return "Normal Stock";
    if (pct >= 33) return "66.33% Stock";
    return "Below 33%";
  }

  const handleBandClick = (clickedBand) => {
    setBand((prev) => (prev === clickedBand ? "" : clickedBand));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Legend Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-1.5 bg-gray-100/90 dark:bg-slate-950/90 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 shadow-xs">
        {[
          {
            key: "Excess Stock",
            label: "Excess Stock (>100%)",
            bgActive: "bg-blue-600 text-white shadow-blue-500/25 ring-blue-500",
            bgInactive: "bg-blue-600/85 hover:bg-blue-600 text-white",
          },
          {
            key: "Normal Stock",
            label: "Normal Stock (66-100%)",
            bgActive: "bg-emerald-600 text-white shadow-emerald-500/25 ring-emerald-500",
            bgInactive: "bg-emerald-600/85 hover:bg-emerald-600 text-white",
          },
          {
            key: "66.33% Stock",
            label: "66.33% Stock (33-66%)",
            bgActive: "bg-amber-500 text-slate-950 font-black shadow-amber-500/25 ring-amber-500",
            bgInactive: "bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-bold",
          },
          {
            key: "Below 33%",
            label: "Below 33% (Critical)",
            bgActive: "bg-rose-600 text-white shadow-rose-500/25 ring-rose-500",
            bgInactive: "bg-rose-600/85 hover:bg-rose-600 text-white",
          },
        ].map((item) => {
          const isActive = band === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleBandClick(item.key)}
              title={isActive ? "Click to clear filter" : `Filter by ${item.label}`}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs tracking-wider transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? `${item.bgActive} shadow-lg scale-[1.02] ring-2 ring-offset-2 dark:ring-offset-slate-900 z-10`
                  : `${item.bgInactive} ${band ? "opacity-50 hover:opacity-85" : "opacity-100"}`
              }`}
            >
              {isActive && <CheckCircle2 size={15} className="shrink-0 animate-in fade-in zoom-in duration-200" />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search SKU or material name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={firmFilter}
          onChange={(e) => {
            setFirmFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Firms</option>
          {firms.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={materialFilter}
          onChange={(e) => {
            setMaterialFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-gray-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Products</option>
          {uniqueMaterialNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-750 hover:border-indigo-500 hover:text-indigo-650 cursor-pointer bg-white dark:bg-slate-900"
        >
          <FileSpreadsheet size={16} />
          Export CSV
        </button>

        {!isViewer && (
          <>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-350 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:text-indigo-600 cursor-pointer"
            >
              <Download size={14} />
              Template
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-350 bg-white dark:bg-slate-900 cursor-pointer hover:border-indigo-500 hover:text-indigo-600">
              <Upload size={14} />
              Import
              <input
                type="file"
                accept=".csv"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={16} />
              Add Material
            </button>
            <button
              onClick={handleOpenTxnModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={16} />
              Post Transaction
            </button>
            <button
              onClick={() => setIsRecycleModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={16} />
              Recycle
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <FileText size={16} />
              Report
            </button>
          </>
        )}
      </div>

      {/* Grid Container */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("sku")}
                >
                  SKU Code
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("name")}
                >
                  Material Name
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("category")}
                >
                  Category
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("opening")}
                >
                  Opening Stock
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("adc")}
                >
                  ADC
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("leadTime")}
                >
                  Lead Time
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("safetyStock")}
                >
                  Safety Stock
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("reorderLevel")}
                >
                  Reorder Lvl
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("moq")}
                >
                  MOQ
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("maxLevel")}
                >
                  Max Lvl
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("totalIn")}
                >
                  Total IN
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("totalOut")}
                >
                  Total OUT
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("closingStock")}
                >
                  Closing Stock
                </th>
                <th
                  className="px-5 py-4 cursor-pointer hover:text-indigo-500"
                  onClick={() => requestSort("band")}
                >
                  Stock Band
                </th>
                {!isViewer && <th className="px-5 py-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={isViewer ? 14 : 15}
                    className="text-center py-10 text-gray-400 dark:text-slate-500"
                  >
                    No matching stock items found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const style =
                    BAND_STYLES[row.band] || BAND_STYLES["Normal Stock"];
                  return (
                    <tr
                      key={row.sku}
                      className={`transition-all duration-150 ${style.rowCls}`}
                    >
                      <td
                        onClick={() =>
                          setTrendModal({ isOpen: true, sku: row.sku })
                        }
                        className="px-5 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                      >
                        {row.sku}
                      </td>
                      <td
                        onClick={() =>
                          setTrendModal({ isOpen: true, sku: row.sku })
                        }
                        className="px-5 py-4 font-bold text-gray-900 dark:text-white cursor-pointer hover:underline whitespace-nowrap"
                      >
                        {row.name}
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-slate-350">
                        {row.category}
                      </td>
                      <td className="px-5 py-4 text-gray-650 dark:text-slate-350 font-semibold">
                        {(Number(row.opening) || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-800 dark:text-slate-200">
                        {row.adc.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-slate-350">
                        {row.leadTime}d
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-slate-400">
                        {row.safetyStock.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-slate-400">
                        {row.reorderLevel.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-slate-400">
                        {row.moq.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-slate-400">
                        {row.maxLevel.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          onClick={() =>
                            setHistoryModal({
                              isOpen: true,
                              sku: row.sku,
                              type: "IN",
                            })
                          }
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 cursor-pointer hover:bg-teal-500/20"
                        >
                          {row.totalIn.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          onClick={() =>
                            setHistoryModal({
                              isOpen: true,
                              sku: row.sku,
                              type: "OUT",
                            })
                          }
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer hover:bg-rose-500/20"
                        >
                          {row.totalOut.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-black text-gray-900 dark:text-white text-base">
                        {row.closingStock.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${style.badgeCls}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              row.band === "Below 33%"
                                ? "bg-rose-500 animate-pulse"
                                : row.band === "66.33% Stock"
                                  ? "bg-amber-500"
                                  : row.band === "Normal Stock"
                                    ? "bg-emerald-500"
                                    : "bg-blue-500"
                            }`}
                          />
                          {row.band}
                        </span>
                      </td>
                      {!isViewer && (
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(row.sku)}
                              className="p-1 text-gray-450 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(row.sku)}
                              className="p-1 text-gray-450 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-500 dark:text-slate-400">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div>
              Showing{" "}
              {filteredRows.length === 0
                ? 0
                : Math.min(
                    filteredRows.length,
                    (currentPage - 1) * pageSize + 1,
                  )}
              –{Math.min(filteredRows.length, currentPage * pageSize)} of{" "}
              {filteredRows.length} items
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-gray-400 tracking-wider">
                Rows per page:
              </span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="px-2 py-0.5 border border-gray-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-350 cursor-pointer focus:ring-1 focus:ring-indigo-500 font-normal"
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-7 h-7 rounded-lg transition-colors cursor-pointer flex items-center justify-center border text-[11px] ${
                    currentPage === idx + 1
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-850"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Transaction History */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <History className="text-indigo-500" size={20} />
                <span>{historyModal.type} Transaction History</span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, sku: "", type: "" })
                }
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-slate-800/60 mb-5 text-sm">
                <div className="grid grid-cols-2 gap-2 text-gray-700 dark:text-slate-300">
                  <div>
                    SKU Code:{" "}
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {historyModal.sku}
                    </span>
                  </div>
                  <div>
                    Material:{" "}
                    <span className="font-bold text-gray-900 dark:text-white">
                      {targetMaterial?.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-950 text-gray-505 dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-800">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-gray-750 dark:text-slate-300">
                    {historyData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-6 text-gray-400"
                        >
                          No {historyModal.type} logs available.
                        </td>
                      </tr>
                    ) : (
                      historyData.map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {log.date}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                            {log.qty.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {log.ref || "—"}
                          </td>
                          <td className="px-4 py-3 truncate max-w-[80px]">
                            {log.user}
                          </td>
                          <td
                            className="px-4 py-3 max-w-[120px] truncate"
                            title={log.remarks}
                          >
                            {log.remarks || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-150 dark:border-slate-800 px-6 py-4">
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, sku: "", type: "" })
                }
                className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Stock Trend */}
      {trendModal.isOpen && targetMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="text-indigo-500" size={20} />
                <span>
                  Stock Level Analytics — {targetMaterial.name} (
                  {trendModal.sku})
                </span>
              </h3>
              <button
                onClick={() => setTrendModal({ isOpen: false, sku: "" })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
              {/* Alert Ribbon */}
              {trendCalculations.alert && (
                <div
                  className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
                    trendCalculations.alert.type === "critical"
                      ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300"
                      : trendCalculations.alert.type === "warning"
                        ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300"
                  }`}
                >
                  <span className="text-base">
                    {trendCalculations.alert.type === "critical"
                      ? "🚨"
                      : trendCalculations.alert.type === "warning"
                        ? "⚠️"
                        : "✅"}
                  </span>
                  {trendCalculations.alert.message}
                </div>
              )}

              {/* Line Chart */}
              <div className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Stock Level Timeline
                </h4>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendCalculations.chartData}
                      margin={{ top: 10, right: 25, left: -25, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: "9px" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: "9px" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "11px",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={24}
                        iconSize={8}
                        wrapperStyle={{ fontSize: "10px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="closing"
                        name="Stock Level"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <ReferenceLine
                        y={trendCalculations.reorderLevel}
                        stroke="#d97706"
                        strokeDasharray="4 4"
                        label={{
                          value: "Reorder Level",
                          fill: "#d97706",
                          fontSize: 9,
                          position: "insideTopRight",
                        }}
                      />
                      <ReferenceLine
                        y={trendCalculations.safetyStock}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                        label={{
                          value: "Safety Stock",
                          fill: "#ef4444",
                          fontSize: 9,
                          position: "insideBottomRight",
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Transaction Stream */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Transaction Ledger
                </h4>
                <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 text-gray-550 dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-800">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Transaction</th>
                        <th className="px-5 py-3">Quantity</th>
                        <th className="px-5 py-3">Closing Stock Balance</th>
                        <th className="px-5 py-3">Reference #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-gray-750 dark:text-slate-350">
                      {trendCalculations.tableData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50/50 dark:hover:bg-slate-850/30"
                        >
                          <td className="px-5 py-3 font-semibold">
                            {row.date}
                          </td>
                          <td className="px-5 py-3">
                            {row.txn === "IN" ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-400 font-bold">
                                IN
                              </span>
                            ) : row.txn === "OUT" ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 font-bold font-bold">
                                OUT
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-bold">{row.qty}</td>
                          <td className="px-5 py-3 text-gray-900 dark:text-white font-extrabold text-sm">
                            {row.closing.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 font-mono">{row.ref}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-150 dark:border-slate-800 px-6 py-4">
              <button
                onClick={() => setTrendModal({ isOpen: false, sku: "" })}
                className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MATERIAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {modalMode === "edit"
                  ? "Edit Material specifications"
                  : "Add New Material"}
              </h3>
              <div className="flex items-center gap-3">
                {modalMode === "add" && !isViewer && (
                  <label className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 cursor-pointer active:scale-95 transition-all">
                    <Upload size={13} />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto">
                {/* 1. Firm (Full Form Width) */}
                <div className="sm:col-span-2 flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Select Firm
                  </label>
                  <select
                    value={formDivision}
                    onChange={(e) => {
                      const nextDiv = e.target.value;
                      setFormDivision(nextDiv);
                      if (nextDiv) {
                        const isLocInDiv = locations.some(
                          (l) => l.location === formLocation && l.division === nextDiv
                        );
                        if (!isLocInDiv) {
                          setFormLocation("");
                        }
                      }
                    }}
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select firm...</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Material Type Selector (R.M vs F.G) */}
                <div className="sm:col-span-2 flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Material Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormMaterialType("RM")}
                      className={`py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        formMaterialType === "RM"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      R.M (Raw Material)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMaterialType("FG")}
                      className={`py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        formMaterialType === "FG"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      F.G (Finished Goods)
                    </button>
                  </div>
                </div>

                {/* 3. Category */}
                <div className={`${formMaterialType === "FG" ? "sm:col-span-1" : "sm:col-span-1"} flex flex-col gap-1.5 text-left relative`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddNewCategoryPrompt}
                      className="text-xs text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer active:scale-95 transition-transform"
                      title="Add New Category"
                    >
                      <Plus size={12} />
                      New
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formCategory}
                      onChange={(e) => {
                        setFormCategory(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowCategoryDropdown(false), 200)
                      }
                      placeholder={formMaterialType === "RM" ? "e.g. Resins, PVC Resin" : "e.g. Door frames, Panels, Louvers"}
                      className="w-full px-3.5 py-2 pr-10 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      tabIndex="-1"
                      onClick={() =>
                        setShowCategoryDropdown(!showCategoryDropdown)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${showCategoryDropdown ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {showCategoryDropdown &&
                    filteredCategorySuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-slate-800/40">
                        {filteredCategorySuggestions.map((c) => (
                          <div
                            key={c}
                            onMouseDown={() => {
                              setFormCategory(c);
                              setShowCategoryDropdown(false);
                            }}
                            className="px-4 py-2 text-sm text-left text-gray-750 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                          >
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* 4. Sub Category (Only for F.G) */}
                {formMaterialType === "FG" && (
                  <div className="flex flex-col gap-1.5 text-left relative">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Sub Category *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formSubCategory}
                        onChange={(e) => {
                          setFormSubCategory(e.target.value);
                          setShowSubCategoryDropdown(true);
                        }}
                        onFocus={() => setShowSubCategoryDropdown(true)}
                        onBlur={() =>
                          setTimeout(() => setShowSubCategoryDropdown(false), 200)
                        }
                        placeholder="e.g. FG78, FG95"
                        className="w-full px-3.5 py-2 pr-10 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        tabIndex="-1"
                        onClick={() =>
                          setShowSubCategoryDropdown(!showSubCategoryDropdown)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${showSubCategoryDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {showSubCategoryDropdown &&
                      filteredSubCategorySuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-slate-800/40">
                          {filteredSubCategorySuggestions.map((n) => (
                            <div
                              key={n}
                              onMouseDown={() => {
                                setFormSubCategory(n);
                                setShowSubCategoryDropdown(false);
                              }}
                              className="px-4 py-2 text-sm text-left text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {/* 5. SKU Code */}
                <div className={`${formMaterialType === "RM" ? "sm:col-span-1" : "sm:col-span-2"} flex flex-col gap-1.5 text-left`}>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder={formMaterialType === "RM" ? "e.g. RM-001" : "e.g. 001 (Black)"}
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* 5. Unit */}
                <div className="flex flex-col gap-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Unit *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddNewUnitPrompt}
                      className="text-xs text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer active:scale-95 transition-transform"
                      title="Add New Unit"
                    >
                      <Plus size={12} />
                      New
                    </button>
                  </div>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Storage Location
                  </label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select storage location...</option>
                    {locations
                      .filter((l) => !formDivision || l.division === formDivision)
                      .map((l) => (
                        <option key={l.location} value={l.location}>
                          {l.location}
                        </option>
                      ))}
                  </select>
                </div>

                {modalMode === "add" && (
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Opening Stock Balance
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formOpening}
                      onChange={(e) =>
                        setFormOpening(Number(e.target.value) || 0)
                      }
                      className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Avg Daily Consumption (ADC) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formAdc}
                    onChange={(e) => setFormAdc(Number(e.target.value) || 0)}
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Lead Time (Days) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formLeadTime}
                    onChange={(e) =>
                      setFormLeadTime(Number(e.target.value) || 0)
                    }
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Safety Factor *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={formSafetyFactor}
                    onChange={(e) =>
                      setFormSafetyFactor(Number(e.target.value) || 0)
                    }
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    MOQ *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formMoq}
                    onChange={(e) => setFormMoq(Number(e.target.value) || 0)}
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    placeholder="Tata Steel Ltd."
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    value={formSupplierCode}
                    onChange={(e) => setFormSupplierCode(e.target.value)}
                    placeholder="e.g. SUP-001"
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Material Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Auto Calculated Preview Fields */}
                <div className="sm:col-span-2 grid grid-cols-3 gap-3 pt-3 border-t border-gray-150 dark:border-slate-800 text-left">
                  <div className="bg-indigo-500/5 p-3 rounded-2xl border border-indigo-500/10">
                    <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                      Safety Stock
                    </div>
                    <div className="text-sm font-black text-indigo-650 dark:text-indigo-300">
                      {modalSafetyStock.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
                    <div className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
                      Reorder Lvl
                    </div>
                    <div className="text-sm font-black text-amber-650 dark:text-amber-300">
                      {modalReorderLevel.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10">
                    <div className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                      Max Level
                    </div>
                    <div className="text-sm font-black text-blue-650 dark:text-blue-300">
                      {modalMaxLevel.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-150 dark:border-slate-800 px-6 py-4 bg-gray-50 dark:bg-slate-950 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  {modalMode === "edit"
                    ? "Save Specifications"
                    : "Add SKU Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST TRANSACTION MODAL */}
      {isTxnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-lg sm:max-w-2xl shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Inventory Transaction
              </h3>
              <button
                onClick={() => setIsTxnModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePostTransaction}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Firm (Division) — always first, full width */}
                  <div className="flex flex-col gap-1.5 col-span-2 text-left">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Firm *
                    </label>
                    <CustomSelect
                      required
                      value={txnFormDivision}
                      onChange={(val) => {
                        setTxnFormDivision(val);
                        setTxnFormLocation("");
                      }}
                      options={[...new Set(locations.map((l) => l.division).filter(Boolean))]}
                      placeholder="Select a firm..."
                    />
                  </div>

                  {/* Movement Type */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Movement Type *
                    </label>
                    <CustomSelect
                      required
                      value={txnFormType}
                      onChange={(val) => {
                        setTxnFormType(val);
                        setTxnFormSku("");
                        setTxnFormLocation("");
                      }}
                      options={[
                        { label: "IN (Stock Inward / Receipt)", value: "IN" },
                        { label: "OUT (Stock Outward / Issue)", value: "OUT" },
                        { label: "Job Card", value: "Job card" },
                      ]}
                      placeholder="Select movement type..."
                    />
                  </div>

                  {/* Date Fields depending on Movement Type */}
                  {txnFormType === "IN" ? (
                    <>
                      {/* Billing Date */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Billing Date *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={txnFormBillingDate}
                          onChange={(e) => setTxnFormBillingDate(e.target.value)}
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Receiving Date */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Receiving Date *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={txnFormReceivingDate}
                          onChange={(e) => setTxnFormReceivingDate(e.target.value)}
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Party Name */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Party Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={txnFormPartyName}
                          onChange={(e) => setTxnFormPartyName(e.target.value)}
                          placeholder="e.g. Supplier / Vendor Name"
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Select SKU / Material Code */}
                      <div className="flex flex-col gap-1.5 col-span-2 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Select SKU / Material Code *
                        </label>
                        <CustomSelect
                          required
                          value={txnFormSku}
                          onChange={(val) => handleTxnSkuChange(val)}
                          options={activeMaterials.map((m) => ({
                            label: `${m.sku} — ${m.name} (${m.unit})`,
                            value: m.sku,
                          }))}
                          placeholder="Select a material SKU..."
                        />
                      </div>

                      {/* Quantity */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          min="0.0001"
                          step="any"
                          value={txnFormQty}
                          onChange={(e) => setTxnFormQty(e.target.value)}
                          placeholder="e.g. 100"
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  ) : txnFormType === "OUT" ? (
                    <>
                      {/* Transaction Date */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Transaction Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={txnFormDate}
                          onChange={(e) => setTxnFormDate(e.target.value)}
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Party Name */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Party Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={txnFormPartyName}
                          onChange={(e) => setTxnFormPartyName(e.target.value)}
                          placeholder="e.g. Customer / Vendor Name"
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Destination */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Destination *
                        </label>
                        <input
                          type="text"
                          required
                          value={txnFormDestination}
                          onChange={(e) => setTxnFormDestination(e.target.value)}
                          placeholder="e.g. Location / Plant B"
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Challan Number */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Challan Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={txnFormChallanNo}
                          onChange={(e) => setTxnFormChallanNo(e.target.value)}
                          placeholder="e.g. CH-2026-001"
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Invoice Number */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Invoice Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={txnFormInvoiceNo}
                          onChange={(e) => setTxnFormInvoiceNo(e.target.value)}
                          placeholder="e.g. INV-9901"
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Vehicle Number (Optional) */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Vehicle Number
                        </label>
                        <input
                          type="text"
                          value={txnFormVehicleNo}
                          onChange={(e) => setTxnFormVehicleNo(e.target.value)}
                          placeholder="e.g. MH-12-AB-1234 (Optional)"
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Dynamic OUT Materials Section */}
                      <div className="col-span-2 flex flex-col gap-3 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Materials Issued *
                        </label>
                        <div className="flex flex-col gap-3">
                          {txnFormOutItems.map((row, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-end">
                              {/* Select Material */}
                              <div className="flex flex-col gap-1.5 col-span-6 text-left">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                                  Material {index + 1}
                                </label>
                                <CustomSelect
                                  required
                                  value={row.sku}
                                  onChange={(val) => handleOutItemChange(index, "sku", val)}
                                  options={activeMaterials.map((m) => ({
                                    label: `${m.sku} — ${m.name} (${m.unit})`,
                                    value: m.sku,
                                  }))}
                                  placeholder="Select a material SKU..."
                                />
                              </div>

                              {/* Material Quantity */}
                              <div className="flex flex-col gap-1.5 col-span-4 text-left">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                                  Qty *
                                </label>
                                <input
                                  type="number"
                                  required
                                  min="0.0001"
                                  step="any"
                                  value={row.qty}
                                  onChange={(e) => handleOutItemChange(index, "qty", e.target.value)}
                                  placeholder="e.g. 100"
                                  className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="col-span-2 flex items-center justify-start gap-1 pb-1">
                                {txnFormOutItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOutItemRow(index)}
                                    className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-lg transition-colors duration-150 cursor-pointer"
                                    title="Remove Material"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                    </svg>
                                  </button>
                                )}

                                {index === txnFormOutItems.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={handleAddOutItemRow}
                                    className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-lg transition-colors duration-150 cursor-pointer"
                                    title="Add Material"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Transaction Date (Job Card) */}
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Transaction Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={txnFormDate}
                          onChange={(e) => setTxnFormDate(e.target.value)}
                          className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Finished Goods Category */}
                      <div className="flex flex-col gap-1.5 col-span-2 text-left">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Finished Goods Category *
                        </label>
                        <CustomSelect
                          required
                          value={txnFormFgCategory}
                          onChange={(val) => setTxnFormFgCategory(val)}
                          options={categories}
                          placeholder="Select Finished Goods Category..."
                        />
                      </div>

                      {/* Batch Detail Sections */}
                      <div className="col-span-2 flex flex-col gap-4">
                        {txnFormBatches.map((batch, batchIdx) => (
                          <div
                            key={batchIdx}
                            className="p-4 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-950/40 space-y-3 text-left"
                          >
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-2">
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                Batch Detail {batchIdx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                {txnFormBatches.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBatch(batchIdx)}
                                    className="p-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
                                    title="Remove Batch"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                                {batchIdx === txnFormBatches.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={handleAddBatch}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Add Batch"
                                  >
                                    <Plus size={14} /> Add Batch
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* SKU / Material and Quantity grouped with + / - buttons */}
                            <div className="flex flex-col gap-3">
                              {batch.materials.map((matRow, matIdx) => (
                                <div
                                  key={matIdx}
                                  className="grid grid-cols-12 gap-3 items-end"
                                >
                                  {/* SKU / Material Dropdown */}
                                  <div className="flex flex-col gap-1.5 col-span-6 text-left">
                                    <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                                      SKU / Material {matIdx + 1} *
                                    </label>
                                    <CustomSelect
                                      required
                                      value={matRow.sku}
                                      onChange={(val) =>
                                        handleBatchMaterialChange(
                                          batchIdx,
                                          matIdx,
                                          "sku",
                                          val,
                                        )
                                      }
                                      options={activeMaterials.map((m) => ({
                                        label: `${m.sku} — ${m.name} (${m.unit})`,
                                        value: m.sku,
                                      }))}
                                      placeholder="Select SKU / Material..."
                                    />
                                  </div>

                                  {/* Quantity */}
                                  <div className="flex flex-col gap-1.5 col-span-4 text-left">
                                    <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                                      Qty *
                                    </label>
                                    <input
                                      type="number"
                                      required
                                      min="0.0001"
                                      step="any"
                                      value={matRow.qty}
                                      onChange={(e) =>
                                        handleBatchMaterialChange(
                                          batchIdx,
                                          matIdx,
                                          "qty",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="e.g. 100"
                                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>

                                  {/* Action Buttons (+ / -) */}
                                  <div className="col-span-2 flex items-center justify-start gap-1 pb-1">
                                    {batch.materials.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveBatchMaterial(
                                            batchIdx,
                                            matIdx,
                                          )
                                        }
                                        className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                        title="Remove Material Row"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M20 12H4"
                                          />
                                        </svg>
                                      </button>
                                    )}

                                    {matIdx === batch.materials.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAddBatchMaterial(batchIdx)
                                        }
                                        className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                        title="Add Material Row"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 4v16m8-8H4"
                                          />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Batch Textbox Fields: No. of Batches, Remaining Batches, Remaining Material */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                              <div className="flex flex-col gap-1 text-left">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                                  No. of Batches
                                </label>
                                <input
                                  type="text"
                                  value={batch.numBatches}
                                  onChange={(e) =>
                                    handleBatchFieldChange(
                                      batchIdx,
                                      "numBatches",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. 5"
                                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="flex flex-col gap-1 text-left">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                                  Remaining Batches
                                </label>
                                <input
                                  type="text"
                                  value={batch.remainingBatches}
                                  onChange={(e) =>
                                    handleBatchFieldChange(
                                      batchIdx,
                                      "remainingBatches",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. 4"
                                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="flex flex-col gap-1 text-left">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                                  Remaining Material
                                </label>
                                <input
                                  type="text"
                                  value={batch.remainingMaterial}
                                  onChange={(e) =>
                                    handleBatchFieldChange(
                                      batchIdx,
                                      "remainingMaterial",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. 200 KG"
                                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* TOTAL PRODUCTION Section Header & Fields */}
                      <div className="col-span-2 border-t border-gray-200 dark:border-slate-800 pt-3 flex flex-col gap-3">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-left">
                          TOTAL PRODUCTION
                        </span>

                        {/* Finished Goods Name */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                            Finished Goods Name *
                          </label>
                          <CustomSelect
                            required
                            value={txnFormFgName}
                            onChange={(val) => setTxnFormFgName(val)}
                            options={finishedGoodsNames
                              .map((fg) => {
                                const fgName =
                                  typeof fg === "string" ? fg : fg?.name || "";
                                return fgName ? { label: fgName, value: fgName } : null;
                              })
                              .filter(Boolean)}
                            placeholder="Select Finished Goods..."
                          />
                        </div>

                        {/* Finished Goods Quantity & Scraps Quantity */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                              Finished Goods Quantity *
                            </label>
                            <input
                              type="number"
                              required
                              min="0.0001"
                              step="any"
                              value={txnFormFgQty}
                              onChange={(e) => setTxnFormFgQty(e.target.value)}
                              placeholder="e.g. 50"
                              className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                              Scraps Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={txnFormScraps}
                              onChange={(e) => setTxnFormScraps(e.target.value)}
                              placeholder="e.g. 5"
                              className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Break line after section TOTAL PRODUCTION */}
                      <div className="col-span-2 border-b border-gray-200 dark:border-slate-800 my-2" />
                    </>
                  )}

                  {/* Storage Location */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Storage Location *
                    </label>
                    <CustomSelect
                      required
                      value={txnFormLocation}
                      onChange={(val) => setTxnFormLocation(val)}
                      options={[
                        ...new Set([
                          ...locations
                            .filter((l) => !txnFormDivision || l.division === txnFormDivision)
                            .map((l) => l.location),
                          txnFormLocation,
                        ]),
                      ].filter(Boolean)}
                      placeholder="Select a storage location..."
                    />
                  </div>

                  {/* Reference Number */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Reference Number (PO / Invoice / WO)
                    </label>
                    <input
                      type="text"
                      value={txnFormRef}
                      onChange={(e) => setTxnFormRef(e.target.value)}
                      placeholder="e.g. PO-7491"
                      className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Operator Name */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 text-left">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Operator Name
                    </label>
                    <div className="px-3.5 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-100 dark:bg-slate-950/60 text-sm font-semibold text-gray-700 dark:text-slate-350">
                      {activeUser.name} ({activeUser.role})
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="flex flex-col gap-1.5 col-span-2 text-left">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Remarks
                    </label>
                    <textarea
                      rows="2"
                      value={txnFormRemarks}
                      onChange={(e) => setTxnFormRemarks(e.target.value)}
                      placeholder="Optional details..."
                      className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-150 dark:border-slate-800 px-6 py-4 bg-gray-50 dark:bg-slate-950 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsTxnModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-350 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Material Movement Report */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl animate-scale-up flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4 bg-gray-50/50 dark:bg-slate-955/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Material Movement Report
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Transaction movement counts (IN, OUT, Job Card) sourced from inventory_transactions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Top Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                    Total Materials
                  </span>
                  <span className="text-2xl font-black text-indigo-900 dark:text-indigo-100">
                    {filteredReportRows.length}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50">
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block mb-1">
                    Total IN Movements
                  </span>
                  <span className="text-2xl font-black text-teal-900 dark:text-teal-100">
                    {filteredReportRows.reduce((sum, r) => sum + r.inCount, 0)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
                    Total OUT Movements
                  </span>
                  <span className="text-2xl font-black text-rose-900 dark:text-rose-100">
                    {filteredReportRows.reduce((sum, r) => sum + r.outCount, 0)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
                    Total Job Cards
                  </span>
                  <span className="text-2xl font-black text-purple-900 dark:text-purple-100">
                    {filteredReportRows.reduce((sum, r) => sum + r.jobCardCount, 0)}
                  </span>
                </div>
              </div>

              {/* Toolbar: Search, Filter, Export */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 dark:bg-slate-955/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder="Search SKU or material name..."
                      className="w-full pl-9 pr-4 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-hidden"
                    />
                  </div>

                  <select
                    value={reportTypeFilter}
                    onChange={(e) => setReportTypeFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white cursor-pointer"
                  >
                    <option value="">All Types</option>
                    <option value="RM">Raw Material</option>
                    <option value="FG">Finished Goods</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportReportCSV}
                  className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:border-purple-500 cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-955 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-center">IN</th>
                      <th className="px-4 py-3 text-center">OUT</th>
                      <th className="px-4 py-3 text-center">JOB CARD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
                    {filteredReportRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-400">
                          No matching materials found.
                        </td>
                      </tr>
                    ) : (
                      filteredReportRows.map((r) => (
                        <tr key={r.sku} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/20">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {r.sku}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {r.name}
                          </td>
                          <td className="px-4 py-3">
                            {r.rawType === "FG" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400">
                                Finished Goods
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                                Raw Material
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-teal-600 dark:text-teal-400">
                            {r.inCount}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                            {r.outCount}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-purple-600 dark:text-purple-400">
                            {r.jobCardCount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-gray-150 dark:border-slate-800 px-6 py-3 bg-gray-50/50 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Recycle */}
      <RecycleModal
        isOpen={isRecycleModalOpen}
        onClose={() => setIsRecycleModalOpen(false)}
        activeUser={activeUser}
        materials={materials}
        finishedGoodsNames={finishedGoodsNames}
        divisions={divisions}
      />
    </div>
  );
}
