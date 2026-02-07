CREATE TABLE `equality_affirmative_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`tipo` enum('capacitacion','promocion','contratacion','conciliacion','infraestructura','otro') NOT NULL,
	`descripcion` text NOT NULL,
	`objetivo` text NOT NULL,
	`fecha_inicio` date NOT NULL,
	`fecha_fin` date,
	`responsable` varchar(255) NOT NULL,
	`departamento` varchar(255),
	`presupuesto` decimal(10,2),
	`estado` enum('planeada','en_progreso','completada','cancelada') NOT NULL DEFAULT 'planeada',
	`resultados_esperados` text,
	`resultados_obtenidos` text,
	`evidencia_url` varchar(512),
	`evidencia_key` varchar(512),
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equality_affirmative_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equality_committee` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`cargo` enum('presidente','secretario','vocal','asesor') NOT NULL,
	`fecha_designacion` date NOT NULL,
	`fecha_termino` date,
	`activo` boolean NOT NULL DEFAULT true,
	`observaciones` text,
	`designado_por` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equality_committee_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equality_complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`tipo` enum('discriminacion_genero','acoso_laboral','acoso_sexual','discriminacion_edad','discriminacion_discapacidad','otro') NOT NULL,
	`descripcion` text NOT NULL,
	`fecha_incidente` date,
	`denunciante_nombre` varchar(255),
	`denunciante_email` varchar(255),
	`denunciante_telefono` varchar(20),
	`es_anonima` boolean NOT NULL DEFAULT false,
	`estado` enum('recibida','en_investigacion','resuelta','cerrada','desestimada') NOT NULL DEFAULT 'recibida',
	`prioridad` enum('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
	`investigador_asignado` int,
	`fecha_asignacion` date,
	`fecha_resolucion` date,
	`resolucion` text,
	`acciones_correctivas` text,
	`evidencia_url` varchar(512),
	`evidencia_key` varchar(512),
	`observaciones` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equality_complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `equality_complaints_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `equality_policy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descripcion` text NOT NULL,
	`fecha_aprobacion` date NOT NULL,
	`fecha_vigencia` date,
	`documento_url` varchar(512),
	`documento_key` varchar(512),
	`aprobado_por` int,
	`estado` enum('borrador','vigente','archivado') NOT NULL DEFAULT 'borrador',
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equality_policy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equality_salary_gap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodo` varchar(100) NOT NULL,
	`fecha_calculo` date NOT NULL,
	`departamento` varchar(255),
	`puesto` varchar(255),
	`total_mujeres` int NOT NULL,
	`total_hombres` int NOT NULL,
	`salario_promedio_mujeres` decimal(10,2) NOT NULL,
	`salario_promedio_hombres` decimal(10,2) NOT NULL,
	`brecha_porcentual` decimal(5,2) NOT NULL,
	`nivel_riesgo` enum('bajo','medio','alto') NOT NULL DEFAULT 'bajo',
	`observaciones` text,
	`acciones_recomendadas` text,
	`calculado_por` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equality_salary_gap_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `equality_affirmative_actions` ADD CONSTRAINT `equality_affirmative_actions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equality_committee` ADD CONSTRAINT `equality_committee_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equality_committee` ADD CONSTRAINT `equality_committee_designado_por_users_id_fk` FOREIGN KEY (`designado_por`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equality_complaints` ADD CONSTRAINT `equality_complaints_investigador_asignado_users_id_fk` FOREIGN KEY (`investigador_asignado`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equality_complaints` ADD CONSTRAINT `equality_complaints_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equality_policy` ADD CONSTRAINT `equality_policy_aprobado_por_users_id_fk` FOREIGN KEY (`aprobado_por`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equality_policy` ADD CONSTRAINT `equality_policy_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equality_salary_gap` ADD CONSTRAINT `equality_salary_gap_calculado_por_users_id_fk` FOREIGN KEY (`calculado_por`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;