import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Plus, X, Eye, Trash2, ChevronLeft, ChevronRight, Camera, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoryAuthor {
  id: number;
  name: string | null;
  avatar: string | null;
}

interface Story {
  id: number;
  authorId: number;
  mediaUrl: string;
  mediaType: "photo" | "video";
  caption: string | null;
  duration: number;
  viewCount: number;
  expiresAt: Date;
  createdAt: Date;
}

interface Highlight {
  id: number;
  authorId: number;
  title: string;
  coverUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

// ─── AddToHighlightModal ──────────────────────────────────────────────────────
function AddToHighlightModal({
  story,
  onClose,
}: {
  story: Story;
  onClose: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { data: highlights } = trpc.stories.getHighlights.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user }
  );
  const createHighlight = trpc.stories.createHighlight.useMutation({
    onSuccess: () => utils.stories.getHighlights.invalidate(),
  });
  const addToHighlight = trpc.stories.addToHighlight.useMutation({
    onSuccess: () => {
      toast.success("Added to highlight!");
      onClose();
    },
  });

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const { id } = await createHighlight.mutateAsync({
      title: newTitle.trim(),
      coverUrl: story.mediaUrl,
    });
    await addToHighlight.mutateAsync({
      highlightId: id,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      caption: story.caption ?? undefined,
    });
  };

  const handleAddExisting = async (highlightId: number) => {
    await addToHighlight.mutateAsync({
      highlightId,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      caption: story.caption ?? undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add to Highlight</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Existing highlights */}
          {(highlights as Highlight[] | undefined)?.map(hl => (
            <button
              key={hl.id}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
              onClick={() => handleAddExisting(hl.id)}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                {hl.coverUrl ? (
                  <img src={hl.coverUrl} alt={hl.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">✨</div>
                )}
              </div>
              <span className="text-sm font-medium">{hl.title}</span>
            </button>
          ))}
          {/* Create new */}
          <div className="border-t border-zinc-700 pt-3 space-y-2">
            <p className="text-xs text-zinc-400">Create new highlight</p>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
              placeholder="Highlight name..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              maxLength={100}
            />
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={!newTitle.trim() || createHighlight.isPending || addToHighlight.isPending}
              onClick={handleCreate}
            >
              Create & Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── StoryViewer ──────────────────────────────────────────────────────────────
function StoryViewer({
  stories,
  startIndex,
  authors,
  viewedIds,
  currentUserId,
  onClose,
  onViewed,
  onDelete,
}: {
  stories: Story[];
  startIndex: number;
  authors: Record<number, StoryAuthor>;
  viewedIds: number[];
  currentUserId: number;
  onClose: () => void;
  onViewed: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const story = stories[index];
  const author = story ? authors[story.authorId] : null;
  const isOwn = story?.authorId === currentUserId;

  const reactMutation = trpc.stories.react.useMutation();
  const storyIds = useMemo(() => stories.map(s => s.id), [stories]);
  const { data: reactionCounts } = trpc.stories.getReactionCounts.useQuery(
    { storyIds },
    { enabled: storyIds.length > 0 }
  );

  const advance = useCallback(() => {
    setIndex(i => {
      if (i + 1 >= stories.length) { onClose(); return i; }
      return i + 1;
    });
    setProgress(0);
    setMyReaction(null);
  }, [stories.length, onClose]);

  const goBack = () => {
    if (index > 0) { setIndex(index - 1); setProgress(0); setMyReaction(null); }
  };

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = story?.duration ?? 5000;
    const step = 100;
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timerRef.current!); advance(); return 0; }
        return p + (step / duration) * 100;
      });
    }, step);
  }, [story?.duration, advance]);

  // Reset timer when story changes
  useEffect(() => {
    if (story) {
      onViewed(story.id);
      setProgress(0);
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Pause when highlight modal is open
  useEffect(() => {
    if (showHighlightModal) {
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (!paused) {
      startTimer();
    }
  }, [showHighlightModal, paused, startTimer]);

  // Pause on hold
  const handlePointerDown = () => {
    setPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const handlePointerUp = () => {
    if (!showHighlightModal) {
      setPaused(false);
      startTimer();
    }
  };

  const handleReact = (emoji: string) => {
    if (!story) return;
    const next = myReaction === emoji ? null : emoji;
    setMyReaction(next);
    reactMutation.mutate({ storyId: story.id, emoji });
  };

  if (!story) return null;

  const currentReactions = reactionCounts?.[story.id] ?? {};
  const totalReactions = Object.values(currentReactions).reduce((a, b) => a + b, 0);

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={author?.avatar ?? undefined} />
              <AvatarFallback className="text-xs">{(author?.name ?? "?")[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-white text-sm font-medium">{author?.name ?? "Unknown"}</span>
            <span className="text-white/60 text-xs">
              {new Date(story.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOwn && (
              <>
                <span className="text-white/80 text-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {story.viewCount}
                </span>
                <button
                  className="text-white/80 hover:text-red-400 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onDelete(story.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            {isOwn && (
              <button
                className="text-white/80 hover:text-yellow-400 transition-colors"
                title="Add to Highlight"
                onClick={(e) => { e.stopPropagation(); setShowHighlightModal(true); }}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            )}
            <button className="text-white/80 hover:text-white" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="w-full h-full max-w-sm mx-auto relative select-none">
          {story.mediaType === "video" ? (
            <video
              src={story.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted={false}
              playsInline
            />
          ) : (
            <img
              src={story.mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}

          {/* Caption */}
          {story.caption && (
            <div className="absolute bottom-24 left-0 right-0 px-4">
              <p className="text-white text-center text-sm bg-black/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                {story.caption}
              </p>
            </div>
          )}

          {/* Tap zones */}
          <button
            className="absolute left-0 top-0 bottom-0 w-1/3"
            onClick={(e) => { e.stopPropagation(); goBack(); }}
          />
          <button
            className="absolute right-0 top-0 bottom-0 w-1/3"
            onClick={(e) => { e.stopPropagation(); advance(); }}
          />
        </div>

        {/* Reaction bar — bottom */}
        {!isOwn && (
          <div
            className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-10 px-4"
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            {REACTION_EMOJIS.map(emoji => {
              const count = currentReactions[emoji] ?? 0;
              const isActive = myReaction === emoji;
              return (
                <button
                  key={emoji}
                  className={`flex flex-col items-center transition-transform active:scale-125 ${isActive ? "scale-125" : ""}`}
                  onClick={() => handleReact(emoji)}
                >
                  <span className="text-2xl">{emoji}</span>
                  {count > 0 && (
                    <span className="text-white/80 text-[10px] mt-0.5">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Total reaction count badge (own stories) */}
        {isOwn && totalReactions > 0 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
            <span className="text-white/70 text-xs bg-black/40 rounded-full px-3 py-1 backdrop-blur-sm">
              {totalReactions} reaction{totalReactions !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Nav arrows (desktop) */}
        {index > 0 && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white hidden md:flex"
            onClick={goBack}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        {index < stories.length - 1 && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white hidden md:flex"
            onClick={advance}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>

      {/* Add to Highlight modal */}
      {showHighlightModal && story && (
        <AddToHighlightModal
          story={story}
          onClose={() => setShowHighlightModal(false)}
        />
      )}
    </>
  );
}

// ─── CreateStoryModal ─────────────────────────────────────────────────────────
function CreateStoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMedia = trpc.stories.uploadMedia.useMutation();
  const createStory = trpc.stories.create.useMutation();

  const handleFile = (f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const { url, storageKey } = await uploadMedia.mutateAsync({
        base64,
        mimeType: file.type,
        fileName: file.name,
      });
      await createStory.mutateAsync({
        mediaUrl: url,
        storageKey,
        mediaType: file.type.startsWith("video") ? "video" : "photo",
        caption: caption.trim() || undefined,
        duration: 5000,
      });
      toast.success("Story posted!");
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to post story");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm p-0 bg-zinc-900 border-zinc-700 block rounded-xl overflow-hidden"
        style={{ maxHeight: '90dvh', width: 'calc(100vw - 2rem)' }}
        showCloseButton={false}
      >
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          {/* Media picker — fixed height, not aspect-ratio based */}
          <div
            className="w-full bg-zinc-800 flex items-center justify-center cursor-pointer relative overflow-hidden flex-shrink-0"
            style={{ height: '52vw', maxHeight: '260px', minHeight: '180px' }}
            onClick={() => !preview && fileRef.current?.click()}
          >
            {preview ? (
              file?.type.startsWith("video") ? (
                <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <Camera className="w-10 h-10" />
                <span className="text-sm font-medium">Tap to select photo or video</span>
                <span className="text-xs text-zinc-500">Photo up to 5 MB · Video up to 10 MB</span>
              </div>
            )}
            {preview && (
              <button
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Caption + actions — always visible */}
          <div className="p-4 space-y-3 flex-shrink-0">
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
              placeholder="Add a caption..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={300}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={!file || uploading}
                onClick={handleSubmit}
              >
                {uploading ? "Posting..." : "Post Story"}
              </Button>
            </div>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── StoryBar ─────────────────────────────────────────────────────────────────
export function StoryBar({ variant = "card" }: { variant?: "card" | "compact" } = {}) {
  const { user } = useAuth();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [localViewedIds, setLocalViewedIds] = useState<number[]>([]);

  const { data, refetch } = trpc.stories.feed.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const deleteMutation = trpc.stories.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Story deleted"); },
  });
  const viewMutation = trpc.stories.view.useMutation();

  const stories = (data?.stories ?? []) as Story[];
  const authors = (data?.authors ?? {}) as Record<number, StoryAuthor>;
  const viewedIds = [...(data?.viewedIds ?? []), ...localViewedIds];

  const authorIds = Array.from(new Set(stories.map(s => s.authorId)));

  const openStoryForAuthor = (authorId: number) => {
    const firstIdx = stories.findIndex(s => s.authorId === authorId);
    if (firstIdx >= 0) { setViewerIndex(firstIdx); setViewerOpen(true); }
  };

  const handleViewed = (id: number) => {
    if (!viewedIds.includes(id)) {
      setLocalViewedIds(prev => [...prev, id]);
      viewMutation.mutate({ storyId: id });
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ storyId: id });
    setViewerOpen(false);
  };

  if (!user) return null;

  // Check if the current user has active stories in the feed
  const ownStories = stories.filter(s => s.authorId === user.id);
  const hasOwnStory = ownStories.length > 0;
  const ownAllViewed = hasOwnStory && ownStories.every(s => viewedIds.includes(s.id));
  const [ownImgError, setOwnImgError] = useState(false);
  const hasValidAvatar = !!(user.avatar && user.avatar.trim() !== "" && !ownImgError);
  const isCompact = variant === "compact";

  return (
    <>
      <div className={isCompact ? "flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-0.5" : "flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-1"}>
        {/* Your Story button — large square card */}
        <button
          className={isCompact ? "flex flex-col items-center gap-1 flex-shrink-0" : "flex flex-col items-center gap-1.5 flex-shrink-0"}
          onClick={() => hasOwnStory ? openStoryForAuthor(user.id) : setCreateOpen(true)}
        >
          <div className={isCompact ? "relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-blue-500" : "relative w-24 h-32 rounded-xl overflow-hidden flex-shrink-0"}>
            {/* Background: avatar fill or dark placeholder */}
            {hasValidAvatar ? (
              <img
                src={user.avatar!}
                alt={user.name ?? ""}
                className="w-full h-full object-cover"
                onError={() => setOwnImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#27272a" }}>
                <span className="text-2xl font-bold text-white">
                  {user.name ? user.name.charAt(0).toUpperCase() : ""}
                </span>
              </div>
            )}
            {/* Gradient ring border when user has active stories */}
            {hasOwnStory && (
              <div
                className={`absolute inset-0 ${isCompact ? "rounded-full" : "rounded-xl"} pointer-events-none story-ring-pulse`}
                style={{ boxShadow: ownAllViewed ? "inset 0 0 0 3px #52525b" : "inset 0 0 0 3px #ef4444" }}
              />
            )}
            {/* + add button at bottom */}
            <div className={isCompact ? "absolute bottom-0 right-0 flex items-center justify-center" : "absolute bottom-0 left-0 right-0 flex items-center justify-center pb-2"}>
              <div className={isCompact ? "flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600" : "w-7 h-7 rounded-full bg-red-600 flex items-center justify-center border-2 border-zinc-900"}>
                <Plus className={isCompact ? "h-3 w-3 text-white" : "w-4 h-4 text-white"} />
              </div>
            </div>
          </div>
          <span className={isCompact ? "w-16 truncate text-center text-[10px] font-semibold leading-tight text-slate-600" : "text-[11px] text-zinc-400 w-24 text-center truncate font-medium"}>Your Story</span>
        </button>

        {/* Story cards for other users */}
        {authorIds.map(authorId => {
          const author = authors[authorId];
          const authorStories = stories.filter(s => s.authorId === authorId);
          const allViewed = authorStories.every(s => viewedIds.includes(s.id));
          const isOwn = authorId === user.id;
          // Use first story's media as card background if it's a photo
          const firstStory = authorStories[0];
          const cardBg = firstStory?.mediaType === "photo" ? firstStory.mediaUrl : null;
          return (
            <button
              key={authorId}
              className={isCompact ? "flex flex-col items-center gap-1 flex-shrink-0" : "flex flex-col items-center gap-1.5 flex-shrink-0"}
              onClick={() => openStoryForAuthor(authorId)}
            >
              <div
                className={isCompact ? "relative h-14 w-14 overflow-hidden rounded-full" : "relative w-24 h-32 rounded-xl overflow-hidden"}
                style={{ boxShadow: allViewed ? "inset 0 0 0 3px #52525b" : "inset 0 0 0 3px #ef4444" }}
              >
                {/* Card background: story photo or avatar */}
                {cardBg ? (
                  <img src={cardBg} alt={author?.name ?? ""} className="w-full h-full object-cover" />
                ) : author?.avatar ? (
                  <img src={author.avatar} alt={author?.name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#27272a" }}>
                    <span className="text-2xl font-bold text-white">{(author?.name ?? "?")[0].toUpperCase()}</span>
                  </div>
                )}
                {/* Gradient overlay at bottom for name readability */}
                  {!isCompact && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />}
                {/* Avatar bubble at top */}
                {!isCompact && <div className="absolute top-2 left-2">
                  <div className={`w-9 h-9 rounded-full overflow-hidden border-2 ${allViewed ? "border-zinc-500" : "border-red-500"}`}>
                    <Avatar className="w-full h-full">
                      <AvatarImage src={author?.avatar ?? undefined} />
                      <AvatarFallback className="text-xs bg-zinc-700 text-white">{(author?.name ?? "?")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>}
                {/* Name at bottom */}
                {!isCompact && (
                  <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white font-semibold px-1 truncate">
                    {isOwn ? "You" : (author?.name?.split(" ")[0] ?? "User")}
                  </span>
                )}
              </div>
              <span className={isCompact ? "w-16 truncate text-center text-[10px] font-semibold leading-tight text-slate-600" : "text-[11px] text-zinc-300 w-24 text-center truncate font-medium"}>
                {isOwn ? "You" : (author?.name?.split(" ")[0] ?? "User")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Story Viewer */}
      {viewerOpen && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          startIndex={viewerIndex}
          authors={authors}
          viewedIds={viewedIds}
          currentUserId={user.id}
          onClose={() => setViewerOpen(false)}
          onViewed={handleViewed}
          onDelete={handleDelete}
        />
      )}

      {/* Create Story Modal */}
      {createOpen && (
        <CreateStoryModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => refetch()}
        />
      )}
    </>
  );
}
