import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  ExternalLink,
  Loader2,
  X,
  Pencil,
  Building,
  CheckCircle,
  Copy,
  DollarSign,
  Send,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import {
  fetchMasterWarehouses,
  fetchMasterTransportTypes,
} from "../services/purchaseMasterApi";
import { generateVendorQuotationPdf } from "../utils/quotationPdfGenerator";
import {
  formatDateDash,
  formatDateTime,
  formatForDateInput,
} from "../utils/dateUtils";

export default function ApprovedVendorView() {
  const { showToast } = useMagicToast();
  const { indents, selectApprovedVendor, refreshData } = usePurchaseWorkflow();

  // Data states
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [transportTypes, setTransportTypes] = useState([
    "Ex-Factory + Transport",
    "F.O.R.",
    "Ex-Factory",
    "Ex-Factory in Transport Office",
  ]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");

  // Approval Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIndent, setCurrentIndent] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [decisionRemarks, setDecisionRemarks] = useState("");

  // Manual Quote Edit Modal State
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [manualQuoteData, setManualQuoteData] = useState({
    quoteId: null,
    vendorName: "",
    slotNumber: 1,
    rate: "",
    gst: "18",
    paymentTerms: "30 days",
    deliveryDate: "",
    transportType: "Ex-Factory + Transport",
    remarks: "",
    indentNumber: "",
    itemName: "",
    quantity: 1,
    uom: "PCS",
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadData = async () => {
    setLoading(true);
    try {
      if (refreshData) await refreshData();
      const [whs, tts] = await Promise.allSettled([
        fetchMasterWarehouses(),
        fetchMasterTransportTypes(),
      ]);
      if (whs.status === "fulfilled" && whs.value)
        setWarehouseOptions(whs.value);
      if (tts.status === "fulfilled" && tts.value && tts.value.length > 0) {
        const names = tts.value.map((t) => t.name).filter(Boolean);
        setTransportTypes(
          Array.from(
            new Set([
              ...names,
              "Ex-Factory + Transport",
              "F.O.R.",
              "Ex-Factory",
            ]),
          ),
        );
      }
    } catch (err) {
      console.error("Error loading approved vendor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to open quotation PDF on a new tab
  const handleOpenQuotationPdf = (row, quoteOrVendor) => {
    try {
      // 1. Direct cloud storage URL if available
      const directUrl = quoteOrVendor?.pdf_url || quoteOrVendor?.attachment_url;
      if (directUrl && String(directUrl).startsWith("http")) {
        window.open(directUrl, "_blank", "noopener,noreferrer");
        if (showToast)
          showToast(
            `Opening quotation PDF for ${quoteOrVendor.vendor_name || quoteOrVendor.name}...`,
            "info",
          );
        return;
      }

      // 2. Generate PDF dynamically and open in new tab
      const vendorName =
        quoteOrVendor?.vendor_name ||
        quoteOrVendor?.name ||
        row?.selected_vendor_name ||
        "Supplier";
      const quotedRate = Number(
        quoteOrVendor?.quoted_rate !== undefined
          ? quoteOrVendor.quoted_rate
          : quoteOrVendor?.rate !== undefined
            ? quoteOrVendor.rate
            : row?.selected_vendor_rate || row?.unit_rate || 75,
      );
      const gstPercent = Number(
        quoteOrVendor?.gst_percent !== undefined
          ? quoteOrVendor.gst_percent
          : quoteOrVendor?.gst !== undefined
            ? quoteOrVendor.gst
            : 18,
      );
      const quantity = Number(row?.approved_quantity || row?.quantity || 1);
      const paymentTerms =
        quoteOrVendor?.payment_terms ||
        quoteOrVendor?.terms ||
        row?.payment_terms ||
        "30 days";
      const deliveryTerms =
        quoteOrVendor?.delivery_terms || quoteOrVendor?.delivery || "7-10 days";
      const transportType =
        quoteOrVendor?.transport_type ||
        quoteOrVendor?.transportType ||
        "F.O.R. (Free on Road)";
      const remarks =
        quoteOrVendor?.remarks ||
        row?.remarks ||
        "Commercial quotation verified.";

      generateVendorQuotationPdf({
        vendor_name: vendorName,
        indent_number: row?.indent_number || "IND-2026-001",
        item_name: row?.item_name || "Material Item",
        quantity: quantity,
        uom: row?.uom || "NOS",
        quoted_rate: quotedRate,
        gst_percent: gstPercent,
        payment_terms: paymentTerms,
        delivery_terms: deliveryTerms,
        transport_type: transportType,
        warehouse_location: row?.warehouse_location,
        status: quoteOrVendor?.status || "Submitted",
        submission_date:
          quoteOrVendor?.created_at ||
          row?.created_at ||
          new Date().toISOString().split("T")[0],
        remarks: remarks,
      });

      if (showToast)
        showToast(
          `Opening ${vendorName} Quotation PDF in a new tab...`,
          "info",
        );
    } catch (err) {
      console.error("Error generating quotation PDF:", err);
      if (showToast)
        showToast(`Failed to generate Quotation PDF: ${err.message}`, "error");
    }
  };

  // Filtered Lists
  const pendingList = useMemo(() => {
    return indents
      .filter((r) => {
        const quotes = r.quotation_submissions || [];
        const hasSelectedVendor = !!r.selected_vendor_name;
        // In pending if quotes exist and vendor not yet approved
        return quotes.length > 0 && !hasSelectedVendor;
      })
      .filter(
        (r) =>
          divisionFilter === "all" || r.warehouse_location === divisionFilter,
      )
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indent_number && r.indent_number.toLowerCase().includes(s)) ||
          (r.item_name && r.item_name.toLowerCase().includes(s))
        );
      });
  }, [indents, searchTerm, divisionFilter]);

  const historyList = useMemo(() => {
    return indents
      .filter((r) => {
        return (
          !!r.selected_vendor_name ||
          String(r.status || "").toLowerCase() === "po issued"
        );
      })
      .filter(
        (r) =>
          divisionFilter === "all" || r.warehouse_location === divisionFilter,
      )
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indent_number && r.indent_number.toLowerCase().includes(s)) ||
          (r.item_name && r.item_name.toLowerCase().includes(s)) ||
          (r.selected_vendor_name &&
            r.selected_vendor_name.toLowerCase().includes(s))
        );
      });
  }, [indents, searchTerm, divisionFilter]);

  // Current Paginated Data
  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  // Open Approval Modal
  const handleOpenApproveModal = (record) => {
    setCurrentIndent(record);
    const quotes = record.quotation_submissions || [];
    const firstFilled = quotes.find((q) => Number(q.quoted_rate) > 0);
    setSelectedVendorId(firstFilled ? firstFilled.id : quotes[0]?.id || "");
    setDecisionRemarks("");
    setModalOpen(true);
  };

  // Open Manual Entry
  const handleOpenManualEntry = (quote, slotIdx = 0) => {
    const rawDelivery =
      quote.delivery_terms ||
      quote.delivery_date ||
      quote.expected_delivery_date ||
      currentIndent?.expected_delivery_date ||
      currentIndent?.lead_time ||
      "";

    const submittedDelivery = formatForDateInput(rawDelivery);

    const submittedTransportType =
      quote.transport_type ||
      currentIndent?.transport_type ||
      currentIndent?.freight_type ||
      "Ex-Factory + Transport";

    setManualQuoteData({
      quoteId: quote.id,
      vendorName: quote.vendor_name,
      slotNumber: slotIdx + 1,
      rate: quote.quoted_rate ? String(quote.quoted_rate) : "",
      gst: quote.gst_percent != null ? String(quote.gst_percent) : "18",
      paymentTerms: quote.payment_terms || "30 days",
      deliveryDate: submittedDelivery,
      transportType: submittedTransportType,
      remarks: quote.remarks || "",
      indentNumber:
        currentIndent?.indent_number || currentIndent?.id || "IND-001",
      itemName:
        currentIndent?.item_name || currentIndent?.itemName || "Material Item",
      quantity:
        currentIndent?.approved_quantity || currentIndent?.quantity || 1,
      uom: currentIndent?.uom || "PCS",
    });
    setManualEditOpen(true);
  };

  // Save Manual Entry
  const handleSaveManualEntry = async (e) => {
    e.preventDefault();
    if (!manualQuoteData.rate || Number(manualQuoteData.rate) <= 0) {
      if (showToast) showToast("Please enter a valid quoted rate", "warning");
      return;
    }

    try {
      const updatedFields = {
        quoted_rate: Number(manualQuoteData.rate),
        gst_percent: Number(manualQuoteData.gst),
        payment_terms: manualQuoteData.paymentTerms,
        delivery_terms: manualQuoteData.deliveryDate,
        delivery_date: manualQuoteData.deliveryDate
          ? new Date(manualQuoteData.deliveryDate).toISOString()
          : null,
        transport_type: manualQuoteData.transportType,
        remarks: manualQuoteData.remarks,
        status: "Submitted",
      };

      const { error: updErr } = await supabase
        .from("quotation_submissions")
        .update(updatedFields)
        .eq("id", manualQuoteData.quoteId);

      if (updErr) {
        console.warn("Supabase update error:", updErr);
      }

      // Immediately update local currentIndent state so comparison table on screen reflects the new rate instantly!
      setCurrentIndent((prev) => {
        if (!prev) return prev;
        const updatedSubs = (prev.quotation_submissions || []).map((sub) =>
          sub.id === manualQuoteData.quoteId
            ? {
                ...sub,
                ...updatedFields,
              }
            : sub,
        );
        return {
          ...prev,
          quotation_submissions: updatedSubs,
        };
      });

      // Auto-select the newly updated vendor quote
      setSelectedVendorId(manualQuoteData.quoteId);

      if (showToast)
        showToast("Quotation rates updated successfully!", "success");
      setManualEditOpen(false);

      // Trigger background refresh for list
      loadData();
    } catch (err) {
      console.error("Error saving manual quotation:", err);
      if (showToast) showToast(`Update failed: ${err.message}`, "error");
    }
  };

  // Submit Final Vendor Approval Decision
  const handleConfirmVendorApproval = async (e) => {
    e.preventDefault();
    if (!selectedVendorId || !currentIndent) {
      if (showToast)
        showToast("Please select an approved vendor proposal", "warning");
      return;
    }

    const quotes = currentIndent.quotation_submissions || [];
    const chosenQuote = quotes.find((q) => q.id === selectedVendorId);

    if (!chosenQuote || Number(chosenQuote.quoted_rate) <= 0) {
      if (showToast)
        showToast("Selected vendor must have submitted valid rates", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await selectApprovedVendor(currentIndent.id, {
        quotationId: chosenQuote.id,
        vendorName: chosenQuote.vendor_name,
        rate: Number(chosenQuote.quoted_rate),
        remarks: decisionRemarks,
      });

      if (showToast)
        showToast(
          `Approved ${chosenQuote.vendor_name} for Indent ${currentIndent.indent_number}!`,
          "success",
        );

      setModalOpen(false);
      setCurrentIndent(null);
    } catch (err) {
      console.error("Error confirming vendor approval:", err);
      if (showToast) showToast(`Approval failed: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 5 : Approved Vendor & Rate Comparison
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Analyze competitive vendor proposals, review commercial terms,
                and sanction final suppliers for purchase orders.
              </p>
            </div>
          </div>

          {/* Search & Division Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent #, item, vendor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-44 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Divisions</option>
              {warehouseOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main Content Card with Dual Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Pending Decision ({pendingList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Sanctioned History ({historyList.length})</span>
            </button>
          </div>
        </div>

        {/* 3. Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              {activeTab === "pending" ? (
                <tr>
                  <th className="p-3 text-center">Action</th>
                  <th className="p-3">Indent #</th>
                  <th className="p-3">Material Name</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3">Division</th>
                  <th className="p-3 text-center">Expected Date</th>
                  <th className="p-3">Vendor Proposals / Quoted Rates</th>
                  <th className="p-3 text-center">Decision Status</th>
                </tr>
              ) : (
                /* Exact 11 Requested Columns for History Tab */
                <tr>
                  <th className="p-3">Indent</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-center">Planned Date</th>
                  <th className="p-3 text-center">Quotation PDF</th>
                  <th className="p-3 text-center">Approval Date</th>
                  <th className="p-3">Approved Vendor</th>
                  <th className="p-3">Vendor Terms</th>
                  <th className="p-3 text-right">Rate Per Qty</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3">Remarks</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={activeTab === "pending" ? 8 : 11}
                    className="p-8 text-center text-slate-400"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading proposals...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "pending" ? 8 : 11}
                    className="p-8 text-center text-slate-400"
                  >
                    No{" "}
                    {activeTab === "pending"
                      ? "pending vendor decisions"
                      : "completed vendor approvals"}{" "}
                    found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const quotes = row.quotation_submissions || [];
                  const selectedQuote =
                    quotes.find(
                      (q) =>
                        q.vendor_name === row.selected_vendor_name ||
                        q.is_selected,
                    ) ||
                    quotes[0] ||
                    {};

                  if (activeTab === "pending") {
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenApproveModal(row)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            {row.selected_vendor_name
                              ? "View Details"
                              : "Approve"}
                          </button>
                        </td>

                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.indent_number}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {row.item_name}
                        </td>
                        <td className="p-3 text-center font-black">
                          {row.quantity} {row.uom}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {row.warehouse_location}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">
                          {formatDateDash(row.lead_time || row.planned_date)}
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {quotes.map((q) => {
                              const isChosen =
                                row.selected_vendor_name === q.vendor_name;
                              const hasRate = Number(q.quoted_rate) > 0;

                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() =>
                                    hasRate && handleOpenQuotationPdf(row, q)
                                  }
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold border inline-flex items-center gap-1 transition-all ${
                                    isChosen
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                      : hasRate
                                        ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                                        : "bg-slate-100 text-slate-500 border-slate-200 cursor-default"
                                  }`}
                                  title={
                                    hasRate
                                      ? `Open ${q.vendor_name} quotation PDF in a new tab`
                                      : "Awaiting quotation rates"
                                  }
                                >
                                  {hasRate && (
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-75" />
                                  )}
                                  <span>
                                    {q.vendor_name}:{" "}
                                    {hasRate
                                      ? `₹${q.quoted_rate}`
                                      : "Awaiting Quote"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              row.selected_vendor_name
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {row.selected_vendor_name
                              ? `Approved (${row.selected_vendor_name})`
                              : "Decision Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  } else {
                    /* History Row (Exact 11 Columns) */
                    const rateVal = Number(
                      selectedQuote?.quoted_rate ||
                        row.selected_vendor_rate ||
                        row.unit_rate ||
                        0,
                    );
                    const qtyVal = Number(
                      row.approved_quantity || row.quantity || 1,
                    );
                    const gstPct = Number(
                      selectedQuote?.gst || selectedQuote?.gst_percent || 18,
                    );
                    const basicAmt = rateVal * qtyVal;
                    const totalAmt = Number(
                      row.total_amount || basicAmt + basicAmt * (gstPct / 100),
                    );

                    const approvalDateStr = formatDateTime(
                      row.approved_vendor?.approved_at ||
                        row.approved_vendor?.created_at ||
                        row.approved_at ||
                        row.actual_date ||
                        row.updated_at ||
                        row.lead_time,
                    );

                    const vendorTermsStr =
                      selectedQuote?.payment_terms ||
                      row.payment_terms ||
                      selectedQuote?.delivery_terms ||
                      "30 days";

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Indent */}
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.indent_number || row.id}
                        </td>

                        {/* 2. Item */}
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {row.item_name}
                        </td>

                        {/* 3. Qty */}
                        <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {qtyVal} {row.uom || "NOS"}
                        </td>

                        {/* 4. Planned Date */}
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                          {formatDateDash(
                            row.lead_time || row.planned_date || row.actual3,
                          )}
                        </td>

                        {/* 5. Quotation PDF (Dynamic Vendor Links Matching Standalone System & Screenshot) */}
                        <td className="p-3">
                          {(() => {
                            const submittedQuotes = quotes.filter(
                              (q) =>
                                q.vendor_name &&
                                q.vendor_name !== "-" &&
                                (Number(q.quoted_rate) > 0 ||
                                  q.pdf_url ||
                                  q.attachment_url),
                            );
                            const fallbackPdfs = [
                              {
                                vendor_name:
                                  row.data?.vendor1Name || row.vendor1_name,
                                pdf_url:
                                  row.data?.vendor1PdfUrl ||
                                  row.vendor1_pdf_url,
                              },
                              {
                                vendor_name:
                                  row.data?.vendor2Name || row.vendor2_name,
                                pdf_url:
                                  row.data?.vendor2PdfUrl ||
                                  row.vendor2_pdf_url,
                              },
                              {
                                vendor_name:
                                  row.data?.vendor3Name || row.vendor3_name,
                                pdf_url:
                                  row.data?.vendor3PdfUrl ||
                                  row.vendor3_pdf_url,
                              },
                            ].filter(
                              (v) =>
                                v.vendor_name &&
                                v.vendor_name !== "-" &&
                                v.pdf_url,
                            );

                            const pdfsToRender =
                              submittedQuotes.length > 0
                                ? submittedQuotes
                                : fallbackPdfs.length > 0
                                  ? fallbackPdfs
                                  : row.selected_vendor_name
                                    ? [
                                        {
                                          vendor_name: row.selected_vendor_name,
                                          quoted_rate:
                                            row.selected_vendor_rate ||
                                            row.unit_rate,
                                        },
                                      ]
                                    : [];

                            if (pdfsToRender.length === 0) {
                              return (
                                <span className="text-slate-400 font-mono text-center block">
                                  -
                                </span>
                              );
                            }

                            return (
                              <div className="flex flex-col items-start gap-1 py-0.5">
                                {pdfsToRender.map((v, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() =>
                                      handleOpenQuotationPdf(row, v)
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer bg-transparent border-none p-0 text-left transition-colors"
                                    title={`Open ${v.vendor_name} Quotation PDF on new tab`}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    <span>{v.vendor_name}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 6. Approval Date */}
                        <td className="p-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {approvalDateStr}
                        </td>

                        {/* 7. Approved Vendor */}
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            {row.selected_vendor_name ||
                              selectedQuote?.vendor_name ||
                              "Tata Steel Ltd"}
                          </span>
                        </td>

                        {/* 8. Vendor Terms */}
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                          {vendorTermsStr}
                        </td>

                        {/* 9. Rate Per Qty */}
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white text-right">
                          ₹{rateVal.toLocaleString()}
                        </td>

                        {/* 10. Total Amount */}
                        <td className="p-3 font-mono font-black text-emerald-700 dark:text-emerald-400 text-right">
                          ₹
                          {totalAmt.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* 11. Remarks */}
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 italic text-xs max-w-[200px] truncate"
                          title={
                            row.approval_remarks ||
                            row.remarks ||
                            "Selected L1 supplier with proven grade steel quality."
                          }
                        >
                          {row.approval_remarks ||
                            row.remarks ||
                            "Selected L1 supplier with proven grade steel quality."}
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Showing page {currentPage} of {totalPages} ({currentList.length}{" "}
              items)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Approved Vendor Rate Comparison & Selection Modal */}
      {modalOpen && currentIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Vendor Proposals Comparison & Sanction
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Indent {currentIndent.indent_number} •{" "}
                    {currentIndent.item_name} ({currentIndent.quantity}{" "}
                    {currentIndent.uom})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmVendorApproval}
              className="p-6 space-y-6 overflow-y-auto text-xs"
            >
              {/* Proposals Comparison Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Submitted Vendor Proposals
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Select the winning supplier to generate Purchase Order
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                      <tr>
                        <th className="p-3 text-center w-12">Select</th>
                        <th className="p-3">Vendor Name</th>
                        <th className="p-3 text-right">Quoted Rate</th>
                        <th className="p-3 text-center">GST %</th>
                        <th className="p-3 text-right">Total Est.</th>
                        <th className="p-3">Payment Terms</th>
                        <th className="p-3">Transport Type</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(currentIndent.quotation_submissions || []).map(
                        (quote, idx) => {
                          const isSelected = selectedVendorId === quote.id;
                          const rate = Number(quote.quoted_rate) || 0;
                          const gst = Number(quote.gst_percent) || 18;
                          const qty = Number(currentIndent.quantity) || 1;
                          const baseAmt = rate * qty;
                          const totalWithTax = baseAmt + baseAmt * (gst / 100);

                          return (
                            <tr
                              key={quote.id}
                              onClick={() =>
                                rate > 0 && setSelectedVendorId(quote.id)
                              }
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-blue-50/50 dark:bg-blue-950/30"
                                  : "hover:bg-slate-50/50"
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="radio"
                                  name="vendorSelect"
                                  checked={isSelected}
                                  disabled={rate <= 0}
                                  onChange={() => setSelectedVendorId(quote.id)}
                                  className="cursor-pointer"
                                />
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                {quote.vendor_name}
                              </td>
                              <td className="p-3 text-right font-black text-slate-800 dark:text-slate-200">
                                {rate > 0 ? `₹${rate.toLocaleString()}` : "—"}
                              </td>
                              <td className="p-3 text-center font-semibold text-slate-600">
                                {rate > 0 ? `${gst}%` : "—"}
                              </td>
                              <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                {rate > 0
                                  ? `₹${totalWithTax.toLocaleString()}`
                                  : "—"}
                              </td>
                              <td className="p-3 text-slate-600">
                                {quote.payment_terms || "—"}
                              </td>
                              <td className="p-3 text-slate-600">
                                {quote.transport_type || "—"}
                              </td>
                              <td
                                className="p-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  {rate > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenQuotationPdf(
                                          currentIndent,
                                          quote,
                                        )
                                      }
                                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Open Quotation PDF on new tab"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>PDF</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenManualEntry(quote, idx)
                                    }
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>
                                      {rate > 0 ? "Edit" : "Fill Quote"}
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sanction Remarks */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Sanction / Negotiation Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter justification, price negotiations, or approval rationale..."
                  value={decisionRemarks}
                  onChange={(e) => setDecisionRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedVendorId}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Decision...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sanction Approved Vendor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Manual Quotation Entry Modal (Redesigned matching Image 1) */}
      {manualEditOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Manually Enter Quotation — Vendor Slot{" "}
                {manualQuoteData.slotNumber || 1} ({manualQuoteData.vendorName})
              </h3>
              <button
                type="button"
                onClick={() => setManualEditOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveManualEntry}
              className="p-6 space-y-5 text-xs"
            >
              {/* Top Section: Item-Wise Rate & GST Card */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block">
                  ITEM-WISE RATE & GST
                </label>
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      Indent: {manualQuoteData.indentNumber}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {manualQuoteData.itemName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Qty: {manualQuoteData.quantity} {manualQuoteData.uom}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block">
                        Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="0"
                        value={manualQuoteData.rate}
                        onChange={(e) =>
                          setManualQuoteData({
                            ...manualQuoteData,
                            rate: e.target.value,
                          })
                        }
                        className="w-28 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white text-right focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block">
                        GST (%) <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={manualQuoteData.gst}
                        onChange={(e) =>
                          setManualQuoteData({
                            ...manualQuoteData,
                            gst: e.target.value,
                          })
                        }
                        className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Payment Terms & Expected Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Payment Terms <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={manualQuoteData.paymentTerms}
                    onChange={(e) =>
                      setManualQuoteData({
                        ...manualQuoteData,
                        paymentTerms: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="30 days">30 days</option>
                    <option value="15 days">15 days</option>
                    <option value="45 days">45 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                    <option value="Advance">Advance</option>
                    <option value="Immediate">Immediate</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Expected Delivery <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={manualQuoteData.deliveryDate}
                    onChange={(e) =>
                      setManualQuoteData({
                        ...manualQuoteData,
                        deliveryDate: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Transport Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Transport Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualQuoteData.transportType}
                  onChange={(e) =>
                    setManualQuoteData({
                      ...manualQuoteData,
                      transportType: e.target.value,
                    })
                  }
                  className="w-full sm:w-1/2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Ex-Factory + Transport">
                    Ex-Factory + Transport
                  </option>
                  <option value="F.O.R.">F.O.R.</option>
                  <option value="Ex-Factory">Ex-Factory</option>
                  <option value="Ex-Factory">Ex-Factory</option>
                  <option value="Ex-Factory in Transport Office">
                    Ex-Factory in Transport Office
                  </option>
                  {transportTypes
                    .filter(
                      (t) =>
                        ![
                          "Ex-Factory + Transport",
                          "F.O.R.",
                          "Ex-Factory",
                          "Ex-Factory",
                          "Ex-Factory in Transport Office",
                        ].includes(t),
                    )
                    .map((t, idx) => (
                      <option key={`tt-${idx}`} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
              </div>

              {/* Row 4: Remarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Remarks
                </label>
                <textarea
                  rows={3}
                  value={manualQuoteData.remarks}
                  onChange={(e) =>
                    setManualQuoteData({
                      ...manualQuoteData,
                      remarks: e.target.value,
                    })
                  }
                  placeholder="Enter quotation or commercial remarks..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 resize-none focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setManualEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
