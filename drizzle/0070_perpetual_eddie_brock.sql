CREATE TABLE `nine_box_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`performance_score` int NOT NULL,
	`potential_score` int NOT NULL,
	`quadrant` varchar(50) NOT NULL,
	`assessment_date` date NOT NULL,
	`assessed_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nine_box_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `nine_box_assessments` ADD CONSTRAINT `nine_box_assessments_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nine_box_assessments` ADD CONSTRAINT `nine_box_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;