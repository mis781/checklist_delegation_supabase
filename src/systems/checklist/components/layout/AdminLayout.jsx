"use client";
import aceLogo from "../../../../assets/nutech.jpeg";

import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../../../../context/ThemeContext";
import { fetchNotifications } from "../../../../redux/slice/notificationSlice";
import { fetchInventoryData } from "../../../../redux/slice/inventorySlice";
import supabase from "../../../../SupabaseClient";
import { fetchPendingApprovals } from "../../../../redux/api/delegationApi";
import { fetchPendingMaintenanceApprovals } from "../../../../redux/api/maintenanceApi";
import { fetchPendingRepairApprovals } from "../../../../redux/api/repairApi";
import { fetchPendingEAApprovals } from "../../../../redux/api/eaApi";
import { fetchPendingChecklistApprovals } from "../../../../redux/api/quickTaskApi";
import {
  CheckSquare,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Database,
  ChevronDown,
  ChevronRight,
  Zap,
  Settings,
  CirclePlus,
  UserRound,
  CalendarCheck,
  Calendar as CalendarIcon,
  BookmarkCheck,
  CrossIcon,
  X,
  Bell,
  Video,
  Sun,
  Moon,
  LayoutDashboard,
  Boxes,
  History,
  AlertTriangle,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";

const ROUTE_TO_PAGE_ID = {
  "/dashboard/admin": "checklist_dashboard",
  "/dashboard/notifications": "checklist_notifications",
  "/dashboard/quick-task": "checklist_quick_task",
  "/dashboard/assign-task": "checklist_assign_task",
  "/dashboard/delegation": "checklist_delegation",
  "/dashboard/task": "checklist_task",
  "/dashboard/calendar": "checklist_calendar",
  "/dashboard/holiday-list": "checklist_holiday",
  "/dashboard/working-day-calendar": "checklist_working_day",
  "/dashboard/admin-approval": "checklist_approval",
  "/dashboard/training-video": "checklist_video",
  "/dashboard/setting": "checklist_settings",
  "/dashboard/inventory/dashboard": "inventory_dashboard",
  "/dashboard/inventory/stock": "inventory_stock",
  "/dashboard/inventory/master": "inventory_master",
  "/dashboard/inventory/transactions": "inventory_transactions",
  "/dashboard/inventory/reorder": "inventory_reorder",
  "/dashboard/inventory/indent": "inventory_indent",
  "/dashboard/inventory/audit": "inventory_audit",
  "/dashboard/inventory/settings": "inventory_settings",
  "/dashboard/whatsapp/inbox": "whatsapp_inbox",
};

const getPageIdForPath = (path) => {
  if (ROUTE_TO_PAGE_ID[path]) return ROUTE_TO_PAGE_ID[path];
  let bestMatch = "";
  let bestPageId = "";
  Object.keys(ROUTE_TO_PAGE_ID).forEach((route) => {
    if (path.startsWith(route) && route.length > bestMatch.length) {
      bestMatch = route;
      bestPageId = ROUTE_TO_PAGE_ID[route];
    }
  });
  return bestPageId;
};

export default function AdminLayout({
  children,
  darkMode,
  toggleDarkMode,
  showLayout = true,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: notifications } = useSelector((state) => state.notifications);
  const {
    materials = [],
    transactions = [],
    indents = [],
  } = useSelector((state) => state.inventory || {});

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChecklistDropdownOpen, setIsChecklistDropdownOpen] = useState(
    location.pathname.startsWith("/dashboard") &&
      !location.pathname.startsWith("/dashboard/inventory") &&
      location.pathname !== "/dashboard/global-settings" &&
      location.pathname !== "/dashboard/portal",
  );
  const [isHolidayDropdownOpen, setIsHolidayDropdownOpen] = useState(
    location.pathname === "/dashboard/holiday-list" ||
      location.pathname === "/dashboard/working-day-calendar",
  );
  const [isInventoryDropdownOpen, setIsInventoryDropdownOpen] = useState(
    location.pathname.startsWith("/dashboard/inventory"),
  );

  const { isDark, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [profileImage, setProfileImage] = useState("");

  const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem("user-name");
    const storedRole = localStorage.getItem("role");
    const storedEmail = localStorage.getItem("email_id");

    if (!storedUsername) {
      // Redirect to login if not authenticated
      navigate("/login");
      return;
    }

    setUsername(storedUsername);
    setUserRole(storedRole || "user");
    setUserEmail(storedEmail);
    setIsSuperAdmin(storedUsername.toLowerCase() === "admin");

    // Centralized Security Guard for User Role
    const path = location.pathname;
    const restrictedPages = [
      "/dashboard/assign-task",
      "/dashboard/admin-approval",
      "/dashboard/checklist",
      "/dashboard/maintenance",
      "/dashboard/repair",
      "/dashboard/ea-task",
      "/dashboard/quick-task",
      "/dashboard/holiday-list",
      "/dashboard/working-day-calendar",
      "/dashboard/setting",
    ];

    const storedRoleLower = (storedRole || "user").toLowerCase();
    const canSelfAssign = localStorage.getItem("can_self_assign") === "true";
    const storedPageAccess = localStorage.getItem("page_access") || "";
    const hasCustomPageAccess = storedPageAccess.trim() !== "";
    const allowedPages = hasCustomPageAccess
      ? storedPageAccess.split(",").map((p) => p.trim())
      : [];
    const isAdminUser =
      storedRoleLower === "admin" || storedUsername.toLowerCase() === "admin";

    // If the path corresponds to a known page ID, and custom page access is set, verify access
    const pathPageId = getPageIdForPath(path);

    if (pathPageId && hasCustomPageAccess) {
      const isMasterAdmin = storedUsername.toLowerCase() === "admin";
      if (!isMasterAdmin && !allowedPages.includes(pathPageId)) {
        navigate("/dashboard/admin");
        return;
      }
    } else {
      // Fallback to role-based guards:
      if (storedRoleLower === "user") {
        const allowedIfSelfAssign = [
          "/dashboard/assign-task",
          "/dashboard/checklist",
          "/dashboard/maintenance",
          "/dashboard/repair",
          "/dashboard/ea-task",
        ];
        const isRestricted = restrictedPages.some((p) => path.startsWith(p));
        const isExempt =
          canSelfAssign && allowedIfSelfAssign.some((p) => path.startsWith(p));

        if (isRestricted && !isExempt) {
          navigate("/dashboard/admin");
          return;
        }
      }

      if (storedRoleLower === "hod") {
        const designation = (
          localStorage.getItem("designation") || ""
        ).toLowerCase();
        const isMachineOperator =
          designation.includes("machin") ||
          designation.includes("operat") ||
          designation.includes("oprat");

        const hodRestrictedPages = [
          "/dashboard/maintenance",
          "/dashboard/ea-task",
          "/dashboard/quick-task",
          "/dashboard/holiday-list",
          "/dashboard/working-day-calendar",
          "/dashboard/setting",
        ];

        if (!isMachineOperator) {
          hodRestrictedPages.push("/dashboard/repair");
        }

        if (hodRestrictedPages.some((p) => path.startsWith(p))) {
          navigate("/dashboard/admin");
          return;
        }
      }
    }

    // Initial load from localStorage
    const cachedImage = localStorage.getItem("profile_image");
    setProfileImage(cachedImage || "");

    // Fetch reporting users for HOD role check
    let reportingUsers = [storedUsername?.toLowerCase()];
    const currentUserRole = (localStorage.getItem("role") || "").toLowerCase();
    if (currentUserRole === "hod") {
      const fetchReportingUsers = async () => {
        const { data: reports } = await supabase
          .from("users")
          .select("user_name")
          .eq("reported_by", storedUsername);
        if (reports) {
          reportingUsers = [
            storedUsername.toLowerCase(),
            ...reports.map((r) => (r.user_name || "").toLowerCase()),
          ];
        }
      };
      fetchReportingUsers();
    }

    // Check if this is the super admin (username = 'admin')
    const normalizedUsername = (storedUsername || "").toLowerCase();
    setIsSuperAdmin(normalizedUsername === "admin");
  }, [navigate, location.pathname]);

  // Sync user profile from DB once on mount (separate from route guard to prevent infinite re-render loop)
  useEffect(() => {
    const storedUsername = localStorage.getItem("user-name");
    if (!storedUsername) return;

    const syncUserProfile = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("profile_image, can_self_assign, department, page_access")
          .eq("user_name", storedUsername)
          .single();

        if (data) {
          if (data.profile_image) {
            setProfileImage(data.profile_image);
            localStorage.setItem("profile_image", data.profile_image);
          }
          localStorage.setItem(
            "can_self_assign",
            data.can_self_assign === true ? "true" : "false",
          );
          localStorage.setItem("department", data.department || "");
          localStorage.setItem("page_access", data.page_access || "");
        }
      } catch (err) {
        console.error("❌ Error syncing user profile:", err);
      }
    };

    syncUserProfile();
  }, []); // Run only once on mount

  // Fetch notifications globally for badge count
  useEffect(() => {
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("user-id");
    if (role) {
      dispatch(fetchNotifications({ role: role.toLowerCase(), userId }));
    }
  }, [dispatch, location.pathname]);

  // Fetch inventory data globally for reorder badge count
  useEffect(() => {
    dispatch(fetchInventoryData());
  }, [dispatch]);

  // Fetch pending approvals count for Checklist sidebar badge
  useEffect(() => {
    const role = localStorage.getItem("role") || "user";
    const username = localStorage.getItem("user-name");
    const roleLower = role.toLowerCase();

    if (roleLower !== "admin" && roleLower !== "hod" && username?.toLowerCase() !== "admin") {
      setPendingApprovalsCount(0);
      return;
    }

    const getPendingApprovalsCount = async () => {
      try {
        const [
          delegations,
          maintenances,
          repairs,
          eas,
          checklists
        ] = await Promise.all([
          fetchPendingApprovals(),
          fetchPendingMaintenanceApprovals(),
          fetchPendingRepairApprovals(),
          fetchPendingEAApprovals(),
          fetchPendingChecklistApprovals()
        ]);

        const allTasks = [
          ...delegations.map(t => ({ ...t, type: 'delegation' })),
          ...maintenances.map(t => ({ ...t, type: 'maintenance' })),
          ...repairs.map(t => ({ ...t, type: 'repair' })),
          ...eas.map(t => ({ ...t, type: 'ea' })),
          ...checklists.map(t => ({ ...t, type: 'checklist' }))
        ];

        // Deduplicate data by ID
        const seenIds = new Set();
        const uniqueData = allTasks.filter((task) => {
          const baseId = task.task_id || task.original_task_id || task.id;
          if (!baseId || seenIds.has(baseId)) return false;
          seenIds.add(baseId);
          return true;
        });

        const currentUsername = (username || "").toLowerCase();
        const currentUserRole = (role || "").toLowerCase();
        const isSystemAdmin = currentUsername === "admin" || currentUserRole === "admin";

        let filteredData = uniqueData;

        if (!isSystemAdmin) {
          // HOD/User cannot approve their own tasks
          filteredData = uniqueData.filter((task) => {
            const doerName = (
              task.doer_name ||
              task.name ||
              task.filled_by ||
              ""
            ).toLowerCase();
            return doerName !== currentUsername;
          });

          let reportingUsers = [];
          if (currentUserRole === "hod") {
            const { data: reports } = await supabase
              .from("users")
              .select("user_name")
              .eq("reported_by", username);
            if (reports && reports.length > 0) {
              reportingUsers = reports.map((r) =>
                (r.user_name || "").toLowerCase(),
              );
            }
          }

          filteredData = filteredData.filter((task) => {
            const doerName = (
              task.doer_name ||
              task.name ||
              task.filled_by ||
              ""
            ).toLowerCase();
            return reportingUsers.includes(doerName);
          });
        }

        setPendingApprovalsCount(filteredData.length);
      } catch (err) {
        console.error("Error fetching pending approvals for sidebar:", err);
      }
    };

    getPendingApprovalsCount();
  }, [location.pathname]);

  // Set submenu state based on current location, automatically collapsing other tabs
  useEffect(() => {
    const path = location.pathname;
    const isInventoryPath = path.startsWith("/dashboard/inventory");
    const isChecklistPath =
      path.startsWith("/dashboard") &&
      !isInventoryPath &&
      path !== "/dashboard/global-settings" &&
      path !== "/dashboard/portal";
    const isHolidayPath =
      path === "/dashboard/holiday-list" ||
      path === "/dashboard/working-day-calendar";

    setIsInventoryDropdownOpen(isInventoryPath);
    setIsChecklistDropdownOpen(isChecklistPath);
    setIsHolidayDropdownOpen(isHolidayPath);
  }, [location.pathname]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user-name");
    localStorage.removeItem("role");
    localStorage.removeItem("email_id");
    localStorage.removeItem("token");
    localStorage.removeItem("profile_image");
    window.location.href = "/login";
  };

  // Reorder warnings badge count for Inventory System
  const reorderBadgeCount = useMemo(() => {
    const simLoc = localStorage.getItem("sp_simulated_loc") || "";

    // 1. Calculate stock balances per SKU
    const matClosing = {};
    materials.forEach((m) => {
      matClosing[m.sku] = Number(m.opening) || 0;
    });

    transactions.forEach((t) => {
      if (matClosing[t.sku] !== undefined) {
        if (t.type === "IN") {
          matClosing[t.sku] += Number(t.qty) || 0;
        } else {
          matClosing[t.sku] -= Number(t.qty) || 0;
        }
      }
    });

    let count = 0;
    materials.forEach((m) => {
      const hasPendingIndent = indents.some(
        (i) =>
          i.sku === m.sku &&
          (i.status === "Pending" || i.status === "Approved"),
      );
      if (hasPendingIndent) return;

      const closingStock = matClosing[m.sku] || 0;
      const safetyStock = (Number(m.adc) || 0) * (Number(m.safetyFactor) || 0);
      const reorderLevel =
        (Number(m.adc) || 0) * (Number(m.leadTime) || 0) + safetyStock;

      if (m.status === "Active" && closingStock <= reorderLevel) {
        if (!simLoc || m.location === simLoc) {
          count++;
        }
      }
    });
    return count;
  }, [materials, transactions, indents, location.pathname]);

  const inventorySubItems = [
    // {
    //   isHeader: true,
    //   label: "Overview",
    // },
    {
      href: "/dashboard/inventory/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active:
        location.pathname === "/dashboard/inventory/dashboard" ||
        location.pathname === "/dashboard/inventory",
      showFor: ["admin", "user", "HOD", "hod"],
    },
    {
      href: "/dashboard/inventory/stock",
      label: "IMS",
      icon: Boxes,
      active: location.pathname === "/dashboard/inventory/stock",
      showFor: ["admin", "user", "HOD", "hod"],
    },
    // {
    //   isHeader: true,
    //   label: "Operations",
    // },
    // {
    //   href: "/dashboard/inventory/master",
    //   label: "Master Data",
    //   icon: Database,
    //   active: location.pathname === "/dashboard/inventory/master",
    //   showFor: ["admin", "user", "HOD", "hod"],
    // },
    {
      href: "/dashboard/inventory/transactions",
      label: "Stock Transactions",
      icon: History,
      active: location.pathname === "/dashboard/inventory/transactions",
      showFor: ["admin", "user", "HOD", "hod"],
    },
    {
      href: "/dashboard/inventory/reorder",
      label: "Reorder Management",
      icon: AlertTriangle,
      active: location.pathname === "/dashboard/inventory/reorder",
      showFor: ["admin", "user", "HOD", "hod"],
      badge: reorderBadgeCount > 0 ? reorderBadgeCount : null,
    },
    {
      href: "/dashboard/inventory/indent",
      label: "Indent Management",
      icon: ClipboardList,
      active: location.pathname === "/dashboard/inventory/indent",
      showFor: ["admin", "user", "HOD", "hod"],
    },
    // {
    //   isHeader: true,
    //   label: "System",
    // },

    {
      href: "/dashboard/inventory/settings",
      label: "Master",
      icon: Settings,
      active: location.pathname === "/dashboard/inventory/settings",
      showFor: ["admin"],
    },
  ];

  const checklistSubItems = [
    {
      href: "/dashboard/admin",
      label: "Dashboard",
      icon: Database,
      active: location.pathname === "/dashboard/admin",
      showFor: ["admin", "user", "HOD"],
    },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      icon: Bell,
      active: location.pathname === "/dashboard/notifications",
      showFor: ["admin", "user", "hod"],
      badge: notifications.filter((n) => !n.isRead).length || null,
    },
    {
      href: "/dashboard/quick-task",
      label: "Task Management",
      icon: Zap,
      active: location.pathname === "/dashboard/quick-task",
      showFor: ["admin"],
    },
    {
      href: "/dashboard/assign-task",
      label: "Assign Task",
      icon: CheckSquare,
      active: location.pathname === "/dashboard/assign-task",
      showFor: ["admin", "HOD"],
    },
    {
      href: "/dashboard/delegation",
      label: "Delegation",
      icon: ClipboardList,
      active: location.pathname === "/dashboard/delegation",
      showFor: ["admin", "user", "HOD"],
    },
    {
      href: "/dashboard/task",
      label: "Task",
      icon: CalendarCheck,
      active: location.pathname === "/dashboard/task",
      showFor: ["admin", "HOD", "user"],
    },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: CalendarIcon,
      active: location.pathname === "/dashboard/calendar",
      showFor: ["admin", "user", "HOD"],
    },
    {
      label: "Holiday",
      icon: CalendarIcon,
      isSubGroup: true,
      isOpen: isHolidayDropdownOpen,
      setIsOpen: setIsHolidayDropdownOpen,
      active:
        location.pathname === "/dashboard/holiday-list" ||
        location.pathname === "/dashboard/working-day-calendar",
      showFor: ["admin"],
      subItems: [
        {
          href: "/dashboard/holiday-list",
          label: "Holiday List",
          icon: CalendarIcon,
          active: location.pathname === "/dashboard/holiday-list",
          showFor: ["admin"],
        },
        {
          href: "/dashboard/working-day-calendar",
          label: "Working Day Calendar",
          icon: CalendarIcon,
          active: location.pathname === "/dashboard/working-day-calendar",
          showFor: ["admin"],
        },
      ],
    },
    {
      href: "/dashboard/admin-approval",
      label: "Admin Approval",
      icon: BookmarkCheck,
      active: location.pathname === "/dashboard/admin-approval",
      showFor: ["admin", "HOD"],
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
    },
    {
      href: "/dashboard/training-video",
      label: "Training Video",
      icon: Video,
      active: location.pathname === "/dashboard/training-video",
      showFor: ["admin", "user", "HOD"],
    },
    {
      href: "/dashboard/setting",
      label: "Settings",
      icon: Settings,
      active: location.pathname.includes("/dashboard/setting"),
      showFor: ["admin"],
    },
  ];

  // Update the routes array to group modules
  const routes = [
    {
      href: "/dashboard/portal",
      label: "Portal Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/dashboard/portal",
      showFor: ["admin", "user", "HOD", "hod"],
    },
    {
      label: "Checklist & Delegation",
      icon: ClipboardList,
      isSubmenu: true,
      isOpen: isChecklistDropdownOpen,
      setIsOpen: setIsChecklistDropdownOpen,
      active: checklistSubItems.some((sub) => sub.active),
      badge: (notifications.filter((n) => !n.isRead).length + pendingApprovalsCount) || null,
      subItems: checklistSubItems,
    },
    {
      label: "Inventory System",
      icon: Boxes,
      isSubmenu: true,
      isOpen: isInventoryDropdownOpen,
      setIsOpen: setIsInventoryDropdownOpen,
      active: inventorySubItems.some((sub) => sub.active),
      badge: reorderBadgeCount > 0 ? reorderBadgeCount : null,
      subItems: inventorySubItems,
    },
    {
      href: "/dashboard/whatsapp/inbox",
      label: "WhatsApp",
      icon: MessageCircle,
      active: location.pathname.startsWith("/dashboard/whatsapp"),
      showFor: ["admin", "user", "HOD", "hod"],
    },
    {
      href: "/dashboard/global-settings",
      label: "Global Settings",
      icon: Settings,
      active: location.pathname === "/dashboard/global-settings",
      showFor: ["admin"],
    },
  ];

  const getAccessibleDepartments = () => {
    return [];
  };

  // Filter routes based on user role and super admin status
  const getAccessibleRoutes = () => {
    const userRole = localStorage.getItem("role") || "user";
    const username = localStorage.getItem("user-name");
    const userRoleNormalized = (userRole || "user").toLowerCase();
    const usernameNormalized = (username || "").toLowerCase();
    const isAdminUser =
      userRoleNormalized === "admin" || usernameNormalized === "admin";
    const canSelfAssign = localStorage.getItem("can_self_assign") === "true";

    const storedPageAccess = localStorage.getItem("page_access") || "";
    const hasCustomPageAccess = storedPageAccess.trim() !== "";
    const allowedPages = hasCustomPageAccess
      ? storedPageAccess.split(",").map((p) => p.trim())
      : [];

    return routes
      .map((route) => {
        if (route.subItems) {
          return {
            ...route,
            subItems: route.subItems.filter((sub) => {
              if (sub.isHeader) return true;

              if (hasCustomPageAccess) {
                const pageId = ROUTE_TO_PAGE_ID[sub.href];
                if (pageId) {
                  if (usernameNormalized === "admin") return true;
                  return allowedPages.includes(pageId);
                }
                if (sub.isSubGroup && sub.subItems) {
                  return sub.subItems.some((nested) => {
                    const nestedPageId = ROUTE_TO_PAGE_ID[nested.href];
                    return nestedPageId && allowedPages.includes(nestedPageId);
                  });
                }
              }

              if (isAdminUser) return true;

              // Fallback to role-based filtering:
              if (
                sub.label === "Settings" ||
                sub.label === "Task Management" ||
                sub.label === "Holiday List" ||
                sub.label === "Working Day Calendar"
              ) {
                return isAdminUser;
              }
              const showForNormalized = sub.showFor || [];
              if (
                sub.href === "/dashboard/assign-task" &&
                userRoleNormalized === "user" &&
                canSelfAssign
              ) {
                return true;
              }
              return showForNormalized.some(
                (role) => role.toLowerCase() === userRoleNormalized,
              );
            }),
          };
        }

        if (hasCustomPageAccess) {
          const pageId = ROUTE_TO_PAGE_ID[route.href];
          if (pageId) {
            if (usernameNormalized === "admin") return route;
            return allowedPages.includes(pageId) ? route : null;
          }
        }

        if (isAdminUser) return route;

        // Fallback to role-based filtering for main routes:
        const showForNormalized = route.showFor || [];
        if (showForNormalized.length > 0) {
          const isAllowed = showForNormalized.some(
            (role) => role.toLowerCase() === userRoleNormalized,
          );
          return isAllowed ? route : null;
        }

        return route;
      })
      .filter(Boolean)
      .filter(
        (route) =>
          !route.isSubmenu || (route.subItems && route.subItems.length > 0),
      );
  };

  // Submenu logic removed

  // Get accessible routes
  const accessibleRoutes = getAccessibleRoutes();

  if (!showLayout) {
    return <>{children}</>;
  }

  return (
    <div
      className={`theme-transition flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950`}
    >
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-950 md:flex md:flex-col transition-colors duration-300">
        <div className="flex h-14 items-center border-b border-blue-200 dark:border-slate-800 px-4 bg-gradient-to-r from-blue-100 to-blue-100 dark:from-slate-900 dark:to-slate-900">
          <Link
            to="/dashboard/portal"
            className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400"
          >
            <img
              src={aceLogo}
              alt="TaskDesk Logo"
              className="h-8 w-8 rounded-full object-cover border border-blue-200 dark:border-slate-800"
            />
            <span>Master System</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {accessibleRoutes.map((route) => (
              <li key={route.label}>
                {route.isSubmenu ? (
                  <div className="flex flex-col">
                    <button
                      onClick={() => route.setIsOpen(!route.isOpen)}
                      className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        route.active
                          ? "bg-gradient-to-r from-blue-100 to-blue-100 text-blue-700 dark:from-slate-900 dark:to-slate-950 dark:text-blue-400"
                          : "text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <route.icon
                          className={`h-4 w-4 ${route.active ? "text-blue-600 dark:text-blue-400" : "text-gray-405 dark:text-slate-500"}`}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{route.label}</span>
                          {route.badge && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {route.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      {route.isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {route.isOpen && (
                      <ul className="mt-1 ml-4 space-y-1 border-l border-blue-100 dark:border-slate-800 pl-2.5">
                        {route.subItems.map((sub, index) => (
                          <li key={sub.label || `header-${index}`}>
                            {sub.isHeader ? (
                              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400/80 dark:text-slate-500/80 px-3 py-1 mt-2.5 select-none">
                                {sub.label}
                              </div>
                            ) : sub.isSubGroup ? (
                              <div className="flex flex-col">
                                <button
                                  onClick={() => sub.setIsOpen(!sub.isOpen)}
                                  className={`flex items-center justify-between w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    sub.active
                                      ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-slate-900 font-semibold"
                                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {sub.icon && (
                                      <sub.icon
                                        className={`h-3.5 w-3.5 ${sub.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}
                                      />
                                    )}
                                    <span className="flex-1 truncate">
                                      {sub.label}
                                    </span>
                                  </div>
                                  {sub.isOpen ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                {sub.isOpen && (
                                  <ul className="mt-1 ml-3 space-y-1 border-l border-blue-100 dark:border-slate-800 pl-2">
                                    {sub.subItems
                                      .filter((nested) => {
                                        const uRole =
                                          localStorage.getItem("role") ||
                                          "user";
                                        const uName =
                                          localStorage.getItem("user-name");
                                        const isAdmin =
                                          (uRole || "user").toLowerCase() ===
                                            "admin" ||
                                          (uName || "").toLowerCase() ===
                                            "admin";
                                        if (isAdmin) return true;

                                        const storedPgAcc =
                                          localStorage.getItem("page_access") ||
                                          "";
                                        const hasCustomPgAcc =
                                          storedPgAcc.trim() !== "";
                                        const alPages = hasCustomPgAcc
                                          ? storedPgAcc
                                              .split(",")
                                              .map((p) => p.trim())
                                          : [];

                                        if (hasCustomPgAcc) {
                                          const pageId =
                                            ROUTE_TO_PAGE_ID[nested.href];
                                          return (
                                            pageId && alPages.includes(pageId)
                                          );
                                        }
                                        return true;
                                      })
                                      .map((nested) => (
                                        <li key={nested.label}>
                                          <Link
                                            to={nested.href}
                                            className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                              nested.active
                                                ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-slate-900 font-semibold"
                                                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900"
                                            }`}
                                          >
                                            {nested.icon && (
                                              <nested.icon
                                                className={`h-3.5 w-3.5 ${nested.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}
                                              />
                                            )}
                                            <span className="flex-1 truncate">
                                              {nested.label}
                                            </span>
                                          </Link>
                                        </li>
                                      ))}
                                  </ul>
                                )}
                              </div>
                            ) : (
                              <Link
                                to={sub.href}
                                className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                  sub.active
                                    ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-slate-900 font-semibold"
                                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900"
                                }`}
                              >
                                {sub.icon && (
                                  <sub.icon
                                    className={`h-3.5 w-3.5 ${sub.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}
                                  />
                                )}
                                <span className="flex-1 truncate">
                                  {sub.label}
                                </span>
                                {sub.badge && (
                                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    {sub.badge}
                                  </span>
                                )}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={route.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      route.active
                        ? "bg-gradient-to-r from-blue-100 to-blue-100 text-blue-700 dark:from-slate-900 dark:to-slate-950 dark:text-blue-400"
                        : "text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <route.icon
                      className={`h-4 w-4 ${route.active ? "text-blue-600 dark:text-blue-400" : "text-gray-405 dark:text-slate-500"}`}
                    />
                    <div className="flex items-center justify-between w-full">
                      <span>{route.label}</span>
                      {route.badge && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {route.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-blue-200 dark:border-slate-800 p-4 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-slate-950 dark:to-slate-950">
          <div className="flex flex-col">
            {/* User info section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center overflow-hidden border border-blue-100 dark:border-slate-800">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-black dark:text-slate-300">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">
                    {username || "User"}{" "}
                    {userRole.toLowerCase() === "admin"
                      ? isSuperAdmin
                        ? "(Super Admin)"
                        : "(Admin)"
                      : userRole.toLowerCase() === "hod"
                        ? "(HOD)"
                        : ""}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-550 truncate">
                    {userEmail || "user@example.com"}
                  </p>
                </div>
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 p-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                title="Toggle theme"
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-blue-700" />
                )}
                <span className="sr-only">Toggle Theme</span>
              </button>
            </div>

            {/* Logout button positioned below user info */}
            <div className="mt-2 flex justify-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-slate-900 text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
      {/* Mobile menu button and sidebar - similar structure as desktop but with mobile classes */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute left-4 top-3 z-[110] text-blue-700 dark:text-blue-400 p-2 rounded-md hover:bg-blue-100 dark:hover:bg-slate-900"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>
      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-950 shadow-lg dark:border-r dark:border-slate-800">
            <div className="flex h-14 items-center border-b border-blue-200 dark:border-slate-800 px-4 bg-gradient-to-r from-blue-100 to-blue-100 dark:from-slate-900 dark:to-slate-900">
              <Link
                to="/dashboard/portal"
                className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <img
                  src={aceLogo}
                  alt="TaskDesk Logo"
                  className="h-8 w-8 rounded-full object-cover border border-blue-200 dark:border-slate-800"
                />
                <span>Master System</span>
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 bg-white dark:bg-slate-950">
              <ul className="space-y-1">
                {accessibleRoutes.map((route) => (
                  <li key={route.label}>
                    {route.isSubmenu ? (
                      <div className="flex flex-col">
                        <button
                          onClick={() => route.setIsOpen(!route.isOpen)}
                          className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            route.active
                              ? "bg-gradient-to-r from-blue-100 to-blue-100 text-blue-700 dark:from-slate-900 dark:to-slate-950 dark:text-blue-400"
                              : "text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <route.icon
                                className={`h-4 w-4 ${route.active ? "text-blue-600 dark:text-blue-400" : "text-gray-405 dark:text-slate-500"}`}
                              />
                              <span>{route.label}</span>
                            </div>
                            {route.badge && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center mr-2">
                                {route.badge}
                              </span>
                            )}
                          </div>
                          {route.isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        {route.isOpen && (
                          <ul className="mt-1 ml-4 space-y-1 border-l border-blue-100 dark:border-slate-800 pl-2.5">
                            {route.subItems.map((sub, index) => (
                              <li key={sub.label || `header-${index}`}>
                                {sub.isHeader ? (
                                  <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400/80 dark:text-slate-500/80 px-3 py-1 mt-2.5 select-none">
                                    {sub.label}
                                  </div>
                                ) : sub.isSubGroup ? (
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => sub.setIsOpen(!sub.isOpen)}
                                      className={`flex items-center justify-between w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                        sub.active
                                          ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-slate-900 font-semibold"
                                          : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        {sub.icon && (
                                          <sub.icon
                                            className={`h-3.5 w-3.5 ${sub.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}
                                          />
                                        )}
                                        <span className="flex-1 truncate">
                                          {sub.label}
                                        </span>
                                      </div>
                                      {sub.isOpen ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    {sub.isOpen && (
                                      <ul className="mt-1 ml-3 space-y-1 border-l border-blue-100 dark:border-slate-800 pl-2">
                                        {sub.subItems
                                          .filter((nested) => {
                                            const uRole =
                                              localStorage.getItem("role") ||
                                              "user";
                                            const uName =
                                              localStorage.getItem("user-name");
                                            const isAdmin =
                                              (
                                                uRole || "user"
                                              ).toLowerCase() === "admin" ||
                                              (uName || "").toLowerCase() ===
                                                "admin";
                                            if (isAdmin) return true;

                                            const storedPgAcc =
                                              localStorage.getItem(
                                                "page_access",
                                              ) || "";
                                            const hasCustomPgAcc =
                                              storedPgAcc.trim() !== "";
                                            const alPages = hasCustomPgAcc
                                              ? storedPgAcc
                                                  .split(",")
                                                  .map((p) => p.trim())
                                              : [];

                                            if (hasCustomPgAcc) {
                                              const pageId =
                                                ROUTE_TO_PAGE_ID[nested.href];
                                              return (
                                                pageId &&
                                                alPages.includes(pageId)
                                              );
                                            }
                                            return true;
                                          })
                                          .map((nested) => (
                                            <li key={nested.label}>
                                              <Link
                                                to={nested.href}
                                                className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                                  nested.active
                                                    ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-slate-900 font-semibold"
                                                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900"
                                                }`}
                                                onClick={() =>
                                                  setIsMobileMenuOpen(false)
                                                }
                                              >
                                                {nested.icon && (
                                                  <nested.icon
                                                    className={`h-3.5 w-3.5 ${nested.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}
                                                  />
                                                )}
                                                <span className="flex-1 truncate">
                                                  {nested.label}
                                                </span>
                                              </Link>
                                            </li>
                                          ))}
                                      </ul>
                                    )}
                                  </div>
                                ) : (
                                  <Link
                                    to={sub.href}
                                    className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                      sub.active
                                        ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-slate-900 font-semibold"
                                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900"
                                    }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                  >
                                    {sub.icon && (
                                      <sub.icon
                                        className={`h-3.5 w-3.5 ${sub.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}
                                      />
                                    )}
                                    <span className="flex-1 truncate">
                                      {sub.label}
                                    </span>
                                    {sub.badge && (
                                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                        {sub.badge}
                                      </span>
                                    )}
                                  </Link>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={route.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          route.active
                            ? "bg-gradient-to-r from-blue-100 to-blue-100 text-blue-700 dark:from-slate-900 dark:to-slate-950 dark:text-blue-400"
                            : "text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-900"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <route.icon
                          className={`h-4 w-4 ${route.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{route.label}</span>
                          {route.badge && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {route.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-blue-200 dark:border-slate-800 p-4 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-slate-950 dark:to-slate-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center overflow-hidden border border-blue-100">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-black">
                        {username ? username.charAt(0).toUpperCase() : "U"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      {username || "User"}{" "}
                      {userRole === "admin"
                        ? isSuperAdmin
                          ? "(Super Admin)"
                          : "(Admin)"
                        : userRole === "HOD"
                          ? "(HOD)"
                          : ""}
                    </p>
                    <p className="text-xs text-blue-600">
                      {userEmail || "user@example.com"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 p-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                    title="Toggle theme"
                  >
                    {isDark ? (
                      <Sun className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle Theme</span>
                  </button>
                </div>
              </div>
              <div className="mt-2 flex justify-center">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-slate-900 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}{" "}
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden dark:bg-slate-950 transition-colors duration-300">
        <header className="flex h-16 items-center justify-between border-b border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 md:px-6 shadow-sm z-30 transition-colors duration-300">
          <div className="flex md:hidden w-8"></div>
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-400">
              Master System
            </h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em] -mt-1 hidden xs:block">
              Master System
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button in Header */}
            <button
              onClick={toggleTheme}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 hover:bg-gray-100/80 transition-all shadow-sm cursor-pointer mr-1"
              title="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-indigo-600" />
              )}
            </button>

            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Welcome
              </span>
              <span className="text-sm font-black text-blue-700 dark:text-blue-400 -mt-1">
                Hello, {username || "User"}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-50 to-blue-600 flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-blue-100/50 dark:ring-blue-950/50 overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={username}
                  className="h-full w-full object-cover"
                  onError={() => {
                    console.error(
                      "❌ AdminLayout Image Failed to Load:",
                      profileImage,
                    );
                    setProfileImage(""); // Fallback to initials
                  }}
                />
              ) : (
                <span className="text-white text-sm font-black uppercase">
                  {username ? username.charAt(0) : "U"}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 transition-colors duration-300 ${
          location.pathname.startsWith("/dashboard/whatsapp")
            ? "p-0 overflow-hidden bg-white dark:bg-slate-950"
            : "overflow-y-auto overflow-x-hidden px-4 pb-4 md:px-6 md:pb-6 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-slate-950 dark:to-slate-900 pb-24 md:pb-6"
        }`}>
          {children}
        </main>

        <div className="bg-gradient-to-r from-blue-600 to-blue-600 h-5 flex items-center justify-center px-4 shadow-md z-40">
          <a
            href="https://www.botivate.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/90 font-medium tracking-[0.2em] uppercase hover:underline hover:text-white transition-colors"
          >
            Powered by <span className="font-bold">Botivate</span>
          </a>
        </div>

        {/* Premium Bottom Navigation for Mobile */}
        {/* 
        <div className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 flex items-center justify-around px-2 transition-colors duration-300">
          <Link
            to="/dashboard/portal"
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${location.pathname === "/dashboard/portal"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
              : "text-gray-400 dark:text-slate-500 hover:text-blue-400 dark:hover:text-blue-300"
              }`}
          >
            <Home size={22} strokeWidth={location.pathname === "/dashboard/portal" ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-bold">Home</span>
          </Link>



          <Link
            to="/dashboard/task"
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${location.pathname === "/dashboard/task"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
              : "text-gray-400 dark:text-slate-500 hover:text-blue-400 dark:hover:text-blue-300"
              }`}
          >
            <CalendarCheck size={22} strokeWidth={location.pathname === "/dashboard/task" ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-bold">Tasks</span>
          </Link>

          {(userRole?.toUpperCase() === "ADMIN" || userRole?.toUpperCase() === "HOD") && (
            <div className="relative -mt-12">
              <Link
                to="/dashboard/assign-task"
                className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 text-white transform active:scale-90 transition-all duration-300 border-4 border-blue-50 dark:border-slate-900"
              >
                <CirclePlus size={28} strokeWidth={2.5} />
              </Link>
            </div>
          )}

          <Link
            to="/dashboard/delegation"
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${location.pathname === "/dashboard/delegation"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
              : "text-gray-400 dark:text-slate-500 hover:text-blue-400 dark:hover:text-blue-300"
              }`}
          >
            <BookmarkCheck size={22} strokeWidth={location.pathname === "/dashboard/delegation" ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-bold">Status</span>
          </Link>

          <button
            onClick={() => setIsUserPopupOpen(true)}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-gray-400 dark:text-slate-500 hover:text-blue-400 dark:hover:text-blue-300 transition-all"
          >
            <UserRound size={22} strokeWidth={2} />
            <span className="text-[10px] mt-1 font-bold">Profile</span>
          </button>
        </div>
        */}

        {/* User Popup */}
        {isUserPopupOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-[340px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/50 dark:border-slate-800">
              {/* Header Gradient */}
              <div className="h-32 bg-gradient-to-br from-indigo-600 via-blue-600 to-pink-500 relative">
                <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px]"></div>
                <button
                  onClick={() => setIsUserPopupOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all hover:rotate-90 z-10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Info */}
              <div className="px-8 pb-8 text-center bg-white dark:bg-slate-900 animate-colors duration-300">
                <div className="relative -mt-16 mb-6 flex justify-center">
                  <div className="h-28 w-28 rounded-full bg-white dark:bg-slate-900 p-1.5 shadow-2xl ring-4 ring-white/30 dark:ring-slate-800/30">
                    <div className="h-full w-full rounded-full bg-gradient-to-tr from-indigo-50 to-blue-600 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-inner">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={username}
                          className="h-full w-full object-cover transform hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-4xl font-black text-white uppercase tracking-tighter">
                          {username ? username.charAt(0) : "U"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight mb-1">
                      {username || "User"}
                    </h3>
                    <div className="flex justify-center flex-wrap gap-2">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 rounded-full border border-indigo-100/50 dark:border-indigo-900/30">
                        {userRole?.toLowerCase() === "admin"
                          ? isSuperAdmin
                            ? "Super Admin"
                            : "Administrator"
                          : userRole?.toLowerCase() === "hod"
                            ? "HOD / Supervisor"
                            : "Staff"}
                      </span>
                    </div>
                  </div>

                  <div className="py-3 px-4 bg-gray-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center gap-2 border border-gray-100 dark:border-slate-800/60">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 truncate">
                      {userEmail || "user@example.com"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsUserPopupOpen(false)}
                    className="flex justify-center items-center py-3.5 px-4 rounded-2xl text-xs font-black text-gray-400 border-2 border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-850 hover:text-gray-600 dark:hover:text-slate-300 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] hover:shadow-indigo-200 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Logout <LogOut size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
