-- PostgreSQL repair migration for FacingFace pages and public groups.
-- This is intentionally idempotent so it can be applied safely to databases
-- that were migrated from the older MySQL schema and may be missing newer
-- camelCase PostgreSQL columns selected by Drizzle.

DO $$ BEGIN
  CREATE TYPE public_group_members_role_enum AS ENUM ('admin', 'moderator', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE public_group_posts_mediaType_enum AS ENUM ('photo', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_pages" (
  "id" serial PRIMARY KEY,
  "handle" varchar(60) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "category" varchar(60),
  "logo" text,
  "coverPhoto" text,
  "website" varchar(255),
  "location" varchar(100),
  "ownerId" integer,
  "followerCount" integer DEFAULT 0 NOT NULL,
  "isVerified" boolean DEFAULT false NOT NULL,
  "isSuspended" boolean DEFAULT false NOT NULL,
  "suspendedAt" timestamp,
  "suspendedByAdminId" integer,
  "suspendReason" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_pages_handle_unique" ON "org_pages" ("handle");
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "category" varchar(60);
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "logo" text;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "coverPhoto" text;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "website" varchar(255);
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "location" varchar(100);
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "ownerId" integer;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "followerCount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "isVerified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "isSuspended" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "suspendedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "suspendedByAdminId" integer;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "suspendReason" text;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "org_pages" SET "followerCount" = 0 WHERE "followerCount" IS NULL;
--> statement-breakpoint
UPDATE "org_pages" SET "isVerified" = false WHERE "isVerified" IS NULL;
--> statement-breakpoint
UPDATE "org_pages" SET "isSuspended" = false WHERE "isSuspended" IS NULL;
--> statement-breakpoint
UPDATE "org_pages" SET "createdAt" = now() WHERE "createdAt" IS NULL;
--> statement-breakpoint
UPDATE "org_pages" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "followerCount" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "followerCount" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "isVerified" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "isVerified" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "isSuspended" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "isSuspended" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "createdAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "createdAt" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "org_pages" ALTER COLUMN "updatedAt" SET NOT NULL;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_followers" (
  "id" serial PRIMARY KEY,
  "pageId" integer NOT NULL,
  "userId" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_admins" (
  "id" serial PRIMARY KEY,
  "pageId" integer NOT NULL,
  "userId" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_groups" (
  "id" serial PRIMARY KEY,
  "handle" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "category" varchar(80),
  "coverPhoto" varchar(512),
  "createdBy" integer,
  "isSuspended" boolean DEFAULT false NOT NULL,
  "suspendedAt" timestamp,
  "suspendedByAdminId" integer,
  "suspendReason" text,
  "memberCount" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "public_groups_handle_unique" ON "public_groups" ("handle");
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "category" varchar(80);
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "coverPhoto" varchar(512);
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "createdBy" integer;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "isSuspended" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "suspendedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "suspendedByAdminId" integer;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "suspendReason" text;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "memberCount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "public_groups" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "public_groups" SET "memberCount" = 0 WHERE "memberCount" IS NULL;
--> statement-breakpoint
UPDATE "public_groups" SET "isSuspended" = false WHERE "isSuspended" IS NULL;
--> statement-breakpoint
UPDATE "public_groups" SET "createdAt" = now() WHERE "createdAt" IS NULL;
--> statement-breakpoint
UPDATE "public_groups" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "memberCount" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "memberCount" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "isSuspended" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "isSuspended" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "createdAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "createdAt" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public_groups" ALTER COLUMN "updatedAt" SET NOT NULL;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_group_members" (
  "id" serial PRIMARY KEY,
  "groupId" integer NOT NULL,
  "userId" integer NOT NULL,
  "role" public_group_members_role_enum DEFAULT 'member' NOT NULL,
  "joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_group_posts" (
  "id" serial PRIMARY KEY,
  "groupId" integer NOT NULL,
  "authorId" integer NOT NULL,
  "content" text,
  "mediaUrl" varchar(512),
  "mediaType" public_group_posts_mediaType_enum,
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
