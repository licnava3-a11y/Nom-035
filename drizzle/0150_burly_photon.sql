CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`razon_social` varchar(255) NOT NULL,
	`rfc` varchar(13) NOT NULL,
	`direccion_fiscal` text,
	`giro` varchar(255),
	`actividades_preponderantes` text,
	`numero_trabajadores` int,
	`representante_legal` varchar(255),
	`telefono_contacto` varchar(20),
	`email_contacto` varchar(320),
	`pagina_web` varchar(255),
	`logo_url` varchar(512),
	`logo_key` varchar(512),
	`plan` enum('trial','basic','professional','enterprise') NOT NULL DEFAULT 'trial',
	`status` enum('active','suspended','cancelled') NOT NULL DEFAULT 'active',
	`trial_ends_at` timestamp,
	`conflict_threshold` decimal(5,2) DEFAULT '30.00',
	`notification_email` varchar(320),
	`noreply_email` varchar(320),
	`internal_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_rfc_unique` UNIQUE(`rfc`)
);
--> statement-breakpoint
CREATE TABLE `vacation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`return_date` date NOT NULL,
	`requested_days` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approved_by` int,
	`approved_at` timestamp,
	`rejection_reason` text,
	`notes` text,
	`available_days_at_request` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vacation_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vacation_seniority` (
	`id` int AUTO_INCREMENT NOT NULL,
	`years_min` int NOT NULL,
	`years_max` int,
	`vacation_days` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vacation_seniority_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','instructor','student','committee','committee_member','committee_coordinator','administrativo','director','responsable_nom035','gerente','rh','supervisor','jefe_area','empleado','auxiliar_rh','recursos_humanos','demo') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `job_openings` ADD `minimum_education` enum('primaria','secundaria','preparatoria','tecnico','licenciatura','especialidad','maestria','doctorado');--> statement-breakpoint
ALTER TABLE `users` ADD `company_id` int;--> statement-breakpoint
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;