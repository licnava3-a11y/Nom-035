CREATE TABLE `alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` enum('critical_cases','low_coverage','excellent_compliance') NOT NULL,
	`threshold` int NOT NULL,
	`description` text,
	`updated_by` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_thresholds_id` PRIMARY KEY(`id`),
	CONSTRAINT `alert_thresholds_alert_type_unique` UNIQUE(`alert_type`)
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_id` int NOT NULL,
	`alert_type` enum('critical_cases','low_coverage','excellent_compliance') NOT NULL,
	`priority` enum('info','warning','critical') NOT NULL,
	`description` text NOT NULL,
	`current_value` int NOT NULL,
	`threshold` int NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alert_thresholds` ADD CONSTRAINT `alert_thresholds_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_history` ADD CONSTRAINT `notification_history_alert_id_alert_history_id_fk` FOREIGN KEY (`alert_id`) REFERENCES `alert_history`(`id`) ON DELETE no action ON UPDATE no action;