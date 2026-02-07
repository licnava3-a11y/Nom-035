CREATE TABLE `company_digital_signature` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`nombre_firmante` varchar(255) NOT NULL,
	`cargo` varchar(255) NOT NULL,
	`departamento` varchar(255),
	`firma_url` varchar(512) NOT NULL,
	`firma_key` varchar(512) NOT NULL,
	`certificado_url` varchar(512),
	`certificado_key` varchar(512),
	`tipo_firmante` enum('interno','externo') NOT NULL DEFAULT 'interno',
	`autorizado_por` int,
	`estado_autorizacion` enum('pendiente','autorizado','rechazado') NOT NULL DEFAULT 'pendiente',
	`fecha_autorizacion` timestamp,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_digital_signature_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_general_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`razon_social` varchar(255) NOT NULL,
	`rfc` varchar(13) NOT NULL,
	`direccion_fiscal` text NOT NULL,
	`giro` varchar(255),
	`actividades_preponderantes` text,
	`numero_trabajadores` int,
	`representante_legal` varchar(255),
	`telefono_contacto` varchar(15),
	`email_contacto` varchar(320),
	`pagina_web` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_general_data_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_general_data_rfc_unique` UNIQUE(`rfc`)
);
--> statement-breakpoint
CREATE TABLE `company_legal_representative` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`cargo` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefono` varchar(15),
	`firma_url` varchar(512),
	`firma_key` varchar(512),
	`certificado_url` varchar(512),
	`certificado_key` varchar(512),
	`vigencia_inicio` date,
	`vigencia_fin` date,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_legal_representative_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_logo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`logo_url` varchar(512) NOT NULL,
	`logo_key` varchar(512) NOT NULL,
	`mime_type` varchar(100),
	`file_size` int,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_logo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_survey_report` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodo_aplicacion` varchar(100) NOT NULL,
	`fecha_inicio` date NOT NULL,
	`fecha_fin` date NOT NULL,
	`guia_aplicada` enum('guia-i','guia-ii','guia-iii') NOT NULL,
	`tamaño_muestra` int NOT NULL,
	`cobertura` decimal(5,2),
	`numero_trabajadores_total` int NOT NULL,
	`numero_trabajadores_encuestados` int NOT NULL,
	`metodologia_aplicacion` text,
	`observaciones` text,
	`responsable_aplicacion` varchar(255),
	`reporte_url` varchar(512),
	`reporte_key` varchar(512),
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_survey_report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `company_digital_signature` ADD CONSTRAINT `company_digital_signature_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_digital_signature` ADD CONSTRAINT `company_digital_signature_autorizado_por_users_id_fk` FOREIGN KEY (`autorizado_por`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_logo` ADD CONSTRAINT `company_logo_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_survey_report` ADD CONSTRAINT `company_survey_report_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;