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

const normalizeDivision = (d) => {
  if (!d) return 'ALL';
  const str = String(d).trim();
  if (str === '' || str.toLowerCase() === 'universal' || str.toLowerCase() === 'none' || str.toLowerCase() === 'all') {
    return 'ALL';
  }
  return str;
};

const mapDBMaterialToUI = (m) => ({
  id: m.id,
  sku: m.sku,
  name: m.name,
  category: m.category,
  subCategory: m.sub_category || '',
  materialType: m.material_type || 'RM',
  unit: m.unit,
  location: m.location || '',
  division: normalizeDivision(m.division),
  opening: Number(m.opening) || 0,
  adc: Number(m.adc) || 0,
  leadTime: Number(m.lead_time) || 0,
  safetyFactor: Number(m.safety_factor) || 0,
  moq: Number(m.moq) || 0,
  supplierName: m.supplier_name || '',
  supplierCode: m.supplier_code || '',
  status: m.status || 'Active',
  transferredDivision: m.transferred_division || null,
  transferredQty: Number(m.transferred_qty) || 0,
  transferDate: m.transfer_date || null,
  transferId: m.transfer_id || null
});

const mapUIMaterialToDB = (m) => {
  const dbObj = {
    sku: m.sku,
    name: m.name,
    category: (m.materialType === 'RM' || m.material_type === 'RM') ? 'Raw Material' : (m.category || 'Raw Material'),
    sub_category: m.subCategory || null,
    material_type: m.materialType || 'RM',
    unit: m.unit,
    location: m.location || null,
    division: normalizeDivision(m.division),
    opening: Number(m.opening) || 0,
    adc: Number(m.adc) || 0,
    lead_time: Number(m.leadTime) || 0,
    safety_factor: Number(m.safetyFactor) || 0,
    moq: Number(m.moq) || 0,
    supplier_name: m.supplierName || null,
    supplier_code: m.supplierCode || null,
    status: m.status || 'Active'
  };
  if (m.id !== undefined && m.id !== null && m.id !== '') {
    dbObj.id = m.id;
  }
  return dbObj;
};

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
      resMasterMaterials,
      resSettings,
      resUsers,
      resAudit,
      resDivisions,
      resJobCardBatches,
      resMaterialTypes
    ] = await Promise.all([
      supabase.from('inventory_materials').select('*'),
      supabase.from('inventory_transactions').select('*'),
      supabase.from('inventory_indents').select('*'),
      supabase.from('inventory_units').select('unit'),
      supabase.from('inventory_locations').select('location, division'),
      supabase.from('inventory_categories').select('id, name, division, material_type'),
      supabase.from('inventory_master_material').select('*').order('id', { ascending: true }),
      supabase.from('inventory_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('users').select('*'),
      supabase.from('inventory_audit').select('*').order('ts', { ascending: false }).limit(300),
      supabase.from('divisions').select('*').order('name', { ascending: true }),
      supabase.from('inventory_job_card_batches').select('*').order('created_at', { ascending: false }),
      supabase.from('material_types').select('id, type_name, type_code').order('id', { ascending: true })
    ]);

    const errors = [
      resMaterials.error,
      resTransactions.error,
      resIndents.error,
      resUnits.error,
      resLocations.error,
      resCategories.error,
      resMasterMaterials?.error && !resMasterMaterials.error.message.includes('relation "public.inventory_master_material" does not exist') ? resMasterMaterials.error : null,
      resSettings.error,
      resUsers.error,
      resAudit.error,
      resDivisions.error,
      resJobCardBatches?.error && !resJobCardBatches.error.message.includes('relation "public.inventory_job_card_batches" does not exist') ? resJobCardBatches.error : null,
      resMaterialTypes?.error && !resMaterialTypes.error.message.includes('relation "public.material_types" does not exist') ? resMaterialTypes.error : null
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

    const masterMaterials = resMasterMaterials?.data && Array.isArray(resMasterMaterials.data)
      ? resMasterMaterials.data.map(m => ({
          id: m.id,
          sku: m.sku || '',
          name: m.name || '',
          materialType: m.material_type || 'RM',
          category: m.category || (m.material_type === 'RM' ? 'Raw Material' : 'Finished Goods'),
          subCategory: m.sub_category || '',
          division: normalizeDivision(m.division),
          hsn: m.hsn_code || '',
          status: m.status || 'Active',
          createdAt: m.created_at,
          updatedAt: m.updated_at
        }))
      : [];

    let materialNames = [];
    if (masterMaterials.length > 0) {
      materialNames = masterMaterials
        .filter(m => (m.materialType || '').toUpperCase() === 'RM')
        .map(r => ({
          id: r.id,
          sku: r.sku || '',
          name: r.name,
          category: r.category || 'Raw Material',
          subCategory: r.subCategory || '',
          division: normalizeDivision(r.division),
          hsn: r.hsn || '',
          status: r.status || 'Active'
        }));
    } else {
      const dbRmMaterials = (resMaterials.data || []).filter(
        m => m.material_type === 'RM' || (m.category && m.category !== 'Finished Goods')
      );
      if (dbRmMaterials.length > 0) {
        materialNames = dbRmMaterials.map(m => ({ sku: m.sku || '', name: m.name || m.category || '', division: normalizeDivision(m.division), hsn: m.hsn || m.hsn_code || '' }));
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
    if (masterMaterials.length > 0) {
      finishedGoodsNames = masterMaterials
        .filter(m => (m.materialType || '').toUpperCase() === 'FG')
        .map(r => ({
          id: r.id,
          sku: r.sku || null,
          name: r.name,
          category: r.category || 'Finished Goods',
          subCategory: r.subCategory || '',
          division: normalizeDivision(r.division),
          hsn: r.hsn || '',
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

    let materialTypes = [];
    if (resMaterialTypes?.data && resMaterialTypes.data.length > 0) {
      materialTypes = resMaterialTypes.data.map(r => ({
        id: r.id,
        type_name: r.type_name,
        type_code: r.type_code,
        typeName: r.type_name,
        typeCode: r.type_code
      }));
    } else {
      const localMt = localStorage.getItem('sp_custom_material_types');
      if (localMt) {
        try {
          materialTypes = JSON.parse(localMt);
        } catch {
          materialTypes = [];
        }
      }
      if (!materialTypes || materialTypes.length === 0) {
        materialTypes = [
          { id: 1, type_name: 'Finished Goods', type_code: 'FG', typeName: 'Finished Goods', typeCode: 'FG' },
          { id: 2, type_name: 'Raw Material', type_code: 'RM', typeName: 'Raw Material', typeCode: 'RM' },
          { id: 3, type_name: 'Spare Parts', type_code: 'SPARE', typeName: 'Spare Parts', typeCode: 'SPARE' },
          { id: 4, type_name: 'Work In Progress', type_code: 'WIP', typeName: 'Work In Progress', typeCode: 'WIP' },
          { id: 5, type_name: 'Consumables', type_code: 'CONSUMABLE', typeName: 'Consumables', typeCode: 'CONSUMABLE' }
        ];
      }
    }

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
        masterMaterials,
        categories,
        materialTypes,
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
    let existing = null;
    if (materialData.id) {
      existing = await supabase.from('inventory_materials').select('opening').eq('id', materialData.id).maybeSingle();
    } else if (materialData.sku && materialData.division) {
      existing = await supabase.from('inventory_materials').select('opening').eq('sku', materialData.sku).eq('division', materialData.division).maybeSingle();
    } else if (materialData.sku) {
      existing = await supabase.from('inventory_materials').select('opening').eq('sku', materialData.sku).maybeSingle();
    }

    if (existing?.data) {
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

    let saveErr = null;
    if (dbMaterial.id) {
      const { error } = await supabase.from('inventory_materials').update(dbMaterial).eq('id', dbMaterial.id);
      saveErr = error;
    } else {
      const { error } = await supabase.from('inventory_materials').insert(dbMaterial);
      saveErr = error;
    }
    if (saveErr) throw new Error(saveErr.message);

    // If sub_category is filled (Finished Goods), sync to inventory_master_material
    if (dbMaterial.sub_category && dbMaterial.sub_category.trim()) {
      const fgName = dbMaterial.sub_category.trim();
      const fgCategory = dbMaterial.category || 'Finished Goods';
      const fgDivision = dbMaterial.division || null;
      const fgStatus = dbMaterial.status || 'Active';
      const now = new Date().toISOString();

      try {
        let existingMaster = null;

        // Try matching by SKU first
        if (dbMaterial.sku) {
          const { data: bySku } = await supabase
            .from('inventory_master_material')
            .select('id')
            .eq('sku', dbMaterial.sku)
            .eq('material_type', 'FG')
            .maybeSingle();
          existingMaster = bySku;
        }

        // Fall back to matching by Name if not matched by SKU
        if (!existingMaster) {
          const { data: byName } = await supabase
            .from('inventory_master_material')
            .select('id')
            .eq('material_type', 'FG')
            .ilike('name', fgName)
            .maybeSingle();
          existingMaster = byName;
        }

        if (existingMaster) {
          await supabase
            .from('inventory_master_material')
            .update({
              sku: dbMaterial.sku,
              name: fgName,
              category: fgCategory,
              sub_category: fgName,
              division: fgDivision,
              status: fgStatus,
              updated_at: now,
            })
            .eq('id', existingMaster.id);
        } else {
          await supabase
            .from('inventory_master_material')
            .insert({
              sku: dbMaterial.sku,
              name: fgName,
              material_type: 'FG',
              category: fgCategory,
              sub_category: fgName,
              division: fgDivision,
              status: fgStatus,
              created_at: now,
              updated_at: now,
            });
        }
      } catch (fgErr) {
        console.warn("Sync to inventory_master_material for FG failed:", fgErr.message);
      }
    }

    // If material_type === 'RM' and name is provided, sync to inventory_master_material
    if ((dbMaterial.material_type === 'RM' || !dbMaterial.sub_category) && dbMaterial.name) {
      try {
        const rmName = dbMaterial.name.trim();
        const rmSku = (dbMaterial.sku || '').trim();
        const now = new Date().toISOString();

        let existingMasterRm = null;
        if (rmSku) {
          const { data: bySku } = await supabase
            .from('inventory_master_material')
            .select('id')
            .eq('sku', rmSku)
            .eq('material_type', 'RM')
            .maybeSingle();
          existingMasterRm = bySku;
        }
        if (!existingMasterRm) {
          const { data: byName } = await supabase
            .from('inventory_master_material')
            .select('id')
            .eq('material_type', 'RM')
            .ilike('name', rmName)
            .maybeSingle();
          existingMasterRm = byName;
        }

        if (existingMasterRm) {
          await supabase
            .from('inventory_master_material')
            .update({
              sku: rmSku || null,
              name: rmName,
              category: 'Raw Material',
              division: dbMaterial.division || null,
              status: dbMaterial.status || 'Active',
              updated_at: now
            })
            .eq('id', existingMasterRm.id);
        } else {
          await supabase
            .from('inventory_master_material')
            .insert({
              sku: rmSku || null,
              name: rmName,
              material_type: 'RM',
              category: 'Raw Material',
              division: dbMaterial.division || null,
              status: dbMaterial.status || 'Active',
              created_at: now,
              updated_at: now
            });
        }
      } catch (rmErr) {
        console.warn("Sync to inventory_master_material for RM failed:", rmErr.message);
      }
    }

    const action = existing?.data ? 'Material updated' : 'Material created';
    const detail = existing?.data 
      ? `Material ${materialData.sku} (${materialData.name}) master data edited.`
      : `New material ${materialData.sku} (${materialData.name}) added.`;
    await writeAudit(action, currentUser, detail);

    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("saveMaterialApi failed", err);
    return { data: null, error: err.message };
  }
};

export const deleteMaterialApi = async (param, currentUser = 'Admin') => {
  try {
    const id = (param && typeof param === 'object') ? param.id : (typeof param === 'number' ? param : null);
    const sku = (param && typeof param === 'object') ? param.sku : (typeof param === 'string' ? param : null);
    const division = (param && typeof param === 'object') ? param.division : null;

    let query = supabase.from('inventory_materials').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (sku && division) {
      query = query.eq('sku', sku).eq('division', division);
    } else if (sku) {
      query = query.eq('sku', sku);
    } else {
      throw new Error('Either ID or SKU is required for deletion');
    }

    const { error } = await query;
    if (error) throw new Error(error.message);

    const logIdentifier = id ? `ID ${id} (SKU: ${sku || '—'})` : `SKU ${sku}`;
    await writeAudit('Material deleted', currentUser, `Material ${logIdentifier} removed from master data.`);
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

export const updateTransactionApi = async (transactionData, currentUser = 'Admin') => {
  try {
    const dbTxn = mapUITxnToDB(transactionData);
    delete dbTxn.id; // Do not overwrite primary key

    const { error } = await supabase
      .from('inventory_transactions')
      .update(dbTxn)
      .eq('id', transactionData.id);

    if (error) throw new Error(error.message);

    const detail = `Updated transaction ${transactionData.id} (${transactionData.type} ${transactionData.qty} of SKU ${transactionData.sku})`;
    await writeAudit('Transaction updated', currentUser, detail);

    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("updateTransactionApi failed", err);
    return { data: null, error: err.message };
  }
};

export const deleteTransactionApi = async (id, currentUser = 'Admin') => {
  try {
    // Delete any correlated job card batches first if present
    await supabase.from('inventory_job_card_batches').delete().eq('transaction_id', id);

    const { error } = await supabase
      .from('inventory_transactions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    await writeAudit('Transaction deleted', currentUser, `Transaction ${id} removed.`);
    return await fetchInventoryDataApi();
  } catch (err) {
    console.error("deleteTransactionApi failed", err);
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
        id: typeof rm === 'object' ? (rm.id || null) : null,
        sku: typeof rm === 'string' ? '' : (rm.sku || '').trim(),
        name: typeof rm === 'string' ? rm.trim() : (rm.name || '').trim(),
        division: typeof rm === 'string' ? null : (rm.division || null),
        hsn: typeof rm === 'string' ? '' : (rm.hsn || rm.hsn_code || '').trim(),
        status: typeof rm === 'string' ? 'Active' : (rm.status || 'Active')
      })).filter(item => item.name);

      // Manage RM materials in inventory_master_material table
      const { data: dbCurrentMasterRm, error: fetchErr } = await supabase
        .from('inventory_master_material')
        .select('*')
        .eq('material_type', 'RM');

      if (!fetchErr && dbCurrentMasterRm) {
        const isMasterRmMatch = (newItem, dbItem) => {
          if (newItem.id && dbItem.id && String(newItem.id) === String(dbItem.id)) return true;
          const matchSku = (newItem.sku || '').trim().toLowerCase() === (dbItem.sku || '').trim().toLowerCase();
          const matchName = (newItem.name || '').trim().toLowerCase() === (dbItem.name || '').trim().toLowerCase();
          const matchDiv = (newItem.division || '') === (dbItem.division || '');
          return matchSku && matchName && matchDiv;
        };

        // 1. Insert new items
        const masterToInsert = normalizedNewList.filter(
          newItem => !dbCurrentMasterRm.some(dbItem => isMasterRmMatch(newItem, dbItem))
        );
        if (masterToInsert.length > 0) {
          const { error: insErr } = await supabase.from('inventory_master_material').insert(
            masterToInsert.map(item => ({
              division: normalizeDivision(item.division),
              material_type: 'RM',
              category: 'Raw Material',
              name: item.name,
              sku: item.sku || `RM-${Math.floor(10000 + Math.random() * 90000)}`,
              hsn_code: item.hsn || null,
              status: item.status || 'Active'
            }))
          );
          if (insErr) {
            console.error("Failed adding raw materials to inventory_master_material:", insErr.message);
            throw new Error(`Failed adding raw materials: ${insErr.message}`);
          }
        }

        // 2. Delete removed items
        const masterToDelete = dbCurrentMasterRm.filter(
          dbItem => !normalizedNewList.some(newItem => isMasterRmMatch(newItem, dbItem))
        );
        if (masterToDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('inventory_master_material')
            .delete()
            .in('id', masterToDelete.map(d => d.id));
          if (delErr) {
            console.error("Failed deleting raw materials from inventory_master_material:", delErr.message);
            throw new Error(`Failed deleting raw materials: ${delErr.message}`);
          }
        }

        // 3. Update modified items
        for (const newItem of normalizedNewList) {
          const match = dbCurrentMasterRm.find(d => isMasterRmMatch(newItem, d));
          if (match && (
            (newItem.sku && match.sku !== newItem.sku) ||
            match.name !== newItem.name ||
            (newItem.division !== undefined && match.division !== normalizeDivision(newItem.division)) ||
            (newItem.hsn !== undefined && (match.hsn_code || '') !== (newItem.hsn || ''))
          )) {
            const { error: updErr } = await supabase.from('inventory_master_material').update({
              name: newItem.name,
              sku: newItem.sku || match.sku,
              hsn_code: newItem.hsn !== undefined ? (newItem.hsn || null) : match.hsn_code,
              division: newItem.division !== undefined ? normalizeDivision(newItem.division) : match.division,
              updated_at: new Date().toISOString()
            }).eq('id', match.id);

            if (updErr) {
              console.error("Failed updating raw material in inventory_master_material:", updErr.message);
            }
          }
        }
      }

      localStorage.setItem('sp_custom_material_names', JSON.stringify(newList));
      await writeAudit('Material names list updated', currentUser, `Custom material names list saved.`);
    } else if (type === 'finishedGoodsNames') {
      const normalizedNewList = newList.map(fg => ({
        id: typeof fg === 'object' ? (fg.id || null) : null,
        sku: typeof fg === 'string' ? null : (fg.sku || null),
        name: typeof fg === 'string' ? fg : fg.name,
        category: typeof fg === 'string' ? 'Finished Goods' : (fg.category || 'Finished Goods'),
        division: typeof fg === 'string' ? 'ALL' : normalizeDivision(fg.division),
        hsn: typeof fg === 'string' ? '' : (fg.hsn || fg.hsn_code || '').trim(),
        status: typeof fg === 'string' ? 'Active' : (fg.status || 'Active')
      }));

      // Manage FG materials in inventory_master_material table
      const { data: dbCurrentMasterFg, error: fetchErr } = await supabase
        .from('inventory_master_material')
        .select('*')
        .eq('material_type', 'FG');

      if (!fetchErr && dbCurrentMasterFg) {
        const isMasterFgMatch = (newItem, dbItem) => {
          if (newItem.id && dbItem.id && String(newItem.id) === String(dbItem.id)) return true;
          const matchSku = (newItem.sku || '').trim().toLowerCase() === (dbItem.sku || '').trim().toLowerCase();
          const matchName = (newItem.name || '').trim().toLowerCase() === (dbItem.name || '').trim().toLowerCase();
          const matchDiv = (newItem.division || '') === (dbItem.division || '');
          return matchSku && matchName && matchDiv;
        };

        // 1. Insert new items
        const masterToInsert = normalizedNewList.filter(
          newItem => !dbCurrentMasterFg.some(dbItem => isMasterFgMatch(newItem, dbItem))
        );
        if (masterToInsert.length > 0) {
          const { error: insErr } = await supabase.from('inventory_master_material').insert(
            masterToInsert.map(item => ({
              division: normalizeDivision(item.division),
              material_type: 'FG',
              category: item.category || 'Finished Goods',
              sub_category: item.name,
              name: item.name,
              sku: item.sku || null,
              hsn_code: item.hsn || null,
              status: item.status || 'Active'
            }))
          );
          if (insErr) {
            console.error("Failed adding finished goods to inventory_master_material:", insErr.message);
            throw new Error(`Failed adding finished goods: ${insErr.message}`);
          }
        }

        // 2. Delete removed items
        const masterToDelete = dbCurrentMasterFg.filter(
          dbItem => !normalizedNewList.some(newItem => isMasterFgMatch(newItem, dbItem))
        );
        if (masterToDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('inventory_master_material')
            .delete()
            .in('id', masterToDelete.map(d => d.id));
          if (delErr) {
            console.error("Failed deleting finished goods from inventory_master_material:", delErr.message);
            throw new Error(`Failed deleting finished goods: ${delErr.message}`);
          }
        }

        // 3. Update modified items
        for (const newItem of normalizedNewList) {
          const match = dbCurrentMasterFg.find(d => isMasterFgMatch(newItem, d));
          if (match && (
            (newItem.sku && match.sku !== newItem.sku) ||
            match.name !== newItem.name ||
            match.category !== newItem.category ||
            (newItem.division !== undefined && match.division !== normalizeDivision(newItem.division)) ||
            (newItem.hsn !== undefined && (match.hsn_code || '') !== (newItem.hsn || ''))
          )) {
            const { error: updErr } = await supabase.from('inventory_master_material').update({
              name: newItem.name,
              category: newItem.category || 'Finished Goods',
              sub_category: newItem.name,
              sku: newItem.sku || null,
              hsn_code: newItem.hsn !== undefined ? (newItem.hsn || null) : match.hsn_code,
              division: newItem.division !== undefined ? normalizeDivision(newItem.division) : match.division,
              updated_at: new Date().toISOString()
            }).eq('id', match.id);

            if (updErr) {
              console.error("Failed updating finished good in inventory_master_material:", updErr.message);
            }
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
        .select('id, name, division, material_type');

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

      // 3. Update modified categories (name, division, material_type)
      for (const newItem of normalizedNewList) {
        const match = existingDb.find(d => 
          (newItem.id && d.id === newItem.id) || 
          d.name.toLowerCase() === newItem.name.toLowerCase()
        );
        if (match && (
          match.name !== newItem.name ||
          (match.division || null) !== (newItem.division || null) ||
          (match.material_type || 'FG') !== (newItem.material_type || 'FG')
        )) {
          await supabase
            .from('inventory_categories')
            .update({
              name: newItem.name,
              division: newItem.division || null,
              material_type: newItem.material_type || 'FG'
            })
            .eq('id', match.id);
        }
      }



      localStorage.setItem('sp_custom_categories', JSON.stringify(newList));
      await writeAudit('Categories list updated', userName, `Custom categories list saved.`);
    } else if (type === 'materialTypes') {
      const userName = currentUser || 'Admin';
      const normalizedNewList = newList.map(mt => ({
        id: typeof mt === 'object' ? (mt.id || null) : null,
        type_name: typeof mt === 'string' ? mt.trim() : (mt.type_name || mt.typeName || '').trim(),
        type_code: typeof mt === 'string' ? mt.trim().toUpperCase() : (mt.type_code || mt.typeCode || '').trim().toUpperCase()
      })).filter(item => item.type_code && item.type_name);

      const { data: dbCurrentTypes, error: fetchErr } = await supabase
        .from('material_types')
        .select('id, type_name, type_code');

      if (!fetchErr && dbCurrentTypes) {
        // 1. Insert new
        const toInsert = normalizedNewList.filter(
          newItem => !dbCurrentTypes.some(dbItem => dbItem.type_code.toUpperCase() === newItem.type_code.toUpperCase())
        );
        if (toInsert.length > 0) {
          const { error: insErr } = await supabase
            .from('material_types')
            .insert(toInsert.map(i => ({ type_name: i.type_name, type_code: i.type_code })));
          if (insErr) throw new Error(`Failed adding material type: ${insErr.message}`);
        }

        // 2. Delete removed
        const toDelete = dbCurrentTypes.filter(
          dbItem => !normalizedNewList.some(newItem => newItem.type_code.toUpperCase() === dbItem.type_code.toUpperCase())
        );
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('material_types')
            .delete()
            .in('id', toDelete.map(d => d.id));
          if (delErr) throw new Error(`Failed deleting material type: ${delErr.message}`);
        }

        // 3. Update modified
        for (const newItem of normalizedNewList) {
          const match = dbCurrentTypes.find(d => 
            (newItem.id && d.id === newItem.id) || 
            d.type_code.toUpperCase() === newItem.type_code.toUpperCase()
          );
          if (match && (match.type_name !== newItem.type_name || match.type_code !== newItem.type_code)) {
            await supabase
              .from('material_types')
              .update({
                type_name: newItem.type_name,
                type_code: newItem.type_code
              })
              .eq('id', match.id);
          }
        }
      }

      localStorage.setItem('sp_custom_material_types', JSON.stringify(newList));
      await writeAudit('Material types list updated', userName, `Custom material types list saved.`);
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
      supabase.from('inventory_materials').delete().neq('id', 0),
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

export const saveRecycleApi = async (recordOrRecords, file, currentUser = 'Admin') => {
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

    const recordsArray = Array.isArray(recordOrRecords)
      ? recordOrRecords
      : recordOrRecords.items && Array.isArray(recordOrRecords.items)
      ? recordOrRecords.items.map((it) => ({
          recycle_type: recordOrRecords.recycleType,
          firm: recordOrRecords.firm || null,
          material_name: it.materialName,
          material_sku: it.materialSku || null,
          quantity: Number(it.quantity) || 0,
          damage_type: recordOrRecords.damageType,
          date: recordOrRecords.date,
          reason: recordOrRecords.reason || null,
          approved_by: recordOrRecords.approvedBy || currentUser,
          attachment_url,
          status: 'pending'
        }))
      : [{
          recycle_type: recordOrRecords.recycleType,
          firm: recordOrRecords.firm || null,
          material_name: recordOrRecords.materialName,
          material_sku: recordOrRecords.materialSku || null,
          quantity: Number(recordOrRecords.quantity) || 0,
          damage_type: recordOrRecords.damageType,
          date: recordOrRecords.date,
          reason: recordOrRecords.reason || null,
          approved_by: recordOrRecords.approvedBy || currentUser,
          attachment_url,
          status: 'pending'
        }];

    const { data, error } = await supabase
      .from('inventory_recycle')
      .insert(recordsArray)
      .select();

    if (error) throw new Error(error.message);

    const summaryStr = recordsArray.map((r) => `${r.quantity} of ${r.material_name}`).join(', ');
    await writeAudit('Recycle recorded', currentUser, `Recycled: ${summaryStr}`);

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
