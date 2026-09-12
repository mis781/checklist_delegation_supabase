// Storage Manager - Database-Connected Engine for O2D System
// Connects live Supabase tables to O2D stages and masters without dummy data.
import * as o2dApi from '../services/o2dApi.js';

// Fired on window whenever data changes so active views refresh immediately
export const DATA_CHANGED_EVENT = 'o2d:data-changed';
export const notifyDataChanged = (key) => {
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { key } }));
    }
  }, 0);
};

const STORAGE_KEYS = {
  USERS: 'pcb_users',
  CREDITS: 'pcb_credits',
  EXPENSES: 'pcb_expenses',
  LEDGER: 'pcb_ledger',
  SETTINGS: 'pcb_settings',
  AUTH_USER: 'pcb_authUser',
  VENDORS: 'pcb_vendors_v3',
  COMPANIES: 'pcb_companies_v3',
  ITEMS: 'pcb_items_v3',
  GROUP_HEADS: 'pcb_group_heads_v3',
  UOMS: 'pcb_uoms_v3',
  DEPARTMENTS: 'pcb_departments_v3',
  DIVISIONS: 'pcb_divisions_v1',
  PERSONS: 'pcb_persons_v1',
  TRANSPORTING_TYPES: 'pcb_transporting_types_v1',
  PAYMENT_TERMS_MASTER: 'pcb_payment_terms_master_v1',
  TRANSPORTER_AGENCIES: 'pcb_transporter_agencies_v1',
  PURCHASE_ORDERS: 'pcb_purchase_orders_v1',
  RECEIVED_ORDERS: 'pcb_received_orders_v1',
  DELIVERY_HISTORY: 'pcb_delivery_history_v1',
  STORE_RETURNS: 'pcb_store_returns_v1',
  INDENTS: 'pcb_indents_v3',
  POS: 'pcb_pos_v4',
  TERMS_CONDITIONS: 'pcb_terms_conditions_v1',
  LIFTING: 'pcb_lifting_v1',
  STORE_IN: 'pcb_store_in_v1',
  DIRECT_STORE_IN: 'pcb_direct_store_in_v1',
  PAYMENTS: 'pcb_payments_v1',
  REJECT_GRN: 'pcb_reject_grn_v1',
  DEBIT_NOTES: 'pcb_debit_notes_v1',
  TALLY_ENTRIES: 'pcb_tally_entries_v1',
  BILL_NOT_RECEIVED: 'pcb_bill_not_received_v1',
  STORE_ISSUES: 'pcb_store_issues_v1',
  INVENTORY: 'pcb_inventory_v1',
  QUOTATION_HISTORY: 'pcb_quotation_history_v1',
  DISPATCH_HISTORY: 'pcb_dispatch_history_v1',
  PACKAGING_HISTORY: 'pcb_packaging_history_v1',
  LOGISTIC_HISTORY: 'pcb_logistic_history_v1',
  AGENCY_HISTORY: 'pcb_agency_history_v1',
  CALLAN_HISTORY: 'pcb_callan_history_v1',
  INVOICE_HISTORY: 'pcb_invoice_history_v1',
  CONFIRM_DELIVERY_HISTORY: 'pcb_confirm_delivery_v1'
};

const DEFAULT_SETTINGS = {
  groupHeads: ['IT', 'HR', 'Finance', 'Operations', 'Marketing'],
  paymentModes: ['Cash', 'Cheque', 'Bank Transfer', 'Online Payment'],
  lastSerialNumber: 0
};

// =====================================================================
// STORAGE HELPERS (Local Cache with Instant Sync)
// =====================================================================

export const getFromStorage = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
};

export const saveToStorage = (key, data, notify = true) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (notify) {
      notifyDataChanged(key);
    }
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

// =====================================================================
// ASYNCHRONOUS DATABASE HYDRATION & REFRESH (NO DUMMY SEEDING)
// =====================================================================

let isHydrating = false;

