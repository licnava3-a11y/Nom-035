CREATE TABLE `annual_training_plan_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` int NOT NULL,
	`course_name` varchar(255) NOT NULL,
	`course_id` int,
	`objective` text,
	`target_audience` varchar(255),
	`modality` enum('presencial','virtual','mixta','e_learning') NOT NULL DEFAULT 'presencial',
	`duration_hours` int,
	`planned_date` date,
	`completed_date` date,
	`instructor` varchar(255),
	`estimated_cost` int,
	`actual_cost` int,
	`participants_target` int,
	`participants_actual` int,
	`normative_reference` varchar(100),
	`status` enum('pendiente','en_proceso','completado','cancelado') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `annual_training_plan_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `annual_training_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`department_id` int,
	`responsible_id` int,
	`status` enum('borrador','aprobado','en_ejecucion','cerrado') NOT NULL DEFAULT 'borrador',
	`total_budget` int,
	`approved_at` timestamp,
	`approved_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `annual_training_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bug_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reported_by` int,
	`title` varchar(300) NOT NULL,
	`description` text NOT NULL,
	`steps_to_reproduce` text,
	`severity` enum('critico','alto','medio','bajo') NOT NULL DEFAULT 'medio',
	`status` enum('pendiente','en_revision','corregido','descartado') NOT NULL DEFAULT 'pendiente',
	`module` varchar(100),
	`resolution` text,
	`resolved_by` int,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bug_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int,
	`company_name` varchar(200),
	`visitor_user_id` int,
	`page` varchar(300) NOT NULL,
	`session_id` varchar(100),
	`user_agent` varchar(500),
	`visited_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requested_by` int,
	`title` varchar(300) NOT NULL,
	`description` text NOT NULL,
	`justification` text,
	`priority` enum('baja','normal','alta','critica') NOT NULL DEFAULT 'normal',
	`status` enum('pendiente','aprobada','en_desarrollo','implementada','descartada') NOT NULL DEFAULT 'pendiente',
	`module` varchar(100),
	`implementation_notes` text,
	`implemented_by` int,
	`implemented_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `internal_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int,
	`sender_id` int,
	`assigned_to` int,
	`category` varchar(30) NOT NULL DEFAULT 'sugerencia',
	`subject` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'nuevo',
	`priority` varchar(10) NOT NULL DEFAULT 'normal',
	`is_anonymous` boolean DEFAULT false,
	`response_body` text,
	`responded_by` int,
	`responded_at` timestamp,
	`response_read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `internal_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `psychometric_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`assessed_by` int,
	`company_id` int,
	`answers` json NOT NULL,
	`score_work_conditions` int DEFAULT 0,
	`score_workload` int DEFAULT 0,
	`score_lack_control` int DEFAULT 0,
	`score_workday_hours` int DEFAULT 0,
	`score_interference` int DEFAULT 0,
	`score_leadership` int DEFAULT 0,
	`score_relationships` int DEFAULT 0,
	`score_violence` int DEFAULT 0,
	`score_total` int DEFAULT 0,
	`risk_level` varchar(20) DEFAULT 'null',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `psychometric_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terms_acceptance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`version` varchar(20) NOT NULL DEFAULT '1.0',
	`accepted_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `terms_acceptance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `company_general_data` ADD `conflict_threshold` decimal(5,2) DEFAULT '30.00';--> statement-breakpoint
ALTER TABLE `annual_training_plan_items` ADD CONSTRAINT `annual_training_plan_items_plan_id_annual_training_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `annual_training_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annual_training_plan_items` ADD CONSTRAINT `annual_training_plan_items_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annual_training_plans` ADD CONSTRAINT `annual_training_plans_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annual_training_plans` ADD CONSTRAINT `annual_training_plans_responsible_id_employees_id_fk` FOREIGN KEY (`responsible_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annual_training_plans` ADD CONSTRAINT `annual_training_plans_approved_by_employees_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_messages` ADD CONSTRAINT `internal_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_messages` ADD CONSTRAINT `internal_messages_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_messages` ADD CONSTRAINT `internal_messages_responded_by_users_id_fk` FOREIGN KEY (`responded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `psychometric_assessments` ADD CONSTRAINT `psychometric_assessments_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `psychometric_assessments` ADD CONSTRAINT `psychometric_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terms_acceptance` ADD CONSTRAINT `terms_acceptance_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;