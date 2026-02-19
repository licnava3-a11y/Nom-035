CREATE TABLE `nine_box_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`performance_score` int NOT NULL,
	`potential_score` int NOT NULL,
	`quadrant` int NOT NULL,
	`quadrant_label` varchar(50) NOT NULL,
	`development_plan` text,
	`evaluation_date` date NOT NULL,
	`evaluated_by` int NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nine_box_evaluations_id` PRIMARY KEY(`id`)
);
