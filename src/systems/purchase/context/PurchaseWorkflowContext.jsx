/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import supabase from "../../../SupabaseClient";
import {
  createIndent as apiCreateIndent,
  delegateIndent as apiDelegateIndent,
  approveIndent as apiApproveIndent,
  submitQuotation as apiSubmitQuotation,
  selectApprovedVendor as apiSelectApprovedVendor,
  createPurchaseOrder as apiCreatePurchaseOrder,
  stageCancelRecords as apiStageCancelRecords,
} from "../services/purchaseWorkflowApi";
import {
  createVendorPayment as apiCreateVendorPayment,
  saveVendorLifting as apiSaveVendorLifting,
  saveTransporterFollowup as apiSaveTransporterFollowup,
  createMaterialReceipt as apiCreateMaterialReceipt,
  createTallyBilling as apiCreateTallyBilling,
  recordOrderCancellation as apiRecordOrderCancellation,
} from "../services/purchaseLogisticsApi";
import { fetchMasterTatRules } from "../services/purchaseMasterApi";
import {
  compileTransactionTatTimeline,
  computeSystemTatMetrics,
  calculateStageTat,
  resolveTatRule,
  TAT_STATUS,
} from "../services/purchaseTatEngine";
import TatTimelineModal from "../components/TatTimelineModal";
import { toLocalIsoTimestamp } from "../utils/dateUtils";

const PurchaseWorkflowContext = createContext(null);

