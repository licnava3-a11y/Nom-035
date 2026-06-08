ALTER TABLE `dc3_records` ADD `verification_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `dc3_records` ADD CONSTRAINT `dc3_records_verification_hash_unique` UNIQUE(`verification_hash`);