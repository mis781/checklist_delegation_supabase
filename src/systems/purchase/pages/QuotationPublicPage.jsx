import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, Download, ExternalLink, FileText } from "lucide-react";
import { generateVendorQuotationPdf } from "../utils/purchasePdfGenerator";
import { fetchMasterTransportTypes } from "../services/purchaseMasterApi";
import { formatDateDash, toLocalIsoTimestamp } from "../utils/dateUtils";
import supabase from "../../../SupabaseClient";
import nutechLogo from "../../../assets/nutech-logo.png";

const PAYMENT_TERMS_OPTIONS = [
  { value: "Advance", label: "Advance" },
  { value: "15 days", label: "15 days" },
  { value: "30 days", label: "30 days" },
  { value: "60 days", label: "60 days" },
  { value: "90 days", label: "90 days" },
  { value: "Custom", label: "Custom / Type Manually..." },
];

const DEFAULT_TRANSPORT_TYPES = [
  { value: "Ex-Factory", label: "Ex-Factory" },
  { value: "Ex-Factory in Transport Office", label: "Ex-Factory in Transport Office" },
  { value: "F.O.R. (Free on Road)", label: "F.O.R. (Free on Road)" },
];

const GST_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const NUTECH_ADDRESS =
  "Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Naya Raipur, Chattisgarh, India, Raipur, Chattisgarh 493111, IN";

