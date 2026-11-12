import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  X,
  Save,
  Layers,
  CalendarDays,
  Eye,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { useMagicToast } from "../../../context/MagicToastContext";
import {
  fetchMasterTatRules,
  upsertMasterTatRule,
  deleteMasterTatRule,
} from "../../purchase/services/purchaseMasterApi";
import {
  TAT_TYPES,
  TAT_PRESETS,
  DAY_NAMES_SHORT,
  DAY_NAMES_FULL,
  DEFAULT_CALENDAR,
  COLUMN_CATALOG,
  STAGE_DATE_FIELDS,
  STAGE_RECORD_DATES,
  loadTatCalendar,
  saveTatCalendar,
  fetchChecklistHolidays,
  getStageDefaultIndex,
  explainTat,
  describeTatRule,
  formatClock,
  formatDateTime,
  toMinutes,
} from "../../../utils/tatCalendar";

const SYSTEM_OPTIONS = [
  "Purchase System",
  "Purchase Return",
  "Order Management",
  "Leads System",
];

const filterStagesForSystem = (systemName, stages = []) => {
  if (systemName === "Order Management") {
    return stages.filter(
      (s) =>
        s.trim().toLowerCase() !== "received order" &&
        s.trim().toLowerCase() !== "received_order"
    );
  }
  if (systemName === "Purchase System") {
    return stages.filter((s) => {
      const lower = s.trim().toLowerCase();
      return (
        lower !== "create indent" &&
        lower !== "create_indent" &&
        lower !== "order cancel" &&
        lower !== "order_cancel"
      );
    });
  }
  return stages;
};

const SYSTEM_STAGES_MAP = {
  "Purchase System": [
    "Delegate Approver",
    "Indent Approval",
    "Quotation Submission",
    "Approved Vendor",
    "Make PO",
    "Payment",
    "Follow UP / Lifting",
    "Transporter Follow-Up",
    "Material Received (GRN)",
    "Tally Billing",
  ],
  "Purchase Return": [
    "Return Approval",
    "Ask Credit Note",
    "Arrange Logistics",
    "Issue Debit Note",
    "Return From Plant",
  ],
  "Order Management": [
    "Check & Validation",
    "Stock Verification",
    "Production Planning",
    "Dispatch Planning",
    "Packaging",
    "Vehicle Logistic",
    "Make Challan",
    "Make Invoice",
    "Confirm Delivery",
    "Payments",
  ],
  "Leads System": [
    "Followup Tracker",
    "Pending Quotation",
    "Quotation Tracker",
  ],
};

const UNIT_OPTIONS = [
  { label: "Days (day)", value: "day" },
  { label: "Hours (hr)", value: "hr" },
  { label: "Minutes (min)", value: "min" },
];

