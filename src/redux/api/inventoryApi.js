// src/redux/api/inventoryApi.js
import supabase from "../../SupabaseClient";

const defaultUnits = [];
const defaultLocations = [];
// locations are stored as { location, division } — division is the Firm the location belongs to.
const defaultLocationObjects = [];
const defaultMaterialNames = [];
const defaultFinishedGoodsNames = [];

const nowStr = () => new Date().toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

// Mappings between Database (snake_case) and Redux UI (camelCase)
const mapDBUserToUI = (u) => ({
  name: u.user_name || '',
  password: u.password || '',
  role: u.role || 'Viewer',
  department: u.department || 'General',
  location: u.location || '',
  pages: u.page_access === 'all' ? 'all' : (u.page_access ? u.page_access.split(',').map(p => p.trim()) : [])
});

const mapUIUserToDB = (u) => ({
  user_name: u.name,
  password: u.password,
  role: u.role,
  department: u.department,
  location: u.location || null,
  page_access: Array.isArray(u.pages) ? u.pages.join(',') : u.pages
});

const mapDBMaterialToUI = (m) => ({
  sku: m.sku,
  name: m.name,
  category: m.category,
  subCategory: m.sub_category || '',
  materialType: m.material_type || 'RM',
  unit: m.unit,
  location: m.location || '',
  division: m.division || '',
  opening: Number(m.opening) || 0,
  adc: Number(m.adc) || 0,
  leadTime: Number(m.lead_time) || 0,
  safetyFactor: Number(m.safety_factor) || 0,
  moq: Number(m.moq) || 0,
  supplierName: m.supplier_name || '',
  supplierCode: m.supplier_code || '',
  status: m.status || 'Active'
});

const mapUIMaterialToDB = (m) => ({
  sku: m.sku,
  name: m.name,
  category: (m.materialType === 'RM' || m.material_type === 'RM') ? 'Raw Material' : (m.category || 'Raw Material'),
  sub_category: m.subCategory || null,
  material_type: m.materialType || 'RM',
  unit: m.unit,
  location: m.location || null,
  division: m.division || null,
  opening: Number(m.opening) || 0,
  adc: Number(m.adc) || 0,
  lead_time: Number(m.leadTime) || 0,
  safety_factor: Number(m.safetyFactor) || 0,
  moq: Number(m.moq) || 0,
  supplier_name: m.supplierName || null,
  supplier_code: m.supplierCode || null,
  status: m.status || 'Active'
});

const mapDBTxnToUI = (t) => ({
  id: t.id,
  date: t.date,
  sku: t.sku,
  name: t.name,
  materialType: t.material_type || 'RM',
  qty: Number(t.qty) || 0,
  scraps: Number(t.scraps) || 0,
  type: t.type,
  ref: t.ref || '',
  remarks: t.remarks || '',
  user: t.user_name || '',
  firm: t.firm || '',
  isJobCard: t.is_job_card || false,
  jobCardId: t.job_card_id || '',
  fgSku: t.fg_sku || '',
  billingDate: t.billing_date || '',
  receivingDate: t.receiving_date || '',
  partyName: t.party_name || '',
  destination: t.destination || '',
  challanNo: t.challan_no || '',
  invoiceNo: t.invoice_no || '',
  vehicleNo: t.vehicle_no || '',
  fgCategory: t.fg_category || ''
});

const mapUITxnToDB = (t) => ({
  id: t.id,
  date: t.date,
  sku: t.sku,
  name: t.name,
  material_type: t.materialType || 'RM',
  qty: Number(t.qty) || 0,
  scraps: t.scraps !== undefined ? Number(t.scraps) : null,
  type: t.type,
  movement_type: t.type === 'Job Card' ? 'Job Card' : t.type,
  ref: t.ref || null,
  remarks: t.remarks || null,
  user_name: t.user,
  firm: t.firm || null,
  is_job_card: t.isJobCard || false,
  job_card_id: t.jobCardId || null,
  fg_sku: t.fgSku || null,
  billing_date: t.billingDate || null,
  receiving_date: t.receivingDate || null,
  party_name: t.partyName || null,
  destination: t.destination || null,
  challan_no: t.challanNo || null,
  invoice_no: t.invoiceNo || null,
  vehicle_no: t.vehicleNo || null,
  fg_category: t.fgCategory || null
});

const mapDBIndentToUI = (i) => ({
  indentNo: i.indent_no,
  date: i.date,
  requestedBy: i.requested_by,
  department: i.department,
  sku: i.sku,
  name: i.name,
  materialType: i.material_type || 'RM',
  source: i.source || 'Manual',
  currentStock: Number(i.current_stock) || 0,
  reorderQty: Number(i.reorder_qty) || 0,
  supplierName: i.supplier_name || '',
  status: i.status || 'Pending',
  firm: i.firm || ''
});