export default function QuotationPublicPage() {
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get("id");
  const idsParam = searchParams.get("ids");
  const vParam = searchParams.get("v") || "1";

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [indentItems, setIndentItems] = useState([]);
  const [vendorName, setVendorName] = useState("");
  const [transportTypeOptions, setTransportTypeOptions] = useState(DEFAULT_TRANSPORT_TYPES);

  const [formRates, setFormRates] = useState([]);
  const [formGst, setFormGst] = useState([]);
  const [commonTerms, setCommonTerms] = useState("30 days");
  const [customTerms, setCustomTerms] = useState("");
  const [commonDeliveryDate, setCommonDeliveryDate] = useState("");
  const [commonTransportType, setCommonTransportType] = useState("F.O.R. (Free on Road)");
  const [commonRemarks, setCommonRemarks] = useState("");

  const vendorSlot = parseInt(vParam || "1", 10);

  // Load Indent Details directly from Supabase
  useEffect(() => {
    const rawIds = idsParam ? idsParam.split(",") : idParam ? [idParam] : [];

    const fetchIndents = async () => {
      setIsLoading(true);
      try {
        let query = supabase.from("indents").select("*");
        if (rawIds.length > 0) {
          query = query.in("id", rawIds);
        } else {
          query = query.limit(5);
        }

        const { data: fetchedIndents, error } = await query;
        if (error) throw error;

        const targetIndents = fetchedIndents || [];
        if (targetIndents.length === 0) {
          setErrorMsg("No active requisition items found for this RFQ link.");
          setIsLoading(false);
          return;
        }

        // Fetch corresponding quotations for these indents
        const indentIds = targetIndents.map((i) => i.id);
        const { data: quotesData, error: quotesErr } = await supabase
          .from("quotation_submissions")
          .select("*")
          .in("indent_id", indentIds)
          .order("created_at", { ascending: true });

        if (quotesErr) {
          console.warn("Quotation submissions fetch notice:", quotesErr);
        }

        const quotesMap = new Map();
        (quotesData || []).forEach((q) => {
          const list = quotesMap.get(q.indent_id) || [];
          list.push(q);
          quotesMap.set(q.indent_id, list);
        });

        // Attach quotation_submissions array to each target indent
        targetIndents.forEach((ind) => {
          ind.quotation_submissions = quotesMap.get(ind.id) || [];
        });

        const primaryIndent = targetIndents[0];
        let resolvedVendor = "";

        if (primaryIndent?.quotation_submissions && primaryIndent.quotation_submissions[vendorSlot - 1]) {
          resolvedVendor = primaryIndent.quotation_submissions[vendorSlot - 1].vendor_name;
        } else if (primaryIndent?.selected_vendor_name) {
          resolvedVendor = primaryIndent.selected_vendor_name;
        } else {
          resolvedVendor = `Vendor #${vendorSlot}`;
        }

        setVendorName(resolvedVendor);

        let hasSubmittedQuote = false;
        let existingSubmission = null;

        const items = targetIndents.map((ind) => {
          const existingQuote = (ind.quotation_submissions || []).find(
            (q) =>
              q.vendor_name?.toLowerCase() === resolvedVendor.toLowerCase() &&
              (q.status === "Submitted" || (q.quoted_rate != null && Number(q.quoted_rate) > 0 && q.status !== "Pending Response"))
          );

          if (existingQuote) {
            hasSubmittedQuote = true;
            if (!existingSubmission) existingSubmission = existingQuote;
          }

          return {
            id: ind.id,
            indentNumber: ind.indent_number || ind.id,
            itemName: ind.item_name || "Material Item",
            quantity: ind.quantity || 1,
            uom: ind.uom || "NOS",
            category: ind.category || "General Supplies",
            warehouseLocation: ind.warehouse_location || "Central Plant / Raipur",
            existingRate:
              existingQuote && existingQuote.quoted_rate != null && Number(existingQuote.quoted_rate) > 0
                ? String(existingQuote.quoted_rate)
                : "",
            existingGst:
              existingQuote && existingQuote.gst_percent != null
                ? String(existingQuote.gst_percent)
                : "18",
            existingDeliveryDate: existingQuote?.delivery_terms || "",
          };
        });

        setIndentItems(items);
        setFormRates(items.map((it) => it.existingRate || ""));
        setFormGst(items.map((it) => it.existingGst || "18"));

        // Fetch Master Transport Types from Supabase
        const masterTypes = await fetchMasterTransportTypes();
        if (masterTypes && masterTypes.length > 0) {
          const activeTypes = masterTypes.filter((t) => t.is_active !== false);
          if (activeTypes.length > 0) {
            setTransportTypeOptions(activeTypes);
            if (!commonTransportType || commonTransportType === "F.O.R. (Free on Road)") {
              setCommonTransportType(activeTypes[0].value);
            }
          }
        }

        // Populate common submission details if already submitted
        if (existingSubmission) {
          if (existingSubmission.delivery_terms) setCommonDeliveryDate(existingSubmission.delivery_terms);
          if (existingSubmission.payment_terms) {
            const isStandardTerm = PAYMENT_TERMS_OPTIONS.some((opt) => opt.value === existingSubmission.payment_terms);
            if (isStandardTerm) {
              setCommonTerms(existingSubmission.payment_terms);
            } else {
              setCommonTerms("Custom");
              setCustomTerms(existingSubmission.payment_terms);
            }
          }
          if (existingSubmission.transport_type) setCommonTransportType(existingSubmission.transport_type);
          if (existingSubmission.remarks) setCommonRemarks(existingSubmission.remarks);
        }

        // If vendor already submitted their quote, show the Quotation Received view directly
        if (hasSubmittedQuote) {
          setSubmitted(true);
        }
      } catch (err) {
        console.error("Error loading quotation form:", err);
        setErrorMsg("Failed to load RFQ requisition details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndents();
  }, [idParam, idsParam, vendorSlot]);

  // Per-item total calculations
  const itemTotals = useMemo(() => {
    return indentItems.map((item, index) => {
      const rate = parseFloat(formRates[index]) || 0;
      const qty = parseFloat(item.quantity) || 0;
      const gstValStr = formGst[index] !== undefined && formGst[index] !== "" ? formGst[index] : "18";
      const gstPct = parseFloat(gstValStr) || 0;
      const base = rate * qty;
      const gstAmt = base * (gstPct / 100);
      return { base, gstAmt, total: base + gstAmt, gstValStr };
    });
  }, [indentItems, formRates, formGst]);

  const subtotal = useMemo(() => itemTotals.reduce((sum, t) => sum + t.base, 0), [itemTotals]);
  const gstAmount = useMemo(() => itemTotals.reduce((sum, t) => sum + t.gstAmt, 0), [itemTotals]);
  const grandTotal = subtotal + gstAmount;

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let i = 0; i < indentItems.length; i++) {
      if (!formRates[i] || isNaN(parseFloat(formRates[i])) || parseFloat(formRates[i]) <= 0) {
        alert(`Please enter a valid Rate Per Qty for "${indentItems[i].itemName}".`);
        return;
      }
    }

    const finalTerms = commonTerms === "Custom" ? customTerms.trim() : commonTerms;
    if (!finalTerms) {
      alert("Please select or specify Payment Terms.");
      return;
    }
    if (!commonDeliveryDate) {
      alert("Please select an Expected Delivery Date.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Direct Supabase Database Submission
      for (let i = 0; i < indentItems.length; i++) {
        const item = indentItems[i];
        const rateVal = parseFloat(formRates[i]) || 0;
        const gstVal = parseFloat(formGst[i] || "18");

        // Clean up any initial placeholder quote entry for this vendor & indent
        try {
          await supabase
            .from("quotation_submissions")
            .delete()
            .eq("indent_id", item.id)
            .eq("vendor_name", vendorName);
        } catch (delErr) {
          console.warn("Clean up existing quote warning:", delErr);
        }

        // Insert official vendor quotation submission
        const { error: insertErr } = await supabase.from("quotation_submissions").insert({
          indent_id: item.id,
          vendor_name: vendorName,
          quoted_rate: rateVal,
          gst_percent: gstVal,
          payment_terms: finalTerms,
          delivery_terms: toLocalIsoTimestamp(commonDeliveryDate),
          transport_type: commonTransportType,
          remarks: commonRemarks || null,
          submission_date: new Date().toISOString(),
        });

        if (insertErr) {
          console.error("Supabase insert quotation error:", insertErr);
          throw insertErr;
        }
      }

      // 2. Safely sync local cache if present
      const stored = localStorage.getItem("nutech_purchase_workflow_v1_indents");
      if (stored) {
        try {
          const allIndents = JSON.parse(stored) || [];
          const updatedIndents = allIndents.map((ind) => {
            const matchingItemIndex = indentItems.findIndex(
              (it) => it.id === ind.id || it.indentNumber === ind.indent_number
            );
            if (matchingItemIndex !== -1) {
              const rateNum = parseFloat(formRates[matchingItemIndex]) || 0;
              const gstNum = parseFloat(formGst[matchingItemIndex] || "18");

              const newSubmission = {
                id: `Q-${Math.floor(1000 + Math.random() * 9000)}`,
                indent_id: ind.id,
                vendor_name: vendorName,
                quoted_rate: rateNum,
                gst_percent: gstNum,
                delivery_terms: commonDeliveryDate,
                payment_terms: finalTerms,
                transport_type: commonTransportType,
                remarks: commonRemarks || "",
                status: "Submitted",
                created_at: new Date().toISOString(),
              };

              const existingQuotes = ind.quotation_submissions || [];
              const filteredQuotes = existingQuotes.filter(
                (q) => q.vendor_name?.toLowerCase() !== vendorName.toLowerCase()
              );

              return {
                ...ind,
                quotation_submissions: [...filteredQuotes, newSubmission],
              };
            }
            return ind;
          });

          localStorage.setItem("nutech_purchase_workflow_v1_indents", JSON.stringify(updatedIndents));
        } catch (localErr) {
          console.warn("Local storage cache sync note:", localErr);
        }
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit quotation: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQuotationDoc = () => {
    try {
      generateVendorQuotationPdf({
        vendor_name: vendorName,
        indent_number: indentItems[0]?.indentNumber,
        item_name: indentItems[0]?.itemName,
        quantity: indentItems[0]?.quantity,
        uom: indentItems[0]?.uom,
        quoted_rate: parseFloat(formRates[0]) || 75,
        gst_percent: parseFloat(formGst[0] || "18"),
        payment_terms: commonTerms === "Custom" ? customTerms : commonTerms,
        delivery_terms: commonDeliveryDate,
        transport_type: commonTransportType,
        warehouse_location: indentItems[0]?.warehouseLocation,
        status: "Submitted",
      });
    } catch (e) {
      console.error("Quotation PDF generation error:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-slate-800" />
          <p className="text-slate-600 text-sm font-medium">Loading RFQ proposal parameters...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 text-center shadow-lg space-y-3">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-red-800 text-lg font-bold">Error loading form</h2>
          <p className="text-slate-600 text-xs">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUCCESS / CONFIRMATION VIEW
  // -------------------------------------------------------------
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-2xl w-full bg-white border border-emerald-150 rounded-2xl shadow-xl overflow-hidden animate-in fade-in">
          <div className="p-8 text-center space-y-3 border-b border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 flex items-center justify-center rounded-full text-emerald-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-slate-900 text-2xl font-black tracking-tight">Quotation Received!</h2>
            <p className="text-slate-500 text-sm px-4">
              Thank you for submitting your commercial proposal. The Nutech purchasing department has received your quote.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-4">
            <div className="font-bold text-sm text-slate-700">
              Submitted Items Summary (Vendor: <span className="text-blue-700">{vendorName}</span>):
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Indent</th>
                    <th className="p-3">Item</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">GST %</th>
                    <th className="p-3 text-right text-slate-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {indentItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-100/50">
                      <td className="p-3 font-mono font-bold text-blue-600">{item.indentNumber}</td>
                      <td className="p-3 font-semibold text-slate-900">{item.itemName}</td>
                      <td className="p-3 text-right font-bold">{item.quantity} {item.uom}</td>
                      <td className="p-3 text-right font-mono font-bold">₹{formRates[index]}</td>
                      <td className="p-3 text-right font-mono">{formGst[index] || "18"}%</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{itemTotals[index]?.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-white">
                    <td className="p-3 font-bold text-slate-600" colSpan={5}>Sub Total</td>
                    <td className="p-3 text-right font-bold text-slate-800">₹{subtotal.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-bold text-slate-600" colSpan={5}>GST Amount</td>
                    <td className="p-3 text-right font-bold text-slate-800">₹{gstAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="p-3 text-slate-900" colSpan={5}>Grand Total</td>
                    <td className="p-3 text-right text-slate-900 font-bold">₹{grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs text-slate-600 space-y-2 mt-4 shadow-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Payment Terms:</span>
                <span className="font-bold text-slate-800">
                  {commonTerms === "Custom" ? customTerms : commonTerms}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Expected Delivery Date:</span>
                <span className="font-bold text-slate-800">{formatDateDash(commonDeliveryDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Transport Type:</span>
                <span className="font-bold text-slate-800">{commonTransportType}</span>
              </div>
              {commonRemarks && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-500 shrink-0">Remarks:</span>
                  <span className="font-bold text-slate-800 text-right">{commonRemarks}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadQuotationDoc}
                className="px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Quotation PDF Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Edit and resubmit quotation"
              >
                <span>Edit / Update Response</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN QUOTATION FORM VIEW (MATCHING 2ND UI)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-3xl w-full bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
        {/* 1. Header Banner */}
        <div className="bg-slate-900 text-white p-6 md:p-8 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={nutechLogo}
              alt="Nutech Logo"
              className="h-10 sm:h-12 w-auto max-w-[170px] object-contain bg-white/95 p-1.5 rounded-xl shrink-0"
            />
            <div className="min-w-0 max-w-md">
              <h2 className="text-base font-bold leading-tight">Nutech Pipes Pvt. Ltd.</h2>
              <p className="text-slate-300 text-xs leading-snug line-clamp-2" title={NUTECH_ADDRESS}>
                {NUTECH_ADDRESS}
              </p>
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Vendor Quotation Submission</h1>
          <p className="text-slate-300 text-xs">
            Please submit your commercial proposal details for the indent lift request below.
          </p>
        </div>

        {/* 2. Form Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Requesting Vendor Header Box */}
          <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 text-sm flex justify-between items-center shadow-xs">
            <span className="text-slate-500 font-medium">Requesting Vendor:</span>
            <span className="font-bold text-slate-900 text-base">{vendorName || "Supplier / Vendor"}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item-Wise Rates Section */}
            <div className="space-y-4">
              <label className="text-xs uppercase font-extrabold text-slate-600 tracking-wider block">
                Item-Wise Rates (Enter rate, GST % and see the total per item)
              </label>

              {indentItems.map((item, index) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <span className="text-blue-600 font-mono text-xs font-bold">Indent: {item.indentNumber}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{item.itemName}</h4>
                    <span className="text-xs text-slate-500">Category: {item.category}</span>
                  </div>

                  <div className="flex items-end gap-3 shrink-0 flex-wrap">
                    <span className="bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full shrink-0 mb-1">
                      Qty: {item.quantity} {item.uom}
                    </span>

                    <div className="space-y-1">
                      <label
                        htmlFor={`rate-${index}`}
                        className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
                      >
                        Rate Per Qty (₹) *
                      </label>
                      <input
                        id={`rate-${index}`}
                        type="number"
                        step="any"
                        required
                        value={formRates[index] || ""}
                        onChange={(e) => {
                          const updated = [...formRates];
                          updated[index] = e.target.value;
                          setFormRates(updated);
                        }}
                        placeholder="Rate in INR"
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold w-28 h-9 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor={`gst-${index}`}
                        className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
                      >
                        GST (%) *
                      </label>
                      <select
                        id={`gst-${index}`}
                        value={formGst[index] || "18"}
                        onChange={(e) => {
                          const updated = [...formGst];
                          updated[index] = e.target.value;
                          setFormGst(updated);
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold w-28 h-9 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {GST_OPTIONS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Total (₹)
                      </label>
                      <div className="h-9 w-28 flex items-center justify-end px-3 rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold text-slate-900 font-mono">
                        {itemTotals[index]?.total.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {indentItems.length > 1 && (
                <div className="flex justify-end pr-1">
                  <div className="text-xs text-slate-700 space-y-1 text-right font-medium">
                    <div>
                      Sub Total: <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div>
                      GST Amount: <span className="font-bold text-slate-900">₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="font-extrabold text-sm pt-1 border-t border-slate-200">
                      Grand Total: <span className="text-slate-900">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Common Commercial Details Section */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4 shadow-xs">
              <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider block border-b border-slate-100 pb-2">
                Common Commercial Details (Applies to all items)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Terms */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="commonTerms"
                    className="text-xs font-bold text-slate-600 uppercase tracking-wider block"
                  >
                    Payment Terms <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="commonTerms"
                    value={commonTerms}
                    onChange={(e) => {
                      setCommonTerms(e.target.value);
                      if (e.target.value !== "Custom") setCustomTerms("");
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PAYMENT_TERMS_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  {commonTerms === "Custom" && (
                    <input
                      type="text"
                      placeholder="Type custom payment terms (e.g. 50% Advance & 50% on Delivery)"
                      value={customTerms}
                      onChange={(e) => setCustomTerms(e.target.value)}
                      required
                      className="w-full bg-white text-xs h-9 mt-2 border border-slate-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Expected Delivery Date */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="commonDeliveryDate"
                    className="text-xs font-bold text-slate-600 uppercase tracking-wider block"
                  >
                    Expected Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="commonDeliveryDate"
                    type="date"
                    required
                    value={commonDeliveryDate}
                    onChange={(e) => setCommonDeliveryDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Transport Type */}
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor="commonTransportType"
                    className="text-xs font-bold text-slate-600 uppercase tracking-wider block"
                  >
                    Transport Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="commonTransportType"
                    value={commonTransportType}
                    onChange={(e) => setCommonTransportType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {transportTypeOptions.map((t) => (
                      <option key={t.id || t.value} value={t.value}>
                        {t.label || t.name || t.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label
                  htmlFor="commonRemarks"
                  className="text-xs font-bold text-slate-600 uppercase tracking-wider block"
                >
                  Remarks
                </label>
                <textarea
                  id="commonRemarks"
                  rows={3}
                  value={commonRemarks}
                  onChange={(e) => setCommonRemarks(e.target.value)}
                  placeholder="Any additional notes for this quotation..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 h-11 text-sm font-bold tracking-wide rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Quotations...</span>
                </>
              ) : (
                "Submit Quotations"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
