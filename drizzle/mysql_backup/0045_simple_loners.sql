CREATE TABLE `reel_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reelId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reel_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reel_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reelId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reel_likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reel_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reelId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reel_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`videoUrl` varchar(512) NOT NULL,
	`thumbnailUrl` varchar(512),
	`caption` text,
	`duration` int NOT NULL DEFAULT 0,
	`viewCount` int NOT NULL DEFAULT 0,
	`likeCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reels_id` PRIMARY KEY(`id`)
);
