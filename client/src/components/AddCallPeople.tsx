import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

export type CallInviteResult = {
  roomId: number;
  groupId: number;
  invitedUserIds: number[];
};

export interface AddCallPeopleProps {
  peerId: number;
  peerName: string;
  isVideo: boolean;
  onClose: () => void;
  onCreated: (result: CallInviteResult) => void;
}

type SelectedFriend = { id: number; name: string };
type Selection = {
  userId: number | undefined;
  peerId: number;
  friends: SelectedFriend[];
};

const MAX_INVITEES = 2;
const INVITATION_NOTICE =
  "Choose up to 2 friends. Everyone must choose Join before their camera or microphone starts. A new private call group will be created; existing conversations are not shared.";

/** Embedded inside the active call overlay; deliberately has no portal or media side effects. */
export default function AddCallPeople({
  peerId,
  peerName,
  isVideo,
  onClose,
  onCreated,
}: AddCallPeopleProps) {
  const { user, loading: authLoading, error: authError } = useAuth();
  const userId = user?.id;
  const id = useId();
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection>({
    userId,
    peerId,
    friends: [],
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  // This synchronous lock also stops a second click before React paints pending state.
  const submissionLocked = useRef(false);
  const [created, setCreated] = useState(false);

  // Both endpoints infer the current user from the session, not their input.
  // Scope their cache hashes to that user so account changes cannot reuse another
  // person's cached friendship IDs or profiles.
  const accountQueryHash = useCallback(
    (queryKey: readonly unknown[]) =>
      JSON.stringify([userId ?? null, queryKey]),
    [userId]
  );
  const queryOptions = {
    enabled: Boolean(userId),
    retry: false as const,
    queryKeyHashFn: accountQueryHash,
  };
  const friendsQuery = trpc.friends.list.useQuery(undefined, queryOptions);
  const profilesQuery = trpc.friends.listEnriched.useQuery(
    undefined,
    queryOptions
  );

  const startInvitation = trpc.callInvites.start.useMutation({
    retry: false,
    onSuccess: (result: CallInviteResult) => {
      setCreated(true);
      setInviteError(null);
      // The parent presents the requester with Join. Do not close or navigate,
      // end the existing call, or access any camera/microphone from this panel.
      onCreated(result);
    },
    onError: (error: { message: string; data?: { code?: string } | null }) => {
      submissionLocked.current = false;
      const message =
        error.data?.code === "FORBIDDEN"
          ? "You cannot invite one or more of these friends. Your current call is unchanged."
          : error.data?.code === "UNAUTHORIZED"
            ? "Please sign in again to send invitations. Your current call is unchanged."
            : error.message ||
              "Could not send invitations. Your current call is unchanged. Please try again.";
      setInviteError(message);
      toast.error(message);
    },
  });
  const busy = startInvitation.isPending || created;
  const selectedFriends =
    selection.userId === userId && selection.peerId === peerId
      ? selection.friends
      : [];

  const friendIds = new Set<number>();
  if (userId) {
    for (const row of friendsQuery.data ?? []) {
      // Ignore rows that do not actually belong to the signed-in account.
      if (row.userId1 === userId) friendIds.add(row.userId2);
      else if (row.userId2 === userId) friendIds.add(row.userId1);
    }
  }
  friendIds.delete(userId ?? -1);
  friendIds.delete(peerId);

  const seenIds = new Set<number>();
  const friends = (profilesQuery.data ?? []).flatMap(row => {
    const friend = row.friend;
    if (!friend || !friendIds.has(friend.id) || seenIds.has(friend.id))
      return [];
    seenIds.add(friend.id);
    return [
      {
        id: friend.id,
        name: friend.name?.trim() || `Friend ${friend.id}`,
        avatar: friend.avatar,
      },
    ];
  });
  const searchText = search.trim().toLocaleLowerCase();
  const visibleFriends = friends.filter(friend =>
    friend.name.toLocaleLowerCase().includes(searchText)
  );
  const queryError = friendsQuery.error ?? profilesQuery.error;
  const loading =
    authLoading ||
    (Boolean(userId) && (friendsQuery.isLoading || profilesQuery.isLoading));
  const listError = authError
    ? "Could not verify your sign-in. Your current call is unchanged."
    : !authLoading && !user
      ? "Please sign in to choose friends. Your current call is unchanged."
      : queryError
        ? queryError.data?.code === "FORBIDDEN"
          ? "You do not have permission to load these friends. Your current call is unchanged."
          : "Could not load your friends. Please try again. Your current call is unchanged."
        : null;

  useEffect(() => {
    if (queryError || authError) {
      toast.error(listError || "Could not load your friends.");
    }
  }, [queryError, authError, listError]);

  function toggleFriend(friend: SelectedFriend) {
    if (submissionLocked.current || busy || !userId) return;
    setSelection(previous => {
      const current =
        previous.userId === userId && previous.peerId === peerId
          ? previous.friends
          : [];
      const next = current.some(person => person.id === friend.id)
        ? current.filter(person => person.id !== friend.id)
        : current.length < MAX_INVITEES && friendIds.has(friend.id)
          ? [...current, { id: friend.id, name: friend.name }]
          : current;
      return { userId, peerId, friends: next };
    });
  }

  function sendInvitations() {
    if (
      submissionLocked.current ||
      busy ||
      loading ||
      listError ||
      !userId ||
      selectedFriends.length < 1 ||
      selectedFriends.length > MAX_INVITEES
    ) {
      return;
    }
    if (selectedFriends.some(friend => !seenIds.has(friend.id))) {
      const message =
        "One of your selected friends is no longer available. Remove them and try again. Your current call is unchanged.";
      setInviteError(message);
      toast.error(message);
      return;
    }
    submissionLocked.current = true;
    setInviteError(null);
    startInvitation.mutate({
      peerId,
      inviteeIds: selectedFriends.map(friend => friend.id),
      type: isVideo ? "video" : "audio",
    });
  }

  function cancel() {
    if (!submissionLocked.current && !busy) onClose();
  }

  return (
    <section
      data-testid="call-add-people-panel"
      role="region"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-notice`}
      aria-busy={startInvitation.isPending}
      className="relative mx-auto flex h-full min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 text-white shadow-2xl"
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
      }}
    >
      <header className="shrink-0 border-b border-gray-700 p-4">
        <h2
          id={`${id}-title`}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <UserPlus className="h-5 w-5" aria-hidden="true" />
          Add people
        </h2>
        <p className="mt-1 break-words text-sm text-gray-300">
          Current call: you and {peerName}
        </p>
      </header>

      <div className="min-h-0 max-h-[60dvh] space-y-4 overflow-y-auto overscroll-contain p-4">
        <p
          id={`${id}-notice`}
          className="text-sm leading-relaxed text-gray-200"
        >
          {INVITATION_NOTICE}
        </p>
        <div>
          <label
            htmlFor={`${id}-search`}
            className="mb-2 block text-sm font-medium text-gray-200"
          >
            Search friends
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <Input
              id={`${id}-search`}
              data-testid="call-add-people-search"
              type="search"
              autoFocus
              value={search}
              onChange={event => setSearch(event.target.value)}
              disabled={busy}
              placeholder="Search by name"
              aria-describedby={`${id}-selection`}
              className="h-10 border-gray-600 bg-gray-800 pl-9 text-white placeholder:text-gray-400 focus-visible:border-blue-400 focus-visible:ring-blue-400/60"
            />
          </div>
        </div>

        <div
          id={`${id}-selection`}
          aria-live="polite"
          className="text-sm text-gray-300"
        >
          {selectedFriends.length} of 2 friends selected ·{" "}
          {2 + selectedFriends.length} of 4 people
        </div>
        {selectedFriends.length > 0 && (
          <ul aria-label="Selected friends" className="flex flex-wrap gap-2">
            {selectedFriends.map(friend => (
              <li key={friend.id} className="max-w-full">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleFriend(friend)}
                  aria-label={`Remove ${friend.name} from invitations`}
                  className="flex max-w-full items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"
                >
                  <span className="truncate">{friend.name}</span>
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {inviteError && (
          <p
            role="alert"
            className="rounded-lg border border-red-400/50 bg-red-950 p-3 text-sm text-red-100"
          >
            {inviteError}
          </p>
        )}
        {loading ? (
          <p
            role="status"
            className="flex items-center gap-2 py-4 text-sm text-gray-200"
          >
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {authLoading ? "Checking sign-in…" : "Loading friends…"}
          </p>
        ) : listError ? (
          <div className="space-y-3">
            <p
              role="alert"
              className="rounded-lg border border-red-400/50 bg-red-950 p-3 text-sm text-red-100"
            >
              {listError}
            </p>
            {user && queryError && (
              <Button
                type="button"
                variant="outline"
                disabled={
                  busy || friendsQuery.isFetching || profilesQuery.isFetching
                }
                onClick={() => {
                  void friendsQuery.refetch();
                  void profilesQuery.refetch();
                }}
                className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700 hover:text-white focus-visible:ring-blue-400/60"
              >
                {friendsQuery.isFetching || profilesQuery.isFetching
                  ? "Retrying…"
                  : "Try again"}
              </Button>
            )}
          </div>
        ) : friends.length === 0 ? (
          <p role="status" className="py-4 text-sm text-gray-300">
            No other friends are available to invite. You and {peerName} are
            already in this call.
          </p>
        ) : visibleFriends.length === 0 ? (
          <p role="status" className="py-4 text-sm text-gray-300">
            No friends match your search.
          </p>
        ) : (
          <ul aria-label="Friends to invite" className="space-y-2">
            {visibleFriends.map(friend => {
              const checked = selectedFriends.some(
                person => person.id === friend.id
              );
              const disabled =
                busy || (!checked && selectedFriends.length >= MAX_INVITEES);
              const initials = friend.name
                .split(/\s+/)
                .map(part => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <li key={friend.id}>
                  <label
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-white focus-within:ring-2 focus-within:ring-blue-400",
                      checked
                        ? "border-blue-400 bg-blue-950"
                        : "border-gray-700 bg-gray-800",
                      disabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:border-gray-500"
                    )}
                  >
                    <Avatar className="h-9 w-9" aria-hidden="true">
                      <AvatarImage src={friend.avatar ?? undefined} alt="" />
                      <AvatarFallback className="bg-gray-700 text-sm text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 break-words text-sm font-medium">
                      {friend.name}
                    </span>
                    <input
                      type="checkbox"
                      data-testid={`call-invite-person-${friend.id}`}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleFriend(friend)}
                      aria-label={`Invite ${friend.name}`}
                      aria-describedby={`${id}-selection`}
                      className="h-5 w-5 shrink-0 accent-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="shrink-0 space-y-3 border-t border-gray-700 bg-gray-900 p-4">
        {busy && (
          <p role="status" className="text-sm text-gray-200">
            {created
              ? "Invitations sent. Choose Join in the call panel to continue."
              : "Sending invitations… Please wait."}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            data-testid="call-add-people-cancel"
            variant="outline"
            disabled={busy}
            onClick={cancel}
            className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700 hover:text-white focus-visible:ring-blue-400/60"
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="call-add-people-invite"
            disabled={
              busy ||
              loading ||
              Boolean(listError) ||
              selectedFriends.length === 0
            }
            onClick={sendInvitations}
            className="bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-400/60"
          >
            {startInvitation.isPending && (
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            Send invitations
          </Button>
        </div>
      </footer>
    </section>
  );
}
