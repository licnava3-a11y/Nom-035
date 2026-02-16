CREATE TABLE `post_case_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`days_since_closure` int NOT NULL,
	`status` enum('pending','sent','completed','expired') NOT NULL DEFAULT 'pending',
	`sent_at` timestamp,
	`completed_at` timestamp,
	`improvement_rating` int,
	`satisfaction_rating` int,
	`support_rating` int,
	`recommendation_rating` int,
	`comments` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp,
	CONSTRAINT `post_case_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `post_case_surveys` ADD CONSTRAINT `post_case_surveys_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;