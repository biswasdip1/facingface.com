import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import type { Plugin, ViteDevServer } from "vite";
import { describe, expect, it, vi } from "vitest";
import {
  BRAND_ASSET_FILES,
  brandAssetsPlugin,
} from "../scripts/brandAssetsPlugin";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const assetDirectory = path.join(projectRoot, "brand-assets");
const html = fs.readFileSync(
  path.join(projectRoot, "client/index.html"),
  "utf8"
);
const shareUrl =
  "https://www.facingface.com/brand/facingface-share-20261103.jpg";
const expectedAssetFiles = [
  "facingface-mark-192-20261103.png",
  "facingface-mark-512-20261103.png",
  "facingface-mark-maskable-512-20261103.png",
  "facingface-chat-192-20261103.png",
  "facingface-chat-512-20261103.png",
  "facingface-chat-maskable-512-20261103.png",
  "facingface-share-20261103.jpg",
] as const;

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface BrandingManifest {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  icons: ManifestIcon[];
  shortcuts: { name: string; icons: ManifestIcon[] }[];
}

const manifestSource = fs.readFileSync(
  path.join(projectRoot, "client/public/manifest.webmanifest"),
  "utf8"
);
const manifest = JSON.parse(manifestSource) as BrandingManifest;

function staticMeta(attribute: "property" | "name", key: string): string {
  // Cheerio parses the source text only: no browser, app code, authentication,
  // JavaScript execution, or HTTP request is involved in these assertions.
  const $ = load(html);
  const tags = $(`meta[${attribute}="${key}"]`);
  expect(tags, `${key} must occur exactly once in the raw HTML`).toHaveLength(
    1
  );
  expect(tags.parents("head")).toHaveLength(1);
  expect(tags.parents("script, noscript, template")).toHaveLength(0);
  const content = tags.attr("content");
  expect(
    content,
    `${key} must have a non-empty content attribute`
  ).toBeTruthy();
  return content ?? "";
}

interface EmittedBrandAsset {
  type: "asset";
  fileName: string;
  source: string | Uint8Array;
}

type BuildContext = {
  emitFile: (asset: EmittedBrandAsset) => string;
};

type BundleHook = (this: BuildContext) => unknown;

async function generateBrandBundle(plugin: Plugin) {
  const hook = plugin.generateBundle;
  if (!hook) throw new Error("Brand plugin must provide generateBundle");
  const handler = typeof hook === "function" ? hook : hook.handler;
  const emitFile = vi.fn((asset: EmittedBrandAsset) => asset.fileName);
  const context: BuildContext = { emitFile };
  // Bind the actual Rollup-style method context rather than invoking an
  // unbound hook; the plugin calls this.emitFile for each asset.
  await (handler as unknown as BundleHook).call(context);
  return { emitFile, context };
}

function fakeResponse() {
  return {
    statusCode: 200,
    headers: new Map<string, string | number>(),
    setHeader(name: string, value: string | number) {
      this.headers.set(name.toLowerCase(), value);
      return this;
    },
    end: vi.fn((_body?: string | Uint8Array) => undefined),
  };
}

type AssetMiddleware = (
  request: { url?: string; method?: string },
  response: ReturnType<typeof fakeResponse>,
  next: () => void
) => void;

async function captureMiddleware(root = projectRoot): Promise<AssetMiddleware> {
  const plugin = brandAssetsPlugin(root);
  const hook = plugin.configureServer;
  if (!hook) throw new Error("Brand plugin must provide configureServer");
  const handler = typeof hook === "function" ? hook : hook.handler;
  let middleware: AssetMiddleware | undefined;
  const server = {
    middlewares: {
      use(callback: AssetMiddleware) {
        expect(
          middleware,
          "register only the brand asset middleware"
        ).toBeUndefined();
        middleware = callback;
      },
    },
  } as unknown as ViteDevServer;
  await (handler as unknown as (server: ViteDevServer) => unknown).call(
    plugin,
    server
  );
  if (!middleware)
    throw new Error("Brand plugin did not register its middleware");
  return middleware;
}

