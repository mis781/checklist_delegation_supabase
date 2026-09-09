import { useState, useEffect, useRef, useMemo } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import ProductMiniTable from "../common/ProductMiniTable";
import FileUploadBox from "../common/FileUploadBox";
import { todayISO, placeholderPreviewUrl } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { fetchMasterTransporters } from "../../../purchase/services/purchaseMasterApi";
import { ExternalLink, ChevronDown, Search, Check, X } from "lucide-react";

function TransporterDropdown({
  value,
  onChange,
  transporters = [],
  loading = false,
  onSelectTransporter = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transporters;
    return transporters.filter((t) => {
      const name = (t.transporter_name || t.transport_name || t.name || "").toLowerCase();
      const phone = (t.phone || t.mobile || "").toLowerCase();
      const contact = (t.contact_person || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || contact.includes(q);
    });
  }, [transporters, search]);

  const exactMatch = transporters.some(
    (t) =>
      (t.transporter_name || t.transport_name || t.name || "").trim().toLowerCase() ===
      search.trim().toLowerCase()
  );

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearch("");
        }}
        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left cursor-pointer transition-all min-h-[34px]"
      >
        <span
          className={`truncate ${
            value
              ? "text-slate-800 dark:text-slate-100 font-semibold"
              : "text-slate-400 font-normal"
          }`}
        >
          {value || "Select or search transporter..."}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2 text-slate-400">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name, mobile, contact..."
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-100/50 dark:divide-slate-800/50">
            {loading ? (
              <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <span>Loading transporters...</span>
              </div>
            ) : filtered.length === 0 && !search.trim() ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No authorized transporters found in Purchase Settings.
              </div>
            ) : (
              <>
                {filtered.map((t) => {
                  const tName = t.transporter_name || t.transport_name || t.name;
                  const isSelected = value === tName;
                  return (
                    <button
                      key={t.id || tName}
                      type="button"
                      onClick={() => {
                        onChange(tName);
                        if (onSelectTransporter) onSelectTransporter(t);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-semibold">{tName}</div>
                        {(t.phone || t.mobile || (t.contact_person && t.contact_person !== "-")) && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {t.phone || t.mobile ? `📱 ${t.phone || t.mobile}` : ""}
                            {t.contact_person && t.contact_person !== "-"
                              ? ` · Contact: ${t.contact_person}`
                              : ""}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })}

                {search.trim() && !exactMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.trim());
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold cursor-pointer border-t border-dashed border-slate-200 dark:border-slate-700 mt-1"
                  >
                    + Use custom transporter: &ldquo;
                    <span className="underline">{search.trim()}</span>&rdquo;
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const [masterTransporters, setMasterTransporters] = useState([]);
  const [loadingTransporters, setLoadingTransporters] = useState(false);

  // Fetch transporters from Purchase Global Settings
  useEffect(() => {
    let isMounted = true;
    const loadTransporters = async () => {
      setLoadingTransporters(true);
      try {
        const list = await fetchMasterTransporters();
        if (isMounted && Array.isArray(list)) {
          const activeOnly = list.filter((t) => t.is_active !== false);
          setMasterTransporters(activeOnly);
        }
      } catch (err) {
        console.warn("Failed to load master transporters in LogisticsModal:", err);
      } finally {
        if (isMounted) setLoadingTransporters(false);
      }
    };

    if (isOpen) {
      loadTransporters();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && records.length > 0) {
      const initMap = {};
      records.forEach((r) => {
        initMap[r.id] = new Set((r.items || []).map((i) => i.itemCode));
      });
      setCheckedCodesMap(initMap);
      setTransporterName(records[0]?.logistics?.transporterName || "");
      setVehicleNumber(records[0]?.logistics?.vehicleNumber || "");
      setDriverName(records[0]?.logistics?.driverName || "");
      setDriverMobile(records[0]?.logistics?.driverMobile || "");
      setBiltyAvailable(records[0]?.logistics?.biltyAvailable || "Yes");
      setBiltyNumber(records[0]?.logistics?.biltyNumber || "");
      setBiltyCopyName(records[0]?.logistics?.biltyCopyName || "");
      setBiltyCopyUrl(records[0]?.logistics?.biltyCopyUrl || "");
      setBiltyFile(null);
      setTransportingAmount(
        records[0]?.logistics?.transportingAmount != null
          ? String(records[0].logistics.transportingAmount)
          : ""
      );
      setTransportDate(records[0]?.logistics?.transportDate || todayISO());
      setRemarks(records[0]?.logistics?.remarks || "");
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
            <TransporterDropdown
              value={transporterName}
              onChange={setTransporterName}
              transporters={masterTransporters}
              loading={loadingTransporters}
              onSelectTransporter={(t) => {
                if ((t.phone || t.mobile) && !driverMobile) {
                  setDriverMobile(t.phone || t.mobile);
                }
                if (t.contact_person && t.contact_person !== "-" && !driverName) {
                  setDriverName(t.contact_person);
                }
              }}
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
