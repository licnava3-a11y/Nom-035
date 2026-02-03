CREATE TABLE `survey_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`response_id` int NOT NULL,
	`question_id` int NOT NULL,
	`answer_value` text NOT NULL,
	`answered_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`question_text` text NOT NULL,
	`question_type` enum('multiple_choice','scale','yes_no','text') NOT NULL,
	`domain` varchar(100),
	`subdomain` varchar(100),
	`order` int NOT NULL,
	`options` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`user_id` int,
	`curp` varchar(18),
	`token` varchar(64) NOT NULL,
	`completed_at` timestamp,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45),
	`device_info` text,
	`results` text,
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`),
	CONSTRAINT `survey_responses_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `survey_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`survey_id` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`sent_via` enum('email','sms','whatsapp','qr'),
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `survey_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('guia_i','guia_ii','guia_iii') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_response_id_survey_responses_id_fk` FOREIGN KEY (`response_id`) REFERENCES `survey_responses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_question_id_survey_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_questions` ADD CONSTRAINT `survey_questions_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD CONSTRAINT `survey_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_tokens` ADD CONSTRAINT `survey_tokens_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;