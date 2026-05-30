CREATE TABLE `employee_portal_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`employee_id` int NOT NULL,
	`employee_email` varchar(320) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_portal_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `employee_portal_tokens_token_unique` UNIQUE(`token`)
);
