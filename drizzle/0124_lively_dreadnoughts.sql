CREATE TABLE `climate_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`period` varchar(50) NOT NULL,
	`climate_index` int NOT NULL,
	`dimension_scores` json NOT NULL,
	`correlations` json,
	`critical_areas` json,
	`analyzed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `climate_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `climate_survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`responses` json NOT NULL,
	`overall_score` int NOT NULL,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `climate_survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizational_climate_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dimensions` json NOT NULL,
	`frequency` varchar(50) DEFAULT 'quarterly',
	`is_active` boolean DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizational_climate_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `climate_analysis` ADD CONSTRAINT `climate_analysis_survey_id_organizational_climate_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `organizational_climate_surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `climate_survey_responses` ADD CONSTRAINT `climate_survey_responses_survey_id_organizational_climate_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `organizational_climate_surveys`(`id`) ON DELETE no action ON UPDATE no action;