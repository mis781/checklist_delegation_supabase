import supabase from "../../../SupabaseClient";
import { sendSalesPersonLeadSummaryNotification } from "../../../services/whatsappService";
import { createReceivedOrder } from "../../orderDelivery/services/o2dApi";
import {
    determinePriority,
    parseFlexibleDate,
    matchesExtraFilters,
    dedupeQuotationsByLead,
    generateDefaultQuotationNumber
} from "../utils/leadHelpers";

// Static Indian states list
export const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
    "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. FILE UPLOAD (Supabase Storage)
// ─────────────────────────────────────────────────────────────────────────────

export const uploadAttachment = async (fileOrData, folder = "attachments") => {
    if (!fileOrData) return "";
    if (typeof fileOrData === "string" && (fileOrData.startsWith("http://") || fileOrData.startsWith("https://"))) {
        return fileOrData;
    }

    try {
        let file = fileOrData;
        let fileName = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let detectedContentType = undefined;

        if (typeof fileOrData === "string" && fileOrData.startsWith("data:")) {
            const commaIdx = fileOrData.indexOf(",");
            const meta = commaIdx !== -1 ? fileOrData.substring(0, commaIdx) : "";
            const base64Content = commaIdx !== -1 ? fileOrData.substring(commaIdx + 1) : "";

            const mimeMatch = meta.match(/data:([^;]+)/);
            const rawMime = mimeMatch ? mimeMatch[1].trim() : "application/octet-stream";
            detectedContentType = rawMime;

            const ext = rawMime.includes("pdf")
                ? "pdf"
                : rawMime.includes("png")
                    ? "png"
                    : rawMime.includes("jpeg") || rawMime.includes("jpg")
                        ? "jpg"
                        : rawMime.split("/")[1] || "bin";

            fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            file = new Blob([byteArray], { type: rawMime });
        } else if (fileOrData instanceof Blob || (typeof File !== "undefined" && fileOrData instanceof File)) {
            const ext = (fileOrData.name && fileOrData.name.split(".").pop()) || (fileOrData.type && fileOrData.type.split("/")[1]) || "bin";
            fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            detectedContentType = fileOrData.type || undefined;
        } else if (fileOrData && typeof fileOrData === "object") {
            // Non-blob plain object passed accidentally - return empty string rather than crashing
            return "";
        }

        const filePath = `${folder}/${fileName}`;
        const uploadOptions = {
            cacheControl: "3600",
            upsert: true
        };
        if (detectedContentType) {
            uploadOptions.contentType = detectedContentType;
        }

        const { error } = await supabase.storage
            .from("leads-attachments")
            .upload(filePath, file, uploadOptions);

        if (error) {
            console.warn("[leadApi] Storage upload failed:", error.message);
            if (typeof fileOrData === "string") return fileOrData;
            return "";
        }

        const { data: publicData } = supabase.storage
            .from("leads-attachments")
            .getPublicUrl(filePath);

        return publicData?.publicUrl || filePath;
    } catch (err) {
        console.warn("[leadApi] uploadAttachment caught error:", err);
        if (typeof fileOrData === "string") return fileOrData;
        return "";
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. MASTER DATA & DROPDOWNS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchUsersList = async () => {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("id, user_name, role, department, Designation, system_access, status")
            .order("user_name", { ascending: true });
        if (error) {
            console.error("[leadApi] fetchUsersList query error, attempting fallback:", error);
            const { data: fallbackData, error: fbErr } = await supabase.from("users").select("*");
            if (fbErr) throw fbErr;
            return (fallbackData || []).map(u => ({
                id: u.id,
                user_name: u.user_name || u.name || "",
                name: u.user_name || u.name || "",
                role: u.role || "user",
                department: u.department || u.Department || "",
                designation: u.Designation || u.designation || "",
                status: u.status || "active",
                system_access: u.system_access || ""
            }));
        }
        return (data || []).map(u => ({
            id: u.id,
            user_name: u.user_name || "",
            name: u.user_name || "",
            role: u.role || "user",
            department: u.department || "",
            designation: u.Designation || "",
            status: u.status || "active",
            system_access: u.system_access || ""
        }));
    } catch (err) {
        console.error("[leadApi] fetchUsersList error:", err);
        return [];
    }
};

export const fetchMasterSalespersons = async () => {
    try {
        const { data, error } = await supabase
            .from("leads_master_salespersons")
            .select("id, name, sort_order, is_active, created_at")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("[leadApi] fetchMasterSalespersons error:", err);
        return [];
    }
};

export const saveMasterSalesperson = async (name, sortOrder = 0, userId = null) => {
    const cleanName = name.trim();
    const { data, error } = await supabase
        .from("leads_master_salespersons")
        .insert({ name: cleanName, sort_order: sortOrder, is_active: true })
        .select()
        .single();
    if (error) throw error;

    try {
        let userQuery = supabase.from("users").select("id, system_access, user_name");
        if (userId) {
            userQuery = userQuery.eq("id", userId);
        } else {
            userQuery = userQuery.ilike("user_name", cleanName);
        }
        const { data: matchedUsers } = await userQuery;

        if (matchedUsers && matchedUsers.length > 0) {
            for (const targetUser of matchedUsers) {
                let currentSysAccess = targetUser.system_access || "";
                if (!currentSysAccess.toLowerCase().includes("leads")) {
                    const updatedAccess = currentSysAccess ? `${currentSysAccess}, leads` : "leads";
                    await supabase
                        .from("users")
                        .update({ system_access: updatedAccess })
                        .eq("id", targetUser.id);
                }
            }
        }
    } catch (sysErr) {
        console.warn("[leadApi] Failed to update user system_access:", sysErr);
    }

    return data;
};

export const updateMasterSalesperson = async (id, name, sortOrder = 0, isActive = true) => {
    const { data, error } = await supabase
        .from("leads_master_salespersons")
        .update({ name: name.trim(), sort_order: sortOrder, is_active: isActive })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteMasterSalesperson = async (id) => {
    const { error } = await supabase
        .from("leads_master_salespersons")
        .delete()
        .eq("id", id);
    if (error) throw error;
    return true;
};

export const fetchMasterSources = async () => {
    try {
        const { data, error } = await supabase
            .from("leads_master_sources")
            .select("id, name, sort_order, is_active, created_at")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("[leadApi] fetchMasterSources error:", err);
        return [];
    }
};

export const saveMasterSource = async (name, sortOrder = 0) => {
    const { data, error } = await supabase
        .from("leads_master_sources")
        .insert({ name: name.trim(), sort_order: sortOrder, is_active: true })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateMasterSource = async (id, name, sortOrder = 0, isActive = true) => {
    const { data, error } = await supabase
        .from("leads_master_sources")
        .update({ name: name.trim(), sort_order: sortOrder, is_active: isActive })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteMasterSource = async (id) => {
    const { error } = await supabase
        .from("leads_master_sources")
        .delete()
        .eq("id", id);
    if (error) throw error;
    return true;
};

export const fetchMasterNobs = async () => {
    try {
        const { data, error } = await supabase
            .from("leads_master_nobs")
            .select("id, name, sort_order, is_active, created_at")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("[leadApi] fetchMasterNobs error:", err);
        return [];
    }
};

export const saveMasterNob = async (name, sortOrder = 0) => {
    const { data, error } = await supabase
        .from("leads_master_nobs")
        .insert({ name: name.trim(), sort_order: sortOrder, is_active: true })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateMasterNob = async (id, name, sortOrder = 0, isActive = true) => {
    const { data, error } = await supabase
        .from("leads_master_nobs")
        .update({ name: name.trim(), sort_order: sortOrder, is_active: isActive })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteMasterNob = async (id) => {
    const { error } = await supabase
        .from("leads_master_nobs")
        .delete()
        .eq("id", id);
    if (error) throw error;
    return true;
};

export const fetchLiveDivisions = async () => {
    try {
        const { data, error } = await supabase
            .from("divisions")
            .select("id, name")
            .order("name", { ascending: true });
        if (error) throw error;
        return (data || []).map((d) => d.name).filter(Boolean);
    } catch (err) {
        console.error("[leadApi] fetchLiveDivisions error:", err);
        return ["Nutech Composites", "NuTech Pipes", "Protech Max"];
    }
};

export const fetchLiveUOMs = async () => {
    try {
        const { data, error } = await supabase
            .from("inventory_units")
            .select("unit")
            .order("unit", { ascending: true });
        if (error) throw error;
        return (data || []).map((d) => d.unit).filter(Boolean);
    } catch (err) {
        console.error("[leadApi] fetchLiveUOMs error:", err);
        return ["Nos", "Kg", "Mtr", "Pkt", "Set", "Bag", "Ltr", "Box", "Roll"];
    }
};

export const fetchInventoryItems = async (searchTerm = "") => {
    try {
        let query = supabase
            .from("inventory_master_material")
            .select("id, name, sku, hsn_code, category, sub_category")
            .limit(20);

        if (searchTerm && searchTerm.trim()) {
            query = query.ilike("name", `%${searchTerm.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("[leadApi] fetchInventoryItems error:", err);
        return [];
    }
};

export const fetchFinishedGoodsMaterials = async () => {
    try {
        const [masterRes, invRes] = await Promise.allSettled([
            supabase
                .from("inventory_master_material")
                .select("id, name, sku, category, sub_category, division, hsn_code, status")
                .eq("material_type", "FG")
                .order("name", { ascending: true }),
            supabase
                .from("inventory_materials")
                .select("id, name, sku, category, unit, hsn_code, status")
                .eq("material_type", "FG")
        ]);

        const masterData = masterRes.status === "fulfilled" && !masterRes.value.error ? (masterRes.value.data || []) : [];
        const invData = invRes.status === "fulfilled" && !invRes.value.error ? (invRes.value.data || []) : [];

        // Build quick lookup for unit and HSN from inventory_materials
        const unitMap = {};
        const hsnMap = {};
        invData.forEach(m => {
            if (m.name) {
                const kName = m.name.trim().toLowerCase();
                if (m.unit && !unitMap[kName]) unitMap[kName] = m.unit;
                if (m.hsn_code && !hsnMap[kName]) hsnMap[kName] = m.hsn_code;
            }
            if (m.sku) {
                const kSku = m.sku.trim().toLowerCase();
                if (m.unit && !unitMap[kSku]) unitMap[kSku] = m.unit;
                if (m.hsn_code && !hsnMap[kSku]) hsnMap[kSku] = m.hsn_code;
            }
        });
        masterData.forEach(m => {
            if (m.name && m.hsn_code) {
                const kName = m.name.trim().toLowerCase();
                if (!hsnMap[kName]) hsnMap[kName] = m.hsn_code;
            }
            if (m.sku && m.hsn_code) {
                const kSku = m.sku.trim().toLowerCase();
                if (!hsnMap[kSku]) hsnMap[kSku] = m.hsn_code;
            }
        });

        // Collect all FG materials with their SKU
        const items = [];
        const seen = new Set();

        const addMaterial = (m, defaultUnit = "NOS") => {
            if (!m.name || (m.status && m.status.toLowerCase() === "inactive")) return;
            const name = m.name.trim();
            const sku = (m.sku || "").trim();
            const key = `${name.toLowerCase()}:::${sku.toLowerCase()}`;
            if (seen.has(key)) return;
            seen.add(key);

            const nameKey = name.toLowerCase();
            const skuKey = sku.toLowerCase();
            const hsn = m.hsn_code || hsnMap[skuKey] || hsnMap[nameKey] || "";
            const uom = m.unit || unitMap[skuKey] || unitMap[nameKey] || defaultUnit;
            const displayName = sku && sku.toLowerCase() !== name.toLowerCase()
                ? `${name} — ${sku}`
                : name;

            items.push({
                id: m.id,
                name,
                sku,
                displayName,
                category: m.category || "Finished Goods",
                division: m.division || "",
                hsn,
                uom
            });
        };

        masterData.forEach(m => addMaterial(m, "NOS"));
        invData.forEach(m => addMaterial(m, m.unit || "NOS"));

        items.sort((a, b) => {
            const cmp = a.name.localeCompare(b.name);
            if (cmp !== 0) return cmp;
            return (a.sku || "").localeCompare(b.sku || "");
        });

        return items;
    } catch (err) {
        console.error("[leadApi] fetchFinishedGoodsMaterials error:", err);
        return [];
    }
};

export const fetchDropdowns = async () => {
    try {
        const [salesRes, sourcesRes, nobsRes, divsRes, uomsRes] = await Promise.allSettled([
            fetchMasterSalespersons(),
            fetchMasterSources(),
            fetchMasterNobs(),
            fetchLiveDivisions(),
            fetchLiveUOMs()
        ]);

        const salespersons = salesRes.status === "fulfilled" && salesRes.value.length > 0
            ? salesRes.value.filter(s => s.is_active !== false).map(s => s.name)
            : ["Shadab", "Sajit", "Musaib", "Faizan"];

        const sources = sourcesRes.status === "fulfilled" && sourcesRes.value.length > 0
            ? sourcesRes.value.filter(s => s.is_active !== false).map(s => s.name)
            : ["Indiamart", "Justdial", "Social Media", "Website", "Referral", "Other"];

        const nobs = nobsRes.status === "fulfilled" && nobsRes.value.length > 0
            ? nobsRes.value.filter(s => s.is_active !== false).map(s => s.name)
            : ["Manufacturing", "Trading", "Service", "Retail", "OEM"];

        const divisions = divsRes.status === "fulfilled" && divsRes.value.length > 0
            ? divsRes.value
            : ["Nutech Composites", "NuTech Pipes", "Protech Max"];

        const uoms = uomsRes.status === "fulfilled" && uomsRes.value.length > 0
            ? uomsRes.value
            : ["Nos", "Kg", "Mtr", "Pkt", "Set", "Bag", "Ltr", "Box", "Roll"];

        return {
            receivers: salespersons,
            sources,
            nobs,
            divisions,
            uoms,
            states: INDIAN_STATES,
            designations: ["Manager", "Director", "CEO", "CFO", "Proprietor", "Purchase Manager"],
            statuses: ["hot", "warm", "cold"],
            feedbacks: ["Interested", "Not Interested", "Asked for Quotation", "Callback Later", "Busy", "Wrong Number"],
            creditDays: ["7 days", "15 days", "30 days", "45 days", "60 days"],
            creditLimits: ["₹50,000", "₹100,000", "₹500,000", "₹1,000,000"]
        };
    } catch (err) {
        console.error("[leadApi] fetchDropdowns error:", err);
        return {
            receivers: ["Shadab", "Sajit", "Musaib", "Faizan"],
            sources: ["Indiamart", "Justdial", "Social Media", "Website", "Referral", "Other"],
            nobs: ["Manufacturing", "Trading", "Service", "Retail", "OEM"],
            divisions: ["Nutech Composites", "NuTech Pipes", "Protech Max"],
            states: INDIAN_STATES
        };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPANIES & CONTACTS MASTER
// ─────────────────────────────────────────────────────────────────────────────

export const fetchCompanies = async () => {
    try {
        const { data, error } = await supabase
            .from("leads_companies")
            .select("*, leads_company_contacts(*)")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            timestamp: c.created_at || c.updated_at || null,
            createdAt: c.created_at || null,
            vnNo: c.vn_no,
            name: c.name,
            gst: c.gst || "",
            email: c.email || "",
            phone: c.phone || "",
            phoneNumber: c.phone || "",
            state: c.state || "",
            consignorState: c.state || "",
            city: c.city || "",
            location: c.city || "",
            nob: c.nob || "",
            division: c.division || "",
            address: c.address || "",
            consignorAddress: c.address || "",
            consignorGSTIN: c.gst || "",
            proof: c.proof_url || "",
            contactPersons: (c.leads_company_contacts || []).map(cp => ({
                name: cp.name || "",
                designation: cp.designation || "",
                number: cp.number || ""
            })),
            salesPerson: c.leads_company_contacts?.[0]?.name || ""
        }));
    } catch (err) {
        console.error("[leadApi] fetchCompanies error:", err);
        return [];
    }
};

export const saveCompany = async (companyData) => {
    try {
        let proofUrl = companyData.proof || companyData.proofUrl || "";
        if (proofUrl && typeof proofUrl === "string" && proofUrl.startsWith("data:")) {
            proofUrl = await uploadAttachment(proofUrl, "company-proofs");
        }

        const name = (companyData.name || "").trim();
        if (!name) throw new Error("Company name is required");

        // Check if company already exists (case-insensitive)
        const { data: existing } = await supabase
            .from("leads_companies")
            .select("id, vn_no")
            .ilike("name", name)
            .maybeSingle();

        let companyId = existing?.id;
        let vnNo = existing?.vn_no;

        const payload = {
            name,
            gst: companyData.gst || companyData.consignorGSTIN || null,
            email: companyData.email || null,
            phone: companyData.phone || companyData.phoneNumber || null,
            address: companyData.address || companyData.consignorAddress || null,
            state: companyData.state || companyData.consignorState || null,
            city: companyData.city || companyData.location || null,
            nob: companyData.nob || null,
            division: companyData.division || null,
            proof_url: proofUrl || null,
            is_active: true
        };

        if (companyId) {
            payload.updated_at = new Date().toISOString();
            const { error: updateErr } = await supabase
                .from("leads_companies")
                .update(payload)
                .eq("id", companyId);
            if (updateErr) throw updateErr;
        } else {
            if (companyData.vnNo) payload.vn_no = companyData.vnNo;
            const { data: inserted, error: insertErr } = await supabase
                .from("leads_companies")
                .insert(payload)
                .select("id, vn_no, created_at")
                .single();
            if (insertErr) throw insertErr;
            companyId = inserted.id;
            vnNo = inserted.vn_no;
            companyData.timestamp = inserted.created_at;
            companyData.createdAt = inserted.created_at;
        }

        // Sync contact persons if provided
        const contacts = Array.isArray(companyData.contactPersons) ? companyData.contactPersons : [];
        if (contacts.length > 0) {
            await supabase
                .from("leads_company_contacts")
                .delete()
                .eq("company_id", companyId);

            const contactsToInsert = contacts
                .filter(c => c && (c.name || c.number))
                .map(c => ({
                    company_id: companyId,
                    name: c.name || "",
                    designation: c.designation || "",
                    number: c.number || ""
                }));

            if (contactsToInsert.length > 0) {
                await supabase
                    .from("leads_company_contacts")
                    .insert(contactsToInsert);
            }
        }

        return { success: true, id: companyId, vnNo };
    } catch (err) {
        console.error("[leadApi] saveCompany error:", err);
        throw err;
    }
};

export const deleteCompany = async (id) => {
    try {
        const { error } = await supabase
            .from("leads_companies")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("[leadApi] deleteCompany error:", err);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. LEADS REGISTER
// ─────────────────────────────────────────────────────────────────────────────

export const generateLeadNumber = async () => {
    try {
        const { data, error } = await supabase
            .from("leads")
            .select("lead_number")
            .order("id", { ascending: false })
            .limit(1);

        if (error) throw error;

        let maxSeq = 0;
        if (data && data.length > 0 && data[0].lead_number) {
            const match = data[0].lead_number.match(/^LD-(\d+)$/i);
            if (match) maxSeq = parseInt(match[1], 10);
        }

        return `LD-${String(maxSeq + 1).padStart(3, "0")}`;
    } catch (err) {
        console.error("[leadApi] generateLeadNumber error:", err);
        return `LD-${Date.now().toString().slice(-3)}`;
    }
};

export const fetchLeadByNumber = async (leadNo) => {
    if (!leadNo) return { success: false };
    try {
        const { data, error } = await supabase
            .from("leads")
            .select("*, leads_contact_persons(*)")
            .eq("lead_number", leadNo)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { success: false };

        return {
            success: true,
            lead: {
                leadNumber: data.lead_number,
                companyName: data.company_name,
                receiverName: data.receiver_name,
                source: data.source,
                leadType: data.lead_type,
                salesType: data.sales_type,
                interaction: data.interaction,
                phoneNumber: data.phone_number,
                salespersonName: data.salesperson_name,
                email: data.email,
                state: data.state || "",
                city: data.city || "",
                address: data.address || "",
                nob: data.nob || "",
                division: data.division || "",
                gst: data.gst || "",
                creditAccess: data.credit_access || "",
                creditDays: data.credit_days || "",
                creditLimit: data.credit_limit || "",
                notes: data.notes || "",
                attachment: data.attachment_url || "",
                attachmentLocation: data.attachment_location || null,
                status: data.status,
                contactPersons: (data.leads_contact_persons || []).map(cp => ({
                    name: cp.name,
                    designation: cp.designation,
                    number: cp.number
                }))
            }
        };
    } catch (err) {
        console.error("[leadApi] fetchLeadByNumber error:", err);
        return { success: false };
    }
};

export const submitLead = async (leadData) => {
    try {
        let attachmentUrl = leadData.attachment || leadData.attachmentUrl || "";
        if (attachmentUrl && typeof attachmentUrl === "string" && attachmentUrl.startsWith("data:")) {
            attachmentUrl = await uploadAttachment(attachmentUrl, "lead-attachments");
        }

        const leadNumber = leadData.leadNumber || await generateLeadNumber();

        const primaryContact = Array.isArray(leadData.contactPersons) && leadData.contactPersons.length > 0
            ? leadData.contactPersons.find(cp => cp && (cp.number || cp.name)) || {}
            : {};

        const companyName = (leadData.companyName || leadData.company || "").trim();
        let companyId = leadData.companyId || leadData.company_id || null;

        // If salesType is "New Customer" (or new company name provided), register company in leads_companies
        if (companyName) {
            try {
                if (leadData.salesType === "New Customer") {
                    const companySaveRes = await saveCompany({
                        name: companyName,
                        gst: leadData.gst || leadData.gstin || "",
                        email: leadData.email || "",
                        phone: leadData.phoneNumber || leadData.phone || primaryContact.number || "",
                        address: leadData.address || leadData.consignorAddress || "",
                        state: leadData.state || leadData.consignorState || "",
                        city: leadData.city || leadData.location || "",
                        nob: leadData.nob || "",
                        division: leadData.division || "",
                        contactPersons: leadData.contactPersons || [],
                        proof: attachmentUrl || ""
                    });
                    if (companySaveRes?.id) {
                        companyId = companySaveRes.id;
                    }
                } else if (!companyId) {
                    const { data: existingComp } = await supabase
                        .from("leads_companies")
                        .select("id")
                        .ilike("name", companyName)
                        .maybeSingle();
                    if (existingComp?.id) {
                        companyId = existingComp.id;
                    }
                }
            } catch (cErr) {
                console.warn("[leadApi] submitLead company sync warning:", cErr);
            }
        }

        const leadPayload = {
            lead_number: leadNumber,
            receiver_name: leadData.receiverName || leadData.receiver || null,
            sales_type: leadData.salesType || null,
            source: leadData.source || leadData.leadSource || null,
            lead_type: leadData.leadType || null,
            interaction: leadData.interaction || "Call",
            company_name: companyName || null,
            company_id: companyId || null,
            phone_number: leadData.phoneNumber || leadData.phone || primaryContact.number || null,
            salesperson_name: leadData.salespersonName || leadData.personName || primaryContact.name || null,
            email: leadData.email || null,
            state: leadData.state || leadData.consignorState || null,
            city: leadData.city || leadData.location || null,
            address: leadData.address || leadData.consignorAddress || null,
            nob: leadData.nob || null,
            division: leadData.division || null,
            notes: leadData.notes || null,
            gst: leadData.gst || leadData.gstin || null,
            credit_access: leadData.creditAccess || null,
            credit_days: leadData.creditDays || null,
            credit_limit: leadData.creditLimit || null,
            attachment_url: attachmentUrl || null,
            attachment_location: leadData.attachmentLocation || null,
            status: "pending",
            assigned_to: leadData.assignedTo || leadData.receiverName || leadData.receiver || "Shadab"
        };

        const { data: insertedLead, error: leadErr } = await supabase
            .from("leads")
            .insert(leadPayload)
            .select("id, lead_number")
            .single();

        if (leadErr) throw leadErr;

        const contactPersons = Array.isArray(leadData.contactPersons) ? leadData.contactPersons : [];
        if (contactPersons.length > 0) {
            const contactsPayload = contactPersons
                .filter(cp => cp && (cp.name || cp.number))
                .map(cp => ({
                    lead_id: insertedLead.id,
                    name: cp.name || "",
                    designation: cp.designation || "",
                    number: cp.number || ""
                }));

            if (contactsPayload.length > 0) {
                await supabase.from("leads_contact_persons").insert(contactsPayload);
            }
        }

        return { success: true, leadNumber: insertedLead.lead_number, companyId };
    } catch (err) {
        console.error("[leadApi] submitLead error:", err);
        throw err;
    }
};

export const createEnquiryLead = async (company, receiverName, leadNumber) => {
    try {
        const leadNo = leadNumber || await generateLeadNumber();
        const primaryContact = company.contactPersons?.[0] || {};

        let proofUrl = company.proof || "";
        if (proofUrl && typeof proofUrl === "string" && proofUrl.startsWith("data:")) {
            proofUrl = await uploadAttachment(proofUrl, "lead-attachments");
        }

        const leadPayload = {
            lead_number: leadNo,
            receiver_name: receiverName || "System",
            source: "Company Master",
            lead_type: "Incoming",
            sales_type: "Existing Customer",
            interaction: "Call",
            company_name: company.name || "",
            phone_number: company.phone || primaryContact.number || "",
            salesperson_name: primaryContact.name || company.salesPerson || "",
            email: company.email || "",
            state: company.state || "",
            city: company.city || "",
            address: company.address || "",
            nob: company.nob || "",
            division: company.division || "",
            notes: "Enquiry raised directly from Company Master.",
            gst: company.gst || "",
            attachment_url: proofUrl || null,
            status: "pending",
            assigned_to: receiverName || "System"
        };

        const { data: inserted, error: leadErr } = await supabase
            .from("leads")
            .insert(leadPayload)
            .select("id, lead_number")
            .single();

        if (leadErr) throw leadErr;

        const contacts = Array.isArray(company.contactPersons) ? company.contactPersons : [];
        if (contacts.length > 0) {
            const contactsPayload = contacts
                .filter(c => c && (c.name || c.number))
                .map(c => ({
                    lead_id: inserted.id,
                    name: c.name || "",
                    designation: c.designation || "",
                    number: c.number || ""
                }));

            if (contactsPayload.length > 0) {
                await supabase.from("leads_contact_persons").insert(contactsPayload);
            }
        }

        return { success: true, leadNumber: inserted.lead_number };
    } catch (err) {
        console.error("[leadApi] createEnquiryLead error:", err);
        throw err;
    }
};

export const updateLead = async (leadIdOrNumber, fields = {}) => {
    try {
        const updatePayload = {
            ...fields,
            updated_at: new Date().toISOString()
        };

        let query = supabase.from("leads").update(updatePayload);
        if (typeof leadIdOrNumber === "number" || /^\d+$/.test(String(leadIdOrNumber))) {
            query = query.eq("id", Number(leadIdOrNumber));
        } else {
            query = query.eq("lead_number", String(leadIdOrNumber));
        }

        const { data, error } = await query.select();
        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error("[leadApi] updateLead error:", err);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. FOLLOW-UPS & DRAFTS
// ─────────────────────────────────────────────────────────────────────────────

export const getFollowUpDraft = async (leadNo) => {
    if (!leadNo) return null;
    try {
        const { data, error } = await supabase
            .from("leads_followup_drafts")
            .select("draft_data")
            .eq("lead_number", leadNo)
            .maybeSingle();

        if (error) throw error;
        return data ? data.draft_data : null;
    } catch (err) {
        console.error("[leadApi] getFollowUpDraft error:", err);
        return null;
    }
};

export const saveFollowUpDraft = async (leadNo, draftData) => {
    if (!leadNo) return { success: false };
    try {
        const { error } = await supabase
            .from("leads_followup_drafts")
            .upsert(
                {
                    lead_number: leadNo,
                    draft_data: draftData,
                    saved_by: draftData.assignedTo || "System",
                    updated_at: new Date().toISOString()
                },
                { onConflict: "lead_number" }
            );

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("[leadApi] saveFollowUpDraft error:", err);
        return { success: false, error: err.message };
    }
};

export const clearFollowUpDraft = async (leadNo) => {
    if (!leadNo) return { success: true };
    try {
        const { error } = await supabase
            .from("leads_followup_drafts")
            .delete()
            .eq("lead_number", leadNo);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("[leadApi] clearFollowUpDraft error:", err);
        return { success: false };
    }
};

export const fetchFollowUps = async (currentUser, isAdminFunc) => {
    try {
        const username = currentUser?.username;
        const isAdmin = typeof isAdminFunc === "function" ? isAdminFunc() : !!isAdminFunc;

        // 1. Fetch all pending leads with their contacts and latest followups
        const { data: pendingLeads, error: leadsErr } = await supabase
            .from("leads")
            .select("*, leads_contact_persons(*), leads_followups(*, leads_followup_items(*))")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (leadsErr) throw leadsErr;

        // 2. Fetch all drafts
        const { data: draftsData } = await supabase
            .from("leads_followup_drafts")
            .select("lead_number, draft_data");

        const draftsByLead = {};
        (draftsData || []).forEach(d => {
            draftsByLead[d.lead_number] = d.draft_data;
        });

        // 2.5 Fetch all leads for parent metadata lookup
        const { data: allLeadsData } = await supabase
            .from("leads")
            .select("*, leads_contact_persons(*)");

        const leadsMap = {};
        (allLeadsData || []).forEach(l => {
            if (l.lead_number) leadsMap[l.lead_number] = l;
        });

        // 3. Fetch full follow-up history
        const { data: historyData, error: histErr } = await supabase
            .from("leads_followups")
            .select("*, leads_followup_items(*)")
            .order("created_at", { ascending: true });

        if (histErr) throw histErr;

        // Compute follow-up counts and indexes per lead
        const leadSequence = {};
        const followUpCountByLead = {};
        const latestExpectedByLead = {};

        const historyWithCount = (historyData || []).map((entry, index) => {
            const leadKey = entry.lead_number || `unknown-${index}`;
            const parentLead = leadsMap[leadKey] || {};
            const primaryContact = parentLead.leads_contact_persons?.[0] || {};
            leadSequence[leadKey] = (leadSequence[leadKey] || 0) + 1;
            const followUpIndex = leadSequence[leadKey];
            followUpCountByLead[leadKey] = followUpIndex;

            if (entry.enquiry_status === "Expected") {
                latestExpectedByLead[leadKey] = entry;
            }

            const items = (entry.leads_followup_items || []).map(item => ({
                name: item.item_name || "",
                uom: item.uom || "Nos",
                quantity: item.quantity != null ? String(item.quantity) : "0"
            }));

            const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

            const dateObj = new Date(entry.created_at);
            const formattedDate = `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`;

            const leadCreatedAt = parentLead.created_at || entry.created_at;
            const leadCreatedDateFormatted = leadCreatedAt ? (() => {
                const d = new Date(leadCreatedAt);
                return isNaN(d.getTime()) ? leadCreatedAt : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
            })() : formattedDate;

            const resolvedNob = entry.nob || parentLead.nob || "";
            const resolvedState = entry.enquiry_state || parentLead.state || "";
            const resolvedDivision = entry.division || parentLead.division || "";
            const resolvedSalesType = parentLead.sales_type || "";

            return {
                id: `hist-${entry.id}`,
                timestamp: formattedDate,
                receivedDate: formattedDate,
                enquiryReceivedDate: formattedDate,
                leadNo: entry.lead_number,
                leadId: entry.lead_number,
                leadNumber: entry.lead_number,
                companyName: entry.company_name || parentLead.company_name || "",
                personName: entry.person_name || primaryContact.name || parentLead.salesperson_name || "",
                phoneNumber: primaryContact.number || parentLead.phone_number || "",
                email: parentLead.email || "",
                address: parentLead.address || "",
                gst: parentLead.gst || "",
                leadSource: parentLead.source || "",
                source: parentLead.source || "",
                leadType: parentLead.lead_type || "",
                nob: resolvedNob,
                projectName: resolvedNob, // Mapped to NOB column in table
                division: resolvedDivision,
                enquiryCity: entry.city || parentLead.city || "",
                city: entry.city || parentLead.city || "",
                customerSay: entry.customer_feedback || "",
                notInterestedReason: entry.not_interested_reason || "",
                status: entry.enquiry_status === "Expected" ? "Pending" : "Completed",
                enquiryStatus: entry.enquiry_status || "Expected",
                enquiryReceivedStatus: entry.enquiry_status || "Expected",
                state: resolvedState,
                enquiryState: resolvedState,
                salesType: resolvedSalesType,
                productDate: formattedDate,
                requiredProductDate: formattedDate,
                projectValue: totalQty > 0 ? `${totalQty} units` : "-",
                projectApproxValue: totalQty > 0 ? `${totalQty} units` : "-",
                nextAction: entry.next_action || "-",
                nextCallDate: entry.next_call_at ? entry.next_call_at.split("T")[0] : "",
                nextCallTime: entry.next_call_at && entry.next_call_at.includes("T") ? entry.next_call_at.split("T")[1].substring(0, 5) : "",
                nextCallDateTime: entry.next_call_at || "",
                assignedTo: entry.assigned_to || parentLead.assigned_to || "",
                receiverName: entry.assigned_to || parentLead.salesperson_name || parentLead.receiver_name || "",
                interaction: entry.interaction || "Call",
                attachment: entry.attachment_url || "",
                attachmentLocation: entry.attachment_location || null,
                notes: entry.notes || "",
                contactPersons: (parentLead.leads_contact_persons || []).map(cp => ({
                    name: cp.name,
                    designation: cp.designation,
                    number: cp.number
                })),
                items,
                itemQty: JSON.stringify(items),
                // Flat item columns for table
                itemName1: items[0]?.name || "-",
                quantity1: items[0]?.quantity != null && items[0].name ? items[0].quantity : "-",
                itemName2: items[1]?.name || "-",
                quantity2: items[1]?.quantity != null && items[1].name ? items[1].quantity : "-",
                itemName3: items[2]?.name || "-",
                quantity3: items[2]?.quantity != null && items[2].name ? items[2].quantity : "-",
                itemName4: items[3]?.name || "-",
                quantity4: items[3]?.quantity != null && items[3].name ? items[3].quantity : "-",
                itemName5: items[4]?.name || "-",
                quantity5: items[4]?.quantity != null && items[4].name ? items[4].quantity : "-",
                followUpIndex,
                followUpNo: `Follow-up #${followUpIndex}`,
                createdAt: leadCreatedDateFormatted,
                created_at: entry.created_at
            };
        });

        // 4. Map Pending Leads
        const pending = (pendingLeads || [])
            .filter(lead => {
                if (isAdmin) return true;
                const assigned = (lead.assigned_to || lead.receiver_name || "").trim().toLowerCase();
                const user = (username || "").trim().toLowerCase();
                // For salesperson: only show leads explicitly assigned to them
                if (!assigned) return false;
                return assigned === user || assigned.includes(user) || user.includes(assigned);
            })
            .map(lead => {
                const draft = draftsByLead[lead.lead_number];
                const latestExpected = latestExpectedByLead[lead.lead_number];
                const contactPerson = lead.leads_contact_persons?.[0];

                const dateObj = new Date(lead.created_at);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`;

                return {
                    timestamp: formattedDate,
                    id: lead.lead_number,
                    leadId: lead.lead_number,
                    leadNo: lead.lead_number,
                    leadNumber: lead.lead_number,
                    companyName: lead.company_name || "",
                    personName: contactPerson?.name || lead.salesperson_name || "",
                    phoneNumber: contactPerson?.number || lead.phone_number || "",
                    leadSource: lead.source || "",
                    leadType: lead.lead_type || "",
                    salesType: lead.sales_type || "",
                    interaction: draft?.interaction || lead.interaction || "Call",
                    attachment: draft?.attachment || lead.attachment_url || "",
                    receiverName: lead.receiver_name || lead.assigned_to || "",
                    location: lead.city || "",
                    email: lead.email || "",
                    state: lead.state || "",
                    city: lead.city || "",
                    address: lead.address || "",
                    gst: lead.gst || "",
                    nob: lead.nob || "",
                    division: lead.division || "",
                    creditAccess: lead.credit_access || "",
                    creditDays: lead.credit_days || "",
                    creditLimit: lead.credit_limit || "",
                    contactPersons: (lead.leads_contact_persons || []).map(cp => ({
                        name: cp.name,
                        designation: cp.designation,
                        number: cp.number
                    })),
                    notes: lead.notes || "",
                    customerSay: draft?.customerFeedback || latestExpected?.customer_feedback || "",
                    enquiryStatus: draft?.enquiryStatus
                        ? (draft.enquiryStatus === "yes" ? "Make Quotation" : draft.enquiryStatus === "expected" ? "Expected" : "Not Interested")
                        : (latestExpected ? (latestExpected.enquiry_status || "Expected") : "New"),
                    createdAt: formattedDate,
                    nextAction: draft?.nextAction || latestExpected?.next_action || "",
                    nextCallDate: draft?.nextCallDate || (latestExpected?.next_call_at ? latestExpected.next_call_at.split("T")[0] : ""),
                    nextCallTime: draft?.nextCallTime || (latestExpected?.next_call_at && latestExpected.next_call_at.includes("T") ? latestExpected.next_call_at.split("T")[1].substring(0, 5) : ""),
                    nextCallDateTime: draft?.nextCallDateTime || latestExpected?.next_call_at || "",
                    priority: determinePriority(lead.source),
                    assignedTo: lead.assigned_to || lead.receiver_name || "",
                    itemQty: draft?.items ? JSON.stringify(draft.items) : "",
                    hasDraft: !!draft,
                    draftData: draft || null,
                    followUpCount: followUpCountByLead[lead.lead_number] || 0
                };
            });

        const historyFiltered = historyWithCount.filter(row => {
            if (isAdmin) return true;
            const assigned = (row.assignedTo || "").trim().toLowerCase();
            const user = (username || "").trim().toLowerCase();
            // For salesperson: only show history explicitly assigned to them
            if (!assigned) return false;
            return assigned === user || assigned.includes(user) || user.includes(assigned);
        });

        return {
            pending,
            history: historyFiltered.slice().reverse()
        };
    } catch (err) {
        console.error("[leadApi] fetchFollowUps error:", err);
        return { pending: [], history: [] };
    }
};

export const submitFollowUp = async (data) => {
    try {
        const leadNo = data.leadNo;
        if (!leadNo) throw new Error("Lead number is required");

        // Clear draft in DB
        await clearFollowUpDraft(leadNo);

        // Upload attachment if base64
        let attachmentUrl = data.attachment || "";
        if (attachmentUrl && typeof attachmentUrl === "string" && attachmentUrl.startsWith("data:")) {
            attachmentUrl = await uploadAttachment(attachmentUrl, "followup-attachments");
        }

        // Determine status
        let enquiryStatus = "Expected";
        const st = (data.enquiryStatus || "").trim().toLowerCase();
        if (st === "yes" || st === "make quotation") {
            enquiryStatus = "Make Quotation";
        } else if (st === "not-interested" || st === "not interested") {
            enquiryStatus = "Not Interested";
        } else {
            enquiryStatus = "Expected";
        }

        // Find the lead row id
        const { data: leadRow } = await supabase
            .from("leads")
            .select("id, company_name, receiver_name, assigned_to, nob, division, state, city, sales_type, address, gst, credit_access, credit_days, credit_limit")
            .eq("lead_number", leadNo)
            .maybeSingle();

        const leadId = leadRow?.id;

        // Prepare combined next_call_at timestamptz
        let nextCallAt = null;
        if (data.nextCallDateTime) {
            nextCallAt = new Date(data.nextCallDateTime).toISOString();
        } else if (data.nextCallDate) {
            const timeStr = data.nextCallTime || "10:00";
            nextCallAt = new Date(`${data.nextCallDate}T${timeStr}:00`).toISOString();
        }

        // 1. Insert into leads_followups
        const followupPayload = {
            lead_id: leadId || null,
            lead_number: leadNo,
            company_name: data.companyName || leadRow?.company_name || null,
            person_name: data.contactPerson || data.personName || null,
            interaction: data.interaction || "Call",
            customer_feedback: data.customerFeedback || null,
            enquiry_status: enquiryStatus,
            not_interested_reason: data.notInterestedReason || null,
            enquiry_state: data.enquiryState || data.state || leadRow?.state || null,
            nob: data.nob || leadRow?.nob || null,
            city: data.city || leadRow?.city || null,
            division: data.division || leadRow?.division || null,
            billing_address: data.billingAddress || leadRow?.address || null,
            shipping_address: data.shippingAddress || leadRow?.address || null,
            freight_type: data.freightType || null,
            gst: data.gst || data.gstin || leadRow?.gst || null,
            credit_access: data.creditAccess || leadRow?.credit_access || null,
            credit_days: data.creditDays || leadRow?.credit_days || null,
            credit_limit: data.creditLimit || leadRow?.credit_limit || null,
            payment_terms: data.paymentTerms || null,
            next_action: data.nextAction || null,
            next_call_at: nextCallAt,
            attachment_url: attachmentUrl || null,
            attachment_location: data.attachmentLocation || null,
            notes: data.notes || null,
            assigned_to: data.assignedTo || leadRow?.assigned_to || leadRow?.receiver_name || "Shadab"
        };

        const { data: insertedFollowup, error: fupErr } = await supabase
            .from("leads_followups")
            .insert(followupPayload)
            .select("id")
            .single();

        if (fupErr) throw fupErr;

        // 2. Insert items if any
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length > 0 && insertedFollowup?.id) {
            const itemsPayload = items
                .filter(it => it && (it.name || it.item_name || it.item))
                .map((it, idx) => ({
                    followup_id: insertedFollowup.id,
                    item_name: it.name || it.item_name || it.item,
                    hsn: it.hsn || it.hsnCode || it.hsn_code || null,
                    uom: it.uom || "Nos",
                    quantity: Number(it.quantity || it.qty || 1),
                    sort_order: idx + 1
                }));

            if (itemsPayload.length > 0) {
                await supabase.from("leads_followup_items").insert(itemsPayload);
            }
        }

        // 3. Update lead status
        let targetLeadStatus = "pending";
        if (enquiryStatus === "Make Quotation") {
            targetLeadStatus = "quotation_ready";
        } else if (enquiryStatus === "Not Interested") {
            targetLeadStatus = "resolved";
        }

        if (leadId) {
            await supabase
                .from("leads")
                .update({
                    status: targetLeadStatus,
                    updated_at: new Date().toISOString()
                })
                .eq("id", leadId);
        }

        return { success: true };
    } catch (err) {
        console.error("[leadApi] submitFollowUp error:", err);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. QUOTATIONS & PO DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchQuotationReadyLeads = async (currentUser, isAdminFunc) => {
    try {
        const username = currentUser?.username;
        const isAdmin = typeof isAdminFunc === "function" ? isAdminFunc() : !!isAdminFunc;
        const checkUserMatch = (owner) => {
            if (isAdmin || !username) return true;
            // For salesperson: only match leads explicitly assigned to them
            if (!owner) return false;
            const o = (owner || "").trim().toLowerCase();
            const u = (username || "").trim().toLowerCase();
            return o === u || o.includes(u) || u.includes(o);
        };

        // Leads with status = 'quotation_ready'
        const { data: readyLeads, error: leadsErr } = await supabase
            .from("leads")
            .select("*, leads_contact_persons(*), leads_followups(*, leads_followup_items(*))")
            .eq("status", "quotation_ready")
            .order("created_at", { ascending: false });

        if (leadsErr) throw leadsErr;

        // Existing quotations to exclude already-quoted leads
        const { data: existingQuotations } = await supabase
            .from("leads_quotations")
            .select("lead_number");

        const usedLeadNumbers = new Set((existingQuotations || []).map(q => q.lead_number).filter(Boolean));

        // Fetch inventory materials to map HSN code if missing
        const { data: invMaterials } = await supabase
            .from("inventory_master_material")
            .select("name, sku, hsn_code");

        const hsnByMaterialName = {};
        (invMaterials || []).forEach(m => {
            if (m.name && m.hsn_code) {
                hsnByMaterialName[m.name.trim().toLowerCase()] = m.hsn_code;
            }
        });

        const result = (readyLeads || [])
            .filter(lead => !usedLeadNumbers.has(lead.lead_number))
            .map(lead => {
                const latestFollowup = (lead.leads_followups || []).slice(-1)[0] || {};
                const items = (latestFollowup.leads_followup_items || []).map(it => {
                    const itemName = it.item_name || "";
                    const matchedHsn = it.hsn || hsnByMaterialName[itemName.trim().toLowerCase()] || "";
                    return {
                        name: itemName,
                        item: itemName,
                        hsn: matchedHsn,
                        hsnCode: matchedHsn,
                        hsn_code: matchedHsn,
                        uom: it.uom || "Nos",
                        quantity: it.quantity,
                        qty: it.quantity
                    };
                });

                const contactPerson = lead.leads_contact_persons?.[0];
                const salesPersonValue = latestFollowup.assigned_to || lead.receiver_name || lead.assigned_to || "";

                return {
                    leadNo: lead.lead_number,
                    companyName: latestFollowup.company_name || lead.company_name || "",
                    nob: latestFollowup.nob || lead.nob || "",
                    division: latestFollowup.division || lead.division || "",
                    state: latestFollowup.enquiry_state || lead.state || "",
                    city: latestFollowup.city || lead.city || "",
                    gstin: latestFollowup.gst || lead.gst || "",
                    gst: latestFollowup.gst || lead.gst || "",
                    billingAddress: latestFollowup.billing_address || lead.address || "",
                    shippingAddress: latestFollowup.shipping_address || lead.address || "",
                    contactName: latestFollowup.person_name || contactPerson?.name || lead.salesperson_name || "",
                    contactNo: contactPerson?.number || lead.phone_number || "",
                    salesPerson: salesPersonValue,
                    receiverName: lead.receiver_name || latestFollowup.assigned_to || "",
                    freightType: (latestFollowup.freight_type && !["new customer", "existing customer"].includes(String(latestFollowup.freight_type).trim().toLowerCase())) ? latestFollowup.freight_type : "",
                    paymentTerms: latestFollowup.payment_terms || "",
                    customPaymentTerms: "",
                    advanceAmount: "",
                    items,
                    date: lead.created_at,
                    // Next call date set on the "Make Quotation" follow-up — used as Planned Date override
                    nextCallDateTime: latestFollowup.next_call_at || "",
                    nextCallDate: latestFollowup.next_call_at ? latestFollowup.next_call_at.split("T")[0] : "",
                    nextCallTime: latestFollowup.next_call_at && latestFollowup.next_call_at.includes("T") ? latestFollowup.next_call_at.split("T")[1].substring(0, 5) : ""
                };
            })
            .filter(lead => checkUserMatch(lead.salesPerson || lead.receiverName));

        return result;
    } catch (err) {
        console.error("[leadApi] fetchQuotationReadyLeads error:", err);
        return [];
    }
};

export const getNextPoNumber = async () => {
    try {
        const now = new Date();
        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fy = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
        const prefix = `NTC/PO/${fy}/`;

        const { data, error } = await supabase
            .from("leads_quotations")
            .select("quotation_no")
            .like("quotation_no", `${prefix}%`);

        if (error) throw error;

        let maxSeq = 0;
        (data || []).forEach(q => {
            if (q.quotation_no && q.quotation_no.startsWith(prefix)) {
                const seqStr = q.quotation_no.slice(prefix.length).split("-")[0];
                const seq = parseInt(seqStr, 10);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });

        return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
    } catch (err) {
        console.error("[leadApi] getNextPoNumber error:", err);
        return generateDefaultQuotationNumber(1);
    }
};

export const fetchQuotationHistory = async () => {
    try {
        const { data, error } = await supabase
            .from("leads_quotations")
            .select("*, leads_quotation_items(*)")
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch parent leads for email and contact fallback
        let leadMap = {};
        try {
            const { data: leadsData } = await supabase
                .from("leads")
                .select("id, lead_number, email, phone_number, salesperson_name, address, city, state, leads_contact_persons(*)");
            (leadsData || []).forEach(l => {
                if (l.id) leadMap[String(l.id)] = l;
                if (l.lead_number) leadMap[String(l.lead_number).trim()] = l;
            });
        } catch (lErr) {
            console.warn("[leadApi] fetchQuotationHistory leads lookup fallback warning:", lErr);
        }

        return (data || []).map(q => {
            const parentLead = (q.lead_id && leadMap[String(q.lead_id)]) || (q.lead_number && leadMap[String(q.lead_number).trim()]) || null;
            const firstContact = parentLead?.leads_contact_persons?.[0];
            const contactPerson = q.contact_name || firstContact?.name || parentLead?.salesperson_name || "";
            const contactNumber = q.contact_no || firstContact?.number || parentLead?.phone_number || "";
            const emailAddress = q.email || parentLead?.email || "";

            return {
                id: q.id,
                quotationNo: q.quotation_no,
                poNumber: q.po_number || q.quotation_no,
                leadNo: q.lead_number || "",
                consigneeName: q.consignee_name || "",
                companyName: q.consignee_name || "",
                consigneeDivision: q.consignee_division || "",
                division: q.consignee_division || "",
                billingAddress: q.billing_address || "",
                shippingAddress: q.shipping_address || "",
                state: q.state || "",
                city: q.city || "",
                contactName: contactPerson,
                contactPerson: contactPerson,
                contactNo: contactNumber,
                phoneNumber: contactNumber,
                email: emailAddress,
                emailAddress: emailAddress,
                gst: q.gst || "",
                nob: q.nob || "",
                freightType: q.freight_type || "",
                paymentTerms: q.payment_terms || "",
                customPaymentTerms: q.custom_payment_terms || "",
                advancePayment: q.advance_payment || "No",
                advanceAmount: q.advance_amount || 0,
                basePrice: q.base_price || 0,
                gstAmount: q.gst_amount || 0,
                discountAmount: q.discount_amount || 0,
                grandTotal: q.grand_total || 0,
                preparedBy: q.prepared_by || "",
                salesPerson: q.sales_person || "",
                revisedFrom: q.revised_from || null,
                revisionNumber: q.revision_number || 0,
                pdfUrl: q.pdf_url || "",
                quotationDate: q.quotation_at ? q.quotation_at.split("T")[0] : "",
                savedAt: q.created_at,
                createdAt: q.created_at,
                terms: q.terms || [],
                items: (q.leads_quotation_items || []).map(it => ({
                    id: it.id,
                    item: it.item_name,
                    hsn: it.hsn || "",
                    qty: it.qty || 1,
                    uom: it.uom || "",
                    rate: it.rate || 0,
                    gst: it.gst_percent || 18,
                    discountPercent: it.discount_percent || 0,
                    total: it.total || 0
                }))
            };
        });
    } catch (err) {
        console.error("[leadApi] fetchQuotationHistory error:", err);
        return [];
    }
};

export const getQuotationData = async (quotationNo) => {
    if (!quotationNo) return { success: false, error: "Missing quotation number" };
    try {
        const { data, error } = await supabase
            .from("leads_quotations")
            .select("*, leads_quotation_items(*)")
            .eq("quotation_no", quotationNo)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { success: false, error: "Quotation not found" };

        let emailAddress = data.email || "";
        let contactPerson = data.contact_name || "";
        let contactNumber = data.contact_no || "";

        if (data.lead_number || data.lead_id) {
            try {
                let leadQuery = supabase.from("leads").select("email, phone_number, salesperson_name, leads_contact_persons(*)");
                if (data.lead_id) leadQuery = leadQuery.eq("id", data.lead_id);
                else leadQuery = leadQuery.eq("lead_number", data.lead_number);
                const { data: pLead } = await leadQuery.maybeSingle();
                if (pLead) {
                    const firstContact = pLead.leads_contact_persons?.[0];
                    if (!emailAddress) emailAddress = pLead.email || "";
                    if (!contactPerson) contactPerson = firstContact?.name || pLead.salesperson_name || "";
                    if (!contactNumber) contactNumber = firstContact?.number || pLead.phone_number || "";
                }
            } catch (pErr) {
                console.warn("[leadApi] getQuotationData lead fallback error:", pErr);
            }
        }

        const quotationData = {
            id: data.id,
            quotationNo: data.quotation_no,
            poNumber: data.po_number || data.quotation_no,
            leadNo: data.lead_number || "",
            consigneeName: data.consignee_name || "",
            companyName: data.consignee_name || "",
            consigneeDivision: data.consignee_division || "",
            division: data.consignee_division || "",
            billingAddress: data.billing_address || "",
            shippingAddress: data.shipping_address || "",
            state: data.state || "",
            city: data.city || "",
            contactName: contactPerson,
            contactPerson: contactPerson,
            contactNo: contactNumber,
            phoneNumber: contactNumber,
            email: emailAddress,
            emailAddress: emailAddress,
            gst: data.gst || "",
            nob: data.nob || "",
            freightType: data.freight_type || "",
            paymentTerms: data.payment_terms || "",
            customPaymentTerms: data.custom_payment_terms || "",
            advancePayment: data.advance_payment || "No",
            advanceAmount: data.advance_amount || 0,
            basePrice: data.base_price || 0,
            gstAmount: data.gst_amount || 0,
            discountAmount: data.discount_amount || 0,
            grandTotal: data.grand_total || 0,
            preparedBy: data.prepared_by || "",
            salesPerson: data.sales_person || "",
            revisedFrom: data.revised_from || null,
            revisionNumber: data.revision_number || 0,
            pdfUrl: data.pdf_url || "",
            quotationDate: data.quotation_at ? data.quotation_at.split("T")[0] : "",
            savedAt: data.created_at,
            terms: data.terms || [],
            items: (data.leads_quotation_items || []).map(it => ({
                id: it.id,
                item: it.item_name,
                hsn: it.hsn || "",
                qty: it.qty || 1,
                uom: it.uom || "",
                rate: it.rate || 0,
                gst: it.gst_percent || 18,
                discountPercent: it.discount_percent || 0,
                total: it.total || 0
            }))
        };

        return { success: true, quotationData };
    } catch (err) {
        console.error("[leadApi] getQuotationData error:", err);
        return { success: false, error: err.message };
    }
};

export const saveQuotation = async (data, action = "save") => {
    if (action === "save" && !data.quotationNo) {
        return { success: false, error: "Missing quotation/PO number — please wait for it to finish generating and try again." };
    }

    try {
        let pdfUrl = data.pdfUrl || null;
        if (data.pdfDataUri && data.pdfDataUri.startsWith("data:")) {
            pdfUrl = await uploadAttachment(data.pdfDataUri, "quotations");
        }

        // Find associated lead id if any
        let leadId = null;
        if (data.leadNo) {
            const { data: leadMatch } = await supabase
                .from("leads")
                .select("id")
                .eq("lead_number", data.leadNo)
                .maybeSingle();
            leadId = leadMatch?.id || null;
        }

        let formattedTerms = [];
        if (Array.isArray(data.terms)) {
            formattedTerms = data.terms;
        } else if (typeof data.terms === "string" && data.terms.trim()) {
            try { formattedTerms = JSON.parse(data.terms); } catch { formattedTerms = [{ id: "term-1", description: data.terms }]; }
        }

        const quotationPayload = {
            lead_id: leadId,
            lead_number: data.leadNo || null,
            quotation_no: data.quotationNo,
            po_number: data.poNumber || data.quotationNo,
            quotation_at: data.quotationDate ? new Date(data.quotationDate).toISOString() : new Date().toISOString(),
            consignee_name: data.consigneeName || data.companyName || null,
            consignee_division: data.consigneeDivision || data.division || null,
            billing_address: data.billingAddress || null,
            shipping_address: data.shippingAddress || null,
            state: data.state || null,
            city: data.city || null,
            contact_name: data.contactName || null,
            contact_no: data.contactNo || null,
            gst: data.gst || null,
            nob: data.nob || null,
            freight_type: data.freightType || null,
            payment_terms: data.paymentTerms || null,
            custom_payment_terms: data.customPaymentTerms || null,
            advance_payment: data.advancePayment || "No",
            advance_amount: Number(data.advanceAmount || 0),
            base_price: Number(data.basePrice || 0),
            gst_amount: Number(data.gstAmount || 0),
            discount_amount: Number(data.discountAmount || 0),
            grand_total: Number(data.grandTotal || 0),
            prepared_by: data.preparedBy || null,
            sales_person: data.salesPerson || data.salesPersonName || data.receiverName || null,
            revised_from: data.revisedFrom || null,
            revision_number: Number(data.revisionNumber || 0),
            pdf_url: pdfUrl,
            terms: formattedTerms,
        };

        const { data: upsertedQuotation, error: qErr } = await supabase
            .from("leads_quotations")
            .upsert(quotationPayload, { onConflict: "quotation_no" })
            .select("id, quotation_no")
            .single();

        if (qErr) throw qErr;

        // Sync items
        const items = Array.isArray(data.items) ? data.items : [];
        if (upsertedQuotation?.id) {
            await supabase
                .from("leads_quotation_items")
                .delete()
                .eq("quotation_id", upsertedQuotation.id);

            const itemsPayload = items
                .filter(it => it && (it.item || it.item_name || it.name))
                .map((it, idx) => ({
                    quotation_id: upsertedQuotation.id,
                    item_name: it.item || it.item_name || it.name,
                    hsn: it.hsn || null,
                    qty: Number(it.qty || it.quantity || 1),
                    uom: it.uom || null,
                    rate: Number(it.rate || 0),
                    gst_percent: Number(it.gst || it.gst_percent || 18),
                    discount_percent: Number(it.discountPercent || it.discount_percent || 0),
                    total: Number(it.total || 0),
                    sort_order: idx + 1
                }));

            if (itemsPayload.length > 0) {
                await supabase.from("leads_quotation_items").insert(itemsPayload);
            }
        }

        return { success: true, quotationNumber: data.quotationNo };
    } catch (err) {
        console.error("[leadApi] saveQuotation error:", err);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. QUOTATION TRACKER / UPDATES
// ─────────────────────────────────────────────────────────────────────────────

export const fetchAdvancePayments = async (currentUser, isAdminFunc) => {
    try {
        const username = currentUser?.username;
        const isAdmin = typeof isAdminFunc === "function" ? isAdminFunc() : !!isAdminFunc;
        const checkUserMatch = (owner, user) => {
            if (isAdmin || !user) return true;
            // For salesperson: only match records explicitly owned by them
            if (!owner) return false;
            const o = owner.trim().toLowerCase();
            const u = user.trim().toLowerCase();
            return o === u || o.includes(u) || u.includes(o);
        };

        // 1. Fetch quotations and quotation items
        const { data: quotationsData, error: qErr } = await supabase
            .from("leads_quotations")
            .select("*, leads_quotation_items(*)")
            .order("created_at", { ascending: false });

        if (qErr) {
            console.error("[leadApi] fetchAdvancePayments quotations query error:", qErr);
            throw qErr;
        }

        // 2. Fetch quotation tracker updates
        const { data: updatesData, error: uErr } = await supabase
            .from("leads_quotation_updates")
            .select("*")
            .order("created_at", { ascending: false });

        if (uErr) {
            console.warn("[leadApi] fetchAdvancePayments updates query warning:", uErr);
        }

        // 3. Fetch parent leads for email and contact fallback
        let leadMap = {};
        try {
            const { data: leadsData, error: leadErr } = await supabase
                .from("leads")
                .select("id, lead_number, email, phone_number, salesperson_name, address, city, state, leads_contact_persons(*)");
            if (leadErr) {
                console.warn("[leadApi] fetchAdvancePayments leads query warning:", leadErr);
            }
            (leadsData || []).forEach(l => {
                if (l.id) leadMap[String(l.id)] = l;
                if (l.lead_number) leadMap[String(l.lead_number).trim()] = l;
            });
        } catch (leadErr) {
            console.warn("[leadApi] fetchAdvancePayments leads query fallback warning:", leadErr);
        }

        // Group updates by quotation_no & lead_number to find latest update and count total follow-ups
        const latestUpdateByQuote = {};
        const latestUpdateByLead = {};
        const followUpCountByQuote = {};
        (updatesData || []).forEach(up => {
            if (up.quotation_no) {
                if (!latestUpdateByQuote[up.quotation_no]) {
                    latestUpdateByQuote[up.quotation_no] = up;
                }
                followUpCountByQuote[up.quotation_no] = (followUpCountByQuote[up.quotation_no] || 0) + 1;
            }
            if (up.lead_number) {
                const lKey = String(up.lead_number).trim();
                if (!latestUpdateByLead[lKey]) {
                    latestUpdateByLead[lKey] = up;
                }
            }
        });

        // Build list of tracking entries
        const entries = (quotationsData || []).map(q => {
            const latestUpdate = latestUpdateByQuote[q.quotation_no] || (q.lead_number && latestUpdateByLead[String(q.lead_number).trim()]) || null;
            const currentStatus = latestUpdate ? latestUpdate.status : (q.advance_payment === "Yes" ? "Awaiting Payment" : "Hold");
            const attachmentUrl = latestUpdate?.attachment_url || "";
            const attachmentName = attachmentUrl ? decodeURIComponent(attachmentUrl.split("/").pop().split("?")[0]) : "";

            const parentLead = (q.lead_id && leadMap[String(q.lead_id)]) || (q.lead_number && leadMap[String(q.lead_number).trim()]) || null;
            const firstContact = parentLead?.leads_contact_persons?.[0];
            const contactPerson = q.contact_name || firstContact?.name || parentLead?.salesperson_name || "";
            const contactNumber = q.contact_no || firstContact?.number || parentLead?.phone_number || "";
            const emailAddress = q.email || parentLead?.email || "";
            const paymentTerms = q.payment_terms || "";
            const customPaymentTerms = q.custom_payment_terms || "";
            const billingAddress = q.billing_address || parentLead?.address || "";
            const shippingAddress = q.shipping_address || q.billing_address || parentLead?.address || "";
            const state = q.state || parentLead?.state || "";
            const city = q.city || parentLead?.city || "";
            const division = q.consignee_division || "";
            const companyName = q.consignee_name || "";

            const mappedItems = (q.leads_quotation_items || []).map((it, idx) => ({
                id: it.id || idx + 1,
                item: it.item_name || "",
                name: it.item_name || "",
                hsn: it.hsn || "",
                qty: Number(it.qty || 1),
                quantity: Number(it.qty || 1),
                uom: it.uom || "",
                rate: Number(it.rate || 0),
                discountPercent: Number(it.discount_percent || 0),
                discount_percent: Number(it.discount_percent || 0),
                gst: Number(it.gst_percent ?? 18),
                gst_percent: Number(it.gst_percent ?? 18),
                total: Number(it.total || 0),
                sort_order: it.sort_order || idx + 1
            }));

            const followUpCount = followUpCountByQuote[q.quotation_no] || 0;

            return {
                quotationNo: q.quotation_no,
                poNumber: q.po_number && q.po_number !== q.quotation_no ? q.po_number : "",
                leadNo: q.lead_number || "",
                companyName,
                consigneeName: companyName,
                division,
                consigneeDivision: division,
                nob: q.nob || "",
                salesPerson: q.sales_person || q.prepared_by || "",
                receiverName: q.sales_person || q.prepared_by || "",
                city,
                state,
                contactName: contactPerson,
                contactPerson,
                personName: contactPerson,
                contactNo: contactNumber,
                phoneNumber: contactNumber,
                phone: contactNumber,
                email: emailAddress,
                emailAddress,
                paymentTerms,
                customPaymentTerms,
                billingAddress,
                shippingAddress,
                address: billingAddress,
                gst: q.gst || "",
                gstNumber: latestUpdate?.gst_number || "",
                gstin: latestUpdate?.gst_number || "",
                date: q.quotation_at ? q.quotation_at.split("T")[0].split(" ")[0] : (q.created_at ? q.created_at.split("T")[0].split(" ")[0] : ""),
                quotationDate: q.quotation_at ? q.quotation_at.split("T")[0].split(" ")[0] : (q.created_at ? q.created_at.split("T")[0].split(" ")[0] : ""),
                freightType: q.freight_type || "",
                advancePayment: q.advance_payment || "No",
                advanceAmount: q.advance_amount || 0,
                basePrice: q.base_price || 0,
                discountAmount: q.discount_amount || 0,
                gstAmount: q.gst_amount || 0,
                grandTotal: q.grand_total || 0,
                status: currentStatus,
                followUpCount,
                nextFollowup: latestUpdate?.next_followup_at ? latestUpdate.next_followup_at.split("T")[0].split(" ")[0] : "",
                nextFollowupDate: latestUpdate?.next_followup_at ? latestUpdate.next_followup_at.split("T")[0].split(" ")[0] : "",
                customerSaid: latestUpdate?.customer_said || "",
                customerFeedback: latestUpdate?.customer_said || "",
                interactionType: latestUpdate?.interaction_type || "Call",
                remarks: latestUpdate?.remarks || "",
                attachment: attachmentUrl,
                attachmentName: attachmentName,
                attachmentLocation: null,
                pdfUrl: q.pdf_url || "",
                terms: q.terms || [],
                items: mappedItems,
                quotationData: {
                    ...q,
                    quotationNo: q.quotation_no,
                    poNumber: q.po_number && q.po_number !== q.quotation_no ? q.po_number : "",
                    leadNo: q.lead_number,
                    companyName,
                    division,
                    contactName: contactPerson,
                    contactPerson,
                    contactNo: contactNumber,
                    phoneNumber: contactNumber,
                    email: emailAddress,
                    emailAddress,
                    paymentTerms,
                    customPaymentTerms,
                    billingAddress,
                    shippingAddress,
                    state,
                    city,
                    date: q.quotation_at ? q.quotation_at.split("T")[0].split(" ")[0] : (q.created_at ? q.created_at.split("T")[0].split(" ")[0] : ""),
                    quotationDate: q.quotation_at ? q.quotation_at.split("T")[0].split(" ")[0] : (q.created_at ? q.created_at.split("T")[0].split(" ")[0] : ""),
                    gst: q.gst || "",
                    nob: q.nob || "",
                    freightType: q.freight_type || "",
                    advancePayment: q.advance_payment || "No",
                    advanceAmount: q.advance_amount || 0,
                    basePrice: q.base_price || 0,
                    gstAmount: q.gst_amount || 0,
                    discountAmount: q.discount_amount || 0,
                    grandTotal: q.grand_total || 0,
                    status: currentStatus,
                    followUpCount,
                    nextFollowup: latestUpdate?.next_followup_at ? latestUpdate.next_followup_at.split("T")[0].split(" ")[0] : "",
                    nextFollowupDate: latestUpdate?.next_followup_at ? latestUpdate.next_followup_at.split("T")[0].split(" ")[0] : "",
                    customerSaid: latestUpdate?.customer_said || "",
                    customerFeedback: latestUpdate?.customer_said || "",
                    interactionType: latestUpdate?.interaction_type || "Call",
                    remarks: latestUpdate?.remarks || "",
                    attachment: attachmentUrl,
                    attachmentName: attachmentName,
                    attachmentLocation: null,
                    terms: q.terms || [],
                    items: mappedItems
                },
                updatedAt: latestUpdate?.created_at || q.created_at
            };
        });

        // Filter pending: not terminal ('Order Received' or 'Order Not Received')
        const pendingRaw = entries.filter(e =>
            !e.status || (e.status !== "Order Received" && e.status !== "Order Not Received")
        );

        // Deduplicate to latest revision per lead for Pending
        const pending = dedupeQuotationsByLead(pendingRaw, "quotationNo");

        // Map entries by quotation number for quick lookup
        const quoteByNumber = {};
        entries.forEach(e => {
            if (e.quotationNo) quoteByNumber[e.quotationNo] = e;
        });

        // Combined history from logged updates enriched with full quotation data
        const history = (updatesData || []).map(up => {
            const parentQuote = quoteByNumber[up.quotation_no] || {};
            const followUpCount = followUpCountByQuote[up.quotation_no] || parentQuote.followUpCount || 0;
            const histAttachmentUrl = up.attachment_url || parentQuote.attachment || "";
            const histAttachmentName = histAttachmentUrl ? decodeURIComponent(histAttachmentUrl.split("/").pop().split("?")[0]) : "";

            return {
                ...parentQuote,
                id: `qth-${up.id}`,
                quotationNo: up.quotation_no,
                leadNo: up.lead_number || parentQuote.leadNo || "",
                companyName: up.company_name || parentQuote.companyName || "",
                division: up.division || parentQuote.division || "",
                nob: up.nob || parentQuote.nob || "",
                salesPerson: up.sales_person || parentQuote.salesPerson || "",
                receiverName: up.sales_person || parentQuote.receiverName || "",
                grandTotal: Number(up.grand_total || parentQuote.grandTotal || 0),
                status: up.status,
                followUpCount,
                customerSaid: up.customer_said || "",
                customerFeedback: up.customer_said || "",
                interactionType: up.interaction_type || "Call",
                attachment: histAttachmentUrl,
                attachmentName: histAttachmentName,
                attachmentLocation: null,
                nextFollowup: up.next_followup_at ? up.next_followup_at.split("T")[0].split(" ")[0] : "",
                nextFollowupDate: up.next_followup_at ? up.next_followup_at.split("T")[0].split(" ")[0] : "",
                remarks: up.remarks || "",
                reason: up.reason || "",
                advancePayment: up.advance_payment || parentQuote.advancePayment || "No",
                advanceAmount: up.advance_amount || parentQuote.advanceAmount || 0,
                poNumber: up.po_number_customer || "",
                poDate: up.po_at ? up.po_at.split("T")[0].split(" ")[0] : "",
                expectedDeliveryDate: up.expected_delivery_at ? up.expected_delivery_at.split("T")[0].split(" ")[0] : "",
                gstNumber: up.gst_number || "",
                poCopy: up.po_copy_url || "",
                poCopyName: "",
                createdAt: up.created_at,
                updatedAt: up.created_at,
                quotationData: parentQuote.quotationData ? {
                    ...parentQuote.quotationData,
                    status: up.status,
                    followUpCount,
                    customerSaid: up.customer_said || "",
                    customerFeedback: up.customer_said || "",
                    interactionType: up.interaction_type || "Call",
                    remarks: up.remarks || "",
                    attachment: histAttachmentUrl,
                    attachmentName: histAttachmentName
                } : {
                    ...parentQuote,
                    status: up.status,
                    followUpCount,
                    customerSaid: up.customer_said || "",
                    customerFeedback: up.customer_said || "",
                    interactionType: up.interaction_type || "Call",
                    remarks: up.remarks || "",
                    attachment: histAttachmentUrl,
                    attachmentName: histAttachmentName
                }
            };
        });

        const filteredPending = pending.filter(item => checkUserMatch(item.salesPerson || item.receiverName, username));
        const filteredHistory = history.filter(item => checkUserMatch(item.salesPerson || item.receiverName, username));

        return {
            pending: filteredPending,
            history: filteredHistory
        };
    } catch (err) {
        console.error("[leadApi] fetchAdvancePayments error:", err);
        return { pending: [], history: [] };
    }
};

export const submitAdvancePaymentUpdate = async (quotationNo, updateData) => {
    if (!quotationNo) return { success: false, error: "Missing quotation number" };
    try {
        let attachmentUrl = updateData.attachment || "";
        if (attachmentUrl && typeof attachmentUrl === "string" && attachmentUrl.startsWith("data:")) {
            attachmentUrl = await uploadAttachment(attachmentUrl, "tracker-attachments");
        }

        let poCopyUrl = updateData.poCopy || "";
        if (poCopyUrl && typeof poCopyUrl === "string" && poCopyUrl.startsWith("data:")) {
            poCopyUrl = await uploadAttachment(poCopyUrl, "po-copies");
        }

        // Find quotation record
        const { data: quoteMatch, error: quoteErr } = await supabase
            .from("leads_quotations")
            .select("id, lead_id, lead_number, quotation_no, consignee_name, consignee_division, billing_address, shipping_address, city, state, contact_name, contact_no, gst, nob, freight_type, payment_terms, custom_payment_terms, advance_payment, advance_amount, sales_person, prepared_by, grand_total")
            .eq("quotation_no", quotationNo)
            .maybeSingle();

        if (quoteErr) throw quoteErr;
        if (!quoteMatch) {
            throw new Error(`Quotation "${quotationNo}" not found.`);
        }

        let createdOrder = null;

        // If status is "Order Received", create Order in Order Management (O2D) first
        if (updateData.status === "Order Received") {
            const cleanPoNumber = (updateData.poNumber || "").trim();
            if (!cleanPoNumber) {
                throw new Error("PO Number is required for Order Received.");
            }

            // 1. Check duplicate PO Number in o2d_orders
            const { data: existingPO, error: checkErr } = await supabase
                .from("o2d_orders")
                .select("id, po_number")
                .eq("po_number", cleanPoNumber)
                .maybeSingle();

            if (checkErr) throw checkErr;
            if (existingPO) {
                throw new Error(`A Purchase Order with PO Number "${cleanPoNumber}" already exists in Order Management. Please use a different PO number.`);
            }

            // 2. Fetch line items with UOM from leads_quotation_items
            const { data: quotItems, error: itemsErr } = await supabase
                .from("leads_quotation_items")
                .select("*")
                .eq("quotation_id", quoteMatch.id)
                .order("sort_order", { ascending: true });

            if (itemsErr) throw itemsErr;

            // 3. Fetch lead fallback data if needed
            let leadData = null;
            if (quoteMatch.lead_id || quoteMatch.lead_number) {
                try {
                    let lQuery = supabase.from("leads").select("phone_number, address, city, state, salesperson_name");
                    if (quoteMatch.lead_id) lQuery = lQuery.eq("id", quoteMatch.lead_id);
                    else lQuery = lQuery.eq("lead_number", quoteMatch.lead_number);
                    const { data: lMatch } = await lQuery.maybeSingle();
                    leadData = lMatch;
                } catch (lErr) {
                    console.warn("[leadApi] lead lookup warning:", lErr);
                }
            }

            // 4. Build O2D Payload and create order
            const isAdv = (updateData.advancePayment || quoteMatch.advance_payment || "No") === "Yes";
            const partyPhone = quoteMatch.contact_no || leadData?.phone_number || null;
            const deliveryAddr = updateData.deliveryAddress || quoteMatch.shipping_address || quoteMatch.billing_address || [leadData?.address, leadData?.city, leadData?.state].filter(Boolean).join(", ") || null;
            const paymentTerm = updateData.paymentTerm || quoteMatch.custom_payment_terms || quoteMatch.payment_terms || (isAdv ? "Advance" : "30 Days");
            const transportingType = updateData.transportingType || quoteMatch.freight_type || "FOR";

            const o2dPayload = {
                division: updateData.division || quoteMatch.consignee_division || "Nutech Composite",
                poNumber: cleanPoNumber,
                poDate: updateData.poDate || new Date().toISOString().split("T")[0],
                partyName: updateData.companyName || quoteMatch.consignee_name || "Unknown Party",
                partyPhone: partyPhone,
                partyGst: updateData.gstNumber || null,
                deliveryAddress: deliveryAddr,
                expectedDeliveryDate: updateData.expectedDeliveryDate || null,
                transportingType: transportingType,
                paymentTerm: paymentTerm,
                advancePayment: isAdv,
                advanceAmount: isAdv ? Number(updateData.advanceAmount || quoteMatch.advance_amount || 0) : 0,
                orderReceivedBy: updateData.salesPerson || updateData.updatedBy || quoteMatch.sales_person || quoteMatch.prepared_by || leadData?.salesperson_name || "System",
                poImage: poCopyUrl || null,
                remarks: updateData.remarks || null,
                totalPoValue: Number(updateData.grandTotal || quoteMatch.grand_total || 0),
                items: (quotItems || []).map((it) => ({
                    productName: it.item_name,
                    qty: Number(it.qty || 1),
                    uom: it.uom || "",
                    priceRate: Number(it.rate || 0),
                    gstPercent: Number(it.gst_percent ?? 18),
                    totalValue: Number(it.total || 0)
                }))
            };

            createdOrder = await createReceivedOrder(o2dPayload);
            if (!createdOrder || !createdOrder.id) {
                throw new Error("Failed to create Order in Order Management system.");
            }
        }

        const payload = {
            quotation_id: quoteMatch?.id || null,
            quotation_no: quotationNo,
            lead_number: updateData.leadNo || quoteMatch?.lead_number || null,
            company_name: updateData.companyName || quoteMatch?.consignee_name || null,
            division: updateData.division || quoteMatch?.consignee_division || null,
            nob: updateData.nob || quoteMatch?.nob || null,
            sales_person: updateData.salesPerson || updateData.receiverName || quoteMatch?.sales_person || null,
            grand_total: Number(updateData.grandTotal || quoteMatch?.grand_total || 0),
            status: updateData.status,
            interaction_type: updateData.interactionType || null,
            customer_said: updateData.customerSaid || null,
            next_followup_at: updateData.nextFollowup || updateData.nextFollowupDate ? new Date(updateData.nextFollowup || updateData.nextFollowupDate).toISOString() : null,
            remarks: updateData.remarks || null,
            reason: updateData.reason || null,
            advance_payment: updateData.advancePayment || null,
            advance_amount: updateData.advanceAmount ? Number(updateData.advanceAmount) : null,
            po_number_customer: updateData.poNumber ? updateData.poNumber.trim() : null,
            po_at: updateData.poDate ? new Date(updateData.poDate).toISOString() : null,
            expected_delivery_at: updateData.expectedDeliveryDate ? new Date(updateData.expectedDeliveryDate).toISOString() : null,
            gst_number: updateData.gstNumber || null,
            po_copy_url: poCopyUrl || null,
            attachment_url: attachmentUrl || null,
            updated_by: updateData.updatedBy || "System"
        };

        const { error: insertError } = await supabase
            .from("leads_quotation_updates")
            .insert(payload);

        if (insertError) {
            // Compensating delete if update log fails
            if (createdOrder?.id) {
                try {
                    await supabase.from("o2d_order_items").delete().eq("order_id", createdOrder.id);
                    await supabase.from("o2d_orders").delete().eq("id", createdOrder.id);
                } catch (delErr) {
                    console.error("[leadApi] Compensating delete error:", delErr);
                }
            }
            throw insertError;
        }

        return { success: true, orderCreated: !!createdOrder };
    } catch (err) {
        console.error("[leadApi] submitAdvancePaymentUpdate error:", err);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. DASHBOARD METRICS & CHARTS
// ─────────────────────────────────────────────────────────────────────────────

export const fetchDashboardMetrics = async (currentUser, isAdminFunc, filters = {}) => {
    try {
        const username = currentUser?.username;
        const isAdmin = typeof isAdminFunc === "function" ? isAdminFunc() : !!isAdminFunc;
        const ownedBy = (owner) => isAdmin || owner === username;

        // 1. Leads
        const { data: leadsData } = await supabase
            .from("leads")
            .select("id, lead_number, company_name, salesperson_name, phone_number, receiver_name, assigned_to, division, status, created_at, leads_contact_persons(name, number)");

        const leads = (leadsData || [])
            .map(l => {
                const contactPerson = l.leads_contact_persons?.[0]?.name || l.salesperson_name || "";
                const contactNumber = l.leads_contact_persons?.[0]?.number || l.phone_number || "";
                const owner = l.receiver_name || l.assigned_to || "";
                return {
                    id: l.id || l.lead_number,
                    leadNo: l.lead_number,
                    companyName: l.company_name || "Unknown Company",
                    personName: contactPerson,
                    contactPerson: contactPerson,
                    phoneNumber: contactNumber,
                    salesPerson: owner || "-",
                    owner: owner,
                    division: l.division || "-",
                    date: l.created_at,
                    status: l.status === "pending" ? "Pending" : (l.status || "Active"),
                    isPending: l.status === "pending",
                    link: `/dashboard/leads/followup-tracker/new?leadId=${l.lead_number}&leadNo=${l.lead_number}`,
                    type: "Lead"
                };
            })
            .filter(l => ownedBy(l.owner) && matchesExtraFilters(l.owner, l.division, l.date, filters));

        // 2. Quotations (deduped per lead)
        const { data: quotationsData } = await supabase
            .from("leads_quotations")
            .select("id, quotation_no, lead_number, consignee_name, sales_person, prepared_by, consignee_division, grand_total, quotation_at, created_at");

        const quoteCompanyMap = {};
        (quotationsData || []).forEach(q => {
            if (q.quotation_no) {
                quoteCompanyMap[q.quotation_no] = {
                    companyName: q.consignee_name,
                    leadNo: q.lead_number,
                    grandTotal: Number(q.grand_total) || 0
                };
            }
        });

        const realQuotationsRaw = (quotationsData || []).map(q => ({
            id: q.id || q.quotation_no,
            quotationNo: q.quotation_no,
            leadNo: q.lead_number || "-",
            companyName: q.consignee_name || "Unknown Company",
            salesPerson: q.sales_person || q.prepared_by || "-",
            owner: q.sales_person || q.prepared_by || "",
            division: q.consignee_division || "-",
            date: q.quotation_at || q.created_at,
            amount: Number(q.grand_total) || 0,
            status: "Sent",
            link: `/dashboard/leads/quotation-tracker`,
            type: "Quotation"
        }));

        const dedupedQuotations = dedupeQuotationsByLead(realQuotationsRaw).filter(q =>
            ownedBy(q.owner) && matchesExtraFilters(q.owner, q.division, q.date, filters)
        );
        const totalQuotationAmount = dedupedQuotations.reduce((sum, q) => sum + q.amount, 0);

        // 3. Advance Received from tracker updates
        const { data: trackerUpdates } = await supabase
            .from("leads_quotation_updates")
            .select("id, quotation_no, sales_person, division, advance_payment, advance_amount, status, created_at");

        const advanceEntries = (trackerUpdates || [])
            .filter(u => u.advance_payment === "Yes" || u.status === "Order Received")
            .map(u => {
                const qInfo = quoteCompanyMap[u.quotation_no] || {};
                const owner = u.sales_person || "";
                return {
                    id: u.id || u.quotation_no,
                    quotationNo: u.quotation_no,
                    leadNo: qInfo.leadNo || "-",
                    companyName: qInfo.companyName || "Unknown Company",
                    salesPerson: owner || "-",
                    owner: owner,
                    division: u.division || "-",
                    date: u.created_at,
                    amount: Number(u.advance_amount) || 0,
                    status: u.status || "Advance Received",
                    link: `/dashboard/leads/quotation-tracker`,
                    type: "Advance"
                };
            })
            .filter(e => ownedBy(e.owner) && matchesExtraFilters(e.owner, e.division, e.date, filters));

        const totalAdvanceReceived = advanceEntries.reduce((sum, e) => sum + e.amount, 0);

        // 4. Orders Received
        const { data: orderUpdates } = await supabase
            .from("leads_quotation_updates")
            .select("id, quotation_no, sales_person, division, status, created_at")
            .eq("status", "Order Received");

        const orders = (orderUpdates || [])
            .map(o => {
                const qInfo = quoteCompanyMap[o.quotation_no] || {};
                const owner = o.sales_person || "";
                return {
                    id: o.id || o.quotation_no,
                    quotationNo: o.quotation_no,
                    leadNo: qInfo.leadNo || "-",
                    companyName: qInfo.companyName || "Unknown Company",
                    salesPerson: owner || "-",
                    owner: owner,
                    division: o.division || "-",
                    status: o.status || "Order Received",
                    date: o.created_at,
                    link: `/dashboard/leads/quotation-tracker`,
                    type: "Order"
                };
            })
            .filter(o => ownedBy(o.owner) && matchesExtraFilters(o.owner, o.division, o.date, filters));

        return {
            totalLeads: leads.length.toString(),
            pendingFollowups: leads.filter(l => l.isPending).length.toString(),
            quotationsSent: dedupedQuotations.length.toString(),
            quotationsTotalAmount: totalQuotationAmount,
            ordersReceived: orders.length.toString(),
            advanceReceivedCount: advanceEntries.length.toString(),
            totalAdvanceReceived,
            totalEnquiry: "0",
            pendingEnquiry: "0",
            items: {
                totalLeads: leads,
                pendingFollowups: leads.filter(l => l.isPending),
                quotationsSent: dedupedQuotations,
                ordersReceived: orders,
                advanceReceived: advanceEntries
            }
        };
    } catch (err) {
        console.error("[leadApi] fetchDashboardMetrics error:", err);
        return {
            totalLeads: "0",
            pendingFollowups: "0",
            quotationsSent: "0",
            quotationsTotalAmount: 0,
            ordersReceived: "0",
            advanceReceivedCount: "0",
            totalAdvanceReceived: 0,
            totalEnquiry: "0",
            pendingEnquiry: "0",
            items: {
                totalLeads: [],
                pendingFollowups: [],
                quotationsSent: [],
                ordersReceived: [],
                advanceReceived: []
            }
        };
    }
};

export const fetchDashboardCharts = async (currentUser, isAdminFunc, filters = {}) => {
    try {
        const username = currentUser?.username;
        const isAdmin = typeof isAdminFunc === "function" ? isAdminFunc() : !!isAdminFunc;
        const ownedBy = (owner) => isAdmin || owner === username;

        // Fetch leads
        const { data: leadsData } = await supabase
            .from("leads")
            .select("source, receiver_name, assigned_to, division, created_at");

        const leads = (leadsData || [])
            .map(l => ({
                owner: l.receiver_name || l.assigned_to || "",
                division: l.division || "",
                date: l.created_at,
                source: l.source || ""
            }))
            .filter(l => ownedBy(l.owner) && matchesExtraFilters(l.owner, l.division, l.date, filters));

        // Fetch quotations
        const { data: quotationsData } = await supabase
            .from("leads_quotations")
            .select("quotation_no, lead_number, sales_person, prepared_by, consignee_division, quotation_at, created_at");

        const rawQuotes = (quotationsData || []).map(q => ({
            owner: q.sales_person || q.prepared_by || "",
            division: q.consignee_division || "",
            date: q.quotation_at || q.created_at,
            leadNo: q.lead_number || "",
            quotationNo: q.quotation_no
        }));
        const quotations = dedupeQuotationsByLead(rawQuotes).filter(q =>
            ownedBy(q.owner) && matchesExtraFilters(q.owner, q.division, q.date, filters)
        );

        // Fetch tracker updates for advance & orders
        const { data: updatesData } = await supabase
            .from("leads_quotation_updates")
            .select("sales_person, division, status, advance_payment, created_at");

        const advanceReceived = (updatesData || []).filter(u =>
            (u.advance_payment === "Yes" || u.status === "Order Received") &&
            ownedBy(u.sales_person) &&
            matchesExtraFilters(u.sales_person, u.division, u.created_at, filters)
        );

        const orders = (updatesData || []).filter(u =>
            u.status === "Order Received" &&
            ownedBy(u.sales_person) &&
            matchesExtraFilters(u.sales_person, u.division, u.created_at, filters)
        );

        // 1. Monthly data
        const monthlyData = {};
        const bumpMonth = (dateStr, key) => {
            const date = parseFlexibleDate(dateStr);
            if (!date) return;
            const month = date.toLocaleString("en-US", { month: "short" });
            if (!monthlyData[month]) monthlyData[month] = { leads: 0, quotations: 0, orders: 0 };
            monthlyData[month][key]++;
        };

        leads.forEach(l => bumpMonth(l.date, "leads"));
        quotations.forEach(q => bumpMonth(q.date, "quotations"));
        orders.forEach(o => bumpMonth(o.created_at, "orders"));

        const leadData = Object.keys(monthlyData).map(month => ({
            month,
            leads: monthlyData[month].leads,
            quotations: monthlyData[month].quotations,
            orders: monthlyData[month].orders
        }));

        // 2. Conversion funnel
        const conversionData = [
            { name: "Leads", value: leads.length, color: "#4f46e5" },
            { name: "Quotations", value: quotations.length, color: "#8b5cf6" },
            { name: "Advance Received", value: advanceReceived.length, color: "#d946ef" },
            { name: "Orders", value: orders.length, color: "#ec4899" }
        ];

        // 3. Source distribution
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
    } catch (err) {
        console.error("[leadApi] fetchDashboardCharts error:", err);
        return { leadData: [], conversionData: [], sourceData: [] };
    }
};

export const fetchPendingTasks = async (currentUser, isAdminFunc, filters = {}) => {
    try {
        const followUpsData = await fetchFollowUps(currentUser, isAdminFunc);
        const pending = (followUpsData.pending || []).filter(task =>
            matchesExtraFilters(task.assignedTo, task.division, task.createdAt, filters)
        );

        return pending.slice(0, 5).map(task => ({
            id: task.id,
            type: "Follow-up",
            company: task.companyName,
            reference: `Lead No: ${task.id}`,
            date: task.nextCallDate || "Today",
            actionText: "Call Now",
            link: `/dashboard/leads/followup-tracker/new?leadId=${task.id}&leadNo=${task.id}`
        }));
    } catch (err) {
        console.error("[leadApi] fetchPendingTasks error:", err);
        return [];
    }
};

export const fetchLeadsSummary = async (currentUser, isAdminFunc, filters = {}) => {
    try {
        const username = currentUser?.username;
        const isAdmin = typeof isAdminFunc === "function" ? isAdminFunc() : !!isAdminFunc;
        const ownedBy = (owner) => isAdmin || !owner || owner === username;

        const followUpsRes = await fetchFollowUps(currentUser, isAdminFunc);
        const pendingFollowups = followUpsRes.pending || [];

        const advanceRes = await fetchAdvancePayments();
        const pendingQuotations = advanceRes.pending || [];

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const in7DaysDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const in7DaysStr = `${in7DaysDate.getFullYear()}-${String(in7DaysDate.getMonth() + 1).padStart(2, "0")}-${String(in7DaysDate.getDate()).padStart(2, "0")}`;

        const allItems = [];

        const toIsoDate = (val) => {
            if (!val) return "";
            if (typeof val === "string") {
                if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
                if (val.includes("/")) {
                    const parts = val.split("/");
                    if (parts.length === 3) {
                        return `${parts[2].trim()}-${parts[1].trim().padStart(2, "0")}-${parts[0].trim().padStart(2, "0")}`;
                    }
                }
            }
            try {
                const d = new Date(val);
                if (isNaN(d.getTime())) return "";
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            } catch {
                return "";
            }
        };

        pendingFollowups.forEach(item => {
            const owner = item.assignedTo || item.receiverName || "";
            const division = item.division || "";

            if (!ownedBy(owner) || !matchesExtraFilters(owner, division, item.createdAt, filters)) {
                return;
            }

            let scheduledDate = toIsoDate(item.nextCallDate || item.nextCallDateTime);
            let isNoDateScheduled = false;

            if (!scheduledDate) {
                scheduledDate = toIsoDate(item.createdAt);
                isNoDateScheduled = true;
            }

            let daysDiff = 0;
            let category = "upcoming";

            if (scheduledDate) {
                const itemDate = new Date(scheduledDate + "T00:00:00");
                const todayDate = new Date(todayStr + "T00:00:00");
                daysDiff = Math.round((itemDate - todayDate) / (1000 * 60 * 60 * 24));

                if (scheduledDate < todayStr) {
                    category = "overdue";
                } else if (scheduledDate === todayStr) {
                    category = "today";
                } else if (scheduledDate > todayStr && scheduledDate <= in7DaysStr) {
                    category = "next7days";
                } else {
                    category = "future";
                }
            }

            allItems.push({
                id: item.id || item.leadNo,
                leadNo: item.leadNo || item.id,
                companyName: item.companyName || "Unknown Company",
                personName: item.personName || "",
                phoneNumber: item.phoneNumber || "",
                salesPerson: owner || "-",
                division: division || "-",
                stage: "Follow-up Tracker",
                status: item.enquiryStatus || "Pending",
                scheduledDate,
                isNoDateScheduled,
                daysDiff,
                category,
                nextAction: item.nextAction || item.customerSay || "Follow up call required",
                link: `/dashboard/leads/followup-tracker/new?leadId=${item.id}&leadNo=${item.id}`,
                type: "followup"
            });
        });

        pendingQuotations.forEach(item => {
            const owner = item.salesPerson || item.receiverName || "";
            const division = item.consigneeDivision || item.division || "";

            if (!ownedBy(owner) || !matchesExtraFilters(owner, division, item.date || item.createdAt, filters)) {
                return;
            }

            let scheduledDate = toIsoDate(item.nextFollowupDate || item.nextFollowup || item.date);

            let daysDiff = 0;
            let category = "upcoming";

            if (scheduledDate) {
                const itemDate = new Date(scheduledDate + "T00:00:00");
                const todayDate = new Date(todayStr + "T00:00:00");
                daysDiff = Math.round((itemDate - todayDate) / (1000 * 60 * 60 * 24));

                if (scheduledDate < todayStr) {
                    category = "overdue";
                } else if (scheduledDate === todayStr) {
                    category = "today";
                } else if (scheduledDate > todayStr && scheduledDate <= in7DaysStr) {
                    category = "next7days";
                } else {
                    category = "future";
                }
            }

            allItems.push({
                id: item.quotationNo || item.id,
                leadNo: item.leadNo || item.quotationNo,
                quotationNo: item.quotationNo,
                companyName: item.companyName || item.consigneeName || "Unknown Company",
                personName: item.contactName || item.contactPerson || "",
                phoneNumber: item.contactNo || item.phoneNumber || "",
                salesPerson: owner || "-",
                division: division || "-",
                stage: "Quotation Tracker",
                status: item.status || "Pending Response",
                scheduledDate,
                isNoDateScheduled: false,
                daysDiff,
                category,
                nextAction: item.customerSaid || item.remarks || "Quotation status update",
                link: `/dashboard/leads/quotation-tracker`,
                type: "quotation"
            });
        });

        const overdue = allItems.filter(i => i.category === "overdue").sort((a, b) => a.daysDiff - b.daysDiff);
        const today = allItems.filter(i => i.category === "today");
        const next7days = allItems.filter(i => i.category === "next7days").sort((a, b) => a.daysDiff - b.daysDiff);

        return {
            overdue,
            today,
            next7days,
            all: allItems,
            counts: {
                overdue: overdue.length,
                today: today.length,
                next7days: next7days.length,
                total: overdue.length + today.length + next7days.length
            }
        };
    } catch (err) {
        console.error("[leadApi] fetchLeadsSummary error:", err);
        return {
            overdue: [],
            today: [],
            next7days: [],
            all: [],
            counts: { overdue: 0, today: 0, next7days: 0, total: 0 }
        };
    }
};

/**
 * Send Leads Summary via WhatsApp for a specific salesperson
 * @param {string} salesPersonName - Salesperson's name as registered in users table
 * @returns {Promise<boolean>}
 */
export const sendSalesSummaryViaWhatsApp = async (salesPersonName) => {
    try {
        if (!salesPersonName) return false;
        const summary = await fetchLeadsSummary(
            { username: salesPersonName, name: salesPersonName },
            () => false,
            { salesPerson: salesPersonName }
        );
        const { counts } = summary;
        return await sendSalesPersonLeadSummaryNotification({
            salesPersonName,
            totalPending: counts.total,
            overdueCount: counts.overdue,
            todayCount: counts.today,
            upcomingCount: counts.next7days
        });
    } catch (err) {
        console.error("[leadApi] sendSalesSummaryViaWhatsApp error:", err);
        return false;
    }
};

export const fetchRecentActivities = async (currentUser, isAdminFunc, filters = {}) => {
    try {
        const username = currentUser?.username;
        const isAdmin = typeof isAdminFunc === "function" ? isAdminFunc() : !!isAdminFunc;
        const checkPerm = (userAssigned) => isAdmin || (userAssigned === username);

        const activities = [];

        // 1. Leads
        const { data: leads } = await supabase
            .from("leads")
            .select("receiver_name, company_name, division, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

        (leads || []).forEach(lead => {
            if (checkPerm(lead.receiver_name) && matchesExtraFilters(lead.receiver_name, lead.division, lead.created_at, filters)) {
                activities.push({
                    user: lead.receiver_name || "System",
                    action: "Created a new lead",
                    type: "Lead",
                    detail: lead.company_name || "Unknown",
                    time: lead.created_at,
                    dateObj: new Date(lead.created_at || 0)
                });
            }
        });

        // 2. Follow-ups
        const { data: followups } = await supabase
            .from("leads_followups")
            .select("assigned_to, company_name, division, enquiry_status, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

        (followups || []).forEach(h => {
            if (checkPerm(h.assigned_to) && matchesExtraFilters(h.assigned_to, h.division, h.created_at, filters)) {
                activities.push({
                    user: h.assigned_to || "System",
                    action: `Follow-up: ${h.enquiry_status}`,
                    type: "Follow-up",
                    detail: h.company_name || "Unknown",
                    time: h.created_at,
                    dateObj: new Date(h.created_at || 0)
                });
            }
        });

        // 3. Quotations
        const { data: quotations } = await supabase
            .from("leads_quotations")
            .select("sales_person, prepared_by, consignee_name, consignee_division, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

        (quotations || []).forEach(q => {
            const owner = q.sales_person || q.prepared_by || "";
            if (checkPerm(owner) && matchesExtraFilters(owner, q.consignee_division, q.created_at, filters)) {
                activities.push({
                    user: owner || "System",
                    action: "Saved quotation",
                    type: "Quotation",
                    detail: q.consignee_name || "Unknown",
                    time: q.created_at,
                    dateObj: new Date(q.created_at || 0)
                });
            }
        });

        activities.sort((a, b) => b.dateObj - a.dateObj);

        return activities.slice(0, 5).map(a => {
            let timeStr = "Recently";
            if (a.dateObj && !isNaN(a.dateObj.getTime())) {
                const diffMs = new Date() - a.dateObj;
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 60) timeStr = `${Math.max(1, diffMins)} min ago`;
                else if (diffMins < 1440) timeStr = `${Math.floor(diffMins / 60)} hours ago`;
                else timeStr = `${Math.floor(diffMins / 1440)} days ago`;
            }
            return {
                user: a.user,
                action: a.action,
                type: a.type,
                detail: a.detail,
                time: timeStr
            };
        });
    } catch (err) {
        console.error("[leadApi] fetchRecentActivities error:", err);
        return [];
    }
};

export const fetchQuotationDropdowns = async () => {
    try {
        const [companiesRes, salesRes] = await Promise.allSettled([
            fetchCompanies(),
            fetchMasterSalespersons()
        ]);

        const companiesList = companiesRes.status === "fulfilled" ? companiesRes.value : [];
        const salesList = salesRes.status === "fulfilled" ? salesRes.value : [];

        const response = {
            states: {},
            companies: {},
            references: {},
            preparedBy: salesList.map(s => s.name)
        };

        companiesList.forEach(comp => {
            response.companies[comp.name] = {
                address: comp.address || "",
                state: comp.state || "",
                contactName: comp.contactPersons?.[0]?.name || comp.salesPerson || "",
                contactNo: comp.contactPersons?.[0]?.number || comp.phone || "",
                gstin: comp.gst || "",
                stateCode: "27",
                city: comp.city || "",
                division: comp.division || ""
            };
        });

        INDIAN_STATES.forEach(state => {
            response.states[state] = {
                bankDetails: "Account No: 1234567890\nBank Name: HDFC\nIFSC: HDFC0001234",
                consignerAddress: `Address in ${state}`,
                stateCode: "10",
                gstin: "10AAA...",
                pan: "ABC...",
                msmeNumber: "MSME..."
            };
        });

        salesList.forEach(ref => {
            response.references[ref.name] = {
                mobile: "9999999999"
            };
        });

        return response;
    } catch (err) {
        console.error("[leadApi] fetchQuotationDropdowns error:", err);
        return { states: {}, companies: {}, references: {}, preparedBy: [] };
    }
};

/**
 * Fetch live company conversion status & stage map directly from Supabase tables:
 * - Converted: If latest enquiry received status is "Make Quotation", "Expected", or "Order Received".
 * - Unconverted: If latest enquiry status is "Not Interested", or lead is at Initial Lead / Direct Contact stage.
 */
export const fetchLiveCompanyConversionAndStageMap = async () => {
    const conversionSet = new Set();
    const stageMap = {};

    try {
        const events = [];

        // 1. Quotation updates (Order Received vs Order Not Received)
        const { data: quoteUpdates } = await supabase
            .from("leads_quotation_updates")
            .select("company_name, status, lead_number, quotation_no, customer_said, remarks, created_at");

        (quoteUpdates || []).forEach((qu) => {
            const cName = (qu.company_name || "").trim().toLowerCase();
            if (!cName) return;
            const st = (qu.status || "").trim().toLowerCase();
            const isOrderReceived = st === "order received" || st.includes("order received");
            const isOrderNotReceived = st === "order not received" || st.includes("not received");

            if (isOrderReceived) {
                events.push({
                    cName,
                    time: new Date(qu.created_at || 0).getTime(),
                    timestamp: qu.created_at || null,
                    isConverted: true,
                    stage: "Order Received",
                    subStage: "Converted",
                    reason: qu.remarks || "Order successfully received",
                    leadNo: qu.lead_number || "",
                    quotationNo: qu.quotation_no || ""
                });
            } else if (isOrderNotReceived) {
                events.push({
                    cName,
                    time: new Date(qu.created_at || 0).getTime(),
                    timestamp: qu.created_at || null,
                    isConverted: false,
                    stage: "Quotation Stage",
                    subStage: "Order Not Received",
                    reason: qu.remarks || qu.customer_said || "Order not received after quotation",
                    leadNo: qu.lead_number || "",
                    quotationNo: qu.quotation_no || ""
                });
            }
        });

        // 2. Quotations table
        const { data: quotes } = await supabase
            .from("leads_quotations")
            .select("consignee_name, lead_number, quotation_no, created_at");

        (quotes || []).forEach((q) => {
            const cName = (q.consignee_name || "").trim().toLowerCase();
            if (!cName) return;

            events.push({
                cName,
                time: new Date(q.created_at || 0).getTime(),
                timestamp: q.created_at || null,
                isConverted: true,
                stage: "Make Quotation",
                subStage: "Converted",
                reason: "Quotation prepared & sent",
                leadNo: q.lead_number || "",
                quotationNo: q.quotation_no || ""
            });
        });

        // 3. Follow-ups table (Not Interested vs Make Quotation / Expected / Order Received)
        const { data: followups } = await supabase
            .from("leads_followups")
            .select("company_name, enquiry_status, customer_feedback, not_interested_reason, lead_number, created_at");

        (followups || []).forEach((f) => {
            const cName = (f.company_name || "").trim().toLowerCase();
            if (!cName) return;
            const enq = (f.enquiry_status || "").trim().toLowerCase();
            const feed = (f.customer_feedback || "").trim().toLowerCase();

            if (enq === "not interested" || feed === "not interested" || enq === "not-interested") {
                events.push({
                    cName,
                    time: new Date(f.created_at || 0).getTime(),
                    timestamp: f.created_at || null,
                    isConverted: false,
                    stage: "Follow-up Stage",
                    subStage: "Not Interested",
                    reason: f.not_interested_reason || (f.customer_feedback ? `Customer said: ${f.customer_feedback}` : "Marked Not Interested"),
                    leadNo: f.lead_number || ""
                });
            } else if (
                enq === "make quotation" ||
                enq === "expected" ||
                enq === "order received" ||
                enq === "order receive" ||
                feed === "interested" ||
                feed === "asked for quotation" ||
                feed === "order confirmed" ||
                feed === "order received"
            ) {
                const stageLabel =
                    enq === "order received" || feed === "order confirmed" || feed === "order received"
                        ? "Order Received"
                        : enq === "make quotation"
                            ? "Make Quotation"
                            : "Expected";
                events.push({
                    cName,
                    time: new Date(f.created_at || 0).getTime(),
                    timestamp: f.created_at || null,
                    isConverted: true,
                    stage: stageLabel,
                    subStage: "Converted",
                    reason: f.customer_feedback ? `Customer: ${f.customer_feedback}` : `Enquiry: ${stageLabel}`,
                    leadNo: f.lead_number || ""
                });
            } else {
                events.push({
                    cName,
                    time: new Date(f.created_at || 0).getTime(),
                    timestamp: f.created_at || null,
                    isConverted: false,
                    stage: "Follow-up Stage",
                    subStage: "Callback Pending",
                    reason: "Pending follow-up call",
                    leadNo: f.lead_number || ""
                });
            }
        });

        // 4. Leads table (initial state)
        const { data: leads } = await supabase
            .from("leads")
            .select("company_name, status, lead_number, notes, created_at");

        (leads || []).forEach((l) => {
            const cName = (l.company_name || "").trim().toLowerCase();
            if (!cName) return;
            events.push({
                cName,
                time: new Date(l.created_at || 0).getTime(),
                timestamp: l.created_at || null,
                isConverted: false,
                stage: "Initial Lead Stage",
                subStage: "No Follow-up Logged",
                reason: l.notes || "Lead registered, awaiting first follow-up",
                leadNo: l.lead_number || ""
            });
        });

        // Sort events chronologically descending (newest event first)
        events.sort((a, b) => b.time - a.time);

        const processed = new Set();
        events.forEach((ev) => {
            if (!processed.has(ev.cName)) {
                processed.add(ev.cName);
                stageMap[ev.cName] = {
                    isConverted: ev.isConverted,
                    stage: ev.stage,
                    subStage: ev.subStage,
                    reason: ev.reason,
                    leadNo: ev.leadNo,
                    quotationNo: ev.quotationNo || "",
                    timestamp: ev.timestamp || (ev.time ? new Date(ev.time).toISOString() : null)
                };
                if (ev.isConverted) {
                    conversionSet.add(ev.cName);
                }
            }
        });
    } catch (err) {
        console.warn("[leadApi] fetchLiveCompanyConversionAndStageMap error:", err);
    }

    return { conversionSet, stageMap };
};
