import { useEffect, useMemo, useState } from "react";
import { BellRing, ExternalLink, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type WebsiteNoticeData = {
  id?: number;
  title: string;
  message: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  isVisible?: boolean;
  version: number;
};

type NoticeScope = "visitor" | "member";

function getDismissalKey(version: number, scope: NoticeScope, userId?: number) {
  return `facingface.website-notice.${scope === "member" ? `member-${userId ?? "unknown"}` : "visitor"}.v${version}`;
}

function getEmbeddableVideoUrl(videoUrl?: string | null): string | null {
  if (!videoUrl) return null;
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") ?? url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "vimeo.com" || host === "www.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function WebsiteNoticeContent({ notice, onClose }: { notice: WebsiteNoticeData; onClose?: () => void }) {
  const embedUrl = useMemo(() => getEmbeddableVideoUrl(notice.videoUrl), [notice.videoUrl]);

  return (
    <div className="overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border bg-gradient-to-r from-[#0d5bb5] to-[#2387df] px-5 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"><BellRing size={20} /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">FacingFace Notice</p>
            <h2 className="truncate text-lg font-bold leading-tight">{notice.title}</h2>
          </div>
        </div>
        {onClose && <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/15 hover:text-white" aria-label="Close website notice"><X size={20} /></button>}
      </div>

      <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
        {notice.imageUrl && <img src={notice.imageUrl} alt="Notice" className="max-h-72 w-full rounded-xl border border-border object-cover" />}
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{notice.message}</p>
        {embedUrl && <div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe src={embedUrl} title="Website notice video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>}
        {notice.videoUrl && !embedUrl && <a href={notice.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1877f2] hover:underline"><ExternalLink size={15} />Watch the notice video</a>}
      </div>

      {onClose && <div className="border-t border-border bg-muted/35 px-5 py-3 text-right"><button type="button" onClick={onClose} className="rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1264cc]">Close</button></div>}
    </div>
  );
}

export default function WebsiteNoticePopup({ scope, userId }: { scope: NoticeScope; userId?: number }) {
  const { data: notice } = trpc.websiteNotice.getActive.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: true });
  const [open, setOpen] = useState(false);
  const dismissalKey = notice ? getDismissalKey(notice.version, scope, userId) : null;

  useEffect(() => {
    if (!notice || !dismissalKey) {
      setOpen(false);
      return;
    }
    try {
      setOpen(window.localStorage.getItem(dismissalKey) !== "closed");
    } catch {
      setOpen(true);
    }
  }, [notice?.version, dismissalKey]);

  const closeNotice = () => {
    if (dismissalKey) {
      try { window.localStorage.setItem(dismissalKey, "closed"); } catch { /* dismissal still closes for this view */ }
    }
    setOpen(false);
  };

  if (!notice) return null;
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) closeNotice(); }}>
      <DialogContent className="max-w-xl overflow-hidden border-0 bg-transparent p-0 shadow-none sm:rounded-2xl">
        <DialogTitle className="sr-only">{notice.title}</DialogTitle>
        <WebsiteNoticeContent notice={notice} onClose={closeNotice} />
      </DialogContent>
    </Dialog>
  );
}
