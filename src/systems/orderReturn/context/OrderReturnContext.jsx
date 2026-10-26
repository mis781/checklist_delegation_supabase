import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
  fetchOrderReturns,
  persistOrderReturn,
  applySubmit,
  applyApproval,
  applyDebit,
  applyTransport,
  applyReceipt,
  applyPosting,
  applyCloseReceipt,
  applyCredit,
  applyHold,
  applyResume,
  applyCancel,
  setLocalCache
} from "../services/orderReturnApi";
import {
  generateDemoSeedData,
  createNewReturnDraft,
  newReturnNo,
  STAGES,
  ROLES
} from "../constants/orderReturnData";

const OrderReturnContext = createContext(null);

export function OrderReturnProvider({ children }) {
  const [returns, setReturns] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authenticated user detection from localStorage or default administrator
  const storedUser = localStorage.getItem("username") || "admin1";
  const storedRole = localStorage.getItem("role") || "Super Admin";

  const [activeRole, setActiveRole] = useState(
    storedRole === "admin" || storedRole === "administrator" ? "Super Admin" : "Management / Admin"
  );
  const [currentUser, setCurrentUser] = useState({
    name: storedUser === "admin1" ? "Rakesh Sharma" : storedUser,
    role: activeRole,
    username: storedUser
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState({
    from: "",
    to: "",
    customer: "",
    status: "",
    stage: ""
  });

  // Load returns on mount
  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrderReturns();
      setReturns(data.returns || []);
      setMovements(data.movements || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load order returns:", err);
      setError("Failed to load order returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  // Keep currentUser in sync with activeRole
  useEffect(() => {
    const roleUserMap = {
      "Requester": "Anita Verma",
      "Approver": "Suresh Patel",
      "Accounts": "Neha Gupta",
      "Logistics": "Vikas Yadav",
      "Store / QC": "Imran Khan",
      "Management / Admin": "Priya Nair",
      "Super Admin": "Rakesh Sharma"
    };
    setCurrentUser((prev) => ({
      ...prev,
      role: activeRole,
      name: roleUserMap[activeRole] || prev.name
    }));
  }, [activeRole]);

  const who = useCallback(() => ({
    by: currentUser.name || "System Admin",
    role: currentUser.role || activeRole
  }), [currentUser, activeRole]);

  // Helper commit handler
  const commit = useCallback(async (res, okMsg) => {
    if (!res.ok) {
      const firstErr = res.errors?.[0] || "An error occurred";
      toast.error(firstErr);
      return false;
    }

    try {
      await persistOrderReturn(res.r, res.moves || []);
      setReturns((prev) => {
        const idx = prev.findIndex((x) => x.id === res.r.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = res.r;
          return next;
        }
        return [res.r, ...prev];
      });

      if (res.moves && res.moves.length > 0) {
        setMovements((prev) => [...res.moves, ...prev]);
      }

      toast.success(okMsg || "Action completed successfully");
      return true;
    } catch (err) {
      console.error("Commit failed:", err);
      toast.error("Failed to save changes: " + (err.message || err));
      return false;
    }
  }, []);

  // Action methods
  const submitNewReturn = useCallback(async (draft) => {
    const res = applySubmit(draft, returns, who());
    return await commit(res, `Return ${res.r?.no || ""} submitted for approval`);
  }, [returns, who, commit]);

  const saveDraft = useCallback(async (draft) => {
    const d = { ...draft, status: "Draft", stage: 1 };
    if (!d.no) {
      d.no = newReturnNo(returns, d.date);
      d.return_no = d.no;
    }
    return await commit({ ok: true, r: d }, `Draft ${d.no} saved`);
  }, [returns, commit]);

  const approveReturn = useCallback(async (returnId, { decision, qtys, reason, remarks }) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyApproval(r, { decision, qtys, reason, remarks }, who());
    return await commit(res, `Return decision recorded: ${decision}`);
  }, [returns, who, commit]);

  const saveDebitNote = useCallback(async (returnId, debitData) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyDebit(r, debitData, who());
    return await commit(res, res.moved ? "Debit note saved. Moved to vehicle arrangement." : "Debit note saved");
  }, [returns, who, commit]);

  const saveTransport = useCallback(async (returnId, transportData) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyTransport(r, transportData, who());
    return await commit(res, res.moved ? "Transport dispatched. Moved to receipt & QC." : "Transport details saved");
  }, [returns, who, commit]);

  const saveReceipt = useCallback(async (returnId, receiptData) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyReceipt(r, receiptData, returns, who());
    return await commit(res, `Receipt ${res.grn || ""} recorded successfully`);
  }, [returns, who, commit]);

  const postStock = useCallback(async (returnId, grn) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyPosting(r, grn, movements, who());
    return await commit(res, res.moves?.length ? "Stock posted to inventory successfully" : "Receipt marked Not Applicable");
  }, [returns, movements, who, commit]);

  const closeReceiptStage = useCallback(async (returnId, reason) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyCloseReceipt(r, reason, who());
    return await commit(res, "Receipt & QC closed. Moved to credit note issuance.");
  }, [returns, who, commit]);

  const saveCreditNote = useCallback(async (returnId, creditData) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyCredit(r, creditData, who());
    return await commit(res, res.moved ? "Credit note issued. Return completed!" : "Credit note updated");
  }, [returns, who, commit]);

  const holdReturn = useCallback(async (returnId, reason) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyHold(r, reason, who());
    return await commit(res, "Return placed on hold");
  }, [returns, who, commit]);

  const resumeReturn = useCallback(async (returnId) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyResume(r, who());
    return await commit(res, "Return resumed from hold");
  }, [returns, who, commit]);

  const cancelReturn = useCallback(async (returnId, reason) => {
    const r = returns.find((x) => x.id === returnId);
    if (!r) return false;
    const res = applyCancel(r, reason, movements, who());
    return await commit(res, "Return cancelled");
  }, [returns, movements, who, commit]);

  const resetDemoData = useCallback(() => {
    try {
      localStorage.removeItem("botivate.orderReturn.v2");
    } catch (e) {}
    const seeded = generateDemoSeedData();
    setReturns(seeded.returns);
    setMovements(seeded.movements);
    setLocalCache(seeded.returns, seeded.movements);
    toast.success("Demo data reset to initial showcase records");
  }, []);

  // Visible returns depending on role
  const visibleReturns = useMemo(() => {
    if (activeRole === "Requester") {
      return returns.filter(
        (r) =>
          r.createdBy === currentUser.name ||
          r.createdBy === "Anita Verma" ||
          r.status === "Draft"
      );
    }
    return returns;
  }, [returns, activeRole, currentUser.name]);

  // Stage waiting badges
  const stageBadges = useMemo(() => {
    const open = (r) => !["Rejected", "Cancelled", "Completed"].includes(r.status);
    return {
      1: visibleReturns.filter((r) => r.status === "Draft").length,
      2: visibleReturns.filter((r) => r.stage === 2 && open(r)).length,
      3: visibleReturns.filter((r) => r.stage === 3 && open(r)).length,
      4: visibleReturns.filter((r) => r.stage === 4 && open(r)).length,
      5: visibleReturns.filter((r) => r.stage === 5 && open(r)).length,
      6: visibleReturns.filter((r) => r.stage === 6 && open(r)).length,
      total: visibleReturns.filter((r) => open(r) && r.status !== "Draft").length
    };
  }, [visibleReturns]);

  const canStage = useCallback(
    (st) => {
      const rDef = ROLES[activeRole] || { stages: [1, 2, 3, 4, 5, 6] };
      return rDef.stages ? rDef.stages.includes(st) : true;
    },
    [activeRole]
  );

  return (
    <OrderReturnContext.Provider
      value={{
        returns,
        visibleReturns,
        movements,
        loading,
        error,
        currentUser,
        activeRole,
        setActiveRole,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        stageBadges,
        canStage,
        refreshReturns: loadReturns,
        submitNewReturn,
        saveDraft,
        approveReturn,
        saveDebitNote,
        saveTransport,
        saveReceipt,
        postStock,
        closeReceiptStage,
        saveCreditNote,
        holdReturn,
        resumeReturn,
        cancelReturn,
        resetDemoData
      }}
    >
      {children}
    </OrderReturnContext.Provider>
  );
}

export function useOrderReturn() {
  const context = useContext(OrderReturnContext);
  if (!context) {
    throw new Error("useOrderReturn must be used within an OrderReturnProvider");
  }
  return context;
}
