import { orgPagePosts, OrgPagePost, InsertOrgPagePost, commentReactions } from "./../drizzle/schema";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, ne, notInArray, sql } from "drizzle-orm";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  Comment,
  Follow,
  InsertComment,
  InsertFollow,
  InsertLike,
  InsertNotification,
  InsertPost,
  InsertUser,
  Like,
  Notification,
  Post,
  User,
  comments,
  follows,
  likes,
  notifications,
  posts,
  users,
  polls,
  pollOptions,
  pollVotes,
  InsertPoll,
  InsertPollOption,
  InsertPollVote,
  Poll,
  PollOption,
  PollVote,
  liveStreams,
  LiveStream,
  InsertLiveStream,
  hashtags,
  Hashtag,
  InsertHashtag,
  passkeys,
  Passkey,
  webauthnChallenges,
  WebauthnChallenge,
  phoneVerifications,
  PhoneVerification,
  totpSecrets,
  TotpSecret,
  activeSessions,
  ActiveSession,
  groupConversations,
  GroupConversation,
  groupMembers,
  GroupMember,
  groupMessages,
  GroupMessage,
  callRooms,
  CallRoom,
  callParticipants,
  CallParticipant,
  callSignals,
  CallSignal,
  profilePhotos,
  ProfilePhoto,
  coverPhotos,
  CoverPhoto,
  subscriptions,
  Subscription,
  InsertSubscription,
  orgPages,
  OrgPage,
  InsertOrgPage,
  pageFollowers,
  pageAdmins,
  publicGroups,
  PublicGroup,
  InsertPublicGroup,
  publicGroupMembers,
  PublicGroupMember,
  publicGroupPosts,
  PublicGroupPost,
  InsertPublicGroupPost,
  stories,
  Story,
  InsertStory,
  storyViews,
  bookmarks,
  Bookmark,
  InsertBookmark,
  postReactions,
  PostReaction,
  InsertPostReaction,
  postEdits,
  PostEdit,
  InsertPostEdit,
  postEditHistory,
  PostEditHistory,
  InsertPostEditHistory,
  adminAuditLog,
  AdminAuditLog,
  InsertAdminAuditLog,
  shopListings,
  ShopListing,
  InsertShopListing,
  shopSaved,
  ShopSaved,
  mediaLimits,
  MediaLimit,
  contentReports,
  ContentReport,
  callHistory,
  pushSubscriptions,
  messageReactions,
  groupMessageReactions,
  MessageReaction,
  InsertMessageReaction,
  blocks,
  Block,
  InsertBlock,
  feedAds,
  FeedAd,
  InsertFeedAd,
  newsFeedSources,
  NewsFeedSource,
  InsertNewsFeedSource,
  adEvents,
  AdEvent,
  InsertAdEvent,
  inactiveUserReminders,
  InactiveUserReminder,
  InsertInactiveUserReminder,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;



// ─── Chat Encryption ──────────────────────────────────────────────────────────
// New direct and group chat text is encrypted before it is stored in PostgreSQL.
// Existing plaintext messages remain readable for backward compatibility.
const CHAT_ENCRYPTION_PREFIX = "ffenc:v1:";

function getChatEncryptionKey(): Buffer | null {
  const secret = process.env.CHAT_ENCRYPTION_KEY || process.env.JWT_SECRET || process.env.SESSION_SECRET || "";
  if (!secret || secret.length < 16) return null;
  return createHash("sha256").update(secret).digest();
}

function encryptChatText(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  if (value.startsWith(CHAT_ENCRYPTION_PREFIX)) return value;
  const key = getChatEncryptionKey();
  if (!key) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CHAT_ENCRYPTION_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

function decryptChatText(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  if (!value.startsWith(CHAT_ENCRYPTION_PREFIX)) return value;
  const key = getChatEncryptionKey();
  if (!key) return "🔒 Encrypted message";
  try {
    const payload = Buffer.from(value.slice(CHAT_ENCRYPTION_PREFIX.length), "base64url");
    if (payload.length < 29) return "🔒 Encrypted message";
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch (error) {
    console.warn("[ChatEncryption] Failed to decrypt chat text", error);
    return "🔒 Encrypted message";
  }
}

function decryptDirectMessageRow<T extends { text?: string | null }>(row: T): T {
  return { ...row, text: decryptChatText(row.text) ?? row.text };
}

function decryptGroupMessageRow<T extends { content?: string | null }>(row: T): T {
  return { ...row, content: decryptChatText(row.content) ?? row.content };
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false }, max: 10, idle_timeout: 30, connect_timeout: 30 });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * The existing Render database intentionally skips the old global migration
 * journal because its history contains an unrelated duplicate enum. This
 * narrow, idempotent compatibility check creates only the reminder history
 * table introduced after that database was first deployed. It never alters
 * users, posts, media, Pages, Groups, or any existing row.
 */
export async function ensureInactiveReminderStorage(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[InactiveUserReminder] Reminder history unavailable: database is not connected.");
    return false;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "inactiveUserReminders" (
        "id" serial PRIMARY KEY NOT NULL,
        "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "emailSentAt" timestamp DEFAULT now() NOT NULL,
        "lastActivityAt" timestamp,
        "reminderType" varchar(50) DEFAULT '14_days_inactive' NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "inactiveUserReminders_userId_idx"
      ON "inactiveUserReminders" ("userId")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "inactiveUserReminders_emailSentAt_idx"
      ON "inactiveUserReminders" ("emailSentAt")
    `);
    console.info("[InactiveUserReminder] Reminder history storage is ready.");
    return true;
  } catch (error) {
    console.error("[InactiveUserReminder] Could not prepare reminder history storage:", error);
    return false;
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "super_admin";
    updateSet.role = "super_admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

function hydrateAuthUser(row: {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  role?: User["role"] | null;
  bio?: string | null;
  avatar?: string | null;
  coverPhoto?: string | null;
  hometown?: string | null;
  currentLocation?: string | null;
  currentRole?: string | null;
  phone?: string | null;
  phoneVerified?: boolean | null;
  website?: string | null;
  youtubeChannel?: string | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  hobby?: string | null;
  coverCropY?: number | null;
  suspendedUntil?: Date | null;
  suspendReason?: string | null;
  violationCount?: number | null;
  isVerified?: boolean | null;
  lastCallsSeenAt?: Date | null;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}): User {
  return {
    id: row.id,
    openId: row.openId,
    name: row.name,
    email: row.email,
    passwordHash: null,
    emailVerified: row.emailVerified,
    verificationToken: null,
    loginMethod: "email",
    role: row.role ?? "user",
    bio: row.bio ?? null,
    avatar: row.avatar ?? null,
    coverPhoto: row.coverPhoto ?? null,
    hometown: row.hometown ?? null,
    currentLocation: row.currentLocation ?? null,
    currentRole: row.currentRole ?? null,
    phone: row.phone ?? null,
    phoneVerified: row.phoneVerified ?? false,
    website: row.website ?? null,
    youtubeChannel: row.youtubeChannel ?? null,
    birthDay: row.birthDay ?? null,
    birthMonth: row.birthMonth ?? null,
    hobby: row.hobby ?? null,
    coverCropY: row.coverCropY ?? 50,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSignedIn: row.lastSignedIn,
    suspendedUntil: row.suspendedUntil ?? null,
    suspendReason: row.suspendReason ?? null,
    violationCount: row.violationCount ?? 0,
    isVerified: row.isVerified ?? false,
    lastCallsSeenAt: row.lastCallsSeenAt ?? row.lastSignedIn,
    lastSeenAt: row.lastSeenAt ?? row.lastSignedIn,
  } as User;
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Auth readback must stay migration-tolerant, but it must not discard the
  // stable user fields that drive profile photos, cover photos, verification,
  // and admin navigation. Select the base PostgreSQL profile columns here and
  // let hydrateAuthUser provide defaults only when a value is genuinely absent.
  const result = await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      role: users.role,
      bio: users.bio,
      avatar: users.avatar,
      coverPhoto: users.coverPhoto,
      hometown: users.hometown,
      currentLocation: users.currentLocation,
      currentRole: users.currentRole,
      phone: users.phone,
      phoneVerified: users.phoneVerified,
      website: users.website,
      youtubeChannel: users.youtubeChannel,
      coverCropY: users.coverCropY,
      suspendedUntil: users.suspendedUntil,
      suspendReason: users.suspendReason,
      violationCount: users.violationCount,
      isVerified: users.isVerified,
      lastCallsSeenAt: users.lastCallsSeenAt,
      lastSeenAt: users.lastSeenAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  const user = result[0];
  return user ? hydrateAuthUser(user) : undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      role: users.role,
      bio: users.bio,
      avatar: users.avatar,
      coverPhoto: users.coverPhoto,
      hometown: users.hometown,
      currentLocation: users.currentLocation,
      currentRole: users.currentRole,
      phone: users.phone,
      phoneVerified: users.phoneVerified,
      website: users.website,
      youtubeChannel: users.youtubeChannel,
      coverCropY: users.coverCropY,
      suspendedUntil: users.suspendedUntil,
      suspendReason: users.suspendReason,
      violationCount: users.violationCount,
      isVerified: users.isVerified,
      lastCallsSeenAt: users.lastCallsSeenAt,
      lastSeenAt: users.lastSeenAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  const user = result[0];
  return user ? hydrateAuthUser(user) : undefined;
}

export async function updateUserProfile(
  id: number,
  data: {
    bio?: string | null;
    avatar?: string | null;
    coverPhoto?: string | null;
    name?: string | null;
    hometown?: string | null;
    currentLocation?: string | null;
    currentRole?: string | null;
    phone?: string | null;
    website?: string | null;
    youtubeChannel?: string | null;
    birthDay?: number | null;
    birthMonth?: number | null;
    hobby?: string | null;
    coverCropY?: number | null;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function searchUsers(query: string, limit = 10): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.name}) LIKE ${`%${query.toLowerCase()}%`}`)
    .limit(limit);
  return result;
}

export async function searchPosts(query: string, limit = 20): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(posts)
    .where(and(
      sql`LOWER(${posts.text}) LIKE ${`%${query.toLowerCase()}%`}`,
      eq(posts.isFlagged, false)
    ))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return result;
}
// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(data: InsertPost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data).returning({ id: posts.id });
  return result[0].id;
}

export async function getPostById(id: number): Promise<Post | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result[0];
}

export async function getBlockedUserIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  // Users that this user has blocked OR that have blocked this user
  const rows = await db
    .select({ id: blocks.blockerId })
    .from(blocks)
    .where(eq(blocks.blockedId, userId))
    .union(
      db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId))
    );
  return rows.map((r) => r.id);
}

export async function getFeedPosts(limit = 20, offset = 0, excludeUserIds: number[] = []): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  // Page posts remain regular posts so existing comments and reactions still
  // work, but the page:<id> marker keeps them out of the personal Feed.
  const baseWhere = and(
    eq(posts.isFlagged, false),
    sql`(${posts.linkSiteName} IS NULL OR ${posts.linkSiteName} NOT LIKE 'page:%')`,
  );
  const where = excludeUserIds.length > 0
    ? and(baseWhere, notInArray(posts.authorId, excludeUserIds))
    : baseWhere;
  return db
    .select()
    .from(posts)
    .where(where)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getPostsByUser(authorId: number, limit = 20, offset = 0, excludeViewerIds: number[] = []): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  // If the author is in the viewer's block list (or vice versa), return empty
  if (excludeViewerIds.includes(authorId)) return [];
  return db
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, authorId), eq(posts.isFlagged, false)))
    .orderBy(desc(posts.isPinned), desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function deletePost(id: number, authorId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const conditions = [eq(posts.id, id)];
  if (authorId !== undefined) conditions.push(eq(posts.authorId, authorId));
  await db.delete(posts).where(and(...conditions));
}

export async function pinPost(postId: number, authorId: number, pin: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Unpin all posts by this author first, then pin the selected one
  if (pin) {
    await db.update(posts).set({ isPinned: false }).where(eq(posts.authorId, authorId));
    await db.update(posts).set({ isPinned: true }).where(and(eq(posts.id, postId), eq(posts.authorId, authorId)));
  } else {
    await db.update(posts).set({ isPinned: false }).where(and(eq(posts.id, postId), eq(posts.authorId, authorId)));
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function createComment(data: InsertComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(comments).values(data).returning({ id: comments.id });
  return result[0].id;
}

export async function getCommentsByPost(postId: number): Promise<Comment[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.isFlagged, false)))
    .orderBy(desc(comments.createdAt));
}

export async function deleteComment(id: number, authorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(and(eq(comments.id, id), eq(comments.authorId, authorId)));
}

/** Removes one specific comment after an authenticated administrator has reviewed its report. */
export async function adminDeleteComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(comments).where(eq(comments.id, id));
}

export async function getCommentById(id: number): Promise<Comment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  return result[0];
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function getLike(
  userId: number,
  targetId: number,
  targetType: "post" | "comment"
): Promise<Like | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(likes)
    .where(
      and(eq(likes.userId, userId), eq(likes.targetId, targetId), eq(likes.targetType, targetType))
    )
    .limit(1);
  return result[0];
}

export async function addLike(data: InsertLike): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // The legacy likes table does not have a database-level unique constraint in
  // older deployments, so make this operation idempotent in application code.
  await db
    .delete(likes)
    .where(and(eq(likes.userId, data.userId), eq(likes.targetId, data.targetId), eq(likes.targetType, data.targetType)));
  await db.insert(likes).values(data);
}

export async function removeLike(
  userId: number,
  targetId: number,
  targetType: "post" | "comment"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(likes)
    .where(
      and(eq(likes.userId, userId), eq(likes.targetId, targetId), eq(likes.targetType, targetType))
    );
}

