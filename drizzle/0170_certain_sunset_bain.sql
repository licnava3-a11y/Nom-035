ALTER TABLE `dc3_records` ADD `instructor_signature_url` varchar(512);--> statement-breakpoint
ALTER TABLE `dc3_records` ADD `instructor_signature_key` varchar(512);--> statement-breakpoint
ALTER TABLE `dc3_records` ADD `employer_signature_url` varchar(512);--> statement-breakpoint
ALTER TABLE `dc3_records` ADD `employer_signature_key` varchar(512);--> statement-breakpoint
ALTER TABLE `dc3_records` ADD `worker_rep_signature_url` varchar(512);--> statement-breakpoint
ALTER TABLE `dc3_records` ADD `worker_rep_signature_key` varchar(512);--> statement-breakpoint
ALTER TABLE `dc3_records` ADD `signatures_updated_at` timestamp;