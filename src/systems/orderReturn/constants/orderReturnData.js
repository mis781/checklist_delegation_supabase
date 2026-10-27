// ==============================================================================
// ORDER RETURN SYSTEM MASTER DATA & CONSTANTS
// ==============================================================================

export const MASTERS = {
  company: "Main Division",
  seller: {
    name: "Shree Shyam Steel & Pipes Pvt Ltd",
    address: "Plot 21, Urla Industrial Area, Raipur, CG 493221",
    gstin: "22AAFCS4410P1ZK"
  },
  customers: [
    { id: "C1001", code: "C1001", name: "Shree Balaji Traders", address: "Plot 14, Siltara Industrial Area, Raipur, CG 493111", phone: "+91 98261 40211", gstin: "22AAKFS4521M1Z8" },
    { id: "C1002", code: "C1002", name: "Mahanadi Infra Projects Pvt Ltd", address: "Near Telibandha Square, GE Road, Raipur, CG 492006", phone: "+91 99070 22314", gstin: "22AAGCM7811H1Z2" },
    { id: "C1003", code: "C1003", name: "Bhilai Fabricators & Engineers", address: "Industrial Estate, Bhilai, Durg, CG 490026", phone: "+91 93011 55420", gstin: "22AABFB3307K1ZQ" },
    { id: "C1004", code: "C1004", name: "Sarthi Hardware Mart", address: "Main Road, Bilaspur, CG 495001", phone: "+91 94252 61870", gstin: "22ADFPS9932C1ZT" },
    { id: "C1005", code: "C1005", name: "Kalinga Build Supplies", address: "Ring Road 2, Bhanpuri, Raipur, CG 492013", phone: "+91 70002 81944", gstin: "22AAMFK2208R1Z5" }
  ],
  products: [
    { id: "P101", name: "MS Angle 50×50×5 mm", category: "Structural Steel", sub: "Angles", uom: "MT", price: 58500, gst: 18, stockType: "FG" },
    { id: "P102", name: "TMT Bar Fe550D 12 mm", category: "Structural Steel", sub: "Rebar", uom: "MT", price: 61200, gst: 18, stockType: "FG" },
    { id: "P103", name: "GI Pipe 25 mm Medium", category: "Pipes & Tubes", sub: "GI Pipes", uom: "Nos", price: 1180, gst: 18, stockType: "FG" },
    { id: "P104", name: "HR Coil 2.5 mm", category: "Flat Products", sub: "Coils", uom: "MT", price: 54800, gst: 18, stockType: "Semi-FG" },
    { id: "P105", name: "Zinc Ingot 99.95%", category: "Raw Material", sub: "Non-ferrous", uom: "Kg", price: 265, gst: 18, stockType: "Raw Material" },
    { id: "P106", name: "Welded Wire Mesh 6×6", category: "Wire Products", sub: "Mesh", uom: "Sheet", price: 940, gst: 18, stockType: "FG" },
    { id: "P107", name: "Primer Coated Purlin C-150", category: "Structural Steel", sub: "Purlins", uom: "Nos", price: 2350, gst: 18, stockType: "FG" }
  ],
  invoices: [
    { no: "INV/26-27/0412", date: "2026-07-04", customerId: "C1001", items: [{ productId: "P101", qty: 12, price: 58500, dispatchNo: "DSP-2607-118" }, { productId: "P103", qty: 400, price: 1180, dispatchNo: "DSP-2607-118" }] },
    { no: "INV/26-27/0538", date: "2026-08-11", customerId: "C1001", items: [{ productId: "P106", qty: 250, price: 940, dispatchNo: "DSP-2608-071" }] },
    { no: "INV/26-27/0455", date: "2026-07-19", customerId: "C1002", items: [{ productId: "P102", qty: 40, price: 61200, dispatchNo: "DSP-2607-164" }, { productId: "P107", qty: 180, price: 2350, dispatchNo: "DSP-2607-165" }] },
    { no: "INV/26-27/0611", date: "2026-09-02", customerId: "C1002", items: [{ productId: "P102", qty: 25, price: 61000, dispatchNo: "DSP-2609-022" }] },
    { no: "INV/26-27/0490", date: "2026-07-28", customerId: "C1003", items: [{ productId: "P104", qty: 18, price: 54800, dispatchNo: "DSP-2607-201" }, { productId: "P105", qty: 1500, price: 265, dispatchNo: "DSP-2607-202" }] },
    { no: "INV/26-27/0587", date: "2026-08-26", customerId: "C1004", items: [{ productId: "P103", qty: 600, price: 1180, dispatchNo: "DSP-2608-148" }, { productId: "P106", qty: 120, price: 940, dispatchNo: "DSP-2608-148" }] },
    { no: "INV/26-27/0644", date: "2026-09-15", customerId: "C1005", items: [{ productId: "P101", qty: 8, price: 58200, dispatchNo: "DSP-2609-089" }, { productId: "P107", qty: 90, price: 2350, dispatchNo: "DSP-2609-090" }] }
  ],
  warehouses: ["Main Store – Raipur", "FG Yard", "Semi-FG Bay", "RM Store", "Scrap Yard"],
  dispatches: {
    "DSP-2607-118": { date: "2026-07-04", vehicle: "CG04 MH 7781", transporter: "Own fleet", driver: "Santosh Verma", lr: "LR-40118" },
    "DSP-2608-071": { date: "2026-08-11", vehicle: "CG04 JT 2290", transporter: "Shiv Shakti Roadways", driver: "Dinesh Patel", lr: "LR-40571" },
    "DSP-2607-164": { date: "2026-07-19", vehicle: "CG07 AQ 5512", transporter: "VRL Logistics", driver: "Manoj Sahu", lr: "VRL-51164" },
    "DSP-2607-165": { date: "2026-07-20", vehicle: "CG04 MH 7781", transporter: "Own fleet", driver: "Santosh Verma", lr: "LR-40165" },
    "DSP-2609-022": { date: "2026-09-02", vehicle: "CG07 BX 9034", transporter: "Gati Ltd", driver: "Rakesh Nishad", lr: "GATI-77022" },
    "DSP-2607-201": { date: "2026-07-28", vehicle: "CG04 LK 1180", transporter: "Own fleet", driver: "Ajay Kurre", lr: "LR-40201" },
    "DSP-2607-202": { date: "2026-07-28", vehicle: "CG04 LK 1180", transporter: "Own fleet", driver: "Ajay Kurre", lr: "LR-40202" },
    "DSP-2608-148": { date: "2026-08-26", vehicle: "CG10 GH 6621", transporter: "Shree Balaji Transport", driver: "Pappu Yadav", lr: "SBT-11148" },
    "DSP-2609-089": { date: "2026-09-15", vehicle: "CG04 JT 2290", transporter: "Shiv Shakti Roadways", driver: "Dinesh Patel", lr: "LR-40989" },
    "DSP-2609-090": { date: "2026-09-16", vehicle: "CG04 MH 7781", transporter: "Own fleet", driver: "Santosh Verma", lr: "LR-40990" }
  }
};

