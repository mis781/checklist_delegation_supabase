import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  ExternalLink,
  Loader2,
  X,
  Plus,
  Send,
  Download,
  Building,
  DollarSign,
  Truck,
  Calendar,
  AlertCircle,
  FileCheck,
  Eye,
  FileEdit,
  ShieldCheck,
  ClipboardList,
  Trash2,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { getApproversForIndents } from "../services/purchaseWorkflowApi";
import {
  generatePoPdf,
  generatePoPdfBlob,
} from "../utils/purchasePdfGenerator";
import TatStageBadge from "./TatStageBadge";
import { sendPoWhatsappNotification } from "../../whatsappDash/services/whatsappApi";
import nutechLogo from "../../../assets/nutech-logo.png";

const NUTECH_ADDRESS =
  "Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, Chattisgarh, India, Raipur, Chattisgarh 493111, IN";

const PAYMENT_TERMS_OPTIONS = [
  { value: "Advance", label: "Advance" },
  { value: "15", label: "15" },
  { value: "30", label: "30" },
  { value: "60", label: "60" },
  { value: "90", label: "90" },
  { value: "Custom", label: "Custom / Type Manually..." },
];

const DEFAULT_GST_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const DEFAULT_TERMS = [];

const cleanCompanyName = (name) => {
  if (!name) return "Company Address";
  if (typeof name !== "string") return String(name);
  if (name.includes(" - ")) {
    const parts = name.split(" - ");
    return parts.slice(1).join(" - ").trim();
  }
  return name.trim();
};

const ADDRESS_OPTIONS = [
  { name: "M/S Nutech Pvt. Ltd.", address: NUTECH_ADDRESS },
  {
    name: "Nutech Plant 1 - Raipur Factory Gate 2",
    address: "Plot 12-16, Industrial Area Phase II, Urla, Raipur, CG 493221",
  },
  {
    name: "Nutech Division A - Bhilai Unit",
    address: "Light Industrial Area, Nandini Road, Bhilai, CG 490026",
  },
  {
    name: "Nutech Division B - Bilaspur Central Store",
    address: "Transport Nagar, Korba Road, Bilaspur, CG 495004",
  },
];

import {
  fetchMasterVendors,
  fetchMasterWarehouses,
  fetchMasterAddresses,
  fetchMasterTransportTypes,
  fetchMasterGstRates,
  fetchMasterPoTerms,
  addMasterPoTerm,
  deleteMasterPoTerm,
  fetchSystemMasterLookups,
} from "../services/purchaseMasterApi";
import {
  formatDateDash,
  formatDateTime,
  formatForDateInput,
  toLocalIsoTimestamp,
} from "../utils/dateUtils";

