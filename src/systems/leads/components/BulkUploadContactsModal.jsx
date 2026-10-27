import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  X,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";

/**
 * Normalizes headers and extracts string value based on candidate keywords.
 */
function extractValue(row, candidates) {
  const normCandidates = candidates.map((c) =>
    c.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normCandidates.includes(cleanKey)) {
      if (value === null || value === undefined) return "";
      return String(value).trim();
    }
  }
  return "";
}

export default function BulkUploadContactsModal({
  isOpen,
  onClose,
  onUploadSuccess,
  saveLiveCompany,
  saveCompany,
  currentUsername = "",
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "Full Name (Company Name) *": "Acme Industries Pvt Ltd",
        "Phone Number *": "9876543210",
        "Company GST": "27ABCDE1234F1Z5",
        "Company Email Address": "contact@acmeindustries.com",
        "State": "Maharashtra",
        "City": "Mumbai",
        "NOB": "Manufacturing",
        "Division": "Industrial Supplies",
        "Client Status": "Converted",
        "Company Address": "101, Business Hub, Andheri East, Mumbai, Maharashtra 400069",
        "Contact Person Name": "Rajesh Sharma",
        "Contact Person Designation": "Purchasing Head",
        "Contact Person Number": "9876543211",
      },
      {
        "Full Name (Company Name) *": "Global Tech Logistics",
        "Phone Number *": "9123456780",
        "Company GST": "29XYZAB5678C1Z2",
        "Company Email Address": "info@globaltech.com",
        "State": "Karnataka",
        "City": "Bangalore",
        "NOB": "Logistics",
        "Division": "Freight",
        "Client Status": "Unconverted",
        "Company Address": "Plot 42, Electronic City Phase 1, Bangalore 560100",
        "Contact Person Name": "Priya Verma",
        "Contact Person Designation": "Operations Manager",
        "Contact Person Number": "9123456781",
      },
      {
        "Full Name (Company Name) *": "Apex Precision Engineering",
        "Phone Number *": "9988776655",
        "Company GST": "",
        "Company Email Address": "sales@apexprecision.in",
        "State": "Gujarat",
        "City": "Ahmedabad",
        "NOB": "Engineering",
        "Division": "Fabrication",
        "Client Status": "",
        "Company Address": "GIDC Naroda, Phase 2, Ahmedabad",
        "Contact Person Name": "Amit Patel",
        "Contact Person Designation": "Director",
        "Contact Person Number": "9988776650",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [
      { wch: 30 }, // Full Name
      { wch: 18 }, // Phone
      { wch: 20 }, // GST
      { wch: 28 }, // Email
      { wch: 18 }, // State
      { wch: 18 }, // City
      { wch: 18 }, // NOB
      { wch: 22 }, // Division
      { wch: 18 }, // Client Status
      { wch: 45 }, // Address
      { wch: 22 }, // Contact Person Name
      { wch: 26 }, // Contact Person Designation
      { wch: 22 }, // Contact Person Number
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts Template");
    XLSX.writeFile(wb, "Contacts_Bulk_Upload_Template.xlsx");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = (uploadedFile) => {
    setErrorMsg("");
    setIsValidating(true);
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setErrorMsg("The selected Excel file appears to be empty.");
          setParsedRows([]);
          setIsValidating(false);
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg("No data rows found in sheet: " + sheetName);
          setParsedRows([]);
          setIsValidating(false);
          return;
        }

        const processed = rawJson
          .map((row, idx) => {
            const name = extractValue(row, [
              "fullnamecompanyname",
              "fullname",
              "companyname",
              "name",
              "company",
              "firm",
              "clientname",
            ]);
            const phone = extractValue(row, [
              "phonenumber",
              "phone",
              "mobile",
              "contactnumber",
              "mobilenumber",
              "telephone",
            ]);
            const gst = extractValue(row, [
              "companygst",
              "gst",
              "gstin",
              "gstno",
              "gstnumber",
            ]).toUpperCase();
            const email = extractValue(row, [
              "companyemailaddress",
              "companyemail",
              "email",
              "emailaddress",
              "mail",
            ]);
            const state = extractValue(row, ["state", "statename", "province"]);
            const city = extractValue(row, ["city", "cityname", "location"]);
            const nob = extractValue(row, [
              "nob",
              "natureofbusiness",
              "businessnature",
              "category",
            ]);
            const division = extractValue(row, ["division", "dept", "department"]);
            const rawStatus = extractValue(row, [
              "clientcategorystatus",
              "clientstatus",
              "status",
              "category",
            ]);
            let status = "";
            if (rawStatus.toLowerCase().includes("unconverted")) {
              status = "Unconverted";
            } else if (rawStatus.toLowerCase().includes("converted")) {
              status = "Converted";
            }

            const address = extractValue(row, [
              "companyaddress",
              "address",
              "postaladdress",
              "officeaddress",
              "locationaddress",
            ]);
            const contactPersonName = extractValue(row, [
              "contactpersonname",
              "contactperson",
              "contactname",
              "personname",
              "salesperson",
            ]);
            const contactPersonDesig = extractValue(row, [
              "contactpersondesignation",
              "designation",
              "role",
              "title",
            ]);
            const contactPersonNum = extractValue(row, [
              "contactpersonnumber",
              "contactpersonphone",
              "personphone",
              "personnumber",
            ]);

            // Filter out completely empty rows
            const allEmpty =
              !name &&
              !phone &&
              !gst &&
              !email &&
              !state &&
              !city &&
              !address &&
              !contactPersonName;
            if (allEmpty) return null;

            // Determine validation
            const errors = [];
            if (!name) errors.push("Missing Full Name (Company Name)");
            if (!phone) errors.push("Missing Phone Number");

            return {
              rowIndex: idx + 2, // 1-indexed Excel row (+1 for header)
              isValid: errors.length === 0,
              errors,
              name,
              phone,
              gst,
              email,
              state,
              city,
              nob,
              division,
              status,
              address,
              contactPersons: [
                {
                  name: contactPersonName || (currentUsername && currentUsername.toLowerCase() !== "admin" ? currentUsername : ""),
                  designation: contactPersonDesig || "",
                  number: contactPersonNum || "",
                },
              ],
            };
          })
          .filter(Boolean);

        setParsedRows(processed);
      } catch (err) {
        console.error("Error parsing Excel file:", err);
        setErrorMsg("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
        setParsedRows([]);
      } finally {
        setIsValidating(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read the file.");
      setIsValidating(false);
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      parseExcelFile(droppedFile);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleUpload = async () => {
    if (validRows.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress({ current: 0, total: validRows.length });

    let successCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setUploadProgress({ current: i + 1, total: validRows.length });

      const payload = {
        name: row.name,
        phone: row.phone,
        gst: row.gst,
        email: row.email,
        state: row.state,
        city: row.city,
        nob: row.nob,
        division: row.division,
        status: row.status,
        address: row.address,
        contactPersons: row.contactPersons,
        proof: "",
        proofLocation: null,
      };

      try {
        if (typeof saveLiveCompany === "function") {
          await saveLiveCompany(payload);
        }
      } catch (err) {
        console.warn(`[BulkUpload] Supabase save failed for "${row.name}":`, err);
      }

      try {
        if (typeof saveCompany === "function") {
          saveCompany(payload);
        }
        successCount++;
      } catch (err) {
        console.error(`[BulkUpload] Local save failed for "${row.name}":`, err);
      }
    }

    setIsUploading(false);
    if (typeof onUploadSuccess === "function") {
      onUploadSuccess(successCount);
    }
    handleReset();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={!isUploading ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-gray-150 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Bulk Upload Contacts via Excel
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Download the template, fill in your records, and upload to import contacts in bulk.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Step 1: Download Template Card */}
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-slate-800/50 p-4 rounded-xl border border-blue-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-tight">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-extrabold">
                  1
                </span>
                Download Excel Template
              </div>
              <p className="text-gray-600 dark:text-slate-300 text-xs">
                Use our pre-configured template with sample data. Only{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Full Name
                </span>{" "}
                and{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Phone Number
                </span>{" "}
                are mandatory (*).
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 font-bold shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Download size={14} /> Download Template (.xlsx)
            </button>
          </div>

          {/* Step 2: Upload Area */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-tight">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-extrabold">
                2
              </span>
              Upload Completed File
            </div>

            {!file ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-gray-50/50 dark:bg-slate-850/50 hover:bg-blue-50/30 transition-all cursor-pointer group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-slate-200 text-xs">
                    Click to browse or drag and drop your spreadsheet here
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Supports .xlsx, .xls, and .csv files (up to 10MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-slate-800/80 p-3 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate text-xs">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} record
                      {parsedRows.length === 1 ? "" : "s"} detected
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remove file"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          {isValidating && (
            <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
              <Loader2 className="animate-spin text-blue-600" size={16} />
              <span>Analyzing spreadsheet contents...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="text-xs">{errorMsg}</span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 dark:text-slate-200 uppercase tracking-tight text-[11px]">
                    Preview Data
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {validRows.length} Valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      {invalidRows.length} Incomplete
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                  Showing first {Math.min(parsedRows.length, 10)} of {parsedRows.length}
                </span>
              </div>

              <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-gray-100/80 dark:bg-slate-800 sticky top-0 border-b border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">Status</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">GST</th>
                      <th className="py-2 px-3">City / State</th>
                      <th className="py-2 px-3">Contact Person</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {parsedRows.slice(0, 15).map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.isValid
                            ? "hover:bg-gray-50/60 dark:hover:bg-slate-850/60"
                            : "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70"
                        }
                      >
                        <td className="py-2 px-3 text-center">
                          {row.isValid ? (
                            <CheckCircle2
                              size={14}
                              className="text-emerald-500 inline-block"
                            />
                          ) : (
                            <span
                              title={row.errors.join(", ")}
                              className="cursor-help"
                            >
                              <AlertCircle
                                size={14}
                                className="text-amber-500 inline-block"
                              />
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                          {row.name || (
                            <span className="text-amber-500 italic">Missing Name</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700 dark:text-slate-300">
                          {row.phone || (
                            <span className="text-amber-500 italic">Missing Phone</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-500 dark:text-slate-400 font-mono text-[10px]">
                          {row.gst || "-"}
                        </td>
                        <td className="py-2 px-3 text-gray-600 dark:text-slate-300">
                          {[row.city, row.state].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="py-2 px-3 text-gray-600 dark:text-slate-300">
                          {row.contactPersons?.[0]?.name || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Uploading Progress Indicator */}
          {isUploading && (
            <div className="space-y-1.5 p-3 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700">
              <div className="flex items-center justify-between font-semibold text-blue-700 dark:text-blue-300 text-xs">
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Importing contacts...
                </span>
                <span>
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-200 rounded-full"
                  style={{
                    width: `${
                      uploadProgress.total > 0
                        ? (uploadProgress.current / uploadProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850/50">
          <div className="text-[11px] text-gray-500 dark:text-slate-400">
            {validRows.length > 0 && !isUploading && (
              <span>
                {validRows.length} valid contact{validRows.length === 1 ? "" : "s"} ready
                to import
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validRows.length === 0 || isUploading}
              onClick={handleUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <UploadCloud size={14} /> Import {validRows.length} Contact
                  {validRows.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
