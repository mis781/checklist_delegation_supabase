import { isAdministrator } from "../../../utils/roleUtils";
import { getReadablePageIds } from "../../../utils/pagePermissionUtils";

export const SYSTEM_LIST = [
  {
    key: "portal",
    name: "Portal Dashboard",
    prefix: "portal",
    stages: [
      { id: "portal_dashboard", name: "Portal Overview / Home" },
    ],
    // Portal is accessible to all logged-in users by default
    isAlwaysAccessible: true,
  },
  {
    key: "pc",
    name: "PC Dashboard",
    prefix: "pc",
    stages: [
      { id: "pc_dashboard", name: "PC Overview" },
    ],
  },
  {
    key: "checklist",
    name: "Checklist & Delegation",
    prefix: "checklist",
    stages: [
      { id: "checklist_dashboard", name: "Checklist Dashboard" },
      { id: "checklist_notifications", name: "Notifications" },
      { id: "checklist_quick_task", name: "Task Management / Quick Task" },
      { id: "checklist_assign_task", name: "Assign Task" },
      { id: "checklist_delegation", name: "Delegation Tracker" },
      { id: "checklist_task", name: "All Tasks List" },
      { id: "checklist_calendar", name: "Calendar" },
      { id: "checklist_holiday", name: "Holiday List" },
      { id: "checklist_working_day", name: "Working Day Calendar" },
      { id: "checklist_approval", name: "Admin Approval" },
      { id: "checklist_video", name: "Training Video" },
      { id: "checklist_settings", name: "Checklist Settings" },
    ],
  },
  {
    key: "inventory",
    name: "Inventory System",
    prefix: "inventory",
    stages: [
      { id: "inventory_dashboard", name: "IMS Dashboard" },
      { id: "inventory_stock", name: "Stock / IMS" },
      { id: "inventory_physical_stock", name: "Physical Stock" },
      { id: "inventory_master", name: "Master Data" },
      { id: "inventory_transactions", name: "Stock Transactions" },
      { id: "inventory_reorder", name: "Reorder Management" },
      { id: "inventory_indent", name: "Indent Management" },
      { id: "inventory_transfer_request", name: "Transfer Request" },
      { id: "inventory_transfer_approval", name: "Approve Transfer" },
      { id: "inventory_video", name: "Training Video" },
      { id: "inventory_settings", name: "Inventory Master / Settings" },
    ],
  },
  {
    key: "purchase",
    name: "Purchase System",
    prefix: "purchase",
    stages: [
      { id: "purchase_dashboard", name: "Purchase Overview" },
      { id: "purchase_indent", name: "Create Indent" },
      { id: "purchase_delegate", name: "Delegate Approvers" },
      { id: "purchase_approval", name: "Indent Approval" },
      { id: "purchase_quotation", name: "Quotations" },
      { id: "purchase_approved_vendor", name: "Approved Vendor" },
      { id: "purchase_po", name: "Make PO" },
      { id: "purchase_payment", name: "Payment" },
      { id: "purchase_lifting", name: "Follow-up / Lifting" },
      { id: "purchase_transporter", name: "Transporter Follow-Up" },
      { id: "purchase_grn", name: "Material Received (GRN)" },
      { id: "purchase_tally", name: "Tally Billing" },
      { id: "purchase_cancel", name: "Order Cancel" },
      { id: "purchase_video", name: "Training Video" },
    ],
  },
  {
    key: "purchase_return",
    name: "Purchase Return (ReturnTrack)",
    prefix: "purchase_return",
    stages: [
      { id: "purchase_return_dashboard", name: "ReturnTrack Dashboard" },
      { id: "purchase_return_approval", name: "Return Approval" },
      { id: "purchase_return_credit", name: "Credit Note" },
      { id: "purchase_return_logistics", name: "Arrange Logistics" },
      { id: "purchase_return_debit_note", name: "Debit Note" },
      { id: "purchase_return_plant_return", name: "Return From Plant" },
      { id: "purchase_return_video", name: "Training Video" },
    ],
  },
  {
    key: "leads",
    name: "Leads System",
    prefix: "leads",
    stages: [
      { id: "leads_dashboard", name: "Leads Dashboard" },
      { id: "leads_new_lead", name: "New Lead Entry" },
      { id: "leads_followup_tracker", name: "Followup Tracker" },
      { id: "leads_request_quotation", name: "Request Quotation" },
      { id: "leads_pending_quotation", name: "Pending Quotation" },
      { id: "leads_quotation_approval", name: "Quotation Approval" },
      { id: "leads_quotation_tracker", name: "Quotation Tracker" },
      { id: "leads_contacts", name: "Contacts Directory" },
      { id: "leads_calendar", name: "Leads Calendar" },
      { id: "settings_leads", name: "Leads Master Tab" },
    ],
  },
  {
    key: "order_delivery",
    name: "Order Management (O2D)",
    prefix: "o2d",
    stages: [
      { id: "o2d_dashboard", name: "O2D Overview" },
      { id: "o2d_purchase_order", name: "Received Order" },
      { id: "o2d_check_validation", name: "Check & Validation" },
      { id: "o2d_check_delivery", name: "Stock Verification" },
      { id: "o2d_production", name: "Production Planning" },
      { id: "o2d_dispatch", name: "Dispatch Planning" },
      { id: "o2d_packaging", name: "Packaging" },
      { id: "o2d_logistic", name: "Vehicle Logistic" },
      { id: "o2d_callan", name: "Make Challan" },
      { id: "o2d_invoice", name: "Make Invoice" },
      { id: "o2d_confirm_delivery", name: "Confirm Delivery" },
      { id: "o2d_payment", name: "Payments" },
      { id: "o2d_video", name: "Training Video" },
    ],
  },
  {
    key: "docs",
    name: "Docs & Subscriptions",
    prefix: "docs",
    stages: [
      { id: "docs_dashboard", name: "Docs Dashboard" },
      { id: "docs_resources", name: "Resource Manager" },
      { id: "docs_all", name: "All Documents" },
      { id: "docs_renewal", name: "Document Renewal" },
      { id: "docs_shared", name: "Shared Documents" },
      { id: "docs_sub_all", name: "All Subscriptions" },
      { id: "docs_sub_approval", name: "Subscription Approval" },
      { id: "docs_sub_payment", name: "Subscription Payment" },
      { id: "docs_sub_renewal", name: "Subscription Renewal" },
      { id: "docs_loan_all", name: "All Loans" },
      { id: "docs_loan_foreclosure", name: "Loan Foreclosure" },
      { id: "docs_loan_noc", name: "Loan NOC" },
    ],
  },
  {
    key: "whatsapp",
    name: "WhatsApp System",
    prefix: "whatsapp",
    stages: [
      { id: "whatsapp_inbox", name: "Chat Inbox" },
      { id: "whatsapp_scheduler", name: "Broadcast Scheduler" },
    ],
  },
];

