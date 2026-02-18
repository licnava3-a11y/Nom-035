CREATE TABLE `equity_reports_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysis_id` int NOT NULL,
	`report_url` varchar(512) NOT NULL,
	`report_key` varchar(512) NOT NULL,
	`generated_by` int NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equity_reports_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_equity_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysis_date` timestamp NOT NULL DEFAULT (now()),
	`analyzed_by` int NOT NULL,
	`male_average_salary` decimal(12,2),
	`female_average_salary` decimal(12,2),
	`gender_pay_gap_percentage` decimal(5,2),
	`gender_equity_score` int DEFAULT 0,
	`age_group_analysis` json,
	`age_equity_score` int DEFAULT 0,
	`tenure_group_analysis` json,
	`tenure_equity_score` int DEFAULT 0,
	`critical_cases` json,
	`global_equity_index` int DEFAULT 0,
	`nmx_compliance_status` varchar(50) DEFAULT 'non_compliant',
	`compliance_score` int DEFAULT 0,
	`recommendations` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salary_equity_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `equity_reports_history` ADD CONSTRAINT `equity_reports_history_analysis_id_salary_equity_analysis_id_fk` FOREIGN KEY (`analysis_id`) REFERENCES `salary_equity_analysis`(`id`) ON DELETE no action ON UPDATE no action;