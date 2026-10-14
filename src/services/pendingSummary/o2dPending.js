import {
  getReceivedOrders,
  getDeliveryHistory,
  getDispatchHistory,
  getPackagingHistory,
  getLogisticHistory,
  getCallanHistory,
  getInvoiceHistory,
  getConfirmDeliveryHistory,
  getPaymentHistory,
  getCheckedProductNumbers,
  getDispatchQtyForDeliveryApproverId,
  refreshO2DDataFromSupabase,
  DATA_CHANGED_EVENT,
} from "../../systems/orderDelivery/utils/storageManager";
import { makeItem } from "./helpers";

// Snapshot of the O2D localStorage cache (hydrated from Supabase by refreshO2DDataFromSupabase)
export function readO2DStore() {
  return {
    receivedOrders: getReceivedOrders() || [],
    deliveryHistory: getDeliveryHistory() || [],
    dispatchHistory: getDispatchHistory() || [],
    packagingHistory: getPackagingHistory() || [],
    logisticHistory: getLogisticHistory() || [],
    callanHistory: getCallanHistory() || [],
    invoiceHistory: getInvoiceHistory() || [],
    confirmHistory: getConfirmDeliveryHistory() || [],
    paymentHistory: getPaymentHistory() || [],
  };
}

/**
 * Pending orders per O2D stage. Same rules the sidebar badges have always used.
 * Returns raw order objects; Payment rows carry a `_paymentSection` tag.
 */
