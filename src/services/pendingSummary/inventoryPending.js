import { fetchInventoryDataApi } from "../../redux/api/inventoryApi";
import { fetchTransfersApi } from "../../redux/api/transferApi";
import { makeItem } from "./helpers";

/**
 * Pure calculation shared by the sidebar (Redux data) and the PC Dashboard (fresh fetch).
 * @param {string} simLoc optional simulated location filter for Reorder (sidebar only)
 */
export function computeInventoryPending({
  materials = [],
  transactions = [],
  indents = [],
  physicalStocks = [],
  transfers = [],
  simLoc = "",
}) {
  // Physical Stock: counts submitted and waiting for review
  const physicalStock = physicalStocks
    .filter((p) => (p.status || "").toLowerCase() === "pending")
    .map((p) =>
      makeItem({
        id: `ps-${p.id}`,
        ref: p.sku,
        title: p.name,
        subtitle: `System ${p.systemStock} / Physical ${p.physicalQty} (Diff ${p.differenceQty}) ${p.unit || ""}`,
        person: p.countedBy,
        department: p.division,
        createdAt: p.countedDate || p.createdAt,
        raw: p,
      }),
    );

  // Reorder: active materials below reorder level with no open indent
  const matClosing = {};
  materials.forEach((m) => {
    matClosing[m.sku] = Number(m.opening) || 0;
  });
  transactions.forEach((t) => {
    if (matClosing[t.sku] !== undefined) {
      if (t.type === "IN") matClosing[t.sku] += Number(t.qty) || 0;
      else matClosing[t.sku] -= Number(t.qty) || 0;
    }
  });

  const reorder = [];
  materials.forEach((m) => {
    const hasPendingIndent = indents.some(
      (i) => i.sku === m.sku && (i.status === "Pending" || i.status === "Approved"),
    );
    if (hasPendingIndent) return;

    const closingStock = matClosing[m.sku] || 0;
    const safetyStock = (Number(m.adc) || 0) * (Number(m.safetyFactor) || 0);
    const reorderLevel = (Number(m.adc) || 0) * (Number(m.leadTime) || 0) + safetyStock;

    if (m.status === "Active" && closingStock < reorderLevel) {
      if (!simLoc || m.location === simLoc) {
        reorder.push(
          makeItem({
            id: `ro-${m.id ?? m.sku}`,
            ref: m.sku,
            title: m.name,
            subtitle: `Closing ${closingStock} / Reorder level ${reorderLevel} ${m.unit || ""}`,
            person: m.supplierName,
            department: m.division,
            raw: { ...m, closingStock, reorderLevel, safetyStock },
          }),
        );
      }
    }
  });

  // Indent Management: indents still waiting for a decision
  const indent = indents
    .filter((i) => i.status === "Pending")
    .map((i) =>
      makeItem({
        id: `in-${i.indentNo}`,
        ref: i.indentNo,
        title: i.name,
        subtitle: `Reorder qty ${i.reorderQty} · SKU ${i.sku}`,
        person: i.requestedBy,
        department: i.department,
        createdAt: i.date,
        raw: i,
      }),
    );

  // Approve Transfer: inter-division transfers waiting for approval
  const transferApproval = transfers
    .filter((t) => t.status === "Pending")
    .map((t) =>
      makeItem({
        id: `tr-${t.id}`,
        ref: t.skuCode,
        title: t.skuName,
        subtitle: `${t.fromDivision} → ${t.toDivision} · Qty ${t.quantity} ${t.unit || ""}`,
        person: t.operatorName,
        department: t.fromDivision,
        createdAt: t.submittedAt || t.transferDate,
        raw: t,
      }),
    );

  return { physicalStock, reorder, indent, transferApproval };
}

export async function fetchInventoryPending() {
  const [inv, trf] = await Promise.all([fetchInventoryDataApi(), fetchTransfersApi()]);
  if (inv.error) throw new Error(inv.error);
  return computeInventoryPending({
    materials: inv.data?.materials || [],
    transactions: inv.data?.transactions || [],
    indents: inv.data?.indents || [],
    physicalStocks: inv.data?.physicalStocks || [],
    transfers: trf.data || [],
  });
}
