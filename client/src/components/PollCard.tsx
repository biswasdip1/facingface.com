import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PollCardProps {
  postId: number;
}

export default function PollCard({ postId }: PollCardProps) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.polls.getForPost.useQuery({ postId });
  const [voting, setVoting] = useState<number | null>(null);

  const voteMutation = trpc.polls.vote.useMutation({
    onMutate: ({ optionId }) => setVoting(optionId),
    onSuccess: () => {
      utils.polls.getForPost.invalidate({ postId });
      setVoting(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setVoting(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 size={12} className="animate-spin" />
        <span>Loading poll…</span>
      </div>
    );
  }

  const poll = data?.poll;
  if (!poll) return null;

  const hasVoted = poll.userVotedOptionId !== null;
  const showResults = hasVoted || poll.isExpired;

  return (
    <div className="border border-border p-4 mt-3">
      {/* Poll header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={13} className="text-[var(--its-red)] flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)]">Poll</span>
        {poll.isExpired && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-auto">Closed</span>
        )}
        {!poll.isExpired && poll.expiresAt && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <Clock size={10} />
            Ends {formatDistanceToNow(new Date(poll.expiresAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Question */}
      <p className="text-sm font-bold text-foreground mb-4 leading-snug">{poll.question}</p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const isMyVote = poll.userVotedOptionId === option.id;
          const isVotingThis = voting === option.id;
          const canVote = !showResults && !poll.isExpired && !voteMutation.isPending;

          return (
            <div key={option.id} className="relative overflow-hidden">
              {/* Result bar background */}
              {showResults && (
                <div
                  className={`absolute inset-0 transition-all duration-500 ${isMyVote ? "bg-primary" : "bg-secondary"}`}
                  style={{ width: `${option.percentage}%`, minWidth: option.voteCount > 0 ? "4px" : "0" }}
                />
              )}

              <button
                type="button"
                disabled={!canVote || isVotingThis}
                onClick={() => canVote && voteMutation.mutate({ pollId: poll.id, optionId: option.id })}
                className={`relative w-full flex items-center justify-between px-3 py-2.5 border text-left transition-colors ${
                  showResults
                    ? isMyVote
                      ? "border-black text-primary-foreground"
                      : "border-border text-foreground"
                    : "border-border text-foreground hover:border-black hover:bg-secondary"
                } ${canVote ? "cursor-pointer" : "cursor-default"}`}
                style={{ borderRadius: 0 }}
              >
                <span className={`text-sm font-medium ${showResults && isMyVote ? "text-primary-foreground" : "text-foreground"}`}>
                  {option.text}
                  {isMyVote && !showResults && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)]">✓ Your vote</span>
                  )}
                </span>
                {showResults && (
                  <span className={`text-xs font-bold ml-2 flex-shrink-0 ${isMyVote ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {option.percentage}%
                    {isMyVote && <span className="ml-1 text-[10px]">✓</span>}
                  </span>
                )}
                {isVotingThis && (
                  <Loader2 size={12} className="animate-spin ml-2 flex-shrink-0" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
        </span>
        {!showResults && !poll.isExpired && (
          <span className="text-[10px] text-muted-foreground">· Click an option to vote</span>
        )}
      </div>
    </div>
  );
}
