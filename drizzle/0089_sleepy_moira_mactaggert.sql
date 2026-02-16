CREATE TABLE `recommendations_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysis_id` int NOT NULL,
	`recommendation` text NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`category` varchar(100),
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`assigned_to` int,
	`due_date` date,
	`completion_date` date,
	`target_case_type` varchar(50),
	`target_department_id` int,
	`baseline_case_count` int,
	`current_case_count` int,
	`reduction_percentage` decimal(5,2),
	`notes` text,
	`evidence_urls` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendations_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `recommendations_tracking` ADD CONSTRAINT `recommendations_tracking_analysis_id_root_cause_analysis_id_fk` FOREIGN KEY (`analysis_id`) REFERENCES `root_cause_analysis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations_tracking` ADD CONSTRAINT `recommendations_tracking_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations_tracking` ADD CONSTRAINT `recommendations_tracking_target_department_id_departments_id_fk` FOREIGN KEY (`target_department_id`) REFERENCES `departments`(`id`) ON DELETE set null ON UPDATE no action;