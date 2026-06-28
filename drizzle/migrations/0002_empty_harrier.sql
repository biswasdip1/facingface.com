CREATE TABLE "blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"blockerId" integer NOT NULL,
	"blockedId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_message_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "lastReadMessageIdP1" integer;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "lastReadMessageIdP2" integer;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "mutedUntilP1" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "mutedUntilP2" timestamp;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "mutedUntil" timestamp;--> statement-breakpoint
ALTER TABLE "group_messages" ADD COLUMN "pinnedAt" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "pinnedAt" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastSeenAt" timestamp DEFAULT now() NOT NULL;