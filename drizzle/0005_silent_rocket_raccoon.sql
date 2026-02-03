CREATE TABLE `document_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`image_url` text NOT NULL,
	`description` text,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`user_id` int,
	`name` varchar(255) NOT NULL,
	`curp` varchar(18),
	`ine` varchar(20),
	`role` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`format_catalog_id` int NOT NULL,
	`folio` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`content` text,
	`pdf_url` text,
	`qr_code` varchar(255),
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`finalized_at` timestamp,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_folio_unique` UNIQUE(`folio`),
	CONSTRAINT `documents_qr_code_unique` UNIQUE(`qr_code`)
);
--> statement-breakpoint
CREATE TABLE `format_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`version` varchar(20) NOT NULL,
	`version_date` date NOT NULL,
	`reference` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `format_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `format_catalog_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`user_id` int,
	`signer_name` varchar(255) NOT NULL,
	`signer_role` varchar(100),
	`signature_image_url` text NOT NULL,
	`signed_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45),
	`device_info` text,
	CONSTRAINT `signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `committeeMembers` MODIFY COLUMN `employeeId` int;--> statement-breakpoint
ALTER TABLE `document_evidence` ADD CONSTRAINT `document_evidence_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_participants` ADD CONSTRAINT `document_participants_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_participants` ADD CONSTRAINT `document_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_format_catalog_id_format_catalog_id_fk` FOREIGN KEY (`format_catalog_id`) REFERENCES `format_catalog`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signatures` ADD CONSTRAINT `signatures_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signatures` ADD CONSTRAINT `signatures_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;