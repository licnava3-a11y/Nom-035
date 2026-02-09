CREATE TABLE `committee_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`committee_member_id` int NOT NULL,
	`attended` boolean NOT NULL DEFAULT false,
	`attended_at` timestamp,
	`certificate_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('protocolo_violencia','factores_riesgo','medidas_prevencion','otro') NOT NULL,
	`duration` int NOT NULL,
	`instructor` varchar(255),
	`status` enum('activo','completado','cancelado') NOT NULL DEFAULT 'activo',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `committee_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`session_date` date NOT NULL,
	`session_time` varchar(10) NOT NULL,
	`location` varchar(255),
	`type` enum('presencial','en_linea') NOT NULL,
	`meeting_link` varchar(500),
	`status` enum('programada','en_curso','completada','cancelada') NOT NULL DEFAULT 'programada',
	`attendance_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `committee_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`code` varchar(50),
	`managerId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `employeeHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`curp` varchar(18) NOT NULL,
	`eventType` enum('hire','termination','reentry') NOT NULL,
	`eventDate` date NOT NULL,
	`terminationReason` enum('resignation','dismissal','retirement','contract_end','death','abandonment','mutual_agreement','other'),
	`terminationCategory` enum('voluntary','involuntary','legal'),
	`terminationNotes` text,
	`evidenceUrls` json,
	`processedBy` int,
	`departmentId` int,
	`positionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employeeHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`code` varchar(50),
	`departmentId` int,
	`level` enum('executive','management','supervisor','specialist','entry'),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
DROP TABLE `committee_training_attendance`;--> statement-breakpoint
DROP TABLE `committee_training_programs`;--> statement-breakpoint
DROP TABLE `committee_training_sessions`;--> statement-breakpoint
ALTER TABLE `employees` ADD `departmentId` int;--> statement-breakpoint
ALTER TABLE `employees` ADD `positionId` int;--> statement-breakpoint
ALTER TABLE `employees` ADD `reentryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `previousHireDates` json;--> statement-breakpoint
ALTER TABLE `committee_attendance` ADD CONSTRAINT `committee_attendance_session_id_committee_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `committee_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_attendance` ADD CONSTRAINT `committee_attendance_committee_member_id_committeeMembers_id_fk` FOREIGN KEY (`committee_member_id`) REFERENCES `committeeMembers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_programs` ADD CONSTRAINT `committee_programs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `committee_sessions` ADD CONSTRAINT `committee_sessions_program_id_committee_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `committee_programs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employeeHistory` ADD CONSTRAINT `employeeHistory_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employeeHistory` ADD CONSTRAINT `employeeHistory_processedBy_users_id_fk` FOREIGN KEY (`processedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employeeHistory` ADD CONSTRAINT `employeeHistory_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employeeHistory` ADD CONSTRAINT `employeeHistory_positionId_positions_id_fk` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `positions` ADD CONSTRAINT `positions_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_positionId_positions_id_fk` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;