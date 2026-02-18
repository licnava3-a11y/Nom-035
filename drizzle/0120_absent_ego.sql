CREATE TABLE `salary_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`employee_name` varchar(255) NOT NULL,
	`department` varchar(255),
	`position` varchar(255),
	`previous_salary` decimal(10,2),
	`new_salary` decimal(10,2) NOT NULL,
	`adjustment_percentage` decimal(5,2),
	`adjustment_type` varchar(50),
	`market_rate` decimal(10,2),
	`salary_gap_percentage` decimal(5,2),
	`effective_date` date NOT NULL,
	`reason` text,
	`approved_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salary_history_id` PRIMARY KEY(`id`)
);
