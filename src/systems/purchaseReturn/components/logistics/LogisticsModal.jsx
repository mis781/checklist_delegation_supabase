import { useState, useEffect } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import ProductMiniTable from "../common/ProductMiniTable";
import FileUploadBox from "../common/FileUploadBox";
import { todayISO, placeholderPreviewUrl } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { ExternalLink } from "lucide-react";

export default function LogisticsModal({ isOpen, onClose, records }) {
  const { arrangeLogistics } = usePurchaseReturn();

  const [transporterName, setTransporterName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [biltyAvailable, setBiltyAvailable] = useState("Yes");
  const [biltyNumber, setBiltyNumber] = useState("");
  const [biltyCopyName, setBiltyCopyName] = useState("");
  const [biltyCopyUrl, setBiltyCopyUrl] = useState("");
  const [biltyFile, setBiltyFile] = useState(null);
  const [transportingAmount, setTransportingAmount] = useState("");
  const [transportDate, setTransportDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [checkedCodesMap, setCheckedCodesMap] = useState({});

  useEffect(() => {
    if (isOpen && records.length > 0) {
      const initMap = {};
      records.forEach((r) => {
        initMap[r.id] = new Set((r.items || []).map((i) => i.itemCode));
      });
      setCheckedCodesMap(initMap);
      setTransporterName("");
      setVehicleNumber("");
      setDriverName("");
      setDriverMobile("");
      setBiltyAvailable("Yes");
      setBiltyNumber("");
      setBiltyCopyName("");
      setBiltyCopyUrl("");
      setBiltyFile(null);
      setTransportingAmount("");
      setTransportDate(todayISO());
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

    arrangeLogistics({
      ids: records.map((r) => r.id),
      data: {
        transporterName: transporterName.trim() || "Local Transport Co.",
        vehicleNumber: vehicleNumber.trim() || "CG04-XX-0000",
        driverName: driverName.trim() || "Driver Assigned",
        driverMobile: driverMobile.trim() || "9800000000",
        biltyAvailable,
        biltyNumber: biltyAvailable === "Yes" ? biltyNumber || "BLT-" + Math.floor(1000 + Math.random() * 9000) : null,
        biltyCopyName: biltyAvailable === "Yes" ? biltyCopyName || "bilty_copy.pdf" : null,
        biltyCopyUrl: biltyAvailable === "Yes" ? biltyCopyUrl || placeholderPreviewUrl("bilty_copy.pdf") : null,
        biltyFile: biltyAvailable === "Yes" ? biltyFile : null,
        transportingAmount: Number(transportingAmount) || 0,
        transportDate: transportDate || todayISO(),
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
      title="Arrange Logistics for Lift Return Material"
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
            Confirm Logistics
          </button>
        </>
      }
    >
      {/* Overview Info Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs">
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
            PO / Bill
          </span>
          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 truncate block">
            {isBulk ? "Multiple" : first.poNumber} / {first.billNumber}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Bill Image
          </span>
          <a
            href={first.billImagePreview || placeholderPreviewUrl(first.billImage)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            <span className="truncate max-w-[100px]">{first.billImage}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
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
            Total Selected Qty
          </span>
          <span className="font-bold font-mono text-blue-600 dark:text-blue-400 block">
            {totalReturnQtyCalc}
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

      {/* Transporter Details */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Transporter & Vehicle Details
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transporter Name
            </label>
            <input
              type="text"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              placeholder="e.g. Shree Roadways Corp"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vehicle Number
            </label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. CG04-AB-1234"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Driver Full Name
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g. Suresh Sahu"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Driver Mobile Number
            </label>
            <input
              type="tel"
              value={driverMobile}
              onChange={(e) => setDriverMobile(e.target.value)}
              placeholder="10-digit mobile no."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bilty Details */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Bilty / LR Details
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bilty Available?
            </label>
            <select
              value={biltyAvailable}
              onChange={(e) => setBiltyAvailable(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {biltyAvailable === "Yes" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bilty / LR Number
              </label>
              <input
                type="text"
                value={biltyNumber}
                onChange={(e) => setBiltyNumber(e.target.value)}
                placeholder="e.g. BLT-5000"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {biltyAvailable === "Yes" && (
            <div className="sm:col-span-2">
              <FileUploadBox
                label="Upload Bilty Copy"
                fileName={biltyCopyName}
                fileUrl={biltyCopyUrl}
                onFileSelect={(name, url, file) => {
                  setBiltyCopyName(name);
                  setBiltyCopyUrl(url);
                  setBiltyFile(file || null);
                }}
                placeholder="Click to select bilty / consignment note copy"
              />
            </div>
          )}
        </div>
      </div>

      {/* Commercial & Dates */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
          Transport Amount & Expected Return Date
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transporting Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={transportingAmount}
              onChange={(e) => setTransportingAmount(e.target.value)}
              placeholder="e.g. 3500"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Return Date
            </label>
            <input
              type="date"
              value={transportDate}
              onChange={(e) => setTransportDate(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Logistics Handling Remarks <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Driver handling notes, destination warehouse, pickup instructions..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </ActionModalWrapper>
  );
}
