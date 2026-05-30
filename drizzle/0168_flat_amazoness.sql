CREATE TABLE `dc1_sirce_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`course_id` int NOT NULL,
	`file_type` enum('dc1','sirce') NOT NULL,
	`filename` varchar(255) NOT NULL,
	`file_content` text NOT NULL,
	`file_size` int,
	`mime_type` varchar(100) NOT NULL DEFAULT 'text/html',
	`generated_by` int NOT NULL,
	`download_count` int DEFAULT 0,
	`last_downloaded_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dc1_sirce_history_id` PRIMARY KEY(`id`)
);
