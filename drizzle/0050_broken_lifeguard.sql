ALTER TABLE `compliance_reports` ADD `format_id` int;--> statement-breakpoint
ALTER TABLE `compliance_reports` ADD `folio_number` int;--> statement-breakpoint
ALTER TABLE `compliance_reports` ADD `folio_year` int;--> statement-breakpoint
ALTER TABLE `compliance_reports` ADD `folio` varchar(50);--> statement-breakpoint
ALTER TABLE `compliance_reports` ADD CONSTRAINT `compliance_reports_format_id_document_formats_id_fk` FOREIGN KEY (`format_id`) REFERENCES `document_formats`(`id`) ON DELETE no action ON UPDATE no action;