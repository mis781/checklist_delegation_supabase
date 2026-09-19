
export const users = [
    { username: "admin", password: "123", userType: "admin" },
    { username: "user1", password: "123", userType: "user" },
    { username: "Shadab", password: "123", userType: "admin" }
];

export const dropdowns = {
    receivers: ["Shadab", "Sajit", "Musaib", "Faizan"],
    sources: ["Indiamart", "Justdial", "Social Media", "Website", "Referral", "Other"],
    states: [
        "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", 
        "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", 
        "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", 
        "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", 
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", 
        "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
    ],
    creditDays: ["7 days", "15 days", "30 days", "45 days", "60 days"],
    creditLimits: ["₹50,000", "₹100,000", "₹500,000", "₹1,000,000"],
    designations: ["Manager", "Director", "CEO", "CFO", "Proprietor", "Purchase Manager"],
    nobs: ["Manufacturing", "Trading", "Service", "Retail", "OEM"],
    statuses: ["hot", "warm", "cold"],
    feedbacks: ["Interested", "Not Interested", "Asked for Quotation", "Callback Later", "Busy", "Wrong Number"]
};

export const companies = [
    {
        name: "ABC Corp",
        salesPerson: "Shadab",
        phoneNumber: "9876543210",
        email: "contact@abccorp.com",
        location: "Mumbai",
        consignorState: "Maharashtra",
        consignorAddress: "123, Industrial Area, Mumbai",
        consignorGSTIN: "27ABCDE1234F1Z5"
    },
    {
        name: "XYZ Pvt Ltd",
        salesPerson: "Sajit",
        phoneNumber: "8765432109",
        email: "info@xyz.com",
        location: "Delhi",
        consignorState: "Delhi",
        consignorAddress: "456, Okhla Phase 3, Delhi",
        consignorGSTIN: "07VWXYZ1234F1Z5"
    }
];

export const fmsData = [
    {
        date: "01/12/2024",
        leadNumber: "LD-001",
        receiver: "Shadab",
        source: "Indiamart",
        leadType: "Incoming",
        salesType: "Existing Customer",
        interaction: "Call",
        company: "ABC Corp",
        personName: "Rohit Verma",
        phoneNumber: "9876543210",
        email: "rohit@abccorp.com",
        location: "Mumbai",
        state: "Maharashtra",
        city: "Mumbai",
        address: "123, Industrial Area, Mumbai",
        gst: "27ABCDE1234F1Z5",
        nob: "Manufacturing",
        division: "Nutech Composite",
        creditAccess: "Yes",
        creditDays: "30 Days",
        creditLimit: "1,00,000",
        contactPersons: [{ name: "Rohit Verma", designation: "Purchase Manager", number: "9876543210" }],
        notes: "Interested in bulk order for Q1.",
        attachment: "data:text/plain;base64,U2FtcGxlIGF0dGFjaG1lbnQgb24gZmlsZSBmb3IgbGVhZCBMRC0wMDEu",
        assignedUser: "Shadab",
        status: "Pending", // Example status
        hasPendingFollowUp: true
    }
];

// Emptied — this used to hold a fabricated seed quotation ("NBD-001")
// that never existed in the real Quotation flow (it wasn't a saved
// quotation, had no items/PDF, and never appeared in the Quotation page's
// own History tab), yet was still being counted into the Dashboard's
// "Quotations Sent" total. Real quotations now come entirely from
// getSavedQuotations() in storageManager.js.
export const quotations = [];

export const enquiryTracker = [
    {
        date: "04/12/2024",
        enquiryNo: "ENQ-001",
        assignedUser: "Shadab",
        orderReceived: "Yes",
        status: "Closed"
    },
    {
        date: "05/12/2024",
        enquiryNo: "ENQ-002",
        assignedUser: "Sajit",
        orderReceived: "No",
        status: "Pending"
    }
];

export const enquiryToOrder = [
    {
        date: "04/12/2024",
        enquiryNo: "ENQ-001",
        assignedUser: "Shadab",
        status: "Pending"
    }
];

export const products = [
    { code: "P001", name: "Product A", description: "High quality widget", rate: 1000 },
    { code: "P002", name: "Product B", description: "Premium gadget", rate: 2500 },
    { code: "P003", name: "Product C", description: "Standard component", rate: 500 }
];
