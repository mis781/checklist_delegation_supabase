"use client"
import aceLogo from "../../../assets/nutech.jpeg";

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import supabase from "../../../../SupabaseClient";
import { Home, ClipboardList, CheckSquare, User as UserIcon, LogOut, Menu } from "lucide-react"

import { isAdministrator, isAdminOrSuperAdmin } from "../../../../utils/roleUtils";

const UserLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [profileImage, setProfileImage] = useState("")

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem('user-name')

    if (!storedUsername) {
      navigate('/login')
      return
    }

    setUsername(storedUsername)
    setIsAdmin(isAdminOrSuperAdmin(localStorage.getItem('role'), storedUsername))

    // Initial load from localStorage
    const cachedImage = localStorage.getItem('profile_image');
    setProfileImage(cachedImage || "")

    // Sync with database to get the latest image
    const syncProfileImage = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("profile_image, division")
          .eq("user_name", storedUsername)
          .single();

        if (data) {
          if (data.profile_image) {
            setProfileImage(data.profile_image);
            localStorage.setItem("profile_image", data.profile_image);
            console.log("✅ User profile image synced from DB:", data.profile_image);
          }
          if (data.division !== undefined) {
            localStorage.setItem("division", data.division || "");
          }
        }
      } catch (err) {
        console.error("❌ Error syncing user profile image:", err);
      }
    };

    if (storedUsername) {
      syncProfileImage();
    }

    console.log("UserLayout - Profile Image URL (Cached):", cachedImage);
  }, [navigate, username]) // Added username to dependency to ensure it runs when set

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("user-name");
    localStorage.removeItem('role')
    localStorage.removeItem('email_id')
    localStorage.removeItem('profile_image')
    navigate('/login')
  }

  const routes = isAdmin
    ? [
      { href: "/admin/dashboard", label: "Dashboard", icon: "home" },
      { href: "/admin/assign-task", label: "Assign Task", icon: "check-square" },
      { href: "/admin/tasks", label: "All Tasks", icon: "clipboard-list" },
    ]
    : [
      { href: "/user/dashboard", label: "Dashboard", icon: "home" },
      { href: "/user/tasks", label: "My Tasks", icon: "clipboard-list" },
      { href: "/user/completed-tasks", label: "Completed Tasks", icon: "check-square" },
      { href: "/user/profile", label: "Profile", icon: "user" },
    ]

  const getIcon = (iconName) => {
    switch (iconName) {
      case "home":
        return <Home className="w-4 h-4" />
      case "clipboard-list":
        return <ClipboardList className="w-4 h-4" />
      case "check-square":
        return <CheckSquare className="w-4 h-4" />
      case "user":
        return <UserIcon className="w-4 h-4" />
      default:
        return <Home className="w-4 h-4" />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F8FF] dark:bg-[#070D1F]">
      {/* Sidebar for desktop: deep navy in both themes */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-[#1E2D52] bg-[#0B1B3F] dark:bg-[#070D1F] md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-[#1E2D52] px-4 bg-[#070D1F]/60 dark:bg-[#070D1F]/80">
          <Link
            to={isAdmin ? "/admin/dashboard" : "/user/dashboard"}
            className="flex items-center gap-2 font-bold text-white hover:text-blue-200 transition-colors"
          >
            <img src={aceLogo} alt="TaskDesk Logo" className="h-8 w-8 rounded-full object-cover border border-blue-400/30" />
            <span className="tracking-tight">Master System</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {routes.map((route) => (
              <li key={route.href}>
                <Link
                  to={route.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${location.pathname === route.href
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                >
                  {getIcon(route.icon)}
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-[#1E2D52] p-4 bg-[#070D1F]/70 dark:bg-[#070D1F]/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center overflow-hidden border border-blue-400/30">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={username}
                    className="h-full w-full object-cover"
                    onError={() => {
                      console.error("❌ UserLayout Image Failed:", profileImage);
                      setProfileImage("");
                    }}
                  />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isAdmin ? 'Admin' : 'Staff Member'}
                </p>
                <p className="text-xs text-blue-200/80">
                  {username}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-blue-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-[#070D1F]/70 backdrop-blur-sm md:hidden ${isMobileMenuOpen ? "block" : "hidden"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-full max-h-screen overflow-hidden bg-[#0B1B3F] dark:bg-[#070D1F] border-r border-[#1E2D52] transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-200 ease-in-out md:hidden`}
      >
        <div className="flex h-14 flex-shrink-0 items-center border-b border-[#1E2D52] px-4 bg-[#070D1F]/60 dark:bg-[#070D1F]/80">
          <Link
            to={isAdmin ? "/admin/dashboard" : "/user/dashboard"}
            className="flex items-center gap-2 font-bold text-white hover:text-blue-200 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img src={aceLogo} alt="TaskDesk Logo" className="h-8 w-8 rounded-full object-cover border border-blue-400/30" />
            <span className="tracking-tight">Master System</span>
          </Link>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-2 bg-[#0B1B3F] dark:bg-[#070D1F] overscroll-contain">
          <ul className="space-y-1">
            {routes.map((route) => (
              <li key={route.href}>
                <Link
                  to={route.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${location.pathname === route.href
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {getIcon(route.icon)}
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex-shrink-0 border-t border-[#1E2D52] p-4 bg-[#070D1F]/70 dark:bg-[#070D1F]/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center overflow-hidden border border-blue-400/30">
                {profileImage ? (
                  <img src={profileImage} alt={username} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isAdmin ? 'Admin' : 'Staff Member'}
                </p>
                <p className="text-xs text-blue-200/80">
                  {username}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-blue-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#F5F8FF] dark:bg-[#070D1F]">
        <header className="flex h-14 items-center justify-between border-b border-[#E3EAF8] dark:border-[#1E2D52] bg-white/95 dark:bg-[#0D1730]/95 backdrop-blur-md px-4 md:px-6 shadow-sm">
          <button
            className="md:hidden text-[#0B1B3F] dark:text-[#EAF0FF] p-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-[#142142] transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200">
            {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F5F8FF] dark:bg-[#070D1F]">
          {children}
        </main>

        <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-5 flex items-center justify-center px-4 shadow-md z-40">
          <a
            href="https://www.botivate.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/90 font-medium tracking-[0.2em] uppercase hover:underline hover:text-white transition-colors"
          >
            Powered by <span className="font-bold">Botivate</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default UserLayout