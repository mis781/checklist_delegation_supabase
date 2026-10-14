import { fetchPurchaseReturnPendingItems } from "../../systems/purchaseReturn/services/purchaseReturnApi";
import { fetchDocsPendingItems } from "../../systems/docs/services/docsSupabaseApi";
import { fetchFollowUps, fetchAdvancePayments } from "../../systems/leads/services/leadApi";
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
      department: r.division || r.company,
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
      department: r.company_name,
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
      department: r.company_name,
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

  const [followUpsRes, advanceRes] = await Promise.allSettled([
    fetchFollowUps(currentUser, isAdminFunc),
    fetchAdvancePayments(currentUser, isAdminFunc),
  ]);
  if (followUpsRes.status === "rejected" && advanceRes.status === "rejected") {
    throw followUpsRes.reason;
  }

  const followups = followUpsRes.status === "fulfilled" ? followUpsRes.value?.pending || [] : [];
  const quotations = advanceRes.status === "fulfilled" ? advanceRes.value?.pending || [] : [];

  return {
    followupTracker: followups.map((r) =>
      makeItem({
        id: r.id || r.leadNumber || r.leadNo,
        ref: pick(r, ["leadNumber", "leadNo", "lead_number"]),
        title: pick(r, ["companyName", "company", "customerName", "contactPerson"]),
        subtitle: [r.enquiryStatus, r.nextAction, r.phoneNumber].filter(Boolean).join(" · "),
        person: r.assignedTo || r.receiverName,
        department: r.division,
        plannedAt: r.nextCallDateTime || r.nextCallDate || null,
        createdAt: pick(r, ["createdAt", "timestamp"]) || null,
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
        department: r.division,
        plannedAt: pick(r, ["nextFollowupDateTime", "nextFollowupDate"]) || null,
        createdAt: pick(r, ["quotationDateRaw", "created_at"]) || null,
        amount: pick(r, ["grandTotal"]) || null,
        raw: r,
      }),
    ),
  };
}
