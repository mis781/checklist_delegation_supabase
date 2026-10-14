import { Lock } from "lucide-react";
import { useInsideReadOnlyGuard } from "./readOnlyGuardContext";

/**
 * Shown at the top of a page when the user only has Read permission on it.
 * Usage: const { isReadOnly } = usePagePermission("page_id"); {isReadOnly && <ReadOnlyBanner />}
 * Renders nothing when the layout-level ReadOnlyGuard already shows its banner.
 */
export default function ReadOnlyBanner({ className = "" }) {
  const guardActive = useInsideReadOnlyGuard();
  if (guardActive) return null;
  return (
    <div
      role="status"
      className={`flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-lg text-xs font-semibold ${className}`}
    >
      <Lock size={14} className="shrink-0" />
      View-only mode: you have Read permission on this page. Adding, editing, approving and submitting are disabled.
    </div>
  );
}
