CREATE TABLE `compliance_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`tipo` varchar(100) NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`generated_by` int NOT NULL,
	`generated_by_name` varchar(255) NOT NULL,
	`generated_by_email` varchar(320),
	`data` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `compliance_reports_uuid_unique` UNIQUE(`uuid`)
);
--> statement-breakpoint
ALTER TABLE `compliance_reports` ADD CONSTRAINT `compliance_reports_generated_by_users_id_fk` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;