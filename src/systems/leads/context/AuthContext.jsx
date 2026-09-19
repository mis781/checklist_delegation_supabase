import React, { createContext, useContext, useMemo, useEffect } from "react";
import { useMagicToast } from "../../../context/MagicToastContext";
import { syncInventoryUOMs, syncDivisions, syncCompanyAddresses } from "../utils/storageManager";

export const AuthContext = createContext({
  currentUser: { username: "Admin", userType: "admin" },
  userType: "admin",
  isAdmin: () => true,
  showNotification: () => {},
});

export function LeadsAuthProvider({ children }) {
  const { showToast } = useMagicToast();

  useEffect(() => {
    syncInventoryUOMs();
    syncDivisions();
    syncCompanyAddresses();
  }, []);

  const username = localStorage.getItem("user-name") || "Admin";
  const role = (localStorage.getItem("role") || "admin").toLowerCase();
  const isAdmin = () => role === "admin" || role === "administrator" || role === "superadmin";

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
    showNotification,
  }), [username, role, showToast]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
