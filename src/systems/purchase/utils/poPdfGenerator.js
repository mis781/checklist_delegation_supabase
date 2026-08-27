import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { amountInWords, formatPdfDateDash, money, loadImageAsDataUrl } from "./pdfUtils";
import nutechLogo from "../../../assets/nutech-logo.png";

const NUTECH_DEFAULT_ADDRESS = "Regd. Off: Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG 493111";
const NUTECH_DEFAULT_GSTIN = "22AAACN1234F1Z9";

// Known Company Address Directory (from master_addresses)
const COMPANY_ADDRESS_MAP = {
  "m/s nutech pvt. ltd.": "Regd. Off: Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG 493111",
  "nutech pipes pvt. ltd.": "Regd. Off: Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, CG 493111",
  "nutech plant 1 - raipur factory gate 2": "Plot 12-16, Industrial Area Phase II, Urla, Raipur, CG 493221",
  "nutech division a - bhilai unit": "Light Industrial Area, Nandini Road, Bhilai, CG 490026",
  "nutech division b - bilaspur central store": "Transport Nagar, Korba Road, Bilaspur, CG 495004",
  "central stores, raipur": "Plot 12-16, Industrial Area Phase II, Urla, Raipur, CG 493221",
  "central plant / raipur": "Plot 12-16, Industrial Area Phase II, Urla, Raipur, CG 493221",
};

/**
 * Resolves a company / destination name to its full physical address.
 */
