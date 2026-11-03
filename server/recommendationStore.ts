import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  users,
  posts,
  comments,
  likes,
  postReactions,
  follows,
  blocks,
  orgPages,
  pageFollowers,
  publicGroups,
  publicGroupMembers,
  feedRecommendationSettings,
  feedRecommendationHidden,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  DEFAULT_RECOMMENDATION_SETTINGS,
  FEED_INTERESTS,
  type RecommendationSettings,
} from "../shared/recommendations";

let ready: Promise<void> | null = null;
async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Recommendations are temporarily unavailable. Latest is still available.",
    });
  return db;
}
export async function ensureRecommendationStorage() {
  if (!ready)
    ready = (async () => {
      const db = await database();
      // Additive optional tables only. Never run migrations, alter or reset site data.
      await db.execute(sql`CREATE TABLE IF NOT EXISTS "feed_recommendation_settings" (
      "userId" integer PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
      "interests" text NOT NULL DEFAULT '[]',
      "learnFromActivity" boolean NOT NULL DEFAULT false,
      "activitySince" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`);
      await db.execute(sql`CREATE TABLE IF NOT EXISTS "feed_recommendation_hidden" (
      "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "postId" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("userId", "postId")
    )`);
    })().catch(error => {
      ready = null;
      throw error;
    });
  await ready;
}
export async function getRecommendationSettings(userId: number) {
  await ensureRecommendationStorage();
  const db = await database();
  const [record] = await db
    .select()
    .from(feedRecommendationSettings)
    .where(eq(feedRecommendationSettings.userId, userId))
    .limit(1);
  let interests: RecommendationSettings["interests"] = [];
  try {
    const parsed: unknown = JSON.parse(record?.interests ?? "[]");
    if (Array.isArray(parsed))
      interests = FEED_INTERESTS.filter(item => parsed.includes(item.id)).map(
        item => item.id
      );
  } catch {
    /* Invalid old settings fall back safely; never execute saved text. */
  }
  return {
    interests,
    learnFromActivity: record?.learnFromActivity ?? false,
    activitySince: record?.activitySince ?? new Date(),
  };
}
export async function saveRecommendationSettings(
  userId: number,
  settings: RecommendationSettings
) {
  await ensureRecommendationStorage();
  const db = await database();
  const now = new Date();
  await db
    .insert(feedRecommendationSettings)
    .values({
      userId,
      interests: JSON.stringify(settings.interests),
      learnFromActivity: settings.learnFromActivity,
      activitySince: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: feedRecommendationSettings.userId,
      set: {
        interests: JSON.stringify(settings.interests),
        learnFromActivity: settings.learnFromActivity,
        // Turning learning off/on never resurrects older activity.
        activitySince: sql`CASE WHEN ${feedRecommendationSettings.learnFromActivity} = true AND ${settings.learnFromActivity} = true THEN ${feedRecommendationSettings.activitySince} ELSE ${now} END`,
        updatedAt: now,
      },
    });
  return getRecommendationSettings(userId);
}
export async function resetRecommendationSettings(userId: number) {
  await ensureRecommendationStorage();
  const db = await database();
  const now = new Date();
  await db.transaction(async tx => {
    await tx
      .insert(feedRecommendationSettings)
      .values({
        userId,
        interests: "[]",
        learnFromActivity: false,
        activitySince: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: feedRecommendationSettings.userId,
        set: {
          interests: "[]",
          learnFromActivity: false,
          activitySince: now,
          updatedAt: now,
        },
      });
    await tx
      .delete(feedRecommendationHidden)
      .where(eq(feedRecommendationHidden.userId, userId));
  });
  return { ...DEFAULT_RECOMMENDATION_SETTINGS, interests: [] };
}
export async function hideRecommendation(userId: number, postId: number) {
  await ensureRecommendationStorage();
  const db = await database();
  await db
    .insert(feedRecommendationHidden)
    .values({ userId, postId })
    .onConflictDoNothing();
}
export async function unhideRecommendation(userId: number, postId: number) {
  await ensureRecommendationStorage();
  const db = await database();
  await db
    .delete(feedRecommendationHidden)
    .where(
      and(
        eq(feedRecommendationHidden.userId, userId),
        eq(feedRecommendationHidden.postId, postId)
      )
    );
}

