ALTER TABLE `post_case_surveys` ADD `survey_token` varchar(64);--> statement-breakpoint
ALTER TABLE `post_case_surveys` ADD `reminder_sent_at` bigint;--> statement-breakpoint
ALTER TABLE `smtp_config` ADD `email_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);