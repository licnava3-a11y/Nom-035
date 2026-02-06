CREATE TABLE `survey_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`survey_type` enum('guia_i','guia_ii','guia_iii') NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('draft','active','closed','archived') NOT NULL DEFAULT 'draft',
	`description` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `survey_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `period_id` int;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD `period_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `survey_periods` ADD CONSTRAINT `survey_periods_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_period_id_survey_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `survey_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD CONSTRAINT `survey_tokens_period_id_survey_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `survey_periods`(`id`) ON DELETE no action ON UPDATE no action;