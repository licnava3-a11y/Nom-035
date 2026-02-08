CREATE TABLE `committee_position_acceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`committee_member_id` int NOT NULL,
	`position_type` enum('president','secretary','vocal','alternate','advisor') NOT NULL,
	`ine_photo_url` text,
	`ine_photo_key` varchar(500),
	`acceptance_date` date NOT NULL,
	`signature_url` text,
	`signature_key` varchar(500),
	`pdf_url` text,
	`pdf_key` varchar(500),
	`responsibilities` text,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `committee_position_acceptances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `committee_position_acceptances` ADD CONSTRAINT `committee_position_acceptances_committee_member_id_committeeMembers_id_fk` FOREIGN KEY (`committee_member_id`) REFERENCES `committeeMembers`(`id`) ON DELETE no action ON UPDATE no action;