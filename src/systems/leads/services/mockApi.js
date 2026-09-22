
import { dropdowns, companies, fmsData, quotations, enquiryToOrder, products } from '../data/dummyData';
import {
    getSubmittedLeads, saveSubmittedLead,
    getResolvedLeadNumbers, markLeadResolved, unmarkLeadResolved,
    getQuotationReadyLeads, saveQuotationReadyLead,
    getFollowUpHistory, addFollowUpHistory,
    getFollowUpDrafts, getFollowUpDraft, saveFollowUpDraft, clearFollowUpDraft,
    getCompanies,
    getAdvancePayments, saveAdvancePayment,
    getSavedQuotations, saveSavedQuotation,
    getQuotationTrackerHistory, addQuotationTrackerHistory,
    getUsers
} from '../utils/storageManager';

const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 500));

// Helper function to determine priority based on lead source (mirrors the
// badge logic on the Followup Tracker page)
const determinePriority = (source) => {
    if (!source) return "Low";
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes("indiamart")) return "High";
    if (sourceLower.includes("website")) return "Medium";
    return "Low";
};

// ---- Dashboard filter helpers (Sales Person / Division / Date range) ----

// Accepts "dd/mm/yyyy" (leads/history) or an ISO date/timestamp (saved
// quotations/advance payments) and returns a comparable Date, or null.
const parseFlexibleDate = (value) => {
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

// <input type="date"> always hands back "YYYY-MM-DD" — parse it as a LOCAL
// calendar date rather than via `new Date("YYYY-MM-DD")`, which the JS spec
// treats as UTC midnight. Comparing that UTC instant against the local-time
// dates parseFlexibleDate builds could exclude records dated exactly on the
// From/To boundary day in any positive-UTC-offset timezone (e.g. IST).
const parseLocalISODate = (value) => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

const dateInRange = (value, dateFrom, dateTo) => {
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

// Sales Person / Division / Date filters, layered on top of whatever
// admin-vs-own-data permission check already applied.
const matchesExtraFilters = (owner, division, dateValue, filters) => {
    const { salesPerson, division: divisionFilter, dateFrom, dateTo } = filters || {};
    if (salesPerson && salesPerson !== "All" && (owner || "") !== salesPerson) return false;
    if (divisionFilter && divisionFilter !== "All" && (division || "") !== divisionFilter) return false;
    if (!dateInRange(dateValue, dateFrom, dateTo)) return false;
    return true;
};

// Quotations and Advance Payment entries don't carry their own salesperson
// — they're attributed to whoever owns the lead that produced them.
const buildLeadOwnerMap = () => {
    const map = {};
    fmsData.forEach(row => {
        map[row.leadNumber] = { owner: row.receiver || row.assignedUser || "", division: row.division || "" };
    });
    getSubmittedLeads().forEach(lead => {
        map[lead.leadNumber] = { owner: lead.receiverName || "", division: lead.division || "" };
    });
    return map;
};

// A revised quotation ("NTC/PO/26-27/001-R1") is saved as its own record
// alongside the one it revised — the same deal, not a second one — so
// anything counting "quotations sent" per lead must collapse each lead
// down to just its latest revision first, or a single quoted lead inflates
// the count (and its summed amount) once per revision.
const getBaseQuotationNo = (no) => (no || "").replace(/-R\d+$/i, "");
const getQuotationRevisionNo = (no) => {
    const match = (no || "").match(/-R(\d+)$/i);
    return match ? parseInt(match[1], 10) : 0;
};

const dedupeQuotationsByLead = (list, quotationNoKey = "quotationNo") => {
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

// Next Lead No. is always the highest "LD-###" seen (seed + real) plus
// one — not a count of how many records happen to exist. A count-based
// scheme breaks the moment any seed/dummy row is added or removed (it did:
// removing a stale dummy lead shifted every subsequent real lead's number).
const getNextLeadNumber = () => {
    const allLeadNumbers = [
        ...fmsData.map(row => row.leadNumber),
        ...getSubmittedLeads().map(lead => lead.leadNumber)
    ];
    let maxSeq = 0;
    allLeadNumbers.forEach(no => {
        const match = (no || "").match(/^LD-(\d+)$/i);
        if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
        }
    });
    return `LD-${String(maxSeq + 1).padStart(3, '0')}`;
};

export const mockApi = {
    login: async (username, password) => {
        await simulateDelay();
        // Checks the Settings page's live Users list (seeded with the same
        // 3 demo accounts the app always shipped with) instead of the old
        // hardcoded dummyData import, so a user added/edited there can log
        // in immediately.
        const user = getUsers().find(u => u.username === username && u.password === password);
        if (user) {
            return {
                success: true,
                user: {
                    username: user.username,
                    userType: user.userType,
                    division: user.division || "",
                    loginTime: new Date().toISOString()
                }
            };
        }
        return { success: false, message: "Invalid credentials" };
    },

    fetchUserData: async (username, userType) => {
        await simulateDelay();
        // In the original app, this returned rows from 'Data' sheet.
        // We'll mimic that by returning fmsData, filtered if necessary.
        // The original app expected raw rows. We should probably return clean objects
        // and update the app to use them. For now, let's return clean objects.
        if (userType === 'admin') {
            return fmsData;
        }
        return fmsData.filter(d => d.assignedUser === username);
    },

    fetchDropdowns: async () => {
        await simulateDelay();
        return dropdowns;
    },

    fetchCompanies: async () => {
        await simulateDelay();
        return companies;
    },

    // Looks up a lead's originally-captured details (by its lead number) so
    // follow-up forms can pre-fill fields like State/NOB instead of asking
    // the user to re-enter them.
    fetchLeadByNumber: async (leadNo) => {
        await simulateDelay();
        if (!leadNo) return { success: false };

        const fmsMatch = fmsData.find(row => row.leadNumber === leadNo);
        if (fmsMatch) {
            return {
                success: true,
                lead: {
                    state: fmsMatch.state || "",
                    nob: fmsMatch.nob || "",
                    city: fmsMatch.city || "",
                    division: fmsMatch.division || "",
                    address: fmsMatch.address || "",
                    attachment: fmsMatch.attachment || ""
                }
            };
        }

        const submittedMatch = getSubmittedLeads().find(lead => lead.leadNumber === leadNo);
        if (submittedMatch) {
            return {
                success: true,
                lead: {
                    state: submittedMatch.state || "",
                    nob: submittedMatch.nob || "",
                    city: submittedMatch.city || "",
                    division: submittedMatch.division || "",
                    address: submittedMatch.address || "",
                    attachment: submittedMatch.attachment || ""
                }
            };
        }

        return { success: false };
    },

    submitLead: async (leadData) => {
        await simulateDelay();

        const leadNumber = getNextLeadNumber();

        const newLead = {
            ...leadData,
            leadNumber,
            timestamp: new Date().toISOString()
        };

        saveSubmittedLead(newLead);

        return { success: true, leadNumber };
    },

    generateLeadNumber: async () => {
        await simulateDelay();
        return getNextLeadNumber();
    },

    // Company Master's "Enquiry" button — creates a lead on the fly from an
    // existing company's own master data (skipping the New Lead form) and
    // hands back its auto-generated Lead No. so the caller can jump
    // straight into the Lead Follow-Up ("Call Now") form for it.
    // leadNumber is optional — pass the value already previewed via
    // generateLeadNumber() so what's shown on screen before Submit matches
    // what actually gets saved; omit it to have one computed fresh here.
    createEnquiryLead: async (company, receiverName, leadNumber) => {
        await simulateDelay();

        leadNumber = leadNumber || getNextLeadNumber();
        const now = new Date();

        const newLead = {
            leadNumber,
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('en-GB'),
            receiverName: receiverName || "System",
            source: "Company Master",
            leadType: "Incoming",
            salesType: "Existing Customer",
            companyName: company.name || "",
            phoneNumber: company.phone || "",
            salespersonName: company.contactPersons?.[0]?.name || "",
            location: company.city || "",
            email: company.email || "",
            contactPersons: company.contactPersons || [],
            state: company.state || "",
            city: company.city || "",
            address: company.address || "",
            nob: company.nob || "",
            division: company.division || "",
            notes: "Enquiry raised directly from Company Master.",
            interaction: "",
            attachment: company.proof || ""
        };

        saveSubmittedLead(newLead);

        return { success: true, leadNumber };
    },

    // Dashboard Metrics
    // filters: { salesPerson, division, dateFrom, dateTo } — all optional.
    fetchDashboardMetrics: async (currentUser, isAdminFunc, filters = {}) => {
        await simulateDelay();

        const username = currentUser?.username;
        const isAdmin = isAdminFunc();
        const ownedBy = (owner) => isAdmin || owner === username;
        const resolvedLeadNumbers = getResolvedLeadNumbers();
        const ownerMap = buildLeadOwnerMap();

        // ---- Leads (seed + real) ----
        const seedLeads = fmsData.map(row => ({
            owner: row.receiver || row.assignedUser || "",
            division: row.division || "",
            date: row.date || "",
            isPending: !!row.hasPendingFollowUp && !resolvedLeadNumbers.includes(row.leadNumber)
        }));
        const realLeads = getSubmittedLeads().map(lead => ({
            owner: lead.receiverName || "",
            division: lead.division || "",
            date: lead.date || "",
            isPending: !resolvedLeadNumbers.includes(lead.leadNumber)
        }));
        const leads = [...seedLeads, ...realLeads].filter(l =>
            ownedBy(l.owner) && matchesExtraFilters(l.owner, l.division, l.date, filters)
        );

        // ---- Quotations sent (seed + real), attributed via their lead ----
        // A revision is the same quotation being updated, not a new one
        // sent — dedupe to the latest revision per lead first so a
        // revised quotation isn't counted (and its amount summed) twice.
        const seedQuotations = quotations.map(q => ({
            owner: q.assignedUser || "",
            division: ownerMap[q.leadNo]?.division || "",
            date: q.date || "",
            amount: Number(q.total) || 0,
            leadNo: q.leadNo || "",
            quotationNo: q.quotationNo || ""
        }));
        const realQuotationsRaw = Object.values(getSavedQuotations()).map(q => ({
            owner: ownerMap[q.leadNo]?.owner || "",
            division: q.division || ownerMap[q.leadNo]?.division || "",
            date: q.quotationDate || q.savedAt || "",
            amount: Number(q.grandTotal) || 0,
            leadNo: q.leadNo || "",
            quotationNo: q.quotationNo || q.poNumber || ""
        }));
        const realQuotations = dedupeQuotationsByLead(realQuotationsRaw);
        const allQuotations = [...seedQuotations, ...realQuotations].filter(q =>
            ownedBy(q.owner) && matchesExtraFilters(q.owner, q.division, q.date, filters)
        );
        const totalQuotationAmount = allQuotations.reduce((sum, q) => sum + q.amount, 0);

        // ---- Advance Received against PI ----
        const advanceEntries = Object.values(getAdvancePayments()).map(entry => ({
            owner: ownerMap[entry.leadNo]?.owner || "",
            division: entry.division || ownerMap[entry.leadNo]?.division || "",
            date: entry.date || "",
            received: entry.receivedAdvance === "Yes",
            amount: Number(entry.advanceAmount) || 0
        })).filter(e => ownedBy(e.owner) && matchesExtraFilters(e.owner, e.division, e.date, filters));
        const receivedAdvanceEntries = advanceEntries.filter(e => e.received);
        const totalAdvanceReceived = receivedAdvanceEntries.reduce((sum, e) => sum + e.amount, 0);

        // ---- Orders — calls actually logged as "Make Quotation" or "Order Receive" ----
        const orderHistory = getFollowUpHistory().filter(h =>
            ownedBy(h.assignedTo) &&
            matchesExtraFilters(h.assignedTo, h.division, h.timestamp, filters) &&
            (h.enquiryReceivedStatus === "Make Quotation" || h.enquiryReceivedStatus === "Order Receive") &&
            h.leadNo
        );
        const ordersReceived = orderHistory.length;

        return {
            totalLeads: leads.length.toString(),
            pendingFollowups: leads.filter(l => l.isPending).length.toString(),
            quotationsSent: allQuotations.length.toString(),
            quotationsTotalAmount: totalQuotationAmount,
            ordersReceived: ordersReceived.toString(),
            advanceReceivedCount: receivedAdvanceEntries.length.toString(),
            totalAdvanceReceived,
            totalEnquiry: "0",
            pendingEnquiry: "0"
        };
    },

    fetchPendingTasks: async (currentUser, isAdminFunc, filters = {}) => {
        await simulateDelay();

        // Use existing fetchFollowUps for data (already permission-filtered)
        const followUpsData = await mockApi.fetchFollowUps(currentUser, isAdminFunc);
        const pending = (followUpsData.pending || []).filter(task =>
            matchesExtraFilters(task.assignedTo, task.division, task.createdAt, filters)
        );

        // Format it for the PendingTasks widget — "Call Now" deep-links
        // straight into that lead's Followup Tracker form, same as every other
        // "Call Now" button in the app (Followup Tracker's own Pending table,
        // the Lead popup, etc.) instead of dropping the user on the
        // general /followup-tracker list.
        return pending.slice(0, 5).map(task => ({
            id: task.id,
            type: "Follow-up",
            company: task.companyName,
            reference: `Lead No: ${task.id}`,
            date: task.nextCallDate || "Today",
            actionText: "Call Now",
            link: `/dashboard/leads/followup-tracker/new?leadId=${task.id}&leadNo=${task.id}`
        }));
    },

    fetchRecentActivities: async (currentUser, isAdminFunc, filters = {}) => {
        await simulateDelay();

        const username = currentUser?.username;
        const isAdmin = isAdminFunc();
        const checkPerm = (userAssigned) => isAdmin || (userAssigned === username);
        const ownerMap = buildLeadOwnerMap();

        const activities = [];

        // 1. New Leads
        getSubmittedLeads().forEach(lead => {
            if (checkPerm(lead.receiverName) && matchesExtraFilters(lead.receiverName, lead.division, lead.timestamp, filters)) {
                activities.push({
                    user: lead.receiverName || "System",
                    action: "Created a new lead",
                    type: "Lead",
                    detail: lead.companyName || "Unknown",
                    time: lead.timestamp,
                    dateObj: new Date(lead.timestamp || 0)
                });
            }
        });

        // 2. Follow-up History (using basic date parse for dd/mm/yyyy if needed)
        getFollowUpHistory().forEach(history => {
            if (checkPerm(history.assignedTo) && matchesExtraFilters(history.assignedTo, history.division, history.timestamp, filters)) {
                let d = new Date();
                if (history.timestamp && history.timestamp.includes('/')) {
                    const parts = history.timestamp.split('/');
                    if (parts.length === 3) d = new Date(parts[2], parts[1]-1, parts[0]);
                }
                activities.push({
                    user: history.assignedTo || "System",
                    action: `Follow-up: ${history.status}`,
                    type: "Follow-up",
                    detail: history.companyName || "Unknown",
                    time: history.timestamp,
                    dateObj: d
                });
            }
        });

        // 3. Quotations — attributed via their lead when not set directly
        const savedQuots = getSavedQuotations();
        Object.values(savedQuots).forEach(q => {
            const owner = q.assignedUser || q.preparedBy || ownerMap[q.leadNo]?.owner || "";
            const division = q.division || ownerMap[q.leadNo]?.division || "";
            if (checkPerm(owner) && matchesExtraFilters(owner, division, q.quotationDate || q.savedAt, filters)) {
                activities.push({
                    user: owner || "System",
                    action: "Saved quotation",
                    type: "Quotation",
                    detail: q.companyName || q.quotationNo || "Unknown",
                    time: q.savedAt,
                    dateObj: new Date(q.savedAt || 0)
                });
            }
        });

        // Sort by date (desc) and take top 5
        activities.sort((a, b) => b.dateObj - a.dateObj);
        
        return activities.slice(0, 5).map(a => {
            let timeStr = "Recently";
            if (a.dateObj && !isNaN(a.dateObj.getTime())) {
                const diffMs = new Date() - a.dateObj;
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 60) timeStr = `${Math.max(1, diffMins)} min ago`;
                else if (diffMins < 1440) timeStr = `${Math.floor(diffMins/60)} hours ago`;
                else timeStr = `${Math.floor(diffMins/1440)} days ago`;
            }
            return {
                user: a.user,
                action: a.action,
                type: a.type,
                detail: a.detail,
                time: timeStr
            };
        });
    },

    fetchFollowUps: async (currentUser, isAdminFunc) => {
        await simulateDelay();

        // Logic adapted from FollowUp.jsx
        const username = currentUser?.username;

        // Process Pending Follow-ups from fmsData
        // Condition: has column K (index 27 in code, likely followUpDate) and column L (index 28, ??) is empty
        // In our dummy data, we used 'hasPendingFollowUp' flag for simplicity.
        // Let's refine fmsData in dummyData.js or just map it here.

        // We will just use the dummy data as is and add missing fields on the fly if needed
        // or assume dummy data is shaped correctly.

        // Leads whose follow-up already ended in "Order Receive" or "Not
        // Interested" are done — drop them from Pending. "Expected" leaves
        // a lead pending since it still needs a future follow-up.
        const resolvedLeadNumbers = getResolvedLeadNumbers();

        // For leads whose most recent call was logged as "Expected", the
        // History entries are appended in submission
        // order, so the last one per lead number is the most recent.
        const storedHistory = getFollowUpHistory();

        const latestExpectedByLead = {};
        const followUpCountByLead = {};
        const leadSequence = {};

        const historyWithCount = storedHistory.map((entry, index) => {
            const leadKey = entry.leadNo || `unknown-${index}`;
            leadSequence[leadKey] = (leadSequence[leadKey] || 0) + 1;
            const followUpIndex = leadSequence[leadKey];
            return {
                ...entry,
                id: entry.id || `hist-${index}`,
                followUpIndex,
                followUpNo: `Follow-up #${followUpIndex}`
            };
        });

        storedHistory.forEach(entry => {
            if (entry.leadNo) {
                followUpCountByLead[entry.leadNo] = (followUpCountByLead[entry.leadNo] || 0) + 1;
            }
            if (entry.enquiryReceivedStatus === "Expected") {
                latestExpectedByLead[entry.leadNo] = entry;
            }
        });

        const draftsByLead = getFollowUpDrafts();

        const pendingFollowUps = fmsData.filter(row => {
            // assignedUser check
            const assignedUser = row.assignedUser;
            const shouldInclude = isAdminFunc() || assignedUser === username;
            return shouldInclude && row.hasPendingFollowUp && !resolvedLeadNumbers.includes(row.leadNumber);
        }).map(row => {
            const draft = draftsByLead[row.leadNumber];
            return {
                timestamp: row.date,
                id: row.leadNumber,
                leadId: row.leadNumber,
                companyName: row.company,
                personName: row.personName,
                phoneNumber: row.phoneNumber,
                leadSource: row.source,
                leadType: row.leadType,
                salesType: row.salesType || "",
                interaction: draft?.interaction || row.interaction || "",
                attachment: draft?.attachment || row.attachment || "",
                receiverName: row.receiver,
                location: row.location,
                email: row.email,
                state: row.state,
                city: row.city,
                address: row.address,
                gst: row.gst,
                nob: row.nob,
                division: row.division,
                creditAccess: row.creditAccess,
                creditDays: row.creditDays,
                creditLimit: row.creditLimit,
                contactPersons: row.contactPersons || [],
                notes: row.notes,
                customerSay: draft?.customerFeedback || latestExpectedByLead[row.leadNumber]?.customerSay || "",
                enquiryStatus: draft?.enquiryStatus ? (draft.enquiryStatus === "yes" ? "Make Quotation" : draft.enquiryStatus === "expected" ? "Expected" : "Not Interested") : (latestExpectedByLead[row.leadNumber] ? (latestExpectedByLead[row.leadNumber].enquiryReceivedStatus || "Expected") : "New"),
                createdAt: row.date,
                nextAction: draft?.nextAction || latestExpectedByLead[row.leadNumber]?.nextAction || "",
                nextCallDate: draft?.nextCallDate || latestExpectedByLead[row.leadNumber]?.nextCallDate || "",
                nextCallTime: draft?.nextCallTime || latestExpectedByLead[row.leadNumber]?.nextCallTime || "",
                nextCallDateTime: draft?.nextCallDateTime || latestExpectedByLead[row.leadNumber]?.nextCallDateTime || (draft?.nextCallDate ? `${draft.nextCallDate}T${draft.nextCallTime || "00:00"}` : (latestExpectedByLead[row.leadNumber]?.nextCallDate ? `${latestExpectedByLead[row.leadNumber].nextCallDate}T${latestExpectedByLead[row.leadNumber].nextCallTime || "00:00"}` : "")),
                priority: "High",
                assignedTo: row.assignedUser,
                itemQty: draft?.items ? JSON.stringify(draft.items) : "",
                hasDraft: !!draft,
                draftData: draft || null,
                followUpCount: followUpCountByLead[row.leadNumber] || 0
            };
        });

        // Leads submitted via the New Lead form also show up here as
        // pending, until they're followed up on.
        const submittedLeadFollowUps = getSubmittedLeads().filter(lead => {
            const shouldInclude = isAdminFunc() || lead.receiverName === username;
            return shouldInclude && !resolvedLeadNumbers.includes(lead.leadNumber);
        }).map(lead => {
            const draft = draftsByLead[lead.leadNumber];
            return {
                timestamp: lead.timestamp,
                id: lead.leadNumber,
                leadId: lead.leadNumber,
                companyName: lead.companyName,
                personName: lead.contactPersons?.[0]?.name || lead.salespersonName || "",
                phoneNumber: lead.contactPersons?.[0]?.number || lead.phoneNumber || "",
                leadSource: lead.source,
                leadType: lead.leadType,
                salesType: lead.salesType || "",
                interaction: draft?.interaction || lead.interaction || "",
                attachment: draft?.attachment || lead.attachment || "",
                receiverName: lead.receiverName,
                location: lead.location,
                email: lead.email,
                state: lead.state,
                city: lead.city,
                address: lead.address,
                gst: lead.gst,
                nob: lead.nob,
                division: lead.division,
                creditAccess: lead.creditAccess,
                creditDays: lead.creditDays,
                creditLimit: lead.creditLimit,
                contactPersons: lead.contactPersons || [],
                notes: lead.notes,
                customerSay: draft?.customerFeedback || latestExpectedByLead[lead.leadNumber]?.customerSay || "",
                enquiryStatus: draft?.enquiryStatus ? (draft.enquiryStatus === "yes" ? "Make Quotation" : draft.enquiryStatus === "expected" ? "Expected" : "Not Interested") : (latestExpectedByLead[lead.leadNumber] ? (latestExpectedByLead[lead.leadNumber].enquiryReceivedStatus || "Expected") : "New"),
                createdAt: lead.date,
                nextAction: draft?.nextAction || latestExpectedByLead[lead.leadNumber]?.nextAction || "",
                nextCallDate: draft?.nextCallDate || latestExpectedByLead[lead.leadNumber]?.nextCallDate || "",
                nextCallTime: draft?.nextCallTime || latestExpectedByLead[lead.leadNumber]?.nextCallTime || "",
                nextCallDateTime: draft?.nextCallDateTime || latestExpectedByLead[lead.leadNumber]?.nextCallDateTime || (draft?.nextCallDate ? `${draft.nextCallDate}T${draft.nextCallTime || "00:00"}` : (latestExpectedByLead[lead.leadNumber]?.nextCallDate ? `${latestExpectedByLead[lead.leadNumber].nextCallDate}T${latestExpectedByLead[lead.leadNumber].nextCallTime || "00:00"}` : "")),
                priority: determinePriority(lead.source),
                assignedTo: lead.receiverName,
                itemQty: draft?.items ? JSON.stringify(draft.items) : "",
                hasDraft: !!draft,
                draftData: draft || null,
                followUpCount: followUpCountByLead[lead.leadNumber] || 0
            };
        });

        // History from storedHistory with computed followUpIndex
        const hardcodedHistory = [];

        const historyFollowUps = [...hardcodedHistory, ...historyWithCount].filter(row => {
            const assignedUser = row.assignedTo;
            return isAdminFunc() || !assignedUser || assignedUser === username;
        });

        return {
            pending: [...pendingFollowUps, ...submittedLeadFollowUps],
            history: historyFollowUps.slice().reverse()
        };
    },

    getFollowUpDraft: async (leadNo) => {
        await simulateDelay();
        return getFollowUpDraft(leadNo);
    },

    saveFollowUpDraft: async (leadNo, draftData) => {
        await simulateDelay();
        saveFollowUpDraft(leadNo, draftData);
        return { success: true };
    },

    clearFollowUpDraft: async (leadNo) => {
        await simulateDelay();
        clearFollowUpDraft(leadNo);
        return { success: true };
    },

    submitFollowUp: async (data) => {
        await simulateDelay();

        const leadNo = data.leadNo;
        // Clear any saved draft for this lead once submitted
        clearFollowUpDraft(leadNo);
        const dateObj = new Date();
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

        // Determine enquiryReceivedStatus strictly from data.enquiryStatus
        let enquiryReceivedStatus = "Expected";
        const st = (data.enquiryStatus || "").trim().toLowerCase();
        if (st === "yes" || st === "make quotation") {
            enquiryReceivedStatus = "Make Quotation";
        } else if (st === "not-interested" || st === "not interested") {
            enquiryReceivedStatus = "Not Interested";
        } else {
            enquiryReceivedStatus = "Expected";
        }

        if (enquiryReceivedStatus === "Not Interested") {
            // Closed out with no order — drop it from the Pending list.
            markLeadResolved(leadNo);
        } else if (enquiryReceivedStatus === "Make Quotation") {
            // "Make Quotation" — drop it from Pending and hand its details
            // over to the Pending Quotation page's queue.
            markLeadResolved(leadNo);

            const fmsMatch = fmsData.find(row => row.leadNumber === leadNo);
            const submittedMatch = getSubmittedLeads().find(lead => lead.leadNumber === leadNo);
            const companyNameTarget = (data.companyName || submittedMatch?.companyName || submittedMatch?.customerName || "").trim().toLowerCase();
            const contactMatch = getCompanies().find(c => 
                c.vnNo === leadNo || 
                c.name === leadNo || 
                (companyNameTarget && (c.name || "").trim().toLowerCase() === companyNameTarget)
            );
            const source = fmsMatch || submittedMatch || contactMatch;

            saveQuotationReadyLead(leadNo, {
                sheet: "FMS",
                leadNo: leadNo,
                companyName: data.companyName || (source ? (source.company || source.companyName || source.name || "") : "") || contactMatch?.name || "",
                nob: data.nob || source?.nob || contactMatch?.nob || "",
                address: data.billingAddress || data.shippingAddress || (source ? (source.address || source.shippingAddress || "") : "") || contactMatch?.address || "",
                billingAddress: data.billingAddress || (source ? (source.billingAddress || source.address || "") : "") || contactMatch?.address || "",
                shippingAddress: data.shippingAddress || (source ? (source.shippingAddress || source.address || "") : "") || contactMatch?.address || "",
                state: data.enquiryState || data.state || (source ? (source.state || source.consignorState || "") : "") || contactMatch?.state || "",
                city: data.city || (source ? (source.city || source.location || "") : "") || contactMatch?.city || "",
                division: data.division || (source ? (source.division || "") : "") || contactMatch?.division || "",
                freightType: data.freightType || (source ? (source.freightType || "") : "") || "",
                contactName: data.contactPerson || data.contactName || (source ? (source.contactPersons?.[0]?.name || source.personName || source.salespersonName || "") : "") || contactMatch?.contactPersons?.[0]?.name || contactMatch?.salesPerson || "",
                contactNo: data.contactNumber || data.contactNo || data.phoneNumber || (source ? (source.contactPersons?.[0]?.number || source.phoneNumber || "") : "") || contactMatch?.contactPersons?.[0]?.number || contactMatch?.phone || "",
                gstin: data.gst || data.gstin || (source ? (source.gst || source.gstin || source.consignorGSTIN || "") : "") || contactMatch?.gst || "",
                gst: data.gst || data.gstin || (source ? (source.gst || source.gstin || source.consignorGSTIN || "") : "") || contactMatch?.gst || "",
                creditAccess: data.creditAccess || (source ? (source.creditAccess || "") : "") || "",
                creditDays: data.creditDays || (source ? (source.creditDays || "") : "") || "",
                creditLimit: data.creditLimit || (source ? (source.creditLimit || "") : "") || "",
                paymentTerms: data.paymentTerms || (source ? (source.paymentTerms || "") : "") || "",
                customPaymentTerms: data.customPaymentTerms || (source ? (source.customPaymentTerms || "") : "") || "",
                advanceAmount: data.advanceAmount || (source ? (source.advanceAmount || "") : "") || "",
                items: Array.isArray(data.items) && data.items.length > 0 ? data.items : (source?.items || []),
                date: formattedDate,
                rowData: []
            });
        } else {
            // "Expected" leaves the lead pending!
            unmarkLeadResolved(leadNo);
        }

        // ADD: Save to History
        const fmsMatch = fmsData.find(row => row.leadNumber === leadNo);
        const submittedMatch = getSubmittedLeads().find(lead => lead.leadNumber === leadNo);
        const contactMatch = getCompanies().find(c => c.vnNo === leadNo || c.name === leadNo);
        const source = fmsMatch || submittedMatch || contactMatch;

        const historyEntry = {
            id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: formattedDate,
            leadNo: leadNo,
            companyName: source ? (source.company || source.companyName || source.name || "") : "",
            // Carried through so the History table's Person Name / NOB
            // filters have something real to match against, same as the
            // Pending list.
            personName: source ? (source.contactPersons?.[0]?.name || source.personName || source.salespersonName || "") : "",
            nob: source ? (source.nob || "") : "",
            division: data.division || (source ? (source.division || "") : ""),
            enquiryCity: data.city || (source ? (source.city || "") : ""),
            customerSay: data.customerFeedback || "",
            notInterestedReason: data.notInterestedReason || "",
            status: enquiryReceivedStatus === "Expected" ? "Pending" : "Completed",
            enquiryReceivedStatus: enquiryReceivedStatus,
            enquiryReceivedDate: (data.rowData && data.rowData.length > 5) ? data.rowData[5] : "",
            enquiryState: data.enquiryState || (source ? source.state : "") || "",
            projectName: data.nob || (source ? source.nob : "") || "",
            salesType: data.freightType || (source ? source.salesType : "") || "",
            requiredProductDate: "", 
            projectApproxValue: "", 
            itemName1: data.items && data.items[0] ? data.items[0].name : "",
            quantity1: data.items && data.items[0] ? data.items[0].quantity : "",
            itemName2: data.items && data.items[1] ? data.items[1].name : "",
            quantity2: data.items && data.items[1] ? data.items[1].quantity : "",
            itemName3: data.items && data.items[2] ? data.items[2].name : "",
            quantity3: data.items && data.items[2] ? data.items[2].quantity : "",
            itemName4: data.items && data.items[3] ? data.items[3].name : "",
            quantity4: data.items && data.items[3] ? data.items[3].quantity : "",
            itemName5: data.items && data.items[4] ? data.items[4].name : "",
            quantity5: data.items && data.items[4] ? data.items[4].quantity : "",
            nextAction: data.nextAction || "",
            nextCallDate: data.nextCallDate || "",
            nextCallTime: data.nextCallTime || "",
            nextCallDateTime: data.nextCallDateTime || (data.nextCallDate ? (data.nextCallTime ? `${data.nextCallDate}T${data.nextCallTime}` : data.nextCallDate) : ""),
            historyDateFilter: `Date(${dateObj.getFullYear()},${dateObj.getMonth()},${dateObj.getDate()})`,
            assignedTo: data.assignedTo || (source ? (source.assignedUser || source.receiverName || source.receiver) : "") || "",
            receiverName: (source ? (source.receiverName || source.receiver || source.assignedUser) : "") || data.assignedTo || "",
            interaction: data.interaction || "Call",
            attachment: data.attachment || "",
            notes: data.notes || "",
            itemQty: data.items ? JSON.stringify(data.items) : ""
        };

        addFollowUpHistory(historyEntry);

        // Mimic success
        console.log("Mock submit follow up:", data);
        return { success: true };
    },

    uploadFile: async (file) => {
        await simulateDelay();
        return "https://dummy-file-url.com/file";
    },

    // filters: { salesPerson, division, dateFrom, dateTo } — all optional.
    fetchDashboardAppCharts: async (currentUser, isAdminFunc, filters = {}) => {
        await simulateDelay();

        const username = currentUser?.username;
        const isAdmin = isAdminFunc();
        const ownedBy = (owner) => isAdmin || owner === username;
        const ownerMap = buildLeadOwnerMap();

        // ---- Combined leads (seed + real), permission + filters applied ----
        const seedLeads = fmsData.map(row => ({
            owner: row.receiver || row.assignedUser || "", division: row.division || "",
            date: row.date || "", source: row.source || ""
        }));
        const realLeads = getSubmittedLeads().map(lead => ({
            owner: lead.receiverName || "", division: lead.division || "",
            date: lead.date || "", source: lead.source || ""
        }));
        const leads = [...seedLeads, ...realLeads].filter(l =>
            ownedBy(l.owner) && matchesExtraFilters(l.owner, l.division, l.date, filters)
        );

        // ---- Combined quotations (seed + real) — deduped to the latest
        // revision per lead, same reasoning as fetchDashboardMetrics above.
        const seedQuotations = quotations.map(q => ({
            owner: q.assignedUser || "", division: ownerMap[q.leadNo]?.division || "", date: q.date || "",
            leadNo: q.leadNo || "", quotationNo: q.quotationNo || ""
        }));
        const realQuotationsRaw = Object.values(getSavedQuotations()).map(q => ({
            owner: ownerMap[q.leadNo]?.owner || "",
            division: q.division || ownerMap[q.leadNo]?.division || "",
            date: q.quotationDate || q.savedAt || "",
            leadNo: q.leadNo || "", quotationNo: q.quotationNo || q.poNumber || ""
        }));
        const realQuotations = dedupeQuotationsByLead(realQuotationsRaw);
        const allQuotations = [...seedQuotations, ...realQuotations].filter(q =>
            ownedBy(q.owner) && matchesExtraFilters(q.owner, q.division, q.date, filters)
        );

        // ---- Advance Received against PI ----
        const advanceReceived = Object.values(getAdvancePayments()).filter(entry => {
            const owner = ownerMap[entry.leadNo]?.owner || "";
            const division = entry.division || ownerMap[entry.leadNo]?.division || "";
            return entry.receivedAdvance === "Yes" && ownedBy(owner) && matchesExtraFilters(owner, division, entry.date, filters);
        });

        // ---- Orders — calls actually logged as "Order Receive" ----
        const orderHistory = getFollowUpHistory().filter(h =>
            h.enquiryReceivedStatus === "Order Receive" &&
            ownedBy(h.assignedTo) && matchesExtraFilters(h.assignedTo, h.division, h.timestamp, filters)
        );

        // 1. Lead/Quotation/Order data (Monthly)
        const monthlyData = {};
        const bumpMonth = (dateStr, key) => {
            const date = parseFlexibleDate(dateStr);
            if (!date) return;
            const month = date.toLocaleString('en-US', { month: 'short' });
            if (!monthlyData[month]) monthlyData[month] = { leads: 0, quotations: 0, orders: 0 };
            monthlyData[month][key]++;
        };
        leads.forEach(l => bumpMonth(l.date, 'leads'));
        allQuotations.forEach(q => bumpMonth(q.date, 'quotations'));
        orderHistory.forEach(h => bumpMonth(h.timestamp, 'orders'));

        const leadData = Object.keys(monthlyData).map(month => ({
            month,
            leads: monthlyData[month].leads,
            quotations: monthlyData[month].quotations,
            orders: monthlyData[month].orders
        }));

        // 2. Conversion funnel: Leads -> Quotations Sent -> Advance Received -> Orders
        const conversionData = [
            { name: "Leads", value: leads.length, color: "#4f46e5" },
            { name: "Quotations", value: allQuotations.length, color: "#8b5cf6" },
            { name: "Advance Received", value: advanceReceived.length, color: "#d946ef" },
            { name: "Orders", value: orderHistory.length, color: "#ec4899" }
        ];

        // 3. Source Data
        const sourceCounter = {};
        leads.forEach(l => {
            if (l.source) sourceCounter[l.source] = (sourceCounter[l.source] || 0) + 1;
        });

        const sourceData = Object.keys(sourceCounter).map((name, index) => ({
            name,
            value: sourceCounter[name],
            color: ["#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6"][index % 5]
        }));

        return { leadData, conversionData, sourceData };
    },

    // Quotation specific
    getNextQuotationNumber: async (prefix = "NBD") => {
        await simulateDelay();
        return `${prefix}-2526-003`; // Mock next number
    },

    getCompanyPrefix: async (companyName) => {
        await simulateDelay();
        return "NBD";
    },

    // The Quotation page's Lead No. dropdown is scoped to exactly one
    // source: leads whose Followup Tracker outcome was "Order
    // Receive" (see submitFollowUp -> saveQuotationReadyLead above). This
    // is the "Followup Tracker History" data the picker is meant to show.
    // Once a lead already has a saved quotation/PO, it's dropped from the
    // list so the same lead can't be used to create a second PO.
    fetchCallTrackerLeads: async () => {
        await simulateDelay();
        const readyLeads = getQuotationReadyLeads();
        const submittedLeads = getSubmittedLeads();
        const companiesList = getCompanies();
        const followUps = getFollowUpHistory();
        const usedLeadNumbers = new Set(
            Object.values(getSavedQuotations())
                .map(q => q.leadNo)
                .filter(Boolean)
        );
        return Object.entries(readyLeads)
            .filter(([leadNo]) => !usedLeadNumbers.has(leadNo))
            .map(([leadNo, data]) => {
                const subMatch = submittedLeads.find(l => l.leadNumber === leadNo);
                const fupMatch = [...followUps].reverse().find(f => f.leadNo === leadNo);
                const compName = data.companyName || subMatch?.companyName || subMatch?.customerName || fupMatch?.companyName || "";
                const compMatch = companiesList.find(c => 
                    (compName && c.name && c.name.trim().toLowerCase() === compName.trim().toLowerCase()) ||
                    c.vnNo === leadNo ||
                    c.name === leadNo
                );
                const fmsMatch = fmsData.find(r => r.leadNumber === leadNo);

                return {
                    leadNo,
                    ...data,
                    companyName: data.companyName || compName || compMatch?.name || "",
                    nob: data.nob || subMatch?.nob || fupMatch?.nob || compMatch?.nob || fmsMatch?.nob || "",
                    division: data.division || subMatch?.division || fupMatch?.division || compMatch?.division || fmsMatch?.division || "",
                    state: data.state || subMatch?.state || fupMatch?.enquiryState || compMatch?.state || fmsMatch?.consignorState || "",
                    city: data.city || subMatch?.city || fupMatch?.enquiryCity || compMatch?.city || fmsMatch?.location || "",
                    gstin: data.gstin || data.gst || subMatch?.gstin || subMatch?.gst || compMatch?.gst || fmsMatch?.consignorGSTIN || "",
                    gst: data.gst || data.gstin || subMatch?.gst || subMatch?.gstin || compMatch?.gst || fmsMatch?.consignorGSTIN || "",
                    billingAddress: data.billingAddress || data.address || subMatch?.billingAddress || subMatch?.address || compMatch?.address || fmsMatch?.consignorAddress || "",
                    shippingAddress: data.shippingAddress || data.address || subMatch?.shippingAddress || subMatch?.address || compMatch?.address || fmsMatch?.consignorAddress || "",
                    contactName: data.contactName || data.contactPerson || subMatch?.contactPerson || subMatch?.contactName || fupMatch?.personName || compMatch?.contactPersons?.[0]?.name || compMatch?.salesPerson || fmsMatch?.salesPerson || "",
                    contactNo: data.contactNo || data.contactNumber || data.phone || subMatch?.contactNumber || subMatch?.phoneNumber || compMatch?.contactPersons?.[0]?.number || compMatch?.phone || fmsMatch?.phoneNumber || "",
                    salesPerson: data.salesPerson || data.receiverName || subMatch?.salesPerson || fupMatch?.receiverName || fupMatch?.salesPerson || compMatch?.salesPerson || fmsMatch?.salesPerson || "",
                    receiverName: data.receiverName || data.salesPerson || subMatch?.receiverName || fupMatch?.receiverName || compMatch?.salesPerson || fmsMatch?.salesPerson || "",
                    freightType: data.freightType || subMatch?.freightType || fupMatch?.freightType || "",
                    paymentTerms: data.paymentTerms || subMatch?.paymentTerms || fupMatch?.paymentTerms || "",
                    customPaymentTerms: data.customPaymentTerms || subMatch?.customPaymentTerms || fupMatch?.customPaymentTerms || "",
                    advanceAmount: data.advanceAmount || subMatch?.advanceAmount || fupMatch?.advanceAmount || "",
                    items: Array.isArray(data.items) && data.items.length > 0 ? data.items : (subMatch?.items || fmsMatch?.items || [])
                };
            });
    },

    // PO Number auto-generation: NTC/PO/<financial-year>/<sequence>,
    // sequential within the current financial year based on the highest
    // PO number already saved.
    getNextPoNumber: async () => {
        await simulateDelay();

        const now = new Date();
        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fy = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
        const prefix = `NTC/PO/${fy}/`;

        const saved = Object.values(getSavedQuotations());
        const maxSeq = saved.reduce((max, q) => {
            if (q.poNumber && q.poNumber.startsWith(prefix)) {
                const seq = parseInt(q.poNumber.slice(prefix.length), 10);
                if (!isNaN(seq) && seq > max) return seq;
            }
            return max;
        }, 0);

        return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    },

    // Real saved quotations (keyed by quotation number) take priority; the
    // static dummy list is only a fallback for the couple of seed rows that
    // predate real persistence.
    fetchExistingQuotations: async (isAdminFunc) => {
        await simulateDelay();
        const savedNumbers = Object.keys(getSavedQuotations());
        const seedNumbers = quotations.map(q => q.quotationNo).filter(no => !savedNumbers.includes(no));
        return [...seedNumbers, ...savedNumbers];
    },

    // Lists every saved quotation (one entry per revision — a Revise saves
    // under a new number rather than overwriting), newest first, for the
    // Quotation page's History tab.
    fetchQuotationHistory: async () => {
        await simulateDelay();
        const saved = Object.values(getSavedQuotations());
        return saved.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    },

    getQuotationData: async (quotationNo) => {
        await simulateDelay();
        const saved = getSavedQuotations()[quotationNo];
        if (saved) {
            return { success: true, quotationData: saved };
        }
        const quote = quotations.find(q => q.quotationNo === quotationNo);
        if (quote) {
            return { success: true, quotationData: quote };
        }
        return { success: false, error: "Quotation not found" };
    },

    saveQuotation: async (data, action = "save") => {
        await simulateDelay();
        console.log(`Mock ${action} quotation:`, data);

        // Without a quotation number there's nowhere to save this under —
        // fail loudly instead of silently no-op'ing while still reporting
        // success (which previously let a save look like it worked, show a
        // "saved successfully" toast, and reset the form, while nothing
        // actually landed in History).
        if (action === "save" && !data.quotationNo) {
            return { success: false, error: "Missing quotation/PO number — please wait for it to finish generating and try again." };
        }

        // A real "Save Quotation" (not the "Send"/link-share action) persists
        // the full quotation — so it shows up in the History tab and can be
        // reloaded for Revise/Preview — and registers or refreshes this
        // quotation's Received Advance against PI tracking entry. Its
        // resolution status/remarks are preserved across re-saves (e.g.
        // revisions) rather than being wiped back to "pending".
        if (action === "save" && data.quotationNo) {
            // Strip out pdfDataUri to avoid blowing up the 5MB localStorage limit
            const { pdfDataUri, ...dataToSave } = data;
            saveSavedQuotation(data.quotationNo, {
                ...dataToSave,
                savedAt: new Date().toISOString()
            });

            const existing = getAdvancePayments()[data.quotationNo] || {};
            saveAdvancePayment(data.quotationNo, {
                quotationNo: data.quotationNo,
                poNumber: data.poNumber || data.quotationNo,
                leadNo: data.leadNo || "",
                companyName: data.consigneeName || data.companyName || "",
                division: data.consigneeDivision || data.division || "",
                nob: data.nob || "",
                salesPerson: data.salesPerson || data.salesPersonName || data.receiverName || data.preparedBy || "",
                receiverName: data.receiverName || data.salesPerson || data.salesPersonName || data.preparedBy || "",
                city: data.consigneeCity || data.city || "",
                contactName: data.consigneeContactName || data.contactName || "",
                contactNo: data.consigneeContactNo || data.contactNo || "",
                date: data.date || data.quotationDate || "",
                freightType: data.freightType || "",
                advancePayment: data.advancePayment || "No",
                advanceAmount: data.advanceAmount || "",
                grandTotal: data.grandTotal || 0,
                receivedAdvance: existing.receivedAdvance || "",
                status: existing.status || "",
                remarks: existing.remarks || ""
            });
        }

        return { success: true, quotationNumber: data.quotationNo || "NTC-NEW-001" };
    },

    fetchProducts: async () => {
        await simulateDelay();
        return products;
    },

    fetchQuotationDropdowns: async () => {
        await simulateDelay();
        // Construct the complex object expected by Quotation.jsx
        // This maps dummyData structures to the expected format
        const response = {
            states: {},
            companies: {},
            references: {},
            preparedBy: getUsers().map(u => u.username)
        };

        // Populate companies
        companies.forEach(comp => {
            response.companies[comp.name] = {
                address: comp.location, // simplified mapping
                state: comp.consignorState,
                contactName: comp.salesPerson,
                contactNo: comp.phoneNumber,
                gstin: "27AA...",
                stateCode: "27"
            };
        });

        // Overlay Company Master data — City and Division live there, so
        // companies managed on the Master page enrich (or add to) the
        // dropdown with those fields.
        getCompanies().forEach(comp => {
            response.companies[comp.name] = {
                ...(response.companies[comp.name] || {}),
                address: comp.address || response.companies[comp.name]?.address || "",
                state: comp.state || response.companies[comp.name]?.state || "",
                contactName: comp.contactPersons?.[0]?.name || response.companies[comp.name]?.contactName || "",
                contactNo: comp.phone || response.companies[comp.name]?.contactNo || "",
                gstin: comp.gst || response.companies[comp.name]?.gstin || "",
                stateCode: response.companies[comp.name]?.stateCode || "27",
                city: comp.city || "",
                division: comp.division || ""
            };
        });

        // Add Quotation Ready Leads to companies dropdown
        const readyLeads = getQuotationReadyLeads();
        Object.values(readyLeads).forEach(lead => {
            if (lead.companyName) {
                response.companies[lead.companyName] = {
                    address: lead.address || "",
                    state: lead.state || "",
                    contactName: lead.contactName || "",
                    contactNo: lead.contactNo || "",
                    gstin: lead.gstin || "",
                    stateCode: "27", // Default/simplified mapping
                    city: lead.city || "",
                    division: lead.division || ""
                };
            }
        });

        // Populate states (using generic data for now as dummyData.dropdowns.states is just a list)
        dropdowns.states.forEach(state => {
            response.states[state] = {
                bankDetails: "Account No: 1234567890\nBank Name: HDFC\nIFSC: HDFC0001234",
                consignerAddress: `Address in ${state}`,
                stateCode: "10",
                gstin: "10AAA...",
                pan: "ABC...",
                msmeNumber: "MSME..."
            };
        });
        // Populate references
        dropdowns.receivers.forEach(ref => {
            response.references[ref] = {
                mobile: "9999999999"
            };
        });

        return response;
    },

    fetchLeadNumbers: async () => {
        await simulateDelay();

        const leadNumbers = {};

        // Mock FMS leads
        fmsData.forEach(row => {
            // Simulate filtering: has pending follow up (mocking the BA/BB check)
            if (row.hasPendingFollowUp) {
                leadNumbers[row.leadNumber] = {
                    sheet: "FMS",
                    companyName: row.company,
                    address: "Mock Address FMS",
                    state: "Maharashtra",
                    contactName: row.receiver,
                    contactNo: "9876543210",
                    gstin: "27ABC...",
                    rowData: [] // simplified
                };
            }
        });

        // Mock Enquiry Leads
        enquiryToOrder.forEach(row => {
            if (row.status === "Pending") {
                leadNumbers[row.enquiryNo] = {
                    sheet: "ENQUIRY",
                    companyName: "Mock Company Enquiry",
                    address: "Mock Address Enquiry",
                    state: "Delhi",
                    contactName: row.assignedUser,
                    contactNo: "8765432109",
                    gstin: "07XYZ...",
                    rowData: [] // simplified
                };
            }
        });

        // Leads marked "Order Receive" on the Followup Tracker form —
        // real company/contact details captured during the lead's lifecycle,
        // overriding the placeholder FMS/Enquiry entries above where they overlap.
        Object.assign(leadNumbers, getQuotationReadyLeads());

        return leadNumbers;
    },

    // Received Advance against PI — one tracking entry per saved quotation
    // (created by saveQuotation above). "Hold" / "Negotiation" / "Awaiting Payment"
    // keeps an entry in Pending; every update is recorded into History.
    fetchAdvancePayments: async () => {
        await simulateDelay();

        const ownerMap = buildLeadOwnerMap();
        const savedQuotations = getSavedQuotations();
        const entries = Object.values(getAdvancePayments())
            .filter(entry => !!savedQuotations[entry.quotationNo])
            .map(entry => {
                const qData = savedQuotations[entry.quotationNo] || {};
                const ownerInfo = ownerMap[entry.leadNo || qData.leadNo] || {};
                return {
                    ...entry,
                    pdfUrl: qData.pdfUrl || "",
                    quotationData: qData,
                    grandTotal: entry.grandTotal || qData.grandTotal || 0,
                    nob: entry.nob || qData.nob || "",
                    division: entry.division || qData.division || qData.consigneeDivision || ownerInfo.division || "",
                    salesPerson: entry.salesPerson || entry.receiverName || qData.salesPerson || qData.receiverName || qData.preparedBy || ownerInfo.owner || "",
                    receiverName: entry.receiverName || entry.salesPerson || qData.receiverName || qData.salesPerson || qData.preparedBy || ownerInfo.owner || "",
                };
            });

        const pendingRaw = entries.filter(e => !e.status || e.status === "Hold" || e.status === "Negotiation" || e.status === "Awaiting Payment" || e.status === "Pending Review");

        // 1. Get all logged action history
        const loggedHistory = getQuotationTrackerHistory().map(h => {
            const qData = h.quotationData || savedQuotations[h.quotationNo] || {};
            const ownerInfo = ownerMap[h.leadNo || qData.leadNo] || {};
            return {
                ...h,
                pdfUrl: savedQuotations[h.quotationNo]?.pdfUrl || "",
                quotationData: qData || null,
                grandTotal: h.grandTotal || qData.grandTotal || 0,
                nob: h.nob || qData.nob || "",
                division: h.division || qData.division || qData.consigneeDivision || ownerInfo.division || "",
                salesPerson: h.salesPerson || h.receiverName || qData.salesPerson || qData.receiverName || qData.preparedBy || ownerInfo.owner || "",
                receiverName: h.receiverName || h.salesPerson || qData.receiverName || qData.salesPerson || qData.preparedBy || ownerInfo.owner || "",
            };
        });

        // 2. Include any legacy resolved terminal entries from ADVANCE_PAYMENTS not in loggedHistory
        const loggedKeys = new Set(loggedHistory.map(h => `${h.quotationNo}-${h.updatedAt || ''}`));
        const legacyHistory = entries
            .filter(e => (e.status === "Order Received" || e.status === "Order Not Received" || e.status === "Sent to Order" || e.status === "Not Sent to Order") && !loggedKeys.has(`${e.quotationNo}-${e.updatedAt || ''}`));

        const combinedHistory = [...loggedHistory, ...legacyHistory].sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.savedAt || a.date || 0).getTime();
            const dateB = new Date(b.updatedAt || b.savedAt || b.date || 0).getTime();
            return dateB - dateA;
        });

        // A revised quotation ("...-001-R1") gets its own tracking entry
        // alongside the one it revised — only the latest revision for a
        // given lead should stay actionable in Pending, so earlier
        // revisions of the same quotation don't show up twice.
        const getBaseNo = (no) => (no || "").replace(/-R\d+$/i, "");
        const getRevisionNo = (no) => {
            const match = (no || "").match(/-R(\d+)$/i);
            return match ? parseInt(match[1], 10) : 0;
        };

        const latestByLead = {};
        pendingRaw.forEach(entry => {
            const groupKey = entry.leadNo || getBaseNo(entry.quotationNo);
            const existing = latestByLead[groupKey];
            if (!existing || getRevisionNo(entry.quotationNo) > getRevisionNo(existing.quotationNo)) {
                latestByLead[groupKey] = entry;
            }
        });
        const pending = Object.values(latestByLead);

        // Newest first
        return {
            pending: pending.slice().reverse(),
            history: combinedHistory
        };
    },

    submitAdvancePaymentUpdate: async (quotationNo, updateData) => {
        await simulateDelay();

        if (!quotationNo) {
            return { success: false, error: "Missing quotation number" };
        }

        const ownerMap = buildLeadOwnerMap();
        const existing = getAdvancePayments()[quotationNo] || {};
        const savedQuotations = getSavedQuotations();
        const quotationData = savedQuotations[quotationNo] || {};
        const ownerInfo = ownerMap[updateData.leadNo || existing.leadNo || quotationData.leadNo] || {};
        const actionTimestamp = new Date().toISOString();

        // 1. Save / update the active record in ADVANCE_PAYMENTS
        saveAdvancePayment(quotationNo, {
            ...existing,
            ...updateData,
            nob: existing.nob || quotationData.nob || updateData.nob || "",
            salesPerson: existing.salesPerson || existing.receiverName || quotationData.salesPerson || quotationData.receiverName || quotationData.preparedBy || ownerInfo.owner || "",
            receiverName: existing.receiverName || existing.salesPerson || quotationData.receiverName || quotationData.salesPerson || quotationData.preparedBy || ownerInfo.owner || "",
            updatedAt: actionTimestamp
        });

        // 2. Add an entry into QUOTATION_TRACKER_HISTORY so all actions (Negotiation, Awaiting Payment, Order Received, etc.) are recorded
        const historyRecord = {
            id: `qth-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            quotationNo,
            leadNo: updateData.leadNo || existing.leadNo || quotationData.leadNo || "",
            companyName: existing.companyName || quotationData.consigneeName || quotationData.companyName || "",
            division: existing.division || quotationData.consigneeDivision || quotationData.division || ownerInfo.division || "",
            nob: existing.nob || quotationData.nob || updateData.nob || "",
            salesPerson: existing.salesPerson || existing.receiverName || quotationData.salesPerson || quotationData.receiverName || quotationData.preparedBy || ownerInfo.owner || "",
            receiverName: existing.receiverName || existing.salesPerson || quotationData.receiverName || quotationData.salesPerson || quotationData.preparedBy || ownerInfo.owner || "",
            grandTotal: existing.grandTotal || quotationData.grandTotal || 0,
            advancePayment: existing.advancePayment || quotationData.advancePayment || "No",
            advanceAmount: updateData.advanceAmount || existing.advanceAmount || quotationData.advanceAmount || "",
            status: updateData.status,
            interactionType: updateData.interactionType || "",
            customerSaid: updateData.customerSaid || "",
            customerFeedback: updateData.customerSaid || "",
            attachmentName: updateData.attachmentName || "",
            nextFollowup: updateData.nextFollowup || updateData.nextFollowupDate || "",
            nextFollowupDate: updateData.nextFollowupDate || updateData.nextFollowup || "",
            remarks: updateData.remarks || "",
            reason: updateData.reason || "",
            poNumber: updateData.poNumber || "",
            poDate: updateData.poDate || "",
            expectedDeliveryDate: updateData.expectedDeliveryDate || "",
            gstNumber: updateData.gstNumber || "",
            poCopyName: updateData.poCopyName || "",
            date: existing.date || quotationData.date || quotationData.quotationDate || "",
            freightType: existing.freightType || quotationData.freightType || "",
            updatedAt: actionTimestamp,
            createdAt: actionTimestamp,
            quotationData: quotationData
        };

        addQuotationTrackerHistory(historyRecord);

        return { success: true };
    }
};
