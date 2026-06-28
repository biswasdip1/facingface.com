CREATE TABLE `phone_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(30) NOT NULL,
	`otp` varchar(10) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phone_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phoneVerified` boolean DEFAULT false NOT NULL;