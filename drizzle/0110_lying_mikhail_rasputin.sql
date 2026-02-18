CREATE TABLE `executive_reports_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_type` enum('weekly','monthly','quarterly','custom') NOT NULL,
	`period_label` varchar(100) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`file_url` text NOT NULL,
	`file_key` varchar(500) NOT NULL,
	`file_size` int,
	`generated_by` int NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`recipients` text,
	`email_sent` boolean NOT NULL DEFAULT false,
	`email_sent_at` timestamp,
	`report_data` text,
	CONSTRAINT `executive_reports_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `executive_reports_history` ADD CONSTRAINT `executive_reports_history_generated_by_users_id_fk` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;