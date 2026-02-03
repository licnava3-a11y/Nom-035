ALTER TABLE `survey_questions` ADD `category` varchar(100);--> statement-breakpoint
ALTER TABLE `survey_questions` ADD `dimension` varchar(100);--> statement-breakpoint
ALTER TABLE `survey_questions` ADD `is_reverse_scored` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `survey_questions` DROP COLUMN `subdomain`;