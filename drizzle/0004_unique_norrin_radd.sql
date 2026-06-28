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
