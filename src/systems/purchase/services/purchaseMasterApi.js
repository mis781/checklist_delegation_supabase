import supabase from "../../../SupabaseClient";

/**
 * =====================================================================
 * MASTER VENDORS (Suppliers Directory)
 * =====================================================================
 */
export async function fetchMasterVendors() {
  try {
    const { data, error } = await supabase
      .from("master_vendors")
      .select("*");

    if (!error && data && data.length > 0) {
      const sorted = [...data].sort((a, b) =>
        String(a.vendor_name || a.name || "").localeCompare(String(b.vendor_name || b.name || ""))
      );
      return sorted.map((v) => ({
        id: v.id,
        name: v.vendor_name || v.name || "",
        vendor_name: v.vendor_name || v.name || "",
        contact_person: v.contact_person || "-",
        phone: v.phone || v.mobile || "-",
        email: v.email || "-",
        address: v.address || v.billing_address || "-",
        billing_address: v.billing_address || v.address || "-",
        gstin: v.gstin || v.gst || "-",
        gst: v.gstin || v.gst || "-",
        pan_number: v.pan_number || v.pan_no || v.pan || "-",
        pan: v.pan_number || v.pan_no || v.pan || "-",
        city: v.city || "-",
        is_active: v.is_active !== false,
      }));
    }
  } catch (err) {
    console.warn("fetchMasterVendors master_vendors warning:", err);
  }

  // Fallback to distinct supplier names from inventory_materials if master_vendors is empty
  try {
    const { data: matData } = await supabase
      .from("inventory_materials")
      .select("supplier_name, supplier_code")
      .not("supplier_name", "is", null);

    if (matData && matData.length > 0) {
      const distinctSuppliers = Array.from(
        new Set(matData.map((m) => m.supplier_name).filter(Boolean))
      );
      return distinctSuppliers.map((s, idx) => ({
        id: `mv-sup-${idx}`,
        name: s,
        vendor_name: s,
        contact_person: "-",
        phone: "-",
        email: "-",
        address: "-",
        billing_address: "-",
        gstin: "-",
        gst: "-",
        pan_number: "-",
        pan: "-",
        city: "-",
        is_active: true,
      }));
    }
  } catch (matErr) {
    console.warn("inventory_materials supplier fallback warning:", matErr);
  }

  return [];
}

export async function upsertMasterVendor(vendor) {
  const name = (vendor.vendor_name || vendor.name || "").trim();
  if (!name) throw new Error("Vendor name is required");

  const masterPayload = {
    vendor_name: name,
    contact_person: vendor.contact_person || "-",
    phone: vendor.phone || vendor.mobile || "-",
    email: vendor.email || "-",
    address: vendor.address || "-",
    billing_address: vendor.billing_address || vendor.address || "-",
    gstin: vendor.gstin || vendor.gst || "-",
    pan_number: vendor.pan_number || vendor.pan_no || vendor.pan || "-",
    is_active: vendor.is_active !== false,
  };
  if (vendor.id && !String(vendor.id).startsWith("v-") && !String(vendor.id).startsWith("mv-")) {
    masterPayload.id = vendor.id;
  }

  const { data, error } = await supabase
    .from("master_vendors")
    .upsert([masterPayload])
    .select();
  if (error) {
    console.error("upsertMasterVendor error:", error);
    throw error;
  }
  return data?.[0] || masterPayload;
}

