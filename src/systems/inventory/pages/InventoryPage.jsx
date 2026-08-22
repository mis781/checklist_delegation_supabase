import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../checklist/components/layout/AdminLayout";
import { fetchInventoryData } from "../../../redux/slice/inventorySlice";

// Icons for sub-tabs
import {
  LayoutDashboard,
  Boxes,
  Database,
  History,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  Settings,
  Sparkles,
  RefreshCw,
  Video,
  ArrowLeftRight,
  UserCheck,
} from "lucide-react";

// Import sub-views
import DashboardView from "../components/DashboardView";
import StockDashboardView from "../components/StockDashboardView";
// import MasterDataView from '../components/MasterDataView';
import TransactionsView from "../components/TransactionsView";
import ReorderView from "../components/ReorderView";
import IndentView from "../components/IndentView";
import TransferRequestView from "../components/TransferRequestView";
import TransferApprovalView from "../components/TransferApprovalView";
import SettingsView from "../components/SettingsView";
import InventoryTrainingVideoView from "../components/InventoryTrainingVideoView";

const PAGE_META = {
  dashboard: { title: "Dashboard", icon: LayoutDashboard },
  stock: { title: "IMS", icon: Boxes },
  // master: { title: 'Master Data', icon: Database },
  transactions: { title: "Stock Transactions", icon: History },
  reorder: { title: "Reorder Management", icon: AlertTriangle },
  indent: { title: "Indent Management", icon: ClipboardList },
  "transfer-request": { title: "Transfer Request", icon: ArrowLeftRight },
  "transfer-approval": { title: "Approve Transfer", icon: UserCheck },
  video: { title: "Training Video", icon: Video },
  settings: { title: "Master", icon: Settings },
};

