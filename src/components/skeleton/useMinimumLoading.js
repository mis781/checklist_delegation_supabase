import { useState, useEffect, useRef } from "react";

/**
 * Custom hook to enforce a minimum loading duration (default 200ms).
 * Prevents rapid flickering on fast networks / cached queries.
 *
 * @param {boolean} isLoading - Real loading state from query / state
 * @param {number} minDuration - Minimum milliseconds to keep skeleton visible
 * @returns {boolean} - Stabilized loading state for UI rendering
 */
export function useMinimumLoading(isLoading, minDuration = 200) {
  const [showLoading, setShowLoading] = useState(isLoading);
  const startTimeRef = useRef(isLoading ? Date.now() : 0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setShowLoading(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minDuration - elapsed);

      if (remaining > 0 && showLoading) {
        timerRef.current = setTimeout(() => {
          setShowLoading(false);
          timerRef.current = null;
        }, remaining);
      } else {
        setShowLoading(false);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, minDuration, showLoading]);

  return showLoading;
}
