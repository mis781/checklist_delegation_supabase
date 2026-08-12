import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Compass,
  Smartphone,
  Globe,
  Navigation,
  HelpCircle,
} from "lucide-react";
import { getBrowserGps, reverseGeocode } from "../utils/imageLocation";

/**
 * LocationPermissionModal
 * Interactive Modal that checks browser geolocation status, prompts for permission,
 * tests GPS access, and provides step-by-step unblocking instructions for Chrome, Safari, Android & Edge.
 */
export default function LocationPermissionModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [permissionState, setPermissionState] = useState("prompt"); // 'granted', 'denied', 'prompt', 'checking'
  const [isRequesting, setIsRequesting] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chrome"); // 'chrome', 'safari_ios', 'android', 'edge'

  // Check permission state via Permissions API if available
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
      setPermissionState("prompt");
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setPermissionState(result.state); // 'granted', 'denied', or 'prompt'

      result.onchange = () => {
        setPermissionState(result.state);
        if (result.state === "granted") {
          testLocationAccess();
        }
      };
    } catch (e) {
      setPermissionState("prompt");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkPermission();
    }
  }, [isOpen, checkPermission]);

  // Detect user agent for smart default tab selection
  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setActiveTab("safari_ios");
    } else if (/Android/i.test(ua)) {
      setActiveTab("android");
    } else if (/Edg/i.test(ua)) {
      setActiveTab("edge");
    } else {
      setActiveTab("chrome");
    }
  }, []);

  const testLocationAccess = async () => {
    setIsRequesting(true);
    setErrorMessage("");
    try {
      const coords = await getBrowserGps();
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      const data = { ...coords, address: addr };
      setLocationData(data);
      setPermissionState("granted");
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error("Location test error:", err);
      setPermissionState("denied");
      setErrorMessage(
        err.message ||
          "Location access is blocked by browser settings. Please follow the instructions below to enable it.",
      );
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-4 sm:py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Compass className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Enable Location Access
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                GPS Location required / लोकेशन अनुमति आवश्यक है
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Permission Status Banner */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 transition-all ${
              permissionState === "granted"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : permissionState === "denied"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {permissionState === "granted" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : permissionState === "denied" ? (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold uppercase tracking-wider text-[11px]">
                  Status:{" "}
                  {permissionState === "granted"
                    ? "Allowed ✅ / चालू है"
                    : permissionState === "denied"
                      ? "Blocked ❌ / ब्लॉक है"
                      : "Permission Required ⚠️ / अनुमति आवश्यक"}
                </span>
              </div>
              <p className="leading-relaxed">
                {permissionState === "granted"
                  ? "GPS location access is enabled. / लोकेशन अनुमति चालू है।"
                  : permissionState === "denied"
                    ? "Location is blocked in browser settings. Unblock using steps below. / ब्राउज़र में लोकेशन ब्लॉक है। नीचे दिए गए स्टेप्स से अनब्लॉक करें।"
                    : "Click 'Allow' when prompted by your browser. / ब्राउज़र पॉपअप में 'Allow' चुनें।"}
              </p>
            </div>
          </div>

          {/* Location Data Test Result */}
          {locationData && permissionState === "granted" && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-900">
              <div className="flex items-center gap-2 font-bold text-blue-800">
                <MapPin size={14} className="text-blue-600" />
                <span>Current Location / वर्तमान लोकेशन:</span>
              </div>
              <p className="font-semibold text-gray-800 pl-5">
                {locationData.address}
              </p>
              <div className="pl-5 text-[11px] text-gray-500 flex gap-3">
                <span>Lat: {locationData.latitude.toFixed(5)}</span>
                <span>Lng: {locationData.longitude.toFixed(5)}</span>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="space-y-2.5">
            <button
              onClick={testLocationAccess}
              disabled={isRequesting}
              className={`w-full py-3 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 ${
                permissionState === "denied"
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-200"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking Location... / जाँच जारी है...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>
                    {permissionState === "granted"
                      ? "Re-verify Location / दोबारा जाँच करें"
                      : permissionState === "denied"
                        ? "Check Permission Again (After Unblocking 🔒)"
                        : "Allow / Request Location Access"}
                  </span>
                </>
              )}
            </button>

            {permissionState === "denied" && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-medium leading-relaxed space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <span>💡 Popup Not Showing? / पॉपअप क्यों नहीं दिख रहा?</span>
                </p>
                <p className="text-[10px] sm:text-[11px]">
                  Once blocked, browsers won't re-show the popup. Set Location to <strong>Allow</strong> via the 🔒 icon in address bar, then click check button.
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-600">
                  (ब्लॉक होने पर ब्राउज़र दोबारा पॉपअप नहीं दिखाता। ऊपर एड्रेस बार में 🔒 आइकॉन से <strong>Allow</strong> करें, फिर बटन दबाएं।)
                </p>
              </div>
            )}

            {errorMessage && (
              <p className="text-[11px] font-semibold text-rose-600 text-center">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Browser Unblock Guide */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              <HelpCircle size={14} className="text-blue-600" />
              <span>Unblock Steps / ब्लॉक कैसे हटाएं:</span>
            </div>

            {/* Browser Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-600 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("chrome")}
                className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === "chrome"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <Globe size={12} /> Chrome
              </button>
              <button
                onClick={() => setActiveTab("safari_ios")}
                className={`flex-1 min-w-[85px] py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === "safari_ios"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <Smartphone size={12} /> iPhone
              </button>
              <button
                onClick={() => setActiveTab("android")}
                className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === "android"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <Smartphone size={12} /> Android
              </button>
              <button
                onClick={() => setActiveTab("edge")}
                className={`flex-1 min-w-[65px] py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === "edge"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <Globe size={12} /> Edge
              </button>
            </div>

            {/* Tab Instructions Content (Bilingual EN + HI) */}
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-2">
              {activeTab === "chrome" && (
                <ol className="list-decimal pl-4 space-y-2 font-medium leading-normal">
                  <li>
                    <span>Click Padlock 🔒 / Tune 🎛️ icon near web URL bar.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(वेबसाइट URL के पास 🔒 या 🎛️ आइकॉन दबाएं)</span>
                  </li>
                  <li>
                    <span>Set <strong>Location</strong> to <strong>Allow</strong>.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(Location ऑप्शन में <strong>Allow</strong> चुनें)</span>
                  </li>
                  <li>
                    <span>If hidden: <strong>Site settings</strong> &rarr; Location &rarr; <strong>Allow</strong>.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(ऑप्शन न दिखे तो Site settings $\to$ Location $\to$ Allow करें)</span>
                  </li>
                  <li>
                    <span>Refresh page & click check button.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(पेज रिफ्रेश करें और ऊपर चेक बटन दबाएं)</span>
                  </li>
                </ol>
              )}

              {activeTab === "safari_ios" && (
                <ol className="list-decimal pl-4 space-y-2 font-medium leading-normal">
                  <li>
                    <span>Open iPhone <strong>Settings ⚙️</strong> &rarr; <strong>Privacy & Security</strong> &rarr; <strong>Location Services (ON)</strong>.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(iPhone सेटिंग्स ⚙️ $\to$ Privacy & Security $\to$ Location Services चालू करें)</span>
                  </li>
                  <li>
                    <span>Tap <strong>Safari Websites</strong> &rarr; select <strong>"While Using App"</strong>.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(Safari Websites खोलें और "While Using App" चुनें)</span>
                  </li>
                  <li>
                    <span>Return to Safari & refresh webpage.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(सफारी में वापस आएं और पेज रिफ्रेश करें)</span>
                  </li>
                </ol>
              )}

              {activeTab === "android" && (
                <ol className="list-decimal pl-4 space-y-2 font-medium leading-normal">
                  <li>
                    <span>Tap Lock 🔒 / Tune icon near web address URL.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(URL के पास 🔒 या 🎛️ आइकॉन दबाएं)</span>
                  </li>
                  <li>
                    <span>Tap <strong>Permissions</strong> &rarr; <strong>Location</strong> &rarr; <strong>Allow</strong>.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(Permissions $\to$ Location $\to$ Allow चुनकर चालू करें)</span>
                  </li>
                  <li>
                    <span>Ensure phone Location/GPS is ON in Android quick settings.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(फोन का GPS/Location क्विक सेटिंग्स से चालू रखें)</span>
                  </li>
                </ol>
              )}

              {activeTab === "edge" && (
                <ol className="list-decimal pl-4 space-y-2 font-medium leading-normal">
                  <li>
                    <span>Click Lock 🔒 icon next to web URL.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(URL बार में 🔒 आइकॉन दबाएं)</span>
                  </li>
                  <li>
                    <span>Click <strong>Permissions for this site</strong> &rarr; set Location to <strong>Allow</strong>.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(Permissions for this site $\to$ Location को Allow करें)</span>
                  </li>
                  <li>
                    <span>Refresh page & retry.</span>
                    <br />
                    <span className="text-[11px] text-slate-500">(पेज रिफ्रेश करके दोबारा चेक करें)</span>
                  </li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
