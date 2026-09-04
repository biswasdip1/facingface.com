import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS, POST_WORD_LIMIT } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { broadcastRouter } from "./_core/broadcastRouter";
import { stopAllStreamsRouter } from "./_core/stopAllStreamsRouter";
import { enhancedSubscriptionRouter } from "./_core/subscriptionRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import bcrypt from "bcryptjs";
import {
  addFollow,
  addLike,
  createComment,
  createNotification,
  createPost,
  deleteComment,
  deletePost,
  pinPost,
  getCommentById,
  getCommentsByPost,
  getFollow,
  getFollowerCount,
  getFollowers,
  getFollowing,
  getFollowingCount,
  getFeedPosts,
  getLike,
  getLikeCounts,
  getCommentCounts,
  getNotifications,
  getPostById,
  getPostForViewer,
  getPostCount,
  getPostsByUser,
  getUnreadNotificationCount,
  getUserById,
  getUserLikedIds,
  markNotificationsRead,
  removeFollow,
  removeLike,
  searchUsers,
  searchPosts,
  extractHashtags,
  saveHashtags,
  editPost,
  getPostsByHashtag,
  updateUserProfile,
  createPoll,
  createPollOptions,
  getPollByPostId,
  getPollOptions,
  getPollVoteCounts,
  getUserPollVote,
  upsertPollVote,
  getPollById,
  createLiveStream,
  endLiveStream,
  getLiveStream,
  getActiveLiveStreams,
  getEmojiReaction,
  addEmojiReaction,
  removeEmojiReaction,
  getEmojiReactionCounts,
  getUserEmojiReactions,
  getEmojiReactionCountsBatch,
  getUserEmojiReactionsBatch,
  recordShare,
  getShareCounts,
  getReshareCountsBatch,
  getBookmarkCounts,
  countUserPostsByTypeInWindow,
  countUserLiveStreamsInWindow,
  getUserDailyQuota,
  DAILY_LIMITS,
  getUserByEmail,
  getUserByOpenId,
  createEmailUser,
  setVerificationToken,
  getUserByVerificationToken,
  markEmailVerified,
  incrementUserViolation,
  suspendUser,
  isUserSuspended,
  flagPost,
  adminDeleteComment,
  getMediaPostsDueForWarning,
  schedulePostDeletion,
  getPostsDueForDeletion,
  adminDeletePost,
  sendFriendRequest,
  getFriendRequestBetween,
  respondFriendRequest,
  getPendingFriendRequests,
  getSentFriendRequests,
  getFriends,
  areFriends,
  removeFriend,
  cancelFriendRequest,
  getFriendSuggestions,
  getMutualFriendsCount,
  getPendingFriendRequestsWithSenders,
  getSentFriendRequestsWithReceivers,
  getFriendsWithProfiles,
  getFriendBirthdays,
  createSocialEvent,
  getSocialEventById,
  createSocialEventInvitations,
  getSocialEventsForUser,
  getSocialEventInvitation,
  setSocialEventResponse,
  getSocialEventAttendance,
  deleteSocialEvent,
  getOrCreateConversation,
  getConversationsForUser,
  getMessages,
  sendMessage,
  markMessagesRead,
  getUnreadMessageCount,
  addMessageReaction,
  removeMessageReaction,
  getMessageReactions,
  getFlaggedPosts,
  getFlaggedComments,
  getAllUsers,
  getAdminPosts,
  unsuspendUser,
  setUserRole,
  unflagPost,
  getAdminStats,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  updateUserPassword,
  uploadAvatar,
  createPasskey,
  getPasskeysByUserId,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
  deletePasskey,
  saveWebauthnChallenge,
  getWebauthnChallenge,
  deleteWebauthnChallenge,
  getTotpSecret,
  upsertTotpSecret,
  enableTotp,
  disableTotp,
  updateTotpBackupCodes,
  createActiveSession,
  getActiveSessionsByUser,
  deleteActiveSession,
  deleteActiveSessionByTokenHash,
  deleteAllOtherSessions,
  hashToken,
  touchActiveSession,
  createGroup,
  addGroupMember,
  removeGroupMember,
  getGroupsByUser,
  getGroupById,
  updateGroupAvatar,
  getGroupMembers,
  isGroupMember,
  getGroupMemberRole,
  sendGroupMessage,
  getGroupMessages,
  createCallRoom,
  getCallRoom,
  joinCallRoom,
  leaveCallRoom,
  getActiveCallParticipants,
  sendCallSignal,
  getUnconsumedSignals,
  getProfilePhotos,
  addProfilePhoto,
  setActiveProfilePhoto,
  deleteProfilePhoto,
  getCoverPhotos,
  addCoverPhoto,
  setActiveCoverPhoto,
  deleteCoverPhoto,
  getPostPhotos,
  getPostVideos,
  getPostDocs,
  getSubscriptionByUser,
  upsertSubscription,
  getAllSubscriptions,
  revokeSubscription,
  setUserVerified,
  createOrgPage,
  getOrgPageByHandle,
  getOrgPageById,
  listOrgPages,
  isPageFollower,
  getPageFollowRecord,
  getPendingPageFollowRequests,
  reviewPageFollowRequest,
  followOrgPage,
  unfollowOrgPage,
  isPageAdmin,
  getFollowedPageIds,
  getOwnedPages,
  updateOrgPage,
  getPagePostsByPageId,
  getPageFeedPosts,
  addPageAdmin,
  removePageAdmin,
  getPageAdmins,
  transferPageOwnership,
  createPublicGroup,
  getPublicGroupByHandle,
  getPublicGroupById,
  getSavedPublicGroupPosts,
  normaliseUnsafePublicGroupHandle,
  listPublicGroups,
  updatePublicGroup,
  joinPublicGroup,
  leavePublicGroup,
  getPublicGroupMembership,
  getPublicGroupMembershipRecord,
  getPendingPublicGroupJoinRequests,
  reviewPublicGroupJoinRequest,
  getPublicGroupMembers,
  setPublicGroupMemberRole,
  createPublicGroupPost,
  getPublicGroupPosts,
  deletePublicGroupPost,
  getPublicGroupPostById,
  getPublicGroupPostComments,
  getPublicGroupPostCommentCounts,
  getPublicGroupPostReactionSummary,
  setPublicGroupPostReaction,
  togglePublicGroupPostSave,
  isPublicGroupPostSaved,
  repostPublicGroupPost,
  createPublicGroupPostComment,
  deletePublicGroupPostComment,
  uploadPublicGroupCover,
  createOrgPagePost,
  getOrgPagePosts,
  deleteOrgPagePost,
  toggleCommentReaction,
  getCommentReactionCounts,
  getCommentReactionUsers,
  createStory,
  getActiveStories,
  getStoriesByUser,
  getStoryById,
  deleteStory,
  recordStoryView,
  getStoryViewerIds,
  getViewedStoryIds,
  deleteExpiredStories,
  upsertStoryReaction,
  getStoryReactions,
  getMyStoryReaction,
  getStoryReactionCounts,
  createHighlight,
  getHighlightsByUser,
  getHighlightById,
  deleteHighlight,
  addStoryToHighlight,
  getHighlightItems,
  removeHighlightItem,
  toggleBookmark,
  getBookmarkedPostIds,
  getBookmarkedPosts,
  isPostBookmarked,
  setPostReaction,
  getPostReactionCounts,
  getPostReactionSummary,
  getUserPostReaction,
  getUserPostReactions,
  incrementVideoViews,
  getTrendingPosts,
  getScheduledPosts,
  cancelScheduledPost,
  reschedulePost,
  getPostEditHistory,
  insertAuditLog,
  getAuditLogs,
  createShopListing,
  getShopListingById,
  getShopListings,
  searchShopListings,
  getMyShopListings,
  updateShopListing,
  deleteShopListing,
  incrementShopListingViews,
  countShopListingsToday,
  saveShopListing,
  unsaveShopListing,
  isShopListingSaved,
  getSavedShopListings,
  adminGetShopListings,
  adminUpdateShopListing,
  getMediaLimits,
  setMediaLimit,
  getResourceAbuseSignals,
  getMediaRecordSummary,
  createContentReport,
  getContentReports,
  getContentReportById,
  updateContentReport,
  adminGetPages,
  adminUpdatePage,
  adminGetGroups,
  adminUpdateGroup,
  deleteUserAccount,
  createReel,
  getReelsFeed,
  getReelById,
  getFollowingReelsFeed,
  toggleReelLike,
  recordReelView,
  addReelComment,
  getReelComments,
  deleteReel,
  getReelHashtags,
  createSupportMessage,
  getSupportMessages,
  markSupportMessageRead,
  getAdminUserIds,
  getUserSupportMessages,
  getSupportUnreadCount,
  createSupportReply,
  getSupportReplies,
  getSupportTopicStats,
  resolveSupportMessage,
  getAdminEmails,
  insertCallHistory,
  getCallHistory,
  savePushSubscription,
  deletePushSubscription,
  getMissedCallCount,
  updateLastCallsSeen,
  deleteMessage,
  updateUserLastSeen,
  getUserLastSeen,
  forwardMessage,
  pinDmMessage,
  unpinDmMessage,
  getPinnedDmMessages,
  updateLastReadMessage,
  getConversationReadState,
  addGroupReaction,
  removeGroupReaction,
  getGroupReactions,
  getGroupUnreadCount,
  getTotalGroupUnreadCount,
  pinGroupMessage,
  unpinGroupMessage,
  getPinnedGroupMessages,
  muteDmConversation,
  getDmMuteStatus,
  muteGroupConversation,
  getGroupMuteStatus,
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  getBlockedUserIds,
  getActiveFeedAd,
  listFeedAds,
  upsertFeedAd,
  deleteFeedAd,
  listNewsFeedSources,
  upsertNewsFeedSource,
  deleteNewsFeedSource,
  trackAdEvent,
  getAdStats,
  getSuggestedUsers,
  getInactiveReminderSummary,
} from "./db";
import { stripe, getOrCreateBadgePrice } from "./stripe";
import {
  getEmailDeliveryConfig,
  sendInactiveUserReminderEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSupportMessageEmail,
  sendLoginLockoutEmail,
  sendReportEmail,
  sendReportResponseEmail,
} from "./email";
import { generateTotpSecret, buildTotpUri, generateQrCode, verifyTotpCode, generateBackupCodes, consumeBackupCode } from "./totp";
import { loginLimiter, registerLimiter } from "./rateLimit";
import { removeReportedContent, wasRecipientAccepted } from "./moderationActions";
import { getDiskMediaConfig } from "./storage";
import { getMediaDeliveryStats, getMediaDiskStats } from "./_core/mediaUsage";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import { moderateContent, moderateImageBuffer } from "./moderation";
import { storagePut } from "./storage";
import { compressImage, compressAvatar, compressCover } from "./imageUtils";
import { notifyOwner } from "./_core/notification";
import { fetchLinkPreview, extractFirstUrl, countYouTubeUrls, isYouTubeUrl, extractYouTubeVideoId, getYouTubeThumbnailUrl } from "./linkPreview";
import { sendCallPushNotification, sendDmPushNotification } from "./webpush";

const countWords = (value: string | null | undefined): number => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const postTextSchema = z.string().refine((value) => countWords(value) <= POST_WORD_LIMIT, {
  message: `Post text must be ${POST_WORD_LIMIT} words or fewer.`,
});

const nullablePostTextSchema = z.string().nullable().refine((value) => countWords(value) <= POST_WORD_LIMIT, {
  message: `Post text must be ${POST_WORD_LIMIT} words or fewer.`,
});

/**
 * All normal wall-post reads and interactions pass through this guard. It keeps
 * Page records compatible while hiding friends-only wall posts from everyone
 * except their author and accepted friends.
 */
async function requireViewablePost(postId: number, viewerId?: number | null) {
  const post = await getPostForViewer(postId, viewerId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
  return post;
}

async function requireViewableCommentPost(commentId: number, viewerId?: number | null) {
  const comment = await getCommentById(commentId);
  if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
  await requireViewablePost(comment.postId, viewerId);
  return comment;
}

async function rejectSexualMediaUpload(userId: number, reason?: string): Promise<never> {
  const violationCount = await incrementUserViolation(userId);
  let suspendHours = 24;
  let suspendMsg = "First offence: 24-hour suspension for uploading explicit/sexual media.";
  if (violationCount === 2) {
    suspendHours = 24;
    suspendMsg = "Second offence: 24-hour suspension for uploading explicit/sexual media.";
  } else if (violationCount >= 3) {
    suspendHours = 7 * 24;
    suspendMsg = "Third offence: 7-day suspension for repeated explicit/sexual media violations.";
  }
  const suspendUntil = new Date(Date.now() + suspendHours * 60 * 60 * 1000);
  const suspensionLength = suspendHours === 24 ? "24 hours" : `${Math.round(suspendHours / 24)} days`;
  await suspendUser(userId, suspendUntil, suspendMsg);
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `⚠️ Warning: Your upload appears to contain explicit/sexual photo or video content and violates our Community Standards. Your account has been suspended for ${suspensionLength}. This is violation #${violationCount}. ${reason ? `Reason: ${reason}` : ""}`,
  });
}

