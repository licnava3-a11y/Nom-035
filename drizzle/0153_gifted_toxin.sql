CREATE TABLE `web_vitals_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metric_name` varchar(20) NOT NULL,
	`value` decimal(12,3) NOT NULL,
	`rating` enum('good','needs-improvement','poor') NOT NULL,
	`delta` decimal(12,3) NOT NULL DEFAULT '0',
	`metric_id` varchar(100) NOT NULL,
	`page` varchar(500) DEFAULT '/',
	`user_agent` varchar(500),
	`session_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `web_vitals_metrics_id` PRIMARY KEY(`id`)
);
