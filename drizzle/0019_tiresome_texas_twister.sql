CREATE TABLE `organizationalCompetencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competencyName` varchar(255) NOT NULL,
	`competencyCategory` enum('soft_skill','organizational','leadership','technical_transversal') NOT NULL,
	`description` text,
	`requiredLevel` enum('basico','intermedio','avanzado','experto') NOT NULL,
	`appliesToDepartments` text,
	`appliesToRoles` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizationalCompetencies_id` PRIMARY KEY(`id`)
);
