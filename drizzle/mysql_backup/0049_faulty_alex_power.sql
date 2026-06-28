CREATE TABLE `support_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message_id` int NOT NULL,
	`admin_id` int NOT NULL,
	`admin_name` varchar(255),
	`content` text NOT NULL,
	`created_at` int NOT NULL,
	CONSTRAINT `support_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `support_messages` ADD `status` varchar(50) DEFAULT 'open' NOT NULL;