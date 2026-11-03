-- Migration 0004: Add content reports table

DO $$ BEGIN
  CREATE TYPE "report_reason" AS ENUM('spam', 'harassment', 'misinformation', 'nudity_sexual', 'violence', 'hate_speech', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "report_status" AS ENUM('pending', 'reviewed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "reports" (
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
