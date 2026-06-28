import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, ShieldOff } from "lucide-react";
import { toast } from "sonner";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function BlockedUsers() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: blockedUsers = [], isLoading } = trpc.blocks.list.useQuery();

  const unblockMutation = trpc.blocks.unblock.useMutation({
    onSuccess: () => {
      utils.blocks.list.invalidate();
      toast.success("User unblocked.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div
      className="max-w-2xl mx-auto px-4 py-6"
      style={{ color: "var(--its-text-primary)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/security")}
          className="p-2 rounded-full hover:bg-muted/50 transition-colors"
          title="Back to Security"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Blocked Users
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            People you have blocked cannot message you or see your profile.
          </p>
        </div>
      </div>

      {/* List */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--its-border)", background: "var(--its-card)" }}
      >
        {isLoading && (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-2.5 bg-muted rounded w-1/4" />
                </div>
                <div className="w-20 h-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && blockedUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Shield className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">No blocked users</p>
            <p className="text-xs opacity-70">
              You have not blocked anyone yet.
            </p>
          </div>
        )}

        {!isLoading && blockedUsers.length > 0 && (
          <ul className="divide-y" style={{ borderColor: "var(--its-border)" }}>
            {blockedUsers.map((u: any) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => navigate(`/profile/${u.blockedId}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={u.blockedUser?.avatar ?? undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {getInitials(u.blockedUser?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {u.blockedUser?.name ?? "Unknown User"}
                    </p>
                    {u.blockedUser?.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {u.blockedUser.email}
                      </p>
                    )}
                  </div>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 gap-1.5"
                  disabled={unblockMutation.isPending}
                  onClick={() => unblockMutation.mutate({ blockedId: u.blockedId })}
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
