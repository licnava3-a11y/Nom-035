CREATE TABLE `operating_rules_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operating_rule_id` int NOT NULL,
	`approver_id` int NOT NULL,
	`approver_role` enum('president','secretary','vocal','other') NOT NULL,
	`approver_role_description` varchar(100),
	`status` enum('pending','signed','rejected') NOT NULL DEFAULT 'pending',
	`signature_data` text,
	`signature_method` enum('digital_pad','uploaded','certificate') DEFAULT 'digital_pad',
	`comments` text,
	`signed_at` timestamp,
	`approval_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operating_rules_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `operating_rules_approvals` ADD CONSTRAINT `operating_rules_approvals_operating_rule_id_committee_operating_rules_id_fk` FOREIGN KEY (`operating_rule_id`) REFERENCES `committee_operating_rules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operating_rules_approvals` ADD CONSTRAINT `operating_rules_approvals_approver_id_users_id_fk` FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;