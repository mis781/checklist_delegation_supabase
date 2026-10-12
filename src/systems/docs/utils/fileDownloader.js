import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import { supabase } from "../../../SupabaseClient";

/**
 * Downloads a document or attachment.
 * 1. If remote file exists in Supabase Storage or URL, downloads the binary directly.
 * 2. If remote binary is unavailable or demo file, creates a formal PDF archive copy on the fly.
 */
export const downloadFileAttachment = async (fileOrAttachment, docContext = null) => {
  const fileName =
    typeof fileOrAttachment === "string"
      ? fileOrAttachment
      : fileOrAttachment?.name || docContext?.fileName || "document.pdf";

  const fileUrl =
    (typeof fileOrAttachment === "object" && fileOrAttachment?.url) ||
    docContext?.fileUrl ||
    null;

  const toastId = toast.loading(`Preparing ${fileName} for download...`);

  try {
    // 1. Direct URL download (Supabase Storage Public URL, Data URI, or Blob URI)
    if (fileUrl && (fileUrl.startsWith("http://") || fileUrl.startsWith("https://") || fileUrl.startsWith("data:") || fileUrl.startsWith("blob:"))) {
      try {
        const res = await fetch(fileUrl);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);

          toast.success(`Downloaded ${fileName}`, { id: toastId });
          return;
        }
      } catch (corsErr) {
        console.warn("Direct blob fetch notice (falling back to browser anchor):", corsErr);
        const link = document.createElement("a");
        link.href = fileUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Opening ${fileName}`, { id: toastId });
        return;
      }
    }

    // 2. Supabase Storage client download by path
    const storagePath =
      (typeof fileOrAttachment === "object" && fileOrAttachment?.path) ||
      (fileName ? `documents/${fileName}` : null);

    if (storagePath && supabase) {
      try {
        const { data: storageBlob, error } = await supabase.storage
          .from("docs_attachments")
          .download(storagePath);

        if (!error && storageBlob && storageBlob.size > 0) {
          const blobUrl = window.URL.createObjectURL(storageBlob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);

          toast.success(`Downloaded ${fileName}`, { id: toastId });
          return;
        }
      } catch (storageErr) {
        console.warn("Storage download notice:", storageErr);
      }
    }

    // 3. Fallback: Generate high-resolution PDF document copy
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const docName = docContext?.documentName || fileName.replace(/\.[^/.]+$/, "");
    const company = docContext?.companyName || "Nutech Engineering";
    const person = docContext?.personName || "Authorized Signatory";
    const category = docContext?.category || "Company Document";
    const renewalStatus =
      docContext?.needsRenewal === "Yes"
        ? `Yes (Due: ${docContext?.renewalDate || "-"})`
        : "Not Required";
    const remarks = docContext?.remarks || "Registered in Corporate Document Vault";

    // Top Header Banner
    doc.setFillColor(37, 99, 235); // Blue #2563eb
    doc.rect(0, 0, 210, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("DOCUMENT VAULT & ARCHIVE SYSTEM", 14, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Official Record Copy", 14, 19);

    // Document Title
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(docName, 14, 38);

    // Details Container Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 44, 182, 80, 3, 3, "FD");

    doc.setFontSize(10);
    const fields = [
      ["File Name:", fileName],
      ["Company:", company],
      ["Holder / Responsible:", person],
      ["Category:", category],
      ["Renewal Required:", renewalStatus],
      ["Document Format:", docContext?.documentType || "PDF (.pdf)"],
      ["Registered Date:", docContext?.createdAt ? new Date(docContext.createdAt).toLocaleDateString() : new Date().toLocaleDateString()],
      ["Remarks:", remarks],
    ];

    let yPos = 53;
    fields.forEach(([label, val]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(label, 20, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(String(val || "-"), 72, yPos);
      yPos += 8.5;
    });

    // Verification Footer
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `System Archive generated on ${new Date().toLocaleString()} for ${company}.`,
      14,
      138
    );

    const downloadFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    doc.save(downloadFileName);
    toast.success(`Downloaded ${downloadFileName}`, { id: toastId });
  } catch (err) {
    console.error("Download error:", err);
    toast.error("Failed to download file", { id: toastId });
  }
};
