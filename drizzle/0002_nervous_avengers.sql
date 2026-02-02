CREATE TABLE `caseAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`committeeMemberId` int NOT NULL,
	`role` enum('lead','support','observer') NOT NULL DEFAULT 'support',
	`assignedBy` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `caseAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mailbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`requestType` enum('queja','sugerencia','felicitacion','solicitud_capacitacion') NOT NULL,
	`complaintType` enum('liderazgo_negativo','entorno_organizacional_desfavorable','conductas_contrarias_ambiente_laboral','carga_trabajo','falta_control_trabajo','jornadas_trabajo_extensas','interferencia_relacion_trabajo_familia','acoso_laboral','acoso_sexual','hostigamiento_sexual','mobbing','burnout','violencia_laboral','otros'),
	`senderName` varchar(255),
	`senderEmail` varchar(320) NOT NULL,
	`senderPhone` varchar(20),
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`subject` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`status` enum('recibido','asignado','en_proceso','concluido') NOT NULL DEFAULT 'recibido',
	`assignedTo` int,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`receivedVia` enum('email','web_form') NOT NULL DEFAULT 'web_form',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`concludedAt` timestamp,
	CONSTRAINT `mailbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `mailbox_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `mailboxResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mailboxId` int NOT NULL,
	`responderId` int NOT NULL,
	`response` text NOT NULL,
	`emailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mailboxResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_case','case_status_change','case_assigned','deadline_approaching','new_mailbox_request','mailbox_status_change','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
