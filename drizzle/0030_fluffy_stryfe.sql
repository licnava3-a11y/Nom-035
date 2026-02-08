CREATE TABLE `nom035_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`employee_id` int NOT NULL,
	`survey_response_id` int,
	`risk_level` enum('nulo','bajo','medio','alto','muy_alto') NOT NULL,
	`risk_category` varchar(255),
	`description` text NOT NULL,
	`identified_date` date NOT NULL,
	`deadline` date NOT NULL,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`assigned_to` int,
	`intervention_plan` text,
	`follow_up_notes` text,
	`closed_at` timestamp,
	`closed_by` int,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nom035_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `nom035_cases_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
ALTER TABLE `nom035_cases` ADD CONSTRAINT `nom035_cases_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_cases` ADD CONSTRAINT `nom035_cases_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_cases` ADD CONSTRAINT `nom035_cases_closed_by_users_id_fk` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_cases` ADD CONSTRAINT `nom035_cases_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;