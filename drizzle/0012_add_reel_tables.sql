-- Create reel_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "reel_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"reelId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create reel_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS "reel_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"reelId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create reel_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS "reel_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"reelId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create unique indexes to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "reel_likes_unique" ON "reel_likes"("reelId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "reel_views_unique" ON "reel_views"("reelId", "userId");