async function checkUploadedImageForSexualContent(userId: number, buffer: Buffer, mimeType: string, context: string): Promise<void> {
  const modResult = await moderateImageBuffer(buffer, mimeType, context);
  if (modResult.flagged) {
    if (modResult.isSexual) {
      await rejectSexualMediaUpload(userId, modResult.reason);
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Your upload was flagged by our visual moderation system: ${modResult.reason ?? "Inappropriate visual content detected."}`,
    });
  }
}

async function checkUploadedVideoForSexualContent(userId: number, buffer: Buffer, durationSeconds?: number): Promise<void> {
  const { extractVideoFrame } = await import("./videoUtils");
  const sampleTimes = durationSeconds && durationSeconds > 4
    ? Array.from(new Set([1, Math.max(1, Math.floor(durationSeconds / 2)), Math.max(1, Math.floor(durationSeconds - 1))]))
    : [1];

  for (const seconds of sampleTimes) {
    const frameBuf = await extractVideoFrame(buffer, seconds);
    if (!frameBuf) continue;
    await checkUploadedImageForSexualContent(userId, frameBuf, "image/jpeg", `video frame at ${seconds}s`);
  }
}

// ─── Posts Router ─────────────────────────────────────────────────────────────

const postsRouter = router({
  feed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      // The main Home Feed is deliberately chronological: every new ordinary
      // post appears at the top immediately, rather than being displaced by
      // engagement or relationship ranking.
      const candidateLimit = Math.min(200, Math.max(input.limit * 4, input.limit));
      const [followedPageIds, blockedIds] = await Promise.all([
        getFollowedPageIds(ctx.user.id),
        getBlockedUserIds(ctx.user.id),
      ]);
      const [regularPosts, pagePosts] = await Promise.all([
        getFeedPosts(ctx.user.id, candidateLimit, input.offset, blockedIds),
        followedPageIds.length > 0 ? getPageFeedPosts(followedPageIds, candidateLimit, 0) : Promise.resolve([]),
      ]);
      const seen = new Set<number>();
      const candidates = [...regularPosts, ...pagePosts]
        .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

      if (candidates.length === 0) return { posts: [], authors: {}, likeCounts: {}, commentCounts: {}, resharedPosts: {}, resharedAuthors: {}, pageMap: {} };

      const candidatePostIds = candidates.map((p) => p.id);
      const [candidateLikeCounts, candidateCommentCounts] = await Promise.all([
        getLikeCounts(candidatePostIds, "post"),
        getCommentCounts(candidatePostIds),
      ]);
      const feedPosts = candidates
        .sort((a, b) => {
          const timeDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return timeDifference || b.id - a.id;
        })
        .slice(0, input.limit);

      const authorIds = Array.from(new Set(feedPosts.map((p) => p.authorId)));
      const authorList = await Promise.all(authorIds.map((id) => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of authorList) {
        if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false };
      }

      const postIds = feedPosts.map((p) => p.id);
      const likeCounts = Object.fromEntries(postIds.map((id) => [id, candidateLikeCounts[id] ?? 0]));
      const commentCounts = Object.fromEntries(postIds.map((id) => [id, candidateCommentCounts[id] ?? 0]));

      // Fetch original posts for reshares
      const resharedIds = Array.from(new Set(feedPosts.map((p) => p.resharedFromId).filter(Boolean) as number[]));
      const resharedPostList = await Promise.all(resharedIds.map((id) => getPostForViewer(id, ctx.user.id)));
      const resharedPosts: Record<number, typeof resharedPostList[0]> = {};
      for (const rp of resharedPostList) { if (rp) resharedPosts[rp.id] = rp; }

      const resharedAuthorIds = Array.from(new Set(resharedPostList.map((p) => p?.authorId).filter(Boolean) as number[]));
      const resharedAuthorList = await Promise.all(resharedAuthorIds.map((id) => getUserById(id)));
      const resharedAuthors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of resharedAuthorList) { if (a) resharedAuthors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false }; }

      // Build page map for page posts (linkSiteName = "page:{id}")
      const pageIds = Array.from(new Set(
        feedPosts.map(p => p.linkSiteName).filter((s): s is string => !!s?.startsWith("page:")).map(s => parseInt(s.slice(5)))
      ));
      const pageList = await Promise.all(pageIds.map(id => getOrgPageById(id)));
      const pageMap: Record<number, { id: number; name: string; handle: string; logo: string | null }> = {};
      for (const pg of pageList) { if (pg) pageMap[pg.id] = { id: pg.id, name: pg.name, handle: pg.handle, logo: pg.logo ?? null }; }

      return { posts: feedPosts, authors, likeCounts, commentCounts, resharedPosts, resharedAuthors, pageMap };
    }),

  getByUser: protectedProcedure
    .input(z.object({ userId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const blockedIds = await getBlockedUserIds(ctx.user.id);
      return getPostsByUser(input.userId, ctx.user.id, input.limit, input.offset, blockedIds);
    }),
  getById: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input, ctx }) => {
      const post = await getPostForViewer(input.postId, ctx.user?.id);
      if (!post) return null;
      const author = await getUserById(post.authorId);
      const resharedPost = post.resharedFromId ? await getPostForViewer(post.resharedFromId, ctx.user?.id) : null;
      const resharedAuthor = resharedPost ? await getUserById(resharedPost.authorId) : null;
      const [likeCounts] = await Promise.all([getLikeCounts([post.id], "post")]);
      return {
        post,
        author: author ? { id: author.id, name: author.name, avatar: author.avatar ?? null, isVerified: author.isVerified ?? false } : null,
        likeCount: likeCounts[post.id] ?? 0,
        resharedPost: resharedPost ?? null,
        resharedAuthor: resharedAuthor ? { id: resharedAuthor.id, name: resharedAuthor.name, avatar: resharedAuthor.avatar ?? null, isVerified: resharedAuthor.isVerified ?? false } : null,
      };
    }),

  getLikedPostIds: protectedProcedure
    .input(z.object({ postIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      return getUserLikedIds(ctx.user.id, input.postIds, "post");
    }),

  create: protectedProcedure
    .input(
      z.object({
        text: postTextSchema.optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["image", "video"]).optional(),
        poll: z.object({
          question: z.string().min(1).max(300),
          options: z.array(z.string().min(1).max(200)).min(2).max(6),
          expiresInHours: z.number().min(1).max(168).optional(),
        }).optional(),
        docUrl: z.string().optional(),
        docName: z.string().max(255).optional(),
        docSize: z.number().int().optional(),
        docType: z.string().max(100).optional(),
        bgColor: z.string().max(30).optional(),
        audioUrl: z.string().optional(),
        audioName: z.string().max(255).optional(),
        audioDuration: z.number().int().optional(),
        photo2Url: z.string().optional(),
        photo3Url: z.string().optional(),
        photo1Caption: z.string().max(300).optional(),
        photo2Caption: z.string().max(300).optional(),
        photo3Caption: z.string().max(300).optional(),
        photo1Alt: z.string().max(500).optional(),
        photo2Alt: z.string().max(500).optional(),
        photo3Alt: z.string().max(500).optional(),
        videoPosterUrl: z.string().optional(),
        audience: z.enum(["public", "private"]).default("public"),
        scheduledAt: z.date().optional(),  // if set, post is saved as scheduled
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.text && !input.mediaUrl && !input.docUrl && !input.audioUrl && !input.poll) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Post must have text, media, a poll, or a document." });
      }

      // ── 24-hour upload rate limits ──────────────────────────────────────────
      const userId = ctx.user.id;
      const LIMIT_MSG = "Today's limit has been reached, upload again after 24 hrs., due to space control we do have limit system for while.";
      if (input.mediaType === "video") {
        const used = await countUserPostsByTypeInWindow(userId, "video");
        if (used >= DAILY_LIMITS.video) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LIMIT_MSG });
        }
      }
      if (input.mediaType === "image") {
        const used = await countUserPostsByTypeInWindow(userId, "photo");
        if (used >= DAILY_LIMITS.photo) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LIMIT_MSG });
        }
      }
      if (input.audioUrl) {
        const used = await countUserPostsByTypeInWindow(userId, "audio");
        if (used >= DAILY_LIMITS.audio) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LIMIT_MSG });
        }
      }
      if (input.docUrl) {
        const used = await countUserPostsByTypeInWindow(userId, "doc");
        if (used >= DAILY_LIMITS.doc) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LIMIT_MSG });
        }
      }
      if (input.poll) {
        const used = await countUserPostsByTypeInWindow(userId, "poll");
        if (used >= DAILY_LIMITS.poll) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LIMIT_MSG });
        }
      }

      // Content moderation for text
      if (input.text) {
        const modResult = await moderateContent(input.text);
        if (modResult.flagged) {
          if (modResult.isSexual) {
            // Sexual content: flag post, increment violation, suspend account
            // We create the post first (flagged), then handle suspension
            const violationCount = await incrementUserViolation(ctx.user.id);
            let suspendHours = 24;
            let suspendMsg = "First offence: 24-hour suspension for uploading explicit/sexual content.";
            if (violationCount === 2) {
              suspendHours = 24;
              suspendMsg = "Second offence: 24-hour suspension for uploading explicit/sexual content.";
            } else if (violationCount >= 3) {
              suspendHours = 7 * 24;
              suspendMsg = "Third offence: 7-day suspension for repeated explicit/sexual content violations.";
            }
            const suspendUntil = new Date(Date.now() + suspendHours * 60 * 60 * 1000);
            const suspensionLength = suspendHours === 24 ? "24 hours" : `${Math.round(suspendHours / 24)} days`;
            await suspendUser(ctx.user.id, suspendUntil, suspendMsg);
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `⚠️ Warning: Your post contains explicit/sexual content which violates our Community Standards. Your account has been suspended for ${suspensionLength}. This is violation #${violationCount}. ${violationCount >= 3 ? "Further violations will continue to receive 7-day suspensions." : "A third violation will result in a 7-day suspension."}`,
            });
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Your post was flagged by our content moderation system: ${modResult.reason ?? "Inappropriate content detected."}`,
          });
        }
      }

      // Validate YouTube URL limit: max 1 per post
      if (input.text) {
        const youtubeCount = countYouTubeUrls(input.text);
        if (youtubeCount > 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You can only include one YouTube video URL per post." });
        }
      }
      // Auto-detect URL in text and fetch link preview
      let linkPreview = null;
      if (input.text) {
        const foundUrl = extractFirstUrl(input.text);
        if (foundUrl) {
          linkPreview = await fetchLinkPreview(foundUrl);
        }
      }

      // Auto-generate video poster at 1s if mediaType=video and no custom poster was provided
      let resolvedPosterUrl: string | null = input.videoPosterUrl ?? null;
      if (input.mediaType === "video" && input.mediaUrl && !resolvedPosterUrl && /^https?:\/\//i.test(input.mediaUrl)) {
        try {
          const { extractVideoFrame } = await import("./videoUtils");
          const { randomUUID } = await import("crypto");
          // Fetch the video from storage to extract a frame
          const videoUrl = input.mediaUrl.startsWith("/manus-storage/")
            ? `${process.env.BUILT_IN_FORGE_API_URL ?? ""}/storage/files/${input.mediaUrl.replace("/manus-storage/", "")}`
            : input.mediaUrl;
          const videoResp = await fetch(videoUrl);
          if (videoResp.ok) {
            const videoBuf = Buffer.from(await videoResp.arrayBuffer());
            const frameBuf = await extractVideoFrame(videoBuf, 1);
            if (frameBuf) {
              const posterKey = `auto-posters/${ctx.user.id}-${randomUUID()}.jpg`;
              const { url } = await storagePut(posterKey, frameBuf, "image/jpeg");
              resolvedPosterUrl = url;
            }
          }
        } catch (err) {
          console.error("[posts.create] Auto-poster generation failed:", err);
          // Non-fatal — proceed without poster
        }
      }
      const postId = await createPost({
        authorId: ctx.user.id,
        text: input.text ?? null,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
        isFlagged: false,
        linkUrl: linkPreview?.url ?? null,
        linkTitle: linkPreview?.title ?? null,
        linkDescription: linkPreview?.description ?? null,
        linkImage: linkPreview?.image ?? null,
        linkSiteName: linkPreview?.siteName ?? null,
        docUrl: input.docUrl ?? null,
        docName: input.docName ?? null,
        docSize: input.docSize ?? null,
        docType: input.docType ?? null,
        bgColor: input.bgColor ?? null,
        audioUrl: input.audioUrl ?? null,
        audioName: input.audioName ?? null,
        audioDuration: input.audioDuration ?? null,
        photo2Url: input.photo2Url ?? null,
        photo3Url: input.photo3Url ?? null,
        photo1Caption: input.photo1Caption ?? null,
        photo2Caption: input.photo2Caption ?? null,
        photo3Caption: input.photo3Caption ?? null,
        photo1Alt: input.photo1Alt ?? null,
        photo2Alt: input.photo2Alt ?? null,
        photo3Alt: input.photo3Alt ?? null,
        videoPosterUrl: resolvedPosterUrl,
        audience: input.audience,
        scheduledAt: input.scheduledAt ?? null,
      });

      // Save hashtags
      if (input.text) {
        const tags = extractHashtags(input.text);
        if (tags.length > 0) await saveHashtags(postId, tags);
      }
      // Create poll if provided
      if (input.poll) {
        const expiresAt = input.poll.expiresInHours
          ? new Date(Date.now() + input.poll.expiresInHours * 3600 * 1000)
          : undefined;
        const pollId = await createPoll({
          postId,
          question: input.poll.question,
          expiresAt: expiresAt ?? null,
        });
        await createPollOptions(
          input.poll.options.map((text, i) => ({ pollId, text, displayOrder: i }))
        );
      }

      return { postId };
    }),

  delete: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
      await deletePost(input.postId, isAdmin ? undefined : ctx.user.id);
      return { success: true };
    }),

  pin: protectedProcedure
    .input(z.object({ postId: z.number(), pin: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await pinPost(input.postId, ctx.user.id, input.pin);
      return { success: true };
    }),

  reshare: protectedProcedure
    .input(
      z.object({
        originalPostId: z.number().int(),
        comment: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify original post exists
      const original = await requireViewablePost(input.originalPostId, ctx.user.id);
      // A friends-only message must never become visible through a public share.
      // Resharing it is therefore disabled even for an authorized friend.
      if (original.audience === "private") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Private posts cannot be reshared." });
      }

      // Prevent resharing a reshare (always point to the root original)
      const rootId = original.resharedFromId ?? original.id;
      const rootPost = rootId === original.id ? original : await requireViewablePost(rootId, ctx.user.id);
      if (rootPost.audience === "private") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Private posts cannot be reshared." });
      }

      // Optional comment moderation
      if (input.comment) {
        const modResult = await moderateContent(input.comment);
        if (modResult.flagged) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Your comment was flagged: ${modResult.reason ?? "Inappropriate content detected."}`,
          });
        }
      }

      const postId = await createPost({
        authorId: ctx.user.id,
        text: input.comment ?? null,
        resharedFromId: rootId,
        reshareComment: input.comment ?? null,
        isFlagged: false,
        mediaUrl: null,
        mediaType: null,
        audience: "public",
      });

      // Record in post_shares table too
      await recordShare(rootId, ctx.user.id);

      // Notify original author
      if (original.authorId !== ctx.user.id) {
        await createNotification({
          userId: original.authorId,
          actorId: ctx.user.id,
          type: "comment",  // reuse comment type for now
          postId: rootId,
        });
        const actor = await getUserById(ctx.user.id);
        await notifyOwner({
          title: "Someone reshared your post",
          content: `${actor?.name ?? "Someone"} reshared your post on FacingFace.`,
        }).catch(() => {});
      }

      return { postId };
    }),

  getReshareCount: protectedProcedure
    .input(z.object({ postIds: z.array(z.number().int()) }))
    .query(async ({ input }) => {
      return getReshareCountsBatch(input.postIds);
    }),

  myDailyQuota: protectedProcedure
    .query(async ({ ctx }) => {
      return getUserDailyQuota(ctx.user.id, ctx.user.isVerified ?? false);
    }),
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input, ctx }) => {
      const foundPosts = await searchPosts(input.query, ctx.user.id);
      if (foundPosts.length === 0) return { posts: [], authors: {}, likeCounts: {} };
      const authorIds = Array.from(new Set(foundPosts.map((p) => p.authorId)));
      const authorList = await Promise.all(authorIds.map((id) => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of authorList) {
        if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false };
      }
      const postIds = foundPosts.map((p) => p.id);
      const likeCounts = await getLikeCounts(postIds, "post");
      return { posts: foundPosts, authors, likeCounts };
    }),
  edit: protectedProcedure
    .input(z.object({
      postId: z.number(),
      text: nullablePostTextSchema.optional(),
      bgColor: z.string().max(30).nullable().optional(),
      mediaUrl: z.string().nullable().optional(),
      mediaType: z.string().nullable().optional(),
      audioUrl: z.string().nullable().optional(),
      docUrl: z.string().nullable().optional(),
      docName: z.string().nullable().optional(),
      hideEditHistory: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const mediaFields = (input.mediaUrl !== undefined || input.audioUrl !== undefined || input.docUrl !== undefined)
        ? { mediaUrl: input.mediaUrl, mediaType: input.mediaType, audioUrl: input.audioUrl, docUrl: input.docUrl, docName: input.docName }
        : undefined;
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "super_admin";
      await editPost(input.postId, isAdmin ? undefined : ctx.user.id, input.text ?? "", input.bgColor, mediaFields, input.hideEditHistory);
      const tags = extractHashtags(input.text ?? "");
      await saveHashtags(input.postId, tags);
      return { success: true };
    }),
  byHashtag: protectedProcedure
    .input(z.object({ tag: z.string().min(1).max(100) }))
    .query(async ({ input, ctx }) => {
      const foundPosts = await getPostsByHashtag(input.tag, ctx.user.id);
      if (foundPosts.length === 0) return { posts: [], authors: {}, likeCounts: {} };
      const authorIds = Array.from(new Set(foundPosts.map((p) => p.authorId)));
      const authorList = await Promise.all(authorIds.map((id) => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of authorList) {
        if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false };
      }
      const postIds = foundPosts.map((p) => p.id);
      const likeCounts = await getLikeCounts(postIds, "post");
      return { posts: foundPosts, authors, likeCounts };
    }),

   getScheduled: protectedProcedure
    .query(async ({ ctx }) => {
      return getScheduledPosts(ctx.user.id);
    }),
  cancelScheduled: protectedProcedure
    .input(z.object({ postId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const affected = await cancelScheduledPost(input.postId, ctx.user.id);
      if (affected === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),
  reschedule: protectedProcedure
    .input(z.object({ postId: z.number().int(), scheduledAt: z.date() }))
    .mutation(async ({ ctx, input }) => {
      if (input.scheduledAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Scheduled time must be in the future" });
      const affected = await reschedulePost(input.postId, ctx.user.id, input.scheduledAt);
      if (affected === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),
  getEditHistory: publicProcedure
    .input(z.object({ postId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const requesterId = ctx.user?.id;
      await requireViewablePost(input.postId, requesterId);
      return getPostEditHistory(input.postId, requesterId);
    }),
  report: protectedProcedure
    .input(z.object({
      postId: z.number().int(),
      reason: z.enum(["sexual_content", "violence", "harassment", "spam", "other"]),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await requireViewablePost(input.postId, ctx.user.id);
      await createContentReport({ reporterId: ctx.user.id, targetType: "post", targetId: input.postId, reason: input.reason });
      try {
        const reporter = await getUserById(ctx.user.id);
        const reportedUser = post ? await getUserById(post.authorId) : null;
        await sendReportEmail({
          reporterName: reporter?.name ?? "Unknown",
          reporterEmail: reporter?.email ?? "",
          contentType: "post",
          contentId: input.postId,
          reason: input.reason,
          description: input.description,
          reportedUserName: reportedUser?.name ?? "Unknown",
          contentPreview: post?.text ? post.text.slice(0, 200) : undefined,
        });
      } catch (e) {
        console.error("[Report] Failed to send report email:", e);
      }
      return { success: true };
    }),
});

// ─── Comments Router ──────────────────────────────────────────────────────────

const commentsRouter = router({
  list: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireViewablePost(input.postId, ctx.user.id);
      const commentList = await getCommentsByPost(input.postId);
      if (commentList.length === 0) return { comments: [], authors: {}, likeCounts: {}, likedIds: [] };

      const authorIds = Array.from(new Set(commentList.map((c) => c.authorId)));
      const authorList = await Promise.all(authorIds.map((id) => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of authorList) {
        if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false };
      }

      const commentIds = commentList.map((c) => c.id);
      const likeCounts = await getLikeCounts(commentIds, "comment");
      const likedIds = await getUserLikedIds(ctx.user.id, commentIds, "comment");

      return { comments: commentList, authors, likeCounts, likedIds };
    }),

  create: protectedProcedure
    .input(z.object({ postId: z.number(), text: z.string().min(1).max(1000), parentId: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const post = await requireViewablePost(input.postId, ctx.user.id);
      // Content moderation
      const modResult = await moderateContent(input.text);
      if (modResult.flagged) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Your comment was flagged: ${modResult.reason ?? "Inappropriate content detected."}`,
        });
      }

      const commentId = await createComment({
        postId: input.postId,
        authorId: ctx.user.id,
        parentId: input.parentId ?? null,
        text: input.text,
        isFlagged: false,
      });

      // Notify post author
      if (post.authorId !== ctx.user.id) {
        await createNotification({
          userId: post.authorId,
          actorId: ctx.user.id,
          type: "comment",
          postId: input.postId,
          commentId,
        });
        // Email notification
        const actor = await getUserById(ctx.user.id);
        const postAuthor = await getUserById(post.authorId);
        if (postAuthor?.email) {
          await notifyOwner({
            title: `New comment on your post`,
            content: `${actor?.name ?? "Someone"} commented on your post: "${input.text.slice(0, 100)}"`,
          }).catch(() => {});
        }
      }

      return { commentId };
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteComment(input.commentId, ctx.user.id);
      return { success: true };
    }),

  report: protectedProcedure
    .input(z.object({
      commentId: z.number().int(),
      reason: z.enum(["sexual_content", "violence", "harassment", "spam", "other"]),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const comment = await requireViewableCommentPost(input.commentId, ctx.user.id);
      await createContentReport({ reporterId: ctx.user.id, targetType: "comment", targetId: input.commentId, reason: input.reason });
      try {
        const reporter = await getUserById(ctx.user.id);
        const reportedUser = comment ? await getUserById(comment.authorId) : null;
        await sendReportEmail({
          reporterName: reporter?.name ?? "Unknown",
          reporterEmail: reporter?.email ?? "",
          contentType: "comment",
          contentId: input.commentId,
          reason: input.reason,
          description: input.description,
          reportedUserName: reportedUser?.name ?? "Unknown",
          contentPreview: comment?.text ? comment.text.slice(0, 200) : undefined,
        });
      } catch (e) {
        console.error("[Report] Failed to send report email:", e);
      }
      return { success: true };
    }),

  toggleReaction: protectedProcedure
    .input(z.object({
      commentId: z.number(),
      reaction: z.enum(["like", "love", "haha", "wow", "sad", "angry"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireViewableCommentPost(input.commentId, ctx.user.id);
      await toggleCommentReaction(input.commentId, ctx.user.id, input.reaction);
      return { success: true };
    }),

  getReactionCounts: publicProcedure
    .input(z.object({ commentId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireViewableCommentPost(input.commentId, ctx.user?.id);
      return await getCommentReactionCounts(input.commentId);
    }),

  getReactionUsers: publicProcedure
    .input(z.object({
      commentId: z.number(),
      reaction: z.enum(["like", "love", "haha", "wow", "sad", "angry"]),
    }))
    .query(async ({ input, ctx }) => {
      await requireViewableCommentPost(input.commentId, ctx.user?.id);
      const users = await getCommentReactionUsers(input.commentId, input.reaction);
      return users.map((u) => ({
        id: u.id,
        name: u.name ?? "Unknown",
      }));
    }),
});

// ─── Likes Router ─────────────────────────────────────────────────────────────

const likesRouter = router({
  toggle: protectedProcedure
    .input(
      z.object({
        targetId: z.number(),
        targetType: z.enum(["post", "comment"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.targetType === "post") {
        await requireViewablePost(input.targetId, ctx.user.id);
      } else {
        await requireViewableCommentPost(input.targetId, ctx.user.id);
      }
      const existing = await getLike(ctx.user.id, input.targetId, input.targetType);

      if (existing) {
        await removeLike(ctx.user.id, input.targetId, input.targetType);
        return { liked: false };
      } else {
        await addLike({
          userId: ctx.user.id,
          targetId: input.targetId,
          targetType: input.targetType,
        });

        // Notify target owner
        let ownerId: number | null = null;
        let postId: number | null = null;
        let commentId: number | null = null;

        if (input.targetType === "post") {
          const post = await requireViewablePost(input.targetId, ctx.user.id);
          ownerId = post.authorId; postId = post.id;
        } else {
          const comment = await getCommentById(input.targetId);
          if (comment) { ownerId = comment.authorId; postId = comment.postId; commentId = comment.id; }
        }

        if (ownerId && ownerId !== ctx.user.id) {
          await createNotification({
            userId: ownerId,
            actorId: ctx.user.id,
            type: input.targetType === "post" ? "like_post" : "like_comment",
            postId: postId ?? undefined,
            commentId: commentId ?? undefined,
          });
          const actor = await getUserById(ctx.user.id);
          await notifyOwner({
            title: `Someone liked your ${input.targetType}`,
            content: `${actor?.name ?? "Someone"} liked your ${input.targetType}.`,
          }).catch(() => {});
        }

        return { liked: true };
      }
    }),

  getStatus: protectedProcedure
    .input(z.object({ targetIds: z.array(z.number()), targetType: z.enum(["post", "comment"]) }))
    .query(async ({ ctx, input }) => {
      const allowedIds = input.targetType === "post"
        ? (await Promise.all(input.targetIds.map(async (id) => (await getPostForViewer(id, ctx.user.id)) ? id : null))).filter((id): id is number => id != null)
        : (await Promise.all(input.targetIds.map(async (id) => (await requireViewableCommentPost(id, ctx.user.id)) ? id : null))).filter((id): id is number => id != null);
      const likedIds = await getUserLikedIds(ctx.user.id, allowedIds, input.targetType);
      return { likedIds };
    }),
});

// ─── Follows Router ───────────────────────────────────────────────────────────

const followsRouter = router({
  toggle: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.targetUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot follow yourself." });
      }

      const existing = await getFollow(ctx.user.id, input.targetUserId);

      if (existing) {
        await removeFollow(ctx.user.id, input.targetUserId);
        return { following: false };
      } else {
        await addFollow({ followerId: ctx.user.id, followingId: input.targetUserId });

        // Notify
        await createNotification({
          userId: input.targetUserId,
          actorId: ctx.user.id,
          type: "follow",
        });
        const actor = await getUserById(ctx.user.id);
        await notifyOwner({
          title: `New follower`,
          content: `${actor?.name ?? "Someone"} started following you.`,
        }).catch(() => {});

        return { following: true };
      }
    }),

  status: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .query(async ({ ctx, input }) => {
      const existing = await getFollow(ctx.user.id, input.targetUserId);
      return { following: !!existing };
    }),

  followers: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const [followerList, count] = await Promise.all([
        getFollowers(input.userId),
        getFollowerCount(input.userId),
      ]);
      return { followers: followerList, count };
    }),

  following: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const [followingList, count] = await Promise.all([
        getFollowing(input.userId),
        getFollowingCount(input.userId),
      ]);
      return { following: followingList, count };
    }),
});

// ─── Users Router ─────────────────────────────────────────────────────────────

const usersRouter = router({
  getProfile: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      const [followerCount, followingCount, postCount] = await Promise.all([
        getFollowerCount(input.userId),
        getFollowingCount(input.userId),
        getPostCount(input.userId, ctx.user.id),
      ]);

      return { user, followerCount, followingCount, postCount };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional().nullable(),
        avatar: z.string().optional().nullable(),
        coverPhoto: z.string().optional().nullable(),
        hometown: z.string().max(100).optional().nullable(),
        currentLocation: z.string().max(100).optional().nullable(),
        currentRole: z.string().max(100).optional().nullable(),
        phone: z.string().max(30).optional().nullable(),
        website: z.string().max(255).optional().nullable(),
        youtubeChannel: z.string().max(255).optional().nullable(),
        birthDay: z.number().int().min(1).max(31).optional().nullable(),
        birthMonth: z.number().int().min(1).max(12).optional().nullable(),
        hobby: z.string().max(120).optional().nullable(),
        coverCropY: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, {
        name: input.name,
        bio: input.bio,
        avatar: input.avatar,
        coverPhoto: input.coverPhoto,
        hometown: input.hometown,
        currentLocation: input.currentLocation,
        currentRole: input.currentRole,
        phone: input.phone,
        website: input.website,
        youtubeChannel: input.youtubeChannel,
        birthDay: input.birthDay,
        birthMonth: input.birthMonth,
        hobby: input.hobby,
        coverCropY: input.coverCropY,
      });
      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      return searchUsers(input.query);
    }),
});

// ─── Notifications Router ─────────────────────────────────────────────────────

const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const notifList = await getNotifications(ctx.user.id);
    if (notifList.length === 0) return { notifications: [], actors: {} };

    const actorIds = Array.from(new Set(notifList.map((n) => n.actorId)));
    const actorList = await Promise.all(actorIds.map((id) => getUserById(id)));
    const actors: Record<number, { id: number; name: string | null; avatar: string | null }> = {};
    for (const a of actorList) {
      if (a) actors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null };
    }

    return { notifications: notifList, actors };
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await getUnreadNotificationCount(ctx.user.id);
    return { count };
  }),

  markRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

// ─── Media Router ─────────────────────────────────────────────────────────────

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
];

const mediaRouter = router({
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        base64: z.string(),
        mediaType: z.enum(["image", "video"]),
        duration: z.number().optional(), // seconds, for video
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mlimits = await getMediaLimits();
      const MAX_PHOTO_SIZE = (mlimits.photo_max_mb ?? 10) * 1024 * 1024;
      const MAX_VIDEO_SIZE = (mlimits.video_max_mb ?? 10) * 1024 * 1024;
      const MAX_VIDEO_DURATION = mlimits.video_max_seconds ?? 120;
      const buffer = Buffer.from(input.base64, "base64");
      if (input.mediaType === "video") {
        if (buffer.length > MAX_VIDEO_SIZE) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Video too large. Maximum size is ${mlimits.video_max_mb ?? 10} MB.` });
        }
        if (input.duration !== undefined && input.duration > MAX_VIDEO_DURATION) {
          const mins = Math.floor(MAX_VIDEO_DURATION / 60);
          const secs = MAX_VIDEO_DURATION % 60;
          const durStr = secs === 0 ? `${mins} minutes` : `${mins > 0 ? mins + 'm ' : ''}${secs}s`;
          throw new TRPCError({ code: "BAD_REQUEST", message: `Video too long. Maximum duration is ${durStr}.` });
        }
        await checkUploadedVideoForSexualContent(ctx.user.id, buffer, input.duration);
      } else {
        if (buffer.length > MAX_PHOTO_SIZE) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Photo too large. Maximum size is ${mlimits.photo_max_mb ?? 10} MB per photo.` });
        }
        await checkUploadedImageForSexualContent(ctx.user.id, buffer, input.contentType, "uploaded photo");
      }
      let finalBuffer = buffer;
      let finalMimeType = input.contentType;
      let finalExt = input.filename.split(".").pop() ?? "bin";
      if (input.mediaType === "image") {
        const compressed = await compressImage(buffer);
        finalBuffer = Buffer.from(compressed.buffer) as Buffer<ArrayBuffer>;
        finalMimeType = compressed.mimeType;
        finalExt = "webp";
      }
      const key = `media/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${finalExt}`;
      const { url } = await storagePut(key, finalBuffer, finalMimeType);
      // For videos: extract a real frame at 1s using FFmpeg for the poster
      let posterUrl: string | undefined;
      if (input.mediaType === "video") {
        try {
          const { extractVideoFrame } = await import("./videoUtils");
          const frameBuf = await extractVideoFrame(finalBuffer as Buffer);
          if (frameBuf) {
            const posterKey = `media/${ctx.user.id}/poster-${Date.now()}.jpg`;
            const posterResult = await storagePut(posterKey, frameBuf, "image/jpeg");
            posterUrl = posterResult.url;
          }
        } catch {
          // Poster extraction is best-effort; don't fail the upload
        }
      }

      return { url, key, posterUrl };
    }),

  uploadDoc: protectedProcedure
    .input(
      z.object({
        filename: z.string().max(255),
        contentType: z.string(),
        base64: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mlimits = await getMediaLimits();
      const MAX_DOC_SIZE = (mlimits.doc_max_mb ?? 5) * 1024 * 1024;
      if (!ALLOWED_DOC_TYPES.includes(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported document type. Please upload a PDF, Word, Excel, or CSV file.",
        });
      }
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > MAX_DOC_SIZE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Document too large. Maximum size is ${mlimits.doc_max_mb ?? 5} MB.` });
      }
      const ext = input.filename.split(".").pop() ?? "bin";
      const key = `docs/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.contentType);
      return { url, key, filename: input.filename, size: buffer.length, contentType: input.contentType };
    }),
  uploadAudio: protectedProcedure
    .input(
      z.object({
        filename: z.string().max(255),
        contentType: z.string(),
        base64: z.string(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ALLOWED_AUDIO_TYPES = [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
        "audio/mp4", "audio/m4a", "audio/webm", "audio/aac",
      ];
      const mlimits = await getMediaLimits();
      const MAX_AUDIO_SIZE = (mlimits.audio_max_mb ?? 5) * 1024 * 1024;
      const MAX_AUDIO_DURATION = mlimits.audio_max_seconds ?? 360;
      if (!ALLOWED_AUDIO_TYPES.includes(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported audio type. Please upload an MP3, WAV, OGG, M4A, or WebM file.",
        });
      }
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > MAX_AUDIO_SIZE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Audio file too large. Maximum size is ${mlimits.audio_max_mb ?? 5} MB.` });
      }
      if (input.duration !== undefined && input.duration > MAX_AUDIO_DURATION) {
        const mins = Math.floor(MAX_AUDIO_DURATION / 60);
        const secs = MAX_AUDIO_DURATION % 60;
        const durStr = secs === 0 ? `${mins} minutes` : `${mins > 0 ? mins + 'm ' : ''}${secs}s`;
        throw new TRPCError({ code: "BAD_REQUEST", message: `Audio too long. Maximum duration is ${durStr}.` });
      }
      const ext = input.filename.split(".").pop() ?? "mp3";
      const key = `audio/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url, key, filename: input.filename, size: buffer.length, duration: input.duration ?? null };
    }),
  generateAltText: protectedProcedure
    .input(z.object({ imageUrl: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const response = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: input.imageUrl, detail: "low" },
              },
              {
                type: "text",
                text: "Describe this image in one concise sentence (max 120 characters) suitable for use as an HTML alt attribute. Focus on the main subject. Do not start with 'A photo of' or 'An image of'.",
              },
            ],
          },
        ],
      });
      const altText = (response.choices?.[0]?.message?.content as string ?? "").trim().slice(0, 500);
      return { altText };
    }),
  seekPoster: protectedProcedure
    .input(z.object({
      videoUrl: z.string().min(1),
      seekSeconds: z.number().min(0).max(3600),
    }))
    .mutation(async ({ ctx, input }) => {
      const { extractVideoFrame } = await import("./videoUtils");
      const baseUrl = process.env.BUILT_IN_FORGE_API_URL ?? "";
      const videoPath = input.videoUrl.startsWith("http") ? input.videoUrl : `${baseUrl}${input.videoUrl}`;
      const resp = await fetch(videoPath);
      const videoBuf = Buffer.from(await resp.arrayBuffer());
      const frameBuf = await extractVideoFrame(videoBuf, input.seekSeconds);
      if (!frameBuf) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Frame extraction failed" });
      const posterKey = `media/${ctx.user.id}/poster-${Date.now()}.jpg`;
      const { url } = await storagePut(posterKey, frameBuf, "image/jpeg");
      return { posterUrl: url };
    }),
  translateCaption: protectedProcedure
    .input(z.object({
      text: z.string().min(1).max(1000),
      targetLang: z.string().min(2).max(10),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text to the language with BCP-47 code "${input.targetLang}". Return ONLY the translated text, no explanations or extra commentary.`,
          },
          { role: "user", content: input.text },
        ],
      });
      const translated = (response.choices?.[0]?.message?.content as string ?? "").trim();
      return { translated };
    }),
});
// ─── Link Preview Router ──────────────────────────────────────────────────────
const linkPreviewRouter = router({
  fetch: protectedProcedure
    .input(z.object({ url: z.string().min(1) }))
    .query(async ({ input }) => {
      const preview = await fetchLinkPreview(input.url);
      return { preview };
    }),
});


