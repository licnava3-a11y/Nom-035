CREATE TABLE `meetingAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingMinuteId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` int,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meetingAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetingMinutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`meetingDate` timestamp NOT NULL,
	`meetingType` varchar(100) NOT NULL,
	`location` varchar(255),
	`agenda` text NOT NULL,
	`agreements` text,
	`observations` text,
	`qrCode` text,
	`qrCodeUrl` varchar(500),
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`finalizedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetingMinutes_id` PRIMARY KEY(`id`),
	CONSTRAINT `meetingMinutes_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `meetingParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingMinuteId` int NOT NULL,
	`employeeId` int,
	`name` varchar(255) NOT NULL,
	`curp` varchar(18),
	`ineNumber` varchar(20),
	`role` varchar(100),
	`signature` text,
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meetingParticipants_id` PRIMARY KEY(`id`)
);
