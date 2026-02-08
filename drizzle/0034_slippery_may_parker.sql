CREATE TABLE `investigation_questionnaires` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`questionnaire_type` enum('mobbing','burnout') NOT NULL,
	`employee_id` int NOT NULL,
	`access_token` varchar(255) NOT NULL,
	`responses` json,
	`score` decimal(5,2),
	`risk_level` enum('bajo','medio','alto','muy_alto'),
	`status` enum('sent','completed','expired') NOT NULL DEFAULT 'sent',
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`expires_at` timestamp NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigation_questionnaires_id` PRIMARY KEY(`id`),
	CONSTRAINT `investigation_questionnaires_access_token_unique` UNIQUE(`access_token`)
);
--> statement-breakpoint
ALTER TABLE `investigation_questionnaires` ADD CONSTRAINT `investigation_questionnaires_case_id_nom035_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `nom035_cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investigation_questionnaires` ADD CONSTRAINT `investigation_questionnaires_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investigation_questionnaires` ADD CONSTRAINT `investigation_questionnaires_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;