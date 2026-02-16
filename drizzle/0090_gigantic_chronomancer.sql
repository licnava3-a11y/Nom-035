CREATE TABLE `training_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`evaluator_id` int NOT NULL,
	`instructor_knowledge` int NOT NULL,
	`instructor_communication` int NOT NULL,
	`instructor_engagement` int NOT NULL,
	`content_relevance` int NOT NULL,
	`content_clarity` int NOT NULL,
	`content_depth` int NOT NULL,
	`practical_application` int NOT NULL,
	`workplace_relevance` int NOT NULL,
	`overall_satisfaction` int NOT NULL,
	`would_recommend` enum('yes','no','maybe') NOT NULL,
	`strengths` text,
	`improvements` text,
	`additional_comments` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `training_evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `training_evaluations` ADD CONSTRAINT `training_evaluations_assignment_id_training_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `training_assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_evaluations` ADD CONSTRAINT `training_evaluations_evaluator_id_users_id_fk` FOREIGN KEY (`evaluator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;