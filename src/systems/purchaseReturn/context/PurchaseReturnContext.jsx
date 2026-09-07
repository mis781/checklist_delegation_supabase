import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  M1_PENDING,
  MC_PENDING,
  M2_PENDING,
  M3_PENDING,
  M4_PENDING,
  COMPANIES,
  DIVISIONS
} from "../data/dummyPurchaseReturns";
import {
  fetchPurchaseReturns,
  createPurchaseReturn as apiCreatePurchaseReturn,
  approveReturn as apiApproveReturn,
  topUpApproveReturn as apiTopUpApproveReturn,
  rejectReturn as apiRejectReturn,
  submitCreditNote as apiSubmitCreditNote,
  arrangeLogistics as apiArrangeLogistics,
  issueDebitNote as apiIssueDebitNote,
  confirmPlantDispatch as apiConfirmPlantDispatch,
  fetchMasterAddresses,
  extractCompanyFromAddress,
  extractDivisionFromAddress
} from "../services/purchaseReturnApi";
import { useMagicToast } from "../../../context/MagicToastContext";

const PurchaseReturnContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function usePurchaseReturn() {
  const ctx = useContext(PurchaseReturnContext);
  if (!ctx) {
    throw new Error("usePurchaseReturn must be used within a PurchaseReturnProvider");
  }
  return ctx;
}

