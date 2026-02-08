ALTER TABLE `correctiveActions` ADD `title` varchar(255);--> statement-breakpoint
ALTER TABLE `correctiveActions` ADD `priority` enum('low','medium','high') DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE `surveys` ADD `start_date` date;--> statement-breakpoint
ALTER TABLE `surveys` ADD `end_date` date;--> statement-breakpoint
ALTER TABLE `surveys` ADD `target_department_id` int;