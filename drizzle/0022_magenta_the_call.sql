CREATE TABLE `complianceChecklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section` varchar(10) NOT NULL,
	`sectionName` varchar(200) NOT NULL,
	`itemCode` varchar(10) NOT NULL,
	`requirement` text NOT NULL,
	`evidence` text NOT NULL,
	`fundament` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complianceChecklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complianceChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistItemId` int NOT NULL,
	`isCompliant` boolean NOT NULL DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complianceChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complianceEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkId` int NOT NULL,
	`evidenceType` varchar(50) NOT NULL,
	`evidenceUrl` varchar(500),
	`description` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complianceEvidence_id` PRIMARY KEY(`id`)
);
