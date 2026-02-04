CREATE TABLE `competencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`type` varchar(50) NOT NULL,
	`category` varchar(100),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skillsMatrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`competencyId` int NOT NULL,
	`level` varchar(50) NOT NULL,
	`evaluatedBy` int,
	`evaluationDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skillsMatrix_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skillsMatrixImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`importedBy` int NOT NULL,
	`recordsImported` int NOT NULL,
	`recordsFailed` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`errorLog` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skillsMatrixImports_id` PRIMARY KEY(`id`)
);
