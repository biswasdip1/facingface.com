ALTER TABLE `posts` ADD `deletionScheduledAt` timestamp;--> statement-breakpoint
ALTER TABLE `posts` ADD `deletionWarningSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `violationCount` int DEFAULT 0 NOT NULL;