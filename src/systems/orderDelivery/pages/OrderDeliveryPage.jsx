import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AdminLayout from "../../checklist/components/layout/AdminLayout";
import { initializeStorage } from "../utils/storageManager";

// Direct page imports
import Dashboard from "./Dashboard/Dashboard";
import PurchaseOrder from "./ReceivedOrder/PurchaseOrder";
import CheckAndValidation from "./CheckAndValidation/CheckAndValidation";
import CheckForDelivery from "./CheckForDelivery/CheckForDelivery";
import Production from "./ProductionPlanning/Production";
import DispatchPlanning from "./DispatchPlanning/DispatchPlanning";
import Packaging from "./Packaging/Packaging";
import VehicleLogistic from "./VehicleLogistic/VehicleLogistic";
import MakeCallan from "./MakeCallan/MakeCallan";
import MakeInvoice from "./MakeInvoice/MakeInvoice";
import ConfirmDelivery from "./ConfirmDelivery/ConfirmDelivery";
import Payment from "./Payment/Payment";

const TAB_MAP = {
  dashboard: Dashboard,
  "received-order": PurchaseOrder,
  "purchase-order": PurchaseOrder,
  "check-and-validation": CheckAndValidation,
  "check-for-delivery": CheckForDelivery,
  "production-planning": Production,
  "dispatch-planning": DispatchPlanning,
  packaging: Packaging,
  "vehicle-logistic": VehicleLogistic,
  "make-callan": MakeCallan,
  "make-invoice": MakeInvoice,
  "confirm-delivery": ConfirmDelivery,
  payment: Payment,
};

export default function OrderDeliveryPage() {
  const { tabId } = useParams();

  // Initialize storage once when mounting OrderDelivery system
  useEffect(() => {
    initializeStorage();
  }, []);

  // Fallback to dashboard if invalid or missing tabId
  const activeTab = tabId && TAB_MAP[tabId] ? tabId : "dashboard";
  const ActiveComponent = TAB_MAP[activeTab];

  return (
    <AdminLayout>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="w-full">
        <ActiveComponent key={activeTab} />
      </div>
    </AdminLayout>
  );
}
