import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import AdminLayout from "../../checklist/components/layout/AdminLayout";
import {
  PurchaseReturnProvider,
  usePurchaseReturn
} from "../context/PurchaseReturnContext";
import DashboardView from "../components/dashboard/DashboardView";
import ApprovalView from "../components/approval/ApprovalView";
import CreditNoteView from "../components/credit/CreditNoteView";
import LogisticsView from "../components/logistics/LogisticsView";
import DebitNoteView from "../components/debitNote/DebitNoteView";
import PlantReturnView from "../components/plantReturn/PlantReturnView";
import ReturnDetailsView from "../components/details/ReturnDetailsView";
import { Search } from "lucide-react";

function PurchaseReturnInner() {
  const { tabId } = useParams();
  const navigate = useNavigate();

  const {
    records,
    currentUser,
    canView
  } = usePurchaseReturn();

  const [activeTab, setActiveTab] = useState(tabId || "dashboard");
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (tabId) {
      if (tabId === "details") {
        // preserve selectedReturnId if already set
      } else {
        setActiveTab(tabId);
        setSelectedReturnId(null);
      }
    } else {
      setActiveTab("dashboard");
      setSelectedReturnId(null);
    }
  }, [tabId]);

  const handleNavigateTab = (slug) => {
    setActiveTab(slug);
    setSelectedReturnId(null);
    navigate(`/dashboard/purchase-return/${slug}`);
  };

  const handleOpenDetails = (id) => {
    setSelectedReturnId(id);
    setActiveTab("details");
    navigate(`/dashboard/purchase-return/details`);
  };

  const handleGlobalSearch = (e) => {
    if (e.key === "Enter") {
      const q = searchInput.trim().toLowerCase();
      if (!q) return;
      const found = records.find(
        (r) =>
          (r.returnNumber || "").toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q) ||
          r.billNumber.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.poNumber.toLowerCase().includes(q)
      );
      if (found) {
        handleOpenDetails(found.id);
      }
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "Purchase Return Dashboard",
          crumb: "Overview of reverse logistics, financial settlements & history"
        };
      case "approval":
        return {
          title: "Purchase Return Approval",
          crumb: "Stage 01: Verify damaged material and authorize return type"
        };
      case "credit":
      case "credit-note":
        return {
          title: "Ask Party For Credit Note",
          crumb: "Stage 02: Request credit note from vendor prior to dispatch"
        };
      case "logistics":
        return {
          title: "Arrange Logistics",
          crumb: "Stage 03: Coordinate transporter, vehicle and bilty details"
        };
      case "debit-note":
        return {
          title: "Issue Debit Note & Inform",
          crumb: "Stage 04: Issue debit note and notify supplier accounts"
        };
      case "plant-return":
        return {
          title: "Return From Plant",
          crumb: "Stage 05: Confirm physical gate dispatch with loading proof"
        };
      case "details":
        return {
          title: "Return Details & Audit Trail",
          crumb: "End-to-end lifecycle status, timeline & documentation"
        };
      case "settings":
        return {
          title: "Settings & Access Control",
          crumb: "Manage operators and screen permission matrices"
        };
      default:
        return {
          title: "Purchase Return Management",
          crumb: "ReturnTrack reverse-logistics system"
        };
    }
  };

  const pageMeta = getPageTitle();

  const renderContent = () => {
    // Check permission
    const permKey = activeTab === "credit-note" ? "credit" : activeTab;
    if (activeTab !== "details" && !canView(permKey)) {
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Access Denied
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            You do not have permission to view this section under your current role ({currentUser.role}).
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return <DashboardView onOpenDetails={handleOpenDetails} />;
      case "approval":
        return <ApprovalView onOpenDetails={handleOpenDetails} />;
      case "credit":
      case "credit-note":
        return <CreditNoteView onOpenDetails={handleOpenDetails} />;
      case "logistics":
        return <LogisticsView onOpenDetails={handleOpenDetails} />;
      case "debit-note":
        return <DebitNoteView onOpenDetails={handleOpenDetails} />;
      case "plant-return":
        return <PlantReturnView onOpenDetails={handleOpenDetails} />;
      case "details":
        return (
          <ReturnDetailsView
            returnId={selectedReturnId || (records[0] && records[0].id)}
            onBack={() => handleNavigateTab("dashboard")}
          />
        );
      case "settings":
        return <Navigate to="/dashboard/setting?tab=users" replace />;
      default:
        return <DashboardView onOpenDetails={handleOpenDetails} />;
    }
  };

  const userInitials = (currentUser.name || "AD")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{pageMeta.title}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              ReturnTrack
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {pageMeta.crumb}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Return No, PO, Bill... (Press Enter)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleGlobalSearch}
              className="w-64 pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Active Session User Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 shadow-xs">
              {userInitials}
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Stage View */}
      {renderContent()}
    </div>
  );
}

export default function PurchaseReturnPage() {
  return (
    <PurchaseReturnProvider>
      <AdminLayout>
        <PurchaseReturnInner />
      </AdminLayout>
    </PurchaseReturnProvider>
  );
}
