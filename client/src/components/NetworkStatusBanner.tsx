import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * A slim fixed banner that appears at the top of the viewport when the user
 * goes offline or is on a very slow connection.  It also briefly shows a
 * "Back online" confirmation when connectivity is restored.
 */
export function NetworkStatusBanner() {
  const { quality } = useNetworkStatus();
  const [prevQuality, setPrevQuality] = useState(quality);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // When transitioning from offline/slow → online, briefly show "Back online"
    if (prevQuality !== "online" && quality === "online") {
      setShowRestored(true);
      const t = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(t);
    }
    setPrevQuality(quality);
  }, [quality, prevQuality]);

  const isVisible = quality !== "online" || showRestored;

  if (!isVisible) return null;

  const isOffline = quality === "offline";
  const isSlow = quality === "slow";
  const isRestored = showRestored && quality === "online";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 ${
        isOffline
          ? "bg-red-600 text-white"
          : isSlow
          ? "bg-amber-500 text-white"
          : "bg-green-600 text-white"
      }`}
    >
      {isRestored ? (
        <>
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Back online</span>
        </>
      ) : isOffline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You are offline — some features may not work</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 shrink-0 opacity-70" />
          <span>Slow connection detected — images may take longer to load</span>
        </>
      )}
    </div>
  );
}
