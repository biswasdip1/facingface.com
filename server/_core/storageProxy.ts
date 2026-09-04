import express, { type Express } from "express";
import { ENV } from "./env";
import { getDiskMediaConfig, resolveLegacyMediaUrl } from "../storage";
import { recordMediaDelivery } from "./mediaUsage";

/**
 * Registers the public media route for a Render persistent disk and keeps a
 * compatibility path for existing /manus-storage URLs.
 *
 * In production we never call Forge here. A legacy URL redirects only when its
 * original object has been restored under the same key in active Render storage;
 * otherwise it returns 410 so the UI can show its existing fallback without
 * creating repeated invalid-token errors in Render logs.
 */
export function registerStorageProxy(app: Express) {
  const diskMedia = getDiskMediaConfig();
  if (diskMedia) {
    app.use(diskMedia.publicPath, (req, res, next) => {
      res.once("finish", () => {
        const contentLength = res.getHeader("Content-Length");
        recordMediaDelivery(res.statusCode, Array.isArray(contentLength) ? contentLength[0] : contentLength);
      });
      next();
    });
    app.use(
      diskMedia.publicPath,
      express.static(diskMedia.directory, {
        fallthrough: true,
        immutable: true,
        maxAge: "1d",
        setHeaders: res => {
          res.setHeader("Access-Control-Allow-Origin", "*");
        },
      }),
    );
    console.log(`[Media] Serving Render persistent-disk media at ${diskMedia.publicPath}`);
  }

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const restoredUrl = resolveLegacyMediaUrl(`/manus-storage/${key}`);
    if (restoredUrl) {
      res.redirect(302, restoredUrl);
      return;
    }

    if (ENV.isProduction) {
      res.status(410).send("Legacy media is unavailable until its original file is restored.");
      return;
    }

    // Preserve legacy Forge behaviour only for local Manus development, where
    // valid development credentials may still be present.
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(410).send("Legacy media storage is not configured.");
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", `${ENV.forgeApiUrl.replace(/\/+$/, "")}/`);
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] Forge development request failed: ${forgeResp.status} ${body}`);
        res.status(502).send("Legacy storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from legacy storage");
        return;
      }

      const fileResp = await fetch(url);
      if (!fileResp.ok) {
        res.status(502).send("Failed to fetch legacy media");
        return;
      }

      const contentType = fileResp.headers.get("content-type") ?? "application/octet-stream";
      const contentLength = fileResp.headers.get("content-length");
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
      res.set("Access-Control-Allow-Origin", "*");
      if (contentLength) res.set("Content-Length", contentLength);
      res.send(Buffer.from(await fileResp.arrayBuffer()));
    } catch (error) {
      console.error("[StorageProxy] Legacy development request failed:", error);
      res.status(502).send("Legacy storage proxy error");
    }
  });
}
