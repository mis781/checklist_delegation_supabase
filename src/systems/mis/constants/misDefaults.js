/**
 * MIS Module Constants & Defaults
 */

export const DEFAULT_ENTERPRISE_SYSTEMS = [
  {
    platform: "Checklist & Delegation",
    objective: "Daily operational adherence and recurring checklist execution",
    context_description: "Tracks repetitive operational tasks, recurring daily checks, and delegated action items across all departments.",
    access_point: "/dashboard/checklist",
  },
  {
    platform: "MaintenancePro & Repairs",
    objective: "Plant machinery maintenance & breakdown tracking",
    context_description: "Schedules preventive maintenance and coordinates active repair and breakdown resolutions.",
    access_point: "/dashboard/maintenance",
  },
  {
    platform: "Lead To Order (CRM)",
    objective: "Inbound lead pipeline, quotation generation and sales follow-up",
    context_description: "Central repository for leads, customer interactions, quotation approvals, and order conversions.",
    access_point: "/dashboard/leads",
  },
  {
    platform: "Order 2 Dispatch (O2D)",
    objective: "Fulfillment lifecycle from order acceptance to dispatch",
    context_description: "Tracks production planning, packaging, vehicle logistics, delivery challans, and customer invoicing.",
    access_point: "/dashboard/order-delivery",
  },
  {
    platform: "Inventory Management",
    objective: "Warehouse stock levels, inward receipts, and internal transfers",
    context_description: "Maintains real-time stock balances across warehouses, material categories, and unit conversions.",
    access_point: "/dashboard/inventory",
  },
  {
    platform: "Purchase & Procurement",
    objective: "Indent tracking, vendor RFQ comparisons, and Purchase Order issuance",
    context_description: "Standardizes indent creation, multi-level approval hierarchies, and vendor lifting management.",
    access_point: "/dashboard/purchase",
  },
  {
    platform: "WhatsApp Communication Engine",
    objective: "Automated notifications, alerts, and template broadcasts",
    context_description: "Dispatches WhatsApp updates for task alerts, order status, quotations, and broadcast schedules.",
    access_point: "/dashboard/whatsapp",
  },
  {
    platform: "Query & Escalation System",
    objective: "Cross-departmental issue resolution and blocker ticketing",
    context_description: "Enables team members to raise operational tickets, track resolution status, and escalate blockers.",
    access_point: "/dashboard/query/tracker",
  },
];

export const SCORING_GUIDES = {
  howItWorks: [
    {
      title: "1. Task Velocity & Target",
      description: "Every role has an established baseline velocity of planned tasks (daily or weekly). All scheduled checklist and delegation tasks assigned to you count towards your Period Target.",
    },
    {
      title: "2. % Work Done (Completion Ratio)",
      description: "Formula: (Actual Tasks Completed / Target Tasks) × 100. Measures overall volume delivery regardless of timing.",
    },
    {
      title: "3. % Done On Time (Punctuality Metric)",
      description: "Formula: (Tasks Submitted On or Before Planned Date / Actual Completed) × 100. Tasks submitted late reduce this punctuality index.",
    },
    {
      title: "4. Composite Score Categorization",
      description: "Positive (+) = Both % Done ≥ 80% and On-Time ≥ 80%. Average (~) = % Done between 50% and 79%. Needs Improvement (-) = % Done < 50% or severe backlog.",
    },
    {
      title: "5. Cumulative Backlog (All Pending)",
      description: "Total unresolved tasks across your entire tenure. Sustained high backlog impacts overall performance standing during weekly reviews.",
    },
  ],
  howToScoreBetter: [
    {
      title: "Clear Daily Checklist Before Due Time",
      description: "Submit morning checklists by scheduled target hours. Submitting after the target hour marks the task as delayed even if submitted today.",
    },
    {
      title: "Commit to Specific Weekly Deliverables",
      description: "During Monday review meetings, set realistic planned targets in History Commitment. Over-promising and missing degrades commitment reliability.",
    },
    {
      title: "Raise Blockers Promptly in Query System",
      description: "If an external team or material shortage is preventing task completion, raise a ticket in Query System immediately to officially document the blocker.",
    },
    {
      title: "Tackle Overdue Backlog First",
      description: "Prioritize overdue backlog tasks before picking new optional delegations to rapidly bring down your 'All Pending' index.",
    },
  ],
};

/**
 * Returns the default Monday-to-Saturday current week range in YYYY-MM-DD
 */
export function getDefaultWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday
  // Monday is day 1. If Sunday (0), shift to prev Monday (-6)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const format = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${dt}`;
  };

  return {
    startDate: format(monday),
    endDate: format(saturday),
  };
}

/**
 * Returns current month 1st to last day in YYYY-MM-DD
 */
export function getDefaultMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dt}`;
  };

  return {
    startDate: format(firstDay),
    endDate: format(lastDay),
  };
}

/**
 * Format date display: e.g. "09 Nov 2026 - 14 Nov 2026"
 */
export function formatRangeDisplay(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");

  const sStr = `${pad(d1.getDate())} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
  const eStr = `${pad(d2.getDate())} ${months[d2.getMonth()]} ${d2.getFullYear()}`;
  return `${sStr} - ${eStr}`;
}
