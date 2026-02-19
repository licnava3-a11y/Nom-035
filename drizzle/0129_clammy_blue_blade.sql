CREATE TABLE `survey_employee_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`employee_id` int NOT NULL,
	`curp` varchar(18) NOT NULL,
	`survey_period_id` int NOT NULL,
	`survey_type` varchar(50) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`is_revoked` boolean NOT NULL DEFAULT false,
	`generated_by` int NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_employee_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `survey_employee_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `survey_employee_tokens` ADD CONSTRAINT `survey_employee_tokens_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_employee_tokens` ADD CONSTRAINT `survey_employee_tokens_survey_period_id_survey_periods_id_fk` FOREIGN KEY (`survey_period_id`) REFERENCES `survey_periods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_employee_tokens` ADD CONSTRAINT `survey_employee_tokens_generated_by_users_id_fk` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;