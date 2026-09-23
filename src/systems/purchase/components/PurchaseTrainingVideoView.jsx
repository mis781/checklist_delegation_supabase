"use client";
import { Play, Video, Info, ShoppingBag } from "lucide-react";

export default function PurchaseTrainingVideoView() {
  // Dedicated Video URL & metadata for Purchase System
  // User will provide the new video link to replace this URL
  const rawVideoUrl = "https://www.youtube.com/embed/-edEwal84KM";

  // Helper to ensure any YouTube URL (youtu.be or watch?v=) is converted to an embed format
  const getEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch && shortMatch[1]) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    return url;
  };

  const videoConfig = {
    title: "Purchase System Training Video",
    description:
      "Complete guide on end-to-end procurement workflow, indents, RFQ quotations, vendor approvals, PO generation, and delivery tracking.",
    url: getEmbedUrl(rawVideoUrl),
  };

  const currentVideo = videoConfig;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-2 sm:p-4">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Purchase System <span className="text-blue-600 dark:text-blue-400">Training Videos</span>
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold">
              Master the Purchase &amp; Procurement Management System with step-by-step video tutorials
            </p>
          </div>
        </div>
      </div>

      {/* Video Player Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-blue-100/50 dark:shadow-none overflow-hidden border border-blue-100 dark:border-slate-800">
        <div className="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 p-5 border-b border-blue-100/60 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
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
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-blue-100/30 dark:shadow-none p-6 border border-blue-50 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Quick Tips for Purchase Management
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                1
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Watch in <b>Full Screen</b> mode to clearly see vendor quotations, comparison matrices, and PO fields.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                2
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Understand the <b>Indent to PO approval stages</b> and how role delegations maintain seamless sign-offs.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                3
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Learn how to track <b>Vendor Lifting &amp; Transporter follow-ups</b> to prevent shipment delays.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                4
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">
                Master <b>Material Received (GRN) &amp; Tally Billing</b> to ensure accounting and inventory reconciliation.
              </p>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between border border-blue-500/20">
          <div>
            <h4 className="text-xl font-black mb-2 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-blue-200" />
              Need Purchase Support?
            </h4>
            <p className="text-blue-100 dark:text-slate-300 text-sm leading-relaxed mb-6">
              If you have questions about vendor quotations, purchase approvals, or order tracking, reach out to our procurement support team.
            </p>
          </div>
          <button className="w-full py-3 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-black rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 transition-all shadow-lg active:scale-95 uppercase tracking-wider text-xs">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