export async function getLikeCount(
  targetId: number,
  targetType: "post" | "comment"
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(distinct ${likes.userId})` })
    .from(likes)
    .where(and(eq(likes.targetId, targetId), eq(likes.targetType, targetType)));
  return Number(result[0]?.count ?? 0);
}

export async function getLikeCounts(
  targetIds: number[],
  targetType: "post" | "comment"
): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || targetIds.length === 0) return {};
  const result = await db
    .select({ targetId: likes.targetId, count: sql<number>`count(distinct ${likes.userId})` })
    .from(likes)
    .where(and(inArray(likes.targetId, targetIds), eq(likes.targetType, targetType)))
    .groupBy(likes.targetId);
  const map: Record<number, number> = {};
  for (const row of result) map[row.targetId] = Number(row.count);
  return map;
}

export async function getCommentCounts(postIds: number[]): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || postIds.length === 0) return {};
  const result = await db
    .select({ postId: comments.postId, count: sql<number>`count(*)` })
    .from(comments)
    .where(and(inArray(comments.postId, postIds), eq(comments.isFlagged, false)))
    .groupBy(comments.postId);
  const map: Record<number, number> = {};
  for (const row of result) map[row.postId] = Number(row.count);
  return map;
}

export async function getUserLikedIds(
  userId: number,
  targetIds: number[],
  targetType: "post" | "comment"
): Promise<number[]> {
  const db = await getDb();
  if (!db || targetIds.length === 0) return [];
  const result = await db
    .select({ targetId: likes.targetId })
    .from(likes)
    .where(
      and(eq(likes.userId, userId), inArray(likes.targetId, targetIds), eq(likes.targetType, targetType))
    );
  return Array.from(new Set(result.map((r) => r.targetId)));
}

// ─── Follows ──────────────────────────────────────────────────────────────────

export async function getFollow(
  followerId: number,
  followingId: number
): Promise<Follow | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return result[0];
}

export async function addFollow(data: InsertFollow): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(follows).values(data);
}

export async function removeFollow(followerId: number, followingId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
}

export async function getFollowerCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followingId, userId));
  return Number(result[0]?.count ?? 0);
}

export async function getFollowingCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followerId, userId));
  return Number(result[0]?.count ?? 0);
}

export async function getFollowers(userId: number): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  const followerRows = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(eq(follows.followingId, userId));
  if (followerRows.length === 0) return [];
  const ids = followerRows.map((r) => r.followerId);
  return db.select().from(users).where(inArray(users.id, ids));
}

export async function getFollowing(userId: number): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  const followingRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));
  if (followingRows.length === 0) return [];
  const ids = followingRows.map((r) => r.followingId);
  return db.select().from(users).where(inArray(users.id, ids));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotifications(userId: number, limit = 30): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

export async function markNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function getPostCount(authorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(eq(posts.authorId, authorId), eq(posts.isFlagged, false)));
  return Number(result[0]?.count ?? 0);
}

// ─── Polls ────────────────────────────────────────────────────────────────────
export async function createPoll(data: InsertPoll): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(polls).values(data).returning({ id: polls.id });
  return result[0].id;
}

export async function createPollOptions(options: InsertPollOption[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pollOptions).values(options);
}

export async function getPollByPostId(postId: number): Promise<Poll | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(polls).where(eq(polls.postId, postId)).limit(1);
  return result[0];
}

export async function getPollOptions(pollId: number): Promise<PollOption[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(pollOptions.displayOrder);
}

export async function getPollVoteCounts(pollId: number): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({ optionId: pollVotes.optionId, count: sql<number>`count(*)` })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, pollId))
    .groupBy(pollVotes.optionId);
  const result: Record<number, number> = {};
  for (const row of rows) {
    result[row.optionId] = Number(row.count);
  }
  return result;
}

export async function getUserPollVote(pollId: number, userId: number): Promise<PollVote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(pollVotes)
    .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
    .limit(1);
  return result[0];
}

export async function upsertPollVote(pollId: number, optionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete existing vote then insert new one (MySQL upsert on composite unique key)
  await db
    .delete(pollVotes)
    .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
  await db.insert(pollVotes).values({ pollId, optionId, userId });
}

export async function getPollById(pollId: number): Promise<Poll | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
  return result[0];
}

// ─── Live Streams ─────────────────────────────────────────────────────────────
export async function createLiveStream(hostId: number, title?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(liveStreams).values({ hostId, title: title ?? null }).returning({ id: liveStreams.id });
  return result[0].id;
}

export async function endLiveStream(streamId: number, hostId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(liveStreams)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(liveStreams.id, streamId), eq(liveStreams.hostId, hostId)));
}

export async function getLiveStream(streamId: number): Promise<LiveStream | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId)).limit(1);
  return result[0];
}

export async function getActiveLiveStreams(): Promise<LiveStream[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(liveStreams)
    .where(eq(liveStreams.status, "active"))
    .orderBy(desc(liveStreams.startedAt));
}

export async function updateViewerCount(streamId: number, delta: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(liveStreams)
    .set({ viewerCount: sql`GREATEST(${liveStreams.viewerCount} + ${delta}, 0)` })
    .where(eq(liveStreams.id, streamId));
}

// ─── Emoji Reactions ──────────────────────────────────────────────────────────

import { emojiReactions, postShares, EmojiReaction, InsertEmojiReaction } from "../drizzle/schema";

export async function getEmojiReaction(
  userId: number,
  targetId: number,
  targetType: "post" | "comment",
  emoji: string
): Promise<EmojiReaction | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(emojiReactions)
    .where(
      and(
        eq(emojiReactions.userId, userId),
        eq(emojiReactions.targetId, targetId),
        eq(emojiReactions.targetType, targetType),
        eq(emojiReactions.emoji, emoji)
      )
    )
    .limit(1);
  return result[0];
}

export async function addEmojiReaction(data: InsertEmojiReaction): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(emojiReactions).values(data);
}

export async function removeEmojiReaction(
  userId: number,
  targetId: number,
  targetType: "post" | "comment",
  emoji: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(emojiReactions)
    .where(
      and(
        eq(emojiReactions.userId, userId),
        eq(emojiReactions.targetId, targetId),
        eq(emojiReactions.targetType, targetType),
        eq(emojiReactions.emoji, emoji)
      )
    );
}

/** Returns { emoji -> count } for a target, plus the current user's reacted emojis */
export async function getEmojiReactionCounts(
  targetId: number,
  targetType: "post" | "comment"
): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({ emoji: emojiReactions.emoji, count: sql<number>`count(*)` })
    .from(emojiReactions)
    .where(
      and(eq(emojiReactions.targetId, targetId), eq(emojiReactions.targetType, targetType))
    )
    .groupBy(emojiReactions.emoji);
  const map: Record<string, number> = {};
  for (const row of rows) map[row.emoji] = Number(row.count);
  return map;
}

export async function getUserEmojiReactions(
  userId: number,
  targetId: number,
  targetType: "post" | "comment"
): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ emoji: emojiReactions.emoji })
    .from(emojiReactions)
    .where(
      and(
        eq(emojiReactions.userId, userId),
        eq(emojiReactions.targetId, targetId),
        eq(emojiReactions.targetType, targetType)
      )
    );
  return rows.map((r) => r.emoji);
}

// Batch version for feed
export async function getEmojiReactionCountsBatch(
  targetIds: number[],
  targetType: "post" | "comment"
): Promise<Record<number, Record<string, number>>> {
  const db = await getDb();
  if (!db || targetIds.length === 0) return {};
  const rows = await db
    .select({
      targetId: emojiReactions.targetId,
      emoji: emojiReactions.emoji,
      count: sql<number>`count(*)`,
    })
    .from(emojiReactions)
    .where(
      and(inArray(emojiReactions.targetId, targetIds), eq(emojiReactions.targetType, targetType))
    )
    .groupBy(emojiReactions.targetId, emojiReactions.emoji);
  const map: Record<number, Record<string, number>> = {};
  for (const row of rows) {
    if (!map[row.targetId]) map[row.targetId] = {};
    map[row.targetId][row.emoji] = Number(row.count);
  }
  return map;
}

export async function getUserEmojiReactionsBatch(
  userId: number,
  targetIds: number[],
  targetType: "post" | "comment"
): Promise<Record<number, string[]>> {
  const db = await getDb();
  if (!db || targetIds.length === 0) return {};
  const rows = await db
    .select({ targetId: emojiReactions.targetId, emoji: emojiReactions.emoji })
    .from(emojiReactions)
    .where(
      and(
        eq(emojiReactions.userId, userId),
        inArray(emojiReactions.targetId, targetIds),
        eq(emojiReactions.targetType, targetType)
      )
    );
  const map: Record<number, string[]> = {};
  for (const row of rows) {
    if (!map[row.targetId]) map[row.targetId] = [];
    map[row.targetId].push(row.emoji);
  }
  return map;
}

// ─── Post Shares ──────────────────────────────────────────────────────────────

export async function recordShare(postId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(postShares).values({ postId, userId });
}

export async function getShareCounts(postIds: number[]): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || postIds.length === 0) return {};
  const rows = await db
    .select({ postId: postShares.postId, count: sql<number>`count(*)` })
    .from(postShares)
    .where(inArray(postShares.postId, postIds))
    .groupBy(postShares.postId);
  const map: Record<number, number> = {};
  for (const row of rows) map[row.postId] = Number(row.count);
  return map;
}

// ─── Reshare Counts ───────────────────────────────────────────────────────────

/** Count how many reshare posts reference each original post id */
export async function getReshareCountsBatch(postIds: number[]): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || postIds.length === 0) return {};
  const rows = await db
    .select({ resharedFromId: posts.resharedFromId, count: sql<number>`count(*)` })
    .from(posts)
    .where(inArray(posts.resharedFromId, postIds))
    .groupBy(posts.resharedFromId);
  const map: Record<number, number> = {};
  for (const row of rows) {
    if (row.resharedFromId != null) map[row.resharedFromId] = Number(row.count);
  }
  return map;
}

// ─── Daily Upload Quota ───────────────────────────────────────────────────────

export const DAILY_LIMITS = {
  video: 2,
  photo: 3,
  audio: 12,
  doc: 2,
  poll: 2,
  live: 3,
};

export type QuotaType = keyof typeof DAILY_LIMITS;

/**
 * Count posts by a user of a given media type created in the last 24 hours.
 * mediaType: "video" | "photo" | "audio" | "doc" | "poll"
 */
export async function countUserPostsByTypeInWindow(
  userId: number,
  mediaType: "video" | "photo" | "audio" | "doc" | "poll",
  windowMs = 24 * 60 * 60 * 1000
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowMs);

  let whereClause;
  if (mediaType === "video") {
    whereClause = and(eq(posts.authorId, userId), eq(posts.mediaType, "video"), gte(posts.createdAt, since));
  } else if (mediaType === "photo") {
    whereClause = and(eq(posts.authorId, userId), eq(posts.mediaType, "image"), gte(posts.createdAt, since));
  } else if (mediaType === "audio") {
    whereClause = and(eq(posts.authorId, userId), isNotNull(posts.audioUrl), gte(posts.createdAt, since));
  } else {
    // doc
    whereClause = and(eq(posts.authorId, userId), isNotNull(posts.docUrl), gte(posts.createdAt, since));
  }

  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(whereClause);
  return Number(rows[0]?.count ?? 0);
}

/**
 * Get the oldest post of a given type in the 24h window — used to compute exact quota reset time.
 */
export async function getOldestPostInWindow(
  userId: number,
  mediaType: "video" | "photo" | "audio" | "doc" | "poll",
  windowMs = 24 * 60 * 60 * 1000
): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const since = new Date(Date.now() - windowMs);
  let whereClause;
  if (mediaType === "video") {
    whereClause = and(eq(posts.authorId, userId), eq(posts.mediaType, "video"), gte(posts.createdAt, since));
  } else if (mediaType === "photo") {
    whereClause = and(eq(posts.authorId, userId), eq(posts.mediaType, "image"), gte(posts.createdAt, since));
  } else if (mediaType === "audio") {
    whereClause = and(eq(posts.authorId, userId), isNotNull(posts.audioUrl), gte(posts.createdAt, since));
  } else {
    whereClause = and(eq(posts.authorId, userId), isNotNull(posts.docUrl), gte(posts.createdAt, since));
  }
  const rows = await db
    .select({ createdAt: posts.createdAt })
    .from(posts)
    .where(whereClause)
    .orderBy(asc(posts.createdAt))
    .limit(1);
  return rows[0]?.createdAt ?? null;
}

/**
 * Get the oldest live stream in the 24h window.
 */
export async function getOldestLiveInWindow(
  userId: number,
  windowMs = 24 * 60 * 60 * 1000
): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const since = new Date(Date.now() - windowMs);
  const rows = await db
    .select({ startedAt: liveStreams.startedAt })
    .from(liveStreams)
    .where(and(eq(liveStreams.hostId, userId), gte(liveStreams.startedAt, since)))
    .orderBy(asc(liveStreams.startedAt))
    .limit(1);
  return rows[0]?.startedAt ?? null;
}

/**
 * Count live streams started by a user in the last 24 hours.
 */
export async function countUserLiveStreamsInWindow(
  userId: number,
  windowMs = 24 * 60 * 60 * 1000
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowMs);
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(liveStreams)
    .where(and(eq(liveStreams.hostId, userId), gte(liveStreams.startedAt, since)));
  return Number(rows[0]?.count ?? 0);
}

/**
 * Return remaining quota for each media type for a user in the last 24 hours.
 * Daily limits are read from the media_limits DB table (with DAILY_LIMITS as fallback).
 * Verified members use the _verified_daily override keys if set.
 * Also returns resetAt (ms timestamp) for each type when quota is exhausted.
 */
export async function getUserDailyQuota(
  userId: number,
  isVerified = false
): Promise<{
  video: number; photo: number; audio: number; doc: number; poll: number; live: number;
  resetAt: { video: number | null; photo: number | null; audio: number | null; doc: number | null; poll: number | null; live: number | null };
}> {
  const WINDOW = 24 * 60 * 60 * 1000;
  const [video, photo, audio, doc, poll, live, dbLimits, oldestVideo, oldestPhoto, oldestAudio, oldestDoc, oldestPoll, oldestLive] = await Promise.all([
    countUserPostsByTypeInWindow(userId, "video"),
    countUserPostsByTypeInWindow(userId, "photo"),
    countUserPostsByTypeInWindow(userId, "audio"),
    countUserPostsByTypeInWindow(userId, "doc"),
    countUserPostsByTypeInWindow(userId, "poll"),
    countUserLiveStreamsInWindow(userId),
    getMediaLimits(),
    getOldestPostInWindow(userId, "video"),
    getOldestPostInWindow(userId, "photo"),
    getOldestPostInWindow(userId, "audio"),
    getOldestPostInWindow(userId, "doc"),
    getOldestPostInWindow(userId, "poll"),
    getOldestLiveInWindow(userId),
  ]);

  // Pick verified override if user is verified and override exists
  const pick = (baseKey: string, verifiedKey: string, fallback: number) => {
    if (isVerified && dbLimits[verifiedKey] != null) return dbLimits[verifiedKey];
    return dbLimits[baseKey] ?? fallback;
  };
  const videoLimit = pick("video_daily_limit", "video_verified_daily", DAILY_LIMITS.video);
  const photoLimit = pick("photo_daily_limit", "photo_verified_daily", DAILY_LIMITS.photo);
  const audioLimit = pick("audio_daily_limit", "audio_verified_daily", DAILY_LIMITS.audio);
  const docLimit = pick("doc_daily_limit", "doc_verified_daily", DAILY_LIMITS.doc);
  const pollLimit = pick("poll_daily_limit", "poll_verified_daily", DAILY_LIMITS.poll);
  const liveLimit = pick("live_daily_limit", "live_verified_daily", DAILY_LIMITS.live);

  // resetAt = oldest post time + 24h (only meaningful when quota is 0)
  const toResetAt = (oldest: Date | null) => oldest ? oldest.getTime() + WINDOW : null;

  return {
    video: Math.max(0, videoLimit - video),
    photo: Math.max(0, photoLimit - photo),
    audio: Math.max(0, audioLimit - audio),
    doc: Math.max(0, docLimit - doc),
    poll: Math.max(0, pollLimit - poll),
    live: Math.max(0, liveLimit - live),
    resetAt: {
      video: video >= videoLimit ? toResetAt(oldestVideo) : null,
      photo: photo >= photoLimit ? toResetAt(oldestPhoto) : null,
      audio: audio >= audioLimit ? toResetAt(oldestAudio) : null,
      doc: doc >= docLimit ? toResetAt(oldestDoc) : null,
      poll: poll >= pollLimit ? toResetAt(oldestPoll) : null,
      live: live >= liveLimit ? toResetAt(oldestLive) : null,
    },
  };
}

// ─── Email/Password Auth Helpers ─────────────────────────────────────────────
type EmailAuthUser = Pick<User, "id" | "openId" | "name" | "email" | "passwordHash" | "emailVerified">;

export async function getUserByEmail(email: string): Promise<EmailAuthUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Keep login independent from optional profile columns. This prevents email
  // login from failing during deployments where new nullable profile fields
  // have not been migrated yet, while still returning every field required for
  // password checks, 2FA, session creation, and password reset emails.
  const result = await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
}

export async function createEmailUser(data: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
}

export async function updateUserPasswordHash(id: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

export async function setVerificationToken(userId: number, token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ verificationToken: token, emailVerified: false }).where(eq(users.id, userId));
}

export async function getUserByVerificationToken(token: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
  return result[0];
}

export async function markEmailVerified(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerified: true, verificationToken: null }).where(eq(users.id, userId));
}

// ─── Suspension & Violation helpers ──────────────────────────────────────────

export async function incrementUserViolation(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await db.update(users)
    .set({ violationCount: sql`${users.violationCount} + 1` })
    .where(eq(users.id, userId));
  const result = await db.select({ violationCount: users.violationCount }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.violationCount ?? 1;
}

export async function suspendUser(userId: number, until: Date, reason: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ suspendedUntil: until, suspendReason: reason }).where(eq(users.id, userId));
}

export async function isUserSuspended(userId: number): Promise<{ suspended: boolean; until?: Date; reason?: string }> {
  const db = await getDb();
  if (!db) return { suspended: false };
  const result = await db.select({ suspendedUntil: users.suspendedUntil, suspendReason: users.suspendReason }).from(users).where(eq(users.id, userId)).limit(1);
  const row = result[0];
  if (!row?.suspendedUntil) return { suspended: false };
  const now = new Date();
  if (row.suspendedUntil <= now) return { suspended: false };
  return { suspended: true, until: row.suspendedUntil, reason: row.suspendReason ?? undefined };
}

export async function flagPost(postId: number, reason: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set({ isFlagged: true, flagReason: reason }).where(eq(posts.id, postId));
}

// ─── Auto-delete: find posts with media older than 2 years ───────────────────

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getMediaPostsDueForWarning(): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - TWO_YEARS_MS);
  // Posts older than 2 years with media, not yet warned
  const result = await db.select().from(posts).where(
    and(
      gte(posts.createdAt, new Date(0)), // always true — just to use `and`
      isNotNull(
        sql`CASE WHEN ${posts.mediaUrl} IS NOT NULL OR ${posts.audioUrl} IS NOT NULL OR ${posts.docUrl} IS NOT NULL THEN 1 END`
      ),
      sql`${posts.createdAt} <= ${cutoff}`,
      sql`${posts.deletionWarningSentAt} IS NULL`,
      sql`${posts.deletionScheduledAt} IS NULL`
    )
  );
  return result;
}

export async function schedulePostDeletion(postId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const deletionDate = new Date(Date.now() + SEVEN_DAYS_MS);
  await db.update(posts).set({ deletionScheduledAt: deletionDate, deletionWarningSentAt: new Date() }).where(eq(posts.id, postId));
}

export async function getPostsDueForDeletion(): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const result = await db.select().from(posts).where(
    and(
      isNotNull(posts.deletionScheduledAt),
      sql`${posts.deletionScheduledAt} <= ${now}`
    )
  );
  return result;
}

export async function adminDeletePost(postId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(posts).where(eq(posts.id, postId));
}

// ─── Friend / Connect helpers ────────────────────────────────────────────────
import {
  friendRequests,
  friendships,
  conversations,
  messages,
} from "../drizzle/schema";

export async function sendFriendRequest(senderId: number, receiverId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Check if already exists
  const existing = await db.select().from(friendRequests).where(
    and(eq(friendRequests.senderId, senderId), eq(friendRequests.receiverId, receiverId))
  );
  if (existing.length > 0) return existing[0];
  const [row] = await db.insert(friendRequests).values({ senderId, receiverId, status: "pending" }).returning({ id: friendRequests.id });
  return { id: row?.id ?? 0, senderId, receiverId, status: "pending" };
}

export async function getFriendRequestBetween(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(friendRequests).where(
    sql`(${friendRequests.senderId} = ${userId1} AND ${friendRequests.receiverId} = ${userId2})
     OR (${friendRequests.senderId} = ${userId2} AND ${friendRequests.receiverId} = ${userId1})`
  );
  return rows[0] ?? null;
}

export async function respondFriendRequest(requestId: number, status: "accepted" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(friendRequests).set({ status }).where(eq(friendRequests.id, requestId));
  if (status === "accepted") {
    const [req] = await db.select().from(friendRequests).where(eq(friendRequests.id, requestId));
    if (req) {
      await db.insert(friendships).values({ userId1: req.senderId, userId2: req.receiverId });
    }
  }
}

export async function getPendingFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendRequests).where(
    and(eq(friendRequests.receiverId, userId), eq(friendRequests.status, "pending"))
  );
}

export async function getSentFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendRequests).where(
    and(eq(friendRequests.senderId, userId), eq(friendRequests.status, "pending"))
  );
}

export async function getFriends(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(
    sql`${friendships.userId1} = ${userId} OR ${friendships.userId2} = ${userId}`
  );
}

export async function areFriends(userId1: number, userId2: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(friendships).where(
    sql`(${friendships.userId1} = ${userId1} AND ${friendships.userId2} = ${userId2})
     OR (${friendships.userId1} = ${userId2} AND ${friendships.userId2} = ${userId1})`
  );
  return rows.length > 0;
}

export async function removeFriend(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(friendships).where(
    sql`(${friendships.userId1} = ${userId1} AND ${friendships.userId2} = ${userId2})
     OR (${friendships.userId1} = ${userId2} AND ${friendships.userId2} = ${userId1})`
  );
  // Also remove any friend request between them
  await db.delete(friendRequests).where(
    sql`(${friendRequests.senderId} = ${userId1} AND ${friendRequests.receiverId} = ${userId2})
     OR (${friendRequests.senderId} = ${userId2} AND ${friendRequests.receiverId} = ${userId1})`
  );
}

// ─── Direct Messaging helpers ─────────────────────────────────────────────────
export async function getOrCreateConversation(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [min, max] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
  const existing = await db.select().from(conversations).where(
    sql`(${conversations.participant1Id} = ${min} AND ${conversations.participant2Id} = ${max})
     OR (${conversations.participant1Id} = ${max} AND ${conversations.participant2Id} = ${min})`
  );
  if (existing.length > 0) return existing[0];
  const [row] = await db.insert(conversations).values({ participant1Id: min, participant2Id: max }).returning({ id: conversations.id });
  return { id: row?.id ?? 0, participant1Id: min, participant2Id: max };
}

export async function getConversationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const convs = await db.select().from(conversations).where(
    sql`${conversations.participant1Id} = ${userId} OR ${conversations.participant2Id} = ${userId}`
  ).orderBy(sql`${conversations.lastMessageAt} DESC`);
  // Enrich with last message preview and unread count
  const enriched = await Promise.all(convs.map(async (c) => {
    const [lastMsg] = await db!.select({
      text: messages.text,
      fileName: messages.fileName,
      fileType: messages.fileType,
      senderId: messages.senderId,
    }).from(messages)
      .where(eq(messages.conversationId, c.id))
      .orderBy(sql`${messages.createdAt} DESC`)
      .limit(1);
    const [unreadRow] = await db!.select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(sql`${messages.conversationId} = ${c.id} AND ${messages.senderId} != ${userId} AND ${messages.isRead} = false`);
    return {
      ...c,
      lastMessageText: decryptChatText(lastMsg?.text) ?? (lastMsg?.fileName ? `📎 ${lastMsg.fileName}` : null),
      lastMessageSenderId: lastMsg?.senderId ?? null,
      unreadCount: Number(unreadRow?.count ?? 0),
    };
  }));
  return enriched;
}

export async function getMessages(conversationId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(sql`${messages.createdAt} ASC`)
    .limit(limit);
  return rows.map(decryptDirectMessageRow);
}

export async function sendMessage(data: {
  conversationId: number;
  senderId: number;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const encryptedData = { ...data, text: encryptChatText(data.text) ?? data.text };
  const [row] = await db.insert(messages).values(encryptedData).returning({ id: messages.id });
  // Update conversation lastMessageAt
  await db.update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
  return { id: row?.id ?? 0, ...data };
}

export async function markMessagesRead(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${userId}`,
        eq(messages.isRead, false)
      )
    );
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const userConvs = await getConversationsForUser(userId);
  if (userConvs.length === 0) return 0;
  const convIds = userConvs.map((c) => c.id);
  const rows = await db.select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(
      and(
        sql`${messages.conversationId} IN (${sql.join(convIds.map(id => sql`${id}`), sql`, `)})`,
        sql`${messages.senderId} != ${userId}`,
        eq(messages.isRead, false)
      )
    );
  return rows[0]?.count ?? 0;
}


