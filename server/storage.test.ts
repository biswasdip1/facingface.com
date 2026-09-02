import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveLegacyMediaUrl, storageGet, storagePut } from "./storage";

const originalEnvironment = {
  driver: process.env.MEDIA_STORAGE_DRIVER,
  directory: process.env.MEDIA_STORAGE_PATH,
  publicPath: process.env.MEDIA_PUBLIC_PATH,
  nodeEnv: process.env.NODE_ENV,
};

const cleanupDirectories: string[] = [];

afterEach(async () => {
  for (const directory of cleanupDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }

  process.env.MEDIA_STORAGE_DRIVER = originalEnvironment.driver;
  process.env.MEDIA_STORAGE_PATH = originalEnvironment.directory;
  process.env.MEDIA_PUBLIC_PATH = originalEnvironment.publicPath;
  process.env.NODE_ENV = originalEnvironment.nodeEnv;
});

describe("Render persistent-disk media storage", () => {
  it("writes an uploaded object to the configured persistent directory and returns a public /media URL", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "facingface-media-"));
    cleanupDirectories.push(directory);
    process.env.MEDIA_STORAGE_DRIVER = "disk";
    process.env.MEDIA_STORAGE_PATH = directory;
    process.env.MEDIA_PUBLIC_PATH = "/media";

    const result = await storagePut("posts/42/photo.webp", Buffer.from("image-data"), "image/webp");

    expect(result.key).toMatch(/^posts\/42\/photo_[a-f0-9]{8}\.webp$/);
    expect(result.url).toMatch(/^\/media\/posts\/42\/photo_[a-f0-9]{8}\.webp$/);
    await expect(readFile(path.join(directory, result.key), "utf8")).resolves.toBe("image-data");
    await expect(storageGet(result.key)).resolves.toEqual(result);
  });

  it("maps a legacy Forge URL to the Render media route without contacting Forge", () => {
    process.env.MEDIA_STORAGE_DRIVER = "disk";
    process.env.MEDIA_STORAGE_PATH = "/var/data/media";
    process.env.MEDIA_PUBLIC_PATH = "/media";
    process.env.NODE_ENV = "production";

    expect(resolveLegacyMediaUrl("/manus-storage/posts/42/photo.webp")).toBe("/media/posts/42/photo.webp");
  });

  it("rejects traversal paths before writing to the disk", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "facingface-media-"));
    cleanupDirectories.push(directory);
    process.env.MEDIA_STORAGE_DRIVER = "disk";
    process.env.MEDIA_STORAGE_PATH = directory;
    process.env.MEDIA_PUBLIC_PATH = "/media";

    await expect(storagePut("../outside.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow("Invalid media storage key");
  });
});
