CREATE TABLE `root_cause_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysis_date` timestamp NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`total_cases_analyzed` int NOT NULL,
	`root_causes` json NOT NULL,
	`patterns` json NOT NULL,
	`correlations` json,
	`recommendations` json NOT NULL,
	`department_insights` json,
	`llm_model` varchar(100),
	`analysis_status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `root_cause_analysis_id` PRIMARY KEY(`id`)
);
