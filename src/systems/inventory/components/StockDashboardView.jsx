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
  AlertCircle,
  Activity,
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
import DailyConsumptionModal from "./DailyConsumptionModal";
import {
  saveMaterial,
  deleteMaterial,
  saveSettings,
  saveList,
  postTransaction,
  clearError,
} from "../../../redux/slice/inventorySlice";
import { useMagicToast } from "../../../context/MagicToastContext";

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
  const { showToast } = useMagicToast();
  const {
    materials,
    transactions,
    indents = [],
    settings,
    units = [],
    locations = [],
    materialNames = [],
    finishedGoodsNames = [],
    divisions = [],
    categories: categoriesFromDb = [],
  } = useSelector((state) => state.inventory);

  const { transfers: allTransfers = [] } = useSelector(
    (state) => state.transfers || {},
  );


  const isViewer = activeUser.role === "Viewer";

  // States
  const [search, setSearch] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("");
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
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);

  // Post Transaction Modal States
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isRecycleModalOpen, setIsRecycleModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("");
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
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

  const [txnFormFgItems, setTxnFormFgItems] = useState([
    { sku: "", qty: "", scraps: "" },
  ]);

  const handleAddFgItemRow = () => {
    setTxnFormFgItems((prev) => [...prev, { sku: "", qty: "", scraps: "" }]);
  };

  const handleRemoveFgItemRow = (index) => {
    setTxnFormFgItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFgItemChange = (index, field, value) => {
    setTxnFormFgItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

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

  // Download CSV template for Toolbar
  const handleDownloadTemplate = () => {
    // Toolbar template: two example rows — one RM, one FG
    const rmRow = [
      "Division 1",  // Firm
      "RM",          // Material Type
      "Resins",      // Material Name (for RM: the raw material catalog name)
      "",            // Sub Category (leave blank for RM)
      "RM-101",      // SKU Code
      "KG",          // Unit
      "Main Warehouse",
      100,           // Opening Stock
      10,            // ADC
      5,             // Lead Time (Days)
      1.5,           // Safety Factor
      50,            // MOQ
      "Tata Steel",  // Supplier Name
      "SUP-01",      // Supplier Code
      "Active",      // Material Status
    ];
    const fgRow = [
      "Division 1",          // Firm
      "FG",                  // Material Type
      "Door frames",         // Category (FG category from inventory_categories)
      "FG78",                // Sub Category (FG Name from inventory_finished_goods)
      "FG-201",              // SKU Code
      "NOS",                 // Unit
      "Main Warehouse",
      50,                    // Opening Stock
      5,                     // ADC
      3,                     // Lead Time (Days)
      1.2,                   // Safety Factor
      20,                    // MOQ
      "Internal Production", // Supplier Name
      "SUP-FG",              // Supplier Code
      "Active",              // Material Status
    ];
    const headers = [
      [
        "Firm",
        "Material Type",
        "Material Name (RM) / Category (FG)",
        "Sub Category (FG Name only)",
        "SKU Code",
        "Unit",
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
      rmRow,
      fgRow,
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

  // Download CSV template for Add Material Modal (RM vs FG)
  const handleDownloadModalTemplate = (matType) => {
    const isFG = matType === "FG";
    let headers;
    if (isFG) {
      // FG template: Category = FG category (from inventory_categories), Sub Category = FG item name
      headers = [
        [
          "Firm",
          "Category",                    // FG category (e.g. Door frames, Panels)
          "Sub Category (FG Name)",      // FG item name from inventory_finished_goods
          "SKU Code",
          "Unit",
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
        [
          "Division 1",
          "Door frames",    // Category
          "FG78",           // FG Name (Sub Category)
          "FG-201",
          "NOS",
          "Sector 5",
          50,
          5,
          3,
          1.2,
          20,
          "Internal Production",
          "SUP-FG",
          "Active",
        ],
      ];
    } else {
      // RM template: Material Name = raw material catalog name (stored as name + used in inventory_raw_materials)
      // category in DB is automatically set to "Raw Material"
      headers = [
        [
          "Firm",
          "Material Name",               // Raw material name (from inventory_raw_materials catalog)
          "SKU Code",
          "Unit",
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
        [
          "Division 1",
          "Resins",       // Material Name
          "RM-101",
          "KG",
          "Sector 5",
          100,
          10,
          5,
          1.5,
          50,
          "Tata Steel",
          "SUP-01",
          "Active",
        ],
      ];
    }
    const csv = Papa.unparse(headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      isFG ? "Finished_Goods_Import_Template.csv" : "Raw_Material_Import_Template.csv",
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV (Toolbar & Modal)
  // RM template columns: Firm | Material Name | SKU Code | Unit | Storage Location | Opening Stock | ADC | Lead Time | Safety Factor | MOQ | Supplier Name | Supplier Code | Material Status
  // FG template columns: Firm | Category | Sub Category (FG Name) | SKU Code | Unit | Storage Location | Opening Stock | ADC | Lead Time | Safety Factor | MOQ | Supplier Name | Supplier Code | Material Status
  // Toolbar template columns: Firm | Material Type (RM/FG) | Material Name (RM) / Category (FG) | Sub Category (FG Name only) | SKU Code | ...
  const handleImportFile = (e, selectedMatType = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            showToast("CSV file is empty or has no valid rows.", "error");
            e.target.value = "";
            return;
          }

          // Build all payloads first (validate structure before saving anything)
          const payloads = [];
          for (let idx = 0; idx < results.data.length; idx++) {
            const row = results.data[idx];
            const sku = String(row["SKU Code"] || row["SKU"] || "").trim();
            if (!sku) continue;

            // --- Determine material type ---
            let isFG = false;
            if (selectedMatType) {
              // Called from modal (type is known)
              isFG = selectedMatType === "FG";
            } else {
              // Toolbar template: read from "Material Type" column
              const rowType = String(
                row["Material Type"] || ""
              ).trim().toUpperCase();
              if (rowType.includes("FG") || rowType.includes("FINISHED")) {
                isFG = true;
              } else if (!rowType || rowType.includes("RM") || rowType.includes("RAW")) {
                isFG = false;
              } else if (
                row["Sub Category (FG Name only)"] ||
                row["Sub Category (FG Name)"] ||
                row["Sub Category"] ||
                row["SubCategory"]
              ) {
                isFG = true;
              }
            }

            // --- Column mapping varies by template ---
            // Toolbar: "Material Name (RM) / Category (FG)"
            // RM modal: "Material Name"
            // FG modal: "Category" + "Sub Category (FG Name)"
            const toolbarMainCol = String(
              row["Material Name (RM) / Category (FG)"] || ""
            ).trim();

            let materialName = "";
            let fgCategory = "";
            let fgName = "";

            if (isFG) {
              // FG: category from "Category" or toolbar combined col, FG name from sub category cols
              fgCategory = String(
                row["Category"] || toolbarMainCol || ""
              ).trim();
              fgName = String(
                row["Sub Category (FG Name)"] ||
                row["Sub Category (FG Name only)"] ||
                row["Sub Category"] ||
                row["SubCategory"] ||
                ""
              ).trim();
            } else {
              // RM: name from "Material Name" or toolbar combined col or "Category" (legacy)
              materialName = String(
                row["Material Name"] || toolbarMainCol || row["Category"] || sku
              ).trim();
            }

            const payload = {
              sku,
              materialType: isFG ? "FG" : "RM",
              // RM: name = raw material name; FG: name = FG item name
              name: isFG ? (fgName || sku) : (materialName || sku),
              // RM: category always = "Raw Material" (auto-enforced); FG: category = FG category
              category: isFG ? fgCategory : "Raw Material",
              subCategory: isFG ? fgName : "",
              unit: String(row["Unit"] || "KG").trim(),
              division: String(row["Firm"] || row["Division"] || "").trim(),
              location: String(row["Storage Location"] || row["Location"] || "").trim(),
              opening: Number(
                row["Opening Stock"] ??
                row["Opening Stock Balance"] ??
                row["Opening"]
              ) || 0,
              adc: Number(row["Average Daily Consumption (ADC)"] ?? row["ADC"]) || 0,
              leadTime: Number(row["Lead Time (Days)"] ?? row["Lead Time"]) || 0,
              safetyFactor: Number(row["Safety Factor"]) || 0,
              moq: Number(row["MOQ"]) || 0,
              supplierName: String(row["Supplier Name"] || "").trim(),
              supplierCode: String(row["Supplier Code"] || "").trim(),
              status: String(row["Material Status"] || row["Status"] || "Active").trim() || "Active",
            };

            payloads.push({
              rowNum: idx + 2,
              sku,
              isExisting: materials.some((m) => m.sku === sku),
              payload,
            });
          }

          if (payloads.length === 0) {
            showToast("No valid rows found in the CSV. Please use the correct template.", "error");
            e.target.value = "";
            return;
          }

          // Save each row sequentially — stop & report on first DB error
          let added = 0;
          let updated = 0;
          for (const { rowNum, sku, isExisting, payload } of payloads) {
            try {
              await dispatch(
                saveMaterial({ material: payload, currentUser: activeUser.name }),
              ).unwrap();
              if (isExisting) updated++;
              else added++;
            } catch (err) {
              const raw = typeof err === "string" ? err : (err?.message || JSON.stringify(err));
              let reason = raw;
              if (raw.includes("fk_inventory_materials_category") || raw.includes("foreign key")) {
                reason = `Category "${payload.category}" does not exist in the system. Please add it in Settings → Categories first.`;
              } else if (raw.includes("duplicate") || raw.includes("unique") || raw.includes("409")) {
                reason = `SKU "${sku}" already exists with conflicting data.`;
              } else if (raw.includes("null value") || raw.includes("not-null")) {
                reason = `A required field is missing for SKU "${sku}".`;
              }
              dispatch(clearError());
              showToast(
                `Row ${rowNum} (SKU: ${sku}) failed — ${reason}`,
                "error",
                8000
              );
              e.target.value = "";
              return;
            }
          }

          showToast(`Import complete: ${added} added, ${updated} updated.`, "success");
        } catch (err) {
          console.error("CSV import error:", err);
          showToast("Failed to import CSV. Please verify the file format and headers.", "error");
        }
        e.target.value = "";
      },
      error: () => {
        showToast("Could not read the file. Make sure it is a valid CSV.", "error");
      },
    });
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
    const isFG = item.materialType === "FG" || item.category === "Finished Goods" || (item.subCategory && item.subCategory !== item.category);
    setFormMaterialType(isFG ? "FG" : "RM");
    setFormSku(item.sku);
    setFormCategory(isFG ? (item.category || "") : (item.name || item.category || ""));
    setFormSubCategory(isFG ? (item.name || item.subCategory || "") : "");
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

    const matName = formCategory.trim();
    const payload = {
      sku: formSku.trim(),
      materialType: formMaterialType,
      name: formMaterialType === "FG" ? formSubCategory.trim() : (matName || formSku.trim()),
      category: formMaterialType === "RM" ? "Raw Material" : matName,
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

  const handleAddNewCategoryPrompt = () => {
    if (formMaterialType === "RM") {
      const val = prompt("Enter new Raw Material Name:");
      if (!val) return;
      const formatted = val.trim();
      if (!formatted) return;
      const exists = (materialNames || []).some((m) =>
        (typeof m === "string" ? m : m.name || "").toLowerCase() === formatted.toLowerCase()
      );
      if (!exists) {
        dispatch(
          saveList({
            type: "materialNames",
            newList: [...materialNames, { name: formatted, status: "Active" }],
            currentUser: activeUser.name,
          })
        );
      }
      setFormCategory(formatted);
    } else {
      const val = prompt("Enter new Category name:");
      if (!val) return;
      const formatted = val.trim();
      if (!formatted) return;
      if (categories.includes(formatted)) {
        alert("Category already exists.");
        return;
      }
      dispatch(
        saveList({
          type: "categories",
          newList: [...categories, formatted],
          currentUser: activeUser.name,
        })
      );
      setFormCategory(formatted);
    }
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
    (allTransfers || [])
      .filter((t) => t.status === "Approved")
      .forEach((trf) => {
        const sku = trf.skuCode;
        const qty = Number(trf.quantity) || 0;
        const mat = materials.find((m) => m.sku === sku);
        if (!mat) return;
        if (mat.division === trf.fromDivision) balances[sku] = (balances[sku] || 0) - qty;
        if (mat.division === trf.toDivision) balances[sku] = (balances[sku] || 0) + qty;
      });
    return balances;
  }, [materials, transactions, allTransfers]);

  const activeMaterials = useMemo(
    () => materials.filter((m) => m.status === "Active"),
    [materials],
  );

  const activeRMaterials = useMemo(
    () => materials.filter((m) => m.status === "Active" && (m.materialType === "RM" || m.material_type === "RM")),
    [materials],
  );

  const activeFGMaterials = useMemo(
    () => materials.filter((m) => m.status === "Active" && (m.materialType === "FG" || m.material_type === "FG")),
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
    setTxnFormFgItems([{ sku: "", qty: "", scraps: "" }]);
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
      if (txnFormFgItems.length === 0) {
        alert("Please add at least one Finished Goods row.");
        return;
      }

      // Collect & validate all finished goods
      const validatedFgItems = [];
      for (let fi = 0; fi < txnFormFgItems.length; fi++) {
        const fgItem = txnFormFgItems[fi];
        const fgSku = (fgItem.sku || "").trim();
        if (!fgSku) {
          alert(`Please select Finished Goods SKU in row ${fi + 1}.`);
          return;
        }
        const fgQty = Number(fgItem.qty);
        if (!fgQty || fgQty <= 0) {
          alert(`Please enter a valid Finished Goods quantity in row ${fi + 1}.`);
          return;
        }
        const scraps = Number(fgItem.scraps) || 0;
        if (fgItem.scraps !== "" && (isNaN(scraps) || scraps < 0)) {
          alert(`Please enter a valid Scraps quantity in row ${fi + 1}.`);
          return;
        }

        const existingFg = materials.find((m) => m.sku === fgSku);
        if (!existingFg) {
          alert(`Selected Finished Goods SKU "${fgSku}" not found in row ${fi + 1}.`);
          return;
        }

        validatedFgItems.push({
          sku: fgSku,
          name: existingFg.name,
          qty: fgQty,
          scraps: scraps,
          material: existingFg,
        });
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

        // 2. Post Finished Goods IN (Job Card) transactions sequentially for each finished goods item
        for (const fgItem of validatedFgItems) {
          await dispatch(
            postTransaction({
              transaction: {
                sku: fgItem.sku,
                name: fgItem.name,
                materialType: 'FG',
                qty: fgItem.qty,
                scraps: fgItem.scraps,
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
        }
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

      // Update location of finished goods if changed
      for (const fgItem of validatedFgItems) {
        if (txnFormLocation && txnFormLocation !== fgItem.material.location) {
          dispatch(
            saveMaterial({
              material: { ...fgItem.material, location: txnFormLocation },
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

  // Material names list (Raw Material Catalog strictly from inventory_raw_materials table)
  const rmCatalogItems = useMemo(() => {
    const list = [];
    (materialNames || []).forEach((item) => {
      if (typeof item === "string") {
        if (item.trim()) list.push({ name: item.trim(), sku: "", category: "Raw Material", materialType: "RM" });
      } else if (item && typeof item === "object") {
        const rawName = typeof item.name === "string" ? item.name : (item.name?.name ? item.name.name : (item.name ? String(item.name) : ""));
        const rawSku = typeof item.sku === "string" ? item.sku : (item.sku ? String(item.sku) : "");
        const name = (rawName || "").trim();
        const sku = (rawSku || "").trim();
        if (name || sku) list.push({ name, sku, category: "Raw Material", materialType: "RM" });
      }
    });
    return list;
  }, [materialNames]);

  // Finished Goods Catalog (strictly from inventory_finished_goods table)
  const fgCatalogItems = useMemo(() => {
    const list = [];
    (finishedGoodsNames || []).forEach((item) => {
      if (typeof item === "string") {
        if (item.trim()) list.push({ name: item.trim(), sku: "", category: "Finished Goods", division: "", materialType: "FG" });
      } else if (item && typeof item === "object") {
        const rawName = typeof item.name === "string" ? item.name : (item.name?.name ? item.name.name : (item.name ? String(item.name) : ""));
        const rawSku = typeof item.sku === "string" ? item.sku : (item.sku ? String(item.sku) : "");
        const rawCat = typeof item.category === "string" ? item.category : "Finished Goods";
        const rawDiv = typeof item.division === "string" ? item.division : "";
        const name = (rawName || "").trim();
        const sku = (rawSku || "").trim();
        const category = (rawCat || "Finished Goods").trim();
        const division = (rawDiv || "").trim();
        if (name || sku) list.push({ name, sku, category, division, materialType: "FG" });
      }
    });
    return list;
  }, [finishedGoodsNames]);

  // Extract unique firm / division list (from divisions table, finished goods, categories, and materials)
  const firms = useMemo(() => {
    const divNames = (divisions || [])
      .map((d) => (typeof d === "string" ? d : d.name))
      .filter(Boolean);
    const fgDivisions = fgCatalogItems.map((f) => f.division).filter(Boolean);
    const dbCatDivisions = (categoriesFromDb || []).map((c) => (typeof c === "string" ? "" : c.division)).filter(Boolean);
    const matDivisions = materials.map((m) => m.division).filter(Boolean);

    return [...new Set([...divNames, ...fgDivisions, ...dbCatDivisions, ...matDivisions])].filter(Boolean).sort();
  }, [divisions, fgCatalogItems, categoriesFromDb, materials]);

  // Extract category names strictly for Finished Goods (material_type IN ('FG', 'ALL'), excluding 'Raw Material')
  const fgCategories = useMemo(() => {
    const list = [];
    (categoriesFromDb || []).forEach((c) => {
      if (typeof c === "string") {
        const trimmed = c.trim();
        if (trimmed && trimmed.toLowerCase() !== "raw material") list.push(trimmed);
      } else if (c && typeof c === "object") {
        const name = (c.name || "").trim();
        const matType = String(c.material_type || c.materialType || "ALL").toUpperCase();
        const division = (c.division || "").trim();
        if (
          name &&
          name.toLowerCase() !== "raw material" &&
          (matType === "FG" || matType === "ALL") &&
          (!firmFilter || !division || division.toLowerCase() === firmFilter.toLowerCase())
        ) {
          list.push(name);
        }
      }
    });
    fgCatalogItems.forEach((f) => {
      if (
        f.category &&
        f.category.trim() &&
        f.category.toLowerCase() !== "raw material" &&
        (!firmFilter || !f.division || f.division.toLowerCase() === firmFilter.toLowerCase())
      ) {
        list.push(f.category.trim());
      }
    });
    materials.forEach((m) => {
      if (
        m.category &&
        m.category.trim() &&
        m.category.toLowerCase() !== "raw material" &&
        (!firmFilter || !m.division || m.division.toLowerCase() === firmFilter.toLowerCase())
      ) {
        list.push(m.category.trim());
      }
    });
    return [...new Set(list)].filter(Boolean).sort();
  }, [categoriesFromDb, fgCatalogItems, materials, firmFilter]);

  // Combined Categories dropdown options based on Material Type and Firm filter
  const categories = useMemo(() => {
    if (materialTypeFilter === "RM") {
      return ["Raw Material"];
    }
    if (materialTypeFilter === "FG") {
      return fgCategories;
    }
    return ["Raw Material", ...fgCategories];
  }, [materialTypeFilter, fgCategories]);

  // Auto-reset category if no longer valid under active filters
  useEffect(() => {
    if (category && !categories.includes(category)) {
      setCategory("");
    }
  }, [categories, category]);

  // Extract all products from Raw Materials, Finished Goods catalogs, and inventory_materials
  const uniqueMaterialNames = useMemo(() => {
    const combinedMap = new Map();

    // 1. Add from Raw Material Catalog (strictly from inventory_raw_materials table)
    rmCatalogItems.forEach((rm) => {
      const sku = (rm.sku || "").trim();
      const name = (rm.name || "").trim();
      if (!sku && !name) return;

      const key = sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}`;
      combinedMap.set(key, {
        sku: sku || "",
        name: name || sku,
        category: "Raw Material",
        materialType: "RM",
        division: "",
      });
    });

    // 2. Add from Finished Goods Catalog (strictly from inventory_finished_goods table)
    fgCatalogItems.forEach((fg) => {
      const sku = (fg.sku || "").trim();
      const name = (fg.name || "").trim();
      if (!sku && !name) return;

      const key = sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}`;
      combinedMap.set(key, {
        sku: sku || "",
        name: name || sku,
        category: fg.category || "Finished Goods",
        materialType: "FG",
        division: fg.division || "",
      });
    });

    // 3. Add from existing inventory_materials
    materials.forEach((m) => {
      const sku = (m.sku || "").trim();
      const name = (m.name || "").trim();
      if (!sku && !name) return;

      const key = sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}`;
      const existing = combinedMap.get(key);
      const isFG =
        m.materialType === "FG" ||
        m.material_type === "FG" ||
        (m.category && m.category.toLowerCase() !== "raw material");

      combinedMap.set(key, {
        sku: sku || existing?.sku || "",
        name: name || existing?.name || sku || "",
        category:
          m.category ||
          existing?.category ||
          (isFG ? "Finished Goods" : "Raw Material"),
        materialType: isFG ? "FG" : "RM",
        division: m.division || existing?.division || "",
      });
    });

    // 4. Add from approved internal transfers
    (allTransfers || [])
      .filter((t) => t.status === "Approved")
      .forEach((trf) => {
        const sku = (trf.skuCode || "").trim();
        const name = (trf.skuName || "").trim();
        if (!sku && !name) return;

        const key = sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}`;
        const existing = combinedMap.get(key);
        if (!existing) {
          combinedMap.set(key, {
            sku: sku || "",
            name: name || sku,
            category: "Raw Material",
            materialType: "RM",
            division: trf.toDivision || trf.fromDivision || "",
          });
        }
      });

    // Determine which items exist in inventory_materials or approved transfers
    const masterNamesSet = new Set(
      materials.map((m) => (m.name || "").toLowerCase().trim()).filter(Boolean)
    );
    const masterSkuSet = new Set(
      materials.map((m) => (m.sku || "").toLowerCase().trim()).filter(Boolean)
    );
    const approvedTransferSkus = new Set(
      (allTransfers || [])
        .filter((t) => t.status === "Approved")
        .map((t) => (t.skuCode || "").toLowerCase().trim())
        .filter(Boolean)
    );
    const approvedTransferNames = new Set(
      (allTransfers || [])
        .filter((t) => t.status === "Approved")
        .map((t) => (t.skuName || "").toLowerCase().trim())
        .filter(Boolean)
    );

    let allItems = Array.from(combinedMap.values()).map((item) => {
      const itemSkuLower = (item.sku || "").toLowerCase().trim();
      const itemNameLower = (item.name || "").toLowerCase().trim();
      const isInMaster =
        (itemSkuLower && masterSkuSet.has(itemSkuLower)) ||
        (itemNameLower && masterNamesSet.has(itemNameLower)) ||
        (itemSkuLower && approvedTransferSkus.has(itemSkuLower)) ||
        (itemNameLower && approvedTransferNames.has(itemNameLower));
      return {
        ...item,
        isMissingOpening: !isInMaster,
      };
    });

    // Apply active filter criteria:
    if (materialTypeFilter) {
      allItems = allItems.filter(
        (item) => item.materialType === materialTypeFilter
      );
    }
    if (category) {
      if (category.toLowerCase() === "raw material") {
        allItems = allItems.filter(
          (item) =>
            item.materialType === "RM" ||
            item.category.toLowerCase() === "raw material"
        );
      } else {
        allItems = allItems.filter(
          (item) => item.category.toLowerCase() === category.toLowerCase()
        );
      }
    }
    if (firmFilter) {
      const ffLower = firmFilter.toLowerCase().trim();
      allItems = allItems.filter(
        (item) =>
          !item.division ||
          item.division.toLowerCase().trim() === ffLower ||
          materials.some(
            (m) =>
              ((m.sku && item.sku && m.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()) ||
                (m.name && item.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim())) &&
              m.division &&
              m.division.toLowerCase().trim() === ffLower
          ) ||
          (allTransfers || []).some(
            (trf) =>
              trf.status === "Approved" &&
              ((trf.skuCode && item.sku && trf.skuCode.toLowerCase().trim() === item.sku.toLowerCase().trim()) ||
                (trf.skuName && item.name && trf.skuName.toLowerCase().trim() === item.name.toLowerCase().trim())) &&
              ((trf.fromDivision && trf.fromDivision.toLowerCase().trim() === ffLower) ||
                (trf.toDivision && trf.toDivision.toLowerCase().trim() === ffLower))
          )
      );
    }

    return allItems.sort((a, b) => {
      const keyA = a.sku || a.name || "";
      const keyB = b.sku || b.name || "";
      return keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [
    rmCatalogItems,
    fgCatalogItems,
    materials,
    allTransfers,
    materialTypeFilter,
    category,
    firmFilter,
  ]);

  // Reset materialFilter if the selected product is no longer in the filtered uniqueMaterialNames
  useEffect(() => {
    if (
      materialFilter &&
      !uniqueMaterialNames.some(
        (item) =>
          item.name === materialFilter ||
          item.sku === materialFilter ||
          (item.sku || item.name) === materialFilter
      )
    ) {
      setMaterialFilter("");
    }
  }, [uniqueMaterialNames, materialFilter]);

  // Detect when the selected product has no opening stock / not in inventory_materials
  const selectedCatalogItem = useMemo(() => {
    if (!materialFilter) return null;
    const mfLower = materialFilter.toLowerCase().trim();
    const existing = materials.find(
      (m) =>
        (m.name || "").toLowerCase() === mfLower ||
        (m.sku || "").toLowerCase() === mfLower
    );
    if (existing) return null; // already initialized in inventory_materials!

    const foundInList = uniqueMaterialNames.find(
      (item) =>
        item.name.toLowerCase() === mfLower ||
        (item.sku && item.sku.toLowerCase() === mfLower)
    );
    if (foundInList) return foundInList;

    const inRm = rmCatalogItems.find(
      (r) =>
        r.name.toLowerCase() === mfLower ||
        (r.sku && r.sku.toLowerCase() === mfLower)
    );
    if (inRm) return { ...inRm, isMissingOpening: true };

    const inFg = fgCatalogItems.find(
      (f) =>
        f.name.toLowerCase() === mfLower ||
        (f.sku && f.sku.toLowerCase() === mfLower)
    );
    if (inFg) return { ...inFg, isMissingOpening: true };

    return {
      name: materialFilter,
      sku: materialFilter,
      category: materialTypeFilter === "RM" ? "Raw Material" : "Finished Goods",
      materialType: materialTypeFilter || "RM",
      subCategory: materialTypeFilter === "FG" ? materialFilter : "",
      division: firmFilter || "",
      isMissingOpening: true,
    };
  }, [
    materialFilter,
    materials,
    uniqueMaterialNames,
    rmCatalogItems,
    fgCatalogItems,
    materialTypeFilter,
    firmFilter,
  ]);

  const handleCreateOpeningForCatalogItem = (catalogItem) => {
    if (!catalogItem) return;
    setModalMode("add");
    const isFG = catalogItem.materialType === "FG";
    setFormMaterialType(isFG ? "FG" : "RM");
    setFormSku(catalogItem.sku || "");
    setFormCategory(isFG ? (catalogItem.category || "") : (catalogItem.name || ""));
    setFormSubCategory(isFG ? (catalogItem.name || catalogItem.subCategory || "") : "");
    setFormUnit(units[0] || (isFG ? "NOS" : "KG"));
    setFormDivision(catalogItem.division || firmFilter || "");
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

  // Category suggestions based on Material Type:
  // - RM: Fetched strictly from inventory_raw_materials table (via rmCatalogItems)
  // - FG: Fetched strictly from inventory_categories table (via fgCategories, material_type IN ('FG', 'ALL'))
  const filteredCategorySuggestions = useMemo(() => {
    const search = (formCategory || "").toLowerCase().trim();
    if (formMaterialType === "RM") {
      const names = rmCatalogItems
        .map((i) => (typeof i.name === "string" ? i.name : (i.name?.name ? String(i.name.name) : String(i.name || ""))))
        .filter(Boolean);
      const uniqueNames = [...new Set(names)];
      return uniqueNames.filter((n) => typeof n === "string" && n.toLowerCase().includes(search));
    }
    return fgCategories.filter((c) => typeof c === "string" && c.toLowerCase().includes(search));
  }, [formMaterialType, rmCatalogItems, fgCategories, formCategory]);

  const filteredSubCategorySuggestions = useMemo(() => {
    const search = (formSubCategory || "").toLowerCase().trim();
    const names = fgCatalogItems
      .map((i) => (typeof i.name === "string" ? i.name : (i.name?.name ? String(i.name.name) : String(i.name || ""))))
      .filter(Boolean);
    const uniqueNames = [...new Set(names)];
    return uniqueNames.filter((n) => typeof n === "string" && n.toLowerCase().includes(search));
  }, [fgCatalogItems, formSubCategory]);

  // Combined SKU Suggestions object list
  const skuSuggestions = useMemo(() => {
    const list = [];
    const targetCatalog = formMaterialType === "RM" ? rmCatalogItems : fgCatalogItems;
    targetCatalog.forEach((item) => {
      const rawSku = typeof item.sku === "string" ? item.sku : (item.sku?.sku ? item.sku.sku : (item.sku ? String(item.sku) : ""));
      const rawName = typeof item.name === "string" ? item.name : (item.name?.name ? item.name.name : (item.name ? String(item.name) : ""));
      const sku = rawSku.trim();
      const name = rawName.trim();
      if (sku && !list.some((l) => l.sku.toLowerCase() === sku.toLowerCase())) {
        list.push({ ...item, sku, name });
      }
    });
    materials.forEach((m) => {
      if ((formMaterialType === "RM" ? m.materialType !== "FG" : m.materialType === "FG")) {
        const rawSku = typeof m.sku === "string" ? m.sku : (m.sku?.sku ? m.sku.sku : (m.sku ? String(m.sku) : ""));
        const rawName = typeof m.name === "string" ? m.name : (m.name?.name ? m.name.name : (m.name ? String(m.name) : ""));
        const sku = rawSku.trim();
        const name = rawName.trim();
        if (sku && !list.some((l) => l.sku.toLowerCase() === sku.toLowerCase())) {
          list.push({ ...m, sku, name });
        }
      }
    });
    return list;
  }, [formMaterialType, rmCatalogItems, fgCatalogItems, materials]);

  const filteredSkuSuggestions = useMemo(() => {
    const search = (formSku || "").toLowerCase().trim();
    return skuSuggestions.filter((s) => {
      const skuStr = typeof s.sku === "string" ? s.sku : String(s.sku || "");
      const nameStr = typeof s.name === "string" ? s.name : String(s.name || "");
      return skuStr.toLowerCase().includes(search) || nameStr.toLowerCase().includes(search);
    });
  }, [skuSuggestions, formSku]);

  // Material Movement Report Calculations
  const reportRows = useMemo(() => {
    const latestTxnDateMap = {};
    const countsMap = {};

    (transactions || []).forEach((t) => {
      if (!t.sku) return;
      const skuKey = t.sku;

      const rawDate = (typeof t.date === "string" ? t.date : (t.created_at || "")).trim();
      const txnDate = rawDate.includes("T") ? rawDate.slice(0, 10) : rawDate.slice(0, 10);

      // Always track the latest transaction date of each material
      if (txnDate && (!latestTxnDateMap[skuKey] || txnDate > latestTxnDateMap[skuKey])) {
        latestTxnDateMap[skuKey] = txnDate;
      }

      // Filter for movement counts based on selected date range
      if (reportFromDate && (!txnDate || txnDate < reportFromDate)) return;
      if (reportToDate && (!txnDate || txnDate > reportToDate)) return;

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
      const latestTxnDate = latestTxnDateMap[m.sku] || "—";
      
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
        txnDate: latestTxnDate,
        inCount: counts.in,
        outCount: counts.out,
        jobCardCount: counts.jobCard,
        totalTxns: counts.in + counts.out + counts.jobCard,
      };
    });
  }, [materials, transactions, finishedGoodsNames, reportFromDate, reportToDate]);

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
      "Transaction Date": r.txnDate,
      "IN Transactions": r.inCount,
      "OUT Transactions": r.outCount,
      "Job Card Transactions": r.jobCardCount,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateSuffix = reportFromDate && reportToDate
      ? `_${reportFromDate}_to_${reportToDate}`
      : reportFromDate
      ? `_from_${reportFromDate}`
      : reportToDate
      ? `_to_${reportToDate}`
      : `_${new Date().toISOString().slice(0, 10)}`;
    link.setAttribute(
      "download",
      `IMS_Material_Movement_Report${dateSuffix}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derived stock table calculations
  const tableRows = useMemo(() => {
    // ─── Step 1: Build per-SKU transaction totals ───────────────────────────
    // Key: sku → { totalIn, totalOut, closing }
    const txnBySku = {};
    materials.forEach((m) => {
      txnBySku[m.sku] = { totalIn: 0, totalOut: 0, closing: Number(m.opening) || 0 };
    });
    transactions.forEach((t) => {
      if (!txnBySku[t.sku]) return;
      const qty = Number(t.qty) || 0;
      if (t.type === "IN" || t.type === "Job Card") {
        txnBySku[t.sku].totalIn += qty;
        txnBySku[t.sku].closing += qty;
      } else {
        txnBySku[t.sku].totalOut += qty;
        txnBySku[t.sku].closing -= qty;
      }
    });

    // ─── Step 2: Build transfer deltas per (SKU, division) from allTransfers ─
    // Structure: { [sku]: { [division]: { transferOut, transferIn, transferIds } } }
    const transferDeltas = {};
    (allTransfers || [])
      .filter((t) => t.status === "Approved")
      .forEach((trf) => {
        const sku = trf.skuCode;
        const qty = Number(trf.quantity) || 0;
        const tId = trf.id;
        if (!transferDeltas[sku]) transferDeltas[sku] = {};

        // FROM division — transfer is OUT
        const fromDiv = trf.fromDivision;
        if (fromDiv) {
          if (!transferDeltas[sku][fromDiv])
            transferDeltas[sku][fromDiv] = { transferOut: 0, transferIn: 0, transferIds: [] };
          transferDeltas[sku][fromDiv].transferOut += qty;
          transferDeltas[sku][fromDiv].transferIds.push(tId);
        }

        // TO division — transfer is IN
        const toDiv = trf.toDivision;
        if (toDiv) {
          if (!transferDeltas[sku][toDiv])
            transferDeltas[sku][toDiv] = { transferOut: 0, transferIn: 0, transferIds: [] };
          transferDeltas[sku][toDiv].transferIn += qty;
          transferDeltas[sku][toDiv].transferIds.push(tId);
        }
      });

    // ─── Step 3: Set of SKUs with approved indents ───────────────────────────
    const approvedIndentSkus = new Set(
      (indents || [])
        .filter((i) => (i.status || "").toLowerCase() === "approved")
        .map((i) => (i.sku || "").toLowerCase())
    );

    // ─── Step 4: Map original material rows (FROM division) ─────────────────
    const rows = materials.map((m) => {
      const skuTxn = txnBySku[m.sku] || { totalIn: 0, totalOut: 0, closing: Number(m.opening) || 0 };
      const delta = (transferDeltas[m.sku] || {})[m.division] || { transferOut: 0, transferIn: 0 };

      // Closing = (opening + txnIN - txnOUT) - transferOut + transferIn
      const closingStock = skuTxn.closing - delta.transferOut + delta.transferIn;
      const totalIn = skuTxn.totalIn + delta.transferIn;
      const totalOut = skuTxn.totalOut + delta.transferOut;

      const safetyStock = (Number(m.adc) || 0) * (Number(m.safetyFactor) || 0);
      const reorderLevel = (Number(m.adc) || 0) * (Number(m.leadTime) || 0) + safetyStock;
      const maxLevel = reorderLevel + (Number(m.moq) || 0);

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
        materialType: (m.materialType || m.material_type || "RM").toUpperCase(),
        closingStock,
        safetyStock,
        reorderLevel,
        maxLevel,
        totalIn,
        totalOut,
        transferIn: delta.transferIn,
        transferOut: delta.transferOut,
        band: bandName,
        hasApprovedIndent: approvedIndentSkus.has((m.sku || "").toLowerCase()),
        isTransferRow: false,
      };
    });

    // ─── Step 5: Synthesize virtual rows for TO divisions ───────────────────
    // For each (sku, toDivision) pair in transfers where that division
    // does NOT already have a material row in inventory_materials, create a virtual row.
    // If the division already has a row (handled above via delta.transferIn), skip.
    const existingKeys = new Set(materials.map((m) => `${m.sku}__${m.division}`));

    (allTransfers || [])
      .filter((t) => t.status === "Approved")
      .forEach((trf) => {
        const key = `${trf.skuCode}__${trf.toDivision}`;
        // Only synthesize if there's no existing inventory_materials row for this sku+division
        if (existingKeys.has(key)) return;

        // Find the source material for metadata (name, category, unit, etc.)
        const sourceMat = materials.find((m) => m.sku === trf.skuCode);
        if (!sourceMat) return;

        // Check if we already added a virtual row for this sku+toDivision
        const virtualKey = `virtual__${trf.skuCode}__${trf.toDivision}`;
        const existingVirtual = rows.find((r) => r._virtualKey === virtualKey);
        if (existingVirtual) {
          // Accumulate into existing virtual row
          existingVirtual.transferIn += Number(trf.quantity) || 0;
          existingVirtual.totalIn += Number(trf.quantity) || 0;
          existingVirtual.closingStock += Number(trf.quantity) || 0;
          return;
        }

        const transferInQty = Number(trf.quantity) || 0;
        const safetyStock = (Number(sourceMat.adc) || 0) * (Number(sourceMat.safetyFactor) || 0);
        const reorderLevel = (Number(sourceMat.adc) || 0) * (Number(sourceMat.leadTime) || 0) + safetyStock;
        const maxLevel = reorderLevel + (Number(sourceMat.moq) || 0);

        let bandName = "Normal Stock";
        if (maxLevel > 0) {
          const pct = (transferInQty / maxLevel) * 100;
          if (pct > 100) bandName = "Excess Stock";
          else if (pct >= 66.33) bandName = "Normal Stock";
          else if (pct >= 33) bandName = "66.33% Stock";
          else bandName = "Below 33%";
        }

        rows.push({
          ...sourceMat,
          // Override division to the receiving division
          division: trf.toDivision,
          opening: 0,
          materialType: (sourceMat.materialType || sourceMat.material_type || "RM").toUpperCase(),
          closingStock: transferInQty,
          safetyStock,
          reorderLevel,
          maxLevel,
          totalIn: transferInQty,
          totalOut: 0,
          transferIn: transferInQty,
          transferOut: 0,
          band: bandName,
          hasApprovedIndent: approvedIndentSkus.has((sourceMat.sku || "").toLowerCase()),
          isTransferRow: true,   // flag so UI can style differently
          transferFromDivision: trf.fromDivision,
          _virtualKey: virtualKey,
        });
        // Add to existingKeys so subsequent transfers for same sku+toDivision can accumulate
        existingKeys.add(key);
      });

    return rows;
  }, [materials, transactions, indents, allTransfers]);


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
    if (materialTypeFilter) {
      rows = rows.filter(
        (r) => (r.materialType || r.material_type || "RM").toUpperCase() === materialTypeFilter,
      );
    }
    if (category) {
      rows = rows.filter((r) => r.category === category);
    }
    if (firmFilter) {
      rows = rows.filter((r) => r.division === firmFilter);
    }
    if (materialFilter) {
      const mfLower = materialFilter.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          (r.name || "").toLowerCase() === mfLower ||
          (r.sku || "").toLowerCase() === mfLower
      );
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
    materialTypeFilter,
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
      .map((t) => ({
        date: t.date,
        type: t.type,
        qty: Number(t.qty) || 0,
        ref: t.ref || "—",
      }));

    const skuTransfers = (allTransfers || [])
      .filter((t) => t.status === "Approved" && t.skuCode === trendModal.sku)
      .filter(
        (t) =>
          !targetMaterial.division ||
          t.fromDivision === targetMaterial.division ||
          t.toDivision === targetMaterial.division
      )
      .map((t) => ({
        date: t.transferDate || (t.approvedAt ? t.approvedAt.slice(0, 10) : t.submittedAt ? t.submittedAt.slice(0, 10) : ""),
        type: targetMaterial.division === t.fromDivision ? "Transfer OUT" : "Transfer IN",
        qty: Number(t.quantity) || 0,
        ref: t.id,
      }));

    const allMovements = [...skuTxns, ...skuTransfers].sort((a, b) =>
      (a.date || "").localeCompare(b.date || "")
    );

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

    allMovements.forEach((m) => {
      const qty = m.qty;
      const isIn = m.type === "IN" || m.type === "Job Card" || m.type === "Transfer IN";
      if (isIn) {
        running += qty;
      } else {
        running -= qty;
      }
      chartData.push({ date: m.date, closing: running });
      tableData.push({
        date: m.date,
        txn: m.type,
        qty: (isIn ? "+" : "-") + qty.toLocaleString(),
        closing: running,
        ref: m.ref || "—",
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
  }, [targetMaterial, transactions, allTransfers, trendModal]);

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
          value={materialTypeFilter}
          onChange={(e) => {
            setMaterialTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Material Types</option>
          <option value="RM">Raw Material (RM)</option>
          <option value="FG">Finished Goods (FG)</option>
        </select>

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
          className="px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-gray-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[280px]"
        >
          <option value="">All Products</option>
          {uniqueMaterialNames.map((item) => {
            const name = typeof item === "string" ? item : item.name;
            const sku = typeof item === "object" ? (item.sku || "") : "";
            const displayLabel = sku
              ? name && sku.toLowerCase().trim() !== name.toLowerCase().trim()
                ? `${sku} - ${name}`
                : sku
              : name;
            const isMissing = typeof item === "object" && item.isMissingOpening;
            const optionVal = sku || name;
            return (
              <option key={sku ? `sku-${sku}` : `name-${name}`} value={optionVal}>
                {displayLabel} {isMissing ? "⚠️ (No Opening Stock)" : ""}
              </option>
            );
          })}
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
            <button
              onClick={() => setIsConsumptionModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <Activity size={16} />
              Daily Consumption Report
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
                  onClick={() => requestSort("materialType")}
                >
                  Material Type
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
                    colSpan={isViewer ? 15 : 16}
                    className="text-center py-12 px-6"
                  >
                    {selectedCatalogItem ? (
                      <div className="max-w-xl mx-auto bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-3xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 mb-3">
                          <AlertCircle size={24} />
                        </div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          No Opening Stock for &ldquo;{selectedCatalogItem.name}&rdquo;
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-slate-300 mt-2 leading-relaxed">
                          This product exists in the{" "}
                          <span className="font-bold text-amber-700 dark:text-amber-300">
                            {selectedCatalogItem.materialType === "FG" ? "Finished Goods" : "Raw Material"}
                          </span>{" "}
                          catalog, but has not been initialized with opening stock in the Inventory Master (<code className="font-mono bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded text-[11px]">inventory_materials</code>).
                        </p>
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={() => handleCreateOpeningForCatalogItem(selectedCatalogItem)}
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                          >
                            <Plus size={16} />
                            Create Opening Stock for &ldquo;{selectedCatalogItem.name}&rdquo;
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-gray-400 dark:text-slate-500">
                        No matching stock items found.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const style =
                    BAND_STYLES[row.band] || BAND_STYLES["Normal Stock"];
                  const matType = (row.materialType || row.material_type || "RM").toUpperCase();
                  return (
                    <tr
                      key={row._virtualKey || `${row.sku}__${row.division}`}
                      className={`transition-all duration-150 ${style.rowCls} ${
                        row.isTransferRow
                          ? "border-l-4 border-teal-400 dark:border-teal-500"
                          : ""
                      }`}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{row.name}</span>
                          {row.isTransferRow && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              ↙ Transfer IN
                            </span>
                          )}
                          {row.hasApprovedIndent && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                              <CheckCircle2 size={12} className="shrink-0" />
                              Approved Indent
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            matType === "FG"
                              ? "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          {matType}
                        </span>
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
                          options={activeRMaterials.map((m) => ({
                            label: m.sku,
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
                                  options={activeFGMaterials.map((m) => ({
                                    label: m.sku,
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
                          options={fgCategories}
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
                                      options={activeRMaterials.map((m) => ({
                                        label: m.sku,
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

                      {/* TOTAL PRODUCTION Section Header & Multi-Item Fields */}
                      <div className="col-span-2 border-t border-gray-200 dark:border-slate-800 pt-3 flex flex-col gap-3">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-left">
                          TOTAL PRODUCTION
                        </span>

                        {/* Multi-Row Finished Goods */}
                        <div className="flex flex-col gap-3">
                          {txnFormFgItems.map((fgRow, fgIdx) => (
                            <div
                              key={fgIdx}
                              className="grid grid-cols-12 gap-3 items-end"
                            >
                              {/* Finished Goods SKU Code */}
                              <div className="flex flex-col gap-1.5 col-span-5 text-left">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                                  Finished Goods SKU {txnFormFgItems.length > 1 ? fgIdx + 1 : ""} *
                                </label>
                                <CustomSelect
                                  required
                                  value={fgRow.sku}
                                  onChange={(val) =>
                                    handleFgItemChange(fgIdx, "sku", val)
                                  }
                                  options={activeFGMaterials.map((m) => ({
                                    label: m.sku,
                                    value: m.sku,
                                  }))}
                                  placeholder="Select Finished Goods SKU..."
                                />
                              </div>

                              {/* Finished Goods Quantity */}
                              <div className="flex flex-col gap-1.5 col-span-3 text-left">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                                  Qty *
                                </label>
                                <input
                                  type="number"
                                  required
                                  min="0.0001"
                                  step="any"
                                  value={fgRow.qty}
                                  onChange={(e) =>
                                    handleFgItemChange(fgIdx, "qty", e.target.value)
                                  }
                                  placeholder="e.g. 50"
                                  className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              {/* Scraps Quantity */}
                              <div className="flex flex-col gap-1.5 col-span-2 text-left">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                                  Scraps
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={fgRow.scraps}
                                  onChange={(e) =>
                                    handleFgItemChange(fgIdx, "scraps", e.target.value)
                                  }
                                  placeholder="e.g. 5"
                                  className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              {/* Action Buttons (+ / -) */}
                              <div className="col-span-2 flex items-center justify-start gap-1 pb-1">
                                {txnFormFgItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFgItemRow(fgIdx)}
                                    className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Remove Finished Goods Row"
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

                                {fgIdx === txnFormFgItems.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={handleAddFgItemRow}
                                    className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Add Finished Goods Row"
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
                    Transaction movement counts (IN, OUT, Job Card) sourced from transactions list
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

              {/* Toolbar: Search, Filter, Date Range, Export */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-gray-50 dark:bg-slate-955/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  <div className="relative min-w-[180px] flex-1 sm:flex-initial">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder="Search SKU or material name..."
                      className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-hidden"
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

                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">From</span>
                    <input
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate(e.target.value)}
                      className="text-xs bg-transparent text-gray-900 dark:text-white outline-hidden cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">To</span>
                    <input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate(e.target.value)}
                      className="text-xs bg-transparent text-gray-900 dark:text-white outline-hidden cursor-pointer"
                    />
                  </div>

                  {(reportFromDate || reportToDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setReportFromDate("");
                        setReportToDate("");
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer border border-rose-200 dark:border-rose-900/50 transition-colors"
                      title="Clear Date Filters"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportReportCSV}
                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:border-purple-500 cursor-pointer transition-colors"
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
                      <th className="px-4 py-3 text-center">Transaction Date</th>
                      <th className="px-4 py-3 text-center">IN</th>
                      <th className="px-4 py-3 text-center">OUT</th>
                      <th className="px-4 py-3 text-center">JOB CARD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-800/60 text-gray-700 dark:text-slate-350">
                    {filteredReportRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-400">
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
                          <td className="px-4 py-3 text-center font-mono text-gray-600 dark:text-slate-400">
                            {r.txnDate}
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

      {/* MODAL: Add / Edit Material */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {modalMode === "edit" ? "Edit Material" : "Add New Material"}
              </h3>
              <div className="flex items-center gap-2">
                {modalMode === "add" && !isViewer && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadModalTemplate(formMaterialType)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:border-indigo-500 bg-white dark:bg-slate-800 cursor-pointer transition-all"
                      title={`Download ${formMaterialType === "FG" ? "Finished Goods" : "Raw Material"} CSV Template`}
                    >
                      <Download size={13} />
                      Template
                    </button>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 cursor-pointer active:scale-95 transition-all">
                      <Upload size={13} />
                      Import CSV
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleImportFile(e, formMaterialType)}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-xl cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {/* 1. Firm Division */}
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
                      <option key={d.id || d.name} value={d.name}>
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
                      onClick={() => {
                        setFormMaterialType("RM");
                        setFormCategory("");
                        setFormSubCategory("");
                        setFormSku("");
                      }}
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
                      onClick={() => {
                        setFormMaterialType("FG");
                        setFormCategory("");
                        setFormSubCategory("");
                        setFormSku("");
                      }}
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

                {/* 3. Material (RM) / Category (FG) */}
                <div className="flex flex-col gap-1.5 text-left relative">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      {formMaterialType === "RM" ? "Material *" : "Category *"}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddNewCategoryPrompt}
                      className="text-xs text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer active:scale-95 transition-transform"
                      title={formMaterialType === "RM" ? "Add New Material" : "Add New Category"}
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
                      placeholder={formMaterialType === "RM" ? "Select or type Raw Material Name..." : "e.g. Door frames, Panels, Louvers"}
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
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-slate-800/40">
                        {filteredCategorySuggestions.map((c) => {
                          const catText = typeof c === "string" ? c : (c && typeof c === "object" ? (c.name || c.sku || "") : String(c));
                          return (
                            <div
                              key={catText}
                              onMouseDown={() => {
                                setFormCategory(catText);
                                if (formMaterialType === "RM") {
                                  const match = rmCatalogItems.find(
                                    (i) => i.name.toLowerCase() === catText.toLowerCase()
                                  );
                                  if (match && match.sku && !formSku) {
                                    setFormSku(match.sku);
                                  }
                                }
                                setShowCategoryDropdown(false);
                              }}
                              className="px-4 py-2 text-sm text-left text-gray-750 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                            >
                              {catText}
                            </div>
                          );
                        })}
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
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-slate-800/40">
                          {filteredSubCategorySuggestions.map((fg) => {
                            const fgText = typeof fg === "string" ? fg : (fg && typeof fg === "object" ? (fg.name || fg.sku || "") : String(fg));
                            return (
                              <div
                                key={fgText}
                                onMouseDown={() => {
                                  setFormSubCategory(fgText);
                                  const match = fgCatalogItems.find(
                                    (i) => i.name.toLowerCase() === fgText.toLowerCase()
                                  );
                                  if (match) {
                                    if (match.sku && !formSku) setFormSku(match.sku);
                                    if (match.category) setFormCategory(match.category);
                                  }
                                  setShowSubCategoryDropdown(false);
                                }}
                                className="px-4 py-2 text-sm text-left text-gray-750 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                              >
                                {fgText}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                )}

                {/* 5. SKU Code (Searchable Combobox) */}
                <div className={`${formMaterialType === "RM" ? "sm:col-span-1" : "sm:col-span-2"} flex flex-col gap-1.5 text-left relative`}>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    SKU Code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={modalMode === "edit"}
                      value={formSku}
                      onChange={(e) => {
                        setFormSku(e.target.value);
                        setShowSkuDropdown(true);
                      }}
                      onFocus={() => setShowSkuDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSkuDropdown(false), 200)
                      }
                      placeholder={formMaterialType === "RM" ? "e.g. RM-001" : "e.g. 001 (Black)"}
                      className="w-full px-3.5 py-2 pr-10 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 focus:outline-hidden font-mono"
                    />
                    {modalMode !== "edit" && (
                      <button
                        type="button"
                        tabIndex="-1"
                        onClick={() => setShowSkuDropdown(!showSkuDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${showSkuDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>

                  {showSkuDropdown && modalMode !== "edit" && filteredSkuSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-slate-800/40">
                      {filteredSkuSuggestions.map((item) => {
                        const skuText = typeof item.sku === "string" ? item.sku : String(item.sku || "");
                        const nameText = typeof item.name === "string" ? item.name : (item.name && typeof item.name === "object" ? (item.name.name || "") : String(item.name || ""));
                        return (
                          <div
                            key={skuText}
                            onMouseDown={() => {
                              setFormSku(skuText);
                              if (formMaterialType === "RM" && nameText) {
                                setFormCategory(nameText);
                              } else if (formMaterialType === "FG" && nameText) {
                                setFormSubCategory(nameText);
                                if (item.category) {
                                  const catStr = typeof item.category === "string" ? item.category : String(item.category || "");
                                  setFormCategory(catStr);
                                }
                              }
                              if (item.unit) setFormUnit(typeof item.unit === "string" ? item.unit : String(item.unit));
                              if (item.location) setFormLocation(typeof item.location === "string" ? item.location : String(item.location));
                              if (item.division) setFormDivision(typeof item.division === "string" ? item.division : String(item.division));
                              if (item.opening !== undefined && item.opening !== null) setFormOpening(item.opening);
                              if (item.adc !== undefined && item.adc !== null) setFormAdc(item.adc);
                              if (item.leadTime !== undefined && item.leadTime !== null) setFormLeadTime(item.leadTime);
                              if (item.safetyFactor !== undefined && item.safetyFactor !== null) setFormSafetyFactor(item.safetyFactor);
                              if (item.moq !== undefined && item.moq !== null) setFormMoq(item.moq);
                              if (item.supplierName) setFormSupplierName(typeof item.supplierName === "string" ? item.supplierName : String(item.supplierName));
                              if (item.supplierCode) setFormSupplierCode(typeof item.supplierCode === "string" ? item.supplierCode : String(item.supplierCode));
                              if (item.status) setFormStatus(typeof item.status === "string" ? item.status : String(item.status));
                              setShowSkuDropdown(false);
                            }}
                            className="px-4 py-2.5 text-xs text-left text-gray-750 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {skuText}
                            </span>
                            {nameText && (
                              <span className="text-gray-500 dark:text-slate-400 font-medium truncate max-w-[180px]">
                                {nameText}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Unit *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddNewUnitPrompt}
                      className="text-xs text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-305 font-bold flex items-center gap-0.5 cursor-pointer active:scale-95 transition-transform"
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

                <div className="flex flex-col gap-1.5">
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
                  <div className="flex flex-col gap-1.5">
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

                <div className="flex flex-col gap-1.5">
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

                <div className="flex flex-col gap-1.5">
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

                <div className="flex flex-col gap-1.5">
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

                <div className="flex flex-col gap-1.5">
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

                <div className="flex flex-col gap-1.5">
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

                <div className="flex flex-col gap-1.5">
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

                <div className="flex flex-col gap-1.5">
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
                <div className="sm:col-span-2 grid grid-cols-3 gap-3 pt-3 border-t border-gray-150 dark:border-slate-800">
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

      {/* MODAL: Recycle */}
      <RecycleModal
        isOpen={isRecycleModalOpen}
        onClose={() => setIsRecycleModalOpen(false)}
        activeUser={activeUser}
        materials={materials}
        finishedGoodsNames={finishedGoodsNames}
        divisions={divisions}
      />

      {/* MODAL: Daily Consumption Report */}
      <DailyConsumptionModal
        isOpen={isConsumptionModalOpen}
        onClose={() => setIsConsumptionModalOpen(false)}
        activeUser={activeUser}
      />
    </div>
  );
}
