// localStorage Service Layer for Documents, Subscriptions & Loans
// Designed to mimic an async API client so it can be swapped to Supabase later.

export const DOCS_DATA_CHANGED_EVENT = "docs_data_changed";

const notifyChange = (module) => {
  window.dispatchEvent(new CustomEvent(DOCS_DATA_CHANGED_EVENT, { detail: { module } }));
};

const getStorage = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
};

const setStorage = (key, data, moduleName) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    notifyChange(moduleName || key);
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
};

const generateId = (prefix = "doc") => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

// Sample initial data seeding if empty
const seedInitialData = () => {
  if (!localStorage.getItem("docs_initialized")) {
    const initialDocs = [
      {
        id: "doc_1",
        sn: 1,
        documentName: "Factory License 2025-26",
        personName: "Plant Head - M. K. Sharma",
        documentType: "PDF (.pdf)",
        category: "Company",
        companyName: "Nutech Engineering",
        needsRenewal: "Yes",
        renewalDate: "2026-10-15",
        fileName: "factory_license_2025.pdf",
        remarks: "Annual renewal required before Oct 15",
        createdAt: "2026-01-10T10:00:00.000Z",
      },
      {
        id: "doc_2",
        sn: 2,
        documentName: "GST Registration Certificate",
        personName: "Accounts & Tax Compliance Officer",
        documentType: "PDF (.pdf)",
        category: "Company",
        companyName: "Nutech Engineering",
        needsRenewal: "No",
        renewalDate: "",
        fileName: "gst_certificate.pdf",
        remarks: "Permanent registration certificate",
        createdAt: "2026-01-12T11:30:00.000Z",
      },
      {
        id: "doc_3",
        sn: 3,
        documentName: "Pollution Control Board Clearance",
        personName: "EHS Manager - R. K. Gupta",
        documentType: "PDF (.pdf)",
        category: "Company",
        companyName: "Nutech Systems Pvt Ltd",
        needsRenewal: "Yes",
        renewalDate: "2026-10-05",
        fileName: "pcb_clearance_2026.pdf",
        remarks: "Expiring soon - renewal submitted",
        createdAt: "2026-02-01T09:15:00.000Z",
      },
      {
        id: "doc_4",
        sn: 4,
        documentName: "Director Identification & DIN Verification",
        personName: "Sh. Rajesh Sharma (Director)",
        documentType: "PDF (.pdf)",
        category: "Director",
        companyName: "Nutech Engineering",
        needsRenewal: "Yes",
        renewalDate: "2026-11-20",
        fileName: "director_din_record.pdf",
        remarks: "Annual DIN KYC verification",
        createdAt: "2026-02-10T14:20:00.000Z",
      },
    ];

    const initialSubscriptions = [
      {
        id: "sub_1",
        sn: 1,
        subscriptionName: "AWS Cloud Infrastructure",
        companyName: "Nutech Engineering",
        subscriberName: "DevOps Team",
        price: 24500,
        frequency: "Monthly",
        purpose: "Hosting production workloads and database servers",
        status: "Paid",
        requestedDate: "2026-09-01",
        renewalDate: "2026-10-01",
        approvedBy: "IT Director",
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "sub_2",
        sn: 2,
        subscriptionName: "Microsoft 365 Business Standard",
        companyName: "Nutech Engineering",
        subscriberName: "HR & Operations",
        price: 78000,
        frequency: "Yearly",
        purpose: "Company-wide email, Teams, and Office suite licenses (50 users)",
        status: "Approved",
        requestedDate: "2026-09-15",
        renewalDate: "2026-10-15",
        approvedBy: "Management",
        createdAt: "2026-09-15T11:00:00.000Z",
      },
      {
        id: "sub_3",
        sn: 3,
        subscriptionName: "SolidWorks CAD License Renewal",
        companyName: "Nutech Systems Pvt Ltd",
        subscriberName: "Design & R&D",
        price: 185000,
        frequency: "Yearly",
        purpose: "3D CAD modeling software support & updates for engineering team",
        status: "Pending",
        requestedDate: "2026-09-25",
        renewalDate: "2026-10-25",
        approvedBy: "",
        createdAt: "2026-09-25T15:45:00.000Z",
      },
      {
        id: "sub_4",
        sn: 4,
        subscriptionName: "Zoom Enterprise 25 Hosts",
        companyName: "Nutech Engineering",
        subscriberName: "Sales Team",
        price: 12000,
        frequency: "Quarterly",
        purpose: "Client meetings and webinar presentations",
        status: "Paid",
        requestedDate: "2026-08-10",
        renewalDate: "2026-11-10",
        approvedBy: "Admin",
        createdAt: "2026-08-10T12:00:00.000Z",
      },
    ];

    const initialLoans = [
      {
        id: "loan_1",
        sn: 1,
        loanName: "HDFC Machining Center Term Loan",
        bankName: "HDFC Bank",
        loanAmount: 5000000,
        interestRate: 8.75,
        tenureMonths: 60,
        startDate: "2023-04-10",
        maturityDate: "2028-04-10",
        endDate: "2028-04-10",
        emiAmount: 103200,
        outstandingAmount: 2840000,
        accountNumber: "HDFC-TL-90881234",
        purpose: "Purchase of 5-Axis CNC Milling Machine",
        collateralDocument: "Factory Unit 1 Land Deed & Machine Hypothecation",
        fileName: "hdfc_sanction_agreement.pdf",
        remarks: "Machinery hypothecated till full closure",
        collectNocStatus: "Pending",
        foreclosureStatus: "None",
        status: "Active",
        createdAt: "2023-04-10T10:00:00.000Z",
      },
      {
        id: "loan_2",
        sn: 2,
        loanName: "SBI Working Capital Term Loan",
        bankName: "State Bank of India",
        loanAmount: 3000000,
        interestRate: 9.1,
        tenureMonths: 36,
        startDate: "2022-08-15",
        maturityDate: "2025-08-15",
        endDate: "2025-08-15",
        emiAmount: 95500,
        outstandingAmount: 0,
        accountNumber: "SBI-WCL-44120912",
        purpose: "Plant expansion & raw material buffer",
        collateralDocument: "Commercial Property Deed & Book Debts",
        fileName: "sbi_working_capital_sanction.pdf",
        remarks: "Facility settled in full",
        collectNocStatus: "Yes",
        foreclosureStatus: "Settled",
        status: "Closed",
        createdAt: "2022-08-15T09:30:00.000Z",
      },
      {
        id: "loan_3",
        sn: 3,
        loanName: "ICICI Industrial Solar Rooftop Loan",
        bankName: "ICICI Bank",
        loanAmount: 2500000,
        interestRate: 8.25,
        tenureMonths: 48,
        startDate: "2024-01-20",
        maturityDate: "2028-01-20",
        endDate: "2028-01-20",
        emiAmount: 61300,
        outstandingAmount: 1820000,
        accountNumber: "ICICI-SOL-5561023",
        purpose: "150kW Solar Power Installation at Unit 2",
        collateralDocument: "Solar Power Generation Asset & Lease Guarantee",
        fileName: "icici_solar_sanction_deed.pdf",
        remarks: "Early payoff requested via internal reserves",
        collectNocStatus: "Pending",
        foreclosureStatus: "Requested",
        foreclosureReason: "Early payoff via internal capital reserves",
        status: "Active",
        createdAt: "2024-01-20T11:00:00.000Z",
      },
    ];

    const initialShares = [
      {
        id: "share_1",
        sn: 1,
        documentId: "doc_1",
        documentName: "Factory License 2025-26",
        recipientName: "Legal Auditor - Sh. K. Verma",
        recipientEmail: "kverma.auditors@gmail.com",
        recipientPhone: "9876543210",
        purpose: "Statutory Factory Compliance Audit",
        shareMethod: "Email",
        sharedAt: "2026-09-10T14:30:00.000Z",
        sharedBy: "Admin User",
      },
    ];

    const initialRenewals = [
      {
        id: "ren_1",
        sn: 1,
        documentId: "doc_1",
        documentName: "Factory License 2025-26",
        previousRenewalDate: "2025-10-15",
        newRenewalDate: "2026-10-15",
        renewedAt: "2025-10-12T11:00:00.000Z",
        renewedBy: "Admin",
        remarks: "Annual license fee paid via treasury portal",
      },
    ];

    const initialPayments = [
      {
        id: "pay_1",
        sn: 1,
        subscriptionId: "sub_1",
        subscriptionName: "AWS Cloud Infrastructure",
        companyName: "Nutech Engineering",
        amountPaid: 24500,
        paymentDate: "2026-09-02",
        paymentMode: "Corporate Credit Card",
        transactionRef: "TXN-AWS-998821",
        recordedBy: "Accounts Team",
        remarks: "Monthly cloud billing",
        createdAt: "2026-09-02T10:00:00.000Z",
      },
    ];

    setStorage("docs_documents", initialDocs);
    setStorage("docs_subscriptions", initialSubscriptions);
    setStorage("docs_loans", initialLoans);
    setStorage("docs_document_shares", initialShares);
    setStorage("docs_document_renewals", initialRenewals);
    setStorage("docs_sub_payments", initialPayments);
    setStorage("docs_sub_renewals", []);
    setStorage("docs_loan_foreclosures", [
      {
        id: "fc_1",
        sn: 1,
        loanId: "loan_3",
        loanName: "ICICI Industrial Solar Rooftop Loan",
        bankName: "ICICI Bank",
        outstandingAmount: 1820000,
        requestedDate: "2026-09-20",
        requestedBy: "Finance Head",
        status: "Pending",
        reason: "Early payoff via internal capital reserves",
        remarks: "Awaiting foreclosure statement from bank",
      },
    ]);
    localStorage.setItem("docs_initialized", "true");
  }
};

