CREATE TABLE `job_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_name` varchar(100) NOT NULL,
	`status` enum('running','success','failed') NOT NULL,
	`started_at` timestamp NOT NULL,
	`completed_at` timestamp,
	`duration` int,
	`result` json,
	`error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_executions_id` PRIMARY KEY(`id`)
);
