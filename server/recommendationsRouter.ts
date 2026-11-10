import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { FEED_INTERESTS, type FeedInterestId } from "../shared/recommendations";
import {
  getRecommendationSettings,
  saveRecommendationSettings,
  resetRecommendationSettings,
  getRecommendationContext,
  hideRecommendation,
  unhideRecommendation,
} from "./recommendationStore";
import {
  getViewableWallPostById,
  getBlockedUserIds,
  getUserById,
  getLikeCounts,
  getCommentCounts,
} from "./db";
import { rankRecommendedPosts } from "./recommendationPolicy";

const settingsSchema = z
  .object({
    interests: z
      .array(
        z.enum(
          FEED_INTERESTS.map(item => item.id) as [
            FeedInterestId,
            ...FeedInterestId[],
          ]
        )
      )
      .max(8)
      .refine(
        items => new Set(items).size === items.length,
        "Choose each interest only once."
      ),
    learnFromActivity: z.boolean(),
  })
  .strict();
const postSchema = z.object({ postId: z.number().int().positive() }).strict();
// This ID is a cache scope, never an authority to access another account.
const accountSchema = z
  .object({ viewerId: z.number().int().positive() })
  .strict();
export const recommendationsRouter = router({
  settings: protectedProcedure
    .input(accountSchema)
    .query(async ({ ctx, input }) => {
      if (input.viewerId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      const { interests, learnFromActivity } = await getRecommendationSettings(
        ctx.user.id
      );
      return { interests, learnFromActivity };
    }),
  save: protectedProcedure
    .input(settingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { interests, learnFromActivity } = await saveRecommendationSettings(
        ctx.user.id,
        input
      );
      return { interests, learnFromActivity };
    }),
  reset: protectedProcedure.mutation(({ ctx }) =>
    resetRecommendationSettings(ctx.user.id)
  ),
  hide: protectedProcedure
    .input(postSchema)
    .mutation(async ({ ctx, input }) => {
      const [post, blockedIds] = await Promise.all([
        getViewableWallPostById(input.postId, ctx.user.id),
        getBlockedUserIds(ctx.user.id),
      ]);
      if (!post || post.isFlagged || blockedIds.includes(post.authorId))
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This post is no longer available.",
        });
      await hideRecommendation(ctx.user.id, input.postId);
      return { success: true };
    }),
  unhide: protectedProcedure
    .input(postSchema)
    .mutation(async ({ ctx, input }) => {
      await unhideRecommendation(ctx.user.id, input.postId);
      return { success: true };
    }),
  feed: protectedProcedure
    .input(accountSchema)
    .query(async ({ ctx, input }) => {
      if (input.viewerId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      const context = await getRecommendationContext(ctx.user.id);
      // Bounded snapshot: the client reveals these same ordered results in batches.
      // Likes/comments cannot shift offsets and cause duplicates while scrolling.
      const ranked = rankRecommendedPosts(context.candidates, context).slice(
        0,
        120
      );
      const posts = ranked.map(item => item.post);
      const ids = posts.map(post => post.id);
      const authorIds = Array.from(new Set(posts.map(post => post.authorId)));
      const [authorList, likeCounts, commentCounts] = await Promise.all([
        Promise.all(authorIds.map(id => getUserById(id))),
        getLikeCounts(ids, "post"),
        getCommentCounts(ids),
      ]);
      const authors: Record<
        number,
        {
          id: number;
          name: string | null;
          avatar: string | null;
          isVerified: boolean;
        }
      > = {};
      for (const author of authorList)
        if (author)
          authors[author.id] = {
            id: author.id,
            name: author.name,
            avatar: author.avatar ?? null,
            isVerified: author.isVerified ?? false,
          };
      return {
        posts,
        authors,
        likeCounts,
        commentCounts,
        reasons: Object.fromEntries(
          ranked.map(item => [item.post.id, item.reason])
        ),
        poolSize: context.candidates.length,
      };
    }),
});
