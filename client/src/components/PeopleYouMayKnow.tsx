import { useState } from "react";
import { UserPlus, X, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PeopleYouMayKnow() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [sentRequests, setSentRequests] = useState<number[]>([]);
  const [brokenAvatarIds, setBrokenAvatarIds] = useState<number[]>([]);

  const { data: people, isLoading } = trpc.suggestions.people.useQuery(undefined, {
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const sendRequest = trpc.friends.sendRequest.useMutation({
    onSuccess: (_, vars) => setSentRequests((prev) => [...prev, vars.receiverId]),
  });

  const visible = (people ?? []).filter((p) => !dismissed.includes(p.id));

  if (!user || isLoading || visible.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/40 mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          People You May Know
        </span>
        <Link href="/friends" className="flex items-center gap-0.5 text-[10px] font-bold text-[var(--its-red)] hover:underline">
          See all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Horizontal scroll cards */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {visible.map((person) => (
          <div
            key={person.id}
            className="flex-shrink-0 w-36 bg-background rounded-xl border border-border/50 overflow-hidden relative"
          >
            {/* Dismiss button */}
            <button
              onClick={() => setDismissed((prev) => [...prev, person.id])}
              className="absolute top-1.5 right-1.5 z-10 p-0.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              aria-label="Dismiss"
            >
              <X size={11} />
            </button>

            {/* Avatar */}
            <Link href={`/profile/${person.id}`}>
              <div className="w-full h-28 bg-muted overflow-hidden">
                {person.avatar && !brokenAvatarIds.includes(person.id) ? (
                  <img
                    src={person.avatar}
                    alt={person.name ?? "User"}
                    onError={() => setBrokenAvatarIds((current) => current.includes(person.id) ? current : [...current, person.id])}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--its-red)] to-[var(--its-red-light,#e57373)] text-white text-2xl font-bold">
                    {(person.name ?? "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
            </Link>

            {/* Info */}
            <div className="px-2 py-2 text-center">
              <Link href={`/profile/${person.id}`}>
                <p className="text-xs font-bold text-foreground truncate leading-tight hover:underline">
                  {person.name ?? "User"}
                  {person.isVerified && (
                    <span className="ml-0.5 text-[var(--its-red)]">✓</span>
                  )}
                </p>
              </Link>
              {/* Mutual friends badge */}
              {'mutualFriends' in person && (person as { mutualFriends: number }).mutualFriends > 0 && (
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                  {(person as { mutualFriends: number }).mutualFriends} mutual friend{(person as { mutualFriends: number }).mutualFriends !== 1 ? 's' : ''}
                </p>
              )}

              {/* Add Friend / Requested button */}
              {sentRequests.includes(person.id) ? (
                <button
                  disabled
                  className="mt-2 w-full py-1 rounded-lg text-[10px] font-bold bg-muted text-muted-foreground cursor-default"
                >
                  Requested
                </button>
              ) : (
                <button
                  onClick={() => sendRequest.mutate({ receiverId: person.id })}
                  disabled={sendRequest.isPending}
                  className="mt-2 w-full py-1 rounded-lg text-[10px] font-bold bg-[var(--its-red)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                >
                  <UserPlus size={11} />
                  Add Friend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
