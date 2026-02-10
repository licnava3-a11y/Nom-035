CREATE TABLE `report_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`descripcion` text,
	`tipo` varchar(100) NOT NULL,
	`html_template` text NOT NULL,
	`css_styles` text,
	`variables` json,
	`is_default` boolean NOT NULL DEFAULT false,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_templates_id` PRIMARY KEY(`id`)
);
