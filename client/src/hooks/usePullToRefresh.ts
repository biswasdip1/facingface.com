import { useEffect, useRef, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // px to pull before triggering (default 80)
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      // Only trigger when scrolled to the very top
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDraggingRef.current || startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta < 0) {
        // Scrolling up — cancel
        isDraggingRef.current = false;
        setPullDistance(0);
        return;
      }
      // Rubber-band: slow down as it extends
      const rubberBand = Math.min(delta * 0.5, threshold * 1.5);
      setPullDistance(rubberBand);
      if (rubberBand > 10) {
        e.preventDefault(); // prevent page scroll while pulling
      }
    },
    [threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (pullDistance >= threshold * 0.5) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    startYRef.current = null;
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