export const REASONS = [
  "Damaged",
  "Defective",
  "Wrong Material",
  "Excess Material",
  "Quality Issue",
  "Customer Requirement",
  "Other"
];

export const TRANSPORT_TYPES = [
  "FOR",
  "Ex-Factory",
  "Ex-Factory at transport office"
];

export const TT_MODE = {
  "FOR": "Customer Arranged",
  "Ex-Factory": "Company Vehicle",
  "Ex-Factory at transport office": "Two-leg"
};

export const TT_HINT = {
  "FOR": "Customer sends the material in their own vehicle.",
  "Ex-Factory": "We arrange the vehicle end to end, from the customer to our factory.",
  "Ex-Factory at transport office": "Customer brings it to the transport office in their vehicle; we arrange a second vehicle from there to our factory."
};

export const STAGES = [
  "Return Request",
  "Approval",
  "Ask for Debit Note",
  "Vehicle Arrangement",
  "Material Receipt & QC",
  "Issue Credit Note"
];

export const STAGE_HELP = {
  1: "Drafts waiting to be submitted. Once submitted, a request moves to approval.",
  2: "Requests waiting for an approve, partial approve or reject decision.",
  3: "Approved returns waiting for the customer’s debit note, or a reason it isn’t needed.",
  4: "Returns that need a vehicle, bilty and tracking details.",
  5: "Material on its way or arrived, waiting for GRN, QC and stock posting.",
  6: "Returns with stock posted, waiting for the credit note."
};

export const STAGE_OWNER = {
  1: "Requester",
  2: "Approver",
  3: "Accounts",
  4: "Logistics",
  5: "Store / QC",
  6: "Accounts"
};

export const FMS = [
  { n: 1, what: "Raise return request", who: "Requester", how: "Pick invoice lines, give each product its reason and photos, submit.", tat: 24 },
  { n: 2, what: "Approve or reject", who: "Approver", how: "Check reasons and evidence. Approve fully, partly or reject.", tat: 24 },
  { n: 3, what: "Collect debit note", who: "Accounts", how: "Get the customer’s debit note, or record why it isn’t needed.", tat: 48 },
  { n: 4, what: "Arrange vehicle", who: "Logistics", how: "Book transport, bilty and tracking, then mark in transit.", tat: 48 },
  { n: 5, what: "Receive, QC, post stock", who: "Store / QC", how: "Make GRN, inspect, split accepted, rejected and scrap, post stock.", tat: 72 },
  { n: 6, what: "Issue credit note", who: "Accounts", how: "Verify against accepted quantity and issue the credit note.", tat: 48 }
];

export const ROLES = {
  "Requester": { stages: [1] },
  "Approver": { stages: [2] },
  "Accounts": { stages: [3, 6] },
  "Logistics": { stages: [4] },
  "Store / QC": { stages: [5] },
  "Management / Admin": { stages: [1, 2, 3, 4, 5, 6], admin: true },
  "Super Admin": { stages: [1, 2, 3, 4, 5, 6], admin: true, superadmin: true }
};

