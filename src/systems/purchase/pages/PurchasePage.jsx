import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../checklist/components/layout/AdminLayout";
import { PurchaseWorkflowProvider } from "../context/PurchaseWorkflowContext";
import PurchaseDashboardView from "../components/PurchaseDashboardView";
import CreateIndentView from "../components/CreateIndentView";
import DelegateApprovalView from "../components/DelegateApprovalView";
import IndentApprovalView from "../components/IndentApprovalView";
import QuotationView from "../components/QuotationView";
import ApprovedVendorView from "../components/ApprovedVendorView";
import PoEntryView from "../components/PoEntryView";
import PaymentView from "../components/PaymentView";
import FollowUpLiftingView from "../components/FollowUpLiftingView";
import TransporterFollowUpView from "../components/TransporterFollowUpView";
import MaterialReceivedView from "../components/MaterialReceivedView";
import TallyBillingView from "../components/TallyBillingView";
import OrderCancelView from "../components/OrderCancelView";

export default function PurchasePage() {
  const { tabId } = useParams();
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState(tabId || "dashboard");

  useEffect(() => {
    if (tabId) {
      setActiveStage(tabId);
    }
  }, [tabId]);

  const handleStageSelect = (slug) => {
    setActiveStage(slug);
    navigate(`/dashboard/purchase/${slug}`);
  };

  const renderContent = () => {
    switch (activeStage) {
      case "dashboard":
        return <PurchaseDashboardView onNavigateStage={handleStageSelect} />;
      case "create-indent":
      case "indent":
        return <CreateIndentView />;
      case "delegate-approval":
      case "delegate":
        return <DelegateApprovalView />;
      case "indent-approval":
      case "approval":
        return <IndentApprovalView />;
      case "quotation":
      case "rfq":
        return <QuotationView />;
      case "approved-vendor":
      case "vendor-approval":
        return <ApprovedVendorView />;
      case "po-entry":
      case "po":
      case "make-po":
        return <PoEntryView />;
      case "payment":
      case "vendor-payment":
      case "freight-payments":
      case "payments":
        return <PaymentView />;
      case "follow-up-vendor":
      case "follow-up-lifting":
      case "lifting":
      case "follow-up":
        return <FollowUpLiftingView />;
      case "transporter-follow-up":
      case "transporter":
      case "in-transit":
        return <TransporterFollowUpView />;
      case "material-received":
      case "grn":
      case "receipt":
        return <MaterialReceivedView />;
      case "receipt-in-tally":
      case "billing":
      case "tally-billing":
      case "tally":
        return <TallyBillingView />;
      case "order-cancel":
      case "cancel":
      case "cancellation":
        return <OrderCancelView />;
      default:
        return <PurchaseDashboardView onNavigateStage={handleStageSelect} />;
    }
  };

  return (
    <PurchaseWorkflowProvider>
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
          {renderContent()}
        </div>
      </AdminLayout>
    </PurchaseWorkflowProvider>
  );
}
