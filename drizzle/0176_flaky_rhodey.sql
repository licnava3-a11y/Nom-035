CREATE TABLE `buzon_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`s3_url` text NOT NULL,
	`s3_key` varchar(512) NOT NULL,
	`file_hash` varchar(64),
	`original_name` varchar(255),
	`mime_type` varchar(100),
	`uploaded_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buzon_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buzon_audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`from_status` varchar(30),
	`to_status` varchar(30) NOT NULL,
	`action_by_user_id` int,
	`action_by_name` varchar(255),
	`internal_notes` text,
	`system_note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buzon_audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buzon_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`public_folio` varchar(50) NOT NULL,
	`request_type` varchar(20) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'REGISTRADA',
	`employee_id` int,
	`anonymity_flag` boolean NOT NULL DEFAULT false,
	`form_payload` text NOT NULL,
	`priority` varchar(10) DEFAULT 'NORMAL',
	`internal_notes` text,
	`resolution_text` text,
	`resolved_at` timestamp,
	`resolved_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buzon_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `buzon_requests_public_folio_unique` UNIQUE(`public_folio`)
);
--> statement-breakpoint
CREATE TABLE `clinical_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`test_name` varchar(255) NOT NULL,
	`evaluation_date` date NOT NULL,
	`result` text,
	`interpretation` text,
	`file_url` text,
	`file_key` varchar(512),
	`applied_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clinical_evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinical_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`patient_name` varchar(255) NOT NULL,
	`patient_age` int,
	`patient_contact` varchar(255),
	`professional_name` varchar(255) NOT NULL,
	`professional_license` varchar(50),
	`professional_specialty` varchar(100),
	`consultation_reason` text,
	`medical_history` text,
	`personal_history` text,
	`family_history` text,
	`treatment_objectives` text,
	`treatment_activities` text,
	`consent_signed` boolean NOT NULL DEFAULT false,
	`consent_signed_at` timestamp,
	`consent_doc_url` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinical_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinical_session_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`session_date` date NOT NULL,
	`observations` text NOT NULL,
	`next_appointment` date,
	`session_type` varchar(50) DEFAULT 'individual',
	`author_user_id` int,
	`author_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clinical_session_notes_id` PRIMARY KEY(`id`)
);
