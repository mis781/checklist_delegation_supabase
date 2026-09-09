import { useState, useEffect } from "react";
import ActionModalWrapper from "./ActionModalWrapper";
import {
  REASONS,
  UNITS,
  inr,
  todayISO
} from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { fetchPurchaseOrdersForReturn } from "../../services/purchaseReturnApi";
import { Plus, Trash2, PackagePlus, AlertCircle, Paperclip, X } from "lucide-react";

/**
 * Damage Reason Selector
 * - Field starts empty with '-- Select Reason --'
 * - Standard reasons in dropdown with zero clipping
 * - Selecting 'Other / Custom Reason...' smoothly allows manual typing
 */
function DamageReasonCell({ value, onChange }) {
  const isPreset = REASONS.includes(value);
  const [isCustomMode, setIsCustomMode] = useState(!isPreset && Boolean(value));

  if (isCustomMode) {
    return (
      <div className="flex items-center gap-1 w-full min-w-[170px]">
        <input
          type="text"
          autoFocus
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type custom reason..."
          className="w-full text-xs bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-600 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
        />
        <button
          type="button"
          onClick={() => {
            setIsCustomMode(false);
            onChange("");
          }}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded text-xs transition-colors shrink-0"
          title="Back to dropdown options"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-[170px]">
      <select
        value={value || ""}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setIsCustomMode(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
      >
        <option value="">-- Select Reason --</option>
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
        <option value="__custom__">➕ Other / Custom Reason...</option>
      </select>
    </div>
  );
}

export default function CreateReturnModal({ isOpen, onClose }) {
  const {
    createReturn,
    combinedCompanyOptions,
    companyOptions
  } = usePurchaseReturn();

  const [poList, setPoList] = useState([]);
  const [isPoLoading, setIsPoLoading] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields - clean and empty by default
  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [company, setCompany] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [billImageUrl, setBillImageUrl] = useState("");

  // Items - empty item waiting for user or PO autofill
  const [items, setItems] = useState([
    {
      indentNumber: "",
      itemCode: "",
      itemName: "",
      unit: "KG",
      purchaseQty: "",
      damageQty: "",
      unitRate: "",
      returnValue: 0,
      damageReason: "",
      damageImageFile: null,
      damageImageUrl: "",
      damageImageName: ""
    }
  ]);

  const allCompanyOptions =
    combinedCompanyOptions && combinedCompanyOptions.length > 0
      ? combinedCompanyOptions
      : companyOptions || [];

  // Load POs on open & reset all fields to clean blank state
  useEffect(() => {
    if (isOpen) {
      setIsPoLoading(true);
      fetchPurchaseOrdersForReturn()
        .then((res) => {
          setPoList(res || []);
        })
        .finally(() => {
          setIsPoLoading(false);
        });

      // reset form to clean blank state
      setSelectedPoId("");
      setPoNumber("");
      setSupplier("");
      setCompany("");
      setBillNumber("");
      setBillDate("");
      setBillImageUrl("");
      setItems([
        {
          indentNumber: "",
          itemCode: "",
          itemName: "",
          unit: "KG",
          purchaseQty: "",
          damageQty: "",
          unitRate: "",
          returnValue: 0,
          damageReason: "",
          damageImageFile: null,
          damageImageUrl: "",
          damageImageName: ""
        }
      ]);
    }
  }, [isOpen]);

  // Handle PO selection - autofills details from Material Received stage
  const handleSelectPO = (e) => {
    const poId = e.target.value;
    setSelectedPoId(poId);
    if (!poId) {
      // Clear fields if unselected
      setPoNumber("");
      setSupplier("");
      setCompany("");
      setBillNumber("");
      setBillDate("");
      setItems([
        {
          indentNumber: "",
          itemCode: "",
          itemName: "",
          unit: "KG",
          purchaseQty: "",
          damageQty: "",
          unitRate: "",
          returnValue: 0,
          damageReason: "",
          damageImageFile: null,
          damageImageUrl: "",
          damageImageName: ""
        }
      ]);
      return;
    }

    const po = poList.find((p) => p.id === poId);
    if (po) {
      setPoNumber(po.po_number || "");
      setSupplier(po.vendor_name || "");

      // Autofill Bill / GRN Number & Receipt Date from Material Received stage
      if (po.grnNumber) {
        setBillNumber(po.grnNumber);
      }
      if (po.receivedDate) {
        setBillDate(po.receivedDate);
      }

      // Autofill Company from indent delivery location, PO delivery location, or firm name
      const candidateLocations = [
        po.indent_delivery_location,
        po.delivery_location,
        po.indent_warehouse_location,
        po.firm_name
      ].filter((v) => v && typeof v === "string" && v.trim());

      let matchedComp = null;

      // 1. Exact match against allCompanyOptions (case-insensitive)
      for (const loc of candidateLocations) {
        const locClean = loc.toLowerCase().trim();
        const found = allCompanyOptions.find(
          (c) => c.toLowerCase().trim() === locClean
        );
        if (found) {
          matchedComp = found;
          break;
        }
      }

      // 2. Inclusion match (option contains location or location contains option)
      if (!matchedComp) {
        for (const loc of candidateLocations) {
          const locClean = loc.toLowerCase().trim();
          const found = allCompanyOptions.find((c) => {
            const cClean = c.toLowerCase().trim();
            return cClean.includes(locClean) || locClean.includes(cClean);
          });
          if (found) {
            matchedComp = found;
            break;
          }
        }
      }

      // 3. Sub-token / Unit match (e.g. "Raipur", "Bhilai", "Bilaspur", "Plant 1")
      if (!matchedComp) {
        for (const loc of candidateLocations) {
          const tokens = loc.split(/[-–—/,\s]+/).map((t) => t.toLowerCase().trim()).filter((t) => t.length >= 4);
          for (const token of tokens) {
            const found = allCompanyOptions.find((c) => c.toLowerCase().includes(token));
            if (found) {
              matchedComp = found;
              break;
            }
          }
          if (matchedComp) break;
        }
      }

      if (matchedComp) {
        setCompany(matchedComp);
      } else if (po.indent_delivery_location) {
        setCompany(po.indent_delivery_location);
      } else if (po.delivery_location) {
        setCompany(po.delivery_location);
      } else if (allCompanyOptions.length > 0) {
        setCompany(allCompanyOptions[0]);
      }

      // Pre-fill item with received material data, GST-inclusive unit rate & Return Value
      if (po.item_name || po.item_code) {
        const baseRate = Number(po.unit_rate) || 0;
        const rawGst = String(po.gst_percent || po.gst || 0).replace("%", "").trim();
        const gstPct = parseFloat(rawGst) || 0;
        const rateInclGst = gstPct > 0 ? Number((baseRate * (1 + gstPct / 100)).toFixed(2)) : baseRate;
        const pQty = Number(po.receivedQty ?? po.quantity) || 0;
        const dQty = Number(po.rejectedQty) > 0 ? Number(po.rejectedQty) : "";
        const finalRate = rateInclGst > 0 ? rateInclGst : (baseRate || "");
        const retVal = dQty && finalRate ? Number((Number(dQty) * Number(finalRate)).toFixed(2)) : 0;

        setItems([
          {
            indentNumber: po.indent_number || "",
            itemCode: po.item_code || "ITM-001",
            itemName: po.item_name || "Material Item",
            unit: "KG",
            purchaseQty: pQty,
            damageQty: dQty,
            unitRate: finalRate,
            returnValue: retVal,
            damageReason: "",
            damageImageFile: null,
            damageImageUrl: "",
            damageImageName: ""
          }
        ]);
      }
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        indentNumber: "",
        itemCode: `ITM-${prev.length + 1}`,
        itemName: "",
        unit: "KG",
        purchaseQty: "",
        damageQty: "",
        unitRate: "",
        returnValue: 0,
        damageReason: "",
        damageImageFile: null,
        damageImageUrl: "",
        damageImageName: ""
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === "damageQty" || field === "unitRate") {
        const dq = Number(field === "damageQty" ? value : item.damageQty) || 0;
        const ur = Number(field === "unitRate" ? value : item.unitRate) || 0;
        item.returnValue = Number((dq * ur).toFixed(2));
      }
      next[index] = item;
      return next;
    });
  };

  const handleFileChange = (index, file) => {
    if (!file) return;
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        damageImageFile: file,
        damageImageName: file.name
      };
      return next;
    });
  };

  const handleRemoveAttachment = (index) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        damageImageFile: null,
        damageImageUrl: "",
        damageImageName: ""
      };
      return next;
    });
  };

  const totalDamageValue = items.reduce(
    (sum, it) => sum + (Number(it.returnValue) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplier.trim()) {
      alert("Please enter or select a Supplier Name.");
      return;
    }
    if (!company) {
      alert("Please select a Company / Location.");
      return;
    }

    const hasInvalidItem = items.some(
      (it) => !it.itemName.trim() || Number(it.damageQty) <= 0
    );
    if (hasInvalidItem) {
      alert("Please fill all item descriptions and enter damage quantity > 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      let selectedComp = company;
      let selectedDiv = company;
      if (company.includes(" - ")) {
        const parts = company.split(" - ");
        selectedComp = parts[0].trim();
        selectedDiv = parts.slice(1).join(" - ").trim();
      }

      await createReturn({
        poId: selectedPoId || null,
        poNumber: poNumber.trim() || "PO-MANUAL",
        vendorName: supplier.trim(),
        company: selectedComp,
        division: selectedDiv,
        billNumber: billNumber.trim() || `BILL-${Math.floor(10000 + Math.random() * 90000)}`,
        billDate: billDate || todayISO(),
        billImageUrl: billImageUrl.trim() || null,
        items
      });
      onClose();
    } catch (err) {
      console.error("Create return failed:", err);
      alert("Failed to create return: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ActionModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Return Request"
      subtitle="Initiate reverse-logistics workflow for damaged / rejected material"
      maxWidth="max-w-6xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs font-semibold text-slate-500">
            Total Return Value:{" "}
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
              {inr(totalDamageValue)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  <span>Create Return Request</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* PO Quick Autofill */}
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl space-y-1.5">
          <label className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Link with an Existing Purchase Order / Received Item (Optional)</span>
          </label>
          <select
            value={selectedPoId}
            onChange={handleSelectPO}
            disabled={isPoLoading}
            className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {isPoLoading
                ? "-- Loading Purchase Orders & Items... --"
                : "-- Choose Purchase Order / Material Item to Autofill Details --"}
            </option>
            {poList.map((p) => (
              <option key={p.receiptId || p.id} value={p.id}>
                {p.po_number} &mdash; {p.vendor_name} ({p.item_name || "Item"})
                {p.indent_number ? ` [Indent: ${p.indent_number}]` : ""}
                {p.isReceived ? ` [GRN: ${p.grnNumber || "Issued"}, Rec'd: ${p.receivedQty}]` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Header Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Supplier / Vendor Name *
            </label>
            <input
              type="text"
              required
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Shivam Traders"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              PO Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-78001"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bill / Invoice Number
            </label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. BILL-44012"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Company *
            </label>
            <select
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Company --</option>
              {allCompanyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bill Date
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Damaged / Rejected Material Items ({items.length})
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1080px]">
                <thead className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[135px] w-[135px]">Indent No.</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Item Description *</th>
                    <th className="py-2.5 px-2 min-w-[70px] w-[75px] text-center">Unit</th>
                    <th className="py-2.5 px-2 min-w-[80px] w-[85px] text-right">Purch. Qty</th>
                    <th className="py-2.5 px-2 min-w-[85px] w-[90px] text-right">Damage Qty *</th>
                    <th className="py-2.5 px-2.5 min-w-[110px] w-[115px] text-right">
                      Rate (₹)
                      <span className="block text-[9px] font-normal text-slate-400 lowercase">incl. gst</span>
                    </th>
                    <th className="py-2.5 px-2.5 min-w-[115px] w-[125px] text-right">
                      Return Val (₹)
                      <span className="block text-[9px] font-normal text-slate-400 lowercase">incl. gst</span>
                    </th>
                    <th className="py-2.5 px-3 min-w-[190px]">Damage Reason</th>
                    <th className="py-2.5 px-2 min-w-[100px] w-[110px] text-center">Attachment</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-2.5">
                        <input
                          type="text"
                          value={it.indentNumber || ""}
                          onChange={(e) => handleItemChange(idx, "indentNumber", e.target.value)}
                          placeholder="e.g. IND-001"
                          className="w-full text-xs font-mono font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          required
                          list={`item-list-${idx}`}
                          value={it.itemName}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = poList.find((p) => p.item_name === val);
                            if (matched) {
                              const baseRate = Number(matched.unit_rate) || 0;
                              const rawGst = String(matched.gst_percent || matched.gst || 0).replace("%", "").trim();
                              const gstPct = parseFloat(rawGst) || 0;
                              const rateInclGst = gstPct > 0 ? Number((baseRate * (1 + gstPct / 100)).toFixed(2)) : baseRate;
                              const pQty = Number(matched.receivedQty ?? matched.quantity) || 0;
                              const dQty = Number(matched.rejectedQty) > 0 ? Number(matched.rejectedQty) : (it.damageQty || "");
                              const finalRate = rateInclGst > 0 ? rateInclGst : (baseRate || "");
                              const retVal = dQty && finalRate ? Number((Number(dQty) * Number(finalRate)).toFixed(2)) : 0;

                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  itemName: matched.item_name || val,
                                  indentNumber: matched.indent_number || next[idx].indentNumber,
                                  purchaseQty: pQty || next[idx].purchaseQty,
                                  damageQty: dQty,
                                  unitRate: finalRate,
                                  returnValue: retVal
                                };
                                return next;
                              });
                            } else {
                              handleItemChange(idx, "itemName", val);
                            }
                          }}
                          placeholder="e.g. MS Angle 50x50x6mm"
                          className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                        />
                        <datalist id={`item-list-${idx}`}>
                          {poList.map((p) => (
                            <option key={p.receiptId || p.id} value={p.item_name}>
                              {p.po_number} - {p.vendor_name} {p.indent_number ? `(Indent: ${p.indent_number})` : ""}
                            </option>
                          ))}
                        </datalist>
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={it.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="w-full text-xs text-center font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1.5 focus:outline-none text-slate-800 dark:text-slate-200"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min="0"
                          value={it.purchaseQty}
                          onChange={(e) => handleItemChange(idx, "purchaseQty", e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-mono text-right focus:outline-none text-slate-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          required
                          value={it.damageQty}
                          onChange={(e) => handleItemChange(idx, "damageQty", e.target.value)}
                          className="w-full text-xs bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-600/70 rounded-lg px-2 py-1.5 font-mono font-bold text-right text-amber-700 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                      <td className="py-2.5 px-2.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.unitRate}
                          onChange={(e) => handleItemChange(idx, "unitRate", e.target.value)}
                          placeholder="0.00"
                          className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-mono text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="py-2.5 px-2.5 font-mono font-bold text-right text-slate-900 dark:text-slate-100 pr-3 whitespace-nowrap text-xs">
                        {inr(it.returnValue)}
                      </td>
                      <td className="py-2.5 px-3">
                        <DamageReasonCell
                          value={it.damageReason}
                          onChange={(val) => handleItemChange(idx, "damageReason", val)}
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {it.damageImageFile || it.damageImageUrl ? (
                          <div className="flex items-center justify-center gap-1">
                            <span
                              title={it.damageImageName || "Attached file"}
                              className="inline-flex items-center gap-1 max-w-[85px] truncate px-1.5 py-1 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md"
                            >
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span className="truncate">{it.damageImageName || "File"}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              title="Remove attachment"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors">
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            <span>Attach</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => handleFileChange(idx, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </form>
    </ActionModalWrapper>
  );
}
