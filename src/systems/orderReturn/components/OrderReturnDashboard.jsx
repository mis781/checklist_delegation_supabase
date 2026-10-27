import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
  Package,
  Clock,
  Truck,
  Layers,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import {
  STAGES,
  FMS,
  cust,
  prod,
  money,
  moneyShort,
  creditBasis,
  fmsSteps,
  dur,
  returnValue,
  itemTotals
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";

export default function OrderReturnDashboard({ onNavigateStage, onOpenDetails }) {
  const { visibleReturns, currentUser } = useOrderReturn();

  // First name for the hero greeting
  const firstName = useMemo(() => {
    const raw =
      currentUser?.name ||
      localStorage.getItem("user-name") ||
      localStorage.getItem("username") ||
      "admin1";
    return raw.split(" ")[0] || "admin1";
  }, [currentUser]);

  // Current formatted date for hero
  const dateKicker = useMemo(() => {
    return new Date()
      .toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long"
      })
      .toUpperCase();
  }, []);

  const nonDraftReturns = useMemo(() => {
    return visibleReturns.filter((r) => r.status !== "Draft");
  }, [visibleReturns]);

  const openReturns = useMemo(() => {
    return nonDraftReturns.filter(
      (r) => !["Completed", "Rejected", "Cancelled"].includes(r.status)
    );
  }, [nonDraftReturns]);

  // Approved value sum
  const approvedValueSum = useMemo(() => {
    return nonDraftReturns
      .filter((r) => !["Rejected", "Cancelled"].includes(r.status) && r.stage > 2)
      .reduce((s, r) => s + creditBasis(r).cap, 0);
  }, [nonDraftReturns]);

  // Credit note issued sum
  const creditIssuedSum = useMemo(() => {
    return nonDraftReturns
      .filter((r) => r.credit?.status === "Issued")
      .reduce((s, r) => s + (parseFloat(r.credit?.amount) || 0), 0);
  }, [nonDraftReturns]);

  // Overdue returns count
  const overdueReturns = useMemo(() => {
    return openReturns.filter(
      (r) => r.status !== "On Hold" && fmsSteps(r).some((x) => x.state === "overdue")
    );
  }, [openReturns]);

  // Pipeline stage cards (1 to 6)
  const pipeline = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((n) => {
      const at =
        n === 1
          ? visibleReturns.filter((r) => r.status === "Draft")
          : openReturns.filter((r) => r.stage === n);
      const od =
        n === 1
          ? 0
          : at.filter((r) => r.status !== "On Hold" && fmsSteps(r)[n - 1]?.state === "overdue").length;
      return {
        stageNum: n,
        name: STAGES[n - 1],
        count: at.length,
        overdueCount: od
      };
    });
  }, [visibleReturns, openReturns]);

  // All receipts across non-draft returns
  const allReceipts = useMemo(() => {
    return nonDraftReturns.flatMap((r) => r.receipts || []);
  }, [nonDraftReturns]);

  // 8 KPIs matching dummy exactly
  const kpis = useMemo(() => {
    return [
      {
        label: "Total returns",
        value: nonDraftReturns.length,
        borderLeft: "border-l-4 border-l-[#4f46e5]",
        iconBox: "bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-400",
        icon: Package
      },
      {
        label: "Pending approval",
        value: nonDraftReturns.filter((r) => r.stage === 2 && r.status === "Pending Approval").length,
        borderLeft: "border-l-4 border-l-[#d97706]",
        iconBox: "bg-amber-50 dark:bg-amber-950/60 text-[#d97706] dark:text-amber-400",
        icon: Clock,
        stageNum: 2
      },
      {
        label: "In transit",
        value: nonDraftReturns.filter(
          (r) => r.transport?.status === "In Transit" && !(r.receipts || []).length
        ).length,
        borderLeft: "border-l-4 border-l-[#0891b2]",
        iconBox: "bg-cyan-50 dark:bg-cyan-950/60 text-[#0891b2] dark:text-cyan-400",
        icon: Truck,
        stageNum: 4
      },
      {
        label: "Stock to post",
        value: allReceipts.filter((x) => !x.posted).length,
        borderLeft: "border-l-4 border-l-[#059669]",
        iconBox: "bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400",
        icon: Layers,
        stageNum: 5
      },
      {
        label: "Credit notes due",
        value: nonDraftReturns.filter((r) => r.stage === 6 && r.status !== "On Hold").length,
        borderLeft: "border-l-4 border-l-[#7c3aed]",
        iconBox: "bg-purple-50 dark:bg-purple-950/60 text-[#7c3aed] dark:text-purple-400",
        icon: Receipt,
        stageNum: 6
      },
      {
        label: "Completed",
        value: nonDraftReturns.filter((r) => r.status === "Completed").length,
        borderLeft: "border-l-4 border-l-[#10b981]",
        iconBox: "bg-emerald-50 dark:bg-emerald-950/60 text-[#10b981] dark:text-emerald-400",
        icon: CheckCircle2
      },
      {
        label: "Rejected",
        value: nonDraftReturns.filter((r) => r.status === "Rejected").length,
        borderLeft: "border-l-4 border-l-[#ef4444]",
        iconBox: "bg-rose-50 dark:bg-rose-950/60 text-[#ef4444] dark:text-rose-400",
        icon: XCircle
      },
      {
        label: "Running late",
        value: overdueReturns.length,
        borderLeft: "border-l-4 border-l-[#f59e0b]",
        iconBox: "bg-amber-50 dark:bg-amber-950/60 text-[#f59e0b] dark:text-amber-400",
        icon: AlertTriangle
      }
    ];
  }, [nonDraftReturns, allReceipts, overdueReturns]);

  // Overdue table data (top 6 earliest deadline)
  const overdueList = useMemo(() => {
    return nonDraftReturns
      .filter((r) => !["Completed", "Rejected", "Cancelled", "On Hold"].includes(r.status))
      .map((r) => {
        const s = fmsSteps(r);
        const k = s.findIndex((x) => x.state === "overdue");
        return k >= 0 ? { r, k, step: s[k] } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.step.planned - b.step.planned)
      .slice(0, 6);
  }, [nonDraftReturns]);

  // Chart 1: Returns by month
  const monthlyData = useMemo(() => {
    const months = [...new Set(nonDraftReturns.map((r) => (r.date || "").slice(0, 7)))].filter(Boolean).sort();
    return months.map((m) => {
      const label = new Date(m + "-01T00:00").toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit"
      });
      const requested = nonDraftReturns.filter((r) => (r.date || "").startsWith(m)).length;
      const completed = nonDraftReturns.filter(
        (r) => (r.date || "").startsWith(m) && r.status === "Completed"
      ).length;
      return { month: label, requested, completed };
    });
  }, [nonDraftReturns]);

  // Chart 2: Why customers return
  const reasonsData = useMemo(() => {
    const counts = {};
    nonDraftReturns.forEach((r) => {
      (r.items || []).forEach((i) => {
        const res = i.reason || r.reason || "Other";
        counts[res] = (counts[res] || 0) + 1;
      });
    });
    const COLORS = ["#4f46e5", "#d97706", "#db2777", "#0891b2", "#059669", "#7c3aed", "#ef4444"];
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    }));
  }, [nonDraftReturns]);

  // Chart 3: Return value by customer
  const customerValueData = useMemo(() => {
    const custMap = {};
    nonDraftReturns.forEach((r) => {
      const cObj = cust(r.customerId || r.customer_id);
      const val = returnValue(r);
      custMap[cObj.name] = (custMap[cObj.name] || 0) + val;
    });
    return Object.entries(custMap)
      .map(([name, val]) => ({
        name: name.length > 20 ? name.slice(0, 18) + "…" : name,
        value: val
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [nonDraftReturns]);

  // Chart 4: Received: into stock vs scrap
  const stockVsScrapData = useMemo(() => {
    const prodMap = {};
    nonDraftReturns.forEach((r) => {
      (r.items || []).forEach((i) => {
        const pr = prod(i.productId);
        const t = itemTotals(r, i);
        if (!prodMap[pr.name]) prodMap[pr.name] = { product: pr.name, stock: 0, scrap: 0 };
        prodMap[pr.name].stock += t.acc;
        prodMap[pr.name].scrap += t.scr;
      });
    });
    return Object.values(prodMap).filter((p) => p.stock > 0 || p.scrap > 0);
  }, [nonDraftReturns]);

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      const exportRows = nonDraftReturns.flatMap((r) => {
        const cObj = cust(r.customerId || r.customer_id);
        if (!r.items || !r.items.length) {
          return [
            {
              "Return No": r.no,
              "Date": r.date,
              "Customer": cObj.name,
              "Customer Code": cObj.code,
              "Product": "—",
              "Invoice No": "—",
              "Requested Qty": 0,
              "Approved Qty": 0,
              "Stage": STAGES[r.stage - 1] || "Completed",
              "Status": r.status,
              "Debit Note": r.debit?.number || "—",
              "Credit Note": r.credit?.number || "—"
            }
          ];
        }
        return r.items.map((i) => {
          const pr = prod(i.productId);
          return {
            "Return No": r.no,
            "Date": r.date,
            "Customer": cObj.name,
            "Customer Code": cObj.code,
            "Product": pr.name,
            "UOM": pr.uom,
            "Invoice No": i.invoiceNo,
            "Dispatch No": i.dispatchNo || "—",
            "Requested Qty": i.reqQty,
            "Approved Qty": i.apprQty ?? "—",
            "Reason": i.reason || r.reason || "—",
            "Stage": STAGES[r.stage - 1] || "Completed",
            "Status": r.status,
            "Debit Note": r.debit?.number || "—",
            "Credit Note": r.credit?.number || "—"
          };
        });
      });

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Order Returns");
      XLSX.writeFile(wb, `Order_Returns_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Excel exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel file");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Welcome Banner ────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-lg"
        style={{
          background: "linear-gradient(120deg, #1e293b 0%, #2563eb 60%, #7c3aed 120%)"
        }}
      >
        {/* Subtle decorative circles matching dummy */}
        <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute right-40 -bottom-24 w-56 h-56 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              {dateKicker}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Good to see you, {firstName}
            </h1>
            <p className="text-sm text-white/90">
              {openReturns.length} return{openReturns.length === 1 ? "" : "s"} in progress
              {overdueReturns.length > 0 ? `, ${overdueReturns.length} running late` : ", all on track"}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2.5">
              <div className="px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 min-w-[120px]">
                <span className="text-xs text-white/80 block font-medium">Open returns</span>
                <b className="text-xl sm:text-2xl font-black text-white block mt-0.5">
                  {openReturns.length}
                </b>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 min-w-[128px]">
                <span className="text-xs text-white/80 block font-medium">Approved value</span>
                <b className="text-xl sm:text-2xl font-black text-white block mt-0.5">
                  {moneyShort(approvedValueSum)}
                </b>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 min-w-[124px]">
                <span className="text-xs text-white/80 block font-medium">Credit issued</span>
                <b className="text-xl sm:text-2xl font-black text-white block mt-0.5">
                  {moneyShort(creditIssuedSum)}
                </b>
              </div>
            </div>

            <button
              onClick={handleExportExcel}
              type="button"
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. Return Pipeline ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
          Return pipeline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {pipeline.map((p) => {
            const stageTheme = [
              {
                badgeBg: "bg-[#4f46e5]",
                countColor: "text-[#4f46e5] dark:text-[#818cf8]",
                bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
                border: "border-indigo-200/80 dark:border-indigo-900/50 hover:border-indigo-400"
              },
              {
                badgeBg: "bg-[#d97706]",
                countColor: "text-[#d97706] dark:text-[#fbbf24]",
                bg: "bg-amber-50/50 dark:bg-amber-950/20",
                border: "border-amber-200/80 dark:border-amber-900/50 hover:border-amber-400"
              },
              {
                badgeBg: "bg-[#db2777]",
                countColor: "text-[#db2777] dark:text-[#f472b6]",
                bg: "bg-pink-50/50 dark:bg-pink-950/20",
                border: "border-pink-200/80 dark:border-pink-900/50 hover:border-pink-400"
              },
              {
                badgeBg: "bg-[#0891b2]",
                countColor: "text-[#0891b2] dark:text-[#22d3ee]",
                bg: "bg-cyan-50/50 dark:bg-cyan-950/20",
                border: "border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-400"
              },
              {
                badgeBg: "bg-[#059669]",
                countColor: "text-[#059669] dark:text-[#34d399]",
                bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
                border: "border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-400"
              },
              {
                badgeBg: "bg-[#7c3aed]",
                countColor: "text-[#7c3aed] dark:text-[#a78bfa]",
                bg: "bg-purple-50/50 dark:bg-purple-950/20",
                border: "border-purple-200/80 dark:border-purple-900/50 hover:border-purple-400"
              }
            ][p.stageNum - 1];

            return (
              <div
                key={p.stageNum}
                onClick={() => onNavigateStage && onNavigateStage(p.stageNum)}
                className={`p-4 rounded-2xl border ${stageTheme.bg} ${stageTheme.border} cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between`}
              >
                <div>
                  <span
                    className={`w-6 h-6 rounded-lg ${stageTheme.badgeBg} text-white font-extrabold text-xs flex items-center justify-center mb-2`}
                  >
                    {p.stageNum}
                  </span>
                  <b className={`text-3xl font-extrabold ${stageTheme.countColor} block tracking-tight leading-none mb-1.5`}>
                    {p.count}
                  </b>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug block">
                    {p.name}
                  </span>
                </div>
                <div className="mt-2.5">
                  {p.stageNum === 1 ? (
                    <span className="text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Drafts
                    </span>
                  ) : p.overdueCount > 0 ? (
                    <span className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400">
                      {p.overdueCount} overdue
                    </span>
                  ) : (
                    <span className="text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      On track
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. KPIs Cards Grid (8 Cards) ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {kpis.map((kpi, idx) => {
          const IconComponent = kpi.icon;
          const isClickable = !!kpi.stageNum;
          return (
            <div
              key={idx}
              onClick={() => {
                if (kpi.stageNum && onNavigateStage) {
                  onNavigateStage(kpi.stageNum);
                }
              }}
              className={`bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs transition-all ${kpi.borderLeft} ${
                isClickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBox}`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                  {kpi.label}
                </span>
                <b className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight block">
                  {kpi.value}
                </b>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 4. Overdue Now Section ────────────────────────────────────────── */}
      {overdueList.length > 0 && (
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Overdue now
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {overdueList.length} requiring immediate attention
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700/60">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Return no.</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Stuck at</th>
                  <th className="py-2.5 px-3">Doer</th>
                  <th className="py-2.5 px-3">Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdueList.map(({ r, k, step }, i) => (
                  <tr
                    key={i}
                    onClick={() => onOpenDetails && onOpenDetails(r.id)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDetails) onOpenDetails(r.id);
                        }}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
                      >
                        Open
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-slate-100">
                      {r.no}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {cust(r.customerId || r.customer_id).name}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {k + 1}. {STAGES[k]}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {FMS[k]?.who || "Responsible Operator"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                        Overdue by {dur(Date.now() - step.planned)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Charts Grid (4 Panels) ──────────────────────────────────────── */}
      {nonDraftReturns.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Returns by month */}
          <div className="p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Returns by month
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="requested" name="Requests" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Why customers return */}
          <div className="p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Why customers return
            </h2>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {reasonsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Return value by customer */}
          <div className="p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Return value by customer
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerValueData} layout="vertical">
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 1e3).toFixed(0)}k`}
                  />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={110} />
                  <Tooltip
                    formatter={(v) => [money(v), "Return Value"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Received: into stock vs scrap */}
          <div className="p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Received: into stock vs scrap
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockVsScrapData}>
                  <XAxis
                    dataKey="product"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickFormatter={(p) => (p.length > 10 ? p.slice(0, 10) + "…" : p)}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="stock" name="Into stock" fill="#059669" stackId="a" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="scrap" name="Scrap" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-10 text-center text-slate-400 shadow-xs">
          <b className="block text-slate-700 dark:text-slate-200 text-sm mb-1">
            Charts appear once returns are submitted
          </b>
          Start from Stage 1.
        </div>
      )}
    </div>
  );
}
