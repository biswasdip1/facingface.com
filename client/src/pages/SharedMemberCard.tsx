import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { MEMBER_CARD_LINK_PATTERN } from "@shared/memberCard";
import DigitalMemberCard from "@/components/DigitalMemberCard";
import { Button } from "@/components/ui/button";
import Landing from "./Landing";

export default function SharedMemberCard() {
  const { linkId = "" } = useParams<{ linkId: string }>();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [showSignIn, setShowSignIn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [validatedViewer, setValidatedViewer] = useState<string | null>(null);
  const viewerKey = `${user?.id ?? "guest"}:${linkId}`;
  const valid = MEMBER_CARD_LINK_PATTERN.test(linkId);
  const shared = trpc.memberCards.shared.useQuery(
    { linkId },
    {
      enabled: valid && !loading,
      retry: false,
      staleTime: 0,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    }
  );
  const connect = trpc.memberCards.connect.useMutation();
  // Refetch after login: a visitor card must not bypass signed-in block checks.
  useEffect(() => {
    let cancelled = false;
    setConnectionStatus("");
    setValidatedViewer(null);
    if (valid && !loading)
      void shared.refetch().then(() => {
        if (!cancelled) setValidatedViewer(viewerKey);
      });
    return () => {
      cancelled = true;
    };
  }, [viewerKey, valid, loading]);
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (showSignIn && !user)
    return (
      <div>
        <div className="fixed left-4 top-4 z-[70]">
          <Button
            variant="outline"
            className="bg-background"
            onClick={() => setShowSignIn(false)}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to member card
          </Button>
        </div>
        <Landing />
      </div>
    );
  if (loading || (valid && (shared.isLoading || validatedViewer !== viewerKey)))
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-background text-foreground">
        <Loader2 className="animate-spin" size={22} />
        Opening member card…
      </div>
    );
  const result = shared.data;
  if (!valid || shared.error || !result)
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-7">
          <ShieldCheck size={30} className="text-[var(--its-red)]" />
          <h1 className="mt-4 text-2xl font-bold">This card is unavailable</h1>
          <p className="my-4 text-sm leading-relaxed text-muted-foreground">
            The link may have been replaced, sharing may be off, or this card is
            not available to you. No private profile information is shown.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--its-red)]"
          >
            Visit FacingFace
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            facing<span className="text-[var(--its-red)]">Face</span>
          </Link>
          <Link
            href={user ? "/member-card" : "/about"}
            className="text-xs sm:text-sm font-semibold text-muted-foreground"
          >
            {user ? "My member card" : "People meet people"}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <p className="mb-4 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Shared by a FacingFace member
        </p>
        <DigitalMemberCard card={result.card} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            className="gap-2 bg-[var(--its-red)] text-white hover:opacity-90"
            onClick={() => {
              if (!user) setShowSignIn(true);
              else navigate(result.profilePath);
            }}
          >
            <ArrowUpRight size={17} />
            View profile
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-card"
            disabled={connect.isPending || result.isOwner || !!connectionStatus}
            onClick={async () => {
              if (!user) {
                setShowSignIn(true);
                return;
              }
              // This button is an explicit friend-request action, not a QR side effect.
              try {
                const response = await connect.mutateAsync({ linkId });
                const label =
                  response.status === "friends"
                    ? "Already friends"
                    : response.status === "pending"
                      ? "Request already pending"
                      : "Friend request sent";
                setConnectionStatus(label);
                toast.success(label);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "The request could not be sent."
                );
              }
            }}
          >
            <UserPlus size={17} />
            {connect.isPending
              ? "Sending…"
              : result.isOwner
                ? "Your own card"
                : connectionStatus || "Connect"}
          </Button>
        </div>
        {!user && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Sign in or create an account to view the full profile or send a
            friend request. Scanning alone never connects you.
          </p>
        )}
        <div className="mt-7 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <ShieldCheck size={19} className="shrink-0 text-[var(--its-red)]" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            This is a social member card, not official identification or proof
            of real-world identity. It displays only information the member
            chose to share. Report suspected impersonation through{" "}
            <Link href="/contact-support" className="underline">
              FacingFace support
            </Link>
            .
          </p>
        </div>
        <footer className="mt-7 flex justify-center gap-5 text-xs text-muted-foreground">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </footer>
      </main>
    </div>
  );
}
