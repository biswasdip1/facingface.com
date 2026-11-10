import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import {
  Home, User, Users, MessageCircle, MessagesSquare, Phone, Bell, BookImage,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/",              label: "Home",          icon: Home },
  { href: "/#stories",      label: "Stories",       icon: BookImage, scrollToStories: true },
  { href: "/profile",       label: "Profile",       icon: User },
  { href: "/friends",       label: "Friends",       icon: Users },
  { href: "/messages",      label: "Messages",      icon: MessageCircle },
  { href: "/groups",        label: "Groups",        icon: MessagesSquare },
  { href: "/calls",         label: "Calls",         icon: Phone },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

/** Publish the current visible state so App.tsx can adjust pt accordingly */
export let subNavVisible = true;
type VisibilityListener = (v: boolean) => void;
const listeners: VisibilityListener[] = [];
export function onSubNavVisibilityChange(fn: VisibilityListener) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
}
function notifyListeners(v: boolean) {
  subNavVisible = v;
  listeners.forEach((fn) => fn(v));
}

export default function SubNav() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        if (delta > 6 && currentY > 80) {
          // scrolling down — hide
          setVisible(false);
          notifyListeners(false);
        } else if (delta < -4) {
          // scrolling up — show
          setVisible(true);
          notifyListeners(true);
        }
        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!user) return null;

  const isActive = (href: string) => {
    if (href === "/" || href === "/#stories") return location === "/";
    return location.startsWith(href);
  };

  const handleStoriesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location !== "/") {
      navigate("/");
      // After navigation, scroll to the story bar
      setTimeout(() => {
        const el = document.getElementById("story-bar");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else {
      const el = document.getElementById("story-bar");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className="fixed left-0 right-0 z-40 border-b"
      style={{
        top: 64,
        height: 40,
        backgroundColor: "var(--its-surface)",
        borderColor: "var(--its-border)",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.25s ease",
        willChange: "transform",
      }}
    >
      <div
        className="flex items-center h-full overflow-x-auto scrollbar-none"
        style={{ paddingLeft: 8, paddingRight: 8, gap: 0 }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon, scrollToStories }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={scrollToStories ? "/" : (href === "/profile" ? `/profile/${user.id}` : href)}
              onClick={scrollToStories ? handleStoriesClick : undefined}
              className="flex items-center gap-1.5 px-3 h-full flex-shrink-0 no-underline transition-colors relative"
              style={{
                color: active ? "var(--its-red)" : "var(--its-text-muted)",
                fontFamily: "inherit",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              <Icon
                size={13}
                strokeWidth={active ? 2.5 : 1.8}
                style={{ flexShrink: 0 }}
              />
              {label}
              {/* Active underline */}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: 2,
                    backgroundColor: "var(--its-red)",
                    borderRadius: "2px 2px 0 0",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
