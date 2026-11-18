import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  lstat,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const aws = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send(command: any) {
      return aws.send(command);
    }
  },
  PutObjectCommand: class {
    kind = "put";
    constructor(public input: any) {}
  },
  ListObjectsV2Command: class {
    kind = "list";
    constructor(public input: any) {}
  },
  DeleteObjectCommand: class {
    kind = "delete";
    constructor(public input: any) {}
  },
  GetObjectCommand: class {
    kind = "get";
    constructor(public input: any) {}
  },
}));
import {
  storagePut,
  storageGet,
  resolveLegacyMediaUrl,
  purgeAccountMedia,
} from "./storage";
import { accountMediaPrefixes, mediaOwnerId } from "./accountMediaOwnership";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "ff-profile-nov18-"));
  aws.send.mockReset();
  vi.stubEnv("MEDIA_STORAGE_DRIVER", "disk");
  vi.stubEnv("MEDIA_STORAGE_PATH", directory);
  vi.stubEnv("MEDIA_PUBLIC_PATH", "/media");
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});
async function fixture(key: string) {
  const file = path.join(directory, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `fixture:${key}`);
  return file;
}
function s3Environment() {
  vi.stubEnv("MEDIA_STORAGE_DRIVER", "s3");
  vi.stubEnv("S3_ENDPOINT", "https://storage.example.invalid");
  vi.stubEnv("S3_BUCKET", "test-bucket");
  vi.stubEnv("S3_REGION", "test-region");
  vi.stubEnv("S3_ACCESS_KEY_ID", "synthetic-test-only");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "synthetic-test-only");
  vi.stubEnv("S3_PUBLIC_URL", "https://storage.example.invalid/test-bucket");
}

