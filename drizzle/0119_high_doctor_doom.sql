CREATE TABLE `compensation_reports_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_date` timestamp NOT NULL DEFAULT (now()),
	`generated_by` int NOT NULL,
	`total_employees` int NOT NULL,
	`critical_gaps` int NOT NULL,
	`high_risk_count` int NOT NULL,
	`total_adjustment_cost` decimal(12,2),
	`pdf_url` text NOT NULL,
	`pdf_key` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compensation_reports_history_id` PRIMARY KEY(`id`)
);
