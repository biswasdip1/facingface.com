CREATE TABLE `content_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`targetType` enum('post','comment','listing') NOT NULL,
	`targetId` int NOT NULL,
	`reason` varchar(100) NOT NULL,
	`status` enum('pending','reviewed','actioned','dismissed') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`reviewedAt` timestamp,
	`reviewedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`limitKey` varchar(60) NOT NULL,
	`value` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedByAdminId` int,
	CONSTRAINT `media_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_limits_limitKey_unique` UNIQUE(`limitKey`)
);
--> statement-breakpoint
ALTER TABLE `org_pages` ADD `isSuspended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_pages` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `org_pages` ADD `suspendedByAdminId` int;--> statement-breakpoint
ALTER TABLE `org_pages` ADD `suspendReason` text;--> statement-breakpoint
ALTER TABLE `public_groups` ADD `isSuspended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `public_groups` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `public_groups` ADD `suspendedByAdminId` int;--> statement-breakpoint
ALTER TABLE `public_groups` ADD `suspendReason` text;--> statement-breakpoint
ALTER TABLE `shop_listings` ADD `isFlagged` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_listings` ADD `flagReason` text;--> statement-breakpoint
ALTER TABLE `shop_listings` ADD `removedByAdminId` int;