import React, { useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  FileText
} from "lucide-react";
import {
  FMS,
  STAGES,
  cust,
  fdate,
  fmsSteps,
  dur
} from "../constants/orderReturnData";
import { useOrderReturn } from "../context/OrderReturnContext";

export default function OrderReturnFlowView({ onOpenDetails }) {
  const { visibleReturns } = useOrderReturn();

  const activeReturns = useMemo(() => {
    return visibleReturns.filter((r) => r.status !== "Draft" && !["Completed", "Rejected", "Cancelled"].includes(r.status));
  }, [visibleReturns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl space-y-1">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          <span>Order Return Process Flow (FMS & SLA Turn Around Times)</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Deterministic Turn Around Time (TAT) monitoring across all 6 core reverse-logistics milestones.
        </p>
      </div>

      {/* Visual Flow Steps Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {FMS.map((step) => (
          <div
            key={step.n}
            className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl relative space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {step.n}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                  TAT: {step.tat}h
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2">
                {step.what}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {step.how}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Role: <span className="text-indigo-600 dark:text-indigo-400">{step.who}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Returns SLA Matrix Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Real-Time SLA & FMS Milestone Adherence
          </h2>
          <p className="text-xs text-slate-500">
            Current live tracking status across active open customer returns.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Return No.</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">S1: Request</th>
                <th className="py-2.5 px-3">S2: Approval</th>
                <th className="py-2.5 px-3">S3: Debit Note</th>
                <th className="py-2.5 px-3">S4: Vehicle</th>
                <th className="py-2.5 px-3">S5: GRN & QC</th>
                <th className="py-2.5 px-3">S6: Credit Note</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeReturns.map((r) => {
                const cObj = cust(r.customerId || r.customer_id);
                const steps = fmsSteps(r);

                return (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold font-mono text-slate-900 dark:text-slate-100">
                      {r.no}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {cObj.name}
                    </td>

                    {steps.map((st, idx) => {
                      let badge = "—";
                      let color = "bg-slate-100 text-slate-500 dark:bg-slate-800";
                      if (st.state === "ok") {
                        badge = "✓ On Time";
                        color = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
                      } else if (st.state === "late") {
                        badge = `Late (${dur(st.delay)})`;
                        color = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
                      } else if (st.state === "overdue") {
                        badge = `Overdue (${dur(Date.now() - st.planned)})`;
                        color = "bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100 font-bold";
                      } else if (st.state === "due") {
                        badge = `Due (${dur(st.planned - Date.now())})`;
                        color = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold";
                      } else if (st.state === "hold") {
                        badge = "On Hold";
                        color = "bg-amber-100 text-amber-800";
                      }

                      return (
                        <td key={idx} className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] inline-block ${color}`}>
                            {badge}
                          </span>
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenDetails && onOpenDetails(r.id)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
