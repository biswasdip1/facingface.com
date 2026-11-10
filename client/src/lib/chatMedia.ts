export type ChatTextPart = { text: string; url?: string };
export type ChatVideo = {
  kind: "youtube" | "vimeo" | "file";
  url: string;
  embedUrl?: string;
  vertical?: boolean;
};

/** No JavaScript/data URLs, embedded credentials or protocol-relative URLs. */
export function safeChatUrl(
  value: string | null | undefined,
  allowRelative = false
): string | null {
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const input = value.trim();
  if (
    allowRelative &&
    input.startsWith("/") &&
    !input.startsWith("//") &&
    !input.includes("\\")
  )
    return input;
  try {
    const parsed = new URL(/^www\./i.test(input) ? `https://${input}` : input);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      !parsed.hostname
    )
      return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function splitChatText(text: string): ChatTextPart[] {
  const parts: ChatTextPart[] = [];
  const matcher = /(?:https?:\/\/|www\.)[^\s<>]+/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text))) {
    let candidate = match[0].replace(/[.,!?;:'"\]}]+$/, "");
    while (
      candidate.endsWith(")") &&
      (candidate.match(/\)/g)?.length ?? 0) >
        (candidate.match(/\(/g)?.length ?? 0)
    )
      candidate = candidate.slice(0, -1);
    const url = safeChatUrl(candidate);
    if (!url) continue;
    if (match.index > cursor)
      parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ text: candidate, url });
    cursor = match.index + candidate.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length ? parts : [{ text }];
}

export function chatVideoForUrl(value: string): ChatVideo | null {
  const safe = safeChatUrl(value);
  if (!safe) return null;
  const u = new URL(safe);
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  let id: string | null = null;
  let vertical = false;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (
    ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
  ) {
    const segments = u.pathname.split("/");
    if (["shorts", "embed", "live"].includes(segments[1])) {
      id = segments[2] ?? null;
      vertical = segments[1] === "shorts";
    } else if (u.pathname === "/watch") id = u.searchParams.get("v");
  }
  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id))
    return {
      kind: "youtube",
      url: safe,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      vertical,
    };
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/\/(?:video\/)?(\d+)\/?$/)?.[1];
    if (id)
      return {
        kind: "vimeo",
        url: safe,
        embedUrl: `https://player.vimeo.com/video/${id}`,
      };
  }
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(u.pathname))
    return { kind: "file", url: safe };
  return null;
}

export function chatAttachmentName(
  name: string | null | undefined,
  url: string,
  type?: string | null
): string {
  const fromUrl = (() => {
    try {
      return decodeURIComponent(
        new URL(url, "https://www.facingface.com").pathname.split("/").pop() ??
          ""
      );
    } catch {
      return "";
    }
  })();
  const fallback = type?.startsWith("image/")
    ? "chat-photo.jpg"
    : type?.startsWith("video/")
      ? "chat-video.mp4"
      : "chat-attachment";
  return (
    (name?.trim() || fromUrl || fallback)
      .replace(/[\/\\\u0000-\u001f\u007f:*?"<>|]/g, "-")
      .replace(/^\.+/, "") || fallback
  ).slice(0, 180);
}
