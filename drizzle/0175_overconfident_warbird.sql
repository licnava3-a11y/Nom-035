ALTER TABLE `survey_responses` ADD `department_id` int;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `position_id` int;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD `department_id` int;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD `position_id` int;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_position_id_positions_id_fk` FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD CONSTRAINT `survey_tokens_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD CONSTRAINT `survey_tokens_position_id_positions_id_fk` FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;