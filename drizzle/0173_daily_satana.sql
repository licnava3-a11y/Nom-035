CREATE TABLE `sirce_export_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exported_by` int NOT NULL,
	`exported_by_name` varchar(255),
	`record_count` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`file_key` varchar(512),
	`file_url` text,
	`file_hash` varchar(64) NOT NULL,
	`filters_json` text,
	`company_rfc` varchar(13),
	`exported_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sirce_export_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `format_catalog` DROP INDEX `format_catalog_code_unique`;--> statement-breakpoint
ALTER TABLE `format_catalog` MODIFY COLUMN `is_active` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `format_catalog` ADD `change_notes` text;--> statement-breakpoint
ALTER TABLE `format_catalog` ADD `created_by` int;