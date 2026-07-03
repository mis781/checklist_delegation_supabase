import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
  Building2,
  CheckCircle2,
  Plus,
  Boxes,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import supabase from "../../../../SupabaseClient";

export default function PortalDashboard() {
  const [userInfo, setUserInfo] = useState({
    username: localStorage.getItem("user-name") || "Admin User",
    role: (localStorage.getItem("role") || "admin").toUpperCase(),
    email:
      localStorage.getItem("email_id") ||
      localStorage.getItem("email") ||
      "Not provided",
    phone:
      localStorage.getItem("phone") ||
      localStorage.getItem("contact") ||
      localStorage.getItem("number") ||
      "Not provided",
    profileImage: localStorage.getItem("profile_image") || "",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      const storedUsername = localStorage.getItem("user-name");
      const storedUserId = localStorage.getItem("user-id");
      const storedEmail = localStorage.getItem("email_id");

      if (!storedUsername && !storedUserId && !storedEmail) return;

      try {
        let query = supabase.from("users").select("*");
        if (storedUserId) {
          query = query.eq("id", storedUserId);
        } else if (storedUsername) {
          query = query.eq("user_name", storedUsername);
        } else if (storedEmail) {
          query = query.eq("email_id", storedEmail);
        }

        const { data, error } = await query.maybeSingle();

        if (data && !error) {
          const fetchedEmail = data.email_id || data.email || userInfo.email;
          const fetchedPhone =
            data.number || data.phone || data.mobile || userInfo.phone;
          const fetchedRole = (data.role || userInfo.role).toUpperCase();
          const fetchedUsername =
            data.user_name || data.username || userInfo.username;
          const fetchedImg = data.profile_image || userInfo.profileImage;

          setUserInfo({
            username: fetchedUsername,
            role: fetchedRole,
            email: fetchedEmail,
            phone: fetchedPhone,
            profileImage: fetchedImg,
          });

          // Sync back to localStorage for seamless persistence
          localStorage.setItem("user-name", fetchedUsername);
          if (data.email_id || data.email)
            localStorage.setItem("email_id", data.email_id || data.email);
          if (data.number || data.phone || data.mobile) {
            const num = data.number || data.phone || data.mobile;
            localStorage.setItem("phone", num);
            localStorage.setItem("contact", num);
          }
          if (data.role) localStorage.setItem("role", data.role);
          if (data.profile_image)
            localStorage.setItem("profile_image", data.profile_image);
        }
      } catch (err) {
        console.error("Error fetching user profile in PortalDashboard:", err);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 theme-transition">
        {/* --- Header Banner --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                <Layers size={28} />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                Portal{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  Dashboard
                </span>
              </h1>
            </div>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-sm md:text-base">
              Unified enterprise ecosystem for authorized system modules and
              user profile management.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-blue-900/50 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck
              size={18}
              className="text-blue-600 dark:text-blue-400"
            />
            <span>Authenticated Portal Access</span>
          </div>
        </div>

        {/* --- User Profile Section (Grid Card Format) --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User size={22} className="text-blue-600 dark:text-blue-400" />
            <span>User Profile Overview</span>
          </h2>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800/80 p-6 md:p-8 shadow-sm hover:shadow-md transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* User Avatar & Identity (Column 1-4) */}
              <div className="lg:col-span-4 flex flex-col items-center text-center lg:border-r border-gray-100 dark:border-slate-800 lg:pr-8">
                <div className="relative mb-4">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden border-4 border-blue-500/20 dark:border-blue-500/40 shadow-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-3xl">
                    {userInfo.profileImage ? (
                      <img
                        src={userInfo.profileImage}
                        alt={userInfo.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      userInfo.username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white"
                    title="Active Account"
                  >
                    <CheckCircle2 size={12} strokeWidth={3} />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                  {userInfo.username}
                </h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                  <Sparkles size={12} />
                  <span>{userInfo.role} ROLE</span>
                </div>
              </div>

              {/* Contact & Systems Grid (Column 5-12) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {/* Email Info Card */}
                <div className="bg-gray-50 dark:bg-slate-950 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-slate-800/60 flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Mail size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-1">
                      Email Address
                    </p>
                    <p
                      className="text-sm font-semibold text-gray-900 dark:text-white truncate"
                      title={userInfo.email}
                    >
                      {userInfo.email}
                    </p>
                  </div>
                </div>

                {/* Contact Number Card */}
                <div className="bg-gray-50 dark:bg-slate-950 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-slate-800/60 flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Phone size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-1">
                      Contact Number
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {userInfo.phone}
                    </p>
                  </div>
                </div>

                {/* Permissioned Logic Summary */}
                <div className="sm:col-span-2 bg-blue-50/50 dark:bg-slate-950/80 p-4 md:p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-start gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                      Permissioned System Logic
                    </p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 leading-relaxed mb-3">
                      Your account holds active administrative clearance. System
                      access control rules automatically grant full permissions
                      to operational modules below.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold">
                        ✓ Checklist & Delegation System
                      </span>
                      <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 rounded-lg text-xs font-bold">
                        + Multi-Module Ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- System Modules Grid --- */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2
                  size={22}
                  className="text-blue-600 dark:text-blue-400"
                />
                <span>Authorized System Modules</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
                Launch operational applications enabled for your profile.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active Module: Checklist System */}
            <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-blue-500/30 dark:border-blue-500/40 p-6 md:p-7 shadow-lg shadow-blue-500/5 hover:shadow-blue-500/15 hover:border-blue-600 dark:hover:border-blue-400 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList size={28} />
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active System
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Checklist & Delegation Module
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-6">
                  Manage operational checklists, recurring task assignments,
                  team delegation trackers, and automated validation routines.
                </p>
              </div>

              <Link
                to="/dashboard/admin"
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <span>Launch Module</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Active Module: Inventory Management System */}
            <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-500/30 dark:border-indigo-500/40 p-6 md:p-7 shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/15 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-650 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Boxes size={28} />
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active System
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Inventory Management Module
                </h3>
                <p className="text-sm text-gray-650 dark:text-slate-400 leading-relaxed mb-6">
                  Track stock levels, record IN/OUT transactions, manage
                  supplier master lists, compile threshold shortages, and
                  generate purchase indents.
                </p>
              </div>

              <Link
                to="/dashboard/inventory"
                className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
              >
                <span>Launch IMS Module</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Upcoming System Module Card 2 */}
            <div className="bg-gray-50/70 dark:bg-slate-950/60 rounded-3xl border border-dashed border-gray-300 dark:border-slate-800 p-6 md:p-7 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-900/60 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-blue-200/50 dark:border-slate-700/50">
                    <Plus size={32} strokeWidth={2.5} />
                  </div>
                  <span className="px-3 py-1 bg-gray-200/80 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={12} />
                    Upcoming Module
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-800 dark:text-slate-200 mb-2">
                  Upcoming System Module
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-6">
                  Next-generation management tools will be configured and
                  deployed here according to your organization's system
                  expansion roadmap.
                </p>
              </div>

              <button
                disabled
                className="w-full py-3 px-6 bg-gray-200/60 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Module Under Development</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
