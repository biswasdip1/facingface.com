import { useState, useEffect } from "react";

export type ConnectionQuality = "online" | "slow" | "offline";

interface NetworkStatus {
  quality: ConnectionQuality;
  isOnline: boolean;
  isSlow: boolean;
}

/**
 * Monitors the browser's network status.
 * - "offline"  → navigator.onLine is false
 * - "slow"     → effective connection type is "2g" or "slow-2g"
 * - "online"   → everything else
 */
export function useNetworkStatus(): NetworkStatus {
  const getQuality = (): ConnectionQuality => {
    if (!navigator.onLine) return "offline";
    // Network Information API (Chrome/Android)
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return "slow";
    return "online";
  };

  const [quality, setQuality] = useState<ConnectionQuality>(getQuality);

  useEffect(() => {
    const update = () => setQuality(getQuality());

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const conn = (navigator as unknown as { connection?: EventTarget }).connection;
    conn?.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener("change", update);
    };
  }, []);

  return {
    quality,
    isOnline: quality === "online",
    isSlow: quality === "slow",
  };
}
