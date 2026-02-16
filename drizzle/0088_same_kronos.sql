CREATE TABLE `committee_trainings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('mobbing','burnout','primeros_auxilios_psicologicos','nom035','investigacion','otro') NOT NULL,
	`duration` int NOT NULL,
	`validity_months` int,
	`is_required` boolean NOT NULL DEFAULT true,
	`target_roles` json,
	`content` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `committee_trainings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`training_id` int NOT NULL,
	`committee_member_id` int NOT NULL,
	`assigned_date` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','in_progress','completed','expired') NOT NULL DEFAULT 'pending',
	`start_date` timestamp,
	`completion_date` timestamp,
	`score` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `training_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`certificate_number` varchar(50) NOT NULL,
	`issue_date` date NOT NULL,
	`expiry_date` date,
	`pdf_url` text NOT NULL,
	`verification_code` varchar(100) NOT NULL,
	`signed_by` varchar(255),
	`signer_title` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `training_certificates_certificate_number_unique` UNIQUE(`certificate_number`),
	CONSTRAINT `training_certificates_verification_code_unique` UNIQUE(`verification_code`)
);
--> statement-breakpoint
ALTER TABLE `training_assignments` ADD CONSTRAINT `training_assignments_training_id_committee_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `committee_trainings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_assignments` ADD CONSTRAINT `training_assignments_committee_member_id_users_id_fk` FOREIGN KEY (`committee_member_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_certificates` ADD CONSTRAINT `training_certificates_assignment_id_training_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `training_assignments`(`id`) ON DELETE cascade ON UPDATE no action;