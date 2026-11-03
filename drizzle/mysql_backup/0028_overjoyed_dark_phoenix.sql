CREATE TABLE `stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`mediaUrl` varchar(512) NOT NULL,
	`mediaType` enum('photo','video') NOT NULL DEFAULT 'photo',
	`storageKey` varchar(500) NOT NULL,
	`caption` varchar(300),
	`duration` int NOT NULL DEFAULT 5000,
	`viewCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storyId` int NOT NULL,
	`viewerId` int NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `story_views_id` PRIMARY KEY(`id`)
);
