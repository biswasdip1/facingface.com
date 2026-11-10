import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, symlink, lstat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const calls = vi.hoisted(() => ({ calls: [] as any[], send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send(command: any) { calls.calls.push(command); return calls.send(command); } },
  ListObjectsV2Command: class { kind = "list"; constructor(public input: any) {} },
  DeleteObjectCommand: class { kind = "delete"; constructor(public input: any) {} },
  PutObjectCommand: class { constructor(public input: any) {} },
  GetObjectCommand: class { constructor(public input: any) {} },
}));
import { purgeAccountMedia } from "./storage";
import { accountMediaPrefixes, mediaOwnerId } from "./accountMediaOwnership";
let directory: string;
beforeEach(async () => { directory = await mkdtemp(path.join(tmpdir(), "ff-purge-test-")); calls.calls.length = 0; calls.send.mockReset(); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
async function put(key: string) { const file = path.join(directory, key); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, key); return file; }

describe("physical personal-media purge", () => {
  it("rejects invalid IDs and assigns only reviewed ownership prefixes", () => {
    expect(() => accountMediaPrefixes(0)).toThrow();
    expect(mediaOwnerId("media/1/a.jpg")).toBe(1);
    expect(mediaOwnerId("media/11/a.jpg")).toBe(11);
    expect(mediaOwnerId("public-groups/1/a.jpg")).toBeNull();
  });
  it("removes target-owned files while preserving peer/shared files", async () => {
    vi.stubEnv("MEDIA_STORAGE_DRIVER", "disk"); vi.stubEnv("MEDIA_STORAGE_PATH", directory); vi.stubEnv("MEDIA_PUBLIC_PATH", "/media");
    const own = await put("media/1/photo.jpg"); await put("dm-voice/1/voice.webm"); await put("reels/1-video.mp4"); await put("reels/thumb-1-cover.jpg");
    const peer = await put("media/11/photo.jpg"); const peerStem = await put("reels/11-video.mp4"); const shared = await put("public-groups/1/cover.jpg");
    await purgeAccountMedia(1);
    await expect(lstat(own)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(peer, "utf8")).toBe("media/11/photo.jpg"); expect(await readFile(peerStem, "utf8")).toBe("reels/11-video.mp4"); expect(await readFile(shared, "utf8")).toBe("public-groups/1/cover.jpg");
    await expect(purgeAccountMedia(1)).resolves.toBeUndefined();
  });
  it("unlinks an owned symlink without traversing its target", async () => {
    vi.stubEnv("MEDIA_STORAGE_DRIVER", "disk"); vi.stubEnv("MEDIA_STORAGE_PATH", directory); vi.stubEnv("MEDIA_PUBLIC_PATH", "/media");
    const peer = await put("safe-peer/keep.txt"); await mkdir(path.join(directory, "media"), { recursive: true }); await symlink(path.join(directory, "safe-peer"), path.join(directory, "media/1"));
    await purgeAccountMedia(1); expect(await readFile(peer, "utf8")).toBe("safe-peer/keep.txt"); await expect(lstat(path.join(directory, "media/1"))).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("uses constrained S3 prefixes and refuses a returned out-of-scope key", async () => {
    vi.stubEnv("MEDIA_STORAGE_DRIVER", "s3"); vi.stubEnv("S3_ENDPOINT", "https://storage.invalid"); vi.stubEnv("S3_BUCKET", "test"); vi.stubEnv("S3_REGION", "test"); vi.stubEnv("S3_ACCESS_KEY_ID", "test"); vi.stubEnv("S3_SECRET_ACCESS_KEY", "test"); vi.stubEnv("S3_PUBLIC_URL", "https://storage.invalid/test");
    calls.send.mockImplementation(async (command: any) => command.kind === "list" ? { Contents: [{ Key: command.input.Prefix + "own" }, { Key: "media/11/peer.jpg" }], IsTruncated: false } : {});
    await purgeAccountMedia(1);
    const deleted = calls.calls.filter(c => c.kind === "delete").map(c => c.input.Key);
    expect(deleted).not.toContain("media/11/peer.jpg"); expect(deleted.length).toBe(accountMediaPrefixes(1).length);
    expect(calls.calls.filter(c => c.kind === "list").map(c => c.input.Prefix)).toEqual(accountMediaPrefixes(1));
  });
});
