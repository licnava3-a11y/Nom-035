CREATE TABLE `compliance_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeral` varchar(10) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`category` enum('identification','analysis','prevention','control','documentation') NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_requirements_id` PRIMARY KEY(`id`)
);
