import { useState, useEffect } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import ProductMiniTable from "../common/ProductMiniTable";
import FileUploadBox from "../common/FileUploadBox";
import { inr, todayISO, uid, placeholderPreviewUrl } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { ExternalLink, Truck } from "lucide-react";

export default function DebitNoteModal({ isOpen, onClose, records }) {
  const { issueDebitNote } = usePurchaseReturn();

  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [checkedCodesMap, setCheckedCodesMap] = useState({});

  useEffect(() => {
    if (isOpen && records.length > 0) {
      const initMap = {};
      records.forEach((r) => {
        initMap[r.id] = new Set((r.items || []).map((i) => i.itemCode));
      });
      setCheckedCodesMap(initMap);

      const totalVal = records.reduce(
        (sum, r) => sum + (r.items || []).reduce((sub, i) => sub + i.returnValue, 0),
        0
      );

      setNumber(uid("DN-2026-"));
      setDate(todayISO());
      setAmount(String(totalVal));
      setImageName("");
      setImageUrl("");
      setImageFile(null);
      setRemarks("");
    }
  }, [isOpen, records]);

  const handleToggleCode = (recId, itemCode) => {
    setCheckedCodesMap((prev) => {
      const curSet = prev[recId] || new Set();
      const nextSet = new Set(curSet);
      if (nextSet.has(itemCode)) {
        nextSet.delete(itemCode);
      } else {
        nextSet.add(itemCode);
      }
      return { ...prev, [recId]: nextSet };
    });
  };

  const handleSubmit = () => {
    const excludedCodesMap = {};
    records.forEach((r) => {
      const included = checkedCodesMap[r.id] || new Set();
      const excluded = (r.items || [])
        .map((i) => i.itemCode)
        .filter((c) => !included.has(c));
      if (excluded.length > 0) {
        excludedCodesMap[r.id] = excluded;
      }
    });

    issueDebitNote({
      ids: records.map((r) => r.id),
      data: {
        number: number.trim() || uid("DN-2026-"),
        date: date || todayISO(),
        amount: Number(amount) || 0,
        imageName: imageName || "debit_note_scan.jpg",
        imageUrl: imageUrl || placeholderPreviewUrl("debit_note_scan.jpg"),
        imageFile,
        remarks
      },
      excludedCodesMap
    });
    onClose();
  };

  if (!isOpen || !records || records.length === 0) return null;

  const isBulk = records.length > 1;
  const first = records[0];

  const totalReturnValueCalc = records.reduce(
    (sum, r) =>
      sum +
      (r.items || []).reduce((subSum, i) => {
        const isInc = checkedCodesMap[r.id]
          ? checkedCodesMap[r.id].has(i.itemCode)
          : true;
        return subSum + (isInc ? i.returnValue : 0);
      }, 0),
    0
  );

  return (
    <ActionModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Debit Note & Inform"
      subtitle={
        isBulk
          ? `${records.length} Records (Bill No: ${first.billNumber})`
          : `${first.returnNumber || first.return_number || first.id}`
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
            Issue Debit Note & Notify
          </button>
        </>
      }
    >
      {/* Overview Info Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs">
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
            Credit Note Copy
          </span>
          {first.creditNote && first.creditNote.attachmentName ? (
            <a
              href={first.creditNote.attachmentUrl || placeholderPreviewUrl(first.creditNote.attachmentName)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              <span className="truncate max-w-[100px]">{first.creditNote.attachmentName}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-slate-400 font-italic">Not Uploaded</span>
          )}
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Action Type
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.approval ? first.approval.actionType : "-"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Transport Term
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.approval ? first.approval.transportPaidBy : "-"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Calculated Return Value
          </span>
          <span className="font-bold font-mono text-blue-600 dark:text-blue-400 block">
            {inr(totalReturnValueCalc)}
          </span>
        </div>
      </div>

      {/* Logistics Reference Box */}
      {first.logistics ? (
        <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs">
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Logistics Assigned:</strong> {first.logistics.transporterName} &middot;{" "}
              <span className="font-mono font-bold">{first.logistics.vehicleNumber}</span>
            </span>
            {first.logistics.biltyNumber && (
              <span className="font-mono text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700">
                Bilty: {first.logistics.biltyNumber}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic">
          Logistics not required for this action type.
        </div>
      )}

      {/* Product Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Product Details
        </h4>
        <ProductMiniTable
          records={records}
          isBulk={isBulk}
          showValue={true}
          checkedCodes={checkedCodesMap}
          onToggleCode={handleToggleCode}
        />
      </div>

      {/* Debit Note Form */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Debit Note Details
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Debit Note Number
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. DN-2026-0055"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Debit Note Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Debit Note Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-3">
            <FileUploadBox
              label="Upload Debit Note Image / Scan"
              fileName={imageName}
              fileUrl={imageUrl}
              onFileSelect={(name, url, file) => {
                setImageName(name);
                setImageUrl(url);
                setImageFile(file || null);
              }}
              placeholder="Click to select signed debit note scan or PDF copy"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks on Supplier Communication <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Shared with supplier accounts team via email..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </ActionModalWrapper>
  );
}
