import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, ExternalLink, FileText, MessageCircle, Repeat2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";


type GroupAuthor = { id: number; name: string | null; avatar: string | null; isVerified?: boolean };

type GroupPost = {
  id: number;
  authorId: number;
  content: string | null;
  mediaUrl: string | null;
  mediaType: "photo" | "video" | null;
  photo2Url: string | null;
  photo3Url: string | null;
  photo1Caption: string | null;
  photo2Caption: string | null;
  photo3Caption: string | null;
  videoPosterUrl: string | null;
  audioUrl: string | null;
  audioName: string | null;
  docUrl: string | null;
  docName: string | null;
  docSize: number | null;
  bgColor: string | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkDescription: string | null;
  linkImage: string | null;
  linkSiteName: string | null;
  resharedFromId?: number | null;
  shareCount?: number | null;
  createdAt: Date;
};

function initials(value: string | null | undefined) {
  return (value ?? "?").trim().charAt(0).toUpperCase() || "?";
}

function readableBytes(value: number | null) {
  if (!value) return null;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

const GROUP_REACTIONS = [
  { type: "like", emoji: "👍", label: "Like", color: "#1877f2" },
  { type: "love", emoji: "❤️", label: "Love", color: "#f33e58" },
  { type: "haha", emoji: "😂", label: "Haha", color: "#f7b125" },
  { type: "wow", emoji: "😮", label: "Wow", color: "#f7b125" },
  { type: "sad", emoji: "😢", label: "Sad", color: "#f7b125" },
  { type: "angry", emoji: "😡", label: "Angry", color: "#e9710f" },
] as const;

type GroupReaction = typeof GROUP_REACTIONS[number]["type"];

function GroupReactionControl({ groupHandle, postId }: { groupHandle: string; postId: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { data } = trpc.publicGroups.getReactionSummary.useQuery({ handle: groupHandle, postId });
  const setReaction = trpc.publicGroups.setReaction.useMutation({
    onSuccess: async () => {
      await utils.publicGroups.getReactionSummary.invalidate({ handle: groupHandle, postId });
      setPickerOpen(false);
    },
    onError: (error) => toast.error(error.message || "Failed to save reaction. Please try again."),
  });

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;
  const reactors = data?.reactors ?? [];
  const mine = data?.myReaction ?? null;
  const current = GROUP_REACTIONS.find((reaction) => reaction.type === mine);
  const choose = (reaction: GroupReaction) => {
    if (!user || setReaction.isPending) return;
    setReaction.mutate({ handle: groupHandle, postId, reaction: mine === reaction ? null : reaction });
  };

  return <div className="flex min-h-9 items-center justify-between gap-3 border-b border-border/50 pb-2">
    <div className="flex items-center gap-1.5 min-w-0">
      {total > 0 && <>
        <div className="flex items-center" aria-label={`${total.toLocaleString()} reactions`}>
          {Object.entries(counts).filter(([, count]) => count > 0).sort(([, a], [, b]) => b - a).slice(0, 3).map(([type], index) => (
            <span key={type} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border text-[11px] shadow-sm" style={{ marginLeft: index ? "-6px" : 0, zIndex: 3 - index }}>{GROUP_REACTIONS.find((reaction) => reaction.type === type)?.emoji ?? "•"}</span>
          ))}
        </div>
        {reactors.length > 0 && <div className="flex items-center" aria-label={`Recent people who reacted: ${reactors.map((reactor) => reactor.name ?? "Member").join(", ")}`}>
          {reactors.map((reactor, index) => <span key={reactor.userId} title={`${reactor.name ?? "Member"} reacted`} className="inline-flex items-center justify-center overflow-hidden w-5 h-5 rounded-full border-2 border-background bg-muted text-[8px] font-bold" style={{ marginLeft: index ? "-6px" : 0, zIndex: 5 - index }}>{reactor.avatar ? <img src={reactor.avatar} alt="" className="w-full h-full object-cover" /> : initials(reactor.name)}</span>)}
        </div>}
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">{total.toLocaleString()}</span>
      </>}
    </div>
    <div className="relative shrink-0" ref={pickerRef}>
      <button type="button" disabled={!user || setReaction.isPending} onClick={() => choose((mine ?? "like") as GroupReaction)} onMouseEnter={() => { if (user) setHoverTimer(setTimeout(() => setPickerOpen(true), 350)); }} onMouseLeave={() => { if (hoverTimer) clearTimeout(hoverTimer); }} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-primary disabled:opacity-50" style={mine ? { color: current?.color } : undefined} aria-label={mine ? `Remove ${current?.label ?? "reaction"}` : "Like this Group post"}>
        <span>{current?.emoji ?? "👍"}</span><span>{current?.label ?? "Like"}</span>
      </button>
      {pickerOpen && <div className="absolute bottom-full right-0 mb-2 z-30 flex gap-1 rounded-full border border-border bg-background px-3 py-2 shadow-xl" onMouseLeave={() => setPickerOpen(false)}>
        {GROUP_REACTIONS.map((reaction) => <button type="button" key={reaction.type} disabled={!user || setReaction.isPending} onClick={() => choose(reaction.type)} className={`text-xl transition-transform hover:scale-125 ${mine === reaction.type ? "scale-125" : ""}`} title={reaction.label} aria-label={reaction.label}>{reaction.emoji}</button>)}
      </div>}
    </div>
  </div>;
}

export default function GroupPostCard({
  groupHandle,
  post,
  author,
  canModerate,
  initialCommentCount = 0,
  onDelete,
}: {
  groupHandle: string;
  post: GroupPost;
  author?: GroupAuthor;
  canModerate?: boolean;
  initialCommentCount?: number;
  onDelete?: () => void;
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { data: commentData, isLoading: commentsLoading } = trpc.publicGroups.getComments.useQuery(
    { handle: groupHandle, postId: post.id },
    { enabled: showComments },
  );
  const addComment = trpc.publicGroups.addComment.useMutation({
    onSuccess: async () => {
      setCommentText("");
      await utils.publicGroups.getComments.invalidate({ handle: groupHandle, postId: post.id });
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteComment = trpc.publicGroups.deleteComment.useMutation({
    onSuccess: async () => {
      await utils.publicGroups.getComments.invalidate({ handle: groupHandle, postId: post.id });
    },
    onError: (error) => toast.error(error.message),
  });
  const { data: savedData } = trpc.publicGroups.isSaved.useQuery(
    { handle: groupHandle, postId: post.id },
    { enabled: Boolean(user) },
  );
  const toggleSaved = trpc.publicGroups.toggleSaved.useMutation({
    onSuccess: async (result) => {
      await utils.publicGroups.isSaved.invalidate({ handle: groupHandle, postId: post.id });
      toast.success(result.saved ? "Post saved" : "Removed from saved posts");
    },
    onError: (error) => toast.error(error.message),
  });
  const repost = trpc.publicGroups.repost.useMutation({
    onSuccess: async () => {
      await utils.publicGroups.getPosts.invalidate({ handle: groupHandle });
      toast.success("Reposted to this Public Group");
    },
    onError: (error) => toast.error(error.message),
  });

  const commentCount = commentData?.comments.length ?? initialCommentCount;
  const background = post.bgColor ?? "";
  const hasPreview = Boolean(post.linkUrl && (post.linkTitle || post.linkDescription || post.linkImage));
  const textWithoutPreviewUrl = hasPreview ? post.content?.replace(post.linkUrl ?? "", "").trim() : post.content;

  return (
    <article className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <header className="flex items-start justify-between gap-3 mb-3">
          <Link href={`/profile/${post.authorId}`} className="flex items-center gap-2 min-w-0">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={author?.avatar ?? undefined} />
              <AvatarFallback>{initials(author?.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{author?.name ?? "Unknown member"}</p>
              <p className="text-xs text-muted-foreground">{post.resharedFromId ? "Reposted in this Group · " : ""}{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
            </div>
          </Link>
          {onDelete && canModerate && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Delete group post">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </header>

        {background ? (
          <div className="min-h-48 rounded-lg flex items-center justify-center p-7 text-center text-2xl sm:text-3xl font-bold leading-relaxed whitespace-pre-wrap break-words shadow-inner" style={{ background, color: "#fff" }}>
            {post.content}
          </div>
        ) : textWithoutPreviewUrl ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">{textWithoutPreviewUrl}</p>
        ) : null}

        {hasPreview && post.linkUrl && (
          <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-lg overflow-hidden mb-3 hover:border-primary/60 hover:bg-muted/40 transition-colors">
            {post.linkImage && <img src={post.linkImage} alt="" className="w-full max-h-80 object-cover" />}
            <div className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">{post.linkSiteName ?? new URL(post.linkUrl).hostname}</p>
              {post.linkTitle && <p className="font-semibold text-sm mt-1 line-clamp-2">{post.linkTitle}</p>}
              {post.linkDescription && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.linkDescription}</p>}
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">Open link <ExternalLink className="w-3 h-3" /></span>
            </div>
          </a>
        )}

        {post.mediaUrl && post.mediaType === "photo" && (
          <div className={`grid gap-1 mb-3 ${post.photo2Url ? "grid-cols-2" : "grid-cols-1"}`}>
            <img src={post.mediaUrl} alt={post.photo1Caption ?? "Group post image"} className="rounded-lg w-full max-h-[32rem] object-cover" />
            {post.photo2Url && <img src={post.photo2Url} alt={post.photo2Caption ?? "Group post image"} className="rounded-lg w-full max-h-[32rem] object-cover" />}
            {post.photo3Url && <img src={post.photo3Url} alt={post.photo3Caption ?? "Group post image"} className="rounded-lg w-full max-h-[32rem] object-cover col-span-2" />}
          </div>
        )}
        {post.mediaUrl && post.mediaType === "video" && <video src={post.mediaUrl} poster={post.videoPosterUrl ?? undefined} controls className="rounded-lg w-full max-h-[32rem] mb-3" />}
        {post.audioUrl && <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-3"><span className="text-xs text-muted-foreground shrink-0">{post.audioName ?? "Audio"}</span><audio src={post.audioUrl} controls className="flex-1 h-8" /></div>}
        {post.docUrl && <a href={post.docUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-3 hover:bg-muted/70"><FileText className="w-4 h-4" /><span className="text-sm font-medium truncate">{post.docName ?? "Document"}</span><span className="ml-auto text-xs text-muted-foreground">{readableBytes(post.docSize)}</span></a>}
      </div>

      <div className="border-t border-border px-4 py-3 flex flex-col gap-3">
        <GroupReactionControl groupHandle={groupHandle} postId={post.id} />
        <div className="grid grid-cols-3 border-t border-border/50 pt-2">
          <button type="button" onClick={() => setShowComments((visible) => !visible)} className={`inline-flex items-center justify-center gap-1.5 py-1.5 text-sm font-semibold transition-colors border-r border-border/50 ${showComments ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} aria-label={showComments ? "Hide comments" : "Show comments"}>
            <MessageCircle className="w-4 h-4" /> <span>Comment{commentCount ? ` ${commentCount}` : ""}</span>
          </button>
          <button type="button" disabled={!user || repost.isPending} onClick={() => repost.mutate({ handle: groupHandle, postId: post.id })} className="inline-flex items-center justify-center gap-1.5 py-1.5 text-sm font-semibold text-muted-foreground hover:text-green-600 disabled:opacity-50 transition-colors border-r border-border/50" aria-label="Repost to this Public Group">
            <Repeat2 className="w-4 h-4" /> <span>Repost{post.shareCount ? ` ${post.shareCount}` : ""}</span>
          </button>
          <button type="button" disabled={!user || toggleSaved.isPending} onClick={() => toggleSaved.mutate({ handle: groupHandle, postId: post.id })} className={`inline-flex items-center justify-center gap-1.5 py-1.5 text-sm font-semibold disabled:opacity-50 transition-colors ${savedData?.saved ? "text-[var(--its-red)]" : "text-muted-foreground hover:text-[var(--its-red)]"}`} aria-label={savedData?.saved ? "Remove from saved posts" : "Save post"} aria-pressed={savedData?.saved}>
            <Bookmark className="w-4 h-4" fill={savedData?.saved ? "currentColor" : "none"} /> <span>{savedData?.saved ? "Saved" : "Save"}</span>
          </button>
        </div>
        {showComments && (
          <div className="space-y-3 pt-1">
            {commentsLoading ? <p className="text-xs text-muted-foreground">Loading comments…</p> : commentData?.comments.map((comment) => {
              const commentAuthor = commentData.authors[comment.authorId];
              return <div key={comment.id} className="flex gap-2">
                <Avatar className="w-7 h-7"><AvatarImage src={commentAuthor?.avatar ?? undefined} /><AvatarFallback>{initials(commentAuthor?.name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 rounded-lg bg-muted p-2"><p className="text-xs font-semibold">{commentAuthor?.name ?? "Member"}</p><p className="text-sm whitespace-pre-wrap break-words">{comment.text}</p></div>
                {comment.authorId === user?.id && <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => deleteComment.mutate({ handle: groupHandle, commentId: comment.id })} aria-label="Delete comment"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>;
            })}
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const text = commentText.trim(); if (text) addComment.mutate({ handle: groupHandle, postId: post.id, text }); }}>
              <Input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment…" maxLength={2000} />
              <Button type="submit" size="icon" disabled={!commentText.trim() || addComment.isPending} aria-label="Post comment"><Send className="w-4 h-4" /></Button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
