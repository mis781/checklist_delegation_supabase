import { fetchPurchaseReturnPendingItems } from "../../systems/purchaseReturn/services/purchaseReturnApi";
import { fetchOrderReturns } from "../../systems/orderReturn/services/orderReturnApi";
import { cust, returnValue, fmsSteps } from "../../systems/orderReturn/constants/orderReturnData";
import { fetchDocsPendingItems } from "../../systems/docs/services/docsSupabaseApi";
import { fetchFollowUps, fetchAdvancePayments, fetchQuotationApprovals } from "../../systems/leads/services/leadApi";
import { isAdministrator } from "../../utils/roleUtils";
import { makeItem, pick } from "./helpers";

// ---------------------------------------------------------------- Purchase Return
export async function fetchPurchaseReturnPending() {
  const stages = await fetchPurchaseReturnPendingItems();
  const toItem = (r) =>
    makeItem({
      id: r.id,
      ref: r.returnNumber,
      title: r.supplier,
      subtitle: [r.poNumber && `PO ${r.poNumber}`, r.billNumber && `Bill ${r.billNumber}`, r.approval?.actionType]
        .filter(Boolean)
        .join(" · "),
      person: pick(r, ["createdBy", "requestedBy"]) || r.supplier,
      department: r.company,
      division: r.division,
      createdAt: r.requestDate,
      amount: r.damageValue,
      raw: r,
    });
  const result = {};
  Object.entries(stages).forEach(([k, list]) => {
    result[k] = list.map(toItem);
  });
  return result;
}

// ---------------------------------------------------------------- Docs & Subscriptions
export async function fetchDocsPending() {
  const s = await fetchDocsPendingItems();
  const docItem = (r) =>
    makeItem({
      id: r.id,
      ref: r.sn,
      title: r.document_name,
      subtitle: [r.category, r.document_type].filter(Boolean).join(" · "),
      person: r.person_name,
      department: r.department || r.category || "Administration",
      division: r.division || r.firm || r.firm_name || r.company_name || "",
      plannedAt: r.renewal_date,
      createdAt: r.created_at,
      raw: r,
    });
  const subItem = (dateKey) => (r) =>
    makeItem({
      id: r.id,
      ref: r.sn,
      title: r.subscription_name,
      subtitle: [r.service_name, r.frequency, r.status].filter(Boolean).join(" · "),
      person: r.subscriber_name,
      department: r.department || r.category || "Administration",
      division: r.division || r.firm || r.firm_name || r.company_name || "",
      plannedAt: r[dateKey],
      createdAt: r.requested_date || r.created_at,
      amount: r.price,
      raw: r,
    });
  return {
    documentRenewal: s.documentRenewal.map(docItem),
    subscriptionApproval: s.subscriptionApproval.map(subItem("requested_date")),
    subscriptionPayment: s.subscriptionPayment.map(subItem("payment_due_date")),
    subscriptionRenewal: s.subscriptionRenewal.map(subItem("renewal_date")),
    loanForeclosure: s.loanForeclosure.map((r) =>
      makeItem({
        id: r.id,
        ref: r.sn,
        title: r.loan_name,
        subtitle: [r.bank_name, r.status].filter(Boolean).join(" · "),
        person: r.requested_by,
        department: r.department || "Finance",
        division: r.division || r.firm || r.firm_name || r.company_name || "",
        createdAt: r.requested_date || r.created_at,
        amount: r.outstanding_amount,
        raw: r,
      }),
    ),
    loanNoc: s.loanNoc.map((r) =>
      makeItem({
        id: r.id,
        ref: r.sn,
        title: r.loan_name,
        subtitle: [r.bank_name, r.account_number && `A/c ${r.account_number}`].filter(Boolean).join(" · "),
        person: r.noc_collected_by,
        department: r.department || "Finance",
        division: r.division || r.firm || r.firm_name || r.company_name || "",
        plannedAt: r.end_date || r.maturity_date,
        createdAt: r.created_at,
        amount: r.loan_amount,
        raw: r,
      }),
    ),
  };
}

// ---------------------------------------------------------------- Leads
/**
 * @param {{scope: "all"|"user", username: string, role: string}} ctx
 */