export const refreshO2DDataFromSupabase = async () => {
  if (isHydrating) return;
  isHydrating = true;
  try {
    // 1. Purge legacy dummy seeds from previous mock runs if any
    const purgeDummyIfPresent = (key, testFn) => {
      const items = getFromStorage(key);
      if (Array.isArray(items) && items.some(testFn)) {
        localStorage.removeItem(key);
      }
    };
    purgeDummyIfPresent(STORAGE_KEYS.CREDITS, c => c.remarks && String(c.remarks).includes('Dummy seed'));
    purgeDummyIfPresent(STORAGE_KEYS.EXPENSES, e => e.remarks && String(e.remarks).includes('Dummy expense'));
    purgeDummyIfPresent(STORAGE_KEYS.VENDORS, v => v.vnNo && v.vnNo.startsWith('VN-') && v.id && String(v.id).startsWith('VND-'));
    purgeDummyIfPresent(STORAGE_KEYS.ITEMS, i => i.inNo && i.inNo.startsWith('IN-') && i.id && String(i.id).startsWith('ITM-'));
    purgeDummyIfPresent(STORAGE_KEYS.TRANSPORTER_AGENCIES, a => a.id && String(a.id).startsWith('TA-') && a.lr && a.lr.startsWith('LR-100'));
    purgeDummyIfPresent(STORAGE_KEYS.PERSONS, p => (p.id && String(p.id).startsWith('PRS-')) || (p.prNo && String(p.prNo).startsWith('PRS-')));

    // 2. Fetch live master data in parallel
    const [divs, mats, uoms, tTypes, carriers, parties, persons] = await Promise.all([
      o2dApi.fetchLiveDivisions(),
      o2dApi.fetchLiveMasterItems(),
      o2dApi.fetchLiveUOMs(),
      o2dApi.fetchLiveTransportingTypes(),
      o2dApi.fetchLiveTransporters(),
      o2dApi.fetchParties(),
      o2dApi.fetchPersons()
    ]);

    if (divs && divs.length > 0) saveToStorage(STORAGE_KEYS.DIVISIONS, divs, false);
    if (mats && mats.length > 0) saveToStorage(STORAGE_KEYS.ITEMS, mats, false);
    if (uoms && uoms.length > 0) saveToStorage(STORAGE_KEYS.UOMS, uoms, false);
    if (tTypes && tTypes.length > 0) saveToStorage(STORAGE_KEYS.TRANSPORTING_TYPES, tTypes, false);
    if (carriers && carriers.length > 0) saveToStorage(STORAGE_KEYS.TRANSPORTER_AGENCIES, carriers, false);
    saveToStorage(STORAGE_KEYS.VENDORS, parties || [], false);
    saveToStorage(STORAGE_KEYS.PERSONS, persons || [], false);

    // 3. Fetch live pipeline stage records in parallel
    const [orders, checks, dispatches, logistics, callans, invoices, deliveries, payments] = await Promise.all([
      o2dApi.fetchAllOrders(),
      o2dApi.fetchDeliveryChecks(),
      o2dApi.fetchDispatches(),
      o2dApi.fetchLogistics(),
      o2dApi.fetchCallans(),
      o2dApi.fetchInvoices(),
      o2dApi.fetchDeliveries(),
      o2dApi.fetchPayments()
    ]);

    saveToStorage(STORAGE_KEYS.RECEIVED_ORDERS, orders || [], false);
    saveToStorage(STORAGE_KEYS.DELIVERY_HISTORY, checks || [], false);
    saveToStorage(STORAGE_KEYS.DISPATCH_HISTORY, dispatches || [], false);
    saveToStorage(STORAGE_KEYS.PACKAGING_HISTORY, (dispatches || []).filter(d => d.packagingStatus === 'Yes'), false);
    saveToStorage(STORAGE_KEYS.LOGISTIC_HISTORY, logistics || [], false);
    saveToStorage(STORAGE_KEYS.CALLAN_HISTORY, callans || [], false);
    saveToStorage(STORAGE_KEYS.INVOICE_HISTORY, invoices || [], false);
    saveToStorage(STORAGE_KEYS.CONFIRM_DELIVERY_HISTORY, deliveries || [], false);
    saveToStorage(STORAGE_KEYS.PAYMENTS, payments || [], false);

    notifyDataChanged('supabase_hydrated');

  } catch (err) {
    console.error('[storageManager] Hydration error from Supabase:', err);
  } finally {
    isHydrating = false;
  }
};

/**
 * Initialize storage and trigger live database sync
 */
export const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  // Start background hydration from live Supabase tables
  refreshO2DDataFromSupabase();
};

/**
 * Clear local O2D stage transaction cache (Delivery checks through Payments)
 */
export const clearLocalO2DStageData = (clearOrders = false) => {
  const stageKeys = [
    STORAGE_KEYS.DELIVERY_HISTORY,
    STORAGE_KEYS.DISPATCH_HISTORY,
    STORAGE_KEYS.PACKAGING_HISTORY,
    STORAGE_KEYS.LOGISTIC_HISTORY,
    STORAGE_KEYS.CALLAN_HISTORY,
    STORAGE_KEYS.INVOICE_HISTORY,
    STORAGE_KEYS.CONFIRM_DELIVERY_HISTORY,
    STORAGE_KEYS.PAYMENTS
  ];

  stageKeys.forEach(k => saveToStorage(k, [], false));

  if (clearOrders) {
    saveToStorage(STORAGE_KEYS.RECEIVED_ORDERS, [], false);
  } else {
    const orders = getFromStorage(STORAGE_KEYS.RECEIVED_ORDERS) || [];
    const resetOrders = orders.map(o => ({
      ...o,
      currentStage: 'RECEIVED',
      isCompleted: false,
      items: (o.items || []).map(i => ({ ...i, isValidated: false }))
    }));
    saveToStorage(STORAGE_KEYS.RECEIVED_ORDERS, resetOrders, false);
  }

  notifyDataChanged('stage_data_cleared');
};

