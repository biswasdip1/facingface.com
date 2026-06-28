CREATE TABLE `hashtags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tag` varchar(100) NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hashtags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `editedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `hometown` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `currentLocation` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `currentRole` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `users` ADD `website` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `youtubeChannel` varchar(255);