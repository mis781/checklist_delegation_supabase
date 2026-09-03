import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Truck,
  Search,
  CheckCircle2,
  ExternalLink,
  Loader2,
  X,
  Plus,
  Send,
  Building,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  Clock,
  PackageCheck,
  ChevronRight,
  Upload,
  Download,
  ClipboardList,
  History,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import {
  fetchMasterTransporters,
  fetchMasterTransportTypes,
} from "../services/purchaseMasterApi";
import TatStageBadge from "./TatStageBadge";
import {
  formatDateDash,
  formatDateTime,
  toLocalIsoTimestamp,
} from "../utils/dateUtils";

const isFORType = (type) => {
  if (!type) return false;
  const t = String(type).trim().toLowerCase();
  return (
    t === "f.o.r." ||
    t === "f.o.r" ||
    t === "for" ||
    t === "f.o.r. (free on road)" ||
    t === "f.o.r (free on road)" ||
    t === "free on road"
  );
};

export default function FollowUpLiftingView() {
  const { showToast } = useMagicToast();
  const {
    purchaseOrders,
    vendorLiftings: liftings,
    vendorPayments,
    transporterFollowups,
    orderCancellations,
    recordMaterialLifting,
    updateTransporterStatus,
    getTatStatusForIndent,
    openTatModal,
    getIndentNumber,
    getLiftNumber,
  } = usePurchaseWorkflow();

  // Dynamic Master Data Lookups
  const [dbTransporters, setDbTransporters] = useState([]);
  const [dbTransportTypes, setDbTransportTypes] = useState([]);

  // Load masters on mount
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [transportersList, transportTypesList] = await Promise.all([
          fetchMasterTransporters(),
          fetchMasterTransportTypes(),
        ]);
        if (transportersList && transportersList.length > 0) {
          setDbTransporters(transportersList);
        }
        if (transportTypesList && transportTypesList.length > 0) {
          setDbTransportTypes(transportTypesList);
        }
      } catch (err) {
        console.warn("Failed to load transporters master:", err);
      }
    };
    loadMasters();
  }, []);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [processMode, setProcessMode] = useState("follow-up"); // 'follow-up' | 'arrange-logistics' | 'material-lifting'
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [vendorPOMismatchError, setVendorPOMismatchError] = useState(null);

  // Form State: Tab 1 (Follow-UP)
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpRemarks, setFollowUpRemarks] = useState("");

  // Form State: Tab 2 (Arrange Logistics)
  const [logisticsTransporter, setLogisticsTransporter] = useState(
    "Select transporter...",
  );
  const [perKgAmount, setPerKgAmount] = useState("");
  const [logisticsTotalAmount, setLogisticsTotalAmount] = useState("");

  // Form State: Tab 3 (Material Lifting & Dispatch)
  const [liftQtys, setLiftQtys] = useState({});
  const [dispatchTransporter, setDispatchTransporter] = useState(
    "Select transporter...",
  );
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [liftingAddress, setLiftingAddress] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [transportType, setTransportType] = useState("Ex-Factory + Transport");
  const [transportingRate, setTransportingRate] = useState("");
  const [totalTransportingAmount, setTotalTransportingAmount] = useState("");
  const [hasBilty, setHasBilty] = useState("Yes");
  const [biltyNumber, setBiltyNumber] = useState("");
  const [biltyImage, setBiltyImage] = useState(null);
  const [biltyImageName, setBiltyImageName] = useState("");
  const [billImage, setBillImage] = useState(null);
  const [billImageName, setBillImageName] = useState("");
  const [dispatchRemarks, setDispatchRemarks] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const handleBiltyUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBiltyImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setBiltyImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleBillUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBillImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setBillImage(reader.result);
    reader.readAsDataURL(file);
  };

  // Map of arranged logistics details per PO
  const logisticsByPoId = useMemo(() => {
    const map = new Map();
    (transporterFollowups || [])
      .filter((r) => r.status === "Logistics Arranged")
      .forEach((r) => {
        if (!r.po_id) return;
        map.set(r.po_id, {
          transporterName: r.transporter_name || "",
          rate: r.freight_amount != null ? String(r.freight_amount) : "",
          ratePerKg: r.rate_per_kg != null ? String(r.rate_per_kg) : "",
          transportType: r.transport_type || "",
          totalAmount: r.freight_amount != null ? String(r.freight_amount) : "",
        });
      });
    return map;
  }, [transporterFollowups]);

  // Advance payments status map for stage gatekeeping
  const advanceStatusByPoId = useMemo(() => {
    const map = new Map();
    (vendorPayments || []).forEach((p) => {
      if (!p.po_id || p.payment_type !== "Advance") return;
      const existing = map.get(p.po_id) || { status: "", paid: 0, amount: 0 };
      const newPaid = existing.paid + (parseFloat(p.amount) || 0);
      map.set(p.po_id, {
        status: p.advance_status || existing.status || "",
        paid: newPaid,
        amount: parseFloat(p.advance_amount || "0") || existing.amount,
      });
    });
    return map;
  }, [vendorPayments]);

  // Cancelled quantity map
  const cancelQtyByPoId = useMemo(() => {
    const map = new Map();
    (orderCancellations || []).forEach((c) => {
      if (!c.po_id) return;
      map.set(
        c.po_id,
        (map.get(c.po_id) || 0) + (parseFloat(c.financial_impact) || 0),
      );
    });
    return map;
  }, [orderCancellations]);

  // Filtered Pending List
  const pendingList = useMemo(() => {
    return purchaseOrders
      .map((po) => {
        // Advance Payment Gating
        const poPayTypeLower = String(po.payment_type || "").toLowerCase();
        const requiresAdvanceDecision =
          !poPayTypeLower.includes("no advance") &&
          !poPayTypeLower.includes("on dispatch");
        const advInfo =
          advanceStatusByPoId.get(po.id) ||
          advanceStatusByPoId.get(po.po_number);
        const advRequired =
          parseFloat(po.advance_amount || po.advance_amt || "0") ||
          advInfo?.amount ||
          0;
        const isAdvCleared =
          !requiresAdvanceDecision ||
          advRequired <= 0 ||
          (!!advInfo &&
            (advInfo.paid >= advRequired - 0.01 ||
              advInfo.status === "not_needed_again" ||
              advInfo.status === "completed" ||
              advInfo.status === "need_again" ||
              advInfo.paid > 0));

        const poLiftings = (liftings || []).filter(
          (l) => l.po_id === po.id || l.po_id === po.po_number,
        );
        const totalLifted = poLiftings.reduce(
          (sum, l) => sum + Number(l.lifting_qty || 0),
          0,
        );
        const totalCancelled =
          cancelQtyByPoId.get(po.id) || cancelQtyByPoId.get(po.po_number) || 0;
        const totalQty = Number(po.quantity || 18);
        const uom = po.uom || "Kgs";
        const pendingQty = Math.max(0, totalQty - totalLifted - totalCancelled);
        const isComplete =
          totalLifted + totalCancelled >= totalQty && totalQty > 0;
        const lastLifting = poLiftings[0];
        const basicVal = Number(
          po.total_amount || totalQty * (po.unit_rate || 500),
        );

        const lastFollowDate =
          lastLifting?.last_followup_date ||
          lastLifting?.followup_date ||
          lastLifting?.actual_lifting_date ||
          null;

        const nextFollowDate =
          lastLifting?.next_followup_date ||
          lastLifting?.expected_lifting_date ||
          null;

        const logisticsInfo =
          logisticsByPoId.get(po.id) || logisticsByPoId.get(po.po_number);
        const transportType =
          po.transport_type ||
          po.transportType ||
          logisticsInfo?.transportType ||
          lastLifting?.transport_type ||
          "Ex-Factory + Transport";
        const arrangedTransporter =
          logisticsInfo?.transporterName ||
          lastLifting?.transporter_name ||
          po.transporter_name ||
          null;

        return {
          ...po,
          indentNumber:
            po.indent_number ||
            po.indentNumber ||
            (getIndentNumber ? getIndentNumber(po.indent_id) : po.indent_id) ||
            "-",
          itemName: po.item_name || "-",
          vendorName: po.vendor_name || "-",
          qty: `${totalQty} ${uom}`,
          rawQty: totalQty,
          uom,
          transportType,
          arrangedTransporter,
          logisticsTransporterName: logisticsInfo?.transporterName || "",
          logisticsRate: logisticsInfo?.rate || "",
          logisticsRatePerKg: logisticsInfo?.ratePerKg || "",
          logisticsTransportType: logisticsInfo?.transportType || transportType,
          logisticsTotalAmount: logisticsInfo?.totalAmount || "",
          plannedDate:
            po.delivery_date ||
            po.expected_delivery_date ||
            po.planned_date ||
            po.po_date ||
            null,
          lastFollowUpDate: lastFollowDate,
          totalDispatchQty: `${totalLifted} ${uom}`,
          cancelQty: `${totalCancelled} ${uom}`,
          pendingDispatchQty: `${pendingQty} ${uom}`,
          rawPendingQty: pendingQty,
          nextFollowUpDate: nextFollowDate,
          lastFollowUpRemark: lastLifting?.remarks || "-",
          poNumber: po.po_number || "-",
          basicValue: `₹${basicVal.toLocaleString()}`,
          isComplete,
          isAdvCleared,
          status: isComplete
            ? "completed"
            : !isAdvCleared
              ? "not_ready"
              : "pending",
        };
      })
      .filter((r) => r.status === "pending")
      .filter(
        (r) =>
          divisionFilter === "all" || r.delivery_location === divisionFilter,
      )
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          r.poNumber.toLowerCase().includes(s) ||
          r.vendorName.toLowerCase().includes(s) ||
          r.itemName.toLowerCase().includes(s) ||
          r.indentNumber.toLowerCase().includes(s) ||
          (r.transportType && r.transportType.toLowerCase().includes(s)) ||
          (r.arrangedTransporter &&
            r.arrangedTransporter.toLowerCase().includes(s))
        );
      });
  }, [
    purchaseOrders,
    liftings,
    advanceStatusByPoId,
    cancelQtyByPoId,
    logisticsByPoId,
    searchTerm,
    divisionFilter,
    getIndentNumber,
  ]);

  // Map of transporter followups by lifting ID and by PO ID
  const { tfByLiftingId, tfByPoId } = useMemo(() => {
    const byLiftingId = new Map();
    const byPoId = new Map();
    (transporterFollowups || []).forEach((t) => {
      if (t.lifting_id) byLiftingId.set(t.lifting_id, t);
      if (t.po_id) byPoId.set(t.po_id, t);
    });
    return { tfByLiftingId: byLiftingId, tfByPoId: byPoId };
  }, [transporterFollowups]);

  // History List combining Vendor Liftings and Order Cancellations
  const historyList = useMemo(() => {
    const actualLiftings = (liftings || []).filter(
      (l) =>
        Number(l.lifting_qty || 0) > 0 ||
        l.actual_lifting_date ||
        [
          "complete",
          "completed",
          "in-transit",
          "intransit",
          "dispatched",
          "received",
        ].includes(String(l.lifting_status || "").toLowerCase()),
    );

    const liftRows = actualLiftings.map((l, i) => {
      const po = purchaseOrders.find(
        (p) => p.id === l.po_id || p.po_number === l.po_id,
      );
      const tf =
        (l.id ? tfByLiftingId.get(l.id) : null) ||
        (l.po_id ? tfByPoId.get(l.po_id) : null) ||
        (po?.id ? tfByPoId.get(po.id) : null);
      const logisticsInfo =
        (l.po_id ? logisticsByPoId.get(l.po_id) : null) ||
        (po?.id ? logisticsByPoId.get(po.id) : null);
      const uom = po?.uom || l.uom || "Kgs";
      const numQty = Number(l.lifting_qty || 0);
      const displayQty =
        numQty > 0
          ? `${numQty} ${uom}`
          : po?.quantity
            ? `${po.quantity} ${uom}`
            : `0 ${uom}`;
      const indentNo =
        po?.indent_number ||
        po?.indentNumber ||
        (getIndentNumber ? getIndentNumber(po?.indent_id) : po?.indent_id) ||
        "-";
      const liftNo =
        l.lifting_number ||
        l.liftNumber ||
        (getLiftNumber
          ? getLiftNumber(l.id)
          : `LIFT-2026-${String(i + 1).padStart(3, "0")}`);
      const biltyCopyUrl =
        l.bilty_copy_url || l.biltyCopy || tf?.bilty_copy_url || null;

      const plannedDate =
        po?.delivery_date ||
        po?.expected_delivery_date ||
        po?.planned_date ||
        po?.po_date ||
        l.actual_lifting_date ||
        l.followup_date ||
        null;

      const transporterName =
        l.transporter_name ||
        tf?.transporter_name ||
        logisticsInfo?.transporterName ||
        po?.transporter_name ||
        "-";

      const vehicleNo = l.vehicle_number || tf?.vehicle_number || "-";
      const lrNo = l.lr_number || l.bilty_number || tf?.bilty_number || "-";

      const expDelivery =
        l.expected_lifting_date ||
        l.expected_delivery_date ||
        tf?.expected_arrival_date ||
        po?.delivery_date ||
        null;

      const freightVal =
        l.freight_amount != null && Number(l.freight_amount) > 0
          ? l.freight_amount
          : l.total_freight != null && Number(l.total_freight) > 0
            ? l.total_freight
            : tf?.freight_amount != null && Number(tf.freight_amount) > 0
              ? tf.freight_amount
              : logisticsInfo?.totalAmount != null &&
                  Number(logisticsInfo.totalAmount) > 0
                ? logisticsInfo.totalAmount
                : null;

      const freightAmount =
        freightVal != null && Number(freightVal) > 0
          ? `₹${Number(freightVal).toLocaleString()}`
          : "—";

      return {
        id: l.id || `lift-${i}`,
        liftNumber: liftNo,
        indentNumber: indentNo,
        itemDetails: po?.item_name || l.item_name || "-",
        vendorName: po?.vendor_name || l.vendor_name || "-",
        poNumber: po?.po_number || l.po_id || "-",
        liftingQty: displayQty,
        plannedDate,
        actualDate:
          l.actual_lifting_date || l.updated_at || l.created_at || null,
        transporterName,
        vehicleNo,
        biltyNumber: lrNo,
        biltyCopyUrl,
        expectedDeliveryDate: expDelivery,
        freightAmount,
        isCancelled: false,
      };
    });

    const cancelRows = (orderCancellations || []).map((c, i) => {
      const po = purchaseOrders.find(
        (p) => p.id === c.po_id || p.po_number === c.po_id,
      );
      const uom = po?.uom || "Kgs";
      const indentNo =
        po?.indent_number ||
        po?.indentNumber ||
        (getIndentNumber
          ? getIndentNumber(po?.indent_id || c.indent_id)
          : c.indent_id) ||
        "-";

      return {
        id: `cancel-${c.id || i}`,
        liftNumber: "CANCELLED",
        indentNumber: indentNo,
        itemDetails: po?.item_name || c.item_name || "-",
        vendorName: po?.vendor_name || c.vendor_name || "-",
        poNumber: po?.po_number || c.po_id || "-",
        liftingQty: c.financial_impact ? `${c.financial_impact} ${uom}` : "-",
        plannedDate: c.cancellation_date
          ? String(c.cancellation_date).split("T")[0]
          : "-",
        actualDate: c.cancellation_date || c.created_at || null,
        transporterName: c.cancelled_by
          ? `Stage: ${c.cancelled_by}`
          : "Order Cancel",
        vehicleNo: "-",
        biltyNumber: c.cancellation_reason
          ? `Reason: ${c.cancellation_reason}`
          : "-",
        biltyCopyUrl: null,
        expectedDeliveryDate: "-",
        freightAmount: "-",
        isCancelled: true,
        remarks: c.cancellation_reason || "Order Cancelled",
      };
    });

    return [...liftRows, ...cancelRows].filter((l) => {
      const s = searchTerm.toLowerCase();
      if (!s) return true;
      return (
        String(l.biltyNumber).toLowerCase().includes(s) ||
        String(l.transporterName).toLowerCase().includes(s) ||
        String(l.vehicleNo).toLowerCase().includes(s) ||
        String(l.poNumber).toLowerCase().includes(s) ||
        String(l.indentNumber).toLowerCase().includes(s) ||
        String(l.vendorName).toLowerCase().includes(s) ||
        String(l.itemDetails).toLowerCase().includes(s)
      );
    });
  }, [
    liftings,
    orderCancellations,
    purchaseOrders,
    tfByLiftingId,
    tfByPoId,
    logisticsByPoId,
    searchTerm,
    getIndentNumber,
    getLiftNumber,
  ]);

  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  const warehouseOptions = useMemo(() => {
    const list = purchaseOrders.map((i) => i.delivery_location).filter(Boolean);
    return Array.from(new Set(list));
  }, [purchaseOrders]);

  // Same-PO Auto-Grouping & Selection
  const getSamePORecordIds = useCallback(
    (recordId) => {
      const record = pendingList.find((r) => r.id === recordId);
      if (!record) return [recordId];
      const poNum = String(record.poNumber || "").trim();
      if (!poNum || poNum === "-") return [recordId];

      return pendingList
        .filter((r) => String(r.poNumber || "").trim() === poNum)
        .map((r) => r.id);
    },
    [pendingList],
  );

  const checkVendorPOMatch = useCallback((items) => {
    if (items.length <= 1) return { isMatched: true, vendor: "", poNumber: "" };
    let vendor = "";
    let poNumber = "";

    for (let i = 0; i < items.length; i++) {
      const rec = items[i];
      const vName = String(rec.vendorName || "").trim();
      const pNum = String(rec.poNumber || "").trim();
      if (i === 0) {
        vendor = vName;
        poNumber = pNum;
      } else {
        if (vName !== vendor || pNum !== poNumber) {
          return { isMatched: false, vendor: "", poNumber: "" };
        }
      }
    }
    return { isMatched: true, vendor, poNumber };
  }, []);

  const toggleRecord = (id) => {
    const groupIds = getSamePORecordIds(id);
    setSelectedRecordIds((prev) => {
      if (prev.includes(id)) {
        const groupSet = new Set(groupIds);
        return prev.filter((x) => !groupSet.has(x));
      }
      return Array.from(new Set([...prev, ...groupIds]));
    });
  };

  const toggleAll = () => {
    if (
      selectedRecordIds.length === pendingList.length &&
      pendingList.length > 0
    ) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(pendingList.map((r) => r.id));
    }
  };

  // Open Process Modal
  const beginProcessing = (ids) => {
    if (ids.length === 0) return;
    const items = pendingList.filter((r) => ids.includes(r.id));
    if (items.length === 0) return;

    setSelectedRecords(items);
    setSelectedRecordIds(ids);

    const matchResult = checkVendorPOMatch(items);
    if (!matchResult.isMatched) {
      setVendorPOMismatchError(
        "Vendor Name or PO number not matched for the selected items.",
      );
      setModalOpen(true);
      return;
    }
    setVendorPOMismatchError(null);

    const primary = items[0];
    const initialDate = new Date(Date.now() + 2 * 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0];
    setFollowUpDate(initialDate);
    setFollowUpRemarks("");

    const primaryType =
      primary.transportType ||
      primary.transport_type ||
      "Ex-Factory + Transport";
    const primaryTransporter =
      primary.logisticsTransporterName ||
      primary.arrangedTransporter ||
      primary.transporter_name ||
      "Select transporter...";
    const primaryRate =
      primary.logisticsRatePerKg || primary.arrangedRate || "";
    const primaryTotalFreight =
      primary.logisticsTotalAmount || primary.arrangedFreight
        ? String(primary.logisticsTotalAmount || primary.arrangedFreight)
        : "";

    // Logistics Defaults
    setLogisticsTransporter(primaryTransporter);
    setPerKgAmount(primaryRate);
    setLogisticsTotalAmount(primaryTotalFreight);

    // Lifting Defaults
    const initialLifts = {};
    items.forEach((it) => {
      initialLifts[it.id] = String(it.rawPendingQty || it.quantity || 0);
    });
    setLiftQtys(initialLifts);

    setProcessMode("follow-up");

    // Pre-populate Material Lifting
    setDispatchTransporter(primaryTransporter);
    setVehicleNumber(primary.vehicle_number || "");
    setDriverContact("");
    setLiftingAddress("");
    setBillNo("");
    setBillDate(new Date().toISOString().split("T")[0]);
    setExpectedDeliveryDate("");
    setTransportType(primaryType);
    setTransportingRate(primaryRate);
    setTotalTransportingAmount(primaryTotalFreight);
    setHasBilty("Yes");
    setBiltyNumber("");
    setBiltyImage(null);
    setBiltyImageName("");
    setBillImage(null);
    setBillImageName("");
    setDispatchRemarks("");

    setModalOpen(true);
  };

  const handleProcessDirect = (recordId) => {
    beginProcessing(getSamePORecordIds(recordId));
  };

  const handleBulkProcessDirect = () => {
    if (selectedRecordIds.length === 0) return;
    const expanded = new Set();
    selectedRecordIds.forEach((id) =>
      getSamePORecordIds(id).forEach((gid) => expanded.add(gid)),
    );
    beginProcessing(Array.from(expanded));
  };

  // Selected Record Transport Type Logic (Ex-Factory vs F.O.R.)
  const selectedTransportType = useMemo(() => {
    const primary = selectedRecords[0];
    return (
      primary?.transport_type ||
      primary?.transportType ||
      primary?.transport_mode ||
      transportType ||
      "Ex-Factory + Transport"
    );
  }, [selectedRecords, transportType]);

  const isForOrder = useMemo(() => {
    return isFORType(selectedTransportType);
  }, [selectedTransportType]);

  // Total Quantity Calculation for Batch
  const batchTotalQuantity = useMemo(() => {
    return selectedRecords.reduce(
      (sum, it) => sum + Number(it.rawPendingQty || it.quantity || 0),
      0,
    );
  }, [selectedRecords]);

  const modalBatchTotalLiftQty = useMemo(() => {
    return selectedRecords.reduce((sum, it) => {
      const q = parseFloat(liftQtys[it.id] || "0") || 0;
      return sum + q;
    }, 0);
  }, [selectedRecords, liftQtys]);

  const handleLiftQtyChange = (id, val, maxQty) => {
    const numVal = parseFloat(val) || 0;
    let finalVal = val;
    if (val !== "") {
      if (numVal > maxQty) finalVal = String(maxQty);
      else if (numVal < 0) finalVal = "0";
    }
    const nextQtys = { ...liftQtys, [id]: finalVal };
    setLiftQtys(nextQtys);

    const rate = parseFloat(transportingRate);
    if (!isNaN(rate) && rate > 0) {
      const nextTotalQty = selectedRecords.reduce((sum, it) => {
        const q =
          parseFloat(it.id === id ? finalVal : nextQtys[it.id] || "0") || 0;
        return sum + q;
      }, 0);
      setTotalTransportingAmount(
        (rate * nextTotalQty).toFixed(2).replace(/\.00$/, ""),
      );
    }
  };

  const handleTransportRateChange = (val) => {
    setTransportingRate(val);
    const rate = parseFloat(val);
    if (!isNaN(rate) && modalBatchTotalLiftQty > 0) {
      setTotalTransportingAmount(
        (rate * modalBatchTotalLiftQty).toFixed(2).replace(/\.00$/, ""),
      );
    }
  };

  // Remove indent from lifting list
  const handleRemoveIndentFromLift = (recordId) => {
    const remaining = selectedRecords.filter((r) => r.id !== recordId);
    if (remaining.length === 0) {
      setModalOpen(false);
      setSelectedRecords([]);
      setSelectedRecordIds([]);
      return;
    }
    setSelectedRecords(remaining);
    setSelectedRecordIds(remaining.map((r) => r.id));
    setLiftQtys((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  };

  // Form Submit Handler
  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (selectedRecords.length === 0) return;

    try {
      setIsSubmitting(true);

      if (processMode === "follow-up") {
        if (!followUpDate) {
          if (showToast)
            showToast("Please select next follow-up date", "warning");
          setIsSubmitting(false);
          return;
        }

        for (const item of selectedRecords) {
          await recordMaterialLifting({
            poId: item.id,
            liftingQty: 0,
            followup_date: toLocalIsoTimestamp(followUpDate),
            last_followup_date: new Date().toISOString(),
            nextFollowUpDate: toLocalIsoTimestamp(followUpDate),
            expected_lifting_date: toLocalIsoTimestamp(followUpDate),
            remarks: followUpRemarks || "Vendor follow-up completed",
          });
        }

        if (showToast)
          showToast(
            `Follow-up saved for ${selectedRecords.length} order(s)!`,
            "success",
          );
        setModalOpen(false);
      } else if (processMode === "arrange-logistics") {
        if (logisticsTransporter === "Select transporter...") {
          if (showToast) showToast("Please select a transporter", "warning");
          setIsSubmitting(false);
          return;
        }

        for (const item of selectedRecords) {
          if (updateTransporterStatus) {
            await updateTransporterStatus({
              poId: item.id,
              transporter_name: logisticsTransporter,
              rate_per_kg: parseFloat(perKgAmount) || null,
              freight_amount: parseFloat(logisticsTotalAmount) || null,
              transport_type:
                item.transportType ||
                item.transport_type ||
                transportType ||
                "Ex-Factory + Transport",
              status: "Logistics Arranged",
              dispatch_date: new Date().toISOString(),
            });
          }
        }

        if (showToast)
          showToast(
            `Logistics arranged with ${logisticsTransporter}!`,
            "success",
          );
        setModalOpen(false);
      } else if (processMode === "material-lifting") {
        if (!vehicleNumber.trim()) {
          if (showToast) showToast("Please enter vehicle number", "warning");
          setIsSubmitting(false);
          return;
        }

        if (!driverContact.trim()) {
          if (showToast)
            showToast("Driver contact number is required", "warning");
          setIsSubmitting(false);
          return;
        }

        if (!expectedDeliveryDate) {
          if (showToast)
            showToast("Expected delivery date is required", "warning");
          setIsSubmitting(false);
          return;
        }

        if (!isForOrder && hasBilty === "Yes" && !biltyNumber.trim()) {
          if (showToast) showToast("Please enter bilty / LR number", "warning");
          setIsSubmitting(false);
          return;
        }

        // Validate quantities
        for (const item of selectedRecords) {
          const lQty = Number(liftQtys[item.id] || 0);
          const maxAllowed = Number(item.rawPendingQty || item.quantity || 0);
          if (lQty <= 0) {
            if (showToast)
              showToast(
                `Lift quantity must be greater than 0 for Indent ${item.indentNumber}`,
                "warning",
              );
            setIsSubmitting(false);
            return;
          }
          if (lQty > maxAllowed && maxAllowed > 0) {
            if (showToast)
              showToast(
                `Lift quantity (${lQty}) exceeds pending quantity (${maxAllowed}) for Indent ${item.indentNumber}`,
                "error",
              );
            setIsSubmitting(false);
            return;
          }
        }

        const actualDispatchIso = toLocalIsoTimestamp(billDate);
        const expectedArrivalIso = toLocalIsoTimestamp(expectedDeliveryDate);

        for (const item of selectedRecords) {
          const lQty = Number(liftQtys[item.id] || item.rawPendingQty || 1);
          const finalBiltyNumber =
            !isForOrder && hasBilty === "Yes"
              ? biltyNumber ||
                billNo ||
                `LR-${Math.floor(1000 + Math.random() * 9000)}`
              : billNo || `TRK-${Math.floor(1000 + Math.random() * 9000)}`;

          const liftingRecord = await recordMaterialLifting({
            poId: item.id,
            po_id: item.id,
            liftingQty: lQty,
            lifting_qty: lQty,
            actualLiftingDate: actualDispatchIso,
            actual_lifting_date: actualDispatchIso,
            expected_lifting_date: expectedArrivalIso,
            next_followup_date: expectedArrivalIso,
            expected_delivery_date: expectedArrivalIso,
            lrNumber: finalBiltyNumber,
            bilty_number: finalBiltyNumber,
            lifting_address: liftingAddress || null,
            transporterName:
              dispatchTransporter !== "Select transporter..."
                ? dispatchTransporter
                : "Direct Dispatch",
            transporter_name:
              dispatchTransporter !== "Select transporter..."
                ? dispatchTransporter
                : "Direct Dispatch",
            vehicleNumber: vehicleNumber.toUpperCase(),
            vehicle_number: vehicleNumber.toUpperCase(),
            driverContact: driverContact,
            driver_contact: driverContact,
            transportType: transportType,
            totalFreight: isForOrder
              ? 0
              : totalTransportingAmount || transportingRate || 0,
            remarks: dispatchRemarks || "Material lifted and in transit",
          });

          if (updateTransporterStatus) {
            await updateTransporterStatus({
              poId: item.id,
              lifting_id: liftingRecord?.id || null,
              transporter_name:
                dispatchTransporter !== "Select transporter..."
                  ? dispatchTransporter
                  : item.vendor_name
                    ? `Vendor (${item.vendor_name})`
                    : "Direct Transport",
              bilty_number: finalBiltyNumber,
              vehicle_number: vehicleNumber.toUpperCase(),
              driver_contact: driverContact,
              lifting_address: liftingAddress || null,
              dispatch_date: actualDispatchIso,
              expected_arrival_date: expectedArrivalIso,
              freight_amount: isForOrder
                ? 0
                : Number(totalTransportingAmount || 0),
              rate_per_kg: isForOrder ? 0 : Number(transportingRate || 0),
              transport_type: transportType,
              bilty_copy_url: biltyImage || null,
              status: "In Transit",
            });
          }
        }

        if (showToast)
          showToast(
            `Material lifting & dispatch recorded for ${selectedRecords.length} item(s)!`,
            "success",
          );
        setModalOpen(false);
      }
    } catch (err) {
      console.error("Process error:", err);
      if (showToast) showToast(`Process failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const headers = [
          "Indent No",
          "Item",
          "Supplier",
          "Qty",
          "Arranged Logistics",
          "Planned Date",
          "Last Follow Up Date",
          "Total Dispatch Qty",
          "Cancel Qty",
          "Pending Dispatch Qty",
          "Next Follow Up Date",
          "Last Follow Up Remark",
          "PO Number",
          "Basic Value",
        ];

        const rowData = pendingList.map((r) => [
          r.indentNumber,
          r.itemName,
          r.vendorName,
          r.qty,
          r.logisticsTransporterName
            ? `Transporter: ${r.logisticsTransporterName} | Rate/Kg: ₹${r.logisticsRatePerKg || 0} | Total: ₹${r.logisticsTotalAmount || 0}`
            : "Not arranged yet",
          r.plannedDate,
          r.lastFollowUpDate,
          r.totalDispatchQty,
          r.cancelQty,
          r.pendingDispatchQty,
          r.nextFollowUpDate,
          r.lastFollowUpRemark,
          r.poNumber,
          r.basicValue,
        ]);

        const csvContent =
          "data:text/csv;charset=utf-8," +
          [
            headers.join(","),
            ...rowData.map((e) =>
              e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
            ),
          ].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
          "download",
          `Follow_UP_Lifting_Pending_${Date.now()}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Export CSV error:", error);
        if (showToast) showToast("Failed to export CSV file", "error");
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 8 : Follow UP & Material Lifting
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track supplier readiness, coordinate freight logistics, and
                record vehicle dispatches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedRecordIds.length > 0 && activeTab === "pending" && (
              <button
                type="button"
                onClick={handleBulkProcessDirect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                Process Selected ({selectedRecordIds.length})
              </button>
            )}

            {activeTab === "pending" && (
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isExporting}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Tab & Search Bar Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Pending</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                {pendingList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                {historyList.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent, PO, Vendor, Item..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {warehouseOptions.length > 0 && (
              <select
                value={divisionFilter}
                onChange={(e) => {
                  setDivisionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Divisions</option>
                {warehouseOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Table Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "pending" ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 text-center w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedRecordIds.length === pendingList.length &&
                        pendingList.length > 0
                      }
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 text-center w-24">Actions</th>
                  <th className="p-3.5">Indent No.</th>
                  <th className="p-3.5">Item</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Qty</th>
                  <th className="p-3.5">Arranged Logistics</th>
                  <th className="p-3.5">Planned Date</th>
                  <th className="p-3.5 text-center">Delay</th>
                  <th className="p-3.5">Last Follow Up Date</th>
                  <th className="p-3.5 text-center">Total Dispatch Qty</th>
                  <th className="p-3.5 text-center">Cancel Qty</th>
                  <th className="p-3.5 text-center">Pending Dispatch Qty</th>
                  <th className="p-3.5">Next Follow Up Date</th>
                  <th className="p-3.5">Last Follow Up Remark</th>
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5 text-right">Basic Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="text-center py-12 text-slate-400 font-medium"
                    >
                      No pending follow-up indents found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((rec) => {
                    const isSelected = selectedRecordIds.includes(rec.id);
                    return (
                      <tr
                        key={rec.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecord(rec.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleProcessDirect(rec.id)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 cursor-pointer shadow-2xs"
                          >
                            Process
                          </button>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          {rec.indentNumber}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                          {rec.itemName}
                        </td>
                        <td className="p-3.5">{rec.vendorName}</td>
                        <td className="p-3.5 font-bold">{rec.qty}</td>
                        <td className="p-3.5">
                          {rec.logisticsTransporterName ||
                          rec.logisticsRatePerKg ||
                          rec.logisticsRate ||
                          rec.logisticsTotalAmount ||
                          rec.logisticsTransportType ? (
                            <div className="text-xs space-y-0.5 whitespace-nowrap">
                              {rec.logisticsTransporterName && (
                                <div>
                                  <span className="text-slate-400">
                                    Transporter:
                                  </span>{" "}
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {rec.logisticsTransporterName}
                                  </span>
                                </div>
                              )}
                              {rec.logisticsRatePerKg && (
                                <div>
                                  <span className="text-slate-400">
                                    Rate/Kg:
                                  </span>{" "}
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    ₹{rec.logisticsRatePerKg}
                                  </span>
                                </div>
                              )}
                              {rec.logisticsRate && (
                                <div>
                                  <span className="text-slate-400">
                                    Fixed Rate:
                                  </span>{" "}
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    ₹{rec.logisticsRate}
                                  </span>
                                </div>
                              )}
                              {rec.logisticsTotalAmount && (
                                <div>
                                  <span className="text-slate-400">
                                    Total Freight:
                                  </span>{" "}
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    ₹{rec.logisticsTotalAmount}
                                  </span>
                                </div>
                              )}
                              {rec.logisticsTransportType && (
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-medium mt-0.5">
                                  {rec.logisticsTransportType}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-xs">
                              Not arranged yet
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(rec.plannedDate)}
                        </td>
                        <td className="p-3.5 text-center">
                          <TatStageBadge
                            tatStatus={getTatStatusForIndent(
                              rec.id,
                              "Follow UP / Lifting",
                            )}
                            indentId={rec.id}
                          />
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(rec.lastFollowUpDate)}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {rec.totalDispatchQty}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-rose-500">
                          {rec.cancelQty}
                        </td>
                        <td className="p-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                          {rec.pendingDispatchQty}
                        </td>
                        <td className="p-3.5 font-mono text-blue-600 dark:text-blue-400 font-bold">
                          {formatDateTime(rec.nextFollowUpDate)}
                        </td>
                        <td
                          className="p-3.5 text-slate-500 dark:text-slate-400 max-w-[160px] truncate"
                          title={rec.lastFollowUpRemark}
                        >
                          {rec.lastFollowUpRemark}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {rec.poNumber}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                          {rec.basicValue}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Lift Number</th>
                  <th className="p-3.5">Indent No</th>
                  <th className="p-3.5">Item Details</th>
                  <th className="p-3.5">Vendor</th>
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5 text-center">Lifting Qty</th>
                  <th className="p-3.5">Planned Date</th>
                  <th className="p-3.5 text-center">Delay</th>
                  <th className="p-3.5 text-center font-mono">Actual Date</th>
                  <th className="p-3.5">Transporter</th>
                  <th className="p-3.5">Vehicle No</th>
                  <th className="p-3.5">LR / Bilty</th>
                  <th className="p-3.5">Expected Delivery Date</th>
                  <th className="p-3.5 text-right">Freight Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="text-center py-12 text-slate-400 font-medium"
                    >
                      No material lifting history logs found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((h) => (
                    <tr
                      key={h.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                        h.isCancelled ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {h.isCancelled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 border border-rose-200 dark:border-rose-800">
                            CANCELLED
                          </span>
                        ) : (
                          h.liftNumber
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {h.indentNumber}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-[160px] truncate">
                        {h.itemDetails}
                      </td>
                      <td className="p-3.5">{h.vendorName}</td>
                      <td className="p-3.5 font-mono">{h.poNumber}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {h.liftingQty}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {formatDateTime(h.plannedDate)}
                      </td>
                      <td className="p-3.5 text-center">
                        <TatStageBadge
                          tatStatus={getTatStatusForIndent(
                            h.indent_id || h.id,
                            "Follow UP / Lifting",
                          )}
                          indentId={h.indent_id || h.id}
                          isCompleted={!h.isCancelled}
                        />
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatDateTime(h.actualDate)}
                      </td>
                      <td className="p-3.5">{h.transporterName}</td>
                      <td className="p-3.5 font-mono uppercase">
                        {h.vehicleNo}
                      </td>
                      <td className="p-3.5">
                        {h.isCancelled ? (
                          <span
                            className="text-rose-600 text-xs italic truncate block max-w-[160px]"
                            title={h.remarks}
                          >
                            {h.remarks}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 font-mono">
                            {h.biltyNumber}
                            {h.biltyCopyUrl && (
                              <a
                                href={h.biltyCopyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {formatDateTime(h.expectedDeliveryDate)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                        {h.freightAmount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, currentList.length)} of{" "}
              {currentList.length} items
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer font-bold"
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. PROCESS MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {processMode === "follow-up"
                    ? "Follow-Up Details"
                    : processMode === "arrange-logistics"
                      ? "Arrange Logistics"
                      : "Material Lifting & Dispatch"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {vendorPOMismatchError
                    ? "Cannot proceed with submission."
                    : selectedRecords.length > 1
                      ? `Updating ${selectedRecords.length} indents under PO ${selectedRecords[0]?.poNumber}`
                      : `Indent ${selectedRecords[0]?.indentNumber} • PO ${selectedRecords[0]?.poNumber}`}
                </p>
              </div>

              {/* Mode Switch Tabs */}
              {!vendorPOMismatchError && (
                <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setProcessMode("follow-up")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      processMode === "follow-up"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Follow-UP
                  </button>
                  {!isForOrder && (
                    <button
                      type="button"
                      onClick={() => setProcessMode("arrange-logistics")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        processMode === "arrange-logistics"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Arrange Logistics
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setProcessMode("material-lifting")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      processMode === "material-lifting"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Material Lifting
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {vendorPOMismatchError ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-rose-700 dark:text-rose-400 mb-1">
                      Cannot Proceed
                    </h4>
                    <p className="text-xs text-rose-600 dark:text-rose-300">
                      {vendorPOMismatchError}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-3">
                      Please select items with the same Vendor and PO Number to
                      use bulk material lifting.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProcessSubmit} className="space-y-6">
                  {/* Top Item Summary Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-bold">
                          Selected Batch
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {selectedRecords.length} Indent(s)
                        </span>
                      </div>
                      {batchTotalQuantity > 0 && (
                        <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">
                          Total Qty: {batchTotalQuantity}{" "}
                          {selectedRecords[0]?.uom || "Kgs"}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedRecords.map((rec) => (
                        <span
                          key={rec.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold shadow-2xs"
                        >
                          <span>{rec.indentNumber}</span>
                          <span className="text-slate-400 font-normal">
                            ({rec.itemName})
                          </span>
                          {selectedRecords.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveIndentFromLift(rec.id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Vendor
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedRecords[0]?.vendorName || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          PO Number
                        </span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {selectedRecords[0]?.poNumber || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Transport Type
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedTransportType}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Planned Date
                        </span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {formatDateTime(selectedRecords[0]?.plannedDate) ||
                            "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TAB 1: Follow-UP */}
                  {processMode === "follow-up" && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Follow-Up Information
                      </h4>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Next Follow Up Date{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Follow-Up Remarks
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Enter conversation notes or status from supplier..."
                          value={followUpRemarks}
                          onChange={(e) => setFollowUpRemarks(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Arrange Logistics */}
                  {processMode === "arrange-logistics" && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Logistics Arrangement
                        </h4>
                        {batchTotalQuantity > 0 && (
                          <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">
                            Batch Qty: {batchTotalQuantity}{" "}
                            {selectedRecords[0]?.uom || "Kgs"}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Transporter Name{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={logisticsTransporter}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLogisticsTransporter(val);
                            setDispatchTransporter(val);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                        >
                          <option value="Select transporter...">
                            -- Select Transporter --
                          </option>
                          {dbTransporters.map((t, idx) => (
                            <option
                              key={`lt-${t.id || t.name}-${idx}`}
                              value={t.name}
                            >
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Per Kg Amount (₹)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={perKgAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPerKgAmount(val);
                              setTransportingRate(val);
                              if (val && batchTotalQuantity) {
                                const total = (
                                  parseFloat(val) * batchTotalQuantity
                                ).toFixed(2);
                                setLogisticsTotalAmount(total);
                                setTotalTransportingAmount(total);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Total Freight Amount (₹)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={logisticsTotalAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLogisticsTotalAmount(val);
                              setTotalTransportingAmount(val);
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Material Lifting */}
                  {processMode === "material-lifting" && (
                    <div className="space-y-6">
                      {/* Products To Lift Table */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Products To Lift
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Edit lift quantities per product for this dispatch.
                          </span>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="p-2.5">Indent No.</th>
                                <th className="p-2.5">Item Name</th>
                                <th className="p-2.5 text-center">Total Qty</th>
                                <th className="p-2.5 text-center">
                                  Lifted Qty
                                </th>
                                <th className="p-2.5 text-center">
                                  Pending Qty
                                </th>
                                <th className="p-2.5 text-center w-32">
                                  Lift Quantity
                                </th>
                                <th className="p-2.5 text-center w-12">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {selectedRecords.map((item) => {
                                const totalQty = Number(
                                  item.rawQty || item.quantity || 0,
                                );
                                const pendingQty = Number(
                                  item.rawPendingQty || 0,
                                );
                                const uomStr = item.uom ? ` ${item.uom}` : "";
                                const liftedQty = Math.max(
                                  0,
                                  totalQty - pendingQty,
                                );

                                return (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                                  >
                                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                      {item.indentNumber}
                                    </td>
                                    <td className="p-2.5 font-medium">
                                      {item.itemName}
                                    </td>
                                    <td className="p-2.5 text-center font-bold">
                                      {totalQty}
                                      {uomStr}
                                    </td>
                                    <td className="p-2.5 text-center text-slate-500">
                                      {liftedQty}
                                      {uomStr}
                                    </td>
                                    <td className="p-2.5 text-center font-bold text-amber-600 dark:text-amber-400">
                                      {pendingQty}
                                      {uomStr}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        max={pendingQty}
                                        value={liftQtys[item.id] || ""}
                                        onChange={(e) =>
                                          handleLiftQtyChange(
                                            item.id,
                                            e.target.value,
                                            pendingQty,
                                          )
                                        }
                                        className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        required
                                      />
                                    </td>
                                    <td className="p-2.5 text-center">
                                      {selectedRecords.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveIndentFromLift(item.id)
                                          }
                                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Lifting Dispatch details */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Lifting Dispatch Details
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Transporter{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={dispatchTransporter}
                              onChange={(e) =>
                                setDispatchTransporter(e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                            >
                              <option value="Select transporter...">
                                -- Select Transporter --
                              </option>
                              {dbTransporters.map((t, idx) => (
                                <option
                                  key={`dt-${t.id || t.name}-${idx}`}
                                  value={t.name}
                                >
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Vehicle No{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. CG 04 AB 1234"
                              value={vehicleNumber}
                              onChange={(e) =>
                                setVehicleNumber(e.target.value.toUpperCase())
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs uppercase font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Contact No{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Driver contact info"
                              value={driverContact}
                              onChange={(e) => setDriverContact(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Address For Lifting
                            </label>
                            <input
                              type="text"
                              placeholder="Enter lifting address"
                              value={liftingAddress}
                              onChange={(e) =>
                                setLiftingAddress(e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Bill No
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. INV-1002"
                              value={billNo}
                              onChange={(e) => setBillNo(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Bill Date
                            </label>
                            <input
                              type="date"
                              value={billDate}
                              onChange={(e) => setBillDate(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Expected Delivery Date{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              required
                              value={expectedDeliveryDate}
                              onChange={(e) =>
                                setExpectedDeliveryDate(e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>Transport Type</span>
                              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                (From PO)
                              </span>
                            </label>
                            <input
                              type="text"
                              readOnly
                              disabled
                              value={
                                selectedTransportType ||
                                transportType ||
                                "F.O.R."
                              }
                              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed select-none"
                            />
                          </div>

                          {!isForOrder && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  Transporting Rate (₹)
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Rate per kg"
                                  value={transportingRate}
                                  onChange={(e) =>
                                    handleTransportRateChange(e.target.value)
                                  }
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  Total Transporting Amount
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={totalTransportingAmount}
                                  onChange={(e) =>
                                    setTotalTransportingAmount(e.target.value)
                                  }
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  Bilty <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  value={hasBilty}
                                  onChange={(e) => setHasBilty(e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                                >
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              </div>

                              {hasBilty === "Yes" ? (
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    Bilty Number{" "}
                                    <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Enter bilty / LR number"
                                    value={biltyNumber}
                                    onChange={(e) =>
                                      setBiltyNumber(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                                  />
                                </div>
                              ) : (
                                <div className="hidden sm:block" />
                              )}

                              {hasBilty === "Yes" && (
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    Bilty Image{" "}
                                    <span className="text-rose-500">*</span>
                                  </label>
                                  <label className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer text-xs text-slate-500 dark:text-slate-400">
                                    <span className="truncate">
                                      {biltyImageName ||
                                        "Choose Bilty Image..."}
                                    </span>
                                    <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={handleBiltyUpload}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              )}

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  Bill Image
                                </label>
                                <label className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer text-xs text-slate-500 dark:text-slate-400">
                                  <span className="truncate">
                                    {billImageName || "Choose Bill Image..."}
                                  </span>
                                  <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleBillUpload}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </>
                          )}

                          <div className="space-y-1 sm:col-span-2 md:col-span-3">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Remarks
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Additional dispatch comments..."
                              value={dispatchRemarks}
                              onChange={(e) =>
                                setDispatchRemarks(e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>
                          {processMode === "follow-up"
                            ? "Save Follow-Up"
                            : processMode === "arrange-logistics"
                              ? "Save Logistics"
                              : "Dispatch Material"}
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
