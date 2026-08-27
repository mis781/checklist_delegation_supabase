import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPdfDateDash, money, loadImageAsDataUrl } from "./pdfUtils";
import nutechLogo from "../../../assets/nutech-logo.png";

const NUTECH_DEFAULT_ADDRESS = "Regd. Off: Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG 493111";

// ─── Design Color & Typography Tokens ────────────────────────────────────────
const COLORS = {
  indigoPrimary: [67, 56, 202],   // #4338ca
  textDark:      [15, 23, 42],    // #0f172a
  textSecondary: [100, 116, 139], // #64748b
  textMuted:     [148, 163, 184], // #94a3b8
  border:        [226, 232, 240], // #e2e8f0
  boxBackground: [248, 250, 252], // #f8fafc
  tableHeaderBg: [241, 245, 249], // #f1f5f9
  borderOuter:   [15, 23, 42],    // #0f172a
};

/**
 * Generates official Vendor Quotation PDF matching the modern, clean visual layout.
 * @param {Object} data - Quotation Data object
 * @returns {Promise<string>} Blob URL of the generated PDF
 */
export const generateVendorQuotationPdf = async (data = {}, options = {}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  
  // Page Margins
  const outerBorderMargin = 6; // 6mm outer frame
  const margin = 12; // 12mm content padding
  const contentWidth = pageWidth - margin * 2; // 186mm

  // Draw polished outer frame on all pages
  const drawPageFrame = () => {
    doc.saveGraphicsState && doc.saveGraphicsState();
    doc.setDrawColor(...COLORS.borderOuter);
    doc.setLineWidth(0.8);
    doc.rect(
      outerBorderMargin,
      outerBorderMargin,
      pageWidth - outerBorderMargin * 2,
      pageHeight - outerBorderMargin * 2
    );
    doc.restoreGraphicsState && doc.restoreGraphicsState();
  };

  // Load logo asset
  const logoData = await loadImageAsDataUrl(data.logoUrl || nutechLogo);

  let currentY = 14;

  // ─── 1. HEADER SECTION ────────────────────────────────────────────────────
  const companyName = data.companyName || "Nutech Pipes Pvt. Ltd.";
  const companyAddress = data.companyAddress || NUTECH_DEFAULT_ADDRESS;
  const submissionDate = formatPdfDateDash(
    data.submission_date || data.submissionDate || data.quotationDate || data.created_at
  );

  // Left: Company Logo + Name + 2-line Address
  let textStartX = margin;
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin, currentY - 2, 28, 10);
      textStartX = margin + 32;
    } catch (err) {
      console.warn("Could not render logo in Quotation PDF:", err);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.textDark);
  doc.text(companyName, textStartX, currentY + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textSecondary);
  const addrLines = doc.splitTextToSize(companyAddress, contentWidth * 0.45);
  doc.text(addrLines.slice(0, 2), textStartX, currentY + 6.5);

  // Right: Document Title "VENDOR QUOTATION" + Quotation Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.indigoPrimary);
  doc.text("VENDOR QUOTATION", margin + contentWidth, currentY + 1, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Date: ${submissionDate}`, margin + contentWidth, currentY + 6.5, { align: "right" });

  currentY += 15;

  // Header Divider Line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, margin + contentWidth, currentY);

  currentY += 6;

  // ─── 2. VENDOR / COMMERCIAL CARDS (TWO COLUMNS) ───────────────────────────
  const cardGap = 6;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 30;

  const vendorName = data.vendor_name || data.vendorName || "Supplier / Vendor";
  const paymentTerms = data.payment_terms || data.paymentTerms || "30 days post delivery";
  const rawDeliveryTerms = data.delivery_terms || data.deliveryDate || data.lead_time || "7 to 10 days";
  const deliveryTerms = (typeof rawDeliveryTerms === "string" && (/\d{4}-\d{2}-\d{2}/.test(rawDeliveryTerms) || (rawDeliveryTerms.includes("T") && !isNaN(new Date(rawDeliveryTerms).getTime()))))
    ? formatPdfDateDash(rawDeliveryTerms)
    : rawDeliveryTerms;
  const transportType = data.transport_type || data.transportType || "F.O.R. (Free on Road)";

  // Left Card: VENDOR
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text("VENDOR", margin, currentY);

  doc.setFillColor(...COLORS.boxBackground);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY + 2, cardWidth, cardHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.textDark);
  doc.text(vendorName, margin + 4, currentY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Status: ${data.status || "Verified Bid"}`, margin + 4, currentY + 15);
  doc.text(
    `Delivery Destination: ${data.warehouse_location || data.warehouseLocation || "Central Plant / Raipur"}`,
    margin + 4,
    currentY + 20
  );
  doc.text("Commercial Grade: Certified Industrial Material", margin + 4, currentY + 25);

  // Right Card: COMMERCIAL TERMS
  const rightCardX = margin + cardWidth + cardGap;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text("COMMERCIAL TERMS", rightCardX, currentY);

  doc.setFillColor(...COLORS.boxBackground);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(rightCardX, currentY + 2, cardWidth, cardHeight, 1.5, 1.5, "FD");

  const termLines = [
    { label: "Payment Terms:", val: paymentTerms },
    { label: "Expected Delivery:", val: deliveryTerms },
    { label: "Transport Type:", val: transportType },
  ];

  termLines.forEach((t, idx) => {
    const tY = currentY + 8 + idx * 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(t.label, rightCardX + 4, tY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text(String(t.val), rightCardX + cardWidth - 4, tY, { align: "right" });
  });

  currentY += cardHeight + 8;

  // ─── 3. ITEMS TABLE (AUTOTABLE) ───────────────────────────────────────────
  const indentNumber = data.indent_number || data.indentNumber || "IND-2026-001";
  const itemName = data.item_name || data.itemName || "Material Item";

  const items = Array.isArray(data.items) && data.items.length > 0
    ? data.items
    : [
        {
          srNo: 1,
          itemName: itemName,
          indentNumber: indentNumber,
          quantity: Number(data.quantity || 1),
          rate: Number(data.quoted_rate !== undefined ? data.quoted_rate : (data.rate !== undefined ? data.rate : 75)),
          gstPercent: Number(data.gst_percent !== undefined ? data.gst_percent : (data.gst !== undefined ? data.gst : 18)),
        },
      ];

  let calculatedSubtotal = 0;
  let calculatedGst = 0;

  const tableBody = items.map((it, idx) => {
    const qty = Number(it.quantity || 1);
    const rate = Number(it.quoted_rate !== undefined ? it.quoted_rate : (it.rate !== undefined ? it.rate : 0));
    const gstPct = Number(String(it.gstPercent || it.gst_percent || it.gst || "18").replace("%", "")) || 0;
    const baseVal = qty * rate;
    const taxVal = baseVal * (gstPct / 100);
    const totalVal = it.amount !== undefined ? Number(it.amount) : baseVal + taxVal;

    calculatedSubtotal += baseVal;
    calculatedGst += taxVal;

    const itNameStr = it.itemName || it.item_name || itemName;
    const itIndentStr = it.indentNumber || it.indent_number || indentNumber;
    const descText = `${itNameStr}\nIndent: ${itIndentStr}`;

    return [
      idx + 1,
      descText,
      `${qty} ${it.uom || data.uom || "NOS"}`,
      `Rs. ${money(rate)}`,
      `${gstPct}%`,
      `Rs. ${money(totalVal)}`,
    ];
  });

  const subtotalNum = data.subtotal !== undefined ? Number(data.subtotal) : calculatedSubtotal;
  const gstNum = data.gstAmount !== undefined ? Number(data.gstAmount) : (data.gst !== undefined ? Number(data.gst) : calculatedGst);
  const grandTotalNum = data.grandTotal !== undefined ? Number(data.grandTotal) : (subtotalNum + gstNum);

  autoTable(doc, {
    startY: currentY,
    head: [["S/N", "Item Description", "Qty", "Rate", "GST", "Total"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.tableHeaderBg,
      textColor: COLORS.textSecondary,
      fontStyle: "bold",
      fontSize: 7.5,
      lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
      lineColor: COLORS.border,
      halign: "center",
      valign: "middle",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: COLORS.textDark,
      lineWidth: { bottom: 0.15, top: 0, left: 0, right: 0 },
      lineColor: COLORS.border,
      valign: "top",
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 70, fontStyle: "bold" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 26, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  let tableFinalY = doc.lastAutoTable.finalY + 3;

  // ─── 4. SUMMARY / TOTALS BOX (RIGHT-ALIGNED) ───────────────────────────────
  const summaryWidth = 75;
  const summaryX = margin + contentWidth - summaryWidth;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text("Subtotal", summaryX, tableFinalY + 4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textDark);
  doc.text(`Rs. ${money(subtotalNum)}`, margin + contentWidth, tableFinalY + 4, { align: "right" });

  // GST Total
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textSecondary);
  doc.text("GST Total", summaryX, tableFinalY + 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textDark);
  doc.text(`Rs. ${money(gstNum)}`, margin + contentWidth, tableFinalY + 9, { align: "right" });

  // Divider above Grand Total
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.25);
  doc.line(summaryX, tableFinalY + 12, margin + contentWidth, tableFinalY + 12);

  // GRAND TOTAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.indigoPrimary);
  doc.text("GRAND TOTAL", summaryX, tableFinalY + 17.5);
  doc.text(`Rs. ${money(grandTotalNum)}`, margin + contentWidth, tableFinalY + 17.5, { align: "right" });

  currentY = tableFinalY + 24;

  // ─── 5. REMARKS SECTION (CONDITIONAL) ─────────────────────────────────────
  const remarks = (data.remarks || "").trim();
  if (remarks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("REMARKS", margin, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textSecondary);
    const rLines = doc.splitTextToSize(remarks, contentWidth);
    doc.text(rLines, margin, currentY + 4.5);

    currentY += 4.5 + rLines.length * 4 + 4;
  }

  // ─── 6. FOOTER & SIGNATURE BLOCK ──────────────────────────────────────────
  const sigY = Math.min(Math.max(currentY + 4, pageHeight - 24), pageHeight - 16);

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY - 2, margin + contentWidth, sigY - 2);

  // Left: Submitted By + System Note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Submitted By: ${vendorName}`, margin, sigY + 3.5);

  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text("FMS System Generated Document", margin, sigY + 7.5);

  // Right: For [Company Name] + Department
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textDark);
  doc.text(`For ${companyName}`, margin + contentWidth, sigY + 3.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text("Purchase Department", margin + contentWidth, sigY + 7.5, { align: "right" });

  // Draw outer frame on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFrame();
  }

  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  if (options.openWindow !== false) {
    window.open(blobUrl, "_blank");
  }
  return { blob, blobUrl, doc };
};

export const generateVendorQuotationPdfBlob = async (data = {}) => {
  return generateVendorQuotationPdf(data, { openWindow: false });
};
