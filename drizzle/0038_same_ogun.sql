CREATE TABLE `nom035_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_number` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`domain` varchar(150),
	`dimension` varchar(150),
	`question_text` text NOT NULL,
	`question_type` enum('likert_5','yes_no','multiple_choice') NOT NULL DEFAULT 'likert_5',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nom035_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `nom035_questions_question_number_unique` UNIQUE(`question_number`)
);
--> statement-breakpoint
CREATE TABLE `nom035_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`survey_period_id` int NOT NULL,
	`question_id` int NOT NULL,
	`response` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nom035_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nom035_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`survey_period_id` int NOT NULL,
	`global_score` int NOT NULL,
	`global_risk_level` enum('nulo','bajo','medio','alto','muy_alto') NOT NULL,
	`category_scores` json,
	`domain_scores` json,
	`dimension_scores` json,
	`recommendations` text,
	`completed_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nom035_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nom035_survey_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nom035_survey_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `nom035_responses` ADD CONSTRAINT `nom035_responses_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_responses` ADD CONSTRAINT `nom035_responses_survey_period_id_nom035_survey_periods_id_fk` FOREIGN KEY (`survey_period_id`) REFERENCES `nom035_survey_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_responses` ADD CONSTRAINT `nom035_responses_question_id_nom035_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `nom035_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_results` ADD CONSTRAINT `nom035_results_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_results` ADD CONSTRAINT `nom035_results_survey_period_id_nom035_survey_periods_id_fk` FOREIGN KEY (`survey_period_id`) REFERENCES `nom035_survey_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_survey_periods` ADD CONSTRAINT `nom035_survey_periods_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;