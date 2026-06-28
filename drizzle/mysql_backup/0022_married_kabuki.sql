CREATE TABLE `cover_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` text NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cover_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profile_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` text NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profile_photos_id` PRIMARY KEY(`id`)
);
