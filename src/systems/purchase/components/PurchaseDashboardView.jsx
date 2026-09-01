import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Filter,
  Calendar,
  Users,
  Package,
  Truck,
  RotateCcw,
  Download,
  ChevronRight,
  Search,
  ArrowUpDown,
  Layers,
  Sparkles,
  Award,
  DollarSign,
  Building,
  CheckCircle2,
  ExternalLink,
  Timer,
  AlertOctagon,
  AlertTriangle,
  Activity,
  Eye,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { fetchMasterDivisions } from "../services/purchaseMasterApi";
import { formatDateDash } from "../utils/dateUtils";
import { generatePoPdf } from "../utils/poPdfGenerator";

const PIE_COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

export default function PurchaseDashboardView({ onNavigateStage }) {
  const {
    indents,
    purchaseOrders,
    transporterFollowups,
    materialReceipts,
    tallyBillings,
    orderCancellations,
    vendorLiftings,
    vendorPayments,
    tatMetrics,
    openTatModal,
    getIndentNumber,
  } = usePurchaseWorkflow();

  // Active Tab
  const [activeTab, setActiveTab] = useState("overview");

  // Filters State
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedParty, setSelectedParty] = useState("all");
  const [selectedMaterial, setSelectedMaterial] = useState("all");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [divisionOptions, setDivisionOptions] = useState([]);

  // Sub-Tab State
  const [poSubTab, setPoSubTab] = useState("pending");

  // Search State
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch Division Master records from divisions table
  useEffect(() => {
    let isMounted = true;
    fetchMasterDivisions().then((data) => {
      if (isMounted && data && data.length > 0) {
        const names = data
          .map((d) => String(d.name || d.division || "").trim())
          .filter(Boolean);
        setDivisionOptions([...new Set(names)].sort());
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Unique Filter Values (All available options across dataset)
  const uniqueParties = useMemo(() => {
    const parties = new Set();
    (purchaseOrders || []).forEach((p) => {
      if (p.vendor_name && p.vendor_name !== "-") parties.add(p.vendor_name);
    });
    (indents || []).forEach((i) => {
      if (i.selected_vendor_name && i.selected_vendor_name !== "-")
        parties.add(i.selected_vendor_name);
      (i.quotation_submissions || []).forEach((q) => {
        if (q.vendor_name && q.vendor_name !== "-") parties.add(q.vendor_name);
      });
    });
    return [...parties].sort();
  }, [purchaseOrders, indents]);

  const uniqueMaterials = useMemo(() => {
    const materials = new Set();
    (purchaseOrders || []).forEach((p) => {
      if (p.item_name && p.item_name !== "-") materials.add(p.item_name);
    });
    (indents || []).forEach((i) => {
      if (i.item_name && i.item_name !== "-") materials.add(i.item_name);
    });
    return [...materials].sort();
  }, [purchaseOrders, indents]);

  // Pure Divisions list from divisions table
  const uniqueDivisions = useMemo(() => {
    if (divisionOptions && divisionOptions.length > 0) {
      return divisionOptions;
    }
    return [];
  }, [divisionOptions]);

  // Helper matcher to check if record location/warehouse matches selected division
  const isDivisionMatched = useCallback(
    (recordLocation, recordWarehouse, recordDivision) => {
      if (selectedDivision === "all") return true;
      const target = selectedDivision.toLowerCase().trim();
      const loc = String(recordLocation || "")
        .toLowerCase()
        .trim();
      const wh = String(recordWarehouse || "")
        .toLowerCase()
        .trim();
      const div = String(recordDivision || "")
        .toLowerCase()
        .trim();

      return (
        loc === target ||
        wh === target ||
        div === target ||
        loc.includes(target) ||
        wh.includes(target) ||
        div.includes(target)
      );
    },
    [selectedDivision],
  );

  // Filter Matcher for Indents
  const isIndentMatching = useCallback(
    (i) => {
      const party =
        i.selected_vendor_name || i.approved_vendor?.vendor_name || "";
      const material = i.item_name || i.material || "";
      const date =
        i.planned_date ||
        i.actual_date ||
        i.approved_at ||
        (i.created_at ? i.created_at.split("T")[0] : "");
      const num = i.indent_number || i.indentNumber || "";

      if (selectedParty !== "all") {
        const hasParty =
          party === selectedParty ||
          (i.quotation_submissions || []).some(
            (q) => q.vendor_name === selectedParty,
          );
        if (!hasParty) return false;
      }
      if (selectedMaterial !== "all" && material !== selectedMaterial)
        return false;
      if (
        !isDivisionMatched(
          i.delivery_location,
          i.warehouse_location,
          i.division,
        )
      )
        return false;
      if (dateFrom && date && date < dateFrom) return false;
      if (dateTo && date && date > dateTo) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches =
          num.toLowerCase().includes(s) ||
          material.toLowerCase().includes(s) ||
          party.toLowerCase().includes(s) ||
          String(i.delivery_location || "")
            .toLowerCase()
            .includes(s) ||
          String(i.warehouse_location || "")
            .toLowerCase()
            .includes(s);
        if (!matches) return false;
      }
      return true;
    },
    [
      selectedParty,
      selectedMaterial,
      isDivisionMatched,
      dateFrom,
      dateTo,
      searchTerm,
    ],
  );

  // Filter Matcher for Purchase Orders
  const isPoMatching = useCallback(
    (po) => {
      const party = po.vendor_name || "-";
      const material = po.item_name || "-";
      const date =
        po.po_date || (po.created_at ? po.created_at.split("T")[0] : "-");
      const erp =
        po.po_number || (po.indent_number ? `PO-${po.indent_number}` : "-");

      if (selectedParty !== "all" && party !== selectedParty) return false;
      if (selectedMaterial !== "all" && material !== selectedMaterial)
        return false;
      if (
        !isDivisionMatched(
          po.delivery_location,
          po.warehouse_location,
          po.division,
        )
      )
        return false;
      if (dateFrom && date !== "-" && date < dateFrom) return false;
      if (dateTo && date !== "-" && date > dateTo) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches =
          erp.toLowerCase().includes(s) ||
          material.toLowerCase().includes(s) ||
          party.toLowerCase().includes(s) ||
          String(po.delivery_location || "")
            .toLowerCase()
            .includes(s);
        if (!matches) return false;
      }
      return true;
    },
    [
      selectedParty,
      selectedMaterial,
      isDivisionMatched,
      dateFrom,
      dateTo,
      searchTerm,
    ],
  );

  // Filtered Indents Dataset
  const filteredIndents = useMemo(() => {
    return (indents || []).filter(isIndentMatching);
  }, [indents, isIndentMatching]);

  // Filtered Purchase Orders Dataset
  const filteredPOs = useMemo(() => {
    return (purchaseOrders || []).filter(isPoMatching).map((po) => {
      const matchingLifts = (vendorLiftings || []).filter(
        (l) =>
          l.po_id === po.id ||
          l.po_id === po.po_number ||
          (po.po_number && l.po_number === po.po_number),
      );
      const matchingReceipts = (materialReceipts || []).filter(
        (r) =>
          r.po_id === po.id ||
          r.po_id === po.po_number ||
          (po.po_number && r.po_number === po.po_number),
      );
      const matchingCancels = (orderCancellations || []).filter(
        (c) =>
          c.po_id === po.id ||
          c.po_id === po.po_number ||
          (po.indent_id && c.indent_id === po.indent_id) ||
          (po.po_number && c.po_number === po.po_number),
      );

      const poQty = Number(po.quantity || 0);
      const liftedQty = matchingLifts.reduce(
        (sum, l) => sum + Number(l.lifting_qty || l.quantity || 0),
        0,
      );
      const receivedQty = matchingReceipts.reduce(
        (sum, r) =>
          sum + Number(r.accepted_quantity || r.received_quantity || 0),
        0,
      );
      const canceledQty = matchingCancels.reduce(
        (sum, c) =>
          sum +
          Number(c.cancelled_qty || c.financial_impact || c.quantity || 0),
        0,
      );
      const pendingQty = Math.max(0, poQty - receivedQty - canceledQty);
      const amount = Number(po.total_amount || poQty * (po.unit_rate || 0));
      const isComplete =
        po.status === "Completed" || (poQty > 0 && receivedQty >= poQty);

      return {
        id: po.id,
        erp:
          po.po_number ||
          (po.indent_number
            ? `PO-${po.indent_number}`
            : po.indent_id
              ? `PO-${getIndentNumber(po.indent_id)}`
              : "-"),
        material: po.item_name || "-",
        category: po.category || "General",
        party: po.vendor_name || "-",
        poQty,
        liftedQty,
        receivedQty,
        canceledQty,
        pendingQty,
        uom: po.uom || "NOS",
        warehouse: po.delivery_location || "-",
        leadTime: po.delivery_date || "-",
        date: po.po_date || po.created_at?.split("T")[0] || "-",
        isComplete,
        status: isComplete ? "Completed" : po.status || "PO Issued",
        amount,
        rawPo: po,
        poCopyUrl:
          po.po_copy_url ||
          po.po_pdf_url ||
          po.po_file_url ||
          po.file_url ||
          po.pdf_url ||
          "",
      };
    });
  }, [
    purchaseOrders,
    vendorLiftings,
    materialReceipts,
    orderCancellations,
    getIndentNumber,
    isPoMatching,
  ]);

  // Filtered In-Transit Dataset
  const filteredInTransit = useMemo(() => {
    return (transporterFollowups || [])
      .filter((t) => t.status !== "Received")
      .map((t) => {
        const po = (purchaseOrders || []).find(
          (p) => p.id === t.po_id || p.po_number === t.po_id,
        );
        const party = po?.vendor_name || "-";
        const material = po?.item_name || "-";
        const warehouse = po?.delivery_location || "-";
        const date = t.expected_arrival_date || t.dispatch_date || "-";
        const erp =
          po?.po_number ||
          po?.indent_number ||
          (getIndentNumber ? getIndentNumber(t.indent_id) : "-");

        return {
          id: t.id,
          po_id: t.po_id,
          indent_id: t.indent_id,
          erp,
          material,
          party,
          transporter: t.transporter_name || "-",
          truck: t.vehicle_number || "-",
          date,
          qty: Number(t.dispatch_qty || po?.quantity || 0),
          uom: po?.uom || "NOS",
          warehouse,
        };
      })
      .filter((item) => {
        if (selectedParty !== "all" && item.party !== selectedParty)
          return false;
        if (selectedMaterial !== "all" && item.material !== selectedMaterial)
          return false;
        if (!isDivisionMatched(item.warehouse, null, null)) return false;
        if (dateFrom && item.date !== "-" && item.date < dateFrom) return false;
        if (dateTo && item.date !== "-" && item.date > dateTo) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          return (
            item.erp.toLowerCase().includes(s) ||
            item.material.toLowerCase().includes(s) ||
            item.party.toLowerCase().includes(s) ||
            item.transporter.toLowerCase().includes(s) ||
            item.truck.toLowerCase().includes(s) ||
            item.warehouse.toLowerCase().includes(s)
          );
        }
        return true;
      });
  }, [
    transporterFollowups,
    purchaseOrders,
    getIndentNumber,
    selectedParty,
    selectedMaterial,
    isDivisionMatched,
    dateFrom,
    dateTo,
    searchTerm,
  ]);

  // Filtered Received Goods Dataset
  const filteredReceived = useMemo(() => {
    return (materialReceipts || [])
      .map((r) => {
        const po = (purchaseOrders || []).find(
          (p) => p.id === r.po_id || p.po_number === r.po_id,
        );
        const party = po?.vendor_name || "-";
        const material = po?.item_name || "-";
        const warehouse = po?.delivery_location || "-";
        const date = r.received_date || r.created_at?.split("T")[0] || "-";
        const erp = po?.po_number || r.po_id || "-";

        return {
          id: r.id,
          po_id: r.po_id,
          erp,
          material,
          party,
          date,
          qty: Number(r.accepted_quantity || r.received_quantity || 0),
          uom: po?.uom || "NOS",
          warehouse,
          billImage: r.invoice_copy_url || r.grn_copy_url || null,
        };
      })
      .filter((item) => {
        if (selectedParty !== "all" && item.party !== selectedParty)
          return false;
        if (selectedMaterial !== "all" && item.material !== selectedMaterial)
          return false;
        if (!isDivisionMatched(item.warehouse, null, null)) return false;
        if (dateFrom && item.date !== "-" && item.date < dateFrom) return false;
        if (dateTo && item.date !== "-" && item.date > dateTo) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          return (
            item.erp.toLowerCase().includes(s) ||
            item.material.toLowerCase().includes(s) ||
            item.party.toLowerCase().includes(s) ||
            item.warehouse.toLowerCase().includes(s)
          );
        }
        return true;
      });
  }, [
    materialReceipts,
    purchaseOrders,
    selectedParty,
    selectedMaterial,
    isDivisionMatched,
    dateFrom,
    dateTo,
    searchTerm,
  ]);

  // Pipeline Dynamic Counts (Pending & Completed for 10 core stages, completely filtered)
  const dynamicStages = useMemo(() => {
    const filteredPoIds = new Set(filteredPOs.map((p) => p.id));
    const filteredPoNumbers = new Set(filteredPOs.map((p) => p.erp));

    // Stage 1: Indent Approval
    const s1Pending = (filteredIndents || []).filter((i) => {
      const s = String(i.status || "").toLowerCase();
      return (
        s !== "approved" &&
        s !== "rejected" &&
        s !== "po issued" &&
        s !== "completed" &&
        s !== "cancelled" &&
        s !== "stage cancelled"
      );
    }).length;
    const s1Completed = (filteredIndents || []).filter((i) => {
      const s = String(i.status || "").toLowerCase();
      return (
        s === "approved" ||
        s === "rejected" ||
        s === "po issued" ||
        s === "completed"
      );
    }).length;

    // Stage 2: Quotation (Only New Vendor approved indents awaiting RFQs)
    const s2Pending = (filteredIndents || []).filter((i) => {
      const s = String(i.status || "").toLowerCase();
      const vType = String(i.vendor_type || i.vendorType || "").toLowerCase();
      const isNewVendor = vType === "new vendor" || vType === "new";
      return (
        (s === "approved" || s === "quotation pending") &&
        isNewVendor &&
        (!i.quotation_submissions || i.quotation_submissions.length === 0)
      );
    }).length;
    const s2Completed = (filteredIndents || []).filter((i) => {
      return (
        (i.quotation_submissions && i.quotation_submissions.length > 0) ||
        String(i.status || "").toLowerCase() === "po issued" ||
        String(i.status || "").toLowerCase() === "completed"
      );
    }).length;

    // Stage 3: Approved Vendor
    const s3Pending = (filteredIndents || []).filter((i) => {
      return (
        (i.quotation_submissions || []).length > 0 &&
        !i.selected_vendor_name &&
        !(i.approved_vendors && i.approved_vendors.length > 0)
      );
    }).length;
    const s3Completed = (filteredIndents || []).filter((i) => {
      return (
        !!i.selected_vendor_name ||
        (i.approved_vendors && i.approved_vendors.length > 0)
      );
    }).length;

    // Stage 4: Make PO (Direct regular vendors OR approved new vendors awaiting PO)
    const s4Pending = (filteredIndents || []).filter((i) => {
      const s = String(i.status || "").toLowerCase();
      const vType = String(i.vendor_type || i.vendorType || "").toLowerCase();
      const isNewVendor = vType === "new vendor" || vType === "new";
      const hasVendor =
        !!i.selected_vendor_name ||
        (i.approved_vendors && i.approved_vendors.length > 0);
      const hasPo = (purchaseOrders || []).some(
        (p) =>
          p.indent_id === i.id ||
          (p.indent_number && p.indent_number === i.indent_number),
      );

      const isRegularDirect = !isNewVendor && s === "approved" && !hasPo;
      const isApprovedNewVendor = hasVendor && !hasPo;
      return (
        (isRegularDirect || isApprovedNewVendor) &&
        s !== "po issued" &&
        s !== "cancelled"
      );
    }).length;
    const s4Completed = filteredPOs.length;

    // Stage 5: Payment
    const s5Pending = filteredPOs.filter(
      (p) => p.status === "Pending Advance" || p.status === "Advance Pending",
    ).length;
    const s5Completed =
      (vendorPayments || []).filter(
        (vp) =>
          filteredPoIds.has(vp.po_id) || filteredPoNumbers.has(vp.po_number),
      ).length ||
      filteredPOs.filter(
        (p) => p.status !== "Pending Advance" && p.status !== "Advance Pending",
      ).length;

    // Stage 6: Follow UP / Lifting
    const s6Pending = filteredPOs.filter(
      (p) =>
        p.status === "PO Issued" ||
        p.status === "Advance Settled / Ready for Lifting" ||
        p.status === "Partially Lifted",
    ).length;
    const s6Completed =
      (vendorLiftings || []).filter(
        (vl) =>
          filteredPoIds.has(vl.po_id) || filteredPoNumbers.has(vl.po_number),
      ).length ||
      filteredPOs.filter(
        (p) => p.status === "Completed" || p.status === "Lifted",
      ).length;

    // Stage 7: Transporter Follow-Up
    const s7Pending = (transporterFollowups || []).filter(
      (t) =>
        (filteredPoIds.has(t.po_id) || filteredPoNumbers.has(t.po_number)) &&
        t.status !== "Received",
    ).length;
    const s7Completed = (transporterFollowups || []).filter(
      (t) =>
        (filteredPoIds.has(t.po_id) || filteredPoNumbers.has(t.po_number)) &&
        t.status === "Received",
    ).length;

    // Stage 8: Material Received
    const s8Pending = (transporterFollowups || []).filter(
      (t) =>
        (filteredPoIds.has(t.po_id) || filteredPoNumbers.has(t.po_number)) &&
        t.status === "Received" &&
        !(materialReceipts || []).some(
          (r) => r.po_id === t.po_id || r.transporter_followup_id === t.id,
        ),
    ).length;
    const s8Completed = (materialReceipts || []).filter(
      (r) => filteredPoIds.has(r.po_id) || filteredPoNumbers.has(r.po_number),
    ).length;

    // Stage 9: Billing
    const s9Pending = (materialReceipts || []).filter(
      (r) =>
        (filteredPoIds.has(r.po_id) || filteredPoNumbers.has(r.po_number)) &&
        !(tallyBillings || []).some(
          (b) => b.po_id === r.po_id || b.material_receipt_id === r.id,
        ),
    ).length;
    const s9Completed = (tallyBillings || []).filter(
      (b) => filteredPoIds.has(b.po_id) || filteredPoNumbers.has(b.po_number),
    ).length;

    // Stage 10: Verified Billing
    const s10Pending = (tallyBillings || []).filter(
      (b) =>
        (filteredPoIds.has(b.po_id) || filteredPoNumbers.has(b.po_number)) &&
        b.verification_status !== "Verified" &&
        b.status !== "Verified",
    ).length;
    const s10Completed = (tallyBillings || []).filter(
      (b) =>
        (filteredPoIds.has(b.po_id) || filteredPoNumbers.has(b.po_number)) &&
        (b.verification_status === "Verified" || b.status === "Verified"),
    ).length;

    return [
      {
        id: 1,
        name: "Indent Approval",
        color: "bg-purple-500",
        text: "text-purple-600",
        pending: s1Pending,
        completed: s1Completed,
        slug: "indent-approval",
      },
      {
        id: 2,
        name: "Quotation",
        color: "bg-indigo-500",
        text: "text-indigo-600",
        pending: s2Pending,
        completed: s2Completed,
        slug: "quotation",
      },
      {
        id: 3,
        name: "Approved Vendor",
        color: "bg-cyan-500",
        text: "text-cyan-600",
        pending: s3Pending,
        completed: s3Completed,
        slug: "approved-vendor",
      },
      {
        id: 4,
        name: "Make PO",
        color: "bg-teal-500",
        text: "text-teal-600",
        pending: s4Pending,
        completed: s4Completed,
        slug: "po-entry",
      },
      {
        id: 5,
        name: "Payment",
        color: "bg-blue-500",
        text: "text-blue-600",
        pending: s5Pending,
        completed: s5Completed,
        slug: "payment",
      },
      {
        id: 6,
        name: "Follow UP / Lifting",
        color: "bg-emerald-500",
        text: "text-emerald-600",
        pending: s6Pending,
        completed: s6Completed,
        slug: "follow-up-vendor",
      },
      {
        id: 7,
        name: "Transporter Follow-Up",
        color: "bg-green-500",
        text: "text-green-600",
        pending: s7Pending,
        completed: s7Completed,
        slug: "transporter-follow-up",
      },
      {
        id: 8,
        name: "Material Received",
        color: "bg-lime-500",
        text: "text-lime-600",
        pending: s8Pending,
        completed: s8Completed,
        slug: "material-received",
      },
      {
        id: 9,
        name: "Billing",
        color: "bg-orange-500",
        text: "text-orange-600",
        pending: s9Pending,
        completed: s9Completed,
        slug: "receipt-in-tally",
      },
      {
        id: 10,
        name: "Verified Billing",
        color: "bg-yellow-500",
        text: "text-yellow-600",
        pending: s10Pending,
        completed: s10Completed,
        slug: "receipt-in-tally",
      },
    ];
  }, [
    filteredIndents,
    filteredPOs,
    purchaseOrders,
    transporterFollowups,
    materialReceipts,
    tallyBillings,
    vendorPayments,
    vendorLiftings,
  ]);

  // Top 4 KPI Metrics (Derived directly from filtered POs)
  const totalPurchaseOrders = filteredPOs.length;
  const completedPOs = filteredPOs.filter((p) => p.isComplete).length;
  const pendingPOs = totalPurchaseOrders - completedPOs;
  const completionRate =
    totalPurchaseOrders > 0
      ? Math.round((completedPOs / totalPurchaseOrders) * 100)
      : 0;

  // Top 10 Vendors (Derived directly from filtered POs)
  const top10Vendors = useMemo(() => {
    const map = {};
    filteredPOs.forEach((p) => {
      if (!p.party || p.party === "-") return;
      if (!map[p.party]) map[p.party] = { count: 0, amount: 0 };
      map[p.party].count += 1;
      map[p.party].amount += p.amount;
    });
    return Object.entries(map)
      .map(([vendor, s]) => ({ vendor, count: s.count, amount: s.amount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredPOs]);

  // Top 10 Products (Derived directly from filtered POs)
  const top10Products = useMemo(() => {
    const map = {};
    filteredPOs.forEach((p) => {
      if (!p.material || p.material === "-") return;
      if (!map[p.material])
        map[p.material] = { count: 0, totalQty: 0, uom: p.uom };
      map[p.material].count += 1;
      map[p.material].totalQty += p.poQty;
    });
    return Object.entries(map)
      .map(([product, s]) => ({
        product,
        count: s.count,
        totalQty: s.totalQty,
        uom: s.uom,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredPOs]);

  // Category Spend Analytics (Derived directly from filtered POs)
  const spendByCategoryData = useMemo(() => {
    const map = {};
    filteredPOs.forEach((p) => {
      const cat = p.category || "General";
      if (!map[cat]) map[cat] = 0;
      map[cat] += p.amount;
    });
    const result = Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
    }));
    return result.length > 0 ? result : [{ name: "General", amount: 0 }];
  }, [filteredPOs]);

  // Status Distribution Pie (Derived directly from filtered dataset)
  const statusPieData = useMemo(() => {
    const completed = filteredPOs.filter((p) => p.isComplete).length;
    const inTransit = filteredInTransit.length;
    const pending = filteredPOs.filter((p) => !p.isComplete).length;
    const items = [
      { name: "Completed", value: completed },
      { name: "In-Transit", value: inTransit },
      { name: "Pending", value: pending },
    ].filter((item) => item.value > 0);

    return items.length > 0 ? items : [{ name: "No Orders", value: 1 }];
  }, [filteredPOs, filteredInTransit]);

  const handleViewPoPdf = async (row) => {
    if (row.poCopyUrl) {
      window.open(row.poCopyUrl, "_blank");
      return;
    }
    try {
      await generatePoPdf(row.rawPo || row, { openWindow: true });
    } catch (err) {
      console.warn("Could not generate PO PDF:", err);
      if (row.rawPo?.pdf_url) {
        window.open(row.rawPo.pdf_url, "_blank");
      }
    }
  };

  const poSectionRef = useRef(null);

  const handleKpiCardClick = (targetSubTab = null) => {
    setActiveTab("purchase");
    if (targetSubTab) {
      setPoSubTab(targetSubTab);
    }
    setTimeout(() => {
      poSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Purchase Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor procurement workflows, vendor performance, highway
            in-transit cargo, and goods receipts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Generating Procurement Status Report PDF...")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 self-start sm:self-center"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Report</span>
        </button>
      </div>

      {/* 2. Smart Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Smart Filters
          </h3>
          <span className="text-[11px] text-slate-400">
            Refine data across all dashboard tables and graphs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden w-full"
              title="From Date"
            />
            <span className="text-slate-400 text-xs shrink-0">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden w-full"
              title="To Date"
            />
          </div>

          {/* Party Dropdown */}
          <select
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Party Names</option>
            {uniqueParties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Material Dropdown */}
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Materials</option>
            {uniqueMaterials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Division Dropdown */}
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Divisions</option>
            {uniqueDivisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Clear All */}
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setSelectedParty("all");
              setSelectedMaterial("all");
              setSelectedDivision("all");
              setSearchTerm("");
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* 3. Top 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total POs */}
        <div
          onClick={() => handleKpiCardClick()}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all active:scale-[0.99] group"
          title="Click to view all Purchase Orders"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleKpiCardClick()}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Total Purchase Orders
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalPurchaseOrders}
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
              Active Orders
            </p>
          </div>
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Pending POs */}
        <div
          onClick={() => handleKpiCardClick("pending")}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 transition-all active:scale-[0.99] group"
          title="Click to view Pending Purchase Orders"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleKpiCardClick("pending")}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
              Pending PO's
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-orange-500 dark:text-orange-400">
              {pendingPOs}
            </h3>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-1">
              Awaiting Action
            </p>
          </div>
          <div className="p-3.5 bg-orange-50 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400 rounded-2xl border border-orange-100 dark:border-orange-900/40 group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Completed POs */}
        <div
          onClick={() => handleKpiCardClick("completed")}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all active:scale-[0.99] group"
          title="Click to view Completed Purchase Orders"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleKpiCardClick("completed")}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Completed PO's
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {completedPOs}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              Delivered
            </p>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Completion Rate */}
        <div
          onClick={() => handleKpiCardClick()}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all active:scale-[0.99] group"
          title="Click to view Purchase Orders list"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleKpiCardClick()}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Completion Rate
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                {completionRate}%
              </h3>
            </div>
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3.5. SLA Compliance & TAT Engine Analytics */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Purchase System Turn Around Time (TAT) & SLA Performance</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold">
                  {tatMetrics?.overallComplianceRate ?? 100}% Compliance
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time tracking of procurement stages against authoritative Master SLA benchmarks.
              </p>
            </div>
          </div>

          {/* Quick Filter Counters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Active: {tatMetrics?.totalActive ?? 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>On Track: {tatMetrics?.onTrackCount ?? 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>At Risk: {tatMetrics?.atRiskCount ?? 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Breached: {tatMetrics?.breachedCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Stage-wise SLA Performance Bar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(tatMetrics?.stageStats || []).slice(0, 9).map((stg) => {
            const isCritical = stg.complianceRate < 80 && stg.totalCount > 0;
            return (
              <div
                key={stg.section_name}
                className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate block">
                      {stg.shortName || stg.section_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Owner: {stg.ownerRole || "Procurement"}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${
                      isCritical
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {stg.complianceRate}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isCritical ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(5, stg.complianceRate)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Processed: {stg.totalCount}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ {stg.withinSlaCount + stg.onTrackCount}
                    </span>
                    {stg.breachedCount > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        🔴 {stg.breachedCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 12-Stage Pipeline Funnel Counters */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Stage Pipeline Status & Active Queues
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any stage to view details
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {dynamicStages.map((stg) => (
            <div
              key={stg.id}
              onClick={() => onNavigateStage && onNavigateStage(stg.slug)}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl transition-all text-left cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 dark:group-hover:border-blue-800">
                    Stage {stg.id}
                  </span>
                </div>
                <span
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 truncate block mb-2.5"
                  title={stg.name}
                >
                  {stg.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                <div className="flex flex-col items-center justify-center p-1 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-lg">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Pending
                  </span>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                    {stg.pending}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-lg">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Complete
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                    {stg.completed}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Main Dashboard Tabs: Overview, Purchase Order, In-Transit, Received */}
      <div
        ref={poSectionRef}
        id="purchase-orders-tab-section"
        className="space-y-4 scroll-mt-6"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("purchase")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "purchase"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Purchase Order ({filteredPOs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("intransit")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "intransit"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            In-Transit ({filteredInTransit.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "received"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Received ({filteredReceived.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW TAB CONTENT */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top 10 Vendors + Top 10 Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 10 Vendors */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Top 10 Vendors
                    </h3>
                    <p className="text-xs text-slate-500">
                      Suppliers ranked by total purchase orders
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    By PO Count
                  </span>
                </div>

                <div className="overflow-x-auto">
                  {top10Vendors.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                      No vendor purchase data available.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                          <th className="pb-2 w-8">#</th>
                          <th className="pb-2">Vendor Name</th>
                          <th className="pb-2 text-center">POs</th>
                          <th className="pb-2 text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {top10Vendors.map((v, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-2.5">
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                  idx === 0
                                    ? "bg-amber-100 text-amber-800"
                                    : idx === 1
                                      ? "bg-slate-200 text-slate-700"
                                      : idx === 2
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                              {v.vendor}
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {v.count}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{v.amount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Top 10 Products */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      Top 10 Products
                    </h3>
                    <p className="text-xs text-slate-500">
                      Most purchased items by order frequency
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    By PO Count
                  </span>
                </div>

                <div className="overflow-x-auto">
                  {top10Products.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                      No product order history available.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                          <th className="pb-2 w-8">#</th>
                          <th className="pb-2">Product Name</th>
                          <th className="pb-2 text-center">POs</th>
                          <th className="pb-2 text-right">Total Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {top10Products.map((p, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-2.5">
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                  idx === 0
                                    ? "bg-amber-100 text-amber-800"
                                    : idx === 1
                                      ? "bg-slate-200 text-slate-700"
                                      : idx === 2
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                              {p.product}
                            </td>
                            <td className="py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                {p.count}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {p.totalQty.toLocaleString("en-IN")} {p.uom}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Analytical Recharts Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spend by Category Bar Chart */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                  Procurement Spend by Material Category
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Financial expenditure distribution
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendByCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="name"
                        textAnchor="end"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val) => [
                          `₹${Number(val).toLocaleString("en-IN")}`,
                          "Spend",
                        ]}
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#3B82F6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Order Status Distribution Pie Chart */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                  Purchase Order Lifecycle Status
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Stage distribution across active requisitions
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusPieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PURCHASE ORDER TAB CONTENT */}
        {activeTab === "purchase" && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            {/* Sub-Tabs (Pending vs Completed) & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPoSubTab("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    poSubTab === "pending"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Pending POs ({filteredPOs.filter((p) => !p.isComplete).length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setPoSubTab("completed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    poSubTab === "completed"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Completed POs (
                  {filteredPOs.filter((p) => p.isComplete).length})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PO, material, vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* PO Register Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Material Name</th>
                    <th className="p-3">Supplier / Party</th>
                    <th className="p-3 text-center">PO Qty</th>
                    <th className="p-3 text-center">Lifted</th>
                    <th className="p-3 text-center">Received</th>
                    <th className="p-3 text-center">Cancel Order</th>
                    <th className="p-3 text-center">Pending Qty</th>
                    <th className="p-3">Plant Location</th>
                    <th className="p-3">Expected Date</th>
                    <th className="p-3 text-center">PO Copy</th>
                    <th className="p-3 text-center">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPOs
                    .filter((p) =>
                      poSubTab === "pending" ? !p.isComplete : p.isComplete,
                    )
                    .map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.erp}
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                          {row.material}
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {row.party}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {row.poQty} {row.uom}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {row.liftedQty}
                        </td>
                        <td className="p-3 text-center font-mono text-emerald-600 font-bold">
                          {row.receivedQty}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {row.canceledQty > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                              {row.canceledQty} {row.uom}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">
                              0
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-amber-600 font-bold">
                          {row.pendingQty}
                        </td>
                        <td className="p-3 text-slate-500">{row.warehouse}</td>
                        <td className="p-3 font-mono text-slate-500">
                          {formatDateDash(row.leadTime)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleViewPoPdf(row)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                            title="View / Open PO PDF in new tab"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>View PDF</span>
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              row.isComplete
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {filteredPOs.filter((p) =>
                    poSubTab === "pending" ? !p.isComplete : p.isComplete,
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="p-8 text-center text-slate-400 font-semibold"
                      >
                        No purchase orders matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: IN-TRANSIT TAB CONTENT */}
        {activeTab === "intransit" && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Active Highway Cargo In-Transit
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                {filteredInTransit.length} Consignments on Road
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Material</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Logistics Transporter</th>
                    <th className="p-3">Truck Number</th>
                    <th className="p-3">Expected Arrival</th>
                    <th className="p-3 text-right">In-Transit Qty</th>
                    <th className="p-3">Destination Plant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInTransit.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20"
                    >
                      <td className="p-3 font-mono font-bold text-blue-600">
                        {row.erp}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {row.material}
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {row.party}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {row.transporter}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {row.truck}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {formatDateDash(row.date)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {row.qty} {row.uom}
                      </td>
                      <td className="p-3 text-slate-500">{row.warehouse}</td>
                    </tr>
                  ))}
                  {filteredInTransit.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-8 text-center text-slate-400 font-semibold"
                      >
                        No shipments currently in transit on the highway.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RECEIVED TAB CONTENT */}
        {activeTab === "received" && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Material Received & Gate Inward (GRN) Register
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                {filteredReceived.length} Consignments Inwarded
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Material Specification</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Received Date</th>
                    <th className="p-3 text-right">Received Qty</th>
                    <th className="p-3">Inward Store</th>
                    <th className="p-3 text-center">Bilty / GRN Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReceived.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
                    >
                      <td className="p-3 font-mono font-bold text-blue-600">
                        {row.erp}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {row.material}
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {row.party}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {formatDateDash(row.date)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600">
                        {row.qty} {row.uom}
                      </td>
                      <td className="p-3 text-slate-500">{row.warehouse}</td>
                      <td className="p-3 text-center">
                        {row.billImage ? (
                          <a
                            href={row.billImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredReceived.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-slate-400 font-semibold"
                      >
                        No goods receipt inwards logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
