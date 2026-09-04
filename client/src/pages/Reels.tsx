import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play,
  Plus, ChevronUp, ChevronDown, ArrowLeft, Trash2, Upload, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────
type Reel = {
  id: number;
  authorId: number;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  authorName: string | null;
  authorAvatar: string | null;
  isVerified: boolean;
  isLiked: boolean;
};

type Filter = "forYou" | "following";

// ─── Thumbnail capture helper ─────────────────────────────────────────────────
function captureVideoFrame(videoEl: HTMLVideoElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 480;
    canvas.height = videoEl.videoHeight || 854;
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas not supported")); return; }
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    resolve(dataUrl.split(",")[1]); // return base64 only
  });
}

// ─── Comment Panel ────────────────────────────────────────────────────────────
function CommentsPanel({ reel, onClose, onCommentAdded }: { reel: Reel; onClose: () => void; onCommentAdded?: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const utils = trpc.useUtils();

  const { data: comments = [] } = trpc.reels.getComments.useQuery({ reelId: reel.id });
  const addComment = trpc.reels.addComment.useMutation({
    onSuccess: () => {
      setText("");
      onCommentAdded?.();
      utils.reels.getComments.invalidate({ reelId: reel.id });
      utils.reels.feed.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col h-full bg-black/90 backdrop-blur-md rounded-t-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white font-semibold">Comments ({reel.commentCount})</span>
        <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {comments.length === 0 && (
          <p className="text-white/40 text-sm text-center py-8">No comments yet. Be first!</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={c.authorAvatar ?? undefined} />
              <AvatarFallback className="text-xs">{(c.authorName ?? "?")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-white text-xs font-semibold mr-2">{c.authorName ?? "User"}</span>
              <span className="text-white/80 text-sm">{c.content}</span>
            </div>
          </div>
        ))}
      </div>
      {user && (
        <div className="px-4 py-3 border-t border-white/10 flex gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment…"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none text-sm min-h-[40px] max-h-[100px]"
            rows={1}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) addComment.mutate({ reelId: reel.id, content: text.trim() });
              }
            }}
          />
          <Button
            size="sm"
            disabled={!text.trim() || addComment.isPending}
            onClick={() => { if (text.trim()) addComment.mutate({ reelId: reel.id, content: text.trim() }); }}
            className="bg-[#1877f2] hover:bg-[#166fe5] text-white shrink-0"
          >
            Post
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────
function UploadReelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = trpc.reels.upload.useMutation({
    onSuccess: () => {
      toast.success("Reel uploaded!");
      setCaption(""); setVideoFile(null); setVideoPreview(null); setThumbnailPreview(null);
      utils.reels.feed.invalidate();
      onClose();
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith("video/")) { toast.error("Please select a video file"); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error("Video must be under 100 MB"); return; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setThumbnailPreview(null);
  };

  // Auto-capture thumbnail when video metadata loads
  const handleVideoLoaded = async () => {
    const v = videoRef.current;
    if (!v || thumbnailPreview) return;
    // Seek to 0.5s or 10% into the video for a better frame
    v.currentTime = Math.min(0.5, (v.duration || 1) * 0.1);
  };

  const handleVideoSeeked = async () => {
    const v = videoRef.current;
    if (!v || thumbnailPreview) return;
    try {
      const b64 = await captureVideoFrame(v);
      setThumbnailPreview(`data:image/jpeg;base64,${b64}`);
    } catch {
      // silently ignore — thumbnail is optional
    }
  };

  const handleSubmit = async () => {
    if (!videoFile) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const duration = videoRef.current?.duration ?? 0;
      // Get thumbnail base64 from current preview
      let thumbnailBase64: string | undefined;
      if (thumbnailPreview) {
        thumbnailBase64 = thumbnailPreview.split(",")[1];
      } else if (videoRef.current) {
        try { thumbnailBase64 = await captureVideoFrame(videoRef.current); } catch { /* ignore */ }
      }
      upload.mutate({ videoBase64: base64, thumbnailBase64, caption: caption || undefined, duration });
    };
    reader.readAsDataURL(videoFile);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#18191a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Upload a Reel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!videoPreview ? (
            <div
              className="border-2 border-dashed border-white/20 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-[#1877f2] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-white/40 mb-2" />
              <p className="text-white/60 text-sm">Click to select a video</p>
              <p className="text-white/30 text-xs mt-1">MP4, MOV, WebM · max 100 MB · up to 5 min</p>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-64 mx-auto">
                <video
                  ref={videoRef}
                  src={videoPreview}
                  className="w-full h-full object-contain"
                  controls
                  muted
                  onLoadedMetadata={handleVideoLoaded}
                  onSeeked={handleVideoSeeked}
                />
                <button
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                  onClick={() => { setVideoFile(null); setVideoPreview(null); setThumbnailPreview(null); }}
                >✕</button>
              </div>
              {/* Thumbnail preview */}
              {thumbnailPreview && (
                <div className="flex items-center gap-2 px-1">
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-12 h-12 rounded object-cover border border-white/20" />
                  <div>
                    <p className="text-white/70 text-xs font-medium">Thumbnail captured</p>
                    <button
                      className="text-white/40 text-xs hover:text-white/70 underline"
                      onClick={() => setThumbnailPreview(null)}
                    >Remove</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <Input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Add a caption…"
            maxLength={500}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
          <Button
            className="w-full bg-[#1877f2] hover:bg-[#166fe5] text-white"
            disabled={!videoFile || uploading}
            onClick={handleSubmit}
          >
            {uploading ? "Uploading…" : "Share Reel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Video Progress Bar ───────────────────────────────────────────────────────
function VideoProgressBar({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration || 0);
    v.addEventListener("loadedmetadata", onLoaded);
    if (v.duration) setDuration(v.duration);
    const tick = () => {
      if (v.duration > 0) setProgress(v.currentTime / v.duration);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setProgress(ratio);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 pb-1 z-10">
      <div className="flex justify-between mb-1 select-none pointer-events-none">
        <span className="text-white/70 text-[10px] font-mono drop-shadow">{formatTime(progress * duration)}</span>
        <span className="text-white/50 text-[10px] font-mono drop-shadow">{formatTime(duration)}</span>
      </div>
      <div
        className="relative h-1 w-full rounded-full cursor-pointer"
        style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
        onClick={handleSeek}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-none"
          style={{ width: `${progress * 100}%`, backgroundColor: "#fff" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md"
          style={{ left: `calc(${progress * 100}% - 6px)` }}
        />
      </div>
    </div>
  );
}

// ─── Single Reel Card ─────────────────────────────────────────────────────────
function ReelCard({
  reel, isActive, onNext, onPrev, hasPrev, hasNext, globalMuted, onToggleMute,
}: {
  reel: Reel; isActive: boolean;
  onNext: () => void; onPrev: () => void;
  hasPrev: boolean; hasNext: boolean;
  globalMuted: boolean; onToggleMute: () => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const muted = globalMuted;
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(reel.isLiked);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [viewCount, setViewCount] = useState(reel.viewCount);
  const [commentCount, setCommentCount] = useState(reel.commentCount);
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef<number>(0);

  const likeMutation = trpc.reels.like.useMutation({
    onMutate: () => {
      setLiked((previous) => !previous);
      setLikeCount((previous) => liked ? Math.max(0, previous - 1) : previous + 1);
    },
    onError: () => { setLiked(reel.isLiked); setLikeCount(reel.likeCount); },
    onSuccess: (data) => {
      setLiked(data.liked); setLikeCount(data.likeCount);
      // Invalidate both feed and getById to ensure consistency
      utils.reels.feed.invalidate();
      utils.reels.getById.invalidate({ reelId: reel.id });
    },
  });

  // A refetched feed may preserve this component instance. Keep its local
  // presentation state aligned with the durable result returned by the server.
  useEffect(() => {
    setLiked(reel.isLiked);
    setLikeCount(reel.likeCount);
  }, [reel.id, reel.isLiked, reel.likeCount]);

  const viewMutation = trpc.reels.view.useMutation({
    onSuccess: () => setViewCount(v => v + 1),
  });

  const deleteMutation = trpc.reels.delete.useMutation({
    onSuccess: () => { toast.success("Reel deleted"); utils.reels.feed.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Sync muted state directly to the DOM element — React's muted prop is unreliable
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Always start muted for autoplay policy, then apply globalMuted
    v.muted = true;
    if (isActive) {
      v.play().then(() => {
        setPlaying(true);
        // After play succeeds, apply the actual muted preference
        v.muted = muted;
      }).catch(() => setPlaying(false));
      viewMutation.mutate({ reelId: reel.id });
    } else {
      v.pause(); v.currentTime = 0; setPlaying(false);
    }
  }, [isActive]);  // eslint-disable-line

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const handleLike = () => {
    if (!user) { toast.error("Please sign in to like reels"); return; }
    if (likeMutation.isPending) return;
    likeMutation.mutate({ reelId: reel.id });
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      // Double-tap detected
      if (user && !liked && !likeMutation.isPending) {
        setHeartBurst(true);
        setTimeout(() => setHeartBurst(false), 900);
        likeMutation.mutate({ reelId: reel.id });
      } else if (!user) {
        toast.error("Please sign in to like reels");
      }
    }
    lastTapRef.current = now;
  }, [user, liked, reel.id, likeMutation, likeMutation.isPending]);

  const handleShare = async () => {
    const url = `${window.location.origin}/reels/${reel.id}`;
    if (navigator.share) {
      await navigator.share({ title: reel.caption ?? "Check this reel!", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl ?? undefined}
        className="h-full w-full object-contain"
        loop playsInline
        onClick={() => { handleDoubleTap(); togglePlay(); }}
      />
      {/* Double-tap heart burst */}
      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-28 h-28 text-red-500 fill-red-500 animate-ping" style={{ opacity: 0.9 }} />
        </div>
      )}

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-5">
            <Play className="w-10 h-10 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute toggle */}
      <button
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Bottom info */}
      <div className="absolute bottom-8 left-0 right-16 px-4 pb-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <a href={`/profile/${reel.authorId}`} className="flex items-center gap-2 mb-1.5 pointer-events-auto no-underline">
          <Avatar className="w-9 h-9 border-2 border-white">
            <AvatarImage src={reel.authorAvatar ?? undefined} />
            <AvatarFallback className="text-xs bg-[#1877f2] text-white">{(reel.authorName ?? "?")[0]}</AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm drop-shadow">{reel.authorName ?? "User"}</span>
          {reel.isVerified && <span className="text-[#1877f2] text-xs">✓</span>}
        </a>
        {reel.caption && (
          <p className="text-white/90 text-sm leading-snug line-clamp-2 drop-shadow mb-1">{reel.caption}</p>
        )}
        <div className="flex items-center gap-1 pointer-events-none">
          <Eye className="w-3.5 h-3.5 text-white/60" />
          <span className="text-white/60 text-xs font-medium drop-shadow">{formatCount(viewCount)} views</span>
        </div>
      </div>

      <VideoProgressBar videoRef={videoRef} />

      {/* Right action bar */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
        <button onClick={handleLike} disabled={likeMutation.isPending} aria-label={liked ? "Remove Like" : "Like this Reel"} className="flex flex-col items-center gap-1 disabled:opacity-60">
          <div className={`w-11 h-11 rounded-full bg-black/40 flex items-center justify-center transition-transform active:scale-90 ${liked ? "text-red-500" : "text-white"}`}>
            <Heart className={`w-6 h-6 ${liked ? "fill-red-500" : ""}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(likeCount)}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center text-white">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(commentCount)}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center text-white">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">Share</span>
        </button>

        {user?.id === reel.authorId && (
          <button
            onClick={() => { if (confirm("Delete this reel?")) deleteMutation.mutate({ reelId: reel.id }); }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
          </button>
        )}

        {hasPrev && (
          <button onClick={onPrev} className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center text-white">
            <ChevronUp className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button onClick={onNext} className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center text-white">
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </div>

      {showComments && (
        <div className="absolute inset-x-0 bottom-0 h-[60%] z-20">
          <CommentsPanel
            reel={{ ...reel, commentCount }}
            onClose={() => setShowComments(false)}
            onCommentAdded={() => setCommentCount(c => c + 1)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Reel Share Card (standalone view for /reels/:id) ─────────────────────────
export function ReelShareCard({ reelId }: { reelId: number }) {
  const [, navigate] = useLocation();
  const { data: reel, isLoading } = trpc.reels.getById.useQuery({ reelId });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!reel) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 text-white/60">
        <p className="text-lg">Reel not found</p>
        <Button onClick={() => navigate("/reels")} className="bg-[#1877f2] hover:bg-[#166fe5] text-white">
          Browse Reels
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3 pb-10 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          className="pointer-events-auto w-11 h-11 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 active:scale-95 transition-all shadow-lg"
          onClick={() => navigate("/reels")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-bold text-base tracking-wide drop-shadow select-none">Reel</span>
        <div className="w-11 h-11" />
      </div>

      {/* Share card preview */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {reel.thumbnailUrl ? (
          <img
            src={reel.thumbnailUrl}
            alt="Reel thumbnail"
            className="w-full max-w-xs aspect-[9/16] object-cover rounded-2xl shadow-2xl"
          />
        ) : (
          <div className="w-full max-w-xs aspect-[9/16] bg-white/10 rounded-2xl flex items-center justify-center">
            <Play className="w-16 h-16 text-white/30" />
          </div>
        )}

        {/* Meta */}
        <div className="w-full max-w-xs space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white/30">
              <AvatarImage src={reel.authorAvatar ?? undefined} />
              <AvatarFallback className="bg-[#1877f2] text-white text-sm">{(reel.authorName ?? "?")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm">{reel.authorName ?? "User"}</p>
              {reel.isVerified && <span className="text-[#1877f2] text-xs">Verified</span>}
            </div>
          </div>

          {reel.caption && (
            <p className="text-white/80 text-sm leading-relaxed">{reel.caption}</p>
          )}

          <div className="flex items-center gap-4 text-white/50 text-sm">
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {reel.likeCount}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {reel.commentCount}</span>
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {reel.viewCount}</span>
          </div>

          <Button
            className="w-full bg-[#1877f2] hover:bg-[#166fe5] text-white"
            onClick={() => navigate("/reels")}
          >
            <Play className="w-4 h-4 mr-2" /> Watch this Reel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Reels Page ──────────────────────────────────────────────────────────
export default function Reels() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState<Filter>("forYou");
  // Global muted state — starts unmuted so users hear audio by default
  const [globalMuted, setGlobalMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [allReels, setAllReels] = useState<Reel[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const { data: allHashtags = [] } = trpc.reels.getHashtags.useQuery();
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);

  // Reset feed when filter or hashtag filter changes
  useEffect(() => {
    setAllReels([]);
    setCursor(null);
    setHasNextPage(true);
    setCurrentIndex(0);
  }, [filter, hashtagFilter]);

  const { data } = trpc.reels.feed.useQuery(
    { limit: 10, cursor, filter },
    { enabled: hasNextPage || cursor === null }
  );

  useEffect(() => {
    if (!data) return;
    setAllReels(prev => {
      const ids = new Set(prev.map(r => r.id));
      const newReels = data.reels.filter((r: Reel) => !ids.has(r.id));
      return [...prev, ...newReels];
    });
    setHasNextPage(data.nextCursor !== null);
    setIsFetchingNextPage(false);
  }, [data]);

  const reels = allReels;

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const last = allReels[allReels.length - 1];
    if (last) { setIsFetchingNextPage(true); setCursor(last.id); }
  }, [allReels, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goNext();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, reels.length]);

  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 50) goNext();
    else if (diff < -50) goPrev();
  };

  const goNext = useCallback(() => {
    setCurrentIndex(i => {
      const next = Math.min(i + 1, reels.length - 1);
      if (next >= reels.length - 3 && hasNextPage && !isFetchingNextPage) fetchNextPage();  // eslint-disable-line
      return next;
    });
  }, [reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  // Check for ?id= param to jump to a specific reel (from share links)
  const params = new URLSearchParams(searchStr);
  const shareId = params.get("id");
  if (shareId) {
    const id = parseInt(shareId);
    if (!isNaN(id)) return <ReelShareCard reelId={id} />;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3 pb-10 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          className="pointer-events-auto w-11 h-11 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 active:scale-95 transition-all shadow-lg"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* For You / Following toggle */}
        <div className="pointer-events-auto flex items-center bg-black/50 rounded-full p-0.5 gap-0.5">
          <button
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${filter === "forYou" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
            onClick={() => setFilter("forYou")}
          >
            For You
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${filter === "following" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
            onClick={() => {
              if (!user) { toast.error("Sign in to see reels from people you follow"); return; }
              setFilter("following");
            }}
          >
            Following
          </button>
        </div>

        {user ? (
          <button
            className="pointer-events-auto w-11 h-11 rounded-full bg-[#1877f2] flex items-center justify-center text-white hover:bg-[#166fe5] active:scale-95 transition-all shadow-lg"
            onClick={() => setShowUpload(true)}
            aria-label="Upload reel"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}
      </div>

      {/* Reel feed */}
      {reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/60 gap-4">
          <Play className="w-16 h-16 text-white/20" />
          <p className="text-lg">
            {filter === "following" ? "No reels from people you follow yet" : "No reels yet"}
          </p>
          {filter === "following" && (
            <Button onClick={() => setFilter("forYou")} variant="outline" className="text-white border-white/30 bg-transparent hover:bg-white/10">
              Browse all reels
            </Button>
          )}
          {user && filter === "forYou" && (
            <Button onClick={() => setShowUpload(true)} className="bg-[#1877f2] hover:bg-[#166fe5] text-white">
              <Plus className="w-4 h-4 mr-2" /> Upload First Reel
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {reels.map((reel, idx) => (
            <div
              key={reel.id}
              className="absolute inset-0 transition-transform duration-300"
              style={{ transform: `translateY(${(idx - currentIndex) * 100}%)` }}
            >
              <ReelCard
                reel={reel}
                isActive={idx === currentIndex}
                onNext={goNext}
                onPrev={goPrev}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < reels.length - 1}
                globalMuted={globalMuted}
                onToggleMute={() => setGlobalMuted(m => !m)}
              />
            </div>
          ))}
        </div>
      )}

      {isFetchingNextPage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">Loading more…</div>
      )}

      <UploadReelDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
