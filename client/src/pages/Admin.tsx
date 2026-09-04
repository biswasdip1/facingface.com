import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

import {
  Shield, Users, Flag, BarChart3, Settings, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Trash2, CheckCircle, Ban, UserCheck, BadgeCheck, XCircle, ClipboardList,
  ShoppingBag, Eye, AlertTriangle, FileImage, FileVideo, FileAudio, FileText,
  Globe, UsersRound, MessageSquareWarning, Search, BarChart2, Radio, Newspaper,
  Mail, HardDrive, Activity, ExternalLink, RefreshCw, ShieldAlert,
} from "lucide-react";
import { BroadcastComposer, BroadcastsList } from "@/components/BroadcastUI";
import { toast } from "sonner";

type Tab =
  | "overview"
  | "flagged"
  | "users"
  | "limits"
  | "media_limits"
  | "verified"
  | "admins"
  | "audit"
  | "listings"
  | "pages"
  | "groups"
  | "reports"
  | "advertisements"
  | "news_feed"
  | "email_notice"
  | "people_you_may_know"
  | "email_reminders"
  | "system_resources"
  | "posts";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [userViewFilter, setUserViewFilter] = useState<"all" | "suspended">("all");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [suspendUserId, setSuspendUserId] = useState<number | null>(null);
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendReason, setSuspendReason] = useState("");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (tabBarRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabBarRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (tabBarRef.current) {
      const scrollAmount = 200;
      tabBarRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = tabBarRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        ref.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  if (!loading && (!user || (user.role !== "admin" && user.role !== "super_admin"))) {
    navigate("/");
    return null;
  }

  const isSuperAdmin = user?.role === "super_admin";

  const tabs: { id: Tab; label: string; icon: React.ElementType; superOnly?: boolean }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "flagged", label: "Flagged Posts", icon: Flag },
    { id: "reports", label: "Reports", icon: MessageSquareWarning },
    { id: "users", label: "Users", icon: Users },
    { id: "posts", label: "All Posts", icon: ClipboardList, superOnly: true },
    { id: "pages", label: "Pages", icon: Globe },
    { id: "groups", label: "Public Groups", icon: UsersRound },
    { id: "listings", label: "Buy & Sale Shop", icon: ShoppingBag },
    { id: "limits", label: "Daily Limits", icon: Settings },
    { id: "media_limits", label: "Media Limits", icon: FileImage, superOnly: true },
    { id: "verified", label: "Verified", icon: BadgeCheck },
    { id: "admins", label: "Admins", icon: Shield, superOnly: true },
    { id: "audit", label: "Audit Log", icon: ClipboardList, superOnly: true },
    { id: "advertisements", label: "Advertisements", icon: Radio },
    { id: "news_feed", label: "News Feed", icon: Newspaper },
    { id: "email_notice", label: "E-mail/Notice", icon: Mail },
    { id: "people_you_may_know", label: "People You May Know", icon: Users, superOnly: true },
    { id: "email_reminders", label: "Email Reminders", icon: Mail },
    { id: "system_resources", label: "System Resources", icon: HardDrive, superOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.superOnly || isSuperAdmin);

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: "var(--its-bg)", color: "var(--its-text-primary)" }}>
      <div className="mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield size={28} style={{ color: "var(--its-text-primary)" }} />
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm" style={{ color: "var(--its-text-muted)" }}>Manage FacingFace platform</p>
          </div>
        </div>

        {/* Tabs with scroll buttons */}
        <div className="flex items-center gap-2 mb-6 border-b" style={{ borderColor: "var(--its-border)" }}>
          {/* Left scroll button */}
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="hidden sm:flex items-center justify-center p-2 rounded flex-shrink-0 transition-opacity"
            style={{
              opacity: canScrollLeft ? 1 : 0.3,
              cursor: canScrollLeft ? 'pointer' : 'default',
              color: "var(--its-text-muted)"
            }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Scrollable tabs container */}
          <div
            ref={tabBarRef}
            className="flex gap-0.5 overflow-x-auto scrollbar-none flex-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
                style={{
                  color: activeTab === id ? "var(--its-text-primary)" : "var(--its-text-muted)",
                  borderBottom: activeTab === id ? "2px solid var(--its-text-primary)" : "2px solid transparent",
                  marginBottom: -1,
                  minWidth: 0,
                }}
              >
                <Icon size={15} />
                <span className="leading-none">{label}</span>
              </button>
            ))}
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="hidden sm:flex items-center justify-center p-2 rounded flex-shrink-0 transition-opacity"
            style={{
              opacity: canScrollRight ? 1 : 0.3,
              cursor: canScrollRight ? 'pointer' : 'default',
              color: "var(--its-text-muted)"
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab onNavigate={(destination) => {
          if (destination === "users" || destination === "suspended") {
            setUserViewFilter(destination === "suspended" ? "suspended" : "all");
            setActiveTab("users");
          } else {
            setActiveTab(destination);
          }
        }} />}
        {activeTab === "flagged" && <FlaggedTab expandedPost={expandedPost} setExpandedPost={setExpandedPost} />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "posts" && <AllPostsTab />}
        {activeTab === "users" && (
          <UsersTab
            initialFilter={userViewFilter}
            suspendUserId={suspendUserId}
            setSuspendUserId={setSuspendUserId}
            suspendDays={suspendDays}
            setSuspendDays={setSuspendDays}
            suspendReason={suspendReason}
            setSuspendReason={setSuspendReason}
            isSuperAdmin={isSuperAdmin}
          />
        )}
        {activeTab === "pages" && <PagesTab />}
        {activeTab === "groups" && <GroupsTab />}
        {activeTab === "listings" && <AdminListingsTab />}
        {activeTab === "limits" && <LimitsTab />}
        {activeTab === "media_limits" && <MediaLimitsTab />}
        {activeTab === "verified" && <VerifiedTab />}
        {activeTab === "admins" && <AdminsTab />}
        {activeTab === "audit" && <AuditLogTab />}
        {activeTab === "advertisements" && <AdvertisementsTab />}
        {activeTab === "news_feed" && <NewsFeedSourcesTab />}
        {activeTab === "email_notice" && (
          <div className="space-y-6">
            <BroadcastComposer />
            <div>
              <h3 className="text-lg font-bold mb-4">Sent Notices</h3>
              <BroadcastsList />
            </div>
          </div>
        )}
        {activeTab === "people_you_may_know" && <PeopleYouMayKnowTab />}
        {activeTab === "email_reminders" && <EmailRemindersTab />}
        {activeTab === "system_resources" && <SystemResourcesTab openUsers={() => setActiveTab("users")} />}

      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ onNavigate }: { onNavigate: (destination: "users" | "posts" | "flagged" | "suspended") => void }) {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  if (isLoading) return <LoadingSpinner />;
  const cards: Array<{ label: string; value: number; color: string; destination: "users" | "posts" | "flagged" | "suspended"; detail: string }> = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, color: "#3b82f6", destination: "users", detail: "Open all user accounts" },
    { label: "Total Posts", value: stats?.totalPosts ?? 0, color: "#10b981", destination: "posts", detail: "Open all posts" },
    { label: "Flagged Posts", value: stats?.flaggedPosts ?? 0, color: "#f59e0b", destination: "flagged", detail: "Open flagged-content queue" },
    { label: "Suspended Users", value: stats?.suspendedUsers ?? 0, color: "#ef4444", destination: "suspended", detail: "Open active suspensions" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, color, destination, detail }) => (
        <button key={label} onClick={() => onNavigate(destination)} className="rounded-lg p-5 border text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }} title={detail}>
          <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
          <div className="text-sm" style={{ color: "var(--its-text-muted)" }}>{label}</div>
          <div className="text-xs mt-2" style={{ color }}>View →</div>
        </button>
      ))}
    </div>
  );
}

