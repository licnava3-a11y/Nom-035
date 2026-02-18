CREATE TABLE `employee_turnover_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`exit_date` timestamp NOT NULL,
	`exit_reason` varchar(100),
	`was_high_risk` boolean NOT NULL DEFAULT false,
	`risk_score_at_exit` int,
	`comments` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_turnover_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employee_turnover_history` ADD CONSTRAINT `employee_turnover_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;