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
  getTatType,
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
  describeTatRule,
  formatClock,
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
  reverse_mode: "stage",
};

const fieldCls =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none";
const labelCls = "font-bold text-slate-700 dark:text-slate-300";

export default function TatMasterSettingsView() {
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
      await saveTatCalendar(draftCalendar);
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

  // Available T (final date) options for T-x formula
  const tFinalDateOptions = useMemo(() => {
    const sys = form.system_name || "Purchase System";
    const fullStages = filterStagesForSystem(sys, SYSTEM_STAGES_MAP[sys] || []);
    const curIdx = fullStages.findIndex(
      (s) => s.toLowerCase() === form.stage_name.toLowerCase()
    );
    const stagesToInclude = curIdx > 0 ? fullStages.slice(0, curIdx) : fullStages;

    const stageOptions = [];
    stagesToInclude.forEach((stg, i) => {
      stageOptions.push({
        value: `stage:${stg}`,
        label: `${i + 1}. ${stg} — Actual`,
        stage: stg,
        field: "actual",
      });
      stageOptions.push({
        value: `stage_planned:${stg}`,
        label: `${i + 1}. ${stg} — Planned`,
        stage: stg,
        field: "planned",
      });
    });

    const recordOptions = [];
    if (sys === "Purchase System") {
      recordOptions.push({ value: "record:required_by", label: "Required By Date" });
      recordOptions.push({ value: "record:created_at", label: "Indent Created Date" });
    } else if (sys === "Order Management") {
      recordOptions.push({ value: "record:expected_delivery", label: "Expected Delivery Date" });
      recordOptions.push({ value: "record:order_date", label: "Order / PO Date" });
    } else if (sys === "Purchase Return") {
      recordOptions.push({ value: "record:request_date", label: "Return Request Date" });
    } else if (sys === "Leads System") {
      recordOptions.push({ value: "record:lead_created", label: "Lead Created Date" });
    }

    return [...stageOptions, ...recordOptions];
  }, [form.system_name, form.stage_name]);

  const selectedTLabel = useMemo(() => {
    const found = tFinalDateOptions.find((o) => o.value === form.cfg.target_column);
    return found ? found.label : (tFinalDateOptions[0]?.label || "9. Followup Lift — Actual");
  }, [tFinalDateOptions, form.cfg.target_column]);

  const selectedBaseLabel = useMemo(() => {
    if (!form.cfg.base_column || form.cfg.base_column === "default") {
      return "Default start of this stage";
    }
    const found = tFinalDateOptions.find((o) => o.value === form.cfg.base_column);
    return found ? found.label : form.cfg.base_column;
  }, [tFinalDateOptions, form.cfg.base_column]);

  const reverseStageOptions = useMemo(() => {
    const sys = form.system_name || "Purchase System";
    const fullStages = filterStagesForSystem(sys, SYSTEM_STAGES_MAP[sys] || []);
    const lastIndex = fullStages.length - 1;

    // 1. System target record dates (Expected Delivery Date, Required By Date)
    const systemTargets = [];
    if (sys === "Order Management") {
      systemTargets.push({
        value: "record:expected_delivery",
        label: "Expected Delivery Date (Record)",
        stage: "",
        fieldKey: "expected_delivery",
        isRecord: true,
      });
      systemTargets.push({
        value: "record:order_date",
        label: "Order / PO Date (Record)",
        stage: "",
        fieldKey: "order_date",
        isRecord: true,
      });
    } else if (sys === "Purchase System") {
      systemTargets.push({
        value: "record:required_by",
        label: "Required By Date (Record)",
        stage: "",
        fieldKey: "required_by",
        isRecord: true,
      });
      systemTargets.push({
        value: "record:created_at",
        label: "Indent Created Date (Record)",
        stage: "",
        fieldKey: "created_at",
        isRecord: true,
      });
    } else if (sys === "Purchase Return") {
      systemTargets.push({
        value: "record:request_date",
        label: "Return Request Date (Record)",
        stage: "",
        fieldKey: "request_date",
        isRecord: true,
      });
    } else if (sys === "Leads System") {
      systemTargets.push({
        value: "record:lead_created",
        label: "Lead Created Date (Record)",
        stage: "",
        fieldKey: "lead_created",
        isRecord: true,
      });
    }

    // 2. All Stages in sequence with Last Stage clearly marked
    const stages = fullStages.map((stg, i) => {
      const isLast = i === lastIndex;
      const stageNum = i + 1;
      const stageRecordDates = (STAGE_RECORD_DATES[sys] || {})[stg] || [];
      return {
        stageName: stg,
        stageNumber: stageNum,
        isLast,
        label: `${stageNum}. ${stg}${isLast ? " (Last Stage)" : ""}`,
        columns: [
          { value: `stage_planned:${stg}`, fieldKey: "planned", label: `[${stg}] Planned date (due time)` },
          { value: `stage:${stg}`, fieldKey: "actual", label: `[${stg}] Actual completion date` },
          { value: `stage_started:${stg}`, fieldKey: "started", label: `[${stg}] Started / Entry date` },
          ...stageRecordDates.map((col) => ({
            value: `stage_rec:${stg}:::rec:${col.key}`,
            fieldKey: `rec:${col.key}`,
            label: `[${stg}] ${col.label}`,
          })),
        ],
      };
    });

    const lastStage = stages[stages.length - 1] || null;

    return { systemTargets, stages, lastStage };
  }, [form.system_name]);

  const selectedReverseLabel = useMemo(() => {
    const targetCol = form.cfg.target_column || "";
    const matchedTarget = reverseStageOptions.systemTargets.find((t) => t.value === targetCol);
    if (matchedTarget) return matchedTarget.label;

    const refStage = form.cfg.ref_stage || reverseStageOptions.lastStage?.stageName || "";
    const refField = form.cfg.ref_field || "planned";

    const matchedStage = reverseStageOptions.stages.find(
      (s) => s.stageName.toLowerCase() === refStage.toLowerCase()
    );
    const stagePrefix = matchedStage ? `${matchedStage.stageNumber}. ${matchedStage.stageName}${matchedStage.isLast ? " (Last Stage)" : ""}` : refStage;

    let fieldTitle = "Planned date";
    if (refField === "actual") fieldTitle = "Actual completion date";
    else if (refField === "started") fieldTitle = "Started / Entry date";
    else if (String(refField).startsWith("rec:")) {
      const col = matchedStage?.columns?.find((c) => c.fieldKey === refField);
      fieldTitle = col ? col.label : refField.slice(4);
    }

    return `${stagePrefix} — ${fieldTitle}`;
  }, [form.cfg.target_column, form.cfg.ref_stage, form.cfg.ref_field, reverseStageOptions]);

  const ruleAlreadyExists = useMemo(() => {
    return rules.some(
      (r) =>
        (r.system_name === form.system_name || r.system === form.system_name) &&
        (r.stage_name === form.stage_name || r.section_name === form.stage_name) &&
        (!editingRule || r.id !== editingRule.id)
    );
  }, [rules, form.system_name, form.stage_name, editingRule]);

  const selectType = (typeId) => {
    const type = getTatType(typeId);
    setForm((f) => {
      const next = { ...f, tat_type: typeId };
      if (type) next.unit = type.unit;
      if (
        (typeId === "hin" || typeId === "hout" || typeId === "hours") &&
        !(Number(f.time_value) > 0)
      ) {
        next.time_value = 4;
      }
      if (
        (typeId === "min_in" || typeId === "min_out" || typeId === "minutes") &&
        !(Number(f.time_value) > 0)
      ) {
        next.time_value = 30;
      }
      if (typeId === "days" && !(Number(f.time_value) > 0)) {
        next.time_value = 2;
      }
      if (
        (typeId === "t_minus_x" || typeId === "tx") &&
        !(Number(f.time_value) >= 0)
      ) {
        next.time_value = 1;
      }
      if (
        (typeId === "reverse" || typeId === "reverse_tat") &&
        !(Number(f.time_value) >= 0)
      ) {
        next.time_value = 1;
      }
      if (typeId === "reverse" || typeId === "reverse_tat") {
        const lastStg = reverseStageOptions.lastStage?.stageName || "";
        const defaultTarget = reverseStageOptions.systemTargets[0]?.value || (lastStg ? `stage_planned:${lastStg}` : "");
        next.cfg = {
          ...next.cfg,
          reverse_mode: reverseStageOptions.systemTargets.length > 0 ? "record" : "stage",
          target_column: next.cfg.target_column || defaultTarget,
          ref_stage: next.cfg.ref_stage || lastStg,
          ref_field: next.cfg.ref_field || "planned",
          x: next.cfg.x || 1,
          unit: next.cfg.unit || "Days",
          sign: -1,
          working_days: next.cfg.working_days !== false,
        };
      }
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
    setForm({
      system_name: defaultSys,
      stage_name: defaultStage,
      tat_type: "t_minus_x",
      time_value: 1,
      unit: "Days",
      description: "",
      cfg: {
        ...EMPTY_CFG,
        sign: -1,
        unit: "Days",
        working_days: true,
      },
    });
    setModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    const cfg = { ...EMPTY_CFG, ...(rule.tat_config || {}) };
    let type = cfg.tat_type || rule.tat_type || "t_minus_x";
    if (type === "hours") type = "hin";
    else if (type === "hours_outside") type = "hout";
    else if (type === "minutes") type = "min_in";
    else if (type === "minutes_outside") type = "min_out";
    else if (type === "tx") type = "t_minus_x";
    else if (type === "spec") type = "specific_time";
    else if (type === "reverse_tat") type = "reverse";

    setForm({
      system_name: rule.system_name || rule.system || "Purchase System",
      stage_name: rule.stage_name || rule.section_name || rule.stage || "",
      tat_type: type,
      time_value:
        type === "t_minus_x" || type === "tx" || type === "reverse" || type === "reverse_tat"
          ? cfg.x ?? rule.time_value ?? 1
          : rule.time_value || rule.completion_time || rule.sla_days || 4,
      unit: cfg.unit || rule.unit || rule.time_unit || "Days",
      description: rule.description || "",
      cfg: {
        ...cfg,
        sign: type === "reverse" || type === "reverse_tat" ? -1 : (cfg.sign ?? -1),
        unit: cfg.unit || (type === "t_minus_x" || type === "tx" || type === "reverse" ? "Days" : rule.unit || "Days"),
        working_days: cfg.working_days !== false,
      },
    });
    setModalOpen(true);
  };

  const buildTatConfig = () => {
    const c = form.cfg;
    const base = {
      base_column: c.base_column || "default",
      ref_stage: c.ref_field ? (c.ref_stage || columnOptions.prevStage || "") : "",
      ref_field: c.ref_field || "",
    };
    if (form.tat_type === "reverse" || form.tat_type === "reverse_tat") {
      let targetCol = c.target_column || "";
      if (!targetCol) {
        if (c.ref_stage) {
          targetCol = c.ref_field === "actual"
            ? `stage:${c.ref_stage}`
            : c.ref_field === "started"
            ? `stage_started:${c.ref_stage}`
            : String(c.ref_field || "").startsWith("rec:")
            ? `stage_rec:${c.ref_stage}:::${c.ref_field}`
            : `stage_planned:${c.ref_stage}`;
        } else if (reverseStageOptions.systemTargets[0]) {
          targetCol = reverseStageOptions.systemTargets[0].value;
        }
      }
      return {
        ...base,
        reverse_mode: c.reverse_mode || (String(targetCol).startsWith("record:") ? "record" : "stage"),
        target_column: targetCol,
        target_label: selectedReverseLabel,
        ref_stage: c.ref_stage || "",
        ref_field: c.ref_field || "planned",
        x: Number(form.time_value) || 1,
        unit: c.unit || form.unit || "Days",
        sign: -1,
        working_days: c.working_days !== false,
      };
    }
    if (form.tat_type === "t_minus_x" || form.tat_type === "tx") {
      let targetCol = c.target_column || "";
      if (!targetCol && tFinalDateOptions.length > 0) {
        targetCol = tFinalDateOptions[0].value;
      }
      return {
        ...base,
        x: Number(form.time_value) || 0,
        unit: c.unit || form.unit || "Days",
        sign: Number(c.sign ?? -1) === 1 ? 1 : -1,
        working_days: c.working_days !== false,
        lead_days: Number(c.lead_days) || 0,
        t_mode: c.t_mode === "lead" ? "lead" : "target",
        target_column: targetCol,
        lead_column: c.lead_column || "",
      };
    }
    if (form.tat_type === "specific_time" || form.tat_type === "spec") {
      return {
        ...base,
        time: c.time || "17:00",
        days_after: Number(c.days_after) || 0,
        cutoff: c.cutoff !== false,
      };
    }
    if (form.tat_type === "days") {
      return {
        ...base,
        working_days: c.working_days !== false,
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
    } else if (type === "t_minus_x" || type === "tx") {
      if (!(v >= 0) || !Number.isInteger(v)) return "x must be a whole number, 0 or more.";
    } else if (type === "reverse" || type === "reverse_tat") {
      if (!(v >= 0) || !Number.isInteger(v)) return "x must be a whole number, 0 or more.";
      if (!form.cfg.target_column && !form.cfg.ref_stage) return "Please select a target stage or time column.";
    } else if (type === "specific_time" || type === "spec") {
      if (!form.cfg.time) return "Please enter the fixed time.";
      const d = Number(form.cfg.days_after);
      if (!(d >= 0) || !Number.isInteger(d)) return "Days after must be a whole number, 0 or more.";
    } else if (!(v > 0)) {
      return "TAT must be greater than 0.";
    } else if (
      (type === "minutes" ||
        type === "min_in" ||
        type === "min_out" ||
        type === "days") &&
      !Number.isInteger(v)
    ) {
      return "Time value must be a whole number.";
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
      form.tat_type === "specific_time" || form.tat_type === "t_minus_x" || form.tat_type === "reverse" || form.tat_type === "reverse_tat"
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

      let dbSaved = true;
      try {
        await upsertMasterTatRule(payload);
        await loadRules();
      } catch (dbErr) {
        dbSaved = false;
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

      if (dbSaved) {
        showToast?.(
          editingRule ? "TAT Rule updated successfully!" : "TAT Rule created successfully!",
          "success"
        );
      }
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
                const ruleType = r.tat_config?.tat_type || r.tat_type;
                const typeInfo = getTatType(ruleType);
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingRule ? "Edit TAT Rule" : "Add TAT Rule"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select system and page, pick a TAT type and start date, then set the allowed time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Row 1: System Name & Page / Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    System Name
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
                        time_value: matchedDefault ? matchedDefault.time_value : form.time_value,
                        unit: matchedDefault ? matchedDefault.unit : form.unit,
                        description: matchedDefault ? matchedDefault.description : "",
                      });
                    }}
                    className={`${fieldCls} cursor-pointer text-xs`}
                  >
                    {SYSTEM_OPTIONS.map((sys) => (
                      <option key={sys} value={sys}>
                        {sys === "Purchase System" ? "Purchase" : sys}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Page / Section
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
                    className={`${fieldCls} cursor-pointer text-xs`}
                  >
                    <option value="">-- Select Page / Section --</option>
                    {availableStages.map((stg, i) => (
                      <option key={stg} value={stg}>
                        {`${i + 1}. ${stg}`}
                      </option>
                    ))}
                  </select>
                  {ruleAlreadyExists && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
                      TAT already exists for this page. Submitting will overwrite the existing TAT.
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: TAT type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  TAT type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TAT_TYPES.map((t) => {
                    const active =
                      form.tat_type === t.id ||
                      (t.legacyId && form.tat_type === t.legacyId);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectType(t.id)}
                        className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          active
                            ? "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div
                          className={`text-xs font-bold ${
                            active
                              ? "text-blue-950 dark:text-blue-100"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {t.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {t.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Dynamic Section based on Selected TAT Type */}
              {(form.tat_type === "t_minus_x" || form.tat_type === "tx") && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      T (final date)
                    </label>
                    <select
                      value={form.cfg.target_column || (tFinalDateOptions[0]?.value || "")}
                      onChange={(e) => setCfg({ target_column: e.target.value })}
                      className={`${fieldCls} cursor-pointer text-xs`}
                    >
                      {tFinalDateOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      The deadline is counted back (or forward) from this date on each record.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3.5">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          x
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={form.time_value}
                          onChange={(e) => setForm({ ...form, time_value: e.target.value })}
                          className={`${fieldCls} font-mono text-xs`}
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[11px] font-bold text-transparent select-none">Unit</label>
                        <select
                          value={form.cfg.unit || "Days"}
                          onChange={(e) => {
                            const u = e.target.value;
                            setCfg({ unit: u });
                            setForm((prev) => ({ ...prev, unit: u }));
                          }}
                          className={`${fieldCls} cursor-pointer text-xs`}
                        >
                          <option value="Days">Days</option>
                          <option value="Hours">Hours</option>
                          <option value="Minutes">Minutes</option>
                        </select>
                      </div>
                      <div className="col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Direction
                        </label>
                        <select
                          value={form.cfg.sign ?? -1}
                          onChange={(e) => setCfg({ sign: Number(e.target.value) })}
                          className={`${fieldCls} cursor-pointer text-xs`}
                        >
                          <option value={-1}>Before T (T − x)</option>
                          <option value={1}>After T (T + x)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Working days only
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Skip off days and holidays
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.cfg.working_days !== false}
                        onClick={() => setCfg({ working_days: !(form.cfg.working_days !== false) })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          form.cfg.working_days !== false ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                            form.cfg.working_days !== false ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed">
                      Planned = {selectedTLabel} {Number(form.cfg.sign ?? -1) === 1 ? "+" : "−"}{" "}
                      {form.time_value || 1} {form.cfg.working_days !== false ? "working " : ""}
                      {(form.cfg.unit || "Days").toLowerCase() === "days"
                        ? (Number(form.time_value || 1) === 1 ? "day" : "days")
                        : (form.cfg.unit || "Days").toLowerCase() === "hours"
                        ? (Number(form.time_value || 1) === 1 ? "hour" : "hours")
                        : (Number(form.time_value || 1) === 1 ? "minute" : "minutes")}
                      , by end of office hours. Records with no {selectedTLabel} get no deadline.
                    </div>
                  </div>
                </div>
              )}

              {(form.tat_type === "hin" || form.tat_type === "hout" || form.tat_type === "hours") && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Start date / Base column
                    </label>
                    <select
                      value={form.cfg.base_column || "default"}
                      onChange={(e) => setCfg({ base_column: e.target.value })}
                      className={`${fieldCls} cursor-pointer text-xs`}
                    >
                      <option value="default">Default start of this stage</option>
                      {tFinalDateOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Where the counting starts from on each record.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Allowed Working Hours
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={form.time_value}
                          onChange={(e) => setForm({ ...form, time_value: e.target.value })}
                          className={`${fieldCls} font-mono text-xs`}
                        />
                        <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          Hours
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1, 2, 4, 8, 16, 24, 48].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, time_value: p })}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            Number(form.time_value) === p
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p} hr
                        </button>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed">
                      Planned = {selectedBaseLabel} + {form.time_value || 4} working hours.{" "}
                      {form.tat_type === "hout"
                        ? "Night or early entry counts from next office opening (10:00 AM)."
                        : "Counts office hours only (10:00 AM – 6:00 PM)."}
                    </div>
                  </div>
                </div>
              )}

              {(form.tat_type === "min_in" || form.tat_type === "min_out" || form.tat_type === "minutes") && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Start date / Base column
                    </label>
                    <select
                      value={form.cfg.base_column || "default"}
                      onChange={(e) => setCfg({ base_column: e.target.value })}
                      className={`${fieldCls} cursor-pointer text-xs`}
                    >
                      <option value="default">Default start of this stage</option>
                      {tFinalDateOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Where the counting starts from on each record.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Allowed Working Minutes
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={form.time_value}
                          onChange={(e) => setForm({ ...form, time_value: e.target.value })}
                          className={`${fieldCls} font-mono text-xs`}
                        />
                        <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          Minutes
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[15, 30, 45, 60, 90, 120].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, time_value: p })}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            Number(form.time_value) === p
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p} min
                        </button>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed">
                      Planned = {selectedBaseLabel} + {form.time_value || 30} working minutes.{" "}
                      {form.tat_type === "min_out"
                        ? "Night or early entry counts from next office opening (10:00 AM)."
                        : "Counts office minutes only."}
                    </div>
                  </div>
                </div>
              )}

              {form.tat_type === "days" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Start date / Base date column
                    </label>
                    <select
                      value={form.cfg.base_column || "default"}
                      onChange={(e) => setCfg({ base_column: e.target.value })}
                      className={`${fieldCls} cursor-pointer text-xs`}
                    >
                      <option value="default">Default start of this stage</option>
                      {tFinalDateOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Where the counting starts from on each record.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Allowed Working Days
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={form.time_value}
                          onChange={(e) => setForm({ ...form, time_value: e.target.value })}
                          className={`${fieldCls} font-mono text-xs`}
                        />
                        <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          Days
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1, 2, 3, 5, 7].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, time_value: p })}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            Number(form.time_value) === p
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p} day{p === 1 ? "" : "s"}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Working days only
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Skip off days and holidays
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.cfg.working_days !== false}
                        onClick={() => setCfg({ working_days: !(form.cfg.working_days !== false) })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          form.cfg.working_days !== false ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                            form.cfg.working_days !== false ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed">
                      Planned = {selectedBaseLabel} + {form.time_value || 2} working day(s) ahead, off days and company holidays skipped.
                    </div>
                  </div>
                </div>
              )}

              {(form.tat_type === "specific_time" || form.tat_type === "spec") && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Start date / Base date column
                    </label>
                    <select
                      value={form.cfg.base_column || "default"}
                      onChange={(e) => setCfg({ base_column: e.target.value })}
                      className={`${fieldCls} cursor-pointer text-xs`}
                    >
                      <option value="default">Default start of this stage</option>
                      {tFinalDateOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Determines which day the fixed clock time applies to.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Time of day <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={form.cfg.time || "17:00"}
                          onChange={(e) => setCfg({ time: e.target.value })}
                          className={`${fieldCls} text-xs`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Working days after (0 = same day)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={form.cfg.days_after ?? 0}
                          onChange={(e) => setCfg({ days_after: Number(e.target.value) })}
                          className={`${fieldCls} font-mono text-xs`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Apply cut-off
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          If entry arrives after fixed time, move to next working day
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.cfg.cutoff !== false}
                        onClick={() => setCfg({ cutoff: !(form.cfg.cutoff !== false) })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          form.cfg.cutoff !== false ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                            form.cfg.cutoff !== false ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed">
                      Planned = {selectedBaseLabel} at {form.cfg.time || "17:00"}{" "}
                      {Number(form.cfg.days_after) > 0 ? `(+ ${form.cfg.days_after} working days)` : "(same day)"}.{" "}
                      {form.cfg.cutoff !== false ? "If entry arrives after fixed time, deadline moves to next working day." : ""}
                    </div>
                  </div>
                </div>
              )}

              {(form.tat_type === "reverse" || form.tat_type === "reverse_tat") && (
                <div className="space-y-3 pt-1">
                  {/* Row 1: Target Stage / Anchor & Stage Time Column */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Target Stage / Anchor <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={
                          form.cfg.reverse_mode === "record" || String(form.cfg.target_column || "").startsWith("record:")
                            ? form.cfg.target_column
                            : form.cfg.ref_stage || reverseStageOptions.lastStage?.stageName || ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith("record:")) {
                            setCfg({
                              reverse_mode: "record",
                              target_column: val,
                              ref_stage: "",
                              ref_field: val.slice(7),
                            });
                          } else {
                            const currentField = form.cfg.ref_field || "planned";
                            let targetCol = `stage_planned:${val}`;
                            if (currentField === "actual") targetCol = `stage:${val}`;
                            else if (currentField === "started") targetCol = `stage_started:${val}`;
                            else if (currentField.startsWith("rec:")) targetCol = `stage_rec:${val}:::${currentField}`;
                            setCfg({
                              reverse_mode: "stage",
                              ref_stage: val,
                              ref_field: currentField,
                              target_column: targetCol,
                            });
                          }
                        }}
                        className={`${fieldCls} cursor-pointer text-xs`}
                      >
                        {reverseStageOptions.systemTargets.length > 0 && (
                          <optgroup label="System Target Dates">
                            {reverseStageOptions.systemTargets.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Workflow Stages">
                          {reverseStageOptions.stages.map((st) => (
                            <option key={st.stageName} value={st.stageName}>
                              {st.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Select Expected Delivery or which stage to count backward from.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Stage Time Column <span className="text-rose-500">*</span>
                      </label>
                      {form.cfg.reverse_mode === "record" || String(form.cfg.target_column || "").startsWith("record:") ? (
                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {selectedReverseLabel}
                        </div>
                      ) : (
                        <select
                          value={form.cfg.ref_field || "planned"}
                          onChange={(e) => {
                            const fieldKey = e.target.value;
                            const stg = form.cfg.ref_stage || reverseStageOptions.lastStage?.stageName || "";
                            let targetCol = `stage_planned:${stg}`;
                            if (fieldKey === "actual") targetCol = `stage:${stg}`;
                            else if (fieldKey === "started") targetCol = `stage_started:${stg}`;
                            else if (fieldKey.startsWith("rec:")) targetCol = `stage_rec:${stg}:::${fieldKey}`;
                            setCfg({
                              ref_field: fieldKey,
                              target_column: targetCol,
                            });
                          }}
                          className={`${fieldCls} cursor-pointer text-xs`}
                        >
                          {(() => {
                            const curStageName = form.cfg.ref_stage || reverseStageOptions.lastStage?.stageName || "";
                            const matchedStage = reverseStageOptions.stages.find(
                              (s) => s.stageName.toLowerCase() === curStageName.toLowerCase()
                            );
                            const cols = matchedStage?.columns || [
                              { fieldKey: "planned", label: "Planned date (due time)" },
                              { fieldKey: "actual", label: "Actual completion date" },
                              { fieldKey: "started", label: "Started / Entry date" },
                            ];
                            return cols.map((col) => (
                              <option key={col.fieldKey} value={col.fieldKey}>
                                {col.label}
                              </option>
                            ));
                          })()}
                        </select>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        The exact date/time column of that stage to subtract from.
                      </p>
                    </div>
                  </div>

                  {/* Deduction box: x, Unit, Presets, Working days toggle, Live preview */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3.5">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Subtract Value (x)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={form.time_value}
                          onChange={(e) => setForm({ ...form, time_value: e.target.value })}
                          className={`${fieldCls} font-mono text-xs`}
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Unit
                        </label>
                        <select
                          value={form.cfg.unit || "Days"}
                          onChange={(e) => {
                            const u = e.target.value;
                            setCfg({ unit: u });
                            setForm((prev) => ({ ...prev, unit: u }));
                          }}
                          className={`${fieldCls} cursor-pointer text-xs`}
                        >
                          <option value="Days">Days</option>
                          <option value="Hours">Hours</option>
                          <option value="Minutes">Minutes</option>
                        </select>
                      </div>
                      <div className="col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Direction
                        </label>
                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                          Backward (− minus)
                        </div>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {((form.cfg.unit || "Days").toLowerCase() === "hours"
                        ? [1, 2, 4, 8, 12, 24, 48]
                        : (form.cfg.unit || "Days").toLowerCase() === "minutes"
                        ? [15, 30, 45, 60, 90, 120]
                        : [1, 2, 3, 5, 7, 10]
                      ).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, time_value: p })}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            Number(form.time_value) === p
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p} {(form.cfg.unit || "Days").toLowerCase() === "hours" ? "hr" : (form.cfg.unit || "Days").toLowerCase() === "minutes" ? "min" : `day${p === 1 ? "" : "s"}`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Working days / office hours only
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Skip off days and company holidays
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.cfg.working_days !== false}
                        onClick={() => setCfg({ working_days: !(form.cfg.working_days !== false) })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          form.cfg.working_days !== false ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                            form.cfg.working_days !== false ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed">
                      Planned = {selectedReverseLabel} − {form.time_value || 1}{" "}
                      {form.cfg.working_days !== false ? "working " : ""}
                      {(form.cfg.unit || "Days").toLowerCase() === "days"
                        ? Number(form.time_value || 1) === 1 ? "day" : "days"
                        : (form.cfg.unit || "Days").toLowerCase() === "hours"
                        ? Number(form.time_value || 1) === 1 ? "hour" : "hours"
                        : Number(form.time_value || 1) === 1 ? "minute" : "minutes"}
                      , counting backward. Records with no {selectedReverseLabel} get no deadline.
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-sm text-sm"
                >
                  {editingRule ? "Update TAT" : "Add TAT"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
