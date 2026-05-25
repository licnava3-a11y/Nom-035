CREATE TABLE `job_execution_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_name` varchar(100) NOT NULL,
	`status` enum('success','error','skipped') NOT NULL DEFAULT 'success',
	`notifications_sent` int NOT NULL DEFAULT 0,
	`notifications_skipped` int NOT NULL DEFAULT 0,
	`items_processed` int NOT NULL DEFAULT 0,
	`duration_ms` int NOT NULL DEFAULT 0,
	`error_message` text,
	`metadata` json,
	`executed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_execution_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employees` ADD `branch_id` int;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;