/**
 * Returns the list of systems and their stages that the logged-in user has permission to access.
 */
export function getAuthorizedSystemsForUser() {
  const role = localStorage.getItem("role") || "user";
  const username = localStorage.getItem("user-name") || "";
  const rawPageAccess = localStorage.getItem("page_access") || "";

  const isSuperAdmin = isAdministrator(role, username) || rawPageAccess.trim() === "all";
  const allowedPages = isSuperAdmin ? "all" : getReadablePageIds(rawPageAccess);

  if (isSuperAdmin || allowedPages === "all") {
    return SYSTEM_LIST.map((sys) => ({
      key: sys.key,
      name: sys.name,
      stages: [...sys.stages],
    }));
  }

  const allowedList = Array.isArray(allowedPages) ? allowedPages : [];

  const accessibleSystems = [];

  SYSTEM_LIST.forEach((sys) => {
    if (sys.isAlwaysAccessible) {
      accessibleSystems.push({
        key: sys.key,
        name: sys.name,
        stages: [...sys.stages],
      });
      return;
    }

    // Filter stages where user has permission
    const authorizedStages = sys.stages.filter((stage) => {
      return allowedList.includes(stage.id);
    });

    if (authorizedStages.length > 0) {
      accessibleSystems.push({
        key: sys.key,
        name: sys.name,
        stages: authorizedStages,
      });
    }
  });

  return accessibleSystems;
}