// ─── Admin Helpers ────────────────────────────────────────────────────────────
export async function getFlaggedPosts(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.isFlagged, true)).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
}

export async function getFlaggedComments(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(eq(comments.isFlagged, true)).orderBy(desc(comments.createdAt)).limit(limit).offset(offset);
}

export async function getAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatar: users.avatar,
    role: users.role,
    emailVerified: users.emailVerified,
    violationCount: users.violationCount,
    suspendedUntil: users.suspendedUntil,
    suspendReason: users.suspendReason,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function unsuspendUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ suspendedUntil: null, suspendReason: null }).where(eq(users.id, userId));
}

export async function setUserRole(userId: number, role: "user" | "admin"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function unflagPost(postId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set({ isFlagged: false, flagReason: null }).where(eq(posts.id, postId));
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalPosts: 0, flaggedPosts: 0, suspendedUsers: 0 };
  const [totalUsersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const [totalPostsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(posts);
  const [flaggedPostsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(posts).where(eq(posts.isFlagged, true));
  const [suspendedUsersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(isNotNull(users.suspendedUntil));
  return {
    totalUsers: Number(totalUsersRow?.count ?? 0),
    totalPosts: Number(totalPostsRow?.count ?? 0),
    flaggedPosts: Number(flaggedPostsRow?.count ?? 0),
    suspendedUsers: Number(suspendedUsersRow?.count ?? 0),
  };
}

// ─── Hashtags ─────────────────────────────────────────────────────────────────
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\w\u0900-\u097F]+)/g) ?? [];
  return Array.from(new Set(matches.map((t) => t.slice(1).toLowerCase())));
}

export async function saveHashtags(postId: number, tags: string[]): Promise<void> {
  const db = await getDb();
  if (!db || tags.length === 0) return;
  await db.delete(hashtags).where(eq(hashtags.postId, postId));
  if (tags.length > 0) {
    await db.insert(hashtags).values(tags.map((tag) => ({ tag, postId })));
  }
}

export async function getPostsByHashtag(tag: string, limit = 20): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  const tagRows = await db.select().from(hashtags).where(eq(hashtags.tag, tag.toLowerCase())).limit(limit);
  if (tagRows.length === 0) return [];
  const postIds = tagRows.map((r) => r.postId);
  return db.select().from(posts).where(and(inArray(posts.id, postIds), eq(posts.isFlagged, false))).orderBy(desc(posts.createdAt));
}

export async function editPost(
  id: number,
  authorId: number | undefined,
  text: string,
  bgColor?: string | null,
  mediaFields?: {
    mediaUrl?: string | null;
    mediaType?: string | null;
    audioUrl?: string | null;
    docUrl?: string | null;
    docName?: string | null;
  },
  hideEditHistory?: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const conditions = [eq(posts.id, id)];
  if (authorId !== undefined) conditions.push(eq(posts.authorId, authorId));

  const updateData: Record<string, unknown> = { text, editedAt: new Date() };
  if (bgColor !== undefined) updateData.bgColor = bgColor;
  // Note: hideEditHistory and post history are disabled to ensure compatibility with all database environments
  // if (hideEditHistory !== undefined) updateData.hideEditHistory = hideEditHistory;
  if (mediaFields) {
    if (mediaFields.mediaUrl !== undefined) { updateData.mediaUrl = mediaFields.mediaUrl; updateData.mediaType = mediaFields.mediaType ?? null; }
    if (mediaFields.audioUrl !== undefined) updateData.audioUrl = mediaFields.audioUrl;
    if (mediaFields.docUrl !== undefined) { updateData.docUrl = mediaFields.docUrl; updateData.docName = mediaFields.docName ?? null; }
  }
  await db.update(posts).set(updateData).where(and(...conditions));
}
export async function getPostEditHistory(postId: number, requesterId?: number): Promise<PostEdit[]> {
  const db = await getDb();
  if (!db) return [];
  // Respect the post owner's privacy setting
  const post = await db.select({ authorId: posts.authorId, hideEditHistory: posts.hideEditHistory }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post[0]) return [];
  if (post[0].hideEditHistory && post[0].authorId !== requesterId) return [];
  return db.select().from(postEdits).where(eq(postEdits.postId, postId)).orderBy(desc(postEdits.editedAt));
}
export async function reschedulePost(postId: number, authorId: number, scheduledAt: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.update(posts).set({ scheduledAt }).where(and(eq(posts.id, postId), eq(posts.authorId, authorId), isNotNull(posts.scheduledAt)));
  return (result[0] as { affectedRows: number }).affectedRows;
}


// ─── Password Reset Tokens ───────────────────────────────────────────────────
import { passwordResetTokens, PasswordResetToken } from "../drizzle/schema";

export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function uploadAvatar(userId: number, avatarUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ avatar: avatarUrl }).where(eq(users.id, userId));
}

// ─── Phone Verification Helpers ───────────────────────────────────────────────

export async function createPhoneVerification(
  userId: number,
  phone: string,
  otp: string,
  expiresAt: Date
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(phoneVerifications).values({ userId, phone, otp, expiresAt });
}

export async function getLatestPhoneVerification(userId: number, phone: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(phoneVerifications)
    .where(
      and(
        eq(phoneVerifications.userId, userId),
        eq(phoneVerifications.phone, phone),
        isNull(phoneVerifications.verifiedAt)
      )
    )
    .orderBy(desc(phoneVerifications.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function incrementOtpAttempts(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(phoneVerifications)
    .set({ attempts: sql`attempts + 1` })
    .where(eq(phoneVerifications.id, id));
}

export async function markPhoneVerified(id: number, userId: number, phone: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(phoneVerifications)
    .set({ verifiedAt: new Date() })
    .where(eq(phoneVerifications.id, id));
  await db
    .update(users)
    .set({ phoneVerified: true, phone })
    .where(eq(users.id, userId));
}

// ─── WebAuthn / Passkey Helpers ───────────────────────────────────────────────
export async function createPasskey(data: {
  userId: number;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(passkeys).values(data);
}

export async function getPasskeysByUserId(userId: number): Promise<Passkey[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(passkeys).where(eq(passkeys.userId, userId));
}

export async function getPasskeyByCredentialId(credentialId: string): Promise<Passkey | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(passkeys).where(eq(passkeys.credentialId, credentialId)).limit(1);
  return rows[0] ?? null;
}

export async function updatePasskeyCounter(id: number, counter: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(passkeys).set({ counter }).where(eq(passkeys.id, id));
}

export async function deletePasskey(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)));
}

// ─── WebAuthn Challenge Helpers ───────────────────────────────────────────────
export async function saveWebauthnChallenge(data: {
  userId?: number;
  challenge: string;
  type: string;
  expiresAt: Date;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(webauthnChallenges).values(data).returning({ id: webauthnChallenges.id });
  return result[0]?.id ?? 0;
}

export async function getWebauthnChallenge(id: number): Promise<WebauthnChallenge | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(webauthnChallenges).where(eq(webauthnChallenges.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteWebauthnChallenge(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, id));
}

// ─── TOTP 2FA ─────────────────────────────────────────────────────────────────
export async function getTotpSecret(userId: number): Promise<TotpSecret | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(totpSecrets).where(eq(totpSecrets.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertTotpSecret(userId: number, secret: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(totpSecrets).values({ userId, secret, enabled: false }).onConflictDoUpdate({ target: totpSecrets.userId, set: { secret, enabled: false, enabledAt: null } });
}

export async function enableTotp(userId: number, backupCodesJson: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(totpSecrets).set({ enabled: true, enabledAt: new Date(), backupCodes: backupCodesJson }).where(eq(totpSecrets.userId, userId));
}

export async function disableTotp(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(totpSecrets).where(eq(totpSecrets.userId, userId));
}

export async function updateTotpBackupCodes(userId: number, backupCodesJson: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(totpSecrets).set({ backupCodes: backupCodesJson }).where(eq(totpSecrets.userId, userId));
}

// ─── Active Sessions ──────────────────────────────────────────────────────────
import crypto from "crypto";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createActiveSession(data: {
  userId: number;
  tokenHash: string;
  device?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(activeSessions).values({
    userId: data.userId,
    tokenHash: data.tokenHash,
    device: data.device ?? null,
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ?? null,
  }).onConflictDoNothing();
}

export async function getActiveSessionsByUser(userId: number): Promise<ActiveSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activeSessions).where(eq(activeSessions.userId, userId)).orderBy(desc(activeSessions.lastSeenAt));
}

export async function deleteActiveSession(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(activeSessions).where(and(eq(activeSessions.id, id), eq(activeSessions.userId, userId)));
}

export async function deleteActiveSessionByTokenHash(tokenHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(activeSessions).where(eq(activeSessions.tokenHash, tokenHash));
}

export async function deleteAllOtherSessions(userId: number, currentTokenHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(activeSessions).where(
    and(eq(activeSessions.userId, userId), sql`${activeSessions.tokenHash} != ${currentTokenHash}`)
  );
}

export async function touchActiveSession(tokenHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(activeSessions).set({ lastSeenAt: new Date() }).where(eq(activeSessions.tokenHash, tokenHash));
}

// ─── Group Conversations ──────────────────────────────────────────────────────

export async function createGroup(data: {
  name: string;
  description?: string;
  avatar?: string;
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(groupConversations).values({
    name: data.name,
    description: data.description ?? null,
    avatar: data.avatar ?? null,
    createdBy: data.createdBy,
  }).returning({ id: groupConversations.id });
  return result[0].id;
}

export async function addGroupMember(groupId: number, userId: number, role: "admin" | "member" = "member"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(groupMembers).values({ groupId, userId, role }).onConflictDoNothing();
}

export async function removeGroupMember(groupId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
}

export async function getGroupsByUser(userId: number): Promise<GroupConversation[]> {
  const db = await getDb();
  if (!db) return [];
  const memberRows = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, userId));
  const groupIds = memberRows.map(r => r.groupId);
  if (groupIds.length === 0) return [];
  return db.select().from(groupConversations).where(inArray(groupConversations.id, groupIds)).orderBy(desc(groupConversations.updatedAt));
}

export async function getGroupById(id: number): Promise<GroupConversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groupConversations).where(eq(groupConversations.id, id)).limit(1);
  return result[0];
}

export async function updateGroupAvatar(groupId: number, avatarUrl: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(groupConversations)
    .set({ avatar: avatarUrl, updatedAt: new Date() })
    .where(eq(groupConversations.id, groupId));
}

export async function getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  const userIds = rows.map(r => r.userId);
  if (userIds.length === 0) return [];
  const userRows = await db.select().from(users).where(inArray(users.id, userIds));
  const userMap = new Map(userRows.map(u => [u.id, u]));
  return rows.map(m => ({ ...m, user: userMap.get(m.userId)! })).filter(m => m.user);
}

export async function isGroupMember(groupId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: groupMembers.id }).from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))).limit(1);
  return result.length > 0;
}

export async function getGroupMemberRole(groupId: number, userId: number): Promise<"admin" | "member" | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ role: groupMembers.role }).from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))).limit(1);
  return result[0]?.role ?? null;
}

export async function updateGroupUpdatedAt(groupId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(groupConversations).set({ updatedAt: new Date() }).where(eq(groupConversations.id, groupId));
}

// ─── Group Messages ───────────────────────────────────────────────────────────

