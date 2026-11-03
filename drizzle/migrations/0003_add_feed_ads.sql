-- Migration 0003: Add feedAds and adEvents tables
-- These tables were defined in schema.ts but never had a migration generated.

DO $$ BEGIN
  CREATE TYPE "ad_event_type" AS ENUM('impression', 'click');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "feedAds" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(200),
  "description" text,
  "imageUrl" text,
  "imageKey" text,
  "linkUrl" text,
  "linkText" varchar(100) DEFAULT 'Learn More',
  "imageWidth" integer DEFAULT 600,
  "imageHeight" integer DEFAULT 400,
  "isActive" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "adEvents" (
  "id" serial PRIMARY KEY NOT NULL,
  "adId" integer NOT NULL,
  "userId" integer,
  "eventType" "ad_event_type" NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
