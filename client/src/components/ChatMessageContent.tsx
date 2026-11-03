import { useMemo, useState, useEffect, type ReactNode } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { chatVideoForUrl, splitChatText } from "@/lib/chatMedia";

function marked(text: string, query?: string): ReactNode {
  if (!query?.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.split(new RegExp(`(${escaped})`, "gi")).map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="rounded-sm bg-yellow-300 px-0.5 text-black">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function ChatMessageContent({
  text,
  searchQuery,
}: {
  text: string;
  searchQuery?: string;
}) {
  const parts = useMemo(() => splitChatText(text), [text]);
  const video = useMemo(
    () =>
      parts
        .map(part => (part.url ? chatVideoForUrl(part.url) : null))
        .find(Boolean),
    [parts]
  );
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setPlaying(false);
  }, [text]);
  return (
    <div className="min-w-0 max-w-full" data-chat-message-content>
      <div
        className="whitespace-pre-wrap break-words leading-relaxed"
        style={{ overflowWrap: "anywhere" }}
      >
        {parts.map((part, index) =>
          part.url ? (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              {marked(part.text, searchQuery)}
            </a>
          ) : (
            <span key={index}>{marked(part.text, searchQuery)}</span>
          )
        )}
      </div>
      {video && (
        <div className="mt-2 min-w-0 overflow-hidden rounded-xl border border-current/20">
          {!playing ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="flex w-full items-center gap-2 bg-black/10 px-3 py-3 text-left text-xs font-semibold hover:bg-black/20"
              aria-label="Play shared video"
            >
              <Play className="h-5 w-5 shrink-0" />
              <span>
                Play{" "}
                {video.kind === "youtube"
                  ? video.vertical
                    ? "YouTube Short"
                    : "YouTube video"
                  : video.kind === "vimeo"
                    ? "Vimeo video"
                    : "shared video"}
              </span>
            </button>
          ) : (
            <>
              <div
                className="relative mx-auto overflow-hidden bg-black"
                style={{
                  aspectRatio: video.vertical ? "9/16" : "16/9",
                  width: video.vertical ? "min(100%, 230px)" : "100%",
                }}
              >
                {video.kind === "file" ? (
                  <video
                    src={video.url}
                    controls
                    playsInline
                    preload="none"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <iframe
                    src={video.embedUrl}
                    title="Shared video player"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setPlaying(false)}
                className="flex w-full items-center justify-center gap-1 py-1.5 text-xs"
                aria-label="Close shared video"
              >
                <X className="h-3 w-3" />
                Close player
              </button>
            </>
          )}
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 border-t border-current/20 px-2 py-1.5 text-[11px] underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open original video
          </a>
        </div>
      )}
    </div>
  );
}
