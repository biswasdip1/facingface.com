CREATE TABLE `totp_secrets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secret` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`backupCodes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`enabledAt` timestamp,
	CONSTRAINT `totp_secrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `totp_secrets_userId_unique` UNIQUE(`userId`)
);
