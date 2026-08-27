import React, { useState, useEffect, useMemo } from "react";
import {
  MessagesSquare,
  Search,
  CheckCircle,
  Copy,
  ExternalLink,
  Download,
  FileText,
  Loader2,
  X,
  Building,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import {
  fetchMasterVendors,
  fetchMasterWarehouses,
  fetchMasterAddresses,
} from "../services/purchaseMasterApi";
import { generateRfqPdf, generateVendorQuotationPdf } from "../utils/purchasePdfGenerator";
import { formatDateDash, formatDateTime, toLocalIsoTimestamp } from "../utils/dateUtils";

const NUTECH_ADDRESS =
  "Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, Chattisgarh 493111, India";

const DEFAULT_ADDRESS_OPTIONS = [
  { name: "M/S Nutech Pvt. Ltd.", address: NUTECH_ADDRESS },
  { name: "Nutech Plant 1 - Raipur Factory Gate 2", address: "Plot 12-16, Industrial Area Phase II, Urla, Raipur, CG 493221" },
  { name: "Nutech Division A - Bhilai Unit", address: "Light Industrial Area, Nandini Road, Bhilai, CG 490026" },
  { name: "Nutech Division B - Bilaspur Central Store", address: "Transport Nagar, Korba Road, Bilaspur, CG 495004" },
];

const DEFAULT_QUOTATION_TERMS = [];

const cleanCompanyName = (name) => {
  if (!name) return "Company Address";
  if (typeof name !== "string") return String(name);
  if (name.includes(" - ")) {
    const parts = name.split(" - ");
    return parts.slice(1).join(" - ").trim();
  }
  return name.trim();
};

export default function QuotationView() {
  const { showToast } = useMagicToast();
  const { indents, submitQuotations, refreshData } = usePurchaseWorkflow();

  // Data states
  const [dbVendors, setDbVendors] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [addressOptions, setAddressOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRecords, setCurrentRecords] = useState([]);
  const [emailSent, setEmailSent] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState([]);

  // RFQ Form State
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [gstin, setGstin] = useState("22AAACN1234F1Z9");
  const [pan, setPan] = useState("AAACN1234F");
  const [billingCompany, setBillingCompany] = useState("M/S Nutech Pvt. Ltd.");
  const [billingAddress, setBillingAddress] = useState(NUTECH_ADDRESS);
  const [destCompany, setDestCompany] = useState("Nutech Plant 1 - Raipur Factory Gate 2");
  const [destAddress, setDestAddress] = useState("Plot 12-16, Industrial Area Phase II, Urla, Raipur, CG 493221");
  const [descriptionNote, setDescriptionNote] = useState("");

  const combinedAddressOptions = useMemo(() => {
    const list = addressOptions && addressOptions.length > 0 ? addressOptions : DEFAULT_ADDRESS_OPTIONS;
    return list.map((a) => {
      const rawName = a.rawName || a.name || a.title || "";
      const cleaned = cleanCompanyName(rawName);
      return {
        name: cleaned,
        fullName: a.name || rawName,
        address: a.address || a.address_line || NUTECH_ADDRESS,
      };
    });
  }, [addressOptions]);
  
  // Custom Quotation Terms & Conditions for RFQ package
  const [terms, setTerms] = useState(DEFAULT_QUOTATION_TERMS);
  const [newTerm, setNewTerm] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadData = async () => {
    setLoading(true);
    try {
      if (refreshData) await refreshData();

      // Fetch master vendors from Supabase
      const vendors = await fetchMasterVendors();
      const vList = (vendors || [])
        .map((v) => (typeof v === "string" ? v : v.vendor_name || v.name))
        .filter(Boolean);
      setDbVendors(Array.from(new Set(vList)));

      // Fetch warehouses
      const whs = await fetchMasterWarehouses();
      setWarehouseOptions(whs || []);

      // Fetch addresses
      try {
        const addrs = await fetchMasterAddresses();
        if (addrs && addrs.length > 0) {
          setAddressOptions(addrs);
          const firstClean = cleanCompanyName(addrs[0].name || addrs[0].rawName);
          const secondClean = cleanCompanyName(addrs[1]?.name || addrs[1]?.rawName || addrs[0].name);
          setBillingCompany(firstClean);
          setBillingAddress(addrs[0].address || NUTECH_ADDRESS);
          setDestCompany(secondClean);
          setDestAddress(addrs[1]?.address || addrs[0].address || NUTECH_ADDRESS);
        }
      } catch {}
    } catch (err) {
      console.error("Error loading quotation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Lists (Only Regular Vendor Indents that need RFQ Quotes)
  const pendingList = useMemo(() => {
    return indents
      .filter((r) => {
        const quotes = r.quotation_submissions || [];
        const status = String(r.status || "").toLowerCase();
        const vType = String(r.vendor_type || r.vendorType || "regular").toLowerCase();
        const isNewVendor = vType === "new vendor" || vType === "new";
        return status === "approved" && quotes.length === 0 && !isNewVendor;
      })
      .filter((r) => divisionFilter === "all" || r.warehouse_location === divisionFilter)
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
        const quotes = r.quotation_submissions || [];
        return quotes.length > 0 || String(r.status || "").toLowerCase() === "po issued";
      })
      .filter((r) => divisionFilter === "all" || r.warehouse_location === divisionFilter)
      .filter((r) => {
        const s = searchTerm.toLowerCase();
        if (!s) return true;
        return (
          (r.indent_number && r.indent_number.toLowerCase().includes(s)) ||
          (r.item_name && r.item_name.toLowerCase().includes(s))
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

  // Checkbox Selection
  const toggleRecord = (id) => {
    setSelectedRecordIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selectedRecordIds.length === pendingList.length) setSelectedRecordIds([]);
    else setSelectedRecordIds(pendingList.map((r) => r.id));
  };

  // Open RFQ Form Modal
  const handleOpenForm = (recordId) => {
    const rec = indents.find((r) => r.id === recordId);
    if (!rec) return;

    // Refresh vendor list from master_vendors
    fetchMasterVendors().then((vendors) => {
      const vList = (vendors || [])
        .map((v) => (typeof v === "string" ? v : v.vendor_name || v.name))
        .filter(Boolean);
      if (vList.length > 0) setDbVendors(Array.from(new Set(vList)));
    }).catch(() => {});

    setCurrentRecords([rec]);
    setSelectedRecordIds([rec.id]);

    const quotes = rec.quotation_submissions || [];
    if (quotes.length > 0) {
      const vNames = quotes.map((q) => q.vendor_name);
      setSelectedVendors(vNames);
      const links = vNames.map((v, i) => ({
        name: v,
        link: `${window.location.origin}/quotation-form?ids=${rec.id}&v=${i + 1}`,
      }));
      setGeneratedLinks(links);
      setEmailSent(true);
    } else {
      setSelectedVendors([]);
      setEmailSent(false);
      setGeneratedLinks([]);
    }

    setModalOpen(true);
  };

  const handleOpenBulkForm = () => {
    if (selectedRecordIds.length === 0) {
      if (showToast) showToast("Please select at least one indent", "warning");
      return;
    }

    // Refresh vendor list from master_vendors
    fetchMasterVendors().then((vendors) => {
      const vList = (vendors || [])
        .map((v) => (typeof v === "string" ? v : v.vendor_name || v.name))
        .filter(Boolean);
      if (vList.length > 0) setDbVendors(Array.from(new Set(vList)));
    }).catch(() => {});

    const recs = indents.filter((r) => selectedRecordIds.includes(r.id));
    setCurrentRecords(recs);
    setSelectedVendors([]);
    setEmailSent(false);
    setGeneratedLinks([]);
    setModalOpen(true);
  };

  // Add Term: Adds custom term directly to this quotation's list
  const handleAddTerm = () => {
    const raw = newTerm.trim();
    if (!raw) return;

    const cleaned = raw.replace(/^\d+\.\s*/, "").trim();
    if (!cleaned) return;

    if (terms.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      if (showToast) showToast("This term is already in the quotation list", "info");
      setNewTerm("");
      return;
    }

    setTerms((prev) => [...prev, cleaned]);
    setNewTerm("");
  };

  // Remove Term from active quotation
  const handleRemoveTerm = (index) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  };

  // Send RFQ & Generate Public Links
  const handleSendRFQ = async () => {
    if (selectedVendors.length === 0) {
      if (showToast) showToast("Please select at least one vendor from the Master list", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create initial quotation submission entries with blank rates (to be filled by vendor)
      for (const rec of currentRecords) {
        const quoteList = selectedVendors.map((vName) => ({
          vendor_name: vName,
          quoted_rate: null,
          gst_percent: null,
          delivery_terms: "",
          payment_terms: "",
          transport_type: "",
          status: "Pending Response",
        }));
        await submitQuotations(rec.id, quoteList);
      }

      // Generate public RFQ links
      const idsParam = currentRecords.map((r) => r.id).join(",");
      const links = selectedVendors.map((v, i) => ({
        name: v,
        link: `${window.location.origin}/quotation-form?ids=${idsParam}&v=${i + 1}`,
      }));

      setGeneratedLinks(links);
      setEmailSent(true);
      if (showToast) showToast("Enquiries generated! Share quotation links with suppliers.", "success");
    } catch (err) {
      console.error("RFQ send error:", err);
      if (showToast) showToast(`Failed to generate enquiry: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadRfqPdf = () => {
    try {
      const formattedTerms = terms.map((t, idx) => {
        return /^\d+\./.test(t) ? t : `${idx + 1}. ${t}`;
      });
      generateRfqPdf({
        suppliers: selectedVendors,
        gstin,
        pan,
        billingCompany,
        billingAddress,
        destCompany,
        destAddress,
        descriptionNote,
        items: currentRecords,
        terms: formattedTerms,
      });
      if (showToast) showToast("Opening RFQ PDF in a new tab...", "info");
    } catch (err) {
      console.error("RFQ PDF generation error:", err);
      if (showToast) showToast("Failed to generate RFQ PDF", "error");
    }
  };

  const handleDownloadVendorQuotationPdf = (row, quote) => {
    try {
      generateVendorQuotationPdf({
        vendor_name: quote?.vendor_name || row.selected_vendor_name || "Vendor",
        indent_number: row.indent_number,
        item_name: row.item_name,
        quantity: row.quantity,
        uom: row.uom,
        quoted_rate: quote?.quoted_rate || quote?.final_agreed_rate || 75,
        gst_percent: quote?.gst_percent || 18,
        delivery_terms: quote?.delivery_terms || "7 days",
        payment_terms: quote?.payment_terms || "30 days post delivery",
        transport_type: quote?.transport_type || "F.O.R. (Free on Road)",
        warehouse_location: row.warehouse_location,
        status: quote?.status || "Accepted",
        submission_date: quote?.created_at || row.created_at,
      });
      if (showToast) showToast(`Opening ${quote?.vendor_name || "Vendor"} Quotation PDF in a new tab...`, "info");
    } catch (err) {
      console.error("Vendor quotation PDF generation error:", err);
      if (showToast) showToast("Failed to generate Quotation PDF", "error");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    if (showToast) showToast("Quotation link copied to clipboard!", "success");
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Banner & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <MessagesSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 4 : Quotation Management & RFQ
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Generate Requests for Quotation (RFQ), dispatch enquiries to vendors, and compare commercial bids.
              </p>
            </div>
          </div>

          {/* Search & Division Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent #, material..."
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
                setSelectedRecordIds([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Pending Quotations ({pendingList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setSelectedRecordIds([]);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Quotation History ({historyList.length})</span>
            </button>
          </div>

          {/* Bulk RFQ Button */}
          {activeTab === "pending" && selectedRecordIds.length > 0 && (
            <button
              type="button"
              onClick={handleOpenBulkForm}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Process Quotation ({selectedRecordIds.length})</span>
            </button>
          )}
        </div>

        {/* 3. Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                {activeTab === "pending" && (
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={pendingList.length > 0 && selectedRecordIds.length === pendingList.length}
                      onChange={toggleAll}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 text-center">Actions</th>
                <th className="p-3">Indent #</th>
                <th className="p-3">Material Name</th>
                <th className="p-3 text-center">Quantity</th>
                <th className="p-3">Division</th>
                <th className="p-3 text-center">Expected Date</th>
                <th className="p-3 text-center">Quotes Received</th>
                {activeTab === "history" && (
                  <>
                    <th className="p-3 text-center font-mono">Actual</th>
                    <th className="p-3">Quotation PDF</th>
                  </>
                )}
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading quotations...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No {activeTab === "pending" ? "pending quotations" : "historical quotation records"} found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const isSelected = selectedRecordIds.includes(row.id);
                  const quotes = row.quotation_submissions || [];

                  return (
                    <tr
                      key={row.id}
                      onClick={() => activeTab === "pending" && toggleRecord(row.id)}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {activeTab === "pending" && (
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecord(row.id)}
                            className="rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                      )}

                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenForm(row.id)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Quotation
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
                        {formatDateDash(row.lead_time || row.required_date || row.planned_date)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                          {quotes.length} Quotes
                        </span>
                      </td>
                      {activeTab === "history" && (
                        <td className="p-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDateTime(quotes[0]?.created_at || row.updated_at || row.created_at)}
                        </td>
                      )}
                      {activeTab === "history" && (
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5 py-1">
                            {quotes.length > 0 ? (
                              quotes.map((q, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleDownloadVendorQuotationPdf(row, q)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-left cursor-pointer transition-colors"
                                  title={`Open ${q.vendor_name || `Vendor ${idx + 1}`} Quotation PDF in a new tab`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  <span>{q.vendor_name || `Vendor ${idx + 1}`}</span>
                                </button>
                              ))
                            ) : (
                              <span className="text-slate-400 text-xs italic">—</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          {quotes.length > 0 ? "Responses Received" : "Awaiting RFQ"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Showing page {currentPage} of {totalPages} ({currentList.length} items)
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detailed RFQ & Quotation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Quotation Dispatch & Response Tracking
                </h3>
                <p className="text-xs text-slate-500">
                  Processing {currentRecords.length} selected requisition(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto text-xs">
              {!emailSent ? (
                <div className="space-y-6">
                  {/* Supplier Multi-select */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Suppliers (Select up to 3 from Master Vendor list) <span className="text-red-500">*</span>
                    </label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedVendors.includes(val)) {
                          if (selectedVendors.length >= 3) {
                            if (showToast) showToast("Maximum 3 suppliers can be selected for comparison", "warning");
                            return;
                          }
                          setSelectedVendors([...selectedVendors, val]);
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="">-- Choose Supplier from Master List --</option>
                      {dbVendors.map((v) => (
                        <option key={v} value={v} disabled={selectedVendors.includes(v)}>
                          {v}
                        </option>
                      ))}
                    </select>

                    {/* Selected Vendor Chips */}
                    {selectedVendors.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedVendors.map((v) => (
                          <span
                            key={v}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                          >
                            {v}
                            <button
                              type="button"
                              onClick={() => setSelectedVendors(selectedVendors.filter((x) => x !== v))}
                              className="hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Commercial & Address Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-slate-500 uppercase tracking-wider">
                        Commercial Details
                      </h4>
                      <div>
                        <span className="text-slate-400 block">GSTIN Registration</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{gstin}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">PAN Card No</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{pan}</span>
                      </div>
                    </div>

                    {/* Billing Address Dropdown */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                        Billing Address
                      </h4>
                      <select
                        value={billingCompany}
                        onChange={(e) => {
                          const opt = combinedAddressOptions.find((a) => a.name === e.target.value);
                          if (opt) {
                            setBillingCompany(opt.name);
                            setBillingAddress(opt.address);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      >
                        {combinedAddressOptions.map((opt, idx) => (
                          <option key={`bill-addr-${idx}`} value={opt.name}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-3 leading-relaxed">
                        {billingAddress || "—"}
                      </p>
                    </div>

                    {/* Destination Address Dropdown */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                        Destination Address
                      </h4>
                      <select
                        value={destCompany}
                        onChange={(e) => {
                          const opt = combinedAddressOptions.find((a) => a.name === e.target.value);
                          if (opt) {
                            setDestCompany(opt.name);
                            setDestAddress(opt.address);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      >
                        {combinedAddressOptions.map((opt, idx) => (
                          <option key={`dest-addr-${idx}`} value={opt.name}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-3 leading-relaxed">
                        {destAddress || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Letter Note */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Description / Letter Note
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter enquiry specific instructions..."
                      value={descriptionNote}
                      onChange={(e) => setDescriptionNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  {/* Items for RFQ */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Items in RFQ Package
                    </span>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 font-bold">
                          <tr>
                            <th className="p-2.5">Indent #</th>
                            <th className="p-2.5">Material</th>
                            <th className="p-2.5 text-right">Quantity</th>
                            <th className="p-2.5">Plant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {currentRecords.map((r) => (
                            <tr key={r.id}>
                              <td className="p-2.5 font-mono font-bold text-blue-600">{r.indent_number}</td>
                              <td className="p-2.5 font-bold">{r.item_name}</td>
                              <td className="p-2.5 text-right font-bold">{r.quantity} {r.uom}</td>
                              <td className="p-2.5 text-slate-500">{r.warehouse_location}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Terms and Conditions (Dynamic from master_quotation_terms table) */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-xs">
                          Terms & Conditions
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Custom commercial and operational terms & conditions for this RFQ enquiry.
                        </p>
                      </div>

                      {/* Add Term Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddTerm();
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Type custom term for this quotation..."
                          value={newTerm}
                          onChange={(e) => setNewTerm(e.target.value)}
                          className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs w-64 sm:w-80 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={!newTerm.trim()}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-all shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </form>
                    </div>

                    {/* Active Quotation Terms List */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      {terms.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          No terms added yet. Type a term above to add it to this quotation package.
                        </div>
                      ) : (
                        terms.map((term, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 gap-3"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-xs text-slate-800 dark:text-slate-200 leading-snug">
                                {term}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveTerm(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Remove term"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadRfqPdf}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold border border-slate-300 dark:border-slate-600 transition-all cursor-pointer flex items-center gap-2"
                      title="Preview and Download RFQ PDF in a new tab"
                    >
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendRFQ}
                      disabled={isSubmitting || selectedVendors.length === 0}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Save and Send RFQ Enquiry</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Post Dispatch Links & Status View */
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Enquiry Generated! Direct quotation links ready for suppliers:
                    </div>

                    <div className="space-y-2 pt-1">
                      {generatedLinks.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900 rounded-xl"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                          <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">{item.link}</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.link)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </button>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Responses Comparison Tracker */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                      Live Quotations Received & Comparison Tracker
                    </h4>
                    {currentRecords.map((record) => {
                      const quotes = record.quotation_submissions || [];
                      return (
                        <div key={record.id} className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40">
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex justify-between items-center">
                            <span>Indent: <span className="font-mono text-blue-600">{record.indent_number}</span> — {record.item_name} ({record.quantity} {record.uom})</span>
                            <span className="text-slate-500">{record.warehouse_location}</span>
                          </div>

                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                                <tr>
                                  <th className="p-2.5">Vendor</th>
                                  <th className="p-2.5 text-right">Quoted Rate</th>
                                  <th className="p-2.5 text-center">GST %</th>
                                  <th className="p-2.5">Payment Terms</th>
                                  <th className="p-2.5 text-center">Delivery Lead Time</th>
                                  <th className="p-2.5">Transport</th>
                                  <th className="p-2.5 text-center">Quotation PDF</th>
                                  <th className="p-2.5 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {quotes.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="p-4 text-center text-slate-400">
                                      Awaiting supplier responses. Share links above to collect quotes.
                                    </td>
                                  </tr>
                                ) : (
                                  quotes.map((q, idx) => {
                                    const isSubmitted = String(q.status || "").toLowerCase() === "submitted" || (q.quoted_rate != null && Number(q.quoted_rate) > 0);
                                    return (
                                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                                          {q.vendor_name}
                                        </td>
                                        <td className="p-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                                          {isSubmitted ? (
                                            `₹${Number(q.quoted_rate || 0).toLocaleString()}`
                                          ) : (
                                            <span className="text-slate-400 font-medium italic text-[11px]">Awaiting Rate</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center font-bold">
                                          {isSubmitted ? `${q.gst_percent || 18}%` : "—"}
                                        </td>
                                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                                          {q.payment_terms || "—"}
                                        </td>
                                        <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                                          {q.delivery_terms || "—"}
                                        </td>
                                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                                          {q.transport_type || "—"}
                                        </td>
                                        <td className="p-2.5 text-center">
                                          {isSubmitted ? (
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadVendorQuotationPdf(record, q)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold cursor-pointer"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                              <span>PDF</span>
                                            </button>
                                          ) : (
                                            <span className="text-slate-400 text-[11px]">—</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center">
                                          {isSubmitted ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              Submitted
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                              Pending
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEmailSent(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl font-bold cursor-pointer"
                      >
                        Resend / Change Vendors
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadRfqPdf}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl font-bold border border-blue-200 dark:border-blue-800 cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download RFQ PDF</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Close & Return to List
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
