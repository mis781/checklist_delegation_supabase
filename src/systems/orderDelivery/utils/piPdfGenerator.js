import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { amountInWords, formatPdfDateDash, loadImageAsDataUrl } from "../../purchase/utils/pdfUtils";
import nutechLogo from "../../../assets/nutech-logo.png";

const COMPANY_NAME = "NUTECH PIPES PVT. LTD.";
const COMPANY_SUBTITLE = "Manufacturer & Supplier of High Quality Pipes & Fittings";
const COMPANY_ADDRESS = "Regd. Off: Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG - 493111";
const COMPANY_GSTIN = "22AAACN1234F1Z5";
const COMPANY_CONTACT = "Phone: +91 98765 43210 | Email: sales@nutechpipes.com";

const inr = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Generates an official Proforma Invoice (PI) PDF.
 * @param {Object} order - Order / PI details
 * @param {Object} options - { download: boolean, fileName: string }
 * @returns {Promise<string>} Blob URL of generated PDF
 */
export async function generatePiPdf(order = {}, options = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  let currentY = margin;

  // 1. Company Header with Logo
  let logoDataUrl = null;
  try {
    logoDataUrl = await loadImageAsDataUrl(nutechLogo);
  } catch (err) {
    console.warn("[piPdfGenerator] Logo load fallback:", err);
  }

  // Draw Header Border & Background Accent
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 32, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 32, 2, 2, "S");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin + 4, currentY + 4, 46, 12);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text(COMPANY_NAME, margin + 4, currentY + 12);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text(COMPANY_NAME, margin + 4, currentY + 12);
  }

  // Company Details (Left)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(COMPANY_SUBTITLE, margin + 4, currentY + 20);
  doc.text(COMPANY_ADDRESS, margin + 4, currentY + 24.5);
  doc.text(`GSTIN: ${COMPANY_GSTIN}  |  ${COMPANY_CONTACT}`, margin + 4, currentY + 29);

  // Document Badge (Right)
  doc.setFillColor(30, 58, 138); // Deep Navy Blue
  doc.roundedRect(pageWidth - margin - 58, currentY + 4, 54, 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text("PROFORMA INVOICE", pageWidth - margin - 31, currentY + 11.2, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  const piNumberDisplay = order.poNumber || order.piNumber || "PI-DRAFT";
  doc.text(`PI No: ${piNumberDisplay}`, pageWidth - margin - 4, currentY + 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatPdfDateDash(order.poDate || order.piDate || new Date().toISOString())}`, pageWidth - margin - 4, currentY + 25, { align: "right" });
  if (order.orderId) {
    doc.text(`Order ID: ${order.orderId}`, pageWidth - margin - 4, currentY + 29.5, { align: "right" });
  }

  currentY += 36;

  // 2. Party (Bill To) & Order Details Grid (2 Columns)
  const colWidth = (contentWidth - 4) / 2;
  const infoBoxHeight = 44;

  // Left Box: Consignee / Bill To
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, infoBoxHeight, 2, 2, "FD");

  // Left Box Header
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, colWidth, 7, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text("CUSTOMER / BILL TO:", margin + 3, currentY + 4.8);

  let billY = currentY + 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(String(order.partyName || "Walk-in Customer"), margin + 3, billY);

  billY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  if (order.partyNumber) {
    doc.text(`Contact: ${order.partyNumber}`, margin + 3, billY);
    billY += 4.5;
  }
  if (order.gstNumber) {
    doc.text(`GSTIN: ${order.gstNumber}`, margin + 3, billY);
    billY += 4.5;
  }
  if (order.responsiblePerson) {
    doc.text(`Contact Person: ${order.responsiblePerson}`, margin + 3, billY);
    billY += 4.5;
  }
  const addressText = order.deliveryAddress || "As per order agreement";
  const addressLines = doc.splitTextToSize(`Address: ${addressText}`, colWidth - 6);
  doc.text(addressLines.slice(0, 2), margin + 3, billY);

  // Right Box: Order & Dispatch Info
  const rightColX = margin + colWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightColX, currentY, colWidth, infoBoxHeight, 2, 2, "FD");

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(rightColX, currentY, colWidth, 7, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text("ORDER & DISPATCH DETAILS:", rightColX + 3, currentY + 4.8);

  let ordY = currentY + 12;
  const drawFieldRow = (label, val, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, rightColX + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(val || "—"), rightColX + 40, y);
  };

  drawFieldRow("Division:", order.division || "Standard", ordY);
  ordY += 5.5;
  drawFieldRow("Exp. Delivery Date:", formatPdfDateDash(order.expectedDeliveryDate || "Immediate"), ordY);
  ordY += 5.5;
  drawFieldRow("Transport Type:", order.transportingType || "Standard", ordY);
  ordY += 5.5;
  drawFieldRow("Payment Terms:", order.paymentTerm || "As Agreed", ordY);
  ordY += 5.5;
  drawFieldRow("Order Received By:", order.orderReceivedBy || "Sales Desk", ordY);

  currentY += infoBoxHeight + 5;

  // 3. Products Table
  const rawItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
  let subtotal = 0;
  let totalGstAmount = 0;

  const tableBody = rawItems.map((item, idx) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.priceRate) || 0;
    const gstPercent = parseFloat(item.gstPercent) || 0;
    const taxable = qty * rate;
    const gstAmt = taxable * (gstPercent / 100);
    const itemTotal = parseFloat(item.totalValue) || (taxable + gstAmt);

    subtotal += taxable;
    totalGstAmount += gstAmt;

    return [
      String(idx + 1),
      item.productName || "Product",
      String(qty),
      item.uom || "Pcs",
      `INR ${inr(rate)}`,
      `INR ${inr(taxable)}`,
      `${gstPercent}%`,
      `INR ${inr(gstAmt)}`,
      `INR ${inr(itemTotal)}`,
    ];
  });

  const grandTotal = subtotal + totalGstAmount;
  const advanceAmount = parseFloat(order.advanceAmount) || 0;
  const balanceDue = Math.max(0, grandTotal - advanceAmount);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        "#",
        "Item Description",
        "Qty",
        "UOM",
        "Unit Rate",
        "Taxable Amt",
        "GST %",
        "GST Amt",
        "Total (INR)",
      ],
    ],
    body: tableBody.length > 0 ? tableBody : [["1", "General Goods", "1", "Nos", inr(grandTotal), inr(grandTotal), "0%", "0.00", inr(grandTotal)]],
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 20, halign: "right" },
      8: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y;
    },
  });

  currentY += 4;

  // Check page overflow for summary & footer
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = margin;
  }

  // 4. Amount in Words & Totals Summary Box
  const summaryBoxWidth = 85;
  const summaryX = pageWidth - margin - summaryBoxWidth;
  const notesWidth = contentWidth - summaryBoxWidth - 6;

  // Notes & Words Section (Left)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, notesWidth, 36, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text("AMOUNT IN WORDS:", margin + 3, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const wordsLines = doc.splitTextToSize(amountInWords(grandTotal), notesWidth - 6);
  doc.text(wordsLines.slice(0, 2), margin + 3, currentY + 10.5);

  if (order.remarks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("REMARKS:", margin + 3, currentY + 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const remLines = doc.splitTextToSize(String(order.remarks), notesWidth - 6);
    doc.text(remLines.slice(0, 2), margin + 3, currentY + 24.5);
  }

  // Summary Table (Right)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(summaryX, currentY, summaryBoxWidth, 36, 1.5, 1.5, "FD");

  const drawSummaryRow = (label, val, y, isBold = false, isAccent = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 8.5 : 7.5);
    doc.setTextColor(isAccent ? 30 : 71, isAccent ? 58 : 85, isAccent ? 138 : 105);
    doc.text(label, summaryX + 4, y);
    doc.text(val, summaryX + summaryBoxWidth - 4, y, { align: "right" });
  };

  let sumY = currentY + 6;
  drawSummaryRow("Taxable Subtotal:", `INR ${inr(subtotal)}`, sumY);
  sumY += 5.5;
  drawSummaryRow("Total GST:", `INR ${inr(totalGstAmount)}`, sumY);
  sumY += 6;

  // Grand Total highlight bar
  doc.setFillColor(238, 242, 255);
  doc.rect(summaryX + 1, sumY - 4.5, summaryBoxWidth - 2, 7.5, "F");
  drawSummaryRow("Grand Total (PI Value):", `INR ${inr(grandTotal)}`, sumY + 0.5, true, true);

  if (order.advancePayment === "Yes" && advanceAmount > 0) {
    sumY += 6.5;
    drawSummaryRow("Advance Paid:", `INR ${inr(advanceAmount)}`, sumY);
    sumY += 5;
    drawSummaryRow("Balance Payable:", `INR ${inr(balanceDue)}`, sumY, true);
  }

  currentY += 40;

  // 5. Terms & Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("TERMS & CONDITIONS:", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text("1. This is a Proforma Invoice and not a tax invoice. Goods will be dispatched against agreed payment terms.", margin, currentY + 4);
  doc.text("2. Price and tax rates are valid for 15 days from the date of issue unless specified otherwise.", margin, currentY + 7.5);
  doc.text("3. Subject to Raipur jurisdiction.", margin, currentY + 11);

  // Authorized Signatory
  const sigX = pageWidth - margin - 50;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${COMPANY_NAME}`, sigX, currentY + 2, { align: "center" });

  doc.setDrawColor(203, 213, 225);
  doc.line(sigX - 25, currentY + 15, sigX + 25, currentY + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorized Signatory / Sales Desk", sigX, currentY + 19, { align: "center" });

  // 6. Action: Download or Return Blob URL
  const cleanPiName = String(piNumberDisplay).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = options.fileName || `${cleanPiName}_Proforma_Invoice.pdf`;

  if (options.download) {
    doc.save(fileName);
  }

  const blobUrl = doc.output("bloburl");
  return blobUrl;
}
