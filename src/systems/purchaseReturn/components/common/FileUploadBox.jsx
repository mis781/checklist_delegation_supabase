import { useRef } from "react";
import { UploadCloud, FileText, ExternalLink } from "lucide-react";
import { placeholderPreviewUrl } from "../../data/dummyPurchaseReturns";

export default function FileUploadBox({
  label,
  fileName,
  fileUrl,
  onFileSelect,
  accept = "*",
  placeholder = "Click or drag to select file from your computer",
  required = false
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      onFileSelect(file.name, previewUrl, file);
    }
  };

  const previewHref = fileUrl || (fileName ? placeholderPreviewUrl(fileName) : null);

  const handlePreview = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!previewHref) return;

    // Handle base64 data URLs safely to avoid Chrome navigation restrictions / 500 errors
    if (previewHref.startsWith("data:")) {
      try {
        const arr = previewHref.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        return;
      } catch (err) {
        console.warn("Could not parse data URL as blob:", err);
      }
    }

    window.open(previewHref, "_blank");
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group"
      >
        <UploadCloud className="w-6 h-6 mx-auto text-slate-400 group-hover:text-blue-500 transition-colors mb-1.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">
          {placeholder}
        </p>

        {fileName && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span className="truncate max-w-[200px]">{fileName}</span>
            {previewHref && (
              <button
                type="button"
                onClick={handlePreview}
                className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline ml-1 font-bold cursor-pointer"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
