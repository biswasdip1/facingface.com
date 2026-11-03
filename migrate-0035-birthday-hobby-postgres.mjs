import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run this migration.");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require",
  max: 1,
});

try {
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthDay" integer`;
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthMonth" integer`;
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hobby" varchar(120)`;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE "users" ADD CONSTRAINT "users_birthDay_range" CHECK ("birthDay" IS NULL OR ("birthDay" >= 1 AND "birthDay" <= 31));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE "users" ADD CONSTRAINT "users_birthMonth_range" CHECK ("birthMonth" IS NULL OR ("birthMonth" >= 1 AND "birthMonth" <= 12));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  console.log("Migration 0035 applied: birthDay, birthMonth, and hobby columns added to users.");
} finally {
  await sql.end();
}
