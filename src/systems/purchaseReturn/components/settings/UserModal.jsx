import { useState, useEffect } from "react";
import ActionModalWrapper from "../common/ActionModalWrapper";
import { ACCESS_PAGES } from "../../data/dummyPurchaseReturns";
import { usePurchaseReturn } from "../../context/PurchaseReturnContext";

export default function UserModal({ isOpen, onClose, user }) {
  const { saveUser, deleteUser } = usePurchaseReturn();
  const isEdit = Boolean(user && user.id);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [access, setAccess] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setName(user.name || "");
        setUsername(user.username || "");
        setRole(user.role || "");
        setAccess(user.access || {});
      } else {
        setName("");
        setUsername("");
        setRole("User");
        const defaultAccess = {};
        ACCESS_PAGES.forEach((p) => {
          defaultAccess[p.key] = "view";
        });
        setAccess(defaultAccess);
      }
    }
  }, [isOpen, user]);

  const handleAccessChange = (pageKey, level) => {
    setAccess((prev) => ({ ...prev, [pageKey]: level }));
  };

  const handleSubmit = () => {
    if (!name.trim() || !username.trim()) return;
    saveUser({
      id: user ? user.id : null,
      name: name.trim(),
      username: username.trim(),
      role: role.trim() || "User",
      access
    });
    onClose();
  };

  const handleDelete = () => {
    if (user && user.id) {
      deleteUser(user.id);
      onClose();
    }
  };

  return (
    <ActionModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit User Access" : "Create New User"}
      subtitle={isEdit ? `@${user.username}` : "Assign page access permissions"}
      maxWidth="max-w-lg"
      footer={
        <div className="w-full flex items-center justify-between">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              Delete User
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || !username.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. psharma"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Role / Designation
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Store Executive"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Page-Level Permissions
          </h4>

          <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
            {ACCESS_PAGES.map((p) => {
              const currentVal = access[p.key] || "none";
              return (
                <div
                  key={p.key}
                  className="flex items-center justify-between pt-2 gap-4"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                    {p.label}
                  </span>
                  <select
                    value={currentVal}
                    onChange={(e) => handleAccessChange(p.key, e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                  >
                    <option value="none">No Access</option>
                    <option value="view">View Only</option>
                    <option value="edit">Edit</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ActionModalWrapper>
  );
}