if (typeof window !== 'undefined') {
  window.clearO2DStageData = clearLocalO2DStageData;
}

// =====================================================================
// USER & AUTH OPERATIONS
// =====================================================================

export const getUsers = () => {
  const users = getFromStorage(STORAGE_KEYS.USERS) || [];
  if (users.length === 0) {
    try {
      const active = localStorage.getItem('user');
      if (active) return [JSON.parse(active)];
    } catch (err) {
      // ignore parse error
    }
  }
  return users;
};
export const saveUsers = (users) => saveToStorage(STORAGE_KEYS.USERS, users);
export const getAuthUser = () => getFromStorage(STORAGE_KEYS.AUTH_USER);
export const saveAuthUser = (user) => saveToStorage(STORAGE_KEYS.AUTH_USER, user);
export const clearAuthUser = () => localStorage.removeItem(STORAGE_KEYS.AUTH_USER);

// =====================================================================
// CREDITS, EXPENSES & LEDGER (No dummy generation)
// =====================================================================

export const getCredits = () => getFromStorage(STORAGE_KEYS.CREDITS) || [];
export const saveCredits = (credits) => saveToStorage(STORAGE_KEYS.CREDITS, credits);
export const saveCredit = (credit) => {
  const credits = getCredits();
  credits.push(credit);
  saveCredits(credits);
};
export const getCreditById = (id) => {
  const credits = getCredits();
  return credits.find(c => c.id === id);
};
export const updateCredit = (updated) => {
  const credits = getCredits();
  const index = credits.findIndex(c => c.id === updated.id);
  if (index !== -1) {
    credits[index] = updated;
    saveCredits(credits);
  }
};

export const getExpenses = () => getFromStorage(STORAGE_KEYS.EXPENSES) || [];
export const saveExpenses = (expenses) => saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
export const saveExpense = (expense) => {
  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);
};
export const getExpenseById = (id) => {
  const expenses = getExpenses();
  return expenses.find(e => e.id === id);
};
export const updateExpense = (updated) => {
  const expenses = getExpenses();
  const index = expenses.findIndex(e => e.id === updated.id);
  if (index !== -1) {
    expenses[index] = updated;
    saveExpenses(expenses);
  }
};

export const getLedger = () => getFromStorage(STORAGE_KEYS.LEDGER) || [];
export const saveLedgers = (ledger) => saveToStorage(STORAGE_KEYS.LEDGER, ledger);
export const saveLedger = (entry) => {
  const ledger = getLedger();
  ledger.push(entry);
  saveLedgers(ledger);
};

export const getSettings = () => getFromStorage(STORAGE_KEYS.SETTINGS) || DEFAULT_SETTINGS;
export const saveSettings = (settings) => saveToStorage(STORAGE_KEYS.SETTINGS, settings);

// =====================================================================
// MASTER DATA OPERATIONS (Parties, Companies, Items, UOMs, Divisions, etc.)
// =====================================================================

// Parties / Vendors (Customer Master)
export const getVendors = () => getFromStorage(STORAGE_KEYS.VENDORS) || [];
export const saveVendors = (vendors) => {
  saveToStorage(STORAGE_KEYS.VENDORS, vendors);
  notifyDataChanged('parties');
};
export const saveVendor = (vendor) => {
  const vendors = getVendors();
  const index = vendors.findIndex(v => v.id === vendor.id);
  if (index !== -1) {
    vendors[index] = vendor;
  } else {
    vendors.push(vendor);
  }
  saveVendors(vendors);

  // Asynchronously persist party to Supabase
  o2dApi.savePartyRecord(vendor).then((saved) => {
    if (saved && saved.id) {
      const current = getVendors();
      const idx = current.findIndex(v => v.id === vendor.id || v.name === vendor.name);
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: saved.id, dbId: saved.id };
        saveToStorage(STORAGE_KEYS.VENDORS, current);
      }
    }
  }).catch((err) => {
    console.warn('[storageManager] savePartyRecord background sync note:', err.message);
  });
};

export const deleteVendor = (id) => {
  const vendors = getVendors();
  const target = vendors.find(v => v.id === id);
  const updated = vendors.filter(v => v.id !== id);
  saveVendors(updated);

  const dbId = (target && target.dbId) || (typeof id === 'number' ? id : null);
  if (dbId) {
    o2dApi.deletePartyRecord(dbId).catch(err => {
      console.warn('[storageManager] deletePartyRecord background sync note:', err.message);
    });
  }
};

