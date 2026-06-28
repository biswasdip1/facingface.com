CREATE TABLE `story_highlight_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`highlightId` int NOT NULL,
	`mediaUrl` varchar(512) NOT NULL,
	`mediaType` enum('photo','video') NOT NULL DEFAULT 'photo',
	`caption` varchar(300),
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `story_highlight_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_highlights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(100) NOT NULL,
	`coverUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `story_highlights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storyId` int NOT NULL,
	`reactorId` int NOT NULL,
	`emoji` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `story_reactions_id` PRIMARY KEY(`id`)
);
