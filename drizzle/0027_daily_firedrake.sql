CREATE TABLE `nom035_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`descripcion` text NOT NULL,
	`fecha_publicacion` date NOT NULL,
	`representante_legal_id` int,
	`pdf_url` text,
	`activo` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nom035_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `nom035_policies` ADD CONSTRAINT `nom035_policies_representante_legal_id_company_legal_representative_id_fk` FOREIGN KEY (`representante_legal_id`) REFERENCES `company_legal_representative`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nom035_policies` ADD CONSTRAINT `nom035_policies_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;