export const getParties = getVendors;
export const saveParties = saveVendors;
export const saveParty = saveVendor;
export const deleteParty = deleteVendor;

// Companies
export const getCompanies = () => getFromStorage(STORAGE_KEYS.COMPANIES) || [];
export const saveCompanies = (companies) => saveToStorage(STORAGE_KEYS.COMPANIES, companies);
export const saveCompany = (company) => {
  const companies = getCompanies();
  companies.push(company);
  saveCompanies(companies);
};

// Master Items (Products)
export const getMasterItems = () => getFromStorage(STORAGE_KEYS.ITEMS) || [];
export const saveMasterItems = (items) => saveToStorage(STORAGE_KEYS.ITEMS, items);
export const saveMasterItem = (item) => {
  const items = getMasterItems();
  items.push(item);
  saveMasterItems(items);
};

// Live Stock Lookup from IMS
export const getIMSStock = (productName) => {
  if (!productName) return 0;
  // Look up in cached master items or default to 0
  const cleanName = productName.includes(" (") ? productName.split(" (")[0].trim() : productName.trim();
  const items = getMasterItems();
  const match = items.find(i => 
    i.name?.toLowerCase() === cleanName.toLowerCase() || 
    i.name?.toLowerCase() === productName.toLowerCase() || 
    i.productName?.toLowerCase() === cleanName.toLowerCase() ||
    i.productName?.toLowerCase() === productName.toLowerCase()
  );
  return match?.currentStock || match?.quantity || 0;
};

// Group Heads
export const getGroupHeads = () => getFromStorage(STORAGE_KEYS.GROUP_HEADS) || [
  { id: 'GH-1', name: 'Raw Materials' },
  { id: 'GH-2', name: 'Packaging' },
  { id: 'GH-3', name: 'Electronics' },
  { id: 'GH-4', name: 'Logistics' }
];
export const saveGroupHeads = (data) => saveToStorage(STORAGE_KEYS.GROUP_HEADS, data);
export const saveGroupHead = (item) => {
  const data = getGroupHeads();
  data.push(item);
  saveGroupHeads(data);
};

// UOMs
export const getUOMs = () => getFromStorage(STORAGE_KEYS.UOMS) || [
  { id: 1, name: 'PCS', uom: 'PCS' },
  { id: 2, name: 'KG', uom: 'KG' },
  { id: 3, name: 'LTR', uom: 'LTR' },
  { id: 4, name: 'MTR', uom: 'MTR' },
  { id: 5, name: 'BOX', uom: 'BOX' }
];
export const saveUOMs = (data) => saveToStorage(STORAGE_KEYS.UOMS, data);
export const saveUOM = (item) => {
  const data = getUOMs();
  data.push(item);
  saveUOMs(data);
};

// Departments
export const getDepartments = () => getFromStorage(STORAGE_KEYS.DEPARTMENTS) || [];
export const saveDepartments = (data) => saveToStorage(STORAGE_KEYS.DEPARTMENTS, data);
export const saveDepartment = (item) => {
  const data = getDepartments();
  data.push(item);
  saveDepartments(data);
};

// Divisions
export const getDivisions = () => getFromStorage(STORAGE_KEYS.DIVISIONS) || [
  { id: 1, name: 'Nutech Composite', division: 'Nutech Composite' },
  { id: 2, name: 'Nutech Pipes', division: 'Nutech Pipes' },
  { id: 3, name: 'Protech Max', division: 'Protech Max' }
];
export const saveDivisions = (data) => saveToStorage(STORAGE_KEYS.DIVISIONS, data);
export const saveDivision = (item) => {
  const data = getDivisions();
  data.push(item);
  saveDivisions(data);
};

// Transporting Types
export const getTransportingTypes = () => getFromStorage(STORAGE_KEYS.TRANSPORTING_TYPES) || [
  { id: '1', name: 'FOR', type: 'FOR' },
  { id: '2', name: 'Ex Factory', type: 'Ex Factory' },
  { id: '3', name: 'Ex Factory Transpoter Office', type: 'Ex Factory Transpoter Office' }
];
export const saveTransportingTypes = (data) => saveToStorage(STORAGE_KEYS.TRANSPORTING_TYPES, data);
export const saveTransportingType = (item) => {
  const data = getTransportingTypes();
  data.push(item);
  saveTransportingTypes(data);
};

// Payment Terms Master
export const getPaymentTermsMaster = () => [
  '15 Days Credit', '30 Days Credit', '45 Days Credit', '60 Days Credit', '90 Days Credit',
  'Net 30', '10% Advance', '50% Advance', '100% Advance', 'Cash on Delivery'
];
export const savePaymentTermsMaster = (data) => saveToStorage(STORAGE_KEYS.PAYMENT_TERMS_MASTER, data);
export const savePaymentTermMaster = (item) => {
  const data = getPaymentTermsMaster();
  data.push(item);
  savePaymentTermsMaster(data);
};

