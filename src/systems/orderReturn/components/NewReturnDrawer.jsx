import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  Building,
  Truck,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";
import {
  MASTERS,
  TRANSPORT_TYPES,
  TT_HINT,
  REASONS,
  RETURN_DAYS,
  cust,
  prod,
  inv,
  invItem,
  money,
  qty,
  qf,
  round,
  num,
  fdate,
  daysBetween,
  committedQty,
  createNewReturnDraft,
  initials,
  today
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";

export default function NewReturnDrawer({ open, existingReturn, onClose }) {
  const { returns, submitNewReturn, saveDraft } = useOrderReturn();

  const [draft, setDraft] = useState(createNewReturnDraft());
  const [openItems, setOpenItems] = useState(new Set());
  const [invoiceFilterQuery, setInvoiceFilterQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset when opening
  useEffect(() => {
    if (open) {
      if (existingReturn) {
        const d = JSON.parse(JSON.stringify(existingReturn));
        setDraft(d);
        const keys = new Set((d.items || []).map((i) => i.key || `${i.invoiceNo}|${i.productId}`));
        setOpenItems(keys);
      } else {
        const fresh = createNewReturnDraft();
        setDraft(fresh);
        setOpenItems(new Set());
      }
      setInvoiceFilterQuery("");
    }
  }, [open, existingReturn]);

  const selectedCustomer = useMemo(() => {
    return cust(draft.customerId || draft.customer_id);
  }, [draft.customerId, draft.customer_id]);

  // Available invoice rows for the selected customer
  const availableInvoiceItems = useMemo(() => {
    if (!selectedCustomer.id) return [];
    return MASTERS.invoices
      .filter((i) => i.customerId === selectedCustomer.id)
      .flatMap((i) => i.items.map((it) => ({ invoice: i, item: it })));
  }, [selectedCustomer.id]);

  // Filtered by search input
  const filteredInvoiceItems = useMemo(() => {
    const q = invoiceFilterQuery.trim().toLowerCase();
    if (!q) return availableInvoiceItems;
    return availableInvoiceItems.filter(({ invoice, item }) => {
      const p = prod(item.productId);
      return (
        invoice.no.toLowerCase().includes(q) ||
        (item.dispatchNo || "").toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [availableInvoiceItems, invoiceFilterQuery]);

  const totalReturnValue = useMemo(() => {
    return (draft.items || []).reduce((acc, i) => {
      const it = invItem(i.invoiceNo, i.productId);
      return acc + (i.reqQty || 0) * (it.price || 0);
    }, 0);
  }, [draft.items]);

  const handleSelectCustomer = (e) => {
    const val = e.target.value;
    const matched = MASTERS.customers.find(
      (c) => c.id === val || val.includes(`(${c.code})`) || c.name.toLowerCase() === val.toLowerCase()
    );
    if (matched) {
      setDraft((prev) => ({
        ...prev,
        customerId: matched.id,
        customer_id: matched.id,
        customer_name: matched.name,
        customer_code: matched.code,
        customer_address: matched.address,
        customer_phone: matched.phone,
        customer_gstin: matched.gstin,
        items: [] // reset items on customer switch
      }));
      setOpenItems(new Set());
    }
  };

  const toggleProductItem = (key, invoiceNo, productId, dispatchNo, invQty, invDate) => {
    const exists = draft.items.find((i) => (i.key || `${i.invoiceNo}|${i.productId}`) === key);
    if (!exists) {
      // Add product
      const it = invItem(invoiceNo, productId);
      const pr = prod(productId);
      const newItem = {
        key,
        item_key: key,
        invoiceNo,
        invoice_no: invoiceNo,
        invoiceDate: invDate || inv(invoiceNo).date,
        invoice_date: invDate || inv(invoiceNo).date,
        dispatchNo,
        dispatch_no: dispatchNo,
        productId,
        product_id: productId,
        product_name: pr.name,
        category: pr.category,
        sub_category: pr.sub,
        uom: pr.uom,
        price: it.price || pr.price,
        invQty: invQty || it.qty,
        inv_qty: invQty || it.qty,
        reqQty: 0,
        req_qty: 0,
        reason: draft.reason || "",
        note: "",
        attachments: []
      };

      setDraft((prev) => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
      setOpenItems((prev) => new Set([...prev, key]));
    } else {
      // Toggle open state
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }
  };

  const handleUpdateItemField = (key, field, value) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if ((it.key || `${it.invoiceNo}|${it.productId}`) === key) {
          return { ...it, [field]: value };
        }
        return it;
      })
    }));
  };

  const handleRemoveItem = (key) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((it) => (it.key || `${it.invoiceNo}|${it.productId}`) !== key)
    }));
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleFileUpload = (key, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 2MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const newAtt = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result
        };
        setDraft((prev) => ({
          ...prev,
          items: prev.items.map((it) => {
            if ((it.key || `${it.invoiceNo}|${it.productId}`) === key) {
              return {
                ...it,
                attachments: [...(it.attachments || []), newAtt]
              };
            }
            return it;
          })
        }));
        toast.success(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSaveAsDraft = async () => {
    if (!draft.customerId && !draft.customer_id) {
      toast.error("Please select a customer before saving a draft");
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await saveDraft(draft);
      if (success) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!draft.customerId && !draft.customer_id) {
      toast.error("Please select a customer");
      return;
    }
    if (!draft.items.length) {
      toast.error("Please add at least one product to return");
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await submitNewReturn(draft);
      if (success) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Stage 01: Return Request
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {draft.no ? `Draft ${draft.no}` : "New Return Request"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: General Request Metadata */}
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              General Request Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Request Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={draft.date || today()}
                  max={today()}
                  onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={draft.customerId || draft.customer_id || ""}
                  onChange={handleSelectCustomer}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select customer...</option>
                  {MASTERS.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Transport Terms
                </label>
                <select
                  value={draft.transportType || "Ex-Factory"}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      transportType: e.target.value,
                      transport_type: e.target.value
                    }))
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {TRANSPORT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {TT_HINT[draft.transportType] || ""}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Overall Return Reason
                </label>
                <select
                  value={draft.reason || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select reason...</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Details Pill Card */}
            {selectedCustomer.id && (
              <div className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{selectedCustomer.name}</span>
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                    {selectedCustomer.code}
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">{selectedCustomer.address}</div>
                <div className="flex gap-4 text-slate-600 dark:text-slate-300 pt-1">
                  <span>
                    GSTIN: <span className="font-mono">{selectedCustomer.gstin}</span>
                  </span>
                  <span>Phone: {selectedCustomer.phone}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                General Remarks / Instructions
              </label>
              <textarea
                rows={2}
                value={draft.remarks || ""}
                onChange={(e) => setDraft((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Optional internal remarks or context..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 2: Product Line Items Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Select Invoiced Items to Return
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click on an invoiced line to expand and enter return quantity, reason & photos.
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
                {draft.items.length} added
              </span>
            </div>

            {!selectedCustomer.id ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                Select a customer first to load their sales invoices and products.
              </div>
            ) : availableInvoiceItems.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                No past invoices found for this customer in ERP records.
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Search filter for invoices */}
                <input
                  type="text"
                  value={invoiceFilterQuery}
                  onChange={(e) => setInvoiceFilterQuery(e.target.value)}
                  placeholder="Filter products by invoice no, dispatch or name..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                <div className="space-y-2.5">
                  {filteredInvoiceItems.map(({ invoice, item }) => {
                    const key = `${invoice.no}|${item.productId}`;
                    const pr = prod(item.productId);
                    const alreadyReturned = round(committedQty(returns, invoice.no, item.productId, draft.id));
                    const balance = round(item.qty - alreadyReturned);
                    const pickedItem = draft.items.find((i) => (i.key || `${i.invoiceNo}|${i.productId}`) === key);
                    const isOpen = openItems.has(key);
                    const daysAgo = daysBetween(invoice.date, draft.date);
                    const isExceededWindow = daysAgo > RETURN_DAYS;

                    return (
                      <div
                        key={key}
                        className={`border rounded-xl transition-all overflow-hidden ${
                          pickedItem
                            ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40"
                        }`}
                      >
                        {/* Summary Header Row */}
                        <div
                          onClick={() =>
                            toggleProductItem(
                              key,
                              invoice.no,
                              item.productId,
                              item.dispatchNo,
                              item.qty,
                              invoice.date
                            )
                          }
                          className="p-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 shrink-0">
                              {initials(pr.name)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {pr.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Inv: <span className="font-semibold">{invoice.no}</span> · {fdate(invoice.date)} · DSP: {item.dispatchNo}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs shrink-0">
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block">Balance</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {qty(balance, pr.uom)}
                              </span>
                            </div>

                            {pickedItem ? (
                              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white">
                                {pickedItem.reqQty ? qty(pickedItem.reqQty, pr.uom) : "Added"}
                              </span>
                            ) : balance <= 0 ? (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400">
                                Returned
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                                + Add
                              </span>
                            )}

                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Editing Body */}
                        {isOpen && pickedItem && (
                          <div className="p-4 border-t border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 space-y-3">
                            {isExceededWindow && (
                              <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                <span>
                                  Notice: This invoice is {daysAgo} days old, beyond the {RETURN_DAYS}-day return window. Approver will review this delay.
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Return Quantity ({pr.uom}) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min="0.001"
                                  max={balance}
                                  step="any"
                                  value={pickedItem.reqQty || ""}
                                  onChange={(e) =>
                                    handleUpdateItemField(key, "reqQty", round(num(e.target.value)))
                                  }
                                  placeholder={`Max ${balance}`}
                                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                                />
                              </div>

                              <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Item Return Reason <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  value={pickedItem.reason || ""}
                                  onChange={(e) => handleUpdateItemField(key, "reason", e.target.value)}
                                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">Choose reason...</option>
                                  {REASONS.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Defect Description / Item Note
                                </label>
                                <input
                                  type="text"
                                  value={pickedItem.note || ""}
                                  onChange={(e) => handleUpdateItemField(key, "note", e.target.value)}
                                  placeholder="Specific defect details or customer statement..."
                                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>

                            {/* Attachments for this item */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Defect Photos & Evidence
                                </span>
                                <label className="cursor-pointer text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                  <Upload className="w-3.5 h-3.5" /> Attach Photo
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileUpload(key, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {(pickedItem.attachments || []).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {pickedItem.attachments.map((att, aIdx) => (
                                    <div
                                      key={aIdx}
                                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                    >
                                      <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="truncate max-w-[120px]">{att.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400">No photos attached yet.</p>
                              )}
                            </div>

                            {/* Line Actions */}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(key)}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove Line
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenItems((prev) => {
                                    const next = new Set(prev);
                                    next.delete(key);
                                    return next;
                                  })
                                }
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Done Editing
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Return Value</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {money(totalReturnValue)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveAsDraft}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitForApproval}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              Submit for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
