CREATE TABLE `employeeCompetencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`competencyName` varchar(255) NOT NULL,
	`competencyType` enum('tecnica','transversal','conocimiento') NOT NULL,
	`currentLevel` enum('basico','intermedio','avanzado','experto') NOT NULL,
	`certificationDate` date,
	`expirationDate` date,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employeeCompetencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`positionId` int NOT NULL,
	`competencyName` varchar(255) NOT NULL,
	`competencyType` enum('tecnica','transversal','conocimiento') NOT NULL,
	`requiredLevel` enum('basico','intermedio','avanzado','experto') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainingNeeds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`competencyName` varchar(255) NOT NULL,
	`competencyType` enum('tecnica','transversal','conocimiento') NOT NULL,
	`requiredLevel` enum('basico','intermedio','avanzado','experto') NOT NULL,
	`currentLevel` enum('ninguno','basico','intermedio','avanzado','experto') NOT NULL,
	`gap` int NOT NULL,
	`priority` enum('baja','media','alta','critica') NOT NULL,
	`status` enum('pendiente','en_proceso','completada','cancelada') NOT NULL DEFAULT 'pendiente',
	`recommendedCourseId` int,
	`dueDate` date,
	`completedDate` date,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainingNeeds_id` PRIMARY KEY(`id`)
);
