/**
 * Server-side image compression utilities using Sharp.
 * Applies to all user-uploaded images: post media, avatars, profile/cover photos,
 * page logos/covers, group covers, and story media.
 *
 * Falls back to returning the original buffer unchanged if sharp is unavailable
 * (e.g. native binaries not compiled on the deployment platform). This ensures
 * uploads always succeed even if compression is skipped.
 */
import sharp from "sharp";

export interface CompressOptions {
  /** Maximum dimension (width or height) in pixels. Default: 1200 */
  maxDimension?: number;
  /** JPEG/WebP quality 1–100. Default: 82 */
  quality?: number;
  /** Output format. Default: "webp" */
  format?: "jpeg" | "webp" | "png";
}

export interface CompressResult {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Compress an image buffer.
 * - Resizes so neither dimension exceeds `maxDimension` (preserves aspect ratio).
 * - Converts to JPEG (or specified format) at the given quality.
 * - Returns the compressed buffer and the correct MIME type.
 * - Falls back to original buffer + original mime if sharp fails.
 */
export async function compressImage(
  input: Buffer,
  opts: CompressOptions = {},
  originalMimeType = "image/jpeg"
): Promise<CompressResult> {
  const {
    maxDimension = 1200,
    quality = 82,
    format = "webp",
  } = opts;

  try {
    const pipeline = sharp(input)
      .rotate() // auto-orient based on EXIF
      .resize(maxDimension, maxDimension, {
        fit: "inside",
        withoutEnlargement: true,
      });

    let raw: Buffer;
    let mimeType: string;

    if (format === "webp") {
      raw = await pipeline.webp({ quality }).toBuffer();
      mimeType = "image/webp";
    } else if (format === "png") {
      raw = await pipeline.png({ compressionLevel: 8 }).toBuffer();
      mimeType = "image/png";
    } else {
      raw = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      mimeType = "image/jpeg";
    }

    // Ensure we return a plain Node.js Buffer (not a typed-array subtype)
    return { buffer: Buffer.from(raw) as Buffer, mimeType };
  } catch (err) {
    // Sharp native binary unavailable or failed — pass through original bytes
    console.warn("[imageUtils] sharp compression failed, using original buffer:", (err as Error).message);
    return { buffer: Buffer.from(input), mimeType: originalMimeType };
  }
}

/**
 * Compress an avatar/profile image — smaller max dimension (400 px) since
 * avatars are displayed at small sizes.
 */
export async function compressAvatar(input: Buffer, originalMimeType = "image/jpeg"): Promise<CompressResult> {
  return compressImage(input, { maxDimension: 400, quality: 85, format: "jpeg" }, originalMimeType);
}

/**
 * Compress a cover/banner image — wider max dimension (1600 px) to keep
 * banner quality high.
 */
export async function compressCover(input: Buffer, originalMimeType = "image/jpeg"): Promise<CompressResult> {
  return compressImage(input, { maxDimension: 1600, quality: 82, format: "jpeg" }, originalMimeType);
}
