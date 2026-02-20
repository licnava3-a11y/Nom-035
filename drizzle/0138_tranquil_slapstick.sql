ALTER TABLE `nom035_cases` ADD `source` varchar(100);--> statement-breakpoint
ALTER TABLE `nom035_cases` ADD `reported_by` int;--> statement-breakpoint
ALTER TABLE `nom035_cases` ADD CONSTRAINT `nom035_cases_reported_by_users_id_fk` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;