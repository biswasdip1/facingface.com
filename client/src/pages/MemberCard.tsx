import { Loader2, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import MemberCardWorkspace from "@/components/MemberCardWorkspace";
import { Button } from "@/components/ui/button";

export default function MemberCard() {
  const mine = trpc.memberCards.mine.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const save = trpc.memberCards.save.useMutation();
  const replace = trpc.memberCards.replaceLink.useMutation();
  if (mine.isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 size={22} className="animate-spin" />
        Preparing your private card preview…
      </div>
    );
  if (!mine.data || mine.error)
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-2xl font-bold">Member card unavailable</h1>
        <p className="my-4 text-muted-foreground">
          {mine.error?.message || "Please try again later."}
        </p>
        <Button
          variant="outline"
          onClick={() => mine.refetch()}
          className="gap-2"
        >
          <RefreshCw size={16} />
          Try again
        </Button>
        <Link href="/profile" className="ml-4 text-sm underline">
          Back to profile
        </Link>
      </div>
    );
  return (
    <MemberCardWorkspace
      data={mine.data}
      busy={save.isPending || replace.isPending}
      onSave={async settings => {
        try {
          await save.mutateAsync(settings);
          await mine.refetch();
          toast.success(
            settings.enabled
              ? "Card saved. Public sharing is enabled."
              : "Card saved privately. Sharing is off."
          );
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Card settings could not be saved."
          );
        }
      }}
      onReplace={async () => {
        try {
          await replace.mutateAsync();
          await mine.refetch();
          toast.success("Sharing link replaced. Old QR codes no longer work.");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "The link could not be replaced."
          );
        }
      }}
    />
  );
}
