CREATE TABLE `post_edits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`previousText` text,
	`previousBgColor` varchar(30),
	`editedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_edits_id` PRIMARY KEY(`id`)
);
