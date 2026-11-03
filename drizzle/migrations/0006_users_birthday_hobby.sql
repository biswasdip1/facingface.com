ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthDay" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthMonth" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hobby" varchar(120);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_birthDay_range" CHECK ("birthDay" IS NULL OR ("birthDay" >= 1 AND "birthDay" <= 31));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_birthMonth_range" CHECK ("birthMonth" IS NULL OR ("birthMonth" >= 1 AND "birthMonth" <= 12));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