// Transporter Agencies
export const getTransporterAgencies = () => getFromStorage(STORAGE_KEYS.TRANSPORTER_AGENCIES) || [];
export const saveTransporterAgencies = (data) => saveToStorage(STORAGE_KEYS.TRANSPORTER_AGENCIES, data);
export const saveTransporterAgency = (item) => {
  const data = getTransporterAgencies();
  data.push(item);
  saveTransporterAgencies(data);
};

// Persons (Order Received By)
export const getPersons = () => getFromStorage(STORAGE_KEYS.PERSONS) || [];
export const savePersons = (data) => {
  saveToStorage(STORAGE_KEYS.PERSONS, data);
  notifyDataChanged('persons');
};
export const savePerson = (item) => {
  const data = getPersons();
  const index = data.findIndex(p => p.id === item.id);
  if (index !== -1) {
    data[index] = item;
  } else {
    data.push(item);
  }
  savePersons(data);

  // Asynchronously persist person to Supabase
  o2dApi.savePersonRecord(item).then((saved) => {
    if (saved && saved.id) {
      const current = getPersons();
      const idx = current.findIndex(p => p.id === item.id || p.name === item.name);
      if (idx !== -1) {
        current[idx] = { ...current[idx], id: saved.id, dbId: saved.id };
        saveToStorage(STORAGE_KEYS.PERSONS, current);
      }
    }
  }).catch((err) => {
    console.warn('[storageManager] savePersonRecord background sync note:', err.message);
  });
};

export const deletePerson = (id) => {
  const data = getPersons();
  const target = data.find(p => p.id === id);
  const updated = data.filter(p => p.id !== id);
  savePersons(updated);

  const dbId = (target && target.dbId) || (typeof id === 'number' ? id : null);
  if (dbId) {
    o2dApi.deletePersonRecord(dbId).catch(err => {
      console.warn('[storageManager] deletePersonRecord background sync note:', err.message);
    });
  }
};

// =====================================================================
// STAGE 1 & 2: RECEIVED ORDERS & CHECK VALIDATION
// =====================================================================

export const getReceivedOrders = () => {
  const orders = getFromStorage(STORAGE_KEYS.RECEIVED_ORDERS) || [];
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.role !== 'ADMIN' && user.division && user.division !== 'Management') {
        return orders.filter(order => order.division === user.division);
      }
    }
  } catch (err) {
    // ignore parse error
  }
  return orders;
};

export const getAllReceivedOrdersRaw = () => getFromStorage(STORAGE_KEYS.RECEIVED_ORDERS) || [];

export const saveReceivedOrders = (data) => saveToStorage(STORAGE_KEYS.RECEIVED_ORDERS, data);

export const saveReceivedOrder = (item) => {
  const data = getAllReceivedOrdersRaw();

  // If item doesn't have an orderId yet, assign optimistic OR-NNN
  if (!item.orderId) {
    const ordNums = data.map(o => o.orderId).filter(id => id && id.startsWith('OR-'));
    let nextCount = 1;
    if (ordNums.length > 0) {
      const maxVal = Math.max(...ordNums.map(id => parseInt(id.replace('OR-', ''), 10) || 0));
      nextCount = maxVal + 1;
    }
    item.orderId = `OR-${String(nextCount).padStart(3, '0')}`;
  }

  // Ensure items have product numbers
  if (Array.isArray(item.items)) {
    item.items = item.items.map((it, idx) => ({
      ...it,
      productNumber: it.productNumber || `${item.orderId}-${String(idx + 1).padStart(2, '0')}`
    }));
  }

  data.push(item);
  saveReceivedOrders(data);

  // Asynchronously persist to Supabase
  o2dApi.createReceivedOrder(item).then((inserted) => {
    if (inserted && inserted.id) {
      const current = getAllReceivedOrdersRaw();
      const target = current.find(o => o.orderId === item.orderId || o.poNumber === item.poNumber);
      if (target) {
        target.id = inserted.id;
        target.dbId = inserted.id;
        target.orderId = inserted.order_id;
        saveToStorage(STORAGE_KEYS.RECEIVED_ORDERS, current);
      }
    }
  }).catch((err) => {
    console.warn('[storageManager] createReceivedOrder background sync note:', err.message);
  });
};

export const updateReceivedOrder = (updatedItem) => {
  const data = getAllReceivedOrdersRaw();
  const index = data.findIndex(o => o.orderId === updatedItem.orderId || o.id === updatedItem.id);
  if (index !== -1) {
    data[index] = updatedItem;
    saveReceivedOrders(data);

    // Asynchronously update validation status in Supabase
    o2dApi.saveOrderValidation(
      updatedItem.orderId,
      updatedItem.checkedProductNumbers || [],
      !!updatedItem.isChecked
    ).catch(err => {
      console.warn('[storageManager] saveOrderValidation background sync note:', err.message);
    });
  }
};