// ─── Polls Router ─────────────────────────────────────────────────────────────
const pollsRouter = router({
  getForPost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireViewablePost(input.postId, ctx.user.id);
      const poll = await getPollByPostId(input.postId);
      if (!poll) return { poll: null };
      const options = await getPollOptions(poll.id);
      const voteCounts = await getPollVoteCounts(poll.id);
      const userVote = await getUserPollVote(poll.id, ctx.user.id);
      const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
      return {
        poll: {
          ...poll,
          options: options.map((opt) => ({
            ...opt,
            voteCount: voteCounts[opt.id] ?? 0,
            percentage: totalVotes > 0 ? Math.round(((voteCounts[opt.id] ?? 0) / totalVotes) * 100) : 0,
          })),
          totalVotes,
          userVotedOptionId: userVote?.optionId ?? null,
          isExpired: poll.expiresAt ? new Date() > poll.expiresAt : false,
        },
      };
    }),

  vote: protectedProcedure
    .input(z.object({ pollId: z.number(), optionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify poll exists
      const poll = await getPollById(input.pollId);
      if (!poll) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Poll not found." });
      }
      await requireViewablePost(poll.postId, ctx.user.id);
      // Reject votes on expired polls
      if (poll.expiresAt && new Date() > poll.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This poll has expired and is no longer accepting votes." });
      }
      // Verify option belongs to this poll
      const options = await getPollOptions(input.pollId);
      const validOption = options.find((o) => o.id === input.optionId);
      if (!validOption) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid poll option." });
      }
      await upsertPollVote(input.pollId, input.optionId, ctx.user.id);
      const voteCounts = await getPollVoteCounts(input.pollId);
      const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
      return {
        success: true,
        voteCounts,
        totalVotes,
        userVotedOptionId: input.optionId,
      };
    }),
});