export default function InventoryPage() {
  const dispatch = useDispatch();
  const {
    loading,
    error,
    materials,
    transactions,
    indents = [],
  } = useSelector((state) => state.inventory);

  const { tabId } = useParams();
  const navigate = useNavigate();
  const activeTab = tabId || "dashboard";

  const setActiveTab = (newTabId) => {
    navigate(`/dashboard/inventory/${newTabId}`);
  };

  const [userStateSeq, setUserStateSeq] = useState(0); // Sequence to force reload credentials

  // Load database values on component mount
  useEffect(() => {
    dispatch(fetchInventoryData());
  }, [dispatch]);

  // Derived user credentials from simulation switches
  const activeUser = useMemo(() => {
    const realName = localStorage.getItem("user-name") || "Guest User";
    const realRole = localStorage.getItem("role") || "user";

    // Simulated overrides
    const simRole = localStorage.getItem("sp_simulated_role") || realRole;
    const simDept = localStorage.getItem("sp_simulated_dept") || "General";
    const simLoc = localStorage.getItem("sp_simulated_loc") || "";

    // Standardize role display: Capitalize first letter if lowercase
    const formattedRole =
      simRole.charAt(0).toUpperCase() + simRole.slice(1).toLowerCase();

    return {
      name: realName,
      role: formattedRole,
      department: simDept,
      location: simLoc,
      isSimulated: !!(
        localStorage.getItem("sp_simulated_role") ||
        localStorage.getItem("sp_simulated_dept") ||
        localStorage.getItem("sp_simulated_loc")
      ),
    };
  }, [userStateSeq]);

  // Filter visible tabs based on role page restriction and page_access
  const visibleTabs = useMemo(() => {
    const role = activeUser.role;
    const realRole = localStorage.getItem("role") || "user";
    const formattedRealRole =
      realRole.charAt(0).toUpperCase() + realRole.slice(1).toLowerCase();
    const rawPageAccess = localStorage.getItem("page_access") || "";

    const isAdmin =
      role === "Admin" ||
      role === "Superadmin" ||
      formattedRealRole === "Admin" ||
      formattedRealRole === "Superadmin" ||
      rawPageAccess === "all";

    const allowedPages =
      rawPageAccess && rawPageAccess !== "all"
        ? rawPageAccess.split(",").map((p) => p.trim())
        : [];

    return Object.keys(PAGE_META).filter((tabId) => {
      if (isAdmin) return true;
      if (tabId === "settings") return false;

      // If explicit page_access permissions set for user, verify inventory_<tabId>
      if (rawPageAccess && rawPageAccess !== "all" && allowedPages.length > 0) {
        return allowedPages.includes(`inventory_${tabId}`);
      }

      return true;
    });
  }, [activeUser]);

  // If active tab becomes hidden after role change, fallback to dashboard
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [visibleTabs, activeTab]);

  const handleReloadCredentials = () => {
    setUserStateSeq((prev) => prev + 1);
  };

  // Reorder warnings badge count
  const reorderBadgeCount = useMemo(() => {
    // 1. Calculate stock balances per SKU
    const matClosing = {};
    materials.forEach((m) => {
      matClosing[m.sku] = Number(m.opening) || 0;
    });

    transactions.forEach((t) => {
      if (matClosing[t.sku] !== undefined) {
        if (t.type === "IN") {
          matClosing[t.sku] += Number(t.qty) || 0;
        } else {
          matClosing[t.sku] -= Number(t.qty) || 0;
        }
      }
    });

    let count = 0;
    materials.forEach((m) => {
      const hasPendingIndent = indents.some(
        (i) =>
          i.sku === m.sku &&
          (i.status === "Pending" || i.status === "Approved"),
      );
      if (hasPendingIndent) return;

      const closingStock = matClosing[m.sku] || 0;
      const safetyStock = (Number(m.adc) || 0) * (Number(m.safetyFactor) || 0);
      const reorderLevel =
        (Number(m.adc) || 0) * (Number(m.leadTime) || 0) + safetyStock;

      if (m.status === "Active" && closingStock <= reorderLevel) {
        // If location filter applies, check matching location
        if (!activeUser.location || m.location === activeUser.location) {
          count++;
        }
      }
    });
    return count;
  }, [materials, transactions, indents, activeUser.location]);

  return (
    <AdminLayout>
      <div className="w-full p-4 md:p-6 space-y-6 theme-transition">
        {/* Module Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-650/10 dark:bg-indigo-500/20 text-indigo-750 dark:text-indigo-400 rounded-2xl shadow-xs">
              <Boxes size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  Inventory Management{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    IMS
                  </span>
                </h1>
                {activeUser.isSimulated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 rounded-md text-[10px] font-black uppercase tracking-wider">
                    <Sparkles size={8} />
                    Simulated
                  </span>
                )}
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold">
                Enterprise Inventory Tracking &amp; Reorder Management System
              </p>
            </div>
          </div>

          {/* Active Credentials profile tag removed per request */}
        </div>

        {/* Inner Content - Full Width */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-20 text-center space-y-3 shadow-sm">
              <RefreshCw
                size={32}
                className="animate-spin text-indigo-500 mx-auto"
              />
              <p className="text-sm font-bold text-gray-500">
                Loading IMS data stream...
              </p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900 text-rose-700 dark:text-rose-350 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-black mb-2">IMS Loading Failure</h3>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            /* Component rendering block */
            <div className="animate-fade-in">
              {activeTab === "dashboard" && (
                <DashboardView
                  activeUser={activeUser}
                  onTabChange={setActiveTab}
                />
              )}
              {activeTab === "stock" && (
                <StockDashboardView activeUser={activeUser} />
              )}
              {activeTab === "transactions" && (
                <TransactionsView activeUser={activeUser} />
              )}
              {activeTab === "reorder" && (
                <ReorderView
                  activeUser={activeUser}
                  onTabChange={setActiveTab}
                />
              )}
              {activeTab === "indent" && <IndentView activeUser={activeUser} />}
              {activeTab === "transfer-request" && (
                <TransferRequestView activeUser={activeUser} onNavigate={setActiveTab} />
              )}
              {activeTab === "transfer-approval" && (
                <TransferApprovalView activeUser={activeUser} />
              )}
              {activeTab === "video" && (
                <InventoryTrainingVideoView activeUser={activeUser} />
              )}
              {activeTab === "settings" && (
                <SettingsView
                  activeUser={activeUser}
                  onReloadUser={handleReloadCredentials}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
