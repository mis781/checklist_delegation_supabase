import { useState, useRef } from "react"
import {
  Paperclip,
  MapPin,
  ExternalLink,
  X,
  Check,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react"
import { getImageLocationMeta, compressImageFile } from "../../../utils/imageLocation"
import { bakeLocationWatermark } from "../../../utils/bakeLocationWatermark"
import { uploadAttachment } from "../services/leadApi"

export default function LeadAttachmentUpload({
  id = "attachment-upload",
  value = "",
  locationValue = null,
  fileName = "",
  onChange,
  onClear,
  onRequestLocationModal,
  label = "Attachment",
  buttonText = "Browse file",
  accept = "image/*,.pdf",
  maxSizeMb = 10,
  required = false,
  disabled = false,
  className = "",
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [errorText, setErrorText] = useState("")
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSizeMb * 1024 * 1024) {
      setErrorText(`File exceeds maximum size of ${maxSizeMb}MB.`)
      if (e.target) e.target.value = ""
      return
    }

    setErrorText("")
    setIsProcessing(true)
    setStatusText("Reading file & capturing GPS location...")

    try {
      let processedFile = file
      const isImage = file.type?.startsWith("image/")

      // 1. Compress image to prevent mobile memory issues
      if (isImage) {
        setStatusText("Optimizing image resolution...")
        processedFile = await compressImageFile(file, 1600)
      }

      // 2. Capture GPS metadata (EXIF or browser GPS)
      setStatusText("Acquiring GPS coordinates & address...")
      let locationMeta = null
      try {
        locationMeta = await getImageLocationMeta(processedFile, "gallery")
      } catch (locErr) {
        console.warn("Location capture warning:", locErr)
        if (onRequestLocationModal) {
          onRequestLocationModal()
        }
        setErrorText(locErr.message || "Location access was denied or unavailable.")
      }

      // 3. Bake watermark onto photo if location was captured
      if (isImage && locationMeta) {
        setStatusText("Baking location watermark...")
        const metaWithBakedFlag = { ...locationMeta, is_baked: true, isBaked: true }
        processedFile = await bakeLocationWatermark(processedFile, metaWithBakedFlag)
      }

      // 4. Upload to Supabase Storage (with fallback)
      setStatusText("Uploading to cloud storage...")
      const attachmentUrl = await uploadAttachment(processedFile, "attachments")

      if (onChange) {
        onChange(attachmentUrl, locationMeta, file.name)
      }
    } catch (err) {
      console.error("Attachment upload error:", err)
      setErrorText(err.message || "Failed to process attachment.")
    } finally {
      setIsProcessing(false)
      setStatusText("")
      if (e.target) e.target.value = ""
    }
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setErrorText("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (onClear) {
      onClear()
    } else if (onChange) {
      onChange("", null, "")
    }
  }

  const isImageValue =
    typeof value === "string" &&
    (value.startsWith("data:image/") || value.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i))

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {locationValue && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              <Check size={11} /> GPS Verified
            </span>
          )}
        </div>
      )}

      {/* Main Upload / File Preview Card */}
      {!value ? (
        <div>
          <label
            htmlFor={id}
            className={`flex items-center justify-center gap-2.5 border-2 border-dashed rounded-xl px-4 py-3 text-xs transition-all cursor-pointer select-none ${
              isProcessing
                ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                : "bg-gray-50/70 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400"
            } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span className="font-semibold">{statusText || "Processing file & location..."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-semibold">
                <Paperclip size={15} className="text-gray-400 dark:text-slate-400" />
                <span>{buttonText}</span>
                <span className="text-[10.5px] text-gray-400 dark:text-slate-500 font-normal">
                  (Images or PDF up to {maxSizeMb}MB)
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              id={id}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept={accept}
              disabled={disabled || isProcessing}
            />
          </label>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {isImageValue ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0 bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <img src={value} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {fileName || (isImageValue ? "Proof Photo Attached" : "Document Attached")}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded shrink-0">
                    Attached
                  </span>
                </div>
                <p className="text-[10.5px] text-gray-500 dark:text-slate-400 truncate">
                  {isImageValue ? "Photo with baked GPS timestamp" : "Uploaded file"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                title="View original attachment"
              >
                <ExternalLink size={12} /> View
              </a>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Location Badge Pill */}
          {locationValue && (
            <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-900 dark:text-emerald-200">
              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                <MapPin size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-[11px] leading-tight min-w-0">
                  <span className="font-bold text-emerald-950 dark:text-emerald-100">
                    {locationValue.address || "Location Captured"}
                  </span>
                  {typeof locationValue.latitude === "number" && typeof locationValue.longitude === "number" && (
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 ml-1.5 opacity-90">
                      ({locationValue.latitude.toFixed(4)}°, {locationValue.longitude.toFixed(4)}°)
                    </span>
                  )}
                </div>
              </div>

              {typeof locationValue.latitude === "number" && typeof locationValue.longitude === "number" && (
                <a
                  href={`https://www.google.com/maps?q=${locationValue.latitude},${locationValue.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold tracking-wide transition-colors shrink-0 shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                  <ExternalLink size={10} /> Map
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message display */}
      {errorText && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 animate-in fade-in">
          <AlertCircle size={13} className="shrink-0" />
          <span>{errorText}</span>
        </div>
      )}
    </div>
  )
}
