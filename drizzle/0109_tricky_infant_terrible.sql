CREATE TABLE `sentiment_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`response_id` int NOT NULL,
	`answer_id` int,
	`sentiment` enum('positive','neutral','negative','critical') NOT NULL,
	`risk_level` enum('low','medium','high','critical') NOT NULL,
	`confidence` decimal(5,2),
	`keywords` text,
	`risk_indicators` text,
	`summary` text,
	`recommendations` text,
	`analyzed_at` timestamp NOT NULL DEFAULT (now()),
	`alert_generated` boolean NOT NULL DEFAULT false,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_notes` text,
	CONSTRAINT `sentiment_analysis_id` PRIMARY KEY(`id`),
	CONSTRAINT `sentiment_analysis_response_id_unique` UNIQUE(`response_id`)
);
--> statement-breakpoint
ALTER TABLE `sentiment_analysis` ADD CONSTRAINT `sentiment_analysis_response_id_survey_responses_id_fk` FOREIGN KEY (`response_id`) REFERENCES `survey_responses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sentiment_analysis` ADD CONSTRAINT `sentiment_analysis_answer_id_survey_answers_id_fk` FOREIGN KEY (`answer_id`) REFERENCES `survey_answers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sentiment_analysis` ADD CONSTRAINT `sentiment_analysis_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;