const DEFAULT_TAT_RULES = [
  {
    id: "tat-1b",
    system_name: "Purchase System",
    stage_name: "Delegate Approver",
    time_value: 4,
    unit: "hr",
    description: "Assign pending purchase indents to approvers",
  },
  {
    id: "tat-2",
    system_name: "Purchase System",
    stage_name: "Indent Approval",
    time_value: 24,
    unit: "hr",
    description: "SOP for technical and commercial indent clearance",
  },
  {
    id: "tat-3",
    system_name: "Purchase System",
    stage_name: "Quotation Submission",
    time_value: 48,
    unit: "hr",
    description: "Multi-vendor quote comparison and RFQ turnaround",
  },
  {
    id: "tat-4",
    system_name: "Purchase System",
    stage_name: "Approved Vendor",
    time_value: 12,
    unit: "hr",
    description: "Selection of best commercial quote and sanctioning",
  },
  {
    id: "tat-5",
    system_name: "Purchase System",
    stage_name: "Make PO",
    time_value: 12,
    unit: "hr",
    description: "Formal Purchase Order issue and vendor acknowledgement",
  },
  {
    id: "tat-6",
    system_name: "Purchase System",
    stage_name: "Payment",
    time_value: 24,
    unit: "hr",
    description: "Advance or dispatch payment clearance",
  },
  {
    id: "tat-7",
    system_name: "Purchase System",
    stage_name: "Follow UP / Lifting",
    time_value: 48,
    unit: "hr",
    description: "Material ready at supplier premises and vehicle placement",
  },
  {
    id: "tat-8",
    system_name: "Purchase System",
    stage_name: "Transporter Follow-Up",
    time_value: 72,
    unit: "hr",
    description: "In-transit tracking from supplier plant to company gate",
  },
  {
    id: "tat-9",
    system_name: "Purchase System",
    stage_name: "Material Received (GRN)",
    time_value: 8,
    unit: "hr",
    description: "Physical inspection and gate inward entry",
  },
  {
    id: "tat-10",
    system_name: "Purchase System",
    stage_name: "Tally Billing",
    time_value: 24,
    unit: "hr",
    description: "Supplier bill verification and ERP voucher booking",
  },
  // Order Management Default SLA Rules
  {
    id: "tat-o2d-2",
    system_name: "Order Management",
    stage_name: "Check & Validation",
    time_value: 4,
    unit: "hr",
    description: "Item specifications, rates, and party terms verified",
  },
  {
    id: "tat-o2d-3",
    system_name: "Order Management",
    stage_name: "Stock Verification",
    time_value: 8,
    unit: "hr",
    description: "Stock verified to approve dispatch or schedule production",
  },
  {
    id: "tat-o2d-4",
    system_name: "Order Management",
    stage_name: "Production Planning",
    time_value: 48,
    unit: "hr",
    description: "Manufacture shortage quantities and produce finished goods",
  },
  {
    id: "tat-o2d-5",
    system_name: "Order Management",
    stage_name: "Dispatch Planning",
    time_value: 12,
    unit: "hr",
    description: "Schedule ready quantities and allocate dispatch lots",
  },
  {
    id: "tat-o2d-6",
    system_name: "Order Management",
    stage_name: "Packaging",
    time_value: 8,
    unit: "hr",
    description: "Quality packaging and barcode labeling before vehicle loading",
  },
  {
    id: "tat-o2d-7",
    system_name: "Order Management",
    stage_name: "Vehicle Logistic",
    time_value: 12,
    unit: "hr",
    description: "Transporter booking, vehicle placement, and driver assignment",
  },
  {
    id: "tat-o2d-8",
    system_name: "Order Management",
    stage_name: "Make Challan",
    time_value: 4,
    unit: "hr",
    description: "Formal delivery challan generation with transport details",
  },
  {
    id: "tat-o2d-9",
    system_name: "Order Management",
    stage_name: "Make Invoice",
    time_value: 4,
    unit: "hr",
    description: "Tax invoice generation with HSN, GST, and total value breakdown",
  },
  {
    id: "tat-o2d-10",
    system_name: "Order Management",
    stage_name: "Confirm Delivery",
    time_value: 48,
    unit: "hr",
    description: "Shipment delivered to customer site and POD acknowledgement confirmed",
  },
  {
    id: "tat-o2d-11",
    system_name: "Order Management",
    stage_name: "Payments",
    time_value: 24,
    unit: "hr",
    description: "Advance, freight, and customer invoice payment settlement",
  },
  {
    id: "tat-leads-1",
    system_name: "Leads System",
    stage_name: "Followup Tracker",
    time_value: 24,
    unit: "hr",
    description: "Time to complete first or scheduled follow-up call",
  },
  {
    id: "tat-leads-2",
    system_name: "Leads System",
    stage_name: "Pending Quotation",
    time_value: 48,
    unit: "hr",
    description: "Time to prepare and issue quotation after enquiry confirmation",
  },
  {
    id: "tat-leads-3",
    system_name: "Leads System",
    stage_name: "Quotation Tracker",
    time_value: 48,
    unit: "hr",
    description: "Time to follow up on quotation and record order decision",
  },
];


const EMPTY_CFG = {
  sign: -1,
  working_days: true,
  lead_days: 0,
  x: 2,
  time: "17:00",
  days_after: 0,
  cutoff: true,
  base_column: "default",
  ref_stage: "",
  ref_field: "",
  t_mode: "lead",
  target_column: "",
  lead_column: "",
};

const toLocalInput = (d) => {
  const x = new Date(d);
  x.setSeconds(0, 0);
  const off = x.getTimezoneOffset() * 60000;
  return new Date(x.getTime() - off).toISOString().slice(0, 16);
};

const fieldCls =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none";
const labelCls = "font-bold text-slate-700 dark:text-slate-300";

const presetLabel = (type, p) => {
  if (type === "specific_time") return formatClock(toMinutes(p));
  if (type === "minutes") {
    if (p >= 60) return p % 60 ? `${Math.floor(p / 60)} hr ${p % 60} min` : `${p / 60} hr`;
    return `${p} min`;
  }
  if (type === "hours") return `${p} hr`;
  return `${p} day${p === 1 ? "" : "s"}`;
};

