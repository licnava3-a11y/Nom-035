CREATE TABLE `candidate_references` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`position` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`phone` varchar(15) NOT NULL,
	`email` varchar(320),
	`relationship` varchar(100),
	`verified` boolean NOT NULL DEFAULT false,
	`verified_at` timestamp,
	`verified_by` int,
	`verification_notes` text,
	`reference_score` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `candidate_references_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidate_work_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_id` int NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`position` varchar(255) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date,
	`is_current` boolean NOT NULL DEFAULT false,
	`responsibilities` text,
	`reason_for_leaving` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `candidate_work_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_opening_id` int NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(15) NOT NULL,
	`curp` varchar(18) NOT NULL,
	`birth_date` date,
	`gender` enum('Masculino','Femenino'),
	`birth_state` varchar(100),
	`age` int,
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`postal_code` varchar(10),
	`education` varchar(255),
	`field_of_study` varchar(255),
	`arco_accepted` boolean NOT NULL DEFAULT false,
	`arco_accepted_at` timestamp,
	`verification_authorized` boolean NOT NULL DEFAULT false,
	`verification_authorized_at` timestamp,
	`status` enum('new','reviewing','interview','offer','hired','rejected') NOT NULL DEFAULT 'new',
	`hiring_score` int,
	`recruiter_notes` text,
	`resume_url` varchar(500),
	`applied_at` timestamp NOT NULL DEFAULT (now()),
	`reviewed_at` timestamp,
	`interviewed_at` timestamp,
	`hired_at` timestamp,
	`rejected_at` timestamp,
	`employee_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_terminations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`termination_date` date NOT NULL,
	`termination_reason` enum('resignation','dismissal','retirement','contract_end','mutual_agreement','death','other') NOT NULL,
	`termination_reason_details` text,
	`notice_given` boolean NOT NULL DEFAULT false,
	`notice_period_days` int,
	`final_work_date` date,
	`severance_payment` decimal(10,2),
	`notes` text,
	`document_urls` json,
	`processed_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_terminations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exit_interview_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_text` text NOT NULL,
	`question_type` enum('multiple_choice','text') NOT NULL DEFAULT 'multiple_choice',
	`options` json,
	`category` varchar(100),
	`order` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exit_interview_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exit_interview_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exit_interview_id` int NOT NULL,
	`question_id` int NOT NULL,
	`response` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exit_interview_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exit_interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`termination_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`additional_comments` text,
	`is_confidential` boolean NOT NULL DEFAULT true,
	`status` enum('pending','completed') NOT NULL DEFAULT 'pending',
	`completed_at` timestamp,
	`conducted_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exit_interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_openings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`department_id` int,
	`position_id` int,
	`requirements` text,
	`responsibilities` text,
	`salary_range` varchar(100),
	`location` varchar(255),
	`employment_type` enum('permanent','temporary','contract','internship') NOT NULL DEFAULT 'permanent',
	`status` enum('draft','open','closed','filled') NOT NULL DEFAULT 'draft',
	`open_date` date,
	`close_date` date,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_openings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `turnover_action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`primary_causes` json,
	`proposed_actions` json,
	`analysis_start_date` date NOT NULL,
	`analysis_end_date` date NOT NULL,
	`status` enum('draft','approved','in_progress','completed') NOT NULL DEFAULT 'draft',
	`assigned_to` int,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `turnover_action_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `candidate_references` ADD CONSTRAINT `candidate_references_candidate_id_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_references` ADD CONSTRAINT `candidate_references_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_work_history` ADD CONSTRAINT `candidate_work_history_candidate_id_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_job_opening_id_job_openings_id_fk` FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_terminations` ADD CONSTRAINT `employee_terminations_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_terminations` ADD CONSTRAINT `employee_terminations_processed_by_users_id_fk` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exit_interview_responses` ADD CONSTRAINT `exit_responses_interview_fk` FOREIGN KEY (`exit_interview_id`) REFERENCES `exit_interviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exit_interview_responses` ADD CONSTRAINT `exit_responses_question_fk` FOREIGN KEY (`question_id`) REFERENCES `exit_interview_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exit_interviews` ADD CONSTRAINT `exit_interviews_termination_id_employee_terminations_id_fk` FOREIGN KEY (`termination_id`) REFERENCES `employee_terminations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exit_interviews` ADD CONSTRAINT `exit_interviews_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exit_interviews` ADD CONSTRAINT `exit_interviews_conducted_by_users_id_fk` FOREIGN KEY (`conducted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_openings` ADD CONSTRAINT `job_openings_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_openings` ADD CONSTRAINT `job_openings_position_id_jobPositions_id_fk` FOREIGN KEY (`position_id`) REFERENCES `jobPositions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_openings` ADD CONSTRAINT `job_openings_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `turnover_action_plans` ADD CONSTRAINT `turnover_action_plans_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `turnover_action_plans` ADD CONSTRAINT `turnover_action_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;