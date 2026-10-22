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
  PackageCheck,
  Clock,
  Truck,
  Layers,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import {
  STAGES,
  REASONS,
  MASTERS,
  cust,
  prod,
  money,
  moneyShort,
  creditBasis,
  fmsSteps,
  dur,
  fdate,
  returnValue,
  itemTotals
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";

export default function OrderReturnDashboard({ onNavigateStage, onOpenDetails }) {
  const { visibleReturns, currentUser } = useOrderReturn();

  const nonDraftReturns = useMemo(() => {
    return visibleReturns.filter((r) => r.status !== "Draft");
  }, [visibleReturns]);

  const openReturns = useMemo(() => {
    return nonDraftReturns.filter((r) => !["Completed", "Rejected", "Cancelled"].includes(r.status));
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
      const at = n === 1 ? visibleReturns.filter((r) => r.status === "Draft") : openReturns.filter((r) => r.stage === n);
      const od = n === 1 ? 0 : at.filter((r) => r.status !== "On Hold" && fmsSteps(r)[n - 1]?.state === "overdue").length;
      return {
        stageNum: n,
        name: STAGES[n - 1],
        count: at.length,
        overdueCount: od
      };
    });
  }, [visibleReturns, openReturns]);

  // 8 KPIs
  const allReceipts = useMemo(() => {
    return nonDraftReturns.flatMap((r) => r.receipts || []);
  }, [nonDraftReturns]);

  const kpis = useMemo(() => {
    return [
      {
        label: "Total Returns",
        value: nonDraftReturns.length,
        color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900",
        icon: PackageCheck
      },
      {
        label: "Pending Approval",
        value: nonDraftReturns.filter((r) => r.stage === 2 && r.status === "Pending Approval").length,
        color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900",
        icon: Clock,
        stageNum: 2
      },
      {
        label: "In Transit",
        value: nonDraftReturns.filter((r) => r.transport?.status === "In Transit" && !(r.receipts || []).length).length,
        color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-900",
        icon: Truck,
        stageNum: 4
      },
      {
        label: "Stock to Post",
        value: allReceipts.filter((x) => !x.posted).length,
        color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900",
        icon: Layers,
        stageNum: 5
      },
      {
        label: "Credit Notes Due",
        value: nonDraftReturns.filter((r) => r.stage === 6 && r.status !== "On Hold").length,
        color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900",
        icon: Receipt,
        stageNum: 6
      },
      {
        label: "Completed",
        value: nonDraftReturns.filter((r) => r.status === "Completed").length,
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900",
        icon: CheckCircle2
      },
      {
        label: "Rejected",
        value: nonDraftReturns.filter((r) => r.status === "Rejected").length,
        color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900",
        icon: XCircle
      },
      {
        label: "Running Late",
        value: overdueReturns.length,
        color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900",
        icon: AlertTriangle
      }
    ];
  }, [nonDraftReturns, allReceipts, overdueReturns]);

  // Overdue table data
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
      .slice(0, 5);
  }, [nonDraftReturns]);

  // Chart 1: Returns by Month
  const monthlyData = useMemo(() => {
    const months = [...new Set(nonDraftReturns.map((r) => (r.date || "").slice(0, 7)))].filter(Boolean).sort();
    return months.map((m) => {
      const label = new Date(m + "-01T00:00").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const requested = nonDraftReturns.filter((r) => (r.date || "").startsWith(m)).length;
      const completed = nonDraftReturns.filter((r) => (r.date || "").startsWith(m) && r.status === "Completed").length;
      return { month: label, requested, completed };
    });
  }, [nonDraftReturns]);

  // Chart 2: Why Customers Return
  const reasonsData = useMemo(() => {
    const counts = {};
    nonDraftReturns.forEach((r) => {
      (r.items || []).forEach((i) => {
        const res = i.reason || r.reason || "Other";
        counts[res] = (counts[res] || 0) + 1;
      });
    });
    const COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#10b981", "#8b5cf6", "#ef4444"];
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    }));
  }, [nonDraftReturns]);

  // Chart 3: Return Value by Customer
  const customerValueData = useMemo(() => {
    const custMap = {};
    nonDraftReturns.forEach((r) => {
      const cObj = cust(r.customerId || r.customer_id);
      const val = returnValue(r);
      custMap[cObj.name] = (custMap[cObj.name] || 0) + val;
    });
    return Object.entries(custMap)
      .map(([name, val]) => ({ name: name.length > 18 ? name.slice(0, 16) + "…" : name, value: val }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [nonDraftReturns]);

  // Chart 4: Received: Into Stock vs Scrap
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
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 -mb-16 w-56 h-56 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Customer Order Returns Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {openReturns.length} return{openReturns.length === 1 ? "" : "s"} currently in progress
              {overdueReturns.length > 0 ? `, ${overdueReturns.length} running overdue` : ", all active stages on track"}
              . Complete reverse logistics from customer request to credit note.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                <span className="text-[11px] text-slate-300 block">Open Returns</span>
                <span className="text-xl font-black">{openReturns.length}</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                <span className="text-[11px] text-slate-300 block">Approved Value</span>
                <span className="text-xl font-black">{moneyShort(approvedValueSum)}</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                <span className="text-[11px] text-slate-300 block">Credit Issued</span>
                <span className="text-xl font-black">{moneyShort(creditIssuedSum)}</span>
              </div>
            </div>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Register
            </button>
          </div>
        </div>
      </div>

      {/* 6-Stage Pipeline Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Workflow Stage Pipeline</span>
            <span className="text-xs font-normal text-slate-500">(Click any stage to filter)</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipeline.map((p) => {
            const STAGE_COLORS = [
              "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20",
              "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20",
              "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20",
              "border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-50/30 dark:bg-violet-950/20",
              "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20",
              "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20"
            ];
            const colorClass = STAGE_COLORS[p.stageNum - 1];

            return (
              <div
                key={p.stageNum}
                onClick={() => onNavigateStage && onNavigateStage(p.stageNum)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 select-none ${colorClass}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                    {p.stageNum}
                  </span>
                  {p.overdueCount > 0 ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-md">
                      {p.overdueCount} late
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      On Track
                    </span>
                  )}
                </div>

                <div className="text-2xl font-black tracking-tight">{p.count}</div>
                <div className="text-xs font-bold truncate text-slate-800 dark:text-slate-200 mt-0.5">
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8 Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <div
              key={idx}
              onClick={() => k.stageNum && onNavigateStage && onNavigateStage(k.stageNum)}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                k.stageNum ? "cursor-pointer hover:shadow-sm" : ""
              } bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${k.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 block">
                  {k.value}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate block">
                  {k.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overdue Alerts Section */}
      {overdueList.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>SLA Overdue Actions Requiring Attention</span>
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              {overdueList.length} Stage Deliverables Delayed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 border-b border-amber-200 dark:border-amber-900/60">
                  <th className="py-2 px-3">Return No.</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Delayed Stage</th>
                  <th className="py-2 px-3">Assigned Team</th>
                  <th className="py-2 px-3">Overdue Time</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                {overdueList.map(({ r, k, step }, i) => (
                  <tr key={i} className="hover:bg-amber-100/40 dark:hover:bg-amber-950/40">
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-slate-100">
                      {r.no}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {cust(r.customerId || r.customer_id).name}
                    </td>
                    <td className="py-2.5 px-3 text-amber-700 dark:text-amber-300 font-medium">
                      Stage {k + 1}: {STAGES[k]}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {step.by || "Responsible Operator"}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                      Overdue by {dur(Date.now() - step.planned)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onOpenDetails && onOpenDetails(r.id)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Returns by Month */}
        <div className="p-5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Returns Volume by Month
          </h3>
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
                <Bar dataKey="requested" name="Requests Raised" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Why Customers Return */}
        <div className="p-5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Why Customers Return (Reasons Breakdown)
          </h3>
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

        {/* Chart 3: Return Value by Customer */}
        <div className="p-5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Top Return Value by Customer (₹)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerValueData} layout="vertical">
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1e3).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
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
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Received: Into Stock vs Scrap */}
        <div className="p-5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Material Received: Salable Stock vs Scrap
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockVsScrapData}>
                <XAxis dataKey="product" stroke="#94a3b8" fontSize={10} tickFormatter={(p) => p.slice(0, 10)} />
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
                <Bar dataKey="stock" name="Accepted into Stock" fill="#10b981" stackId="a" radius={[0, 0, 4, 4]} />
                <Bar dataKey="scrap" name="Scrapped" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
