import { useState, useEffect } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import ProductMiniTable from "../common/ProductMiniTable";
import FileUploadBox from "../common/FileUploadBox";
import { inr, placeholderPreviewUrl } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { ExternalLink, AlertCircle } from "lucide-react";

export default function CreditNoteModal({ isOpen, onClose, records }) {
  const { submitCreditNote } = usePurchaseReturn();

  const [remarks, setRemarks] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [checkedCodesMap, setCheckedCodesMap] = useState({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && records.length > 0) {
      const initMap = {};
      records.forEach((r) => {
        initMap[r.id] = new Set((r.items || []).map((i) => i.itemCode));
      });
      setCheckedCodesMap(initMap);
      setRemarks("");
      setAttachmentName("");
      setAttachmentUrl("");
      setAttachmentFile(null);
      setError("");
      setIsSubmitting(false);
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

  const handleSubmit = async () => {
    console.log("🚀 [CreditNoteModal] Submit Request button clicked!");
    console.log("📋 [CreditNoteModal] Form state:", {
      recordIds: records.map((r) => r.id),
      returnNumbers: records.map((r) => r.returnNumber || r.return_number || r.id),
      actionType: records[0]?.approval?.actionType,
      attachmentName,
      attachmentUrl: attachmentUrl ? `${attachmentUrl.slice(0, 80)}...` : null,
      attachmentFile,
      remarks,
      checkedCodesMap
    });

    if (!attachmentName || (!attachmentUrl && !attachmentFile)) {
      console.warn("⚠️ [CreditNoteModal] Validation failed: missing attachment");
      setError("Please attach the credit note request copy or formal email/PDF before submitting.");
      return;
    }

    // Determine excluded codes
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

    console.log("📦 [CreditNoteModal] Submitting with excludedCodesMap:", excludedCodesMap);

    setIsSubmitting(true);
    setError("");
    try {
      console.log("⏳ [CreditNoteModal] Calling submitCreditNote API...");
      await submitCreditNote({
        ids: records.map((r) => r.id),
        remarks,
        attachmentName,
        attachmentUrl,
        attachmentFile,
        excludedCodesMap
      });
      console.log("✅ [CreditNoteModal] submitCreditNote succeeded!");
      onClose();
    } catch (err) {
      console.error("❌ [CreditNoteModal] submitCreditNote failed with error:", err);
      setError(err.message || "Failed to submit credit note request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
      title="Ask Party For Credit Note"
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
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </>
      }
    >
      {/* Readonly Summary Info */}
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
            Bill Image
          </span>
          {first.billImage && String(first.billImage).trim() && first.billImage !== "null" ? (
            <a
              href={first.billImagePreview || placeholderPreviewUrl(first.billImage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              <span className="truncate max-w-[120px]">{first.billImage}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic block">Not Uploaded</span>
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
            Selected Return Value
          </span>
          <span className="font-bold font-mono text-blue-600 dark:text-blue-400 block">
            {inr(totalReturnValueCalc)}
          </span>
        </div>
      </div>

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

      {/* Request Form */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Credit Note Request Details
        </h4>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <FileUploadBox
          label="Credit Note Request Attachment"
          required={true}
          fileName={attachmentName}
          fileUrl={attachmentUrl}
          onFileSelect={(name, url, file) => {
            setAttachmentName(name);
            setAttachmentUrl(url);
            setAttachmentFile(file || null);
            setError("");
          }}
          placeholder="Click to select credit note copy or formal request email/PDF"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Remarks / Instructions to Supplier <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Requesting credit note against damaged material for the above bill..."
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>
    </ActionModalWrapper>
  );
}
