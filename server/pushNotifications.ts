import webpush from "web-push";
import type { SendResult } from "web-push";
import { ENV } from "./_core/env";
import { getPushSubscriptionsForUser } from "./db";

let _initialized = false;

function ensureInitialized() {
  if (_initialized) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    "mailto:admin@facingface.com",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
  _initialized = true;
}

async function sendToUser(userId: number, payload: string, ttl: number): Promise<void> {
  ensureInitialized();
  if (!_initialized) return;
  
  const subscriptions = await getPushSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return;
  
  const results = await Promise.allSettled(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: ttl }
      )
    )
  );
  
  const failed = results.filter((r: PromiseSettledResult<SendResult>) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`[WebPush] ${failed}/${subscriptions.length} push notifications failed for user ${userId}`);
  }
}

// ============================================================================
// FOLLOW NOTIFICATION
// ============================================================================
export async function sendFollowNotification(
  userId: number,
  followerName: string,
  followerAvatar?: string
): Promise<void> {
  await sendToUser(userId, JSON.stringify({
    type: "follow",
    title: "New Follower",
    body: `${followerName} started following you`,
    icon: followerAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `follow-${Date.now()}`,
    url: `/profile/${followerName}`,
    actions: [
      { action: "view_profile", title: "View Profile" },
      { action: "close", title: "Dismiss" }
    ]
  }), 86400);
}

// ============================================================================
// FRIEND REQUEST NOTIFICATION
// ============================================================================
export async function sendFriendRequestNotification(
  userId: number,
  senderName: string,
  senderAvatar?: string
): Promise<void> {
  await sendToUser(userId, JSON.stringify({
    type: "friend_request",
    title: "Friend Request",
    body: `${senderName} sent you a friend request`,
    icon: senderAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `friend-request-${Date.now()}`,
    url: "/friends",
    requireInteraction: true,
    actions: [
      { action: "accept", title: "Accept" },
      { action: "decline", title: "Decline" }
    ]
  }), 86400);
}

// ============================================================================
// LIVE STREAM NOTIFICATION
// ============================================================================
export async function sendLiveStreamNotification(
  userId: number,
  streamerName: string,
  streamTitle: string,
  streamerAvatar?: string
): Promise<void> {
  const body = `${streamerName} is live: ${streamTitle.slice(0, 60)}${streamTitle.length > 60 ? "..." : ""}`;
  await sendToUser(userId, JSON.stringify({
    type: "live_stream",
    title: "Live Stream Started",
    body,
    icon: streamerAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: "live-stream",
    url: "/live",
    actions: [
      { action: "watch", title: "Watch Now" },
      { action: "close", title: "Dismiss" }
    ]
  }), 3600);
}

// ============================================================================
// POST LIKE NOTIFICATION
// ============================================================================
export async function sendPostLikeNotification(
  userId: number,
  likerName: string,
  postId: number,
  likerAvatar?: string
): Promise<void> {
  await sendToUser(userId, JSON.stringify({
    type: "post_like",
    title: "Post Liked",
    body: `${likerName} liked your post`,
    icon: likerAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `post-like-${postId}`,
    url: `/post/${postId}`,
    actions: [
      { action: "view_post", title: "View Post" },
      { action: "close", title: "Dismiss" }
    ]
  }), 86400);
}

// ============================================================================
// POST COMMENT NOTIFICATION
// ============================================================================
export async function sendPostCommentNotification(
  userId: number,
  commenterName: string,
  postId: number,
  commentPreview: string,
  commenterAvatar?: string
): Promise<void> {
  const preview = commentPreview.length > 60 ? commentPreview.slice(0, 57) + "..." : commentPreview;
  await sendToUser(userId, JSON.stringify({
    type: "post_comment",
    title: "New Comment",
    body: `${commenterName}: ${preview}`,
    icon: commenterAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `post-comment-${postId}`,
    url: `/post/${postId}`,
    actions: [
      { action: "view_post", title: "View Post" },
      { action: "reply", title: "Reply" }
    ]
  }), 86400);
}

// ============================================================================
// DIRECT MESSAGE NOTIFICATION
// ============================================================================
export async function sendDirectMessageNotification(
  userId: number,
  senderName: string,
  messagePreview: string,
  senderAvatar?: string
): Promise<void> {
  const preview = messagePreview.length > 80 ? messagePreview.slice(0, 77) + "…" : messagePreview;
  await sendToUser(userId, JSON.stringify({
    type: "direct_message",
    title: senderName,
    body: preview,
    icon: senderAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: "direct-message",
    url: "/messages",
    actions: [
      { action: "open_chat", title: "Open Chat" },
      { action: "close", title: "Dismiss" }
    ]
  }), 86400);
}

