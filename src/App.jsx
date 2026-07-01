

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"

// --- Page Imports ---
import LoginPage from "./systems/checklist/pages/LoginPage"
import AdminDashboard from "./systems/checklist/pages/admin/Dashboard"
import PortalDashboard from "./systems/checklist/pages/admin/PortalDashboard"
import AdminAssignTask from "./systems/checklist/pages/admin/AssignTask"
import ChecklistTask from "./systems/checklist/pages/admin/ChecklistTask"     // New
import MaintenanceTask from "./systems/checklist/pages/admin/MaintenanceTask" // New
import RepairTask from "./systems/checklist/pages/admin/RepairTask"           // New
import EATask from "./systems/checklist/pages/admin/EATask"                   // New
import CalendarPage from "./systems/checklist/pages/admin/CalendarPage"       // New
import QuickTask from "./systems/checklist/pages/QuickTask"
import Demo from "./systems/checklist/pages/user/Demo"
import Setting from "./systems/checklist/pages/Setting"
import MisReport from "./systems/checklist/pages/MisReport"

// --- Data & Delegation Imports ---
import DataPage from "./systems/checklist/pages/admin/DataPage"
import AdminDataPage from "./systems/checklist/pages/admin/admin-data-page"
import AccountDataPage from "./systems/checklist/pages/delegation"
import AdminDelegationTask from "./systems/checklist/pages/delegation-data"
import AllTasks from "./systems/checklist/pages/admin/AllTasks"
import HolidayListPage from "./systems/checklist/pages/admin/HolidayListPage"         // New
import WorkingDayCalendarPage from "./systems/checklist/pages/admin/WorkingDayCalendarPage" // New
import AdminApprovalPage from "./systems/checklist/pages/admin/AdminApprovalPage" // New
import NotificationsPage from "./systems/checklist/pages/admin/Notifications"
import TrainingVideo from "./systems/checklist/pages/admin/TrainingVideo"

// --- Components ---
import RealtimeLogoutListener from "./systems/checklist/components/RealtimeLogoutListener"
import { MagicToastProvider } from "./context/MagicToastContext"
import { ThemeProvider } from "./context/ThemeContext"

// --- Auth Wrapper ---
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const username = (localStorage.getItem("user-name") || "").toLowerCase();
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const canSelfAssign = localStorage.getItem("can_self_assign") === "true";

    if (!username) {
        return <Navigate to="/login" replace />
    }

    let isAllowed = allowedRoles.length === 0 || allowedRoles.map(r => r.toLowerCase()).includes(role);

    // Special exemption: allow user role if they have self assignment rights
    if (!isAllowed && role === "user" && canSelfAssign) {
        if (allowedRoles.map(r => r.toLowerCase()).includes("hod")) {
            isAllowed = true;
        }
    }

    if (!isAllowed) {
        return <Navigate to="/dashboard/portal" replace />
    }

    return children
}

const SuperAdminRoute = ({ children }) => {
    const username = (localStorage.getItem("user-name") || "").toLowerCase();
    const role = (localStorage.getItem("role") || "").toLowerCase();

    if (!username || username !== "admin" || role !== "admin") {
        return <Navigate to="/dashboard/portal" replace />
    }

    return children
}

function App() {
    return (
        <ThemeProvider>
            <MagicToastProvider>
                <Router>
                {/* Realtime listener handles logout logic across tabs */}
                <RealtimeLogoutListener />

                <Routes>
                    {/* --- Public Routes --- */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* --- Main Dashboard Redirect --- */}
                    {/* Redirects /dashboard to /dashboard/portal as canonical default view */}
                    <Route path="/dashboard" element={<Navigate to="/dashboard/portal" replace />} />

                    {/* --- Core Dashboard Routes --- */}
                    <Route
                        path="/dashboard/portal"
                        element={
                            <ProtectedRoute>
                                <PortalDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/admin"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/demo"
                        element={
                            <ProtectedRoute>
                                <Demo />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Task Management (Admin Only) --- */}
                    <Route
                        path="/dashboard/assign-task"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminAssignTask />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Operational Tasks (All Authenticated Users) --- */}
                    {/* Based on snippet 2, these are open to all users. Add allowedRoles={['admin']} if they should be restricted. */}
                    <Route
                        path="/dashboard/quick-task"
                        element={
                            <ProtectedRoute>
                                <QuickTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/checklist"
                        element={
                            <ProtectedRoute>
                                <ChecklistTask />
                            </ProtectedRoute>
                        }
                    />
                    {/*
                    <Route
                        path="/dashboard/maintenance"
                        element={
                            <ProtectedRoute>
                                <MaintenanceTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/repair"
                        element={
                            <ProtectedRoute>
                                <RepairTask />
                            </ProtectedRoute>
                        }
                    />
                    */}
                    <Route
                        path="/dashboard/ea-task"
                        element={
                            <ProtectedRoute>
                                <EATask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/calendar"
                        element={
                            <ProtectedRoute>
                                <CalendarPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/task"
                        element={
                            <ProtectedRoute>
                                <AllTasks />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/holiday-list"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <HolidayListPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/working-day-calendar"
                        element={
                            <ProtectedRoute>
                                <WorkingDayCalendarPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Data & Reporting (Admin Only) --- */}
                    <Route
                        path="/dashboard/data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <DataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/data/:category"
                        element={
                            <ProtectedRoute>
                                <DataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/admin-data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminDataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/delegation"
                        element={
                            <ProtectedRoute>
                                <AccountDataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/delegation-data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminDelegationTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/admin-approval"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "HOD"]}>
                                <AdminApprovalPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-report"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisReport />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/notifications"
                        element={
                            <ProtectedRoute>
                                <NotificationsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/training-video"
                        element={
                            <ProtectedRoute>
                                <TrainingVideo />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Settings (Admin Only) --- */}
                    <Route
                        path="/dashboard/setting"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <Setting />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Backward Compatibility Redirects (From Snippet 1) --- */}
                    {/* These catch old URLs and forward them to the new structure */}
                    <Route path="/admin/*" element={<Navigate to="/dashboard/portal" replace />} />
                    <Route path="/admin/dashboard" element={<Navigate to="/dashboard/portal" replace />} />
                    <Route path="/admin/quick" element={<Navigate to="/dashboard/quick-task" replace />} />
                    <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />
                    <Route path="/admin/delegation-task" element={<Navigate to="/dashboard/delegation-data" replace />} />
                    <Route path="/admin/mis-report" element={<Navigate to="/dashboard/mis-report" replace />} />
                    <Route path="/user/*" element={<Navigate to="/dashboard/portal" replace />} />

                </Routes>
            </Router>
            </MagicToastProvider>
        </ThemeProvider>
    )
}

export default App