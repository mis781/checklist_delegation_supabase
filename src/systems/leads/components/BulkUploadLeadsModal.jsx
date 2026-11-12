import { useState, useRef } from "react";
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
import { submitLead, updateLead } from "../services/leadApi";
import {
  getLeadReceiverNames,
  saveLeadReceiverNames,
  getLeadSources,
  saveLeadSources,
  getNOBs,
  saveNOBs,
  saveSubmittedLead,
} from "../utils/storageManager";
import supabase from "../../../SupabaseClient";

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

/**
 * Helper to add newly encountered values to local Name Masters
 */
function addValueToNameMaster(val, getter, setter, prefix, numKey) {
  if (!val || typeof val !== "string" || !val.trim()) return;
  const trimmed = val.trim();
  try {
    const list = getter() || [];
    const exists = list.some((item) => {
      const name = typeof item === "string" ? item : item?.name || "";
      return name.toLowerCase() === trimmed.toLowerCase();
    });
    if (!exists) {
      const nextNum = list.length + 1;
      const newItem = {
        name: trimmed,
        [numKey]: `${prefix}-${String(nextNum).padStart(3, "0")}`,
      };
      setter([...list, newItem]);
    }
  } catch (err) {
    console.warn("Could not update name master for:", trimmed, err);
  }
}

