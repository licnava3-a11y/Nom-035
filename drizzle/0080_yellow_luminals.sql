CREATE TABLE `survey_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`response_id` int NOT NULL,
	`user_id` int,
	`survey_id` int NOT NULL,
	`period_id` int,
	`total_score` int NOT NULL,
	`risk_level` enum('low','medium','high','very_high') NOT NULL,
	`category_scores` text,
	`domain_scores` text,
	`recommendations` text,
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `survey_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `survey_results_response_id_unique` UNIQUE(`response_id`)
);
--> statement-breakpoint
ALTER TABLE `survey_results` ADD CONSTRAINT `survey_results_response_id_survey_responses_id_fk` FOREIGN KEY (`response_id`) REFERENCES `survey_responses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_results` ADD CONSTRAINT `survey_results_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_results` ADD CONSTRAINT `survey_results_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_results` ADD CONSTRAINT `survey_results_period_id_survey_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `survey_periods`(`id`) ON DELETE no action ON UPDATE no action;