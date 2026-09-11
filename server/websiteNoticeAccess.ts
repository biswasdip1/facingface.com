const NOTICE_IMAGE_PATH_PREFIXES = ["/media/", "/api/files/", "/manus-storage/"] as const;
const NOTICE_VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "www.vimeo.com",
]);

/** Only accept a persistent FacingFace media address for a notice image. */
export function isManagedWebsiteNoticeImageUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("..") || /^https?:\/\//i.test(trimmed)) return false;
  return NOTICE_IMAGE_PATH_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/** Notice videos are intentionally limited to reputable embeddable providers. */
export function isSupportedWebsiteNoticeVideoUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && NOTICE_VIDEO_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getWebsiteNoticeDismissalKey(version: number, scope: "visitor" | "member", userId?: number): string {
  const identity = scope === "member" ? `member-${userId ?? "unknown"}` : "visitor";
  return `facingface.website-notice.${identity}.v${version}`;
}

export function hasWebsiteNoticeContent(title: string, message: string): boolean {
  return title.trim().length > 0 && message.trim().length > 0;
}
