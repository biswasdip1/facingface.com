import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Users, X, Loader2 } from "lucide-react";

export type CallInvitation = {
  roomId: number;
  groupId: number;
  fromId: number;
  fromName: string;
  type: "audio" | "video";
  expiresAt: number;
};

export function isCallInvitation(value: unknown): value is CallInvitation {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<CallInvitation>;
  return (
    Number.isInteger(p.roomId) &&
    (p.roomId ?? 0) > 0 &&
    Number.isInteger(p.groupId) &&
    (p.groupId ?? 0) > 0 &&
    Number.isInteger(p.fromId) &&
    (p.fromId ?? 0) > 0 &&
    typeof p.fromName === "string" &&
    p.fromName.length <= 200 &&
    (p.type === "audio" || p.type === "video") &&
    typeof p.expiresAt === "number" &&
    Number.isFinite(p.expiresAt) &&
    p.expiresAt > Date.now()
  );
}

/** Open the already-authorized room only after stopping any local direct call. */
export function openInvitedCall(
  roomId: number,
  navigate: (path: string) => void
) {
  window.dispatchEvent(
    new CustomEvent("facingface:leave-direct-for-group", { detail: { roomId } })
  );
  navigate(`/calls/group/${roomId}`);
}

export default function GroupCallInvitation() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [invitation, setInvitation] = useState<CallInvitation | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setInvitation(null);
    setError("");
    const receive = (event: Event) => {
      const payload = (event as CustomEvent<unknown>).detail;
      if (!user || !isCallInvitation(payload)) return;
      setInvitation(payload);
      setError("");
    };
    window.addEventListener("facingface:group-call-invitation", receive);
    return () =>
      window.removeEventListener("facingface:group-call-invitation", receive);
  }, [user?.id]);

  useEffect(() => {
    if (!invitation) return;
    const timer = window.setTimeout(
      () => setInvitation(null),
      Math.min(2147483647, Math.max(0, invitation.expiresAt - Date.now()))
    );
    return () => window.clearTimeout(timer);
  }, [invitation]);

  async function accept() {
    if (!invitation || pending || !user) return;
    setPending(true);
    setError("");
    try {
      // Do not trust an event as access authorization; the server checks current
      // group membership, block rules and room status before any call ends.
      const data = await utils.calls.getRoom.fetch({
        roomId: invitation.roomId,
      });
      if (data.room.status === "ended")
        throw new Error(
          "This invitation's call has ended. Ask your friend to invite you again."
        );
      if (data.room.groupId !== invitation.groupId)
        throw new Error("This call invitation is not valid.");
      if (
        data.participants.length >= 4 &&
        !data.participants.some(p => p.userId === user.id)
      ) {
        throw new Error(
          "This call is full. Four people can join, including you."
        );
      }
      openInvitedCall(invitation.roomId, navigate);
      setInvitation(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The group call could not be opened. Your current call has not been changed."
      );
    } finally {
      setPending(false);
    }
  }

  if (!invitation || !user) return null;
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="call-invitation-title"
      data-testid="group-call-invitation"
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[200] mx-auto max-w-md rounded-2xl border border-white/20 bg-zinc-900 p-4 text-white shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-green-500/15 p-2.5 text-green-400">
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="call-invitation-title" className="font-semibold">
            {invitation.fromId === user.id
              ? "Group call ready"
              : "Group call invitation"}
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            {invitation.fromId === user.id
              ? "Your invitations were sent."
              : `${invitation.fromName || "A friend"} invited you to a group ${invitation.type === "audio" ? "voice" : "video"} call.`}
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Up to 4 people. Opening the group view ends your current one-to-one
            call. Camera and microphone start only when you choose Join call
            there.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss group call invitation"
          disabled={pending}
          onClick={() => setInvitation(null)}
          className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setInvitation(null)}
          className="flex-1 rounded-xl border border-white/15 px-3 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void accept();
          }}
          data-testid="group-call-invitation-open"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}Open group
          call
        </button>
      </div>
    </section>
  );
}
