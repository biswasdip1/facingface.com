CREATE TYPE "public"."broadcast_segment_type" AS ENUM('all_users', 'verified_users', 'inactive_users', 'new_users', 'region_based');--> statement-breakpoint
CREATE TYPE "public"."broadcast_status" AS ENUM('draft', 'scheduled', 'sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'harassment', 'misinformation', 'nudity_sexual', 'violence', 'hate_speech', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'reviewed', 'dismissed');--> statement-breakpoint
ALTER TYPE "public"."post_reactions_reaction_enum" ADD VALUE 'seen';--> statement-breakpoint
CREATE TABLE "adminBroadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"richHtml" text,
	"segmentType" "broadcast_segment_type" DEFAULT 'all_users' NOT NULL,
	"regionFilter" varchar(100),
	"inactiveThresholdDays" integer,
	"newUserThresholdDays" integer,
	"scheduledAt" timestamp,
	"recurringPattern" varchar(50),
	"recurringEndDate" timestamp,
	"status" "broadcast_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"sentAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "broadcastAnalytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcastId" integer NOT NULL,
	"totalRecipients" integer DEFAULT 0 NOT NULL,
	"deliveredCount" integer DEFAULT 0 NOT NULL,
	"readCount" integer DEFAULT 0 NOT NULL,
	"clickCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "broadcastAnalytics_broadcastId_unique" UNIQUE("broadcastId")
);
--> statement-breakpoint
CREATE TABLE "broadcastRecipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcastId" integer NOT NULL,
	"userId" integer NOT NULL,
	"deliveredAt" timestamp,
	"readAt" timestamp,
	"clickedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsFeedSources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"feedUrl" text NOT NULL,
	"websiteUrl" text,
	"language" varchar(20) DEFAULT 'en' NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporterId" integer NOT NULL,
	"postId" integer,
	"commentId" integer,
	"reason" "report_reason" NOT NULL,
	"description" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthDay" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthMonth" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hobby" varchar(120);