CREATE TABLE `manual_evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeral` varchar(10) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`file_url` varchar(512) NOT NULL,
	`file_key` varchar(512) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_type` varchar(100),
	`uploaded_by` int NOT NULL,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manual_evidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `manual_evidences` ADD CONSTRAINT `manual_evidences_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;