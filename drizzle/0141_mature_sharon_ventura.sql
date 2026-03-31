CREATE TABLE `email_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`to_address` text NOT NULL,
	`subject` varchar(500) NOT NULL,
	`html_body` text NOT NULL,
	`text_body` text,
	`from_address` varchar(320),
	`status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`last_attempt_at` timestamp,
	`sent_at` timestamp,
	`error_message` text,
	`source_module` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_queue_id` PRIMARY KEY(`id`)
);