export default function TatMasterSettingsView({ activeUser }) {
  const { showToast } = useMagicToast();

  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState(DEFAULT_TAT_RULES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSystemFilter, setSelectedSystemFilter] = useState("all");

  // Working calendar & Checklist holidays
  const [calendar, setCalendar] = useState(DEFAULT_CALENDAR);
  const [checklistHolidays, setChecklistHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [previewStart, setPreviewStart] = useState(() => toLocalInput(new Date()));

  const [form, setForm] = useState({
    system_name: "Purchase System",
    stage_name: "",
    tat_type: "",
    time_value: 24,
    unit: "hr",
    description: "",
    cfg: { ...EMPTY_CFG },
  });

  const availableStages = useMemo(() => {
    const predefined = filterStagesForSystem(
      form.system_name,
      SYSTEM_STAGES_MAP[form.system_name] || []
    );
    const existingInRules = (rules || [])
      .filter((r) => (r.system_name || "Purchase System") === form.system_name)
      .map((r) => r.stage_name || r.section_name || r.stage)
      .filter(Boolean);
    const combined = Array.from(new Set([...predefined, ...existingInRules]));
    return filterStagesForSystem(form.system_name, combined);
  }, [form.system_name, rules]);

  const columnOptions = useMemo(() => {
    const cat = COLUMN_CATALOG[form.system_name] || { base: [], lead: [], target: [], actuals: false };

    // Full workflow stages in strict sequence from the starting point of the system
    const fullStages =
      form.system_name === "Purchase System"
        ? ["Create Indent", ...(SYSTEM_STAGES_MAP["Purchase System"] || [])]
        : form.system_name === "Order Management"
        ? ["Received Order", ...(SYSTEM_STAGES_MAP["Order Management"] || [])]
        : (SYSTEM_STAGES_MAP[form.system_name] || []);

    const curIdx = fullStages.findIndex(
      (s) => s.toLowerCase() === (form.stage_name || "").toLowerCase()
    );
    const precedingStages = curIdx > 0 ? fullStages.slice(0, curIdx) : [];

    const refFieldsFor = (stage) => [
      ...STAGE_DATE_FIELDS,
      ...((STAGE_RECORD_DATES[form.system_name] || {})[stage] || []).map((c) => ({
        value: `rec:${c.key}`,
        label: c.label,
      })),
    ];

    // Build structured stage date options grouped per stage in sequence
    const stageDateOptions = precedingStages.map((st) => ({
      stage: st,
      fields: refFieldsFor(st).map((f) => ({
        value: `${st}:::${f.value}`,
        label: `[${st}] ${f.label}`,
        fieldKey: f.value,
        fieldLabel: f.label,
      })),
    }));

    return {
      precedingStages,
      stageDateOptions,
      prevStage: precedingStages.length ? precedingStages[precedingStages.length - 1] : "",
      refFieldsFor,
      earlierStages: precedingStages,
      base: [
        { value: "default", label: "Default start of this stage" },
        ...cat.base.map((c) => ({ value: `record:${c.key}`, label: c.label })),
        ...precedingStages.flatMap((st) => [
          { value: `stage_planned:${st}`, label: `[${st}] Planned date` },
          { value: `stage:${st}`, label: `[${st}] Actual completion date` },
        ]),
      ],
      lead: cat.lead,
      target: [
        ...cat.target,
        ...precedingStages.flatMap((st) => [
          { key: `stage_planned:${st}`, label: `[${st}] Planned date` },
          { key: `stage:${st}`, label: `[${st}] Actual completion date` },
        ]),
      ],
    };
  }, [form.system_name, form.stage_name]);

  const currentStageFieldValue = useMemo(() => {
    if (!form.cfg.ref_field) return "";
    const stage = form.cfg.ref_stage || columnOptions.prevStage || "";
    if (!stage) return "";
    return `${stage}:::${form.cfg.ref_field}`;
  }, [form.cfg.ref_stage, form.cfg.ref_field, columnOptions.prevStage]);

  // Sort rules naturally by system and order_index / workflow sequence
  const sortRulesList = (rawRules = []) => {
    return [...rawRules].sort((a, b) => {
      const sysA = a.system_name || a.system || "Purchase System";
      const sysB = b.system_name || b.system || "Purchase System";
      if (sysA !== sysB) {
        return sysA.localeCompare(sysB);
      }
      const stgA = a.stage_name || a.section_name || a.stage || "";
      const stgB = b.stage_name || b.section_name || b.stage || "";

      // Check localStorage cached custom order first
      let cachedOrderA = null;
      let cachedOrderB = null;
      try {
        const cache = JSON.parse(localStorage.getItem(`tat_stage_order_${sysA}`) || "{}");
        cachedOrderA = cache[stgA.toLowerCase()];
        cachedOrderB = cache[stgB.toLowerCase()];
      } catch (e) { /* ignore */ }

      const orderA = a.order_index ?? a.tat_config?.order_index ?? cachedOrderA ?? getStageDefaultIndex(sysA, stgA);
      const orderB = b.order_index ?? b.tat_config?.order_index ?? cachedOrderB ?? getStageDefaultIndex(sysB, stgB);

      return orderA - orderB;
    });
  };

  const loadCalendar = async (force = false) => {
    const cal = await loadTatCalendar(force);
    setCalendar(cal);
    try {
      const hols = await fetchChecklistHolidays();
      setChecklistHolidays(hols);
    } catch (e) {
      console.warn("Could not load checklist holidays:", e);
    }
  };

  const loadRules = async () => {
    setLoading(true);
    try {
      await loadCalendar();
      const data = await fetchMasterTatRules();
      if (data && data.length > 0) {
        const cleaned = data.filter((r) => {
          const sys = r.system_name || r.system || "";
          const stage = (r.stage_name || r.section_name || r.stage || "")
            .trim()
            .toLowerCase();
          if (sys === "Order Management") {
            if (stage === "received order" || stage === "received_order") return false;
          }
          if (sys === "Purchase System") {
            if (
              stage === "create indent" ||
              stage === "create_indent" ||
              stage === "order cancel" ||
              stage === "order_cancel"
            ) {
              return false;
            }
          }
          return true;
        });
        setRules(sortRulesList(cleaned));
      } else {
        setRules(sortRulesList(DEFAULT_TAT_RULES));
      }
    } catch (err) {
      console.warn("Could not fetch DB TAT rules, using defaults:", err);
      setRules(sortRulesList(DEFAULT_TAT_RULES));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleMoveStage = async (rule, direction) => {
    const sys = rule.system_name || rule.system || "Purchase System";
    const sysRules = rules.filter((r) => (r.system_name || r.system || "Purchase System") === sys);
    const otherRules = rules.filter((r) => (r.system_name || r.system || "Purchase System") !== sys);

    const curIdx = sysRules.findIndex(
      (r) => (r.id && r.id === rule.id) || (r.stage_name === rule.stage_name)
    );
    if (curIdx === -1) return;

    const targetIdx = direction === "up" ? curIdx - 1 : curIdx + 1;
    if (targetIdx < 0 || targetIdx >= sysRules.length) return;

    // Swap positions
    const newSysRules = [...sysRules];
    const temp = newSysRules[curIdx];
    newSysRules[curIdx] = newSysRules[targetIdx];
    newSysRules[targetIdx] = temp;

    // Assign sequential order_index
    const updatedSysRules = newSysRules.map((r, i) => ({
      ...r,
      order_index: i + 1,
      tat_config: {
        ...(r.tat_config || {}),
        order_index: i + 1,
      },
    }));

    const nextRules = [...otherRules, ...updatedSysRules];
    setRules(sortRulesList(nextRules));

    // Cache order in localStorage for instant persistence
    try {
      const orderMap = {};
      updatedSysRules.forEach((r, i) => {
        const stage = r.stage_name || r.section_name || r.stage;
        if (stage) orderMap[stage.toLowerCase()] = i + 1;
      });
      localStorage.setItem(`tat_stage_order_${sys}`, JSON.stringify(orderMap));
    } catch (e) { /* ignore */ }

    // Persist to Supabase
    try {
      await Promise.allSettled([
        upsertMasterTatRule(updatedSysRules[curIdx]),
        upsertMasterTatRule(updatedSysRules[targetIdx]),
      ]);
      showToast?.(`Stage "${rule.stage_name || rule.stage}" moved ${direction === "up" ? "forward (up)" : "backward (down)"}`, "success");
    } catch (err) {
      console.warn("Could not persist rule order to DB:", err);
      showToast?.(`Stage "${rule.stage_name || rule.stage}" reordered locally`, "info");
    }
  };

  const handleResetOrder = (targetSys = selectedSystemFilter) => {
    const sys = targetSys !== "all" ? targetSys : "Purchase System";
    const sysRules = rules.filter((r) => (r.system_name || r.system || "Purchase System") === sys);
    const otherRules = rules.filter((r) => (r.system_name || r.system || "Purchase System") !== sys);

    const resetSysRules = sysRules.map((r) => {
      const stg = r.stage_name || r.section_name || r.stage || "";
      const defaultIdx = getStageDefaultIndex(sys, stg);
      return {
        ...r,
        order_index: defaultIdx + 1,
        tat_config: {
          ...(r.tat_config || {}),
          order_index: defaultIdx + 1,
        },
      };
    });

    try {
      localStorage.removeItem(`tat_stage_order_${sys}`);
    } catch (e) { /* ignore */ }

    const nextRules = [...otherRules, ...resetSysRules];
    setRules(sortRulesList(nextRules));
    showToast?.(`Reset ${sys} stages to default workflow sequence`, "success");
  };

  /* ----------------------------- calendar ----------------------------- */
  const draftCalendar = useMemo(
    () => ({
      ...calendar,
      holidays: checklistHolidays.map((h) => h.holiday_date).filter(Boolean),
    }),
    [calendar, checklistHolidays]
  );

  const toggleOffDay = (day) => {
    setCalendar((prev) => {
      const has = prev.off_days.includes(day);
      return {
        ...prev,
        off_days: has ? prev.off_days.filter((d) => d !== day) : [...prev.off_days, day],
      };
    });
  };

  const handleSaveCalendar = async () => {
    if (toMinutes(calendar.work_end) <= toMinutes(calendar.work_start)) {
      showToast?.("Office end time must be after the start time.", "warning");
      return;
    }
    if (calendar.off_days.length >= 7) {
      showToast?.("All days cannot be off. Keep at least one working day.", "warning");
      return;
    }
    setSavingCalendar(true);
    try {
      const calendarToSave = {
        ...calendar,
        holidays: checklistHolidays.map((h) => h.holiday_date).filter(Boolean),
      };
      await saveTatCalendar(calendarToSave);
      showToast?.("Working calendar saved successfully.", "success");
    } catch (err) {
      console.error("Save calendar error:", err);
      showToast?.(`Could not save working calendar: ${err.message}`, "error");
    } finally {
      setSavingCalendar(false);
    }
  };

  /* ------------------------------ form ------------------------------ */
  const setCfg = (patch) => setForm((f) => ({ ...f, cfg: { ...f.cfg, ...patch } }));

  const selectType = (typeId) => {
    const type = TAT_TYPES.find((t) => t.id === typeId);
    setForm((f) => {
      const next = { ...f, tat_type: typeId };
      if (type) next.unit = type.unit;
      if (typeId === "hours" && !(Number(f.time_value) > 0)) next.time_value = 4;
      if (typeId === "minutes" && !(Number(f.time_value) > 0)) next.time_value = 30;
      if (typeId === "days" && !(Number(f.time_value) > 0)) next.time_value = 2;
      return next;
    });
  };

  const openNewModal = () => {
    setEditingRule(null);
    const defaultSys =
      selectedSystemFilter !== "all" ? selectedSystemFilter : "Purchase System";
    const stagesForSys = filterStagesForSystem(
      defaultSys,
      SYSTEM_STAGES_MAP[defaultSys] || []
    );
    const defaultStage = stagesForSys[0] || "";
    const matchedDefault = DEFAULT_TAT_RULES.find(
      (d) =>
        d.system_name === defaultSys &&
        d.stage_name.toLowerCase() === defaultStage.toLowerCase()
    );
    setForm({
      system_name: defaultSys,
      stage_name: defaultStage,
      tat_type: "",
      time_value: matchedDefault ? matchedDefault.time_value : "",
      unit: matchedDefault ? matchedDefault.unit : "hr",
      description: matchedDefault ? matchedDefault.description : "",
      cfg: { ...EMPTY_CFG },
    });
    setPreviewStart(toLocalInput(new Date()));
    setModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    const cfg = { ...EMPTY_CFG, ...(rule.tat_config || {}) };
    const type = rule.tat_type || "";
    setForm({
      system_name: rule.system_name || rule.system || "Purchase System",
      stage_name: rule.stage_name || rule.section_name || rule.stage || "",
      tat_type: type,
      time_value:
        type === "t_minus_x"
          ? cfg.x ?? rule.time_value ?? 0
          : rule.time_value || rule.completion_time || rule.sla_days || "",
      unit: rule.unit || rule.time_unit || "hr",
      description: rule.description || "",
      cfg,
    });
    setPreviewStart(toLocalInput(new Date()));
    setModalOpen(true);
  };

  const buildTatConfig = () => {
    const c = form.cfg;
    const base = {
      base_column: c.base_column || "default",
      ref_stage: c.ref_field ? (c.ref_stage || columnOptions.prevStage || "") : "",
      ref_field: c.ref_field || "",
    };
    if (form.tat_type === "t_minus_x") {
      return {
        ...base,
        x: Number(form.time_value) || 0,
        sign: Number(c.sign) === 1 ? 1 : -1,
        working_days: c.working_days !== false,
        lead_days: Number(c.lead_days) || 0,
        t_mode: c.t_mode === "target" ? "target" : "lead",
        target_column: c.target_column || "",
        lead_column: c.lead_column || "",
      };
    }
    if (form.tat_type === "specific_time") {
      return {
        ...base,
        time: c.time || "17:00",
        days_after: Number(c.days_after) || 0,
        cutoff: c.cutoff !== false,
      };
    }
    return base;
  };

  const validateForm = () => {
    if (!form.stage_name.trim()) return "Please select a stage.";
    const type = form.tat_type;
    const v = Number(form.time_value);
    if (!type) {
      if (!(v > 0)) return "SLA time value must be greater than 0.";
    } else if (type === "t_minus_x") {
      if (!(v >= 0) || !Number.isInteger(v)) return "x must be a whole number, 0 or more.";
    } else if (type === "specific_time") {
      if (!form.cfg.time) return "Please enter the fixed time.";
      const d = Number(form.cfg.days_after);
      if (!(d >= 0) || !Number.isInteger(d)) return "Days after must be a whole number, 0 or more.";
    } else if (!(v > 0)) {
      return "TAT must be greater than 0.";
    } else if ((type === "minutes" || type === "days") && !Number.isInteger(v)) {
      return type === "minutes"
        ? "Minutes must be a whole number."
        : "Days must be a whole number.";
    }
    return "";
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    const problem = validateForm();
    if (problem) {
      showToast?.(problem, "warning");
      return;
    }
    const finalStageName = form.stage_name.trim();
    const isAdv = Boolean(form.tat_type);
    const storedValue =
      form.tat_type === "specific_time" || form.tat_type === "t_minus_x"
        ? Math.max(1, Number(form.time_value) || 1)
        : Number(form.time_value);

    try {
      const payload = {
        system_name: form.system_name,
        section_name: finalStageName,
        stage_name: finalStageName,
        completion_time: storedValue,
        time_value: storedValue,
        time_unit: form.unit,
        unit: form.unit,
        description: form.description,
        tat_type: isAdv ? form.tat_type : null,
        tat_config: isAdv ? buildTatConfig() : {},
        ...(editingRule?.id && !String(editingRule.id).startsWith("tat-")
          ? { id: editingRule.id }
          : {}),
      };

      try {
        await upsertMasterTatRule(payload);
        await loadRules();
      } catch (dbErr) {
        console.warn("Supabase upsert note:", dbErr);
        showToast?.(
          `Saved locally only. Database error: ${dbErr.message || "unknown"}. Run the TAT SQL migration.`,
          "warning"
        );
        if (editingRule) {
          setRules((prev) =>
            prev.map((r) =>
              r.id === editingRule.id ? { ...r, ...payload, id: editingRule.id } : r
            )
          );
        } else {
          setRules((prev) => [{ ...payload, id: `tat-${Date.now()}` }, ...prev]);
        }
      }

      showToast?.(
        editingRule ? "TAT Rule updated successfully!" : "TAT Rule created successfully!",
        "success"
      );
      setModalOpen(false);
      setEditingRule(null);
    } catch (err) {
      console.error("Save TAT Rule error:", err);
      showToast?.(`Failed: ${err.message}`, "error");
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Are you sure you want to remove this TAT SLA rule?")) return;
    try {
      if (!String(id).startsWith("tat-")) {
        await deleteMasterTatRule(id);
      }
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast?.("TAT rule removed successfully", "success");
    } catch (err) {
      console.error("Delete TAT rule error:", err);
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast?.("TAT rule removed locally", "info");
    }
  };

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const sys = r.system_name || r.system || "";
      const stg = r.stage_name || r.stage || "";
      const s = searchTerm.toLowerCase();
      if (selectedSystemFilter !== "all" && sys !== selectedSystemFilter) return false;
      return !s || sys.toLowerCase().includes(s) || stg.toLowerCase().includes(s);
    });
  }, [rules, searchTerm, selectedSystemFilter]);

  /* ----------------------------- preview ----------------------------- */
  const preview = useMemo(() => {
    if (!modalOpen) return null;
    const start = new Date(previewStart);
    if (isNaN(start.getTime())) return { error: "Pick a valid sample start time." };
    if (validateForm()) return { error: "Complete the fields above to see the preview." };

    if (!form.tat_type) {
      const v = Number(form.time_value);
      const mins = form.unit === "day" ? v * 1440 : form.unit === "min" ? v : v * 60;
      const out = new Date(start.getTime() + mins * 60000);
      const refNote = form.cfg.ref_stage && form.cfg.ref_field
        ? `Starts from [${form.cfg.ref_stage}] (${form.cfg.ref_field}). `
        : "";
      return {
        out,
        withTime: true,
        log: [
          `${refNote}Standard duration: ${v} ${form.unit} of continuous elapsed time from the start. Office hours, off days and holidays are not applied.`,
        ],
      };
    }
    const result = explainTat(
      start,
      {
        tat_type: form.tat_type,
        time_value: form.tat_type === "t_minus_x" ? Number(form.time_value) : Number(form.time_value),
        tat_config: buildTatConfig(),
      },
      { calendar: draftCalendar }
    );
    if (result && form.cfg.ref_stage && form.cfg.ref_field) {
      result.log = [
        `Base date referenced from [${form.cfg.ref_stage}] (${form.cfg.ref_field.startsWith("rec:") ? form.cfg.ref_field.slice(4) : form.cfg.ref_field})`,
        ...(result.log || []),
      ];
    }
    return result || { error: "Could not calculate a preview." };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, previewStart, form, draftCalendar]);

  const selectedType = TAT_TYPES.find((t) => t.id === form.tat_type);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Turn Around Time (TAT) & SLA Master Rules
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Set how the planned time of each stage is calculated: by working hours, minutes,
            days, a T-x formula or a fixed time. All rules follow the working calendar below.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadRules}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add TAT Rule</span>
          </button>
        </div>
      </div>

      {/* Working Calendar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <button
          type="button"
          onClick={() => setShowCalendar((v) => !v)}
          className="w-full flex items-center gap-2 text-left cursor-pointer"
        >
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Working Calendar</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Applies to every system. Hours, minutes and days are counted only inside these
              working times.
            </p>
          </div>
          <span className="text-[11px] font-bold text-blue-600">{showCalendar ? "Hide" : "Show"}</span>
        </button>

        {showCalendar && (
        <>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className={labelCls}>Office start</label>
            <input
              type="time"
              value={calendar.work_start}
              onChange={(e) => setCalendar({ ...calendar, work_start: e.target.value })}
              className={fieldCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Office end</label>
            <input
              type="time"
              value={calendar.work_end}
              onChange={(e) => setCalendar({ ...calendar, work_end: e.target.value })}
              className={fieldCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Weekly off days</label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_NAMES_SHORT.map((d, i) => {
                const on = calendar.off_days.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    title={DAY_NAMES_FULL[i]}
                    onClick={() => toggleOffDay(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      on
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60"
                        : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Checklist Synced Holidays */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Holidays (Synced from Checklist System)</span>
              </label>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {checklistHolidays.length} Holidays
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                setLoadingHolidays(true);
                try {
                  const hols = await fetchChecklistHolidays();
                  setChecklistHolidays(hols);
                  showToast?.("Holidays re-synced from Checklist system", "success");
                } finally {
                  setLoadingHolidays(false);
                }
              }}
              disabled={loadingHolidays}
              className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-all cursor-pointer"
              title="Refresh holidays from Checklist"
            >
              <RefreshCw className={`w-3 h-3 ${loadingHolidays ? "animate-spin" : ""}`} />
              <span>Sync from Checklist</span>
            </button>
          </div>

          {checklistHolidays.length > 0 ? (
            <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {checklistHolidays.map((h, i) => (
                <div
                  key={h.id || i}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {h.holiday_name || "Holiday"}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {h.holiday_date}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-850 shrink-0">
                    Off Day
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
              Checklist system me abhi koi holiday configured nahi hai. Checklist &gt; Holiday section me dali gayi holidays yahan automatically show hongi aur TAT SLA me consider hongi.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveCalendar}
            disabled={savingCalendar}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            <span>{savingCalendar ? "Saving..." : "Save Working Calendar"}</span>
          </button>
        </div>
        </>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Filter System:
          </span>
          <select
            value={selectedSystemFilter}
            onChange={(e) => setSelectedSystemFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Systems ({rules.length})</option>
            {SYSTEM_OPTIONS.map((sys) => (
              <option key={sys} value={sys}>
                {sys}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleResetOrder()}
            title="Reset stages to standard workflow sequence"
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Reset Workflow Order</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search system or stage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* TAT Rules Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3 text-center">Move Stage</th>
                <th className="p-3">System Name</th>
                <th className="p-3">Stage Name</th>
                <th className="p-3">TAT Type</th>
                <th className="p-3 text-center">TAT</th>
                <th className="p-3">Description / SOP</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRules.map((r, idx) => {
                const typeInfo = TAT_TYPES.find((t) => t.id === r.tat_type);
                const sys = r.system_name || r.system || "Purchase System";
                const sysRules = rules.filter((item) => (item.system_name || item.system || "Purchase System") === sys);
                const sysIdx = sysRules.findIndex((item) => (item.id && item.id === r.id) || (item.stage_name === r.stage_name));
                const isFirst = sysIdx <= 0;
                const isLast = sysIdx >= sysRules.length - 1;

                return (
                  <tr
                    key={r.id || idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleMoveStage(r, "up")}
                          disabled={isFirst}
                          title={isFirst ? "First stage in workflow" : "Move stage forward (up)"}
                          className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStage(r, "down")}
                          disabled={isLast}
                          title={isLast ? "Last stage in workflow" : "Move stage backward (down)"}
                          className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                        <Layers className="w-3 h-3" />
                        {r.system_name || r.system || "Purchase System"}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      <div>{r.stage_name || r.stage || "—"}</div>
                      {r.tat_config?.ref_stage && r.tat_config?.ref_field && (
                        <div className="text-[11px] font-normal text-blue-600 dark:text-blue-400 mt-0.5">
                          From: [{r.tat_config.ref_stage}] {r.tat_config.ref_field.startsWith("rec:") ? r.tat_config.ref_field.slice(4) : r.tat_config.ref_field}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {typeInfo ? typeInfo.short : "Standard Duration"}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {describeTatRule(r)}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">
                      {r.description || "—"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(r.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                    No TAT SLA rules matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{editingRule ? "Edit TAT Rule" : "Add TAT Rule"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>
                    System Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.system_name}
                    onChange={(e) => {
                      const newSys = e.target.value;
                      const stagesForSys = filterStagesForSystem(
                        newSys,
                        SYSTEM_STAGES_MAP[newSys] || []
                      );
                      const firstStage = stagesForSys[0] || "";
                      const matchedDefault = DEFAULT_TAT_RULES.find(
                        (d) =>
                          d.system_name === newSys &&
                          d.stage_name.toLowerCase() === firstStage.toLowerCase()
                      );
                      setForm({
                        ...form,
                        system_name: newSys,
                        stage_name: firstStage,
                        time_value: matchedDefault ? matchedDefault.time_value : "",
                        unit: matchedDefault ? matchedDefault.unit : form.unit,
                        description: matchedDefault ? matchedDefault.description : "",
                      });
                    }}
                    className={`${fieldCls} cursor-pointer`}
                  >
                    {SYSTEM_OPTIONS.map((sys) => (
                      <option key={sys} value={sys}>
                        {sys}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>
                    Stage Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.stage_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matchedDefault = DEFAULT_TAT_RULES.find(
                        (d) =>
                          d.stage_name.toLowerCase() === val.toLowerCase() &&
                          (d.system_name === form.system_name || !d.system_name)
                      );
                      if (matchedDefault && !editingRule) {
                        setForm({
                          ...form,
                          stage_name: val,
                          time_value: matchedDefault.time_value,
                          unit: matchedDefault.unit,
                          description: matchedDefault.description || form.description,
                        });
                      } else {
                        setForm({ ...form, stage_name: val });
                      }
                    }}
                    className={`${fieldCls} cursor-pointer`}
                  >
                    <option value="">-- Select Stage Name --</option>
                    {availableStages.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preceding stages (in sequence) + which of their dates to count from */}
              {columnOptions.stageDateOptions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>
                      Count from date of previous stage / column:
                    </label>
                    {form.cfg.ref_stage && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        Selected Stage: {form.cfg.ref_stage}
                      </span>
                    )}
                  </div>
                  <select
                    value={currentStageFieldValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setCfg({ ref_stage: "", ref_field: "" });
                      } else {
                        const [selStage, selField] = val.split(":::");
                        setCfg({ ref_stage: selStage || "", ref_field: selField || "" });
                      }
                    }}
                    className={`${fieldCls} cursor-pointer`}
                  >
                    <option value="">Default start of this stage</option>
                    {columnOptions.stageDateOptions.map((grp) => (
                      <optgroup key={grp.stage} label={`── Stage: ${grp.stage} ──`}>
                        {grp.fields.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All preceding stages are shown in sequence with both Planned &amp; Actual columns.
                  </p>
                </div>
              )}

              {/* TAT type picker */}
              <div className="space-y-1.5">
                <label className={labelCls}>
                  How should the planned time be calculated? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: "",
                      label: "Standard Duration",
                      description: "Continuous elapsed time (days, hours or minutes). Ignores the working calendar.",
                    },
                    ...TAT_TYPES,
                  ].map((t) => {
                    const active = form.tat_type === t.id;
                    return (
                      <button
                        key={t.id || "standard"}
                        type="button"
                        onClick={() => selectType(t.id)}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/30"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white">{t.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type specific inputs */}
              {(form.tat_type === "" || ["hours", "minutes", "days"].includes(form.tat_type)) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={labelCls}>
                      {form.tat_type === "hours"
                        ? "Working hours"
                        : form.tat_type === "minutes"
                        ? "Working minutes"
                        : form.tat_type === "days"
                        ? "Working days"
                        : "SLA Time Value"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={form.tat_type === "hours" ? "0.25" : "1"}
                      step={form.tat_type === "hours" ? "0.25" : "1"}
                      required
                      placeholder="e.g. 24"
                      value={form.time_value}
                      onChange={(e) => setForm({ ...form, time_value: e.target.value })}
                      className={`${fieldCls} font-mono`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Time Unit</label>
                    {form.tat_type ? (
                      <div className={`${fieldCls} bg-slate-50 dark:bg-slate-800/60 text-slate-500`}>
                        {UNIT_OPTIONS.find((u) => u.value === form.unit)?.label}
                      </div>
                    ) : (
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        className={fieldCls}
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {form.tat_type === "t_minus_x" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Direction</label>
                      <select
                        value={form.cfg.sign}
                        onChange={(e) => setCfg({ sign: Number(e.target.value) })}
                        className={fieldCls}
                      >
                        <option value={-1}>T - (before)</option>
                        <option value={1}>T + (after)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>
                        x (days) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.time_value}
                        onChange={(e) => setForm({ ...form, time_value: e.target.value })}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Lead time (days)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.cfg.lead_days}
                        onChange={(e) => setCfg({ lead_days: e.target.value })}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>How is T (final date) found?</label>
                    <select
                      value={form.cfg.t_mode}
                      onChange={(e) => setCfg({ t_mode: e.target.value })}
                      className={`${fieldCls} cursor-pointer`}
                    >
                      <option value="lead">Base date + Lead time column</option>
                      <option value="target" disabled={columnOptions.target.length === 0}>
                        Use a target date column directly
                      </option>
                    </select>
                  </div>
                  {form.cfg.t_mode === "target" ? (
                    <div className="space-y-1">
                      <label className={labelCls}>Target date column (T)</label>
                      <select
                        value={form.cfg.target_column}
                        onChange={(e) => setCfg({ target_column: e.target.value })}
                        className={`${fieldCls} cursor-pointer`}
                      >
                        <option value="">-- Select column --</option>
                        {columnOptions.target.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className={labelCls}>Lead time column (days)</label>
                      <select
                        value={form.cfg.lead_column}
                        onChange={(e) => setCfg({ lead_column: e.target.value })}
                        className={`${fieldCls} cursor-pointer`}
                      >
                        <option value="">Use the fixed lead time above</option>
                        {columnOptions.lead.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    T = base date + lead time, or the chosen target date. If the column is empty
                    on a record, the fixed lead time above is used.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.cfg.working_days !== false}
                      onChange={(e) => setCfg({ working_days: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      <b className="text-slate-800 dark:text-slate-200">Count working days only</b>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Skips off days and holidays so the date never lands on a day off.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {form.tat_type === "specific_time" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelCls}>
                        Time of day <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={form.cfg.time}
                        onChange={(e) => setCfg({ time: e.target.value })}
                        className={fieldCls}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Working days after (0 = same day)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.cfg.days_after}
                        onChange={(e) => setCfg({ days_after: e.target.value })}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.cfg.cutoff !== false}
                      onChange={(e) => setCfg({ cutoff: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      <b className="text-slate-800 dark:text-slate-200">Apply cut-off</b>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        If the entry arrives after the fixed time, move to the next working day.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {/* Start point (base column) */}
              {form.tat_type && (
                <div className="space-y-1">
                  <label className={labelCls}>
                    {form.tat_type === "t_minus_x" ? "Base date column" : "Base column (start point)"}
                  </label>
                  <select
                    value={form.cfg.base_column || "default"}
                    onChange={(e) => setCfg({ base_column: e.target.value })}
                    className={`${fieldCls} cursor-pointer`}
                  >
                    {columnOptions.base.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose which column's date and time the TAT is counted from. If that column
                    is empty on a record, the default start is used.
                  </p>
                </div>
              )}

              {/* Quick presets */}
              {form.tat_type && TAT_PRESETS[form.tat_type] && (
                <div className="flex flex-wrap gap-1.5">
                  {TAT_PRESETS[form.tat_type].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        form.tat_type === "specific_time"
                          ? setCfg({ time: p })
                          : setForm({ ...form, time_value: p })
                      }
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50 cursor-pointer"
                    >
                      {presetLabel(form.tat_type, p)}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className={labelCls}>Description / Escalation Rule</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or SOP instructions..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Live preview */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Live Preview</span>
                  <span className="font-semibold text-slate-400">
                    ({selectedType ? selectedType.short : "Standard Duration"})
                  </span>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Sample start date and time</label>
                  <input
                    type="datetime-local"
                    value={previewStart}
                    onChange={(e) => setPreviewStart(e.target.value)}
                    className={fieldCls}
                  />
                </div>
                {preview?.error ? (
                  <p className="text-slate-500 dark:text-slate-400">{preview.error}</p>
                ) : preview ? (
                  <div className="space-y-2">
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      Planned: {formatDateTime(preview.out, preview.withTime)}
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                      {preview.log.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Save TAT Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
