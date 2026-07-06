import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Users,
  ShieldAlert,
  Search,
  Check,
  Lock,
  Settings,
  Building,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  FolderLock,
  X,
  Save,
  User,
  Calendar,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import {
  createUser,
  updateUser,
  deleteUser,
  userDetails,
  departmentDetails,
  uploadProfileImage,
} from "../../../redux/slice/settingSlice";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";

// System Page Config for permissions matrix
const SYSTEM_PAGES = {
  checklist: {
    name: "Checklist & Delegation",
    icon: Building,
    pages: [
      {
        id: "checklist_dashboard",
        label: "Dashboard",
        route: "/dashboard/admin",
      },
      {
        id: "checklist_notifications",
        label: "Notifications",
        route: "/dashboard/notifications",
      },
      {
        id: "checklist_quick_task",
        label: "Task Management",
        route: "/dashboard/quick-task",
      },
      {
        id: "checklist_assign_task",
        label: "Assign Task",
        route: "/dashboard/assign-task",
      },
      {
        id: "checklist_delegation",
        label: "Delegation",
        route: "/dashboard/delegation",
      },
      { id: "checklist_task", label: "Task List", route: "/dashboard/task" },
      {
        id: "checklist_calendar",
        label: "Calendar",
        route: "/dashboard/calendar",
      },
      {
        id: "checklist_holiday",
        label: "Holiday List",
        route: "/dashboard/holiday-list",
      },
      {
        id: "checklist_working_day",
        label: "Working Day Calendar",
        route: "/dashboard/working-day-calendar",
      },
      {
        id: "checklist_approval",
        label: "Admin Approval",
        route: "/dashboard/admin-approval",
      },
      {
        id: "checklist_video",
        label: "Training Video",
        route: "/dashboard/training-video",
      },
      {
        id: "checklist_settings",
        label: "Settings",
        route: "/dashboard/setting",
      },
    ],
  },
  inventory: {
    name: "Inventory System",
    icon: Settings,
    pages: [
      {
        id: "inventory_dashboard",
        label: "Dashboard",
        route: "/dashboard/inventory/dashboard",
      },
      {
        id: "inventory_stock",
        label: "IMS",
        route: "/dashboard/inventory/stock",
      },
      {
        id: "inventory_master",
        label: "Master Data",
        route: "/dashboard/inventory/master",
      },
      {
        id: "inventory_transactions",
        label: "Stock Transactions",
        route: "/dashboard/inventory/transactions",
      },
      {
        id: "inventory_reorder",
        label: "Reorder Management",
        route: "/dashboard/inventory/reorder",
      },
      {
        id: "inventory_indent",
        label: "Indent Management",
        route: "/dashboard/inventory/indent",
      },
      {
        id: "inventory_settings",
        label: "Master",
        route: "/dashboard/inventory/settings",
      },
    ],
  },
};

// Initial Mock Permissions State
const INITIAL_PERMISSIONS = {
  checklist_dashboard: { admin: true, HOD: true, manager: true, user: true },
  checklist_notifications: {
    admin: true,
    HOD: true,
    manager: true,
    user: true,
  },
  checklist_quick_task: {
    admin: true,
    HOD: false,
    manager: false,
    user: false,
  },
  checklist_assign_task: {
    admin: true,
    HOD: true,
    manager: false,
    user: false,
  },
  checklist_delegation: { admin: true, HOD: true, manager: true, user: true },
  checklist_task: { admin: true, HOD: true, manager: true, user: true },
  checklist_calendar: { admin: true, HOD: true, manager: true, user: true },
  checklist_holiday: { admin: true, HOD: false, manager: false, user: false },
  checklist_working_day: {
    admin: true,
    HOD: false,
    manager: false,
    user: false,
  },
  checklist_approval: { admin: true, HOD: true, manager: false, user: false },
  checklist_video: { admin: true, HOD: true, manager: true, user: true },
  checklist_settings: { admin: true, HOD: false, manager: false, user: false },

  inventory_dashboard: { admin: true, HOD: true, manager: true, user: true },
  inventory_stock: { admin: true, HOD: true, manager: true, user: true },
  inventory_master: { admin: true, HOD: true, manager: true, user: true },
  inventory_transactions: { admin: true, HOD: true, manager: true, user: true },
  inventory_reorder: { admin: true, HOD: true, manager: true, user: true },
  inventory_indent: { admin: true, HOD: true, manager: true, user: true },
  inventory_audit: { admin: true, HOD: true, manager: true, user: true },
  inventory_settings: { admin: true, HOD: false, manager: false, user: false },
};

