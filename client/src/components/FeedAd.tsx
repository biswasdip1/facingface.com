import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";

type FeedAdProps = {
  slot?: number;
};

export default function FeedAd({ slot }: FeedAdProps) {
  const { data: ad } = trpc.feedAds.getActive.useQuery(
    slot ? { slot } : undefined,
    {
      staleTime: 5 * 60 * 1000, // cache for 5 min; each slot receives its own active ad rotation entry
    }
  );

  const trackEvent = trpc.feedAds.trackEvent.useMutation();
  const impressionTracked = useRef(false);

  // Track impression once when ad becomes visible
  useEffect(() => {
    if (ad && !impressionTracked.current) {
      impressionTracked.current = true;
      trackEvent.mutate({ adId: ad.id, eventType: "impression" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad?.id]);

  if (!ad) return null;

  function handleClick() {
    if (ad) {
      trackEvent.mutate({ adId: ad.id, eventType: "click" });
    }
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/40 mb-4">
      {/* Sponsored label */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Sponsored{slot ? ` · Ad Slot ${slot}` : ""}
        </span>
      </div>

      {/* Ad image */}
      {ad.imageUrl && (
        <div
          className="w-full overflow-hidden"
          style={{
            maxHeight: ad.imageHeight ? `${ad.imageHeight}px` : "400px",
          }}
        >
          <img
            src={ad.imageUrl}
            alt={ad.title ?? "Advertisement"}
            className="w-full object-cover"
            style={{
              maxWidth: ad.imageWidth ? `${ad.imageWidth}px` : "100%",
              margin: "0 auto",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Ad content */}
      <div className="px-4 py-3">
        {ad.title && (
          <p className="font-bold text-sm text-foreground leading-snug mb-1">{ad.title}</p>
        )}
        {ad.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{ad.description}</p>
        )}
        {ad.linkUrl && (
          <a
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[var(--its-red)] text-white hover:opacity-90 transition-opacity"
          >
            {ad.linkText ?? "Learn More"}
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
