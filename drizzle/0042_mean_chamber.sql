CREATE TABLE `alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` enum('critical_cases','low_coverage','excellent_compliance') NOT NULL,
	`threshold` int NOT NULL,
	`current_value` int NOT NULL,
	`description` text NOT NULL,
	`status` enum('active','resolved') NOT NULL DEFAULT 'active',
	`triggered_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	`user_id` int,
	`notes` text,
	CONSTRAINT `alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alert_history` ADD CONSTRAINT `alert_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;