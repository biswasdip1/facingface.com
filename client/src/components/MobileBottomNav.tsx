import { useLocation, Link } from "wouter";
import { Home, Users, MessageCircle, Bookmark, Phone, Clapperboard } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// 6-item bottom nav: Home · Friends · Messages · Saved · Calls · Reels
const NAV_ITEMS = [
  { label: "Home",     icon: Home,           href: "/" },
  { label: "Friends",  icon: Users,          href: "/friends" },
  { label: "Messages", icon: MessageCircle,  href: "/messages" },
  { label: "Saved",    icon: Bookmark,       href: "/saved" },
  { label: "Calls",    icon: Phone,          href: "/calls" },
  { label: "Reels",    icon: Clapperboard,   href: "/reels" },
];

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: unreadMessages } = trpc.dm.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  const { data: friendPendingData } = trpc.friends.pendingCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  const { data: missedCallData } = trpc.callHistory.missedCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (!user) return null;

  const msgCount        = (unreadMessages as { count?: number } | undefined)?.count ?? 0;
  const friendCount     = friendPendingData?.count ?? 0;
  const missedCallCount = missedCallData?.count ?? 0;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch h-14 safe-area-pb">
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
        const isActive =
          href === "/" ? location === "/" : location.startsWith(href);

        const badge =
          label === "Messages" && msgCount        > 0 ? msgCount        :
          label === "Friends"  && friendCount     > 0 ? friendCount     :
          label === "Calls"    && missedCallCount  > 0 ? missedCallCount  :
          null;

        // Home button: if already on home, scroll to top instead of navigating
        if (label === "Home") {
          return (
            <button
              key={href}
              onClick={() => {
                if (isActive) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  window.location.href = href;
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                isActive
                  ? "text-[#b91c1c]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${isActive ? "text-[#b91c1c]" : ""}`}>
                {label}
              </span>
            </button>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
              isActive
                ? "text-[#b91c1c]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative">
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              {badge !== null && (
                <span className="absolute -top-1.5 -right-2 bg-[#b91c1c] text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${isActive ? "text-[#b91c1c]" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
