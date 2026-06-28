CREATE TABLE `call_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`callerId` int NOT NULL,
	`calleeId` int NOT NULL,
	`type` enum('voice','video') NOT NULL DEFAULT 'voice',
	`status` enum('missed','answered','declined') NOT NULL DEFAULT 'missed',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`duration` int NOT NULL DEFAULT 0,
	CONSTRAINT `call_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` varchar(512) NOT NULL,
	`p256dh` varchar(256) NOT NULL,
	`auth` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
