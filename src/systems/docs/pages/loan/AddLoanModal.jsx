import { useState, useRef } from "react";
import { X, Upload, Save, FileText, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { loansApi } from "../../services/docsLocalStorage";

export default function AddLoanModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    loanName: "",
    bankName: "",
    loanAmount: "",
    emiAmount: "",
    startDate: "",
    endDate: "",
    collateralDocument: "",
    remarks: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      toast.success(`Attached: ${file.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.loanName.trim()) {
      toast.error("Please enter a Loan Facility Name");
      return;
    }
    if (!formData.bankName.trim()) {
      toast.error("Please enter Bank / Financial Institution");
      return;
    }
    if (!formData.loanAmount || Number(formData.loanAmount) <= 0) {
      toast.error("Please enter a valid Sanctioned Amount");
      return;
    }

    try {
      setSaving(true);
      await loansApi.create({
        loanName: formData.loanName.trim(),
        bankName: formData.bankName.trim(),
        loanAmount: Number(formData.loanAmount),
        emiAmount: Number(formData.emiAmount) || 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maturityDate: formData.endDate,
        collateralDocument: formData.collateralDocument.trim(),
        remarks: formData.remarks.trim(),
        file: selectedFile,
        fileName: selectedFile ? selectedFile.name : "",
      });

      toast.success("Bank Loan registered successfully!");
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save loan record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Add New Bank Loan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Register facility, collateral documents &amp; EMI details
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-7 overflow-y-auto space-y-4 text-xs">
          {/* Row 1: Loan Facility Name & Bank / Financial Inst. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Loan Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="loanName"
                value={formData.loanName}
                onChange={handleChange}
                placeholder="e.g. Working Capital Term Loan"
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Bank / Financial Inst. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g. HDFC Bank, SBI"
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Sanctioned Amount & Monthly EMI / Repayment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Sanctioned Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="loanAmount"
                value={formData.loanAmount}
                onChange={handleChange}
                placeholder="e.g. ₹50,00,000"
                required
                min="1"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Monthly EMI / Repayment <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="emiAmount"
                value={formData.emiAmount}
                onChange={handleChange}
                placeholder="e.g. ₹85,000"
                required
                min="0"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Row 3: Loan Start Date & Loan End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Loan Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Loan End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Row 4: Provided Collateral Document & Upload Sanction / Agreement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Provided Collateral Document
              </label>
              <input
                type="text"
                name="collateralDocument"
                value={formData.collateralDocument}
                onChange={handleChange}
                placeholder="e.g. Factory Property Deed"
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Upload Sanction / Agreement
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3.5 py-2.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {selectedFile ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-[180px] font-medium text-slate-800 dark:text-slate-200">
                      {selectedFile.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">Choose Document</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Row 5: Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Remarks
            </label>
            <input
              type="text"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Optional remarks, sanction ref..."
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-1/2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Loan Record"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
