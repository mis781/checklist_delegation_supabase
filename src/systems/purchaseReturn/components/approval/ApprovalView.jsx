import { useState, Fragment } from "react";
import FilterBar from "../common/FilterBar";
import ColumnToggleDropdown from "../common/ColumnToggleDropdown";
import BulkActionBar from "../common/BulkActionBar";
import StatusBadge from "../common/StatusBadge";
import ApprovalModal from "./ApprovalModal";
import TopUpApprovalModal from "./TopUpApprovalModal";
import CreateReturnModal from "../common/CreateReturnModal";
import {
  M1_PENDING,
  M1_HISTORY,
  fmtDate,
  inr,
  overallStatus,
  hasOpenPendingQty,
  placeholderPreviewUrl
} from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn, groupRecordsByBill } from "../../context/PurchaseReturnContext";
import TatStageBadge from "../../../purchase/components/TatStageBadge";
import { formatDateTime } from "../../../purchase/utils/dateUtils";
import { AlertCircle, Eye, ExternalLink, XCircle, PackagePlus, Loader2, Paperclip, FileText } from "lucide-react";

const M1_COLUMNS = [
  { key: "rrid", label: "Return Req. ID" },
  { key: "company", label: "Company" },
  { key: "division", label: "Division" },
  { key: "supplier", label: "Supplier" },
  { key: "po", label: "PO No." },
  { key: "indentno", label: "Indent No." },
  { key: "bill", label: "Bill No." },
  { key: "billimage", label: "Bill Image" },
  { key: "billdate", label: "Bill Date" },
  { key: "item", label: "Item Details" },
  { key: "unit", label: "Unit" },
  { key: "purchqty", label: "Purch. Qty" },
  { key: "damageqty", label: "Damage Qty" },
  { key: "reason", label: "Damage Reason" },
  { key: "attachment", label: "Attachment" },
  { key: "damagevalue", label: "Damage Value (Incl. GST)" },
  { key: "requestdate", label: "Request Date" },
  { key: "planneddate", label: "Planned Date" },
  { key: "delay", label: "Delay" },
  { key: "actiontype", label: "Action Type" },
  { key: "tpb", label: "Transport Paid By" },
  { key: "approvedby", label: "Approved By" },
  { key: "status", label: "Status" }
];

