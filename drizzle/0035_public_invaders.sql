CREATE TABLE `protocol_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`phase` enum('recepcion','evaluacion_inicial','medidas_cautelares','investigacion','resolucion','seguimiento','cerrado') NOT NULL,
	`action` text NOT NULL,
	`responsible_id` int NOT NULL,
	`action_date` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`attachments` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workplace_violence_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`complainant_id` int,
	`complainant_name` varchar(255),
	`accused_id` int NOT NULL,
	`complaint_date` date NOT NULL,
	`incident_date` date,
	`description` text NOT NULL,
	`evidence_files` json,
	`witnesses` json,
	`current_phase` enum('recepcion','evaluacion_inicial','medidas_cautelares','investigacion','resolucion','seguimiento','cerrado') NOT NULL DEFAULT 'recepcion',
	`priority` enum('baja','media','alta','critica') NOT NULL DEFAULT 'media',
	`status` enum('activo','suspendido','cerrado') NOT NULL DEFAULT 'activo',
	`resolution` text,
	`resolution_date` date,
	`assigned_to_id` int,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workplace_violence_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `workplace_violence_cases_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
ALTER TABLE `protocol_steps` ADD CONSTRAINT `protocol_steps_case_id_workplace_violence_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `workplace_violence_cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_steps` ADD CONSTRAINT `protocol_steps_responsible_id_users_id_fk` FOREIGN KEY (`responsible_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workplace_violence_cases` ADD CONSTRAINT `workplace_violence_cases_complainant_id_employees_id_fk` FOREIGN KEY (`complainant_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workplace_violence_cases` ADD CONSTRAINT `workplace_violence_cases_accused_id_employees_id_fk` FOREIGN KEY (`accused_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workplace_violence_cases` ADD CONSTRAINT `workplace_violence_cases_assigned_to_id_users_id_fk` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workplace_violence_cases` ADD CONSTRAINT `workplace_violence_cases_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;