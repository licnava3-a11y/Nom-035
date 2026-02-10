CREATE TABLE `security_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` enum('multiple_downloads','unknown_ip','off_hours','suspicious_pattern') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`user_id` int,
	`user_name` varchar(255),
	`report_id` int,
	`ip_address` varchar(45),
	`description` text NOT NULL,
	`metadata` json,
	`status` enum('pending','reviewed','resolved','false_positive') NOT NULL DEFAULT 'pending',
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_alerts_id` PRIMARY KEY(`id`)
);
