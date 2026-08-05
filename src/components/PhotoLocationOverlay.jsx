import React from "react";
import { MapPin, Clock, Camera, CheckCircle2, Navigation } from "lucide-react";

/**
 * Glassmorphism Location Overlay rendered over Proof Photos in Lightbox / Image Cards.
 * 
 * @param {{
 *   locationMeta?: {
 *     latitude?: number,
 *     longitude?: number,
 *     address?: string,
 *     locationSource?: string,
 *     gpsSource?: string,
 *     capturedAt?: string,
 *     uploadedAt?: string
 *   },
 *   className?: string
 * }} props 
 */
export default function PhotoLocationOverlay({ locationMeta, className = "" }) {
  if (!locationMeta) return null;

  const {
    latitude,
    longitude,
    address,
    locationSource,
    gpsSource,
    capturedAt,
    uploadedAt,
  } = locationMeta;

  const rawDate = capturedAt || uploadedAt;
  let formattedDate = "";
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      formattedDate = "";
    }
  }

  const mapUrl =
    latitude && longitude
      ? `https://maps.google.com/?q=${latitude},${longitude}`
      : null;

  const isCamera = locationSource === "camera";
  const isExif = gpsSource === "exif";
  const sourceLabel = isCamera
    ? "Camera • Live GPS"
    : isExif
      ? "Gallery • GPS from EXIF"
      : "Gallery • Device Location";

  return (
    <div
      className={`absolute bottom-3 left-3 right-3 p-3 sm:p-4 rounded-xl text-white backdrop-blur-md bg-slate-950/75 border border-white/20 shadow-2xl z-20 pointer-events-auto animate-in fade-in zoom-in-95 duration-200 ${className}`}
    >
      <div className="flex flex-col gap-1.5">
        {/* Address Row */}
        {address ? (
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-rose-400 shrink-0" />
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm font-bold text-white hover:text-blue-300 underline decoration-dashed transition-colors truncate flex items-center gap-1"
                title="Open in Google Maps"
              >
                <span>{address}</span>
                <Navigation size={10} className="inline opacity-70" />
              </a>
            ) : (
              <span className="text-xs sm:text-sm font-bold truncate">
                {address}
              </span>
            )}
          </div>
        ) : null}

        {/* Time and Verification Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 border-t border-white/10 text-[11px] text-gray-300 font-medium">
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400 shrink-0" />
              <span>{formattedDate}</span>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
            <Camera size={11} className="shrink-0" />
            <CheckCircle2 size={10} className="shrink-0" />
            <span>{sourceLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
