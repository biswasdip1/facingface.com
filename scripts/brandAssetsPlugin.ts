import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

// These small permanent brand assets are shipped with the source rather than
// referenced on temporary third-party storage. No user media or secrets here.
export const BRAND_ASSET_FILES = [
  "facingface-mark-192-20261103.png",
  "facingface-mark-512-20261103.png",
  "facingface-mark-maskable-512-20261103.png",
  "facingface-chat-192-20261103.png",
  "facingface-chat-512-20261103.png",
  "facingface-chat-maskable-512-20261103.png",
  "facingface-share-20261103.jpg",
] as const;

export function brandAssetsPlugin(projectRoot: string): Plugin {
  const directory = path.join(projectRoot, "brand-assets");
  return {
    name: "facingface-permanent-brand-assets",
    generateBundle() {
      for (const filename of BRAND_ASSET_FILES) {
        // Missing files fail the deployment build instead of silently shipping
        // another broken logo/og:image reference.
        this.emitFile({
          type: "asset",
          fileName: `brand/${filename}`,
          source: fs.readFileSync(path.join(directory, filename)),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requested = (req.url ?? "").split("?")[0];
        if (!requested.startsWith("/brand/")) return next();
        const filename = requested.slice("/brand/".length);
        if (!(BRAND_ASSET_FILES as readonly string[]).includes(filename)) {
          res.statusCode = 404;
          res.end("Brand asset not found");
          return;
        }
        try {
          const bytes = fs.readFileSync(path.join(directory, filename));
          res.setHeader(
            "Content-Type",
            filename.endsWith(".jpg") ? "image/jpeg" : "image/png"
          );
          res.setHeader("Content-Length", bytes.length);
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.statusCode = 200;
          res.end(req.method === "HEAD" ? undefined : bytes);
        } catch {
          res.statusCode = 404;
          res.end("Brand asset not found");
        }
      });
    },
  };
}