/** One bounded candidate pool. Apply visibility BEFORE scoring or activity reads. */
export async function getRecommendationContext(userId: number) {
  const settings = await getRecommendationSettings(userId);
  const db = await database();
  const now = new Date();
  const blockedRows = await db
    .select({ id: blocks.blockedId })
    .from(blocks)
    .where(eq(blocks.blockerId, userId))
    .union(
      db
        .select({ id: blocks.blockerId })
        .from(blocks)
        .where(eq(blocks.blockedId, userId))
    );
  const blockedIds = blockedRows.map(row => row.id);
  const privateAudience = or(
    sql`COALESCE(${posts.audience}, 'public') <> 'private'`,
    eq(posts.authorId, userId),
    sql`EXISTS (SELECT 1 FROM friendships AS f WHERE (f."userId1" = ${userId} AND f."userId2" = ${posts.authorId}) OR (f."userId2" = ${userId} AND f."userId1" = ${posts.authorId}))`
  );
  const eligible = and(
    eq(posts.isFlagged, false),
    isNull(posts.pageId),
    sql`(${posts.linkSiteName} IS NULL OR ${posts.linkSiteName} NOT LIKE 'page:%')`,
    // Recommend original wall posts only; existing Latest still includes reshares.
    isNull(posts.resharedFromId),
    privateAudience,
    or(isNull(posts.scheduledAt), lte(posts.scheduledAt, now)),
    or(isNull(users.suspendedUntil), lte(users.suspendedUntil, now)),
    blockedIds.length ? notInArray(posts.authorId, blockedIds) : undefined
  );
  const [pool, hidden, following, pages, groups] = await Promise.all([
    db
      .select({ post: posts })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eligible)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(400),
    db
      .select({ postId: feedRecommendationHidden.postId })
      .from(feedRecommendationHidden)
      .where(eq(feedRecommendationHidden.userId, userId)),
    db
      .select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId)),
    db
      .select({ name: orgPages.name, category: orgPages.category })
      .from(pageFollowers)
      .innerJoin(orgPages, eq(pageFollowers.pageId, orgPages.id))
      .where(
        and(
          eq(pageFollowers.userId, userId),
          eq(pageFollowers.status, "approved"),
          eq(orgPages.visibility, "public"),
          eq(orgPages.isSuspended, false)
        )
      )
      .limit(100),
    db
      .select({ name: publicGroups.name, category: publicGroups.category })
      .from(publicGroupMembers)
      .innerJoin(publicGroups, eq(publicGroupMembers.groupId, publicGroups.id))
      .where(
        and(
          eq(publicGroupMembers.userId, userId),
          eq(publicGroupMembers.status, "approved"),
          eq(publicGroups.visibility, "public"),
          eq(publicGroups.isSuspended, false)
        )
      )
      .limit(100),
  ]);
  const candidates = pool.map(row => row.post);
  const hiddenPostIds = hidden.map(row => row.postId);
  const visibleIds = candidates
    .filter(post => !hiddenPostIds.includes(post.id))
    .map(post => post.id);
  let activityPosts: typeof candidates = [];
  if (settings.learnFromActivity && visibleIds.length) {
    const since = new Date(
      Math.max(settings.activitySince.getTime(), now.getTime() - 30 * 86400000)
    );
    // No stored browsing history, search terms, DMs, calls or watch-time signals.
    // Only already-existing positive reactions and comments, after explicit opt-in.
    const [reactionRows, likeRows, commentRows] = await Promise.all([
      db
        .select({ postId: postReactions.postId })
        .from(postReactions)
        .where(
          and(
            eq(postReactions.userId, userId),
            inArray(postReactions.postId, visibleIds),
            inArray(postReactions.reaction, ["like", "love", "haha", "wow"]),
            gte(postReactions.createdAt, since)
          )
        )
        .orderBy(desc(postReactions.createdAt))
        .limit(100),
      db
        .select({ postId: likes.targetId })
        .from(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.targetType, "post"),
            inArray(likes.targetId, visibleIds),
            gte(likes.createdAt, since),
            sql`NOT EXISTS (SELECT 1 FROM post_reactions AS reaction WHERE reaction."userId" = ${userId} AND reaction."postId" = ${likes.targetId} AND reaction.reaction NOT IN ('like', 'love', 'haha', 'wow'))`
          )
        )
        .orderBy(desc(likes.createdAt))
        .limit(100),
      db
        .select({ postId: comments.postId })
        .from(comments)
        .where(
          and(
            eq(comments.authorId, userId),
            eq(comments.isFlagged, false),
            inArray(comments.postId, visibleIds),
            gte(comments.createdAt, since)
          )
        )
        .orderBy(desc(comments.createdAt))
        .limit(100),
    ]);
    const activityIds = new Set(
      [...reactionRows, ...likeRows, ...commentRows].map(row => row.postId)
    );
    activityPosts = candidates.filter(
      post => post.authorId !== userId && activityIds.has(post.id)
    );
  }
  return {
    candidates,
    interests: settings.interests,
    followedAuthorIds: following
      .map(row => row.id)
      .filter(id => !blockedIds.includes(id)),
    communityTexts: [...pages, ...groups].map(
      row => `${row.name} ${row.category ?? ""}`
    ),
    activityPosts,
    hiddenPostIds,
    now,
  };
}