export function computeO2DPending({
  receivedOrders,
  deliveryHistory,
  dispatchHistory,
  packagingHistory,
  logisticHistory,
  callanHistory,
  invoiceHistory,
  confirmHistory,
  paymentHistory,
}) {

  // 0. Received Order: orders where pending fulfillment qty > 0
  const receivedOrder = receivedOrders.filter((order) => {
    const totalQty = (order.items || []).reduce(
      (sum, p) => sum + (parseFloat(p.qty) || 0),
      0
    );
    const deliveredQty = confirmHistory
      .filter(
        (c) =>
          (c.orderId === order.orderId || (order.id && c.dbOrderId === order.id)) &&
          c.deliveryStatus === "Delivered"
      )
      .reduce((sum, c) => sum + (parseFloat(c.dispatchQty) || 0), 0);
    const cancelQty = dispatchHistory
      .filter(
        (d) =>
          d.orderId === order.orderId || (order.id && d.dbOrderId === order.id)
      )
      .reduce((sum, d) => sum + (parseFloat(d.cancelQty) || 0), 0);
    return totalQty - deliveredQty - cancelQty > 0;
  });

  // 1. Check & Validation: received orders where not all products checked
  const checkAndValidation = receivedOrders.filter((o) => {
    const checkedCount = o.checkedProductNumbers?.length || (o.isChecked ? (o.items?.length || 0) : 0);
    const totalCount = o.items?.length || 0;
    return checkedCount < totalCount;
  });

  // 2. Check for Delivery: orders where all items passed Check & Validation
  // where pendingQty > 0 and no 'No Stock' status
  const checkForDelivery = receivedOrders.filter((order) => {
    if (!order.isChecked) return false;
    const checkedProductNumbers = getCheckedProductNumbers(order);
    return order.items?.some((item, idx) => {
      const productNumber = `${order.orderId}-${String(idx + 1).padStart(2, "0")}`;
      if (!checkedProductNumbers.includes(productNumber)) return false;
      const historyForProduct = deliveryHistory.filter(
        (h) => h.orderId === order.orderId && h.productNumber === productNumber
      );
      const hasNoStock = historyForProduct.some((h) => h.stockStatus === "No Stock");
      if (hasNoStock) return false;
      const totalApproved = historyForProduct.reduce(
        (sum, h) => sum + (parseFloat(h.approveQty) || 0),
        0
      );
      const totalQty = parseFloat(item.qty) || 0;
      return totalQty - totalApproved > 0;
    });
  });

  // 2.5 Production Planning: orders with checked items that have No Stock unproduced status
  const productionPlanning = receivedOrders.filter((order) => {
    const checkedProductNumbers = getCheckedProductNumbers(order);
    if (checkedProductNumbers.length === 0) return false;
    return order.items?.some((item, idx) => {
      const productNumber = `${order.orderId}-${String(idx + 1).padStart(2, "0")}`;
      if (!checkedProductNumbers.includes(productNumber)) return false;
      const historyForProduct = deliveryHistory.filter(
        (h) => h.orderId === order.orderId && h.productNumber === productNumber
      );
      return historyForProduct.some((h) => h.stockStatus === "No Stock" && !h.produced);
    });
  });

  // 3. Dispatch Planning: orders with 'In Stock' deliveries not yet fully dispatched
  const dispatchPlanning = receivedOrders.filter((order) => {
    const orderDeliveries = deliveryHistory.filter(
      (d) => d.orderId === order.orderId && d.stockStatus === "In Stock"
    );
    if (orderDeliveries.length === 0) return false;
    return orderDeliveries.some((delivery) => {
      const availableQty =
        parseFloat(delivery.approveQty) || parseFloat(delivery.qty) || 0;
      const clearedQty =
        getDispatchQtyForDeliveryApproverId(
          dispatchHistory,
          delivery.deliveryApproverId,
          "dispatchQty"
        ) +
        getDispatchQtyForDeliveryApproverId(
          dispatchHistory,
          delivery.deliveryApproverId,
          "cancelQty"
        );
      return availableQty - clearedQty > 0;
    });
  });

  // 4. Packaging: orders with dispatched items not yet fully packaged (Packaging = Yes)
  const packaging = receivedOrders.filter((order) => {
    const orderDispatches = dispatchHistory.filter((d) => d.orderId === order.orderId);
    if (orderDispatches.length === 0) return false;
    return orderDispatches.some((dispatchItem) => {
      return !packagingHistory.some(
        (ph) => ph.dispatchId === dispatchItem.dispatchId && ph.packagingStatus === "Yes"
      );
    });
  });

  // 5. Vehicle Logistic: orders with packaged items not yet in logistic history
  const vehicleLogistic = receivedOrders.filter((order) => {
    const cleanTransport = (order.transportingType || "").toLowerCase().replace(/[^a-z]/g, "");
    if (cleanTransport === "for") return false;
    const orderPackaged = packagingHistory.filter(
      (ph) => ph.orderId === order.orderId && ph.packagingStatus === "Yes"
    );
    if (orderPackaged.length === 0) return false;
    return orderPackaged.some((packageItem) => {
      return !logisticHistory.some((lh) => lh.dispatchId === packageItem.dispatchId);
    });
  });

  // 6. Make Callan: orders ready for Challan
  const makeCallan = receivedOrders.filter((order) => {
    const orderPackaged = packagingHistory.filter(
      (ph) => ph.orderId === order.orderId && ph.packagingStatus === "Yes"
    );
    if (orderPackaged.length === 0) return false;
    const orderLogistic = logisticHistory.filter((lh) => lh.orderId === order.orderId);
    const cleanType = (order.transportingType || "").toLowerCase().replace(/[^a-z]/g, "");
    const isFOR = cleanType === "for";
    return orderPackaged.some((packageItem) => {
      const readyForCallan =
        orderLogistic.some((lh) => lh.dispatchId === packageItem.dispatchId) || isFOR;
      const notInCallan = !callanHistory.some(
        (ch) => ch.dispatchId === packageItem.dispatchId
      );
      return readyForCallan && notInCallan;
    });
  });

  // 7. Make Invoice: orders that have a Callan but not yet in Invoice history
  const makeInvoice = receivedOrders.filter((order) => {
    const orderCallans = callanHistory.filter((ch) => ch.orderId === order.orderId);
    if (orderCallans.length === 0) return false;
    return orderCallans.some((callanItem) => {
      return !invoiceHistory.some((ih) => ih.dispatchId === callanItem.dispatchId);
    });
  });

  // 8. Confirm Delivery: orders that have an Invoice but are not 'Delivered'
  const confirmDelivery = receivedOrders.filter((order) => {
    const orderInvoices = invoiceHistory.filter((ih) => ih.orderId === order.orderId);
    if (orderInvoices.length === 0) return false;
    return orderInvoices.some((invoiceItem) => {
      const cd = confirmHistory.find((ch) => ch.dispatchId === invoiceItem.dispatchId);
      return !cd || cd.deliveryStatus !== "Delivered";
    });
  });

  // 9. Payment: pending Advance + Vendor + Freight
  const pendingAdvance = receivedOrders.filter((order) => {
    if (order.advancePayment !== "Yes") return false;
    const totalPaid = paymentHistory
      .filter((p) => p.orderId === order.orderId && p.paymentType === "Advance")
      .reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
    const requiredAdvance = parseFloat(order.advanceAmount || 0);
    return totalPaid < requiredAdvance;
  });

  const pendingVendor = receivedOrders.filter((order) => {
    const orderInvoices = invoiceHistory.filter((inv) => inv.orderId === order.orderId);
    const orderFullyDelivered =
      orderInvoices.length > 0 &&
      orderInvoices.every((invoiceItem) => {
        const cd = confirmHistory.find((ch) => ch.dispatchId === invoiceItem.dispatchId);
        return cd && cd.deliveryStatus === "Delivered";
      });
    if (!orderFullyDelivered) return false;
    const seen = new Set();
    let totalInvoicedValue = 0;
    orderInvoices.forEach((inv) => {
      if (inv.invoiceNumber && !seen.has(inv.invoiceNumber)) {
        seen.add(inv.invoiceNumber);
        totalInvoicedValue += parseFloat(inv.invoiceAmount || 0);
      }
    });
    const effectivePOValue =
      totalInvoicedValue > 0 ? totalInvoicedValue : parseFloat(order.totalPOValue || 0);
    const totalVendorPaid = paymentHistory
      .filter((p) => p.orderId === order.orderId && p.paymentType === "Vendor")
      .reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
    return effectivePOValue - totalVendorPaid > 0;
  });

  const freightOrderIds = new Set();
  const pendingFreight = [];
  logisticHistory.forEach((record) => {
    if (freightOrderIds.has(record.orderId)) return;
    freightOrderIds.add(record.orderId);
    const itemsForOrder = logisticHistory.filter((r) => r.orderId === record.orderId);
    const totalFreightPaid = paymentHistory
      .filter((p) => p.orderId === record.orderId && p.paymentType === "Freight")
      .reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
    const totalFreightExpected = itemsForOrder.reduce(
      (sum, r) => sum + parseFloat(r.transporterAmount || 0),
      0
    );
    if (totalFreightExpected > 0 && totalFreightExpected - totalFreightPaid > 0) {
      const order = receivedOrders.find((o) => o.orderId === record.orderId) || {
        orderId: record.orderId,
      };
      pendingFreight.push({ ...order, _freightExpected: totalFreightExpected, _freightPaid: totalFreightPaid });
    }
  });

  const payment = [
    ...pendingAdvance.map((o) => ({ ...o, _paymentSection: "Advance" })),
    ...pendingVendor.map((o) => ({ ...o, _paymentSection: "Vendor" })),
    ...pendingFreight.map((o) => ({ ...o, _paymentSection: "Freight" })),
  ];

  return {
    receivedOrder,
    checkAndValidation,
    checkForDelivery,
    productionPlanning,
    dispatchPlanning,
    packaging,
    vehicleLogistic,
    makeCallan,
    makeInvoice,
    confirmDelivery,
    payment,
  };
}

