import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Share2,
  Briefcase,
  CalendarClock,
  Wallet,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  RotateCcw
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import {
  getLeadReceiverNames,
  saveLeadReceiverNames,
  getLeadSources,
  saveLeadSources,
  getNOBs,
  saveNOBs,
  getCreditDays,
  saveCreditDays,
  getCreditLimits,
  saveCreditLimits
} from "../utils/storageManager";

const SUB_TABS = [
  { key: "salesPerson", label: "Sales Person Name", icon: Users },
  { key: "leadSource", label: "Lead Source", icon: Share2 },
  { key: "nob", label: "Nature of Business (NOB)", icon: Briefcase },
  { key: "creditDays", label: "Credit Days", icon: CalendarClock },
  { key: "creditLimit", label: "Credit Limit", icon: Wallet },
];

export default function LeadsMasterSettingsView() {
  const { showToast } = useMagicToast();
  const [activeSubTab, setActiveSubTab] = useState("salesPerson");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [salesPersons, setSalesPersons] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [nobs, setNobs] = useState([]);
  const [creditDays, setCreditDays] = useState([]);
  const [creditLimits, setCreditLimits] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const loadAllData = () => {
    setSalesPersons(getLeadReceiverNames());
    setLeadSources(getLeadSources());
    setNobs(getNOBs());
    setCreditDays(getCreditDays());
    setCreditLimits(getCreditLimits());
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
          save: (list) => {
            saveLeadReceiverNames(list);
            setSalesPersons(list);
          },
          prefix: "lrn",
          noField: "lrnNo",
          placeholder: "e.g. Rajesh Kumar"
        };
      case "leadSource":
        return {
          title: "Lead Source",
          data: leadSources,
          save: (list) => {
            saveLeadSources(list);
            setLeadSources(list);
          },
          prefix: "ls",
          noField: "lsNo",
          placeholder: "e.g. IndiaMART, Website, Referral"
        };
      case "nob":
        return {
          title: "Nature of Business (NOB)",
          data: nobs,
          save: (list) => {
            saveNOBs(list);
            setNobs(list);
          },
          prefix: "nob",
          noField: "nobNo",
          placeholder: "e.g. Manufacturing, Trading, OEM"
        };
      case "creditDays":
        return {
          title: "Credit Days",
          data: creditDays,
          save: (list) => {
            saveCreditDays(list);
            setCreditDays(list);
          },
          prefix: "cd",
          noField: "cdNo",
          placeholder: "e.g. 15 Days, 30 Days"
        };
      case "creditLimit":
        return {
          title: "Credit Limit",
          data: creditLimits,
          save: (list) => {
            saveCreditLimits(list);
            setCreditLimits(list);
          },
          prefix: "cl",
          noField: "clNo",
          placeholder: "e.g. 50,000, 1,00,000"
        };
      default:
        return {
          title: "",
          data: [],
          save: () => {},
          prefix: "",
          noField: "",
          placeholder: ""
        };
    }
  }, [activeSubTab, salesPersons, leadSources, nobs, creditDays, creditLimits]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return currentConfig.data;
    const q = searchQuery.toLowerCase();
    return currentConfig.data.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const code = (item[currentConfig.noField] || "").toLowerCase();
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

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      const updated = currentConfig.data.filter((i) => i.id !== item.id);
      currentConfig.save(updated);
      showToast(`${currentConfig.title} deleted successfully.`, "success");
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val) {
      showToast("Please enter a valid name/value.", "error");
      return;
    }

    if (editingItem) {
      const updated = currentConfig.data.map((item) =>
        item.id === editingItem.id ? { ...item, name: val } : item
      );
      currentConfig.save(updated);
      showToast(`${currentConfig.title} updated successfully.`, "success");
    } else {
      const count = currentConfig.data.length + 1;
      const newItem = {
        id: `custom-${currentConfig.prefix}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        [currentConfig.noField]: `${currentConfig.prefix.toUpperCase()}-${String(count).padStart(3, "0")}`,
        name: val
      };
      currentConfig.save([...currentConfig.data, newItem]);
      showToast(`${currentConfig.title} created successfully.`, "success");
    }

    setIsModalOpen(false);
    setInputValue("");
    setEditingItem(null);
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
          else if (tab.key === "creditDays") count = creditDays.length;
          else if (tab.key === "creditLimit") count = creditLimits.length;

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
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-gray-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400 font-mono text-[11px]">
                      {item[currentConfig.noField] || `ID-${index + 1}`}
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
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {editingItem ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
