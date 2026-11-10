import { useState, useRef, useEffect } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { chatAttachmentName, safeChatUrl } from "@/lib/chatMedia";

export default function ChatAttachment({
  url,
  type,
  name,
  compact = false,
}: {
  url: string;
  type?: string | null;
  name?: string | null;
  compact?: boolean;
}) {
  const safe = safeChatUrl(url, true);
  const filename = chatAttachmentName(name, url, type);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const image =
    type?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|avif)(?:\?|$)/i.test(url);
  const video =
    type?.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)(?:\?|$)/i.test(url);
  const audio = type?.startsWith("audio/");
  const download = async () => {
    if (!safe || saving) return;
    setSaving(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(safe, { signal: controller.signal });
      if (!response.ok) throw new Error("Attachment unavailable");
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/html") && !type?.includes("html"))
        throw new Error("Not an attachment");
      const blob = await response.blob();
      if (!blob.size) throw new Error("Empty attachment");
      const local = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = local;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(local), 30000);
    } catch {
      toast.error(
        "Direct download is unavailable. Use Open original, then your browser's Save or Share option."
      );
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      setSaving(false);
    }
  };
  if (!safe)
    return <p className="mt-1 text-xs italic">Attachment link unavailable</p>;
  const actions = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={download}
        disabled={saving}
        aria-label={`Download ${filename}`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-current/20 px-2.5 py-1.5 font-semibold hover:bg-black/10 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {saving ? "Saving…" : "Download"}
      </button>
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 py-1.5 underline"
        aria-label={`Open original ${filename}`}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open original
      </a>
    </div>
  );
  return (
    <div className="mt-2 min-w-0 max-w-full space-y-1.5" data-chat-attachment>
      {image ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block max-w-full overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View photo ${filename}`}
        >
          <img
            src={safe}
            alt={name || "Shared photo"}
            className={`${compact ? "max-h-44" : "max-h-72"} max-w-full object-contain`}
            loading="lazy"
          />
        </button>
      ) : video ? (
        <video
          src={safe}
          controls
          playsInline
          preload="none"
          className="max-h-64 w-full max-w-full rounded-xl bg-black"
          aria-label={`Shared video ${filename}`}
        />
      ) : audio ? (
        <audio
          src={safe}
          controls
          preload="none"
          className="max-w-full"
          aria-label={`Voice message ${filename}`}
        />
      ) : (
        <a
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-full items-center gap-2 break-all text-sm underline"
        >
          <FileText className="h-4 w-4 shrink-0" />
          {filename}
        </a>
      )}
      {actions}
      {image && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="z-[120] flex max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-4xl flex-col overflow-hidden rounded-2xl border-border p-4 text-foreground sm:max-w-4xl"
            style={{
              background: "var(--its-surface)",
              color: "var(--its-text-primary)",
            }}
          >
            <DialogTitle className="truncate pr-6 text-base">
              Shared photo
            </DialogTitle>
            <DialogDescription className="sr-only">
              View and download the original chat photo. Browser sharing and
              saving options may vary.
            </DialogDescription>
            <div className="flex min-h-0 items-center justify-center overflow-auto rounded-lg bg-black">
              <img
                src={safe}
                alt={name || "Shared photo"}
                className="max-h-[65dvh] max-w-full object-contain"
              />
            </div>
            {actions}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
