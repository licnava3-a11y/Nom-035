CREATE TABLE `bulk_reassignment_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reassignment_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`employee_name` varchar(255) NOT NULL,
	`employee_email` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bulk_reassignment_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bulk_reassignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_department_id` int,
	`source_department_name` varchar(255),
	`target_department_id` int NOT NULL,
	`target_department_name` varchar(255) NOT NULL,
	`performed_by` int NOT NULL,
	`performed_by_name` varchar(255) NOT NULL,
	`reason` text,
	`employee_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bulk_reassignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `department_change_history`;