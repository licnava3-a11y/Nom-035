CREATE TABLE `user_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`alerts_enabled` boolean NOT NULL DEFAULT true,
	`reminders_enabled` boolean NOT NULL DEFAULT true,
	`reports_enabled` boolean NOT NULL DEFAULT true,
	`surveys_enabled` boolean NOT NULL DEFAULT true,
	`cases_enabled` boolean NOT NULL DEFAULT true,
	`corrective_actions_enabled` boolean NOT NULL DEFAULT true,
	`frequency` enum('immediate','daily','weekly') NOT NULL DEFAULT 'immediate',
	`daily_summary_enabled` boolean NOT NULL DEFAULT false,
	`daily_summary_time` varchar(5) DEFAULT '09:00',
	`email_enabled` boolean NOT NULL DEFAULT true,
	`in_app_enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_notification_preferences` ADD CONSTRAINT `user_notification_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;