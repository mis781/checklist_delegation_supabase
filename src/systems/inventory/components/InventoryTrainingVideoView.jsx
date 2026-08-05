"use client";
import React, { useState, useEffect } from "react";
import { Play, Video, Info, Boxes } from "lucide-react";

export default function InventoryTrainingVideoView({ activeUser }) {
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const role = activeUser?.role || localStorage.getItem("role") || "";
    const user = activeUser?.name || localStorage.getItem("user-name") || "";
    setUserRole(role);
    setUsername(user);
  }, [activeUser]);

  // Dedicated Video URL & metadata for Inventory System (same video for all roles)
  const videoConfig = {
    title: "IMS Training Video",
    description:
      "Complete guide on managing inventory stock, transactions, reorder levels, and indent requisitions.",
    url: "https://www.youtube.com/embed/NCtffiW9lpo",
  };

  const currentVideo = videoConfig;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-2 sm:p-4">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl text-indigo-700 dark:text-indigo-400 shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Inventory System <span className="text-indigo-600 dark:text-indigo-400">Training Videos</span>
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold">
              Master the Inventory Management System with step-by-step video guides
            </p>
          </div>
        </div>
      </div>

      {/* Video Player Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-none overflow-hidden border border-indigo-100 dark:border-slate-800">
        <div className="bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 p-5 border-b border-indigo-100/60 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Play className="h-5 w-5 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
            {currentVideo.title}
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 font-medium">
            {currentVideo.description}
          </p>
        </div>

        <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-slate-950/40">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-slate-800 bg-black">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={currentVideo.url}
              title={currentVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      {/* Quick Tips & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-indigo-100/30 dark:shadow-none p-6 border border-indigo-50 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-500" />
            Quick Tips for Inventory Management
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-slate-850 border border-indigo-100/50 dark:border-slate-800 transition-all hover:bg-indigo-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                1
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Watch in <b>Full Screen</b> mode to clearly see inventory SKU numbers and stock transaction flows.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-slate-850 border border-indigo-100/50 dark:border-slate-800 transition-all hover:bg-indigo-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                2
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Learn how to monitor <b>Reorder Management alerts</b> when stock levels fall below safety levels.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-slate-850 border border-indigo-100/50 dark:border-slate-800 transition-all hover:bg-indigo-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                3
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Follow the step-by-step process to raise and approve <b>Indent Requisitions</b> for material requests.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-slate-850 border border-indigo-100/50 dark:border-slate-800 transition-all hover:bg-indigo-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                4
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Pause and <b>Practice Simultaneously</b> in another tab to perform sample stock transactions.
              </p>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 dark:from-indigo-700 dark:to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between border border-indigo-500/20">
          <div>
            <h4 className="text-xl font-black mb-2 flex items-center gap-2">
              <Boxes className="h-6 w-6 text-indigo-200" />
              Need IMS Support?
            </h4>
            <p className="text-indigo-100 dark:text-slate-300 text-sm leading-relaxed mb-6">
              If you have questions about inventory management, stock levels, or indent workflows, contact our support team.
            </p>
          </div>
          <button className="w-full py-3 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-black rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all shadow-lg active:scale-95 uppercase tracking-wider text-xs">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
