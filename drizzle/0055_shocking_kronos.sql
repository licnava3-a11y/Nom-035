CREATE TABLE `digital_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`certificate_name` varchar(255) NOT NULL,
	`certificate_path` varchar(500) NOT NULL,
	`key_path` varchar(500) NOT NULL,
	`password_encrypted` text NOT NULL,
	`valid_from` date NOT NULL,
	`valid_until` date NOT NULL,
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`issuer` varchar(255),
	`serial_number` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `digital_certificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `digital_certificates` ADD CONSTRAINT `digital_certificates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;