CREATE TABLE `nom035_evidence_folder` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('policies','preventive_actions','corrective_actions','organizational_environment','training_program','surveys','cases','minutes','certificates','position_acceptance','photographic_evidence') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`document_type` varchar(100),
	`source_module` varchar(100),
	`source_id` int,
	`file_url` text NOT NULL,
	`file_key` varchar(500) NOT NULL,
	`file_size` int,
	`generated_date` date NOT NULL,
	`uploaded_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nom035_evidence_folder_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `nom035_evidence_folder` ADD CONSTRAINT `nom035_evidence_folder_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;