export default function PoEntryView() {
  const { showToast } = useMagicToast();
  const {
    indents,
    purchaseOrders,
    approvedVendors,
    quotations,
    createPurchaseOrder,
    revisePurchaseOrder,
    getTatStatusForIndent,
    openTatModal,
    refreshData,
    getIndentNumber,
  } = usePurchaseWorkflow();

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Master Lookups
  const [dbVendors, setDbVendors] = useState([]);
  const [dbWarehouses, setDbWarehouses] = useState([]);
  const [dbAddresses, setDbAddresses] = useState([]);
  const [dbTransportTypes, setDbTransportTypes] = useState([]);
  const [dbGstRates, setDbGstRates] = useState(DEFAULT_GST_OPTIONS);
  const [masterPoTermsList, setMasterPoTermsList] = useState([]);
  const [catalogMaterials, setCatalogMaterials] = useState([]);
  const [newPoTermInput, setNewPoTermInput] = useState("");
  const [isAddingTerm, setIsAddingTerm] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [poMode, setPoMode] = useState("create"); // "create" | "revise"
  const [selectedIndents, setSelectedIndents] = useState([]);

  // Form State
  const [firmName, setFirmName] = useState("Nutech Pipes");
  const [supplierName, setSupplierName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryLocation, setDeliveryLocation] = useState("Nutech Pipes");
  const [transportType, setTransportType] = useState("Select Transport Type");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [customPaymentTerms, setCustomPaymentTerms] = useState("");
  const [supplierContactPerson, setSupplierContactPerson] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierBillingAddress, setSupplierBillingAddress] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [supplierPan, setSupplierPan] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [advancePayment, setAdvancePayment] = useState("no");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [remarks, setRemarks] = useState("");

  // Addresses
  const [billingName, setBillingName] = useState(ADDRESS_OPTIONS[0].name);
  const [billingAddress, setBillingAddress] = useState(
    ADDRESS_OPTIONS[0].address,
  );
  const [destName, setDestName] = useState(ADDRESS_OPTIONS[0].name);
  const [destAddress, setDestAddress] = useState(ADDRESS_OPTIONS[0].address);

  const combinedAddressOptions = useMemo(() => {
    const list =
      dbAddresses && dbAddresses.length > 0 ? dbAddresses : ADDRESS_OPTIONS;
    return list.map((a) => {
      const rawName = a.rawName || a.name || "";
      const cleaned = cleanCompanyName(rawName);
      return {
        name: cleaned,
        fullName: a.name || rawName,
        address: a.address || a.address_line || NUTECH_ADDRESS,
      };
    });
  }, [dbAddresses]);

  // Line Items: indentId -> { rate, hsn, gst, deliveryDate, total }
  const [lineItems, setLineItems] = useState({});
  const [terms, setTerms] = useState(DEFAULT_TERMS);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Load live master data on mount
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [
          vList,
          whList,
          addrList,
          ttList,
          gstList,
          poTermsList,
          systemLookups,
        ] = await Promise.all([
          fetchMasterVendors(),
          fetchMasterWarehouses(),
          fetchMasterAddresses(),
          fetchMasterTransportTypes(),
          fetchMasterGstRates(),
          fetchMasterPoTerms(),
          fetchSystemMasterLookups(),
        ]);
        if (vList) setDbVendors(vList);
        if (whList) setDbWarehouses(whList);
        if (addrList && addrList.length > 0) setDbAddresses(addrList);
        if (ttList) setDbTransportTypes(ttList);
        if (gstList && gstList.length > 0) setDbGstRates(gstList);
        if (poTermsList && poTermsList.length > 0) {
          setMasterPoTermsList(poTermsList);
        }
        if (
          systemLookups?.items ||
          systemLookups?.rawMaterials ||
          systemLookups?.finishedGoods ||
          systemLookups?.materials
        ) {
          const combined = [
            ...(systemLookups.rawMaterials || []),
            ...(systemLookups.finishedGoods || []),
            ...(systemLookups.items || []),
            ...(systemLookups.materials || []),
          ];
          setCatalogMaterials(combined);
        }
      } catch (e) {
        console.warn("Error loading PO master data", e);
      }
    };
    loadMasters();
  }, []);

  // Filtered Lists
  const pendingList = useMemo(() => {
    return indents
      .filter((r) => {
        const status = String(r.status || "").toLowerCase();
        const av =
          (approvedVendors || []).find((a) => a.indent_id === r.id) ||
          r.approved_vendor;
        const vendorName = r.selected_vendor_name || av?.vendor_name;
        const hasVendor = !!vendorName;
        const hasPo = purchaseOrders.some((po) => po.indent_id === r.id);
        const vType = String(
          r.vendor_type || r.vendorType || av?.vendor_type || "",
        ).toLowerCase();
        const isNewVendor = vType === "new vendor" || vType === "new";

        // Condition for PO Creation pending list:
        // 1. Regular Vendor: Indent was approved at Stage 3 with Regular Vendor (bypasses RFQ & quotation approval stages) and no PO issued yet.
        // 2. New Vendor: Indent was approved with New Vendor, completed RFQ & vendor selection at Stage 5, and no PO issued yet.
        const isPendingRegularVendor =
          !isNewVendor && status === "approved" && !hasPo;
        const isPendingNewVendor =
          hasVendor &&
          !hasPo &&
          status !== "po issued" &&
          status !== "cancelled";

        return (
          (isPendingRegularVendor || isPendingNewVendor) &&
          status !== "po issued" &&
          status !== "cancelled"
        );
      })
      .map((r) => {
        const av =
          (approvedVendors || []).find((a) => a.indent_id === r.id) ||
          r.approved_vendor;
        const vType = String(
          r.vendor_type || r.vendorType || av?.vendor_type || "",
        ).toLowerCase();
        const isNewVendor = vType === "new vendor" || vType === "new";
        const hasVendor = !!(r.selected_vendor_name || av?.vendor_name);

        const vendorName = !hasVendor
          ? r.selected_vendor_name || "Regular Vendor (To Select)"
          : r.selected_vendor_name || av?.vendor_name || "";

        const rate = !hasVendor
          ? Number(r.unit_rate || r.rate) || 0
          : Number(
              r.final_agreed_rate || av?.final_agreed_rate || r.unit_rate,
            ) || 0;

        const qty = Number(r.approved_quantity || r.quantity) || 1;
        const total = rate * qty * 1.18;

        return {
          ...r,
          indentNumber: r.indent_number || `IND-${r.id?.slice(0, 4) || "001"}`,
          itemName: r.item_name || "Material Item",
          qty: `${qty} ${r.uom || "NOS"}`,
          plannedDate: r.planned_date || r.lead_time || r.required_date || null,
          approverName:
            r.approver_name ||
            r.approverName ||
            r.approver_username ||
            r.approved_by ||
            r.created_by ||
            "—",
          vendorName: vendorName,
          rate: rate > 0 ? `₹${rate.toLocaleString()}` : "To Fill",
          totalAmount:
            total > 0
              ? `₹${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—",
          freightType:
            r.transport_type || av?.transport_type || "Ex-Factory + Transport",
          paymentTerms: r.payment_terms || av?.payment_terms || "30",
          expDelivery:
            r.lead_time ||
            r.delivery_terms ||
            r.delivery_date ||
            r.expected_delivery_date ||
            r.required_date ||
            null,
        };
      })
      .filter(
        (r) =>
          divisionFilter === "all" || r.warehouse_location === divisionFilter,
      )
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indentNumber && r.indentNumber.toLowerCase().includes(s)) ||
          (r.itemName && r.itemName.toLowerCase().includes(s)) ||
          (r.vendorName && r.vendorName.toLowerCase().includes(s))
        );
      });
  }, [indents, purchaseOrders, approvedVendors, searchTerm, divisionFilter]);

  const historyList = useMemo(() => {
    return purchaseOrders
      .map((po) => {
        const rate = Number(po.unit_rate || 0);
        const qty = Number(po.quantity || 1);
        const total = Number(po.total_amount || rate * qty * 1.18);
        const gst = String(po.gst_rate || "18%").replace("%", "");

        return {
          ...po,
          timestamp: po.created_at || po.po_date || null,
          itemDetails: `${po.item_name || "Material Item"} (${qty} ${po.uom || "NOS"})`,
          plannedDate: po.delivery_date || po.po_date || null,
          actualDate: po.po_date || po.created_at || null,
          vendorInfo: po.vendor_name || "",
          termsDelivery: `${po.payment_type || "30 Days"} • ${po.transport_type || "F.O.R."}`,
          poDetails: `${po.po_number} (HSN: ${po.hsn_code || "-"})`,
          financials: `Rate: ₹${rate.toLocaleString()} + ${gst}% GST`,
          totalAmount: `₹${total.toLocaleString()}`,
          remarks: po.remarks || null,
        };
      })
      .filter(
        (po) =>
          divisionFilter === "all" || po.delivery_location === divisionFilter,
      )
      .filter((po) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (po.po_number && po.po_number.toLowerCase().includes(s)) ||
          (po.vendor_name && po.vendor_name.toLowerCase().includes(s)) ||
          (po.item_name && po.item_name.toLowerCase().includes(s))
        );
      });
  }, [purchaseOrders, searchTerm, divisionFilter]);

  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  const warehouseOptions = useMemo(() => {
    const list = dbWarehouses.length > 0 ? dbWarehouses : [];
    return list.map((w) =>
      typeof w === "string" ? w : w.name || w.warehouse_name,
    );
  }, [dbWarehouses]);

  // Checkbox Selection
  const toggleRecord = (id) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedRecordIds.length === pendingList.length)
      setSelectedRecordIds([]);
    else setSelectedRecordIds(pendingList.map((r) => r.id));
  };

  // Vendor Lookup helper
  const updateSupplierFields = (vName) => {
    setSupplierName(vName);
    const foundVendor = dbVendors.find(
      (v) => (v.vendor_name || v.name)?.toLowerCase() === vName?.toLowerCase(),
    );
    if (foundVendor) {
      setSupplierEmail(foundVendor.email || "");
      setSupplierPhone(foundVendor.phone || "");
      setSupplierContactPerson(
        foundVendor.contact_person || foundVendor.contactPerson || "",
      );
      setSupplierAddress(foundVendor.address || "");
      setSupplierBillingAddress(foundVendor.address || "");
      setSupplierGstin(foundVendor.gstin || "");
      setSupplierPan(foundVendor.pan || "");
    } else {
      setSupplierEmail("");
      setSupplierPhone("");
      setSupplierContactPerson("");
      setSupplierAddress("");
      setSupplierBillingAddress("");
      setSupplierGstin("");
      setSupplierPan("");
    }
  };

  // Detect if current PO is from approved quotation (locked fields) or direct regular vendor entry (editable fields)
  const isRegularVendor = useMemo(() => {
    if (poMode === "revise") return false;
    if (!selectedIndents || selectedIndents.length === 0) return false;

    return selectedIndents.every((ind) => {
      const av =
        (approvedVendors || []).find((a) => a.indent_id === ind.id) ||
        ind.approved_vendor;
      const quotes =
        ind.quotation_submissions ||
        (quotations || []).filter((q) => q.indent_id === ind.id) ||
        [];
      const vType = String(
        ind.vendor_type || ind.vendorType || av?.vendor_type || "",
      ).toLowerCase();
      const isNewVendor = vType === "new vendor" || vType === "new";

      // Direct regular vendor (no quotation) -> editable fields
      if (!isNewVendor && quotes.length === 0 && !av?.vendor_name) {
        return false;
      }
      // If quotes exist or approved vendor selected (e.g. from New Vendor RFQ path) -> locked/prefilled from quote
      return quotes.length > 0 || !!av?.vendor_name;
    });
  }, [selectedIndents, approvedVendors, quotations, poMode]);

  // Open Create PO Modal
  const handleOpenCreatePO = (targetRow = null) => {
    let items = [];
    if (targetRow) {
      items = [targetRow];
    } else {
      items = pendingList.filter((r) => selectedRecordIds.includes(r.id));
    }

    if (items.length === 0) {
      if (showToast)
        showToast("Please select at least one pending requisition", "warning");
      return;
    }

    setSelectedIndents(items);
    setPoMode("create");

    const primary = items[0];
    const primaryAv =
      (approvedVendors || []).find((a) => a.indent_id === primary.id) ||
      primary.approved_vendor;
    const primaryQuotes =
      primary.quotation_submissions ||
      (quotations || []).filter((q) => q.indent_id === primary.id) ||
      [];
    const primaryQuote =
      primaryQuotes.find(
        (q) =>
          (primaryAv?.selected_quotation_id &&
            q.id === primaryAv.selected_quotation_id) ||
          q.is_selected,
      ) ||
      primaryQuotes.find(
        (q) =>
          q.vendor_name ===
          (primary.selected_vendor_name || primaryAv?.vendor_name),
      ) ||
      primaryQuotes[0];

    const primaryVType = String(
      primary.vendor_type || primary.vendorType || primaryAv?.vendor_type || "",
    ).toLowerCase();
    const primaryHasApprovedQuote =
      primaryQuotes.length > 0 || !!primaryAv?.vendor_name;
    const isDirectEntry = !primaryHasApprovedQuote;

    const generatedPoNo = `PO-${Math.floor(1000 + Math.random() * 9000)}`;
    setPoNumber(generatedPoNo);
    setPoDate(new Date().toISOString().split("T")[0]);
    setFirmName(primary.warehouse_location || "Nutech Pipes");

    // Resolve Company Address Name for Delivery Location
    const rawDivision =
      primary.warehouse_location || primary.division_name || "";
    const matchedAddress = (dbAddresses || []).find((a) => {
      const aDiv = a.division || a.division_name || "";
      const aName = a.name || "";
      return (
        (aDiv &&
          rawDivision &&
          aDiv.toLowerCase() === rawDivision.toLowerCase()) ||
        (aName &&
          rawDivision &&
          aName.toLowerCase().includes(rawDivision.toLowerCase()))
      );
    });

    const defaultAddressName = matchedAddress
      ? cleanCompanyName(matchedAddress.name)
      : dbAddresses && dbAddresses.length > 0
        ? cleanCompanyName(dbAddresses[0].name)
        : ADDRESS_OPTIONS[0].name;

    setDeliveryLocation(defaultAddressName);
    setDestName(defaultAddressName);
    const matchedAddrObj = (dbAddresses || []).find(
      (a) => cleanCompanyName(a.name) === defaultAddressName,
    );
    if (matchedAddrObj) {
      setDestAddress(
        matchedAddrObj.address || matchedAddrObj.address_line || NUTECH_ADDRESS,
      );
    }

    // Prefill Transport Type from Vendor Quote / Approved Vendor
    const targetTransportType =
      primaryQuote?.transport_type ||
      primaryAv?.transport_type ||
      primary.transport_type ||
      primary.freightType ||
      "Ex-Factory + Transport";
    setTransportType(targetTransportType);

    // Prefill Payment Terms from Vendor Quote / Approved Vendor
    const rawPaymentTerms =
      primaryQuote?.payment_terms ||
      primaryAv?.payment_terms ||
      primary.payment_terms ||
      "30";

    const matchedTerm = PAYMENT_TERMS_OPTIONS.find((opt) =>
      String(rawPaymentTerms).toLowerCase().includes(opt.value.toLowerCase()),
    );
    if (matchedTerm) {
      setPaymentTerms(matchedTerm.value);
    } else if (rawPaymentTerms) {
      const num = String(rawPaymentTerms).replace(/\D/g, "");
      if (num && PAYMENT_TERMS_OPTIONS.some((o) => o.value === num)) {
        setPaymentTerms(num);
      } else {
        setPaymentTerms("Custom");
        setCustomPaymentTerms(rawPaymentTerms);
      }
    } else {
      setPaymentTerms("30");
    }

    const targetVendor = isDirectEntry
      ? primary.selected_vendor_name || primary.vendorName || ""
      : primary.vendorName ||
        primary.selected_vendor_name ||
        primaryAv?.vendor_name ||
        primaryQuote?.vendor_name ||
        "";
    updateSupplierFields(targetVendor);

    setQuotationNumber(`QUO-${primary.indentNumber || primary.id}`);
    setQuotationDate(new Date().toISOString().split("T")[0]);
    setAdvancePayment("no");
    setAdvanceAmount("0");
    setRemarks(primary.remarks || "");
    setTerms([]);

    const lines = {};
    items.forEach((it) => {
      const av =
        (approvedVendors || []).find((a) => a.indent_id === it.id) ||
        it.approved_vendor;
      const quotes =
        it.quotation_submissions ||
        (quotations || []).filter((q) => q.indent_id === it.id) ||
        [];
      const selectedQuote =
        quotes.find(
          (q) =>
            (av?.selected_quotation_id && q.id === av.selected_quotation_id) ||
            q.is_selected,
        ) ||
        quotes.find(
          (q) => q.vendor_name === (it.selected_vendor_name || av?.vendor_name),
        ) ||
        quotes[0];

      const itVType = String(
        it.vendor_type || it.vendorType || av?.vendor_type || "",
      ).toLowerCase();
      const itHasApprovedQuote = quotes.length > 0 || !!av?.vendor_name;

      // Prefilled Delivery Date from vendor submitted quote or approved vendor
      const vendorSubmittedDeliveryDate =
        selectedQuote?.delivery_terms ||
        selectedQuote?.delivery_date ||
        selectedQuote?.expected_delivery_date ||
        av?.delivery_date ||
        av?.delivery_terms ||
        it.expected_delivery_date ||
        it.lead_time ||
        it.required_date ||
        "";

      const prefilledDeliveryDate = formatForDateInput(
        vendorSubmittedDeliveryDate,
      );

      const agreedRate = !itHasApprovedQuote
        ? Number(it.unit_rate || it.rate) || 0
        : Number(
            av?.final_agreed_rate ||
              it.final_agreed_rate ||
              selectedQuote?.quoted_rate ||
              it.selected_vendor_rate ||
              it.unit_rate ||
              500,
          );
      const itemName = (it.item_name || it.itemName || "").trim();
      const itemCode = (it.item_code || it.itemCode || "").trim();
      const matchedMat = (catalogMaterials || []).find(
        (m) =>
          (m.name &&
            itemName &&
            m.name.toLowerCase().trim() === itemName.toLowerCase()) ||
          (m.item_name &&
            itemName &&
            m.item_name.toLowerCase().trim() === itemName.toLowerCase()) ||
          (m.sku &&
            itemCode &&
            m.sku.toLowerCase().trim() === itemCode.toLowerCase()) ||
          (m.item_code &&
            itemCode &&
            m.item_code.toLowerCase().trim() === itemCode.toLowerCase()),
      );
      const detectedHsn =
        matchedMat?.hsn_code ||
        matchedMat?.hsnCode ||
        matchedMat?.hsn ||
        it.hsn_code ||
        it.hsnCode ||
        (itemCode && /^\d{4,8}$/.test(itemCode) ? itemCode : "") ||
        "7216";
      const detectedGst =
        selectedQuote?.gst_percent != null
          ? String(selectedQuote.gst_percent)
          : it.gst_percent != null
            ? String(it.gst_percent)
            : "18";

      lines[it.id] = {
        rate: agreedRate > 0 ? String(agreedRate) : "",
        hsn: String(detectedHsn),
        gst: String(detectedGst),
        deliveryDate: prefilledDeliveryDate,
      };
    });
    setLineItems(lines);
    setModalOpen(true);
  };

  // Populate all PO fields comprehensively for Revise mode
  const populatePoFields = (po) => {
    if (!po) return;
    setPoNumber(po.po_number || "");
    const formattedPoDate =
      formatForDateInput(po.po_date) ||
      formatForDateInput(po.created_at) ||
      formatForDateInput(po.timestamp) ||
      new Date().toISOString().split("T")[0];
    setPoDate(formattedPoDate);

    const defaultReviseAddr = cleanCompanyName(
      po.delivery_location ||
        po.destinationName ||
        (dbAddresses && dbAddresses[0]
          ? dbAddresses[0].name
          : ADDRESS_OPTIONS[0].name),
    );
    setFirmName(
      po.consigneeName ||
        po.billingName ||
        po.firm_name ||
        "Nutech Pipes Pvt. Ltd.",
    );
    setDeliveryLocation(po.delivery_location || defaultReviseAddr);

    // Addresses
    setBillingName(
      po.billingName || po.consigneeName || po.firm_name || defaultReviseAddr,
    );
    setBillingAddress(
      po.billingAddress || po.consigneeAddress || NUTECH_ADDRESS,
    );
    setDestName(
      po.destinationName || po.delivery_location || defaultReviseAddr,
    );
    const matchedAddrObj = (dbAddresses || []).find(
      (a) => cleanCompanyName(a.name) === defaultReviseAddr,
    );
    setDestAddress(
      po.destinationAddress ||
        po.delivery_location_address ||
        matchedAddrObj?.address ||
        matchedAddrObj?.address_line ||
        NUTECH_ADDRESS,
    );

    setTransportType(
      po.transport_type || po.transportType || "Ex-Factory + Transport",
    );

    // Payment Terms
    const pTerms = String(po.payment_type || po.paymentTerms || "30");
    if (PAYMENT_TERMS_OPTIONS.some((o) => o.value === pTerms)) {
      setPaymentTerms(pTerms);
      setCustomPaymentTerms("");
    } else {
      setPaymentTerms("Custom");
      setCustomPaymentTerms(pTerms);
    }

    // Vendor Information
    updateSupplierFields(po.vendor_name || po.supplierName || "");
    if (po.vendor_contact || po.supplierContactPerson)
      setSupplierContactPerson(po.vendor_contact || po.supplierContactPerson);
    if (po.vendor_phone || po.supplierPhone)
      setSupplierPhone(po.vendor_phone || po.supplierPhone);
    if (po.vendor_email || po.supplierEmail)
      setSupplierEmail(po.vendor_email || po.supplierEmail);
    if (po.vendor_address || po.supplierAddress)
      setSupplierAddress(po.vendor_address || po.supplierAddress);
    if (po.vendor_billing_address || po.supplierBillingAddress)
      setSupplierBillingAddress(
        po.vendor_billing_address ||
          po.supplierBillingAddress ||
          po.vendor_address ||
          po.supplierAddress,
      );
    if (po.vendor_gstin || po.gstin || po.supplierGstin)
      setSupplierGstin(po.vendor_gstin || po.gstin || po.supplierGstin);
    if (po.vendor_pan || po.pan || po.supplierPan)
      setSupplierPan(po.vendor_pan || po.pan || po.supplierPan);

    // Quotation
    setQuotationNumber(
      po.quotation_number ||
        po.quotationNumber ||
        `QUO-${po.po_number || "001"}`,
    );
    const formattedQuoDate =
      formatForDateInput(po.quotation_date) ||
      formatForDateInput(po.quotationDate) ||
      formattedPoDate;
    setQuotationDate(formattedQuoDate);

    // Advance Payment
    const advVal = Number(po.advance_amount || po.advanceAmount || 0);
    const advPct = Number(po.advance_percentage || po.advancePercent || 0);
    const isAdvYes =
      String(po.advance_payment || po.advancePayment || "").toLowerCase() ===
        "yes" ||
      advVal > 0 ||
      advPct > 0 ||
      String(po.payment_type || "")
        .toLowerCase()
        .includes("advance");
    setAdvancePayment(isAdvYes ? "yes" : "no");
    setAdvanceAmount(String(advVal || (advPct > 0 ? advPct : "0")));

    // Remarks & Terms
    setRemarks(po.remarks || po.description || "");
    const poTerms =
      po.terms ||
      po.termsList ||
      (Array.isArray(po.po_terms) ? po.po_terms : []);
    setTerms(
      Array.isArray(poTerms) && poTerms.length > 0 ? poTerms : DEFAULT_TERMS,
    );

    // Items & Quantities
    const mockItem = {
      id: po.indent_id || po.id,
      item_name: po.item_name || "Material Item",
      quantity: po.quantity || 1,
      uom: po.uom || "NOS",
      indent_number:
        po.indent_number ||
        (getIndentNumber ? getIndentNumber(po.indent_id) : po.indent_id) ||
        po.po_number,
    };
    setSelectedIndents([mockItem]);

    const matchedMat = (catalogMaterials || []).find(
      (m) =>
        (m.name &&
          po.item_name &&
          m.name.toLowerCase().trim() ===
            String(po.item_name).toLowerCase().trim()) ||
        (m.item_name &&
          po.item_name &&
          m.item_name.toLowerCase().trim() ===
            String(po.item_name).toLowerCase().trim()) ||
        (m.sku &&
          po.item_code &&
          m.sku.toLowerCase().trim() ===
            String(po.item_code).toLowerCase().trim()) ||
        (m.item_code &&
          po.item_code &&
          m.item_code.toLowerCase().trim() ===
            String(po.item_code).toLowerCase().trim()),
    );
    const resolvedHsn =
      po.hsn_code ||
      po.hsn ||
      matchedMat?.hsn_code ||
      matchedMat?.hsnCode ||
      "7216";
    const resolvedDeliveryDate = formatForDateInput(
      po.delivery_date || po.expected_delivery_date || po.lead_time,
    );

    const lines = {
      [mockItem.id]: {
        rate: String(po.unit_rate || 0),
        hsn: String(resolvedHsn),
        gst: String(po.gst_rate || po.gst_percent || "18").replace("%", ""),
        deliveryDate: resolvedDeliveryDate,
      },
    };
    setLineItems(lines);
  };

  // Open Revise PO Modal
  const handleOpenRevisePO = (po) => {
    setPoMode("revise");
    populatePoFields(po);
    setModalOpen(true);
  };

  // Add Dynamic PO Term
  const handleAddPoTerm = () => {
    const text = newPoTermInput.trim();
    if (!text) return;
    const clean = text.replace(/^\d+\.\s*/, "").trim();
    if (!clean) return;
    if (terms.includes(clean)) {
      setNewPoTermInput("");
      return;
    }
    setTerms((prev) => [...prev, clean]);
    setNewPoTermInput("");
  };

  // Delete Dynamic PO Term
  const handleDeletePoTerm = (index) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculated Totals
  const calculatedTotals = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;

    selectedIndents.forEach((it) => {
      const line = lineItems[it.id] || {};
      const rate = parseFloat(line.rate) || 0;
      const qty = parseFloat(it.approved_quantity || it.quantity) || 1;
      const gstPct = parseFloat(line.gst) || 18;
      const base = rate * qty;
      const tax = base * (gstPct / 100);

      subTotal += base;
      totalTax += tax;
    });

    return {
      subTotal,
      totalTax,
      grandTotal: subTotal + totalTax,
    };
  }, [selectedIndents, lineItems]);

  // Handle PO Creation & Revision
  const handleSubmitPO = async (e) => {
    e.preventDefault();
    if (selectedIndents.length === 0) return;

    setIsSubmitting(true);
    try {
      if (poMode === "create") {
        for (const item of selectedIndents) {
          const line = lineItems[item.id] || {};
          const rate = parseFloat(line.rate) || 0;
          const qty = parseFloat(item.quantity) || 1;
          const gstPct = parseFloat(line.gst) || 18;
          const lineBase = rate * qty;
          const lineTotal = lineBase + lineBase * (gstPct / 100);

          const finalVendorName =
            supplierName.trim() ||
            item.vendorName ||
            item.selected_vendor_name ||
            dbVendors[0]?.vendor_name ||
            dbVendors[0]?.name ||
            "Approved Supplier";

          await createPurchaseOrder({
            po_number: poNumber.trim(),
            poNumber: poNumber.trim(),
            indent_id: item.id,
            indentId: item.id,
            vendor_name: finalVendorName,
            vendorName: finalVendorName,
            supplierName: finalVendorName,
            item_code: item.item_code || null,
            itemCode: item.item_code || null,
            item_name: item.item_name || item.itemName || "Material Item",
            itemName: item.item_name || item.itemName || "Material Item",
            quantity: qty,
            uom: item.uom || "NOS",
            unit_rate: rate,
            unitRate: rate,
            hsn: line.hsn || null,
            hsnCode: line.hsn || null,
            gst_percent: `${gstPct}%`,
            gstRate: `${gstPct}%`,
            total_amount: lineTotal,
            totalAmount: lineTotal,
            advance_amount:
              advancePayment === "yes" ? Number(advanceAmount || 0) : 0,
            advanceAmount:
              advancePayment === "yes" ? Number(advanceAmount || 0) : 0,
            payment_type:
              paymentTerms === "Custom" ? customPaymentTerms : paymentTerms,
            paymentTerms:
              paymentTerms === "Custom" ? customPaymentTerms : paymentTerms,
            transport_type:
              transportType !== "Select Transport Type"
                ? transportType
                : "F.O.R.",
            transportType:
              transportType !== "Select Transport Type"
                ? transportType
                : "F.O.R.",
            delivery_location: deliveryLocation,
            deliveryLocation,
            delivery_date: quotationDate
              ? new Date(quotationDate).toISOString()
              : null,
            po_date: poDate
              ? new Date(poDate).toISOString()
              : new Date().toISOString(),
            poDate: poDate
              ? new Date(poDate).toISOString()
              : new Date().toISOString(),
            remarks,
            terms: terms || [],
            termsList: terms || [],
          });
        }
        if (showToast)
          showToast(
            `Purchase Order ${poNumber} generated successfully!`,
            "success",
          );
      } else {
        const primary = selectedIndents[0];
        const line = lineItems[primary?.id] || {};
        const activeDeliveryDate = line.deliveryDate
          ? new Date(line.deliveryDate).toISOString()
          : quotationDate
            ? new Date(quotationDate).toISOString()
            : null;
        await revisePurchaseOrder(poNumber, {
          vendorName: supplierName,
          unitRate: parseFloat(line.rate) || 0,
          totalAmount: calculatedTotals.grandTotal,
          advanceAmount:
            advancePayment === "yes" ? Number(advanceAmount || 0) : 0,
          paymentTerms:
            paymentTerms === "Custom" ? customPaymentTerms : paymentTerms,
          transportType,
          deliveryLocation,
          poDate: poDate
            ? new Date(poDate).toISOString()
            : new Date().toISOString(),
          deliveryDate: activeDeliveryDate,
        });
        if (showToast)
          showToast(
            `Purchase Order ${poNumber} revised successfully!`,
            "success",
          );
      }
      const activeVendorObj = dbVendors.find(
        (v) =>
          (v.vendor_name || v.name)?.toLowerCase() ===
          supplierName.trim().toLowerCase(),
      );
      const targetVendorName =
        supplierName.trim() ||
        activeVendorObj?.vendor_name ||
        "Valued Supplier";
      const targetVendorPhone =
        supplierPhone.trim() ||
        activeVendorObj?.phone ||
        activeVendorObj?.mobile ||
        "";

      const pdfItemsList = selectedIndents.map((item, idx) => {
        const line = lineItems[item.id] || {};
        const rate = parseFloat(line.rate) || 0;
        const qty = parseFloat(item.approved_quantity || item.quantity) || 1;
        const gstPct = parseFloat(line.gst) || 18;
        const base = rate * qty;
        const total = base + base * (gstPct / 100);
        return {
          srNo: idx + 1,
          itemName: item.item_name || item.itemName || "Material Item",
          itemCode: item.item_code || item.itemCode || line.hsn || "",
          indentNumber:
            item.indent_number ||
            (getIndentNumber ? getIndentNumber(item.id) : null) ||
            (item.id && item.id.length > 8
              ? `IND-${item.id.slice(0, 8).toUpperCase()}`
              : "IND-001"),
          quantity: qty,
          uom: item.uom || "NOS",
          rate: rate,
          hsn: line.hsn || "7216",
          gstPercent: String(line.gst || "18").replace("%", ""),
          amount: total,
        };
      });

      const poPdfPayload = {
        poNumber: poNumber.trim(),
        poDate: poDate || new Date().toISOString().split("T")[0],
        vendorName: targetVendorName,
        vendorAddress:
          supplierAddress ||
          activeVendorObj?.address ||
          `${targetVendorName} Industrial Area`,
        vendorContact:
          supplierContactPerson ||
          activeVendorObj?.contact_person ||
          "Authorized Representative",
        vendorPhone: targetVendorPhone,
        vendorEmail: supplierEmail || activeVendorObj?.email || "",
        vendorGstin: supplierGstin || activeVendorObj?.gstin || "",
        vendorPan: supplierPan || activeVendorObj?.pan || "",
        consigneeName: firmName || "M/S Nutech Pvt. Ltd.",
        consigneeAddress: billingAddress || NUTECH_ADDRESS,
        billingName: billingName || "M/S Nutech Pvt. Ltd.",
        billingAddress: billingAddress || NUTECH_ADDRESS,
        destinationName: destName || deliveryLocation || "Nutech Plant 1",
        destinationAddress: destAddress || NUTECH_ADDRESS,
        deliveryLocation: deliveryLocation || destName,
        expectedDeliveryDate: quotationDate || "7 to 10 days",
        quotationNumber: quotationNumber || "-",
        quotationDate: quotationDate || "-",
        paymentTerms:
          paymentTerms === "Custom"
            ? customPaymentTerms
            : `${paymentTerms} Days Credit`,
        advanceAmount:
          advancePayment === "yes" ? parseFloat(advanceAmount) || 0 : 0,
        transportType:
          transportType !== "Select Transport Type" ? transportType : "F.O.R.",
        remarks: remarks || "",
        items:
          pdfItemsList.length > 0
            ? pdfItemsList
            : [
                {
                  srNo: 1,
                  itemName: "Standard Material",
                  indentNumber: "IND-001",
                  quantity: 1,
                  uom: "NOS",
                  rate: 0,
                  hsn: "7216",
                  gstPercent: "18",
                  amount: 0,
                },
              ],
        totalAmount: calculatedTotals.grandTotal || 0,
        termsList: terms || [],
      };

      // Trigger WhatsApp PO Template Dispatch with attached PDF (Vendor + Approvers)
      try {
        const { blob } = await generatePoPdfBlob(poPdfPayload);

        // A. Dispatch to selected Vendor
        if (
          targetVendorPhone &&
          String(targetVendorPhone).trim() !== "" &&
          targetVendorPhone !== "-"
        ) {
          try {
            const waRes = await sendPoWhatsappNotification({
              vendorPhone: targetVendorPhone,
              vendorName: targetVendorName,
              poNumber: poNumber.trim(),
              poDate: formatDateDash(poDate) || poDate,
              pdfBlob: blob,
            });

            if (waRes?.success) {
              if (showToast)
                showToast(
                  `PO ${poNumber} dispatched to ${targetVendorName} on WhatsApp!`,
                  "success",
                );
            } else {
              console.warn("WhatsApp PO notification skipped:", waRes?.error);
            }
          } catch (waErr) {
            console.warn("WhatsApp PO send warning:", waErr);
            if (showToast)
              showToast(
                `WhatsApp dispatch note: ${waErr.message || "Failed to send message"}`,
                "warning",
              );
          }
        } else {
          if (showToast)
            showToast(
              `Note: No phone number found for ${targetVendorName} to send WhatsApp PO.`,
              "info",
            );
        }

        // B. Dispatch copy to Approver(s) who approved these indent(s) (in the name of the vendor)
        try {
          const approverList = await getApproversForIndents(
            selectedIndents.map((r) => r.id),
          );
          for (const app of approverList) {
            if (app.phone) {
              await sendPoWhatsappNotification({
                vendorPhone: app.phone,
                vendorName: targetVendorName,
                poNumber: poNumber.trim(),
                poDate: formatDateDash(poDate) || poDate,
                pdfBlob: blob,
              });
            }
          }
        } catch (appPoErr) {
          console.warn("Approver PO WhatsApp dispatch warning:", appPoErr);
        }
      } catch (pdfBlobErr) {
        console.warn(
          "Could not generate PO PDF blob for WhatsApp:",
          pdfBlobErr,
        );
      }

      setModalOpen(false);
      setSelectedRecordIds([]);
    } catch (err) {
      console.error("PO submit error:", err);
      if (showToast)
        showToast("Failed to save Purchase Order: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadIssuedPoPdf = (po) => {
    try {
      const rateVal = Number(po.unit_rate || po.rate || 75);
      const qtyVal = Number(po.quantity || 1);
      const gstVal = String(po.gst_rate || po.gst_percent || "18").replace(
        "%",
        "",
      );
      const advVal = Number(po.advance_amount || 0);

      const readableIndent =
        po.indent_number ||
        (getIndentNumber ? getIndentNumber(po.indent_id) : null) ||
        (po.indent_id && po.indent_id.length > 8
          ? `IND-${po.indent_id.slice(0, 8).toUpperCase()}`
          : "IND-2026-001");
      const locName =
        po.delivery_location || po.deliveryLocation || "M/S Nutech Pvt. Ltd.";

      // Match destination address from master_addresses / ADDRESS_OPTIONS
      const matchedAddr =
        (dbAddresses || []).find(
          (a) =>
            (a.name || "").toLowerCase() === locName.toLowerCase() ||
            cleanCompanyName(a.name || "").toLowerCase() ===
              cleanCompanyName(locName).toLowerCase(),
        ) ||
        ADDRESS_OPTIONS.find(
          (a) =>
            (a.name || "").toLowerCase() === locName.toLowerCase() ||
            cleanCompanyName(a.name || "").toLowerCase() ===
              cleanCompanyName(locName).toLowerCase(),
        );
      const finalDestAddress =
        matchedAddr?.address ||
        po.destinationAddress ||
        po.delivery_location_address ||
        NUTECH_ADDRESS;

      generatePoPdf({
        poNumber: po.po_number || "PO-2026-001",
        poDate:
          po.po_date ||
          po.actualDate ||
          po.timestamp ||
          new Date().toISOString().split("T")[0],
        vendorName: po.vendor_name || "Supplier",
        vendorAddress:
          po.vendor_address ||
          `${po.vendor_name || "Supplier"} Industrial Complex`,
        vendorContact: po.vendor_contact || "Authorized Representative",
        vendorPhone: po.vendor_phone || "9123456789",
        vendorEmail:
          po.vendor_email ||
          `sales@${(po.vendor_name || "vendor").toLowerCase().replace(/\s+/g, "")}.com`,
        vendorGstin: po.vendor_gstin || "22AAAPL1234A1Z5",

        // Billing & Destination
        consigneeName:
          po.consigneeName || po.firm_name || "Nutech Pipes Pvt. Ltd.",
        consigneeAddress: po.consigneeAddress || NUTECH_ADDRESS,
        billingName:
          po.consigneeName || po.firm_name || "Nutech Pipes Pvt. Ltd.",
        billingAddress: po.consigneeAddress || NUTECH_ADDRESS,
        destinationName: locName,
        destinationAddress: finalDestAddress,
        deliveryLocation: locName,

        // Order References
        expectedDeliveryDate:
          po.delivery_date ||
          po.expected_delivery_date ||
          po.delivery_terms ||
          "7 to 10 days",
        quotationNumber: po.quotation_number || po.quotation_no || "-",
        quotationDate: po.quotation_date || "-",
        paymentTerms: po.payment_type
          ? `Advance Payment (${po.advance_percentage || 0}%)`
          : po.payment_terms || "30 Days Credit",
        paymentType: po.payment_type || "",
        advanceAmount: advVal,
        advancePercentage: po.advance_percentage || 0,
        transportType: po.transport_type || "F.O.R. Destination",
        remarks: po.remarks || "",
        items:
          po.items && po.items.length > 0
            ? po.items.map((it) => ({
                ...it,
                indentNumber:
                  it.indent_number ||
                  (getIndentNumber
                    ? getIndentNumber(it.indent_id || po.indent_id)
                    : null) ||
                  readableIndent,
              }))
            : [
                {
                  srNo: 1,
                  itemName: po.item_name || "Material Item",
                  indentNumber: readableIndent,
                  quantity: qtyVal,
                  uom: po.uom || "NOS",
                  rate: rateVal,
                  hsn: po.hsn_code || po.hsn || "7216",
                  gstPercent: gstVal,
                  amount:
                    po.total_amount ||
                    rateVal * qtyVal * (1 + Number(gstVal) / 100),
                },
              ],
        totalAmount: po.total_amount,
        termsList: po.termsList || po.terms || [],
      });
      if (showToast)
        showToast(
          `Opening PO ${po.po_number || "Draft"} PDF in a new tab...`,
          "info",
        );
    } catch (e) {
      console.error("PDF Download error:", e);
      if (showToast)
        showToast(`Failed to generate PO PDF: ${e.message}`, "error");
    }
  };

  const handleDownloadDraftPdf = () => {
    try {
      const pdfItems = selectedIndents.map((item, idx) => {
        const line = lineItems[item.id] || {};
        const rate = parseFloat(line.rate) || 0;
        const qty = parseFloat(item.approved_quantity || item.quantity) || 1;
        const gstPct = parseFloat(line.gst) || 18;
        const base = rate * qty;
        const total = base + base * (gstPct / 100);
        return {
          srNo: idx + 1,
          itemName: item.item_name || "Material Item",
          indentNumber:
            item.indent_number ||
            (getIndentNumber ? getIndentNumber(item.id) : null) ||
            (item.id && item.id.length > 8
              ? `IND-${item.id.slice(0, 8).toUpperCase()}`
              : "IND-001"),
          quantity: qty,
          uom: item.uom || "PCS",
          rate: rate,
          hsn: line.hsn || "7216",
          gstPercent: String(line.gst || "18").replace("%", ""),
          amount: total,
        };
      });

      generatePoPdf({
        poNumber: poNumber || "PO-DRAFT",
        poDate: poDate || new Date().toISOString().split("T")[0],
        vendorName: supplierName || "Vendor",
        vendorAddress: supplierAddress || `${supplierName} Industrial Area`,
        vendorContact: supplierContactPerson || "Contact Person",
        vendorPhone: supplierPhone || "9123456789",
        vendorEmail: supplierEmail || "supplier@example.com",
        vendorGstin: supplierGstin || "27AAACV1234A1Z1",
        consigneeName: firmName || "Nutech Pipes Pvt. Ltd.",
        consigneeAddress: billingAddress || NUTECH_ADDRESS,
        billingName: firmName || "Nutech Pipes Pvt. Ltd.",
        billingAddress: billingAddress || NUTECH_ADDRESS,
        destinationName: destName || deliveryLocation || "M/S Nutech Pvt. Ltd.",
        destinationAddress: destAddress || NUTECH_ADDRESS,
        deliveryLocation:
          deliveryLocation || destName || "M/S Nutech Pvt. Ltd.",
        expectedDeliveryDate:
          Object.values(lineItems).find((l) => l.deliveryDate)?.deliveryDate ||
          "7 to 10 days",
        quotationNumber: quotationNumber || "-",
        quotationDate: quotationDate || "-",
        paymentTerms:
          paymentTerms === "Custom"
            ? customPaymentTerms
            : advancePayment === "yes"
              ? `Advance Payment (${advanceAmount}%)`
              : paymentTerms,
        advanceAmount:
          advancePayment === "yes" ? parseFloat(advanceAmount) || 0 : 0,
        transportType: transportType || "F.O.R.",
        remarks: remarks || "",
        items:
          pdfItems.length > 0
            ? pdfItems
            : [
                {
                  srNo: 1,
                  itemName: "Standard Material",
                  indentNumber: "IND-001",
                  quantity: 1,
                  uom: "PCS",
                  rate: 0,
                  hsn: "7216",
                  gstPercent: "18",
                  amount: 0,
                },
              ],
        totalAmount: calculatedTotals.grandTotal || 0,
        termsList: terms || [],
      });
      if (showToast) showToast(`Generated PO PDF for ${poNumber}`, "info");
    } catch (e) {
      console.error("PDF preview error:", e);
      if (showToast)
        showToast("Failed to preview PO PDF: " + e.message, "error");
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 6 : Purchase Order (Make PO & Revise)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Generate official purchase orders for sanctioned suppliers and
                manage revised commercial contracts.
              </p>
            </div>
          </div>

          {/* Search & Division Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent #, PO #, item..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-44 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option key="div-all" value="all">
                All Divisions
              </option>
              {warehouseOptions.map((w, idx) => (
                <option key={`div-opt-${w}-${idx}`} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main Content Card with Dual Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setSelectedRecordIds([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Pending POs ({pendingList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setSelectedRecordIds([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Issued PO History ({historyList.length})</span>
            </button>
          </div>

          {/* Bulk Generate Action Button */}
          {activeTab === "pending" && selectedRecordIds.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenCreatePO()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Generate Purchase Order ({selectedRecordIds.length})</span>
            </button>
          )}
        </div>

        {/* 3. Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              {activeTab === "pending" ? (
                /* Exact 11 Pending Columns */
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        pendingList.length > 0 &&
                        selectedRecordIds.length === pendingList.length
                      }
                      onChange={toggleAll}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Indent-No</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-center">Planned</th>
                  <th className="p-3">Approver Name</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3">Freight Type</th>
                  <th className="p-3">Payment Terms</th>
                  <th className="p-3 text-center">Exp. Delivery</th>
                  <th className="p-3 text-center">TAT SLA</th>
                </tr>
              ) : (
                /* Exact 12 History Columns + TAT */
                <tr>
                  <th className="p-3 text-center">Timestamp</th>
                  <th className="p-3">Item Details</th>
                  <th className="p-3 text-center">Planned</th>
                  <th className="p-3 text-center">Actual</th>
                  <th className="p-3">Vendor Info</th>
                  <th className="p-3">Terms & Delivery</th>
                  <th className="p-3 font-mono">PO Details (Incl. HSN)</th>
                  <th className="p-3">Financials (Incl. GST%)</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-center">PO COPY</th>
                  <th className="p-3 text-center">TAT SLA</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading records...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    No{" "}
                    {activeTab === "pending"
                      ? "pending PO items"
                      : "issued PO records"}{" "}
                    found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const isSelected = selectedRecordIds.includes(row.id);

                  if (activeTab === "pending") {
                    return (
                      <tr
                        key={row.id}
                        onClick={() => toggleRecord(row.id)}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecord(row.id)}
                            className="rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.indentNumber}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {row.itemName}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {row.qty}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(row.plannedDate)}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {row.approverName}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {row.vendorName}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {row.rate}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {row.totalAmount}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {row.freightType}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {row.paymentTerms}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {formatDateTime(row.expDelivery)}
                        </td>
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TatStageBadge
                            tatStatus={getTatStatusForIndent(
                              row.id || row.indent_id,
                              "Make PO",
                            )}
                            indentId={row.id || row.indent_id}
                          />
                        </td>
                      </tr>
                    );
                  } else {
                    const basicVal = Number(
                      row.basic_value ||
                        Number(row.quantity || 1) * Number(row.unit_rate || 0),
                    );
                    const advVal = Number(row.advance_amount || 0);
                    const totalVal = Number(row.total_amount || 0);

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-mono text-xs">
                          {formatDateTime(row.timestamp)}
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-blue-900 dark:text-blue-400 font-mono text-xs">
                              {row.indentNumber ||
                                row.indent_number ||
                                (getIndentNumber
                                  ? getIndentNumber(row.indent_id)
                                  : row.indent_id) ||
                                "IND-2026-001"}
                            </div>
                            <div
                              className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px]"
                              title={row.item_name}
                            >
                              {row.item_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Qty: {row.quantity} {row.uom || "Kgs"}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300 text-xs">
                          {formatDateTime(row.plannedDate)}
                        </td>

                        <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          {formatDateTime(
                            row.actualDate ||
                              row.timestamp ||
                              row.created_at ||
                              row.po_date,
                          )}
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-white text-xs">
                              {row.vendor_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Rate: ₹
                              {Number(row.unit_rate || 0).toLocaleString()}
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">
                                Terms:
                              </span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">
                                {row.payment_type
                                  ? `Advance Payment (₹${advVal.toLocaleString()})`
                                  : "30 Days Credit"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">
                                Delivery:
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                                {row.delivery_location || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">
                                Transport:
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                                {row.transport_type || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5">
                            <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {row.po_number}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              HSN: {row.hsn || "7216"}
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">
                                Basic:
                              </span>
                              <span className="font-mono text-slate-800 dark:text-slate-200">
                                ₹{basicVal.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400">
                                GST:
                              </span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {row.gst_percent || "18%"}
                              </span>
                            </div>
                            {advVal > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-orange-500">
                                  Adv:
                                </span>
                                <span className="font-mono text-orange-600 font-bold">
                                  ₹{advVal.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          ₹{totalVal.toLocaleString()}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDownloadIssuedPoPdf(row)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold text-xs cursor-pointer hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Copy</span>
                          </button>
                        </td>

                        <td className="p-3 text-center">
                          <TatStageBadge
                            tatStatus={getTatStatusForIndent(
                              row.indent_id || row.id,
                              "Make PO",
                            )}
                            indentId={row.indent_id || row.id}
                            isCompleted={true}
                          />
                        </td>

                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 italic text-xs max-w-[200px] truncate"
                          title={row.remarks}
                        >
                          {row.remarks || "Regular Vendor Direct Flow"}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenRevisePO(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                          >
                            <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                            <span>Revise</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Showing page {currentPage} of {totalPages} ({currentList.length}{" "}
              items)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. PO Generation / Revise Modal (Matching Exact Screenshot Layout) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-6xl w-full my-4 overflow-hidden flex flex-col max-h-[94vh]">
            {/* Top Dual Tabs & Close Button */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <div className="grid grid-cols-2 flex-1">
                <button
                  type="button"
                  onClick={() => setPoMode("create")}
                  className={`py-3 text-center transition-colors cursor-pointer ${
                    poMode === "create"
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold border-b-2 border-indigo-600"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  Create New PO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPoMode("revise");
                    const targetPo =
                      purchaseOrders.find((p) => p.po_number === poNumber) ||
                      purchaseOrders[0];
                    if (targetPo) {
                      populatePoFields(targetPo);
                    }
                  }}
                  className={`py-3 text-center transition-colors cursor-pointer ${
                    poMode === "revise"
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold border-b-2 border-indigo-600"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  Revise Existing PO
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitPO}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
            >
              {/* TOP BANNER CARD */}
              <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-50/70 dark:bg-slate-800/40 px-6 py-5 text-center sm:text-left">
                  <img
                    src={nutechLogo}
                    alt="Nutech Logo"
                    className="h-14 w-auto max-w-[200px] object-contain shrink-0"
                  />
                  <div className="max-w-lg">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Nutech
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {NUTECH_ADDRESS}
                    </p>
                  </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 text-center text-base font-black tracking-[0.25em] text-slate-800 dark:text-slate-200 uppercase">
                  PURCHASE ORDER
                </div>
              </section>

              {/* ORDER INFORMATION CARD */}
              <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    <ClipboardList className="h-4 w-4 text-indigo-600" />
                    Order Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 text-xs">
                  {/* Row 1 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Firm Name (from Indent Division)
                    </label>
                    <input
                      type="text"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      placeholder="e.g. Nutech Pipes"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Supplier Name</span>
                      {isRegularVendor && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold lowercase tracking-normal bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          (Regular Vendor Locked)
                        </span>
                      )}
                    </label>
                    <select
                      value={supplierName}
                      disabled={isRegularVendor}
                      onChange={(e) => updateSupplierFields(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-bold ${
                        isRegularVendor
                          ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <option value="">-- Select Supplier --</option>
                      {dbVendors.map((v, idx) => {
                        const vName = v.vendor_name || v.name || v;
                        return (
                          <option key={`vnd-${vName}-${idx}`} value={vName}>
                            {vName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Row 2 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>PO Number</span>
                      {poMode === "revise" && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold lowercase tracking-normal bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          (Select to Autofill)
                        </span>
                      )}
                    </label>
                    {poMode === "revise" &&
                    purchaseOrders &&
                    purchaseOrders.length > 0 ? (
                      <select
                        value={poNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPoNumber(val);
                          const found = purchaseOrders.find(
                            (p) => p.po_number === val || p.id === val,
                          );
                          if (found) populatePoFields(found);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                      >
                        <option value="">-- Select PO to Revise --</option>
                        {purchaseOrders.map((p, idx) => (
                          <option
                            key={`rev-po-${p.id || idx}`}
                            value={p.po_number}
                          >
                            {p.po_number} — {p.vendor_name || "Supplier"} (
                            {p.item_name || "Item"})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="PO-1027"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      PO Date
                    </label>
                    <input
                      type="date"
                      required
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Transport Type</span>
                      {isRegularVendor && (
                        <span className="text-[10px] text-slate-500 font-medium lowercase tracking-normal">
                          (from quote)
                        </span>
                      )}
                    </label>
                    <select
                      value={transportType}
                      disabled={isRegularVendor}
                      onChange={(e) => setTransportType(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-medium ${
                        isRegularVendor
                          ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <option value="Select Transport Type">
                        -- Select Transport Type --
                      </option>
                      {dbTransportTypes.map((t, idx) => (
                        <option
                          key={`tt-${t.id || t.name}-${idx}`}
                          value={t.name}
                        >
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 4 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Payment Terms</span>
                      {isRegularVendor && (
                        <span className="text-[10px] text-slate-500 font-medium lowercase tracking-normal">
                          (from quote)
                        </span>
                      )}
                    </label>
                    <select
                      value={paymentTerms}
                      disabled={isRegularVendor}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-medium ${
                        isRegularVendor
                          ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {PAYMENT_TERMS_OPTIONS.map((t, idx) => (
                        <option key={`pto-${t.value}-${idx}`} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {paymentTerms === "Custom" && (
                      <input
                        type="text"
                        disabled={isRegularVendor}
                        placeholder="Type custom payment terms..."
                        value={customPaymentTerms}
                        onChange={(e) => setCustomPaymentTerms(e.target.value)}
                        className={`w-full px-3 py-1.5 mt-1 border rounded-lg text-xs ${
                          isRegularVendor
                            ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        }`}
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Supplier Contact Person
                    </label>
                    <input
                      type="text"
                      value={supplierContactPerson}
                      onChange={(e) => setSupplierContactPerson(e.target.value)}
                      placeholder="Alice Manager"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Row 5 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Supplier Contact Number
                    </label>
                    <input
                      type="text"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      placeholder="9123456789"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Supplier Email
                    </label>
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="alpha@vendor.com"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Row 6 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Supplier Address
                    </label>
                    <input
                      type="text"
                      value={supplierAddress}
                      onChange={(e) => setSupplierAddress(e.target.value)}
                      placeholder="123 Industrial Area, Plot 45, MIDC, Mumbai, Maharashtra"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Supplier Billing Address
                    </label>
                    <input
                      type="text"
                      value={supplierBillingAddress}
                      onChange={(e) =>
                        setSupplierBillingAddress(e.target.value)
                      }
                      placeholder="123 Industrial Area, Plot 45, MIDC, Mumbai, Maharashtra 400093"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Row 7 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={supplierGstin}
                      onChange={(e) => setSupplierGstin(e.target.value)}
                      placeholder="27AAACV1234A1Z1"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Supplier PAN Number
                    </label>
                    <input
                      type="text"
                      value={supplierPan}
                      onChange={(e) => setSupplierPan(e.target.value)}
                      placeholder="AAACV1234A"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Row 8 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Quotation Number
                    </label>
                    <input
                      type="text"
                      value={quotationNumber}
                      onChange={(e) => setQuotationNumber(e.target.value)}
                      placeholder="QUO-IN-008A"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Quotation Date
                    </label>
                    <input
                      type="date"
                      value={quotationDate}
                      onChange={(e) => setQuotationDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Row 9: Advance Payment */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                      Advance Payment *
                    </label>
                    <select
                      value={advancePayment}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdvancePayment(val);
                        if (val === "no") setAdvanceAmount("0");
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  {advancePayment === "yes" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                        Advance Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-600"
                      />
                    </div>
                  )}

                  {/* Row 10: Description / Remarks */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Description / Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Special commercial terms or delivery remarks..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* 3-COLUMN COMMERCIAL & ADDRESS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Commercial Details */}
                <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Commercial Details
                  </div>
                  <div className="space-y-2.5 p-4 text-xs">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-slate-500">
                        GSTIN
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        27ABCDE1234A1Z5
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-slate-500">PAN</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        ABCDE1234A
                      </span>
                    </div>
                  </div>
                </section>

                {/* 2. Billing Address */}
                <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Billing Address
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <select
                      value={billingName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const opt = combinedAddressOptions.find(
                          (a) => a.name === val,
                        );
                        setBillingName(val);
                        setBillingAddress(opt?.address || "");
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    >
                      {combinedAddressOptions.map((a, idx) => (
                        <option
                          key={`bill-addr-${a.name}-${idx}`}
                          value={a.name}
                        >
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <p
                      className="text-slate-600 dark:text-slate-400 line-clamp-2 text-[11px]"
                      title={billingAddress}
                    >
                      {billingAddress}
                    </p>
                  </div>
                </section>

                {/* 3. Destination */}
                <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Destination
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <select
                      value={destName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const opt = combinedAddressOptions.find(
                          (a) => a.name === val,
                        );
                        setDestName(val);
                        setDestAddress(opt?.address || "");
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    >
                      {combinedAddressOptions.map((a, idx) => (
                        <option
                          key={`dest-addr-${a.name}-${idx}`}
                          value={a.name}
                        >
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <p
                      className="text-slate-600 dark:text-slate-400 line-clamp-2 text-[11px]"
                      title={destAddress}
                    >
                      {destAddress}
                    </p>
                  </div>
                </section>
              </div>

              {/* ITEMS & QUANTITIES CARD */}
              <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Items & Quantities
                    </h3>
                    {isRegularVendor ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Prefilled & Locked (Approved Quote)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        Editable (Direct Entry)
                      </span>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {selectedIndents.length} Items Selected
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 text-left w-12">S/N</th>
                        <th className="p-3 text-left">ITEM</th>
                        <th className="p-3 text-center">QTY</th>
                        <th className="p-3 text-center">RATE</th>
                        <th className="p-3 text-center">HSN</th>
                        <th className="p-3 text-center">GST%</th>
                        <th className="p-3 text-center">DELIVERY DATE</th>
                        <th className="p-3 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedIndents.map((item, idx) => {
                        const line = lineItems[item.id] || {};
                        const rate = parseFloat(line.rate) || 0;
                        const qty =
                          parseFloat(item.approved_quantity || item.quantity) ||
                          1;
                        const gstPct = parseFloat(line.gst) || 18;
                        const base = rate * qty;
                        const lineTotal = base + base * (gstPct / 100);

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30"
                          >
                            <td className="p-3 text-slate-500 font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {item.item_name}
                              </div>
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                                {item.indent_number || item.id}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {qty} {item.uom || "PCS"}
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-slate-500 font-bold">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  disabled={isRegularVendor}
                                  value={line.rate || ""}
                                  onChange={(e) =>
                                    setLineItems({
                                      ...lineItems,
                                      [item.id]: {
                                        ...line,
                                        rate: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="0.00"
                                  className={`w-24 px-2 py-1 border rounded-lg text-center font-bold text-xs ${
                                    isRegularVendor
                                      ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                  }`}
                                />
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="text"
                                disabled={isRegularVendor}
                                value={line.hsn || ""}
                                onChange={(e) =>
                                  setLineItems({
                                    ...lineItems,
                                    [item.id]: { ...line, hsn: e.target.value },
                                  })
                                }
                                placeholder="HSN"
                                className={`w-24 px-2 py-1 border rounded-lg text-center font-mono font-bold text-xs ${
                                  isRegularVendor
                                    ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500"
                                }`}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <select
                                disabled={isRegularVendor}
                                value={line.gst || "18"}
                                onChange={(e) =>
                                  setLineItems({
                                    ...lineItems,
                                    [item.id]: { ...line, gst: e.target.value },
                                  })
                                }
                                className={`w-20 px-2 py-1 border rounded-lg text-center font-bold text-xs ${
                                  isRegularVendor
                                    ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {dbGstRates.map((g, gIdx) => (
                                  <option
                                    key={`gst-opt-${g.value}-${gIdx}`}
                                    value={g.value}
                                  >
                                    {g.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="date"
                                disabled={isRegularVendor}
                                value={line.deliveryDate || ""}
                                onChange={(e) =>
                                  setLineItems({
                                    ...lineItems,
                                    [item.id]: {
                                      ...line,
                                      deliveryDate: e.target.value,
                                    },
                                  })
                                }
                                className={`px-2.5 py-1 border rounded-lg text-xs font-mono ${
                                  isRegularVendor
                                    ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                }`}
                              />
                            </td>
                            <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                              Rs.{" "}
                              {lineTotal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Right Calculation Box */}
                <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 p-4">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-mono font-medium">
                        Rs. {calculatedTotals.subTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>GST</span>
                      <span className="font-mono font-medium">
                        Rs. {calculatedTotals.totalTax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold">
                      <span className="text-slate-900 dark:text-white uppercase tracking-wider">
                        GRAND TOTAL
                      </span>
                      <span className="font-mono text-indigo-700 dark:text-indigo-400 font-black">
                        Rs. {calculatedTotals.grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* TERMS & CONDITIONS CARD */}
              <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Terms & Conditions (PO Terms)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {terms.length} Active
                    </span>
                  </div>
                </div>

                {/* Add New Term Input */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={newPoTermInput}
                    onChange={(e) => setNewPoTermInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPoTerm();
                      }
                    }}
                    placeholder="Type custom PO term / condition for this order..."
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={!newPoTermInput.trim()}
                    onClick={handleAddPoTerm}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Terms List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
                  {terms.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No terms added yet. Type a term above to add it to this
                      Purchase Order.
                    </div>
                  ) : (
                    terms.map((term, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 px-3 py-2 text-xs"
                      >
                        <span className="text-right font-bold text-slate-400">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={term}
                          onChange={(e) =>
                            setTerms((prev) =>
                              prev.map((item, i) =>
                                i === index ? e.target.value : item,
                              ),
                            )
                          }
                          className="w-full px-2 py-1 bg-transparent border-0 focus:outline-hidden text-xs text-slate-800 dark:text-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePoTerm(index)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          title="Remove Term"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* MODAL FOOTER ACTIONS */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 -mx-6 -mb-6 p-4 px-6">
                <button
                  type="button"
                  onClick={() => {
                    const primary = selectedIndents[0];
                    if (primary)
                      updateSupplierFields(
                        primary.vendorName ||
                          primary.selected_vendor_name ||
                          dbVendors[0]?.vendor_name ||
                          dbVendors[0]?.name ||
                          "",
                      );
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Reset
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadDraftPdf}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDraftPdf}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PO</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{poMode === "revise" ? "Update PO" : "Send PO"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
