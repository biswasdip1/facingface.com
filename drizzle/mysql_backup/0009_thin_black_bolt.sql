CREATE TABLE `emoji_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetId` int NOT NULL,
	`targetType` enum('post','comment') NOT NULL,
	`emoji` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emoji_reactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_shares_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD `parentId` int;