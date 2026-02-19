CREATE TABLE `approval_calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approval_id` int NOT NULL,
	`event_date` timestamp NOT NULL,
	`event_type` enum('deadline','reminder') NOT NULL,
	`notified` boolean NOT NULL DEFAULT false,
	`notified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `approval_calendar_events` ADD CONSTRAINT `approval_calendar_events_approval_id_operating_rules_approvals_id_fk` FOREIGN KEY (`approval_id`) REFERENCES `operating_rules_approvals`(`id`) ON DELETE cascade ON UPDATE no action;