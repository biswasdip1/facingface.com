-- Create table for tracking inactive user reminder emails
CREATE TABLE IF NOT EXISTS "inactiveUserReminders" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "emailSentAt" timestamp DEFAULT now() NOT NULL,
  "lastActivityAt" timestamp,
  "reminderType" varchar(50) DEFAULT 'fourteen_days_inactive' NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "inactiveUserReminders_userId_idx" ON "inactiveUserReminders"("userId");
CREATE INDEX IF NOT EXISTS "inactiveUserReminders_emailSentAt_idx" ON "inactiveUserReminders"("emailSentAt");
