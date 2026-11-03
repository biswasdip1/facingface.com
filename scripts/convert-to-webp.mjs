/**
 * Batch WebP conversion script
 * Fetches all existing post images that are not already WebP,
 * compresses them to WebP via Sharp, re-uploads to storage,
 * and updates the DB record.
 *
 * Run: node scripts/convert-to-webp.mjs
 */
import mysql from "mysql2/promise";
import sharp from "sharp";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

const FORGE_API_URL = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!FORGE_API_URL || !FORGE_API_KEY || !DATABASE_URL) {
  console.error("Missing required env vars: BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, DATABASE_URL");
  process.exit(1);
}

/** Get a presigned GET URL for an existing storage key */
async function getPresignedGetUrl(key) {
  const url = new URL("v1/storage/presign/get", FORGE_API_URL + "/");
  url.searchParams.set("path", key);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${FORGE_API_KEY}` } });
  if (!res.ok) throw new Error(`Presign GET failed: ${res.status} ${await res.text()}`);
  const { url: signedUrl } = await res.json();
  if (!signedUrl) throw new Error("Empty signed GET URL");
  return signedUrl;
}

/** Upload buffer to storage, return the /manus-storage/... URL */
async function storagePut(key, buffer, mimeType) {
  // 1. Get presigned PUT URL
  const presignUrl = new URL("v1/storage/presign/put", FORGE_API_URL + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
  });
  if (!presignResp.ok) throw new Error(`Presign PUT failed: ${presignResp.status} ${await presignResp.text()}`);
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Empty presign PUT URL");

  // 2. PUT directly to S3
  const putResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: buffer,
  });
  if (!putResp.ok) throw new Error(`S3 PUT failed: ${putResp.status}`);

  return `/manus-storage/${key}`;
}

function appendHashSuffix(key) {
  const hash = Math.random().toString(36).slice(2, 10);
  const lastDot = key.lastIndexOf(".");
  if (lastDot === -1) return `${key}_${hash}`;
  return `${key.slice(0, lastDot)}_${hash}${key.slice(lastDot)}`;
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // Fetch all non-WebP post images
  const [rows] = await conn.execute(
    "SELECT id, mediaUrl FROM posts WHERE mediaUrl IS NOT NULL AND mediaType='image' AND mediaUrl NOT LIKE '%.webp'"
  );

  console.log(`Found ${rows.length} non-WebP images to convert.`);

  let converted = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // Extract the storage key from the relative URL
      const storageKey = row.mediaUrl.replace("/manus-storage/", "");

      // Get a signed URL to fetch the image
      const signedUrl = await getPresignedGetUrl(storageKey);
      const resp = await fetch(signedUrl, { redirect: "follow" });
      if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());

      // Convert to WebP
      const webpBuf = await sharp(buf)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      // Build new key (replace extension with .webp, add hash suffix)
      const newKey = appendHashSuffix(storageKey.replace(/\.[^.]+$/, ".webp"));
      const newUrl = await storagePut(newKey, webpBuf, "image/webp");

      // Update DB
      await conn.execute("UPDATE posts SET mediaUrl = ? WHERE id = ?", [newUrl, row.id]);
      const saved = Math.round((1 - webpBuf.length / buf.length) * 100);
      console.log(`  ✓ Post ${row.id}: saved ~${saved}% → ${newUrl}`);
      converted++;
    } catch (err) {
      console.error(`  ✗ Post ${row.id}: ${err.message}`);
      failed++;
    }
  }

  await conn.end();
  console.log(`\nDone. Converted: ${converted}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
