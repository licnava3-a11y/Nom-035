CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`course_id` int,
	`passing_score` int NOT NULL DEFAULT 70,
	`time_limit` int,
	`max_attempts` int DEFAULT 3,
	`shuffle_questions` boolean DEFAULT false,
	`shuffle_options` boolean DEFAULT false,
	`show_results` boolean DEFAULT true,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attempt_id` int NOT NULL,
	`question_id` int NOT NULL,
	`selected_option_id` int,
	`text_answer` text,
	`is_correct` boolean,
	`points_earned` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessment_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`attempt_number` int NOT NULL DEFAULT 1,
	`started_at` timestamp NOT NULL,
	`submitted_at` timestamp,
	`score` int,
	`passed` boolean,
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`time_spent` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_question_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`option_text` text NOT NULL,
	`is_correct` boolean NOT NULL DEFAULT false,
	`order_index` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_question_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessment_id` int NOT NULL,
	`question_text` text NOT NULL,
	`question_type` enum('multiple_choice','true_false','short_answer') NOT NULL DEFAULT 'multiple_choice',
	`points` int NOT NULL DEFAULT 1,
	`order_index` int NOT NULL,
	`explanation` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exam_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queue_id` int,
	`template_code` varchar(50) NOT NULL,
	`recipient_id` int,
	`recipient_email` varchar(320),
	`recipient_phone` varchar(20),
	`channel` enum('email','sms') NOT NULL,
	`subject` varchar(255),
	`body` text,
	`status` enum('sent','failed','bounced') NOT NULL,
	`error_message` text,
	`sent_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_code` varchar(50) NOT NULL,
	`recipient_id` int,
	`recipient_email` varchar(320),
	`recipient_phone` varchar(20),
	`channel` enum('email','sms','both') NOT NULL,
	`subject` varchar(255),
	`body` text,
	`variables` json,
	`status` enum('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`scheduled_for` timestamp,
	`sent_at` timestamp,
	`error_message` text,
	`retry_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`channel` enum('email','sms','both') NOT NULL DEFAULT 'email',
	`email_subject` varchar(255),
	`email_body` text,
	`sms_body` varchar(500),
	`variables` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_selected_option_id_exam_question_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `exam_question_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_assessment_id_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_question_options` ADD CONSTRAINT `exam_question_options_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_assessment_id_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_queue_id_notification_queue_id_fk` FOREIGN KEY (`queue_id`) REFERENCES `notification_queue`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_recipient_id_employees_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_queue` ADD CONSTRAINT `notification_queue_recipient_id_employees_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;