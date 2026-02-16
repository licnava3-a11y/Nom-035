CREATE TABLE `action_evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`file_url` varchar(500) NOT NULL,
	`file_type` varchar(50) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`uploaded_by` int NOT NULL,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `action_evidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corrective_action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`origin_type` enum('root_cause_analysis','intelligent_alert','manual_case','recommendation') NOT NULL,
	`origin_id` int,
	`status` enum('draft','assigned','in_progress','completed','verified','closed') NOT NULL DEFAULT 'draft',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`assigned_to` int,
	`verified_by` int,
	`created_by` int NOT NULL,
	`due_date` timestamp NOT NULL,
	`completed_at` timestamp,
	`verified_at` timestamp,
	`closed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`responsible_signature` text,
	`verifier_signature` text,
	`verification_code` varchar(100),
	`effectiveness_score` int,
	`notes` text,
	CONSTRAINT `corrective_action_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `action_evidences` ADD CONSTRAINT `action_evidences_plan_id_corrective_action_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `corrective_action_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `action_evidences` ADD CONSTRAINT `action_evidences_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `corrective_action_plans` ADD CONSTRAINT `corrective_action_plans_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `corrective_action_plans` ADD CONSTRAINT `corrective_action_plans_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `corrective_action_plans` ADD CONSTRAINT `corrective_action_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;