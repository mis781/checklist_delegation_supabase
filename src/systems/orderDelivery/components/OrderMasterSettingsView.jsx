import { useState, useEffect, useMemo, useRef } from "react";
import {
  UserCheck,
  Wallet,
  Plus,
  Trash2,
  Edit2,
  Search,
  X,
  Save,
  Building,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import supabase from "../../../SupabaseClient";
import * as o2dApi from "../services/o2dApi";
import {
  DATA_CHANGED_EVENT,
  getVendors,
  saveVendor,
  deleteVendor,
  getPersons,
  savePerson,
  deletePerson,
  getDivisions,
  getPaymentTermsMaster,
  savePaymentTermMaster,
  updatePaymentTermMaster,
  deletePaymentTermMaster
} from "../utils/storageManager";

export default function OrderMasterSettingsView() {
  const { showToast } = useMagicToast();

  // Sub-tabs: 'parties', 'receivers', 'transport_types', 'transporters', 'payment_terms'
  const [subTab, setSubTab] = useState("parties");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Master Data States
  const [parties, setParties] = useState([]);
  const [persons, setPersons] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Forms
  const [partyForm, setPartyForm] = useState({
    name: "",
    party_code: "",
    gst_number: "",
    email: "",
    phone: "",
    address: "",
    location_link: "",
    responsible_person: ""
  });

  const [personForm, setPersonForm] = useState({
    name: "",
    person_code: "",
    phone: "",
    department: "",
    division_id: "",
    division_name: ""
  });

  const [paymentTermForm, setPaymentTermForm] = useState({
    term: ""
  });

  // Realtime Broadcast Channel Ref
  const channelRef = useRef(null);

  // Broadcast realtime events across all browser tabs and client devices
  const broadcastMasterUpdate = (entity) => {
    try {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "master_updated",
          payload: { entity, timestamp: Date.now() }
        });
      }
    } catch (err) {
      console.warn("[broadcastMasterUpdate] channel broadcast error:", err);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { key: entity } }));
    }
  };

  // Reset pagination on tab/search change
  useEffect(() => {
    setPage(1);
  }, [subTab, searchTerm]);

  const isFetchingRef = useRef(false);

  // Load all master data directly from live Supabase + storageManager
  const loadAllData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [
        liveParties,
        livePersons,
        liveDivs,
        liveUsers
      ] = await Promise.allSettled([
        o2dApi.fetchParties(),
        o2dApi.fetchPersons(),
        o2dApi.fetchLiveDivisions(),
        o2dApi.fetchLiveUsers()
      ]);

      if (liveParties.status === "fulfilled" && Array.isArray(liveParties.value) && liveParties.value.length > 0) {
        setParties(liveParties.value);
      } else {
        const cached = getVendors();
        if (cached && cached.length > 0) {
          setParties(cached);
        } else if (liveParties.status === "fulfilled" && liveParties.value) {
          setParties(liveParties.value);
        }
      }

      if (livePersons.status === "fulfilled" && Array.isArray(livePersons.value)) {
        setPersons(livePersons.value);
        try {
          localStorage.setItem("pcb_persons_v1", JSON.stringify(livePersons.value));
        } catch {
          // ignore
        }
      } else {
        const cached = getPersons();
        const validCached = (cached || []).filter(
          (p) => !String(p.prNo || "").startsWith("PRS-") && !String(p.id || "").startsWith("PRS-")
        );
        setPersons(validCached);
      }

      if (liveDivs.status === "fulfilled" && Array.isArray(liveDivs.value) && liveDivs.value.length > 0) {
        setDivisions(liveDivs.value);
      } else {
        setDivisions(getDivisions());
      }

      if (liveUsers.status === "fulfilled" && Array.isArray(liveUsers.value)) {
        setAvailableUsers(liveUsers.value);
      }

      setPaymentTerms(getPaymentTermsMaster());
    } catch (err) {
      console.error("[OrderMasterSettingsView] loadAllData error:", err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Immediate purge of any legacy PRS- dummy receivers from localStorage
    try {
      const cached = getPersons();
      if (Array.isArray(cached) && cached.some((p) => String(p.prNo || "").startsWith("PRS-") || String(p.id || "").startsWith("PRS-"))) {
        const cleaned = cached.filter((p) => !String(p.prNo || "").startsWith("PRS-") && !String(p.id || "").startsWith("PRS-"));
        localStorage.setItem("pcb_persons_v1", JSON.stringify(cleaned));
        setPersons(cleaned);
      }
    } catch (e) {
      console.warn("Could not clean cached persons:", e);
    }

    // Initial load
    loadAllData();

    let debounceTimer = null;
    const handleDataChanged = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadAllData();
      }, 400);
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);

    // Cross-tab sync via browser BroadcastChannel if supported
    let tabChannel = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        tabChannel = new BroadcastChannel("o2d_master_tab_sync");
        tabChannel.onmessage = () => {
          handleDataChanged();
        };
      }
    } catch {
      // ignore
    }

    // Live Supabase Broadcast + Realtime channel subscription for instant cross-device updates
    const channel = supabase
      .channel("o2d_master_broadcast_channel")
      .on("broadcast", { event: "master_updated" }, () => {
        handleDataChanged();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "o2d_parties" }, () => {
        handleDataChanged();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "o2d_persons" }, () => {
        handleDataChanged();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
      if (tabChannel) tabChannel.close();
      supabase.removeChannel(channel);
    };
  }, []);

  // -------------------------------------------------------------
  // Filtered & Paginated Records
  // -------------------------------------------------------------
  const filteredParties = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return parties;
    return parties.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.sn?.toLowerCase().includes(q) ||
      p.partyCode?.toLowerCase().includes(q) ||
      p.gstin?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.responsiblePerson?.toLowerCase().includes(q)
    );
  }, [parties, searchTerm]);

  const filteredPersons = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return persons;
    return persons.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.prNo?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  }, [persons, searchTerm]);

  const filteredPaymentTerms = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return paymentTerms;
    return paymentTerms.filter((term) =>
      typeof term === "string" ? term.toLowerCase().includes(q) : term.name?.toLowerCase().includes(q)
    );
  }, [paymentTerms, searchTerm]);

  // Current subtab list count
  const currentTotal = useMemo(() => {
    switch (subTab) {
      case "parties": return filteredParties.length;
      case "receivers": return filteredPersons.length;
      case "payment_terms": return filteredPaymentTerms.length;
      default: return 0;
    }
  }, [subTab, filteredParties, filteredPersons, filteredPaymentTerms]);

  const totalPages = Math.ceil(currentTotal / pageSize) || 1;
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    switch (subTab) {
      case "parties": return filteredParties.slice(start, start + pageSize);
      case "receivers": return filteredPersons.slice(start, start + pageSize);
      case "payment_terms": return filteredPaymentTerms.slice(start, start + pageSize);
      default: return [];
    }
  }, [subTab, page, filteredParties, filteredPersons, filteredPaymentTerms]);

  // -------------------------------------------------------------
  // Open Add / Edit Modal
  // -------------------------------------------------------------
  const handleOpenAdd = () => {
    setEditingItem(null);
    if (subTab === "parties") {
      setPartyForm({
        name: "",
        party_code: `VN-${String(parties.length + 1).padStart(3, "0")}`,
        gst_number: "",
        email: "",
        phone: "",
        address: "",
        location_link: "",
        responsible_person: ""
      });
    } else if (subTab === "receivers") {
      setPersonForm({
        name: "",
        person_code: `OR-${String(persons.length + 1).padStart(3, "0")}`,
        phone: "",
        department: "",
        division_id: "",
        division_name: ""
      });
    } else if (subTab === "payment_terms") {
      setPaymentTermForm({ term: "" });
    }
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    if (subTab === "parties") {
      setPartyForm({
        name: item.name || item.partyName || "",
        party_code: item.sn || item.partyCode || item.party_code || "",
        gst_number: item.gstin || item.gst || item.gst_number || "",
        email: item.email || "",
        phone: item.phone || "",
        address: item.address || "",
        location_link: item.locationLink || item.location_link || "",
        responsible_person: item.responsiblePerson || item.responsible_person || ""
      });
    } else if (subTab === "receivers") {
      setPersonForm({
        name: item.name || "",
        person_code: item.prNo || item.person_code || "",
        phone: item.phone || "",
        department: item.department || "",
        division_id: item.divisionId || item.division_id || "",
        division_name: item.divisionName || item.division || ""
      });
    } else if (subTab === "payment_terms") {
      const termStr = typeof item === "string" ? item : item.name || item.term || "";
      setPaymentTermForm({ term: termStr });
    }
    setModalOpen(true);
  };

  // Handler to auto-populate fields when selecting a user from users table
  const handleSelectReceiverUser = (selectedUserName) => {
    const foundUser = availableUsers.find((u) => u.user_name === selectedUserName);
    if (foundUser) {
      let matchedDivId = "";
      if (foundUser.division && divisions.length > 0) {
        const divMatch = divisions.find((d) =>
          foundUser.division.toLowerCase().includes(d.name.toLowerCase()) ||
          d.name.toLowerCase().includes(foundUser.division.toLowerCase())
        );
        if (divMatch) matchedDivId = divMatch.id;
      }

      setPersonForm((prev) => ({
        ...prev,
        name: foundUser.user_name,
        phone: foundUser.number ? String(foundUser.number) : (foundUser.phone || ""),
        department: foundUser.department || "",
        division_id: matchedDivId,
        division_name: foundUser.division || ""
      }));
    } else {
      setPersonForm((prev) => ({
        ...prev,
        name: selectedUserName,
        phone: "",
        department: "",
        division_id: "",
        division_name: ""
      }));
    }
  };

  // -------------------------------------------------------------
  // Submit Handlers
  // -------------------------------------------------------------
  const handleSubmitParty = async (e) => {
    e.preventDefault();
    if (!partyForm.name.trim()) {
      showToast("Party Name is required.", "error");
      return;
    }

    const newCode = partyForm.party_code.trim() || `VN-${String(parties.length + 1).padStart(3, "0")}`;
    const partyData = {
      id: editingItem?.id || (editingItem?.dbId ? editingItem.dbId : undefined),
      dbId: editingItem?.dbId || (typeof editingItem?.id === "number" ? editingItem.id : undefined),
      name: partyForm.name.trim(),
      sn: newCode,
      partyCode: newCode,
      party_code: newCode,
      gst: partyForm.gst_number.trim() || undefined,
      gst_number: partyForm.gst_number.trim() || undefined,
      gstin: partyForm.gst_number.trim() || undefined,
      gstNumber: partyForm.gst_number.trim() || undefined,
      email: partyForm.email.trim() || undefined,
      phone: partyForm.phone.trim() || undefined,
      address: partyForm.address.trim() || undefined,
      locationLink: partyForm.location_link.trim() || undefined,
      responsiblePerson: partyForm.responsible_person.trim() || undefined
    };

    // 1. Optimistic UI update: Immediate 0ms update to UI table and badge count
    setParties((prev) => {
      const idx = prev.findIndex((p) => p.id === partyData.id || p.sn === partyData.sn);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...partyData };
        return next;
      }
      return [...prev, { ...partyData, id: Date.now() }];
    });

    setModalOpen(false);
    showToast(
      editingItem ? `Party "${partyForm.name}" updated successfully!` : `Party "${partyForm.name}" registered successfully!`,
      "success"
    );

    try {
      // 2. Persist to live Supabase table
      const savedRecord = await o2dApi.savePartyRecord(partyData);

      // 3. Update localStorage
      saveVendor({
        ...partyData,
        id: savedRecord.id,
        dbId: savedRecord.id,
        sn: savedRecord.party_code || partyData.sn
      });

      // 4. Update with server ID
      setParties((prev) =>
        prev.map((p) =>
          p.sn === newCode || p.id === partyData.id
            ? { ...p, id: savedRecord.id, dbId: savedRecord.id }
            : p
        )
      );

      // 5. Broadcast to all other tabs and clients in real time
      broadcastMasterUpdate("parties");
    } catch (err) {
      console.error("[OrderMasterSettingsView] handleSubmitParty error:", err);
      showToast("Failed to save party to database: " + (err.message || "Unknown error"), "error");
      const fresh = await o2dApi.fetchParties();
      setParties(fresh);
    }
  };

  const handleSubmitReceiver = async (e) => {
    e.preventDefault();
    if (!personForm.name.trim()) {
      showToast("Receiver Name is required. Please select a user.", "error");
      return;
    }

    const newCode = personForm.person_code.trim() || `OR-${String(persons.length + 1).padStart(3, "0")}`;
    const personData = {
      id: editingItem?.id || (editingItem?.dbId ? editingItem.dbId : undefined),
      dbId: editingItem?.dbId || (typeof editingItem?.id === "number" ? editingItem.id : undefined),
      name: personForm.name.trim(),
      prNo: newCode,
      personCode: newCode,
      person_code: newCode,
      phone: personForm.phone.trim() || undefined,
      department: personForm.department.trim() || undefined,
      divisionId: personForm.division_id ? Number(personForm.division_id) : null,
      divisionName: personForm.division_name || undefined
    };

    // 1. Optimistic UI update: Immediate 0ms update to UI table and badge count
    setPersons((prev) => {
      const idx = prev.findIndex((p) => p.id === personData.id || p.prNo === personData.prNo);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...personData };
        return next;
      }
      return [...prev, { ...personData, id: Date.now() }];
    });

    setModalOpen(false);
    showToast(
      editingItem ? `Receiver "${personForm.name}" updated successfully!` : `Receiver "${personForm.name}" registered successfully!`,
      "success"
    );

    try {
      // 2. Persist to live Supabase table
      const savedRecord = await o2dApi.savePersonRecord(personData);

      // 3. Update localStorage
      savePerson({
        ...personData,
        id: savedRecord.id,
        dbId: savedRecord.id,
        prNo: savedRecord.person_code || personData.prNo
      });

      // 4. Update with server ID
      setPersons((prev) =>
        prev.map((p) =>
          p.prNo === newCode || p.id === personData.id
            ? { ...p, id: savedRecord.id, dbId: savedRecord.id }
            : p
        )
      );

      // 5. Broadcast to all other tabs and clients in real time
      broadcastMasterUpdate("receivers");
    } catch (err) {
      console.error("[OrderMasterSettingsView] handleSubmitReceiver error:", err);
      showToast("Failed to save receiver to database: " + (err.message || "Unknown error"), "error");
      const fresh = await o2dApi.fetchPersons();
      setPersons(fresh);
    }
  };

  const handleSubmitPaymentTerm = (e) => {
    e.preventDefault();
    const val = paymentTermForm.term.trim();
    if (!val) {
      showToast("Payment term is required.", "error");
      return;
    }
    if (editingItem) {
      const oldVal = typeof editingItem === "string" ? editingItem : editingItem.name || editingItem.term || "";
      updatePaymentTermMaster(oldVal, val);
      showToast(`Payment term "${val}" updated successfully!`, "success");
    } else {
      savePaymentTermMaster(val);
      showToast(`Payment term "${val}" added successfully!`, "success");
    }
    setModalOpen(false);
    setPaymentTerms(getPaymentTermsMaster());
    broadcastMasterUpdate("payment_terms");
  };

  // -------------------------------------------------------------
  // Delete Handlers
  // -------------------------------------------------------------
  const promptDeleteParty = (party) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Party?",
      message: `Are you sure you want to delete party "${party.name}"? This action removes the party from customer selections.`,
      onConfirm: async () => {
        const targetId = party.dbId || party.id;
        // Optimistic UI deletion
        setParties((prev) => prev.filter((p) => p.id !== party.id && p.id !== targetId));
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
        showToast(`Party "${party.name}" deleted.`, "success");

        try {
          if (targetId) {
            await o2dApi.deletePartyRecord(targetId);
          }
          deleteVendor(party.id);
          broadcastMasterUpdate("parties");
        } catch (err) {
          showToast("Failed to delete party from database: " + err.message, "error");
          const fresh = await o2dApi.fetchParties();
          setParties(fresh);
        }
      }
    });
  };

  const promptDeletePerson = (person) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Receiver?",
      message: `Are you sure you want to delete receiver "${person.name}"?`,
      onConfirm: async () => {
        const targetId = person.dbId || person.id;
        // Optimistic UI deletion
        setPersons((prev) => prev.filter((p) => p.id !== person.id && p.id !== targetId));
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
        showToast(`Receiver "${person.name}" deleted.`, "success");

        try {
          if (targetId) {
            await o2dApi.deletePersonRecord(targetId);
          }
          deletePerson(person.id);
          broadcastMasterUpdate("receivers");
        } catch (err) {
          showToast("Failed to delete receiver from database: " + err.message, "error");
          const fresh = await o2dApi.fetchPersons();
          setPersons(fresh);
        }
      }
    });
  };

  const promptDeletePaymentTerm = (term) => {
    const termStr = typeof term === "string" ? term : term.name || term.term || "";
    setDeleteConfirm({
      isOpen: true,
      title: "Delete Payment Term?",
      message: `Are you sure you want to delete payment term "${termStr}"?`,
      onConfirm: () => {
        deletePaymentTermMaster(termStr);
        setPaymentTerms(getPaymentTermsMaster());
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
        showToast(`Payment term "${termStr}" deleted.`, "success");
        broadcastMasterUpdate("payment_terms");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      {/* <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <PackageCheck size={26} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Order-to-Delivery Master Settings
            </h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              Manage parties, order booking receivers, logistics transporters, and order terms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase font-black tracking-widest text-green-600 bg-green-50 dark:bg-green-950/40 px-3 py-1.5 rounded-xl border border-green-200/50 dark:border-green-900/50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Supabase Synced
          </div>
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-gray-200 dark:border-slate-700 shadow-xs"
            title="Refresh from Database"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div> */}

      {/* Sub-Tabs Pill Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: "parties", label: "Party Details", icon: Building, count: parties.length },
          { id: "receivers", label: "Order Received By", icon: UserCheck, count: persons.length },
          { id: "payment_terms", label: "Payment Terms", icon: Wallet, count: paymentTerms.length }
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id);
                setSearchTerm("");
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800"
              }`}
            >
              <TabIcon size={15} />
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
          <input
            type="text"
            placeholder={`Search ${subTab.replace("_", " ")}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:outline-blue-600 dark:focus:outline-blue-500 text-gray-900 dark:text-white shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>
              {subTab === "parties" && "Add Party"}
              {subTab === "receivers" && "Add Receiver"}
              {subTab === "payment_terms" && "Add Payment Term"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {/* =================================================== */}
          {/* 1. PARTY DETAILS TABLE */}
          {/* =================================================== */}
          {subTab === "parties" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 text-gray-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-wider select-none">
                  <th className="px-5 py-4">Actions</th>
                  <th className="px-5 py-4">VN-No</th>
                  <th className="px-5 py-4">Party Name</th>
                  <th className="px-5 py-4">GST Number</th>
                  <th className="px-5 py-4">Contact No.</th>
                  <th className="px-5 py-4">Responsible Person</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Delivery Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-slate-300">
                {pageItems.length > 0 ? (
                  pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Party"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => promptDeleteParty(p)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Party"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-900 dark:text-white">
                        {p.sn || p.partyCode || p.party_code || `VN-${String(p.id).padStart(3, "0")}`}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px]">
                        {p.gstin || p.gstNumber || p.gst_number || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.phone || "—"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-blue-600 dark:text-blue-400">
                        {p.responsiblePerson || p.responsible_person || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">
                        {p.email || "—"}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate text-gray-500 dark:text-slate-400" title={p.address}>
                        {p.address || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-gray-400 dark:text-slate-500 font-bold">
                      No parties found. Click &quot;Add Party&quot; to register a customer/party in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* =================================================== */}
          {/* 2. ORDER RECEIVED BY TABLE */}
          {/* =================================================== */}
          {subTab === "receivers" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 text-gray-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-wider select-none">
                  <th className="px-5 py-4">Actions</th>
                  <th className="px-5 py-4">Receiver Code</th>
                  <th className="px-5 py-4">Receiver Name</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Phone No.</th>
                  <th className="px-5 py-4">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-slate-300">
                {pageItems.length > 0 ? (
                  pageItems.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Receiver"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => promptDeletePerson(r)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Receiver"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-900 dark:text-white">
                        {r.prNo || r.person_code || `OR-${String(r.id).padStart(3, "0")}`}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                        {r.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-md font-semibold text-gray-700 dark:text-slate-300">
                          {r.department || "Sales / Order"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {r.phone || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 dark:text-slate-500 font-mono text-[11px]">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400 dark:text-slate-500 font-bold">
                      No receivers found. Click &quot;Add Receiver&quot; to add an order receiver in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* =================================================== */}
          {/* 5. PAYMENT TERMS TABLE */}
          {/* =================================================== */}
          {subTab === "payment_terms" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 text-gray-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-wider select-none">
                  <th className="px-5 py-4 w-24">Actions</th>
                  <th className="px-5 py-4 w-16">#</th>
                  <th className="px-5 py-4">Payment Term Preset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-slate-300">
                {pageItems.length > 0 ? (
                  pageItems.map((term, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(term)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Payment Term"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => promptDeletePaymentTerm(term)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Payment Term"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-400 w-16">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                        {typeof term === "string" ? term : term.name}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-gray-400 dark:text-slate-500 font-bold">
                      No payment terms registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {currentTotal > pageSize && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-slate-800 text-xs font-semibold text-gray-500">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, currentTotal)} of {currentTotal} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-bold text-gray-900 dark:text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ADD / EDIT MODAL */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {editingItem ? "Edit" : "Add"}{" "}
                  {subTab === "parties" && "Party Details"}
                  {subTab === "receivers" && "Order Received By"}
                  {subTab === "payment_terms" && "Payment Term"}
                </h3>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                  Data will be saved directly into the live database.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* PARTY FORM */}
              {subTab === "parties" && (
                <form id="party-form" onSubmit={handleSubmitParty} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Party / Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Polymers Ltd."
                      value={partyForm.name}
                      onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                        Party Code (VN-No)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VN-001"
                        value={partyForm.party_code}
                        onChange={(e) => setPartyForm({ ...partyForm, party_code: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        placeholder="27AABCU9603R1ZM"
                        value={partyForm.gst_number}
                        onChange={(e) => setPartyForm({ ...partyForm, gst_number: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={partyForm.phone}
                        onChange={(e) => setPartyForm({ ...partyForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="info@acme.com"
                        value={partyForm.email}
                        onChange={(e) => setPartyForm({ ...partyForm, email: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Responsible Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Shah"
                      value={partyForm.responsible_person}
                      onChange={(e) => setPartyForm({ ...partyForm, responsible_person: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Factory / site address"
                      value={partyForm.address}
                      onChange={(e) => setPartyForm({ ...partyForm, address: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                    />
                  </div>
                </form>
              )}

              {/* RECEIVER FORM - Only Receiver Name field, auto-populating from users table */}
              {subTab === "receivers" && (
                <form id="receiver-form" onSubmit={handleSubmitReceiver} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                      Receiver Name <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={personForm.name}
                      onChange={(e) => handleSelectReceiverUser(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-blue-600 cursor-pointer shadow-xs"
                    >
                      <option value="">-- Select User from Users Master --</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.user_name}>
                          {u.user_name} {u.department ? `(${u.department})` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-gray-500 dark:text-slate-400">
                      Select a user from the enterprise master. Contact number and department are automatically linked.
                    </p>
                  </div>

                  {/* Auto-Filled Details Card */}
                  {personForm.name ? (
                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          Auto-Filled from Users Table
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md">
                          {personForm.person_code || "OR-001"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Phone Number</div>
                          <div className="font-semibold text-gray-900 dark:text-white mt-0.5">
                            {personForm.phone || "—"}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Department</div>
                          <div className="font-semibold text-gray-900 dark:text-white mt-0.5">
                            {personForm.department || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-center text-xs text-gray-400">
                      Choose a user above to automatically populate contact and department.
                    </div>
                  )}
                </form>
              )}

              {/* PAYMENT TERM FORM */}
              {subTab === "payment_terms" && (
                <form id="payment-term-form" onSubmit={handleSubmitPaymentTerm} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                      Payment Term Preset <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 45 Days Credit"
                      value={paymentTermForm.term}
                      onChange={(e) => setPaymentTermForm({ ...paymentTermForm, term: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-blue-600"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={
                  subTab === "parties"
                    ? "party-form"
                    : subTab === "receivers"
                    ? "receiver-form"
                    : "payment-term-form"
                }
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                <Save size={14} />
                <span>Save to Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/50">
              <Trash2 size={22} />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 dark:text-white">
                {deleteConfirm.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
                {deleteConfirm.message}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirm.onConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-rose-600/20 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
