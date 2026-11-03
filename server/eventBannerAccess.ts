export function isFacingFaceEventBannerUrl(value: string): boolean {
  if (value.length === 0 || value.length > 1_000) return false;

  const prefix = value.startsWith("/media/")
    ? "/media/"
    : value.startsWith("/manus-storage/")
      ? "/manus-storage/"
      : null;
  if (!prefix) return false;

  let path: string;
  try {
    path = decodeURIComponent(value.slice(prefix.length));
  } catch {
    return false;
  }
  if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return false;

  // Limit the path to ordinary storage-key characters after decoding. This
  // permits the current Render /media URLs and legacy internal media URLs,
  // but not external URLs, query strings, fragments, or path traversal.
  return /^[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(path);
}

export function normaliseEventBannerUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isFacingFaceEventBannerUrl(trimmed) ? trimmed : null;
}
