/**
 * Storage helpers — dual-mode:
 *
 * MODE 1 — S3-compatible (AWS S3, Cloudflare R2, Supabase Storage, MinIO, etc.)
 *   Used when the following env vars are set on Render.com (or any host):
 *     S3_ENDPOINT          e.g. https://s3.amazonaws.com
 *                          or   https://<account>.r2.cloudflarestorage.com
 *     S3_BUCKET            bucket name
 *     S3_REGION            e.g. us-east-1  (use "auto" for Cloudflare R2)
 *     S3_ACCESS_KEY_ID
 *     S3_SECRET_ACCESS_KEY
 *     S3_PUBLIC_URL        public base URL for files
 *                          e.g. https://pub-xxx.r2.dev
 *                          or   https://<bucket>.s3.<region>.amazonaws.com
 *
 * MODE 2 — Manus Forge (used when BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY are set)
 *   Files are uploaded via Forge presigned PUT → S3.
 *   URLs returned as /manus-storage/{key} (served by the built-in proxy).
 *
 * S3 env vars take priority over Forge. If neither is configured, an error is thrown.
 */

import { ENV } from "./_core/env";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

// ─── Mode detection ───────────────────────────────────────────────────────────

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION ?? "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (endpoint && bucket && accessKeyId && secretAccessKey && publicUrl) {
    return { endpoint, bucket, region, accessKeyId, secretAccessKey, publicUrl };
  }
  return null;
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (forgeUrl && forgeKey) {
    return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
  }
  return null;
}

// ─── S3-compatible upload ─────────────────────────────────────────────────────

async function storagePutS3(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  cfg: NonNullable<ReturnType<typeof getS3Config>>,
): Promise<{ key: string; url: string }> {
  const client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: false,
  });

  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  const base = cfg.publicUrl.replace(/\/+$/, "");
  const url = `${base}/${key}`;
  return { key, url };
}

// ─── Manus Forge upload ───────────────────────────────────────────────────────

async function storagePutForge(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  cfg: NonNullable<ReturnType<typeof getForgeConfig>>,
): Promise<{ key: string; url: string }> {
  const presignUrl = new URL("v1/storage/presign/put", cfg.forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${cfg.forgeKey}` },
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  // S3-compatible takes priority (Render.com / any external host)
  const s3Cfg = getS3Config();
  if (s3Cfg) {
    return storagePutS3(key, data, contentType, s3Cfg);
  }

  // Fall back to Manus Forge (local dev / Manus hosting)
  const forgeCfg = getForgeConfig();
  if (forgeCfg) {
    return storagePutForge(key, data, contentType, forgeCfg);
  }

  throw new Error(
    "No storage backend configured. " +
    "On Render.com set: S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, " +
    "S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL. " +
    "On Manus set: BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY.",
  );
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  const s3Cfg = getS3Config();
  if (s3Cfg) {
    const base = s3Cfg.publicUrl.replace(/\/+$/, "");
    return { key, url: `${base}/${key}` };
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  const s3Cfg = getS3Config();
  if (s3Cfg) {
    const base = s3Cfg.publicUrl.replace(/\/+$/, "");
    return `${base}/${key}`;
  }

  const forgeCfg = getForgeConfig();
  if (!forgeCfg) {
    throw new Error("No storage backend configured");
  }

  const getUrl = new URL("v1/storage/presign/get", forgeCfg.forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeCfg.forgeKey}` },
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  return url;
}
