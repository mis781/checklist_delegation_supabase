import { useCallback, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { READ_ONLY_TOOLTIP } from "../utils/pagePermissionUtils";
import { useMagicToast } from "../context/MagicToastContext";
import { ReadOnlyGuardContext } from "./readOnlyGuardContext";
import { ACTION_ICON_RE, isActionLabel } from "./readOnlyActionRules";

/**
 * Page-wide enforcement of the "Read" (view-only) page permission.
 *
 * Wraps a page's content and, while `active`:
 *  - disables every action button (add / create / save / submit / approve / reject / delete /
 *    edit / generate / send / upload / bulk action ...) inside the page AND inside modals the
 *    page renders through portals,
 *  - blocks clicks on those controls and all form submissions (Enter key included),
 *  - leaves viewing controls working (view, filter, search, export, download, print, close,
 *    cancel, refresh, tabs, pagination).
 *
 * Pages that already wire `usePagePermission` keep their own handling; this is the safety net
 * that covers every page, including ones without explicit wiring.
 */

const CONTROL_SELECTOR = 'button, input[type="submit"], input[type="button"], input[type="file"], [role="button"]';
const MARK = "data-ro-disabled";

function controlText(el) {
  const text = (el.innerText || el.value || "").replace(/\s+/g, " ").trim();
  const extra = `${el.getAttribute("title") || ""} ${el.getAttribute("aria-label") || ""}`.trim();
  return `${text} ${extra}`.trim();
}

function isActionControl(el) {
  if (el.closest("[data-ro-allow]")) return false; // explicit opt-out
  if (el.matches('input[type="file"]')) return true;
  if (el.matches('input[type="submit"]') || el.getAttribute("type") === "submit") return true;
  const text = controlText(el);
  if (text) return isActionLabel(text);
  const svg = el.querySelector("svg");
  return !!svg && ACTION_ICON_RE.test(svg.getAttribute("class") || "");
}

export default function ReadOnlyGuard({ active, showBanner = true, children }) {
  const containerRef = useRef(null);
  const { showToast } = useMagicToast();

  // Controls inside the page, plus modals rendered through portals (outside the app root)
  const inScope = useCallback((el) => {
    const container = containerRef.current;
    if (!container) return false;
    if (container.contains(el)) return true;
    const root = document.getElementById("root");
    return !!root && !root.contains(el);
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    let frame = 0;

    const apply = () => {
      frame = 0;
      document.querySelectorAll(CONTROL_SELECTOR).forEach((el) => {
        if (!inScope(el)) return;
        if (isActionControl(el)) {
          if (!el.hasAttribute(MARK)) {
            el.setAttribute(MARK, "");
            el.setAttribute("title", READ_ONLY_TOOLTIP);
          }
          if (!el.disabled && "disabled" in el) el.disabled = true;
          if (el.getAttribute("role") === "button") el.setAttribute("aria-disabled", "true");
        }
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    // Re-apply when React re-renders (new rows, opened modals, re-enabled buttons, changed labels)
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "class"],
    });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active, inScope]);

  const notify = () => showToast(READ_ONLY_TOOLTIP, "warning");

  // React events bubble through portals, so these also catch modal content
  const onClickCapture = (e) => {
    if (!active) return;
    const el = e.target.closest?.(CONTROL_SELECTOR);
    if (el && isActionControl(el)) {
      e.preventDefault();
      e.stopPropagation();
      notify();
    }
  };
  const onSubmitCapture = (e) => {
    if (!active) return;
    if (e.target.closest?.("[data-ro-allow]")) return;
    e.preventDefault();
    e.stopPropagation();
    notify();
  };

  return (
    <ReadOnlyGuardContext.Provider value={active}>
      <div ref={containerRef} onClickCapture={onClickCapture} onSubmitCapture={onSubmitCapture} className="contents">
        {active && showBanner && (
          <div
            role="status"
            className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-lg text-xs font-semibold mt-3 mb-1"
          >
            <Lock size={14} className="shrink-0" />
            View-only mode: you have Read permission on this page. Adding, editing, approving and submitting are disabled.
          </div>
        )}
        {children}
      </div>
    </ReadOnlyGuardContext.Provider>
  );
}
