import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { trpc } from "@/lib/trpc";
import { POST_WORD_LIMIT } from "@shared/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Heart, MessageCircle, Trash2, Link2, FileText, Download, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Share2, Smile, Repeat2, Pencil, Check, BadgeCheck, Pin, Bookmark, History, Languages, Flag } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Link } from "wouter";
import ImageLightbox from "@/components/ImageLightbox";
import { formatDistanceToNow, format } from "date-fns";
import CommentSection from "./CommentSection";
import PollCard from "./PollCard";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useThemeMode } from "@/contexts/ThemeModeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function buildArtisticTextBackground(background: string): string {
  return `radial-gradient(circle at 14% 20%, rgba(255,255,255,0.22) 0 13%, transparent 14%), radial-gradient(ellipse at 72% 48%, rgba(255,255,255,0.16) 0 30%, transparent 31%), radial-gradient(circle at 88% 82%, rgba(0,0,0,0.12) 0 20%, transparent 21%), ${background}`;
}

function getTextBackgroundTextColor(background: string): string {
  return background.includes("#e5e7eb") || background.includes("#f8fafc") ? "#374151" : "#ffffff";
}

// ─── Word-diff utility ───────────────────────────────────────────────────────
type DiffToken = { text: string; type: "equal" | "removed" | "added" };
function wordDiff(oldText: string, newText: string): DiffToken[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  // Simple LCS-based diff
  const m = oldWords.length, n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = oldWords[i - 1] === newWords[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  }
  const result: DiffToken[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ text: oldWords[i - 1], type: "equal" }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: newWords[j - 1], type: "added" }); j--;
    } else {
      result.unshift({ text: oldWords[i - 1], type: "removed" }); i--;
    }
  }
  return result;
}
function DiffView({ oldText, newText, bgColor }: { oldText: string; newText: string; bgColor?: string | null }) {
  const tokens = wordDiff(oldText, newText);
  const textColor = bgColor ? "#fff" : "var(--its-text-primary)";
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: textColor }}>
      {tokens.map((tok, i) => {
        if (tok.type === "equal") return <span key={i}>{tok.text}</span>;
        if (tok.type === "removed") return (
          <span key={i} style={{ background: "rgba(220,38,38,0.25)", color: bgColor ? "#fca5a5" : "#b91c1c", textDecoration: "line-through" }}>{tok.text}</span>
        );
        return (
          <span key={i} style={{ background: "rgba(22,163,74,0.25)", color: bgColor ? "#86efac" : "#15803d", fontWeight: 600 }}>{tok.text}</span>
        );
      })}
    </p>
  );
}

