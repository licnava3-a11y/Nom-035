ALTER TABLE `minute_dispatches` ADD `read_token` varchar(64);--> statement-breakpoint
ALTER TABLE `minute_dispatches` ADD `email_sent_at` timestamp;--> statement-breakpoint
ALTER TABLE `minute_dispatches` ADD CONSTRAINT `minute_dispatches_read_token_unique` UNIQUE(`read_token`);