export const getCheckedProductNumbers = (order) => {
  if (order.checkedProductNumbers) return order.checkedProductNumbers;
  if (order.isChecked) {
    return (order.items || []).map((_, idx) => `${order.orderId}-${String(idx + 1).padStart(2, '0')}`);
  }
  return [];
};

// =====================================================================
// STAGE 3 & 4: DELIVERY HISTORY (STOCK CHECK) & PRODUCTION
// =====================================================================

export const getDeliveryHistory = () => getFromStorage(STORAGE_KEYS.DELIVERY_HISTORY) || [];

export const saveDeliveryHistory = (data) => saveToStorage(STORAGE_KEYS.DELIVERY_HISTORY, data);

export const saveDeliveryTransaction = (items) => {
  const history = getDeliveryHistory();
  const timestamp = new Date().toISOString();

  // Determine next DA identifier
  const daIds = history.map(h => h.deliveryApproverId).filter(id => id && id.startsWith('DA-'));
  let nextCount = 1;
  if (daIds.length > 0) {
    const maxDA = Math.max(...daIds.map(id => parseInt(id.replace('DA-', ''), 10) || 0));
    nextCount = maxDA + 1;
  }

  const newRecords = items.map((item, idx) => {
    const deliveryApproverId = item.deliveryApproverId || `DA-${String(nextCount + idx).padStart(3, '0')}`;
    return {
      ...item,
      id: deliveryApproverId,
      deliveryApproverId,
      timestamp
    };
  });

  history.push(...newRecords);
  saveDeliveryHistory(history);

  // Asynchronously persist to Supabase
  o2dApi.saveDeliveryCheckRecords(newRecords).catch(err => {
    console.warn('[storageManager] saveDeliveryCheckRecords background sync note:', err.message);
  });
};

export const updateDeliveryHistoryItems = (updatedItems) => {
  const history = getDeliveryHistory();
  updatedItems.forEach(updatedItem => {
    const index = history.findIndex(h => h.deliveryApproverId === updatedItem.deliveryApproverId || h.id === updatedItem.id);
    if (index !== -1) {
      history[index] = { ...history[index], ...updatedItem, updatedAt: new Date().toISOString() };

      // If produced, sync production status to Supabase
      if (updatedItem.produced) {
        o2dApi.updateProductionCheck(history[index].deliveryApproverId, history[index]).catch(err => {
          console.warn('[storageManager] updateProductionCheck background sync note:', err.message);
        });
      }
    }
  });
  saveDeliveryHistory(history);
};

// =====================================================================
// STAGE 5 & 6: DISPATCH & PACKAGING
// =====================================================================

export const getDispatchHistory = () => getFromStorage(STORAGE_KEYS.DISPATCH_HISTORY) || [];

export const saveDispatchHistory = (data) => saveToStorage(STORAGE_KEYS.DISPATCH_HISTORY, data);

export const saveDispatchTransaction = (items) => {
  const history = getDispatchHistory();
  const timestamp = new Date().toISOString();

  const dsIds = history.map(h => h.dispatchId).filter(id => id && id.startsWith('DS-'));
  let nextCount = 1;
  if (dsIds.length > 0) {
    const maxDS = Math.max(...dsIds.map(id => parseInt(id.replace('DS-', ''), 10) || 0));
    nextCount = maxDS + 1;
  }

  const newRecords = items.map((item, idx) => {
    const dispatchId = item.dispatchId || `DS-${String(nextCount + idx).padStart(3, '0')}`;
    return {
      ...item,
      id: dispatchId,
      dispatchId,
      dispatchTimestamp: timestamp
    };
  });

  history.push(...newRecords);
  saveDispatchHistory(history);

  // Asynchronously persist to Supabase
  newRecords.forEach(rec => {
    o2dApi.createDispatchRecord(rec).catch(err => {
      console.warn('[storageManager] createDispatchRecord background sync note:', err.message);
    });
  });
};

export const getDispatchQtyForDeliveryApproverId = (dispatchHistory, deliveryApproverId, field) => {
  return (dispatchHistory || []).reduce((sum, dh) => {
    if (Array.isArray(dh.sources)) {
      const match = dh.sources.find(s => s.deliveryApproverId === deliveryApproverId);
      return sum + (match ? (parseFloat(match[field]) || 0) : 0);
    }
    return sum + (dh.deliveryApproverId === deliveryApproverId ? (parseFloat(dh[field]) || 0) : 0);
  }, 0);
};

export const getPackagingHistory = () => getFromStorage(STORAGE_KEYS.PACKAGING_HISTORY) || [];

