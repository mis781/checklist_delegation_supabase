import React from "react";
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
  Plus
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function PortalDashboard() {
  const username = localStorage.getItem("user-name") || "Admin User";
  const userRole = (localStorage.getItem("role") || "admin").toUpperCase();
  const userEmail = localStorage.getItem("email_id") || "admin@taskdesk.com";
  const userPhone = localStorage.getItem("phone") || localStorage.getItem("contact") || "+91 98765 43210";
  const profileImage = localStorage.getItem("profile_image");

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 theme-transition">
        
        {/* --- Header Banner --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-purple-600/10 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                <Layers size={28} />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                Portal <span className="text-purple-600 dark:text-purple-400">Dashboard</span>
              </h1>
            </div>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-sm md:text-base">
              Unified enterprise ecosystem for authorized system modules and user profile management.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-slate-900 border border-purple-100 dark:border-purple-900/50 rounded-xl text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={18} className="text-purple-600 dark:text-purple-400" />
            <span>Authenticated Portal Access</span>
          </div>
        </div>

        {/* --- User Profile Section (Grid Card Format) --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User size={22} className="text-purple-600 dark:text-purple-400" />
            <span>User Profile Overview</span>
          </h2>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800/80 p-6 md:p-8 shadow-sm hover:shadow-md transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* User Avatar & Identity (Column 1-4) */}
              <div className="lg:col-span-4 flex flex-col items-center text-center lg:border-r border-gray-100 dark:border-slate-800 lg:pr-8">
                <div className="relative mb-4">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden border-4 border-purple-500/20 dark:border-purple-500/40 shadow-xl flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-black text-3xl">
                    {profileImage ? (
                      <img src={profileImage} alt={username} className="w-full h-full object-cover" />
                    ) : (
                      username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white" title="Active Account">
                    <CheckCircle2 size={12} strokeWidth={3} />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                  {username}
                </h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                  <Sparkles size={12} />
                  <span>{userRole} ROLE</span>
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
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-1">Email Address</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={userEmail}>
                      {userEmail}
                    </p>
                  </div>
                </div>

                {/* Contact Number Card */}
                <div className="bg-gray-50 dark:bg-slate-950 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-slate-800/60 flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Phone size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-1">Contact Number</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {userPhone}
                    </p>
                  </div>
                </div>

                {/* Permissioned Logic Summary */}
                <div className="sm:col-span-2 bg-purple-50/50 dark:bg-slate-950/80 p-4 md:p-5 rounded-2xl border border-purple-100 dark:border-purple-900/40 flex items-start gap-4">
                  <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/20">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Permissioned System Logic</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 leading-relaxed mb-3">
                      Your account holds active administrative clearance. System access control rules automatically grant full permissions to operational modules below.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold">
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
                <Building2 size={22} className="text-purple-600 dark:text-purple-400" />
                <span>Authorized System Modules</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
                Launch operational applications enabled for your profile.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Active Module: Checklist System */}
            <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-purple-500/30 dark:border-purple-500/40 p-6 md:p-7 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/15 hover:border-purple-600 dark:hover:border-purple-400 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList size={28} />
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active System
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Checklist & Delegation Module
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-6">
                  Manage operational checklists, recurring task assignments, team delegation trackers, and automated validation routines.
                </p>
              </div>

              <Link
                to="/dashboard/admin"
                className="w-full py-3.5 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-500/20 active:scale-95"
              >
                <span>Launch Module</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Upcoming System Module Card 1 */}
            <div className="bg-gray-50/70 dark:bg-slate-950/60 rounded-3xl border border-dashed border-gray-300 dark:border-slate-800 p-6 md:p-7 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-900/60 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-slate-800/80 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center border border-purple-200/50 dark:border-slate-700/50">
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
                  Additional enterprise micro-applications and automated workflows are under active development and will be integrated into your portal.
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

            {/* Upcoming System Module Card 2 */}
            <div className="bg-gray-50/70 dark:bg-slate-950/60 rounded-3xl border border-dashed border-gray-300 dark:border-slate-800 p-6 md:p-7 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-900/60 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-slate-800/80 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center border border-purple-200/50 dark:border-slate-700/50">
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
                  Next-generation management tools will be configured and deployed here according to your organization's system expansion roadmap.
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
