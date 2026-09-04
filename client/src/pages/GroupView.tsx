import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Globe,
  Settings,
  Camera,
  ChevronLeft,
  Shield,
  UserMinus,
  Loader2,
  AlertTriangle,
  Share2,
} from "lucide-react";
import CreatePost from "@/components/CreatePost";
import InviteModal from "@/components/InviteModal";
import GroupPostCardStandard from "@/components/GroupPostCard";
import { formatDistanceToNow } from "date-fns";

// ─── Minimal group post card ──────────────────────────────────────────────────
function GroupPostCard({
  post,
  author,
  onDelete,
  isAdmin,
}: {
  post: {
    id: number;
    authorId: number;
    content: string | null;
    mediaUrl: string | null;
    mediaType: "photo" | "video" | null;
    photo2Url: string | null;
    photo3Url: string | null;
    audioUrl: string | null;
    audioName: string | null;
    docUrl: string | null;
    docName: string | null;
    docSize: number | null;
    bgColor: string | null;
    linkUrl: string | null;
    linkTitle: string | null;
    linkImage: string | null;
    linkSiteName: string | null;
    createdAt: Date;
  };
  author: { id: number; name: string | null; avatar: string | null; isVerified: boolean } | undefined;
  onDelete?: () => void;
  isAdmin?: boolean;
}) {
  const { user } = useAuth();
  const canDelete = user && (user.id === post.authorId || isAdmin);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href={`/profile/${post.authorId}`}>
            <Avatar className="w-9 h-9 cursor-pointer">
              <AvatarImage src={author?.avatar ?? undefined} />
              <AvatarFallback>{(author?.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${post.authorId}`}>
              <span className="font-semibold text-sm hover:underline cursor-pointer">{author?.name ?? "Unknown"}</span>
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        {canDelete && (
          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={onDelete}>
            <UserMinus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      {post.bgColor ? (
        <div
          className="rounded-lg p-6 text-center text-lg font-semibold mb-3"
          style={{ backgroundColor: post.bgColor, color: "#fff" }}
        >
          {post.content}
        </div>
      ) : post.content ? (
        <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
      ) : null}

      {/* Photo */}
      {post.mediaUrl && post.mediaType === "photo" && (
        <div className={`grid gap-1 mb-3 ${post.photo2Url ? "grid-cols-2" : "grid-cols-1"}`}>
          <img src={post.mediaUrl} alt="" className="rounded-lg w-full object-cover max-h-72" />
          {post.photo2Url && <img src={post.photo2Url} alt="" className="rounded-lg w-full object-cover max-h-72" />}
          {post.photo3Url && <img src={post.photo3Url} alt="" className="rounded-lg w-full object-cover max-h-72 col-span-2" />}
        </div>
      )}

      {/* Video */}
      {post.mediaUrl && post.mediaType === "video" && (
        <video src={post.mediaUrl} controls className="rounded-lg w-full max-h-72 mb-3" />
      )}

      {/* Audio */}
      {post.audioUrl && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-3">
          <span className="text-xs text-muted-foreground">{post.audioName ?? "Audio"}</span>
          <audio src={post.audioUrl} controls className="flex-1 h-8" />
        </div>
      )}

      {/* Document */}
      {post.docUrl && (
        <a
          href={post.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-3 hover:bg-accent transition-colors"
        >
          <span className="text-sm font-medium">{post.docName ?? "Document"}</span>
          {post.docSize && (
            <span className="text-xs text-muted-foreground ml-auto">
              {(post.docSize / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
        </a>
      )}

    </div>
  );
}

// ─── Main GroupView ───────────────────────────────────────────────────────────
export default function GroupView() {
  const [, params] = useRoute("/g/:handle");
  const [, navigate] = useLocation();
  const handle = params?.handle ?? "";
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; description: string; category: string; visibility: "public" | "private" }>({ name: "", description: "", category: "", visibility: "public" });
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: group, isLoading: groupLoading } = trpc.publicGroups.getByHandle.useQuery(
    { handle },
    { enabled: !!handle }
  );
  const { data: postsData, isLoading: postsLoading } = trpc.publicGroups.getPosts.useQuery(
    { handle, limit: 30 },
    { enabled: !!handle && !!group?.canViewContent }
  );
  const { data: members = [] } = trpc.publicGroups.getMembers.useQuery(
    { handle, limit: 50 },
    { enabled: !!handle && (group?.visibility !== "private" || !!group?.isMember) }
  );
  const { data: joinRequests, refetch: refetchJoinRequests } = trpc.publicGroups.getJoinRequests.useQuery(
    { handle },
    { enabled: !!handle && !!group?.isAdmin && group?.visibility === "private" }
  );

  // Old Groups created with a pasted URL are retained, but immediately move to
  // their safe canonical address. Their members and posts stay unchanged.
  useEffect(() => {
    if (group?.canonicalHandle && group.canonicalHandle !== handle) {
      navigate(`/g/${group.canonicalHandle}`, { replace: true });
    }
  }, [group?.canonicalHandle, handle, navigate]);

  const joinMutation = trpc.publicGroups.join.useMutation({
    onSuccess: (result) => {
      utils.publicGroups.getByHandle.invalidate({ handle });
      toast.success(result.status === "pending" ? "Join request sent to Group admins." : "You joined the group!");
    },
    onError: (err) => toast.error(err.message),
  });

  const leaveMutation = trpc.publicGroups.leave.useMutation({
    onSuccess: () => {
      utils.publicGroups.getByHandle.invalidate({ handle });
      toast.success("You left the group.");
    },
    onError: (err) => toast.error(err.message),
  });

  const reviewJoinRequestMutation = trpc.publicGroups.reviewJoinRequest.useMutation({
    onSuccess: () => {
      refetchJoinRequests();
      utils.publicGroups.getByHandle.invalidate({ handle });
      utils.publicGroups.getMembers.invalidate({ handle });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.publicGroups.update.useMutation({
    onSuccess: () => {
      utils.publicGroups.getByHandle.invalidate({ handle });
      setEditOpen(false);
      toast.success("Group updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const setRoleMutation = trpc.publicGroups.setMemberRole.useMutation({
    onSuccess: () => {
      utils.publicGroups.getMembers.invalidate({ handle });
      toast.success("Role updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = trpc.publicGroups.removeMember.useMutation({
    onSuccess: () => {
      utils.publicGroups.getMembers.invalidate({ handle });
      utils.publicGroups.getByHandle.invalidate({ handle });
      toast.success("Member removed.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePostMutation = trpc.publicGroups.deletePost.useMutation({
    onSuccess: () => {
      utils.publicGroups.getPosts.invalidate({ handle });
      toast.success("Post deleted.");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadCoverMutation = trpc.publicGroups.uploadCover.useMutation({
    onSuccess: () => {
      utils.publicGroups.getByHandle.invalidate({ handle });
      toast.success("Cover photo updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately so a failed upload can be retried with the same file.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }

    setCoverUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1];
      if (!base64) throw new Error("Could not read the selected image.");
      await uploadCoverMutation.mutateAsync({ handle, base64, mimeType: file.type });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cover photo upload failed.");
    } finally {
      setCoverUploading(false);
    }
  };

  if (groupLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-xl font-semibold">Group not found</h2>
        <p className="text-muted-foreground mt-1">This group doesn't exist or has been removed.</p>
        <Link href="/g">
          <Button variant="outline" className="mt-4">Browse Groups</Button>
        </Link>
      </div>
    );
  }

  const posts = postsData?.posts ?? [];
  const authors = postsData?.authors ?? {};
  const commentCounts: Record<number, number> = postsData?.commentCounts ?? {};
  const isAdmin = group.isAdmin;
  const isMember = group.isMember;
  const isSuspended = !!(group as { isSuspended?: boolean }).isSuspended;
  const suspendReason = (group as { suspendReason?: string | null }).suspendReason;

  const admins = members.filter((m) => m.role === "admin");
  const moderators = members.filter((m) => m.role === "moderator");
  const regularMembers = members.filter((m) => m.role === "member");

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10">
      {/* Back link */}
      <div className="py-3">
        <Link href="/g">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Build your Public Group
          </button>
        </Link>
      </div>

      {/* Suspended banner */}
      {isSuspended && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-600 dark:text-red-400">This group has been suspended by an administrator.</p>
            {suspendReason && (
              <p className="text-sm text-red-500/80 mt-0.5">Reason: {suspendReason}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">Posting, joining, and other interactions are disabled while this group is suspended.</p>
          </div>
        </div>
      )}

      {/* Cover photo */}
      <div className="relative rounded-xl overflow-hidden h-52 bg-gradient-to-br from-primary/30 to-primary/10 mb-0">
        {group.coverPhoto ? (
          <img src={group.coverPhoto} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Users className="w-16 h-16 text-primary/30" />
          </div>
        )}
        {isAdmin && (
          <>
            <button
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
            >
              {coverUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              {coverUploading ? "Uploading…" : "Change Cover"}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </>
        )}
      </div>

      {/* Group header */}
      <div className="bg-card border border-border border-t-0 rounded-b-xl px-6 pt-4 pb-5 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
              <Globe className="w-4 h-4" />
              <span>{group.visibility === "private" ? "Private Group" : "Public Group"}</span>
              <span>·</span>
              <Users className="w-4 h-4" />
              <span>{group.memberCount.toLocaleString()} member{group.memberCount !== 1 ? "s" : ""}</span>
              {group.category && (
                <>
                  <span>·</span>
                  <Badge variant="secondary" className="text-xs">{group.category}</Badge>
                </>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isMember && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowInviteModal(true)}
              >
                <Share2 className="w-4 h-4" />
                Invite
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditForm({ name: group.name, description: group.description ?? "", category: group.category ?? "", visibility: group.visibility === "private" ? "private" : "public" });
                  setEditOpen(true);
                }}
              >
                <Settings className="w-4 h-4" />
                Edit Group
              </Button>
            )}
            {user && !isMember && !isSuspended && (
              group.membershipStatus === "pending" ? (
                <Button size="sm" variant="outline" disabled>Request Pending</Button>
              ) : (
                <Button size="sm" onClick={() => joinMutation.mutate({ handle })} disabled={joinMutation.isPending}>
                  {joinMutation.isPending ? "Sending…" : group.visibility === "private" ? "Request to Join" : "+ Join Group"}
                </Button>
              )
            )}
            {user && isMember && !isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => leaveMutation.mutate({ handle })}
                disabled={leaveMutation.isPending}
              >
                {leaveMutation.isPending ? "Leaving…" : "Leave Group"}
              </Button>
            )}
            {!user && !isSuspended && (
              <Link href="/login">
                <Button size="sm">Join Group</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Posts */}
        <div className="lg:col-span-2 space-y-4">
          {/* Post composer — members only */}
          {user && isMember && !isSuspended && (
            <CreatePost
              groupHandle={handle}
              groupName={group.name}
              groupCover={group.coverPhoto ?? null}
              onSuccess={() => utils.publicGroups.getPosts.invalidate({ handle })}
            />
          )}
          {isSuspended && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center text-sm text-red-500/80">
              This group is suspended. Posting is currently disabled.
            </div>
          )}
          {!isSuspended && !user && (
            <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link> or{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">sign up</Link> and join this group to post.
            </div>
          )}
          {!isSuspended && user && !isMember && (
            <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
              {group.visibility === "private" ? (group.membershipStatus === "pending" ? "Your join request is waiting for Group approval." : "This Group is private. Request to join to see posts and interact with members.") : "Join this group to post and interact with members."}
            </div>
          )}

          {/* Posts feed */}
          {!group.canViewContent ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">This Group is private</p>
              <p className="text-sm text-muted-foreground mt-1">Posts and member details are visible only after a Group admin approves the join request.</p>
            </div>
          ) : postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => (
              <GroupPostCardStandard
                key={post.id}
                groupHandle={handle}
                post={post}
                author={authors[post.authorId]}
                canModerate={isAdmin || user?.id === post.authorId}
                initialCommentCount={commentCounts[post.id] ?? 0}
                onDelete={() => deletePostMutation.mutate({ handle, postId: post.id })}
              />
            ))
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* About */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-2">About</h3>
            {group.description ? (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description yet.</p>
            )}
            <Separator className="my-3" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span>{group.visibility === "private" ? "Private — approved members can see posts" : "Public — anyone can see posts"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{group.memberCount.toLocaleString()} member{group.memberCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="bg-card border border-border rounded-xl p-4">
            <Tabs defaultValue="members">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="members" className="flex-1 text-xs">Members ({members.length})</TabsTrigger>
                {isAdmin && <TabsTrigger value="manage" className="flex-1 text-xs">Manage</TabsTrigger>}
                {isAdmin && group.visibility === "private" && <TabsTrigger value="requests" className="flex-1 text-xs">Requests ({joinRequests?.length ?? 0})</TabsTrigger>}
              </TabsList>

              <TabsContent value="members" className="space-y-2 max-h-80 overflow-y-auto">
                {admins.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Link href={`/profile/${m.userId}`}>
                      <Avatar className="w-8 h-8 cursor-pointer">
                        <AvatarImage src={m.user?.avatar ?? undefined} />
                        <AvatarFallback>{(m.user?.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user?.name ?? "Unknown"}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">Admin</Badge>
                  </div>
                ))}
                {moderators.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Link href={`/profile/${m.userId}`}>
                      <Avatar className="w-8 h-8 cursor-pointer">
                        <AvatarImage src={m.user?.avatar ?? undefined} />
                        <AvatarFallback>{(m.user?.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user?.name ?? "Unknown"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">Mod</Badge>
                  </div>
                ))}
                {regularMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Link href={`/profile/${m.userId}`}>
                      <Avatar className="w-8 h-8 cursor-pointer">
                        <AvatarImage src={m.user?.avatar ?? undefined} />
                        <AvatarFallback>{(m.user?.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user?.name ?? "Unknown"}</p>
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No members yet.</p>
                )}
              </TabsContent>

              {isAdmin && group.visibility === "private" && (
                <TabsContent value="requests" className="space-y-2 max-h-80 overflow-y-auto">
                {(joinRequests ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No pending requests.</p> : joinRequests?.map((request) => <div key={request.id} className="flex items-center justify-between gap-2"><span className="text-xs truncate">{request.user?.name ?? "Member"}</span><div className="flex gap-1"><Button size="sm" className="h-7 text-xs" onClick={() => reviewJoinRequestMutation.mutate({ handle, userId: request.userId, approve: true })}>Approve</Button><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reviewJoinRequestMutation.mutate({ handle, userId: request.userId, approve: false })}>Decline</Button></div></div>)}
              </TabsContent>
              )}

              {isAdmin && (
              <TabsContent value="manage" className="space-y-3 max-h-80 overflow-y-auto">
                  {members.filter((m) => m.userId !== user?.id).map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={m.user?.avatar ?? undefined} />
                        <AvatarFallback>{(m.user?.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.user?.name ?? "Unknown"}</p>
                      </div>
                      <Select
                        value={m.role}
                        onValueChange={(role) =>
                          setRoleMutation.mutate({ handle, userId: m.userId, role: role as "admin" | "moderator" | "member" })
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Mod</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-destructive"
                        onClick={() => removeMemberMutation.mutate({ handle, userId: m.userId })}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {members.filter((m) => m.userId !== user?.id).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No other members to manage.</p>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit group dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Group Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {["Technology","Sports","Music","Art & Culture","Business","Education","Health & Wellness","Food & Drink","Travel","Gaming","Science","Politics","Community","Other"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button type="button" variant={editForm.visibility === "public" ? "default" : "outline"} onClick={() => setEditForm((f) => ({ ...f, visibility: "public" }))}>Public</Button>
                <Button type="button" variant={editForm.visibility === "private" ? "default" : "outline"} onClick={() => setEditForm((f) => ({ ...f, visibility: "private" }))}>Private</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Private Groups require an admin or moderator to approve join requests before members can see posts.</p>
            </div>
            <Button
              className="w-full"
              onClick={() => updateMutation.mutate({ handle, ...editForm })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          type="group"
          targetId={group.id}
          targetName={group.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
