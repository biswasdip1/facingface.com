ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationToken` varchar(128);