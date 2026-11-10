import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { purgeAccountMedia } from "./storage";

export async function processAccountMediaPurge(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const jobs = await db.execute(sql`SELECT job."userId" FROM "account_media_purge_jobs" job JOIN "users" u ON u."id" = job."userId" WHERE job."userId" = ${userId} AND job."completedAt" IS NULL AND u."deletedAt" IS NOT NULL`);
  if (!jobs.length) return true;
  try {
    await purgeAccountMedia(userId);
    await db.execute(sql`UPDATE "account_media_purge_jobs" SET "completedAt" = now() WHERE "userId" = ${userId}`);
    return true;
  } catch (error) {
    console.error("[Account deletion] Media purge pending for operator retry", userId, error);
    return false;
  }
}

/** Runs within the existing website process; queue survives restarts in PostgreSQL. */
export function startAccountMediaPurgeWorker(): () => void {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      const db = await getDb();
      if (!db) return;
      const jobs = await db.execute(sql`SELECT job."userId" FROM "account_media_purge_jobs" job JOIN "users" u ON u."id" = job."userId" WHERE job."completedAt" IS NULL AND u."deletedAt" IS NOT NULL ORDER BY job."createdAt" LIMIT 10`) as unknown as Array<{ userId: number }>;
      for (const job of jobs) await processAccountMediaPurge(job.userId);
    } catch (error) { console.error("[Account deletion] Retry worker unavailable", error); }
    finally { busy = false; }
  };
  void run();
  const timer = setInterval(() => void run(), 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
