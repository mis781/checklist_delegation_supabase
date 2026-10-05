import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  Printer,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileCheck,
} from "lucide-react";
import {
  prepareBatchDetailData,
  downloadBatchDetailPdf,
  generateBatchDetailPdf,
  ROWS_PER_PAGE,
} from "./batchDetailPdfTemplate";

export default function BatchDetailPdfModal({ isOpen, onClose, materials = [] }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed page
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState("paged"); // 'paged' | 'continuous'

  // Prepare grouped & filtered data
  const data = useMemo(() => {
    return prepareBatchDetailData(materials);
  }, [materials]);

  const { rows, groups, activeRowsCount, pages, blocks } = data;

  const formattedDate = useMemo(() => {
    if (!selectedDate) return new Date().toLocaleDateString("en-GB");
    const [y, m, d] = selectedDate.split("-");
    return `${d}/${m}/${y}`;
  }, [selectedDate]);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      const d = selectedDate ? new Date(selectedDate) : new Date();
      downloadBatchDetailPdf(materials, { date: d });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    setIsGenerating(true);
    try {
      const d = selectedDate ? new Date(selectedDate) : new Date();
      const doc = generateBatchDetailPdf(materials, { date: d });
      const blobUrl = doc.output("bloburl");
      const printWindow = window.open(blobUrl, "_blank");
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      console.error("Failed to print PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to render a single page of the table sheet
  const renderSheetPage = (pageIndex) => {
    const from = pageIndex * ROWS_PER_PAGE;
    const to = Math.min(from + ROWS_PER_PAGE, rows.length);
    const pageRows = rows.slice(from, to);

    // Filter right-side blocks that intersect this page
    const pageBlocks = blocks
      .map((b) => {
        const s = Math.max(b.start, from);
        const e = Math.min(b.end, to);
        if (e <= s) return null;
        return {
          ...b,
          pageStart: s - from,
          pageEnd: e - from,
          rowCount: e - s,
          isBlockStart: s === b.start,
        };
      })
      .filter(Boolean);

    // Compute which row index in page gets which block rendered (rowspan)
    const blockAtRow = {};
    pageBlocks.forEach((b) => {
      blockAtRow[b.pageStart] = b;
    });

    const isLastPage = pageIndex === pages - 1;

    return (
      <div
        key={pageIndex}
        className="bg-white text-black shadow-2xl rounded-sm border border-gray-400 mx-auto mb-8 p-3 w-full max-w-[820px] font-sans select-text print:m-0 print:p-0 print:border-none print:shadow-none"
        style={{ minHeight: "1080px" }}
      >
        {/* Banner */}
        <div
          className="text-white text-center font-black py-1.5 px-3 text-sm md:text-base tracking-wider uppercase border border-black"
          style={{ backgroundColor: "#4c1130" }}
        >
          NUTECH COMPOSITE- BATCH DETAIL
        </div>

        {/* Date and Shift Subheader */}
        <div className="grid grid-cols-12 border-x border-b border-black text-xs md:text-sm font-bold">
          <div className="col-span-8 p-1.5 pl-3 border-r border-black flex items-center gap-2">
            <span>DATE :</span>
            <span className="font-semibold">{formattedDate}</span>
          </div>
          <div className="col-span-4 p-1.5 pl-3 flex items-center">
            <span>SHIFT- DAY / NIGHT</span>
          </div>
        </div>

        {/* Main Grid Table */}
        <table className="w-full border-collapse border-x border-b border-black text-[11px] leading-tight">
          <thead>
            <tr className="border-b border-black text-center font-bold text-[10px] md:text-xs">
              <th
                className="border-r border-black p-1 w-[8%]"
                style={{ backgroundColor: "#a9d08e", color: "#0b5394" }}
              >
                S.NO
              </th>
              <th
                className="border-r border-black p-1 w-[26%]"
                style={{ backgroundColor: "#a9d08e" }}
              >
                SUB- CATEGORY NAME
              </th>
              <th
                className="border-r border-black p-1 w-[38%]"
                style={{ backgroundColor: "#a9d08e" }}
              >
                SKU CODE
              </th>
              <th
                className="border-r border-black p-1 w-[10%] text-white"
                style={{ backgroundColor: "#0b5394" }}
              >
                QTY.
              </th>
              <th
                className="p-1 w-[18%] border-l border-black"
                style={{ backgroundColor: "#f8fafc" }}
                colSpan={2}
              >
                BATCH PARAMETERS
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, localIdx) => {
              const globalIdx = from + localIdx;

              // Determine if this row is the start of a category block ON THIS PAGE
              const isCatStartOnPage =
                localIdx === 0 ||
                pageRows[localIdx - 1].name !== r.name ||
                !r.name;

              // Calculate category rowspan on this page
              let catRowSpan = 1;
              if (isCatStartOnPage && r.name) {
                while (
                  localIdx + catRowSpan < pageRows.length &&
                  pageRows[localIdx + catRowSpan].name === r.name
                ) {
                  catRowSpan++;
                }
              }

              // Check right-side block starting on this row
              const rBlock = blockAtRow[localIdx];

              return (
                <tr
                  key={globalIdx}
                  className="border-b border-black hover:bg-slate-50 transition-colors"
                  style={{ height: "23px" }}
                >
                  {/* S.NO */}
                  <td className="border-r border-black text-center font-medium px-1 py-0.5 text-slate-800">
                    {r.isEmptySlot ? (
                      <span className="text-gray-300 font-light">{r.sno}</span>
                    ) : (
                      r.sno
                    )}
                  </td>

                  {/* SUB- CATEGORY NAME (spans multiple rows in group) */}
                  {isCatStartOnPage && (
                    <td
                      rowSpan={catRowSpan}
                      className="border-r border-black text-center font-black px-1.5 py-0.5 text-black align-middle uppercase tracking-wide break-words"
                      style={{
                        backgroundColor: r.color || "#ffffff",
                        maxWidth: "180px",
                      }}
                    >
                      {r.name}
                    </td>
                  )}

                  {/* SKU CODE */}
                  <td
                    className="border-r border-black text-left font-medium px-2 py-0.5 text-black tracking-tight truncate"
                    style={{ backgroundColor: r.color || "#ffffff" }}
                  >
                    {r.sku}
                  </td>

                  {/* QTY (Blank for factory write-in) */}
                  <td className="border-r border-black text-center bg-white"></td>

                  {/* RIGHT-HAND BLOCKS */}
                  {rBlock ? (
                    <>
                      <td
                        rowSpan={rBlock.rowCount}
                        className="border-r border-black text-center font-bold px-1 py-0.5 text-black align-middle uppercase text-[10px] break-words"
                        style={{
                          backgroundColor: rBlock.color,
                          width: "10%",
                        }}
                      >
                        {rBlock.isBlockStart && (
                          <div className="whitespace-pre-line leading-snug">
                            {rBlock.label}
                          </div>
                        )}
                      </td>
                      <td
                        rowSpan={rBlock.rowCount}
                        className="text-right px-2 py-0.5 align-middle bg-white relative"
                        style={{ width: "8%" }}
                      >
                        {rBlock.batch && rBlock.isBlockStart && (
                          <span className="text-blue-700 font-bold text-[11px]">
                            Batch
                          </span>
                        )}
                      </td>
                    </>
                  ) : null}
                </tr>
              );
            })}

            {/* Total Row on the Last Page */}
            {isLastPage && (
              <tr
                className="border-t-2 border-black font-black text-xs"
                style={{ height: "26px" }}
              >
                <td
                  colSpan={3}
                  className="border-r border-black text-right pr-4 tracking-wider uppercase"
                >
                  TOTAL -
                </td>
                <td className="border-r border-black text-center bg-white"></td>
                <td colSpan={2} className="bg-slate-100"></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Page Footer */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 px-1">
          <span>Nutech Composite Industries — Factory Batch Detail Record</span>
          <span>
            Page {pageIndex + 1} of {pages}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="bg-white dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 rounded-xl">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Batch Detail Format
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {activeRowsCount} Raw Materials (Opening &gt; 0)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official factory production sheet grouped by Material Name with merged SKU rows
              </p>
            </div>
          </div>

          {/* Controls: Date, Page Switcher, Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <Calendar size={14} className="text-slate-500" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Sheet Date:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-semibold text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setViewMode("paged")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  viewMode === "paged"
                    ? "bg-white dark:bg-slate-950 text-violet-600 dark:text-violet-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Paged
              </button>
              <button
                onClick={() => setViewMode("continuous")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  viewMode === "continuous"
                    ? "bg-white dark:bg-slate-950 text-violet-600 dark:text-violet-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Pages
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Print Sheet"
            >
              <Printer size={14} />
              Print
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-violet-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download size={14} />
              {isGenerating ? "Generating..." : "Download PDF"}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950/80 flex flex-col items-center">
          {activeRowsCount === 0 ? (
            <div className="my-auto text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 max-w-md">
              <FileCheck size={40} className="text-amber-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Raw Materials with Opening Stock &gt; 0
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The batch detail sheet strictly displays raw materials whose opening stock is positive. Please check material stock balances.
              </p>
            </div>
          ) : viewMode === "continuous" ? (
            // Continuous view: render all pages
            Array.from({ length: pages }).map((_, pIdx) => renderSheetPage(pIdx))
          ) : (
            // Paged view: render single page with navigation
            <div className="w-full flex flex-col items-center">
              {renderSheetPage(currentPage)}

              {/* Bottom Pagination Bar */}
              {pages > 1 && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 mt-2 mb-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Page {currentPage + 1} of {pages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(pages - 1, p + 1))
                    }
                    disabled={currentPage === pages - 1}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
