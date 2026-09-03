import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getMediaStorageMode, resolveLegacyMediaUrl, storageGet, storagePut } from "./storage";

const originalEnv = {
  driver: process.env.MEDIA_STORAGE_DRIVER,
  path: process.env.MEDIA_STORAGE_PATH,
  publicPath: process.env.MEDIA_PUBLIC_PATH,
};
let temporaryDirectory = "";

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "facingface-media-"));
  process.env.MEDIA_STORAGE_DRIVER = "disk";
  process.env.MEDIA_STORAGE_PATH = temporaryDirectory;
  process.env.MEDIA_PUBLIC_PATH = "/media";
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
  if (originalEnv.driver === undefined) delete process.env.MEDIA_STORAGE_DRIVER;
  else process.env.MEDIA_STORAGE_DRIVER = originalEnv.driver;
  if (originalEnv.path === undefined) delete process.env.MEDIA_STORAGE_PATH;
  else process.env.MEDIA_STORAGE_PATH = originalEnv.path;
  if (originalEnv.publicPath === undefined) delete process.env.MEDIA_PUBLIC_PATH;
  else process.env.MEDIA_PUBLIC_PATH = originalEnv.publicPath;
});

describe("Render disk storage", () => {
  it("writes media beneath the configured persistent directory and returns a public /media URL", async () => {
    const result = await storagePut("profile-covers/user 123.jpg", Buffer.from("cover-image"), "image/jpeg");

    expect(getMediaStorageMode()).toBe("disk");
    expect(result.key).toMatch(/^profile-covers\/user 123_[a-f0-9]{8}\.jpg$/);
    expect(result.url).toMatch(/^\/media\/profile-covers\/user%20123_[a-f0-9]{8}\.jpg$/);
    await expect(readFile(path.join(temporaryDirectory, result.key), "utf8")).resolves.toBe("cover-image");
  });

  it("returns a stable public URL for an existing storage key", async () => {
    await expect(storageGet("group-covers/44.jpg")).resolves.toEqual({
      key: "group-covers/44.jpg",
      url: "/media/group-covers/44.jpg",
    });
  });

  it("converts legacy Forge paths to the active Render media location without contacting Forge", () => {
    expect(resolveLegacyMediaUrl("/manus-storage/page-covers/page-7.jpg")).toBe("/media/page-covers/page-7.jpg");
  });

  it("rejects path traversal before writing to the persistent disk", async () => {
    await expect(storagePut("../outside.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow("Invalid media storage key");
  });
});
