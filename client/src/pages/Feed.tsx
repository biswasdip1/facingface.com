import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import CreatePost from "@/components/CreatePost";
import { StoryBar } from "@/components/StoryBar";
import PostCard from "@/components/PostCard";
import LiveViewer from "@/components/LiveViewer";
import FeedAd from "@/components/FeedAd";
import PeopleYouMayKnow from "@/components/PeopleYouMayKnow";

import { AlertTriangle, Loader2, Radio, Users, RefreshCw, Mail, Play, Eye, MessageCircle, Newspaper, ExternalLink, BadgeCheck, ChevronDown, Gift, CalendarDays, Building2, UsersRound, Megaphone, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

type InlineReel = {
  id: number;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  viewCount: number;
  commentCount: number;
  authorName: string | null;
  authorAvatar: string | null;
};

type NewsHeadline = {
  title: string;
  link: string;
  sourceName: string;
  language: string;
  publishedAt: string | null;
};

function RightNewsFeed() {
  const { data: headlines, isLoading } = trpc.newsFeed.headlines.useQuery(
    { perSource: 4 },
    { staleTime: 5 * 60 * 1000, refetchInterval: 15 * 60 * 1000 }
  );
  const items = (headlines ?? []) as NewsHeadline[];

  return (
    <aside className="sticky top-24 rounded-sm border border-slate-300 bg-sky-50/85 p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-sky-200 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--its-red)] text-white">
            <Newspaper size={16} />
          </span>
          <div>
            <h2 className="text-2xl font-black text-pink-600 leading-none">News</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">English & Nepali</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={18} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded border border-dashed border-sky-300 bg-white/60 p-4 text-sm text-slate-600">
          No news feed is active yet. Admin can add RSS feeds from the Admin page.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <a
              key={`${item.sourceName}-${index}-${item.link}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-sky-100 bg-white/80 p-3 hover:border-pink-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-600">{item.sourceName}</span>
                <ExternalLink size={12} className="shrink-0 text-slate-400" />
              </div>
              <p className="mt-1 text-sm font-bold leading-snug text-slate-800 line-clamp-3">{item.title}</p>
              {item.publishedAt && (
                <p className="mt-1 text-[10px] text-slate-500">
                  {new Date(item.publishedAt).toString() !== "Invalid Date"
                    ? new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                    : item.language.toUpperCase()}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}

function InlineVideoReel({ reels, slot }: { reels: InlineReel[]; slot: number }) {
  const start = ((slot - 1) * 3) % Math.max(reels.length, 1);
  const visible = reels.length > 0
    ? [...reels.slice(start), ...reels.slice(0, start)].slice(0, Math.min(3, reels.length))
    : [];

  if (visible.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/40 mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--its-red)] text-white">
            <Play size={13} fill="currentColor" />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Video Reels</span>
        </div>
        <Link href="/reels" className="text-[10px] font-bold text-[var(--its-red)] hover:underline uppercase tracking-widest">
          Watch all
        </Link>
      </div>

      <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {visible.map((reel) => (
          <Link
            key={reel.id}
            href={`/reels?id=${reel.id}`}
            className="relative flex-shrink-0 w-32 h-52 rounded-xl overflow-hidden bg-black text-white group"
          >
            {reel.thumbnailUrl ? (
              <img src={reel.thumbnailUrl} alt={reel.caption ?? "Reel"} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
            ) : (
              <video src={reel.videoUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
            <div className="absolute inset-0 flex items-center justify-center opacity-90">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
                <Play size={18} fill="currentColor" />
              </span>
            </div>
            <div className="absolute left-2 right-2 bottom-2">
              <div className="flex items-center gap-1.5 mb-1">
                {reel.authorAvatar ? (
                  <img src={reel.authorAvatar} alt={reel.authorName ?? "User"} className="w-5 h-5 rounded-full object-cover border border-white/40" loading="lazy" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-[var(--its-red)] flex items-center justify-center text-[10px] font-bold">
                    {(reel.authorName ?? "?")[0].toUpperCase()}
                  </span>
                )}
                <span className="text-[10px] font-bold truncate">{reel.authorName ?? "User"}</span>
              </div>
              {reel.caption && <p className="text-[10px] line-clamp-2 leading-tight text-white/90">{reel.caption}</p>}
              <div className="flex items-center gap-2 mt-1 text-[9px] text-white/80">
                <span className="inline-flex items-center gap-0.5"><Eye size={10} /> {reel.viewCount}</span>
                <span className="inline-flex items-center gap-0.5"><MessageCircle size={10} /> {reel.commentCount}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(
    () => sessionStorage.getItem("emailBannerDismissed") === "1"
  );


  const resendVerificationMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => toast.success("Verification email sent! Check your inbox."),
    onError: () => toast.error("Failed to send verification email. Please try again."),
  });

  // Alternative: Scroll to top when route changes to HOME (if using router)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Check if user is suspended
  const isSuspended = user && (user as any).suspendedUntil && new Date((user as any).suspendedUntil) > new Date();
  const suspendedUntil = isSuspended ? new Date((user as any).suspendedUntil) : null;
  const suspendReason = (user as any)?.suspendReason as string | null | undefined;

  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [allAuthors, setAllAuthors] = useState<any>({});
  const [allLikeCounts, setAllLikeCounts] = useState<any>({});
  const [allCommentCounts, setAllCommentCounts] = useState<any>({});
  const [allResharedPosts, setAllResharedPosts] = useState<any>({});
  const [allResharedAuthors, setAllResharedAuthors] = useState<any>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: feedData, isLoading: feedLoading, refetch } = trpc.posts.feed.useQuery(
    { limit, offset },
    { refetchOnWindowFocus: false }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: liveStreams, refetch: refetchLive } = (trpc as any).live.listActive.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const { data: inlineReelsData } = trpc.reels.feed.useQuery(
    { limit: 20, cursor: null, filter: "forYou" },
    { refetchOnWindowFocus: false, staleTime: 2 * 60 * 1000 }
  );

  // Update allPosts and related data when feedData changes
  useEffect(() => {
    if (feedData?.posts) {
      if (offset === 0) {
        // First load - replace all data
        setAllPosts(feedData.posts);
        setAllAuthors(feedData.authors ?? {});
        setAllLikeCounts(feedData.likeCounts ?? {});
        setAllCommentCounts((feedData as any)?.commentCounts ?? {});
        setAllResharedPosts((feedData as any)?.resharedPosts ?? {});
        setAllResharedAuthors((feedData as any)?.resharedAuthors ?? {});
      } else {
        // Subsequent loads - append new posts and merge data
        setAllPosts((prev) => [...prev, ...feedData.posts]);
        setAllAuthors((prev) => ({ ...prev, ...feedData.authors }));
        setAllLikeCounts((prev) => ({ ...prev, ...feedData.likeCounts }));
        setAllCommentCounts((prev) => ({ ...prev, ...(feedData as any)?.commentCounts }));
        setAllResharedPosts((prev) => ({ ...prev, ...(feedData as any)?.resharedPosts }));
        setAllResharedAuthors((prev) => ({ ...prev, ...(feedData as any)?.resharedAuthors }));
      }
      // Check if there are more posts to load
      setHasMore(feedData.posts.length === limit);
      setIsLoadingMore(false);
    }
  }, [feedData?.posts, offset, limit]);

  // Load more posts when user scrolls to bottom
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore || !hasMore || feedLoading) return;

      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      // Trigger load when user is 500px from bottom
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        setIsLoadingMore(true);
        setOffset((prev) => prev + limit);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLoadingMore, hasMore, feedLoading, limit]);

  // Collect unique author IDs from the feed to check for active stories
  const feedAuthorIds = useMemo(
    () => Array.from(new Set((allPosts ?? []).map((p: { authorId: number }) => p.authorId))),
    [allPosts]
  );
  const { data: activeStoryAuthorIds } = trpc.stories.hasActiveFeed.useQuery(
    { userIds: feedAuthorIds },
    { enabled: feedAuthorIds.length > 0, refetchOnWindowFocus: false, staleTime: 60_000 }
  );
  const storyAuthorSet = useMemo(
    () => new Set<number>(activeStoryAuthorIds ?? []),
    [activeStoryAuthorIds]
  );

  const [watchingStreamId, setWatchingStreamId] = useState<number | null>(null);
  const [leftMoreOpen, setLeftMoreOpen] = useState(false);
  const { data: homeEventsData } = trpc.events.getMy.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: false });
  const { data: homeBirthdaysData } = trpc.events.birthdays.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: false });
  const homeEvents = (homeEventsData?.events ?? []).slice(0, 5);
  const homeBirthdays = [...(homeBirthdaysData?.today ?? []), ...(homeBirthdaysData?.upcoming ?? [])].slice(0, 5);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
    await Promise.all([refetch(), refetchLive()]);
  }, [refetch, refetchLive]);
  const { pullDistance, isRefreshing } = usePullToRefresh({ onRefresh: handleRefresh });

  const postIds = useMemo(
    () => allPosts.map((p: { id: number }) => p.id) ?? [],
    [allPosts]
  );

  const { data: likedData } = trpc.posts.getLikedPostIds.useQuery(
    { postIds },
    { enabled: postIds.length > 0 }
  );

  const likedSet = useMemo(
    () => new Set(likedData ?? []),
    [likedData]
  );

  if (feedLoading && offset === 0) {
    return (
      <div className="container py-12 flex justify-center">
        <Loader2 className="animate-spin text-foreground" size={24} />
      </div>
    );
  }

  const posts = allPosts;
  const authors = allAuthors;
  const likeCounts = allLikeCounts;
  const commentCounts = allCommentCounts;
  const resharedPosts: Record<number, any> = allResharedPosts;
  const resharedAuthors: Record<number, any> = allResharedAuthors;
  const activeStreams: Array<{ id: number; title?: string; viewerCount: number; host?: { name?: string } }> = liveStreams ?? [];
  const inlineReels: InlineReel[] = (inlineReelsData?.reels ?? []) as InlineReel[];

  // Two years in ms — posts older than this with media will be flagged for deletion
  const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

  return (
    <div className="container py-8" ref={containerRef}>
      {/* ── Pull-to-refresh indicator (mobile only) ── */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="sm:hidden fixed top-16 left-0 right-0 z-40 flex items-center justify-center transition-all"
          style={{ height: isRefreshing ? 44 : Math.min(pullDistance, 44), overflow: "hidden" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full shadow-md text-xs font-bold uppercase tracking-widest"
            style={{ backgroundColor: "var(--its-surface)", color: "var(--its-text-primary)", border: "1px solid var(--its-border)" }}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
              style={{ color: "var(--its-red)", transform: isRefreshing ? undefined : `rotate(${(pullDistance / 44) * 360}deg)` }}
            />
            {isRefreshing ? "Refreshing…" : "Release to refresh"}
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,680px)_340px]">
        <aside className="hidden lg:block sticky top-24 h-fit rounded-sm border border-slate-200 bg-sky-50/70 p-3 text-sm shadow-sm">
          <Link href="/subscription" className="flex items-center gap-2 border-b border-sky-100 px-2 py-3 font-semibold text-slate-700 hover:text-[var(--its-red)]">
            <BadgeCheck size={17} className="shrink-0 text-emerald-600" /> Get Verified
          </Link>
          <Link href="/p" className="flex items-center gap-2 border-b border-sky-100 px-2 py-3 font-semibold text-slate-700 hover:text-[var(--its-red)]">
            <Building2 size={17} className="shrink-0 text-slate-600" /> Your Page
          </Link>
          <Link href="/g" className="flex items-center gap-2 border-b border-sky-100 px-2 py-3 font-semibold text-slate-700 hover:text-[var(--its-red)]">
            <UsersRound size={17} className="shrink-0 text-indigo-600" /> Public Group
          </Link>
          <Link href="/shop" className="flex items-center gap-2 border-b border-sky-100 px-2 py-3 font-semibold text-slate-700 hover:text-[var(--its-red)]">
            <Megaphone size={17} className="shrink-0 text-cyan-600" /> Sale & Buy (Marketing)
          </Link>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-between px-2 py-2 text-left text-xs font-black uppercase tracking-widest text-slate-500 hover:text-[var(--its-red)]"
            onClick={() => setLeftMoreOpen((open) => !open)}
            aria-expanded={leftMoreOpen}
            aria-label="Toggle more menu"
          >
            <span className="flex items-center gap-2"><MoreHorizontal size={16} className="text-slate-500" /> More &gt;&gt;</span>
            <ChevronDown size={14} className={leftMoreOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {leftMoreOpen && (
            <div className="border-t border-sky-100 pt-1">
              <Link href="/birthdays" className="mt-1 flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-700 hover:text-[var(--its-red)]">
                <Gift size={16} className="shrink-0 text-amber-500" /> Birthdays
              </Link>
              <Link href="/events" className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-700 hover:text-[var(--its-red)]">
                <CalendarDays size={16} className="shrink-0 text-sky-600" /> Events
              </Link>
              <div className="mt-2 space-y-3 border-t border-sky-100 px-2 pt-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500"><CalendarDays size={12} className="text-sky-600" />Upcoming events</span><Link href="/events" className="text-[10px] font-bold text-[var(--its-red)] hover:underline">All</Link></div>
                  {homeEvents.length > 0 ? <div className="space-y-1">{homeEvents.map((event) => <Link key={event.id} href="/events" className="block rounded-md px-2 py-1.5 text-slate-700 transition-colors hover:bg-white/75"><p className="truncate text-xs font-bold">{event.title}</p><p className="mt-0.5 text-[10px] text-slate-500">{new Date(event.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p></Link>)}</div> : <p className="px-2 py-1 text-[11px] text-slate-500">No upcoming events.</p>}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500"><Gift size={12} className="text-amber-500" />Birthdays</span><Link href="/birthdays" className="text-[10px] font-bold text-[var(--its-red)] hover:underline">All</Link></div>
                  {homeBirthdays.length > 0 ? <div className="space-y-1">{homeBirthdays.map((birthday) => <Link key={birthday.user.id} href={`/profile/${birthday.user.id}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-slate-700 transition-colors hover:bg-white/75"><span className="truncate text-xs font-bold">{birthday.user.name ?? "Friend"}</span><span className="shrink-0 text-[10px] text-slate-500">{birthday.daysUntil === 0 ? "Today" : `${birthday.daysUntil}d`}</span></Link>)}</div> : <p className="px-2 py-1 text-[11px] text-slate-500">No upcoming birthdays.</p>}
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="min-w-0">

        {/* Suspension banner */}
        {isSuspended && (
          <div className="mb-6 border-2 border-red-500 bg-red-50 dark:bg-red-950 p-4 rounded-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-bold text-red-700 dark:text-red-400 text-sm uppercase tracking-wide">
                  Account Suspended
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  Your account has been suspended until{" "}
                  <strong>{suspendedUntil?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>.
                </p>
                {suspendReason && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">Reason: {suspendReason}</p>
                )}
                <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                  You can still browse the feed, but cannot post, comment, or interact until the suspension is lifted.
                  If you believe this is an error, please contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email verification reminder banner */}
        {!emailBannerDismissed && user && !(user as any).emailVerified && (user as any).email && (
          <div className="mb-6 border-2 border-amber-400 bg-amber-50 dark:bg-amber-950 p-4 rounded-sm">
            <div className="flex items-start gap-3">
              <Mail className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" size={20} />
              <div className="flex-1">
                <p className="font-bold text-amber-700 dark:text-amber-400 text-sm uppercase tracking-wide">
                  Verify Your Email Address
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                  We sent a verification link to <strong>{(user as any).email}</strong>. Please check your inbox and click the link to activate your account.
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() =>
                    resendVerificationMutation.mutate({
                      email: (user as any).email,
                      origin: window.location.origin,
                    })
                  }
                  disabled={resendVerificationMutation.isPending}
                  className="text-xs font-bold uppercase tracking-widest text-white px-3 py-1.5 rounded disabled:opacity-60"
                  style={{ background: "#e67e00" }}
                >
                  {resendVerificationMutation.isPending ? "Sending…" : "Resend"}
                </button>
                <button
                  onClick={() => {
                    setEmailBannerDismissed(true);
                    sessionStorage.setItem("emailBannerDismissed", "1");
                  }}
                  className="text-xs font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Active live streams - DISABLED */}
        {false && activeStreams.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Radio size={14} className="text-[var(--its-red)] animate-pulse" />
              <span className="text-xs font-black tracking-widest uppercase text-[var(--its-red)]">Live Now</span>
              <div className="flex-1 its-divider" />
            </div>

            {watchingStreamId ? (
              <div className="border border-[var(--its-red)]">
                <LiveViewer
                  streamId={watchingStreamId}
                  hostName={activeStreams.find((s) => s.id === watchingStreamId)?.host?.name}
                  onEnded={() => { setWatchingStreamId(null); refetchLive(); }}
                />
                <div className="p-3 flex items-center justify-between border-t border-border">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">
                    {activeStreams.find((s) => s.id === watchingStreamId)?.title ?? "Live Stream"}
                  </span>
                  <button
                    onClick={() => setWatchingStreamId(null)}
                    className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  >
                    Leave
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {activeStreams.map((stream) => (
                  <button
                    key={stream.id}
                    onClick={() => setWatchingStreamId(stream.id)}
                    className="flex items-center justify-between border border-[var(--its-red)] p-3 hover:bg-red-50 transition-colors text-left w-full"
                    style={{ borderRadius: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-[var(--its-red)] animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-widest">
                          {stream.title ?? "Live Stream"}
                        </p>
                        <p className="text-xs text-muted-foreground">{stream.host?.name ?? "Unknown"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{stream.viewerCount}</span>
                      <span className="text-xs font-bold text-[var(--its-red)] ml-2 uppercase tracking-widest">Watch</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create post — hidden while suspended */}
        {!isSuspended && (
          <div className="mb-4">
            <CreatePost onSuccess={() => handleRefresh()} />
          </div>
        )}

        {/* Stories */}
        <div id="story-bar" className="mb-4 bg-card border border-border rounded-sm p-3">
          <StoryBar />
        </div>

        {/* Posts */}
        {posts.length === 0 && !isLoadingMore ? (
          <div className="border border-border p-12 text-center">
            <div className="flex justify-center mb-4">
              <span className="its-accent-lg" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-foreground mb-2">No Posts Yet</p>
            <p className="text-xs text-muted-foreground">Be the first to share something with the community.</p>
          </div>
        ) : posts.length > 0 ? (
          <div>
            {posts.map((post, index) => {
              // Check if this post is scheduled for deletion (warning banner)
              const scheduledDeletion = (post as any).deletionScheduledAt
                ? new Date((post as any).deletionScheduledAt)
                : null;
              // Check if post is older than 2 years and has media (approaching deletion)
              const postAge = Date.now() - new Date(post.createdAt).getTime();
              const hasMedia = !!(post.mediaUrl || post.audioUrl || (post as any).docUrl);
              const isApproachingDeletion = hasMedia && postAge > TWO_YEARS_MS * 0.95 && !scheduledDeletion;
              // Feed rotation requested by the site owner:
              // after 4th post = advertisement, after 6th = video reel,
              // after 8th = People You May Know, after 10th = story reel;
              // then repeat the same pattern every 10 posts.
              const postNumber = index + 1;
              const cycleIndex = postNumber % 10;
              const showAd = cycleIndex === 4;
              const showVideoReel = cycleIndex === 6;
              const showPeopleYouMayKnow = cycleIndex === 8;
              const showStoryReel = cycleIndex === 0;
              const cycleSlot = Math.floor((postNumber - 1) / 10) + 1;

              return (
                <div key={post.id}>
                  {/* Deletion warning banner */}
                  {(scheduledDeletion || isApproachingDeletion) && (
                    <div className="mb-1 border border-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 flex items-start gap-2">
                      <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={14} />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {scheduledDeletion
                          ? `⚠️ This post is scheduled for automatic deletion on ${scheduledDeletion.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} because its media has been inactive for over 2 years.`
                          : "⚠️ This post's media is over 2 years old and will be scheduled for deletion soon. Download any files you wish to keep."}
                      </p>
                    </div>
                  )}
                  <PostCard
                    post={post}
                    author={authors[post.authorId]}
                    likeCount={likeCounts[post.id] ?? 0}
                    commentCount={commentCounts[post.id] ?? 0}
                    isLiked={likedSet.has(post.id)}
                    onDelete={() => handleRefresh()}
                    resharedPost={post.resharedFromId ? resharedPosts[post.resharedFromId] : null}
                    resharedAuthor={post.resharedFromId && resharedPosts[post.resharedFromId] ? resharedAuthors[resharedPosts[post.resharedFromId].authorId] : null}
                    authorHasStory={storyAuthorSet.has(post.authorId)}
                  />
                  {showAd && <FeedAd slot={cycleSlot} />}
                  {showVideoReel && <InlineVideoReel reels={inlineReels} slot={cycleSlot} />}
                  {showPeopleYouMayKnow && <PeopleYouMayKnow />}
                  {showStoryReel && (
                    <div className="mb-4 bg-card border border-border rounded-sm p-3">
                      <StoryBar variant="compact" />
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Load more indicator */}
            {isLoadingMore && (
              <div className="py-8 flex justify-center">
                <Loader2 className="animate-spin text-foreground" size={24} />
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No more posts to load
              </div>
            )}
          </div>
        ) : null}
        </main>

        <div className="hidden xl:block">
          <RightNewsFeed />
        </div>
      </div>
    </div>
  );
}
