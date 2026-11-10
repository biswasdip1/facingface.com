import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Heart, Trash2, Send, Smile, CornerDownRight, BadgeCheck, Languages, Flag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useThemeMode } from "@/contexts/ThemeModeContext";

interface CommentSectionProps {
  postId: number;
}

// ─── Emoji Reaction Mini-bar (for comments) ───────────────────────────────────

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍"];

interface CommentReactionBarProps {
  commentId: number;
}

function CommentReactionBar({ commentId }: CommentReactionBarProps) {
  const { themeMode } = useThemeMode();
  const emojiTheme = themeMode === "lightdark" || themeMode === "darkblue" ? "dark" : "light";
  const utils = trpc.useUtils();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { data: reactionData } = trpc.reactions.getCounts.useQuery({
    targetId: commentId,
    targetType: "comment",
  });
  const counts = reactionData?.counts ?? {};
  const myReactions = reactionData?.myReactions ?? [];

  const toggleReaction = trpc.reactions.toggle.useMutation({
    onSuccess: () =>
      utils.reactions.getCounts.invalidate({ targetId: commentId, targetType: "comment" }),
  });

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleEmoji = (emoji: string) => {
    toggleReaction.mutate({ targetId: commentId, targetType: "comment", emoji });
    setShowPicker(false);
  };

  return (
    <div className="relative flex items-center gap-1 flex-wrap mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {QUICK_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const isActive = myReactions.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => handleEmoji(emoji)}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full border transition-all cursor-pointer ${
              isActive
                ? "border-[var(--its-red)] bg-[var(--its-red)]/10"
                : "border-border hover:border-[var(--its-red)] hover:bg-[var(--its-red)]/5"
            }`}
            title={`React with ${emoji}`}
          >
            <span style={{ fontSize: 12 }}>{emoji}</span>
            {count > 0 && (
              <span className="text-[9px] font-bold text-muted-foreground">{count}</span>
            )}
          </button>
        );
      })}
      <button
        onClick={() => setShowPicker((v) => !v)}
        className={`flex items-center justify-center w-5 h-5 rounded-full border transition-all ${
          showPicker
            ? "border-[var(--its-red)] text-[var(--its-red)]"
            : "border-border text-muted-foreground hover:border-[var(--its-red)]"
        }`}
        title="More reactions"
      >
        <Smile size={10} />
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute left-0 top-full mt-1 z-50 shadow-xl"
          style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.18))" }}
        >
          <Picker
            data={data}
            onEmojiSelect={(e: { native: string }) => handleEmoji(e.native)}
            theme={emojiTheme}
            set="native"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
            perLine={7}
          />
        </div>
      )}
    </div>
  );
}

// ─── Comment Input Box ────────────────────────────────────────────────────────

interface CommentInputProps {
  postId: number;
  parentId?: number;
  placeholder?: string;
  onSuccess?: () => void;
  autoFocus?: boolean;
}

function CommentInput({ postId, parentId, placeholder, onSuccess, autoFocus }: CommentInputProps) {
  const utils = trpc.useUtils();
  const { themeMode } = useThemeMode();
  const emojiTheme = themeMode === "lightdark" || themeMode === "darkblue" ? "dark" : "light";
  const [text, setText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const createComment = trpc.comments.create.useMutation({
    onMutate: async () => {
      // Optimistic update: clear input immediately for fast feedback
      setText("");
      setShowPicker(false);
    },
    onSuccess: () => {
      // Invalidate and refetch after success
      utils.comments.list.invalidate({ postId });
      utils.posts.feed.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    createComment.mutate({ postId, text: text.trim(), parentId });
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    const input = inputRef.current;
    if (!input) { setText((prev) => prev + emoji.native); setShowPicker(false); return; }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji.native + text.slice(end);
    setText(newText);
    setShowPicker(false);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.native.length;
      input.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 relative">
      <div className="flex-1 relative flex items-center">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? "Write a comment…"}
          maxLength={1000}
          className="w-full border border-border pl-3 pr-10 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
          style={{ borderRadius: 0 }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowPicker(false); }}
        />
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className={`absolute right-2 transition-colors ${
            showPicker ? "text-[var(--its-red)]" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Add emoji"
        >
          <Smile size={16} />
        </button>
      </div>
      <button
        type="submit"
        disabled={!text.trim() || createComment.isPending}
        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase hover:bg-[var(--its-red)] transition-colors disabled:opacity-40 flex-shrink-0"
        style={{ borderRadius: 0 }}
      >
        <Send size={14} />
      </button>
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full right-0 mb-2 z-50 shadow-xl"
          style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.18))" }}
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme={emojiTheme}
            set="native"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={2}
            perLine={8}
          />
        </div>
      )}
    </form>
  );
}

