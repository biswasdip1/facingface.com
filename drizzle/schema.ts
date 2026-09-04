import {
  boolean,
  decimal,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  serial,
} from "drizzle-orm/pg-core";

export const call_history_status_enum = pgEnum("call_history_status_enum", ["missed", "answered", "declined"]);
export const call_history_type_enum = pgEnum("call_history_type_enum", ["voice", "video"]);
export const call_rooms_status_enum = pgEnum("call_rooms_status_enum", ["waiting", "active", "ended"]);
export const call_rooms_type_enum = pgEnum("call_rooms_type_enum", ["audio", "video"]);
export const content_reports_status_enum = pgEnum("content_reports_status_enum", ["pending", "reviewed", "actioned", "dismissed"]);
export const content_reports_targetType_enum = pgEnum("content_reports_targetType_enum", ["post", "comment", "listing"]);
export const emoji_reactions_targetType_enum = pgEnum("emoji_reactions_targetType_enum", ["post", "comment", "page_post", "public_group_post"]);
export const comment_reactions_reaction_enum = pgEnum("comment_reactions_reaction_enum", ["like", "love", "haha", "wow", "sad", "angry"]);
export const friend_requests_status_enum = pgEnum("friend_requests_status_enum", ["pending", "accepted", "declined"]);
export const group_members_role_enum = pgEnum("group_members_role_enum", ["admin", "member"]);
export const group_messages_type_enum = pgEnum("group_messages_type_enum", ["text", "image", "file", "system"]);
export const likes_targetType_enum = pgEnum("likes_targetType_enum", ["post", "comment"]);
export const live_streams_status_enum = pgEnum("live_streams_status_enum", ["active", "ended"]);
export const notifications_type_enum = pgEnum("notifications_type_enum", ["like_post", "like_comment", "comment", "follow", "friend_request", "friend_accepted", "admin_promoted", "support_reply"]);
export const post_reactions_reaction_enum = pgEnum("post_reactions_reaction_enum", ["like", "love", "haha", "wow", "sad", "angry", "seen"]);
export const page_post_reactions_reaction_enum = pgEnum("page_post_reactions_reaction_enum", ["like", "love", "haha", "wow", "sad", "angry"]);
export const public_group_post_reactions_reaction_enum = pgEnum("public_group_post_reactions_reaction_enum", ["like", "love", "haha", "wow", "sad", "angry"]);
export const posts_mediaType_enum = pgEnum("posts_mediaType_enum", ["image", "video"]);
export const public_group_members_role_enum = pgEnum("public_group_members_role_enum", ["admin", "moderator", "member"]);
export const public_group_posts_mediaType_enum = pgEnum("public_group_posts_mediaType_enum", ["photo", "video"]);
export const shop_listings_condition_enum = pgEnum("shop_listings_condition_enum", ["new", "like_new", "good", "fair", "for_parts"]);
export const shop_listings_status_enum = pgEnum("shop_listings_status_enum", ["active", "sold", "draft", "removed"]);
export const stories_mediaType_enum = pgEnum("stories_mediaType_enum", ["photo", "video"]);
export const story_highlight_items_mediaType_enum = pgEnum("story_highlight_items_mediaType_enum", ["photo", "video"]);
export const subscriptions_status_enum = pgEnum("subscriptions_status_enum", ["active", "cancelled", "past_due", "trialing"]);
export const users_role_enum = pgEnum("users_role_enum", ["user", "admin", "super_admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  verificationToken: varchar("verificationToken", { length: 128 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: users_role_enum("role").default("user").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  coverPhoto: text("coverPhoto"),
  hometown: varchar("hometown", { length: 100 }),
  currentLocation: varchar("currentLocation", { length: 100 }),
  currentRole: varchar("currentRole", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  website: varchar("website", { length: 255 }),
  youtubeChannel: varchar("youtubeChannel", { length: 255 }),
  birthDay: integer("birthDay"),
  birthMonth: integer("birthMonth"),
  hobby: varchar("hobby", { length: 120 }),
  coverCropY: integer("coverCropY").default(50),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  suspendedUntil: timestamp("suspendedUntil"),          // null = not suspended
  suspendReason: text("suspendReason"),
  violationCount: integer("violationCount").default(0).notNull(), // counts sexual content violations
  isVerified: boolean("isVerified").default(false).notNull(), // blue badge subscription
  lastCallsSeenAt: timestamp("lastCallsSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("authorId").notNull(),
  text: text("text"),
  mediaUrl: text("mediaUrl"),
  mediaType: posts_mediaType_enum("mediaType"),
   isFlagged: boolean("isFlagged").default(false).notNull(),
  flagReason: text("flagReason"),
  linkUrl: text("linkUrl"),
  linkTitle: text("linkTitle"),
  linkDescription: text("linkDescription"),
  linkImage: text("linkImage"),
  linkSiteName: varchar("linkSiteName", { length: 100 }),
  // A dedicated Page marker keeps Page content out of the personal Feed without
  // sacrificing link preview metadata such as a publisher name.
  pageId: integer("pageId"),
  docUrl: text("docUrl"),
  docName: varchar("docName", { length: 255 }),
  docSize: integer("docSize"),
  docType: varchar("docType", { length: 100 }),
  photo2Url: text("photo2Url"),
  photo3Url: text("photo3Url"),
  photo1Caption: varchar("photo1Caption", { length: 300 }),
  photo2Caption: varchar("photo2Caption", { length: 300 }),
  photo3Caption: varchar("photo3Caption", { length: 300 }),
  photo1Alt: varchar("photo1Alt", { length: 500 }),
  photo2Alt: varchar("photo2Alt", { length: 500 }),
  photo3Alt: varchar("photo3Alt", { length: 500 }),
  videoPosterUrl: text("videoPosterUrl"),
  bgColor: varchar("bgColor", { length: 30 }),
  audioUrl: text("audioUrl"),
  audioName: varchar("audioName", { length: 255 }),
  audioDuration: integer("audioDuration"),
  resharedFromId: integer("resharedFromId"),  // null = original post, set = reshare
  reshareComment: text("reshareComment"),  // optional comment added when resharing
  deletionScheduledAt: timestamp("deletionScheduledAt"),  // set 7 days before auto-delete
  deletionWarningSentAt: timestamp("deletionWarningSentAt"), // when warning notification was sent
  editedAt: timestamp("editedAt"),
  isPinned: boolean("isPinned").default(false).notNull(),
  videoViews: integer("videoViews").default(0).notNull(),
  scheduledAt: timestamp("scheduledAt"),  // null = publish immediately, set = scheduled post
  hideEditHistory: boolean("hideEditHistory").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ─── Comment Reactions ───────────────────────────────────────────────────────────
export const commentReactions = pgTable("comment_reactions", {
  id: serial("id").primaryKey(),
  commentId: integer("commentId").notNull(),
  userId: integer("userId").notNull(),
  reaction: comment_reactions_reaction_enum("reaction").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CommentReaction = typeof commentReactions.$inferSelect;
export type InsertCommentReaction = typeof commentReactions.$inferInsert;

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  authorId: integer("authorId").notNull(),
  parentId: integer("parentId"),  // null = top-level, set = reply to comment
  text: text("text").notNull(),
  isFlagged: boolean("isFlagged").default(false).notNull(),
  flagReason: text("flagReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  targetId: integer("targetId").notNull(),
  targetType: likes_targetType_enum("targetType").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Like = typeof likes.$inferSelect;
export type InsertLike = typeof likes.$inferInsert;

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("followerId").notNull(),
  followingId: integer("followingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = typeof follows.$inferInsert;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  actorId: integer("actorId").notNull(),
  type: notifications_type_enum("type").notNull(),
  postId: integer("postId"),
  commentId: integer("commentId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  question: varchar("question", { length: 300 }).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Poll = typeof polls.$inferSelect;
export type InsertPoll = typeof polls.$inferInsert;

export const pollOptions = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("pollId").notNull(),
  text: varchar("text", { length: 200 }).notNull(),
  displayOrder: integer("displayOrder").notNull().default(0),
});

export type PollOption = typeof pollOptions.$inferSelect;
export type InsertPollOption = typeof pollOptions.$inferInsert;

export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("pollId").notNull(),
  optionId: integer("optionId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PollVote = typeof pollVotes.$inferSelect;
export type InsertPollVote = typeof pollVotes.$inferInsert;

export const liveStreams = pgTable("live_streams", {
  id: serial("id").primaryKey(),
  hostId: integer("hostId").notNull(),
  title: varchar("title", { length: 200 }),
  status: live_streams_status_enum("status").default("active").notNull(),
  viewerCount: integer("viewerCount").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type LiveStream = typeof liveStreams.$inferSelect;
export type InsertLiveStream = typeof liveStreams.$inferInsert;

export const emojiReactions = pgTable("emoji_reactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  targetId: integer("targetId").notNull(),
  targetType: emoji_reactions_targetType_enum("targetType").notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmojiReaction = typeof emojiReactions.$inferSelect;
export type InsertEmojiReaction = typeof emojiReactions.$inferInsert;

export const postShares = pgTable("post_shares", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostShare = typeof postShares.$inferSelect;
export type InsertPostShare = typeof postShares.$inferInsert;

// ─── Friend / Connect ────────────────────────────────────────────────────────
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  receiverId: integer("receiverId").notNull(),
  status: friend_requests_status_enum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = typeof friendRequests.$inferInsert;

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId1: integer("userId1").notNull(),
  userId2: integer("userId2").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

// ─── Direct Messaging ────────────────────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1Id").notNull(),
  participant2Id: integer("participant2Id").notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastReadMessageIdP1: integer("lastReadMessageIdP1"),
  lastReadMessageIdP2: integer("lastReadMessageIdP2"),
  mutedUntilP1: timestamp("mutedUntilP1"),
  mutedUntilP2: timestamp("mutedUntilP2"),
});
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  senderId: integer("senderId").notNull(),
  text: text("text"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  fileSize: integer("fileSize"),
  fileType: varchar("fileType", { length: 100 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  pinnedAt: timestamp("pinnedAt"),
});
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Hashtags ────────────────────────────────────────────────────────────────
export const hashtags = pgTable("hashtags", {
  id: serial("id").primaryKey(),
  tag: varchar("tag", { length: 100 }).notNull(),
  postId: integer("postId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Hashtag = typeof hashtags.$inferSelect;
export type InsertHashtag = typeof hashtags.$inferInsert;
// ─── Password Reset Tokens ───────────────────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ─── Phone Verifications ─────────────────────────────────────────────────────
export const phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  otp: varchar("otp", { length: 10 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PhoneVerification = typeof phoneVerifications.$inferSelect;
// ─── WebAuthn Passkeys ────────────────────────────────────────────────────────
export const passkeys = pgTable("passkeys", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  credentialId: varchar("credentialId", { length: 512 }).notNull().unique(),
  publicKey: text("publicKey").notNull(),
  counter: integer("counter").default(0).notNull(),
  deviceName: varchar("deviceName", { length: 100 }).default("My Device").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Passkey = typeof passkeys.$inferSelect;
// ─── WebAuthn Challenges (temporary, per-user) ────────────────────────────────
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  challenge: varchar("challenge", { length: 512 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // "registration" | "authentication"
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WebauthnChallenge = typeof webauthnChallenges.$inferSelect;
// ─── TOTP 2FA Secrets ─────────────────────────────────────────────────────────
export const totpSecrets = pgTable("totp_secrets", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  secret: varchar("secret", { length: 64 }).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  backupCodes: text("backupCodes"), // JSON array of hashed backup codes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  enabledAt: timestamp("enabledAt"),
});
export type TotpSecret = typeof totpSecrets.$inferSelect;
// ─── Active Sessions ───────────────────────────────────────────────────────────
export const activeSessions = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  device: varchar("device", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ActiveSession = typeof activeSessions.$inferSelect;

// ─── Group Conversations ───────────────────────────────────────────────────────
export const groupConversations = pgTable("group_conversations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  avatar: varchar("avatar", { length: 512 }),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type GroupConversation = typeof groupConversations.$inferSelect;

// ─── Group Members ─────────────────────────────────────────────────────────────
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  userId: integer("userId").notNull(),
  role: group_members_role_enum("role").default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  mutedUntil: timestamp("mutedUntil"),
});
export type GroupMember = typeof groupMembers.$inferSelect;

// ─── Group Messages ────────────────────────────────────────────────────────────
export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  senderId: integer("senderId").notNull(),
  content: text("content").notNull(),
  type: group_messages_type_enum("type").default("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  pinnedAt: timestamp("pinnedAt"),
});
export type GroupMessage = typeof groupMessages.$inferSelect;

// ─── Call Rooms ────────────────────────────────────────────────────────────────
export const callRooms = pgTable("call_rooms", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId"),
  hostId: integer("hostId").notNull(),
  status: call_rooms_status_enum("status").default("waiting").notNull(),
  type: call_rooms_type_enum("type").default("video").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});
export type CallRoom = typeof callRooms.$inferSelect;

// ─── Call Participants ─────────────────────────────────────────────────────────
export const callParticipants = pgTable("call_participants", {
  id: serial("id").primaryKey(),
  roomId: integer("roomId").notNull(),
  userId: integer("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
});
export type CallParticipant = typeof callParticipants.$inferSelect;

// ─── WebRTC Signals ───────────────────────────────────────────────────────────
export const callSignals = pgTable("call_signals", {
  id: serial("id").primaryKey(),
  roomId: integer("roomId").notNull(),
  fromUserId: integer("fromUserId").notNull(),
  toUserId: integer("toUserId").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  payload: text("payload").notNull(),
  consumed: boolean("consumed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CallSignal = typeof callSignals.$inferSelect;

// ─── Profile Photos ───────────────────────────────────────────────────────────
export const profilePhotos = pgTable("profile_photos", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  url: text("url").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProfilePhoto = typeof profilePhotos.$inferSelect;
export type InsertProfilePhoto = typeof profilePhotos.$inferInsert;

// ─── Cover Photos ─────────────────────────────────────────────────────────────
export const coverPhotos = pgTable("cover_photos", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  url: text("url").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CoverPhoto = typeof coverPhotos.$inferSelect;
export type InsertCoverPhoto = typeof coverPhotos.$inferInsert;

// ─── Media Limits Config ────────────────────────────────────────────────────
export const mediaLimits = pgTable("media_limits", {
  id: serial("id").primaryKey(),
  limitKey: varchar("limitKey", { length: 60 }).notNull().unique(), // e.g. photo_max_mb
  value: integer("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  updatedByAdminId: integer("updatedByAdminId"),
});
export type MediaLimit = typeof mediaLimits.$inferSelect;
export type InsertMediaLimit = typeof mediaLimits.$inferInsert;

// ─── Content Reports ─────────────────────────────────────────────────────────
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporterId").notNull(),
  targetType: content_reports_targetType_enum("targetType").notNull(),
  targetId: integer("targetId").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(), // sexual_content, violence, harassment, spam, other, auto_detected
  status: content_reports_status_enum("status").default("pending").notNull(),
  adminNote: text("adminNote"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedByAdminId: integer("reviewedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = typeof contentReports.$inferInsert;

// ─── Organisation Pages ─────────────────────────────────────────────────────
export const orgPages = pgTable("org_pages", {
  id: serial("id").primaryKey(),
  handle: varchar("handle", { length: 60 }).notNull().unique(), // URL slug: /p/{handle}
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 60 }),
  logo: text("logo"),           // storage URL
  coverPhoto: text("coverPhoto"), // storage URL
  website: varchar("website", { length: 255 }),
  location: varchar("location", { length: 100 }),
  ownerId: integer("ownerId").notNull(), // user who created the page
  followerCount: integer("followerCount").default(0).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isSuspended: boolean("isSuspended").default(false).notNull(),
  suspendedAt: timestamp("suspendedAt"),
  suspendedByAdminId: integer("suspendedByAdminId"),
  suspendReason: text("suspendReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type OrgPage = typeof orgPages.$inferSelect;
export type InsertOrgPage = typeof orgPages.$inferInsert;

export const pageFollowers = pgTable("page_followers", {
  id: serial("id").primaryKey(),
  pageId: integer("pageId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PageFollower = typeof pageFollowers.$inferSelect;

export const pageAdmins = pgTable("page_admins", {
  id: serial("id").primaryKey(),
  pageId: integer("pageId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PageAdmin = typeof pageAdmins.$inferSelect;

// ─── Org Page Posts ───────────────────────────────────────────────────────────
export const orgPagePosts = pgTable("org_page_posts", {
  id: serial("id").primaryKey(),
  pageId: integer("pageId").notNull(),
  authorId: integer("authorId").notNull(),
  content: text("content"),
  mediaUrl: varchar("mediaUrl", { length: 512 }),
  mediaType: public_group_posts_mediaType_enum("mediaType"),
  photo2Url: varchar("photo2Url", { length: 512 }),
  photo3Url: varchar("photo3Url", { length: 512 }),
  photo1Caption: varchar("photo1Caption", { length: 300 }),
  photo2Caption: varchar("photo2Caption", { length: 300 }),
  photo3Caption: varchar("photo3Caption", { length: 300 }),
  photo1Alt: varchar("photo1Alt", { length: 500 }),
  photo2Alt: varchar("photo2Alt", { length: 500 }),
  photo3Alt: varchar("photo3Alt", { length: 500 }),
  videoPosterUrl: varchar("videoPosterUrl", { length: 512 }),
  audioUrl: varchar("audioUrl", { length: 512 }),
  audioName: varchar("audioName", { length: 255 }),
  docUrl: varchar("docUrl", { length: 512 }),
  docName: varchar("docName", { length: 255 }),
  docSize: integer("docSize"),
  docType: varchar("docType", { length: 100 }),
  pollId: integer("pollId"),
  bgColor: varchar("bgColor", { length: 30 }),
  linkUrl: varchar("linkUrl", { length: 512 }),
  linkTitle: varchar("linkTitle", { length: 300 }),
  linkDescription: text("linkDescription"),
  linkImage: varchar("linkImage", { length: 512 }),
  linkSiteName: varchar("linkSiteName", { length: 100 }),
  shareCount: integer("shareCount").default(0).notNull(),
  likeCount: integer("likeCount").default(0).notNull(),
  commentCount: integer("commentCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type OrgPagePost = typeof orgPagePosts.$inferSelect;
export type InsertOrgPagePost = typeof orgPagePosts.$inferInsert;

// ─── Blue Badge Subscriptions ─────────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  status: subscriptions_status_enum("status").default("active").notNull(),
  badgeGranted: boolean("badgeGranted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Public Groups ────────────────────────────────────────────────────────────
export const publicGroups = pgTable("public_groups", {
  id: serial("id").primaryKey(),
  handle: varchar("handle", { length: 100 }).notNull().unique(),
  // Retains an old malformed handle while the Group is redirected to its safe canonical handle.
  legacyHandle: varchar("legacyHandle", { length: 100 }),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 80 }),
  coverPhoto: varchar("coverPhoto", { length: 512 }),
  createdBy: integer("createdBy").notNull(),
  isSuspended: boolean("isSuspended").default(false).notNull(),
  suspendedAt: timestamp("suspendedAt"),
  suspendedByAdminId: integer("suspendedByAdminId"),
  suspendReason: text("suspendReason"),
  memberCount: integer("memberCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type PublicGroup = typeof publicGroups.$inferSelect;
export type InsertPublicGroup = typeof publicGroups.$inferInsert;

export const publicGroupMembers = pgTable("public_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  userId: integer("userId").notNull(),
  role: public_group_members_role_enum("role").default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
export type PublicGroupMember = typeof publicGroupMembers.$inferSelect;

export const publicGroupPosts = pgTable("public_group_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  authorId: integer("authorId").notNull(),
  content: text("content"),
  mediaUrl: varchar("mediaUrl", { length: 512 }),
  mediaType: public_group_posts_mediaType_enum("mediaType"),
  photo2Url: varchar("photo2Url", { length: 512 }),
  photo3Url: varchar("photo3Url", { length: 512 }),
  photo1Caption: varchar("photo1Caption", { length: 300 }),
  photo2Caption: varchar("photo2Caption", { length: 300 }),
  photo3Caption: varchar("photo3Caption", { length: 300 }),
  photo1Alt: varchar("photo1Alt", { length: 500 }),
  photo2Alt: varchar("photo2Alt", { length: 500 }),
  photo3Alt: varchar("photo3Alt", { length: 500 }),
  videoPosterUrl: varchar("videoPosterUrl", { length: 512 }),
  audioUrl: varchar("audioUrl", { length: 512 }),
  audioName: varchar("audioName", { length: 255 }),
  docUrl: varchar("docUrl", { length: 512 }),
  docName: varchar("docName", { length: 255 }),
  docSize: integer("docSize"),
  docType: varchar("docType", { length: 100 }),
  pollId: integer("pollId"),
  bgColor: varchar("bgColor", { length: 30 }),
  linkUrl: varchar("linkUrl", { length: 512 }),
  linkTitle: varchar("linkTitle", { length: 300 }),
  linkDescription: text("linkDescription"),
  linkImage: varchar("linkImage", { length: 512 }),
  linkSiteName: varchar("linkSiteName", { length: 100 }),
  shareCount: integer("shareCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type PublicGroupPost = typeof publicGroupPosts.$inferSelect;
export type InsertPublicGroupPost = typeof publicGroupPosts.$inferInsert;

// Public Group posts have their own identifiers, so comments are kept in a
// dedicated table instead of reusing ordinary post comments and risking ID clashes.
export const publicGroupPostComments = pgTable("public_group_post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  authorId: integer("authorId").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type PublicGroupPostComment = typeof publicGroupPostComments.$inferSelect;
export type InsertPublicGroupPostComment = typeof publicGroupPostComments.$inferInsert;

// ─── Stories ─────────────────────────────────────────────────────────────────
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  authorId: integer("authorId").notNull(),
  mediaUrl: varchar("mediaUrl", { length: 512 }).notNull(),
  mediaType: stories_mediaType_enum("mediaType").notNull().default("photo"),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  caption: varchar("caption", { length: 300 }),
  duration: integer("duration").default(5000).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Story = typeof stories.$inferSelect;
export type InsertStory = typeof stories.$inferInsert;

export const storyViews = pgTable("story_views", {
  id: serial("id").primaryKey(),
  storyId: integer("storyId").notNull(),
  viewerId: integer("viewerId").notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});
export type StoryView = typeof storyViews.$inferSelect;
export type InsertStoryView = typeof storyViews.$inferInsert;

// ─── Story Reactions ──────────────────────────────────────────────────────────
export const storyReactions = pgTable("story_reactions", {
  id: serial("id").primaryKey(),
  storyId: integer("storyId").notNull(),
  reactorId: integer("reactorId").notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StoryReaction = typeof storyReactions.$inferSelect;
export type InsertStoryReaction = typeof storyReactions.$inferInsert;

// ─── Story Highlights ─────────────────────────────────────────────────────────
export const storyHighlights = pgTable("story_highlights", {
  id: serial("id").primaryKey(),
  authorId: integer("authorId").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  coverUrl: varchar("coverUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type StoryHighlight = typeof storyHighlights.$inferSelect;
export type InsertStoryHighlight = typeof storyHighlights.$inferInsert;

export const storyHighlightItems = pgTable("story_highlight_items", {
  id: serial("id").primaryKey(),
  highlightId: integer("highlightId").notNull(),
  mediaUrl: varchar("mediaUrl", { length: 512 }).notNull(),
  mediaType: story_highlight_items_mediaType_enum("mediaType").notNull().default("photo"),
  caption: varchar("caption", { length: 300 }),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});
export type StoryHighlightItem = typeof storyHighlightItems.$inferSelect;
export type InsertStoryHighlightItem = typeof storyHighlightItems.$inferInsert;

// ─── Bookmarks ────────────────────────────────────────────────────────────────
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  postId: integer("postId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

// ─── Post Reactions ───────────────────────────────────────────────────────────
export const postReactions = pgTable("post_reactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  postId: integer("postId").notNull(),
  reaction: post_reactions_reaction_enum("reaction").notNull().default("like"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PostReaction = typeof postReactions.$inferSelect;
export type InsertPostReaction = typeof postReactions.$inferInsert;
// ─── Post Edit History ────────────────────────────────────────────────────────
export const postEdits = pgTable("post_edits", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  previousText: text("previousText"),
  previousBgColor: varchar("previousBgColor", { length: 30 }),
  editedAt: timestamp("editedAt").defaultNow().notNull(),
});
export type PostEdit = typeof postEdits.$inferSelect;
export type InsertPostEdit = typeof postEdits.$inferInsert;

// ─── Admin Audit Log ──────────────────────────────────────────────────────────
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actorId").notNull(),
  actorName: varchar("actorName", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  targetUserId: integer("targetUserId"),
  targetUserName: varchar("targetUserName", { length: 255 }),
  targetPostId: integer("targetPostId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;

// ─── Shop Listings (Sale & Buy) ───────────────────────────────────────────────
export const shopListings = pgTable("shop_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("sellerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  condition: shop_listings_condition_enum("condition").notNull().default("good"),
  category: varchar("category", { length: 100 }).notNull().default("other"),
  // JSON array of media URLs (photos + optional video) — same upload limits as posts
  mediaUrls: json("mediaUrls").$type<string[]>().default([]),
  location: varchar("location", { length: 255 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 30 }),
  status: shop_listings_status_enum("status").notNull().default("active"),
  isFlagged: boolean("isFlagged").default(false).notNull(),
  flagReason: text("flagReason"),
  removedByAdminId: integer("removedByAdminId"),
  viewCount: integer("viewCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ShopListing = typeof shopListings.$inferSelect;
export type InsertShopListing = typeof shopListings.$inferInsert;

// ─── Shop Saved (Watchlist) ───────────────────────────────────────────────────
export const shopSaved = pgTable("shop_saved", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  listingId: integer("listingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ShopSaved = typeof shopSaved.$inferSelect;
export type InsertShopSaved = typeof shopSaved.$inferInsert;

// ─── Reels ────────────────────────────────────────────────────────────────────
export const reels = pgTable("reels", {
  id: serial("id").primaryKey(),
  authorId: integer("authorId").notNull(),
  videoUrl: varchar("videoUrl", { length: 512 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 512 }),
  caption: text("caption"),
  duration: integer("duration").default(0).notNull(), // seconds
  viewCount: integer("viewCount").default(0).notNull(),
  likeCount: integer("likeCount").default(0).notNull(),
  commentCount: integer("commentCount").default(0).notNull(),
  hashtags: text("hashtags"), // comma-separated tags, e.g. "travel,food,funny"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Reel = typeof reels.$inferSelect;
export type InsertReel = typeof reels.$inferInsert;

export const reelLikes = pgTable("reel_likes", {
  id: serial("id").primaryKey(),
  reelId: integer("reelId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReelLike = typeof reelLikes.$inferSelect;

export const reelComments = pgTable("reel_comments", {
  id: serial("id").primaryKey(),
  reelId: integer("reelId").notNull(),
  authorId: integer("authorId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReelComment = typeof reelComments.$inferSelect;

export const reelViews = pgTable("reel_views", {
  id: serial("id").primaryKey(),
  reelId: integer("reelId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReelView = typeof reelViews.$inferSelect;

// ─── Call History ─────────────────────────────────────────────────────────────
export const callHistory = pgTable("call_history", {
  id: serial("id").primaryKey(),
  callerId: integer("callerId").notNull(),
  calleeId: integer("calleeId").notNull(),
  type: call_history_type_enum("type").notNull().default("voice"),
  status: call_history_status_enum("status").notNull().default("missed"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  duration: integer("duration").default(0).notNull(),
});
export type CallHistoryRow = typeof callHistory.$inferSelect;
export type InsertCallHistory = typeof callHistory.$inferInsert;

// ─── Push Subscriptions ───────────────────────────────────────────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  endpoint: varchar("endpoint", { length: 512 }).notNull(),
  p256dh: varchar("p256dh", { length: 256 }).notNull(),
  auth: varchar("auth", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Support Messages ─────────────────────────────────────────────────────────
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  message: text("message").notNull(),
  phone: varchar("phone", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  isRead: boolean("isRead").default(false).notNull(),
  status: varchar("status", { length: 50 }).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;

// Support Replies — admin replies to support messages
export const supportReplies = pgTable("support_replies", {
  id:        serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  adminId:   integer("admin_id").notNull(),
  adminName: varchar("admin_name", { length: 255 }),
  content:   text("content").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ─── Message Reactions ────────────────────────────────────────────────────────
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("messageId").notNull(),
  userId: integer("userId").notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = typeof messageReactions.$inferInsert;

// ─── Group Message Reactions ──────────────────────────────────────────────────
export const groupMessageReactions = pgTable("group_message_reactions", {
  id:             serial("id").primaryKey(),
  groupMessageId: integer("group_message_id").notNull(),
  userId:         integer("user_id").notNull(),
  emoji:          varchar("emoji", { length: 10 }).notNull(),
  createdAt:      integer("created_at").notNull(),
});
export type GroupMessageReaction = typeof groupMessageReactions.$inferSelect;
export type InsertGroupMessageReaction = typeof groupMessageReactions.$inferInsert;

// ─── User Blocks ──────────────────────────────────────────────────────────────
export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blockerId").notNull(),
  blockedId: integer("blockedId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = typeof blocks.$inferInsert;

// ─── Post Edit History ────────────────────────────────────────────────────────
export const postEditHistory = pgTable("postEditHistory", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull(),
  authorId: integer("authorId").notNull(),
  previousText: text("previousText"),
  newText: text("newText"),
  editedAt: timestamp("editedAt").defaultNow().notNull(),
});

export type PostEditHistory = typeof postEditHistory.$inferSelect;
export type InsertPostEditHistory = typeof postEditHistory.$inferInsert;

// ─── Feed Advertisements ──────────────────────────────────────────────────────
export const feedAds = pgTable("feedAds", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  linkUrl: text("linkUrl"),
  linkText: varchar("linkText", { length: 100 }).default("Learn More"),
  imageWidth: integer("imageWidth").default(600),
  imageHeight: integer("imageHeight").default(400),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type FeedAd = typeof feedAds.$inferSelect;
export type InsertFeedAd = typeof feedAds.$inferInsert;

// ─── Home News Feed Sources ──────────────────────────────────────────────────
export const newsFeedSources = pgTable("newsFeedSources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  feedUrl: text("feedUrl").notNull(),
  websiteUrl: text("websiteUrl"),
  language: varchar("language", { length: 20 }).default("en").notNull(),
  displayOrder: integer("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type NewsFeedSource = typeof newsFeedSources.$inferSelect;
export type InsertNewsFeedSource = typeof newsFeedSources.$inferInsert;

// ─── Ad Events (impressions & clicks) ────────────────────────────────────────
export const adEventTypeEnum = pgEnum("ad_event_type", ["impression", "click"]);
export const adEvents = pgTable("adEvents", {
  id: serial("id").primaryKey(),
  adId: integer("adId").notNull(),
  userId: integer("userId"), // nullable — logged-out users still count
  eventType: adEventTypeEnum("eventType").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdEvent = typeof adEvents.$inferSelect;
export type InsertAdEvent = typeof adEvents.$inferInsert;

// ─── Content Reports ──────────────────────────────────────────────────────────
export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "harassment",
  "misinformation",
  "nudity_sexual",
  "violence",
  "hate_speech",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "reviewed",
  "dismissed",
]);
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporterId").notNull(),
  postId: integer("postId"),       // nullable — set when reporting a post
  commentId: integer("commentId"), // nullable — set when reporting a comment
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;


// ─── Admin Broadcast Messaging System (With Segmentation) ──────────────────────────
export const broadcastSegmentTypeEnum = pgEnum("broadcast_segment_type", [
  "all_users",
  "verified_users",
  "new_users_7days",
]);

export const inactiveUserReminders = pgTable("inactiveUserReminders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailSentAt: timestamp("emailSentAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt"),
  reminderType: varchar("reminderType", { length: 50 }).default("14_days_inactive").notNull(),
});
export type InactiveUserReminder = typeof inactiveUserReminders.$inferSelect;
export type InsertInactiveUserReminder = typeof inactiveUserReminders.$inferInsert;

export const adminBroadcasts = pgTable("adminBroadcasts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  segmentType: broadcastSegmentTypeEnum("segmentType").default("all_users").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdminBroadcast = typeof adminBroadcasts.$inferSelect;
export type InsertAdminBroadcast = typeof adminBroadcasts.$inferInsert;