function makeRequest(
  middleware: AssetMiddleware,
  url?: string,
  method = "GET"
) {
  const response = fakeResponse();
  const next = vi.fn(() => undefined);
  // Anonymous requests intentionally omit cookies, session, and auth headers.
  middleware({ url, method }, response, next);
  return { response, next };
}

function temporaryAssetRoot(files: readonly string[]): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "facingface-branding-test-")
  );
  try {
    const destination = path.join(root, "brand-assets");
    fs.mkdirSync(destination);
    for (const filename of files) {
      fs.copyFileSync(
        path.join(assetDirectory, filename),
        path.join(destination, filename)
      );
    }
    return root;
  } catch (error) {
    fs.rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

describe("static FacingFace social metadata", () => {
  it("has exactly one absolute production og:image and matching secure and Twitter URLs", () => {
    expect(staticMeta("property", "og:image")).toBe(shareUrl);
    expect(staticMeta("property", "og:image:secure_url")).toBe(shareUrl);
    expect(staticMeta("name", "twitter:image")).toBe(shareUrl);
    expect(new URL(shareUrl).origin).toBe("https://www.facingface.com");
    expect(
      fs.existsSync(
        path.join(assetDirectory, path.basename(new URL(shareUrl).pathname))
      )
    ).toBe(true);
  });

  it("declares the canonical home URL, site name, JPEG MIME, and numeric social dimensions", () => {
    expect(staticMeta("property", "og:url")).toBe(
      "https://www.facingface.com/"
    );
    expect(staticMeta("property", "og:type")).toBe("website");
    expect(staticMeta("property", "og:site_name")).toBe("FacingFace");
    expect(staticMeta("property", "og:image:type")).toBe("image/jpeg");
    expect(staticMeta("property", "og:image:width")).toBe("1200");
    expect(staticMeta("property", "og:image:height")).toBe("630");
  });

  it("provides static descriptive alt text and a summary_large_image card", () => {
    expect(staticMeta("property", "og:image:alt")).toBe(
      "FacingFace's two faces looking towards each other, with People meet people and Share moments. Find your community. on a red background."
    );
    expect(staticMeta("name", "twitter:image:alt")).toBe(
      "FacingFace — People meet people. Share moments. Find your community."
    );
    expect(staticMeta("name", "twitter:card")).toBe("summary_large_image");
  });

  it("keeps metadata in the raw document head with JavaScript removed and no authentication", () => {
    const $ = load(html);
    const headBefore = $("head").html();
    $("script").remove();
    expect($("head").html()).toBe(headBefore);
    expect($("head meta[property='og:image']").attr("content")).toBe(shareUrl);
    expect($("head meta[property='og:url']").attr("content")).toBe(
      "https://www.facingface.com/"
    );
    expect($("head meta[name='twitter:image']").attr("content")).toBe(shareUrl);
    expect($("head meta[name='twitter:card']").attr("content")).toBe(
      "summary_large_image"
    );
  });

  it("contains no CloudFront or manus.space branding references in HTML or the manifest", () => {
    expect(html).not.toMatch(/cloudfront|manus\.space/i);
    expect(manifestSource).not.toMatch(/cloudfront|manus\.space/i);
  });
});

describe("permanent brand asset build output", () => {
  it("whitelists precisely the seven current dated source filenames", () => {
    expect([...BRAND_ASSET_FILES]).toEqual([...expectedAssetFiles]);
    expect(new Set(BRAND_ASSET_FILES).size).toBe(7);
  });

  it("emits all seven known brand paths with exactly their source bytes", async () => {
    const { emitFile, context } = await generateBrandBundle(
      brandAssetsPlugin(projectRoot)
    );
    expect(emitFile).toHaveBeenCalledTimes(7);
    const emitted = emitFile.mock.calls.map(([asset]) => asset);
    expect(emitted.map(asset => asset.fileName)).toEqual(
      expectedAssetFiles.map(filename => `brand/${filename}`)
    );
    expect(new Set(emitted.map(asset => asset.fileName)).size).toBe(7);
    emitted.forEach((asset, index) => {
      expect(asset.type).toBe("asset");
      expect(typeof asset.source).not.toBe("string");
      expect(Buffer.from(asset.source)).toEqual(
        fs.readFileSync(path.join(assetDirectory, expectedAssetFiles[index]))
      );
      expect(emitFile.mock.contexts[index]).toBe(context);
    });
  });

  it.each(expectedAssetFiles)(
    "fails the build when %s is missing",
    async missing => {
      const root = temporaryAssetRoot(
        expectedAssetFiles.filter(filename => filename !== missing)
      );
      try {
        await expect(
          generateBrandBundle(brandAssetsPlugin(root))
        ).rejects.toThrow(missing);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  );
});

describe("anonymous development brand middleware", () => {
  it.each(expectedAssetFiles)(
    "GET /brand/%s returns exact source bytes and MIME",
    async filename => {
      const middleware = await captureMiddleware();
      const { response, next } = makeRequest(middleware, `/brand/${filename}`);
      const source = fs.readFileSync(path.join(assetDirectory, filename));
      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        filename.endsWith(".jpg") ? "image/jpeg" : "image/png"
      );
      expect(response.headers.get("content-length")).toBe(source.length);
      expect(response.headers.get("cache-control")).toBe(
        "public, max-age=3600"
      );
      expect(response.end).toHaveBeenCalledTimes(1);
      expect(response.end).toHaveBeenCalledWith(source);
    }
  );

  it.each(expectedAssetFiles)(
    "HEAD /brand/%s returns MIME and length without a body",
    async filename => {
      const middleware = await captureMiddleware();
      const { response, next } = makeRequest(
        middleware,
        `/brand/${filename}`,
        "HEAD"
      );
      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        filename.endsWith(".jpg") ? "image/jpeg" : "image/png"
      );
      expect(response.headers.get("content-length")).toBe(
        fs.readFileSync(path.join(assetDirectory, filename)).length
      );
      expect(response.end).toHaveBeenCalledTimes(1);
      expect(response.end.mock.calls[0]?.[0]).toBeUndefined();
    }
  );

  it("serves an exact whitelisted path with a cache-version query string", async () => {
    const middleware = await captureMiddleware();
    const filename = "facingface-share-20261103.jpg";
    const { response, next } = makeRequest(
      middleware,
      `/brand/${filename}?v=20261103`
    );
    expect(response.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
    expect(response.end).toHaveBeenCalledWith(
      fs.readFileSync(path.join(assetDirectory, filename))
    );
  });

  it.each([
    "/brand/unknown.png",
    "/brand/facingface-share-20261102.jpg",
    "/brand/",
    "/brand/../package.json",
    "/brand/../../etc/passwd",
    "/brand/%2e%2e/package.json",
    "/brand/%2E%2E%2Fpackage.json",
    "/brand/..%2fpackage.json",
    "/brand/..\\package.json",
    "/brand//etc/passwd",
    "/brand/./facingface-share-20261103.jpg",
    "/brand/facingface-share-20261103.jpg/../package.json",
    "/brand/%66acingface-share-20261103.jpg",
  ])("denies traversal and non-whitelisted paths with 404: %s", async url => {
    const middleware = await captureMiddleware();
    const { response, next } = makeRequest(middleware, url);
    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(response.headers.has("content-type")).toBe(false);
    expect(response.end).toHaveBeenCalledTimes(1);
    expect(response.end).toHaveBeenCalledWith("Brand asset not found");
  });

  it("returns 404 rather than exposing a file or falling through when a whitelisted asset is missing", async () => {
    const root = temporaryAssetRoot(["facingface-mark-192-20261103.png"]);
    try {
      const middleware = await captureMiddleware(root);
      const { response, next } = makeRequest(
        middleware,
        "/brand/facingface-share-20261103.jpg"
      );
      expect(response.statusCode).toBe(404);
      expect(next).not.toHaveBeenCalled();
      expect(response.end).toHaveBeenCalledTimes(1);
      expect(response.end).toHaveBeenCalledWith("Brand asset not found");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(["/", "/brandish/example.png", "/manifest.webmanifest", undefined])(
    "leaves non-brand requests untouched: %s",
    async url => {
      const middleware = await captureMiddleware();
      const { response, next } = makeRequest(middleware, url);
      expect(next).toHaveBeenCalledTimes(1);
      expect(response.end).not.toHaveBeenCalled();
      expect(response.headers.size).toBe(0);
    }
  );
});

describe("PWA branding declarations and binary headers", () => {
  it("links the current public manifest directly from the raw HTML", () => {
    const $ = load(html);
    const links = $("head link[rel='manifest']");
    expect(links).toHaveLength(1);
    expect(links.attr("href")).toBe("/manifest.webmanifest?v=faces-20261103");
    expect(manifest.name).toBe("FacingFace");
    expect(manifest.short_name).toBe("FacingFace");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
  });

  it("declares regular 192/512 icons and a distinct maskable 512 file", () => {
    expect(manifest.icons).toEqual([
      {
        src: "/brand/facingface-mark-192-20261103.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/facingface-mark-512-20261103.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/facingface-mark-maskable-512-20261103.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
    expect(new Set(manifest.icons.map(icon => icon.src)).size).toBe(3);
    for (const icon of manifest.icons) {
      expect(expectedAssetFiles).toContain(icon.src.slice("/brand/".length));
      expect(
        fs.existsSync(path.join(assetDirectory, path.basename(icon.src)))
      ).toBe(true);
    }
  });

  it("uses the matching dated chat icon for each declared shortcut", () => {
    expect(manifest.shortcuts.map(shortcut => shortcut.name)).toEqual([
      "Open Inbox",
      "Groups",
    ]);
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.icons).toEqual([
        {
          src: "/brand/facingface-chat-192-20261103.png",
          sizes: "192x192",
          type: "image/png",
        },
      ]);
      for (const icon of shortcut.icons) {
        expect(expectedAssetFiles).toContain(icon.src.slice("/brand/".length));
        expect(
          fs.existsSync(path.join(assetDirectory, path.basename(icon.src)))
        ).toBe(true);
      }
    }
  });

  it.each([
    ["facingface-mark-192-20261103.png", 192],
    ["facingface-mark-512-20261103.png", 512],
    ["facingface-mark-maskable-512-20261103.png", 512],
    ["facingface-chat-192-20261103.png", 192],
    ["facingface-chat-512-20261103.png", 512],
    ["facingface-chat-maskable-512-20261103.png", 512],
  ] as const)(
    "matches %s to its declared %i-pixel PNG dimensions",
    (filename, size) => {
      // Inspect only PNG file headers, never image appearance or logo design.
      const bytes = fs.readFileSync(path.join(assetDirectory, filename));
      expect(bytes.length).toBeGreaterThanOrEqual(24);
      expect(bytes.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );
      expect(bytes.readUInt32BE(8)).toBe(13);
      expect(bytes.toString("ascii", 12, 16)).toBe("IHDR");
      expect(bytes.readUInt32BE(16)).toBe(size);
      expect(bytes.readUInt32BE(20)).toBe(size);
    }
  );

  it("ships a JPEG-header share file rather than a renamed PNG", () => {
    const bytes = fs.readFileSync(
      path.join(assetDirectory, "facingface-share-20261103.jpg")
    );
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  });
});
