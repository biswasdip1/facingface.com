CREATE TABLE IF NOT EXISTS "postEditHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"postId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"previousText" text,
	"newText" text,
	"editedAt" timestamp DEFAULT now() NOT NULL
);
