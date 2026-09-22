import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Share2,
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import {
  fetchMasterSalespersons,
  saveMasterSalesperson,
  updateMasterSalesperson,
  deleteMasterSalesperson,
  fetchMasterSources,
  saveMasterSource,
  updateMasterSource,
  deleteMasterSource,
  fetchMasterNobs,
  saveMasterNob,
  updateMasterNob,
  deleteMasterNob
} from "../services/leadApi";

const SUB_TABS = [
  { key: "salesPerson", label: "Sales Person Name", icon: Users },
  { key: "leadSource", label: "Lead Source", icon: Share2 },
  { key: "nob", label: "Nature of Business (NOB)", icon: Briefcase },
];

export default function LeadsMasterSettingsView() {
  const { showToast } = useMagicToast();
  const [activeSubTab, setActiveSubTab] = useState("salesPerson");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [salesPersons, setSalesPersons] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [nobs, setNobs] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [spRes, lsRes, nobRes] = await Promise.all([
        fetchMasterSalespersons(),
        fetchMasterSources(),
        fetchMasterNobs()
      ]);
      setSalesPersons(spRes || []);
      setLeadSources(lsRes || []);
      setNobs(nobRes || []);
    } catch (err) {
      console.error("Error loading leads masters:", err);
      showToast("Failed to load master data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const currentConfig = useMemo(() => {
    switch (activeSubTab) {
      case "salesPerson":
        return {
          title: "Sales Person Name",
          data: salesPersons,
          prefix: "lrn",
          noField: "lrnNo",
          placeholder: "e.g. Rajesh Kumar",
          fetchFn: fetchMasterSalespersons,
          saveFn: saveMasterSalesperson,
          updateFn: updateMasterSalesperson,
          deleteFn: deleteMasterSalesperson,
          setter: setSalesPersons
        };
      case "leadSource":
        return {
          title: "Lead Source",
          data: leadSources,
          prefix: "ls",
          noField: "lsNo",
          placeholder: "e.g. IndiaMART, Website, Referral",
          fetchFn: fetchMasterSources,
          saveFn: saveMasterSource,
          updateFn: updateMasterSource,
          deleteFn: deleteMasterSource,
          setter: setLeadSources
        };
      case "nob":
        return {
          title: "Nature of Business (NOB)",
          data: nobs,
          prefix: "nob",
          noField: "nobNo",
          placeholder: "e.g. Manufacturing, Trading, OEM",
          fetchFn: fetchMasterNobs,
          saveFn: saveMasterNob,
          updateFn: updateMasterNob,
          deleteFn: deleteMasterNob,
          setter: setNobs
        };
      default:
        return {
          title: "",
          data: [],
          prefix: "",
          noField: "",
          placeholder: ""
        };
    }
  }, [activeSubTab, salesPersons, leadSources, nobs]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return currentConfig.data;
    const q = searchQuery.toLowerCase();
    return currentConfig.data.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const code = `${currentConfig.prefix.toUpperCase()}-${String(item.id || "").padStart(3, "0")}`.toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [currentConfig, searchQuery]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setInputValue("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setInputValue(item.name || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await currentConfig.deleteFn(item.id);
        const refreshed = await currentConfig.fetchFn();
        currentConfig.setter(refreshed);
        showToast(`${currentConfig.title} deleted successfully.`, "success");
      } catch (err) {
        console.error("Delete error:", err);
        showToast(`Failed to delete ${currentConfig.title}: ${err.message}`, "error");
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val) {
      showToast("Please enter a valid name/value.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await currentConfig.updateFn(editingItem.id, val, editingItem.sort_order || 0, true);
        showToast(`${currentConfig.title} updated successfully.`, "success");
      } else {
        const sortOrder = (currentConfig.data.length || 0) + 1;
        await currentConfig.saveFn(val, sortOrder);
        showToast(`${currentConfig.title} created successfully.`, "success");
      }

      const refreshed = await currentConfig.fetchFn();
      currentConfig.setter(refreshed);
      setIsModalOpen(false);
      setInputValue("");
      setEditingItem(null);
    } catch (err) {
      console.error("Save error:", err);
      showToast(`Failed to save: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-2 overflow-x-auto pb-px">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          let count = 0;
          if (tab.key === "salesPerson") count = salesPersons.length;
          else if (tab.key === "leadSource") count = leadSources.length;
          else if (tab.key === "nob") count = nobs.length;

          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSubTab(tab.key);
                setSearchQuery("");
              }}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={15} />
            <input
              type="text"
              placeholder={`Search ${currentConfig.title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add {currentConfig.title}</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 w-16 text-center">
                  #
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 w-32">
                  Code / ID
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  {currentConfig.title}
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 w-28 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400 dark:text-slate-500">
                    <Loader2 size={20} className="animate-spin inline mr-2 text-blue-600" />
                    Loading master records...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-gray-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400 font-mono text-[11px]">
                      {`${currentConfig.prefix.toUpperCase()}-${String(item.id || index + 1).padStart(3, "0")}`}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400 dark:text-slate-500">
                    No records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingItem ? `Edit ${currentConfig.title}` : `Add ${currentConfig.title}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {currentConfig.title} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentConfig.placeholder}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingItem ? "Update" : "Save"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
