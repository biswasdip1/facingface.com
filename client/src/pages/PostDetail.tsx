import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PostCard from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";
import { ArrowLeft, AlertCircle, ChevronLeft, ChevronRight, RotateCcw, Tag, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type FocusedMediaData = {
  author: Parameters<typeof PostCard>[0]["author"] | null;
  likeCount: number;
  commentCount: number;
  resharedAuthor: Parameters<typeof PostCard>[0]["resharedAuthor"];
};

type TaggedPerson = { id: number; name: string };

function parseTaggedPeople(value: string | null | undefined): TaggedPerson[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((person): person is TaggedPerson => (
      typeof person === "object" && person !== null &&
      typeof (person as TaggedPerson).id === "number" &&
      typeof (person as TaggedPerson).name === "string"
    ));
  } catch {
    return [];
  }
}

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
  const taggedPeople = parseTaggedPeople(post.taggedPeople);
  const [zoom, setZoom] = useState(1);
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    setZoom(1);
  }, [currentPhoto]);

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
        <section className="relative flex min-h-[48vh] flex-1 items-center justify-center overflow-hidden bg-black px-3 pb-4 pt-14 lg:min-h-[calc(100vh-4rem)] lg:px-8 lg:py-10">
          {isPhotoPost && (
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTags((current) => !current)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-white shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white ${showTags ? "border-white bg-white/25" : "border-white/30 bg-black/70 hover:bg-black"}`}
                  aria-label="View people tagged in this post"
                  aria-expanded={showTags}
                  title="Tagged people"
                >
                  <Tag size={19} />
                </button>
                {showTags && (
                  <div className="absolute right-0 top-12 w-60 rounded-lg border border-white/15 bg-black/90 p-3 text-sm text-white shadow-2xl">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/70">Tagged people</p>
                    {taggedPeople.length > 0 ? (
                      <div className="space-y-1">
                        {taggedPeople.map((person) => (
                          <Link key={person.id} href={`/profile/${person.id}`} className="block rounded px-2 py-1.5 font-semibold text-white no-underline transition-colors hover:bg-white/15 hover:underline">
                            {person.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-white/75">No people have been tagged in this post.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex overflow-hidden rounded-full border border-white/30 bg-black/70 shadow-lg">
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))))}
                  disabled={zoom <= 1}
                  className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}
                  disabled={zoom >= 3}
                  className="flex h-10 w-10 items-center justify-center border-l border-white/20 text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  disabled={zoom === 1}
                  className="flex h-10 w-10 items-center justify-center border-l border-white/20 text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-label="Reset photo zoom"
                  title="Reset zoom"
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <span className="sr-only" aria-live="polite">Photo zoom {Math.round(zoom * 100)} percent</span>
            </div>
          )}
          {isPhotoPost ? (
            <>
              <img
                src={currentPhoto}
                alt={altTexts[photoIndex] ?? captions[photoIndex] ?? `Photo ${photoIndex + 1}`}
                className="max-h-[64vh] max-w-full select-none object-contain shadow-2xl lg:max-h-[calc(100vh-9rem)]"
                style={{ transform: `scale(${zoom})`, transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)" }}
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