// ─── Single Comment Row ───────────────────────────────────────────────────────

interface CommentRowProps {
  comment: {
    id: number;
    postId: number;
    authorId: number;
    parentId: number | null;
    text: string;
    createdAt: Date;
  };
  author: { id: number; name: string | null; avatar: string | null; isVerified?: boolean } | undefined;
  likeCount: number;
  isLiked: boolean;
  replies: CommentRowProps["comment"][];
  allAuthors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified?: boolean }>;
  allLikeCounts: Record<number, number>;
  allLikedIds: number[];
  postId: number;
  depth?: number;
}

function CommentRow({
  comment, author, likeCount, isLiked, replies, allAuthors, allLikeCounts, allLikedIds, postId, depth = 0,
}: CommentRowProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translateCaption = (trpc as any).media.translateCaption.useMutation();
  const userLang = typeof navigator !== "undefined" ? (navigator.language ?? "en").split("-")[0] : "en";

  const toggleLike = trpc.likes.toggle.useMutation({
    onMutate: () => {
      setLocalLiked((prev) => !prev);
      setLocalLikeCount((prev) => (localLiked ? prev - 1 : prev + 1));
    },
    onError: () => {
      setLocalLiked((prev) => !prev);
      setLocalLikeCount((prev) => (localLiked ? prev + 1 : prev - 1));
    },
    onSuccess: () => utils.comments.list.invalidate({ postId }),
  });

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => utils.comments.list.invalidate({ postId }),
    onError: (err) => toast.error(err.message),
  });

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<"sexual_content" | "violence" | "harassment" | "spam" | "other" | "">("");
  const [reportDescription, setReportDescription] = useState("");
  const reportComment = trpc.comments.report.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. Thank you for helping keep FacingFace safe.");
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    },
    onError: (e) => toast.error(e.message),
  });

  const isOwner = user?.id === comment.authorId;
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });

  return (
    <div className={`${depth > 0 ? "ml-8 border-l-2 border-border pl-3" : ""}`}>
      <div className="flex gap-3 py-2.5 group">
        <Link href={`/profile/${comment.authorId}`} className="no-underline flex-shrink-0">
          {author?.avatar ? (
            <img src={author.avatar} alt={author.name ?? ""} className="w-7 h-7 object-cover border border-border" style={{ borderRadius: 0 }} />
          ) : (
            <div className="w-7 h-7 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">{(author?.name ?? "U").charAt(0).toUpperCase()}</span>
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <Link href={`/profile/${comment.authorId}`} className="text-xs font-bold text-foreground no-underline hover:underline flex items-center gap-1">
              {author?.name ?? "Unknown"}
              {author?.isVerified && <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />}
            </Link>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          <p className="text-sm text-foreground leading-relaxed break-words">
            {translatedText ?? comment.text}
          </p>
          {/* Translate button */}
          <button
            onClick={async () => {
              if (translatedText) { setTranslatedText(null); return; }
              setTranslating(true);
              try {
                const { translated } = await translateCaption.mutateAsync({ text: comment.text, targetLang: userLang });
                setTranslatedText(translated);
              } catch { /* silent */ } finally { setTranslating(false); }
            }}
            disabled={translating}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            aria-label={translatedText ? "Show original comment" : "Translate comment"}
          >
            <Languages size={10} />
            {translating ? "Translating…" : translatedText ? "Show original" : "Translate"}
          </button>

          {/* Reaction bar for comment */}
          <CommentReactionBar commentId={comment.id} />

          {/* Action row */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => toggleLike.mutate({ targetId: comment.id, targetType: "comment" })}
              className={`flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors ${
                localLiked ? "text-[var(--its-red)]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart size={12} fill={localLiked ? "currentColor" : "none"} />
              {localLikeCount > 0 && <span>{localLikeCount}</span>}
              <span>Like</span>
            </button>

            {depth === 0 && (
              <button
                onClick={() => setShowReplyInput((v) => !v)}
                className={`flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors ${
                  showReplyInput ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CornerDownRight size={12} />
                <span>Reply</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => deleteComment.mutate({ commentId: comment.id })}
                className="text-muted-foreground hover:text-[var(--its-red)] transition-colors"
                title="Delete comment"
              >
                <Trash2 size={12} />
              </button>
            )}
            {!isOwner && user && (
              <button
                onClick={() => setShowReportDialog(true)}
                className="text-muted-foreground hover:text-amber-500 transition-colors"
                title="Report comment"
              >
                <Flag size={12} />
              </button>
            )}
          </div>

          {/* Report Comment Dialog */}
          <Dialog open={showReportDialog} onOpenChange={(open) => { setShowReportDialog(open); if (!open) { setReportReason(""); setReportDescription(""); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Flag size={14} className="text-amber-500" />
                  Report Comment
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
                    reportComment.mutate({ commentId: comment.id, reason: reportReason, description: reportDescription || undefined });
                  }}
                  disabled={!reportReason || reportComment.isPending}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {reportComment.isPending ? "Submitting…" : "Submit Report"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-2">
              <CommentInput
                postId={postId}
                parentId={comment.id}
                placeholder={`Reply to ${author?.name ?? "comment"}…`}
                onSuccess={() => setShowReplyInput(false)}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="mt-1 space-y-0">
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              author={allAuthors[reply.authorId]}
              likeCount={allLikeCounts[reply.id] ?? 0}
              isLiked={allLikedIds.includes(reply.id)}
              replies={[]}
              allAuthors={allAuthors}
              allLikeCounts={allLikeCounts}
              allLikedIds={allLikedIds}
              postId={postId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CommentSection ───────────────────────────────────────────────────────────

export default function CommentSection({ postId }: CommentSectionProps) {
  const { data: commentData, isLoading } = trpc.comments.list.useQuery({ postId });
  const [showAllComments, setShowAllComments] = useState(false);

  const topLevel = (commentData?.comments ?? []).filter((c) => !c.parentId);
  const replies = (commentData?.comments ?? []).filter((c) => !!c.parentId);
  const visibleTopLevel = showAllComments ? topLevel : topLevel.slice(0, 1);
  const hiddenCommentCount = Math.max(topLevel.length - visibleTopLevel.length, 0);

  return (
    <div className="space-y-0">
      {isLoading && (
        <p className="text-xs text-muted-foreground uppercase tracking-widest py-2">Loading…</p>
      )}



      {/* Top-level comments with their replies — newest comment preview first */}
      <div className="divide-y divide-border">
        {visibleTopLevel.map((comment) => {
          const commentReplies = replies.filter((r) => r.parentId === comment.id);
          return (
            <CommentRow
              key={comment.id}
              comment={comment}
              author={commentData?.authors[comment.authorId]}
              likeCount={commentData?.likeCounts[comment.id] ?? 0}
              isLiked={commentData?.likedIds.includes(comment.id) ?? false}
              replies={commentReplies}
              allAuthors={commentData?.authors ?? {}}
              allLikeCounts={commentData?.likeCounts ?? {}}
              allLikedIds={commentData?.likedIds ?? []}
              postId={postId}
            />
          );
        })}
      </div>

      {hiddenCommentCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllComments(true)}
          className="mt-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          View {hiddenCommentCount.toLocaleString()} more {hiddenCommentCount === 1 ? "comment" : "comments"}
        </button>
      )}

      {/* New comment input — placed below the displayed comments */}
      <div className="mt-3">
        <CommentInput postId={postId} />
      </div>
    </div>
  );
}
