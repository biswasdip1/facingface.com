import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getMediaDeliveryStats, getMediaDiskStats, recordMediaDelivery } from "./mediaUsage";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("media delivery monitoring", () => {
  it("records only actual media response counts and declared bytes", () => {
    const before = getMediaDeliveryStats();
    recordMediaDelivery(200, "1234");
    recordMediaDelivery(410);
    const after = getMediaDeliveryStats();

    expect(after.requests - before.requests).toBe(2);
    expect(after.bytesServed - before.bytesServed).toBe(1234);
    expect(after.notFoundResponses - before.notFoundResponses).toBe(1);
  });

  it("reports an unconfigured media disk honestly", async () => {
    const stats = await getMediaDiskStats(null);
    expect(stats.available).toBe(false);
    expect(stats.error).toContain("not configured");
  });

  it("measures the actual bytes and file count in a media directory", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "facingface-media-"));
    temporaryDirectories.push(directory);
    await writeFile(path.join(directory, "photo.jpg"), "hello");
    const nested = path.join(directory, "avatars");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(nested);
    await writeFile(path.join(nested, "member.png"), "world!");

    const stats = await getMediaDiskStats(directory);
    expect(stats.available).toBe(true);
    expect(stats.fileCount).toBe(2);
    expect(stats.usedBytes).toBe(11);
    expect(stats.capacityBytes).toBeGreaterThan(0);
  });
});
