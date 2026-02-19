CREATE TABLE `committee_annual_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio_number` int NOT NULL,
	`folio_year` int NOT NULL,
	`folio_code` varchar(20) NOT NULL DEFAULT 'ARF',
	`folio_version` varchar(10) NOT NULL DEFAULT '1.0',
	`report_year` int NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`executive_summary` text NOT NULL,
	`activities` text NOT NULL,
	`metrics` text NOT NULL,
	`trainings` text NOT NULL,
	`cases_handled` text NOT NULL,
	`compliance_metrics` text NOT NULL,
	`recommendations` text NOT NULL,
	`action_plan` text NOT NULL,
	`attachments` text,
	`signatures` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`created_by` int NOT NULL,
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `committee_annual_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_operating_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(10) NOT NULL,
	`folio_code` varchar(20) NOT NULL DEFAULT 'BFC',
	`effective_date` date NOT NULL,
	`review_date` date,
	`next_review_date` date,
	`objectives` text NOT NULL,
	`structure` text NOT NULL,
	`roles` text NOT NULL,
	`meeting_frequency` text NOT NULL,
	`quorum` text NOT NULL,
	`decision_making` text NOT NULL,
	`communication` text NOT NULL,
	`case_handling` text NOT NULL,
	`confidentiality` text NOT NULL,
	`amendments` text,
	`signatures` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`created_by` int NOT NULL,
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `committee_operating_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `committee_annual_reports` ADD CONSTRAINT `committee_annual_reports_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_annual_reports` ADD CONSTRAINT `committee_annual_reports_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_operating_rules` ADD CONSTRAINT `committee_operating_rules_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_operating_rules` ADD CONSTRAINT `committee_operating_rules_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;