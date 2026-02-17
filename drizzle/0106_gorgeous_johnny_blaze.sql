CREATE TABLE `salespeople` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`nombre` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`activo` boolean NOT NULL DEFAULT true,
	`ultima_asignacion` timestamp,
	`total_leads_asignados` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salespeople_id` PRIMARY KEY(`id`)
);
