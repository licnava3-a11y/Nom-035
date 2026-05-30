CREATE TABLE `anonymous_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(30) NOT NULL,
	`category` enum('mejora_proceso','clima_laboral','seguridad','capacitacion','comunicacion','otro') NOT NULL DEFAULT 'otro',
	`content` text NOT NULL,
	`status` enum('nueva','en_revision','atendida','archivada') NOT NULL DEFAULT 'nueva',
	`admin_response` text,
	`responded_at` timestamp,
	`responded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anonymous_suggestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `anonymous_suggestions_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `internal_notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(30) NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` text NOT NULL,
	`notice_type` enum('aviso','comunicado','circular','urgente') NOT NULL DEFAULT 'aviso',
	`priority` enum('alta','media','baja') NOT NULL DEFAULT 'media',
	`requires_ack` boolean NOT NULL DEFAULT false,
	`published_at` timestamp,
	`expires_at` timestamp,
	`target_audience` enum('todos','directivos','supervisores','operativos') NOT NULL DEFAULT 'todos',
	`attachment_url` varchar(1000),
	`attachment_key` varchar(500),
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `internal_notices_id` PRIMARY KEY(`id`),
	CONSTRAINT `internal_notices_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `notice_acknowledgments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notice_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`employee_name` varchar(200) NOT NULL,
	`acknowledged_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45),
	CONSTRAINT `notice_acknowledgments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stps_inspection_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspection_id` int NOT NULL,
	`numeral` varchar(20) NOT NULL,
	`requirement` varchar(500) NOT NULL,
	`category` varchar(100) NOT NULL,
	`status` enum('cumple','no_cumple','parcial','na') NOT NULL DEFAULT 'na',
	`observations` text,
	`evidence_url` varchar(1000),
	`evidence_key` varchar(500),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stps_inspection_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stps_inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(30) NOT NULL,
	`inspection_date` date NOT NULL,
	`inspector_name` varchar(200) NOT NULL,
	`inspector_id` varchar(50),
	`inspection_type` enum('ordinaria','extraordinaria','seguimiento') NOT NULL DEFAULT 'ordinaria',
	`status` enum('programada','en_proceso','concluida','con_observaciones') NOT NULL DEFAULT 'programada',
	`observations` text,
	`responsible_user_id` int,
	`responsible_name` varchar(200),
	`expedient_url` varchar(1000),
	`expedient_key` varchar(500),
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stps_inspections_id` PRIMARY KEY(`id`),
	CONSTRAINT `stps_inspections_folio_unique` UNIQUE(`folio`)
);
