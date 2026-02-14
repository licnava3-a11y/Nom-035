CREATE TABLE `smtp_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL DEFAULT 587,
	`secure` boolean NOT NULL DEFAULT false,
	`user` varchar(255) NOT NULL,
	`password` text NOT NULL,
	`from_email` varchar(320) NOT NULL,
	`from_name` varchar(255) NOT NULL DEFAULT 'Sistema NOM-035',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smtp_config_id` PRIMARY KEY(`id`)
);
