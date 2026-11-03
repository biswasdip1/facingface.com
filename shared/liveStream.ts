export const LIVE_STREAM_DURATION_MS = 5 * 60 * 1000;
export const LIVE_STREAM_WARNING_MS = 30 * 1000;

export function liveStreamDeadline(startedAt: Date | string | number): number {
  const started =
    startedAt instanceof Date
      ? startedAt.getTime()
      : typeof startedAt === "number"
        ? startedAt
        : new Date(startedAt).getTime();
  return Number.isFinite(started) ? started + LIVE_STREAM_DURATION_MS : 0;
}

export function liveStreamTimeLeft(
  expiresAt: number,
  now = Date.now()
): number {
  return Math.max(0, Math.min(LIVE_STREAM_DURATION_MS, expiresAt - now));
}

export function formatLiveStreamTime(milliseconds: number): string {
  const total = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}