export function PurchaseWorkflowProvider({ children }) {
  // 1. Live Relational Workflow States
  const [indents, setIndents] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [approvedVendors, setApprovedVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [vendorLiftings, setVendorLiftings] = useState([]);
  const [transporterFollowups, setTransporterFollowups] = useState([]);
  const [materialReceipts, setMaterialReceipts] = useState([]);
  const [tallyBillings, setTallyBillings] = useState([]);
  const [orderCancellations, setOrderCancellations] = useState([]);
  const [tatRules, setTatRules] = useState([]);
  const [tatModalIndentId, setTatModalIndentId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // 2. Fetch live data from Supabase
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [
        indRes,
        delRes,
        appRes,
        quoteRes,
        avRes,
        poRes,
        payRes,
        liftRes,
        tfRes,
        rcptRes,
        tallyRes,
        cancelRes,
        tatData,
      ] = await Promise.all([
        supabase
          .from("indents")
          .select("*, quotation_submissions(*), approved_vendors(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("indent_delegations")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("indent_approvals")
          .select("*")
          .order("approved_at", { ascending: false }),
        supabase
          .from("quotation_submissions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("approved_vendors")
          .select("*")
          .order("approved_at", { ascending: false }),
        supabase
          .from("purchase_orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("vendor_payments")
          .select("*, purchase_orders(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("vendor_liftings")
          .select("*, purchase_orders(*)")
          .order("updated_at", { ascending: false }),
        supabase
          .from("transporter_followups")
          .select("*, purchase_orders(*)")
          .order("updated_at", { ascending: false }),
        supabase
          .from("material_receipts")
          .select("*, purchase_orders(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("tally_billing")
          .select("*, purchase_orders(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("order_cancellations")
          .select("*, purchase_orders(*)")
          .order("cancellation_date", { ascending: false }),
        fetchMasterTatRules(),
      ]);

      if (tatData) setTatRules(tatData);


      if (indRes.data) {
        const avRows = avRes.data || [];
        const appRows = appRes.data || [];
        const delRows = delRes.data || [];
        const normalizedIndents = indRes.data.map((ind, idx) => {
          const avList = ind.approved_vendors || [];
          const matchingAv =
            avRows.find((a) => a.indent_id === ind.id) ||
            (avList.length > 0 ? avList[0] : null);
          const matchingApp = appRows.find((a) => a.indent_id === ind.id);
          const matchingDel = delRows.find((d) => d.indent_id === ind.id);
          const actualApprovedAt =
            matchingApp?.approved_at || matchingApp?.created_at || null;
          const actualDelegatedAt = matchingDel?.created_at || null;
          const resolvedApprover =
            matchingApp?.approver_username ||
            matchingApp?.approver_name ||
            matchingDel?.approver_name ||
            matchingDel?.approver_username ||
            ind.approver_name ||
            ind.approver_username ||
            "";

          const formattedIndentNumber =
            ind.indent_number || `IND-2026-${String(idx + 1).padStart(3, "0")}`;

          return {
            ...ind,
            indent_number: formattedIndentNumber,
            indentNumber: formattedIndentNumber,
            selected_vendor_name:
              ind.selected_vendor_name || matchingAv?.vendor_name || "",
            final_agreed_rate:
              ind.final_agreed_rate || matchingAv?.final_agreed_rate || 0,
            approved_vendor: matchingAv || null,
            approved_at: actualApprovedAt || ind.approved_at,
            actual_date: actualApprovedAt || ind.actual_date,
            delegated_at: actualDelegatedAt || ind.delegated_at,
            approver_name: resolvedApprover,
            approverName: resolvedApprover,
            approver_username: resolvedApprover,
            lead_time: ind.required_date || ind.lead_time || ind.leadTime || "",
            expected_delivery_date:
              ind.required_date || ind.expected_delivery_date || "",
            vendor_type:
              matchingApp?.vendor_type ||
              ind.vendor_type ||
              ind.vendorType ||
              "regular",
            vendorType:
              matchingApp?.vendor_type ||
              ind.vendor_type ||
              ind.vendorType ||
              "regular",
            planned_date:
              ind.planned_date || ind.required_date || ind.created_at || "",
          };
        });
        setIndents(normalizedIndents);

        const indentMap = new Map(
          normalizedIndents.map((i) => [i.id, i.indent_number]),
        );

        if (poRes.data) {
          const normalizedPOs = poRes.data.map((po) => {
            const matchingIndentNum =
              indentMap.get(po.indent_id) ||
              (po.indent_id && String(po.indent_id).startsWith("IND-")
                ? po.indent_id
                : null) ||
              po.indent_number ||
              "-";
            return {
              ...po,
              indent_number: matchingIndentNum,
              indentNumber: matchingIndentNum,
            };
          });
          setPurchaseOrders(normalizedPOs);
        }
      } else if (poRes.data) {
        setPurchaseOrders(poRes.data);
      }

      if (delRes.data) setDelegations(delRes.data);
      if (appRes.data) setApprovals(appRes.data);
      if (quoteRes.data) setQuotations(quoteRes.data);
      if (avRes.data) setApprovedVendors(avRes.data);
      if (payRes.data) setVendorPayments(payRes.data);
      if (liftRes.data) {
        const normalizedLiftings = liftRes.data.map((l, idx) => {
          const formattedLiftNumber =
            l.lifting_number ||
            (l.id && String(l.id).startsWith("LIFT-")
              ? l.id
              : `LIFT-2026-${String(idx + 1).padStart(3, "0")}`);
          return {
            ...l,
            lifting_number: formattedLiftNumber,
            liftNumber: formattedLiftNumber,
          };
        });
        setVendorLiftings(normalizedLiftings);
      }
      if (tfRes.data) setTransporterFollowups(tfRes.data);
      if (rcptRes.data) setMaterialReceipts(rcptRes.data);
      if (tallyRes.data) setTallyBillings(tallyRes.data);
      if (cancelRes.data) setOrderCancellations(cancelRes.data);
    } catch (err) {
      console.error("Error loading purchase workflow data from Supabase:", err);
      setError(err.message || "Failed to load database records");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper: Get human-readable Indent Number from raw ID or record
  const getIndentNumber = useCallback(
    (indentId) => {
      if (!indentId) return "-";
      if (typeof indentId === "string" && indentId.startsWith("IND-"))
        return indentId;
      const match = indents.find(
        (i) => i.id === indentId || i.indent_number === indentId,
      );
      if (match?.indent_number) return match.indent_number;
      const poMatch = purchaseOrders.find(
        (p) => p.indent_id === indentId || p.id === indentId,
      );
      if (poMatch?.indent_number && poMatch.indent_number !== "-")
        return poMatch.indent_number;
      return typeof indentId === "string" && indentId.length > 8
        ? `IND-${indentId.slice(0, 8).toUpperCase()}`
        : String(indentId);
    },
    [indents, purchaseOrders],
  );

  // Helper: Get human-readable Lift Number from raw ID or record
  const getLiftNumber = useCallback(
    (liftId) => {
      if (!liftId) return "-";
      if (
        typeof liftId === "string" &&
        /^LIFT-\d{4}-\d{3}$/i.test(liftId.trim())
      ) {
        return liftId.trim().toUpperCase();
      }

      // Filter to actual material liftings in chronological order
      const actualLiftings = [...vendorLiftings]
        .filter(
          (l) =>
            Number(l.lifting_qty || 0) > 0 ||
            l.actual_lifting_date ||
            [
              "complete",
              "completed",
              "in-transit",
              "intransit",
              "dispatched",
              "received",
            ].includes(String(l.lifting_status || "").toLowerCase()),
        )
        .sort(
          (a, b) =>
            new Date(a.created_at || a.actual_lifting_date || 0) -
            new Date(b.created_at || b.actual_lifting_date || 0),
        );

      const strId = String(liftId).trim().toLowerCase();
      const matchIdx = actualLiftings.findIndex(
        (l) =>
          l.id === liftId ||
          l.lifting_number === liftId ||
          (l.id && String(l.id).toLowerCase().startsWith(strId)) ||
          (strId.length >= 8 &&
            String(l.id || "")
              .toLowerCase()
              .includes(strId)),
      );

      if (matchIdx !== -1) {
        return `LIFT-2026-${String(matchIdx + 1).padStart(3, "0")}`;
      }

      const anyIdx = vendorLiftings.findIndex(
        (l) =>
          l.id === liftId ||
          (l.id && String(l.id).toLowerCase().startsWith(strId)),
      );
      if (anyIdx !== -1) {
        return `LIFT-2026-${String(anyIdx + 1).padStart(3, "0")}`;
      }

      return typeof liftId === "string" && liftId.length > 8
        ? `LIFT-2026-001`
        : String(liftId);
    },
    [vendorLiftings],
  );

  // -------------------------------------------------------------
  // STAGE 1 : CREATE INDENT
  // -------------------------------------------------------------
  const createIndent = useCallback(
    async (newIndentData) => {
      const count = indents.length + 1;
      const indentNumber = `IND-2026-${String(count).padStart(3, "0")}`;

      const rawRequired =
        newIndentData.leadTime || newIndentData.required_date || null;
      const rawPlanned =
        newIndentData.planned_date ||
        newIndentData.leadTime ||
        newIndentData.required_date ||
        null;

      const payload = {
        indent_number: newIndentData.indent_number || indentNumber,
        created_by:
          newIndentData.createdBy ||
          newIndentData.created_by ||
          "Purchase Officer",
        warehouse_location:
          newIndentData.warehouseLocation ||
          newIndentData.warehouse_location ||
          "",
        delivery_location:
          newIndentData.deliveryLocation ||
          newIndentData.delivery_location ||
          "",
        required_date: rawRequired ? toLocalIsoTimestamp(rawRequired) : null,
        planned_date: rawPlanned ? toLocalIsoTimestamp(rawPlanned) : null,
        category: newIndentData.category || "Raw Material",
        item_code: newIndentData.itemCode || newIndentData.item_code || null,
        item_name:
          newIndentData.itemName || newIndentData.item_name || "Material Item",
        quantity: Number(newIndentData.quantity || 1),
        uom: newIndentData.uom || "NOS",
        urgency:
          newIndentData.urgency || newIndentData.itemPriority || "Medium",
        specifications: newIndentData.specifications || "",
        attachment_url:
          newIndentData.attachment_url || newIndentData.attachment || null,
        status: "Pending Approval",
        created_at: new Date().toISOString(),
      };

      const result = await apiCreateIndent(payload);
      await loadData(true);
      return result;
    },
    [indents.length, loadData],
  );

  // -------------------------------------------------------------
  // STAGE 2 : DELEGATE APPROVAL
  // -------------------------------------------------------------
  const delegateIndent = useCallback(
    async (indentIds, approverName) => {
      const targetIds = Array.isArray(indentIds) ? indentIds : [indentIds];
      for (const id of targetIds) {
        await apiDelegateIndent(id, [approverName]);
      }
      await loadData(true);
      return true;
    },
    [loadData],
  );

  const removeDelegation = useCallback(
    async (delegationId) => {
      const { error } = await supabase
        .from("indent_delegations")
        .delete()
        .eq("id", delegationId);
      if (error) throw error;
      await loadData(true);
      return true;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 3 : INDENT APPROVAL
  // -------------------------------------------------------------
  const approveIndent = useCallback(
    async (indentId, approvalData) => {
      const isApproved =
        approvalData.isApproved !== false &&
        String(approvalData.status).toLowerCase() !== "rejected";
      const approvalStatus = isApproved ? "approved" : "rejected";

      const loggedInUser =
        typeof window !== "undefined"
          ? localStorage.getItem("user-name") ||
            localStorage.getItem("username") ||
            ""
          : "";

      const resolvedApprover =
        approvalData.approverUsername ||
        approvalData.approver_username ||
        approvalData.approver_name ||
        approvalData.approverName ||
        loggedInUser ||
        "Approver";

      const payload = {
        indentId,
        approverUsername: resolvedApprover,
        approvalStatus,
        approvedQty: Number(
          approvalData.approvedQty || approvalData.approved_qty || 0,
        ),
        vendorType:
          approvalData.vendorType || approvalData.vendor_type || "regular",
        rejectionReason: approvalData.rejectionReason || null,
        remarks: approvalData.remarks || "",
        approved_at: new Date().toISOString(),
      };

      const result = await apiApproveIndent(payload);
      await loadData(true);
      return result;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 4 : SUBMIT QUOTATIONS
  // -------------------------------------------------------------
  const submitQuotations = useCallback(
    async (indentIds, vendorList) => {
      const targetIds = Array.isArray(indentIds) ? indentIds : [indentIds];
      for (const indentId of targetIds) {
        for (const vendor of vendorList) {
          if (!vendor.vendor_name && !vendor.name) continue;
          await apiSubmitQuotation({
            indent_id: indentId,
            vendor_name: vendor.vendor_name || vendor.name,
            quoted_rate:
              vendor.quoted_rate != null && vendor.quoted_rate !== ""
                ? Number(vendor.quoted_rate)
                : 0,
            gst_percent:
              vendor.gst_percent != null && vendor.gst_percent !== ""
                ? Number(vendor.gst_percent)
                : 18,
            delivery_terms: vendor.delivery_terms || "",
            payment_terms: vendor.payment_terms || "",
            transport_type: vendor.transport_type || "",
            quotation_pdf_url: vendor.quotation_pdf_url || null,
            remarks: vendor.remarks || "",
            is_selected: false,
            created_at: new Date().toISOString(),
          });
        }
      }
      await loadData(true);
      return true;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 5 : APPROVED VENDOR SELECTION
  // -------------------------------------------------------------
  const selectApprovedVendor = useCallback(
    async (indentId, vendorDecision) => {
      const payload = {
        indentId,
        selectedQuotationId:
          vendorDecision.selected_quotation_id ||
          vendorDecision.quotation_id ||
          vendorDecision.quotationId ||
          null,
        vendorName: vendorDecision.vendor_name || vendorDecision.vendorName,
        vendorType:
          vendorDecision.vendor_type || vendorDecision.vendorType || "regular",
        finalAgreedRate: Number(
          vendorDecision.final_agreed_rate ||
            vendorDecision.finalAgreedRate ||
            vendorDecision.rate ||
            0,
        ),
        approvalRemarks:
          vendorDecision.approval_remarks || vendorDecision.remarks || "",
        approvedBy: vendorDecision.approved_by || "Purchase Committee",
        approved_at: new Date().toISOString(),
      };

      const result = await apiSelectApprovedVendor(payload);
      await loadData(true);
      return result;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 6 : PURCHASE ORDER (MAKE PO & REVISE)
  // -------------------------------------------------------------
  const createPurchaseOrder = useCallback(
    async (poData) => {
      const count = purchaseOrders.length + 1;
      const poNumber =
        poData.po_number ||
        poData.poNumber ||
        `PO-2026-${String(count).padStart(3, "0")}`;
      const vendorName =
        poData.vendor_name ||
        poData.vendorName ||
        poData.supplierName ||
        "Approved Supplier";

      const payload = {
        po_number: poNumber,
        indent_id: poData.indent_id || poData.indentId || null,
        vendor_name: vendorName,
        po_date: toLocalIsoTimestamp(
          poData.po_date || poData.poDate || new Date(),
        ),
        item_code: poData.item_code || poData.itemCode || null,
        item_name: poData.item_name || poData.itemName || "Material Item",
        quantity: Number(poData.quantity || poData.qty || 1),
        unit_rate: Number(
          poData.unit_rate || poData.unitRate || poData.rate || 0,
        ),
        total_amount: Number(poData.total_amount || poData.totalAmount || 0),
        payment_type:
          poData.payment_type ||
          poData.paymentTerms ||
          poData.paymentType ||
          "30",
        advance_amount: Number(
          poData.advance_amount || poData.advanceAmount || 0,
        ),
        freight_amount: Number(
          poData.freight_amount || poData.freightAmount || 0,
        ),
        gst_percent: String(poData.gst_percent || poData.gstRate || "18%"),
        hsn: poData.hsn || poData.hsnCode || null,
        firm_name:
          poData.firm_name || poData.firmName || "Nutech Pipes Pvt. Ltd.",
        transport_type:
          poData.transport_type || poData.transportType || "F.O.R.",
        delivery_date:
          poData.delivery_date || poData.deliveryDate
            ? toLocalIsoTimestamp(poData.delivery_date || poData.deliveryDate)
            : null,
        delivery_location:
          poData.delivery_location || poData.deliveryLocation || "",
        delivery_address:
          poData.delivery_address || poData.deliveryAddress || "",
        po_copy_url: poData.po_copy_url || poData.poCopyUrl || null,
        po_pdf_url: poData.po_pdf_url || poData.poPdfUrl || null,
        created_by: poData.created_by || poData.createdBy || "Purchase Officer",
        status: "PO Issued",
        created_at: new Date().toISOString(),
      };

      const result = await apiCreatePurchaseOrder(payload);
      await loadData(true);
      return result;
    },
    [purchaseOrders.length, loadData],
  );

  const revisePurchaseOrder = useCallback(
    async (poIdentifier, updateFields) => {
      const safeUpdates = {
        ...(updateFields.vendor_name || updateFields.vendorName
          ? { vendor_name: updateFields.vendor_name || updateFields.vendorName }
          : {}),
        ...(updateFields.unit_rate !== undefined ||
        updateFields.unitRate !== undefined
          ? {
              unit_rate: Number(
                updateFields.unit_rate ?? updateFields.unitRate,
              ),
            }
          : {}),
        ...(updateFields.total_amount !== undefined ||
        updateFields.totalAmount !== undefined
          ? {
              total_amount: Number(
                updateFields.total_amount ?? updateFields.totalAmount,
              ),
            }
          : {}),
        ...(updateFields.advance_amount !== undefined ||
        updateFields.advanceAmount !== undefined
          ? {
              advance_amount: Number(
                updateFields.advance_amount ?? updateFields.advanceAmount,
              ),
            }
          : {}),
        ...(updateFields.payment_type || updateFields.paymentTerms
          ? {
              payment_type:
                updateFields.payment_type || updateFields.paymentTerms,
            }
          : {}),
        ...(updateFields.transport_type || updateFields.transportType
          ? {
              transport_type:
                updateFields.transport_type || updateFields.transportType,
            }
          : {}),
        ...(updateFields.delivery_location || updateFields.deliveryLocation
          ? {
              delivery_location:
                updateFields.delivery_location || updateFields.deliveryLocation,
            }
          : {}),
        ...(updateFields.po_date || updateFields.poDate
          ? { po_date: updateFields.po_date || updateFields.poDate }
          : {}),
        ...(updateFields.delivery_date || updateFields.deliveryDate
          ? {
              delivery_date:
                updateFields.delivery_date || updateFields.deliveryDate,
            }
          : {}),
        updated_at: new Date().toISOString(),
      };

      let query = supabase.from("purchase_orders").update(safeUpdates);
      if (typeof poIdentifier === "string" && poIdentifier.startsWith("PO-")) {
        query = query.eq("po_number", poIdentifier);
      } else {
        query = query.eq("id", poIdentifier);
      }

      const { data, error } = await query.select();
      if (error) throw error;
      await loadData(true);
      return data;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 7 : VENDOR PAYMENT DISBURSEMENT
  // -------------------------------------------------------------
  const disbursePayment = useCallback(
    async (paymentPayload) => {
      const payload = {
        po_id: paymentPayload.po_id || paymentPayload.poId,
        payment_type:
          paymentPayload.payment_type ||
          paymentPayload.paymentType ||
          "Advance",
        amount: Number(paymentPayload.amount || 0),
        payment_mode:
          paymentPayload.payment_mode || paymentPayload.paymentMode || "RTGS",
        transaction_utr:
          paymentPayload.transaction_utr || paymentPayload.transactionUtr || "",
        payment_date: toLocalIsoTimestamp(
          paymentPayload.payment_date ||
            paymentPayload.paymentDate ||
            new Date(),
        ),
        proof_url: paymentPayload.proof_url || null,
        paid_by: paymentPayload.paid_by || "Accountant",
        advance_status: "Paid",
        status: "Completed",
        remarks: paymentPayload.remarks || "",
        created_at: new Date().toISOString(),
      };

      const result = await apiCreateVendorPayment(payload);
      await loadData(true);
      return result;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 8 : MATERIAL LIFTING (VENDOR FOLLOW-UP)
  // -------------------------------------------------------------
  const recordMaterialLifting = useCallback(
    async (liftingData) => {
      const nowIso = new Date().toISOString();
      const payload = {
        id: liftingData.id || liftingData._liftingId || undefined,
        po_id: liftingData.po_id || liftingData.poId,
        contact_person:
          liftingData.contact_person ||
          liftingData.contactPerson ||
          liftingData.transporterName ||
          liftingData.transporter_name ||
          "",
        followup_date: toLocalIsoTimestamp(
          liftingData.followup_date ||
            liftingData.last_followup_date ||
            liftingData.lastFollowUpDate ||
            nowIso,
        ),
        last_followup_date: toLocalIsoTimestamp(
          liftingData.last_followup_date ||
            liftingData.lastFollowUpDate ||
            liftingData.followup_date ||
            nowIso,
        ),
        next_followup_date:
          liftingData.next_followup_date ||
          liftingData.nextFollowUpDate ||
          liftingData.expected_lifting_date
            ? toLocalIsoTimestamp(
                liftingData.next_followup_date ||
                  liftingData.nextFollowUpDate ||
                  liftingData.expected_lifting_date,
              )
            : null,
        expected_lifting_date:
          liftingData.expected_lifting_date ||
          liftingData.next_followup_date ||
          liftingData.nextFollowUpDate
            ? toLocalIsoTimestamp(
                liftingData.expected_lifting_date ||
                  liftingData.next_followup_date ||
                  liftingData.nextFollowUpDate,
              )
            : null,
        actual_lifting_date:
          liftingData.actual_lifting_date || liftingData.actualLiftingDate
            ? toLocalIsoTimestamp(
                liftingData.actual_lifting_date ||
                  liftingData.actualLiftingDate,
              )
            : null,
        vehicle_number:
          liftingData.vehicle_number || liftingData.vehicleNumber || "",
        driver_contact:
          liftingData.driver_contact ||
          liftingData.driverContact ||
          liftingData.driver_phone ||
          liftingData.contact_number ||
          liftingData.driverPhone ||
          "",
        lifting_qty: Number(
          liftingData.lifting_qty || liftingData.liftingQty || 0,
        ),
        freight_amount: Number(
          liftingData.freight_amount || liftingData.totalFreight || 0,
        ),
        transport_rate: String(
          liftingData.transport_rate || liftingData.perKgRate || "",
        ),
        lifting_status:
          liftingData.lifting_status ||
          (Number(liftingData.lifting_qty || liftingData.liftingQty || 0) > 0
            ? "Dispatched"
            : "Follow-Up"),
        remarks: liftingData.remarks || "",
        updated_at: nowIso,
      };

      const result = await apiSaveVendorLifting(payload);
      await loadData(true);
      return result;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 9 : TRANSPORTER FOLLOW-UP (IN-TRANSIT)
  // -------------------------------------------------------------
  const updateTransporterStatus = useCallback(
    async (transitData) => {
      const payload = {
        po_id: transitData.po_id || transitData.poId,
        lifting_id: transitData.lifting_id || null,
        transporter_name: transitData.transporter_name || "Primary Transporter",
        bilty_number: transitData.bilty_number || "",
        vehicle_number: transitData.vehicle_number || "",
        dispatch_date: transitData.dispatch_date
          ? toLocalIsoTimestamp(transitData.dispatch_date)
          : null,
        expected_arrival_date: transitData.expected_arrival_date
          ? toLocalIsoTimestamp(transitData.expected_arrival_date)
          : null,
        current_location: transitData.current_location || "",
        rate_per_kg: Number(transitData.rate_per_kg || 0),
        freight_amount: Number(transitData.freight_amount || 0),
        transport_type: transitData.transport_type || "F.O.R.",
        bilty_copy_url: transitData.bilty_copy_url || null,
        status: transitData.status || "In Transit",
        updated_at: new Date().toISOString(),
      };

      const result = await apiSaveTransporterFollowup(payload);
      await loadData(true);
      return result;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 10 : MATERIAL RECEIVED & QC INSPECTION (GRN)
  // -------------------------------------------------------------
  const issueGRN = useCallback(
    async (receiptData) => {
      const count = materialReceipts.length + 1;
      const grnNumber =
        receiptData.grn_number || `GRN-2026-${String(count).padStart(3, "0")}`;

      const payload = {
        grn_number: grnNumber,
        po_id: receiptData.po_id || receiptData.poId,
        received_date: toLocalIsoTimestamp(
          receiptData.received_date || receiptData.receipt_date || new Date(),
        ),
        received_quantity: Number(
          receiptData.received_quantity || receiptData.receivedQty || 0,
        ),
        accepted_quantity: Number(
          receiptData.accepted_quantity || receiptData.acceptedQty || 0,
        ),
        rejected_quantity: Number(
          receiptData.rejected_quantity || receiptData.rejectedQty || 0,
        ),
        extra_freight: Number(receiptData.extra_freight || 0),
        received_item_image_url: receiptData.received_item_image_url || null,
        bilty_invoice_image_url: receiptData.bilty_invoice_image_url || null,
        received_by: receiptData.received_by || "Store Incharge",
        status: "Received",
        created_at: new Date().toISOString(),
      };

      const result = await apiCreateMaterialReceipt(payload, true);
      await loadData(true);
      return result;
    },
    [materialReceipts.length, loadData],
  );

  // -------------------------------------------------------------
  // STAGE 11 : TALLY ERP BILLING ENTRY
  // -------------------------------------------------------------
  const bookTallyInvoice = useCallback(
    async (billingData) => {
      const payload = {
        po_id: billingData.po_id || billingData.poId,
        vendor_invoice_number:
          billingData.vendor_invoice_number ||
          billingData.invoiceNumber ||
          "INV-001",
        invoice_date: toLocalIsoTimestamp(
          billingData.invoice_date || billingData.invoiceDate || new Date(),
        ),
        invoice_amount: Number(
          billingData.invoice_amount || billingData.invoiceAmount || 0,
        ),
        tally_voucher_number:
          billingData.tally_voucher_number ||
          billingData.tallyVoucher ||
          "VCH-001",
        tally_entry_date: toLocalIsoTimestamp(
          billingData.tally_entry_date || billingData.entryDate || new Date(),
        ),
        accountant_name:
          billingData.accountant_name ||
          billingData.accountant ||
          "Accounts Officer",
        tally_bill_copy_url: billingData.tally_bill_copy_url || null,
        verification_status: "Verified",
        created_at: new Date().toISOString(),
      };

      const result = await apiCreateTallyBilling(payload);
      await loadData(true);
      return result;
    },
    [loadData],
  );

  // -------------------------------------------------------------
  // STAGE 12 : ORDER CANCELLATION
  // -------------------------------------------------------------
  const cancelOrder = useCallback(
    async (cancelData) => {
      const payload = {
        po_id: cancelData.po_id || cancelData.poId || null,
        indent_id: cancelData.indent_id || cancelData.indentId || null,
        cancelled_by:
          cancelData.cancelled_by || cancelData.cancelledBy || "Purchase Admin",
        cancellation_reason:
          cancelData.cancellation_reason ||
          cancelData.reason ||
          "Management Request",
        financial_impact: Number(
          cancelData.financial_impact || cancelData.cancelQuantity || 0,
        ),
        status: "Cancelled",
        cancellation_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const result = await apiRecordOrderCancellation(payload);
      await loadData(true);
      return result;
    },
    [loadData],
  );

  const stageCancelRecords = useCallback(
    async ({ stageKey, stageName, records, reason, remarks, cancelledBy }) => {
      const result = await apiStageCancelRecords({
        stageKey,
        stageName,
        records,
        reason,
        remarks,
        cancelledBy,
      });
      await loadData(true);
      return result;
    },
    [loadData],
  );

  // TAT / SLA Management Methods
  const openTatModal = useCallback((indentId) => {
    setTatModalIndentId(indentId);
  }, []);

  const closeTatModal = useCallback(() => {
    setTatModalIndentId(null);
  }, []);

  const getTatTimelineForIndent = useCallback(
    (indentOrId) => {
      if (!indentOrId) return null;
      let targetIndent = null;
      if (typeof indentOrId === "object" && indentOrId.id) {
        targetIndent = indentOrId;
      } else {
        targetIndent = indents.find(
          (i) => i.id === indentOrId || i.indent_number === indentOrId
        );
      }
      if (!targetIndent) return null;

      return compileTransactionTatTimeline({
        indent: targetIndent,
        purchaseOrders,
        approvals,
        quotations,
        approvedVendors,
        vendorPayments,
        vendorLiftings,
        transporterFollowups,
        materialReceipts,
        tallyBillings,
        orderCancellations,
        rulesList: tatRules,
      });
    },
    [
      indents,
      purchaseOrders,
      approvals,
      quotations,
      approvedVendors,
      vendorPayments,
      vendorLiftings,
      transporterFollowups,
      materialReceipts,
      tallyBillings,
      orderCancellations,
      tatRules,
    ],
  );

  const getTatStatusForIndent = useCallback(
    (indentOrId, stageName) => {
      const timeline = getTatTimelineForIndent(indentOrId);
      if (!timeline) return null;
      if (!stageName) return timeline.activeStage || null;
      const cleanName = stageName.trim().toLowerCase();
      const stageMatch = timeline.stages.find(
        (s) =>
          s.stageName.toLowerCase() === cleanName ||
          s.displayName?.toLowerCase().includes(cleanName) ||
          cleanName.includes(s.stageName.toLowerCase())
      );
      return stageMatch || null;
    },
    [getTatTimelineForIndent],
  );

  const tatMetrics = useMemo(() => {
    return computeSystemTatMetrics({
      indents,
      purchaseOrders,
      approvals,
      quotations,
      approvedVendors,
      vendorPayments,
      vendorLiftings,
      transporterFollowups,
      materialReceipts,
      tallyBillings,
      orderCancellations,
      rulesList: tatRules,
    });
  }, [
    indents,
    purchaseOrders,
    approvals,
    quotations,
    approvedVendors,
    vendorPayments,
    vendorLiftings,
    transporterFollowups,
    materialReceipts,
    tallyBillings,
    orderCancellations,
    tatRules,
  ]);

  const activeTatTimeline = useMemo(() => {
    if (!tatModalIndentId) return null;
    return getTatTimelineForIndent(tatModalIndentId);
  }, [tatModalIndentId, getTatTimelineForIndent]);

  const value = {
    indents,
    setIndents,
    delegations,
    setDelegations,
    approvals,
    quotations,
    approvedVendors,
    purchaseOrders,
    setPurchaseOrders,
    vendorPayments,
    vendorLiftings,
    transporterFollowups,
    materialReceipts,
    tallyBillings,
    orderCancellations,
    tatRules,
    tatMetrics,
    tatModalIndentId,
    openTatModal,
    closeTatModal,
    getTatTimelineForIndent,
    getTatStatusForIndent,
    loading,
    isRefreshing,
    error,
    refreshData: loadData,
    // Actions
    createIndent,
    delegateIndent,
    removeDelegation,
    approveIndent,
    submitQuotations,
    selectApprovedVendor,
    createPurchaseOrder,
    revisePurchaseOrder,
    disbursePayment,
    recordMaterialLifting,
    updateTransporterStatus,
    issueGRN,
    bookTallyInvoice,
    cancelOrder,
    stageCancelRecords,
    getIndentNumber,
    getLiftNumber,
  };

  return (
    <PurchaseWorkflowContext.Provider value={value}>
      {children}
      {/* TAT SLA Timeline Modal commented out from stages as per request */}
      {/* <TatTimelineModal
        isOpen={Boolean(tatModalIndentId)}
        onClose={closeTatModal}
        timeline={activeTatTimeline}
      /> */}
    </PurchaseWorkflowContext.Provider>
  );
}


export function usePurchaseWorkflow() {
  const context = useContext(PurchaseWorkflowContext);
  if (!context) {
    return {
      loading: false,
      error: null,
      indents: [],
      delegations: [],
      approvals: [],
      quotations: [],
      approvedVendors: [],
      purchaseOrders: [],
      vendorPayments: [],
      vendorLiftings: [],
      transporterFollowups: [],
      materialReceipts: [],
      tallyBillings: [],
      orderCancellations: [],
      loadData: async () => {},
      refreshData: async () => {},
      createIndent: async () => {},
      delegateIndent: async () => {},
      approveIndent: async () => {},
      submitQuotation: async () => {},
      selectApprovedVendor: async () => {},
      createPurchaseOrder: async () => {},
      revisePurchaseOrder: async () => {},
      disbursePayment: async () => {},
      createLifting: async () => {},
      updateTransporterStatus: async () => {},
      recordMaterialReceipt: async () => {},
      recordTallyBilling: async () => {},
      cancelOrder: async () => {},
      getIndentNumber: (id) =>
        id && String(id).startsWith("IND-")
          ? id
          : `IND-${String(id || "001")
              .slice(0, 8)
              .toUpperCase()}`,
      getLiftNumber: (id) =>
        id && String(id).startsWith("LFT-")
          ? id
          : `LFT-${String(id || "001")
              .slice(0, 8)
              .toUpperCase()}`,
    };
  }
  return context;
}
