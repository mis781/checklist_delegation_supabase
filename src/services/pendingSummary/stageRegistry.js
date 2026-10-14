// Every system and every stage that has a pending section, in workflow order.
// `key` matches the sidebar badge-count keys so both views stay in sync.
// `pageId` is the page-permission ID; a user with MIS on that page is responsible for its pending tasks.
export const PENDING_SYSTEMS = [
  {
    key: "checklist",
    label: "Checklist & Delegation",
    stages: [
      { key: "task", label: "Task (Today + Overdue)", route: "/dashboard/task", pageId: "checklist_task" },
      { key: "delegation", label: "Delegation", route: "/dashboard/delegation", pageId: "checklist_delegation" },
      { key: "approval", label: "Admin Approval", route: "/dashboard/admin-approval", pageId: "checklist_approval" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory System",
    stages: [
      { key: "physicalStock", label: "Physical Stock", route: "/dashboard/inventory/physical-stock", pageId: "inventory_physical_stock" },
      { key: "reorder", label: "Reorder Management", route: "/dashboard/inventory/reorder", pageId: "inventory_reorder" },
      { key: "indent", label: "Indent Management", route: "/dashboard/inventory/indent", pageId: "inventory_indent" },
      { key: "transferApproval", label: "Approve Transfer", route: "/dashboard/inventory/transfer-approval", pageId: "inventory_transfer_approval" },
    ],
  },
  {
    key: "purchase",
    label: "Purchase System",
    stages: [
      { key: "delegateApproval", label: "Delegate Approvers", route: "/dashboard/purchase/delegate-approval", pageId: "purchase_delegate" },
      { key: "indentApproval", label: "Indent Approval", route: "/dashboard/purchase/indent-approval", pageId: "purchase_approval" },
      { key: "quotation", label: "Quotation", route: "/dashboard/purchase/quotation", pageId: "purchase_quotation" },
      { key: "approvedVendor", label: "Approved Vendor", route: "/dashboard/purchase/approved-vendor", pageId: "purchase_approved_vendor" },
      { key: "poEntry", label: "PO Entry", route: "/dashboard/purchase/po-entry", pageId: "purchase_po" },
      { key: "payment", label: "Payment", route: "/dashboard/purchase/payment", pageId: "purchase_payment" },
      { key: "followUpVendor", label: "Follow-up Vendor (Lifting)", route: "/dashboard/purchase/follow-up-vendor", pageId: "purchase_lifting" },
      { key: "transporterFollowUp", label: "Transporter Follow-up", route: "/dashboard/purchase/transporter-follow-up", pageId: "purchase_transporter" },
      { key: "materialReceived", label: "Material Received (GRN)", route: "/dashboard/purchase/material-received", pageId: "purchase_grn" },
      { key: "tallyBilling", label: "Receipt in Tally", route: "/dashboard/purchase/receipt-in-tally", pageId: "purchase_tally" },
    ],
  },
  {
    key: "purchaseReturn",
    label: "Purchase Return",
    stages: [
      { key: "approval", label: "Approval", route: "/dashboard/purchase-return/approval", pageId: "purchase_return_approval" },
      { key: "credit", label: "Credit Note", route: "/dashboard/purchase-return/credit", pageId: "purchase_return_credit" },
      { key: "logistics", label: "Logistics", route: "/dashboard/purchase-return/logistics", pageId: "purchase_return_logistics" },
      { key: "debitNote", label: "Debit Note", route: "/dashboard/purchase-return/debit-note", pageId: "purchase_return_debit_note" },
      { key: "plantReturn", label: "Plant Return", route: "/dashboard/purchase-return/plant-return", pageId: "purchase_return_plant_return" },
    ],
  },
  {
    key: "o2d",
    label: "Order Management",
    stages: [
      { key: "receivedOrder", label: "Received Order", route: "/dashboard/order-delivery/purchase-order", pageId: "o2d_purchase_order" },
      { key: "checkAndValidation", label: "Check & Validation", route: "/dashboard/order-delivery/check-and-validation", pageId: "o2d_check_validation" },
      { key: "checkForDelivery", label: "Check for Delivery", route: "/dashboard/order-delivery/check-for-delivery", pageId: "o2d_check_delivery" },
      { key: "productionPlanning", label: "Production Planning", route: "/dashboard/order-delivery/production-planning", pageId: "o2d_production" },
      { key: "dispatchPlanning", label: "Dispatch Planning", route: "/dashboard/order-delivery/dispatch-planning", pageId: "o2d_dispatch" },
      { key: "packaging", label: "Packaging", route: "/dashboard/order-delivery/packaging", pageId: "o2d_packaging" },
      { key: "vehicleLogistic", label: "Vehicle Logistic", route: "/dashboard/order-delivery/vehicle-logistic", pageId: "o2d_logistic" },
      { key: "makeCallan", label: "Make Challan", route: "/dashboard/order-delivery/make-callan", pageId: "o2d_callan" },
      { key: "makeInvoice", label: "Make Invoice", route: "/dashboard/order-delivery/make-invoice", pageId: "o2d_invoice" },
      { key: "confirmDelivery", label: "Confirm Delivery", route: "/dashboard/order-delivery/confirm-delivery", pageId: "o2d_confirm_delivery" },
      { key: "payment", label: "Payment", route: "/dashboard/order-delivery/payment", pageId: "o2d_payment" },
    ],
  },
  {
    key: "leads",
    label: "Leads System",
    stages: [
      { key: "followupTracker", label: "Follow-up Tracker", route: "/dashboard/leads/followup-tracker", pageId: "leads_followup_tracker" },
      { key: "quotationTracker", label: "Quotation Tracker", route: "/dashboard/leads/quotation-tracker", pageId: "leads_quotation_tracker" },
    ],
  },
  {
    key: "docs",
    label: "Docs & Subscriptions",
    stages: [
      { key: "documentRenewal", label: "Document Renewal", route: "/dashboard/docs/renewal", pageId: "docs_renewal" },
      { key: "subscriptionApproval", label: "Subscription Approval", route: "/dashboard/docs/subscription/approval", pageId: "docs_sub_approval" },
      { key: "subscriptionPayment", label: "Subscription Payment", route: "/dashboard/docs/subscription/payment", pageId: "docs_sub_payment" },
      { key: "subscriptionRenewal", label: "Subscription Renewal", route: "/dashboard/docs/subscription/renewal", pageId: "docs_sub_renewal" },
      { key: "loanForeclosure", label: "Loan Foreclosure", route: "/dashboard/docs/loan/foreclosure", pageId: "docs_loan_foreclosure" },
      { key: "loanNoc", label: "Loan NOC", route: "/dashboard/docs/loan/noc", pageId: "docs_loan_noc" },
    ],
  },
];

// Turns { stageKey: items[] | count } into the sidebar's { stageKey: count, total } shape
export function countsFromItems(itemsByStage) {
  const counts = { total: 0 };
  Object.entries(itemsByStage || {}).forEach(([k, list]) => {
    counts[k] = Array.isArray(list) ? list.length : Number(list) || 0;
    counts.total += counts[k];
  });
  return counts;
}

// Pages that have a pending section: only these can be given MIS (pending-task responsibility)
export const MIS_PAGE_IDS = new Set(
  PENDING_SYSTEMS.flatMap((system) => system.stages.map((stage) => stage.pageId)),
);
