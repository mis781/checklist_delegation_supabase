import { useState, useEffect } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import ProductMiniTable from "../common/ProductMiniTable";
import FileUploadBox from "../common/FileUploadBox";
import { inr, placeholderPreviewUrl } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { ExternalLink } from "lucide-react";

export default function PlantReturnModal({ isOpen, onClose, records }) {
  const { confirmPlantDispatch } = usePurchaseReturn();

  const [photoName, setPhotoName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [attName, setAttName] = useState("");
  const [attUrl, setAttUrl] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [checkedCodesMap, setCheckedCodesMap] = useState({});

  useEffect(() => {
    if (isOpen && records.length > 0) {
      const initMap = {};
      records.forEach((r) => {
        initMap[r.id] = new Set((r.items || []).map((i) => i.itemCode));
      });
      setCheckedCodesMap(initMap);
      setPhotoName("");
      setPhotoUrl("");
      setPhotoFile(null);
      setAttName("");
      setAttUrl("");
      setAttachmentFile(null);
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

    confirmPlantDispatch({
      ids: records.map((r) => r.id),
      data: {
        actualQty: totalReturnQtyCalc,
        photoName: photoName || "loaded_material_truck.jpg",
        photoUrl: photoUrl || placeholderPreviewUrl("loaded_material_truck.jpg"),
        photoFile,
        attachmentName: attName || null,
        attachmentUrl: attUrl || null,
        attachmentFile,
        remarks
      },
      excludedCodesMap
    });
    onClose();
  };

  if (!isOpen || !records || records.length === 0) return null;

  const isBulk = records.length > 1;
  const first = records[0];

  const totalReturnQtyCalc = records.reduce(
    (sum, r) =>
      sum +
      (r.items || []).reduce((subSum, i) => {
        const isInc = checkedCodesMap[r.id]
          ? checkedCodesMap[r.id].has(i.itemCode)
          : true;
        return subSum + (isInc ? i.returnQty : 0);
      }, 0),
    0
  );

  return (
    <ActionModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Return From Plant"
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
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            Confirm Dispatch &amp; Complete
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
            Total Return Qty
          </span>
          <span className="font-bold font-mono text-blue-600 dark:text-blue-400 block">
            {totalReturnQtyCalc}
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
              <span className="truncate max-w-[100px]">{first.billImage}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic block">Not Uploaded</span>
          )}
        </div>
        <div className="sm:col-span-2">
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Assigned Vehicle &amp; Transporter
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {first.logistics
              ? `${first.logistics.vehicleNumber} · ${first.logistics.transporterName}`
              : "N/A (logistics not required)"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Debit Note Ref
          </span>
          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 truncate block">
            {first.debitNote
              ? `${first.debitNote.number} (${inr(first.debitNote.amount)})`
              : "Not applicable (Replacement)"}
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
          showValue={false}
          checkedCodes={checkedCodesMap}
          onToggleCode={handleToggleCode}
        />
      </div>

      {/* Dispatch Uploads */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Dispatch Proof &amp; Documentation
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FileUploadBox
            label="Photo of Loaded Material in Vehicle"
            fileName={photoName}
            fileUrl={photoUrl}
            onFileSelect={(name, url, file) => {
              setPhotoName(name);
              setPhotoUrl(url);
              setPhotoFile(file || null);
            }}
            placeholder="Click to upload photograph of loaded vehicle"
          />

          <FileUploadBox
            label="Additional Attachment / Gate Pass"
            fileName={attName}
            fileUrl={attUrl}
            onFileSelect={(name, url, file) => {
              setAttName(name);
              setAttUrl(url);
              setAttachmentFile(file || null);
            }}
            placeholder="Click to upload security gate pass or delivery challan"
          />

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dispatch Remarks / Gate-Pass Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Material inspected, counted, and loaded into truck successfully..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </ActionModalWrapper>
  );
}