// ─── Reactions Router ────────────────────────────────────────────────────────
const reactionsRouter = router({
  toggle: protectedProcedure
    .input(
      z.object({
        targetId: z.number().int(),
        targetType: z.enum(["post", "comment", "page_post", "public_group_post"]),
        emoji: z.string().min(1).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.targetType === "post") await requireViewablePost(input.targetId, ctx.user.id);
      if (input.targetType === "comment") await requireViewableCommentPost(input.targetId, ctx.user.id);
      const existing = await getEmojiReaction(ctx.user.id, input.targetId, input.targetType, input.emoji);
      if (existing) {
        await removeEmojiReaction(ctx.user.id, input.targetId, input.targetType, input.emoji);
        return { reacted: false };
      } else {
        await addEmojiReaction({
          userId: ctx.user.id,
          targetId: input.targetId,
          targetType: input.targetType,
          emoji: input.emoji,
        });
        return { reacted: true };
      }
    }),

  getCounts: protectedProcedure
    .input(z.object({ targetId: z.number().int(), targetType: z.enum(["post", "comment", "page_post", "public_group_post"]) }))
    .query(async ({ ctx, input }) => {
      if (input.targetType === "post") await requireViewablePost(input.targetId, ctx.user.id);
      if (input.targetType === "comment") await requireViewableCommentPost(input.targetId, ctx.user.id);
      const counts = await getEmojiReactionCounts(input.targetId, input.targetType);
      const myReactions = await getUserEmojiReactions(ctx.user.id, input.targetId, input.targetType);
      return { counts, myReactions };
    }),

  getBatch: protectedProcedure
    .input(
      z.object({
        targetIds: z.array(z.number().int()),
        targetType: z.enum(["post", "comment", "page_post", "public_group_post"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const allowedIds = input.targetType === "post"
        ? (await Promise.all(input.targetIds.map(async (id) => (await getPostForViewer(id, ctx.user.id)) ? id : null))).filter((id): id is number => id != null)
        : input.targetType === "comment"
          ? (await Promise.all(input.targetIds.map(async (id) => (await requireViewableCommentPost(id, ctx.user.id)) ? id : null))).filter((id): id is number => id != null)
          : input.targetIds;
      const counts = await getEmojiReactionCountsBatch(allowedIds, input.targetType);
      const myReactions = await getUserEmojiReactionsBatch(ctx.user.id, input.targetIds, input.targetType);
      return { counts, myReactions };
    }),
});

// ─── Bookmarks Router ───────────────────────────────────────────────────────
const bookmarksRouter = router({
  toggle: protectedProcedure
    .input(z.object({ postId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await requireViewablePost(input.postId, ctx.user.id);
      return toggleBookmark(ctx.user.id, input.postId);
    }),

  isBookmarked: protectedProcedure
    .input(z.object({ postId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      await requireViewablePost(input.postId, ctx.user.id);
      const bookmarked = await isPostBookmarked(ctx.user.id, input.postId);
      return { bookmarked };
    }),

  getBookmarkedIds: protectedProcedure
    .query(async ({ ctx }) => {
      const ids = await getBookmarkedPostIds(ctx.user.id);
      const viewableIds = (await Promise.all(ids.map(async (id) => (await getPostForViewer(id, ctx.user.id)) ? id : null)))
        .filter((id): id is number => id != null);
      return { ids: viewableIds };
    }),

  getSaved: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const [rows, groupPosts] = await Promise.all([
        getBookmarkedPosts(ctx.user.id, input.limit, input.offset),
        getSavedPublicGroupPosts(ctx.user.id, input.limit, input.offset),
      ]);
      const viewableRows = (await Promise.all(rows.map(async (row) => ({ row, post: await getPostForViewer(row.post.id, ctx.user.id) }))))
        .filter((item): item is { row: typeof rows[number]; post: NonNullable<typeof item.post> } => item.post != null);
      const postsList = viewableRows.map((item) => item.post);
      const authorIds = Array.from(new Set([...postsList, ...groupPosts].map((post) => post.authorId)));
      const authorRows = await Promise.all(authorIds.map((id) => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null }> = {};
      for (const a of authorRows) if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null };
      const groupIds = Array.from(new Set(groupPosts.map((post) => post.groupId)));
      const groupRows = await Promise.all(groupIds.map((id) => getPublicGroupById(id)));
      const groups: Record<number, { id: number; name: string; handle: string }> = {};
      for (const group of groupRows) if (group) groups[group.id] = { id: group.id, name: group.name, handle: group.handle };
      const likeCounts = await getLikeCounts(postsList.map((p) => p.id), "post");
      return { posts: postsList, authors, likeCounts, groupPosts, groups };
    }),

  getCounts: protectedProcedure
    .input(z.object({ postIds: z.array(z.number().int()) }))
    .query(async ({ ctx, input }) => {
      const viewableIds = (await Promise.all(input.postIds.map(async (id) => (await getPostForViewer(id, ctx.user.id)) ? id : null)))
        .filter((id): id is number => id != null);
      return getBookmarkCounts(viewableIds);
    }),
});

// ─── Post Reactions Router ────────────────────────────────────────────────────
const postReactionsRouter = router({
  set: protectedProcedure
    .input(z.object({
      postId: z.number().int(),
      reaction: z.enum(["like", "love", "haha", "wow", "sad", "angry", "seen"]).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireViewablePost(input.postId, ctx.user.id);
      await setPostReaction(ctx.user.id, input.postId, input.reaction);
      return { success: true };
    }),

  getCounts: protectedProcedure
    .input(z.object({ postId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      await requireViewablePost(input.postId, ctx.user.id);
      const { counts, reactors } = await getPostReactionSummary(input.postId);
      const myReaction = await getUserPostReaction(ctx.user.id, input.postId);
      return { counts, reactors: reactors.slice(0, 5), total: reactors.length, myReaction };
    }),

  getMyReactions: protectedProcedure
    .input(z.object({ postIds: z.array(z.number().int()) }))
    .query(async ({ ctx, input }) => {
      if (input.postIds.length === 0) return { reactions: {} };
      const viewableIds = (await Promise.all(input.postIds.map(async (id) => (await getPostForViewer(id, ctx.user.id)) ? id : null)))
        .filter((id): id is number => id != null);
      const reactions = await getUserPostReactions(ctx.user.id, viewableIds);
      return { reactions };
    }),
});

// ─── Shares Router ────────────────────────────────────────────────────────────
const sharesRouter = router({
  record: protectedProcedure
    .input(z.object({ postId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const post = await requireViewablePost(input.postId, ctx.user.id);
      if (post.audience === "private") throw new TRPCError({ code: "FORBIDDEN", message: "Private posts cannot be shared." });
      await recordShare(input.postId, ctx.user.id);
      return { success: true };
    }),

  getCounts: protectedProcedure
    .input(z.object({ postIds: z.array(z.number().int()) }))
    .query(async ({ ctx, input }) => {
      const viewableIds = (await Promise.all(input.postIds.map(async (id) => (await getPostForViewer(id, ctx.user.id)) ? id : null)))
        .filter((id): id is number => id != null);
      return getShareCounts(viewableIds);
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

// ─── Live Router ─────────────────────────────────────────────────────────────
const liveRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      // Suspension check
      const liveSuspension = await isUserSuspended(ctx.user.id);
      if (liveSuspension.suspended) {
        const untilStr = liveSuspension.until ? ` until ${liveSuspension.until.toLocaleDateString()}` : "";
        throw new TRPCError({ code: "FORBIDDEN", message: `Your account has been suspended${untilStr}. You cannot start a live stream.` });
      }
      // 24-hour live stream limit
      const usedLive = await countUserLiveStreamsInWindow(ctx.user.id);
      if (usedLive >= DAILY_LIMITS.live) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Today's limit has been reached, upload again after 24 hrs., due to space control we do have limit system for while." });
      }
      const streamId = await createLiveStream(ctx.user.id, input.title);
      return { streamId };
    }),

  end: protectedProcedure
    .input(z.object({ streamId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await endLiveStream(input.streamId, ctx.user.id);
      return { success: true };
    }),

  get: publicProcedure
    .input(z.object({ streamId: z.number().int() }))
    .query(async ({ input }) => {
      const stream = await getLiveStream(input.streamId);
      if (!stream) return null;
      const host = await getUserById(stream.hostId);
      return { ...stream, host };
    }),

  listActive: publicProcedure.query(async () => {
    const streams = await getActiveLiveStreams();
    const withHosts = await Promise.all(
      streams.map(async (s) => ({ ...s, host: await getUserById(s.hostId) }))
    );
    return withHosts;
  }),
});


// ─── Scheduled Cleanup Router ─────────────────────────────────────────────────
// Called by the scheduled task to warn and delete old media posts
const cleanupRouter = router({
  runMediaCleanup: protectedProcedure.mutation(async ({ ctx }) => {
    // Step 1: Find posts older than 2 years with media, send warning notifications
    const postsToWarn = await getMediaPostsDueForWarning();
    let warned = 0;
    for (const post of postsToWarn) {
      await schedulePostDeletion(post.id);
      // Send in-app notification to the post author
      await createNotification({
        userId: post.authorId,
        actorId: post.authorId, // system notification — actor is self
        type: "system_deletion_warning" as any,
        postId: post.id,
        isRead: false,
      });
      warned++;
    }
    // Step 2: Delete posts whose 7-day warning period has expired
    const postsToDelete = await getPostsDueForDeletion();
    let deleted = 0;
    for (const post of postsToDelete) {
      await adminDeletePost(post.id);
      deleted++;
    }
    return { warned, deleted };
  }),
});

// ─── Friends Router ─────────────────────────────────────────────────────────
const friendsRouter = router({
  sendRequest: protectedProcedure
    .input(z.object({ receiverId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (input.receiverId === ctx.user!.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot send friend request to yourself." });
      const already = await areFriends(ctx.user!.id, input.receiverId);
      if (already) throw new TRPCError({ code: "BAD_REQUEST", message: "Already friends." });
      // Check if a pending request already exists
      const existing = await getFriendRequestBetween(ctx.user!.id, input.receiverId);
      if (existing && existing.status === "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Friend request already pending." });
      const req = await sendFriendRequest(ctx.user!.id, input.receiverId);
      // Notify receiver
      try {
        await createNotification({ userId: input.receiverId, actorId: ctx.user!.id, type: "friend_request" });
      } catch (_) {}
      return req;
    }),
  cancelRequest: protectedProcedure
    .input(z.object({ receiverId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await cancelFriendRequest(ctx.user!.id, input.receiverId);
      return { success: true };
    }),
  respond: protectedProcedure
    .input(z.object({ requestId: z.number().int(), status: z.enum(["accepted", "declined"]) }))
    .mutation(async ({ input, ctx }) => {
      // Verify the request belongs to this user as receiver
      const reqs = await getPendingFriendRequests(ctx.user!.id);
      const req = reqs.find(r => r.id === input.requestId);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Friend request not found." });
      await respondFriendRequest(input.requestId, input.status);
      if (input.status === "accepted") {
        // Notify sender that request was accepted
        try {
          await createNotification({ userId: req.senderId, actorId: ctx.user!.id, type: "friend_accepted" });
        } catch (_) {}
      }
      return { success: true };
    }),
  remove: protectedProcedure
    .input(z.object({ friendId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await removeFriend(ctx.user!.id, input.friendId);
      return { success: true };
    }),
  // Enriched queries with sender/receiver profiles and mutual friend counts
  pendingEnriched: protectedProcedure.query(async ({ ctx }) => {
    return getPendingFriendRequestsWithSenders(ctx.user!.id);
  }),
  sentEnriched: protectedProcedure.query(async ({ ctx }) => {
    return getSentFriendRequestsWithReceivers(ctx.user!.id);
  }),
  listEnriched: protectedProcedure.query(async ({ ctx }) => {
    return getFriendsWithProfiles(ctx.user!.id);
  }),
  // Legacy (kept for backward compat)
  pending: protectedProcedure.query(async ({ ctx }) => {
    return getPendingFriendRequests(ctx.user!.id);
  }),
  sent: protectedProcedure.query(async ({ ctx }) => {
    return getSentFriendRequests(ctx.user!.id);
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    return getFriends(ctx.user!.id);
  }),
  pendingCount: protectedProcedure.query(async ({ ctx }) => {
    const reqs = await getPendingFriendRequests(ctx.user!.id);
    return { count: reqs.length };
  }),
  suggestions: protectedProcedure.query(async ({ ctx }) => {
    return getFriendSuggestions(ctx.user!.id, 20);
  }),
  mutualCount: protectedProcedure
    .input(z.object({ otherUserId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const count = await getMutualFriendsCount(ctx.user!.id, input.otherUserId);
      return { count };
    }),
  status: protectedProcedure
    .input(z.object({ otherUserId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const req = await getFriendRequestBetween(ctx.user!.id, input.otherUserId);
      const friends = await areFriends(ctx.user!.id, input.otherUserId);
      const mutual = await getMutualFriendsCount(ctx.user!.id, input.otherUserId);
      return { request: req, areFriends: friends, mutualCount: mutual };
    }),
});

// ─── Direct Messaging Router ──────────────────────────────────────────────────
const DM_FILE_MAX = 3 * 1024 * 1024; // 3 MB
const dmRouter = router({
  getOrCreate: protectedProcedure
    .input(z.object({ otherUserId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const conv = await getOrCreateConversation(ctx.user!.id, input.otherUserId);
      return conv;
    }),
  conversations: protectedProcedure.query(async ({ ctx }) => {
    const convs = await getConversationsForUser(ctx.user!.id);
    // Enrich with other participant info
    const enriched = await Promise.all(convs.map(async (c) => {
      const otherId = c.participant1Id === ctx.user!.id ? c.participant2Id : c.participant1Id;
      const other = await getUserById(otherId);
      return { ...c, otherUser: other };
    }));
    return enriched;
  }),
  messages: protectedProcedure
    .input(z.object({ conversationId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      // Verify user is participant
      const convs = await getConversationsForUser(ctx.user!.id);
      const conv = convs.find((c) => c.id === input.conversationId);
      if (!conv) throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant." });
      await markMessagesRead(input.conversationId, ctx.user!.id);
      return getMessages(input.conversationId);
    }),
  send: protectedProcedure
    .input(z.object({
      conversationId: z.number().int(),
      text: z.string().max(2000).optional(),
      fileUrl: z.string().optional(),
      fileName: z.string().max(255).optional(),
      fileSize: z.number().int().max(DM_FILE_MAX, "File must be under 3 MB").optional(),
      fileType: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.text && !input.fileUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Message must have text or a file." });
      const convs = await getConversationsForUser(ctx.user!.id);
      const conv = convs.find((c) => c.id === input.conversationId);
      if (!conv) throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant." });
      const msg = await sendMessage({ ...input, senderId: ctx.user!.id });
      // Fire push notification to the other participant (non-blocking)
      const recipientId = conv.participant1Id === ctx.user!.id ? conv.participant2Id : conv.participant1Id;
      const preview = input.text ?? (input.fileName ? `📎 ${input.fileName}` : "Sent a file");
      sendDmPushNotification(recipientId, ctx.user!.name ?? "Someone", preview).catch(() => {});
      return msg;
    }),
  uploadFile: protectedProcedure
    .input(z.object({
      conversationId: z.number().int(),
      fileBase64: z.string(),
      fileName: z.string().max(255),
      fileType: z.string().max(100),
      fileSize: z.number().int(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.fileSize > DM_FILE_MAX) throw new TRPCError({ code: "BAD_REQUEST", message: "File must be under 3 MB." });
      const buf = Buffer.from(input.fileBase64, "base64");
      const key = `dm/${ctx.user!.id}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buf, input.fileType);
      return { url, key };
    }),
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadMessageCount(ctx.user!.id);
  }),
  reactions: protectedProcedure
    .input(z.object({ conversationId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const convs = await getConversationsForUser(ctx.user!.id);
      const conv = convs.find((c) => c.id === input.conversationId);
      if (!conv) throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant." });
      return getMessageReactions(input.conversationId);
    }),
  addReaction: protectedProcedure
    .input(z.object({ messageId: z.number().int(), emoji: z.string().max(10) }))
    .mutation(async ({ input, ctx }) => {
      return addMessageReaction(input.messageId, ctx.user!.id, input.emoji);
    }),
  removeReaction: protectedProcedure
    .input(z.object({ messageId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await removeMessageReaction(input.messageId, ctx.user!.id);
      return { success: true };
    }),
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const ok = await deleteMessage(input.messageId, ctx.user!.id);
      if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this message." });
      return { success: true };
    }),
  getPresence: protectedProcedure
    .input(z.object({ userId: z.number().int() }))
    .query(async ({ input }) => {
      const lastSeenAt = await getUserLastSeen(input.userId);
      return { lastSeenAt };
    }),
   updatePresence: protectedProcedure
    .mutation(async ({ ctx }) => {
      await updateUserLastSeen(ctx.user!.id);
      return { success: true };
    }),
  forward: protectedProcedure
    .input(z.object({ messageId: z.number().int(), toConversationId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      // Verify user is a participant of the target conversation
      const convs = await getConversationsForUser(ctx.user!.id);
      const conv = convs.find((c) => c.id === input.toConversationId);
      if (!conv) throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant of target conversation." });
      const result = await forwardMessage(input.messageId, input.toConversationId, ctx.user!.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Source message not found." });
      return { success: true, messageId: result.id };
    }),
  uploadVoice: protectedProcedure
    .input(z.object({
      conversationId: z.number().int(),
      audioBase64: z.string(),
      durationSeconds: z.number().int().min(1).max(120),
    }))
    .mutation(async ({ input, ctx }) => {
      const buf = Buffer.from(input.audioBase64, "base64");
      if (buf.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Voice message must be under 5 MB." });
      const key = `dm-voice/${ctx.user!.id}/${Date.now()}.webm`;
      const { url } = await storagePut(key, buf, "audio/webm");
      const msg = await sendMessage({
        conversationId: input.conversationId,
        senderId: ctx.user!.id,
        fileUrl: url,
        fileName: `Voice message (${input.durationSeconds}s)`,
        fileSize: buf.length,
        fileType: "audio/webm",
      });
      return { url, messageId: msg.id };
    }),
  pinMessage: protectedProcedure
    .input(z.object({ messageId: z.number().int(), conversationId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const convs = await getConversationsForUser(ctx.user!.id);
      if (!convs.find((c) => c.id === input.conversationId)) throw new TRPCError({ code: "FORBIDDEN" });
      await pinDmMessage(input.messageId, input.conversationId);
      return { success: true };
    }),
  unpinMessage: protectedProcedure
    .input(z.object({ messageId: z.number().int(), conversationId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const convs = await getConversationsForUser(ctx.user!.id);
      if (!convs.find((c) => c.id === input.conversationId)) throw new TRPCError({ code: "FORBIDDEN" });
      await unpinDmMessage(input.messageId, input.conversationId);
      return { success: true };
    }),
  pinnedMessages: protectedProcedure
    .input(z.object({ conversationId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const convs = await getConversationsForUser(ctx.user!.id);
      if (!convs.find((c) => c.id === input.conversationId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getPinnedDmMessages(input.conversationId);
    }),
  markRead: protectedProcedure
    .input(z.object({ conversationId: z.number().int(), lastMessageId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await updateLastReadMessage(input.conversationId, ctx.user!.id, input.lastMessageId);
      return { success: true };
    }),
  readState: protectedProcedure
    .input(z.object({ conversationId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const convs = await getConversationsForUser(ctx.user!.id);
      const conv = convs.find((c) => c.id === input.conversationId);
      if (!conv) throw new TRPCError({ code: "FORBIDDEN" });
      const state = await getConversationReadState(input.conversationId);
      return state ? { ...state, participant1Id: (conv as any).participant1Id, participant2Id: (conv as any).participant2Id } : null;
    }),
  muteDm: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), mutedUntil: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await muteDmConversation(input.conversationId, ctx.user.id, input.mutedUntil ? new Date(input.mutedUntil) : null);
      return { success: true };
    }),
  getDmMuteStatus: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const mutedUntil = await getDmMuteStatus(input.conversationId, ctx.user.id);
      return { mutedUntil: mutedUntil ? mutedUntil.getTime() : null };
    }),
});
// ─── Admin Routerr ─────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  return next({ ctx });
});
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required." });
  return next({ ctx });
});

const adminRouter = router({
  stats: adminProcedure.query(async () => {
    return getAdminStats();
  }),
  flaggedPosts: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const flaggedPosts = await getFlaggedPosts(input.limit, input.offset);
      const authorIds = Array.from(new Set(flaggedPosts.map((p: { authorId: number }) => p.authorId)));
      const authorList = await Promise.all(authorIds.map((id: number) => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of authorList) {
        if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false };
      }
      return { posts: flaggedPosts, authors };
    }),
  unflagPost: adminProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await unflagPost(input.postId);
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "unflag_post", targetPostId: input.postId });
      return { success: true };
    }),
  deletePost: adminProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await adminDeletePost(input.postId);
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "delete_post", targetPostId: input.postId });
      return { success: true };
    }),
  allUsers: adminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0), suspendedOnly: z.boolean().default(false) }))
    .query(async ({ input }) => {
      return getAllUsers(input.limit, input.offset, input.suspendedOnly);
    }),
  allPosts: adminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const postRows = await getAdminPosts(input.limit, input.offset);
      const authorIds = Array.from(new Set(postRows.map((post) => post.authorId)));
      const authorRows = await Promise.all(authorIds.map((id) => getUserById(id)));
      const authors = Object.fromEntries(authorRows.filter(Boolean).map((author) => [author!.id, { name: author!.name, avatar: author!.avatar }]));
      return { posts: postRows, authors };
    }),
  suspendUser: adminProcedure
    .input(z.object({ userId: z.number(), days: z.number().min(1).max(365), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const until = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);
      const target = await getUserById(input.userId);
      await suspendUser(input.userId, until, input.reason);
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "suspend_user", targetUserId: input.userId, targetUserName: target?.name ?? undefined, metadata: JSON.stringify({ days: input.days, reason: input.reason }) });
      return { success: true };
    }),
  unsuspendUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const target = await getUserById(input.userId);
      await unsuspendUser(input.userId);
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "unsuspend_user", targetUserId: input.userId, targetUserName: target?.name ?? undefined });
      return { success: true };
    }),
  setUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input, ctx }) => {
      const target = await getUserById(input.userId);
      await setUserRole(input.userId, input.role);
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "set_role", targetUserId: input.userId, targetUserName: target?.name ?? undefined, metadata: JSON.stringify({ newRole: input.role }) });
      return { success: true };
    }),
  updateDailyLimits: adminProcedure
    .input(z.object({
      photo: z.number().min(0).max(100).optional(),
      video: z.number().min(0).max(100).optional(),
      audio: z.number().min(0).max(100).optional(),
      doc: z.number().min(0).max(100).optional(),
      poll: z.number().min(0).max(100).optional(),
      live: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      // Update in-memory limits (takes effect immediately for new requests)
      if (input.photo !== undefined) DAILY_LIMITS.photo = input.photo;
      if (input.video !== undefined) DAILY_LIMITS.video = input.video;
      if (input.audio !== undefined) DAILY_LIMITS.audio = input.audio;
      if (input.doc !== undefined) DAILY_LIMITS.doc = input.doc;
      if (input.poll !== undefined) DAILY_LIMITS.poll = input.poll;
      if (input.live !== undefined) DAILY_LIMITS.live = input.live;
      return { success: true, limits: DAILY_LIMITS };
    }),
  getDailyLimits: adminProcedure.query(async () => {
    return DAILY_LIMITS;
  }),
  getAuditLog: superAdminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return getAuditLogs(input.limit, input.offset);
    }),
  // ── Super-admin only: manage admins ──────────────────────────────────────
  listAdmins: superAdminProcedure.query(async () => {
    const all = await getAllUsers(1000, 0);
    return (all as { id: number; name: string | null; email: string | null; role: string; avatar: string | null }[])
      .filter((u) => u.role === "admin" || u.role === "super_admin");
  }),
  promoteToAdmin: superAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role." });
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (target.role === "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify another super admin." });
      await setUserRole(input.userId, "admin");
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "promote_to_admin", targetUserId: input.userId, targetUserName: target.name ?? undefined });
      // Notify the promoted user
      await createNotification({ userId: input.userId, actorId: ctx.user.id, type: "admin_promoted" });
      return { success: true };
    }),
  demoteToUser: superAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role." });
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (target.role === "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify another super admin." });
      await setUserRole(input.userId, "user");
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "demote_to_user", targetUserId: input.userId, targetUserName: target.name ?? undefined });
      return { success: true };
    }),

  // ── Super-admin only: delete member account ───────────────────────────────
  deleteAccount: superAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own account." });
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (target.role === "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete another super admin." });
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "delete_account", targetUserId: input.userId, targetUserName: target.name ?? undefined });
      await deleteUserAccount(input.userId);
      return { success: true };
    }),

  // ── Measured Render media storage, delivery activity, and account signals ──
  resourceMonitoring: superAdminProcedure.query(async () => {
    const warningThreshold = Math.max(1, Number(process.env.ABUSE_POSTS_WARNING_PER_24H ?? 20));
    const diskConfig = getDiskMediaConfig();
    const [disk, delivery, records, flaggedAccounts] = await Promise.all([
      getMediaDiskStats(diskConfig?.directory),
      Promise.resolve(getMediaDeliveryStats()),
      getMediaRecordSummary(),
      getResourceAbuseSignals({ postWarningThreshold: warningThreshold, limit: 50 }),
    ]);
    return {
      measuredAt: new Date().toISOString(),
      disk,
      delivery,
      records,
      flaggedAccounts,
      warningThreshold,
      renderMetricsUrl: "https://dashboard.render.com/",
    };
  }),

  // ── Media limits ──────────────────────────────────────────────────────────
  getMediaLimits: publicProcedure.query(async () => {
    return getMediaLimits();
  }),
  setMediaLimit: superAdminProcedure
    .input(z.object({ key: z.string(), value: z.number().min(1).max(10000) }))
    .mutation(async ({ input, ctx }) => {
      await setMediaLimit(input.key, input.value, ctx.user.id);
      try {
        await insertAuditLog({
          actorId: ctx.user.id,
          actorName: ctx.user.name ?? undefined,
          action: "set_media_limit",
          metadata: JSON.stringify({ key: input.key, value: input.value })
        });
      } catch (error) {
        console.error("Failed to insert audit log:", error);
      }
      return { success: true };
    }),

  // ── Pages admin ───────────────────────────────────────────────────────────
  getPages: adminProcedure
    .input(z.object({ search: z.string().optional(), isSuspended: z.boolean().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return adminGetPages(input);
    }),
  suspendPage: adminProcedure
    .input(z.object({ pageId: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await adminUpdatePage(input.pageId, { isSuspended: true, suspendedAt: new Date(), suspendedByAdminId: ctx.user.id, suspendReason: input.reason });
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "suspend_page", metadata: JSON.stringify({ pageId: input.pageId, reason: input.reason }) });
      return { success: true };
    }),
  unsuspendPage: adminProcedure
    .input(z.object({ pageId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await adminUpdatePage(input.pageId, { isSuspended: false, suspendedAt: null as unknown as Date, suspendedByAdminId: null as unknown as number, suspendReason: null as unknown as string });
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "unsuspend_page", metadata: JSON.stringify({ pageId: input.pageId }) });
      return { success: true };
    }),

  // ── Groups admin ──────────────────────────────────────────────────────────
  getGroups: adminProcedure
    .input(z.object({ search: z.string().optional(), isSuspended: z.boolean().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return adminGetGroups(input);
    }),
  suspendGroup: adminProcedure
    .input(z.object({ groupId: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await adminUpdateGroup(input.groupId, { isSuspended: true, suspendedAt: new Date(), suspendedByAdminId: ctx.user.id, suspendReason: input.reason });
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "suspend_group", metadata: JSON.stringify({ groupId: input.groupId, reason: input.reason }) });
      return { success: true };
    }),
  unsuspendGroup: adminProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await adminUpdateGroup(input.groupId, { isSuspended: false, suspendedAt: null as unknown as Date, suspendedByAdminId: null as unknown as number, suspendReason: null as unknown as string });
      await insertAuditLog({ actorId: ctx.user.id, actorName: ctx.user.name ?? undefined, action: "unsuspend_group", metadata: JSON.stringify({ groupId: input.groupId }) });
      return { success: true };
    }),

  // ── Content Reports ───────────────────────────────────────────────────────
  getReports: adminProcedure
    .input(z.object({ status: z.string().optional(), targetType: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return getContentReports(input);
    }),
  reviewReport: adminProcedure
    .input(z.object({ reportId: z.number(), status: z.enum(["reviewed", "actioned", "dismissed"]), adminNote: z.string().max(2000).optional(), deleteContent: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const report = await getContentReportById(input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });

      if (input.deleteContent) {
        await removeReportedContent(report.targetType, report.targetId, ctx.user.id, {
          deletePost: adminDeletePost,
          deleteComment: adminDeleteComment,
          removeListing: async (listingId, adminId) => adminUpdateShopListing(listingId, {
            status: "removed",
            isFlagged: true,
            flagReason: "Removed after a member report",
            removedByAdminId: adminId,
          }),
        });
      }
      await updateContentReport(report.id, {
        status: input.deleteContent ? "actioned" : input.status,
        adminNote: input.adminNote ?? null,
        reviewedAt: new Date(),
        reviewedByAdminId: ctx.user.id,
      });
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: input.deleteContent ? "remove_reported_content" : "review_report",
        metadata: JSON.stringify({ reportId: report.id, targetType: report.targetType, targetId: report.targetId, status: input.deleteContent ? "actioned" : input.status }),
      });
      return { success: true, removedContent: Boolean(input.deleteContent) };
    }),
  flagReportedPost: adminProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const report = await getContentReportById(input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      if (report.targetType !== "post") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only post reports can be moved to Flagged Posts." });
      }
      await flagPost(report.targetId, `Reported: ${report.reason}`);
      await updateContentReport(report.id, { status: "reviewed", reviewedAt: new Date(), reviewedByAdminId: ctx.user.id });
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: "flag_reported_post",
        targetPostId: report.targetId,
        metadata: JSON.stringify({ reportId: report.id, reason: report.reason }),
      });
      return { success: true };
    }),
  respondToReporter: adminProcedure
    .input(z.object({ reportId: z.number(), message: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const report = await getContentReportById(input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      const reporter = await getUserById(report.reporterId);
      if (!reporter?.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The reporting member has no email address, so a response cannot be delivered." });
      }
      const receipt = await sendReportResponseEmail({
        to: reporter.email,
        reporterName: reporter.name,
        message: input.message,
        reportId: report.id,
      });
      const accepted = wasRecipientAccepted(receipt.accepted, reporter.email);
      if (!accepted) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email delivery was not accepted, so no response was recorded." });
      }
      await createNotification({ userId: report.reporterId, actorId: ctx.user.id, type: "support_reply" });
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: "respond_to_reporter",
        metadata: JSON.stringify({ reportId: report.id, delivery: "email_accepted", messageLength: input.message.length }),
      });
      return { success: true, accepted: receipt.accepted };
    }),

  bulkReviewReports: adminProcedure
    .input(z.object({
      reportIds: z.array(z.number()).min(1).max(100),
      action: z.enum(["dismiss", "action", "delete_content"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const reports = await Promise.all(input.reportIds.map((reportId) => getContentReportById(reportId)));
      const targets = reports.filter((report): report is NonNullable<typeof report> => Boolean(report));
      const newStatus = input.action === "dismiss" ? "dismissed" : "actioned";
      for (const report of targets) {
        if (input.action === "delete_content") {
          await removeReportedContent(report.targetType, report.targetId, ctx.user.id, {
          deletePost: adminDeletePost,
          deleteComment: adminDeleteComment,
          removeListing: async (listingId, adminId) => adminUpdateShopListing(listingId, {
            status: "removed",
            isFlagged: true,
            flagReason: "Removed after a member report",
            removedByAdminId: adminId,
          }),
        });
        }
        await updateContentReport(report.id, { status: newStatus, reviewedAt: new Date(), reviewedByAdminId: ctx.user.id });
      }
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: "bulk_review_reports",
        metadata: JSON.stringify({ reportIds: input.reportIds, action: input.action, count: targets.length }),
      });
      return { success: true, processed: targets.length };
    }),
  // ── People You May Know Management ──────────────────────────────────────
  getPeopleYouMayKnow: superAdminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const users = await getAllUsers(input.limit, input.offset);
      return (users as unknown as { id: number; name: string | null; email: string | null; avatar: string | null; profilePicture: string | null }[])
        .map((u) => ({ id: u.id, name: u.name, email: u.email, profilePicture: u.profilePicture || u.avatar }));
    }),
  removePeopleYouMayKnowSuggestion: superAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: "remove_pymk_suggestion",
        targetUserId: input.userId,
      });
      return { success: true };
    }),
});

// ─── Groups Router ────────────────────────────────────────────────────────────

const groupsRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const groupId = await createGroup({ name: input.name, description: input.description, createdBy: ctx.user.id });
      await addGroupMember(groupId, ctx.user.id, "admin");
      return { groupId };
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return getGroupsByUser(ctx.user.id);
    }),

  uploadAvatar: protectedProcedure
    .input(z.object({
      groupId: z.number().int().positive(),
      filename: z.string(),
      contentType: z.string().regex(/^image\//),
      base64: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = await getGroupMemberRole(input.groupId, ctx.user.id);
      if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only group admins can change the group logo." });
      const MAX_SIZE = 5 * 1024 * 1024;
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > MAX_SIZE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Group logo image too large. Maximum size is 5 MB." });
      }
      const { buffer: compBuf } = await compressAvatar(buffer, input.contentType);
      const key = `group-avatars/${input.groupId}/${Date.now()}.jpg`;
      const { url } = await storagePut(key, compBuf, "image/jpeg");
      await updateGroupAvatar(input.groupId, url);
      return { url } as const;
    }),

  getById: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const group = await getGroupById(input.groupId);
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found." });
      const isMember = await isGroupMember(input.groupId, ctx.user.id);
      if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group." });
      const members = await getGroupMembers(input.groupId);
      return { group, members };
    }),

  addMember: protectedProcedure
    .input(z.object({ groupId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const role = await getGroupMemberRole(input.groupId, ctx.user.id);
      if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can add members." });
      await addGroupMember(input.groupId, input.userId, "member");
      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ groupId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const role = await getGroupMemberRole(input.groupId, ctx.user.id);
      if (role !== "admin" && ctx.user.id !== input.userId) throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can remove members." });
      await removeGroupMember(input.groupId, input.userId);
      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeGroupMember(input.groupId, ctx.user.id);
      return { success: true };
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      content: z.string().min(1).max(2000),
      type: z.enum(["text", "image", "file"]).default("text"),
    }))
    .mutation(async ({ ctx, input }) => {
      const isMember = await isGroupMember(input.groupId, ctx.user.id);
      if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group." });
      const msgId = await sendGroupMessage({ groupId: input.groupId, senderId: ctx.user.id, content: input.content, type: input.type });
      return { messageId: msgId };
    }),

  getMessages: protectedProcedure
    .input(z.object({ groupId: z.number(), limit: z.number().default(50), before: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const isMember = await isGroupMember(input.groupId, ctx.user.id);
      if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group." });
      const msgs = await getGroupMessages(input.groupId, input.limit, input.before);
      const senderIds = Array.from(new Set(msgs.map(m => m.senderId)));
      const senderList = await Promise.all(senderIds.map(id => getUserById(id)));
      const senders: Record<number, { id: number; name: string | null; avatar: string | null }> = {};
      for (const s of senderList) {
        if (s) senders[s.id] = { id: s.id, name: s.name, avatar: s.avatar ?? null };
      }
      return { messages: msgs.reverse(), senders };
    }),

  addReaction: protectedProcedure
    .input(z.object({ groupMessageId: z.number().int().positive(), emoji: z.string().min(1).max(10) }))
    .mutation(async ({ ctx, input }) => {
      return addGroupReaction(input.groupMessageId, ctx.user.id, input.emoji);
    }),
  removeReaction: protectedProcedure
    .input(z.object({ groupMessageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return removeGroupReaction(input.groupMessageId, ctx.user.id);
    }),
  reactions: protectedProcedure
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return getGroupReactions(input.groupId);
    }),
  unreadCount: protectedProcedure
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const count = await getGroupUnreadCount(input.groupId, ctx.user.id);
      return { count };
    }),
  totalUnread: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await getTotalGroupUnreadCount(ctx.user.id);
      return { count };
    }),
  // Group message pinning
  pinMessage: protectedProcedure
    .input(z.object({ messageId: z.number().int().positive(), groupId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const member = await isGroupMember(input.groupId, ctx.user.id);
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' });
      await pinGroupMessage(input.messageId, input.groupId);
      return { success: true };
    }),
  unpinMessage: protectedProcedure
    .input(z.object({ messageId: z.number().int().positive(), groupId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const member = await isGroupMember(input.groupId, ctx.user.id);
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' });
      await unpinGroupMessage(input.messageId, input.groupId);
      return { success: true };
    }),
  pinnedMessages: protectedProcedure
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const member = await isGroupMember(input.groupId, ctx.user.id);
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' });
      return getPinnedGroupMessages(input.groupId);
    }),
  // Group mute
  muteGroup: protectedProcedure
    .input(z.object({ groupId: z.number().int().positive(), mutedUntil: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await muteGroupConversation(input.groupId, ctx.user.id, input.mutedUntil ? new Date(input.mutedUntil) : null);
      return { success: true };
    }),
  getMuteStatus: protectedProcedure
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const mutedUntil = await getGroupMuteStatus(input.groupId, ctx.user.id);
      return { mutedUntil: mutedUntil ? mutedUntil.getTime() : null };
    }),
});

// ─── Blocks Router ────────────────────────────────────────────────────────────
const blocksRouter = router({
  block: protectedProcedure
    .input(z.object({ blockedId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.blockedId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot block yourself' });
      await blockUser(ctx.user.id, input.blockedId);
      return { success: true };
    }),
  unblock: protectedProcedure
    .input(z.object({ blockedId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await unblockUser(ctx.user.id, input.blockedId);
      return { success: true };
    }),
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return getBlockedUsers(ctx.user.id);
    }),
  check: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [iBlocked, theyBlocked] = await Promise.all([
        isUserBlocked(ctx.user.id, input.userId),
        isUserBlocked(input.userId, ctx.user.id),
      ]);
      return { iBlocked, theyBlocked, isBlocked: iBlocked || theyBlocked };
    }),
});

// ─── DM Mute (on dm router) ───────────────────────────────────────────────────
// ─── Calls Router ──────────────────────────────────────────────────────────────

const callsRouter = router({
  createRoom: protectedProcedure
    .input(z.object({
      groupId: z.number().optional(),
      type: z.enum(["audio", "video"]).default("video"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.groupId) {
        const isMember = await isGroupMember(input.groupId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group." });
      }
      const roomId = await createCallRoom({ groupId: input.groupId, hostId: ctx.user.id, type: input.type });
      await joinCallRoom(roomId, ctx.user.id);
      return { roomId };
    }),

  getRoom: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await getCallRoom(input.roomId);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Call room not found." });
      const participants = await getActiveCallParticipants(input.roomId);
      return { room, participants };
    }),

  join: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getCallRoom(input.roomId);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Call room not found." });
      if (room.status === "ended") throw new TRPCError({ code: "BAD_REQUEST", message: "This call has ended." });
      await joinCallRoom(input.roomId, ctx.user.id);
      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await leaveCallRoom(input.roomId, ctx.user.id);
      return { success: true };
    }),

  sendSignal: protectedProcedure
    .input(z.object({
      roomId: z.number(),
      toUserId: z.number(),
      type: z.string().max(30),
      payload: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await sendCallSignal({ roomId: input.roomId, fromUserId: ctx.user.id, toUserId: input.toUserId, type: input.type, payload: input.payload });
      return { success: true };
    }),

  pollSignals: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const signals = await getUnconsumedSignals(input.roomId, ctx.user.id);
      return { signals };
    }),
});

// ─── Photos Router ────────────────────────────────────────────────────────────
const photosRouter = router({
  // Profile photos
  listProfilePhotos: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user.id;
      return getProfilePhotos(userId);
    }),

  uploadProfilePhoto: protectedProcedure
    .input(z.object({ dataUrl: z.string(), mimeType: z.string().default("image/jpeg") }))
    .mutation(async ({ ctx, input }) => {
      const base64 = input.dataUrl.replace(/^data:[^;]+;base64,/, "");
      const rawBuffer = Buffer.from(base64, "base64");
      const { buffer: buffer, mimeType: _pm } = await compressAvatar(rawBuffer);
      const key = `profile-photos/${ctx.user.id}/${Date.now()}.jpg`;
      const { url } = await storagePut(key, buffer, "image/jpeg");
      const id = await addProfilePhoto({ userId: ctx.user.id, url, storageKey: key });
      // Auto-activate: immediately set as the current profile photo
      await setActiveProfilePhoto(id, ctx.user.id);
      return { id, url };
    }),

  setActiveProfilePhoto: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await setActiveProfilePhoto(input.photoId, ctx.user.id);
      return { success: true };
    }),

  deleteProfilePhoto: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteProfilePhoto(input.photoId, ctx.user.id);
      return { success: true };
    }),

  // Cover photos
  listCoverPhotos: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user.id;
      return getCoverPhotos(userId);
    }),

  uploadCoverPhoto: protectedProcedure
    .input(z.object({ dataUrl: z.string(), mimeType: z.string().default("image/jpeg") }))
    .mutation(async ({ ctx, input }) => {
      const base64 = input.dataUrl.replace(/^data:[^;]+;base64,/, "");
      const rawCoverBuf = Buffer.from(base64, "base64");
      const { buffer: buffer } = await compressCover(rawCoverBuf);
      const key = `cover-photos/${ctx.user.id}/${Date.now()}.jpg`;
      const { url } = await storagePut(key, buffer, "image/jpeg");
      const id = await addCoverPhoto({ userId: ctx.user.id, url, storageKey: key });
      // Auto-activate: immediately set as the current cover photo
      await setActiveCoverPhoto(id, ctx.user.id);
      return { id, url };
    }),

  setActiveCoverPhoto: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await setActiveCoverPhoto(input.photoId, ctx.user.id);
      return { success: true };
    }),

  deleteCoverPhoto: protectedProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCoverPhoto(input.photoId, ctx.user.id);
      return { success: true };
    }),
  // Gallery — auto-populated from posts
  getGalleryPhotos: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      return getPostPhotos(input.userId, ctx.user.id);
    }),
  getGalleryVideos: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      return getPostVideos(input.userId, ctx.user.id);
    }),
  getGalleryDocs: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      return getPostDocs(input.userId, ctx.user.id);
    }),
});

// ─── Subscription Router (Blue Badge) ────────────────────────────────────────
const subscriptionRouter = router({
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    return getSubscriptionByUser(ctx.user.id);
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const priceId = await getOrCreateBadgePrice();
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: ctx.user.email ?? undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
          },
          allow_promotion_codes: true,
          success_url: `${input.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.origin}/subscription`,
        });
        return { url: session.url };
      } catch (err: any) {
        console.error("[Stripe] Failed to create Blue Badge checkout session:", err);
        const rawMessage = typeof err?.message === "string" ? err.message : "";
        const isKeyProblem = /api key|api_key|invalid key|publishable key|secret key/i.test(rawMessage);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: isKeyProblem
            ? "Stripe is not configured correctly. On Render, set STRIPE_SECRET_KEY to the real Stripe secret key that starts with sk_live_ or sk_test_; do not use the pk_live_ publishable key or a manually edited key."
            : "Unable to open Stripe Checkout right now. Please try again shortly.",
        });
      }
    }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await getSubscriptionByUser(ctx.user.id);
    if (!sub?.stripeSubscriptionId) throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" });
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    await revokeSubscription(ctx.user.id);
    await setUserVerified(ctx.user.id, false);
    return { success: true };
  }),

  adminListAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllSubscriptions();
  }),

  adminRevoke: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const sub = await getSubscriptionByUser(input.userId);
      if (sub?.stripeSubscriptionId) {
        try { await stripe.subscriptions.cancel(sub.stripeSubscriptionId); } catch {}
      }
      await revokeSubscription(input.userId);
      await setUserVerified(input.userId, false);
      return { success: true };
    }),
});

// ─── Pages Router ───────────────────────────────────────────────────────────
const pagesRouter = router({
  list: publicProcedure
    .input(z.object({ search: z.string().optional(), limit: z.number().default(24), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return listOrgPages(input.search, input.limit, input.offset);
    }),

  getByHandle: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      const following = ctx.user ? await isPageFollower(page.id, ctx.user.id) : false;
      const isAdmin = ctx.user ? await isPageAdmin(page.id, ctx.user.id) : false;
      const followRecord = ctx.user ? await getPageFollowRecord(page.id, ctx.user.id) : undefined;
      const owner = await getUserById(page.ownerId);
      const isPrivate = page.visibility === "private";
      return { ...page, following, isAdmin, followStatus: followRecord?.status ?? null, canViewContent: !isPrivate || following || isAdmin, ownerName: owner?.name ?? null };
    }),

  create: protectedProcedure
    .input(z.object({
      handle: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Handle must be lowercase letters, numbers, hyphens only"),
      name: z.string().min(2).max(100),
      description: z.string().max(500).optional(),
      category: z.string().max(60).optional(),
      website: z.string().url().optional().or(z.literal("")),
      location: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getOrgPageByHandle(input.handle);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This handle is already taken. Please choose another." });
      const id = await createOrgPage({ ...input, ownerId: ctx.user.id });
      return { id, handle: input.handle };
    }),

  update: protectedProcedure
    .input(z.object({
      handle: z.string(),
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).nullable().optional(),
      category: z.string().max(60).nullable().optional(),
      website: z.string().nullable().optional(),
      location: z.string().max(100).nullable().optional(),
      logo: z.string().nullable().optional(),
      coverPhoto: z.string().nullable().optional(),
      visibility: z.enum(["public", "private"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      const admin = await isPageAdmin(page.id, ctx.user.id);
      if (!admin) throw new TRPCError({ code: "FORBIDDEN" });
      const { handle, ...data } = input;
      await updateOrgPage(page.id, data);
      return { success: true };
    }),

  follow: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      const status = await followOrgPage(page.id, ctx.user.id, page.visibility === "private");
      return { success: true, status };
    }),

  unfollow: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      await unfollowOrgPage(page.id, ctx.user.id);
      return { success: true };
    }),

  myPages: protectedProcedure.query(async ({ ctx }) => {
    return getOwnedPages(ctx.user.id);
  }),

  getFollowRequests: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      if (!(await isPageAdmin(page.id, ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN" });
      const requests = await getPendingPageFollowRequests(page.id);
      const users = await Promise.all(requests.map((request) => getUserById(request.userId)));
      return requests.map((request, index) => ({ ...request, user: users[index] ? { id: users[index]!.id, name: users[index]!.name, avatar: users[index]!.avatar ?? null } : null }));
    }),

  reviewFollowRequest: protectedProcedure
    .input(z.object({ handle: z.string(), userId: z.number().int(), approve: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      if (!(await isPageAdmin(page.id, ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN" });
      await reviewPageFollowRequest(page.id, input.userId, input.approve);
      return { success: true };
    }),

  getPosts: publicProcedure
    .input(z.object({ handle: z.string(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      const following = ctx.user ? await isPageFollower(page.id, ctx.user.id) : false;
      const isAdmin = ctx.user ? await isPageAdmin(page.id, ctx.user.id) : false;
      if (page.visibility === "private" && !following && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Follow request approval is required to view this private Page." });
      }
      const pagePosts = await getPagePostsByPageId(page.id, input.limit, input.offset);
      if (pagePosts.length === 0) return { posts: [], authors: {}, likeCounts: {} };
      const authorIds = Array.from(new Set(pagePosts.map(p => p.authorId)));
      const authorList = await Promise.all(authorIds.map(id => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of authorList) {
        if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false };
      }
      const postIds = pagePosts.map(p => p.id);
      const likeCounts = await getLikeCounts(postIds, "post");
      return { posts: pagePosts, authors, likeCounts };
    }),

  createPost: protectedProcedure
    .input(z.object({
      handle: z.string(),
      text: postTextSchema.optional(),
      mediaUrl: z.string().optional(),
      mediaType: z.enum(["image", "video"]).optional(),
      photo2Url: z.string().optional(),
      photo3Url: z.string().optional(),
      photo1Caption: z.string().max(300).optional(),
      photo2Caption: z.string().max(300).optional(),
      photo3Caption: z.string().max(300).optional(),
      photo1Alt: z.string().max(500).optional(),
      photo2Alt: z.string().max(500).optional(),
      photo3Alt: z.string().max(500).optional(),
      videoPosterUrl: z.string().optional(),
      audioUrl: z.string().optional(),
      audioName: z.string().max(255).optional(),
      audioDuration: z.number().int().optional(),
      docUrl: z.string().optional(),
      docName: z.string().max(255).optional(),
      docSize: z.number().int().optional(),
      docType: z.string().max(100).optional(),
      bgColor: z.string().max(30).optional(),
      poll: z.object({
        question: z.string().min(1).max(300),
        options: z.array(z.string().min(1).max(200)).min(2).max(6),
        expiresInHours: z.number().min(1).max(168).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      const admin = await isPageAdmin(page.id, ctx.user.id);
      if (!admin) throw new TRPCError({ code: "FORBIDDEN", message: "Only page admins can post" });
      if (!input.text && !input.mediaUrl && !input.audioUrl && !input.docUrl && !input.poll) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Post must have text, media, or a document" });
      }

      // Page posts remain out of the personal Feed through the dedicated pageId
      // field, so they can safely retain the same URL preview metadata as a
      // standard post.
      const detectedLinkUrl = input.text ? extractFirstUrl(input.text) : null;
      let linkPreview = null;
      if (detectedLinkUrl) linkPreview = await fetchLinkPreview(detectedLinkUrl);

      // Auto-generate video poster at 1s if mediaType=video and no custom poster was provided
      let resolvedPosterUrl: string | null = input.videoPosterUrl ?? null;
      if (input.mediaType === "video" && input.mediaUrl && !resolvedPosterUrl && /^https?:\/\//i.test(input.mediaUrl)) {
        try {
          const { extractVideoFrame } = await import("./videoUtils");
          const { randomUUID } = await import("crypto");
          const videoUrl = input.mediaUrl.startsWith("/manus-storage/")
            ? `${process.env.BUILT_IN_FORGE_API_URL ?? ""}/storage/files/${input.mediaUrl.replace("/manus-storage/", "")}`
            : input.mediaUrl;
          const videoResp = await fetch(videoUrl);
          if (videoResp.ok) {
            const videoBuf = Buffer.from(await videoResp.arrayBuffer());
            const frameBuf = await extractVideoFrame(videoBuf, 1);
            if (frameBuf) {
              const posterKey = `auto-posters/${ctx.user.id}-${randomUUID()}.jpg`;
              const { url } = await storagePut(posterKey, frameBuf, "image/jpeg");
              resolvedPosterUrl = url;
            }
          }
        } catch (err) {
          console.error("[pages.createPost] Auto-poster generation failed:", err);
        }
      }

      const postId = await createPost({
        authorId: ctx.user.id,
        text: input.text ?? null,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
        isFlagged: false,
        pageId: page.id,
        linkUrl: linkPreview?.url ?? detectedLinkUrl ?? null,
        linkTitle: linkPreview?.title ?? null,
        linkDescription: linkPreview?.description ?? null,
        linkImage: linkPreview?.image ?? null,
        linkSiteName: linkPreview?.siteName ?? null,
        docUrl: input.docUrl ?? null,
        docName: input.docName ?? null,
        docSize: input.docSize ?? null,
        docType: input.docType ?? null,
        bgColor: input.bgColor ?? null,
        audioUrl: input.audioUrl ?? null,
        audioName: input.audioName ?? null,
        audioDuration: input.audioDuration ?? null,
        photo2Url: input.photo2Url ?? null,
        photo3Url: input.photo3Url ?? null,
        photo1Caption: input.photo1Caption ?? null,
        photo2Caption: input.photo2Caption ?? null,
        photo3Caption: input.photo3Caption ?? null,
        photo1Alt: input.photo1Alt ?? null,
        photo2Alt: input.photo2Alt ?? null,
        photo3Alt: input.photo3Alt ?? null,
        videoPosterUrl: resolvedPosterUrl,
      });

      // Save hashtags
      if (input.text) {
        const tags = extractHashtags(input.text);
        if (tags.length > 0) await saveHashtags(postId, tags);
      }
      // Create poll if provided
      if (input.poll) {
        const expiresAt = input.poll.expiresInHours
          ? new Date(Date.now() + input.poll.expiresInHours * 3600 * 1000)
          : undefined;
        const pollId = await createPoll({
          postId,
          question: input.poll.question,
          expiresAt: expiresAt ?? null,
        });
        await createPollOptions(
          input.poll.options.map((text, i) => ({ pollId, text, displayOrder: i }))
        );
      }

      return { id: postId };
    }),

  // ─── Admin management ─────────────────────────────────────────────────────
  getAdmins: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      const isAdmin = await isPageAdmin(page.id, ctx.user.id);
      if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      return getPageAdmins(page.id);
    }),

  addAdmin: protectedProcedure
    .input(z.object({ handle: z.string(), userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      if (page.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the page owner can add admins" });
      await addPageAdmin(page.id, input.userId);
      return { success: true };
    }),

  removeAdmin: protectedProcedure
    .input(z.object({ handle: z.string(), userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      if (page.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the page owner can remove admins" });
      await removePageAdmin(page.id, input.userId);
      return { success: true };
    }),

  transferOwnership: protectedProcedure
    .input(z.object({ handle: z.string(), newOwnerId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      if (page.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the page owner can transfer ownership" });
      await transferPageOwnership(page.id, input.newOwnerId);
      return { success: true };
    }),

  // ─── Logo / cover upload ──────────────────────────────────────────────────
  uploadLogo: protectedProcedure
    .input(z.object({ handle: z.string(), base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      const isAdmin = await isPageAdmin(page.id, ctx.user.id);
      if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      const rawLogoBuf = Buffer.from(input.base64, "base64");
      const { buffer: buf } = await compressAvatar(rawLogoBuf);
      const key = `page-logos/page-${page.id}-${Date.now()}.jpg`;
      const { url } = await storagePut(key, buf, "image/jpeg");
      await updateOrgPage(page.id, { logo: url });
      return { url };
    }),

  uploadCover: protectedProcedure
    .input(z.object({ handle: z.string(), base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const page = await getOrgPageByHandle(input.handle);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      const isAdmin = await isPageAdmin(page.id, ctx.user.id);
      if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      const rawPageCoverBuf = Buffer.from(input.base64, "base64");
      const { buffer: buf } = await compressCover(rawPageCoverBuf);
      const key = `page-covers/page-${page.id}-${Date.now()}.jpg`;
      const { url } = await storagePut(key, buf, "image/jpeg");
      await updateOrgPage(page.id, { coverPhoto: url });
      return { url };
    }),
});

// ─── Public Groups Router ────────────────────────────────────────────────────
const publicGroupsRouter = router({
  create: protectedProcedure
    .input(z.object({
      handle: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).refine((value) => !value.toLowerCase().startsWith("http"), "Handle cannot be a web address"),
      name: z.string().min(2).max(150),
      description: z.string().max(1000).optional(),
      category: z.string().max(80).optional(),
      visibility: z.enum(["public", "private"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getPublicGroupByHandle(input.handle);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Handle already taken." });
      const groupId = await createPublicGroup({ ...input, visibility: input.visibility ?? "public", createdBy: ctx.user!.id });
      await joinPublicGroup(groupId, ctx.user!.id, "admin");
      return { groupId, handle: input.handle };
    }),

  list: publicProcedure
    .input(z.object({ search: z.string().optional(), limit: z.number().default(24), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return listPublicGroups(input.search, input.limit, input.offset);
    }),

  getByHandle: publicProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ input, ctx }) => {
      const foundGroup = await getPublicGroupByHandle(input.handle);
      if (!foundGroup) return null;
      const group = await normaliseUnsafePublicGroupHandle(foundGroup);
      const membership = ctx.user ? await getPublicGroupMembership(group.id, ctx.user.id) : null;
      const membershipRecord = ctx.user ? await getPublicGroupMembershipRecord(group.id, ctx.user.id) : null;
      const isPrivate = group.visibility === "private";
      return {
        ...group,
        requestedHandle: input.handle,
        canonicalHandle: group.handle,
        isMember: !!membership,
        isAdmin: membership?.role === "admin",
        isModerator: membership?.role === "moderator",
        memberRole: membership?.role ?? null,
        membershipStatus: membershipRecord?.status ?? null,
        canViewContent: !isPrivate || !!membership,
      };
    }),

  update: protectedProcedure
    .input(z.object({
      handle: z.string(),
      name: z.string().min(2).max(150).optional(),
      description: z.string().max(1000).optional(),
      category: z.string().max(80).optional(),
      visibility: z.enum(["public", "private"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user!.id);
      if (membership?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { handle: _h, ...data } = input;
      await updatePublicGroup(group.id, data);
      return { success: true };
    }),

  join: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const status = await joinPublicGroup(group.id, ctx.user!.id, "member", group.visibility === "private");
      return { success: true, status };
    }),

  leave: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      if (group.createdBy === ctx.user!.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Group creator cannot leave. Transfer ownership first." });
      await leavePublicGroup(group.id, ctx.user!.id);
      return { success: true };
    }),

  getMembers: publicProcedure
    .input(z.object({ handle: z.string(), limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) return [];
      const membership = ctx.user ? await getPublicGroupMembership(group.id, ctx.user.id) : null;
      if (group.visibility === "private" && !membership) throw new TRPCError({ code: "FORBIDDEN", message: "Join request approval is required to view private Group members." });
      const members = await getPublicGroupMembers(group.id, input.limit);
      const enriched = await Promise.all(members.map(async (m) => {
        const user = await getUserById(m.userId);
        return { ...m, user: user ? { id: user.id, name: user.name, avatar: user.avatar ?? null, isVerified: user.isVerified } : null };
      }));
      return enriched.filter(m => m.user !== null);
    }),

  getJoinRequests: protectedProcedure
    .input(z.object({ handle: z.string() }))
    .query(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user.id);
      if (membership?.role !== "admin" && membership?.role !== "moderator") throw new TRPCError({ code: "FORBIDDEN" });
      const requests = await getPendingPublicGroupJoinRequests(group.id);
      const users = await Promise.all(requests.map((request) => getUserById(request.userId)));
      return requests.map((request, index) => ({ ...request, user: users[index] ? { id: users[index]!.id, name: users[index]!.name, avatar: users[index]!.avatar ?? null } : null }));
    }),

  reviewJoinRequest: protectedProcedure
    .input(z.object({ handle: z.string(), userId: z.number().int(), approve: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user.id);
      if (membership?.role !== "admin" && membership?.role !== "moderator") throw new TRPCError({ code: "FORBIDDEN" });
      await reviewPublicGroupJoinRequest(group.id, input.userId, input.approve);
      return { success: true };
    }),

  setMemberRole: protectedProcedure
    .input(z.object({ handle: z.string(), userId: z.number().int(), role: z.enum(["admin", "moderator", "member"]) }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const myMembership = await getPublicGroupMembership(group.id, ctx.user!.id);
      if (myMembership?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await setPublicGroupMemberRole(group.id, input.userId, input.role);
      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ handle: z.string(), userId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const myMembership = await getPublicGroupMembership(group.id, ctx.user!.id);
      if (myMembership?.role !== "admin" && myMembership?.role !== "moderator") throw new TRPCError({ code: "FORBIDDEN" });
      await leavePublicGroup(group.id, input.userId);
      return { success: true };
    }),

  createPost: protectedProcedure
    .input(z.object({
      handle: z.string(),
      content: postTextSchema.optional(),
      mediaUrl: z.string().optional(),
      // The shared composer emits image; legacy Group rows store the equivalent photo value.
      mediaType: z.enum(["image", "photo", "video"]).optional(),
      photo2Url: z.string().optional(),
      photo3Url: z.string().optional(),
      photo1Caption: z.string().max(300).optional(),
      photo2Caption: z.string().max(300).optional(),
      photo3Caption: z.string().max(300).optional(),
      photo1Alt: z.string().max(500).optional(),
      photo2Alt: z.string().max(500).optional(),
      photo3Alt: z.string().max(500).optional(),
      videoPosterUrl: z.string().optional(),
      audioUrl: z.string().optional(),
      audioName: z.string().max(255).optional(),
      docUrl: z.string().optional(),
      docName: z.string().max(255).optional(),
      docSize: z.number().int().optional(),
      docType: z.string().max(100).optional(),
      bgColor: z.string().optional(),
      poll: z.object({
        question: z.string().min(1).max(300),
        options: z.array(z.string().min(1).max(200)).min(2).max(6),
        expiresInHours: z.number().min(1).max(168).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user!.id);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Join the group to post." });

      // Public Group posts remain in their own group timeline, while retaining
      // their own safe URL-preview metadata for display in that group only.
      const detectedLinkUrl = input.content ? extractFirstUrl(input.content) : null;
      let linkPreview = null;
      if (detectedLinkUrl) linkPreview = await fetchLinkPreview(detectedLinkUrl);

      // YouTube does not always return an Open Graph image to server-side preview
      // requests. Derive a stable image from its video ID so Group link cards keep
      // a visible video thumbnail even when remote metadata omits one.
      const youtubeThumbnailUrl = detectedLinkUrl && isYouTubeUrl(detectedLinkUrl)
        ? (() => {
            const videoId = extractYouTubeVideoId(detectedLinkUrl);
            return videoId ? getYouTubeThumbnailUrl(videoId) : null;
          })()
        : null;

      // Auto-generate video poster at 1s if mediaType=video and no custom poster was provided.
      // A YouTube link uses its thumbnail as the matching poster.
      let resolvedPosterUrl: string | null = input.videoPosterUrl ?? youtubeThumbnailUrl;
      if (input.mediaType === "video" && input.mediaUrl && !resolvedPosterUrl && /^https?:\/\//i.test(input.mediaUrl)) {
        try {
          const { extractVideoFrame } = await import("./videoUtils");
          const { randomUUID } = await import("crypto");
          const videoUrl = input.mediaUrl.startsWith("/manus-storage/")
            ? `${process.env.BUILT_IN_FORGE_API_URL ?? ""}/storage/files/${input.mediaUrl.replace("/manus-storage/", "")}`
            : input.mediaUrl;
          const videoResp = await fetch(videoUrl);
          if (videoResp.ok) {
            const videoBuf = Buffer.from(await videoResp.arrayBuffer());
            const frameBuf = await extractVideoFrame(videoBuf, 1);
            if (frameBuf) {
              const posterKey = `auto-posters/${ctx.user.id}-${randomUUID()}.jpg`;
              const { url } = await storagePut(posterKey, frameBuf, "image/jpeg");
              resolvedPosterUrl = url;
            }
          }
        } catch (err) {
          console.error("[publicGroups.createPost] Auto-poster generation failed:", err);
        }
      }

      const postId = await createPublicGroupPost({
        groupId: group.id,
        authorId: ctx.user!.id,
        content: input.content ?? null,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType === "image" ? "photo" : (input.mediaType ?? null),
        photo2Url: input.photo2Url ?? null,
        photo3Url: input.photo3Url ?? null,
        photo1Caption: input.photo1Caption ?? null,
        photo2Caption: input.photo2Caption ?? null,
        photo3Caption: input.photo3Caption ?? null,
        photo1Alt: input.photo1Alt ?? null,
        photo2Alt: input.photo2Alt ?? null,
        photo3Alt: input.photo3Alt ?? null,
        videoPosterUrl: resolvedPosterUrl,
        audioUrl: input.audioUrl ?? null,
        audioName: input.audioName ?? null,
        docUrl: input.docUrl ?? null,
        docName: input.docName ?? null,
        docSize: input.docSize ?? null,
        docType: input.docType ?? null,
        bgColor: input.bgColor ?? null,
        linkUrl: linkPreview?.url ?? detectedLinkUrl ?? null,
        linkTitle: linkPreview?.title ?? null,
        linkDescription: linkPreview?.description ?? null,
        linkImage: linkPreview?.image ?? youtubeThumbnailUrl ?? null,
        linkSiteName: linkPreview?.siteName ?? null,
      });

      // Save hashtags
      if (input.content) {
        const tags = extractHashtags(input.content);
        if (tags.length > 0) await saveHashtags(postId, tags);
      }
      // Create poll if provided
      if (input.poll) {
        const expiresAt = input.poll.expiresInHours
          ? new Date(Date.now() + input.poll.expiresInHours * 3600 * 1000)
          : undefined;
        const pollId = await createPoll({
          postId,
          question: input.poll.question,
          expiresAt: expiresAt ?? null,
        });
        await createPollOptions(
          input.poll.options.map((text, i) => ({ pollId, text, displayOrder: i }))
        );
      }

      return { postId };
    }),

  getPosts: publicProcedure
    .input(z.object({ handle: z.string(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) return { posts: [], authors: {} };
      const membership = ctx.user ? await getPublicGroupMembership(group.id, ctx.user.id) : null;
      if (group.visibility === "private" && !membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Join request approval is required to view this private Group." });
      }
      const posts = await getPublicGroupPosts(group.id, input.limit, input.offset);
      const commentCounts = await getPublicGroupPostCommentCounts(posts.map((post) => post.id));
      const authorIds = Array.from(new Set(posts.map(p => p.authorId)));
      const authorList = await Promise.all(authorIds.map(id => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const a of authorList) {
        if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null, isVerified: a.isVerified ?? false };
      }
      return { posts, authors, commentCounts };
    }),

  getReactionSummary: publicProcedure
    .input(z.object({ handle: z.string(), postId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const post = await getPublicGroupPostById(input.postId);
      if (!post || post.groupId !== group.id) throw new TRPCError({ code: "NOT_FOUND" });
      return getPublicGroupPostReactionSummary(post.id, ctx.user?.id ?? null);
    }),

  setReaction: protectedProcedure
    .input(z.object({
      handle: z.string(),
      postId: z.number().int(),
      reaction: z.enum(["like", "love", "haha", "wow", "sad", "angry"]).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user.id);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Join the group to react." });
      const post = await getPublicGroupPostById(input.postId);
      if (!post || post.groupId !== group.id) throw new TRPCError({ code: "NOT_FOUND" });
      await setPublicGroupPostReaction(ctx.user.id, post.id, input.reaction);
      return getPublicGroupPostReactionSummary(post.id, ctx.user.id);
    }),

  isSaved: protectedProcedure
    .input(z.object({ handle: z.string(), postId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const post = await getPublicGroupPostById(input.postId);
      if (!post || post.groupId !== group.id) throw new TRPCError({ code: "NOT_FOUND" });
      return { saved: await isPublicGroupPostSaved(ctx.user.id, post.id) };
    }),

  toggleSaved: protectedProcedure
    .input(z.object({ handle: z.string(), postId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user.id);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Join the group to save a Group post." });
      const post = await getPublicGroupPostById(input.postId);
      if (!post || post.groupId !== group.id) throw new TRPCError({ code: "NOT_FOUND" });
      return togglePublicGroupPostSave(ctx.user.id, post.id);
    }),

  repost: protectedProcedure
    .input(z.object({ handle: z.string(), postId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user.id);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Join the group to repost." });
      const post = await getPublicGroupPostById(input.postId);
      if (!post || post.groupId !== group.id) throw new TRPCError({ code: "NOT_FOUND" });
      const postId = await repostPublicGroupPost(ctx.user.id, post.id);
      return { postId };
    }),

  getComments: publicProcedure
    .input(z.object({ handle: z.string(), postId: z.number().int(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const post = await getPublicGroupPostById(input.postId);
      if (!post || post.groupId !== group.id) throw new TRPCError({ code: "NOT_FOUND" });
      const comments = await getPublicGroupPostComments(post.id, input.limit);
      const authors: Record<number, { id: number; name: string | null; avatar: string | null; isVerified: boolean }> = {};
      for (const authorId of Array.from(new Set(comments.map((comment) => comment.authorId)))) {
        const author = await getUserById(authorId);
        if (author) authors[author.id] = { id: author.id, name: author.name, avatar: author.avatar ?? null, isVerified: author.isVerified ?? false };
      }
      return { comments, authors };
    }),

  addComment: protectedProcedure
    .input(z.object({ handle: z.string(), postId: z.number().int(), text: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user.id);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Join the group to comment." });
      const post = await getPublicGroupPostById(input.postId);
      if (!post || post.groupId !== group.id) throw new TRPCError({ code: "NOT_FOUND" });
      const commentId = await createPublicGroupPostComment(post.id, ctx.user.id, input.text);
      return { commentId };
    }),

  deleteComment: protectedProcedure
    .input(z.object({ handle: z.string(), commentId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user.id);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      await deletePublicGroupPostComment(input.commentId, ctx.user.id);
      return { success: true };
    }),

  deletePost: protectedProcedure
    .input(z.object({ handle: z.string(), postId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      await deletePublicGroupPost(input.postId, ctx.user!.id);
      return { success: true };
    }),

  uploadCover: protectedProcedure
    .input(z.object({ handle: z.string(), base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const group = await getPublicGroupByHandle(input.handle);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const membership = await getPublicGroupMembership(group.id, ctx.user!.id);
      if (membership?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const rawGroupCoverBuf = Buffer.from(input.base64, "base64");
      const { buffer: buf } = await compressCover(rawGroupCoverBuf);
      const key = `group-covers/${group.id}-${Date.now()}.jpg`;
      const { url } = await storagePut(key, buf, "image/jpeg");
      await uploadPublicGroupCover(group.id, url);
      return { url };
    }),
});

// ─── Stories Router ───────────────────────────────────────────────────────────
const storiesRouter = router({
  // Get all active stories grouped by author
  feed: protectedProcedure.query(async ({ ctx }) => {
    const allStories = await getActiveStories();
    if (allStories.length === 0) return { stories: [], authors: {}, viewedIds: [] };
    const authorIds = Array.from(new Set(allStories.map(s => s.authorId)));
    const authorList = await Promise.all(authorIds.map(id => getUserById(id)));
    const authors: Record<number, { id: number; name: string | null; avatar: string | null }> = {};
    for (const a of authorList) { if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null }; }
    const storyIds = allStories.map(s => s.id);
    const viewedIds = await getViewedStoryIds(ctx.user.id, storyIds);
    return { stories: allStories, authors, viewedIds };
  }),
  create: protectedProcedure
    .input(z.object({
      mediaUrl: z.string().min(1), // accepts both full URLs and /manus-storage/... relative paths
      storageKey: z.string(),
      mediaType: z.enum(["photo", "video"]).default("photo"),
      caption: z.string().max(300).optional(),
      duration: z.number().min(1000).max(15000).default(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const id = await createStory({
        authorId: ctx.user.id,
        mediaUrl: input.mediaUrl,
        storageKey: input.storageKey,
        mediaType: input.mediaType,
        caption: input.caption ?? null,
        duration: input.duration,
        expiresAt,
      });
      return { id };
    }),
  delete: protectedProcedure
    .input(z.object({ storyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteStory(input.storyId, ctx.user.id);
      return { success: true };
    }),
  view: protectedProcedure
    .input(z.object({ storyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await recordStoryView(input.storyId, ctx.user.id);
      return { success: true };
    }),
  getViewers: protectedProcedure
    .input(z.object({ storyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const story = await getStoryById(input.storyId);
      if (!story || story.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const viewerIds = await getStoryViewerIds(input.storyId);
      const viewers = await Promise.all(viewerIds.map(id => getUserById(id)));
      return viewers.filter(Boolean).map(v => ({ id: v!.id, name: v!.name, avatar: v!.avatar ?? null }));
    }),
  uploadMedia: protectedProcedure
    .input(z.object({ base64: z.string(), mimeType: z.string(), fileName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("./storage");
      const rawStoryBuf = Buffer.from(input.base64, "base64");
      let storyBuffer = rawStoryBuf;
      let storyMime = input.mimeType;
      if (input.mimeType.startsWith("image/")) {
        const compressed = await compressImage(rawStoryBuf);
        storyBuffer = Buffer.from(compressed.buffer) as Buffer<ArrayBuffer>;
        storyMime = compressed.mimeType;
      }
      const key = `stories/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, storyBuffer, storyMime);
      return { url, storageKey: key };
    }),
  // ── Reactions ──────────────────────────────────────────────────────────────
  react: protectedProcedure
    .input(z.object({ storyId: z.number(), emoji: z.string().max(10) }))
    .mutation(async ({ ctx, input }) => {
      await upsertStoryReaction(input.storyId, ctx.user.id, input.emoji);
      return { success: true };
    }),
  getReactions: protectedProcedure
    .input(z.object({ storyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const story = await getStoryById(input.storyId);
      if (!story || story.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getStoryReactions(input.storyId);
    }),
  getMyReaction: protectedProcedure
    .input(z.object({ storyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const emoji = await getMyStoryReaction(input.storyId, ctx.user.id);
      return { emoji };
    }),
  getReactionCounts: protectedProcedure
    .input(z.object({ storyIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      return getStoryReactionCounts(input.storyIds);
    }),
  // ── Highlights ─────────────────────────────────────────────────────────────
  createHighlight: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(100), coverUrl: z.string().url().optional() }))
    .mutation(async ({ ctx, input }) => {
      const id = await createHighlight(ctx.user.id, input.title, input.coverUrl);
      return { id };
    }),
  getHighlights: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getHighlightsByUser(input.userId);
    }),
  hasActive: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const userStories = await getStoriesByUser(input.userId);
      return { hasActive: userStories.length > 0 };
    }),
  // Returns array of user IDs that currently have active stories (for feed story rings)
  hasActiveFeed: publicProcedure
    .input(z.object({ userIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      if (input.userIds.length === 0) return [];
      const results = await Promise.all(
        input.userIds.map(async (userId) => {
          const stories = await getStoriesByUser(userId);
          return stories.length > 0 ? userId : null;
        })
      );
      return results.filter((id): id is number => id !== null);
    }),
  deleteHighlight: protectedProcedure
    .input(z.object({ highlightId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteHighlight(input.highlightId, ctx.user.id);
      return { success: true };
    }),
  addToHighlight: protectedProcedure
    .input(z.object({
      highlightId: z.number(),
      mediaUrl: z.string().min(1), // accepts /manus-storage/... relative paths
      mediaType: z.enum(["photo", "video"]).default("photo"),
      caption: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hl = await getHighlightById(input.highlightId);
      if (!hl || hl.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await addStoryToHighlight(input.highlightId, input.mediaUrl, input.mediaType, input.caption);
      return { success: true };
    }),
  getHighlightItems: publicProcedure
    .input(z.object({ highlightId: z.number() }))
    .query(async ({ input }) => {
      return getHighlightItems(input.highlightId);
    }),
  removeFromHighlight: protectedProcedure
    .input(z.object({ itemId: z.number(), highlightId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const hl = await getHighlightById(input.highlightId);
      if (!hl || hl.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await removeHighlightItem(input.itemId, input.highlightId);
      return { success: true };
    }),
});

// ─── Trending Router ─────────────────────────────────────────────────────────
const trendingRouter = router({
  getPosts: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input, ctx }) => {
      const postsList = await getTrendingPosts(input.limit, ctx.user?.id);
      if (postsList.length === 0) return { posts: [], authors: {}, reactionCounts: {} };
      const authorIds = Array.from(new Set(postsList.map((p) => p.authorId)));
      const authorRows = await Promise.all(authorIds.map((id) => getUserById(id)));
      const authors: Record<number, { id: number; name: string | null; avatar: string | null }> = {};
      for (const a of authorRows) if (a) authors[a.id] = { id: a.id, name: a.name, avatar: a.avatar ?? null };
      const reactionCounts = await Promise.all(
        postsList.map(async (p) => ({ id: p.id, counts: await getPostReactionCounts(p.id) }))
      );
      const reactionCountsMap: Record<number, Record<string, number>> = {};
      for (const { id, counts } of reactionCounts) reactionCountsMap[id] = counts;
      return { posts: postsList, authors, reactionCounts: reactionCountsMap };
    }),
});

// ─── Video Views Router ───────────────────────────────────────────────────────
const videoViewsRouter = router({
  increment: protectedProcedure
    .input(z.object({ postId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await requireViewablePost(input.postId, ctx.user.id);
      const newCount = await incrementVideoViews(input.postId);
      // Notify post author if milestone reached (100, 500, 1000, 5000, ...)
      const milestones = [10, 50, 100, 500, 1000, 5000, 10000];
      if (milestones.includes(newCount)) {
        const post = await getPostForViewer(input.postId, ctx.user.id);
        if (post && post.authorId !== ctx.user.id) {
          await createNotification({
            userId: post.authorId,
            type: "like_post",
            actorId: ctx.user.id,
            postId: input.postId,
            commentId: null,
          });
        }
      }
      return { videoViews: newCount };
    }),
});

// ─── Shop (Sale & Buy) Router ────────────────────────────────────────────────
const SHOP_DAILY_LIMIT = 10; // separate from post limits

const SHOP_CATEGORIES = [
  "electronics", "vehicles", "property", "fashion", "home", "garden",
  "sports", "toys", "books", "music", "art", "food", "services", "jobs", "other",
] as const;

const shopListingInput = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  price: z.number().min(0).max(999999999),
  currency: z.string().max(10).default("USD"),
  condition: z.enum(["new", "like_new", "good", "fair", "for_parts"]).default("good"),
  category: z.string().max(100).default("other"),
  mediaUrls: z.array(z.string().min(1)).max(10).default([]),
  location: z.string().max(255).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  status: z.enum(["active", "draft"]).default("active"),
});

const shopRouter = router({
  createListing: protectedProcedure
    .input(shopListingInput)
    .mutation(async ({ ctx, input }) => {
      const todayCount = await countShopListingsToday(ctx.user.id);
      if (todayCount >= SHOP_DAILY_LIMIT) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `You can create up to ${SHOP_DAILY_LIMIT} listings per day.` });
      }
      const id = await createShopListing({
        sellerId: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        price: String(input.price),
        currency: input.currency,
        condition: input.condition,
        category: input.category,
        mediaUrls: input.mediaUrls,
        location: input.location ?? null,
        lat: input.lat !== undefined ? String(input.lat) : null,
        lng: input.lng !== undefined ? String(input.lng) : null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        status: input.status,
      });
      return { id };
    }),

  getListings: publicProcedure
    .input(z.object({
      limit: z.number().default(24),
      offset: z.number().default(0),
      category: z.string().optional(),
      condition: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const listings = await getShopListings(input);
      return listings;
    }),

  searchListings: publicProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().default(24) }))
    .query(async ({ input }) => {
      return searchShopListings(input.query, input.limit);
    }),

  getListing: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const listing = await getShopListingById(input.id);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND" });
      await incrementShopListingViews(input.id);
      return listing;
    }),

  getMyListings: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return getMyShopListings(ctx.user.id, input.limit, input.offset);
    }),

  updateListing: protectedProcedure
    .input(z.object({ id: z.number() }).merge(shopListingInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await getShopListingById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.sellerId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = String(data.price);
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.condition !== undefined) updateData.condition = data.condition;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.mediaUrls !== undefined) updateData.mediaUrls = data.mediaUrls;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.lat !== undefined) updateData.lat = String(data.lat);
      if (data.lng !== undefined) updateData.lng = String(data.lng);
      if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
      if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
      if (data.status !== undefined) updateData.status = data.status;
      await updateShopListing(id, existing.sellerId, updateData);
      return { success: true };
    }),

  markAsSold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getShopListingById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateShopListing(input.id, ctx.user.id, { status: "sold" });
      return { success: true };
    }),

  deleteListing: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getShopListingById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.sellerId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteShopListing(input.id, existing.sellerId);
      return { success: true };
    }),

  getCategories: publicProcedure.query(() => SHOP_CATEGORIES),

  // ─── Save / Watchlist ──────────────────────────────────────────────────────
  saveListing: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await saveShopListing(ctx.user.id, input.listingId);
      return { saved: true };
    }),

  unsaveListing: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await unsaveShopListing(ctx.user.id, input.listingId);
      return { saved: false };
    }),

  isSaved: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .query(async ({ ctx, input }) => {
      return { saved: await isShopListingSaved(ctx.user.id, input.listingId) };
    }),

  getSaved: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return getSavedShopListings(ctx.user.id, input.limit, input.offset);
    }),

  // ─── Admin Moderation ──────────────────────────────────────────────────────
  adminGetListings: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      isFlagged: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return adminGetShopListings(input);
    }),

  adminRemoveListing: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await adminUpdateShopListing(input.id, {
        status: "removed",
        isFlagged: true,
        flagReason: input.reason ?? "Removed by admin",
        removedByAdminId: ctx.user.id,
      });
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: "remove_listing",
        metadata: JSON.stringify({ listingId: input.id, reason: input.reason }),
      });
      return { success: true };
    }),

  adminRestoreListing: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await adminUpdateShopListing(input.id, {
        status: "active",
        isFlagged: false,
        flagReason: null,
        removedByAdminId: null,
      });
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: "restore_listing",
        metadata: JSON.stringify({ listingId: input.id }),
      });
      return { success: true };
    }),

  adminFlagListing: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await adminUpdateShopListing(input.id, { isFlagged: true, flagReason: input.reason });
      await insertAuditLog({
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        action: "flag_listing",
        metadata: JSON.stringify({ listingId: input.id, reason: input.reason }),
      });
      return { success: true };
    }),
});

