/**
 * Media storage helpers.
 *
 * Production choices:
 *   1. Render persistent disk (recommended for the supplied Render blueprint)
 *      MEDIA_STORAGE_DRIVER=disk
 *      MEDIA_STORAGE_PATH=/var/data/media
 *      MEDIA_PUBLIC_PATH=/media
 *
 *   2. Any S3-compatible service (AWS S3, Render-hosted MinIO, Cloudflare R2)
 *      MEDIA_STORAGE_DRIVER=s3
 *      S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID,
 *      S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL
 *
 * Manus Forge is retained for local Manus development only. It is never used
 * as a storage fallback in production, preventing Render from generating or
 * serving broken /manus-storage URLs with an invalid Forge token.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ENV } from "./_core/env";

export type MediaStorageMode = "disk" | "s3" | "forge" | "unconfigured";

type S3Config = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  forcePathStyle: boolean;
};

type DiskConfig = {
  directory: string;
  publicPath: string;
};

function normalizeKey(relKey: string): string {
  const normalized = relKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some(segment => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid media storage key");
  }
  return normalized;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function encodeKeyForUrl(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function configuredDriver(): string {
  return (process.env.MEDIA_STORAGE_DRIVER ?? "").trim().toLowerCase();
}

/**
 * Supports the older AWS_* variable names only when an explicit public URL is
 * also supplied. That avoids guessing a public bucket URL or accidentally
 * publishing uploads through an unintended endpoint.
 */
function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT ?? process.env.AWS_ENDPOINT_URL;
  const bucket = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET;
  const region = process.env.S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL ?? process.env.AWS_S3_PUBLIC_URL;
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? "false").toLowerCase() === "true";

  if (endpoint && bucket && accessKeyId && secretAccessKey && publicUrl) {
    return { endpoint, bucket, region, accessKeyId, secretAccessKey, publicUrl, forcePathStyle };
  }
  return null;
}

export function getDiskMediaConfig(): DiskConfig | null {
  const driver = configuredDriver();
  if (driver && driver !== "disk") return null;

  const directory = process.env.MEDIA_STORAGE_PATH?.trim();
  if (!directory) return null;

  const rawPublicPath = process.env.MEDIA_PUBLIC_PATH?.trim() || "/media";
  const publicPath = `/${rawPublicPath.replace(/^\/+|\/+$/g, "")}`;
  if (publicPath === "/") {
    throw new Error("MEDIA_PUBLIC_PATH must not be the site root");
  }

  return { directory: path.resolve(directory), publicPath };
}

function getForgeConfig() {
  // A separately deployed Render app must not depend on Manus Forge storage.
  if (ENV.isProduction) return null;

  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (forgeUrl && forgeKey) {
    return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
  }
  return null;
}

function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/+$/, "")}/${encodeKeyForUrl(key)}`;
}

function diskPathForKey(cfg: DiskConfig, key: string): string {
  const root = path.resolve(cfg.directory);
  const candidate = path.resolve(root, ...key.split("/"));
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid media storage path");
  }
  return candidate;
}

async function storagePutDisk(
  key: string,
  data: Buffer | Uint8Array | string,
  cfg: DiskConfig,
): Promise<{ key: string; url: string }> {
  const destination = diskPathForKey(cfg, key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data);
  return { key, url: publicUrl(cfg.publicPath, key) };
}

async function storagePutS3(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  cfg: S3Config,
): Promise<{ key: string; url: string }> {
  const client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: cfg.forcePathStyle,
  });

  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return { key, url: publicUrl(cfg.publicUrl, key) };
}

async function storagePutForge(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  cfg: NonNullable<ReturnType<typeof getForgeConfig>>,
): Promise<{ key: string; url: string }> {
  const presignUrl = new URL("v1/storage/presign/put", `${cfg.forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${cfg.forgeKey}` },
  });
  if (!presignResp.ok) {
    const message = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${message}`);
  }

  const { url: uploadUrl } = (await presignResp.json()) as { url: string };
  if (!uploadUrl) throw new Error("Forge returned an empty upload URL");

  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  const uploadResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!uploadResp.ok) throw new Error(`Storage upload failed (${uploadResp.status})`);

  return { key, url: `/manus-storage/${encodeKeyForUrl(key)}` };
}

export function getMediaStorageMode(): MediaStorageMode {
  const driver = configuredDriver();
  const s3 = getS3Config();
  const disk = getDiskMediaConfig();

  if (driver === "disk") return disk ? "disk" : "unconfigured";
  if (driver === "s3") return s3 ? "s3" : "unconfigured";
  if (s3) return "s3";
  if (disk) return "disk";
  if (getForgeConfig()) return "forge";
  return "unconfigured";
}

function configuredStorageError(): Error {
  return new Error(
    "Media storage is not configured. On Render set MEDIA_STORAGE_DRIVER=disk, " +
      "MEDIA_STORAGE_PATH=/var/data/media and MEDIA_PUBLIC_PATH=/media after attaching " +
      "a persistent disk at /var/data. Alternatively configure all S3_* variables.",
  );
}

/**
 * Converts an old Forge-relative URL to the active Render media location when
 * the same key has been copied there. It never invents or retrieves lost bytes.
 */
export function resolveLegacyMediaUrl(url: string): string | null {
  if (!url.startsWith("/manus-storage/")) return null;

  let key: string;
  try {
    key = normalizeKey(decodeURIComponent(url.slice("/manus-storage/".length)));
  } catch {
    return null;
  }

  const mode = getMediaStorageMode();
  if (mode === "disk") {
    const disk = getDiskMediaConfig();
    return disk ? publicUrl(disk.publicPath, key) : null;
  }
  if (mode === "s3") {
    const s3 = getS3Config();
    return s3 ? publicUrl(s3.publicUrl, key) : null;
  }
  return null;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const mode = getMediaStorageMode();

  if (mode === "disk") {
    const disk = getDiskMediaConfig();
    if (!disk) throw configuredStorageError();
    return storagePutDisk(key, data, disk);
  }
  if (mode === "s3") {
    const s3 = getS3Config();
    if (!s3) throw configuredStorageError();
    return storagePutS3(key, data, contentType, s3);
  }
  if (mode === "forge") {
    const forge = getForgeConfig();
    if (!forge) throw configuredStorageError();
    return storagePutForge(key, data, contentType, forge);
  }

  throw configuredStorageError();
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const mode = getMediaStorageMode();

  if (mode === "disk") {
    const disk = getDiskMediaConfig();
    if (!disk) throw configuredStorageError();
    return { key, url: publicUrl(disk.publicPath, key) };
  }
  if (mode === "s3") {
    const s3 = getS3Config();
    if (!s3) throw configuredStorageError();
    return { key, url: publicUrl(s3.publicUrl, key) };
  }
  if (mode === "forge") return { key, url: `/manus-storage/${encodeKeyForUrl(key)}` };

  throw configuredStorageError();
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return (await storageGet(relKey)).url;
}
