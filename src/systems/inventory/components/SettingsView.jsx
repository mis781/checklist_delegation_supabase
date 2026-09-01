// src/systems/inventory/components/SettingsView.jsx
import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import Papa from "papaparse";
import {
  Plus,
  Trash2,
  Lock,
  MapPin,
  Scale,
  Boxes,
  Factory,
  Search,
  CheckCircle2,
  Edit,
  Edit3,
  Check,
  X,
  FolderTree,
  Download,
  Upload,
  AlertTriangle,
  FileText,
  AlertCircle,
  Filter,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Tag,
} from "lucide-react";
import { saveList, clearError } from "../../../redux/slice/inventorySlice";
import { useMagicToast } from "../../../context/MagicToastContext";
import { isAdministrator } from "../../../utils/roleUtils";



export default function SettingsView({ activeUser }) {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();
  const {
    units = [],
    locations = [],
    divisions = [],
    materialNames = [],
    categories = [],
    finishedGoodsNames = [],
    materialTypes = [],
  } = useSelector((state) => state.inventory);

  const isAdminOrSuper =
    isAdministrator(activeUser?.role, activeUser?.user_name || activeUser?.name) ||
    isAdministrator(localStorage.getItem("role"), localStorage.getItem("user-name"));

  // Active Sub-Tab state
  const [activeSubTab, setActiveSubTab] = useState("units");

  // Loading states for adding new items to prevent double submission
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const [isSubmittingMaterial, setIsSubmittingMaterial] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingFinishedGoods, setIsSubmittingFinishedGoods] = useState(false);
  const [isSubmittingMaterialType, setIsSubmittingMaterialType] = useState(false);

  // State for adding new items
  const [newUnit, setNewUnit] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLocationFirm, setNewLocationFirm] = useState("");
  const [newMaterialSku, setNewMaterialSku] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialHsn, setNewMaterialHsn] = useState("");
  const [newMaterialFirm, setNewMaterialFirm] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryMaterialType, setNewCategoryMaterialType] = useState("");
  const [newCategoryFirm, setNewCategoryFirm] = useState("");
  const [newFinishedGoodsSku, setNewFinishedGoodsSku] = useState("");
  const [newFinishedGoodsName, setNewFinishedGoodsName] = useState("");
  const [newFinishedGoodsCategory, setNewFinishedGoodsCategory] = useState("");
  const [newFinishedGoodsHsn, setNewFinishedGoodsHsn] = useState("");
  const [newFinishedGoodsFirm, setNewFinishedGoodsFirm] = useState("");
  const [newMaterialTypeCode, setNewMaterialTypeCode] = useState("");
  const [newMaterialTypeName, setNewMaterialTypeName] = useState("");

  // Add Item Popup Modal State
  const [addModal, setAddModal] = useState({
    isOpen: false,
    type: null, // "units" | "locations" | "materialNames" | "categories" | "finishedGoodsNames" | "materialTypes"
  });

  const openAddModal = (type) => {
    setAddModal({ isOpen: true, type });
  };

  const closeAddModal = () => {
    setAddModal({ isOpen: false, type: null });
  };

  // CSV Import Preview Modal State
  const [csvPreviewModal, setCsvPreviewModal] = useState({
    isOpen: false,
    type: "", // "raw_materials" | "categories" | "finished_goods" | "material_types"
    title: "",
    fileName: "",
    validRows: [],
    skippedRows: [],
    activeTab: "valid", // "valid" | "skipped"
    searchQuery: "",
    isSubmitting: false,
    inputEvent: null,
  });

  // Search states for tables
  const [searchUnitQuery, setSearchUnitQuery] = useState("");
  const [searchLocationQuery, setSearchLocationQuery] = useState("");
  const [searchLocationDivision, setSearchLocationDivision] = useState("");
  const [searchMaterialQuery, setSearchMaterialQuery] = useState("");
  const [searchMaterialDropdown, setSearchMaterialDropdown] = useState("");
  const [searchMaterialDivision, setSearchMaterialDivision] = useState("");
  const [searchCategoryQuery, setSearchCategoryQuery] = useState("");
  const [searchCategoryMaterialType, setSearchCategoryMaterialType] = useState("");
  const [searchCategoryDivision, setSearchCategoryDivision] = useState("");
  const [searchFinishedGoodsQuery, setSearchFinishedGoodsQuery] = useState("");
  const [searchFinishedGoodsCategory, setSearchFinishedGoodsCategory] = useState("");
  const [searchFinishedGoodsDropdown, setSearchFinishedGoodsDropdown] = useState("");
  const [searchFinishedGoodsDivision, setSearchFinishedGoodsDivision] = useState("");
  const [searchMaterialTypeQuery, setSearchMaterialTypeQuery] = useState("");

  // Sort states for tables
  const [sortUnits, setSortUnits] = useState("default");
  const [sortLocations, setSortLocations] = useState("default");
  const [sortMaterialNames, setSortMaterialNames] = useState("default");
  const [sortCategories, setSortCategories] = useState("default");
  const [sortFinishedGoodsNames, setSortFinishedGoodsNames] = useState("default");
  const [sortMaterialTypes, setSortMaterialTypes] = useState("default");

  // Inline Edit states
  const [editingUnit, setEditingUnit] = useState(null);
  const [editUnitValue, setEditUnitValue] = useState("");

  const [editingLocationIdx, setEditingLocationIdx] = useState(null);
  const [editLocationValue, setEditLocationValue] = useState("");
  const [editLocationFirm, setEditLocationFirm] = useState("");

  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editMaterialSku, setEditMaterialSku] = useState("");
  const [editMaterialValue, setEditMaterialValue] = useState("");
  const [editMaterialHsn, setEditMaterialHsn] = useState("");
  const [editMaterialFirm, setEditMaterialFirm] = useState("");

  const [editingCategoryIdx, setEditingCategoryIdx] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [editCategoryMaterialType, setEditCategoryMaterialType] = useState("FG");
  const [editCategoryFirm, setEditCategoryFirm] = useState("");

  const [editingFinishedGoods, setEditingFinishedGoods] = useState(null);
  const [editFinishedGoodsSku, setEditFinishedGoodsSku] = useState("");
  const [editFinishedGoodsValue, setEditFinishedGoodsValue] = useState("");
  const [editFinishedGoodsCategory, setEditFinishedGoodsCategory] = useState("");
  const [editFinishedGoodsHsn, setEditFinishedGoodsHsn] = useState("");
  const [editFinishedGoodsFirm, setEditFinishedGoodsFirm] = useState("");

  const [editingMaterialTypeIdx, setEditingMaterialTypeIdx] = useState(null);
  const [editMaterialTypeCode, setEditMaterialTypeCode] = useState("");
  const [editMaterialTypeName, setEditMaterialTypeName] = useState("");

  // Multi-select Checkbox states
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedMaterialNames, setSelectedMaterialNames] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedFinishedGoodsNames, setSelectedFinishedGoodsNames] = useState([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);

  // --- BULK DELETE HANDLERS ---
  const handleBulkDeleteUnits = () => {
    if (selectedUnits.length === 0) return;
    if (window.confirm(`Delete ${selectedUnits.length} selected unit(s)?`)) {
      const updated = units.filter((u) => !selectedUnits.includes(u));
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      dispatch(saveList({ type: "units", list: updated, currentUser: userName }));
      setSelectedUnits([]);
    }
  };

  const handleBulkDeleteLocations = () => {
    if (selectedLocations.length === 0) return;
    if (window.confirm(`Delete ${selectedLocations.length} selected location(s)?`)) {
      const updated = locations.filter((l) => !selectedLocations.includes(l.location));
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      dispatch(saveList({ type: "locations", list: updated, currentUser: userName }));
      setSelectedLocations([]);
    }
  };

  const handleBulkDeleteMaterialNames = () => {
    if (selectedMaterialNames.length === 0) return;
    if (window.confirm(`Delete ${selectedMaterialNames.length} selected raw material(s)?`)) {
      const updated = materialNames.filter((m) => {
        const nameVal = typeof m === "string" ? m : m.name;
        return !selectedMaterialNames.includes(nameVal);
      });
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      dispatch(saveList({ type: "materialNames", list: updated, currentUser: userName }));
      setSelectedMaterialNames([]);
    }
  };

  const handleBulkDeleteCategories = () => {
    if (selectedCategories.length === 0) return;
    if (window.confirm(`Delete ${selectedCategories.length} selected category item(s)?`)) {
      const updated = categories.filter((c) => {
        const catName = typeof c === "string" ? c : c.name;
        return !selectedCategories.includes(catName);
      });
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      dispatch(saveList({ type: "categories", list: updated, currentUser: userName }));
      setSelectedCategories([]);
    }
  };

  const handleBulkDeleteFinishedGoodsNames = () => {
    if (selectedFinishedGoodsNames.length === 0) return;
    if (window.confirm(`Delete ${selectedFinishedGoodsNames.length} selected finished goods item(s)?`)) {
      const updated = finishedGoodsNames.filter((fg) => {
        const nameVal = typeof fg === "string" ? fg : fg.name;
        return !selectedFinishedGoodsNames.includes(nameVal);
      });
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      dispatch(saveList({ type: "finishedGoodsNames", list: updated, currentUser: userName }));
      setSelectedFinishedGoodsNames([]);
    }
  };

  const handleBulkDeleteMaterialTypes = () => {
    if (selectedMaterialTypes.length === 0) return;
    if (window.confirm(`Delete ${selectedMaterialTypes.length} selected material type(s)?`)) {
      const updated = materialTypes.filter((mt) => {
        const code = (mt.type_code || mt.typeCode || "").toUpperCase();
        return !selectedMaterialTypes.includes(code);
      });
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      dispatch(saveList({ type: "materialTypes", list: updated, currentUser: userName }));
      setSelectedMaterialTypes([]);
    }
  };




  // --- UNIT HANDLERS ---
  const handleAddUnit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingUnit) return;
    const val = newUnit.trim().toUpperCase();
    if (!val) {
      showToast("Please enter a unit symbol.", "warning");
      return;
    }
    if (units.includes(val)) {
      showToast("Unit symbol already exists.", "warning");
      return;
    }
    const updated = [...units, val];
    setIsSubmittingUnit(true);
    try {
      await dispatch(
        saveList({ type: "units", list: updated, currentUser: activeUser.name }),
      ).unwrap();
      setNewUnit("");
      showToast(`Unit "${val}" added successfully!`, "success");
      setAddModal({ isOpen: false, type: null });
    } catch (err) {
      console.error(err);
      showToast("Failed to save unit.", "error");
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  const handleQuickAddUnit = (val) => {
    if (units.includes(val)) return;
    const updated = [...units, val];
    dispatch(
      saveList({ type: "units", list: updated, currentUser: activeUser.name }),
    );
  };

  const handleDeleteUnit = (unitToDelete) => {
    if (window.confirm(`Delete unit ${unitToDelete}?`)) {
      const updated = units.filter((u) => u !== unitToDelete);
      dispatch(
        saveList({
          type: "units",
          list: updated,
          currentUser: activeUser.name,
        }),
      );
      if (editingUnit === unitToDelete) setEditingUnit(null);
    }
  };

  const handleStartEditUnit = (u) => {
    setEditingUnit(u);
    setEditUnitValue(u);
  };

  const handleSaveEditUnit = (oldUnit) => {
    const val = editUnitValue.trim().toUpperCase();
    if (!val) return;
    if (val !== oldUnit && units.includes(val)) {
      alert("Unit already exists.");
      return;
    }
    const updated = units.map((u) => (u === oldUnit ? val : u));
    dispatch(
      saveList({ type: "units", list: updated, currentUser: activeUser.name }),
    );
    setEditingUnit(null);
  };

  const handleCancelEditUnit = () => {
    setEditingUnit(null);
    setEditUnitValue("");
  };

  // --- LOCATION HANDLERS ---
  const handleAddLocation = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingLocation) return;
    const val = newLocation.trim();
    if (!val) {
      showToast("Please enter a location code.", "warning");
      return;
    }
    if (!newLocationFirm) {
      showToast("Please select a Firm / Division for this location.", "warning");
      return;
    }
    if (locations.some((l) => l.location.toLowerCase() === val.toLowerCase() && (l.division || "") === (newLocationFirm || ""))) {
      showToast("Location code already exists for this firm.", "warning");
      return;
    }
    const updated = [...locations, { location: val, division: newLocationFirm }];
    setIsSubmittingLocation(true);
    try {
      await dispatch(
        saveList({
          type: "locations",
          list: updated,
          currentUser: activeUser.name,
        }),
      ).unwrap();
      setNewLocation("");
      setNewLocationFirm("");
      showToast(`Location "${val}" added successfully!`, "success");
      setAddModal({ isOpen: false, type: null });
    } catch (err) {
      console.error(err);
      showToast("Failed to save location.", "error");
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  const handleQuickAddLocation = (val) => {
    if (!newLocationFirm) return;
    if (locations.some((l) => l.location === val)) return;
    const updated = [...locations, { location: val, division: newLocationFirm }];
    dispatch(
      saveList({
        type: "locations",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
  };

  const handleDeleteLocation = (locToDelete) => {
    if (window.confirm(`Delete location "${locToDelete}"?`)) {
      const updated = locations.filter((l) => l.location !== locToDelete);
      dispatch(
        saveList({
          type: "locations",
          list: updated,
          currentUser: activeUser.name,
        }),
      );
      setEditingLocationIdx(null);
    }
  };

  const handleStartEditLocation = (locObj, actualIdx) => {
    setEditingLocationIdx(actualIdx);
    setEditLocationValue(locObj.location);
    setEditLocationFirm(locObj.division || "");
  };

  const handleSaveEditLocation = (actualIdx) => {
    const val = editLocationValue.trim();
    if (!val) return;
    if (!editLocationFirm) {
      alert("Please select a Firm for this location.");
      return;
    }
    if (
      locations.some(
        (l, idx) => idx !== actualIdx && l.location.toLowerCase() === val.toLowerCase(),
      )
    ) {
      alert("Location already exists.");
      return;
    }
    const updated = locations.map((l, idx) =>
      idx === actualIdx ? { location: val, division: editLocationFirm } : l,
    );
    dispatch(
      saveList({
        type: "locations",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setEditingLocationIdx(null);
  };

  const handleCancelEditLocation = () => {
    setEditingLocationIdx(null);
    setEditLocationValue("");
    setEditLocationFirm("");
  };

  // --- RAW MATERIAL HANDLERS ---
  const handleAddMaterialName = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingMaterial) return;
    const val = newMaterialName.trim();
    const skuVal = newMaterialSku.trim();
    const hsnVal = newMaterialHsn.trim();
    if (!val) {
      showToast("Please enter raw material name.", "warning");
      return;
    }
    const divVal = newMaterialFirm ? newMaterialFirm.trim() : null;

    // Check uniqueness across ALL 3 columns: SKU + Material Name + Firm/Division
    const isDuplicate = materialNames.some((m) => {
      const mSku = (typeof m === "object" ? (m.sku || "") : "").trim().toLowerCase();
      const mName = (typeof m === "string" ? m : (m.name || "")).trim().toLowerCase();
      const mDiv = ((typeof m === "object" ? m.division : null) || null);
      return mSku === skuVal.toLowerCase() && mName === val.toLowerCase() && mDiv === divVal;
    });

    if (isDuplicate) {
      showToast("Material with this SKU, Name and Firm already exists.", "warning");
      return;
    }

    const newItem = { sku: skuVal, name: val, division: divVal, hsn: hsnVal };
    const updated = [...materialNames, newItem];
    setIsSubmittingMaterial(true);
    try {
      await dispatch(
        saveList({
          type: "materialNames",
          list: updated,
          currentUser: activeUser.name,
        }),
      ).unwrap();
      setNewMaterialSku("");
      setNewMaterialName("");
      setNewMaterialHsn("");
      setNewMaterialFirm("");
      showToast(`Raw material "${val}" added successfully!`, "success");
      setAddModal({ isOpen: false, type: null });
    } catch (err) {
      console.error(err);
      showToast("Failed to save raw material.", "error");
    } finally {
      setIsSubmittingMaterial(false);
    }
  };

  const handleQuickAddMaterialName = (val) => {
    if (materialNames.some((m) => (typeof m === "string" ? m : m.name) === val)) return;
    const updated = [...materialNames, { sku: "", name: val, division: null, hsn: "" }];
    dispatch(
      saveList({
        type: "materialNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
  };

  const handleDeleteMaterialName = (nameToDelete) => {
    if (window.confirm(`Delete material name "${nameToDelete}"?`)) {
      const updated = materialNames.filter((n) => (typeof n === "string" ? n : n.name) !== nameToDelete);
      dispatch(
        saveList({
          type: "materialNames",
          list: updated,
          currentUser: activeUser.name,
        }),
      );
      if (editingMaterial !== null) setEditingMaterial(null);
    }
  };

  const handleStartEditMaterial = (mObj, actualIdx) => {
    const mName = typeof mObj === "string" ? mObj : mObj.name;
    const mSku = typeof mObj === "string" ? "" : (mObj.sku || "");
    const mDiv = typeof mObj === "string" ? "" : (mObj.division || "");
    const mHsn = typeof mObj === "string" ? "" : (mObj.hsn || mObj.hsn_code || "");
    setEditingMaterial(actualIdx);
    setEditMaterialSku(mSku);
    setEditMaterialValue(mName);
    setEditMaterialHsn(mHsn);
    setEditMaterialFirm(mDiv);
  };

  const handleSaveEditMaterial = (actualIdx) => {
    const val = editMaterialValue.trim();
    const skuVal = editMaterialSku.trim();
    const hsnVal = editMaterialHsn.trim();
    if (!val) return;
    const divVal = editMaterialFirm ? editMaterialFirm.trim() : null;

    // Check uniqueness across ALL 3 columns for edit
    if (
      materialNames.some(
        (m, idx) =>
          idx !== actualIdx &&
          (typeof m === "object" ? (m.sku || "") : "").trim().toLowerCase() === skuVal.toLowerCase() &&
          (typeof m === "string" ? m : (m.name || "")).trim().toLowerCase() === val.toLowerCase() &&
          ((typeof m === "object" ? m.division : null) || null) === divVal,
      )
    ) {
      alert("Material with this SKU, Name and Firm already exists.");
      return;
    }

    const updated = materialNames.map((m, idx) =>
      idx === actualIdx ? { ...(typeof m === "object" ? m : {}), sku: skuVal, name: val, division: divVal, hsn: hsnVal } : m,
    );
    dispatch(
      saveList({
        type: "materialNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setEditingMaterial(null);
    setEditMaterialSku("");
    setEditMaterialValue("");
    setEditMaterialHsn("");
    setEditMaterialFirm("");
  };

  const handleCancelEditMaterial = () => {
    setEditingMaterial(null);
    setEditMaterialSku("");
    setEditMaterialValue("");
    setEditMaterialHsn("");
    setEditMaterialFirm("");
  };

  // --- CATEGORY HANDLERS ---
  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingCategory) return;
    const matTypeVal = (newCategoryMaterialType || "").trim().toUpperCase();
    const val = newCategory.trim();
    if (!matTypeVal) {
      showToast("Please enter material type.", "warning");
      return;
    }
    if (!val) {
      showToast("Please enter category name.", "warning");
      return;
    }
    const divisionVal = newCategoryFirm ? newCategoryFirm : null;
    if (
      categories.some(
        (c) =>
          (typeof c === "string" ? c : c.name).toLowerCase() === val.toLowerCase() &&
          ((typeof c === "object" ? c.division : null) || null) === divisionVal &&
          ((typeof c === "object" ? (c.material_type || c.materialType || "") : "").toUpperCase() === matTypeVal),
      )
    ) {
      showToast("Category with this Material Type already exists for this Firm.", "warning");
      return;
    }
    const updated = [...categories, { name: val, division: divisionVal, material_type: matTypeVal, materialType: matTypeVal }];
    const userName = activeUser?.name || activeUser?.user_name || "Admin";
    setIsSubmittingCategory(true);
    try {
      await dispatch(
        saveList({
          type: "categories",
          list: updated,
          currentUser: userName,
        }),
      ).unwrap();
      setNewCategory("");
      setNewCategoryMaterialType("");
      setNewCategoryFirm("");
      showToast(`Category "${val}" (${matTypeVal}) added successfully!`, "success");
      setAddModal({ isOpen: false, type: null });
    } catch (err) {
      console.error(err);
      showToast("Failed to save category.", "error");
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = (catToDelete) => {
    if (window.confirm(`Delete category "${catToDelete}"?`)) {
      const updated = categories.filter((c) => (typeof c === "string" ? c : c.name) !== catToDelete);
      dispatch(
        saveList({
          type: "categories",
          list: updated,
          currentUser: activeUser.name,
        }),
      );
      setEditingCategoryIdx(null);
    }
  };

  const handleStartEditCategory = (catObj, actualIdx) => {
    setEditingCategoryIdx(actualIdx);
    setEditCategoryValue(typeof catObj === "string" ? catObj : catObj.name);
    setEditCategoryMaterialType(typeof catObj === "string" ? "FG" : (catObj.material_type || catObj.materialType || ""));
    setEditCategoryFirm(typeof catObj === "string" ? "" : (catObj.division || ""));
  };

  const handleSaveEditCategory = (actualIdx) => {
    const val = editCategoryValue.trim();
    const matTypeVal = (editCategoryMaterialType || "").trim().toUpperCase();
    if (!matTypeVal) {
      alert("Please enter a Material Type.");
      return;
    }
    if (!val) return;
    const divisionVal = editCategoryFirm ? editCategoryFirm : null;
    if (
      categories.some(
        (c, idx) =>
          idx !== actualIdx &&
          (typeof c === "string" ? c : c.name).toLowerCase() === val.toLowerCase() &&
          ((typeof c === "object" ? c.division : null) || null) === divisionVal &&
          ((typeof c === "object" ? (c.material_type || c.materialType || "") : "").toUpperCase() === matTypeVal),
      )
    ) {
      alert("Category with this Material Type already exists for this Firm.");
      return;
    }
    const updated = categories.map((c, idx) =>
      idx === actualIdx ? { ...(typeof c === "object" ? c : {}), name: val, division: divisionVal, material_type: matTypeVal, materialType: matTypeVal } : c,
    );
    dispatch(
      saveList({
        type: "categories",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setEditingCategoryIdx(null);
    setEditCategoryValue("");
    setEditCategoryMaterialType("");
    setEditCategoryFirm("");
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryIdx(null);
    setEditCategoryValue("");
    setEditCategoryMaterialType("");
    setEditCategoryFirm("");
  };

  // --- FINISHED GOODS HANDLERS ---
  const handleAddFinishedGoodsName = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingFinishedGoods) return;
    const val = newFinishedGoodsName.trim();
    const skuVal = newFinishedGoodsSku.trim();
    const hsnVal = newFinishedGoodsHsn.trim();
    if (!val) {
      showToast("Please enter finished good name.", "warning");
      return;
    }
    const catVal = newFinishedGoodsCategory.trim() || "Finished Goods";
    const divVal = newFinishedGoodsFirm ? newFinishedGoodsFirm.trim() : null;
    
    // Check uniqueness across ALL 3 columns: SKU + FG Name + Firm/Division
    const isDuplicate = finishedGoodsNames.some((fg) => {
      const fgSku = (typeof fg === "object" ? (fg.sku || "") : "").trim().toLowerCase();
      const fgName = (typeof fg === "string" ? fg : (fg.name || "")).trim().toLowerCase();
      const fgDiv = ((typeof fg === "object" ? fg.division : null) || null);
      return fgSku === skuVal.toLowerCase() && fgName === val.toLowerCase() && fgDiv === divVal;
    });

    if (isDuplicate) {
      showToast("Finished Good with this SKU, Name and Firm already exists.", "warning");
      return;
    }

    const newItem = { sku: skuVal, name: val, category: catVal, division: divVal, hsn: hsnVal };
    const updated = [...finishedGoodsNames, newItem];
    setIsSubmittingFinishedGoods(true);
    try {
      await dispatch(
        saveList({
          type: "finishedGoodsNames",
          list: updated,
          currentUser: activeUser.name,
        }),
      ).unwrap();
      setNewFinishedGoodsSku("");
      setNewFinishedGoodsName("");
      setNewFinishedGoodsCategory("");
      setNewFinishedGoodsHsn("");
      setNewFinishedGoodsFirm("");
      showToast(`Finished good "${val}" added successfully!`, "success");
      setAddModal({ isOpen: false, type: null });
    } catch (err) {
      console.error(err);
      showToast("Failed to save finished good.", "error");
    } finally {
      setIsSubmittingFinishedGoods(false);
    }
  };

  const handleQuickAddFinishedGoodsName = (val) => {
    if (finishedGoodsNames.some(fg => (typeof fg === 'string' ? fg : fg.name) === val)) return;
    const updated = [...finishedGoodsNames, { sku: "", name: val, category: "Finished Goods", division: null, hsn: "" }];
    dispatch(
      saveList({
        type: "finishedGoodsNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
  };

  const handleDeleteFinishedGoodsName = (nameToDelete) => {
    if (window.confirm(`Delete finished goods name "${nameToDelete}"?`)) {
      const updated = finishedGoodsNames.filter((n) => (typeof n === 'string' ? n : n.name) !== nameToDelete);
      dispatch(
        saveList({
          type: "finishedGoodsNames",
          list: updated,
          currentUser: activeUser.name,
        }),
      );
      if (editingFinishedGoods !== null) setEditingFinishedGoods(null);
    }
  };

  const handleStartEditFinishedGoods = (fgObj, actualIdx) => {
    const fgName = typeof fgObj === 'string' ? fgObj : fgObj.name;
    const fgSku = typeof fgObj === 'string' ? '' : (fgObj.sku || '');
    const fgCat = typeof fgObj === 'string' ? 'Finished Goods' : (fgObj.category || 'Finished Goods');
    const fgDiv = typeof fgObj === 'string' ? '' : (fgObj.division || '');
    const fgHsn = typeof fgObj === 'string' ? '' : (fgObj.hsn || fgObj.hsn_code || '');
    setEditingFinishedGoods(actualIdx);
    setEditFinishedGoodsSku(fgSku);
    setEditFinishedGoodsValue(fgName);
    setEditFinishedGoodsCategory(fgCat);
    setEditFinishedGoodsHsn(fgHsn);
    setEditFinishedGoodsFirm(fgDiv);
  };

  const handleSaveEditFinishedGoods = (actualIdx) => {
    const val = editFinishedGoodsValue.trim();
    const skuVal = editFinishedGoodsSku.trim();
    const hsnVal = editFinishedGoodsHsn.trim();
    if (!val) return;
    const catVal = editFinishedGoodsCategory.trim() || "Finished Goods";
    const divVal = editFinishedGoodsFirm ? editFinishedGoodsFirm.trim() : null;

    if (
      finishedGoodsNames.some(
        (fg, idx) =>
          idx !== actualIdx &&
          (typeof fg === "object" ? (fg.sku || "") : "").trim().toLowerCase() === skuVal.toLowerCase() &&
          (typeof fg === "string" ? fg : (fg.name || "")).trim().toLowerCase() === val.toLowerCase() &&
          ((typeof fg === "object" ? fg.division : null) || null) === divVal,
      )
    ) {
      alert("Finished Good with this SKU, Name and Firm already exists.");
      return;
    }

    const updated = finishedGoodsNames.map((fg, idx) => {
      return idx === actualIdx ? { ...(typeof fg === 'object' ? fg : {}), sku: skuVal, name: val, category: catVal, division: divVal, hsn: hsnVal } : fg;
    });
    dispatch(
      saveList({
        type: "finishedGoodsNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setEditingFinishedGoods(null);
    setEditFinishedGoodsSku("");
    setEditFinishedGoodsValue("");
    setEditFinishedGoodsCategory("");
    setEditFinishedGoodsHsn("");
    setEditFinishedGoodsFirm("");
  };

  const handleCancelEditFinishedGoods = () => {
    setEditingFinishedGoods(null);
    setEditFinishedGoodsSku("");
    setEditFinishedGoodsValue("");
    setEditFinishedGoodsCategory("");
    setEditFinishedGoodsHsn("");
    setEditFinishedGoodsFirm("");
  };

  // --- MATERIAL TYPES HANDLERS ---
  const handleAddMaterialType = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingMaterialType) return;
    const codeVal = (newMaterialTypeCode || "").trim().toUpperCase();
    const nameVal = (newMaterialTypeName || "").trim();
    if (!codeVal) {
      showToast("Please enter type code.", "warning");
      return;
    }
    if (!nameVal) {
      showToast("Please enter type name.", "warning");
      return;
    }
    if (materialTypes.some((mt) => (mt.type_code || mt.typeCode || "").toUpperCase() === codeVal)) {
      showToast(`Material Type code "${codeVal}" already exists.`, "warning");
      return;
    }
    const updated = [...materialTypes, { type_code: codeVal, type_name: nameVal, typeCode: codeVal, typeName: nameVal }];
    const userName = activeUser?.name || activeUser?.user_name || "Admin";
    setIsSubmittingMaterialType(true);
    try {
      await dispatch(
        saveList({
          type: "materialTypes",
          list: updated,
          currentUser: userName,
        }),
      ).unwrap();
      setNewMaterialTypeCode("");
      setNewMaterialTypeName("");
      showToast(`Material Type "${codeVal} - ${nameVal}" added successfully!`, "success");
      setAddModal({ isOpen: false, type: null });
    } catch (err) {
      console.error(err);
      showToast("Failed to save material type.", "error");
    } finally {
      setIsSubmittingMaterialType(false);
    }
  };

  const handleDeleteMaterialType = (codeToDelete) => {
    if (window.confirm(`Delete material type "${codeToDelete}"?`)) {
      const updated = materialTypes.filter((mt) => (mt.type_code || mt.typeCode || "").toUpperCase() !== codeToDelete.toUpperCase());
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      dispatch(
        saveList({
          type: "materialTypes",
          list: updated,
          currentUser: userName,
        }),
      );
      if (editingMaterialTypeIdx !== null) setEditingMaterialTypeIdx(null);
    }
  };

  const handleStartEditMaterialType = (mtObj, actualIdx) => {
    setEditingMaterialTypeIdx(actualIdx);
    setEditMaterialTypeCode(mtObj.type_code || mtObj.typeCode || "");
    setEditMaterialTypeName(mtObj.type_name || mtObj.typeName || "");
  };

  const handleSaveEditMaterialType = (actualIdx) => {
    const codeVal = (editMaterialTypeCode || "").trim().toUpperCase();
    const nameVal = (editMaterialTypeName || "").trim();
    if (!codeVal || !nameVal) {
      showToast("Please enter both Type Code and Type Name.", "warning");
      return;
    }
    if (
      materialTypes.some(
        (mt, idx) =>
          idx !== actualIdx &&
          (mt.type_code || mt.typeCode || "").toUpperCase() === codeVal,
      )
    ) {
      showToast(`Material Type code "${codeVal}" already exists.`, "warning");
      return;
    }
    const updated = materialTypes.map((mt, idx) =>
      idx === actualIdx
        ? {
            ...mt,
            type_code: codeVal,
            type_name: nameVal,
            typeCode: codeVal,
            typeName: nameVal,
          }
        : mt,
    );
    const userName = activeUser?.name || activeUser?.user_name || "Admin";
    dispatch(
      saveList({
        type: "materialTypes",
        list: updated,
        currentUser: userName,
      }),
    );
    setEditingMaterialTypeIdx(null);
    setEditMaterialTypeCode("");
    setEditMaterialTypeName("");
  };

  const handleCancelEditMaterialType = () => {
    setEditingMaterialTypeIdx(null);
    setEditMaterialTypeCode("");
    setEditMaterialTypeName("");
  };

  const handleDownloadSampleMaterialTypesCSV = () => {
    const sample = "Type Code,Type Name\nFG,Finished Goods\nRM,Raw Material\nSPARE,Spare Parts\nWIP,Work In Progress\nCONSUMABLE,Consumables\n";
    downloadSampleCSV("sample_material_types.csv", sample);
  };

  const handleExportMaterialTypesCSV = () => {
    if (!materialTypes || materialTypes.length === 0) {
      showToast("No material types to export.", "warning");
      return;
    }
    const exportData = materialTypes.map((mt, idx) => ({
      "S.No": idx + 1,
      "Type Code": mt.type_code || mt.typeCode || "",
      "Type Name": mt.type_name || mt.typeName || "",
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `material_types_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully exported ${materialTypes.length} material type(s).`, "success");
  };

  const handleImportMaterialTypesCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            showToast("CSV file is empty.", "error");
            e.target.value = "";
            return;
          }
          const imported = [];
          results.data.forEach((row, idx) => {
            if (idx === 0 && (String(row[0] || "").toLowerCase().includes("type") || String(row[0] || "").toLowerCase().includes("code"))) {
              return;
            }
            let codeVal = "";
            let nameVal = "";
            if (Array.isArray(row)) {
              if (row.length >= 2) {
                codeVal = String(row[0] || "").trim().toUpperCase();
                nameVal = String(row[1] || "").trim();
              } else {
                codeVal = String(row[0] || "").trim().toUpperCase();
                nameVal = codeVal;
              }
            }
            if (codeVal && nameVal) {
              const exists = materialTypes.some((mt) => (mt.type_code || mt.typeCode || "").toUpperCase() === codeVal) ||
                imported.some((mt) => (mt.type_code || mt.typeCode || "").toUpperCase() === codeVal);
              if (!exists) {
                imported.push({ type_code: codeVal, type_name: nameVal, typeCode: codeVal, typeName: nameVal });
              }
            }
          });
          if (imported.length === 0) {
            showToast("No new material types found in CSV.", "info");
            e.target.value = "";
            return;
          }
          const updated = [...materialTypes, ...imported];
          const userName = activeUser?.name || activeUser?.user_name || "Admin";
          dispatch(saveList({ type: "materialTypes", list: updated, currentUser: userName }));
          showToast(`Successfully imported ${imported.length} new material type(s).`, "success");
        } catch (err) {
          console.error(err);
          showToast("Failed to parse CSV file.", "error");
        } finally {
          e.target.value = "";
        }
      },
    });
  };

  // --- CSV IMPORT & SAMPLE DOWNLOAD HANDLERS ---
  const downloadSampleCSV = (filename, content) => {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Units CSV Handlers
  const handleDownloadSampleUnitsCSV = () => {
    const sample = "Unit Symbol\nBAG\nDRUM\nKG\nLTR\nMTR\nNOS\nPKT\nROLL\nSET\n";
    downloadSampleCSV("sample_units.csv", sample);
  };

  const handleExportUnitsCSV = () => {
    if (!units || units.length === 0) {
      showToast("No unit entries to export.", "warning");
      return;
    }
    const exportData = units.map((u, idx) => ({
      "S.No": idx + 1,
      "Unit Symbol": u,
      "Classification": "Unit of Measurement",
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `units_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully exported ${units.length} unit(s).`, "success");
  };

  const handleImportUnitsCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            showToast("CSV file is empty.", "error");
            e.target.value = "";
            return;
          }
          const imported = [];
          results.data.forEach((row) => {
            const raw = Array.isArray(row) ? row[0] : row;
            const val = String(raw || "").trim().toUpperCase();
            if (val && val !== "UNIT SYMBOL" && val !== "UNIT" && val !== "S.NO") {
              if (!units.includes(val) && !imported.includes(val)) {
                imported.push(val);
              }
            }
          });
          if (imported.length === 0) {
            showToast("No new units found in CSV.", "info");
            e.target.value = "";
            return;
          }
          const updated = [...units, ...imported];
          const userName = activeUser?.name || activeUser?.user_name || "Admin";
          dispatch(saveList({ type: "units", list: updated, currentUser: userName }));
          showToast(`Successfully imported ${imported.length} new unit(s).`, "success");
        } catch (err) {
          console.error(err);
          showToast("Failed to parse CSV file.", "error");
        } finally {
          e.target.value = "";
        }
      },
    });
  };

  // Locations CSV Handlers
  const handleDownloadSampleLocationsCSV = () => {
    const sample = "Firm / Division,Location Code\nNutech,WH-A / Rack 1\nNutech,WH-B / Bin 3\n,Main Warehouse\n";
    downloadSampleCSV("sample_locations.csv", sample);
  };

  const handleExportLocationsCSV = () => {
    if (!locations || locations.length === 0) {
      showToast("No location entries to export.", "warning");
      return;
    }
    const exportData = locations.map((l, idx) => ({
      "S.No": idx + 1,
      "Firm / Division": l.division || "Universal",
      "Location Code": l.location,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `locations_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully exported ${locations.length} location(s).`, "success");
  };

  const handleImportLocationsCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            showToast("CSV file is empty.", "error");
            e.target.value = "";
            return;
          }
          const imported = [];
          results.data.forEach((row, idx) => {
            if (idx === 0 && (String(row[0] || "").toLowerCase().includes("firm") || String(row[0] || "").toLowerCase().includes("location"))) {
              return;
            }
            let divVal = "";
            let locVal = "";
            if (Array.isArray(row)) {
              if (row.length >= 2) {
                divVal = String(row[0] || "").trim();
                locVal = String(row[1] || "").trim();
              } else {
                locVal = String(row[0] || "").trim();
              }
            }
            if (locVal) {
              const exists = locations.some((l) => l.location.toLowerCase() === locVal.toLowerCase()) ||
                imported.some((l) => l.location.toLowerCase() === locVal.toLowerCase());
              if (!exists) {
                imported.push({ location: locVal, division: divVal || null });
              }
            }
          });
          if (imported.length === 0) {
            showToast("No new locations found in CSV.", "info");
            e.target.value = "";
            return;
          }
          const updated = [...locations, ...imported];
          const userName = activeUser?.name || activeUser?.user_name || "Admin";
          dispatch(saveList({ type: "locations", list: updated, currentUser: userName }));
          showToast(`Successfully imported ${imported.length} new location(s).`, "success");
        } catch (err) {
          console.error(err);
          showToast("Failed to parse CSV file.", "error");
        } finally {
          e.target.value = "";
        }
      },
    });
  };

  // 1. Raw Materials CSV Handlers
  // Columns: SKU Code, Material Name, Firm, HSN Code
  // Purpose: Catalog of raw materials used in inventory_master_material table (material_type = 'RM')
  const handleDownloadSampleRawMaterialsCSV = () => {
    const sample = "SKU Code,Material Name,Firm,HSN Code\nRM-1001,Steel Rod 12mm,Nutech,7214\nRM-1002,Copper Wire 2.5mm,Nutech,7408\nRM-1003,Plastic Granules PP,,3902\n";
    downloadSampleCSV("sample_raw_materials.csv", sample);
  };

  const handleExportRawMaterialsCSV = () => {
    if (!materialNames || materialNames.length === 0) {
      showToast("No raw material entries to export.", "warning");
      return;
    }
    const exportData = materialNames.map((m, idx) => ({
      "S.No": idx + 1,
      "SKU Code": typeof m === "string" ? "" : (m.sku || ""),
      "Raw Material Name": typeof m === "string" ? m : (m.name || ""),
      "Firm / Division": typeof m === "string" ? "Universal" : (m.division && m.division !== "ALL" && m.division.toLowerCase() !== "universal" ? m.division : "Universal"),
      "HSN Code": typeof m === "string" ? "" : (m.hsn || m.hsn_code || ""),
      "Classification": "Raw Material",
      "Status": typeof m === "string" ? "Active" : (m.status || "Active"),
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `raw_materials_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully exported ${materialNames.length} raw material entry/entries.`, "success");
  };

  const handleImportRawMaterialsCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputEvent = e;
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            showToast("CSV file is empty or has no valid rows.", "error");
            e.target.value = "";
            return;
          }

          const validRows = [];
          const skippedRows = [];

          results.data.forEach((rowParts, idx) => {
            const lineNum = idx + 1;
            const parts = Array.isArray(rowParts)
              ? rowParts.map((p) => String(p || "").trim().replace(/^["']|["']$/g, ""))
              : [];
            
            let skuVal = "";
            let nameVal = "";
            let divVal = "";
            let hsnVal = "";
            if (parts.length >= 4) {
              skuVal = parts[0];
              nameVal = parts[1];
              divVal = parts[2] || "";
              hsnVal = parts[3] || "";
            } else if (parts.length === 3) {
              skuVal = parts[0];
              nameVal = parts[1];
              divVal = parts[2] || "";
            } else if (parts.length === 2) {
              skuVal = parts[0];
              nameVal = parts[1];
            } else if (parts.length === 1) {
              nameVal = parts[0];
            }

            // Skip header row
            if (
              idx === 0 &&
              (nameVal.toLowerCase().includes("name") ||
                nameVal.toLowerCase().includes("material") ||
                skuVal.toLowerCase().includes("sku") ||
                skuVal.toLowerCase() === "sku code")
            ) {
              return;
            }

            // Ignore completely blank lines
            if (!skuVal && !nameVal) return;

            if (!nameVal) {
              skippedRows.push({
                lineNum,
                sku: skuVal || "—",
                name: "—",
                division: divVal || "—",
                hsn: hsnVal || "—",
                category: "Raw Material",
                reason: "Missing Material Name",
              });
              return;
            }

            const normalizedDivision = divVal && divVal.trim() && divVal.toLowerCase() !== "universal" && divVal.toLowerCase() !== "none" && divVal.toLowerCase() !== "all" ? divVal.trim() : "ALL";

            // Check if (sku + name + division) already exists in DB/Redux
            const dbMatch = materialNames.find((m) => {
              const mObj = typeof m === "string" ? { name: m, sku: "", division: "ALL" } : m;
              const skuMatch = (mObj.sku || "").trim().toLowerCase() === skuVal.trim().toLowerCase();
              const nameMatch = mObj.name.trim().toLowerCase() === nameVal.trim().toLowerCase();
              const divMatch = (mObj.division || "ALL") === normalizedDivision;
              return skuMatch && nameMatch && divMatch;
            });

            if (dbMatch) {
              skippedRows.push({
                lineNum,
                sku: skuVal || "—",
                name: nameVal,
                division: normalizedDivision || "ALL",
                hsn: hsnVal || "—",
                category: "Raw Material",
                reason: "Material with this SKU, Name and Firm already exists",
              });
              return;
            }

            // Check if duplicate in current batch
            const batchMatch = validRows.find((r) => {
              const skuMatch = (r.item.sku || "").trim().toLowerCase() === skuVal.trim().toLowerCase();
              const nameMatch = r.item.name.trim().toLowerCase() === nameVal.trim().toLowerCase();
              const divMatch = (r.item.division || "ALL") === normalizedDivision;
              return skuMatch && nameMatch && divMatch;
            });

            if (batchMatch) {
              skippedRows.push({
                lineNum,
                sku: skuVal || "—",
                name: nameVal,
                division: normalizedDivision || "ALL",
                hsn: hsnVal || "—",
                category: "Raw Material",
                reason: "Duplicate Material (SKU, Name, Firm) within CSV file",
              });
              return;
            }

            // Otherwise valid!
            validRows.push({
              lineNum,
              sku: skuVal || "—",
              name: nameVal,
              division: normalizedDivision || "ALL",
              hsn: hsnVal || "—",
              category: "Raw Material",
              status: "Ready to Add",
              item: { sku: skuVal, name: nameVal, division: normalizedDivision, hsn: hsnVal },
            });
          });

          if (validRows.length === 0 && skippedRows.length === 0) {
            showToast("No readable rows found in the CSV.", "error");
            e.target.value = "";
            return;
          }

          setCsvPreviewModal({
            isOpen: true,
            type: "raw_materials",
            title: "Raw Materials CSV Import Preview",
            fileName: file.name,
            validRows,
            skippedRows,
            activeTab: validRows.length > 0 ? "valid" : "skipped",
            searchQuery: "",
            isSubmitting: false,
            inputEvent,
          });
        } catch (err) {
          console.error("CSV parse error:", err);
          showToast("Failed to parse CSV file.", "error");
          e.target.value = "";
        }
      },
      error: () => {
        showToast("Could not read the file. Make sure it is a valid CSV.", "error");
        e.target.value = "";
      },
    });
  };

  // 2. Category CSV Handlers
  // Columns: Category Name, Firm Division
  // Purpose: FG categories only (material_type = FG / ALL). Do NOT add "Raw Material" — it is auto-managed.
  const handleDownloadSampleCategoriesCSV = () => {
    const div1 = divisions[0]?.name || divisions[0] || "Division 1";
    const div2 = divisions[1]?.name || divisions[1] || "Division 2";
    // Sample intentionally excludes "Raw Material" — categories are for Finished Goods only
    const sample = `Category Name,Firm Division\nDoor frames,${div1}\nPanels,${div2}\nLouvers,\nPackaging Material,\n`;
    downloadSampleCSV("sample_categories.csv", sample);
  };

  const handleExportCategoriesCSV = () => {
    if (!categories || categories.length === 0) {
      showToast("No category entries to export.", "warning");
      return;
    }
    const exportData = categories.map((c, idx) => ({
      "S.No": idx + 1,
      "Category Name": typeof c === "string" ? c : (c.name || ""),
      "Firm / Division": typeof c === "string" ? "" : (c.division || ""),
      "Classification": "Category",
      "Status": typeof c === "string" ? "Active" : (c.status || "Active"),
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `categories_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully exported ${categories.length} category entry/entries.`, "success");
  };

  const handleImportCategoriesCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputEvent = e;
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            showToast("CSV file is empty or has no valid rows.", "error");
            e.target.value = "";
            return;
          }

          const validRows = [];
          const skippedRows = [];

          results.data.forEach((rowParts, idx) => {
            const lineNum = idx + 1;
            const parts = Array.isArray(rowParts)
              ? rowParts.map((p) => String(p || "").trim().replace(/^["']|["']$/g, ""))
              : [];
            
            const name = parts[0] || "";
            const division = parts[1] || "";

            // Skip header row
            if (
              idx === 0 &&
              (name.toLowerCase().includes("category") ||
                name.toLowerCase() === "name" ||
                name.toLowerCase() === "category name")
            ) {
              return;
            }

            // Ignore blank lines
            if (!name && !division) return;

            if (!name) {
              skippedRows.push({
                lineNum,
                sku: "—",
                name: "—",
                division: division || "—",
                reason: "Missing Category Name",
              });
              return;
            }

            // Skip "Raw Material" — auto-managed category
            if (name.toLowerCase() === "raw material" || name.toLowerCase() === "raw materials") {
              skippedRows.push({
                lineNum,
                sku: "—",
                name,
                division: division || "—",
                reason: "Raw Material category is auto-managed",
              });
              return;
            }

            const normalizedDivision = division && division.trim() ? division.trim() : null;

            // Check if category name + division already exists in database
            const dbMatch = categories.some((c) => {
              const cName = (typeof c === "string" ? c : c.name).toLowerCase();
              const cDiv = typeof c === "object" ? (c.division && c.division.trim() ? c.division.trim() : null) : null;
              return cName === name.toLowerCase() && cDiv === normalizedDivision;
            });

            if (dbMatch) {
              skippedRows.push({
                lineNum,
                sku: "—",
                name,
                division: normalizedDivision || "None",
                reason: "Category already exists in database",
              });
              return;
            }

            // Check if duplicate in current CSV batch
            const batchMatch = validRows.some((r) => {
              return (
                r.item.name.toLowerCase() === name.toLowerCase() &&
                r.item.division === normalizedDivision
              );
            });

            if (batchMatch) {
              skippedRows.push({
                lineNum,
                sku: "—",
                name,
                division: normalizedDivision || "None",
                reason: "Duplicate Category within CSV file",
              });
              return;
            }

            // Otherwise valid!
            validRows.push({
              lineNum,
              sku: "—",
              name,
              division: normalizedDivision || "None",
              status: "Ready to Add",
              item: { name, division: normalizedDivision, material_type: "FG" },
            });
          });

          if (validRows.length === 0 && skippedRows.length === 0) {
            showToast("No readable rows found in the CSV.", "error");
            e.target.value = "";
            return;
          }

          setCsvPreviewModal({
            isOpen: true,
            type: "categories",
            title: "Categories CSV Import Preview",
            fileName: file.name,
            validRows,
            skippedRows,
            activeTab: validRows.length > 0 ? "valid" : "skipped",
            searchQuery: "",
            isSubmitting: false,
            inputEvent,
          });
        } catch (err) {
          console.error("CSV parse error:", err);
          showToast("Failed to parse CSV file.", "error");
          e.target.value = "";
        }
      },
      error: () => {
        showToast("Could not read the file. Make sure it is a valid CSV.", "error");
        e.target.value = "";
      },
    });
  };

  // 3. Finished Goods CSV Handlers
  // Columns: SKU Code, Finished Goods Name, Category (FG Category), Firm, HSN Code
  // Purpose: Catalog of finished goods items linked to a FG category (from inventory_categories)
  const handleDownloadSampleFinishedGoodsCSV = () => {
    // Use FG-only categories from the categories list (excluding "Raw Material")
    const fgCats = categories
      .map((c) => typeof c === "string" ? c : c.name)
      .filter((n) => n && n.toLowerCase() !== "raw material" && n.toLowerCase() !== "raw materials");
    const cat1 = fgCats[0] || "Door frames";
    const cat2 = fgCats[1] || "Panels";
    const sample = `SKU Code,Finished Goods Name,Category,Firm,HSN Code\nFG-1001,Gear Assembly GP1,${cat1},Nutech,8483\nFG-1002,Finished Cable 5m,${cat1},Nutech,8544\nFG-1003,Control Box C1,${cat2},,8537\n`;
    downloadSampleCSV("sample_finished_goods.csv", sample);
  };

  const handleExportFinishedGoodsCSV = () => {
    if (!finishedGoodsNames || finishedGoodsNames.length === 0) {
      showToast("No finished goods entries to export.", "warning");
      return;
    }
    const exportData = finishedGoodsNames.map((fg, idx) => ({
      "S.No": idx + 1,
      "SKU Code": typeof fg === "string" ? "" : (fg.sku || ""),
      "Finished Goods Name": typeof fg === "string" ? fg : (fg.name || ""),
      "Category": typeof fg === "string" ? "Finished Goods" : (fg.category || "Finished Goods"),
      "Firm / Division": typeof fg === "string" ? "Universal" : (fg.division && fg.division !== "ALL" && fg.division.toLowerCase() !== "universal" ? fg.division : "Universal"),
      "HSN Code": typeof fg === "string" ? "" : (fg.hsn || fg.hsn_code || ""),
      "Status": typeof fg === "string" ? "Active" : (fg.status || "Active"),
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `finished_goods_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully exported ${finishedGoodsNames.length} finished goods entry/entries.`, "success");
  };

  const handleImportFinishedGoodsCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputEvent = e;
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            showToast("CSV file is empty or has no valid rows.", "error");
            e.target.value = "";
            return;
          }

          const validRows = [];
          const skippedRows = [];

          results.data.forEach((rowParts, idx) => {
            const lineNum = idx + 1;
            const parts = Array.isArray(rowParts)
              ? rowParts.map((p) => String(p || "").trim().replace(/^["']|["']$/g, ""))
              : [];

            let skuVal = "";
            let nameVal = "";
            let catVal = "Finished Goods";
            let divVal = "";
            let hsnVal = "";

            if (parts.length >= 5) {
              skuVal = parts[0];
              nameVal = parts[1];
              catVal = parts[2] || "Finished Goods";
              divVal = parts[3] || "";
              hsnVal = parts[4] || "";
            } else if (parts.length === 4) {
              skuVal = parts[0];
              nameVal = parts[1];
              catVal = parts[2] || "Finished Goods";
              divVal = parts[3] || "";
            } else if (parts.length === 3) {
              skuVal = parts[0];
              nameVal = parts[1];
              catVal = parts[2] || "Finished Goods";
            } else if (parts.length === 2) {
              nameVal = parts[0];
              catVal = parts[1] || "Finished Goods";
            } else if (parts.length === 1) {
              nameVal = parts[0];
            }

            // Skip header row
            if (
              idx === 0 &&
              (nameVal.toLowerCase().includes("finished") ||
                nameVal.toLowerCase().includes("name") ||
                nameVal.toLowerCase().includes("goods") ||
                skuVal.toLowerCase().includes("sku") ||
                skuVal.toLowerCase() === "sku code")
            ) {
              return;
            }

            // Ignore blank lines
            if (!skuVal && !nameVal) return;

            if (!nameVal) {
              skippedRows.push({
                lineNum,
                sku: skuVal || "—",
                name: "—",
                division: divVal || "ALL",
                category: catVal || "Finished Goods",
                hsn: hsnVal || "—",
                reason: "Missing Finished Goods Name",
              });
              return;
            }

            // Sanitize category: if "Raw Material", override to "Finished Goods"
            if (catVal.toLowerCase() === "raw material" || catVal.toLowerCase() === "raw materials") {
              catVal = "Finished Goods";
            }

            const normalizedDivision = divVal && divVal.trim() && divVal.toLowerCase() !== "universal" && divVal.toLowerCase() !== "none" && divVal.toLowerCase() !== "all" ? divVal.trim() : "ALL";

            // Check if (sku + name + division) already exists
            const dbMatch = finishedGoodsNames.find((fg) => {
              const fgObj = typeof fg === "string" ? { name: fg, sku: "", division: "ALL" } : fg;
              const skuMatch = (fgObj.sku || "").trim().toLowerCase() === skuVal.trim().toLowerCase();
              const nameMatch = fgObj.name.trim().toLowerCase() === nameVal.trim().toLowerCase();
              const divMatch = (fgObj.division || "ALL") === normalizedDivision;
              return skuMatch && nameMatch && divMatch;
            });

            if (dbMatch) {
              skippedRows.push({
                lineNum,
                sku: skuVal || "—",
                name: nameVal,
                division: normalizedDivision || "ALL",
                category: catVal,
                hsn: hsnVal || "—",
                reason: "Finished Good with this SKU, Name and Firm already exists",
              });
              return;
            }

            const batchMatch = validRows.find((r) => {
              const skuMatch = (r.item.sku || "").trim().toLowerCase() === skuVal.trim().toLowerCase();
              const nameMatch = r.item.name.trim().toLowerCase() === nameVal.trim().toLowerCase();
              const divMatch = (r.item.division || "ALL") === normalizedDivision;
              return skuMatch && nameMatch && divMatch;
            });

            if (batchMatch) {
              skippedRows.push({
                lineNum,
                sku: skuVal || "—",
                name: nameVal,
                division: normalizedDivision || "ALL",
                category: catVal,
                hsn: hsnVal || "—",
                reason: "Duplicate Finished Good (SKU, Name, Firm) within CSV file",
              });
              return;
            }

            // Otherwise valid!
            validRows.push({
              lineNum,
              sku: skuVal || "—",
              name: nameVal,
              category: catVal,
              division: normalizedDivision || "ALL",
              hsn: hsnVal || "—",
              status: "Ready to Add",
              item: { sku: skuVal, name: nameVal, category: catVal, division: normalizedDivision, hsn: hsnVal },
            });
          });

          if (validRows.length === 0 && skippedRows.length === 0) {
            showToast("No readable rows found in the CSV.", "error");
            e.target.value = "";
            return;
          }

          setCsvPreviewModal({
            isOpen: true,
            type: "finished_goods",
            title: "Finished Goods CSV Import Preview",
            fileName: file.name,
            validRows,
            skippedRows,
            activeTab: validRows.length > 0 ? "valid" : "skipped",
            searchQuery: "",
            isSubmitting: false,
            inputEvent,
          });
        } catch (err) {
          console.error("CSV parse error:", err);
          showToast("Failed to parse CSV file.", "error");
          e.target.value = "";
        }
      },
      error: () => {
        showToast("Could not read the file. Make sure it is a valid CSV.", "error");
        e.target.value = "";
      },
    });
  };

  // Handler to Confirm & Add Valid Rows to Database
  const handleConfirmCSVImport = async () => {
    if (!csvPreviewModal.validRows || csvPreviewModal.validRows.length === 0) {
      showToast("No valid rows to import.", "error");
      return;
    }
    setCsvPreviewModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const userName = activeUser?.name || activeUser?.user_name || "Admin";
      const type = csvPreviewModal.type;

      if (type === "raw_materials") {
        const newItems = csvPreviewModal.validRows.map((r) => r.item);
        const updated = [...materialNames, ...newItems];
        await dispatch(
          saveList({
            type: "materialNames",
            list: updated,
            currentUser: userName,
          })
        ).unwrap();
        showToast(
          `Successfully imported ${newItems.length} Raw Material item(s).`,
          "success"
        );
      } else if (type === "categories") {
        const newCategories = csvPreviewModal.validRows.map((r) => r.item);
        const updated = [...categories, ...newCategories];
        await dispatch(
          saveList({
            type: "categories",
            list: updated,
            currentUser: userName,
          })
        ).unwrap();
        showToast(
          `Successfully imported ${newCategories.length} Category item(s).`,
          "success"
        );
      } else if (type === "finished_goods") {
        const newItems = csvPreviewModal.validRows.map((r) => r.item);
        const updated = [...finishedGoodsNames, ...newItems];
        await dispatch(
          saveList({
            type: "finishedGoodsNames",
            list: updated,
            currentUser: userName,
          })
        ).unwrap();
        showToast(
          `Successfully imported ${newItems.length} Finished Goods item(s).`,
          "success"
        );
      } else if (type === "material_types") {
        const newItems = csvPreviewModal.validRows.map((r) => r.item);
        const updated = [...materialTypes, ...newItems];
        await dispatch(
          saveList({
            type: "materialTypes",
            list: updated,
            currentUser: userName,
          })
        ).unwrap();
        showToast(
          `Successfully imported ${newItems.length} Material Type(s).`,
          "success"
        );
      }

      if (csvPreviewModal.inputEvent?.target) {
        csvPreviewModal.inputEvent.target.value = "";
      }
      setCsvPreviewModal({
        isOpen: false,
        type: "",
        title: "",
        fileName: "",
        validRows: [],
        skippedRows: [],
        activeTab: "valid",
        searchQuery: "",
        isSubmitting: false,
        inputEvent: null,
      });
    } catch (err) {
      console.error("CSV import confirm error:", err);
      dispatch(clearError());
      const reason =
        typeof err === "string"
          ? err
          : err?.message || "Failed to save imported items.";
      showToast(`Import failed — ${reason}`, "error", 8000);
      setCsvPreviewModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Handler to Export Skipped / Unsupported Rows as CSV
  const handleExportSkippedCSV = () => {
    if (!csvPreviewModal.skippedRows || csvPreviewModal.skippedRows.length === 0)
      return;

    let exportData = [];
    if (csvPreviewModal.type === "raw_materials") {
      exportData = csvPreviewModal.skippedRows.map((r) => ({
        "Line Number": r.lineNum,
        "SKU Code": r.sku || "",
        "Material Name": r.name || "",
        "Reason Not Inserted": r.reason,
      }));
    } else if (csvPreviewModal.type === "categories") {
      exportData = csvPreviewModal.skippedRows.map((r) => ({
        "Line Number": r.lineNum,
        "Category Name": r.name || "",
        "Firm Division": r.division || "",
        "Reason Not Inserted": r.reason,
      }));
    } else if (csvPreviewModal.type === "finished_goods") {
      exportData = csvPreviewModal.skippedRows.map((r) => ({
        "Line Number": r.lineNum,
        "SKU Code": r.sku || "",
        "Finished Goods Name": r.name || "",
        "Category": r.category || "",
        "Reason Not Inserted": r.reason,
      }));
    } else if (csvPreviewModal.type === "material_types") {
      exportData = csvPreviewModal.skippedRows.map((r) => ({
        "Line Number": r.lineNum,
        "Type Code": r.type_code || "",
        "Type Name": r.type_name || "",
        "Reason Not Inserted": r.reason,
      }));
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filePrefix = csvPreviewModal.type || "import";
    link.setAttribute("download", `${filePrefix}_skipped.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Filtered & Sorted lists for tabular display
  const filteredUnits = units
    .map((u, index) => ({ name: u, actualIndex: index }))
    .filter((u) =>
      u.name.toLowerCase().includes(searchUnitQuery.toLowerCase().trim()),
    )
    .sort((a, b) => {
      if (sortUnits === "a-z") return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortUnits === "z-a") return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortUnits === "newest" || sortUnits === "num-desc") return b.actualIndex - a.actualIndex;
      if (sortUnits === "oldest") return a.actualIndex - b.actualIndex;
      return a.actualIndex - b.actualIndex;
    })
    .map((u) => u.name);

  const filteredLocations = locations
    .map((l, index) => ({
      location: typeof l === "string" ? l : l.location,
      division: typeof l === "string" ? null : l.division,
      actualIndex: index,
    }))
    .filter((l) => {
      const matchesSearch = l.location
        .toLowerCase()
        .includes(searchLocationQuery.toLowerCase().trim());
      const matchesDiv = searchLocationDivision
        ? (l.division || "").toLowerCase() === searchLocationDivision.toLowerCase()
        : true;
      return matchesSearch && matchesDiv;
    })
    .sort((a, b) => {
      if (sortLocations === "a-z") return a.location.localeCompare(b.location, undefined, { numeric: true, sensitivity: "base" });
      if (sortLocations === "z-a") return b.location.localeCompare(a.location, undefined, { numeric: true, sensitivity: "base" });
      if (sortLocations === "newest" || sortLocations === "num-desc") return b.actualIndex - a.actualIndex;
      if (sortLocations === "oldest") return a.actualIndex - b.actualIndex;
      return a.actualIndex - b.actualIndex;
    });

  const uniqueMaterialNamesList = useMemo(() => {
    const names = materialNames
      .map((m) => (typeof m === "string" ? m : m.name))
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [materialNames]);

  const filteredMaterialNames = materialNames
    .map((m, index) => ({
      sku: typeof m === "string" ? "" : (m.sku || ""),
      name: typeof m === "string" ? m : m.name,
      division: typeof m === "string" ? null : (m.division || null),
      hsn: typeof m === "string" ? "" : (m.hsn || m.hsn_code || ""),
      raw: m,
      actualIndex: index,
    }))
    .filter((m) => {
      const q = searchMaterialQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.hsn.toLowerCase().includes(q);
      const matchesDropdown = searchMaterialDropdown
        ? m.name.toLowerCase() === searchMaterialDropdown.toLowerCase()
        : true;
      const matchesDiv = searchMaterialDivision
        ? (m.division || "").toLowerCase() === searchMaterialDivision.toLowerCase()
        : true;
      return matchesSearch && matchesDropdown && matchesDiv;
    })
    .sort((a, b) => {
      if (sortMaterialNames === "name-asc") return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialNames === "name-desc") return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialNames === "sku-asc") return (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialNames === "sku-desc") return (b.sku || "").localeCompare(a.sku || "", undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialNames === "newest" || sortMaterialNames === "num-desc") return b.actualIndex - a.actualIndex;
      if (sortMaterialNames === "oldest") return a.actualIndex - b.actualIndex;
      return a.actualIndex - b.actualIndex;
    });

  const filteredCategories = categories
    .map((c, index) => ({
      name: typeof c === "string" ? c : c.name,
      division: typeof c === "string" ? null : c.division,
      material_type: typeof c === "string" ? "FG" : (c.material_type || c.materialType || "FG"),
      materialType: typeof c === "string" ? "FG" : (c.material_type || c.materialType || "FG"),
      actualIndex: index,
    }))
    .filter((c) => {
      const matchesSearch = c.name
        .toLowerCase()
        .includes(searchCategoryQuery.toLowerCase().trim());
      const matchesDiv = searchCategoryDivision
        ? (c.division || "").toLowerCase() === searchCategoryDivision.toLowerCase()
        : true;
      const matchesMatType = searchCategoryMaterialType
        ? (c.material_type || "").toUpperCase() === searchCategoryMaterialType.toUpperCase()
        : true;
      return matchesSearch && matchesDiv && matchesMatType;
    })
    .sort((a, b) => {
      if (sortCategories === "a-z") return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortCategories === "z-a") return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortCategories === "newest" || sortCategories === "num-desc") return b.actualIndex - a.actualIndex;
      if (sortCategories === "oldest") return a.actualIndex - b.actualIndex;
      return a.actualIndex - b.actualIndex;
    });


  const distinctCategoryMaterialTypes = useMemo(() => {
    const types = new Set(["FG", "RM"]);
    (materialTypes || []).forEach((mt) => {
      const code = (mt.type_code || mt.typeCode || "").trim().toUpperCase();
      if (code) types.add(code);
    });
    (categories || []).forEach((c) => {
      const t = typeof c === "string" ? "FG" : (c.material_type || c.materialType || "FG");
      if (t && t.trim()) types.add(t.trim().toUpperCase());
    });
    return Array.from(types).sort();
  }, [materialTypes, categories]);

  const filteredMaterialTypes = materialTypes
    .map((mt, index) => ({
      id: mt.id,
      type_code: mt.type_code || mt.typeCode || "",
      type_name: mt.type_name || mt.typeName || "",
      raw: mt,
      actualIndex: index,
    }))
    .filter((mt) => {
      const q = searchMaterialTypeQuery.toLowerCase().trim();
      return (
        !q ||
        mt.type_code.toLowerCase().includes(q) ||
        mt.type_name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortMaterialTypes === "code-asc") return a.type_code.localeCompare(b.type_code, undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialTypes === "code-desc") return b.type_code.localeCompare(a.type_code, undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialTypes === "name-asc") return a.type_name.localeCompare(b.type_name, undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialTypes === "name-desc") return b.type_name.localeCompare(a.type_name, undefined, { numeric: true, sensitivity: "base" });
      if (sortMaterialTypes === "newest" || sortMaterialTypes === "num-desc") return b.actualIndex - a.actualIndex;
      if (sortMaterialTypes === "oldest") return a.actualIndex - b.actualIndex;
      return a.actualIndex - b.actualIndex;
    });

  const uniqueFinishedGoodsNamesList = useMemo(() => {
    let list = finishedGoodsNames;
    if (searchFinishedGoodsCategory) {
      list = list.filter((fg) => {
        const cat = typeof fg === "string" ? "Finished Goods" : (fg.category || "Finished Goods");
        return cat.toLowerCase() === searchFinishedGoodsCategory.toLowerCase();
      });
    }
    const names = list
      .map((fg) => (typeof fg === "string" ? fg : fg.name))
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [finishedGoodsNames, searchFinishedGoodsCategory]);

  const filteredFinishedGoodsNames = finishedGoodsNames
    .map((fg, index) => ({
      sku: typeof fg === "string" ? "" : (fg.sku || ""),
      name: typeof fg === "string" ? fg : fg.name,
      category: typeof fg === "string" ? "Finished Goods" : (fg.category || "Finished Goods"),
      division: typeof fg === "string" ? null : (fg.division || null),
      hsn: typeof fg === "string" ? "" : (fg.hsn || fg.hsn_code || ""),
      raw: fg,
      actualIndex: index,
    }))
    .filter((fg) => {
      const q = searchFinishedGoodsQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        fg.name.toLowerCase().includes(q) ||
        fg.sku.toLowerCase().includes(q) ||
        fg.hsn.toLowerCase().includes(q);
      const matchesCategory = searchFinishedGoodsCategory
        ? fg.category.toLowerCase() === searchFinishedGoodsCategory.toLowerCase()
        : true;
      const matchesDropdown = searchFinishedGoodsDropdown
        ? fg.name.toLowerCase() === searchFinishedGoodsDropdown.toLowerCase()
        : true;
      const matchesDiv = searchFinishedGoodsDivision
        ? (fg.division || "").toLowerCase() === searchFinishedGoodsDivision.toLowerCase()
        : true;
      return matchesSearch && matchesCategory && matchesDropdown && matchesDiv;
    })
    .sort((a, b) => {
      if (sortFinishedGoodsNames === "name-asc") return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortFinishedGoodsNames === "name-desc") return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortFinishedGoodsNames === "sku-asc") return (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true, sensitivity: "base" });
      if (sortFinishedGoodsNames === "sku-desc") return (b.sku || "").localeCompare(a.sku || "", undefined, { numeric: true, sensitivity: "base" });
      if (sortFinishedGoodsNames === "newest" || sortFinishedGoodsNames === "num-desc") return b.actualIndex - a.actualIndex;
      if (sortFinishedGoodsNames === "oldest") return a.actualIndex - b.actualIndex;
      return a.actualIndex - b.actualIndex;
    });

  const subTabs = [
    {
      id: "units",
      label: "Units of Measurement",
      shortLabel: "UoM",
      icon: Scale,
      count: units.length,
      color: "emerald",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50",
      activeClass: "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20",
    },
    {
      id: "locations",
      label: "Warehouse Locations",
      shortLabel: "Locations",
      icon: MapPin,
      count: locations.length,
      color: "amber",
      badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/50",
      activeClass: "border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20",
    },
    {
      id: "materialTypes",
      label: "Material Types",
      shortLabel: "Material Types",
      icon: Tag,
      count: materialTypes.length,
      color: "rose",
      badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/50",
      activeClass: "border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20",
    },
    {
      id: "categories",
      label: "Category",
      shortLabel: "Category",
      icon: FolderTree,
      count: categories.length,
      color: "cyan",
      badgeClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200/50",
      activeClass: "border-cyan-600 text-cyan-600 dark:text-cyan-400 bg-cyan-50/40 dark:bg-cyan-950/20",
    },
    {
      id: "materialNames",
      label: "Raw Material Names",
      shortLabel: "Raw Materials",
      icon: Boxes,
      count: materialNames.length,
      color: "indigo",
      badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200/50",
      activeClass: "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20",
    },
    {
      id: "finishedGoodsNames",
      label: "Finished Goods Names",
      shortLabel: "Finished Goods",
      icon: Factory,
      count: finishedGoodsNames.length,
      color: "violet",
      badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200/50",
      activeClass: "border-violet-600 text-violet-600 dark:text-violet-400 bg-violet-50/40 dark:bg-violet-950/20",
    },
  ];


  return (
    <div className="space-y-6">
      {/* Settings blocks - locked for non-admins */}
      {!isAdminOrSuper ? (
        <div className="bg-gray-50 dark:bg-slate-955/40 border border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-8 text-center text-gray-400">
          <Lock size={28} className="mx-auto mb-2 opacity-50 text-indigo-500" />
          <span>
            Inventory Master configurations are restricted to Admin / Superadmin.
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sub-Tabs Header Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? tab.activeClass + " shadow-xs font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${tab.badgeClass}`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SUB-TAB 1: UNITS OF MEASUREMENT */}
          {activeSubTab === "units" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header & Actions */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                      <Scale size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Manage Units of Measurement (UoM)
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Configure measurement symbols used across inventory items
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openAddModal("units")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Add Unit</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleUnitsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/60 dark:border-slate-700"
                      title="Download Sample CSV"
                    >
                      <Download size={14} />
                      <span>Sample CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportUnitsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Export All Units to CSV"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                    <label className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportUnitsCSV}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1 max-w-xl">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search unit by symbol..."
                        value={searchUnitQuery}
                        onChange={(e) => setSearchUnitQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-emerald-500 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="relative">
                      <ArrowUpDown
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"
                      />
                      <select
                        value={sortUnits}
                        onChange={(e) => setSortUnits(e.target.value)}
                        className="pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-emerald-500 cursor-pointer shadow-2xs"
                      >
                        <option value="default">Sort: Numbering (# 1 to N)</option>
                        <option value="num-desc">Sort: Numbering (# N to 1)</option>
                        <option value="newest">Sort: Newest to Oldest</option>
                        <option value="oldest">Sort: Oldest to Newest</option>
                        <option value="a-z">Sort: A to Z (Unit)</option>
                        <option value="z-a">Sort: Z to A (Unit)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {selectedUnits.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteUnits}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                        <span>Delete Selected ({selectedUnits.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      Showing {filteredUnits.length} of {units.length}
                    </span>
                  </div>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredUnits.length > 0 &&
                              filteredUnits.every((u) => selectedUnits.includes(u))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUnits(
                                  Array.from(new Set([...selectedUnits, ...filteredUnits])),
                                );
                              } else {
                                setSelectedUnits(
                                  selectedUnits.filter((u) => !filteredUnits.includes(u)),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </th>
                        <th
                          className="px-6 py-3.5 w-16 cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          onClick={() => setSortUnits((prev) => (prev === "default" ? "num-desc" : "default"))}
                          title="Click to sort numbering"
                        >
                          <div className="flex items-center gap-1">
                            <span>#</span>
                            {sortUnits === "default" ? (
                              <ArrowUp size={11} className="text-emerald-600 dark:text-emerald-400" />
                            ) : sortUnits === "num-desc" ? (
                              <ArrowDown size={11} className="text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          onClick={() => setSortUnits((prev) => (prev === "a-z" ? "z-a" : "a-z"))}
                          title="Click to sort by Unit Name (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Unit Symbol / Name</span>
                            {sortUnits === "a-z" ? (
                              <ArrowUp size={11} className="text-emerald-600 dark:text-emerald-400" />
                            ) : sortUnits === "z-a" ? (
                              <ArrowDown size={11} className="text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredUnits.length > 0 ? (
                        filteredUnits.map((u, idx) => {
                          const isEditing = editingUnit === u;
                          const isChecked = selectedUnits.includes(u);
                          return (
                            <tr
                              key={u}
                              className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                                isChecked ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                              }`}
                            >
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedUnits((prev) =>
                                      prev.includes(u)
                                        ? prev.filter((item) => item !== u)
                                        : [...prev, u],
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editUnitValue}
                                    onChange={(e) => setEditUnitValue(e.target.value)}
                                    className="px-3 py-1.5 border border-emerald-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 border border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-400">
                                    <Scale size={13} />
                                    {u}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-semibold text-gray-600 dark:text-slate-300">
                                Standard Measurement
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                  <CheckCircle2 size={10} /> ACTIVE
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditUnit(u)}
                                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all cursor-pointer"
                                      title="Save Unit"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditUnit}
                                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditUnit(u)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Unit"
                                    >
                                      <Edit size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUnit(u)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Delete Unit"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 font-bold"
                          >
                            No units found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="block sm:hidden divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
                  {filteredUnits.length > 0 ? (
                    filteredUnits.map((u, idx) => {
                      const isEditing = editingUnit === u;
                      const isChecked = selectedUnits.includes(u);
                      return (
                        <div
                          key={u}
                          className={`p-4 space-y-3 ${
                            isChecked
                              ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedUnits((prev) =>
                                    prev.includes(u)
                                      ? prev.filter((item) => item !== u)
                                      : [...prev, u],
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                                #{idx + 1}
                              </span>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                              <CheckCircle2 size={10} /> ACTIVE
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editUnitValue}
                                onChange={(e) => setEditUnitValue(e.target.value)}
                                className="flex-1 px-3 py-1.5 border border-emerald-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 border border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-400">
                                  <Scale size={13} />
                                  {u}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium pl-1">
                                  Standard Measurement
                                </span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditUnit(u)}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all cursor-pointer"
                                    title="Save Unit"
                                  >
                                    <Check size={16} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditUnit}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditUnit(u)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Unit"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUnit(u)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Delete Unit"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold">
                      No units found matching your search.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* SUB-TAB 2: WAREHOUSE STORAGE LOCATIONS */}
          {activeSubTab === "locations" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header & Actions */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-amber-100/60 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Manage Warehouse Storage Locations
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Define physical storage racks, bins, or warehouse locations scoped by Firm/Division
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openAddModal("locations")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Add Location</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleLocationsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/60 dark:border-slate-700"
                      title="Download Sample CSV"
                    >
                      <Download size={14} />
                      <span>Sample CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportLocationsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Export All Locations to CSV"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                    <label className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportLocationsCSV}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:max-w-2xl">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search location code..."
                        value={searchLocationQuery}
                        onChange={(e) => setSearchLocationQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-amber-500 text-gray-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={searchLocationDivision}
                      onChange={(e) => setSearchLocationDivision(e.target.value)}
                      className="w-full sm:w-48 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-amber-500"
                    >
                      <option value="">All Divisions / Firms</option>
                      {divisions.map((d) => (
                        <option key={d.id ?? d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <ArrowUpDown
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"
                      />
                      <select
                        value={sortLocations}
                        onChange={(e) => setSortLocations(e.target.value)}
                        className="pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-amber-500 cursor-pointer shadow-2xs"
                      >
                        <option value="default">Sort: Numbering (# 1 to N)</option>
                        <option value="num-desc">Sort: Numbering (# N to 1)</option>
                        <option value="newest">Sort: Newest to Oldest</option>
                        <option value="oldest">Sort: Oldest to Newest</option>
                        <option value="a-z">Sort: A to Z (Location)</option>
                        <option value="z-a">Sort: Z to A (Location)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {selectedLocations.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteLocations}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                        <span>Delete Selected ({selectedLocations.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      Showing {filteredLocations.length} of {locations.length}
                    </span>
                  </div>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredLocations.length > 0 &&
                              filteredLocations.every((l) => selectedLocations.includes(l.location))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLocations(
                                  Array.from(
                                    new Set([
                                      ...selectedLocations,
                                      ...filteredLocations.map((l) => l.location),
                                    ]),
                                  ),
                                );
                              } else {
                                const visibleLocs = filteredLocations.map((l) => l.location);
                                setSelectedLocations(
                                  selectedLocations.filter((loc) => !visibleLocs.includes(loc)),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </th>
                        <th
                          className="px-6 py-3.5 w-16 cursor-pointer select-none hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          onClick={() => setSortLocations((prev) => (prev === "default" ? "num-desc" : "default"))}
                          title="Click to sort numbering"
                        >
                          <div className="flex items-center gap-1">
                            <span>#</span>
                            {sortLocations === "default" ? (
                              <ArrowUp size={11} className="text-amber-600 dark:text-amber-400" />
                            ) : sortLocations === "num-desc" ? (
                              <ArrowDown size={11} className="text-amber-600 dark:text-amber-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          onClick={() => setSortLocations((prev) => (prev === "a-z" ? "z-a" : "a-z"))}
                          title="Click to sort by Location Code (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Warehouse Location Code</span>
                            {sortLocations === "a-z" ? (
                              <ArrowUp size={11} className="text-amber-600 dark:text-amber-400" />
                            ) : sortLocations === "z-a" ? (
                              <ArrowDown size={11} className="text-amber-600 dark:text-amber-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5">Division / Firm</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map((l, idx) => {
                          const isEditing = editingLocationIdx === l.actualIndex;
                          const isChecked = selectedLocations.includes(l.location);
                          return (
                            <tr
                              key={l.location + idx}
                              className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                                isChecked ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                              }`}
                            >
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedLocations((prev) =>
                                      prev.includes(l.location)
                                        ? prev.filter((item) => item !== l.location)
                                        : [...prev, l.location],
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editLocationValue}
                                    onChange={(e) => setEditLocationValue(e.target.value)}
                                    className="px-3 py-1.5 border border-amber-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-50 border border-amber-200/60 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-400">
                                    <MapPin size={13} />
                                    {l.location}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <select
                                    value={editLocationFirm}
                                    onChange={(e) => setEditLocationFirm(e.target.value)}
                                    className="px-3 py-1.5 border border-amber-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none"
                                  >
                                    <option value="">Select firm...</option>
                                    {divisions.map((d) => (
                                      <option key={d.id ?? d.name} value={d.name}>
                                        {d.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/40">
                                    {l.division || "General"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                  <CheckCircle2 size={10} /> ACTIVE
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditLocation(l.actualIndex)}
                                      className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-all cursor-pointer"
                                      title="Save Location"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditLocation}
                                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditLocation(l, l.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Location"
                                    >
                                      <Edit size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLocation(l.location, l.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Delete Location"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 font-bold"
                          >
                            No storage locations found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="block sm:hidden divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map((l, idx) => {
                      const isEditing = editingLocationIdx === l.actualIndex;
                      const isChecked = selectedLocations.includes(l.location);
                      return (
                        <div
                          key={l.location + idx}
                          className={`p-4 space-y-3 ${
                            isChecked
                              ? "bg-amber-50/40 dark:bg-amber-950/20"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedLocations((prev) =>
                                    prev.includes(l.location)
                                      ? prev.filter((item) => item !== l.location)
                                      : [...prev, l.location],
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                                #{idx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/40">
                                  {l.division || "General"}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                <CheckCircle2 size={10} /> ACTIVE
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editLocationValue}
                                  onChange={(e) => setEditLocationValue(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-amber-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white"
                                  autoFocus
                                />
                                <select
                                  value={editLocationFirm}
                                  onChange={(e) => setEditLocationFirm(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-amber-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-semibold text-gray-900 dark:text-white"
                                >
                                  <option value="">Select firm...</option>
                                  {divisions.map((d) => (
                                    <option key={d.id ?? d.name} value={d.name}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-50 border border-amber-200/60 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-400">
                                  <MapPin size={14} />
                                  {l.location}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-1 pt-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditLocation(l.actualIndex)}
                                    className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-all cursor-pointer"
                                    title="Save Location"
                                  >
                                    <Check size={16} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditLocation}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditLocation(l, l.actualIndex)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Location"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLocation(l.location)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Delete Location"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold">
                      No storage locations found matching your search.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* SUB-TAB: MATERIAL TYPES */}
          {activeSubTab === "materialTypes" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header & Actions */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-rose-100/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
                      <Tag size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Manage Material Types
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Configure item classification types (e.g. FG, RM, SPARE, WIP, CONSUMABLE)
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openAddModal("materialTypes")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Add Material Type</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleMaterialTypesCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/60 dark:border-slate-700"
                      title="Download Sample CSV"
                    >
                      <Download size={14} />
                      <span>Sample CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportMaterialTypesCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Export All Material Types to CSV"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                    <label className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportMaterialTypesCSV}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1 max-w-xl">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search by code or type name..."
                        value={searchMaterialTypeQuery}
                        onChange={(e) => setSearchMaterialTypeQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-rose-500 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="relative">
                      <ArrowUpDown
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"
                      />
                      <select
                        value={sortMaterialTypes}
                        onChange={(e) => setSortMaterialTypes(e.target.value)}
                        className="pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-rose-500 cursor-pointer shadow-2xs"
                      >
                        <option value="default">Sort: Numbering (# 1 to N)</option>
                        <option value="num-desc">Sort: Numbering (# N to 1)</option>
                        <option value="code-asc">Sort: Type Code (A to Z)</option>
                        <option value="code-desc">Sort: Type Code (Z to A)</option>
                        <option value="name-asc">Sort: Type Name (A to Z)</option>
                        <option value="name-desc">Sort: Type Name (Z to A)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {selectedMaterialTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteMaterialTypes}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                        <span>Delete Selected ({selectedMaterialTypes.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      Showing {filteredMaterialTypes.length} of {materialTypes.length}
                    </span>
                  </div>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredMaterialTypes.length > 0 &&
                              filteredMaterialTypes.every((mt) => selectedMaterialTypes.includes(mt.type_code))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterialTypes(
                                  Array.from(
                                    new Set([
                                      ...selectedMaterialTypes,
                                      ...filteredMaterialTypes.map((mt) => mt.type_code),
                                    ]),
                                  ),
                                );
                              } else {
                                const visibleCodes = filteredMaterialTypes.map((mt) => mt.type_code);
                                setSelectedMaterialTypes(
                                  selectedMaterialTypes.filter((code) => !visibleCodes.includes(code)),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                        </th>
                        <th
                          className="px-6 py-3.5 w-16 cursor-pointer select-none hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          onClick={() => setSortMaterialTypes((prev) => (prev === "default" ? "num-desc" : "default"))}
                          title="Click to sort numbering"
                        >
                          <div className="flex items-center gap-1">
                            <span>#</span>
                            {sortMaterialTypes === "default" ? (
                              <ArrowUp size={11} className="text-rose-600 dark:text-rose-400" />
                            ) : sortMaterialTypes === "num-desc" ? (
                              <ArrowDown size={11} className="text-rose-600 dark:text-rose-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          onClick={() => setSortMaterialTypes((prev) => (prev === "code-asc" ? "code-desc" : "code-asc"))}
                          title="Click to sort by Type Code"
                        >
                          <div className="flex items-center gap-1">
                            <span>Type Code</span>
                            {sortMaterialTypes === "code-asc" ? (
                              <ArrowUp size={11} className="text-rose-600 dark:text-rose-400" />
                            ) : sortMaterialTypes === "code-desc" ? (
                              <ArrowDown size={11} className="text-rose-600 dark:text-rose-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          onClick={() => setSortMaterialTypes((prev) => (prev === "name-asc" ? "name-desc" : "name-asc"))}
                          title="Click to sort by Type Name"
                        >
                          <div className="flex items-center gap-1">
                            <span>Type Name</span>
                            {sortMaterialTypes === "name-asc" ? (
                              <ArrowUp size={11} className="text-rose-600 dark:text-rose-400" />
                            ) : sortMaterialTypes === "name-desc" ? (
                              <ArrowDown size={11} className="text-rose-600 dark:text-rose-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredMaterialTypes.length > 0 ? (
                        filteredMaterialTypes.map((mt, idx) => {
                          const isEditing = editingMaterialTypeIdx === mt.actualIndex;
                          const isChecked = selectedMaterialTypes.includes(mt.type_code);
                          return (
                            <tr
                              key={mt.type_code + idx}
                              className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                                isChecked ? "bg-rose-50/30 dark:bg-rose-950/10" : ""
                              }`}
                            >
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedMaterialTypes((prev) =>
                                      prev.includes(mt.type_code)
                                        ? prev.filter((item) => item !== mt.type_code)
                                        : [...prev, mt.type_code],
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMaterialTypeCode}
                                    onChange={(e) => setEditMaterialTypeCode(e.target.value)}
                                    className="px-3 py-1.5 border border-rose-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white uppercase focus:outline-none w-28"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 border border-rose-200/60 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800/40 dark:text-rose-400">
                                    <Tag size={12} />
                                    {mt.type_code}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMaterialTypeName}
                                    onChange={(e) => setEditMaterialTypeName(e.target.value)}
                                    className="px-3 py-1.5 border border-rose-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-medium text-gray-900 dark:text-white focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-semibold text-gray-900 dark:text-white text-xs">
                                    {mt.type_name}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                  <CheckCircle2 size={10} /> ACTIVE
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditMaterialType(mt.actualIndex)}
                                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                                      title="Save Material Type"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditMaterialType}
                                      className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-all cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditMaterialType(mt, mt.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Material Type"
                                    >
                                      <Edit size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMaterialType(mt.type_code)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Delete Material Type"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold"
                          >
                            No material types found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="block sm:hidden divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
                  {filteredMaterialTypes.length > 0 ? (
                    filteredMaterialTypes.map((mt, idx) => {
                      const isEditing = editingMaterialTypeIdx === mt.actualIndex;
                      const isChecked = selectedMaterialTypes.includes(mt.type_code);
                      return (
                        <div
                          key={mt.type_code + idx}
                          className={`p-4 space-y-3 ${
                            isChecked
                              ? "bg-rose-50/40 dark:bg-rose-950/20"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedMaterialTypes((prev) =>
                                    prev.includes(mt.type_code)
                                      ? prev.filter((item) => item !== mt.type_code)
                                      : [...prev, mt.type_code],
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                                #{idx + 1}
                              </span>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                              <CheckCircle2 size={10} /> ACTIVE
                            </span>
                          </div>

                          <div className="space-y-2">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editMaterialTypeCode}
                                  onChange={(e) => setEditMaterialTypeCode(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-rose-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white uppercase"
                                  placeholder="Type Code"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  value={editMaterialTypeName}
                                  onChange={(e) => setEditMaterialTypeName(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-rose-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-medium text-gray-900 dark:text-white"
                                  placeholder="Type Name"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 border border-rose-200/60 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800/40 dark:text-rose-400">
                                  <Tag size={13} />
                                  {mt.type_code}
                                </span>
                                <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                                  {mt.type_name}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-1 pt-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditMaterialType(mt.actualIndex)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                                    title="Save Material Type"
                                  >
                                    <Check size={16} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditMaterialType}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditMaterialType(mt, mt.actualIndex)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Material Type"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMaterialType(mt.type_code)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Delete Material Type"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold">
                      No material types found matching your search.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* SUB-TAB 3: RAW MATERIAL NAMES */}
          {activeSubTab === "materialNames" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header & Actions */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-100/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
                      <Boxes size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Manage Raw Materials
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Define standardized raw material titles for inventory cataloging
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openAddModal("materialNames")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Add Raw Material</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleRawMaterialsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/60 dark:border-slate-700"
                      title="Download Sample CSV"
                    >
                      <Download size={14} />
                      <span>Sample CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportRawMaterialsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Export All Raw Materials to CSV"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                    <label className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportRawMaterialsCSV}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search material name, SKU or HSN..."
                        value={searchMaterialQuery}
                        onChange={(e) => setSearchMaterialQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-indigo-500 text-gray-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={searchMaterialDropdown}
                      onChange={(e) => setSearchMaterialDropdown(e.target.value)}
                      className="w-full sm:w-48 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">All Raw Materials ({uniqueMaterialNamesList.length})</option>
                      {uniqueMaterialNamesList.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={searchMaterialDivision}
                      onChange={(e) => setSearchMaterialDivision(e.target.value)}
                      className="w-full sm:w-36 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">All Firms</option>
                      {divisions.map((d) => (
                        <option key={d.id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <ArrowUpDown
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"
                      />
                      <select
                        value={sortMaterialNames}
                        onChange={(e) => setSortMaterialNames(e.target.value)}
                        className="pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="default">Sort: Numbering (# 1 to N)</option>
                        <option value="num-desc">Sort: Numbering (# N to 1)</option>
                        <option value="newest">Sort: Newest to Oldest</option>
                        <option value="oldest">Sort: Oldest to Newest</option>
                        <option value="name-asc">Sort: A to Z (Name)</option>
                        <option value="name-desc">Sort: Z to A (Name)</option>
                        <option value="sku-asc">Sort: SKU (A to Z)</option>
                        <option value="sku-desc">Sort: SKU (Z to A)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {selectedMaterialNames.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteMaterialNames}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                        <span>Delete Selected ({selectedMaterialNames.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      Showing {filteredMaterialNames.length} of {materialNames.length}
                    </span>
                  </div>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredMaterialNames.length > 0 &&
                              filteredMaterialNames.every((item) => selectedMaterialNames.includes(item.name))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterialNames(
                                  Array.from(new Set([...selectedMaterialNames, ...filteredMaterialNames.map((item) => item.name)])),
                                );
                              } else {
                                const visibleNames = filteredMaterialNames.map((item) => item.name);
                                setSelectedMaterialNames(
                                  selectedMaterialNames.filter((n) => !visibleNames.includes(n)),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th
                          className="px-6 py-3.5 w-16 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          onClick={() => setSortMaterialNames((prev) => (prev === "default" ? "num-desc" : "default"))}
                          title="Click to sort numbering"
                        >
                          <div className="flex items-center gap-1">
                            <span>#</span>
                            {sortMaterialNames === "default" ? (
                              <ArrowUp size={11} className="text-indigo-600 dark:text-indigo-400" />
                            ) : sortMaterialNames === "num-desc" ? (
                              <ArrowDown size={11} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          onClick={() => setSortMaterialNames((prev) => (prev === "sku-asc" ? "sku-desc" : "sku-asc"))}
                          title="Click to sort by SKU Code (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>SKU Code</span>
                            {sortMaterialNames === "sku-asc" ? (
                              <ArrowUp size={11} className="text-indigo-600 dark:text-indigo-400" />
                            ) : sortMaterialNames === "sku-desc" ? (
                              <ArrowDown size={11} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          onClick={() => setSortMaterialNames((prev) => (prev === "name-asc" ? "name-desc" : "name-asc"))}
                          title="Click to sort by Raw Material Name (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Raw Material Name</span>
                            {sortMaterialNames === "name-asc" ? (
                              <ArrowUp size={11} className="text-indigo-600 dark:text-indigo-400" />
                            ) : sortMaterialNames === "name-desc" ? (
                              <ArrowDown size={11} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5">Firm / Division</th>
                        <th className="px-6 py-3.5">HSN Code</th>
                        <th className="px-6 py-3.5">Classification</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredMaterialNames.length > 0 ? (
                        filteredMaterialNames.map((item, idx) => {
                          const n = item.name;
                          const sku = item.sku;
                          const hsn = item.hsn;
                          const isEditing = editingMaterial === item.actualIndex;
                          const isChecked = selectedMaterialNames.includes(n);
                          return (
                            <tr
                              key={n + idx}
                              className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                                isChecked ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                              }`}
                            >
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedMaterialNames((prev) =>
                                      prev.includes(n)
                                        ? prev.filter((item) => item !== n)
                                        : [...prev, n],
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMaterialSku}
                                    onChange={(e) => setEditMaterialSku(e.target.value)}
                                    placeholder="SKU Code"
                                    className="w-28 px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-xs font-bold text-gray-700 dark:text-slate-300">
                                    {sku || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMaterialValue}
                                    onChange={(e) => setEditMaterialValue(e.target.value)}
                                    className="px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-indigo-50 border border-indigo-200/60 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/40 dark:text-indigo-400">
                                    <Boxes size={13} />
                                    {n}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <select
                                    value={editMaterialFirm}
                                    onChange={(e) => setEditMaterialFirm(e.target.value)}
                                    className="px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  >
                                    <option value="ALL">Universal</option>
                                    {divisions.map((d) => (
                                      <option key={d.id || d.name} value={d.name}>
                                        {d.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (item.division && item.division !== "ALL" && item.division.toLowerCase() !== "universal") ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200/60 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/40 dark:text-indigo-400">
                                    {item.division}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-slate-500 italic text-[11px]">Universal</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editMaterialHsn}
                                    onChange={(e) => setEditMaterialHsn(e.target.value)}
                                    placeholder="HSN Code"
                                    className="w-24 px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-xs font-semibold text-gray-600 dark:text-slate-400">
                                    {hsn || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/40">
                                  Raw Material
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                  <CheckCircle2 size={10} /> ACTIVE
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditMaterial(item.actualIndex)}
                                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all cursor-pointer"
                                      title="Save Material Name"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditMaterial}
                                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditMaterial(item.raw, item.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Material Name"
                                    >
                                      <Edit3 size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMaterialName(n, item.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Delete Material Name"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="9"
                            className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 font-bold"
                          >
                            No raw materials found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="block sm:hidden divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
                  {filteredMaterialNames.length > 0 ? (
                    filteredMaterialNames.map((item, idx) => {
                      const n = item.name;
                      const sku = item.sku;
                      const hsn = item.hsn;
                      const isEditing = editingMaterial === item.actualIndex;
                      const isChecked = selectedMaterialNames.includes(n);
                      return (
                        <div
                          key={n + idx}
                          className={`p-4 space-y-3 ${
                            isChecked
                              ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedMaterialNames((prev) =>
                                    prev.includes(n)
                                      ? prev.filter((item) => item !== n)
                                      : [...prev, n],
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                                #{idx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {sku && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                                  {sku}
                                </span>
                              )}
                              {hsn && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/50">
                                  HSN: {hsn}
                                </span>
                              )}
                              {item.division && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50">
                                  {item.division}
                                </span>
                              )}
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/40">
                                Raw Material
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                <CheckCircle2 size={10} /> ACTIVE
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editMaterialSku}
                                  onChange={(e) => setEditMaterialSku(e.target.value)}
                                  placeholder="SKU Code"
                                  className="w-full px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={editMaterialValue}
                                  onChange={(e) => setEditMaterialValue(e.target.value)}
                                  placeholder="Raw Material Name"
                                  className="w-full px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  value={editMaterialHsn}
                                  onChange={(e) => setEditMaterialHsn(e.target.value)}
                                  placeholder="HSN Code"
                                  className="w-full px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                />
                                <select
                                  value={editMaterialFirm}
                                  onChange={(e) => setEditMaterialFirm(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                >
                                  <option value="ALL">Firm: Universal</option>
                                  {divisions.map((d) => (
                                    <option key={d.id || d.name} value={d.name}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-50 border border-indigo-200/60 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/40 dark:text-indigo-400">
                                <Boxes size={14} />
                                {n}
                              </span>
                            )}

                            <div className="flex items-center gap-1 shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditMaterial(item.actualIndex)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all cursor-pointer"
                                    title="Save Material Name"
                                  >
                                    <Check size={16} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditMaterial}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditMaterial(item.raw, item.actualIndex)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Material Name"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMaterialName(n, item.actualIndex)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Delete Material Name"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold">
                      No raw materials found matching your search.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* SUB-TAB 4: CATEGORY */}
          {activeSubTab === "categories" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header & Actions */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-2xl shrink-0">
                      <FolderTree size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Manage Category Master
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Define item categories mapped to specific Firms / Divisions
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openAddModal("categories")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Add Category</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCategoriesCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/60 dark:border-slate-700"
                      title="Download Sample CSV"
                    >
                      <Download size={14} />
                      <span>Sample CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCategoriesCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Export All Categories to CSV"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                    <label className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportCategoriesCSV}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search & Filter Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full max-w-2xl">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search category..."
                        value={searchCategoryQuery}
                        onChange={(e) => setSearchCategoryQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-cyan-500 text-gray-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={searchCategoryMaterialType}
                      onChange={(e) => setSearchCategoryMaterialType(e.target.value)}
                      className="w-full sm:w-44 px-3 py-2 bg-gray-50 dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-cyan-500 cursor-pointer"
                    >
                      <option value="">All Material Types</option>
                      {distinctCategoryMaterialTypes.map((t) => (
                        <option key={t} value={t}>
                          {t === "FG" ? "FG (Finished Goods)" : t === "RM" ? "RM (Raw Material)" : t}
                        </option>
                      ))}
                    </select>
                    <select
                      value={searchCategoryDivision}
                      onChange={(e) => setSearchCategoryDivision(e.target.value)}
                      className="w-full sm:w-44 px-3 py-2 bg-gray-50 dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-cyan-500 cursor-pointer"
                    >
                      <option value="">All Divisions / Firms</option>
                      {divisions.map((d) => (
                        <option key={d.id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <ArrowUpDown
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"
                      />
                      <select
                        value={sortCategories}
                        onChange={(e) => setSortCategories(e.target.value)}
                        className="pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-cyan-500 cursor-pointer shadow-2xs"
                      >
                        <option value="default">Sort: Numbering (# 1 to N)</option>
                        <option value="num-desc">Sort: Numbering (# N to 1)</option>
                        <option value="newest">Sort: Newest to Oldest</option>
                        <option value="oldest">Sort: Oldest to Newest</option>
                        <option value="a-z">Sort: A to Z (Category)</option>
                        <option value="z-a">Sort: Z to A (Category)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {selectedCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteCategories}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                        <span>Delete Selected ({selectedCategories.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      Showing {filteredCategories.length} of {categories.length}
                    </span>
                  </div>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredCategories.length > 0 &&
                              filteredCategories.every((c) => selectedCategories.includes(c.name))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories(
                                  Array.from(
                                    new Set([
                                      ...selectedCategories,
                                      ...filteredCategories.map((c) => c.name),
                                    ]),
                                  ),
                                );
                              } else {
                                const visibleNames = filteredCategories.map((c) => c.name);
                                setSelectedCategories(
                                  selectedCategories.filter((cat) => !visibleNames.includes(cat)),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          />
                        </th>
                        <th
                          className="px-6 py-3.5 w-16 cursor-pointer select-none hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          onClick={() => setSortCategories((prev) => (prev === "default" ? "num-desc" : "default"))}
                          title="Click to sort numbering"
                        >
                          <div className="flex items-center gap-1">
                            <span>#</span>
                            {sortCategories === "default" ? (
                              <ArrowUp size={11} className="text-cyan-600 dark:text-cyan-400" />
                            ) : sortCategories === "num-desc" ? (
                              <ArrowDown size={11} className="text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5">Material Type</th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          onClick={() => setSortCategories((prev) => (prev === "a-z" ? "z-a" : "a-z"))}
                          title="Click to sort by Category Name (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Category Name</span>
                            {sortCategories === "a-z" ? (
                              <ArrowUp size={11} className="text-cyan-600 dark:text-cyan-400" />
                            ) : sortCategories === "z-a" ? (
                              <ArrowDown size={11} className="text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5">Firm / Division</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((c, idx) => {
                          const isEditing = editingCategoryIdx === c.actualIndex;
                          const isChecked = selectedCategories.includes(c.name);
                          const isRM = (c.material_type || c.materialType || "").toUpperCase() === "RM";
                          return (
                            <tr
                              key={`${c.name}-${idx}`}
                              className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                                isChecked ? "bg-cyan-50/30 dark:bg-cyan-950/10" : ""
                              }`}
                            >
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedCategories((prev) =>
                                      prev.includes(c.name)
                                        ? prev.filter((item) => item !== c.name)
                                        : [...prev, c.name],
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <select
                                    value={editCategoryMaterialType}
                                    onChange={(e) => setEditCategoryMaterialType(e.target.value)}
                                    className="px-2.5 py-1.5 border border-cyan-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                                  >
                                    {materialTypes.map((mt) => {
                                      const code = (mt.type_code || mt.typeCode || "").trim().toUpperCase();
                                      return (
                                        <option key={code} value={code}>
                                          {code}
                                        </option>
                                      );
                                    })}
                                  </select>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${
                                    isRM
                                      ? "bg-indigo-50 border-indigo-200/60 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/40 dark:text-indigo-400"
                                      : (c.material_type || c.materialType || "").toUpperCase() === "FG"
                                      ? "bg-violet-50 border-violet-200/60 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800/40 dark:text-violet-400"
                                      : "bg-cyan-50 border-cyan-200/60 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800/40 dark:text-cyan-400"
                                  }`}>
                                    {isRM ? <Boxes size={12} /> : (c.material_type || c.materialType || "").toUpperCase() === "FG" ? <Factory size={12} /> : <Tag size={12} />}
                                    {(c.material_type || c.materialType || "").toUpperCase() === "RM"
                                      ? "RM (Raw Material)"
                                      : (c.material_type || c.materialType || "").toUpperCase() === "FG"
                                      ? "FG (Finished Goods)"
                                      : (c.material_type || c.materialType || "FG")}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editCategoryValue}
                                    onChange={(e) => setEditCategoryValue(e.target.value)}
                                    className="px-3 py-1.5 border border-cyan-500 rounded-xl bg-white dark:bg-slate-955 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-cyan-50 border border-cyan-200/60 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800/40 dark:text-cyan-400">
                                    <FolderTree size={13} />
                                    {c.name}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <select
                                    value={editCategoryFirm}
                                    onChange={(e) => setEditCategoryFirm(e.target.value)}
                                    className="px-3 py-1.5 border border-cyan-500 rounded-xl bg-white dark:bg-slate-955 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  >
                                    <option value="">-- Select Firm --</option>
                                    {divisions.map((d) => (
                                      <option key={d.id || d.name} value={d.name}>
                                        {d.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
                                    {c.division || "All Firms"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                  <CheckCircle2 size={10} /> ACTIVE
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditCategory(c.actualIndex)}
                                      className="p-2 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-xl transition-all cursor-pointer"
                                      title="Save Category"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditCategory}
                                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditCategory(c, c.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Category"
                                    >
                                      <Edit size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(c.name)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Delete Category"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold"
                          >
                            No categories found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="block sm:hidden divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((c, idx) => {
                      const isEditing = editingCategoryIdx === c.actualIndex;
                      const isChecked = selectedCategories.includes(c.name);
                      const isRM = (c.material_type || c.materialType || "").toUpperCase() === "RM";
                      return (
                        <div
                          key={`${c.name}-${idx}`}
                          className={`p-4 space-y-3 ${
                            isChecked
                              ? "bg-cyan-50/40 dark:bg-cyan-950/20"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedCategories((prev) =>
                                    prev.includes(c.name)
                                      ? prev.filter((item) => item !== c.name)
                                      : [...prev, c.name],
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                                #{idx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
                                  {c.division || "All Firms"}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                <CheckCircle2 size={10} /> ACTIVE
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {isEditing ? (
                              <div className="space-y-2">
                                <select
                                  value={editCategoryMaterialType}
                                  onChange={(e) => setEditCategoryMaterialType(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-cyan-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white cursor-pointer"
                                >
                                  {materialTypes.map((mt) => {
                                    const code = (mt.type_code || mt.typeCode || "").trim().toUpperCase();
                                    const name = mt.type_name || mt.typeName || "";
                                    return (
                                      <option key={code} value={code}>
                                        {code} — {name}
                                      </option>
                                    );
                                  })}
                                </select>
                                <input
                                  type="text"
                                  value={editCategoryValue}
                                  onChange={(e) => setEditCategoryValue(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-cyan-500 rounded-xl bg-white dark:bg-slate-955 text-xs font-bold text-gray-900 dark:text-white"
                                  autoFocus
                                />
                                <select
                                  value={editCategoryFirm}
                                  onChange={(e) => setEditCategoryFirm(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-cyan-500 rounded-xl bg-white dark:bg-slate-955 text-xs font-bold text-gray-900 dark:text-white"
                                >
                                  <option value="">-- Select Firm --</option>
                                  {divisions.map((d) => (
                                    <option key={d.id || d.name} value={d.name}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${
                                  isRM
                                    ? "bg-indigo-50 border-indigo-200/60 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/40 dark:text-indigo-400"
                                    : (c.material_type || c.materialType || "").toUpperCase() === "FG"
                                    ? "bg-violet-50 border-violet-200/60 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800/40 dark:text-violet-400"
                                    : "bg-cyan-50 border-cyan-200/60 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800/40 dark:text-cyan-400"
                                }`}>
                                  {isRM ? <Boxes size={12} /> : (c.material_type || c.materialType || "").toUpperCase() === "FG" ? <Factory size={12} /> : <Tag size={12} />}
                                  {(c.material_type || c.materialType || "").toUpperCase() === "RM"
                                    ? "RM (Raw Material)"
                                    : (c.material_type || c.materialType || "").toUpperCase() === "FG"
                                    ? "FG (Finished Goods)"
                                    : (c.material_type || c.materialType || "FG")}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-cyan-50 border border-cyan-200/60 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800/40 dark:text-cyan-400">
                                  <FolderTree size={14} />
                                  {c.name}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-1 pt-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditCategory(c.actualIndex)}
                                    className="p-2 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-xl transition-all cursor-pointer"
                                    title="Save Category"
                                  >
                                    <Check size={16} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditCategory}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditCategory(c, c.actualIndex)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Category"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(c.name)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Delete Category"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400 dark:text-slate-500 font-bold text-xs">
                      No categories found matching your search.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}


          {/* SUB-TAB 5: FINISHED GOODS NAMES */}
          {activeSubTab === "finishedGoodsNames" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header & Actions */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-violet-100/60 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl shrink-0">
                      <Factory size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Manage Finished Goods
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Define finished product titles for output inventory tracking
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openAddModal("finishedGoodsNames")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Add Finished Good</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleFinishedGoodsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/60 dark:border-slate-700"
                      title="Download Sample CSV"
                    >
                      <Download size={14} />
                      <span>Sample CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportFinishedGoodsCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Export All Finished Goods to CSV"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                    <label className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <Upload size={14} />
                      <span>Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportFinishedGoodsCSV}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1 max-w-3xl">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search finished goods name, SKU or HSN..."
                        value={searchFinishedGoodsQuery}
                        onChange={(e) => setSearchFinishedGoodsQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-violet-500 text-gray-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={searchFinishedGoodsCategory}
                      onChange={(e) => {
                        setSearchFinishedGoodsCategory(e.target.value);
                        setSearchFinishedGoodsDropdown("");
                      }}
                      className="w-full sm:w-40 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-violet-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">All Categories</option>
                      {categories
                        .filter((c) => {
                          const mType = typeof c === "string" ? null : c.materialType;
                          return mType !== "RM";
                        })
                        .map((c) => {
                          const catName = typeof c === "string" ? c : c.name;
                          return (
                            <option key={catName} value={catName}>
                              {catName}
                            </option>
                          );
                        })}
                    </select>
                    <select
                      value={searchFinishedGoodsDropdown}
                      onChange={(e) => setSearchFinishedGoodsDropdown(e.target.value)}
                      className="w-full sm:w-48 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-violet-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">All Finished Goods ({uniqueFinishedGoodsNamesList.length})</option>
                      {uniqueFinishedGoodsNamesList.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={searchFinishedGoodsDivision}
                      onChange={(e) => setSearchFinishedGoodsDivision(e.target.value)}
                      className="w-full sm:w-36 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-violet-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">All Firms</option>
                      {divisions.map((d) => (
                        <option key={d.id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <ArrowUpDown
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"
                      />
                      <select
                        value={sortFinishedGoodsNames}
                        onChange={(e) => setSortFinishedGoodsNames(e.target.value)}
                        className="pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-violet-500 cursor-pointer shadow-2xs"
                      >
                        <option value="default">Sort: Numbering (# 1 to N)</option>
                        <option value="num-desc">Sort: Numbering (# N to 1)</option>
                        <option value="newest">Sort: Newest to Oldest</option>
                        <option value="oldest">Sort: Oldest to Newest</option>
                        <option value="name-asc">Sort: A to Z (Name)</option>
                        <option value="name-desc">Sort: Z to A (Name)</option>
                        <option value="sku-asc">Sort: SKU (A to Z)</option>
                        <option value="sku-desc">Sort: SKU (Z to A)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {selectedFinishedGoodsNames.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteFinishedGoodsNames}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                        <span>Delete Selected ({selectedFinishedGoodsNames.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      Showing {filteredFinishedGoodsNames.length} of {finishedGoodsNames.length}
                    </span>
                  </div>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredFinishedGoodsNames.length > 0 &&
                              filteredFinishedGoodsNames.every((item) =>
                                selectedFinishedGoodsNames.includes(item.name),
                              )
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFinishedGoodsNames(
                                  Array.from(
                                    new Set([
                                      ...selectedFinishedGoodsNames,
                                      ...filteredFinishedGoodsNames.map((item) => item.name),
                                    ]),
                                  ),
                                );
                              } else {
                                const currentFilteredNames = filteredFinishedGoodsNames.map((item) => item.name);
                                setSelectedFinishedGoodsNames(
                                  selectedFinishedGoodsNames.filter(
                                    (n) => !currentFilteredNames.includes(n),
                                  ),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                        </th>
                        <th
                          className="px-6 py-3.5 w-16 cursor-pointer select-none hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          onClick={() => setSortFinishedGoodsNames((prev) => (prev === "default" ? "num-desc" : "default"))}
                          title="Click to sort numbering"
                        >
                          <div className="flex items-center gap-1">
                            <span>#</span>
                            {sortFinishedGoodsNames === "default" ? (
                              <ArrowUp size={11} className="text-violet-600 dark:text-violet-400" />
                            ) : sortFinishedGoodsNames === "num-desc" ? (
                              <ArrowDown size={11} className="text-violet-600 dark:text-violet-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          onClick={() => setSortFinishedGoodsNames((prev) => (prev === "sku-asc" ? "sku-desc" : "sku-asc"))}
                          title="Click to sort by SKU Code (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>SKU Code</span>
                            {sortFinishedGoodsNames === "sku-asc" ? (
                              <ArrowUp size={11} className="text-violet-600 dark:text-violet-400" />
                            ) : sortFinishedGoodsNames === "sku-desc" ? (
                              <ArrowDown size={11} className="text-violet-600 dark:text-violet-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3.5 cursor-pointer select-none hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          onClick={() => setSortFinishedGoodsNames((prev) => (prev === "name-asc" ? "name-desc" : "name-asc"))}
                          title="Click to sort by Finished Goods Name (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Finished Goods Name</span>
                            {sortFinishedGoodsNames === "name-asc" ? (
                              <ArrowUp size={11} className="text-violet-600 dark:text-violet-400" />
                            ) : sortFinishedGoodsNames === "name-desc" ? (
                              <ArrowDown size={11} className="text-violet-600 dark:text-violet-400" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 dark:text-slate-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3.5">Firm / Division</th>
                        <th className="px-6 py-3.5">HSN Code</th>
                        <th className="px-6 py-3.5">Classification / Category</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredFinishedGoodsNames.length > 0 ? (
                        filteredFinishedGoodsNames.map((item, idx) => {
                          const n = item.name;
                          const cat = item.category;
                          const sku = item.sku;
                          const hsn = item.hsn;
                          const isEditing = editingFinishedGoods === item.actualIndex;
                          const isChecked = selectedFinishedGoodsNames.includes(n);
                          return (
                            <tr
                              key={n + idx}
                              className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                                isChecked ? "bg-violet-50/30 dark:bg-violet-950/10" : ""
                              }`}
                            >
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedFinishedGoodsNames((prev) =>
                                      prev.includes(n)
                                        ? prev.filter((item) => item !== n)
                                        : [...prev, n],
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editFinishedGoodsSku}
                                    onChange={(e) => setEditFinishedGoodsSku(e.target.value)}
                                    placeholder="SKU Code"
                                    className="w-28 px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-xs font-bold text-gray-700 dark:text-slate-300">
                                    {sku || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editFinishedGoodsValue}
                                    onChange={(e) => setEditFinishedGoodsValue(e.target.value)}
                                    className="px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-violet-50 border border-violet-200/60 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800/40 dark:text-violet-400">
                                    <Factory size={13} />
                                    {n}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <select
                                    value={editFinishedGoodsFirm}
                                    onChange={(e) => setEditFinishedGoodsFirm(e.target.value)}
                                    className="px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  >
                                    <option value="ALL">Universal</option>
                                    {divisions.map((d) => (
                                      <option key={d.id || d.name} value={d.name}>
                                        {d.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (item.division && item.division !== "ALL" && item.division.toLowerCase() !== "universal") ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-violet-50 border border-violet-200/60 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800/40 dark:text-violet-400">
                                    {item.division}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-slate-500 italic text-[11px]">Universal</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editFinishedGoodsHsn}
                                    onChange={(e) => setEditFinishedGoodsHsn(e.target.value)}
                                    placeholder="HSN Code"
                                    className="w-24 px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-xs font-semibold text-gray-600 dark:text-slate-400">
                                    {hsn || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <select
                                    value={editFinishedGoodsCategory}
                                    onChange={(e) => setEditFinishedGoodsCategory(e.target.value)}
                                    className="px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  >
                                    <option value="Finished Goods">Finished Goods</option>
                                    {categories
                                      .filter((c) => {
                                        const mType = typeof c === "string" ? null : c.materialType;
                                        return mType !== "RM";
                                      })
                                      .map((c) => {
                                        const catName = typeof c === "string" ? c : c.name;
                                        return (
                                          <option key={catName} value={catName}>
                                            {catName}
                                          </option>
                                        );
                                      })}
                                  </select>
                                ) : (
                                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50/70 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200/40">
                                    {cat || "Finished Goods"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                  <CheckCircle2 size={10} /> ACTIVE
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditFinishedGoods(item.actualIndex)}
                                      className="p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-xl transition-all cursor-pointer"
                                      title="Save Finished Goods Name"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditFinishedGoods}
                                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditFinishedGoods(item.raw, item.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Finished Goods Name"
                                    >
                                      <Edit3 size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFinishedGoodsName(n, item.actualIndex)}
                                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Delete Finished Goods Name"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="9"
                            className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 font-bold"
                          >
                            No finished goods found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="block sm:hidden divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
                  {filteredFinishedGoodsNames.length > 0 ? (
                    filteredFinishedGoodsNames.map((item, idx) => {
                      const n = item.name;
                      const cat = item.category;
                      const sku = item.sku;
                      const hsn = item.hsn;
                      const isEditing = editingFinishedGoods === item.actualIndex;
                      const isChecked = selectedFinishedGoodsNames.includes(n);
                      return (
                        <div
                          key={n + idx}
                          className={`p-4 space-y-3 ${
                            isChecked
                              ? "bg-violet-50/40 dark:bg-violet-950/20"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedFinishedGoodsNames((prev) =>
                                    prev.includes(n)
                                      ? prev.filter((item) => item !== n)
                                      : [...prev, n],
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                                #{idx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {sku && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                                  {sku}
                                </span>
                              )}
                              {hsn && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/50">
                                  HSN: {hsn}
                                </span>
                              )}
                              {item.division && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200/50">
                                  {item.division}
                                </span>
                              )}
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50/70 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200/40">
                                {cat || "Finished Goods"}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:border-green-200/50">
                                <CheckCircle2 size={10} /> ACTIVE
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editFinishedGoodsSku}
                                  onChange={(e) => setEditFinishedGoodsSku(e.target.value)}
                                  placeholder="SKU Code"
                                  className="w-full px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={editFinishedGoodsValue}
                                  onChange={(e) => setEditFinishedGoodsValue(e.target.value)}
                                  placeholder="Finished Goods Name"
                                  className="w-full px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  value={editFinishedGoodsHsn}
                                  onChange={(e) => setEditFinishedGoodsHsn(e.target.value)}
                                  placeholder="HSN Code"
                                  className="w-full px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                />
                                <select
                                  value={editFinishedGoodsFirm}
                                  onChange={(e) => setEditFinishedGoodsFirm(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                >
                                  <option value="ALL">Firm: Universal</option>
                                  {divisions.map((d) => (
                                    <option key={d.id || d.name} value={d.name}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={editFinishedGoodsCategory}
                                  onChange={(e) => setEditFinishedGoodsCategory(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                >
                                  <option value="Finished Goods">Finished Goods</option>
                                  {categories
                                    .filter((c) => {
                                      const mType = typeof c === "string" ? null : c.materialType;
                                      return mType !== "RM";
                                    })
                                    .map((c) => {
                                      const catName = typeof c === "string" ? c : c.name;
                                      return (
                                        <option key={catName} value={catName}>
                                          {catName}
                                        </option>
                                      );
                                    })}
                                </select>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-violet-50 border border-violet-200/60 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800/40 dark:text-violet-400">
                                <Factory size={14} />
                                {n}
                              </span>
                            )}

                            <div className="flex items-center gap-1 shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditFinishedGoods(item.actualIndex)}
                                    className="p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-xl transition-all cursor-pointer"
                                    title="Save Finished Goods Name"
                                  >
                                    <Check size={16} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditFinishedGoods}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditFinishedGoods(item.raw, item.actualIndex)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Finished Goods Name"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFinishedGoodsName(n, item.actualIndex)}
                                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Delete Finished Goods Name"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold">
                      No finished goods found matching your search.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Import Preview Modal */}
      {csvPreviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {csvPreviewModal.title}
                  </h3>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>
                      File:{" "}
                      <strong className="text-gray-700 dark:text-slate-300">
                        {csvPreviewModal.fileName}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Total CSV Rows:{" "}
                      <strong className="text-gray-700 dark:text-slate-300">
                        {csvPreviewModal.validRows.length +
                          csvPreviewModal.skippedRows.length}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (csvPreviewModal.inputEvent?.target) {
                    csvPreviewModal.inputEvent.target.value = "";
                  }
                  setCsvPreviewModal((prev) => ({ ...prev, isOpen: false }));
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 sm:px-6 bg-gray-50/40 dark:bg-slate-950/40 border-b border-gray-100 dark:border-slate-800">
              <div
                onClick={() =>
                  setCsvPreviewModal((p) => ({ ...p, activeTab: "valid" }))
                }
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  csvPreviewModal.activeTab === "valid"
                    ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-gray-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                      Matched & Ready to Add
                    </div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {csvPreviewModal.validRows.length} rows
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  Supported
                </span>
              </div>

              <div
                onClick={() =>
                  setCsvPreviewModal((p) => ({ ...p, activeTab: "skipped" }))
                }
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  csvPreviewModal.activeTab === "skipped"
                    ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-gray-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                      Unsupported / Skipped Rows
                    </div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {csvPreviewModal.skippedRows.length} rows
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg">
                  Not Supported
                </span>
              </div>
            </div>

            {/* Sub-Header Bar with Tabs & Search */}
            <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    setCsvPreviewModal((p) => ({ ...p, activeTab: "valid" }))
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    csvPreviewModal.activeTab === "valid"
                      ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>
                    Ready to Add ({csvPreviewModal.validRows.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCsvPreviewModal((p) => ({ ...p, activeTab: "skipped" }))
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    csvPreviewModal.activeTab === "skipped"
                      ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span>
                    Skipped Rows ({csvPreviewModal.skippedRows.length})
                  </span>
                </button>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={csvPreviewModal.searchQuery}
                  onChange={(e) =>
                    setCsvPreviewModal((p) => ({
                      ...p,
                      searchQuery: e.target.value,
                    }))
                  }
                  placeholder="Search rows or reasons..."
                  className="w-full pl-9 pr-3.5 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[250px] max-h-[420px] bg-gray-50/20 dark:bg-slate-950/20">
              {csvPreviewModal.activeTab === "valid" ? (
                (() => {
                  const filteredValid = csvPreviewModal.validRows.filter(
                    (r) =>
                      !csvPreviewModal.searchQuery ||
                      (r.name &&
                        r.name
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.sku &&
                        r.sku
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.category &&
                        r.category
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.division &&
                        r.division
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase()))
                  );

                  if (filteredValid.length === 0) {
                    return (
                      <div className="py-12 text-center flex flex-col items-center justify-center">
                        <div className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-2xl mb-3">
                          <Layers size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-600 dark:text-slate-300">
                          No valid rows to show
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-xs">
                          {csvPreviewModal.searchQuery
                            ? "No valid rows match your search query."
                            : "All rows in this CSV were skipped or rejected due to validation errors."}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 dark:bg-slate-950/80 border-b border-gray-200/80 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4 w-16"># Line</th>
                            {csvPreviewModal.type !== "categories" && (
                              <th className="py-3 px-4">SKU Code</th>
                            )}
                            <th className="py-3 px-4">Item / Name</th>
                            {csvPreviewModal.type !== "categories" && (
                              <th className="py-3 px-4">HSN Code</th>
                            )}
                            {csvPreviewModal.type === "categories" ? (
                              <th className="py-3 px-4">Firm Division</th>
                            ) : (
                              <th className="py-3 px-4">Category / Firm</th>
                            )}
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                          {filteredValid.map((r, idx) => (
                            <tr
                              key={`valid-${idx}`}
                              className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3 px-4 text-gray-400 dark:text-slate-500 font-mono text-[11px]">
                                Line {r.lineNum}
                              </td>
                              {csvPreviewModal.type !== "categories" && (
                                <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold font-mono">
                                  {r.sku || "—"}
                                </td>
                              )}
                              <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold">
                                {r.name}
                              </td>
                              {csvPreviewModal.type !== "categories" && (
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300 font-mono">
                                  {r.hsn || "—"}
                                </td>
                              )}
                              <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                  {r.category ? `${r.category} (${r.division && r.division !== "ALL" && r.division.toLowerCase() !== "universal" ? r.division : "Universal"})` : (r.division && r.division !== "ALL" && r.division.toLowerCase() !== "universal" ? r.division : "Universal")}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                  <CheckCircle2 size={12} />
                                  Ready to Add
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const filteredSkipped = csvPreviewModal.skippedRows.filter(
                    (r) =>
                      !csvPreviewModal.searchQuery ||
                      (r.name &&
                        r.name
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.sku &&
                        r.sku
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.hsn &&
                        r.hsn
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.reason &&
                        r.reason
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.category &&
                        r.category
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase())) ||
                      (r.division &&
                        r.division
                          .toLowerCase()
                          .includes(csvPreviewModal.searchQuery.toLowerCase()))
                  );

                  if (filteredSkipped.length === 0) {
                    return (
                      <div className="py-12 text-center flex flex-col items-center justify-center">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-2xl mb-3">
                          <CheckCircle2 size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-700 dark:text-slate-200">
                          {csvPreviewModal.searchQuery
                            ? "No skipped rows match your search."
                            : "Awesome! No rows were skipped."}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                          All rows in the uploaded CSV are valid and supported!
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 dark:bg-slate-950/80 border-b border-gray-200/80 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4 w-16"># Line</th>
                            {csvPreviewModal.type !== "categories" && (
                              <th className="py-3 px-4">SKU Code</th>
                            )}
                            <th className="py-3 px-4">Item / Name</th>
                            {csvPreviewModal.type !== "categories" && (
                              <th className="py-3 px-4">HSN Code</th>
                            )}
                            {csvPreviewModal.type === "categories" ? (
                              <th className="py-3 px-4">Firm Division</th>
                            ) : (
                              <th className="py-3 px-4">Category / Firm</th>
                            )}
                            <th className="py-3 px-4">Reason Not Inserted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                          {filteredSkipped.map((r, idx) => (
                            <tr
                              key={`skipped-${idx}`}
                              className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors"
                            >
                              <td className="py-3 px-4 text-gray-400 dark:text-slate-500 font-mono text-[11px]">
                                Line {r.lineNum}
                              </td>
                              {csvPreviewModal.type !== "categories" && (
                                <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold font-mono">
                                  {r.sku || "—"}
                                </td>
                              )}
                              <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold">
                                {r.name || "—"}
                              </td>
                              {csvPreviewModal.type !== "categories" && (
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300 font-mono">
                                  {r.hsn || "—"}
                                </td>
                              )}
                              <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                  {r.category ? `${r.category} (${r.division && r.division !== "ALL" && r.division.toLowerCase() !== "universal" ? r.division : "Universal"})` : (r.division && r.division !== "ALL" && r.division.toLowerCase() !== "universal" ? r.division : "Universal")}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
                                  <AlertCircle size={12} className="shrink-0" />
                                  {r.reason}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-900/50">
              <div>
                {csvPreviewModal.skippedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportSkippedCSV}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Download size={15} />
                    <span>
                      Export Skipped CSV ({csvPreviewModal.skippedRows.length})
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (csvPreviewModal.inputEvent?.target) {
                      csvPreviewModal.inputEvent.target.value = "";
                    }
                    setCsvPreviewModal((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    csvPreviewModal.validRows.length === 0 ||
                    csvPreviewModal.isSubmitting
                  }
                  onClick={handleConfirmCSVImport}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {csvPreviewModal.isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>
                        Confirm & Import ({csvPreviewModal.validRows.length}{" "}
                        Rows)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED ADD ITEM POP-UP MODAL                                           */}
      {/* ========================================================================= */}
      {addModal.isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={closeAddModal}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Modal Header */}
            {addModal.type === "units" && (
              <div className="p-6 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-transparent dark:from-emerald-950/20 dark:via-slate-900 dark:to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <Scale size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Add Unit of Measurement (UoM)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Create standard unit symbol for inventory items
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {addModal.type === "locations" && (
              <div className="p-6 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-amber-50/60 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 dark:to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100/70 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Add Storage Location
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Configure warehouse rack, godown, or storage bin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {addModal.type === "materialTypes" && (
              <div className="p-6 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-rose-50/60 via-white to-transparent dark:from-rose-950/20 dark:via-slate-900 dark:to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-100/70 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl">
                    <Tag size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Add Material Type
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Define material classification code and name
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {addModal.type === "materialNames" && (
              <div className="p-6 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-900 dark:to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Boxes size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Add Standard Raw Material
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Catalog standardized raw material for procurement & stock
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {addModal.type === "categories" && (
              <div className="p-6 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-cyan-50/60 via-white to-transparent dark:from-cyan-950/20 dark:via-slate-900 dark:to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-100/70 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 rounded-2xl">
                    <FolderTree size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Add Material Category
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Create item category linked to a Firm / Division
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {addModal.type === "finishedGoodsNames" && (
              <div className="p-6 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-violet-50/60 via-white to-transparent dark:from-violet-950/20 dark:via-slate-900 dark:to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-100/70 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-2xl">
                    <Factory size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Add Finished Good Item
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Define manufactured product for output tracking
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* 2. Modal Body / Forms */}
            <div className="p-6">
              {/* UNITS FORM */}
              {addModal.type === "units" && (
                <form onSubmit={handleAddUnit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Unit Symbol <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="e.g. BAG, DRUM, KG, LTR, PKT"
                      autoFocus
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase placeholder:normal-case placeholder:font-normal"
                    />
                  </div>

                  {/* Quick Suggestions Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                      Quick Suggestions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["BAG", "DRUM", "KG", "LTR", "MTR", "NOS", "PKT", "ROLL", "SET", "BOX"].map(
                        (symbol) => (
                          <button
                            key={symbol}
                            type="button"
                            onClick={() => setNewUnit(symbol)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                              newUnit.toUpperCase() === symbol
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-gray-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-slate-300 border-gray-200/60 dark:border-slate-700"
                            }`}
                          >
                            {symbol}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingUnit || !newUnit.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {isSubmittingUnit ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Create Unit</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* LOCATIONS FORM */}
              {addModal.type === "locations" && (
                <form onSubmit={handleAddLocation} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Firm / Division <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newLocationFirm}
                      onChange={(e) => setNewLocationFirm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="">Select Firm / Division...</option>
                      {divisions.map((d) => (
                        <option key={d.id ?? d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Location Code / Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g. WH-A / Rack 5, Godown 1, Bin 12"
                      autoFocus
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingLocation || !newLocation.trim() || !newLocationFirm}
                      className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {isSubmittingLocation ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Create Location</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* MATERIAL TYPES FORM */}
              {addModal.type === "materialTypes" && (
                <form onSubmit={handleAddMaterialType} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Type Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newMaterialTypeCode}
                      onChange={(e) => setNewMaterialTypeCode(e.target.value)}
                      placeholder="e.g. FG, RM, SPARE, WIP, CONSUMABLE"
                      autoFocus
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white uppercase focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Type Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newMaterialTypeName}
                      onChange={(e) => setNewMaterialTypeName(e.target.value)}
                      placeholder="e.g. Finished Goods, Raw Material, Spare Parts"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingMaterialType || !newMaterialTypeCode.trim() || !newMaterialTypeName.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {isSubmittingMaterialType ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Create Material Type</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* RAW MATERIALS FORM */}
              {addModal.type === "materialNames" && (
                <form onSubmit={handleAddMaterialName} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        SKU Code
                      </label>
                      <input
                        type="text"
                        value={newMaterialSku}
                        onChange={(e) => setNewMaterialSku(e.target.value)}
                        placeholder="e.g. RM-001"
                        autoFocus
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        HSN Code
                      </label>
                      <input
                        type="text"
                        value={newMaterialHsn}
                        onChange={(e) => setNewMaterialHsn(e.target.value)}
                        placeholder="e.g. 7214"
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Raw Material Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newMaterialName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      placeholder="e.g. Copper Wire 2.5mm / MS Plate 10mm"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Firm / Division Scope
                    </label>
                    <select
                      value={newMaterialFirm}
                      onChange={(e) => setNewMaterialFirm(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="ALL">Firm: Universal</option>
                      {divisions.map((d) => (
                        <option key={d.id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingMaterial || !newMaterialName.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {isSubmittingMaterial ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Create Raw Material</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* CATEGORIES FORM */}
              {addModal.type === "categories" && (
                <form onSubmit={handleAddCategory} className="space-y-4">
                  {/* 1. Material Type (Dynamic from material_types table) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Material Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {materialTypes.map((mt) => {
                          const code = (mt.type_code || mt.typeCode || "").trim().toUpperCase();
                          const isSelected = newCategoryMaterialType.trim().toUpperCase() === code;
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setNewCategoryMaterialType(code)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                isSelected
                                ? "bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-400 ring-1 ring-cyan-400"
                                : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <select
                      value={newCategoryMaterialType}
                      onChange={(e) => setNewCategoryMaterialType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                      <option value="">-- Select Material Type --</option>
                      {materialTypes.map((mt) => {
                        const code = (mt.type_code || mt.typeCode || "").trim().toUpperCase();
                        const name = mt.type_name || mt.typeName || "";
                        return (
                          <option key={code} value={code}>
                            {code} — {name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Category Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Category Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. Electrical & Electronics, Panels, Fasteners, Tools"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  {/* 3. Firm / Division Link */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Firm / Division Link
                    </label>
                    <select
                      value={newCategoryFirm}
                      onChange={(e) => setNewCategoryFirm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                      <option value="ALL">Firm: Universal</option>
                      {divisions.map((d) => (
                        <option key={d.id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCategory || !newCategory.trim() || !newCategoryMaterialType.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {isSubmittingCategory ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Create Category</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* FINISHED GOODS FORM */}
              {addModal.type === "finishedGoodsNames" && (
                <form onSubmit={handleAddFinishedGoodsName} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        SKU Code
                      </label>
                      <input
                        type="text"
                        value={newFinishedGoodsSku}
                        onChange={(e) => setNewFinishedGoodsSku(e.target.value)}
                        placeholder="e.g. FG-001"
                        autoFocus
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        HSN Code
                      </label>
                      <input
                        type="text"
                        value={newFinishedGoodsHsn}
                        onChange={(e) => setNewFinishedGoodsHsn(e.target.value)}
                        placeholder="e.g. 8483"
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Finished Good Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newFinishedGoodsName}
                      onChange={(e) => setNewFinishedGoodsName(e.target.value)}
                      placeholder="e.g. Gear Assembly GP1, Bearing Unit X2"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Category
                      </label>
                      <select
                        value={newFinishedGoodsCategory}
                        onChange={(e) => setNewFinishedGoodsCategory(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option value="">Select Category</option>
                        {categories
                          .filter((c) => {
                            const mType = typeof c === "string" ? null : c.materialType;
                            return mType !== "RM";
                          })
                          .map((c) => {
                            const catName = typeof c === "string" ? c : c.name;
                            return (
                              <option key={catName} value={catName}>
                                {catName}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Firm / Division
                      </label>
                      <select
                        value={newFinishedGoodsFirm}
                        onChange={(e) => setNewFinishedGoodsFirm(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option value="ALL">Firm: Universal</option>
                        {divisions.map((d) => (
                          <option key={d.id || d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingFinishedGoods || !newFinishedGoodsName.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {isSubmittingFinishedGoods ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Create Finished Good</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