export const resolveCompanyAddress = (nameOrAddress) => {
  if (!nameOrAddress) return NUTECH_DEFAULT_ADDRESS;
  const str = String(nameOrAddress).trim();
  const key = str.toLowerCase();
  if (COMPANY_ADDRESS_MAP[key]) return COMPANY_ADDRESS_MAP[key];

  // If already a multi-part address (has commas or pincode digits)
  if (str.length > 25 && (str.includes(",") || /\d{6}/.test(str))) {
    return str;
  }

  // Partial match
  for (const [k, v] of Object.entries(COMPANY_ADDRESS_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return NUTECH_DEFAULT_ADDRESS;
};

/**
 * Ensures human-readable Indent Number instead of raw UUIDs.
 */
export const cleanIndentNumber = (val) => {
  if (!val) return "IND-001";
  const str = String(val).trim();
  if (str.startsWith("IND-")) return str;
  // If it's a UUID (e.g. 36 chars with dashes)
  if (str.length >= 30 && str.includes("-")) {
    return `IND-${str.slice(0, 8).toUpperCase()}`;
  }
  return str.startsWith("IND") ? str : `IND-${str}`;
};

/**
 * Formats delivery date nicely (e.g. DD-MM-YYYY or text description).
 */
export const formatDeliveryDate = (val) => {
  if (!val) return "7 to 10 days";
  const str = String(val).trim();
  if (/\d{4}-\d{2}-\d{2}/.test(str) || (str.includes("T") && !isNaN(new Date(str).getTime()))) {
    return formatPdfDateDash(str);
  }
  return str.replace(/₹/g, "Rs. ");
};

// ─── Design Color Variables ──────────────────────────────────────────────────
const COLOR_PRIMARY_PURPLE = [91, 79, 229];   // #5B4FE5 (Title, Grand Total)
const COLOR_LINK_BLUE = [74, 108, 247];        // #4A6CF7 (addresses, email, prices, terms)
const COLOR_TEXT_DARK = [17, 24, 39];          // #111827
const COLOR_TEXT_GREY = [107, 114, 128];       // #6B7280
const COLOR_TEXT_LIGHT_GREY = [156, 163, 175]; // #9CA3AF
const COLOR_BG_BOX = [247, 248, 250];          // #F7F8FA
const COLOR_BORDER = [229, 231, 235];          // #E5E7EB
const COLOR_BORDER_OUTER = [17, 24, 39];       // #111827

/**
 * Generates official Purchase Order (PO) PDF matching the clean, modern minimal specification.
 * @param {Object} po - PO Data object
 * @returns {Promise<string>} Blob URL of the generated PDF
 */
export const generatePoPdf = async (po = {}, options = {}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  
  // Page Margins
  const outerBorderMargin = 6; // 6mm from page edge
  const margin = 12; // 12mm content padding
  const contentWidth = pageWidth - margin * 2; // 186mm

  // Helper to draw thick outer frame on all pages
  const drawPageFrame = () => {
    doc.saveGraphicsState && doc.saveGraphicsState();
    doc.setDrawColor(...COLOR_BORDER_OUTER);
    doc.setLineWidth(1.0); // ~4px outer border
    doc.rect(
      outerBorderMargin,
      outerBorderMargin,
      pageWidth - outerBorderMargin * 2,
      pageHeight - outerBorderMargin * 2
    );
    doc.restoreGraphicsState && doc.restoreGraphicsState();
  };

  // Load logo
  const logoData = await loadImageAsDataUrl(po.logoUrl || nutechLogo);

  let currentY = 14;

  // ─── 1. Header Section ────────────────────────────────────────────────────
  const companyName = po.firm_name || po.consigneeName || "Nutech Pipes Pvt. Ltd.";
  const companyAddress = po.firm_address || po.companyAddress || NUTECH_DEFAULT_ADDRESS;
  const poNumber = po.po_number || po.poNumber || "PO-DRAFT";
  const poDate = formatPdfDateDash(po.po_date || po.poDate || po.timestamp || po.created_at);

  // Left: Logo + Company Name + 2-line address
  let textStartX = margin;
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin, currentY - 2, 26, 9.5);
      textStartX = margin + 29;
    } catch (err) {
      console.warn("Could not render logo in PO PDF:", err);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(companyName, textStartX, currentY + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_LINK_BLUE);
  const companyAddrLines = doc.splitTextToSize(companyAddress, contentWidth * 0.48);
  doc.text(companyAddrLines.slice(0, 2), textStartX, currentY + 6.5);

  // Right: PURCHASE ORDER Title + Ref + Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_PRIMARY_PURPLE);
  doc.text("PURCHASE ORDER", margin + contentWidth, currentY + 1, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text(`Ref: ${poNumber}`, margin + contentWidth, currentY + 6.5, { align: "right" });
  doc.text(`Date: ${poDate}`, margin + contentWidth, currentY + 10.5, { align: "right" });

  currentY += 15;

  // Header divider
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, margin + contentWidth, currentY);

  currentY += 5;

  // ─── 2. Info Section (2 Columns: Supplier Info & Delivery/Order References) ──
  const cardGap = 6;
  const cardWidth = (contentWidth - cardGap) / 2; // 90mm
  const infoCardHeight = 29;

  // Data mapping
  const supplierName = po.vendor_name || po.vendorName || po.supplierName || "Supplier / Vendor";
  const supplierAddress = po.vendor_address || po.vendorAddress || po.supplierAddress || "-";
  const supplierGstin = po.vendor_gstin || po.vendorGstin || po.supplierGstin || po.gstin || "-";
  const supplierEmail = po.vendor_email || po.vendorEmail || po.supplierEmail || "-";

  const expectedDelivery = formatDeliveryDate(
    po.expected_delivery_date ||
    po.expectedDeliveryDate ||
    po.delivery_date ||
    po.deliveryDate ||
    po.delivery_terms ||
    po.deliveryTerms ||
    po.lead_time ||
    "7 to 10 days"
  );

  const quotationNo = String(
    po.quotation_number ||
    po.quotationNumber ||
    po.quotation_no ||
    po.quotation_ref ||
    "-"
  ).replace(/₹/g, "Rs. ");

  const quotationDate = po.quotation_date || po.quotationDate
    ? formatPdfDateDash(po.quotation_date || po.quotationDate)
    : "-";

  // Payment Terms string
  let paymentTerms = "30 Days Credit";
  if (po.payment_terms || po.paymentTerms) {
    paymentTerms = String(po.payment_terms || po.paymentTerms);
  } else if (po.payment_type) {
    if (po.advance_percentage) {
      paymentTerms = `Advance Payment (${po.advance_percentage}%)`;
    } else if (po.advance_amount) {
      paymentTerms = `Advance Payment (Rs. ${money(po.advance_amount)})`;
    } else {
      paymentTerms = String(po.payment_type);
    }
  }
  paymentTerms = paymentTerms.replace(/₹/g, "Rs. ");

  // Advance Amount calculation
  let advVal = Number(po.advance_amount || po.advanceAmount || 0);
  if (advVal <= 0 && po.advance_percentage && po.total_amount) {
    advVal = Number(po.total_amount) * (Number(po.advance_percentage) / 100);
  }
  const advanceAmountText = advVal > 0 ? `Rs. ${money(advVal)}` : "N/A";

  // Left Box: SUPPLIER INFO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("SUPPLIER INFO", margin, currentY);

  doc.setFillColor(...COLOR_BG_BOX);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY + 1.5, cardWidth, infoCardHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(supplierName, margin + 4, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_TEXT_GREY);
  const suppAddrLines = doc.splitTextToSize(supplierAddress, cardWidth - 8);
  doc.text(suppAddrLines[0] || "-", margin + 4, currentY + 11.5);

  // GSTIN Row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("GSTIN:", margin + 4, currentY + 17.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(supplierGstin, margin + 18, currentY + 17.5);

  // Email Row
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("Email:", margin + 4, currentY + 23);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_LINK_BLUE);
  doc.text(supplierEmail, margin + 18, currentY + 23);

  // Right Box: DELIVERY & ORDER REFERENCES
  const rightColX = margin + cardWidth + cardGap;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("DELIVERY & ORDER REFERENCES", rightColX, currentY);

  doc.setFillColor(...COLOR_BG_BOX);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(rightColX, currentY + 1.5, cardWidth, infoCardHeight, 2, 2, "FD");

  const refRows = [
    { label: "Delivery Date:", val: expectedDelivery },
    { label: "Quotation No.:", val: quotationNo },
    { label: "Quotation Date:", val: quotationDate },
    { label: "Payment Terms:", val: paymentTerms },
    { label: "Advance Amount:", val: advanceAmountText },
  ];

  const maxValWidth = cardWidth - 34; // 56mm for value
  refRows.forEach((r, idx) => {
    const rowY = currentY + 6 + idx * 4.8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_TEXT_GREY);
    doc.text(r.label, rightColX + 4, rowY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_TEXT_DARK);
    const fittedVal = doc.splitTextToSize(String(r.val), maxValWidth)[0] || String(r.val);
    doc.text(fittedVal, rightColX + cardWidth - 4, rowY, { align: "right" });
  });

  currentY += infoCardHeight + 5.5;

  // ─── 3. Address Section (Billing Address & Destination/Ship-To) ───────────
  const addrCardHeight = 22;

  const billingName = po.billingName || po.firm_name || companyName;
  const billingAddress = po.billingAddress || po.billing_address || companyAddress;

  const rawDestName = po.destinationName || po.deliveryLocation || po.delivery_location || "M/S Nutech Pvt. Ltd.";
  const destName = rawDestName.includes(" - ") ? rawDestName.split(" - ")[0] : rawDestName;
  const destAddress = po.destinationAddress || resolveCompanyAddress(rawDestName);

  // Left: BILLING ADDRESS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("BILLING ADDRESS", margin, currentY);

  doc.setFillColor(...COLOR_BG_BOX);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY + 1.5, cardWidth, addrCardHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(billingName, margin + 4, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_TEXT_GREY);
  const billLines = doc.splitTextToSize(billingAddress, cardWidth - 8);
  doc.text(billLines.slice(0, 2), margin + 4, currentY + 11.5);

  // Right: DESTINATION / SHIP-TO ADDRESS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("DESTINATION / SHIP-TO ADDRESS", rightColX, currentY);

  doc.setFillColor(...COLOR_BG_BOX);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(rightColX, currentY + 1.5, cardWidth, addrCardHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(destName, rightColX + 4, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_TEXT_GREY);
  const destLines = doc.splitTextToSize(destAddress, cardWidth - 8);
  doc.text(destLines.slice(0, 2), rightColX + 4, currentY + 11.5);

  currentY += addrCardHeight + 6;

  // ─── 4. Items Table (autoTable with Two-line item description) ───────────
  const rawItems = Array.isArray(po.items) && po.items.length > 0 ? po.items : [
    {
      srNo: 1,
      itemName: po.item_name || "Material Item",
      indentNumber: cleanIndentNumber(po.indent_number || po.indentNumber || po.indent_id),
      quantity: Number(po.quantity || 1),
      uom: po.uom || "NOS",
      rate: Number(po.unit_rate || po.final_agreed_rate || po.rate || 75),
      hsn: po.hsn_code || po.hsn || "-",
      gst: String(po.gst_rate || po.gst_percent || po.gst || "18").replace("%", ""),
      basicValue: po.basicValue,
      total: po.total_amount || po.total,
    },
  ];

  let calculatedSubtotal = 0;
  let calculatedGst = 0;

  const tableBody = rawItems.map((it, idx) => {
    const qty = Number(it.quantity || 1);
    const rate = Number(it.rate !== undefined ? it.rate : (it.unit_rate !== undefined ? it.unit_rate : 0));
    const rawGst = String(it.gst || it.gstPercent || it.gst_percent || po.gst_rate || "18").replace("%", "");
    const gstPct = Number(rawGst) || 0;

    const baseVal = it.basicValue !== undefined ? Number(it.basicValue) : qty * rate;
    const taxVal = baseVal * (gstPct / 100);
    const totalVal = it.total !== undefined ? Number(it.total) : baseVal + taxVal;

    calculatedSubtotal += baseVal;
    calculatedGst += taxVal;

    const itemNameStr = it.itemName || it.item_name || "Material Item";
    const indentRef = cleanIndentNumber(it.indent_number || it.indentNumber || it.indent_id || po.indent_number || po.indentNumber || po.indent_id);
    const descText = `${itemNameStr}\nIndent: ${indentRef}`;

    return [
      idx + 1,
      descText,
      `${qty} ${it.uom || "NOS"}`.trim(),
      `Rs. ${money(rate)}`,
      it.hsn || it.hsn_code || "-",
      `${gstPct}%`,
      `Rs. ${money(totalVal)}`,
    ];
  });

  const subtotalNum = po.subtotal !== undefined ? Number(po.subtotal) : calculatedSubtotal;
  const gstNum = po.gst !== undefined ? Number(po.gst) : calculatedGst;
  const grandTotalNum = po.grandTotal !== undefined ? Number(po.grandTotal) : (subtotalNum + gstNum);

  autoTable(doc, {
    startY: currentY,
    head: [["S/N", "Item Description", "Qty", "Unit Price", "HSN", "GST", "Total Price"]],
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: COLOR_BG_BOX,
      textColor: COLOR_TEXT_GREY,
      fontStyle: "bold",
      fontSize: 7.5,
      lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
      lineColor: COLOR_BORDER,
      halign: "left",
      valign: "middle",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: COLOR_TEXT_DARK,
      lineWidth: { bottom: 0.15, top: 0, left: 0, right: 0 },
      lineColor: COLOR_BORDER,
      valign: "top",
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 62, fontStyle: "bold" },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 26, halign: "right", textColor: COLOR_LINK_BLUE },
      4: { cellWidth: 18, halign: "center", textColor: COLOR_TEXT_GREY },
      5: { cellWidth: 16, halign: "center", textColor: COLOR_LINK_BLUE },
      6: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: COLOR_TEXT_DARK },
    },
    margin: { left: margin, right: margin },
  });

  let tableFinalY = doc.lastAutoTable.finalY + 3;

  // ─── 5. Totals Block (Right-aligned Summary) ──────────────────────────────
  const summaryWidth = 75;
  const summaryX = margin + contentWidth - summaryWidth;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("Subtotal", summaryX, tableFinalY + 4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(`Rs. ${money(subtotalNum)}`, margin + contentWidth, tableFinalY + 4, { align: "right" });

  // GST Total
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("GST Amount", summaryX, tableFinalY + 9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(`Rs. ${money(gstNum)}`, margin + contentWidth, tableFinalY + 9, { align: "right" });

  // Thin separator above Grand Total
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.25);
  doc.line(summaryX, tableFinalY + 12, margin + contentWidth, tableFinalY + 12);

  // GRAND TOTAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_PRIMARY_PURPLE);
  doc.text("GRAND TOTAL", summaryX, tableFinalY + 17.5);
  doc.text(`Rs. ${money(grandTotalNum)}`, margin + contentWidth, tableFinalY + 17.5, { align: "right" });

  // Amount in Words
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text(`Amount in words: ${amountInWords(Math.round(grandTotalNum))}`, margin, tableFinalY + 17.5);

  currentY = tableFinalY + 24;

  // ─── 6. Terms & Conditions ────────────────────────────────────────────────
  const rawTerms = po.terms || po.termsList || [];
  const termsList = (
    Array.isArray(rawTerms)
      ? rawTerms
      : typeof rawTerms === "string" && rawTerms.trim()
      ? rawTerms.split("\n").filter(Boolean)
      : []
  ).filter((t) => String(t).trim() !== "");

  if (termsList.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_TEXT_GREY);
    doc.text("TERMS & CONDITIONS", margin, currentY);
    currentY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_LINK_BLUE);
    termsList.forEach((t, i) => {
      const cleanTerm = String(t).replace(/^\d+\.\s*/, "").replace(/₹/g, "Rs. ");
      doc.text(`${i + 1}. ${cleanTerm}`, margin, currentY);
      currentY += 3.8;
    });

    currentY += 4;
  }

  // ─── 7. Footer & Signatures ───────────────────────────────────────────────
  const sigY = Math.min(Math.max(currentY + 4, pageHeight - 24), pageHeight - 16);

  // Divider above footer
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY - 2, margin + contentWidth, sigY - 2);

  // Left: Prepared By + System Generated Note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_LINK_BLUE);
  doc.text("Prepared By: Procurement Department", margin, sigY + 3.5);

  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR_TEXT_LIGHT_GREY);
  doc.text("FMS System Generated Document", margin, sigY + 7.5);

  // Right: For [Company Name] + Authorized Signatory
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(`For ${companyName}`, margin + contentWidth, sigY + 3.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_TEXT_GREY);
  doc.text("Authorized Signatory", margin + contentWidth, sigY + 7.5, { align: "right" });

  // Draw frame on all pages
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

/**
 * Generates official Purchase Order (PO) PDF and returns raw Blob without opening in a new tab.
 */
export const generatePoPdfBlob = async (po = {}) => {
  return generatePoPdf(po, { openWindow: false });
};
