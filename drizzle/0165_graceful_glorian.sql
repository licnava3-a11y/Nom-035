CREATE TABLE `nom035_committee_agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meeting_id` int NOT NULL,
	`company_id` int,
	`folio` varchar(50),
	`description` text NOT NULL,
	`responsible` varchar(255),
	`responsible_employee_id` int,
	`due_date` date,
	`status` enum('pendiente','en_proceso','cumplido','cancelado','vencido') NOT NULL DEFAULT 'pendiente',
	`priority` enum('alta','media','baja') NOT NULL DEFAULT 'media',
	`completed_at` timestamp,
	`completion_notes` text,
	`evidence_url` varchar(1024),
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nom035_committee_agreements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nom035_committee_meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int,
	`folio` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`meeting_type` enum('ordinaria','extraordinaria','urgente') NOT NULL DEFAULT 'ordinaria',
	`status` enum('convocada','en_curso','celebrada','cancelada','reprogramada') NOT NULL DEFAULT 'convocada',
	`scheduled_at` timestamp NOT NULL,
	`location` varchar(500),
	`agenda` text,
	`minutes_content` text,
	`minutes_approved_at` timestamp,
	`attendees_json` text,
	`quorum_reached` boolean DEFAULT false,
	`convocatoria_pdf_url` varchar(1024),
	`acta_pdf_url` varchar(1024),
	`linked_minute_id` int,
	`created_by` int,
	`created_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nom035_committee_meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nom035_committee_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int,
	`employee_id` int,
	`employee_name` varchar(255) NOT NULL,
	`employee_email` varchar(320),
	`position` varchar(255),
	`department` varchar(255),
	`role` enum('presidente','secretario','vocal','suplente','asesor_externo') NOT NULL DEFAULT 'vocal',
	`start_date` date,
	`end_date` date,
	`is_active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nom035_committee_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nom035_meeting_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meeting_id` int NOT NULL,
	`signer_name` varchar(255) NOT NULL,
	`signer_role` varchar(255),
	`signer_email` varchar(320),
	`employee_id` int,
	`signature_image_url` varchar(1024),
	`signature_hash` varchar(64),
	`signed_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45),
	CONSTRAINT `nom035_meeting_signatures_id` PRIMARY KEY(`id`)
);