export default function BulkUploadLeadsModal({
  isOpen,
  onClose,
  onUploadSuccess,
  currentUsername = "",
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadStats, setUploadStats] = useState(null); // { created: 0, updated: 0, failed: 0 }
  const [errorMsg, setErrorMsg] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'valid' | 'errors' | 'create' | 'update'
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 1. Download formatted Excel template with sample data
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "Lead Number (Optional - To Update)": "",
        "Company Name *": "Acme Industries Pvt Ltd",
        "Contact Person Name": "Rajesh Sharma",
        "Contact Person Designation": "Purchasing Head",
        "Phone Number *": "9876543210",
        "Email Address": "rajesh@acmeindustries.com",
        "Interaction": "Call",
        "Lead Source": "Indiamart",
        "Lead Type": "Incoming",
        "Sales Person Name": currentUsername || "admin1",
        "Nature of Business (NOB)": "Manufacturing",
        "Division": "Industrial Supplies",
        "State": "Maharashtra",
        "City": "Mumbai",
        "Address": "Plot 101, MIDC Andheri East, Mumbai 400069",
        "Company GST": "27ABCDE1234F1Z5",
        "Product / Item Name": "HDPE Pipe 110mm PN10",
        "Quantity": 500,
        "UOM": "Mtr",
        "Notes / Requirement Details": "Urgent requirement for upcoming plant expansion",
        "Status": "pending",
      },
      {
        "Lead Number (Optional - To Update)": "",
        "Company Name *": "Global Tech Infrastructure",
        "Contact Person Name": "Priya Verma",
        "Contact Person Designation": "Project Manager",
        "Phone Number *": "9123456780",
        "Email Address": "priya@globaltechinfra.com",
        "Interaction": "Email",
        "Lead Source": "Website",
        "Lead Type": "Incoming",
        "Sales Person Name": currentUsername || "admin1",
        "Nature of Business (NOB)": "Infrastructure",
        "Division": "Civil Projects",
        "State": "Karnataka",
        "City": "Bangalore",
        "Address": "Tower 4, Electronic City Phase 1, Bangalore 560100",
        "Company GST": "29XYZAB5678C1Z2",
        "Product / Item Name": "PVC Conduit 25mm",
        "Quantity": 1200,
        "UOM": "Mtr",
        "Notes / Requirement Details": "Quote needed with delivery timeline to Bangalore site",
        "Status": "pending",
      },
      {
        "Lead Number (Optional - To Update)": "LD-001",
        "Company Name *": "Apex Precision Engineering",
        "Contact Person Name": "Amit Patel",
        "Contact Person Designation": "Director",
        "Phone Number *": "9988776655",
        "Email Address": "amit@apexprecision.in",
        "Interaction": "Visit",
        "Lead Source": "Direct",
        "Lead Type": "Outgoing",
        "Sales Person Name": currentUsername || "admin1",
        "Nature of Business (NOB)": "Engineering",
        "Division": "Fabrication",
        "State": "Gujarat",
        "City": "Ahmedabad",
        "Address": "GIDC Naroda Phase 2, Ahmedabad 382330",
        "Company GST": "24AABCA1122D1Z3",
        "Product / Item Name": "Flanges & Valves 2 Inch",
        "Quantity": 50,
        "UOM": "Nos",
        "Notes / Requirement Details": "Updated quotation requirement and revised specs",
        "Status": "pending",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [
      { wch: 32 }, // Lead Number
      { wch: 32 }, // Company Name
      { wch: 22 }, // Contact Person Name
      { wch: 25 }, // Contact Person Designation
      { wch: 18 }, // Phone Number
      { wch: 28 }, // Email Address
      { wch: 15 }, // Interaction
      { wch: 16 }, // Lead Source
      { wch: 14 }, // Lead Type
      { wch: 20 }, // Sales Person Name
      { wch: 24 }, // NOB
      { wch: 22 }, // Division
      { wch: 18 }, // State
      { wch: 18 }, // City
      { wch: 42 }, // Address
      { wch: 20 }, // GST
      { wch: 30 }, // Product Name
      { wch: 12 }, // Quantity
      { wch: 10 }, // UOM
      { wch: 45 }, // Notes
      { wch: 14 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
    XLSX.writeFile(wb, "Leads_Bulk_Upload_Template.xlsx");
  };

  // 2. Parse Excel file
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    parseExcelFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      parseExcelFile(droppedFile);
    }
  };

  const parseExcelFile = (uploadedFile) => {
    setErrorMsg("");
    setIsValidating(true);
    setFile(uploadedFile);
    setUploadStats(null);

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
            const leadNumber = extractValue(row, [
              "leadnumberoptionaltoupdate",
              "leadnumberoptional",
              "leadnumber",
              "leadno",
              "leadid",
              "lead#",
            ]);
            const companyName = extractValue(row, [
              "companyname",
              "company",
              "firm",
              "clientname",
              "customername",
              "businessname",
              "organization",
            ]);
            const contactPerson = extractValue(row, [
              "contactpersonname",
              "contactperson",
              "contactname",
              "personname",
              "contact",
            ]);
            const designation = extractValue(row, [
              "contactpersondesignation",
              "designation",
              "role",
              "title",
            ]);
            const phone = extractValue(row, [
              "phonenumber",
              "phone",
              "mobile",
              "contactnumber",
              "mobilenumber",
              "cell",
            ]);
            const email = extractValue(row, [
              "emailaddress",
              "email",
              "mail",
              "companyemail",
            ]);
            const interaction =
              extractValue(row, [
                "interaction",
                "interactiontype",
                "mode",
                "communication",
              ]) || "Call";
            const source =
              extractValue(row, [
                "leadsource",
                "source",
                "inquirysource",
                "channel",
              ]) || "Direct";
            const leadType =
              extractValue(row, [
                "leadtype",
                "inquirytype",
                "direction",
              ]) || "Incoming";
            const salespersonName =
              extractValue(row, [
                "salespersonname",
                "salesperson",
                "receivername",
                "receiver",
                "assignedto",
                "agent",
              ]) || currentUsername || "admin1";
            const nob = extractValue(row, [
              "natureofbusinessnob",
              "natureofbusiness",
              "nob",
              "businessnature",
              "industry",
            ]);
            const division = extractValue(row, [
              "division",
              "department",
              "dept",
            ]);
            const state = extractValue(row, ["state", "statename", "province"]);
            const city = extractValue(row, ["city", "cityname", "location"]);
            const address = extractValue(row, [
              "address",
              "companyaddress",
              "locationaddress",
              "billingaddress",
            ]);
            const gst = extractValue(row, [
              "companygst",
              "gst",
              "gstin",
              "gstno",
            ]).toUpperCase();
            const itemName = extractValue(row, [
              "productitemname",
              "productname",
              "itemname",
              "product",
              "item",
              "requirement",
            ]);
            const quantity = extractValue(row, [
              "quantity",
              "qty",
              "units",
              "count",
            ]);
            const uom =
              extractValue(row, [
                "uom",
                "unit",
                "unitofmeasure",
              ]) || "Nos";
            const notes = extractValue(row, [
              "notesrequirementdetails",
              "notes",
              "remarks",
              "details",
              "comments",
            ]);
            const status =
              extractValue(row, [
                "status",
                "leadstatus",
                "stage",
              ]) || "pending";

            // Skip empty rows
            const allEmpty =
              !companyName &&
              !phone &&
              !contactPerson &&
              !email &&
              !state &&
              !city &&
              !address &&
              !itemName;
            if (allEmpty) return null;

            // Determine if this is an update or create
            const isUpdate = Boolean(leadNumber && leadNumber.trim());

            // Validation rules
            const errors = [];
            if (!companyName.trim()) {
              errors.push("Missing Company Name");
            }
            if (!phone.trim() && !email.trim()) {
              errors.push("Missing Phone Number or Email");
            }

            return {
              rowNumber: idx + 2,
              leadNumber: leadNumber.trim(),
              companyName: companyName.trim(),
              contactPerson: contactPerson.trim(),
              designation: designation.trim(),
              phone: phone.trim(),
              email: email.trim(),
              interaction: interaction.trim(),
              source: source.trim(),
              leadType: leadType.trim(),
              salespersonName: salespersonName.trim(),
              nob: nob.trim(),
              division: division.trim(),
              state: state.trim(),
              city: city.trim(),
              address: address.trim(),
              gst: gst.trim(),
              itemName: itemName.trim(),
              quantity: quantity ? Number(quantity) || 1 : 1,
              uom: uom.trim(),
              notes: notes.trim(),
              status: status.trim().toLowerCase(),
              isUpdate,
              isValid: errors.length === 0,
              errors,
            };
          })
          .filter(Boolean);

        setParsedRows(processed);
        setIsValidating(false);
      } catch (err) {
        console.error("Error parsing leads excel file:", err);
        setErrorMsg("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
        setParsedRows([]);
        setIsValidating(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // 3. Filter rows for preview tab
  const filteredRows = parsedRows.filter((r) => {
    if (filterTab === "valid") return r.isValid;
    if (filterTab === "errors") return !r.isValid;
    if (filterTab === "create") return r.isValid && !r.isUpdate;
    if (filterTab === "update") return r.isValid && r.isUpdate;
    return true;
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;
  const createCount = parsedRows.filter((r) => r.isValid && !r.isUpdate).length;
  const updateCount = parsedRows.filter((r) => r.isValid && r.isUpdate).length;

  // 4. Execute Bulk Upload & Update
  const handleExecuteUpload = async () => {
    const validRowsToProcess = parsedRows.filter((r) => r.isValid);
    if (validRowsToProcess.length === 0) {
      setErrorMsg("No valid leads to process. Please correct errors and try again.");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validRowsToProcess.length });

    let createdSuccess = 0;
    let updatedSuccess = 0;
    let failedCount = 0;

    const formattedToday = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy

    for (let i = 0; i < validRowsToProcess.length; i++) {
      const row = validRowsToProcess[i];
      setUploadProgress({ current: i + 1, total: validRowsToProcess.length });

      try {
        if (row.isUpdate && row.leadNumber) {
          // Operation: UPDATE existing lead
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id, lead_number, company_id")
            .eq("lead_number", row.leadNumber)
            .maybeSingle();

          if (existingLead) {
            await updateLead(existingLead.lead_number, {
              company_name: row.companyName || undefined,
              salesperson_name: row.salespersonName || undefined,
              phone_number: row.phone || undefined,
              email: row.email || undefined,
              state: row.state || undefined,
              city: row.city || undefined,
              address: row.address || undefined,
              nob: row.nob || undefined,
              division: row.division || undefined,
              gst: row.gst || undefined,
              notes: row.notes || undefined,
              status: row.status || undefined,
              lead_type: row.leadType || undefined,
              interaction: row.interaction || undefined,
              source: row.source || undefined,
            });

            // Update contact person if provided
            if (row.contactPerson || row.phone) {
              await supabase.from("leads_contact_persons").upsert(
                {
                  lead_id: existingLead.id,
                  name: row.contactPerson || "Primary Contact",
                  designation: row.designation || "",
                  number: row.phone || "",
                },
                { onConflict: "lead_id" }
              );
            }

            updatedSuccess++;
          } else {
            // Lead number provided but not found; fall back to creating it with that number
            const leadPayload = {
              leadNumber: row.leadNumber,
              receiverName: row.salespersonName || currentUsername || "admin1",
              salespersonName: row.salespersonName || currentUsername || "admin1",
              salesType: "New Customer",
              source: row.source || "Direct",
              leadType: row.leadType || "Incoming",
              interaction: row.interaction || "Call",
              companyName: row.companyName,
              phoneNumber: row.phone,
              email: row.email,
              state: row.state,
              city: row.city,
              address: row.address,
              nob: row.nob,
              division: row.division,
              notes: row.notes,
              gst: row.gst,
              date: formattedToday,
              contactPersons: [
                {
                  name: row.contactPerson || "Primary Contact",
                  designation: row.designation || "",
                  number: row.phone || "",
                },
              ],
              items: row.itemName
                ? [
                    {
                      name: row.itemName,
                      uom: row.uom || "Nos",
                      quantity: Number(row.quantity) || 1,
                    },
                  ]
                : [],
            };

            const submitRes = await submitLead(leadPayload);
            if (submitRes?.success) {
              saveSubmittedLead({ ...leadPayload, leadNumber: submitRes.leadNumber });
              createdSuccess++;
            } else {
              failedCount++;
            }
          }
        } else {
          // Operation: CREATE new lead
          const leadPayload = {
            receiverName: row.salespersonName || currentUsername || "admin1",
            salespersonName: row.salespersonName || currentUsername || "admin1",
            salesType: "New Customer",
            source: row.source || "Direct",
            leadType: row.leadType || "Incoming",
            interaction: row.interaction || "Call",
            companyName: row.companyName,
            phoneNumber: row.phone,
            email: row.email,
            state: row.state,
            city: row.city,
            address: row.address,
            nob: row.nob,
            division: row.division,
            notes: row.notes,
            gst: row.gst,
            date: formattedToday,
            contactPersons: [
              {
                name: row.contactPerson || "Primary Contact",
                designation: row.designation || "",
                number: row.phone || "",
              },
            ],
            items: row.itemName
              ? [
                  {
                    name: row.itemName,
                    uom: row.uom || "Nos",
                    quantity: Number(row.quantity) || 1,
                  },
                ]
              : [],
          };

          const submitRes = await submitLead(leadPayload);
          if (submitRes?.success) {
            saveSubmittedLead({ ...leadPayload, leadNumber: submitRes.leadNumber });

            // Sync names to local Masters
            if (row.salespersonName) {
              addValueToNameMaster(row.salespersonName, getLeadReceiverNames, saveLeadReceiverNames, "LRN", "lrnNo");
            }
            if (row.source) {
              addValueToNameMaster(row.source, getLeadSources, saveLeadSources, "LS", "lsNo");
            }
            if (row.nob) {
              addValueToNameMaster(row.nob, getNOBs, saveNOBs, "NOB", "nobNo");
            }

            createdSuccess++;
          } else {
            failedCount++;
          }
        }
      } catch (rowErr) {
        console.error(`Error processing row ${row.rowNumber} (${row.companyName}):`, rowErr);
        failedCount++;
      }
    }

    setUploadStats({
      created: createdSuccess,
      updated: updatedSuccess,
      failed: failedCount,
    });
    setIsUploading(false);

    if (onUploadSuccess && (createdSuccess > 0 || updatedSuccess > 0)) {
      onUploadSuccess({ created: createdSuccess, updated: updatedSuccess });
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setUploadStats(null);
    setErrorMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                Bulk Upload & Update Leads
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-700/60">
                  Excel (.xlsx)
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Download the template, fill in lead inquiries and company records, then upload to create or update in bulk.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Step 1: Download Template Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-blue-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                <Download size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Step 1: Download Standard Leads Excel Template
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5 max-w-xl leading-relaxed">
                  The template includes sample entries and pre-configured column headers: Company Name, Contact Person, Phone, Email, Interaction, NOB, State, City, GST, Products, and Notes. To update existing leads, fill the optional <strong>Lead Number</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
            >
              <Download size={14} /> Download Template (.xlsx)
            </button>
          </div>

          {/* Upload Success Summary Banner */}
          {uploadStats && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Bulk Upload Completed Successfully!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Created: <strong>{uploadStats.created}</strong> new leads • Updated: <strong>{uploadStats.updated}</strong> existing leads {uploadStats.failed > 0 && `• Failed: ${uploadStats.failed}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Upload Another File
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Upload Dropzone (When no file or before upload) */}
          {!file && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-200/80 dark:border-slate-700 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:scale-105 transition-all">
                <UploadCloud size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                  Step 2: Drag & drop your filled Excel file here, or <span className="text-emerald-600 dark:text-emerald-400 underline">browse</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Supports .xlsx, .xls, and .csv files (up to 15 MB)
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Validation Loader */}
          {isValidating && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <Loader2 size={24} className="animate-spin text-emerald-600" />
              <span>Reading and validating Excel sheet rows...</span>
            </div>
          )}

          {/* File Selected Summary & Preview */}
          {file && !isValidating && parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* File details card */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {file.name}
                      <span className="text-[10px] font-normal text-gray-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                      Total {parsedRows.length} rows parsed
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} /> Change File
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Counters */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-b border-gray-150 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      filterTab === "all"
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    All Rows ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("valid")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === "valid"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    }`}
                  >
                    <CheckCircle2 size={12} /> Valid ({validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("create")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === "create"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    }`}
                  >
                    New Leads ({createCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("update")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                      filterTab === "update"
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    }`}
                  >
                    Updates ({updateCount})
                  </button>
                  {errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTab("errors")}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                        filterTab === "errors"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      }`}
                    >
                      <AlertCircle size={12} /> Errors ({errorCount})
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-gray-500 dark:text-slate-400">
                  Showing {filteredRows.length} of {parsedRows.length} records
                </span>
              </div>

              {/* Data Preview Table */}
              <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs text-gray-600 dark:text-slate-300">
                  <thead className="bg-gray-50 dark:bg-slate-800/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Lead No</th>
                      <th className="py-2.5 px-3">Company Name</th>
                      <th className="py-2.5 px-3">Contact Person</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Product / Qty</th>
                      <th className="py-2.5 px-3 text-right">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredRows.map((r, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          !r.isValid ? "bg-rose-50/40 dark:bg-rose-950/20" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[10px] text-gray-400">
                          #{r.rowNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.isUpdate ? (
                            <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                              Update
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                              New Lead
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-gray-800 dark:text-slate-200">
                          {r.leadNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white max-w-[160px] truncate">
                          {r.companyName || <span className="text-rose-500">Missing</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.contactPerson || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-slate-300">
                          {r.phone || <span className="text-amber-500">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {r.city ? `${r.city}${r.state ? `, ${r.state}` : ""}` : r.state || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] max-w-[140px] truncate">
                          {r.itemName ? (
                            <span title={`${r.itemName} (${r.quantity} ${r.uom})`}>
                              {r.itemName} ({r.quantity} {r.uom})
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={12} /> Ready
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400"
                              title={r.errors.join(", ")}
                            >
                              <AlertCircle size={12} /> {r.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      Uploading and updating leads into database...
                    </span>
                    <span>
                      {uploadProgress.current} / {uploadProgress.total} ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{
                        width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 dark:text-slate-400">
            {parsedRows.length > 0 && !uploadStats && (
              <span>
                <strong>{validCount}</strong> valid leads ready to process
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteUpload}
              disabled={isUploading || validCount === 0 || uploadStats !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing Leads...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={15} />
                  Upload & Update {validCount} Leads
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