// ─── Reels Router ─────────────────────────────────────────────────────────────

const reelsRouter = router({
  feed: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
      cursor: z.number().nullable().default(null),
      filter: z.enum(["forYou", "following"]).default("forYou"),
    }))
    .query(async ({ input, ctx }) => {
      let reelList;
      if (input.filter === "following" && ctx.user) {
        reelList = await getFollowingReelsFeed(input.limit, input.cursor, ctx.user.id);
      } else {
        reelList = await getReelsFeed(input.limit, input.cursor, ctx.user?.id ?? null);
      }
      return { reels: reelList, nextCursor: reelList.length === input.limit ? reelList[reelList.length - 1].id : null };
    }),
  getById: publicProcedure
    .input(z.object({ reelId: z.number() }))
    .query(async ({ input, ctx }) => {
      return getReelById(input.reelId, ctx.user?.id ?? null);
    }),

  upload: protectedProcedure
    .input(z.object({
      videoBase64: z.string(),
      thumbnailBase64: z.string().optional(),
      caption: z.string().max(500).optional(),
      duration: z.number().min(0).max(600).default(0),
      hashtags: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const limits = await getMediaLimits();
      const videoMaxMb = limits["video_max_mb"] ?? 10;
      const videoMaxSec = limits["video_max_seconds"] ?? 120;
      const durationSeconds = Math.max(0, Math.round(input.duration || 0));
      if (durationSeconds > videoMaxSec) throw new TRPCError({ code: "BAD_REQUEST", message: `Video must be under ${videoMaxSec} seconds` });
      const videoBuffer = Buffer.from(input.videoBase64, "base64");
      if (videoBuffer.length > videoMaxMb * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: `Video must be under ${videoMaxMb} MB` });
      await checkUploadedVideoForSexualContent(ctx.user.id, videoBuffer, durationSeconds);
      const videoKey = `reels/${ctx.user.id}-${Date.now()}.mp4`;
      const { url: videoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");
      let thumbnailUrl: string | undefined;
      if (input.thumbnailBase64) {
        const thumbBuffer = Buffer.from(input.thumbnailBase64, "base64");
        await checkUploadedImageForSexualContent(ctx.user.id, thumbBuffer, "image/jpeg", "reel thumbnail");
        const thumbKey = `reels/thumb-${ctx.user.id}-${Date.now()}.jpg`;
        const { url } = await storagePut(thumbKey, thumbBuffer, "image/jpeg");
        thumbnailUrl = url;
      }
      const reelId = await createReel({ authorId: ctx.user.id, videoUrl, thumbnailUrl, caption: input.caption, duration: durationSeconds, hashtags: input.hashtags });
      return { reelId };
    }),

  like: protectedProcedure
    .input(z.object({ reelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return toggleReelLike(input.reelId, ctx.user.id);
    }),

  view: protectedProcedure
    .input(z.object({ reelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await recordReelView(input.reelId, ctx.user.id);
      return { ok: true };
    }),

  addComment: protectedProcedure
    .input(z.object({ reelId: z.number(), content: z.string().min(1).max(1000) }))
    .mutation(async ({ input, ctx }) => {
      const commentId = await addReelComment(input.reelId, ctx.user.id, input.content);
      return { commentId };
    }),

  getComments: publicProcedure
    .input(z.object({ reelId: z.number() }))
    .query(async ({ input }) => {
      return getReelComments(input.reelId);
    }),

  delete: protectedProcedure
    .input(z.object({ reelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteReel(input.reelId, ctx.user.id);
      return { ok: true };
    }),
  getHashtags: publicProcedure
    .query(async () => {
      return getReelHashtags();
    }),
});

// ─── Call History Router ─────────────────────────────────────────────────────────────
const callHistoryRouter = router({
  log: protectedProcedure
    .input(z.object({
      calleeId: z.number(),
      type: z.enum(["voice", "video"]),
      status: z.enum(["missed", "answered", "declined"]),
      duration: z.number().min(0).default(0),
      startedAt: z.number().optional(), // unix ms
      endedAt: z.number().optional(),   // unix ms
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await insertCallHistory({
        callerId: ctx.user.id,
        calleeId: input.calleeId,
        type: input.type,
        status: input.status,
        duration: input.duration,
        startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
        endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
      });
      return { id };
    }),
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(30), cursor: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await getCallHistory(ctx.user.id, input.limit, input.cursor);
      return { rows, nextCursor: rows.length === input.limit ? rows[rows.length - 1].id : undefined };
    }),
  missedCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await getMissedCallCount(ctx.user.id);
    return { count };
  }),
  markSeen: protectedProcedure.mutation(async ({ ctx }) => {
    await updateLastCallsSeen(ctx.user.id);
    return { ok: true };
  }),
});

