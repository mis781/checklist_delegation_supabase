import supabase from "../../../SupabaseClient.js";

/**
 * =====================================================================
 * O2D (ORDER-TO-DELIVERY) DATABASE API SERVICE
 * Connects all 11 stages and masters to live Supabase tables:
 * - o2d_orders & o2d_order_items
 * - o2d_delivery_checks
 * - o2d_dispatches & o2d_dispatch_sources
 * - o2d_logistics
 * - o2d_callans & o2d_callan_items
 * - o2d_invoices
 * - o2d_deliveries
 * - o2d_payments
 * - o2d_parties & o2d_persons
 * Live Master Lookups: divisions, inventory_master_material,
 *                     inventory_units, master_transport_types,
 *                     master_transporters, users
 * =====================================================================
 */

// Helper to safely get numeric or 0
const toNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

// =====================================================================
// 1. MASTER DATA LOOKUPS
// =====================================================================

/**
 * Fetch Divisions from live `public.divisions`
 */
export async function fetchLiveDivisions() {
  try {
    const { data, error } = await supabase
      .from("divisions")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((d) => ({
      id: d.id,
      name: d.name,
      division: d.name
    }));
  } catch (err) {
    console.error("[o2dApi] fetchLiveDivisions error:", err);
    return [];
  }
}

/**
 * Fetch Catalog Materials from live `public.inventory_master_material`
 */
export async function fetchLiveMasterItems() {
  try {
    const { data, error } = await supabase
      .from("inventory_master_material")
      .select("id, name, category, sub_category, material_type, sku, hsn_code")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      productName: m.name,
      category: m.category || m.material_type || "General",
      subCategory: m.sub_category || "",
      uom: "NOS",
      sku: m.sku || "",
      hsnCode: m.hsn_code || "",
      priceRate: 0,
      gstPercent: 18
    }));
  } catch (err) {
    console.error("[o2dApi] fetchLiveMasterItems error:", err);
    return [];
  }
}

/**
 * Fetch Units of Measure from live `public.inventory_units`
 */
export async function fetchLiveUOMs() {
  try {
    const { data, error } = await supabase
      .from("inventory_units")
      .select("id, unit")
      .order("unit", { ascending: true });
    if (error) throw error;
    return (data || []).map((u) => ({
      id: u.id,
      name: u.unit,
      uom: u.unit
    }));
  } catch (err) {
    console.error("[o2dApi] fetchLiveUOMs error:", err);
    return [];
  }
}

/**
 * Fetch Transporting Types from live `public.master_transport_types`
 */
export async function fetchLiveTransportingTypes() {
  try {
    const { data, error } = await supabase
      .from("master_transport_types")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.name
    }));
  } catch (err) {
    console.error("[o2dApi] fetchLiveTransportingTypes error:", err);
    return [];
  }
}

/**
 * Fetch Transporters from live `public.master_transporters`
 */
export async function fetchLiveTransporters() {
  try {
    const { data, error } = await supabase
      .from("master_transporters")
      .select("id, transporter_name, contact_person, phone, vehicle_type, is_active")
      .order("transporter_name", { ascending: true });
    if (error) throw error;
    return (data || []).map((t, idx) => ({
      id: t.id,
      taNo: `TA-${String(idx + 1).padStart(3, "0")}`,
      name: t.transporter_name,
      contactPerson: t.contact_person || "",
      driverName: t.contact_person || "",
      mobile: t.phone || "",
      vehicleNo: "",
      vehicleType: t.vehicle_type || "Truck",
      lr: ""
    }));
  } catch (err) {
    console.error("[o2dApi] fetchLiveTransporters error:", err);
    return [];
  }
}

/**
 * Fetch Users from live `public.users` table
 */
export async function fetchLiveUsers() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, user_name, email_id, number, department, division, employee_id, Designation, status")
      .order("user_name", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[o2dApi] fetchLiveUsers error:", err);
    return [];
  }
}

/**
 * Fetch Parties (Customer Master) from `public.o2d_parties`
 */
export async function fetchParties() {
  try {
    const { data, error } = await supabase
      .from("o2d_parties")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map((p, idx) => ({
      id: p.id,
      sn: p.party_code || `VN-${String(idx + 1).padStart(3, "0")}`,
      name: p.name,
      partyName: p.name,
      phone: p.phone || "",
      gst: p.gst_number || "",
      gstin: p.gst_number || "",
      gstNumber: p.gst_number || "",
      gst_number: p.gst_number || "",
      email: p.email || "",
      address: p.address || "",
      locationLink: p.location_link || "",
      responsiblePerson: p.responsible_person || "",
      divisionId: p.division_id,
      isActive: p.is_active
    }));
  } catch (err) {
    console.error("[o2dApi] fetchParties error:", err);
    return [];
  }
}

/**
 * Save Party to `public.o2d_parties`
 */
