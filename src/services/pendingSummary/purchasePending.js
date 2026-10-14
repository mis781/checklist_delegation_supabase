import { fetchPurchasePendingItems } from "../../systems/purchase/services/purchaseWorkflowApi";
import { makeItem, pick } from "./helpers";

const INDENT_STAGES = ["delegateApproval", "indentApproval", "quotation", "approvedVendor", "poEntry"];

export async function fetchPurchasePending() {
  const { stages, lookups } = await fetchPurchasePendingItems();
  const {
    indents,
    delegations,
    approvals,
    quotations,
    approvedVendors,
    purchaseOrders,
    payments,
    liftings,
    followups,
    billings,
  } = lookups;

  const findPo = (poId) => purchaseOrders.find((p) => p.id === poId || p.po_number === poId) || null;
  const findIndent = (indentId) => indents.find((i) => i.id === indentId) || null;
  const paymentsFor = (po) =>
    po ? payments.filter((p) => p.po_id === po.id || p.po_id === po.po_number) : [];

  const indentItem = (r) => {
    const approvers = delegations.filter((d) => d.indent_id === r.id);
    return makeItem({
      id: r.id,
      ref: r.indent_number,
      title: r.item_name,
      subtitle: [r.quantity && `${r.quantity} ${r.uom || ""}`, r.urgency && `Urgency: ${r.urgency}`]
        .filter(Boolean)
        .join(" · "),
      person: approvers.map((d) => d.approver_name || d.approver_username).join(", ") || r.created_by,
      department: pick(r, ["department", "warehouse_location", "category"]),
      plannedAt: r.required_date,
      createdAt: r.created_at,
      raw: r,
      related: {
        "Delegated Approvers": approvers,
        "Indent Approval": approvals.filter((a) => a.indent_id === r.id),
        Quotations: quotations.filter((q) => q.indent_id === r.id),
        "Approved Vendor": approvedVendors.filter((a) => a.indent_id === r.id),
      },
    });
  };

  const poItem = (po, extra = {}) =>
    makeItem({
      id: extra.id || po.id,
      ref: po.po_number,
      title: po.item_name,
      subtitle: [po.vendor_name, po.quantity && `Qty ${po.quantity}`].filter(Boolean).join(" · "),
      person: pick(po, ["created_by", "prepared_by", "vendor_name"]),
      department: pick(po, ["department", "delivery_location"]),
      plannedAt: pick(po, ["expected_delivery_date", "delivery_date"]) || null,
      createdAt: po.created_at,
      amount: po.total_amount,
      raw: po,
      related: {
        Indent: findIndent(po.indent_id),
        Payments: paymentsFor(po),
        Liftings: liftings.filter((l) => l.po_id === po.id || l.po_id === po.po_number),
      },
      ...extra,
    });

  const liftingItem = (lift) => {
    const po = findPo(lift.po_id);
    return makeItem({
      id: lift.id,
      ref: po?.po_number || lift.po_id,
      title: po?.item_name || "Lifting",
      subtitle: [po?.vendor_name, `Lifted ${lift.lifting_qty}`, lift.transporter_name].filter(Boolean).join(" · "),
      person: pick(lift, ["transporter_name", "driver_name", "created_by"]) || po?.vendor_name,
      department: pick(po, ["department", "delivery_location"]),
      createdAt: lift.actual_lifting_date || lift.created_at,
      amount: lift.freight_amount,
      raw: lift,
      related: {
        "Purchase Order": po,
        "Transporter Follow-ups": followups.filter((t) => t.lifting_id === lift.id || (!t.lifting_id && t.po_id === lift.po_id)),
      },
    });
  };

  const result = {};
  INDENT_STAGES.forEach((k) => {
    result[k] = stages[k].map(indentItem);
  });

  result.payment = stages.payment.map((r) => {
    const section = r._paymentSection;
    if (section === "Advance / PI") return poItem(r, { id: `adv-${r.id}`, tag: section });
    if (section === "Vendor Invoice") {
      const po = findPo(r.po_id);
      return makeItem({
        id: `inv-${r.id}`,
        ref: r.vendor_invoice_number || po?.po_number,
        title: po?.item_name || "Vendor invoice",
        subtitle: [po?.vendor_name, po?.po_number && `PO ${po.po_number}`].filter(Boolean).join(" · "),
        person: po?.vendor_name,
        createdAt: r.invoice_date || r.created_at,
        amount: r.invoice_amount,
        tag: section,
        raw: r,
        related: { "Purchase Order": po, Payments: paymentsFor(po) },
      });
    }
    const po = findPo(r.po_id);
    return makeItem({
      id: `frt-${r.id}`,
      ref: po?.po_number || r.po_id,
      title: po?.item_name || "Freight",
      subtitle: [r.transporter_name, po?.vendor_name].filter(Boolean).join(" · "),
      person: r.transporter_name,
      createdAt: r.created_at,
      amount: r.freight_amount,
      tag: section,
      raw: r,
      related: { "Purchase Order": po, Payments: paymentsFor(po) },
    });
  });

  result.followUpVendor = stages.followUpVendor.map((po) => poItem(po));
  result.transporterFollowUp = stages.transporterFollowUp.map(liftingItem);
  result.materialReceived = stages.materialReceived.map(liftingItem);

  result.tallyBilling = stages.tallyBilling.map((r) => {
    const po = findPo(r.po_id);
    return makeItem({
      id: r.id,
      ref: r.grn_number || po?.po_number,
      title: po?.item_name || "Material receipt",
      subtitle: [po?.vendor_name, `Accepted ${r.accepted_quantity ?? "-"} / Received ${r.received_quantity ?? "-"}`]
        .filter(Boolean)
        .join(" · "),
      person: pick(r, ["received_by", "created_by"]) || po?.vendor_name,
      createdAt: r.created_at,
      amount: po?.total_amount,
      raw: r,
      related: {
        "Purchase Order": po,
        "Tally Billing": billings.filter((b) => b.po_id === r.po_id),
      },
    });
  });

  return result;
}