// ─── Push Notifications Router ─────────────────────────────────────────────────────────────
const pushRouter = router({
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await savePushSubscription(ctx.user.id, input.endpoint, input.p256dh, input.auth);
      return { ok: true };
    }),
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await deletePushSubscription(ctx.user.id, input.endpoint);
      return { ok: true };
    }),
  vapidPublicKey: publicProcedure.query(() => {
    return { key: process.env.VITE_VAPID_PUBLIC_KEY ?? "" };
  }),
});


// ─── Support Router ───────────────────────────────────────────────────────────
const supportRouter = router({
  submit: protectedProcedure
    .input(z.object({
      topic: z.string().min(2).max(200),
      message: z.string().min(1).max(5000),
      phone: z.string().max(50).optional(),
      whatsapp: z.string().max(50).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const msgId = await createSupportMessage({
        userId: ctx.user.id,
        topic: input.topic,
        message: input.message,
        phone: input.phone,
        whatsapp: input.whatsapp,
      });
      // Notify all admins and super_admins via in-app notification and email
      const adminIds = await getAdminUserIds();
      for (const adminId of adminIds) {
        await createNotification({
          userId: adminId,
          actorId: ctx.user.id,
          type: "admin_promoted",
          postId: msgId,
        });
      }
      // Email all admins about the new support message
      const adminEmails = await getAdminEmails();
      for (const admin of adminEmails) {
        if (admin.email) {
          sendSupportMessageEmail({
            adminEmail: admin.email,
            adminName: admin.name ?? "Admin",
            senderName: ctx.user.name ?? "User",
            senderEmail: ctx.user.email ?? "",
            topic: input.topic,
            message: input.message,
            phone: input.phone ?? undefined,
            whatsapp: input.whatsapp ?? undefined,
          }).catch(err => console.error("[Support Email] Failed:", err));
        }
      }
      return { ok: true, msgId };
    }),
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().default(0) }))
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getSupportMessages(50, 0);
    }),
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await markSupportMessageRead(input.id);
      return { ok: true };
    }),
  myMessages: protectedProcedure
    .query(async ({ ctx }) => {
      return getUserSupportMessages(ctx.user.id);
    }),
   unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        return { count: 0 };
      }
      const count = await getSupportUnreadCount();
      return { count };
    }),

  reply: protectedProcedure
    .input(z.object({ messageId: z.number(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      await createSupportReply(input.messageId, ctx.user.id, ctx.user.name ?? null, input.content);
      // Notify the message author that admin replied
      const msgs = await getSupportMessages();
      const msg = msgs.find((m) => m.id === input.messageId);
      if (msg) {
        await createNotification({
          userId: msg.userId,
          actorId: ctx.user.id,
          type: "support_reply",
        });
      }
      return { ok: true };
    }),

  getReplies: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const msgs = await getSupportMessages();
      const msg = msgs.find((m) => m.id === input.messageId);
      if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && msg.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getSupportReplies(input.messageId);
    }),

  topicStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getSupportTopicStats();
  }),

  resolve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      await resolveSupportMessage(input.id);
      return { ok: true };
    }),
});
// ─── Feed Ads Router ────────────────────────────────────────────────────────
const feedAdsRouter = router({
  getActive: publicProcedure
    .input(z.object({ slot: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => {
      return getActiveFeedAd(input?.slot);
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
    return listFeedAds();
  }),
  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      title: z.string().max(200).optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      imageKey: z.string().optional(),
      linkUrl: z.string().optional(),
      linkText: z.string().max(100).optional(),
      imageWidth: z.number().optional(),
      imageHeight: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      return upsertFeedAd(input);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteFeedAd(input.id);
      return { ok: true };
    }),
  trackEvent: publicProcedure
    .input(z.object({
      adId: z.number(),
      eventType: z.enum(["impression", "click"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await trackAdEvent(input.adId, input.eventType, ctx.user?.id);
      return { ok: true };
    }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAdStats();
  }),
});

// ─── Home News Feed Router ──────────────────────────────────────────────────
type NewsFeedItem = {
  title: string;
  link: string;
  sourceName: string;
  language: string;
  publishedAt: string | null;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function readXmlTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1].replace(/<[^>]+>/g, "")) : null;
}