// ─── Edit History Label + Dialog ─────────────────────────────────────────────
function EditHistoryLabel({ postId, editedAt, currentText }: { postId: number; editedAt: Date; currentText: string | null }) {
  const [open, setOpen] = useState(false);
  const { data: history, isLoading } = trpc.posts.getEditHistory.useQuery(
    { postId },
    { enabled: open }
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground mb-2 italic hover:text-foreground transition-colors group"
      >
        <History size={11} className="group-hover:text-[var(--its-red)] transition-colors" />
        <span>Edited {format(new Date(editedAt), "MMM d 'at' h:mm a")} · View history</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">Edit History</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
          ) : !history || history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center italic">No previous versions recorded.</p>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Current version at top */}
              <div className="border-2 border-[var(--its-red)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)] mb-1">Current version</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">{currentText ?? <em className="text-muted-foreground">No text</em>}</p>
              </div>
              {/* Previous versions with word-diff against the next version */}
              {history.map((entry, idx) => {
                const nextText = idx === 0 ? (currentText ?? "") : (history[idx - 1].previousText ?? "");
                const prevText = entry.previousText ?? "";
                return (
                  <div key={entry.id} className="border border-border p-3" style={{ background: entry.previousBgColor ?? "var(--its-surface)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: entry.previousBgColor ? "rgba(255,255,255,0.7)" : "var(--its-text-muted)" }}>
                        Version {history.length - idx} &mdash; {format(new Date(entry.editedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 border" style={{ borderColor: entry.previousBgColor ? "rgba(255,255,255,0.4)" : "var(--its-border)", color: entry.previousBgColor ? "rgba(255,255,255,0.7)" : "var(--its-text-muted)" }}>diff vs next</span>
                    </div>
                    {prevText ? (
                      <DiffView oldText={prevText} newText={nextText} bgColor={entry.previousBgColor} />
                    ) : (
                      <p className="text-xs italic" style={{ color: entry.previousBgColor ? "rgba(255,255,255,0.6)" : "var(--its-text-muted)" }}>No text</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface Author {
  id: number;
  name: string | null;
  avatar: string | null;
  isVerified?: boolean;
}

interface PostData {
  id: number;
  authorId: number;
  text: string | null;
  mediaUrl: string | null;
  photo2Url: string | null;
  photo3Url: string | null;
  photo1Caption: string | null;
  photo2Caption: string | null;
  photo3Caption: string | null;
  mediaType: "image" | "video" | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkDescription: string | null;
  linkImage: string | null;
  linkSiteName: string | null;
  docUrl: string | null;
  docName: string | null;
  docSize: number | null;
  docType: string | null;
  bgColor: string | null;
  audioUrl: string | null;
  audioName: string | null;
  audioDuration: number | null;
  resharedFromId?: number | null;
  reshareComment?: string | null;
  createdAt: Date;
  editedAt?: Date | null;
  isPinned?: boolean | null;
  videoPosterUrl?: string | null;
  hideEditHistory?: boolean | null;
  photo1Alt?: string | null;
  photo2Alt?: string | null;
  photo3Alt?: string | null;
}

const countPostWords = (value: string): number => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

interface PostCardProps {
  post: PostData;
  author: Author | undefined;
  likeCount: number;
  commentCount?: number;
  isLiked: boolean;
  onDelete?: () => void;
  // reshare data (passed from feed)
  resharedPost?: PostData | null;
  resharedAuthor?: Author | null;
  authorHasStory?: boolean;
  /** When true, show Pin/Unpin option (only on profile page) */
  showPinActions?: boolean;
  onPinChange?: () => void;
}

// ─── Photo Lightbox ───────────────────────────────────────────────────────────

interface LightboxProps {
  photos: string[];
  captions: (string | null)[];
  initialIndex: number;
  onClose: () => void;
}

function PhotoLightbox({ photos, captions, initialIndex, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  // Pinch-to-zoom state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDist = useRef<number | null>(null);
  const lastScale = useRef(1);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const isPinching = useRef(false);

  const resetZoom = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); lastScale.current = 1; }, []);
  // Double-tap tracking
  const lastTapTime = useRef(0);
  const lastTapPos = useRef({ x: 0, y: 0 });

  const prev = useCallback(() => { resetZoom(); setCurrent((i) => (i - 1 + photos.length) % photos.length); }, [photos.length, resetZoom]);
  const next = useCallback(() => { resetZoom(); setCurrent((i) => (i + 1) % photos.length); }, [photos.length, resetZoom]);

  const containerRef = useRef<HTMLDivElement>(null);
  // Focus trap: move focus into dialog on mount, restore on unmount
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    // Focus the first focusable element inside the lightbox
    const el = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    el?.focus();
    return () => { previousFocusRef.current?.focus(); };
  }, []);
  // Focus trap: Tab/Shift+Tab stays inside
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowLeft") { prev(); return; }
    if (e.key === "ArrowRight") { next(); return; }
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
  }, [onClose, prev, next]);
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = ""; };
  }, [handleKeyDown]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
      lastScale.current = scale;
      panStart.current = null;
    } else {
      isPinching.current = false;
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;

      // Double-tap detection
      const now = Date.now();
      const timeDiff = now - lastTapTime.current;
      const dx = touch.clientX - lastTapPos.current.x;
      const dy = touch.clientY - lastTapPos.current.y;
      if (timeDiff < 300 && Math.hypot(dx, dy) < 40) {
        if (scale > 1) {
          resetZoom();
        } else {
          const ZOOM = 2.5;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const relX = touch.clientX - rect.left - rect.width / 2;
          const relY = touch.clientY - rect.top - rect.height / 2;
          setScale(ZOOM); setTranslate({ x: -relX * (ZOOM - 1), y: -relY * (ZOOM - 1) }); lastScale.current = ZOOM;
        }
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;
      lastTapPos.current = { x: touch.clientX, y: touch.clientY };

      if (scale > 1) {
        panStart.current = { x: touch.clientX, y: touch.clientY, tx: translate.x, ty: translate.y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      isPinching.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.min(5, Math.max(1, lastScale.current * (dist / lastDist.current)));
      setScale(newScale);
      if (newScale === 1) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && scale > 1 && panStart.current) {
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setTranslate({ x: panStart.current.tx + dx, y: panStart.current.ty + dy });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastDist.current = null;
    panStart.current = null;
    if (isPinching.current) { isPinching.current = false; return; }
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (scale > 1) { touchStartX.current = null; touchStartY.current = null; return; }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); }
    touchStartX.current = null; touchStartY.current = null;
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(photos[current]);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = `photo-${current + 1}.jpg`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
    } catch { toast.error("Could not download photo."); }
  };

  const caption = captions[current];

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={() => { if (scale === 1) onClose(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 z-10">
        <button className="flex items-center justify-center rounded-full hover:bg-white/20" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", color: "#fff" }}
          onClick={(e) => { e.stopPropagation(); handleDownload(); }} aria-label="Download photo">
          <Download size={18} />
        </button>
        {photos.length > 1 && (
          <div className="text-sm font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.4)", padding: "4px 14px", borderRadius: 999 }}>
            {current + 1} / {photos.length}
          </div>
        )}
        <button className="flex items-center justify-center rounded-full hover:bg-white/20" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", color: "#fff" }}
          onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      {photos.length > 1 && (
        <button className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full hover:bg-white/20"
          style={{ width: 44, height: 44, background: "rgba(255,255,255,0.12)", color: "#fff" }}
          onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous photo">
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="flex flex-col items-center justify-center w-full px-16" style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
        <img key={current} src={photos[current]} alt={caption ?? `Photo ${current + 1}`} className="max-w-full object-contain select-none"
          style={{ maxHeight: caption ? "calc(90vh - 80px)" : "90vh", boxShadow: "0 8px 48px rgba(0,0,0,0.6)", transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, transition: isPinching.current ? "none" : "transform 0.15s ease-out", cursor: scale > 1 ? "grab" : "zoom-in" }} draggable={false} />
        {caption && (
          <p className="mt-3 text-center text-sm font-medium px-4" style={{ color: "rgba(255,255,255,0.88)", maxWidth: 600, lineHeight: 1.5 }}>
            {caption}
          </p>
        )}
      </div>
      {photos.length > 1 && (
        <button className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full hover:bg-white/20"
          style={{ width: 44, height: 44, background: "rgba(255,255,255,0.12)", color: "#fff" }}
          onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next photo">
          <ChevronRight size={24} />
        </button>
      )}
      {photos.length > 1 && (
        <div className="flex gap-2 pb-5" onClick={(e) => e.stopPropagation()}>
          {photos.map((src, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)} style={{ width: 48, height: 48, border: idx === current ? "2px solid #e63329" : "2px solid rgba(255,255,255,0.3)", borderRadius: 4, overflow: "hidden", opacity: idx === current ? 1 : 0.6, padding: 0, background: "none", cursor: "pointer" }}>
              <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Text with clickable links ────────────────────────────────────────────────

function normalizeComparableUrl(url: string | null | undefined) {
  if (!url) return "";
  return url
    .trim()
    .replace(/[),.;!?]+$/g, "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function removePreviewUrlFromText(text: string, previewUrl: string | null | undefined) {
  const normalizedPreviewUrl = normalizeComparableUrl(previewUrl);
  if (!normalizedPreviewUrl) return text;
  return text
    .replace(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, (url) => {
      const normalizedTextUrl = normalizeComparableUrl(url);
      return normalizedTextUrl === normalizedPreviewUrl || normalizedTextUrl.startsWith(`${normalizedPreviewUrl}?`) ? "" : url;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function TextWithLinks({ text }: { text: string }) {
  const [, navigate] = useLocation();
  // Match URLs and hashtags
  const tokenRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)|(#[\w\u0900-\u097F]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) {
      // URL
      const url = match[1];
      parts.push(<a key={`url-${match.index}`} href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--its-red)] underline break-all hover:opacity-80" onClick={(e) => e.stopPropagation()}>{url}</a>);
    } else if (match[2]) {
      // Hashtag
      const tag = match[2];
      parts.push(<button key={`tag-${match.index}`} onClick={(e) => { e.stopPropagation(); navigate(`/tag/${tag.slice(1).toLowerCase()}`); }} className="text-[var(--its-red)] font-semibold hover:underline">{tag}</button>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

// ─── Emoji Reaction Bar ───────────────────────────────────────────────────────

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

interface ReactionBarProps {
  targetId: number;
  targetType: "post" | "comment";
}

function ReactionBar({ targetId, targetType }: ReactionBarProps) {
  const { themeMode } = useThemeMode();
  const emojiTheme = themeMode === "lightdark" ? "dark" : "light";
  const utils = trpc.useUtils();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { data } = trpc.reactions.getCounts.useQuery({ targetId, targetType });
  const counts = data?.counts ?? {};
  const myReactions = data?.myReactions ?? [];

  const toggleReaction = trpc.reactions.toggle.useMutation({
    onMutate: async ({ emoji }) => {
      // Optimistic update
      await utils.reactions.getCounts.cancel({ targetId, targetType });
      const prev = utils.reactions.getCounts.getData({ targetId, targetType });
      
      utils.reactions.getCounts.setData({ targetId, targetType }, (old) => {
        if (!old) return old;
        const newCounts = { ...old.counts };
        const newMyReactions = [...old.myReactions];
        
        if (newMyReactions.includes(emoji)) {
          newMyReactions.splice(newMyReactions.indexOf(emoji), 1);
          newCounts[emoji] = Math.max(0, (newCounts[emoji] ?? 0) - 1);
        } else {
          newMyReactions.push(emoji);
          newCounts[emoji] = (newCounts[emoji] ?? 0) + 1;
        }
        
        return { ...old, counts: newCounts, myReactions: newMyReactions };
      });
      
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.reactions.getCounts.setData({ targetId, targetType }, ctx.prev);
      }
      toast.error("Failed to save reaction. Please try again.");
    },
    onSuccess: () => {
      utils.reactions.getCounts.invalidate({ targetId, targetType });
    },
  });

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleEmoji = (emoji: string) => {
    toggleReaction.mutate({ targetId, targetType, emoji });
    setShowPicker(false);
  };

  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="relative">
      {/* Quick emoji buttons + full picker toggle */}
      <div className="flex items-center gap-1 flex-wrap">
        {QUICK_EMOJIS.map((emoji) => {
          const count = counts[emoji] ?? 0;
          const isActive = myReactions.includes(emoji);
          return (
            <button
              key={emoji}
              onClick={() => handleEmoji(emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-sm rounded-full border transition-all ${
                isActive
                  ? "border-[var(--its-red)] bg-[var(--its-red)]/10"
                  : "border-border hover:border-[var(--its-red)] hover:bg-[var(--its-red)]/5"
              }`}
              title={`React with ${emoji}`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-[10px] font-bold text-muted-foreground ml-0.5">{count}</span>}
            </button>
          );
        })}
        {/* More reactions button */}
        <button
          onClick={() => setShowPicker((v) => !v)}
          className={`flex items-center justify-center w-7 h-7 rounded-full border transition-all ${showPicker ? "border-[var(--its-red)] text-[var(--its-red)]" : "border-border text-muted-foreground hover:border-[var(--its-red)] hover:text-[var(--its-red)]"}`}
          title="More reactions"
          aria-label="More reactions"
        >
          <Smile size={13} />
        </button>
        {totalReactions > 0 && (
          <span className="text-xs text-muted-foreground ml-1">{totalReactions} reaction{totalReactions !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Full emoji picker */}
      {showPicker && (
        <div ref={pickerRef} className="absolute left-0 top-full mt-1 z-50 shadow-xl" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.18))" }}>
          <Picker
            data={data}
            onEmojiSelect={(e: { native: string }) => handleEmoji(e.native)}
            theme={emojiTheme}
            set="native"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={2}
            perLine={8}
          />
        </div>
      )}
    </div>
  );
}

// ─── PostReactionCountsRow ─────────────────────────────────────────────────────────────────────────────

const REACTION_EMOJI_MAP: Record<string, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
  seen: "🤐",
};

function ReactionIcon({ type, emoji, size = "sm" }: { type: string; emoji?: string; size?: "sm" | "md" | "lg" }) {
  const className = size === "lg" ? "w-6 h-6" : size === "md" ? "w-5 h-5" : "w-4 h-4";
  if (type === "seen") {
    return <img src="/reactions/seen-no-comment.png" alt="Seen, no comment" className={`${className} object-contain`} />;
  }
  return <span className="leading-none">{emoji ?? REACTION_EMOJI_MAP[type] ?? type}</span>;
}

function PostReactionSummary({ postId }: { postId: number }) {
  const { data } = trpc.postReactions.getCounts.useQuery({ postId });
  const counts = (data?.counts ?? {}) as Record<string, number>;
  const reactionOrder = ["like", "love", "haha", "wow", "sad", "angry", "seen"];
  const entries = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([typeA, countA], [typeB, countB]) => countB - countA || reactionOrder.indexOf(typeA) - reactionOrder.indexOf(typeB));
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const topEntries = entries.slice(0, 3);

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mr-2">
      <div className="flex items-center" aria-label={`${total.toLocaleString()} reactions`}>
        {topEntries.map(([type], i) => (
          <span
            key={type}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border text-[11px] leading-none shadow-sm"
            style={{ marginLeft: i > 0 ? "-6px" : 0, zIndex: 3 - i }}
            title={`${REACTION_EMOJI_MAP[type] ?? type} reaction`}
          >
            <ReactionIcon type={type} emoji={REACTION_EMOJI_MAP[type]} />
          </span>
        ))}
      </div>
      <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{total.toLocaleString()}</span>
    </div>
  );
}

// Ensure reaction mutations trigger cache updates
function useReactionMutationUpdates(postId: number) {
  const utils = trpc.useUtils();
  return {
    onSuccess: () => {
      utils.postReactions.getCounts.invalidate({ postId });
      utils.posts.feed.invalidate();
    }
  };
}

// ─── PostReactButton (Facebook-style reaction picker) ─────────────────────────

const REACTION_DEFS: { type: string; emoji: string; label: string; color: string }[] = [
  { type: "like",  emoji: "👍", label: "Like",  color: "#1877f2" },
  { type: "love",  emoji: "❤️", label: "Love",  color: "#f33e58" },
  { type: "haha",  emoji: "😂", label: "Haha",  color: "#f7b125" },
  { type: "wow",   emoji: "😮", label: "Wow",   color: "#f7b125" },
  { type: "sad",   emoji: "😢", label: "Sad",   color: "#f7b125" },
  { type: "angry", emoji: "😡", label: "Angry", color: "#e9710f" },
  { type: "seen",  emoji: "🤐", label: "Seen, no comment", color: "#c2188f" },
];

function PostReactButton({ postId, initialCount = 0 }: { postId: number; initialCount?: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = trpc.postReactions.getCounts.useQuery(
    { postId },
    { enabled: true }
  );
  const myReaction = data?.myReaction ?? null;

  const setReaction = trpc.postReactions.set.useMutation({
    onSuccess: () => {
      console.log("✅ Reaction saved successfully - refetching data");
      // CRITICAL FIX: Refetch immediately after success to ensure data persists
      utils.postReactions.getCounts.refetch({ postId });
      utils.posts.feed.invalidate();
    },
    onError: (err) => {
      console.error("❌ Reaction mutation error:", err);
      toast.error("Failed to save reaction. Please try again.");
    },
  });

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleReact = (type: string) => {
    if (!user) return;
    const newReaction = myReaction === type ? null : type as "like" | "love" | "haha" | "wow" | "sad" | "angry" | "seen";
    setReaction.mutate({ postId, reaction: newReaction });
    setShowPicker(false);
  };

  const currentDef = REACTION_DEFS.find((r) => r.type === myReaction);

  return (
    <div className="relative">
      {/* Main button */}
      <button
        onClick={() => {
          if (!user) return;
          if (myReaction) {
            // Toggle off current reaction on click
            handleReact(myReaction);
          } else {
            handleReact("like");
          }
        }}
        onMouseEnter={() => {
          if (!user) return;
          hoverTimer.current = setTimeout(() => setShowPicker(true), 400);
        }}
        onMouseLeave={() => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
        }}
        onTouchStart={(e) => {
          if (!user) return;
          // Long-press on mobile: show picker after 500ms
          longPressTimer.current = setTimeout(() => {
            e.preventDefault();
            setShowPicker(true);
          }, 500);
        }}
        onTouchEnd={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        onTouchMove={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        className={`flex items-center gap-1.5 justify-center py-1.5 text-xs font-bold tracking-widest uppercase transition-colors ${
          myReaction ? "" : "text-muted-foreground hover:text-[var(--its-red)]"
        }`}
        style={myReaction ? { color: currentDef?.color } : {}}
        aria-label={myReaction ? `Remove ${currentDef?.label ?? "like"} reaction` : "Like this post"}
        aria-pressed={!!myReaction}
      >
        <span className="text-sm leading-none"><ReactionIcon type={currentDef?.type ?? "like"} emoji={currentDef?.emoji ?? "👍"} size="sm" /></span>
        <span>{currentDef ? (currentDef.label === "Seen, no comment" ? "Seen" : currentDef.label) : "Like"}</span>
      </button>

      {/* Reaction picker popup */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1 bg-background border border-border rounded-full px-3 py-2 shadow-xl"
          onMouseEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
          onMouseLeave={() => setShowPicker(false)}
        >
          {REACTION_DEFS.map((r) => (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              title={r.label}
              aria-label={r.label}
              className={`flex flex-col items-center gap-0.5 px-1 py-0.5 rounded-full transition-all hover:scale-125 ${
                myReaction === r.type ? "scale-125" : ""
              }`}
            >
              <span className="text-xl leading-none"><ReactionIcon type={r.type} emoji={r.emoji} size="lg" /></span>
              <span className="text-[9px] font-bold" style={{ color: r.color }}>{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── VideoPlayer (thumbnail poster + play overlay) ─────────────────────────

function formatDuration(secs: number): string {
  if (!isFinite(secs) || secs <= 0) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoPlayer({ src, poster }: { src: string; poster?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    setTimeout(() => videoRef.current?.play(), 50);
  };

  return (
    <div className="mb-4 border border-border relative overflow-hidden bg-black">
      {!playing ? (
        // Thumbnail state
        <div className="relative w-full" style={{ minHeight: "200px" }}>
          {/* Hidden video used only to generate the poster frame and read duration */}
          <video
            src={src + "#t=0.1"}
            preload="metadata"
            muted
            playsInline
            poster={poster || undefined}
            className={`w-full max-h-[480px] block object-contain transition-opacity ${thumbLoaded ? "opacity-100" : "opacity-0"}`}
            onLoadedMetadata={(e) => setDuration((e.currentTarget as HTMLVideoElement).duration)}
            onLoadedData={() => setThumbLoaded(true)}
            onError={() => setThumbError(true)}
          />
          {/* Shimmer while thumbnail loads */}
          {!thumbLoaded && !thumbError && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Duration badge */}
          {duration > 0 && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-semibold px-2 py-0.5 rounded pointer-events-none select-none">
              {formatDuration(duration)}
            </div>
          )}
          {/* Play button */}
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center focus:outline-none group"
            aria-label="Play video"
          >
            <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center border-2 border-white/80 group-hover:bg-black/80 group-hover:scale-110 transition-all duration-150">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </button>
        </div>
      ) : (
        // Playing state
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          className="w-full max-h-[480px] block"
          style={{ background: "#000" }}
        />
      )}
    </div>
  );
}

// ─── PostImageCell (progressive loading + broken-image fallback) ─────────────
function PostImageCell({ src, alt, single, onClick, tooltip }: { src: string; alt: string; single: boolean; onClick: () => void; tooltip?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [containerRef, isVisible] = useIntersectionObserver({ rootMargin: "200px" });
  return (
    <button
      ref={containerRef as unknown as React.RefObject<HTMLButtonElement>}
      type="button"
      className="overflow-hidden p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[var(--its-red)] relative"
      style={{ aspectRatio: single ? "auto" : "1", display: "block" }}
      onClick={onClick}
      aria-label={`View ${alt} fullscreen`}
      title={tooltip}
    >
      {/* Skeleton shimmer — always shown until image loads or enters viewport */}
      {(!loaded || !isVisible) && !errored && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          style={{ minHeight: single ? "200px" : undefined }}
        />
      )}
      {/* Only render actual images once within 200px of viewport */}
      {isVisible && (
        <>
          {/* Blurred placeholder — same URL rendered with heavy blur as cheap LQIP */}
          {!errored && (
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-0" : "opacity-100"}`}
              style={{ filter: "blur(20px)", transform: "scale(1.05)", pointerEvents: "none" }}
            />
          )}
          {/* Broken image fallback */}
          {errored && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2"
              style={{ minHeight: single ? "200px" : undefined }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-xs font-medium">Image unavailable</span>
            </div>
          )}
          {/* Full-resolution image — fades in over the blurred placeholder */}
          {!errored && (
            <img
              src={src}
              alt={alt}
              className={`relative w-full object-cover block transition-opacity duration-500 hover:opacity-90 ${single ? "max-h-[480px]" : "h-full"} ${loaded ? "opacity-100" : "opacity-0"}`}
              style={{ pointerEvents: "none" }}
              loading="eager"
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setErrored(true); }}
            />
          )}
        </>
      )}
    </button>
  );
}
function LatestCommentPreview({ postId, commentCount, onOpenComments }: { postId: number; commentCount: number; onOpenComments: () => void }) {
  const { data } = trpc.comments.list.useQuery(
    { postId },
    { enabled: commentCount > 0, staleTime: 30_000 }
  );
  const comment = data?.comments?.[0];
  const author = comment ? data?.authors?.[comment.authorId] : undefined;

  if (!comment) return null;

  return (
    <button
      type="button"
      onClick={onOpenComments}
      className="mt-2 flex w-full items-start gap-2 border-t border-border/30 pt-2 text-left hover:bg-secondary/40 transition-colors"
      aria-label="Open comments"
    >
      {author?.avatar ? (
        <img src={author.avatar} alt={author.name ?? ""} className="w-7 h-7 object-cover border border-border flex-shrink-0" style={{ borderRadius: 0 }} />
      ) : (
        <div className="w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground text-[10px] font-bold">{(author?.name ?? "U").charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground truncate">{author?.name ?? "Someone"}</span>
          {author?.isVerified && <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />}
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
        </div>
        <p className="text-xs text-foreground leading-snug line-clamp-2 break-words">{comment.text}</p>
      </div>
    </button>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────────────────

export default function PostCard({ post, author, likeCount, commentCount = 0, isLiked, onDelete, resharedPost, resharedAuthor, authorHasStory, showPinActions, onPinChange }: PostCardProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likeCount);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked, post.id]);

  useEffect(() => {
    setLikes(likeCount);
  }, [likeCount, post.id]);

  const toggleLike = trpc.likes.toggle.useMutation({
    onMutate: () => {
      setLiked((prev) => !prev);
      setLikes((prev) => (liked ? prev - 1 : prev + 1));
    },
    onError: () => {
      setLiked((prev) => !prev);
      setLikes((prev) => (liked ? prev + 1 : prev - 1));
    },
    onSuccess: () => utils.posts.feed.invalidate(),
  });

  const recordShare = trpc.shares.record.useMutation();
  const reshare = trpc.posts.reshare.useMutation({
    onSuccess: () => {
      toast.success("Post reshared to your feed!");
      setShowReshareModal(false);
      setReshareComment("");
      utils.posts.feed.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [showReshareModal, setShowReshareModal] = useState(false);
  const [reshareComment, setReshareComment] = useState("");

  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted.");
      onDelete?.();
      utils.posts.feed.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const pinPost = trpc.posts.pin.useMutation({
    onSuccess: () => {
      const nowPinned = !post.isPinned;
      toast.success(nowPinned ? "Post pinned to your profile!" : "Post unpinned.");
      onPinChange?.();
      utils.posts.feed.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: bookmarkData } = trpc.bookmarks.isBookmarked.useQuery(
    { postId: post.id },
    { enabled: !!user }
  );
  const [bookmarked, setBookmarked] = useState(false);

  const { data: shareCountsData } = trpc.shares.getCounts.useQuery({ postIds: [post.id] });
  const { data: reshareCountsData } = trpc.posts.getReshareCount.useQuery({ postIds: [post.id] });
  const { data: savedCountsData } = trpc.bookmarks.getCounts.useQuery({ postIds: [post.id] });
  const [savedCount, setSavedCount] = useState(0);
  useEffect(() => { if (bookmarkData !== undefined) setBookmarked(bookmarkData.bookmarked); }, [bookmarkData, post.id]);
  useEffect(() => { if (savedCountsData !== undefined) setSavedCount(savedCountsData[post.id] ?? 0); }, [savedCountsData, post.id]);
  const toggleBookmark = trpc.bookmarks.toggle.useMutation({
    onMutate: () => {
      setBookmarked((current) => {
        const next = !current;
        setSavedCount((count) => Math.max(0, count + (next ? 1 : -1)));
        return next;
      });
    },
    onError: () => {
      setBookmarked((current) => {
        const reverted = !current;
        setSavedCount((count) => Math.max(0, count + (reverted ? 1 : -1)));
        return reverted;
      });
    },
    onSuccess: (data) => {
      setBookmarked(data.bookmarked);
      utils.bookmarks.getBookmarkedIds.invalidate();
      utils.bookmarks.isBookmarked.invalidate({ postId: post.id });
      utils.bookmarks.getCounts.invalidate({ postIds: [post.id] });
      toast.success(data.bookmarked ? "Post saved!" : "Post removed from saved.");
    },
  });

  const [showReportDialog, setShowReportDialog] = useState(false);

  const shareCount = shareCountsData?.[post.id] ?? 0;
  const reshareCount = reshareCountsData?.[post.id] ?? 0;

  const formatActionCount = (count: number, singular: string, plural = `${singular}s`) => {
    if (count <= 0) return singular;
    return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
  };
  const [reportReason, setReportReason] = useState<"sexual_content" | "violence" | "harassment" | "spam" | "other" | "">("");
  const [reportDescription, setReportDescription] = useState("");
  const reportPost = trpc.posts.report.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. Thank you for helping keep FacingFace safe.");
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text ?? "");
  const editWordCount = countPostWords(editText);
  const editOverWordLimit = editWordCount > POST_WORD_LIMIT;
  const [editBgColor, setEditBgColor] = useState<string | null>(post.bgColor ?? null);
  const [editMediaUrl, setEditMediaUrl] = useState<string | null>(post.mediaUrl ?? null);
  const [editMediaType, setEditMediaType] = useState<string | null>(post.mediaType ?? null);
  const [editAudioUrl, setEditAudioUrl] = useState<string | null>(post.audioUrl ?? null);
  const [editDocUrl, setEditDocUrl] = useState<string | null>(post.docUrl ?? null);
  const [editDocName, setEditDocName] = useState<string | null>(post.docName ?? null);
  const [editHideHistory, setEditHideHistory] = useState<boolean>((post as { hideEditHistory?: boolean }).hideEditHistory ?? false);
  const EDIT_BG_COLORS: (string | null)[] = [
    null,
    "#E63329",
    "#1877F2",
    "#16a34a",
    "#7c3aed",
    "#ea580c",
    "#0891b2",
    "#111111",
    "#dc2626",
    "#e5e7eb",
    "#1d4ed8",
  ];
  const editPost = trpc.posts.edit.useMutation({
    onSuccess: () => {
      toast.success("Post updated.");
      setIsEditing(false);
      utils.posts.feed.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.text?.slice(0, 60) ?? "FacingFace post", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      }
      recordShare.mutate({ postId: post.id });
    } catch {
      // user cancelled share — no error needed
    }
  };

  const isOwner = user?.id === post.authorId;
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canManage = isOwner || isAdmin;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const hasLinkPreview = post.linkUrl && (post.linkTitle || post.linkImage);
  const postUrls = post.text?.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) ?? [];
  const isUrlOnlyPost = !!post.text && postUrls.length > 0 && post.text.replace(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, "").trim().length === 0;
  const compactOnlyUrl = postUrls[0] ?? post.linkUrl;
  const originalPostTextWithoutPreviewUrl = hasLinkPreview ? removePreviewUrlFromText(post.text ?? "", post.linkUrl) : (post.text ?? "");
  const resharedHasLinkPreview = !!resharedPost?.linkUrl && !!(resharedPost.linkTitle || resharedPost.linkImage);
  const resharedPostUrls = resharedPost?.text?.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) ?? [];
  const resharedIsUrlOnlyPost = !!resharedPost?.text && resharedPostUrls.length > 0 && resharedPost.text.replace(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, "").trim().length === 0;
  const resharedCompactOnlyUrl = resharedPostUrls[0] ?? resharedPost?.linkUrl;
  const resharedTextWithoutPreviewUrl = resharedHasLinkPreview ? removePreviewUrlFromText(resharedPost?.text ?? "", resharedPost?.linkUrl) : (resharedPost?.text ?? "");

  // Text truncation
  const [isExpanded, setIsExpanded] = useState(false);
  const STANDARD_VISIBLE_WORD_LIMIT = 20;
  const BACKGROUND_VISIBLE_WORD_LIMIT = STANDARD_VISIBLE_WORD_LIMIT * 2;
  const truncateText = (text: string, wordLimit: number) => {
    const words = text.split(/\s+/);
    if (words.length <= wordLimit) return { truncated: text, isLong: false };
    return { truncated: words.slice(0, wordLimit).join(" ") + "...", isLong: true };
  };

  // YouTube embed detection
  const extractYouTubeVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) return null;
      if (hostname.includes("youtu.be")) return urlObj.pathname.slice(1).split("?")[0] || null;
      if (urlObj.pathname.includes("/embed/")) return urlObj.pathname.split("/embed/")[1]?.split("?")[0] || null;
      if (urlObj.pathname.includes("/shorts/")) return urlObj.pathname.split("/shorts/")[1]?.split("?")[0] || null;
      return urlObj.searchParams.get("v");
    } catch { return null; }
  };
  // Extract YouTube video ID from text URLs
  const youtubeVideoId = (() => {
    if (!post.text) return null;
    const urlMatch = post.text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi);
    if (!urlMatch) return null;
    for (const url of urlMatch) {
      const id = extractYouTubeVideoId(url);
      if (id) return id;
    }
    return null;
  })();

  const photos = [post.mediaUrl, post.photo2Url, post.photo3Url].filter(Boolean) as string[];
  const captions = [post.photo1Caption ?? null, post.photo2Caption ?? null, post.photo3Caption ?? null];
  const altTexts = [post.photo1Alt ?? null, post.photo2Alt ?? null, post.photo3Alt ?? null];

  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
  // Caption / text translation
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatingText, setTranslatingText] = useState(false);
  const displayPostText = translatedText
    ? (hasLinkPreview ? removePreviewUrlFromText(translatedText, post.linkUrl) : translatedText)
    : originalPostTextWithoutPreviewUrl;
  const [translatedCaptions, setTranslatedCaptions] = useState<(string | null)[]>([null, null, null]);
  const [translatingCaptionIdx, setTranslatingCaptionIdx] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translateCaption = (trpc as any).media.translateCaption.useMutation();
  const userLang = typeof navigator !== "undefined" ? (navigator.language ?? "en").split("-")[0] : "en";

  return (
    <>
      {lightboxIndex !== null && (
        <PhotoLightbox photos={photos} captions={captions} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      {avatarLightboxOpen && author?.avatar && (
        <ImageLightbox src={author.avatar} alt={author.name ?? ""} onClose={() => setAvatarLightboxOpen(false)} />
      )}

      <article className="post-card bg-background py-5">
        {/* Author row */}
        <div className="flex items-start justify-between mb-4">
          <Link href={`/profile/${post.authorId}`} className="flex items-center gap-3 no-underline group">
            {/* Avatar with optional story ring — tap avatar to open lightbox */}
            <div
              className="relative flex-shrink-0"
              style={{ width: 40, height: 40 }}
              onClick={(e) => { if (author?.avatar) { e.preventDefault(); e.stopPropagation(); setAvatarLightboxOpen(true); } }}
            >
              {authorHasStory && (
                <div
                  className="absolute pointer-events-none story-ring-pulse"
                  style={{
                    inset: -2,
                    background: "linear-gradient(135deg, #f97316 0%, #e63329 40%, #9333ea 100%)",
                    borderRadius: 0,
                    zIndex: 0,
                  }}
                />
              )}
              {author?.avatar ? (
                <img
                  src={author.avatar}
                  alt={author.name ?? ""}
                  className="w-10 h-10 object-cover border-2 border-background relative cursor-zoom-in"
                  style={{ borderRadius: 0, zIndex: 1 }}
                />
              ) : (
                <div
                  className="w-10 h-10 bg-primary flex items-center justify-center relative"
                  style={{ zIndex: 1 }}
                >
                  <span className="text-primary-foreground text-sm font-bold">{(author?.name ?? "U").charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground group-hover:underline flex items-center gap-1">
                {author?.name ?? "Unknown User"}
                {author?.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </Link>
          {canManage && (
            <div className="flex items-center gap-1">
              {showPinActions && (
                <button
                  onClick={() => pinPost.mutate({ postId: post.id, pin: !post.isPinned })}
                  disabled={pinPost.isPending}
                  className={`p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--its-red)] ${post.isPinned ? "text-[var(--its-red)]" : "text-muted-foreground hover:text-[var(--its-red)]"}`}
                  title={post.isPinned ? "Unpin from profile" : "Pin to profile"}
                  aria-label={post.isPinned ? "Unpin from profile" : "Pin to profile"}
                >
                  <Pin size={14} />
                </button>
              )}
              <button onClick={() => { setEditText(post.text ?? ""); setEditBgColor(post.bgColor ?? null); setIsEditing(true); }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--its-red)]" title="Edit post" aria-label="Edit post">
                <Pencil size={14} />
              </button>
              <button onClick={() => { if (confirm("Delete this post?")) deletePost.mutate({ postId: post.id }); }}
                className="p-1.5 text-muted-foreground hover:text-[var(--its-red)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--its-red)]" title="Delete post" aria-label="Delete post">
                <Trash2 size={14} />
              </button>
            </div>
          )}
          {!isOwner && user && (
            <button
              onClick={() => setShowReportDialog(true)}
              className="p-1.5 text-muted-foreground hover:text-amber-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500"
              title="Report post"
              aria-label="Report post"
            >
              <Flag size={14} />
            </button>
          )}
        </div>

        {/* Pinned badge — visible to all visitors on profile page */}
        {post.isPinned && showPinActions && (
          <div className="flex items-center gap-1 mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--its-red)]">
            <Pin size={11} />
            <span>Pinned post</span>
          </div>
        )}

        {/* Post text */}
        {isEditing ? (
          <div className="mb-4 border border-border p-3" style={{ background: editBgColor ?? "var(--its-surface)" }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full bg-transparent text-sm p-2 resize-none outline-none"
              style={{ fontFamily: "inherit", color: editBgColor ? "#ffffff" : "var(--its-text-primary)", border: "1px solid rgba(128,128,128,0.4)" }}
              autoFocus
            />
            <div className={`mt-1 text-right text-[11px] font-semibold ${editOverWordLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {editWordCount}/{POST_WORD_LIMIT} words
            </div>
            {/* Media attachment controls */}
            {(editMediaUrl || editAudioUrl || editDocUrl) && (
              <div className="mt-2 space-y-1.5">
                {editMediaUrl && (
                  <div className="flex items-center gap-2 border border-border p-1.5 bg-secondary">
                    {editMediaType === "video" ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">Video attachment</span>
                    ) : (
                      <img src={editMediaUrl} alt="" className="w-10 h-10 object-cover border border-border flex-shrink-0" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1 truncate">
                      {editMediaType === "video" ? "Video" : "Photo"}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setEditMediaUrl(null); setEditMediaType(null); }}
                      className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:opacity-70 transition-opacity"
                      title="Remove attachment"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                )}
                {editAudioUrl && (
                  <div className="flex items-center gap-2 border border-border p-1.5 bg-secondary">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">Audio attachment</span>
                    <button
                      type="button"
                      onClick={() => setEditAudioUrl(null)}
                      className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:opacity-70 transition-opacity"
                      title="Remove audio"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                )}
                {editDocUrl && (
                  <div className="flex items-center gap-2 border border-border p-1.5 bg-secondary">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1 truncate">{editDocName ?? "Document"}</span>
                    <button
                      type="button"
                      onClick={() => { setEditDocUrl(null); setEditDocName(null); }}
                      className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:opacity-70 transition-opacity"
                      title="Remove document"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Hide edit history toggle */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setEditHideHistory((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors"
                style={{ color: editHideHistory ? "var(--its-red)" : "var(--its-text-muted)" }}
                title={editHideHistory ? "Edit history is hidden from others" : "Edit history is visible to everyone"}
              >
                <span
                  className="inline-flex items-center justify-center border transition-colors"
                  style={{
                    width: 28, height: 16, borderRadius: 8,
                    background: editHideHistory ? "var(--its-red)" : "transparent",
                    borderColor: editHideHistory ? "var(--its-red)" : "rgba(128,128,128,0.5)",
                  }}
                >
                  <span
                    className="inline-block transition-transform"
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: editHideHistory ? "#fff" : "rgba(128,128,128,0.6)",
                      transform: editHideHistory ? "translateX(5px)" : "translateX(-5px)",
                    }}
                  />
                </span>
                Hide edit history
              </button>
            </div>
            {/* Bg color picker */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: editBgColor ? "rgba(255,255,255,0.7)" : "var(--its-text-muted)" }}>Bg:</span>
              {EDIT_BG_COLORS.map((c) => (
                <button
                  key={c ?? "none"}
                  onClick={() => setEditBgColor(c)}
                  className="rounded-full border-2 transition-all"
                  style={{
                    width: 20, height: 20,
                    background: c ?? "transparent",
                    borderColor: editBgColor === c ? (c ? "#fff" : "var(--its-text-primary)") : "rgba(128,128,128,0.4)",
                    boxShadow: editBgColor === c ? "0 0 0 2px var(--its-red)" : "none",
                  }}
                  title={c ?? "No background"}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  if (editOverWordLimit) return;
                  editPost.mutate({
                  postId: post.id,
                  text: editText.trim(),
                  bgColor: editBgColor,
                  mediaUrl: editMediaUrl,
                  mediaType: editMediaType,
                  audioUrl: editAudioUrl,
                  docUrl: editDocUrl,
                  docName: editDocName,
                  hideEditHistory: editHideHistory,
                });
                }}
                disabled={editPost.isPending || !editText.trim() || editOverWordLimit}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold tracking-widest uppercase border"
                style={{ background: "var(--its-text-primary)", color: "var(--its-surface)", borderColor: "var(--its-text-primary)", opacity: editPost.isPending || !editText.trim() || editOverWordLimit ? 0.4 : 1 }}
              >
                <Check size={12} /> Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs font-bold tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : displayPostText && !isUrlOnlyPost ? (
          <>
            {post.bgColor ? (
              <>
                <div
                  className="relative mb-2 flex flex-col items-center justify-center overflow-hidden border border-border/60 px-8 py-12 sm:px-12"
                  style={{
                    background: buildArtisticTextBackground(post.bgColor),
                    minHeight: "170px",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-x-6 top-5 h-px opacity-50"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)" }}
                  />
                  <p className="relative z-10 w-full text-center font-black leading-snug whitespace-pre-wrap break-words"
                    style={{ color: getTextBackgroundTextColor(post.bgColor), fontSize: displayPostText.length <= 30 ? "2rem" : displayPostText.length <= 80 ? "1.35rem" : "1.05rem", lineHeight: displayPostText.length <= 30 ? "1.18" : "1.38", textShadow: getTextBackgroundTextColor(post.bgColor) === "#ffffff" ? "0 2px 8px rgba(0,0,0,0.45)" : "0 1px 2px rgba(255,255,255,0.55)" }}>
                    <TextWithLinks text={isExpanded ? displayPostText : truncateText(displayPostText, BACKGROUND_VISIBLE_WORD_LIMIT).truncated} />
                  </p>
                </div>
                {truncateText(displayPostText, BACKGROUND_VISIBLE_WORD_LIMIT).isLong && (
                  <button onClick={() => setIsExpanded(!isExpanded)} className="mb-4 mx-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--its-red)] hover:opacity-80 transition-opacity">
                    {isExpanded ? <>See Less <ChevronUp size={12} /></> : <>See More <ChevronDown size={12} /></>}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="mb-1">
                  <p className="leading-relaxed whitespace-pre-wrap text-foreground"
                    style={{ fontSize: displayPostText.length <= 30 ? "1.5rem" : displayPostText.length <= 80 ? "1.1rem" : "0.875rem", fontWeight: displayPostText.length <= 80 ? "700" : "400", lineHeight: displayPostText.length <= 30 ? "1.2" : "1.5" }}>
                    <TextWithLinks text={isExpanded ? displayPostText : truncateText(displayPostText, STANDARD_VISIBLE_WORD_LIMIT).truncated} />
                  </p>
                  {truncateText(displayPostText, STANDARD_VISIBLE_WORD_LIMIT).isLong && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--its-red)] hover:opacity-80 transition-opacity">
                      {isExpanded ? <>See Less <ChevronUp size={12} /></> : <>See More <ChevronDown size={12} /></>}
                    </button>
                  )}
                </div>
                {translatedText ? (
                  <button
                    type="button"
                    onClick={() => setTranslatedText(null)}
                    className="mb-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    aria-label="Show original text"
                  >
                    <Languages size={10} /> Show original
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={translatingText}
                    onClick={async () => {
                      if (!post.text) return;
                      setTranslatingText(true);
                      try {
                        const { translated } = await translateCaption.mutateAsync({ text: post.text, targetLang: userLang });
                        setTranslatedText(translated);
                      } catch { toast.error("Translation failed."); }
                      finally { setTranslatingText(false); }
                    }}
                    className="mb-3 text-[10px] text-muted-foreground hover:text-[var(--its-red)] transition-colors flex items-center gap-1 disabled:opacity-50"
                    aria-label="Translate post text"
                  >
                    <Languages size={10} /> {translatingText ? "Translating…" : "Translate"}
                  </button>
                )}
              </>
            )}
            {post.editedAt && (
              <EditHistoryLabel postId={post.id} editedAt={post.editedAt} currentText={post.text ?? null} />
            )}
          </>
        ) : null}

        {/* Embedded Reshared Post */}
        {post.resharedFromId && resharedPost && (
          <div className="mb-4 border border-border bg-secondary overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
              <Repeat2 size={11} className="text-green-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Original Post</span>
            </div>
            <div className="px-3 pb-3">
              {/* Original author */}
              <div className="flex items-center gap-2 mb-2">
                {resharedAuthor?.avatar ? (
                  <img src={resharedAuthor.avatar} alt={resharedAuthor.name ?? ""} className="w-6 h-6 object-cover border border-border" style={{ borderRadius: 0 }} />
                ) : (
                  <div className="w-6 h-6 bg-primary flex items-center justify-center"><span className="text-primary-foreground text-[10px] font-bold">{(resharedAuthor?.name ?? "U").charAt(0).toUpperCase()}</span></div>
                )}
                <Link href={`/profile/${resharedPost.authorId}`} className="text-xs font-bold text-foreground no-underline hover:underline flex items-center gap-1">
                  {resharedAuthor?.name ?? "Unknown"}
                  {resharedAuthor?.isVerified && <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                </Link>
                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(resharedPost.createdAt), { addSuffix: true })}</span>
              </div>
              {/* Original text: hide URL-only text when a proper link preview exists. */}
              {resharedTextWithoutPreviewUrl && !(resharedIsUrlOnlyPost && resharedHasLinkPreview) && (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words line-clamp-4">{resharedTextWithoutPreviewUrl}</p>
              )}

              {/* Original link preview/card */}
              {resharedHasLinkPreview && (
                <a
                  href={resharedPost.linkUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block border border-border overflow-hidden bg-background hover:border-black transition-colors no-underline group"
                  onClick={(e) => e.stopPropagation()}
                >
                  {resharedPost.linkImage && (
                    <div className="w-full bg-secondary overflow-hidden" style={{ maxHeight: "180px" }}>
                      <img
                        src={resharedPost.linkImage}
                        alt={resharedPost.linkTitle ?? ""}
                        className="w-full object-cover group-hover:opacity-95 transition-opacity"
                        style={{ maxHeight: "180px" }}
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div className="p-2 bg-background">
                    {resharedPost.linkSiteName && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="its-accent" style={{ width: "7px", height: "7px" }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--its-red)]">{resharedPost.linkSiteName}</span>
                      </div>
                    )}
                    {resharedPost.linkTitle && <p className="text-xs font-bold text-foreground leading-snug mb-1 group-hover:underline line-clamp-2">{resharedPost.linkTitle}</p>}
                    {resharedPost.linkDescription && <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{resharedPost.linkDescription}</p>}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Link2 size={10} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate">{resharedPost.linkUrl}</span>
                    </div>
                  </div>
                </a>
              )}

              {/* Compact original URL fallback */}
              {resharedIsUrlOnlyPost && resharedCompactOnlyUrl && !resharedHasLinkPreview && (
                <a
                  href={resharedCompactOnlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--its-red)] transition-colors no-underline break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link2 size={11} className="flex-shrink-0" />
                  <span>{resharedCompactOnlyUrl}</span>
                </a>
              )}

              {/* Original image thumbnail */}
              {resharedPost.mediaUrl && resharedPost.mediaType === "image" && (
                <img src={resharedPost.mediaUrl} alt="" className="mt-2 w-full max-h-48 object-cover border border-border" style={{ borderRadius: 0 }} />
              )}
              {/* Original video */}
              {resharedPost.mediaUrl && resharedPost.mediaType === "video" && (
                <video src={resharedPost.mediaUrl} controls className="mt-2 w-full max-h-48 border border-border" style={{ borderRadius: 0, background: "#000" }} />
              )}
              {/* Original audio */}
              {resharedPost.audioUrl && (
                <div className="mt-2 flex items-center gap-2 p-2 border border-border bg-background">
                  <span className="text-xs text-muted-foreground truncate">{resharedPost.audioName ?? "Audio"}</span>
                  <audio src={resharedPost.audioUrl} controls className="flex-1" style={{ height: "28px" }} />
                </div>
              )}
              {/* Original doc */}
              {resharedPost.docUrl && (
                <a href={resharedPost.docUrl} target="_blank" rel="noopener noreferrer" download={resharedPost.docName ?? true}
                  className="mt-2 flex items-center gap-2 p-2 border border-border bg-background hover:border-black transition-colors no-underline">
                  <FileText size={14} className="text-[var(--its-red)] flex-shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate">{resharedPost.docName ?? "Document"}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* YouTube Embed */}
        {youtubeVideoId && (
          <div className="mb-4 border border-border overflow-hidden bg-black" style={{ aspectRatio: "16/9" }} onClick={(e) => e.stopPropagation()}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: "none", display: "block" }}
            />
          </div>
        )}

        {/* Link Preview */}
        {hasLinkPreview && (
          <a href={post.linkUrl!} target="_blank" rel="noopener noreferrer"
            className="block mb-4 border border-border overflow-hidden hover:border-black transition-colors no-underline group" onClick={(e) => e.stopPropagation()}>
            {post.linkImage && (
              <div className="w-full bg-secondary overflow-hidden" style={{ maxHeight: "240px" }}>
                <img src={post.linkImage} alt={post.linkTitle ?? ""} className="w-full object-cover group-hover:opacity-95 transition-opacity" style={{ maxHeight: "240px" }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
              </div>
            )}
            <div className="p-3 bg-background">
              {post.linkSiteName && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="its-accent" style={{ width: "8px", height: "8px" }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)]">{post.linkSiteName}</span>
                </div>
              )}
              {post.linkTitle && <p className="text-sm font-bold text-foreground leading-snug mb-1 group-hover:underline">{post.linkTitle}</p>}
              {post.linkDescription && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.linkDescription}</p>}
              <div className="flex items-center gap-1 mt-2">
                <Link2 size={10} className="text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate">{post.linkUrl}</span>
              </div>
            </div>
          </a>
        )}

        {/* Compact URL-only fallback — keeps shared links subtle instead of oversized. */}
        {isUrlOnlyPost && compactOnlyUrl && !hasLinkPreview && (
          <a
            href={compactOnlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--its-red)] transition-colors no-underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 size={11} className="flex-shrink-0" />
            <span>{compactOnlyUrl}</span>
          </a>
        )}

        {/* Photo grid */}
        {post.mediaUrl && post.mediaType === "image" && photos.length > 0 && (
          <div className="mb-4">
            {/* 3-photo layout: 1st full-width, 2nd & 3rd half-size below */}
            {photos.length === 3 ? (
              <div className="border border-border overflow-hidden relative">
                {/* First photo — full width */}
                <PostImageCell src={photos[0]} alt={altTexts[0] ?? captions[0] ?? "Photo 1"} tooltip={altTexts[0] ?? undefined}
                  single={false} onClick={() => setLightboxIndex(0)} />
                {/* Second and third photos — half width each */}
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <PostImageCell src={photos[1]} alt={altTexts[1] ?? captions[1] ?? "Photo 2"} tooltip={altTexts[1] ?? undefined}
                    single={false} onClick={() => setLightboxIndex(1)} />
                  <PostImageCell src={photos[2]} alt={altTexts[2] ?? captions[2] ?? "Photo 3"} tooltip={altTexts[2] ?? undefined}
                    single={false} onClick={() => setLightboxIndex(2)} />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full pointer-events-none select-none">
                  1/3
                </div>
              </div>
            ) : (
            <div className={`grid gap-1 border border-border overflow-hidden relative ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {photos.map((src, idx) => (
                <PostImageCell key={idx} src={src} alt={altTexts[idx] ?? captions[idx] ?? `Photo ${idx + 1}`} tooltip={altTexts[idx] ?? undefined}
                  single={photos.length === 1}
                  onClick={() => setLightboxIndex(idx)} />
              ))}
              {photos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full pointer-events-none select-none">
                  1/{photos.length}
                </div>
              )}
            </div>
            )}
            {captions.slice(0, photos.length).some(Boolean) && (
              <div className={`mt-1 grid gap-1 ${photos.length === 1 ? "grid-cols-1" : photos.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {captions.slice(0, photos.length).map((cap, idx) =>
                  cap ? (
                    <div key={idx} className="flex flex-col items-center gap-0.5">
                      <p className="text-xs text-muted-foreground text-center leading-snug px-1 py-0.5 truncate w-full" title={cap}>
                        {translatedCaptions[idx] ?? cap}
                      </p>
                      {translatedCaptions[idx] ? (
                        <button
                          type="button"
                          onClick={() => setTranslatedCaptions(prev => { const n = [...prev]; n[idx] = null; return n; })}
                          className="text-[9px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                          aria-label="Show original caption"
                        >
                          <Languages size={9} /> Original
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={translatingCaptionIdx === idx}
                          onClick={async () => {
                            setTranslatingCaptionIdx(idx);
                            try {
                              const { translated } = await translateCaption.mutateAsync({ text: cap, targetLang: userLang });
                              setTranslatedCaptions(prev => { const n = [...prev]; n[idx] = translated; return n; });
                            } catch { toast.error("Translation failed."); }
                            finally { setTranslatingCaptionIdx(null); }
                          }}
                          className="text-[9px] text-muted-foreground hover:text-[var(--its-red)] transition-colors flex items-center gap-0.5 disabled:opacity-50"
                          aria-label="Translate caption"
                        >
                          <Languages size={9} /> Translate
                        </button>
                      )}
                    </div>
                  ) : <span key={idx} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {post.mediaUrl && post.mediaType === "video" && (
          <VideoPlayer src={post.mediaUrl} poster={post.videoPosterUrl} />
        )}

        {/* Audio */}
        {post.audioUrl && (
          <div className="mb-4 border border-border p-3 bg-secondary">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-[var(--its-red)] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-foreground truncate flex-1">{post.audioName ?? "Audio"}</span>
            </div>
            <audio src={post.audioUrl} controls className="w-full" style={{ height: "36px" }} onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Document */}
        {post.docUrl && (
          <a href={post.docUrl} target="_blank" rel="noopener noreferrer" download={post.docName ?? true}
            className="flex items-center gap-3 mb-4 border border-border p-3 bg-secondary hover:border-black transition-colors no-underline group" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-10 bg-[var(--its-red)] flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate group-hover:underline">{post.docName ?? "Document"}</p>
              {post.docSize && <p className="text-xs text-muted-foreground mt-0.5">{post.docType?.split("/").pop()?.toUpperCase() ?? "FILE"} &mdash; {(post.docSize / 1024).toFixed(0)} KB</p>}
            </div>
            <Download size={14} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </a>
        )}

        {/* Poll */}
        <PollCard postId={post.id} />

        {/* ── Action Bar: Icons Only (No Text) ── */}
        <div className="flex items-center gap-0 border-t border-border/40 pt-1 mt-0.5">
          {/* React (Facebook-style with Like, Love, Haha, Wow, Sad, Angry, Seen) */}
          <div className="flex-1 flex items-center justify-center border-r border-border/30">
            <PostReactionSummary postId={post.id} />
            <PostReactButton postId={post.id} initialCount={likes} />
          </div>

          {/* Comment - Icon with Count */}
          <button
            onClick={() => setShowComments((v) => !v)}
            className={`flex items-center justify-center gap-1 flex-1 py-1.5 text-[10px] sm:text-xs font-normal transition-colors border-r border-border/30 ${showComments ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label={showComments ? "Hide comments" : "Show comments"}
            aria-expanded={showComments}
            title="Comments"
          >
            <MessageCircle size={18} />
            {commentCount > 0 && <span className="text-[10px] sm:text-xs font-semibold">{commentCount}</span>}
          </button>

          {/* Reshare - Icon with Count */}
          {!post.resharedFromId && (
            <button
              onClick={() => setShowReshareModal(true)}
              className="flex items-center justify-center gap-1 flex-1 py-1.5 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-green-600 transition-colors border-r border-border/30"
              aria-label="Reshare this post"
              title="Reshare"
            >
              <Repeat2 size={18} />
              {reshareCount > 0 && <span className="text-[10px] sm:text-xs font-semibold">{reshareCount}</span>}
            </button>
          )}

          {/* Copy Link / Share - Icon with Count */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1 flex-1 py-1.5 text-[10px] sm:text-xs font-normal text-muted-foreground hover:text-foreground transition-colors border-r border-border/30"
            aria-label="Share or copy link"
            title="Share"
          >
            <Share2 size={18} />
            {shareCount > 0 && <span className="text-[10px] sm:text-xs font-semibold">{shareCount}</span>}
          </button>

          {/* Bookmark / Save - Icon with Indicator */}
          {user && (
            <button
              onClick={() => toggleBookmark.mutate({ postId: post.id })}
              disabled={toggleBookmark.isPending}
              className={`flex items-center justify-center gap-1 flex-1 py-1.5 text-[10px] sm:text-xs font-normal transition-colors ${
                bookmarked ? "text-[var(--its-red)]" : "text-muted-foreground hover:text-[var(--its-red)]"
              }`}
              title={bookmarked ? "Remove from saved" : "Save post"}
              aria-label={bookmarked ? "Remove from saved" : "Save post"}
              aria-pressed={bookmarked}
            >
              <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
              {bookmarked && <span className="text-[10px] sm:text-xs font-semibold">✓</span>}
            </button>
          )}
        </div>

        {!showComments && commentCount > 0 && (
          <LatestCommentPreview
            postId={post.id}
            commentCount={commentCount}
            onOpenComments={() => setShowComments(true)}
          />
        )}

        {/* Reshare Modal */}
        {showReshareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowReshareModal(false)}>
            <div className="bg-background border border-border w-full max-w-md mx-4 p-5" style={{ borderRadius: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest">Reshare to Your Feed</h3>
                <button onClick={() => setShowReshareModal(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
              </div>

              {/* Preview of original post */}
              <div className="border border-border p-3 mb-4 bg-secondary">
                <div className="flex items-center gap-2 mb-2">
                  {author?.avatar ? (
                    <img src={author.avatar} alt={author.name ?? ""} className="w-6 h-6 object-cover border border-border" style={{ borderRadius: 0 }} />
                  ) : (
                    <div className="w-6 h-6 bg-primary flex items-center justify-center"><span className="text-primary-foreground text-xs font-bold">{(author?.name ?? "U").charAt(0).toUpperCase()}</span></div>
                  )}
                  <span className="text-xs font-bold text-foreground">{author?.name ?? "Unknown"}</span>
                </div>
                {post.text && <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{post.text}</p>}
                {post.mediaUrl && post.mediaType === "image" && (
                  <img src={post.mediaUrl} alt="" className="mt-2 w-full max-h-32 object-cover border border-border" style={{ borderRadius: 0 }} />
                )}
              </div>

              {/* Optional comment */}
              <textarea
                value={reshareComment}
                onChange={(e) => setReshareComment(e.target.value)}
                placeholder="Add a comment (optional)…"
                maxLength={500}
                rows={3}
                className="w-full border border-border p-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground resize-none mb-4"
                style={{ borderRadius: 0 }}
              />

              <button
                onClick={() => reshare.mutate({ originalPostId: post.id, comment: reshareComment.trim() || undefined })}
                disabled={reshare.isPending}
                className="w-full py-2.5 bg-green-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {reshare.isPending ? "Resharing…" : "Reshare Now"}
              </button>
            </div>
          </div>
        )}

        {/* Comments */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-border">
            <CommentSection postId={post.id} />
          </div>
        )}
      </article>

      {/* Report Post Dialog */}
      <Dialog open={showReportDialog} onOpenChange={(open) => { setShowReportDialog(open); if (!open) { setReportReason(""); setReportDescription(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Flag size={14} className="text-amber-500" />
              Report Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Reason *</label>
              <Select value={reportReason} onValueChange={(v) => setReportReason(v as typeof reportReason)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sexual_content">Sexual Content</SelectItem>
                  <SelectItem value="violence">Violence</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Additional details (optional)</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the issue…"
                rows={3}
                maxLength={500}
                className="w-full text-sm bg-background border border-border rounded p-2 resize-none outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-xs text-muted-foreground text-right mt-0.5">{reportDescription.length}/500</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => { setShowReportDialog(false); setReportReason(""); setReportDescription(""); }}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!reportReason) { toast.error("Please select a reason."); return; }
                reportPost.mutate({ postId: post.id, reason: reportReason, description: reportDescription || undefined });
              }}
              disabled={!reportReason || reportPost.isPending}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {reportPost.isPending ? "Submitting…" : "Submit Report"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
