CREATE TABLE `document_formats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(20) NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`descripcion` text,
	`version` varchar(20) NOT NULL DEFAULT '1.0',
	`fecha_version` date NOT NULL,
	`referencia` varchar(500),
	`consecutivo_actual` int NOT NULL DEFAULT 0,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_formats_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_formats_codigo_unique` UNIQUE(`codigo`)
);
