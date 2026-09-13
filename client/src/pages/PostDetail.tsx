import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PostCard from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";
import { ArrowLeft, AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo } from "react";

type FocusedMediaData = {
  author: Parameters<typeof PostCard>[0]["author"] | null;
  likeCount: number;
  commentCount: number;
  resharedAuthor: Parameters<typeof PostCard>[0]["resharedAuthor"];
};

export default function PostDetail() {
  const params = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const postId = Number(params.id);

  const { data, isLoading, error } = trpc.posts.getById.useQuery(
    { postId },
    { enabled: !isNaN(postId) && postId > 0 }
  );

  // A media query is added only when a photo/video on the wall is clicked.
  // The ordinary /post/:id link remains a conventional post detail page.
  const requestedMediaIndex = useMemo(() => {
    const query = location.split("?")[1] ?? "";
    const value = new URLSearchParams(query).get("media");
    if (value === null || !/^\d+$/.test(value)) return null;
    return Number(value);
  }, [location]);

  const postIds = useMemo(() => (data?.post ? [data.post.id] : []), [data?.post?.id]);
  const { data: likedIds } = trpc.posts.getLikedPostIds.useQuery(
    { postIds },
    { enabled: !!user && postIds.length > 0 }
  );

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

  const { post, author, likeCount, commentCount, resharedPost, resharedAuthor } = data;
  const isLiked = likedIds?.includes(post.id) ?? false;
  const typedPost = post as Parameters<typeof PostCard>[0]["post"];
  const typedResharedPost = resharedPost as Parameters<typeof PostCard>[0]["resharedPost"];
  const hasFocusedMedia = requestedMediaIndex !== null && (
    (post.mediaType === "image" && Boolean(post.mediaUrl)) ||
    (post.mediaType === "video" && Boolean(post.mediaUrl))
  );

  if (hasFocusedMedia) {
    return (
      <FocusedMediaPostView
        data={data as FocusedMediaData}
        post={typedPost}
        resharedPost={typedResharedPost}
        isLiked={isLiked}
        requestedMediaIndex={requestedMediaIndex ?? 0}
        onClose={() => navigate(`/post/${post.id}`)}
        onDelete={() => navigate("/")}
        onSelectPhoto={(mediaIndex) => navigate(`/post/${post.id}?media=${mediaIndex}`)}
      />
    );
  }

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: "var(--its-bg)", color: "var(--its-text-primary)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-5 text-sm font-medium transition-colors"
          style={{ color: "var(--its-text-muted)" }}
          onMouseEnter={(event) => (event.currentTarget.style.color = "var(--its-text-primary)")}
          onMouseLeave={(event) => (event.currentTarget.style.color = "var(--its-text-muted)")}
        >
          <ArrowLeft size={18} />
          Back to Feed
        </button>

        <PostCard
          post={typedPost}
          author={author ?? undefined}
          likeCount={likeCount}
          commentCount={commentCount}
          isLiked={isLiked}
          onDelete={() => navigate("/")}
          resharedPost={typedResharedPost}
          resharedAuthor={resharedAuthor}
        />

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

function FocusedMediaPostView({
  data,
  post,
  resharedPost,
  isLiked,
  requestedMediaIndex,
  onClose,
  onDelete,
  onSelectPhoto,
}: {
  data: FocusedMediaData;
  post: Parameters<typeof PostCard>[0]["post"];
  resharedPost: Parameters<typeof PostCard>[0]["resharedPost"];
  isLiked: boolean;
  requestedMediaIndex: number;
  onClose: () => void;
  onDelete: () => void;
  onSelectPhoto: (mediaIndex: number) => void;
}) {
  const { author, likeCount, commentCount, resharedAuthor } = data;
  const photos = [post.mediaUrl, post.photo2Url, post.photo3Url].filter(Boolean) as string[];
  const captions = [post.photo1Caption, post.photo2Caption, post.photo3Caption];
  const altTexts = [post.photo1Alt, post.photo2Alt, post.photo3Alt];
  const photoIndex = Math.min(Math.max(0, requestedMediaIndex), Math.max(0, photos.length - 1));
  const currentPhoto = photos[photoIndex];
  const isPhotoPost = post.mediaType === "image" && Boolean(currentPhoto);

  const previousPhoto = () => onSelectPhoto((photoIndex - 1 + photos.length) % photos.length);
  const nextPhoto = () => onSelectPhoto((photoIndex + 1) % photos.length);

  return (
    <main className="min-h-screen pt-16 bg-black" aria-label="Focused media post">
      <div className="fixed top-20 left-3 z-50">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close focused post view"
        >
          <X size={18} />
          Close
        </button>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] flex-col bg-black lg:flex-row">
        <section className="relative flex min-h-[48vh] flex-1 items-center justify-center bg-black px-3 pb-4 pt-14 lg:min-h-[calc(100vh-4rem)] lg:px-8 lg:py-10">
          {isPhotoPost ? (
            <>
              <img
                src={currentPhoto}
                alt={altTexts[photoIndex] ?? captions[photoIndex] ?? `Photo ${photoIndex + 1}`}
                className="max-h-[64vh] max-w-full select-none object-contain shadow-2xl lg:max-h-[calc(100vh-9rem)]"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={previousPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/65 p-3 text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/65 p-3 text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Next photo"
                  >
                    <ChevronRight size={24} />
                  </button>
                  <div className="absolute bottom-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                    {photoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
              {captions[photoIndex] && (
                <p className="absolute bottom-5 left-1/2 max-w-[85%] -translate-x-1/2 rounded bg-black/65 px-3 py-2 text-center text-sm text-white">
                  {captions[photoIndex]}
                </p>
              )}
            </>
          ) : (
            <video
              src={post.mediaUrl ?? undefined}
              poster={post.videoPosterUrl ?? undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[64vh] max-w-full shadow-2xl lg:max-h-[calc(100vh-9rem)]"
              style={{ background: "#000" }}
            />
          )}
        </section>

        <aside className="w-full bg-background text-foreground lg:w-[460px] lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="px-4 py-2 sm:px-5">
            <PostCard
              post={post}
              author={author ?? undefined}
              likeCount={likeCount}
              commentCount={commentCount}
              isLiked={isLiked}
              onDelete={onDelete}
              resharedPost={resharedPost}
              resharedAuthor={resharedAuthor}
              hideMedia
              initialCommentsOpen
            />
          </div>
        </aside>
      </div>
    </main>
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
