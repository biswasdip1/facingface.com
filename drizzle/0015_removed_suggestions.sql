CREATE TABLE IF NOT EXISTS "removedSuggestions" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "removedByAdminId" integer NOT NULL,
  "removedAt" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "removedSuggestions" ADD CONSTRAINT "removedSuggestions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "removedSuggestions" ADD CONSTRAINT "removedSuggestions_removedByAdminId_users_id_fk" FOREIGN KEY ("removedByAdminId") REFERENCES "users"("id") ON DELETE cascade;

CREATE INDEX "removedSuggestions_userId_idx" ON "removedSuggestions" ("userId");
