import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Mail, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BroadcastNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to safely format date
function formatDate(dateValue: any): string {
  if (!dateValue) return "Unknown date";
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString();
  } catch {
    return "Invalid date";
  }
}

// Helper to safely format time
function formatTime(dateValue: any): string {
  if (!dateValue) return "Unknown time";
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "Invalid time";
    return date.toLocaleTimeString();
  } catch {
    return "Invalid time";
  }
}

export default function BroadcastNotifications({
  isOpen,
  onClose,
}: BroadcastNotificationsProps) {
  const [selectedBroadcast, setSelectedBroadcast] = useState<any | null>(null);
  const utils = trpc.useUtils();

  const { data: broadcasts = [], isLoading, refetch } = trpc.broadcasts.myBroadcasts.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isOpen }
  );

  const deleteMutation = trpc.broadcasts.delete.useMutation({
    onSuccess: () => {
      toast.success("Broadcast deleted");
      setSelectedBroadcast(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete broadcast");
    },
  });

  const handleDelete = (broadcastId: number) => {
    if (confirm("Are you sure you want to delete this broadcast?")) {
      deleteMutation.mutate({ broadcastId });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail size={24} className="text-[var(--its-red)]" />
            <h2 className="text-xl font-bold">Broadcast Messages</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Loading broadcasts...
            </div>
          ) : selectedBroadcast ? (
            // Broadcast Detail View
            <div className="p-6 space-y-4">
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="text-sm text-[var(--its-red)] hover:underline mb-4"
              >
                ← Back to list
              </button>

              <div>
                <h3 className="text-2xl font-bold mb-2">
                  Broadcast Message
                </h3>
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground mb-4">
                  <span>
                    Sent on {formatDate(selectedBroadcast.createdAt)} at{" "}
                    {formatTime(selectedBroadcast.createdAt)}
                  </span>
                  <button
                    onClick={() => handleDelete(selectedBroadcast.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <p className="whitespace-pre-wrap text-foreground text-lg leading-relaxed">
                  {selectedBroadcast.message || "No message content"}
                </p>
              </div>
            </div>
          ) : broadcasts.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Mail size={48} className="mb-3 opacity-50" />
              <p>No broadcast messages yet</p>
            </div>
          ) : (
            // Broadcasts List
            <div className="divide-y divide-border">
              {broadcasts.map((broadcast: any) => (
                <button
                  key={broadcast.id}
                  onClick={() => setSelectedBroadcast(broadcast)}
                  className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground mb-2">
                        Broadcast Message
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {broadcast.message || "No message"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(broadcast.createdAt)}{" "}
                        {formatTime(broadcast.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
