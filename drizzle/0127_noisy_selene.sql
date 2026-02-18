CREATE TABLE `csrf_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`violation_count` int NOT NULL,
	`first_attempt` timestamp NOT NULL,
	`last_attempt` timestamp NOT NULL,
	`affected_endpoints` json NOT NULL,
	`status` enum('pending','investigating','resolved','false_positive') NOT NULL DEFAULT 'pending',
	`action_taken` text,
	`resolved_by` varchar(64),
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrf_alerts_id` PRIMARY KEY(`id`)
);
