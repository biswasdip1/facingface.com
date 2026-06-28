CREATE TABLE IF NOT EXISTS "newsFeedSources" (
  "id" serial PRIMARY KEY,
  "name" varchar(160) NOT NULL,
  "feedUrl" text NOT NULL,
  "websiteUrl" text,
  "language" varchar(20) NOT NULL DEFAULT 'en',
  "displayOrder" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "newsFeedSources_active_order_idx"
  ON "newsFeedSources" ("isActive", "displayOrder", "id");

INSERT INTO "newsFeedSources" ("name", "feedUrl", "websiteUrl", "language", "displayOrder", "isActive")
SELECT 'The Himalayan Times', 'https://thehimalayantimes.com/rssFeed/0', 'https://thehimalayantimes.com', 'en', 1, true
WHERE NOT EXISTS (SELECT 1 FROM "newsFeedSources" WHERE "feedUrl" = 'https://thehimalayantimes.com/rssFeed/0');

INSERT INTO "newsFeedSources" ("name", "feedUrl", "websiteUrl", "language", "displayOrder", "isActive")
SELECT 'Ratopati', 'https://www.ratopati.com/feed/', 'https://www.ratopati.com', 'ne', 2, true
WHERE NOT EXISTS (SELECT 1 FROM "newsFeedSources" WHERE "feedUrl" = 'https://www.ratopati.com/feed/');
