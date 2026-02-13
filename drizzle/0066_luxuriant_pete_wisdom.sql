CREATE TABLE `permission_change_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`changed_by` int NOT NULL,
	`change_type` enum('role_change','custom_permission_update','custom_permission_reset') NOT NULL,
	`old_value` json,
	`new_value` json,
	`reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permission_change_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `permission_change_history` ADD CONSTRAINT `permission_change_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_change_history` ADD CONSTRAINT `permission_change_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;