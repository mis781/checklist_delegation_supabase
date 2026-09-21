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
  FOLLOW_UP_DRAFTS: "follow_up_drafts",
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
  }

  // Deduplicate by normalized name (trim and case-insensitive)
  let hasDuplicates = false;
  const map = new Map();

  for (const item of list) {
    const rawName = (item.name || "").trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        ...item,
        name: rawName,
        contactPersons: Array.isArray(item.contactPersons) ? [...item.contactPersons] : [],
      });
    } else {
      hasDuplicates = true;
      const existing = map.get(key);

      // Merge non-empty details
      if (!existing.gst && item.gst) existing.gst = item.gst;
      if (!existing.email && item.email) existing.email = item.email;
      if (!existing.phone && item.phone) existing.phone = item.phone;
      if (!existing.state && item.state) existing.state = item.state;
      if (!existing.city && item.city) existing.city = item.city;
      if (!existing.nob && item.nob) existing.nob = item.nob;
      if (!existing.division && item.division) existing.division = item.division;
      if (!existing.address && item.address) existing.address = item.address;
      if (!existing.proof && item.proof) existing.proof = item.proof;
      if (item.status && !existing.status) existing.status = item.status;

      // Merge contact persons without duplicates
      const currentContacts = existing.contactPersons || [];
      const incomingContacts = Array.isArray(item.contactPersons) ? item.contactPersons : [];
      for (const inc of incomingContacts) {
        if (!inc || (!inc.name && !inc.number)) continue;
        const exists = currentContacts.some(
          (c) =>
            (c.name || "").trim().toLowerCase() === (inc.name || "").trim().toLowerCase() &&
            (c.number || "").trim() === (inc.number || "").trim()
        );
        if (!exists) {
          currentContacts.push(inc);
        }
      }
      existing.contactPersons = currentContacts;
    }
  }

  const deduplicated = Array.from(map.values());

  // Ensure every item has a unique, properly formatted vnNo
  let maxVn = 0;
  deduplicated.forEach((item) => {
    const match = (item.vnNo || "").match(/CN-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxVn) maxVn = num;
    }
  });

  deduplicated.forEach((item) => {
    if (!item.vnNo) {
      maxVn += 1;
      item.vnNo = `CN-${String(maxVn).padStart(3, "0")}`;
    }
  });

  if (hasDuplicates || deduplicated.length !== list.length) {
    writeList("master_addresses_companies_cache", deduplicated);
  }

  return deduplicated;
}

export function saveCompanies(list) {
  writeList("master_addresses_companies_cache", list);
}

