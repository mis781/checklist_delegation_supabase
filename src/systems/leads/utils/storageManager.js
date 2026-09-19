// Central storage manager for the Leads system in master system
import supabase from "../../../SupabaseClient";
import { companies as dummyCompanies, fmsData } from "../data/dummyData";

const KEYS = {
  LEAD_RECEIVER_NAMES: "master_lead_receiver_names",
  LEAD_SOURCES: "master_lead_sources",
  NOBS: "master_nobs",
  CREDIT_DAYS: "master_credit_days",
  CREDIT_LIMITS: "master_credit_limits",
  SUBMITTED_LEADS: "submitted_leads",
  RESOLVED_LEADS: "resolved_lead_numbers",
  QUOTATION_READY_LEADS: "quotation_ready_leads",
  FOLLOW_UP_HISTORY: "follow_up_history",
  ADVANCE_PAYMENTS: "advance_payment_entries",
  SAVED_QUOTATIONS: "saved_quotations",
};

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(`Error reading "${key}" from storage:`, error);
    return null;
  }
}

function writeList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing "${key}" to storage:`, error);
  }
}

// ---------------- Simple name-list helper ----------------
function createNameListStore(key, prefix, seedNames) {
  const noField = `${prefix}No`;

  const seed = () => seedNames.map((name, index) => ({
    id: `seed-${prefix}-${index + 1}`,
    timestamp: new Date(Date.now() - (seedNames.length - index) * 60 * 60 * 1000).toISOString(),
    [noField]: `${prefix.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    name
  }));

  return {
    get: () => {
      const existing = readList(key);
      if (existing !== null) return existing;

      const seeded = seed();
      writeList(key, seeded);
      return seeded;
    },
    save: (list) => writeList(key, list),
  };
}

// ---------------- 5 Leads Masters Managed in Global Settings ----------------

// 1. Sales Person Name / Lead Receiver Names
const leadReceiverNameStore = createNameListStore(
  KEYS.LEAD_RECEIVER_NAMES, "lrn", ["Shadab", "Sajit", "Musaib", "Faizan", "Rajesh Kumar", "Priya Sharma"]
);
export const getLeadReceiverNames = leadReceiverNameStore.get;
export const saveLeadReceiverNames = leadReceiverNameStore.save;

// 2. Lead Sources
const leadSourceStore = createNameListStore(
  KEYS.LEAD_SOURCES, "ls", ["IndiaMART", "Justdial", "Website", "Referral", "Social Media", "Direct Visit", "Other"]
);
export const getLeadSources = leadSourceStore.get;
export const saveLeadSources = leadSourceStore.save;

// 3. NOB (Nature of Business)
const nobStore = createNameListStore(
  KEYS.NOBS, "nob", ["Manufacturing", "Trading", "Service", "Retail", "OEM", "Contractor"]
);
export const getNOBs = nobStore.get;
export const saveNOBs = nobStore.save;

// 4. Credit Days
const creditDaysStore = createNameListStore(
  KEYS.CREDIT_DAYS, "cd", ["7 Days", "15 Days", "30 Days", "45 Days", "60 Days"]
);
export const getCreditDays = creditDaysStore.get;
export const saveCreditDays = creditDaysStore.save;

// 5. Credit Limits
const creditLimitStore = createNameListStore(
  KEYS.CREDIT_LIMITS, "cl", ["50,000", "1,00,000", "2,50,000", "5,00,000", "10,00,000"]
);
export const getCreditLimits = creditLimitStore.get;
export const saveCreditLimits = creditLimitStore.save;

// ---------------- Existing Enterprise Masters Integration ----------------

// 6. UOM (Units of Measurement) - Sourced from Global Settings Inventory
export function getUOMs() {
  const cached = readList("master_inventory_units_cache");
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached.map((u, i) => ({ id: `uom-${i}`, name: typeof u === "string" ? u : (u.unit || u.name) }));
  }

  // Fallback standard symbols
  const defaults = ["Nos", "Kg", "Mtr", "Pkt", "Set", "Bag", "Ltr", "Box", "Roll"];
  return defaults.map((name, i) => ({ id: `default-uom-${i}`, name }));
}