export async function sendGroupMessage(data: {
  groupId: number;
  senderId: number;
  content: string;
  type?: "text" | "image" | "file" | "system";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(groupMessages).values({
    groupId: data.groupId,
    senderId: data.senderId,
    content: data.type === "text" || !data.type ? encryptChatText(data.content) ?? data.content : data.content,
    type: data.type ?? "text",
  }).returning({ id: groupMessages.id });
  await updateGroupUpdatedAt(data.groupId);
  return result[0]?.id ?? 0;
}

export async function getGroupMessages(groupId: number, limit = 50, before?: number): Promise<GroupMessage[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(groupMessages.groupId, groupId)];
  if (before) conditions.push(sql`${groupMessages.id} < ${before}`);
  const rows = await db.select().from(groupMessages).where(and(...conditions)).orderBy(desc(groupMessages.createdAt)).limit(limit);
  return rows.map(decryptGroupMessageRow);
}

// ─── Call Rooms ───────────────────────────────────────────────────────────────

export async function createCallRoom(data: {
  groupId?: number;
  hostId: number;
  type: "audio" | "video";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(callRooms).values({
    groupId: data.groupId ?? null,
    hostId: data.hostId,
    type: data.type,
    status: "waiting",
  }).returning({ id: callRooms.id });
  return result[0].id;
}

export async function getCallRoom(roomId: number): Promise<CallRoom | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(callRooms).where(eq(callRooms.id, roomId)).limit(1);
  return result[0];
}

export async function updateCallRoomStatus(roomId: number, status: "waiting" | "active" | "ended"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const update: Partial<CallRoom> = { status };
  if (status === "ended") update.endedAt = new Date();
  await db.update(callRooms).set(update).where(eq(callRooms.id, roomId));
}

export async function joinCallRoom(roomId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(callParticipants).values({ roomId, userId }).onConflictDoNothing();
  await updateCallRoomStatus(roomId, "active");
}

export async function leaveCallRoom(roomId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(callParticipants).set({ leftAt: new Date() }).where(and(eq(callParticipants.roomId, roomId), eq(callParticipants.userId, userId)));
  // Check if all participants have left
  const active = await db.select().from(callParticipants).where(and(eq(callParticipants.roomId, roomId), isNull(callParticipants.leftAt)));
  if (active.length === 0) await updateCallRoomStatus(roomId, "ended");
}

export async function getActiveCallParticipants(roomId: number): Promise<(CallParticipant & { user: User })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(callParticipants).where(and(eq(callParticipants.roomId, roomId), isNull(callParticipants.leftAt)));
  const userIds = rows.map(r => r.userId);
  if (userIds.length === 0) return [];
  const userRows = await db.select().from(users).where(inArray(users.id, userIds));
  const userMap = new Map(userRows.map(u => [u.id, u]));
  return rows.map(p => ({ ...p, user: userMap.get(p.userId)! })).filter(p => p.user);
}

// ─── WebRTC Signals ───────────────────────────────────────────────────────────

export async function sendCallSignal(data: {
  roomId: number;
  fromUserId: number;
  toUserId: number;
  type: string;
  payload: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(callSignals).values({ ...data, consumed: false });
}

export async function getUnconsumedSignals(roomId: number, toUserId: number): Promise<CallSignal[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(callSignals).where(and(eq(callSignals.roomId, roomId), eq(callSignals.toUserId, toUserId), eq(callSignals.consumed, false))).orderBy(callSignals.createdAt);
  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    await db.update(callSignals).set({ consumed: true }).where(inArray(callSignals.id, ids));
  }
  return rows;
}

// ─── Profile Photos ───────────────────────────────────────────────────────────

export async function getProfilePhotos(userId: number): Promise<ProfilePhoto[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profilePhotos)
    .where(eq(profilePhotos.userId, userId))
    .orderBy(desc(profilePhotos.createdAt));
}

export async function addProfilePhoto(data: { userId: number; url: string; storageKey: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [row] = await db.insert(profilePhotos).values({ ...data, isActive: false }).returning({ id: profilePhotos.id });
  return row?.id ?? 0;
}

export async function setActiveProfilePhoto(photoId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Deactivate all, then activate the chosen one
  await db.update(profilePhotos).set({ isActive: false }).where(eq(profilePhotos.userId, userId));
  await db.update(profilePhotos).set({ isActive: true }).where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.userId, userId)));
  // Sync user.avatar with the active photo URL
  const [photo] = await db.select().from(profilePhotos).where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.userId, userId))).limit(1);
  if (photo) await db.update(users).set({ avatar: photo.url }).where(eq(users.id, userId));
}

export async function deleteProfilePhoto(photoId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [photo] = await db.select().from(profilePhotos).where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.userId, userId))).limit(1);
  if (!photo) return null;
  await db.delete(profilePhotos).where(and(eq(profilePhotos.id, photoId), eq(profilePhotos.userId, userId)));
  // If it was active, clear user avatar
  if (photo.isActive) await db.update(users).set({ avatar: null }).where(eq(users.id, userId));
  return photo.storageKey;
}

export async function getActiveProfilePhoto(userId: number): Promise<ProfilePhoto | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [photo] = await db.select().from(profilePhotos)
    .where(and(eq(profilePhotos.userId, userId), eq(profilePhotos.isActive, true)))
    .limit(1);
  return photo;
}

// ─── Cover Photos ─────────────────────────────────────────────────────────────

export async function getCoverPhotos(userId: number): Promise<CoverPhoto[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coverPhotos)
    .where(eq(coverPhotos.userId, userId))
    .orderBy(desc(coverPhotos.createdAt));
}

export async function addCoverPhoto(data: { userId: number; url: string; storageKey: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [row] = await db.insert(coverPhotos).values({ ...data, isActive: false }).returning({ id: coverPhotos.id });
  return row?.id ?? 0;
}

export async function setActiveCoverPhoto(photoId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(coverPhotos).set({ isActive: false }).where(eq(coverPhotos.userId, userId));
  await db.update(coverPhotos).set({ isActive: true }).where(and(eq(coverPhotos.id, photoId), eq(coverPhotos.userId, userId)));
  // Sync user.coverPhoto with the active cover URL
  const [photo] = await db.select().from(coverPhotos).where(and(eq(coverPhotos.id, photoId), eq(coverPhotos.userId, userId))).limit(1);
  if (photo) await db.update(users).set({ coverPhoto: photo.url }).where(eq(users.id, userId));
}

export async function deleteCoverPhoto(photoId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [photo] = await db.select().from(coverPhotos).where(and(eq(coverPhotos.id, photoId), eq(coverPhotos.userId, userId))).limit(1);
  if (!photo) return null;
  await db.delete(coverPhotos).where(and(eq(coverPhotos.id, photoId), eq(coverPhotos.userId, userId)));
  if (photo.isActive) await db.update(users).set({ coverPhoto: null }).where(eq(users.id, userId));
  return photo.storageKey;
}

export async function getActiveCoverPhoto(userId: number): Promise<CoverPhoto | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [photo] = await db.select().from(coverPhotos)
    .where(and(eq(coverPhotos.userId, userId), eq(coverPhotos.isActive, true)))
    .limit(1);
  return photo;
}

// ─── Media Gallery (from posts) ───────────────────────────────────────────────
export async function getPostPhotos(userId: number): Promise<{ id: number; postId: number; url: string; url2: string | null; url3: string | null; caption: string | null; createdAt: Date; commentCount: number; likeCount: number }[]> {
  const db = await getDb();
  if (!db) return [];

  // PostgreSQL keeps the camelCase column names from the Drizzle schema quoted.
  // Use schema references in the count subqueries instead of old snake_case names
  // so the Photos tab does not silently fail after the MySQL → PostgreSQL move.
  const rows = await db
    .select({
      id: posts.id,
      url: posts.mediaUrl,
      url2: posts.photo2Url,
      url3: posts.photo3Url,
      caption: posts.photo1Caption,
      caption2: posts.photo2Caption,
      caption3: posts.photo3Caption,
      createdAt: posts.createdAt,
      commentCount: sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id})`,
      likeCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.targetId} = ${posts.id} AND ${likes.targetType} = 'post')`,
    })
    .from(posts)
    .where(and(
      eq(posts.authorId, userId),
      eq(posts.mediaType, "image"),
      sql`(${posts.mediaUrl} IS NOT NULL OR ${posts.photo2Url} IS NOT NULL OR ${posts.photo3Url} IS NOT NULL)`
    ))
    .orderBy(desc(posts.createdAt))
    .limit(200);

  return rows.flatMap((r) => {
    const common = {
      postId: r.id,
      createdAt: r.createdAt,
      commentCount: Number(r.commentCount),
      likeCount: Number(r.likeCount),
      url2: null,
      url3: null,
    };
    return [
      r.url ? { id: r.id * 10 + 1, url: r.url, caption: r.caption, ...common } : null,
      r.url2 ? { id: r.id * 10 + 2, url: r.url2, caption: r.caption2, ...common } : null,
      r.url3 ? { id: r.id * 10 + 3, url: r.url3, caption: r.caption3, ...common } : null,
    ].filter(Boolean) as { id: number; postId: number; url: string; url2: string | null; url3: string | null; caption: string | null; createdAt: Date; commentCount: number; likeCount: number }[];
  });
}

export async function getPostVideos(userId: number): Promise<{ id: number; url: string; createdAt: Date; videoViews: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: posts.id, url: posts.mediaUrl, createdAt: posts.createdAt, videoViews: posts.videoViews })
    .from(posts)
    .where(and(eq(posts.authorId, userId), eq(posts.mediaType, "video"), isNotNull(posts.mediaUrl)))
    .orderBy(desc(posts.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, url: r.url!, videoViews: r.videoViews ?? 0 }));
}

export async function getPostDocs(userId: number): Promise<{ id: number; url: string; name: string | null; size: number | null; docType: string | null; createdAt: Date }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: posts.id, url: posts.docUrl, name: posts.docName, size: posts.docSize, docType: posts.docType, createdAt: posts.createdAt })
    .from(posts)
    .where(and(eq(posts.authorId, userId), isNotNull(posts.docUrl)))
    .orderBy(desc(posts.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, url: r.url! }));
}

// ─── Subscriptions (Blue Badge) ───────────────────────────────────────────────
export async function getSubscriptionByUser(userId: number): Promise<Subscription | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertSubscription(data: Partial<InsertSubscription> & { userId: number }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getSubscriptionByUser(data.userId);
  if (existing) {
    await db.update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.userId, data.userId));
  } else {
    await db.insert(subscriptions).values({ ...data, updatedAt: new Date() } as InsertSubscription);
  }
}

export async function getAllSubscriptions(): Promise<(Subscription & { userName: string | null; userEmail: string | null; userAvatar: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      stripeCustomerId: subscriptions.stripeCustomerId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      status: subscriptions.status,
      badgeGranted: subscriptions.badgeGranted,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.avatar,
    })
    .from(subscriptions)
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));
  return rows as any;
}

export async function revokeSubscription(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions)
    .set({ badgeGranted: false, status: "cancelled", updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
}

// ─── Blue Badge Verified Flag ─────────────────────────────────────────────────
export async function setUserVerified(userId: number, isVerified: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isVerified }).where(eq(users.id, userId));
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return rows[0] ?? null;
}

// ─── Organisation Pages ───────────────────────────────────────────────────────
export async function createOrgPage(data: {
  handle: string; name: string; description?: string; category?: string;
  logo?: string; coverPhoto?: string; website?: string; location?: string; ownerId: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orgPages).values({
    handle: data.handle.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: data.name,
    description: data.description ?? null,
    category: data.category ?? null,
    logo: data.logo ?? null,
    coverPhoto: data.coverPhoto ?? null,
    website: data.website ?? null,
    location: data.location ?? null,
    ownerId: data.ownerId,
  }).returning({ id: orgPages.id });
  return result[0]?.id ?? 0;
}

export async function getOrgPageByHandle(handle: string): Promise<OrgPage | null> {
  const db = await getDb();
  if (!db) return null;
  const [page] = await db.select().from(orgPages).where(eq(orgPages.handle, handle.toLowerCase())).limit(1);
  return page ?? null;
}

export async function getOrgPageById(id: number): Promise<OrgPage | null> {
  const db = await getDb();
  if (!db) return null;
  const [page] = await db.select().from(orgPages).where(eq(orgPages.id, id)).limit(1);
  return page ?? null;
}

export async function listOrgPages(search?: string, limit = 24, offset = 0): Promise<OrgPage[]> {
  const db = await getDb();
  if (!db) return [];
  if (search && search.trim().length > 0) {
    return db.select().from(orgPages)
      .where(sql`LOWER(${orgPages.name}) LIKE ${`%${search.trim().toLowerCase()}%`}`)
      .orderBy(desc(orgPages.followerCount))
      .limit(limit).offset(offset);
  }
  return db.select().from(orgPages)
    .orderBy(desc(orgPages.followerCount))
    .limit(limit).offset(offset);
}

export async function isPageFollower(pageId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db.select().from(pageFollowers)
    .where(and(eq(pageFollowers.pageId, pageId), eq(pageFollowers.userId, userId)))
    .limit(1);
  return !!row;
}

export async function followOrgPage(pageId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const already = await isPageFollower(pageId, userId);
  if (already) return;
  await db.insert(pageFollowers).values({ pageId, userId });
  await db.update(orgPages).set({ followerCount: sql`${orgPages.followerCount} + 1` }).where(eq(orgPages.id, pageId));
}

export async function unfollowOrgPage(pageId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const already = await isPageFollower(pageId, userId);
  if (!already) return;
  await db.delete(pageFollowers).where(and(eq(pageFollowers.pageId, pageId), eq(pageFollowers.userId, userId)));
  await db.update(orgPages).set({ followerCount: sql`GREATEST(${orgPages.followerCount} - 1, 0)` }).where(eq(orgPages.id, pageId));
}

export async function isPageAdmin(pageId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const page = await getOrgPageById(pageId);
  if (page?.ownerId === userId) return true;
  const [row] = await db.select().from(pageAdmins)
    .where(and(eq(pageAdmins.pageId, pageId), eq(pageAdmins.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getFollowedPageIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ pageId: pageFollowers.pageId })
    .from(pageFollowers).where(eq(pageFollowers.userId, userId));
  return rows.map(r => r.pageId);
}

export async function getOwnedPages(userId: number): Promise<OrgPage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orgPages).where(eq(orgPages.ownerId, userId)).orderBy(desc(orgPages.createdAt));
}

export async function updateOrgPage(id: number, data: Partial<{
  name: string; description: string | null; category: string | null; logo: string | null;
  coverPhoto: string | null; website: string | null; location: string | null;
}>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orgPages).set(data).where(eq(orgPages.id, id));
}

export async function getPagePostsByPageId(pageId: number, limit = 20, offset = 0): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  // Page posts are regular posts where authorId is stored as negative pageId (convention: -pageId)
  // Instead, we use a dedicated pageId column approach: posts with pageId set
  // For simplicity, page posts are posts where authorId = ownerId AND post has pageId tag
  // We use the posts table with a special convention: pageId stored in the resharedFromId field
  // Better: use a separate approach - store page posts as posts with authorId = ownerId
  // and filter by a page-specific marker. Since we don't have a pageId column on posts,
  // we'll use the linkSiteName field as a page marker: "page:{pageId}"
  return db.select().from(posts)
    .where(and(
      eq(posts.isFlagged, false),
      eq(posts.linkSiteName, `page:${pageId}`)
    ))
    .orderBy(desc(posts.createdAt))
    .limit(limit).offset(offset);
}

export async function getPageFeedPosts(followedPageIds: number[], limit = 20, offset = 0): Promise<Post[]> {
  const db = await getDb();
  if (!db || followedPageIds.length === 0) return [];
  const markers = followedPageIds.map(id => `page:${id}`);
  return db.select().from(posts)
    .where(and(
      eq(posts.isFlagged, false),
      inArray(posts.linkSiteName, markers)
    ))
    .orderBy(desc(posts.createdAt))
    .limit(limit).offset(offset);
}

export async function addPageAdmin(pageId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const already = await isPageAdmin(pageId, userId);
  if (already) return;
  await db.insert(pageAdmins).values({ pageId, userId });
}

export async function removePageAdmin(pageId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pageAdmins).where(and(eq(pageAdmins.pageId, pageId), eq(pageAdmins.userId, userId)));
}

export async function getPageAdmins(pageId: number): Promise<{ id: number; name: string | null; avatar: string | null; email: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ userId: pageAdmins.userId }).from(pageAdmins).where(eq(pageAdmins.pageId, pageId));
  const admins = await Promise.all(rows.map(r => getUserById(r.userId)));
  return admins.filter(Boolean).map(a => ({ id: a!.id, name: a!.name ?? null, avatar: a!.avatar ?? null, email: a!.email ?? null }));
}

export async function transferPageOwnership(pageId: number, newOwnerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orgPages).set({ ownerId: newOwnerId }).where(eq(orgPages.id, pageId));
}

// ─── Friend Suggestions & Extended Helpers ────────────────────────────────────
export async function cancelFriendRequest(senderId: number, receiverId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(friendRequests).where(
    and(eq(friendRequests.senderId, senderId), eq(friendRequests.receiverId, receiverId), eq(friendRequests.status, "pending"))
  );
}