export default function ApprovalView({ onOpenDetails }) {
  const {
    records,
    loading,
    activeTabs,
    setTab,
    applyFilters,
    selection,
    toggleRowSelect,
    toggleBillGroupSelect,
    getColVis,
    canEdit,
    rejectReturn,
    getTatStatusForReturn
  } = usePurchaseReturn();

  const isEditable = canEdit("approval");
  const activeTab = activeTabs.approval;
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const pendingAll = records.filter(M1_PENDING);
  const historyAll = records.filter(M1_HISTORY);

  const pendingFiltered = applyFilters(pendingAll, "approval");
  const historyFiltered = applyFilters(historyAll, "approval");

  const displayRows = activeTab === "pending" ? pendingFiltered : historyFiltered;
  const colVis = getColVis("m1", M1_COLUMNS);

  // Modal states
  const [modalRecords, setModalRecords] = useState([]);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Quick reject state
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("Damage below reporting threshold");
  const [rejectRemarks, setRejectRemarks] = useState("");

  const handleOpenAction = (record) => {
    if (record.approval && hasOpenPendingQty(record)) {
      setModalRecords([record]);
      setIsTopUpOpen(true);
    } else {
      setModalRecords([record]);
      setIsApprovalOpen(true);
    }
  };

  const handleBulkAction = (ids) => {
    const recs = records.filter((r) => ids.includes(r.id));
    if (recs.length === 0) return;
    if (recs[0].approval && hasOpenPendingQty(recs[0])) {
      setModalRecords(recs);
      setIsTopUpOpen(true);
    } else {
      setModalRecords(recs);
      setIsApprovalOpen(true);
    }
  };

  const handleConfirmReject = () => {
    if (!rejectId) return;
    rejectReturn({ id: rejectId, reason: rejectReason, remarks: rejectRemarks });
    setRejectId(null);
    setRejectRemarks("");
  };

  return (
    <div className="space-y-4">
      {/* View-Only Banner */}
      {!isEditable && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>You have View-only access to this page. Action buttons are disabled.</span>
        </div>
      )}

      {/* Main Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        {/* Panel Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Purchase Return Approval
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review and approve damaged or rejected purchase materials
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isEditable && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Create Return Request</span>
              </button>
            )}
            <ColumnToggleDropdown tableKey="m1" columns={M1_COLUMNS} />
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar viewKey="approval" />

        {/* Tabs */}
        <div className="flex items-center gap-6 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setTab("approval", "pending")}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span>Pending</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === "pending"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {pendingAll.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("approval", "history")}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span>History</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === "history"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {historyAll.length}
            </span>
          </button>
        </div>

        {/* Bulk Action Bar (when rows are selected) */}
        {activeTab === "pending" && (
          <BulkActionBar moduleKey="approval" onTriggerBulkAction={handleBulkAction} />
        )}

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-3 w-28">Action</th>
                {activeTab === "pending" && <th className="py-3 px-3 w-12 text-center">Select</th>}
                {colVis.rrid && <th className="py-3 px-3">Return Req. ID</th>}
                {colVis.company && <th className="py-3 px-3">Company</th>}
                {colVis.division && <th className="py-3 px-3">Division</th>}
                {colVis.supplier && <th className="py-3 px-3">Supplier</th>}
                {colVis.po && <th className="py-3 px-3">PO No.</th>}
                {colVis.indentno && <th className="py-3 px-3">Indent No.</th>}
                {colVis.bill && <th className="py-3 px-3">Bill No.</th>}
                {colVis.billimage && <th className="py-3 px-3">Bill Image</th>}
                {colVis.billdate && <th className="py-3 px-3">Bill Date</th>}
                {colVis.item && <th className="py-3 px-3">Item Details</th>}
                {colVis.unit && <th className="py-3 px-3">Unit</th>}
                {colVis.purchqty && <th className="py-3 px-3 text-right">Purch. Qty</th>}
                {colVis.damageqty && <th className="py-3 px-3 text-right">Damage Qty</th>}
                {colVis.reason && <th className="py-3 px-3">Reason</th>}
                {colVis.attachment && <th className="py-3 px-3 text-center">Attachment</th>}
                {colVis.damagevalue && <th className="py-3 px-3 text-right">Damage Value (Incl. GST)</th>}
                {colVis.requestdate && <th className="py-3 px-3">Req. Date</th>}
                {colVis.planneddate && <th className="py-3 px-3 text-center font-mono">Planned Date</th>}
                {colVis.delay && <th className="py-3 px-3 text-center">Delay</th>}
                {colVis.actiontype && <th className="py-3 px-3">Action Type</th>}
                {colVis.tpb && <th className="py-3 px-3">Transport Paid By</th>}
                {colVis.approvedby && <th className="py-3 px-3">Approved By</th>}
                {colVis.status && <th className="py-3 px-3">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={25} className="py-12 text-center text-slate-400 text-xs font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading purchase returns from database...</span>
                    </div>
                  </td>
                </tr>
              ) : displayRows.length > 0 ? (
                groupRecordsByBill(displayRows).map((group) => {
                  const isAllGroupSelected =
                    selection.moduleKey === "approval" &&
                    selection.billNumber === group.billNumber &&
                    group.records.length > 0 &&
                    group.records.every((r) => selection.ids.includes(r.id));
                  const groupTotalVal = group.records.reduce(
                    (s, r) => s + (Number(r.damageValue) || 0),
                    0
                  );
                  const totalColCount =
                    1 +
                    (activeTab === "pending" ? 1 : 0) +
                    Object.values(colVis).filter(Boolean).length;

                  return (
                    <Fragment key={group.billKey}>
                      {/* Bill Group Header Banner */}
                      <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-t-2 border-b border-slate-200 dark:border-slate-700">
                        <td colSpan={totalColCount} className="py-2 px-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5">
                              {activeTab === "pending" && isEditable && (
                                <input
                                  type="checkbox"
                                  title="Select all requests in this bill"
                                  checked={isAllGroupSelected}
                                  onChange={() =>
                                    toggleBillGroupSelect(
                                      "approval",
                                      group.billNumber,
                                      group.records.map((r) => r.id)
                                    )
                                  }
                                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                />
                              )}
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>Bill No:</span>
                                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-bold">
                                  {group.billNumber}
                                </span>
                              </div>
                              {group.supplier && (
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                                  &bull; {group.supplier}
                                </span>
                              )}
                              {group.company && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                                  ({group.company}
                                  {group.division && group.division !== group.company
                                    ? ` - ${group.division}`
                                    : ""}
                                  )
                                </span>
                              )}
                              {group.billDate && (
                                <span className="text-[11px] text-slate-400 hidden md:inline">
                                  &bull; Date: {fmtDate(group.billDate)}
                                </span>
                              )}
                              {group.billImage && (
                                <a
                                  href={
                                    group.billImagePreview || placeholderPreviewUrl(group.billImage)
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline ml-1 font-semibold"
                                >
                                  <span>Bill Copy</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]">
                                {group.records.length} Return Request
                                {group.records.length > 1 ? "s" : ""}
                              </span>
                              <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                                Total: {inr(groupTotalVal)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Group Rows */}
                      {group.records.map((r) => {
                        const isChecked =
                          selection.moduleKey === "approval" && selection.ids.includes(r.id);
                        const status = overallStatus(r);
                        const tatStatus = getTatStatusForReturn
                          ? getTatStatusForReturn(r.id, "Return Approval")
                          : null;
                        const firstItem = r.items && r.items[0];
                        const itemSummary =
                          r.items.length === 1
                            ? firstItem.itemName
                            : `${firstItem.itemName} +${r.items.length - 1} more`;

                        return (
                          <tr
                            key={r.id}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                              isChecked ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                            }`}
                          >
                            {/* Action column */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {activeTab === "pending" ? (
                                isEditable ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAction(r)}
                                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                    >
                                      {r.approval && hasOpenPendingQty(r) ? "Top-Up" : "Action"}
                                    </button>
                                    {!r.approval && (
                                      <button
                                        type="button"
                                        onClick={() => setRejectId(r.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                        title="Reject return"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    View
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Details</span>
                                </button>
                              )}
                            </td>

                            {/* Select Checkbox (pending only) */}
                            {activeTab === "pending" && (
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRowSelect("approval", r.id, r.billNumber)}
                                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                />
                              </td>
                            )}

                            {/* Data Columns */}
                            {colVis.rrid && (
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                  className="hover:underline"
                                >
                                  {r.returnNumber}
                                </button>
                              </td>
                            )}
                            {colVis.company && (
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {r.company}
                              </td>
                            )}
                            {colVis.division && (
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {r.division}
                              </td>
                            )}
                            {colVis.supplier && (
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {r.supplier}
                              </td>
                            )}
                            {colVis.po && (
                              <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                                {r.poNumber}
                              </td>
                            )}
                            {colVis.indentno && (
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.items && r.items.length > 0
                                  ? r.items
                                      .map((i) => i.indentNumber || i.sku)
                                      .filter(Boolean)
                                      .join(", ") || "-"
                                  : "-"}
                              </td>
                            )}
                            {colVis.bill && (
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.billNumber}
                              </td>
                            )}
                            {colVis.billimage && (
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <a
                                  href={r.billImagePreview || placeholderPreviewUrl(r.billImage)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                                >
                                  <span>{r.billImage}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </td>
                            )}
                            {colVis.billdate && (
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {fmtDate(r.billDate)}
                              </td>
                            )}
                            {colVis.item && (
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[200px] truncate">
                                {itemSummary}
                              </td>
                            )}
                            {colVis.unit && (
                              <td className="py-2.5 px-3 font-mono text-slate-500">
                                {firstItem.unit}
                              </td>
                            )}
                            {colVis.purchqty && (
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                                {r.items.reduce((s, i) => s + i.purchaseQty, 0)}
                              </td>
                            )}
                            {colVis.damageqty && (
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {r.items.reduce((s, i) => s + i.damageQty, 0)}
                              </td>
                            )}
                            {colVis.reason && (
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap max-w-[180px] truncate">
                                {firstItem.reason}
                              </td>
                            )}
                            {colVis.attachment && (
                              <td className="py-2.5 px-3 whitespace-nowrap text-center">
                                {r.items && r.items.some((i) => i.damageImageUrl) ? (
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {r.items
                                      .filter((i) => i.damageImageUrl)
                                      .map((i, idx) => (
                                        <a
                                          key={idx}
                                          href={i.damageImageUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          title="View Damage Proof Attachment"
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800"
                                        >
                                          <Paperclip className="w-3 h-3" />
                                          <span>
                                            {r.items.length > 1 ? `Proof #${idx + 1}` : "Proof"}
                                          </span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      ))}
                                  </div>
                                ) : r.billImage ? (
                                  <a
                                    href={r.billImagePreview || placeholderPreviewUrl(r.billImage)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-blue-600"
                                  >
                                    <span>Bill Photo</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">-</span>
                                )}
                              </td>
                            )}
                            {colVis.damagevalue && (
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {inr(r.damageValue)}
                              </td>
                            )}
                            {colVis.requestdate && (
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {fmtDate(r.requestDate)}
                              </td>
                            )}
                            {colVis.planneddate && (
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {tatStatus?.dueAt ? formatDateTime(tatStatus.dueAt) : "—"}
                              </td>
                            )}
                            {colVis.delay && (
                              <td
                                className="py-2.5 px-3 text-center whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {tatStatus?.dueAt ? (
                                  <TatStageBadge
                                    tatStatus={tatStatus}
                                    isCompleted={
                                      activeTab === "history" ||
                                      Boolean(r.approval || r.rejected)
                                    }
                                  />
                                ) : (
                                  <span className="text-slate-400 font-mono text-xs">—</span>
                                )}
                              </td>
                            )}
                            {colVis.actiontype && (
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.approval ? r.approval.actionType : "-"}
                              </td>
                            )}
                            {colVis.tpb && (
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.transportPaidBy || "-"}
                              </td>
                            )}
                            {colVis.approvedby && (
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {r.approval ? r.approval.approvedBy : "-"}
                              </td>
                            )}
                            {colVis.status && (
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <StatusBadge status={status} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={25}
                    className="py-12 text-center text-slate-400 text-xs font-medium"
                  >
                    No records found for the selected tab and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard Approval Modal */}
      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        records={modalRecords}
      />

      {/* Top-Up Balance Approval Modal */}
      <TopUpApprovalModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        records={modalRecords}
      />

      {/* Create Return Modal */}
      <CreateReturnModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Rejection Prompt Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Reject Purchase Return {rejectId}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Rejection
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="Damage below reporting threshold">
                    Damage below reporting threshold
                  </option>
                  <option value="Duplicate return request">
                    Duplicate return request
                  </option>
                  <option value="Supplier already settled on invoice">
                    Supplier already settled on invoice
                  </option>
                  <option value="Other inspection reason">
                    Other inspection reason
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Justification
                </label>
                <textarea
                  rows={3}
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Explain why this return request is being rejected..."
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
