CREATE TABLE `recognition_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recognition_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recognition_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recognition_id` int NOT NULL,
	`user_id` int NOT NULL,
	`reaction_type` enum('like','applause','heart','star') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recognition_reactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recognitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`from_user_id` int NOT NULL,
	`to_user_id` int NOT NULL,
	`category_id` int NOT NULL,
	`type` enum('reconocimiento','felicitacion') NOT NULL,
	`message` text NOT NULL,
	`is_public` boolean NOT NULL DEFAULT false,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
	`approved_by` int,
	`approved_at` timestamp,
	`rejection_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recognitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `recognition_reactions` ADD CONSTRAINT `recognition_reactions_recognition_id_recognitions_id_fk` FOREIGN KEY (`recognition_id`) REFERENCES `recognitions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recognition_reactions` ADD CONSTRAINT `recognition_reactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recognitions` ADD CONSTRAINT `recognitions_from_user_id_users_id_fk` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recognitions` ADD CONSTRAINT `recognitions_to_user_id_users_id_fk` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recognitions` ADD CONSTRAINT `recognitions_category_id_recognition_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `recognition_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recognitions` ADD CONSTRAINT `recognitions_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;