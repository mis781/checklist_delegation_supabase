import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPdfDate, loadImageAsDataUrl } from "./pdfUtils";
import nutechLogo from "../../../assets/nutech-logo.png";

/**
 * Component / Module: Request for Quotation (RFQ) PDF Generator
 * Dynamically constructs official RFQ documentation for suppliers and opens directly in a new tab.
 */
export const generateRfqPdf = async (data = {}, options = {}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = formatPdfDate(data.rfqDate || data.date);

  // Load logo
  const logoData = await loadImageAsDataUrl(data.logoUrl || nutechLogo);

  // 1. Header Banner
  doc.setFillColor(30, 58, 138); // Dark Navy Blue
  doc.rect(0, 0, pageWidth, 28, "F");

  let textLeftX = 14;
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", 14, 5, 26, 10);
      textLeftX = 43;
    } catch (err) {
      console.warn("Could not render logo in RFQ PDF:", err);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("NUTECH PIPES PVT. LTD.", textLeftX, 11);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Manufacturers of HDPE & CPVC Piping Systems", textLeftX, 16.5);
  doc.text("Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG 493111", textLeftX, 21.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("REQUEST FOR QUOTATION", pageWidth - 14, 13, { align: "right" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${dateStr}`, pageWidth - 14, 19, { align: "right" });
  doc.text(`RFQ Ref: ${data.rfqRef || `RFQ-${Math.floor(1000 + Math.random() * 9000)}`}`, pageWidth - 14, 24, { align: "right" });

  let currentY = 34;

  // 2. Suppliers Box
  if (data.suppliers && data.suppliers.length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, pageWidth - 28, 12, 2, 2, "F");
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("INVITED SUPPLIERS:", 18, currentY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 58, 138);
    doc.text(data.suppliers.join("  |  "), 18, currentY + 9.5);
    currentY += 16;
  }

  // 3. Commercial & Address Details (3 Box Columns)
  const boxWidth = (pageWidth - 28 - 8) / 3;

  // Box 1: Commercial Details
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, boxWidth, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("COMMERCIAL DETAILS", 18, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(`GSTIN: ${data.gstin || "22AAACN1234F1Z9"}`, 18, currentY + 11);
  doc.text(`PAN No: ${data.pan || "AAACN1234F"}`, 18, currentY + 16);
  doc.text(`State Code: 22 (Chhattisgarh)`, 18, currentY + 21);

  // Box 2: Billing Address
  const box2X = 14 + boxWidth + 4;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box2X, currentY, boxWidth, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("BILLING ADDRESS", box2X + 4, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(data.billingCompany || "Nutech Pipes Pvt. Ltd.", box2X + 4, currentY + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const billLines = doc.splitTextToSize(
    data.billingAddress || "Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG",
    boxWidth - 8
  );
  doc.text(billLines, box2X + 4, currentY + 16);

  // Box 3: Destination Address
  const box3X = box2X + boxWidth + 4;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box3X, currentY, boxWidth, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("DESTINATION / DELIVERY", box3X + 4, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(data.destCompany || "Nutech Pipes - Plant 1", box3X + 4, currentY + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const destLines = doc.splitTextToSize(
    data.destAddress || "Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG",
    boxWidth - 8
  );
  doc.text(destLines, box3X + 4, currentY + 16);

  currentY += 30;

  // 4. Letter Note / Description if present
  if (data.descriptionNote && data.descriptionNote.trim()) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, currentY, pageWidth - 28, 10, 1.5, 1.5, "F");
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`NOTE: ${data.descriptionNote}`, 18, currentY + 6.5);
    currentY += 14;
  }

  // 5. Items AutoTable
  const tableRows = (data.items || []).map((item, idx) => [
    idx + 1,
    item.indent_number || item.indentNumber || `IND-${idx + 1}`,
    item.item_name || item.itemName || "Item Description",
    item.category || "Consumable",
    `${item.quantity || 1} ${item.uom || "NOS"}`,
    item.warehouse_location || item.warehouseLocation || "Plant 1 - Raipur",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["S.No", "Indent #", "Material Name / Specification", "Category", "Quantity", "Delivery Plant"]],
    body:
      tableRows.length > 0
        ? tableRows
        : [[1, "IND-2026-004", "Welding Electrodes E7018", "Consumables", "100 PKT", "Plant 1 - Raipur"]],
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 26, fontStyle: "bold", textColor: [2, 132, 199] },
      2: { cellWidth: 60, fontStyle: "bold" },
      3: { cellWidth: 28 },
      4: { cellWidth: 24, fontStyle: "bold", halign: "center" },
      5: { cellWidth: "auto" },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // 6. Terms & Conditions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TERMS & INSTRUCTIONS FOR BIDDERS:", 14, finalY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  const defaultTerms = [
    "1. Rates quoted must be inclusive of industrial packaging, forwarding, and F.O.R. delivery.",
    "2. Quotations must specify GST percentage, HSN classification, and expected dispatch lead time.",
    "3. Standard payment terms: 30 days post physical delivery and QC material acceptance.",
    "4. Please submit quotation through the secure online vendor quotation link provided in RFQ email.",
  ];

  const termsToPrint = data.terms && data.terms.length > 0 ? data.terms : defaultTerms;
  termsToPrint.forEach((t, i) => {
    doc.text(t, 14, finalY + 5 + i * 4.5);
  });

  // 7. Signature Footer
  const sigY = finalY + 5 + termsToPrint.length * 4.5 + 12;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, pageWidth - 14, Math.min(sigY, 285));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text("For NUTECH PIPES PVT. LTD.", pageWidth - 14, sigY + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Generated by Nutech Purchase Master System", 14, sigY + 14);
  doc.text("Authorized Procurement Officer", pageWidth - 14, sigY + 14, { align: "right" });

  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  if (options.openWindow !== false) {
    window.open(blobUrl, "_blank");
  }
  return { blob, blobUrl, doc };
};

export const generateRfqPdfBlob = async (data = {}) => {
  return generateRfqPdf(data, { openWindow: false });
};
