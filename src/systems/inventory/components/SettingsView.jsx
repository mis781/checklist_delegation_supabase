// src/systems/inventory/components/SettingsView.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Save,
  Plus,
  Trash2,
  Lock,
  Settings,
  MapPin,
  Scale,
  Boxes,
} from "lucide-react";
import {
  saveSettings,
  saveList,
  saveUsers,
} from "../../../redux/slice/inventorySlice";

const ALL_PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "stock", label: "IMS" },
  { id: "master", label: "Master Data" },
  { id: "transactions", label: "Stock Transactions" },
  { id: "reorder", label: "Reorder Management" },
  { id: "indent", label: "Indent Management" },
  { id: "settings", label: "Master" },
];

const DUMMY_UNITS = ["KG", "PCS", "MTR", "LTR", "BOX", "TON", "SET", "ROLL"];
const DUMMY_LOCATIONS = [
  "WH-A / Rack 1",
  "WH-A / Rack 2",
  "WH-A / Rack 4",
  "WH-A / Rack 7",
  "WH-A / Rack 9",
  "WH-B / Rack 2",
  "WH-B / Rack 5",
  "WH-C / Rack 1",
  "WH-C / Rack 2",
  "WH-D / Rack 1",
];
const DUMMY_MATERIAL_NAMES = [
  "Steel Rod 12mm",
  "Copper Wire 2.5mm",
  "Plastic Granules PP",
  "Packaging Carton (L)",
  "Industrial Bearings 6204",
  "Lubricant Oil 20L",
  "Stainless Sheet 2mm",
  "Cardboard Box (S)",
  "Hydraulic Hose 1in",
  "LED Driver 24V",
];
const DUMMY_FINISHED_GOODS_NAMES = [
  "Finished Goods A",
  "Finished Goods B",
  "Gear Assembly GP1",
  "Finished Cable 5m",
  "Finished Motor 12V",
  "Assembled LED Panel",
  "Control Box C1",
];

