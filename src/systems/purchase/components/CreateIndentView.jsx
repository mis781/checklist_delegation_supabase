import React, { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  Package,
  Upload,
  X,
  FileText,
  Search,
  Check,
  ChevronsUpDown,
  Loader2,
  Calendar,
  AlertCircle,
  ClipboardList,
  History,
  Building,
  Edit2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { fetchSystemMasterLookups, fetchMasterAddresses } from "../services/purchaseMasterApi";
import { formatDateDash, toLocalIsoTimestamp } from "../utils/dateUtils";

export default function CreateIndentView() {
  const { showToast } = useMagicToast();
  const { indents, createIndent, refreshData } = usePurchaseWorkflow();

  // Current Logged In User
  const loggedInName = localStorage.getItem("user-name") || "Purchase Officer";

  // Data & Loading States
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");

  // Master Dropdown States
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [deliveryLocationOptions, setDeliveryLocationOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [divisionStockMap, setDivisionStockMap] = useState({});

  // Step 1 & 2 Main Requisition Form State
  const [formData, setFormData] = useState({
    createdBy: loggedInName,
    warehouseLocation: "",
    deliveryLocation: "",
    leadTime: "",
    items: [],
  });

  // Active Line Item Input State
  const [itemInput, setItemInput] = useState({
    category: "",
    itemName: "",
    quantity: "",
    uom: "NOS",
    itemCode: "",
    itemPriority: "medium",
    attachment: null,
  });

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    createdBy: "",
    warehouseLocation: "",
    deliveryLocation: "",
    leadTime: "",
    category: "",
    itemName: "",
    quantity: "",
    uom: "",
    itemCode: "",
    itemPriority: "medium",
    attachment: null,
    existingAttachmentUrl: "",
  });

  // Calculate Available Closing Stock for an item
  const getAvailableStock = (itemCode, itemName) => {
    if (formData.warehouseLocation) {
      if (itemCode && divisionStockMap[`${itemCode}_${formData.warehouseLocation}`] !== undefined) {
        return divisionStockMap[`${itemCode}_${formData.warehouseLocation}`];
      }
      if (itemName && divisionStockMap[`${itemName}_${formData.warehouseLocation}`] !== undefined) {
        return divisionStockMap[`${itemName}_${formData.warehouseLocation}`];
      }
    }
    if (itemCode && stockMap[itemCode] !== undefined) return stockMap[itemCode];
    if (itemName && stockMap[itemName] !== undefined) return stockMap[itemName];
    const found = itemsCatalog.find((i) => i.item_code === itemCode || i.item_name === itemName);
    return found?.closingStock || 0;
  };

  // Fetch Master Data & Requisitions
  const loadMasterData = async () => {
    try {
      const [lookups, addresses] = await Promise.all([
        fetchSystemMasterLookups(),
        fetchMasterAddresses().catch(() => []),
      ]);

      setWarehouseOptions(
        lookups.divisions && lookups.divisions.length > 0 ? lookups.divisions : lookups.locations || []
      );

      const addressNames = (addresses || []).map((a) => a.name).filter(Boolean);
      if (addressNames.length > 0) {
        setDeliveryLocationOptions(addressNames);
      } else if (lookups.deliveryLocations && lookups.deliveryLocations.length > 0) {
        setDeliveryLocationOptions(lookups.deliveryLocations);
      } else {
        setDeliveryLocationOptions([
          "M/S Nutech Pvt. Ltd.",
          "Nutech Plant 1 - Raipur Factory Gate 2",
          "Nutech Division A - Bhilai Unit",
          "Nutech Division B - Bilaspur Central Store",
        ]);
      }

      setCategoryOptions(lookups.categories || []);
      setUomOptions(lookups.uoms || []);
      setItemsCatalog(lookups.items || []);
      setStockMap(lookups.stockMap || {});
      setDivisionStockMap(lookups.divisionStockMap || {});
    } catch (err) {
      console.error("Error loading master dropdowns:", err);
    }
  };

  const loadIndents = async () => {
    setLoading(true);
    try {
      if (refreshData) await refreshData();
    } catch (err) {
      console.error("Error loading indents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    loadIndents();
  }, []);

  // Filter Catalog Items by Selected Category
  const itemsForSelectedCategory = useMemo(() => {
    if (!itemInput.category) return [];
    return itemsCatalog.filter(
      (item) => (item.category || "").toLowerCase() === itemInput.category.toLowerCase()
    );
  }, [itemInput.category, itemsCatalog]);

  // Handle Field Changes
  const handleItemFieldChange = (field, val) => {
    setItemInput((prev) => {
      if (field === "category") {
        return { ...prev, category: val, itemName: "", itemCode: "", quantity: "" };
      }
      if (field === "itemName") {
        const found = itemsCatalog.find(
          (i) => i.category.toLowerCase() === prev.category.toLowerCase() && i.item_name === val
        );
        const code = found?.item_code || prev.itemCode || `IC-${Math.floor(1000 + Math.random() * 9000)}`;
        const availStock = getAvailableStock(code, val);
        return {
          ...prev,
          itemName: val,
          itemCode: code,
          uom: found?.uom || prev.uom || "NOS",
          quantity: prev.quantity || (availStock > 0 ? String(availStock) : ""),
        };
      }
      return { ...prev, [field]: val };
    });
  };

  // Add Item to Requisition List
  const handleAddItemToList = (e) => {
    e.preventDefault();
    if (!itemInput.category || !itemInput.itemName || !itemInput.quantity) {
      if (showToast) showToast("Please fill in Category, Item Name and Quantity", "warning");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...itemInput }],
    }));

    // Reset input fields but preserve category for convenience
    setItemInput({
      category: itemInput.category,
      itemName: "",
      quantity: "",
      uom: "NOS",
      itemCode: "",
      itemPriority: "medium",
      attachment: null,
    });

    if (showToast) showToast("Item added to requisition list", "success");
  };

  // Remove Item from Requisition List
  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Upload or convert file
  const uploadAttachment = async (file) => {
    if (!file) return null;
    try {
      const ext = file.name.split(".").pop();
      const path = `indent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("indent-attachments")
        .upload(path, file);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("indent-attachments")
          .getPublicUrl(path);
        if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn("Storage upload fallback:", err);
    }
    return null;
  };

  // Submit Multi-Item Indent
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.warehouseLocation || !formData.leadTime || formData.items.length === 0) {
      if (showToast) showToast("Please select Division, Expected Date, and add at least one item", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find latest sequence number for IN-001 format
      const { data: seqData } = await supabase
        .from("indents")
        .select("indent_number")
        .order("created_at", { ascending: false })
        .limit(20);

      let maxNum = 0;
      (seqData || []).forEach((row) => {
        const m = String(row.indent_number).match(/IN-(\d+)/i);
        if (m && m[1]) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });

      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        let fileUrl = "";
        if (item.attachment) {
          fileUrl = await uploadAttachment(item.attachment);
        }

        await createIndent({
          createdBy: formData.createdBy || loggedInName,
          warehouseLocation: formData.warehouseLocation,
          deliveryLocation: formData.deliveryLocation || formData.warehouseLocation,
          leadTime: toLocalIsoTimestamp(formData.leadTime),
          category: item.category,
          itemName: item.itemName,
          itemCode: item.itemCode,
          quantity: item.quantity,
          uom: item.uom,
          itemPriority: item.itemPriority,
          attachmentUrl: fileUrl,
        });
      }

      if (showToast) showToast(`Successfully created ${formData.items.length} purchase indent(s)!`, "success");

      // Reset form
      setFormData({
        createdBy: loggedInName,
        warehouseLocation: "",
        deliveryLocation: "",
        leadTime: "",
        items: [],
      });
    } catch (err) {
      console.error("Indent creation error:", err);
      if (showToast) showToast(`Error creating indent: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditFormData({
      createdBy: rec.created_by || loggedInName,
      warehouseLocation: rec.warehouse_location || "",
      deliveryLocation: rec.delivery_location || "",
      leadTime: rec.lead_time || "",
      category: rec.category || "",
      itemName: rec.item_name || "",
      quantity: rec.quantity || "",
      uom: rec.uom || "NOS",
      itemCode: rec.item_code || "",
      itemPriority: rec.priority || "medium",
      attachment: null,
      existingAttachmentUrl: rec.attachment_url || "",
    });
    setEditOpen(true);
  };

  // Save Edit Modal
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    setIsEditSubmitting(true);
    try {
      let finalUrl = editFormData.existingAttachmentUrl;
      if (editFormData.attachment) {
        const up = await uploadAttachment(editFormData.attachment);
        if (up) finalUrl = up;
      }

      const { error: updateError } = await supabase
        .from("indents")
        .update({
          created_by: editFormData.createdBy,
          warehouse_location: editFormData.warehouseLocation,
          delivery_location: editFormData.deliveryLocation,
          lead_time: toLocalIsoTimestamp(editFormData.leadTime),
          category: editFormData.category,
          item_name: editFormData.itemName,
          quantity: Number(editFormData.quantity),
          uom: editFormData.uom,
          item_code: editFormData.itemCode,
          priority: editFormData.itemPriority,
          attachment_url: finalUrl,
        })
        .eq("id", editingRecord.id);

      if (updateError) throw updateError;

      if (showToast) showToast(`Indent ${editingRecord.indent_number} updated successfully!`, "success");
      setEditOpen(false);
      setEditingRecord(null);
      loadIndents();
    } catch (err) {
      console.error("Update error:", err);
      if (showToast) showToast(`Update failed: ${err.message}`, "error");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Filtered Indent Table Records
  const filteredIndents = useMemo(() => {
    return indents.filter((rec) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !s ||
        (rec.indent_number && rec.indent_number.toLowerCase().includes(s)) ||
        (rec.item_name && rec.item_name.toLowerCase().includes(s)) ||
        (rec.category && rec.category.toLowerCase().includes(s)) ||
        (rec.warehouse_location && rec.warehouse_location.toLowerCase().includes(s));

      const isHistory = String(rec.status).toLowerCase() === "completed" || String(rec.status).toLowerCase() === "approved";
      const matchesTab = activeTab === "pending" ? !isHistory : isHistory;

      return matchesSearch && matchesTab;
    });
  }, [indents, searchTerm, activeTab]);

  const pendingCount = indents.filter(
    (r) => String(r.status).toLowerCase() !== "completed" && String(r.status).toLowerCase() !== "approved"
  ).length;
  const historyCount = indents.length - pendingCount;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="p-3.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
          <PlusCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Stage 1 : Create Purchase Indent
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Initiate a new purchase requisition with multi-item specifications, inventory stock lookups, and delivery lead time.
          </p>
        </div>
      </div>

      {/* 2. Requisition Builder Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          {/* Step 1: General Specifications */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
                1
              </span>
              General Specifications & Item Details
            </h3>

            {/* General Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Created By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.createdBy}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Division / Plant <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.warehouseLocation}
                  onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select division / plant</option>
                  {warehouseOptions.map((wh) => (
                    <option key={wh} value={wh}>
                      {wh}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Delivery Location
                </label>
                <select
                  value={formData.deliveryLocation}
                  onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select delivery location</option>
                  {deliveryLocationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Expected Date of Raw Material Delivery <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.leadTime}
                  onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Divider for Item Input */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                Item Line Specifications
              </h4>
            </div>

            {/* Item Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={itemInput.category}
                  onChange={(e) => handleItemFieldChange("category", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="items-list"
                  placeholder={itemInput.category ? "Select or type item name..." : "Select category first"}
                  value={itemInput.itemName}
                  onChange={(e) => handleItemFieldChange("itemName", e.target.value)}
                  disabled={!itemInput.category}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
                <datalist id="items-list">
                  {itemsForSelectedCategory.map((item) => (
                    <option key={item.item_code} value={item.item_name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. IC-1001"
                  value={itemInput.itemCode}
                  onChange={(e) => handleItemFieldChange("itemCode", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  {itemInput.itemName && (
                    <button
                      type="button"
                      onClick={() => {
                        const avail = getAvailableStock(itemInput.itemCode, itemInput.itemName);
                        if (avail > 0) {
                          setItemInput((p) => ({ ...p, quantity: String(avail) }));
                        }
                      }}
                      title="Calculated closing stock from inventory_materials. Click to set quantity."
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                    >
                      <Package className="w-3 h-3" />
                      Avail: {getAvailableStock(itemInput.itemCode, itemInput.itemName)} {itemInput.uom}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={itemInput.quantity}
                  onChange={(e) => handleItemFieldChange("quantity", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  UOM <span className="text-red-500">*</span>
                </label>
                <select
                  value={itemInput.uom}
                  onChange={(e) => handleItemFieldChange("uom", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {uomOptions.map((uom) => (
                    <option key={uom} value={uom}>
                      {uom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Priority <span className="text-red-500">*</span>
                </label>
                <select
                  value={itemInput.itemPriority}
                  onChange={(e) => handleItemFieldChange("itemPriority", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Attachment (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="item-attachment-input"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setItemInput((prev) => ({ ...prev, attachment: file }));
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="item-attachment-input"
                    className="flex-1 flex items-center justify-between px-3 h-9 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs transition-colors"
                  >
                    <span className="text-slate-500 truncate max-w-[120px]">
                      {itemInput.attachment ? itemInput.attachment.name : "Choose file..."}
                    </span>
                    <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </label>
                  {itemInput.attachment && (
                    <button
                      type="button"
                      onClick={() => setItemInput((prev) => ({ ...prev, attachment: null }))}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddItemToList}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                + Add Item to List
              </button>
            </div>
          </div>

          {/* Step 2: Added Items Table */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
                2
              </span>
              Added Items List ({formData.items.length})
            </h3>

            {formData.items.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-xs text-slate-400">
                  No items added to the list yet. Fill in the section above and click "+ Add Item to List".
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                      <th className="p-3">Category</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-center">Priority</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-center">UOM</th>
                      <th className="p-3">Item Code</th>
                      <th className="p-3">Attachment</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{item.itemName}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.itemPriority === "high"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : item.itemPriority === "medium"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {item.itemPriority}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black">{item.quantity}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{item.uom}</td>
                        <td className="p-3 font-mono text-slate-500">{item.itemCode}</td>
                        <td className="p-3 text-slate-500">
                          {item.attachment ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-bold text-[11px]">
                              <FileText className="w-3.5 h-3.5" />
                              {item.attachment.name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Step 3: Create Indent Submit Action */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              disabled={
                !formData.warehouseLocation ||
                !formData.leadTime ||
                formData.items.length === 0 ||
                isSubmitting
              }
              onClick={handleSubmit}
              className="w-full sm:w-80 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Indent...</span>
                </>
              ) : (
                <span>
                  Create Indent ({formData.items.length} item{formData.items.length !== 1 ? "s" : ""})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Requisition Registers & Audit Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          {/* Dual Tabs: Pending vs History */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Pending Indents ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              History & Completed ({historyCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search indents, items, division..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 w-16 text-center">Action</th>
                <th className="p-3">Indent #</th>
                <th className="p-3">Division</th>
                <th className="p-3">Category</th>
                <th className="p-3">Material Name</th>
                <th className="p-3 text-center">Quantity</th>
                <th className="p-3">Expected Date</th>
                <th className="p-3 text-center">Priority</th>
                <th className="p-3 text-center">Attachment</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading requisitions...
                  </td>
                </tr>
              ) : filteredIndents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No {activeTab === "pending" ? "pending" : "completed"} indents found.
                  </td>
                </tr>
              ) : (
                filteredIndents.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.indent_number}
                    </td>
                    <td className="p-3 font-medium text-slate-600 dark:text-slate-300">
                      {row.warehouse_location}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.category}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {row.item_name}
                    </td>
                    <td className="p-3 text-center font-black">
                      {row.quantity} {row.uom}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {formatDateDash(row.lead_time || row.required_date || row.planned_date)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          row.priority === "high"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : row.priority === "medium"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {row.priority || "Medium"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {row.attachment_url ? (
                        <a
                          href={row.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                        {row.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Edit Record Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Edit Indent Record
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {editingRecord?.indent_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Created By</label>
                  <input
                    type="text"
                    value={editFormData.createdBy}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Division</label>
                  <select
                    value={editFormData.warehouseLocation}
                    onChange={(e) => setEditFormData({ ...editFormData, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    {warehouseOptions.map((wh) => (
                      <option key={wh} value={wh}>
                        {wh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Item Name</label>
                  <input
                    type="text"
                    value={editFormData.itemName}
                    onChange={(e) => setEditFormData({ ...editFormData, itemName: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Quantity</label>
                  <input
                    type="number"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">UOM</label>
                  <select
                    value={editFormData.uom}
                    onChange={(e) => setEditFormData({ ...editFormData, uom: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    {uomOptions.map((uom) => (
                      <option key={uom} value={uom}>
                        {uom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Priority</label>
                  <select
                    value={editFormData.itemPriority}
                    onChange={(e) => setEditFormData({ ...editFormData, itemPriority: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Expected Delivery Date</label>
                <input
                  type="date"
                  value={editFormData.leadTime}
                  onChange={(e) => setEditFormData({ ...editFormData, leadTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isEditSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