// Background async sync for Inventory UOMs
export async function syncInventoryUOMs() {
  try {
    const { data, error } = await supabase.from("inventory_units").select("unit");
    if (!error && data && data.length > 0) {
      const symbols = data.map((d) => d.unit).filter(Boolean);
      writeList("master_inventory_units_cache", symbols);
    }
  } catch (err) {
    console.warn("Could not sync inventory units:", err);
  }
}

// 7. Divisions - Sourced from Checklist & Delegation -> Settings -> Department -> Divisions
export function getDivisions() {
  const cached = readList("master_divisions_cache");
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached.map((d, i) => ({ id: `div-${i}`, name: typeof d === "string" ? d : (d.name || d.division) }));
  }

  const defaults = ["Nutech Composites", "NuTech Pipes", "Protech Max"];
  return defaults.map((name, i) => ({ id: `default-div-${i}`, name }));
}

export async function syncDivisions() {
  try {
    const { data, error } = await supabase.from("divisions").select("name");
    if (!error && data && data.length > 0) {
      const names = data.map((d) => d.name).filter(Boolean);
      writeList("master_divisions_cache", names);
    }
  } catch (err) {
    console.warn("Could not sync divisions:", err);
  }
}

// 8. Companies / Contacts - Sourced from Global Settings -> Purchase -> Company Addresses (master_addresses) or local cache
export function getCompanies() {
  const cached = readList("master_addresses_companies_cache");
  let list = cached;
  if (!list || !Array.isArray(list) || list.length === 0) {
    list = dummyCompanies.map((c, index) => ({
      id: `seed-company-${index + 1}`,
      timestamp: new Date(Date.now() - (dummyCompanies.length - index) * 3600000).toISOString(),
      vnNo: `CN-${String(index + 1).padStart(3, "0")}`,
      name: c.name || "",
      gst: c.gst || c.consignorGSTIN || "",
      email: c.email || "",
      phone: c.phone || c.phoneNumber || "",
      state: c.state || c.consignorState || "Delhi",
      city: c.city || c.location || "Delhi",
      nob: c.nob || (index === 0 ? "Manufacturing" : "Trading"),
      division: c.division || (index === 0 ? "Nutech Composites" : "Nutech Pipes"),
      address: c.address || c.consignorAddress || "",
      contactPersons: c.contactPersons && c.contactPersons.length > 0 ? c.contactPersons : [
        { name: c.salesPerson || "Contact Manager", designation: "Manager", number: c.phone || c.phoneNumber || "" }
      ],
      proof: c.proof || "",
    }));
    writeList("master_addresses_companies_cache", list);
  }
  return list;
}

export function saveCompanies(list) {
  writeList("master_addresses_companies_cache", list);
}

export function saveCompany(company) {
  const list = getCompanies();
  const updated = [...list, company];
  writeList("master_addresses_companies_cache", updated);
}

export async function syncCompanyAddresses() {
  try {
    const { data, error } = await supabase.from("master_addresses").select("*");
    if (!error && data && data.length > 0) {
      const formatted = data.map((addr) => {
        // Extract company prefix e.g. "Nutech Composites - Bhilai Unit" -> "Nutech Composites"
        const fullName = addr.name || addr.company_name || "";
        const companyName = fullName.includes(" - ") ? fullName.split(" - ")[0].trim() : fullName;

        return {
          id: addr.id,
          name: companyName,
          fullName: fullName,
          gst: addr.gstin || addr.gst || "",
          email: addr.email || "",
          phone: addr.phone || addr.mobile || "",
          address: addr.address || "",
          state: addr.state || "",
          city: addr.city || "",
          division: addr.division || "",
          nob: addr.nob || "Manufacturing",
          contactPersons: addr.contact_person
            ? [{ name: addr.contact_person, designation: "Manager", number: addr.phone || "" }]
            : []
        };
      });
      writeList("master_addresses_companies_cache", formatted);
    }
  } catch (err) {
    console.warn("Could not sync company addresses:", err);
  }
}

