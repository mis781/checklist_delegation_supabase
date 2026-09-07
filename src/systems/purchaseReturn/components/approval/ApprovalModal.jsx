import { useState, useEffect } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import { inr, ACTION_TYPES, TRANSPORT_PAID_BY } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { ExternalLink } from "lucide-react";

export default function ApprovalModal({ isOpen, onClose, records }) {
  const { approveReturn } = usePurchaseReturn();

  const [actionType, setActionType] = useState("Make Debit Note");
  const [transportPaidBy, setTransportPaidBy] = useState("For");
  const [remarks, setRemarks] = useState("");

  // Per-item state: { [recId]: { includedCodes: Set, items: { [itemCode]: { actualQty, returnValue } } } }
  const [itemState, setItemState] = useState({});

  useEffect(() => {
    if (isOpen && records.length > 0) {
      const init = {};
      records.forEach((rec) => {
        const itemMap = {};
        const codeSet = new Set();
        (rec.items || []).forEach((item) => {
          codeSet.add(item.itemCode);
          const reqQty = Number(item.damageQty) || Number(item.returnQty) || 0;
          const retVal = Number(item.returnValue) || (reqQty * (Number(item.unitRate) || 0));
          itemMap[item.itemCode] = {
            actualQty: reqQty,
            returnValue: retVal,
            perUnitRate: reqQty > 0 ? retVal / reqQty : 0
          };
        });
        init[rec.id] = { includedCodes: codeSet, items: itemMap };
      });
      setItemState(init);
      setActionType("Make Debit Note");
      setTransportPaidBy("For");
      setRemarks("");
    }
  }, [isOpen, records]);

  const handleToggleInclude = (recId, itemCode) => {
    setItemState((prev) => {
      const recEntry = prev[recId];
      if (!recEntry) return prev;
      const nextCodes = new Set(recEntry.includedCodes);
      if (nextCodes.has(itemCode)) {
        nextCodes.delete(itemCode);
      } else {
        nextCodes.add(itemCode);
      }
      return {
        ...prev,
        [recId]: { ...recEntry, includedCodes: nextCodes }
      };
    });
  };

  const handleSubmit = () => {
    // Format item changes for context
    const itemEdits = {};
    records.forEach((rec) => {
      const state = itemState[rec.id];
      if (state) {
        itemEdits[rec.id] = {
          includedCodes: Array.from(state.includedCodes),
          items: state.items
        };
      }
    });

    approveReturn({
      ids: records.map((r) => r.id),
      actionType,
      transportPaidBy,
      remarks,
      itemEdits
    });
    onClose();
  };

  if (!isOpen || !records || records.length === 0) return null;

  const isBulk = records.length > 1;
  const first = records[0];
  const totalDamageVal = records.reduce((s, r) => s + r.damageValue, 0);

  return (
    <ActionModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Return Approval"
      subtitle={
        isBulk
          ? `${records.length} Records Selected (Bill No: ${first.billNumber})`
          : `${first.returnNumber || first.return_number || first.id} · Pending Decision`
      }
      maxWidth="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Submit Approval
          </button>
        </>
      }
    >
      {/* Overview Info Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs">
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Company
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.company}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Division
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.division}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Supplier
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.supplier}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Bill Number
          </span>
          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 block">
            {first.billNumber}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            PO Number
          </span>
          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 block">
            {isBulk ? "Multiple POs" : first.poNumber}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Damage Value
          </span>
          <span className="font-bold font-mono text-blue-600 dark:text-blue-400 block">
            {inr(totalDamageVal)}
          </span>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
            Product Details & Items to Return
          </h4>
          <span className="text-[11px] text-slate-400">
            Uncheck to exclude an item from this return
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">Include</th>
                {isBulk && <th className="py-2.5 px-3">Req. ID</th>}
                <th className="py-2.5 px-3">Item Details</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-center">Return Qty</th>
                <th className="py-2.5 px-3 text-right">Return Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.flatMap((rec) =>
                (rec.items || []).map((item) => {
                  const state = itemState[rec.id];
                  const isIncluded = state ? state.includedCodes.has(item.itemCode) : true;
                  const itemStateData = state && state.items ? state.items[item.itemCode] : null;
                  const reqQty = Number(item.damageQty) || Number(item.returnQty) || 0;
                  const returnVal = itemStateData ? itemStateData.returnValue : (item.returnValue || reqQty * (item.unitRate || 0));

                  return (
                    <tr
                      key={`${rec.id}::${item.itemCode}`}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        !isIncluded ? "opacity-50 line-through" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => handleToggleInclude(rec.id, item.itemCode)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                      {isBulk && (
                        <td className="py-2.5 px-3 font-mono text-[11px] text-blue-600 font-semibold">
                          {rec.returnNumber || rec.return_number || rec.id}
                        </td>
                      )}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.itemName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 flex-wrap">
                          {item.indentNumber && (
                            <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1 rounded">
                              Indent: {item.indentNumber}
                            </span>
                          )}
                          <span>{item.itemCode} &middot; {item.reason}</span>
                          {item.damageImageUrl && (
                            <a
                              href={item.damageImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-1"
                            >
                              <span>Proof</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                        {reqQty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {inr(returnVal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Section */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Approval Decision
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transport Paid By
            </label>
            <select
              value={transportPaidBy}
              onChange={(e) => setTransportPaidBy(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              {TRANSPORT_PAID_BY.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add physical inspection remarks or authorization notes..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </ActionModalWrapper>
  );
}
