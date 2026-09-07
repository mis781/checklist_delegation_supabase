import { useState } from "react";
import UserModal from "./UserModal";
import { ACCESS_PAGES } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";
import { UserPlus, Shield, Info, Edit2 } from "lucide-react";

export default function ReturnSettingsView() {
  const { usersAdmin, canView, canEdit } = usePurchaseReturn();
  const isEditable = canEdit("settings");

  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!canView("settings")) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Access Restricted
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          You do not have permission to view User Management and Access Settings.
        </p>
      </div>
    );
  }

  const renderBadge = (level) => {
    switch (level) {
      case "edit":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Edit
          </span>
        );
      case "view":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            View
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            No Access
          </span>
        );
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* User Management Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              User Management &amp; Page Access
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage operators and granular page-level permissions across ReturnTrack
            </p>
          </div>

          {isEditable && (
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Username</th>
                <th className="py-3 px-3">Designation / Role</th>
                {ACCESS_PAGES.map((p) => (
                  <th key={p.key} className="py-3 px-3 text-center">
                    {p.label}
                  </th>
                ))}
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {usersAdmin.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {u.name}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    @{u.username}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                    {u.role}
                  </td>
                  {ACCESS_PAGES.map((p) => (
                    <td key={p.key} className="py-3 px-3 text-center">
                      {renderBadge(u.access ? u.access[p.key] : "none")}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center">
                    {isEditable ? (
                      <button
                        type="button"
                        onClick={() => handleEdit(u)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 text-xs font-bold uppercase tracking-wider">
          <Info className="w-4 h-4 text-blue-500" />
          <span>How Access Permissions Work</span>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <p>
            <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
              Edit
            </strong>{" "}
            &mdash; The user has full operational control: they can view records, initiate actions, approve/reject returns, record bilty, upload debit note scans, and dispatch goods.
          </p>
          <p>
            <strong className="text-blue-700 dark:text-blue-400 font-bold">
              View
            </strong>{" "}
            &mdash; The user can view the data table and inspect the audit trail details, but action and submission buttons are disabled with a view-only warning banner.
          </p>
          <p>
            <strong className="text-slate-500 font-bold">No Access</strong>{" "}
            &mdash; The page is completely hidden from the user's sidebar navigation.
          </p>
          <p className="pt-2 text-[11px] text-slate-500 italic border-t border-slate-100 dark:border-slate-800">
            Tip: You can use the "Switch User" selector in the top-right header to simulate different roles live and verify their restricted views.
          </p>
        </div>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
