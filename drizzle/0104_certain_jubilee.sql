CREATE TABLE `whatsapp_tracking_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`event_type` varchar(50) NOT NULL,
	`normativas` json,
	`user_data` json,
	`metadata` json,
	`user_agent` text,
	`ip_address` varchar(45),
	`country` varchar(100),
	`city` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`conversion_status` varchar(50) DEFAULT 'pending',
	`converted_at` timestamp,
	`notes` text,
	CONSTRAINT `whatsapp_tracking_events_id` PRIMARY KEY(`id`)
);