export const savePackagingHistory = (data) => saveToStorage(STORAGE_KEYS.PACKAGING_HISTORY, data);

export const savePackagingTransaction = (items) => {
  const history = getPackagingHistory();
  const timestamp = new Date().toISOString();

  const newRecords = items.map(item => ({
    ...item,
    id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    packagingStatus: 'Yes',
    packagingTimestamp: timestamp
  }));

  history.push(...newRecords);
  savePackagingHistory(history);

  // Update packaging_status on matching dispatches
  const dispatches = getDispatchHistory();
  items.forEach(it => {
    const ds = dispatches.find(d => d.dispatchId === it.dispatchId);
    if (ds) {
      ds.packagingStatus = 'Yes';
      ds.packagingTimestamp = timestamp;
    }
    o2dApi.updatePackaging(it.dispatchId, it).catch(err => {
      console.warn('[storageManager] updatePackaging background sync note:', err.message);
    });
  });
  saveDispatchHistory(dispatches);
};

// =====================================================================
// STAGE 7: VEHICLE LOGISTICS
// =====================================================================

export const getLogisticHistory = () => {
  const history = getFromStorage(STORAGE_KEYS.LOGISTIC_HISTORY) || [];
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.role !== 'ADMIN' && user.division && user.division !== 'Management') {
        return history.filter(record => record.division === user.division);
      }
    }
  } catch (err) {
    // ignore parse error
  }
  return history;
};

export const saveLogisticHistory = (data) => saveToStorage(STORAGE_KEYS.LOGISTIC_HISTORY, data);

export const saveLogisticTransaction = (items) => {
  const history = getLogisticHistory();
  const timestamp = new Date().toISOString();

  const newRecords = items.map(item => ({
    ...item,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    logisticTimestamp: timestamp
  }));

  history.push(...newRecords);
  saveLogisticHistory(history);

  // Asynchronously persist to Supabase
  items.forEach(item => {
    o2dApi.saveLogisticRecord(item).catch(err => {
      console.warn('[storageManager] saveLogisticRecord background sync note:', err.message);
    });
  });
};

export const updateLogisticBiltyDetails = (orderId, { lrNumber, lrCopy } = {}) => {
  const history = getLogisticHistory();
  const updated = history.map(record => {
    if (record.orderId !== orderId) return record;
    const nextLrNumber = lrNumber ? lrNumber : record.lrNumber;
    const nextLrCopy = lrCopy ? lrCopy : record.lrCopy;
    return {
      ...record,
      lrNumber: nextLrNumber,
      lrCopy: nextLrCopy,
      biltyStatus: nextLrNumber ? 'Yes' : record.biltyStatus
    };
  });
  saveLogisticHistory(updated);
};

export const getAgencyHistory = () => getFromStorage(STORAGE_KEYS.AGENCY_HISTORY) || [];
export const saveAgencyHistory = (data) => saveToStorage(STORAGE_KEYS.AGENCY_HISTORY, data);
export const saveAgencyTransaction = (items) => {
  const history = getAgencyHistory();
  const timestamp = new Date().toISOString();

  const newRecords = items.map(item => ({
    ...item,
    id: `agy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agencyTimestamp: timestamp
  }));

  history.push(...newRecords);
  saveAgencyHistory(history);
};

// =====================================================================
// STAGE 8: CALLAN (DELIVERY CHALLAN)
// =====================================================================

export const getCallanHistory = () => {
  const history = getFromStorage(STORAGE_KEYS.CALLAN_HISTORY) || [];
  return history.map(item => {
    if (!item.orderId && item._isCustom && item.productNumber) {
      const match = item.productNumber.match(/^(.+)-CUST-\d+$/);
      if (match) return { ...item, orderId: match[1] };
    }
    return item;
  });
};

export const saveCallanHistory = (data) => saveToStorage(STORAGE_KEYS.CALLAN_HISTORY, data);

export const saveCallanTransaction = (items) => {
  const history = getCallanHistory();
  const timestamp = new Date().toISOString();

  const newRecords = items.map(item => ({
    ...item,
    id: `cln_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp
  }));

  history.push(...newRecords);
  saveCallanHistory(history);

  // Group items by dispatchId and save to Supabase
  if (items.length > 0) {
    const first = items[0];
    o2dApi.saveCallanRecord({
      dispatchId: first.dispatchId,
      orderId: first.orderId,
      callanNo: first.callanNo,
      callanDate: first.callanDate,
      callanImage: first.callanImage,
      remarks: first.remarks,
      items: items
    }).catch(err => {
      console.warn('[storageManager] saveCallanRecord background sync note:', err.message);
    });
  }
};

export const deleteCallanByOrderId = (orderId) => {
  const history = getCallanHistory();
  const updated = history.filter(item => item.orderId !== orderId);
  saveCallanHistory(updated);
};

