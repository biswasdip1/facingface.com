import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CalendarClock, Loader2, Trash2, Link as LinkIcon, CalendarDays,
  ChevronDown, ChevronUp, Image as ImageIcon, FileText, Music, Video,
} from "lucide-react";
import { Link } from "wouter";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function ReschedulePopover({ postId, currentScheduledAt }: { postId: number; currentScheduledAt: Date | null }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(currentScheduledAt ? new Date(currentScheduledAt) : undefined);
  const [timeStr, setTimeStr] = useState<string>(() => {
    if (currentScheduledAt) return format(new Date(currentScheduledAt), "HH:mm");
    return format(addMinutes(new Date(), 30), "HH:mm");
  });

  const reschedule = trpc.posts.reschedule.useMutation({
    onSuccess: () => {
      utils.posts.getScheduled.invalidate();
      toast.success("Post rescheduled.");
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!date) { toast.error("Please pick a date."); return; }
    const [h, m] = timeStr.split(":").map(Number);
    const scheduled = new Date(date);
    scheduled.setHours(h, m, 0, 0);
    if (scheduled <= new Date()) { toast.error("Scheduled time must be in the future."); return; }
    reschedule.mutate({ postId, scheduledAt: scheduled });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Reschedule post"
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-[var(--its-red)] border border-border hover:border-[var(--its-red)] px-2 py-1.5 transition-colors"
          style={{ borderRadius: 0 }}
        >
          <CalendarDays size={11} />
          <span className="hidden sm:inline">Reschedule</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--its-text-primary)" }}>Pick new date &amp; time</p>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(d) => d < new Date()}
          initialFocus
        />
        <div className="p-3 border-t border-border flex items-center gap-2">
          <input
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            className="flex-1 text-xs border border-border bg-background px-2 py-1.5 outline-none"
            style={{ color: "var(--its-text-primary)" }}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={reschedule.isPending || !date}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors disabled:opacity-40"
            style={{ background: "var(--its-text-primary)", color: "var(--its-surface)", borderColor: "var(--its-text-primary)" }}
          >
            {reschedule.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ScheduledPost = {
  id: number;
  text: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  audioUrl: string | null;
  audioName: string | null;
  docUrl: string | null;
  docName: string | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkImage: string | null;
  bgColor: string | null;
  scheduledAt: Date | null;
};

function PostPreview({ post }: { post: ScheduledPost }) {
  const hasMedia = !!(post.mediaUrl || post.audioUrl || post.docUrl || post.linkUrl);
  return (
    <div
      className="mt-3 border border-border overflow-hidden"
      style={{ background: post.bgColor ?? "var(--its-surface)" }}
    >
      {/* Text */}
      {post.text && (
        <div className="p-3">
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: post.bgColor ? "#fff" : "var(--its-text-primary)" }}
          >
            {post.text}
          </p>
        </div>
      )}

      {/* Image / Video thumbnail */}
      {post.mediaUrl && post.mediaType === "image" && (
        <div className="border-t border-border/40">
          <img
            src={post.mediaUrl}
            alt="Post media"
            className="w-full max-h-64 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      {post.mediaUrl && post.mediaType === "video" && (
        <div className="border-t border-border/40 p-3 flex items-center gap-2">
          <Video size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">Video attachment</span>
        </div>
      )}

      {/* Audio */}
      {post.audioUrl && (
        <div className="border-t border-border/40 p-3 flex items-center gap-2">
          <Music size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{post.audioName ?? "Audio attachment"}</span>
        </div>
      )}

      {/* Document */}
      {post.docUrl && (
        <div className="border-t border-border/40 p-3 flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{post.docName ?? "Document"}</span>
        </div>
      )}

      {/* Link preview */}
      {post.linkUrl && (
        <div className="border-t border-border/40 flex items-start gap-2 p-3">
          {post.linkImage ? (
            <img src={post.linkImage} alt="" className="w-14 h-14 object-cover flex-shrink-0 border border-border" />
          ) : (
            <div className="w-14 h-14 flex items-center justify-center bg-muted flex-shrink-0 border border-border">
              <LinkIcon size={14} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{post.linkTitle ?? post.linkUrl}</p>
            <p className="text-[10px] text-muted-foreground truncate">{post.linkUrl}</p>
          </div>
        </div>
      )}

      {!post.text && !hasMedia && (
        <div className="p-3 flex items-center gap-2 text-muted-foreground">
          <ImageIcon size={14} />
          <span className="text-xs italic">Empty post</span>
        </div>
      )}
    </div>
  );
}

export default function ScheduledPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: posts, isLoading } = trpc.posts.getScheduled.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const cancel = trpc.posts.cancelScheduled.useMutation({
    onSuccess: () => {
      utils.posts.getScheduled.invalidate();
      toast.success("Scheduled post cancelled.");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <CalendarClock size={40} className="mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-bold mb-2">Sign in to see your scheduled posts</h2>
        <p className="text-sm text-muted-foreground">Log in to manage your upcoming posts.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-0 sm:px-4 py-6">
      <div className="flex items-center gap-2 px-4 sm:px-0 mb-6">
        <div className="w-1 h-5 bg-[var(--its-red)]" />
        <CalendarClock size={16} className="text-[var(--its-red)]" />
        <h1 className="text-sm font-black uppercase tracking-widest">Scheduled Posts</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : !posts || posts.length === 0 ? (
        <div className="text-center py-16 px-4">
          <CalendarClock size={40} className="mx-auto mb-4 text-muted-foreground opacity-40" />
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2">No scheduled posts</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Use the <strong>Schedule</strong> button in the post composer to queue a post for a future date and time.
          </p>
          <Link href="/" className="text-xs font-bold text-[var(--its-red)] hover:underline uppercase tracking-widest">
            Go to Feed
          </Link>
        </div>
      ) : (
        <div className="space-y-0 border-t border-border">
          {posts.map((post) => {
            const isExpanded = expandedIds.has(post.id);
            return (
              <div
                key={post.id}
                className="px-4 py-4 border-b border-border hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Date column */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[52px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--its-red)]">
                      {post.scheduledAt ? format(new Date(post.scheduledAt), "MMM d") : "—"}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {post.scheduledAt ? format(new Date(post.scheduledAt), "h:mm a") : ""}
                    </span>
                  </div>

                  <div className="w-px self-stretch bg-border flex-shrink-0" />

                  {/* Content summary */}
                  <div className="flex-1 min-w-0">
                    {post.text ? (
                      <p className="text-sm text-foreground leading-snug line-clamp-2">{post.text}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {post.mediaUrl ? (post.mediaType === "video" ? "Video post" : "Photo post") : post.docUrl ? "Document post" : post.audioUrl ? "Audio post" : "Empty post"}
                      </p>
                    )}
                    {/* Attachment badges */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {post.mediaUrl && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                          {post.mediaType === "video" ? <Video size={9} /> : <ImageIcon size={9} />}
                          {post.mediaType === "video" ? "Video" : "Photo"}
                        </span>
                      )}
                      {post.audioUrl && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                          <Music size={9} />Audio
                        </span>
                      )}
                      {post.docUrl && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                          <FileText size={9} />Doc
                        </span>
                      )}
                      {post.linkUrl && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                          <LinkIcon size={9} />Link
                        </span>
                      )}
                    </div>
                    {/* Preview toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(post.id)}
                      className="flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-[var(--its-red)] transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      {isExpanded ? "Hide preview" : "Preview"}
                    </button>
                    {/* Expanded preview */}
                    {isExpanded && <PostPreview post={post as ScheduledPost} />}
                  </div>

                  {/* Action buttons */}
                  <div className="flex-shrink-0 flex flex-col gap-1.5">
                    <ReschedulePopover postId={post.id} currentScheduledAt={post.scheduledAt ?? null} />
                    <button
                      type="button"
                      disabled={cancel.isPending}
                      onClick={() => {
                        if (confirm("Cancel this scheduled post? It will be permanently deleted.")) {
                          cancel.mutate({ postId: post.id });
                        }
                      }}
                      title="Cancel scheduled post"
                      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive border border-border hover:border-destructive px-2 py-1.5 transition-colors disabled:opacity-40"
                      style={{ borderRadius: 0 }}
                    >
                      <Trash2 size={11} />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
