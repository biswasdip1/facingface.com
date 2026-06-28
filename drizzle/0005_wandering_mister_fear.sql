DO $$ BEGIN
	CREATE TYPE "public"."ad_event_type" AS ENUM('impression', 'click');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"adId" integer NOT NULL,
	"userId" integer,
	"eventType" "ad_event_type" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
