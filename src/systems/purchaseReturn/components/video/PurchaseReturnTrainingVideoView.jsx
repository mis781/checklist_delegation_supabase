import {
  Play,
  Video,
  Info,
  RotateCcw,
  CheckCircle2,
  FileText,
  Truck,
  CreditCard,
  Package,
  AlertCircle
} from "lucide-react";

export default function PurchaseReturnTrainingVideoView() {
  // Dedicated Video URL for Purchase Return System (ReturnTrack)
  const RAW_VIDEO_URL = "https://www.youtube.com/embed/080vqiyNkVg";

  const getEmbedUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (trimmed.includes("/embed/")) return trimmed;
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch && shortMatch[1]) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    return trimmed;
  };

  const embedUrl = getEmbedUrl(RAW_VIDEO_URL);

  const stages = [
    {
      num: "01",
      title: "Return Approval",
      icon: CheckCircle2,
      color: "amber",
      desc: "Verify damaged or rejected material reported from plant/QA. Authorize return type, action (Credit Note / Replacement), and approve the request."
    },
    {
      num: "02",
      title: "Ask Credit Note",
      icon: FileText,
      color: "purple",
      desc: "Coordinate with supplier accounts to secure formal Credit Note or credit confirmation before dispatching physical goods."
    },
    {
      num: "03",
      title: "Arrange Logistics",
      icon: Truck,
      color: "blue",
      desc: "Approve transport charges, assign transporter & vehicle, record Bilty / LR number, and specify freight payment responsibility (Paid By NuTech / Supplier)."
    },
    {
      num: "04",
      title: "Issue Debit Note",
      icon: CreditCard,
      color: "emerald",
      desc: "Generate and record company Debit Note number and value in accounting, then formally notify supplier accounts with document copies."
    },
    {
      num: "05",
      title: "Return From Plant",
      icon: Package,
      color: "rose",
      desc: "Confirm physical gate dispatch from plant premises, verify vehicle loading, upload dispatch photo proof, and complete the reverse-logistics cycle."
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-2 sm:p-4">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200/50 dark:border-blue-800/50 shrink-0">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              Purchase Return <span className="text-blue-600 dark:text-blue-400">Training Videos</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                ReturnTrack
              </span>
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold">
              Master the end-to-end reverse-logistics, vendor settlements, and debit note workflow
            </p>
          </div>
        </div>
      </div>

      {/* Video Player Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-blue-100/50 dark:shadow-none overflow-hidden border border-blue-100 dark:border-slate-800">
        <div className="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 p-4 sm:p-5 border-b border-blue-100/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400 shrink-0" />
              Purchase Return System Walkthrough
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 font-medium">
              Step-by-step tutorial covering rejection verification, credit notes, transporter booking, and gate dispatch.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>5 Workflow Stages</span>
          </div>
        </div>

        <div className="p-3 sm:p-6 bg-gray-50/50 dark:bg-slate-950/40">
          {embedUrl ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-slate-800 bg-black">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={embedUrl}
                title="Purchase Return Training Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-inner border-2 border-dashed border-blue-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center mb-4 shadow-xl backdrop-blur-xs">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 fill-blue-400 ml-1" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-white mb-2">
                Training Video Link Awaited
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mb-4">
                The training video player is configured and ready. Once you provide the video URL, the video will play seamlessly here.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Ready for YouTube / MP4 / Cloud URL</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5-Stage Reverse Logistics Workflow */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-blue-100/30 dark:shadow-none p-5 sm:p-6 border border-blue-50 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Standard 5-Stage Reverse Logistics Pipeline
          </h3>
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Standard Operating Procedure</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          {stages.map((stg) => {
            const Icon = stg.icon;
            return (
              <div
                key={stg.num}
                className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">
                      Stage {stg.num}
                    </span>
                    <Icon className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                    {stg.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-snug">
                    {stg.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Tips & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-blue-100/30 dark:shadow-none p-5 sm:p-6 border border-blue-50 dark:border-slate-800">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Crucial Guidelines for Purchase Returns
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                1
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-snug">
                <b>Photo Proof Required:</b> Always ensure damaged or defective goods have clear visual attachments before approving a return request.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                2
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-snug">
                <b>Credit Note Priority:</b> Secure vendor confirmation or Credit Note in Stage 2 prior to arranging transporter dispatch.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                3
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-snug">
                <b>Transport Terms:</b> Explicitly verify whether freight is <i>Paid By NuTech</i> or <i>Paid By Supplier</i> before generating bilty.
              </p>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-850 border border-blue-100/50 dark:border-slate-800 transition-all hover:bg-blue-50 dark:hover:bg-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                4
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-snug">
                <b>Gate Pass &amp; Loading:</b> Finalize Stage 5 by uploading loading photos and gate-out timestamp to maintain legal audit trail.
              </p>
            </li>
          </ul>
        </div>

        {/* Support Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between border border-blue-500/20">
          <div>
            <h4 className="text-lg font-black mb-2 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-200" />
              ReturnTrack Support
            </h4>
            <p className="text-blue-100 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
              Need assistance with supplier rejections, credit note discrepancies, or logistics bilty verification? Contact procurement team.
            </p>
          </div>
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-xs">
              <span className="text-blue-200 block text-[10px] font-bold uppercase">System Reference</span>
              <span className="font-semibold">ReturnTrack v2.4 • Module PR-01</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
