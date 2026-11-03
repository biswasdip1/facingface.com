import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, ChevronLeft, ChevronRight, Share2, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍"];

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
  /** Optional action button shown in bottom-right corner (e.g. "Change Photo") */
  actionLabel?: string;
  onAction?: () => void;
  /** Pass an array of URLs to enable multi-photo navigation */
  photos?: string[];
  /** Initial index when photos array is provided */
  initialIndex?: number;
  /** Post ID to enable emoji reactions */
  postId?: number;
}

/**
 * Full-screen image lightbox with:
 * - Multi-photo navigation (swipe left/right, arrow buttons, keyboard arrows)
 * - Pinch-to-zoom (touch) and scroll-wheel zoom (desktop)
 * - Double-tap / double-click to toggle 2.5× zoom
 * - Pan when zoomed in
 * - Swipe-down to dismiss (when not zoomed)
 * - Tap backdrop to dismiss
 */
export default function ImageLightbox({
  src,
  alt = "",
  onClose,
  actionLabel,
  onAction,
  photos,
  initialIndex = 0,
  postId,
}: ImageLightboxProps) {
  // Multi-photo state
  const allPhotos = photos && photos.length > 0 ? photos : [src];
  const [current, setCurrent] = useState(() => {
    if (photos && photos.length > 0) {
      const idx = photos.indexOf(src);
      return idx >= 0 ? idx : initialIndex;
    }
    return 0;
  });

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [swipeY, setSwipeY] = useState(0);

  // Refs for gesture tracking
  const lastDist = useRef<number | null>(null);
  const lastScale = useRef(1);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeDelta = useRef(0);
  const swipeDeltaX = useRef(0);
  const isPinching = useRef(false);
  // Double-tap tracking
  const lastTapTime = useRef(0);
  const lastTapPos = useRef({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    lastScale.current = 1;
  }, []);

  const goNext = useCallback(() => {
    resetZoom();
    setCurrent((i) => (i + 1) % allPhotos.length);
  }, [allPhotos.length, resetZoom]);

  const goPrev = useCallback(() => {
    resetZoom();
    setCurrent((i) => (i - 1 + allPhotos.length) % allPhotos.length);
  }, [allPhotos.length, resetZoom]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  // Focus trap: move focus into dialog on mount, restore on unmount
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const el = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    el?.focus();
    return () => { previousFocusRef.current?.focus(); };
  }, []);
  // Keyboard navigation + focus trap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" && allPhotos.length > 1) { goNext(); return; }
      if (e.key === "ArrowLeft" && allPhotos.length > 1) { goPrev(); return; }
      if (e.key === "Tab") {
        const focusable = Array.from(
          containerRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) ?? []
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev, allPhotos.length]);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
      lastScale.current = scale;
      panStart.current = null;
    } else if (e.touches.length === 1) {
      isPinching.current = false;
      const touch = e.touches[0];

      // Double-tap detection
      const now = Date.now();
      const timeDiff = now - lastTapTime.current;
      const dx = touch.clientX - lastTapPos.current.x;
      const dy = touch.clientY - lastTapPos.current.y;
      const dist = Math.hypot(dx, dy);

      if (timeDiff < 300 && dist < 40) {
        if (scale > 1) {
          resetZoom();
        } else {
          const ZOOM = 2.5;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const relX = touch.clientX - rect.left - rect.width / 2;
          const relY = touch.clientY - rect.top - rect.height / 2;
          setScale(ZOOM);
          setTranslate({ x: -relX * (ZOOM - 1), y: -relY * (ZOOM - 1) });
          lastScale.current = ZOOM;
        }
        lastTapTime.current = 0;
        return;
      }

      lastTapTime.current = now;
      lastTapPos.current = { x: touch.clientX, y: touch.clientY };

      if (scale > 1) {
        panStart.current = { x: touch.clientX, y: touch.clientY, tx: translate.x, ty: translate.y };
      } else {
        swipeStart.current = { x: touch.clientX, y: touch.clientY };
        swipeDelta.current = 0;
        swipeDeltaX.current = 0;
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2 && lastDist.current !== null) {
      isPinching.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.min(5, Math.max(1, lastScale.current * (dist / lastDist.current)));
      setScale(newScale);
      if (newScale === 1) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1) {
      if (scale > 1 && panStart.current) {
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        setTranslate({ x: panStart.current.tx + dx, y: panStart.current.ty + dy });
      } else if (swipeStart.current !== null) {
        const deltaY = e.touches[0].clientY - swipeStart.current.y;
        const deltaX = e.touches[0].clientX - swipeStart.current.x;
        swipeDeltaX.current = deltaX;
        // Prioritise vertical swipe for dismiss
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          if (deltaY > 0) { swipeDelta.current = deltaY; setSwipeY(deltaY); }
        }
      }
    }
  };

  const onTouchEnd = () => {
    lastDist.current = null;
    panStart.current = null;
    if (swipeDelta.current > 80) {
      onClose();
    } else if (Math.abs(swipeDeltaX.current) > 50 && allPhotos.length > 1 && scale === 1) {
      // Horizontal swipe to navigate
      if (swipeDeltaX.current < 0) goNext(); else goPrev();
    } else {
      setSwipeY(0);
    }
    swipeStart.current = null;
    swipeDelta.current = 0;
    swipeDeltaX.current = 0;
  };

  // ── Wheel zoom (desktop) ────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => {
      const next = Math.min(5, Math.max(1, prev * delta));
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  };

  // ── Desktop double-click to zoom ────────────────────────────────────────────
  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      const ZOOM = 2.5;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      setScale(ZOOM);
      setTranslate({ x: -relX * (ZOOM - 1), y: -relY * (ZOOM - 1) });
      lastScale.current = ZOOM;
    }
  };

  const opacity = swipeY > 0 ? Math.max(0, 1 - swipeY / 300) : 1;
  const currentSrc = allPhotos[current];

  // Emoji reactions (only when postId is provided)
  const utils = trpc.useUtils();
  const { data: reactionData } = trpc.reactions.getCounts.useQuery(
    { targetId: postId!, targetType: "post" },
    { enabled: !!postId }
  );
  const toggleReaction = trpc.reactions.toggle.useMutation({
    onSuccess: () => { if (postId) utils.reactions.getCounts.invalidate({ targetId: postId, targetType: "post" }); },
  });
  const myReactions: string[] = reactionData?.myReactions ?? [];
  const reactionCounts: { emoji: string; count: number }[] = (reactionData?.counts ?? []) as { emoji: string; count: number }[];

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 select-none"
      style={{ opacity, transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined, transition: swipeY === 0 ? "opacity 0.2s" : "none" }}
      onClick={() => { if (scale === 1) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Image */}
      <div
        className="relative"
        style={{
          transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          transition: isPinching.current ? "none" : "transform 0.15s ease-out",
          cursor: scale > 1 ? "grab" : "zoom-in",
          maxWidth: "92vw",
          maxHeight: "88vh",
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={onDoubleClick}
      >
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          className="rounded-lg shadow-2xl object-contain"
          style={{ maxWidth: "92vw", maxHeight: "80vh", display: "block" }}
          draggable={false}
        />
      </div>

      {/* Top-right button row: Download + Share + Close */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          aria-label="Download photo"
          onClick={(e) => {
            e.stopPropagation();
            const link = document.createElement("a");
            link.href = currentSrc;
            link.download = currentSrc.split("/").pop() || "photo.jpg";
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download started");
          }}
        >
          <Download size={16} />
        </button>
        <button
          className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          aria-label="Share photo"
          onClick={(e) => {
            e.stopPropagation();
            const shareUrl = postId
              ? `${window.location.origin}/post/${postId}`
              : currentSrc.startsWith("http") ? currentSrc : `${window.location.origin}${currentSrc}`;
            if (navigator.share) {
              navigator.share({ url: shareUrl }).catch(() => {});
            } else {
              navigator.clipboard.writeText(shareUrl).then(() => toast.success("Link copied!")).catch(() => toast.error("Could not copy link"));
            }
          }}
        >
          <Share2 size={16} />
        </button>
        <button
          className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Multi-photo counter */}
      {allPhotos.length > 1 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {current + 1} / {allPhotos.length}
        </div>
      )}

      {/* Prev / Next arrows */}
      {allPhotos.length > 1 && scale === 1 && (
        <>
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous photo"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next photo"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {allPhotos.length > 1 && allPhotos.length <= 10 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
          {allPhotos.map((_, i) => (
            <button
              key={i}
              className="rounded-full transition-all"
              style={{ width: i === current ? 18 : 6, height: 6, background: i === current ? "#fff" : "rgba(255,255,255,0.4)" }}
              onClick={() => { resetZoom(); setCurrent(i); }}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Zoom reset button (shown when zoomed) */}
      {scale > 1 && (
        <button
          className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold hover:bg-black/80 transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); resetZoom(); }}
        >
          Reset zoom
        </button>
      )}

      {/* Optional action button */}
      {actionLabel && onAction && (
        <button
          className="absolute bottom-5 right-4 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--its-red,#e63329)] text-white text-xs font-bold hover:opacity-90 transition-opacity z-10"
          onClick={(e) => { e.stopPropagation(); onAction(); }}
        >
          <Camera size={13} /> {actionLabel}
        </button>
      )}

      {/* Emoji reactions bar */}
      {postId && (
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactionCounts.find((r: { emoji: string; count: number }) => r.emoji === emoji)?.count ?? 0;
            const reacted = myReactions.includes(emoji);
            return (
              <button
                key={emoji}
                className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-all"
                style={{ background: reacted ? "rgba(230,51,41,0.25)" : "transparent", transform: reacted ? "scale(1.15)" : "scale(1)" }}
                onClick={() => toggleReaction.mutate({ targetId: postId, targetType: "post", emoji })}
                title={emoji}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
                {count > 0 && <span className="text-white text-[9px] font-bold leading-none">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Hint */}
      {scale === 1 && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/40 text-[10px] pointer-events-none z-10 whitespace-nowrap">
          {allPhotos.length > 1 ? "Swipe left/right to browse · " : ""}Double-tap to zoom · Swipe down to close
        </p>
      )}
    </div>
  );
}
