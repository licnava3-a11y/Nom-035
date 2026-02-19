CREATE TABLE `committee_operating_rules_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operating_rule_id` int NOT NULL,
	`version_number` int NOT NULL,
	`version` varchar(10) NOT NULL,
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
	`effective_date` date NOT NULL,
	`review_date` date,
	`next_review_date` date,
	`change_description` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_operating_rules_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `committee_operating_rules_versions` ADD CONSTRAINT `committee_operating_rules_versions_operating_rule_id_committee_operating_rules_id_fk` FOREIGN KEY (`operating_rule_id`) REFERENCES `committee_operating_rules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_operating_rules_versions` ADD CONSTRAINT `committee_operating_rules_versions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;