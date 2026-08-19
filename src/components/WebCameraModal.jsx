import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, RefreshCw, X, SwitchCamera, AlertCircle, Upload } from "lucide-react";

/**
 * WebCameraModal
 * In-app HTML5 WebRTC camera modal for capturing proof photos.
 * Avoids launching native OS camera app, which prevents mobile Chrome tab reloads/crashes on low-RAM devices.
 */
export default function WebCameraModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToUpload,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" (rear) or "user" (front)
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  // Stop video stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Start video stream with fallback constraint matching
  const startStream = useCallback(
    async (mode) => {
      stopStream();
      setErrorMessage("");
      setIsStreaming(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Camera access is not supported by your browser. Please use the Upload option.");
        return;
      }

      const attempts = [
        { video: { facingMode: { exact: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { facingMode: mode } },
        { video: true },
      ];

      let stream = null;
      let lastErr = null;

      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (stream) {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e) {
            // video play error
          }
        }
        setIsStreaming(true);
      } else {
        console.error("Camera access failed:", lastErr);
        if (lastErr?.name === "NotAllowedError" || lastErr?.name === "PermissionDeniedError") {
          setErrorMessage("Camera permission denied. Please allow camera access in browser settings.");
        } else {
          setErrorMessage("Failed to start camera. Please try switching cameras or use standard upload.");
        }
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (isOpen) {
      startStream(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startStream, stopStream]);

  // Toggle front/rear camera
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Capture frame from video feed into a File object
  const capturePhoto = () => {
    if (!videoRef.current || !isStreaming || isCapturing) return;

    setIsCapturing(true);
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (facingMode === "user") {
        // Mirror front camera
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          setIsCapturing(false);
          if (blob) {
            const fileName = `photo_${Date.now()}.jpg`;
            const capturedFile = new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            stopStream();
            if (onCapture) {
              onCapture(capturedFile);
            }
          } else {
            setErrorMessage("Failed to capture photo frame. Please try again.");
          }
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Photo capture failed:", err);
      setIsCapturing(false);
      setErrorMessage("Error capturing photo. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 text-white flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold">Take Proof Photo</h3>
              <p className="text-[11px] text-slate-400">In-App Web Camera</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <button
                type="button"
                onClick={toggleCamera}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors flex items-center gap-1 text-xs"
                title="Switch Camera"
              >
                <SwitchCamera size={18} />
                <span className="hidden sm:inline">Flip</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewfinder Body */}
        <div className="relative bg-black flex-1 min-h-[320px] max-h-[500px] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isStreaming ? "opacity-100" : "opacity-0"
            } ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />

          {/* Loading Indicator */}
          {!isStreaming && !errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-950">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Starting camera...</p>
            </div>
          )}

          {/* Error View */}
          {errorMessage && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950 text-slate-300 space-y-4">
              <AlertCircle size={40} className="text-rose-500 animate-pulse" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Camera Error</p>
                <p className="text-xs text-slate-400 max-w-xs">{errorMessage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={() => startStream(facingMode)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Retry Camera
                </button>
                {onFallbackToUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onFallbackToUpload();
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Upload size={14} /> Use File Upload
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Live Overlay Reticle */}
          {isStreaming && (
            <div className="absolute inset-4 border-2 border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-12 h-12 border border-white/40 rounded-full" />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          {/* Shutter Button */}
          <button
            type="button"
            onClick={capturePhoto}
            disabled={!isStreaming || isCapturing}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white hover:bg-slate-100 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-white/10"
            title="Take Photo"
          >
            <span className="w-12 h-12 rounded-full border-2 border-slate-900 bg-transparent group-hover:scale-95 transition-transform" />
          </button>

          {/* Camera Flip Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={toggleCamera}
              className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors"
              title="Flip Camera"
            >
              <SwitchCamera size={18} />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>
    </div>
  );
}