export function saveCompany(company) {
  if (!company || !company.name) return null;
  const list = getCompanies();
  const normalizedName = company.name.trim().toLowerCase();
  const existingIndex = list.findIndex(
    (c) => (c.name || "").trim().toLowerCase() === normalizedName
  );

  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    // Merge contact persons
    const currentContacts = Array.isArray(existing.contactPersons) ? [...existing.contactPersons] : [];
    const incomingContacts = Array.isArray(company.contactPersons) ? company.contactPersons : [];

    incomingContacts.forEach((inc) => {
      if (!inc || (!inc.name && !inc.number)) return;
      const alreadyPresent = currentContacts.some(
        (c) =>
          (c.name || "").trim().toLowerCase() === (inc.name || "").trim().toLowerCase() &&
          (c.number || "").trim() === (inc.number || "").trim()
      );
      if (!alreadyPresent) {
        currentContacts.push(inc);
      }
    });

    const merged = {
      ...existing,
      ...company,
      id: existing.id,
      vnNo: existing.vnNo,
      timestamp: existing.timestamp,
      contactPersons: currentContacts.length > 0 ? currentContacts : existing.contactPersons,
      gst: company.gst || existing.gst || "",
      email: company.email || existing.email || "",
      phone: company.phone || existing.phone || "",
      state: company.state || existing.state || "",
      city: company.city || existing.city || "",
      nob: company.nob || existing.nob || "",
      division: company.division || existing.division || "",
      address: company.address || existing.address || "",
      proof: company.proof || existing.proof || "",
      status: company.status !== undefined ? company.status : existing.status,
    };

    list[existingIndex] = merged;
    writeList("master_addresses_companies_cache", list);
    return merged;
  } else {
    // Generate next VN No
    let maxVn = 0;
    list.forEach((c) => {
      const match = (c.vnNo || "").match(/CN-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxVn) maxVn = num;
      }
    });
    const vnNo = company.vnNo || `CN-${String(maxVn + 1).padStart(3, "0")}`;
    const newEntry = {
      ...company,
      id: company.id || `company-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: company.timestamp || new Date().toISOString(),
      vnNo,
    };
    const updated = [...list, newEntry];
    writeList("master_addresses_companies_cache", updated);
    return newEntry;
  }
}

// Map of companies that have converted leads, quotations, or advance payments
export function getCompanyConversionMap() {
  const convertedSet = new Set();

  // 1. Check submitted leads
  const leads = getSubmittedLeads();
  const leadCompanyMap = {};
  leads.forEach((l) => {
    const cName = (l.companyName || l.customerName || l.company || "").trim().toLowerCase();
    if (l.leadNumber && cName) {
      leadCompanyMap[l.leadNumber] = cName;
    }
    const st = (l.status || "").toLowerCase();
    if (st === "completed" || st === "converted" || l.isConverted === true) {
      if (cName) convertedSet.add(cName);
    }
  });

  // 2. Check follow up history
  const history = getFollowUpHistory();
  history.forEach((h) => {
    const cName = (h.companyName || leadCompanyMap[h.leadNo] || "").trim().toLowerCase();
    if (!cName) return;

    const enq = (h.enquiryReceivedStatus || "").toLowerCase();
    const say = (h.customerSay || "").toLowerCase();
    const st = (h.status || "").toLowerCase();

    const isInterestedOrCompleted =
      enq === "make quotation" ||
      enq === "order receive" ||
      enq === "order received" ||
      say === "interested" ||
      say === "asked for quotation" ||
      say === "order confirmed" ||
      st === "completed";

    if (isInterestedOrCompleted) {
      convertedSet.add(cName);
    }
  });

  // 3. Check saved quotations
  const quotations = getSavedQuotations();
  Object.values(quotations).forEach((q) => {
    const cName = (
      q.customerDetails?.companyName ||
      q.clientName ||
      q.companyName ||
      leadCompanyMap[q.leadNo] ||
      ""
    ).trim().toLowerCase();

    if (!cName) return;
    const qStatus = (q.status || "").toLowerCase();
    if (
      qStatus.includes("order") ||
      qStatus.includes("received") ||
      qStatus.includes("confirmed") ||
      qStatus.includes("approved") ||
      q.orderReceived === true ||
      qStatus === "completed"
    ) {
      convertedSet.add(cName);
    }
  });

  // 4. Check advance payments
  const advances = getAdvancePayments();
  Object.values(advances).forEach((adv) => {
    const cName = (adv.companyName || leadCompanyMap[adv.leadNo] || "").trim().toLowerCase();
    if (cName && (adv.receivedAdvance === "Yes" || Number(adv.advanceAmount || adv.amount) > 0)) {
      convertedSet.add(cName);
    }
  });

  // 5. Check direct company list for explicit status override
  const companies = readList("master_addresses_companies_cache") || [];
  companies.forEach((c) => {
    const cName = (c.name || "").trim().toLowerCase();
    if (!cName) return;
    if (c.status === "Converted" || c.isConverted === true) {
      convertedSet.add(cName);
    } else if (c.status === "Unconverted") {
      convertedSet.delete(cName);
    }
  });

  return convertedSet;
}

// Map of companies with detailed conversion / cancellation stage and reasons
export function getCompanyStageMap() {
  const stageMap = {}; // normalized companyName -> { isConverted: boolean, stage: string, subStage: string, reason: string, leadNo?: string, quotationNo?: string }

  const leads = getSubmittedLeads();
  const leadCompanyMap = {};
  leads.forEach((l) => {
    const cName = (l.companyName || l.customerName || l.company || "").trim().toLowerCase();
    if (l.leadNumber && cName) {
      leadCompanyMap[l.leadNumber] = cName;
    }
  });

  // Track latest events per company
  // 1. Follow-ups
  const followups = getFollowUpHistory();
  const followupsByCompany = {};
  followups.forEach((f) => {
    const cName = (f.companyName || leadCompanyMap[f.leadNo] || "").trim().toLowerCase();
    if (cName) {
      followupsByCompany[cName] = f;
    }
  });

  // 2. Quotations
  const quotations = getSavedQuotations();
  const quotationsByCompany = {};
  Object.values(quotations).forEach((q) => {
    const cName = (
      q.customerDetails?.companyName ||
      q.clientName ||
      q.companyName ||
      leadCompanyMap[q.leadNo] ||
      ""
    ).trim().toLowerCase();
    if (cName) {
      quotationsByCompany[cName] = q;
    }
  });

  // 3. Advances
  const advances = getAdvancePayments();
  const advancesByCompany = {};
  Object.values(advances).forEach((adv) => {
    const cName = (adv.companyName || leadCompanyMap[adv.leadNo] || "").trim().toLowerCase();
    if (cName) {
      advancesByCompany[cName] = adv;
    }
  });

  // 4. Determine stage for each company
  const companies = getCompanies();
  companies.forEach((c) => {
    const cName = (c.name || "").trim().toLowerCase();
    if (!cName) return;

    // Check if company has explicit status
    if (c.status === "Converted" || c.isConverted === true) {
      stageMap[cName] = {
        isConverted: true,
        stage: "Converted",
        subStage: "Manual / Completed",
        reason: "Marked as Converted",
      };
      return;
    }

    // Check advances first
    const adv = advancesByCompany[cName];
    if (adv && (adv.receivedAdvance === "Yes" || Number(adv.advanceAmount || adv.amount) > 0)) {
      stageMap[cName] = {
        isConverted: true,
        stage: "Advance Received",
        subStage: "Advance Payment",
        reason: `Advance amount: ₹${adv.advanceAmount || adv.amount || 0}`,
        quotationNo: adv.quotationNo || "",
        leadNo: adv.leadNo || "",
      };
      return;
    }

    // Check quotations (further down the pipeline)
    const quote = quotationsByCompany[cName];
    const fup = followupsByCompany[cName];

    if (quote) {
      const qStatus = (quote.status || "").toLowerCase();
      if (
        (qStatus.includes("order") && (qStatus.includes("received") || qStatus.includes("confirmed") || qStatus.includes("approved"))) ||
        quote.orderReceived === true ||
        qStatus === "completed"
      ) {
        stageMap[cName] = {
          isConverted: true,
          stage: "Order Received",
          subStage: "Converted",
          reason: "Order successfully received",
          quotationNo: quote.quotationNo || quote.poNumber || "",
          leadNo: quote.leadNo || "",
        };
        return;
      } else if (
        qStatus === "order not received" ||
        qStatus === "not sent to order" ||
        qStatus === "cancelled" ||
        qStatus === "rejected" ||
        qStatus.includes("not received")
      ) {
        stageMap[cName] = {
          isConverted: false,
          stage: "Quotation Stage",
          subStage: "Order Not Received",
          reason: quote.orderNotReceivedReason || quote.reason || "Order not received after quotation",
          leadNo: quote.leadNo || "",
          quotationNo: quote.quotationNo || quote.poNumber || "",
        };
        return;
      }
    }

    if (fup) {
      const enq = (fup.enquiryReceivedStatus || "").toLowerCase();
      const say = (fup.customerSay || "").toLowerCase();
      const st = (fup.status || "").toLowerCase();

      if (
        enq === "make quotation" ||
        enq === "order receive" ||
        enq === "order received" ||
        say === "interested" ||
        say === "asked for quotation" ||
        say === "order confirmed" ||
        st === "completed"
      ) {
        stageMap[cName] = {
          isConverted: true,
          stage: "Quotation Initiated",
          subStage: "Interested / Quotation",
          reason: "Lead converted to quotation",
          leadNo: fup.leadNo || "",
        };
        return;
      } else if (enq === "not interested" || say === "not interested") {
        stageMap[cName] = {
          isConverted: false,
          stage: "Follow-up Stage",
          subStage: "Not Interested",
          reason: fup.notInterestedReason || (fup.customerSay ? `Customer said: ${fup.customerSay}` : "Marked Not Interested"),
          leadNo: fup.leadNo || "",
        };
        return;
      } else if (enq === "expected" || st === "pending") {
        stageMap[cName] = {
          isConverted: false,
          stage: "Follow-up Stage",
          subStage: "Callback Pending",
          reason: fup.nextAction ? `Next Action: ${fup.nextAction}` : "Pending follow-up call",
          leadNo: fup.leadNo || "",
        };
        return;
      }
    }

    // Check if lead exists but no follow-up
    const matchingLead = leads.find(
      (l) => (l.companyName || l.customerName || l.company || "").trim().toLowerCase() === cName
    );
    if (matchingLead) {
      stageMap[cName] = {
        isConverted: false,
        stage: "Initial Lead Stage",
        subStage: "No Follow-up Logged",
        reason: matchingLead.notes || "Lead registered, awaiting first follow-up",
        leadNo: matchingLead.leadNumber || "",
      };
      return;
    }

    // Direct contact (no lead created yet)
    stageMap[cName] = {
      isConverted: false,
      stage: "Direct Contact",
      subStage: "No Enquiry Logged",
      reason: "Registered contact with no leads created yet",
    };
  });

  return stageMap;
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
  const list = readList(KEYS.RESOLVED_LEADS) || [];
  const history = readList(KEYS.FOLLOW_UP_HISTORY) || [];
  const latestByLead = {};
  history.forEach((entry) => {
    if (entry.leadNo) {
      latestByLead[entry.leadNo] = entry;
    }
  });

  const resolvedSet = new Set(list);

  // Synchronize based on the latest follow-up outcome:
  // - "Make Quotation" or "Not Interested" => COMPLETED / RESOLVED (must NOT show in Pending)
  // - "Expected" => PENDING (MUST show in Pending)
  Object.entries(latestByLead).forEach(([leadNo, latest]) => {
    const enq = (latest.enquiryReceivedStatus || "").trim().toLowerCase();
    if (enq === "make quotation" || enq === "not interested") {
      resolvedSet.add(leadNo);
    } else if (enq === "expected") {
      resolvedSet.delete(leadNo);
    }
  });

  const activeResolved = Array.from(resolvedSet);
  writeList(KEYS.RESOLVED_LEADS, activeResolved);
  return activeResolved;
}

export function markLeadResolved(leadNumber) {
  if (!leadNumber) return;
  const resolved = getResolvedLeadNumbers();
  if (!resolved.includes(leadNumber)) {
    writeList(KEYS.RESOLVED_LEADS, [...resolved, leadNumber]);
  }
}

export function unmarkLeadResolved(leadNumber) {
  if (!leadNumber) return;
  const resolved = readList(KEYS.RESOLVED_LEADS) || [];
  if (resolved.includes(leadNumber)) {
    writeList(KEYS.RESOLVED_LEADS, resolved.filter((no) => no !== leadNumber));
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

// ---------------- Follow-Up Drafts ----------------
export function getFollowUpDrafts() {
  return readList(KEYS.FOLLOW_UP_DRAFTS) || {};
}

export function getFollowUpDraft(leadNumber) {
  if (!leadNumber) return null;
  const drafts = getFollowUpDrafts();
  return drafts[leadNumber] || null;
}

export function saveFollowUpDraft(leadNumber, draftData) {
  if (!leadNumber) return;
  const drafts = getFollowUpDrafts();
  writeList(KEYS.FOLLOW_UP_DRAFTS, {
    ...drafts,
    [leadNumber]: {
      ...draftData,
      leadNo: leadNumber,
      savedAt: new Date().toISOString()
    }
  });
}

export function clearFollowUpDraft(leadNumber) {
  if (!leadNumber) return;
  const drafts = getFollowUpDrafts();
  if (drafts[leadNumber]) {
    const updated = { ...drafts };
    delete updated[leadNumber];
    writeList(KEYS.FOLLOW_UP_DRAFTS, updated);
  }
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
