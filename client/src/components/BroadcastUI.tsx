import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Send, Trash2, Users } from "lucide-react";

/**
 * Broadcast UI with Segmentation
 * - Message field
 * - Segment selector (All Users, Verified Members, New Users - 7 days)
 * - Sends immediately to selected segment
 */

export function BroadcastComposer() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [segmentType, setSegmentType] = useState("all_users");
  const [isSending, setIsSending] = useState(false);

  const createBroadcast = trpc.broadcasts.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setMessage(""); // Reset form
      setSegmentType("all_users");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsSending(true);
    try {
      await createBroadcast.mutateAsync({
        message: message.trim(),
        segmentType: segmentType as "all_users" | "verified_users" | "new_users_7days",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }

  const segmentLabels: Record<string, string> = {
    all_users: "All Users",
    verified_users: "Verified Members",
    new_users_7days: "New Users (Last 7 Days)",
  };

  return (
    <div className="border border-border rounded-lg p-6 bg-card space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Mail size={20} className="text-blue-600" />
        <h2 className="text-xl font-bold">Send Email/Notice to Users</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Send a message immediately to selected user segment. No scheduling.
      </p>

      {/* Message */}
      <div>
        <label className="block text-sm font-bold mb-2">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message here..."
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground h-32 resize-none"
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground mt-1">{message.length}/5000 characters</p>
      </div>

      {/* Segment Selector */}
      <div>
        <label className="block text-sm font-bold mb-2">Send To</label>
        <select
          value={segmentType}
          onChange={(e) => setSegmentType(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
        >
          <option value="all_users">All Users</option>
          <option value="verified_users">Verified Members</option>
          <option value="new_users_7days">New Users (Last 7 Days)</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {segmentLabels[segmentType]}
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
        <p className="text-sm font-semibold text-green-900 dark:text-green-200">
          ✓ Sends immediately to all matching users
        </p>
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={isSending || !message.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <Send size={18} />
        {isSending ? "Sending..." : "Send Now"}
      </button>
    </div>
  );
}

export function BroadcastsList() {
  const { user } = useAuth();
  const broadcasts = trpc.broadcasts.list.useQuery({ limit: 50, offset: 0 });
  const deleteBroadcast = trpc.broadcasts.delete.useMutation({
    onSuccess: () => {
      toast.success("Broadcast deleted");
      broadcasts.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }

  if (!broadcasts.data || broadcasts.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No broadcasts sent yet.
      </div>
    );
  }

  const segmentLabels: Record<string, string> = {
    all_users: "All Users",
    verified_users: "Verified Members",
    new_users_7days: "New Users (Last 7 Days)",
  };

  return (
    <div className="space-y-3">
      {broadcasts.data.map((broadcast: any) => (
        <div key={broadcast.id} className="border border-border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-foreground mb-2">{broadcast.message}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Users size={14} />
                <span>{segmentLabels[broadcast.segmentType] || broadcast.segmentType}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sent: {new Date(broadcast.createdAt).toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => deleteBroadcast.mutate({ broadcastId: broadcast.id })}
              disabled={deleteBroadcast.isPending}
              className="px-3 py-1 rounded text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 whitespace-nowrap transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} className="inline mr-1" />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