export default function GlobalSettings() {
  const { showToast } = useMagicToast();
  const dispatch = useDispatch();

  // Load state from Redux setting slice
  const {
    userData = [],
    department = [],
    loading,
    error,
  } = useSelector((state) => state.setting);

  // Local UI and form states
  const [activeTab, setActiveTab] = useState("users");
  const [selectedSystem, setSelectedSystem] = useState("checklist");
  const [searchQuery, setSearchQuery] = useState("");
  const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);
  const [divisions, setDivisions] = useState([]);

  // User form states
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [activeSystemTab, setActiveSystemTab] = useState("checklist");
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    employee_id: "",
    role: "user",
    status: "active",
    department: "",
    division: "",
    user_access: "",
    Designation: "",
    profile_image: "",
    reported_by: "",
    can_self_assign: false,
    page_access: "",
    location: "",
    day_off: "",
  });

  // Modal tabs
  const [modalTab, setModalTab] = useState("details"); // 'details' | 'permissions'

  // User deletion confirmations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDeleteData, setUserToDeleteData] = useState({
    id: null,
    name: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch and Subscribe to Users Table
  useEffect(() => {
    dispatch(userDetails());
    dispatch(departmentDetails());

    // Fetch locations dynamically
    const fetchLocations = async () => {
      try {
        const { data } = await supabase
          .from("inventory_locations")
          .select("location")
          .order("location", { ascending: true });
        if (data) {
          setLocations(data.map((item) => item.location));
        }
      } catch (err) {
        console.error("Error fetching inventory locations:", err);
      }
    };
    fetchLocations();

    const fetchDivisions = async () => {
      try {
        const { data } = await supabase
          .from("divisions")
          .select("*")
          .order("name", { ascending: true });
        if (data) {
          setDivisions(data);
        }
      } catch (err) {
        console.error("Error fetching divisions:", err);
      }
    };
    fetchDivisions();

    // Setup real-time postgres changes listener
    const subscription = supabase
      .channel("global-settings-users")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          dispatch(userDetails());
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // Search & Filter
  const filteredUsers = useMemo(() => {
    return (userData || []).filter((u) => {
      if (!u || !u.user_name) return false;
      const term = searchQuery.toLowerCase();
      return (
        String(u.user_name || "")
          .toLowerCase()
          .includes(term) ||
        String(u.email_id || "")
          .toLowerCase()
          .includes(term) ||
        String(u.number || "")
          .toLowerCase()
          .includes(term) ||
        String(u.employee_id || "")
          .toLowerCase()
          .includes(term) ||
        String(u.department || "")
          .toLowerCase()
          .includes(term) ||
        String(u.Designation || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [searchQuery, userData]);

  const getPagesForRole = (role) => {
    const roleLower = (role || "user").toLowerCase();
    const roleKey = roleLower === "employee" ? "user" : roleLower;
    const allowed = [];
    Object.entries(SYSTEM_PAGES).forEach(([sysId, sys]) => {
      sys.pages.forEach((p) => {
        const rule = INITIAL_PERMISSIONS[p.id];
        if (rule && rule[roleKey]) {
          allowed.push(p.id);
        }
      });
    });
    return allowed.join(",");
  };

  // Form Handlers
  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "department") {
        updated.user_access = value;
      }
      if (name === "role") {
        updated.page_access = getPagesForRole(value);
      }
      return updated;
    });
  };

  const resetUserForm = () => {
    setUserForm({
      username: "",
      email: "",
      password: "",
      phone: "",
      employee_id: "",
      role: "user",
      status: "active",
      department: "",
      division: "",
      user_access: "",
      Designation: "",
      profile_image: "",
      reported_by: "",
      can_self_assign: false,
      page_access: getPagesForRole("user"),
      location: "",
      day_off: "",
    });
    setProfileFile(null);
    setProfilePreview(null);
    setIsEditing(false);
    setCurrentUserId(null);
    setModalTab("details");
  };

  const handleAddButtonClick = () => {
    resetUserForm();
    setShowUserModal(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const generatedEmpId = `EMP-${Date.now().toString().slice(-6)}`;

    let imageUrl = userForm.profile_image;
    if (profileFile) {
      try {
        imageUrl = await dispatch(
          uploadProfileImage({ file: profileFile, userId: generatedEmpId }),
        ).unwrap();
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        showToast("Image upload failed, continuing without image.", "warning");
      }
    }

    const newUser = {
      ...userForm,
      employee_id: generatedEmpId,
      user_access: userForm.user_access || userForm.department,
      department: userForm.department,
      profile_image: imageUrl,
      reported_by: userForm.reported_by,
      can_self_assign: userForm.can_self_assign,
      page_access: userForm.page_access,
      location: userForm.location,
    };

    try {
      await dispatch(createUser(newUser)).unwrap();

      // Update local storage if creating self (unlikely)
      if (newUser.user_name === localStorage.getItem("user-name")) {
        localStorage.setItem("profile_image", imageUrl || "");
      }

      resetUserForm();
      setShowUserModal(false);
      showToast("User created successfully!", "success");
      dispatch(userDetails());
    } catch (error) {
      console.error("Error adding user:", error);
      showToast("Failed to create user.", "error");
    }
  };

  const handleEditUser = (userId) => {
    const user = userData.find((u) => u.id === userId);
    if (!user) return;

    setUserForm({
      username: user.user_name || "",
      email: user.email_id || "",
      password: "", // Empty password field so it doesn't get updated unless typed
      phone: user.number || "",
      employee_id: user.employee_id || "",
      department: user.department || "",
      division: user.division || "",
      user_access: user.user_access || "",
      role: user.role || "user",
      status: user.status || "active",
      Designation: user.Designation || "",
      profile_image: user.profile_image || "",
      reported_by: user.reported_by || "",
      can_self_assign: user.can_self_assign || false,
      page_access: user.page_access || "",
      location: user.location || "",
      day_off: user.day_off || "",
    });
    setProfilePreview(user.profile_image || null);
    setProfileFile(null);
    setCurrentUserId(userId);
    setIsEditing(true);
    setShowUserModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    let imageUrl = userForm.profile_image;
    if (profileFile) {
      try {
        imageUrl = await dispatch(
          uploadProfileImage({
            file: profileFile,
            userId: userForm.employee_id || currentUserId,
          }),
        ).unwrap();
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        showToast(
          "Image upload failed, continuing with previous image.",
          "warning",
        );
      }
    }

    const updatedUser = {
      user_name: userForm.username,
      password: userForm.password,
      email_id: userForm.email,
      number: userForm.phone,
      employee_id: userForm.employee_id,
      role: userForm.role,
      status: userForm.status,
      user_access: userForm.user_access || userForm.department,
      department: userForm.department,
      division: userForm.division || null,
      Designation: userForm.Designation || null,
      profile_image: imageUrl,
      reported_by: userForm.reported_by,
      can_self_assign: userForm.can_self_assign,
      page_access: userForm.page_access,
      location: userForm.location,
      day_off: userForm.day_off || null,
    };

    try {
      await dispatch(updateUser({ id: currentUserId, updatedUser })).unwrap();

      // If updating currently logged in user
      if (updatedUser.user_name === localStorage.getItem("user-name")) {
        localStorage.setItem("profile_image", imageUrl || "");
        localStorage.setItem("page_access", updatedUser.page_access || "");
        window.location.reload();
      }

      resetUserForm();
      setShowUserModal(false);
      showToast("User updated successfully!", "success");
      dispatch(userDetails());
    } catch (error) {
      console.error("Error updating user:", error);
      showToast("Failed to update user.", "error");
    }
  };

  const handleDeleteUser = (userId) => {
    const userToDel = userData.find((u) => u.id === userId);
    if (!userToDel) return;
    setUserToDeleteData({ id: userId, name: userToDel.user_name });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUserAndTasks = async () => {
    const { id: userId, name: userName } = userToDeleteData;
    setIsDeleting(true);
    try {
      // Cascading deletion for tasks assigned to this user
      if (userName) {
        const deletePromises = [
          supabase.from("checklist").delete().eq("name", userName),
          supabase.from("delegation").delete().eq("name", userName),
          supabase.from("maintenance_tasks").delete().eq("name", userName),
          supabase
            .from("repair_tasks")
            .delete()
            .eq("assigned_person", userName),
          supabase.from("ea_tasks").delete().eq("doer_name", userName),
        ];
        await Promise.all(deletePromises);
      }

      await dispatch(deleteUser(userId)).unwrap();
      showToast(`User ${userName} deleted successfully`, "success");
      dispatch(userDetails());
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("Error during deletion process", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Permissions Matrix Handlers
  const handleTogglePermission = (pageId, role) => {
    setPermissions((prev) => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [role]: !prev[pageId]?.[role],
      },
    }));
    setIsSaved(false);
  };

  const handleSavePermissions = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }, 800);
  };

  // Status & Role Badge Styles
  const getStatusColor = (status) => {
    if (status === "active")
      return "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400";
    if (status === "on leave" || status === "on_leave")
      return "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400";
    return "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400";
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400";
      case "HOD":
        return "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-400";
      case "manager":
        return "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300";
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 theme-transition">
        {/* Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Settings size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Global System Settings
              </h1>
              <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold">
                Centralized user management and cross-system page permissions
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Search user by name, email, department, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-blue-600 dark:focus:outline-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAddButtonClick}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Add New User</span>
              </button>
            </div>
          </div>

          {/* Error or Loading Banners */}
          {loading && (
            <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl">
              <RefreshCw
                size={24}
                className="animate-spin text-blue-600 mr-3"
              />
              <span className="text-sm font-bold text-gray-500 dark:text-slate-400">
                Loading users database...
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-400 rounded-2xl text-xs font-bold">
              ⚠️ Database error: {error}
            </div>
          )}

          {/* Table (Desktop View) */}
          {!loading && (
            <div className="hidden lg:block bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone No.</th>
                      <th className="px-6 py-4">Employee ID</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Designation</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Reported To</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold overflow-hidden border border-blue-200/20">
                                {user.profile_image ? (
                                  <img
                                    src={user.profile_image}
                                    alt={user.user_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {user.user_name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {user.user_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                            {user.email_id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                            {user.number}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-slate-300">
                            {user.employee_id || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-slate-300">
                            {user.department || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {user.Designation || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(user.status)}`}
                            >
                              {user.status === "on_leave"
                                ? "On Leave"
                                : user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleColor(user.role)}`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                            {user.reported_by || "Admin"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="p-1.5 text-gray-450 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 text-gray-450 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="10"
                          className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 font-bold text-sm"
                        >
                          No users found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards (Mobile & Tablet View) */}
          {!loading && (
            <div className="lg:hidden space-y-4">
              {filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md dark:hover:shadow-black/35 hover:border-blue-500/25 transition-all duration-200 space-y-4 text-left"
                    >
                      {/* Card Header: Avatar, Name, Designation, and Action Buttons */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold overflow-hidden border border-blue-200/20 flex-shrink-0">
                            {user.profile_image ? (
                              <img
                                src={user.profile_image}
                                alt={user.user_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">
                                {user.user_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-white">
                              {user.user_name}
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                              {user.Designation || "—"}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-850 p-1.5 rounded-xl border border-gray-100 dark:border-slate-800/80">
                          <button
                            onClick={() => handleEditUser(user.id)}
                            className="p-1.5 text-gray-450 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-gray-450 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Badges section */}
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(user.status)}`}
                        >
                          {user.status === "on_leave" ? "On Leave" : user.status}
                        </span>
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleColor(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-slate-800/80 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                            Email
                          </span>
                          <span className="font-semibold text-gray-700 dark:text-slate-300 break-all">
                            {user.email_id || "—"}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                            Phone No.
                          </span>
                          <span className="font-semibold text-gray-700 dark:text-slate-300">
                            {user.number || "—"}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                            Employee ID
                          </span>
                          <span className="font-mono font-semibold text-gray-700 dark:text-slate-300">
                            {user.employee_id || "—"}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                            Department
                          </span>
                          <span className="font-semibold text-gray-700 dark:text-slate-300">
                            {user.department || "—"}
                          </span>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                            Reported To
                          </span>
                          <span className="font-semibold text-gray-700 dark:text-slate-300">
                            {user.reported_by || "Admin"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl font-bold text-sm">
                  No users found matching your search.
                </div>
              )}
            </div>
          )}

          {!loading && (
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 px-2">
              <div>
                Showing {filteredUsers.length} of {userData.length} entries
              </div>
              <div className="text-[10px] uppercase font-black tracking-widest text-green-600 bg-green-50 dark:bg-green-950/40 px-2.5 py-0.5 rounded-md">
                ● Real-time Live Connection
              </div>
            </div>
          )}
        </div>

        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowUserModal(false)}
            ></div>

            <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-5xl w-full overflow-hidden animate-in zoom-in-95 duration-305 border border-white/10 flex flex-col max-h-[95vh]">
              {/* Premium Header */}
              <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-pink-500 px-10 py-8 relative">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]"></div>
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight animate-fade-in">
                      {isEditing ? "Update Profile" : "Nurture Talent"}
                    </h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mt-1">
                      {isEditing
                        ? "Refine user information"
                        : "Create a new team member"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all hover:rotate-90 cursor-pointer"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              {/* Premium Tabs Swapper */}
              <div className="flex border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 px-10">
                <button
                  type="button"
                  onClick={() => setModalTab("details")}
                  className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    modalTab === "details"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-400 hover:text-gray-605 dark:hover:text-slate-400"
                  }`}
                >
                  <User size={14} strokeWidth={2.5} />
                  <span>User Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("permissions")}
                  className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    modalTab === "permissions"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-400 hover:text-gray-605 dark:hover:text-slate-400"
                  }`}
                >
                  <Lock size={14} strokeWidth={2.5} />
                  <span>Page Permissions</span>
                </button>
              </div>

              <div className="p-10 overflow-y-auto no-scrollbar flex-1">
                <form
                  onSubmit={isEditing ? handleUpdateUser : handleAddUser}
                  className="space-y-8"
                >
                  {modalTab === "details" && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Profile Image Section */}
                      <div className="flex flex-col items-center mb-4">
                        <div className="relative group">
                          <div className="h-24 w-24 rounded-full bg-white dark:bg-slate-800 p-1 shadow-xl ring-4 ring-blue-100/50 dark:ring-slate-800/80">
                            <div className="h-full w-full rounded-full bg-gradient-to-tr from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-blue-200 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/50">
                              {profilePreview || userForm.profile_image ? (
                                <img
                                  src={profilePreview || userForm.profile_image}
                                  alt="Profile"
                                  className="h-full w-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <User
                                  size={32}
                                  className="text-blue-200 dark:text-slate-600 group-hover:text-blue-400 transition-colors"
                                />
                              )}
                            </div>
                          </div>
                          <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-xl hover:bg-blue-700 transition-all active:scale-90 ring-4 ring-white dark:ring-slate-900 flex items-center justify-center">
                            <Plus size={14} strokeWidth={3} />
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  setProfileFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () =>
                                    setProfilePreview(reader.result);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-slate-500 mt-2 font-black uppercase tracking-widest">
                          Profile Identity
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="space-y-1">
                          <label
                            htmlFor="username"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            Username
                          </label>
                          <input
                            type="text"
                            name="username"
                            id="username"
                            value={userForm.username}
                            onChange={handleUserInputChange}
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                            placeholder="Enter username"
                          />
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="email"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            Email Address
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={userForm.email}
                            onChange={handleUserInputChange}
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                            placeholder="Enter email address"
                          />
                        </div>

                        {!isEditing && (
                          <div className="space-y-1">
                            <label
                              htmlFor="password"
                              className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                            >
                              Password
                            </label>
                            <input
                              type="password"
                              name="password"
                              id="password"
                              value={userForm.password}
                              onChange={handleUserInputChange}
                              required
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                              placeholder="••••••••"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label
                            htmlFor="phone"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            id="phone"
                            value={userForm.phone}
                            onChange={handleUserInputChange}
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                            placeholder="+91 00000 00000"
                          />
                        </div>

                        {isEditing && (
                          <div className="space-y-1">
                            <label
                              htmlFor="employee_id"
                              className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                            >
                              Employee ID
                            </label>
                            <input
                              type="text"
                              name="employee_id"
                              id="employee_id"
                              value={userForm.employee_id}
                              readOnly
                              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 cursor-not-allowed outline-none text-sm font-medium"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label
                            htmlFor="role"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            User Role
                          </label>
                          <select
                            id="role"
                            name="role"
                            value={userForm.role}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                          >
                            <option value="admin">Admin</option>
                            <option value="HOD">HOD</option>
                            <option value="user">User</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="reported_by"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            Reported To (Supervisor)
                          </label>
                          <select
                            id="reported_by"
                            name="reported_by"
                            value={userForm.reported_by}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                          >
                            <option value="">
                              No Supervisor (Direct Admin)
                            </option>
                            {userData &&
                              userData.length > 0 &&
                              userData
                                .filter(
                                  (u) =>
                                    u &&
                                    u.user_name &&
                                    u.user_name !== userForm.username &&
                                    u.user_name !== "admin",
                                )
                                .map((u, i) => (
                                  <option key={i} value={u.user_name}>
                                    {u.user_name}
                                  </option>
                                ))}
                          </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                           <label
                             htmlFor="division"
                             className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                           >
                             Division
                           </label>
                           <select
                             id="division"
                             name="division"
                             value={userForm.division || ""}
                             onChange={(e) => {
                               handleUserInputChange(e);
                               setUserForm((prev) => ({ ...prev, department: "" }));
                             }}
                             className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-950 dark:text-white transition-all text-sm font-medium"
                           >
                             <option value="">Choose a division...</option>
                             {divisions.map((div) => (
                               <option key={div.id} value={div.name}>
                                 {div.name}
                               </option>
                             ))}
                           </select>
                         </div>

                         <div className="space-y-1 md:col-span-2">
                           <label
                             htmlFor="department"
                             className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                           >
                             Department Assigned
                           </label>
                           <select
                             id="department"
                             name="department"
                             value={userForm.department}
                             onChange={handleUserInputChange}
                             className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-950 dark:text-white transition-all text-sm font-medium"
                           >
                             <option value="">Choose a department...</option>
                             {department && department.length > 0
                               ? department
                                   .filter((dept) => {
                                     const deptDiv = dept.division || "";
                                     const selectedDiv = userForm.division || "";
                                     if (!selectedDiv) return true;
                                     return deptDiv.toLowerCase().trim() === selectedDiv.toLowerCase().trim();
                                   })
                                   .map((dept) => dept.department)
                                   .filter((v, i, self) => self.indexOf(v) === i)
                                   .filter(Boolean)
                                   .map((deptName, index) => (
                                     <option key={index} value={deptName}>
                                       {deptName}
                                     </option>
                                   ))
                               : null}
                           </select>
                         </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="Designation"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            Designation
                          </label>
                          <input
                            type="text"
                            name="Designation"
                            id="Designation"
                            value={userForm.Designation}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                            placeholder="e.g. Senior Technician..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="day_off"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            Day Off
                          </label>
                          <select
                            id="day_off"
                            name="day_off"
                            value={userForm.day_off || ""}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                          >
                            <option value="">None (No Day Off)</option>
                            <option value="sunday">Sunday</option>
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                          </select>
                        </div>

                        {isEditing && (
                          <div className="space-y-1">
                            <label
                              htmlFor="status"
                              className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                            >
                              User Status
                            </label>
                            <select
                              id="status"
                              name="status"
                              value={userForm.status}
                              onChange={handleUserInputChange}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="on_leave">On Leave</option>
                            </select>
                          </div>
                        )}

                        <div className="space-y-1 md:col-span-2">
                          <label
                            htmlFor="location"
                            className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1"
                          >
                            Restricted Storage Location
                          </label>
                          <select
                            id="location"
                            name="location"
                            value={userForm.location}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-950 dark:text-white transition-all text-sm font-medium cursor-pointer"
                          >
                            <option value="">
                              All / Unrestricted Location
                            </option>
                            {locations.map((loc, idx) => (
                              <option key={idx} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 p-4 rounded-2xl border border-blue-100/50 dark:border-slate-700/50 flex items-center justify-between group transition-all">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-slate-700">
                            <User size={16} strokeWidth={2.5} />
                          </div>
                          <div className="text-left">
                            <h4 className="text-xs font-black text-blue-900 dark:text-white uppercase tracking-widest mb-0.5">
                              Self-Assign
                            </h4>
                            <p className="text-[9px] text-gray-400 font-bold max-w-[180px]">
                              Assign tasks to themselves
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-100">
                          <input
                            type="checkbox"
                            name="can_self_assign"
                            checked={userForm.can_self_assign}
                            onChange={(e) =>
                              setUserForm((prev) => ({
                                ...prev,
                                can_self_assign: e.target.checked,
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  )}

                  {modalTab === "permissions" && (
                    <div className="space-y-6 animate-in fade-in duration-200 text-left">
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          Page Level Permissions
                        </h4>
                        <p className="text-xs text-gray-450 dark:text-slate-450 mt-1 font-semibold leading-relaxed">
                          Define custom page/module routing clearance. Disabled
                          routes will be hidden from user's side navigation bar
                          and blocked directly.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Checklist Column */}
                        <div className="space-y-3 flex flex-col">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800/80">
                            <Building
                              size={16}
                              className="text-blue-600 dark:text-blue-400"
                            />
                            <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                              Checklist & Delegation System
                            </h5>
                          </div>
                          <div className="space-y-2 overflow-y-auto pr-1 max-h-[350px] p-2 rounded-2xl bg-gray-50/50 dark:bg-slate-950/30 border border-gray-150 dark:border-slate-800/60">
                            {SYSTEM_PAGES.checklist.pages.map((page) => {
                              const allowed = userForm.page_access
                                ? userForm.page_access
                                    .split(",")
                                    .map((p) => p.trim())
                                : [];
                              const isChecked = allowed.includes(page.id);
                              return (
                                <label
                                  key={page.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? "bg-blue-50/40 border-blue-200/70 dark:bg-blue-950/10 dark:border-blue-900/40"
                                      : "bg-white border-gray-150 dark:bg-slate-900 dark:border-slate-800/80 hover:bg-gray-50/40 dark:hover:bg-slate-850/20"
                                  }`}
                                >
                                  <div className="text-left pr-2">
                                    <div
                                      className={`text-xs font-bold ${isChecked ? "text-blue-800 dark:text-blue-300" : "text-gray-700 dark:text-slate-300"}`}
                                    >
                                      {page.label}
                                    </div>
                                    <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                                      {page.route}
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let nextPages = [...allowed];
                                      if (e.target.checked) {
                                        if (!nextPages.includes(page.id)) {
                                          nextPages.push(page.id);
                                        }
                                      } else {
                                        nextPages = nextPages.filter(
                                          (p) => p !== page.id,
                                        );
                                      }
                                      setUserForm((prev) => ({
                                        ...prev,
                                        page_access: nextPages.join(","),
                                      }));
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Inventory Column */}
                        <div className="space-y-3 flex flex-col">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800/80">
                            <Settings
                              size={16}
                              className="text-blue-600 dark:text-blue-400"
                            />
                            <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                              Inventory System
                            </h5>
                          </div>
                          <div className="space-y-2 overflow-y-auto pr-1 max-h-[350px] p-2 rounded-2xl bg-gray-50/50 dark:bg-slate-950/30 border border-gray-150 dark:border-slate-800/60">
                            {SYSTEM_PAGES.inventory.pages.map((page) => {
                              const allowed = userForm.page_access
                                ? userForm.page_access
                                    .split(",")
                                    .map((p) => p.trim())
                                : [];
                              const isChecked = allowed.includes(page.id);
                              return (
                                <label
                                  key={page.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? "bg-blue-50/40 border-blue-200/70 dark:bg-blue-950/10 dark:border-blue-900/40"
                                      : "bg-white border-gray-150 dark:bg-slate-900 dark:border-slate-800/80 hover:bg-gray-50/40 dark:hover:bg-slate-850/20"
                                  }`}
                                >
                                  <div className="text-left pr-2">
                                    <div
                                      className={`text-xs font-bold ${isChecked ? "text-blue-800 dark:text-blue-300" : "text-gray-700 dark:text-slate-300"}`}
                                    >
                                      {page.label}
                                    </div>
                                    <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                                      {page.route}
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let nextPages = [...allowed];
                                      if (e.target.checked) {
                                        if (!nextPages.includes(page.id)) {
                                          nextPages.push(page.id);
                                        }
                                      } else {
                                        nextPages = nextPages.filter(
                                          (p) => p !== page.id,
                                        );
                                      }
                                      setUserForm((prev) => ({
                                        ...prev,
                                        page_access: nextPages.join(","),
                                      }));
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-800 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="px-8 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 dark:hover:text-slate-300 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-10 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-black rounded-2xl hover:from-indigo-700 hover:to-blue-700 shadow-md transition-all cursor-pointer flex items-center gap-2 uppercase tracking-widest"
                    >
                      <Save size={16} strokeWidth={3} />
                      {isEditing ? "Save Changes" : "Create User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- DELETION CONFIRM DIALOG --- */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-gray-150 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Trash2 size={28} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    Delete User Profile?
                  </h3>
                  <p className="text-xs text-gray-450 dark:text-slate-450 leading-relaxed font-semibold">
                    Are you sure you want to terminate{" "}
                    <strong>{userToDeleteData.name}</strong>? This action will
                    permanently purge this profile and delete all checklist,
                    delegation, repair, and maintenance tasks assigned to them.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    disabled={isDeleting}
                    onClick={confirmDeleteUserAndTasks}
                    className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Confirm Termination"}
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 dark:hover:text-slate-350 transition-colors cursor-pointer"
                  >
                    Keep Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
