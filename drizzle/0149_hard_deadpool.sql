CREATE TABLE `contract_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`contract_number` enum('1','2','3') NOT NULL,
	`signer_name` varchar(255) NOT NULL,
	`signer_role` varchar(100),
	`signature_image_url` text NOT NULL,
	`signature_hash` varchar(64),
	`ip_address` varchar(45),
	`device_info` text,
	`server_timestamp` bigint NOT NULL,
	`signed_at` timestamp NOT NULL DEFAULT (now()),
	`signed_by` int,
	CONSTRAINT `contract_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contract_signatures` ADD CONSTRAINT `contract_signatures_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_signatures` ADD CONSTRAINT `contract_signatures_signed_by_users_id_fk` FOREIGN KEY (`signed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;