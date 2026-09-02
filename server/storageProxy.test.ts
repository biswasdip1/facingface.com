import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { registerStorageProxy } from "./_core/storageProxy";

const originalEnvironment = {
  driver: process.env.MEDIA_STORAGE_DRIVER,
  directory: process.env.MEDIA_STORAGE_PATH,
  publicPath: process.env.MEDIA_PUBLIC_PATH,
};

const servers: Server[] = [];
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
  process.env.MEDIA_STORAGE_DRIVER = originalEnvironment.driver;
  process.env.MEDIA_STORAGE_PATH = originalEnvironment.directory;
  process.env.MEDIA_PUBLIC_PATH = originalEnvironment.publicPath;
});

async function startMediaApp(): Promise<string> {
  const app = express();
  registerStorageProxy(app);
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  return `http://127.0.0.1:${address.port}`;
}

describe("Render media route", () => {
  it("serves restored disk media and redirects the equivalent legacy URL without a Forge request", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "facingface-media-route-"));
    directories.push(directory);
    await mkdir(path.join(directory, "posts", "7"), { recursive: true });
    await writeFile(path.join(directory, "posts", "7", "photo.webp"), "restored-media");

    process.env.MEDIA_STORAGE_DRIVER = "disk";
    process.env.MEDIA_STORAGE_PATH = directory;
    process.env.MEDIA_PUBLIC_PATH = "/media";

    const baseUrl = await startMediaApp();
    const direct = await fetch(`${baseUrl}/media/posts/7/photo.webp`);
    expect(direct.status).toBe(200);
    expect(await direct.text()).toBe("restored-media");

    const legacy = await fetch(`${baseUrl}/manus-storage/posts/7/photo.webp`, { redirect: "manual" });
    expect(legacy.status).toBe(302);
    expect(legacy.headers.get("location")).toBe("/media/posts/7/photo.webp");
  });
});
