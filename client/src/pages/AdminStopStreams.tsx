import React from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminStopStreams() {
  const utils = trpc.useUtils();

  // Get all active streams
  const { data: streamsData, isLoading: isLoadingStreams, refetch } = trpc.stopStreams.getActive.useQuery();

  // Stop all streams mutation
  const stopAllMutation = trpc.stopStreams.stopAllActive.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      // Invalidate all related queries to refresh the UI everywhere
      (utils as any).live?.listActive?.invalidate?.();
      (utils as any).posts?.feed?.invalidate?.();
      setTimeout(() => refetch(), 500);
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  const activeCount = streamsData?.count ?? 0;
  const streams = streamsData?.streams ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="w-8 h-8 text-red-500" />
          Admin: Stop All Live Streams
        </h1>
        <p className="text-muted-foreground">Force-stop all active streams in the database</p>
      </div>

      {/* Active Streams Count */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-lg font-semibold">
          Active Streams: <span className="text-blue-600">{activeCount}</span>
        </p>
      </div>

      {/* Streams List */}
      {isLoadingStreams ? (
        <div className="space-y-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : streams.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden mb-6">
          <ul className="divide-y">
            {streams.map((stream: any) => (
              <li key={stream.id} className="px-4 py-3">
                <p className="font-semibold text-sm">{stream.title || "Untitled Stream"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Host ID: {stream.hostId} • Viewers: {stream.viewerCount || 0}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <p className="text-green-700 font-semibold">No active streams</p>
        </div>
      )}

      {/* Stop All Button */}
      <Button
        onClick={() => stopAllMutation.mutate()}
        disabled={stopAllMutation.isPending || activeCount === 0}
        className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold"
      >
        {stopAllMutation.isPending ? "Stopping..." : "🛑 STOP ALL STREAMS"}
      </Button>
    </div>
  );
}
