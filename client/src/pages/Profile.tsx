import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
import { Loader2, Edit2, Camera, X, Check, UserPlus, UserCheck, Clock, MessageCircle, Fingerprint, Plus, Star, Trash2, Images, BadgeCheck, Bookmark, Play, ShieldOff, Shield, Menu, Share2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import PostCard from "@/components/PostCard";
import ImageLightbox from "@/components/ImageLightbox";
import InviteModal from "@/components/InviteModal";

const BIRTH_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const formatBirthDayMonth = (day?: number | null, month?: number | null) => {
  if (!day || !month) return "";
  return `${day} ${BIRTH_MONTHS[month - 1]}`;
};

export default function Profile() {
  const { user: currentUser } = useAuth();
  const params = useParams<{ id?: string }>();
  const utils = trpc.useUtils();

  const targetId = params.id ? parseInt(params.id, 10) : currentUser?.id;
  const isOwnProfile = targetId === currentUser?.id;
  const [, navigate] = useLocation();

  const [editing, setEditing] = useState(false);
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const [profileActionMenuOpen, setProfileActionMenuOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  // Swipe-to-dismiss state for lightboxes
  const swipeTouchStartY = useRef<number>(0);
  const swipeDeltaY = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  // Profile completion nudge dismiss (persisted in localStorage)
  const NUDGE_KEY = `ff_nudge_dismissed_${targetId}`;
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try { return localStorage.getItem(NUDGE_KEY) === "1"; } catch { return false; }
  });
  const dismissNudge = () => {
    try { localStorage.setItem(NUDGE_KEY, "1"); } catch { /* ignore */ }
    setNudgeDismissed(true);
  };
  // Cover crop tool state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropPosition, setCropPosition] = useState({ y: 50 }); // percent
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  // Avatar crop state
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [avatarCropOffset, setAvatarCropOffset] = useState({ x: 50, y: 50 }); // percent
  const [isDraggingAvatarCrop, setIsDraggingAvatarCrop] = useState(false);
  const avatarCropDragStart = useRef<{ clientX: number; clientY: number; ox: number; oy: number } | null>(null);
  const cropDragStartY = useRef<number>(0);
  const cropDragStartPos = useRef<number>(50);

  // Friend request state
  const { data: friendStatus } = trpc.friends.status.useQuery(
    { otherUserId: targetId! },
    { enabled: !!targetId && !isOwnProfile }
  );
  const sendFriendRequest = trpc.friends.sendRequest.useMutation({
    onSuccess: () => {
      utils.friends.status.invalidate({ otherUserId: targetId! });
      utils.friends.pendingCount.invalidate();
      toast.success("Friend request sent!");
    },
    onError: (e) => toast.error(e.message),
  });
  const cancelFriendRequest = trpc.friends.cancelRequest.useMutation({
    onSuccess: () => {
      utils.friends.status.invalidate({ otherUserId: targetId! });
      utils.friends.pendingCount.invalidate();
      toast.success("Request cancelled.");
    },
    onError: (e) => toast.error(e.message),
  });
  const respondFriendRequest = trpc.friends.respond.useMutation({
    onSuccess: (_data, vars) => {
      utils.friends.status.invalidate({ otherUserId: targetId! });
      utils.friends.pendingCount.invalidate();
      utils.friends.listEnriched.invalidate();
      toast.success(vars.status === "accepted" ? "Friend request accepted!" : "Request declined.");
    },
    onError: (e) => toast.error(e.message),
  });
  const removeFriendMutation = trpc.friends.remove.useMutation({
    onSuccess: () => {
      utils.friends.status.invalidate({ otherUserId: targetId! });
      utils.friends.listEnriched.invalidate();
      toast.success("Friend removed.");
    },
    onError: (e) => toast.error(e.message),
  });
  const getOrCreateConv = trpc.dm.getOrCreate.useMutation({
    onSuccess: () => navigate("/messages"),
    onError: (e) => toast.error(e.message),
  });
  // Inline bio editing state
  const [inlineBioEditing, setInlineBioEditing] = useState(false);
  const [inlineBioText, setInlineBioText] = useState("");
  const inlineBioRef = useRef<HTMLTextAreaElement>(null);

  const startInlineBioEdit = () => {
    setInlineBioText(profileData?.user.bio ?? "");
    setInlineBioEditing(true);
    // Focus textarea on next tick
    setTimeout(() => inlineBioRef.current?.focus(), 50);
  };

  const cancelInlineBioEdit = () => {
    setInlineBioEditing(false);
    setInlineBioText("");
  };

  const saveInlineBio = async () => {
    try {
      await updateProfile.mutateAsync({ bio: inlineBioText.trim() || undefined });
      setInlineBioEditing(false);
      setInlineBioText("");
      await utils.users.getProfile.invalidate({ userId: targetId! });
      toast.success("Bio updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update bio");
    }
  };

  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHometown, setEditHometown] = useState("");
  const [editCurrentLocation, setEditCurrentLocation] = useState("");
  const [editCurrentRole, setEditCurrentRole] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editYoutube, setEditYoutube] = useState("");
  const [editBirthDay, setEditBirthDay] = useState("");
  const [editBirthMonth, setEditBirthMonth] = useState("");
  const [editHobby, setEditHobby] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const coverContainerRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      if (!coverContainerRef.current) return;
      const rect = coverContainerRef.current.getBoundingClientRect();
      // Only apply parallax when the cover is visible
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        // Shift the image at 40% of the scroll speed
        const scrolled = -rect.top * 0.4;
        setParallaxY(Math.max(-40, Math.min(40, scrolled)));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: profileData, isLoading: profileLoading } = trpc.users.getProfile.useQuery(
    { userId: targetId! },
    { enabled: !!targetId }
  );

  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = trpc.posts.getByUser.useQuery(
    { userId: targetId! },
    { enabled: !!targetId }
  );

  const { data: followStatus } = trpc.follows.status.useQuery(
    { targetUserId: targetId! },
    { enabled: !!targetId && !isOwnProfile }
  );

  // Story ring: check if this profile user has active stories
  const { data: storyData } = trpc.stories.hasActive.useQuery(
    { userId: targetId! },
    { enabled: !!targetId }
  );
  const hasActiveStory = storyData?.hasActive ?? false;

  const toggleFollowMutation = trpc.follows.toggle.useMutation({
    onSuccess: () => {
      utils.follows.status.invalidate({ targetUserId: targetId! });
      utils.users.getProfile.invalidate({ userId: targetId! });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Block / Unblock ───────────────────────────────────────────────────────────────
  const { data: blockStatus, refetch: refetchBlockStatus } = trpc.blocks.check.useQuery(
    { userId: targetId! },
    { enabled: !!targetId && !isOwnProfile }
  );
  const isAdminUser = currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const isBlockedByMe = blockStatus?.iBlocked ?? false;
  const blockMutation = trpc.blocks.block.useMutation({
    onSuccess: () => {
      refetchBlockStatus();
      toast.success("User blocked.");
    },
    onError: (e) => toast.error(e.message),
  });
  const unblockMutation = trpc.blocks.unblock.useMutation({
    onSuccess: () => {
      refetchBlockStatus();
      toast.success("User unblocked.");
    },
    onError: (e) => toast.error(e.message),
  });

  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      utils.users.getProfile.invalidate({ userId: targetId! });
      toast.success("User suspended.");
    },
    onError: (e) => toast.error(e.message),
  });
  const unsuspendMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      utils.users.getProfile.invalidate({ userId: targetId! });
      toast.success("User unsuspended.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: (_data, variables) => {
      // Immediately update the cache so the new photo shows without waiting for refetch
      if (variables.avatar !== undefined || variables.coverPhoto !== undefined) {
        utils.users.getProfile.setData({ userId: targetId! }, (old) => {
          if (!old) return old;
          return {
            ...old,
            user: {
              ...old.user,
              ...(variables.avatar !== undefined ? { avatar: variables.avatar } : {}),
              ...(variables.coverPhoto !== undefined ? { coverPhoto: variables.coverPhoto } : {}),
            },
          };
        });
      }
      // Invalidate to sync with server
      utils.users.getProfile.invalidate();
      utils.auth.me.invalidate();
      setEditing(false);
      toast.success("Profile updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadMedia = trpc.media.upload.useMutation();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }

    // Show avatar crop tool instead of uploading immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarCropSrc(objectUrl);
    setAvatarCropFile(file);
    setAvatarCropOffset({ x: 50, y: 50 });
    if (avatarRef.current) avatarRef.current.value = "";
  };

  const applyAvatarCrop = async () => {
    if (!avatarCropFile) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(avatarCropFile);
      const { url } = await uploadMedia.mutateAsync({
        filename: avatarCropFile.name,
        contentType: avatarCropFile.type,
        base64,
        mediaType: "image",
      });
      await updateProfile.mutateAsync({ avatar: url });
      setAvatarCropSrc(null);
      setAvatarCropFile(null);
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Avatar upload failed.");
    }
    setUploading(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Cover image must be under 10MB."); return; }
    // Show crop tool instead of uploading immediately
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropFile(file);
    setCropPosition({ y: 50 });
    // Reset input so same file can be re-selected
    if (coverRef.current) coverRef.current.value = "";
  };

  const applyCoverCrop = async () => {
    if (!cropFile) return;
    setCoverUploading(true);
    try {
      const base64 = await fileToBase64(cropFile);
      const { url } = await uploadMedia.mutateAsync({
        filename: cropFile.name,
        contentType: cropFile.type,
        base64,
        mediaType: "image",
      });
      // Store the crop position as a CSS object-position value in the URL via a hash
      // We store position in the profile as-is; the display uses cropPosition from state
      await updateProfile.mutateAsync({ coverPhoto: url });
      // Persist crop position locally so the cover displays correctly
      try { localStorage.setItem(`ff_cover_crop_${targetId}`, String(cropPosition.y)); } catch { /* ignore */ }
      toast.success("Cover photo updated.");
      setCropSrc(null);
      setCropFile(null);
    } catch {
      toast.error("Cover photo upload failed.");
    }
    setCoverUploading(false);
  };

  const startEditing = () => {
    setEditName(profileData?.user.name ?? "");
    setEditBio(profileData?.user.bio ?? "");
    setEditHometown(profileData?.user.hometown ?? "");
    setEditCurrentLocation(profileData?.user.currentLocation ?? "");
    setEditCurrentRole(profileData?.user.currentRole ?? "");
    setEditPhone(profileData?.user.phone ?? "");
    setEditWebsite(profileData?.user.website ?? "");
    setEditYoutube(profileData?.user.youtubeChannel ?? "");
    setEditBirthDay(profileData?.user.birthDay ? String(profileData.user.birthDay) : "");
    setEditBirthMonth(profileData?.user.birthMonth ? String(profileData.user.birthMonth) : "");
    setEditHobby(profileData?.user.hobby ?? "");
    setEditing(true);
  };

  const saveProfile = () => {
    const birthDay = editBirthDay ? Number(editBirthDay) : null;
    const birthMonth = editBirthMonth ? Number(editBirthMonth) : null;

    if ((birthDay && !birthMonth) || (!birthDay && birthMonth)) {
      toast.error("Please enter both birth day and birth month, or leave both empty.");
      return;
    }

    if (birthDay && birthMonth) {
      const maxDaysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (birthDay < 1 || birthDay > maxDaysByMonth[birthMonth - 1]) {
        toast.error("Please enter a valid birth day for the selected month.");
        return;
      }
    }

    updateProfile.mutate({ name: editName, bio: editBio, hometown: editHometown || null, currentLocation: editCurrentLocation || null, currentRole: editCurrentRole || null, phone: editPhone || null, website: editWebsite || null, youtubeChannel: editYoutube || null, birthDay, birthMonth, hobby: editHobby || null });
  };

  if (!targetId) return null;

  if (profileLoading) {
    return (
      <div className="container py-12 flex justify-center">
        <Loader2 className="animate-spin text-foreground" size={24} />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container py-12 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-foreground">User not found.</p>
      </div>
    );
  }

  const { user, followerCount, followingCount, postCount } = profileData;
  const birthDayMonth = formatBirthDayMonth(user.birthDay, user.birthMonth);
  const isFollowing = followStatus?.following ?? false;

  // Use DB coverCropY (persisted across devices), fall back to localStorage for legacy
  const savedCropY = user.coverCropY ?? (() => { try { return Number(localStorage.getItem(`ff_cover_crop_${targetId}`)) || 50; } catch { return 50; } })();

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">

        {/* ── Avatar Lightbox ── */}
        {avatarLightboxOpen && user?.avatar && (
          <ImageLightbox
            src={user.avatar}
            alt={user.name ?? ""}
            onClose={() => setAvatarLightboxOpen(false)}
            actionLabel={isOwnProfile ? "Change Photo" : undefined}
            onAction={isOwnProfile ? () => { setAvatarLightboxOpen(false); avatarRef.current?.click(); } : undefined}
          />
        )}

        {/* ── Cover Photo Lightbox ── */}
        {coverLightboxOpen && user?.coverPhoto && (
          <ImageLightbox
            src={user.coverPhoto}
            alt="Cover photo"
            onClose={() => setCoverLightboxOpen(false)}
            actionLabel={isOwnProfile ? "Change Cover" : undefined}
            onAction={isOwnProfile ? () => { setCoverLightboxOpen(false); coverRef.current?.click(); } : undefined}
          />
        )}

        {/* ── Avatar Crop Tool Overlay ── */}
        {avatarCropSrc && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
            <div className="w-full max-w-xs px-4">
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-3 text-center">Drag to reposition profile photo</p>
              {/* Circular preview window */}
              <div className="flex justify-center mb-4">
                <div
                  className="relative overflow-hidden select-none"
                  style={{ width: 160, height: 160, borderRadius: "50%", border: "3px solid white", cursor: isDraggingAvatarCrop ? "grabbing" : "grab" }}
                  onMouseDown={(e) => { setIsDraggingAvatarCrop(true); avatarCropDragStart.current = { clientX: e.clientX, clientY: e.clientY, ox: avatarCropOffset.x, oy: avatarCropOffset.y }; }}
                  onMouseMove={(e) => { if (!isDraggingAvatarCrop || !avatarCropDragStart.current) return; const dx = ((e.clientX - avatarCropDragStart.current.clientX) / 160) * 100; const dy = ((e.clientY - avatarCropDragStart.current.clientY) / 160) * 100; setAvatarCropOffset({ x: Math.max(0, Math.min(100, avatarCropDragStart.current.ox - dx)), y: Math.max(0, Math.min(100, avatarCropDragStart.current.oy - dy)) }); }}
                  onMouseUp={() => setIsDraggingAvatarCrop(false)}
                  onMouseLeave={() => setIsDraggingAvatarCrop(false)}
                  onTouchStart={(e) => { setIsDraggingAvatarCrop(true); avatarCropDragStart.current = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, ox: avatarCropOffset.x, oy: avatarCropOffset.y }; }}
                  onTouchMove={(e) => { if (!isDraggingAvatarCrop || !avatarCropDragStart.current) return; const dx = ((e.touches[0].clientX - avatarCropDragStart.current.clientX) / 160) * 100; const dy = ((e.touches[0].clientY - avatarCropDragStart.current.clientY) / 160) * 100; setAvatarCropOffset({ x: Math.max(0, Math.min(100, avatarCropDragStart.current.ox - dx)), y: Math.max(0, Math.min(100, avatarCropDragStart.current.oy - dy)) }); }}
                  onTouchEnd={() => setIsDraggingAvatarCrop(false)}
                >
                  <img
                    src={avatarCropSrc}
                    alt="Avatar preview"
                    className="absolute"
                    style={{ top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${avatarCropOffset.x}% ${avatarCropOffset.y}%` }}
                    draggable={false}
                  />
                </div>
              </div>
              <p className="text-white/50 text-[10px] text-center mb-4">Drag to reposition · Your photo will be cropped to a circle</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setAvatarCropSrc(null); setAvatarCropFile(null); }}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-widest border border-white/40 text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyAvatarCrop}
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: "var(--its-red)" }}
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Cover Crop Tool Overlay ── */}
        {cropSrc && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
            <div className="w-full max-w-lg px-4">
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-3 text-center">Drag to reposition cover photo</p>
              {/* Preview window */}
              <div
                className="w-full overflow-hidden relative select-none"
                style={{ height: 128, cursor: isDraggingCrop ? "grabbing" : "grab" }}
                onMouseDown={(e) => {
                  setIsDraggingCrop(true);
                  cropDragStartY.current = e.clientY;
                  cropDragStartPos.current = cropPosition.y;
                }}
                onMouseMove={(e) => {
                  if (!isDraggingCrop) return;
                  const delta = ((e.clientY - cropDragStartY.current) / 128) * 100;
                  setCropPosition({ y: Math.max(0, Math.min(100, cropDragStartPos.current - delta)) });
                }}
                onMouseUp={() => setIsDraggingCrop(false)}
                onMouseLeave={() => setIsDraggingCrop(false)}
                onTouchStart={(e) => {
                  setIsDraggingCrop(true);
                  cropDragStartY.current = e.touches[0].clientY;
                  cropDragStartPos.current = cropPosition.y;
                }}
                onTouchMove={(e) => {
                  if (!isDraggingCrop) return;
                  const delta = ((e.touches[0].clientY - cropDragStartY.current) / 128) * 100;
                  setCropPosition({ y: Math.max(0, Math.min(100, cropDragStartPos.current - delta)) });
                }}
                onTouchEnd={() => setIsDraggingCrop(false)}
              >
                <img
                  src={cropSrc}
                  alt="Cover preview"
                  className="w-full h-auto absolute left-0"
                  style={{ top: 0, objectFit: "cover", objectPosition: `center ${cropPosition.y}%`, width: "100%", height: "100%" }}
                  draggable={false}
                />
                <div className="absolute inset-0 border-2 border-white/40 pointer-events-none" />
              </div>
              <div className="flex gap-3 mt-4 justify-center">
                <button
                  onClick={() => { setCropSrc(null); setCropFile(null); }}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-widest border border-white/40 text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCoverCrop}
                  disabled={coverUploading}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: "var(--its-red)" }}
                >
                  {coverUploading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save Cover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile header */}
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden mb-5">
          {/* Cover photo */}
          <div
            ref={coverContainerRef}
            className={`h-40 sm:h-48 bg-primary relative overflow-hidden group ${
              isOwnProfile && !user.coverPhoto ? "cursor-pointer" : user.coverPhoto ? "cursor-pointer" : ""
            }`}
            onClick={
              isOwnProfile && !user.coverPhoto
                ? () => coverRef.current?.click()
                : user.coverPhoto
                ? () => setCoverLightboxOpen(true)
                : undefined
            }
            title={isOwnProfile && !user.coverPhoto ? "Add cover photo" : user.coverPhoto ? "View cover photo" : undefined}
          >
            {user.coverPhoto ? (
              <img
                src={user.coverPhoto}
                alt="Cover"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `center ${savedCropY}%`,
                  transform: `translateY(${parallaxY}px)`,
                  willChange: "transform",
                  transition: "transform 0.05s linear",
                  height: "120%",
                  marginTop: "-10%",
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="grid grid-cols-4 gap-1 w-full h-full">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`${i % 3 === 0 ? "bg-background" : i % 3 === 1 ? "bg-[var(--its-red)]" : "bg-transparent"}`} />
                  ))}
                </div>
              </div>
            )}
            {/* Cover upload loading overlay */}
            {coverUploading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/50 pointer-events-none">
                <Loader2 size={28} className="animate-spin text-white" />
                <span className="text-white text-[11px] font-bold uppercase tracking-widest">Uploading…</span>
              </div>
            )}
            {/* Cover upload prompt when blank */}
            {isOwnProfile && !user.coverPhoto && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-primary-foreground opacity-60 hover:opacity-100 transition-opacity pointer-events-none">
                <Camera size={22} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Add Cover Photo</span>
              </div>
            )}
            {isOwnProfile && (
              <>
                {user.coverPhoto && (
                  <button
                    onClick={(event) => {
                      // Do not also trigger the parent cover click, which opens the
                      // full-screen viewer underneath the crop editor.
                      event.preventDefault();
                      event.stopPropagation();
                      coverRef.current?.click();
                    }}
                    disabled={coverUploading}
                    className="absolute bottom-2 right-2 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.55)",
                      backdropFilter: "blur(4px)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-red)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.55)")}
                    title="Change cover photo"
                  >
                    {coverUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                    Change Cover
                  </button>
                )}
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </>
            )}
          </div>

          {/* Avatar + info */}
          <div className="px-5 pb-5">
            {/* Avatar row — overlaps cover photo with negative margin */}
            <div className="-mt-12 mb-2">
              {/* Avatar — with gradient story ring when user has active stories */}
              <div className="relative inline-block">
                {/* Story ring */}
                {hasActiveStory && (
                  <div
                    className="absolute -inset-1 rounded-full z-10 pointer-events-none story-ring-pulse"
                    style={{
                      background: "linear-gradient(135deg, #f97316 0%, #e63329 40%, #9333ea 100%)",
                      padding: 2,
                      borderRadius: 0,
                    }}
                  />
                )}
                {/* Avatar upload overlay */}
                {uploading && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center rounded-full bg-black/50 pointer-events-none">
                    <Loader2 size={22} className="animate-spin text-white" />
                  </div>
                )}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name ?? ""}
                    className="w-24 h-24 object-cover border-4 border-white rounded-full relative z-20 cursor-pointer hover:brightness-90 transition-all shadow-md"
                    onClick={() => setAvatarLightboxOpen(true)}
                    title="View profile photo"
                  />
                ) : (
                  <div
                    className={`w-24 h-24 bg-primary border-4 border-white rounded-full flex flex-col items-center justify-center gap-0.5 shadow-md ${isOwnProfile ? "cursor-pointer group/avatar hover:bg-[var(--its-red)] transition-colors" : ""}`}
                    onClick={isOwnProfile ? () => avatarRef.current?.click() : undefined}
                    title={isOwnProfile ? "Add profile photo" : undefined}
                  >
                    {isOwnProfile ? (
                      <>
                        <Camera size={20} className="text-primary-foreground group-hover/avatar:scale-110 transition-transform" />
                        <span className="text-primary-foreground text-[9px] font-bold uppercase tracking-wider leading-none">Add Photo</span>
                      </>
                    ) : (
                      <span className="text-primary-foreground text-2xl font-black">
                        {(user.name ?? "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
                {isOwnProfile && (
                  <>
                    {user.avatar && (
                      <button
                        onClick={() => avatarRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1 rounded-full hover:bg-[var(--its-red)] transition-colors shadow"
                        title="Change profile photo"
                      >
                        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                      </button>
                    )}
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </>
                )}
              </div>
            </div>{/* end avatar row */}

            {/* Actions row — arranged to match the requested mobile profile layout */}
            <div className="relative mb-4">
              {isOwnProfile ? (
                editing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={saveProfile}
                      disabled={updateProfile.isPending}
                      className="its-btn bg-primary text-primary-foreground px-4 py-2 text-xs font-bold tracking-widest uppercase hover:bg-[var(--its-red)] transition-colors flex items-center gap-1"
                    >
                      <Check size={12} />
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="its-btn border border-foreground text-foreground px-4 py-2 text-xs font-bold tracking-widest uppercase hover:bg-secondary transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditing}
                    className="its-btn border border-foreground text-foreground px-4 py-2 text-xs font-bold tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    Edit Profile
                  </button>
                )
              ) : (
                <>
                  <div className="grid grid-cols-[0.75fr_1fr_0.9fr_40px] gap-2 items-center w-full">
                    <button
                      onClick={() => isFollowing ? setShowUnfollowConfirm(true) : toggleFollowMutation.mutate({ targetUserId: targetId! })}
                      disabled={toggleFollowMutation.isPending}
                      className={`its-btn h-10 px-2 text-[10px] sm:text-xs font-semibold tracking-wide transition-colors flex items-center justify-center ${
                        isFollowing
                          ? "border border-foreground text-foreground hover:bg-foreground hover:text-background"
                          : "bg-primary text-primary-foreground hover:bg-[var(--its-red)]"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <span className="hidden sm:inline">Following</span>
                          <span className="sm:hidden">Fol.ing</span>
                        </>
                      ) : (
                        "Follow"
                      )}
                    </button>

                    {friendStatus?.areFriends ? (
                      <button
                        onClick={() => setShowUnfriendConfirm(true)}
                        disabled={removeFriendMutation.isPending}
                        className="its-btn h-10 border border-primary text-primary px-2 text-[10px] sm:text-xs font-semibold tracking-wide hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                      >
                        Friend
                      </button>
                    ) : friendStatus?.request?.senderId === currentUser?.id ? (
                      <button
                        onClick={() => cancelFriendRequest.mutate({ receiverId: targetId! })}
                        disabled={cancelFriendRequest.isPending}
                        className="its-btn h-10 border border-muted-foreground text-muted-foreground px-1.5 text-[9px] sm:text-[10px] font-black tracking-[0.12em] uppercase hover:bg-secondary transition-colors flex items-center justify-center gap-0.5"
                      >
                        <Clock size={11} /> Pend...
                      </button>
                    ) : friendStatus?.request?.receiverId === currentUser?.id ? (
                      <div className="grid grid-cols-2 gap-1 h-12">
                        <button
                          onClick={() => respondFriendRequest.mutate({ requestId: friendStatus!.request!.id, status: "accepted" })}
                          disabled={respondFriendRequest.isPending}
                          className="its-btn bg-primary text-primary-foreground px-2 text-[10px] font-black tracking-widest uppercase hover:bg-[var(--its-red)] transition-colors flex items-center justify-center"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => respondFriendRequest.mutate({ requestId: friendStatus!.request!.id, status: "declined" })}
                          disabled={respondFriendRequest.isPending}
                          className="its-btn border border-foreground text-foreground px-2 text-[10px] font-black tracking-widest uppercase hover:bg-secondary transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest.mutate({ receiverId: targetId! })}
                        disabled={sendFriendRequest.isPending}
                        className="its-btn h-12 border border-primary text-primary px-2 text-[11px] sm:text-xs font-black tracking-[0.14em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1"
                      >
                        Add Friend
                      </button>
                    )}

                    <button
                      onClick={() => getOrCreateConv.mutate({ otherUserId: targetId! })}
                      disabled={getOrCreateConv.isPending}
                      className="its-btn h-10 border border-foreground text-foreground px-2 text-[10px] sm:text-xs font-semibold tracking-wide hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-1"
                    >
                      <MessageCircle size={13} /> Message
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfileActionMenuOpen((open) => !open)}
                      aria-label="More profile actions"
                      className="its-btn h-10 border border-border bg-background text-foreground px-1 transition-colors hover:bg-secondary flex items-center justify-center"
                    >
                      <Menu size={20} strokeWidth={2.5} />
                    </button>
                  </div>

                  {profileActionMenuOpen && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-56 border border-border bg-background shadow-xl p-2">
                      <button
                        onClick={() => {
                          setProfileActionMenuOpen(false);
                          setShowInviteModal(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-secondary"
                      >
                        <span className="inline-flex items-center gap-2"><Share2 size={13} /> Invite</span>
                      </button>
                      {friendStatus?.areFriends && (
                        <button
                          onClick={() => {
                            setProfileActionMenuOpen(false);
                            setShowUnfriendConfirm(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10"
                        >
                          Unfriend
                        </button>
                      )}
                      {isBlockedByMe ? (
                        <button
                          onClick={() => {
                            setProfileActionMenuOpen(false);
                            unblockMutation.mutate({ blockedId: targetId! });
                          }}
                          disabled={unblockMutation.isPending}
                          className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary"
                        >
                          <span className="inline-flex items-center gap-2"><Shield size={13} /> Unblock</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setProfileActionMenuOpen(false);
                            blockMutation.mutate({ blockedId: targetId! });
                          }}
                          disabled={blockMutation.isPending}
                          className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10"
                        >
                          <span className="inline-flex items-center gap-2"><ShieldOff size={13} /> Block</span>
                        </button>
                      )}
                      {/* Admin Suspend / Unsuspend */}
                      {isAdminUser && !isOwnProfile && (
                        <>
                          {user.suspendedUntil ? (
                            <button
                              onClick={() => {
                                setProfileActionMenuOpen(false);
                                if (confirm("Unsuspend this user?")) unsuspendMutation.mutate({ userId: targetId! });
                              }}
                              disabled={unsuspendMutation.isPending}
                              className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-green-600 hover:bg-green-50"
                            >
                              <span className="inline-flex items-center gap-2"><Check size={13} /> Unsuspend</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setProfileActionMenuOpen(false);
                                const reason = prompt("Enter reason for suspension:");
                                if (reason) {
                                  const days = parseInt(prompt("Enter suspension duration in days (1-365):") || "7", 10);
                                  if (!isNaN(days) && days > 0) {
                                    suspendMutation.mutate({ userId: targetId!, days, reason });
                                  }
                                }
                              }}
                              disabled={suspendMutation.isPending}
                              className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                            >
                              <span className="inline-flex items-center gap-2"><ShieldOff size={13} /> Suspend</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {showUnfriendConfirm && (
                    <div className="mt-3 border border-[var(--its-red)] bg-background p-3 shadow-sm">
                      <p className="text-sm font-bold text-foreground mb-3">Are you sure you want to unfriend?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            removeFriendMutation.mutate({ friendId: targetId! });
                            setShowUnfriendConfirm(false);
                          }}
                          disabled={removeFriendMutation.isPending}
                          className="its-btn bg-destructive text-destructive-foreground px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-destructive/90"
                        >
                          Yes, Unfriend
                        </button>
                        <button
                          onClick={() => setShowUnfriendConfirm(false)}
                          className="its-btn border border-foreground text-foreground px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Unfollow confirmation dialog */}
              {showUnfollowConfirm && (
                <div className="mt-3 border border-[var(--its-red)] bg-background p-3 shadow-sm">
                  <p className="text-sm font-bold text-foreground mb-3">Do you want to unfollow?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        toggleFollowMutation.mutate({ targetUserId: targetId! });
                        setShowUnfollowConfirm(false);
                      }}
                      disabled={toggleFollowMutation.isPending}
                      className="its-btn bg-destructive text-destructive-foreground px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-destructive/90"
                    >
                      Yes, Unfollow
                    </button>
                    <button
                      onClick={() => setShowUnfollowConfirm(false)}
                      className="its-btn border border-foreground text-foreground px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Name & bio */}
            {editing ? (
              <div className="space-y-3">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  className="w-full border-b border-black px-0 py-1 text-lg font-black text-foreground focus:outline-none"
                />
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write a short bio..."
                  maxLength={500}
                  rows={3}
                  className="w-full border-b border-border px-0 py-1 text-sm text-foreground placeholder-gray-400 focus:outline-none resize-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {([
                    { label: "Where are you from?", value: editHometown, setter: setEditHometown, max: 100 },
                    { label: "Current location", value: editCurrentLocation, setter: setEditCurrentLocation, max: 100 },
                    { label: "Current role / job title", value: editCurrentRole, setter: setEditCurrentRole, max: 100 },
                    { label: "Phone (private — not shown publicly)", value: editPhone, setter: setEditPhone, max: 30 },
                    { label: "Hobby", value: editHobby, setter: setEditHobby, max: 120 },
                    { label: "Website or blog URL", value: editWebsite, setter: setEditWebsite, max: 255 },
                    { label: "YouTube channel URL", value: editYoutube, setter: setEditYoutube, max: 255 },
                  ] as { label: string; value: string; setter: (v: string) => void; max: number }[]).map(({ label, value, setter, max }) => (
                    <input
                      key={label}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={label}
                      maxLength={max}
                      className="w-full border-b border-border px-0 py-1 text-sm text-foreground placeholder-gray-400 focus:outline-none bg-transparent"
                    />
                  ))}
                  <div className="grid grid-cols-[1fr_1.4fr] gap-2 sm:col-span-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      value={editBirthDay}
                      onChange={(e) => setEditBirthDay(e.target.value)}
                      placeholder="Birth day"
                      aria-label="Birth day only; no birth year"
                      className="w-full border-b border-border px-0 py-1 text-sm text-foreground placeholder-gray-400 focus:outline-none bg-transparent"
                    />
                    <select
                      value={editBirthMonth}
                      onChange={(e) => setEditBirthMonth(e.target.value)}
                      className="w-full border-b border-border px-0 py-1 text-sm text-foreground focus:outline-none bg-transparent"
                    >
                      <option value="">Birth month</option>
                      {BIRTH_MONTHS.map((month, index) => (
                        <option key={month} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black text-foreground tracking-tight mb-1 flex items-center gap-2">
                  {user.name ?? "Anonymous"}
                  {user.isVerified && <span title="Verified"><BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" /></span>}
                </h1>
                {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-2">{user.bio}</p>}
                <div className="space-y-0.5 mt-1">
                  {user.currentRole && <p className="text-sm font-semibold text-foreground">{user.currentRole}</p>}
                  {user.hometown && <p className="text-xs text-muted-foreground">From: {user.hometown}</p>}
                  {user.currentLocation && <p className="text-xs text-muted-foreground">Lives in: {user.currentLocation}</p>}
                  {birthDayMonth && <p className="text-xs text-muted-foreground">Birthday: {birthDayMonth}</p>}
                  {user.hobby && <p className="text-xs text-muted-foreground">Hobby: {user.hobby}</p>}
                  {user.website && (
                    <a
                      href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[var(--its-red)] hover:underline truncate mt-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      <span className="truncate">{user.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a>
                  )}
                  {user.youtubeChannel && <a href={user.youtubeChannel.startsWith('http') ? user.youtubeChannel : `https://${user.youtubeChannel}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--its-red)] hover:underline block">YouTube Channel</a>}
                </div>
              </>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              {[
                { label: "Posts", value: postCount },
                { label: "Followers", value: followerCount },
                { label: "Following", value: followingCount },
              ].map((stat) => (
                <div key={stat.label} className="text-center bg-muted/40 border border-border/60 rounded-md py-2 px-1 shadow-sm">
                  <p className="text-lg font-black leading-none text-foreground">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio card — shown when user has bio, role, location, or website */}
        {!editing && (user.bio || user.currentRole || user.hometown || user.currentLocation || birthDayMonth || user.hobby || user.website || user.youtubeChannel) && (
          <div className="bg-card rounded-2xl shadow-sm mb-4 px-4 py-4">
            {/* Inline bio editing */}
            {inlineBioEditing && isOwnProfile ? (
              <div className="mb-3">
                <textarea
                  ref={inlineBioRef}
                  value={inlineBioText}
                  onChange={(e) => setInlineBioText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Write a short bio…"
                  className="w-full text-sm text-foreground bg-background border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--its-red)]/40 leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">{inlineBioText.length}/500</span>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelInlineBioEdit}
                      className="text-xs px-3 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveInlineBio}
                      disabled={updateProfile.isPending}
                      className="text-xs px-3 py-1 rounded-lg bg-[var(--its-red)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                    >
                      {updateProfile.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              user.bio && (
                <div className="group relative mb-3">
                  <p className="text-sm text-foreground leading-relaxed pr-6">{user.bio}</p>
                  {isOwnProfile && (
                    <button
                      onClick={startInlineBioEdit}
                      title="Edit bio"
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-[var(--its-red)]"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
              )
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {user.currentRole && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                  <span className="font-semibold text-foreground">{user.currentRole}</span>
                </span>
              )}
              {user.hometown && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  From {user.hometown}
                </span>
              )}
              {user.currentLocation && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {user.currentLocation}
                </span>
              )}
              {birthDayMonth && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Birthday {birthDayMonth}
                </span>
              )}
              {user.hobby && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/></svg>
                  Hobby {user.hobby}
                </span>
              )}
              {user.website && (
                <a
                  href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[var(--its-red)] hover:underline"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {user.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              {user.youtubeChannel && (
                <a href={user.youtubeChannel.startsWith('http') ? user.youtubeChannel : `https://${user.youtubeChannel}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[var(--its-red)] hover:underline">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                  YouTube
                </a>
              )}
            </div>
            {isOwnProfile && !inlineBioEditing && (
              <div className="mt-3 flex items-center gap-3">
                {!user.bio && (
                  <button
                    onClick={startInlineBioEdit}
                    className="text-xs font-bold text-muted-foreground hover:text-[var(--its-red)] transition-colors flex items-center gap-1"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add bio
                  </button>
                )}
                <button onClick={() => setEditing(true)} className="text-xs font-bold text-muted-foreground hover:text-[var(--its-red)] transition-colors flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit details
                </button>
              </div>
            )}
          </div>
        )}
        {/* Own profile with no bio/info: show compact add-bio prompt with inline editing */}
        {!editing && isOwnProfile && !user.bio && !user.currentRole && !user.hometown && !user.currentLocation && !birthDayMonth && !user.hobby && !user.website && !user.youtubeChannel && (
          <div className="bg-card rounded-2xl shadow-sm mb-4 px-4 py-3">
            {inlineBioEditing ? (
              <div>
                <textarea
                  ref={inlineBioRef}
                  value={inlineBioText}
                  onChange={(e) => setInlineBioText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Write a short bio…"
                  className="w-full text-sm text-foreground bg-background border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--its-red)]/40 leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">{inlineBioText.length}/500</span>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelInlineBioEdit}
                      className="text-xs px-3 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveInlineBio}
                      disabled={updateProfile.isPending}
                      className="text-xs px-3 py-1 rounded-lg bg-[var(--its-red)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                    >
                      {updateProfile.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="text-xs text-muted-foreground flex-1">Tell people about yourself</span>
                <button onClick={startInlineBioEdit} className="text-xs font-black uppercase tracking-widest text-[var(--its-red)] hover:underline">Add Bio →</button>
              </div>
            )}
          </div>
        )}

        {/* Profile completion nudge — only for own profile when missing avatar or bio */}
        {isOwnProfile && (!user.avatar || !user.bio) && !nudgeDismissed && (
          <div
            className="bg-card rounded-2xl shadow-sm mb-4 px-4 py-3 flex items-start gap-3 border border-[var(--its-red)]/30"
            style={{ backgroundColor: "rgba(230,51,41,0.04)" }}
          >
            <div
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
              style={{ backgroundColor: "var(--its-red)", color: "#fff" }}
            >
              <span className="text-xs font-black">!</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-foreground mb-1">Complete your profile</p>
              <p className="text-xs text-muted-foreground mb-2">
                {!user.avatar && !user.bio
                  ? "Add a profile photo and bio so friends can recognise you."
                  : !user.avatar
                  ? "Add a profile photo so friends can recognise you."
                  : "Add a bio to tell people a bit about yourself."}
              </p>
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-bold uppercase tracking-widest text-[var(--its-red)] hover:underline"
              >
                {!user.avatar ? "Add Photo →" : "Add Bio →"}
              </button>
            </div>
            {/* Dismiss button */}
            <button
              onClick={dismissNudge}
              className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Dismiss"
              aria-label="Dismiss profile completion nudge"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Story Highlights */}
        <HighlightsSection userId={targetId!} isOwnProfile={isOwnProfile} />
        {/* Photo Albums */}
        <ProfilePhotoAlbum userId={targetId!} isOwnProfile={isOwnProfile} />
        <CoverPhotoAlbum userId={targetId!} isOwnProfile={isOwnProfile} />
        {/* Passkey Manager — only for own profile */}
        {isOwnProfile && <PasskeyManager />}
        {/* Content Tabs */}
        <ProfileContentTabs userId={targetId!} isOwnProfile={isOwnProfile} user={user} postsData={postsData} postsLoading={postsLoading} refetchPosts={refetchPosts} />
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          type="profile"
          targetId={targetId!}
          targetName={user?.name || "User"}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}


// ─── Profile Photo Album ─────────────────────────────────────────────────────
function ProfilePhotoAlbum({ userId, isOwnProfile }: { userId: number; isOwnProfile: boolean }) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrcPP, setCropSrcPP] = useState<string | null>(null);
  const [cropFilePP, setCropFilePP] = useState<File | null>(null);
  const [cropOffsetPP, setCropOffsetPP] = useState({ x: 50, y: 50 });
  const [isDraggingPP, setIsDraggingPP] = useState(false);
  const dragStartPP = useRef<{ clientX: number; clientY: number; ox: number; oy: number } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const { data: photos = [], isLoading } = trpc.photos.listProfilePhotos.useQuery({ userId });

  const uploadMutation = trpc.photos.uploadProfilePhoto.useMutation({
    onSuccess: () => {
      utils.photos.listProfilePhotos.invalidate({ userId });
      utils.users.getProfile.invalidate({ userId });
      utils.auth.me.invalidate();
      toast.success("Profile photo updated!");
    },
    onError: (e) => toast.error(e.message),
  });
  const setActiveMutation = trpc.photos.setActiveProfilePhoto.useMutation({
    onSuccess: () => { utils.photos.listProfilePhotos.invalidate({ userId }); utils.users.getProfile.invalidate({ userId }); toast.success("Profile photo updated!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.photos.deleteProfilePhoto.useMutation({
    onSuccess: () => { utils.photos.listProfilePhotos.invalidate({ userId }); utils.users.getProfile.invalidate({ userId }); utils.auth.me.invalidate(); toast.success("Photo deleted."); },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB."); return; }
    const objectUrl = URL.createObjectURL(file);
    setCropSrcPP(objectUrl);
    setCropFilePP(file);
    setCropOffsetPP({ x: 50, y: 50 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyCropPP = async () => {
    if (!cropFilePP) return;
    setUploading(true);
    try {
      const dataUrl = await fileToBase64(cropFilePP);
      await uploadMutation.mutateAsync({ dataUrl, mimeType: cropFilePP.type });
      setCropSrcPP(null);
      setCropFilePP(null);
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); }
  };

  if (isLoading) return null;
  if (photos.length === 0) return null;
  if (false) return (
    <div className="hidden">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      {cropSrcPP && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-sm flex flex-col items-center gap-4">
            <p className="text-sm font-bold text-foreground">Drag to reposition</p>
            <div
              className="relative overflow-hidden"
              style={{ width: 200, height: 200, borderRadius: "50%", border: "3px solid white", cursor: isDraggingPP ? "grabbing" : "grab" }}
              onMouseDown={(e) => { setIsDraggingPP(true); dragStartPP.current = { clientX: e.clientX, clientY: e.clientY, ox: cropOffsetPP.x, oy: cropOffsetPP.y }; }}
              onMouseMove={(e) => { if (!isDraggingPP || !dragStartPP.current) return; const dx = ((e.clientX - dragStartPP.current.clientX) / 200) * 100; const dy = ((e.clientY - dragStartPP.current.clientY) / 200) * 100; setCropOffsetPP({ x: Math.max(0, Math.min(100, dragStartPP.current.ox - dx)), y: Math.max(0, Math.min(100, dragStartPP.current.oy - dy)) }); }}
              onMouseUp={() => setIsDraggingPP(false)}
              onMouseLeave={() => setIsDraggingPP(false)}
              onTouchStart={(e) => { setIsDraggingPP(true); dragStartPP.current = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, ox: cropOffsetPP.x, oy: cropOffsetPP.y }; }}
              onTouchMove={(e) => { if (!isDraggingPP || !dragStartPP.current) return; const dx = ((e.touches[0].clientX - dragStartPP.current.clientX) / 200) * 100; const dy = ((e.touches[0].clientY - dragStartPP.current.clientY) / 200) * 100; setCropOffsetPP({ x: Math.max(0, Math.min(100, dragStartPP.current.ox - dx)), y: Math.max(0, Math.min(100, dragStartPP.current.oy - dy)) }); }}
              onTouchEnd={() => setIsDraggingPP(false)}
            >
              <img src={cropSrcPP ?? undefined} alt="Crop preview" draggable={false} style={{ top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${cropOffsetPP.x}% ${cropOffsetPP.y}%`, userSelect: "none" }} />
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => { setCropSrcPP(null); setCropFilePP(null); }} className="flex-1 py-2 border border-border rounded text-sm font-bold hover:bg-muted transition-colors">Cancel</button>
              <button onClick={applyCropPP} disabled={uploading} className="flex-1 py-2 bg-[var(--its-red)] text-white rounded text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                {uploading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-card rounded-2xl shadow-sm mb-4">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Images size={14} className="text-[var(--its-red)]" />
        <span className="text-xs font-black uppercase tracking-widest text-foreground">Profile Photos</span>
        <span className="ml-auto text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Circular crop modal */}
      {cropSrcPP && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-sm flex flex-col items-center gap-4">
            <p className="text-sm font-bold text-foreground">Drag to reposition</p>
            <div
              className="relative overflow-hidden"
              style={{ width: 200, height: 200, borderRadius: "50%", border: "3px solid white", cursor: isDraggingPP ? "grabbing" : "grab" }}
              onMouseDown={(e) => { setIsDraggingPP(true); dragStartPP.current = { clientX: e.clientX, clientY: e.clientY, ox: cropOffsetPP.x, oy: cropOffsetPP.y }; }}
              onMouseMove={(e) => { if (!isDraggingPP || !dragStartPP.current) return; const dx = ((e.clientX - dragStartPP.current.clientX) / 200) * 100; const dy = ((e.clientY - dragStartPP.current.clientY) / 200) * 100; setCropOffsetPP({ x: Math.max(0, Math.min(100, dragStartPP.current.ox - dx)), y: Math.max(0, Math.min(100, dragStartPP.current.oy - dy)) }); }}
              onMouseUp={() => setIsDraggingPP(false)}
              onMouseLeave={() => setIsDraggingPP(false)}
              onTouchStart={(e) => { setIsDraggingPP(true); dragStartPP.current = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, ox: cropOffsetPP.x, oy: cropOffsetPP.y }; }}
              onTouchMove={(e) => { if (!isDraggingPP || !dragStartPP.current) return; const dx = ((e.touches[0].clientX - dragStartPP.current.clientX) / 200) * 100; const dy = ((e.touches[0].clientY - dragStartPP.current.clientY) / 200) * 100; setCropOffsetPP({ x: Math.max(0, Math.min(100, dragStartPP.current.ox - dx)), y: Math.max(0, Math.min(100, dragStartPP.current.oy - dy)) }); }}
              onTouchEnd={() => setIsDraggingPP(false)}
            >
              <img
                src={cropSrcPP}
                alt="Crop preview"
                draggable={false}
                style={{ top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${cropOffsetPP.x}% ${cropOffsetPP.y}%`, userSelect: "none" }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">Drag the image to adjust the crop area</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => { setCropSrcPP(null); setCropFilePP(null); }} className="flex-1 py-2 border border-border rounded text-sm font-bold hover:bg-muted transition-colors">Cancel</button>
              <button onClick={applyCropPP} disabled={uploading} className="flex-1 py-2 bg-[var(--its-red)] text-white rounded text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                {uploading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-xs flex flex-col gap-4">
            <p className="text-sm font-bold text-foreground">Delete this photo?</p>
            <p className="text-xs text-muted-foreground">This will permanently remove the photo from your profile.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 border border-border rounded text-sm font-bold hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => { deleteMutation.mutate({ photoId: confirmDeleteId }); setConfirmDeleteId(null); }}
                className="flex-1 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 transition-colors"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {isOwnProfile && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-[var(--its-red)] hover:text-[var(--its-red)] transition-colors text-muted-foreground bg-muted/30"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span className="text-[10px] font-bold uppercase tracking-wide">Add</span>
            </button>
          )}
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden">
              <img src={photo.url} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
              {photo.isActive && (
                <div className="absolute top-1.5 left-1.5 bg-[var(--its-red)] text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                  <Star size={9} fill="white" />
                  <span className="text-[9px] font-black uppercase tracking-wide">Active</span>
                </div>
              )}
              {isOwnProfile && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!photo.isActive && (
                    <button
                      onClick={() => setActiveMutation.mutate({ photoId: photo.id })}
                      className="bg-white text-black p-1.5 rounded-full hover:bg-[var(--its-red)] hover:text-white transition-colors shadow"
                      title="Set as profile photo"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(photo.id)}
                    className="bg-white text-black p-1.5 rounded-full hover:bg-red-600 hover:text-white transition-colors shadow"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>
    </div>
  );
}

// ─── Cover Photo Album ────────────────────────────────────────────────────────
function CoverPhotoAlbum({ userId, isOwnProfile }: { userId: number; isOwnProfile: boolean }) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrcCP, setCropSrcCP] = useState<string | null>(null);
  const [cropFileCP, setCropFileCP] = useState<File | null>(null);
  const [cropPosCP, setCropPosCP] = useState({ y: 50 });
  const [isDraggingCP, setIsDraggingCP] = useState(false);
  const dragStartCP = useRef<{ clientY: number; oy: number } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const { data: photos = [], isLoading } = trpc.photos.listCoverPhotos.useQuery({ userId });

  const uploadMutation = trpc.photos.uploadCoverPhoto.useMutation({
    onSuccess: () => {
      utils.photos.listCoverPhotos.invalidate({ userId });
      utils.users.getProfile.invalidate({ userId });
      toast.success("Cover photo updated!");
    },
    onError: (e) => toast.error(e.message),
  });
  const setActiveMutation = trpc.photos.setActiveCoverPhoto.useMutation({
    onSuccess: () => { utils.photos.listCoverPhotos.invalidate({ userId }); utils.users.getProfile.invalidate({ userId }); toast.success("Cover photo updated!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.photos.deleteCoverPhoto.useMutation({
    onSuccess: () => { utils.photos.listCoverPhotos.invalidate({ userId }); utils.users.getProfile.invalidate({ userId }); toast.success("Photo deleted."); },
    onError: (e) => toast.error(e.message),
  });
  const updateCoverPosition = trpc.users.updateProfile.useMutation({
    onSuccess: () => { utils.users.getProfile.invalidate({ userId }); },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Cover image must be under 10MB."); return; }
    const objectUrl = URL.createObjectURL(file);
    setCropSrcCP(objectUrl);
    setCropFileCP(file);
    setCropPosCP({ y: 50 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyCropCP = async () => {
    if (!cropFileCP) return;
    setUploading(true);
    try {
      const dataUrl = await fileToBase64(cropFileCP);
      // Encode the crop position into the URL as a fragment so we can restore it
      const result = await uploadMutation.mutateAsync({ dataUrl, mimeType: cropFileCP.type });
      // Save crop position to DB via coverCropY field on user
      await updateCoverPosition.mutateAsync({ coverCropY: cropPosCP.y });
      setCropSrcCP(null);
      setCropFileCP(null);
      void result;
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); }
  };

  if (isLoading) return null;
  if (photos.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl shadow-sm mb-4">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Camera size={14} className="text-[var(--its-red)]" />
        <span className="text-xs font-black uppercase tracking-widest text-foreground">Cover Photos</span>
        <span className="ml-auto text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Cover crop modal */}
      {cropSrcCP && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg flex flex-col gap-4">
            <p className="text-sm font-bold text-foreground">Drag to reposition cover photo</p>
            <div
              className="relative overflow-hidden w-full rounded"
              style={{ height: 160, cursor: isDraggingCP ? "grabbing" : "grab" }}
              onMouseDown={(e) => { setIsDraggingCP(true); dragStartCP.current = { clientY: e.clientY, oy: cropPosCP.y }; }}
              onMouseMove={(e) => { if (!isDraggingCP || !dragStartCP.current) return; const dy = ((e.clientY - dragStartCP.current.clientY) / 160) * 100; setCropPosCP({ y: Math.max(0, Math.min(100, dragStartCP.current.oy - dy)) }); }}
              onMouseUp={() => setIsDraggingCP(false)}
              onMouseLeave={() => setIsDraggingCP(false)}
              onTouchStart={(e) => { setIsDraggingCP(true); dragStartCP.current = { clientY: e.touches[0].clientY, oy: cropPosCP.y }; }}
              onTouchMove={(e) => { if (!isDraggingCP || !dragStartCP.current) return; const dy = ((e.touches[0].clientY - dragStartCP.current.clientY) / 160) * 100; setCropPosCP({ y: Math.max(0, Math.min(100, dragStartCP.current.oy - dy)) }); }}
              onTouchEnd={() => setIsDraggingCP(false)}
            >
              <img
                src={cropSrcCP}
                alt="Cover preview"
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${cropPosCP.y}%`, userSelect: "none" }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Drag up/down to adjust the visible area</p>
            <div className="flex gap-3">
              <button onClick={() => { setCropSrcCP(null); setCropFileCP(null); }} className="flex-1 py-2 border border-border rounded text-sm font-bold hover:bg-muted transition-colors">Cancel</button>
              <button onClick={applyCropCP} disabled={uploading} className="flex-1 py-2 bg-[var(--its-red)] text-white rounded text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                {uploading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Cover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-xs flex flex-col gap-4">
            <p className="text-sm font-bold text-foreground">Delete this cover photo?</p>
            <p className="text-xs text-muted-foreground">This will permanently remove the cover photo.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 border border-border rounded text-sm font-bold hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => { deleteMutation.mutate({ photoId: confirmDeleteId }); setConfirmDeleteId(null); }}
                className="flex-1 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 transition-colors"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {isOwnProfile && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-video border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-[var(--its-red)] hover:text-[var(--its-red)] transition-colors text-muted-foreground"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span className="text-xs font-bold">Add Cover</span>
            </button>
          )}
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-video">
              <img src={photo.url} alt="Cover" className="w-full h-full object-cover rounded" />
              {photo.isActive && (
                <div className="absolute top-1 left-1 bg-[var(--its-red)] text-white p-0.5 rounded-full">
                  <Star size={10} fill="white" />
                </div>
              )}
              {isOwnProfile && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
                  {!photo.isActive && (
                    <button
                      onClick={() => setActiveMutation.mutate({ photoId: photo.id })}
                      className="bg-white text-black p-1.5 rounded-full hover:bg-[var(--its-red)] hover:text-white transition-colors"
                      title="Set as cover photo"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(photo.id)}
                    className="bg-white text-black p-1.5 rounded-full hover:bg-red-600 hover:text-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>
    </div>
  );
}

// ─── Passkey Manager ──────────────────────────────────────────────────────────
function PasskeyManager() {
  const [deviceName, setDeviceName] = useState("My Device");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const utils = trpc.useUtils();

  const { data: passkeys, isLoading } = trpc.auth.listPasskeys.useQuery();

  const registrationOptionsMutation = trpc.auth.passkeyRegistrationOptions.useMutation();
  const verifyRegistrationMutation = trpc.auth.verifyPasskeyRegistration.useMutation({
    onSuccess: () => {
      setSuccess("Passkey registered! You can now sign in with biometrics.");
      setRegistering(false);
      utils.auth.listPasskeys.invalidate();
    },
    onError: (e) => { setError(e.message); setRegistering(false); },
  });

  const deletePasskeyMutation = trpc.auth.deletePasskey.useMutation({
    onSuccess: () => utils.auth.listPasskeys.invalidate(),
    onError: (e) => setError(e.message),
  });

  const handleRegister = async () => {
    if (!browserSupportsWebAuthn()) {
      setError("Your browser does not support passkeys. Try Chrome, Safari, or Edge.");
      return;
    }
    setError("");
    setSuccess("");
    setRegistering(true);
    try {
      const { options, challengeId } = await registrationOptionsMutation.mutateAsync();
      const response = await startRegistration({ optionsJSON: options });
      await verifyRegistrationMutation.mutateAsync({ challengeId, response, deviceName });
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setError("Passkey registration was cancelled or timed out.");
      } else {
        setError(err?.message ?? "Passkey registration failed.");
      }
      setRegistering(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm p-6 mt-4 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="its-accent" />
        <h2 className="text-xs font-black tracking-widest uppercase text-foreground">Passkeys & Biometrics</h2>
        <div className="flex-1 its-divider" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Sign in instantly with Face ID, Touch ID, fingerprint, or Windows Hello — no password required.
      </p>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      {success && <p className="text-xs text-green-600 mb-3">{success}</p>}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin" size={18} /></div>
      ) : (
        <>
          {passkeys && passkeys.length > 0 ? (
            <div className="space-y-2 mb-4">
              {passkeys.map((pk) => (
                <div key={pk.id} className="flex items-center justify-between border border-border px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={16} className="text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{pk.deviceName}</p>
                      <p className="text-xs text-muted-foreground">Added {new Date(pk.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deletePasskeyMutation.mutate({ id: pk.id })}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-4">No passkeys registered yet.</p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Device name (e.g. My iPhone)"
              className="flex-1 px-3 py-2 text-sm border border-border bg-background text-foreground outline-none focus:border-primary"
              maxLength={100}
            />
            <button
              onClick={handleRegister}
              disabled={registering || !deviceName.trim()}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-primary hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {registering ? <Loader2 size={12} className="animate-spin" /> : <Fingerprint size={12} />}
              {registering ? "Registering…" : "Add Passkey"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Profile Content Tabs (Posts / Photos / Videos / Documents) ───────────────
type GalleryTab = "posts" | "photos" | "videos" | "docs" | "saved";

function VideoThumbnail({ video, onPlay }: { video: { id: number; url: string; createdAt: Date; videoViews?: number }; onPlay: () => void }) {
  const { user } = useAuth();
  const [duration, setDuration] = useState<string | null>(null);
  // Use server-side view count as the source of truth, fall back to localStorage for guests
  const [localViews, setLocalViews] = useState<number>(() => {
    try { return Number(localStorage.getItem(`video_views_${video.id}`) ?? 0); } catch { return 0; }
  });
  const serverViews = video.videoViews ?? 0;
  const viewCount = Math.max(serverViews, localViews);

  const incrementViews = trpc.videoViews.increment.useMutation({
    onSuccess: (data) => {
      // Update localStorage to stay in sync
      try { localStorage.setItem(`video_views_${video.id}`, String(data.videoViews)); } catch {}
    },
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const formatViews = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const handlePlay = () => {
    // Increment locally for instant feedback
    const next = localViews + 1;
    setLocalViews(next);
    try { localStorage.setItem(`video_views_${video.id}`, String(next)); } catch {}
    // Persist to server if logged in
    if (user) incrementViews.mutate({ postId: video.id });
    onPlay();
  };
  return (
    <div
      className="relative group aspect-video bg-black overflow-hidden rounded cursor-pointer"
      onClick={handlePlay}
    >
      <video
        src={video.url}
        className="w-full h-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
        muted
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = (e.target as HTMLVideoElement).duration;
          if (isFinite(d)) setDuration(formatDuration(d));
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/60 rounded-full p-3 group-hover:bg-[var(--its-red)] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      {/* Bottom row: views left, duration right */}
      <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between pointer-events-none">
        {viewCount > 0 && (
          <div className="bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="white"/></svg>
            {formatViews(viewCount)}
          </div>
        )}
        {duration && (
          <div className="ml-auto bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {duration}
          </div>
        )}
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </div>
  );
}

function ProfileContentTabs({
  userId,
  isOwnProfile,
  user,
  postsData,
  postsLoading,
  refetchPosts,
}: {
  userId: number;
  isOwnProfile: boolean;
  user: { id: number; name: string | null; avatar: string | null };
  postsData: any[] | undefined;
  postsLoading: boolean;
  refetchPosts: () => void;
}) {
  const [activeTab, setActiveTab] = useState<GalleryTab>("posts");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [videoLightboxUrl, setVideoLightboxUrl] = useState<string | null>(null);
  const [photoSort, setPhotoSort] = useState<"newest" | "oldest" | "most_liked" | "most_commented">("newest");
  const [videoSort, setVideoSort] = useState<"newest" | "oldest" | "most_viewed">("newest");
  const [bulkSelect, setBulkSelect] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: galleryPhotos = [], isLoading: photosLoading } = trpc.photos.getGalleryPhotos.useQuery(
    { userId },
    { enabled: activeTab === "photos" }
  );
  const { data: galleryVideos = [], isLoading: videosLoading } = trpc.photos.getGalleryVideos.useQuery(
    { userId },
    { enabled: activeTab === "videos" }
  );
  const { data: galleryDocs = [], isLoading: docsLoading } = trpc.photos.getGalleryDocs.useQuery(
    { userId },
    { enabled: activeTab === "docs" }
  );
  const { data: savedData, isLoading: savedLoading } = trpc.bookmarks.getSaved.useQuery(
    { limit: 30, offset: 0 },
    { enabled: isOwnProfile && activeTab === "saved" }
  );

  const tabs: { id: GalleryTab; label: string }[] = [
    { id: "posts", label: "Posts" },
    { id: "photos", label: "Photos" },
    { id: "videos", label: "Videos" },
    { id: "docs", label: "Documents" },
    ...(isOwnProfile ? [{ id: "saved" as GalleryTab, label: "Saved" }] : []),
  ];

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex border-b border-border mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[var(--its-red)] text-[var(--its-red)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        postsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-foreground" size={20} /></div>
        ) : postsData && postsData.length > 0 ? (
          <div>
            {[...postsData]
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
              })
              .map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  author={{ id: user.id, name: user.name, avatar: user.avatar ?? null }}
                  likeCount={0}
                  isLiked={false}
                  onDelete={() => refetchPosts()}
                  showPinActions={true}
                  onPinChange={() => refetchPosts()}
                />
              ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No posts yet.</p>
          </div>
        )
      )}

      {/* Photos tab */}
      {activeTab === "photos" && (
        photosLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
        ) : galleryPhotos.length > 0 ? (
          <>
            {lightboxPhoto && (
              <ImageLightbox
                src={lightboxPhoto}
                alt="Photo"
                onClose={() => setLightboxPhoto(null)}
                photos={galleryPhotos.map((p) => p.url)}
                initialIndex={lightboxIndex}
                postId={galleryPhotos.find((p) => p.url === lightboxPhoto)?.postId ?? galleryPhotos.find((p) => p.url === lightboxPhoto)?.id}
              />
            )}
            {/* Sort bar + Bulk select controls */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Sort:</span>
              {(["newest", "oldest", "most_liked", "most_commented"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setPhotoSort(s)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border transition-colors ${
                    photoSort === s
                      ? "bg-[var(--its-red)] text-white border-[var(--its-red)]"
                      : "border-border text-muted-foreground hover:border-[var(--its-red)] hover:text-[var(--its-red)]"
                  }`}
                >
                  {s === "newest" ? "Newest" : s === "oldest" ? "Oldest" : s === "most_liked" ? "Most Liked" : "Most Commented"}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                {bulkSelect && selectedPhotos.size > 0 && (
                  <button
                    disabled={isDownloading}
                    onClick={async () => {
                      setIsDownloading(true);
                      try {
                        const JSZip = (await import("jszip")).default;
                        const zip = new JSZip();
                        const folder = zip.folder("photos")!;
                        const selected = galleryPhotos.filter((p) => selectedPhotos.has(p.url));
                        await Promise.all(selected.map(async (p, i) => {
                          const res = await fetch(p.url);
                          const blob = await res.blob();
                          const ext = p.url.split(".").pop()?.split("?")[0] || "jpg";
                          folder.file(`photo_${i + 1}.${ext}`, blob);
                        }));
                        const content = await zip.generateAsync({ type: "blob" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(content);
                        link.download = `photos_${selected.length}.zip`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);
                        setSelectedPhotos(new Set());
                        setBulkSelect(false);
                      } finally {
                        setIsDownloading(false);
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full bg-[var(--its-red)] text-white border border-[var(--its-red)] flex items-center gap-1 disabled:opacity-60"
                  >
                    {isDownloading ? "Zipping..." : `Download ${selectedPhotos.size}`}
                  </button>
                )}
                {bulkSelect && (
                  <button
                    onClick={() => {
                      const allUrls = galleryPhotos.map((p) => p.url);
                      const allSelected = allUrls.every((url) => selectedPhotos.has(url));
                      if (allSelected) {
                        setSelectedPhotos(new Set());
                      } else {
                        setSelectedPhotos(new Set(allUrls));
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border border-border text-muted-foreground hover:border-[var(--its-red)] hover:text-[var(--its-red)] transition-colors"
                  >
                    {galleryPhotos.every((p) => selectedPhotos.has(p.url)) ? "Deselect All" : "All"}
                  </button>
                )}
                {bulkSelect && (
                  <button
                    onClick={() => { setBulkSelect(false); setSelectedPhotos(new Set()); }}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border border-border text-muted-foreground hover:border-[var(--its-red)] hover:text-[var(--its-red)] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {!bulkSelect && (
                  <button
                    onClick={() => setBulkSelect(true)}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border border-border text-muted-foreground hover:border-[var(--its-red)] hover:text-[var(--its-red)] transition-colors"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {[...galleryPhotos]
                .sort((a, b) => {
                  if (photoSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  if (photoSort === "most_liked") return (b.likeCount ?? 0) - (a.likeCount ?? 0);
                  if (photoSort === "most_commented") return (b.commentCount ?? 0) - (a.commentCount ?? 0);
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((photo, idx) => {
                  const isSelected = selectedPhotos.has(photo.url);
                  return (
                <div
                  key={`${photo.id}-${photo.url}`}
                  className={`relative group aspect-square bg-muted overflow-hidden cursor-pointer ${isSelected ? "ring-2 ring-[var(--its-red)] ring-offset-1" : ""} ${
                    idx === 0 && (photoSort === "most_liked" || photoSort === "most_commented") && ((photo.likeCount ?? 0) > 0 || (photo.commentCount ?? 0) > 0)
                      ? "ring-2 ring-yellow-400 ring-offset-1"
                      : ""
                  }`}
                  onClick={() => {
                    if (bulkSelect) {
                      setSelectedPhotos(prev => {
                        const next = new Set(prev);
                        if (next.has(photo.url)) next.delete(photo.url);
                        else next.add(photo.url);
                        return next;
                      });
                    } else {
                      setLightboxIndex(idx);
                      setLightboxPhoto(photo.url);
                    }
                  }}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <svg className="opacity-0 group-hover:opacity-100 transition-opacity" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
                  </div>
                  {/* Multi-photo badge */}
                  {(photo.url2 || photo.url3) && (
                    <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                      {[photo.url2, photo.url3].filter(Boolean).length + 1}
                    </div>
                  )}
                  {/* Comment count badge */}
                  {(photo.commentCount ?? 0) > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {photo.commentCount}
                    </div>
                  )}
                  {/* Crown for top photo when sorted */}
                  {idx === 0 && (photoSort === "most_liked" || photoSort === "most_commented") && (
                    <div className="absolute top-1 left-1 text-base leading-none" title="Top photo">
                      <span role="img" aria-label="crown">&#x1F451;</span>
                    </div>
                  )}
                  {/* Like count badge */}
                  {(photo.likeCount ?? 0) > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#ff4d4d"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {photo.likeCount}
                    </div>
                  )}
                  {/* Bulk select checkbox */}
                  {bulkSelect && (
                    <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-[var(--its-red)] border-[var(--its-red)]" : "bg-black/40 border-white"
                    }`}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  )}
                </div>
              );
                })}
            </div>
            {/* Crown badge for top photo */}
            <p className="text-center text-xs text-muted-foreground mt-3 font-medium">{galleryPhotos.length} photo{galleryPhotos.length !== 1 ? "s" : ""}</p>
          </>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No photos posted yet.</p>
          </div>
        )
      )}

      {/* Videos tab */}
      {activeTab === "videos" && (
        videosLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
        ) : galleryVideos.length > 0 ? (
          <>
            {/* Video sort bar */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Sort:</span>
              {(["newest", "oldest", "most_viewed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setVideoSort(s)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border transition-colors ${
                    videoSort === s
                      ? "bg-[var(--its-red)] text-white border-[var(--its-red)]"
                      : "border-border text-muted-foreground hover:border-[var(--its-red)] hover:text-[var(--its-red)]"
                  }`}
                >
                  {s === "newest" ? "Newest" : s === "oldest" ? "Oldest" : "Most Viewed"}
                </button>
              ))}
            </div>
            {/* Video lightbox overlay */}
            {videoLightboxUrl && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
                onClick={() => setVideoLightboxUrl(null)}
              >
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button
                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement("a");
                      link.href = videoLightboxUrl!;
                      link.download = videoLightboxUrl!.split("/").pop() || "video.mp4";
                      link.target = "_blank";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    aria-label="Download video"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button
                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setVideoLightboxUrl(null); }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <video
                  src={videoLightboxUrl}
                  className="max-w-[95vw] max-h-[88vh] rounded-lg shadow-2xl"
                  controls
                  autoPlay
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-[10px] pointer-events-none">
                  Tap outside to close
                </p>
              </div>
            )}
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...galleryVideos]
                .sort((a, b) => {
                  if (videoSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  if (videoSort === "most_viewed") {
                    const va = parseInt(localStorage.getItem(`video_views_${a.id}`) || "0", 10);
                    const vb = parseInt(localStorage.getItem(`video_views_${b.id}`) || "0", 10);
                    return vb - va;
                  }
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((video, idx) => (
                  <div key={video.id} className="relative">
                    {idx === 0 && videoSort === "most_viewed" && parseInt(localStorage.getItem(`video_views_${video.id}`) || "0", 10) > 0 && (
                      <div className="absolute top-1.5 left-1.5 z-10 bg-yellow-400 text-yellow-900 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                        <span>👑</span> TOP
                      </div>
                    )}
                    <VideoThumbnail video={video} onPlay={() => setVideoLightboxUrl(video.url)} />
                  </div>
              ))}

            </div>
            <p className="text-center text-xs text-muted-foreground mt-3 font-medium">{galleryVideos.length} video{galleryVideos.length !== 1 ? "s" : ""}</p>
          </>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No videos posted yet.</p>
          </div>
        )
      )}

      {/* Documents tab */}
      {activeTab === "docs" && (
        docsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
        ) : galleryDocs.length > 0 ? (
          <div className="space-y-2">
            {galleryDocs.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 border border-border px-4 py-3 hover:bg-muted/50 transition-colors group"
              >
                <div className="w-8 h-8 bg-[var(--its-red)]/10 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--its-red)]">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-[var(--its-red)]">
                    {doc.name ?? "Document"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doc.docType ?? ""}{doc.size ? ` · ${formatBytes(doc.size)}` : ""} · {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No documents posted yet.</p>
          </div>
        )
      )}

      {/* Saved tab */}
      {activeTab === "saved" && isOwnProfile && (
        savedLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
        ) : savedData && savedData.posts.length > 0 ? (
          <div className="space-y-4">
            {savedData.posts.map((post: any) => {
              const author = savedData.authors[post.authorId];
              const likeCount = savedData.likeCounts[post.id] ?? 0;
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  author={author}
                  likeCount={likeCount}
                  isLiked={false}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No saved posts yet.</p>
            <p className="text-xs text-muted-foreground mt-2">Tap the bookmark icon on any post to save it here.</p>
          </div>
        )
      )}
    </div>
  );
}

// ─── Highlights Section ───────────────────────────────────────────────────────
interface HighlightItem {
  id: number;
  highlightId: number;
  mediaUrl: string;
  mediaType: "photo" | "video";
  caption: string | null;
  addedAt: Date;
}

interface HighlightData {
  id: number;
  authorId: number;
  title: string;
  coverUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function HighlightViewer({
  highlight,
  onClose,
  isOwn,
}: {
  highlight: HighlightData;
  onClose: () => void;
  isOwn: boolean;
}) {
  const [index, setIndex] = useState(0);
  const utils = trpc.useUtils();
  const { data: items = [] } = trpc.stories.getHighlightItems.useQuery({ highlightId: highlight.id });
  const removeItem = trpc.stories.removeFromHighlight.useMutation({
    onSuccess: () => utils.stories.getHighlightItems.invalidate({ highlightId: highlight.id }),
  });
  const deleteHighlight = trpc.stories.deleteHighlight.useMutation({
    onSuccess: () => {
      utils.stories.getHighlights.invalidate();
      onClose();
      toast.success("Highlight deleted.");
    },
  });

  const typedItems = items as HighlightItem[];
  const item = typedItems[index];

  if (!item && typedItems.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-sm text-white/60 mb-4">This highlight is empty.</p>
          {isOwn && (
            <button
              className="text-red-400 text-sm hover:text-red-300"
              onClick={() => deleteHighlight.mutate({ highlightId: highlight.id })}
            >
              Delete highlight
            </button>
          )}
          <button className="block mx-auto mt-4 text-white/60 hover:text-white" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Progress dots */}
      <div className="absolute top-2 left-0 right-0 flex gap-1 px-4 z-10">
        {typedItems.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-0.5 rounded-full ${i <= index ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-yellow-400" />
          <span className="text-white text-sm font-semibold">{highlight.title}</span>
        </div>
        <div className="flex items-center gap-3">
          {isOwn && item && (
            <button
              className="text-white/60 hover:text-red-400 transition-colors"
              title="Remove from highlight"
              onClick={() => {
                removeItem.mutate({ itemId: item.id, highlightId: highlight.id });
                if (index > 0) setIndex(i => i - 1);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isOwn && (
            <button
              className="text-white/60 hover:text-red-400 transition-colors"
              title="Delete highlight"
              onClick={() => deleteHighlight.mutate({ highlightId: highlight.id })}
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          )}
          <button className="text-white/80 hover:text-white" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media */}
      {item && (
        <div className="w-full h-full max-w-sm mx-auto relative">
          {item.mediaType === "video" ? (
            <video src={item.mediaUrl} className="w-full h-full object-cover" autoPlay muted={false} playsInline loop />
          ) : (
            <img src={item.mediaUrl} alt="Highlight" className="w-full h-full object-cover" draggable={false} />
          )}
          {item.caption && (
            <div className="absolute bottom-8 left-0 right-0 px-4">
              <p className="text-white text-center text-sm bg-black/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                {item.caption}
              </p>
            </div>
          )}
          {/* Tap zones */}
          <button className="absolute left-0 top-0 bottom-0 w-1/2" onClick={() => setIndex(i => Math.max(0, i - 1))} />
          <button className="absolute right-0 top-0 bottom-0 w-1/2" onClick={() => {
            if (index + 1 >= typedItems.length) onClose();
            else setIndex(i => i + 1);
          }} />
        </div>
      )}
    </div>
  );
}

function HighlightsSection({ userId, isOwnProfile }: { userId: number; isOwnProfile: boolean }) {
  const utils = trpc.useUtils();
  const [viewingHighlight, setViewingHighlight] = useState<HighlightData | null>(null);
  const { data: highlights = [] } = trpc.stories.getHighlights.useQuery({ userId });
  const typedHighlights = highlights as HighlightData[];

  if (typedHighlights.length === 0 && !isOwnProfile) return null;
  // Own profile with no highlights: show compact info row
  if (typedHighlights.length === 0 && isOwnProfile) return (
    <div className="bg-card rounded-2xl shadow-sm mb-4 px-4 py-3 flex items-center gap-3">
      <Bookmark size={14} className="text-yellow-400 flex-shrink-0" />
      <span className="text-xs font-bold text-muted-foreground">No story highlights yet — add stories to highlights from the story viewer.</span>
    </div>
  );

  return (
    <>
      <div className="bg-card rounded-2xl shadow-sm mb-4 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Story Highlights</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
            {typedHighlights.map(hl => (
              <button
                key={hl.id}
                className="flex flex-col items-center gap-1 flex-shrink-0"
                onClick={() => setViewingHighlight(hl)}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-400 bg-zinc-800 flex items-center justify-center relative">
                  {hl.coverUrl ? (
                    <img src={hl.coverUrl} alt={hl.title} className="w-full h-full object-cover" />
                  ) : (
                    <Play className="w-6 h-6 text-yellow-400" />
                  )}
                </div>
                <span className="text-[10px] text-foreground/80 w-16 text-center truncate">{hl.title}</span>
              </button>
            ))}
          </div>
      </div>

      {viewingHighlight && (
        <HighlightViewer
          highlight={viewingHighlight}
          onClose={() => setViewingHighlight(null)}
          isOwn={isOwnProfile}
        />
      )}
    </>
  );
}
