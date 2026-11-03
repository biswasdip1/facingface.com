CREATE TABLE `poll_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pollId` int NOT NULL,
	`text` varchar(200) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `poll_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pollId` int NOT NULL,
	`optionId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `poll_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`question` varchar(300) NOT NULL,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `polls_id` PRIMARY KEY(`id`)
);