// ─── All Posts Tab (super_admin) ──────────────────────────────────────────────
function AllPostsTab() {
  const { data, isLoading } = trpc.admin.allPosts.useQuery({ limit: 1000, offset: 0 });
  if (isLoading) return <LoadingSpinner />;
  if (!data?.posts.length) return <EmptyState icon={ClipboardList} message="No posts at this time." />;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
      <div className="p-4 border-b" style={{ borderColor: "var(--its-border)" }}>
        <h2 className="text-lg font-bold">All Posts</h2>
        <p className="text-sm mt-1" style={{ color: "var(--its-text-muted)" }}>Showing {data.posts.length} most recent posts. Use Flagged Posts or Reports for moderation actions.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: "1px solid var(--its-border)" }}><th className="text-left py-3 px-4 text-xs">Post</th><th className="text-left py-3 px-4 text-xs">Author</th><th className="text-left py-3 px-4 text-xs">Created</th><th className="text-left py-3 px-4 text-xs">Type</th><th className="text-left py-3 px-4 text-xs">Status</th><th className="text-right py-3 px-4 text-xs">View</th></tr></thead>
          <tbody>{data.posts.map((post) => <tr key={post.id} style={{ borderBottom: "1px solid var(--its-border)" }}><td className="py-3 px-4 max-w-xs"><div className="font-medium">#{post.id}</div><div className="text-xs truncate max-w-xs" style={{ color: "var(--its-text-muted)" }}>{post.text ?? "(media-only post)"}</div></td><td className="py-3 px-4">{data.authors[post.authorId]?.name ?? `User #${post.authorId}`}</td><td className="py-3 px-4 text-xs">{new Date(post.createdAt).toLocaleString()}</td><td className="py-3 px-4 capitalize">{post.mediaType ?? (post.docUrl ? "document" : post.audioUrl ? "audio" : "text")}</td><td className="py-3 px-4">{post.isFlagged ? <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Flagged</span> : <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Visible</span>}</td><td className="py-3 px-4 text-right"><a href={`/post/${post.id}`} target="_blank" rel="noreferrer" className="inline-flex p-1.5 rounded" style={{ color: "#2563eb" }} title="View post"><Eye size={16} /></a></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function formatResourceBytes(value: number | null | undefined): string {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

// ─── System Resources Tab (super_admin) ───────────────────────────────────────
function SystemResourcesTab({ openUsers }: { openUsers: () => void }) {
  const { data, isLoading, error, refetch, isFetching } = trpc.admin.resourceMonitoring.useQuery(undefined, { refetchInterval: 60_000 });
  if (isLoading) return <LoadingSpinner />;

  const disk = data?.disk;
  const delivery = data?.delivery;
  const diskPercent = disk?.diskUsedPercent ?? null;
  const diskColor = diskPercent !== null && diskPercent >= 90 ? "#dc2626" : diskPercent !== null && diskPercent >= 80 ? "#d97706" : "#059669";
  const signalLabels: Record<string, string> = {
    high_activity: `High activity (≥ ${data?.warningThreshold ?? 20} posts / 24h)`,
    prior_violation: "Prior content violation",
    active_suspension: "Currently suspended",
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border p-5" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><HardDrive size={20} /><h2 className="text-lg font-bold">System Resources & Abuse Control</h2></div>
            <p className="text-sm mt-1" style={{ color: "var(--its-text-muted)" }}>Measured Render persistent-media storage, media delivery through this web process, and accounts requiring review.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-1 px-3 py-2 rounded text-xs font-medium border disabled:opacity-50" style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)" }}><RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh</button>
            <a href={data?.renderMetricsUrl ?? "https://dashboard.render.com/"} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-2 rounded text-xs font-medium text-white" style={{ backgroundColor: "#3b82f6" }}><ExternalLink size={14} /> Render Metrics</a>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--its-text-muted)" }}>For total network egress, CPU, memory, restarts, and service availability, use Render Metrics. This panel does not invent values that the application cannot measure.</p>
      </div>

      {error ? (
        <div className="rounded-lg border p-4 text-sm" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>Resource monitoring could not load: {error.message}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <ResourceMetric icon={HardDrive} label="Persistent disk" value={disk?.available ? `${formatResourceBytes(disk.usedBytes)} / ${formatResourceBytes(disk.capacityBytes)}` : "Unavailable"} detail={disk?.available ? `${disk.fileCount} stored media files` : disk?.error ?? "Attach the Render disk at /var/data"} color={diskColor} />
            <ResourceMetric icon={Activity} label="Disk capacity used" value={diskPercent === null ? "—" : `${diskPercent}%`} detail={disk?.freeBytes == null ? "Not available" : `${formatResourceBytes(disk.freeBytes)} free`} color={diskColor} />
            <ResourceMetric icon={Eye} label="Media delivery" value={String(delivery?.requests ?? 0)} detail={`${formatResourceBytes(delivery?.bytesServed)} served since this web process started`} color="#2563eb" />
            <ResourceMetric icon={AlertTriangle} label="Media path misses" value={String(delivery?.notFoundResponses ?? 0)} detail="404 or legacy 410 media responses since process start" color={(delivery?.notFoundResponses ?? 0) > 0 ? "#d97706" : "#059669"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}><p className="text-xs font-semibold uppercase" style={{ color: "var(--its-text-muted)" }}>Posts with media/audio</p><p className="text-2xl font-bold mt-1">{data?.records.mediaPosts ?? 0}</p></div>
            <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}><p className="text-xs font-semibold uppercase" style={{ color: "var(--its-text-muted)" }}>Documents recorded</p><p className="text-2xl font-bold mt-1">{data?.records.documents ?? 0}</p></div>
            <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}><p className="text-xs font-semibold uppercase" style={{ color: "var(--its-text-muted)" }}>Document bytes recorded</p><p className="text-2xl font-bold mt-1">{formatResourceBytes(data?.records.recordedDocumentBytes)}</p></div>
          </div>

          <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b" style={{ borderColor: "var(--its-border)" }}>
              <div><div className="flex items-center gap-2"><ShieldAlert size={18} style={{ color: "#d97706" }} /><h3 className="font-semibold">Accounts Requiring Review</h3></div><p className="text-xs mt-1" style={{ color: "var(--its-text-muted)" }}>Signals do not suspend or delete anyone automatically. Review the account first.</p></div>
              <button onClick={openUsers} className="px-3 py-2 rounded text-xs font-medium text-white" style={{ backgroundColor: "#374151" }}>Open User Controls</button>
            </div>
            {!data?.flaggedAccounts.length ? <EmptyState icon={CheckCircle} message="No accounts currently meet the review signals." /> : (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: "1px solid var(--its-border)" }}><th className="text-left py-3 px-4 text-xs">Account</th><th className="text-left py-3 px-4 text-xs">Signals</th><th className="text-right py-3 px-4 text-xs">Posts / 24h</th><th className="text-right py-3 px-4 text-xs">Violations</th><th className="text-left py-3 px-4 text-xs">Status</th></tr></thead><tbody>{data.flaggedAccounts.map((account) => <tr key={account.userId} style={{ borderBottom: "1px solid var(--its-border)" }}><td className="py-3 px-4"><div className="font-medium">{account.name ?? "Unnamed member"}</div><div className="text-xs" style={{ color: "var(--its-text-muted)" }}>{account.email ?? `User #${account.userId}`}</div></td><td className="py-3 px-4"><div className="flex flex-wrap gap-1">{account.signals.map((signal) => <span key={signal} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>{signalLabels[signal] ?? signal}</span>)}</div></td><td className="py-3 px-4 text-right">{account.postsLast24Hours}</td><td className="py-3 px-4 text-right">{account.violationCount}</td><td className="py-3 px-4">{account.suspendedUntil && new Date(account.suspendedUntil) > new Date() ? <span style={{ color: "#b91c1c" }}>Suspended</span> : <span style={{ color: "#64748b" }}>Review needed</span>}</td></tr>)}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ResourceMetric({ icon: Icon, label, value, detail, color }: { icon: React.ElementType; label: string; value: string; detail: string; color: string }) {
  return <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}><div className="flex items-center gap-2"><Icon size={17} style={{ color }} /><p className="text-xs font-semibold uppercase" style={{ color: "var(--its-text-muted)" }}>{label}</p></div><p className="text-2xl font-bold mt-3" style={{ color }}>{value}</p><p className="text-xs mt-1" style={{ color: "var(--its-text-muted)" }}>{detail}</p></div>;
}

// ─── Flagged Posts Tab ────────────────────────────────────────────────────────
function FlaggedTab({ expandedPost, setExpandedPost }: { expandedPost: number | null; setExpandedPost: (id: number | null) => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.flaggedPosts.useQuery({ limit: 50, offset: 0 });
  const unflagMutation = trpc.admin.unflagPost.useMutation({ onSuccess: () => { utils.admin.flaggedPosts.invalidate(); toast.success("Post unflagged."); } });
  const deleteMutation = trpc.admin.deletePost.useMutation({ onSuccess: () => { utils.admin.flaggedPosts.invalidate(); toast.success("Post deleted."); } });

  if (isLoading) return <LoadingSpinner />;
  if (!data?.posts.length) return <EmptyState icon={Flag} message="No flagged posts at this time." />;

  return (
    <div className="space-y-3">
      {data.posts.map((post) => {
        const author = data.authors[post.authorId];
        const isExpanded = expandedPost === post.id;
        return (
          <div key={post.id} className="rounded-lg border p-4" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{author?.name ?? "Unknown"}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>{post.flagReason ?? "Flagged"}</span>
                </div>
                <p className="text-sm line-clamp-2" style={{ color: "var(--its-text-muted)" }}>{post.text ?? "(no text)"}</p>
                <p className="text-xs mt-1" style={{ color: "var(--its-text-muted)" }}>{new Date(post.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setExpandedPost(isExpanded ? null : post.id)} className="p-1.5 rounded" style={{ color: "var(--its-text-muted)" }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <ActionBtn color="green" icon={CheckCircle} label="Approve" onClick={() => unflagMutation.mutate({ postId: post.id })} />
                <ActionBtn color="red" icon={Trash2} label="Delete" onClick={() => { if (confirm("Delete this post permanently?")) deleteMutation.mutate({ postId: post.id }); }} />
              </div>
            </div>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "var(--its-border)" }}>
                <div className="grid grid-cols-2 gap-2">
                  <div><span style={{ color: "var(--its-text-muted)" }}>Post ID:</span> {post.id}</div>
                  <div><span style={{ color: "var(--its-text-muted)" }}>Author ID:</span> {post.authorId}</div>
                  <div><span style={{ color: "var(--its-text-muted)" }}>Media:</span> {post.mediaType ?? "text"}</div>
                </div>
                {post.text && <div className="mt-2 p-2 rounded" style={{ backgroundColor: "var(--its-bg)" }}>{post.text}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Content Reports Tab ──────────────────────────────────────────────────────
function ReportsTab() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [respondId, setRespondId] = useState<number | null>(null);
  const [respondMsg, setRespondMsg] = useState("");
  const [noteId, setNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: reports, isLoading } = trpc.admin.getReports.useQuery({ status: statusFilter, targetType: typeFilter, limit: 100, offset: 0 });

  const reviewMutation = trpc.admin.reviewReport.useMutation({
    onSuccess: (result) => {
      utils.admin.getReports.invalidate();
      utils.admin.flaggedPosts.invalidate();
      toast.success(result.removedContent ? "Reported content removed." : "Report updated.");
      setNoteId(null);
      setNoteText("");
    },
    onError: (e) => toast.error(e.message),
  });
  const flagMutation = trpc.admin.flagReportedPost.useMutation({
    onSuccess: () => {
      utils.admin.getReports.invalidate();
      utils.admin.flaggedPosts.invalidate();
      toast.success("Post added to Flagged Posts for review.");
    },
    onError: (e) => toast.error(e.message),
  });
  const respondMutation = trpc.admin.respondToReporter.useMutation({
    onSuccess: () => { utils.admin.getReports.invalidate(); toast.success("Response accepted for delivery by email."); setRespondId(null); setRespondMsg(""); },
    onError: (e) => toast.error(e.message),
  });
  const bulkMutation = trpc.admin.bulkReviewReports.useMutation({
    onSuccess: (res) => {
      utils.admin.getReports.invalidate();
      setSelected(new Set());
      toast.success(`Bulk action applied to ${res.processed} report${res.processed !== 1 ? "s" : ""}.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const allIds = (reports ?? []).map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleOne = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

  const REASON_LABELS: Record<string, string> = {
    sexual_content: "🔞 Sexual Content",
    violence: "⚔️ Violence",
    harassment: "😡 Harassment",
    spam: "📧 Spam",
    other: "❓ Other",
    auto_detected: "🤖 Auto-detected",
  };

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#fef3c7", text: "#92400e" },
    reviewed: { bg: "#dbeafe", text: "#1e40af" },
    actioned: { bg: "#d1fae5", text: "#065f46" },
    dismissed: { bg: "var(--its-border)", text: "var(--its-text-muted)" },
  };

  return (
    <div className="space-y-4">
      {/* Respond Modal */}
      {respondId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-96 shadow-xl" style={{ backgroundColor: "var(--its-surface)" }}>
            <h3 className="font-bold text-lg mb-3">Respond to Reporter</h3>
            <textarea
              value={respondMsg}
              onChange={(e) => setRespondMsg(e.target.value)}
              rows={4}
              placeholder="Your message to the reporter..."
              className="w-full px-3 py-2 rounded border text-sm resize-none mb-4"
              style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => setRespondId(null)} className="flex-1 py-2 rounded text-sm border" style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)" }}>Cancel</button>
                <button
                  onClick={() => respondMutation.mutate({ reportId: respondId, message: respondMsg })}
                  disabled={!respondMsg.trim() || respondMutation.isPending}
                  className="flex-1 py-2 rounded text-sm font-medium bg-blue-600 text-white disabled:opacity-50"
                >
                  {respondMutation.isPending ? "Sending…" : "Send Email"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-96 shadow-xl" style={{ backgroundColor: "var(--its-surface)" }}>
            <h3 className="font-bold text-lg mb-3">Add Admin Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Internal note about this report..."
              className="w-full px-3 py-2 rounded border text-sm resize-none mb-4"
              style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => setNoteId(null)} className="flex-1 py-2 rounded text-sm border" style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)" }}>Cancel</button>
              <button
                onClick={() => reviewMutation.mutate({ reportId: noteId, status: "reviewed", adminNote: noteText })}
                disabled={!noteText.trim() || reviewMutation.isPending}
                className="flex-1 py-2 rounded text-sm font-medium bg-blue-600 text-white disabled:opacity-50"
              >
                {reviewMutation.isPending ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquareWarning size={18} style={{ color: "var(--its-text-muted)" }} />
        <h2 className="text-base font-semibold">Content Reports</h2>
        <div className="ml-auto flex flex-wrap gap-1">
          {["all", "pending", "reviewed", "actioned", "dismissed"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded text-xs font-medium capitalize"
              style={{ backgroundColor: statusFilter === s ? "var(--its-text-primary)" : "var(--its-surface)", color: statusFilter === s ? "var(--its-bg)" : "var(--its-text-muted)", border: "1px solid var(--its-border)" }}
            >{s}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {["all", "post", "comment", "listing"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1 rounded text-xs font-medium capitalize"
              style={{ backgroundColor: typeFilter === t ? "#3b82f6" : "var(--its-surface)", color: typeFilter === t ? "white" : "var(--its-text-muted)", border: "1px solid var(--its-border)" }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {someSelected && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg px-4 py-2.5 border" style={{ backgroundColor: "#1e3a5f", borderColor: "#2563eb" }}>
          <span className="text-sm font-medium text-white">{selected.size} selected</span>
          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() => bulkMutation.mutate({ reportIds: Array.from(selected), action: "dismiss" })}
              disabled={bulkMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white disabled:opacity-50"
            >
              <CheckCircle size={12} /> Bulk Dismiss
            </button>
            <button
              onClick={() => bulkMutation.mutate({ reportIds: Array.from(selected), action: "action" })}
              disabled={bulkMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-yellow-600 text-white disabled:opacity-50"
            >
              <Eye size={12} /> Mark Actioned
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete content for ${selected.size} report(s)? This cannot be undone.`)) {
                  bulkMutation.mutate({ reportIds: Array.from(selected), action: "delete_content" });
                }
              }}
              disabled={bulkMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white disabled:opacity-50"
            >
              <Trash2 size={12} /> Delete Content
            </button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 rounded text-xs text-white/70 hover:text-white">
              Clear
            </button>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!reports || reports.length === 0) && <EmptyState icon={MessageSquareWarning} message="No reports match this filter." />}

      {/* Select All row */}
      {(reports ?? []).length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded cursor-pointer accent-blue-600"
          />
          <span className="text-xs" style={{ color: "var(--its-text-muted)" }}>
            {allSelected ? "Deselect all" : `Select all ${allIds.length}`}
          </span>
        </div>
      )}

      {(reports ?? []).map((report) => {
        const sc = STATUS_COLORS[report.status] ?? STATUS_COLORS.pending;
        return (
          <div key={report.id} className="rounded-lg border p-4" style={{ backgroundColor: selected.has(report.id) ? "rgba(59,130,246,0.07)" : "var(--its-surface)", borderColor: selected.has(report.id) ? "#3b82f6" : "var(--its-border)" }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={selected.has(report.id)}
                  onChange={() => toggleOne(report.id)}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-600 mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm capitalize">{report.targetType} #{report.targetId}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--its-text-muted)" }}>
                    Reported by user #{report.reporterId} · {new Date(report.createdAt).toLocaleString()}
                  </p>
                  {report.adminNote && (
                    <div className="mt-2 text-xs p-2 rounded" style={{ backgroundColor: "var(--its-bg)", color: "var(--its-text-muted)" }}>
                      <span className="font-semibold">Admin note:</span> {report.adminNote}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                {report.targetType === "post" && (
                  <a href={`/post/${report.targetId}`} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded" style={{ color: "var(--its-text-muted)" }} title="View content">
                    <Eye size={16} />
                  </a>
                )}
                <button onClick={() => { setNoteId(report.id); setNoteText(report.adminNote ?? ""); }}
                  className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>
                  Note
                </button>
                <button onClick={() => { setRespondId(report.id); setRespondMsg(""); }}
                  className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "#ede9fe", color: "#5b21b6" }}>
                  Respond
                </button>
                {report.status === "pending" && (
                  <>
                    {report.targetType === "post" && (
                      <button onClick={() => flagMutation.mutate({ reportId: report.id })}
                        disabled={flagMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-50"
                        style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                        <Flag size={12} /> Flag for Review
                      </button>
                    )}
                    <button onClick={() => {
                      if (window.confirm(`Remove this reported ${report.targetType}? This cannot be undone.`)) {
                        reviewMutation.mutate({ reportId: report.id, status: "actioned", deleteContent: true });
                      }
                    }}
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-50"
                      style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                      <Trash2 size={12} /> Remove Content
                    </button>
                    <button onClick={() => reviewMutation.mutate({ reportId: report.id, status: "dismissed" })}
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-50"
                      style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
                      <CheckCircle size={12} /> Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({
  initialFilter, suspendUserId, setSuspendUserId, suspendDays, setSuspendDays, suspendReason, setSuspendReason, isSuperAdmin,
}: {
  initialFilter: "all" | "suspended";
  suspendUserId: number | null;
  setSuspendUserId: (id: number | null) => void;
  suspendDays: number;
  setSuspendDays: (d: number) => void;
  suspendReason: string;
  setSuspendReason: (r: string) => void;
  isSuperAdmin: boolean;
}) {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "suspended">(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(200);
  const [loadAll, setLoadAll] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, viewFilter]);

  useEffect(() => {
    setViewFilter(initialFilter);
  }, [initialFilter]);

  const offset = (currentPage - 1) * usersPerPage;
  const { data: users, isLoading } = trpc.admin.allUsers.useQuery({ limit: loadAll ? 10000 : usersPerPage, offset: loadAll ? 0 : offset, suspendedOnly: viewFilter === "suspended" });
  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => { utils.admin.allUsers.invalidate(); setSuspendUserId(null); toast.success("User suspended."); },
  });
  const unsuspendMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => { utils.admin.allUsers.invalidate(); toast.success("User unsuspended."); },
  });
  const setRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { utils.admin.allUsers.invalidate(); toast.success("Role updated."); },
  });
  const deleteAccountMutation = trpc.admin.deleteAccount.useMutation({
    onSuccess: () => { utils.admin.allUsers.invalidate(); setDeleteUserId(null); setDeleteConfirmName(""); toast.success("Account permanently deleted."); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSpinner />;

  const isSuspended = (u: NonNullable<typeof users>[0]) => u.suspendedUntil && new Date(u.suspendedUntil) > new Date();
  const filtered = (users ?? []).filter((u) =>
    !search || (u.name ?? "").toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );
  
  const totalUsers = users?.[0]?.id ? 999999 : 0; // Placeholder - ideally from API
  const totalPages = loadAll ? 1 : Math.ceil(filtered.length / usersPerPage) || 1;

  const targetUser = deleteUserId ? (users ?? []).find((u) => u.id === deleteUserId) : null;

  return (
    <div>
      {/* Delete Account Confirmation Modal */}
      {deleteUserId !== null && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="rounded-xl p-6 w-96 shadow-xl border" style={{ backgroundColor: "var(--its-surface)", borderColor: "#ef4444" }}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={20} className="text-red-500" />
              <h3 className="font-bold text-lg text-red-500">Delete Account</h3>
            </div>
            <p className="text-sm mb-2" style={{ color: "var(--its-text-primary)" }}>
              You are about to <strong>permanently delete</strong> the account of:
            </p>
            <div className="rounded-lg p-3 mb-4 text-sm font-semibold" style={{ backgroundColor: "var(--its-bg)" }}>
              {targetUser.name ?? "(no name)"} — {targetUser.email ?? "no email"}
            </div>
            <p className="text-xs mb-3" style={{ color: "#ef4444" }}>
              This will delete all their posts, comments, messages, listings, and account data. This action <strong>cannot be undone</strong>.
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--its-text-muted)" }}>
              Type the user's name to confirm: <strong>{targetUser.name ?? "(no name)"}</strong>
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Type name to confirm..."
              className="w-full px-3 py-2 rounded border text-sm mb-4"
              style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => { setDeleteUserId(null); setDeleteConfirmName(""); }}
                className="flex-1 py-2 rounded text-sm border" style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)" }}>
                Cancel
              </button>
              <button
                onClick={() => deleteAccountMutation.mutate({ userId: deleteUserId })}
                disabled={deleteConfirmName !== (targetUser.name ?? "(no name)") || deleteAccountMutation.isPending}
                className="flex-1 py-2 rounded text-sm font-bold disabled:opacity-40"
                style={{ backgroundColor: "#ef4444", color: "white" }}
              >
                {deleteAccountMutation.isPending ? "Deleting…" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-80 shadow-xl" style={{ backgroundColor: "var(--its-surface)" }}>
            <h3 className="font-bold text-lg mb-4">Suspend User</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Duration (days)</label>
                <input type="number" min={1} max={365} value={suspendDays} onChange={(e) => setSuspendDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Reason</label>
                <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3}
                  className="w-full px-3 py-2 rounded border text-sm resize-none"
                  style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
                  placeholder="Reason for suspension..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setSuspendUserId(null)} className="flex-1 py-2 rounded text-sm border"
                style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)" }}>Cancel</button>
              <button
                onClick={() => suspendMutation.mutate({ userId: suspendUserId, days: suspendDays, reason: suspendReason })}
                className="flex-1 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: "#ef4444", color: "white" }}
                disabled={!suspendReason.trim()}
              >Suspend</button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Pagination Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setViewFilter("all")} className="px-3 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: viewFilter === "all" ? "#2563eb" : "var(--its-border)", color: viewFilter === "all" ? "white" : "var(--its-text-muted)" }}>All Users</button>
        <button onClick={() => setViewFilter("suspended")} className="px-3 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: viewFilter === "suspended" ? "#dc2626" : "var(--its-border)", color: viewFilter === "suspended" ? "white" : "var(--its-text-muted)" }}>Active Suspensions</button>
        {viewFilter === "suspended" && <span className="text-xs" style={{ color: "var(--its-text-muted)" }}>Showing only accounts whose suspension is currently active.</span>}
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1 rounded-lg border px-3 py-2" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
          <Search size={16} style={{ color: "var(--its-text-muted)" }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--its-text-primary)" }}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="text-sm font-medium" style={{ color: "var(--its-text-muted)" }}>Users per page:</label>
          <select
            value={usersPerPage}
            onChange={(e) => { setUsersPerPage(Number(e.target.value)); setCurrentPage(1); setLoadAll(false); }}
            disabled={loadAll}
            className="px-3 py-2 rounded border text-sm"
            style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)", color: "var(--its-text-primary)", opacity: loadAll ? 0.5 : 1 }}
          >
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
          <button
            onClick={() => { setLoadAll(!loadAll); setCurrentPage(1); }}
            className="px-4 py-2 rounded text-sm font-medium"
            style={{ backgroundColor: loadAll ? "#3b82f6" : "var(--its-border)", color: loadAll ? "white" : "var(--its-text-muted)" }}
          >
            {loadAll ? "Loaded All" : "Load All"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--its-border)" }}>
              {["ID", "User", "Email", "Role", "Violations", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--its-border)" }}>
                <td className="py-3 px-3 font-mono text-xs font-semibold" style={{ color: "var(--its-text-muted)" }}>#{u.id}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--its-border)" }}>
                        {(u.name ?? "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{u.name ?? "—"}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-xs" style={{ color: "var(--its-text-muted)" }}>{u.email ?? "—"}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: u.role === "super_admin" ? "#ede9fe" : u.role === "admin" ? "#dbeafe" : "var(--its-border)", color: u.role === "super_admin" ? "#5b21b6" : u.role === "admin" ? "#1e40af" : "var(--its-text-muted)" }}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span style={{ color: u.violationCount > 0 ? "#ef4444" : "var(--its-text-muted)" }}>{u.violationCount}</span>
                </td>
                <td className="py-3 px-3">
                  {isSuspended(u) ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                      Suspended until {new Date(u.suspendedUntil!).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Active</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {isSuspended(u) ? (
                      <button onClick={() => unsuspendMutation.mutate({ userId: u.id })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
                        <UserCheck size={13} /> Unsuspend
                      </button>
                    ) : (
                      <button onClick={() => { setSuspendUserId(u.id); setSuspendDays(7); setSuspendReason(""); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                        <Ban size={13} /> Suspend
                      </button>
                    )}
                    {isSuperAdmin && u.role !== "admin" && u.role !== "super_admin" ? (
                      <button onClick={() => { if (confirm(`Promote ${u.name} to admin?`)) setRoleMutation.mutate({ userId: u.id, role: "admin" }); }}
                        className="px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>
                        Make Admin
                      </button>
                    ) : isSuperAdmin && u.role === "admin" ? (
                      <button onClick={() => { if (confirm(`Demote ${u.name} to user?`)) setRoleMutation.mutate({ userId: u.id, role: "user" }); }}
                        className="px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: "var(--its-border)", color: "var(--its-text-muted)" }}>
                        Demote
                      </button>
                    ) : null}
                    {isSuperAdmin && u.role !== "super_admin" && (
                      <button onClick={() => { setDeleteUserId(u.id); setDeleteConfirmName(""); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
                        title="Permanently delete this member account">
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-sm" style={{ color: "var(--its-text-muted)" }}>No users match your search.</p>}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: "var(--its-border)" }}>
          <div className="text-sm" style={{ color: "var(--its-text-muted)" }}>
            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
            {filtered.length > 0 && ` • Showing ${filtered.length} user${filtered.length !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-40 border transition-colors"
              style={{ borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return page > 0 && page <= totalPages ? (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'font-bold'
                        : 'border hover:bg-opacity-50'
                    }`}
                    style={{
                      backgroundColor: page === currentPage ? "var(--its-text-primary)" : "transparent",
                      color: page === currentPage ? "var(--its-bg)" : "var(--its-text-primary)",
                      borderColor: "var(--its-border)",
                    }}
                  >
                    {page}
                  </button>
                ) : null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-40 border transition-colors"
              style={{ borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pages Tab ────────────────────────────────────────────────────────────────
function PagesTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showSuspended, setShowSuspended] = useState<boolean | undefined>(undefined);
  const [suspendId, setSuspendId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const { data: pages, isLoading } = trpc.admin.getPages.useQuery({ search: search || undefined, isSuspended: showSuspended, limit: 100, offset: 0 });

  const suspendMutation = trpc.admin.suspendPage.useMutation({
    onSuccess: () => { utils.admin.getPages.invalidate(); setSuspendId(null); setSuspendReason(""); toast.success("Page suspended."); },
    onError: (e) => toast.error(e.message),
  });
  const unsuspendMutation = trpc.admin.unsuspendPage.useMutation({
    onSuccess: () => { utils.admin.getPages.invalidate(); toast.success("Page unsuspended."); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {suspendId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-80 shadow-xl" style={{ backgroundColor: "var(--its-surface)" }}>
            <h3 className="font-bold text-lg mb-4">Suspend Page</h3>
            <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded border text-sm resize-none mb-4"
              style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
              placeholder="Reason for suspension..." />
            <div className="flex gap-2">
              <button onClick={() => setSuspendId(null)} className="flex-1 py-2 rounded text-sm border" style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)" }}>Cancel</button>
              <button onClick={() => suspendMutation.mutate({ pageId: suspendId, reason: suspendReason })}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="flex-1 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#ef4444", color: "white" }}>
                {suspendMutation.isPending ? "Suspending…" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Globe size={18} style={{ color: "var(--its-text-muted)" }} />
        <h2 className="text-base font-semibold">Pages</h2>
        <div className="ml-auto flex gap-1">
          {([["All", undefined], ["Active", false], ["Suspended", true]] as [string, boolean | undefined][]).map(([label, val]) => (
            <button key={label} onClick={() => setShowSuspended(val)}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: showSuspended === val ? "var(--its-text-primary)" : "var(--its-surface)", color: showSuspended === val ? "var(--its-bg)" : "var(--its-text-muted)", border: "1px solid var(--its-border)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <Search size={16} style={{ color: "var(--its-text-muted)" }} />
        <input type="text" placeholder="Search pages by name..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--its-text-primary)" }} />
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!pages || pages.length === 0) && <EmptyState icon={Globe} message="No pages found." />}

      <div className="space-y-3">
        {(pages ?? []).map((page) => (
          <div key={page.id} className="rounded-lg border p-4" style={{ backgroundColor: "var(--its-surface)", borderColor: page.isSuspended ? "#ef4444" : "var(--its-border)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{page.name}</span>
                  <span className="text-xs" style={{ color: "var(--its-text-muted)" }}>/{page.handle}</span>
                  {page.isSuspended && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Suspended</span>}
                  {page.isVerified && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>Verified</span>}
                </div>
                <p className="text-xs" style={{ color: "var(--its-text-muted)" }}>
                  {page.category ?? "No category"} · {page.followerCount} followers · Owner ID: {page.ownerId}
                </p>
                {page.suspendReason && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>Reason: {page.suspendReason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/p/${page.handle}`} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded" style={{ color: "var(--its-text-muted)" }} title="View page">
                  <Eye size={16} />
                </a>
                {page.isSuspended ? (
                  <button onClick={() => unsuspendMutation.mutate({ pageId: page.id })}
                    disabled={unsuspendMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
                    <CheckCircle size={14} /> Unsuspend
                  </button>
                ) : (
                  <button onClick={() => { setSuspendId(page.id); setSuspendReason(""); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                    style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                    <Ban size={14} /> Suspend
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────
function GroupsTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showSuspended, setShowSuspended] = useState<boolean | undefined>(undefined);
  const [suspendId, setSuspendId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const { data: groups, isLoading } = trpc.admin.getGroups.useQuery({ search: search || undefined, isSuspended: showSuspended, limit: 100, offset: 0 });

  const suspendMutation = trpc.admin.suspendGroup.useMutation({
    onSuccess: () => { utils.admin.getGroups.invalidate(); setSuspendId(null); setSuspendReason(""); toast.success("Group suspended."); },
    onError: (e) => toast.error(e.message),
  });
  const unsuspendMutation = trpc.admin.unsuspendGroup.useMutation({
    onSuccess: () => { utils.admin.getGroups.invalidate(); toast.success("Group unsuspended."); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {suspendId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-80 shadow-xl" style={{ backgroundColor: "var(--its-surface)" }}>
            <h3 className="font-bold text-lg mb-4">Suspend Group</h3>
            <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded border text-sm resize-none mb-4"
              style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
              placeholder="Reason for suspension..." />
            <div className="flex gap-2">
              <button onClick={() => setSuspendId(null)} className="flex-1 py-2 rounded text-sm border" style={{ borderColor: "var(--its-border)", color: "var(--its-text-muted)" }}>Cancel</button>
              <button onClick={() => suspendMutation.mutate({ groupId: suspendId, reason: suspendReason })}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="flex-1 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#ef4444", color: "white" }}>
                {suspendMutation.isPending ? "Suspending…" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <UsersRound size={18} style={{ color: "var(--its-text-muted)" }} />
        <h2 className="text-base font-semibold">Public Groups</h2>
        <div className="ml-auto flex gap-1">
          {([["All", undefined], ["Active", false], ["Suspended", true]] as [string, boolean | undefined][]).map(([label, val]) => (
            <button key={label} onClick={() => setShowSuspended(val)}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: showSuspended === val ? "var(--its-text-primary)" : "var(--its-surface)", color: showSuspended === val ? "var(--its-bg)" : "var(--its-text-muted)", border: "1px solid var(--its-border)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <Search size={16} style={{ color: "var(--its-text-muted)" }} />
        <input type="text" placeholder="Search groups by name..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--its-text-primary)" }} />
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!groups || groups.length === 0) && <EmptyState icon={UsersRound} message="No groups found." />}

      <div className="space-y-3">
        {(groups ?? []).map((group) => (
          <div key={group.id} className="rounded-lg border p-4" style={{ backgroundColor: "var(--its-surface)", borderColor: group.isSuspended ? "#ef4444" : "var(--its-border)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{group.name}</span>
                  <span className="text-xs" style={{ color: "var(--its-text-muted)" }}>/{group.handle}</span>
                  {group.isSuspended && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Suspended</span>}
                </div>
                <p className="text-xs" style={{ color: "var(--its-text-muted)" }}>
                  {group.category ?? "No category"} · {group.memberCount} members · Created by: {group.createdBy}
                </p>
                {group.suspendReason && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>Reason: {group.suspendReason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/g/${group.handle}`} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded" style={{ color: "var(--its-text-muted)" }} title="View group">
                  <Eye size={16} />
                </a>
                {group.isSuspended ? (
                  <button onClick={() => unsuspendMutation.mutate({ groupId: group.id })}
                    disabled={unsuspendMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
                    <CheckCircle size={14} /> Unsuspend
                  </button>
                ) : (
                  <button onClick={() => { setSuspendId(group.id); setSuspendReason(""); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                    style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                    <Ban size={14} /> Suspend
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Daily Limits Tab ─────────────────────────────────────────────────────────
function LimitsTab() {
  const utils = trpc.useUtils();
  const { data: limits, isLoading } = trpc.admin.getDailyLimits.useQuery();
  const [localLimits, setLocalLimits] = useState<Record<string, number>>({});
  const updateMutation = trpc.admin.updateDailyLimits.useMutation({
    onSuccess: () => { utils.admin.getDailyLimits.invalidate(); toast.success("Daily limits updated."); setLocalLimits({}); },
  });
  if (isLoading) return <LoadingSpinner />;
  const limitFields = [
    { key: "photo", label: "Photos per day" },
    { key: "video", label: "Videos per day" },
    { key: "audio", label: "Audio posts per day" },
    { key: "doc", label: "Documents per day" },
    { key: "poll", label: "Polls per day" },
    { key: "live", label: "Live streams per day" },
  ];
  return (
    <div className="max-w-2xl">
      <p className="text-sm mb-5" style={{ color: "var(--its-text-muted)" }}>
        Adjust the 24-hour upload limits per user. Changes take effect immediately.
      </p>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--its-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--its-surface)", borderBottom: "1px solid var(--its-border)" }}>
              <th className="text-left py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Limit</th>
              <th className="text-center py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Current Value</th>
              <th className="text-center py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {limitFields.map(({ key, label }) => {
              const isDirty = localLimits[key] !== undefined;
              const currentVal = localLimits[key] ?? (limits as Record<string, number> | undefined)?.[key] ?? 0;
              return (
                <tr key={key} style={{ borderBottom: "1px solid var(--its-border)", backgroundColor: isDirty ? "rgba(59,130,246,0.04)" : undefined }}>
                  <td className="py-3 px-4 font-medium text-sm">{label}</td>
                  <td className="py-3 px-4 text-center">
                    <input type="number" min={1} max={100}
                      value={currentVal}
                      onChange={(e) => setLocalLimits((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-16 px-2 py-1.5 rounded border text-center text-sm font-bold"
                      style={{ backgroundColor: "var(--its-bg)", borderColor: isDirty ? "#3b82f6" : "var(--its-border)", color: "var(--its-text-primary)" }} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        updateMutation.mutate({ [key]: currentVal } as Parameters<typeof updateMutation.mutate>[0]);
                        setLocalLimits((prev) => { const n = { ...prev }; delete n[key]; return n; });
                      }}
                      disabled={!isDirty || updateMutation.isPending}
                      className="px-3 py-1 rounded text-xs font-semibold transition-all"
                      style={isDirty
                        ? { backgroundColor: "#3b82f6", color: "white", border: "1px solid #3b82f6", opacity: 1, cursor: "pointer" }
                        : { backgroundColor: "transparent", color: "#6b7280", border: "1px solid #d1d5db", opacity: 0.6, cursor: "default" }
                      }>
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Media File Size & Duration Limits Tab (super_admin) ──────────────────────
function MediaLimitsTab() {
  const utils = trpc.useUtils();
  const { data: limits, isLoading } = trpc.admin.getMediaLimits.useQuery();
  const [local, setLocal] = useState<Record<string, number>>({});
  const setMutation = trpc.admin.setMediaLimit.useMutation({
    onSuccess: () => { utils.admin.getMediaLimits.invalidate(); toast.success("Media limit saved."); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSpinner />;

  const fields: { key: string; label: string; description: string; unit: string; icon: React.ElementType; max: number; section?: string }[] = [
    // ── File size & duration limits ──
    { key: "photo_max_mb", label: "Photo max size", description: "Maximum file size per uploaded image", unit: "MB", icon: FileImage, max: 100, section: "File Size & Duration Limits" },
    { key: "video_max_mb", label: "Video max size", description: "Maximum file size for uploaded videos", unit: "MB", icon: FileVideo, max: 500 },
    { key: "video_max_seconds", label: "Video max duration", description: "Maximum duration for uploaded videos", unit: "seconds", icon: FileVideo, max: 3600 },
    { key: "audio_max_mb", label: "Audio max size", description: "Maximum file size for uploaded audio", unit: "MB", icon: FileAudio, max: 200 },
    { key: "audio_max_seconds", label: "Audio max duration", description: "Maximum duration for uploaded audio", unit: "seconds", icon: FileAudio, max: 7200 },
    { key: "doc_max_mb", label: "Document max size", description: "Maximum file size for uploaded documents", unit: "MB", icon: FileText, max: 200 },
    // ── Daily upload quota limits ──
    { key: "photo_daily_limit", label: "Photos per 24 hours", description: "Max photo posts a member can upload within 24 hours", unit: "posts", icon: FileImage, max: 100, section: "Daily Upload Quota (per member per 24 hrs)" },
    { key: "video_daily_limit", label: "Videos per 24 hours", description: "Max video posts a member can upload within 24 hours", unit: "posts", icon: FileVideo, max: 50 },
    { key: "audio_daily_limit", label: "Audio posts per 24 hours", description: "Max audio posts a member can upload within 24 hours", unit: "posts", icon: FileAudio, max: 100 },
    { key: "doc_daily_limit", label: "Documents per 24 hours", description: "Max document posts a member can upload within 24 hours", unit: "posts", icon: FileText, max: 50 },
    { key: "poll_daily_limit", label: "Polls per 24 hours", description: "Max polls a member can create within 24 hours", unit: "polls", icon: BarChart2, max: 20 },
    { key: "live_daily_limit", label: "Live streams per 24 hours", description: "Max live streams a member can start within 24 hours", unit: "streams", icon: Radio, max: 10 },
    // ── Verified member quota overrides ──
    { key: "photo_verified_daily", label: "Photos per 24 hours (Verified)", description: "Higher photo quota for verified members — overrides the standard limit above", unit: "posts", icon: FileImage, max: 200, section: "Verified Member Daily Quota (overrides standard quota)" },
    { key: "video_verified_daily", label: "Videos per 24 hours (Verified)", description: "Higher video quota for verified members", unit: "posts", icon: FileVideo, max: 100 },
    { key: "audio_verified_daily", label: "Audio posts per 24 hours (Verified)", description: "Higher audio quota for verified members", unit: "posts", icon: FileAudio, max: 200 },
    { key: "doc_verified_daily", label: "Documents per 24 hours (Verified)", description: "Higher document quota for verified members", unit: "posts", icon: FileText, max: 100 },
    { key: "poll_verified_daily", label: "Polls per 24 hours (Verified)", description: "Higher poll quota for verified members", unit: "polls", icon: BarChart2, max: 50 },
    { key: "live_verified_daily", label: "Live streams per 24 hours (Verified)", description: "Higher live stream quota for verified members", unit: "streams", icon: Radio, max: 20 },
  ];

  const handleSave = (key: string) => {
    const value = local[key];
    if (value === undefined) return;
    setMutation.mutate({ key, value });
    setLocal((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  // Group fields by section
  const sections: string[] = [];
  const fieldsBySection: Record<string, typeof fields> = {};
  for (const f of fields) {
    const sec = f.section ?? "__nosec";
    if (!fieldsBySection[sec]) { fieldsBySection[sec] = []; sections.push(sec); }
    fieldsBySection[sec].push(f);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border p-4" style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b" }}>
        <p className="text-sm font-medium" style={{ color: "#92400e" }}>
          ⚠️ Super Admin Only — These limits affect all uploads platform-wide. Changes take effect immediately for new uploads.
        </p>
      </div>

      {sections.map((sec) => (
        <div key={sec}>
          {sec !== "__nosec" && (
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3 pb-1 border-b" style={{ color: "var(--its-text-muted)", borderColor: "var(--its-border)" }}>
              {sec}
            </h3>
          )}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--its-border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--its-surface)", borderBottom: "1px solid var(--its-border)" }}>
                  <th className="text-left py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Limit</th>
                  <th className="text-left py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Description</th>
                  <th className="text-center py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Current Value</th>
                  <th className="text-center py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Unit</th>
                  <th className="text-center py-2 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--its-text-muted)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {fieldsBySection[sec].map(({ key, label, description, unit, icon: Icon, max }) => {
                  const current = (limits as Record<string, number> | undefined)?.[key] ?? 0;
                  const localVal = local[key];
                  const isDirty = localVal !== undefined;
                  return (
                    <tr key={key} style={{ borderBottom: "1px solid var(--its-border)", backgroundColor: isDirty ? "rgba(59,130,246,0.04)" : undefined }}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon size={16} style={{ color: "var(--its-text-muted)" }} />
                          <span className="font-medium">{label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: "var(--its-text-muted)" }}>{description}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min={1}
                          max={max}
                          value={localVal ?? current}
                          onChange={(e) => setLocal((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="w-20 px-2 py-1 rounded border text-center text-sm font-bold"
                          style={{ backgroundColor: "var(--its-bg)", borderColor: isDirty ? "#3b82f6" : "var(--its-border)", color: "var(--its-text-primary)" }}
                        />
                      </td>
                      <td className="py-3 px-4 text-center text-xs" style={{ color: "var(--its-text-muted)" }}>{unit}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleSave(key)}
                          disabled={!isDirty || setMutation.isPending}
                          className="px-3 py-1 rounded text-xs font-semibold transition-all"
                          style={isDirty
                            ? { backgroundColor: "#3b82f6", color: "white", border: "1px solid #3b82f6", opacity: 1 }
                            : { backgroundColor: "transparent", color: "#6b7280", border: "1px solid #d1d5db", opacity: 0.6, cursor: "default" }
                          }
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Verified Subscribers Tab ────────────────────────────────────────────────
function VerifiedTab() {
  const utils = trpc.useUtils();
  const { data: subs, isLoading } = trpc.subscription.adminListAll.useQuery();
  const revoke = trpc.subscription.adminRevoke.useMutation({
    onSuccess: () => { utils.subscription.adminListAll.invalidate(); toast.success("Badge revoked."); },
    onError: (err) => toast.error(err.message || "Failed to revoke badge"),
  });
  if (isLoading) return <LoadingSpinner />;
  const active = (subs ?? []).filter((s) => s.badgeGranted);
  const inactive = (subs ?? []).filter((s) => !s.badgeGranted);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <BadgeCheck className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-bold">Verified Subscribers</h2>
        <span className="text-sm px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{active.length} active</span>
      </div>
      {active.length === 0 && <p className="text-sm" style={{ color: "var(--its-text-muted)" }}>No active verified subscribers yet.</p>}
      {active.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--its-border)" }}>
                <th className="text-left py-2 px-3 font-semibold">User</th>
                <th className="text-left py-2 px-3 font-semibold">Email</th>
                <th className="text-left py-2 px-3 font-semibold">Status</th>
                <th className="text-left py-2 px-3 font-semibold">Granted</th>
                <th className="text-left py-2 px-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: "1px solid var(--its-border)" }}>
                  <td className="py-2 px-3 font-medium">{sub.userName ?? "Unknown"}</td>
                  <td className="py-2 px-3 text-muted-foreground">{sub.userEmail ?? "—"}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">{sub.status}</span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">{new Date(sub.updatedAt).toLocaleDateString()}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => { if (confirm(`Revoke badge for ${sub.userName ?? "this user"}?`)) revoke.mutate({ userId: sub.userId }); }}
                      disabled={revoke.isPending}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-50"
                      style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                      <XCircle size={12} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {inactive.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--its-text-muted)" }}>Inactive / Expired ({inactive.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--its-border)" }}>
                  <th className="text-left py-2 px-3 font-semibold">User</th>
                  <th className="text-left py-2 px-3 font-semibold">Email</th>
                  <th className="text-left py-2 px-3 font-semibold">Status</th>
                  <th className="text-left py-2 px-3 font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {inactive.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: "1px solid var(--its-border)" }}>
                    <td className="py-2 px-3 text-muted-foreground">{sub.userName ?? "Unknown"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{sub.userEmail ?? "—"}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{sub.status}</span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{new Date(sub.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admins Tab (super_admin only) ────────────────────────────────────────────
function AdminsTab() {
  const utils = trpc.useUtils();
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<{ id: number; name: string | null; email: string | null; role: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const { data: admins, isLoading } = trpc.admin.listAdmins.useQuery();
  const promoteMutation = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => { utils.admin.listAdmins.invalidate(); setSearchResult(null); setSearchEmail(""); toast.success("User promoted to admin."); },
    onError: (e) => toast.error(e.message),
  });
  const demoteMutation = trpc.admin.demoteToUser.useMutation({
    onSuccess: () => { utils.admin.listAdmins.invalidate(); toast.success("Admin demoted to regular user."); },
    onError: (e) => toast.error(e.message),
  });
  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const all = await utils.admin.allUsers.fetch({ limit: 1000, offset: 0 });
      const found = all?.find((u: { email: string | null }) => u.email?.toLowerCase() === searchEmail.trim().toLowerCase());
      setSearchResult(found ? { id: found.id, name: found.name, email: found.email, role: found.role } : null);
      if (!found) toast.error("No user found with that email.");
    } catch { toast.error("Search failed."); }
    setSearching(false);
  };
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <h2 className="font-semibold text-base">Promote User to Admin</h2>
        <div className="flex gap-2">
          <input type="email" placeholder="Search by email address" value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-3 py-2 rounded-md border text-sm"
            style={{ backgroundColor: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }} />
          <button onClick={handleSearch} disabled={searching}
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
        {searchResult && (
          <div className="flex items-center justify-between rounded-md border p-3" style={{ borderColor: "var(--its-border)" }}>
            <div>
              <p className="font-medium text-sm">{searchResult.name ?? "(no name)"}</p>
              <p className="text-xs" style={{ color: "var(--its-text-muted)" }}>{searchResult.email} — role: <span className="font-semibold">{searchResult.role}</span></p>
            </div>
            {searchResult.role === "user" ? (
              <button onClick={() => promoteMutation.mutate({ userId: searchResult.id })} disabled={promoteMutation.isPending}
                className="px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                Promote to Admin
              </button>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{searchResult.role}</span>
            )}
          </div>
        )}
      </div>
      <div className="rounded-lg border p-5" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <h2 className="font-semibold text-base mb-4">Current Admins</h2>
        {isLoading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {(admins ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-3" style={{ borderColor: "var(--its-border)" }}>
                <div>
                  <p className="font-medium text-sm">{a.name ?? "(no name)"}</p>
                  <p className="text-xs" style={{ color: "var(--its-text-muted)" }}>{a.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.role === "super_admin" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                    {a.role === "super_admin" ? "Super Admin" : "Admin"}
                  </span>
                  {a.role === "admin" && (
                    <button onClick={() => { if (confirm(`Demote ${a.name ?? "this user"} to regular user?`)) demoteMutation.mutate({ userId: a.id }); }}
                      disabled={demoteMutation.isPending}
                      className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 disabled:opacity-50">
                      Demote
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(admins ?? []).length === 0 && <p className="text-sm" style={{ color: "var(--its-text-muted)" }}>No admins yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  unflag_post: "Unflagged post",
  delete_post: "Deleted post",
  suspend_user: "Suspended user",
  unsuspend_user: "Unsuspended user",
  set_role: "Changed role",
  promote_to_admin: "Promoted to admin",
  demote_to_user: "Demoted to user",
  delete_account: "Deleted account",
  set_media_limit: "Set media limit",
  suspend_page: "Suspended page",
  unsuspend_page: "Unsuspended page",
  suspend_group: "Suspended group",
  unsuspend_group: "Unsuspended group",
  review_report: "Reviewed report",
  respond_to_reporter: "Responded to reporter",
};
const ACTION_COLORS: Record<string, string> = {
  unflag_post: "#10b981", delete_post: "#ef4444", suspend_user: "#f59e0b",
  unsuspend_user: "#3b82f6", set_role: "#8b5cf6", promote_to_admin: "#6366f1",
  demote_to_user: "#f97316", delete_account: "#dc2626", set_media_limit: "#0ea5e9",
  suspend_page: "#f59e0b", unsuspend_page: "#10b981", suspend_group: "#f59e0b",
  unsuspend_group: "#10b981", review_report: "#8b5cf6", respond_to_reporter: "#6366f1",
};

function AuditLogTab() {
  const { data: logs, isLoading } = trpc.admin.getAuditLog.useQuery({ limit: 200, offset: 0 });
  if (isLoading) return <LoadingSpinner />;

  // Separate deleted account entries for the dedicated section
  const deletedAccounts = (logs ?? []).filter((l) => l.action === "delete_account");
  const otherLogs = (logs ?? []).filter((l) => l.action !== "delete_account");

  return (
    <div className="space-y-8">

      {/* ── Deleted Accounts Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={18} style={{ color: "#dc2626" }} />
          <h2 className="text-base font-semibold">Deleted Accounts</h2>
          <span className="text-xs px-2 py-0.5 rounded-full ml-2" style={{ backgroundColor: "#dc262620", color: "#dc2626", border: "1px solid #dc262640" }}>{deletedAccounts.length} total</span>
        </div>
        {deletedAccounts.length === 0 ? (
          <EmptyState icon={Trash2} message="No accounts have been deleted yet." />
        ) : (
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#dc262640" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#dc262610", borderBottom: "1px solid #dc262630" }}>
                  {["When", "Deleted By (Admin)", "Account Deleted", "Details"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: "#dc2626" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deletedAccounts.map((log, idx) => {
                  let meta: Record<string, unknown> = {};
                  try { meta = log.metadata ? JSON.parse(log.metadata) : {}; } catch { /* ignore */ }
                  return (
                    <tr key={log.id} style={{ borderBottom: idx < deletedAccounts.length - 1 ? "1px solid #dc262620" : undefined, backgroundColor: idx % 2 === 0 ? "var(--its-bg)" : "#dc262608" }}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--its-text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">{log.actorName ?? `Admin #${log.actorId}`}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{log.targetUserName ?? (meta.targetName as string) ?? "Unknown"}</div>
                        {(meta.targetEmail as string) && <div className="text-xs mt-0.5" style={{ color: "var(--its-text-muted)" }}>{meta.targetEmail as string}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--its-text-muted)" }}>
                        {(meta.reason as string) ? `Reason: ${meta.reason}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Full Activity Log ── */}
      <div>
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList size={18} style={{ color: "var(--its-text-muted)" }} />
        <h2 className="text-base font-semibold">Admin Activity Log</h2>
        <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: "var(--its-surface)", color: "var(--its-text-muted)", border: "1px solid var(--its-border)" }}>Last 200 actions</span>
      </div>
      {!otherLogs.length ? (
        <EmptyState icon={ClipboardList} message="No admin actions recorded yet." />
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--its-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--its-surface)", borderBottom: "1px solid var(--its-border)" }}>
                {["When", "Actor", "Action", "Target", "Details"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: "var(--its-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {otherLogs.map((log, idx) => {
                let meta: Record<string, unknown> = {};
                try { meta = log.metadata ? JSON.parse(log.metadata) : {}; } catch { /* ignore */ }
                const color = ACTION_COLORS[log.action] ?? "#6b7280";
                return (
                  <tr key={log.id} style={{ borderBottom: idx < otherLogs.length - 1 ? "1px solid var(--its-border)" : undefined, backgroundColor: idx % 2 === 0 ? "var(--its-bg)" : "var(--its-surface)" }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--its-text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{log.actorName ?? `#${log.actorId}`}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.targetUserName ? <span>{log.targetUserName}</span>
                        : log.targetPostId ? <span style={{ color: "var(--its-text-muted)" }}>Post #{log.targetPostId}</span>
                        : <span style={{ color: "var(--its-text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--its-text-muted)" }}>
                      {Object.keys(meta).length > 0 ? Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(", ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>{/* end full activity log */}
    </div>
  );
}

// ─── Admin Listings Tab ───────────────────────────────────────────────────────
function AdminListingsTab() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"all" | "flagged" | "removed">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const isFlaggedFilter = filter === "flagged" ? true : undefined;
  const statusFilter = filter === "removed" ? "removed" : undefined;
  const { data, isLoading } = trpc.shop.adminGetListings.useQuery({ isFlagged: isFlaggedFilter, status: statusFilter, limit: 100, offset: 0 });
  const flagMutation = trpc.shop.adminFlagListing.useMutation({ onSuccess: () => { utils.shop.adminGetListings.invalidate(); toast.success("Listing flagged."); }, onError: (e) => toast.error(e.message) });
  const removeMutation = trpc.shop.adminRemoveListing.useMutation({ onSuccess: () => { utils.shop.adminGetListings.invalidate(); toast.success("Listing removed."); }, onError: (e) => toast.error(e.message) });
  const restoreMutation = trpc.shop.adminRestoreListing.useMutation({ onSuccess: () => { utils.shop.adminGetListings.invalidate(); toast.success("Listing restored."); }, onError: (e) => toast.error(e.message) });
  const listings = data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag size={18} style={{ color: "var(--its-text-muted)" }} />
        <h2 className="text-base font-semibold">Shop Listings</h2>
        <div className="ml-auto flex gap-1">
          {(["all", "flagged", "removed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded text-xs font-medium capitalize"
              style={{ backgroundColor: filter === f ? "var(--its-text-primary)" : "var(--its-surface)", color: filter === f ? "var(--its-bg)" : "var(--its-text-muted)", border: "1px solid var(--its-border)" }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {isLoading && <LoadingSpinner />}
      {!isLoading && listings.length === 0 && <EmptyState icon={ShoppingBag} message="No listings found for this filter." />}
      {listings.map((listing) => {
        const isExpanded = expandedId === listing.id;
        const isRemoved = listing.removedByAdminId != null;
        const isFlagged = listing.isFlagged;
        return (
          <div key={listing.id} className="rounded-lg border p-4"
            style={{ backgroundColor: "var(--its-surface)", borderColor: isRemoved ? "#ef4444" : isFlagged ? "#f59e0b" : "var(--its-border)", opacity: isRemoved ? 0.7 : 1 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{listing.title}</span>
                  {isFlagged && !isRemoved && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}><AlertTriangle size={10} className="inline mr-1" />Flagged</span>}
                  {isRemoved && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Removed</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--its-bg)", color: "var(--its-text-muted)", border: "1px solid var(--its-border)" }}>{listing.category}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--its-text-muted)" }}>{listing.price} {listing.currency} · {listing.location ?? "No location"} · Seller #{listing.sellerId}</p>
                <p className="text-xs mt-1" style={{ color: "var(--its-text-muted)" }}>Listed {new Date(listing.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setExpandedId(isExpanded ? null : listing.id)} className="p-1.5 rounded" style={{ color: "var(--its-text-muted)" }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <a href={`/shop/${listing.id}`} target="_blank" rel="noreferrer" className="p-1.5 rounded" style={{ color: "var(--its-text-muted)" }} title="View listing"><Eye size={16} /></a>
                {!isRemoved && !isFlagged && (
                  <button onClick={() => flagMutation.mutate({ id: listing.id, reason: "Admin flagged" })} disabled={flagMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                    <AlertTriangle size={14} /> Flag
                  </button>
                )}
                {!isRemoved && (
                  <button onClick={() => { if (confirm("Remove this listing?")) removeMutation.mutate({ id: listing.id, reason: "Admin removed" }); }}
                    disabled={removeMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                    <Trash2 size={14} /> Remove
                  </button>
                )}
                {isRemoved && (
                  <button onClick={() => restoreMutation.mutate({ id: listing.id })} disabled={restoreMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
                    <CheckCircle size={14} /> Restore
                  </button>
                )}
              </div>
            </div>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "var(--its-border)" }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div><span style={{ color: "var(--its-text-muted)" }}>ID:</span> {listing.id}</div>
                  <div><span style={{ color: "var(--its-text-muted)" }}>Status:</span> {listing.status}</div>
                  <div><span style={{ color: "var(--its-text-muted)" }}>Condition:</span> {listing.condition}</div>
                  <div><span style={{ color: "var(--its-text-muted)" }}>Contact:</span> {listing.contactEmail ?? listing.contactPhone ?? "—"}</div>
                </div>
                {listing.description && <div className="p-2 rounded" style={{ backgroundColor: "var(--its-bg)" }}>{listing.description}</div>}
                {listing.flagReason && <div className="mt-2" style={{ color: "#92400e" }}>Flag reason: {listing.flagReason}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--its-text-muted)", borderTopColor: "transparent" }} />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-16" style={{ color: "var(--its-text-muted)" }}>
      <Icon size={40} className="mx-auto mb-3 opacity-30" />
      <p>{message}</p>
    </div>
  );
}

function ActionBtn({ color, icon: Icon, label, onClick, disabled }: { color: "green" | "red" | "blue"; icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean }) {
  const styles = {
    green: { backgroundColor: "#d1fae5", color: "#065f46" },
    red: { backgroundColor: "#fee2e2", color: "#991b1b" },
    blue: { backgroundColor: "#dbeafe", color: "#1e40af" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
      style={styles[color]}>
      <Icon size={14} /> {label}
    </button>
  );
}

// ─── News Feed Sources Tab ───────────────────────────────────────────────────
function NewsFeedSourcesTab() {
  const { data: sources, refetch, isLoading } = trpc.newsFeed.sources.useQuery();
  const emptyForm = () => ({ name: "", feedUrl: "", websiteUrl: "", language: "en", displayOrder: 0, isActive: true });
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState<number | null>(null);

  const upsertSource = trpc.newsFeed.upsertSource.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("News feed source saved.");
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (error) => toast.error(error.message || "News feed source could not be saved."),
  });
  const deleteSource = trpc.newsFeed.deleteSource.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("News feed source deleted.");
    },
    onError: (error) => toast.error(error.message || "News feed source could not be deleted."),
  });

  const orderedSources = [...(sources ?? [])].sort((a, b) => ((a as any).displayOrder ?? 0) - ((b as any).displayOrder ?? 0));
  const activeSources = orderedSources.filter((source) => (source as any).isActive);
  const englishSources = activeSources.filter((source) => String((source as any).language ?? "").toLowerCase().startsWith("en"));
  const nepaliSources = activeSources.filter((source) => String((source as any).language ?? "").toLowerCase().startsWith("ne"));

  function startEdit(source: typeof sources extends (infer T)[] | undefined ? T : never) {
    if (!source) return;
    setEditing((source as any).id);
    setForm({
      name: (source as any).name ?? "",
      feedUrl: (source as any).feedUrl ?? "",
      websiteUrl: (source as any).websiteUrl ?? "",
      language: (source as any).language ?? "en",
      displayOrder: (source as any).displayOrder ?? 0,
      isActive: (source as any).isActive ?? true,
    });
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Please enter a source name.");
      return;
    }
    if (!form.feedUrl.trim()) {
      toast.error("Please enter the RSS feed URL.");
      return;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      feedUrl: form.feedUrl.trim(),
      websiteUrl: form.websiteUrl.trim() || null,
      language: form.language.trim() || "en",
      displayOrder: Number.isFinite(form.displayOrder) ? form.displayOrder : 0,
      isActive: form.isActive,
    };
    if (editing) payload.id = editing;
    upsertSource.mutate(payload as Parameters<typeof upsertSource.mutate>[0]);
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold">Home News Feed Sources</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Replace the free RSS sources shown in the right column of the home page. Keep at least one active English source and one active Nepali source for a balanced news feed.
          </p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm()); }}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--its-red)] text-white hover:opacity-90 self-start">
          Add News Source
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Sources</p>
          <p className="text-2xl font-black mt-1">{orderedSources.length}</p>
          <p className="text-[10px] text-muted-foreground">Saved RSS entries</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active</p>
          <p className="text-2xl font-black mt-1 text-green-600">{activeSources.length}</p>
          <p className="text-[10px] text-muted-foreground">Visible on home page</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">English</p>
          <p className="text-2xl font-black mt-1">{englishSources.length}</p>
          <p className="text-[10px] text-muted-foreground">Active English feeds</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nepali</p>
          <p className="text-2xl font-black mt-1">{nepaliSources.length}</p>
          <p className="text-[10px] text-muted-foreground">Active Nepali feeds</p>
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6">
        <p className="text-xs font-bold mb-2">Recommended setup</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Use RSS URLs when available. Your TodayPress and NepaliSamachar feeds were probed but common RSS endpoints did not respond reliably, so the migration seeds fallback free feeds that can be replaced here any time.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)]">{editing ? "Edit Source" : "Create Source"}</p>
            <h3 className="text-sm font-bold">RSS News Source</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">Free RSS / XML feed</span>
        </div>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Source Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="The Himalayan Times" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Language</label>
              <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="en">English</option>
                <option value="ne">Nepali</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">RSS Feed URL</label>
            <input value={form.feedUrl} onChange={(e) => setForm((f) => ({ ...f, feedUrl: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="https://example.com/feed/" />
          </div>
          <div className="grid sm:grid-cols-[1fr_140px] gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Website URL</label>
              <input value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="https://example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Display Order</label>
              <input type="number" value={form.displayOrder} onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="newsSourceActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-[var(--its-red)]" />
            <label htmlFor="newsSourceActive" className="text-sm font-semibold">Active on home page</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSave} disabled={upsertSource.isPending}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--its-red)] text-white hover:opacity-90 disabled:opacity-50">
              {upsertSource.isPending ? "Saving…" : editing ? "Update Source" : "Create Source"}
            </button>
            <button onClick={() => { setEditing(null); setForm(emptyForm()); }}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-border hover:bg-muted">
              Clear Form
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold">Configured Sources</h3>
        <p className="text-xs text-muted-foreground">The right home column reads active sources in display-order order.</p>
      </div>
      {orderedSources.length === 0 ? (
        <p className="text-xs text-muted-foreground">No news feed sources yet. Add one English and one Nepali RSS feed above.</p>
      ) : (
        <div className="space-y-3">
          {orderedSources.map((source) => (
            <div key={(source as any).id} className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold truncate">{(source as any).name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{(source as any).language}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(source as any).isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {(source as any).isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 break-all">{(source as any).feedUrl}</p>
                {(source as any).websiteUrl && <p className="text-[11px] text-muted-foreground mt-1 break-all">Website: {(source as any).websiteUrl}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">Display order: {(source as any).displayOrder ?? 0}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => startEdit(source as any)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border hover:bg-muted">Edit</button>
                <button onClick={() => deleteSource.mutate({ id: (source as any).id })} disabled={deleteSource.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Advertisements Tab ───────────────────────────────────────────────────────
function AdvertisementsTab() {
  const { data: ads, refetch } = trpc.feedAds.list.useQuery();
  const { data: stats } = trpc.feedAds.stats.useQuery();
  const emptyForm = () => ({ title: "", description: "", imageUrl: "", imageKey: "", linkUrl: "", linkText: "Learn More", imageWidth: 600, imageHeight: 400, isActive: false });
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const orderedAds = [...(ads ?? [])].sort((a, b) => {
    const aTime = new Date((a as any).createdAt ?? 0).getTime();
    const bTime = new Date((b as any).createdAt ?? 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return ((a as any).id ?? 0) - ((b as any).id ?? 0);
  });
  const activeAds = orderedAds.filter((ad) => (ad as any).isActive);
  const inactiveAds = orderedAds.length - activeAds.length;
  const totalImpressions = (stats ?? []).reduce((sum, item) => sum + item.impressions, 0);
  const totalClicks = (stats ?? []).reduce((sum, item) => sum + item.clicks, 0);
  const nextSlotNumber = orderedAds.length + 1;
  const editingSlotNumber = editing ? orderedAds.findIndex((ad) => (ad as any).id === editing) + 1 : 0;
  const formSlotLabel = editing ? `Ad Slot ${editingSlotNumber || "—"}` : `Ad Slot ${nextSlotNumber}`;

  const upsertAd = trpc.feedAds.upsert.useMutation({
    onSuccess: () => { refetch(); toast.success("Advertisement saved!"); setEditing(null); setForm(emptyForm()); },
    onError: (error) => { toast.error(error.message || "Advertisement could not be saved. Please try again."); },
  });
  const deleteAd = trpc.feedAds.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Advertisement deleted."); } });
  const uploadMedia = trpc.media.upload.useMutation();

  function startEdit(ad: typeof ads extends (infer T)[] | undefined ? T : never) {
    if (!ad) return;
    setEditing((ad as any).id);
    setForm({
      title: (ad as any).title ?? "",
      description: (ad as any).description ?? "",
      imageUrl: (ad as any).imageUrl ?? "",
      imageKey: (ad as any).imageKey ?? "",
      linkUrl: (ad as any).linkUrl ?? "",
      linkText: (ad as any).linkText ?? "Learn More",
      imageWidth: (ad as any).imageWidth ?? 600,
      imageHeight: (ad as any).imageHeight ?? 400,
      isActive: (ad as any).isActive ?? false,
    });
  }

  function startNewAd(active = false) {
    setEditing(null);
    setForm({ ...emptyForm(), isActive: active });
  }

  function duplicateAd(ad: typeof ads extends (infer T)[] | undefined ? T : never) {
    if (!ad) return;
    setEditing(null);
    setForm({
      title: `${(ad as any).title ?? "Advertisement"} Copy`,
      description: (ad as any).description ?? "",
      imageUrl: (ad as any).imageUrl ?? "",
      imageKey: (ad as any).imageKey ?? "",
      linkUrl: (ad as any).linkUrl ?? "",
      linkText: (ad as any).linkText ?? "Learn More",
      imageWidth: (ad as any).imageWidth ?? 600,
      imageHeight: (ad as any).imageHeight ?? 400,
      isActive: (ad as any).isActive ?? true,
    });
    toast.info(`Copied into ${`Ad Slot ${nextSlotNumber}`}. Review and save to create it.`);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadMedia.mutateAsync({
          filename: file.name,
          contentType: file.type,
          base64,
          mediaType: "image",
        });
        setForm((f) => ({ ...f, imageUrl: result.url }));
        toast.success("Image uploaded!");
        setUploading(false);
      };
      reader.onerror = () => { toast.error("Upload failed"); setUploading(false); };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Upload failed");
      setUploading(false);
    }
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("Please enter an advertisement title.");
      return;
    }
    if (!form.imageUrl.trim()) {
      toast.error("Please upload an ad image or paste an image URL.");
      return;
    }
    const payload: Record<string, unknown> = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      imageKey: form.imageKey.trim() || undefined,
      linkUrl: form.linkUrl.trim() || undefined,
      linkText: form.linkText.trim() || "Learn More",
      imageWidth: Number.isFinite(form.imageWidth) && form.imageWidth > 0 ? form.imageWidth : 600,
      imageHeight: Number.isFinite(form.imageHeight) && form.imageHeight > 0 ? form.imageHeight : 400,
    };
    if (editing) payload.id = editing;
    upsertAd.mutate(payload as Parameters<typeof upsertAd.mutate>[0]);
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold">Feed Advertisements</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage the ads shown in the main feed. An advertisement now appears after every 8th post, and active ads rotate by slot so you can run 4, 5, or more ads at the same time.
          </p>
        </div>
        <button onClick={() => startNewAd(true)}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--its-red)] text-white hover:opacity-90 self-start">
          Add Active Slot
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Slots</p>
          <p className="text-2xl font-black mt-1">{orderedAds.length}</p>
          <p className="text-[10px] text-muted-foreground">Next: Ad Slot {nextSlotNumber}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Rotation</p>
          <p className="text-2xl font-black mt-1 text-green-600">{activeAds.length}</p>
          <p className="text-[10px] text-muted-foreground">{inactiveAds} paused</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Impressions</p>
          <p className="text-2xl font-black mt-1">{totalImpressions.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">All ads combined</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clicks</p>
          <p className="text-2xl font-black mt-1">{totalClicks.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">All ads combined</p>
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6">
        <p className="text-xs font-bold mb-2">How slots work</p>
        <div className="grid sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
          <div className="bg-card border border-border rounded-lg p-2"><b className="text-foreground">Post 8</b><br />Ad Slot 1</div>
          <div className="bg-card border border-border rounded-lg p-2"><b className="text-foreground">Post 16</b><br />Ad Slot 2</div>
          <div className="bg-card border border-border rounded-lg p-2"><b className="text-foreground">Post 24</b><br />Ad Slot 3</div>
          <div className="bg-card border border-border rounded-lg p-2"><b className="text-foreground">Post 32+</b><br />Continues through every active ad</div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">If there are more feed placements than active ads, the rotation loops back to the first active ad. Multiple ads can remain active simultaneously.</p>
      </div>

      {/* Ad form */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)]">{formSlotLabel}</p>
            <h3 className="text-sm font-bold">{editing ? "Edit Advertisement Slot" : "Create Advertisement Slot"}</h3>
          </div>
          {!editing && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">Unlimited slots supported</span>}
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="Ad headline" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" placeholder="Short description" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Ad Image</label>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="Ad preview" className="w-full max-h-48 object-cover rounded-lg mb-2 border border-border" />
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading}
              className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--its-red)] file:text-white hover:file:opacity-90" />
            {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
            <p className="text-[10px] text-muted-foreground mt-1">Or paste image URL directly:</p>
            <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Image Width (px)</label>
              <input type="number" value={form.imageWidth} onChange={(e) => setForm((f) => ({ ...f, imageWidth: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Image Height (px)</label>
              <input type="number" value={form.imageHeight} onChange={(e) => setForm((f) => ({ ...f, imageHeight: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Link URL</label>
            <input value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Button Text</label>
            <input value={form.linkText} onChange={(e) => setForm((f) => ({ ...f, linkText: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="Learn More" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="adActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-[var(--its-red)]" />
            <label htmlFor="adActive" className="text-sm font-semibold">Active (multiple ads can be active for rotation)</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSave} disabled={uploading || upsertAd.isPending}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--its-red)] text-white hover:opacity-90 disabled:opacity-50">
              {uploading ? "Uploading…" : upsertAd.isPending ? "Saving…" : editing ? "Update Slot" : "Create Slot"}
            </button>
            <button onClick={() => startNewAd(false)}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-border hover:bg-muted">
              Clear Form
            </button>
            {editing && (
              <button onClick={() => startNewAd(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold border border-border hover:bg-muted">
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ads list */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold">Advertisement Slots</h3>
        <p className="text-xs text-muted-foreground">{activeAds.length} active ads in rotation; ad cards display after every 8 posts.</p>
      </div>
      {orderedAds.length === 0 ? (
        <p className="text-xs text-muted-foreground">No advertisements yet. Create Ad Slot 1 above.</p>
      ) : (
        <div className="space-y-3">
          {orderedAds.map((ad, index) => {
            const slotNumber = index + 1;
            const activeIndex = activeAds.findIndex((activeAd) => (activeAd as any).id === (ad as any).id);
            const adStat = (stats ?? []).find((s) => s.adId === (ad as any).id);
            return (
              <div key={(ad as any).id} className="bg-card border border-border rounded-xl p-3 flex gap-3 items-start">
                <div className="w-16 flex-shrink-0 text-center">
                  <div className="rounded-xl border border-border bg-muted px-2 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Slot</p>
                    <p className="text-xl font-black">{slotNumber}</p>
                  </div>
                  {(ad as any).isActive && (
                    <p className="text-[9px] text-green-600 font-bold mt-1">Rotation #{activeIndex + 1}</p>
                  )}
                </div>
                {(ad as any).imageUrl && (
                  <img src={(ad as any).imageUrl} alt="" className="w-20 h-16 object-cover rounded-lg flex-shrink-0 border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold truncate">{(ad as any).title || "Untitled"}</span>
                    {(ad as any).isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">ACTIVE</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">PAUSED</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{(ad as any).description || "—"}</p>
                  <p className="text-[10px] text-muted-foreground mb-1">{(ad as any).imageWidth}×{(ad as any).imageHeight}px · Feed position: after post {slotNumber * 8}{activeAds.length > 0 ? `, then loops every ${activeAds.length * 8} posts` : ""}</p>
                  {adStat ? (
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>{adStat.impressions.toLocaleString()} views</span>
                      <span>{adStat.clicks.toLocaleString()} clicks</span>
                      <span className="font-bold text-foreground">{adStat.ctr}% CTR</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No stats yet</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => startEdit(ad)}
                    className="px-3 py-1 rounded text-xs font-bold border border-border hover:bg-muted">Edit</button>
                  <button onClick={() => duplicateAd(ad)}
                    className="px-3 py-1 rounded text-xs font-bold border border-border hover:bg-muted">Duplicate</button>
                  <button onClick={() => upsertAd.mutate({ id: (ad as any).id, isActive: !(ad as any).isActive })}
                    className={`px-3 py-1 rounded text-xs font-bold ${(ad as any).isActive ? "bg-muted text-muted-foreground" : "bg-green-600 text-white hover:opacity-90"}`}>
                    {(ad as any).isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => { if (confirm("Delete this ad slot?")) deleteAd.mutate({ id: (ad as any).id }); }}
                    className="px-3 py-1 rounded text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── People You May Know Tab ──────────────────────────────────────────────────
function PeopleYouMayKnowTab() {
  const { data: suggestions, isLoading, refetch } = trpc.admin.getPeopleYouMayKnow.useQuery({ limit: 100, offset: 0 });
  const removeSuggestion = trpc.admin.removePeopleYouMayKnowSuggestion.useMutation({
    onSuccess: () => { refetch(); toast.success("Suggestion removed."); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!suggestions?.length) return <EmptyState icon={Users} message="No user suggestions at this time." />;

  return (
    <div className="space-y-3">
      <div className="text-sm" style={{ color: "var(--its-text-muted)" }}>
        Manage user suggestions shown in "People You May Know" section. Remove suggestions that are inappropriate or irrelevant.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((user: any) => (
          <div key={user.id} className="rounded-lg border p-4 flex flex-col items-center text-center" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
            {user.profilePicture && (
              <img src={user.profilePicture} alt={user.name} className="w-16 h-16 rounded-full mb-2 object-cover" />
            )}
            <h4 className="font-semibold text-sm mb-1">{user.name}</h4>
            <p className="text-xs mb-3" style={{ color: "var(--its-text-muted)" }}>ID: #{user.id}</p>
            <button
              onClick={() => { if (confirm(`Remove ${user.name} from suggestions?`)) removeSuggestion.mutate({ userId: user.id }); }}
              className="px-3 py-1.5 rounded text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 w-full"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Email Reminders Tab ──────────────────────────────────────────────────────
function EmailRemindersTab() {
  const utils = trpc.useUtils();
  const { data: status, isLoading: statusLoading, error: statusError } = trpc.inactiveReminders.status.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const runReminders = trpc.inactiveReminders.trigger.useMutation({
    onSuccess: (result) => {
      utils.inactiveReminders.status.invalidate();
      if (result.failed > 0) {
        toast.error(`Reminder run finished: ${result.sent} sent, ${result.failed} failed.`);
      } else if (result.sent > 0) {
        toast.success(`Reminder run finished: ${result.sent} email${result.sent === 1 ? "" : "s"} accepted by SMTP.`);
      } else {
        toast.success("Reminder run finished. No eligible inactive users required an email.");
      }
    },
    onError: (error) => toast.error(error.message || "Reminder run could not be started."),
  });

  const sendTest = trpc.inactiveReminders.sendTest.useMutation({
    onSuccess: (result) => {
      toast.success(`Test email accepted for ${result.recipient}. Check Inbox and Spam.`);
      utils.inactiveReminders.status.invalidate();
    },
    onError: (error) => toast.error(error.message || "Test email could not be sent."),
  });

  const summary = status?.summary;
  const email = status?.email;
  const lastRun = runReminders.data;
  const formatDate = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString() : "No reminder sent in the last 30 days";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold mb-2">Inactive User Reminders</h3>
            <p style={{ color: "var(--its-text-muted)" }} className="text-sm">
              Sends one re-engagement email to each eligible user inactive for 14+ days, with a 30-day repeat safeguard.
            </p>
          </div>
          <Mail size={24} style={{ color: "var(--its-text-muted)" }} />
        </div>

        {statusError && (
          <div className="mb-4 rounded-lg p-3 text-sm" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
            Reminder status could not be loaded: {statusError.message}
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ backgroundColor: "var(--its-bg)" }}>
            <p className="text-sm font-semibold mb-2">Delivery configuration</p>
            <div className="space-y-2 text-sm" style={{ color: "var(--its-text-muted)" }}>
              <p><strong>Sender:</strong> {email?.from ?? "Checking configuration…"}</p>
              <p><strong>SMTP status:</strong> {email?.configured ? "Configured and ready for a test" : "Not configured — emails will not be sent"}</p>
              <p><strong>Frequency:</strong> Manual send is available below. A daily schedule is optional and must be configured separately.</p>
              <p><strong>Safety:</strong> Test email goes only to the configured owner inbox; the reminder run never sends active users a test message.</p>
            </div>
          </div>

          {!statusLoading && email && !email.configured && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
              Configure Gmail SMTP in Render before using either button. The system will show a real error instead of claiming success.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => sendTest.mutate()}
              disabled={sendTest.isPending || runReminders.isPending || !email?.configured}
              className="px-6 py-3 rounded-lg font-bold border transition-opacity"
              style={{ borderColor: "var(--its-red)", color: "var(--its-red)", opacity: sendTest.isPending || runReminders.isPending || !email?.configured ? 0.55 : 1, cursor: sendTest.isPending || runReminders.isPending || !email?.configured ? "not-allowed" : "pointer" }}
            >
              {sendTest.isPending ? "Sending Test…" : "Send Test to Owner Inbox"}
            </button>
            <button
              onClick={() => runReminders.mutate()}
              disabled={runReminders.isPending || sendTest.isPending || !email?.configured}
              className="px-6 py-3 rounded-lg font-bold text-white transition-opacity"
              style={{ backgroundColor: "var(--its-red)", opacity: runReminders.isPending || sendTest.isPending || !email?.configured ? 0.55 : 1, cursor: runReminders.isPending || sendTest.isPending || !email?.configured ? "not-allowed" : "pointer" }}
            >
              {runReminders.isPending ? "Sending Reminders…" : "Send Eligible Reminders Now"}
            </button>
          </div>

          {lastRun && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: lastRun.failed > 0 ? "#fef3c7" : "#dcfce7", color: lastRun.failed > 0 ? "#92400e" : "#166534" }}>
              <p className="font-semibold">Last run: {formatDate(lastRun.completedAt)}</p>
              <p>Eligible: {lastRun.eligibleUsers} · Sent: {lastRun.sent} · Skipped: {lastRun.skipped} · Failed: {lastRun.failed}</p>
              {lastRun.errors[0] && <p className="mt-1">First error: {lastRun.errors[0]}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-6" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <h3 className="text-lg font-bold mb-4">Current Reminder Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--its-bg)" }}>
            <div><p className="text-sm font-semibold">Inactive users identified</p><p style={{ color: "var(--its-text-muted)" }} className="text-xs">No activity for 14+ days</p></div>
            <p className="text-lg font-bold">{statusLoading ? "…" : summary?.inactiveUsers ?? "—"}</p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--its-bg)" }}>
            <div><p className="text-sm font-semibold">Eligible now</p><p style={{ color: "var(--its-text-muted)" }} className="text-xs">Has email and no reminder in the past 30 days</p></div>
            <p className="text-lg font-bold">{statusLoading ? "…" : summary?.eligibleUsers ?? "—"}</p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--its-bg)" }}>
            <div><p className="text-sm font-semibold">Reminders sent in last 30 days</p><p style={{ color: "var(--its-text-muted)" }} className="text-xs">Last accepted reminder: {formatDate(summary?.latestReminderAt)}</p></div>
            <p className="text-lg font-bold">{statusLoading ? "…" : summary?.remindersSentLast30Days ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6" style={{ backgroundColor: "var(--its-surface)", borderColor: "var(--its-border)" }}>
        <h3 className="text-lg font-bold mb-4">Email Template Preview</h3>
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--its-border)" }}>
          <div style={{ backgroundColor: "#1877f2", padding: "20px", textAlign: "center" }}><div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}><div style={{ background: "#e63329", width: "44px", height: "44px", borderRadius: "8px", display: "inline-block", textAlign: "center", lineHeight: "44px", fontWeight: "900", fontSize: "16px", color: "#fff" }}>FF</div><span style={{ fontSize: "26px", fontWeight: "900", color: "#fff", letterSpacing: "-1px" }}>FacingFace</span></div></div>
          <div style={{ padding: "20px", backgroundColor: "#f9f9f9" }}><h4 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: "bold", color: "#1c1e21" }}>We miss you!</h4><p style={{ margin: "0 0 12px", color: "#4b4f56", fontSize: "14px", lineHeight: "1.6" }}>Hi Friend,</p><p style={{ margin: "0 0 12px", color: "#4b4f56", fontSize: "14px", lineHeight: "1.6" }}>We noticed you have not been active on FacingFace for a while. Come back and catch up with friends, check new posts, and share what is on your mind.</p><div style={{ textAlign: "center", marginBottom: "16px" }}><span style={{ display: "inline-block", backgroundColor: "#1877f2", color: "#fff", fontWeight: "700", fontSize: "14px", padding: "10px 24px", borderRadius: "6px" }}>Come Back to FacingFace</span></div><p style={{ margin: 0, color: "#8a8d91", fontSize: "12px" }}>© 2026 FacingFace. All rights reserved.</p></div>
        </div>
      </div>
    </div>
  );
}
