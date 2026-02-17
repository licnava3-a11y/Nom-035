CREATE TABLE `predictive_turnover_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department_id` int NOT NULL,
	`department_name` varchar(255) NOT NULL,
	`risk_score` int NOT NULL,
	`current_employee_count` int NOT NULL,
	`hires_last_3_months` int NOT NULL,
	`terminations_last_3_months` int NOT NULL,
	`avg_tenure_months` decimal(10,2),
	`predicted_turnover_rate` decimal(5,2),
	`recommended_actions` text,
	`status` varchar(50) DEFAULT 'active',
	`analyzed_at` timestamp DEFAULT (now()),
	`resolved_at` timestamp,
	`notifications_sent` int DEFAULT 0,
	`last_notification_at` timestamp,
	CONSTRAINT `predictive_turnover_alerts_id` PRIMARY KEY(`id`)
);
