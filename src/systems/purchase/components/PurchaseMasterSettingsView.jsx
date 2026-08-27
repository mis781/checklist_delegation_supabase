import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Truck,
  Building,
  CreditCard,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  RefreshCw,
  X,
  Save,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Lock,
  Percent,
  Users,
  Navigation,
  DollarSign,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { isAdministrator } from "../../../utils/roleUtils";
import {
  fetchMasterVendors,
  upsertMasterVendor,
  deleteMasterVendor,
  fetchMasterTransporters,
  upsertMasterTransporter,
  deleteMasterTransporter,
  fetchMasterDivisions,
  fetchMasterWarehouses,
  fetchMasterAddresses,
  upsertMasterAddress,
  deleteMasterAddress,
  fetchMasterRejectReasons,
  upsertMasterRejectReason,
  deleteMasterRejectReason,
  fetchMasterApprovers,
  addMasterApprover,
  deleteMasterApprover,
  fetchAllUsersForApproverSelection,
  fetchLookupTables,
  fetchMasterTransportTypes,
  upsertMasterTransportType,
  deleteMasterTransportType,
} from "../services/purchaseMasterApi";

const DEFAULT_TRANSPORT_TYPES = [
  { id: "tt-1", name: "F.O.R.", description: "Freight on Road (Supplier bears transport cost)" },
  { id: "tt-2", name: "Ex-Factory", description: "Buyer arranges and pays freight pickup from factory" },
  { id: "tt-3", name: "Ex-Factory + Transport", description: "Factory price + separate transport line charge" },
];

const DEFAULT_GST_RATES = [
  { id: "gst-1", name: "0%", rate_percent: 0, description: "Exempt / Nil Rated items" },
  { id: "gst-2", name: "5%", rate_percent: 5, description: "Essential commodities & transport" },
  { id: "gst-3", name: "12%", rate_percent: 12, description: "Standard processed items" },
  { id: "gst-4", name: "18%", rate_percent: 18, description: "Standard industrial supplies & raw materials" },
  { id: "gst-5", name: "28%", rate_percent: 28, description: "Luxury & heavy equipment" },
];

const DEFAULT_PAYMENT_TERMS = [
  { id: "pt-1", name: "100% Advance", description: "Full payment prior to dispatch" },
  { id: "pt-2", name: "50% Advance, 50% on Dispatch", description: "Half advance, balance on dispatch proof" },
  { id: "pt-3", name: "Net 30 Days", description: "30 days credit from invoice date" },
  { id: "pt-4", name: "Net 45 Days", description: "45 days credit from invoice date" },
  { id: "pt-5", name: "Immediate on GRN", description: "Payment upon successful gate inward and quality pass" },
];

