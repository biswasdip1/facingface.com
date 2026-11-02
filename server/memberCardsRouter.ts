import { TRPCError } from "@trpc/server";
import { isIP } from "node:net";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { createRateLimiter } from "./rateLimit";
import {
  getUserById,
  isUserBlocked,
  areFriends,
  getFriendRequestBetween,
  sendFriendRequest,
  createNotification,
} from "./db";
import {
  getOwnerMemberCard,
  getSharedMemberCard,
  saveOwnerMemberCard,
  replaceMemberCardLink,
} from "./memberCardStore";
import {
  canViewSharedCard,
  isCardAccountActive,
  projectMemberCard,
} from "./memberCardPolicy";
import {
  MEMBER_CARD_DEFAULTS,
  MEMBER_CARD_LINK_PATTERN,
} from "../shared/memberCard";
import type { TrpcContext } from "./_core/context";

const publicReads = createRateLimiter({
  maxAttempts: 120,
  windowMs: 60_000,
  action: "member-card views",
});
const ownerChanges = createRateLimiter({
  maxAttempts: 30,
  windowMs: 60_000,
  action: "member-card changes",
});
const connections = createRateLimiter({
  maxAttempts: 10,
  windowMs: 60_000,
  action: "member-card connection requests",
});
const linkInput = z
  .object({ linkId: z.string().regex(MEMBER_CARD_LINK_PATTERN) })
  .strict();
const settingsInput = z
  .object({
    enabled: z.boolean(),
    showName: z.boolean(),
    showPhoto: z.boolean(),
    appearance: z.enum(["classic", "dark"]),
  })
  .strict();

async function ownerProfile(ctx: TrpcContext) {
  const user = ctx.user && (await getUserById(ctx.user.id));
  if (!isCardAccountActive(user))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Member-card sharing is not available for this account.",
    });
  return user!;
}

async function viewableCard(linkId: string, viewerId?: number) {
  const record = await getSharedMemberCard(linkId);
  if (!record) return null;
  const profile = await getUserById(record.userId);
  const blocked =
    viewerId && viewerId !== record.userId
      ? (await isUserBlocked(viewerId, record.userId)) ||
        (await isUserBlocked(record.userId, viewerId))
      : false;
  if (!canViewSharedCard(record, profile, !!blocked)) return null;
  return { record, profile: profile! };
}

export const memberCardsRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ownerProfile(ctx);
    const record = await getOwnerMemberCard(ctx.user.id);
    return {
      settings: record
        ? {
            enabled: record.enabled,
            showName: record.showName,
            showPhoto: record.showPhoto,
            appearance: record.appearance,
          }
        : MEMBER_CARD_DEFAULTS,
      card: record
        ? projectMemberCard(record, profile)
        : {
            displayName:
              profile.name?.trim().slice(0, 100) || "FacingFace member",
            memberNumber: null,
            avatar: null,
            appearance: "classic" as const,
            sharePath: null,
          },
      profileName: profile.name?.trim().slice(0, 100) || "FacingFace member",
      profileAvatar: profile.avatar,
    };
  }),

  save: protectedProcedure
    .input(settingsInput)
    .mutation(async ({ ctx, input }) => {
      ownerChanges.check(String(ctx.user.id));
      const profile = await ownerProfile(ctx);
      const record = await saveOwnerMemberCard(ctx.user.id, input);
      return { card: projectMemberCard(record, profile) };
    }),

  replaceLink: protectedProcedure.mutation(async ({ ctx }) => {
    ownerChanges.check(String(ctx.user.id));
    const profile = await ownerProfile(ctx);
    const record = await replaceMemberCardLink(ctx.user.id);
    if (!record)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Save your member card first.",
      });
    return { card: projectMemberCard(record, profile) };
  }),

  shared: publicProcedure.input(linkInput).query(async ({ ctx, input }) => {
    ctx.res.setHeader("Cache-Control", "no-store");
    // On Render the socket belongs to the reverse proxy, not the member. Match
    // the app's existing forwarded-IP handling for anonymous rate-limit hints;
    // authenticated identity and all access permissions still come from ctx.user.
    const forwarded = ctx.req.headers?.["x-forwarded-for"];
    const candidate =
      typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
    const ip = isIP(candidate)
      ? candidate
      : ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
    publicReads.check(ctx.user ? `member:${ctx.user.id}` : `ip:${ip}`);
    const result = await viewableCard(input.linkId, ctx.user?.id);
    if (!result) return null;
    return {
      card: projectMemberCard(result.record, result.profile),
      profilePath: `/profile/${result.record.userId}`,
      isOwner: ctx.user?.id === result.record.userId,
    };
  }),

  connect: protectedProcedure
    .input(linkInput)
    .mutation(async ({ ctx, input }) => {
      connections.check(String(ctx.user.id));
      await ownerProfile(ctx);
      // Resolve target from a valid, enabled link. Recheck blocks and suspension
      // even if the browser still has a cached card or a copied screenshot.
      const result = await viewableCard(input.linkId, ctx.user.id);
      if (!result)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This member card is unavailable.",
        });
      const receiverId = result.record.userId;
      if (receiverId === ctx.user.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This is your own member card.",
        });
      if (await areFriends(ctx.user.id, receiverId))
        return { status: "friends" as const };
      const existing = await getFriendRequestBetween(ctx.user.id, receiverId);
      if (existing?.status === "pending") return { status: "pending" as const };
      await sendFriendRequest(ctx.user.id, receiverId);
      try {
        await createNotification({
          userId: receiverId,
          actorId: ctx.user.id,
          type: "friend_request",
        });
      } catch {
        /* The request remains saved if notifications are briefly unavailable. */
      }
      return { status: "sent" as const };
    }),
});
