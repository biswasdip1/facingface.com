CREATE TABLE `admin_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`actorName` varchar(255),
	`action` varchar(100) NOT NULL,
	`targetUserId` int,
	`targetUserName` varchar(255),
	`targetPostId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
