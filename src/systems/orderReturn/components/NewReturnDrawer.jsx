import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Trash2,
  AlertCircle,
  Upload,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Package
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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
      setShowDiscardConfirm(false);
    }
  }, [open, existingReturn]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          setShowDiscardConfirm(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, showDiscardConfirm]);

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
    for (const item of draft.items) {
      const pr = prod(item.productId);
      if (!(num(item.reqQty) > 0)) {
        toast.error(`Please enter return quantity for ${pr.name}`);
        return;
      }
      if (!item.reason) {
        toast.error(`Please select a return reason for ${pr.name}`);
        return;
      }
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
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-in fade-in"
        onClick={() => setShowDiscardConfirm(true)}
      >
        <div
          className="w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col rounded-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  Stage 1: Return Request
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {draft.no ? `Draft ${draft.no}` : "New return request"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-3.5 h-3.5 rounded-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 inline-block shadow-2xs"></span>
                Editable
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-3.5 h-3.5 rounded-xs border border-dashed border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 inline-block"></span>
                Auto-filled from masters
              </span>
            </div>

            {/* Section 1: Request details */}
            <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Request details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Return request no. */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Return request no.
                  </label>
                  <div className="w-full text-xs px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-mono">
                    {draft.no || "Generated when you save"}
                  </div>
                </div>

                {/* Request date * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Request date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={draft.date || today()}
                    max={today()}
                    onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Customer * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={draft.customerId || draft.customer_id || ""}
                    onChange={handleSelectCustomer}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Select customer...</option>
                    {MASTERS.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer code
                  </label>
                  <div className="w-full text-xs px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-mono">
                    {selectedCustomer.code || "—"}
                  </div>
                </div>

                {/* Transport type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Transport type
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
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

                {/* General remarks */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    General remarks
                  </label>
                  <textarea
                    rows={2}
                    value={draft.remarks || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, remarks: e.target.value }))}
                    placeholder="General remarks or notes..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Customer Details Row (Address, Contact, GSTIN) */}
              {selectedCustomer.id && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Address</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">
                      {selectedCustomer.address}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Contact</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">GSTIN</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block">
                      {selectedCustomer.gstin}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Products to return */}
            <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-3 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Products to return
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap a product to add it, then fill its quantity, reason and photos.
                </p>
              </div>

              {!selectedCustomer.id ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  Select a customer to see their invoiced products.
                </div>
              ) : availableInvoiceItems.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  This customer has no invoices on record.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Search filter for invoices */}
                  <input
                    type="text"
                    value={invoiceFilterQuery}
                    onChange={(e) => setInvoiceFilterQuery(e.target.value)}
                    placeholder="Filter by invoice, dispatch or product"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {initials(pr.name)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {pr.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {invoice.no}, {fdate(invoice.date)}, {item.dispatchNo}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs shrink-0">
                              <div className="flex items-center gap-3 text-right">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Invoiced</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{qf.format(item.qty)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Returned</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{qf.format(alreadyReturned)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Balance</span>
                                  <span className="font-bold text-slate-900 dark:text-slate-100">
                                    {qf.format(balance)} {pr.uom}
                                  </span>
                                </div>
                              </div>

                              {pickedItem ? (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs">
                                  {pickedItem.reqQty ? `${pickedItem.reqQty} ${pr.uom}` : "Added"}
                                </span>
                              ) : balance <= 0 ? (
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400">
                                  Fully returned
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
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
                                    This invoice is {daysAgo} days old, beyond the {RETURN_DAYS}-day return window. The approver will see this.
                                  </span>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Return qty ({pr.uom}) <span className="text-rose-500">*</span>
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
                                    placeholder={`Up to ${qf.format(balance)} ${pr.uom}`}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Up to {qf.format(balance)} {pr.uom}
                                  </p>
                                </div>

                                <div>
                                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Return reason <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    value={pickedItem.reason || ""}
                                    onChange={(e) => handleUpdateItemField(key, "reason", e.target.value)}
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="">Select reason...</option>
                                    {REASONS.map((r) => (
                                      <option key={r} value={r}>
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Note
                                  </label>
                                  <input
                                    type="text"
                                    value={pickedItem.note || ""}
                                    onChange={(e) => handleUpdateItemField(key, "note", e.target.value)}
                                    placeholder="What’s wrong with it?"
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>

                              {/* Attachments for this item */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Photos and documents for this product
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
                                  onClick={() =>
                                    setOpenItems((prev) => {
                                      const next = new Set(prev);
                                      next.delete(key);
                                      return next;
                                    })
                                  }
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                >
                                  Done
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(key)}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove product
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
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {draft.items.length
                  ? `${draft.items.length} product${draft.items.length > 1 ? "s" : ""}, ${money(totalReturnValue)}`
                  : "No products added yet"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveAsDraft}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitForApproval}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
              >
                Submit for approval
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-6 mx-4 max-w-sm w-full space-y-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Discard this request?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The products and details you entered haven’t been saved.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
