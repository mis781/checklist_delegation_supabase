import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from "react";
import { useMagicToast } from "../../../context/MagicToastContext";
import { syncInventoryUOMs, syncDivisions, syncCompanyAddresses, syncLeadsMasters, getLeadReceiverNames } from "../utils/storageManager";
import { fetchMasterSalespersons } from "../services/leadApi";

export const AuthContext = createContext({
  currentUser: { username: "Admin", userType: "admin" },
  userType: "admin",
  isAdmin: () => true,
  isSalesPerson: false,
  salesPersons: [],
  showNotification: () => {},
});

export function LeadsAuthProvider({ children }) {
  const { showToast } = useMagicToast();
  const [salesPersons, setSalesPersons] = useState(() => {
    try {
      const stored = getLeadReceiverNames();
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });

  const username = localStorage.getItem("user-name") || "Admin";
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isAdmin = useCallback(() => role === "admin" || role === "administrator" || role === "superadmin", [role]);

  const refreshSalesPersons = useCallback(async () => {
    try {
      const list = await fetchMasterSalespersons();
      if (Array.isArray(list) && list.length > 0) {
        setSalesPersons(list);
      }
    } catch (err) {
      console.warn("[AuthContext] fetchMasterSalespersons error:", err);
    }
  }, []);

  useEffect(() => {
    syncInventoryUOMs();
    syncDivisions();
    syncCompanyAddresses();
    syncLeadsMasters().then(() => {
      try {
        const stored = getLeadReceiverNames();
        if (Array.isArray(stored) && stored.length > 0) setSalesPersons(stored);
      } catch (e) {
        console.warn(e);
      }
    });
    refreshSalesPersons();

    const handleUpdate = () => {
      refreshSalesPersons();
    };
    window.addEventListener("leads-masters-updated", handleUpdate);
    window.addEventListener("leads-updated", handleUpdate);
    return () => {
      window.removeEventListener("leads-masters-updated", handleUpdate);
      window.removeEventListener("leads-updated", handleUpdate);
    };
  }, [refreshSalesPersons]);

  const isSalesPerson = useMemo(() => {
    const userLower = (username || "").trim().toLowerCase();
    const inSalesList = salesPersons.some(
      (sp) => (sp.name || "").trim().toLowerCase() === userLower
    );
    const isRegularUser = !isAdmin();
    return inSalesList || isRegularUser;
  }, [salesPersons, username, isAdmin]);

  const showNotification = (message, type = "info") => {
    if (showToast) {
      showToast(message, type === "error" ? "error" : type === "success" ? "success" : "info");
    } else {
      console.log(`[Notification ${type}]: ${message}`);
    }
  };

  const value = useMemo(() => ({
    currentUser: { username, userType: role },
    userType: role,
    isAdmin,
    isSalesPerson,
    salesPersons,
    showNotification,
  }), [username, role, isAdmin, isSalesPerson, salesPersons, showToast]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