export async function getMutualFriendsCount(userId1: number, userId2: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const f1 = await db.select().from(friendships).where(
    sql`${friendships.userId1} = ${userId1} OR ${friendships.userId2} = ${userId1}`
  );
  const ids1 = new Set(f1.map(f => f.userId1 === userId1 ? f.userId2 : f.userId1));
  const f2 = await db.select().from(friendships).where(
    sql`${friendships.userId1} = ${userId2} OR ${friendships.userId2} = ${userId2}`
  );
  const ids2 = new Set(f2.map(f => f.userId1 === userId2 ? f.userId2 : f.userId1));
  let count = 0;
  for (const id of Array.from(ids1)) { if (ids2.has(id)) count++; }
  return count;
}

export async function getFriendSuggestions(userId: number, limit = 20): Promise<{ user: User; mutualCount: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const friendRows = await db.select().from(friendships).where(
    sql`${friendships.userId1} = ${userId} OR ${friendships.userId2} = ${userId}`
  );
  const friendIds = new Set(friendRows.map(f => f.userId1 === userId ? f.userId2 : f.userId1));
  friendIds.add(userId);
  const reqRows = await db.select().from(friendRequests).where(
    sql`${friendRequests.senderId} = ${userId} OR ${friendRequests.receiverId} = ${userId}`
  );
  const requestedIds = new Set(reqRows.map(r => r.senderId === userId ? r.receiverId : r.senderId));
  const allUsers = await db.select().from(users).limit(200);
  const candidates = allUsers.filter(u => !friendIds.has(u.id) && !requestedIds.has(u.id));
  const scored = await Promise.all(candidates.map(async u => ({
    user: u,
    mutualCount: await getMutualFriendsCount(userId, u.id),
  })));
  scored.sort((a, b) => b.mutualCount - a.mutualCount);
  return scored.slice(0, limit);
}

export async function getPendingFriendRequestsWithSenders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const reqs = await db.select().from(friendRequests).where(
    and(eq(friendRequests.receiverId, userId), eq(friendRequests.status, "pending"))
  ).orderBy(desc(friendRequests.createdAt));
  const enriched = await Promise.all(reqs.map(async req => {
    const sender = await getUserById(req.senderId);
    const mutual = await getMutualFriendsCount(userId, req.senderId);
    return { ...req, sender: sender ?? null, mutualCount: mutual };
  }));
  return enriched;
}

export async function getSentFriendRequestsWithReceivers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const reqs = await db.select().from(friendRequests).where(
    and(eq(friendRequests.senderId, userId), eq(friendRequests.status, "pending"))
  ).orderBy(desc(friendRequests.createdAt));
  const enriched = await Promise.all(reqs.map(async req => {
    const receiver = await getUserById(req.receiverId);
    return { ...req, receiver: receiver ?? null };
  }));
  return enriched;
}

export async function getFriendsWithProfiles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(friendships).where(
    sql`${friendships.userId1} = ${userId} OR ${friendships.userId2} = ${userId}`
  );
  const enriched = await Promise.all(rows.map(async row => {
    const friendId = row.userId1 === userId ? row.userId2 : row.userId1;
    const friend = await getUserById(friendId);
    return { ...row, friend: friend ?? null };
  }));
  return enriched.filter(r => r.friend !== null);
}

// ─── Public Groups ────────────────────────────────────────────────────────────

export async function createPublicGroup(data: InsertPublicGroup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(publicGroups).values(data).returning({ id: publicGroups.id });
  return result[0].id;
}

export async function getPublicGroupByHandle(handle: string): Promise<PublicGroup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(publicGroups).where(eq(publicGroups.handle, handle)).limit(1);
  return result[0];
}

export async function getPublicGroupById(id: number): Promise<PublicGroup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(publicGroups).where(eq(publicGroups.id, id)).limit(1);
  return result[0];
}

export async function listPublicGroups(search?: string, limit = 24, offset = 0): Promise<PublicGroup[]> {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(publicGroups)
      .where(sql`LOWER(${publicGroups.name}) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(${publicGroups.description}) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(${publicGroups.category}) LIKE ${`%${search.toLowerCase()}%`}`)
      .orderBy(desc(publicGroups.memberCount))
      .limit(limit).offset(offset);
  }
  return db.select().from(publicGroups).orderBy(desc(publicGroups.memberCount)).limit(limit).offset(offset);
}

export async function updatePublicGroup(id: number, data: Partial<Pick<PublicGroup, "name" | "description" | "category" | "coverPhoto">>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(publicGroups).set({ ...data, updatedAt: new Date() }).where(eq(publicGroups.id, id));
}

export async function joinPublicGroup(groupId: number, userId: number, role: "admin" | "moderator" | "member" = "member"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(publicGroupMembers).values({ groupId, userId, role }).onConflictDoNothing();
  await db.update(publicGroups).set({ memberCount: sql`${publicGroups.memberCount} + 1` }).where(eq(publicGroups.id, groupId));
}

export async function leavePublicGroup(groupId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(publicGroupMembers).where(and(eq(publicGroupMembers.groupId, groupId), eq(publicGroupMembers.userId, userId)));
  await db.update(publicGroups).set({ memberCount: sql`GREATEST(${publicGroups.memberCount} - 1, 0)` }).where(eq(publicGroups.id, groupId));
}

export async function getPublicGroupMembership(groupId: number, userId: number): Promise<PublicGroupMember | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(publicGroupMembers)
    .where(and(eq(publicGroupMembers.groupId, groupId), eq(publicGroupMembers.userId, userId))).limit(1);
  return result[0];
}

export async function getPublicGroupMembers(groupId: number, limit = 50): Promise<PublicGroupMember[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publicGroupMembers).where(eq(publicGroupMembers.groupId, groupId)).limit(limit);
}

export async function setPublicGroupMemberRole(groupId: number, userId: number, role: "admin" | "moderator" | "member"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(publicGroupMembers).set({ role }).where(and(eq(publicGroupMembers.groupId, groupId), eq(publicGroupMembers.userId, userId)));
}

export async function createPublicGroupPost(data: InsertPublicGroupPost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(publicGroupPosts).values(data).returning({ id: publicGroupPosts.id });
  return result[0].id;
}

export async function getPublicGroupPosts(groupId: number, limit = 20, offset = 0): Promise<PublicGroupPost[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publicGroupPosts)
    .where(eq(publicGroupPosts.groupId, groupId))
    .orderBy(desc(publicGroupPosts.createdAt))
    .limit(limit).offset(offset);
}

export async function deletePublicGroupPost(id: number, authorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(publicGroupPosts).where(and(eq(publicGroupPosts.id, id), eq(publicGroupPosts.authorId, authorId)));
}

export async function uploadPublicGroupCover(groupId: number, coverPhoto: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(publicGroups).set({ coverPhoto, updatedAt: new Date() }).where(eq(publicGroups.id, groupId));
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export async function createStory(data: InsertStory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stories).values(data).returning({ id: stories.id });
  return result[0].id;
}

export async function getActiveStories(): Promise<Story[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stories)
    .where(gte(stories.expiresAt, new Date()))
    .orderBy(desc(stories.createdAt));
}

export async function getStoriesByUser(authorId: number): Promise<Story[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stories)
    .where(and(eq(stories.authorId, authorId), gte(stories.expiresAt, new Date())))
    .orderBy(stories.createdAt);
}

export async function getStoryById(id: number): Promise<Story | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stories).where(eq(stories.id, id)).limit(1);
  return result[0];
}

export async function deleteStory(id: number, authorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(stories).where(and(eq(stories.id, id), eq(stories.authorId, authorId)));
}

export async function recordStoryView(storyId: number, viewerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Insert view (ignore duplicate)
  try {
    await db.insert(storyViews).values({ storyId, viewerId });
    // Increment view count
    await db.update(stories).set({ viewCount: sql`${stories.viewCount} + 1` }).where(eq(stories.id, storyId));
  } catch {
    // Duplicate view — ignore
  }
}

export async function getStoryViewerIds(storyId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ viewerId: storyViews.viewerId }).from(storyViews).where(eq(storyViews.storyId, storyId));
  return result.map(r => r.viewerId);
}

export async function getViewedStoryIds(viewerId: number, storyIds: number[]): Promise<number[]> {
  const db = await getDb();
  if (!db || storyIds.length === 0) return [];
  const result = await db.select({ storyId: storyViews.storyId }).from(storyViews)
    .where(and(eq(storyViews.viewerId, viewerId), inArray(storyViews.storyId, storyIds)));
  return result.map(r => r.storyId);
}

export async function deleteExpiredStories(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(stories).where(sql`${stories.expiresAt} < NOW()`);
}

// ─── Story Reactions ──────────────────────────────────────────────────────────
import { storyReactions, StoryReaction, storyHighlights, StoryHighlight, storyHighlightItems, StoryHighlightItem } from "../drizzle/schema";

export async function upsertStoryReaction(storyId: number, reactorId: number, emoji: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if already reacted with same emoji → toggle off
  const existing = await db.select().from(storyReactions)
    .where(and(eq(storyReactions.storyId, storyId), eq(storyReactions.reactorId, reactorId)))
    .limit(1);
  if (existing.length > 0 && existing[0].emoji === emoji) {
    await db.delete(storyReactions).where(eq(storyReactions.id, existing[0].id));
  } else if (existing.length > 0) {
    await db.update(storyReactions).set({ emoji }).where(eq(storyReactions.id, existing[0].id));
  } else {
    await db.insert(storyReactions).values({ storyId, reactorId, emoji });
  }
}

export async function getStoryReactions(storyId: number): Promise<StoryReaction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storyReactions).where(eq(storyReactions.storyId, storyId));
}

export async function getMyStoryReaction(storyId: number, reactorId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storyReactions)
    .where(and(eq(storyReactions.storyId, storyId), eq(storyReactions.reactorId, reactorId)))
    .limit(1);
  return result[0]?.emoji ?? null;
}

export async function getStoryReactionCounts(storyIds: number[]): Promise<Record<number, Record<string, number>>> {
  const db = await getDb();
  if (!db || storyIds.length === 0) return {};
  const rows = await db.select().from(storyReactions).where(inArray(storyReactions.storyId, storyIds));
  const counts: Record<number, Record<string, number>> = {};
  for (const r of rows) {
    if (!counts[r.storyId]) counts[r.storyId] = {};
    counts[r.storyId][r.emoji] = (counts[r.storyId][r.emoji] ?? 0) + 1;
  }
  return counts;
}

// ─── Story Highlights ─────────────────────────────────────────────────────────
export async function createHighlight(authorId: number, title: string, coverUrl?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(storyHighlights).values({ authorId, title, coverUrl: coverUrl ?? null }).returning({ id: storyHighlights.id });
  return result[0].id;
}

export async function getHighlightsByUser(authorId: number): Promise<StoryHighlight[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storyHighlights).where(eq(storyHighlights.authorId, authorId)).orderBy(desc(storyHighlights.createdAt));
}

export async function getHighlightById(id: number): Promise<StoryHighlight | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(storyHighlights).where(eq(storyHighlights.id, id)).limit(1);
  return result[0];
}

export async function deleteHighlight(id: number, authorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(storyHighlightItems).where(eq(storyHighlightItems.highlightId, id));
  await db.delete(storyHighlights).where(and(eq(storyHighlights.id, id), eq(storyHighlights.authorId, authorId)));
}

export async function addStoryToHighlight(highlightId: number, mediaUrl: string, mediaType: "photo" | "video", caption?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(storyHighlightItems).values({ highlightId, mediaUrl, mediaType, caption: caption ?? null });
  await db.update(storyHighlights).set({ updatedAt: new Date() }).where(eq(storyHighlights.id, highlightId));
}

export async function getHighlightItems(highlightId: number): Promise<StoryHighlightItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storyHighlightItems).where(eq(storyHighlightItems.highlightId, highlightId)).orderBy(storyHighlightItems.addedAt);
}

export async function removeHighlightItem(itemId: number, highlightId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(storyHighlightItems).where(and(eq(storyHighlightItems.id, itemId), eq(storyHighlightItems.highlightId, highlightId)));
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────

export async function toggleBookmark(userId: number, postId: number): Promise<{ bookmarked: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId))).limit(1);
  if (existing.length > 0) {
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
    return { bookmarked: false };
  } else {
    // Remove any duplicate rows from older deployments before inserting the
    // single canonical saved row for this user/post pair.
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
    await db.insert(bookmarks).values({ userId, postId });
    return { bookmarked: true };
  }
}

export async function getBookmarkedPostIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ postId: bookmarks.postId }).from(bookmarks).where(eq(bookmarks.userId, userId));
  return Array.from(new Set(rows.map((r) => r.postId)));
}

export async function getBookmarkedPosts(userId: number, limit = 30, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ post: posts })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function isPostBookmarked(userId: number, postId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId))).limit(1);
  return rows.length > 0;
}

export async function getBookmarkCounts(postIds: number[]): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || postIds.length === 0) return {};
  const rows = await db
    .select({ postId: bookmarks.postId, count: sql<number>`count(distinct ${bookmarks.userId})` })
    .from(bookmarks)
    .where(inArray(bookmarks.postId, postIds))
    .groupBy(bookmarks.postId);
  const result: Record<number, number> = {};
  for (const row of rows) result[row.postId] = Number(row.count);
  return result;
}

// ─── Post Reactions ────────────────────────────────────────────────────────────

type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry" | "seen";

export async function setPostReaction(userId: number, postId: number, reaction: ReactionType | null): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // The production Like count must be persisted in the legacy `likes` table because
  // feed/profile refreshes read that table. Do this first, outside the newer
  // `post_reactions` write, so a missing/out-of-date reaction table or enum cannot
  // make the visible Like button appear optimistic but save no durable record.
  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.targetId, postId), eq(likes.targetType, "post")));

  if (reaction) {
    await db.insert(likes).values({ userId, targetId: postId, targetType: "post" });
  }

  // Keep Facebook-style reactions as an enhancement. If this newer table is absent
  // or has an older enum on a deployed database, do not fail the Like operation;
  // the legacy likes row above is the source of truth for persistence and counts.
  try {
    await db.delete(postReactions).where(and(eq(postReactions.userId, userId), eq(postReactions.postId, postId)));
    if (reaction) {
      await db.insert(postReactions).values({ userId, postId, reaction });
    }
  } catch (error) {
    console.warn("post_reactions sync failed; persisted legacy like instead", { userId, postId, reaction, error });
  }
}

export async function getPostReactionCounts(postId: number): Promise<Record<ReactionType, number>> {
  const db = await getDb();
  const empty: Record<ReactionType, number> = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, seen: 0 };
  if (!db) return empty;

  // Count one effective reaction per user. The legacy likes table is always
  // included because it is the durable source used by feeds after refresh.
  const effectiveByUser = new Map<number, ReactionType>();

  try {
    const reactionRows = await db
      .select({ userId: postReactions.userId, reaction: postReactions.reaction })
      .from(postReactions)
      .where(eq(postReactions.postId, postId));
    for (const row of reactionRows) effectiveByUser.set(row.userId, row.reaction as ReactionType);
  } catch (error) {
    console.warn("post_reactions count read failed; using legacy likes only", { postId, error });
  }

  const legacyLikeRows = await db
    .select({ userId: likes.userId })
    .from(likes)
    .where(and(eq(likes.targetId, postId), eq(likes.targetType, "post")));
  for (const row of legacyLikeRows) {
    if (!effectiveByUser.has(row.userId)) effectiveByUser.set(row.userId, "like");
  }

  for (const reaction of Array.from(effectiveByUser.values())) {
    empty[reaction] = (empty[reaction] ?? 0) + 1;
  }
  return empty;
}

export async function getUserPostReaction(userId: number, postId: number): Promise<ReactionType | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select({ reaction: postReactions.reaction })
      .from(postReactions)
      .where(and(eq(postReactions.userId, userId), eq(postReactions.postId, postId)))
      .limit(1);
    if (rows.length > 0) return rows[0].reaction as ReactionType;
  } catch (error) {
    console.warn("post_reactions user read failed; using legacy like state", { userId, postId, error });
  }

  const legacyLike = await getLike(userId, postId, "post");
  return legacyLike ? "like" : null;
}

export async function getUserPostReactions(userId: number, postIds: number[]): Promise<Record<number, ReactionType>> {
  const db = await getDb();
  if (!db || postIds.length === 0) return {};
  const result: Record<number, ReactionType> = {};

  try {
    const rows = await db
      .select({ postId: postReactions.postId, reaction: postReactions.reaction })
      .from(postReactions)
      .where(and(eq(postReactions.userId, userId), inArray(postReactions.postId, postIds)));
    for (const row of rows) result[row.postId] = row.reaction as ReactionType;
  } catch (error) {
    console.warn("post_reactions batch user read failed; using legacy like states", { userId, error });
  }

  const legacyLikeRows = await db
    .select({ postId: likes.targetId })
    .from(likes)
    .where(and(eq(likes.userId, userId), inArray(likes.targetId, postIds), eq(likes.targetType, "post")));
  for (const row of legacyLikeRows) {
    if (!result[row.postId]) result[row.postId] = "like";
  }
  return result;
}

