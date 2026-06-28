CREATE TABLE "message_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"messageId" integer NOT NULL,
	"userId" integer NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
