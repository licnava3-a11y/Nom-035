CREATE TABLE `operating_rules_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`company_size` enum('small','medium','large') NOT NULL,
	`title` varchar(300) NOT NULL,
	`version` varchar(50) NOT NULL DEFAULT '1.0',
	`objectives` text,
	`structure` text,
	`roles` text,
	`responsibilities` text,
	`procedures` text,
	`meeting_schedule` text,
	`decision_making` text,
	`documentation` text,
	`confidentiality` text,
	`amendments` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operating_rules_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `operating_rules_templates` ADD CONSTRAINT `operating_rules_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;