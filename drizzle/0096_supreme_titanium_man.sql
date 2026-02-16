CREATE TABLE `shared_reports_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_url` text NOT NULL,
	`report_type` enum('pdf','excel') NOT NULL,
	`report_category` varchar(100) NOT NULL,
	`share_channel` enum('email','linkedin','twitter','whatsapp','other') NOT NULL,
	`recipients` json,
	`recipient_count` int DEFAULT 0,
	`email_subject` text,
	`email_message` text,
	`shared_by` int NOT NULL,
	`shared_by_name` varchar(255),
	`shared_by_email` varchar(320),
	`applied_filters` json,
	`view_count` int DEFAULT 0,
	`download_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `shared_reports_log_id` PRIMARY KEY(`id`)
);
