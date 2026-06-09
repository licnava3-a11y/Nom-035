CREATE TABLE `dc3_remote_sign_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dc3_record_id` int NOT NULL,
	`role` enum('instructor','employer','workerRep') NOT NULL,
	`token` varchar(36) NOT NULL,
	`signer_name` varchar(255),
	`signer_email` varchar(255),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dc3_remote_sign_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `dc3_remote_sign_tokens_token_unique` UNIQUE(`token`)
);
