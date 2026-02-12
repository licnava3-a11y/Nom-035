CREATE TABLE `expense_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`solicitante_id` int NOT NULL,
	`monto` decimal(10,2) NOT NULL,
	`moneda` enum('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
	`concepto` varchar(255) NOT NULL,
	`descripcion` text,
	`categoria` enum('viaje','materiales','servicios','capacitacion','otro') NOT NULL,
	`fecha_solicitud` date NOT NULL,
	`fecha_requerida` date,
	`estado` enum('pendiente','aprobada','rechazada','pagada') NOT NULL DEFAULT 'pendiente',
	`aprobador_id` int,
	`fecha_aprobacion` timestamp,
	`comentarios_aprobador` text,
	`archivo_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expense_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_requests_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`cliente_nombre` varchar(255) NOT NULL,
	`cliente_rfc` varchar(13),
	`monto` decimal(10,2) NOT NULL,
	`moneda` enum('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
	`fecha_emision` date NOT NULL,
	`fecha_vencimiento` date NOT NULL,
	`estado` enum('pendiente','pagada','vencida','cancelada') NOT NULL DEFAULT 'pendiente',
	`archivo_url` varchar(500),
	`notas` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`proveedor` varchar(255) NOT NULL,
	`proveedor_rfc` varchar(13),
	`monto` decimal(10,2) NOT NULL,
	`moneda` enum('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
	`fecha` date NOT NULL,
	`fecha_entrega_estimada` date,
	`estado` enum('borrador','enviada','recibida','cancelada') NOT NULL DEFAULT 'borrador',
	`descripcion` text,
	`archivo_url` varchar(500),
	`created_by` int,
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
ALTER TABLE `expense_requests` ADD CONSTRAINT `expense_requests_solicitante_id_users_id_fk` FOREIGN KEY (`solicitante_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expense_requests` ADD CONSTRAINT `expense_requests_aprobador_id_users_id_fk` FOREIGN KEY (`aprobador_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;