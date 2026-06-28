import type React from "react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Heart, MessageCircle, UserPlus, Loader2, Users, ShieldCheck, Headphones, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import BroadcastNotifications from "@/components/BroadcastNotifications";

const notifIcons: Record<string, React.ElementType> = {
  like_post: Heart,
  like_comment: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  friend_request: Users,
  friend_accepted: Users,
  admin_promoted: ShieldCheck,
  support_reply: Headphones,
};

const notifMessages: Record<string, string> = {
  like_post: "liked your post",
  like_comment: "liked your comment",
  comment: "commented on your post",
  follow: "started following you",
  friend_request: "sent you a friend request",
  friend_accepted: "accepted your friend request",
  admin_promoted: "promoted you to admin — welcome to the team!",
  support_reply: "replied to your support message — tap to view",
};

export default function Notifications() {
  const utils = trpc.useUtils();
  const [showBroadcasts, setShowBroadcasts] = useState(false);

  const { data, isLoading } = trpc.notifications.list.useQuery();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Mark all as read when page opens
  useEffect(() => {
    markRead.mutate();
  }, []);

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="its-accent-lg" />
          <h1 className="text-sm font-black tracking-widest uppercase text-foreground">Notifications</h1>
          <div className="flex-1 its-divider" />
          <button
            onClick={() => setShowBroadcasts(true)}
            className="flex items-center gap-2 px-3 py-2 rounded bg-[var(--its-red)] text-white font-bold hover:opacity-90 transition-opacity text-sm"
            title="View broadcast messages"
          >
            <Mail size={16} />
            <span className="hidden sm:inline">Broadcasts</span>
          </button>
        </div>

        {/* Broadcast Notifications Modal */}
        <BroadcastNotifications isOpen={showBroadcasts} onClose={() => setShowBroadcasts(false)} />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-foreground" size={24} />
          </div>
        ) : !data?.notifications.length ? (
          <div className="border border-border p-12 text-center">
            <div className="flex justify-center mb-4">
              <span className="its-accent-lg" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-foreground mb-2">All Caught Up</p>
            <p className="text-xs text-muted-foreground">No notifications yet. Interact with others to see activity here.</p>
          </div>
        ) : (
          <div className="border border-border">
            {data.notifications.map((notif, idx) => {
              const actor = data.actors[notif.actorId];
              const Icon = notifIcons[notif.type];
              const message = notifMessages[notif.type];
              const timeAgo = formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true });
              const isLike = notif.type === "like_post" || notif.type === "like_comment";

              const notifHref = notif.type === "support_reply" ? "/contact-support" : notif.postId ? `/post/${notif.postId}` : `/profile/${notif.actorId}`;

              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 ${
                    idx < data.notifications.length - 1 ? "border-b border-border" : ""
                  } ${!notif.isRead ? "bg-secondary" : "bg-background"} hover:bg-secondary transition-colors`}
                >
                  {/* Actor avatar */}
                  <Link href={notif.type === "support_reply" ? "/contact-support" : `/profile/${notif.actorId}`} className="no-underline flex-shrink-0">
                    {actor?.avatar ? (
                      <img
                        src={actor.avatar}
                        alt={actor.name ?? ""}
                        className="w-9 h-9 object-cover border border-border"
                        style={{ borderRadius: 0 }}
                      />
                    ) : (
                      <div className="w-9 h-9 bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-bold">
                          {(actor?.name ?? "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <Link href={`/profile/${notif.actorId}`} className="font-bold text-foreground no-underline hover:underline">
                        {actor?.name ?? "Someone"}
                      </Link>
                      {" "}
                      <span className="text-muted-foreground">{message}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
                  </div>

                  {/* Icon */}
                  <div className={`flex-shrink-0 ${isLike ? "text-[var(--its-red)]" : "text-foreground"}`}>
                    <Icon size={16} />
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: "var(--its-red)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