export async function deleteMasterVendor(id) {
  const { error } = await supabase.from("master_vendors").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * MASTER TRANSPORTERS (Logistics Carriers)
 * =====================================================================
 */
export async function fetchMasterTransporters() {
  try {
    const { data, error } = await supabase
      .from("master_transporters")
      .select("*");

    if (!error && data && data.length > 0) {
      const sorted = [...data].sort((a, b) =>
        String(a.transporter_name || a.transport_name || a.name || "").localeCompare(
          String(b.transporter_name || b.transport_name || b.name || "")
        )
      );
      return sorted.map((t) => ({
        id: t.id,
        name: t.transporter_name || t.transport_name || t.name || "",
        transport_name: t.transporter_name || t.transport_name || t.name || "",
        transporter_name: t.transporter_name || t.transport_name || t.name || "",
        contact_person: t.contact_person || "-",
        phone: t.phone || t.mobile || "-",
        mobile: t.phone || t.mobile || "-",
        vehicle_type: t.vehicle_type || "truck",
        is_active: t.is_active !== false,
      }));
    }
  } catch (err) {
    console.warn("fetchMasterTransporters warning:", err);
  }
  return [];
}

export async function upsertMasterTransporter(transporter) {
  const name = (transporter.transporter_name || transporter.transport_name || transporter.name || "").trim();
  if (!name) throw new Error("Transporter name is required");

  const payload = {
    transporter_name: name,
    contact_person: transporter.contact_person || "-",
    phone: transporter.phone || transporter.mobile || "-",
    vehicle_type: transporter.vehicle_type || "truck",
    is_active: transporter.is_active !== false,
  };
  if (transporter.id && !String(transporter.id).startsWith("t-") && !String(transporter.id).startsWith("mt-")) {
    payload.id = transporter.id;
  }

  const { data, error } = await supabase
    .from("master_transporters")
    .upsert([payload])
    .select();
  if (error) {
    console.error("upsertMasterTransporter error:", error);
    throw error;
  }
  return data?.[0] || payload;
}

export async function deleteMasterTransporter(id) {
  const { error } = await supabase.from("master_transporters").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * MASTER PLANT ADDRESSES (Company Shipping / Billing Addresses)
 * =====================================================================
 */
export async function fetchMasterAddresses() {
  const { data, error } = await supabase
    .from("master_addresses")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertMasterAddress(address) {
  const { data, error } = await supabase
    .from("master_addresses")
    .upsert([address])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMasterAddress(id) {
  const { error } = await supabase.from("master_addresses").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * MASTER STAGE CHECKPOINTS (Process Check & Inward SOP Checkpoints)
 * =====================================================================
 */
export async function fetchMasterStageCheckpoints(stageName = null) {
  let query = supabase.from("master_stage_checkpoints").select("*").order("name", { ascending: true });
  if (stageName) query = query.eq("stage_name", stageName);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function upsertMasterStageCheckpoint(checkpoint) {
  const { data, error } = await supabase
    .from("master_stage_checkpoints")
    .upsert([checkpoint], { onConflict: "stage_name, name" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMasterStageCheckpoint(id) {
  const { error } = await supabase.from("master_stage_checkpoints").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * MASTER REJECT REASONS
 * =====================================================================
 */
export async function fetchMasterRejectReasons() {
  const { data, error } = await supabase
    .from("master_reject_reasons")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertMasterRejectReason(reason) {
  const { data, error } = await supabase
    .from("master_reject_reasons")
    .upsert([reason])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMasterRejectReason(id) {
  const { error } = await supabase.from("master_reject_reasons").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * MASTER TAT (Turn Around Time) SLA RULES & SYSTEMS
 * =====================================================================
 */
export async function fetchMasterTatRules() {
  const { data, error } = await supabase
    .from("master_tat_rules")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertMasterTatRule(rule) {
  const { data, error } = await supabase
    .from("master_tat_rules")
    .upsert([rule])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMasterTatRule(id) {
  const { error } = await supabase.from("master_tat_rules").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * DROPDOWN LOOKUP HELPERS (GST, Terms, Transport Types, Cancel Stages)
 * =====================================================================
 */
export async function fetchLookupTables() {
  try {
    const [gstRes, termsRes, transportRes, cancelRes] = await Promise.all([
      supabase.from("master_gst_rates").select("*").order("name", { ascending: true }),
      supabase.from("master_payment_terms").select("*").order("name", { ascending: true }),
      supabase.from("master_transport_types").select("*").order("name", { ascending: true }),
      supabase.from("master_cancel_stages").select("*").order("name", { ascending: true }),
    ]);

    return {
      gstRates: gstRes.data?.map((r) => r.name) || ["0%", "5%", "12%", "18%", "28%"],
      paymentTerms: termsRes.data?.map((r) => r.name) || ["100% Advance", "50% Advance, 50% on Dispatch", "Net 30 Days", "Net 45 Days", "Immediate on GRN"],
      transportTypes: transportRes.data?.map((r) => r.name) || ["F.O.R.", "Ex-Factory", "Ex-Factory + Transport"],
      cancelStages: cancelRes.data?.map((r) => r.name) || ["Create Indent", "Indent Approval", "Quotation", "Approved Vendor", "Make PO", "Payment", "Follow UP / Lifting", "Transporter Follow-Up", "Material Received", "Billing", "Purchase Return", "Order Cancel"],
    };
  } catch (err) {
    console.error("fetchLookupTables error:", err);
    return {
      gstRates: ["0%", "5%", "12%", "18%", "28%"],
      paymentTerms: ["100% Advance", "50% Advance, 50% on Dispatch", "Net 30 Days", "Net 45 Days", "Immediate on GRN"],
      transportTypes: ["F.O.R.", "Ex-Factory", "Ex-Factory + Transport"],
      cancelStages: ["Create Indent", "Indent Approval", "Quotation", "Approved Vendor", "Make PO", "Payment", "Follow UP / Lifting", "Transporter Follow-Up", "Material Received", "Billing", "Purchase Return", "Order Cancel"],
    };
  }
}

/**
 * =====================================================================
 * REUSED MASTER-SYSTEM LOOKUPS (Users, UOMs, Locations, Items with HSN)
 * =====================================================================
 */
export async function fetchMasterDivisions() {
  try {
    const { data, error } = await supabase
      .from("divisions")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) {
      console.warn("fetchMasterDivisions error:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("fetchMasterDivisions exception:", err);
    return [];
  }
}

export async function fetchMasterWarehouses() {
  try {
    const { data: divData, error: divError } = await supabase
      .from("divisions")
      .select("id, name")
      .order("name", { ascending: true });

    if (!divError && divData && divData.length > 0) {
      return divData.map((d) => d.name || d.division).filter(Boolean);
    }

    const { data, error } = await supabase
      .from("inventory_locations")
      .select("id, location, division")
      .order("location", { ascending: true });

    if (error) {
      console.warn("fetchMasterWarehouses error:", error);
      return [];
    }

    const locs = (data || []).map((l) => l.division || l.location).filter(Boolean);
    return Array.from(new Set(locs));
  } catch (err) {
    console.error("fetchMasterWarehouses exception:", err);
    return [];
  }
}

export async function fetchAllUsersForApproverSelection() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select('*')
      .order("user_name", { ascending: true });
    if (error) {
      console.warn("fetchAllUsersForApproverSelection error:", error);
      return [];
    }
    return (data || []).map((u) => {
      const contact = u.number || u.phone || u.mobile || u.contact || u.phone_number || u.mobile_number || u.contact_number || "";
      return {
        ...u,
        name: u.user_name || u.name,
        user_name: u.user_name || u.name,
        designation: u.Designation || u.designation || u.role,
        phone: contact,
        contact: contact,
        mobile: contact,
      };
    });
  } catch (err) {
    console.error("fetchAllUsersForApproverSelection exception:", err);
    return [];
  }
}

export async function fetchMasterApprovers() {
  try {
    const [approversRes, usersRes] = await Promise.allSettled([
      supabase
        .from("master_approvers")
        .select("id, user_id, approver_name, designation, department, is_active, created_at")
        .order("approver_name", { ascending: true }),
      supabase
        .from("users")
        .select("*"),
    ]);

    const approversData = approversRes.status === "fulfilled" && approversRes.value.data ? approversRes.value.data : [];
    const usersData = usersRes.status === "fulfilled" && usersRes.value.data ? usersRes.value.data : [];

    const userContactMap = new Map();
    usersData.forEach((u) => {
      const contact = u.number || u.phone || u.mobile || u.contact || u.phone_number || u.mobile_number || u.contact_number || "";
      if (u.id) userContactMap.set(String(u.id), contact);
      if (u.user_name) userContactMap.set(String(u.user_name).toLowerCase().trim(), contact);
      if (u.name) userContactMap.set(String(u.name).toLowerCase().trim(), contact);
    });

    return approversData.map((a) => {
      const contact =
        (a.user_id ? userContactMap.get(String(a.user_id)) : null) ||
        (a.approver_name ? userContactMap.get(String(a.approver_name).toLowerCase().trim()) : null) ||
        "";

      return {
        id: a.id,
        user_id: a.user_id,
        name: a.approver_name,
        username: a.approver_name,
        approver_name: a.approver_name,
        designation: a.designation,
        department: a.department,
        is_active: a.is_active,
        phone: contact,
        contact: contact,
        mobile: contact,
      };
    });
  } catch (err) {
    console.error("fetchMasterApprovers error:", err);
    return [];
  }
}

export async function addMasterApprover({ user_id, approver_name, designation, department }) {
  const numericUserId = user_id && !isNaN(user_id) ? Number(user_id) : null;
  const { data, error } = await supabase
    .from("master_approvers")
    .insert([
      {
        user_id: numericUserId,
        approver_name: approver_name,
        designation: designation || "Approver",
        department: department || "Management",
        is_active: true,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMasterApprover(id) {
  const { error } = await supabase.from("master_approvers").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function fetchSystemMasterLookups() {
  try {
    const [
      usersRes,
      unitsRes,
      locsRes,
      materialsRes,
      rawMatsRes,
      finishedGoodsRes,
      divisionsRes,
      txnsRes,
      addressesRes,
    ] = await Promise.allSettled([
      supabase.from("users").select('*'),
      supabase.from("inventory_units").select("id, unit"),
      supabase.from("inventory_locations").select("id, location, division"),
      supabase.from("inventory_materials").select("id, sku, name, category, unit, hsn_code, status, opening, division"),
      supabase.from("inventory_raw_materials").select("id, sku, name, division, hsn_code, status"),
      supabase.from("inventory_finished_goods").select("id, sku, name, category, division, hsn_code, status"),
      supabase.from("divisions").select("id, name").order("name", { ascending: true }),
      supabase.from("inventory_transactions").select("sku, type, qty, firm, name"),
      supabase.from("master_addresses").select("*").order("name", { ascending: true }),
    ]);

    const rawUsers = usersRes.status === "fulfilled" && usersRes.value.data ? usersRes.value.data : [];
    const allUsers = rawUsers.map((u) => {
      const contact = u.number || u.phone || u.mobile || u.contact || u.phone_number || u.mobile_number || u.contact_number || "";
      return {
        ...u,
        phone: contact,
        contact: contact,
        mobile: contact,
      };
    });
    const approvers = allUsers.filter(
      (u) =>
        u.role === "HOD" ||
        u.role === "admin" ||
        u.role === "ADMINISTRATOR" ||
        u.role === "ADMINISTTRATOR" ||
        u.role === "Approver" ||
        u.status === "Active"
    );
    const accountants = allUsers.filter(
      (u) =>
        u.department?.toLowerCase().includes("account") ||
        u.role === "ADMINISTRATOR" ||
        u.role === "ADMINISTTRATOR" ||
        u.role === "admin"
    );

    const materialsData = materialsRes.status === "fulfilled" && materialsRes.value.data ? materialsRes.value.data : [];
    const rawMatsData = rawMatsRes.status === "fulfilled" && rawMatsRes.value.data ? rawMatsRes.value.data : [];
    const finishedGoodsData = finishedGoodsRes.status === "fulfilled" && finishedGoodsRes.value.data ? finishedGoodsRes.value.data : [];
    const txnsData = txnsRes.status === "fulfilled" && txnsRes.value.data ? txnsRes.value.data : [];

    // Calculate closing stock per SKU and per SKU+Division
    const matClosing = {};
    const divisionClosing = {};

    materialsData.forEach((m) => {
      const opening = Number(m.opening) || 0;
      const sku = m.sku;
      const name = m.name;
      if (sku) matClosing[sku] = (matClosing[sku] || 0) + opening;
      if (name) matClosing[name] = (matClosing[name] || 0) + opening;
      if (m.division) {
        if (sku) divisionClosing[`${sku}_${m.division}`] = (divisionClosing[`${sku}_${m.division}`] || 0) + opening;
        if (name) divisionClosing[`${name}_${m.division}`] = (divisionClosing[`${name}_${m.division}`] || 0) + opening;
      }
    });

    txnsData.forEach((t) => {
      const qty = Number(t.qty) || 0;
      const tType = String(t.type || "").toUpperCase();
      const delta =
        tType === "IN" || tType === "INWARD" || tType === "ADJUST_PLUS" || tType === "PURCHASE"
          ? qty
          : tType === "OUT" || tType === "OUTWARD" || tType === "ADJUST_MINUS" || tType === "JOB CARD" || tType === "ISSUE"
          ? -qty
          : 0;

      const firm = t.firm;
      if (t.sku) {
        if (matClosing[t.sku] !== undefined) matClosing[t.sku] += delta;
        if (firm && divisionClosing[`${t.sku}_${firm}`] !== undefined) {
          divisionClosing[`${t.sku}_${firm}`] += delta;
        }
      }
      if (t.name) {
        if (matClosing[t.name] !== undefined) matClosing[t.name] += delta;
        if (firm && divisionClosing[`${t.name}_${firm}`] !== undefined) {
          divisionClosing[`${t.name}_${firm}`] += delta;
        }
      }
    });

    // Merge materials with raw materials & finished goods
    const itemMap = new Map();

    // 1. Raw Materials Catalog (primary for RM)
    rawMatsData.forEach((r) => {
      const key = (r.name || r.sku || "").trim();
      if (key) {
        const closingStock = matClosing[r.sku] ?? matClosing[r.name] ?? 0;
        itemMap.set(key.toLowerCase(), {
          item_code: r.sku || "",
          sku: r.sku || "",
          name: r.name,
          item_name: r.name,
          category: "Raw Material",
          uom: "PCS",
          hsn_code: r.hsn_code || r.hsn || "",
          hsnCode: r.hsn_code || r.hsn || "",
          opening: 0,
          closingStock: Math.max(0, closingStock),
          division: r.division || "",
          source_table: "inventory_raw_materials",
        });
        if (r.sku) {
          itemMap.set(r.sku.toLowerCase().trim(), itemMap.get(key.toLowerCase()));
        }
      }
    });

    // 2. Finished Goods Catalog (primary for FG)
    finishedGoodsData.forEach((fg) => {
      const key = (fg.name || fg.sku || "").trim();
      if (key) {
        const closingStock = matClosing[fg.sku] ?? matClosing[fg.name] ?? 0;
        itemMap.set(key.toLowerCase(), {
          item_code: fg.sku || "",
          sku: fg.sku || "",
          name: fg.name,
          item_name: fg.name,
          category: fg.category || "Finished Good",
          uom: "PCS",
          hsn_code: fg.hsn_code || fg.hsn || "",
          hsnCode: fg.hsn_code || fg.hsn || "",
          opening: 0,
          closingStock: Math.max(0, closingStock),
          division: fg.division || "",
          source_table: "inventory_finished_goods",
        });
        if (fg.sku) {
          itemMap.set(fg.sku.toLowerCase().trim(), itemMap.get(key.toLowerCase()));
        }
      }
    });

    // 3. General Materials Catalog
    materialsData.forEach((m) => {
      const key = (m.name || m.sku || "").trim();
      if (key) {
        const closingStock = matClosing[m.sku] ?? matClosing[m.name] ?? (Number(m.opening) || 0);
        const existing = itemMap.get(key.toLowerCase()) || (m.sku ? itemMap.get(m.sku.toLowerCase().trim()) : null);
        const hsn = existing?.hsn_code || m.hsn_code || m.hsn || "";
        const entry = {
          item_code: m.sku || existing?.item_code || "",
          sku: m.sku || existing?.sku || "",
          name: m.name,
          item_name: m.name,
          category: m.category || existing?.category || "",
          uom: m.unit || existing?.uom || "",
          hsn_code: hsn,
          hsnCode: hsn,
          opening: Number(m.opening) || 0,
          closingStock: Math.max(0, closingStock),
          division: m.division || existing?.division || "",
          source_table: existing?.source_table || "inventory_materials",
        };
        itemMap.set(key.toLowerCase(), entry);
        if (m.sku) itemMap.set(m.sku.toLowerCase().trim(), entry);
      }
    });

    const items = Array.from(new Set(itemMap.values()));
    const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

    const unitsData = unitsRes.status === "fulfilled" && unitsRes.value.data ? unitsRes.value.data : [];
    const locsData = locsRes.status === "fulfilled" && locsRes.value.data ? locsRes.value.data : [];
    const divisionsData = divisionsRes.status === "fulfilled" && divisionsRes.value.data ? divisionsRes.value.data : [];
    const addressesData = addressesRes.status === "fulfilled" && addressesRes.value.data ? addressesRes.value.data : [];

    const uoms = unitsData.map((u) => u.unit).filter(Boolean);
    const rawDivisions = divisionsData.map((d) => d.name || d.division).filter(Boolean);
    const companyAddressNames = addressesData.map((a) => a.name).filter(Boolean);
    const deliveryLocations = companyAddressNames;

    // Division options come directly from divisions table; fallback to location division strings
    const divisions =
      rawDivisions.length > 0
        ? rawDivisions
        : Array.from(new Set(locsData.map((l) => l.division || l.location).filter(Boolean)));

    return {
      allUsers,
      approvers: approvers.map((u) => ({
        id: u.id,
        name: u.user_name || u.name,
        username: u.user_name || u.name,
        phone: u.phone || u.contact || u.mobile || "",
        contact: u.contact || u.phone || u.mobile || "",
        mobile: u.mobile || u.phone || u.contact || "",
        designation: u.Designation || u.designation || u.role || "Approver",
      })),
      accountants,
      uoms,
      locations: divisions,
      divisions,
      deliveryLocations,
      addresses: addressesData,
      rawLocations: locsData,
      categories,
      items,
      rawMaterials: rawMatsData,
      finishedGoods: finishedGoodsData,
      materials: materialsData,
      stockMap: matClosing,
      divisionStockMap: divisionClosing,
    };
  } catch (err) {
    console.error("fetchSystemMasterLookups error:", err);
    return {
      allUsers: [],
      approvers: [],
      accountants: [],
      uoms: [],
      locations: [],
      divisions: [],
      deliveryLocations: [],
      categories: [],
      items: [],
      stockMap: {},
      divisionStockMap: {},
    };
  }
}

/**
 * =====================================================================
 * MASTER QUOTATION TERMS & CONDITIONS (Reusable RFQ Terms)
 * =====================================================================
 */
export async function fetchMasterQuotationTerms() {
  try {
    const { data, error } = await supabase
      .from("master_quotation_terms")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("fetchMasterQuotationTerms warning:", error);
      return [];
    }

    return (data || []).map((t) => ({
      id: t.id,
      name: t.term_text || t.name || "",
      term_text: t.term_text || t.name || "",
      is_active: t.is_active !== false,
      created_at: t.created_at,
    }));
  } catch (err) {
    console.error("fetchMasterQuotationTerms exception:", err);
    return [];
  }
}

export async function addMasterQuotationTerm(termText) {
  const text = (termText || "").trim();
  if (!text) throw new Error("Term text is required");

  // Strip leading number prefix like "1. " or "2. " if user added it manually
  const cleanedText = text.replace(/^\d+\.\s*/, "").trim();
  if (!cleanedText) throw new Error("Term text cannot be empty");

  try {
    const { data, error } = await supabase
      .from("master_quotation_terms")
      .upsert([{ term_text: cleanedText, is_active: true }], { onConflict: "term_text" })
      .select()
      .single();

    if (error) {
      console.error("addMasterQuotationTerm error:", error);
      throw error;
    }
    return {
      id: data.id,
      name: data.term_text || data.name || cleanedText,
      term_text: data.term_text || data.name || cleanedText,
      is_active: data.is_active !== false,
      created_at: data.created_at,
    };
  } catch (err) {
    console.warn("addMasterQuotationTerm fallback:", err);
    return {
      id: `mqt-${Date.now()}`,
      name: cleanedText,
      term_text: cleanedText,
      is_active: true,
      created_at: new Date().toISOString(),
    };
  }
}

export async function upsertMasterQuotationTerm(term) {
  const text = (term.term_text || term.name || "").trim();
  if (!text) throw new Error("Term text is required");

  const cleanedText = text.replace(/^\d+\.\s*/, "").trim();

  const payload = {
    term_text: cleanedText,
    is_active: term.is_active !== false,
  };

  if (term.id && !String(term.id).startsWith("mqt-")) {
    payload.id = term.id;
  }

  const { data, error } = await supabase
    .from("master_quotation_terms")
    .upsert([payload])
    .select()
    .single();

  if (error) {
    console.error("upsertMasterQuotationTerm error:", error);
    throw error;
  }

  return {
    id: data.id,
    name: data.term_text || data.name || cleanedText,
    term_text: data.term_text || data.name || cleanedText,
    is_active: data.is_active !== false,
    created_at: data.created_at,
  };
}

export async function deleteMasterQuotationTerm(id) {
  const { error } = await supabase
    .from("master_quotation_terms")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * MASTER TRANSPORT TYPES (Reusable Logistics Modes)
 * =====================================================================
 */
export async function fetchMasterTransportTypes() {
  try {
    const { data, error } = await supabase
      .from("master_transport_types")
      .select("id, name, is_active, created_at")
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((t) => ({
        id: t.id,
        name: t.name,
        value: t.name,
        label: t.name,
        is_active: t.is_active !== false,
        created_at: t.created_at,
      }));
    }
  } catch (err) {
    console.warn("fetchMasterTransportTypes error:", err);
  }
  return [];
}

export async function upsertMasterTransportType(typeObj) {
  const name = (typeObj.name || "").trim();
  if (!name) throw new Error("Transport type name is required");

  const payload = {
    name,
    is_active: typeObj.is_active !== false,
  };

  if (typeObj.id && !String(typeObj.id).startsWith("tt-")) {
    payload.id = typeObj.id;
  }

  const { data, error } = await supabase
    .from("master_transport_types")
    .upsert([payload], { onConflict: "name" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMasterTransportType(id) {
  const { error } = await supabase
    .from("master_transport_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

/**
 * =====================================================================
 * MASTER PO TERMS & CONDITIONS (In-Memory / On-the-fly Terms)
 * =====================================================================
 */
const DEFAULT_PO_TERMS = [];

export async function fetchMasterPoTerms() {
  // Purely in-memory empty list — filled on-the-fly by user
  return DEFAULT_PO_TERMS;
}

export async function addMasterPoTerm(termText) {
  const text = (termText || "").trim();
  const cleanedText = text.replace(/^\d+\.\s*/, "").trim();
  return {
    id: `mpt-${Date.now()}`,
    name: cleanedText,
    term_text: cleanedText,
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

export async function deleteMasterPoTerm() {
  return true;
}

/**
 * =====================================================================
 * MASTER GST RATES
 * =====================================================================
 */
const DEFAULT_GST_RATES = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

export async function fetchMasterGstRates() {
  try {
    const { data, error } = await supabase
      .from("master_gst_rates")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data
        .filter((r) => r.is_active !== false)
        .map((r) => {
          const rawNum = String(r.name).replace("%", "").trim();
          return {
            id: r.id,
            value: rawNum,
            label: r.name.includes("%") ? r.name : `${r.name}%`,
            name: r.name,
          };
        });
    }
  } catch (err) {
    console.warn("fetchMasterGstRates error:", err);
  }
  return DEFAULT_GST_RATES;
}

