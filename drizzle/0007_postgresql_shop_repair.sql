-- PostgreSQL repair for Sale & Buy shop tables after MySQL migration.
-- This migration is intentionally idempotent. It repairs databases where
-- camelCase MySQL columns were imported into PostgreSQL as lowercase names
-- such as sellerid, mediaurls, contactemail, or viewcount, while Drizzle
-- selects and inserts the quoted camelCase identifiers.

DO $$ BEGIN
  CREATE TYPE shop_listings_condition_enum AS ENUM ('new', 'like_new', 'good', 'fair', 'for_parts');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE shop_listings_status_enum AS ENUM ('active', 'sold', 'draft', 'removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_listings" (
  "id" serial PRIMARY KEY,
  "sellerId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "price" numeric(12, 2) NOT NULL,
  "currency" varchar(10) DEFAULT 'USD' NOT NULL,
  "condition" shop_listings_condition_enum DEFAULT 'good' NOT NULL,
  "category" varchar(100) DEFAULT 'other' NOT NULL,
  "mediaUrls" json DEFAULT '[]'::json,
  "location" varchar(255),
  "lat" numeric(10, 7),
  "lng" numeric(10, 7),
  "contactEmail" varchar(320),
  "contactPhone" varchar(30),
  "status" shop_listings_status_enum DEFAULT 'active' NOT NULL,
  "isFlagged" boolean DEFAULT false NOT NULL,
  "flagReason" text,
  "removedByAdminId" integer,
  "viewCount" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'sellerid')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'sellerId') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "sellerid" TO "sellerId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'mediaurls')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'mediaUrls') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "mediaurls" TO "mediaUrls";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'contactemail')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'contactEmail') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "contactemail" TO "contactEmail";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'contactphone')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'contactPhone') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "contactphone" TO "contactPhone";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'isflagged')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'isFlagged') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "isflagged" TO "isFlagged";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'flagreason')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'flagReason') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "flagreason" TO "flagReason";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'removedbyadminid')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'removedByAdminId') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "removedbyadminid" TO "removedByAdminId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'viewcount')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'viewCount') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "viewcount" TO "viewCount";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'createdat')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'createdAt') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "createdat" TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'updatedat')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_listings' AND column_name = 'updatedAt') THEN
    ALTER TABLE "shop_listings" RENAME COLUMN "updatedat" TO "updatedAt";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "sellerId" integer;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "category" varchar(100) DEFAULT 'other';
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "mediaUrls" json DEFAULT '[]'::json;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "location" varchar(255);
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "lat" numeric(10, 7);
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "lng" numeric(10, 7);
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "contactEmail" varchar(320);
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "contactPhone" varchar(30);
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "isFlagged" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "flagReason" text;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "removedByAdminId" integer;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "viewCount" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
--> statement-breakpoint
ALTER TABLE "shop_listings" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
--> statement-breakpoint
UPDATE "shop_listings" SET "currency" = 'USD' WHERE "currency" IS NULL;
--> statement-breakpoint
UPDATE "shop_listings" SET "category" = 'other' WHERE "category" IS NULL;
--> statement-breakpoint
UPDATE "shop_listings" SET "mediaUrls" = '[]'::json WHERE "mediaUrls" IS NULL;
--> statement-breakpoint
UPDATE "shop_listings" SET "isFlagged" = false WHERE "isFlagged" IS NULL;
--> statement-breakpoint
UPDATE "shop_listings" SET "viewCount" = 0 WHERE "viewCount" IS NULL;
--> statement-breakpoint
UPDATE "shop_listings" SET "createdAt" = now() WHERE "createdAt" IS NULL;
--> statement-breakpoint
UPDATE "shop_listings" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "currency" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "category" SET DEFAULT 'other';
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "category" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "mediaUrls" SET DEFAULT '[]'::json;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "isFlagged" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "isFlagged" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "viewCount" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "viewCount" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "createdAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "createdAt" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "shop_listings" ALTER COLUMN "updatedAt" SET NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_saved" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "listingId" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_saved' AND column_name = 'userid')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_saved' AND column_name = 'userId') THEN
    ALTER TABLE "shop_saved" RENAME COLUMN "userid" TO "userId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_saved' AND column_name = 'listingid')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_saved' AND column_name = 'listingId') THEN
    ALTER TABLE "shop_saved" RENAME COLUMN "listingid" TO "listingId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_saved' AND column_name = 'createdat')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shop_saved' AND column_name = 'createdAt') THEN
    ALTER TABLE "shop_saved" RENAME COLUMN "createdat" TO "createdAt";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "shop_saved" ADD COLUMN IF NOT EXISTS "userId" integer;
--> statement-breakpoint
ALTER TABLE "shop_saved" ADD COLUMN IF NOT EXISTS "listingId" integer;
--> statement-breakpoint
ALTER TABLE "shop_saved" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
--> statement-breakpoint
UPDATE "shop_saved" SET "createdAt" = now() WHERE "createdAt" IS NULL;
--> statement-breakpoint
ALTER TABLE "shop_saved" ALTER COLUMN "createdAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "shop_saved" ALTER COLUMN "createdAt" SET NOT NULL;
