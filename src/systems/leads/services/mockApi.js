import * as leadApi from "./leadApi";

/**
 * mockApi bridge adapter
 * All calls are now redirected directly to live Supabase backend via leadApi
 */
export const mockApi = {
    login: async (username, password) => {
        // Simple authentication check
        if (username && password) {
            return {
                success: true,
                user: {
                    username,
                    userType: username.toLowerCase() === "admin" ? "admin" : "user",
                    division: "",
                    loginTime: new Date().toISOString()
                }
            };
        }
        return { success: false, message: "Invalid credentials" };
    },

    fetchUserData: async (username, userType) => {
        return leadApi.fetchFollowUps({ username, userType }, () => userType === "admin");
    },

    fetchDropdowns: async () => {
        return leadApi.fetchDropdowns();
    },

    fetchUsersList: async () => {
        return leadApi.fetchUsersList();
    },

    fetchCompanies: async () => {
        return leadApi.fetchCompanies();
    },

    saveCompany: async (companyData) => {
        return leadApi.saveCompany(companyData);
    },

    deleteCompany: async (id) => {
        return leadApi.deleteCompany(id);
    },

    fetchLeadByNumber: async (leadNo) => {
        return leadApi.fetchLeadByNumber(leadNo);
    },

    submitLead: async (leadData) => {
        return leadApi.submitLead(leadData);
    },

    generateLeadNumber: async () => {
        return leadApi.generateLeadNumber();
    },

    createEnquiryLead: async (company, receiverName, leadNumber) => {
        return leadApi.createEnquiryLead(company, receiverName, leadNumber);
    },

    fetchDashboardMetrics: async (currentUser, isAdminFunc, filters = {}) => {
        return leadApi.fetchDashboardMetrics(currentUser, isAdminFunc, filters);
    },

    fetchLeadsSummary: async (currentUser, isAdminFunc, filters = {}) => {
        return leadApi.fetchLeadsSummary(currentUser, isAdminFunc, filters);
    },

    fetchPendingTasks: async (currentUser, isAdminFunc, filters = {}) => {
        return leadApi.fetchPendingTasks(currentUser, isAdminFunc, filters);
    },

    fetchRecentActivities: async (currentUser, isAdminFunc, filters = {}) => {
        return leadApi.fetchRecentActivities(currentUser, isAdminFunc, filters);
    },

    fetchFollowUps: async (currentUser, isAdminFunc) => {
        return leadApi.fetchFollowUps(currentUser, isAdminFunc);
    },

    getFollowUpDraft: async (leadNo) => {
        return leadApi.getFollowUpDraft(leadNo);
    },

    saveFollowUpDraft: async (leadNo, draftData) => {
        return leadApi.saveFollowUpDraft(leadNo, draftData);
    },

    clearFollowUpDraft: async (leadNo) => {
        return leadApi.clearFollowUpDraft(leadNo);
    },

    submitFollowUp: async (data) => {
        return leadApi.submitFollowUp(data);
    },

    uploadFile: async (file) => {
        return leadApi.uploadAttachment(file);
    },

    fetchDashboardAppCharts: async (currentUser, isAdminFunc, filters = {}) => {
        return leadApi.fetchDashboardCharts(currentUser, isAdminFunc, filters);
    },

    getNextQuotationNumber: async () => {
        return leadApi.getNextPoNumber();
    },

    getCompanyPrefix: async () => {
        return "NTC";
    },

    fetchCallTrackerLeads: async (currentUser, isAdminFunc) => {
        return leadApi.fetchQuotationReadyLeads(currentUser, isAdminFunc);
    },

    getNextPoNumber: async () => {
        return leadApi.getNextPoNumber();
    },

    fetchExistingQuotations: async () => {
        const history = await leadApi.fetchQuotationHistory();
        return history.map(q => q.quotationNo);
    },

    fetchQuotationHistory: async () => {
        return leadApi.fetchQuotationHistory();
    },

    getQuotationData: async (quotationNo) => {
        return leadApi.getQuotationData(quotationNo);
    },

    saveQuotation: async (data, action = "save") => {
        return leadApi.saveQuotation(data, action);
    },

    fetchProducts: async () => {
        return leadApi.fetchInventoryItems("");
    },

    fetchFinishedGoodsMaterials: async () => {
        return leadApi.fetchFinishedGoodsMaterials();
    },

    fetchQuotationDropdowns: async () => {
        return leadApi.fetchQuotationDropdowns();
    },

    fetchLeadNumbers: async (currentUser, isAdminFunc) => {
        const readyLeads = await leadApi.fetchQuotationReadyLeads(currentUser, isAdminFunc);
        const map = {};
        readyLeads.forEach(l => {
            map[l.leadNo] = l;
        });
        return map;
    },

    fetchAdvancePayments: async (currentUser, isAdminFunc) => {
        return leadApi.fetchAdvancePayments(currentUser, isAdminFunc);
    },

    submitAdvancePaymentUpdate: async (quotationNo, updateData) => {
        return leadApi.submitAdvancePaymentUpdate(quotationNo, updateData);
    }
};

export default mockApi;
