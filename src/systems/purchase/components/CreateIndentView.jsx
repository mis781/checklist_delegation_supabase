import React, { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  Package,
  Upload,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import supabase from "../../../SupabaseClient";
import { useMagicToast } from "../../../context/MagicToastContext";
import { usePurchaseWorkflow } from "../context/PurchaseWorkflowContext";
import { fetchSystemMasterLookups, fetchMasterAddresses } from "../services/purchaseMasterApi";
import { formatDateDash, toLocalIsoTimestamp } from "../utils/dateUtils";

export default function CreateIndentView() {
  const { showToast } = useMagicToast();
  const { createIndent, refreshData } = usePurchaseWorkflow();

  // Current Logged In User
  const loggedInName = localStorage.getItem("user-name") || "Purchase Officer";

  // Data & Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Dropdown States
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [masterAddresses, setMasterAddresses] = useState([]);
  const [inventoryLocations, setInventoryLocations] = useState([]);
  const [materialTypeOptions, setMaterialTypeOptions] = useState([
    { type_code: "FG", type_name: "Finished Goods" },
    { type_code: "RM", type_name: "Raw Material" },
    { type_code: "SPARE", type_name: "Spare Parts" },
    { type_code: "WIP", type_name: "Work in Progress" },
    { type_code: "CONSUMABLE", type_name: "Consumables" },
  ]);
  const [rawCategories, setRawCategories] = useState([]);
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
    items: [],
  });

  // Active Line Item Input State
  const [itemInput, setItemInput] = useState({
    materialType: "",
    category: "",
    itemName: "",
    quantity: "",
    uom: "NOS",
    itemCode: "",
    itemPriority: "medium",
    leadTime: "",
    attachment: null,
  });

  // Dynamic Delivery Location Options strictly from master_addresses table by matching division prefix
  const availableDeliveryLocations = useMemo(() => {
    if (!formData.warehouseLocation) return [];

    const cleanStr = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const selDivClean = cleanStr(formData.warehouseLocation);

    // Extract prefix from master_addresses name (e.g. "NuTech Pipes - Main Gate" -> prefix "NuTech Pipes")
    const matched = (masterAddresses || [])
      .filter((a) => {
        if (!a || !a.name) return false;

        // Check explicit division property if present
        if (a.division && cleanStr(a.division) === selDivClean) {
          return true;
        }

        // Extract prefix before hyphen (-)
        const nameParts = a.name.split("-");
        const prefixClean = cleanStr(nameParts[0]);
        if (prefixClean && prefixClean === selDivClean) {
          return true;
        }

        // Check if name begins with selected division
        const rawNameClean = cleanStr(a.name);
        return rawNameClean.startsWith(selDivClean);
      })
      .map((a) => a.name)
      .filter(Boolean);

    return Array.from(new Set(matched));
  }, [formData.warehouseLocation, masterAddresses]);

  // Handle Division Change with Auto-Default Delivery Location
  const handleDivisionChange = (divName) => {
    setFormData((prev) => {
      let defaultLoc = "";
      if (divName) {
        const cleanStr = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
        const selDivClean = cleanStr(divName);
        const matchedAddr = (masterAddresses || []).find((a) => {
          if (!a || !a.name) return false;
          if (a.division && cleanStr(a.division) === selDivClean) return true;
          const nameParts = a.name.split("-");
          const prefixClean = cleanStr(nameParts[0]);
          if (prefixClean && prefixClean === selDivClean) return true;
          return cleanStr(a.name).startsWith(selDivClean);
        });
        if (matchedAddr) {
          defaultLoc = matchedAddr.name;
        }
      }
      return {
        ...prev,
        warehouseLocation: divName,
        deliveryLocation: defaultLoc,
      };
    });
  };

  // Calculate Available Closing Stock for an item (rounded to 2 decimals)
  const getAvailableStock = (itemCode, itemName) => {
    let raw = 0;
    if (formData.warehouseLocation) {
      if (itemCode && divisionStockMap[`${itemCode}_${formData.warehouseLocation}`] !== undefined) {
        raw = divisionStockMap[`${itemCode}_${formData.warehouseLocation}`];
      } else if (itemName && divisionStockMap[`${itemName}_${formData.warehouseLocation}`] !== undefined) {
        raw = divisionStockMap[`${itemName}_${formData.warehouseLocation}`];
      }
    } else {
      if (itemCode && stockMap[itemCode] !== undefined) raw = stockMap[itemCode];
      else if (itemName && stockMap[itemName] !== undefined) raw = stockMap[itemName];
      else {
        const found = itemsCatalog.find((i) => i.item_code === itemCode || i.item_name === itemName);
        raw = found?.closingStock || 0;
      }
    }
    return Number(Number(raw || 0).toFixed(2));
  };

  // Fetch Master Data & Requisitions
  const loadMasterData = async () => {
    try {
      const [lookups, addresses, divisionsRes, categoriesRes, materialTypesRes] = await Promise.all([
        fetchSystemMasterLookups(),
        fetchMasterAddresses().catch(() => []),
        supabase.from("divisions").select("id, name").order("name", { ascending: true }),
        supabase.from("inventory_categories").select("id, name, division, material_type").order("name", { ascending: true }),
        supabase.from("material_types").select("id, type_name, type_code").order("type_code", { ascending: true }),
      ]);

      const directDivisions = divisionsRes?.data?.map((d) => d.name).filter(Boolean) || [];
      const divisions =
        directDivisions.length > 0
          ? directDivisions
          : lookups.divisions && lookups.divisions.length > 0
          ? lookups.divisions
          : [];
      setWarehouseOptions(divisions);

      const allAddrs = addresses && addresses.length > 0 ? addresses : lookups.addresses || [];
      setMasterAddresses(allAddrs);
      setInventoryLocations(lookups.rawLocations || []);

      // Material Types
      const defaultTypes = [
        { type_code: "FG", type_name: "Finished Goods" },
        { type_code: "RM", type_name: "Raw Material" },
        { type_code: "SPARE", type_name: "Spare Parts" },
        { type_code: "WIP", type_name: "Work in Progress" },
        { type_code: "CONSUMABLE", type_name: "Consumables" },
      ];
      const dbTypes = materialTypesRes?.data?.filter((t) => t.type_code);
      setMaterialTypeOptions(dbTypes && dbTypes.length > 0 ? dbTypes : defaultTypes);

      const catsList = categoriesRes?.data || [];
      setRawCategories(catsList);

      const directCategories = catsList.map((c) => c.name).filter(Boolean);
      const categories =
        directCategories.length > 0
          ? Array.from(new Set(directCategories)).sort()
          : lookups.categories || [];
      setCategoryOptions(categories);

      setUomOptions(lookups.uoms || []);
      setItemsCatalog(lookups.items || []);
      setStockMap(lookups.stockMap || {});
      setDivisionStockMap(lookups.divisionStockMap || {});
    } catch (err) {
      console.error("Error loading master dropdowns:", err);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Filter Categories dynamically by Selected Material Type (strictly matching only)
  const availableCategories = useMemo(() => {
    if (!itemInput.materialType) return [];
    const selType = itemInput.materialType.trim().toUpperCase();

    // 1. Match from inventory_categories
    const matchingFromDb = (rawCategories || [])
      .filter((c) => (c.material_type || "").trim().toUpperCase() === selType)
      .map((c) => c.name)
      .filter(Boolean);

    // 2. Match from itemsCatalog if present
    const matchingFromCatalog = (itemsCatalog || [])
      .filter((item) => {
        const itemType = (item.material_type || item.materialType || "").trim().toUpperCase();
        return itemType === selType && item.category;
      })
      .map((i) => i.category);

    const combined = Array.from(new Set([...matchingFromDb, ...matchingFromCatalog])).sort();
    return combined;
  }, [itemInput.materialType, rawCategories, itemsCatalog]);

  // Filter Catalog Items by Selected Material Type & Selected Category
  const itemsForSelectedCategory = useMemo(() => {
    if (!itemInput.category) return [];
    const selCat = itemInput.category.toLowerCase().trim();
    const selType = (itemInput.materialType || "").toUpperCase().trim();

    const seen = new Set();
    const filtered = [];

    for (const item of itemsCatalog) {
      const catMatch = (item.category || "").toLowerCase().trim() === selCat;
      if (!catMatch) continue;
      if (selType && item.material_type) {
        if ((item.material_type || "").toUpperCase().trim() !== selType) continue;
      }
      const uniqueKey = `${item.item_code || item.sku || ""}_${item.item_name || item.name || ""}`;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        filtered.push(item);
      }
    }

    return filtered.sort((a, b) => {
      const labelA = `${a.item_code || a.sku || ""} - ${a.item_name || a.name || ""}`;
      const labelB = `${b.item_code || b.sku || ""} - ${b.item_name || b.name || ""}`;
      return labelA.localeCompare(labelB);
    });
  }, [itemInput.category, itemInput.materialType, itemsCatalog]);

  // Handle Field Changes with Cascading Resets & RM Auto-Fill
  const handleItemFieldChange = (field, val) => {
    setItemInput((prev) => {
      if (field === "materialType") {
        let autoCategory = "";
        const selType = (val || "").trim().toUpperCase();
        if (selType === "RM") {
          const foundRmCat = (rawCategories || []).find(
            (c) => (c.material_type || "").trim().toUpperCase() === "RM"
          );
          autoCategory = foundRmCat?.name || "Raw Material";
        }
        return {
          ...prev,
          materialType: val,
          category: autoCategory,
          itemName: "",
          itemCode: "",
          quantity: "",
        };
      }
      if (field === "category") {
        return {
          ...prev,
          category: val,
          itemName: "",
          itemCode: "",
          quantity: "",
        };
      }
      if (field === "itemName") {
        const found = itemsCatalog.find(
          (i) =>
            ((i.category || "").toLowerCase() === (prev.category || "").toLowerCase() || !prev.category) &&
            (i.item_code === val || i.sku === val || i.item_name === val || `${i.item_code || i.sku} - ${i.item_name || i.name}` === val)
        ) || itemsCatalog.find((i) => i.item_code === val || i.sku === val || i.item_name === val);

        const finalName = found?.item_name || found?.name || val;
        const code = found?.item_code || found?.sku || prev.itemCode || `IC-${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          ...prev,
          itemName: finalName,
          itemCode: code,
          uom: found?.uom || prev.uom || "NOS",
          quantity: prev.quantity || "",
        };
      }
      return { ...prev, [field]: val };
    });
  };

  // Add Item to Requisition List
  const handleAddItemToList = (e) => {
    e.preventDefault();
    if (!itemInput.materialType || !itemInput.category || !itemInput.itemName || !itemInput.quantity || !itemInput.leadTime) {
      if (showToast) showToast("Please fill in Material Type, Category, Item Name, Quantity, and Expected Delivery Date", "warning");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...itemInput }],
    }));

    // Reset input fields but preserve materialType & category for convenience
    setItemInput({
      materialType: itemInput.materialType,
      category: itemInput.category,
      itemName: "",
      quantity: "",
      uom: "NOS",
      itemCode: "",
      itemPriority: "medium",
      leadTime: "",
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
    if (!formData.warehouseLocation || formData.items.length === 0) {
      if (showToast) showToast("Please select Division and add at least one item", "warning");
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
          leadTime: toLocalIsoTimestamp(item.leadTime),
          materialType: item.materialType || "RM",
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
        items: [],
      });
      if (refreshData) refreshData();
    } catch (err) {
      console.error("Indent creation error:", err);
      if (showToast) showToast(`Error creating indent: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  onChange={(e) => handleDivisionChange(e.target.value)}
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Delivery Location
                </label>
                <select
                  value={formData.deliveryLocation}
                  disabled={!formData.warehouseLocation || availableDeliveryLocations.length === 0}
                  onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/40 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.warehouseLocation
                      ? "Select division first"
                      : availableDeliveryLocations.length === 0
                      ? "No delivery location for this division"
                      : "Select delivery location"}
                  </option>
                  {availableDeliveryLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Divider for Item Input */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                Item Line Specifications
              </h4>
            </div>

            {/* Item Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Material Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Material Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={itemInput.materialType}
                  onChange={(e) => handleItemFieldChange("materialType", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select material type</option>
                  {materialTypeOptions.map((mt) => (
                    <option key={mt.type_code} value={mt.type_code}>
                      {mt.type_code} — {mt.type_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={itemInput.category}
                  disabled={!itemInput.materialType || availableCategories.length === 0}
                  onChange={(e) => handleItemFieldChange("category", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/40 disabled:text-slate-400"
                >
                  <option value="">
                    {!itemInput.materialType
                      ? "Select material type first"
                      : availableCategories.length === 0
                      ? "No categories for this material type"
                      : "Select category"}
                  </option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Item Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={
                    itemsForSelectedCategory.some(
                      (i) =>
                        (i.item_code && i.item_code === itemInput.itemCode) ||
                        (i.sku && i.sku === itemInput.itemCode) ||
                        i.item_name === itemInput.itemName
                    )
                      ? itemInput.itemCode || itemInput.itemName
                      : ""
                  }
                  onChange={(e) => handleItemFieldChange("itemName", e.target.value)}
                  disabled={!itemInput.category || itemsForSelectedCategory.length === 0}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/40 disabled:text-slate-400 cursor-pointer"
                >
                  <option value="">
                    {!itemInput.materialType
                      ? "Select material type first"
                      : !itemInput.category
                      ? "Select category first"
                      : itemsForSelectedCategory.length === 0
                      ? "No items found in this category"
                      : "Select item name..."}
                  </option>
                  {itemsForSelectedCategory.map((item) => {
                    const name = item.item_name || item.name || "";
                    const sku = item.item_code || item.sku || "";
                    const displayLabel = sku
                      ? name && sku.toLowerCase().trim() !== name.toLowerCase().trim()
                        ? `${sku} - ${name}`
                        : sku
                      : name;
                    const optionVal = sku || name;
                    return (
                      <option
                        key={sku ? `sku-${sku}-${name}` : `name-${name}`}
                        value={optionVal}
                      >
                        {displayLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 4. Item Code */}
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
                          setItemInput((p) => ({ ...p, quantity: String(Number(avail).toFixed(2)) }));
                        }
                      }}
                      title="Calculated closing stock from inventory_materials. Click to set quantity."
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                    >
                      <Package className="w-3 h-3" />
                      Avail: {Number(getAvailableStock(itemInput.itemCode, itemInput.itemName)).toFixed(2)} {itemInput.uom}
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
                  Expected Date of Raw Material Delivery <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={itemInput.leadTime}
                  onChange={(e) => handleItemFieldChange("leadTime", e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <th className="p-3">Type</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-center">Priority</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-center">UOM</th>
                      <th className="p-3">Item Code</th>
                      <th className="p-3">Expected Delivery</th>
                      <th className="p-3">Attachment</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            {item.materialType || "RM"}
                          </span>
                        </td>
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
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                          {formatDateDash(item.leadTime)}
                        </td>
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
    </div>
  );
}