export default function SettingsView({ activeUser, onReloadUser }) {
  const dispatch = useDispatch();
  const {
    settings,
    units,
    locations,
    divisions = [],
    users,
    materialNames = [],
    finishedGoodsNames = [],
  } = useSelector((state) => state.inventory);

  const isSuperAdmin = activeUser.role === "Superadmin";
  const isAdminOrSuper =
    activeUser.role === "Admin" || activeUser.role === "Superadmin";

  // State for units, locations, and material names
  const [newUnit, setNewUnit] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newLocationFirm, setNewLocationFirm] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newFinishedGoodsName, setNewFinishedGoodsName] = useState("");

  // User management form state
  const [userEditIdx, setUserEditIdx] = useState(-1);
  const [formUserName, setFormUserName] = useState("");
  const [formUserPass, setFormUserPass] = useState("");
  const [formUserRole, setFormUserRole] = useState("Manager");
  const [formUserDept, setFormUserDept] = useState("");
  const [formUserLoc, setFormUserLoc] = useState("");
  const [formUserPages, setFormUserPages] = useState("all");

  // Add unit
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

  // Delete unit
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
    }
  };

  // Add location (scoped to the selected Firm)
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

  // Delete location
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
    }
  };

  // Add material name
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

  // Delete material name
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
    }
  };

  // Add finished goods name
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

  // Delete finished goods name
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
    }
  };

  // User list management
  const handleSaveUser = () => {
    if (!formUserName || !formUserPass) {
      alert("Name and password are required.");
      return;
    }
    const newUser = {
      name: formUserName.trim(),
      password: formUserPass,
      role: formUserRole,
      department: formUserDept.trim() || "General",
      location: formUserLoc,
      pages: formUserPages,
    };

    const copy = [...users];
    if (userEditIdx >= 0) {
      copy[userEditIdx] = newUser;
      alert(`User ${newUser.name} specifications updated.`);
    } else {
      if (
        users.some((u) => u.name.toLowerCase() === newUser.name.toLowerCase())
      ) {
        alert("User name already exists.");
        return;
      }
      copy.push(newUser);
      alert(`User ${newUser.name} created successfully.`);
    }

    dispatch(saveUsers({ users: copy, currentUser: activeUser.name }));
    handleClearUserForm();
  };

  const handleClearUserForm = () => {
    setUserEditIdx(-1);
    setFormUserName("");
    setFormUserPass("");
    setFormUserRole("Manager");
    setFormUserDept("");
    setFormUserLoc("");
    setFormUserPages("all");
  };

  const handleEditUser = (idx) => {
    const u = users[idx];
    setUserEditIdx(idx);
    setFormUserName(u.name);
    setFormUserPass(u.password || "");
    setFormUserRole(u.role || "Manager");
    setFormUserDept(u.department || "");
    setFormUserLoc(u.location || "");
    setFormUserPages(u.pages || "all");
  };

  const handleDeleteUser = (idx) => {
    if (window.confirm(`Delete user "${users[idx].name}"?`)) {
      const copy = users.filter((_, i) => i !== idx);
      dispatch(saveUsers({ users: copy, currentUser: activeUser.name }));
    }
  };

  const handlePageAccessToggle = (pageId) => {
    if (formUserPages === "all") {
      setFormUserPages([pageId]);
    } else {
      const current = [...formUserPages];
      if (current.includes(pageId)) {
        const next = current.filter((p) => p !== pageId);
        setFormUserPages(next.length === 0 ? "all" : next);
      } else {
        setFormUserPages([...current, pageId]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings blocks - locked for non-admins */}
      {!isAdminOrSuper ? (
        <div className="bg-gray-50 dark:bg-slate-950/40 border border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-8 text-center text-gray-400">
          <Lock size={28} className="mx-auto mb-2 opacity-50 text-indigo-500" />
          <span>
            Table Pagination and Custom Lists are restricted to Admin /
            Superadmin.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3. Manage Units */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Scale size={18} className="text-emerald-500" />
              Manage Unit of Measurement (UoM)
            </h3>
            <form onSubmit={handleAddUnit} className="flex flex-col gap-2.5 w-full">
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="e.g. BAG, DRUM"
                className="w-full px-3 py-2 border border-gray-250 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                Add Unit
              </button>
            </form>

            {/* Clickable Dummy Data Suggestions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-gray-450 dark:text-slate-500 uppercase tracking-wider">
                Example Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DUMMY_UNITS.map((du) => {
                  const exists = units.includes(du);
                  return (
                    <button
                      key={du}
                      type="button"
                      onClick={() => handleQuickAddUnit(du)}
                      disabled={exists}
                      className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer active:scale-95 transition-all duration-150 ${
                        exists
                          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-950/20 dark:border-slate-850 dark:text-slate-650 opacity-60"
                          : "bg-white border-dashed border-gray-350 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 text-gray-600 dark:bg-slate-950 dark:border-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/45 dark:hover:text-emerald-400 dark:text-slate-400"
                      }`}
                    >
                      + {du}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {units.map((u) => (
                <span
                  key={u}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 dark:bg-slate-950 dark:border-slate-800 dark:text-indigo-400"
                >
                  {u}
                  <button
                    type="button"
                    onClick={() => handleDeleteUnit(u)}
                    className="text-gray-400 hover:text-rose-600 text-[10px] font-black ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>{" "}
          {/* 4. Manage Locations */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin size={18} className="text-amber-500" />
              Manage Warehouse Storage Locations
            </h3>            <form onSubmit={handleAddLocation} className="flex flex-col gap-2.5 w-full">
              <select
                value={newLocationFirm}
                onChange={(e) => setNewLocationFirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-250 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white cursor-pointer focus:ring-2 focus:ring-amber-500 outline-hidden"
              >
                <option value="">Select firm...</option>
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
                placeholder="e.g. WH-E / Rack 3"
                className="w-full px-3 py-2 border border-gray-250 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                Add Location
              </button>
            </form>

            {/* Clickable Dummy Data Suggestions */}
            {newLocationFirm && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-gray-450 dark:text-slate-500 uppercase tracking-wider">
                  Example Templates (added under {newLocationFirm}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DUMMY_LOCATIONS.map((dl) => {
                    const exists = locations.some((l) => l.location === dl);
                    return (
                      <button
                        key={dl}
                        type="button"
                        onClick={() => handleQuickAddLocation(dl)}
                        disabled={exists}
                        className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer active:scale-95 transition-all duration-150 ${
                          exists
                            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-950/20 dark:border-slate-850 dark:text-slate-650 opacity-60"
                            : "bg-white border-dashed border-gray-350 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 text-gray-600 dark:bg-slate-950 dark:border-slate-800 dark:hover:border-amber-500 dark:hover:bg-amber-950/45 dark:hover:text-amber-400 dark:text-slate-400"
                        }`}
                      >
                        + {dl}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {locations.map((l) => (
                <span
                  key={l.location}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 border border-blue-150 text-blue-750 dark:bg-slate-955 dark:border-slate-800 dark:text-blue-400"
                >
                  {l.location}
                  {l.division && (
                    <span className="text-[10px] font-semibold text-blue-450 dark:text-blue-500">
                      ({l.division})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(l.location)}
                    className="text-gray-400 hover:text-rose-600 text-[10px] font-black ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
          {/* 5. Manage Material Names */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Boxes size={18} className="text-indigo-500" />
              Raw Material Names
            </h3>
            <form onSubmit={handleAddMaterialName} className="flex flex-col gap-2.5 w-full">
              <input
                type="text"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="e.g. Stainless Sheet 5mm"
                className="w-full px-3 py-2 border border-gray-250 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                Add Name
              </button>
            </form>

            {/* Clickable Dummy Data Suggestions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-gray-450 dark:text-slate-500 uppercase tracking-wider">
                Example Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DUMMY_MATERIAL_NAMES.map((dmn) => {
                  const exists = materialNames.includes(dmn);
                  return (
                    <button
                      key={dmn}
                      type="button"
                      onClick={() => handleQuickAddMaterialName(dmn)}
                      disabled={exists}
                      className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer active:scale-95 transition-all duration-150 ${
                        exists
                          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-950/20 dark:border-slate-850 dark:text-slate-650 opacity-60"
                          : "bg-white border-dashed border-gray-350 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 dark:bg-slate-955 dark:border-slate-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/45 dark:hover:text-indigo-400 dark:text-slate-400"
                      }`}
                    >
                      + {dmn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {materialNames.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 border border-blue-150 text-blue-700 dark:bg-slate-955 dark:border-slate-800 dark:text-blue-400"
                >
                  {n}
                  <button
                    type="button"
                    onClick={() => handleDeleteMaterialName(n)}
                    className="text-gray-400 hover:text-rose-600 text-[10px] font-black ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 6. Manage Finished Goods Names */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Boxes size={18} className="text-violet-500" />
              Finished Goods Names
            </h3>
            <form onSubmit={handleAddFinishedGoodsName} className="flex flex-col gap-2.5 w-full">
              <input
                type="text"
                value={newFinishedGoodsName}
                onChange={(e) => setNewFinishedGoodsName(e.target.value)}
                placeholder="e.g. Finished Goods A"
                className="w-full px-3 py-2 border border-gray-250 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-955 text-sm text-gray-955 dark:text-white focus:ring-2 focus:ring-violet-500 outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                Add Name
              </button>
            </form>

            {/* Clickable Dummy Data Suggestions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-gray-450 dark:text-slate-500 uppercase tracking-wider">
                Example Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DUMMY_FINISHED_GOODS_NAMES.map((fgn) => {
                  const exists = finishedGoodsNames.includes(fgn);
                  return (
                    <button
                      key={fgn}
                      type="button"
                      onClick={() => handleQuickAddFinishedGoodsName(fgn)}
                      disabled={exists}
                      className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer active:scale-95 transition-all duration-150 ${
                        exists
                          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-955 dark:border-slate-850 dark:text-slate-650 opacity-60"
                          : "bg-white border-dashed border-gray-350 hover:border-violet-500 hover:bg-violet-50 hover:text-violet-600 text-gray-600 dark:bg-slate-955 dark:border-slate-800 dark:hover:border-violet-500 dark:hover:bg-violet-950/45 dark:hover:text-violet-400 dark:text-slate-400"
                      }`}
                    >
                      + {fgn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {finishedGoodsNames.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-50 border border-violet-150 text-violet-750 dark:bg-slate-955 dark:border-slate-800 dark:text-violet-400"
                >
                  {n}
                  <button
                    type="button"
                    onClick={() => handleDeleteFinishedGoodsName(n)}
                    className="text-gray-400 hover:text-rose-600 text-[10px] font-black ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
