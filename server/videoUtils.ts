/**
 * Video utility helpers
 * Extracts a frame from a video buffer at a given timestamp using ffmpeg.
 * Uses ffmpeg-static to ensure the ffmpeg binary is available on all platforms
 * including Render.com deployments.
 */
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import os from "os";

// Use the bundled ffmpeg-static binary if available
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

/**
 * Extract a JPEG frame from a video buffer at `seekSeconds` seconds.
 * Returns a Buffer containing the JPEG image, or null on failure.
 */
export async function extractVideoFrame(
  videoBuffer: Buffer,
  seekSeconds = 1,
): Promise<Buffer | null> {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `ff-input-${randomUUID()}.mp4`);
  const outputPath = path.join(tmpDir, `ff-frame-${randomUUID()}.jpg`);

  try {
    // Write video buffer to a temp file
    await fs.writeFile(inputPath, videoBuffer);

    // Extract frame using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(seekSeconds)
        .frames(1)
        .output(outputPath)
        .outputOptions(["-vf", "scale=iw*min(1\\,1200/iw):-2", "-q:v", "3"])
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // Read the output frame
    const frameBuffer = await fs.readFile(outputPath);
    return frameBuffer;
  } catch (err) {
    console.error("[videoUtils] Frame extraction failed:", err);
    return null;
  } finally {
    // Clean up temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
