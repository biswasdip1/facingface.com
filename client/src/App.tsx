import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ThemeModeProvider } from "./contexts/ThemeModeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Landing from "./pages/Landing";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import NavBar from "./components/NavBar";
import VerifyEmail from "./pages/VerifyEmail";
import CheckYourEmail from "./pages/CheckYourEmail";
import Friends from "./pages/Friends";
import Messages from "./pages/Messages";
import Messenger from "./pages/Messenger";
import Calls from "./pages/Calls";
import GroupChat from "./pages/GroupChat";
import GroupCall from "./pages/GroupCall";
import Admin from "./pages/Admin";
import AdminStopStreams from "./pages/AdminStopStreams";
import PostDetail from "./pages/PostDetail";
import SearchPage from "./pages/SearchPage";
import HashtagPage from "./pages/HashtagPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Security from "./pages/Security";
import BlockedUsers from "./pages/BlockedUsers";
import SubscriptionPage, { SubscriptionSuccessPage } from "./pages/Subscription";
import SubscriptionTiers from "./pages/SubscriptionTiers";
import MobileBottomNav from "./components/MobileBottomNav";
import { NetworkStatusBanner } from "./components/NetworkStatusBanner";
import SavedPage from "./pages/Saved";
import ContactSupport from "./pages/ContactSupport";
import ScheduledPage from "./pages/Scheduled";
import TrendingPage from "./pages/Trending";
import AboutPage from "./pages/About";
import HelpPage from "./pages/Help";
import PrivacyPage from "./pages/Privacy";
import TermsPage from "./pages/Terms";
import AdvertisingPage from "./pages/Advertising";
import CookiesPage from "./pages/Cookies";
import PagesPage from "./pages/Pages";
import PageView from "./pages/PageView";
import GroupsPage from "./pages/Groups";
import GroupView from "./pages/GroupView";
import Shop from "./pages/Shop";
import ShopCreateListing from "./pages/ShopCreateListing";
import ShopListingDetail from "./pages/ShopListingDetail";
import ShopMyListings from "./pages/ShopMyListings";
import BirthdaysPage from "./pages/Birthdays";
import EventsPage from "./pages/Events";
import Reels, { ReelShareCard } from "./pages/Reels";
import CallModal from "./components/CallModal";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1">
            <span className="its-accent-lg" />
            <span className="its-accent-lg" style={{ opacity: 0.4 }} />
            <span className="its-accent-lg" style={{ opacity: 0.2 }} />
          </div>
          <p className="text-xs font-bold tracking-widest uppercase text-foreground">Loading</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <>{children}</>;
}

