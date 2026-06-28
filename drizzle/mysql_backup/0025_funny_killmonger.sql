CREATE TABLE `org_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handle` varchar(60) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`category` varchar(60),
	`logo` text,
	`coverPhoto` text,
	`website` varchar(255),
	`location` varchar(100),
	`ownerId` int NOT NULL,
	`followerCount` int NOT NULL DEFAULT 0,
	`isVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_pages_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE TABLE `page_admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_admins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_followers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_followers_id` PRIMARY KEY(`id`)
);
