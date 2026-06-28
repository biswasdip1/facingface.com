import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PostCard from "@/components/PostCard";
import { Bookmark, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function SavedPage() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const { data, isLoading, isFetching } = trpc.bookmarks.getSaved.useQuery(
    { limit: LIMIT, offset },
    { enabled: !!user }
  );

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Bookmark size={40} className="mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-bold mb-2">Sign in to see your saved posts</h2>
        <p className="text-sm text-muted-foreground">Log in to access your bookmarks.</p>
      </div>
    );
  }

  const posts = data?.posts ?? [];
  const authors = data?.authors ?? {};
  const likeCounts = data?.likeCounts ?? {};

  return (
    <div className="max-w-xl mx-auto px-0 sm:px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 sm:px-0 mb-6">
        <div className="w-1 h-5 bg-[var(--its-red)]" />
        <Bookmark size={16} className="text-[var(--its-red)]" />
        <h1 className="text-sm font-black uppercase tracking-widest">Saved Posts</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Bookmark size={40} className="mx-auto mb-4 text-muted-foreground opacity-40" />
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2">No saved posts yet</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Tap the <strong>Save</strong> button on any post to bookmark it here.
          </p>
          <Link href="/" className="text-xs font-bold text-[var(--its-red)] hover:underline uppercase tracking-widest">
            Browse Feed →
          </Link>
        </div>
      ) : (
        <div className="space-y-0">
          {posts.map((post) => {
            const author = authors[post.authorId];
            if (!author) return null;
            return (
              <PostCard
                key={post.id}
                post={post}
                author={author}
                likeCount={likeCounts[post.id] ?? 0}
                isLiked={false}
              />
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-border mt-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              disabled={offset === 0 || isFetching}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              ← Newer
            </button>
            <span className="text-xs text-muted-foreground">
              {offset + 1}–{offset + posts.length}
            </span>
            <button
              onClick={() => setOffset((o) => o + LIMIT)}
              disabled={posts.length < LIMIT || isFetching}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Older →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
