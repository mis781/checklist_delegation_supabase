import { useState, Fragment } from "react";
import FilterBar from "../common/FilterBar";
import ColumnToggleDropdown from "../common/ColumnToggleDropdown";
import BulkActionBar from "../common/BulkActionBar";
import StatusBadge from "../common/StatusBadge";
import LogisticsModal from "./LogisticsModal";
import {
  M2_PENDING,
  M2_HISTORY,
  fmtDate,
  overallStatus,
  placeholderPreviewUrl,
  totalReturnQty
} from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn, groupRecordsByBill } from "../../context/PurchaseReturnContext";
import TatStageBadge from "../../../purchase/components/TatStageBadge";
import { formatDateTime } from "../../../purchase/utils/dateUtils";
import { AlertCircle, Eye, ExternalLink, FileText, Loader2 } from "lucide-react";

const M2_COLUMNS = [
  { key: "returnno", label: "Return Req. ID" },
  { key: "company", label: "Company" },
  { key: "division", label: "Division" },
  { key: "supplier", label: "Supplier" },
  { key: "po", label: "PO No." },
  { key: "indentno", label: "Indent No." },
  { key: "bill", label: "Bill No." },
  { key: "billimage", label: "Bill Image" },
  { key: "product", label: "Product" },
  { key: "qty", label: "Return Qty" },
  { key: "reason", label: "Reason" },
  { key: "planneddate", label: "Planned Date" },
  { key: "delay", label: "Delay" },
  { key: "tpb", label: "Transport Paid By" },
  { key: "status", label: "Status" }
];

export default function LogisticsView({ onOpenDetails }) {
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
    getTatStatusForReturn
  } = usePurchaseReturn();

  const isEditable = canEdit("logistics");
  const activeTab = activeTabs.logistics;

  const pendingAll = records.filter(M2_PENDING);
  const historyAll = records.filter(M2_HISTORY);

  const pendingFiltered = applyFilters(pendingAll, "logistics");
  const historyFiltered = applyFilters(historyAll, "logistics");

  const displayRows = activeTab === "pending" ? pendingFiltered : historyFiltered;
  const colVis = getColVis("m2", M2_COLUMNS);

  const [modalRecords, setModalRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenAction = (record) => {
    setModalRecords([record]);
    setIsModalOpen(true);
  };

  const handleBulkAction = (ids) => {
    const recs = records.filter((r) => ids.includes(r.id));
    if (recs.length === 0) return;
    setModalRecords(recs);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {!isEditable && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>You have View-only access to this page. Action buttons are disabled.</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Arrange Logistics for Lift Return Material
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coordinate transporter, vehicle, driver details, and bilty for physical material movement
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ColumnToggleDropdown tableKey="m2" columns={M2_COLUMNS} />
          </div>
        </div>

        <FilterBar viewKey="logistics" />

        <div className="flex items-center gap-6 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setTab("logistics", "pending")}
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
            onClick={() => setTab("logistics", "history")}
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

        {activeTab === "pending" && (
          <BulkActionBar moduleKey="logistics" onTriggerBulkAction={handleBulkAction} />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-3 w-24">Action</th>
                {activeTab === "pending" && <th className="py-3 px-3 w-12 text-center">Select</th>}
                {colVis.returnno && <th className="py-3 px-3">Return Req. ID</th>}
                {colVis.company && <th className="py-3 px-3">Company</th>}
                {colVis.division && <th className="py-3 px-3">Division</th>}
                {colVis.supplier && <th className="py-3 px-3">Supplier</th>}
                {colVis.po && <th className="py-3 px-3">PO No.</th>}
                {colVis.indentno && <th className="py-3 px-3">Indent No.</th>}
                {colVis.bill && <th className="py-3 px-3">Bill No.</th>}
                {colVis.billimage && <th className="py-3 px-3">Bill Image</th>}
                {colVis.product && <th className="py-3 px-3">Product</th>}
                {colVis.qty && <th className="py-3 px-3 text-right">Return Qty</th>}
                {colVis.reason && <th className="py-3 px-3">Reason</th>}
                {colVis.planneddate && <th className="py-3 px-3 text-center font-mono">Planned Date</th>}
                {colVis.delay && <th className="py-3 px-3 text-center">Delay</th>}
                {colVis.tpb && <th className="py-3 px-3">Transport Paid By</th>}
                {colVis.status && <th className="py-3 px-3">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
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
                    selection.moduleKey === "logistics" &&
                    selection.billNumber === group.billNumber &&
                    group.records.length > 0 &&
                    group.records.every((r) => selection.ids.includes(r.id));
                  const groupTotalQty = group.records.reduce(
                    (s, r) => s + (Number(totalReturnQty(r)) || 0),
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
                                      "logistics",
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
                                Total Qty: {groupTotalQty}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Group Rows */}
                      {group.records.map((r) => {
                        const isChecked =
                          selection.moduleKey === "logistics" && selection.ids.includes(r.id);
                        const status = overallStatus(r);
                        const tatStatus = getTatStatusForReturn
                          ? getTatStatusForReturn(r.id, "Arrange Logistics")
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
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {activeTab === "pending" ? (
                                isEditable ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAction(r)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                  >
                                    Action
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDetails && onOpenDetails(r.id)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
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

                            {activeTab === "pending" && (
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRowSelect("logistics", r.id, r.billNumber)}
                                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                />
                              </td>
                            )}

                            {colVis.returnno && (
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
                                {r.indentNumber ||
                                  (r.items && r.items.length > 0
                                    ? r.items
                                        .map((i) => i.indentNumber || i.sku)
                                        .filter(Boolean)
                                        .join(", ") || "-"
                                    : "-")}
                              </td>
                            )}
                            {colVis.bill && (
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {r.billNumber}
                              </td>
                            )}
                            {colVis.billimage && (
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {r.billImage && String(r.billImage).trim() && r.billImage !== "null" ? (
                                  <a
                                    href={
                                      r.billImagePreview || placeholderPreviewUrl(r.billImage)
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                                  >
                                    <span>{r.billImage}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                    Not Uploaded
                                  </span>
                                )}
                              </td>
                            )}
                            {colVis.product && (
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[200px] truncate">
                                {itemSummary}
                              </td>
                            )}
                            {colVis.qty && (
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                {totalReturnQty(r)}
                              </td>
                            )}
                            {colVis.reason && (
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap max-w-[180px] truncate">
                                {firstItem.reason}
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
                                      activeTab === "history" || Boolean(r.logistics)
                                    }
                                  />
                                ) : (
                                  <span className="text-slate-400 font-mono text-xs">—</span>
                                )}
                              </td>
                            )}
                            {colVis.tpb && (
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {r.approval ? r.approval.transportPaidBy : "-"}
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
                    colSpan={15}
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

      <LogisticsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        records={modalRecords}
      />
    </div>
  );
}
