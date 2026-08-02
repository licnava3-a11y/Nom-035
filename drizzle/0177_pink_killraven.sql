CREATE TABLE `clinical_exported_pdfs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`folio` varchar(100) NOT NULL,
	`file_key` varchar(500) NOT NULL,
	`file_url` text NOT NULL,
	`generated_by_user_id` int,
	`generated_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clinical_exported_pdfs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`realtime_enabled` boolean NOT NULL DEFAULT true,
	`daily_email_enabled` boolean NOT NULL DEFAULT false,
	`daily_email_hour` int DEFAULT 8,
	`weekly_email_enabled` boolean NOT NULL DEFAULT false,
	`weekly_email_day` int DEFAULT 1,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cases` ADD `rootCause` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `actionPlan` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `resolution` text;--> statement-breakpoint
ALTER TABLE `clinical_records` ADD `professional_signature` mediumtext;