seedInitialData();

// ============================================================================
// DOCUMENTS API
// ============================================================================
export const documentsApi = {
  list: async () => {
    return getStorage("docs_documents");
  },

  getById: async (id) => {
    const list = getStorage("docs_documents");
    return list.find((item) => item.id === id) || null;
  },

  create: async (data) => {
    const list = getStorage("docs_documents");
    const nextSn = list.length > 0 ? Math.max(...list.map((i) => i.sn || 0)) + 1 : 1;
    const newItem = {
      id: generateId("doc"),
      sn: nextSn,
      documentName: data.documentName || "",
      personName: data.personName || data.holderName || data.name || "",
      documentType: data.documentType || "Other",
      category: data.category || "General",
      companyName: data.companyName || "Nutech Engineering",
      needsRenewal: data.needsRenewal === "Yes" || data.needsRenewal === true ? "Yes" : "No",
      renewalDate: data.renewalDate || "",
      attachments: data.attachments || [],
      fileName: data.fileName || (data.file ? data.file.name : ""),
      fileUrl: data.fileUrl || "",
      remarks: data.remarks || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    setStorage("docs_documents", updated, "docs_documents");
    return newItem;
  },

  update: async (id, data) => {
    const list = getStorage("docs_documents");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Document not found");

    const updatedItem = {
      ...list[index],
      ...data,
      personName:
        data.personName !== undefined
          ? data.personName
          : list[index].personName || list[index].holderName || list[index].name || "",
      needsRenewal: data.needsRenewal === "Yes" || data.needsRenewal === true ? "Yes" : "No",
      updatedAt: new Date().toISOString(),
    };
    list[index] = updatedItem;
    setStorage("docs_documents", list, "docs_documents");
    return updatedItem;
  },

  remove: async (id) => {
    const list = getStorage("docs_documents");
    const filtered = list.filter((item) => item.id !== id);
    setStorage("docs_documents", filtered, "docs_documents");
    return true;
  },

  // Document Renewals
  listRenewals: async () => {
    return getStorage("docs_document_renewals");
  },

  recordRenewal: async (docId, renewalData) => {
    const docs = getStorage("docs_documents");
    const docIndex = docs.findIndex((d) => d.id === docId);
    if (docIndex === -1) throw new Error("Document not found");

    const prevRenewalDate = docs[docIndex].renewalDate;
    if (renewalData.newRenewalDate) {
      docs[docIndex].renewalDate = renewalData.newRenewalDate;
    }
    if (renewalData.needsRenewal !== undefined) {
      docs[docIndex].needsRenewal = renewalData.needsRenewal;
    }
    if (renewalData.attachments && renewalData.attachments.length > 0) {
      docs[docIndex].attachments = [...(docs[docIndex].attachments || []), ...renewalData.attachments];
      docs[docIndex].fileName = renewalData.attachments[0].name;
    } else if (renewalData.fileName) {
      docs[docIndex].fileName = renewalData.fileName;
    }
    docs[docIndex].updatedAt = new Date().toISOString();
    setStorage("docs_documents", docs, "docs_documents");

    const renewals = getStorage("docs_document_renewals");
    const nextSn = renewals.length > 0 ? Math.max(...renewals.map((i) => i.sn || 0)) + 1 : 1;
    const newRecord = {
      id: generateId("ren"),
      sn: nextSn,
      documentId: docId,
      documentName: docs[docIndex].documentName,
      category: docs[docIndex].category,
      documentType: docs[docIndex].documentType,
      personName: docs[docIndex].personName,
      companyName: docs[docIndex].companyName,
      previousRenewalDate: prevRenewalDate,
      newRenewalDate: renewalData.newRenewalDate,
      renewNextPeriod: renewalData.renewNextPeriod !== false,
      renewedAt: new Date().toISOString(),
      renewedBy: renewalData.renewedBy || localStorage.getItem("user-name") || "Admin",
      remarks: renewalData.remarks || "",
      cost: renewalData.cost || 0,
      receiptNumber: renewalData.receiptNumber || "",
      fileName: renewalData.fileName || (renewalData.attachments?.[0]?.name) || docs[docIndex].fileName || "",
    };
    setStorage("docs_document_renewals", [newRecord, ...renewals], "docs_document_renewals");
    return newRecord;
  },

  // Document Shares
  listShares: async () => {
    return getStorage("docs_document_shares");
  },

  recordShare: async (shareData) => {
    const shares = getStorage("docs_document_shares");
    const nextSn = shares.length > 0 ? Math.max(...shares.map((i) => i.sn || 0)) + 1 : 1;
    const newShare = {
      id: generateId("share"),
      sn: nextSn,
      shareNo: `SH-${String(nextSn).padStart(3, "0")}`,
      documentId: shareData.documentId,
      documentName: shareData.documentName,
      docSn: shareData.docSn,
      recipientName: shareData.recipientName,
      recipientEmail: shareData.recipientEmail || "",
      recipientPhone: shareData.recipientPhone || "",
      subject: shareData.subject || "",
      message: shareData.message || "",
      purpose: shareData.purpose || shareData.subject || "",
      shareMethod: shareData.shareMethod || "Email",
      sharedAt: new Date().toISOString(),
      sharedBy: localStorage.getItem("user-name") || "Admin User",
      notes: shareData.notes || shareData.message || "",
    };
    setStorage("docs_document_shares", [newShare, ...shares], "docs_document_shares");
    return newShare;
  },
};

// ============================================================================
// SUBSCRIPTIONS API
// ============================================================================
export const subscriptionsApi = {
  list: async () => {
    return getStorage("docs_subscriptions");
  },

  getById: async (id) => {
    const list = getStorage("docs_subscriptions");
    return list.find((item) => item.id === id) || null;
  },

  create: async (data) => {
    const list = getStorage("docs_subscriptions");
    const nextSn = list.length > 0 ? Math.max(...list.map((i) => i.sn || 0)) + 1 : 1;
    const newItem = {
      id: generateId("sub"),
      sn: nextSn,
      subscriptionName: data.subscriptionName || "",
      serviceName: data.serviceName || "",
      companyName: data.companyName || "Nutech Engineering",
      subscriberName: data.subscriberName || "",
      price: Number(data.price) || 0,
      frequency: data.frequency || "Monthly", // Monthly, Quarterly, Half-Yearly, Yearly
      purpose: data.purpose || "",
      status: "Pending", // Pending, Approved, Rejected, Paid
      requestedDate: data.requestedDate || new Date().toISOString().split("T")[0],
      renewalDate: data.renewalDate || "",
      paymentDueDate: data.paymentDueDate || data.renewalDate || "",
      approvedBy: "",
      remarks: data.remarks || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    setStorage("docs_subscriptions", updated, "docs_subscriptions");
    return newItem;
  },

  update: async (id, data) => {
    const list = getStorage("docs_subscriptions");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Subscription not found");

    const updatedItem = {
      ...list[index],
      ...data,
      price: data.price !== undefined ? Number(data.price) : list[index].price,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updatedItem;
    setStorage("docs_subscriptions", list, "docs_subscriptions");
    return updatedItem;
  },

  approve: async (id, { status, approvedBy, remarks }) => {
    const list = getStorage("docs_subscriptions");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Subscription not found");

    list[index].status = status; // "Approved" or "Rejected"
    list[index].approvedBy = approvedBy || localStorage.getItem("user-name") || "Admin";
    list[index].approvalRemarks = remarks || "";
    list[index].approvedAt = new Date().toISOString();
    list[index].updatedAt = new Date().toISOString();

    setStorage("docs_subscriptions", list, "docs_subscriptions");
    return list[index];
  },

  pay: async (id, paymentData) => {
    const list = getStorage("docs_subscriptions");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Subscription not found");

    list[index].status = "Paid";
    list[index].lastPaidDate = paymentData.paymentDate || new Date().toISOString().split("T")[0];
    list[index].updatedAt = new Date().toISOString();
    setStorage("docs_subscriptions", list, "docs_subscriptions");

    const payments = getStorage("docs_sub_payments");
    const nextSn = payments.length > 0 ? Math.max(...payments.map((i) => i.sn || 0)) + 1 : 1;
    const newPayment = {
      id: generateId("pay"),
      sn: nextSn,
      subscriptionId: id,
      subSn: list[index].sn,
      subscriptionName: list[index].subscriptionName,
      companyName: list[index].companyName,
      subscriberName: list[index].subscriberName || "",
      frequency: list[index].frequency || "Monthly",
      amountPaid: Number(paymentData.amountPaid) || list[index].price,
      paymentDate: paymentData.paymentDate || new Date().toISOString().split("T")[0],
      paymentMode: paymentData.paymentMode || "Bank Transfer",
      transactionRef: paymentData.transactionRef || "",
      recordedBy: localStorage.getItem("user-name") || "Accounts Team",
      remarks: paymentData.remarks || "",
      createdAt: new Date().toISOString(),
    };
    setStorage("docs_sub_payments", [newPayment, ...payments], "docs_sub_payments");
    return newPayment;
  },

  listPayments: async () => {
    return getStorage("docs_sub_payments");
  },

  recordRenewal: async (subId, renewalData) => {
    const list = getStorage("docs_subscriptions");
    const index = list.findIndex((item) => item.id === subId);
    if (index === -1) throw new Error("Subscription not found");

    const prevRenewal = list[index].renewalDate;
    list[index].renewalDate = renewalData.nextRenewalDate;
    list[index].status = "Pending"; // Needs new cycle approval or marked paid
    list[index].updatedAt = new Date().toISOString();
    setStorage("docs_subscriptions", list, "docs_subscriptions");

    const renewals = getStorage("docs_sub_renewals");
    const nextSn = renewals.length > 0 ? Math.max(...renewals.map((i) => i.sn || 0)) + 1 : 1;
    const newRen = {
      id: generateId("sub_ren"),
      sn: nextSn,
      subscriptionId: subId,
      subSn: list[index].sn,
      subscriptionName: list[index].subscriptionName,
      companyName: list[index].companyName,
      subscriberName: list[index].subscriberName || "",
      frequency: list[index].frequency || "Monthly",
      previousRenewalDate: prevRenewal,
      newRenewalDate: renewalData.nextRenewalDate,
      renewedAt: new Date().toISOString(),
      renewedBy: localStorage.getItem("user-name") || "Admin",
      renewPrice: Number(renewalData.price) || list[index].price,
      remarks: renewalData.remarks || "",
    };
    setStorage("docs_sub_renewals", [newRen, ...renewals], "docs_sub_renewals");
    return newRen;
  },

  listRenewals: async () => {
    return getStorage("docs_sub_renewals");
  },

  remove: async (id) => {
    const list = getStorage("docs_subscriptions");
    const filtered = list.filter((item) => item.id !== id);
    setStorage("docs_subscriptions", filtered, "docs_subscriptions");
    return true;
  },
};

// ============================================================================
// LOANS API
// ============================================================================
export const loansApi = {
  list: async () => {
    return getStorage("docs_loans");
  },

  getById: async (id) => {
    const list = getStorage("docs_loans");
    return list.find((item) => item.id === id) || null;
  },

  create: async (data) => {
    const list = getStorage("docs_loans");
    const nextSn = list.length > 0 ? Math.max(...list.map((i) => i.sn || 0)) + 1 : 1;
    const newItem = {
      id: generateId("loan"),
      sn: nextSn,
      loanName: data.loanName || "",
      bankName: data.bankName || "",
      loanAmount: Number(data.loanAmount || data.sanctionedAmount) || 0,
      interestRate: Number(data.interestRate) || 0,
      tenureMonths: Number(data.tenureMonths) || 12,
      startDate: data.startDate || data.loanStartDate || "",
      maturityDate: data.maturityDate || data.endDate || data.loanEndDate || "",
      endDate: data.endDate || data.loanEndDate || data.maturityDate || "",
      emiAmount: Number(data.emiAmount) || 0,
      outstandingAmount: Number(data.outstandingAmount) || Number(data.loanAmount || data.sanctionedAmount) || 0,
      accountNumber: data.accountNumber || "",
      purpose: data.purpose || "",
      collateralDocument: data.collateralDocument || data.collateralDoc || "",
      fileName: data.fileName || (data.file ? data.file.name : "") || "",
      attachments: data.attachments || (data.file ? [data.file] : []),
      collectNocStatus: "Pending", // Pending, Yes
      foreclosureStatus: "None", // None, Requested, Approved, Settled
      status: "Active", // Active, Closed
      remarks: data.remarks || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    setStorage("docs_loans", updated, "docs_loans");
    return newItem;
  },

  update: async (id, data) => {
    const list = getStorage("docs_loans");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Loan not found");

    const updatedItem = {
      ...list[index],
      ...data,
      loanAmount: data.loanAmount !== undefined ? Number(data.loanAmount) : list[index].loanAmount,
      interestRate: data.interestRate !== undefined ? Number(data.interestRate) : list[index].interestRate,
      tenureMonths: data.tenureMonths !== undefined ? Number(data.tenureMonths) : list[index].tenureMonths,
      emiAmount: data.emiAmount !== undefined ? Number(data.emiAmount) : list[index].emiAmount,
      outstandingAmount: data.outstandingAmount !== undefined ? Number(data.outstandingAmount) : list[index].outstandingAmount,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updatedItem;
    setStorage("docs_loans", list, "docs_loans");
    return updatedItem;
  },

  foreclosureRequest: async (loanId, requestData) => {
    const list = getStorage("docs_loans");
    const index = list.findIndex((item) => item.id === loanId);
    if (index === -1) throw new Error("Loan not found");

    list[index].foreclosureStatus = "Requested";
    list[index].foreclosureReason = requestData.reason || "";
    list[index].updatedAt = new Date().toISOString();
    setStorage("docs_loans", list, "docs_loans");

    const fcs = getStorage("docs_loan_foreclosures");
    const nextSn = fcs.length > 0 ? Math.max(...fcs.map((i) => i.sn || 0)) + 1 : 1;
    const newFc = {
      id: generateId("fc"),
      sn: nextSn,
      loanId: loanId,
      loanName: list[index].loanName,
      bankName: list[index].bankName,
      outstandingAmount: list[index].outstandingAmount,
      requestedDate: new Date().toISOString().split("T")[0],
      requestedBy: localStorage.getItem("user-name") || "Finance",
      reason: requestData.reason || "",
      remarks: requestData.remarks || "",
      status: "Pending", // Pending, Approved, Settled
      createdAt: new Date().toISOString(),
    };
    setStorage("docs_loan_foreclosures", [newFc, ...fcs], "docs_loan_foreclosures");
    return newFc;
  },

  foreclosureApproveOrSettle: async (foreclosureId, { action, settlementAmount, remarks }) => {
    const fcs = getStorage("docs_loan_foreclosures");
    const fcIndex = fcs.findIndex((f) => f.id === foreclosureId);
    if (fcIndex === -1) throw new Error("Foreclosure request not found");

    const fc = fcs[fcIndex];
    fc.status = action === "settle" ? "Settled" : "Approved";
    fc.settlementAmount = settlementAmount ? Number(settlementAmount) : fc.outstandingAmount;
    fc.settledDate = new Date().toISOString().split("T")[0];
    fc.settledRemarks = remarks || "";
    setStorage("docs_loan_foreclosures", fcs, "docs_loan_foreclosures");

    // Update loan record
    const loans = getStorage("docs_loans");
    const loanIndex = loans.findIndex((l) => l.id === fc.loanId);
    if (loanIndex !== -1) {
      loans[loanIndex].foreclosureStatus = fc.status;
      if (action === "settle") {
        loans[loanIndex].outstandingAmount = 0;
        loans[loanIndex].status = "Closed";
      }
      loans[loanIndex].updatedAt = new Date().toISOString();
      setStorage("docs_loans", loans, "docs_loans");
    }

    return fc;
  },

  listForeclosures: async () => {
    return getStorage("docs_loan_foreclosures");
  },

  collectNoc: async (loanId, nocData) => {
    const list = getStorage("docs_loans");
    const index = list.findIndex((item) => item.id === loanId);
    if (index === -1) throw new Error("Loan not found");

    list[index].collectNocStatus = "Yes";
    list[index].nocNumber = nocData.nocNumber || "";
    list[index].nocDate = nocData.nocDate || new Date().toISOString().split("T")[0];
    list[index].nocCollectedBy = localStorage.getItem("user-name") || "Admin";
    list[index].nocRemarks = nocData.remarks || "";
    list[index].updatedAt = new Date().toISOString();

    setStorage("docs_loans", list, "docs_loans");
    return list[index];
  },

  remove: async (id) => {
    const list = getStorage("docs_loans");
    const filtered = list.filter((item) => item.id !== id);
    setStorage("docs_loans", filtered, "docs_loans");
    return true;
  },
};

// ============================================================================
// SIDEBAR BADGE COUNTS HELPER
// ============================================================================
export const fetchDocsSidebarBadgeCounts = async () => {
  try {
    const docs = getStorage("docs_documents") || [];
    const subs = getStorage("docs_subscriptions") || [];
    const loans = getStorage("docs_loans") || [];
    const foreclosures = getStorage("docs_loan_foreclosures") || [];

    // 1. Document Renewal: Documents requiring renewal
    const documentRenewal = docs.filter((d) => d.needsRenewal === "Yes").length;

    // 2. Subscription Approval: Pending subscriptions awaiting approval
    const subscriptionApproval = subs.filter((s) => s.status === "Pending").length;

    // 3. Subscription Payment: Approved subscriptions awaiting payment recording
    const subscriptionPayment = subs.filter((s) => s.status === "Approved").length;

    // 4. Subscription Renewal: Active subscriptions with renewal cycle
    const subscriptionRenewal = subs.filter((s) => s.status !== "Rejected").length;

    // 5. Loan Foreclosure: Foreclosures awaiting settlement / closure
    const loanForeclosure = foreclosures.filter((f) => f.status !== "Settled").length;

    // 6. Loan NOC: Loans where NOC is pending collection
    const loanNoc = loans.filter((l) => l.collectNocStatus !== "Yes").length;

    const total =
      documentRenewal +
      subscriptionApproval +
      subscriptionPayment +
      subscriptionRenewal +
      loanForeclosure +
      loanNoc;

    return {
      documentRenewal,
      subscriptionApproval,
      subscriptionPayment,
      subscriptionRenewal,
      loanForeclosure,
      loanNoc,
      total,
    };
  } catch (err) {
    console.error("Error calculating docs sidebar badge counts:", err);
    return {
      documentRenewal: 0,
      subscriptionApproval: 0,
      subscriptionPayment: 0,
      subscriptionRenewal: 0,
      loanForeclosure: 0,
      loanNoc: 0,
      total: 0,
    };
  }
};