function parseRssItems(xml: string, sourceName: string, language: string, limit: number): NewsFeedItem[] {
  const itemBlocks = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).map((m) => m[0]);
  const entryBlocks = itemBlocks.length > 0 ? itemBlocks : Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map((m) => m[0]);
  return entryBlocks.slice(0, limit).map((block) => {
    const title = readXmlTag(block, "title") ?? "News update";
    const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;
    const link = readXmlTag(block, "link") ?? atomLink ?? "#";
    const publishedAt = readXmlTag(block, "pubDate") ?? readXmlTag(block, "published") ?? readXmlTag(block, "updated");
    return { title, link, sourceName, language, publishedAt };
  }).filter((item) => item.title && item.link);
}

const newsFeedRouter = router({
  headlines: publicProcedure
    .input(z.object({ perSource: z.number().int().min(1).max(8).default(4) }).optional())
    .query(async ({ input }) => {
      const sources = await listNewsFeedSources(false);
      const perSource = input?.perSource ?? 4;
      const results = await Promise.allSettled(
        sources.map(async (source) => {
          const response = await fetch(source.feedUrl, {
            headers: { "user-agent": "FacingFace News Feed/1.0" },
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
          const xml = await response.text();
          return parseRssItems(xml, source.name, source.language, perSource);
        })
      );
      return results.flatMap((result) => result.status === "fulfilled" ? result.value : []).slice(0, 12);
    }),
  sources: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
    return listNewsFeedSources(true);
  }),
  upsertSource: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(160),
      feedUrl: z.string().url(),
      websiteUrl: z.string().url().optional().nullable(),
      language: z.string().min(2).max(20).default("en"),
      displayOrder: z.number().int().default(0),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      return upsertNewsFeedSource({
        ...input,
        websiteUrl: input.websiteUrl ?? null,
      });
    }),
  deleteSource: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteNewsFeedSource(input.id);
      return { ok: true };
    }),
});

// ─── Suggestions Router ───────────────────────────────────────────────────────
const suggestionsRouter = router({
  people: protectedProcedure.query(async ({ ctx }) => {
    return getSuggestedUsers(ctx.user.id, 6);
  }),
});

