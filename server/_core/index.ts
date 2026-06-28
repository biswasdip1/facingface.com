import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initLiveStreamSocket } from "../liveStream";
import { registerStripeWebhook } from "../stripeWebhook";
import { deleteExpiredStories, getDb } from "../db";
import { runAllSeeds } from "../seed";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "path";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Run database migrations on startup — creates all tables if they don't exist
  if (process.env.DATABASE_URL) {
    try {
      const migrationClient = postgres(process.env.DATABASE_URL, {
        ssl: { rejectUnauthorized: false },
        max: 1,
        connect_timeout: 30,
      });
      const migrationDb = drizzle(migrationClient);
      // Use the Drizzle output folder from the project root. In production this
      // file is bundled to dist/index.js, so resolving via __dirname points
      // outside the app root and prevents migrations from creating feedAds.
      const migrationsFolder = path.resolve(process.cwd(), "drizzle");
      await migrate(migrationDb, { migrationsFolder });
      await migrationClient.end();
      console.log("[DB] Migrations applied successfully.");
    } catch (err) {
      console.error("[DB] Migration failed (non-fatal):", err);
    }
  }
  // Seed super admin account and media limits on first startup (no-op if already exists)
  await runAllSeeds();
  const app = express();
  const server = createServer(app);
  // Stripe webhook MUST be before express.json() to receive raw body for signature verification
  registerStripeWebhook(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  initLiveStreamSocket(server);
  // Health check endpoint — used by Render uptime checks and monitoring
  const startTime = Date.now();
  app.get("/api/health", async (_req, res) => {
    let dbStatus = "unreachable";
    try {
      const db = await getDb();
      if (db) {
        await db.execute(sql`SELECT 1`);
        dbStatus = "connected";
      }
    } catch {
      dbStatus = "error";
    }
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const status = dbStatus === "connected" ? "ok" : "degraded";
    res.status(status === "ok" ? 200 : 503).json({
      status,
      db: dbStatus,
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
    });
  });
  // Scheduled cleanup endpoint — called by the hourly scheduled task
  app.post("/api/scheduled/story-cleanup", async (_req, res) => {
    try {
      await deleteExpiredStories();
      console.log("[Cleanup] Expired stories deleted");
      res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error("[Cleanup] Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