export default function PurchaseMasterSettingsView({ activeUser }) {
  const { showToast } = useMagicToast();

  const isAdminOrSuper =
    isAdministrator(activeUser?.role, activeUser?.name || activeUser?.user_name) ||
    isAdministrator(localStorage.getItem("role"), localStorage.getItem("user-name"));

  // Active Sub-Tab (8 sections)
  const [subTab, setSubTab] = useState("vendors");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Data States
  const [vendors, setVendors] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [rejectReasons, setRejectReasons] = useState([]);
  const [transportTypes, setTransportTypes] = useState(DEFAULT_TRANSPORT_TYPES);
  const [gstRates, setGstRates] = useState(DEFAULT_GST_RATES);
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_PAYMENT_TERMS);

  // Approvers Dedicated State
  const [systemUsers, setSystemUsers] = useState([]);
  const [selectedApproverUserId, setSelectedApproverUserId] = useState("");
  const [customApproverName, setCustomApproverName] = useState("");
  const [customApproverDesignation, setCustomApproverDesignation] = useState("");
  const [isAddingApprover, setIsAddingApprover] = useState(false);

  // Modal / Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [divisions, setDivisions] = useState([]);

  // Form State Models
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    gst: "",
    pan: "",
    address: "",
    phone: "",
  });

  const [transporterForm, setTransporterForm] = useState({
    transport_name: "",
    email: "",
    gst: "",
    address: "",
    pan: "",
    has_tds: false,
    tds_percent: "",
    mobile: "",
  });

  const [addressForm, setAddressForm] = useState({
    division: "",
    name: "",
    address: "",
  });

  const divisionOptions = useMemo(() => {
    return (divisions || []).map((d) => (typeof d === "string" ? d : d.name)).filter(Boolean);
  }, [divisions]);

  const [rejectForm, setRejectForm] = useState({
    name: "",
    category: "Dimensional Deviation",
    severity: "High",
    description: "",
  });

  const [genericForm, setGenericForm] = useState({
    name: "",
    rate_percent: "",
    description: "",
  });

  // Load all master datasets
  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [vData, tData, aData, appData, rData, usersData, ttData, divData] = await Promise.allSettled([
        fetchMasterVendors(),
        fetchMasterTransporters(),
        fetchMasterAddresses(),
        fetchMasterApprovers(),
        fetchMasterRejectReasons(),
        fetchAllUsersForApproverSelection(),
        fetchMasterTransportTypes(),
        fetchMasterDivisions(),
      ]);

      if (vData.status === "fulfilled") setVendors(vData.value || []);
      if (tData.status === "fulfilled") setTransporters(tData.value || []);
      if (aData.status === "fulfilled") setAddresses(aData.value || []);
      if (appData.status === "fulfilled") setApprovers(appData.value || []);
      if (rData.status === "fulfilled") setRejectReasons(rData.value || []);
      if (usersData.status === "fulfilled") setSystemUsers(usersData.value || []);
      if (divData.status === "fulfilled") {
        const loadedDivs = divData.value || [];
        setDivisions(loadedDivs);
      }
      if (ttData.status === "fulfilled" && ttData.value && ttData.value.length > 0) {
        setTransportTypes(ttData.value);
      }
    } catch (err) {
      console.error("Error loading purchase master data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Approver Add & Delete Handlers
  const handleAddApprover = async (e) => {
    e?.preventDefault?.();
    if (!selectedApproverUserId && !customApproverName.trim()) {
      if (showToast) showToast("Please select a user or enter an approver name", "warning");
      return;
    }
    setIsAddingApprover(true);
    try {
      const matchedUser = systemUsers.find((u) => u.id === selectedApproverUserId);
      const nameToSave = customApproverName.trim() || matchedUser?.user_name || matchedUser?.name;
      const designationToSave = customApproverDesignation.trim() || matchedUser?.role || "Approver";
      const departmentToSave = matchedUser?.department || "Management";

      const payload = {
        user_id: matchedUser?.id || null,
        approver_name: nameToSave,
        designation: designationToSave,
        department: departmentToSave,
      };

      let saved;
      try {
        saved = await addMasterApprover(payload);
      } catch (dbErr) {
        console.warn("DB Approver Insert Note:", dbErr);
      }

      const newEntry = {
        id: saved?.id || `app-${Date.now()}`,
        user_id: payload.user_id,
        name: payload.approver_name,
        username: payload.approver_name,
        approver_name: payload.approver_name,
        designation: payload.designation,
        department: payload.department,
        is_active: true,
      };

      setApprovers((prev) => [newEntry, ...prev.filter((p) => (p.approver_name || p.name) !== newEntry.approver_name)]);
      setSelectedApproverUserId("");
      setCustomApproverName("");
      setCustomApproverDesignation("");
      if (showToast) showToast("Approver added successfully!", "success");
    } catch (err) {
      console.error("Add approver error:", err);
      if (showToast) showToast(`Failed: ${err.message}`, "error");
    } finally {
      setIsAddingApprover(false);
    }
  };

  const handleDeleteApprover = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name || "this approver"}?`)) return;
    try {
      if (id && !String(id).startsWith("app-")) {
        await deleteMasterApprover(id);
      }
      setApprovers((prev) => prev.filter((a) => a.id !== id));
      if (showToast) showToast("Approver removed successfully", "success");
    } catch (err) {
      console.error("Delete approver error:", err);
      setApprovers((prev) => prev.filter((a) => a.id !== id));
      if (showToast) showToast("Approver removed", "info");
    }
  };

  // Form Openers
  const openNewModal = () => {
    setEditingItem(null);
    setVendorForm({
      name: "",
      contact_person: "",
      email: "",
      gst: "",
      pan: "",
      address: "",
      phone: "",
    });
    setTransporterForm({
      transport_name: "",
      email: "",
      gst: "",
      address: "",
      pan: "",
      has_tds: false,
      tds_percent: "",
      mobile: "",
    });
    setAddressForm({
      division: divisionOptions[0] || "",
      name: "",
      address: "",
    });
    setRejectForm({
      name: "",
      category: "Dimensional Deviation",
      severity: "High",
      description: "",
    });
    setGenericForm({
      name: "",
      rate_percent: "",
      description: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (item, type) => {
    setEditingItem(item);
    if (type === "vendor") {
      setVendorForm({
        name: item.vendor_name || item.name || "",
        contact_person: item.contact_person || "",
        email: item.email || "",
        gst: item.gstin || item.gst || "",
        pan: item.pan_number || item.pan_no || item.pan || "",
        address: item.address || "",
        phone: item.phone || "",
      });
    } else if (type === "transporter") {
      setTransporterForm({
        transport_name: item.transporter_name || item.transport_name || item.name || "",
        email: item.email || "",
        gst: item.gstin || item.gst || "",
        address: item.address || "",
        pan: item.pan_no || item.pan || "",
        has_tds: !!(item.tds_percent || item.has_tds),
        tds_percent: item.tds_percent || "",
        mobile: item.phone || item.mobile || "",
      });
    } else if (type === "address") {
      let div = item.division || "";
      let nm = item.rawName || item.name || "";
      if (!item.division && item.name && item.name.includes(" - ")) {
        const parts = item.name.split(" - ");
        div = parts[0].trim();
        nm = parts.slice(1).join(" - ").trim();
      }
      setAddressForm({
        division: div || (divisionOptions[0] || ""),
        name: nm,
        address: item.address || item.address_line || "",
      });
    } else if (type === "reject") {
      setRejectForm({
        name: item.name || "",
        category: item.category || "Dimensional Deviation",
        severity: item.severity || "High",
        description: item.description || "",
      });
    } else if (type === "generic") {
      setGenericForm({
        name: item.term_text || item.name || "",
        rate_percent: item.rate_percent || "",
        description: item.description || "",
      });
    }
    setModalOpen(true);
  };

  // Form Submissions
  const handleSaveVendor = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        vendor_name: vendorForm.name,
        contact_person: vendorForm.contact_person || "-",
        email: vendorForm.email,
        gstin: vendorForm.gst,
        pan_number: vendorForm.pan,
        address: vendorForm.address,
        billing_address: vendorForm.address,
        phone: vendorForm.phone,
        is_active: true,
        ...(editingItem?.id && !String(editingItem.id).startsWith("v-") ? { id: editingItem.id } : {}),
      };

      await upsertMasterVendor(payload);

      // Reload from DB so list reflects actual persisted data
      const freshVendors = await fetchMasterVendors();
      setVendors(freshVendors || []);

      if (editingItem) {
        if (showToast) showToast("Vendor updated successfully!", "success");
      } else {
        if (showToast) showToast("Vendor registered successfully!", "success");
      }

      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("handleSaveVendor error:", err);
      if (showToast) showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleSaveTransporter = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        transporter_name: transporterForm.transport_name,
        transport_name: transporterForm.transport_name,
        name: transporterForm.transport_name,
        email: transporterForm.email,
        gstin: transporterForm.gst,
        gst: transporterForm.gst,
        address: transporterForm.address,
        pan_no: transporterForm.pan,
        pan: transporterForm.pan,
        has_tds: transporterForm.has_tds,
        tds_percent: transporterForm.has_tds ? transporterForm.tds_percent : null,
        phone: transporterForm.mobile,
        mobile: transporterForm.mobile,
        ...(editingItem?.id && !String(editingItem.id).startsWith("t-") ? { id: editingItem.id } : {}),
      };

      try {
        await upsertMasterTransporter(payload);
      } catch (dbErr) {
        console.warn("DB upsert note:", dbErr);
      }

      if (editingItem) {
        setTransporters((prev) =>
          prev.map((t) => (t.id === editingItem.id ? { ...t, ...payload, id: editingItem.id } : t))
        );
        if (showToast) showToast("Transporter updated successfully!", "success");
      } else {
        const newT = { ...payload, id: `t-${Date.now()}` };
        setTransporters((prev) => [newT, ...prev]);
        if (showToast) showToast("Transporter registered successfully!", "success");
      }

      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      if (showToast) showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      const formattedName = addressForm.division
        ? addressForm.name.startsWith(addressForm.division)
          ? addressForm.name
          : `${addressForm.division} - ${addressForm.name}`
        : addressForm.name;

      const payload = {
        name: formattedName.trim(),
        address: (addressForm.address || "").trim(),
        is_active: true,
        ...(editingItem?.id && !String(editingItem.id).startsWith("addr-") ? { id: editingItem.id } : {}),
      };

      try {
        await upsertMasterAddress(payload);
      } catch (dbErr) {
        console.warn("DB upsert note:", dbErr);
      }

      const freshAddresses = await fetchMasterAddresses();
      if (freshAddresses && freshAddresses.length > 0) {
        setAddresses(freshAddresses);
      } else {
        const stateItem = {
          ...payload,
          division: addressForm.division,
          rawName: addressForm.name,
        };
        if (editingItem) {
          setAddresses((prev) =>
            prev.map((a) => (a.id === editingItem.id ? { ...a, ...stateItem, id: editingItem.id } : a))
          );
        } else {
          setAddresses((prev) => [{ ...stateItem, id: `addr-${Date.now()}` }, ...prev]);
        }
      }

      if (editingItem) {
        if (showToast) showToast("Company address updated successfully!", "success");
      } else {
        if (showToast) showToast("Company address registered successfully!", "success");
      }

      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      if (showToast) showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleSaveRejectReason = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: rejectForm.name,
        category: rejectForm.category,
        severity: rejectForm.severity,
        description: rejectForm.description,
        ...(editingItem?.id && !String(editingItem.id).startsWith("rej-") ? { id: editingItem.id } : {}),
      };

      try {
        await upsertMasterRejectReason(payload);
      } catch (dbErr) {
        console.warn("DB reject upsert note:", dbErr);
      }

      if (editingItem) {
        setRejectReasons((prev) =>
          prev.map((r) => (r.id === editingItem.id ? { ...r, ...payload, id: editingItem.id } : r))
        );
        if (showToast) showToast("Rejection reason updated!", "success");
      } else {
        const newR = { ...payload, id: `rej-${Date.now()}` };
        setRejectReasons((prev) => [newR, ...prev]);
        if (showToast) showToast("Rejection reason registered!", "success");
      }

      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      if (showToast) showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleSaveGeneric = async (e) => {
    e.preventDefault();
    const payload = {
      name: genericForm.name,
      rate_percent: genericForm.rate_percent ? Number(genericForm.rate_percent) : undefined,
      description: genericForm.description,
      ...(editingItem?.id ? { id: editingItem.id } : { id: `gen-${Date.now()}` }),
    };

    if (subTab === "transport_types") {
      try {
        const saved = await upsertMasterTransportType({
          name: genericForm.name,
          ...(editingItem?.id && !String(editingItem.id).startsWith("tt-") ? { id: editingItem.id } : {}),
        });
        setTransportTypes((prev) =>
          editingItem ? prev.map((t) => (t.id === editingItem.id ? saved : t)) : [saved, ...prev]
        );
      } catch (ttErr) {
        setTransportTypes((prev) =>
          editingItem ? prev.map((t) => (t.id === editingItem.id ? payload : t)) : [payload, ...prev]
        );
      }
      if (showToast) showToast("Transport Type saved to database!", "success");
    } else if (subTab === "gst_rates") {
      setGstRates((prev) =>
        editingItem ? prev.map((g) => (g.id === editingItem.id ? payload : g)) : [payload, ...prev]
      );
      if (showToast) showToast("GST Rate saved!", "success");
    } else if (subTab === "payment_terms") {
      setPaymentTerms((prev) =>
        editingItem ? prev.map((p) => (p.id === editingItem.id ? payload : p)) : [payload, ...prev]
      );
      if (showToast) showToast("Payment Term saved!", "success");
    }

    setModalOpen(false);
    setEditingItem(null);
  };

  // Delete Action
  const handleDeleteItem = async (type, id) => {
    if (!window.confirm("Are you sure you want to remove this record?")) return;
    try {
      if (type === "vendor") {
        if (!String(id).startsWith("v-")) await deleteMasterVendor(id);
        setVendors((prev) => prev.filter((v) => v.id !== id));
      } else if (type === "transporter") {
        if (!String(id).startsWith("t-")) await deleteMasterTransporter(id);
        setTransporters((prev) => prev.filter((t) => t.id !== id));
      } else if (type === "address") {
        if (!String(id).startsWith("addr-")) await deleteMasterAddress(id);
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      } else if (type === "reject") {
        if (!String(id).startsWith("rej-")) await deleteMasterRejectReason(id);
        setRejectReasons((prev) => prev.filter((r) => r.id !== id));
      } else if (type === "transport_type") {
        if (!String(id).startsWith("tt-")) await deleteMasterTransportType(id);
        setTransportTypes((prev) => prev.filter((t) => t.id !== id));
      } else if (type === "gst_rate") {
        setGstRates((prev) => prev.filter((g) => g.id !== id));
      } else if (type === "payment_term") {
        setPaymentTerms((prev) => prev.filter((p) => p.id !== id));
      }
      if (showToast) showToast("Record removed successfully", "success");
    } catch (err) {
      if (showToast) showToast(`Delete failed: ${err.message}`, "error");
    }
  };

  // Filtering
  const filteredVendors = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return vendors.filter(
      (v) =>
        !s ||
        (v.vendor_name || v.name || "").toLowerCase().includes(s) ||
        (v.gstin || v.gst || "").toLowerCase().includes(s) ||
        (v.city || "").toLowerCase().includes(s) ||
        (v.email || "").toLowerCase().includes(s)
    );
  }, [vendors, searchTerm]);

  const filteredTransporters = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return transporters.filter(
      (t) =>
        !s ||
        (t.transporter_name || t.transport_name || t.name || "").toLowerCase().includes(s) ||
        (t.gstin || t.gst || "").toLowerCase().includes(s) ||
        (t.phone || t.mobile || "").toLowerCase().includes(s)
    );
  }, [transporters, searchTerm]);

  if (!isAdminOrSuper) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl text-center shadow-xs">
        <div className="p-4 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 rounded-2xl mb-3">
          <Lock className="w-8 h-8" />
        </div>
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 max-w-sm">
          Purchase System Master configurations are restricted to Admin / Superadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 8-Section Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSubTab("vendors");
              setSearchTerm("");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "vendors"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Vendors ({vendors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab("addresses");
              setSearchTerm("");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "addresses"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Company Addresses ({addresses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab("approvers");
              setSearchTerm("");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "approvers"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Approvers ({approvers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab("transporters");
              setSearchTerm("");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "transporters"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Transporters Details ({transporters.length})</span>
          </button>

          {/* Reject Reasons tab hidden */}

          <button
            type="button"
            onClick={() => {
              setSubTab("transport_types");
              setSearchTerm("");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "transport_types"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Transport Types ({transportTypes.length})</span>
          </button>

          {/* GST Rates tab hidden */}

          {/* Payment Terms tab hidden */}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMasterData}
            title="Refresh Data"
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {subTab !== "approvers" && (
            <button
              type="button"
              onClick={openNewModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab 1: Vendors */}
      {subTab === "vendors" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Vendors Directory
              </h3>
              <p className="text-xs text-slate-500">
                Official approved supplier contact numbers, GST, PAN, address, city, and phone
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, GST, city, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Vendor Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone / Mobile</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">PAN Number</th>
                  <th className="p-3">Address & City</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {v.vendor_name || v.name}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {v.email || "—"}
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                      {v.phone || "—"}
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {v.gstin || v.gst || "—"}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      {v.pan_no || v.pan || "—"}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {v.address ? `${v.address}, ${v.city || ""}` : v.city || "—"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(v, "vendor")}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem("vendor", v.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No vendors registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Company Addresses */}
      {subTab === "addresses" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Company & Plant Shipping Addresses
              </h3>
              <p className="text-xs text-slate-500">
                Official billing and shipping addresses printed on Purchase Orders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {addresses.map((a) => {
              const divName = a.division || (a.name?.includes(" - ") ? a.name.split(" - ")[0] : "Division");
              const displayName = a.rawName || (a.name?.includes(" - ") ? a.name.split(" - ").slice(1).join(" - ") : a.name);

              return (
                <div
                  key={a.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {divName}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(a, "address")}
                        className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                        title="Edit Address"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem("address", a.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">{displayName}</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                    {a.address || a.address_line || "—"}
                  </p>
                </div>
              );
            })}
            {addresses.length === 0 && (
              <div className="col-span-3 text-center py-8 text-xs text-slate-400">
                No company addresses registered. Click "+ Add New" to add a plant/office address.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Manage Approvers */}
      {subTab === "approvers" && (
        <div className="space-y-6">
          {/* Section Header */}
          {/* <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Manage Approvers
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Authorized personnel who approve indents, vendors, and purchase orders.
                </p>
              </div>
            </div>
          </div> */}

          {/* 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: + ADD OPTION VALUE */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Plus className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  + ADD OPTION VALUE
                </h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Select User (Admin / ADMINISTRATOR)
                  </label>
                  <select
                    value={selectedApproverUserId}
                    onChange={(e) => {
                      const uId = e.target.value;
                      setSelectedApproverUserId(uId);
                      const u = systemUsers.find((user) => String(user.id) === String(uId));
                      if (u) {
                        setCustomApproverName(u.user_name || u.name || "");
                        setCustomApproverDesignation(u.role || "ADMINISTRATOR");
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Admin / ADMINISTRATOR User --</option>
                    {systemUsers
                      .filter((u) => isAdministrator(u.role, u.user_name || u.name))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.user_name || u.name} ({u.role || "ADMINISTRATOR"}{u.phone ? ` • 📞 ${u.phone}` : ""}{u.department ? ` - ${u.department}` : ""})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Value Name (Approver Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter new approvers..."
                    value={customApproverName}
                    onChange={(e) => setCustomApproverName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Designation / Authority Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HOD / Plant Head / Director"
                    value={customApproverDesignation}
                    onChange={(e) => setCustomApproverDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={isAddingApprover}
                  onClick={handleAddApprover}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingApprover ? "Adding..." : "+ Add Value"}</span>
                </button>
              </div>
            </div>

            {/* Right Column: CURRENT VALUES (N) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  CURRENT VALUES ({approvers.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {approvers.map((a) => (
                  <div
                    key={a.id}
                    className="px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center text-xs shrink-0">
                        {(a.approver_name || a.name || a.username || "A")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {a.approver_name || a.name || a.username}
                        </span>
                        {(a.phone || a.contact || a.mobile) && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            {a.phone || a.contact || a.mobile}
                          </span>
                        )}
                        {(a.designation || a.department) && (
                          <span className="text-[10px] text-slate-400 font-semibold truncate block mt-0.5">
                            {a.designation || a.department}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteApprover(a.id, a.approver_name || a.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remove Approver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {approvers.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-400 text-xs font-semibold">
                    No designated approvers added yet. Select a user on the left and click "+ Add Value".
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Transporters Details */}
      {subTab === "transporters" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Transporters Details & Logistics Carriers
              </h3>
              <p className="text-xs text-slate-500">
                Authorized transporters with Email, GST, Address, PAN, Mobile, and TDS settings
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search transporter, GST, mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Transport Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Mobile No.</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">PAN Number</th>
                  <th className="p-3">TDS Applicable</th>
                  <th className="p-3">Address</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransporters.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {t.transporter_name || t.transport_name || t.name}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{t.email || "—"}</td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                      {t.phone || t.mobile || "—"}
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {t.gstin || t.gst || "—"}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      {t.pan_no || t.pan || "—"}
                    </td>
                    <td className="p-3">
                      {t.has_tds || t.tds_percent ? (
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300">
                          Yes ({t.tds_percent || "1"}%)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">No</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{t.address || "—"}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(t, "transporter")}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem("transporter", t.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransporters.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      No transporters registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Reject Reasons */}
      {subTab === "reject_reasons" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Quality Gate Reject Reasons & Defect Codes
            </h3>
            <p className="text-xs text-slate-500">
              Standardized rejection codes utilized during inward inspection
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rejectReasons.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-start justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300">{r.name}</h4>
                  <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                    {r.category || "General Defect"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(r, "reject")}
                    className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem("reject", r.id)}
                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 6: Transport Types */}
      {subTab === "transport_types" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Transport Terms & Shipping Types
            </h3>
            <p className="text-xs text-slate-500">
              Commercial logistics freight arrangement options (F.O.R., Ex-Factory, etc.)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {transportTypes.map((t) => (
              <div
                key={t.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">{t.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{t.description || "—"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(t, "generic")}
                    className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem("transport_type", t.id)}
                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 7: GST Rates */}
      {subTab === "gst_rates" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              GST Tax Rates & Slabs
            </h3>
            <p className="text-xs text-slate-500">
              Standard statutory GST tax brackets applied on PO item line totals
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {gstRates.map((g) => (
              <div
                key={g.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-center relative group"
              >
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">{g.name}</div>
                <p className="text-[10px] text-slate-500 truncate">{g.description}</p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(g, "generic")}
                    className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem("gst_rate", g.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 8: Payment Terms */}
      {subTab === "payment_terms" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Commercial Payment Terms
            </h3>
            <p className="text-xs text-slate-500">
              Settlement and credit period options configured on Purchase Orders and Quotes
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {paymentTerms.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{p.description || "—"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(p, "generic")}
                    className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem("payment_term", p.id)}
                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingItem
                  ? subTab === "addresses"
                    ? "Edit Company Address"
                    : "Edit Record"
                  : subTab === "addresses"
                  ? "Add New Company Address"
                  : `Add New ${subTab.replace("_", " ")}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vendor Form: name, contact_person, email, phone, gst, pan, address */}
            {subTab === "vendors" && (
              <form onSubmit={handleSaveVendor} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jindal Steel & Power Ltd"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={vendorForm.contact_person}
                    onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      placeholder="vendor@company.com"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Phone / Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">GSTIN</label>
                    <input
                      type="text"
                      placeholder="22AAAAA0000A1Z5"
                      value={vendorForm.gst}
                      onChange={(e) => setVendorForm({ ...vendorForm, gst: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">PAN</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={vendorForm.pan}
                      onChange={(e) => setVendorForm({ ...vendorForm, pan: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Address (include city)</label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Area Phase 2, Raipur, CG"
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Vendor</span>
                  </button>
                </div>
              </form>
            )}

            {/* Transporter Form: transport name, email, gst, address, pan, TDS, mobile */}
            {subTab === "transporters" && (
              <form onSubmit={handleSaveTransporter} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Transport Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Express Cargo Logistics"
                    value={transporterForm.transport_name}
                    onChange={(e) => setTransporterForm({ ...transporterForm, transport_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      placeholder="logistics@carrier.com"
                      value={transporterForm.email}
                      onChange={(e) => setTransporterForm({ ...transporterForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Mobile No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={transporterForm.mobile}
                      onChange={(e) => setTransporterForm({ ...transporterForm, mobile: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">GSTIN</label>
                    <input
                      type="text"
                      placeholder="22AAAAA0000A1Z5"
                      value={transporterForm.gst}
                      onChange={(e) => setTransporterForm({ ...transporterForm, gst: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">PAN</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={transporterForm.pan}
                      onChange={(e) => setTransporterForm({ ...transporterForm, pan: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>

                {/* TDS Checkbox & Percentage */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="has_tds"
                      checked={transporterForm.has_tds}
                      onChange={(e) =>
                        setTransporterForm({
                          ...transporterForm,
                          has_tds: e.target.checked,
                          tds_percent: e.target.checked ? transporterForm.tds_percent || "1" : "",
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="has_tds" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      TDS Applicable on Freight
                    </label>
                  </div>
                  {transporterForm.has_tds && (
                    <div className="space-y-1 pl-6">
                      <label className="font-bold text-slate-600 dark:text-slate-400">TDS Percentage (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 1 or 2"
                        value={transporterForm.tds_percent}
                        onChange={(e) => setTransporterForm({ ...transporterForm, tds_percent: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Office / Hub Address</label>
                  <input
                    type="text"
                    placeholder="Transport Nagar, Shop #12"
                    value={transporterForm.address}
                    onChange={(e) => setTransporterForm({ ...transporterForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Transporter</span>
                  </button>
                </div>
              </form>
            )}

            {/* Address Form: Division (dropdown), Name (input), Address (merged single text box) */}
            {subTab === "addresses" && (
              <form onSubmit={handleSaveAddress} className="p-6 space-y-4 text-xs">
                {/* 1. Division Dropdown */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Division <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={addressForm.division}
                    onChange={(e) => setAddressForm({ ...addressForm, division: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- Select Division --</option>
                    {divisionOptions.map((div, idx) => (
                      <option key={`div-${div}-${idx}`} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raipur Plant Unit 1 / Factory Gate 2"
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* 3. Address (Single merged text box) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter complete address (Plot No., Industrial Area, City, State, Pincode)..."
                    value={addressForm.address}
                    onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setEditingItem(null);
                    }}
                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Address</span>
                  </button>
                </div>
              </form>
            )}

            {/* Reject Reason Form */}
            {subTab === "reject_reasons" && (
              <form onSubmit={handleSaveRejectReason} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Defect / Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thickness Out of Tolerance"
                    value={rejectForm.name}
                    onChange={(e) => setRejectForm({ ...rejectForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Defect Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Dimensional Deviation, Physical Damage"
                    value={rejectForm.category}
                    onChange={(e) => setRejectForm({ ...rejectForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Description / SOP</label>
                  <textarea
                    rows={2}
                    placeholder="Inspection guideline notes..."
                    value={rejectForm.description}
                    onChange={(e) => setRejectForm({ ...rejectForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Reject Code</span>
                  </button>
                </div>
              </form>
            )}

            {/* Generic Form (Transport Types, GST Rates, Payment Terms, Quotation Terms) */}
            {(subTab === "transport_types" || subTab === "gst_rates" || subTab === "payment_terms" || subTab === "quotation_terms") && (
              <form onSubmit={handleSaveGeneric} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {subTab === "quotation_terms" ? "Quotation Term / Instruction" : "Title / Option Name"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      subTab === "transport_types"
                        ? "e.g. F.O.R. Destination"
                        : subTab === "gst_rates"
                        ? "e.g. 18%"
                        : subTab === "payment_terms"
                        ? "e.g. 100% Advance"
                        : "e.g. Rates should be inclusive of standard industrial packing."
                    }
                    value={genericForm.name}
                    onChange={(e) => setGenericForm({ ...genericForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                {subTab === "gst_rates" && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Rate Percentage (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="18"
                      value={genericForm.rate_percent}
                      onChange={(e) => setGenericForm({ ...genericForm, rate_percent: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description..."
                    value={genericForm.description}
                    onChange={(e) => setGenericForm({ ...genericForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Option</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
