/**
 * Helper utility functions for the Lead System
 */

// Helper function to determine priority based on lead source
export const determinePriority = (source) => {
    if (!source) return "Low";
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes("indiamart")) return "High";
    if (sourceLower.includes("website")) return "Medium";
    return "Low";
};

// Accepts "dd/mm/yyyy" or an ISO date/timestamp and returns a comparable Date, or null.
export const parseFlexibleDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && value.includes("/")) {
        const [d, m, y] = value.split("/");
        if (!d || !m || !y) return null;
        const parsed = new Date(Number(y), Number(m) - 1, Number(d));
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

// Parses "YYYY-MM-DD" as a LOCAL calendar date
export const parseLocalISODate = (value) => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

export const dateInRange = (value, dateFrom, dateTo) => {
    if (!dateFrom && !dateTo) return true;
    const date = parseFlexibleDate(value);
    if (!date) return false;
    if (dateFrom) {
        const from = parseLocalISODate(dateFrom);
        if (from && date < from) return false;
    }
    if (dateTo) {
        const to = parseLocalISODate(dateTo);
        if (to) {
            to.setHours(23, 59, 59, 999);
            if (date > to) return false;
        }
    }
    return true;
};

// Sales Person / Division / Date filters
export const matchesExtraFilters = (owner, division, dateValue, filters) => {
    const { salesPerson, division: divisionFilter, dateFrom, dateTo } = filters || {};
    if (salesPerson && salesPerson !== "All" && (owner || "") !== salesPerson) return false;
    if (divisionFilter && divisionFilter !== "All" && (division || "") !== divisionFilter) return false;
    if (!dateInRange(dateValue, dateFrom, dateTo)) return false;
    return true;
};

export const getBaseQuotationNo = (no) => (no || "").replace(/-R\d+$/i, "");

export const getQuotationRevisionNo = (no) => {
    const match = (no || "").match(/-R(\d+)$/i);
    return match ? parseInt(match[1], 10) : 0;
};

export const dedupeQuotationsByLead = (list, quotationNoKey = "quotationNo") => {
    const latestByLead = {};
    list.forEach(item => {
        const groupKey = item.leadNo || getBaseQuotationNo(item[quotationNoKey]);
        const existing = latestByLead[groupKey];
        if (!existing || getQuotationRevisionNo(item[quotationNoKey]) > getQuotationRevisionNo(existing[quotationNoKey])) {
            latestByLead[groupKey] = item;
        }
    });
    return Object.values(latestByLead);
};

export const generateDefaultQuotationNumber = (seq = 1, date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    const fy = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
    return `NTC/PO/${fy}/${String(seq).padStart(3, "0")}`;
};
