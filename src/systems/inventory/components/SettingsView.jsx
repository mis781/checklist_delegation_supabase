// src/systems/inventory/components/SettingsView.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  Check,
  X,
  FolderTree,
} from "lucide-react";
import { saveList } from "../../../redux/slice/inventorySlice";



export default function SettingsView({ activeUser }) {
  const dispatch = useDispatch();
  const {
    units = [],
    locations = [],
    divisions = [],
    materialNames = [],
    categories = [],
    finishedGoodsNames = [],
  } = useSelector((state) => state.inventory);

  const isAdminOrSuper =
    activeUser?.role === "Admin" || activeUser?.role === "Superadmin";

  // Active Sub-Tab state
  const [activeSubTab, setActiveSubTab] = useState("units");

  // State for adding new items
  const [newUnit, setNewUnit] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLocationFirm, setNewLocationFirm] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryFirm, setNewCategoryFirm] = useState("");
  const [newFinishedGoodsName, setNewFinishedGoodsName] = useState("");

  // Search states for tables
  const [searchUnitQuery, setSearchUnitQuery] = useState("");
  const [searchLocationQuery, setSearchLocationQuery] = useState("");
  const [searchLocationDivision, setSearchLocationDivision] = useState("");
  const [searchMaterialQuery, setSearchMaterialQuery] = useState("");
  const [searchCategoryQuery, setSearchCategoryQuery] = useState("");
  const [searchCategoryDivision, setSearchCategoryDivision] = useState("");
  const [searchFinishedGoodsQuery, setSearchFinishedGoodsQuery] = useState("");

  // Inline Edit states
  const [editingUnit, setEditingUnit] = useState(null);
  const [editUnitValue, setEditUnitValue] = useState("");

  const [editingLocationIdx, setEditingLocationIdx] = useState(null);
  const [editLocationValue, setEditLocationValue] = useState("");
  const [editLocationFirm, setEditLocationFirm] = useState("");

  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editMaterialValue, setEditMaterialValue] = useState("");

  const [editingCategoryIdx, setEditingCategoryIdx] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [editCategoryFirm, setEditCategoryFirm] = useState("");

  const [editingFinishedGoods, setEditingFinishedGoods] = useState(null);
  const [editFinishedGoodsValue, setEditFinishedGoodsValue] = useState("");



  // --- UNIT HANDLERS ---
  const handleAddUnit = (e) => {
    e.preventDefault();
    const val = newUnit.trim().toUpperCase();
    if (!val) return;
    if (units.includes(val)) {
      alert("Unit already exists.");
      return;
    }
    const updated = [...units, val];
    dispatch(
      saveList({ type: "units", list: updated, currentUser: activeUser.name }),
    );
    setNewUnit("");
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
  const handleAddLocation = (e) => {
    e.preventDefault();
    const val = newLocation.trim();
    if (!val) return;
    if (!newLocationFirm) {
      alert("Please select a Firm for this location.");
      return;
    }
    if (locations.some((l) => l.location === val)) {
      alert("Location already exists.");
      return;
    }
    const updated = [...locations, { location: val, division: newLocationFirm }];
    dispatch(
      saveList({
        type: "locations",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setNewLocation("");
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
  const handleAddMaterialName = (e) => {
    e.preventDefault();
    const val = newMaterialName.trim();
    if (!val) return;
    if (materialNames.includes(val)) {
      alert("Material Name already exists.");
      return;
    }
    const updated = [...materialNames, val];
    dispatch(
      saveList({
        type: "materialNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setNewMaterialName("");
  };

  const handleQuickAddMaterialName = (val) => {
    if (materialNames.includes(val)) return;
    const updated = [...materialNames, val];
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
      const updated = materialNames.filter((n) => n !== nameToDelete);
      dispatch(
        saveList({
          type: "materialNames",
          list: updated,
          currentUser: activeUser.name,
        }),
      );
      if (editingMaterial === nameToDelete) setEditingMaterial(null);
    }
  };

  const handleStartEditMaterial = (m) => {
    setEditingMaterial(m);
    setEditMaterialValue(m);
  };

  const handleSaveEditMaterial = (oldName) => {
    const val = editMaterialValue.trim();
    if (!val) return;
    if (val !== oldName && materialNames.includes(val)) {
      alert("Material Name already exists.");
      return;
    }
    const updated = materialNames.map((m) => (m === oldName ? val : m));
    dispatch(
      saveList({
        type: "materialNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setEditingMaterial(null);
  };

  const handleCancelEditMaterial = () => {
    setEditingMaterial(null);
    setEditMaterialValue("");
  };

  // --- CATEGORY HANDLERS ---
  const handleAddCategory = (e) => {
    e.preventDefault();
    const val = newCategory.trim();
    if (!val) return;
    const divisionVal = newCategoryFirm ? newCategoryFirm : null;
    if (
      categories.some(
        (c) =>
          (typeof c === "string" ? c : c.name).toLowerCase() === val.toLowerCase() &&
          ((typeof c === "object" ? c.division : null) || null) === divisionVal,
      )
    ) {
      alert("Category already exists for this Firm.");
      return;
    }
    const updated = [...categories, { name: val, division: divisionVal }];
    const userName = activeUser?.name || activeUser?.user_name || "Admin";
    dispatch(
      saveList({
        type: "categories",
        list: updated,
        currentUser: userName,
      }),
    );
    setNewCategory("");
    setNewCategoryFirm("");
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
    setEditCategoryFirm(typeof catObj === "string" ? "" : (catObj.division || ""));
  };

  const handleSaveEditCategory = (actualIdx) => {
    const val = editCategoryValue.trim();
    if (!val) return;
    const divisionVal = editCategoryFirm ? editCategoryFirm : null;
    if (
      categories.some(
        (c, idx) =>
          idx !== actualIdx &&
          (typeof c === "string" ? c : c.name).toLowerCase() === val.toLowerCase() &&
          ((typeof c === "object" ? c.division : null) || null) === divisionVal,
      )
    ) {
      alert("Category already exists for this Firm.");
      return;
    }
    const updated = categories.map((c, idx) =>
      idx === actualIdx ? { ...(typeof c === "object" ? c : {}), name: val, division: divisionVal } : c,
    );
    dispatch(
      saveList({
        type: "categories",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setEditingCategoryIdx(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryIdx(null);
    setEditCategoryValue("");
    setEditCategoryFirm("");
  };


  // --- FINISHED GOODS HANDLERS ---
  const handleAddFinishedGoodsName = (e) => {
    e.preventDefault();
    const val = newFinishedGoodsName.trim();
    if (!val) return;
    if (finishedGoodsNames.includes(val)) {
      alert("Finished Goods Name already exists.");
      return;
    }
    const updated = [...finishedGoodsNames, val];
    dispatch(
      saveList({
        type: "finishedGoodsNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setNewFinishedGoodsName("");
  };

  const handleQuickAddFinishedGoodsName = (val) => {
    if (finishedGoodsNames.includes(val)) return;
    const updated = [...finishedGoodsNames, val];
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
      const updated = finishedGoodsNames.filter((n) => n !== nameToDelete);
      dispatch(
        saveList({
          type: "finishedGoodsNames",
          list: updated,
          currentUser: activeUser.name,
        }),
      );
      if (editingFinishedGoods === nameToDelete) setEditingFinishedGoods(null);
    }
  };

  const handleStartEditFinishedGoods = (fg) => {
    setEditingFinishedGoods(fg);
    setEditFinishedGoodsValue(fg);
  };

  const handleSaveEditFinishedGoods = (oldName) => {
    const val = editFinishedGoodsValue.trim();
    if (!val) return;
    if (val !== oldName && finishedGoodsNames.includes(val)) {
      alert("Finished Goods Name already exists.");
      return;
    }
    const updated = finishedGoodsNames.map((fg) => (fg === oldName ? val : fg));
    dispatch(
      saveList({
        type: "finishedGoodsNames",
        list: updated,
        currentUser: activeUser.name,
      }),
    );
    setEditingFinishedGoods(null);
  };

  const handleCancelEditFinishedGoods = () => {
    setEditingFinishedGoods(null);
    setEditFinishedGoodsValue("");
  };

  // Filtered lists for tabular display
  const filteredUnits = units.filter((u) =>
    u.toLowerCase().includes(searchUnitQuery.toLowerCase().trim()),
  );

  const filteredLocations = locations
    .map((l, index) => ({ ...l, actualIndex: index }))
    .filter((l) => {
      const matchesSearch = l.location
        .toLowerCase()
        .includes(searchLocationQuery.toLowerCase().trim());
      const matchesDiv = searchLocationDivision
        ? (l.division || "").toLowerCase() === searchLocationDivision.toLowerCase()
        : true;
      return matchesSearch && matchesDiv;
    });

  const filteredMaterialNames = materialNames.filter((m) =>
    m.toLowerCase().includes(searchMaterialQuery.toLowerCase().trim()),
  );

  const filteredCategories = categories
    .map((c, index) => ({
      name: typeof c === "string" ? c : c.name,
      division: typeof c === "string" ? null : c.division,
      actualIndex: index,
    }))
    .filter((c) => {
      const matchesSearch = c.name
        .toLowerCase()
        .includes(searchCategoryQuery.toLowerCase().trim());
      const matchesDiv = searchCategoryDivision
        ? (c.division || "").toLowerCase() === searchCategoryDivision.toLowerCase()
        : true;
      return matchesSearch && matchesDiv;
    });


  const filteredFinishedGoodsNames = finishedGoodsNames.filter((fg) =>
    fg.toLowerCase().includes(searchFinishedGoodsQuery.toLowerCase().trim()),
  );

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
              {/* Form & Template Header */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
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
                </div>

                {/* Add Form */}
                <form onSubmit={handleAddUnit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Enter unit symbol (e.g. BAG, DRUM, PKT)"
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    <span>Add Unit</span>
                  </button>
                </form>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="relative w-full max-w-md">
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
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    Showing {filteredUnits.length} of {units.length}
                  </span>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-6 py-3.5 w-16">#</th>
                        <th className="px-6 py-3.5">Unit Symbol / Name</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredUnits.length > 0 ? (
                        filteredUnits.map((u, idx) => {
                          const isEditing = editingUnit === u;
                          return (
                            <tr
                              key={u}
                              className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors"
                            >
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
                            colSpan="5"
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
                      return (
                        <div key={u} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                              #{idx + 1}
                            </span>
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
              {/* Form & Template Header */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-amber-100/60 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl">
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
                </div>

                {/* Add Form */}
                <form onSubmit={handleAddLocation} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={newLocationFirm}
                    onChange={(e) => setNewLocationFirm(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="">Select Firm / Division...</option>
                    {divisions.map((d) => (
                      <option key={d.id ?? d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Location Code (e.g. WH-A / Rack 5)"
                    className="px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    <span>Add Location</span>
                  </button>
                </form>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:max-w-xl">
                    <div className="relative w-full">
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
                      className="w-full sm:w-56 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-slate-300 focus:outline-amber-500"
                    >
                      <option value="">All Divisions / Firms</option>
                      {divisions.map((d) => (
                        <option key={d.id ?? d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    Showing {filteredLocations.length} of {locations.length}
                  </span>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-6 py-3.5 w-16">#</th>
                        <th className="px-6 py-3.5">Warehouse Location Code</th>
                        <th className="px-6 py-3.5">Division / Firm</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map((l, idx) => {
                          const isEditing = editingLocationIdx === l.actualIndex;
                          return (
                            <tr
                              key={l.location + idx}
                              className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors"
                            >
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
                                      onClick={() => handleDeleteLocation(l.location)}
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
                            colSpan="5"
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
                      return (
                        <div key={l.location + idx} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                              #{idx + 1}
                            </span>
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

          {/* SUB-TAB 3: RAW MATERIAL NAMES */}
          {activeSubTab === "materialNames" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Form & Template Header */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-100/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
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
                </div>

                {/* Add Form */}
                <form onSubmit={handleAddMaterialName} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                    placeholder="Enter Raw Material Name (e.g. Copper Wire 2.5mm)"
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    <span>Add Material Name</span>
                  </button>
                </form>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="relative w-full max-w-md">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search material name..."
                      value={searchMaterialQuery}
                      onChange={(e) => setSearchMaterialQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-indigo-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    Showing {filteredMaterialNames.length} of {materialNames.length}
                  </span>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-6 py-3.5 w-16">#</th>
                        <th className="px-6 py-3.5">Raw Material Name</th>
                        <th className="px-6 py-3.5">Classification</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredMaterialNames.length > 0 ? (
                        filteredMaterialNames.map((n, idx) => {
                          const isEditing = editingMaterial === n;
                          return (
                            <tr
                              key={n}
                              className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors"
                            >
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
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
                                      onClick={() => handleSaveEditMaterial(n)}
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
                                      onClick={() => handleStartEditMaterial(n)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Material Name"
                                    >
                                      <Edit size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMaterialName(n)}
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
                            colSpan="5"
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
                    filteredMaterialNames.map((n, idx) => {
                      const isEditing = editingMaterial === n;
                      return (
                        <div key={n} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
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
                              <input
                                type="text"
                                value={editMaterialValue}
                                onChange={(e) => setEditMaterialValue(e.target.value)}
                                className="flex-1 px-3 py-1.5 border border-indigo-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                autoFocus
                              />
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
                                    onClick={() => handleSaveEditMaterial(n)}
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
                                    onClick={() => handleStartEditMaterial(n)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Material Name"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMaterialName(n)}
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
              {/* Form & Template Header */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-2xl">
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
                </div>

                {/* Add Form */}
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter Category Name (e.g. Electrical & Electronics)"
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-955 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                  <select
                    value={newCategoryFirm}
                    onChange={(e) => setNewCategoryFirm(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-955 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none min-w-[170px]"
                  >
                    <option value="">-- Select Firm / Division --</option>
                    {divisions.map((d) => (
                      <option key={d.id || d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    <span>Add Category</span>
                  </button>
                </form>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search & Filter Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl">
                    <div className="relative flex-1">
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
                      value={searchCategoryDivision}
                      onChange={(e) => setSearchCategoryDivision(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-cyan-500"
                    >
                      <option value="">All Divisions / Firms</option>
                      {divisions.map((d) => (
                        <option key={d.id || d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    Showing {filteredCategories.length} of {categories.length}
                  </span>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-6 py-3.5 w-16">#</th>
                        <th className="px-6 py-3.5">Category Name</th>
                        <th className="px-6 py-3.5">Firm / Division</th>
                        <th className="px-6 py-3.5">Classification</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((c, idx) => {
                          const isEditing = editingCategoryIdx === c.actualIndex;
                          return (
                            <tr
                              key={`${c.name}-${idx}`}
                              className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors"
                            >
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
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
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50/70 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 border border-cyan-200/40">
                                  Item Category
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
                            colSpan="6"
                            className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 font-bold"
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
                      return (
                        <div key={`${c.name}-${idx}`} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                              #{idx + 1}
                            </span>
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
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-cyan-50 border border-cyan-200/60 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800/40 dark:text-cyan-400">
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
                    <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs font-bold">
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
              {/* Form & Template Header */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-violet-100/60 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl">
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
                </div>

                {/* Add Form */}
                <form onSubmit={handleAddFinishedGoodsName} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newFinishedGoodsName}
                    onChange={(e) => setNewFinishedGoodsName(e.target.value)}
                    placeholder="Enter Finished Goods Name (e.g. Gear Assembly GP1)"
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    <span>Add Finished Goods</span>
                  </button>
                </form>
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs space-y-4">
                {/* Search Bar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="relative w-full max-w-md">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search finished goods name..."
                      value={searchFinishedGoodsQuery}
                      onChange={(e) => setSearchFinishedGoodsQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-violet-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    Showing {filteredFinishedGoodsNames.length} of {finishedGoodsNames.length}
                  </span>
                </div>

                {/* Table - Desktop / Tablet View */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-6 py-3.5 w-16">#</th>
                        <th className="px-6 py-3.5">Finished Goods Name</th>
                        <th className="px-6 py-3.5">Classification</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredFinishedGoodsNames.length > 0 ? (
                        filteredFinishedGoodsNames.map((n, idx) => {
                          const isEditing = editingFinishedGoods === n;
                          return (
                            <tr
                              key={n}
                              className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors"
                            >
                              <td className="px-6 py-4 font-mono font-semibold text-gray-400 dark:text-slate-500">
                                {idx + 1}
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
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50/70 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200/40">
                                  Finished Goods
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
                                      onClick={() => handleSaveEditFinishedGoods(n)}
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
                                      onClick={() => handleStartEditFinishedGoods(n)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                      title="Edit Finished Goods Name"
                                    >
                                      <Edit size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFinishedGoodsName(n)}
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
                            colSpan="5"
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
                    filteredFinishedGoodsNames.map((n, idx) => {
                      const isEditing = editingFinishedGoods === n;
                      return (
                        <div key={n} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-500">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50/70 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200/40">
                                Finished Goods
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200/50">
                                <CheckCircle2 size={10} /> ACTIVE
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFinishedGoodsValue}
                                onChange={(e) => setEditFinishedGoodsValue(e.target.value)}
                                className="flex-1 px-3 py-1.5 border border-violet-500 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                                autoFocus
                              />
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
                                    onClick={() => handleSaveEditFinishedGoods(n)}
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
                                    onClick={() => handleStartEditFinishedGoods(n)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                                    title="Edit Finished Goods Name"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFinishedGoodsName(n)}
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
    </div>
  );
}