// 9. Terms and Conditions - Preset manual array where used in Quotation
export function getTermsAndConditions() {
  return [
    { id: "tnc-1", description: "Payment Terms: 50% advance along with confirmed Purchase Order, balance against Proforma Invoice before dispatch." },
    { id: "tnc-2", description: "Validity: Quotation is valid for 15 days from the date of issuance." },
    { id: "tnc-3", description: "Delivery: Within 2-3 weeks from the date of confirmed PO and receipt of advance payment." },
    { id: "tnc-4", description: "Freight & Insurance: Borne by customer at actuals, unless specifically agreed otherwise in writing." },
    { id: "tnc-5", description: "Taxes: GST applicable as per prevailing statutory rates at the time of final invoicing." },
    { id: "tnc-6", description: "Warranty: 12 months manufacturer warranty from dispatch against manufacturing defects only." }
  ];
}

// ---------------- Submitted Leads ----------------
export function getSubmittedLeads() {
  const leads = readList(KEYS.SUBMITTED_LEADS);
  if (leads !== null) return leads;
  // Seed with initial demo lead
  writeList(KEYS.SUBMITTED_LEADS, fmsData);
  return fmsData;
}

export function saveSubmittedLeads(leads) {
  writeList(KEYS.SUBMITTED_LEADS, leads);
}

export function saveSubmittedLead(lead) {
  const leads = getSubmittedLeads();
  writeList(KEYS.SUBMITTED_LEADS, [...leads, lead]);
}

// ---------------- Resolved Leads ----------------
export function getResolvedLeadNumbers() {
  return readList(KEYS.RESOLVED_LEADS) || [];
}

export function markLeadResolved(leadNumber) {
  if (!leadNumber) return;
  const resolved = getResolvedLeadNumbers();
  if (!resolved.includes(leadNumber)) {
    writeList(KEYS.RESOLVED_LEADS, [...resolved, leadNumber]);
  }
}

// ---------------- Quotation-Ready Leads ----------------
export function getQuotationReadyLeads() {
  return readList(KEYS.QUOTATION_READY_LEADS) || {};
}

export function saveQuotationReadyLead(leadNumber, leadData) {
  if (!leadNumber) return;
  const existing = getQuotationReadyLeads();
  writeList(KEYS.QUOTATION_READY_LEADS, { ...existing, [leadNumber]: leadData });
}

// ---------------- Follow-Up History ----------------
export function getFollowUpHistory() {
  return readList(KEYS.FOLLOW_UP_HISTORY) || [];
}

export function addFollowUpHistory(entry) {
  if (!entry) return;
  const history = getFollowUpHistory();
  writeList(KEYS.FOLLOW_UP_HISTORY, [...history, entry]);
}

// ---------------- Advance Payments ----------------
export function getAdvancePayments() {
  return readList(KEYS.ADVANCE_PAYMENTS) || {};
}

export function saveAdvancePayment(quotationNo, data) {
  if (!quotationNo) return;
  const existing = getAdvancePayments();
  writeList(KEYS.ADVANCE_PAYMENTS, {
    ...existing,
    [quotationNo]: { ...existing[quotationNo], ...data }
  });
}

// ---------------- Saved Quotations ----------------
export function getSavedQuotations() {
  return readList(KEYS.SAVED_QUOTATIONS) || {};
}

export function saveSavedQuotation(quotationNo, data) {
  if (!quotationNo) return;
  const existing = getSavedQuotations();
  writeList(KEYS.SAVED_QUOTATIONS, {
    ...existing,
    [quotationNo]: { ...existing[quotationNo], ...data }
  });
}

// ---------------- Users ----------------
export function getUsers() {
  const cached = readList("master_users");
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  return [
    { username: "admin", password: "123", userType: "admin" },
    { username: "user1", password: "123", userType: "user" },
    { username: "Shadab", password: "123", userType: "admin" }
  ];
}
