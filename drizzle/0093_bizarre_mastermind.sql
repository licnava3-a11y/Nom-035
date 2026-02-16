CREATE TABLE `industry_sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `industry_sectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sector_benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sector_id` int NOT NULL,
	`metric_name` varchar(100) NOT NULL,
	`metric_value` decimal(10,2) NOT NULL,
	`metric_unit` varchar(50),
	`period` varchar(50),
	`source` varchar(255),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sector_benchmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sector_benchmarks` ADD CONSTRAINT `sector_benchmarks_sector_id_industry_sectors_id_fk` FOREIGN KEY (`sector_id`) REFERENCES `industry_sectors`(`id`) ON DELETE cascade ON UPDATE no action;