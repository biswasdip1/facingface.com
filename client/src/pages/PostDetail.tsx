import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PostCard from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useMemo } from "react";

export default function PostDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const postId = Number(params.id);

  const { data, isLoading, error } = trpc.posts.getById.useQuery(
    { postId },
    { enabled: !isNaN(postId) && postId > 0 }
  );

  // Fetch liked status for this single post
  const postIds = useMemo(() => (data?.post ? [data.post.id] : []), [data?.post?.id]);
  const { data: likedIds } = trpc.posts.getLikedPostIds.useQuery(
    { postIds },
    { enabled: !!user && postIds.length > 0 }
  );

  const utils = trpc.useUtils();
  const handleDelete = () => {
    navigate("/");
  };

  if (isNaN(postId) || postId <= 0) {
    return <ErrorState message="Invalid post ID." />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" style={{ backgroundColor: "var(--its-bg)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--its-text-muted)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message="Post not found or has been deleted." />;
  }

  const { post, author, likeCount, resharedPost, resharedAuthor } = data;
  const isLiked = likedIds?.includes(post.id) ?? false;

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: "var(--its-bg)", color: "var(--its-text-primary)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-5 text-sm font-medium transition-colors"
          style={{ color: "var(--its-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--its-text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--its-text-muted)")}
        >
          <ArrowLeft size={18} />
          Back to Feed
        </button>

        {/* Post */}
        <PostCard
          post={post as Parameters<typeof PostCard>[0]["post"]}
          author={author ?? undefined}
          likeCount={likeCount}
          isLiked={isLiked}
          onDelete={handleDelete}
          resharedPost={resharedPost as Parameters<typeof PostCard>[0]["resharedPost"]}
          resharedAuthor={resharedAuthor}
        />

        {/* Comment Section */}
        <div
          className="mt-4 rounded-xl border p-4"
          style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}
        >
          <h2 className="font-bold text-sm mb-4" style={{ color: "var(--its-text-primary)" }}>
            Comments
          </h2>
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen pt-16 flex items-center justify-center" style={{ backgroundColor: "var(--its-bg)" }}>
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-30" style={{ color: "var(--its-text-muted)" }} />
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--its-text-primary)" }}>{message}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: "var(--its-text-primary)", color: "var(--its-bg)" }}
        >
          Go to Feed
        </button>
      </div>
    </div>
  );
}
