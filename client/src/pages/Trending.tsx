import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PostCard from "@/components/PostCard";
import { TrendingUp, Loader2, Flame } from "lucide-react";

const REACTION_EMOJI_MAP: Record<string, string> = {
  like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡",
};

function TrendingBadge({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  const top = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-full">
      <Flame size={10} className="text-orange-500" />
      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
        {total.toLocaleString()} reactions
      </span>
      <span className="text-[10px] text-orange-400">
        {top.map(([t]) => REACTION_EMOJI_MAP[t] ?? t).join("")}
      </span>
    </div>
  );
}

export default function TrendingPage() {
  const { user } = useAuth();

  const { data, isLoading } = trpc.trending.getPosts.useQuery(
    { limit: 20 },
    { staleTime: 5 * 60 * 1000 } // cache for 5 minutes
  );

  const posts = data?.posts ?? [];
  const authors = data?.authors ?? {};
  const reactionCounts = data?.reactionCounts ?? {};

  return (
    <div className="max-w-xl mx-auto px-0 sm:px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 sm:px-0 mb-1">
        <div className="w-1 h-5 bg-orange-500" />
        <TrendingUp size={16} className="text-orange-500" />
        <h1 className="text-sm font-black uppercase tracking-widest">Trending</h1>
        <span className="text-[10px] text-muted-foreground font-medium ml-1">
          Most reacted · last 7 days
        </span>
      </div>

      {/* Subheading */}
      <p className="text-xs text-muted-foreground px-4 sm:px-0 mb-5">
        Posts ranked by total reactions in the past week.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-4">
          <TrendingUp size={40} className="mx-auto mb-4 text-muted-foreground opacity-40" />
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2">Nothing trending yet</h2>
          <p className="text-xs text-muted-foreground">
            React to posts to help them trend. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {posts.map((post, idx) => {
            const author = authors[post.authorId];
            if (!author) return null;
            const counts = (reactionCounts[post.id] ?? {}) as Record<string, number>;
            return (
              <div key={post.id} className="relative">
                {/* Rank badge */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                  {idx === 0 && (
                    <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                      🔥 #1
                    </span>
                  )}
                  {idx > 0 && idx < 3 && (
                    <span className="bg-muted text-muted-foreground text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      #{idx + 1}
                    </span>
                  )}
                  <TrendingBadge counts={counts} />
                </div>
                <PostCard
                  post={post}
                  author={author}
                  likeCount={0}
                  isLiked={false}
                />
              </div>
            );
          })}
        </div>
      )}

      {!user && (
        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          <a href="/" className="text-[var(--its-red)] font-bold hover:underline">Sign in</a> to react and influence what trends.
        </p>
      )}
    </div>
  );
}
