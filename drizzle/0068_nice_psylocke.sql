CREATE TABLE `survey_anonymous_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`survey_type` varchar(50) NOT NULL,
	`department` varchar(255),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`is_revoked` boolean NOT NULL DEFAULT false,
	`generated_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_anonymous_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `survey_anonymous_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `survey_anonymous_tokens` ADD CONSTRAINT `survey_anonymous_tokens_generated_by_users_id_fk` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;