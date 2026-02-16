CREATE TABLE `department_change_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`user_name` varchar(255) NOT NULL,
	`previous_department` varchar(255),
	`new_department` varchar(255) NOT NULL,
	`changed_by` int NOT NULL,
	`changed_by_name` varchar(255) NOT NULL,
	`reason` text,
	`change_type` varchar(50) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `department_change_history_id` PRIMARY KEY(`id`)
);