const mapUIIndentToDB = (i) => ({
  indent_no: i.indentNo,
  date: i.date,
  requested_by: i.requestedBy,
  department: i.department,
  sku: i.sku,
  name: i.name,
  material_type: i.materialType || 'RM',
  source: i.source || 'Manual',
  current_stock: Number(i.currentStock) || 0,
  reorder_qty: Number(i.reorderQty) || 0,
  supplier_name: i.supplierName || null,
  status: i.status || 'Pending',
  firm: i.firm || null
});

const mapDBSettingsToUI = (s) => ({
  pageSize: {
    master: s ? Number(s.page_size_master) : 6,
    txn: s ? Number(s.page_size_txn) : 6,
    stock: s ? Number(s.page_size_stock) : 6
  }
});

const mapUISettingsToDB = (s) => ({
  id: 1,
  page_size_master: s?.pageSize?.master || 6,
  page_size_txn: s?.pageSize?.txn || 6,
  page_size_stock: s?.pageSize?.stock || 6
});

const mapDBAuditToUI = (a) => ({
  ts: a.ts,
  action: a.action,
  user: a.user_name || '',
  detail: a.detail || ''
});

const mapUIAuditToDB = (a) => ({
  action: a.action,
  user_name: a.user,
  detail: a.detail
});

// Helper: Write Audit Log to DB
const writeAudit = async (action, user, detail) => {
  const dbAudit = mapUIAuditToDB({ action, user, detail });
  await supabase.from('inventory_audit').insert(dbAudit);
};

// Seed utility generator for local code reset trigger
function seedInitialData() {
  const materials = [
    { sku: 'SKU-1001', name: 'Steel Rod 12mm', category: 'Raw Material', subCategory: 'Metals', unit: 'KG', adc: 120, leadTime: 7, safetyFactor: 3, moq: 500, supplierName: 'Tata Steel', supplierCode: 'SUP-001', location: 'WH-A / Rack 1', opening: 1800, status: 'Active' },
    { sku: 'SKU-1002', name: 'Copper Wire 2.5mm', category: 'Raw Material', subCategory: 'Electricals', unit: 'MTR', adc: 300, leadTime: 5, safetyFactor: 4, moq: 1000, supplierName: 'Polycab', supplierCode: 'SUP-002', location: 'WH-A / Rack 4', opening: 4200, status: 'Active' },
    { sku: 'SKU-1003', name: 'Plastic Granules PP', category: 'Raw Material', subCategory: 'Polymers', unit: 'KG', adc: 80, leadTime: 10, safetyFactor: 2, moq: 300, supplierName: 'Reliance Polymers', supplierCode: 'SUP-003', location: 'WH-B / Rack 2', opening: 560, status: 'Active' },
    { sku: 'SKU-1004', name: 'Packaging Carton (L)', category: 'Packing Material', subCategory: 'Cartons', unit: 'PCS', adc: 450, leadTime: 4, safetyFactor: 3, moq: 2000, supplierName: 'Indo Pack', supplierCode: 'SUP-004', location: 'WH-C / Rack 1', opening: 1200, status: 'Active' },
    { sku: 'SKU-1005', name: 'Industrial Bearings 6204', category: 'Components', subCategory: 'Mechanical', unit: 'PCS', adc: 25, leadTime: 14, safetyFactor: 5, moq: 200, supplierName: 'SKF India', supplierCode: 'SUP-005', location: 'WH-A / Rack 7', opening: 90, status: 'Active' },
    { sku: 'SKU-1006', name: 'Lubricant Oil 20L', category: 'Consumables', subCategory: 'Maintenance', unit: 'LTR', adc: 15, leadTime: 6, safetyFactor: 2, moq: 100, supplierName: 'Castrol', supplierCode: 'SUP-006', location: 'WH-B / Rack 5', opening: 340, status: 'Active' },
    { sku: 'SKU-1007', name: 'Stainless Sheet 2mm', category: 'Raw Material', subCategory: 'Metals', unit: 'KG', adc: 60, leadTime: 9, safetyFactor: 3, moq: 400, supplierName: 'Jindal Steel', supplierCode: 'SUP-007', location: 'WH-A / Rack 2', opening: 75, status: 'Active' },
    { sku: 'SKU-1008', name: 'Cardboard Box (S)', category: 'Packing Material', subCategory: 'Cartons', unit: 'PCS', adc: 600, leadTime: 3, safetyFactor: 3, moq: 2500, supplierName: 'Indo Pack', supplierCode: 'SUP-004', location: 'WH-C / Rack 2', opening: 5400, status: 'Active' },
    { sku: 'SKU-1009', name: 'Hydraulic Hose 1in', category: 'Components', subCategory: 'Mechanical', unit: 'MTR', adc: 18, leadTime: 12, safetyFactor: 4, moq: 150, supplierName: 'Parker Hannifin', supplierCode: 'SUP-008', location: 'WH-A / Rack 9', opening: 40, status: 'Active' },
    { sku: 'SKU-1010', name: 'LED Driver 24V', category: 'Electronics', subCategory: 'Power', unit: 'PCS', adc: 35, leadTime: 8, safetyFactor: 3, moq: 300, supplierName: 'Philips', supplierCode: 'SUP-009', location: 'WH-D / Rack 1', opening: 0, status: 'Inactive' },
  ];

  const transactions = [];
  let txnSeq = 1;
  const days = 30;

  materials.forEach(m => {
    // Add consumption transactions
    for (let d = days; d >= 1; d -= Math.ceil(days / 6)) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      transactions.push({
        id: 'TXN-' + String(txnSeq++).padStart(5, '0'),
        date,
        sku: m.sku,
        name: m.name,
        qty: Math.round(m.adc * 1.6 * (0.7 + Math.random() * 0.6)),
        type: 'OUT',
        ref: 'WO-' + Math.floor(1000 + Math.random() * 9000),
        remarks: 'Production consumption',
        user: 'Priya Sharma'
      });
    }
    // Add restock transactions
    transactions.push({
      id: 'TXN-' + String(txnSeq++).padStart(5, '0'),
      date: new Date(Date.now() - 18 * 86400000).toISOString().slice(0, 10),
      sku: m.sku,
      name: m.name,
      qty: Math.round(m.moq * 0.5),
      type: 'IN',
      ref: 'GRN-' + Math.floor(1000 + Math.random() * 9000),
      remarks: 'Goods received from supplier',
      user: 'Arjun Mehta'
    });
  });

  return {
    materials,
    transactions,
    settings: { pageSize: { master: 6, txn: 6, stock: 6 } },
    units: defaultUnits,
    locations: defaultLocations
  };
}

