import { useState, useEffect } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { ExternalLink } from "lucide-react";

export default function TopUpApprovalModal({ isOpen, onClose, records }) {
  const { topUpApproveReturn } = usePurchaseReturn();

  const [topUpMap, setTopUpMap] = useState({});
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (isOpen && records.length > 0) {
      const init = {};
      records.forEach((rec) => {
        (rec.items || [])
          .filter((i) => (i.pendingQty || 0) > 0)
          .forEach((i) => {
            init[`${rec.id}::${i.itemCode}`] = i.pendingQty;
          });
      });
      setTopUpMap(init);
      setRemarks("");
    }
  }, [isOpen, records]);

  const handleInputChange = (key, maxVal, valStr) => {
    let val = Number(valStr);
    if (isNaN(val) || val < 0) val = 0;
    if (val > maxVal) val = maxVal;
    setTopUpMap((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = () => {
    topUpApproveReturn({
      ids: records.map((r) => r.id),
      topUpMap,
      remarks
    });
    onClose();
  };

  if (!isOpen || !records || records.length === 0) return null;

  const isBulk = records.length > 1;
  const first = records[0];

  return (
    <ActionModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Pending Return"
      subtitle={
        isBulk
          ? `${records.length} Records Selected (Bill No: ${first.billNumber})`
          : `${first.returnNumber} · Remaining Balance Approval`
      }
      maxWidth="max-w-2xl"
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
            Approve Balance
          </button>
        </>
      }
    >
      {/* Readonly Info Summary */}
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
            Supplier
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.supplier}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Action Type
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400 truncate block">
            {first.approval ? first.approval.actionType : "-"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Transport Paid By
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.approval ? first.approval.transportPaidBy : "-"}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
            Remaining Pending Quantity
          </h4>
          <span className="text-[11px] text-slate-400">
            Enter quantity to approve in this batch
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                {isBulk && <th className="py-2.5 px-3">Req. ID</th>}
                <th className="py-2.5 px-3">Item Details</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3 text-right">Total Damage</th>
                <th className="py-2.5 px-3 text-right">Already Approved</th>
                <th className="py-2.5 px-3 text-center text-amber-600">Pending Qty</th>
                <th className="py-2.5 px-3 text-center">Approve Now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.flatMap((rec) =>
                (rec.items || [])
                  .filter((i) => (i.pendingQty || 0) > 0)
                  .map((item) => {
                    const key = `${rec.id}::${item.itemCode}`;
                    const curVal = topUpMap[key] != null ? topUpMap[key] : item.pendingQty;

                    return (
                      <tr key={key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
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
                            <span>{item.itemCode}</span>
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
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {item.damageQty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                          {item.returnQty}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">
                          {item.pendingQty}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.pendingQty}
                            value={curVal}
                            onChange={(e) =>
                              handleInputChange(key, item.pendingQty, e.target.value)
                            }
                            className="w-20 px-2 py-1 text-center font-mono font-bold border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Remarks <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Notes on this subsequent batch authorization..."
          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>
    </ActionModalWrapper>
  );
}
