CREATE TABLE `intelligent_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` enum('case_surge','training_satisfaction_drop','pending_recommendations','department_risk','compliance_issue','other') NOT NULL,
	`severity` enum('critical','high','medium','low') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`context` json NOT NULL,
	`suggestions` json NOT NULL,
	`status` enum('active','resolved','dismissed') NOT NULL DEFAULT 'active',
	`assigned_to` int,
	`resolution_notes` text,
	`resolved_at` timestamp,
	`resolved_by` int,
	`effectiveness_score` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intelligent_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `intelligent_alerts` ADD CONSTRAINT `intelligent_alerts_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `intelligent_alerts` ADD CONSTRAINT `intelligent_alerts_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;