export async function fetchLeadsPending({ scope, username, role }) {
  const currentUser = { username: username || "Admin", userType: role };
  const isAdminFunc = () =>
    scope === "all" ||
    isAdministrator(role, username) ||
    role === "admin" ||
    role === "administrator" ||
    role === "superadmin";

  const [followUpsRes, advanceRes, approvalsRes] = await Promise.allSettled([
    fetchFollowUps(currentUser, isAdminFunc),
    fetchAdvancePayments(currentUser, isAdminFunc),
    fetchQuotationApprovals(currentUser, isAdminFunc),
  ]);
  if (followUpsRes.status === "rejected" && advanceRes.status === "rejected" && approvalsRes.status === "rejected") {
    throw followUpsRes.reason;
  }

  const followups = followUpsRes.status === "fulfilled" ? followUpsRes.value?.pending || [] : [];
  const quotations = advanceRes.status === "fulfilled" ? advanceRes.value?.pending || [] : [];
  const approvals = approvalsRes.status === "fulfilled" ? approvalsRes.value?.pending || [] : [];

  return {
    followupTracker: followups.map((r) =>
      makeItem({
        id: r.id || r.leadNumber || r.leadNo,
        ref: pick(r, ["leadNumber", "leadNo", "lead_number"]),
        title: pick(r, ["companyName", "company", "customerName", "contactPerson"]),
        subtitle: [r.enquiryStatus, r.nextAction, r.phoneNumber].filter(Boolean).join(" · "),
        person: r.assignedTo || r.receiverName,
        department: r.department || "Sales",
        division: r.division || r.firm || r.firm_name || "",
        plannedAt: r.nextCallDateTime || r.nextCallDate || null,
        createdAt: pick(r, ["createdAt", "timestamp"]) || null,
        raw: r,
      }),
    ),
    quotationApproval: approvals.map((r) =>
      makeItem({
        id: r.id || r.quotationNo,
        ref: r.quotationNo,
        title: r.consigneeName || r.companyName || "Quotation",
        subtitle: `₹${Number(r.grandTotal || 0).toLocaleString("en-IN")}`,
        person: r.salesPerson || r.preparedBy,
        department: "Sales",
        division: r.division || r.consigneeDivision || "",
        createdAt: r.savedAt || r.createdAt || null,
        amount: r.grandTotal || null,
        raw: r,
      }),
    ),
    quotationTracker: quotations.map((r) =>
      makeItem({
        id: r.id || r.quotationNumber || r.leadNumber,
        ref: pick(r, ["quotationNumber", "quotationNo", "leadNumber", "leadNo"]),
        title: pick(r, ["companyName", "company", "customerName", "partyName"]),
        subtitle: [r.status, r.contactName, r.phoneNumber].filter(Boolean).join(" · "),
        person: pick(r, ["receiverName", "assignedTo", "salesPerson"]),
        department: r.department || "Sales",
        division: r.division || r.firm || r.firm_name || "",
        plannedAt: pick(r, ["nextFollowupDateTime", "nextFollowupDate"]) || null,
        createdAt: pick(r, ["quotationDateRaw", "created_at"]) || null,
        amount: pick(r, ["grandTotal"]) || null,
        raw: r,
      }),
    ),
  };
}

// ---------------------------------------------------------------- Order Return (Customer Return)
export async function fetchOrderReturnPending() {
  try {
    const { returns } = await fetchOrderReturns();
    const list = returns || [];
    const openReturns = (r) => !["Rejected", "Cancelled", "Completed"].includes(r.status);

    const toItem = (r, stageIdx) => {
      let plannedAt = null;
      try {
        const steps = fmsSteps(r);
        if (steps && steps[stageIdx]?.planned) {
          plannedAt = new Date(steps[stageIdx].planned);
        }
      } catch (_) {}

      const customerName = r.customer_name || cust(r.customerId || r.customer_id)?.name || "Customer";
      const totalAmount = typeof returnValue === "function" ? returnValue(r) : null;

      return makeItem({
        id: `${r.id}-${stageIdx + 1}`,
        ref: r.no || r.return_no || r.id,
        title: customerName,
        subtitle: [r.reason, r.status, r.transportType || r.transport_type].filter(Boolean).join(" · "),
        person: r.createdBy || r.created_by || "",
        department: "Sales",
        division: r.company || "",
        plannedAt,
        createdAt: r.date || r.created_at,
        amount: totalAmount,
        tag: r.status,
        raw: {
          return_no: r.no || r.return_no,
          customer_name: customerName,
          status: r.status,
          stage: r.stage,
          reason: r.reason,
          company: r.company,
          transport_type: r.transportType || r.transport_type,
          created_by: r.createdBy || r.created_by,
          date: r.date || r.created_at,
          total_value: totalAmount,
          items_count: (r.items || []).length,
          items: r.items || [],
          ...(r.approval ? { approval: r.approval } : {}),
          ...(r.debit ? { debit: r.debit } : {}),
          ...(r.transport ? { transport: r.transport } : {}),
          ...(r.credit ? { credit: r.credit } : {}),
        },
      });
    };

    return {
      request: list.filter((r) => r.status === "Draft").map((r) => toItem(r, 0)),
      approval: list.filter((r) => (Number(r.stage) === 2 || r.stage === "Approval") && openReturns(r)).map((r) => toItem(r, 1)),
      debitNote: list.filter((r) => (Number(r.stage) === 3 || r.stage === "Ask for Debit Note") && openReturns(r)).map((r) => toItem(r, 2)),
      vehicle: list.filter((r) => (Number(r.stage) === 4 || r.stage === "Vehicle Arrangement") && openReturns(r)).map((r) => toItem(r, 3)),
      receiptQc: list.filter((r) => (Number(r.stage) === 5 || r.stage === "Material Receipt & QC") && openReturns(r)).map((r) => toItem(r, 4)),
      creditNote: list.filter((r) => (Number(r.stage) === 6 || r.stage === "Issue Credit Note") && openReturns(r)).map((r) => toItem(r, 5)),
    };
  } catch (err) {
    console.error("Failed to fetch order return pending:", err);
    return {
      request: [],
      approval: [],
      debitNote: [],
      vehicle: [],
      receiptQc: [],
      creditNote: [],
    };
  }
}