function AppLayout() {
  const { user } = useAuth();

  // ── Global incoming call state ─────────────────────────────────────────────
  const [globalIncomingCall, setGlobalIncomingCall] = useState<{
    peerId: number;
    peerName: string;
    peerAvatar?: string | null;
    isVideo: boolean;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  const globalSocketRef = useRef<any>(null);
  const pushSubscribeMutation = trpc.push.subscribe.useMutation();
  const updatePresenceMutation = trpc.dm.updatePresence.useMutation();
  const { data: vapidData } = trpc.push.vapidPublicKey.useQuery(undefined, { enabled: !!user });

  // Track normal authenticated browsing as activity. Previously this timestamp
  // was refreshed only in message screens, which could wrongly classify active
  // members as inactive for email reminders.
  useEffect(() => {
    if (!user) return;
    const touchPresence = () => updatePresenceMutation.mutate();
    touchPresence();
    const interval = window.setInterval(touchPresence, 5 * 60 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") touchPresence();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user?.id]);

  // Register service worker + subscribe to Web Push on login
  useEffect(() => {
    if (!user || !vapidData?.key) return;
    const vapidKey = vapidData.key;
    if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          const k = existingSub.getKey("p256dh");
          const a = existingSub.getKey("auth");
          if (k && a) {
            pushSubscribeMutation.mutate({
              endpoint: existingSub.endpoint,
              p256dh: btoa(String.fromCharCode(...Array.from(new Uint8Array(k)))),
              auth: btoa(String.fromCharCode(...Array.from(new Uint8Array(a)))),
            });
          }
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        const k = sub.getKey("p256dh");
        const a = sub.getKey("auth");
        if (k && a) {
          pushSubscribeMutation.mutate({
            endpoint: sub.endpoint,
            p256dh: btoa(String.fromCharCode(...Array.from(new Uint8Array(k)))),
            auth: btoa(String.fromCharCode(...Array.from(new Uint8Array(a)))),
          });
        }
      } catch (err) {
        console.warn("[Push] Service worker registration failed:", err);
      }
    })();
  }, [user?.id, vapidData?.key]);

  // Connect a global Socket.IO listener so incoming calls ring on any page.
  // When the user is on /messages, that page has its own socket — we skip here
  // to avoid double-answering.
  useEffect(() => {
    if (!user) return;
    import("socket.io-client")
      .then(({ io }) => {
        const socket = io(window.location.origin, {
          path: "/api/socket.io",
          query: { userId: user.id },
        });
        globalSocketRef.current = socket;

        socket.on(
          "call:offer",
          ({
            from,
            fromName,
            fromAvatar,
            offer,
            isVideo,
          }: {
            from: number;
            fromName: string;
            fromAvatar?: string;
            offer: RTCSessionDescriptionInit;
            isVideo: boolean;
          }) => {
            // Messages.tsx handles its own incoming calls
            if (window.location.pathname.startsWith("/messages")) return;
            setGlobalIncomingCall({
              peerId: from,
              peerName: fromName,
              peerAvatar: fromAvatar ?? null,
              isVideo,
              offer,
            });
          }
        );
      })
      .catch(() => {});

    return () => {
      globalSocketRef.current?.disconnect();
      globalSocketRef.current = null;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Global incoming call overlay — visible on any page except /messages */}
      {globalIncomingCall && (
        <CallModal
          peerId={globalIncomingCall.peerId}
          peerName={globalIncomingCall.peerName}
          peerAvatar={globalIncomingCall.peerAvatar}
          isVideo={globalIncomingCall.isVideo}
          incomingOffer={globalIncomingCall.offer}
          socketRef={globalSocketRef}
          onClose={() => setGlobalIncomingCall(null)}
        />
      )}
      <NetworkStatusBanner />
      <NavBar />
      <MobileBottomNav />
      <main className="pt-16 pb-16 sm:pb-0">
        <Switch>
          <Route path="/" component={Feed} />
          <Route path="/profile/:id?" component={Profile} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/friends" component={Friends} />
          <Route path="/messages" component={Messages} />
          <Route path="/calls" component={Calls} />
          <Route path="/groups" component={GroupChat} />
          <Route path="/calls/group/:roomId" component={GroupCall} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin-stop-streams" component={AdminStopStreams} />
          <Route path="/post/:id" component={PostDetail} />
          <Route path="/search" component={SearchPage} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/tag/:tag" component={HashtagPage} />
          <Route path="/security" component={Security} />
          <Route path="/blocked-users" component={BlockedUsers} />
          <Route path="/subscription/success" component={SubscriptionSuccessPage} />
          <Route path="/subscription-tiers" component={SubscriptionTiers} />
          <Route path="/subscription" component={SubscriptionPage} />
          <Route path="/reels" component={Reels} />
          <Route path="/reels/:id">
            {(params: { id?: string }) => <ReelShareCard reelId={parseInt(params.id ?? "0")} />}
          </Route>
          <Route path="/saved" component={SavedPage} />
          <Route path="/contact-support" component={ContactSupport} />
          <Route path="/scheduled" component={ScheduledPage} />
          <Route path="/trending" component={TrendingPage} />
          <Route path="/p" component={PagesPage} />
          <Route path="/p/:handle" component={PageView} />
          <Route path="/g" component={GroupsPage} />
          <Route path="/g/:handle" component={GroupView} />
          <Route path="/shop/new" component={ShopCreateListing} />
          <Route path="/shop/my" component={ShopMyListings} />
          <Route path="/shop/:id" component={ShopListingDetail} />
          <Route path="/shop" component={Shop} />
          <Route path="/birthdays" component={BirthdaysPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function Router() {
  // These pages must be accessible without a session
  const path = window.location.pathname;
  const host = window.location.hostname.toLowerCase();
  const isMessengerHost = host === "chat.facingface.com" || (host.startsWith("chat.") && !host.includes("localhost"));
  if (path === "/forgot-password") return <ForgotPassword />;
  if (path === "/reset-password") return <ResetPassword />;
  if (path === "/verify-email") return <VerifyEmail />;
  if (path === "/check-your-email") return <CheckYourEmail />;
  if (path === "/about") return <AboutPage />;
  if (path === "/help") return <HelpPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  if (path === "/advertising") return <AdvertisingPage />;
  if (path === "/cookies") return <CookiesPage />;
  // Organisation Pages are public — visible to anyone without login
  if (path === "/p" || path.startsWith("/p/")) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        <main className="pt-16">
          <Switch>
            <Route path="/p" component={PagesPage} />
            <Route path="/p/:handle" component={PageView} />
            <Route path="/g" component={GroupsPage} />
            <Route path="/g/:handle" component={GroupView} />
          </Switch>
        </main>
      </div>
    );
  }

  if (isMessengerHost) {
    return (
      <AuthGate>
        <Messenger />
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <AppLayout />
    </AuthGate>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeModeProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}

export default App;
