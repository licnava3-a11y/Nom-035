CREATE TABLE `csrf_violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128),
	`user_id` varchar(64),
	`ip_address` varchar(45) NOT NULL,
	`user_agent` text,
	`endpoint` varchar(255),
	`method` varchar(10),
	`reason` enum('missing_token','invalid_token','expired_token','user_mismatch','malformed_token') NOT NULL,
	`attempted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `csrf_violations_id` PRIMARY KEY(`id`)
);