export const DEST_WH = {
  "FG": "FG Yard",
  "Semi-FG": "Semi-FG Bay",
  "Raw Material": "RM Store",
  "Scrap": "Scrap Yard"
};

export const SUBCATS = [...new Set(MASTERS.products.map(p => p.sub))];
export const RETURN_DAYS = 45;

// ==============================================================================
// PURE UTILITY & FORMATTING FUNCTIONS
// ==============================================================================

export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};

export const nowISO = () => new Date().toISOString();

export const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

export const money = (v) => (v == null || v === "" ? "—" : inr.format(+v));

export const moneyShort = (v) => {
  if (v == null || v === "") return "—";
  const numVal = +v;
  if (numVal >= 1e7) return "₹" + (numVal / 1e7).toFixed(2) + " Cr";
  if (numVal >= 1e5) return "₹" + (numVal / 1e5).toFixed(2) + " L";
  return "₹" + Math.round(numVal).toLocaleString("en-IN");
};

export const qf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

export const qty = (v, u) => (v == null || v === "" ? "—" : qf.format(+v) + (u ? " " + u : ""));

export const fdate = (d) => {
  if (!d) return "—";
  const x = new Date(d.length === 10 ? d + "T00:00" : d);
  return x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fdt = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const round = (v, p = 3) => Math.round(v * 10 ** p) / 10 ** p;

export const clone = (o) => JSON.parse(JSON.stringify(o));

export const prod = (id) => MASTERS.products.find((p) => p.id === id) || { name: id, uom: "MT", price: 0, gst: 18, stockType: "FG" };
export const cust = (id) => MASTERS.customers.find((c) => c.id === id) || { name: id, code: id, address: "", phone: "", gstin: "" };
export const inv = (no) => MASTERS.invoices.find((i) => i.no === no) || { no, date: today(), items: [] };
export const invItem = (no, pid) => {
  const invoice = inv(no);
  const found = (invoice.items || []).find((i) => i.productId === pid || i.product_id === pid);
  if (found) return found;
  const p = prod(pid);
  return { qty: 0, price: p.price || 0, dispatchNo: "—" };
};

export const yymm = (d) => (d || today()).slice(2, 4) + (d || today()).slice(5, 7);

export const initials = (n) =>
  String(n || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const daysBetween = (a, b) => Math.round((new Date((b || today()) + "T00:00") - new Date((a || today()) + "T00:00")) / 864e5);

export const lineValue = (i) => (i.reqQty || 0) * (invItem(i.invoiceNo, i.productId).price || i.price || prod(i.productId).price || 0);

export const returnValue = (r) => (r.items || []).reduce((s, i) => s + lineValue(i), 0);

export const reasonsOf = (r) => [...new Set((r.items || []).map((i) => i.reason).filter(Boolean))];

export const itemTotals = (r, item) => {
  let recv = 0, acc = 0, rej = 0, scr = 0;
  (r.receipts || []).forEach((rc) =>
    (rc.lines || []).forEach((l) => {
      if (l.key === item.key) {
        recv += l.recv || 0;
        acc += l.accept || 0;
        rej += l.reject || 0;
        scr += l.scrap || 0;
      }
    })
  );
  return { recv: round(recv), acc: round(acc), rej: round(rej), scr: round(scr) };
};

export const sumItems = (r, f) => round((r.items || []).reduce((s, i) => s + (f(i) || 0), 0));

export const creditBasis = (r) => {
  let base = 0, tax = 0, cap = 0;
  (r.items || []).forEach((i) => {
    const t = itemTotals(r, i);
    const it = invItem(i.invoiceNo, i.productId);
    const p = prod(i.productId);
    const price = it.price || p.price || 0;
    base += t.acc * price;
    tax += (t.acc * price * (p.gst || 0)) / 100;
    cap += (i.apprQty || 0) * price;
  });
  return { base: round(base, 2), tax: round(tax, 2), cap: round(cap, 2) };
};

export const committedQty = (returns, invoiceNo, productId, excludeId) => {
  return (returns || [])
    .filter((r) => r.id !== excludeId && !["Rejected", "Cancelled", "Draft"].includes(r.status))
    .reduce(
      (s, r) =>
        s +
        (r.items || [])
          .filter((i) => i.invoiceNo === invoiceNo && i.productId === productId)
          .reduce((a, i) => a + (i.apprQty != null ? i.apprQty : i.reqQty), 0),
      0
    );
};

export const nextSeq = (prefix, list) => {
  let max = 0;
  (list || []).forEach((v) => {
    if (v && v.startsWith(prefix)) {
      const n = parseInt(v.slice(prefix.length), 10);
      if (n > max) max = n;
    }
  });
  return prefix + String(max + 1).padStart(4, "0");
};

export const newReturnNo = (returns, date) =>
  nextSeq("RR-" + yymm(date) + "-", (returns || []).map((r) => r.return_no || r.no));

export const newGRN = (returns, date) =>
  nextSeq(
    "GRN-" + yymm(date) + "-",
    (returns || []).flatMap((r) => (r.receipts || []).map((x) => x.grn))
  );

export const diffFields = (oldO, newO, labels) => {
  const out = [];
  for (const k in labels) {
    const a = oldO?.[k] ?? "";
    const b = newO?.[k] ?? "";
    if (String(a) !== String(b)) {
      out.push(`${labels[k]}: “${a || "blank"}” → “${b || "blank"}”`);
    }
  }
  return out.join("; ");
};

export const stockStatus = (r) => {
  if (!r.receipts?.length) return "Pending";
  if (r.receipts.some((x) => !x.posted)) return "Pending";
  return r.receipts.some((x) => x.invStatus === "Posted") ? "Posted" : "Not Applicable";
};

export const qcStatusOf = (r) => {
  if (!r.receipts?.length) return r.stage >= 5 && !["Rejected", "Cancelled"].includes(r.status) ? "Pending" : "—";
  const s = new Set(r.receipts.map((x) => x.qcStatus));
  return s.size === 1 ? [...s][0] : "Partially Passed";
};

export const destText = (l) =>
  [
    l.accept > 0 ? `${qf.format(l.accept)} to ${l.stockType}` : "",
    l.scrap > 0 ? `${qf.format(l.scrap)} to Scrap` : "",
    l.reject > 0 ? `${qf.format(l.reject)} rejected` : ""
  ]
    .filter(Boolean)
    .join(", ") || "—";

export const dur = (ms) => {
  ms = Math.abs(ms);
  const d = Math.floor(ms / 864e5);
  const h = Math.round((ms % 864e5) / 36e5);
  return d ? `${d}d${h ? " " + h + "h" : ""}` : h ? `${h}h` : "<1h";
};

const DONE_ACT = {
  1: ["Submitted for approval"],
  2: ["Approved", "Partially Approved", "Rejected"],
  3: ["Debit note completed"],
  4: ["Vehicle dispatched"],
  5: ["Receipt & QC closed"],
  6: ["Credit note issued", "Closed without credit note"]
};

export const fmsSteps = (r) => {
  const H = r.history || [];
  let prev = new Date(H.length ? H[0].at : r.date + "T10:00:00").getTime();
  let stopped = false;
  const out = [];

  for (const f of FMS) {
    if (stopped) {
      out.push({ state: "na", planned: prev });
      continue;
    }
    const planned = prev + f.tat * 36e5;
    const hit = H.find((h) => DONE_ACT[f.n].includes(h.action) && new Date(h.at).getTime() >= prev - 1000);
    if (hit) {
      const act = new Date(hit.at).getTime();
      out.push({ planned, actual: act, delay: act - planned, state: act > planned ? "late" : "ok", by: hit.by });
      prev = act;
      if (hit.action === "Rejected") stopped = true;
      continue;
    }
    out.push({
      planned,
      state: r.status === "Cancelled" ? "cancel" : r.status === "On Hold" ? "hold" : Date.now() > planned ? "overdue" : "due"
    });
    stopped = true;
  }
  return out;
};

export function createNewReturnDraft() {
  return {
    id: "r-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    no: "",
    return_no: "",
    date: today(),
    customerId: "",
    customer_id: "",
    transportType: "Ex-Factory",
    transport_type: "Ex-Factory",
    reason: "",
    remarks: "",
    items: [],
    attachments: { request: [], approval: [], debit: [], transport: [], veh1: [], veh2: [], qc: [], credit: [] },
    stage: 1,
    status: "Draft",
    approval: { status: "Pending", history: [] },
    debit: { required: "Yes", status: "Pending" },
    transport: { status: "Not Arranged", biltyReq: "No" },
    receipts: [],
    receiptClosed: false,
    credit: { required: "Yes", status: "Pending" },
    history: [],
    company: MASTERS.company
  };
}

export function docCopy(title, no, rows) {
  const h = 110 + rows.length * 28;
  const x = (v) =>
    String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="${h}" viewBox="0 0 620 ${h}"><rect width="620" height="${h}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" rx="8"/><rect width="620" height="54" fill="#1e1b4b" rx="8 8 0 0"/><text x="24" y="34" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#ffffff">${x(title)}</text><text x="596" y="34" font-family="Arial,sans-serif" font-size="14" font-weight="600" fill="#c7d2fe" text-anchor="end">${x(no)}</text>${rows.map((r, i) => `<text x="24" y="${88 + i * 28}" font-family="Arial,sans-serif" font-size="13" font-weight="600" fill="#64748b">${x(r[0])}</text><text x="220" y="${88 + i * 28}" font-family="Arial,sans-serif" font-size="13" font-weight="500" fill="#0f172a">${x(r[1])}</text>`).join("")}<text x="24" y="${h - 14}" font-family="Arial,sans-serif" font-size="11" fill="#94a3b8">${x(MASTERS.seller.name)} — Verified ERP Copy</text></svg>`;
  return {
    name: `${title.replace(/\s+/g, "_")}_${String(no).replace(/[^\w-]+/g, "_")}.svg`,
    type: "image/svg+xml",
    size: svg.length,
    url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
  };
}

// Generate realistic seed records from HTML demo
export function generateDemoSeedData() {
  const R = [];
  const M = [];
  let cn = 100, dn = 200;
  const WH = { "FG": "FG Yard", "Semi-FG": "Semi-FG Bay", "Raw Material": "RM Store" };
  const add = (d, n) => {
    const x = new Date(d + "T00:00");
    x.setDate(x.getDate() + n);
    return new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  };

  const plan = [
    { d: "2026-07-30", c: "C1003", reason: "Excess Material", lines: [["INV/26-27/0490", "P105", 100]], upto: "done" },
    { d: "2026-08-06", c: "C1001", reason: "Damaged", remarks: "Bent angles found during unloading", lines: [["INV/26-27/0412", "P101", 3]], upto: "done" },
    {
      d: "2026-08-12", c: "C1002", reason: "Quality Issue", remarks: "Coating peeling on purlins", lines: [["INV/26-27/0455", "P107", 20]], upto: "done",
      tt: "Ex-Factory at transport office", rc: { qc: "Partially Passed", acc: 0.7, cond: "Damaged" },
      tr: { mode: "Two-leg", name: "Customer’s own", vehicle: "CG07 BT 8812", driver: "Mohan Lal", office: "VRL Logistics, Bhilai", leg2: { name: "Own fleet", vehicle: "CG04 MK 2231", driver: "Ramesh Sahu", mobile: "+91 98271 33450", date: "2026-08-17" }, biltyReq: "Yes", biltyNo: "VRL-55821", lr: "LR-88214", cost: "6200" }
    },
    { d: "2026-08-20", c: "C1003", reason: "Wrong Material", lines: [["INV/26-27/0490", "P105", 200]], approve: { decision: "Rejected", reason: "Material supplied as per PO, no deviation found" } },
    { d: "2026-09-03", c: "C1004", reason: "Defective", lines: [["INV/26-27/0587", "P103", 50], ["INV/26-27/0587", "P106", 10, "Damaged"]], upto: "s6" },
    { d: "2026-09-10", c: "C1001", reason: "Customer Requirement", lines: [["INV/26-27/0412", "P103", 40]], upto: "s4" },
    { d: "2026-09-22", c: "C1005", reason: "Damaged", lines: [["INV/26-27/0644", "P101", 2]], upto: "s5r" },
    { d: "2026-10-03", c: "C1002", reason: "Quality Issue", lines: [["INV/26-27/0611", "P102", 5]], upto: "s5", tt: "FOR", tr: { mode: "Customer Arranged", name: "Customer’s own", vehicle: "CG07 ZX 4410", driver: "", mobile: "", lr: "", cost: "" } },
    { d: "2026-10-07", c: "C1001", reason: "Excess Material", lines: [["INV/26-27/0538", "P106", 30]], upto: "s4" },
    { d: "2026-10-10", c: "C1003", reason: "Defective", lines: [["INV/26-27/0490", "P104", 4]], approve: { decision: "Partially Approved", ratio: 0.75, reason: "1 MT is usable at site" }, upto: "s3" },
    { d: "2026-10-14", c: "C1004", reason: "Damaged", lines: [["INV/26-27/0587", "P106", 15]], upto: "s2" },
    { d: "2026-10-16", c: "C1005", reason: "Wrong Material", remarks: "C-120 purlins needed, C-150 delivered", lines: [["INV/26-27/0644", "P107", 10]], upto: "s2" },
    { d: "2026-10-18", c: "C1002", reason: "Damaged", lines: [["INV/26-27/0455", "P102", 6]], upto: "draft" },

    // ── Additional dummy records for richer demo coverage ──────────────────

    // Stage 1 – 8 draft records for richer demo
    { d: "2026-10-26", c: "C1003", reason: "Defective", remarks: "HR coil surface rust found during goods inspection", lines: [["INV/26-27/0490", "P104", 3]], upto: "draft" },
    { d: "2026-10-25", c: "C1002", reason: "Excess Material", remarks: "Customer ordered 30 MT, 35 MT delivered by mistake", lines: [["INV/26-27/0455", "P102", 5]], upto: "draft" },
    { d: "2026-10-24", c: "C1001", reason: "Quality Issue", remarks: "Angles bent beyond tolerance, not fit for fabrication", lines: [["INV/26-27/0412", "P101", 4], ["INV/26-27/0412", "P103", 80]], upto: "draft" },
    { d: "2026-10-23", c: "C1005", reason: "Damaged", remarks: "Purlins dented during transit, customer refusing acceptance", lines: [["INV/26-27/0644", "P107", 12]], upto: "draft" },
    { d: "2026-10-22", c: "C1004", reason: "Defective", remarks: "Mesh welds breaking under load", lines: [["INV/26-27/0587", "P103", 25]], upto: "draft" },
    { d: "2026-10-21", c: "C1005", reason: "Wrong Material", remarks: "C-120 purlins needed, C-150 delivered", lines: [["INV/26-27/0644", "P107", 15]], upto: "draft" },
    { d: "2026-10-20", c: "C1001", reason: "Damaged", lines: [["INV/26-27/0412", "P101", 2]], upto: "draft" },
    { d: "2026-10-19", c: "C1003", reason: "Customer Requirement", remarks: "Customer downsizing project scope, returning surplus zinc ingots", lines: [["INV/26-27/0490", "P105", 300]], upto: "draft" },

    // Stage 2 – 3 more pending approval
    { d: "2026-10-17", c: "C1002", reason: "Quality Issue", remarks: "Surface rust on TMT bars", lines: [["INV/26-27/0611", "P102", 8]], upto: "s2" },
    { d: "2026-10-15", c: "C1003", reason: "Excess Material", lines: [["INV/26-27/0490", "P105", 200]], upto: "s2" },
    { d: "2026-10-12", c: "C1004", reason: "Defective", lines: [["INV/26-27/0587", "P106", 20]], upto: "s2" },

    // Stage 3 – 2 more awaiting debit note
    { d: "2026-10-06", c: "C1002", reason: "Quality Issue", remarks: "Coating peeling on C-150 purlins", lines: [["INV/26-27/0455", "P107", 30]], upto: "s3" },
    { d: "2026-10-02", c: "C1005", reason: "Damaged", lines: [["INV/26-27/0644", "P101", 3]], upto: "s3" },

    // Stage 4 – 2 more awaiting vehicle dispatch
    { d: "2026-09-28", c: "C1001", reason: "Damaged", lines: [["INV/26-27/0412", "P103", 60]], upto: "s4" },
    { d: "2026-09-25", c: "C1003", reason: "Excess Material", lines: [["INV/26-27/0490", "P105", 150]], upto: "s4" },

    // Stage 5 – 2 more awaiting material receipt & QC
    { d: "2026-09-18", c: "C1001", reason: "Defective", lines: [["INV/26-27/0538", "P106", 50]], upto: "s5" },
    { d: "2026-09-13", c: "C1004", reason: "Wrong Material", lines: [["INV/26-27/0587", "P103", 30]], upto: "s5" },

    // Stage 6 – 2 more awaiting credit note
    { d: "2026-09-09", c: "C1002", reason: "Quality Issue", lines: [["INV/26-27/0455", "P102", 8]], upto: "s6" },
    { d: "2026-09-05", c: "C1005", reason: "Damaged", lines: [["INV/26-27/0644", "P107", 20]], upto: "s6" },

    // Completed – 2 more fully closed records
    { d: "2026-09-01", c: "C1003", reason: "Defective", lines: [["INV/26-27/0490", "P104", 5]], upto: "done" },
    { d: "2026-08-28", c: "C1001", reason: "Quality Issue", lines: [["INV/26-27/0412", "P101", 3]], upto: "done" }
  ];

  plan.forEach((p, ix) => {
    let r = createNewReturnDraft();
    r.id = "demo" + (ix + 1);
    r.date = p.d;
    r.customerId = p.c;
    r.customer_id = p.c;
    const cObj = cust(p.c);
    r.customer_name = cObj.name;
    r.customer_code = cObj.code;
    r.customer_address = cObj.address;
    r.customer_phone = cObj.phone;
    r.customer_gstin = cObj.gstin;
    r.reason = p.reason;
    r.remarks = p.remarks || "";
    r.transportType = p.tt || "Ex-Factory";
    r.transport_type = r.transportType;
    r.items = p.lines.map(([no, pid, q, rs]) => {
      const it = invItem(no, pid);
      const pr = prod(pid);
      return {
        key: no + "|" + pid,
        item_key: no + "|" + pid,
        invoiceNo: no,
        invoice_no: no,
        invoiceDate: inv(no).date,
        invoice_date: inv(no).date,
        dispatchNo: it.dispatchNo,
        dispatch_no: it.dispatchNo,
        productId: pid,
        product_id: pid,
        product_name: pr.name,
        category: pr.category,
        sub_category: pr.sub,
        uom: pr.uom,
        price: it.price || pr.price,
        invQty: it.qty,
        inv_qty: it.qty,
        reqQty: q,
        req_qty: q,
        reason: rs || p.reason,
        note: p.remarks || "",
        attachments: [
          {
            name: `Inspection_${pid}.svg`,
            type: "image/svg+xml",
            size: 600,
            url:
              "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="150" viewBox="0 0 240 150"><rect width="240" height="150" fill="#f8fafc" stroke="#cbd5e1" rx="8"/><rect x="10" y="10" width="220" height="24" rx="4" fill="#e0e7ff"/><text x="18" y="27" font-family="sans-serif" font-size="11" font-weight="bold" fill="#3730a3">${pr.name.slice(0, 18)}</text><text x="18" y="58" font-family="sans-serif" font-size="10" fill="#64748b">Invoice: ${no}</text><text x="18" y="78" font-family="sans-serif" font-size="10" fill="#64748b">Reason: ${rs || p.reason}</text><text x="18" y="98" font-family="sans-serif" font-size="10" fill="#64748b">Qty: ${q} ${pr.uom}</text><circle cx="200" cy="115" r="16" fill="#10b981"/><path d="M194 115 l4 4 l8 -8" stroke="#fff" stroke-width="2" fill="none"/></svg>`
              )
          }
        ]
      };
    });

    r.no = newReturnNo(R, r.date);
    r.return_no = r.no;
    r.createdBy = "Anita Verma";
    r.created_by = r.createdBy;

    r.history = [{ at: r.date + "T10:00:00.000Z", by: "Anita Verma", role: "Requester", action: "Draft created", detail: "" }];

    if (p.upto === "draft") {
      R.push(r);
      return;
    }

    // Stage 1 -> 2
    r.stage = 2;
    r.status = "Pending Approval";
    r.history.push({ at: r.date + "T11:00:00.000Z", by: "Anita Verma", role: "Requester", action: "Submitted for approval", detail: `${r.items.length} line(s) requested` });
    if (p.upto === "s2") {
      R.push(r);
      return;
    }

    // Stage 2 Approval
    const a = p.approve || { decision: "Approved" };
    r.items.forEach((i) => {
      const appr = a.decision === "Approved" ? i.reqQty : a.decision === "Rejected" ? 0 : round(i.reqQty * (a.ratio || 0.5));
      i.apprQty = appr;
      i.appr_qty = appr;
      i.rejQty = round(i.reqQty - appr);
      i.rej_qty = i.rejQty;
    });

    r.approval = {
      status: a.decision,
      by: "Suresh Patel",
      date: add(p.d, 1),
      reason: a.reason || "",
      remarks: a.remarks || ""
    };

    if (a.decision === "Rejected") {
      r.status = "Rejected";
      r.history.push({ at: add(p.d, 1) + "T14:00:00.000Z", by: "Suresh Patel", role: "Approver", action: "Rejected", detail: a.reason || "Rejected" });
      R.push(r);
      return;
    }

    r.stage = 3;
    r.status = a.decision;
    r.history.push({ at: add(p.d, 1) + "T14:00:00.000Z", by: "Suresh Patel", role: "Approver", action: a.decision, detail: `Approved ${sumItems(r, (i) => i.apprQty)} of ${sumItems(r, (i) => i.reqQty)}` });

    if (p.upto === "s3") {
      R.push(r);
      return;
    }

    // Stage 3 Debit Note
    const cap = creditBasis(r).cap;
    dn++;
    r.debit = {
      required: "Yes",
      status: "Received",
      number: "DN/" + cObj.code + "/" + dn,
      date: add(p.d, 2),
      amount: String(cap),
      tax: String(round(cap * 0.18, 2)),
      notReqReason: "",
      remarks: "",
      submittedBy: "Neha Gupta"
    };
    r.attachments.debit = [
      docCopy("Debit Note", r.debit.number, [
        ["Customer", cObj.name],
        ["Date", fdate(r.debit.date)],
        ["Amount", money(r.debit.amount)],
        ["Tax", money(r.debit.tax)],
        ["Against Return", r.no]
      ])
    ];
    r.stage = 4;
    r.status = "In Progress";
    r.history.push({ at: add(p.d, 2) + "T16:00:00.000Z", by: "Neha Gupta", role: "Accounts", action: "Debit note completed", detail: `DN ${r.debit.number}` });

    if (p.upto === "s4") {
      if (p.hold) {
        r.prevStatus = r.status;
        r.status = "On Hold";
        r.holdReason = p.hold;
        r.history.push({ at: add(p.d, 3) + "T10:00:00.000Z", by: "Priya Nair", role: "Management / Admin", action: "Put on hold", detail: p.hold });
      }
      R.push(r);
      return;
    }

    // Stage 4 Transport
    const md = TT_MODE[r.transportType] || "Company Vehicle";
    r.transport = {
      mode: md,
      status: "In Transit",
      name: "Own fleet",
      vehicle: "CG04 MK 2231",
      driver: "Ramesh Sahu",
      mobile: "+91 98271 33450",
      pickup: add(p.d, 4),
      expected: add(p.d, 5),
      cost: "3500",
      biltyReq: "Yes",
      biltyNo: "BLT/26/" + (410 + ix),
      lr: "",
      remarks: "",
      ...(p.tr || {})
    };
    r.attachments.veh1 = [
      docCopy("Vehicle Transport Challan", r.transport.vehicle, [
        ["Transporter", r.transport.name],
        ["Driver", r.transport.driver || "—"],
        ["Mobile", r.transport.mobile || "—"],
        ["Pickup Date", fdate(r.transport.pickup)],
        ["Expected Delivery", fdate(r.transport.expected)]
      ])
    ];
    if (r.transport.biltyReq === "Yes" && r.transport.biltyNo) {
      r.attachments.transport = [
        docCopy("Consignment Bilty", r.transport.biltyNo, [
          ["Transporter", r.transport.name],
          ["Vehicle No.", r.transport.vehicle],
          ["Origin Customer", cObj.name],
          ["Destination", "Factory Warehouse - Raipur"],
          ["Date", fdate(r.transport.pickup)]
        ])
      ];
    }
    r.stage = 5;
    r.history.push({ at: add(p.d, 4) + "T12:00:00.000Z", by: "Vikas Yadav", role: "Logistics", action: "Vehicle dispatched", detail: `${r.transport.vehicle}` });

    if (p.upto === "s5") {
      R.push(r);
      return;
    }

    // Stage 5 Receipt & QC
    const rc = p.rc || { qc: "Passed", acc: 1 };
    const grn = "GRN-" + yymm(p.d) + "-" + String(ix + 1).padStart(4, "0");
    const lines = r.items.map((i) => {
      const pr = prod(i.productId);
      const acc = rc.qc === "Pending" ? i.apprQty : round(i.apprQty * rc.acc);
      return {
        key: i.key,
        recv: i.apprQty,
        accept: acc,
        reject: 0,
        scrap: round(i.apprQty - acc),
        condition: rc.cond || "Good",
        stockType: pr.stockType,
        warehouse: WH[pr.stockType],
        subCat: pr.sub
      };
    });

    const receiptObj = {
      grn,
      date: add(p.d, 6),
      qcStatus: rc.qc,
      remarks: rc.qc === "Partially Passed" ? "Coating damage, moved to scrap" : "",
      exceptionReason: "",
      lines,
      posted: p.upto !== "s5r",
      postRef: p.upto !== "s5r" ? "SA-" + grn.slice(4) : "",
      invStatus: p.upto !== "s5r" ? "Posted" : "Pending",
      by: "Imran Khan",
      at: add(p.d, 6) + "T14:30:00.000Z",
      attachments: [],
      rcvAttachments: [
        docCopy("Goods Receipt Note (GRN)", grn, [
          ...lines.map((l) => {
            const it = r.items.find((i) => i.key === l.key);
            const pr = prod(it?.productId);
            return [pr?.name || "Product", qty(l.recv, pr?.uom) + ` (Acc: ${l.accept}, Scrap: ${l.scrap})`];
          }),
          ["Received Date", fdate(add(p.d, 6))],
          ["QC Status", rc.qc]
        ])
      ]
    };
    r.receipts = [receiptObj];
    r.history.push({ at: add(p.d, 6) + "T14:30:00.000Z", by: "Imran Khan", role: "Store / QC", action: "Material received", detail: `${grn}: QC ${rc.qc}` });

    if (p.upto === "s5r") {
      R.push(r);
      return;
    }

    // Stock posting moves
    lines.forEach((l, lx) => {
      const it = r.items.find((i) => i.key === l.key);
      const pr = prod(it.productId);
      const baseMove = {
        grn,
        returnNo: r.no,
        returnId: r.id,
        productId: it.productId,
        product: pr.name,
        uom: pr.uom,
        date: receiptObj.date,
        by: "Imran Khan",
        at: receiptObj.at,
        invoiceNo: it.invoiceNo,
        ref: receiptObj.postRef
      };
      if (l.accept > 0) {
        M.push({ ...baseMove, id: `${grn}-${lx}-A`, qty: l.accept, stockType: l.stockType, warehouse: l.warehouse, movement: "Return receipt" });
      }
      if (l.scrap > 0) {
        M.push({ ...baseMove, id: `${grn}-${lx}-S`, qty: l.scrap, stockType: "Scrap", warehouse: "Scrap Yard", movement: "Return to scrap" });
      }
    });

    r.receiptClosed = true;
    r.stage = 6;
    r.history.push({ at: add(p.d, 7) + "T09:00:00.000Z", by: "Imran Khan", role: "Store / QC", action: "Receipt & QC closed", detail: `All units received and posted` });

    if (p.upto === "s6") {
      R.push(r);
      return;
    }

    // Stage 6 Credit Note
    cn++;
    const b = creditBasis(r);
    r.credit = {
      required: "Yes",
      status: "Issued",
      number: "CN/26-27/" + cn,
      date: add(p.d, 10),
      amount: String(b.base),
      tax: String(b.tax),
      adjReason: "",
      notReqReason: "",
      remarks: "",
      issuedBy: "Neha Gupta"
    };
    r.attachments.credit = [
      docCopy("Credit Note", r.credit.number, [
        ["Customer", cObj.name],
        ["Date", fdate(r.credit.date)],
        ["Amount", money(r.credit.amount)],
        ["Tax", money(r.credit.tax)],
        ["Against Return", r.no]
      ])
    ];
    r.stage = 7;
    r.status = "Completed";
    r.completedAt = add(p.d, 10) + "T15:00:00.000Z";
    r.history.push({ at: add(p.d, 10) + "T15:00:00.000Z", by: "Neha Gupta", role: "Accounts", action: "Credit note issued", detail: `CN ${r.credit.number}` });

    R.push(r);
  });

  return { returns: R, movements: M };
}
