CREATE TABLE `minute_dispatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minute_id` int NOT NULL,
	`recipient_id` int NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`read_at` timestamp,
	`status` enum('sent','read','bounced') NOT NULL DEFAULT 'sent',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `minute_dispatches_id` PRIMARY KEY(`id`)
);
