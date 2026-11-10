import { useState } from "react";
import { Building2, Check, ChevronRight, UserPlus, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SuggestedPages() {
  const utils = trpc.useUtils();
  const { data: pages, isLoading } = trpc.pages.suggested.useQuery({ limit: 5 }, {
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const [followedIds, setFollowedIds] = useState<number[]>([]);
  const [brokenImageIds, setBrokenImageIds] = useState<number[]>([]);

  const followMutation = trpc.pages.follow.useMutation({
    onSuccess: (result, variables) => {
      const page = (pages ?? []).find((candidate) => candidate.handle === variables.handle);
      if (page) setFollowedIds((current) => current.includes(page.id) ? current : [...current, page.id]);
      utils.pages.suggested.invalidate();
      toast.success(result.status === "pending" ? "Follow request sent." : "Following Page.");
    },
    onError: (error) => toast.error(error.message || "Could not follow this Page."),
  });

  const visiblePages = (pages ?? []).filter((page) => !followedIds.includes(page.id));
  if (isLoading || visiblePages.length === 0) return null;

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--its-red)] text-white">
            <Building2 size={14} />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Suggested Pages</span>
        </div>
        <Link href="/p" className="flex items-center gap-0.5 text-[10px] font-bold text-[var(--its-red)] hover:underline">
          See all <ChevronRight size={12} />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {visiblePages.map((page) => {
          const name = page.name?.trim() || "Page";
          const coverAvailable = Boolean(page.coverPhoto) && !brokenImageIds.includes(page.id);
          return (
            <article key={page.id} className="w-40 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-background">
              <Link href={`/p/${page.handle}`} className="block">
                <div className="relative h-20 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700">
                  {coverAvailable ? (
                    <img
                      src={page.coverPhoto!}
                      alt={`${name} cover`}
                      onError={() => setBrokenImageIds((current) => current.includes(page.id) ? current : [...current, page.id])}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white/90">
                      <Building2 size={28} />
                    </div>
                  )}
                </div>
              </Link>
              <div className="px-2.5 pb-2.5 pt-2">
                <Link href={`/p/${page.handle}`}>
                  <p className="truncate text-xs font-bold text-foreground hover:underline">{name}</p>
                </Link>
                <p className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                  <UsersRound size={10} /> {page.followerCount.toLocaleString()} follower{page.followerCount === 1 ? "" : "s"}
                </p>
                <button
                  type="button"
                  onClick={() => followMutation.mutate({ handle: page.handle })}
                  disabled={followMutation.isPending}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--its-red)] py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {followMutation.isPending ? <Check size={11} /> : <UserPlus size={11} />}
                  Follow
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
