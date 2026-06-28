import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Stream the file bytes directly instead of redirecting to CloudFront.
      // A 307 redirect to a third-party domain can be blocked by iOS Safari ITP
      // and some corporate proxies, causing broken images on mobile.
      const fileResp = await fetch(url);
      if (!fileResp.ok) {
        res.status(502).send("Failed to fetch file from storage");
        return;
      }
      const contentType = fileResp.headers.get("content-type") ?? "application/octet-stream";
      const contentLength = fileResp.headers.get("content-length");
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
      res.set("Access-Control-Allow-Origin", "*");
      if (contentLength) res.set("Content-Length", contentLength);
      const arrayBuffer = await fileResp.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
