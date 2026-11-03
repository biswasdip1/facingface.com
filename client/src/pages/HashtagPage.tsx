import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import PostCard from "@/components/PostCard";
import { Hash, ArrowLeft } from "lucide-react";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { data, isLoading } = trpc.posts.byHashtag.useQuery({ tag: tag ?? "" }, { enabled: !!tag });

  const posts = data?.posts ?? [];
  const authors = data?.authors ?? {};
  const likeCounts = data?.likeCounts ?? {};

  const postIds = posts.map((p) => p.id);
  const { data: likedData } = trpc.posts.getLikedPostIds.useQuery(
    { postIds },
    { enabled: postIds.length > 0 }
  );
  const likedIds = new Set(likedData ?? []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[var(--its-red)] flex items-center justify-center">
            <Hash size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">#{tag}</h1>
            <p className="text-xs text-muted-foreground">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <Hash size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">No posts with #{tag} yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to use this hashtag!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={authors[post.authorId]}
              likeCount={likeCounts[post.id] ?? 0}
              isLiked={likedIds.has(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