describe("profile-photo namespace compatibility", () => {
  it("writes in a dedicated per-user disk folder, preserves old bytes and makes repeated upload names unique", async () => {
    const oldFile = await fixture("avatars/7/existing.jpg");
    const oldGeneral = await fixture("media/7/existing.jpg");
    const first = await storagePut(
      "profile-photos/7/1795000000000.jpg",
      Buffer.from("new-first"),
      "image/jpeg",
    );
    const second = await storagePut(
      "profile-photos/7/1795000000000.jpg",
      Buffer.from("new-second"),
      "image/jpeg",
    );
    expect(first.key).toMatch(
      /^profile-photos\/7\/1795000000000_[a-f0-9]{8}\.jpg$/,
    );
    expect(first.url).toBe(`/media/${first.key}`);
    expect(second.key).not.toBe(first.key);
    expect(await readFile(path.join(directory, first.key), "utf8")).toBe(
      "new-first",
    );
    expect(await readFile(path.join(directory, second.key), "utf8")).toBe(
      "new-second",
    );
    expect(await readFile(oldFile, "utf8")).toBe(
      "fixture:avatars/7/existing.jpg",
    );
    expect(await readFile(oldGeneral, "utf8")).toBe(
      "fixture:media/7/existing.jpg",
    );
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("preserves old key resolution and custom public media paths without migration", async () => {
    vi.stubEnv("MEDIA_PUBLIC_PATH", "/user-media");
    expect(await storageGet("avatars/7/existing.jpg")).toEqual({
      key: "avatars/7/existing.jpg",
      url: "/user-media/avatars/7/existing.jpg",
    });
    expect(resolveLegacyMediaUrl("/manus-storage/avatars/7/existing.jpg")).toBe(
      "/user-media/avatars/7/existing.jpg",
    );
    const photo = await storagePut(
      "profile-photos/7/new.jpg",
      Buffer.from("new"),
      "image/jpeg",
    );
    expect(photo.url).toBe(`/user-media/${photo.key}`);
  });

  it("keeps ownership and self-account purge coverage for both old and new profile prefixes", async () => {
    expect(accountMediaPrefixes(7)).toContain("profile-photos/7/");
    expect(accountMediaPrefixes(7)).toContain("avatars/7/");
    expect(mediaOwnerId("profile-photos/7/a.jpg")).toBe(7);
    expect(mediaOwnerId("avatars/7/a.jpg")).toBe(7);
    expect(mediaOwnerId("group-avatars/7/a.jpg")).toBeNull();
    const owned = await Promise.all(
      [
        "profile-photos/7/current.jpg",
        "profile-photos/7/history/old.jpg",
        "avatars/7/legacy.jpg",
        "media/7/legacy.jpg",
      ].map(fixture),
    );
    const retainedKeys = [
      "profile-photos/71/peer.jpg",
      "avatars/71/peer.jpg",
      "media/71/peer.jpg",
      "group-avatars/7/shared.jpg",
      "page-avatars/7/shared.jpg",
      "public-groups/7/shared.jpg",
    ];
    const retained = await Promise.all(retainedKeys.map(fixture));
    await purgeAccountMedia(7);
    for (const file of owned)
      await expect(lstat(file)).rejects.toMatchObject({ code: "ENOENT" });
    for (let index = 0; index < retained.length; index++)
      expect(await readFile(retained[index], "utf8")).toBe(
        `fixture:${retainedKeys[index]}`,
      );
    await expect(purgeAccountMedia(7)).resolves.toBeUndefined();
  });

  it("does not follow an owned profile-folder symlink into another user's files during purge", async () => {
    const peer = await fixture("profile-photos/71/keep.jpg");
    await symlink(
      path.join(directory, "profile-photos/71"),
      path.join(directory, "profile-photos/7"),
    );
    await purgeAccountMedia(7);
    expect(await readFile(peer, "utf8")).toBe(
      "fixture:profile-photos/71/keep.jpg",
    );
    await expect(
      lstat(path.join(directory, "profile-photos/7")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("uses the same dedicated object prefix with S3 without changing providers", async () => {
    s3Environment();
    aws.send.mockResolvedValue({});
    const result = await storagePut(
      "profile-photos/7/new.jpg",
      Buffer.from("new-image"),
      "image/jpeg",
    );
    const command = aws.send.mock.calls[0][0];
    expect(command.kind).toBe("put");
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: result.key,
      Body: Buffer.from("new-image"),
      ContentType: "image/jpeg",
    });
    expect(result.key).toMatch(/^profile-photos\/7\/new_[a-f0-9]{8}\.jpg$/);
    expect(result.url).toBe(
      `https://storage.example.invalid/test-bucket/${result.key}`,
    );
  });

  it("purges both old/new S3 prefixes through pagination and skips out-of-scope returned keys", async () => {
    s3Environment();
    aws.send.mockImplementation(async (command: any) => {
      if (command.kind !== "list") return {};
      if (command.input.Prefix === "profile-photos/7/") {
        if (!command.input.ContinuationToken)
          return {
            Contents: [
              { Key: "profile-photos/7/new.jpg" },
              { Key: "profile-photos/71/peer.jpg" },
            ],
            IsTruncated: true,
            NextContinuationToken: "test-next-page",
          };
        return {
          Contents: [
            { Key: "profile-photos/7/history/old.jpg" },
            { Key: "group-avatars/7/shared.jpg" },
          ],
          IsTruncated: false,
        };
      }
      if (command.input.Prefix === "avatars/7/")
        return {
          Contents: [
            { Key: "avatars/7/legacy.jpg" },
            { Key: "avatars/71/peer.jpg" },
          ],
          IsTruncated: false,
        };
      return { Contents: [], IsTruncated: false };
    });
    await purgeAccountMedia(7);
    const commands = aws.send.mock.calls.map((call) => call[0]);
    const deleted = commands
      .filter((command) => command.kind === "delete")
      .map((command) => command.input.Key);
    expect(deleted).toEqual([
      "profile-photos/7/new.jpg",
      "profile-photos/7/history/old.jpg",
      "avatars/7/legacy.jpg",
    ]);
    expect(
      commands
        .filter(
          (command) =>
            command.kind === "list" &&
            command.input.Prefix === "profile-photos/7/",
        )
        .map((command) => command.input.ContinuationToken),
    ).toEqual([undefined, "test-next-page"]);
  });
});