// ------------------------------------------
// API ENDPOINTS CONNECTING FRONTEND TO SUPABASE
// ------------------------------------------

export const fetchInventoryDataApi = async () => {
  try {
    const [
      resMaterials,
      resTransactions,
      resIndents,
      resUnits,
      resLocations,
      resCategories,
      resFinishedGoods,
      resRawMaterials,
      resSettings,
      resUsers,
      resAudit,
      resDivisions,
      resJobCardBatches
    ] = await Promise.all([
      supabase.from('inventory_materials').select('*'),
      supabase.from('inventory_transactions').select('*'),
      supabase.from('inventory_indents').select('*'),
      supabase.from('inventory_units').select('unit'),
      supabase.from('inventory_locations').select('location, division'),
      supabase.from('inventory_categories').select('id, name, division, material_type'),
      supabase.from('inventory_finished_goods').select('id, sku, name, category, division, status'),
      supabase.from('inventory_raw_materials').select('id, sku, name, status'),
      supabase.from('inventory_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('users').select('*'),
      supabase.from('inventory_audit').select('*').order('ts', { ascending: false }).limit(300),
      supabase.from('divisions').select('*').order('name', { ascending: true }),
      supabase.from('inventory_job_card_batches').select('*').order('created_at', { ascending: false })
    ]);

    const errors = [
      resMaterials.error,
      resTransactions.error,
      resIndents.error,
      resUnits.error,
      resLocations.error,
      resCategories.error,
      resFinishedGoods?.error && !resFinishedGoods.error.message.includes('relation "public.inventory_finished_goods" does not exist') ? resFinishedGoods.error : null,
      resRawMaterials?.error && !resRawMaterials.error.message.includes('relation "public.inventory_raw_materials" does not exist') ? resRawMaterials.error : null,
      resSettings.error,
      resUsers.error,
      resAudit.error,
      resDivisions.error,
      resJobCardBatches?.error && !resJobCardBatches.error.message.includes('relation "public.inventory_job_card_batches" does not exist') ? resJobCardBatches.error : null
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join(' | '));
    }

    const units = resUnits.data && resUnits.data.length > 0 ? resUnits.data.map(r => r.unit) : [];
    // locations: array of { location, division } — division is the Firm the location belongs to
    const locations = resLocations.data && resLocations.data.length > 0
      ? resLocations.data.map(r => ({ location: r.location, division: r.division || null }))
      : [];
    const divisions = resDivisions.data || [];
    const settings = resSettings.data ? mapDBSettingsToUI(resSettings.data) : { pageSize: { master: 6, txn: 6, stock: 6 } };

    let materialNames = [];
    if (resRawMaterials?.data && resRawMaterials.data.length > 0) {
      materialNames = resRawMaterials.data.map(r => ({
        id: r.id,
        sku: r.sku || '',
        name: r.name,
        status: r.status || 'Active'
      }));
    } else {
      const dbRmMaterials = (resMaterials.data || []).filter(
        m => m.material_type === 'RM' || (m.category && m.category !== 'Finished Goods')
      );
      if (dbRmMaterials.length > 0) {
        materialNames = dbRmMaterials.map(m => ({ sku: m.sku || '', name: m.name || m.category || '' }));
      } else {
        const local = localStorage.getItem('sp_custom_material_names');
        if (local) {
          try {
            materialNames = JSON.parse(local);
          } catch {}
        }
      }
    }

    let finishedGoodsNames = [];
    if (resFinishedGoods?.data) {
      finishedGoodsNames = resFinishedGoods.data.map(r => ({
        id: r.id,
        sku: r.sku || null,
        name: r.name,
        category: r.category || 'Finished Goods',
        division: r.division || null,
        status: r.status || 'Active'
      }));
    } else {
      const localFg = localStorage.getItem('sp_custom_finished_goods_names');
      if (localFg !== null) {
        try {
          finishedGoodsNames = JSON.parse(localFg);
        } catch {
          finishedGoodsNames = [];
        }
      } else {
        finishedGoodsNames = [];
      }
    }

    const categories = resCategories.data
      ? resCategories.data.map(r => ({ id: r.id, name: r.name, division: r.division || null, materialType: r.material_type || 'ALL' }))
      : [];

    return {
      data: {
        materials: (resMaterials.data || []).map(mapDBMaterialToUI),
        transactions: (resTransactions.data || []).map(mapDBTxnToUI),
        indents: (resIndents.data || []).map(mapDBIndentToUI),
        units,
        locations,
        divisions,
        materialNames,
        finishedGoodsNames,
        categories,
        settings,
        users: (resUsers.data || []).map(mapDBUserToUI),
        audit: (resAudit.data || []).map(mapDBAuditToUI),
        jobCardBatches: resJobCardBatches?.data || []
      },
      error: null
    };
  } catch (err) {
    console.error("fetchInventoryDataApi failed", err);
    return { data: null, error: err.message };
  }
};

