import { supabase } from "../../../SupabaseClient";

export const DOCS_DATA_CHANGED_EVENT = "docs_data_changed";

const notifyChange = (module) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DOCS_DATA_CHANGED_EVENT, { detail: { module } }));
  }
};

// Clear legacy hardcoded mock data keys from localStorage
if (typeof window !== "undefined") {
  const legacyKeys = [
    "docs_initialized",
    "docs_documents",
    "docs_subscriptions",
    "docs_loans",
    "docs_document_shares",
    "docs_document_renewals",
    "docs_sub_payments",
    "docs_sub_renewals",
    "docs_loan_foreclosures",
  ];
  legacyKeys.forEach((k) => localStorage.removeItem(k));
}

// ============================================================================
// SUPABASE REALTIME SUBSCRIPTION
// Keeps all open pages synchronized whenever any database row changes
// ============================================================================
if (typeof window !== "undefined" && supabase) {
  try {
    supabase
      .channel("docs_system_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_documents" },
        () => notifyChange("docs_documents")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_document_renewals" },
        () => notifyChange("docs_document_renewals")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_document_shares" },
        () => notifyChange("docs_document_shares")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_subscriptions" },
        () => notifyChange("docs_subscriptions")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_sub_payments" },
        () => notifyChange("docs_sub_payments")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_sub_renewals" },
        () => notifyChange("docs_sub_renewals")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_loans" },
        () => notifyChange("docs_loans")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "docs_loan_foreclosures" },
        () => notifyChange("docs_loan_foreclosures")
      )
      .subscribe();
  } catch (err) {
    console.warn("Realtime subscription setup failed:", err);
  }
}

// ============================================================================
// SUPABASE STORAGE HELPER FOR DOCUMENT ATTACHMENTS
// ============================================================================
export const uploadDocFile = async (file, folder = "documents") => {
  if (!file) return null;
  // If already processed metadata without raw binary
  if (!(file instanceof File) && !(file instanceof Blob)) {
    return file;
  }

  try {
    const fileExt = (file.name || "bin").split(".").pop();
    const cleanFileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("docs_attachments")
      .upload(cleanFileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.warn("Storage upload notice (saving file metadata):", uploadError.message);
      return { name: file.name, size: file.size, type: file.type };
    }

    const { data: urlData } = supabase.storage
      .from("docs_attachments")
      .getPublicUrl(cleanFileName);

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      url: urlData?.publicUrl || "",
      path: cleanFileName,
    };
  } catch (err) {
    console.warn("Storage upload fallback:", err);
    return { name: file.name, size: file.size, type: file.type };
  }
};

// ============================================================================
// DATA TRANSFORMERS (DB snake_case <-> Frontend camelCase)
// ============================================================================

