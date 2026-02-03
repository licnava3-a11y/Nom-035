CREATE TABLE `correctiveActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyResponseId` int,
	`riskLevel` enum('nulo','bajo','medio','alto','muy_alto') NOT NULL,
	`category` varchar(255),
	`description` text NOT NULL,
	`responsibleUserId` int,
	`departamento` varchar(255),
	`dueDate` date,
	`status` enum('pendiente','en_proceso','completada','cancelada') NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `correctiveActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveyNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`userId` int,
	`type` enum('invitation','reminder','completion') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`sentAt` timestamp,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveyNotifications_id` PRIMARY KEY(`id`)
);