export const saveMaterialApi = async (materialData, currentUser = 'Admin') => {
  try {
    const dbMaterial = mapUIMaterialToDB(materialData);
    const existing = await supabase.from('inventory_materials').select('opening').eq('sku', materialData.sku).maybeSingle();

    if (existing.data) {
      dbMaterial.opening = existing.data.opening;
    }

    // Auto-ensure category exists in inventory_categories to satisfy fk_inventory_materials_category constraint
    if (dbMaterial.category && dbMaterial.category.trim()) {
      const catName = dbMaterial.category.trim();
      const { data: catExists } = await supabase
        .from('inventory_categories')
        .select('id')
        .eq('name', catName)
        .maybeSingle();

      if (!catExists) {
        await supabase
          .from('inventory_categories')
          .insert({
            name: catName,
            division: dbMaterial.division || null,
            material_type: dbMaterial.material_type || 'ALL'
          });
      }
    }

    const { error } = await supabase.from('inventory_materials').upsert(dbMaterial);
    if (error) throw new Error(error.message);

    // If sub_category is filled (Finished Goods), sync to inventory_finished_goods
    if (dbMaterial.sub_category && dbMaterial.sub_category.trim()) {
      const fgName = dbMaterial.sub_category.trim();
      const fgCategory = dbMaterial.category || 'Finished Goods';
      const fgDivision = dbMaterial.division || null;
      const fgStatus = dbMaterial.status || 'Active';
      const now = new Date().toISOString();

      try {
        let existingFg = null;

        // Try matching by SKU first
        if (dbMaterial.sku) {
          const { data: bySku } = await supabase
            .from('inventory_finished_goods')
            .select('id')
            .eq('sku', dbMaterial.sku)
            .maybeSingle();
          existingFg = bySku;
        }

        // Fall back to matching by Name if not matched by SKU
        if (!existingFg) {
          const { data: byName } = await supabase
            .from('inventory_finished_goods')
            .select('id')
            .ilike('name', fgName)
            .maybeSingle();
          existingFg = byName;
        }

        if (existingFg) {
          await supabase
            .from('inventory_finished_goods')
            .update({
              sku: dbMaterial.sku,
              name: fgName,
              category: fgCategory,
              division: fgDivision,
              status: fgStatus,
              updated_at: now,
            })
            .eq('id', existingFg.id);
        } else {
          await supabase
            .from('inventory_finished_goods')
            .insert({
              sku: dbMaterial.sku,
              name: fgName,
              category: fgCategory,
              division: fgDivision,
              status: fgStatus,
              created_at: now,
              updated_at: now,
            });
        }
      } catch (fgErr) {
        console.warn("Sync to inventory_finished_goods failed:", fgErr.message);
      }
    }

    // If material_type === 'RM' and name is provided, sync to custom material names list
    if ((dbMaterial.material_type === 'RM' || !dbMaterial.sub_category) && dbMaterial.name) {
      try {
        const rmName = dbMaterial.name.trim();
        const rmSku = (dbMaterial.sku || '').trim();
        let currentRmList = [];
        const local = localStorage.getItem('sp_custom_material_names');
        if (local) {
          try { currentRmList = JSON.parse(local); } catch {}
        }
        const existingIdx = currentRmList.findIndex(item => {
          const nameStr = typeof item === 'string' ? item : item.name;
          return nameStr.toLowerCase() === rmName.toLowerCase();
        });
        if (existingIdx >= 0) {
          if (typeof currentRmList[existingIdx] === 'object' && rmSku) {
            currentRmList[existingIdx].sku = rmSku;
          } else if (typeof currentRmList[existingIdx] === 'string' && rmSku) {
            currentRmList[existingIdx] = { sku: rmSku, name: rmName };
          }
        } else {
          currentRmList.push({ sku: rmSku, name: rmName });
        }
        localStorage.setItem('sp_custom_material_names', JSON.stringify(currentRmList));
      } catch (rmErr) {
        console.warn("Sync to sp_custom_material_names failed:", rmErr.message);
      }
    }

    const action = existing.data ? 'Material updated' : 'Material created';
    const detail = existing.data 
      ? `SKU ${materialData.sku} master data edited.`
      : `New SKU ${materialData.sku} (${materialData.name}) added.`;
    await writeAudit(action, currentUser, detail);

    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("saveMaterialApi failed", err);
    return { data: null, error: err.message };
  }
};

