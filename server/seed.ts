/**
 * Optional one-time administrator seeding. Disabled by default; no built-in
 * administrator credentials are shipped. Existing accounts are never changed.
 */
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { users, mediaLimits } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const SEED_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
const SEED_NAME = process.env.SEED_ADMIN_NAME?.trim() || "FacingFace Admin";
const SEED_OPEN_ID = "biswasdip-owner-seed";

/**
 * Seed default media limits if the table is empty.
 * video_max_mb is set to 50 MB and video_max_seconds to 300 (5 min).
 * Super admins can override these values from the admin panel.
 */
export async function seedMediaLimits(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const defaults: Array<{ limitKey: string; value: number }> = [
      { limitKey: "photo_max_mb", value: 25 },
      { limitKey: "video_max_mb", value: 50 },
      { limitKey: "video_max_seconds", value: 300 },
      { limitKey: "audio_max_mb", value: 5 },
      { limitKey: "audio_max_seconds", value: 360 },
      { limitKey: "doc_max_mb", value: 5 },
    ];

    for (const row of defaults) {
      await db
        .insert(mediaLimits)
        .values({ limitKey: row.limitKey, value: row.value })
        .onConflictDoNothing();
    }
    console.log("[Seed] Media limits seeded.");
  } catch (err) {
    console.error("[Seed] Failed to seed media limits:", err);
  }
}

export async function seedSuperAdmin(): Promise<void> {
  if (process.env.SEED_ADMIN_ENABLED !== "true") return;
  if (!SEED_EMAIL || SEED_PASSWORD.length < 16) {
    console.warn("[Seed] Admin creation skipped: explicit email and a unique 16+ character secret are required.");
    return;
  }
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Seed] Database not available, skipping seed.");
      return;
    }

    // Check if the seed account already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, SEED_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      console.log("[Seed] Super admin already exists, skipping.");
      return;
    }

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

    await db.insert(users).values({
      openId: SEED_OPEN_ID,
      name: SEED_NAME,
      email: SEED_EMAIL,
      passwordHash,
      emailVerified: true,
      loginMethod: "email",
      role: "super_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }).onConflictDoNothing();

    console.log(`[Seed] Super admin created: ${SEED_EMAIL}`);
  } catch (err) {
    // Non-fatal: log and continue — the app should still start
    console.error("[Seed] Failed to seed super admin:", err);
  }
}

/** Run all seeds — called once at server startup. */
export async function runAllSeeds(): Promise<void> {
  await seedSuperAdmin();
  await seedMediaLimits();
}
