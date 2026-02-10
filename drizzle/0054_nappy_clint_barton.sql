CREATE TABLE `committee_minute_agenda_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minute_id` int NOT NULL,
	`order_index` int NOT NULL,
	`topic` varchar(255) NOT NULL,
	`description` text,
	`presenter` varchar(255),
	`duration` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_minute_agenda_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_minute_agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minute_id` int NOT NULL,
	`agreement_number` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`responsible_user_id` int,
	`responsible_name` varchar(255),
	`due_date` date,
	`status` enum('pendiente','en_proceso','completado','cancelado') NOT NULL DEFAULT 'pendiente',
	`priority` enum('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
	`notes` text,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `committee_minute_agreements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_minute_attendees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minute_id` int NOT NULL,
	`user_id` int,
	`name` varchar(255) NOT NULL,
	`position` varchar(255),
	`role` varchar(100),
	`photo_url` varchar(512),
	`photo_key` varchar(512),
	`signature_url` varchar(512),
	`signature_key` varchar(512),
	`attended` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_minute_attendees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_minute_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minute_id` int NOT NULL,
	`version` int NOT NULL,
	`snapshot` json NOT NULL,
	`changed_by` int NOT NULL,
	`change_description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_minute_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_minutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(100) NOT NULL,
	`session_number` int NOT NULL,
	`meeting_date` date NOT NULL,
	`meeting_time` varchar(10) NOT NULL,
	`meeting_place` varchar(255) NOT NULL,
	`meeting_type` enum('ordinaria','extraordinaria','urgente','seguimiento') NOT NULL DEFAULT 'ordinaria',
	`status` enum('borrador','finalizada','archivada') NOT NULL DEFAULT 'borrador',
	`objective` text,
	`results` text,
	`group_photo_url` varchar(512),
	`group_photo_key` varchar(512),
	`attendance_list_url` varchar(512),
	`attendance_list_key` varchar(512),
	`pdf_url` varchar(512),
	`pdf_key` varchar(512),
	`qr_code` varchar(255),
	`version` int NOT NULL DEFAULT 1,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`finalized_at` timestamp,
	CONSTRAINT `committee_minutes_id` PRIMARY KEY(`id`),
	CONSTRAINT `committee_minutes_folio_unique` UNIQUE(`folio`),
	CONSTRAINT `committee_minutes_qr_code_unique` UNIQUE(`qr_code`)
);
--> statement-breakpoint
ALTER TABLE `committee_minute_agenda_items` ADD CONSTRAINT `committee_minute_agenda_items_minute_id_committee_minutes_id_fk` FOREIGN KEY (`minute_id`) REFERENCES `committee_minutes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_minute_agreements` ADD CONSTRAINT `committee_minute_agreements_minute_id_committee_minutes_id_fk` FOREIGN KEY (`minute_id`) REFERENCES `committee_minutes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_minute_agreements` ADD CONSTRAINT `committee_minute_agreements_responsible_user_id_users_id_fk` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_minute_attendees` ADD CONSTRAINT `committee_minute_attendees_minute_id_committee_minutes_id_fk` FOREIGN KEY (`minute_id`) REFERENCES `committee_minutes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_minute_attendees` ADD CONSTRAINT `committee_minute_attendees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_minute_history` ADD CONSTRAINT `committee_minute_history_minute_id_committee_minutes_id_fk` FOREIGN KEY (`minute_id`) REFERENCES `committee_minutes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_minute_history` ADD CONSTRAINT `committee_minute_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_minutes` ADD CONSTRAINT `committee_minutes_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;