const inactiveRemindersRouter = router({
  status: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user?.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can view reminder status." });
      }
      const [summary, email] = await Promise.all([
        getInactiveReminderSummary(),
        Promise.resolve(getEmailDeliveryConfig()),
      ]);
      return { summary, email };
    }),

  trigger: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user?.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can trigger reminders." });
      }
      const { sendInactiveUserReminders } = await import("./inactiveUserReminder");
      return sendInactiveUserReminders();
    }),

  sendTest: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user?.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can send a reminder test." });
      }

      const emailConfig = getEmailDeliveryConfig();
      if (!emailConfig.configured) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "SMTP is not configured. Add the Gmail SMTP values in Render before sending a test.",
        });
      }

      // Do not expose a free-form recipient field. The test is deliberately
      // limited to the configured owner inbox, which defaults to SMTP_USER.
      const recipient = process.env.SMTP_TEST_RECIPIENT?.trim() || process.env.SMTP_USER?.trim();
      if (!recipient || !z.string().email().safeParse(recipient).success) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Set SMTP_TEST_RECIPIENT to a valid owner email address in Render.",
        });
      }

      try {
        const receipt = await sendInactiveUserReminderEmail({
          to: recipient,
          name: "FacingFace Admin",
          isTest: true,
        });
        if (receipt.accepted.length === 0 || receipt.rejected.length > 0) {
          throw new Error("SMTP did not accept the test recipient.");
        }
        return { success: true, recipient, sender: receipt.from, messageId: receipt.messageId };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Reminder test email failed: ${detail}`,
        });
      }
    }),
});

const eventsRouter = router({
  getMy: protectedProcedure.query(async ({ ctx }) => {
    const events = await getSocialEventsForUser(ctx.user.id);
    const attendance = await getSocialEventAttendance(events.map((event) => event.id));
    return { events, attendance };
  }),

  invitableFriends: protectedProcedure.query(async ({ ctx }) => {
    const friends = await getFriendsWithProfiles(ctx.user.id);
    return {
      friends: friends.map((row) => ({
        id: row.friend!.id,
        name: row.friend!.name,
        avatar: row.friend!.avatar ?? null,
      })),
    };
  }),

  birthdays: protectedProcedure.query(async ({ ctx }) => {
    const birthdays = await getFriendBirthdays(ctx.user.id);
    return {
      today: birthdays.filter((birthday) => birthday.daysUntil === 0),
      upcoming: birthdays.filter((birthday) => birthday.daysUntil > 0),
    };
  }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().trim().min(2).max(200),
      description: z.string().trim().max(2_000).optional().nullable(),
      location: z.string().trim().max(255).optional().nullable(),
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date().optional().nullable(),
      inviteeIds: z.array(z.number().int().positive()).max(100).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.startsAt.getTime() < Date.now() - 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a future start date and time for the event." });
      }
      if (input.endsAt && input.endsAt.getTime() <= input.startsAt.getTime()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The event end time must be after its start time." });
      }

      const inviteeIds = [...new Set(input.inviteeIds)].filter((id) => id !== ctx.user.id);
      const friendshipChecks = await Promise.all(inviteeIds.map(async (id) => ({ id, isFriend: await areFriends(ctx.user.id, id) })));
      if (friendshipChecks.some((check) => !check.isFriend)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Events can be sent only to accepted friends." });
      }

      const eventId = await createSocialEvent({
        organizerId: ctx.user.id,
        title: input.title,
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
      });
      await createSocialEventInvitations(eventId, ctx.user.id, inviteeIds);
      return { eventId };
    }),

  invite: protectedProcedure
    .input(z.object({ eventId: z.number().int().positive(), inviteeIds: z.array(z.number().int().positive()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const event = await getSocialEventById(input.eventId);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      if (event.organizerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the event host can invite friends." });
      const inviteeIds = [...new Set(input.inviteeIds)].filter((id) => id !== ctx.user.id);
      const friendshipChecks = await Promise.all(inviteeIds.map(async (id) => ({ id, isFriend: await areFriends(ctx.user.id, id) })));
      if (friendshipChecks.some((check) => !check.isFriend)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Events can be sent only to accepted friends." });
      }
      await createSocialEventInvitations(event.id, ctx.user.id, inviteeIds);
      return { success: true };
    }),

  respond: protectedProcedure
    .input(z.object({ eventId: z.number().int().positive(), status: z.enum(["going", "maybe", "declined"]) }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await getSocialEventInvitation(input.eventId, ctx.user.id);
      if (!invitation) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have an invitation to this event." });
      await setSocialEventResponse(input.eventId, ctx.user.id, input.status);
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ eventId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const event = await getSocialEventById(input.eventId);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      if (event.organizerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the event host can cancel this event." });
      await deleteSocialEvent(event.id, ctx.user.id);
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Express expires a cleared cookie automatically; passing maxAge is deprecated.
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true } as const;
    }),

    register: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(6).max(128),
        origin: z.string().url().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? ctx.req.socket?.remoteAddress ?? "unknown";
        registerLimiter.check(ip);
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Please log in." });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `email:${input.email}`;
        await createEmailUser({ openId, name: input.name, email: input.email, passwordHash });
        // Generate a secure verification token
        const { randomBytes } = await import("crypto");
        const verifyToken = randomBytes(32).toString("hex");
        const newUser = await getUserByEmail(input.email);
        if (newUser) {
          await setVerificationToken(newUser.id, verifyToken);
          const origin = input.origin ?? "https://facingface-com.manus.space";
          const verifyUrl = `${origin}/verify-email?token=${verifyToken}&email=${encodeURIComponent(input.email)}`;
          try {
            await sendVerificationEmail({ to: input.email, name: input.name, verifyUrl });
          } catch (err) {
            console.error("[Email] Failed to send verification email:", err);
          }
        }
        // Do NOT issue a session cookie yet — user must verify email first
        return { success: true, needsVerification: true } as const;
      }),

    verifyEmail: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByVerificationToken(input.token);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired verification link. Please request a new one." });
        }
        await markEmailVerified(user.id);
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),

    resendVerification: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url().optional() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          // Silently succeed to prevent email enumeration
          return { success: true } as const;
        }
        if (user.emailVerified) {
          return { success: true, alreadyVerified: true } as const;
        }
        const { randomBytes } = await import("crypto");
        const verifyToken = randomBytes(32).toString("hex");
        await setVerificationToken(user.id, verifyToken);
        const origin = input.origin ?? "https://facingface-com.manus.space";
        const verifyUrl = `${origin}/verify-email?token=${verifyToken}&email=${encodeURIComponent(user.email!)}`;
        try {
          await sendVerificationEmail({ to: user.email!, name: user.name ?? "Friend", verifyUrl });
        } catch (err) {
          console.error("[Email] Failed to resend verification email:", err);
        }
        return { success: true } as const;
      }),

    emailLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const ipAddr = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? ctx.req.socket?.remoteAddress ?? "unknown";
        // Check rate limit FIRST before any DB work
        loginLimiter.check(ipAddr);
        // Fetch user — wrap in try/catch so raw DB errors never reach the frontend
        let user: Awaited<ReturnType<typeof getUserByEmail>>;
        try {
          user = await getUserByEmail(input.email);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login is temporarily unavailable. Please try again in a moment." });
        }
        // Send lockout email on the 11th attempt (first over-limit hit)
        if (user?.email) {
          const entry = loginLimiter._store.get(ipAddr);
          if (entry && entry.count === 11) {
            const retryAfterSec = Math.ceil((entry.resetAt - Date.now()) / 1000);
            sendLoginLockoutEmail({
              to: user.email,
              name: user.name ?? "there",
              ipAddress: ipAddr,
              retryAfterSeconds: retryAfterSec,
            }).catch(() => {});
          }
        }
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        // Block login if email is not verified
        if (!user.emailVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Please verify your email address before logging in. Check your inbox for the verification link.",
          });
        }
        // Check if 2FA is enabled for this user
        const totpRecord = await getTotpSecret(user.id);
        if (totpRecord?.enabled) {
          // Issue a short-lived pending token (5 min) instead of a full session
          const { SignJWT } = await import("jose");
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
          const pendingToken = await new SignJWT({ userId: user.id, type: "2fa_pending" })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("5m")
            .sign(secretKey);
          return { success: false, needs2FA: true, pendingToken } as const;
        }
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? user.email ?? user.openId });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        // Track active session
        const ua = ctx.req.headers["user-agent"] ?? "";
        const ip = (ctx.req.headers["x-forwarded-for"] as string ?? ctx.req.socket?.remoteAddress ?? "").split(",")[0].trim();
        const device = ua.includes("Mobile") ? "Mobile" : ua.includes("Tablet") ? "Tablet" : "Desktop";
        await createActiveSession({ userId: user.id, tokenHash: hashToken(token), device, ipAddress: ip, userAgent: ua.slice(0, 512) });
        const authenticatedUser = await getUserByOpenId(user.openId);
        if (!authenticatedUser) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login succeeded, but the user session could not be loaded." });
        }
        return {
          success: true,
          needs2FA: false,
          user: authenticatedUser,
        } as const;
      }),
    forgotPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        origin: z.string().url().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // Always return success to prevent email enumeration
        if (!user || !user.passwordHash) return { success: true } as const;
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await createPasswordResetToken(user.id, token, expiresAt);
        const origin = input.origin ?? "https://facingface-com.manus.space";
        const resetUrl = `${origin}/reset-password?token=${token}`;
        try {
          await sendPasswordResetEmail({ to: user.email!, name: user.name ?? "Friend", resetUrl });
        } catch (err) {
          console.error("[Email] Failed to send password reset email:", err);
        }
        return { success: true } as const;
      }),
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        password: z.string().min(6).max(128),
      }))
      .mutation(async ({ input }) => {
        const record = await getPasswordResetToken(input.token);
        if (!record) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired reset link." });
        }
        if (record.usedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link has already been used." });
        }
        if (new Date() > record.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link has expired. Please request a new one." });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        await updateUserPassword(record.userId, passwordHash);
        await markPasswordResetTokenUsed(record.id);
        return { success: true } as const;
      }),
    uploadAvatar: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string().regex(/^image\//),
        base64: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
        const buffer = Buffer.from(input.base64, "base64");
        if (buffer.length > MAX_SIZE) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Avatar image too large. Maximum size is 5 MB." });
        }
        const { buffer: compBuf } = await compressAvatar(buffer);
        const key = `avatars/${ctx.user.id}/${Date.now()}.jpg`;
        const { url } = await storagePut(key, compBuf, "image/jpeg");
        await uploadAvatar(ctx.user.id, url);
        return { url } as const;
      }),


    // ─── WebAuthn / Passkey Procedures ───────────────────────────────────────
    passkeyRegistrationOptions: protectedProcedure
      .mutation(async ({ ctx }) => {
        const existingPasskeys = await getPasskeysByUserId(ctx.user.id);
        const rpID = process.env.VITE_APP_ID ? new URL(process.env.OAUTH_SERVER_URL ?? "https://api.manus.im").hostname : "localhost";
        const options = await generateRegistrationOptions({
          rpName: "FacingFace",
          rpID,
          userID: new TextEncoder().encode(String(ctx.user.id)),
          userName: ctx.user.email ?? ctx.user.name ?? "user",
          userDisplayName: ctx.user.name ?? "User",
          attestationType: "none",
          excludeCredentials: existingPasskeys.map((pk: { credentialId: string }) => ({
            id: pk.credentialId,
            type: "public-key" as const,
          })),
          authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
          },
        });
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const challengeId = await saveWebauthnChallenge({
          userId: ctx.user.id,
          challenge: options.challenge,
          type: "registration",
          expiresAt,
        });
        return { options, challengeId };
      }),

    verifyPasskeyRegistration: protectedProcedure
      .input(z.object({
        challengeId: z.number(),
        response: z.any(),
        deviceName: z.string().min(1).max(100).default("My Device"),
      }))
      .mutation(async ({ ctx, input }) => {
        const challengeRecord = await getWebauthnChallenge(input.challengeId);
        if (!challengeRecord || challengeRecord.userId !== ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired challenge." });
        }
        if (new Date() > challengeRecord.expiresAt) {
          await deleteWebauthnChallenge(input.challengeId);
          throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge expired. Please try again." });
        }
        const rpID = process.env.VITE_APP_ID ? new URL(process.env.OAUTH_SERVER_URL ?? "https://api.manus.im").hostname : "localhost";
        try {
          const verification = await verifyRegistrationResponse({
            response: input.response as RegistrationResponseJSON,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: [
              `https://${rpID}`,
              "http://localhost:3000",
              "https://facingface-com.manus.space",
              "https://facingface-nvyvjrnd.manus.space",
            ],
            expectedRPID: rpID,
          });
          if (!verification.verified || !verification.registrationInfo) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Passkey registration failed." });
          }
          const { credential } = verification.registrationInfo;
          const credentialIdBase64 = Buffer.from(credential.id).toString("base64url");
          const publicKeyBase64 = Buffer.from(credential.publicKey).toString("base64url");
          await createPasskey({
            userId: ctx.user.id,
            credentialId: credentialIdBase64,
            publicKey: publicKeyBase64,
            counter: credential.counter,
            deviceName: input.deviceName,
          });
          await deleteWebauthnChallenge(input.challengeId);
          return { success: true };
        } catch (err: any) {
          await deleteWebauthnChallenge(input.challengeId);
          throw new TRPCError({ code: "BAD_REQUEST", message: err?.message ?? "Passkey registration failed." });
        }
      }),

    passkeyAuthOptions: publicProcedure
      .mutation(async () => {
        const rpID = process.env.VITE_APP_ID ? new URL(process.env.OAUTH_SERVER_URL ?? "https://api.manus.im").hostname : "localhost";
        const options = await generateAuthenticationOptions({
          rpID,
          userVerification: "preferred",
        });
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const challengeId = await saveWebauthnChallenge({
          challenge: options.challenge,
          type: "authentication",
          expiresAt,
        });
        return { options, challengeId };
      }),

    verifyPasskeyAuth: publicProcedure
      .input(z.object({
        challengeId: z.number(),
        response: z.any(),
      }))
      .mutation(async ({ input, ctx }) => {
        const challengeRecord = await getWebauthnChallenge(input.challengeId);
        if (!challengeRecord) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired challenge." });
        }
        if (new Date() > challengeRecord.expiresAt) {
          await deleteWebauthnChallenge(input.challengeId);
          throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge expired. Please try again." });
        }
        const authResponse = input.response as AuthenticationResponseJSON;
        const credentialId = authResponse.id;
        const passkey = await getPasskeyByCredentialId(credentialId);
        if (!passkey) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found. Please register a passkey first." });
        }
        const rpID = process.env.VITE_APP_ID ? new URL(process.env.OAUTH_SERVER_URL ?? "https://api.manus.im").hostname : "localhost";
        try {
          const verification = await verifyAuthenticationResponse({
            response: authResponse,
            expectedChallenge: challengeRecord.challenge,
            expectedOrigin: [
              `https://${rpID}`,
              "http://localhost:3000",
              "https://facingface-com.manus.space",
              "https://facingface-nvyvjrnd.manus.space",
            ],
            expectedRPID: rpID,
            credential: {
              id: passkey.credentialId,
              publicKey: Buffer.from(passkey.publicKey, "base64url"),
              counter: passkey.counter,
            },
          });
          if (!verification.verified) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Biometric verification failed." });
          }
          await updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter);
          await deleteWebauthnChallenge(input.challengeId);
          // Log the user in by fetching their full user record
          const user = await getUserById(passkey.userId);
          if (!user) {
            throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
          }
          // Issue session cookie (same pattern as emailLogin)
          const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          return { success: true };
        } catch (err: any) {
          await deleteWebauthnChallenge(input.challengeId);
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({ code: "UNAUTHORIZED", message: err?.message ?? "Biometric verification failed." });
        }
      }),

    listPasskeys: protectedProcedure
      .query(async ({ ctx }) => {
        const keys = await getPasskeysByUserId(ctx.user.id);
        return keys.map((k: { id: number; deviceName: string; createdAt: Date }) => ({ id: k.id, deviceName: k.deviceName, createdAt: k.createdAt }));
      }),

    deletePasskey: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deletePasskey(input.id, ctx.user.id);
        return { success: true };
      }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No password set for this account. Use a social login instead." });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
        }
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await updateUserPassword(user.id, newHash);
        return { success: true };
      }),
    // ─── Active Sessions ──────────────────────────────────────────────────────
    listSessions: protectedProcedure
      .query(async ({ ctx }) => {
        const sessions = await getActiveSessionsByUser(ctx.user.id);
        // Identify current session by matching cookie
        const currentToken = ctx.req.cookies?.[COOKIE_NAME] ?? "";
        const currentHash = currentToken ? hashToken(currentToken) : "";
        return sessions.map((s) => ({
          id: s.id,
          device: s.device ?? "Unknown device",
          ipAddress: s.ipAddress ?? "Unknown",
          lastSeenAt: s.lastSeenAt,
          createdAt: s.createdAt,
          isCurrent: s.tokenHash === currentHash,
        }));
      }),
    revokeSession: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteActiveSession(input.id, ctx.user.id);
        return { success: true };
      }),
    revokeAllOtherSessions: protectedProcedure
      .mutation(async ({ ctx }) => {
        const currentToken = ctx.req.cookies?.[COOKIE_NAME] ?? "";
        const currentHash = currentToken ? hashToken(currentToken) : "";
        await deleteAllOtherSessions(ctx.user.id, currentHash);
        return { success: true };
      }),
    // ─── TOTP 2FA ─────────────────────────────────────────────────────────────
    totpStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const record = await getTotpSecret(ctx.user.id);
        return { enabled: record?.enabled ?? false };
      }),
    totpSetup: protectedProcedure
      .mutation(async ({ ctx }) => {
        const email = ctx.user.email ?? ctx.user.name ?? "user";
        const secret = generateTotpSecret();
        await upsertTotpSecret(ctx.user.id, secret);
        const uri = buildTotpUri(secret, email);
        const qrCode = await generateQrCode(uri);
        return { secret, qrCode };
      }),
    totpVerifySetup: protectedProcedure
      .input(z.object({ code: z.string().min(6).max(8) }))
      .mutation(async ({ ctx, input }) => {
        const record = await getTotpSecret(ctx.user.id);
        if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "No TOTP setup in progress. Start setup first." });
        if (record.enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "2FA is already enabled." });
        if (!verifyTotpCode(record.secret, input.code)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code. Check your authenticator app and try again." });
        }
        const { plain, hashed } = generateBackupCodes();
        await enableTotp(ctx.user.id, JSON.stringify(hashed));
        return { success: true, backupCodes: plain };
      }),
    totpDisable: protectedProcedure
      .input(z.object({ code: z.string().min(6).max(10) }))
      .mutation(async ({ ctx, input }) => {
        const record = await getTotpSecret(ctx.user.id);
        if (!record?.enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "2FA is not enabled." });
        const isValidTotp = verifyTotpCode(record.secret, input.code);
        let isValidBackup = false;
        if (!isValidTotp && record.backupCodes) {
          const hashed = JSON.parse(record.backupCodes) as string[];
          const remaining = consumeBackupCode(hashed, input.code);
          if (remaining !== null) {
            isValidBackup = true;
            await updateTotpBackupCodes(ctx.user.id, JSON.stringify(remaining));
          }
        }
        if (!isValidTotp && !isValidBackup) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code." });
        }
        await disableTotp(ctx.user.id);
        return { success: true };
      }),
    totpLogin: publicProcedure
      .input(z.object({ pendingToken: z.string(), code: z.string().min(6).max(10) }))
      .mutation(async ({ ctx, input }) => {
        // Verify the pending token (a short-lived JWT that encodes the userId)
        let userId: number;
        try {
          const { jwtVerify } = await import("jose");
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
          const { payload } = await jwtVerify(input.pendingToken, secretKey);
          if (payload.type !== "2fa_pending") throw new Error("Invalid token type");
          userId = payload.userId as number;
        } catch {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired session. Please log in again." });
        }
        const record = await getTotpSecret(userId);
        if (!record?.enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not enabled for this account." });
        const isValidTotp = verifyTotpCode(record.secret, input.code);
        let isValidBackup = false;
        if (!isValidTotp && record.backupCodes) {
          const hashed = JSON.parse(record.backupCodes) as string[];
          const remaining = consumeBackupCode(hashed, input.code);
          if (remaining !== null) {
            isValidBackup = true;
            await updateTotpBackupCodes(userId, JSON.stringify(remaining));
          }
        }
        if (!isValidTotp && !isValidBackup) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code. Try again or use a backup code." });
        }
        const user = await getUserById(userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        const sessionToken = await sdk.createSessionToken(user.openId);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        // Track active session
        const ua2 = ctx.req.headers["user-agent"] ?? "";
        const ip2 = (ctx.req.headers["x-forwarded-for"] as string ?? ctx.req.socket?.remoteAddress ?? "").split(",")[0].trim();
        const device2 = ua2.includes("Mobile") ? "Mobile" : ua2.includes("Tablet") ? "Tablet" : "Desktop";
        await createActiveSession({ userId: user.id, tokenHash: hashToken(sessionToken), device: device2, ipAddress: ip2, userAgent: ua2.slice(0, 512) });
        return { success: true };
      }),
  }),
  posts: postsRouter,
  comments: commentsRouter,
  likes: likesRouter,
  follows: followsRouter,
  users: usersRouter,
  notifications: notificationsRouter,
  media: mediaRouter,
  linkPreview: linkPreviewRouter,
  polls: pollsRouter,
  live: liveRouter,
  reactions: reactionsRouter,
  shares: sharesRouter,
  cleanup: cleanupRouter,
  friends: friendsRouter,
  dm: dmRouter,
  admin: adminRouter,
  groups: groupsRouter,
  calls: callsRouter,
  photos: photosRouter,
  subscription: enhancedSubscriptionRouter,
  pages: pagesRouter,
  publicGroups: publicGroupsRouter,
  stories: storiesRouter,
  bookmarks: bookmarksRouter,
  postReactions: postReactionsRouter,
  trending: trendingRouter,
  videoViews: videoViewsRouter,
   shop: shopRouter,
  reels: reelsRouter,
  callHistory: callHistoryRouter,
  push: pushRouter,
  support: supportRouter,
  blocks: blocksRouter,
  feedAds: feedAdsRouter,
  newsFeed: newsFeedRouter,
  suggestions: suggestionsRouter,
  broadcasts: broadcastRouter,
  stopStreams: stopAllStreamsRouter,
  inactiveReminders: inactiveRemindersRouter,
  events: eventsRouter,
});
export type AppRouter = typeof appRouter;



