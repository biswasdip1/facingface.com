export function accountMediaPrefixes(userId: number): string[] {
  if (!Number.isInteger(userId) || userId < 1) throw new Error("Invalid user ID");
  return ["media", "docs", "audio", "dm", "dm-voice", "profile-photos", "cover-photos", "stories", "avatars"].map((name) => `${name}/${userId}/`).concat([
    `auto-posters/${userId}-`, `reels/${userId}-`, `reels/thumb-${userId}-`,
  ]);
}
export function mediaOwnerId(key: string): number | null {
  const match = key.match(/^(?:media|docs|audio|dm|dm-voice|profile-photos|cover-photos|stories|avatars)\/([1-9]\d*)\//) || key.match(/^(?:auto-posters|reels)\/(?:thumb-)?([1-9]\d*)-/);
  return match ? Number(match[1]) : null;
}