export async function savePartyRecord(party) {
  try {
    const payload = {
      name: party.name || party.partyName,
      party_code: party.sn || party.partyCode || null,
      gst_number: party.gstin || party.gstNumber || party.gst_number || null,
      phone: party.phone || null,
      email: party.email || null,
      address: party.address || party.deliveryAddress || null,
      location_link: party.locationLink || null,
      responsible_person: party.responsiblePerson || null,
      division_id: party.divisionId || null,
      is_active: party.isActive !== undefined ? party.isActive : true
    };

    if (party.id && typeof party.id === "number") {
      const { data, error } = await supabase
        .from("o2d_parties")
        .update(payload)
        .eq("id", party.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("o2d_parties")
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  } catch (err) {
    console.error("[o2dApi] savePartyRecord error:", err);
    throw err;
  }
}

/**
 * Delete Party from `public.o2d_parties`
 */
export async function deletePartyRecord(partyId) {
  try {
    const { error } = await supabase
      .from("o2d_parties")
      .delete()
      .eq("id", partyId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[o2dApi] deletePartyRecord error:", err);
    throw err;
  }
}

/**
 * Fetch Persons (Order Received By) from `public.o2d_persons`
 */
export async function fetchPersons() {
  try {
    const { data, error } = await supabase
      .from("o2d_persons")
      .select("id, person_code, name, phone, department, division_id, is_active, created_at, divisions(name)")
      .order("name", { ascending: true });
    if (error) {
      const { data: simpleData, error: simpleError } = await supabase
        .from("o2d_persons")
        .select("*")
        .order("name", { ascending: true });
      if (simpleError) throw simpleError;
      return (simpleData || []).map((p, idx) => ({
        id: p.id,
        prNo: p.person_code || `OR-${String(idx + 1).padStart(3, "0")}`,
        name: p.name,
        phone: p.phone || "",
        department: p.department || "",
        divisionId: p.division_id,
        createdAt: p.created_at,
        isActive: p.is_active
      }));
    }
    return (data || []).map((p, idx) => ({
      id: p.id,
      prNo: p.person_code || `OR-${String(idx + 1).padStart(3, "0")}`,
      name: p.name,
      phone: p.phone || "",
      department: p.department || "",
      divisionId: p.division_id,
      division: p.divisions?.name || "",
      divisionName: p.divisions?.name || "",
      createdAt: p.created_at,
      isActive: p.is_active
    }));
  } catch (err) {
    console.error("[o2dApi] fetchPersons error:", err);
    return [];
  }
}

/**
 * Save / Update Person (Order Received By) in `public.o2d_persons`
 */
export async function savePersonRecord(person) {
  try {
    const payload = {
      name: person.name,
      person_code: person.prNo || person.personCode || person.person_code || null,
      phone: person.phone || null,
      department: person.department || null,
      division_id: person.divisionId || person.division_id || null,
      is_active: person.isActive !== undefined ? person.isActive : true
    };

    if (person.id && typeof person.id === "number") {
      const { data, error } = await supabase
        .from("o2d_persons")
        .update(payload)
        .eq("id", person.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("o2d_persons")
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  } catch (err) {
    console.error("[o2dApi] savePersonRecord error:", err);
    throw err;
  }
}

/**
 * Delete Person from `public.o2d_persons`
 */
export async function deletePersonRecord(personId) {
  try {
    const { error } = await supabase
      .from("o2d_persons")
      .delete()
      .eq("id", personId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[o2dApi] deletePersonRecord error:", err);
    throw err;
  }
}


/**
 * Live Stock Lookup for a Product Name from `public.inventory_materials`
 */
export async function fetchLiveIMSStock(productName) {
  try {
    if (!productName) return 0;
    const { data, error } = await supabase
      .from("inventory_materials")
      .select("current_stock, quantity")
      .ilike("name", productName.trim())
      .limit(1);

    if (!error && data && data.length > 0) {
      const row = data[0];
      return toNum(row.current_stock !== undefined ? row.current_stock : row.quantity);
    }
    return 0;
  } catch (err) {
    console.error("[o2dApi] fetchLiveIMSStock error:", err);
    return 0;
  }
}

// =====================================================================
// 2. STAGE 1 & 2: ORDERS & ORDER ITEMS
// =====================================================================

/**
 * Fetch all Orders with their line items
 */
export async function fetchAllOrders() {
  try {
    const { data: orders, error: ordersErr } = await supabase
      .from("o2d_orders")
      .select(`
        *,
        items:o2d_order_items(*)
      `)
      .order("created_at", { ascending: false });

    if (ordersErr) throw ordersErr;

    return (orders || []).map((o) => {
      const items = (o.items || [])
        .sort((a, b) => a.item_index - b.item_index)
        .map((i) => ({
          id: i.id,
          orderId: o.order_id,
          itemIndex: i.item_index,
          productNumber: i.product_number,
          productId: i.product_id,
          productName: i.product_name,
          qty: toNum(i.qty),
          uomId: i.uom_id,
          uom: i.uom,
          priceRate: toNum(i.price_rate),
          gstPercent: toNum(i.gst_percent),
          totalValue: toNum(i.total_value),
          isValidated: !!i.is_validated,
          validatedAt: i.validated_at,
          validatedBy: i.validated_by,
          validationRemarks: i.validation_remarks || ""
        }));

      const checkedProductNumbers = items
        .filter((it) => it.isValidated)
        .map((it) => it.productNumber);

      const totalVal = toNum(o.total_po_value);
      return {
        id: o.id,
        dbId: o.id,
        orderId: o.order_id,
        divisionId: o.division_id,
        division: o.division,
        poNumber: o.po_number,
        poDate: o.po_date ? (o.po_date.includes("T") ? o.po_date.split("T")[0] : o.po_date) : "",
        poTimestamp: o.po_date,
        partyId: o.party_id,
        partyName: o.party_name,
        partyPhone: o.party_phone || "",
        partyNumber: o.party_phone || "",
        partyGst: o.party_gst || "",
        gstNumber: o.party_gst || "",
        responsiblePerson: o.responsible_person || "",
        deliveryAddress: o.delivery_address,
        expectedDeliveryDate: o.expected_delivery_date ? (o.expected_delivery_date.includes("T") ? o.expected_delivery_date.split("T")[0] : o.expected_delivery_date) : "",
        transportingTypeId: o.transporting_type_id,
        transportingType: o.transporting_type,
        paymentTerm: o.payment_term,
        advancePayment: o.advance_payment ? "Yes" : "No",
        advanceAmount: toNum(o.advance_amount),
        orderReceivedById: o.order_received_by_id,
        orderReceivedBy: o.order_received_by,
        poImage: o.po_image_url || "",
        remarks: o.remarks || "",
        isChecked: !!o.is_checked,
        currentStage: o.current_stage,
        totalPoValue: totalVal,
        totalPOValue: totalVal,
        checkedProductNumbers,
        validationChecklist: {},
        items,
        timestamp: o.created_at
      };
    });
  } catch (err) {
    console.error("[o2dApi] fetchAllOrders error:", err);
    return [];
  }
}

/**
 * Save / Create Received Order with line items
 */
export async function createReceivedOrder(orderPayload) {
  try {
    const isAdv = String(orderPayload.advancePayment).toLowerCase() === "yes" || orderPayload.advancePayment === true;
    const totalVal = toNum(orderPayload.totalPoValue || (orderPayload.items || []).reduce((s, it) => s + toNum(it.totalValue), 0));

    // 1. Resolve foreign keys if missing
    let divisionId = orderPayload.divisionId;
    if (!divisionId && orderPayload.division) {
      const { data: div } = await supabase.from("divisions").select("id").eq("name", orderPayload.division).limit(1);
      if (div && div[0]) divisionId = div[0].id;
    }

    let partyId = orderPayload.partyId;
    let resolvedParty = null;
    if (orderPayload.partyName) {
      const { data: pty } = await supabase.from("o2d_parties").select("*").eq("name", orderPayload.partyName).limit(1);
      if (pty && pty[0]) {
        partyId = pty[0].id;
        resolvedParty = pty[0];
      } else {
        const { data: newPty } = await supabase.from("o2d_parties").insert({
          name: orderPayload.partyName,
          phone: orderPayload.partyPhone || orderPayload.partyNumber || null,
          gst_number: orderPayload.partyGst || orderPayload.gstNumber || null,
          address: orderPayload.deliveryAddress || null,
          responsible_person: orderPayload.responsiblePerson || null
        }).select().maybeSingle();
        if (newPty) {
          partyId = newPty.id;
          resolvedParty = newPty;
        }
      }
    }

    const orderRow = {
      division_id: divisionId || 1,
      division: orderPayload.division || "Nutech Composite",
      po_number: orderPayload.poNumber || `PO-${Date.now()}`,
      po_date: orderPayload.poDate || new Date().toISOString().split("T")[0],
      party_id: partyId || 1,
      party_name: orderPayload.partyName || "Unknown Party",
      party_phone: orderPayload.partyPhone || orderPayload.partyNumber || resolvedParty?.phone || null,
      party_gst: orderPayload.partyGst || orderPayload.gstNumber || resolvedParty?.gst_number || null,
      responsible_person: orderPayload.responsiblePerson || resolvedParty?.responsible_person || null,
      delivery_address: orderPayload.deliveryAddress || resolvedParty?.address || "Factory",
      expected_delivery_date: orderPayload.expectedDeliveryDate || null,
      transporting_type_id: orderPayload.transportingTypeId || null,
      transporting_type: orderPayload.transportingType || "FOR",
      payment_term: orderPayload.paymentTerm || "30 Days",
      advance_payment: isAdv,
      advance_amount: isAdv ? toNum(orderPayload.advanceAmount) : 0,
      order_received_by_id: orderPayload.orderReceivedById || null,
      order_received_by: orderPayload.orderReceivedBy || null,
      po_image_url: orderPayload.poImage || null,
      remarks: orderPayload.remarks || null,
      total_po_value: totalVal,
      is_checked: false,
      current_stage: "RECEIVED"
    };

    const { data: insertedOrder, error: orderErr } = await supabase
      .from("o2d_orders")
      .insert(orderRow)
      .select()
      .maybeSingle();

    if (orderErr) throw orderErr;

    // 2. Insert items
    const rawItems = orderPayload.items || [];
    if (rawItems.length > 0) {
      const itemsRows = rawItems.map((it, idx) => {
        const itemIndex = idx + 1;
        const prodNum = (it.productNumber && it.productNumber.startsWith(insertedOrder.order_id))
          ? it.productNumber
          : `${insertedOrder.order_id}-${String(itemIndex).padStart(2, "0")}`;
        const itemTotal = toNum(it.totalValue || (toNum(it.qty) * toNum(it.priceRate) * (1 + toNum(it.gstPercent) / 100)));

        return {
          order_id: insertedOrder.id,
          item_index: itemIndex,
          product_number: prodNum,
          product_id: it.productId || null,
          product_name: it.productName || "Material",
          qty: Math.max(0.01, toNum(it.qty)),
          uom_id: it.uomId || null,
          uom: it.uom || "NOS",
          price_rate: toNum(it.priceRate),
          gst_percent: [0, 5, 12, 18, 28].includes(toNum(it.gstPercent)) ? toNum(it.gstPercent) : 18,
          total_value: itemTotal,
          is_validated: !!it.isValidated,
          validation_remarks: it.validationRemarks || null
        };
      });

      const { error: itemsErr } = await supabase
        .from("o2d_order_items")
        .insert(itemsRows);

      if (itemsErr) console.error("[o2dApi] createReceivedOrder items insert error:", itemsErr);
    }

    return insertedOrder;
  } catch (err) {
    console.error("[o2dApi] createReceivedOrder error:", err);
    throw err;
  }
}

/**
 * Validate Order Items & sync order validation gate
 */
export async function saveOrderValidation(orderIdText, validatedProductNumbers, isOrderChecked = false) {
  try {
    // 1. Fetch order id by orderIdText
    const { data: order, error: ordErr } = await supabase
      .from("o2d_orders")
      .select("id, order_id")
      .eq("order_id", orderIdText)
      .maybeSingle();

    if (ordErr || !order) throw new Error(`Order ${orderIdText} not found`);

    // 2. Update validated items
    if (validatedProductNumbers && validatedProductNumbers.length > 0) {
      await supabase
        .from("o2d_order_items")
        .update({ is_validated: true, validated_at: new Date().toISOString() })
        .eq("order_id", order.id)
        .in("product_number", validatedProductNumbers);
    }

    // 3. Update order is_checked
    await supabase
      .from("o2d_orders")
      .update({ is_checked: isOrderChecked })
      .eq("id", order.id);

    // 4. Trigger stage sync RPC
    await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: order.id });

    return true;
  } catch (err) {
    console.error("[o2dApi] saveOrderValidation error:", err);
    throw err;
  }
}

// =====================================================================
// 3. STAGE 3 & 4: DELIVERY CHECKS (STOCK CHECK & PRODUCTION)
// =====================================================================

/**
 * Fetch Delivery Checks
 */
export async function fetchDeliveryChecks() {
  try {
    const { data, error } = await supabase
      .from("o2d_delivery_checks")
      .select(`
        *,
        order:o2d_orders(order_id, division, party_name),
        order_item:o2d_order_items(price_rate, gst_percent, total_value)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((dc) => ({
      id: dc.delivery_approver_id,
      dbId: dc.id,
      deliveryApproverId: dc.delivery_approver_id,
      orderId: dc.order ? dc.order.order_id : "",
      dbOrderId: dc.order_id,
      orderItemId: dc.order_item_id,
      productNumber: dc.product_number,
      productName: dc.product_name,
      originalQty: toNum(dc.original_qty),
      qty: toNum(dc.original_qty),
      uom: dc.uom,
      priceRate: toNum(dc.order_item?.price_rate),
      gstPercent: toNum(dc.order_item?.gst_percent),
      stockStatus: dc.stock_status,
      approveQty: toNum(dc.approve_qty),
      productionQty: toNum(dc.production_qty),
      batchNo: dc.batch_no || "",
      remarks: dc.remarks || "",
      produced: !!dc.produced,
      producedAt: dc.produced_at,
      productionRemarks: dc.production_remarks || "",
      timestamp: dc.created_at
    }));
  } catch (err) {
    console.error("[o2dApi] fetchDeliveryChecks error:", err);
    return [];
  }
}

/**
 * Save Delivery Checks (Stock Split records)
 */
export async function saveDeliveryCheckRecords(records) {
  try {
    if (!records || records.length === 0) return [];

    // Resolve order_id and order_item_id
    const rowsToInsert = [];
    for (const r of records) {
      let orderDbId = r.dbOrderId;
      let orderItemId = r.orderItemId;

      if (!orderDbId && r.orderId) {
        const { data: ord } = await supabase.from("o2d_orders").select("id").eq("order_id", r.orderId).maybeSingle();
        if (ord) orderDbId = ord.id;
      }

      if (!orderItemId && r.productNumber) {
        const { data: itm } = await supabase.from("o2d_order_items").select("id").eq("product_number", r.productNumber).maybeSingle();
        if (itm) orderItemId = itm.id;
      }

      // Fallback: look up order item by orderDbId and product name if not resolved by productNumber
      if (!orderItemId && orderDbId) {
        const { data: ordItems } = await supabase
          .from("o2d_order_items")
          .select("id, product_name, product_number")
          .eq("order_id", orderDbId);
        if (ordItems && ordItems.length > 0) {
          const match = ordItems.find((it) => it.product_name === r.productName) || ordItems[0];
          orderItemId = match.id;
        }
      }

      if (orderDbId && orderItemId) {
        const row = {
          order_id: orderDbId,
          order_item_id: orderItemId,
          product_number: r.productNumber,
          product_name: r.productName,
          original_qty: toNum(r.originalQty || r.qty || 1),
          uom: r.uom || "NOS",
          stock_status: r.stockStatus === "No Stock" ? "No Stock" : "In Stock",
          approve_qty: toNum(r.approveQty),
          production_qty: toNum(r.productionQty),
          batch_no: r.batchNo || null,
          remarks: r.remarks || null,
          produced: !!r.produced
        };

        if (r.deliveryApproverId) {
          row.delivery_approver_id = r.deliveryApproverId;
        }

        rowsToInsert.push(row);
      }
    }

    if (rowsToInsert.length === 0) return [];

    const { data: inserted, error } = await supabase
      .from("o2d_delivery_checks")
      .upsert(rowsToInsert, { onConflict: "delivery_approver_id" })
      .select();

    if (error) throw error;

    // Trigger stage sync
    const orderIds = Array.from(new Set(rowsToInsert.map((r) => r.order_id)));
    for (const oid of orderIds) {
      await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: oid });
    }

    return inserted;
  } catch (err) {
    console.error("[o2dApi] saveDeliveryCheckRecords error:", err);
    throw err;
  }
}

/**
 * Update Production status in-place on delivery check row
 */
export async function updateProductionCheck(deliveryApproverId, productionData) {
  try {
    let { data: dc, error: fetchErr } = await supabase
      .from("o2d_delivery_checks")
      .select("id, order_id, production_qty, delivery_approver_id")
      .eq("delivery_approver_id", deliveryApproverId)
      .maybeSingle();

    if (!dc) {
      // Self-healing fallback: If not found in DB (e.g. created offline / in localStorage prior to sync),
      // look up order and item to create/upsert the row
      let orderDbId = productionData?.dbOrderId;
      if (!orderDbId && productionData?.orderId) {
        const { data: ord } = await supabase.from("o2d_orders").select("id").eq("order_id", productionData.orderId).maybeSingle();
        if (ord) orderDbId = ord.id;
      }

      let orderItemId = productionData?.orderItemId;
      if (!orderItemId && productionData?.productNumber) {
        const { data: itm } = await supabase.from("o2d_order_items").select("id").eq("product_number", productionData.productNumber).maybeSingle();
        if (itm) orderItemId = itm.id;
      }
      if (!orderItemId && orderDbId) {
        const { data: ordItems } = await supabase.from("o2d_order_items").select("id, product_name").eq("order_id", orderDbId);
        if (ordItems && ordItems.length > 0) {
          const match = ordItems.find((i) => i.product_name === productionData?.productName) || ordItems[0];
          orderItemId = match.id;
        }
      }

      if (orderDbId && orderItemId) {
        const newDcRow = {
          delivery_approver_id: deliveryApproverId,
          order_id: orderDbId,
          order_item_id: orderItemId,
          product_number: productionData.productNumber || "PROD-01",
          product_name: productionData.productName || "Material",
          original_qty: toNum(productionData.originalQty || productionData.qty || productionData.productionQty || 1),
          uom: productionData.uom || "NOS",
          stock_status: productionData.stockStatus || "In Stock",
          approve_qty: toNum(productionData.approveQty || productionData.productionQty),
          production_qty: toNum(productionData.productionQty),
          batch_no: productionData.batchNo || null,
          remarks: productionData.remarks || null,
          produced: true,
          produced_at: new Date().toISOString(),
          production_remarks: productionData.remarks || productionData.productionRemarks || null
        };

        const { data: createdDc, error: createErr } = await supabase
          .from("o2d_delivery_checks")
          .upsert(newDcRow, { onConflict: "delivery_approver_id" })
          .select()
          .maybeSingle();

        if (createErr) console.error("[o2dApi] updateProductionCheck self-heal insert error:", createErr);
        dc = createdDc;
      }
    }

    if (!dc) {
      console.warn(`[o2dApi] Delivery check ${deliveryApproverId} not found in database and could not be recovered.`);
      return false;
    }

    const updatePayload = {
      produced: true,
      produced_at: new Date().toISOString(),
      production_remarks: productionData.remarks || productionData.productionRemarks || null,
      batch_no: productionData.batchNo || null,
      approve_qty: toNum(productionData.approveQty || dc.production_qty)
    };

    const { error: updErr } = await supabase
      .from("o2d_delivery_checks")
      .update(updatePayload)
      .eq("id", dc.id);

    if (updErr) throw updErr;

    // Sync order stage
    await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: dc.order_id });
    return true;
  } catch (err) {
    console.error("[o2dApi] updateProductionCheck error:", err);
    throw err;
  }
}

// =====================================================================
// 4. STAGE 5 & 6: DISPATCHES & PACKAGING
// =====================================================================

/**
 * Fetch Dispatches
 */
export async function fetchDispatches() {
  try {
    const { data, error } = await supabase
      .from("o2d_dispatches")
      .select(`
        *,
        order:o2d_orders(order_id, division, party_name),
        sources:o2d_dispatch_sources(
          *,
          delivery_check:o2d_delivery_checks(
            delivery_approver_id,
            product_number,
            product_name,
            uom,
            order_item:o2d_order_items(price_rate, gst_percent, total_value)
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((ds) => {
      const firstSource = (ds.sources || [])[0];
      const prodNumber = firstSource?.delivery_check?.product_number || "";
      const prodName = firstSource?.delivery_check?.product_name || "";
      const daId = firstSource?.delivery_check?.delivery_approver_id || "";
      const uomVal = firstSource?.delivery_check?.uom || "";
      const priceRateVal = toNum(firstSource?.delivery_check?.order_item?.price_rate);
      const gstPercentVal = toNum(firstSource?.delivery_check?.order_item?.gst_percent);

      const dispatchDateStr = ds.dispatch_timestamp
        ? ds.dispatch_timestamp.split("T")[0]
        : (ds.created_at ? ds.created_at.split("T")[0] : "");

      return {
        id: ds.dispatch_id,
        dbId: ds.id,
        dispatchId: ds.dispatch_id,
        orderId: ds.order?.order_id || "",
        dbOrderId: ds.order_id,
        deliveryApproverId: daId,
        productNumber: prodNumber,
        productName: prodName,
        uom: uomVal,
        priceRate: priceRateVal,
        gstPercent: gstPercentVal,
        dispatchDate: dispatchDateStr,
        dispatchTimestamp: ds.dispatch_timestamp || ds.created_at,
        dispatchQty: toNum(ds.dispatch_qty),
        cancelQty: toNum(ds.cancel_qty),
        packagingStatus: ds.packaging_status || "No",
        packagingTimestamp: ds.packaging_timestamp,
        packagingRemarks: ds.packaging_remarks || "",
        timestamp: ds.dispatch_timestamp || ds.created_at,
        sources: ds.sources || []
      };
    });
  } catch (err) {
    console.error("[o2dApi] fetchDispatches error:", err);
    return [];
  }
}

/**
 * Create Dispatch with source breakdown
 */
export async function createDispatchRecord(dispatchPayload) {
  try {
    let orderDbId = dispatchPayload.dbOrderId;
    if (!orderDbId && dispatchPayload.orderId) {
      const { data: ord } = await supabase.from("o2d_orders").select("id").eq("order_id", dispatchPayload.orderId).maybeSingle();
      if (ord) orderDbId = ord.id;
    }

    const dispatchRow = {
      order_id: orderDbId,
      dispatch_qty: toNum(dispatchPayload.dispatchQty),
      cancel_qty: toNum(dispatchPayload.cancelQty),
      packaging_status: dispatchPayload.packagingStatus === "Yes" ? "Yes" : "No",
      packaging_remarks: dispatchPayload.packagingRemarks || null
    };

    if (dispatchPayload.dispatchId) {
      dispatchRow.dispatch_id = dispatchPayload.dispatchId;
    }
    if (dispatchPayload.dispatchDate || dispatchPayload.dispatchTimestamp) {
      dispatchRow.dispatch_timestamp = dispatchPayload.dispatchTimestamp || (dispatchPayload.dispatchDate ? new Date(dispatchPayload.dispatchDate).toISOString() : new Date().toISOString());
    }

    const { data: insertedDispatch, error: dsErr } = await supabase
      .from("o2d_dispatches")
      .insert(dispatchRow)
      .select()
      .maybeSingle();

    if (dsErr) throw dsErr;

    // Link source check if provided
    let checkDbId = dispatchPayload.deliveryCheckId;
    if (!checkDbId && dispatchPayload.deliveryApproverId) {
      const { data: dc } = await supabase.from("o2d_delivery_checks").select("id").eq("delivery_approver_id", dispatchPayload.deliveryApproverId).maybeSingle();
      if (dc) checkDbId = dc.id;
    }

    if (checkDbId) {
      await supabase.from("o2d_dispatch_sources").insert({
        dispatch_id: insertedDispatch.id,
        delivery_check_id: checkDbId,
        dispatch_qty: toNum(dispatchPayload.dispatchQty),
        cancel_qty: toNum(dispatchPayload.cancelQty)
      });
    }

    // Sync order stage
    await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: orderDbId });

    return insertedDispatch;
  } catch (err) {
    console.error("[o2dApi] createDispatchRecord error:", err);
    throw err;
  }
}

/**
 * Update Packaging status on dispatch record
 */
export async function updatePackaging(dispatchIdText, packagingData) {
  try {
    const { data: ds, error: fetchErr } = await supabase
      .from("o2d_dispatches")
      .select("id, order_id")
      .eq("dispatch_id", dispatchIdText)
      .maybeSingle();

    if (fetchErr || !ds) throw new Error(`Dispatch ${dispatchIdText} not found`);

    const updatePayload = {
      packaging_status: "Yes",
      packaging_timestamp: new Date().toISOString(),
      packaging_remarks: packagingData.remarks || packagingData.packagingRemarks || null
    };

    const { error: updErr } = await supabase
      .from("o2d_dispatches")
      .update(updatePayload)
      .eq("id", ds.id);

    if (updErr) throw updErr;

    // Sync order stage
    await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: ds.order_id });
    return true;
  } catch (err) {
    console.error("[o2dApi] updatePackaging error:", err);
    throw err;
  }
}

// =====================================================================
// 5. STAGE 7: VEHICLE LOGISTICS
// =====================================================================

/**
 * Fetch Logistics History
 */
export async function fetchLogistics() {
  try {
    const { data, error } = await supabase
      .from("o2d_logistics")
      .select(`
        *,
        order:o2d_orders(order_id),
        dispatch:o2d_dispatches(dispatch_id, order_id),
        transporter:master_transporters(transporter_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((l) => ({
      id: `LOG-${l.id}`,
      dbId: l.id,
      dispatchId: l.dispatch?.dispatch_id || "",
      orderId: l.order?.order_id || "",
      transportAgency: l.transporter?.transporter_name || "",
      vehicleNo: l.vehicle_no || "",
      driverName: l.driver_name || "",
      driverMobile: l.mobile || "",
      lrNumber: l.lr_number || "",
      lrCopy: l.lr_copy_url || "",
      biltyStatus: l.bilty_status || "No",
      timestamp: l.logistic_timestamp || l.created_at
    }));
  } catch (err) {
    console.error("[o2dApi] fetchLogistics error:", err);
    return [];
  }
}

/**
 * Save Logistic Transaction
 */
export async function saveLogisticRecord(logisticPayload) {
  try {
    let dispatchDbId = logisticPayload.dbDispatchId;
    let orderDbId = logisticPayload.dbOrderId;

    if (!dispatchDbId && logisticPayload.dispatchId) {
      const { data: ds } = await supabase.from("o2d_dispatches").select("id, order_id").eq("dispatch_id", logisticPayload.dispatchId).maybeSingle();
      if (ds) {
        dispatchDbId = ds.id;
        orderDbId = ds.order_id;
      }
    }

    if (!dispatchDbId) throw new Error("Dispatch ID is required for logistics");

    const row = {
      dispatch_id: dispatchDbId,
      order_id: orderDbId || 1,
      vehicle_no: logisticPayload.vehicleNo || "MH-12-0000",
      driver_name: logisticPayload.driverName || null,
      mobile: logisticPayload.driverMobile || null,
      lr_number: logisticPayload.lrNumber || null,
      lr_copy_url: logisticPayload.lrCopy || null,
      bilty_status: logisticPayload.biltyStatus === "Yes" ? "Yes" : "No"
    };

    const { data, error } = await supabase
      .from("o2d_logistics")
      .upsert(row, { onConflict: "dispatch_id" })
      .select()
      .maybeSingle();

    if (error) throw error;

    // Sync order stage
    if (orderDbId) {
      await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: orderDbId });
    }

    return data;
  } catch (err) {
    console.error("[o2dApi] saveLogisticRecord error:", err);
    throw err;
  }
}

// =====================================================================
// 6. STAGE 8: CALLAN (DELIVERY CHALLAN)
// =====================================================================

/**
 * Fetch Callans
 */
export async function fetchCallans() {
  try {
    const { data, error } = await supabase
      .from("o2d_callans")
      .select(`
        *,
        order:o2d_orders(order_id),
        dispatch:o2d_dispatches(
          dispatch_id,
          dispatch_qty,
          dispatch_timestamp,
          sources:o2d_dispatch_sources(
            delivery_check:o2d_delivery_checks(
              delivery_approver_id,
              product_number,
              product_name,
              uom,
              order_item:o2d_order_items(price_rate, gst_percent, total_value)
            )
          )
        ),
        items:o2d_callan_items(*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const flatItems = [];
    (data || []).forEach((c) => {
      const orderIdStr = c.order?.order_id || "";
      const dsIdStr = c.dispatch?.dispatch_id || "";
      const firstSource = (c.dispatch?.sources || [])[0]?.delivery_check;
      const defaultRate = toNum(firstSource?.order_item?.price_rate);
      const defaultGst = toNum(firstSource?.order_item?.gst_percent);
      const dispatchDateStr = c.dispatch?.dispatch_timestamp
        ? c.dispatch.dispatch_timestamp.split("T")[0]
        : (c.callan_date ? (c.callan_date.includes("T") ? c.callan_date.split("T")[0] : c.callan_date) : "");

      if (c.items && c.items.length > 0) {
        c.items.forEach((ci) => {
          flatItems.push({
            id: `ci-${ci.id}`,
            dbId: ci.id,
            callanId: c.id,
            callanNo: c.callan_no || "",
            callanDate: c.callan_date ? (c.callan_date.includes("T") ? c.callan_date.split("T")[0] : c.callan_date) : "",
            callanTimestamp: c.callan_date,
            callanImage: c.callan_image_url || "",
            callanRemarks: c.remarks || "",
            dispatchId: dsIdStr,
            dispatchDate: dispatchDateStr,
            orderId: orderIdStr,
            dbOrderId: c.order_id,
            productNumber: ci.product_number,
            productName: ci.product_name,
            qty: toNum(ci.qty),
            dispatchQty: toNum(ci.qty),
            uom: ci.uom,
            priceRate: defaultRate,
            gstPercent: defaultGst,
            _isCustom: !!ci.is_custom,
            timestamp: c.created_at
          });
        });
      } else {
        flatItems.push({
          id: `DC-${c.id}`,
          dbId: c.id,
          callanId: c.id,
          callanNo: c.callan_no || "",
          callanDate: c.callan_date ? (c.callan_date.includes("T") ? c.callan_date.split("T")[0] : c.callan_date) : "",
          callanTimestamp: c.callan_date,
          callanImage: c.callan_image_url || "",
          callanRemarks: c.remarks || "",
          dispatchId: dsIdStr,
          dispatchDate: dispatchDateStr,
          orderId: orderIdStr,
          dbOrderId: c.order_id,
          productNumber: firstSource?.product_number || "",
          productName: firstSource?.product_name || "",
          qty: toNum(c.dispatch?.dispatch_qty || 1),
          dispatchQty: toNum(c.dispatch?.dispatch_qty || 1),
          uom: firstSource?.uom || "NOS",
          priceRate: defaultRate,
          gstPercent: defaultGst,
          timestamp: c.created_at
        });
      }
    });

    return flatItems;
  } catch (err) {
    console.error("[o2dApi] fetchCallans error:", err);
    return [];
  }
}

/**
 * Save Callan with lines
 */
export async function saveCallanRecord(callanPayload) {
  try {
    let dispatchDbId = callanPayload.dbDispatchId;
    let orderDbId = callanPayload.dbOrderId;

    if (!dispatchDbId && callanPayload.dispatchId) {
      const { data: ds } = await supabase.from("o2d_dispatches").select("id, order_id").eq("dispatch_id", callanPayload.dispatchId).maybeSingle();
      if (ds) {
        dispatchDbId = ds.id;
        orderDbId = ds.order_id;
      }
    }

    const header = {
      dispatch_id: dispatchDbId,
      order_id: orderDbId || 1,
      callan_no: callanPayload.callanNo || `DC-${Date.now()}`,
      callan_date: callanPayload.callanDate || new Date().toISOString().split("T")[0],
      callan_image_url: callanPayload.callanImage || null,
      remarks: callanPayload.remarks || null
    };

    const { data: insertedCallan, error: cErr } = await supabase
      .from("o2d_callans")
      .insert(header)
      .select()
      .maybeSingle();

    if (cErr) throw cErr;

    // Insert items if any
    const rawItems = callanPayload.items || [];
    if (rawItems.length > 0) {
      const itemRows = rawItems.map((ci) => ({
        callan_id: insertedCallan.id,
        product_number: ci.productNumber || "CUSTOM-01",
        product_name: ci.productName || "Product",
        qty: Math.max(0.01, toNum(ci.qty)),
        uom: ci.uom || "NOS",
        is_custom: !!ci.isCustom
      }));

      await supabase.from("o2d_callan_items").insert(itemRows);
    }

    // Sync order stage
    if (orderDbId) {
      await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: orderDbId });
    }

    return insertedCallan;
  } catch (err) {
    console.error("[o2dApi] saveCallanRecord error:", err);
    throw err;
  }
}

// =====================================================================
// 7. STAGE 9: MAKE INVOICE
// =====================================================================

/**
 * Fetch Invoices
 */
export async function fetchInvoices() {
  try {
    const { data, error } = await supabase
      .from("o2d_invoices")
      .select(`
        *,
        order:o2d_orders(order_id),
        dispatch:o2d_dispatches(
          dispatch_id,
          dispatch_qty,
          dispatch_timestamp,
          order:o2d_orders(order_id),
          sources:o2d_dispatch_sources(
            delivery_check:o2d_delivery_checks(
              delivery_approver_id,
              product_number,
              product_name,
              uom,
              order_item:o2d_order_items(price_rate, gst_percent, total_value)
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((inv) => {
      const orderIdStr = inv.order?.order_id || inv.dispatch?.order?.order_id || "";
      const dsIdStr = inv.dispatch?.dispatch_id || "";
      const firstSource = (inv.dispatch?.sources || [])[0]?.delivery_check;
      const rate = toNum(firstSource?.order_item?.price_rate);
      const gst = toNum(firstSource?.order_item?.gst_percent);
      const dispatchQty = toNum(inv.dispatch?.dispatch_qty);

      return {
        id: `INV-${inv.id}`,
        dbId: inv.id,
        dispatchId: dsIdStr,
        dbDispatchId: inv.dispatch_id,
        orderId: orderIdStr,
        dbOrderId: inv.order_id,
        productNumber: firstSource?.product_number || "",
        productName: firstSource?.product_name || "",
        uom: firstSource?.uom || "NOS",
        priceRate: rate,
        gstPercent: gst,
        dispatchQty: dispatchQty,
        dispatchDate: inv.dispatch?.dispatch_timestamp ? inv.dispatch.dispatch_timestamp.split("T")[0] : "",
        dispatchTimestamp: inv.dispatch?.dispatch_timestamp,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date ? (inv.invoice_date.includes("T") ? inv.invoice_date.split("T")[0] : inv.invoice_date) : "",
        invoiceTimestamp: inv.invoice_date,
        invoiceImage: inv.invoice_image_url || "",
        taxableAmount: toNum(inv.taxable_amount),
        gstAmount: toNum(inv.gst_amount),
        totalAmount: toNum(inv.total_amount),
        invoiceAmount: inv.total_amount ? String(inv.total_amount) : "",
        remarks: inv.remarks || "",
        invoiceRemarks: inv.remarks || "",
        timestamp: inv.created_at
      };
    });
  } catch (err) {
    console.error("[o2dApi] fetchInvoices error:", err);
    return [];
  }
}

/**
 * Save Invoice
 */
export async function saveInvoiceRecord(invoicePayload) {
  try {
    let dispatchDbId = invoicePayload.dbDispatchId;
    let orderDbId = invoicePayload.dbOrderId;

    if (!dispatchDbId && invoicePayload.dispatchId) {
      const { data: ds } = await supabase.from("o2d_dispatches").select("id, order_id").eq("dispatch_id", invoicePayload.dispatchId).maybeSingle();
      if (ds) {
        dispatchDbId = ds.id;
        orderDbId = ds.order_id;
      }
    }

    const row = {
      dispatch_id: dispatchDbId,
      order_id: orderDbId || 1,
      invoice_number: invoicePayload.invoiceNumber || `INV-${Date.now()}`,
      invoice_date: invoicePayload.invoiceDate || new Date().toISOString().split("T")[0],
      invoice_image_url: invoicePayload.invoiceImage || null,
      taxable_amount: toNum(invoicePayload.taxableAmount),
      gst_amount: toNum(invoicePayload.gstAmount),
      total_amount: toNum(invoicePayload.totalAmount),
      remarks: invoicePayload.remarks || null
    };

    const { data: insertedInvoice, error: invErr } = await supabase
      .from("o2d_invoices")
      .insert(row)
      .select()
      .maybeSingle();

    if (invErr) throw invErr;

    // Automatically initialize delivery record as 'In Transit' if not exists
    await supabase.from("o2d_deliveries").upsert({
      dispatch_id: dispatchDbId,
      order_id: orderDbId || 1,
      delivery_status: "In Transit"
    }, { onConflict: "dispatch_id" });

    // Sync order stage
    if (orderDbId) {
      await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: orderDbId });
    }

    return insertedInvoice;
  } catch (err) {
    console.error("[o2dApi] saveInvoiceRecord error:", err);
    throw err;
  }
}

// =====================================================================
// 8. STAGE 10: CONFIRM DELIVERY
// =====================================================================

/**
 * Fetch Deliveries
 */
export async function fetchDeliveries() {
  try {
    const { data, error } = await supabase
      .from("o2d_deliveries")
      .select(`
        *,
        order:o2d_orders(order_id),
        dispatch:o2d_dispatches(
          dispatch_id,
          dispatch_qty,
          dispatch_timestamp,
          order:o2d_orders(order_id),
          sources:o2d_dispatch_sources(
            delivery_check:o2d_delivery_checks(
              delivery_approver_id,
              product_number,
              product_name,
              uom,
              order_item:o2d_order_items(price_rate, gst_percent, total_value)
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((d) => {
      const orderIdStr = d.order?.order_id || d.dispatch?.order?.order_id || "";
      const dsIdStr = d.dispatch?.dispatch_id || "";
      const firstSource = (d.dispatch?.sources || [])[0]?.delivery_check;
      const rate = toNum(firstSource?.order_item?.price_rate);
      const gst = toNum(firstSource?.order_item?.gst_percent);
      const dispatchQty = toNum(d.dispatch?.dispatch_qty);

      return {
        id: `DEL-${d.id}`,
        dbId: d.id,
        dispatchId: dsIdStr,
        dbDispatchId: d.dispatch_id,
        orderId: orderIdStr,
        dbOrderId: d.order_id,
        productNumber: firstSource?.product_number || "",
        productName: firstSource?.product_name || "",
        uom: firstSource?.uom || "NOS",
        priceRate: rate,
        gstPercent: gst,
        dispatchQty: dispatchQty,
        dispatchDate: d.dispatch?.dispatch_timestamp ? d.dispatch.dispatch_timestamp.split("T")[0] : "",
        dispatchTimestamp: d.dispatch?.dispatch_timestamp,
        deliveryStatus: d.delivery_status,
        deliveryDate: d.delivery_date ? (d.delivery_date.includes("T") ? d.delivery_date.split("T")[0] : d.delivery_date) : "",
        deliveryTimestamp: d.delivery_date,
        receiptImage: d.receipt_image_url || "",
        remarks: d.remarks || "",
        timestamp: d.delivery_date || d.created_at
      };
    });
  } catch (err) {
    console.error("[o2dApi] fetchDeliveries error:", err);
    return [];
  }
}

/**
 * Confirm Delivery (upsert delivery status to 'Delivered')
 */
export async function confirmDeliveryRecord(deliveryPayload) {
  try {
    let dispatchDbId = deliveryPayload.dbDispatchId;
    let orderDbId = deliveryPayload.dbOrderId;

    if (!dispatchDbId && deliveryPayload.dispatchId) {
      const { data: ds } = await supabase.from("o2d_dispatches").select("id, order_id").eq("dispatch_id", deliveryPayload.dispatchId).maybeSingle();
      if (ds) {
        dispatchDbId = ds.id;
        orderDbId = ds.order_id;
      }
    }

    const row = {
      dispatch_id: dispatchDbId,
      order_id: orderDbId || 1,
      delivery_status: "Delivered",
      delivery_date: deliveryPayload.deliveryDate || new Date().toISOString(),
      receipt_image_url: deliveryPayload.receiptImage || null,
      remarks: deliveryPayload.remarks || null
    };

    const { data, error } = await supabase
      .from("o2d_deliveries")
      .upsert(row, { onConflict: "dispatch_id" })
      .select()
      .maybeSingle();

    if (error) throw error;

    // Sync order stage
    if (orderDbId) {
      await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: orderDbId });
    }

    return data;
  } catch (err) {
    console.error("[o2dApi] confirmDeliveryRecord error:", err);
    throw err;
  }
}

// =====================================================================
// 9. STAGE 11: PAYMENTS (ADVANCE / VENDOR / FREIGHT)
// =====================================================================

/**
 * Fetch Payments
 */
export async function fetchPayments() {
  try {
    const { data, error } = await supabase
      .from("o2d_payments")
      .select(`
        *,
        order:o2d_orders(order_id),
        dispatch:o2d_dispatches(dispatch_id)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((p) => ({
      id: `PMT-${p.id}`,
      dbId: p.id,
      orderId: p.order?.order_id || "",
      dbOrderId: p.order_id,
      dispatchId: p.dispatch?.dispatch_id || "",
      dbDispatchId: p.dispatch_id,
      paymentType: p.payment_type,
      paymentNo: p.payment_no,
      amountPaid: toNum(p.amount_paid),
      paymentDate: p.payment_date ? (p.payment_date.includes("T") ? p.payment_date.split("T")[0] : p.payment_date) : "",
      paymentTimestamp: p.payment_date,
      vendorName: p.vendor_name || "",
      partyId: p.party_id,
      transporterId: p.transporter_id,
      lrNumber: p.lr_number || "",
      lrCopy: p.lr_copy_url || "",
      vehicleNumber: p.vehicle_number || "",
      fromLocation: p.from_location || "",
      toLocation: p.to_location || "",
      rateType: p.rate_type || "",
      freightAmount: toNum(p.freight_amount),
      materialLoadDetails: p.material_load_details || "",
      remarks: p.remarks || "",
      timestamp: p.created_at
    }));
  } catch (err) {
    console.error("[o2dApi] fetchPayments error:", err);
    return [];
  }
}

/**
 * Save Payment Transaction (Advance / Vendor / Freight)
 */
export async function savePaymentRecord(paymentPayload) {
  try {
    let orderDbId = paymentPayload.dbOrderId;
    if (!orderDbId && paymentPayload.orderId) {
      const { data: ord } = await supabase.from("o2d_orders").select("id").eq("order_id", paymentPayload.orderId).maybeSingle();
      if (ord) orderDbId = ord.id;
    }

    let dispatchDbId = paymentPayload.dbDispatchId;
    if (!dispatchDbId && paymentPayload.dispatchId) {
      const { data: ds } = await supabase.from("o2d_dispatches").select("id").eq("dispatch_id", paymentPayload.dispatchId).maybeSingle();
      if (ds) dispatchDbId = ds.id;
    }

    const row = {
      order_id: orderDbId || 1,
      dispatch_id: dispatchDbId || null,
      payment_type: paymentPayload.paymentType || "Advance",
      payment_no: paymentPayload.paymentNo || `PAY-${Date.now()}`,
      amount_paid: Math.max(0.01, toNum(paymentPayload.amountPaid)),
      payment_date: paymentPayload.paymentDate || new Date().toISOString().split("T")[0],
      party_id: paymentPayload.partyId || null,
      vendor_name: paymentPayload.vendorName || null,
      transporter_id: paymentPayload.transporterId || null,
      lr_number: paymentPayload.lrNumber || null,
      lr_copy_url: paymentPayload.lrCopy || null,
      vehicle_number: paymentPayload.vehicleNumber || null,
      from_location: paymentPayload.fromLocation || null,
      to_location: paymentPayload.toLocation || null,
      rate_type: paymentPayload.rateType || null,
      freight_amount: paymentPayload.freightAmount !== undefined ? toNum(paymentPayload.freightAmount) : null,
      material_load_details: paymentPayload.materialLoadDetails || null,
      remarks: paymentPayload.remarks || null
    };

    const { data: insertedPayment, error } = await supabase
      .from("o2d_payments")
      .insert(row)
      .select()
      .maybeSingle();

    if (error) throw error;

    // If freight payment has LR details and dispatch_id, trigger backfill RPC
    if (insertedPayment.payment_type === "Freight" && insertedPayment.dispatch_id) {
      try {
        await supabase.rpc("fn_o2d_backfill_logistics_from_freight_payment", {
          p_payment_id: insertedPayment.id
        });
      } catch (rpcErr) {
        console.warn("[o2dApi] freight backfill RPC note:", rpcErr);
      }
    }

    // Sync order stage
    if (orderDbId) {
      await supabase.rpc("fn_o2d_sync_order_stage", { p_order_id: orderDbId });
    }

    return insertedPayment;
  } catch (err) {
    console.error("[o2dApi] savePaymentRecord error:", err);
    throw err;
  }
}
