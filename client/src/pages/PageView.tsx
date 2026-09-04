import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe, MapPin, Users, Building2, Settings2, UserPlus, UserMinus,
  Pencil, Camera, ArrowLeft, Upload, UserCog, Trash2, Crown, AlertTriangle
} from "lucide-react";
import { Link } from "wouter";

export default function PageView() {
  const [, params] = useRoute("/p/:handle");
  const handle = params?.handle ?? "";
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [editForm, setEditForm] = useState<{
    name?: string; description?: string; category?: string;
    website?: string; location?: string;
  }>({});
  const [addAdminQuery, setAddAdminQuery] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: page, isLoading } = trpc.pages.getByHandle.useQuery(
    { handle },
    { enabled: !!handle }
  );

  const { data: postsData } = trpc.pages.getPosts.useQuery(
    { handle },
    { enabled: !!handle }
  );

  const { data: admins, refetch: refetchAdmins } = trpc.pages.getAdmins.useQuery(
    { handle },
    { enabled: !!handle && !!(page?.isAdmin) }
  );

  const { data: searchResults } = trpc.users.search.useQuery(
    { query: addAdminQuery },
    { enabled: addAdminQuery.trim().length >= 2 }
  );

  const followMutation = trpc.pages.follow.useMutation({
    onSuccess: () => {
      utils.pages.getByHandle.invalidate({ handle });
      toast.success(`You are now following ${page?.name}`);
    },
  });

  const unfollowMutation = trpc.pages.unfollow.useMutation({
    onSuccess: () => {
      utils.pages.getByHandle.invalidate({ handle });
      toast.success(`Unfollowed ${page?.name}`);
    },
  });

  const updateMutation = trpc.pages.update.useMutation({
    onSuccess: () => {
      utils.pages.getByHandle.invalidate({ handle });
      setEditOpen(false);
      toast.success("Page updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const createPostMutation = trpc.pages.createPost.useMutation({
    onSuccess: () => {
      utils.pages.getPosts.invalidate({ handle });
      setPostText("");
      toast.success("Post published!");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadLogoMutation = trpc.pages.uploadLogo.useMutation({
    onSuccess: () => {
      utils.pages.getByHandle.invalidate({ handle });
      toast.success("Logo updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadCoverMutation = trpc.pages.uploadCover.useMutation({
    onSuccess: () => {
      utils.pages.getByHandle.invalidate({ handle });
      toast.success("Cover photo updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const addAdminMutation = trpc.pages.addAdmin.useMutation({
    onSuccess: () => {
      refetchAdmins();
      setAddAdminQuery("");
      toast.success("Admin added!");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeAdminMutation = trpc.pages.removeAdmin.useMutation({
    onSuccess: () => {
      refetchAdmins();
      toast.success("Admin removed.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileUpload = (file: File, type: "logo" | "cover") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast.error("Could not read the selected image.");
    reader.onload = (event) => {
      const base64 = String(event.target?.result ?? "").split(",")[1];
      if (!base64) {
        toast.error("Could not read the selected image.");
        return;
      }
      if (type === "logo") {
        uploadLogoMutation.mutate({ handle, base64, mimeType: file.type });
      } else {
        uploadCoverMutation.mutate({ handle, base64, mimeType: file.type });
      }
    };
    reader.readAsDataURL(file);
  };

  const openEdit = () => {
    if (!page) return;
    setEditForm({
      name: page.name,
      description: page.description ?? "",
      category: page.category ?? "",
      website: page.website ?? "",
      location: page.location ?? "",
    });
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-48 rounded-xl bg-muted animate-pulse mb-4" />
        <div className="h-6 w-48 bg-muted animate-pulse rounded mb-2" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Page not found</p>
        <Link href="/p">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Build your page
          </Button>
        </Link>
      </div>
    );
  }

  const posts = postsData?.posts ?? [];

  const isSuspended = !!(page as { isSuspended?: boolean }).isSuspended;
  const suspendReason = (page as { suspendReason?: string | null }).suspendReason;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Suspended banner */}
      {isSuspended && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-600 dark:text-red-400">This page has been suspended by an administrator.</p>
            {suspendReason && (
              <p className="text-sm text-red-500/80 mt-0.5">Reason: {suspendReason}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">Posting, following, and other interactions are disabled while this page is suspended.</p>
          </div>
        </div>
      )}
      {/* Back link */}
      <Link href="/p">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Build your page
        </button>
      </Link>

      {/* Cover photo */}
      <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-br from-red-500 to-red-700 mb-0">
        {page.coverPhoto && (
          <img src={page.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        )}
        {page.isAdmin && (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadCoverMutation.isPending}
              className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              {uploadCoverMutation.isPending ? "Uploading…" : "Change Cover"}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "cover"); }}
            />
          </>
        )}
      </div>

      {/* Page header */}
      <div className="bg-card border border-border rounded-xl -mt-6 mx-4 p-5 shadow-sm mb-5">
        <div className="flex items-start gap-4">
          {/* Logo with upload */}
          <div className="relative -mt-12 shrink-0 group">
            <Avatar className="w-20 h-20 border-4 border-background shadow-md">
              <AvatarImage src={page.logo ?? undefined} />
              <AvatarFallback className="bg-red-600 text-white text-2xl font-bold">
                {page.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {page.isAdmin && (
              <>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadLogoMutation.isPending}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Upload className="w-5 h-5 text-white" />
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "logo"); }}
                />
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-foreground">{page.name}</h1>
                <p className="text-sm text-muted-foreground">@{page.handle}</p>
              </div>
              <div className="flex items-center gap-2">
                {page.isAdmin && (
                  <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" /> Edit Page
                  </Button>
                )}
                {user && !page.isAdmin && !isSuspended && (
                  page.following ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unfollowMutation.mutate({ handle })}
                      disabled={unfollowMutation.isPending}
                      className="gap-1.5"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Unfollow
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => followMutation.mutate({ handle })}
                      disabled={followMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Follow
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {page.category && <Badge variant="secondary">{page.category}</Badge>}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {page.followerCount ?? 0} followers
              </span>
              {page.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {page.location}
                </span>
              )}
              {page.website && (
                <a
                  href={page.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-red-600 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" /> {page.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {page.description && (
              <p className="mt-2 text-sm text-foreground/80">{page.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="md:col-span-2 space-y-4">
          {/* Post composer (admin only) — full CreatePost with all media types */}
          {page.isAdmin && !isSuspended && (
            <CreatePost
              pageHandle={handle}
              pageAvatar={page.logo}
              pageName={page.name}
              onSuccess={() => utils.pages.getPosts.invalidate({ handle })}
            />
          )}

          {/* Posts list */}
          {posts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Pencil className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No posts yet</p>
              {page.isAdmin && <p className="text-xs mt-1">Use the composer above to share your first update</p>}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                author={{
                  // Page posts keep the publishing account for permissions while
                  // presenting the Page identity consistently in its own timeline.
                  id: post.authorId,
                  name: page.name,
                  avatar: page.logo ?? null,
                  isVerified: false,
                }}
                // The standard card fetches its own durable emoji reactions and
                // comments. Legacy Page rows do not include denormalised counts.
                likeCount={0}
                commentCount={0}
                isLiked={false}
              />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* About card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-600" /> About
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {page.description && <p className="text-foreground/80">{page.description}</p>}
              {page.category && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{page.category}</Badge>
                </div>
              )}
              {page.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {page.location}
                </div>
              )}
              {page.website && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <a href={page.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline truncate">
                    {page.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              <Separator />
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span><strong className="text-foreground">{page.followerCount ?? 0}</strong> followers</span>
              </div>
              <div className="text-xs">
                Created {new Date(page.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Admin management card (owner only) */}
          {user && page.ownerId === user.id && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-red-600" /> Page Admins
              </h3>
              {/* Current admins list */}
              <div className="space-y-2 mb-3">
                {(admins ?? []).map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {admin.avatar ? (
                        <img src={admin.avatar} alt={admin.name ?? ""} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {(admin.name ?? "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium truncate">{admin.name}</span>
                      {admin.id === page.ownerId && (
                        <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    {admin.id !== page.ownerId && (
                      <button
                        onClick={() => removeAdminMutation.mutate({ handle, userId: admin.id })}
                        disabled={removeAdminMutation.isPending}
                        className="text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Add admin search */}
              <div className="space-y-1.5">
                <Label className="text-xs">Add admin by name</Label>
                <Input
                  placeholder="Search members…"
                  value={addAdminQuery}
                  onChange={(e) => setAddAdminQuery(e.target.value)}
                  className="h-8 text-xs"
                />
                {addAdminQuery.trim().length >= 2 && searchResults && searchResults.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    {searchResults.slice(0, 5).map((u) => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors text-xs"
                        onClick={() => addAdminMutation.mutate({ handle, userId: u.id })}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name ?? ""} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-[10px]">
                            {(u.name ?? "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">{u.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Page Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-red-600" /> Edit Page
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="info">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
              <TabsTrigger value="media" className="flex-1">Logo & Cover</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Page name</Label>
                <Input
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editForm.description ?? ""}
                  onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input
                    value={editForm.category ?? ""}
                    onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    value={editForm.location ?? ""}
                    onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={editForm.website ?? ""}
                  onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ handle, ...editForm })}
                >
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-5">
              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Page Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-border">
                    <AvatarImage src={page.logo ?? undefined} />
                    <AvatarFallback className="bg-red-600 text-white text-xl font-bold">
                      {page.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={uploadLogoMutation.isPending}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadLogoMutation.isPending ? "Uploading…" : "Upload Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Cover upload */}
              <div className="space-y-2">
                <Label>Cover Photo</Label>
                <div
                  className="relative h-28 rounded-lg overflow-hidden bg-gradient-to-br from-red-500 to-red-700 cursor-pointer group"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {page.coverPhoto && (
                    <img src={page.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="text-white text-xs flex items-center gap-1.5">
                      <Camera className="w-4 h-4" />
                      {uploadCoverMutation.isPending ? "Uploading…" : "Change Cover"}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Recommended: 1200×400px. JPG or PNG.</p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