// =====================================================================
// STAGE 9: MAKE INVOICE
// =====================================================================

export const getInvoiceHistory = () => getFromStorage(STORAGE_KEYS.INVOICE_HISTORY) || [];

export const saveInvoiceHistory = (data) => saveToStorage(STORAGE_KEYS.INVOICE_HISTORY, data);

export const saveInvoiceTransaction = (items) => {
  const history = getInvoiceHistory();
  const timestamp = new Date().toISOString();

  const newRecords = items.map(item => ({
    ...item,
    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp
  }));

  history.push(...newRecords);
  saveInvoiceHistory(history);

  // Asynchronously persist to Supabase
  items.forEach(item => {
    o2dApi.saveInvoiceRecord(item).catch(err => {
      console.warn('[storageManager] saveInvoiceRecord background sync note:', err.message);
    });
  });
};

// =====================================================================
// STAGE 10: CONFIRM DELIVERY
// =====================================================================

export const getConfirmDeliveryHistory = () => getFromStorage(STORAGE_KEYS.CONFIRM_DELIVERY_HISTORY) || [];

export const saveConfirmDeliveryHistory = (data) => saveToStorage(STORAGE_KEYS.CONFIRM_DELIVERY_HISTORY, data);

export const saveConfirmDeliveryTransaction = (items) => {
  const history = getConfirmDeliveryHistory();
  const timestamp = new Date().toISOString();

  items.forEach(item => {
    const existingIdx = history.findIndex(h => h.dispatchId === item.dispatchId);
    if (existingIdx >= 0) {
      history[existingIdx] = {
        ...history[existingIdx],
        ...item,
        updateTimestamp: timestamp
      };
    } else {
      history.push({
        ...item,
        id: `cdel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp
      });
    }

    // Persist to Supabase
    o2dApi.confirmDeliveryRecord(item).catch(err => {
      console.warn('[storageManager] confirmDeliveryRecord background sync note:', err.message);
    });
  });

  saveConfirmDeliveryHistory(history);
};

// =====================================================================
// STAGE 11: PAYMENT OPERATIONS
// =====================================================================

export const getPaymentHistory = () => getFromStorage(STORAGE_KEYS.PAYMENTS) || [];

export const savePaymentHistory = (records) => saveToStorage(STORAGE_KEYS.PAYMENTS, records);

export const savePaymentTransaction = (items) => {
  const history = getPaymentHistory();
  const timestamp = new Date().toISOString();

  const newRecords = items.map(item => ({
    ...item,
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp
  }));

  history.push(...newRecords);
  savePaymentHistory(history);

  // Asynchronously persist to Supabase
  items.forEach(item => {
    o2dApi.savePaymentRecord(item).catch(err => {
      console.warn('[storageManager] savePaymentRecord background sync note:', err.message);
    });
  });
};

// =====================================================================
// LEGACY BACKWARDS-COMPATIBILITY STUBS
// =====================================================================

export const getIndents = () => getFromStorage(STORAGE_KEYS.INDENTS) || [];
export const getPOs = () => getFromStorage(STORAGE_KEYS.POS) || [];
export const getTermsConditions = () => getFromStorage(STORAGE_KEYS.TERMS_CONDITIONS) || [];
export const getLiftingRecords = () => getFromStorage(STORAGE_KEYS.LIFTING) || [];
export const getStoreInRecords = () => getFromStorage(STORAGE_KEYS.STORE_IN) || [];
export const getDirectStoreInRecords = () => getFromStorage(STORAGE_KEYS.DIRECT_STORE_IN) || [];
export const getPayments = () => getFromStorage(STORAGE_KEYS.PAYMENTS) || [];
export const getRejectGRNRecords = () => getFromStorage(STORAGE_KEYS.REJECT_GRN) || [];
export const getDebitNotes = () => getFromStorage(STORAGE_KEYS.DEBIT_NOTES) || [];
export const getTallyEntries = () => getFromStorage(STORAGE_KEYS.TALLY_ENTRIES) || [];
export const getBillNotReceived = () => getFromStorage(STORAGE_KEYS.BILL_NOT_RECEIVED) || [];
export const getStoreIssues = () => getFromStorage(STORAGE_KEYS.STORE_ISSUES) || [];
export const getStoreReturns = () => getFromStorage(STORAGE_KEYS.STORE_RETURNS) || [];
export const getInventory = () => getFromStorage(STORAGE_KEYS.INVENTORY) || [];
export const getQuotationHistory = () => getFromStorage(STORAGE_KEYS.QUOTATION_HISTORY) || [];
export const insertQuotationHistory = (rows) => {
  const history = getQuotationHistory();
  history.push(...rows);
  saveToStorage(STORAGE_KEYS.QUOTATION_HISTORY, history);
  return history;
};

export { STORAGE_KEYS };
