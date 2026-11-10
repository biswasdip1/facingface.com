import { readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";

type StatFsNumbers = { bsize: number | bigint; blocks: number | bigint; bfree: number | bigint };

export type MediaDeliveryStats = {
  startedAt: string;
  requests: number;
  bytesServed: number;
  notFoundResponses: number;
};

export type MediaDiskStats = {
  available: boolean;
  directory: string | null;
  fileCount: number;
  usedBytes: number;
  capacityBytes: number | null;
  freeBytes: number | null;
  diskUsedPercent: number | null;
  error?: string;
};

const startedAt = new Date();
let requests = 0;
let bytesServed = 0;
let notFoundResponses = 0;
let cachedDiskStats: { value: MediaDiskStats; expiresAt: number } | null = null;

export function recordMediaDelivery(statusCode: number, contentLength?: string | number): void {
  requests += 1;
  if (statusCode === 404 || statusCode === 410) notFoundResponses += 1;
  const bytes = typeof contentLength === "number" ? contentLength : Number(contentLength ?? 0);
  if (Number.isFinite(bytes) && bytes > 0) bytesServed += bytes;
}

export function getMediaDeliveryStats(): MediaDeliveryStats {
  return {
    startedAt: startedAt.toISOString(),
    requests,
    bytesServed,
    notFoundResponses,
  };
}

async function getDirectorySize(directory: string): Promise<{ fileCount: number; usedBytes: number }> {
  let fileCount = 0;
  let usedBytes = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const child = await getDirectorySize(entryPath);
      fileCount += child.fileCount;
      usedBytes += child.usedBytes;
    } else if (entry.isFile()) {
      const info = await stat(entryPath);
      fileCount += 1;
      usedBytes += info.size;
    }
  }
  return { fileCount, usedBytes };
}

function asNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

/**
 * Returns the actual size of the directory used by persistent media. The result
 * is cached briefly so repeated Admin panel refreshes do not scan the disk again.
 */
export async function getMediaDiskStats(directory?: string | null): Promise<MediaDiskStats> {
  if (!directory) {
    return { available: false, directory: null, fileCount: 0, usedBytes: 0, capacityBytes: null, freeBytes: null, diskUsedPercent: null, error: "Persistent media disk is not configured." };
  }

  if (cachedDiskStats && Date.now() < cachedDiskStats.expiresAt) return cachedDiskStats.value;

  try {
    const [size, fs] = await Promise.all([
      getDirectorySize(directory),
      statfs(directory) as Promise<StatFsNumbers>,
    ]);
    const blockSize = asNumber(fs.bsize);
    const capacityBytes = blockSize * asNumber(fs.blocks);
    const freeBytes = blockSize * asNumber(fs.bfree);
    const diskUsedPercent = capacityBytes > 0 ? Math.round(((capacityBytes - freeBytes) / capacityBytes) * 1000) / 10 : null;
    const value: MediaDiskStats = { available: true, directory, fileCount: size.fileCount, usedBytes: size.usedBytes, capacityBytes, freeBytes, diskUsedPercent };
    cachedDiskStats = { value, expiresAt: Date.now() + 60_000 };
    return value;
  } catch (error) {
    const value: MediaDiskStats = {
      available: false,
      directory,
      fileCount: 0,
      usedBytes: 0,
      capacityBytes: null,
      freeBytes: null,
      diskUsedPercent: null,
      error: error instanceof Error ? error.message : "Unable to inspect persistent media storage.",
    };
    cachedDiskStats = { value, expiresAt: Date.now() + 15_000 };
    return value;
  }
}
