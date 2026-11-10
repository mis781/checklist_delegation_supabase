import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate PDF report for MIS Dashboard Weekly Review
 */
export function exportMisDashboardPdf({
  kpiCards = {},
  peopleRows = [],
  dateRangeDisplay = "",
  periodType = "Weekly",
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Background Banner
  doc.setFillColor(30, 58, 138); // Deep royal blue (#1E3A8A)
  doc.rect(0, 0, pageWidth, 60, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("MIS - WEEKLY REVIEW REPORT", 40, 36);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 230, 255);
  doc.text(`Period: ${dateRangeDisplay} (${periodType})  |  Generated on: ${new Date().toLocaleDateString()}`, 40, 50);

  // Executive KPI Summary Bar
  doc.setFillColor(248, 250, 252);
  doc.rect(40, 75, pageWidth - 80, 50, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(40, 75, pageWidth - 80, 50, "S");

  const kpis = [
    { label: "EMPLOYEES", val: String(kpiCards.totalEmployees || 0) },
    { label: "TARGET", val: String(kpiCards.totalTarget || 0) },
    { label: "COMPLETED", val: String(kpiCards.completed || 0) },
    { label: "PENDING", val: String(kpiCards.pendingPeriod || 0) },
    { label: "ALL PENDING", val: String(kpiCards.allPending || 0) },
    { label: "COMPLETION", val: `${kpiCards.completionRate || 0}%` },
    { label: "SCORE", val: kpiCards.overallScore || "Positive (+)" },
  ];

  const colW = (pageWidth - 80) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * colW + colW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(kpi.val, x, 96, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x, 112, { align: "center" });
  });

  // Table Data Preparation
  const head = [
    [
      { content: "THIS PERIOD", colSpan: 9, styles: { halign: "center", fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" } },
      { content: "LAST WEEK - COMMITMENT", colSpan: 3, styles: { halign: "center", fillColor: [254, 242, 242], textColor: [153, 27, 27], fontStyle: "bold" } },
    ],
    [
      "NAME",
      "DESIGNATION",
      "TARGET",
      "ACTUAL DONE",
      "% DONE",
      "% ON TIME",
      "TOTAL DONE",
      "PENDING",
      "ALL PENDING",
      "PLANNED % NOT DONE",
      "PLANNED % LATE",
      "COMMITMENT",
    ],
  ];

  const body = peopleRows.map((r) => [
    `${r.user_name}\n(${r.company})`,
    r.designation || "Employee",
    String(r.target || 0),
    String(r.actualWorkDone || 0),
    r.percentDone !== null ? `${r.percentDone}%` : "—",
    r.percentDoneOnTime !== null ? `${r.percentDoneOnTime}%` : "—",
    String(r.totalWorkDone || 0),
    String(r.pending || 0),
    String(r.allPending || 0),
    `${r.plannedPercentNotDone || 0}%`,
    `${r.plannedPercentNotDoneOnTime || 0}%`,
    r.commitment || "—",
  ]);

  autoTable(doc, {
    startY: 140,
    head: head,
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "bold" },
      1: { cellWidth: 65 },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 45, halign: "center" },
      4: { cellWidth: 40, halign: "center" },
      5: { cellWidth: 45, halign: "center" },
      6: { cellWidth: 45, halign: "center" },
      7: { cellWidth: 40, halign: "center" },
      8: { cellWidth: 45, halign: "center" },
      9: { cellWidth: 65, halign: "center" },
      10: { cellWidth: 55, halign: "center" },
      11: { cellWidth: "auto" },
    },
    margin: { left: 40, right: 40 },
  });

  const filename = `MIS_Weekly_Review_${dateRangeDisplay.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(filename);
}

/**
 * Generate PDF report for KPI & KRA Dashboard
 */
export function exportKpiKraPdf({ kpiData = {}, systemsResources = [] }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 70, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("KPI & KRA SPECIFICATION", 40, 40);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 230, 255);
  doc.text(`Employee: ${kpiData.user_name || "N/A"}  |  Role Architecture & Enterprise Resources`, 40, 58);

  // Profile Grid
  let y = 95;
  const cardW = (pageWidth - 90) / 2;

  // Box 1: Designation & Role
  doc.setFillColor(248, 250, 252);
  doc.rect(40, y, cardW, 70, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(40, y, cardW, 70, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("OFFICIAL DESIGNATION", 50, y + 20);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(kpiData.official_designation || "Employee", 50, y + 40);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(kpiData.primary_role || "No role description", 50, y + 55);

  // Box 2: Task Velocity
  doc.rect(50 + cardW, y, cardW, 70, "F");
  doc.rect(50 + cardW, y, cardW, 70, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("TARGET TASK VELOCITY", 60 + cardW, y + 20);
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129);
  doc.text(`${kpiData.task_velocity || 0} ${kpiData.task_velocity_unit || "daily tasks"}`, 60 + cardW, y + 45);

  y += 85;

  // Box 3: Communication Protocol
  doc.rect(40, y, pageWidth - 80, 55, "F");
  doc.rect(40, y, pageWidth - 80, 55, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("COMMUNICATION PROTOCOL & REPORTING", 50, y + 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`Methodology: ${kpiData.methodology || "Standard Daily Standup"}`, 50, y + 36);
  doc.text(`Key Reporting Person: ${kpiData.key_reporting_person || "N/A"}`, 320, y + 36);

  y += 75;

  // Enterprise Systems Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Systems & Resources (Enterprise Tools Architecture)", 40, y);

  const sysBody = systemsResources.map((s) => [
    s.platform,
    s.objective,
    s.context_description,
    s.access_point,
  ]);

  autoTable(doc, {
    startY: y + 10,
    head: [["PLATFORM", "OBJECTIVE", "CONTEXT / DESCRIPTION", "ACCESS POINT"]],
    body: sysBody,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: "bold" },
      1: { cellWidth: 130 },
      2: { cellWidth: 190 },
      3: { cellWidth: "auto", textColor: [37, 99, 235] },
    },
    margin: { left: 40, right: 40 },
  });

  const filename = `KPI_KRA_${(kpiData.user_name || "Profile").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(filename);
}
