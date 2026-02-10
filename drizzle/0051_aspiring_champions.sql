CREATE TABLE `document_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_id` int NOT NULL,
	`user_id` int,
	`user_name` varchar(255),
	`user_email` varchar(320),
	`action` enum('view','download','verify') NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_audit_log_id` PRIMARY KEY(`id`)
);
