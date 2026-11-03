CREATE TABLE `live_streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hostId` int NOT NULL,
	`title` varchar(200),
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`viewerCount` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `live_streams_id` PRIMARY KEY(`id`)
);
