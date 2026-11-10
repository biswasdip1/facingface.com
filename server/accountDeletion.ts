import { createHash } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";
export type DeletionTransaction = { execute: (query: SQL) => Promise<unknown> };
export type DeletionDatabase = { transaction: <T>(work: (tx: DeletionTransaction) => Promise<T>) => Promise<T> };

// Only these reviewed table names/columns may be used in dynamic SQL. No request
// chooses a table, column, target user, cascade, or shared conversation to delete.
export const SELF_DELETE_ROWS: ReadonlyArray<[string, string[]]> = [
  ["active_sessions", ["userId"]], ["passkeys", ["userId"]], ["totp_secrets", ["userId"]],
  ["webauthn_challenges", ["userId"]], ["phone_verifications", ["userId"]], ["password_reset_tokens", ["userId"]],
  ["push_subscriptions", ["userId"]], ["profile_photos", ["userId"]], ["cover_photos", ["userId"]],
  ["digital_member_cards", ["userId"]], ["feed_recommendation_settings", ["userId"]], ["feed_recommendation_hidden", ["userId"]],
  ["inactiveUserReminders", ["userId"]], ["bookmarks", ["userId"]], ["shop_saved", ["userId"]],
  ["likes", ["userId"]], ["emoji_reactions", ["userId"]], ["post_reactions", ["userId"]],
  ["comment_reactions", ["userId"]], ["post_shares", ["userId"]], ["poll_votes", ["userId"]],
  ["reel_likes", ["userId"]], ["reel_views", ["userId"]], ["story_views", ["viewerId"]], ["story_reactions", ["reactorId"]],
  ["message_reactions", ["userId"]], ["group_message_reactions", ["user_id"]],
  ["public_group_post_reaction_records", ["userId"]], ["public_group_post_saved_records", ["userId"]],
  ["follows", ["followerId"]], ["friend_requests", ["senderId"]],
  ["group_members", ["userId"]], ["public_group_members", ["userId"]], ["page_followers", ["userId"]], ["page_admins", ["userId"]],
  ["blocks", ["blockerId"]], ["profile_views", ["viewerUserId"]],
  ["call_signals", ["fromUserId"]],
];

