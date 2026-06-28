CREATE TABLE `shop_saved` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_saved_id` PRIMARY KEY(`id`)
);