// ─── Video Views ──────────────────────────────────────────────────────────────
export async function incrementVideoViews(postId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await db.update(posts).set({ videoViews: sql`${posts.videoViews} + 1` }).where(eq(posts.id, postId));
  const rows = await db.select({ videoViews: posts.videoViews }).from(posts).where(eq(posts.id, postId)).limit(1);
  return rows[0]?.videoViews ?? 0;
}

// ─── Trending Posts ───────────────────────────────────────────────────────────
export async function getTrendingPosts(limit = 20): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  // Trending = posts with the most reactions in the last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Get post IDs ranked by reaction count in the last 7 days
  const reactionCounts = await db
    .select({ postId: postReactions.postId, cnt: sql<number>`count(*)` })
    .from(postReactions)
    .where(gte(postReactions.createdAt, since))
    .groupBy(postReactions.postId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  if (reactionCounts.length === 0) {
    // Fallback: most liked posts overall (last 30 days)
    const fallbackSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(posts)
      .where(and(isNull(posts.resharedFromId), gte(posts.createdAt, fallbackSince)))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
    return rows;
  }

  const postIds = reactionCounts.map((r) => r.postId);
  const postRows = await db.select().from(posts).where(inArray(posts.id, postIds));
  // Preserve ranking order from reactionCounts
  const postMap = new Map(postRows.map((p) => [p.id, p]));
  return postIds.map((id) => postMap.get(id)).filter(Boolean) as Post[];
}

// ─── Scheduled Posts ─────────────────────────────────────────────────────────

export async function getScheduledPosts(userId: number): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.authorId, userId),
        isNotNull(posts.scheduledAt),
        gt(posts.scheduledAt, now)
      )
    )
    .orderBy(asc(posts.scheduledAt));
}

export async function cancelScheduledPost(postId: number, authorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, authorId)));
  return (result[0] as { affectedRows: number }).affectedRows;
}

// ─── Admin Audit Log ──────────────────────────────────────────────────────────

export async function insertAuditLog(entry: InsertAdminAuditLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    // Omit id to let the database auto-generate it
    const { id, ...entryWithoutId } = entry as any;
    await db.insert(adminAuditLog).values(entryWithoutId);
  } catch (error) {
    // Log error but don't throw - audit log failure shouldn't block the action
    console.error("Failed to insert audit log:", error);
  }
}

export async function getAuditLogs(limit = 100, offset = 0): Promise<AdminAuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Shop Listings (Sale & Buy) ───────────────────────────────────────────────

function formatPostgresError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const candidate = error as Record<string, unknown>;
  return {
    message: candidate.message,
    code: candidate.code,
    detail: candidate.detail,
    hint: candidate.hint,
    table: candidate.table,
    column: candidate.column,
    constraint: candidate.constraint,
    dataType: candidate.dataType,
  };
}

export async function createShopListing(data: InsertShopListing): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(shopListings).values(data).returning({ id: shopListings.id });
    return result[0].id;
  } catch (error) {
    console.error("Sales & Buy listing insert failed", {
      dbError: formatPostgresError(error),
      attemptedFields: Object.keys(data),
    });
    throw error;
  }
}

export async function getShopListingById(id: number): Promise<ShopListing | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shopListings).where(eq(shopListings.id, id)).limit(1);
  return result[0];
}

export async function getShopListings(opts: {
  limit?: number;
  offset?: number;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: "active" | "sold" | "draft" | "removed";
}): Promise<ShopListing[]> {
  const db = await getDb();
  if (!db) return [];
  const { limit = 24, offset = 0, category, condition, minPrice, maxPrice, status = "active" } = opts;
  const filters = [eq(shopListings.status, status)];
  if (category && category !== "all") filters.push(eq(shopListings.category, category));
  if (condition && condition !== "all") filters.push(eq(shopListings.condition, condition as ShopListing["condition"]));
  if (minPrice !== undefined) filters.push(sql`CAST(${shopListings.price} AS DECIMAL) >= ${minPrice}`);
  if (maxPrice !== undefined) filters.push(sql`CAST(${shopListings.price} AS DECIMAL) <= ${maxPrice}`);
  return db
    .select()
    .from(shopListings)
    .where(and(...filters))
    .orderBy(desc(shopListings.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function searchShopListings(query: string, limit = 24): Promise<ShopListing[]> {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query.toLowerCase()}%`;
  return db
    .select()
    .from(shopListings)
    .where(and(
      eq(shopListings.status, "active"),
      sql`(LOWER(${shopListings.title}) LIKE ${q} OR LOWER(${shopListings.description}) LIKE ${q} OR LOWER(${shopListings.location}) LIKE ${q})`
    ))
    .orderBy(desc(shopListings.createdAt))
    .limit(limit);
}

export async function getMyShopListings(sellerId: number, limit = 50, offset = 0): Promise<ShopListing[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(shopListings)
    .where(eq(shopListings.sellerId, sellerId))
    .orderBy(desc(shopListings.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateShopListing(
  id: number,
  sellerId: number,
  data: Partial<Omit<InsertShopListing, "id" | "sellerId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(shopListings).set(data).where(and(eq(shopListings.id, id), eq(shopListings.sellerId, sellerId)));
}

export async function deleteShopListing(id: number, sellerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(shopListings).where(and(eq(shopListings.id, id), eq(shopListings.sellerId, sellerId)));
}

export async function incrementShopListingViews(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(shopListings).set({ viewCount: sql`${shopListings.viewCount} + 1` }).where(eq(shopListings.id, id));
}

export async function countShopListingsToday(sellerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(shopListings)
    .where(and(eq(shopListings.sellerId, sellerId), gte(shopListings.createdAt, midnight)));
  return Number(result[0]?.count ?? 0);
}

// ─── Shop Saved (Watchlist) ───────────────────────────────────────────────────

export async function saveShopListing(userId: number, listingId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(shopSaved)
    .where(and(eq(shopSaved.userId, userId), eq(shopSaved.listingId, listingId))).limit(1);
  if (existing.length === 0) {
    await db.insert(shopSaved).values({ userId, listingId });
  }
}

export async function unsaveShopListing(userId: number, listingId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(shopSaved).where(and(eq(shopSaved.userId, userId), eq(shopSaved.listingId, listingId)));
}

export async function isShopListingSaved(userId: number, listingId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(shopSaved)
    .where(and(eq(shopSaved.userId, userId), eq(shopSaved.listingId, listingId))).limit(1);
  return result.length > 0;
}

export async function getSavedShopListings(userId: number, limit = 50, offset = 0): Promise<ShopListing[]> {
  const db = await getDb();
  if (!db) return [];
  const saved = await db.select().from(shopSaved)
    .where(eq(shopSaved.userId, userId))
    .orderBy(desc(shopSaved.createdAt))
    .limit(limit).offset(offset);
  if (saved.length === 0) return [];
  const ids = saved.map((s) => s.listingId);
  return db.select().from(shopListings).where(inArray(shopListings.id, ids));
}

export async function adminGetShopListings(
  opts: { status?: string; isFlagged?: boolean; limit?: number; offset?: number }
): Promise<ShopListing[]> {
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (opts.status && opts.status !== "all") filters.push(eq(shopListings.status, opts.status as ShopListing["status"]));
  if (opts.isFlagged !== undefined) filters.push(eq(shopListings.isFlagged, opts.isFlagged));
  return db.select().from(shopListings)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(shopListings.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export async function adminUpdateShopListing(
  id: number,
  data: Partial<Pick<ShopListing, "status" | "isFlagged" | "flagReason" | "removedByAdminId">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(shopListings).set(data).where(eq(shopListings.id, id));
}

// ─── Media Limits ─────────────────────────────────────────────────────────────
export async function getMediaLimits(): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) {
    // Return hardcoded defaults if DB unavailable
    return {
      photo_max_mb: 25,
      video_max_mb: 50,
      video_max_seconds: 300,
      audio_max_mb: 5,
      audio_max_seconds: 360,
      doc_max_mb: 5,
    };
  }
  const defaults: Record<string, number> = {
    photo_max_mb: 25,
    video_max_mb: 50,
    video_max_seconds: 300,
    audio_max_mb: 5,
    audio_max_seconds: 360,
    doc_max_mb: 5,
  };
  try {
    const rows = await db.select().from(mediaLimits);
    const result: Record<string, number> = { ...defaults };
    for (const row of rows) {
      result[row.limitKey] = row.value;
    }
    return result;
  } catch {
    // If media_limits table doesn't exist or query fails, return defaults
    console.warn("[getMediaLimits] DB query failed, using defaults");
    return defaults;
  }
}

export async function setMediaLimit(key: string, value: number, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(mediaLimits)
    .values({ limitKey: key, value, updatedByAdminId: adminId })
    .onConflictDoUpdate({ target: mediaLimits.limitKey, set: { value, updatedByAdminId: adminId } });
}

// ─── Content Reports ──────────────────────────────────────────────────────────
export async function createContentReport(data: {
  reporterId: number;
  targetType: "post" | "comment" | "listing";
  targetId: number;
  reason: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(contentReports).values({
    reporterId: data.reporterId,
    targetType: data.targetType,
    targetId: data.targetId,
    reason: data.reason,
    status: "pending",
  }).returning({ id: contentReports.id });
  return result[0]?.id ?? 0;
}

export async function getContentReports(opts: {
  status?: string;
  targetType?: string;
  limit?: number;
  offset?: number;
}): Promise<ContentReport[]> {
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (opts.status && opts.status !== "all") {
    filters.push(eq(contentReports.status, opts.status as ContentReport["status"]));
  }
  if (opts.targetType && opts.targetType !== "all") {
    filters.push(eq(contentReports.targetType, opts.targetType as ContentReport["targetType"]));
  }
  return db.select().from(contentReports)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(contentReports.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

/** Retrieves the exact report selected by an administrator. */
export async function getContentReportById(id: number): Promise<ContentReport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(contentReports).where(eq(contentReports.id, id)).limit(1);
  return rows[0];
}

export async function updateContentReport(
  id: number,
  data: Partial<Pick<ContentReport, "status" | "adminNote" | "reviewedAt" | "reviewedByAdminId">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(contentReports).set(data).where(eq(contentReports.id, id));
}

// ─── Pages Admin ──────────────────────────────────────────────────────────────
export async function adminGetPages(opts: {
  search?: string;
  isSuspended?: boolean;
  limit?: number;
  offset?: number;
}): Promise<OrgPage[]> {
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (opts.search) {
    filters.push(sql`LOWER(${orgPages.name}) LIKE ${`%${opts.search.toLowerCase()}%`}`);
  }
  if (opts.isSuspended !== undefined) {
    filters.push(eq(orgPages.isSuspended, opts.isSuspended));
  }
  return db.select().from(orgPages)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(orgPages.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export async function adminUpdatePage(
  id: number,
  data: Partial<Pick<OrgPage, "isSuspended" | "suspendedAt" | "suspendedByAdminId" | "suspendReason">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orgPages).set(data).where(eq(orgPages.id, id));
}

// ─── Groups Admin ─────────────────────────────────────────────────────────────
export async function adminGetGroups(opts: {
  search?: string;
  isSuspended?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PublicGroup[]> {
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (opts.search) {
    filters.push(sql`LOWER(${publicGroups.name}) LIKE ${`%${opts.search.toLowerCase()}%`}`);
  }
  if (opts.isSuspended !== undefined) {
    filters.push(eq(publicGroups.isSuspended, opts.isSuspended));
  }
  return db.select().from(publicGroups)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(publicGroups.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export async function adminUpdateGroup(
  id: number,
  data: Partial<Pick<PublicGroup, "isSuspended" | "suspendedAt" | "suspendedByAdminId" | "suspendReason">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(publicGroups).set(data).where(eq(publicGroups.id, id));
}

// ─── Delete Account (cascade) ─────────────────────────────────────────────────
export async function deleteUserAccount(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete in dependency order (leaf tables first)
  await db.delete(shopSaved).where(eq(shopSaved.userId, userId));
  await db.delete(shopListings).where(eq(shopListings.sellerId, userId));
  await db.delete(contentReports).where(eq(contentReports.reporterId, userId));
  await db.delete(bookmarks).where(eq(bookmarks.userId, userId));
  await db.delete(postReactions).where(eq(postReactions.userId, userId));
  await db.delete(storyViews).where(eq(storyViews.viewerId, userId));
  await db.delete(storyReactions).where(eq(storyReactions.reactorId, userId));
  await db.delete(storyHighlights).where(eq(storyHighlights.authorId, userId));
  await db.delete(stories).where(eq(stories.authorId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(notifications).where(eq(notifications.actorId, userId));
  await db.delete(likes).where(eq(likes.userId, userId));
  await db.delete(pollVotes).where(eq(pollVotes.userId, userId));
  await db.delete(comments).where(eq(comments.authorId, userId));
  await db.delete(follows).where(eq(follows.followerId, userId));
  await db.delete(follows).where(eq(follows.followingId, userId));
  await db.delete(friendRequests).where(eq(friendRequests.senderId, userId));
  await db.delete(friendRequests).where(eq(friendRequests.receiverId, userId));
  await db.delete(friendships).where(eq(friendships.userId1, userId));
  await db.delete(friendships).where(eq(friendships.userId2, userId));
  await db.delete(activeSessions).where(eq(activeSessions.userId, userId));
  await db.delete(passkeys).where(eq(passkeys.userId, userId));
  await db.delete(totpSecrets).where(eq(totpSecrets.userId, userId));
  await db.delete(phoneVerifications).where(eq(phoneVerifications.userId, userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.delete(profilePhotos).where(eq(profilePhotos.userId, userId));
  await db.delete(coverPhotos).where(eq(coverPhotos.userId, userId));
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
  // Delete posts (and their associated data)
  const userPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, userId));
  for (const p of userPosts) {
    await db.delete(likes).where(and(eq(likes.targetId, p.id), eq(likes.targetType, "post")));
    await db.delete(postEdits).where(eq(postEdits.postId, p.id));
  }
  await db.delete(posts).where(eq(posts.authorId, userId));
  // Finally delete the user
  await db.delete(users).where(eq(users.id, userId));
}

// ─── Reels ────────────────────────────────────────────────────────────────────
import { reels, reelLikes, reelComments, reelViews } from "../drizzle/schema";

export async function createReel(data: {
  authorId: number;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration?: number;
  hashtags?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const durationSeconds = Math.max(0, Math.round(data.duration ?? 0));
  const [result] = await db.insert(reels).values({
    authorId: data.authorId,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl ?? null,
    caption: data.caption ?? null,
    duration: durationSeconds,
    hashtags: data.hashtags ?? null,
  }).returning({ id: reels.id });
  return result?.id ?? 0;
}

export async function getReelsFeed(
  limit: number,
  cursor: number | null,
  viewerUserId: number | null
): Promise<Array<{
  id: number; authorId: number; videoUrl: string; thumbnailUrl: string | null;
  caption: string | null; duration: number; viewCount: number; likeCount: number;
  commentCount: number; createdAt: Date;
  authorName: string | null; authorAvatar: string | null; isVerified: boolean;
  isLiked: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: reels.id, authorId: reels.authorId, videoUrl: reels.videoUrl,
      thumbnailUrl: reels.thumbnailUrl, caption: reels.caption,
      duration: reels.duration, viewCount: reels.viewCount,
      likeCount: reels.likeCount, commentCount: reels.commentCount,
      createdAt: reels.createdAt,
      authorName: users.name, authorAvatar: users.avatar, isVerified: users.isVerified,
    })
    .from(reels)
    .innerJoin(users, eq(reels.authorId, users.id))
    .where(cursor ? lt(reels.id, cursor) : undefined)
    .orderBy(desc(reels.id))
    .limit(limit);

  if (!rows.length) return [];

  let likedIds = new Set<number>();
  if (viewerUserId) {
    const reelIds = rows.map(r => r.id);
    const likesRows = await db
      .select({ reelId: reelLikes.reelId })
      .from(reelLikes)
      .where(and(eq(reelLikes.userId, viewerUserId), inArray(reelLikes.reelId, reelIds)));
    likedIds = new Set(likesRows.map(l => l.reelId));
  }

  return rows.map(r => ({ ...r, isVerified: r.isVerified ?? false, isLiked: likedIds.has(r.id) }));
}

export async function toggleReelLike(reelId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select({ id: reelLikes.id })
    .from(reelLikes)
    .where(and(eq(reelLikes.reelId, reelId), eq(reelLikes.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(reelLikes).where(and(eq(reelLikes.reelId, reelId), eq(reelLikes.userId, userId)));
    try {
      await db.update(reels).set({ likeCount: sql`GREATEST(likeCount - 1, 0)` }).where(eq(reels.id, reelId));
    } catch (err) {
      console.warn("Warning: Could not update likeCount.", err);
    }
    let likeCount = 0;
    try {
      const [updated] = await db.select({ likeCount: reels.likeCount }).from(reels).where(eq(reels.id, reelId));
      likeCount = updated?.likeCount ?? 0;
    } catch (err) {
      console.warn("Warning: Could not fetch updated likeCount.", err);
    }
    return { liked: false, likeCount };
  } else {
    await db.insert(reelLikes).values({ reelId, userId });
    try {
      await db.update(reels).set({ likeCount: sql`likeCount + 1` }).where(eq(reels.id, reelId));
    } catch (err) {
      console.warn("Warning: Could not update likeCount.", err);
    }
    let likeCount = 0;
    try {
      const [updated] = await db.select({ likeCount: reels.likeCount }).from(reels).where(eq(reels.id, reelId));
      likeCount = updated?.likeCount ?? 0;
    } catch (err) {
      console.warn("Warning: Could not fetch updated likeCount.", err);
    }
    return { liked: true, likeCount };
  }
}

export async function recordReelView(reelId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ id: reelViews.id })
    .from(reelViews)
    .where(and(eq(reelViews.reelId, reelId), eq(reelViews.userId, userId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(reelViews).values({ reelId, userId });
    await db.update(reels).set({ viewCount: sql`viewCount + 1` }).where(eq(reels.id, reelId));
  }
}

export async function addReelComment(reelId: number, authorId: number, content: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.insert(reelComments).values({ reelId, authorId, content }).returning({ id: reelComments.id });
  try {
    await db.update(reels).set({ commentCount: sql`commentCount + 1` }).where(eq(reels.id, reelId));
  } catch (err) {
    console.warn("Warning: Could not update commentCount. The column may not exist.", err);
  }
  return results[0]?.id ?? 0;
}

export async function getReelComments(reelId: number): Promise<Array<{
  id: number; reelId: number; authorId: number; content: string; createdAt: Date;
  authorName: string | null; authorAvatar: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reelComments.id, reelId: reelComments.reelId, authorId: reelComments.authorId,
      content: reelComments.content, createdAt: reelComments.createdAt,
      authorName: users.name, authorAvatar: users.avatar,
    })
    .from(reelComments)
    .innerJoin(users, eq(reelComments.authorId, users.id))
    .where(eq(reelComments.reelId, reelId))
    .orderBy(asc(reelComments.createdAt));
}

export async function deleteReel(reelId: number, authorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(reelComments).where(eq(reelComments.reelId, reelId));
  await db.delete(reelLikes).where(eq(reelLikes.reelId, reelId));
  await db.delete(reelViews).where(eq(reelViews.reelId, reelId));
  await db.delete(reels).where(and(eq(reels.id, reelId), eq(reels.authorId, authorId)));
}

export async function getReelById(
  reelId: number,
  viewerUserId: number | null
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: reels.id, authorId: reels.authorId, videoUrl: reels.videoUrl,
      thumbnailUrl: reels.thumbnailUrl, caption: reels.caption,
      duration: reels.duration, viewCount: reels.viewCount,
      likeCount: reels.likeCount, commentCount: reels.commentCount,
      hashtags: reels.hashtags,
      createdAt: reels.createdAt,
      authorName: users.name, authorAvatar: users.avatar, isVerified: users.isVerified,
    })
    .from(reels)
    .innerJoin(users, eq(reels.authorId, users.id))
    .where(eq(reels.id, reelId))
    .limit(1);
  if (!rows.length) return null;
  const r = rows[0];
  let isLiked = false;
  if (viewerUserId) {
    const lk = await db.select({ id: reelLikes.id }).from(reelLikes)
      .where(and(eq(reelLikes.reelId, reelId), eq(reelLikes.userId, viewerUserId))).limit(1);
    isLiked = lk.length > 0;
  }
  return { ...r, isVerified: r.isVerified ?? false, isLiked };
}

export async function getFollowingReelsFeed(
  limit: number,
  cursor: number | null,
  viewerUserId: number
) {
  const db = await getDb();
  if (!db) return [];
  const followedRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, viewerUserId));
  const followedIds = followedRows.map(f => f.followingId);
  if (!followedIds.length) return [];
  const rows = await db
    .select({
      id: reels.id, authorId: reels.authorId, videoUrl: reels.videoUrl,
      thumbnailUrl: reels.thumbnailUrl, caption: reels.caption,
      duration: reels.duration, viewCount: reels.viewCount,
      likeCount: reels.likeCount, commentCount: reels.commentCount,
      hashtags: reels.hashtags,
      createdAt: reels.createdAt,
      authorName: users.name, authorAvatar: users.avatar, isVerified: users.isVerified,
    })
    .from(reels)
    .innerJoin(users, eq(reels.authorId, users.id))
    .where(and(
      inArray(reels.authorId, followedIds),
      cursor ? lt(reels.id, cursor) : undefined
    ))
    .orderBy(desc(reels.id))
    .limit(limit);
  if (!rows.length) return [];
  const reelIds = rows.map(r => r.id);
  const likesRows = await db
    .select({ reelId: reelLikes.reelId })
    .from(reelLikes)
    .where(and(eq(reelLikes.userId, viewerUserId), inArray(reelLikes.reelId, reelIds)));
  const likedIds = new Set(likesRows.map(l => l.reelId));
  return rows.map(r => ({ ...r, isVerified: r.isVerified ?? false, isLiked: likedIds.has(r.id) }));
}

export async function getReelHashtags(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ hashtags: reels.hashtags })
    .from(reels)
    .where(sql`hashtags IS NOT NULL AND hashtags != ''`);
  const tagSet = new Set<string>();
  for (const row of rows) {
    if (row.hashtags) {
      row.hashtags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).forEach(t => tagSet.add(t));
    }
  }
  return Array.from(tagSet).sort();
}

// ─── Call History ─────────────────────────────────────────────────────────────

export async function insertCallHistory(data: {
  callerId: number;
  calleeId: number;
  type: "voice" | "video";
  status: "missed" | "answered" | "declined";
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(callHistory).values({
    callerId: data.callerId,
    calleeId: data.calleeId,
    type: data.type,
    status: data.status,
    startedAt: data.startedAt ?? new Date(),
    endedAt: data.endedAt ?? null,
    duration: data.duration ?? 0,
  });
  return (result as any)[0]?.id ?? 0;
}

export async function getCallHistory(userId: number, limit = 30, cursor?: number): Promise<Array<{
  id: number; callerId: number; calleeId: number; type: string; status: string;
  startedAt: Date; endedAt: Date | null; duration: number;
  peerName: string | null; peerAvatar: string | null; peerId: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: callHistory.id,
      callerId: callHistory.callerId,
      calleeId: callHistory.calleeId,
      type: callHistory.type,
      status: callHistory.status,
      startedAt: callHistory.startedAt,
      endedAt: callHistory.endedAt,
      duration: callHistory.duration,
      peerName: users.name,
      peerAvatar: users.avatar,
      peerId: users.id,
    })
    .from(callHistory)
    .innerJoin(
      users,
      sql`(${callHistory.callerId} = ${userId} AND ${users.id} = ${callHistory.calleeId})
       OR (${callHistory.calleeId} = ${userId} AND ${users.id} = ${callHistory.callerId})`
    )
    .where(
      and(
        sql`(${callHistory.callerId} = ${userId} OR ${callHistory.calleeId} = ${userId})`,
        cursor ? lt(callHistory.id, cursor) : undefined
      )
    )
    .orderBy(desc(callHistory.id))
    .limit(limit);
  return rows;
}

// ─── Push Subscriptions ───────────────────────────────────────────────────────
export async function savePushSubscription(userId: number, endpoint: string, p256dh: string, auth: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Upsert by endpoint — replace if already exists for this user
  const existing = await db.select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth });
  }
}

export async function deletePushSubscription(userId: number, endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function getPushSubscriptionsForUser(userId: number): Promise<Array<{ endpoint: string; p256dh: string; auth: string }>> {
  const db = await getDb();
  if (!db) return [];
  return db.select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

// ─── Missed call badge ────────────────────────────────────────────────────────
export async function getMissedCallCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const userRow = await db.select({ lastCallsSeenAt: users.lastCallsSeenAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!userRow.length) return 0;
  const since = userRow[0].lastCallsSeenAt;
  const rows = await db.select({ id: callHistory.id })
    .from(callHistory)
    .where(
      and(
        eq(callHistory.calleeId, userId),
        eq(callHistory.status, "missed"),
        gt(callHistory.startedAt, since)
      )
    );
  return rows.length;
}

export async function updateLastCallsSeen(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ lastCallsSeenAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Support Messages ─────────────────────────────────────────────────────────
import { supportMessages, SupportMessage, supportReplies } from "../drizzle/schema";

export async function createSupportMessage(data: {
  userId: number;
  topic: string;
  message: string;
  phone?: string | null;
  whatsapp?: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supportMessages).values({
    userId: data.userId,
    topic: data.topic,
    message: data.message,
    phone: data.phone ?? null,
    whatsapp: data.whatsapp ?? null,
  }).returning({ id: supportMessages.id });
  return result[0].id;
}

export async function getSupportMessages(limit = 50, offset = 0): Promise<Array<{ id: number; userId: number; topic: string; message: string; phone: string | null; whatsapp: string | null; isRead: boolean; status: string; createdAt: Date; userName: string | null; userEmail: string | null; userAvatar: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: supportMessages.id,
      userId: supportMessages.userId,
      topic: supportMessages.topic,
      message: supportMessages.message,
      phone: supportMessages.phone,
      whatsapp: supportMessages.whatsapp,
      isRead: supportMessages.isRead,
      status: supportMessages.status,
      createdAt: supportMessages.createdAt,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.avatar,
    })
    .from(supportMessages)
    .innerJoin(users, eq(supportMessages.userId, users.id))
    .orderBy(desc(supportMessages.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function markSupportMessageRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(supportMessages).set({ isRead: true }).where(eq(supportMessages.id, id));
}

export async function getAdminUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.role} IN ('admin', 'super_admin')`);
  return rows.map(r => r.id);
}

export async function getUserSupportMessages(userId: number): Promise<import("../drizzle/schema").SupportMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.userId, userId))
    .orderBy(desc(supportMessages.createdAt));
}

