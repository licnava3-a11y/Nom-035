CREATE TABLE `career_paths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path_name` varchar(255) NOT NULL,
	`description` text,
	`positions` json NOT NULL,
	`minimum_education` varchar(100),
	`minimum_experience` int,
	`is_active` boolean DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `career_paths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_career_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`path_id` int NOT NULL,
	`current_level` int NOT NULL,
	`target_level` int NOT NULL,
	`competency_gaps` json,
	`milestones` json,
	`projected_vacancies` json,
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_career_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employee_career_plans` ADD CONSTRAINT `employee_career_plans_path_id_career_paths_id_fk` FOREIGN KEY (`path_id`) REFERENCES `career_paths`(`id`) ON DELETE no action ON UPDATE no action;