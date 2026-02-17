CREATE TABLE `department_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department_id` int,
	`critical_cases_threshold` int NOT NULL DEFAULT 5,
	`open_cases_threshold` int NOT NULL DEFAULT 10,
	`risk_score_threshold` int NOT NULL DEFAULT 70,
	`avg_resolution_days_threshold` int NOT NULL DEFAULT 30,
	`enable_alerts` boolean NOT NULL DEFAULT true,
	`alert_recipients` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `department_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `department_thresholds` ADD CONSTRAINT `department_thresholds_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE cascade ON UPDATE no action;