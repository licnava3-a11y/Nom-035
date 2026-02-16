CREATE TABLE `report_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_type` enum('intervention_impact_pdf','intervention_impact_excel','shared_reports_excel') NOT NULL,
	`params_hash` varchar(32) NOT NULL,
	`params` json,
	`report_url` text NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int,
	`generated_by` int NOT NULL,
	`generated_by_name` varchar(255),
	`hit_count` int DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`last_accessed_at` timestamp DEFAULT (now()),
	CONSTRAINT `report_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_cache_params_hash_unique` UNIQUE(`params_hash`)
);
