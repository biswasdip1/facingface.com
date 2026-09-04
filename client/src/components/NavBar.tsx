import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { ChevronDown, Home, User, Bell, Users, MessageCircle, Phone, Search, X, Shield, Lock, LogOut, MessagesSquare, BadgeCheck, Settings, Building2, UsersRound, BookImage, Camera, Bookmark, TrendingUp, CalendarClock, ShoppingBag, Clapperboard, Headphones, Gift, CalendarDays, Megaphone, MoreHorizontal } from "lucide-react";
import { useThemeMode, type ThemeMode } from "@/contexts/ThemeModeContext";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

const THEME_OPTIONS: { mode: ThemeMode; label: string; bg: string; fg: string; ring: string; title: string }[] = [
  { mode: "white",     label: "W",  bg: "#ffffff", fg: "#111111", ring: "#cccccc", title: "White" },
  { mode: "lightblue", label: "LB", bg: "#d0e8f8", fg: "#0d2a40", ring: "#0d2a40", title: "Light Blue" },
  { mode: "beige",     label: "Be", bg: "#f5ede0", fg: "#3a2a18", ring: "#3a2a18", title: "Soft Beige" },
  { mode: "lightdark", label: "LD", bg: "#383838", fg: "#e0e0e0", ring: "#e0e0e0", title: "Light Dark" },
];

// Sub-component: mobile top-left avatar with robust fallback + optional story ring
function MobileAvatar({ user, hasStory }: { user: ReturnType<typeof useAuth>["user"]; hasStory?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const [showUploadHint, setShowUploadHint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();
  const uploadMedia = trpc.media.upload.useMutation();
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => { utils.auth.me.invalidate(); utils.users.getProfile.invalidate(); toast.success("Profile photo updated!"); },
  });

  // Reset error state whenever the avatar URL changes (e.g. after upload)
  const avatarUrl = user?.avatar ?? null;
  useEffect(() => { setImgError(false); }, [avatarUrl]);
  const hasValidAvatar = !!(avatarUrl && avatarUrl.trim() !== "" && !imgError);

  const handleTouchStart = () => {
    if (!user) return;
    longPressTimer.current = setTimeout(() => setShowUploadHint(true), 600);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    setUploading(true);
    setShowUploadHint(false);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadMedia.mutateAsync({ filename: file.name, contentType: file.type, base64, mediaType: "image" });
      await updateProfile.mutateAsync({ avatar: url });
    } catch { toast.error("Upload failed."); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="sm:hidden flex-shrink-0 relative" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Hidden file input for avatar upload */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Gradient story ring with pulse animation */}
      {hasStory && (
        <div
          className="absolute rounded-full story-ring-pulse"
          style={{
            inset: 0,
            background: "linear-gradient(135deg, #f97316 0%, #e63329 40%, #9333ea 100%)",
            borderRadius: "50%",
            zIndex: 0,
          }}
        />
      )}

      {/* Upload hint overlay */}
      {showUploadHint && (
        <div
          className="absolute inset-0 rounded-full flex flex-col items-center justify-center cursor-pointer"
          style={{ backgroundColor: "rgba(0,0,0,0.72)", zIndex: 10, borderRadius: "50%" }}
          onClick={() => { setShowUploadHint(false); fileInputRef.current?.click(); }}
        >
          {uploading ? (
            <span className="text-white text-[9px] font-bold">...</span>
          ) : (
            <>
              <Camera size={12} style={{ color: "#fff" }} />
              <span className="text-white text-[8px] font-bold mt-0.5">Change</span>
            </>
          )}
        </div>
      )}

      <a
        href={user ? `/profile/${user.id}` : "/"}
        className="flex items-center justify-center rounded-full overflow-hidden no-underline transition-all relative"
        style={{
          width: hasStory ? 32 : 36,
          height: hasStory ? 32 : 36,
          border: !hasStory && user ? "2.5px solid var(--its-red)" : !hasStory ? "2px solid var(--its-border)" : "none",
          zIndex: 1,
          backgroundColor: "var(--its-nav-bg)",
          padding: hasStory ? 0 : 1.5,
        }}
        aria-label="Go to profile"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={(e) => { if (showUploadHint) e.preventDefault(); }}
      >
        {hasValidAvatar ? (
          <img
            src={user!.avatar!}
            alt={user?.name ?? ""}
            className="w-full h-full object-cover rounded-full"
            onError={() => setImgError(true)}
          />
        ) : user ? (
          <div
            className="w-full h-full flex items-center justify-center text-sm font-black rounded-full select-none"
            style={{ backgroundColor: "var(--its-red)", color: "#fff" }}
          >
            {(user.name ?? "U").charAt(0).toUpperCase()}
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--its-surface)" }}
          >
            <User size={16} style={{ color: "var(--its-text-muted)" }} />
          </div>
        )}
      </a>
    </div>
  );
}