/** Retain a non-login tombstone ID so others' comments/DMs and FK rows survive. */
export async function redactSelfAccount(database: DeletionDatabase, userId: number): Promise<void> {
  if (!Number.isInteger(userId) || userId < 1) throw new TRPCError({ code: "BAD_REQUEST" });
  await database.transaction(async (tx) => {
    const rows = await tx.execute(sql`SELECT "id", "openId", "deletedAt" FROM "users" WHERE "id" = ${userId} FOR UPDATE`) as Array<{ id: number; openId: string; deletedAt: Date | null }>;
    const user = rows[0];
    if (!user || user.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Account is unavailable." });
    // Never hide an outstanding provider subscription or pretend to cancel it.
    const subscriptionRows = await tx.execute(sql`SELECT "stripeSubscriptionId", "status" FROM "subscriptions" WHERE "userId" = ${userId} FOR UPDATE`) as Array<{ stripeSubscriptionId: string | null; status: string }>;
    if (subscriptionRows.some((row) => row.stripeSubscriptionId?.startsWith("sub_") && row.status !== "cancelled")) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cancel your paid subscription successfully before deleting your account." });
    }
    const existing = await tx.execute(sql`SELECT table_name AS "tableName" FROM information_schema.tables WHERE table_schema = 'public'`) as Array<{ tableName: string }>;
    const tables = new Set(existing.map((row) => row.tableName));
    for (const [table, ownerColumn] of [["org_pages", "ownerId"], ["public_groups", "createdBy"], ["group_conversations", "createdBy"]]) {
      if (!tables.has(table)) continue;
      const owned = await tx.execute(sql`SELECT 1 FROM ${sql.identifier(table)} WHERE ${sql.identifier(ownerColumn)} = ${userId} LIMIT 1`) as unknown[];
      if (owned.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Transfer ownership of your Pages and Groups before deleting your account so other members do not lose access." });
    }
    // Optional feature tables may legitimately not exist. Present-but-incompatible
    // tables cause an error and rollback, never a partial account deletion.
    for (const [table, columns] of SELF_DELETE_ROWS) {
      if (!tables.has(table)) continue;
      const condition = sql.join(columns.map((column) => sql`${sql.identifier(column)} = ${userId}`), sql` OR `);
      await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE ${condition}`);
    }
    const run = async (table: string, query: SQL) => { if (tables.has(table)) await tx.execute(query); };
    await run("posts", sql`UPDATE "posts" SET "text" = '[Deleted]', "mediaUrl" = NULL, "photo2Url" = NULL, "photo3Url" = NULL, "videoPosterUrl" = NULL, "audioUrl" = NULL, "audioName" = NULL, "docUrl" = NULL, "docName" = NULL, "linkUrl" = NULL, "linkTitle" = NULL, "linkDescription" = NULL, "linkImage" = NULL, "photo1Caption" = NULL, "photo2Caption" = NULL, "photo3Caption" = NULL, "photo1Alt" = NULL, "photo2Alt" = NULL, "photo3Alt" = NULL, "taggedPeople" = NULL, "feeling" = NULL, "checkInLocation" = NULL, "reshareComment" = NULL, "isFlagged" = true, "flagReason" = 'Account deleted', "scheduledAt" = NULL WHERE "authorId" = ${userId}`);
    await run("post_edits", sql`UPDATE "post_edits" SET "previousText" = NULL, "previousBgColor" = NULL WHERE "postId" IN (SELECT "id" FROM "posts" WHERE "authorId" = ${userId})`);
    await run("postEditHistory", sql`UPDATE "postEditHistory" SET "previousText" = NULL, "newText" = NULL WHERE "postId" IN (SELECT "id" FROM "posts" WHERE "authorId" = ${userId})`);
    await run("comments", sql`UPDATE "comments" SET "text" = '[Deleted]', "isFlagged" = true, "flagReason" = 'Account deleted' WHERE "authorId" = ${userId}`);
    await run("poll_options", sql`UPDATE "poll_options" SET "text" = '[Deleted]' WHERE "pollId" IN (SELECT p."id" FROM "polls" p JOIN "posts" post ON post."id" = p."postId" WHERE post."authorId" = ${userId})`);
    await run("polls", sql`UPDATE "polls" SET "question" = '[Deleted]', "expiresAt" = now() WHERE "postId" IN (SELECT "id" FROM "posts" WHERE "authorId" = ${userId})`);
    await run("messages", sql`UPDATE "messages" SET "text" = NULL, "fileUrl" = NULL, "fileName" = NULL, "fileSize" = NULL, "fileType" = NULL, "deletedAt" = now() WHERE "senderId" = ${userId}`);
    await run("group_messages", sql`UPDATE "group_messages" SET "content" = '[Deleted]' WHERE "senderId" = ${userId}`);
    for (const table of ["org_page_posts", "public_group_posts"]) {
      await run(table, sql`UPDATE ${sql.identifier(table)} SET "content" = '[Deleted]', "mediaUrl" = NULL, "photo2Url" = NULL, "photo3Url" = NULL, "photo1Caption" = NULL, "photo2Caption" = NULL, "photo3Caption" = NULL, "photo1Alt" = NULL, "photo2Alt" = NULL, "photo3Alt" = NULL, "videoPosterUrl" = NULL, "audioUrl" = NULL, "audioName" = NULL, "docUrl" = NULL, "docName" = NULL, "linkUrl" = NULL, "linkTitle" = NULL, "linkDescription" = NULL, "linkImage" = NULL WHERE "authorId" = ${userId}`);
    }
    await run("public_group_post_comment_records", sql`UPDATE "public_group_post_comment_records" SET "text" = '[Deleted]' WHERE "authorId" = ${userId}`);
    await run("reels", sql`UPDATE "reels" SET "videoUrl" = '', "thumbnailUrl" = NULL, "caption" = '[Deleted]', "hashtags" = NULL WHERE "authorId" = ${userId}`);
    await run("reel_comments", sql`UPDATE "reel_comments" SET "content" = '[Deleted]' WHERE "authorId" = ${userId}`);
    await run("stories", sql`UPDATE "stories" SET "mediaUrl" = '', "storageKey" = '', "caption" = NULL, "expiresAt" = now() WHERE "authorId" = ${userId}`);
    await run("story_highlight_items", sql`UPDATE "story_highlight_items" SET "mediaUrl" = '', "caption" = NULL WHERE "highlightId" IN (SELECT "id" FROM "story_highlights" WHERE "authorId" = ${userId})`);
    await run("story_highlights", sql`UPDATE "story_highlights" SET "title" = '[Deleted]', "coverUrl" = NULL WHERE "authorId" = ${userId}`);
    await run("shop_listings", sql`UPDATE "shop_listings" SET "title" = '[Deleted]', "description" = NULL, "mediaUrls" = '[]'::json, "location" = NULL, "lat" = NULL, "lng" = NULL, "contactEmail" = NULL, "contactPhone" = NULL, "status" = 'removed' WHERE "sellerId" = ${userId}`);
    await run("social_events", sql`UPDATE "social_events" SET "title" = '[Deleted]', "description" = NULL, "bannerUrl" = NULL, "location" = NULL WHERE "organizerId" = ${userId}`);
    await run("live_streams", sql`UPDATE "live_streams" SET "title" = '[Deleted]', "status" = 'ended', "endedAt" = now() WHERE "hostId" = ${userId}`);
    await run("social_event_invitations", sql`UPDATE "social_event_invitations" SET "status" = 'declined' WHERE "userId" = ${userId}`);
    await run("support_replies", sql`UPDATE "support_replies" SET "content" = '[Deleted]', "admin_name" = NULL WHERE "admin_id" = ${userId}`);
    await run("support_messages", sql`UPDATE "support_messages" SET "message" = '[Deleted]', "topic" = '[Deleted]', "phone" = NULL, "whatsapp" = NULL WHERE "userId" = ${userId}`);
    await run("content_reports", sql`UPDATE "content_reports" SET "description" = NULL WHERE "reporterId" = ${userId}`);
    await run("reports", sql`UPDATE "reports" SET "description" = NULL WHERE "reporterId" = ${userId}`);
    await run("admin_audit_log", sql`UPDATE "admin_audit_log" SET "actorName" = NULL, "targetUserName" = NULL, "metadata" = NULL WHERE "actorId" = ${userId}`);
    await run("admin_audit_log", sql`UPDATE "admin_audit_log" SET "targetUserName" = NULL WHERE "targetUserId" = ${userId}`);
    await run("adEvents", sql`UPDATE "adEvents" SET "userId" = NULL WHERE "userId" = ${userId}`);
    await run("subscriptions", sql`UPDATE "subscriptions" SET "stripeCustomerId" = NULL, "stripeSubscriptionId" = NULL, "status" = 'cancelled', "badgeGranted" = false, "tier" = NULL, "expiresAt" = NULL WHERE "userId" = ${userId}`);
    // Hash the old login identity before removing it. OAuth sync and stale JWTs
    // must not resurrect a deleted account. No email/raw openId is retained here.
    const identityHash = createHash("sha256").update(user.openId).digest("hex");
    await tx.execute(sql`INSERT INTO "deleted_account_identities" ("identityHash") VALUES (${identityHash}) ON CONFLICT DO NOTHING`);
    await tx.execute(sql`INSERT INTO "account_media_purge_jobs" ("userId") VALUES (${userId}) ON CONFLICT DO NOTHING`);
    await tx.execute(sql`UPDATE "users" SET "openId" = ${`deleted:${userId}`}, "name" = 'Deleted member', "email" = NULL, "passwordHash" = NULL, "verificationToken" = NULL, "emailVerified" = false, "loginMethod" = NULL, "role" = 'user', "bio" = NULL, "avatar" = NULL, "coverPhoto" = NULL, "hometown" = NULL, "currentLocation" = NULL, "currentRole" = NULL, "phone" = NULL, "phoneVerified" = false, "website" = NULL, "youtubeChannel" = NULL, "birthDay" = NULL, "birthMonth" = NULL, "hobby" = NULL, "isVerified" = false, "suspendedUntil" = NULL, "suspendReason" = NULL, "violationCount" = 0, "deletedAt" = now() WHERE "id" = ${userId}`);
  });
}