const orderItem = (store) => (o) => {
  const byOrder = (list) => list.filter((h) => h.orderId === o.orderId);
  return makeItem({
    id: `${o._paymentSection || "o"}-${o.id || o.orderId}`,
    ref: o.orderId,
    title: o.partyName,
    subtitle: [
      o.poNumber && `PO ${o.poNumber}`,
      (o.items || []).map((i) => `${i.productName} × ${i.qty}`).join(", "),
    ]
      .filter(Boolean)
      .join(" · "),
    person: o.responsiblePerson || o.orderReceivedBy,
    department: o.division,
    plannedAt: o.expectedDeliveryDate || null,
    createdAt: o.poTimestamp || o.timestamp,
    amount: o.totalPOValue,
    tag: o._paymentSection || "",
    raw: o,
    related: {
      "Delivery Checks": byOrder(store.deliveryHistory),
      Dispatches: byOrder(store.dispatchHistory),
      Packaging: byOrder(store.packagingHistory),
      Logistics: byOrder(store.logisticHistory),
      Challans: byOrder(store.callanHistory),
      Invoices: byOrder(store.invoiceHistory),
      "Delivery Confirmation": byOrder(store.confirmHistory),
      Payments: byOrder(store.paymentHistory),
    },
  });
};

// Wait for a fresh Supabase hydration (or a short timeout if one is already running)
function waitForHydration(timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener(DATA_CHANGED_EVENT, finish);
      resolve();
    };
    window.addEventListener(DATA_CHANGED_EVENT, finish);
    setTimeout(finish, timeoutMs);
    refreshO2DDataFromSupabase().then(finish, finish);
  });
}

export async function fetchO2DPending() {
  await waitForHydration();
  const store = readO2DStore();
  const stages = computeO2DPending(store);
  const toItem = orderItem(store);
  const result = {};
  Object.entries(stages).forEach(([k, list]) => {
    result[k] = list.map(toItem);
  });
  return result;
}
