import { inr } from "../../data/dummyPurchaseReturns";

export default function ProductMiniTable({
  records,
  isBulk = false,
  showValue = false,
  checkedCodes = {}, // { [recId]: Set of itemCodes } or array
  onToggleCode, // (recId, itemCode) => void
  readOnly = false
}) {
  const totalItems = records.reduce((s, r) => s + (r.items ? r.items.length : 0), 0);

  return (
    <div className="space-y-1.5">
      <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
        {records.length} return record{records.length > 1 ? "s" : ""} &middot;{" "}
        {totalItems} line item{totalItems > 1 ? "s" : ""} shown below
      </p>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {!readOnly && <th className="py-2 px-3 w-12 text-center">Include</th>}
              {isBulk && <th className="py-2 px-3">Return Req. ID</th>}
              <th className="py-2 px-3">Item</th>
              <th className="py-2 px-3">Unit</th>
              <th className="py-2 px-3 text-right">Return Qty</th>
              {showValue && <th className="py-2 px-3 text-right">Return Value</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.flatMap((rec) =>
              (rec.items || []).map((item) => {
                const isChecked = checkedCodes[rec.id]
                  ? checkedCodes[rec.id].has(item.itemCode)
                  : true;

                return (
                  <tr
                    key={`${rec.id}::${item.itemCode}`}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      !isChecked ? "opacity-50 line-through" : ""
                    }`}
                  >
                    {!readOnly && (
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleCode && onToggleCode(rec.id, item.itemCode)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                    )}
                    {isBulk && (
                      <td className="py-2 px-3 font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        {rec.returnNumber || rec.return_number || rec.id}
                      </td>
                    )}
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {item.itemName}
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {item.itemCode}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-mono">
                      {item.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {item.returnQty}
                    </td>
                    {showValue && (
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {inr(item.returnValue)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
