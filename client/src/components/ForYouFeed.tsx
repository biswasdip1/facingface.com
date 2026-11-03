import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PostCard from "@/components/PostCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  FEED_INTERESTS,
  RECOMMENDATION_REASONS,
  type FeedInterestId,
  type RecommendationReason,
} from "@shared/recommendations";
import {
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  RotateCcw,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const surface = {
  backgroundColor: "var(--its-surface)",
  color: "var(--its-text-primary)",
  borderColor: "var(--its-border)",
};
const muted = { color: "var(--its-text-muted)" };
export default function ForYouFeed({ onLatest }: { onLatest: () => void }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const scope = { viewerId: user?.id ?? 0 };
  const feed = trpc.recommendations.feed.useQuery(scope, {
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    retry: 1,
  });
  const settings = trpc.recommendations.settings.useQuery(scope, {
    enabled: !!user,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const [visibleCount, setVisibleCount] = useState(20);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftInterests, setDraftInterests] = useState<FeedInterestId[]>([]);
  const [draftLearning, setDraftLearning] = useState(false);
  const [lastHidden, setLastHidden] = useState<number | null>(null);
  const [suppressedIds, setSuppressedIds] = useState<Set<number>>(
    () => new Set()
  );
  const posts = useMemo(
    () => (feed.data?.posts ?? []).filter(post => !suppressedIds.has(post.id)),
    [feed.data?.posts, suppressedIds]
  );
  const postIds = useMemo(() => posts.map(post => post.id), [posts]);
  const authorIds = useMemo(
    () => Array.from(new Set(posts.map(post => post.authorId))),
    [posts]
  );
  const liked = trpc.posts.getLikedPostIds.useQuery(
    { postIds },
    { enabled: postIds.length > 0 }
  );
  const stories = trpc.stories.hasActiveFeed.useQuery(
    { userIds: authorIds },
    {
      enabled: authorIds.length > 0,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );
  const likedSet = new Set(liked.data ?? []);
  const storySet = new Set(stories.data ?? []);
  const refresh = async () => {
    setVisibleCount(20);
    await feed.refetch();
  };
  const save = trpc.recommendations.save.useMutation({
    onSuccess: async data => {
      utils.recommendations.settings.setData(scope, data);
      setSettingsOpen(false);
      setVisibleCount(20);
      await utils.recommendations.feed.invalidate(scope);
      toast.success("Your recommendation preferences are saved.");
    },
    onError: error => toast.error(error.message),
  });
  const reset = trpc.recommendations.reset.useMutation({
    onSuccess: async data => {
      utils.recommendations.settings.setData(scope, data);
      setDraftInterests([]);
      setDraftLearning(false);
      setLastHidden(null);
      setSuppressedIds(new Set());
      setVisibleCount(20);
      setSettingsOpen(false);
      await utils.recommendations.feed.invalidate(scope);
      toast.success("Recommendations reset. Activity learning is off.");
    },
    onError: error => toast.error(error.message),
  });
  const hide = trpc.recommendations.hide.useMutation({
    onMutate: () => utils.recommendations.feed.cancel(scope),
    onSuccess: (_, input) => {
      setSuppressedIds(
        previous => new Set(Array.from(previous).concat(input.postId))
      );
      utils.recommendations.feed.setData(scope, previous =>
        previous
          ? {
              ...previous,
              posts: previous.posts.filter(post => post.id !== input.postId),
            }
          : previous
      );
      setLastHidden(input.postId);
      toast.success(
        "Hidden from For You. Latest and the original post are unchanged."
      );
    },
    onError: error => toast.error(error.message),
  });
  const unhide = trpc.recommendations.unhide.useMutation({
    onSuccess: async (_, input) => {
      setSuppressedIds(
        previous =>
          new Set(Array.from(previous).filter(id => id !== input.postId))
      );
      setLastHidden(null);
      await utils.recommendations.feed.invalidate(scope);
    },
    onError: error => toast.error(error.message),
  });
  const busy = save.isPending || reset.isPending;
  const openSettings = () => {
    if (!settings.data) return;
    setDraftInterests([...settings.data.interests]);
    setDraftLearning(settings.data.learnFromActivity);
    setSettingsOpen(true);
  };
  return (
    <section aria-label="For You recommendations">
      <div className="mb-4 rounded-xl border p-4" style={surface}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Sparkles size={17} className="shrink-0" /> A feed shaped by you
            </h2>
            <p className="mt-1 text-xs leading-relaxed" style={muted}>
              Based on your interests, followed accounts and public
              Pages/Groups. Latest stays newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={openSettings}
            disabled={!settings.data || settings.isError}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            style={surface}
          >
            <SlidersHorizontal size={14} /> Interests & controls
          </button>
        </div>
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
          style={{ borderColor: "var(--its-border)" }}
        >
          <span
            className="inline-flex items-center gap-1.5 text-[11px]"
            style={muted}
          >
            <ShieldCheck size={13} />{" "}
            {settings.data?.learnFromActivity
              ? "Activity learning is on — your choice"
              : "Activity learning is off by default"}
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={feed.isFetching}
            className="inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={feed.isFetching ? "animate-spin" : ""}
            />{" "}
            Refresh suggestions
          </button>
        </div>
        {settings.data && settings.data.interests.length === 0 && (
          <p className="mt-3 text-xs" style={muted}>
            Choose a few interests to get started. With no matches, you will see
            recent community posts.
          </p>
        )}
        {settings.isError && (
          <p role="alert" className="mt-3 text-xs">
            Preferences could not load.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void settings.refetch()}
            >
              Try again
            </button>
          </p>
        )}
      </div>
      {lastHidden !== null && (
        <div
          role="status"
          className="mb-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
          style={surface}
        >
          <span>Post hidden from For You.</span>
          <button
            type="button"
            onClick={() => unhide.mutate({ postId: lastHidden })}
            disabled={unhide.isPending}
            className="font-semibold underline"
          >
            Undo
          </button>
        </div>
      )}
      {feed.isLoading ? (
        <div
          className="flex justify-center p-10"
          role="status"
          aria-label="Loading recommendations"
        >
          <Loader2 className="animate-spin" size={23} />
        </div>
      ) : feed.isError ? (
        <div role="alert" className="rounded-xl border p-5" style={surface}>
          <h3 className="font-bold">Recommendations could not load</h3>
          <p className="mt-2 text-sm" style={muted}>
            {feed.error.message}
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-semibold underline"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onLatest}
              className="font-semibold underline"
            >
              Back to Latest
            </button>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={surface}>
          <h3 className="font-bold">No recommendations right now</h3>
          <p className="mt-2 text-sm" style={muted}>
            Try refreshing later, changing your interests, or returning to
            Latest. Hidden posts stay out until you undo or reset.
          </p>
          <button
            type="button"
            onClick={onLatest}
            className="mt-4 text-sm font-semibold underline"
          >
            Back to Latest
          </button>
        </div>
      ) : (
        <>
          {posts.slice(0, visibleCount).map(post => (
            <div key={post.id} data-recommended-post={post.id}>
              <div
                className="mb-1 flex items-center justify-between gap-2 px-2 text-[11px]"
                style={muted}
              >
                <span>
                  {RECOMMENDATION_REASONS[
                    feed.data?.reasons[post.id] as RecommendationReason
                  ] ?? RECOMMENDATION_REASONS.recent}
                </span>
                <button
                  type="button"
                  onClick={() => hide.mutate({ postId: post.id })}
                  disabled={hide.isPending || unhide.isPending}
                  aria-label={`Not interested in post ${post.id}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1.5 hover:bg-[var(--its-surface-hover)] disabled:opacity-50"
                >
                  <EyeOff size={12} /> Not interested
                </button>
              </div>
              <PostCard
                post={post}
                author={feed.data?.authors[post.authorId]}
                likeCount={feed.data?.likeCounts[post.id] ?? 0}
                commentCount={feed.data?.commentCounts[post.id] ?? 0}
                isLiked={likedSet.has(post.id)}
                onDelete={() => void refresh()}
                authorHasStory={storySet.has(post.authorId)}
              />
            </div>
          ))}
          <div className="py-5 text-center">
            {visibleCount < posts.length ? (
              <button
                type="button"
                onClick={() => setVisibleCount(count => count + 20)}
                className="rounded-lg border px-5 py-2.5 text-sm font-semibold"
                style={surface}
              >
                Show more recommendations
              </button>
            ) : (
              <p className="text-xs" style={muted}>
                You have reached the end of this selection. Refresh for an
                updated selection, or browse Latest.
              </p>
            )}
          </div>
        </>
      )}
      <Dialog
        open={settingsOpen}
        onOpenChange={open => {
          if (!busy) setSettingsOpen(open);
        }}
      >
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
          style={surface}
        >
          <DialogTitle>Your interests & controls</DialogTitle>
          <DialogDescription style={muted}>
            Choose up to 8 interests. These preferences are private and only
            affect For You.
          </DialogDescription>
          <fieldset disabled={busy} className="mt-2">
            <legend className="mb-3 text-sm font-semibold">
              What would you like to see?
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {FEED_INTERESTS.map(interest => (
                <label
                  key={interest.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs leading-snug"
                  style={{
                    ...surface,
                    borderColor: draftInterests.includes(interest.id)
                      ? "var(--its-text-primary)"
                      : "var(--its-border)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draftInterests.includes(interest.id)}
                    disabled={
                      !draftInterests.includes(interest.id) &&
                      draftInterests.length >= 8
                    }
                    onChange={event =>
                      setDraftInterests(items =>
                        event.target.checked
                          ? [...items, interest.id]
                          : items.filter(id => id !== interest.id)
                      )
                    }
                    className="h-4 w-4 shrink-0"
                  />
                  {interest.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div
            className="mt-3 rounded-lg border p-3"
            style={{ borderColor: "var(--its-border)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="learn-from-activity"
                className="text-sm font-semibold"
              >
                Learn from reactions & comments
              </label>
              <Switch
                id="learn-from-activity"
                checked={draftLearning}
                onCheckedChange={setDraftLearning}
                disabled={busy}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={muted}>
              Optional and off by default. If enabled, future positive reactions
              and comments on eligible posts can improve suggestions. Only the
              last 30 days since enabling/reset are considered. No messages,
              calls, search history or outside browsing are used.
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={muted}>
            Public Pages/Groups you already follow help identify topics. Private
            group membership is not used. Not interested hides that post only
            from For You—not from Latest or other members.
          </p>
          <div
            className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
            style={{ borderColor: "var(--its-border)" }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Reset your For You recommendations? This clears chosen interests and hidden recommendations, and turns activity learning off. Your posts, reactions, comments, friendships and follows will not be deleted."
                  )
                )
                  reset.mutate();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <RotateCcw size={13} /> Reset recommendations
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold"
                style={surface}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  save.mutate({
                    interests: draftInterests,
                    learnFromActivity: draftLearning,
                  })
                }
                className="rounded-lg bg-[var(--its-red)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