export function PurchaseReturnProvider({ children }) {
  const { showToast } = useMagicToast();

  // Master live database records
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    dashboard: { company: "", division: "", bill: "" },
    approval: { company: "", division: "", bill: "" },
    credit: { company: "", division: "", bill: "" },
    logistics: { company: "", division: "", bill: "" },
    debitNote: { company: "", division: "", bill: "" },
    plantReturn: { company: "", division: "", bill: "" }
  });

  // Stage active sub-tabs ('pending' | 'history')
  const [activeTabs, setActiveTabs] = useState({
    approval: "pending",
    credit: "pending",
    logistics: "pending",
    debitNote: "pending",
    plantReturn: "pending"
  });

  // Dashboard card filter ('total' | 'Pending Approval' | 'Completed' | etc.)
  const [dashboardCardFilter, setDashboardCardFilter] = useState(null);

  // Column visibility map per table key
  const [colVis, setColVis] = useState({});

  // Multi-row selection grouped strictly by billNumber
  const [selection, setSelection] = useState({
    moduleKey: null,
    billNumber: null,
    ids: []
  });

  // Current session user from central localStorage
  const storedName = localStorage.getItem("user-name") || "Admin";
  const storedRole = localStorage.getItem("role") || "Administrator";

  const currentUser = useMemo(() => ({
    id: storedName.toLowerCase().replace(/\s+/g, "_"),
    name: storedName,
    role: storedRole
  }), [storedName, storedRole]);

  // Role & Page Access Verification
  const canView = useCallback((viewKey) => {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if (
      role === "admin" ||
      role === "superadmin" ||
      role === "administrator" ||
      role === "super admin"
    ) {
      return true;
    }

    const rawAccess = localStorage.getItem("page_access") || "";
    if (rawAccess === "all") return true;

    const pageAccess = rawAccess.split(",").map((p) => p.trim()).filter(Boolean);
    if (pageAccess.includes("all")) return true;

    const keyMap = {
      dashboard: "purchase_return_dashboard",
      approval: "purchase_return_approval",
      credit: "purchase_return_credit",
      "credit-note": "purchase_return_credit",
      logistics: "purchase_return_logistics",
      debitNote: "purchase_return_debit_note",
      "debit-note": "purchase_return_debit_note",
      plantReturn: "purchase_return_plant_return",
      "plant-return": "purchase_return_plant_return",
      settings: "settings_users"
    };

    const requiredId = keyMap[viewKey] || `purchase_return_${viewKey}`;
    return pageAccess.includes(requiredId);
  }, []);

  const canEdit = useCallback(
    (viewKey) => canView(viewKey),
    [canView]
  );

  // Fetch live records from Supabase
  const refreshReturns = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await fetchPurchaseReturns();
      setRecords(data || []);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("purchase-return-updated"));
      }
    } catch (err) {
      console.error("Failed to load purchase returns:", err);
      setError(err.message || "Failed to load purchase returns");
      showToast("Failed to fetch purchase returns from database", "error");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshReturns(true);
  }, [refreshReturns]);

  // Master Addresses from Global Settings (master_addresses table)
  const [masterAddresses, setMasterAddresses] = useState([]);

  const refreshMasterAddresses = useCallback(async () => {
    try {
      const data = await fetchMasterAddresses();
      setMasterAddresses(data || []);
    } catch (err) {
      console.warn("Could not load master addresses:", err);
    }
  }, []);

  useEffect(() => {
    refreshMasterAddresses();
  }, [refreshMasterAddresses]);

  // Dynamic Company Options extracted from master_addresses name column:
  // e.g. "Nutech Composites - Nutech Division A - Bhilai Unit" -> "Nutech Composites"
  const companyOptions = useMemo(() => {
    const extracted = (masterAddresses || [])
      .map((a) => extractCompanyFromAddress(a))
      .filter(Boolean);
    const unique = Array.from(new Set(extracted));
    return unique.length > 0 ? unique : COMPANIES;
  }, [masterAddresses]);

  // Dynamic Division / Location Options extracted from master_addresses:
  // e.g. "Nutech Composites - Nutech Division A - Bhilai Unit" -> "Nutech Division A - Bhilai Unit"
  const divisionOptions = useMemo(() => {
    const extracted = (masterAddresses || [])
      .map((a) => extractDivisionFromAddress(a))
      .filter(Boolean);
    const unique = Array.from(new Set(extracted));
    return unique.length > 0 ? unique : DIVISIONS;
  }, [masterAddresses]);

  // Combined Company with Division Options for all-in-one Company dropdown
  const combinedCompanyOptions = useMemo(() => {
    const list = [];
    (masterAddresses || []).forEach((a) => {
      if (a.name) {
        list.push(a.name);
      }
    });

    // Fallback if master_addresses is empty: pair standard companies with divisions
    if (list.length === 0) {
      COMPANIES.forEach((comp) => {
        DIVISIONS.forEach((div) => {
          list.push(`${comp} - ${div}`);
        });
      });
    }

    const unique = Array.from(new Set(list));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [masterAddresses]);

  // Helper to get divisions belonging to a specific company
  const getDivisionsForCompany = useCallback(
    (compName) => {
      if (!compName) return divisionOptions;
      const clean = (s) => String(s || "").toLowerCase().trim();
      const target = clean(compName);
      const filtered = (masterAddresses || [])
        .filter((a) => clean(extractCompanyFromAddress(a)) === target)
        .map((a) => extractDivisionFromAddress(a))
        .filter(Boolean);
      const unique = Array.from(new Set(filtered));
      return unique.length > 0 ? unique : divisionOptions;
    },
    [masterAddresses, divisionOptions]
  );

  // Helper to get companies belonging to a specific division
  const getCompaniesForDivision = useCallback(
    (divName) => {
      if (!divName) return companyOptions;
      const clean = (s) => String(s || "").toLowerCase().trim();
      const target = clean(divName);
      const filtered = (masterAddresses || [])
        .filter((a) => clean(extractDivisionFromAddress(a)) === target)
        .map((a) => extractCompanyFromAddress(a))
        .filter(Boolean);
      const unique = Array.from(new Set(filtered));
      return unique.length > 0 ? unique : companyOptions;
    },
    [masterAddresses, companyOptions]
  );

  // Column Visibility Handlers
  const getColVis = useCallback(
    (tableKey, cols) => {
      const stored = colVis[tableKey] || {};
      const res = {};
      cols.forEach((c) => {
        res[c.key] = stored[c.key] !== undefined ? stored[c.key] : (c.def !== false);
      });
      return res;
    },
    [colVis]
  );

  const setColVisKey = useCallback((tableKey, colKey, isVisible) => {
    setColVis((prev) => ({
      ...prev,
      [tableKey]: {
        ...(prev[tableKey] || {}),
        [colKey]: isVisible
      }
    }));
  }, []);

  // Filter handlers
  const updateFilter = useCallback((viewKey, key, value) => {
    setFilters((prev) => ({
      ...prev,
      [viewKey]: {
        ...prev[viewKey],
        [key]: value
      }
    }));
  }, []);

  const clearFilters = useCallback((viewKey) => {
    setFilters((prev) => ({
      ...prev,
      [viewKey]: { company: "", division: "", bill: "" }
    }));
  }, []);

  const applyFilters = useCallback(
    (list, viewKey) => {
      const f = filters[viewKey] || { company: "", division: "", bill: "" };
      return list.filter((r) => {
        if (f.company && r.company !== f.company) return false;
        if (f.division && r.division !== f.division) return false;
        if (f.bill) {
          const rBill = String(r.billNumber || r.bill_number || "").toLowerCase().trim();
          const fBill = String(f.bill).toLowerCase().trim();
          if (rBill !== fBill && !rBill.includes(fBill)) return false;
        }
        return true;
      });
    },
    [filters]
  );

  // Active sub-tab setter
  const setTab = useCallback((viewKey, tab) => {
    setActiveTabs((prev) => ({ ...prev, [viewKey]: tab }));
    setSelection({ moduleKey: null, billNumber: null, ids: [] });
  }, []);

  // Row selection handler grouped strictly by bill number
  const toggleRowSelect = useCallback(
    (moduleKey, recordId, billNumber) => {
      setSelection((prev) => {
        const currentIds = prev.moduleKey === moduleKey ? [...prev.ids] : [];
        const isSelected = currentIds.includes(recordId);

        if (isSelected) {
          const nextIds = currentIds.filter((id) => id !== recordId);
          return {
            moduleKey: nextIds.length > 0 ? moduleKey : null,
            billNumber: nextIds.length > 0 ? prev.billNumber : null,
            ids: nextIds
          };
        } else {
          if (prev.moduleKey === moduleKey && prev.ids.length > 0 && prev.billNumber !== billNumber) {
            showToast("Please select rows with the same Bill Number to group them", "warning");
            return prev;
          }
          return {
            moduleKey,
            billNumber,
            ids: [...currentIds, recordId]
          };
        }
      });
    },
    [showToast]
  );

  const clearSelection = useCallback(() => {
    setSelection({ moduleKey: null, billNumber: null, ids: [] });
  }, []);

  // Bulk toggle for an entire Bill Number group
  const toggleBillGroupSelect = useCallback(
    (moduleKey, billNumber, groupRecordIds) => {
      setSelection((prev) => {
        const isCurrentGroup = prev.moduleKey === moduleKey && prev.billNumber === billNumber;
        const allSelected =
          isCurrentGroup &&
          groupRecordIds.length > 0 &&
          groupRecordIds.every((id) => prev.ids.includes(id));

        if (allSelected) {
          return { moduleKey: null, billNumber: null, ids: [] };
        } else {
          return {
            moduleKey,
            billNumber,
            ids: groupRecordIds
          };
        }
      });
    },
    []
  );

  // =========================================================================
  // WORKFLOW ACTION HANDLERS (Connected to live Supabase API)
  // =========================================================================

  // Create Return
  const createReturn = useCallback(
    async (payload) => {
      try {
        const created = await apiCreatePurchaseReturn({
          ...payload,
          createdBy: currentUser.name
        });
        await refreshReturns(false);
        showToast(
          `Purchase Return ${created?.return_number || ""} created successfully`,
          "success"
        );
        return created;
      } catch (err) {
        console.error("createReturn error:", err);
        showToast(err.message || "Failed to create return request", "error");
        throw err;
      }
    },
    [currentUser.name, refreshReturns, showToast]
  );

  // Stage 1: Approve Return (Initial or Multi-record)
  const approveReturn = useCallback(
    async ({ ids, actionType, transportPaidBy, remarks, itemEdits = {} }) => {
      try {
        await apiApproveReturn({
          ids,
          actionType,
          transportPaidBy,
          remarks,
          itemEdits,
          userName: currentUser.name
        });
        clearSelection();
        await refreshReturns(false);
        showToast(
          ids.length > 1
            ? `${ids.length} returns approved successfully`
            : `Return approved successfully`,
          "success"
        );
      } catch (err) {
        console.error("approveReturn error:", err);
        showToast(err.message || "Failed to approve return", "error");
      }
    },
    [currentUser.name, clearSelection, refreshReturns, showToast]
  );

  // Stage 1b: Top-Up Partial Approval
  const topUpApproveReturn = useCallback(
    async ({ ids, topUpMap, remarks }) => {
      try {
        await apiTopUpApproveReturn({
          ids,
          topUpMap,
          remarks,
          userName: currentUser.name
        });
        clearSelection();
        await refreshReturns(false);
        showToast("Additional quantity approved", "success");
      } catch (err) {
        console.error("topUpApproveReturn error:", err);
        showToast(err.message || "Failed to top-up approval", "error");
      }
    },
    [currentUser.name, clearSelection, refreshReturns, showToast]
  );

  // Stage 1c: Reject Return
  const rejectReturn = useCallback(
    async ({ id, reason, remarks }) => {
      try {
        await apiRejectReturn({
          id,
          reason,
          remarks,
          userName: currentUser.name
        });
        clearSelection();
        await refreshReturns(false);
        showToast(`Return rejected`, "warning");
      } catch (err) {
        console.error("rejectReturn error:", err);
        showToast(err.message || "Failed to reject return", "error");
      }
    },
    [currentUser.name, clearSelection, refreshReturns, showToast]
  );

  // Stage 2: Submit Credit Note Request
  const submitCreditNote = useCallback(
    async ({ ids, attachmentName, attachmentUrl, attachmentFile, remarks, excludedCodesMap = {} }) => {
      try {
        await apiSubmitCreditNote({
          ids,
          attachmentName,
          attachmentUrl,
          attachmentFile,
          remarks,
          excludedCodesMap,
          userName: currentUser.name
        });
        clearSelection();
        await refreshReturns(false);
        showToast(
          ids.length > 1
            ? `${ids.length} returns: Credit note requested, moved to next stage`
            : `Credit note requested successfully`,
          "success"
        );
      } catch (err) {
        console.error("submitCreditNote error:", err);
        showToast(err.message || "Failed to submit credit note", "error");
        throw err;
      }
    },
    [currentUser.name, clearSelection, refreshReturns, showToast]
  );

  // Stage 3: Arrange Logistics
  const arrangeLogistics = useCallback(
    async ({ ids, data, excludedCodesMap = {} }) => {
      try {
        await apiArrangeLogistics({
          ids,
          data,
          excludedCodesMap,
          userName: currentUser.name
        });
        clearSelection();
        await refreshReturns(false);
        showToast(
          ids.length > 1
            ? `${ids.length} returns: Logistics arranged`
            : `Logistics arranged successfully`,
          "success"
        );
      } catch (err) {
        console.error("arrangeLogistics error:", err);
        showToast(err.message || "Failed to arrange logistics", "error");
      }
    },
    [currentUser.name, clearSelection, refreshReturns, showToast]
  );

  // Stage 4: Issue Debit Note
  const issueDebitNote = useCallback(
    async ({ ids, data, excludedCodesMap = {} }) => {
      try {
        await apiIssueDebitNote({
          ids,
          data,
          excludedCodesMap,
          userName: currentUser.name
        });
        clearSelection();
        await refreshReturns(false);
        showToast("Debit note issued and supplier informed", "success");
      } catch (err) {
        console.error("issueDebitNote error:", err);
        showToast(err.message || "Failed to issue debit note", "error");
      }
    },
    [currentUser.name, clearSelection, refreshReturns, showToast]
  );

  // Stage 5: Confirm Plant Dispatch
  const confirmPlantDispatch = useCallback(
    async ({ ids, data, excludedCodesMap = {} }) => {
      try {
        await apiConfirmPlantDispatch({
          ids,
          data,
          excludedCodesMap,
          userName: currentUser.name
        });
        clearSelection();
        await refreshReturns(false);
        showToast(
          ids.length > 1
            ? `${ids.length} returns: Material dispatched from plant. Marked Completed.`
            : `Return marked Completed`,
          "success"
        );
      } catch (err) {
        console.error("confirmPlantDispatch error:", err);
        showToast(err.message || "Failed to confirm dispatch", "error");
      }
    },
    [currentUser.name, clearSelection, refreshReturns, showToast]
  );

  // Numeric pending badges for each stage
  const pendingCounts = useMemo(() => {
    return {
      approval: records.filter(M1_PENDING).length,
      credit: records.filter(MC_PENDING).length,
      logistics: records.filter(M2_PENDING).length,
      debitNote: records.filter(M3_PENDING).length,
      plantReturn: records.filter(M4_PENDING).length
    };
  }, [records]);

  const value = {
    records,
    loading,
    error,
    refreshReturns,
    createReturn,
    searchQuery,
    setSearchQuery,
    filters,
    updateFilter,
    clearFilters,
    applyFilters,
    activeTabs,
    setTab,
    dashboardCardFilter,
    setDashboardCardFilter,
    colVis,
    getColVis,
    setColVisKey,
    selection,
    toggleRowSelect,
    toggleBillGroupSelect,
    clearSelection,
    currentUser,
    usersAdmin: [currentUser],
    currentUserId: currentUser.id,
    switchUser: () => {},
    canView,
    canEdit,
    pendingCounts,
    // Master company & division address options
    masterAddresses,
    companyOptions,
    divisionOptions,
    combinedCompanyOptions,
    getDivisionsForCompany,
    getCompaniesForDivision,
    refreshMasterAddresses,
    // Transitions
    approveReturn,
    topUpApproveReturn,
    rejectReturn,
    submitCreditNote,
    arrangeLogistics,
    issueDebitNote,
    confirmPlantDispatch
  };

  return (
    <PurchaseReturnContext.Provider value={value}>
      {children}
    </PurchaseReturnContext.Provider>
  );
}

/**
 * Helper to group return records by their Bill Number
 */
// eslint-disable-next-line react-refresh/only-export-components
export function groupRecordsByBill(records = []) {
  const groups = [];
  const map = new Map();

  records.forEach((r) => {
    const rawBill = r.billNumber || r.bill_number;
    const billKey = rawBill ? String(rawBill).trim() : "Unbilled";
    if (!map.has(billKey)) {
      const g = {
        billKey,
        billNumber: rawBill ? String(rawBill).trim() : "Unbilled / No Bill No.",
        company: r.company,
        division: r.division,
        supplier: r.supplier,
        billDate: r.billDate,
        billImage: r.billImage,
        billImagePreview: r.billImagePreview,
        records: []
      };
      map.set(billKey, g);
      groups.push(g);
    }
    map.get(billKey).records.push(r);
  });

  return groups;
}