const transformDocFromDb = (r) => {
  if (!r) return null;
  const div = r.division || r.company_name || "NuTech Pipes";
  return {
    id: r.id,
    sn: r.sn,
    documentName: r.document_name,
    personName: r.person_name || "",
    documentType: r.document_type || "PDF (.pdf)",
    category: r.category || "Company",
    division: div,
    companyName: div,
    needsRenewal: r.needs_renewal || "No",
    renewalDate: r.renewal_date || "",
    fileName: r.file_name || "",
    fileUrl: r.file_url || "",
    attachments: r.attachments || [],
    remarks: r.remarks || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const transformRenewalFromDb = (r) => {
  if (!r) return null;
  const div = r.division || r.company_name || "";
  return {
    id: r.id,
    sn: r.sn,
    documentId: r.document_id,
    documentName: r.document_name,
    category: r.category,
    documentType: r.document_type,
    personName: r.person_name,
    division: div,
    companyName: div,
    previousRenewalDate: r.previous_renewal_date,
    newRenewalDate: r.new_renewal_date,
    renewNextPeriod: r.renew_next_period,
    renewedAt: r.renewed_at,
    renewedBy: r.renewed_by,
    remarks: r.remarks,
    cost: Number(r.cost) || 0,
    receiptNumber: r.receipt_number || "",
    fileName: r.file_name || "",
    attachments: r.attachments || [],
    createdAt: r.created_at,
  };
};

const transformShareFromDb = (r) => {
  if (!r) return null;
  return {
    id: r.id,
    sn: r.sn,
    shareNo: r.share_no,
    documentId: r.document_id,
    documentName: r.document_name,
    docSn: r.doc_sn,
    recipientName: r.recipient_name,
    recipientEmail: r.recipient_email || "",
    recipientPhone: r.recipient_phone || "",
    subject: r.subject || "",
    message: r.message || "",
    purpose: r.purpose || "",
    shareMethod: r.share_method || "Email",
    sharedAt: r.shared_at,
    sharedBy: r.shared_by,
    notes: r.notes || "",
    createdAt: r.created_at,
  };
};

const transformSubFromDb = (r) => {
  if (!r) return null;
  const div = r.division || r.company_name || "NuTech Pipes";
  return {
    id: r.id,
    sn: r.sn,
    subscriptionName: r.subscription_name,
    serviceName: r.service_name || "",
    division: div,
    companyName: div,
    subscriberName: r.subscriber_name || "",
    price: Number(r.price) || 0,
    frequency: r.frequency || "Monthly",
    purpose: r.purpose || "",
    status: r.status || "Pending",
    requestedDate: r.requested_date,
    renewalDate: r.renewal_date,
    paymentDueDate: r.payment_due_date,
    approvedBy: r.approved_by || "",
    approvalRemarks: r.approval_remarks || "",
    approvedAt: r.approved_at,
    lastPaidDate: r.last_paid_date,
    remarks: r.remarks || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const transformPaymentFromDb = (r) => {
  if (!r) return null;
  const div = r.division || r.company_name || "";
  return {
    id: r.id,
    sn: r.sn,
    subscriptionId: r.subscription_id,
    subSn: r.sub_sn,
    subscriptionName: r.subscription_name,
    division: div,
    companyName: div,
    subscriberName: r.subscriber_name,
    frequency: r.frequency,
    amountPaid: Number(r.amount_paid) || 0,
    paymentDate: r.payment_date,
    paymentMode: r.payment_mode,
    transactionRef: r.transaction_ref,
    recordedBy: r.recorded_by,
    remarks: r.remarks,
    createdAt: r.created_at,
  };
};

const transformSubRenewalFromDb = (r) => {
  if (!r) return null;
  const div = r.division || r.company_name || "";
  return {
    id: r.id,
    sn: r.sn,
    subscriptionId: r.subscription_id,
    subSn: r.sub_sn,
    subscriptionName: r.subscription_name,
    division: div,
    companyName: div,
    subscriberName: r.subscriber_name,
    frequency: r.frequency,
    previousRenewalDate: r.previous_renewal_date,
    newRenewalDate: r.new_renewal_date,
    renewPrice: Number(r.renew_price) || 0,
    renewedAt: r.renewed_at,
    renewedBy: r.renewed_by,
    remarks: r.remarks,
    createdAt: r.created_at,
  };
};

const transformLoanFromDb = (r) => {
  if (!r) return null;
  return {
    id: r.id,
    sn: r.sn,
    loanName: r.loan_name,
    bankName: r.bank_name,
    loanAmount: Number(r.loan_amount) || 0,
    interestRate: Number(r.interest_rate) || 0,
    tenureMonths: Number(r.tenure_months) || 12,
    startDate: r.start_date,
    maturityDate: r.maturity_date,
    endDate: r.end_date || r.maturity_date,
    emiAmount: Number(r.emi_amount) || 0,
    outstandingAmount: Number(r.outstanding_amount) || 0,
    accountNumber: r.account_number || "",
    purpose: r.purpose || "",
    collateralDocument: r.collateral_document || "",
    fileName: r.file_name || "",
    fileUrl: r.file_url || "",
    attachments: r.attachments || [],
    collectNocStatus: r.collect_noc_status || "Pending",
    nocNumber: r.noc_number || "",
    nocDate: r.noc_date,
    nocCollectedBy: r.noc_collected_by || "",
    nocRemarks: r.noc_remarks || "",
    foreclosureStatus: r.foreclosure_status || "None",
    foreclosureReason: r.foreclosure_reason || "",
    status: r.status || "Active",
    remarks: r.remarks || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const transformForeclosureFromDb = (r) => {
  if (!r) return null;
  return {
    id: r.id,
    sn: r.sn,
    loanId: r.loan_id,
    loanName: r.loan_name,
    bankName: r.bank_name,
    outstandingAmount: Number(r.outstanding_amount) || 0,
    requestedDate: r.requested_date,
    requestedBy: r.requested_by,
    reason: r.reason,
    remarks: r.remarks,
    status: r.status,
    settlementAmount: r.settlement_amount ? Number(r.settlement_amount) : null,
    settledDate: r.settled_date,
    settledRemarks: r.settled_remarks,
    createdAt: r.created_at,
  };
};

// ============================================================================
// DOCUMENTS API (SUPABASE BACKED)
// ============================================================================
export const documentsApi = {
  list: async () => {
    const { data, error } = await supabase
      .from("docs_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error listing documents from Supabase:", error);
      throw error;
    }
    return (data || []).map(transformDocFromDb);
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from("docs_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return transformDocFromDb(data);
  },

  create: async (data) => {
    // Process attachments upload if raw files exist
    let processedAttachments = data.attachments || [];
    let fileUrl = data.fileUrl || "";

    if (Array.isArray(processedAttachments) && processedAttachments.some((a) => a instanceof File)) {
      processedAttachments = await Promise.all(
        processedAttachments.map((f) => uploadDocFile(f, "documents"))
      );
      if (processedAttachments[0]?.url) {
        fileUrl = processedAttachments[0].url;
      }
    }

    const payload = {
      document_name: data.documentName || "",
      person_name: data.personName || data.holderName || data.name || "",
      document_type: data.documentType || "PDF (.pdf)",
      category: data.category || "Company",
      company_name: data.division || data.companyName || "NuTech Pipes",
      needs_renewal: data.needsRenewal === "Yes" || data.needsRenewal === true ? "Yes" : "No",
      renewal_date: data.renewalDate || null,
      attachments: processedAttachments,
      file_name: data.fileName || (processedAttachments.length > 0 ? processedAttachments.map((a) => a.name).join(", ") : ""),
      file_url: fileUrl,
      remarks: data.remarks || "",
    };

    const { data: inserted, error } = await supabase
      .from("docs_documents")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error creating document in Supabase:", error);
      throw error;
    }
    notifyChange("docs_documents");
    return transformDocFromDb(inserted);
  },

  update: async (id, data) => {
    const payload = {};
    if (data.documentName !== undefined) payload.document_name = data.documentName;
    if (data.personName !== undefined) payload.person_name = data.personName;
    if (data.documentType !== undefined) payload.document_type = data.documentType;
    if (data.category !== undefined) payload.category = data.category;
    if (data.division !== undefined || data.companyName !== undefined) {
      payload.company_name = data.division !== undefined ? data.division : data.companyName;
    }
    if (data.needsRenewal !== undefined) {
      payload.needs_renewal = data.needsRenewal === "Yes" || data.needsRenewal === true ? "Yes" : "No";
    }
    if (data.renewalDate !== undefined) payload.renewal_date = data.renewalDate || null;
    if (data.fileName !== undefined) payload.file_name = data.fileName;
    if (data.fileUrl !== undefined) payload.file_url = data.fileUrl;
    if (data.attachments !== undefined) payload.attachments = data.attachments;
    if (data.remarks !== undefined) payload.remarks = data.remarks;

    const { data: updated, error } = await supabase
      .from("docs_documents")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_documents");
    return transformDocFromDb(updated);
  },

  remove: async (id) => {
    const { error } = await supabase.from("docs_documents").delete().eq("id", id);
    if (error) throw error;
    notifyChange("docs_documents");
    return true;
  },

  listRenewals: async () => {
    const { data, error } = await supabase
      .from("docs_document_renewals")
      .select("*")
      .order("renewed_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(transformRenewalFromDb);
  },

  recordRenewal: async (docId, renewalData) => {
    const { data: doc, error: fetchErr } = await supabase
      .from("docs_documents")
      .select("*")
      .eq("id", docId)
      .single();
    if (fetchErr) throw fetchErr;

    // Update document record
    const docUpdate = {
      renewal_date: renewalData.newRenewalDate || doc.renewal_date,
    };
    if (renewalData.needsRenewal !== undefined) {
      docUpdate.needs_renewal = renewalData.needsRenewal;
    }
    if (renewalData.attachments && renewalData.attachments.length > 0) {
      docUpdate.attachments = [...(doc.attachments || []), ...renewalData.attachments];
      docUpdate.file_name = renewalData.attachments[0].name;
    } else if (renewalData.fileName) {
      docUpdate.file_name = renewalData.fileName;
    }

    await supabase.from("docs_documents").update(docUpdate).eq("id", docId);

    // Insert renewal history
    const renewalPayload = {
      document_id: docId,
      document_name: doc.document_name,
      category: doc.category,
      document_type: doc.document_type,
      person_name: doc.person_name,
      company_name: doc.company_name,
      previous_renewal_date: doc.renewal_date,
      new_renewal_date: renewalData.newRenewalDate,
      renew_next_period: renewalData.renewNextPeriod !== false,
      renewed_by: renewalData.renewedBy || localStorage.getItem("user-name") || "Admin",
      remarks: renewalData.remarks || "",
      cost: renewalData.cost || 0,
      receipt_number: renewalData.receiptNumber || "",
      file_name: renewalData.fileName || docUpdate.file_name || doc.file_name || "",
      attachments: renewalData.attachments || [],
    };

    const { data: inserted, error: renErr } = await supabase
      .from("docs_document_renewals")
      .insert([renewalPayload])
      .select()
      .single();

    if (renErr) throw renErr;
    notifyChange("docs_document_renewals");
    return transformRenewalFromDb(inserted);
  },

  listShares: async () => {
    const { data, error } = await supabase
      .from("docs_document_shares")
      .select("*")
      .order("shared_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(transformShareFromDb);
  },

  recordShare: async (shareData) => {
    const payload = {
      document_id: shareData.documentId,
      document_name: shareData.documentName,
      doc_sn: shareData.docSn,
      recipient_name: shareData.recipientName,
      recipient_email: shareData.recipientEmail || "",
      recipient_phone: shareData.recipientPhone || "",
      subject: shareData.subject || "",
      message: shareData.message || "",
      purpose: shareData.purpose || shareData.subject || "",
      share_method: shareData.shareMethod || "Email",
      shared_by: shareData.sharedBy || localStorage.getItem("user-name") || "Admin User",
      notes: shareData.notes || shareData.message || "",
    };

    const { data: inserted, error } = await supabase
      .from("docs_document_shares")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_document_shares");
    return transformShareFromDb(inserted);
  },
};

// ============================================================================
// SUBSCRIPTIONS API (SUPABASE BACKED)
// ============================================================================
export const subscriptionsApi = {
  list: async () => {
    const { data, error } = await supabase
      .from("docs_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error listing subscriptions from Supabase:", error);
      throw error;
    }
    return (data || []).map(transformSubFromDb);
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from("docs_subscriptions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return transformSubFromDb(data);
  },

  create: async (data) => {
    const payload = {
      subscription_name: data.subscriptionName || "",
      service_name: data.serviceName || "",
      company_name: data.division || data.companyName || "NuTech Pipes",
      subscriber_name: data.subscriberName || "",
      price: Number(data.price) || 0,
      frequency: data.frequency || "Monthly",
      purpose: data.purpose || "",
      status: "Pending",
      requested_date: data.requestedDate || new Date().toISOString().split("T")[0],
      renewal_date: data.renewalDate || null,
      payment_due_date: data.paymentDueDate || data.renewalDate || null,
      remarks: data.remarks || "",
    };

    const { data: inserted, error } = await supabase
      .from("docs_subscriptions")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_subscriptions");
    return transformSubFromDb(inserted);
  },

  update: async (id, data) => {
    const payload = {};
    if (data.subscriptionName !== undefined) payload.subscription_name = data.subscriptionName;
    if (data.serviceName !== undefined) payload.service_name = data.serviceName;
    if (data.division !== undefined || data.companyName !== undefined) {
      payload.company_name = data.division !== undefined ? data.division : data.companyName;
    }
    if (data.subscriberName !== undefined) payload.subscriber_name = data.subscriberName;
    if (data.price !== undefined) payload.price = Number(data.price) || 0;
    if (data.frequency !== undefined) payload.frequency = data.frequency;
    if (data.purpose !== undefined) payload.purpose = data.purpose;
    if (data.status !== undefined) payload.status = data.status;
    if (data.renewalDate !== undefined) payload.renewal_date = data.renewalDate;

    const { data: updated, error } = await supabase
      .from("docs_subscriptions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_subscriptions");
    return transformSubFromDb(updated);
  },

  approve: async (id, { status, approvedBy, remarks }) => {
    const payload = {
      status, // "Approved" | "Rejected"
      approved_by: approvedBy || localStorage.getItem("user-name") || "Admin",
      approval_remarks: remarks || "",
      approved_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from("docs_subscriptions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_subscriptions");
    return transformSubFromDb(updated);
  },

  pay: async (id, paymentData) => {
    const { data: sub, error: subErr } = await supabase
      .from("docs_subscriptions")
      .select("*")
      .eq("id", id)
      .single();
    if (subErr) throw subErr;

    const payDate = paymentData.paymentDate || new Date().toISOString().split("T")[0];
    await supabase
      .from("docs_subscriptions")
      .update({ status: "Paid", last_paid_date: payDate })
      .eq("id", id);

    const payPayload = {
      subscription_id: id,
      sub_sn: sub.sn,
      subscription_name: sub.subscription_name,
      company_name: sub.company_name,
      subscriber_name: sub.subscriber_name || "",
      frequency: sub.frequency || "Monthly",
      amount_paid: Number(paymentData.amountPaid) || sub.price,
      payment_date: payDate,
      payment_mode: paymentData.paymentMode || "Corporate Credit Card",
      transaction_ref: paymentData.transactionRef || "",
      recorded_by: paymentData.recordedBy || localStorage.getItem("user-name") || "Accounts Team",
      remarks: paymentData.remarks || "",
    };

    const { data: inserted, error: payErr } = await supabase
      .from("docs_sub_payments")
      .insert([payPayload])
      .select()
      .single();

    if (payErr) throw payErr;
    notifyChange("docs_sub_payments");
    return transformPaymentFromDb(inserted);
  },

  listPayments: async () => {
    const { data, error } = await supabase
      .from("docs_sub_payments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(transformPaymentFromDb);
  },

  recordRenewal: async (subId, renewalData) => {
    const { data: sub, error: fetchErr } = await supabase
      .from("docs_subscriptions")
      .select("*")
      .eq("id", subId)
      .single();
    if (fetchErr) throw fetchErr;

    const prevRenewal = sub.renewal_date;
    await supabase
      .from("docs_subscriptions")
      .update({
        renewal_date: renewalData.nextRenewalDate,
        status: "Pending",
      })
      .eq("id", subId);

    const renewalPayload = {
      subscription_id: subId,
      sub_sn: sub.sn,
      subscription_name: sub.subscription_name,
      company_name: sub.company_name,
      subscriber_name: sub.subscriber_name || "",
      frequency: sub.frequency || "Monthly",
      previous_renewal_date: prevRenewal,
      new_renewal_date: renewalData.nextRenewalDate,
      renew_price: Number(renewalData.price) || sub.price,
      renewed_by: renewalData.renewedBy || localStorage.getItem("user-name") || "Admin",
      remarks: renewalData.remarks || "",
    };

    const { data: inserted, error: renErr } = await supabase
      .from("docs_sub_renewals")
      .insert([renewalPayload])
      .select()
      .single();

    if (renErr) throw renErr;
    notifyChange("docs_sub_renewals");
    return transformSubRenewalFromDb(inserted);
  },

  listRenewals: async () => {
    const { data, error } = await supabase
      .from("docs_sub_renewals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(transformSubRenewalFromDb);
  },

  remove: async (id) => {
    const { error } = await supabase.from("docs_subscriptions").delete().eq("id", id);
    if (error) throw error;
    notifyChange("docs_subscriptions");
    return true;
  },
};

// ============================================================================
// LOANS API (SUPABASE BACKED)
// ============================================================================
export const loansApi = {
  list: async () => {
    const { data, error } = await supabase
      .from("docs_loans")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error listing loans from Supabase:", error);
      throw error;
    }
    return (data || []).map(transformLoanFromDb);
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from("docs_loans")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return transformLoanFromDb(data);
  },

  create: async (data) => {
    let fileUrl = data.fileUrl || "";
    let attachedList = data.attachments || [];

    if (data.file && (data.file instanceof File || data.file.rawFile)) {
      const fileToUpload = data.file.rawFile || data.file;
      const uploaded = await uploadDocFile(fileToUpload, "loans");
      if (uploaded?.url) {
        fileUrl = uploaded.url;
        attachedList = [uploaded];
      }
    }

    const payload = {
      loan_name: data.loanName || "",
      bank_name: data.bankName || "",
      loan_amount: Number(data.loanAmount || data.sanctionedAmount) || 0,
      interest_rate: Number(data.interestRate) || 0,
      tenure_months: Number(data.tenureMonths) || 12,
      start_date: data.startDate || null,
      maturity_date: data.maturityDate || data.endDate || null,
      end_date: data.endDate || data.maturityDate || null,
      emi_amount: Number(data.emiAmount) || 0,
      outstanding_amount: Number(data.outstandingAmount) || Number(data.loanAmount) || 0,
      account_number: data.accountNumber || "",
      purpose: data.purpose || "",
      collateral_document: data.collateralDocument || "",
      file_name: data.fileName || "",
      file_url: fileUrl,
      attachments: attachedList,
      collect_noc_status: "Pending",
      foreclosure_status: "None",
      status: "Active",
      remarks: data.remarks || "",
    };

    const { data: inserted, error } = await supabase
      .from("docs_loans")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_loans");
    return transformLoanFromDb(inserted);
  },

  update: async (id, data) => {
    const payload = {};
    if (data.loanName !== undefined) payload.loan_name = data.loanName;
    if (data.bankName !== undefined) payload.bank_name = data.bankName;
    if (data.loanAmount !== undefined) payload.loan_amount = Number(data.loanAmount);
    if (data.interestRate !== undefined) payload.interest_rate = Number(data.interestRate);
    if (data.tenureMonths !== undefined) payload.tenure_months = Number(data.tenureMonths);
    if (data.emiAmount !== undefined) payload.emi_amount = Number(data.emiAmount);
    if (data.outstandingAmount !== undefined) payload.outstanding_amount = Number(data.outstandingAmount);
    if (data.status !== undefined) payload.status = data.status;

    const { data: updated, error } = await supabase
      .from("docs_loans")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_loans");
    return transformLoanFromDb(updated);
  },

  foreclosureRequest: async (loanId, requestData) => {
    const { data: loan, error: loanErr } = await supabase
      .from("docs_loans")
      .select("*")
      .eq("id", loanId)
      .single();
    if (loanErr) throw loanErr;

    await supabase
      .from("docs_loans")
      .update({
        foreclosure_status: "Requested",
        foreclosure_reason: requestData.reason || "",
      })
      .eq("id", loanId);

    const fcPayload = {
      loan_id: loanId,
      loan_name: loan.loan_name,
      bank_name: loan.bank_name,
      outstanding_amount: loan.outstanding_amount,
      requested_date: new Date().toISOString().split("T")[0],
      requested_by: requestData.requestedBy || localStorage.getItem("user-name") || "Finance Head",
      reason: requestData.reason || "",
      remarks: requestData.remarks || "",
      status: "Pending",
    };

    const { data: inserted, error: fcErr } = await supabase
      .from("docs_loan_foreclosures")
      .insert([fcPayload])
      .select()
      .single();

    if (fcErr) throw fcErr;
    notifyChange("docs_loan_foreclosures");
    return transformForeclosureFromDb(inserted);
  },

  foreclosureApproveOrSettle: async (foreclosureId, { action, settlementAmount, remarks }) => {
    const { data: fc, error: fcFetchErr } = await supabase
      .from("docs_loan_foreclosures")
      .select("*")
      .eq("id", foreclosureId)
      .single();
    if (fcFetchErr) throw fcFetchErr;

    const nextStatus = action === "settle" ? "Settled" : "Approved";
    const fcUpdate = {
      status: nextStatus,
      settlement_amount: settlementAmount ? Number(settlementAmount) : fc.outstanding_amount,
      settled_date: new Date().toISOString().split("T")[0],
      settled_remarks: remarks || "",
    };

    const { data: updatedFc, error: fcUpErr } = await supabase
      .from("docs_loan_foreclosures")
      .update(fcUpdate)
      .eq("id", foreclosureId)
      .select()
      .single();
    if (fcUpErr) throw fcUpErr;

    const loanUpdate = {
      foreclosure_status: nextStatus,
    };
    if (action === "settle") {
      loanUpdate.outstanding_amount = 0;
      loanUpdate.status = "Closed";
    }

    await supabase.from("docs_loans").update(loanUpdate).eq("id", fc.loan_id);

    notifyChange("docs_loan_foreclosures");
    return transformForeclosureFromDb(updatedFc);
  },

  listForeclosures: async () => {
    const { data, error } = await supabase
      .from("docs_loan_foreclosures")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(transformForeclosureFromDb);
  },

  collectNoc: async (loanId, nocData) => {
    const payload = {
      collect_noc_status: "Yes",
      noc_number: nocData.nocNumber || "",
      noc_date: nocData.nocDate || new Date().toISOString().split("T")[0],
      noc_collected_by: nocData.nocCollectedBy || localStorage.getItem("user-name") || "Admin",
      noc_remarks: nocData.remarks || "",
    };

    const { data: updated, error } = await supabase
      .from("docs_loans")
      .update(payload)
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;
    notifyChange("docs_loans");
    return transformLoanFromDb(updated);
  },

  remove: async (id) => {
    const { error } = await supabase.from("docs_loans").delete().eq("id", id);
    if (error) throw error;
    notifyChange("docs_loans");
    return true;
  },
};

// ============================================================================
// SIDEBAR BADGE COUNTS HELPER
// ============================================================================
/**
 * Pending raw rows per Docs & Subscriptions stage. Shared by sidebar badges and the PC Dashboard.
 */
export const fetchDocsPendingItems = async () => {
  const [docsRes, subsRes, loansRes, fcRes] = await Promise.all([
    supabase.from("docs_documents").select("*"),
    supabase.from("docs_subscriptions").select("*"),
    supabase.from("docs_loans").select("*"),
    supabase.from("docs_loan_foreclosures").select("*"),
  ]);

  const docs = docsRes.data || [];
  const subs = subsRes.data || [];
  const loans = loansRes.data || [];
  const foreclosures = fcRes.data || [];

  return {
    documentRenewal: docs.filter((d) => d.needs_renewal === "Yes"),
    subscriptionApproval: subs.filter((s) => s.status === "Pending"),
    subscriptionPayment: subs.filter((s) => s.status === "Approved"),
    subscriptionRenewal: subs.filter((s) => s.status !== "Rejected"),
    loanForeclosure: foreclosures.filter((f) => f.status !== "Settled"),
    loanNoc: loans.filter((l) => l.collect_noc_status !== "Yes"),
  };
};

export const fetchDocsSidebarBadgeCounts = async () => {
  try {
    const stages = await fetchDocsPendingItems();
    const documentRenewal = stages.documentRenewal.length;
    const subscriptionApproval = stages.subscriptionApproval.length;
    const subscriptionPayment = stages.subscriptionPayment.length;
    const subscriptionRenewal = stages.subscriptionRenewal.length;
    const loanForeclosure = stages.loanForeclosure.length;
    const loanNoc = stages.loanNoc.length;

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
