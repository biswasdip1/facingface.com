CREATE TYPE "public"."call_history_status_enum" AS ENUM('missed', 'answered', 'declined');--> statement-breakpoint
CREATE TYPE "public"."call_history_type_enum" AS ENUM('voice', 'video');--> statement-breakpoint
CREATE TYPE "public"."call_rooms_status_enum" AS ENUM('waiting', 'active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."call_rooms_type_enum" AS ENUM('audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."content_reports_status_enum" AS ENUM('pending', 'reviewed', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."content_reports_targetType_enum" AS ENUM('post', 'comment', 'listing');--> statement-breakpoint
CREATE TYPE "public"."emoji_reactions_targetType_enum" AS ENUM('post', 'comment');--> statement-breakpoint
CREATE TYPE "public"."friend_requests_status_enum" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."group_members_role_enum" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."group_messages_type_enum" AS ENUM('text', 'image', 'file', 'system');--> statement-breakpoint
CREATE TYPE "public"."likes_targetType_enum" AS ENUM('post', 'comment');--> statement-breakpoint
CREATE TYPE "public"."live_streams_status_enum" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."notifications_type_enum" AS ENUM('like_post', 'like_comment', 'comment', 'follow', 'friend_request', 'friend_accepted', 'admin_promoted', 'support_reply');--> statement-breakpoint
CREATE TYPE "public"."post_reactions_reaction_enum" AS ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry');--> statement-breakpoint
CREATE TYPE "public"."posts_mediaType_enum" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."public_group_members_role_enum" AS ENUM('admin', 'moderator', 'member');--> statement-breakpoint
CREATE TYPE "public"."public_group_posts_mediaType_enum" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."shop_listings_condition_enum" AS ENUM('new', 'like_new', 'good', 'fair', 'for_parts');--> statement-breakpoint
CREATE TYPE "public"."shop_listings_status_enum" AS ENUM('active', 'sold', 'draft', 'removed');--> statement-breakpoint
CREATE TYPE "public"."stories_mediaType_enum" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."story_highlight_items_mediaType_enum" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('active', 'cancelled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'super_admin');--> statement-breakpoint
CREATE TABLE "active_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"device" varchar(255),
	"ipAddress" varchar(64),
	"userAgent" varchar(512),
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "active_sessions_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorId" integer NOT NULL,
	"actorName" varchar(255),
	"action" varchar(100) NOT NULL,
	"targetUserId" integer,
	"targetUserName" varchar(255),
	"targetPostId" integer,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"postId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"callerId" integer NOT NULL,
	"calleeId" integer NOT NULL,
	"type" "call_history_type_enum" DEFAULT 'voice' NOT NULL,
	"status" "call_history_status_enum" DEFAULT 'missed' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"duration" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"roomId" integer NOT NULL,
	"userId" integer NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"leftAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "call_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer,
	"hostId" integer NOT NULL,
	"status" "call_rooms_status_enum" DEFAULT 'waiting' NOT NULL,
	"type" "call_rooms_type_enum" DEFAULT 'video' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "call_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"roomId" integer NOT NULL,
	"fromUserId" integer NOT NULL,
	"toUserId" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"payload" text NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"postId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"parentId" integer,
	"text" text NOT NULL,
	"isFlagged" boolean DEFAULT false NOT NULL,
	"flagReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporterId" integer NOT NULL,
	"targetType" "content_reports_targetType_enum" NOT NULL,
	"targetId" integer NOT NULL,
	"reason" varchar(100) NOT NULL,
	"status" "content_reports_status_enum" DEFAULT 'pending' NOT NULL,
	"adminNote" text,
	"reviewedAt" timestamp,
	"reviewedByAdminId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant1Id" integer NOT NULL,
	"participant2Id" integer NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" text NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emoji_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"targetId" integer NOT NULL,
	"targetType" "emoji_reactions_targetType_enum" NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"followerId" integer NOT NULL,
	"followingId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"senderId" integer NOT NULL,
	"receiverId" integer NOT NULL,
	"status" "friend_requests_status_enum" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId1" integer NOT NULL,
	"userId2" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"avatar" varchar(512),
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "group_members_role_enum" DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"content" text NOT NULL,
	"type" "group_messages_type_enum" DEFAULT 'text' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hashtags" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag" varchar(100) NOT NULL,
	"postId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"targetId" integer NOT NULL,
	"targetType" "likes_targetType_enum" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"hostId" integer NOT NULL,
	"title" varchar(200),
	"status" "live_streams_status_enum" DEFAULT 'active' NOT NULL,
	"viewerCount" integer DEFAULT 0 NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "media_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"limitKey" varchar(60) NOT NULL,
	"value" integer NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"updatedByAdminId" integer,
	CONSTRAINT "media_limits_limitKey_unique" UNIQUE("limitKey")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"text" text,
	"fileUrl" text,
	"fileName" varchar(255),
	"fileSize" integer,
	"fileType" varchar(100),
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"actorId" integer NOT NULL,
	"type" "notifications_type_enum" NOT NULL,
	"postId" integer,
	"commentId" integer,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"handle" varchar(60) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(60),
	"logo" text,
	"coverPhoto" text,
	"website" varchar(255),
	"location" varchar(100),
	"ownerId" integer NOT NULL,
	"followerCount" integer DEFAULT 0 NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"isSuspended" boolean DEFAULT false NOT NULL,
	"suspendedAt" timestamp,
	"suspendedByAdminId" integer,
	"suspendReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_pages_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "page_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"pageId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_followers" (
	"id" serial PRIMARY KEY NOT NULL,
	"pageId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"credentialId" varchar(512) NOT NULL,
	"publicKey" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"deviceName" varchar(100) DEFAULT 'My Device' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "passkeys_credentialId_unique" UNIQUE("credentialId")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "phone_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"phone" varchar(30) NOT NULL,
	"otp" varchar(10) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"verifiedAt" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"pollId" integer NOT NULL,
	"text" varchar(200) NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pollId" integer NOT NULL,
	"optionId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"postId" integer NOT NULL,
	"question" varchar(300) NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_edits" (
	"id" serial PRIMARY KEY NOT NULL,
	"postId" integer NOT NULL,
	"previousText" text,
	"previousBgColor" varchar(30),
	"editedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"postId" integer NOT NULL,
	"reaction" "post_reactions_reaction_enum" DEFAULT 'like' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"postId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorId" integer NOT NULL,
	"text" text,
	"mediaUrl" text,
	"mediaType" "posts_mediaType_enum",
	"isFlagged" boolean DEFAULT false NOT NULL,
	"flagReason" text,
	"linkUrl" text,
	"linkTitle" text,
	"linkDescription" text,
	"linkImage" text,
	"linkSiteName" varchar(100),
	"docUrl" text,
	"docName" varchar(255),
	"docSize" integer,
	"docType" varchar(100),
	"photo2Url" text,
	"photo3Url" text,
	"photo1Caption" varchar(300),
	"photo2Caption" varchar(300),
	"photo3Caption" varchar(300),
	"photo1Alt" varchar(500),
	"photo2Alt" varchar(500),
	"photo3Alt" varchar(500),
	"videoPosterUrl" text,
	"bgColor" varchar(30),
	"audioUrl" text,
	"audioName" varchar(255),
	"audioDuration" integer,
	"resharedFromId" integer,
	"reshareComment" text,
	"deletionScheduledAt" timestamp,
	"deletionWarningSentAt" timestamp,
	"editedAt" timestamp,
	"isPinned" boolean DEFAULT false NOT NULL,
	"videoViews" integer DEFAULT 0 NOT NULL,
	"scheduledAt" timestamp,
	"hideEditHistory" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" text NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "public_group_members_role_enum" DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_group_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"content" text,
	"mediaUrl" varchar(512),
	"mediaType" "public_group_posts_mediaType_enum",
	"photo2Url" varchar(512),
	"photo3Url" varchar(512),
	"photo1Caption" varchar(300),
	"photo2Caption" varchar(300),
	"photo3Caption" varchar(300),
	"photo1Alt" varchar(500),
	"photo2Alt" varchar(500),
	"photo3Alt" varchar(500),
	"videoPosterUrl" varchar(512),
	"audioUrl" varchar(512),
	"audioName" varchar(255),
	"docUrl" varchar(512),
	"docName" varchar(255),
	"docSize" integer,
	"docType" varchar(100),
	"pollId" integer,
	"bgColor" varchar(30),
	"linkUrl" varchar(512),
	"linkTitle" varchar(300),
	"linkDescription" text,
	"linkImage" varchar(512),
	"linkSiteName" varchar(100),
	"shareCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"handle" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"category" varchar(80),
	"coverPhoto" varchar(512),
	"createdBy" integer NOT NULL,
	"isSuspended" boolean DEFAULT false NOT NULL,
	"suspendedAt" timestamp,
	"suspendedByAdminId" integer,
	"suspendReason" text,
	"memberCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_groups_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"endpoint" varchar(512) NOT NULL,
	"p256dh" varchar(256) NOT NULL,
	"auth" varchar(128) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reel_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"reelId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reel_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"reelId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reel_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"reelId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reels" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorId" integer NOT NULL,
	"videoUrl" varchar(512) NOT NULL,
	"thumbnailUrl" varchar(512),
	"caption" text,
	"duration" integer DEFAULT 0 NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"likeCount" integer DEFAULT 0 NOT NULL,
	"commentCount" integer DEFAULT 0 NOT NULL,
	"hashtags" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sellerId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"condition" "shop_listings_condition_enum" DEFAULT 'good' NOT NULL,
	"category" varchar(100) DEFAULT 'other' NOT NULL,
	"mediaUrls" json DEFAULT '[]'::json,
	"location" varchar(255),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"contactEmail" varchar(320),
	"contactPhone" varchar(30),
	"status" "shop_listings_status_enum" DEFAULT 'active' NOT NULL,
	"isFlagged" boolean DEFAULT false NOT NULL,
	"flagReason" text,
	"removedByAdminId" integer,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_saved" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"listingId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorId" integer NOT NULL,
	"mediaUrl" varchar(512) NOT NULL,
	"mediaType" "stories_mediaType_enum" DEFAULT 'photo' NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"caption" varchar(300),
	"duration" integer DEFAULT 5000 NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_highlight_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"highlightId" integer NOT NULL,
	"mediaUrl" varchar(512) NOT NULL,
	"mediaType" "story_highlight_items_mediaType_enum" DEFAULT 'photo' NOT NULL,
	"caption" varchar(300),
	"addedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_highlights" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorId" integer NOT NULL,
	"title" varchar(100) NOT NULL,
	"coverUrl" varchar(512),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"storyId" integer NOT NULL,
	"reactorId" integer NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"storyId" integer NOT NULL,
	"viewerId" integer NOT NULL,
	"viewedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"status" "subscriptions_status_enum" DEFAULT 'active' NOT NULL,
	"badgeGranted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"topic" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"phone" varchar(50),
	"whatsapp" varchar(50),
	"isRead" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"admin_name" varchar(255),
	"content" text NOT NULL,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "totp_secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"secret" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"backupCodes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"enabledAt" timestamp,
	CONSTRAINT "totp_secrets_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" text,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"verificationToken" varchar(128),
	"loginMethod" varchar(64),
	"role" "users_role_enum" DEFAULT 'user' NOT NULL,
	"bio" text,
	"avatar" text,
	"coverPhoto" text,
	"hometown" varchar(100),
	"currentLocation" varchar(100),
	"currentRole" varchar(100),
	"phone" varchar(30),
	"phoneVerified" boolean DEFAULT false NOT NULL,
	"website" varchar(255),
	"youtubeChannel" varchar(255),
	"coverCropY" integer DEFAULT 50,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	"suspendedUntil" timestamp,
	"suspendReason" text,
	"violationCount" integer DEFAULT 0 NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"lastCallsSeenAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"challenge" varchar(512) NOT NULL,
	"type" varchar(20) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
