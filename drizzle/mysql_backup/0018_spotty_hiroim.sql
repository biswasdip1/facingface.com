CREATE TABLE `passkeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credentialId` varchar(512) NOT NULL,
	`publicKey` text NOT NULL,
	`counter` int NOT NULL DEFAULT 0,
	`deviceName` varchar(100) NOT NULL DEFAULT 'My Device',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passkeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `passkeys_credentialId_unique` UNIQUE(`credentialId`)
);
--> statement-breakpoint
CREATE TABLE `webauthn_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`challenge` varchar(512) NOT NULL,
	`type` varchar(20) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webauthn_challenges_id` PRIMARY KEY(`id`)
);
