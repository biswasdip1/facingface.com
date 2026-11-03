CREATE TABLE `call_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	CONSTRAINT `call_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int,
	`hostId` int NOT NULL,
	`status` enum('waiting','active','ended') NOT NULL DEFAULT 'waiting',
	`type` enum('audio','video') NOT NULL DEFAULT 'video',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `call_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`type` varchar(30) NOT NULL,
	`payload` text NOT NULL,
	`consumed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`avatar` varchar(512),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL,
	`type` enum('text','image','file','system') NOT NULL DEFAULT 'text',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_messages_id` PRIMARY KEY(`id`)
);