export async function getSupportUnreadCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(supportMessages)
    .where(eq(supportMessages.isRead, false));
  return Number(rows[0]?.count ?? 0);
}

// ─── Support Replies ──────────────────────────────────────────────────────────
export async function createSupportReply(
  messageId: number, adminId: number, adminName: string | null, content: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  await db.insert(supportReplies).values({ messageId, adminId, adminName, content, createdAt: now });
  // Mark the original message as read when admin replies
  await db.update(supportMessages).set({ isRead: true }).where(eq(supportMessages.id, messageId));
  return { messageId, adminId, content, createdAt: now };
}

export async function getSupportReplies(messageId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportReplies).where(eq(supportReplies.messageId, messageId)).orderBy(supportReplies.createdAt);
}

export async function getSupportTopicStats() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ topic: supportMessages.topic }).from(supportMessages);
  const counts: Record<string, number> = {};
  for (const r of rows) { counts[r.topic] = (counts[r.topic] ?? 0) + 1; }
  return Object.entries(counts).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count);
}

export async function resolveSupportMessage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(supportMessages).set({ status: "resolved", isRead: true }).where(eq(supportMessages.id, id));
}

export async function getAdminEmails(): Promise<Array<{ id: number; email: string | null; name: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(inArray(users.role, ["admin", "super_admin"]));
}

// ─── Message Reactions ────────────────────────────────────────────────────────
export async function addMessageReaction(messageId: number, userId: number, emoji: string) {
  const db = await getDb();
  if (!db) return null;
  // Remove existing reaction from this user on this message (toggle/replace)
  await db.delete(messageReactions).where(
    and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId))
  );
  // If same emoji was sent again, it's a toggle-off (already deleted above), so check
  const [inserted] = await db.insert(messageReactions).values({ messageId, userId, emoji }).returning();
  return inserted;
}

export async function removeMessageReaction(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(messageReactions).where(
    and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId))
  );
}

export async function getMessageReactions(conversationId: number): Promise<MessageReaction[]> {
  const db = await getDb();
  if (!db) return [];
  // Get all reactions for messages in this conversation
  const msgs = await db.select({ id: messages.id }).from(messages).where(eq(messages.conversationId, conversationId));
  if (msgs.length === 0) return [];
  const msgIds = msgs.map((m) => m.id);
  return db.select().from(messageReactions).where(inArray(messageReactions.messageId, msgIds));
}

// ─── DM Message Deletion ──────────────────────────────────────────────────────
export async function deleteMessage(messageId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [msg] = await db.select({ senderId: messages.senderId }).from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg || msg.senderId !== userId) return false;
  await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, messageId));
  return true;
}

// ─── User Presence ────────────────────────────────────────────────────────────
export async function updateUserLastSeen(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
}

export async function getUserLastSeen(userId: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select({ lastSeenAt: users.lastSeenAt }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.lastSeenAt ?? null;
}

// ─── DM Message Forwarding ────────────────────────────────────────────────────
export async function forwardMessage(
  sourceMessageId: number,
  toConversationId: number,
  senderId: number
): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const [src] = await db
    .select({
      text: messages.text,
      fileUrl: messages.fileUrl,
      fileName: messages.fileName,
      fileSize: messages.fileSize,
      fileType: messages.fileType,
    })
    .from(messages)
    .where(eq(messages.id, sourceMessageId))
    .limit(1);
  if (!src) return null;
  const [row] = await db
    .insert(messages)
    .values({
      conversationId: toConversationId,
      senderId,
      text: encryptChatText(decryptChatText(src.text)) ?? undefined,
      fileUrl: src.fileUrl ?? undefined,
      fileName: src.fileName ?? undefined,
      fileSize: src.fileSize ?? undefined,
      fileType: src.fileType ?? undefined,
    })
    .returning({ id: messages.id });
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, toConversationId));
  return { id: row?.id ?? 0 };
}

// ─── Message Pinning ──────────────────────────────────────────────────────────
export async function pinDmMessage(messageId: number, conversationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ pinnedAt: new Date() }).where(
    and(eq(messages.id, messageId), eq(messages.conversationId, conversationId))
  );
}

export async function unpinDmMessage(messageId: number, conversationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ pinnedAt: null }).where(
    and(eq(messages.id, messageId), eq(messages.conversationId, conversationId))
  );
}

export async function getPinnedDmMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), isNotNull(messages.pinnedAt)))
    .orderBy(desc(messages.pinnedAt));
  return rows.map(decryptDirectMessageRow);
}

// ─── Read Receipts ────────────────────────────────────────────────────────────
export async function updateLastReadMessage(conversationId: number, userId: number, messageId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv) return;
  if (conv.participant1Id === userId) {
    await db.update(conversations).set({ lastReadMessageIdP1: messageId }).where(eq(conversations.id, conversationId));
  } else if (conv.participant2Id === userId) {
    await db.update(conversations).set({ lastReadMessageIdP2: messageId }).where(eq(conversations.id, conversationId));
  }
}

export async function getConversationReadState(conversationId: number): Promise<{ lastReadMessageIdP1: number | null; lastReadMessageIdP2: number | null } | null> {
  const db = await getDb();
  if (!db) return null;
  const [conv] = await db
    .select({ lastReadMessageIdP1: conversations.lastReadMessageIdP1, lastReadMessageIdP2: conversations.lastReadMessageIdP2 })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return conv ?? null;
}

// ─── Group Message Reactions ──────────────────────────────────────────────────
export async function addGroupReaction(groupMessageId: number, userId: number, emoji: string) {
  const db = await getDb();
  if (!db) return { ok: false };
  await db.delete(groupMessageReactions)
    .where(and(eq(groupMessageReactions.groupMessageId, groupMessageId), eq(groupMessageReactions.userId, userId)));
  await db.insert(groupMessageReactions).values({
    groupMessageId,
    userId,
    emoji,
    createdAt: Math.floor(Date.now() / 1000),
  });
  return { ok: true };
}
export async function removeGroupReaction(groupMessageId: number, userId: number) {
  const db = await getDb();
  if (!db) return { ok: false };
  await db.delete(groupMessageReactions)
    .where(and(eq(groupMessageReactions.groupMessageId, groupMessageId), eq(groupMessageReactions.userId, userId)));
  return { ok: true };
}
export async function getGroupReactions(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  const msgs = await db.select({ id: groupMessages.id })
    .from(groupMessages)
    .where(eq(groupMessages.groupId, groupId));
  if (!msgs.length) return [];
  const msgIds = msgs.map((m: { id: number }) => m.id);
  const reactions = await db.select()
    .from(groupMessageReactions)
    .where(inArray(groupMessageReactions.groupMessageId, msgIds));
  return reactions;
}
export async function getGroupUnreadCount(groupId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const result = await db.select({ count: sql<number>`count(*)::int` })
    .from(groupMessages)
    .where(and(
      eq(groupMessages.groupId, groupId),
      ne(groupMessages.senderId, userId),
      gt(groupMessages.createdAt, since),
    ));
  return result[0]?.count ?? 0;
}

