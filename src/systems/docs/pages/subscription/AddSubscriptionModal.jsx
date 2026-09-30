import { useState } from "react";
import { X, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { subscriptionsApi } from "../../services/docsLocalStorage";

const FREQUENCIES = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

const COMPANIES = [
  "Nutech Engineering",
  "Nutech Systems Pvt Ltd",
  "Nutech Auto Components",
  "Nutech Industries",
];

const calculateRenewalDate = (frequency) => {
  const d = new Date();
  if (frequency === "Monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (frequency === "Quarterly") {
    d.setMonth(d.getMonth() + 3);
  } else if (frequency === "Half-Yearly") {
    d.setMonth(d.getMonth() + 6);
  } else if (frequency === "Yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split("T")[0];
};

export default function AddSubscriptionModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    subscriptionName: "",
    serviceName: "",
    companyName: "Nutech Engineering",
    subscriberName: "",
    price: "",
    frequency: "Monthly",
    purpose: "",
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subscriptionName.trim()) {
      toast.error("Please enter subscription name");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error("Please enter a valid price / recurring cost");
      return;
    }

    try {
      setSaving(true);
      const requestedDate = new Date().toISOString().split("T")[0];
      const renewalDate = calculateRenewalDate(formData.frequency);
      await subscriptionsApi.create({
        ...formData,
        requestedDate,
        renewalDate,
        paymentDueDate: renewalDate,
      });
      toast.success("Subscription request registered & submitted for approval!");
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to register subscription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add New Subscription Request</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Request tool license or SaaS software approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Subscription Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Subscription Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subscriptionName"
              value={formData.subscriptionName}
              onChange={handleChange}
              placeholder="e.g. AWS Cloud Hosting Plan / Microsoft 365 Standard"
              required
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Grid: Service / Tool Name & Company Entity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Service / Tool Name
              </label>
              <input
                type="text"
                name="serviceName"
                value={formData.serviceName}
                onChange={handleChange}
                placeholder="e.g. AWS / Microsoft / Autodesk"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Company Entity <span className="text-red-500">*</span>
              </label>
              <select
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
              >
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Subscriber Dept & Cost/Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Subscriber Dept / Owner <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subscriberName"
                value={formData.subscriberName}
                onChange={handleChange}
                placeholder="e.g. Design & R&D Team"
                required
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Cost / Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g. 24500"
                required
                min="1"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Billing Frequency */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Billing Cycle <span className="text-red-500">*</span>
            </label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
            >
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {freq}
                </option>
              ))}
            </select>
          </div>

          {/* Purpose & Business Justification */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Purpose & Business Justification
            </label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              rows={3}
              placeholder="Explain why this software / service is required..."
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>{saving ? "Registering..." : "Submit for Approval"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
