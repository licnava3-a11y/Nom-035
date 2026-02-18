CREATE TABLE `model_performance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` varchar(50) NOT NULL,
	`metric_name` varchar(50) NOT NULL,
	`current_value` decimal(5,2) NOT NULL,
	`threshold_value` decimal(5,2) NOT NULL,
	`severity` varchar(20) NOT NULL,
	`message` text NOT NULL,
	`recommendation` text,
	`is_resolved` boolean NOT NULL DEFAULT false,
	`resolved_at` timestamp,
	`resolved_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `model_performance_alerts_id` PRIMARY KEY(`id`)
);