// Sub-component: desktop nav profile avatar with photo + fallback
function DesktopAvatar({ user, isActive }: { user: ReturnType<typeof useAuth>["user"]; isActive: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const avatarUrl = user?.avatar ?? null;
  useEffect(() => { setImgErr(false); }, [avatarUrl]);
  const hasPhoto = !!(avatarUrl && avatarUrl.trim() !== "" && !imgErr);
  return (
    <span
      className="flex items-center justify-center rounded-full overflow-hidden border-2"
      style={{ width: 24, height: 24, borderColor: isActive ? "var(--its-text-primary)" : "var(--its-border)" }}
    >
      {hasPhoto ? (
        <img src={avatarUrl!} alt={user?.name ?? ""} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
      ) : (
        <span
          className="w-full h-full flex items-center justify-center text-[9px] font-black"
          style={{ backgroundColor: "var(--its-red)", color: "#fff" }}
        >
          {(user?.name ?? "U").charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const { themeMode, setThemeMode } = useThemeMode();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Mobile search overlay
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [homeExpanded, setHomeExpanded] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Swipe-to-open: track touch start position on the left edge
  const swipeTouchStartX = useRef<number | null>(null);
  const swipeTouchStartY = useRef<number | null>(null);
  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Only start tracking if touch begins within 30px of the left edge
    if (touch.clientX <= 30) {
      swipeTouchStartX.current = touch.clientX;
      swipeTouchStartY.current = touch.clientY;
    } else {
      swipeTouchStartX.current = null;
    }
  };
  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (swipeTouchStartX.current === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeTouchStartX.current;
    const dy = Math.abs(touch.clientY - (swipeTouchStartY.current ?? 0));
    // Swipe right at least 60px and mostly horizontal
    if (dx > 60 && dy < 80) {
      setDropdownOpen(true);
      // Haptic feedback on supported devices (short 8ms pulse)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }
    }
    swipeTouchStartX.current = null;
  };

  const { data: searchResults } = trpc.users.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length >= 2 }
  );

  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const { data: friendPendingData } = trpc.friends.pendingCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const friendPendingCount = friendPendingData?.count ?? 0;

  // Unread messages count for mobile badge
  const { data: unreadMsgData } = trpc.dm.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const unreadMsgCount = (unreadMsgData as { count?: number } | undefined)?.count ?? 0;

  // Support unread count (admins only)
  const { data: supportUnreadData } = trpc.support.unreadCount.useQuery(undefined, {
    enabled: !!user && (user.role === "admin" || user.role === "super_admin"),
    refetchInterval: 60000,
  });
  const supportUnreadCount = supportUnreadData?.count ?? 0;

  // Missed call badge
  const { data: missedCallData } = trpc.callHistory.missedCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  const missedCallCount = missedCallData?.count ?? 0;

  // Check if current user has an active story (for mobile nav avatar ring)
  const { data: ownStoryData } = trpc.stories.hasActive.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user?.id, refetchInterval: 60_000 }
  );
  const ownHasStory = ownStoryData?.hasActive ?? false;

  useEffect(() => {
    // Use 'click' (not 'mousedown'/'touchstart') so the event fires AFTER
    // the button's own onClick handler — prevents the dropdown from being
    // destroyed before Sign Out / any menu item click can execute.
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Open mobile search and auto-focus
  const openMobileSearch = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // prevent the click-outside handler from closing it immediately
    setDropdownOpen(false); // close the flyout menu if it was open
    setMobileSearchOpen(true);
    setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
  };

  const isSuperAdmin = user?.role === "super_admin";
  const canAccessAdmin = user?.role === "admin" || isSuperAdmin;

  // All nav items for desktop
  const navItems = [
    { href: "/",                              label: "Home",          icon: Home },
    { href: `/profile/${user?.id ?? ""}`,     label: "Profile",       icon: User },
    { href: "/friends",                       label: "Friends",       icon: Users },
    { href: "/messages",                      label: "Messages",      icon: MessageCircle },
    { href: "/groups",                        label: "Groups",        icon: MessagesSquare },
    { href: "/calls",                         label: "Calls",         icon: Phone },
    { href: "/notifications",                 label: "Notifications", icon: Bell },
    { href: "/reels",                          label: "Reels",         icon: Clapperboard },
    { href: "/saved",                          label: "Saved",         icon: Bookmark },
    { href: "/scheduled",                      label: "Scheduled",     icon: CalendarClock },
    { href: "/trending",                       label: "Trending",      icon: TrendingUp },

  ];

  // Shared dropdown content (used by both mobile profile tap and desktop gear)
  const DropdownMenu = ({ alignLeft, showSignOut = true }: { alignLeft?: boolean; showSignOut?: boolean }) => (
    <div
      className="absolute top-full mt-1 border shadow-lg z-50 min-w-[240px]"
      style={{
        ...(alignLeft ? { left: 0 } : { right: 0 }),
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100dvh - 72px)",
        overflowY: "auto",
        backgroundColor: "var(--its-surface)",
        borderColor: "var(--its-border)",
      }}
    >
      {/* Mobile keeps Sign Out in the account flyout; desktop shows it in the header. */}
      {showSignOut && <button
        onClick={() => { void logout(); setDropdownOpen(false); }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-left transition-colors border-b"
        aria-label="Sign out"
        style={{
          backgroundColor: "var(--its-red)",
          color: "#fff",
          borderColor: "var(--its-border)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        <LogOut size={16} />
        Sign Out
      </button>}

      {/* My Account — second item */}
      {user && (
        <a
          href="/profile"
          className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold no-underline transition-colors border-b"
          style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          onClick={() => setDropdownOpen(false)}
        >
          <User size={14} style={{ color: "var(--its-text-muted)" }} />
          My Account
        </a>
      )}

      {/* Nav links — Home top-level, sub-items collapse/expand on tap */}
      <div className="border-b" style={{ borderColor: "var(--its-border)" }}>
        {/* Home — toggle button */}
        <button
          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold transition-colors border-b"
          style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)", background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          onClick={(e) => { e.stopPropagation(); setHomeExpanded((v) => !v); }}
          aria-label="Toggle home navigation"
          aria-expanded={homeExpanded}
        >
          <Home size={14} style={{ color: "var(--its-text-muted)" }} />
          <span className="flex-1 text-left">Home</span>
          <ChevronDown
            size={13}
            style={{
              color: "var(--its-text-muted)",
              transform: homeExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>
        {/* Sub-items — visible only when homeExpanded */}
        {homeExpanded && navItems.filter(({ label }) => label !== "Home" && label !== "Admin" && label !== "Super Admin").map(({ href, label, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-3 py-2 text-xs font-semibold no-underline transition-colors border-b"
            style={{ paddingLeft: 36, paddingRight: 16, color: "var(--its-text-muted)", borderColor: "var(--its-border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            onClick={() => setDropdownOpen(false)}
          >
            <Icon size={13} style={{ color: "var(--its-text-muted)", flexShrink: 0 }} />
            {label}
          </a>
        ))}
        {/* Admin / Super Admin link if applicable */}
        {canAccessAdmin && (
          <a
            href="/admin"
            className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold no-underline transition-colors"
            style={{
              color: isSuperAdmin ? "#b45309" : "var(--its-text-muted)",
              borderColor: "var(--its-border)",
              backgroundColor: isSuperAdmin ? "rgba(245, 158, 11, 0.12)" : "transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isSuperAdmin ? "rgba(245, 158, 11, 0.2)" : "var(--its-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isSuperAdmin ? "rgba(245, 158, 11, 0.12)" : "transparent")}
            onClick={() => setDropdownOpen(false)}
          >
            <Shield size={13} style={{ color: isSuperAdmin ? "#d97706" : "var(--its-text-muted)", flexShrink: 0 }} />
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </a>
        )}
      </div>

      {/* Theme switcher */}
      <div className="px-4 py-2 border-b" style={{ borderColor: "var(--its-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--its-text-muted)" }}>Theme</p>
        <div className="flex items-center gap-1.5">
          {THEME_OPTIONS.map(({ mode, label, bg, fg, ring, title }) => (
            <button
              key={mode}
              onClick={() => setThemeMode(mode)}
              title={`${title} theme`}
              aria-label={`${title} theme`}
              className="w-8 h-8 text-[10px] font-black tracking-tight flex items-center justify-center transition-all"
              style={{
                backgroundColor: bg,
                color: fg,
                outline: themeMode === mode ? `2px solid var(--its-red)` : `1px solid ${ring}33`,
                outlineOffset: "1px",
                fontFamily: "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stories */}
      <a
        href="/"
        className="flex items-center gap-3 px-4 py-2 text-xs font-semibold no-underline transition-colors border-b"
        style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={(e) => {
          e.preventDefault();
          setDropdownOpen(false);
          const el = document.getElementById("story-bar");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            window.location.href = "/#stories";
          }
        }}
      >
        <BookImage size={14} style={{ color: "var(--its-text-muted)" }} />
        Stories
      </a>

      {/* Get Verified */}
      <a
        href="/subscription"
        className="flex items-center gap-3 px-4 py-2 text-xs font-semibold no-underline transition-colors border-b"
        style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={() => setDropdownOpen(false)}
      >
        <BadgeCheck size={14} style={{ color: "#059669" }} />
        Get Verified
      </a>

      {/* Your Page */}
      <a
        href="/p"
        className="flex items-center gap-3 px-4 py-2 text-xs font-semibold no-underline transition-colors border-b"
        style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={() => setDropdownOpen(false)}
      >
        <Building2 size={14} style={{ color: "#475569" }} />
        Your Page
      </a>

      {/* Public Group */}
      <a
        href="/g"
        className="flex items-center gap-3 px-4 py-2 text-xs font-semibold no-underline transition-colors border-b"
        style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={() => setDropdownOpen(false)}
      >
        <UsersRound size={14} style={{ color: "#4f46e5" }} />
        Public Group
      </a>

      {/* Sale & Buy Marketing */}
      <a
        href="/shop"
        className="flex items-center gap-3 px-4 py-2 text-xs font-semibold no-underline transition-colors border-b"
        style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={() => setDropdownOpen(false)}
      >
        <Megaphone size={14} style={{ color: "#0891b2" }} />
        Sale &amp; Buy (Marketing)
      </a>

      {/* More — Birthday and Event above Security */}
      <div className="border-b" style={{ borderColor: "var(--its-border)" }}>
        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold transition-colors"
          style={{ color: "var(--its-text-primary)", background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          onClick={(e) => { e.stopPropagation(); setMoreExpanded((v) => !v); }}
          aria-label="Toggle more menu"
          aria-expanded={moreExpanded}
        >
          <span className="flex-1 text-left font-black uppercase tracking-widest flex items-center gap-2"><MoreHorizontal size={14} style={{ color: "var(--its-text-muted)" }} /> More &gt;&gt;</span>
          <ChevronDown
            size={13}
            style={{
              color: "var(--its-text-muted)",
              transform: moreExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>
        {moreExpanded && (
          <>
            <a
              href="/birthdays"
              className="flex items-center gap-3 py-2 text-xs font-semibold no-underline transition-colors border-t"
              style={{ paddingLeft: 36, paddingRight: 16, color: "var(--its-text-muted)", borderColor: "var(--its-border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              onClick={() => { setMoreExpanded(false); setDropdownOpen(false); }}
            >
              <Gift size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
              Birthday
            </a>
            <a
              href="/events"
              className="flex items-center gap-3 py-2 text-xs font-semibold no-underline transition-colors border-t"
              style={{ paddingLeft: 36, paddingRight: 16, color: "var(--its-text-muted)", borderColor: "var(--its-border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              onClick={() => { setMoreExpanded(false); setDropdownOpen(false); }}
            >
              <CalendarDays size={13} style={{ color: "#0284c7", flexShrink: 0 }} />
              Event
            </a>
          </>
        )}
      </div>

      {/* Security */}
      <a
        href="/security"
        className="flex items-center gap-3 px-4 py-2 text-xs font-semibold no-underline transition-colors border-b"
        style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={() => setDropdownOpen(false)}
      >
        <Lock size={14} style={{ color: "var(--its-text-muted)" }} />
        Security
      </a>
      {/* Blocked Users */}
      <a
        href="/blocked-users"
        className="flex items-center gap-3 px-4 py-2 text-xs font-semibold no-underline transition-colors border-b"
        style={{ color: "var(--its-text-primary)", borderColor: "var(--its-border)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={() => setDropdownOpen(false)}
      >
        <Shield size={14} style={{ color: "var(--its-text-muted)" }} />
        Blocked Users
      </a>
      {/* Contact & Support — bottom of menu, highlighted */}
      <a
        href="/contact-support"
        className="flex items-center gap-3 px-4 py-3 text-xs font-bold no-underline transition-colors"
        style={{
          color: "var(--its-red)",
          borderTop: "2px solid var(--its-border)",
          backgroundColor: "transparent",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onClick={() => setDropdownOpen(false)}
      >
        <Headphones size={15} style={{ color: "var(--its-red)" }} />
        Contact &amp; Support
        {supportUnreadCount > 0 && (
          <span
            className="ml-auto flex items-center justify-center rounded-full text-[10px] font-black text-white"
            style={{ minWidth: 18, height: 18, backgroundColor: "var(--its-red)", padding: "0 4px" }}
          >
            {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
          </span>
        )}
      </a>
    </div>
  );

  // Active state helper for mobile right icons
  const isActive = (path: string) => location === path || (path !== "/" && location.startsWith(path));

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        backgroundColor: "var(--its-nav-bg)",
        borderColor: "var(--its-nav-border)",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
      onTouchStart={handleSwipeTouchStart}
      onTouchEnd={handleSwipeTouchEnd}
    >
      {/* ── Swipe indicator pill (left edge, mobile only) ── */}
      {!dropdownOpen && (
        <div
          className="sm:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none"
          style={{ width: 6, height: 48 }}
        >
          <div
            className="rounded-full"
            style={{ width: 4, height: 36, backgroundColor: "var(--its-text-muted)", opacity: 0.35 }}
          />
        </div>
      )}
      {/* ── Mobile search expansion (slides in from right, overlays the top bar) ── */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="sm:hidden absolute top-0 left-0 right-0 z-50 h-16 flex items-center gap-2 px-3"
          style={{
            backgroundColor: "var(--its-nav-bg)",
            borderBottom: "1px solid var(--its-nav-border)",
            animation: "slideInFromRight 0.18s ease-out",
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 border flex-1"
            style={{ borderColor: "var(--its-border)", backgroundColor: "var(--its-surface)" }}
          >
            <Search size={13} style={{ color: "var(--its-text-muted)", flexShrink: 0 }} />
            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                  setMobileSearchOpen(false);
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: "var(--its-text-primary)", fontFamily: "inherit" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="flex-shrink-0" aria-label="Clear search">
                <X size={13} style={{ color: "var(--its-text-muted)" }} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); }}
            className="text-xs font-semibold flex-shrink-0 px-1"
            style={{ color: "var(--its-text-muted)" }}
          >
            Cancel
          </button>
          {/* Mobile search results dropdown */}
          {searchQuery.trim().length >= 2 && searchResults && searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 border shadow-lg"
              style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)", maxHeight: 280, overflowY: "auto" }}
            >
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ borderBottom: "1px solid var(--its-border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  onClick={() => { setSearchQuery(""); setMobileSearchOpen(false); navigate(`/profile/${u.id}`); }}
                >
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name ?? ""} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--its-text-primary)" }}>
                      <span className="text-xs font-bold" style={{ color: "var(--its-surface)" }}>{(u.name ?? "U").charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--its-text-primary)" }}>{u.name}</p>
                    {u.bio && <p className="text-xs truncate" style={{ color: "var(--its-text-muted)" }}>{u.bio}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim().length >= 2 && (!searchResults || searchResults.length === 0) && (
            <div
              className="absolute top-full left-0 right-0 border shadow-lg px-4 py-3"
              style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--its-text-muted)" }}>No users found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      <div className="container flex items-center h-16 gap-0 sm:gap-2">

        {/* ══════════════════════════════════════════════
            MOBILE LAYOUT (hidden on sm+)
        ══════════════════════════════════════════════ */}

        {/* Mobile Left: Profile avatar → navigates to profile, red ring when logged in */}
        <MobileAvatar user={user} hasStory={ownHasStory} />


        {/* Mobile Centre: Logo — flex-1, centred */}
        <Link
          href="/"
          className="sm:hidden flex-1 flex items-center justify-center gap-1.5 no-underline"
          style={{ pointerEvents: dropdownOpen ? "none" : "auto", opacity: dropdownOpen ? 0 : 1 }}
        >
          {/* Red FF square — slightly smaller */}
          <span
            className="flex items-center justify-center font-black text-xs select-none flex-shrink-0"
            style={{
              width: 24,
              height: 24,
              backgroundColor: "var(--its-red)",
              color: "#fff",
              letterSpacing: "-0.03em",
            }}
          >
            FF
          </span>
          <span
            className="font-black text-sm select-none whitespace-nowrap"
            style={{ color: "var(--its-text-primary)", letterSpacing: "-0.02em" }}
          >
            FacingFace<span
              className="font-semibold"
              style={{ color: "var(--its-red)", fontSize: "0.75rem", letterSpacing: "0" }}
            >.com</span>
          </span>
        </Link>

        {/* Mobile Right: Search + Notifications + Settings */}
        <div
          ref={dropdownRef}
          className="sm:hidden flex items-center gap-0.5 flex-shrink-0 relative"
          style={{ marginLeft: 4 }}
        >
          {/* Search — active when mobile search overlay is open */}
          <button
            onClick={(e) => openMobileSearch(e)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{
              color: mobileSearchOpen ? "var(--its-red)" : "var(--its-text-muted)",
              backgroundColor: mobileSearchOpen ? "rgba(230,51,41,0.1)" : "transparent",
              position: "relative",
              zIndex: 60, // ensure above the dropdown overlay
            }}
            aria-label="Search"
          >
            <Search size={24} strokeWidth={mobileSearchOpen ? 2.4 : 1.8} />
          </button>

          {/* Notifications — active when on /notifications, red dot when unread */}
          <Link
            href="/notifications"
            className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors no-underline"
            style={{
              color: isActive("/notifications") ? "var(--its-red)" : "var(--its-text-muted)",
              backgroundColor: isActive("/notifications") ? "rgba(230,51,41,0.1)" : "transparent",
            }}
            aria-label="Notifications"
          >
            <Bell size={24} strokeWidth={isActive("/notifications") ? 2.4 : 1.8} />
            {/* Red dot — small solid circle when there are unread notifications */}
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  backgroundColor: "var(--its-red)",
                  borderColor: "var(--its-nav-bg)",
                }}
              />
            )}
          </Link>

          {/* Messages — with unread badge */}
          {user && (
            <Link
              href="/messages"
              className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors no-underline"
              style={{
                color: isActive("/messages") ? "var(--its-red)" : "var(--its-text-muted)",
                backgroundColor: isActive("/messages") ? "rgba(230,51,41,0.1)" : "transparent",
              }}
              aria-label="Messages"
            >
              <MessageCircle size={24} strokeWidth={isActive("/messages") ? 2.4 : 1.8} />
              {unreadMsgCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 rounded-full border-2 inline-flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                  style={{ backgroundColor: "var(--its-red)", borderColor: "var(--its-nav-bg)" }}
                >
                  {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                </span>
              )}
            </Link>
          )}
          {/* Settings gear — opens dropdown, right-aligned */}
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v); }}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{
                color: dropdownOpen ? "var(--its-red)" : "var(--its-text-muted)",
                backgroundColor: dropdownOpen ? "rgba(230,51,41,0.1)" : "transparent",
              }}
              aria-label="More"
            >
              <Settings size={24} strokeWidth={dropdownOpen ? 2.4 : 1.8} />
            </button>
          )}
          {dropdownOpen && <DropdownMenu />}
        </div>

        {/* ══════════════════════════════════════════════
            DESKTOP LAYOUT (hidden on mobile, shown sm+)
        ══════════════════════════════════════════════ */}

        {/* Desktop Left: Logo */}
        <Link href="/" className="hidden sm:flex items-center gap-2 no-underline flex-shrink-0">
          <span
            className="flex items-center justify-center font-black text-xs tracking-tight select-none flex-shrink-0"
            style={{ width: 28, height: 28, backgroundColor: "#E63329", color: "#ffffff", fontFamily: "inherit" }}
          >
            FF
          </span>
          <span
            className="hidden sm:block font-black text-sm select-none whitespace-nowrap"
            style={{ color: "var(--its-text-primary)", letterSpacing: "-0.02em" }}
          >
            FacingFace<span
              className="font-semibold"
              style={{ color: "var(--its-red)", fontSize: "0.75rem", letterSpacing: "0" }}
            >.com</span>
          </span>
        </Link>

        {/* Desktop Search bar */}
        <div ref={searchRef} className="relative hidden lg:flex items-center flex-1 max-w-xs">
          <div
            className="flex items-center gap-2 px-3 py-1.5 border w-full"
            style={{ borderColor: "var(--its-border)", backgroundColor: "var(--its-surface)" }}
          >
            <Search size={13} style={{ color: "var(--its-text-muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                  setSearchOpen(false);
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="bg-transparent outline-none text-xs w-full"
              style={{ color: "var(--its-text-primary)", fontFamily: "inherit" }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="flex-shrink-0" aria-label="Clear search">
                <X size={11} style={{ color: "var(--its-text-muted)" }} />
              </button>
            )}
          </div>
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 border shadow-lg z-50"
              style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)", maxHeight: 320, overflowY: "auto" }}
            >
              {!searchResults || searchResults.length === 0 ? (
                <div className="px-4 py-3 text-xs" style={{ color: "var(--its-text-muted)" }}>
                  No users found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ borderBottom: "1px solid var(--its-border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    onClick={() => { setSearchQuery(""); setSearchOpen(false); navigate(`/profile/${u.id}`); }}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name ?? ""} className="w-8 h-8 object-cover flex-shrink-0 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full" style={{ backgroundColor: "var(--its-text-primary)" }}>
                        <span className="text-xs font-bold" style={{ color: "var(--its-surface)" }}>{(u.name ?? "U").charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-bold truncate" style={{ color: "var(--its-text-primary)" }}>{u.name}</div>
                      {u.bio && <div className="text-[10px] truncate" style={{ color: "var(--its-text-muted)" }}>{u.bio}</div>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Desktop Nav icons */}
        <nav className="hidden sm:flex items-center gap-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
          {navItems.map(({ href, label, icon: Icon, superAdmin }) => {
            const isActive =
              href === "/" ? location === "/" : location.startsWith(href.split("?")[0]);
            const isProfile = label === "Profile";
            const isSuperAdminItem = Boolean(superAdmin);
            return (
              <span key={label}>
                <Link
                  href={href}
                  onClick={(e) => {
                    // If clicking HOME and already on home page, scroll to top
                    if (label === "Home" && location === "/") {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="relative flex flex-col items-center justify-center px-2 sm:px-3 h-16 text-[9px] font-bold tracking-widest uppercase transition-colors no-underline"
                  style={{
                    color: isSuperAdminItem ? "#b45309" : isActive ? "var(--its-text-primary)" : "var(--its-text-muted)",
                    borderBottom: isActive ? `2px solid ${isSuperAdminItem ? "#d97706" : "var(--its-text-primary)"}` : "2px solid transparent",
                    backgroundColor: isSuperAdminItem ? "rgba(245, 158, 11, 0.1)" : "transparent",
                    cursor: label === "Home" && isActive ? "pointer" : "default",
                  }}
                >
                  <span className="relative">
                    {/* Profile item: show real avatar instead of generic icon */}
                    {isProfile && user ? (
                      <DesktopAvatar user={user} isActive={isActive} />
                    ) : (
                      <Icon size={18} strokeWidth={isSuperAdminItem || isActive ? 2.5 : 1.5} color={isSuperAdminItem ? "#d97706" : undefined} />
                    )}
                    {label === "Notifications" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: "var(--its-red)" }} />
                    )}
                    {label === "Messages" && unreadMsgCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                        style={{ backgroundColor: "var(--its-red)" }}
                      >
                        {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                      </span>
                    )}
                    {label === "Friends" && friendPendingCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                        style={{ backgroundColor: "var(--its-red)" }}
                      >
                        {friendPendingCount > 9 ? "9+" : friendPendingCount}
                      </span>
                    )}
                    {label === "Calls" && missedCallCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                        style={{ backgroundColor: "var(--its-red)" }}
                      >
                        {missedCallCount > 9 ? "9+" : missedCallCount}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5">{label}</span>
                </Link>
              </span>
            );
          })}
        </nav>

        {/* Desktop Right: account controls stay visible together at the far right. */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 pl-2" aria-label="Account controls">
          {canAccessAdmin && (
            <Link
              href="/admin"
              title="Open Admin panel"
              className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded text-[10px] font-bold uppercase tracking-wide no-underline transition-colors"
              style={{ color: "#b45309", backgroundColor: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.32)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245, 158, 11, 0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(245, 158, 11, 0.12)")}
            >
              <Shield size={15} strokeWidth={2.2} /> {isSuperAdmin ? "Admin" : "Admin"}
            </Link>
          )}
          {user && (
            <>
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v); }}
                  title="Settings"
                  aria-label="Open settings menu"
                  aria-expanded={dropdownOpen}
                  className="w-9 h-9 flex items-center justify-center rounded-full border transition-colors"
                  style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)", backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-border)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <Settings size={18} strokeWidth={1.8} />
                </button>
                {dropdownOpen && <DropdownMenu showSignOut={false} />}
              </div>
              <button
                onClick={() => { void logout(); }}
                className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded text-xs font-bold transition-colors"
                style={{ backgroundColor: "var(--its-red)", color: "#fff" }}
                title="Sign out"
                aria-label="Sign out"
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <LogOut size={15} /><span className="hidden md:inline">Sign Out</span>
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
