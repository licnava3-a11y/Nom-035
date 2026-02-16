CREATE TABLE `training_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`training_id` int NOT NULL,
	`instructor_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`materials_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`facilities_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`labor_hours_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`other_costs` decimal(10,2) NOT NULL DEFAULT '0.00',
	`total_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `training_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `training_costs` ADD CONSTRAINT `training_costs_training_id_committee_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `committee_trainings`(`id`) ON DELETE cascade ON UPDATE no action;