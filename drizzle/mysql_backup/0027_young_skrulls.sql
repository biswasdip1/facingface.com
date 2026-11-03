CREATE TABLE `public_group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','moderator','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_group_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text,
	`mediaUrl` varchar(512),
	`mediaType` enum('photo','video'),
	`photo2Url` varchar(512),
	`photo3Url` varchar(512),
	`photo1Caption` varchar(300),
	`photo2Caption` varchar(300),
	`photo3Caption` varchar(300),
	`audioUrl` varchar(512),
	`audioName` varchar(255),
	`docUrl` varchar(512),
	`docName` varchar(255),
	`docSize` int,
	`docType` varchar(100),
	`pollId` int,
	`bgColor` varchar(30),
	`linkUrl` varchar(512),
	`linkTitle` varchar(300),
	`linkDescription` text,
	`linkImage` varchar(512),
	`linkSiteName` varchar(100),
	`shareCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_group_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handle` varchar(100) NOT NULL,
	`name` varchar(150) NOT NULL,
	`description` text,
	`category` varchar(80),
	`coverPhoto` varchar(512),
	`createdBy` int NOT NULL,
	`memberCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_groups_handle_unique` UNIQUE(`handle`)
);
