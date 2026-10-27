import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../checklist/components/layout/AdminLayout";
import { OrderReturnProvider, useOrderReturn } from "../context/OrderReturnContext";
import OrderReturnDashboard from "../components/OrderReturnDashboard";
import OrderReturnStageView from "../components/OrderReturnStageView";
import NewReturnDrawer from "../components/NewReturnDrawer";
import StageActionDrawer from "../components/StageActionDrawer";
import OrderReturnDetailsDrawer from "../components/OrderReturnDetailsDrawer";
import {
  RotateCcw,
  Search,
  RotateCw,
  ChevronRight
} from "lucide-react";
import { cust } from "../constants/orderReturnData";

function OrderReturnPageInner() {
  const { tabId } = useParams();
  const navigate = useNavigate();

  const {
    returns,
    searchQuery,
    setSearchQuery,
    resetDemoData
  } = useOrderReturn();

  // Tab mapping
  // "dashboard", "request" (stage 1), "approval" (stage 2), "debit-note" (stage 3),
  // "vehicle" (stage 4), "receipt-qc" (stage 5), "credit-note" (stage 6), "flow", "stock"
  const currentTab = tabId || "dashboard";

  // Modal / Drawer states
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);

  const [activeStageAction, setActiveStageAction] = useState({
    open: false,
    returnId: null,
    stageNum: 1
  });

  const [activeDetailsDrawer, setActiveDetailsDrawer] = useState({
    open: false,
    returnId: null
  });

  const [searchFocused, setSearchFocused] = useState(false);

  // Search results
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return returns
      .filter((r) => {
        const cObj = cust(r.customerId || r.customer_id);
        const matchNo = (r.no || "").toLowerCase().includes(q);
        const matchCust = cObj.name.toLowerCase().includes(q);
        const matchInv = (r.items || []).some((i) => i.invoiceNo.toLowerCase().includes(q));
        const matchProd = (r.items || []).some((i) =>
          (i.product_name || i.productId || "").toLowerCase().includes(q)
        );
        return matchNo || matchCust || matchInv || matchProd;
      })
      .slice(0, 6);
  }, [returns, searchQuery]);

  const handleNavigateStage = (stageNum) => {
    const slugs = {
      1: "request",
      2: "approval",
      3: "debit-note",
      4: "vehicle",
      5: "receipt-qc",
      6: "credit-note"
    };
    navigate(`/dashboard/order-return/${slugs[stageNum] || "dashboard"}`);
  };

  const handleOpenNewRequest = (existingDraft = null) => {
    setEditingDraft(existingDraft);
    setIsNewReturnOpen(true);
  };

  const handleOpenStageAction = (returnId, stageNum) => {
    setActiveStageAction({
      open: true,
      returnId,
      stageNum
    });
  };

  const handleOpenDetails = (returnId) => {
    setActiveDetailsDrawer({
      open: true,
      returnId
    });
  };

  const getStageNumFromTab = (tab) => {
    switch (tab) {
      case "request":
        return 1;
      case "approval":
        return 2;
      case "debit-note":
      case "debit":
        return 3;
      case "vehicle":
      case "transport":
        return 4;
      case "receipt-qc":
      case "receipt":
        return 5;
      case "credit-note":
      case "credit":
        return 6;
      default:
        return null;
    }
  };

  const stageNum = getStageNumFromTab(currentTab);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Order Management</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-slate-100 font-bold">Order Return System</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Order Return (Customer Returns)</span>
          </h1>
        </div>

        {/* Global Search & Role Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs w-64 shadow-2xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search return no, customer, item..."
                className="w-full bg-transparent border-none focus:outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs"
              />
            </div>

            {/* Search Dropdown Results */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                {searchResults.map((sr) => (
                  <div
                    key={sr.id}
                    onMouseDown={() => handleOpenDetails(sr.id)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold font-mono text-slate-900 dark:text-slate-100 block">
                        {sr.no}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate block max-w-[180px]">
                        {cust(sr.customerId || sr.customer_id).name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {sr.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Refresh Data button */}
          <button
            onClick={() => {
              resetDemoData();
            }}
            title="Refresh order return data from server"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Rendering */}
      {currentTab === "dashboard" && (
        <OrderReturnDashboard
          onNavigateStage={handleNavigateStage}
          onOpenDetails={handleOpenDetails}
        />
      )}

      {stageNum !== null && (
        <OrderReturnStageView
          stageNum={stageNum}
          onOpenNewRequest={() => handleOpenNewRequest(null)}
          onOpenStageAction={handleOpenStageAction}
          onOpenDetails={handleOpenDetails}
        />
      )}




      {/* Drawers and Modals */}
      <NewReturnDrawer
        open={isNewReturnOpen}
        existingReturn={editingDraft}
        onClose={() => {
          setIsNewReturnOpen(false);
          setEditingDraft(null);
        }}
      />

      <StageActionDrawer
        open={activeStageAction.open}
        returnId={activeStageAction.returnId}
        stageNum={activeStageAction.stageNum}
        onClose={() =>
          setActiveStageAction({
            open: false,
            returnId: null,
            stageNum: 1
          })
        }
      />

      <OrderReturnDetailsDrawer
        open={activeDetailsDrawer.open}
        returnId={activeDetailsDrawer.returnId}
        onClose={() =>
          setActiveDetailsDrawer({
            open: false,
            returnId: null
          })
        }
      />
    </div>
  );
}

export default function OrderReturnPage() {
  return (
    <OrderReturnProvider>
      <AdminLayout>
        <OrderReturnPageInner />
      </AdminLayout>
    </OrderReturnProvider>
  );
}
