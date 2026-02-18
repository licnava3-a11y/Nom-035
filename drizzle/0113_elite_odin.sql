CREATE TABLE `model_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`critical_comments_weight` int NOT NULL DEFAULT 40,
	`open_cases_weight` int NOT NULL DEFAULT 30,
	`high_risk_surveys_weight` int NOT NULL DEFAULT 30,
	`high_risk_threshold` int NOT NULL DEFAULT 70,
	`medium_risk_threshold` int NOT NULL DEFAULT 40,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `model_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `model_thresholds` ADD CONSTRAINT `model_thresholds_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;