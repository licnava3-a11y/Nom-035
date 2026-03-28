CREATE TABLE `evaluation_360_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` int NOT NULL,
	`evaluated_employee_id` int NOT NULL,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`completion_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluation_360_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_360_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_name` varchar(255) NOT NULL,
	`description` text,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluation_360_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_360_development_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`strengths` json,
	`improvement_areas` json,
	`action_items` json,
	`status` enum('draft','approved','in_progress','completed') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluation_360_development_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_360_evaluators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`evaluator_employee_id` int NOT NULL,
	`evaluator_type` enum('self','peer','supervisor','subordinate','external') NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`completed_at` timestamp,
	CONSTRAINT `evaluation_360_evaluators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_360_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evaluator_id` int NOT NULL,
	`competency_id` int NOT NULL,
	`competency_type` enum('technical','soft_skill','leadership','organizational') NOT NULL,
	`score` int NOT NULL,
	`comments` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluation_360_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_360_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`competency_id` int NOT NULL,
	`competency_type` enum('technical','soft_skill','leadership','organizational') NOT NULL,
	`self_score` decimal(3,2),
	`peer_avg_score` decimal(3,2),
	`supervisor_score` decimal(3,2),
	`subordinate_avg_score` decimal(3,2),
	`overall_avg_score` decimal(3,2) NOT NULL,
	`gap_self_vs_others` decimal(3,2),
	`gap_supervisor_vs_peers` decimal(3,2),
	`total_evaluators` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluation_360_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_id` int NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`sent_by` int NOT NULL,
	`recipient_count` int NOT NULL,
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`metrics_snapshot` json NOT NULL,
	CONSTRAINT `report_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department_id` int NOT NULL,
	`alert_type` enum('high_risk_threshold_exceeded','medium_risk_threshold_exceeded','manual_alert','critical_case') NOT NULL,
	`risk_percentage` decimal(5,2) NOT NULL,
	`threshold` varchar(10) NOT NULL,
	`total_employees` int NOT NULL,
	`high_risk_employees` int NOT NULL,
	`triggered_by` int NOT NULL,
	`triggered_at` timestamp NOT NULL DEFAULT (now()),
	`notification_sent` boolean NOT NULL DEFAULT false,
	`notes` text,
	CONSTRAINT `risk_alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department_id` int NOT NULL,
	`high_risk_threshold` int NOT NULL DEFAULT 30,
	`medium_risk_threshold` int NOT NULL DEFAULT 20,
	`enable_auto_alerts` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`updated_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `risk_alert_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_name` varchar(255) NOT NULL,
	`report_type` enum('monthly','quarterly','annual') NOT NULL,
	`recipients` json NOT NULL,
	`include_nmx025` boolean NOT NULL DEFAULT true,
	`include_nom035` boolean NOT NULL DEFAULT true,
	`include_cases` boolean NOT NULL DEFAULT true,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_reports_id` PRIMARY KEY(`id`)
);
