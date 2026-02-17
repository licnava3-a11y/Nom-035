CREATE TABLE `predictive_algorithm_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_name` varchar(255) NOT NULL DEFAULT 'default',
	`rotation_weight` int NOT NULL DEFAULT 40,
	`tenure_weight` int NOT NULL DEFAULT 30,
	`manager_weight` int NOT NULL DEFAULT 20,
	`team_size_weight` int NOT NULL DEFAULT 10,
	`low_risk_threshold` int NOT NULL DEFAULT 30,
	`medium_risk_threshold` int NOT NULL DEFAULT 60,
	`high_risk_threshold` int NOT NULL DEFAULT 100,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	`is_active` boolean DEFAULT true,
	CONSTRAINT `predictive_algorithm_config_id` PRIMARY KEY(`id`)
);
