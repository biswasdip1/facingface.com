-- Create new enums
CREATE TYPE "comment_reactions_reaction_enum" AS ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry');
CREATE TYPE "page_post_reactions_reaction_enum" AS ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry');
CREATE TYPE "public_group_post_reactions_reaction_enum" AS ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry');

-- Alter emoji_reactions_targetType_enum to include new types
ALTER TYPE "emoji_reactions_targetType_enum" ADD VALUE 'page_post';
ALTER TYPE "emoji_reactions_targetType_enum" ADD VALUE 'public_group_post';

-- Create org_page_posts table
CREATE TABLE IF NOT EXISTS "org_page_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"pageId" integer NOT NULL,
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
	"likeCount" integer DEFAULT 0 NOT NULL,
	"commentCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS "comment_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"commentId" integer NOT NULL,
	"userId" integer NOT NULL,
	"reaction" "comment_reactions_reaction_enum" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "org_page_posts_pageId_idx" ON "org_page_posts"("pageId");
CREATE INDEX IF NOT EXISTS "org_page_posts_authorId_idx" ON "org_page_posts"("authorId");
CREATE INDEX IF NOT EXISTS "org_page_posts_createdAt_idx" ON "org_page_posts"("createdAt");
CREATE INDEX IF NOT EXISTS "comment_reactions_commentId_idx" ON "comment_reactions"("commentId");
CREATE INDEX IF NOT EXISTS "comment_reactions_userId_idx" ON "comment_reactions"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "comment_reactions_unique" ON "comment_reactions"("commentId", "userId", "reaction");

-- Add missing likeCount and commentCount to public_group_posts if not exists
ALTER TABLE "public_group_posts" ADD COLUMN IF NOT EXISTS "likeCount" integer DEFAULT 0 NOT NULL;
ALTER TABLE "public_group_posts" ADD COLUMN IF NOT EXISTS "commentCount" integer DEFAULT 0 NOT NULL;

-- Create indexes for public_group_posts
CREATE INDEX IF NOT EXISTS "public_group_posts_groupId_idx" ON "public_group_posts"("groupId");
CREATE INDEX IF NOT EXISTS "public_group_posts_authorId_idx" ON "public_group_posts"("authorId");
CREATE INDEX IF NOT EXISTS "public_group_posts_createdAt_idx" ON "public_group_posts"("createdAt");
