import { useState, useMemo, useCallback } from "react";
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Upload,
  Paperclip,
  Image as ImageIcon,
  FileText,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import TatStageBadge from "./TatStageBadge";
import CircularProcessingLoader from "./CircularProcessingLoader";
import { createAutoReturnFromGrn } from "../../purchaseReturn/services/purchaseReturnApi";
import { generatePoPdf } from "../utils/poPdfGenerator";

import {
  formatDateDash,
  formatDateTime,
  resolvePlannedDate,
} from "../utils/dateUtils";

const safeNum = (v) => parseFloat(String(v || "0").replace(/,/g, "")) || 0;

const fmtCurrency = (raw) => {
  if (!raw || raw === "0" || raw === 0) return "-";
  const n = safeNum(raw);
  return isNaN(n)
    ? String(raw)
    : `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Generate next sequential GRN number from DB */
const generateGRN = async () => {
  const { data } = await supabase
    .from("material_receipts")
    .select("grn_number")
    .order("created_at", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0 && data[0].grn_number) {
    const match = data[0].grn_number.match(/GRN-(\d+)/i);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return `GRN-${String(nextNum).padStart(3, "0")}`;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });

/** Upload a File to Supabase Storage — returns public URL or persistent Base64 Data URL as fallback */
const uploadToStorage = async (file) => {
  if (!file) return "";
  try {
    const cleanFileName = file.name ? file.name.replace(/\s+/g, "_") : "image.png";
    const path = `${Date.now()}_${cleanFileName}`;
    const { error } = await supabase.storage
      .from("material-images")
      .upload(path, file, { upsert: true });
    if (error) {
      console.warn("Storage upload error (using data URL fallback):", error.message);
      return await readFileAsDataUrl(file);
    }
    const { data } = supabase.storage
      .from("material-images")
      .getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("Upload exception (using data URL fallback):", err);
    return await readFileAsDataUrl(file);
  }
};

const RECEIVED_STATUSES = ["received", "delivered", "completed", "complete"];
const isTransporterDone = (t) =>
  !!t && RECEIVED_STATUSES.includes(String(t.status || "").toLowerCase());

// ─────────────────────────────────────────────────────────────────────────────

export default function MaterialReceivedView() {
  const { showToast } = useMagicToast();
  const {
    indents,
    purchaseOrders,
    vendorLiftings,
    transporterFollowups,
    materialReceipts,
    vendorPayments,
    getTatStatusForIndent,
    getIndentNumber,
    getLiftNumber,
    refreshData,
    loading,
    isRefreshing,
    isBackgroundStreaming,
  } = usePurchaseWorkflow();

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkBillAttachment, setBulkBillAttachment] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Single-record form
  const [grnForm, setGrnForm] = useState({
    receivedQty: "",
    receivedItemImage: null,
    billAttachment: null,
    damageReceived: "no",
    damagedQty: "",
    damageReason: "",
    damageImage: null,
    remarks: "",
  });

  const handleViewPoCopy = async (d) => {
    const directUrl =
      d.poCopy ||
      d.rawPo?.po_copy_url ||
      d.rawPo?.po_pdf_url ||
      d.rawPo?.po_file_url ||
      d.rawPo?.po_copy ||
      d.rawPo?.attachment_url;

    if (directUrl && String(directUrl).startsWith("http")) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const matchedPo =
      d.rawPo ||
      (purchaseOrders || []).find(
        (p) => p.id === d._poId || p.po_number === d.poNumber,
      ) ||
      {};

    try {
      if (showToast)
        showToast(
          `Opening PO ${d.poNumber || matchedPo.po_number || "Copy"}...`,
          "info",
        );
      await generatePoPdf(
        {
          ...matchedPo,
          poNumber:
            matchedPo.po_number ||
            matchedPo.poNumber ||
            d.poNumber ||
            "PO-2026-001",
          poDate:
            matchedPo.po_date ||
            matchedPo.created_at ||
            new Date().toISOString().split("T")[0],
          vendorName: matchedPo.vendor_name || d.vendorName || "Supplier",
          vendorAddress:
            matchedPo.vendor_address ||
            `${matchedPo.vendor_name || d.vendorName || "Supplier"} Industrial Complex`,
          vendorContact:
            matchedPo.vendor_contact || "Authorized Representative",
          vendorPhone:
            matchedPo.vendor_phone ||
            matchedPo.vendor_contact_no ||
            "9123456789",
          vendorEmail:
            matchedPo.vendor_email ||
            `sales@${(matchedPo.vendor_name || d.vendorName || "vendor").toLowerCase().replace(/\\s+/g, "")}.com`,
          vendorGstin: matchedPo.vendor_gstin || "22AAAPL1234A1Z5",
          consigneeName:
            matchedPo.firm_name ||
            matchedPo.consigneeName ||
            "Nutech Pipes Pvt. Ltd.",
          billingName:
            matchedPo.firm_name ||
            matchedPo.consigneeName ||
            "Nutech Pipes Pvt. Ltd.",
          destinationName:
            matchedPo.delivery_location || d.warehouse || "Plant",
          deliveryLocation:
            matchedPo.delivery_location || d.warehouse || "Plant",
          quotationNumber:
            matchedPo.quotation_number || matchedPo.quotation_no || "-",
          quotationDate: matchedPo.quotation_date || "-",
          paymentTerms: matchedPo.payment_type
            ? `Advance Payment (${matchedPo.advance_percentage || 0}%)`
            : matchedPo.payment_terms || "30 Days Credit",
          advanceAmount: Number(matchedPo.advance_amount || 0),
          transportType: matchedPo.transport_type || "F.O.R. Destination",
          remarks: matchedPo.remarks || "",
          items:
            matchedPo.items &&
            Array.isArray(matchedPo.items) &&
            matchedPo.items.length > 0
              ? matchedPo.items.map((it) => ({
                  ...it,
                  indentNumber:
                    it.indentNumber ||
                    it.indent_number ||
                    d.indentNumber ||
                    "-",
                }))
              : [
                  {
                    srNo: 1,
                    itemName:
                      matchedPo.item_name || d.itemName || "Material Item",
                    indentNumber: d.indentNumber || "-",
                    quantity: Number(matchedPo.quantity || safeNum(d.poQty) || safeNum(d.liftingQty) || 1),
                    uom: matchedPo.uom || d.uom || "NOS",
                    rate: Number(matchedPo.unit_rate || matchedPo.rate || 75),
                    hsn: matchedPo.hsn_code || matchedPo.hsn || "7216",
                    gstPercent: String(
                      matchedPo.gst_percent || matchedPo.gst_rate || "18",
                    ).replace("%", ""),
                    amount:
                      matchedPo.total_amount ||
                      Number(matchedPo.unit_rate || 75) *
                        Number(matchedPo.quantity || 1) *
                        1.18,
                  },
                ],
          totalAmount: matchedPo.total_amount,
        },
        { openWindow: true },
      );
    } catch (err) {
      console.error("Failed to generate PO PDF:", err);
      if (showToast)
        showToast(`Failed to open PO Copy: ${err.message}`, "error");
    }
  };

  // ─── Row Building ───────────────────────────────────────────────────────────

  const sheetRecords = useMemo(() => {
    const rows = [];

    // Build lookup maps
    const posByIndentId = new Map();
    purchaseOrders.forEach((po) => {
      if (!po.indent_id) return;
      const list = posByIndentId.get(po.indent_id) || [];
      list.push(po);
      posByIndentId.set(po.indent_id, list);
    });

    const liftingsByPo = new Map();
    vendorLiftings.forEach((l) => {
      if (!l.po_id) return;
      const list = liftingsByPo.get(l.po_id) || [];
      list.push(l);
      liftingsByPo.set(l.po_id, list);
    });

    // Latest TF per po_id (fallback) and per lifting_id (preferred)
    const tfByPo = new Map();
    const tfByLifting = new Map();
    transporterFollowups.forEach((t) => {
      const existing = tfByPo.get(t.po_id);
      if (
        !existing ||
        new Date(t.updated_at || 0) > new Date(existing.updated_at || 0)
      ) {
        tfByPo.set(t.po_id, t);
      }
      if (t.lifting_id) {
        const existingL = tfByLifting.get(t.lifting_id);
        if (
          !existingL ||
          new Date(t.updated_at || 0) > new Date(existingL.updated_at || 0)
        ) {
          tfByLifting.set(t.lifting_id, t);
        }
      }
    });

    const receiptsByPo = new Map();
    materialReceipts.forEach((r) => {
      if (!r.po_id) return;
      const list = receiptsByPo.get(r.po_id) || [];
      list.push(r);
      receiptsByPo.set(r.po_id, list);
    });

    const paymentsByPo = new Map();
    (vendorPayments || []).forEach((p) => {
      const keys = [
        p.po_id,
        p.purchase_orders?.id,
        p.purchase_orders?.po_number,
        p.indent_id,
        p.purchase_orders?.indent_id,
      ].filter(Boolean);

      keys.forEach((k) => {
        const list = paymentsByPo.get(k) || [];
        if (!list.some((existing) => existing.id === p.id)) {
          list.push(p);
          paymentsByPo.set(k, list);
        }
      });
    });

    // Iterate indents → POs
    const sourceIndents = indents.length > 0 ? indents : [];
    const allPOs = purchaseOrders;

    // If no indents loaded yet, fall back to iterating POs directly
    const processedPoIds = new Set();

    for (const indent of sourceIndents) {
      const indentPOs = posByIndentId.get(indent.id) || [];

      for (const po of indentPOs) {
        processedPoIds.add(po.id);
        _buildRowsForPO(
          po,
          indent,
          rows,
          liftingsByPo,
          tfByPo,
          tfByLifting,
          receiptsByPo,
          paymentsByPo,
          getIndentNumber,
          getLiftNumber,
          getTatStatusForIndent,
        );
      }
    }

    // Also process POs not linked to any indent in state
    for (const po of allPOs) {
      if (processedPoIds.has(po.id)) continue;
      _buildRowsForPO(
        po,
        null,
        rows,
        liftingsByPo,
        tfByPo,
        tfByLifting,
        receiptsByPo,
        paymentsByPo,
        getIndentNumber,
        getLiftNumber,
        getTatStatusForIndent,
      );
    }

    return rows;
  }, [
    indents,
    purchaseOrders,
    vendorLiftings,
    transporterFollowups,
    materialReceipts,
    vendorPayments,
    getIndentNumber,
    getLiftNumber,
    getTatStatusForIndent,
  ]);

  const pendingList = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return sheetRecords.filter((r) => {
      if (r.status !== "pending") return false;
      if (!lower) return true;
      const d = r.data;
      return (
        String(d.indentNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.liftNo || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vendorName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.itemName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.poNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.transporterName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vehicleNo || "")
          .toLowerCase()
          .includes(lower)
      );
    });
  }, [sheetRecords, searchTerm]);

  const historyList = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return sheetRecords.filter((r) => {
      if (r.status !== "completed") return false;
      if (!lower) return true;
      const d = r.data;
      return (
        String(d.indentNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.liftNo || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vendorName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.itemName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.poNumber || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.transporterName || "")
          .toLowerCase()
          .includes(lower) ||
        String(d.vehicleNo || "")
          .toLowerCase()
          .includes(lower)
      );
    });
  }, [sheetRecords, searchTerm]);

  // Record map for fast lookup
  const recordMap = useMemo(
    () => new Map(sheetRecords.map((r) => [r.id, r])),
    [sheetRecords],
  );

  // Pagination
  const currentList = activeTab === "pending" ? pendingList : historyList;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage, pageSize]);

  // ─── Checkbox / Bulk Selection ──────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState([]);

  const getSamePORecordIds = useCallback(
    (recordId) => {
      const rec = recordMap.get(recordId);
      if (!rec) return [recordId];
      const poNum = String(rec.data?.poNumber || "").trim();
      if (!poNum || poNum === "-") return [recordId];
      return sheetRecords
        .filter(
          (r) =>
            r.status === "pending" &&
            String(r.data?.poNumber || "").trim() === poNum,
        )
        .map((r) => r.id);
    },
    [sheetRecords, recordMap],
  );

  const checkVendorPOMatch = useCallback(
    (ids) => {
      if (ids.length === 0) return false;
      const first = recordMap.get(ids[0]);
      if (!first) return false;
      const v = first.data.vendorName;
      const p = first.data.poNumber;
      for (let i = 1; i < ids.length; i++) {
        const r = recordMap.get(ids[i]);
        if (!r || r.data.vendorName !== v || r.data.poNumber !== p)
          return false;
      }
      return true;
    },
    [recordMap],
  );

  const toggleSelect = useCallback(
    (recordId, checked) => {
      const groupIds = getSamePORecordIds(recordId);
      setSelectedIds((prev) => {
        const groupSet = new Set(groupIds);
        if (checked) return Array.from(new Set([...prev, ...groupIds]));
        return prev.filter((id) => !groupSet.has(id));
      });
    },
    [getSamePORecordIds],
  );

  // ─── Open Modal ─────────────────────────────────────────────────────────────

  const openModal = useCallback(
    (recordId) => {
      const rec = recordMap.get(recordId);
      if (!rec) {
        showToast("Record not found. Please refresh.", "error");
        return;
      }

      const groupIds = getSamePORecordIds(recordId);
      if (groupIds.length > 1) {
        // Auto-bulk mode
        setSelectedIds(groupIds);
        setIsBulkMode(true);
        setBulkItems(
          groupIds.map((id) => {
            const r = recordMap.get(id);
            return {
              recordId: id,
              indentNumber: r?.data?.indentNumber || "",
              liftNumber: r?.data?.liftNo || "",
              itemName: r?.data?.itemName || "",
              receivedQty: "",
              receivedItemImage: null,
              damageReceived: "no",
              damagedQty: "",
              damageReason: "",
              damageImage: null,
            };
          }),
        );
        setModalOpen(true);
        return;
      }

      // Single mode
      setSelectedIds([]);
      setIsBulkMode(false);
      setSelectedRecordId(recordId);
      setGrnForm({
        receivedQty: String(safeNum(rec.data.liftingQty) || safeNum(rec.data.poQty) || ""),
        receivedItemImage: null,
        billAttachment: null,
        damageReceived: "no",
        damagedQty: "",
        damageReason: "",
        damageImage: null,
        remarks: "",
      });
      setModalOpen(true);
    },
    [recordMap, getSamePORecordIds, showToast],
  );

  const openBulkModal = useCallback(() => {
    if (selectedIds.length === 0) return;
    const expanded = new Set();
    selectedIds.forEach((id) =>
      getSamePORecordIds(id).forEach((gid) => expanded.add(gid)),
    );
    const ids = Array.from(expanded);
    if (ids.length > 1 && !checkVendorPOMatch(ids)) {
      showToast(
        "All selected items must have the same Vendor and PO Number.",
        "error",
      );
      return;
    }
    setSelectedIds(ids);
    setIsBulkMode(true);
    setBulkBillAttachment(null);
    setBulkItems(
      ids.map((id) => {
        const r = recordMap.get(id);
        return {
          recordId: id,
          indentNumber: r?.data?.indentNumber || "",
          liftNumber: r?.data?.liftNo || "",
          itemName: r?.data?.itemName || "",
          receivedQty: "",
          receivedItemImage: null,
          damageReceived: "no",
          damagedQty: "",
          damageReason: "",
          damageImage: null,
        };
      }),
    );
    setModalOpen(true);
  }, [
    selectedIds,
    getSamePORecordIds,
    checkVendorPOMatch,
    recordMap,
    showToast,
  ]);

  // ─── Submit (Single) ────────────────────────────────────────────────────────

  const handleSubmitGrn = useCallback(
    async (e) => {
      e.preventDefault();
      if (!selectedRecordId) return;
      const rec = recordMap.get(selectedRecordId);
      if (!rec) return;
      setIsSubmitting(true);
      try {
        const receivedQty = safeNum(grnForm.receivedQty);
        const isDamaged = grnForm.damageReceived === "yes";
        const damagedQty = isDamaged ? safeNum(grnForm.damagedQty) : 0;
        const availableQty = safeNum(rec.data.liftingQty || rec.data.poQty);

        if (receivedQty > availableQty && availableQty > 0) {
          showToast(
            `Cannot receive ${receivedQty} — Dispatch Qty is ${availableQty}`,
            "error",
          );
          return;
        }
        if (damagedQty > receivedQty) {
          showToast("Damaged qty cannot exceed received qty", "error");
          return;
        }

        const imageUrl =
          grnForm.receivedItemImage instanceof File
            ? await uploadToStorage(grnForm.receivedItemImage)
            : "";

        let billAttachmentUrl = "";
        if (grnForm.billAttachment instanceof File) {
          billAttachmentUrl = await uploadToStorage(grnForm.billAttachment);
        }

        let damageImageUrl = "";
        if (grnForm.damageImage instanceof File) {
          damageImageUrl = await uploadToStorage(grnForm.damageImage);
        }

        const baseGrn = await generateGRN();
        const grnNumber = baseGrn;

        const nowIso = new Date().toISOString();
        const { data: insertedReceipt, error: insertError } = await supabase
          .from("material_receipts")
          .insert({
            grn_number: grnNumber,
            po_id: rec.data._poId,
            received_date: nowIso,
            received_quantity: receivedQty,
            accepted_quantity: isDamaged
              ? Math.max(0, receivedQty - damagedQty)
              : receivedQty,
            rejected_quantity: damagedQty,
            received_item_image_url: imageUrl || null,
            bilty_invoice_image_url: billAttachmentUrl || null,
            received_by: "Store Incharge",
            status: isDamaged && damagedQty > 0 ? "QC Failed" : "QC Passed",
          })
          .select()
          .single();
        if (insertError) throw insertError;

        let autoReturnPrNumber = null;
        if (isDamaged && damagedQty > 0) {
          try {
            let poDetails = null;
            if (rec.data._poId) {
              const { data: poRow } = await supabase
                .from("purchase_orders")
                .select(
                  "po_number, vendor_name, item_name, item_code, unit_rate, gst_percent, firm_name, delivery_location, indent_id",
                )
                .eq("id", rec.data._poId)
                .maybeSingle();
              poDetails = poRow;
            }

            let companyName = poDetails?.firm_name || "Nutech";
            let divisionName = "Nutech Pipes";
            const indentId = poDetails?.indent_id || rec.data.indent_id;
            if (indentId) {
              const { data: indentRow } = await supabase
                .from("indents")
                .select("company, division, warehouse_location, delivery_location")
                .eq("id", indentId)
                .maybeSingle();
              if (indentRow?.company) companyName = indentRow.company;
              if (indentRow?.division) divisionName = indentRow.division;
            }

            const autoReturn = await createAutoReturnFromGrn({
              poId: rec.data._poId || null,
              materialReceiptId: insertedReceipt?.id || null,
              grnNumber,
              receivedDate: nowIso.split("T")[0],
              vendorName: rec.data.vendorName || poDetails?.vendor_name || "",
              poNumber: rec.data.poNumber || poDetails?.po_number || "",
              indentNumber: rec.data.indentNumber || "",
              company: companyName,
              division: divisionName,
              createdBy: "Store Incharge",
              items: [
                {
                  indentNumber: rec.data.indentNumber || "",
                  itemCode: poDetails?.item_code || "ITM-001",
                  itemName:
                    rec.data.itemName || poDetails?.item_name || "Material",
                  unit: "KG",
                  purchaseQty: receivedQty,
                  damageQty: damagedQty,
                  unitRate: poDetails?.unit_rate || 0,
                  gstPercent: poDetails?.gst_percent || 0,
                  damageReason: grnForm.damageReason || "Damaged on receipt",
                  damageImageFile:
                    grnForm.damageImage instanceof File
                      ? grnForm.damageImage
                      : null,
                  damageImageUrl: damageImageUrl || null,
                },
              ],
            });
            if (autoReturn?.return_number) {
              autoReturnPrNumber = autoReturn.return_number;
            }
          } catch (autoErr) {
            console.error("Auto Return creation failed:", autoErr);
            showToast(
              `GRN created, but auto Purchase Return creation failed: ${autoErr.message}`,
              "warning",
            );
          }
        }

        if (autoReturnPrNumber) {
          showToast(
            `GRN ${grnNumber} issued! Return Request ${autoReturnPrNumber} auto-created for ${damagedQty} damaged qty.`,
            "success",
          );
        } else {
          showToast(
            `GRN ${grnNumber} issued! Order moved to Tally Billing.`,
            "success",
          );
        }
        setModalOpen(false);
        await refreshData(true);
      } catch (err) {
        console.error("GRN Error:", err);
        showToast(`GRN failed: ${err.message}`, "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedRecordId, recordMap, grnForm, showToast, refreshData],
  );

  // ─── Submit (Bulk) ──────────────────────────────────────────────────────────

  const handleBulkSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        let sharedBulkBillUrl = "";
        if (bulkBillAttachment instanceof File) {
          sharedBulkBillUrl = await uploadToStorage(bulkBillAttachment);
        }

        const damagedBulkItems = [];
        for (const item of bulkItems) {
          const rec = recordMap.get(item.recordId);
          if (!rec) continue;

          const receivedQty = safeNum(item.receivedQty);
          const isDamaged = item.damageReceived === "yes";
          const damagedQty = isDamaged ? safeNum(item.damagedQty) : 0;
          const availableQty = safeNum(rec.data.liftingQty || rec.data.poQty);

          if (receivedQty > availableQty && availableQty > 0) {
            showToast(
              `Cannot receive ${receivedQty} for ${item.indentNumber} — Dispatch Qty is ${availableQty}`,
              "error",
            );
            setIsSubmitting(false);
            return;
          }
          if (damagedQty > receivedQty) {
            showToast(
              `Damaged qty exceeds received qty for ${item.indentNumber}`,
              "error",
            );
            setIsSubmitting(false);
            return;
          }

          const itemImgUrl =
            item.receivedItemImage instanceof File
              ? await uploadToStorage(item.receivedItemImage)
              : "";
          let damageImgUrl = "";
          if (item.damageImage instanceof File) {
            damageImgUrl = await uploadToStorage(item.damageImage);
          }

          const baseGrn = await generateGRN();
          const grnNumber = baseGrn;
          const bulkNowIso = new Date().toISOString();

          const { data: insertedReceipt, error: insertError } = await supabase
            .from("material_receipts")
            .insert({
              grn_number: grnNumber,
              po_id: rec.data._poId,
              received_date: bulkNowIso,
              received_quantity: receivedQty,
              accepted_quantity: isDamaged
                ? Math.max(0, receivedQty - damagedQty)
                : receivedQty,
              rejected_quantity: damagedQty,
              received_item_image_url: itemImgUrl || null,
              bilty_invoice_image_url: sharedBulkBillUrl || null,
              received_by: null,
              status: isDamaged && damagedQty > 0 ? "QC Failed" : "QC Passed",
            })
            .select()
            .single();
          if (insertError) throw insertError;

          if (isDamaged && damagedQty > 0) {
            damagedBulkItems.push({
              item,
              rec,
              receipt: insertedReceipt,
              receivedQty,
              damagedQty,
              grnNumber,
              damageImgUrl,
            });
          }
        }

        let autoReturnPrNumber = null;
        if (damagedBulkItems.length > 0) {
          try {
            const firstEntry = damagedBulkItems[0];
            const poIds = Array.from(
              new Set(
                damagedBulkItems.map((d) => d.rec.data._poId).filter(Boolean),
              ),
            );
            const poMap = new Map();
            if (poIds.length > 0) {
              const { data: allPoRows } = await supabase
                .from("purchase_orders")
                .select(
                  "id, po_number, vendor_name, item_name, item_code, unit_rate, gst_percent, firm_name, indent_id",
                )
                .in("id", poIds);
              (allPoRows || []).forEach((p) => poMap.set(p.id, p));
            }

            const poDetails = poMap.get(firstEntry.rec.data._poId);
            let companyName = poDetails?.firm_name || "Nutech";
            let divisionName = "Nutech Pipes";
            const indentId =
              poDetails?.indent_id || firstEntry.rec.data.indent_id;
            if (indentId) {
              const { data: indentRow } = await supabase
                .from("indents")
                .select("company, division")
                .eq("id", indentId)
                .maybeSingle();
              if (indentRow?.company) companyName = indentRow.company;
              if (indentRow?.division) divisionName = indentRow.division;
            }

            const returnItems = damagedBulkItems.map((d, idx) => {
              const po = poMap.get(d.rec.data._poId) || poDetails;
              return {
                indentNumber:
                  d.rec.data.indentNumber || d.item.indentNumber || "",
                itemCode: po?.item_code || `ITM-${idx + 1}`,
                itemName:
                  d.rec.data.itemName ||
                  d.item.itemName ||
                  po?.item_name ||
                  "Material",
                unit: "KG",
                purchaseQty: d.receivedQty,
                damageQty: d.damagedQty,
                unitRate: po?.unit_rate || 0,
                gstPercent: po?.gst_percent || 0,
                damageReason: d.item.damageReason || "Damaged on receipt",
                damageImageFile:
                  d.item.damageImage instanceof File
                    ? d.item.damageImage
                    : null,
                damageImageUrl: d.damageImgUrl || null,
              };
            });

            const grnNumbers = Array.from(
              new Set(damagedBulkItems.map((d) => d.grnNumber)),
            ).join(", ");

            const autoReturn = await createAutoReturnFromGrn({
              poId: firstEntry.rec.data._poId || null,
              materialReceiptId: firstEntry.receipt?.id || null,
              grnNumber: grnNumbers,
              receivedDate: new Date().toISOString().split("T")[0],
              vendorName:
                firstEntry.rec.data.vendorName ||
                poDetails?.vendor_name ||
                "",
              poNumber:
                firstEntry.rec.data.poNumber || poDetails?.po_number || "",
              indentNumber: firstEntry.rec.data.indentNumber || "",
              company: companyName,
              division: divisionName,
              createdBy: "Store Incharge",
              items: returnItems,
            });
            if (autoReturn?.return_number) {
              autoReturnPrNumber = autoReturn.return_number;
            }
          } catch (autoErr) {
            console.error("Bulk Auto Return creation failed:", autoErr);
            showToast(
              `Bulk receipt recorded, but auto Purchase Return creation failed: ${autoErr.message}`,
              "warning",
            );
          }
        }

        if (autoReturnPrNumber) {
          showToast(
            `Bulk receipt recorded! Return Request ${autoReturnPrNumber} auto-created for damaged items.`,
            "success",
          );
        } else {
          showToast("Bulk receipt recorded successfully!", "success");
        }
        setModalOpen(false);
        setSelectedIds([]);
        setIsBulkMode(false);
        await refreshData(true);
      } catch (err) {
        console.error("Bulk GRN Error:", err);
        showToast(`Bulk submit failed: ${err.message}`, "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [bulkItems, bulkBillAttachment, recordMap, showToast, refreshData],
  );

  // ─── Derived values for the open single modal ───────────────────────────────
  const activeRec = selectedRecordId ? recordMap.get(selectedRecordId) : null;
  const singleLiftQty = safeNum(
    activeRec?.data?.liftingQty || activeRec?.data?.poQty,
  );
  const singleReceivedQty = safeNum(grnForm.receivedQty);
  const singleDiff = singleLiftQty - singleReceivedQty;
  const singlePoBalance = Math.max(
    0,
    safeNum(activeRec?.data?.remainingPOBalance) - singleReceivedQty,
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Stage 10 : Material Received / Quality Inspection & GRN
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect arrived consignments at warehouse, record accepted vs
                rejected items, and issue Goods Receipt Notes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk Record button */}
            {activeTab === "pending" && selectedIds.length > 1 && (
              <button
                type="button"
                onClick={openBulkModal}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                Bulk Record ({selectedIds.length})
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refreshData(true)}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isBackgroundStreaming && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 rounded-xl text-blue-600 dark:text-blue-400 text-[11px] font-medium animate-pulse shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span className="hidden sm:inline">Syncing live batches...</span>
              </div>
            )}

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent, PO, Vendor, Item..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {[
              {
                key: "pending",
                label: `Pending Warehouse Inspection (${loading || isRefreshing ? "..." : pendingList.length})`,
              },
              {
                key: "history",
                label: `Issued GRN Register (${loading || isRefreshing ? "..." : historyList.length})`,
              },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setSelectedIds([]);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              {activeTab === "pending" ? (
                <tr>
                  <th className="p-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        pendingList.length > 0 &&
                        pendingList.every((r) => selectedIds.includes(r.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedIds(pendingList.map((r) => r.id));
                        else setSelectedIds([]);
                      }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 text-center">Actions</th>
                  <th className="p-3">Indent No.</th>
                  <th className="p-3">Unit Tracking No.</th>
                  <th className="p-3">Warehouse</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3 text-right">PO Qty</th>
                  <th className="p-3 text-right">Dispatch Qty</th>
                  <th className="p-3 text-right">Rec. So Far</th>
                  <th className="p-3 text-right">Pending Bal.</th>
                  <th className="p-3 text-center font-mono">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                  <th className="p-3 text-center">Next Follow-Up</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Transporter</th>
                  <th className="p-3">Vehicle No</th>
                  <th className="p-3">Contact No</th>
                  <th className="p-3 text-center">Dispatch Date</th>
                  <th className="p-3 text-right">Freight Amt</th>
                  <th className="p-3 text-right">Advance Amt</th>
                  <th className="p-3 text-center">Payment Date</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-center">Bilty Copy</th>
                  <th className="p-3 text-center">PO Copy</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-3">Indent No.</th>
                  <th className="p-3">Unit Tracking No.</th>
                  <th className="p-3">Warehouse</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">PO Number</th>
                  <th className="p-3 text-right">PO Qty</th>
                  <th className="p-3 text-center">Actual (Received)</th>
                  <th className="p-3 text-right">Dispatch Qty</th>
                  <th className="p-3 text-right">Rec. So Far</th>
                  <th className="p-3 text-right">Pending Bal.</th>
                  <th className="p-3 text-center font-mono">Planned Date</th>
                  <th className="p-3 text-center">Delay</th>
                  <th className="p-3 text-center">Next Follow-Up</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Transporter</th>
                  <th className="p-3">Vehicle No</th>
                  <th className="p-3">Contact No</th>
                  <th className="p-3 text-center">Dispatch Date</th>
                  <th className="p-3 text-right">Freight Amt</th>
                  <th className="p-3 text-right">Advance Amt</th>
                  <th className="p-3 text-center">Payment Date</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-center">Bilty Copy</th>
                  <th className="p-3 text-center">PO Copy</th>
                  <th className="p-3">Receipt Lift No.</th>
                  <th className="p-3 text-right">Received Qty</th>
                  <th className="p-3 text-center">Invoice Date</th>
                  <th className="p-3">Invoice No.</th>
                  <th className="p-3 text-center">Extra Freight</th>
                  <th className="p-3 text-center">Item Image</th>
                  <th className="p-3 text-center">Bill Attach</th>
                  <th className="p-3 text-right">Damaged Qty</th>
                  <th className="p-3">Damage Reason</th>
                  <th className="p-3 text-center">Damage Image</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading || isRefreshing || (isBackgroundStreaming && paginatedData.length === 0) ? (
                <tr>
                  <td colSpan={36} className="p-12 text-center">
                    <CircularProcessingLoader
                      message="Loading & processing material receipts..."
                      subMessage="Verifying consignments, quality inspections, and GRN registers"
                    />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={36} className="p-8 text-center text-slate-400">
                    No{" "}
                    {activeTab === "pending"
                      ? "pending consignments"
                      : "issued GRN history"}{" "}
                    found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const d = row.data;
                  const isSelected = selectedIds.includes(row.id);

                  if (activeTab === "pending") {
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"}`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              toggleSelect(row.id, e.target.checked)
                            }
                            className="w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        {/* Action */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => openModal(row.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Record Receipt
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {d.indentNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                          {d.liftNo}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {d.warehouse || "-"}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {d.vendorName}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {d.itemName}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {d.poNumber}
                        </td>
                        <td className="p-3 text-right font-bold">{d.poQty}</td>
                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {d.liftingQty}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.totalReceivedSoFar}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {d.remainingPOBalance}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(
                            resolvePlannedDate(
                              getTatStatusForIndent(
                                d.indent_id || d.indentNumber || row.id,
                                "Material Received (GRN)",
                              ),
                              d.planned6 || d.plannedDate,
                            ),
                          ) || "-"}
                        </td>
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TatStageBadge
                            tatStatus={getTatStatusForIndent(
                              d.indent_id || d.indentNumber || row.id,
                              "Material Received (GRN)",
                            )}
                            indentId={d.indent_id || row.id}
                          />
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.nextFollowUpDate) || "-"}
                        </td>
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                          title={d.remarks}
                        >
                          {d.remarks || "-"}
                        </td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          {d.transporterName || "-"}
                        </td>
                        <td className="p-3 font-mono uppercase font-bold">
                          {d.vehicleNo || "-"}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {d.contactNo || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.dispatchDate) || "-"}
                        </td>
                        <td className="p-3 text-right">{d.freightAmount}</td>
                        <td className="p-3 text-right">{d.advanceAmount}</td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.paymentDate) || "—"}
                        </td>
                        <td className="p-3 text-center">
                          {(() => {
                            const st = d.paymentStatus || "Credit Terms";
                            const isPaid =
                              st.toLowerCase().includes("paid") ||
                              st.toLowerCase() === "completed" ||
                              st.toLowerCase() === "cleared";
                            const isPending =
                              st.toLowerCase().includes("pending") ||
                              st.toLowerCase().includes("need_again");

                            const badgeColor = isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                              : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

                            return (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                              >
                                {st}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-center">
                          {d.biltyCopy ? (
                            <a
                              href={d.biltyCopy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline font-medium"
                              title="View Bilty / LR"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {d.poCopy || d.rawPo || (d.poNumber && d.poNumber !== "-") ? (
                            <button
                              type="button"
                              onClick={() => handleViewPoCopy(d)}
                              className="inline-flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                              title="View PO Copy"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  } else {
                    // History row
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {d.indentNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                          {d.liftNo}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {d.warehouse || "-"}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {d.vendorName}
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {d.itemName}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {d.poNumber}
                        </td>
                        <td className="p-3 text-right font-bold">{d.poQty}</td>
                        <td className="p-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDateTime(d.actual6) || "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {d.liftingQty}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.totalReceivedSoFar}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {d.remainingPOBalance}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(
                            resolvePlannedDate(
                              getTatStatusForIndent(
                                d.indent_id || d.indentNumber || row.id,
                                "Material Received (GRN)",
                              ),
                              d.planned6 || d.plannedDate,
                            ),
                          ) || "-"}
                        </td>
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TatStageBadge
                            tatStatus={getTatStatusForIndent(
                              d.indent_id || d.indentNumber || row.id,
                              "Material Received (GRN)",
                            )}
                            indentId={d.indent_id || row.id}
                            isCompleted={true}
                          />
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.nextFollowUpDate) || "-"}
                        </td>
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                          title={d.remarks}
                        >
                          {d.remarks || "-"}
                        </td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          {d.transporterName || "-"}
                        </td>
                        <td className="p-3 font-mono uppercase font-bold">
                          {d.vehicleNo || "-"}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {d.contactNo || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.dispatchDate) || "-"}
                        </td>
                        <td className="p-3 text-right">{d.freightAmount}</td>
                        <td className="p-3 text-right">{d.advanceAmount}</td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.paymentDate) || "—"}
                        </td>
                        <td className="p-3 text-center">
                          {(() => {
                            const st = d.paymentStatus || "Credit Terms";
                            const isPaid =
                              st.toLowerCase().includes("paid") ||
                              st.toLowerCase() === "completed" ||
                              st.toLowerCase() === "cleared";
                            const isPending =
                              st.toLowerCase().includes("pending") ||
                              st.toLowerCase().includes("need_again");

                            const badgeColor = isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                              : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

                            return (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                              >
                                {st}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-center">
                          {d.biltyCopy ? (
                            <a
                              href={d.biltyCopy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline font-medium"
                              title="View Bilty / LR"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {d.poCopy || d.rawPo || (d.poNumber && d.poNumber !== "-") ? (
                            <button
                              type="button"
                              onClick={() => handleViewPoCopy(d)}
                              className="inline-flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                              title="View PO Copy"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {d.receiptLiftNumber || d.liftNo || "-"}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {d.receivedQty || "-"}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {formatDateDash(d.actual6) || "-"}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {d.invoiceNumber || "-"}
                        </td>
                        <td className="p-3 text-center text-slate-500">
                          {d.extraFreight || "-"}
                        </td>
                        <td className="p-3 text-center">
                          {d.receivedItemImage ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage(d.receivedItemImage)
                              }
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {d.billAttachment ? (
                            <a
                              href={d.billAttachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 cursor-pointer inline-block"
                            >
                              <Paperclip className="w-3.5 h-3.5 mx-auto" />
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          {d.damagedQty || "0"}
                        </td>
                        <td
                          className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                          title={d.damageReason}
                        >
                          {d.damageReason || "-"}
                        </td>
                        <td className="p-3 text-center">
                          {d.damageImage ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(d.damageImage)}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages} ({currentList.length} items)
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

      {/* ── MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[94vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-blue-600 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-2xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {isBulkMode
                      ? "Bulk Material Receipt"
                      : "Record Material Receipt"}
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {isBulkMode
                      ? `Reconcile quantities for ${bulkItems.length} item${bulkItems.length !== 1 ? "s" : ""}.`
                      : "Reconcile quantity, record image, and report damage if any."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── BULK FORM ── */}
            {isBulkMode ? (
              <form
                onSubmit={handleBulkSubmit}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Items List ({bulkItems.length})
                      </h4>
                    </div>
                  </div>

                  {/* Shared Bulk Bill / Invoice Attachment Card */}
                  <div className="border border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Vendor Bill / Invoice Attachment</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Upload invoice copy brought by driver/vendor. This will show on Tally Billing page.
                      </p>
                    </div>
                    <label className="border border-dashed border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-2 shrink-0 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[180px]">
                        {bulkBillAttachment ? bulkBillAttachment.name : "Upload Bill Copy"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setBulkBillAttachment(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="p-3 text-left font-bold text-slate-600 dark:text-slate-300">
                            Item Details
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-24">
                            Lift Qty
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-28">
                            Received Qty *
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-24">
                            Difference
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-32">
                            Item Image
                          </th>
                          <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">
                            Damage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bulkItems.map((item, idx) => {
                          const rec = recordMap.get(item.recordId);
                          const liftQty = safeNum(
                            rec?.data?.liftingQty || rec?.data?.poQty,
                          );
                          const recvQty = safeNum(item.receivedQty);
                          const diff = liftQty - recvQty;
                          return (
                            <tr
                              key={item.recordId}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            >
                              <td className="p-3 align-top">
                                <div className="font-bold text-slate-800 dark:text-white">
                                  Ind: {item.indentNumber}
                                </div>
                                <div className="text-slate-500 font-medium">
                                  Lift: {item.liftNumber}
                                </div>
                                <div
                                  className="text-slate-400 truncate max-w-[150px]"
                                  title={item.itemName}
                                >
                                  {item.itemName}
                                </div>
                              </td>
                              <td className="p-3 align-top text-center">
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 font-bold text-slate-700 dark:text-slate-200">
                                  {rec?.data?.liftingQty || (liftQty ? `${liftQty} ${rec?.data?.uom || ""}`.trim() : "-")}
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                <input
                                  type="number"
                                  value={item.receivedQty}
                                  onChange={(e) => {
                                    const next = [...bulkItems];
                                    next[idx] = {
                                      ...next[idx],
                                      receivedQty: e.target.value,
                                    };
                                    setBulkItems(next);
                                  }}
                                  required
                                  min="0"
                                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-3 align-top text-center">
                                <div
                                  className={`rounded-lg px-2 py-1.5 font-bold ${diff === 0 ? "bg-emerald-50 text-emerald-700" : diff > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}
                                >
                                  {recvQty ? diff.toFixed(2) : "-"}
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                {!item.receivedItemImage ? (
                                  <label className="flex items-center justify-center h-8 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors px-2 text-slate-500 bg-white dark:bg-slate-800 dark:border-slate-600">
                                    <Upload className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                    <span className="text-[10px] font-semibold">
                                      Upload
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const next = [...bulkItems];
                                        next[idx] = {
                                          ...next[idx],
                                          receivedItemImage:
                                            e.target.files?.[0] || null,
                                        };
                                        setBulkItems(next);
                                      }}
                                    />
                                  </label>
                                ) : (
                                  <div className="flex items-center justify-between gap-1 p-1 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-700 dark:border-slate-600">
                                    <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[60px]">
                                      {item.receivedItemImage.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...bulkItems];
                                        next[idx] = {
                                          ...next[idx],
                                          receivedItemImage: null,
                                        };
                                        setBulkItems(next);
                                      }}
                                      className="text-slate-400 hover:text-red-600 p-0.5 rounded"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 align-top">
                                <div className="space-y-2 min-w-[240px]">
                                  <select
                                    value={item.damageReceived || "no"}
                                    onChange={(e) => {
                                      const next = [...bulkItems];
                                      next[idx] = {
                                        ...next[idx],
                                        damageReceived: e.target.value,
                                      };
                                      setBulkItems(next);
                                    }}
                                    className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.damageReceived === "yes" ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
                                  >
                                    <option value="no">No Damage</option>
                                    <option value="yes">Damaged</option>
                                  </select>
                                  {item.damageReceived === "yes" && (
                                    <div className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                                            Damaged Qty
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={item.damagedQty}
                                            onChange={(e) => {
                                              const next = [...bulkItems];
                                              next[idx] = {
                                                ...next[idx],
                                                damagedQty: e.target.value,
                                              };
                                              setBulkItems(next);
                                            }}
                                            className="w-full px-2 py-1 text-xs rounded border border-rose-200 bg-white dark:bg-slate-800 dark:border-rose-800 focus:outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                                            Reason
                                          </label>
                                          <input
                                            type="text"
                                            value={item.damageReason}
                                            onChange={(e) => {
                                              const next = [...bulkItems];
                                              next[idx] = {
                                                ...next[idx],
                                                damageReason: e.target.value,
                                              };
                                              setBulkItems(next);
                                            }}
                                            className="w-full px-2 py-1 text-xs rounded border border-rose-200 bg-white dark:bg-slate-800 dark:border-rose-800 focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-rose-700 uppercase block mb-0.5">
                                          Damage Photo
                                        </label>
                                        {!item.damageImage ? (
                                          <label className="flex items-center justify-center h-7 border border-dashed border-rose-300 rounded-lg cursor-pointer hover:bg-rose-50 transition-colors px-2 text-rose-600 bg-white dark:bg-slate-800 dark:border-rose-800">
                                            <Upload className="w-3 h-3 mr-1" />
                                            <span className="text-[10px] font-semibold">
                                              Upload
                                            </span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const next = [...bulkItems];
                                                next[idx] = {
                                                  ...next[idx],
                                                  damageImage:
                                                    e.target.files?.[0] || null,
                                                };
                                                setBulkItems(next);
                                              }}
                                            />
                                          </label>
                                        ) : (
                                          <div className="flex items-center justify-between gap-1 p-1 bg-white border border-rose-200 rounded-lg dark:bg-slate-800">
                                            <span className="text-[9px] truncate max-w-[150px] text-rose-900 dark:text-rose-300">
                                              {item.damageImage.name}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = [...bulkItems];
                                                next[idx] = {
                                                  ...next[idx],
                                                  damageImage: null,
                                                };
                                                setBulkItems(next);
                                              }}
                                              className="text-rose-400 hover:text-red-600 p-0.5 rounded"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bulk Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !bulkItems.every((it) => it.receivedQty)
                    }
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record All Receipts</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── SINGLE FORM ── */
              <form
                onSubmit={handleSubmitGrn}
                className="p-6 space-y-5 overflow-y-auto"
              >
                {/* Item header */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Item Name
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {activeRec?.data?.itemName || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Unit Tracking No.
                    </div>
                    <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {activeRec?.data?.liftNo || "-"}
                    </div>
                  </div>
                </div>

                {/* Qty Reconciliation */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        Quantity Reconciliation
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      PO Balance After:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {singlePoBalance.toFixed(0)}
                      </strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        PO Total Ordered
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        {activeRec?.data?.poQty || "-"}
                      </div>
                    </div>
                    <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-2xl bg-blue-50/20 dark:bg-blue-950/20">
                      <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                        Dispatch (Batch)
                      </div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {activeRec?.data?.liftingQty || "-"}
                      </div>
                    </div>
                    <div className="p-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                        Received Qty <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={grnForm.receivedQty}
                        onChange={(e) =>
                          setGrnForm({
                            ...grnForm,
                            receivedQty: e.target.value,
                          })
                        }
                        className="w-full text-xl font-bold text-slate-900 dark:text-white bg-transparent outline-none mt-0.5"
                      />
                    </div>
                    <div className="p-4 border border-emerald-200 dark:border-emerald-800 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/20">
                      <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                        Batch Difference
                      </div>
                      <div
                        className={`text-xl font-bold mt-1 ${singleDiff === 0 ? "text-emerald-700" : "text-amber-600"}`}
                      >
                        {grnForm.receivedQty ? singleDiff.toFixed(2) : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Damage Report */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                      Damage Report
                    </h4>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-36 space-y-1.5 shrink-0">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                        Damage Received?
                      </label>
                      <select
                        value={grnForm.damageReceived}
                        onChange={(e) =>
                          setGrnForm({
                            ...grnForm,
                            damageReceived: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    {grnForm.damageReceived === "yes" && (
                      <>
                        <div className="w-full sm:w-28 space-y-1.5 shrink-0">
                          <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                            Damaged Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={grnForm.damagedQty}
                            onChange={(e) =>
                              setGrnForm({
                                ...grnForm,
                                damagedQty: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                            Damage Reason
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Damaged in transit"
                            value={grnForm.damageReason}
                            onChange={(e) =>
                              setGrnForm({
                                ...grnForm,
                                damageReason: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {grnForm.damageReceived === "yes" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                        Damage Image
                      </label>
                      <label className="border-2 border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/20 hover:bg-rose-50/40 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {grnForm.damageImage
                            ? grnForm.damageImage.name
                            : "Upload damage photo"}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) =>
                            setGrnForm({
                              ...grnForm,
                              damageImage: e.target.files?.[0] || null,
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Image, Bill Attachment & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Received Item Image
                    </label>
                    <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white dark:bg-slate-900 min-h-[110px]">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                        {grnForm.receivedItemImage
                          ? grnForm.receivedItemImage.name
                          : "Upload goods photo"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG (max 5MB)
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) =>
                          setGrnForm({
                            ...grnForm,
                            receivedItemImage: e.target.files?.[0] || null,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block flex items-center justify-between">
                      <span>Bill / Invoice Copy</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">For Tally Billing</span>
                    </label>
                    <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-indigo-50/20 dark:bg-indigo-950/20 min-h-[110px]">
                      <Paperclip className="w-5 h-5 text-indigo-500 mb-1" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                        {grnForm.billAttachment
                          ? grnForm.billAttachment.name
                          : "Upload Bill / Invoice"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        PDF, JPG, PNG
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setGrnForm({
                            ...grnForm,
                            billAttachment: e.target.files?.[0] || null,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Remarks
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Add any internal receiving notes..."
                      value={grnForm.remarks}
                      onChange={(e) =>
                        setGrnForm({ ...grnForm, remarks: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[110px]"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !grnForm.receivedQty}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record Receipt</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-sm mb-3">Consignment Photo</h4>
            <img
              src={previewImage}
              alt="Consignment"
              className="w-full h-auto rounded-2xl object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row building helper (extracted for readability) ──────────────────────────

function _buildRowsForPO(
  po,
  indent,
  rows,
  liftingsByPo,
  tfByPo,
  tfByLifting,
  receiptsByPo,
  paymentsByPo,
  getIndentNumber,
  getLiftNumber,
  getTatStatusForIndent,
) {
  const poLiftings = (liftingsByPo.get(po.id) || []).filter(
    (l) =>
      safeNum(l.lifting_qty || l.quantity) > 0 ||
      l.actual_lifting_date ||
      [
        "complete",
        "completed",
        "in-transit",
        "intransit",
        "dispatched",
        "received",
      ].includes(String(l.lifting_status || "").toLowerCase()),
  );
  const poReceipts = receiptsByPo.get(po.id) || [];
  const transporterFallback = tfByPo.get(po.id);
  const poPayments = [
    ...(paymentsByPo.get(po.id) || []),
    ...(po.po_number ? (paymentsByPo.get(po.po_number) || []) : []),
    ...(po.indent_id ? (paymentsByPo.get(po.indent_id) || []) : []),
  ].filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);

  const freightPayment = poPayments.find(
    (p) =>
      String(p.payment_type || "")
        .toLowerCase()
        .includes("freight") ||
      p.paid_by === "Freight" ||
      String(p.type || "")
        .toLowerCase()
        .includes("freight"),
  );
  const advancePayment = poPayments.find(
    (p) =>
      String(p.payment_type || "")
        .toLowerCase()
        .includes("advance") ||
      p.paid_by === "Advance" ||
      String(p.type || "")
        .toLowerCase()
        .includes("advance") ||
      String(p.advance_status || "").trim() !== "" ||
      Number(p.advance_amount || 0) > 0,
  );

  const totalPOQty = safeNum(
    po.quantity || indent?.quantity || indent?.data?.quantity || 0,
  );
  const totalReceivedSoFar = poReceipts.reduce(
    (sum, r) => sum + safeNum(r.received_quantity),
    0,
  );
  const remainingPOBalance = Math.max(0, totalPOQty - totalReceivedSoFar);

  const getFormattedFreight = (t, l) => {
    const raw =
      freightPayment?.amount ||
      t?.freight_amount ||
      t?.freight_amt ||
      l?.freight_amount ||
      "";
    return fmtCurrency(raw);
  };
  const getFormattedAdv = () => {
    const raw =
      advancePayment?.amount ||
      advancePayment?.advance_amount ||
      po.advance_amount ||
      po.advance_amt ||
      "";
    if (raw && Number(raw) > 0) {
      return fmtCurrency(raw);
    }
    const payType = String(po.payment_type || "").toLowerCase();
    if (payType.includes("advance")) {
      return "Advance Terms";
    }
    return "—";
  };
  const getFormattedPayDate = () => {
    const d =
      advancePayment?.payment_date ||
      advancePayment?.created_at ||
      freightPayment?.payment_date ||
      freightPayment?.created_at ||
      poPayments[0]?.payment_date ||
      poPayments[0]?.created_at ||
      null;
    return d ? d : "";
  };
  const getPayStatus = () => {
    if (advancePayment?.advance_status || advancePayment?.status) {
      const st = advancePayment.advance_status || advancePayment.status;
      if (st === "completed" || st === "Paid" || st === "Completed") return "Advance Paid";
      if (st === "not_needed_again") return "No Advance Req.";
      if (st === "need_again" || st === "Pending") return "Advance Pending";
      return st;
    }
    if (poPayments.length > 0) {
      return poPayments[0]?.status || "Paid";
    }
    if (freightPayment?.status) {
      return freightPayment.status || "Paid";
    }
    const pType = String(po.payment_type || "").toLowerCase();
    if (pType.includes("no advance") || pType.includes("credit") || pType.includes("post grn")) {
      return "Credit Terms";
    }
    if (pType.includes("on dispatch") || pType.includes("dispatch")) {
      return "On Dispatch";
    }
    if (pType.includes("advance")) {
      return "Advance Pending";
    }
    return "Credit Terms";
  };
  const getPoCopy = () =>
    po.po_copy_url ||
    po.po_pdf_url ||
    po.po_file_url ||
    po.po_copy ||
    po.po_attachment_url ||
    po.attachment_url ||
    po.file_url ||
    indent?.po_copy_url ||
    indent?.po_pdf_url ||
    "";

  // Derive indent number (from PO's normalized indent_number or via getIndentNumber)
  const indentNumber =
    po.indent_number ||
    po.indentNumber ||
    (getIndentNumber ? getIndentNumber(po.indent_id) : null) ||
    indent?.indent_number ||
    indent?.indentNumber ||
    "-";

  const warehouse =
    po.delivery_location ||
    indent?.warehouse_location ||
    indent?.warehouseLocation ||
    indent?.data?.warehouseLocation ||
    "-";

  const itemName =
    po.item_name || indent?.item_name || indent?.data?.itemName || "-";

  const vendorName =
    po.vendor_name ||
    po.selected_vendor_name ||
    indent?.selected_vendor_name ||
    indent?.data?.selectedVendorName ||
    "-";

  const uom =
    po.uom ||
    po.unit ||
    indent?.uom ||
    indent?.unit ||
    indent?.data?.uom ||
    indent?.data?.unit ||
    "";

  const fmtQty = (val) => {
    if (val === null || val === undefined || String(val).trim() === "") return "-";
    const num = safeNum(val);
    return uom ? `${num} ${uom}` : String(num);
  };

  if (poLiftings.length === 0) {
    // No liftings yet — gate on transporter received status
    const transporter = transporterFallback;
    const receipt =
      poReceipts.find((r) => safeNum(r.received_quantity) > 0) || null;
    const isTfReceived = isTransporterDone(transporter);
    const status = receipt
      ? "completed"
      : isTfReceived
        ? "pending"
        : "not_ready";

    const compositeId = `${indentNumber}_${po.po_number || po.id}`;
    rows.push({
      id: compositeId,
      status,
      data: {
        indentNumber,
        liftNo: po.po_number || "-",
        warehouse,
        vendorName,
        itemName,
        poNumber: po.po_number || "-",
        poQty: fmtQty(totalPOQty),
        liftingQty: fmtQty(totalPOQty),
        totalReceivedSoFar: fmtQty(totalReceivedSoFar),
        remainingPOBalance: fmtQty(remainingPOBalance),
        uom,
        indent_id: indent?.id || po.indent_id || null,
        planned6: resolvePlannedDate(
          getTatStatusForIndent(indent?.id || po.indent_id || po.id, "Material Received (GRN)"),
          po.planned_date ||
            indent?.planned_date ||
            indent?.required_date ||
            po.delivery_date ||
            "",
        ),
        plannedDate: resolvePlannedDate(
          getTatStatusForIndent(indent?.id || po.indent_id || po.id, "Material Received (GRN)"),
          po.planned_date ||
            indent?.planned_date ||
            indent?.required_date ||
            po.delivery_date ||
            "",
        ),
        actual6: receipt?.received_date || "",
        nextFollowUpDate: "",
        remarks: "",
        transporterName: transporter?.transporter_name || "-",
        vehicleNo: transporter?.vehicle_number || "-",
        contactNo: "",
        dispatchDate: transporter?.dispatch_date || "",
        freightAmount: getFormattedFreight(transporter, null),
        advanceAmount: getFormattedAdv(),
        paymentDate: getFormattedPayDate(),
        paymentStatus: getPayStatus(),
        biltyCopy:
          transporter?.bilty_copy_url || receipt?.bilty_invoice_image_url || "",
        poCopy: getPoCopy(),
        receivedQty: receipt ? fmtQty(receipt.received_quantity) : "",
        invoiceNumber: "",
        extraFreight: "",
        receivedItemImage: receipt?.received_item_image_url || "",
        billAttachment:
          receipt?.bilty_invoice_image_url || receipt?.invoice_copy_url || "",
        damagedQty: receipt ? fmtQty(receipt.rejected_quantity || 0) : fmtQty(0),
        damageReason: "",
        damageImage: "",
        receiptLiftNumber: "",
        _poId: po.id,
        rawPo: po,
        rawIndent: indent,
      },
    });
  } else {
    const usedReceiptIds = new Set();
    for (const lifting of poLiftings) {
      const liftTrackingNo = getLiftNumber
        ? getLiftNumber(lifting.id)
        : `LIFT-2026-001`;
      const compositeId = `${indentNumber}_${lifting.id}`;
      const liftQty = safeNum(lifting.quantity || lifting.lifting_qty);
      const transporter = tfByLifting.get(lifting.id) || transporterFallback;

      const receipt =
        poReceipts.find(
          (r) =>
            !usedReceiptIds.has(r.id) &&
            (String(r.grn_number || "").includes(liftTrackingNo) ||
              (liftQty > 0 &&
                Math.abs(safeNum(r.received_quantity) - liftQty) < 0.01)),
        ) || null;
      if (receipt) usedReceiptIds.add(receipt.id);

      const isTfReceived = isTransporterDone(transporter);
      let status = "not_ready";
      if (receipt) status = "completed";
      else if (isTfReceived) status = "pending";

      rows.push({
        id: compositeId,
        status,
        data: {
          indentNumber,
          liftNo: liftTrackingNo,
          warehouse,
          vendorName,
          itemName,
          poNumber: po.po_number || "-",
          poQty: fmtQty(totalPOQty),
          liftingQty: fmtQty(lifting.lifting_qty || liftQty || totalPOQty),
          totalReceivedSoFar: fmtQty(totalReceivedSoFar),
          remainingPOBalance: fmtQty(remainingPOBalance),
          uom,
          indent_id: indent?.id || po.indent_id || null,
          planned6: resolvePlannedDate(
            getTatStatusForIndent(indent?.id || po.indent_id || po.id, "Material Received (GRN)"),
            lifting.expected_lifting_date ||
              po.planned_date ||
              indent?.planned_date ||
              indent?.required_date ||
              "",
          ),
          plannedDate: resolvePlannedDate(
            getTatStatusForIndent(indent?.id || po.indent_id || po.id, "Material Received (GRN)"),
            lifting.expected_lifting_date ||
              po.planned_date ||
              indent?.planned_date ||
              indent?.required_date ||
              "",
          ),
          actual6: receipt?.received_date || "",
          nextFollowUpDate: lifting.followup_date || "",
          remarks: lifting.remarks || "",
          transporterName: transporter?.transporter_name || "-",
          vehicleNo:
            lifting.vehicle_number || transporter?.vehicle_number || "-",
          contactNo: lifting.driver_contact || "",
          dispatchDate: transporter?.dispatch_date || "",
          freightAmount: getFormattedFreight(transporter, lifting),
          advanceAmount: getFormattedAdv(),
          paymentDate: getFormattedPayDate(),
          paymentStatus: getPayStatus(),
          biltyCopy:
            lifting?.bilty_copy_url ||
            lifting?.biltyCopy ||
            transporter?.bilty_copy_url ||
            transporter?.biltyCopy ||
            receipt?.bilty_invoice_image_url ||
            "",
          poCopy: getPoCopy(),
          receivedQty: receipt ? fmtQty(receipt.received_quantity) : "",
          invoiceNumber: "",
          extraFreight: "",
          receivedItemImage: receipt?.received_item_image_url || "",
          billAttachment:
            receipt?.bilty_invoice_image_url || receipt?.invoice_copy_url || "",
          damagedQty: receipt ? fmtQty(receipt.rejected_quantity || 0) : fmtQty(0),
          damageReason: "",
          damageImage: "",
          receiptLiftNumber: liftTrackingNo,
          _poId: po.id,
          rawPo: po,
          rawIndent: indent,
          rawLifting: lifting,
        },
      });
    }
  }
}