export async function getTotalGroupUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Get all groups the user is a member of
  const memberships = await db.select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  if (!memberships.length) return 0;
  const groupIds = memberships.map((m: { groupId: number }) => m.groupId);
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const result = await db.select({ count: sql<number>`count(*)::int` })
    .from(groupMessages)
    .where(and(
      inArray(groupMessages.groupId, groupIds),
      ne(groupMessages.senderId, userId),
      gt(groupMessages.createdAt, since),
    ));
  return result[0]?.count ?? 0;
}

// ─── Group Message Pinning ────────────────────────────────────────────────────
export async function pinGroupMessage(messageId: number, groupId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(groupMessages)
    .set({ pinnedAt: new Date() })
    .where(and(eq(groupMessages.id, messageId), eq(groupMessages.groupId, groupId)));
}

export async function unpinGroupMessage(messageId: number, groupId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(groupMessages)
    .set({ pinnedAt: null })
    .where(and(eq(groupMessages.id, messageId), eq(groupMessages.groupId, groupId)));
}

export async function getPinnedGroupMessages(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(groupMessages)
    .where(and(eq(groupMessages.groupId, groupId), isNotNull(groupMessages.pinnedAt)))
    .orderBy(desc(groupMessages.pinnedAt));
  return rows.map(decryptGroupMessageRow);
}

// ─── DM Mute ─────────────────────────────────────────────────────────────────
export async function muteDmConversation(conversationId: number, userId: number, mutedUntil: Date | null) {
  const db = await getDb();
  if (!db) return;
  const conv = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv.length) return;
  const c = conv[0];
  if (c.participant1Id === userId) {
    await db.update(conversations).set({ mutedUntilP1: mutedUntil }).where(eq(conversations.id, conversationId));
  } else if (c.participant2Id === userId) {
    await db.update(conversations).set({ mutedUntilP2: mutedUntil }).where(eq(conversations.id, conversationId));
  }
}

export async function getDmMuteStatus(conversationId: number, userId: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const conv = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv.length) return null;
  const c = conv[0];
  if (c.participant1Id === userId) return c.mutedUntilP1 ?? null;
  if (c.participant2Id === userId) return c.mutedUntilP2 ?? null;
  return null;
}

// ─── Group Mute ───────────────────────────────────────────────────────────────
export async function muteGroupConversation(groupId: number, userId: number, mutedUntil: Date | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(groupMembers)
    .set({ mutedUntil })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
}

export async function getGroupMuteStatus(groupId: number, userId: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const member = await db.select().from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return member[0]?.mutedUntil ?? null;
}

// ─── User Blocks ──────────────────────────────────────────────────────────────
export async function blockUser(blockerId: number, blockedId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();
}

export async function unblockUser(blockerId: number, blockedId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
}

export async function getBlockedUsers(blockerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: blocks.id,
    blockedId: blocks.blockedId,
    createdAt: blocks.createdAt,
    blockedUserName: users.name,
    blockedUserAvatar: users.avatar,
  })
    .from(blocks)
    .leftJoin(users, eq(users.id, blocks.blockedId))
    .where(eq(blocks.blockerId, blockerId))
    .orderBy(desc(blocks.createdAt));
  return rows.map((r) => ({
    id: r.id,
    blockedId: r.blockedId,
    createdAt: r.createdAt,
    blockedUser: { name: r.blockedUserName, avatar: r.blockedUserAvatar },
  }));
}

export async function isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: blocks.id }).from(blocks)
    .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)))
    .limit(1);
  return result.length > 0;
}

// ─── Post Edit History ────────────────────────────────────────────────────────
export async function recordPostEdit(postId: number, authorId: number, previousText: string | null, newText: string | null): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record post edit: database not available");
    return;
  }

  try {
    await db.insert(postEditHistory).values({
      postId,
      authorId,
      previousText: previousText ?? null,
      newText: newText ?? null,
    });
  } catch (error) {
    console.error("[Database] Failed to record post edit:", error);
  }
}

// ─── Feed Advertisements ──────────────────────────────────────────────────────
export async function getActiveFeedAd(slot?: number): Promise<FeedAd | null> {
  const db = await getDb();
  if (!db) return null;
  // Supports both random rotation and deterministic slot placement. When the
  // feed passes slot 1, 2, 3..., each eighth-post placement walks through all
  // active ads in creation order, so 4, 5, or more active ads can rotate clearly.
  const rows = await db
    .select()
    .from(feedAds)
    .where(eq(feedAds.isActive, true))
    .orderBy(asc(feedAds.createdAt), asc(feedAds.id));
  if (rows.length === 0) return null;
  if (slot && Number.isFinite(slot) && slot > 0) {
    return rows[(Math.floor(slot) - 1) % rows.length];
  }
  return rows[Math.floor(Math.random() * rows.length)];
}

export async function listFeedAds(): Promise<FeedAd[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedAds).orderBy(asc(feedAds.createdAt), asc(feedAds.id));
}

export async function upsertFeedAd(data: Partial<InsertFeedAd> & { id?: number }): Promise<FeedAd> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { id, ...fields } = data;
  // NOTE: Multiple ads can be active simultaneously (rotation). No auto-deactivation.
  if (id) {
    const rows = await db.update(feedAds).set({ ...fields, updatedAt: new Date() }).where(eq(feedAds.id, id)).returning();
    return rows[0];
  } else {
    const rows = await db.insert(feedAds).values({ ...fields, updatedAt: new Date() } as InsertFeedAd).returning();
    return rows[0];
  }
}

export async function trackAdEvent(adId: number, eventType: "impression" | "click", userId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(adEvents).values({ adId, eventType, userId: userId ?? null } as InsertAdEvent);
}

export async function getAdStats(): Promise<{ adId: number; impressions: number; clicks: number; ctr: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      adId: adEvents.adId,
      eventType: adEvents.eventType,
      count: sql<number>`COUNT(*)`,
    })
    .from(adEvents)
    .groupBy(adEvents.adId, adEvents.eventType);
  // Aggregate per adId
  const map = new Map<number, { impressions: number; clicks: number }>();
  for (const row of rows) {
    if (!map.has(row.adId)) map.set(row.adId, { impressions: 0, clicks: 0 });
    const entry = map.get(row.adId)!;
    if (row.eventType === "impression") entry.impressions = Number(row.count);
    else entry.clicks = Number(row.count);
  }
  return Array.from(map.entries()).map(([adId, { impressions, clicks }]) => ({
    adId,
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
  }));
}

export async function deleteFeedAd(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(feedAds).where(eq(feedAds.id, id));
}

// ─── Home News Feed Sources ──────────────────────────────────────────────────
export async function listNewsFeedSources(includeInactive = false): Promise<NewsFeedSource[]> {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(newsFeedSources);
  if (includeInactive) {
    return query.orderBy(asc(newsFeedSources.displayOrder), asc(newsFeedSources.id));
  }
  return query.where(eq(newsFeedSources.isActive, true)).orderBy(asc(newsFeedSources.displayOrder), asc(newsFeedSources.id));
}

export async function upsertNewsFeedSource(data: Partial<InsertNewsFeedSource> & { id?: number }): Promise<NewsFeedSource> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { id, ...fields } = data;
  if (id) {
    const rows = await db
      .update(newsFeedSources)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(newsFeedSources.id, id))
      .returning();
    return rows[0];
  }
  const rows = await db
    .insert(newsFeedSources)
    .values({ ...fields, updatedAt: new Date() } as InsertNewsFeedSource)
    .returning();
  return rows[0];
}

export async function deleteNewsFeedSource(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(newsFeedSources).where(eq(newsFeedSources.id, id));
}

// ─── People You May Know (user suggestions) ─────────────────────────────────────────────
export async function getSuggestedUsers(
  viewerId: number,
  limit = 6
): Promise<(Pick<User, "id" | "name" | "avatar" | "isVerified"> & { mutualFriends: number })[]> {
  const db = await getDb();
  if (!db) return [];

  // Get viewer's accepted friends (both directions)
  const viewerFriends = await db
    .select({ a: sql<number>`"requesterId"`, b: sql<number>`"receiverId"` })
    .from(sql`friend_requests`)
    .where(sql`("requesterId" = ${viewerId} OR "receiverId" = ${viewerId}) AND "status" = 'accepted'`)
    .catch(() => []);
  const viewerFriendIds = Array.from(new Set(viewerFriends.flatMap((r) => [r.a, r.b]).filter((id) => id !== viewerId)));

  // Get IDs already followed
  const followed = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId));
  const followedIds = followed.map((r) => r.id);

  // Get IDs with any friend requests (pending or accepted)
  const allFriendReqs = await db
    .select({ a: sql<number>`"requesterId"`, b: sql<number>`"receiverId"` })
    .from(sql`friend_requests`)
    .where(sql`"requesterId" = ${viewerId} OR "receiverId" = ${viewerId}`)
    .catch(() => []);
  const allFriendIds = allFriendReqs.flatMap((r) => [r.a, r.b]).filter((id) => id !== viewerId);
  const excludeIds = Array.from(new Set([viewerId, ...followedIds, ...allFriendIds]));

  // Fetch candidate users
  const candidates = await db
    .select({ id: users.id, name: users.name, avatar: users.avatar, isVerified: users.isVerified })
    .from(users)
    .where(and(notInArray(users.id, excludeIds.length ? excludeIds : [-1]), eq(users.emailVerified, true)))
    .limit(50); // fetch more than needed so we can rank by mutual friends

  if (candidates.length === 0) return [];

  // For each candidate, count mutual friends (friends of viewer who are also friends of candidate)
  const ranked = await Promise.all(
    candidates.map(async (candidate) => {
      if (viewerFriendIds.length === 0) return { ...candidate, mutualFriends: 0 };
      // Get candidate's accepted friends
      const candFriends = await db
        .select({ a: sql<number>`"requesterId"`, b: sql<number>`"receiverId"` })
        .from(sql`friend_requests`)
        .where(sql`("requesterId" = ${candidate.id} OR "receiverId" = ${candidate.id}) AND "status" = 'accepted'`)
        .catch(() => []);
      const candFriendIds = new Set(candFriends.flatMap((r) => [r.a, r.b]).filter((id) => id !== candidate.id));
      const mutual = viewerFriendIds.filter((id) => candFriendIds.has(id)).length;
      return { ...candidate, mutualFriends: mutual };
    })
  );

  // Sort: most mutual friends first, then random for ties
  ranked.sort((a, b) => b.mutualFriends - a.mutualFriends || Math.random() - 0.5);
  return ranked.slice(0, limit);
}
// ─── Org Page Posts ──────────────────────────────────────────────────────────
export async function createOrgPagePost(data: InsertOrgPagePost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orgPagePosts).values(data).returning({ id: orgPagePosts.id });
  return result[0].id;
}

export async function getOrgPagePosts(pageId: number, limit = 20, offset = 0): Promise<OrgPagePost[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orgPagePosts)
    .where(eq(orgPagePosts.pageId, pageId))
    .orderBy(desc(orgPagePosts.createdAt))
    .limit(limit).offset(offset);
}

export async function deleteOrgPagePost(id: number, authorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(orgPagePosts).where(and(eq(orgPagePosts.id, id), eq(orgPagePosts.authorId, authorId)));
}

// ─── Comment Reactions ──────────────────────────────────────────────────────
export async function toggleCommentReaction(commentId: number, userId: number, reaction: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db.select().from(commentReactions)
    .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId), eq(commentReactions.reaction, reaction as any)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.delete(commentReactions)
      .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId), eq(commentReactions.reaction, reaction as any)));
  } else {
    await db.insert(commentReactions).values({ commentId, userId, reaction: reaction as any });
  }
}

export async function getCommentReactionCounts(commentId: number): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  
  const result = await db.select({
    reaction: commentReactions.reaction,
    count: sql<number>`count(*)`,
  }).from(commentReactions)
    .where(eq(commentReactions.commentId, commentId))
    .groupBy(commentReactions.reaction);
  
  return result.reduce((acc, row) => {
    acc[row.reaction] = row.count;
    return acc;
  }, {} as Record<string, number>);
}

export async function getCommentReactionUsers(commentId: number, reaction: string): Promise<{id: number; name: string | null}[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({ id: users.id, name: users.name })
    .from(commentReactions)
    .innerJoin(users, eq(commentReactions.userId, users.id))
    .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.reaction, reaction as any)))
    .limit(5);
}



// ─── Inactive User Reminders ────────────────────────────────────────────────
export const INACTIVE_REMINDER_DAYS = 14;
export const INACTIVE_REMINDER_REPEAT_DAYS = 30;
export const INACTIVE_REMINDER_BATCH_LIMIT = 100;

export type InactiveReminderCandidate = {
  id: number;
  name: string | null;
  email: string | null;
  lastSeenAt: Date;
};

export type InactiveReminderSummary = {
  inactiveUsers: number;
  eligibleUsers: number;
  remindersSentLast30Days: number;
  latestReminderAt: Date | null;
  batchLimit: number;
};

function dateDaysAgo(days: number): Date {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value;
}

/**
 * Finds users who have not used the site for the configured period and have
 * not received an inactivity reminder in the last 30 days. `lastSeenAt` is
 * maintained by the authenticated presence path, unlike `createdAt`.
 */
export async function getInactiveUsers(
  inactiveDays: number = INACTIVE_REMINDER_DAYS,
  reminderRepeatDays: number = INACTIVE_REMINDER_REPEAT_DAYS,
): Promise<InactiveReminderCandidate[]> {
  const db = await getDb();
  if (!db) return [];

  const inactiveCutoff = dateDaysAgo(inactiveDays);
  // The database receives only direct typed predicates here. The prior
  // correlated SQL condition was rejected by the live driver's prepared query
  // path, leaving the entire reminder administration panel unusable.
  const candidates = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    lastSeenAt: users.lastSeenAt,
  })
    .from(users)
    .where(and(
      lt(users.lastSeenAt, inactiveCutoff),
      isNotNull(users.email),
      inArray(users.role, ["user", "admin"]),
    ))
    .orderBy(asc(users.lastSeenAt))
    .limit(INACTIVE_REMINDER_BATCH_LIMIT);

  const eligible = await Promise.all(candidates.map(async (candidate) => {
    const recentlyReminded = await hasRecentReminder(candidate.id, reminderRepeatDays);
    return recentlyReminded ? null : candidate;
  }));

  return eligible.filter((candidate): candidate is InactiveReminderCandidate => candidate !== null);
}

export async function getInactiveReminderSummary(): Promise<InactiveReminderSummary> {
  const db = await getDb();
  if (!db) {
    return {
      inactiveUsers: 0,
      eligibleUsers: 0,
      remindersSentLast30Days: 0,
      latestReminderAt: null,
      batchLimit: INACTIVE_REMINDER_BATCH_LIMIT,
    };
  }

  const inactiveCutoff = dateDaysAgo(INACTIVE_REMINDER_DAYS);
  const reminderCutoff = dateDaysAgo(INACTIVE_REMINDER_REPEAT_DAYS);

  const [inactiveResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(
      lt(users.lastSeenAt, inactiveCutoff),
      inArray(users.role, ["user", "admin"]),
    ));

  // Use the exact same safe candidate-and-repeat-window logic as the delivery
  // process. The UI explicitly identifies this as a bounded sending batch.
  const eligibleUsers = await getInactiveUsers(
    INACTIVE_REMINDER_DAYS,
    INACTIVE_REMINDER_REPEAT_DAYS,
  );

  const [sentResult] = await db.select({
    count: sql<number>`count(*)::int`,
    latest: sql<Date | null>`max(${inactiveUserReminders.emailSentAt})`,
  })
    .from(inactiveUserReminders)
    .where(gte(inactiveUserReminders.emailSentAt, reminderCutoff));

  return {
    inactiveUsers: inactiveResult?.count ?? 0,
    eligibleUsers: eligibleUsers.length,
    remindersSentLast30Days: sentResult?.count ?? 0,
    latestReminderAt: sentResult?.latest ?? null,
    batchLimit: INACTIVE_REMINDER_BATCH_LIMIT,
  };
}

export async function recordInactiveUserReminder(userId: number, lastActivityAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable; reminder delivery was not recorded.");

  await db.insert(inactiveUserReminders).values({
    userId,
    emailSentAt: new Date(),
    lastActivityAt,
    reminderType: "14_days_inactive",
  });
}

export async function hasRecentReminder(userId: number, days: number = INACTIVE_REMINDER_REPEAT_DAYS): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const cutoffDate = dateDaysAgo(days);

  const result = await db.select({ id: inactiveUserReminders.id })
    .from(inactiveUserReminders)
    .where(and(
      eq(inactiveUserReminders.userId, userId),
      gte(inactiveUserReminders.emailSentAt, cutoffDate),
    ))
    .limit(1);

  return result.length > 0;
}