// ============================================================================
// ADMIN BROADCAST NOTIFICATION
// ============================================================================
export async function sendAdminBroadcastNotification(
  userId: number,
  title: string,
  message: string,
  broadcastId?: number
): Promise<void> {
  const body = message.length > 100 ? message.slice(0, 97) + "…" : message;
  await sendToUser(userId, JSON.stringify({
    type: "admin_broadcast",
    title: title || "Important Announcement",
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: `broadcast-${broadcastId || Date.now()}`,
    url: "/broadcasts",
    requireInteraction: true,
    actions: [
      { action: "view_broadcast", title: "View" },
      { action: "close", title: "Dismiss" }
    ]
  }), 604800); // 7 days TTL for important broadcasts
}

// ============================================================================
// MENTION NOTIFICATION
// ============================================================================
export async function sendMentionNotification(
  userId: number,
  mentionerName: string,
  postId: number,
  contextPreview: string,
  mentionerAvatar?: string
): Promise<void> {
  const preview = contextPreview.length > 60 ? contextPreview.slice(0, 57) + "..." : contextPreview;
  await sendToUser(userId, JSON.stringify({
    type: "mention",
    title: "You Were Mentioned",
    body: `${mentionerName}: ${preview}`,
    icon: mentionerAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `mention-${postId}`,
    url: `/post/${postId}`,
    actions: [
      { action: "view_post", title: "View Post" },
      { action: "close", title: "Dismiss" }
    ]
  }), 86400);
}

// ============================================================================
// RESHARE NOTIFICATION
// ============================================================================
export async function sendReshareNotification(
  userId: number,
  resharedByName: string,
  postId: number,
  resharedByAvatar?: string
): Promise<void> {
  await sendToUser(userId, JSON.stringify({
    type: "reshare",
    title: "Post Reshared",
    body: `${resharedByName} reshared your post`,
    icon: resharedByAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `reshare-${postId}`,
    url: `/post/${postId}`,
    actions: [
      { action: "view_post", title: "View Post" },
      { action: "close", title: "Dismiss" }
    ]
  }), 86400);
}

// ============================================================================
// GROUP INVITATION NOTIFICATION
// ============================================================================
export async function sendGroupInviteNotification(
  userId: number,
  inviterName: string,
  groupName: string,
  groupId: number,
  inviterAvatar?: string
): Promise<void> {
  await sendToUser(userId, JSON.stringify({
    type: "group_invite",
    title: "Group Invitation",
    body: `${inviterName} invited you to join ${groupName}`,
    icon: inviterAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `group-invite-${groupId}`,
    url: `/group/${groupId}`,
    requireInteraction: true,
    actions: [
      { action: "accept", title: "Join Group" },
      { action: "decline", title: "Decline" }
    ]
  }), 86400);
}

// ============================================================================
// INCOMING CALL NOTIFICATION
// ============================================================================
export async function sendIncomingCallNotification(
  calleeId: number,
  callerName: string,
  callType: "voice" | "video",
  callerAvatar?: string
): Promise<void> {
  await sendToUser(calleeId, JSON.stringify({
    type: "incoming_call",
    title: `Incoming ${callType === "video" ? "Video" : "Voice"} Call`,
    body: `${callerName} is calling you`,
    icon: callerAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: "incoming-call",
    requireInteraction: true,
    actions: [
      { action: "accept", title: "Accept" },
      { action: "decline", title: "Decline" }
    ]
  }), 30); // Short TTL for calls
}

// ============================================================================
// STORY NOTIFICATION
// ============================================================================
export async function sendStoryNotification(
  userId: number,
  storyCreatorName: string,
  storyCreatorAvatar?: string
): Promise<void> {
  await sendToUser(userId, JSON.stringify({
    type: "story",
    title: "New Story",
    body: `${storyCreatorName} posted a new story`,
    icon: storyCreatorAvatar || "/favicon.ico",
    badge: "/favicon.ico",
    tag: `story-${Date.now()}`,
    url: "/stories",
    actions: [
      { action: "view_story", title: "View Story" },
      { action: "close", title: "Dismiss" }
    ]
  }), 86400);
}

// ============================================================================
// SYSTEM NOTIFICATION (Generic)
// ============================================================================
export async function sendSystemNotification(
  userId: number,
  title: string,
  body: string,
  url?: string,
  tag?: string
): Promise<void> {
  await sendToUser(userId, JSON.stringify({
    type: "system",
    title,
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: tag || `system-${Date.now()}`,
    url: url || "/",
    actions: [
      { action: "open", title: "Open" },
      { action: "close", title: "Dismiss" }
    ]
  }), 86400);
}