export const deleteMaterialApi = async (sku, currentUser = 'Admin') => {
  try {
    const { error } = await supabase.from('inventory_materials').delete().eq('sku', sku);
    if (error) throw new Error(error.message);

    await writeAudit('Material deleted', currentUser, `SKU ${sku} removed from master data.`);
    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("deleteMaterialApi failed", err);
    return { data: null, error: err.message };
  }
};

export const postTransactionApi = async (transactionData, currentUser = 'Admin') => {
  try {
    const { data: txns, error: queryErr } = await supabase
      .from('inventory_transactions')
      .select('id')
      .like('id', 'TXN-%');

    if (queryErr) throw new Error(queryErr.message);

    let nextNum = 1;
    if (txns && txns.length > 0) {
      const nums = txns
        .map(t => {
          const match = t.id.match(/^TXN-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    }
    const nextTxnId = 'TXN-' + String(nextNum).padStart(5, '0');

    const dbTxn = mapUITxnToDB({
      ...transactionData,
      id: nextTxnId
    });

    const { error } = await supabase.from('inventory_transactions').insert(dbTxn);
    if (error) throw new Error(error.message);

    // Save Job Card batch details if provided
    if (transactionData.batches && Array.isArray(transactionData.batches) && transactionData.batches.length > 0) {
      const batchRows = [];
      transactionData.batches.forEach((batch, batchIdx) => {
        const batchNum = batchIdx + 1;
        const numBatches = batch.numBatches || null;
        const remainingBatches = batch.remainingBatches || null;
        const remainingMaterial = batch.remainingMaterial || null;

        (batch.materials || []).forEach((m) => {
          if (m.sku) {
            batchRows.push({
              transaction_id: dbTxn.id,
              batch_number: batchNum,
              sku: m.sku,
              material_name: m.name || m.sku,
              qty: Number(m.qty) || 0,
              num_batches: numBatches,
              remaining_batches: remainingBatches,
              remaining_material: remainingMaterial,
            });
          }
        });
      });

      if (batchRows.length > 0) {
        const { error: batchErr } = await supabase.from('inventory_job_card_batches').insert(batchRows);
        if (batchErr) {
          console.error("Failed to insert inventory_job_card_batches", batchErr);
        }
      }
    }

    const detail = `${dbTxn.type} ${dbTxn.qty} of SKU ${dbTxn.sku} (${dbTxn.name}) — ${dbTxn.id}`;
    await writeAudit('Transaction posted', currentUser, detail);

    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("postTransactionApi failed", err);
    return { data: null, error: err.message };
  }
};

export const createIndentsApi = async (indentItems, requestedBy, department, currentUser = 'Admin') => {
  try {
    const { data: indents, error: queryErr } = await supabase
      .from('inventory_indents')
      .select('indent_no')
      .like('indent_no', 'IND-%');

    if (queryErr) throw new Error(queryErr.message);

    let nextSeq = 1;
    if (indents && indents.length > 0) {
      const seqs = indents
        .map(i => {
          const match = i.indent_no.match(/^IND-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(s => s > 0);
      if (seqs.length > 0) {
        nextSeq = Math.max(...seqs) + 1;
      }
    }

    const dbIndents = [];
    const created = [];

    indentItems.forEach(item => {
      const indentNo = 'IND-' + String(nextSeq++).padStart(4, '0');
      const newIndent = {
        indentNo,
        date: today(),
        requestedBy,
        department,
        sku: item.sku,
        name: item.name,
        closingStock: item.closingStock,
        reorderQty: item.reorderQty,
        supplierName: item.supplierName || '—',
        status: 'Pending',
        firm: item.division || ''
      };
      dbIndents.push(mapUIIndentToDB(newIndent));
      created.push(newIndent);
    });

    const { error } = await supabase.from('inventory_indents').insert(dbIndents);
    if (error) throw new Error(error.message);

    const detail = `${created.length} indent(s) created by ${requestedBy} for ${department}.`;
    await writeAudit('Indent(s) generated', currentUser, detail);

    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("createIndentsApi failed", err);
    return { data: null, error: err.message };
  }
};

export const updateIndentStatusApi = async (indentNo, status, currentUser = 'Admin') => {
  try {
    const { error } = await supabase
      .from('inventory_indents')
      .update({ status })
      .eq('indent_no', indentNo);

    if (error) throw new Error(error.message);

    await writeAudit('Indent status updated', currentUser, `${indentNo} marked as "${status}".`);
    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("updateIndentStatusApi failed", err);
    return { data: null, error: err.message };
  }
};

export const saveSettingsApi = async (settings, currentUser = 'Admin') => {
  try {
    const dbSettings = mapUISettingsToDB(settings);
    const { error } = await supabase.from('inventory_settings').upsert(dbSettings);
    if (error) throw new Error(error.message);

    await writeAudit('Settings updated', currentUser, 'Pagination preferences changed.');
    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("saveSettingsApi failed", err);
    return { data: null, error: err.message };
  }
};

export const saveListApi = async (type, newList, currentUser = 'Admin') => {
  try {
    if (type === 'units') {
      const { error: delError } = await supabase.from('inventory_units').delete().neq('id', 0);
      if (delError) throw new Error(delError.message);

      if (newList.length > 0) {
        const { error: insError } = await supabase
          .from('inventory_units')
          .insert(newList.map(u => ({ unit: u })));
        if (insError) throw new Error(insError.message);
      }
      await writeAudit('Units list updated', currentUser, `Custom units list saved.`);
    } else if (type === 'locations') {
      const { error: delError } = await supabase.from('inventory_locations').delete().neq('id', 0);
      if (delError) throw new Error(delError.message);

      if (newList.length > 0) {
        const { error: insError } = await supabase
          .from('inventory_locations')
          .insert(newList.map(l => ({ location: l.location, division: l.division || null })));
        if (insError) throw new Error(insError.message);
      }
      await writeAudit('Locations list updated', currentUser, `Custom locations list saved.`);
    } else if (type === 'materialNames') {
      const normalizedNewList = newList.map(rm => ({
        sku: typeof rm === 'string' ? '' : (rm.sku || '').trim(),
        name: typeof rm === 'string' ? rm.trim() : (rm.name || '').trim()
      })).filter(item => item.name);

      // Fetch existing RM materials in DB table inventory_raw_materials
      const { data: dbCurrentRm, error: fetchErr } = await supabase
        .from('inventory_raw_materials')
        .select('id, sku, name, status');

      if (!fetchErr && dbCurrentRm) {
        const existingDb = dbCurrentRm;

        // 1. Insert new items
        const toInsert = normalizedNewList.filter(
          newItem => !existingDb.some(dbItem => dbItem.name.toLowerCase() === newItem.name.toLowerCase() || (newItem.sku && dbItem.sku && dbItem.sku.toLowerCase() === newItem.sku.toLowerCase()))
        );

        if (toInsert.length > 0) {
          const { error: insErr } = await supabase
            .from('inventory_raw_materials')
            .insert(toInsert.map(item => ({
              sku: item.sku || `RM-${Math.floor(10000 + Math.random() * 90000)}`,
              name: item.name,
              status: 'Active'
            })));
          if (insErr) {
            console.error("Failed adding raw materials to inventory_raw_materials:", insErr.message);
            throw new Error(`Failed adding raw materials: ${insErr.message}`);
          }
        }

        // 2. Delete removed items
        const toDelete = existingDb.filter(
          dbItem => !normalizedNewList.some(newItem => newItem.name.toLowerCase() === dbItem.name.toLowerCase() || (newItem.sku && dbItem.sku && dbItem.sku.toLowerCase() === newItem.sku.toLowerCase()))
        );

        if (toDelete.length > 0) {
          const idsToDelete = toDelete.map(d => d.id);
          const { error: delErr } = await supabase
            .from('inventory_raw_materials')
            .delete()
            .in('id', idsToDelete);
          if (delErr) {
            console.error("Failed deleting raw materials from inventory_raw_materials:", delErr.message);
            throw new Error(`Failed deleting raw materials: ${delErr.message}`);
          }
        }

        // 3. Update existing items
        for (const newItem of normalizedNewList) {
          const match = existingDb.find(d => d.name.toLowerCase() === newItem.name.toLowerCase() || (newItem.sku && d.sku && d.sku.toLowerCase() === newItem.sku.toLowerCase()));
          if (match && ((newItem.sku && match.sku !== newItem.sku) || match.name !== newItem.name)) {
            await supabase
              .from('inventory_raw_materials')
              .update({ sku: newItem.sku || match.sku, name: newItem.name })
              .eq('id', match.id);
          }
        }
      }

      localStorage.setItem('sp_custom_material_names', JSON.stringify(newList));
      await writeAudit('Material names list updated', currentUser, `Custom material names list saved.`);
    } else if (type === 'finishedGoodsNames') {
      const normalizedNewList = newList.map(fg => ({
        sku: typeof fg === 'string' ? null : (fg.sku || null),
        name: typeof fg === 'string' ? fg : fg.name,
        category: typeof fg === 'string' ? 'Finished Goods' : (fg.category || 'Finished Goods')
      }));

      // Fetch actual current finished goods in DB
      const { data: dbCurrentFg, error: fetchErr } = await supabase
        .from('inventory_finished_goods')
        .select('id, sku, name, category');

      if (!fetchErr && dbCurrentFg) {
        const existingDb = dbCurrentFg;

        // 1. Insert new items that do NOT exist in DB
        const toInsert = normalizedNewList.filter(
          newItem => !existingDb.some(dbItem => dbItem.name.toLowerCase() === newItem.name.toLowerCase())
        );

        if (toInsert.length > 0) {
          const { error: insErr } = await supabase
            .from('inventory_finished_goods')
            .insert(toInsert.map(item => ({ sku: item.sku || null, name: item.name, category: item.category, status: 'Active' })));
          if (insErr) throw new Error(`Failed to add finished goods: ${insErr.message}`);
        }

        // 2. Delete removed items that are no longer in normalizedNewList
        const toDelete = existingDb.filter(
          dbItem => !normalizedNewList.some(newItem => newItem.name.toLowerCase() === dbItem.name.toLowerCase())
        );

        if (toDelete.length > 0) {
          const idsToDelete = toDelete.map(d => d.id);
          const { error: delErr } = await supabase
            .from('inventory_finished_goods')
            .delete()
            .in('id', idsToDelete);
          if (delErr) throw new Error(`Failed to delete finished goods: ${delErr.message}`);
        }

        // 3. Update sku & categories if changed for existing items
        for (const newItem of normalizedNewList) {
          const matchingDb = existingDb.find(d => d.name.toLowerCase() === newItem.name.toLowerCase());
          if (matchingDb && (matchingDb.category !== newItem.category || (matchingDb.sku || null) !== (newItem.sku || null))) {
            await supabase
              .from('inventory_finished_goods')
              .update({ category: newItem.category, sku: newItem.sku || null })
              .eq('id', matchingDb.id);
          }
        }
      }

      localStorage.setItem('sp_custom_finished_goods_names', JSON.stringify(newList));
      await writeAudit('Finished goods names list updated', currentUser, `Custom finished goods names list saved.`);
    } else if (type === 'categories') {
      const userName = currentUser || 'Admin';
      const normalizedNewList = newList.map(c => ({
        name: typeof c === 'string' ? c : c.name,
        division: typeof c === 'string' ? null : (c.division || null),
        material_type: typeof c === 'string' ? 'FG' : (c.material_type || 'FG')
      }));

      // Fetch actual current categories in DB
      const { data: dbCurrentCats, error: fetchErr } = await supabase
        .from('inventory_categories')
        .select('id, name, division');

      if (fetchErr) throw new Error(fetchErr.message);

      const existingDb = dbCurrentCats || [];

      // 1. Insert new categories (items in normalizedNewList that do NOT exist in DB by name & division)
      const toInsert = normalizedNewList.filter(
        newItem => !existingDb.some(dbItem => dbItem.name.toLowerCase() === newItem.name.toLowerCase() && (dbItem.division || null) === newItem.division)
      );

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('inventory_categories')
          .insert(toInsert);
        if (insErr) throw new Error(`Failed to add category: ${insErr.message}`);
      }

      // 2. Delete removed categories (items in DB that are NO LONGER in normalizedNewList)
      const toDelete = existingDb.filter(
        dbItem => !normalizedNewList.some(newItem => newItem.name.toLowerCase() === dbItem.name.toLowerCase())
      );

      if (toDelete.length > 0) {
        for (const delItem of toDelete) {
          // Unlink any materials assigned to this category name first so foreign key doesn't block deletion
          if (delItem.name) {
            const { error: unlinkErr } = await supabase
              .from('inventory_materials')
              .update({ category: null })
              .eq('category', delItem.name);

            // If NOT NULL constraint exists on inventory_materials.category column, fallback to 'Unassigned'
            if (unlinkErr && (unlinkErr.message.includes('not-null') || unlinkErr.code === '23502')) {
              await supabase
                .from('inventory_materials')
                .update({ category: 'Unassigned' })
                .eq('category', delItem.name);
            }
          }

          const { error: delErr } = await supabase
            .from('inventory_categories')
            .delete()
            .eq('id', delItem.id);
          if (delErr) {
            throw new Error(`Failed to delete category "${delItem.name}": ${delErr.message}`);
          }
        }
      }



      localStorage.setItem('sp_custom_categories', JSON.stringify(newList));
      await writeAudit('Categories list updated', userName, `Custom categories list saved.`);
    }


    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("saveListApi failed", err);
    return { data: null, error: err.message };
  }
};

export const saveUsersApi = async (users, currentUser = 'Admin') => {
  try {
    const dbUsers = users.map(mapUIUserToDB);

    const { data: dbCurrent, error: queryErr } = await supabase.from('users').select('user_name');
    if (queryErr) throw new Error(queryErr.message);

    const currentNames = dbCurrent ? dbCurrent.map(u => u.user_name) : [];
    const newNames = dbUsers.map(u => u.user_name.toLowerCase());
    const toDelete = currentNames.filter(name => name && !newNames.includes(name.toLowerCase()));

    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from('users')
        .delete()
        .in('user_name', toDelete);
      if (delError) throw new Error(delError.message);
    }

    for (const user of dbUsers) {
      if (!user.user_name) continue;
      const { data: existing, error: findErr } = await supabase
        .from('users')
        .select('id')
        .eq('user_name', user.user_name)
        .maybeSingle();

      if (findErr) throw new Error(findErr.message);

      if (existing) {
        const { error: updErr } = await supabase
          .from('users')
          .update(user)
          .eq('id', existing.id);
        if (updErr) throw new Error(updErr.message);
      } else {
        const { error: insErr } = await supabase
          .from('users')
          .insert(user);
        if (insErr) throw new Error(insErr.message);
      }
    }

    await writeAudit('Users updated', currentUser, 'User accounts updated.');
    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("saveUsersApi failed", err);
    return { data: null, error: err.message };
  }
};

export const logAuditApi = async (action, detail, currentUser = 'Admin') => {
  try {
    await writeAudit(action, currentUser, detail);
    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("logAuditApi failed", err);
    return { data: null, error: err.message };
  }
};

export const resetToDummyDataApi = async (currentUser = 'Admin') => {
  try {
    // Delete all records from all tables
    await Promise.all([
      supabase.from('inventory_materials').delete().neq('sku', ''),
      supabase.from('inventory_transactions').delete().neq('id', ''),
      supabase.from('inventory_indents').delete().neq('indent_no', ''),
      supabase.from('inventory_units').delete().neq('id', 0),
      supabase.from('inventory_locations').delete().neq('id', 0),
      supabase.from('inventory_settings').delete().neq('id', 0),
      supabase.from('inventory_audit').delete().neq('id', 0)
    ]);

    const fresh = seedInitialData();

    // 1. Save materials
    const dbMaterials = fresh.materials.map(mapUIMaterialToDB);
    const { error: matErr } = await supabase.from('inventory_materials').insert(dbMaterials);
    if (matErr) throw new Error(matErr.message);

    // 2. Save transactions
    const dbTxns = fresh.transactions.map(mapUITxnToDB);
    const { error: txnErr } = await supabase.from('inventory_transactions').insert(dbTxns);
    if (txnErr) throw new Error(txnErr.message);

    // 3. Save units
    const { error: unitErr } = await supabase.from('inventory_units').insert(fresh.units.map(u => ({ unit: u })));
    if (unitErr) throw new Error(unitErr.message);

    // 4. Save locations
    const { error: locErr } = await supabase.from('inventory_locations').insert(fresh.locations.map(l => ({ location: l, division: null })));
    if (locErr) throw new Error(locErr.message);

    // 5. Save settings
    const dbSettings = mapUISettingsToDB(fresh.settings);
    const { error: setErr } = await supabase.from('inventory_settings').insert(dbSettings);
    if (setErr) throw new Error(setErr.message);

    // 6. Write database reset audit log
    await writeAudit('Database Reset', currentUser, 'All tables reset to system default dummy seed configuration.');

    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("resetToDummyDataApi failed", err);
    return { data: null, error: err.message };
  }
};

export const fetchRecycleApi = async () => {
  try {
    const { data, error } = await supabase
      .from('inventory_recycle')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { data, error: null };
  } catch (err) {
    console.error("fetchRecycleApi failed", err);
    return { data: [], error: err.message };
  }
};

export const saveRecycleApi = async (record, file, currentUser = 'Admin') => {
  try {
    let attachment_url = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('inventory-attachments')
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw new Error(`Attachment upload failed: ${uploadErr.message}`);

      const { data: publicUrlData } = supabase.storage
        .from('inventory-attachments')
        .getPublicUrl(uploadData.path);

      attachment_url = publicUrlData?.publicUrl || null;
    }

    const { data, error } = await supabase
      .from('inventory_recycle')
      .insert([{
        recycle_type: record.recycleType,
        firm: record.firm || null,
        material_name: record.materialName,
        material_sku: record.materialSku || null,
        quantity: Number(record.quantity) || 0,
        damage_type: record.damageType,
        date: record.date,
        reason: record.reason || null,
        approved_by: record.approvedBy || currentUser,
        attachment_url,
        status: 'pending'
      }])
      .select();

    if (error) throw new Error(error.message);

    await writeAudit('Recycle recorded', currentUser, `Recycled ${record.quantity} of ${record.materialName} (${record.damageType})`);

    return { data, error: null };
  } catch (err) {
    console.error("saveRecycleApi failed", err);
    return { data: null, error: err.message };
  }
};

export const updateRecycleStatusApi = async (ids, status = 'completed', currentUser = 'Admin') => {
  try {
    const idArray = Array.isArray(ids) ? ids : [ids];
    const { data, error } = await supabase
      .from('inventory_recycle')
      .update({ status })
      .in('id', idArray)
      .select();

    if (error) throw new Error(error.message);

    await writeAudit('Recycle status updated', currentUser, `Marked ${idArray.length} recycle record(s) as ${status}`);

    return { data, error: null };
  } catch (err) {
    console.error("updateRecycleStatusApi failed", err);
    return { data: null, error: err.message };
  }
};
