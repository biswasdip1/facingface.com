import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { digitalMemberCards } from "../drizzle/schema";
import { getDb } from "./db";
import type { CardRecord } from "./memberCardPolicy";

let ready: Promise<void> | null = null;

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Member cards are temporarily unavailable. Please try again later.",
    });
  return db;
}

/** A separate optional table; never alter/reset users, posts or migration history. */
export async function ensureMemberCardStorage(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = await database();
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "digital_member_cards" (
          "userId" integer PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
          "memberNumber" varchar(19) NOT NULL UNIQUE,
          "shareToken" varchar(48) NOT NULL UNIQUE,
          "enabled" boolean NOT NULL DEFAULT false,
          "showName" boolean NOT NULL DEFAULT true,
          "showPhoto" boolean NOT NULL DEFAULT false,
          "appearance" varchar(10) NOT NULL DEFAULT 'classic',
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now()
        )
      `);
    })().catch(error => {
      ready = null;
      throw error;
    });
  }
  await ready;
}

export async function getOwnerMemberCard(
  userId: number
): Promise<CardRecord | null> {
  await ensureMemberCardStorage();
  const db = await database();
  const rows = await db
    .select()
    .from(digitalMemberCards)
    .where(eq(digitalMemberCards.userId, userId))
    .limit(1);
  return (rows[0] as CardRecord | undefined) ?? null;
}

export async function getSharedMemberCard(
  shareToken: string
): Promise<CardRecord | null> {
  const db = await database();
  try {
    // Public reads do not create tables or records. A pre-feature database is a
    // normal unavailable-card response until an owner first opens the feature.
    const rows = await db
      .select()
      .from(digitalMemberCards)
      .where(
        and(
          eq(digitalMemberCards.shareToken, shareToken),
          eq(digitalMemberCards.enabled, true)
        )
      )
      .limit(1);
    return (rows[0] as CardRecord | undefined) ?? null;
  } catch (error: any) {
    if (error?.code === "42P01" || error?.cause?.code === "42P01") return null;
    throw error;
  }
}

export async function saveOwnerMemberCard(
  userId: number,
  settings: {
    enabled: boolean;
    showName: boolean;
    showPhoto: boolean;
    appearance: "classic" | "dark";
  }
): Promise<CardRecord> {
  await ensureMemberCardStorage();
  const db = await database();
  const shareToken = randomBytes(24).toString("hex");
  const rows = await db
    .insert(digitalMemberCards)
    .values({
      userId,
      memberNumber: `FF-${randomBytes(8).toString("hex").toUpperCase()}`,
      shareToken,
      ...settings,
    })
    .onConflictDoUpdate({
      target: digitalMemberCards.userId,
      set: {
        ...settings,
        // Disabling rotates atomically: an old QR must never become active again
        // merely because the member later re-enables sharing.
        shareToken: settings.enabled
          ? sql`${digitalMemberCards.shareToken}`
          : shareToken,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0] as CardRecord;
}

export async function replaceMemberCardLink(
  userId: number
): Promise<CardRecord | null> {
  await ensureMemberCardStorage();
  const db = await database();
  const rows = await db
    .update(digitalMemberCards)
    .set({ shareToken: randomBytes(24).toString("hex"), updatedAt: new Date() })
    .where(eq(digitalMemberCards.userId, userId))
    .returning();
  return (rows[0] as CardRecord | undefined) ?? null;
}
